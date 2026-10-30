const {FACTIONS,findFaction,requireFaction,LEADER_NAMES,normalized}=require('./mdt-factions');
const crypto = require('node:crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { dashboardUrl, dbQuery, getOwnerSettings, isBotOwner, isPersistentStore } = require('./config');
const { allDocumentTypes, documentRule, findDocumentChannel } = require('./documents');
const { recordAudit, recordError } = require('./telemetry');

const { bounded } = require('./workflow-options');
const { classifyBelvRole, rankForMember, configuredRankRoleMap, isConfiguredRoleHolder, stripManagedNickname } = require('./belv-roster-rules');
const { getGuildConfig } = require('./config');
const PREFIX = '/api/mdt/v1';
const BELV_GUILD_ID = '1517509643734221030';
const BELV_ROSTER_MARKER = 'NEXA_BELV_ROSTER_V1';
const BELV_NICKNAME_EXEMPT_USER_IDS = new Set(['1221443482829193270']);
const BELV_ROSTER = Object.freeze([
  { id: '1221443482829193270', rank: 'Főigazgató', nickRank: 'Főigazgató', badge: 'BV-01', group: 'Felsővezetés' },
  { id: '1256537413229084735', rank: 'Főigazgató-Helyettes', nickRank: 'Fő Igazgató-H.', badge: 'BV-02', group: 'Felsővezetés' },
  { id: '1366460534966452345', rank: 'Igazgató', nickRank: 'Igazgató', badge: 'BV-03', group: 'Felsővezetés' },
  { id: '1177622372589772871', rank: 'Igazgatóhelyettes', nickRank: 'Igazgató-H.', badge: 'BV-04', group: 'Felsővezetés' },
  { id: '1411032720770863225', rank: 'Főosztályvezető', nickRank: 'Főoszt. vez.', badge: 'BV-10', group: 'Vezetői állomány' },
  { id: '1074961156256567386', rank: 'Főosztályvezető', nickRank: 'Főoszt. vez.', badge: 'BV-11', group: 'Vezetői állomány' },
  { id: '1278116261468835964', rank: 'Műveleti Vezető', nickRank: 'Műveleti vez.', badge: 'BV-15', group: 'Vezetői állomány' },
  { id: '1479930076459176039', rank: 'Műveleti Vezető', nickRank: 'Műveleti vez.', badge: 'BV-16', group: 'Vezetői állomány' },
  { id: '1334868399268040706', rank: 'Műveleti Vezető', nickRank: 'Műveleti vez.', badge: 'BV-17', group: 'Vezetői állomány' },
  { id: '1027203605213749359', rank: 'Ellenőrzési Vezető', nickRank: 'Ellenőrzési V.', badge: 'BV-20', group: 'Vezetői állomány' },
  { id: '415704440385830922', rank: 'Vezető Tiszt', nickRank: 'Vezető Tiszt', badge: 'BV-35', group: 'Hivatásos állomány' },
  { id: '1012658793072570529', rank: 'Vezető Tiszt', nickRank: 'Vezető Tiszt', badge: 'BV-36', group: 'Hivatásos állomány' },
  { id: '1182693366497021995', rank: 'Belvédelmi Tiszt', nickRank: 'Belv. Tiszt', badge: 'BV-40', group: 'Hivatásos állomány' },
  { id: '1219659632503558237', rank: 'Vezető Ügynök', nickRank: 'Vezető Ügynök', badge: 'BV-50', group: 'Hivatásos állomány' },
  { id: '1147202198627963010', rank: 'Vezető Ügynök', nickRank: 'Vezető Ügynök', badge: 'BV-51', group: 'Hivatásos állomány' },
  { id: '1467747923294027790', rank: 'Különleges Ügynök', nickRank: 'Különl. Ügynök', badge: 'BV-60', group: 'Hivatásos állomány' },
  { id: '1191824346486935563', rank: 'Különleges Ügynök', nickRank: 'Különl. Ügynök', badge: 'BV-61', group: 'Hivatásos állomány' },
  { id: '1200432042505150602', rank: 'Belvédelmi Ügynök', nickRank: 'Belv. Ügynök', badge: 'BV-70', group: 'Hivatásos állomány' },
  { id: '1563584488477302874', rank: 'Belvédelmi Ügynök', nickRank: 'Belv. Ügynök', badge: 'BV-71', group: 'Hivatásos állomány' },
  { id: '1422651451418738731', rank: 'Belvédelmi Jelölt', nickRank: 'Belv. Jelölt', badge: 'BV-90', group: 'Képzési állomány' }
]);
const CODE_MS = 10 * 60 * 1000;
const SESSION_MS = 6 * 60 * 60 * 1000;
const windows = new Map();
const syncLocks = new Map();
const belvRosterLocks = new Set();
const belvRosterMonitorClients = new WeakSet();
const belvRosterNoticeAt = new Map();
const field = (id, label, paragraph = false, required = true, maxLength = paragraph ? 1000 : 160) => ({ id, label, style: paragraph ? 'paragraph' : 'short', required, maxLength, placeholder: label });
const TYPES = Object.freeze([
  { key: 'person', title: 'Személynyilvántartás', fields: [field('username', 'Roblox-felhasználónév'), field('robloxId', 'Roblox-ID', false, false, 20), field('name', 'Teljes név'), field('state', 'Nyilvántartási státusz'), field('notes', 'Megjegyzés', true, false)] },
  { key: 'vehicle', title: 'Járműnyilvántartás', fields: [field('plate', 'Rendszám'), field('model', 'Jármű típusa'), field('owner', 'Tulajdonos'), field('state', 'Nyilvántartási státusz'), field('notes', 'Megjegyzés', true, false)] },
  { key: 'case', title: 'MDT ügyirat', approval: true, fields: [field('title', 'Ügy tárgya'), field('persons', 'Érintettek'), field('robloxId', 'Érintett Roblox-ID', false, false, 20), field('location', 'Időpont és helyszín'), field('events', 'Tényállás és intézkedés', true), field('evidence', 'Bizonyíték, hivatkozás', true, false)] },
  { key: 'warrant', title: 'MDT körözés', approval: true, fields: [field('target', 'Körözött RP-személy vagy jármű'), field('robloxId', 'Körözött Roblox-ID', false, false, 20), field('reason', 'RP-körözés indoka', true), field('priority', 'Prioritás'), field('validity', 'Érvényesség'), field('notes', 'Megjegyzés', true, false)] },
  { key: 'shift', title: 'Szolgálati bejegyzés', fields: [field('time', 'Kezdet és befejezés'), field('unit', 'Egység, hívójel'), field('participants', 'Résztvevők'), field('activity', 'Tevékenység', true), field('notes', 'Rendkívüli esemény', true, false)] },
  { key:'arrest',title:'RP-előállítás / letartóztatás',approval:true,fields:[field('target','RP-személy'),field('robloxId','Roblox-ID',false,false,20),field('reason','Intézkedés indoka',true),field('location','Időpont és helyszín'),field('charges','RP-vádak / tényállás',true),field('linkedRecordId','Kapcsolódó MDT-irat ID-je',false,false,20)] },
  { key:'fine',title:'RP-bírság',fields:[field('target','RP-személy'),field('robloxId','Roblox-ID',false,false,20),field('amount','RP-bírság összege'),field('reason','RP-bírság indoka',true),field('location','Időpont és helyszín'),field('linkedRecordId','Kapcsolódó MDT-irat ID-je',false,false,20)] },
  { key:'evidence',title:'Bizonyítéknyilvántartás',fields:[field('title','Bizonyíték megnevezése'),field('description','Leírás és eredet',true),field('reference','Hivatkozás / azonosító'),field('custodian','RP-kezelő / átadás'),field('linkedRecordId','Kapcsolódó MDT-irat ID-je',false,false,20)] },
  { key:'dispatch',title:'Művelet / riasztás',fields:[field('title','Művelet tárgya'),field('location','Helyszín'),field('unit','Egység / hívójel'),field('priority','Prioritás'),field('state','Műveleti állapot'),field('events','Eseménynapló',true),field('linkedRecordId','Kapcsolódó MDT-irat ID-je',false,false,20)] },
  { key: 'note', title: 'MDT belső feljegyzés', fields: [field('title', 'Feljegyzés címe'), field('content', 'Feljegyzés tartalma', true), field('reference', 'Kapcsolódó ügy vagy hivatkozás', false, false)] }
]);
const MDT_CHANNELS = Object.freeze([
  { key: 'hub', name: 'mdt-kozpont', topic: 'NEXA MDT • belépés, személyes script és műveleti állapot' },
  { key: 'help', name: 'mdt-utmutato', topic: 'NEXA MDT • állományi használati rend és iratkezelés' },
  { key: 'default', name: 'mdt-iratok', topic: 'NEXA MDT • általános RP-nyilvántartás' },
  { key: 'review', name: 'mdt-ellenorzes', topic: 'NEXA MDT • a felvett MDT-tagok bírálatai' },
  { key: 'person', name: 'mdt-szemelyek', topic: 'NEXA MDT • RP-személynyilvántartás' },
  { key: 'vehicle', name: 'mdt-jarmuvek', topic: 'NEXA MDT • RP-járműnyilvántartás' },
  { key: 'case', name: 'mdt-ugyiratok', topic: 'NEXA MDT • jóváhagyott RP-ügyiratok' },
  { key: 'warrant', name: 'mdt-korozesek', topic: 'NEXA MDT • saját, jóváhagyott RP-körözések; nem játékbeli körözésmódosítás' },
  { key: 'shift', name: 'mdt-szolgalati-naplo', topic: 'NEXA MDT • szolgálati RP-bejegyzések' },
  {key:'arrest',name:'mdt-eloallitasok',topic:'NEXA MDT • RP-előállítások és letartóztatások'},
  {key:'fine',name:'mdt-birsagok',topic:'NEXA MDT • RP-bírságok és kapcsolódó iratok'},
  {key:'evidence',name:'mdt-bizonyitekok',topic:'NEXA MDT • bizonyítékok eredete és kezelése'},
  {key:'dispatch',name:'mdt-muveletek',topic:'NEXA MDT • műveletek, riasztások és egységek'},
  {key:'identity',name:'mdt-szemelyik',topic:'NEXA MDT • fiktív RP-igazolványok, kiadás és visszavonás'},
  { key: 'note', name: 'mdt-feljegyzesek', topic: 'NEXA MDT • belső RP-feljegyzések' }
]);
const MDT_CATEGORY = 'BELV • MDT';

class MdtError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new MdtError(status, message); };
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sid = (value) => /^\d{16,22}$/.test(String(value || '')) ? String(value) : null;
const has = (member, bit) => Boolean(member?.permissions?.has(bit));
const admin = (member) => isBotOwner(member?.id);
function requireDatabase() { if (!isPersistentStore()) fail(503, 'Az MDT-hez működő PostgreSQL-adatbázis szükséges.'); }
async function query(sql, values = []) {
  requireDatabase();
  const result = await dbQuery(sql, values);
  if (!result) fail(503, 'Az MDT-adatbázis átmenetileg nem érhető el.');
  return result;
}
async function getSettings(guildId) {
  await requireBelvGuild(guildId);
  const row=(await query('SELECT config,version FROM nexabot_mdt_settings WHERE guild_id=$1',[guildId])).rows[0];
  const network=(await query('SELECT config FROM nexabot_mdt_network_groups WHERE guild_id=$1',[guildId])).rows[0]?.config||{};
  const roster=(await query('SELECT user_id,roblox_ids,rank,reviewer,status FROM nexabot_mdt_network_members WHERE guild_id=$1 LIMIT 1000',[guildId])).rows;
  const current={...(row?.config||{enabled:false,channelIds:{}}),...network,version:row?.version||0,scopeGuildId:guildId};
  const members=new Map((current.members||[]).map(member=>[member.discordId,member]));
  for(const member of roster){if(member.status==='revoked')members.delete(member.user_id);else members.set(member.user_id,{discordId:member.user_id,robloxIds:member.roblox_ids,name:member.rank,reviewer:member.reviewer});}
  current.members=[...members.values()];current.networkMemberIds=roster.filter(member=>member.status==='active').map(member=>member.user_id);
  current.reviewerDiscordIds=roster.filter(member=>member.status==='active'&&member.reviewer).map(member=>member.user_id);
  current.reviewMode=network.reviewMode||(guildId===BELV_GUILD_ID&&!network.networkEnabled?'all_members':'leadership');
  current.exposeDocumentTemplates=network.exposeDocumentTemplates===true;
  return current;
}

async function belvGuildId() { return BELV_GUILD_ID; }
async function requireBelvGuild(guildId) {
  if(!findFaction(String(guildId)))fail(403,'Az MDT kizárólag az öt engedélyezett Belv, FBI, ARFK, TEK és CIA Discord-szerveren használható.');
}
async function revokeMdtOwnerSessions(guildId, actorId) {
  if (!isBotOwner(actorId)) fail(403, 'MDT-belépéseket csak a fő botowner vonhat vissza.');
  await requireBelvGuild(guildId);
  await query('DELETE FROM nexabot_mdt_sessions WHERE guild_id=$1 AND user_id=$2', [guildId, actorId]);
  await query('DELETE FROM nexabot_mdt_codes WHERE guild_id=$1 AND user_id=$2', [guildId, actorId]);
  await recordAudit('mdt_owner_revoke', { guildId, actorId });
}
async function ownerSetupAccess(guild, actorId) {
  if (!isBotOwner(actorId)) fail(403, 'MDT-beállításokat csak a fő botowner módosíthat.');
  const owner = getOwnerSettings();
  if (owner.blacklistedGuilds?.includes(guild.id) || owner.blacklistedUsers?.includes(actorId)) fail(403, 'Ez a szerver vagy fiók le van tiltva a NEXA rendszerben.');
  await requireBelvGuild(guild.id, true);
}
function robloxIdsFor(settings, userId) {
  if (isBotOwner(userId)) return settings.robloxIds || [];
  return (settings.members || []).find((entry) => entry.discordId === userId)?.robloxIds || [];
}
function allRobloxIds(settings) {
  return [...new Set([...(settings.robloxIds || []), ...(settings.members || []).flatMap((entry) => entry.robloxIds || [])])];
}
function isMdtStaff(member, settings) {
  return Boolean(member && settings.staffRoleId && member.roles.cache.has(settings.staffRoleId));
}
function validateMembers(input, ownerIds, network=false) {
  if (input != null && !Array.isArray(input)) fail(400, 'Érvénytelen MDT-taglista.');
  const entries = input || [];
  if (entries.length > (network?500:50)) fail(400, 'A megengedett MDT-taglétszámot elérted.');
  const users = new Set(), ids = new Set(ownerIds);
  return entries.map((entry) => {
    const discordId = sid(entry.discordId), robloxIds = [...new Set((entry.robloxIds || []).map(String))];
    if (!discordId || isBotOwner(discordId) || users.has(discordId)) fail(400, 'Minden MDT-tagnak egyedi Discord-ID kell; a fő owner saját fiókjait külön add meg.');
    if ((!network && !robloxIds.length) || robloxIds.length > 5 || robloxIds.some((id) => !/^[1-9]\d{0,19}$/.test(id) || ids.has(id))) fail(400, 'Egy Roblox-ID csak egy Discord-fiókhoz tartozhat. Tagonként 1–5 saját Roblox-ID adható meg.');
    users.add(discordId);robloxIds.forEach((id) => ids.add(id));
    return { discordId, robloxIds, name: String(entry.name || discordId).slice(0, 80) };
  });
}
function normalizedSettings(input) {
  const rawIds = Array.isArray(input.robloxIds) ? input.robloxIds : String(input.robloxIds || '').split(/[\s,;]+/).filter(Boolean);
  if (rawIds.some((id) => !/^[1-9]\d{0,19}$/.test(String(id)))) fail(400, 'Érvénytelen Roblox-ID. Csak pozitív számot adj meg.');
  const robloxIds = [...new Set(rawIds.map(String))];
  if (robloxIds.length > 10) fail(400, 'Legfeljebb 10 saját Roblox-fiókot adhatsz hozzá.');
  const settings = { networkEnabled:input.networkEnabled===true,enabled: input.enabled === true, robloxIds, members: validateMembers(input.members, robloxIds, input.networkEnabled===true), staffRoleId: sid(input.staffRoleId), discordChannelIds: { hub: sid(input.discordChannelIds?.hub), help: sid(input.discordChannelIds?.help) }, defaultChannelId: sid(input.defaultChannelId), reviewChannelId: sid(input.reviewChannelId) || sid(input.defaultChannelId), channelIds: {} };
  settings.disabledTypes=[...new Set((Array.isArray(input.disabledTypes)?input.disabledTypes:[]).filter(key=>TYPES.some(type=>type.key===key)))];
  settings.approvalTypes=[...new Set((Array.isArray(input.approvalTypes)?input.approvalTypes:TYPES.filter(type=>type.approval).map(type=>type.key)).filter(key=>TYPES.some(type=>type.key===key)))];
  settings.allowSelfReview=input.allowSelfReview!==false;
  settings.reviewMode=input.reviewMode||(settings.networkEnabled?'leadership':'all_members');
  settings.pageSize=bounded(input.pageSize,50,10,100);
  settings.sessionMinutes=bounded(input.sessionMinutes,360,15,360);
  settings.codeMinutes=bounded(input.codeMinutes,10,2,10);
  if (settings.enabled && !settings.networkEnabled && !allRobloxIds(settings).length) fail(400, 'A bekapcsoláshoz legalább egy Roblox-ID-t adj hozzá.');
  for (const type of [...TYPES,{key:'identity'}]) {
    const id = sid(input.channelIds?.[type.key]);
    if (id) settings.channelIds[type.key] = id;
  }
  return settings;
}
async function updateMdtMember(guild, actorId, input, remove = false) {
  await ownerSetupAccess(guild, actorId);
  const settings = await getSettings(guild.id), discordId = sid(input.discordId);
  if(settings.networkEnabled){await require('./mdt-network-data').changeMember({user:{id:actorId},primary:true},guild,{...input,rank:input.rank||settings.members.find(entry=>entry.discordId===discordId)?.name||'Állománytag'},remove);require('./mdt-network-auth').invalidateMember(guild.id,discordId);return getSettings(guild.id);}
  if (!discordId || isBotOwner(discordId)) fail(400, 'A tag saját Discord-ID-jét add meg.');
  const entries = (settings.members || []).filter((entry) => entry.discordId !== discordId);
  if (!remove) {
    const member = await freshMember(guild, discordId);
    if (!member || member.user?.bot) fail(400, 'A felvenni kívánt személynek ezen a Discord-szerveren tagnak kell lennie.');
    const robloxIds = String(input.robloxIds || '').split(/[\s,;]+/).filter(Boolean);
    entries.push({ discordId, robloxIds, name: member.displayName || member.user.username });
  }
  const saved = await saveMdtOwnerConfig(guild, actorId, { ...settings, members: entries });
  await query('DELETE FROM nexabot_mdt_sessions WHERE guild_id=$1 AND user_id=$2', [guild.id, discordId]);
  await query('DELETE FROM nexabot_mdt_codes WHERE guild_id=$1 AND user_id=$2', [guild.id, discordId]);
  await recordAudit(remove ? 'mdt_member_remove' : 'mdt_member_add', { guildId: guild.id, actorId, targetId: discordId });
  return saved;
}
async function saveMdtOwnerConfig(guild, actorId, input, leaseToken = null, networkCommit = null) {
  await ownerSetupAccess(guild, actorId);
  const settings = normalizedSettings(input);
  settings.scopeGuildId = guild.id;
  if (settings.staffRoleId && (!guild.roles.cache?.has(settings.staffRoleId) || settings.staffRoleId === guild.id)) fail(400, 'Válaszd ki a Belv állomány meglévő rangját. Az @everyone nem választható.');
  if (settings.enabled && (settings.members.length || settings.staffRoleId) && [settings.defaultChannelId, ...Object.values(settings.channelIds)].includes(settings.reviewChannelId)) fail(400, 'A vezetői ellenőrzés külön csatornába kerüljön, hogy a jóváhagyásra váró iratokat csak a felvett MDT-tagok lássák. Futtasd a hiányzó szobák telepítését.');
  if(settings.enabled&&settings.reviewChannelId&&textChannel(guild,settings.reviewChannelId)?.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)!==false)fail(400,'A bírálati csatorna nem lehet nyilvános.');
  const lease = (await query('SELECT lease_token FROM nexabot_mdt_provision_locks WHERE guild_id=$1 AND expires_at>NOW()', [guild.id])).rows[0];
  if (lease && lease.lease_token !== leaseToken) fail(409, 'MDT-csatornák létrehozása folyamatban. A mentést utána ismételd meg.');
  if (settings.enabled && !settings.defaultChannelId) fail(400, 'Válassz alapcsatornát, vagy használd a Hiányzó csatornák létrehozása gombot.');
  for (const id of new Set([settings.defaultChannelId, settings.reviewChannelId, ...Object.values(settings.channelIds), ...Object.values(settings.discordChannelIds)].filter(Boolean))) {
    if (!textChannel(guild, id)) fail(400, 'A kiválasztott csatorna nem szerveres szöveges csatorna.');
    if (settings.enabled) await writable({ guild }, id);
  }
  const current=await getSettings(guild.id),expected=Number.isInteger(input.version)?input.version:current.version;
  let saved;
  if(networkCommit){
    await query('INSERT INTO nexabot_mdt_network_groups(guild_id,version) VALUES($1,0) ON CONFLICT DO NOTHING',[guild.id]);
    saved=await query(`WITH locked_group AS MATERIALIZED (SELECT guild_id FROM nexabot_mdt_network_groups WHERE guild_id=$1 AND version=$4 FOR UPDATE), saved_settings AS (
      INSERT INTO nexabot_mdt_settings(guild_id,config,version) SELECT $1,$2::jsonb,1 FROM locked_group
      ON CONFLICT(guild_id) DO UPDATE SET config=EXCLUDED.config,version=nexabot_mdt_settings.version+1,updated_at=NOW() WHERE nexabot_mdt_settings.version=$3 RETURNING version
    ), saved_group AS (UPDATE nexabot_mdt_network_groups SET config=$5,version=version+1,updated_at=NOW() WHERE guild_id=$1 AND EXISTS(SELECT 1 FROM saved_settings) RETURNING version)
    SELECT saved_settings.version,saved_group.version AS network_version FROM saved_settings CROSS JOIN saved_group`,[guild.id,settings,expected,networkCommit.version,typeof networkCommit.config==='function'?networkCommit.config(settings):networkCommit.config]);
  }else saved=await query(`INSERT INTO nexabot_mdt_settings(guild_id,config,version) VALUES($1,$2,1)
    ON CONFLICT(guild_id) DO UPDATE SET config=EXCLUDED.config,version=nexabot_mdt_settings.version+1,updated_at=NOW()
    WHERE nexabot_mdt_settings.version=$3 RETURNING version`,[guild.id,settings,expected]);
  if(!saved.rowCount)fail(409,'Az MDT-beállításokat időközben módosították. Frissítsd az oldalt, majd ismételd meg a saját változtatásodat.');
  settings.version=saved.rows[0].version;
  if(networkCommit)settings.networkVersion=saved.rows[0].network_version;

  await recordAudit('mdt_owner_config', { guildId: guild.id, actorId, metadata: { enabled: settings.enabled, robloxIds: settings.robloxIds } });
  return settings;
}
async function provisionMdtOwnerChannels(guild, actorId, input, networkCommit=null) {
  await ownerSetupAccess(guild, actorId);
  const requested = normalizedSettings({ ...(input || await getSettings(guild.id)), enabled: true });
  if ((requested.members.length || requested.staffRoleId) && requested.reviewChannelId === requested.defaultChannelId) requested.reviewChannelId = null;
  const ownerMember = await freshMember(guild, actorId);
  if (!ownerMember) fail(403, 'A fő ownernek a kiválasztott Discord-szerveren tagnak kell lennie.');
  const token = crypto.randomUUID();
  const acquired = await query(`INSERT INTO nexabot_mdt_provision_locks(guild_id,lease_token,expires_at)
    VALUES($1,$2,NOW()+INTERVAL '5 minutes') ON CONFLICT(guild_id) DO UPDATE
    SET lease_token=EXCLUDED.lease_token,expires_at=EXCLUDED.expires_at
    WHERE nexabot_mdt_provision_locks.expires_at<NOW() RETURNING guild_id`, [guild.id, token]);
  if (!acquired.rowCount) fail(409, 'Az MDT-csatornák telepítése ezen a szerveren már folyamatban van.');
  const created = [], reused = [];
  try {
    await guild.channels.fetch();
    const bot = guild.members.me || await guild.members.fetchMe();
    const resolved = new Map();
    for (const spec of MDT_CHANNELS) {
      const configuredId = spec.key === 'default' ? requested.defaultChannelId : spec.key === 'review' ? requested.reviewChannelId : ['hub', 'help'].includes(spec.key) ? requested.discordChannelIds[spec.key] : requested.channelIds[spec.key];
      let channel = configuredId && textChannel(guild, configuredId);
      if (!channel) {
        const matches = [...guild.channels.cache.values()].filter((item) => item.name === spec.name);
        if (matches.length > 1) fail(409, `Több #${spec.name} csatorna van. Válaszd ki a célcsatornát az Owner Centerben.`);
        if (matches.length && !textChannel(guild, matches[0].id)) fail(409, `A ${spec.name} név más típusú csatornán foglalt. Válassz meglévő szöveges célcsatornát.`);
        channel = matches[0];
      }
      if (channel) {
        await writable({ guild }, channel.id);
        if (!canSee(ownerMember, channel)) fail(409, `A fő owner nem látja a #${channel.name} csatornát. A telepítő nem módosít meglévő jogosultságot.`);
        resolved.set(spec.key, channel.id); reused.push(channel.id);
      }
    }
    const missing = MDT_CHANNELS.filter((spec) => !resolved.has(spec.key));
    if (missing.length) {
      if (!bot.permissions?.has(PermissionFlagsBits.ManageChannels)) fail(403, 'A hiányzó MDT-szobák létrehozásához a botnak Csatornák kezelése jog kell.');
      const categoryName=requireFaction(guild.id).name.toUpperCase()+' • MDT';
      const categories = [...guild.channels.cache.values()].filter((item) => item.name === categoryName && item.type === ChannelType.GuildCategory);
      if (categories.length > 1) fail(409, 'Több frakciós MDT kategória van. A telepítő nem választ találomra.');
      const permissionOverwrites = [
        { id: guild.id, type: 0, deny: [PermissionFlagsBits.ViewChannel] },
        ...[...new Set([actorId, bot.id])].map((id) => ({ id, type: 1, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory] }))
      ];
      const heartbeat = async () => {
        const renewed = await query("UPDATE nexabot_mdt_provision_locks SET expires_at=NOW()+INTERVAL '5 minutes' WHERE guild_id=$1 AND lease_token=$2 AND expires_at>NOW() RETURNING guild_id", [guild.id, token]);
        if (!renewed.rowCount) fail(409, 'A telepítési zárolás lejárt. Indítsd újra a hiányzó csatornák létrehozását.');
      };
      let category = categories[0];
      if (!category) {
        await heartbeat();
        category = await guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory, permissionOverwrites, reason: `NEXA MDT: hiányzó kategória; fő owner ${actorId}` });
        created.push(category.id);
      }
      for (const spec of missing) {
        await heartbeat();
        const channel = await guild.channels.create({ name: spec.name, type: ChannelType.GuildText, parent: category.id, topic: spec.topic, permissionOverwrites, reason: `NEXA MDT: hiányzó csatorna; fő owner ${actorId}` });
        created.push(channel.id); resolved.set(spec.key, channel.id);
      }
    }
    const settings = await saveMdtOwnerConfig(guild, actorId, { ...requested, discordChannelIds: { hub: resolved.get('hub'), help: resolved.get('help') }, defaultChannelId: resolved.get('default'), reviewChannelId: resolved.get('review'), channelIds: Object.fromEntries([...TYPES,{key:'identity'}].map((type) => [type.key, resolved.get(type.key)])) }, token,networkCommit?{...networkCommit,config:settings=>networkCommit.config(settings,created)}:null);
    await recordAudit('mdt_provision_missing', { guildId: guild.id, actorId, metadata: { created, reused: [...new Set(reused)] } });
    return { settings, created, reused: [...new Set(reused)] };
  } catch (error) {
    await recordError(error, { command: 'mdt_provision_missing', guildId: guild.id, userId: actorId }).catch(() => {});
    fail(error.status || 503, `${error.status ? error.message : 'Az MDT-csatornák létrehozása megszakadt. Ellenőrizd a bot naplóját.'}${created.length ? ` ${created.length} új elem már létrejött; újrafuttatáskor ezeket újra használja.` : ''} Meglévő csatornát nem módosított.`);
  } finally {
    await query('DELETE FROM nexabot_mdt_provision_locks WHERE guild_id=$1 AND lease_token=$2', [guild.id, token]).catch(() => {});
  }
}
function hasBelvApprovalRole(member) {
  return Boolean(member?.roles?.cache?.some((role) => normalizedRosterChannel(role.name) === 'belvedelmi-vezetoseg'));
}
function leader(member, settings) {
  return admin(member)||settings.reviewMode==='all_members'&&robloxIdsFor(settings,member?.id).length>0||settings.reviewerDiscordIds?.includes(member?.id)||member?.id===member?.guild?.ownerId||Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator))||Boolean(member?.roles?.cache?.some(role=>(settings.leaderRoleIds||[]).includes(role.id)||LEADER_NAMES.has(normalized(role.name))));
}
function assertAccess(guild, member, settings) {
  if (!findFaction(guild.id) || settings.scopeGuildId !== guild.id) fail(403, 'Az MDT kizárólag a kiválasztott frakció Discord-szerverén használható.');
  const owner = getOwnerSettings();
  if (owner.blacklistedGuilds?.includes(guild.id) || owner.blacklistedUsers?.includes(member?.id)) fail(403, 'Ez a szerver vagy fiók le van tiltva a NEXA rendszerben.');
  if (owner.maintenance && !isBotOwner(member?.id)) fail(503, 'A NEXA jelenleg karbantartás alatt áll.');
  if (!settings.enabled) fail(403, 'Az MDT ezen a Discord-szerveren nincs bekapcsolva.');
  if (!member || !isBotOwner(member.id) && !robloxIdsFor(settings, member.id).length && !settings.networkMemberIds?.includes(member.id) && !leader(member,settings) && !(guild.id === BELV_GUILD_ID && hasBelvApprovalRole(member))) fail(403, 'Nincs MDT-hozzáférésed. A vezetőségnek hozzá kell adnia a Discord-ID-det; játékbeli belépéshez saját Roblox-ID is kell.');
}
async function freshMember(guild, userId) {
  return guild.members.fetch({ user: userId, force: true }).catch(() => null);
}
function textChannel(guild, id) {
  const channel = guild.channels.cache.get(id);
  return channel?.guild?.id === guild.id && channel.isTextBased?.() && !channel.isThread?.() ? channel : null;
}
function canSee(member, channel) {
  return Boolean(channel?.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel));
}
function definitions(guild, member, settings) {
  assertAccess(guild, member, settings);
  const generic = TYPES.filter(type=>!settings.disabledTypes?.includes(type.key)).map((type) => ({ ...type, approval:(settings.approvalTypes||TYPES.filter(item=>item.approval).map(item=>item.key)).includes(type.key), channelId: settings.channelIds?.[type.key] || settings.defaultChannelId, category: type.key }));
  const documents = (settings.exposeDocumentTemplates?allDocumentTypes(guild):[]).filter((type) => {
    const rule = documentRule(guild, type);
    return admin(member) || hasBelvApprovalRole(member) || robloxIdsFor(settings, member.id).length || rule.accessRoleId && member.roles.cache.has(rule.accessRoleId);
  }).map((type) => ({ ...type, key: `doc:${type.key}`, channelId: findDocumentChannel(guild, type)?.id, category: 'document', documentKey: type.key }));
  return [...generic, ...documents].filter((type) => {
    const channel = textChannel(guild, type.channelId);
    return Boolean(channel)&&(type.category!=='document'&&settings.networkEnabled===true||canSee(member, channel));
  }).map((type) => ({ ...type, fields: (type.fields || []).slice(0, 10).map((item) => ({ ...item, maxLength: Math.min(1000, Math.max(1, item.maxLength || 160)) })) }));
}
function definition(ctx, key) {
  const type = definitions(ctx.guild, ctx.member, ctx.settings).find((item) => item.key === key);
  if (!type) fail(403, 'Ehhez az irattípushoz vagy Discord-csatornához nincs hozzáférésed.');
  return type;
}
function cleanFields(type, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Érvénytelen űrlapadat.');
  const fields = {};
  let length = 0;
  for (const spec of type.fields) {
    if (input[spec.id] != null && typeof input[spec.id] !== 'string') fail(400, `${spec.label}: szöveget adj meg.`);
    const value = String(input[spec.id] || '').replace(/\u0000/g, '').trim();
    if (spec.required && !value) fail(400, `Hiányzó mező: ${spec.label}.`);
    if (value.length > spec.maxLength) fail(400, `${spec.label}: legfeljebb ${spec.maxLength} karakter.`);
    if (spec.id === 'linkedRecordId' && value && !/^[1-9]\d{0,19}$/.test(value)) fail(400,'A kapcsolódó irat számazonosítót kapjon.');
    if (spec.id === 'amount' && value && !/^\d{1,9}(?:[.,]\d{1,2})?$/.test(value)) fail(400,'Az RP-bírság összege pozitív szám legyen.');
    if (spec.id === 'robloxId' && value && !/^[1-9]\d{0,19}$/.test(value)) fail(400, `${spec.label}: pozitív számot adj meg.`);
    fields[spec.id] = value;
    length += value.length;
  }
  if (length > 4000) fail(400, 'Az űrlap teljes szövege legfeljebb 4000 karakter lehet.');
  const title = String(fields.title || fields.subject || fields.name || fields.username || fields.plate || fields.target || type.title).slice(0, 160);
  return { fields, title };
}
function publicTemplate(type) {
  return { key: type.key, title: type.title, category: type.category, approval: Boolean(type.approval), fields: type.fields.map(({ id, label, style, required, maxLength, placeholder }) => ({ id, label, style, required, maxLength, placeholder })) };
}
function publicRecord(row, ctx) {
  const manager = admin(ctx.member);
  const owned = row.created_by === ctx.member.id;
  return { id: String(row.id), guildId: row.guild_id, key: row.template_key, title: row.title, fields: row.fields, status: row.status, revision: row.revision, reviewedBy: row.reviewed_by || null, reviewReason: row.review_reason || null, createdBy: row.created_by, updatedBy: row.updated_by, createdAt: row.created_at, updatedAt: row.updated_at, discordState: row.discord_state, discordUrl: row.discord_message_id ? `https://discord.com/channels/${row.guild_id}/${row.discord_channel_id}/${row.discord_message_id}` : row.review_message_id ? `https://discord.com/channels/${row.guild_id}/${row.review_channel_id}/${row.review_message_id}` : null, canEdit: (owned || manager) && !['archived', 'published'].includes(row.status) || (owned || manager) && row.status === 'published' && !row.approval_required, canArchive: (owned || manager) && row.status !== 'archived', canReview: (ctx.guild.id === BELV_GUILD_ID ? hasBelvApprovalRole(ctx.member) : leader(ctx.member, ctx.settings)) && row.status === 'pending' && (ctx.settings.allowSelfReview!==false||!owned||manager), canSync: owned || manager || leader(ctx.member, ctx.settings) && row.reviewed_by === ctx.member.id };
}
async function getRecord(ctx, id) {
  if (!/^\d{1,20}$/.test(String(id))) fail(400, 'Érvénytelen MDT-azonosító.');
  const row = (await query('SELECT * FROM nexabot_mdt_records WHERE guild_id=$1 AND id=$2', [ctx.guild.id, id])).rows[0];
  if (!row) fail(404, 'Az MDT-bejegyzés nem található ezen a szerveren.');
  definition(ctx, row.template_key);
  if (!canReadRecord(ctx, row)) fail(403, 'Ehhez az irathoz felvett MDT-tagság és a célcsatorna láthatósága szükséges.');
  return row;
}
function canReadRecord(ctx, row) {
  return leader(ctx.member, ctx.settings) || ctx.guild.id === BELV_GUILD_ID && hasBelvApprovalRole(ctx.member) || row.created_by === ctx.member.id || row.status === 'published' || row.status === 'archived' && (!row.approval_required || Boolean(row.discord_message_id));
}
function assertEdit(ctx, row) {
  if (row.created_by !== ctx.member.id && !admin(ctx.member)) fail(403, 'Csak a saját iratodat módosíthatod; más iratát a fő owner kezelheti.');
}
function statusLabel(status) { return ({ pending: 'Jóváhagyásra vár', published: 'Közzétéve', rejected: 'Elutasítva', archived: 'Lezárva / archiválva' })[status] || status; }
function recordEmbed(row, type) {
  const embed = new EmbedBuilder().setColor(row.status === 'pending' ? 0xe6b75a : row.status === 'rejected' ? 0xe26c78 : 0x78cbb0)
    .setTitle(`NEXA MDT #${row.id} • ${type.title}`.slice(0, 256))
    .setDescription(`**${row.title}**`).addFields(
      { name: 'Ügyintéző', value: `<@${row.created_by}>`, inline: true },
      { name: 'Állapot', value: statusLabel(row.status), inline: true },
      ...type.fields.map((spec) => ({ name: spec.label.slice(0, 80), value: (row.fields[spec.id] || '—').slice(0, 1000) })),
      ...(row.reviewed_by ? [{ name: 'Vezetői döntés', value: `<@${row.reviewed_by}>` }] : []),
      ...(row.review_reason ? [{ name: 'Elbírálás indoka', value: row.review_reason.slice(0, 300) }] : []))
    .setFooter({ text: `NEXA • Belvédelmi Igazgatóság • Emergency Hamburg RP • r${row.revision}` }).setTimestamp(new Date(row.updated_at));
  return embed;
}
function controls(row) {
  const button = (action, label, style) => new ButtonBuilder().setCustomId(`mdt_${action}:${row.id}${['approve','reject'].includes(action)?':'+row.revision:''}`).setLabel(label).setStyle(style);
  return [new ActionRowBuilder().addComponents(
    ...(row.status === 'pending' ? [button('approve', 'Jóváhagyás', ButtonStyle.Success), button('reject', 'Elutasítás', ButtonStyle.Danger)] : []),
    button('view', 'MDT-adatlap', ButtonStyle.Secondary),
    ...(row.status !== 'archived' ? [button('archive', 'Lezárás', ButtonStyle.Secondary)] : []))];
}
async function writable(ctx, id) {
  const channel = textChannel(ctx.guild, id);
  if (!channel) fail(409, 'A beállított Discord-csatorna nem található. Ellenőrizd az Owner Center → NEXA MDT oldalt.');
  const bot = ctx.guild.members.me || await ctx.guild.members.fetchMe();
  const permissions = channel.permissionsFor(bot);
  if (![PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory].every((bit) => permissions?.has(bit))) fail(409, 'A botnak a célcsatornában látási, üzenetküldési, beágyazási és előzményolvasási jog kell.');
  return channel;
}
async function syncRecordUnlocked(ctx, id) {
  const row = await getRecord(ctx, id);
  const type = definition(ctx, row.template_key);
  try {
    const review = row.status === 'pending' || row.status === 'rejected' || row.status === 'archived' && row.approval_required && !row.discord_message_id;
    const channelId = review ? row.review_channel_id || ctx.settings.reviewChannelId || ctx.settings.defaultChannelId : row.discord_channel_id || type.channelId;
    if(review&&!ctx.settings.reviewChannelId&&!row.review_channel_id)fail(409,'A bírálati csatorna nincs beállítva. A bizalmas irat az adatbázisban maradt.');
    const channel = await writable(ctx, channelId);
    if(review&&channel.permissionsFor(ctx.guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)!==false)fail(409,'A bírálati csatorna nyilvános lett. Az irat küldése felfüggesztve.');
    const messageId = review ? row.review_message_id : row.discord_message_id;
    const payload = { embeds: [recordEmbed(row, type)], components: controls(row), allowedMentions: { parse: [] } };
    let message;
    if (messageId) {
      const previous = await channel.messages.fetch(messageId).catch((error) => { if (error.code === 10008) return null; throw error; });
      message = previous ? await previous.edit(payload) : await channel.send({ ...payload, nonce: `${review ? 'R' : 'P'}${row.id}`, enforceNonce: true });
    } else message = await channel.send({ ...payload, nonce: `${review ? 'R' : 'P'}${row.id}`, enforceNonce: true });
    const updated = await query(review
      ? "UPDATE nexabot_mdt_records SET review_channel_id=$1,review_message_id=$2,discord_state='synced' WHERE guild_id=$3 AND id=$4 RETURNING *"
      : "UPDATE nexabot_mdt_records SET discord_channel_id=$1,discord_message_id=$2,discord_state='synced' WHERE guild_id=$3 AND id=$4 RETURNING *", [channel.id, message.id, ctx.guild.id, row.id]);
    if (!review && row.review_message_id) {
      const reviewChannel = textChannel(ctx.guild, row.review_channel_id);
      const previous = await reviewChannel?.messages.fetch(row.review_message_id).catch(() => null);
      if (previous) await previous.edit({ ...payload, components: [] }).catch(() => null);
    }
    return { row: updated.rows[0], warning: null };
  } catch (error) {
    await query("UPDATE nexabot_mdt_records SET discord_state='failed' WHERE guild_id=$1 AND id=$2", [ctx.guild.id, row.id]);
    await recordError(error, { command: 'mdt_discord_sync', guildId: ctx.guild.id, userId: ctx.member.id });
    return { row: { ...row, discord_state: 'failed' }, warning: 'Az irat az adatbázisban megvan, de a Discord-közzététel sikertelen. Javítsd a bot csatornajogait, majd válaszd az Újraküldés gombot.' };
  }
}
async function withLock(key, action) {
  const previous = syncLocks.get(key) || Promise.resolve();
  const run = previous.catch(() => {}).then(action);
  syncLocks.set(key, run);
  try { return await run; } finally { if (syncLocks.get(key) === run) syncLocks.delete(key); }
}
const syncRecord = (ctx, id) => withLock(`${ctx.guild.id}:${id}`, () => syncRecordUnlocked(ctx, id));
async function createRecord(ctx, body) {
  const type = definition(ctx, body.key);
  const data = cleanFields(type, body.fields);
  if(data.fields.linkedRecordId)await getRecord(ctx,data.fields.linkedRecordId);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(String(body.clientKey || ''))) fail(400, 'Hiányzó kérésazonosító.');
  const inputHash = digest(JSON.stringify([type.key, data.title, data.fields]));
  const inserted = await query(`INSERT INTO nexabot_mdt_records (guild_id,template_key,title,fields,status,approval_required,created_by,updated_by,client_key,input_hash)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9) ON CONFLICT (guild_id,created_by,client_key) DO NOTHING RETURNING *`,
  [ctx.guild.id, type.key, data.title, data.fields, type.approval ? 'pending' : 'published', Boolean(type.approval), ctx.member.id, body.clientKey, inputHash]);
  let row = inserted.rows[0];
  if (!row) {
    row = (await query('SELECT * FROM nexabot_mdt_records WHERE guild_id=$1 AND created_by=$2 AND client_key=$3', [ctx.guild.id, ctx.member.id, body.clientKey])).rows[0];
    if (!row || row.input_hash !== inputHash) fail(409, 'A korábbi kérésazonosítóhoz más űrlaptartalom tartozik. Nyiss új bejegyzést.');
    return { row, duplicate: true, warning: row.discord_state === 'synced' ? null : 'A korábbi beküldés már mentve van; a Discord-küldést az Újraküldés gombbal folytathatod.' };
  }
  await recordAudit('mdt_record_create', { actorId: ctx.member.id, guildId: ctx.guild.id, targetId: String(row.id), metadata: { key: type.key, status: row.status } });
  return syncRecord(ctx, row.id);
}
async function mutateRecord(ctx, id, body, action) {
  return withLock(`${ctx.guild.id}:${id}`, async () => {
    const row = await getRecord(ctx, id);
    const type = definition(ctx, row.template_key);
    if (!Number.isInteger(body.revision) || body.revision !== row.revision) fail(409, 'Ezt az iratot időközben módosították. Frissítsd az adatlapot.');
    let fields = row.fields, title = row.title, status = row.status, reviewedBy = row.reviewed_by, reason = row.review_reason;
    if (action === 'review') {
      if(row.created_by===ctx.member.id&&ctx.settings.allowSelfReview===false&&!admin(ctx.member))fail(403,'A saját iratodat egy másik MDT-tagnak kell bírálnia.');
      if (!(ctx.guild.id === BELV_GUILD_ID ? hasBelvApprovalRole(ctx.member) : leader(ctx.member, ctx.settings))) fail(403, ctx.guild.id === BELV_GUILD_ID ? 'Az iratokat kizárólag a BELVÉDELMI VEZETŐSÉG rang bírálhatja el.' : 'Az MDT-iratokat a felvett MDT-tagok és a fő owner bírálhatják.');
      if (row.status !== 'pending') fail(409, 'Ez az irat már nem vár jóváhagyásra.');
      if (!['approve', 'reject'].includes(body.decision)) fail(400, 'Érvénytelen döntés.');
      status = body.decision === 'approve' ? 'published' : 'rejected';
      reviewedBy = ctx.member.id; reason = String(body.reason || '').trim();
      if (reason.length > 300) fail(400, 'A bírálat indoka legfeljebb 300 karakter.');
      if (body.decision === 'reject' && reason.length < 3) fail(400, 'Az elutasításhoz legalább 3 karakteres indok szükséges.');
    } else {
      assertEdit(ctx, row);
      if (row.status === 'archived') fail(409, 'A lezárt bejegyzés már nem módosítható.');
      if (action === 'archive') status = 'archived';
      else {
        if (row.approval_required && row.status === 'published') fail(409, 'A jóváhagyott irat lezárható, de nem írható át. Módosításhoz új bejegyzést készíts.');
        ({ fields, title } = cleanFields(type, body.fields));
        if(fields.linkedRecordId)await getRecord(ctx,fields.linkedRecordId);
        status = row.approval_required ? 'pending' : 'published'; reviewedBy = null; reason = null;
      }
    }
    const result = await query(`UPDATE nexabot_mdt_records SET fields=$1,title=$2,status=$3,reviewed_by=$4,review_reason=$5,updated_by=$6,revision=revision+1,updated_at=NOW(),discord_state='pending'
      WHERE guild_id=$7 AND id=$8 AND revision=$9 RETURNING *`, [fields, title, status, reviewedBy, reason, ctx.member.id, ctx.guild.id, id, body.revision]);
    if (!result.rowCount) fail(409, 'Az irat megváltozott. Frissítsd az adatlapot.');
    await recordAudit(`mdt_record_${action}`, { actorId: ctx.member.id, guildId: ctx.guild.id, targetId: String(id), metadata: { status } });
    return syncRecordUnlocked(ctx, id);
  });
}
async function issueCode(guild, member) {
  const settings = await getSettings(guild.id);
  assertAccess(guild, member, settings);
  if (!robloxIdsFor(settings, member.id).length) fail(409, 'A Discord-fiókodhoz előbb saját Roblox-ID-t kell felvenni az Owner Centerben.');
  const code = crypto.randomBytes(18).toString('base64url');
  await query('DELETE FROM nexabot_mdt_codes WHERE guild_id=$1 AND user_id=$2 OR expires_at<NOW()', [guild.id, member.id]);
  await query('INSERT INTO nexabot_mdt_codes(code_hash,guild_id,user_id,expires_at) VALUES($1,$2,$3,$4)', [digest(code), guild.id, member.id, new Date(Date.now() + bounded(settings.codeMinutes,10,2,10)*60000)]);
  return code;
}
async function login(client, code, robloxId, expectedGuildId) {
  if (!/^[1-9]\d{0,19}$/.test(String(robloxId || ''))) fail(403, 'Hiányzó vagy érvénytelen Roblox-ID.');
  if (!/^[a-zA-Z0-9_-]{24}$/.test(String(code || ''))) fail(401, 'Hibás vagy lejárt MDT-belépőkód.');
  const data = (await query('DELETE FROM nexabot_mdt_codes WHERE code_hash=$1 AND expires_at>NOW() RETURNING *', [digest(code)])).rows[0];
  if (!data) fail(401, 'Hibás, lejárt vagy már felhasznált MDT-belépőkód. Kérj újat: /mdt belepes.');
  const guild = client.guilds.cache.get(data.guild_id);
  if (!guild) fail(403, 'A NEXA nincs az érintett Discord-szerveren.');
  const member = await freshMember(guild, data.user_id);
  const settings = await getSettings(guild.id);
  assertAccess(guild, member, settings);
  if (!robloxIdsFor(settings, member.id).includes(String(robloxId))) fail(403, 'Ez a Roblox-ID nem a belépőkódot kérő Discord-fiókhoz tartozik.');
  if (expectedGuildId && expectedGuildId !== guild.id) fail(403, 'A belépőkódot a panelhez kiválasztott frakció Discord-szerverén kérd.');
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + bounded(settings.sessionMinutes,360,15,360)*60000);
  await query('DELETE FROM nexabot_mdt_sessions WHERE guild_id=$1 AND user_id=$2 OR expires_at<NOW()', [guild.id, member.id]);
  await query('INSERT INTO nexabot_mdt_sessions(token_hash,guild_id,user_id,expires_at,roblox_user_id) VALUES($1,$2,$3,$4,$5)', [digest(token), guild.id, member.id, expiresAt, String(robloxId)]);
  await recordAudit('mdt_login', { guildId: guild.id, actorId: member.id });
  return { token, expiresAt, guild: { id: guild.id, name: guild.name }, officer: { id: member.id, name: member.displayName || member.user.username } };
}
async function authorize(client, header, robloxId) {
  const token = String(header || '').match(/^Bearer ([a-zA-Z0-9_-]{43})$/)?.[1];
  if (!token) fail(401, 'Jelentkezz be az MDT-panelbe.');
  const session = (await query('SELECT * FROM nexabot_mdt_sessions WHERE token_hash=$1 AND expires_at>NOW()', [digest(token)])).rows[0];
  if (!session) fail(401, 'Az MDT-munkamenet lejárt vagy visszavonták. Kérj új belépőkódot.');
  const guild = client.guilds.cache.get(session.guild_id);
  if (!guild) fail(403, 'A Discord-szerver nem érhető el.');
  const member = await freshMember(guild, session.user_id);
  const settings = await getSettings(guild.id);
  assertAccess(guild, member, settings);
  if (!session.roblox_user_id || !robloxIdsFor(settings, member.id).includes(session.roblox_user_id) || String(robloxId || '') !== session.roblox_user_id) fail(403, 'Ez a Discord–Roblox fiókpár már nincs engedélyezve az Owner Centerben.');
  return { guild, member, settings, session, tokenHash: digest(token) };
}
function rateAllowed(key, limit) {
  const now = Date.now();
  for (const [k, window] of windows) if (now - window.start > 60_000) windows.delete(k);
  if (windows.size > 10_000) fail(429, 'Az MDT túlterhelt. Próbáld később.');
  const current = windows.get(key) || { start: now, count: 0 };
  current.count++; windows.set(key, current);
  return current.count <= limit;
}
function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '60' } : {}) });
  response.end(JSON.stringify(value));
}
async function readJson(request) {
  if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) fail(415, 'JSON-tartalmú kérés szükséges.');
  const length = Number(request.headers['content-length'] || 0);
  if (length > 32_000) fail(413, 'Túl nagy MDT-kérés.');
  const chunks = []; let bytes = 0;
  for await (const chunk of request) {
    bytes += Buffer.byteLength(chunk); if (bytes > 32_000) fail(413, 'Túl nagy MDT-kérés.');
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  let value; try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Hibás JSON-kérés.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'JSON-objektum szükséges.');
  return value;
}

async function recordHistory(ctx, id, before = null) {
  await getRecord(ctx, id);
  if (before && !/^\d{1,10}$/.test(String(before))) fail(400, 'Érvénytelen előzménylapozás.');
  const result = await query(`SELECT revision,actor_id,action,snapshot,created_at FROM nexabot_mdt_history
    WHERE guild_id=$1 AND record_id=$2 AND ($3::integer IS NULL OR revision<$3)
    ORDER BY revision DESC LIMIT 51`, [ctx.guild.id, id, before || null]);
  const entries = result.rows.slice(0, 50);
  return { history: entries.map((entry) => ({ revision: entry.revision, actorId: entry.actor_id, action: entry.action, snapshot: entry.snapshot, at: entry.created_at })), next: result.rows.length > 50 ? String(entries.at(-1).revision) : null };
}
async function mdtSummary(ctx) {
  const keys = definitions(ctx.guild, ctx.member, ctx.settings).map((type) => type.key);
  const result = await query(`SELECT template_key,status,COUNT(*)::integer AS total,
    COUNT(*) FILTER(WHERE discord_state='failed')::integer AS sync_failed
    FROM nexabot_mdt_records WHERE guild_id=$1 AND template_key=ANY($2::text[])
    GROUP BY template_key,status`, [ctx.guild.id, keys]);
  const summary = { total: 0, pending: 0, published: 0, archived: 0, rejected: 0, activeWarrants: 0, syncFailed: 0, byType: {} };
  for (const row of result.rows) {
    const count = Number(row.total) || 0;
    summary.total += count; summary[row.status] = (summary[row.status] || 0) + count;
    summary.syncFailed += Number(row.sync_failed) || 0;
    summary.byType[row.template_key] = (summary.byType[row.template_key] || 0) + count;
    if (row.template_key === 'warrant' && row.status === 'published') summary.activeWarrants += count;
  }
  return summary;
}
async function exportMdtRecords(ctx, params) {
  const allowed = definitions(ctx.guild, ctx.member, ctx.settings).map((type) => type.key);
  const chosen = params.get('key'), status = params.get('status'), before = params.get('before');
  if (chosen && !allowed.includes(chosen)) fail(403, 'Ehhez az irattípushoz nincs jogosultságod.');
  if (status && !['pending', 'published', 'archived', 'rejected'].includes(status)) fail(400, 'Érvénytelen MDT-állapot.');
  if (before && !/^\d{1,20}$/.test(before)) fail(400, 'Érvénytelen lapozási azonosító.');
  const result = await query(`SELECT * FROM nexabot_mdt_records WHERE guild_id=$1 AND template_key=ANY($2::text[])
    AND ($3::text IS NULL OR status=$3) AND ($4::bigint IS NULL OR id<$4)
    AND ($5=TRUE OR created_by=$6 OR status='published' OR (status='archived' AND (approval_required=FALSE OR discord_message_id IS NOT NULL)))
    ORDER BY id DESC LIMIT 501`, [ctx.guild.id, chosen ? [chosen] : allowed, status || null, before || null,leader(ctx.member,ctx.settings),ctx.member.id]);
  const rows = result.rows.slice(0, 500);
  await recordAudit('mdt_export', { guildId: ctx.guild.id, actorId: ctx.member.id, metadata: { count: rows.length } });
  return { records: rows.map((row) => publicRecord(row, ctx)), next: result.rows.length > 500 ? String(rows.at(-1).id) : null };
}
function mdtCsv(records) {
  const cell = (value) => {
    let text = value instanceof Date ? value.toISOString() : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
    if (/^(?:\s*[=+@\-]|[\t\r\n])/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const columns = ['id', 'key', 'title', 'status', 'revision', 'createdBy', 'reviewedBy', 'reviewReason', 'updatedAt', 'fields'];
  return '\ufeff' + [columns.join(','), ...records.map((row) => columns.map((key) => cell(row[key])).join(','))].join('\r\n');
}

async function handleMdtApi(client, request, response, url) {
  let authorized=false;
  try {
    requireDatabase();
    const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = /^[0-9a-fA-F.:]{3,64}$/.test(forwarded) ? forwarded : String(request.socket?.remoteAddress || 'unknown');
    const path = url.pathname.slice(PREFIX.length);
    if (path === '/auth' && request.method === 'POST') {
      if (!rateAllowed(`login:${ip}`, 12)) fail(429, 'Túl sok belépési kísérlet. Várj egy percet.');
      const body = await readJson(request);
      return send(response, 200, { ok: true, ...(await login(client, body.code, body.robloxUserId, body.guildId)) });
    }
    if (!rateAllowed(`api:${ip}`, 180)) fail(429, 'Túl sok MDT-kérés. Várj egy percet.');
    const ctx = await authorize(client, request.headers.authorization, request.headers['x-mdt-roblox-id']);
    authorized=true;
    if (!rateAllowed(`officer:${ctx.guild.id}:${ctx.member.id}`, 90)) fail(429, 'Túl sok MDT-kérés. Várj egy percet.');
    if (path === '/logout' && request.method === 'POST') {
      await query('DELETE FROM nexabot_mdt_sessions WHERE token_hash=$1', [ctx.tokenHash]);
      return send(response, 200, { ok: true });
    }
    if (path === '/bootstrap' && request.method === 'GET') return send(response, 200, { ok: true, guild: { id: ctx.guild.id, name: ctx.guild.name }, officer: { id: ctx.member.id, name: ctx.member.displayName || ctx.member.user.username }, manager: admin(ctx.member), canReview: leader(ctx.member, ctx.settings), version: '25.0.3', expiresAt:ctx.session.expires_at, templates: definitions(ctx.guild, ctx.member, ctx.settings).map(publicTemplate) });
    if (path === '/summary' && request.method === 'GET') return send(response, 200, { ok: true, summary: await mdtSummary(ctx) });
    if (path === '/export' && request.method === 'GET') {
      const result = await exportMdtRecords(ctx, url.searchParams);
      if (url.searchParams.get('format') === 'csv') {
        response.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="belv-mdt.csv"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(result.next ? { 'X-Mdt-Next': result.next } : {}) });
        return response.end(mdtCsv(result.records));
      }
      return send(response, 200, { ok: true, ...result, exportedAt: new Date().toISOString() });
    }
    const historyMatch = path.match(/^\/records\/(\d{1,20})\/history$/);
    if (historyMatch && request.method === 'GET') return send(response, 200, { ok: true, ...(await recordHistory(ctx, historyMatch[1], url.searchParams.get('before'))) });
    if (path === '/people/lookup' && request.method === 'GET') {
      const id = String(url.searchParams.get('robloxId') || '');
      const username = String(url.searchParams.get('username') || '');
      const before = url.searchParams.get('before');
      if (!/^[1-9]\d{0,19}$/.test(id)) fail(400, 'A személy lekérdezéséhez érvényes Roblox-ID kell.');
      if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) fail(400, 'Érvénytelen Roblox-felhasználónév.');
      if (before && !/^\d{1,20}$/.test(before)) fail(400, 'Érvénytelen lapozási azonosító.');
      const keys = definitions(ctx.guild, ctx.member, ctx.settings).filter((type) => ['person', 'warrant', 'case'].includes(type.key)).map((type) => type.key);
      const result = await query(`SELECT * FROM nexabot_mdt_records WHERE guild_id=$1 AND template_key=ANY($2::text[])
        AND (fields->>'robloxId'=$3 OR (COALESCE(fields->>'robloxId','')='' AND $4<>''
          AND ((template_key='person' AND lower(fields->>'username')=lower($4))
            OR (template_key='warrant' AND lower(fields->>'target')=lower($4)))))
        AND ($5::bigint IS NULL OR id<$5::bigint)
        AND ($6::text IS NULL OR created_by=$6 OR status='published' OR (status='archived' AND (approval_required=FALSE OR discord_message_id IS NOT NULL)))
        ORDER BY id DESC LIMIT 51`, [ctx.guild.id, keys, id, username, before || null, leader(ctx.member, ctx.settings) ? null : ctx.member.id]);
      const rows = result.rows.slice(0, 50);
      return send(response, 200, { ok: true, records: rows.map((row) => ({ ...publicRecord(row, ctx), identityMatch: row.fields.robloxId ? 'robloxId' : 'legacyUsername' })), next: result.rows.length > 50 ? String(rows[rows.length - 1].id) : null });
    }
    if (path === '/records' && request.method === 'GET') {
      const allowed=definitions(ctx.guild,ctx.member,ctx.settings).map(type=>type.key),chosen=url.searchParams.get('key');
      if(chosen&&!allowed.includes(chosen))fail(403,'Ehhez az irattípushoz nincs jogosultságod.');
      const search=String(url.searchParams.get('q')||'').trim().slice(0,100),before=url.searchParams.get('before'),status=url.searchParams.get('status'),sort=url.searchParams.get('sort')||'newest';
      const creator=url.searchParams.get('mine')==='1'?ctx.member.id:url.searchParams.get('creator'),hours=url.searchParams.get('hours');
      if(before&&!/^\d{1,20}$/.test(before))fail(400,'Érvénytelen lapozási azonosító.');
      if(status&&!['pending','published','rejected','archived'].includes(status))fail(400,'Érvénytelen MDT-állapot.');
      if(!['newest','oldest'].includes(sort)||creator&&!sid(creator)||hours&&!/^(?:[1-9]\d?|[1-6]\d{2}|7[01]\d|720)$/.test(hours))fail(400,'Érvénytelen MDT-szűrő.');
      const size=bounded(ctx.settings.pageSize,50,10,100),oldest=sort==='oldest';
      const result=await query(`SELECT * FROM nexabot_mdt_records WHERE guild_id=$1 AND template_key=ANY($2::text[])
        AND ($3='' OR strpos(lower(title||' '||fields::text),lower($3))>0)
        AND ($4::bigint IS NULL OR id${oldest?'>':'<'}$4) AND ($5::text IS NULL OR status=$5)
        AND ($6::text IS NULL OR created_by=$6) AND ($7::integer IS NULL OR created_at>=NOW()-($7::integer*INTERVAL '1 hour'))
        AND ($9::boolean OR created_by=$10 OR status='published' OR (status='archived' AND (approval_required=FALSE OR discord_message_id IS NOT NULL)))
        ORDER BY id ${oldest?'ASC':'DESC'} LIMIT $8`,[ctx.guild.id,chosen?[chosen]:allowed,search,before||null,status||null,creator||null,hours||null,size+1,leader(ctx.member,ctx.settings),ctx.member.id]);
      const rows=result.rows.slice(0,size);
      return send(response,200,{ok:true,records:rows.map(row=>publicRecord(row,ctx)),next:result.rows.length>size?String(rows.at(-1).id):null});
    }
    if (path === '/records' && request.method === 'POST') {
      const result = await createRecord(ctx, await readJson(request));
      return send(response, result.duplicate ? 200 : 201, { ok: true, record: publicRecord(result.row, ctx), warning: result.warning });
    }
    const match = path.match(/^\/records\/(\d{1,20})(?:\/(archive|review|sync))?$/);
    if (match) {
      if (request.method === 'GET' && !match[2]) return send(response, 200, { ok: true, record: publicRecord(await getRecord(ctx, match[1]), ctx) });
      if (request.method === 'POST' && match[2] === 'sync') {
        const row = await getRecord(ctx, match[1]);
        if (row.reviewed_by !== ctx.member.id || !leader(ctx.member, ctx.settings)) assertEdit(ctx, row);
        const result = await syncRecord(ctx, match[1]);
        return send(response, 200, { ok: true, record: publicRecord(result.row, ctx), warning: result.warning });
      }
      if (request.method === 'PATCH' && !match[2] || request.method === 'POST' && ['archive', 'review'].includes(match[2])) {
        const result = await mutateRecord(ctx, match[1], await readJson(request), match[2] || 'edit');
        return send(response, 200, { ok: true, record: publicRecord(result.row, ctx), warning: result.warning });
      }
    }
    fail(404, 'Ismeretlen MDT-végpont.');
  } catch (error) {
    if (!(error instanceof MdtError)) await recordError(error, { command: 'mdt_api' }).catch(() => {});
    return send(response, error.status || 503, { ok: false, relogin: !authorized&&[401,403].includes(error.status), error: error.status ? error.message : 'Az MDT szolgáltatás átmenetileg nem érhető el. Próbáld újra később.' });
  }
}
function normalizedRosterChannel(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function belvNickname(member, entry, previous = null) {
  const current = String(member.nickname || member.user.globalName || member.user.username || 'Tag').trim();
  const oldBadge = previous ? 'BV-' + String(previous.badge).padStart(2, '0') : null;
  const identity = previous ? stripManagedNickname(current, previous.nick_rank, oldBadge) : current;
  const suffix = ` | ${entry.nickRank} | ${entry.badge}`;
  const room = Math.max(1, 32 - Array.from(suffix).length);
  return `${Array.from(identity || member.user.username || 'Tag').slice(0, room).join('')}${suffix}`;
}
function hasBelvPersonnelRole(member, roleIdMap = configuredRankRoleMap(process.env.BELV_RANK_ROLE_IDS)) {
  return Boolean(rankForMember(member, roleIdMap));
}
function belvRosterEmbed(roster = BELV_ROSTER) {
  const embed = new EmbedBuilder()
    .setColor(0x1f4968)
    .setTitle('🏛️ BELVÉDELMI IGAZGATÓSÁG')
    .setDescription('**HIVATALOS JELVÉNYSZÁM- ÉS ÁLLOMÁNYI NYILVÁNTARTÁS**\nA lista csak a hivatalos BELV-rendfokozattal rendelkező tagokat mutatja. Ha valakiről lekerül az összes BELV-rangja, a bejegyzés automatikusan kikerül. Egy állománytaghoz egy aktív BV-azonosító tartozik. A Discord-becenév formátuma: `név | rang | BV-XX`.')
    .setFooter({ text: BELV_ROSTER_MARKER });
  for (const group of ['Felsővezetés', 'Vezetői állomány', 'Ellenőrzési állomány', 'Hivatásos állomány', 'Képzési állomány']) {
    const members = roster.filter((entry) => entry.group === group);
    embed.addFields({
      name: group,
      value: members.map((entry) => `<@${entry.id}> — **${entry.rank}** · **${entry.badge}**`).join('\n') || '—',
      inline: false
    });
  }
  embed.addFields({
    name: 'Hivatalos BV-tartományok',
    value: 'Főigazgató **BV-01** · Főigazgató-helyettes **BV-02** · Igazgató **BV-03** · Igazgatóhelyettes **BV-04–09**\nFőosztályvezető **BV-10–14** · Műveleti vezető **BV-15–19** · Ellenőrzési vezető **BV-20–24** · Főellenőr **BV-25–34**\nVezető tiszt **BV-35–39** · Belvédelmi tiszt **BV-40–49** · Vezető ügynök **BV-50–59** · Különleges ügynök **BV-60–69** · Belvédelmi ügynök **BV-70–89** · Belvédelmi jelölt **BV-90–99**',
    inline: false
  }).addFields({
    name: 'Szabály',
    value: 'Előléptetéskor a régi azonosító visszavonandó, és az új rangtartományból kell kiosztani a következőt. Jelvényszám önállóan nem választható vagy adható át. ',
    inline: false
  }).setTimestamp();
  return embed;
}
async function ensureBelvRosterBadgeTable() {
  if (!belvRosterBadgeSchemaPromise) {
    belvRosterBadgeSchemaPromise = (async () => {
      await query('CREATE TABLE IF NOT EXISTS nexabot_belv_roster_badges (guild_id TEXT NOT NULL,user_id TEXT NOT NULL,badge SMALLINT NOT NULL,rank_name TEXT NOT NULL,nick_rank TEXT NOT NULL,group_name TEXT NOT NULL,range_min SMALLINT NOT NULL,range_max SMALLINT NOT NULL,role_id TEXT,active BOOLEAN NOT NULL DEFAULT FALSE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(guild_id,user_id))');
      await query('CREATE UNIQUE INDEX IF NOT EXISTS nexabot_belv_active_badge_idx ON nexabot_belv_roster_badges(guild_id,badge) WHERE active=TRUE');
    })().catch((error) => { belvRosterBadgeSchemaPromise = null; throw error; });
  }
  await belvRosterBadgeSchemaPromise;
}
async function syncBelvRosterUnlocked(guild, actorId, botUserId) {
  if (guild?.id !== BELV_GUILD_ID) fail(403, 'Az állományi frissítés kizárólag a Belvédelmi Igazgatóság szerverén futtatható.');
  await guild.channels.fetch();
  const matches = [...guild.channels.cache.values()].filter((channel) => channel.type === ChannelType.GuildText && normalizedRosterChannel(channel.name).includes('allomanyi-nyilvantartas'));
  if (!matches.length) fail(404, 'Nem találom az állományi-nyilvántartás szövegcsatornát. A bot nem hozott létre másik csatornát.');
  if (matches.length > 1) fail(409, 'Több állományi-nyilvántartás csatornát találtam; nem választottam találomra.');
  const channel = matches[0];
  const bot = guild.members.me || await guild.members.fetchMe();
  if (!channel.permissionsFor(bot)?.has(PermissionFlagsBits.ViewChannel, true) || !channel.permissionsFor(bot)?.has(PermissionFlagsBits.SendMessages, true) || !channel.permissionsFor(bot)?.has(PermissionFlagsBits.EmbedLinks, true) || !channel.permissionsFor(bot)?.has(PermissionFlagsBits.ReadMessageHistory, true)) fail(403, 'A botnak látási, küldési, embed- és előzményolvasási jog kell az állományi nyilvántartás csatornában.');
  const recent = await channel.messages.fetch({ limit: 50 });
  const prior = [...recent.values()].find((message) => message.author?.id === botUserId && (message.embeds || []).some((embed) => (embed.footer?.text || embed.data?.footer?.text) === BELV_ROSTER_MARKER));
  const legacy = [...recent.values()].find((message) => {
    if (message.author?.id === botUserId) return false;
    const body = (message.content || '') + '\n' + (message.embeds || []).map((embed) => (embed.title || embed.data?.title || '') + '\n' + (embed.description || embed.data?.description || '') + '\n' + (embed.fields || embed.data?.fields || []).map((field) => field.value).join('\n')).join('\n');
    return body.includes('BELVÉDELMI IGAZGATÓSÁG') && body.includes('ÖSSZESEN: 25 BEJEGYZÉS') && body.includes('FBI');
  });
  await ensureBelvRosterBadgeTable();
  const seedValues = [], seedRows = [];
  for (const entry of BELV_ROSTER) {
    const number = Number(String(entry.badge).match(/(\d+)$/)?.[1]);
    if (!Number.isInteger(number) || number < 1 || number > 99) continue;
    const rankInfo = classifyBelvRole({ id: 'legacy-' + entry.id, name: entry.rank + ' ' + entry.badge });
    if (!rankInfo) continue;
    const offset = seedValues.length;
    seedValues.push(guild.id, entry.id, number, entry.rank, entry.nickRank, entry.group, rankInfo.min, rankInfo.max, null);
    seedRows.push('($' + (offset+1) + ',$' + (offset+2) + ',$' + (offset+3) + ',$' + (offset+4) + ',$' + (offset+5) + ',$' + (offset+6) + ',$' + (offset+7) + ',$' + (offset+8) + ',$' + (offset+9) + ',FALSE)');
  }
  if (seedRows.length) await query('INSERT INTO nexabot_belv_roster_badges(guild_id,user_id,badge,rank_name,nick_rank,group_name,range_min,range_max,role_id,active) VALUES ' + seedRows.join(',') + ' ON CONFLICT(guild_id,user_id) DO NOTHING', seedValues);
  const rows = (await query('SELECT user_id,badge,rank_name,nick_rank,group_name,range_min,range_max,role_id FROM nexabot_belv_roster_badges WHERE guild_id=$1', [guild.id])).rows;
  const previousByUser = new Map(rows.map((row) => [String(row.user_id), row]));
  const roleMap = configuredRankRoleMap(process.env.BELV_RANK_ROLE_IDS);
  const members = await guild.members.fetch().catch((error) => {
    throw Object.assign(new Error('A dinamikus BELV-állomány lekéréséhez a Discord szervertaglista-hozzáférés szükséges. ' + (error?.message || '')), { status: 403 });
  });
  const ranked = [], rankByUser = new Map(), failed = [], updated = [], unchanged = [], skipped = [], inactive = [];
  for (const member of members.values()) {
    if (member.user?.bot) continue;
    const rank = rankForMember(member, roleMap);
    if (rank) { ranked.push({ member, rank }); rankByUser.set(String(member.id), rank); }
  }
  ranked.sort((a, b) => a.member.id.localeCompare(b.member.id));
  const occupied = new Map(rows.filter((row) => rankByUser.has(String(row.user_id))).map((row) => [Number(row.badge), String(row.user_id)]));
  await query('UPDATE nexabot_belv_roster_badges SET active=FALSE WHERE guild_id=$1', [guild.id]);
  const activeEntries = [], writes = [];
  for (const { member, rank } of ranked) {
    const previous = previousByUser.get(String(member.id));
    let badgeNumber = null;
    if (previous && Number(previous.badge) >= rank.min && Number(previous.badge) <= rank.max && occupied.get(Number(previous.badge)) === String(member.id)) badgeNumber = Number(previous.badge);
    else {
      if (previous && occupied.get(Number(previous.badge)) === String(member.id)) occupied.delete(Number(previous.badge));
      if (rank.exactBadge && !occupied.has(Number(rank.badge.slice(3))) && Number(rank.badge.slice(3)) >= rank.min && Number(rank.badge.slice(3)) <= rank.max) badgeNumber = Number(rank.badge.slice(3));
      if (badgeNumber == null) for (let candidate = rank.min; candidate <= rank.max; candidate += 1) if (!occupied.has(candidate)) { badgeNumber = candidate; break; }
    }
    if (badgeNumber == null) { failed.push({ id: member.id, reason: 'a jelenlegi rendfokozati tartományban nincs szabad jelvényszám' }); continue; }
    occupied.set(badgeNumber, String(member.id));
    const badge = 'BV-' + String(badgeNumber).padStart(2, '0');
    const entry = { id: member.id, rank: rank.rank, nickRank: rank.nickRank, badge, group: rank.group };
    activeEntries.push(entry);
    writes.push([guild.id, member.id, badgeNumber, rank.rank, rank.nickRank, rank.group, rank.min, rank.max, rank.roleId]);
    if (isBotOwner(member.id) || BELV_NICKNAME_EXEMPT_USER_IDS.has(member.id)) { skipped.push(member.id); continue; }
    if (!bot.permissions.has(PermissionFlagsBits.ManageNicknames)) { failed.push({ id: member.id, reason: 'a botnak nincs Becenevek kezelése jogosultsága; az állománylista ettől még frissült' }); continue; }
    if (member.id === guild.ownerId || bot.roles.highest.comparePositionTo(member.roles.highest) <= 0) { failed.push({ id: member.id, reason: 'a bot szerepköre nem jogosult a becenév módosítására' }); continue; }
    const nickname = belvNickname(member, entry, previous);
    if (member.nickname === nickname) { unchanged.push(member.id); continue; }
    try { await member.setNickname(nickname, 'Belv hivatalos állományfrissítés • ' + badge + ' • ' + actorId); updated.push(member.id); }
    catch (error) { failed.push({ id: member.id, reason: error?.message || 'Discord elutasította a becenév módosítását' }); }
  }
  for (let offset = 0; offset < writes.length; offset += 50) {
    const chunk = writes.slice(offset, offset + 50), values = [], valueSql = [];
    for (const write of chunk) {
      const base = values.length;
      values.push(...write);
      valueSql.push('($' + (base+1) + ',$' + (base+2) + ',$' + (base+3) + ',$' + (base+4) + ',$' + (base+5) + ',$' + (base+6) + ',$' + (base+7) + ',$' + (base+8) + ',$' + (base+9) + ',TRUE,NOW())');
    }
    await query('INSERT INTO nexabot_belv_roster_badges(guild_id,user_id,badge,rank_name,nick_rank,group_name,range_min,range_max,role_id,active,updated_at) VALUES ' + valueSql.join(',') + ' ON CONFLICT(guild_id,user_id) DO UPDATE SET badge=EXCLUDED.badge,rank_name=EXCLUDED.rank_name,nick_rank=EXCLUDED.nick_rank,group_name=EXCLUDED.group_name,range_min=EXCLUDED.range_min,range_max=EXCLUDED.range_max,role_id=EXCLUDED.role_id,active=TRUE,updated_at=NOW()', values);
  }
  for (const member of members.values()) {
    if (member.user?.bot || rankByUser.has(String(member.id)) || isBotOwner(member.id) || BELV_NICKNAME_EXEMPT_USER_IDS.has(member.id)) continue;
    const previous = previousByUser.get(String(member.id));
    if (!previous) continue;
    inactive.push(member.id);
    if (!bot.permissions.has(PermissionFlagsBits.ManageNicknames) || member.id === guild.ownerId || bot.roles.highest.comparePositionTo(member.roles.highest) <= 0) continue;
    const oldBadge = 'BV-' + String(previous.badge).padStart(2, '0');
    const sourceName = member.nickname || member.user.globalName || member.user.username;
    const cleaned = stripManagedNickname(sourceName, previous.nick_rank, oldBadge);
    if (cleaned === String(sourceName || '').trim()) continue;
    try { await member.setNickname(cleaned.slice(0, 32), 'Belv rang megszűnt; a NEXA által kezelt rangrészt eltávolította'); }
    catch (error) { failed.push({ id: member.id, reason: error?.message || 'A korábbi BELV-névrészt nem sikerült eltávolítani' }); }
  }
  const payload = { embeds: [belvRosterEmbed(activeEntries)], allowedMentions: { parse: [] } };
  const rosterMessage = prior ? await prior.edit(payload) : await channel.send(payload);
  const canDeleteLegacy = Boolean(legacy && channel.permissionsFor(bot)?.has(PermissionFlagsBits.ManageMessages, true));
  const oldMessageRemoved = canDeleteLegacy ? await legacy.delete('NEXA: régi kézi Belv állománylista lecserélése').then(() => true).catch(() => false) : false;
  await recordAudit('belv_roster_synced', { guildId: guild.id, actorId, targetId: rosterMessage.id, metadata: { updated: updated.length, unchanged: unchanged.length, skipped, failed: failed.map((item) => item.id), members: activeEntries.length, inactive: inactive.length } }).catch((error) => recordError(error, { command: 'belv_roster_audit', guildId: guild.id, userId: actorId }));
  return { channel, rosterMessage, updated, unchanged, skipped, inactive, activeRoster: activeEntries, missing: [], failed, total: activeEntries.length, oldMessageRemoved, legacyMessageKept: Boolean(legacy && !canDeleteLegacy) };
}
async function syncBelvRoster(guild, actorId, botUserId) {
  if (belvRosterLocks.has(guild?.id)) fail(409, 'Az állomány frissítése már folyamatban van. Várd meg az eredményt.');
  belvRosterLocks.add(guild?.id);
  try { return await syncBelvRosterUnlocked(guild, actorId, botUserId); }
  finally { belvRosterLocks.delete(guild?.id); }
}
function startBelvRosterMonitor(client) {
  if (!client || belvRosterMonitorClients.has(client)) return false;
  belvRosterMonitorClients.add(client);
  let pending = null, running = false;
  const notifyOwner = async (guild, message) => {
    if (!guild) return;
    const now = Date.now(), last = belvRosterNoticeAt.get(guild.id) || 0;
    if (now - last < 30 * 60 * 1000) return;
    belvRosterNoticeAt.set(guild.id, now);
    const owner = await guild.fetchOwner().catch(() => null);
    await owner?.send(`🏛️ **Belv állományfigyelő**\n${message}`).catch(() => null);
  };
  const run = async (reason) => {
    if (running) return;
    running = true;
    try {
      const guild = client.guilds.cache.get(BELV_GUILD_ID);
      if (!guild) return;
      const result = await syncBelvRoster(guild, client.user.id, client.user.id);
      const blocked = result.failed.filter((item) => item.reason.includes('szerepköre nem jogosult'));
      if (blocked.length) await notifyOwner(guild, `A rangsorrend miatt **${blocked.length}** tagnál nem tudtam becenevet frissíteni. Tedd a bot rangját az érintett tagok rangjai fölé, és ellenőrizd a „Becenevek kezelése” jogosultságot. A következő ellenőrzés automatikusan újrapróbálja.`);
    } catch (error) {
      await recordError(error, { command: 'belv_roster_monitor', guildId: BELV_GUILD_ID, reason }).catch(() => null);
      await notifyOwner(client.guilds.cache.get(BELV_GUILD_ID), 'Az automatikus állományfrissítés nem sikerült. Ellenőrizd az állományi-nyilvántartás csatornát és a bot jogosultságait. A bot később újra próbálja.');
    } finally { running = false; }
  };
  const schedule = (reason) => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => { pending = null; run(reason); }, 5000);
    pending.unref?.();
  };
  client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (newMember.guild?.id !== BELV_GUILD_ID) return;
    const rolesChanged = oldMember.roles.cache.size !== newMember.roles.cache.size
      || [...oldMember.roles.cache.keys()].some((id) => !newMember.roles.cache.has(id));
    if (rolesChanged) schedule('member-rank-change');
  });
  client.on('guildMemberRemove', (member) => {
    if (member.guild?.id === BELV_GUILD_ID) schedule('member-left');
  });
  client.on('guildMemberAdd', (member) => { if (member.guild?.id === BELV_GUILD_ID) schedule('member-joined'); });
  client.on('guildRoleUpdate', (_oldRole, newRole) => { if (newRole.guild?.id === BELV_GUILD_ID) schedule('role-position-change'); });
  client.on('guildRoleCreate', (role) => { if (role.guild?.id === BELV_GUILD_ID) schedule('role-created'); });
  client.on('guildRoleDelete', (role) => { if (role.guild?.id === BELV_GUILD_ID) schedule('role-deleted'); });
  if (client.guilds.cache.has(BELV_GUILD_ID)) schedule('startup-reconcile');
  const interval = setInterval(() => schedule('periodic-reconcile'), 15 * 60 * 1000);
  interval.unref?.();
  return true;
}

function buildMdtCommand(guildId = null) {
  const command = new SlashCommandBuilder().setName('mdt').setDescription('NEXA MDT • személyes belépés és nyilvántartás.').setDMPermission(false).setDefaultMemberPermissions(null)
    .addSubcommand((sub) => sub.setName('belepes').setDescription('Személyes, egyszer használható MDT-belépőkód.'))
    .addSubcommand((sub) => sub.setName('script').setDescription('Saját egysoros loadstring betöltőkód a Roblox MDT-hez.'))
    .addSubcommand((sub) => sub.setName('kijelentkezes').setDescription('A saját MDT-munkamenetek visszavonása.'))
    .addSubcommand((sub) => sub.setName('telepites').setDescription('Csak a hiányzó MDT-szobák létrehozása; meglévőhöz nem nyúl.'))
    .addSubcommand((sub) => sub.setName('allapot').setDescription('MDT állapot; beállítások az Owner Centerben.'));
  return command;
}
function buildBelvRosterCommand() {
  return new SlashCommandBuilder().setName('allomany').setDescription('Belv hivatalos állományi nyilvántartása és jelvényszámai.')
    .setDMPermission(false).setDefaultMemberPermissions(null)
    .addSubcommand((sub) => sub.setName('frissites').setDescription('BV-jelvényszámok, becenevek és a Belv állományi nyilvántartás frissítése.'));
}
async function handleBelvRosterCommand(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    if (!interaction.guild || interaction.guildId !== BELV_GUILD_ID) fail(403, 'Ez a parancs kizárólag a Belvédelmi Igazgatóság Discord-szerverén használható.');
    const member = await freshMember(interaction.guild, interaction.user.id);
    if (!member || member.id !== interaction.guild.ownerId && !isBotOwner(member.id)) fail(403, 'Az állományi nyilvántartást csak a Belv szerver tulajdonosa vagy a NEXA fő ownere frissítheti.');
    const result = await syncBelvRoster(interaction.guild, member.id, interaction.client.user.id);
    const errors = result.failed.length ? `\n**Nem módosult:** ${result.failed.map((entry) => `<@${entry.id}> — ${entry.reason}`).join('\n').slice(0, 900)}` : '';
    const missing = result.missing.length ? `\n**Nem található a szerveren:** ${result.missing.map((id) => `<@${id}>`).join(', ')}` : '';
    return interaction.editReply(`✅ **Belv állomány frissítve**\nCsatorna: ${result.channel}\nNyilvántartás: ${result.rosterMessage.url}\nAktív tag a listában: **${result.total}** · rang nélkül kikerült: **${result.inactive.length}**\nBecenév módosítva: **${result.updated.length}** · már megfelelő: **${result.unchanged.length}** · további kihagyva: **${result.skipped.length - result.inactive.length}**${result.oldMessageRemoved ? '\nA régi kézi nyilvántartás lecserélve.' : ''}${missing}${errors}\n\nA rang változását a bot automatikusan figyeli; a nyilvántartást néhány másodpercen belül, újraindulás után és időszakos ellenőrzéssel is frissíti.`);
  } catch (error) {
    if (!error.status) await recordError(error, { command: 'belv_roster_sync', guildId: interaction.guildId, userId: interaction.user.id }).catch(() => {});
    return interaction.editReply(`❌ ${error.status ? error.message : 'Az állományi frissítés nem sikerült. Ellenőrizd a bot naplóját.'}`);
  }
}
async function syncMdtGuildCommand(guild) {
  if (!guild?.commands) return;
  await require('./belv-oral-exam').syncGuildCommand(guild);
  const allowed = await belvGuildId();
  const commands = await guild.commands.fetch(), existing = [...commands.values()].find((command) => command.name === 'mdt');
  const rosterCommand = [...commands.values()].find((command) => command.name === 'allomany');
  const disciplineCommand = [...commands.values()].find((command) => command.name === 'belv-rendszer');
  if (!findFaction(guild.id)) {
    if (existing) await existing.delete();
    if (rosterCommand) await rosterCommand.delete();
    if (disciplineCommand) await disciplineCommand.delete();
    return;
  }
  const settings = await getSettings(guild.id);
  // The owner-gated installation subcommand remains available in allowed guilds.
  const payload = buildMdtCommand(guild.id).toJSON();
  if (existing) await existing.edit(payload); else await guild.commands.create(payload);
  if (guild.id === BELV_GUILD_ID) {
    const rosterPayload = buildBelvRosterCommand().toJSON();
    if (rosterCommand) await rosterCommand.edit(rosterPayload); else await guild.commands.create(rosterPayload);
  } else if (rosterCommand) {
    await rosterCommand.delete();
  }
  if (guild.id === BELV_GUILD_ID) {
    const payload = require('./belv-discipline').buildCommand().toJSON();
    if (disciplineCommand) await disciplineCommand.edit(payload); else await guild.commands.create(payload);
  } else if (disciplineCommand) {
    await disciplineCommand.delete();
  }
}
async function syncMdtGuildCommands(client) {
  const result = { synced: [], failed: [] };
  for (const guild of client.guilds.cache.values()) {
    try { await syncMdtGuildCommand(guild); result.synced.push(guild.id); }
    catch (error) {
      result.failed.push(guild.id);
      await recordError(error, { command: 'mdt_guild_registration', guildId: guild.id }).catch(() => {});
    }
  }
  return result;
}
async function inspectMdtMemberAccess(guild, actorId, discordId) {
  if (!isBotOwner(actorId)) fail(403, 'A tagok MDT-hozzáférését csak a fő botowner ellenőrizheti.');
  if (!sid(discordId)) fail(400, 'Érvényes Discord-ID-t adj meg az ellenőrzéshez.');
  await requireBelvGuild(guild.id);
  const settings = await getSettings(guild.id), member = await freshMember(guild, discordId), checks = [];
  checks.push({ key: 'enabled', label: 'NEXA MDT bekapcsolva', ok: settings.enabled === true, detail: settings.enabled ? 'A frakcióhoz kötött MDT aktív.' : 'Az Owner Centerben kapcsold be az MDT-t.' });
  checks.push({ key: 'membership', label: 'Discord-tagság', ok: Boolean(member && !member.user?.bot), detail: member ? (member.displayName || member.user?.username || discordId) : 'A Discord-tagság nem igazolható.' });
  const ids = robloxIdsFor(settings, discordId);
  checks.push({ key: 'pair', label: 'Saját Discord–Roblox párosítás', ok: ids.length > 0, detail: ids.join(', ') || 'Ez a Discord-ID nincs saját Roblox-ID-vel felvéve.' });
  let accessError = null;
  try { if (!member) fail(403, 'A tagnak a Belv Discordon kell lennie.'); assertAccess(guild, member, settings); }
  catch (error) { accessError = error.status ? error.message : 'A személyes hozzáférés nem ellenőrizhető.'; }
  checks.push({ key: 'code', label: 'Személyes belépőkód kérhető', ok: !accessError && ids.length > 0, detail: accessError || (ids.length ? 'Saját kódot kérhet; az ellenőrzés nem készít belépőkódot.' : 'Előbb add hozzá a saját Roblox-ID-t.') });
  let command = null, commandFetchFailed = false;
  try { command = [...(await guild.commands.fetch()).values()].find((item) => item.name === 'mdt'); }
  catch (_error) { commandFetchFailed = true; }
  checks.push({ key: 'command', label: '/mdt regisztrálva a Belvhez', ok: Boolean(command), detail: commandFetchFailed ? 'A Discord-parancslista lekérése sikertelen; ismételd meg az ellenőrzést.' : command ? 'A Discord aktuális szerveres parancslistájában szerepel.' : 'A Discord-nézet és MDT-gombok frissítése újra regisztrálja.' });
  const defaults = command?.defaultMemberPermissions, bits = defaults?.bitfield;
  const defaultAllows = Boolean(command && member && (has(member, PermissionFlagsBits.Administrator) || defaults == null || (String(bits) !== '0' && member.permissions.has(defaults))));
  checks.push({ key: 'defaults', label: 'Parancs alapjogosultsága', ok: command ? defaultAllows : false, detail: !command ? 'Nincs regisztrált MDT-parancs.' : defaults == null ? 'Nincs adminokra korlátozva.' : `Discord-jogbit: ${String(bits)}. A Discord-nézet frissítésével az MDT alapkorlátozása megszűnik.` });
  const hub = textChannel(guild, settings.discordChannelIds?.hub), permissions = member && hub ? hub.permissionsFor(member) : null;
  checks.push({ key: 'hub', label: 'MDT-központ látható', ok: Boolean(permissions?.has(PermissionFlagsBits.ViewChannel)), detail: hub ? `#${hub.name}` : 'Nincs MDT-központ; hozd létre a hiányzó MDT-szobákat.' });
  checks.push({ key: 'application', label: 'Alkalmazásparancs használható a központban', ok: Boolean(permissions?.has(PermissionFlagsBits.ViewChannel) && permissions.has(PermissionFlagsBits.UseApplicationCommands)), detail: 'A felvett tag a központban külön jogot kap. Frissítsd a Discord-nézetet, ha ez piros.' });
  const relevant = [];
  if (command && member) {
    try {
      const all = await guild.commands.permissions.fetch(), applicationId = guild.client?.application?.id || process.env.CLIENT_ID;
      const roleIds = new Set([guild.id, ...member.roles.cache.keys()]);
      const channelIds = new Set([hub?.id, (BigInt(guild.id) - 1n).toString()]);
      for (const [id, entries] of all) {
        if (id !== command.id && id !== applicationId) continue;
        for (const entry of entries) {
          const type = Number(entry.type) || ({ ROLE: 1, USER: 2, CHANNEL: 3 }[String(entry.type).toUpperCase()]);
          if (!(type === 1 && roleIds.has(entry.id) || type === 2 && entry.id === discordId || type === 3 && channelIds.has(entry.id))) continue;
          relevant.push(`${id === command.id ? '/mdt' : 'NEXA'} • ${type === 1 ? 'rang' : type === 2 ? 'tag' : 'csatorna'} ${entry.id}: ${entry.permission ? 'engedély' : 'tiltás'}`);
        }
      }
      checks.push({ key: 'integration', label: 'Integrációs parancsszabályok', ok: relevant.some((text) => text.endsWith('tiltás')) ? null : true, detail: relevant.length ? `${relevant.slice(0, 30).join(' | ')}. A szabályok együtt érvényesülnek; a tiltás felülbírálható. Ellenőrzés: Szerverbeállítások → Integrációk → NEXA → /mdt.` : 'Nincs a tagot vagy az MDT-központot érintő egyedi parancsszabály.' });
    } catch (_error) {
      checks.push({ key: 'integration', label: 'Integrációs parancsszabályok', ok: null, detail: 'A Discord integrációs szabályait nem sikerült lekérni. Ellenőrizd: Szerverbeállítások → Integrációk → NEXA → /mdt.' });
    }
  }
  return { discordId, checks };
}
async function handleMdtCommand(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    if (!interaction.guild) fail(400, 'Ezt Discord-szerveren használd.');
    requireDatabase();
    const guild = interaction.guild;
    const member = await freshMember(guild, interaction.user.id);
    if (!member) fail(403, 'A Discord-tagságod nem ellenőrizhető.');
    const action = interaction.options.getSubcommand();
    const settings = await getSettings(guild.id);
    await requireBelvGuild(guild.id);
    if (action === 'script') {
      assertAccess(guild, member, settings);
      const { getMdtLoaderCommand } = require('./mdt-loader');
      const loader = await getMdtLoaderCommand(guild.id, member.id, dashboardUrl());
      return interaction.editReply(`**Saját NEXA MDT betöltőkód**\nMásold ezt az egy sort a kliensbe:\n\`\`\`lua\n${loader.code}\n\`\`\`\nA panelhez külön személyes belépőkód kell: \`/mdt belepes\`. A betöltőlink önmagában nem ad irathozzáférést. F6: panel nyitása / elrejtése.`);
    }
    if (action === 'telepites') {
      const result = await require('./mdt-network-routing').activateGroup({user:{id:member.id},primary:isBotOwner(member.id)},guild,{createMissing:true});
      const { syncMdtDiscord } = require('./mdt-discord');
      await syncMdtDiscord(guild, member.id);
      return interaction.editReply(`✅ NEXA MDT bekapcsolva. **${result.created.length} új elem** létrehozva, **${(result.reused||[]).length} meglévő csatorna** újra használva.\nA célcsatornákban az MDT olvasási jogait és a központ parancshasználati jogát frissítette; más csatornanevet, témát vagy üzenetet nem módosított.\nScript: ${dashboardUrl().replace(/\/dashboard\/?$/, '')}/owner/mdt/${guild.id}/script\nBelépés: \`/mdt belepes\``);
    }
    if (action === 'kijelentkezes') {
      assertAccess(guild, member, settings);
      await query('DELETE FROM nexabot_mdt_sessions WHERE guild_id=$1 AND user_id=$2', [guild.id, member.id]);
      await query('DELETE FROM nexabot_mdt_codes WHERE guild_id=$1 AND user_id=$2', [guild.id, member.id]);
      return interaction.editReply('🔒 A saját MDT-belépőkódjaid és munkameneteid visszavonva.');
    }
    if (action === 'allapot') {
      if (!admin(member) && !isMdtStaff(member, settings)) assertAccess(guild, member, settings);
      return interaction.editReply(`**NEXA MDT • Műveleti állapot**\n**Rendszer:** ${settings.enabled ? 'bekapcsolva' : 'kikapcsolva'}\n**Saját hozzáférés:** ${admin(member) ? 'fő owner' : robloxIdsFor(settings, member.id).length ? 'MDT-ügyintéző' : 'Belv állomány • Discord-olvasó'}\n**Saját Roblox-ID:** ${robloxIdsFor(settings, member.id).join(', ') || 'nincs felvéve'}\n${admin(member) ? `**MDT-tagok:** ${(settings.members || []).length}\n**Owner Center:** ${dashboardUrl().replace(/\/dashboard\/?$/, '')}/owner/mdt/${guild.id}\n` : ''}Saját script: \`/mdt script\` • személyes kód: \`/mdt belepes\``);
    }
    if (action === 'belepes') {
      const root = dashboardUrl().replace(/\/dashboard\/?$/, '');
      if (!root.startsWith('https://')) fail(409, 'A bot PUBLIC_URL vagy RENDER_EXTERNAL_URL értéke HTTPS-webcím legyen.');
      const code = await issueCode(guild, member);
      return interaction.editReply(`**NEXA MDT • Személyes belépés**\n**Ügyintéző:** ${member.displayName || member.user.username}\n**Saját Roblox-ID:** ${robloxIdsFor(settings, member.id).join(', ')}\n**NEXA webcím:** ${root}\n**Egyszeri kód:** \`${code}\`\n\nA kód **${bounded(settings.codeMinutes,10,2,10)} percig**, egyszer használható, és a saját Discord–Roblox fiókpárodhoz tartozik. Script: \`/mdt script\` • kijelentkezés: \`/mdt kijelentkezes\`. Ezt a kódot tartsd magadnál.`);
    }
    fail(400, 'Ismeretlen MDT-parancs.');
  } catch (error) {
    if (!error.status) await recordError(error, { command: 'mdt_slash', guildId: interaction.guildId, userId: interaction.user.id });
    return interaction.editReply(`❌ ${error.status ? error.message : 'Az MDT átmenetileg nem érhető el. Ellenőrizd a bot naplóját.'}`);
  }
}
async function handleMdtReviewModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const match = String(interaction.customId).match(/^mdt_review:(approve|reject):(\d{1,20}):(\d{1,10})$/);
    if (!match || !interaction.guild) fail(400, 'Érvénytelen MDT-bírálat.');
    const guild = interaction.guild, member = await freshMember(guild, interaction.user.id), settings = await getSettings(guild.id);
    assertAccess(guild, member, settings);
    const ctx = { guild, member, settings };
    const revision = Number(match[3]) || (await getRecord(ctx, match[2])).revision;
    const result = await mutateRecord(ctx, match[2], { revision, decision: match[1], reason: interaction.fields.getTextInputValue('reason') }, 'review');
    return interaction.editReply(result.warning || `✅ MDT #${match[2]}: ${statusLabel(result.row.status)}.`);
  } catch (error) { return interaction.editReply(`❌ ${error.status ? error.message : 'A bírálat mentése nem sikerült.'}`); }
}
async function handleMdtButton(interaction) {
  const review = String(interaction.customId || '').match(/^mdt_(approve|reject):(\d{1,20})(?::(\d{1,10}))?$/);
  if (review) {
    const modal = new ModalBuilder().setCustomId(`mdt_review:${review[1]}:${review[2]}:${review[3] || '0'}`).setTitle(review[1] === 'reject' ? 'MDT • Elutasítás indoka' : 'MDT • Jóváhagyás');
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Bírálati indok / megjegyzés').setStyle(TextInputStyle.Paragraph).setRequired(review[1] === 'reject').setMaxLength(300)));
    return interaction.showModal(modal);
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    requireDatabase();
    const hub = interaction.customId.match(/^mdt_hub:(belepes|script|allapot|kijelentkezes)$/);
    if (hub) {
      // A parancskezelő a saját privát válaszát és ugyanazokat a jogosultságokat használja.
      return handleMdtCommand({ guild: interaction.guild, guildId: interaction.guildId, user: interaction.user, options: { getSubcommand: () => hub[1] }, deferReply: async () => {}, editReply: (payload) => interaction.editReply(payload) });
    }
    const match = interaction.customId.match(/^mdt_(view|approve|reject|archive):(\d{1,20})$/);
    if (!match || !interaction.guild) fail(400, 'Érvénytelen MDT-gomb.');
    const guild = interaction.guild, member = await freshMember(guild, interaction.user.id), settings = await getSettings(guild.id);
    assertAccess(guild, member, settings);
    const ctx = { guild, member, settings };
    const row = await getRecord(ctx, match[2]);
    if (match[1] === 'view') return interaction.editReply({ embeds: [recordEmbed(row, definition(ctx, row.template_key))] });
    const action = match[1] === 'archive' ? 'archive' : 'review';
    const result = await mutateRecord(ctx, row.id, { revision: row.revision, decision: match[1], reason: match[1] === 'reject' ? 'Elutasítva a vezető Discord-gombjával.' : '' }, action);
    return interaction.editReply(result.warning || `✅ MDT #${row.id}: ${statusLabel(result.row.status)}.`);
  } catch (error) {
    if (!error.status) await recordError(error, { command: 'mdt_button', guildId: interaction.guildId, userId: interaction.user.id });
    return interaction.editReply(`❌ ${error.status ? error.message : 'Az MDT-művelet nem sikerült.'}`);
  }
}
module.exports = { recordHistory, mdtSummary, exportMdtRecords, mdtCsv, handleMdtReviewModal, BELV_GUILD_ID, PREFIX, TYPES, MDT_CHANNELS, MDT_CATEGORY, MdtError, buildMdtCommand, buildBelvRosterCommand, handleBelvRosterCommand, syncBelvRoster, startBelvRosterMonitor, handleMdtApi, handleMdtCommand, handleMdtButton, definitions, cleanFields, createRecord, mutateRecord, getRecord, syncRecord, issueCode, login, authorize, getSettings, publicRecord, saveMdtOwnerConfig, provisionMdtOwnerChannels, revokeMdtOwnerSessions, updateMdtMember, robloxIdsFor, allRobloxIds, assertAccess, requireBelvGuild, isMdtStaff, textChannel, writable, syncMdtGuildCommand, syncMdtGuildCommands, inspectMdtMemberAccess };

module.exports.isMdtReviewer=leader;
