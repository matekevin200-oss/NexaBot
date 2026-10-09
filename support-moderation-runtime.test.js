const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
class Collection extends Map {
  find(fn) { return [...this.values()].find(fn); }
  some(fn) { return [...this.values()].some(fn); }
  filter(fn) { return new Collection([...this].filter(([,v]) => fn(v))); }
  map(fn) { return [...this.values()].map(fn); }
  reduce(fn, initial) { return [...this.values()].reduce(fn, initial); }
}
class Builder {
  constructor() {
    this.data = {};
    return new Proxy(this, { get: (target, key, receiver) => {
      if (key in target) return target[key];
      if (String(key).startsWith('set')) return (value) => { target.data[String(key).slice(3).replace(/[A-Z]/g,(c,i)=>(i?'_':'')+c.toLowerCase())] = value; return receiver; };
      if (String(key).startsWith('add') && String(key).endsWith('Option')) return (fn) => { (target.data.options ||= []).push(fn(new Builder()).data); return receiver; };
      if (key === 'addSubcommand') return (fn) => { (target.data.options ||= []).push(fn(new Builder()).data); return receiver; };
    } });
  }
  addFields(...v) { (this.data.fields ||= []).push(...v); return this; }
  addComponents(...v) { (this.data.components ||= []).push(...v); return this; }
  toJSON() { return this.data; }
  static from(v) { const b = new Builder(); b.data = {...(v.data || v)}; return b; }
}
const permissionNames = ['Administrator','SendMessages','AddReactions','CreatePublicThreads','CreatePrivateThreads','SendMessagesInThreads','Connect','ManageChannels','ViewChannel','ReadMessageHistory','ModerateMembers','KickMembers','BanMembers','ManageMessages','ManageNicknames','ManageRoles','ManageWebhooks','ManageGuild'];
const bits = Object.fromEntries(permissionNames.map((name,i) => [name,1n<<BigInt(i)]));
const AuditLogEvent = Object.fromEntries(['BotAdd','ChannelCreate','ChannelDelete','ChannelUpdate','RoleCreate','RoleDelete','RoleUpdate','WebhookCreate','WebhookDelete','WebhookUpdate','MemberBanAdd','MemberKick','GuildUpdate'].map((name,i)=>[name,i+1]));
const discord = { EmbedBuilder:Builder,ActionRowBuilder:Builder,ButtonBuilder:Builder,SlashCommandBuilder:Builder,PermissionFlagsBits:bits,AuditLogEvent,MessageFlags:{Ephemeral:64},Events:{MessageCreate:'message',GuildMemberAdd:'join',GuildAuditLogEntryCreate:'audit'},ButtonStyle:{Primary:1,Secondary:2,Success:3,Danger:4},ChannelType:{GuildText:0} };
function load(name,deps={},extras={}) {
  const marker=`"src/${name}.js": function(module, exports, require) {\n`,start=source.indexOf(marker),end=source.indexOf('\n},\n"',start);
  assert.ok(start>=0&&end>start,`factory ${name}`);const module={exports:{}};
  const names=Object.keys(extras);new Function('module','exports','require',...names,source.slice(start+marker.length,end))(module,module.exports,(name)=>name==='discord.js'?discord:name.startsWith('node:')?require(name):deps[name] || {},...names.map(x=>extras[x]));return module.exports;
}
const SUPPORT='1556219615858655254',OWNER='100000000000000002',OTHER='100000000000000099';
async function fixture() {
  const stored=new Map(),state={edits:[],rules:new Collection(),nativeFetchError:false,failedRules:new Set(),audits:[],errors:[],messages:[],deleted:0,kicked:0,banned:0,timedOut:0,dms:0,rolesRemoved:0,failedRestore:false,handlers:new Map(),snapshots:new Map(),onPermissionEdit:null,onDM:null};
  class Pool {
    on() {} async end() {}
    async query(sql,values=[]) {
      if(sql.startsWith('SELECT guild_id, config'))return {rows:[...stored].map(([guild_id,config])=>({guild_id,config:structuredClone(config)})),rowCount:stored.size};
      if(sql.startsWith('INSERT INTO nexabot_guild_configs'))stored.set(values[0],JSON.parse(values[1]));
      return {rows:[],rowCount:0};
    }
  }
  const constants=load('constants'),env={BOT_OWNER_ID:OWNER,DATABASE_URL:'postgres://fixture.invalid/nexa',DATABASE_SSL:'false'},silent={log:()=>{},warn:()=>{},error:()=>{}};
  const makeConfig=async()=>{const cfg=load('config',{'pg':{Pool},'./constants':constants},{process:{env},console:silent});assert.equal(await cfg.initConfigStore(),true);await cfg.grantGuildPlan(SUPPORT,'ultimate');return cfg;};
  let config=await makeConfig();
  const roles=new Collection(),members=new Collection(),channels=new Collection();
  const bot={id:'100000000000000090',permissions:{has:()=>true}};
  const guild={id:SUPPORT,name:'Support test',ownerId:OWNER,client:{user:{id:bot.id}},members:{me:bot,cache:members,fetch:async(id)=>members.get(typeof id==='string'?id:id.user)||null},roles:{cache:roles,everyone:{id:SUPPORT}},channels:{cache:channels,fetch:async(id)=>channels.get(id)||null},autoModerationRules:{fetch:async()=>{if(state.nativeFetchError)throw new Error('Missing ManageGuild');return state.rules;}}};
  function channel(id,name) {
    const overwrites=new Collection(),messages=new Collection();const ch={id,name,guild,isTextBased:()=>true,isThread:()=>false,
      permissionOverwrites:{cache:overwrites,edit:async(target,values)=>{
        if(state.failedRestore&&values.SendMessages!==false)throw new Error('restore permissions denied');
        if(state.onPermissionEdit)await state.onPermissionEdit(ch,values);
        const key=target.id||target,old=overwrites.get(key),allow=new Set(old?.allow.values||[]),deny=new Set(old?.deny.values||[]);
        for(const [name,value]of Object.entries(values)){allow.delete(bits[name]);deny.delete(bits[name]);if(value===true)allow.add(bits[name]);if(value===false)deny.add(bits[name]);}
        overwrites.set(key,{allow:{values:[...allow],has:x=>allow.has(x)},deny:{values:[...deny],has:x=>deny.has(x)}});state.edits.push({channel:id,values:{...values}});return ch;
      }},
      messages:{fetch:async(key)=>typeof key==='object'?messages:messages.get(key)||null},
      send:async(payload)=>{
        const message={id:String(1000+state.messages.length),author:{id:bot.id},payload,attachments:new Collection(),components:[],embeds:[],delete:async()=>{state.deleted++;},edit:async(next)=>{message.payload={...message.payload,...next};if(next.attachments?.length===0&&!next.files)delete message.payload.files;apply(message,message.payload);return message;}};
        apply(message,payload);messages.set(message.id,message);state.messages.push(message);return message;
      }};
    function apply(message,payload){message.embeds=(payload.embeds||[]).map(x=>x.data||x);message.components=(payload.components||[]).map(x=>({components:x.data.components.map(b=>({customId:b.data.custom_id}))}));if(payload.attachments?.length===0)message.attachments.clear();for(const file of payload.files||[]){const url=`https://discord.invalid/${message.id}/${file.name}`;state.snapshots.set(url,JSON.parse(file.attachment.toString()));message.attachments.set(file.name,{name:file.name,url});}}
    channels.set(id,ch);return ch;
  }
  const log=channel('100000000000000020','minden-log'),chat=channel('100000000000000021','general');guild.systemChannel=log;
  await chat.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:true,AddReactions:false},{});state.edits=[];
  function member(id,bot=false) {
    const user={id,tag:'test#0001',username:'test',bot,createdTimestamp:Date.now()-100*86400000,avatar:'avatar',send:async()=>{state.dms++;if(state.onDM)await state.onDM();}};
    const m={id,user,guild,client:guild.client,permissions:{has:()=>false},roles:{cache:new Collection(),highest:{position:1},remove:async()=>{state.rolesRemoved++;},add:async()=>{}},kickable:true,bannable:true,moderatable:true,
      send:user.send,kick:async()=>{state.kicked++;},ban:async()=>{state.banned++;},timeout:async(value)=>{if(value!==null)state.timedOut++;},toString:()=>`<@${id}>`};members.set(id,m);return m;
  }
  const target=member('100000000000000003'),actor=member(OWNER);actor.permissions.has=()=>true;
  function rule(id,enabled=true) {const item={id,enabled,content:'leave untouched',edits:[],edit:async(patch)=>{if(state.failedRules.has(id))throw new Error('rule denied');item.edits.push(patch);item.enabled=patch.enabled;return item;}};state.rules.set(id,item);return item;}
  const telemetry={recordAudit:async(...x)=>state.audits.push(x),recordError:async(...x)=>state.errors.push(x),recordUsage:async()=>{}};
  const utils={baseEmbed:(title,description,color)=>new Builder().setTitle(title).setDescription(description).setColor(color),byName:(collection,name)=>collection.find(x=>x.name===name),ephemeralError:(i,content)=>i.reply({content,flags:64}),sendLog:async()=>{},isStaff:()=>true,getText:()=> 'test reason'};
  let service,security,moderation,interactions;
  function wire() {
    const deps={'./config':config,'./constants':constants,'./utils':utils,'./telemetry':telemetry,'./i18n':{pick:(_id,hu)=>hu},'./rate-limit':{checkInteractionRate:()=>({allowed:true})},'./command-localizations':{canonicalCommandName:x=>x}};
    security=load('security',deps,{fetch:async(url)=>({ok:state.snapshots.has(url),json:async()=>structuredClone(state.snapshots.get(url))}),console:silent});deps['./security']=security;
    service=load('support-moderation',deps);deps['./support-moderation']=service;
    moderation=load('moderation',deps);deps['./moderation']=moderation;
    deps['./support-server']={setupSupportServer:async()=>{throw new Error('must not install');}};
    interactions=load('interactions',deps);
    security.registerSecurity({on:(event,fn)=>state.handlers.set(event,fn)});
  }
  const initial=config.defaultConfig(SUPPORT);initial.modules={...initial.modules,protection:true,moderation:true,welcome:true,tickets:true,verification:true};initial.protection={...initial.protection,raidDetection:true,lockdown:true,freshAccounts:true,invites:true,deleteMessages:true,warn:true,timeout:true,kick:true,ban:true,antiNuke:true};initial.channels.securityLogs=log.id;
  await config.setGuildConfig(SUPPORT,initial);wire();
  const interaction=(extra={})=>{const replies=[],i={guild,guildId:SUPPORT,user:actor.user,member:actor,replies,deferred:false,replied:false,reply:async(p)=>{i.replied=true;replies.push(p);},deferReply:async(p)=>{i.deferred=true;replies.push({defer:p});},editReply:async(p)=>replies.push(p),followUp:async(p)=>replies.push(p),isChatInputCommand:()=>false,isButton:()=>false,isModalSubmit:()=>false,isUserSelectMenu:()=>false,isRoleSelectMenu:()=>false,isStringSelectMenu:()=>false,...extra};return i;};
  const protectedMessage=(text='https://discord.gg/test')=>({guild,channel:chat,channelId:chat.id,author:target.user,member:target,content:text,mentions:{users:new Collection(),roles:new Collection(),everyone:false},attachments:new Collection(),embeds:[],components:[],delete:async()=>{state.deleted++;}});
  return {state,stored,guild,chat,log,target,actor,rule,member,interaction,protectedMessage,get config(){return config;},get service(){return service;},get security(){return security;},get moderation(){return moderation;},get interactions(){return interactions;},join:(m)=>state.handlers.get('join')(m),message:(m)=>state.handlers.get('message')(m),reload:async()=>{config=await makeConfig();wire();}};
}
test('only the primary owner in the official Support guild can change the switch',async()=>{
  const f=await fixture();await assert.rejects(f.service.setSupportModerationPaused(f.guild,f.target.id,true),e=>e.status===403);await assert.rejects(f.service.setSupportModerationPaused({...f.guild,id:OTHER},OWNER,true),e=>e.status===403);await assert.rejects(f.service.setSupportModerationPaused(f.guild,OWNER,'true'),e=>e.status===400);
  assert.equal(f.config.isSupportModerationPaused(SUPPORT),false);assert.equal(f.state.edits.length,0);
});
test('one pause preserves NEXA settings, disables only active native rules and leaves service modules available',async()=>{
  const f=await fixture(),active=f.rule('100000000000000041'),inactive=f.rule('100000000000000042',false),before=structuredClone(f.config.getGuildConfig(SUPPORT));
  const result=await f.service.setSupportModerationPaused(f.guild,OWNER,true);assert.equal(result.complete,true);assert.equal(active.enabled,false);assert.equal(inactive.enabled,false);assert.equal(inactive.edits.length,0);assert.equal(active.content,'leave untouched');assert.deepEqual(Object.keys(active.edits[0]).sort(),['enabled','reason']);
  const after=f.config.getGuildConfig(SUPPORT);assert.deepEqual(after.modules,before.modules);assert.deepEqual(after.protection,before.protection);assert.equal(f.config.moduleEnabled(SUPPORT,'protection'),false);assert.equal(f.config.moduleEnabled(SUPPORT,'moderation'),false);for(const module of ['welcome','tickets','verification'])assert.equal(f.config.moduleEnabled(SUPPORT,module),true);
  assert.deepEqual(after.supportModeration.nativeRules,[active.id]);assert.equal(f.state.audits.at(-1)[0],'support_moderation_paused');
});
test('Support pause cannot disable protections in a different server',async()=>{
  const f=await fixture(),other=f.config.defaultConfig(OTHER);other.modules.protection=true;other.modules.moderation=true;other.supportModeration={paused:true,nativeRules:['100000000000000042']};await f.config.setGuildConfig(OTHER,other);await f.config.grantGuildPlan(OTHER,'ultimate');await f.service.setSupportModerationPaused(f.guild,OWNER,true);
  assert.equal(f.config.isSupportModerationPaused(OTHER),false);assert.equal(f.config.moduleEnabled(OTHER,'protection'),true);assert.equal(f.config.moduleEnabled(OTHER,'moderation'),true);assert.deepEqual(f.config.getGuildConfig(OTHER).supportModeration.nativeRules,[]);
});
test('resume restores exactly the prior native rules after a process reload',async()=>{
  const f=await fixture(),active=f.rule('100000000000000041'),inactive=f.rule('100000000000000042',false);await f.service.setSupportModerationPaused(f.guild,OWNER,true);await f.reload();
  assert.equal(f.config.isSupportModerationPaused(SUPPORT),true);assert.deepEqual(f.config.getGuildConfig(SUPPORT).supportModeration.nativeRules,[active.id]);const result=await f.service.setSupportModerationPaused(f.guild,OWNER,false);
  assert.equal(result.complete,true);assert.equal(result.paused,false);assert.equal(active.enabled,true);assert.equal(inactive.enabled,false);assert.equal(f.config.moduleEnabled(SUPPORT,'protection'),true);assert.equal(f.config.moduleEnabled(SUPPORT,'moderation'),true);assert.deepEqual(f.config.getGuildConfig(SUPPORT).supportModeration.nativeRules,[]);
});
test('a failed native disable is reported as partial and can be retried without losing original state',async()=>{
  const f=await fixture(),rule=f.rule('100000000000000041');f.state.failedRules.add(rule.id);const first=await f.service.setSupportModerationPaused(f.guild,OWNER,true);assert.equal(first.paused,true);assert.equal(first.complete,false);assert.equal(rule.enabled,true);assert.equal(f.config.getGuildConfig(SUPPORT).supportModeration.incomplete,true);
  f.state.failedRules.clear();await f.reload();const retry=await f.service.setSupportModerationPaused(f.guild,OWNER,true);assert.equal(retry.complete,true);assert.equal(rule.enabled,false);assert.deepEqual(f.config.getGuildConfig(SUPPORT).supportModeration.nativeRules,[rule.id]);assert.equal(f.config.getGuildConfig(SUPPORT).supportModeration.incomplete,false);
});
test('native fetch failure leaves NEXA paused and never reports complete success',async()=>{
  const f=await fixture();f.state.nativeFetchError=true;const result=await f.service.setSupportModerationPaused(f.guild,OWNER,true);assert.equal(result.paused,true);assert.equal(result.complete,false);assert.match(result.warnings.join(' '),/AutoMod/);assert.equal(f.config.moduleEnabled(SUPPORT,'protection'),false);
});
test('failed native restoration retains the pause and its retry list',async()=>{
  const f=await fixture(),a=f.rule('100000000000000041'),b=f.rule('100000000000000042');await f.service.setSupportModerationPaused(f.guild,OWNER,true);f.state.failedRules.add(b.id);
  const result=await f.service.setSupportModerationPaused(f.guild,OWNER,false);assert.equal(result.complete,false);assert.equal(result.paused,true);assert.equal(a.enabled,true);assert.equal(b.enabled,false);assert.deepEqual(f.config.getGuildConfig(SUPPORT).supportModeration.nativeRules,[b.id]);
  f.state.failedRules.clear();assert.equal((await f.service.setSupportModerationPaused(f.guild,OWNER,false)).complete,true);assert.equal(b.enabled,true);assert.equal(f.config.isSupportModerationPaused(SUPPORT),false);
});
test('concurrent pause and resume requests finish in order with the original rule state',async()=>{
  const f=await fixture(),rule=f.rule('100000000000000041');const results=await Promise.all([f.service.setSupportModerationPaused(f.guild,OWNER,true),f.service.setSupportModerationPaused(f.guild,OWNER,true),f.service.setSupportModerationPaused(f.guild,OWNER,false)]);
  assert.deepEqual(results.map(x=>x.paused),[true,true,false]);assert.equal(rule.enabled,true);assert.equal(rule.edits.length,2);assert.deepEqual(f.config.getGuildConfig(SUPPORT).supportModeration.nativeRules,[]);
});
test('500 simultaneous human and bot joins during a pause cannot punish members or create a raid lock',async()=>{
  const f=await fixture();await f.service.setSupportModerationPaused(f.guild,OWNER,true);await Promise.all(Array.from({length:500},(_,i)=>f.join(f.member(String(100000000000000100n+BigInt(i)),i%4===0))));
  assert.equal(f.state.kicked,0);assert.equal(f.state.banned,0);assert.equal(f.state.timedOut,0);assert.equal(f.state.edits.length,0);assert.equal(f.state.messages.length,0);
  await f.service.setSupportModerationPaused(f.guild,OWNER,false);await f.join(f.member('100000000000000900'));assert.equal(f.state.edits.length,0);assert.equal(f.state.messages.length,0);
});
test('paused automoderation leaves spam, links, mentions and webhook messages untouched',async()=>{
  const f=await fixture();await f.service.setSupportModerationPaused(f.guild,OWNER,true);const before={...f.state};
  const texts=['https://discord.gg/test','FREE NITRO CLAIM GIFT https://bad.invalid','@everyone '+ 'A'.repeat(60),'spam '.repeat(200)];for(let i=0;i<40;i++)await f.message({...f.protectedMessage(texts[i%texts.length]),...(i%3===0?{webhookId:'100000000000000055',author:{...f.target.user,bot:true}}:{})});
  for(const key of ['deleted','kicked','banned','timedOut','dms'])assert.equal(f.state[key],before[key]);
});
test('pausing clears preexisting raid join windows rather than punishing the next new arrival',async()=>{
  const f=await fixture();for(let i=0;i<7;i++)await f.join(f.member(String(100000000000000100n+BigInt(i))));assert.equal(f.state.edits.length,0);
  await f.service.setSupportModerationPaused(f.guild,OWNER,true);await f.service.setSupportModerationPaused(f.guild,OWNER,false);await f.join(f.member('100000000000000108'));assert.equal(f.state.edits.length,0);assert.equal(f.state.messages.length,0);
  for(let i=0;i<7;i++)await f.join(f.member(String(100000000000000200n+BigInt(i))));assert.ok(f.state.edits.some(x=>x.values.SendMessages===false),'negative control: raid detection works again after enough new arrivals');
});
test('pausing clears strike history and stops an in-flight kick after its notification awaits',async()=>{
  const f=await fixture();await f.message(f.protectedMessage());await f.message(f.protectedMessage());assert.equal(f.state.timedOut,1);
  f.state.onDM=async()=>{f.state.onDM=null;await f.service.setSupportModerationPaused(f.guild,OWNER,true);};await f.message(f.protectedMessage());assert.equal(f.state.kicked,0);assert.equal(f.config.isSupportModerationPaused(SUPPORT),true);
  await f.service.setSupportModerationPaused(f.guild,OWNER,false);await f.message(f.protectedMessage());assert.equal(f.state.timedOut,1);assert.equal(f.state.kicked,0);
});
test('pause releases an active raid lock and restores tri-state channel permissions',async()=>{
  const f=await fixture();for(let i=0;i<8;i++)await f.join(f.member(String(100000000000000100n+BigInt(i))));assert.equal(f.chat.permissionOverwrites.cache.get(SUPPORT).deny.has(bits.SendMessages),true);
  const alert=f.state.messages.find(m=>m.components.length);assert.ok(alert);const result=await f.service.setSupportModerationPaused(f.guild,OWNER,true);assert.equal(result.complete,true);assert.equal(result.restored,1);
  const overwrite=f.chat.permissionOverwrites.cache.get(SUPPORT);assert.equal(overwrite.allow.has(bits.SendMessages),true);assert.equal(overwrite.deny.has(bits.AddReactions),true);assert.equal(overwrite.allow.has(bits.Connect),false);assert.equal(overwrite.deny.has(bits.Connect),false);assert.equal(alert.components.length,0);assert.equal(alert.attachments.size,0);
});
test('partial raid recovery remains recoverable after restart and paused old raid buttons cannot kick',async()=>{
  const f=await fixture();for(let i=0;i<8;i++)await f.join(f.member(String(100000000000000100n+BigInt(i))));const alert=f.state.messages.find(m=>m.components.length);f.state.failedRestore=true;
  const first=await f.service.setSupportModerationPaused(f.guild,OWNER,true);assert.equal(first.complete,false);assert.ok(alert.components.length);assert.ok(alert.attachments.size);
  const oldButton=f.interaction({customId:alert.components[0].components[0].customId});await f.security.handleRaidDecision(oldButton);assert.equal(oldButton.replies[0].flags,64);assert.equal(f.state.kicked,0);
  f.state.failedRestore=false;await f.reload();const second=await f.service.setSupportModerationPaused(f.guild,OWNER,true);assert.equal(second.complete,true);assert.equal(second.restored,1);assert.equal(alert.components.length,0);assert.equal(f.chat.permissionOverwrites.cache.get(SUPPORT).allow.has(bits.SendMessages),true);
});
test('pause waits for a channel lock already in flight and then undoes it',async()=>{
  const f=await fixture();for(let i=0;i<7;i++)await f.join(f.member(String(100000000000000100n+BigInt(i))));let release,entered;const gate=new Promise(r=>{release=r;}),started=new Promise(r=>{entered=r;});
  f.state.onPermissionEdit=async(_channel,values)=>{if(values.SendMessages===false){entered();await gate;}};
  const join=f.join(f.member('100000000000000109'));await started;const pause=f.service.setSupportModerationPaused(f.guild,OWNER,true);await new Promise(r=>setImmediate(r));assert.equal(f.config.isSupportModerationPaused(SUPPORT),true);release();await join;const result=await pause;assert.equal(result.complete,true);assert.equal(f.chat.permissionOverwrites.cache.get(SUPPORT).allow.has(bits.SendMessages),true);assert.equal(f.state.kicked,0);
});
test('paused slash moderation and stale modal or button actions cannot punish members',async()=>{
  const f=await fixture();await f.service.setSupportModerationPaused(f.guild,OWNER,true);
  for(const commandName of ['kick','ban','timeout','warn','clear','lock','nick']){const i=f.interaction({commandName});assert.equal(await f.moderation.handleModerationCommand(i),true);assert.equal(i.replies[0].flags,64);}
  for(const customId of ['mod_kick:100000000000000003','mod_ban_confirm:100000000000000003','moderation_submit:timeout_10:100000000000000003']){const i=f.interaction({customId,isButton:()=>true});await f.interactions.handleInteraction(i);assert.equal(i.replies[0].flags,64);assert.match(i.replies[0].content,/szünetel/);}
  assert.equal(f.state.kicked,0);assert.equal(f.state.banned,0);assert.equal(f.state.timedOut,0);assert.equal(f.state.deleted,0);
});
test('Support Discord controls are private, enforce the owner, and change the real persisted switch',async()=>{
  const f=await fixture(),outsider=f.interaction({user:f.target.user,customId:'support_moderation_pause'});await f.service.handleSupportModerationButton(outsider);assert.equal(outsider.replies[0].flags,64);assert.equal(f.config.isSupportModerationPaused(SUPPORT),false);
  const i=f.interaction({customId:'support_moderation_pause',isButton:()=>true});await f.interactions.handleInteraction(i);assert.equal(i.replies[0].defer.flags,64);assert.equal(f.config.isSupportModerationPaused(SUPPORT),true);assert.equal(i.replies.at(-1).components[0].data.components[0].data.custom_id,'support_moderation_resume');assert.equal(f.stored.get(SUPPORT).supportModeration.paused,true);
  const escape=x=>String(x).replace(/</g,'&lt;').replace(/"/g,'&quot;');const html=f.service.supportModerationControl({user:{id:OWNER},csrf:'<private>'},escape);assert.match(html,/action="\/owner\/support\/moderation"/);assert.match(html,/name="csrf" value="&lt;private>"/);assert.match(html,/name="paused" value="false"/);assert.equal(f.service.supportModerationControl({user:{id:f.target.id},csrf:'test'},escape),'');
});
test('the private Support moderation subcommand opens controls without running the installer',async()=>{
  const f=await fixture(),i=f.interaction({commandName:'support-szerver',options:{getSubcommand:()=> 'moderacio'},isChatInputCommand:()=>true});await f.interactions.handleInteraction(i);
  assert.equal(i.replies[0].flags,64);assert.equal(i.replies[0].components[0].data.components[0].data.custom_id,'support_moderation_pause');assert.equal(f.config.isSupportModerationPaused(SUPPORT),false);assert.equal(f.state.errors.length,0);
});
test('resume cannot reactivate punishment while an earlier raid recovery is still failing',async()=>{
  const f=await fixture(),rule=f.rule('100000000000000041');for(let i=0;i<8;i++)await f.join(f.member(String(100000000000000100n+BigInt(i))));f.state.failedRestore=true;await f.service.setSupportModerationPaused(f.guild,OWNER,true);
  const result=await f.service.setSupportModerationPaused(f.guild,OWNER,false);assert.equal(result.complete,false);assert.equal(result.paused,true);assert.equal(rule.enabled,false);assert.equal(f.config.moduleEnabled(SUPPORT,'moderation'),false);
  f.state.failedRestore=false;assert.equal((await f.service.setSupportModerationPaused(f.guild,OWNER,false)).complete,true);assert.equal(rule.enabled,true);
});
test('without a persistent store the bot pauses immediately but warns that restart safety is not guaranteed',async()=>{
  const f=await fixture();await f.config.closeConfigStore();const result=await f.service.setSupportModerationPaused(f.guild,OWNER,true);assert.equal(result.paused,true);assert.equal(result.complete,false);assert.match(result.warnings.join(' '),/adatbázis.*újraindítás/);await f.join(f.member('100000000000000100'));assert.equal(f.state.kicked,0);assert.equal(f.config.moduleEnabled(SUPPORT,'protection'),false);
});
