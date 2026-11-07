'use strict';

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder,
  MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder,
  TextInputBuilder, TextInputStyle
} = require('discord.js');
const { dbQuery, isPersistentStore, isBotOwner } = require('./config');
const { rankForMember, configuredRankRoleMap, classifyBelvRole, normalize } = require('./belv-roster-rules');
const { recordAudit, recordError } = require('./telemetry');

const BELV_GUILD_ID = '1517509643734221030';
const TIMEZONE = 'Europe/Budapest';
const CATEGORY_NAME = '📊┃BELV heti aktivitás';
const CHANNELS = Object.freeze([
  { key: 'weekly', name: '📊┃heti-aktivitás' },
  { key: 'service', name: '⏱️┃szolgálati-idő' },
  { key: 'reports', name: '📋┃aktivitási-jelentések' },
  { key: 'leadership', name: '🔒┃aktivitás-vezetőség' }
]);
const ROLE_MAP = () => configuredRankRoleMap(process.env.BELV_RANK_ROLE_IDS);
const LEADER_NAMES = new Set([
  'belvedelmi-vezetoseg', 'belvedelmi-vezetoseg-1', 'foigazgato',
  'foigazgato-helyettes', 'igazgato', 'igazgatohelyettes',
  'foosztalyvezeto', 'muveleti-vezeto', 'ellenorzesi-vezeto', 'foellenor'
]);
const jobs = new WeakSet();
let schemaPromise = null;

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
async function query(sql, values = []) {
  if (!isPersistentStore()) fail(503, 'A BELV aktivitáshoz tartós PostgreSQL-adatbázis szükséges.');
  const result = await dbQuery(sql, values);
  if (!result) fail(503, 'A BELV aktivitási adatbázis nem érhető el.');
  return result;
}
async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const statements = [
        'CREATE TABLE IF NOT EXISTS nexabot_belv_activity_config (guild_id TEXT PRIMARY KEY, category_id TEXT, channels JSONB NOT NULL DEFAULT \'{}\'::jsonb, messages JSONB NOT NULL DEFAULT \'{}\'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
        'CREATE TABLE IF NOT EXISTS nexabot_belv_activity_shifts (id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ended_at TIMESTAMPTZ, elapsed_seconds INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
        'CREATE UNIQUE INDEX IF NOT EXISTS nexabot_belv_activity_one_open_shift ON nexabot_belv_activity_shifts(guild_id,user_id) WHERE ended_at IS NULL',
        'CREATE INDEX IF NOT EXISTS nexabot_belv_activity_shifts_week ON nexabot_belv_activity_shifts(guild_id,started_at)',
        'CREATE TABLE IF NOT EXISTS nexabot_belv_activity_reports (id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, week_start DATE NOT NULL, stated_period TEXT NOT NULL, tasks TEXT NOT NULL, inspection_count INTEGER NOT NULL DEFAULT 0, evidence TEXT NOT NULL DEFAULT \'\', notes TEXT NOT NULL DEFAULT \'\', status TEXT NOT NULL DEFAULT \'pending\', review_reason TEXT, reviewed_by TEXT, reviewed_at TIMESTAMPTZ, report_message_id TEXT, report_channel_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(guild_id,user_id,week_start))',
        'ALTER TABLE nexabot_belv_activity_reports ADD COLUMN IF NOT EXISTS report_message_id TEXT',
        'ALTER TABLE nexabot_belv_activity_reports ADD COLUMN IF NOT EXISTS report_channel_id TEXT',
        'CREATE INDEX IF NOT EXISTS nexabot_belv_activity_reports_week ON nexabot_belv_activity_reports(guild_id,week_start,status)',
        'CREATE TABLE IF NOT EXISTS nexabot_belv_activity_messages (guild_id TEXT NOT NULL, message_id TEXT NOT NULL, user_id TEXT NOT NULL, channel_id TEXT NOT NULL, week_start DATE NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(guild_id,message_id))',
        'CREATE INDEX IF NOT EXISTS nexabot_belv_activity_messages_week ON nexabot_belv_activity_messages(guild_id,week_start,user_id,created_at)',
        'CREATE TABLE IF NOT EXISTS nexabot_belv_activity_exemptions (id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, starts_on DATE NOT NULL, ends_on DATE NOT NULL, reason TEXT NOT NULL, approved_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK(ends_on >= starts_on))',
        'CREATE INDEX IF NOT EXISTS nexabot_belv_activity_exemptions_week ON nexabot_belv_activity_exemptions(guild_id,user_id,starts_on,ends_on)',
        'CREATE TABLE IF NOT EXISTS nexabot_belv_activity_requirements (guild_id TEXT PRIMARY KEY, service_seconds INTEGER NOT NULL DEFAULT 10800, task_count INTEGER NOT NULL DEFAULT 2, report_count INTEGER NOT NULL DEFAULT 1, updated_by TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
        'CREATE TABLE IF NOT EXISTS nexabot_belv_activity_adjustments (id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, week_start DATE NOT NULL, service_seconds_delta INTEGER NOT NULL DEFAULT 0, task_delta INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
        'CREATE INDEX IF NOT EXISTS nexabot_belv_activity_adjustments_week ON nexabot_belv_activity_adjustments(guild_id,week_start,user_id)',
        'CREATE TABLE IF NOT EXISTS nexabot_belv_activity_summaries (id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, week_start DATE NOT NULL, kind TEXT NOT NULL, message_id TEXT, attempted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(guild_id,week_start,kind))'
      ];
      for (const statement of statements) await query(statement);
      await query('INSERT INTO nexabot_belv_activity_requirements(guild_id) VALUES($1) ON CONFLICT(guild_id) DO NOTHING', [BELV_GUILD_ID]);
    })().catch((error) => { schemaPromise = null; throw error; });
  }
  await schemaPromise;
}
function localDateParts(date = new Date()) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(values.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}
function dateOnly(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(text + 'T00:00:00.000Z');
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : text;
}
function addDays(iso, amount) {
  const date = new Date(String(iso) + 'T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function mondayOf(iso) {
  const date = new Date(String(iso) + 'T00:00:00.000Z');
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}
function weekStartFor(date = new Date(), requested = null) {
  const selected = dateOnly(requested) || localDateParts(date).year + '-' + localDateParts(date).month + '-' + localDateParts(date).day;
  if (requested && !dateOnly(requested)) fail(400, 'A hét kezdete YYYY-MM-DD formátumú dátum legyen.');
  return mondayOf(selected);
}
function dateLabel(iso) { return String(iso).slice(0, 10).replace(/-/g, '.') + '.'; }
function databaseDate(value) { return value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10); }
function localMidnightUtc(iso) {
  const [year, month, day] = String(iso).split('-').map(Number);
  const target = Date.UTC(year, month - 1, day, 0, 0, 0);
  let candidate = target;
  for (let index = 0; index < 4; index += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(candidate));
    const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
    const represented = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
    candidate += target - represented;
  }
  return new Date(candidate);
}
function isLeader(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId || isBotOwner(member.id) || member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return [...(member.roles?.cache?.values?.() || [])].some((role) => LEADER_NAMES.has(normalize(role.name)));
}
function hasRank(member) { return Boolean(rankForMember(member, ROLE_MAP())); }
async function isRosterMember(member) {
  if (!member || member.user?.bot) return false;
  if (hasRank(member)) return true;
  const result = await query('SELECT 1 FROM nexabot_belv_roster_badges WHERE guild_id=$1 AND user_id=$2 AND active=TRUE LIMIT 1', [BELV_GUILD_ID, member.id]).catch(() => null);
  return Boolean(result?.rowCount);
}
async function freshMember(guild, userId) {
  return guild.members.fetch({ user: String(userId), force: true }).catch(() => null);
}
async function requireGuild(interaction) {
  if (!interaction.guild || interaction.guildId !== BELV_GUILD_ID) fail(403, 'Ez a funkció kizárólag a BELV Discord-szerveren használható.');
  await ensureSchema();
}
async function requireLeader(interaction) {
  await requireGuild(interaction);
  const member = await freshMember(interaction.guild, interaction.user.id);
  if (!isLeader(member)) fail(403, 'Ezt a vezetői műveletet csak a BELV Főigazgatója vagy engedélyezett vezető végezheti.');
  return member;
}
async function requireRoster(interaction) {
  await requireGuild(interaction);
  const member = await freshMember(interaction.guild, interaction.user.id);
  if (!(await isRosterMember(member))) fail(403, 'A BELV aktivitási rendszert csak az aktív BELV-állomány használhatja.');
  return member;
}
async function getConfig(guildId = BELV_GUILD_ID) {
  const row = (await query('SELECT * FROM nexabot_belv_activity_config WHERE guild_id=$1', [guildId])).rows[0];
  return row || null;
}
async function getChannel(guild, key) {
  const config = await getConfig(guild.id);
  const id = config?.channels?.[key];
  return id ? guild.channels.cache.get(String(id)) || await guild.channels.fetch(String(id)).catch(() => null) : null;
}
function command(name, description) {
  return new SlashCommandBuilder().setName(name).setDescription(description).setDMPermission(false).setDefaultMemberPermissions(null);
}
function buildCommands() {
  const install = command('aktivitas-telepites', 'BELV heti aktivitási csatornák és gombok telepítése.');
  const view = command('aktivitas-megtekintes', 'BELV-tag heti vagy korábbi aktivitásának megtekintése.')
    .addUserOption((option) => option.setName('tag').setDescription('A vizsgált BELV-tag.'))
    .addStringOption((option) => option.setName('hetkezdete').setDescription('Hétfői dátum: YYYY-MM-DD.'));
  const leave = command('aktivitas-felmentes', 'Igazolt BELV-távollét rögzítése.')
    .addUserOption((option) => option.setName('tag').setDescription('A felmentett BELV-tag.').setRequired(true))
    .addStringOption((option) => option.setName('kezdete').setDescription('Kezdőnap: YYYY-MM-DD.').setRequired(true))
    .addStringOption((option) => option.setName('vege').setDescription('Zárónap: YYYY-MM-DD.').setRequired(true))
    .addStringOption((option) => option.setName('indok').setDescription('A távollét RP-indoka.').setRequired(true).setMaxLength(500));
  const requirement = command('aktivitas-kovetelmeny', 'A BELV heti minimumok beállítása.')
    .addIntegerOption((option) => option.setName('orak').setDescription('Heti szolgálati órák (0–168).').setMinValue(0).setMaxValue(168).setRequired(true))
    .addIntegerOption((option) => option.setName('feladatok').setDescription('Heti jóváhagyott ellenőrzések/feladatok (0–100).').setMinValue(0).setMaxValue(100).setRequired(true))
    .addIntegerOption((option) => option.setName('jelentesek').setDescription('Heti jóváhagyott jelentések (0–20).').setMinValue(0).setMaxValue(20).setRequired(true));
  const summary = command('aktivitas-osszesites', 'BELV heti ranglista és összesítés frissítése.')
    .addStringOption((option) => option.setName('hetkezdete').setDescription('Hétfői dátum: YYYY-MM-DD.'));
  const correction = command('aktivitas-korrekcio', 'Naplózott heti szolgálati/feladatszám-korrekció.')
    .addUserOption((option) => option.setName('tag').setDescription('Az érintett BELV-tag.').setRequired(true))
    .addStringOption((option) => option.setName('hetkezdete').setDescription('Hétfői dátum: YYYY-MM-DD.').setRequired(true))
    .addIntegerOption((option) => option.setName('perc').setDescription('Szolgálati perc korrekciója (+/-).').setMinValue(-100000).setMaxValue(100000).setRequired(true))
    .addIntegerOption((option) => option.setName('feladatok').setDescription('Jóváhagyott feladatok korrekciója (+/-).').setMinValue(-1000).setMaxValue(1000).setRequired(true))
    .addStringOption((option) => option.setName('indok').setDescription('A korrekció indoka.').setRequired(true).setMaxLength(500));
  return [install, view, leave, requirement, summary, correction];
}
async function removeCommands(guild) {
  const registered = await guild.commands.fetch();
  for (const item of registered.values()) if (item.name.startsWith('aktivitas-')) await item.delete().catch(() => null);
}
async function syncGuildCommands(guild) {
  if (!guild?.commands) return;
  if (guild.id !== BELV_GUILD_ID) return removeCommands(guild);
  const registered = await guild.commands.fetch();
  for (const definition of buildCommands()) {
    const payload = definition.toJSON();
    const existing = [...registered.values()].find((item) => item.name === definition.name);
    if (existing) await existing.edit(payload);
    else await guild.commands.create(payload);
  }
}
async function resolvePlan(guild, botMember) {
  await guild.channels.fetch();
  await guild.roles.fetch();
  const categories = [...guild.channels.cache.values()].filter((channel) => channel.type === ChannelType.GuildCategory && normalize(channel.name) === normalize(CATEGORY_NAME));
  if (categories.length > 1) fail(409, 'Több BELV aktivitási kategória van; semmit nem módosítottam.');
  const category = categories[0] || null;
  if (category && category.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)) fail(403, 'A BELV aktivitási kategória jelenleg látható @everyone számára. Biztonságból nem módosítottam.');
  const channelMap = {};
  const conflicts = [];
  for (const spec of CHANNELS) {
    const all = [...guild.channels.cache.values()].filter((channel) => channel.type === ChannelType.GuildText && normalize(channel.name) === normalize(spec.name));
    const inCategory = all.filter((channel) => channel.parentId === category?.id);
    if (inCategory.length > 1 || all.length > 1) conflicts.push(spec.name + ': több azonos nevű csatorna');
    else if (all.length && !inCategory.length) conflicts.push(spec.name + ': már létezik a kategórián kívül; nem mozgatom és nem módosítom');
    channelMap[spec.key] = inCategory[0] || null;
  }
  if (conflicts.length) fail(409, conflicts.join('\n') + '\nA meglévő csatornákat nem módosítottam.');
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) fail(403, 'A Nexának hiányzik a Csatornák kezelése jogosultsága.');
  return { category, channelMap };
}
function rolePermissionOverwrites(guild, botMember, leadershipOnly = false, allowMemberMessages = false) {
  const rankRoles = [...guild.roles.cache.values()].filter((role) => classifyBelvRole(role, ROLE_MAP()));
  const leaderRoles = [...guild.roles.cache.values()].filter((role) => LEADER_NAMES.has(normalize(role.name)));
  const rankIds = new Set(rankRoles.map((role) => role.id));
  const leaders = new Set(leaderRoles.map((role) => role.id));
  const overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }];
  for (const role of rankRoles) overwrites.push({
    id: role.id,
    allow: leadershipOnly ? [] : [
      PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory,
      ...(allowMemberMessages ? [PermissionFlagsBits.SendMessages] : [])
    ],
    deny: leadershipOnly ? [PermissionFlagsBits.ViewChannel] : allowMemberMessages ? [] : [PermissionFlagsBits.SendMessages]
  });
  for (const role of leaderRoles) overwrites.push({
    id: role.id,
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
    deny: []
  });
  overwrites.push({
    id: botMember.id,
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages],
    deny: []
  });
  if (!rankIds.size && !leaders.size) fail(409, 'Nem találtam BELV-rangokat. A privát aktivitási csatornákat nem hoztam létre.');
  return overwrites;
}
async function upsertPanel(channel, botId, key, title, description, rows) {
  const footer = 'NexaBot • BELV aktivitás panel • ' + key;
  const embed = new EmbedBuilder().setColor(0x2e8b57).setTitle(title).setDescription(description).setFooter({ text: footer });
  const messages = await channel.messages.fetch({ limit: 50 });
  const previous = messages.find((message) => message.author?.id === botId && message.embeds[0]?.footer?.text === footer);
  const payload = { embeds: [embed] };
  if (rows?.length) payload.components = rows;
  if (previous) return previous.edit(payload);
  return channel.send(payload);
}
async function getRequirements() {
  return (await query('SELECT service_seconds,task_count,report_count FROM nexabot_belv_activity_requirements WHERE guild_id=$1', [BELV_GUILD_ID])).rows[0]
    || { service_seconds: 10800, task_count: 2, report_count: 1 };
}
async function setup(interaction) {
  const leader = await requireLeader(interaction);
  const guild = interaction.guild, botMember = guild.members.me || await guild.members.fetchMe();
  const plan = await resolvePlan(guild, botMember);
  await ensureSchema();
  let category = plan.category;
  const defaultOverwrites = rolePermissionOverwrites(guild, botMember, false);
  if (!category) category = await guild.channels.create({
    name: CATEGORY_NAME, type: ChannelType.GuildCategory, permissionOverwrites: defaultOverwrites,
    reason: 'BELV heti aktivitási szakasz • ' + interaction.user.id
  });
  const channels = { ...plan.channelMap };
  for (const spec of CHANNELS) {
    const allowMemberMessages = ['service', 'reports'].includes(spec.key);
    const rankRoles = allowMemberMessages
      ? [...guild.roles.cache.values()].filter((role) => classifyBelvRole(role, ROLE_MAP()))
      : [];
    if (channels[spec.key]) {
      if (allowMemberMessages) {
        for (const role of rankRoles) await channels[spec.key].permissionOverwrites.edit(role.id, {
          SendMessages: true
        }, { reason: 'BELV aktivitási üzenetek heti összesítése' });
      }
      continue;
    }
    const overwrites = spec.key === 'leadership'
      ? rolePermissionOverwrites(guild, botMember, true)
      : allowMemberMessages
        ? rolePermissionOverwrites(guild, botMember, false, true)
        : defaultOverwrites;
    channels[spec.key] = await guild.channels.create({
      name: spec.name, type: ChannelType.GuildText, parent: category.id,
      topic: 'NEXA BELV • heti aktivitási rendszer • ' + spec.key,
      permissionOverwrites: overwrites, reason: 'BELV heti aktivitás • ' + interaction.user.id
    });
  }
  const ids = Object.fromEntries(Object.entries(channels).map(([key, channel]) => [key, channel.id]));
  await query('INSERT INTO nexabot_belv_activity_config(guild_id,category_id,channels) VALUES($1,$2,$3::jsonb) ON CONFLICT(guild_id) DO UPDATE SET category_id=EXCLUDED.category_id,channels=EXCLUDED.channels,updated_at=NOW()', [guild.id, category.id, JSON.stringify(ids)]);
  const me = botMember.id;
  await upsertPanel(channels.service, me, 'service', '⏱️ BELV • Szolgálati idő', 'A szolgálat kizárólag RP-tevékenység idejére indítható. Egy taghoz egyszerre egy aktív szolgálat tartozhat.', [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('belv_activity:start').setLabel('🟢 Szolgálat megkezdése').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('belv_activity:stop').setLabel('🔴 Szolgálat befejezése').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('belv_activity:stats').setLabel('📊 Saját aktivitásom').setStyle(ButtonStyle.Secondary)
    )
  ]);
  await upsertPanel(channels.reports, me, 'reports', '📝 BELV • Heti aktivitási jelentés', 'A gombbal a jelenlegi Europe/Budapest szerinti héthez adhatsz be jelentést. A beküldés a vezetőségi csatornára kerül elbírálásra; csak a jóváhagyott feladatok számítanak. Az aktivitási kategória szolgálati és jelentési csatornáiban írt üzenetek bekerülnek a heti nyilvántartásba.', [
    new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('belv_activity:report').setLabel('📝 Heti jelentés beküldése').setStyle(ButtonStyle.Primary))
  ]);
  await upsertPanel(channels.leadership, me, 'leadership', '🔒 BELV • Aktivitásvezetőség', 'Itt jelennek meg a heti jelentések elbírálásra. Csak a BELV vezetői rangok, a szervertulajdonos és a NEXA owner láthatja.');
  await ensureBoard(guild, weekStartFor());
  await recordAudit('belv_activity_setup', { guildId: guild.id, actorId: leader.id, metadata: { categoryId: category.id, channels: ids } }).catch(() => null);
  return { category, channels };
}
async function getRosterIds(guild, weekStart) {
  const ids = new Set();
  const roster = await query('SELECT user_id FROM nexabot_belv_roster_badges WHERE guild_id=$1 AND active=TRUE', [guild.id]).catch(() => null);
  for (const row of roster?.rows || []) ids.add(String(row.user_id));
  const rows = await query(
    'SELECT user_id FROM nexabot_belv_activity_shifts WHERE guild_id=$1 AND started_at < $2 AND COALESCE(ended_at,NOW()) >= $3 UNION SELECT user_id FROM nexabot_belv_activity_reports WHERE guild_id=$1 AND week_start=$4 UNION SELECT user_id FROM nexabot_belv_activity_exemptions WHERE guild_id=$1 AND starts_on <= $5::date AND ends_on >= $6::date UNION SELECT user_id FROM nexabot_belv_activity_adjustments WHERE guild_id=$1 AND week_start=$4',
    [guild.id, localMidnightUtc(addDays(weekStart, 7)), localMidnightUtc(weekStart), weekStart, addDays(weekStart, 6), weekStart]
  );
  for (const row of rows.rows) ids.add(String(row.user_id));
  return [...ids];
}
async function statsFor(guildId, userId, weekStart) {
  const startAt = localMidnightUtc(weekStart), endAt = localMidnightUtc(addDays(weekStart, 7));
  const values = [guildId, String(userId), weekStart, startAt, endAt, addDays(weekStart, 6)];
  const row = (await query(
    'SELECT COALESCE((SELECT SUM(GREATEST(0,EXTRACT(EPOCH FROM (LEAST(COALESCE(ended_at,NOW()),$5::timestamptz)-GREATEST(started_at,$4::timestamptz))))) FROM nexabot_belv_activity_shifts WHERE guild_id=$1 AND user_id=$2 AND started_at<$5 AND COALESCE(ended_at,NOW())>$4),0)::int AS service_seconds, COALESCE((SELECT SUM(GREATEST(inspection_count,CASE WHEN BTRIM(tasks)<>\'\' THEN 1 ELSE 0 END)) FROM nexabot_belv_activity_reports WHERE guild_id=$1 AND user_id=$2 AND week_start=$3 AND status=\'approved\'),0)::int AS task_count, COUNT(*) FILTER (WHERE status=\'approved\')::int AS report_count, (array_agg(status ORDER BY updated_at DESC))[1] AS report_status, COALESCE((SELECT COUNT(*) FROM nexabot_belv_activity_messages WHERE guild_id=$1 AND user_id=$2 AND week_start=$3),0)::int AS message_count, (SELECT activity_text FROM (SELECT content AS activity_text,created_at FROM nexabot_belv_activity_messages WHERE guild_id=$1 AND user_id=$2 AND week_start=$3 UNION ALL SELECT tasks AS activity_text,updated_at AS created_at FROM nexabot_belv_activity_reports WHERE guild_id=$1 AND user_id=$2 AND week_start=$3 AND status=\'approved\') activity ORDER BY created_at DESC LIMIT 1) AS latest_activity FROM nexabot_belv_activity_reports WHERE guild_id=$1 AND user_id=$2 AND week_start=$3',
    values.slice(0, 5)
  )).rows[0] || {};
  const adjustments = (await query('SELECT COALESCE(SUM(service_seconds_delta),0)::int AS seconds, COALESCE(SUM(task_delta),0)::int AS tasks FROM nexabot_belv_activity_adjustments WHERE guild_id=$1 AND user_id=$2 AND week_start=$3', [guildId, String(userId), weekStart])).rows[0] || {};
  const exemption = (await query('SELECT 1 FROM nexabot_belv_activity_exemptions WHERE guild_id=$1 AND user_id=$2 AND starts_on <= $4::date AND ends_on >= $3::date LIMIT 1', [guildId, String(userId), weekStart, addDays(weekStart, 6)])).rowCount > 0;
  const requirements = await getRequirements();
  const serviceSeconds = Math.max(0, Number(row.service_seconds || 0) + Number(adjustments.seconds || 0));
  const taskCount = Math.max(0, Number(row.task_count || 0) + Number(adjustments.tasks || 0));
  const reportCount = Number(row.report_count || 0);
  const status = exemption ? '🟡 Igazolt távollét' :
    serviceSeconds >= Number(requirements.service_seconds) && taskCount >= Number(requirements.task_count) && reportCount >= Number(requirements.report_count)
      ? '✅ Aktív' : '❌ Nem teljesítette';
  return { serviceSeconds, taskCount, reportCount, reportStatus: row.report_status || null, messageCount: Number(row.message_count || 0), latestActivity: String(row.latest_activity || ''), exemption, status, requirements };
}
function duration(seconds) {
  const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60);
  return hours + ' óra ' + minutes + ' perc';
}
function statusLine(stats) { return '**Státusz:** ' + stats.status; }
async function memberReport(guild, userId, weekStart) {
  const stats = await statsFor(guild.id, userId, weekStart);
  return '**Hét:** ' + dateLabel(weekStart) + ' – ' + dateLabel(addDays(weekStart, 6)) +
    '\n⏱️ Szolgálat: ' + duration(stats.serviceSeconds) +
    '\n📋 Jóváhagyott ellenőrzések/feladatok: ' + stats.taskCount + ' / ' + stats.requirements.task_count +
    '\n📝 Jóváhagyott heti jelentés: ' + (stats.reportCount ? '✅ igen' : stats.reportStatus === 'pending' ? '⏳ elbírálás alatt' : stats.reportStatus === 'changes_requested' ? '🔄 hiánypótlás' : stats.reportStatus === 'rejected' ? '❌ elutasítva' : '— nincs') +
    '\n' + statusLine(stats);
}
async function summaryEmbeds(guild, weekStart, kind) {
  const ids = await getRosterIds(guild, weekStart);
  const entries = [];
  for (const userId of ids) {
    const stats = await statsFor(guild.id, userId, weekStart);
    entries.push({ userId, stats });
  }
  entries.sort((a, b) => {
    const score = (item) => item.stats.status.startsWith('✅') ? 2 : item.stats.status.startsWith('🟡') ? 1 : 0;
    return score(b) - score(a) || b.stats.serviceSeconds - a.stats.serviceSeconds || b.stats.taskCount - a.stats.taskCount;
  });
  const lines = entries.map((entry, index) =>
    (index + 1) + '. <@' + entry.userId + '> — ⏱️ ' + duration(entry.stats.serviceSeconds) +
    ' · 📋 ' + entry.stats.taskCount + ' · 📝 ' + (entry.stats.reportCount ? '✅' : entry.stats.reportStatus === 'pending' ? '⏳' : '—') +
    ' · 💬 ' + entry.stats.messageCount +
    (entry.stats.latestActivity ? ' · „' + entry.stats.latestActivity.replace(/\s+/g, ' ').slice(0, 100) + '”' : '') +
    ' · ' + entry.stats.status
  );
  const label = kind === 'final' ? 'VÉGLEGES HETI JELENTÉS' : kind === 'preview' ? 'VASÁRNAPI ELŐZETES' : 'AKTUÁLIS HETI ÁLLAPOT';
  const marker = 'NexaBot • BELV aktivitás • ' + weekStart + ' • ' + kind;
  const chunks = [];
  for (let index = 0; index < Math.max(1, lines.length); index += 20) chunks.push(lines.slice(index, index + 20));
  return chunks.map((chunk, index) => new EmbedBuilder().setColor(0x2e8b57)
    .setTitle(index === 0 ? '📊 BELV – ' + label : '📊 BELV – ' + label + ' (' + (index + 1) + ')')
    .setDescription('**Időszak:** ' + dateLabel(weekStart) + ' – ' + dateLabel(addDays(weekStart, 6)) +
      '\n\n' + (chunk.join('\n') || 'Még nincs nyilvántartott állománytag.'))
    .setFooter({ text: marker }).setTimestamp());
}
async function findMarkedMessage(channel, marker) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.find((message) => message.author?.bot && message.embeds.some((embed) => embed.footer?.text === marker)) || null;
}
async function ensureBoard(guild, weekStart) {
  const channel = await getChannel(guild, 'weekly');
  if (!channel) return null;
  const marker = 'NexaBot • BELV aktivitás • ' + weekStart + ' • board';
  const embeds = await summaryEmbeds(guild, weekStart, 'board');
  embeds.forEach((embed) => embed.setFooter({ text: marker }));
  const config = await getConfig(guild.id), storedId = config?.messages?.board;
  let previous = storedId ? await channel.messages.fetch(String(storedId)).catch(() => null) : null;
  if (!previous) previous = await findMarkedMessage(channel, marker);
  if (previous) {
    const edited = await previous.edit({ embeds });
    await query('UPDATE nexabot_belv_activity_config SET messages=messages || $2::jsonb,updated_at=NOW() WHERE guild_id=$1', [guild.id, JSON.stringify({ board: edited.id })]);
    return edited;
  }
  const message = await channel.send({ embeds });
  await query('UPDATE nexabot_belv_activity_config SET messages=messages || $2::jsonb,updated_at=NOW() WHERE guild_id=$1', [guild.id, JSON.stringify({ board: message.id })]);
  return message;
}
async function publishSnapshot(guild, weekStart, kind) {
  const channel = await getChannel(guild, 'weekly');
  if (!channel) return null;
  const marker = 'NexaBot • BELV aktivitás • ' + weekStart + ' • ' + kind;
  const existingRow = (await query('SELECT message_id FROM nexabot_belv_activity_summaries WHERE guild_id=$1 AND week_start=$2 AND kind=$3', [guild.id, weekStart, kind])).rows[0];
  if (existingRow?.message_id) return channel.messages.fetch(String(existingRow.message_id)).catch(() => null);
  await query('INSERT INTO nexabot_belv_activity_summaries(guild_id,week_start,kind,attempted_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(guild_id,week_start,kind) DO UPDATE SET attempted_at=NOW() WHERE nexabot_belv_activity_summaries.message_id IS NULL', [guild.id, weekStart, kind]);
  const duplicate = await findMarkedMessage(channel, marker);
  if (duplicate) {
    await query('UPDATE nexabot_belv_activity_summaries SET message_id=$4,attempted_at=NOW() WHERE guild_id=$1 AND week_start=$2 AND kind=$3', [guild.id, weekStart, kind, duplicate.id]);
    return duplicate;
  }
  const embeds = await summaryEmbeds(guild, weekStart, kind);
  const message = await channel.send({ embeds, allowedMentions: { parse: [] } });
  await query('UPDATE nexabot_belv_activity_summaries SET message_id=$4,attempted_at=NOW() WHERE guild_id=$1 AND week_start=$2 AND kind=$3', [guild.id, weekStart, kind, message.id]);
  return message;
}
async function refreshBoard(guild, weekStart = weekStartFor()) {
  try { await ensureBoard(guild, weekStart); }
  catch (error) { await recordError(error, { command: 'belv_activity_board', guildId: guild.id }).catch(() => null); }
}
async function runScheduled(client) {
  const guild = client.guilds.cache.get(BELV_GUILD_ID);
  if (!guild || !(await getConfig(guild.id))) return;
  const local = localDateParts();
  const currentStart = mondayOf(local.year + '-' + local.month + '-' + local.day);
  if (local.weekday === 'Sun' && Number(local.hour) >= 20) await publishSnapshot(guild, currentStart, 'preview');
  if (local.weekday === 'Mon') {
    const previousStart = addDays(currentStart, -7);
    const unsummarized = (await query('SELECT DISTINCT s.week_start::text AS week_start FROM (SELECT week_start FROM nexabot_belv_activity_reports WHERE guild_id=$1 UNION SELECT date_trunc(\'week\',started_at AT TIME ZONE \'Europe/Budapest\')::date AS week_start FROM nexabot_belv_activity_shifts WHERE guild_id=$1 UNION SELECT week_start FROM nexabot_belv_activity_adjustments WHERE guild_id=$1 UNION SELECT $2::date AS week_start) s LEFT JOIN nexabot_belv_activity_summaries a ON a.guild_id=$1 AND a.week_start=s.week_start AND a.kind=\'final\' AND a.message_id IS NOT NULL WHERE s.week_start < $2::date ORDER BY s.week_start LIMIT 10', [guild.id, currentStart])).rows;
    const candidates = new Set([previousStart, ...unsummarized.map((row) => String(row.week_start))]);
    for (const weekStart of [...candidates].sort()) await publishSnapshot(guild, weekStart, 'final');
  }
}
async function trackActivityMessage(message) {
  if (!message || message.guildId !== BELV_GUILD_ID || message.author?.bot) return false;
  const config = await getConfig(message.guildId);
  const channelId = String(message.channelId || message.channel?.id || '');
  if (!config || ![config.channels?.service, config.channels?.reports].some((id) => String(id || '') === channelId)) return false;
  const member = await freshMember(message.guild, message.author.id);
  if (!(await isRosterMember(member))) return false;
  const attachmentUrls = [...(message.attachments?.values?.() || [])].map((attachment) => attachment.url).filter(Boolean);
  const body = [String(message.content || '').trim(), ...attachmentUrls].filter(Boolean).join('\n').slice(0, 2000);
  if (!body) return false;
  const createdAt = new Date(message.createdTimestamp || Date.now());
  await query(
    'INSERT INTO nexabot_belv_activity_messages(guild_id,message_id,user_id,channel_id,week_start,content,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(guild_id,message_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,week_start=EXCLUDED.week_start,content=EXCLUDED.content,updated_at=NOW()',
    [BELV_GUILD_ID, String(message.id), String(message.author.id), channelId, weekStartFor(createdAt), body]
  );
  return true;
}
async function forgetActivityMessage(message) {
  if (!message || message.guildId !== BELV_GUILD_ID || !message.id) return false;
  await query('DELETE FROM nexabot_belv_activity_messages WHERE guild_id=$1 AND message_id=$2', [BELV_GUILD_ID, String(message.id)]);
  return true;
}
function startJobs(client) {
  if (!client || jobs.has(client)) return false;
  jobs.add(client);
  const run = () => runScheduled(client).catch((error) => recordError(error, { command: 'belv_activity_scheduler', guildId: BELV_GUILD_ID }).catch(() => null));
  const capture = (message) => trackActivityMessage(message).catch((error) => recordError(error, {
    command: 'belv_activity_message_capture', guildId: BELV_GUILD_ID, userId: message?.author?.id
  }).catch(() => null));
  client.on('messageCreate', capture);
  client.on('messageUpdate', (_before, after) => capture(after));
  client.on('messageDelete', (message) => forgetActivityMessage(message).catch((error) => recordError(error, {
    command: 'belv_activity_message_delete', guildId: BELV_GUILD_ID
  }).catch(() => null)));
  client.on('messageDeleteBulk', (messages) => Promise.all([...messages.values()].map((message) =>
    forgetActivityMessage(message).catch((error) => recordError(error, { command: 'belv_activity_message_bulk_delete', guildId: BELV_GUILD_ID }).catch(() => null))
  )));
  ensureSchema().then(run).catch((error) => recordError(error, { command: 'belv_activity_schema', guildId: BELV_GUILD_ID }).catch(() => null));
  const timer = setInterval(run, 60 * 1000);
  timer.unref?.();
  return true;
}
function rowButton(id, label, style) {
  return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style));
}
async function startShift(interaction) {
  const member = await requireRoster(interaction);
  const result = await query('INSERT INTO nexabot_belv_activity_shifts(guild_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id,started_at', [BELV_GUILD_ID, member.id]);
  if (!result.rowCount) fail(409, 'Már fut aktív szolgálatod. Előbb fejezd be.');
  await refreshBoard(interaction.guild);
  return '🟢 Szolgálat elkezdve: ' + new Date(result.rows[0].started_at).toLocaleString('hu-HU', { timeZone: TIMEZONE }) + '.';
}
async function stopShift(interaction) {
  const member = await requireRoster(interaction);
  const result = await query('UPDATE nexabot_belv_activity_shifts SET ended_at=NOW(),elapsed_seconds=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (NOW()-started_at)))::int) WHERE guild_id=$1 AND user_id=$2 AND ended_at IS NULL RETURNING elapsed_seconds', [BELV_GUILD_ID, member.id]);
  if (!result.rowCount) fail(404, 'Nincs aktív szolgálatod.');
  await refreshBoard(interaction.guild);
  return '🔴 Szolgálat befejezve. Rögzített idő: ' + duration(Number(result.rows[0].elapsed_seconds || 0)) + '.';
}
function reportModal() {
  const modal = new ModalBuilder().setCustomId('belv_activity:report_submit').setTitle('BELV • Heti aktivitási jelentés');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('period').setLabel('Hét / időszak').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tasks').setLabel('Elvégzett szolgálati feladatok').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inspections').setLabel('Végrehajtott ellenőrzések száma').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('evidence').setLabel('Kapcsolódó bizonyítékok vagy jelentések').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel('Egyéb megjegyzés (opcionális)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500))
  );
  return modal;
}
function decisionModal(reportId, status) {
  const modal = new ModalBuilder().setCustomId('belv_activity:decision_submit:' + reportId + ':' + status).setTitle(status === 'rejected' ? 'Jelentés elutasítása' : 'Hiánypótlás kérése');
  modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Indoklás').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)));
  return modal;
}
function submissionDecisionRows(id) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('belv_activity:approve:' + id).setLabel('✅ Jóváhagyás').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('belv_activity:reject:' + id).setLabel('❌ Elutasítás').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('belv_activity:changes:' + id).setLabel('🔄 Hiánypótlás').setStyle(ButtonStyle.Secondary)
  )];
}
async function submitReport(interaction) {
  const member = await requireRoster(interaction);
  const period = interaction.fields.getTextInputValue('period').trim();
  const tasks = interaction.fields.getTextInputValue('tasks').trim();
  const countText = interaction.fields.getTextInputValue('inspections').trim();
  const evidence = interaction.fields.getTextInputValue('evidence').trim();
  const notes = interaction.fields.getTextInputValue('notes').trim();
  if (!/^\d{1,3}$/.test(countText) || Number(countText) > 100) fail(400, 'Az ellenőrzések száma 0–100 közötti egész szám legyen.');
  const weekStart = weekStartFor();
  const channel = await getChannel(interaction.guild, 'leadership');
  if (!channel) fail(503, 'Az aktivitásvezetőségi csatorna hiányzik; a jelentést nem tudom elbírálásra küldeni.');
  const saved = await query(
    'INSERT INTO nexabot_belv_activity_reports(guild_id,user_id,week_start,stated_period,tasks,inspection_count,evidence,notes,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,\'pending\') ON CONFLICT(guild_id,user_id,week_start) DO UPDATE SET stated_period=EXCLUDED.stated_period,tasks=EXCLUDED.tasks,inspection_count=EXCLUDED.inspection_count,evidence=EXCLUDED.evidence,notes=EXCLUDED.notes,status=\'pending\',review_reason=NULL,reviewed_by=NULL,reviewed_at=NULL,updated_at=NOW() WHERE nexabot_belv_activity_reports.status IN (\'changes_requested\',\'rejected\') RETURNING id',
    [BELV_GUILD_ID, member.id, weekStart, period, tasks, Number(countText), evidence, notes]
  );
  if (!saved.rowCount) fail(409, 'Erre a hétre már van függő vagy jóváhagyott jelentésed.');
  const id = saved.rows[0].id;
  const embed = new EmbedBuilder().setColor(0x2e8b57).setTitle('📝 BELV heti aktivitási jelentés #' + id)
    .setDescription('**Beküldő:** <@' + member.id + '>\n**Hét:** ' + dateLabel(weekStart) + ' – ' + dateLabel(addDays(weekStart, 6)))
    .addFields(
      { name: 'Hét / időszak', value: period.slice(0, 1000) || '—' },
      { name: 'Elvégzett feladatok', value: tasks.slice(0, 1000) || '—' },
      { name: 'Végrehajtott ellenőrzések', value: countText },
      { name: 'Bizonyítékok / jelentések', value: evidence.slice(0, 1000) || '—' },
      { name: 'Egyéb megjegyzés', value: notes.slice(0, 500) || '—' }
    ).setFooter({ text: 'belv_activity_report:' + id });
  const message = await channel.send({ embeds: [embed], components: submissionDecisionRows(id), allowedMentions: { parse: [] } });
  await query('UPDATE nexabot_belv_activity_reports SET report_message_id=$2,report_channel_id=$3 WHERE guild_id=$1 AND id=$4', [BELV_GUILD_ID, message.id, channel.id, id]).catch(() => null);
  await refreshBoard(interaction.guild);
  return '✅ A heti jelentést rögzítettem, és a BELV vezetőségéhez továbbítottam.';
}
async function decideReport(interaction, reportId, status, reason = null) {
  const leader = await requireLeader(interaction);
  const report = (await query('UPDATE nexabot_belv_activity_reports SET status=$3,review_reason=$4,reviewed_by=$5,reviewed_at=NOW(),updated_at=NOW() WHERE guild_id=$1 AND id=$2 AND status=\'pending\' RETURNING *', [BELV_GUILD_ID, reportId, status, reason, leader.id])).rows[0];
  if (!report) fail(409, 'A jelentést már elbírálták vagy nem találom.');
  await recordAudit('belv_activity_report_decision', {
    guildId: BELV_GUILD_ID, actorId: leader.id, targetId: String(reportId),
    metadata: { status, reason: reason || null, userId: report.user_id, weekStart: report.week_start }
  }).catch(() => null);
  if (report.report_channel_id && report.report_message_id) {
    const channel = interaction.guild.channels.cache.get(String(report.report_channel_id));
    const message = await channel?.messages.fetch(String(report.report_message_id)).catch(() => null);
    if (message) {
      const old = message.embeds[0];
      const updated = EmbedBuilder.from(old).addFields({ name: status === 'approved' ? '✅ Jóváhagyta' : status === 'rejected' ? '❌ Elutasította' : '🔄 Hiánypótlás', value: '<@' + leader.id + '>' + (reason ? '\n' + reason : '') });
      await message.edit({ embeds: [updated], components: [] });
    }
  }
  await refreshBoard(interaction.guild, databaseDate(report.week_start));
  return status === 'approved' ? '✅ A jelentést jóváhagytad; az ellenőrzések beleszámítanak a hétbe.' :
    status === 'rejected' ? '❌ A jelentést elutasítottad.' : '🔄 Hiánypótlást kértél.';
}
async function statsEmbed(guild, userId, weekStart) {
  const stats = await statsFor(guild.id, userId, weekStart);
  return new EmbedBuilder().setColor(stats.status.startsWith('✅') ? 0x2e8b57 : stats.status.startsWith('🟡') ? 0xe0b02c : 0xb83240)
    .setTitle('📊 BELV • Heti aktivitás')
    .setDescription('**Állománytag:** <@' + userId + '>\n' + await memberReport(guild, userId, weekStart))
    .setFooter({ text: 'Időzóna: Europe/Budapest' }).setTimestamp();
}
async function handleCommand(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await requireGuild(interaction);
    const name = interaction.commandName;
    if (name === 'aktivitas-telepites') {
      const { category, channels } = await setup(interaction);
      return interaction.editReply('✅ BELV heti aktivitási rész létrehozva a ' + category.name + ' kategóriában.\nÚj/használt csatornák: ' + Object.values(channels).map((channel) => '#' + channel.name).join(', ') + '\nA meglévő BELV-funkciókat és a weboldalt nem módosítottam.');
    }
    if (name === 'aktivitas-megtekintes') {
      await requireLeader(interaction);
      const userId = interaction.options.getUser('tag')?.id || interaction.user.id;
      const weekStart = weekStartFor(new Date(), interaction.options.getString('hetkezdete'));
      return interaction.editReply({ embeds: [await statsEmbed(interaction.guild, userId, weekStart)] });
    }
    if (name === 'aktivitas-felmentes') {
      const leader = await requireLeader(interaction);
      const userId = interaction.options.getUser('tag', true).id;
      const start = dateOnly(interaction.options.getString('kezdete', true));
      const end = dateOnly(interaction.options.getString('vege', true));
      const reason = interaction.options.getString('indok', true).trim();
      if (!start || !end || end < start) fail(400, 'A felmentés dátumai YYYY-MM-DD formátumúak legyenek, a zárónap ne előzze meg a kezdőnapot.');
      const target = await freshMember(interaction.guild, userId);
      if (!(await isRosterMember(target))) fail(400, 'A kiválasztott felhasználó nem aktív BELV-állománytag.');
      const saved = await query('INSERT INTO nexabot_belv_activity_exemptions(guild_id,user_id,starts_on,ends_on,reason,approved_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id', [BELV_GUILD_ID, userId, start, end, reason, leader.id]);
      await recordAudit('belv_activity_exemption', { guildId: BELV_GUILD_ID, actorId: leader.id, targetId: userId, metadata: { exemptionId: saved.rows[0].id, start, end, reason } }).catch(() => null);
      await refreshBoard(interaction.guild);
      return interaction.editReply('🟡 Igazolt távollét rögzítve <@' + userId + '> számára ' + dateLabel(start) + '–' + dateLabel(end) + ' között.');
    }
    if (name === 'aktivitas-kovetelmeny') {
      const leader = await requireLeader(interaction);
      const hours = interaction.options.getInteger('orak', true), tasks = interaction.options.getInteger('feladatok', true), reports = interaction.options.getInteger('jelentesek', true);
      await query('INSERT INTO nexabot_belv_activity_requirements(guild_id,service_seconds,task_count,report_count,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT(guild_id) DO UPDATE SET service_seconds=EXCLUDED.service_seconds,task_count=EXCLUDED.task_count,report_count=EXCLUDED.report_count,updated_by=EXCLUDED.updated_by,updated_at=NOW()', [BELV_GUILD_ID, hours * 3600, tasks, reports, leader.id]);
      await recordAudit('belv_activity_requirements', { guildId: BELV_GUILD_ID, actorId: leader.id, metadata: { hours, tasks, reports } }).catch(() => null);
      await refreshBoard(interaction.guild);
      return interaction.editReply('✅ Új heti minimumok: ' + hours + ' óra, ' + tasks + ' jóváhagyott feladat/ellenőrzés, ' + reports + ' jóváhagyott jelentés.');
    }
    if (name === 'aktivitas-osszesites') {
      await requireLeader(interaction);
      const weekStart = weekStartFor(new Date(), interaction.options.getString('hetkezdete'));
      await refreshBoard(interaction.guild, weekStart);
      const roster = await getRosterIds(interaction.guild, weekStart);
      const blocks = [];
      for (const userId of roster.slice(0, 10)) blocks.push('<@' + userId + '> — ' + (await memberReport(interaction.guild, userId, weekStart)).replace(/\n/g, ' · '));
      return interaction.editReply('📊 BELV összesítés • ' + dateLabel(weekStart) + ' – ' + dateLabel(addDays(weekStart, 6)) + '\n' + (blocks.join('\n') || 'Nincs aktív állományi adat.') + (roster.length > 10 ? '\nA teljes ranglista a #heti-aktivitás csatornában van.' : ''));
    }
    if (name === 'aktivitas-korrekcio') {
      const leader = await requireLeader(interaction);
      const userId = interaction.options.getUser('tag', true).id;
      const weekStart = weekStartFor(new Date(), interaction.options.getString('hetkezdete', true));
      const minutes = interaction.options.getInteger('perc', true), taskDelta = interaction.options.getInteger('feladatok', true), reason = interaction.options.getString('indok', true).trim();
      if (!minutes && !taskDelta) fail(400, 'Adj meg szolgálati perc- vagy feladatszám-korrekciót.');
      const target = await freshMember(interaction.guild, userId);
      if (!(await isRosterMember(target))) fail(400, 'A kiválasztott felhasználó nem aktív BELV-állománytag.');
      const saved = await query('INSERT INTO nexabot_belv_activity_adjustments(guild_id,user_id,week_start,service_seconds_delta,task_delta,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id', [BELV_GUILD_ID, userId, weekStart, minutes * 60, taskDelta, reason, leader.id]);
      await recordAudit('belv_activity_correction', { guildId: BELV_GUILD_ID, actorId: leader.id, targetId: String(saved.rows[0].id), metadata: { userId, weekStart, minutes, taskDelta, reason } }).catch(() => null);
      await refreshBoard(interaction.guild, weekStart);
      return interaction.editReply('✅ Korrekció naplózva #' + saved.rows[0].id + ' azonosítóval.');
    }
    fail(404, 'Ismeretlen BELV aktivitási parancs.');
  } catch (error) {
    if (!error.status) await recordError(error, { command: interaction.commandName, guildId: interaction.guildId, userId: interaction.user?.id }).catch(() => null);
    return interaction.editReply('❌ ' + (error.status ? error.message : 'A BELV aktivitási művelet nem sikerült.'));
  }
}
async function handleButton(interaction) {
  const id = String(interaction.customId || '');
  if (!id.startsWith('belv_activity:')) return false;
  const action = id.split(':');
  try {
    await requireGuild(interaction);
    if (action[1] === 'report') {
      await requireRoster(interaction);
      return interaction.showModal(reportModal());
    }
    if (action[1] === 'reject' || action[1] === 'changes') {
      await requireLeader(interaction);
      return interaction.showModal(decisionModal(action[2], action[1] === 'reject' ? 'rejected' : 'changes_requested'));
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (action[1] === 'start') return interaction.editReply(await startShift(interaction));
    if (action[1] === 'stop') return interaction.editReply(await stopShift(interaction));
    if (action[1] === 'stats') {
      const member = await requireRoster(interaction), weekStart = weekStartFor();
      const active = (await query('SELECT started_at FROM nexabot_belv_activity_shifts WHERE guild_id=$1 AND user_id=$2 AND ended_at IS NULL LIMIT 1', [BELV_GUILD_ID, member.id])).rows[0];
      const embed = await statsEmbed(interaction.guild, member.id, weekStart);
      if (active) embed.addFields({ name: '⏱️ Aktív szolgálat', value: 'Kezdete: ' + new Date(active.started_at).toLocaleString('hu-HU', { timeZone: TIMEZONE }) });
      return interaction.editReply({ embeds: [embed] });
    }
    if (action[1] === 'approve') return interaction.editReply(await decideReport(interaction, action[2], 'approved'));
    return interaction.editReply('❌ Ismeretlen BELV aktivitási gomb.');
  } catch (error) {
    if (!error.status) await recordError(error, { command: 'belv_activity_button', guildId: interaction.guildId, userId: interaction.user?.id }).catch(() => null);
    const message = '❌ ' + (error.status ? error.message : 'A BELV aktivitási gomb nem hajtható végre.');
    if (interaction.deferred || interaction.replied) return interaction.editReply(message);
    return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
  }
}
async function handleModal(interaction) {
  const id = String(interaction.customId || '');
  if (!id.startsWith('belv_activity:')) return false;
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await requireGuild(interaction);
    const pieces = id.split(':');
    if (pieces[1] === 'report_submit') return interaction.editReply(await submitReport(interaction));
    if (pieces[1] === 'decision_submit') {
      const reportId = pieces[2], status = pieces[3];
      if (!['rejected', 'changes_requested'].includes(status)) fail(400, 'Érvénytelen jelentésdöntés.');
      const reason = interaction.fields.getTextInputValue('reason').trim();
      if (!reason) fail(400, 'A döntés indoka kötelező.');
      return interaction.editReply(await decideReport(interaction, reportId, status, reason));
    }
    return interaction.editReply('❌ Ismeretlen BELV aktivitási űrlap.');
  } catch (error) {
    if (!error.status) await recordError(error, { command: 'belv_activity_modal', guildId: interaction.guildId, userId: interaction.user?.id }).catch(() => null);
    return interaction.editReply('❌ ' + (error.status ? error.message : 'A BELV aktivitási űrlap nem menthető.'));
  }
}
module.exports = {
  BELV_GUILD_ID, CATEGORY_NAME, CHANNELS, buildCommands, syncGuildCommands, removeCommands,
  ensureSchema, startJobs, handleCommand, handleButton, handleModal, weekStartFor,
  statsFor, summaryEmbeds, setup, isLeader, isRosterMember
};
