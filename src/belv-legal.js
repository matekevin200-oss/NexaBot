'use strict';
const {ActionRowBuilder,ButtonBuilder,ButtonStyle,ChannelType,EmbedBuilder,MessageFlags,ModalBuilder,PermissionFlagsBits,SlashCommandBuilder,TextInputBuilder,TextInputStyle,UserSelectMenuBuilder}=require('discord.js');
const {dbQuery,getGuildConfig,isPersistentStore,setGuildConfig}=require('./config');
const {applicationPanel,findApplicationTemplate}=require('./applications');
const {classifyBelvRole,configuredRankRoleMap}=require('./belv-roster-rules');
const {recordAudit,recordError}=require('./telemetry');
const BELV_GUILD_ID='1517509643734221030',LAWYER_ROLE='Ügyvédek',LEGAL_APPLICATION_TEMPLATE_KEY='tgf_belv_jogi';
const ROLES=[
 {name:'⚖️ Jogi osztályvezető',color:0x8E2430},{name:'⚖️ Jogi osztályvezető-helyettes',color:0xA66A24},
 {name:'⭐ Vezető ügyvéd',color:0x183B66},{name:'⚖️ Ügyvéd',color:0x244F7A},
 {name:'📚 Ügyvédjelölt',color:0x79B8E5},{name:'📝 Gyakornok',color:0x9ACBEA}
];
const LEGAL_LEADS=ROLES.slice(0,3).map(x=>x.name),ATTORNEY_RANKS=ROLES.slice(0,4).map(x=>x.name);
const legalIntakeDrafts=new Map();
const CATS=[
 {key:'main',name:'⚖️・BELV | JOGI ÉS ÜGYVÉDI OSZTÁLY',channels:[['announcements','📢・jogi-közlemények'],['rules','📜・osztályszabályzat'],['chat','💬・jogi-osztály-chat'],['presence','📅・jelenlét-és-időpontok'],['application','📨・jogi-jelentkezés']]},
 {key:'legal',name:'📂・BELV | JOGI ÜGYINTÉZÉS',channels:[['intake','📥・új-megkeresések'],['assignment','🗂️・ügyelosztás'],['status','📋・ügyállapotok'],['templates','📄・iratminták'],['leadership','🔒・vezetőségi-egyeztetés']]},
 {key:'training',name:'🎓・BELV | JOGI KÉPZÉS',channels:[['materials','📚・tananyag'],['practice','🧪・próbaügyek'],['exams','📝・vizsgák']]}
];
const SEEDS={
 announcements:['BELV Jogi és Ügyvédi Osztály','A BELV-en belüli Jogi és Ügyvédi Osztály megkezdte működését. A részleget a BELV vezetősége felügyeli. Az ügykezelés a szerveren belüli RP keretei között történik.'],
 rules:['Osztályszabályzat','• Az osztály a BELV belső szervezeti része, a BELV vezetőségének felügyelete alatt.\n• Kizárólag szerveren belüli RP-ügyeket kezelünk; ez nem valós jogi tanácsadás.\n• Ügyféladatot, bizonyítékot és ügyiratot nyilvános csatornába tilos küldeni.\n• Minden ügyhöz kijelölt ügyvéd és ügyszám tartozik.\n• Összeférhetetlenséget jelezni kell a vezetőségnek.\n• Lezáráskor az ügycsatorna megmarad és csak olvasható lesz.'],
 intake:['Új megkeresések','Ügyféladatot és bizonyítékot ne küldj ebbe a csatornába. A **BELV jogi ügy indítása** gombbal válaszd ki az ügyfelet és az ügyvédet, majd töltsd ki a privát ügyűrlapot. A /belv-jogi-ugy parancs továbbra is használható.'],
 applications:['Jogi osztály jelentkezés','A gombbal nyisd meg a NEXA űrlapját. Kizárólag RP-adatokat adj meg; valódi személyes vagy érzékeny adatot ne küldj. A beküldés az Ügyvédek ranggal rendelkező jogi osztálytagokhoz kerül.'],
 assignment:['Ügyelosztás','A vezetőség vagy jogi osztályvezető rögzíti az ügyszámot és a kijelölt ügyvédet. Ügyféladat kizárólag az adott ügy privát csatornájába kerülhet.'],
 status:['Ügyállapotok','Állapotok: **Új megkeresés → Ügyvéd kijelölve → Folyamatban → Vezetői felülvizsgálat → Lezárva / Archiválva.** Bizalmas adatot ne tegyetek ide.'],
 templates:['Iratminták','Csak jóváhagyott, RP-célú iratmintát tegyetek közzé. Személyes vagy konkrét ügyadatot ne másoljatok ide.'],
 leadership:['Vezetőségi egyeztetés','Ez a csatorna a BELV vezetősége és a jogi osztály vezetői számára fenntartott.'],
 materials:['Jogi tananyag','A vezetőség által közzétett, BELV-en belüli RP-ügyintézéshez készült tananyag.'],
 practice:['Próbaügyek','Kizárólag kitalált, képzési célú RP-eseteket használjatok.'],
 exams:['Vizsgák','A vezetőség itt teszi közzé a képzési alkalmak és vizsgák tudnivalóit.']
};
async function ensureLegalApplicationTemplate(guild,channelIds,roleIds){
 const current=getGuildConfig(guild.id),templates=current.applications?.templates||[];
 const template={
  key:LEGAL_APPLICATION_TEMPLATE_KEY,title:'BELV jogi osztály jelentkezés',emoji:'⚖️',
  description:'Kérjük, hogy minden kérdésre komolyan, részletesen és saját megfogalmazásodban válaszolj. A jelentkezés a kommunikációs készségedet, jogi ismereteidet, problémamegoldó képességedet és RP-tapasztalatodat méri. A jelentkezéseket legfeljebb 48 órán belül bíráljuk el; a hiányos, komolytalan vagy másolt válasz elutasítható. A válaszokat csak a jogi osztály bírálói látják.',
  openChannelId:channelIds.application,reviewChannelId:channelIds.leadership,resultChannelId:channelIds.application,
  accessRoleId:null,reviewerRoleId:roleIds[ROLES[0].name],
  reviewerRoleIds:[roleIds[ROLES[1].name],roleIds[ROLES[2].name]].filter(Boolean),
  acceptedRoleId:null,notificationRoleId:null,blindReview:false,active:true,cooldownHours:24,
  questions:[
   {label:'1. 👤 Bemutatkozás — Mutatkozz be röviden! Hány éves vagy, és mióta játszol RP-szervereken?',placeholder:'Saját szavaiddal válaszolj.',maxLength:1000},
   {label:'2. ⚖️ Motiváció — Miért szeretnél csatlakozni a BELV Jogi és Ügyvédi Osztályához? Miért ezt az alosztályt választottad?',placeholder:'Írd le a motivációdat és a választásod okát.',maxLength:1000},
   {label:'3. 📚 Jogi alapismeretek — Szerinted mi egy ügyvéd legfontosabb feladata, és milyen kötelezettségei vannak az ügyfelével szemben?',placeholder:'Fejtsd ki a saját álláspontodat.',maxLength:1000},
   {label:'4. 🏛️ Ártatlanság vélelme — Mit jelent az ártatlanság vélelme, és miért fontos egy büntetőeljárás során?',placeholder:'Magyarázd el a jelentőségét.',maxLength:1000},
   {label:'5. 🔒 Ügyvédi titoktartás — Mit tennél, ha az ügyfeled bizalmas információkat osztana meg veled, amelyeket egy másik személy szeretne megtudni?',placeholder:'Írd le, hogyan kezelnéd a bizalmas információt.',maxLength:1000},
   {label:'6. 🗣️ Tárgyalási szituáció — Egy tárgyaláson az ügyész olyan bizonyítékot mutat be, amely szerinted nem megbízható. Hogyan reagálnál, és milyen lépéseket tennél az ügyfeled védelmében?',placeholder:'Írd le a tárgyalási lépéseidet.',maxLength:1000},
   {label:'7. 🚨 Intézkedési szituáció — Egy rendvédelmi szerv tagja szerinted szabálytalanul jár el az ügyfeleddel szemben. Hogyan kezelnéd a helyzetet?',placeholder:'Írd le a szabályos RP-eljárást.',maxLength:1000},
   {label:'8. ⚖️ Etikai döntés — Mit tennél, ha az ügyfeled arra kérne, hogy hamis bizonyítékot használj fel a tárgyaláson?',placeholder:'Írd le az etikai döntésedet és az indokát.',maxLength:1000},
   {label:'9. 🤝 Konfliktuskezelés — Hogyan kezelnéd, ha egy másik ügyvéd vagy rendvédelmi vezető tiszteletlenül beszélne veled egy hivatalos eljárás során?',placeholder:'Mutasd be a professzionális reakciódat.',maxLength:1000},
   {label:'10. 🎯 Alkalmasság és aktivitás — Miért gondolod, hogy alkalmas lennél a Jogi és Ügyvédi Osztály tagjának? Hetente mennyi időt tudnál a feladataidra fordítani?',placeholder:'Írd le az alkalmasságodat és heti vállalásodat.',maxLength:1000}
  ]
 };
 const remaining=templates.filter(item=>item.key!==LEGAL_APPLICATION_TEMPLATE_KEY);
 await setGuildConfig(guild.id,{...current,applications:{...current.applications,templates:[...remaining,template]}});
 const saved=findApplicationTemplate(guild.id,LEGAL_APPLICATION_TEMPLATE_KEY);
 if(!saved?.active||!saved.openChannelId||!saved.reviewChannelId||!saved.resultChannelId)throw new Error('A jogi jelentkezési űrlap beállítása nem mentődött el.');
 return saved;
}
function commands(){
 const setup=new SlashCommandBuilder().setName('belv-jogi-setup').setDescription('Létrehozza a BELV Jogi és Ügyvédi Osztály hiányzó elemeit.').setDMPermission(false).setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
 const open=new SlashCommandBuilder().setName('belv-jogi-ugy').setDescription('Privát BELV jogi ügycsatornát nyitó űrlap.').setDMPermission(false)
  .addUserOption(o=>o.setName('ugyfel').setDescription('Az érintett Discord-tag').setRequired(true))
  .addUserOption(o=>o.setName('ugyved').setDescription('A kijelölt ügyvéd').setRequired(true));
  const close=new SlashCommandBuilder().setName('belv-jogi-lezaras').setDescription('Megnyitja az ügy lezáró űrlapját.').setDMPermission(false);
  return [setup.toJSON(),open.toJSON(),close.toJSON()];
}
function rankMap(){return configuredRankRoleMap(process.env.BELV_RANK_ROLE_IDS);}
function isLegalLead(m){return Boolean(m?.roles?.cache?.some(r=>LEGAL_LEADS.includes(r.name)));}
function isLegalMember(m){return Boolean(m?.roles?.cache?.some(r=>r.name===LAWYER_ROLE));}
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
function applicationOverwrites(g){
 const out=[{id:g.roles.everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory],deny:[PermissionFlagsBits.SendMessages,PermissionFlagsBits.AddReactions]}];
 for(const r of g.roles.cache.values()){const rank=classifyBelvRole(r,rankMap());if(rank&&['foosztalyvezeto','muveleti-vezeto'].includes(rank.key))out.push({id:r.id,deny:[PermissionFlagsBits.ViewChannel]});}
 const bot=g.members.me;if(bot)out.push({id:bot.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.SendMessages,PermissionFlagsBits.EmbedLinks]});
 return out;
}
function caseOverwrites(g,clientId,lawyerId,closed=false){
 const out=[{id:g.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]}];
 for(const id of [clientId,lawyerId]){if(!/^\d{16,22}$/.test(String(id||'')))continue;const allow=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory];if(!closed)allow.push(PermissionFlagsBits.SendMessages);out.push({id:String(id),allow});}
 const bot=g.members.me;if(bot)out.push({id:bot.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory,...(closed?[]:[PermissionFlagsBits.SendMessages]),PermissionFlagsBits.ManageChannels]});
 return out;
}
function access(g,key){return overwrites(g,[LAWYER_ROLE]);}
async function syncAttorneyMemberships(g,groupRole,errors){
 const members=await g.members.fetch();
 for(const member of members.values()){
  const shouldHave=member.roles.cache.some(r=>ATTORNEY_RANKS.includes(r.name)),has=member.roles.cache.has(groupRole.id);
  if(shouldHave===has)continue;
  try{if(shouldHave)await member.roles.add(groupRole,'BELV jogi ügyvédcsoport automatikus hozzárendelése');else await member.roles.remove(groupRole,'BELV jogi ügyvédcsoport szinkronizálása');}
  catch(e){errors.push('Ügyvédek rang szinkronja ('+member.user.tag+'): '+e.message);}
 }
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
  let lawyerGroup=role(g,LAWYER_ROLE);if(!lawyerGroup){lawyerGroup=await g.roles.create({name:LAWYER_ROLE,color:0x244F7A,permissions:[],hoist:false,mentionable:false,reason:'BELV jogi ügyvéd-hozzáférési csoport'});created.push('rang: '+LAWYER_ROLE);}else existing.push('rang: '+LAWYER_ROLE);roleIds[LAWYER_ROLE]=lawyerGroup.id;
  const leaders=[...g.roles.cache.values()]
   .map(r=>({r,rank:classifyBelvRole(r,rankMap())}))
   .filter(x=>x.rank&&x.rank.min<=19)
   .sort((a,b)=>a.rank.min-b.rank.min||b.r.position-a.r.position);
  const rankName=value=>String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
  const bomoOrder=['parancsnok','parancsnokhelyettes','vezeto operativ','operativ tiszt','fedett ugynok','jelolt'];
  const bomoRoles=[...g.roles.cache.values()].filter(r=>rankName(r.name).includes('bomo'))
   .sort((a,b)=>{
    const ai=bomoOrder.findIndex(part=>rankName(a.name).includes(part));
    const bi=bomoOrder.findIndex(part=>rankName(b.name).includes(part));
    return (ai<0?bomoOrder.length:ai)-(bi<0?bomoOrder.length:bi)||b.position-a.position;
   });
  const separators=[...g.roles.cache.values()].filter(r=>/^[\\s|•·…]*[-—_─━]{4,}[\\s|•·…]*$/.test(r.name));
  const legalOrder=[ROLES[0].name,ROLES[1].name,ROLES[2].name,ROLES[3].name,LAWYER_ROLE,ROLES[4].name,ROLES[5].name]
   .map(name=>role(g,name)).filter(Boolean);
  const special=role(g,'Special');
  const orderedRoles=[...leaders.map(x=>x.r),...separators.slice(0,1),...bomoRoles,...separators.slice(1,2),...legalOrder,...separators.slice(2),...(special?[special]:[])];
  const orderedUnique=[...new Map(orderedRoles.map(r=>[r.id,r])).values()];
  if(leaders.length&&orderedUnique.length){
   const topPosition=Math.max(...leaders.map(x=>x.r.position));
   const positions=orderedUnique.map((r,index)=>({role:r.id,position:topPosition-index}));
   try{await g.roles.setPositions(positions);}
   catch(e){errors.push('BELV/BOMO/jogi rangsorrend: '+e.message);}
  }else errors.push('A BELV vezetőségi rangok pozícióját nem lehetett biztonságosan megállapítani.');
  try{await syncAttorneyMemberships(g,lawyerGroup,errors);}catch(e){errors.push('Ügyvédek rang szinkronja: '+e.message);}
  const initial=await g.channels.fetch();
  for(const cat of CATS){
   let parent=initial.find(c=>c?.type===ChannelType.GuildCategory&&c.name===cat.name);
   if(!parent){parent=await g.channels.create({name:cat.name,type:ChannelType.GuildCategory,permissionOverwrites:[{id:g.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]}],reason:'BELV jogi osztály'});created.push('kategória: '+cat.name);}else existing.push('kategória: '+cat.name);
   categoryIds[cat.key]=parent.id;
   for(const [key,name] of cat.channels){
    const all=await g.channels.fetch();let c=all.find(x=>x?.type===ChannelType.GuildText&&x.name===name);
    if(c&&c.parentId!==parent.id){errors.push('Más kategóriában már létezik, nem módosítottam: '+name);continue;}
    if(!c){c=await g.channels.create({name,type:ChannelType.GuildText,parent:parent.id,permissionOverwrites:key==='application'?applicationOverwrites(g):access(g,key),reason:'BELV jogi osztály'});created.push('csatorna: '+name);}else existing.push('csatorna: '+name);
    channelIds[key]=c.id;
   }
  }
  const caseRows=await dbQuery('SELECT case_number,channel_id,client_id,lawyer_id,status FROM nexabot_belv_legal_cases WHERE guild_id=$1',[g.id]);
  for(const row of caseRows?.rows||[]){
   const c=await g.channels.fetch(String(row.channel_id)).catch(()=>null);
   if(!c||c.type!==ChannelType.GuildText||!String(c.topic||'').startsWith('nexa-belv-legal|')){errors.push('Ügycsatorna nem található vagy nem ellenőrizhető: BELV-JOGI-'+String(row.case_number).padStart(3,'0'));continue;}
   try{await c.permissionOverwrites.set(caseOverwrites(g,row.client_id,row.lawyer_id,row.status==='closed'),'BELV jogi ügy hozzáférések frissítése');}
   catch(e){errors.push('Ügycsatorna jogosultsága ('+c.name+'): '+e.message);}
  }
  let legalApplicationTemplate=null;
  try{legalApplicationTemplate=await ensureLegalApplicationTemplate(g,channelIds,roleIds);}
  catch(e){errors.push('Jogi jelentkezési űrlap beállítása: '+e.message);}
  for(const cat of CATS)for(const [key] of cat.channels){
   const c=g.channels.cache.get(channelIds[key]);if(!c)continue;
   try{
    await c.permissionOverwrites.set(key==='application'?applicationOverwrites(g):access(g,key),'BELV jogi osztály jogosultság');
    const seedKey=key==='application'?'applications':key,seed=SEEDS[seedKey];if(!seed)continue;
    const marker='NEXA_BELV_LEGAL:'+seedKey,appFooter='NexaBot • TGF Forge • '+LEGAL_APPLICATION_TEMPLATE_KEY;
    const msgs=await c.messages.fetch({limit:50}).catch(()=>null);
    const existingSeed=msgs?.find(m=>m.author.id===g.client.user.id&&(String(m.embeds[0]?.footer?.text||'').includes(marker)||(seedKey==='applications'&&String(m.embeds[0]?.footer?.text||'').startsWith(appFooter))));
    let payload={embeds:[embed(seed[0],seed[1]).setFooter({text:marker+' • BELV'})],components:key==='intake'?[intakeButtonRow()]:key==='application'?[applicationButtonRow()]:[]};
    if(seedKey==='applications'&&legalApplicationTemplate)payload=applicationPanel(legalApplicationTemplate);
    if(existingSeed){if(key==='intake'||seedKey==='applications')await existingSeed.edit(payload);continue;}
    await c.send(payload);created.push('kezdőüzenet: '+c.name);
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
function intakeDraftKey(i){return i.guildId+':'+i.user.id;}
function intakeButtonRow(){return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('belv_legal:intake').setLabel('BELV jogi ügy indítása').setStyle(ButtonStyle.Primary));}
function applicationButtonRow(){return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('belv_legal:application').setLabel('Jelentkezés a jogi osztályba').setStyle(ButtonStyle.Success));}
function intakeFormRows(){
 return [
  new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('belv_legal:select-client').setPlaceholder('Ügyfél kiválasztása').setMinValues(1).setMaxValues(1)),
  new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('belv_legal:select-lawyer').setPlaceholder('Kijelölt ügyvéd kiválasztása').setMinValues(1).setMaxValues(1)),
  new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('belv_legal:intake-next').setLabel('Tovább az űrlaphoz').setStyle(ButtonStyle.Success))
 ];
}
async function startApplication(i){
 if(i.guildId!==BELV_GUILD_ID)return reply(i,'Ez az űrlap kizárólag a BELV Discord-szerveren használható.');
 if(isLegalMember(i.member))return reply(i,'Már a jogi osztály tagja vagy.');
 const modal=new ModalBuilder().setCustomId('belv_legal:application-submit').setTitle('Jogi osztály jelentkezés')
  .addComponents(
   caseModalInput('rp_name','RP-neved',TextInputStyle.Short,100,'A BELV-szerveren használt RP-neved'),
   caseModalInput('desired_rank','Megpályázott jogi rang',TextInputStyle.Short,100,'Például ügyvédjelölt vagy gyakornok'),
   caseModalInput('motivation','Miért jelentkezel?',TextInputStyle.Paragraph,800,'Röviden írd le a motivációdat'),
   caseModalInput('experience','Korábbi RP- vagy ügyintézési tapasztalat',TextInputStyle.Paragraph,800,'RP-tapasztalat; ha nincs, írd be: nincs'),
   caseModalInput('availability','Heti elérhetőség',TextInputStyle.Short,100,'Például hétköznap esténként')
  );
 return i.showModal(modal);
}
async function submitApplication(i){
 if(i.guildId!==BELV_GUILD_ID)return reply(i,'Ez az űrlap kizárólag a BELV Discord-szerveren használható.');
 await i.deferReply({flags:MessageFlags.Ephemeral});
 try{
  const inbox=(await i.guild.channels.fetch()).find(c=>c?.type===ChannelType.GuildText&&c.name==='🔒・vezetőségi-egyeztetés'&&c.parent?.name===CATS[1].name);
  if(!inbox)return i.editReply('Nem találom a jogi jelentkezések fogadására használt belső csatornát; értesítsd a BELV rendszergazdáját.');
  const fields=[
   {name:'Jelentkező',value:'<@'+i.user.id+'>',inline:true},
   {name:'RP-név',value:i.fields.getTextInputValue('rp_name').trim(),inline:true},
   {name:'Megpályázott rang',value:i.fields.getTextInputValue('desired_rank').trim(),inline:true},
   {name:'Motiváció',value:i.fields.getTextInputValue('motivation').trim()},
   {name:'Tapasztalat',value:i.fields.getTextInputValue('experience').trim()},
   {name:'Elérhetőség',value:i.fields.getTextInputValue('availability').trim()}
  ];
  await inbox.send({embeds:[embed('Új jogi osztály jelentkezés','Beküldő: <@'+i.user.id+'>').addFields(fields).setTimestamp()]});
  await audit('belv_legal_application_submitted',i,{reviewChannelId:inbox.id});
  return i.editReply('✅ A jelentkezésedet elküldtem a jogi osztály elbírálására.');
 }catch(error){
  await recordError(error,{command:'belv_legal_application',guildId:i.guildId,userId:i.user.id}).catch(()=>null);
  return i.editReply('A jelentkezést nem sikerült továbbítani. Próbáld meg később, vagy szólj a jogi osztály egyik tagjának.');
 }
}
async function startIntake(i){
 if(i.guildId!==BELV_GUILD_ID)return reply(i,'Ez az űrlap kizárólag a BELV Discord-szerveren használható.');
 if(!isLegalMember(i.member))return reply(i,'Ezt az ügyindító űrlapot csak BELV vezető vagy jogi osztálytag használhatja.');
 legalIntakeDrafts.set(intakeDraftKey(i),{updatedAt:Date.now()});
 return i.reply({content:'Válaszd ki az ügyfelet és a kijelölt ügyvédet. Ezután nyomd meg a **Tovább az űrlaphoz** gombot. A részleteket privát űrlapon kéred be.',components:intakeFormRows(),flags:MessageFlags.Ephemeral});
}
async function selectIntakeParty(i){
 if(i.guildId!==BELV_GUILD_ID||!isLegalMember(i.member))return reply(i,'Ezt az űrlapot csak BELV vezető vagy jogi osztálytag használhatja.');
 const key=intakeDraftKey(i),draft=legalIntakeDrafts.get(key);
 if(!draft||Date.now()-draft.updatedAt>10*60*1000){legalIntakeDrafts.delete(key);return reply(i,'Az űrlap lejárt. Kattints újra a **BELV jogi ügy indítása** gombra.');}
 const selected=i.values?.[0];if(!/^\d{16,22}$/.test(String(selected||'')))return reply(i,'Nem sikerült kiolvasni a kiválasztott Discord-tagot.');
 if(i.customId.endsWith('select-client'))draft.clientId=selected;else draft.lawyerId=selected;
 draft.updatedAt=Date.now();legalIntakeDrafts.set(key,draft);
 const status=['Ügyfél: '+(draft.clientId?'<@'+draft.clientId+'>':'nincs kiválasztva'),'Ügyvéd: '+(draft.lawyerId?'<@'+draft.lawyerId+'>':'nincs kiválasztva')].join(' • ');
 return i.update({content:status+'\nVálaszd ki mindkettőt, majd folytasd az űrlappal.',components:intakeFormRows()});
}
function buildCaseModal(clientId,lawyerId){
 return new ModalBuilder().setCustomId('belv_legal:open:'+clientId+':'+lawyerId).setTitle('BELV jogi ügy űrlap')
  .addComponents(
   caseModalInput('client_name','Ügyfél RP-neve',TextInputStyle.Short,100,'Az ügyfél RP-ben használt neve'),
   caseModalInput('summary_time','Rövid leírás és eset időpontja',TextInputStyle.Paragraph,700,'Mi történt, és mikor?'),
   caseModalInput('involved','Érintettek',TextInputStyle.Paragraph,500,'Az RP-esetben érintett személyek'),
   caseModalInput('evidence','Bizonyítékok vagy tanúk',TextInputStyle.Paragraph,700,'RP-bizonyítékok, tanúk vagy hivatkozások'),
   caseModalInput('requested_help','Kért segítség és egyeztetési időpont',TextInputStyle.Paragraph,650,'Milyen segítség kell, és mikor érhető el az ügyfél?')
  );
}
async function continueIntake(i){
 if(i.guildId!==BELV_GUILD_ID||!isLegalMember(i.member))return reply(i,'Ezt az űrlapot csak BELV vezető vagy jogi osztálytag használhatja.');
 const key=intakeDraftKey(i),draft=legalIntakeDrafts.get(key);
 if(!draft||Date.now()-draft.updatedAt>10*60*1000){legalIntakeDrafts.delete(key);return reply(i,'Az űrlap lejárt. Kattints újra a **BELV jogi ügy indítása** gombra.');}
 if(!draft.clientId||!draft.lawyerId)return reply(i,'Előbb válaszd ki az ügyfelet és a kijelölt ügyvédet.');
 const parties=await validateCaseParties(i,draft.clientId,draft.lawyerId);
 if(typeof parties==='string')return reply(i,parties);
 legalIntakeDrafts.delete(key);
 return i.showModal(buildCaseModal(draft.clientId,draft.lawyerId));
}
function caseModalInput(id,label,style,maxLength,placeholder){
 return new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(true).setMinLength(1).setMaxLength(maxLength).setPlaceholder(placeholder));
}
async function validateCaseParties(i,clientId,lawyerId){
 if(i.guildId!==BELV_GUILD_ID)return 'Ez a parancs kizárólag a BELV Discord-szerveren használható.';
 if(!await isInstalled(i.guildId))return 'A jogi osztály nincs telepítve. Előbb futtasd a /belv-jogi-setup parancsot.';
 if(!isLegalMember(i.member))return 'Ügyet csak az Ügyvédek ranggal lehet indítani.';
 const [client,lawyer]=await Promise.all([i.guild.members.fetch(clientId).catch(()=>null),i.guild.members.fetch(lawyerId).catch(()=>null)]);
 if(!client||!lawyer||client.user.bot||lawyer.user.bot)return 'Az ügyfélnek és a kijelölt ügyvédnek is valódi BELV-szervertagnak kell lennie.';
 const lawyerRole=role(i.guild,LAWYER_ROLE),lawyerOK=Boolean(lawyerRole&&lawyer.roles.cache.has(lawyerRole.id));
 if(!lawyerOK)return 'A kijelölt személynek az Ügyvédek ranggal kell rendelkeznie.';
 return {client,lawyer};
}
async function openCase(i){
 const clientUser=i.options.getUser('ugyfel'),lawyerUser=i.options.getUser('ugyved');
 const parties=await validateCaseParties(i,clientUser.id,lawyerUser.id);
 if(typeof parties==='string')return reply(i,parties);
 return i.showModal(buildCaseModal(clientUser.id,lawyerUser.id));
}
async function openCaseFromModal(i,clientId,lawyerId){
 const parties=await validateCaseParties(i,clientId,lawyerId);
 if(typeof parties==='string')return reply(i,parties);
 const {lawyer}=parties;
 await i.deferReply({flags:MessageFlags.Ephemeral});await schema();
 const parent=(await i.guild.channels.fetch()).find(c=>c?.type===ChannelType.GuildCategory&&c.name===CATS[1].name);
 if(!parent)return i.editReply('Jogi ügyintézési kategória nem található. Futtasd újra a telepítőt.');
 const seq=await dbQuery('INSERT INTO nexabot_belv_legal_sequence(guild_id,next_number) VALUES($1,2) ON CONFLICT(guild_id) DO UPDATE SET next_number=nexabot_belv_legal_sequence.next_number+1 RETURNING next_number-1 AS case_number',[i.guildId]);
 const n=Number(seq?.rows?.[0]?.case_number);
 if(!Number.isInteger(n)||n<1)return i.editReply('Nem sikerült ügyszámot kiosztani. Próbáld újra.');
 const perms=caseOverwrites(i.guild,clientId,lawyer.id,false);
 const clientName=i.fields.getTextInputValue('client_name').trim(),summaryTime=i.fields.getTextInputValue('summary_time').trim(),
  involved=i.fields.getTextInputValue('involved').trim(),evidence=i.fields.getTextInputValue('evidence').trim(),
  requestedHelp=i.fields.getTextInputValue('requested_help').trim();
 const num=String(n).padStart(3,'0'),channel=await i.guild.channels.create({name:'belv-ugy-'+num+'-'+safeName(clientName),type:ChannelType.GuildText,parent:parent.id,topic:'nexa-belv-legal|'+i.guildId+'|'+n+'|'+clientId+'|'+lawyer.id,permissionOverwrites:perms,reason:'Privát BELV RP jogi ügy'});
 try{
  await dbQuery('INSERT INTO nexabot_belv_legal_cases(guild_id,case_number,channel_id,client_id,lawyer_id,created_by,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[i.guildId,n,channel.id,clientId,lawyer.id,i.user.id,'open']);
  const text=['**Ügyszám:** BELV-JOGI-'+num,'**Ügyfél Discord-tag:** <@'+clientId+'>','**Kijelölt ügyvéd:** <@'+lawyer.id+'>','**Ügyfél RP-neve:** '+clientName,'**Rövid leírás és eset időpontja:** '+summaryTime,'**Érintettek:** '+involved,'**Bizonyítékok vagy tanúk:** '+evidence,'**Kért segítség és egyeztetési időpont:** '+requestedHelp].join('\n');
  await channel.send({embeds:[embed('BELV jogi ügy • '+num,text+'\n\nCsak szerveren belüli RP-ügyet kezeljetek; valós személyes adatot ne osszatok meg.')]});
  await audit('belv_legal_case_opened',i,{caseNumber:n,channelId:channel.id,clientId,lawyerId:lawyer.id});
  return i.editReply('Privát ügycsatorna létrejött: <#'+channel.id+'>');
 }catch(e){await recordError(e,{command:'belv-jogi-ugy',guildId:i.guildId,userId:i.user.id});return i.editReply('A csatornát megtartottam, de az ügy mentése hibázott: '+e.message.slice(0,600));}
}
async function closeCase(i){
 if(i.guildId!==BELV_GUILD_ID)return reply(i,'Ez a parancs kizárólag a BELV Discord-szerveren használható.');
 const c=i.channel;if(!c?.topic?.startsWith('nexa-belv-legal|'))return reply(i,'Ezt a parancsot az ügy privát csatornájában használd.');
 const p=c.topic.split('|'),lawyerId=p[4];
 if(i.user.id!==lawyerId&&!isLegalLead(i.member))return reply(i,'Csak a kijelölt ügyvéd vagy a jogi osztály vezetője zárhatja le.');
 if(c.topic.endsWith('|closed'))return reply(i,'Ez az ügy már le van zárva.');
 const modal=new ModalBuilder().setCustomId('belv_legal:close:'+c.id).setTitle('Ügy lezárása és archiválása')
  .addComponents(caseModalInput('closing_summary','Rövid záró összefoglaló',TextInputStyle.Paragraph,900,'RP-ügy lezárásának rövid összefoglalója'));
 return i.showModal(modal);
}
async function closeCaseFromModal(i,expectedChannelId){
 if(i.guildId!==BELV_GUILD_ID||i.channelId!==expectedChannelId)return reply(i,'A lezáró űrlap csak az eredeti BELV ügycsatornában használható.');
 const c=i.channel;if(!c?.topic?.startsWith('nexa-belv-legal|')||c.topic.endsWith('|closed'))return reply(i,'Az ügy nem található, vagy már lezárták.');
 const p=c.topic.split('|'),n=Number(p[2]),lawyerId=p[4];
 if(i.user.id!==lawyerId&&!isLegalLead(i.member))return reply(i,'Csak a kijelölt ügyvéd vagy a jogi osztály vezetője zárhatja le.');
 const summary=i.fields.getTextInputValue('closing_summary').trim();
 if(!summary)return reply(i,'A záró összefoglaló nem lehet üres.');
 await i.deferReply({flags:MessageFlags.Ephemeral});await schema();
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
 if(i.isButton?.()&&i.customId==='belv_legal:application')return startApplication(i);
 if(i.isButton?.()&&i.customId==='belv_legal:intake')return startIntake(i);
 if(i.isButton?.()&&i.customId==='belv_legal:intake-next')return continueIntake(i);
 if(i.isUserSelectMenu?.()&&String(i.customId||'').startsWith('belv_legal:select-'))return selectIntakeParty(i);
 if(i.isModalSubmit?.()&&String(i.customId||'').startsWith('belv_legal:')){
  const parts=i.customId.split(':');
  if(parts[1]==='application-submit'&&parts.length===2)return submitApplication(i);
  if(parts[1]==='open'&&parts.length===4&&/^\d{16,22}$/.test(parts[2])&&/^\d{16,22}$/.test(parts[3]))return openCaseFromModal(i,parts[2],parts[3]);
  if(parts[1]==='close'&&parts.length===3&&/^\d{16,22}$/.test(parts[2]))return closeCaseFromModal(i,parts[2]);
  return reply(i,'Érvénytelen vagy lejárt jogi űrlap.');
 }
 if(!i.isChatInputCommand?.())return false;
 if(i.commandName==='belv-jogi-setup')return setup(i);
 if(i.commandName==='belv-jogi-ugy')return openCase(i);
 if(i.commandName==='belv-jogi-lezaras')return closeCase(i);
 return false;
}
async function syncAttorneyAggregate(member){
 if(!member||member.guild?.id!==BELV_GUILD_ID)return;
 const groupRole=role(member.guild,LAWYER_ROLE);if(!groupRole)return;
 const shouldHave=member.roles.cache.some(r=>ATTORNEY_RANKS.includes(r.name)),has=member.roles.cache.has(groupRole.id);
 if(shouldHave===has)return;
 try{if(shouldHave)await member.roles.add(groupRole,'BELV jogi ügyvédcsoport automatikus hozzárendelése');else await member.roles.remove(groupRole,'BELV jogi ügyvédcsoport szinkronizálása');}
 catch(error){await recordError(error,{command:'belv_legal_attorney_role_sync',guildId:member.guild.id,userId:member.id}).catch(()=>null);}
}
module.exports={buildCommands:commands,syncGuildCommands,handleInteraction,BELV_GUILD_ID,CLASS_ROLES:ROLES,CATEGORIES:CATS,isLegalMember,syncAttorneyAggregate};
