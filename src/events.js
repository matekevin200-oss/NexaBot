const { Events } = require('discord.js');
const { recordError } = require('./telemetry');
const { NAMES, COLORS } = require('./constants');
const { baseEmbed, sendLog } = require('./utils');
const {
  getGuildConfig,
  configuredChannel,
  configuredRole,
  moduleEnabled,
  logEnabled,
  dashboardUrl, dbQuery, getBotOwnerId
} = require('./config');
const { handleMessageXp, handleTempVoice, handleReactionRole } = require('./community');
const { handleAiMessage } = require('./ai');
const { handleCustomCommand } = require('./custom-commands');
const { pick } = require('./i18n');
const { handleStarboardReaction } = require('./engagement');
const { captureDiscordSupportReply } = require('./web-support');
const { captureTicketFirstResponse } = require('./ticket-operations');

function registerEvents(client) {
  const listen=(event,handler)=>client.on(event,(...args)=>Promise.resolve().then(()=>handler(...args)).catch(error=>{
    const item=args[0];return recordError(error,{command:'event:'+event,guildId:item?.guild?.id||item?.guildId,userId:item?.user?.id||item?.author?.id}).catch(()=>null);
  }));
  listen(Events.GuildMemberAdd,member=>require('./platform-members').changed(member));
  listen(Events.GuildMemberAdd,member=>require('./next-flow').enqueue(member.guild,'member_join',member.id,'join:'+member.id+':'+member.joinedTimestamp));
  listen(Events.ChannelDelete,ch=>ch.guild&&require('./next-diagnostics').record(ch.guild.id,'channel-delete:'+ch.id,'channel_deleted',null,ch.id,{name:ch.name}));
  listen(Events.WebhooksUpdate,ch=>ch.guild&&require('./next-diagnostics').record(ch.guild.id,'webhooks:'+ch.id+':'+Math.floor(Date.now()/10000),'webhooks_changed',null,ch.id));
  listen(Events.MessageDelete,m=>m.guild&&m.author?.id===client.user.id&&require('./next-diagnostics').deletedPanel(m));
  listen(Events.GuildMemberAdd,member=>require('./platform-core').observed(member.guild.id,'join',member.id+':'+(member.joinedTimestamp||Date.now())));
  listen(Events.GuildMemberAdd, async (member) => {
    if (moduleEnabled(member.guild.id, 'welcome')) {
      const memberRole = member.user.bot
        ? configuredRole(member.guild, 'bot')
        : (configuredRole(member.guild, 'human') || configuredRole(member.guild, 'auto', NAMES.memberRole));
      if (memberRole) await member.roles.add(memberRole, 'NexaBot automatikus rang').catch(() => null);

      await require('./next-design').load(member.guild.id);
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
        const welcome = require('./next-design').embed(
          pick(member.guild.id, `👋 Üdvözlünk, ${member.user.globalName || member.user.username}!`, `👋 Welcome, ${member.user.globalName || member.user.username}!`),
          description,
          parseInt(require('./next-design').get(member.guild.id).welcomeColor.slice(1),16),member.guild.id
        )
          .setThumbnail(member.user.displayAvatarURL())
          .addFields({ name: pick(member.guild.id, 'Taglétszám', 'Member count'), value: String(member.guild.memberCount), inline: true });
        await welcomeChannel.send(await require('./platform-data').messageStyle(member.guild.id,'welcome',{ content: `${member}`, embeds: [welcome] })).catch(() => null);
      }
    }
    if (logEnabled(member.guild.id, 'memberJoin')) await sendLog(member.guild, baseEmbed('📥 Tag csatlakozott', `${member.user.tag} (${member.id})`, COLORS.success));
  });

  listen(Events.GuildCreate, async (guild) => {
    const { syncMdtGuildCommand } = require('./belv-mdt');
    await syncMdtGuildCommand(guild).catch(() => null);
    const owner = await guild.fetchOwner().catch(() => null);
    await owner?.send(
      pick(guild.id,
        `👋 Köszönöm, hogy meghívtad a **NEXA Botot** a **${guild.name}** szerverre!\nA funkciókat itt állíthatod be: ${dashboardUrl(guild.id)}`,
        `👋 Thank you for inviting **NEXA Bot** to **${guild.name}**!\nConfigure all features here: ${dashboardUrl(guild.id)}`)
    ).catch(() => null);
    const primaryOwnerId=getBotOwnerId();
    if(primaryOwnerId){const primaryOwner=await guild.client.users.fetch(primaryOwnerId).catch(()=>null);await primaryOwner?.send(`NEXA Bot csatlakozott egy szerverhez / NEXA Bot joined a server\n**Szerver / Server:** ${guild.name}\n**Szerver ID:** ${guild.id}\n**Szervertulajdonos / Server owner:** ${owner?.user?.tag||'unknown'} (${guild.ownerId})\n**Taglétszám / Members:** ${guild.memberCount||'—'}\nBeállítások / Dashboard: ${dashboardUrl(guild.id)}\n\nA szerverhez való csatlakozást a szerver tulajdonosa hagyja jóvá / Server membership must be approved by that server’s owner.`).catch(()=>null);}
  });

  listen(Events.GuildMemberRemove,member=>require('./platform-members').changed(member,true));
  listen(Events.GuildMemberRemove,member=>require('./platform-core').observed(member.guild.id,'leave',member.id+':'+(member.joinedTimestamp||Date.now())));
  listen(Events.GuildMemberRemove, async (member) => {
    if (moduleEnabled(member.guild.id, 'welcome')) {
      await require('./next-design').load(member.guild.id);
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
        await goodbyeChannel.send(await require('./platform-data').messageStyle(member.guild.id,'goodbye',{
          embeds: [require('./next-design').embed(pick(member.guild.id, 'Tag távozott', 'Member left'), description, COLORS.warning,member.guild.id).setThumbnail(member.user.displayAvatarURL())]
        })).catch(() => null);
      }
    }
    if (logEnabled(member.guild.id, 'memberLeave')) await sendLog(member.guild, baseEmbed('📤 Tag távozott', `${member.user.tag} (${member.id})`, COLORS.warning));
  });

  listen(Events.MessageCreate, async message=>{if(message.guild&&!message.author?.bot)await require('./platform-core').observed(message.guild.id,'message',message.id);await require('./platform-tickets').capture(message);});
  listen(Events.MessageCreate, handleMessageXp);
  listen(Events.MessageCreate, handleAiMessage);
  listen(Events.MessageCreate, handleCustomCommand);
  listen(Events.MessageCreate, (message) => captureDiscordSupportReply(message).catch(() => null));
  listen(Events.MessageCreate, (message) => captureTicketFirstResponse(message).catch(() => null));
  listen(Events.MessageReactionAdd, (reaction, user) => {
    handleReactionRole(reaction, user, true).catch(() => null);
    handleStarboardReaction(reaction, user).catch(() => null);
  });
  listen(Events.MessageReactionRemove, (reaction, user) => {
    handleReactionRole(reaction, user, false).catch(() => null);
    handleStarboardReaction(reaction, user).catch(() => null);
  });
  listen(Events.VoiceStateUpdate, handleTempVoice);

  listen(Events.MessageDelete,message=>require('./platform-panels').deleted(message));
  listen(Events.MessageDelete,message=>require('./platform-tickets').messageDeleted(message));
  listen(Events.MessageUpdate,(_,message)=>require('./platform-tickets').edited(message));
  listen(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;
    if (!logEnabled(message.guild.id, 'messageDelete')) return;
    await require('./telemetry').recordAudit('message_deleted',{guildId:message.guild.id,targetId:message.id,actorId:message.author?.id,metadata:{channelId:message.channel.id,content:String(message.content||'').slice(0,2000),contentAvailable:Boolean(message.content)}});
    const author = message.author ? `${message.author.tag} (${message.author.id})` : 'Ismeretlen felhasználó';
    await sendLog(
      message.guild,
      baseEmbed('🗑️ Üzenet törölve', `**Csatorna:** ${message.channel}\n**Szerző:** ${author}`, COLORS.warning)
    );
  });

  listen(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    if (!logEnabled(newMessage.guild.id, 'messageEdit')) return;
    await require('./telemetry').recordAudit('message_edited',{guildId:newMessage.guild.id,targetId:newMessage.id,actorId:newMessage.author?.id,metadata:{channelId:newMessage.channel.id,before:String(oldMessage.content||'').slice(0,2000),after:String(newMessage.content||'').slice(0,2000)}});
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

  listen(Events.GuildMemberUpdate,(_,member)=>require('./platform-members').changed(member));
  listen(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const added = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id));
    const removed = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));
    const fields = [];
    if (oldMember.nickname !== newMember.nickname) {
      fields.push(`**Becenév:** ${oldMember.nickname || oldMember.user.username} → ${newMember.nickname || newMember.user.username}`);
    }
    if (added.size) fields.push(`**Hozzáadott rang:** ${added.map((role) => role.name).join(', ')}`);
    if (removed.size) fields.push(`**Elvett rang:** ${removed.map((role) => role.name).join(', ')}`);
    if (!fields.length || (!logEnabled(newMember.guild.id, 'roleUpdate') && !logEnabled(newMember.guild.id, 'nicknameChange'))) return;
    await require('./telemetry').recordAudit('member_roles_changed',{guildId:newMember.guild.id,targetId:newMember.id,metadata:{added:[...added.keys()],removed:[...removed.keys()]}});
    await sendLog(newMember.guild, baseEmbed('👤 Tag frissítve', `${newMember}\n${fields.join('\n')}`, COLORS.neutral));
  });

  listen(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) return;
    if (!logEnabled(newState.guild.id, newState.channelId ? 'voiceJoin' : 'voiceLeave')) return;
    const description = oldState.channelId
      ? `${newState.member} elhagyta: ${oldState.channel}${newState.channel ? `\nBelépett: ${newState.channel}` : ''}`
      : `${newState.member} belépett: ${newState.channel}`;
    await sendLog(newState.guild, baseEmbed('🔊 Hangcsatorna-változás', description, COLORS.neutral));
  });

  listen(Events.ChannelCreate, async (channel) => {
    if (!channel.guild) return;
    if (!logEnabled(channel.guild.id, 'channelUpdate')) return;
    await require('./telemetry').recordAudit('channel_changed',{guildId:channel.guild.id,targetId:channel.id,metadata:{name:channel.name}});
    await sendLog(channel.guild, baseEmbed('➕ Csatorna létrehozva', `**Név:** ${channel.name}\n**ID:** ${channel.id}`, COLORS.success));
  });

  listen(Events.ChannelDelete, async (channel) => {
    if (!channel.guild) return;
    await dbQuery("UPDATE nexabot_tickets SET status='deleted',revision=revision+1,updated_by=$3 WHERE guild_id=$1 AND channel_id=$2 AND status<>'deleted'",[channel.guild.id,channel.id,client.user.id]).catch(()=>null);
    await dbQuery("UPDATE nexabot_web_support_tickets SET discord_state='failed',channel_id=NULL WHERE channel_id=$1 AND status NOT IN('deleted','deleting')",[channel.id]).catch(()=>null);
    await require('./ticket-recovery').categoryDeleted(channel);
    if (!logEnabled(channel.guild.id, 'channelUpdate')) return;
    await require('./telemetry').recordAudit('channel_changed',{guildId:channel.guild.id,targetId:channel.id,metadata:{name:channel.name}});
    await sendLog(channel.guild, baseEmbed('➖ Csatorna törölve', `**Név:** ${channel.name}\n**ID:** ${channel.id}`, COLORS.danger));
  });

  listen(Events.GuildRoleCreate, async (role) => {
    if (!logEnabled(role.guild.id, 'roleUpdate')) return;
    await sendLog(role.guild, baseEmbed('🏷️ Rang létrehozva', `**Név:** ${role.name}\n**ID:** ${role.id}`, COLORS.success));
  });

  listen(Events.GuildRoleDelete, async (role) => {
    if (!logEnabled(role.guild.id, 'roleUpdate')) return;
    await sendLog(role.guild, baseEmbed('🏷️ Rang törölve', `**Név:** ${role.name}\n**ID:** ${role.id}`, COLORS.danger));
  });

  listen(Events.GuildBanAdd, async (ban) => {
    if (!logEnabled(ban.guild.id, 'ban')) return;
    await sendLog(ban.guild, baseEmbed('🔨 Felhasználó kitiltva', `${ban.user.tag} (${ban.user.id})`, COLORS.danger));
  });

  listen(Events.GuildBanRemove, async (ban) => {
    if (!logEnabled(ban.guild.id, 'ban')) return;
    await sendLog(ban.guild, baseEmbed('🔓 Kitiltás feloldva', `${ban.user.tag} (${ban.user.id})`, COLORS.success));
  });
}

module.exports = { registerEvents };
