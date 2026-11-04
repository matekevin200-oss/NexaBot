'use strict';

const {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const { dbQuery, getGuildConfig, setGuildConfig, isPersistentStore } = require('./config');
const { normalizeName, customDocumentTypes, documentPanel } = require('./documents');
const { classifyBelvRole, configuredRankRoleMap } = require('./belv-roster-rules');
const { recordAudit, recordError } = require('./telemetry');

const BELV_GUILD_ID = '1517509643734221030';
const CATEGORY_NAME = '🕵️┃BOMO • OPERATÍV OSZTÁLY';
const SETUP_COMMAND = 'bomo-setup';
const MAX_INSTALL_ATTEMPTS = 5;
const LEADERSHIP_ROLE_NAMES = Object.freeze([
  'BOMO Parancsnok',
  'BOMO Parancsnokhelyettes',
  'BOMO Vezető Operatív Tiszt'
]);
const ROLE_SPECS = Object.freeze([
  { key: 'commander', name: 'BOMO Parancsnok', color: 0x8b1e2d },
  { key: 'deputy', name: 'BOMO Parancsnokhelyettes', color: 0xb33a42 },
  { key: 'lead_ops', name: 'BOMO Vezető Operatív Tiszt', color: 0x9a5b18 },
  { key: 'officer', name: 'BOMO Operatív Tiszt', color: 0x236b5a },
  { key: 'undercover', name: 'BOMO Fedett Ügynök', color: 0x34495e },
  { key: 'candidate', name: 'BOMO Jelölt', color: 0x68717a }
]);
const TEXT_CHANNELS = Object.freeze([
  { key: 'announcements', name: '📢┃bomo-közlemények', audience: 'all', writers: 'leadership', content: 'announcement' },
  { key: 'rules', name: '📜┃bomo-szabályzat', audience: 'all', writers: 'leadership', content: 'rules' },
  { key: 'roster', name: '👥┃bomo-állomány', audience: 'all', writers: 'leadership', content: 'roster' },
  { key: 'chat', name: '💬┃bomo-beszélgetés', audience: 'all', writers: 'all', content: 'chat' },
  { key: 'orders', name: '📋┃műveleti-utasítások', audience: 'staff', writers: 'leadership', content: 'orders' },
  { key: 'undercover_ops', name: '🕵️┃fedett-műveletek', audience: 'covert', writers: 'covert', content: 'undercover_ops' },
  { key: 'surveillance', name: '👁️┃megfigyelési-jelentések', audience: 'covert', writers: 'covert', content: 'surveillance' },
  { key: 'investigations', name: '🔎┃bomo-belső-vizsgálatok', audience: 'leadership', writers: 'leadership', content: 'investigations' },
  { key: 'case_files', name: '📁┃bomo-ügyiratok', audience: 'leadership', writers: 'leadership', content: 'case_files' },
  { key: 'evidence', name: '📸┃bizonyítékok', audience: 'covert', writers: 'covert', content: 'evidence' },
  { key: 'operation_reports', name: '📑┃műveleti-jelentések', audience: 'staff', writers: 'staff', content: 'operation_reports' },
  { key: 'leadership', name: '👑┃bomo-vezetőség', audience: 'leadership', writers: 'leadership', content: 'leadership' },
  { key: 'approvals', name: '✅┃jóváhagyások', audience: 'leadership', writers: 'leadership', content: 'approvals' },
  { key: 'statistics', name: '📊┃bomo-statisztikák', audience: 'leadership', writers: 'leadership', content: 'statistics' },
  { key: 'archive', name: '🗄️┃bomo-archívum', audience: 'leadership', writers: 'leadership', content: 'archive' }
]);
const VOICE_CHANNELS = Object.freeze([
  { key: 'radio', name: '🔊┃bomo-rádió', audience: 'staff', type: 'voice' },
  { key: 'ops_radio', name: '🔒┃operatív-rádió', audience: 'covert', type: 'voice' }
]);
const ALL_CHANNELS = Object.freeze([...TEXT_CHANNELS, ...VOICE_CHANNELS]);
const REUSE_EXISTING_CHANNEL_KEYS = new Set();
const FORM_SPECS = Object.freeze([
  {
    key: 'custom_bomo_operation',
    title: 'Fedett műveleti kérelem',
    emoji: '🕵️',
    channel: 'undercover_ops',
    approvalChannel: 'approvals',
    approval: true,
    access: 'staff',
    fields: [
      { id: 'operation', label: 'Művelet neve', placeholder: 'A tervezett RP-művelet rövid neve', required: true, style: 'short', maxLength: 100 },
      { id: 'purpose', label: 'Művelet célja', placeholder: 'A szerveren belüli RP-cél', required: true, style: 'short', maxLength: 180 },
      { id: 'participants', label: 'Résztvevők', placeholder: 'BOMO-tagok és szerepkörük', required: true, style: 'short', maxLength: 300 },
      { id: 'scheduled', label: 'Tervezett időpont', placeholder: 'Dátum, időpont és RP-időzóna', required: true, style: 'short', maxLength: 120 },
      { id: 'plan', label: 'Részletes műveleti terv', placeholder: 'Lépések, felelősök, megszakítási feltételek', required: true, style: 'paragraph', maxLength: 1000 }
    ]
  },
  {
    key: 'custom_bomo_observation',
    title: 'Megfigyelési jelentés',
    emoji: '👁️',
    channel: 'surveillance',
    approvalChannel: null,
    approval: false,
    access: 'covert',
    fields: [
      { id: 'observer', label: 'Megfigyelő neve', placeholder: 'BOMO-tag neve és szolgálati azonosítója', required: true, style: 'short', maxLength: 120 },
      { id: 'time_place', label: 'Időpont és helyszín', placeholder: 'RP-dátum, időpont és helyszín', required: true, style: 'short', maxLength: 180 },
      { id: 'case_number', label: 'Kapcsolódó ügyazonosító', placeholder: 'BOMO-... vagy nincs', required: true, style: 'short', maxLength: 80 },
      { id: 'details', label: 'Megfigyelés részletei', placeholder: 'Kizárólag a szerveren történt RP-események', required: true, style: 'paragraph', maxLength: 1000 },
      { id: 'evidence', label: 'Bizonyítékok', placeholder: 'RP-képek, videók, Discord-üzenet hivatkozása', required: false, style: 'paragraph', maxLength: 1000 }
    ]
  },
  {
    key: 'custom_bomo_investigation',
    title: 'Belső vizsgálat indítása',
    emoji: '🔎',
    channel: 'investigations',
    approvalChannel: 'approvals',
    approval: true,
    access: 'leadership',
    fields: [
      { id: 'subject', label: 'Érintett személy', placeholder: 'Név és szerveres azonosító', required: true, style: 'short', maxLength: 160 },
      { id: 'faction', label: 'Érintett frakció', placeholder: 'BELV vagy más RP-frakció', required: true, style: 'short', maxLength: 100 },
      { id: 'reason', label: 'Vizsgálat indoka', placeholder: 'A szerveren történt RP-esemény és a vizsgálat oka', required: true, style: 'paragraph', maxLength: 1000 },
      { id: 'evidence', label: 'Rendelkezésre álló bizonyítékok', placeholder: 'RP-bizonyítékok és hivatkozásaik', required: true, style: 'paragraph', maxLength: 1000 },
      { id: 'requested_action', label: 'Kért intézkedés', placeholder: 'Javasolt RP-intézkedés vagy vizsgálati lépés', required: true, style: 'paragraph', maxLength: 800 }
    ]
  },
  {
    key: 'custom_bomo_report',
    title: 'Műveleti zárójelentés',
    emoji: '📑',
    channel: 'operation_reports',
    approvalChannel: null,
    approval: false,
    access: 'staff',
    fields: [
      { id: 'operation_id', label: 'Műveleti azonosító', placeholder: 'BOMO-... műveleti ügyazonosító', required: true, style: 'short', maxLength: 80 },
      { id: 'executed_at', label: 'Végrehajtás időpontja', placeholder: 'Dátum és időpont', required: true, style: 'short', maxLength: 120 },
      { id: 'participants', label: 'Résztvevők', placeholder: 'Részt vevő BOMO-tagok', required: true, style: 'short', maxLength: 300 },
      { id: 'results', label: 'Eredmények', placeholder: 'RP-események eredménye és hivatkozások', required: true, style: 'paragraph', maxLength: 1000 },
      { id: 'conclusion', label: 'Záró megállapítások', placeholder: 'Tanulságok és további teendők', required: true, style: 'paragraph', maxLength: 800 }
    ]
  },

]);
const CONTENT = Object.freeze({
  announcement: {
    title: 'A BOMO megalakult',
    description: 'A Belvédelmi Operatív és Megfigyelő Osztály létrejött a BELV szerveres RP-feladatainak támogatására.',
    fields: [
      ['Feladat', 'A BELV vezetése által engedélyezett, szerveren belüli RP-műveletek koordinálása és dokumentálása.'],
      ['Felügyelet', 'A BOMO a BELV vezetése alatt működik. Művelet csak a megfelelő vezetői jóváhagyással indulhat.'],
      ['Működés', 'A hozzáféréseket a BOMO szerepkörei és az adott csatorna jogosultságai határozzák meg.']
    ]
  },
  rules: {
    title: 'BOMO szolgálati szabályzat',
    description: 'A szabályzat kizárólag a BELV Discord-szerverén és az RP-játékban végzett tevékenységre vonatkozik.',
    fields: [
      ['Feladatok és hatáskör', 'A BOMO a BELV vezetése által kijelölt RP-műveleteket tervezi, koordinálja és dokumentálja. A BOMO nem lépheti túl a BELV által átadott RP-hatáskört.'],
      ['Fedett RP-műveletek', 'Fedett műveletet csak a jóváhagyási csatornában elfogadott kérelem alapján szabad megkezdeni. A tervben szerepeljen a cél, a résztvevő, a felelős, a tervezett idő és a megszakítás feltétele.'],
      ['Titoktartás', 'A műveleti információ csak a feladathoz kijelölt BOMO-tagokkal osztható meg. Képernyőképet, videót és ügyiratot kizárólag a megfelelő privát csatornába tölts fel.'],
      ['Jelentési kötelezettség', 'Minden jóváhagyott művelet után készüljön zárójelentés. A jelentés különítse el a megfigyelt RP-tényt, a következtetést és a javasolt intézkedést.'],
      ['BELV–BOMO feladatmegosztás', 'A BOMO végrehajtási és vizsgálati javaslatokat készít. A végleges szervezeti döntés és a fegyelmi intézkedés a BELV illetékes vezetőjénél marad.'],
      ['Fegyelmi rendelkezések', 'Jogosulatlan hozzáférés, adatszivárogtatás, hamis jelentés vagy engedély nélküli művelet vezetői felülvizsgálatot és a BELV szabályai szerinti RP-következményt vonhat maga után.'],
      ['Biztonsági korlát', 'A megfigyelés kizárólag szerveren belüli RP-eseményekre vonatkozhat. Tilos valós személyek titkos megfigyelése, privát üzenetek gyűjtése vagy Discordon kívüli tevékenység követése.']
    ]
  },
  roster: {
    title: 'BOMO állományi nyilvántartás',
    description: 'Az alábbi struktúra az állományi frissítésekhez használható. A telepítő nem rendel rangot és nem írja át senki meglévő szerveres szerepkörét.',
    fields: [
      ['Rangok', ROLE_SPECS.map((role, index) => String(index + 1) + '. ' + role.name).join('\n')],
      ['Státuszok', 'Aktív szolgálat • Szabadság • Képzés alatt • Inaktív'],
      ['Nyilvántartási mezők', 'Discord-tag • BOMO-rang • szolgálati azonosító • státusz • frissítés dátuma']
    ]
  },
  chat: {
    title: 'BOMO belső kommunikáció',
    description: 'A csatorna a BOMO feladatainak egyeztetésére szolgál. Ügyiratot, bizonyítékot és fedett műveleti részletet a kijelölt privát csatornában ossz meg.',
    fields: [['Kommunikáció', 'Maradj tárgyszerű, jelöld a felelőst és a határidőt. A szerveres RP-n kívüli adatot ne ossz meg.']]
  },
  orders: {
    title: 'Műveleti utasítás sablon',
    description: 'Vezetői feladatkiosztás; művelet csak az előírt jóváhagyások után indulhat.',
    fields: [
      ['Azonosító és cél', 'BOMO-ügyazonosító • feladat célja'],
      ['Felelősök', 'Kijelölt vezető • végrehajtók'],
      ['Idő és helyszín', 'RP-időpont • szerveres helyszín'],
      ['Korlátok', 'Engedélyezett lépések • megszakítási feltétel • jelentési határidő']
    ]
  },
  undercover_ops: {
    title: 'Fedett műveletek',
    description: 'A csatorna kizárólag a BOMO vezetői és a Fedett Ügynök szerepkörrel kijelölt tagok számára látható.',
    fields: [['Eljárás', 'A kérelem a jóváhagyások csatornára kerül. Jóváhagyás előtt műveletet indítani tilos.']]
  },
  surveillance: {
    title: 'Megfigyelési jelentések',
    description: 'Csak a szerveren belüli RP-események megfigyelése és dokumentálása engedélyezett.',
    fields: [['Jelentés', 'Használd a Megfigyelési jelentés gombot. Tényeket, időpontot, helyszínt és RP-bizonyítékot rögzíts.']]
  },
  investigations: {
    title: 'Belső vizsgálatok eljárásrendje',
    description: 'A vizsgálat dokumentált RP-alapból indul, vezetői jóváhagyást igényel, és pártatlan jelentéssel zárul.',
    fields: [
      ['Eljárás', 'Indítási kérelem → vezetői jóváhagyás → kijelölt vizsgáló → bizonyítékok áttekintése → jelentés → BELV-döntés.'],
      ['Bizonyíték', 'Csak a szerveren történt RP-eseményhez kapcsolódó bizonyíték használható. A következtetést különítsd el a ténytől.']
    ]
  },
  case_files: {
    title: 'BOMO ügyiratkezelés',
    description: 'Minden beadvány egyedi BOMO-azonosítót és naplóbejegyzést kap. Az ügyekhez kapcsolódó hivatkozásokat itt tartsd nyilván.',
    fields: [
      ['Ügyazonosító', 'BOMO-ÉÉÉÉHHNN-ÓÓPP-azonosító'],
      ['Hozzáférés', 'Az ügyiratokat kizárólag a BOMO-vezetőség és a BELV Főigazgató láthatja.']
    ]
  },
  evidence: {
    title: 'RP-bizonyítékok kezelése',
    description: 'Ide kizárólag BELV/BOMO szerveren vagy a hozzá kapcsolt RP-játékban keletkezett anyag tölthető fel.',
    fields: [
      ['Kötelező jelölés', 'BOMO-ügyszám • dátum/idő • beküldő • bizonyíték típusa'],
      ['Kezelés', 'Az eredeti fájlt ne szerkeszd át; a magyarázatot külön írd le. Privát vagy valós személyes adatot ne tölts fel.']
    ]
  },
  operation_reports: {
    title: 'Műveleti zárójelentések',
    description: 'A jóváhagyott művelet lezárásakor kötelező a végrehajtás és az eredmény rövid, ellenőrizhető dokumentálása.',
    fields: [['Jelentés', 'Használd a Műveleti zárójelentés gombot, és add meg a műveleti azonosítót.']]
  },
  leadership: {
    title: 'BOMO vezetőségi egyeztetés',
    description: 'Parancsnoki és vezető operatív egyeztetés. A döntéseket és felelősöket rögzítsd az ügyhöz.',
    fields: [['Felügyelet', 'A BOMO működését a BELV vezetése felügyeli; a BELV Főigazgató minden BOMO-csatornához hozzáfér.']]
  },
  approvals: {
    title: 'Vezetői jóváhagyások',
    description: 'Fedett műveleti és belső vizsgálati kérelmek elbírálása. A jogosultságot a NEXA szerveroldalon ellenőrzi.',
    fields: [['Döntési rend', 'Jóváhagyás • elutasítás kötelező indoklással. Saját kérelmet a beküldő nem hagyhat jóvá.']]
  },
  statistics: {
    title: 'BOMO statisztikák',
    description: 'Ügy- és műveleti adatok összesítése. A csatorna csak a BOMO vezetősége és a BELV Főigazgató számára látható.',
    fields: [['Adatkezelés', 'A NEXA az űrlapbeküldéseket és döntéseket adatbázisban naplózza; valós személyek követésére szolgáló adat nem gyűjthető.']]
  },
  archive: {
    title: 'Lezárt BOMO-ügyek archívuma',
    description: 'A lezárt ügyek hivatkozásait, végső státuszát és döntési naplóját őrizd meg.',
    fields: [['Megőrzés', 'Az eredeti ügyazonosítót ne használd újra. A csatorna tartalmát csak engedélyezett adminisztrátor kezelje.']]
  }
});
const locks = new Set();
const MARKER_PREFIX = 'NexaBot • BOMO telepítő • ';
const FORM_PANEL_PREFIX = 'NexaBot • Dokumentumpanel • ';

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function buildCommand() {
  return new SlashCommandBuilder()
    .setName(SETUP_COMMAND)
    .setDescription('A BELV BOMO Discord-rendszerének egyszeri telepítése.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

async function ensureSchema() {
  if (!isPersistentStore()) fail(503, 'A BOMO egyszeri telepítéséhez és ügyadatainak mentéséhez tartós PostgreSQL-adatbázis szükséges.');
  const statements = [
    'CREATE TABLE IF NOT EXISTS nexabot_bomo_installations (guild_id TEXT PRIMARY KEY,status TEXT NOT NULL DEFAULT \'installing\',installed_by TEXT,category_id TEXT,installed_at TIMESTAMPTZ,last_error TEXT,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    'ALTER TABLE nexabot_bomo_installations ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0',
    'CREATE TABLE IF NOT EXISTS nexabot_bomo_cases (id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,case_number TEXT NOT NULL,form_key TEXT NOT NULL,interaction_id TEXT NOT NULL,submitter_id TEXT NOT NULL,target_user_id TEXT,answers JSONB NOT NULL DEFAULT \'{}\'::jsonb,status TEXT NOT NULL DEFAULT \'pending_review\',review_channel_id TEXT,review_message_id TEXT,published_channel_id TEXT,published_message_id TEXT,decision_by TEXT,decision_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(guild_id,case_number),UNIQUE(guild_id,interaction_id))',
    'CREATE TABLE IF NOT EXISTS nexabot_bomo_case_audit (id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,case_number TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,details JSONB NOT NULL DEFAULT \'{}\'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    'INSERT INTO nexabot_schema_migrations(version,name) VALUES(27,\'bomo_discord_one_time_setup\') ON CONFLICT(version) DO NOTHING',
    'INSERT INTO nexabot_schema_migrations(version,name) VALUES(28,\'bomo_owner_only_five_attempts\') ON CONFLICT(version) DO NOTHING'
  ];
  for (const statement of statements) await dbQuery(statement);
}
async function installationStatus(guildId) {
  await ensureSchema();
  const result = await dbQuery('SELECT status FROM nexabot_bomo_installations WHERE guild_id=$1 LIMIT 1', [guildId]);
  return result.rows[0]?.status || null;
}

async function removeGuildSetupCommand(guild) {
  const current = await guild.commands.fetch();
  const command = current.find((entry) => entry.name === SETUP_COMMAND);
  if (command) await guild.commands.delete(command.id);
  const verified = await guild.commands.fetch();
  return !verified.some((entry) => entry.name === SETUP_COMMAND);
}

async function syncSetupCommand(guild) {
  if (!guild?.commands) return;
  const current = await guild.commands.fetch();
  const existing = current.find((entry) => entry.name === SETUP_COMMAND);
  if (guild.id !== BELV_GUILD_ID) {
    if (existing) await guild.commands.delete(existing.id);
    return;
  }
  const status = await installationStatus(guild.id);
  if (status === 'completed') {
    if (existing) await guild.commands.delete(existing.id);
    return;
  }
  const payload = buildCommand().toJSON();
  if (existing) await existing.edit(payload);
  else await guild.commands.create(payload);
}

function getRoleIdMap() {
  return configuredRankRoleMap(process.env.BELV_RANK_ROLE_IDS);
}

function isChiefRole(role, roleIdMap = getRoleIdMap()) {
  const rank = classifyBelvRole(role, roleIdMap);
  return Boolean(rank && rank.key === 'foigazgato' && rank.min <= 1);
}

function buildAccess(roles, chiefRoles, spec) {
  const all = ROLE_SPECS.map((item) => roles.get(item.key).id);
  const leadership = ROLE_SPECS.filter((item) => ['commander', 'deputy', 'lead_ops'].includes(item.key)).map((item) => roles.get(item.key).id);
  const staff = ROLE_SPECS.filter((item) => item.key !== 'candidate').map((item) => roles.get(item.key).id);
  const covert = ROLE_SPECS.filter((item) => ['commander', 'deputy', 'lead_ops', 'undercover'].includes(item.key)).map((item) => roles.get(item.key).id);
  const audience = spec.audience === 'all' ? all : spec.audience === 'staff' ? staff : spec.audience === 'leadership' ? leadership : covert;
  const writers = spec.writers === 'all' ? all : spec.writers === 'staff' ? staff : spec.writers === 'leadership' ? leadership : covert;
  return { audience: [...new Set([...audience, ...chiefRoles.map((role) => role.id)])], writers: [...new Set([...writers, ...chiefRoles.map((role) => role.id)])], all };
}

function permissionOverwrite(guild, botMember, roles, chiefRoles, audience = null, writers = null, voice = false) {
  const everyone = guild.roles.everyone.id;
  const keys = roles ? ROLE_SPECS.map((item) => roles.get(item.key).id) : [];
  const accessIds = [...new Set([...(audience || []), ...chiefRoles.map((role) => role.id)])];
  const writeIds = new Set([...(writers || []), ...chiefRoles.map((role) => role.id)]);
  const allow = voice
    ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
    : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles];
  const deny = voice ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions];
  const writes = voice ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles];
  const overwrites = [{ id: everyone, deny: [PermissionFlagsBits.ViewChannel] }];
  for (const id of keys) {
    overwrites.push({ id, ...(accessIds.includes(id) ? { allow: writers && writeIds.has(id) || !writers ? writes : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] } : { deny }) });
  }
  for (const role of chiefRoles) if (!keys.includes(role.id)) overwrites.push({ id: role.id, allow: writes });
  overwrites.push({ id: botMember.id, allow: voice ? [...writes] : [...writes, PermissionFlagsBits.ManageMessages] });
  return overwrites;
}

function plannedResources(guild) {
  const categories = [...guild.channels.cache.values()].filter((channel) =>
    channel.type === ChannelType.GuildCategory && normalizeName(channel.name) === normalizeName(CATEGORY_NAME));
  if (categories.length > 1) fail(409, 'Több azonos BOMO-kategóriát találtam. Semmit nem módosítottam.');
  const category = categories[0] || null;
  if (category) fail(409, 'A BOMO-kategória már létezik; a meglévő kategóriát és csatornáit nem módosítom.');
  const categoryId = category?.id || null;
  const channelMap = new Map();
  const conflicts = [];
  for (const spec of ALL_CHANNELS) {
    const matches = [...guild.channels.cache.values()].filter((channel) =>
      normalizeName(channel.name) === normalizeName(spec.name));
    if (matches.length > 1) conflicts.push(spec.name + ': több azonos nevű csatorna létezik.');
    else if (matches.length === 1) {
      const existing = matches[0];
      const expected = spec.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
      if (existing.type !== expected) conflicts.push(spec.name + ': a meglévő csatorna típusa nem egyezik a telepítővel.');
      else if (existing.parentId !== categoryId) {
        if (REUSE_EXISTING_CHANNEL_KEYS.has(spec.key)) channelMap.set(spec.key, existing);
        else conflicts.push(spec.name + ': már létezik a BOMO-kategórián kívül; a meglévő csatornát nem mozgatom és nem módosítom.');
      } else channelMap.set(spec.key, existing);
    } else channelMap.set(spec.key, null);
  }
  if (category) {
    const expectedNames = new Set(ALL_CHANNELS.map((item) => normalizeName(item.name)));
    const unmanaged = [...guild.channels.cache.values()].filter((channel) =>
      channel.parentId === category.id && !expectedNames.has(normalizeName(channel.name)));
    if (unmanaged.length) conflicts.push('A BOMO-kategóriában meglévő, a telepítőhöz nem tartozó csatornákat találtam: ' + unmanaged.map((item) => '#' + item.name).join(', ') + '.');
  }
  if (conflicts.length) fail(409, conflicts.join('\n') + '\nSemmit nem módosítottam.');
  return { category, channels: channelMap };
}

function inspectForeignOverwrites(channel, knownRoleIds, botId) {
  const known = new Set([channel.guild.roles.everyone.id, botId, ...knownRoleIds]);
  return [...channel.permissionOverwrites.cache.values()].filter((overwrite) => !known.has(overwrite.id) && overwrite.allow.has(PermissionFlagsBits.ViewChannel));
}

function assertBotSetupPermissions(guild, botMember) {
  if (!botMember) fail(403, 'A Nexa szervertagsági adatai nem érhetők el.');
  const needed = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ReadMessageHistory
  ];
  const permissions = botMember.permissions;
  const missing = needed.filter((permission) => !permissions?.has(permission));
  if (missing.length) fail(403, 'A telepítéshez a Nexának ezek a szerverjogok kellenek: ' + missing.map((permission) => permission === PermissionFlagsBits.ManageChannels ? 'Csatornák kezelése' : permission === PermissionFlagsBits.ManageRoles ? 'Szerepkörök kezelése' : 'Discord-csatorna használata').join(', ') + '.');
}

async function ensureRoles(guild) {
  const result = new Map();
  const roleCache = await guild.roles.fetch();
  for (const spec of [...ROLE_SPECS].reverse()) {
    const matches = [...roleCache.values()].filter((role) => normalizeName(role.name) === normalizeName(spec.name));
    if (matches.length > 1) fail(409, 'Több azonos BOMO-szerepkört találtam: ' + spec.name + '.');
    if (matches[0]) {
      result.set(spec.key, matches[0]);
      continue;
    }
    const role = await guild.roles.create({
      name: spec.name,
      color: spec.color,
      hoist: false,
      mentionable: false,
      permissions: [],
      reason: 'BOMO Discord rendszer egyszeri telepítése'
    });
    result.set(spec.key, role);
  }
  return result;
}

async function ensureCategory(guild, existing, botMember, roles, chiefRoles) {
  const overwrites = permissionOverwrite(guild, botMember, roles, chiefRoles, ROLE_SPECS.map((role) => roles.get(role.key).id), ROLE_SPECS.map((role) => roles.get(role.key).id));
  if (!existing) return guild.channels.create({
    name: CATEGORY_NAME,
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites,
    reason: 'BOMO Discord rendszer egyszeri telepítése'
  });
  const known = [...ROLE_SPECS.map((role) => roles.get(role.key).id), ...chiefRoles.map((role) => role.id)];
  const foreign = inspectForeignOverwrites(existing, known, botMember.id);
  if (foreign.length) fail(409, 'A meglévő BOMO-kategórián más szerepkörök is láthatóságot kapnak. A biztonság kedvéért nem írtam át a jogosultságokat.');
  await existing.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false });
  for (const spec of ROLE_SPECS) {
    const roleId = roles.get(spec.key).id;
    await existing.permissionOverwrites.edit(roleId, { ViewChannel: true });
  }
  for (const role of chiefRoles) await existing.permissionOverwrites.edit(role.id, { ViewChannel: true });
  await existing.permissionOverwrites.edit(botMember.id, { ViewChannel: true, ManageChannels: true, ManageRoles: true, SendMessages: true, EmbedLinks: true, ReadMessageHistory: true, ManageMessages: true });
  return existing;
}

async function ensureTextChannel(guild, channel, category, botMember, roles, chiefRoles, spec) {
  const access = buildAccess(roles, chiefRoles, spec);
  const overwrites = permissionOverwrite(guild, botMember, roles, chiefRoles, access.audience, access.writers);
  let current = channel;
  if (!current) current = await guild.channels.create({
    name: spec.name,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: overwrites,
    reason: 'BOMO Discord rendszer egyszeri telepítése'
  });
  else {
    if (REUSE_EXISTING_CHANNEL_KEYS.has(spec.key) && current.parentId !== category.id) {
      await current.permissionOverwrites.set(overwrites, 'A meglévő BELV-csatorna BOMO-hozzáférésének biztonságos beállítása');
      current = await current.setParent(category.id, {
        lockPermissions: false,
        reason: 'A meglévő BELV-csatorna újrahasznosítása a BOMO-ban, duplikáció nélkül'
      });
      return current;
    }
    const known = [...ROLE_SPECS.map((role) => roles.get(role.key).id), ...chiefRoles.map((role) => role.id)];
    const foreign = inspectForeignOverwrites(current, known, botMember.id);
    if (foreign.length) fail(409, '#' + current.name + ': más szerepkör láthatja a privát BOMO-csatornát; a beállítást nem módosítottam.');
    await current.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false });
    for (const roleSpec of ROLE_SPECS) {
      const roleId = roles.get(roleSpec.key).id;
      const allowed = access.audience.includes(roleId);
      const canWrite = access.writers.includes(roleId);
      await current.permissionOverwrites.edit(roleId, allowed
        ? { ViewChannel: true, ReadMessageHistory: true, SendMessages: canWrite, EmbedLinks: canWrite, AttachFiles: canWrite, AddReactions: canWrite }
        : { ViewChannel: false, SendMessages: false, AttachFiles: false });
    }
    for (const role of chiefRoles) {
      await current.permissionOverwrites.edit(role.id, { ViewChannel: true, ReadMessageHistory: true, SendMessages: true, EmbedLinks: true, AttachFiles: true, AddReactions: true });
    }
    await current.permissionOverwrites.edit(botMember.id, { ViewChannel: true, ReadMessageHistory: true, SendMessages: true, EmbedLinks: true, AttachFiles: true, ManageMessages: true });
  }
  return current;
}

async function ensureVoiceChannel(guild, channel, category, botMember, roles, chiefRoles, spec) {
  const access = buildAccess(roles, chiefRoles, { ...spec, writers: spec.audience });
  const overwrites = permissionOverwrite(guild, botMember, roles, chiefRoles, access.audience, access.writers, true);
  let current = channel;
  if (!current) current = await guild.channels.create({
    name: spec.name,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: overwrites,
    reason: 'BOMO Discord rendszer egyszeri telepítése'
  });
  else {
    const known = [...ROLE_SPECS.map((role) => roles.get(role.key).id), ...chiefRoles.map((role) => role.id)];
    const foreign = inspectForeignOverwrites(current, known, botMember.id);
    if (foreign.length) fail(409, '#' + current.name + ': más szerepkör láthatja a privát BOMO-csatornát; a beállítást nem módosítottam.');
    await current.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false });
    for (const roleSpec of ROLE_SPECS) {
      const roleId = roles.get(roleSpec.key).id;
      await current.permissionOverwrites.edit(roleId, access.audience.includes(roleId)
        ? { ViewChannel: true, Connect: true, Speak: true }
        : { ViewChannel: false, Connect: false, Speak: false });
    }
    for (const role of chiefRoles) await current.permissionOverwrites.edit(role.id, { ViewChannel: true, Connect: true, Speak: true });
    await current.permissionOverwrites.edit(botMember.id, { ViewChannel: true, Connect: true, Speak: true, ManageChannels: true });
  }
  return current;
}

function embedFor(key) {
  const content = CONTENT[key];
  const embed = new EmbedBuilder()
    .setColor(0x24384a)
    .setTitle(content.title)
    .setDescription(content.description)
    .setFooter({ text: MARKER_PREFIX + key });
  for (const field of content.fields) embed.addFields({ name: field[0], value: field[1] });
  return embed;
}

async function publishReference(channel, key, botId) {
  const footer = MARKER_PREFIX + key;
  const messages = await channel.messages.fetch({ limit: 100 });
  const existing = messages.find((message) => message.author.id === botId && message.embeds[0]?.footer?.text === footer);
  const embed = embedFor(key);
  if (existing) return existing;
  return channel.send({ embeds: [embed] });
}

function buildForms(channels) {
  return FORM_SPECS.map((form) => ({
    ...form,
    active: true,
    custom: true,
    caseNumber: true,
    pingTarget: false,
    channelId: channels.get(form.channel).id,
    approvalChannelId: form.approvalChannel ? channels.get(form.approvalChannel).id : null,
    fields: form.fields.map((field) => ({ ...field }))
  }));
}

async function configureForms(guild, channels) {
  const existing = getGuildConfig(guild.id);
  const customTypes = existing.documents?.customTypes || [];
  const formKeys = new Set(FORM_SPECS.map((form) => form.key));
  const conflicts = customTypes.filter((type) => formKeys.has(type.key) && !String(type.key).startsWith('custom_bomo_'));
  if (conflicts.length) fail(409, 'Egy BOMO-űrlap kulcsa ütközik egy meglévő irattípussal.');
  const existingKeys = new Set(customTypes.map((type) => type.key));
  const missingForms = buildForms(channels).filter((form) => !existingKeys.has(form.key));
  if (customTypes.length + missingForms.length > 25) fail(409, 'A NEXA 25 egyedi irattípusos korlátja miatt a BOMO-űrlapok nem férnek el. Meglévő iratot nem töröltem.');
  if (missingForms.length) {
    await setGuildConfig(guild.id, {
      ...existing,
      documents: { ...existing.documents, customTypes: [...customTypes, ...missingForms] }
    });
  }
  const installed = customDocumentTypes(guild).filter((type) => formKeys.has(type.key));
  if (installed.length !== FORM_SPECS.length) fail(500, 'A BOMO-űrlapok adatbázisba mentése nem ellenőrizhető.');
  return installed;
}

async function publishPanels(guild, forms) {
  const panelByKey = new Map();
  for (const type of forms) {
    const channel = guild.channels.cache.get(type.channelId);
    if (!channel || !channel.isTextBased?.()) fail(404, 'A BOMO-űrlap célcsatornája nem található: ' + type.title);
    const messages = await channel.messages.fetch({ limit: 100 });
    const footer = FORM_PANEL_PREFIX + type.key;
    const previous = messages.find((message) => message.author.id === guild.client.user.id && message.embeds[0]?.footer?.text === footer);
    const panel = documentPanel(type, guild);
    const embed = panel.embeds?.[0];
    if (embed) embed.setFooter({ text: footer });
    const sent = previous || await channel.send(panel);
    panelByKey.set(type.key, { channelId: channel.id, messageId: sent.id });
  }
  return panelByKey;
}

async function verifyProvision(guild, category, roles, channels, chiefRoles, forms, panels, botMember) {
  const storedForms = customDocumentTypes(guild);
  const storedKeys = new Set(storedForms.map((type) => type.key));
  for (const form of FORM_SPECS) if (!storedKeys.has(form.key)) fail(500, 'Hiányzik a mentett BOMO-űrlap: ' + form.title);
  for (const spec of ALL_CHANNELS) {
    const channel = channels.get(spec.key);
    if (!channel || channel.parentId !== category.id) fail(500, 'Nem ellenőrizhető a BOMO-csatorna: ' + spec.name);
    const botPermissions = channel.permissionsFor(botMember);
    const required = spec.type === 'voice'
      ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
      : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory];
    if (!botPermissions?.has(required)) fail(403, 'A NEXA jogosultsága hiányzik: ' + spec.name);
    if (channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)) fail(403, 'A privát BOMO-csatornát az @everyone is láthatja: ' + spec.name);
  }
  for (const form of forms) {
    const panel = panels.get(form.key);
    const channel = guild.channels.cache.get(panel?.channelId);
    const message = channel ? await channel.messages.fetch(panel.messageId).catch(() => null) : null;
    if (!message || !message.components.length) fail(500, 'Nem ellenőrizhető a gombos BOMO-űrlap: ' + form.title);
  }
  return true;
}

async function provision(interaction) {
  const guild = interaction.guild;
  if (!guild || guild.id !== BELV_GUILD_ID) fail(403, 'A BOMO telepítő csak a BELV Discord-szerverén használható.');
  if (String(interaction.user?.id || '') !== String(guild.ownerId)) fail(403, 'A BOMO telepítőparancsot kizárólag a BELV Discord-szerver tulajdonosa használhatja.');
  if (locks.has(guild.id)) fail(409, 'A BOMO telepítése már folyamatban van; várd meg a befejezést.');
  locks.add(guild.id);
  try {
    await ensureSchema();
    const state = await dbQuery('SELECT status,attempt_count FROM nexabot_bomo_installations WHERE guild_id=$1 LIMIT 1', [guild.id]);
    if (state.rows[0]?.status === 'completed') {
      const removed = await removeGuildSetupCommand(guild);
      return { already: true, removed };
    }
    const attempts = Number(state.rows[0]?.attempt_count || 0);
    if (attempts >= MAX_INSTALL_ATTEMPTS) fail(429, 'A BOMO telepítési parancs elérte az 5 próbálkozásos korlátot.');
    const attempt = await dbQuery(
      'INSERT INTO nexabot_bomo_installations(guild_id,status,installed_by,attempt_count,last_error,updated_at) VALUES($1,\'installing\',$2,1,NULL,NOW()) ON CONFLICT(guild_id) DO UPDATE SET status=\'installing\',installed_by=EXCLUDED.installed_by,attempt_count=nexabot_bomo_installations.attempt_count+1,last_error=NULL,updated_at=NOW() WHERE nexabot_bomo_installations.status<>\'completed\' AND nexabot_bomo_installations.attempt_count < $3 RETURNING attempt_count',
      [guild.id, interaction.user.id, MAX_INSTALL_ATTEMPTS]
    );
    if (!attempt?.rowCount) fail(429, 'A BOMO telepítési parancs elérte az 5 próbálkozásos korlátot.');
    const botMember = guild.members.me || await guild.members.fetchMe();
    assertBotSetupPermissions(guild, botMember);
    await guild.roles.fetch();
    await guild.channels.fetch();
    const foundChiefRoles = [...guild.roles.cache.values()].filter((role) => isChiefRole(role));
    if (!foundChiefRoles.length) fail(409, 'Nem találtam felismerhető BELV Főigazgató rangot. Ellenőrizd a rang nevét vagy a BELV_RANK_ROLE_IDS beállítást; semmit nem telepítettem.');
    const plan = plannedResources(guild);
    await dbQuery(
      'UPDATE nexabot_bomo_installations SET category_id=$2,updated_at=NOW() WHERE guild_id=$1 AND status<>\'completed\'',
      [guild.id, plan.category?.id || null]
    );
    const roles = await ensureRoles(guild);
    const allKnownRoles = [...ROLE_SPECS.map((spec) => roles.get(spec.key).id), ...foundChiefRoles.map((role) => role.id)];
    const positionLimit = Number(botMember.roles?.highest?.position || 0);
    const unmanageable = [...roles.values()].filter((role) => role.position >= positionLimit);
    if (unmanageable.length) fail(403, 'A Nexa legmagasabb rangja alatt kell lennie a BOMO-szerepköröknek: ' + unmanageable.map((role) => role.name).join(', ') + '.');
    const category = await ensureCategory(guild, plan.category, botMember, roles, foundChiefRoles);
    const channels = new Map();
    for (const spec of TEXT_CHANNELS) {
      const channel = await ensureTextChannel(guild, plan.channels.get(spec.key), category, botMember, roles, foundChiefRoles, spec);
      channels.set(spec.key, channel);
    }
    for (const spec of VOICE_CHANNELS) {
      const channel = await ensureVoiceChannel(guild, plan.channels.get(spec.key), category, botMember, roles, foundChiefRoles, spec);
      channels.set(spec.key, channel);
    }
    for (const spec of TEXT_CHANNELS) await publishReference(channels.get(spec.key), spec.content, botMember.id);
    const forms = await configureForms(guild, channels);
    const panels = await publishPanels(guild, forms);
    await verifyProvision(guild, category, roles, channels, foundChiefRoles, forms, panels, botMember);
    await dbQuery(
      'UPDATE nexabot_bomo_installations SET status=\'completed\',category_id=$2,installed_at=NOW(),last_error=NULL,updated_at=NOW() WHERE guild_id=$1',
      [guild.id, category.id]
    );
    await recordAudit('bomo_install_completed', {
      guildId: guild.id,
      actorId: interaction.user.id,
      metadata: { categoryId: category.id, roles: Object.fromEntries([...roles].map(([key, role]) => [key, role.id])), channels: Object.fromEntries([...channels].map(([key, channel]) => [key, channel.id])) }
    }).catch(() => null);
    const removed = await removeGuildSetupCommand(guild).catch(() => false);
    return { category, roles, channels, panels, removed };
  } finally {
    locks.delete(guild.id);
  }
}

async function handleCommand(interaction) {
  if (!interaction.guild || String(interaction.user?.id || '') !== String(interaction.guild.ownerId)) {
    const message = '❌ A /bomo-setup parancsot kizárólag a BELV Discord-szerver tulajdonosa használhatja.';
    if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    return interaction.editReply(message);
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const status = await installationStatus(interaction.guildId);
    if (status === 'completed') {
      const removed = await removeGuildSetupCommand(interaction.guild).catch(() => false);
      return interaction.editReply(removed
        ? '✅ A BOMO korábban már települt ezen a szerveren; a telepítőparancs el lett távolítva.'
        : '✅ A BOMO már telepítve van. A telepítőparancs törlését a NEXA következő induláskor újra megpróbálja.');
    }
    const result = await provision(interaction);
    if (result.already) return interaction.editReply(result.removed
      ? '✅ A BOMO már telepítve van. A /bomo-setup telepítőparancsot eltávolítottam.'
      : '✅ A BOMO már telepítve van; a parancs eltávolítását a NEXA következő induláskor újra megpróbálja.');
    return interaction.editReply('✅ **A BOMO Discord-rendszere telepítve.**\nKategória: ' + result.category.name +
      '\nLétrehozott szerepkörök: ' + [...result.roles.values()].map((role) => role.name).join(', ') +
      '\nCsatornák: ' + result.channels.size + ' · gombos űrlapok: ' + result.panels.size +
      '\nSzerveroldali ellenőrzés: sikeres' +
      '\n/bomo-setup törlése: ' + (result.removed ? 'ellenőrizve' : 'kérés elküldve; a következő induláskor újraellenőrzöm'));
  } catch (error) {
    await dbQuery(
      'UPDATE nexabot_bomo_installations SET status=\'failed\',last_error=$2,updated_at=NOW() WHERE guild_id=$1 AND status<>\'completed\'',
      [interaction.guildId, String(error.message || error).slice(0, 1500)]
    ).catch(() => null);
    await recordError(error, { command: 'bomo_setup', guildId: interaction.guildId, userId: interaction.user?.id }).catch(() => null);
    return interaction.editReply('❌ A BOMO telepítése nem fejeződött be; a /bomo-setup parancs megmaradt.\n' + String(error.message || error).slice(0, 1600));
  }
}

function isMember(member) {
  return ROLE_SPECS.some((spec) => member?.roles?.cache?.some((role) => normalizeName(role.name) === normalizeName(spec.name)));
}
function canSubmit(member, typeKey) {
  if (!member || !String(typeKey || '').startsWith('custom_bomo_')) return false;
  const roleNames = member.roles?.cache ? [...member.roles.cache.values()].map((role) => normalizeName(role.name)) : [];
  if ([...(member.roles?.cache?.values?.() || [])].some((role) => isChiefRole(role))) return true;
  const has = (key) => roleNames.includes(normalizeName(ROLE_SPECS.find((spec) => spec.key === key)?.name));
  if (typeKey === 'custom_bomo_investigation') return ['commander', 'deputy', 'lead_ops'].some(has);
  if (typeKey === 'custom_bomo_operation' || typeKey === 'custom_bomo_observation') return ['commander', 'deputy', 'lead_ops', 'officer', 'undercover'].some(has);
  if (typeKey === 'custom_bomo_report') return ['commander', 'deputy', 'lead_ops', 'officer', 'undercover'].some(has);
  return isMember(member);
}
function canApprove(member, typeKey) {
  if (!member || !String(typeKey || '').startsWith('custom_bomo_')) return false;
  const roleNames = member.roles?.cache ? [...member.roles.cache.values()].map((role) => normalizeName(role.name)) : [];
  if (LEADERSHIP_ROLE_NAMES.some((name) => roleNames.includes(normalizeName(name)))) return true;
  const roleIdMap = getRoleIdMap();
  return [...(member.roles?.cache?.values?.() || [])].some((role) => {
    const rank = classifyBelvRole(role, roleIdMap);
    return Boolean(rank && rank.key === 'foigazgato' && rank.min <= 1);
  });
}

async function createCaseNumber(interaction) {
  const parts = new Intl.DateTimeFormat('hu-HU', {
    timeZone: 'Europe/Budapest',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return 'BOMO-' + parts.year + parts.month + parts.day + '-' + parts.hour + parts.minute + '-' + String(interaction.id).slice(-12);
}

async function prepareSubmission(interaction, type, targetUserId = null) {
  await ensureSchema();
  const caseNumber = await createCaseNumber(interaction);
  const answers = Object.fromEntries(type.fields.map((field) => [field.label, interaction.fields.getTextInputValue(field.id).trim()]));
  const initialStatus = type.approval ? 'pending_review' : 'submitted';
  const inserted = await dbQuery(
    'INSERT INTO nexabot_bomo_cases(guild_id,case_number,form_key,interaction_id,submitter_id,target_user_id,answers,status) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) ON CONFLICT(guild_id,interaction_id) DO NOTHING RETURNING case_number',
    [interaction.guildId, caseNumber, type.key, interaction.id, interaction.user.id, targetUserId, JSON.stringify(answers), initialStatus]
  );
  if (!inserted?.rowCount) fail(409, 'Ezt az űrlapbeküldést a NEXA már rögzítette.');
  await auditCase(interaction.guildId, caseNumber, interaction.user.id, 'submitted', { formKey: type.key });
  return caseNumber;
}

async function auditCase(guildId, caseNumber, actorId, action, details = {}) {
  await dbQuery(
    'INSERT INTO nexabot_bomo_case_audit(guild_id,case_number,actor_id,action,details) VALUES($1,$2,$3,$4,$5::jsonb)',
    [guildId, caseNumber, actorId, action, JSON.stringify(details)]
  );
}
async function attachSubmission(guildId, caseNumber, message, pending) {
  await dbQuery(
    'UPDATE nexabot_bomo_cases SET review_channel_id=CASE WHEN $3::boolean THEN $4 ELSE review_channel_id END,review_message_id=CASE WHEN $3::boolean THEN $5 ELSE review_message_id END,published_channel_id=CASE WHEN $3::boolean THEN published_channel_id ELSE $4 END,published_message_id=CASE WHEN $3::boolean THEN published_message_id ELSE $5 END,updated_at=NOW() WHERE guild_id=$1 AND case_number=$2',
    [guildId, caseNumber, pending, message.channelId, message.id]
  );
}
async function claimCaseDecision(guildId, caseNumber, actorId) {
  const result = await dbQuery(
    "UPDATE nexabot_bomo_cases SET status='decision_processing',decision_by=$3,updated_at=NOW() WHERE guild_id=$1 AND case_number=$2 AND status='pending_review' RETURNING case_number",
    [guildId, caseNumber, actorId]
  );
  if (!result?.rowCount) return false;
  await auditCase(guildId, caseNumber, actorId, 'decision_started', {});
  return true;
}
async function releaseCaseDecision(guildId, caseNumber, actorId, details = {}) {
  const result = await dbQuery(
    "UPDATE nexabot_bomo_cases SET status='pending_review',decision_by=NULL,decision_at=NULL,updated_at=NOW() WHERE guild_id=$1 AND case_number=$2 AND status='decision_processing' AND decision_by=$3 RETURNING case_number",
    [guildId, caseNumber, actorId]
  );
  if (result?.rowCount) await auditCase(guildId, caseNumber, actorId, 'decision_released', details);
  return Boolean(result?.rowCount);
}

async function setCaseStatus(guildId, caseNumber, actorId, status, details = {}) {
  const result = await dbQuery(
    "UPDATE nexabot_bomo_cases SET status=$4,decision_by=$3,decision_at=NOW(),updated_at=NOW() WHERE guild_id=$1 AND case_number=$2 AND status='decision_processing' RETURNING case_number",
    [guildId, caseNumber, actorId, status]
  );
  if (result?.rowCount) await auditCase(guildId, caseNumber, actorId, status, details);
  return Boolean(result?.rowCount);
}

module.exports = {
  BELV_GUILD_ID,
  ROLE_SPECS,
  TEXT_CHANNELS,
  VOICE_CHANNELS,
  FORM_SPECS,
  buildCommand,
  syncSetupCommand,
  handleCommand,
  isMember,
  canSubmit,
  canApprove,
  prepareSubmission,
  attachSubmission,
  claimCaseDecision,
  releaseCaseDecision,
  setCaseStatus
};
