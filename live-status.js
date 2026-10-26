// NEXA LIVE read-only status panels for the optional "NEXA LIVE" category.
// Loaded with `node -r ./live-status.js index.js` so it can coexist with the packed runtime.
const { Client, Events, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { Pool } = require('pg');

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

const originalLogin = Client.prototype.login;
Client.prototype.login = function patchedLogin(...args) {
  if (!watchedClients.has(this)) {
    watchedClients.add(this);
    this.once(Events.ClientReady, (readyClient) => {
      start(readyClient);
      registerDeleteMessagesCommand(readyClient);
    });
  }
  return originalLogin.apply(this, args);
};

const originalOn = Client.prototype.on;
Client.prototype.on = function patchedOn(eventName, listener) {
  if (eventName !== Events.InteractionCreate || typeof listener !== 'function') {
    return originalOn.call(this, eventName, listener);
  }
  const client = this;
  return originalOn.call(this, eventName, async (interaction) => {
    if (interaction.isChatInputCommand?.() && interaction.commandName === 'uzenet') {
      if (consumedDeleteInteractions.has(interaction)) return;
      consumedDeleteInteractions.add(interaction);
      return handleDeleteMessagesCommand(interaction);
    }
    return listener.call(client, interaction);
  });
};

