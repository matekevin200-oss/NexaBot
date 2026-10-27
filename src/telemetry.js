const os = require('node:os');
const { dbQuery } = require('./config');

const MAX_MEMORY_EVENTS = 500;
const memory = {
  usage: [],
  errors: [],
  audit: []
};

function clean(value, max = 1000) {
  return String(value ?? '').slice(0, max);
}

function pushMemory(type, value) {
  memory[type].unshift(value);
  if (memory[type].length > MAX_MEMORY_EVENTS) memory[type].length = MAX_MEMORY_EVENTS;
}

async function recordUsage(eventType, context = {}) {
  const item = {
    eventType: clean(eventType, 80),
    guildId: context.guildId ? clean(context.guildId, 22) : null,
    userId: context.userId ? clean(context.userId, 22) : null,
    name: context.name ? clean(context.name, 100) : null,
    metadata: context.metadata && typeof context.metadata === 'object' ? context.metadata : {},
    createdAt: new Date()
  };
  pushMemory('usage', item);
  await dbQuery(
    `INSERT INTO nexabot_usage_events (event_type, guild_id, user_id, name, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [item.eventType, item.guildId, item.userId, item.name, JSON.stringify(item.metadata)]
  ).catch(() => null);
  return item;
}

async function recordAudit(action, context = {}) {
  const item = {
    action: clean(action, 100),
    actorId: context.actorId ? clean(context.actorId, 22) : null,
    guildId: context.guildId ? clean(context.guildId, 22) : null,
    targetId: context.targetId ? clean(context.targetId, 100) : null,
    metadata: context.metadata && typeof context.metadata === 'object' ? context.metadata : {},
    createdAt: new Date()
  };
  pushMemory('audit', item);
  await dbQuery(
    `INSERT INTO nexabot_audit_logs (action, actor_id, guild_id, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [item.action, item.actorId, item.guildId, item.targetId, JSON.stringify(item.metadata)]
  ).catch(() => null);
  return item;
}

async function recordError(error, context = {}) {
  const item = {
    errorType: clean(error?.name || 'Error', 100),
    message: clean(error?.message || error || 'Ismeretlen hiba', 2000),
    stack: clean(error?.stack || '', 12_000),
    command: context.command ? clean(context.command, 100) : null,
    guildId: context.guildId ? clean(context.guildId, 22) : null,
    userId: context.userId ? clean(context.userId, 22) : null,
    createdAt: new Date()
  };
  pushMemory('errors', item);
  await dbQuery(
    `INSERT INTO nexabot_error_logs (error_type, message, stack, command, guild_id, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [item.errorType, item.message, item.stack, item.command, item.guildId, item.userId]
  ).catch(() => null);
  return item;
}

async function recentEvents(type, limit = 25) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const queries = {
    usage: 'SELECT event_type, guild_id, user_id, name, metadata, created_at FROM nexabot_usage_events ORDER BY created_at DESC LIMIT $1',
    errors: 'SELECT error_type, message, command, guild_id, user_id, created_at FROM nexabot_error_logs ORDER BY created_at DESC LIMIT $1',
    audit: 'SELECT action, actor_id, guild_id, target_id, metadata, created_at FROM nexabot_audit_logs ORDER BY created_at DESC LIMIT $1'
  };
  if (!queries[type]) return [];
  const result = await dbQuery(queries[type], [safeLimit]).catch(() => null);
  return result ? result.rows : memory[type].slice(0, safeLimit);
}

async function recentGuildEvents(type, guildId, limit = 25) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const id = clean(guildId, 22);
  const queries = {
    usage: 'SELECT event_type, guild_id, user_id, name, metadata, created_at FROM nexabot_usage_events WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
    errors: 'SELECT error_type, message, command, guild_id, user_id, created_at FROM nexabot_error_logs WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
    audit: 'SELECT action, actor_id, guild_id, target_id, metadata, created_at FROM nexabot_audit_logs WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2'
  };
  if (!queries[type] || !id) return [];
  const result = await dbQuery(queries[type], [id, safeLimit]).catch(() => null);
  if (result) return result.rows;
  return memory[type]
    .filter((item) => (item.guildId || item.guild_id) === id)
    .slice(0, safeLimit);
}

async function usageSummary() {
  const result = await dbQuery(
    `SELECT event_type, COUNT(*)::int AS count
     FROM nexabot_usage_events
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY event_type ORDER BY count DESC`
  ).catch(() => null);
  if (result) return Object.fromEntries(result.rows.map((row) => [row.event_type, Number(row.count)]));
  const summary = {};
  for (const event of memory.usage) summary[event.eventType] = (summary[event.eventType] || 0) + 1;
  return summary;
}

function retentionPolicy(input = {}) {
  const days = (value, fallback, minimum, maximum) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
  };
  return {
    usageDays: days(input.usageDays, 90, 7, 730),
    errorDays: days(input.errorDays, 180, 30, 730),
    auditDays: days(input.auditDays, 365, 30, 1825),
    aiHistoryDays: days(input.aiHistoryDays, 30, 1, 365)
  };
}

async function pruneTelemetry(input = {}) {
  const policy = retentionPolicy(input);
  const statements = [
    ['usage', 'DELETE FROM nexabot_usage_events WHERE created_at < NOW() - ($1 * INTERVAL \'1 day\')', policy.usageDays],
    ['errors', 'DELETE FROM nexabot_error_logs WHERE created_at < NOW() - ($1 * INTERVAL \'1 day\')', policy.errorDays],
    ['audit', 'DELETE FROM nexabot_audit_logs WHERE created_at < NOW() - ($1 * INTERVAL \'1 day\')', policy.auditDays],
    ['aiHistory', 'DELETE FROM nexabot_ai_messages WHERE created_at < NOW() - ($1 * INTERVAL \'1 day\')', policy.aiHistoryDays]
  ];
  const deleted = {};
  for (const [key, sql, days] of statements) {
    const result = await dbQuery(sql, [days]).catch(() => null);
    deleted[key] = Number(result?.rowCount || 0);
  }
  return { policy, deleted };
}

async function operationalSummary() {
  const result = await dbQuery(`
    SELECT
      (SELECT COUNT(*)::int FROM nexabot_usage_events WHERE created_at > NOW() - INTERVAL '24 hours') AS usage_24h,
      (SELECT COUNT(*)::int FROM nexabot_error_logs WHERE created_at > NOW() - INTERVAL '24 hours') AS errors_24h,
      (SELECT COUNT(*)::int FROM nexabot_audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') AS audit_24h,
      (SELECT COUNT(*)::int FROM nexabot_audit_logs WHERE action LIKE 'security_%' AND created_at > NOW() - INTERVAL '24 hours') AS security_24h
  `).catch(() => null);
  if (result?.rows?.[0]) {
    const row = result.rows[0];
    return {
      usage24h: Number(row.usage_24h || 0),
      errors24h: Number(row.errors_24h || 0),
      audit24h: Number(row.audit_24h || 0),
      security24h: Number(row.security_24h || 0)
    };
  }
  const since = Date.now() - 86_400_000;
  return {
    usage24h: memory.usage.filter((item) => new Date(item.createdAt).getTime() > since).length,
    errors24h: memory.errors.filter((item) => new Date(item.createdAt).getTime() > since).length,
    audit24h: memory.audit.filter((item) => new Date(item.createdAt).getTime() > since).length,
    security24h: memory.audit.filter((item) => String(item.action || '').startsWith('security_') && new Date(item.createdAt).getTime() > since).length
  };
}

function runtimeStats(client) {
  const used = process.memoryUsage();
  const cpu = process.cpuUsage();
  return {
    uptimeSeconds: Math.floor(process.uptime()),
    ping: Number.isFinite(client?.ws?.ping) ? client.ws.ping : -1,
    memoryMb: Math.round(used.rss / 1024 / 1024),
    heapMb: Math.round(used.heapUsed / 1024 / 1024),
    cpuSeconds: Math.round((cpu.user + cpu.system) / 10_000) / 100,
    load: os.loadavg()[0],
    node: process.version,
    platform: `${os.platform()} ${os.arch()}`
  };
}

module.exports = {
  recordUsage,
  recordAudit,
  recordError,
  recentEvents,
  recentGuildEvents,
  usageSummary,
  operationalSummary,
  pruneTelemetry,
  retentionPolicy,
  runtimeStats
};
