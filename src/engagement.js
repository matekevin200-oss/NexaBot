const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  SlashCommandBuilder
} = require('discord.js');
const {
  configuredChannel,
  configuredRole,
  dbQuery,
  getGuildConfig,
  getModuleState,
  moduleEnabled
} = require('./config');
const { COLORS } = require('./constants');
const { baseEmbed, ephemeralError } = require('./utils');
const { pick } = require('./i18n');
const { recordAudit, recordError, recordUsage } = require('./telemetry');

const EPHEMERAL = MessageFlags.Ephemeral;
const reminderFallback = new Map();
const starboardFallback = new Map();
let fallbackReminderId = 1;

function parseDuration(value) {
  const match = String(value || '').trim().toLowerCase().match(/^(\d{1,4})\s*(m|h|d|w)$/);
  if (!match) return null;
  const amount = Number.parseInt(match[1], 10);
  const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  const milliseconds = amount * multipliers[match[2]];
  return milliseconds >= 60_000 && milliseconds <= 30 * 86_400_000 ? milliseconds : null;
}

function durationLabel(milliseconds, language = 'hu') {
  const units = [
    [604_800_000, language === 'en' ? 'week' : 'hét'],
    [86_400_000, language === 'en' ? 'day' : 'nap'],
    [3_600_000, language === 'en' ? 'hour' : 'óra'],
    [60_000, language === 'en' ? 'minute' : 'perc']
  ];
  const [size, label] = units.find(([size]) => milliseconds >= size) || units.at(-1);
  const amount = Math.max(1, Math.round(milliseconds / size));
  return language === 'en' && amount !== 1 ? `${amount} ${label}s` : `${amount} ${label}`;
}

function engagementCommands() {
  return [
    new SlashCommandBuilder()
      .setName('hitelesites')
      .setDescription('A gombos tagellenőrző rendszer kezelése.')
      .setDescriptionLocalizations({ 'en-US': 'Manage the button verification system.', 'en-GB': 'Manage the button verification system.' })
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .setDMPermission(false)
      .addSubcommand((subcommand) => subcommand
        .setName('panel')
        .setDescription('Kihelyezi vagy frissíti az ellenőrzőpanelt.')),
    new SlashCommandBuilder()
      .setName('emlekezteto')
      .setDescription('Személyes, újraindítás után is megmaradó emlékeztetők.')
      .setDescriptionLocalizations({ 'en-US': 'Create persistent personal reminders.', 'en-GB': 'Create persistent personal reminders.' })
      .setDMPermission(false)
      .addSubcommand((subcommand) => subcommand
        .setName('letrehozas')
        .setDescription('Új emlékeztető létrehozása.')
        .addStringOption((option) => option
          .setName('ido')
          .setDescription('Például: 10m, 2h, 3d vagy 1w.')
          .setRequired(true)
          .setMaxLength(8))
        .addStringOption((option) => option
          .setName('uzenet')
          .setDescription('Mire emlékeztesselek?')
          .setRequired(true)
          .setMaxLength(1000)))
      .addSubcommand((subcommand) => subcommand
        .setName('lista')
        .setDescription('Megmutatja az aktív emlékeztetőidet.'))
      .addSubcommand((subcommand) => subcommand
        .setName('torles')
        .setDescription('Töröl egy emlékeztetőt.')
        .addIntegerOption((option) => option
          .setName('azonosito')
          .setDescription('Az emlékeztető listában látható azonosító.')
          .setRequired(true)
          .setMinValue(1)))
  ];
}

function verificationPanel(language = 'hu') {
  const english = language === 'en';
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(english ? '✅ NEXA Member Verification' : '✅ NEXA tagellenőrzés')
    .setDescription(english
      ? 'Press the button below to confirm that you have read the server rules and receive the verified member role.'
      : 'Nyomd meg az alábbi gombot annak megerősítéséhez, hogy elolvastad a szerver szabályait. Ezután automatikusan megkapod az ellenőrzött tag rangot.')
    .addFields(
      { name: english ? 'Fast' : 'Gyors', value: english ? 'One click, no commands.' : 'Egyetlen kattintás, parancs nélkül.', inline: true },
      { name: english ? 'Secure' : 'Biztonságos', value: english ? 'The role is granted by NEXA.' : 'A rangot közvetlenül a NEXA adja.', inline: true },
      { name: english ? 'Having trouble?' : 'Nem működik?', value: english ? 'Contact the server staff.' : 'Keresd a szerver Staff csapatát.', inline: true }
    )
    .setFooter({ text: 'NEXA Identity Gateway • 11.0' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('engagement_verify')
      .setLabel(english ? 'Verify me' : 'Ellenőrzés és belépés')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
  );
  return { embeds: [embed], components: [row] };
}

async function upsertVerificationPanel(guild, channel, botId) {
  const language = getGuildConfig(guild.id).language;
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = messages?.find((message) =>
    message.author.id === botId && message.components.some((row) =>
      row.components.some((component) => component.customId === 'engagement_verify')
    )
  );
  if (existing) {
    await existing.edit(verificationPanel(language));
    return existing;
  }
  return channel.send(verificationPanel(language));
}

async function handleVerificationButton(interaction) {
  if (!moduleEnabled(interaction.guildId, 'verification')) {
    const state = getModuleState(interaction.guildId, 'verification');
    if (state.remotelyDisabled) {
      return ephemeralError(interaction, 'A tagellenőrzést az Owner Center globális vészkapcsolója tiltja. Futtasd a `/support-szerver javitas` parancsot.');
    }
    if (!state.planAllowed) {
      return ephemeralError(interaction, 'A tagellenőrzéshez szükséges csomag nincs engedélyezve ezen a szerveren.');
    }
    return ephemeralError(interaction, pick(interaction.guildId, 'A tagellenőrzés ki van kapcsolva. Futtasd a `/support-szerver javitas` parancsot.', 'Member verification is disabled. Run `/support-szerver javitas`.'));
  }
  const role = configuredRole(interaction.guild, 'verified');
  if (!role) return ephemeralError(interaction, 'Nincs beállítva ellenőrzött tag rang a webes dashboardon.');
  if (!role.editable) return ephemeralError(interaction, 'A NEXA rangja legyen az ellenőrzött tag rang fölött.');
  if (interaction.member.roles.cache.has(role.id)) {
    return interaction.reply({ content: `✅ Már rendelkezel a **${role.name}** ranggal.`, flags: EPHEMERAL });
  }
  await interaction.member.roles.add(role, `NEXA ellenőrzés: ${interaction.user.tag}`);
  await recordAudit('member_verified', {
    actorId: interaction.user.id,
    guildId: interaction.guildId,
    targetId: role.id
  });
  return interaction.reply({ content: `✅ Sikeres ellenőrzés! Megkaptad a **${role.name}** rangot.`, flags: EPHEMERAL });
}

async function createReminder(interaction, milliseconds, text) {
  const dueAt = new Date(Date.now() + milliseconds);
  const result = await dbQuery(
    `INSERT INTO nexabot_reminders (guild_id, channel_id, user_id, message, due_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, due_at`,
    [interaction.guildId, interaction.channelId, interaction.user.id, text, dueAt]
  ).catch(() => null);
  if (result?.rows?.[0]) return { id: Number(result.rows[0].id), dueAt: new Date(result.rows[0].due_at) };
  const id = fallbackReminderId++;
  reminderFallback.set(id, {
    id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    message: text,
    dueAt,
    sent: false
  });
  return { id, dueAt };
}

async function listReminders(guildId, userId) {
  const result = await dbQuery(
    `SELECT id, message, due_at FROM nexabot_reminders
     WHERE guild_id = $1 AND user_id = $2 AND sent = FALSE AND due_at > NOW()
     ORDER BY due_at ASC LIMIT 20`,
    [guildId, userId]
  ).catch(() => null);
  if (result) return result.rows;
  return [...reminderFallback.values()]
    .filter((item) => item.guildId === guildId && item.userId === userId && !item.sent && item.dueAt > new Date())
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, 20)
    .map((item) => ({ id: item.id, message: item.message, due_at: item.dueAt }));
}

async function deleteReminder(guildId, userId, id) {
  const result = await dbQuery(
    'DELETE FROM nexabot_reminders WHERE id = $1 AND guild_id = $2 AND user_id = $3 AND sent = FALSE RETURNING id',
    [id, guildId, userId]
  ).catch(() => null);
  if (result) return result.rowCount > 0;
  const item = reminderFallback.get(id);
  if (!item || item.guildId !== guildId || item.userId !== userId || item.sent) return false;
  reminderFallback.delete(id);
  return true;
}

async function handleEngagementCommand(interaction) {
  if (interaction.commandName === 'hitelesites') {
    if (!moduleEnabled(interaction.guildId, 'verification')) {
      return ephemeralError(interaction, 'A tagellenőrzés előbb legyen bekapcsolva a webes dashboardon.');
    }
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return ephemeralError(interaction, 'Ehhez Szerver kezelése jogosultság szükséges.');
    }
    const channel = configuredChannel(interaction.guild, 'verification') || interaction.channel;
    if (!channel?.isTextBased()) return ephemeralError(interaction, 'Válassz szöveges ellenőrzőcsatornát a webes dashboardon.');
    await interaction.deferReply({ flags: EPHEMERAL });
    await upsertVerificationPanel(interaction.guild, channel, interaction.client.user.id);
    await recordAudit('verification_panel_publish', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: channel.id });
    return interaction.editReply(`✅ Az ellenőrzőpanel elkészült: ${channel}`);
  }
  if (interaction.commandName !== 'emlekezteto') return false;
  if (!moduleEnabled(interaction.guildId, 'reminders')) {
    return ephemeralError(interaction, 'Az emlékeztetők ki vannak kapcsolva ezen a szerveren.');
  }
  const action = interaction.options.getSubcommand();
  if (action === 'letrehozas') {
    const milliseconds = parseDuration(interaction.options.getString('ido', true));
    if (!milliseconds) return ephemeralError(interaction, 'Az idő 1 perc és 30 nap közötti legyen. Példák: `10m`, `2h`, `3d`, `1w`.');
    const message = interaction.options.getString('uzenet', true).trim();
    const reminder = await createReminder(interaction, milliseconds, message);
    await recordUsage('reminder_create', { guildId: interaction.guildId, userId: interaction.user.id });
    return interaction.reply({
      content: `⏰ **Emlékeztető #${reminder.id} létrehozva**\nIdő: **${durationLabel(milliseconds, getGuildConfig(interaction.guildId).language)}**\nÉrkezés: <t:${Math.floor(reminder.dueAt.getTime() / 1000)}:F>`,
      flags: EPHEMERAL
    });
  }
  if (action === 'lista') {
    const reminders = await listReminders(interaction.guildId, interaction.user.id);
    if (!reminders.length) return interaction.reply({ content: '📭 Nincs aktív emlékeztetőd.', flags: EPHEMERAL });
    const lines = reminders.map((item) => `**#${item.id}** • <t:${Math.floor(new Date(item.due_at).getTime() / 1000)}:R>\n${String(item.message).slice(0, 180)}`);
    return interaction.reply({ embeds: [baseEmbed('⏰ Aktív emlékeztetők', lines.join('\n\n'), COLORS.primary)], flags: EPHEMERAL });
  }
  if (action === 'torles') {
    const id = interaction.options.getInteger('azonosito', true);
    const deleted = await deleteReminder(interaction.guildId, interaction.user.id, id);
    return interaction.reply({ content: deleted ? `✅ Az emlékeztető #${id} törölve.` : '❌ Nem található ilyen aktív, saját emlékeztető.', flags: EPHEMERAL });
  }
  return true;
}

async function dueReminderRows() {
  const result = await dbQuery(
    `SELECT id, guild_id, channel_id, user_id, message, due_at
     FROM nexabot_reminders WHERE sent = FALSE AND due_at <= NOW()
     ORDER BY due_at ASC LIMIT 100`
  ).catch(() => null);
  if (result) return result.rows;
  return [...reminderFallback.values()].filter((item) => !item.sent && item.dueAt <= new Date()).slice(0, 100);
}

async function markReminderSent(id) {
  const result = await dbQuery('UPDATE nexabot_reminders SET sent = TRUE, sent_at = NOW() WHERE id = $1', [id]).catch(() => null);
  if (!result) {
    const item = reminderFallback.get(Number(id));
    if (item) item.sent = true;
  }
}

async function deliverDueReminders(client) {
  if (!client.isReady?.()) return 0;
  const rows = await dueReminderRows();
  let delivered = 0;
  for (const row of rows) {
    const channelId = String(row.channel_id || row.channelId || '');
    const userId = String(row.user_id || row.userId || '');
    const message = String(row.message || '').slice(0, 1000);
    try {
      const channel = channelId ? await client.channels.fetch(channelId).catch(() => null) : null;
      const payload = {
        content: `<@${userId}>`,
        embeds: [baseEmbed('⏰ NEXA emlékeztető', message, COLORS.primary).setFooter({ text: `Emlékeztető #${row.id}` })],
        allowedMentions: { users: [userId] }
      };
      if (channel?.isTextBased()) await channel.send(payload);
      else {
        const user = await client.users.fetch(userId);
        await user.send({ embeds: payload.embeds });
      }
      await markReminderSent(row.id);
      delivered += 1;
    } catch (error) {
      await recordError(error, { command: 'reminder_delivery', guildId: row.guild_id || row.guildId, userId });
    }
  }
  return delivered;
}

function starboardKey(guildId, messageId) {
  return `${guildId}:${messageId}`;
}

async function starboardRecord(guildId, messageId) {
  const result = await dbQuery(
    'SELECT channel_id, starboard_message_id, score FROM nexabot_starboard WHERE guild_id = $1 AND message_id = $2',
    [guildId, messageId]
  ).catch(() => null);
  return result ? result.rows[0] || null : starboardFallback.get(starboardKey(guildId, messageId)) || null;
}

async function saveStarboardRecord(guildId, messageId, channelId, starboardMessageId, score) {
  const result = await dbQuery(
    `INSERT INTO nexabot_starboard (guild_id, message_id, channel_id, starboard_message_id, score)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (guild_id, message_id) DO UPDATE SET
       channel_id = EXCLUDED.channel_id,
       starboard_message_id = EXCLUDED.starboard_message_id,
       score = EXCLUDED.score,
       updated_at = NOW()`,
    [guildId, messageId, channelId, starboardMessageId, score]
  ).catch(() => null);
  if (!result) starboardFallback.set(starboardKey(guildId, messageId), { channel_id: channelId, starboard_message_id: starboardMessageId, score });
}

async function deleteStarboardRecord(guildId, messageId) {
  const result = await dbQuery('DELETE FROM nexabot_starboard WHERE guild_id = $1 AND message_id = $2', [guildId, messageId]).catch(() => null);
  if (!result) starboardFallback.delete(starboardKey(guildId, messageId));
}

function starboardPayload(message, score) {
  const attachment = message.attachments.find((item) => item.contentType?.startsWith('image/'));
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setAuthor({ name: message.author.globalName || message.author.username, iconURL: message.author.displayAvatarURL() })
    .setDescription(String(message.content || '*Csak csatolmányt tartalmazó üzenet*').slice(0, 3500))
    .addFields(
      { name: 'Csatorna', value: `${message.channel}`, inline: true },
      { name: 'Csillagok', value: `⭐ ${score}`, inline: true },
      { name: 'Eredeti üzenet', value: `[Megnyitás](${message.url})`, inline: true }
    )
    .setTimestamp(message.createdAt)
    .setFooter({ text: `NEXA Starboard • ${message.id}` });
  if (attachment?.url) embed.setImage(attachment.url);
  return { content: `⭐ **${score}** • ${message.channel}`, embeds: [embed] };
}

async function handleStarboardReaction(reaction, user) {
  if (user.bot || reaction.emoji.name !== '⭐') return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  if (reaction.message.partial) await reaction.message.fetch().catch(() => null);
  const message = reaction.message;
  const guild = message.guild;
  if (!guild || message.author?.bot || !moduleEnabled(guild.id, 'starboard')) return;
  const target = configuredChannel(guild, 'starboard');
  if (!target?.isTextBased() || message.channelId === target.id) return;
  const threshold = getGuildConfig(guild.id).community.starboardThreshold;
  const score = Number(reaction.count || 0);
  const existing = await starboardRecord(guild.id, message.id);
  if (score < threshold) {
    if (existing) {
      const starMessage = await target.messages.fetch(existing.starboard_message_id).catch(() => null);
      await starMessage?.delete().catch(() => null);
      await deleteStarboardRecord(guild.id, message.id);
    }
    return;
  }
  if (existing) {
    const starMessage = await target.messages.fetch(existing.starboard_message_id).catch(() => null);
    if (starMessage) {
      await starMessage.edit(starboardPayload(message, score));
      await saveStarboardRecord(guild.id, message.id, message.channelId, starMessage.id, score);
      return;
    }
  }
  const starMessage = await target.send(starboardPayload(message, score));
  await saveStarboardRecord(guild.id, message.id, message.channelId, starMessage.id, score);
  await recordUsage('starboard_publish', { guildId: guild.id, userId: message.author.id });
}

function startEngagementJobs(client, intervalMs = 30_000) {
  let running = false;
  const run = async () => {
    if (running) return 0;
    running = true;
    try {
      return await deliverDueReminders(client);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => run().catch((error) => recordError(error, { command: 'engagement_jobs' })), Math.max(5_000, intervalMs));
  timer.unref();
  run().catch((error) => recordError(error, { command: 'engagement_jobs_startup' }));
  return { run, stop: () => clearInterval(timer) };
}

module.exports = {
  createReminder,
  deleteReminder,
  deliverDueReminders,
  durationLabel,
  engagementCommands,
  handleEngagementCommand,
  handleStarboardReaction,
  handleVerificationButton,
  listReminders,
  parseDuration,
  startEngagementJobs,
  upsertVerificationPanel,
  verificationPanel
};
