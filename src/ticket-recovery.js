const {ChannelType,PermissionFlagsBits}=require('discord.js');
const {getGuildConfig,setGuildConfig,moduleEnabled}=require('./config');
const {NAMES,SUPPORT_GUILD_ID}=require('./constants');
const TEMP_NAME='NEXA • IDEIGLENES TICKETEK';
const missingParent=error=>Number(error.code)===10003||Number(error.code)===50035&&/parent[_ ]?id|parent/i.test(String(error.message));
const inProgress=new Map();
async function ensureTicketCategory(guild,options={}){
 const existing=inProgress.get(guild.id);if(existing){const parent=await existing;if(parent.id!==options.excludeId&&[...guild.channels.cache.values()].filter(c=>c.parentId===parent.id).length<50)return parent;}
 const pending=ensureCategoryUnlocked(guild,options);inProgress.set(guild.id,pending);try{return await pending;}finally{if(inProgress.get(guild.id)===pending)inProgress.delete(guild.id);}
}
async function ensureCategoryUnlocked(guild,{preferredId=null,excludeId=null}={}){
 return require('./ticket-operations').withTicketLease('ticket-category:'+guild.id,async()=>{
  const channels=await guild.channels.fetch(),config=getGuildConfig(guild.id);
  const valid=channel=>channel&&channel.type===ChannelType.GuildCategory&&channel.id!==excludeId&&[...channels.values()].filter(c=>c.parentId===channel.id).length<50;
  const candidates=[preferredId,config.channels.ticketCategory,config.tickets.fallbackCategoryId].filter(Boolean).map(id=>channels.get(id));
  candidates.push(...[...channels.values()].filter(c=>c.name===NAMES.ticketCategory||c.name===TEMP_NAME||/TICKETS|TICKETEK/i.test(c.name)));
  const existing=candidates.find(valid);if(existing)return existing;
  const bot=guild.members.me||await guild.members.fetchMe();
  if(!bot.permissions.has(PermissionFlagsBits.ManageChannels))throw new Error('A ticketkategória pótlásához a botnak Csatornák kezelése jog kell.');
  const parent=await guild.channels.create({name:TEMP_NAME,type:ChannelType.GuildCategory,permissionOverwrites:[{id:guild.id,deny:[PermissionFlagsBits.ViewChannel]},{id:bot.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ManageChannels,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},...[...new Set([config.roles.staff,...(config.tickets.agentRoleIds||[])])].filter(id=>id&&id!==guild.id&&guild.roles.cache.has(id)).map(id=>({id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}))],reason:'NEXA: hiányzó vagy megtelt ticketkategória ideiglenes pótlása'});
  const latest=getGuildConfig(guild.id);await setGuildConfig(guild.id,{...latest,tickets:{...latest.tickets,fallbackCategoryId:parent.id}});return parent;
 });
}
async function createTicketChannel(guild,options){
 let parent=await ensureTicketCategory(guild,{preferredId:options.parent});
 try{return await guild.channels.create({...options,parent:parent.id});}
 catch(error){if(!missingParent(error))throw error;parent=await ensureTicketCategory(guild,{excludeId:parent.id});return guild.channels.create({...options,parent:parent.id});}
}
async function categoryDeleted(channel){
 const guild=channel.guild;if(!guild||channel.type!==ChannelType.GuildCategory)return;
 const config=getGuildConfig(guild.id);if(!moduleEnabled(guild.id,'tickets')&&guild.id!==SUPPORT_GUILD_ID)return;
 if(![config.channels.ticketCategory,config.tickets.fallbackCategoryId,...Object.values(config.tickets.categoryIds||{})].includes(channel.id)&&channel.name!==NAMES.ticketCategory&&channel.name!==TEMP_NAME&&!/TICKETS|TICKETEK/i.test(channel.name))return;
 let parent=await ensureTicketCategory(guild,{excludeId:channel.id});
 const orphans=[...guild.channels.cache.values()].filter(c=>(!c.parentId||c.parentId===channel.id)&&/^nexabot-(?:ticket\||web-support\|)/.test(c.topic||''));
 for(const ticket of orphans){if([...guild.channels.cache.values()].filter(c=>c.parentId===parent.id).length>=50)parent=await ensureTicketCategory(guild);await ticket.setParent(parent.id,{lockPermissions:false,reason:'NEXA: ticket áthelyezése ideiglenes kategóriába'});}
}
module.exports={ensureTicketCategory,createTicketChannel,categoryDeleted,TEMP_NAME};
