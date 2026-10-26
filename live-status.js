// NEXA LIVE read-only status panels for the optional "NEXA LIVE" category.
// Loaded with `node -r ./live-status.js index.js` so it can coexist with the packed runtime.
const { Client, Events, ChannelType, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');

const PANEL_FOOTERS = { voice: 'NEXA LIVE • voice', shift: 'NEXA LIVE • shift' };
const panelState = new Map();
const lastErrorAt = new Map();
const watchedClients = new WeakSet();
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
  const accepted = kind === 'voice'
    ? new Set(['hangaktivitas', 'voiceactivity'])
    : new Set(['szolgalat', 'duty', 'shift']);
  return guild.channels.cache.find((channel) =>
    channel.parentId === category.id && channel.isTextBased?.() && !channel.isThread?.() && accepted.has(normalize(channel.name))
  ) || null;
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

async function activeShiftDescription(guild) {
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
  const now = Date.now();
  const lines = rows.map((row) => {
    const member = guild.members.cache.get(String(row.user_id));
    const name = safeText(member?.displayName || member?.user?.username || `Discord-tag (${row.user_id})`);
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

async function updatePanel(client, guild, channel, kind) {
  const key = `${guild.id}:${kind}`;
  const footer = PANEL_FOOTERS[kind];
  let description;
  let signature;
  if (kind === 'voice') {
    description = activeVoiceDescription(guild);
    signature = description;
  } else {
    ({ description, signature } = await activeShiftDescription(guild));
  }

  const previous = panelState.get(key);
  if (previous?.channelId === channel.id && previous.signature === signature) return;
  const embed = new EmbedBuilder()
    .setColor(kind === 'voice' ? 0x58a6ff : 0x57d39b)
    .setTitle(kind === 'voice' ? '🎙️ Aktív hangcsatornák' : '⏱️ Aktív szolgálatok')
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

function start(client, intervalMs = 30_000) {
  let running = false;
  const refresh = async () => {
    if (running) return;
    running = true;
    try {
      for (const guild of client.guilds.cache.values()) {
        const category = findCategory(guild);
        if (!category) continue;
        for (const kind of ['voice', 'shift']) {
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

const originalLogin = Client.prototype.login;
Client.prototype.login = function patchedLogin(...args) {
  if (!watchedClients.has(this)) {
    watchedClients.add(this);
    this.once(Events.ClientReady, (readyClient) => start(readyClient));
  }
  return originalLogin.apply(this, args);
};

