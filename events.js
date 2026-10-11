const { Events } = require('discord.js');
const { NAMES, COLORS } = require('./constants');
const { baseEmbed, sendLog } = require('./utils');
const {
  getGuildConfig,
  configuredChannel,
  configuredRole,
  moduleEnabled,
  logEnabled,
  dashboardUrl
} = require('./config');
const { handleMessageXp, handleTempVoice, handleReactionRole } = require('./community');
const { handleAiMessage } = require('./ai');
const { handleCustomCommand } = require('./custom-commands');
const { pick } = require('./i18n');
const { handleStarboardReaction } = require('./engagement');
const { captureDiscordSupportReply } = require('./web-support');

function registerEvents(client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    if (moduleEnabled(member.guild.id, 'welcome')) {
      const memberRole = member.user.bot
        ? configuredRole(member.guild, 'bot')
        : (configuredRole(member.guild, 'human') || configuredRole(member.guild, 'auto', NAMES.memberRole));
      if (memberRole) await member.roles.add(memberRole, 'NexaBot automatikus rang').catch(() => null);

      const welcomeChannel = configuredChannel(member.guild, 'welcome', NAMES.welcomeChannel);
      if (welcomeChannel?.isTextBased()) {
        const template = getGuildConfig(member.guild.id).messages.welcome;
        const description = template
          .replaceAll('{tag}', `${member}`)
          .replaceAll('{user}', `${member}`)
          .replaceAll('{username}', member.user.globalName || member.user.username)
          .replaceAll('{server}', member.guild.name)
          .replaceAll('{memberCount}', String(member.guild.memberCount))
          .replaceAll('{membercount}', String(member.guild.memberCount));
        const welcome = baseEmbed(
          pick(member.guild.id, `👋 Üdvözlünk, ${member.user.globalName || member.user.username}!`, `👋 Welcome, ${member.user.globalName || member.user.username}!`),
          description,
          COLORS.primary
        )
          .setThumbnail(member.user.displayAvatarURL())
          .addFields({ name: pick(member.guild.id, 'Taglétszám', 'Member count'), value: String(member.guild.memberCount), inline: true });
        await welcomeChannel.send({ content: `${member}`, embeds: [welcome] }).catch(() => null);
      }
    }
    if (logEnabled(member.guild.id, 'memberJoin')) await sendLog(member.guild, baseEmbed('📥 Tag csatlakozott', `${member.user.tag} (${member.id})`, COLORS.success));
  });

  client.on(Events.GuildCreate, async (guild) => {
    const { registerCrownCityInOwnerGuilds } = require('./crown-city');
    await registerCrownCityInOwnerGuilds({ guilds: { cache: new Map([[guild.id, guild]]) } });
    const owner = await guild.fetchOwner().catch(() => null);
    await owner?.send(
      pick(guild.id,
        `👋 Köszönöm, hogy meghívtad a **NEXA Botot** a **${guild.name}** szerverre!\nA funkciókat itt állíthatod be: ${dashboardUrl(guild.id)}`,
        `👋 Thank you for inviting **NEXA Bot** to **${guild.name}**!\nConfigure all features here: ${dashboardUrl(guild.id)}`)
    ).catch(() => null);
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    if (moduleEnabled(member.guild.id, 'welcome')) {
      const goodbyeChannel = configuredChannel(member.guild, 'goodbye');
      if (goodbyeChannel?.isTextBased()) {
        const template = getGuildConfig(member.guild.id).messages.goodbye;
        const description = template
          .replaceAll('{tag}', member.user.tag)
          .replaceAll('{user}', member.user.tag)
          .replaceAll('{username}', member.user.globalName || member.user.username)
          .replaceAll('{server}', member.guild.name)
          .replaceAll('{memberCount}', String(member.guild.memberCount))
          .replaceAll('{membercount}', String(member.guild.memberCount));
        await goodbyeChannel.send({
          embeds: [baseEmbed(pick(member.guild.id, '👋 Tag távozott', '👋 Member left'), description, COLORS.warning).setThumbnail(member.user.displayAvatarURL())]
        }).catch(() => null);
      }
    }
    if (logEnabled(member.guild.id, 'memberLeave')) await sendLog(member.guild, baseEmbed('📤 Tag távozott', `${member.user.tag} (${member.id})`, COLORS.warning));
  });

  client.on(Events.MessageCreate, handleMessageXp);
  client.on(Events.MessageCreate, handleAiMessage);
  client.on(Events.MessageCreate, handleCustomCommand);
  client.on(Events.MessageCreate, captureDiscordSupportReply);
  client.on(Events.MessageReactionAdd, (reaction, user) => {
    handleReactionRole(reaction, user, true).catch(() => null);
    handleStarboardReaction(reaction, user).catch(() => null);
  });
  client.on(Events.MessageReactionRemove, (reaction, user) => {
    handleReactionRole(reaction, user, false).catch(() => null);
    handleStarboardReaction(reaction, user).catch(() => null);
  });
  client.on(Events.VoiceStateUpdate, handleTempVoice);

  client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;
    if (!logEnabled(message.guild.id, 'messageDelete')) return;
    const author = message.author ? `${message.author.tag} (${message.author.id})` : 'Ismeretlen felhasználó';
    await sendLog(
      message.guild,
      baseEmbed('🗑️ Üzenet törölve', `**Csatorna:** ${message.channel}\n**Szerző:** ${author}`, COLORS.warning)
    );
  });

  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    if (!logEnabled(newMessage.guild.id, 'messageEdit')) return;
    const before = String(oldMessage.content || '[nem elérhető]').slice(0, 700);
    const after = String(newMessage.content || '[nem elérhető]').slice(0, 700);
    await sendLog(
      newMessage.guild,
      baseEmbed(
        '✏️ Üzenet szerkesztve',
        `**Csatorna:** ${newMessage.channel}\n**Szerző:** ${newMessage.author || 'Ismeretlen'}\n**Előtte:** ${before}\n**Utána:** ${after}`,
        COLORS.neutral
      )
    );
  });

  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const added = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id));
    const removed = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));
    const fields = [];
    if (oldMember.nickname !== newMember.nickname) {
      fields.push(`**Becenév:** ${oldMember.nickname || oldMember.user.username} → ${newMember.nickname || newMember.user.username}`);
    }
    if (added.size) fields.push(`**Hozzáadott rang:** ${added.map((role) => role.name).join(', ')}`);
    if (removed.size) fields.push(`**Elvett rang:** ${removed.map((role) => role.name).join(', ')}`);
    if (!fields.length || (!logEnabled(newMember.guild.id, 'roleUpdate') && !logEnabled(newMember.guild.id, 'nicknameChange'))) return;
    await sendLog(newMember.guild, baseEmbed('👤 Tag frissítve', `${newMember}\n${fields.join('\n')}`, COLORS.neutral));
  });

  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) return;
    if (!logEnabled(newState.guild.id, newState.channelId ? 'voiceJoin' : 'voiceLeave')) return;
    const description = oldState.channelId
      ? `${newState.member} elhagyta: ${oldState.channel}${newState.channel ? `\nBelépett: ${newState.channel}` : ''}`
      : `${newState.member} belépett: ${newState.channel}`;
    await sendLog(newState.guild, baseEmbed('🔊 Hangcsatorna-változás', description, COLORS.neutral));
  });

  client.on(Events.ChannelCreate, async (channel) => {
    if (!channel.guild) return;
    if (!logEnabled(channel.guild.id, 'channelUpdate')) return;
    await sendLog(channel.guild, baseEmbed('➕ Csatorna létrehozva', `**Név:** ${channel.name}\n**ID:** ${channel.id}`, COLORS.success));
  });

  client.on(Events.ChannelDelete, async (channel) => {
    if (!channel.guild) return;
    if (!logEnabled(channel.guild.id, 'channelUpdate')) return;
    await sendLog(channel.guild, baseEmbed('➖ Csatorna törölve', `**Név:** ${channel.name}\n**ID:** ${channel.id}`, COLORS.danger));
  });

  client.on(Events.GuildRoleCreate, async (role) => {
    if (!logEnabled(role.guild.id, 'roleUpdate')) return;
    await sendLog(role.guild, baseEmbed('🏷️ Rang létrehozva', `**Név:** ${role.name}\n**ID:** ${role.id}`, COLORS.success));
  });

  client.on(Events.GuildRoleDelete, async (role) => {
    if (!logEnabled(role.guild.id, 'roleUpdate')) return;
    await sendLog(role.guild, baseEmbed('🏷️ Rang törölve', `**Név:** ${role.name}\n**ID:** ${role.id}`, COLORS.danger));
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    if (!logEnabled(ban.guild.id, 'ban')) return;
    await sendLog(ban.guild, baseEmbed('🔨 Felhasználó kitiltva', `${ban.user.tag} (${ban.user.id})`, COLORS.danger));
  });

  client.on(Events.GuildBanRemove, async (ban) => {
    if (!logEnabled(ban.guild.id, 'ban')) return;
    await sendLog(ban.guild, baseEmbed('🔓 Kitiltás feloldva', `${ban.user.tag} (${ban.user.id})`, COLORS.success));
  });
}

module.exports = { registerEvents };
