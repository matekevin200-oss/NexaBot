const {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const { dbQuery, moduleEnabled, isSupportModerationPaused } = require('./config');
const { baseEmbed, sendLog } = require('./utils');
const { COLORS } = require('./constants');
const { recordAudit } = require('./telemetry');
const { pick } = require('./i18n');

const EPHEMERAL = MessageFlags.Ephemeral;
let memoryCaseId = 0;
const memoryCases = [];

function modCommand(name, description, permission = PermissionFlagsBits.ModerateMembers) {
  const english = {
    ban: 'Ban a member from the server.', unban: 'Remove a user ban.', kick: 'Kick a member from the server.',
    timeout: 'Temporarily timeout a member.', untimeout: 'Remove a member timeout.', warn: 'Warn a member.',
    unwarn: 'Revoke one warning by case ID.', warnings: 'Show a member\'s active warnings.', clearwarns: 'Clear a member\'s active warnings.', clear: 'Delete multiple messages.',
    slowmode: 'Configure channel slowmode.', lock: 'Lock the current channel.', unlock: 'Unlock the current channel.',
    nick: 'Change a member\'s nickname.', userinfo: 'Show detailed user information.', serverinfo: 'Show server information.', avatar: 'Show a user\'s avatar.'
  }[name] || description;
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDescriptionLocalizations({ 'en-US': english, 'en-GB': english })
    .setDefaultMemberPermissions(permission)
    .setDMPermission(false);
}

function moderationCommands() {
  return [
    modCommand('ban', 'Kitilt egy tagot a szerverről.', PermissionFlagsBits.BanMembers)
      .addUserOption((o) => o.setName('tag').setDescription('Kit szeretnél kitiltani?').setRequired(true))
      .addStringOption((o) => o.setName('indok').setDescription('A kitiltás indoka.').setRequired(true).setMaxLength(500))
      .addIntegerOption((o) => o.setName('uzenet_torles').setDescription('Ennyi órányi üzenetét törölje.').setMinValue(0).setMaxValue(168)),
    modCommand('unban', 'Felold egy kitiltást.', PermissionFlagsBits.BanMembers)
      .addStringOption((o) => o.setName('felhasznalo_id').setDescription('A kitiltott felhasználó Discord ID-je.').setRequired(true))
      .addStringOption((o) => o.setName('indok').setDescription('A feloldás indoka.').setRequired(true).setMaxLength(500)),
    modCommand('kick', 'Kirúg egy tagot a szerverről.', PermissionFlagsBits.KickMembers)
      .addUserOption((o) => o.setName('tag').setDescription('Kit szeretnél kirúgni?').setRequired(true))
      .addStringOption((o) => o.setName('indok').setDescription('A kirúgás indoka.').setRequired(true).setMaxLength(500)),
    modCommand('timeout', 'Ideiglenesen felfüggeszt egy tagot.')
      .addUserOption((o) => o.setName('tag').setDescription('Kit szeretnél felfüggeszteni?').setRequired(true))
      .addIntegerOption((o) => o.setName('perc').setDescription('Időtartam percben (maximum 28 nap).').setRequired(true).setMinValue(1).setMaxValue(40320))
      .addStringOption((o) => o.setName('indok').setDescription('A felfüggesztés indoka.').setRequired(true).setMaxLength(500)),
    modCommand('untimeout', 'Feloldja egy tag felfüggesztését.')
      .addUserOption((o) => o.setName('tag').setDescription('Kinek oldod fel?').setRequired(true))
      .addStringOption((o) => o.setName('indok').setDescription('A feloldás indoka.').setRequired(true).setMaxLength(500)),
    modCommand('warn', 'Figyelmeztetést ad egy tagnak.')
      .addUserOption((o) => o.setName('tag').setDescription('Kit figyelmeztetsz?').setRequired(true))
      .addStringOption((o) => o.setName('indok').setDescription('A figyelmeztetés indoka.').setRequired(true).setMaxLength(500))
      .addStringOption((o) => o.setName('bizonyitek').setDescription('Opcionális bizonyíték vagy képlink.').setMaxLength(1000)),
    modCommand('warnings', 'Megmutatja egy tag aktív figyelmeztetéseit.')
      .addUserOption((o) => o.setName('tag').setDescription('Kinek a figyelmeztetéseit nézed?').setRequired(true)),
    modCommand('unwarn','Egy figyelmeztetés visszavonása indoklással.').addIntegerOption(o=>o.setName('ugy').setDescription('Figyelmeztetés ügyazonosítója.').setRequired(true).setMinValue(1)).addStringOption(o=>o.setName('indok').setDescription('Visszavonás indoka.').setRequired(true).setMinLength(3).setMaxLength(500)),
    modCommand('clearwarns', 'Törli egy tag aktív figyelmeztetéseit.')
      .addUserOption((o) => o.setName('tag').setDescription('Kinek törlöd a figyelmeztetéseit?').setRequired(true))
      .addStringOption((o) => o.setName('indok').setDescription('A törlés indoka.').setRequired(true).setMaxLength(500)),
    modCommand('clear', 'Több üzenetet töröl.', PermissionFlagsBits.ManageMessages)
      .addIntegerOption((o) => o.setName('darab').setDescription('1–100 üzenet.').setRequired(true).setMinValue(1).setMaxValue(100)),
    modCommand('slowmode', 'Beállítja a csatorna lassított módját.', PermissionFlagsBits.ManageChannels)
      .addIntegerOption((o) => o.setName('masodperc').setDescription('0 kikapcsolja; maximum 6 óra.').setRequired(true).setMinValue(0).setMaxValue(21600)),
    modCommand('lock', 'Lezárja az aktuális csatornát.', PermissionFlagsBits.ManageChannels)
      .addStringOption((o) => o.setName('indok').setDescription('A lezárás indoka.').setMaxLength(500)),
    modCommand('unlock', 'Feloldja az aktuális csatorna lezárását.', PermissionFlagsBits.ManageChannels)
      .addStringOption((o) => o.setName('indok').setDescription('A feloldás indoka.').setMaxLength(500)),
    modCommand('nick', 'Módosítja egy tag becenevét.', PermissionFlagsBits.ManageNicknames)
      .addUserOption((o) => o.setName('tag').setDescription('Kinek módosítod?').setRequired(true))
      .addStringOption((o) => o.setName('indok').setDescription('A módosítás indoka.').setRequired(true).setMaxLength(500))
      .addStringOption((o) => o.setName('becenev').setDescription('Az új becenév; üresen törlés.').setMaxLength(32)),
    modCommand('userinfo', 'Részletes adatokat mutat egy tagról.', null)
      .setDefaultMemberPermissions(null)
      .addUserOption((o) => o.setName('tag').setDescription('A megtekintett tag.')),
    modCommand('serverinfo', 'Részletes adatokat mutat a szerverről.', null).setDefaultMemberPermissions(null),
    modCommand('avatar', 'Megmutatja egy felhasználó profilképét.', null)
      .setDefaultMemberPermissions(null)
      .addUserOption((o) => o.setName('tag').setDescription('A megtekintett felhasználó.'))
  ];
}

async function createModerationCase({guildId,targetId,moderatorId,action,reason,durationSeconds=null,evidence=null,outcome='completed',requestKey=null}) {
  const result=await dbQuery(`INSERT INTO nexabot_moderation_cases(guild_id,target_id,moderator_id,action,reason,duration_seconds,evidence,outcome,request_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(guild_id,request_key) DO NOTHING RETURNING *`,[guildId,targetId,moderatorId,action,reason,durationSeconds,evidence,outcome,requestKey]);
  if(!result)throw new Error('Moderation records require a working database / A moderációs ügy mentéséhez adatbázis szükséges.');
  let item=result.rows[0],repeated=false;
  if(!item){item=(await dbQuery('SELECT * FROM nexabot_moderation_cases WHERE guild_id=$1 AND request_key=$2',[guildId,requestKey])).rows[0];repeated=true;if(!item||item.target_id!==targetId||item.moderator_id!==moderatorId||item.action!==action||item.reason!==reason)throw new Error('Moderation request mismatch.');}
  if(!repeated)await recordAudit('moderation_case',{actorId:moderatorId,guildId,targetId,metadata:{caseId:item.id,action,outcome:item.outcome}});
  return{id:Number(item.id),createdAt:new Date(item.created_at),outcome:item.outcome,repeated};
}
async function performCase(interaction,targetUser,action,reason,operation,options={}) {
  const item=await createModerationCase({guildId:interaction.guildId,targetId:targetUser.id,moderatorId:interaction.user.id,action,reason,durationSeconds:options.durationSeconds,evidence:options.evidence,outcome:'pending',requestKey:interaction.id||null});
  if(item.repeated){if(item.outcome==='completed')return item;throw new Error('The earlier moderation attempt needs review / A korábbi moderációs művelet eredményét ellenőrizni kell.');}
  let started=false;
  try{if(isSupportModerationPaused(interaction.guildId))throw new Error('Moderation was paused / A moderáció időközben szünetel.');await require('./platform-moderation').actor(interaction);started=true;await operation();const saved=await dbQuery("UPDATE nexabot_moderation_cases SET outcome='completed' WHERE id=$1 RETURNING id",[item.id]);if(!saved)throw new Error('Case completion could not be stored.');}
  catch(error){await dbQuery('UPDATE nexabot_moderation_cases SET outcome=$1 WHERE id=$2',[started?'uncertain':'cancelled',item.id]).catch(()=>null);throw error;}
  await sendLog(interaction.guild,require('./next-design').moderation(interaction.guild,interaction.user,targetUser,action,reason,item.id));
  return item;
}

function canAct(actor, target) {
  if (!target || target.id === actor.id || target.id === actor.guild.ownerId) return false;
  return actor.id === actor.guild.ownerId || actor.roles.highest.comparePositionTo(target.roles.highest) > 0;
}

async function notify(user, guild, action, reason, caseId,actor=null) {
  return user.send({embeds:[require('./next-design').moderation(guild,actor||'NEXA',user,action,reason,caseId)],allowedMentions:{parse:[]}})
    .then(() => true).catch(() => false);
}

async function publishCase(interaction, targetUser, action, reason, options = {}) {
  const item = await createModerationCase({
    guildId: interaction.guildId,
    targetId: targetUser.id,
    moderatorId: interaction.user.id,
    action,
    reason,
    durationSeconds: options.durationSeconds,
    evidence: options.evidence,
    requestKey: interaction.id||null
  });
  const embed = baseEmbed(`🛡️ Case #${item.id}`, `${targetUser} • **${action}**`, options.color || COLORS.warning)
    .addFields(
      { name: 'Moderátor', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
      { name: 'Felhasználó', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: 'Indok', value: reason }
    );
  if (options.durationSeconds) embed.addFields({ name: 'Időtartam', value: `${Math.ceil(options.durationSeconds / 60)} perc`, inline: true });
  if (options.evidence) embed.addFields({ name: 'Bizonyíték', value: String(options.evidence).slice(0, 1000) });
  if(!item.repeated)await sendLog(interaction.guild, embed);
  return item;
}

async function activeWarnings(guildId, targetId) {
  const result = await dbQuery(
    `SELECT id, moderator_id, reason, evidence, created_at FROM nexabot_moderation_cases
     WHERE guild_id = $1 AND target_id = $2 AND action IN ('Warn','Figyelmeztetés') AND active = TRUE AND outcome IN('recorded','completed')
     ORDER BY created_at DESC LIMIT 25`,
    [guildId, targetId]
  ).catch(() => null);
  if (result) return result.rows;
  return memoryCases.filter((item) => item.guild_id === guildId && item.target_id === targetId && item.action === 'Warn' && item.active).slice(0, 25);
}

async function handleModerationCommand(interaction) {
  if (!moderationCommands.names.has(interaction.commandName)) return false;
  if (!moduleEnabled(interaction.guildId, 'moderation') && !['userinfo', 'serverinfo', 'avatar'].includes(interaction.commandName)) {
    await interaction.reply({ content: pick(interaction.guildId, '❌ A moderációs modul ezen a szerveren ki van kapcsolva.', '❌ The moderation module is disabled on this server.'), flags: EPHEMERAL });
    return true;
  }
  await interaction.deferReply({ flags: EPHEMERAL });
  const name = interaction.commandName;
  const reason = interaction.options.getString('indok') || 'Nincs megadva';
  if (!['userinfo','serverinfo','avatar'].includes(name)) {
    try { interaction._freshActor=await require('./platform-moderation').actor(interaction); } catch(error) { await interaction.editReply(error.message); return true; }
  }
  if(name==='unwarn'){try{await require('./platform-moderation').revoke(interaction.guild,interaction.user.id,interaction.options.getInteger('ugy'),reason);await interaction.editReply('✅ Warning revoked / Figyelmeztetés visszavonva.');}catch(error){await interaction.editReply(error.message);}return true;}
  const targetUser = interaction.options.getUser('tag');
  const target = targetUser ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;
  if (isSupportModerationPaused(interaction.guildId) && !['userinfo', 'serverinfo', 'avatar'].includes(name)) {
    await interaction.editReply('A Support moderációja szünetel; a művelet nem hajtható végre.');
    return true;
  }

  if (name === 'userinfo') {
    const user = targetUser || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const roles = member ? member.roles.cache.filter((r) => r.id !== interaction.guildId).map((r) => r).slice(0, 15).join(' ') : 'Nincs a szerveren';
    await interaction.editReply({ embeds: [baseEmbed('👤 Felhasználói adatok', `${user}`, COLORS.primary).setThumbnail(user.displayAvatarURL({ size: 512 })).addFields(
      { name: 'Felhasználónév', value: user.tag, inline: true },
      { name: 'Discord ID', value: user.id, inline: true },
      { name: 'Fiók létrehozva', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` },
      { name: 'Csatlakozott', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Nincs a szerveren' },
      { name: 'Rangok', value: roles || 'Nincs' }
    )] });
    return true;
  }
  if (name === 'serverinfo') {
    const guild = interaction.guild;
    await interaction.editReply({ embeds: [baseEmbed('🏠 Szerveradatok', guild.name, COLORS.primary).setThumbnail(guild.iconURL({ size: 512 })).addFields(
      { name: 'Szerver ID', value: guild.id, inline: true },
      { name: 'Tulajdonos', value: `<@${guild.ownerId}>`, inline: true },
      { name: 'Tagok', value: String(guild.memberCount), inline: true },
      { name: 'Csatornák', value: String(guild.channels.cache.size), inline: true },
      { name: 'Rangok', value: String(guild.roles.cache.size), inline: true },
      { name: 'Létrehozva', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` }
    )] });
    return true;
  }
  if (name === 'avatar') {
    const user = targetUser || interaction.user;
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle(`${user.tag} profilképe`).setImage(user.displayAvatarURL({ size: 2048 }))] });
    return true;
  }
  if (name === 'unban') {
    const id = interaction.options.getString('felhasznalo_id').trim();
    if (!/^\d{16,22}$/.test(id)) return interaction.editReply(pick(interaction.guildId, '❌ Érvénytelen Discord ID.', '❌ Invalid Discord ID.'));
    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) return interaction.editReply(pick(interaction.guildId, '❌ Ez a felhasználó nincs kitiltva.', '❌ This user is not banned.'));
    const item=await performCase(interaction,ban.user,'Unban',reason,()=>interaction.guild.members.unban(id,`${reason} • ${interaction.user.tag}`),{color:COLORS.success});
    await notify(ban.user, interaction.guild, 'Kitiltás feloldása', reason, item.id,interaction.user);
    await interaction.editReply(pick(interaction.guildId, `✅ Kitiltás feloldva • **Case #${item.id}**`, `✅ Ban removed • **Case #${item.id}**`));
    return true;
  }
  if (name === 'warnings') {
    const rows = await activeWarnings(interaction.guildId, targetUser.id);
    const text = rows.length ? rows.map((row) => `**#${row.id}** • ${String(row.reason).slice(0, 160)} • <t:${Math.floor(new Date(row.created_at).getTime() / 1000)}:d>`).join('\n') : pick(interaction.guildId, 'Nincs aktív figyelmeztetés.', 'No active warnings.');
    await interaction.editReply({ embeds: [baseEmbed(`⚠️ ${targetUser.tag} figyelmeztetései`, text, COLORS.warning)] });
    return true;
  }
  if (name === 'clearwarns') {
    const rows = await activeWarnings(interaction.guildId, targetUser.id);
    if(!target||!canAct(interaction._freshActor,target))return interaction.editReply('A rangsor tiltja a figyelmeztetések visszavonását.');
    const saved=await dbQuery(`UPDATE nexabot_moderation_cases SET active=FALSE,revoked_by=$3,revoked_reason=$4,revoked_at=NOW() WHERE guild_id=$1 AND target_id=$2 AND action IN ('Warn','Figyelmeztetés') AND active=TRUE RETURNING id`,[interaction.guildId,targetUser.id,interaction.user.id,reason]);if(!saved)throw new Error('A figyelmeztetések módosítása nem menthető.');
    for (const row of memoryCases) if (row.guild_id === interaction.guildId && row.target_id === targetUser.id && row.action === 'Warn') row.active = false;
    const item = await publishCase(interaction, targetUser, 'Clear warnings', reason, { color: COLORS.success });
    await interaction.editReply(pick(interaction.guildId, `✅ ${saved.rowCount} figyelmeztetés törölve • **Case #${item.id}**`, `✅ ${saved.rowCount} warnings cleared • **Case #${item.id}**`));
    return true;
  }
  if (name === 'clear') {
    const amount = interaction.options.getInteger('darab');
    const deleted = await interaction.channel.bulkDelete(amount, true);
    await recordAudit('messages_clear', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: interaction.channelId, metadata: { count: deleted.size } });
    await interaction.editReply(pick(interaction.guildId, `✅ **${deleted.size}** üzenet törölve.`, `✅ Deleted **${deleted.size}** messages.`));
    return true;
  }
  if (name === 'slowmode') {
    const seconds = interaction.options.getInteger('masodperc');
    await interaction.channel.setRateLimitPerUser(seconds, `${reason} • ${interaction.user.tag}`);
    await recordAudit('slowmode', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: interaction.channelId, metadata: { seconds } });
    await interaction.editReply(pick(interaction.guildId, `✅ Lassított mód: **${seconds} másodperc**.`, `✅ Slowmode: **${seconds} seconds**.`));
    return true;
  }
  if (name === 'lock' || name === 'unlock') {
    const locked = name === 'lock';
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: locked ? false : null }, { reason: `${reason} • ${interaction.user.tag}` });
    await recordAudit(name, { actorId: interaction.user.id, guildId: interaction.guildId, targetId: interaction.channelId });
    await interaction.editReply(locked ? pick(interaction.guildId, '🔒 A csatorna lezárva.', '🔒 Channel locked.') : pick(interaction.guildId, '🔓 A csatorna feloldva.', '🔓 Channel unlocked.'));
    return true;
  }

  if (!target || !canAct(interaction._freshActor, target)) return interaction.editReply(pick(interaction.guildId, '❌ Ezen a tagon rangsorrend vagy jogosultság miatt nem hajtható végre a művelet.', '❌ This action cannot be performed due to permissions or role hierarchy.'));
  const actions={warn:'Warn',timeout:'Timeout',untimeout:'Untimeout',nick:'Nickname',kick:'Kick',ban:'Ban'},action=actions[name];
  if(name==='nick'&&interaction.guildId==='1517509643734221030'&&isBotOwner(target.id))return interaction.editReply('A NEXA fő tulajdonosának becenevét a bot ezen a szerveren nem módosítja.');
  let durationSeconds=null,color=['kick','ban'].includes(name)?COLORS.danger:COLORS.warning;
  if(['timeout','untimeout'].includes(name)&&!target.moderatable)return interaction.editReply('The bot cannot moderate this member / A bot nem moderálhatja ezt a tagot.');
  if(name==='nick'&&!target.manageable||name==='kick'&&!target.kickable||name==='ban'&&!target.bannable)return interaction.editReply('The bot role hierarchy prevents this action / A bot rangsora tiltja a műveletet.');
  if(name==='timeout')durationSeconds=interaction.options.getInteger('perc')*60;
  const operation=async()=>{const current=await interaction.guild.members.fetch({user:target.id,force:true});const actor=await require('./platform-moderation').actor(interaction);if(!canAct(actor,current))throw new Error('The role hierarchy changed / A rangsor megváltozott.');if(name==='timeout')await current.timeout(durationSeconds*1000,reason);if(name==='untimeout')await current.timeout(null,reason);if(name==='nick')await current.setNickname(interaction.options.getString('becenev')||null,reason);if(name==='kick')await current.kick(reason);if(name==='ban')await current.ban({deleteMessageSeconds:(interaction.options.getInteger('uzenet_torles')||0)*3600,reason});};
  const item=await performCase(interaction,target.user,action,reason,operation,{durationSeconds,evidence:interaction.options.getString('bizonyitek'),color});
  const dmSent=item.repeated?true:await notify(target.user,interaction.guild,action,reason,item.id,interaction.user);
  const resultEmbed=require('./next-design').moderation(interaction.guild,interaction.user,target.user,action,reason,item.id,interaction.user);if(!dmSent)resultEmbed.addFields({name:'Delivery / Kézbesítés',value:'The direct message could not be delivered / A privát értesítés nem volt kézbesíthető.'});await interaction.editReply({embeds:[resultEmbed],allowedMentions:{parse:[]}});
  return true;
}

moderationCommands.names = new Set(['ban', 'unban', 'kick', 'timeout', 'untimeout', 'warn', 'warnings', 'unwarn', 'clearwarns', 'clear', 'slowmode', 'lock', 'unlock', 'nick', 'userinfo', 'serverinfo', 'avatar']);

module.exports = { canAct, moderationCommands, handleModerationCommand, createModerationCase, activeWarnings };
