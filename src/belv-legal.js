'use strict';
const {ChannelType,EmbedBuilder,MessageFlags,PermissionFlagsBits,SlashCommandBuilder}=require('discord.js');
const {dbQuery,isPersistentStore}=require('./config');
const {classifyBelvRole,configuredRankRoleMap}=require('./belv-roster-rules');
const {recordAudit,recordError}=require('./telemetry');
const BELV_GUILD_ID='1517509643734221030',LEADERSHIP='BELVÉDELMI VEZETŐSÉG';
const ROLES=[
 {name:'⚖️ Jogi osztályvezető',color:0x8E2430},{name:'⚖️ Jogi osztályvezető-helyettes',color:0xA66A24},
 {name:'⭐ Vezető ügyvéd',color:0x183B66},{name:'⚖️ Ügyvéd',color:0x244F7A},
 {name:'📚 Ügyvédjelölt',color:0x79B8E5},{name:'📝 Gyakornok',color:0x9ACBEA}
];
const LEGAL_LEADS=ROLES.slice(0,2).map(x=>x.name);
const CATS=[
 {key:'main',name:'⚖️・BELV | JOGI ÉS ÜGYVÉDI OSZTÁLY',channels:[['announcements','📢・jogi-közlemények'],['rules','📜・osztályszabályzat'],['chat','💬・jogi-osztály-chat'],['presence','📅・jelenlét-és-időpontok']]},
 {key:'legal',name:'📂・BELV | JOGI ÜGYINTÉZÉS',channels:[['intake','📥・új-megkeresések'],['assignment','🗂️・ügyelosztás'],['status','📋・ügyállapotok'],['templates','📄・iratminták'],['leadership','🔒・vezetőségi-egyeztetés']]},
 {key:'training',name:'🎓・BELV | JOGI KÉPZÉS',channels:[['materials','📚・tananyag'],['practice','🧪・próbaügyek'],['exams','📝・vizsgák']]}
];
const SEEDS={
 announcements:['BELV Jogi és Ügyvédi Osztály','A BELV-en belüli Jogi és Ügyvédi Osztály megkezdte működését. A részleget a BELV vezetősége felügyeli. Az ügykezelés a szerveren belüli RP keretei között történik.'],
 rules:['Osztályszabályzat','• Az osztály a BELV belső szervezeti része, a BELV vezetőségének felügyelete alatt.\n• Kizárólag szerveren belüli RP-ügyeket kezelünk; ez nem valós jogi tanácsadás.\n• Ügyféladatot, bizonyítékot és ügyiratot nyilvános csatornába tilos küldeni.\n• Minden ügyhöz kijelölt ügyvéd és ügyszám tartozik.\n• Összeférhetetlenséget jelezni kell a vezetőségnek.\n• Lezáráskor az ügycsatorna megmarad és csak olvasható lesz.'],
 intake:['Új megkeresések','Ide csak általános, személyes adatot nem tartalmazó kérdés írható. Ügyféladatot vagy bizonyítékot ne küldj ide. Jogosult osztálytag a /belv-jogi-ugy paranccsal nyithat privát ügycsatornát.'],
 assignment:['Ügyelosztás','A vezetőség vagy jogi osztályvezető rögzíti az ügyszámot és a kijelölt ügyvédet. Ügyféladat kizárólag az adott ügy privát csatornájába kerülhet.'],
 status:['Ügyállapotok','Állapotok: **Új megkeresés → Ügyvéd kijelölve → Folyamatban → Vezetői felülvizsgálat → Lezárva / Archiválva.** Bizalmas adatot ne tegyetek ide.'],
 templates:['Iratminták','Csak jóváhagyott, RP-célú iratmintát tegyetek közzé. Személyes vagy konkrét ügyadatot ne másoljatok ide.'],
 leadership:['Vezetőségi egyeztetés','Ez a csatorna a BELV vezetősége és a jogi osztály vezetői számára fenntartott.'],
 materials:['Jogi tananyag','A vezetőség által közzétett, BELV-en belüli RP-ügyintézéshez készült tananyag.'],
 practice:['Próbaügyek','Kizárólag kitalált, képzési célú RP-eseteket használjatok.'],
 exams:['Vizsgák','A vezetőség itt teszi közzé a képzési alkalmak és vizsgák tudnivalóit.']
};
function commands(){
 const setup=new SlashCommandBuilder().setName('belv-jogi-setup').setDescription('Létrehozza a BELV Jogi és Ügyvédi Osztály hiányzó elemeit.').setDMPermission(false).setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
 const open=new SlashCommandBuilder().setName('belv-jogi-ugy').setDescription('Privát BELV jogi ügycsatornát nyit.').setDMPermission(false)
 .addUserOption(o=>o.setName('ugyfel').setDescription('Az érintett Discord-tag').setRequired(true))
 .addUserOption(o=>o.setName('ugyved').setDescription('A kijelölt ügyvéd').setRequired(true))
 .addStringOption(o=>o.setName('ugyfel-neve').setDescription('Ügyfél RP-neve').setRequired(true).setMaxLength(100))
 .addStringOption(o=>o.setName('rovid-leiras').setDescription('Rövid RP-leírás').setRequired(true).setMaxLength(700))
 .addStringOption(o=>o.setName('eset-idopontja').setDescription('Az eset időpontja').setRequired(true).setMaxLength(120))
 .addStringOption(o=>o.setName('erintettek').setDescription('Az RP-ben érintettek').setRequired(true).setMaxLength(500))
 .addStringOption(o=>o.setName('bizonyitekok-vagy-tanuk').setDescription('RP-bizonyítékok vagy tanúk').setRequired(true).setMaxLength(700))
 .addStringOption(o=>o.setName('kert-segitseg').setDescription('Milyen segítséget kér?').setRequired(true).setMaxLength(500))
 .addStringOption(o=>o.setName('egyeztetesi-idopont').setDescription('Mikor érhető el?').setRequired(true).setMaxLength(150));
 const close=new SlashCommandBuilder().setName('belv-jogi-lezaras').setDescription('Lezárja és archiválja a jogi ügycsatornát.').setDMPermission(false)
 .addStringOption(o=>o.setName('osszefoglalo').setDescription('Rövid RP-ügy záró összefoglaló').setRequired(true).setMaxLength(900));
 return [setup.toJSON(),open.toJSON(),close.toJSON()];
}
function rankMap(){return configuredRankRoleMap(process.env.BELV_RANK_ROLE_IDS);}
function isLeader(m){return Boolean(m?.roles?.cache?.some(r=>r.name===LEADERSHIP||((x=>x&&x.min<=19)(classifyBelvRole(r,rankMap())))));}
function isLegalLead(m){return Boolean(m?.roles?.cache?.some(r=>LEGAL_LEADS.includes(r.name)));}
function isLegalMember(m){return isLeader(m)||Boolean(m?.roles?.cache?.some(r=>ROLES.some(x=>x.name===r.name)));}
function role(g,n){return g.roles.cache.find(r=>r.name===n)||null;}
function reply(i,text){return i.reply({content:text,flags:MessageFlags.Ephemeral});}
function admin(i){return i.user.id===i.guild.ownerId||i.memberPermissions?.has(PermissionFlagsBits.Administrator);}
function audit(action,i,metadata){return recordAudit(action,{guildId:i.guildId,actorId:i.user.id,metadata:metadata||{}});}
function embed(title,description){return new EmbedBuilder().setColor(0x193B35).setTitle(title).setDescription(description).setFooter({text:'NEXA • BELV Jogi és Ügyvédi Osztály • RP'});}
function overwrites(g,allowed,writers=allowed){
 const out=[{id:g.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]}];
 for(const name of allowed){const r=role(g,name);if(!r)continue;const allow=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory];if(writers.includes(name))allow.push(PermissionFlagsBits.SendMessages);out.push({id:r.id,allow});}
 return out;
}
function belvLeaderNames(g){return [...g.roles.cache.values()].filter(r=>r.name===LEADERSHIP||((x=>x&&x.min<=19)(classifyBelvRole(r,rankMap())))).map(r=>r.name);}
function access(g,key){
 const legal=ROLES.map(x=>x.name),leaders=belvLeaderNames(g);
 if(key==='leadership'){const names=[...new Set(LEGAL_LEADS.concat(leaders))];return overwrites(g,names,names);}
 if(['announcements','rules','materials','exams'].includes(key))return overwrites(g,legal.concat(leaders),[]);
 return overwrites(g,legal.concat(leaders));
}
async function schema(){
 if(!isPersistentStore())throw new Error('A jogi ügykezeléshez tartós adatbázis szükséges.');
 const sql=[
 'CREATE TABLE IF NOT EXISTS nexabot_belv_legal_setup (guild_id TEXT PRIMARY KEY,status TEXT NOT NULL,resources JSONB NOT NULL DEFAULT \'{}\'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
 'CREATE TABLE IF NOT EXISTS nexabot_belv_legal_sequence (guild_id TEXT PRIMARY KEY,next_number INTEGER NOT NULL DEFAULT 1)',
 'CREATE TABLE IF NOT EXISTS nexabot_belv_legal_cases (guild_id TEXT NOT NULL,case_number INTEGER NOT NULL,channel_id TEXT NOT NULL,client_id TEXT NOT NULL,lawyer_id TEXT NOT NULL,created_by TEXT NOT NULL,status TEXT NOT NULL,summary TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),closed_at TIMESTAMPTZ,PRIMARY KEY(guild_id,case_number),UNIQUE(guild_id,channel_id))'
 ];
 for(const q of sql)await dbQuery(q);
}
async function setup(i){
 if(i.guildId!==BELV_GUILD_ID)return reply(i,'Ez a parancs kizárólag a BELV Discord-szerveren használható.');
 if(!admin(i))return reply(i,'Csak a BELV szerver tulajdonosa vagy rendszergazdája telepítheti.');
 const g=i.guild,bot=g.members.me||await g.members.fetchMe().catch(()=>null),missing=[];
 if(!bot?.permissions.has(PermissionFlagsBits.ManageRoles))missing.push('Szerepkörök kezelése');
 if(!bot?.permissions.has(PermissionFlagsBits.ManageChannels))missing.push('Csatornák kezelése');
 if(!bot?.permissions.has(PermissionFlagsBits.ViewChannel)||!bot?.permissions.has(PermissionFlagsBits.SendMessages)||!bot?.permissions.has(PermissionFlagsBits.ReadMessageHistory))missing.push('Csatorna megtekintése, üzenetküldés, előzmények olvasása');
 if(missing.length)return reply(i,'A bot jogosultságai hiányoznak: '+missing.join(', ')+'.');
 await i.deferReply({flags:MessageFlags.Ephemeral});
 const created=[],existing=[],errors=[],roleIds={},categoryIds={},channelIds={};
 try{
  await schema();await dbQuery('INSERT INTO nexabot_belv_legal_setup(guild_id,status) VALUES($1,$2) ON CONFLICT(guild_id) DO UPDATE SET status=$2,updated_at=NOW()',[g.id,'installing']);
  for(const item of ROLES){let r=role(g,item.name);if(!r){r=await g.roles.create({name:item.name,color:item.color,permissions:[],hoist:false,mentionable:false,reason:'BELV belső jogi osztály'});created.push('rang: '+item.name);}else existing.push('rang: '+item.name);roleIds[item.name]=r.id;}
  const leaders=[...g.roles.cache.values()].map(r=>({r,rank:classifyBelvRole(r,rankMap())})).filter(x=>x.rank&&x.rank.min<=19);
  const floor=leaders.length?Math.min(...leaders.map(x=>x.r.position)):0;
  if(floor>ROLES.length){const pos=ROLES.slice().reverse().map((x,n)=>({role:roleIds[x.name],position:floor-ROLES.length+n}));try{await g.roles.setPositions(pos);}catch(e){errors.push('Rangsorrend: '+e.message);}}
  else errors.push('A BELV vezetőségi rang alatti pozíciót nem lehetett biztonságosan megállapítani.');
  const initial=await g.channels.fetch();
  for(const cat of CATS){
   let parent=initial.find(c=>c.type===ChannelType.GuildCategory&&c.name===cat.name);
   if(!parent){parent=await g.channels.create({name:cat.name,type:ChannelType.GuildCategory,permissionOverwrites:[{id:g.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]}],reason:'BELV jogi osztály'});created.push('kategória: '+cat.name);}else existing.push('kategória: '+cat.name);
   categoryIds[cat.key]=parent.id;
   for(const [key,name] of cat.channels){
    const all=await g.channels.fetch();let c=all.find(x=>x.type===ChannelType.GuildText&&x.name===name);
    if(c&&c.parentId!==parent.id){errors.push('Más kategóriában már létezik, nem módosítottam: '+name);continue;}
    if(!c){c=await g.channels.create({name,type:ChannelType.GuildText,parent:parent.id,permissionOverwrites:access(g,key),reason:'BELV jogi osztály'});created.push('csatorna: '+name);}else existing.push('csatorna: '+name);
    channelIds[key]=c.id;
   }
  }
  for(const cat of CATS)for(const [key] of cat.channels){
   const c=g.channels.cache.get(channelIds[key]);if(!c)continue;
   try{
    await c.permissionOverwrites.set(access(g,key),'BELV jogi osztály jogosultság');
    const seed=SEEDS[key];if(!seed)continue;const marker='NEXA_BELV_LEGAL:'+key;
    const msgs=await c.messages.fetch({limit:50}).catch(()=>null);
    if(msgs?.some(m=>m.author.id===g.client.user.id&&String(m.embeds[0]?.footer?.text||'').includes(marker)))continue;
    await c.send({embeds:[embed(seed[0],seed[1]).setFooter({text:marker+' • BELV'})]});created.push('kezdőüzenet: '+c.name);
   }catch(e){errors.push('Csatorna '+c.name+': '+e.message);}
  }
  const expected=CATS.reduce((a,c)=>a+c.channels.length,0),complete=errors.length===0&&Object.keys(channelIds).length===expected;
  await dbQuery('UPDATE nexabot_belv_legal_setup SET status=$2,resources=$3::jsonb,updated_at=NOW() WHERE guild_id=$1',[g.id,complete?'completed':'partial',JSON.stringify({roles:roleIds,categories:categoryIds,channels:channelIds})]);
  await audit(complete?'belv_legal_setup_completed':'belv_legal_setup_partial',i,{created:created.length,existing:existing.length,errors});
  const lines=['**BELV Jogi és Ügyvédi Osztály '+(complete?'telepítve':'részben telepítve')+'.**','**Létrehozva:** '+(created.join(' • ')||'semmi új'),'**Már létezett:** '+(existing.join(' • ')||'nincs')];
  if(errors.length)lines.push('**Ellenőrizendő:** '+errors.join(' • '));return i.editReply(lines.join('\n').slice(0,1950));
 }catch(e){
  await dbQuery('UPDATE nexabot_belv_legal_setup SET status=$2,updated_at=NOW() WHERE guild_id=$1',[g.id,'partial']).catch(()=>null);
  await recordError(e,{command:'belv-jogi-setup',guildId:g.id,userId:i.user.id});await audit('belv_legal_setup_failed',i,{error:e.message,created:created.length});
  return i.editReply('A telepítés részben sikerült; a már létrejött elemeket megtartottam. Futtasd újra.\n'+(errors.join('\n')||e.message).slice(0,1400));
 }
}
async function isInstalled(id){if(!isPersistentStore())return false;await schema();const r=await dbQuery('SELECT status FROM nexabot_belv_legal_setup WHERE guild_id=$1',[id]);return ['completed','partial'].includes(r?.rows?.[0]?.status);}
function safeName(s){return String(s||'ugy').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55)||'ugy';}
async function openCase(i){
 if(i.guildId!==BELV_GUILD_ID)return reply(i,'Ez a parancs kizárólag a BELV Discord-szerveren használható.');
 if(!await isInstalled(i.guildId))return reply(i,'A jogi osztály nincs telepítve. Előbb futtasd a /belv-jogi-setup parancsot.');
 if(!isLegalMember(i.member))return reply(i,'Ügyet csak BELV vezető vagy jogi osztálytag nyithat.');
 const clientUser=i.options.getUser('ugyfel'),lawyerUser=i.options.getUser('ugyved');
 const client=await i.guild.members.fetch(clientUser.id).catch(()=>null),lawyer=await i.guild.members.fetch(lawyerUser.id).catch(()=>null);
 if(!client||!lawyer)return reply(i,'Az ügyfélnek és a kijelölt ügyvédnek a BELV szerver tagjának kell lennie.');
 const lawyerOK=isLeader(lawyer)||lawyer.roles.cache.some(r=>['⚖️ Jogi osztályvezető','⚖️ Jogi osztályvezető-helyettes','⭐ Vezető ügyvéd','⚖️ Ügyvéd'].includes(r.name));
 if(!lawyerOK)return reply(i,'A kijelölt személynek ügyvéd vagy magasabb jogi osztályrang kell.');
 await i.deferReply({flags:MessageFlags.Ephemeral});await schema();
 const seq=await dbQuery('INSERT INTO nexabot_belv_legal_sequence(guild_id,next_number) VALUES($1,2) ON CONFLICT(guild_id) DO UPDATE SET next_number=nexabot_belv_legal_sequence.next_number+1 RETURNING next_number-1 AS case_number',[i.guildId]);
 const n=Number(seq?.rows?.[0]?.case_number),parent=(await i.guild.channels.fetch()).find(c=>c.type===ChannelType.GuildCategory&&c.name===CATS[1].name);
 if(!parent)return i.editReply('Jogi ügyintézési kategória nem található. Futtasd újra a telepítőt.');
 const legalLeads=LEGAL_LEADS.map(x=>role(i.guild,x)).filter(Boolean),belvLeads=[...i.guild.roles.cache.values()].filter(r=>r.name===LEADERSHIP||((x=>x&&x.min<=19)(classifyBelvRole(r,rankMap()))));
 const allow=r=>({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]});
 const perms=[{id:i.guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},...legalLeads.map(allow),...belvLeads.map(allow),
  {id:clientUser.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},
  {id:lawyer.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},
  {id:i.guild.members.me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageChannels]}];
 const num=String(n).padStart(3,'0'),channel=await i.guild.channels.create({name:'belv-ugy-'+num+'-'+safeName(i.options.getString('ugyfel-neve')),type:ChannelType.GuildText,parent:parent.id,topic:'nexa-belv-legal|'+i.guildId+'|'+n+'|'+clientUser.id+'|'+lawyer.id,permissionOverwrites:perms,reason:'Privát BELV RP jogi ügy'});
 try{
  await dbQuery('INSERT INTO nexabot_belv_legal_cases(guild_id,case_number,channel_id,client_id,lawyer_id,created_by,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[i.guildId,n,channel.id,clientUser.id,lawyer.id,i.user.id,'open']);
  const fields=[['Ügyfél RP-neve','ugyfel-neve'],['Rövid leírás','rovid-leiras'],['Időpont','eset-idopontja'],['Érintettek','erintettek'],['Bizonyítékok / tanúk','bizonyitekok-vagy-tanuk'],['Kért segítség','kert-segitseg'],['Egyeztetés','egyeztetesi-idopont']];
  const text=['**Ügyszám:** BELV-JOGI-'+num,'**Ügyfél:** <@'+clientUser.id+'>','**Ügyvéd:** <@'+lawyer.id+'>'].concat(fields.map(p=>'**'+p[0]+':** '+i.options.getString(p[1]))).join('\n');
  await channel.send({embeds:[embed('BELV jogi ügy • '+num,text+'\n\nCsak szerveren belüli RP-ügyet kezeljetek; valós személyes adatot ne osszatok meg.')]});
  await audit('belv_legal_case_opened',i,{caseNumber:n,channelId:channel.id,clientId:clientUser.id,lawyerId:lawyer.id});
  return i.editReply('Privát ügycsatorna létrejött: <#'+channel.id+'>');
 }catch(e){await recordError(e,{command:'belv-jogi-ugy',guildId:i.guildId,userId:i.user.id});return i.editReply('A csatornát megtartottam, de az ügy mentése hibázott: '+e.message.slice(0,600));}
}
async function closeCase(i){
 if(i.guildId!==BELV_GUILD_ID)return reply(i,'Ez a parancs kizárólag a BELV Discord-szerveren használható.');
 const c=i.channel;if(!c?.topic?.startsWith('nexa-belv-legal|'))return reply(i,'Ezt a parancsot az ügy privát csatornájában használd.');
 const p=c.topic.split('|'),n=Number(p[2]),lawyerId=p[4];
 if(i.user.id!==lawyerId&&!isLegalLead(i.member)&&!isLeader(i.member))return reply(i,'Csak a kijelölt ügyvéd, a jogi osztály vezetője vagy a BELV vezetősége zárhatja le.');
 await i.deferReply({flags:MessageFlags.Ephemeral});await schema();const summary=i.options.getString('osszefoglalo');
 const marker='NEXA_BELV_LEGAL_CLOSED:'+n;
 const recent=await c.messages.fetch({limit:50}).catch(()=>null);
 if(!recent?.some(m=>m.author.id===i.client.user.id&&String(m.embeds[0]?.footer?.text||'').includes(marker))){
  await c.send({embeds:[embed('Lezárt ügy • BELV-JOGI-'+String(n).padStart(3,'0'),summary+'\n\nA csatorna megmarad és csak olvasható.').setFooter({text:marker})]});
 }
 const res=await dbQuery('UPDATE nexabot_belv_legal_cases SET status=$3,summary=$4,closed_at=NOW() WHERE guild_id=$1 AND case_number=$2 AND status=$5 RETURNING case_number',[i.guildId,n,'closed',summary,'open']);
 if(!res?.rowCount)return i.editReply('Az ügy nem található, vagy már lezárták.');
 for(const ow of c.permissionOverwrites.cache.values())await c.permissionOverwrites.edit(ow.id,{SendMessages:false,AddReactions:false}).catch(()=>null);
 await c.setTopic(c.topic+'|closed').catch(()=>null);
 await audit('belv_legal_case_closed',i,{caseNumber:n,channelId:c.id});return i.editReply('Az ügy lezárult és archiválva lett; a csatornát nem töröltem.');
}
async function syncGuildCommands(guild){
 if(!guild?.commands||guild.id!==BELV_GUILD_ID)return;
 const current=await guild.commands.fetch();
 for(const payload of commands()){
  const match=current.find(command=>command.name===payload.name);
  if(match)await match.edit(payload);else await guild.commands.create(payload);
 }
}
async function handleInteraction(i){
 if(!i.isChatInputCommand?.())return false;
 if(i.commandName==='belv-jogi-setup')return setup(i);
 if(i.commandName==='belv-jogi-ugy')return openCase(i);
 if(i.commandName==='belv-jogi-lezaras')return closeCase(i);
 return false;
}
module.exports={buildCommands:commands,syncGuildCommands,handleInteraction,BELV_GUILD_ID,CLASS_ROLES:ROLES,CATEGORIES:CATS,isBelvLeader:isLeader,isLegalMember};
