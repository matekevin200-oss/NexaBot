const crypto = require('node:crypto');
const { dbQuery } = require('./config');

const API_V2 = 'https://api.erlc.gg/v2';
const COMMAND_URL = 'https://api.erlc.gg/v1/server/command';
const requestCache = new Map();
const fallback = new Map();
const requestWindows = new Map();

function encryptionKey(environment = process.env) {
  const secret = String(environment.ERLC_ENCRYPTION_KEY || '').trim();
  if (secret.length < 32) return null;
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptServerKey(value, environment = process.env) {
  const key = encryptionKey(environment);
  if (!key) throw new Error('Az ERLC_ENCRYPTION_KEY legalább 32 karakteres Render-környezeti változó legyen.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptServerKey(value, environment = process.env) {
  const key = encryptionKey(environment);
  if (!key) throw new Error('Az ERLC_ENCRYPTION_KEY hiányzik vagy túl rövid.');
  const [version, iv, tag, encrypted] = String(value || '').split(':');
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Az eltárolt ER:LC kulcs formátuma érvénytelen.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}

function maskKey(value) {
  const text = String(value || '');
  if (!text) return 'nincs';
  return `••••••••${text.slice(-4)}`;
}

function environmentKeyForGuild(guildId, environment = process.env) {
  const key = String(environment.ERLC_API_KEY || '').trim();
  const configuredGuildId = String(environment.ERLC_GUILD_ID || '').trim();
  return key && configuredGuildId === String(guildId) ? key : null;
}

async function parseApiResponse(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(String(data?.message || data?.error || `ER:LC API hiba (${response.status})`).slice(0, 500));
    error.status = response.status;
    error.code = data?.code || null;
    error.retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset-after') || null;
    throw error;
  }
  return {
    data,
    rateLimit: {
      remaining: response.headers.get('x-ratelimit-remaining') || response.headers.get('ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset') || response.headers.get('ratelimit-reset')
    }
  };
}

async function rawRequest(url, serverKey, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  timeout.unref?.();
  try {
    const headers = {
      'server-key': serverKey,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    };
    const publicToken = String(process.env.ERLC_PUBLIC_APP_TOKEN || '').trim();
    if (publicToken) headers.Authorization = publicToken;
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
    return await parseApiResponse(response);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Az ER:LC API nem válaszolt 10 másodpercen belül.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function testServerKey(serverKey) {
  const key = String(serverKey || '').trim();
  if (key.length < 10 || key.length > 500) throw new Error('Adj meg egy érvényes ER:LC Server Key értéket.');
  const result = await rawRequest(`${API_V2}/server`, key);
  return result.data;
}

async function integrationRow(guildId) {
  const result = await dbQuery(
    `SELECT guild_id, encrypted_server_key, enabled, server_name, join_key, last_status,
            last_checked_at, updated_by, updated_at
       FROM nexabot_erlc_integrations WHERE guild_id = $1`,
    [guildId]
  );
  return result ? result.rows[0] || null : fallback.get(String(guildId)) || null;
}

async function getErlcIntegration(guildId) {
  const row = await integrationRow(guildId);
  const environmentKey = environmentKeyForGuild(guildId);
  if (!row && !environmentKey) {
    return { configured: false, enabled: false, source: null, keyMask: 'nincs' };
  }
  if (!row) {
    return {
      configured: true,
      enabled: true,
      source: 'environment',
      keyMask: maskKey(environmentKey),
      serverName: null,
      joinKey: null,
      lastStatus: 'environment',
      lastCheckedAt: null,
      updatedAt: null
    };
  }
  let keyMask = 'titkosítva';
  try { keyMask = maskKey(decryptServerKey(row.encrypted_server_key)); } catch {}
  return {
    configured: true,
    enabled: Boolean(row.enabled),
    source: 'database',
    keyMask,
    serverName: row.server_name || null,
    joinKey: row.join_key || null,
    lastStatus: row.last_status || 'configured',
    lastCheckedAt: row.last_checked_at || null,
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by || null
  };
}

async function resolveServerKey(guildId) {
  const row = await integrationRow(guildId);
  if (row) {
    if (!row.enabled) throw new Error('Az ER:LC integráció ezen a szerveren ki van kapcsolva.');
    return decryptServerKey(row.encrypted_server_key);
  }
  const environmentKey = environmentKeyForGuild(guildId);
  if (environmentKey) return environmentKey;
  throw new Error('Ehhez a szerverhez még nincs ER:LC Server Key beállítva az Owner Centerben.');
}

async function saveErlcIntegration(guildId, serverKey, actorId) {
  const status = await testServerKey(serverKey);
  const encrypted = encryptServerKey(String(serverKey).trim());
  const row = {
    guild_id: String(guildId), encrypted_server_key: encrypted, enabled: true,
    server_name: String(status.Name || '').slice(0, 200) || null,
    join_key: String(status.JoinKey || '').slice(0, 100) || null,
    last_status: 'online', last_checked_at: new Date(), updated_by: String(actorId), updated_at: new Date()
  };
  const result = await dbQuery(
    `INSERT INTO nexabot_erlc_integrations
       (guild_id, encrypted_server_key, enabled, server_name, join_key, last_status, last_checked_at, updated_by, updated_at)
     VALUES ($1, $2, TRUE, $3, $4, 'online', NOW(), $5, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET
       encrypted_server_key = EXCLUDED.encrypted_server_key, enabled = TRUE,
       server_name = EXCLUDED.server_name, join_key = EXCLUDED.join_key,
       last_status = 'online', last_checked_at = NOW(), updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [row.guild_id, encrypted, row.server_name, row.join_key, row.updated_by]
  );
  if (!result) fallback.set(row.guild_id, row);
  requestCache.delete(row.guild_id);
  return { integration: await getErlcIntegration(guildId), status };
}

async function setErlcEnabled(guildId, enabled, actorId) {
  const result = await dbQuery(
    `UPDATE nexabot_erlc_integrations SET enabled = $2, updated_by = $3, updated_at = NOW()
     WHERE guild_id = $1 RETURNING guild_id`,
    [guildId, Boolean(enabled), String(actorId)]
  );
  if (result && !result.rowCount) throw new Error('Nincs mentett ER:LC integráció ezen a szerveren.');
  if (!result) {
    const row = fallback.get(String(guildId));
    if (!row) throw new Error('Nincs mentett ER:LC integráció ezen a szerveren.');
    row.enabled = Boolean(enabled);
    row.updated_by = String(actorId);
    row.updated_at = new Date();
  }
  requestCache.delete(String(guildId));
}

async function deleteErlcIntegration(guildId) {
  await dbQuery('DELETE FROM nexabot_erlc_integrations WHERE guild_id = $1', [guildId]);
  fallback.delete(String(guildId));
  requestCache.delete(String(guildId));
}

function enforceLocalRateLimit(guildId) {
  const now = Date.now();
  const current = requestWindows.get(String(guildId)) || [];
  const recent = current.filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 25) throw new Error('Túl sok ER:LC API-kérés történt. Várj egy percet.');
  recent.push(now);
  requestWindows.set(String(guildId), recent);
}

async function fetchErlcServer(guildId, options = {}) {
  const id = String(guildId);
  const cacheKey = `${id}:${JSON.stringify(options)}`;
  const cached = requestCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  enforceLocalRateLimit(id);
  const key = await resolveServerKey(id);
  const query = new URLSearchParams();
  for (const name of ['Players', 'Staff', 'JoinLogs', 'Queue', 'KillLogs', 'CommandLogs', 'ModCalls', 'EmergencyCalls', 'Vehicles']) {
    if (options[name] === true) query.set(name, 'true');
  }
  const suffix = query.size ? `?${query}` : '';
  try {
    const result = await rawRequest(`${API_V2}/server${suffix}`, key);
    requestCache.set(cacheKey, { value: result, expiresAt: Date.now() + 10_000 });
    await dbQuery(
      `UPDATE nexabot_erlc_integrations SET server_name = $2, join_key = $3, last_status = 'online', last_checked_at = NOW()
       WHERE guild_id = $1`,
      [id, String(result.data?.Name || '').slice(0, 200) || null, String(result.data?.JoinKey || '').slice(0, 100) || null]
    ).catch(() => null);
    return result;
  } catch (error) {
    await dbQuery(
      `UPDATE nexabot_erlc_integrations SET last_status = $2, last_checked_at = NOW() WHERE guild_id = $1`,
      [id, error.status === 429 ? 'rate_limited' : 'error']
    ).catch(() => null);
    throw error;
  }
}

async function runErlcCommand(guildId, command) {
  const value = String(command || '').trim();
  if (!value.startsWith(':') || value.length < 2 || value.length > 200 || /[\r\n\0]/.test(value)) {
    throw new Error('A parancs „:” jellel kezdődjön, egy soros és legfeljebb 200 karakter legyen.');
  }
  enforceLocalRateLimit(guildId);
  const key = await resolveServerKey(guildId);
  return rawRequest(COMMAND_URL, key, { method: 'POST', body: { command: value } });
}

module.exports = {
  encryptionKey,
  encryptServerKey,
  decryptServerKey,
  maskKey,
  environmentKeyForGuild,
  testServerKey,
  getErlcIntegration,
  saveErlcIntegration,
  setErlcEnabled,
  deleteErlcIntegration,
  fetchErlcServer,
  runErlcCommand
};
