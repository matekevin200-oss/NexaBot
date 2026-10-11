const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const {
  configuredChannel,
  dbQuery,
  getGuildConfig,
  moduleEnabled
} = require('./config');
const { COLORS } = require('./constants');
const { baseEmbed, isStaff, safeChannelName } = require('./utils');

const EPHEMERAL = MessageFlags.Ephemeral;
const xpCooldowns = new Map();
const xpFallback = new Map();
const giveawayFallback = new Map();
const giveawayTimers = new Map();
const tempVoiceChannels = new Map();

function communityCommands() {
  return [
    new SlashCommandBuilder()
      .setName('szint')
      .setDescription('Megmutatja a közösségi szintedet.')
      .setDMPermission(false)
      .addUserOption((option) => option.setName('tag').setDescription('Másik tag szintje.')),
    new SlashCommandBuilder()
      .setName('szint-ranglista')
      .setDescription('Megmutatja a szerver XP-ranglistáját.')
      .setDMPermission(false),
    new SlashCommandBuilder()
      .setName('rank')
      .setDescription('Megmutatja a közösségi szintedet.')
      .setDescriptionLocalizations({ 'en-US': 'Show your community rank.', 'en-GB': 'Show your community rank.' })
      .setDMPermission(false)
      .addUserOption((option) => option.setName('tag').setDescription('Másik tag szintje.')),
    new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('Megmutatja a szerver XP-ranglistáját.')
      .setDescriptionLocalizations({ 'en-US': 'Show the server XP leaderboard.', 'en-GB': 'Show the server XP leaderboard.' })
      .setDMPermission(false),
    new SlashCommandBuilder()
      .setName('otlet')
      .setDescription('Beküld egy ötletet a szavazócsatornába.')
      .setDMPermission(false)
      .addStringOption((option) => option.setName('szoveg').setDescription('Az ötleted.').setRequired(true).setMaxLength(1500)),
    new SlashCommandBuilder()
      .setName('szavazas')
      .setDescription('Többválaszos szavazást indít.')
      .setDMPermission(false)
      .addStringOption((option) => option.setName('kerdes').setDescription('A szavazás kérdése.').setRequired(true).setMaxLength(250))
      .addStringOption((option) => option.setName('valaszok').setDescription('Válaszok | jellel elválasztva, legfeljebb 10.').setRequired(true).setMaxLength(1000)),
    new SlashCommandBuilder()
      .setName('bejelentes')
      .setDescription('Igényes bejelentést küld a bot nevében.')
      .setDMPermission(false)
      .addStringOption((option) => option.setName('cim').setDescription('A bejelentés címe.').setRequired(true).setMaxLength(250))
      .addStringOption((option) => option.setName('szoveg').setDescription('A bejelentés szövege.').setRequired(true).setMaxLength(3500))
      .addStringOption((option) => option.setName('kep').setDescription('Opcionális HTTPS-kép URL-je.').setMaxLength(500)),
    new SlashCommandBuilder()
      .setName('rangpanel')
      .setDescription('Kihelyezi az önkiszolgáló rangválasztó panelt.')
      .setDMPermission(false)
      .addStringOption((option) => option.setName('tipus').setDescription('A panel vezérlési módja.').addChoices(
        { name: 'Select Menu', value: 'select' },
        { name: 'Gombok', value: 'button' },
        { name: 'Emoji reakciók', value: 'reaction' }
      )),
    new SlashCommandBuilder()
      .setName('nyeremenyjatek')
      .setDescription('Nyereményjátékot indít.')
      .setDMPermission(false)
      .addStringOption((option) => option.setName('nyeremeny').setDescription('Mit lehet nyerni?').setRequired(true).setMaxLength(250))
      .addIntegerOption((option) => option.setName('percek').setDescription('Időtartam percben.').setRequired(true).setMinValue(1).setMaxValue(10080))
      .addIntegerOption((option) => option.setName('nyertesek').setDescription('Nyertesek száma.').setMinValue(1).setMaxValue(10))
    ,
    new SlashCommandBuilder()
      .setName('giveaway')
      .setDescription('Nyereményjáték létrehozása és kezelése.')
      .setDescriptionLocalizations({ 'en-US': 'Create and manage giveaways.', 'en-GB': 'Create and manage giveaways.' })
      .setDMPermission(false)
      .addSubcommand((sub) => sub.setName('create').setDescription('Új nyereményjáték.')
        .addStringOption((o) => o.setName('prize').setDescription('Nyeremény.').setRequired(true).setMaxLength(250))
        .addIntegerOption((o) => o.setName('minutes').setDescription('Időtartam percben.').setRequired(true).setMinValue(1).setMaxValue(10080))
        .addIntegerOption((o) => o.setName('winners').setDescription('Nyertesek száma.').setMinValue(1).setMaxValue(10))
        .addRoleOption((o) => o.setName('required_role').setDescription('Szükséges rang.'))
        .addStringOption((o) => o.setName('required_server').setDescription('Szükséges másik szerver ID-je.'))
        .addIntegerOption((o) => o.setName('min_account_age').setDescription('Minimum fiókkor napban.').setMinValue(0).setMaxValue(3650)))
      .addSubcommand((sub) => sub.setName('end').setDescription('Nyereményjáték azonnali lezárása.').addStringOption((o) => o.setName('message_id').setDescription('A nyereményjáték üzenetének ID-je.').setRequired(true)))
      .addSubcommand((sub) => sub.setName('reroll').setDescription('Új nyertest sorsol.').addStringOption((o) => o.setName('message_id').setDescription('A lezárt nyereményjáték üzenetének ID-je.').setRequired(true)))
  ];
}

function levelForXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100));
}

function xpForNextLevel(level) {
  return (Math.max(0, level) + 1) ** 2 * 100;
}

function xpKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

async function addXp(guildId, userId, amount) {
  const result = await dbQuery(
    `INSERT INTO nexabot_levels (guild_id, user_id, xp, last_xp_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (guild_id, user_id)
     DO UPDATE SET xp = nexabot_levels.xp + EXCLUDED.xp, last_xp_at = NOW()
     RETURNING xp`,
    [guildId, userId, amount]
  );
  if (result) return Number(result.rows[0].xp);
  const key = xpKey(guildId, userId);
  const xp = (xpFallback.get(key) || 0) + amount;
  xpFallback.set(key, xp);
  return xp;
}

async function userXp(guildId, userId) {
  const result = await dbQuery('SELECT xp FROM nexabot_levels WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  return result ? Number(result.rows[0]?.xp || 0) : Number(xpFallback.get(xpKey(guildId, userId)) || 0);
}

async function xpLeaderboard(guildId, limit = 10) {
  const result = await dbQuery(
    'SELECT user_id, xp FROM nexabot_levels WHERE guild_id = $1 ORDER BY xp DESC LIMIT $2',
    [guildId, limit]
  );
  if (result) return result.rows.map((row) => ({ userId: row.user_id, xp: Number(row.xp) }));
  return [...xpFallback.entries()]
    .filter(([key]) => key.startsWith(`${guildId}:`))
    .map(([key, xp]) => ({ userId: key.split(':')[1], xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

async function handleMessageXp(message) {
  if (!message.guild || message.author.bot || !moduleEnabled(message.guild.id, 'levels')) return;
  const config = getGuildConfig(message.guild.id);
  if (config.channels.ai && message.channel.id === config.channels.ai) return;
  const key = xpKey(message.guild.id, message.author.id);
  const now = Date.now();
  if ((xpCooldowns.get(key) || 0) > now) return;
  xpCooldowns.set(key, now + config.community.xpCooldownSeconds * 1000);
  const amount = crypto.randomInt(config.community.xpMin, config.community.xpMax + 1);
  const before = await userXp(message.guild.id, message.author.id);
  const after = await addXp(message.guild.id, message.author.id, amount);
  const previousLevel = levelForXp(before);
  const currentLevel = levelForXp(after);
  if (currentLevel <= previousLevel) return;
  const member = message.member;
  if (member) {
    const rewards = config.community.rewardRoles.filter((item) => item.level <= currentLevel && !member.roles.cache.has(item.roleId));
    for (const reward of rewards) {
      const role = message.guild.roles.cache.get(reward.roleId);
      if (role?.editable) await member.roles.add(role, `NEXA Bot szintjutalom: ${reward.level}`).catch(() => null);
    }
  }
  const channel = configuredChannel(message.guild, 'levels') || message.channel;
  const text = config.messages.levelUp
    .replaceAll('{tag}', `${message.author}`)
    .replaceAll('{level}', String(currentLevel))
    .replaceAll('{server}', message.guild.name);
  await channel?.send({ embeds: [baseEmbed('🎉 Szintlépés!', text, COLORS.success)] }).catch(() => null);
}

function assertStaff(interaction) {
  if (isStaff(interaction.member)) return null;
  return interaction.reply({ content: '❌ Ezt csak Staff vagy adminisztrátor használhatja.', flags: EPHEMERAL });
}

function rolePanel(guild, roleIds, type = 'select') {
  const roles = roleIds.map((id) => guild.roles.cache.get(id)).filter(Boolean).slice(0, 10);
  const english = getGuildConfig(guild.id).language === 'en';
  const embed = baseEmbed(
    english ? '🏷️ Language and notification roles' : '🏷️ Választható rangok',
    english
      ? 'Select your language and notification roles. You can update your choices at any time. Hungarian remains available as an optional language.'
      : 'Válaszd ki a rangjaidat. A korábbi választásodat bármikor módosíthatod.',
    COLORS.primary
  );
  if (type === 'button') {
    const rows = [];
    for (let index = 0; index < roles.length; index += 5) {
      rows.push(new ActionRowBuilder().addComponents(roles.slice(index, index + 5).map((role) => new ButtonBuilder()
        .setCustomId(`community_role_toggle:${role.id}`)
        .setLabel(role.name.slice(0, 80))
        .setStyle(ButtonStyle.Secondary))));
    }
    return { embeds: [embed], components: rows };
  }
  if (type === 'reaction') {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    embed.setDescription(roles.map((role, index) => `${emojis[index]} ${role}`).join('\n'));
    return { embeds: [embed], components: [], reactionRoles: roles.map((role, index) => ({ emoji: emojis[index], roleId: role.id })) };
  }
  const menu = new StringSelectMenuBuilder()
    .setCustomId('community_self_roles')
    .setPlaceholder(english ? 'Select your roles…' : 'Válaszd ki a rangjaidat…')
    .setMinValues(0)
    .setMaxValues(Math.max(1, roles.length))
    .addOptions(roles.map((role) => ({
      label: role.name.slice(0, 100),
      value: role.id,
      description: english ? 'Select to enable or disable this role.' : 'Kattints a rang ki- vagy bekapcsolásához.'
    })));
  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  };
}

function pollEmojis(index) {
  return ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index];
}

async function createSuggestion(guild, user, text) {
  const channel = configuredChannel(guild, 'suggestions');
  if (!channel?.isTextBased()) throw new Error('Az ötletcsatorna nincs beállítva a webpanelen.');
  const message = await channel.send({ embeds: [baseEmbed('💡 Új közösségi ötlet', text, COLORS.primary).addFields({ name: 'Beküldte', value: `${user}` })] });
  await message.react('👍');
  await message.react('👎');
  return message;
}

async function createPoll(channel, user, question, answerText) {
  const answers = String(answerText).split('|').map((item) => item.trim()).filter(Boolean).slice(0, 10);
  if (answers.length < 2) throw new Error('Legalább két választ adj meg `|` jellel elválasztva.');
  const embed = baseEmbed('📊 Szavazás', question, COLORS.primary)
    .addFields({ name: 'Lehetőségek', value: answers.map((answer, index) => `${pollEmojis(index)} ${answer}`).join('\n') }, { name: 'Indította', value: `${user}` });
  const message = await channel.send({ embeds: [embed] });
  for (let index = 0; index < answers.length; index += 1) await message.react(pollEmojis(index));
  return message;
}

async function createAnnouncement(guild, fallbackChannel, user, title, text, image = null) {
  const channel = configuredChannel(guild, 'announcements') || fallbackChannel;
  if (!channel?.isTextBased()) throw new Error('A bejelentési csatorna nincs beállítva.');
  if (image && !/^https:\/\//i.test(image)) throw new Error('A képhez teljes HTTPS-hivatkozást adj meg.');
  const embed = baseEmbed(title, text, COLORS.primary).addFields({ name: 'Közzétette', value: `${user}` });
  if (image) embed.setImage(image);
  await channel.send({ embeds: [embed] });
  return channel;
}

async function startGiveaway(client, guildId, channel, prize, minutes, winners = 1, requirements = {}) {
  const endsAt = new Date(Date.now() + Number(minutes) * 60_000);
  const message = await channel.send(giveawayPayload(prize, endsAt, winners, false, '', requirements));
  await saveGiveaway({ messageId: message.id, guildId, channelId: channel.id, prize, winners, endsAt, entrants: [], ...requirements });
  scheduleGiveaway(client, message.id, endsAt);
  return message;
}

async function handleCommunityCommand(interaction) {
  const name = interaction.commandName;
  if (['szint', 'szint-ranglista', 'rank', 'leaderboard'].includes(name)) {
    if (!moduleEnabled(interaction.guildId, 'levels')) return interaction.reply({ content: '❌ A szintrendszer ki van kapcsolva.', flags: EPHEMERAL });
    if (name === 'szint' || name === 'rank') {
      const target = interaction.options.getUser('tag') || interaction.user;
      const xp = await userXp(interaction.guildId, target.id);
      const level = levelForXp(xp);
      const previous = level ** 2 * 100;
      const next = xpForNextLevel(level);
      const progress = Math.max(0, xp - previous);
      return interaction.reply({ embeds: [baseEmbed('⭐ Közösségi szint', `${target}`, COLORS.primary).addFields(
        { name: 'Szint', value: String(level), inline: true },
        { name: 'XP', value: `${xp}`, inline: true },
        { name: 'Következő szint', value: `${progress} / ${next - previous} XP` }
      )] });
    }
    const rows = await xpLeaderboard(interaction.guildId);
    const text = rows.map((row, index) => `**${index + 1}.** <@${row.userId}> — ${row.xp} XP • ${levelForXp(row.xp)}. szint`).join('\n');
    return interaction.reply({ embeds: [baseEmbed('🏆 XP-ranglista', text || 'Még nincs ranglistaadat.', COLORS.primary)] });
  }

  if (name === 'rangpanel' && !moduleEnabled(interaction.guildId, 'reactionRoles')) {
    return interaction.reply({ content: '❌ A rangpanel modul ezen a szerveren ki van kapcsolva.', flags: EPHEMERAL });
  }
  if (['nyeremenyjatek', 'giveaway'].includes(name) && !moduleEnabled(interaction.guildId, 'giveaways')) {
    return interaction.reply({ content: '❌ A nyereményjáték modul ezen a szerveren ki van kapcsolva.', flags: EPHEMERAL });
  }
  if (['otlet', 'szavazas', 'bejelentes'].includes(name) && !moduleEnabled(interaction.guildId, 'suggestions')) {
    return interaction.reply({ content: '❌ A közösségi extrák ezen a szerveren ki vannak kapcsolva.', flags: EPHEMERAL });
  }

  if (name === 'otlet') {
    const message = await createSuggestion(interaction.guild, interaction.user, interaction.options.getString('szoveg', true));
    return interaction.reply({ content: `✅ Az ötleted megjelent itt: ${message.url}`, flags: EPHEMERAL });
  }

  if (name === 'rangpanel') {
    const denied = assertStaff(interaction);
    if (denied) return denied;
    const roleIds = getGuildConfig(interaction.guildId).community.selfRoles;
    if (!roleIds.length) return interaction.reply({ content: '❌ Előbb válassz önkiszolgáló rangokat a webpanelen.', flags: EPHEMERAL });
    const type = interaction.options.getString('tipus') || 'select';
    const payload = rolePanel(interaction.guild, roleIds, type);
    const reactionRoles = payload.reactionRoles || [];
    delete payload.reactionRoles;
    const message = await interaction.channel.send(payload);
    if (reactionRoles.length) {
      for (const item of reactionRoles) await message.react(item.emoji);
      await dbQuery(
        `INSERT INTO nexabot_role_panels (guild_id, channel_id, message_id, panel_type, roles)
         VALUES ($1, $2, $3, 'reaction', $4::jsonb) ON CONFLICT (message_id) DO UPDATE SET roles = EXCLUDED.roles`,
        [interaction.guildId, interaction.channelId, message.id, JSON.stringify(reactionRoles)]
      );
    }
    return interaction.reply({ content: '✅ A rangválasztó panel elkészült.', flags: EPHEMERAL });
  }

  const denied = assertStaff(interaction);
  if (denied) return denied;

  if (name === 'szavazas') {
    await createPoll(interaction.channel, interaction.user, interaction.options.getString('kerdes', true), interaction.options.getString('valaszok', true));
    return interaction.reply({ content: '✅ A szavazás elindult.', flags: EPHEMERAL });
  }

  if (name === 'bejelentes') {
    const image = interaction.options.getString('kep');
    const channel = await createAnnouncement(interaction.guild, interaction.channel, interaction.user, interaction.options.getString('cim', true), interaction.options.getString('szoveg', true), image);
    return interaction.reply({ content: `✅ A bejelentés megjelent itt: ${channel}`, flags: EPHEMERAL });
  }

  if (name === 'nyeremenyjatek') {
    const minutes = interaction.options.getInteger('percek', true);
    const prize = interaction.options.getString('nyeremeny', true);
    const winners = interaction.options.getInteger('nyertesek') || 1;
    await startGiveaway(interaction.client, interaction.guildId, interaction.channel, prize, minutes, winners);
    return interaction.reply({ content: '✅ A nyereményjáték elindult.', flags: EPHEMERAL });
  }

  if (name === 'giveaway') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') {
      const requirements = {
        requiredRoleId: interaction.options.getRole('required_role')?.id || null,
        requiredServerId: interaction.options.getString('required_server') || null,
        minAccountAgeDays: interaction.options.getInteger('min_account_age') || 0
      };
      await startGiveaway(interaction.client, interaction.guildId, interaction.channel, interaction.options.getString('prize', true), interaction.options.getInteger('minutes', true), interaction.options.getInteger('winners') || 1, requirements);
      return interaction.reply({ content: '✅ A nyereményjáték elindult.', flags: EPHEMERAL });
    }
    const messageId = interaction.options.getString('message_id', true);
    const giveaway = await getGiveaway(messageId);
    if (!giveaway || giveaway.guildId !== interaction.guildId) return interaction.reply({ content: '❌ Nem található ilyen nyereményjáték ezen a szerveren.', flags: EPHEMERAL });
    if (sub === 'end') {
      await finishGiveaway(interaction.client, messageId);
      return interaction.reply({ content: '✅ A nyereményjáték lezárva.', flags: EPHEMERAL });
    }
    const winners = randomWinners(giveaway.entrants, giveaway.winners);
    const mentions = winners.map((id) => `<@${id}>`).join(', ');
    await interaction.reply({ content: mentions ? `🎉 Újrasorsolás nyertese: ${mentions}` : '❌ Nincs elegendő jelentkező.', allowedMentions: { users: winners }, flags: EPHEMERAL });
    return;
  }
}

async function handleSelfRoleSelect(interaction) {
  const config = getGuildConfig(interaction.guildId);
  const english = config.language === 'en';
  const allowed = config.community.selfRoles;
  if (!allowed.length) {
    return interaction.reply({ content: english ? '❌ No self-assignable roles are configured on this server.' : '❌ Nincsenek beállítva választható rangok ezen a szerveren.', flags: EPHEMERAL });
  }
  const selected = [...new Set(interaction.values.filter((id) => allowed.includes(id)))];
  if (selected.length !== interaction.values.length) {
    return interaction.reply({ content: english ? '❌ This role panel is outdated. Ask the owner to run `/support-szerver javitas`.' : '❌ Ez a rangpanel elavult. Kérd meg a tulajdonost, hogy futtassa a `/support-szerver javitas` parancsot.', flags: EPHEMERAL });
  }
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
  const roles = new Map(allowed.map((id) => [id, interaction.guild.roles.cache.get(id)]));
  const missing = allowed.filter((id) => !roles.get(id));
  if (missing.length) {
    return interaction.reply({ content: english ? '❌ One of the panel roles no longer exists. Run `/support-szerver javitas`.' : '❌ A panel egyik rangja már nem létezik. Futtasd a `/support-szerver javitas` parancsot.', flags: EPHEMERAL });
  }
  const languageRoleIds = allowed.filter((id) => /🇭🇺|🇬🇧/.test(roles.get(id)?.name || ''));
  if (selected.filter((id) => languageRoleIds.includes(id)).length > 1) {
    return interaction.reply({
      content: english ? '❌ Select only one language: English or Hungarian.' : '❌ Csak egy nyelvet válassz: angolt vagy magyart.',
      flags: EPHEMERAL
    });
  }
  const current = allowed.filter((id) => member.roles.cache.has(id));
  const add = selected.filter((id) => !current.includes(id));
  const remove = current.filter((id) => !selected.includes(id));
  const blocked = [...add, ...remove].filter((id) => !roles.get(id)?.editable);
  if (blocked.length) {
    const names = blocked.map((id) => `**${roles.get(id)?.name || id}**`).join(', ');
    return interaction.reply({
      content: english
        ? `❌ The bot cannot manage this role: ${names}. Move the **NEXA Bot** role above it, then run \`/support-szerver javitas\`.`
        : `❌ A bot nem tudja kezelni ezt a rangot: ${names}. A Discord ranglistában helyezd a **NEXA Bot** rangját ezek fölé, majd futtasd a \`/support-szerver javitas\` parancsot.`,
      flags: EPHEMERAL
    });
  }
  if (!add.length && !remove.length) {
    return interaction.reply({ content: english ? '✅ You already have these selected roles.' : '✅ Már ezekkel a választható rangokkal rendelkezel.', flags: EPHEMERAL });
  }

  await interaction.deferReply({ flags: EPHEMERAL });
  const failures = [];
  for (const id of add) {
    await member.roles.add(id, 'NexaBot önkiszolgáló rang').catch((error) => failures.push({ id, error }));
  }
  for (const id of remove) {
    await member.roles.remove(id, 'NexaBot önkiszolgáló rang').catch((error) => failures.push({ id, error }));
  }
  const refreshed = await interaction.guild.members.fetch(interaction.user.id).catch(() => member);
  const failedIds = new Set([
    ...failures.map((item) => item.id),
    ...add.filter((id) => !refreshed.roles.cache.has(id)),
    ...remove.filter((id) => refreshed.roles.cache.has(id))
  ]);
  if (failedIds.size) {
    const names = [...failedIds].map((id) => `**${roles.get(id)?.name || id}**`).join(', ');
    return interaction.editReply(english
      ? `❌ Discord rejected the role update: ${names}. Check the NEXA Bot **Manage Roles** permission and role order.`
      : `❌ A Discord nem engedte a rang módosítását: ${names}. Ellenőrizd a NEXA Bot **Rangok kezelése** jogosultságát és a rangsorrendet.`);
  }

  const changes = [];
  if (add.length) changes.push(`${english ? 'Added' : 'Hozzáadva'}: ${add.map((id) => `**${roles.get(id).name}**`).join(', ')}`);
  if (remove.length) changes.push(`${english ? 'Removed' : 'Eltávolítva'}: ${remove.map((id) => `**${roles.get(id).name}**`).join(', ')}`);
  return interaction.editReply(`${english ? '✅ Your roles were updated successfully.' : '✅ A rangjaid sikeresen frissültek.'}\n${changes.join('\n')}`);
}

async function handleRoleButton(interaction) {
  const roleId = interaction.customId.split(':')[1];
  const allowed = getGuildConfig(interaction.guildId).community.selfRoles;
  if (!allowed.includes(roleId)) return interaction.reply({ content: '❌ Ez a rang már nem választható.', flags: EPHEMERAL });
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role?.editable) return interaction.reply({ content: '❌ A bot nem tudja kezelni ezt a rangot.', flags: EPHEMERAL });
  const has = interaction.member.roles.cache.has(roleId);
  if (has) await interaction.member.roles.remove(roleId, 'NEXA Bot button role');
  else await interaction.member.roles.add(roleId, 'NEXA Bot button role');
  return interaction.reply({ content: has ? `✅ ${role.name} rang eltávolítva.` : `✅ ${role.name} rang hozzáadva.`, flags: EPHEMERAL });
}

async function handleReactionRole(reaction, user, add) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  if (!reaction.message.guild) return;
  const result = await dbQuery('SELECT roles FROM nexabot_role_panels WHERE message_id = $1 AND panel_type = $2', [reaction.message.id, 'reaction']).catch(() => null);
  const roles = result?.rows?.[0]?.roles;
  if (!Array.isArray(roles)) return;
  const key = reaction.emoji.id || reaction.emoji.name;
  const mapping = roles.find((item) => item.emoji === key);
  if (!mapping || !getGuildConfig(reaction.message.guild.id).community.selfRoles.includes(mapping.roleId)) return;
  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  const role = reaction.message.guild.roles.cache.get(mapping.roleId);
  if (!member || !role?.editable) return;
  if (add) await member.roles.add(role, 'NEXA Bot reaction role').catch(() => null);
  else await member.roles.remove(role, 'NEXA Bot reaction role').catch(() => null);
}

function giveawayPayload(prize, endsAt, winners, ended, winnerMentions = '', requirements = {}) {
  const embed = baseEmbed(ended ? '🎉 Nyereményjáték lezárva' : '🎁 Nyereményjáték', `**Nyeremény:** ${prize}`, ended ? COLORS.success : COLORS.primary)
    .addFields(
      { name: 'Nyertesek száma', value: String(winners), inline: true },
      { name: ended ? 'Eredmény' : 'Lejárat', value: ended ? (winnerMentions || 'Nem volt jelentkező.') : `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true }
    );
  const requirementText = [
    requirements.requiredRoleId ? `Rang: <@&${requirements.requiredRoleId}>` : null,
    requirements.requiredServerId ? `Szerver: ${requirements.requiredServerId}` : null,
    requirements.minAccountAgeDays ? `Fiókkor: ${requirements.minAccountAgeDays} nap` : null
  ].filter(Boolean).join('\n');
  if (requirementText) embed.addFields({ name: 'Feltételek', value: requirementText });
  const button = new ButtonBuilder()
    .setCustomId('giveaway_join')
    .setLabel(ended ? 'Lezárva' : 'Jelentkezem')
    .setEmoji('🎉')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(ended);
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] };
}

async function saveGiveaway(data) {
  const result = await dbQuery(
    `INSERT INTO nexabot_giveaways (message_id, guild_id, channel_id, prize, winner_count, ends_at, entrants, required_role_id, required_server_id, min_account_age_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
    [data.messageId, data.guildId, data.channelId, data.prize, data.winners, data.endsAt, JSON.stringify(data.entrants), data.requiredRoleId || null, data.requiredServerId || null, data.minAccountAgeDays || 0]
  );
  if (!result) giveawayFallback.set(data.messageId, data);
}

async function getGiveaway(messageId) {
  const result = await dbQuery('SELECT * FROM nexabot_giveaways WHERE message_id = $1', [messageId]);
  if (result) {
    const row = result.rows[0];
    return row ? { messageId: row.message_id, guildId: row.guild_id, channelId: row.channel_id, prize: row.prize, winners: row.winner_count, endsAt: new Date(row.ends_at), entrants: row.entrants || [], ended: row.ended, winnerIds: row.winner_ids || [], requiredRoleId: row.required_role_id, requiredServerId: row.required_server_id, minAccountAgeDays: Number(row.min_account_age_days || 0) } : null;
  }
  return giveawayFallback.get(messageId) || null;
}

async function addGiveawayEntrant(messageId, userId, context = {}) {
  const giveaway = await getGiveaway(messageId);
  if (!giveaway || giveaway.ended || giveaway.endsAt <= new Date()) return { ok: false, joined: false };
  if (giveaway.requiredRoleId && !context.member?.roles?.cache?.has(giveaway.requiredRoleId)) return { ok: false, joined: false, reason: 'A részvételhez nincs meg a szükséges rangod.' };
  if (giveaway.minAccountAgeDays && Date.now() - context.user.createdTimestamp < giveaway.minAccountAgeDays * 86_400_000) return { ok: false, joined: false, reason: `A fiókodnak legalább ${giveaway.minAccountAgeDays} naposnak kell lennie.` };
  if (giveaway.requiredServerId) {
    const requiredGuild = context.client?.guilds?.cache?.get(giveaway.requiredServerId);
    const present = requiredGuild && await requiredGuild.members.fetch(userId).then(() => true).catch(() => false);
    if (!present) return { ok: false, joined: false, reason: 'Nem vagy tagja a szükséges Discord-szervernek.' };
  }
  const joined = !giveaway.entrants.includes(userId);
  giveaway.entrants = joined ? [...giveaway.entrants, userId] : giveaway.entrants.filter((id) => id !== userId);
  const result = await dbQuery('UPDATE nexabot_giveaways SET entrants = $2::jsonb WHERE message_id = $1', [messageId, JSON.stringify(giveaway.entrants)]);
  if (!result) giveawayFallback.set(messageId, giveaway);
  return { ok: true, joined };
}

async function handleGiveawayButton(interaction) {
  const result = await addGiveawayEntrant(interaction.message.id, interaction.user.id, { member: interaction.member, user: interaction.user, client: interaction.client });
  if (!result.ok) return interaction.reply({ content: `❌ ${result.reason || 'Ez a nyereményjáték már lezárult.'}`, flags: EPHEMERAL });
  return interaction.reply({ content: result.joined ? '✅ Részt veszel a nyereményjátékban!' : '✅ Visszavontad a jelentkezésedet.', flags: EPHEMERAL });
}

function randomWinners(entrants, count) {
  const pool = [...new Set(entrants)];
  const winners = [];
  while (pool.length && winners.length < count) {
    winners.push(pool.splice(crypto.randomInt(pool.length), 1)[0]);
  }
  return winners;
}

async function finishGiveaway(client, messageId) {
  const existingTimer = giveawayTimers.get(messageId);
  if (existingTimer) clearTimeout(existingTimer);
  giveawayTimers.delete(messageId);
  const giveaway = await getGiveaway(messageId);
  if (!giveaway || giveaway.ended) return;
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  const message = await channel?.messages.fetch(messageId).catch(() => null);
  const winners = randomWinners(giveaway.entrants, giveaway.winners);
  const mentions = winners.map((id) => `<@${id}>`).join(', ');
  if (message) await message.edit(giveawayPayload(giveaway.prize, giveaway.endsAt, giveaway.winners, true, mentions, giveaway)).catch(() => null);
  if (mentions) await channel?.send(`🎉 Gratulálok ${mentions}! Megnyertétek: **${giveaway.prize}**`).catch(() => null);
  const result = await dbQuery('UPDATE nexabot_giveaways SET ended = TRUE, winner_ids = $2::jsonb WHERE message_id = $1', [messageId, JSON.stringify(winners)]);
  if (!result) giveawayFallback.set(messageId, { ...giveaway, ended: true, winnerIds: winners });
}

function scheduleGiveaway(client, messageId, endsAt) {
  const delay = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const timer = setTimeout(() => finishGiveaway(client, messageId).catch((error) => console.error('Nyereményjáték lezárási hiba:', error)), Math.min(delay, 2_147_000_000));
  timer.unref();
  giveawayTimers.set(messageId, timer);
}

async function restoreGiveaways(client) {
  const result = await dbQuery('SELECT message_id, ends_at FROM nexabot_giveaways WHERE ended = FALSE');
  if (!result) return;
  for (const row of result.rows) scheduleGiveaway(client, row.message_id, row.ends_at);
}

async function handleTempVoice(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  if (!moduleEnabled(guild.id, 'tempVoice')) return;
  const config = getGuildConfig(guild.id);
  if (newState.channelId && newState.channelId === config.channels.tempVoiceLobby && newState.member) {
    const lobby = newState.channel;
    const categoryId = config.channels.tempVoiceCategory || lobby.parentId;
    const channel = await guild.channels.create({
      name: `🔊-${safeChannelName(newState.member.displayName)}`.slice(0, 100),
      type: ChannelType.GuildVoice,
      parent: categoryId || null,
      permissionOverwrites: [...lobby.permissionOverwrites.cache.values()].map((overwrite) => ({ id: overwrite.id, allow: overwrite.allow.bitfield, deny: overwrite.deny.bitfield })),
      reason: `NexaBot ideiglenes hangcsatorna: ${newState.member.user.tag}`
    }).catch(() => null);
    if (channel) {
      tempVoiceChannels.set(channel.id, newState.member.id);
      await newState.setChannel(channel, 'NexaBot ideiglenes hangcsatorna').catch(() => null);
    }
  }
  const left = oldState.channel;
  if (left && tempVoiceChannels.has(left.id) && left.members.size === 0) {
    tempVoiceChannels.delete(left.id);
    await left.delete('Üres NexaBot ideiglenes hangcsatorna').catch(() => null);
  }
}

module.exports = {
  communityCommands,
  handleCommunityCommand,
  handleMessageXp,
  handleSelfRoleSelect,
  handleRoleButton,
  handleReactionRole,
  handleGiveawayButton,
  handleTempVoice,
  restoreGiveaways,
  levelForXp,
  xpForNextLevel,
  randomWinners,
  rolePanel,
  userXp,
  xpLeaderboard,
  createSuggestion,
  createPoll,
  createAnnouncement,
  startGiveaway
};
