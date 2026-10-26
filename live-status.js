// NEXA LIVE read-only status panels for the optional "NEXA LIVE" category.
// Loaded with `node -r ./live-status.js index.js` so it can coexist with the packed runtime.
const { Client, Events, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { Pool } = require('pg');
const { getBotOwnerId, isBotOwner } = require('./config');
const { randomInt } = require('node:crypto');

const PANEL_FOOTERS = {
  voice: 'NEXA LIVE • voice',
  shift: 'NEXA LIVE • shift',
  overview: 'NEXA LIVE • overview',
  members: 'NEXA LIVE • members',
  tickets: 'NEXA LIVE • tickets',
  system: 'NEXA LIVE • system'
};
const panelState = new Map();
const lastErrorAt = new Map();
const watchedClients = new WeakSet();
const consumedDeleteInteractions = new WeakSet();
const consumedMemberInfoInteractions = new WeakSet();
const consumedAfkInteractions = new WeakSet();
const consumedAfkMessages = new WeakSet();
const consumedDiceInteractions = new WeakSet();
const consumedBelvPermissionInteractions = new WeakSet();
const afkMembers = new Map();
let pool;

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function safeText(value, limit = 80) {
  return String(value || '').replace(/@/g, '@\u200b').replace(/[\r\n]+/g, ' ').slice(0, limit);
}

function database() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
  }
  return pool;
}

function findCategory(guild) {
  return guild.channels.cache.find((channel) =>
    channel.type === ChannelType.GuildCategory && normalize(channel.name) === 'nexalive'
  ) || null;
}

function findTarget(guild, category, kind) {
  const accepted = {
    voice: ['hangaktivitas', 'voiceactivity'],
    shift: ['szolgalat', 'duty', 'shift'],
    overview: ['eloattekintes', 'liveoverview'],
    members: ['tagletszam', 'membercount', 'members'],
    tickets: ['ticketallapot', 'ticketstatus'],
    system: ['rendszerallapot', 'systemstatus']
  }[kind];
  if (!accepted) return null;
  const names = new Set(accepted);
  return guild.channels.cache.find((channel) =>
    channel.parentId === category.id && channel.isTextBased?.() && !channel.isThread?.() && names.has(normalize(channel.name))
  ) || null;
}

function voiceMemberCount(guild) {
  let total = 0;
  for (const channel of guild.channels.cache.values()) {
    if (![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) continue;
    total += [...(channel.members?.values?.() || [])].filter((member) => !member.user.bot).length;
  }
  return total;
}

function activeVoiceChannelCount(guild) {
  return [...guild.channels.cache.values()].filter((channel) =>
    [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type) &&
    [...(channel.members?.values?.() || [])].some((member) => !member.user.bot)
  ).length;
}

function activeVoiceDescription(guild) {
  const channels = [...guild.channels.cache.values()]
    .filter((channel) => [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type));
  const sections = [];
  for (const channel of channels) {
    const members = [...(channel.members?.values?.() || [])].filter((member) => !member.user.bot);
    if (!members.length) continue;
    const names = members.map((member) => `• ${safeText(member.displayName || member.user.username)}`);
    sections.push(`**${safeText(channel.name)}** · ${members.length}\n${names.join('\n')}`);
  }
  return sections.length ? sections.join('\n\n').slice(0, 3800) : '🔇 Jelenleg senki nincs hangcsatornában.';
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours} óra ${minutes} perc` : `${minutes} perc`;
}

async function activeShiftDescription(client, guild) {
  const db = database();
  if (!db) return { description: '⚠️ A szolgálati adatbázis nincs beállítva.', signature: 'db-missing' };
  const { rows } = await db.query(
    `SELECT user_id, started_at, break_started_at, break_seconds
       FROM nexabot_shifts
      WHERE guild_id = $1 AND ended_at IS NULL
      ORDER BY started_at ASC
      LIMIT 100`,
    [guild.id]
  );
  const missingMemberIds = [...new Set(rows
    .map((row) => String(row.user_id))
    .filter((id) => !guild.members.cache.has(id)))];
  if (missingMemberIds.length) {
    await guild.members.fetch({ user: missingMemberIds }).catch(() => null);
  }
  const unresolvedUserIds = [...new Set(rows
    .map((row) => String(row.user_id))
    .filter((id) => !guild.members.cache.has(id) && !client.users.cache.has(id)))];
  await Promise.all(unresolvedUserIds.map((id) => client.users.fetch(id).catch(() => null)));
  const now = Date.now();
  const lines = rows.map((row) => {
    const userId = String(row.user_id);
    const member = guild.members.cache.get(userId);
    const user = member?.user || client.users.cache.get(userId);
    const name = safeText(member?.displayName || user?.globalName || user?.username || 'Ismeretlen tag');
    const startedAt = new Date(row.started_at);
    const pausedSeconds = Number(row.break_seconds || 0) + (row.break_started_at
      ? Math.max(0, Math.floor((now - new Date(row.break_started_at).getTime()) / 1000))
      : 0);
    const elapsedSeconds = Math.max(0, Math.floor((now - startedAt.getTime()) / 1000) - pausedSeconds);
    const pause = row.break_started_at ? ' · ☕ szüneten' : '';
    return `• **${name}** — ${formatDuration(elapsedSeconds)}${pause} · kezdés <t:${Math.floor(startedAt.getTime() / 1000)}:t>`;
  });
  if (rows.length > 100) lines.push(`… és további ${rows.length - 100} aktív szolgálat.`);
  return {
    description: lines.length ? lines.join('\n').slice(0, 3800) : '⚫ Jelenleg senki nincs szolgálatban.',
    signature: `${lines.join('\n')}:${Math.floor(now / 60_000)}`
  };
}

async function ticketCounts(guildId) {
  const db = database();
  if (!db) return null;
  const result = await db.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'open')::int AS open,
            COUNT(*) FILTER (WHERE status = 'open' AND claimed_by IS NOT NULL)::int AS claimed,
            COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
            COUNT(*)::int AS total
       FROM nexabot_tickets
      WHERE guild_id = $1`,
    [guildId]
  );
  return result.rows[0] || { open: 0, claimed: 0, closed: 0, total: 0 };
}

async function liveOverview(client, guild) {
  const db = database();
  if (!db) return { description: '⚠️ Az élő áttekintéshez nincs adatbázis-kapcsolat.', signature: 'db-missing' };
  const [shifts, tickets] = await Promise.all([
    db.query('SELECT COUNT(*)::int AS count FROM nexabot_shifts WHERE guild_id = $1 AND ended_at IS NULL', [guild.id]),
    db.query("SELECT COUNT(*)::int AS count FROM nexabot_tickets WHERE guild_id = $1 AND status = 'open'", [guild.id])
  ]);
  const voiceCount = voiceMemberCount(guild);
  const description = [
    `👥 **Tagok:** ${Number(guild.memberCount || 0).toLocaleString('hu-HU')}`,
    `🎙️ **Hangcsatornában:** ${voiceCount}`,
    `⏱️ **Szolgálatban:** ${Number(shifts.rows[0]?.count || 0)}`,
    `🎫 **Nyitott ticket:** ${Number(tickets.rows[0]?.count || 0)}`
  ].join('\n');
  return { description, signature: description };
}

async function memberCountPanel(guild) {
  const total = Number(guild.memberCount || 0);
  const description = [
    `👥 **Teljes taglétszám:** ${total.toLocaleString('hu-HU')}`,
    `🔊 **Most VC-ben:** ${voiceMemberCount(guild).toLocaleString('hu-HU')}`,
    `🎙️ **Aktív hangcsatornák:** ${activeVoiceChannelCount(guild).toLocaleString('hu-HU')}`
  ].join('\n');
  return { description, signature: description };
}

async function ticketStatusPanel(guild) {
  const counts = await ticketCounts(guild.id);
  if (!counts) return { description: '⚠️ A ticket-adatbázis nem érhető el.', signature: 'db-missing' };
  const open = Number(counts.open || 0);
  const closed = Number(counts.closed || 0);
  const claimed = Number(counts.claimed || 0);
  const description = [
    `🎫 **Nyitott:** ${open.toLocaleString('hu-HU')}`,
    `🧑‍💻 **Kezelt:** ${claimed.toLocaleString('hu-HU')}`,
    `✅ **Lezárt:** ${closed.toLocaleString('hu-HU')}`,
    `📊 **Összes rögzített:** ${Number(counts.total || 0).toLocaleString('hu-HU')}`
  ].join('\n');
  return { description, signature: description };
}

async function systemStatusPanel(client) {
  const db = database();
  let databaseState = '⚫ Nincs konfigurálva';
  if (db) {
    try {
      await db.query('SELECT 1');
      databaseState = '🟢 Kapcsolódik';
    } catch {
      databaseState = '🔴 Nem elérhető';
    }
  }
  const ping = Number.isFinite(client.ws.ping) ? `${Math.max(0, Math.round(client.ws.ping))} ms` : 'mérés alatt';
  const seconds = Math.max(0, Math.floor(process.uptime()));
  const uptime = formatDuration(seconds);
  const description = [
    `🤖 **NEXA:** 🟢 Online`,
    `📡 **Discord-késleltetés:** ${ping}`,
    `🗄️ **Adatbázis:** ${databaseState}`,
    `⏳ **Futásidő:** ${uptime}`,
    `🌐 **Szerverek:** ${client.guilds.cache.size.toLocaleString('hu-HU')}`
  ].join('\n');
  return { description, signature: `${description}:${Math.floor(Date.now() / 60_000)}` };
}

async function updatePanel(client, guild, channel, kind) {
  const key = `${guild.id}:${kind}`;
  const footer = PANEL_FOOTERS[kind];
  let description;
  let signature;
  if (kind === 'voice') {
    description = activeVoiceDescription(guild);
    signature = description;
  } else if (kind === 'overview') {
    ({ description, signature } = await liveOverview(client, guild));
  } else if (kind === 'members') {
    ({ description, signature } = await memberCountPanel(guild));
  } else if (kind === 'tickets') {
    ({ description, signature } = await ticketStatusPanel(guild));
  } else if (kind === 'system') {
    ({ description, signature } = await systemStatusPanel(client));
  } else {
    ({ description, signature } = await activeShiftDescription(client, guild));
  }

  const previous = panelState.get(key);
  if (previous?.channelId === channel.id && previous.signature === signature) return;
  const embed = new EmbedBuilder()
    .setColor(kind === 'voice' ? 0x58a6ff : kind === 'system' ? 0xe7b96e : 0x57d39b)
    .setTitle({
      voice: '🎙️ Aktív hangcsatornák',
      shift: '⏱️ Aktív szolgálatok',
      overview: '📡 Élő szerveráttekintés',
      members: '👥 Taglétszám',
      tickets: '🎫 Ticket-állapot',
      system: '🖥️ NEXA rendszerállapot'
    }[kind])
    .setDescription(description)
    .setTimestamp(new Date())
    .setFooter({ text: footer });

  let message = previous?.channelId === channel.id && previous.messageId
    ? await channel.messages.fetch(previous.messageId).catch(() => null)
    : null;
  if (!message) {
    const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (!recent && previous?.channelId === channel.id && previous.messageId) return;
    message = recent?.find((item) => item.author.id === client.user.id && item.embeds.some((entry) => entry.footer?.text === footer)) || null;
  }
  message = message
    ? await message.edit({ embeds: [embed], allowedMentions: { parse: [] } })
    : await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  panelState.set(key, { channelId: channel.id, messageId: message.id, signature });
}

function reportError(guildId, kind, error) {
  const key = `${guildId}:${kind}`;
  const now = Date.now();
  if (now - (lastErrorAt.get(key) || 0) < 300_000) return;
  lastErrorAt.set(key, now);
  console.error(`NEXA LIVE ${kind} frissítési hiba (${guildId}):`, error.message);
}

const deleteMessagesCommand = new SlashCommandBuilder()
  .setName('uzenet')
  .setDescription('Üzenetek kezelése a jelenlegi csatornában.')
  .setDMPermission(false)
  .addSubcommand((subcommand) => subcommand
    .setName('torles')
    .setDescription('Törli a legutóbbi üzeneteket a csatornából.')
    .addIntegerOption((option) => option
      .setName('szam')
      .setDescription('Hány korábbi üzenetet töröljön? (1–100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true)))
  .toJSON();

const memberInfoCommand = new SlashCommandBuilder()
  .setName('taginfo')
  .setDescription('Megmutatja egy szervertag alapadatait.')
  .setDMPermission(false)
  .addUserOption((option) => option
    .setName('tag')
    .setDescription('A szervertag, akiről információt kérsz.')
    .setRequired(true))
  .toJSON();

const afkCommand = new SlashCommandBuilder()
  .setName('afk')
  .setDescription('Beállítja a távollétedet; említéskor a bot jelzi, hogy AFK vagy.')
  .setDescriptionLocalizations({ 'en-US': 'Set your AFK status; the bot tells others when they mention you.', 'en-GB': 'Set your AFK status; the bot tells others when they mention you.' })
  .setDMPermission(false)
  .addStringOption((option) => option
    .setName('reason')
    .setNameLocalizations({ 'hu': 'uzenet' })
    .setDescription('Opcionális távolléti üzenet.')
    .setDescriptionLocalizations({ 'en-US': 'Optional AFK message.', 'en-GB': 'Optional AFK message.' })
    .setMaxLength(160))
  .toJSON();

const afkOffCommand = new SlashCommandBuilder()
  .setName('afk-ki')
  .setNameLocalizations({ 'en-US': 'afk-off', 'en-GB': 'afk-off' })
  .setDescription('Kikapcsolja a távolléti állapotodat.')
  .setDescriptionLocalizations({ 'en-US': 'Turn off your AFK status.', 'en-GB': 'Turn off your AFK status.' })
  .setDMPermission(false)
  .toJSON();

const belvPermissionsCommand = new SlashCommandBuilder()
  .setName('belv-jogok')
  .setNameLocalizations({ 'en-US': 'belv-permissions', 'en-GB': 'belv-permissions' })
  .setDescription('Ellenőrzi vagy beállítja a BELV rendfokozati csatornajogokat.')
  .setDescriptionLocalizations({ 'en-US': 'Preview or apply BELV rank-based channel permissions.', 'en-GB': 'Preview or apply BELV rank-based channel permissions.' })
  .setDMPermission(false)
  .addBooleanOption((option) => option
    .setName('apply')
    .setNameLocalizations({ 'hu': 'alkalmaz' })
    .setDescription('Igaz értékkel alkalmazza a csatornajogokat; hamis értékkel csak ellenőriz.')
    .setDescriptionLocalizations({ 'en-US': 'True applies permissions; false only previews them.', 'en-GB': 'True applies permissions; false only previews them.' })
    .setRequired(true))
  .toJSON();

const diceCommand = new SlashCommandBuilder()
  .setName('kocka')
  .setNameLocalizations({ 'en-US': 'dice', 'en-GB': 'dice' })
  .setDescription('Dob egy vagy több kockával.')
  .setDescriptionLocalizations({ 'en-US': 'Roll one or more dice.', 'en-GB': 'Roll one or more dice.' })
  .setDMPermission(false)
  .addIntegerOption((option) => option
    .setName('sides')
    .setNameLocalizations({ 'hu': 'oldal' })
    .setDescription('A kocka oldalainak száma.')
    .setDescriptionLocalizations({ 'en-US': 'Number of sides on each die.', 'en-GB': 'Number of sides on each die.' })
    .addChoices(
      { name: '4', value: 4 }, { name: '6', value: 6 }, { name: '8', value: 8 },
      { name: '10', value: 10 }, { name: '12', value: 12 }, { name: '20', value: 20 }, { name: '100', value: 100 }
    )
    .setRequired(true))
  .addIntegerOption((option) => option
    .setName('count')
    .setNameLocalizations({ 'hu': 'darab' })
    .setDescription('Hány kockával dobjon? (1–20)')
    .setDescriptionLocalizations({ 'en-US': 'How many dice to roll? (1–20)', 'en-GB': 'How many dice to roll? (1–20)' })
    .setMinValue(1)
    .setMaxValue(20))
  .toJSON();

async function ensureDeleteMessagesCommand(client) {
  try {
    const commands = await client.application.commands.fetch();
    const existing = commands.find((command) => command.name === 'uzenet');
    if (existing) {
      const alreadyPresent = existing.options?.some((option) =>
        option.name === 'torles' && option.options?.some((child) => child.name === 'szam')
      );
      if (alreadyPresent) return;
      const existingOptions = existing.options || [];
      const newSubcommand = deleteMessagesCommand.options[0];
      await existing.edit({
        name: existing.name,
        description: existing.description || deleteMessagesCommand.description,
        options: [...existingOptions, newSubcommand]
      });
      return;
    }
    await client.application.commands.create(deleteMessagesCommand);
  } catch (error) {
    console.error('A /uzenet torles parancs regisztrálása nem sikerült:', error.message);
  }
}

async function ensureMemberInfoCommand(client) {
  try {
    const commands = await client.application.commands.fetch();
    if (commands.some((command) => command.name === memberInfoCommand.name)) return;
    await client.application.commands.create(memberInfoCommand);
  } catch (error) {
    console.error('A /taginfo parancs regisztrálása nem sikerült:', error.message);
  }
}

async function ensureDiceCommand(client) {
  let registered = 0;
  for (const guild of client.guilds.cache.values()) {
    try {
      await client.application.commands.create(diceCommand, guild.id);
      registered += 1;
    } catch (error) {
      console.error('A /kocka parancs regisztrálása nem sikerült (' + guild.id + '):', error.message);
    }
  }
  console.info('A /kocka (/dice) parancs regisztrálva: ' + registered + '/' + client.guilds.cache.size + ' szerver.');
}

const BELV_RANK_BANDS = [
  ['chief', 1, 1, 'Főigazgató'], ['chiefDeputy', 2, 2, 'Főigazgató-helyettes'],
  ['director', 3, 3, 'Igazgató'], ['directorDeputy', 4, 9, 'Igazgatóhelyettes'],
  ['departmentChief', 10, 14, 'Főosztályvezető'], ['operationsLead', 15, 19, 'Műveleti vezető'],
  ['inspectionLead', 20, 24, 'Ellenőrzési vezető'], ['chiefInspector', 25, 34, 'Főellenőr'],
  ['leadOfficer', 35, 39, 'Vezető tiszt'], ['officer', 40, 49, 'Belvédelmi tiszt'],
  ['leadAgent', 50, 59, 'Vezető ügynök'], ['specialAgent', 60, 69, 'Különleges ügynök'],
  ['agent', 70, 89, 'Belvédelmi ügynök'], ['candidate', 90, 99, 'Belvédelmi jelölt']
];
const BELV_TOP = ['chief', 'chiefDeputy', 'director', 'directorDeputy'];
const BELV_CHANNEL_RULES = [
  ['utasítások', BELV_TOP], ['körlevelek', BELV_TOP],
  ['belső-vizsgálatok', BELV_TOP.concat(['departmentChief', 'inspectionLead', 'chiefInspector'])],
  ['heti-ellenőrzési-feladat', BELV_TOP.concat(['departmentChief'])],
  ['ügyiratok', BELV_TOP.concat(['departmentChief', 'operationsLead', 'inspectionLead', 'chiefInspector'])],
  ['vizsgálati-jelentések', BELV_TOP.concat(['departmentChief', 'inspectionLead', 'chiefInspector'])],
  ['feljegyzések-megrovások', ['departmentChief', 'chiefInspector', 'leadOfficer']],
  ['intézkedési-jelentések', BELV_TOP.concat(['operationsLead', 'leadOfficer', 'officer', 'leadAgent', 'specialAgent', 'agent', 'candidate'])],
  ['helyszíni-intézkedések', BELV_TOP.concat(['operationsLead', 'leadOfficer', 'officer', 'specialAgent', 'agent'])],
  ['rendkívüli-események', BELV_TOP.concat(['operationsLead', 'leadOfficer', 'specialAgent'])],
  ['jegyzőkönyv', BELV_TOP.concat(['inspectionLead', 'chiefInspector'])],
  ['fegyelmi-eljárások', BELV_TOP.concat(['inspectionLead'])],
  ['igazoltatások', BELV_TOP.concat(['officer', 'leadAgent', 'specialAgent', 'agent', 'candidate'])],
  ['közúti-ellenőrzések', BELV_TOP.concat(['officer', 'leadAgent', 'agent', 'candidate'])],
  ['előállítások', BELV_TOP.concat(['officer', 'leadAgent', 'agent'])]
];

function belvTierForRole(role) {
  const name = normalize(role.name);
  const code = name.match(/bv(\d{1,2})/);
  if (code) {
    const number = Number(code[1]);
    const band = BELV_RANK_BANDS.find(([, first, last]) => number >= first && number <= last);
    if (band) return band[0];
  }
  const aliases = [
    ['chiefDeputy', 'foigazgatohelyettes'], ['chief', 'foigazgato'],
    ['directorDeputy', 'igazgatohelyettes'], ['director', 'igazgato'],
    ['departmentChief', 'foosztalyvezeto'], ['operationsLead', 'muveletivezeto'],
    ['inspectionLead', 'ellenorzesivezeto'], ['chiefInspector', 'foellenor'],
    ['leadOfficer', 'vezetotiszt'], ['specialAgent', 'kulonlegesugynok'],
    ['leadAgent', 'vezetougynok'], ['candidate', 'belvedelmijelolt'],
    ['officer', 'belvedelmitiszt'], ['agent', 'belvedelmiugynok']
  ];
  return aliases.find(([, alias]) => name.includes(alias))?.[0] || null;
}

async function getBelvGuildId() {
  const configured = String(process.env.BELV_MDT_GUILD_ID || '').trim();
  if (/^\\d{16,22}$/.test(configured)) return configured;
  const db = database();
  if (!db) return null;
  try {
    const result = await db.query("SELECT guild_id FROM nexabot_mdt_scope WHERE scope_key='belv' LIMIT 1");
    return result.rows[0]?.guild_id ? String(result.rows[0].guild_id) : null;
  } catch (error) {
    console.error('A BELV-szerver azonosítóját nem sikerült lekérni:', error.message);
    return null;
  }
}

async function ensureBelvPermissionsCommand(client) {
  const guildId = await getBelvGuildId();
  if (!guildId || !client.guilds.cache.has(guildId)) {
    console.error('A BELV rendfokozati parancs kihagyva: a BELV szerver nincs beállítva vagy a bot nem tagja.');
    return;
  }
  try {
    await client.application.commands.create(belvPermissionsCommand, guildId);
    console.info('A /belv-jogok parancs regisztrálva a BELV szerveren.');
  } catch (error) {
    console.error('A /belv-jogok parancs regisztrálása nem sikerült:', error.message);
  }
}

async function handleBelvPermissionsCommand(interaction) {
  if (!interaction.inGuild()) return interaction.reply({ content: '❌ Ezt a parancsot a BELV szerveren használd.', flags: MessageFlags.Ephemeral });
  if (!isBotOwner(interaction.user.id)) return interaction.reply({ content: '❌ Ezt csak a NEXA fő tulajdonosa használhatja.', flags: MessageFlags.Ephemeral });
  const targetGuildId = await getBelvGuildId();
  if (!targetGuildId || interaction.guildId !== targetGuildId) return interaction.reply({ content: '❌ Ez a parancs kizárólag a beállított BELV szerveren használható.', flags: MessageFlags.Ephemeral });
  const applyOption = interaction.options.data?.find((option) => option.name === 'apply' || option.name === 'alkalmaz');
  const shouldApply = applyOption?.value === true;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await interaction.guild.channels.fetch();
    await interaction.guild.roles.fetch();
    const roleGroups = new Map(BELV_RANK_BANDS.map(([key]) => [key, []]));
    for (const role of interaction.guild.roles.cache.values()) {
      if (role.id === interaction.guild.id || role.managed) continue;
      const tier = belvTierForRole(role);
      if (tier) roleGroups.get(tier).push(role);
    }
    const chiefUserIds = new Set();
    if (!roleGroups.get('chief').length) {
      const botOwnerId = getBotOwnerId();
      const botOwner = botOwnerId ? await interaction.guild.members.fetch(botOwnerId).catch(() => null) : null;
      if (botOwner) chiefUserIds.add(botOwner.id);
      if (interaction.guild.ownerId) chiefUserIds.add(interaction.guild.ownerId);
    }
    const missingRoles = BELV_RANK_BANDS
      .filter(([key]) => !roleGroups.get(key).length && !(key === 'chief' && chiefUserIds.size))
      .map(([, , , label]) => label);
    const matchedChannels = [];
    const foundChannelNames = new Set();
    const missingChannels = [];
    for (const [channelName, tiers] of BELV_CHANNEL_RULES) {
      const matches = [...interaction.guild.channels.cache.values()].filter((channel) =>
        channel.isTextBased?.() && !channel.isThread?.() && normalize(channel.name) === normalize(channelName)
      );
      if (!matches.length) missingChannels.push(channelName);
      else foundChannelNames.add(normalize(channelName));
      for (const channel of matches) matchedChannels.push({ channel, tiers });
    }
    const summary = '📋 **BELV rendfokozati jogok ellenőrzése**\n' +
      'Felismert rangcsoportok: **' + (BELV_RANK_BANDS.length - missingRoles.length) + '/' + BELV_RANK_BANDS.length + '**\n' +
      'Felismert csatornanevek: **' + foundChannelNames.size + '/' + new Set(BELV_CHANNEL_RULES.map(([name]) => normalize(name))).size + '** (' + matchedChannels.length + ' tényleges csatorna)\n' +
      (missingRoles.length ? 'Hiányzó rangok: ' + missingRoles.join(', ') + '\n' : '') +
      (missingChannels.length ? 'Hiányzó csatornák: ' + missingChannels.join(', ') + '\n' : '');
    if (!matchedChannels.length) return interaction.editReply('❌ Nem találtam meg a megadott BELV-csatornákat. Ellenőrizd a csatornaneveket.');
    if (!shouldApply) return interaction.editReply(summary + '\nEllenőrző mód: semmit nem módosítottam. Ha a lista megfelelő, futtasd újra az apply opcióval.');
    if (missingRoles.length || missingChannels.length) return interaction.editReply(summary + '\n❌ Nem alkalmaztam a beállítást, mert hiányos a rang- vagy csatornalista.');
    const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.editReply('❌ A Nexának **Csatornák kezelése** jogosultság kell. Nem változtattam semmin.');
    const changedRoleIds = new Map();
    for (const [key, roles] of roleGroups) for (const role of roles) changedRoleIds.set(role.id, key);
    const botRoleIds = new Set(botMember.roles.cache.keys());
    let changedChannels = 0;
    for (const { channel, tiers } of matchedChannels) {
      const allowedRoleIds = new Set(tiers.flatMap((tier) => roleGroups.get(tier).map((role) => role.id)));
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { SendMessages: false }, { reason: 'BELV rendfokozati írási jogosultságok' });
      for (const overwrite of [...channel.permissionOverwrites.cache.values()]) {
        if (overwrite.id === interaction.guild.id || overwrite.type === 0 && allowedRoleIds.has(overwrite.id) || overwrite.type === 0 && botRoleIds.has(overwrite.id)) continue;
        if (!overwrite.allow.has(PermissionFlagsBits.SendMessages)) continue;
        if (overwrite.type === 0) {
          const role = interaction.guild.roles.cache.get(overwrite.id);
          if (role?.managed) continue;
          await channel.permissionOverwrites.edit(overwrite.id, { SendMessages: false }, { reason: 'BELV rendfokozati jog: nem engedélyezett rang' });
        } else if (overwrite.type === 1) {
          const member = await interaction.guild.members.fetch(overwrite.id).catch(() => null);
          if (member?.user.bot || [...(member?.roles.cache.keys() || [])].some((id) => allowedRoleIds.has(id))) continue;
          await channel.permissionOverwrites.edit(overwrite.id, { SendMessages: false }, { reason: 'BELV rendfokozati jog: nem engedélyezett egyéni kivétel' });
        }
      }
      for (const roleId of allowedRoleIds) await channel.permissionOverwrites.edit(roleId, { SendMessages: true }, { reason: 'BELV rendfokozati jog: engedélyezett rang' });
      if (tiers.includes('chief')) {
        for (const userId of chiefUserIds) {
          if (userId !== botMember.id) await channel.permissionOverwrites.edit(userId, { SendMessages: true }, { type: 1, reason: 'BELV rendfokozati jog: Főigazgató tulajdonosi jogosultság' }).catch(() => null);
        }
      }
      await channel.permissionOverwrites.edit(botMember.id, { SendMessages: true }, { type: 1, reason: 'NEXA botműködés fenntartása a BELV-csatornákban' }).catch(() => null);
      changedChannels += 1;
    }
    return interaction.editReply(summary + '\n✅ Beállítottam a **' + changedChannels + '** felsorolt BELV-csatorna írási jogait. Az olvasási jogokat nem módosítottam.');
  } catch (error) {
    console.error('A BELV rendfokozati jogok szinkronja nem sikerült:', error.message);
    return interaction.editReply('❌ Nem sikerült alkalmazni a jogosultságokat. Ellenőrizd a Nexa csatornakezelési jogát. Ha a frissítés megszakadt, nézd át a csatornákat.');
  }
}

async function ensureAfkCommand(client) {
  const commandDefinitions = [afkCommand, afkOffCommand];
  for (const definition of commandDefinitions) {
    try {
      const commands = await client.application.commands.fetch();
      const globalCommand = commands.find((command) => command.name === definition.name);
      if (globalCommand) await globalCommand.delete();
    } catch (error) {
      console.error(`A globális /${definition.name} parancs eltávolítása nem sikerült:`, error.message);
    }
  }
  let registeredAfk = 0;
  let registeredAfkOff = 0;
  for (const guild of client.guilds.cache.values()) {
    for (const [definition, counter] of [[afkCommand, 'afk'], [afkOffCommand, 'afkOff']]) {
      try {
        // Guild commands show immediately and this POST also updates an older command in place.
        await client.application.commands.create(definition, guild.id);
        if (counter === 'afk') registeredAfk += 1;
        else registeredAfkOff += 1;
      } catch (error) {
        console.error(`A /${definition.name} parancs regisztrálása nem sikerült (${guild.id}):`, error.message);
      }
    }
  }
  console.info(`AFK parancsok szerverenként regisztrálva: /afk ${registeredAfk}/${client.guilds.cache.size}, /afk-ki ${registeredAfkOff}/${client.guilds.cache.size}.`);
}

function afkKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function handleAfkMessage(message) {
  if (!message.guild || message.author?.bot || message.webhookId) return;
  const ownKey = afkKey(message.guild.id, message.author.id);
  if (afkMembers.delete(ownKey)) {
    message.react('👋').catch(() => null);
  }

  const mentionedAfkMembers = [...message.mentions.users.values()]
    .filter((user) => !user.bot)
    .map((user) => ({ user, state: afkMembers.get(afkKey(message.guild.id, user.id)) }))
    .filter((entry) => entry.state);
  if (!mentionedAfkMembers.length) return;

  const lines = mentionedAfkMembers.slice(0, 10).map(({ user, state }) => {
    const member = message.guild.members.cache.get(user.id);
    const name = safeText(member?.displayName || user.globalName || user.username, 80);
    const reason = state.reason ? ` — ${state.reason}` : '';
    return `• **${name}**${reason} · AFK ${discordTimestamp(new Date(state.since))}`;
  });
  if (mentionedAfkMembers.length > 10) lines.push(`… és még ${mentionedAfkMembers.length - 10} AFK tag.`);
  message.channel.send({ content: `💤 ${lines.join('\n')}`, allowedMentions: { parse: [] } }).catch(() => null);
}

async function handleAfkCommand(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: '❌ Ezt a parancsot szerveren használd.', flags: MessageFlags.Ephemeral });
  }
  const reasonOption = interaction.options.data?.find((option) => option.name === 'reason' || option.name === 'uzenet');
  const reason = safeText(reasonOption?.value || '', 160);
  afkMembers.set(afkKey(interaction.guildId, interaction.user.id), { reason, since: Date.now() });
  return interaction.reply({
    content: reason ? `💤 AFK mód bekapcsolva. Üzenet: ${reason}\nAmint írsz a szerveren, automatikusan kikapcsol.` : '💤 AFK mód bekapcsolva. Amint írsz a szerveren, automatikusan kikapcsol.',
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] }
  });
}

async function handleAfkOffCommand(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: '❌ Ezt a parancsot szerveren használd.', flags: MessageFlags.Ephemeral });
  }
  const wasAfk = afkMembers.delete(afkKey(interaction.guildId, interaction.user.id));
  return interaction.reply({
    content: wasAfk ? '👋 Kikapcsoltam az AFK állapotodat.' : 'ℹ️ Nem volt bekapcsolva az AFK állapotod.',
    flags: MessageFlags.Ephemeral
  });
}

async function handleDiceCommand(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: '❌ Ezt a parancsot szerveren használd.', flags: MessageFlags.Ephemeral });
  }
  const sidesOption = interaction.options.data?.find((option) => option.name === 'sides' || option.name === 'oldal');
  const countOption = interaction.options.data?.find((option) => option.name === 'count' || option.name === 'darab');
  const sides = Number(sidesOption?.value);
  const count = Math.min(20, Math.max(1, Number(countOption?.value || 1)));
  if (![4, 6, 8, 10, 12, 20, 100].includes(sides)) {
    return interaction.reply({ content: '❌ Válassz egy érvényes kockatípust.', flags: MessageFlags.Ephemeral });
  }
  const rolls = Array.from({ length: count }, () => randomInt(1, sides + 1));
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  const en = String(interaction.locale || '').startsWith('en');
  const content = en
    ? '🎲 ' + count + 'd' + sides + ': ' + rolls.join(' + ') + ' = **' + total + '**'
    : '🎲 ' + count + '×d' + sides + ': ' + rolls.join(' + ') + ' = **' + total + '**';
  return interaction.reply({ content, allowedMentions: { parse: [] } });
}

function discordTimestamp(date, style = 'R') {
  const seconds = Math.floor(date.getTime() / 1000);
  return `<t:${seconds}:${style}>`;
}

async function handleMemberInfoCommand(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: '❌ Ezt a parancsot szerveren használd.', flags: MessageFlags.Ephemeral });
  }
  const user = interaction.options.getUser('tag', true);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: '❌ Ez a felhasználó nem tagja ennek a szervernek.', flags: MessageFlags.Ephemeral });
  }

  const roles = member.roles.cache
    .filter((role) => role.id !== interaction.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((role) => `**${safeText(role.name, 100)}**`);
  const joinedAt = member.joinedAt;
  const createdAt = user.createdAt;
  const voiceChannel = member.voice?.channel;
  const embed = new EmbedBuilder()
    .setColor(member.displayColor || 0x5865f2)
    .setAuthor({ name: safeText(member.displayName || user.username, 100), iconURL: user.displayAvatarURL() })
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setDescription(`Információ a **${safeText(interaction.guild.name, 100)}** szerveren.`)
    .addFields(
      { name: 'Szervernév', value: safeText(member.displayName || user.username, 100), inline: true },
      { name: 'Felhasználónév', value: `@${safeText(user.username, 90)}`, inline: true },
      { name: 'Csatlakozott', value: joinedAt ? `${discordTimestamp(joinedAt, 'D')}\n(${discordTimestamp(joinedAt)})` : 'Nem elérhető', inline: true },
      { name: 'Discord-fiók létrehozva', value: `${discordTimestamp(createdAt, 'D')}\n(${discordTimestamp(createdAt)})`, inline: true },
      { name: 'Hangcsatorna', value: voiceChannel ? safeText(voiceChannel.name, 100) : 'Nincs hangcsatornában', inline: true },
      { name: 'Időkorlátozás', value: member.communicationDisabledUntilTimestamp ? `Lejár ${discordTimestamp(new Date(member.communicationDisabledUntilTimestamp))}` : 'Nincs', inline: true },
      { name: `Rangok (${roles.length})`, value: roles.length ? roles.slice(0, 15).join(', ').slice(0, 1024) : 'Nincs rangja', inline: false }
    )
    .setFooter({ text: `NEXA • ${user.id}` })
    .setTimestamp();
  if (roles.length > 15) embed.addFields({ name: 'További rangok', value: `… és még ${roles.length - 15}.` });
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

async function handleDeleteMessagesCommand(interaction) {
  if (!interaction.inGuild() || interaction.options.getSubcommand() !== 'torles') {
    return interaction.reply({ content: '❌ Ezt a parancsot szerver szöveges csatornájában használd.', flags: MessageFlags.Ephemeral });
  }
  const memberPermissions = interaction.memberPermissions;
  if (!memberPermissions?.has(PermissionFlagsBits.ManageMessages) && !memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Ehhez a parancshoz Üzenetek kezelése jogosultság szükséges.', flags: MessageFlags.Ephemeral });
  }
  const channel = interaction.channel;
  if (!channel?.isTextBased?.() || typeof channel.bulkDelete !== 'function') {
    return interaction.reply({ content: '❌ Ebben a csatornában nem lehet tömegesen üzenetet törölni.', flags: MessageFlags.Ephemeral });
  }
  const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null);
  if (!botMember?.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: '❌ A Nexának is kell az **Üzenetek kezelése** jogosultság ebben a csatornában.', flags: MessageFlags.Ephemeral });
  }

  const requested = interaction.options.getInteger('szam', true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    let deletedCount = 0;
    if (requested === 1) {
      const latest = await channel.messages.fetch({ limit: 1 });
      const message = latest.first();
      if (message) {
        await message.delete();
        deletedCount = 1;
      }
    } else {
      const deleted = await channel.bulkDelete(requested, true);
      deletedCount = deleted.size;
    }
    const skipped = requested - deletedCount;
    return interaction.editReply(skipped > 0 && requested > 1
      ? `🗑️ **${deletedCount}** üzenetet töröltem. **${skipped}** régebbi üzenet nem törölhető tömegesen.`
      : `🗑️ **${deletedCount}** korábbi üzenetet töröltem.`);
  } catch (error) {
    console.error(`A /uzenet torles nem sikerült (${interaction.guildId}/${channel.id}):`, error.message);
    return interaction.editReply('❌ Nem sikerült törölni az üzeneteket. Ellenőrizd a csatornajogokat, vagy próbálj meg kevesebb üzenetet törölni.');
  }
}

function start(client, intervalMs = 30_000) {
  let running = false;
  const refresh = async () => {
    if (running) return;
    running = true;
    try {
      for (const guild of client.guilds.cache.values()) {
        const category = findCategory(guild);
        if (!category) continue;
        for (const kind of ['overview', 'members', 'tickets', 'voice', 'shift', 'system']) {
          const channel = findTarget(guild, category, kind);
          if (!channel) continue;
          try {
            await updatePanel(client, guild, channel, kind);
          } catch (error) {
            reportError(guild.id, kind, error);
          }
        }
      }
    } finally {
      running = false;
    }
  };
  const timer = setInterval(refresh, Math.max(15_000, intervalMs));
  timer.unref();
  refresh().catch((error) => console.error('NEXA LIVE induló frissítési hiba:', error.message));
  return timer;
}

function registerDeleteMessagesCommand(client) {
  const timer = setTimeout(() => ensureDeleteMessagesCommand(client), 15_000);
  timer.unref();
}

function registerMemberInfoCommand(client) {
  const timer = setTimeout(() => ensureMemberInfoCommand(client), 15_000);
  timer.unref();
}

function registerAfkCommand(client) {
  const timer = setTimeout(() => ensureAfkCommand(client), 15_000);
  timer.unref();
}

function registerDiceCommand(client) {
  const timer = setTimeout(() => ensureDiceCommand(client), 15_000);
  timer.unref();
}

function registerBelvPermissionsCommand(client) {
  const timer = setTimeout(() => ensureBelvPermissionsCommand(client), 20_000);
  timer.unref();
}

const originalLogin = Client.prototype.login;
Client.prototype.login = function patchedLogin(...args) {
  if (!watchedClients.has(this)) {
    watchedClients.add(this);
    this.once(Events.ClientReady, (readyClient) => {
      start(readyClient);
      registerDeleteMessagesCommand(readyClient);
      registerMemberInfoCommand(readyClient);
      registerAfkCommand(readyClient);
      registerDiceCommand(readyClient);
      registerBelvPermissionsCommand(readyClient);
    });
  }
  return originalLogin.apply(this, args);
};

const originalOn = Client.prototype.on;
Client.prototype.on = function patchedOn(eventName, listener) {
  if (typeof listener !== 'function') {
    return originalOn.call(this, eventName, listener);
  }
  const client = this;
  if (eventName === Events.MessageCreate) {
    return originalOn.call(this, eventName, (message) => {
      if (!consumedAfkMessages.has(message)) {
        consumedAfkMessages.add(message);
        handleAfkMessage(message);
      }
      return listener.call(client, message);
    });
  }
  if (eventName !== Events.InteractionCreate) return originalOn.call(this, eventName, listener);
  return originalOn.call(this, eventName, async (interaction) => {
    if (interaction.isChatInputCommand?.() && interaction.commandName === 'uzenet') {
      if (consumedDeleteInteractions.has(interaction)) return;
      consumedDeleteInteractions.add(interaction);
      return handleDeleteMessagesCommand(interaction);
    }
    if (interaction.isChatInputCommand?.() && interaction.commandName === 'taginfo') {
      if (consumedMemberInfoInteractions.has(interaction)) return;
      consumedMemberInfoInteractions.add(interaction);
      return handleMemberInfoCommand(interaction).catch((error) => {
        console.error(`A /taginfo nem sikerült (${interaction.guildId}):`, error.message);
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp({ content: '❌ Nem sikerült lekérni a tag adatait.', flags: MessageFlags.Ephemeral });
        }
        return interaction.reply({ content: '❌ Nem sikerült lekérni a tag adatait.', flags: MessageFlags.Ephemeral });
      });
    }
    if (interaction.isChatInputCommand?.() && interaction.commandName === 'afk') {
      if (consumedAfkInteractions.has(interaction)) return;
      consumedAfkInteractions.add(interaction);
      return handleAfkCommand(interaction);
    }
    if (interaction.isChatInputCommand?.() && ['afk-ki', 'afk-off'].includes(interaction.commandName)) {
      if (consumedAfkInteractions.has(interaction)) return;
      consumedAfkInteractions.add(interaction);
      return handleAfkOffCommand(interaction);
    }
    if (interaction.isChatInputCommand?.() && ['kocka', 'dice'].includes(interaction.commandName)) {
      if (consumedDiceInteractions.has(interaction)) return;
      consumedDiceInteractions.add(interaction);
      return handleDiceCommand(interaction);
    }
    if (interaction.isChatInputCommand?.() && ['belv-jogok', 'belv-permissions'].includes(interaction.commandName)) {
      if (consumedBelvPermissionInteractions.has(interaction)) return;
      consumedBelvPermissionInteractions.add(interaction);
      return handleBelvPermissionsCommand(interaction).catch((error) => {
        console.error('A /belv-jogok parancs nem sikerült:', error.message);
        if (interaction.replied || interaction.deferred) return interaction.followUp({ content: '❌ A BELV jogosultságellenőrzés hibával leállt.', flags: MessageFlags.Ephemeral });
        return interaction.reply({ content: '❌ A BELV jogosultságellenőrzés hibával leállt.', flags: MessageFlags.Ephemeral });
      });
    }
    return listener.call(client, interaction);
  });
};

