const crypto = require('node:crypto');
const { dbQuery, getOwnerSettings, isBotOwner, isPersistentStore, getBotOwnerId } = require('./config');
const { getSettings, assertAccess, allRobloxIds, requireBelvGuild, MdtError } = require('./belv-mdt');
const { recordAudit, recordError } = require('./telemetry');

const LOADER_PREFIX = '/mdt/client/';
const windows = new Map();
function ownerOnly(actorId) {
  if (!isBotOwner(actorId)) throw new MdtError(403, 'MDT-betöltőkódot csak a fő botowner kérhet.');
}
async function query(sql, values) {
  if (!isPersistentStore()) throw new MdtError(503, 'Az MDT-betöltőhöz működő PostgreSQL-adatbázis kell.');
  const result = await dbQuery(sql, values);
  if (!result) throw new MdtError(503, 'Az MDT-adatbázis átmenetileg nem érhető el.');
  return result;
}
function signature(row) {
  return crypto.createHmac('sha256', row.nonce).update(`belv-mdt-client-v1:${row.guild_id}:${row.owner_id}`).digest('base64url');
}
function rootOrigin(baseUrl) {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:') throw new MdtError(409, 'A NEXA PUBLIC_URL értéke HTTPS-webcím legyen.');
  return url.origin;
}
async function getMdtLoaderCommand(guildId, actorId, baseUrl) {
  if (!/^\d{16,22}$/.test(guildId)) throw new MdtError(400, 'Érvénytelen Discord-szerverazonosító.');
  const root = rootOrigin(baseUrl);
  const settings = await getSettings(guildId);
  await requireBelvGuild(guildId);
  assertAccess({ id: guildId }, { id: actorId }, settings);
  const ownerId = getBotOwnerId();
  if (!ownerId) throw new MdtError(503, 'A fő BOT_OWNER_ID nincs érvényesen beállítva.');
  const owner = getOwnerSettings();
  if (owner.blacklistedGuilds?.includes(guildId) || owner.blacklistedUsers?.includes(actorId)) throw new MdtError(403, 'Ez a szerver vagy fiók le van tiltva a NEXA rendszerben.');
  if (!settings.enabled || !allRobloxIds(settings).length) throw new MdtError(409, 'Előbb adj hozzá Roblox-ID-t az Owner Centerben és indítsd el az MDT-t.');
  const result = await query(`INSERT INTO nexabot_mdt_loader_links(guild_id,owner_id,nonce) VALUES($1,$2,$3)
    ON CONFLICT(guild_id) DO UPDATE SET owner_id=EXCLUDED.owner_id,nonce=EXCLUDED.nonce,updated_at=NOW()
    WHERE nexabot_mdt_loader_links.owner_id<>EXCLUDED.owner_id RETURNING *`, [guildId, ownerId, crypto.randomBytes(32).toString('hex')]);
  const row = result.rows[0] || (await query('SELECT * FROM nexabot_mdt_loader_links WHERE guild_id=$1', [guildId])).rows[0];
  if (!row || row.owner_id !== ownerId) throw new MdtError(409, 'A saját betöltőlink nem készíthető el. Próbáld újra.');
  const url = `${root}${LOADER_PREFIX}${guildId}/${signature(row)}.lua`;
  return { url, code: `loadstring(game:HttpGet(${JSON.stringify(url)}))()` };
}
async function rotateMdtLoaderLink(guildId, actorId) {
  ownerOnly(actorId);
  await query('DELETE FROM nexabot_mdt_loader_links WHERE guild_id=$1 AND owner_id=$2', [guildId, actorId]);
  await recordAudit('mdt_loader_rotate', { guildId, actorId });
}
function rateAllowed(request) {
  const candidate = String(request.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = /^[0-9a-fA-F.:]{3,64}$/.test(candidate) ? candidate : String(request.socket?.remoteAddress || 'unknown');
  const now = Date.now(), old = windows.get(ip);
  const row = old && now - old.at < 60_000 ? old : { at: now, count: 0 };
  row.count++; windows.set(ip, row);
  if (windows.size > 10_000) for (const [key, value] of windows) if (now - value.at >= 60_000) windows.delete(key);
  return row.count <= 30;
}
function send(request, response, status, source) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Content-Length': Buffer.byteLength(source), 'Allow': 'GET, HEAD' });
  response.end(request.method === 'HEAD' ? undefined : source);
}
async function serveMdtLoader(client, request, response, url, baseUrl, buildClient) {
  let guildId;
  try {
    if (!['GET', 'HEAD'].includes(request.method)) throw new MdtError(405, 'Ezen az útvonalon csak a kliensscript tölthető le.');
    const match = url.pathname.match(/^\/mdt\/client\/(\d{16,22})\/([A-Za-z0-9_-]{43})\.lua$/);
    if (!match) throw new MdtError(404, 'A Belv MDT betöltőlink nem érvényes.');
    guildId = match[1];
    if (!rateAllowed(request)) throw new MdtError(429, 'Túl sok scriptletöltés. Várj egy percet.');
    const row = (await query('SELECT * FROM nexabot_mdt_loader_links WHERE guild_id=$1', [guildId])).rows[0];
    if (!row || !isBotOwner(row.owner_id) || !crypto.timingSafeEqual(Buffer.from(match[2]), Buffer.from(signature(row)))) throw new MdtError(404, 'A Belv MDT betöltőlink nem érvényes. Kérj saját kódot: /mdt script.');
    const guild = client.guilds.cache.get(guildId);
    const owner = getOwnerSettings();
    const settings = await getSettings(guildId);
    await requireBelvGuild(guildId);
    if (!guild || owner.blacklistedGuilds?.includes(guildId) || owner.blacklistedUsers?.includes(row.owner_id)) throw new MdtError(404, 'A Belv MDT betöltőlink nem használható.');
    if (!settings.enabled || !allRobloxIds(settings).length) throw new MdtError(410, 'Az MDT nincs bekapcsolva vagy nincs engedélyezett Roblox-ID. Ellenőrizd az Owner Centert.');
    const member = await guild.members.fetch({ user: row.owner_id, force: true }).catch(() => null);
    if (!member || !isBotOwner(member.id)) throw new MdtError(404, 'A fő owner Discord-tagsága nem ellenőrizhető.');
    // Ez csak a felulet kodja. Nincs benne Discord-token, belepokod vagy MDT-munkamenet.
    // A teljes irat-API kulon ellenorzi a fo ownert, az egyszeri kodot es a Roblox-ID-t.
    const source = await buildClient(guildId, row.owner_id, rootOrigin(baseUrl));
    return send(request, response, 200, source);
  } catch (error) {
    if (!(error instanceof MdtError)) await recordError(error, { command: 'mdt_loader', guildId }).catch(() => {});
    const status = error instanceof MdtError ? error.status : 503;
    const message = error instanceof MdtError ? error.message : 'A Belv MDT script átmenetileg nem tölthető le.';
    return send(request, response, status, `error(${JSON.stringify(message)})\n`);
  }
}
module.exports = { LOADER_PREFIX, getMdtLoaderCommand, rotateMdtLoaderLink, serveMdtLoader };
