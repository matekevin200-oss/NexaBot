const {PermissionFlagsBits}=require('discord.js');
const {isBotOwner}=require('./config');
const {requireFaction}=require('./mdt-factions');
const data=require('./mdt-network-data');
const PAGE=100;
function publicMember(member){return{id:member.id,name:member.displayName||member.user?.globalName||member.user?.username||member.id,username:member.user?.username||'',joinedAt:member.joinedAt?.toISOString?.()||null,roles:[...member.roles.cache.values()].filter(r=>r.id!==member.guild.id).map(r=>({id:r.id,name:r.name})),owner:isBotOwner(member.id)};}
async function directory(ctx,guild,params=new URLSearchParams()){
 requireFaction(guild.id);if(ctx.game)data.error(403,'A Discord-taglistát a webes tagkezelésben használd.');await data.assertManager(ctx,guild);
 const search=String(params.get('q')||'').trim().slice(0,100),after=String(params.get('after')||'');
 if(after&&!data.snowflake(after))data.error(400,'Érvénytelen taglista-lapozás.');
 let members;
 try{
  if(data.snowflake(search)){const member=await data.freshMember(guild,search);members=member?[member]:[];}
  else if(search)members=[...(await guild.members.search({query:search,limit:PAGE})).values()];
  else members=[...(await guild.members.list({limit:PAGE,...(after?{after}:{})})).values()];
 }catch(error){data.error(503,'A Discord-taglista nem kérhető le. Ellenőrizd a bot Server Members Intent beállítását és Discord-kapcsolatát.');}
 const settings=await data.groupConfig(guild.id),bindings=await require('./belv-mdt').getSettings(guild.id),roster=(await data.query("SELECT user_id,roblox_ids,rank,reviewer FROM nexabot_mdt_network_members WHERE guild_id=$1 AND status='active'",[guild.id])).rows;await guild.roles.fetch();
 const binding=new Map((bindings.members||[]).map(m=>[m.discordId,m]));
 const networkBinding=new Map(roster.map(row=>[row.user_id,row])),leaderIds=new Set(settings.config.leaderRobloxIds||[]);
 const describe=member=>{const registered=networkBinding.get(member.id),legacy=binding.get(member.id),robloxIds=registered?.roblox_ids||legacy?.robloxIds||[];return{...publicMember(member),leader:data.isLeader(member,settings.config),mdt:registered||legacy?{robloxIds,rank:registered?.rank||legacy?.name||'Állománytag',reviewer:registered?.reviewer??(bindings.reviewerDiscordIds||[]).includes(member.id),leader:robloxIds.some(id=>leaderIds.has(String(id)))}:null};};
 const roles=(settings.config.leaderRoleIds||[]).map(id=>guild.roles.cache.get(id)).filter(r=>r&&r.id!==guild.id&&!r.managed).map(r=>({id:r.id,name:r.name,assignable:r.editable===true}));
 let selected=null;const selectedId=data.snowflake(params.get('selected'));if(selectedId){const member=await data.freshMember(guild,selectedId);if(member&&!member.user?.bot)selected=describe(member);}
 return{members:members.filter(m=>!m.user?.bot&&m.guild.id===guild.id).map(describe),selected,next:!search&&members.length===PAGE?members.at(-1).id:null,searchLimited:Boolean(search&&!data.snowflake(search)&&members.length===PAGE),leaderRoles:roles,canGrantLeadership:isBotOwner(ctx.user.id),guild:{id:guild.id,name:guild.name}};
}
async function roleForAssignment(ctx,guild,request){
 if(!isBotOwner(ctx.user.id)||ctx.game)data.error(403,'Vezetőségi Discord-rangot csak a fő owner oszthat ki a weben.');
 const bot=guild.members.me||await guild.members.fetchMe();if(!bot.permissions.has(PermissionFlagsBits.ManageRoles))data.error(403,'A botnak Rangok kezelése jog kell a vezetőségi rang kiosztásához.');
 const settings=await data.groupConfig(guild.id);await guild.roles.fetch();
 if(request==='create')return null;
 const role=guild.roles.cache.get(data.snowflake(request));
 if(!role||role.id===guild.id||role.managed||!(settings.config.leaderRoleIds||[]).includes(role.id))data.error(400,'Csak az adott frakció beállított vezetőségi rangja választható.');
 if(!role.editable)data.error(403,'A vezetőségi rang legyen a bot legmagasabb rangja alatt, és legyen kiosztható.');
 return role;
}
async function dedicatedRole(guild){return data.withLease('group-config:'+guild.id,async()=>{
 const settings=await data.groupConfig(guild.id);let role=guild.roles.cache.get(settings.config.mdtLeaderRoleId);
 if(role&&(role.managed||role.id===guild.id||!role.editable))data.error(403,'A korábbi MDT vezetőségi rangot a bot nem tudja kiosztani.');
 if(!role)role=await guild.roles.create({name:'MDT vezetőség',permissions:[],reason:'NEXA: fő owner által kért MDT vezetőségi rang'});
 const{activeLeaderDiscordIds,...storedConfig}=settings.config;const config={...storedConfig,mdtLeaderRoleId:role.id,leaderRoleIds:[...new Set([...(settings.config.leaderRoleIds||[]),role.id])]};
 await data.query(`INSERT INTO nexabot_mdt_network_groups(guild_id,config) VALUES($1,$2) ON CONFLICT(guild_id) DO UPDATE SET config=EXCLUDED.config,version=nexabot_mdt_network_groups.version+1,updated_at=NOW()`,[guild.id,config]);return role;
});}
async function setRobloxLeadership(ctx,guild,discordId,enabled){if(!isBotOwner(ctx.user.id)||ctx.game)data.error(403,'Teljes Roblox-ID-alapú MDT-vezetőséget csak a fő owner állíthat be.');return data.withLease('group-config:'+guild.id,async()=>{const roster=(await data.query("SELECT roblox_ids,status FROM nexabot_mdt_network_members WHERE guild_id=$1 AND user_id=$2",[guild.id,discordId])).rows[0];if(enabled&&(!roster||roster.status!=='active'||!roster.roblox_ids?.length))data.error(400,'Előbb adj meg legalább egy Roblox-ID-t és mentsd el az aktív MDT-tagságot.');const settings=await data.groupConfig(guild.id),own=new Set((roster?.roblox_ids||[]).map(String)),owners={...(settings.config.leaderRobloxOwners||{})};if(enabled)for(const id of own)owners[id]=discordId;else for(const[id,ownerId]of Object.entries(owners))if(ownerId===discordId)delete owners[id];const{activeLeaderDiscordIds,...storedConfig}=settings.config;const config={...storedConfig,leaderRobloxOwners:owners,leaderRobloxIds:Object.keys(owners)};await data.query(`INSERT INTO nexabot_mdt_network_groups(guild_id,config) VALUES($1,$2) ON CONFLICT(guild_id) DO UPDATE SET config=EXCLUDED.config,version=nexabot_mdt_network_groups.version+1,updated_at=NOW()`,[guild.id,config]);await data.event(ctx,enabled?'roblox_leadership_granted':'roblox_leadership_revoked','member',discordId,{robloxIds:[...own]},guild.id);return{mdtLeadershipGranted:enabled};});}
async function saveMember(ctx,guild,body,remove=false){
 requireFaction(guild.id);await data.assertManager(ctx,guild);
 const request=String(body.leaderRoleId||'');let role=null;
 if(request){if(remove)data.error(400,'Visszavonáskor nem kérhető rangkiosztás.');role=await roleForAssignment(ctx,guild,request);}
 if(typeof body.mdtLeader==='boolean'&&(!isBotOwner(ctx.user.id)||ctx.game))data.error(403,'Teljes Roblox-ID-alapú MDT-vezetőséget csak a fő owner állíthat be.');
 if(body.mdtLeader===true){const ids=Array.isArray(body.robloxIds)?body.robloxIds:String(body.robloxIds||'').split(/[\s,;]+/).filter(Boolean);if(!ids.length)data.error(400,'Vezetői hozzáféréshez előbb adj meg legalább egy Roblox-ID-t.');}
 const result=await data.changeMember(ctx,guild,body,remove);
 if(typeof body.mdtLeader==='boolean'&&!remove)await setRobloxLeadership(ctx,guild,result.discordId,body.mdtLeader);
 if(!request)return result;
 try{
  if(!role)role=await dedicatedRole(guild);
  const member=await data.freshMember(guild,result.discordId);if(!member||member.user?.bot)throw new Error('A kiválasztott személy már nem tagja ennek a szervernek.');
  if(!member.roles.cache.has(role.id))await member.roles.add(role.id,'NEXA: fő owner által kért vezetőségi rangkiosztás');
  await data.event(ctx,'leadership_role_granted','member',member.id,{roleId:role.id},guild.id);
  return{...result,leadershipRoleGranted:true,leaderRoleId:role.id};
 }catch(error){return{...result,leadershipRoleGranted:false,warning:'Az MDT-tagság mentve van; a vezetőségi Discord-rang kiosztása nem fejeződött be. '+String(error.message).slice(0,180)};}
}
module.exports={directory,saveMember,setRobloxLeadership};
