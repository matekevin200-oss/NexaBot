const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
class Builder {
  constructor() { this.data = {}; }
  setColor(v) { this.data.color=v; return this; } setTitle(v) { this.data.title=v; return this; }
  setDescription(v) { this.data.description=v; return this; } addFields(...v) { this.data.fields=[...(this.data.fields||[]),...v]; return this; }
  setFooter(v) { this.data.footer=v; return this; } setTimestamp(v) { this.data.timestamp=v; return this; }
  setCustomId(v) { this.data.custom_id=v; return this; } setLabel(v) { this.data.label=v; return this; }
  setStyle(v) { this.data.style=v; return this; } addComponents(...v) { this.data.components=v; return this; }
  setName(v) { this.data.name=v; return this; } setDMPermission(v) { this.data.dm_permission=v; return this; }
  setDefaultMemberPermissions(v) { this.data.default_member_permissions=v; return this; }
  addSubcommand(fn) { const sub=fn(new Builder()); this.data.subcommands=[...(this.data.subcommands||[]),sub.data]; return this; }
  toJSON() { return this.data; }
}
const bits = { Administrator: 1n, ViewChannel: 2n, SendMessages: 4n, EmbedLinks: 8n, ReadMessageHistory: 16n, ManageChannels: 32n, UseApplicationCommands: 64n };
const discord = { EmbedBuilder: Builder, ActionRowBuilder: Builder, ButtonBuilder: Builder, SlashCommandBuilder: Builder, ButtonStyle: { Primary: 1, Success: 3, Danger: 4, Secondary: 2 }, ChannelType: { GuildText: 0, GuildCategory: 4 }, MessageFlags: { Ephemeral: 64 }, PermissionFlagsBits: bits };
function load(deps, name='belv-mdt') {
  const marker=`"src/${name}.js": function(module, exports, require) {\n`;
  const start=source.indexOf(marker); const end=source.indexOf('\n},\n"',start);
  assert.ok(start>=0&&end>start); const module={exports:{}};
  new Function('module','exports','require',source.slice(start+marker.length,end))(module,module.exports,(name)=>name==='discord.js'?discord:name.startsWith('node:')?require(name):deps[name]);
  return module.exports;
}
function fixture() {
  const gid='100000000000000001', user='100000000000000002', managerId='100000000000000003', access='100000000000000010', managerRole='100000000000000011', docRole='100000000000000012';
  const database={records:new Map(),codes:new Map(),sessions:new Map(),locks:new Map(),loaderLinks:new Map(),discordStates:new Map(),scopeGuildId:gid,ownerId:user,settings:{enabled:true,scopeGuildId:gid,members:[],discordChannelIds:{},robloxIds:['123456789'],accessRoleId:access,managerRoleId:managerRole,defaultChannelId:'100000000000000020',reviewChannelId:'100000000000000021',channelIds:{}},next:1,persistent:true};
  const state={failSend:false,memberFetches:0,sends:[],messageEdits:[],permissionChanges:[],failPermission:false,audits:[],errors:[],ownerSettings:{blacklistedUsers:[],blacklistedGuilds:[]},noView:new Set(),noWrite:false,noManage:false,creations:[],mutations:[],nextChannel:100,failCreateAt:0,failFetch:false};
  const members=new Map();
  const member=(id,roles=[])=>({id,displayName:'Officer '+id.slice(-2),user:{id,username:'Test'},roles:{cache:new Map(roles.map(x=>[x,{}]))},permissions:{has:()=>false}});
  members.set(user,member(user,[access,docRole])); members.set(managerId,member(managerId,[access,managerRole,docRole]));
  const channels=new Map();
  const bot={id:'100000000000000090',permissions:{has:()=>!state.noManage}};
  const guild={id:gid,name:'Belv test',members:{me:bot,fetch:async({user})=>{state.memberFetches++;return members.get(user)||null;}},channels:{cache:channels}};
  const touch=(...args)=>{state.mutations.push(args);throw new Error('Existing resource must not be modified');};
  function addChannel(id,name='existing-'+id,type=0,payload={}) {
    const messages=new Map(),overwrites=new Map(); const channel={id,guild,name,type,topic:'Original topic',parentId:null,position:7,...payload,isTextBased:()=>type===0,isThread:()=>false,
      edit:touch,delete:touch,setName:touch,setTopic:touch,setParent:touch,setPosition:touch,lockPermissions:touch,permissionOverwrites:{cache:overwrites,set:touch,delete:touch,edit:async(target,values,options)=>{if(state.failPermission)throw new Error('permission interrupted');state.permissionChanges.push({channel:id,target,values:{...values}});const old=overwrites.get(target),allow=new Set(old?.allow.values||[]),deny=new Set(old?.deny.values||[]);for(const [key,value]of Object.entries(values)){allow.delete(bits[key]);deny.delete(bits[key]);if(value===true)allow.add(bits[key]);else if(value===false)deny.add(bits[key]);}overwrites.set(target,{type:options.type,allow:{values:[...allow],has:(bit)=>allow.has(bit)},deny:{values:[...deny],has:(bit)=>deny.has(bit)}});return channel;}},
      permissionsFor:(holder)=>({has:(bit)=>holder===bot?!state.noWrite:!state.noView.has(`${holder.id}:${id}`)}),
      messages:{fetch:async(id)=>{if(!messages.has(id)){const e=new Error('Unknown Message');e.code=10008;throw e;}return messages.get(id);}},
      send:async(payload)=>{if(state.failSend)throw new Error('Missing Permissions'); const message={id:String(1000+state.sends.length),author:{id:bot.id},payload,get embeds(){return this.payload.embeds.map(e=>e.data||e);},edit:async(data)=>{state.messageEdits.push(message.id);message.payload=data;return message;}};messages.set(message.id,message);state.sends.push({channel:id,message});return message;}};
    channels.set(id,channel);return channel;
  }
  for(const id of [database.settings.defaultChannelId,database.settings.reviewChannelId,'100000000000000022']) addChannel(id);
  guild.channels.fetch=async()=>{if(state.failFetch)throw new Error('Fetch failed');return channels;};
  guild.channels.setPositions=touch;
  guild.channels.create=async(payload)=>{
    if(state.failCreateAt===state.creations.length+1)throw new Error('Create interrupted');
    const id=String(100000000000000000n+BigInt(state.nextChannel++));
    const channel=addChannel(id,payload.name,payload.type,{topic:payload.topic||null,parentId:payload.parent||null});state.creations.push({channel,payload});return channel;
  };
  guild.roles={cache:new Map([access,managerRole,docRole].map(id=>[id,{id,name:'Belv role '+id.slice(-2)}])),create:touch,setPositions:touch};
  async function dbQuery(sql, v) {
    if(!database.persistent)return null;
    const rows=(r)=>({rows:r,rowCount:r.length});
    if(sql.startsWith('SELECT guild_id FROM nexabot_mdt_scope'))return rows(database.scopeGuildId?[{guild_id:database.scopeGuildId}]:[]);
    if(sql.startsWith('INSERT INTO nexabot_mdt_scope')){database.scopeGuildId ||= v[0];return rows([]);}
    if(sql.startsWith('SELECT state FROM nexabot_mdt_discord')){const row=database.discordStates.get(v[0]);return rows(row?[{state:structuredClone(row)}]:[]);}
    if(sql.startsWith('INSERT INTO nexabot_mdt_discord')){database.discordStates.set(v[0],structuredClone(v[1]));return rows([]);}
    if(sql.startsWith('INSERT INTO nexabot_mdt_loader_links')){const existing=database.loaderLinks.get(v[0]);if(existing?.owner_id===v[1])return rows([]);const row={guild_id:v[0],owner_id:v[1],nonce:v[2]};database.loaderLinks.set(v[0],row);return rows([{...row}]);}
    if(sql.startsWith('SELECT * FROM nexabot_mdt_loader_links')){const row=database.loaderLinks.get(v[0]);return rows(row?[{...row}]:[]);}
    if(sql.startsWith('DELETE FROM nexabot_mdt_loader_links')){if(database.loaderLinks.get(v[0])?.owner_id===v[1])database.loaderLinks.delete(v[0]);return rows([]);}
    if(sql.startsWith('SELECT lease_token')){const lock=database.locks.get(v[0]);return rows(lock&&lock.expires_at>new Date()?[lock]:[]);}
    if(sql.startsWith('INSERT INTO nexabot_mdt_provision_locks')){const lock=database.locks.get(v[0]);if(lock&&lock.expires_at>new Date())return rows([]);database.locks.set(v[0],{lease_token:v[1],expires_at:new Date(Date.now()+300000)});return rows([{guild_id:v[0]}]);}
    if(sql.startsWith('UPDATE nexabot_mdt_provision_locks')){const lock=database.locks.get(v[0]);if(!lock||lock.lease_token!==v[1]||lock.expires_at<=new Date())return rows([]);lock.expires_at=new Date(Date.now()+300000);return rows([{guild_id:v[0]}]);}
    if(sql.startsWith('DELETE FROM nexabot_mdt_provision_locks')){if(database.locks.get(v[0])?.lease_token===v[1])database.locks.delete(v[0]);return rows([]);}
    if(sql.startsWith('SELECT config'))return rows([{config:database.settings}]);
    if(sql.startsWith('INSERT INTO nexabot_mdt_settings')){database.settings=v[1];return rows([]);}
    if(sql.startsWith('INSERT INTO nexabot_mdt_codes')){const row={code_hash:v[0],guild_id:v[1],user_id:v[2],expires_at:v[3]};database.codes.set(v[0],row);return rows([]);}
    if(sql.startsWith('DELETE FROM nexabot_mdt_codes WHERE code_hash')){const row=database.codes.get(v[0]);if(!row||row.expires_at<=new Date())return rows([]);database.codes.delete(v[0]);return rows([row]);}
    if(sql.startsWith('DELETE FROM nexabot_mdt_codes')){for(const [k,r]of database.codes)if(r.guild_id===v[0]&&r.user_id===v[1]||r.expires_at<new Date())database.codes.delete(k);return rows([]);}
    if(sql.startsWith('INSERT INTO nexabot_mdt_sessions')){database.sessions.set(v[0],{token_hash:v[0],guild_id:v[1],user_id:v[2],expires_at:v[3],roblox_user_id:v[4]});return rows([]);}
    if(sql.startsWith('SELECT * FROM nexabot_mdt_sessions')){const row=database.sessions.get(v[0]);return rows(row&&row.expires_at>new Date()?[row]:[]);}
    if(sql.startsWith('DELETE FROM nexabot_mdt_sessions WHERE token_hash')){database.sessions.delete(v[0]);return rows([]);}
    if(sql.startsWith('DELETE FROM nexabot_mdt_sessions')){for(const[k,r]of database.sessions)if(r.guild_id===v[0]&&r.user_id===v[1]||r.expires_at<new Date())database.sessions.delete(k);return rows([]);}
    if(sql.startsWith('INSERT INTO nexabot_mdt_records')) {
      if([...database.records.values()].some(r=>r.guild_id===v[0]&&r.created_by===v[6]&&r.client_key===v[7]))return rows([]);
      const r={id:String(database.next++),guild_id:v[0],template_key:v[1],title:v[2],fields:v[3],status:v[4],approval_required:v[5],created_by:v[6],updated_by:v[6],client_key:v[7],input_hash:v[8],revision:1,discord_state:'pending',created_at:new Date(),updated_at:new Date()};database.records.set(r.id,r);return rows([{...r}]);
    }
    if(sql.startsWith('SELECT * FROM nexabot_mdt_records WHERE guild_id=$1 AND created_by'))return rows([...database.records.values()].filter(r=>r.guild_id===v[0]&&r.created_by===v[1]&&r.client_key===v[2]).map(r=>({...r})));
    if(sql.startsWith('SELECT * FROM nexabot_mdt_records WHERE guild_id=$1 AND id=')){const r=database.records.get(String(v[1]));return rows(r&&r.guild_id===v[0]?[{...r}]:[]);}
    if(sql.startsWith('SELECT * FROM nexabot_mdt_records WHERE guild_id=$1 AND template_key')) {
      const personLookup=sql.includes("fields->>'robloxId'=$3");
      let result=[...database.records.values()].filter(r=>r.guild_id===v[0]&&v[1].includes(r.template_key));
      if(personLookup)result=result.filter(r=>r.fields.robloxId===v[2]||!r.fields.robloxId&&v[3]&&((r.template_key==='person'&&(r.fields.username||'').toLowerCase()===v[3].toLowerCase())||(r.template_key==='warrant'&&(r.fields.target||'').toLowerCase()===v[3].toLowerCase()))).filter(r=>!v[4]||BigInt(r.id)<BigInt(v[4]));
      else result=result.filter(r=>(!v[2]||(r.title+' '+JSON.stringify(r.fields)).toLowerCase().includes(v[2].toLowerCase()))&&(!v[3]||BigInt(r.id)<BigInt(v[3]))&&(!v[4]||r.status===v[4]));
      if(v[5])result=result.filter(r=>r.created_by===v[5]||r.status==='published'||r.status==='archived'&&(!r.approval_required||r.discord_message_id));
      return rows(result.sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,51).map(r=>({...r})));
    }
    if(sql.startsWith('UPDATE nexabot_mdt_records SET fields=')) {
      const r=database.records.get(String(v[7]));if(!r||r.guild_id!==v[6]||r.revision!==v[8])return rows([]);
      Object.assign(r,{fields:v[0],title:v[1],status:v[2],reviewed_by:v[3],review_reason:v[4],updated_by:v[5],revision:r.revision+1,updated_at:new Date(),discord_state:'pending'});return rows([{...r}]);
    }
    if(sql.startsWith("UPDATE nexabot_mdt_records SET discord_state='failed'")){const r=database.records.get(String(v[1]));if(r?.guild_id===v[0])r.discord_state='failed';return rows([]);}
    if(sql.startsWith('UPDATE nexabot_mdt_records SET review_channel_id')||sql.startsWith('UPDATE nexabot_mdt_records SET discord_channel_id')) {
      const r=database.records.get(String(v[3]));if(!r||r.guild_id!==v[2])return rows([]); const review=sql.includes('SET review_channel_id');
      Object.assign(r,review?{review_channel_id:v[0],review_message_id:v[1],discord_state:'synced'}:{discord_channel_id:v[0],discord_message_id:v[1],discord_state:'synced'});return rows([{...r}]);
    }
    throw new Error('Unhandled SQL: '+sql);
  }
  const dependencies={
    './config':{dashboardUrl:()=> 'https://test.example/dashboard',dbQuery,getOwnerSettings:()=>state.ownerSettings,isBotOwner:(id)=>id===database.ownerId,getBotOwnerId:()=>database.ownerId,isPersistentStore:()=>database.persistent},
    './documents':{allDocumentTypes:()=>[{key:'service_report',title:'Belv jelentés',approval:true,fields:[{id:'subject',label:'Tárgy',required:true,maxLength:100}]}],documentRule:()=>({accessRoleId:docRole}),findDocumentChannel:()=>channels.get('100000000000000022')},
    './telemetry':{recordAudit:async(...x)=>state.audits.push(x),recordError:async(...x)=>state.errors.push(x)}
  };
  const mdt=load(dependencies), ctx={guild,member:members.get(user),settings:database.settings}, managerCtx={...ctx,member:members.get(managerId)};
  dependencies['./belv-mdt']=mdt;
  const loader=load(dependencies,'mdt-loader');dependencies['./mdt-loader']=loader;
  const discordModule=load(dependencies,'mdt-discord');dependencies['./mdt-discord']=discordModule;
  dependencies['./mdt-client']=fs.readFileSync(path.join(__dirname,'../roblox/Belv-MDT-Emergency-Hamburg.lua'),'utf8');
  const owner=load(dependencies,'mdt-owner');
  const client={guilds:{cache:new Map([[gid,guild]])}};
  const draft=(key='note',clientKey='abcdefghijklmnop1234')=>({key,clientKey,fields:key==='note'?{title:'Teszt',content:'RP jelentés @everyone',reference:''}:key==='case'?{title:'Esemény',persons:'RP személy',location:'Hamburg',events:'RP esemény',evidence:''}:{subject:'Titkos jelentés'}});
  async function http(method,url,body,token) {
    if(url==='/auth'&&body)body={...body,robloxUserId:body.robloxUserId||'123456789',guildId:body.guildId||gid};
    const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={'content-type':'application/json',...(token?{authorization:'Bearer '+token,'x-mdt-roblox-id':'123456789'}:{})};req.socket={remoteAddress:'127.0.0.1'};
    const response={writeHead:(code,headers)=>{response.status=code;response.headers=headers;},end:(body)=>{response.body=JSON.parse(body);}};
    await mdt.handleMdtApi(client,req,response,new URL('https://test.example/api/mdt/v1'+url));return response;
  }
  async function loaderHttp(method,url,buildClient=owner.buildMdtClientScript,headers={}) {
    const request={method,headers,socket:{remoteAddress:'127.0.0.1'}};
    const response={writeHead:(code,headers)=>{response.status=code;response.headers=headers;},end:(body)=>{response.body=body;}};
    await loader.serveMdtLoader(client,request,response,new URL(url),'https://test.example/dashboard',buildClient);return response;
  }
  return{mdt,loader,owner,discordModule,state,database,ctx,managerCtx,members,user,managerId,guild,client,draft,http,loaderHttp,addChannel,addMember:(id,roles=[])=>{const m=member(id,roles);members.set(id,m);return m;},load:()=>load(dependencies),loadLoader:()=>load(dependencies,'mdt-loader')};
}
test('MDT uses hashed, single-use codes and hashed expiring sessions',async()=>{
  const f=fixture(),code=await f.mdt.issueCode(f.guild,f.ctx.member);assert.equal(code.length,24);assert.ok(!f.database.codes.has(code));
  const logged=await f.mdt.login(f.client,code,'123456789');assert.equal(logged.token.length,43);assert.ok(!f.database.sessions.has(logged.token));
  await assert.rejects(f.mdt.login(f.client,code,'123456789'),e=>e.status===401);
  const ctx=await f.load().authorize(f.client,'Bearer '+logged.token,'123456789');assert.equal(ctx.member.id,f.user);
  f.database.settings.robloxIds=[];await assert.rejects(f.mdt.authorize(f.client,'Bearer '+logged.token,'123456789'),e=>e.status===403);assert.ok(f.state.memberFetches>=3);
});
test('expired code and session cannot be used',async()=>{
  const f=fixture(),code=await f.mdt.issueCode(f.guild,f.ctx.member);for(const row of f.database.codes.values())row.expires_at=new Date(0);
  await assert.rejects(f.mdt.login(f.client,code,'123456789'),e=>e.status===401);
  const code2=await f.mdt.issueCode(f.guild,f.ctx.member),logged=await f.mdt.login(f.client,code2,'123456789');for(const row of f.database.sessions.values())row.expires_at=new Date(0);
  await assert.rejects(f.mdt.authorize(f.client,'Bearer '+logged.token,'123456789'),e=>e.status===401);
});
test('authorization fails closed when DB or guild settings unavailable',async()=>{
  const f=fixture();f.database.persistent=false;const response=await f.http('POST','/auth',{code:'x'.repeat(24)});assert.equal(response.status,503);
  f.database.persistent=true;f.database.settings.enabled=false;await assert.rejects(f.mdt.issueCode(f.guild,f.ctx.member),e=>e.status===403);
});
test('idempotent retry creates one DB entry and one Discord message',async()=>{
  const f=fixture();const a=await f.mdt.createRecord(f.ctx,f.draft());const b=await f.mdt.createRecord(f.ctx,f.draft());assert.equal(a.row.id,b.row.id);assert.equal(f.database.records.size,1);assert.equal(f.state.sends.length,1);
  assert.deepEqual(f.state.sends[0].message.payload.allowedMentions,{parse:[]});
  await assert.rejects(f.mdt.createRecord(f.ctx,{...f.draft(),fields:{title:'Más',content:'Más'}}),e=>e.status===409);
});
test('failed Discord send remains saved and explicit sync recovers without new DB entry',async()=>{
  const f=fixture();f.state.failSend=true;const result=await f.mdt.createRecord(f.ctx,f.draft());assert.equal(result.row.discord_state,'failed');assert.ok(result.warning);assert.equal(f.database.records.size,1);
  f.state.failSend=false;const fixed=await f.mdt.syncRecord(f.ctx,result.row.id);assert.equal(fixed.row.discord_state,'synced');assert.equal(f.state.sends.length,1);
});
test('pending case needs an explicit decision and only the primary owner can approve',async()=>{
  const f=fixture(),result=await f.mdt.createRecord(f.ctx,f.draft('case'));assert.equal(result.row.status,'pending');assert.equal(f.state.sends[0].channel,f.ctx.settings.reviewChannelId);
  await assert.rejects(f.mdt.mutateRecord(f.managerCtx,result.row.id,{revision:1,decision:'approve'},'review'),e=>e.status===403);
  const approved=await f.mdt.mutateRecord(f.ctx,result.row.id,{revision:1,decision:'approve'},'review');assert.equal(approved.row.status,'published');assert.equal(f.state.sends[1].channel,f.ctx.settings.defaultChannelId);
  await assert.rejects(f.mdt.mutateRecord(f.ctx,result.row.id,{revision:2,fields:f.draft('case').fields},'edit'),e=>e.status===409);
});
test('archive cannot publish an unapproved or rejected document to its final channel',async()=>{
  const f=fixture(),result=await f.mdt.createRecord(f.ctx,f.draft('case'));await f.mdt.mutateRecord(f.ctx,result.row.id,{revision:1},'archive');assert.equal(f.state.sends.length,1);assert.equal(f.state.sends[0].channel,f.ctx.settings.reviewChannelId);assert.equal(f.database.records.get(result.row.id).status,'archived');
});
test('a delegated owner cannot edit, and stale primary-owner updates are rejected',async()=>{
  const f=fixture(),result=await f.mdt.createRecord(f.ctx,f.draft());const stranger={...f.ctx,member:{...f.ctx.member,id:'100000000000000099'}};
  await assert.rejects(f.mdt.mutateRecord(stranger,result.row.id,{revision:1,fields:f.draft().fields},'edit'),e=>e.status===403);
  await assert.rejects(f.mdt.mutateRecord(f.managerCtx,result.row.id,{revision:1,fields:f.draft().fields},'edit'),e=>e.status===403);
  await f.mdt.mutateRecord(f.ctx,result.row.id,{revision:1,fields:{title:'Módosítva',content:'Új adat'}},'edit');
  await assert.rejects(f.mdt.mutateRecord(f.ctx,result.row.id,{revision:1,fields:f.draft().fields},'edit'),e=>e.status===409);
  assert.equal(f.state.sends.length,1);assert.equal(f.state.sends[0].message.payload.embeds[0].data.description,'**Módosítva**');
});
test('records are scoped to the exact Discord guild and template visibility',async()=>{
  const f=fixture(),result=await f.mdt.createRecord(f.ctx,f.draft());await assert.rejects(f.mdt.getRecord({...f.ctx,guild:{...f.guild,id:'100000000000000099'}},result.row.id),e=>e.status===404);
  f.state.noView.add(f.user+':'+f.ctx.settings.defaultChannelId);await assert.rejects(f.mdt.getRecord(f.ctx,result.row.id),e=>e.status===403);
});
test('primary owner sees existing Belv templates and approval workflow is retained',async()=>{
  const f=fixture();assert.ok(f.mdt.definitions(f.guild,f.ctx.member,f.ctx.settings).some(x=>x.key==='doc:service_report'));
  const result=await f.mdt.createRecord(f.ctx,f.draft('doc:service_report'));assert.equal(result.row.status,'pending');
  f.ctx.member.roles.cache.delete('100000000000000012');assert.equal((await f.mdt.getRecord(f.ctx,result.row.id)).id,result.row.id);
});
test('required and overlong fields cannot create a record',async()=>{
  const f=fixture();await assert.rejects(f.mdt.createRecord(f.ctx,{...f.draft(),fields:{title:'',content:'x'}}),e=>e.status===400);await assert.rejects(f.mdt.createRecord(f.ctx,{...f.draft(),fields:{title:'T',content:'x'.repeat(1001)}}),e=>e.status===400);assert.equal(f.database.records.size,0);
});
test('HTTP API returns auth, creation, search, revision conflict and logout results',async()=>{
  const f=fixture();const code=await f.mdt.issueCode(f.guild,f.ctx.member);const login=await f.http('POST','/auth',{code});assert.equal(login.status,200);const token=login.body.token;
  const boot=await f.http('GET','/bootstrap',undefined,token);assert.equal(boot.body.guild.id,f.guild.id);
  const created=await f.http('POST','/records',f.draft(),token);assert.equal(created.status,201);
  const list=await f.http('GET','/records?key=note&q=Teszt',undefined,token);assert.equal(list.body.records.length,1);assert.equal(list.headers['Cache-Control'],'no-store');
  const conflict=await f.http('PATCH','/records/'+created.body.record.id,{revision:9,fields:f.draft().fields},token);assert.equal(conflict.status,409);
  await f.http('POST','/logout',{},token);assert.equal((await f.http('GET','/records',undefined,token)).status,401);
});
test('HTTP parser preserves Hungarian UTF8 split across request chunks and rejects oversized bodies',async()=>{
  const f=fixture();const code=await f.mdt.issueCode(f.guild,f.ctx.member),logged=await f.mdt.login(f.client,code,'123456789');
  const body=Buffer.from(JSON.stringify({...f.draft(),fields:{title:'Ügyirat',content:'őrizet'}}));const split=body.indexOf(Buffer.from('Ü'))+1;
  const req=Readable.from([body.subarray(0,split),body.subarray(split)]);req.headers={'content-type':'application/json',authorization:'Bearer '+logged.token,'x-mdt-roblox-id':'123456789'};req.method='POST';req.socket={remoteAddress:'::1'};
  const res={writeHead:(s)=>res.status=s,end:(b)=>res.body=JSON.parse(b)};await f.mdt.handleMdtApi(f.client,req,res,new URL('https://test.example/api/mdt/v1/records'));assert.equal(res.body.record.title,'Ügyirat');
  const big=await f.http('POST','/records',{blob:'x'.repeat(33000)},logged.token);assert.equal(big.status,413);
});
test('only primary owner can request codes, including when another user is an admin',async()=>{
  const f=fixture();f.managerCtx.member.permissions.has=()=>true;
  await assert.rejects(f.mdt.issueCode(f.guild,f.managerCtx.member),e=>e.status===403);
  await assert.rejects(f.mdt.saveMdtOwnerConfig(f.guild,f.managerId,{enabled:true,robloxIds:['123456789'],defaultChannelId:f.ctx.settings.defaultChannelId}),e=>e.status===403);
  assert.equal(f.database.codes.size,0);
});
test('Owner Center requires Roblox IDs, stores exact IDs and validates target channels',async()=>{
  const f=fixture();await assert.rejects(f.mdt.saveMdtOwnerConfig(f.guild,f.user,{enabled:true,robloxIds:[],defaultChannelId:f.ctx.settings.defaultChannelId}),e=>e.status===400);
  await assert.rejects(f.mdt.saveMdtOwnerConfig(f.guild,f.user,{enabled:true,robloxIds:'abc',defaultChannelId:f.ctx.settings.defaultChannelId}),e=>e.status===400);
  await assert.rejects(f.mdt.saveMdtOwnerConfig(f.guild,f.user,{enabled:true,robloxIds:'123456789',defaultChannelId:'100000000000000099'}),e=>e.status===400);
  const saved=await f.mdt.saveMdtOwnerConfig(f.guild,f.user,{enabled:true,robloxIds:'123456789\n987654321\n123456789',defaultChannelId:f.ctx.settings.defaultChannelId});assert.deepEqual(saved.robloxIds,['123456789','987654321']);assert.ok(saved.enabled);
});
test('wrong Roblox account, changed account header and removed ID are denied',async()=>{
  const f=fixture(),code=await f.mdt.issueCode(f.guild,f.ctx.member);await assert.rejects(f.mdt.login(f.client,code,'888888888'),e=>e.status===403);
  const code2=await f.mdt.issueCode(f.guild,f.ctx.member),logged=await f.mdt.login(f.client,code2,'123456789');await assert.rejects(f.mdt.authorize(f.client,'Bearer '+logged.token,'987654321'),e=>e.status===403);
  f.database.settings.robloxIds=[];await assert.rejects(f.mdt.authorize(f.client,'Bearer '+logged.token,'123456789'),e=>e.status===403);
});
test('session cannot follow a changed primary owner and explicit revoke removes codes too',async()=>{
  const f=fixture(),code=await f.mdt.issueCode(f.guild,f.ctx.member),logged=await f.mdt.login(f.client,code,'123456789');const session=[...f.database.sessions.values()][0];session.user_id=f.managerId;
  await assert.rejects(f.mdt.authorize(f.client,'Bearer '+logged.token,'123456789'),e=>e.status===403);
  session.user_id=f.user;await f.mdt.issueCode(f.guild,f.ctx.member);await f.mdt.revokeMdtOwnerSessions(f.guild.id,f.user);assert.equal(f.database.sessions.size,0);assert.equal(f.database.codes.size,0);
});
test('Owner Center page and personalized client downloads reject delegated owners',async()=>{
  const f=fixture(),marker='"src/mdt-owner.js": function(module, exports, require) {\n',start=source.indexOf(marker),end=source.indexOf('\n},\n"',start);assert.ok(start>=0&&end>start);
  const raw=fs.readFileSync(path.join(__dirname,'../roblox/Belv-MDT-Emergency-Hamburg.lua'),'utf8');const module={exports:{}};
  const deps={'./config':{isBotOwner:(id)=>id===f.user,dashboardUrl:()=> 'https://test.example/dashboard'},'./belv-mdt':f.mdt,'./mdt-client':raw,'./mdt-loader':f.loader,'./mdt-discord':f.discordModule};
  new Function('module','exports','require',source.slice(start+marker.length,end))(module,module.exports,(name)=>deps[name]);
  await assert.rejects(module.exports.buildMdtClientScript(f.guild.id,f.managerId,'https://test.example'),e=>e.status===403);
  await assert.rejects(module.exports.mdtOwnerPage(f.client,{user:{id:f.managerId}},f.guild.id,{}),e=>e.status===403);
  const script=await module.exports.buildMdtClientScript(f.guild.id,f.user,'https://test.example/dashboard');assert.ok(script.includes('BaseUrl = "https://test.example"'));assert.ok(script.includes('AllowedRobloxIds = { "123456789" }'));assert.ok(script.includes('GuildId = "'+f.guild.id+'"'));
  assert.ok(source.includes("form.get('csrf') !== session.csrf"));
});
test('MDT installer creates only missing private rooms and never mutates existing resources',async()=>{
  const f=fixture();const original=[...f.guild.channels.cache.values()].map(c=>({id:c.id,name:c.name,topic:c.topic,parentId:c.parentId,position:c.position}));
  const result=await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);
  assert.equal(result.created.length,9);assert.equal(f.state.creations.length,9);assert.equal(result.settings.defaultChannelId,f.ctx.settings.defaultChannelId);assert.equal(result.settings.reviewChannelId,f.ctx.settings.reviewChannelId);
  assert.equal(f.state.mutations.length,0);assert.equal(f.state.sends.length,0);assert.equal(f.database.locks.size,0);
  for(const before of original){const c=f.guild.channels.cache.get(before.id);assert.deepEqual({id:c.id,name:c.name,topic:c.topic,parentId:c.parentId,position:c.position},before);}
  for(const {payload} of f.state.creations){assert.deepEqual(payload.permissionOverwrites[0],{id:f.guild.id,type:0,deny:[bits.ViewChannel]});assert.deepEqual(payload.permissionOverwrites.slice(1).map(x=>x.id),[f.user,f.guild.members.me.id]);}
  assert.deepEqual(Object.keys(result.settings.channelIds).sort(),f.mdt.TYPES.map(t=>t.key).sort());
  await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);assert.equal(f.state.creations.length,9);assert.equal(f.state.mutations.length,0);
});
test('first setup needs an Owner Center Roblox ID and provisions ten rooms plus a category',async()=>{
  const f=fixture();f.database.settings={enabled:false,channelIds:{}};
  await assert.rejects(f.mdt.provisionMdtOwnerChannels(f.guild,f.user),e=>e.status===400);assert.equal(f.state.creations.length,0);
  const result=await f.mdt.provisionMdtOwnerChannels(f.guild,f.user,{robloxIds:'123456789'});assert.equal(result.created.length,11);assert.equal(result.settings.enabled,true);assert.deepEqual(result.settings.robloxIds,['123456789']);
});
test('an existing matching room is reused without permission or parent edits',async()=>{
  const f=fixture(),existing=f.addChannel('100000000000000044','mdt-szemelyek');
  const result=await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);assert.equal(result.settings.channelIds.person,existing.id);assert.equal(result.created.length,8);assert.equal(existing.parentId,null);assert.equal(existing.topic,'Original topic');assert.equal(f.state.mutations.length,0);
});
test('interrupted channel creation can be resumed without duplicates',async()=>{
  const f=fixture();f.state.failCreateAt=4;
  await assert.rejects(f.mdt.provisionMdtOwnerChannels(f.guild,f.user),e=>e.status===503&&e.message.includes('3 új elem'));assert.equal(f.database.locks.size,0);assert.equal(f.state.creations.length,3);
  f.state.failCreateAt=0;await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);assert.equal(f.state.creations.length,9);
  const names=f.state.creations.map(x=>x.channel.name);assert.equal(new Set(names).size,names.length);assert.equal(f.state.mutations.length,0);
});
test('nonprimary owners, unavailable channels and missing manage permission cannot provision',async()=>{
  const f=fixture();await assert.rejects(f.mdt.provisionMdtOwnerChannels(f.guild,f.managerId),e=>e.status===403);
  f.state.noManage=true;await assert.rejects(f.mdt.provisionMdtOwnerChannels(f.guild,f.user),e=>e.status===403);assert.equal(f.state.creations.length,0);
  f.state.noManage=false;f.state.failFetch=true;await assert.rejects(f.mdt.provisionMdtOwnerChannels(f.guild,f.user),e=>e.status===503);assert.equal(f.state.creations.length,0);
  f.state.failFetch=false;f.state.noWrite=true;await assert.rejects(f.mdt.provisionMdtOwnerChannels(f.guild,f.user),e=>e.status===409);assert.equal(f.state.creations.length,0);assert.equal(f.state.mutations.length,0);
});
test('distributed lease rejects another bot process and releases only its own lock',async()=>{
  const f=fixture();f.database.locks.set(f.guild.id,{lease_token:'other-process',expires_at:new Date(Date.now()+300000)});
  await assert.rejects(f.load().provisionMdtOwnerChannels(f.guild,f.user),e=>e.status===409);assert.equal(f.database.locks.get(f.guild.id).lease_token,'other-process');assert.equal(f.state.creations.length,0);
  await assert.rejects(f.mdt.saveMdtOwnerConfig(f.guild,f.user,f.ctx.settings),e=>e.status===409);
  f.database.locks.get(f.guild.id).expires_at=new Date(0);await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);assert.equal(f.database.locks.size,0);
});
test('ambiguous existing room names stop setup before any creation or edit',async()=>{
  const f=fixture();f.addChannel('100000000000000044','mdt-szemelyek');f.addChannel('100000000000000045','mdt-szemelyek');
  await assert.rejects(f.mdt.provisionMdtOwnerChannels(f.guild,f.user),e=>e.status===409);assert.equal(f.state.creations.length,0);assert.equal(f.state.mutations.length,0);
});
test('concurrent setup requests cannot create duplicate rooms, and repeat setup needs no manage permission',async()=>{
  const f=fixture();const results=await Promise.allSettled([f.mdt.provisionMdtOwnerChannels(f.guild,f.user),f.load().provisionMdtOwnerChannels(f.guild,f.user)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);assert.equal(f.state.creations.length,9);
  f.state.noManage=true;const repeat=await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);assert.equal(repeat.created.length,0);assert.equal(f.state.mutations.length,0);
});
test('Owner Center install form saves IDs, creates missing rooms and exposes escaped personal script code',async()=>{
  const f=fixture(),marker='"src/mdt-owner.js": function(module, exports, require) {\n',start=source.indexOf(marker),end=source.indexOf('\n},\n"',start),module={exports:{}};
  const raw=fs.readFileSync(path.join(__dirname,'../roblox/Belv-MDT-Emergency-Hamburg.lua'),'utf8');const deps={'./config':{isBotOwner:(id)=>id===f.user,dashboardUrl:()=> 'https://test.example/dashboard'},'./belv-mdt':f.mdt,'./mdt-client':raw,'./mdt-loader':f.loader,'./mdt-discord':f.discordModule};
  new Function('module','exports','require',source.slice(start+marker.length,end))(module,module.exports,(name)=>deps[name]);
  const form=new URLSearchParams({operation:'provision',roblox_ids:'123456789',default_channel:'',review_channel:''});const saved=await module.exports.saveMdtOwnerForm(f.guild,f.user,form);assert.equal(saved.created.length,11);assert.equal(saved.settings.enabled,true);
  const helpers={layout:(title,body)=>body,escapeHtml:(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
  const page=await module.exports.mdtOwnerPage(f.client,{user:{id:f.user},csrf:'owner-csrf'},f.guild.id,helpers);assert.ok(page.includes('name="operation" value="provision"'));assert.ok(page.includes('/script'));assert.ok(page.includes('name="csrf" value="owner-csrf"'));
  const codePage=await module.exports.mdtClientCodePage(f.guild.id,f.user,'https://test.example',{user:{id:f.user}},helpers);assert.ok(codePage.includes('readonly'));assert.ok(codePage.includes('AllowedRobloxIds = { &quot;123456789&quot; }'));
  await assert.rejects(module.exports.mdtClientCodePage(f.guild.id,f.managerId,'https://test.example',{},helpers),e=>e.status===403);
});
test('people lookup links exact Roblox IDs, labels legacy name matches and excludes other IDs/guilds',async()=>{
  const f=fixture();
  const person=await f.mdt.createRecord(f.ctx,{key:'person',clientKey:'person-id-123456789',fields:{username:'RenamedPlayer',robloxId:'777777',name:'RP név',state:'RP'}});
  const legacy=await f.mdt.createRecord(f.ctx,{key:'person',clientKey:'person-legacy-12345',fields:{username:'TargetPlayer',name:'Régi név',state:'RP'}});
  await f.mdt.createRecord(f.ctx,{key:'person',clientKey:'different-id-123456',fields:{username:'TargetPlayer',robloxId:'888888',name:'Más ID',state:'RP'}});
  const other=await f.mdt.createRecord(f.ctx,{key:'case',clientKey:'other-guild-1234567',fields:{...f.draft('case').fields,robloxId:'777777'}});f.database.records.get(other.row.id).guild_id='100000000000000099';
  const logged=await f.mdt.login(f.client,await f.mdt.issueCode(f.guild,f.ctx.member),'123456789');
  const response=await f.http('GET','/people/lookup?robloxId=777777&username=TargetPlayer',undefined,logged.token);assert.equal(response.status,200);
  assert.deepEqual(response.body.records.map(r=>r.id),[legacy.row.id,person.row.id]);assert.equal(response.body.records[0].identityMatch,'legacyUsername');assert.equal(response.body.records[1].identityMatch,'robloxId');
  assert.equal((await f.http('GET','/people/lookup?robloxId=abc',undefined,logged.token)).status,400);
  assert.equal((await f.http('GET','/people/lookup?robloxId=777777',undefined)).status,401);
  f.state.noView.add(f.user+':'+f.ctx.settings.defaultChannelId);assert.equal((await f.http('GET','/people/lookup?robloxId=777777',undefined,logged.token)).body.records.length,0);
});
test('wanted records can be filtered to approved and unarchived entries',async()=>{
  const f=fixture(),fields={target:'TargetPlayer',robloxId:'777777',reason:'RP ügy',priority:'Normál',validity:'RP esemény végéig'};
  const pending=await f.mdt.createRecord(f.ctx,{key:'warrant',fields,clientKey:'warrant-pending-123'}),published=await f.mdt.createRecord(f.ctx,{key:'warrant',fields,clientKey:'warrant-publish-123'});
  await f.mdt.mutateRecord(f.ctx,published.row.id,{revision:1,decision:'approve'},'review');
  const logged=await f.mdt.login(f.client,await f.mdt.issueCode(f.guild,f.ctx.member),'123456789');
  const result=await f.http('GET','/records?key=warrant&status=published',undefined,logged.token);assert.deepEqual(result.body.records.map(r=>r.id),[published.row.id]);assert.equal(pending.row.status,'pending');
  await f.mdt.mutateRecord(f.ctx,published.row.id,{revision:2},'archive');assert.equal((await f.http('GET','/records?key=warrant&status=published',undefined,logged.token)).body.records.length,0);
  await assert.rejects(f.mdt.createRecord(f.ctx,{key:'warrant',fields:{...fields,robloxId:'bad'},clientKey:'invalid-roblox-1234'}),e=>e.status===400);
});
test('personal loader is stable across module restarts and never issues an MDT login',async()=>{
  const f=fixture(),first=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example/dashboard');
  assert.match(first.url,new RegExp(`^https://test\\.example/mdt/client/${f.guild.id}/[A-Za-z0-9_-]{43}\\.lua$`));
  assert.equal(first.code,`loadstring(game:HttpGet("${first.url}"))()`);assert.equal(first.code.split('\n').length,1);
  assert.deepEqual(await f.loadLoader().getMdtLoaderCommand(f.guild.id,f.user,'https://test.example'),first);
  assert.equal(f.database.loaderLinks.size,1);assert.match([...f.database.loaderLinks.values()][0].nonce,/^[a-f0-9]{64}$/);
  assert.equal(f.database.codes.size,0);assert.equal(f.database.sessions.size,0);
});
test('loader generation denies delegated owners, missing setup and non-HTTPS URLs',async()=>{
  const f=fixture();
  await assert.rejects(f.loader.getMdtLoaderCommand(f.guild.id,f.managerId,'https://test.example'),e=>e.status===403);
  await assert.rejects(f.loader.rotateMdtLoaderLink(f.guild.id,f.managerId),e=>e.status===403);
  await assert.rejects(f.loader.getMdtLoaderCommand('invalid',f.user,'https://test.example'),e=>e.status===400);
  await assert.rejects(f.loader.getMdtLoaderCommand(f.guild.id,f.user,'http://test.example'),e=>e.status===409);
  f.database.settings.enabled=false;await assert.rejects(f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example'),e=>e.status===403);
  f.database.settings.enabled=true;f.database.settings.robloxIds=[];await assert.rejects(f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example'),e=>e.status===409);
  assert.equal(f.database.loaderLinks.size,0);
});
test('private loader serves the actual personalized Lua without login codes or session tokens',async()=>{
  const f=fixture(),link=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');
  const code=await f.mdt.issueCode(f.guild,f.ctx.member),logged=await f.mdt.login(f.client,code,'123456789');
  const response=await f.loaderHttp('GET',link.url),expected=await f.owner.buildMdtClientScript(f.guild.id,f.user,'https://test.example');
  assert.equal(response.status,200);assert.equal(response.body,expected);assert.ok(response.body.includes('AllowedRobloxIds = { "123456789" }'));
  assert.equal(response.headers['Cache-Control'],'no-store, private');assert.equal(response.headers['X-Content-Type-Options'],'nosniff');assert.equal(response.headers['Content-Length'],Buffer.byteLength(expected));
  if(process.env.MDT_LOADER_FIXTURE_PATH)fs.writeFileSync(process.env.MDT_LOADER_FIXTURE_PATH,JSON.stringify({code:link.code,url:link.url,source:response.body}));
  for(const secret of [code,logged.token,[...f.database.loaderLinks.values()][0].nonce])assert.ok(!response.body.includes(secret));
  assert.equal((await f.http('GET','/records',undefined,new URL(link.url).pathname.split('/').pop().replace('.lua',''))).status,401);
  assert.equal((await f.http('GET','/records')).status,401);
});
test('tampered, missing and cross-guild loader signatures never run the script builder',async()=>{
  const f=fixture(),link=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');let builds=0;
  const builder=async()=>{builds++;return 'unexpected';};
  const signature=new URL(link.url).pathname.split('/').pop().replace('.lua',''),changed=(signature[0]==='A'?'B':'A')+signature.slice(1);
  for(const url of [link.url.replace(signature,changed),link.url.replace(f.guild.id,'100000000000000099'),'https://test.example/mdt/client/'+f.guild.id+'/short.lua','https://test.example/mdt/client/'+f.guild.id+'/'+signature+'.lua/extra'])assert.equal((await f.loaderHttp('GET',url,builder)).status,404);
  assert.equal(builds,0);assert.equal(f.state.memberFetches,0);
});
test('rotating a private loader invalidates its old URL and retains existing MDT sessions',async()=>{
  const f=fixture(),old=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');
  const logged=await f.mdt.login(f.client,await f.mdt.issueCode(f.guild,f.ctx.member),'123456789');
  await f.loader.rotateMdtLoaderLink(f.guild.id,f.user);assert.equal((await f.loaderHttp('GET',old.url)).status,404);
  const fresh=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');assert.notEqual(old.url,fresh.url);assert.equal((await f.loaderHttp('GET',fresh.url)).status,200);
  assert.equal((await f.http('GET','/bootstrap',undefined,logged.token)).status,200);assert.ok(f.state.audits.some(x=>x[0]==='mdt_loader_rotate'));
});
test('every loader download uses current Roblox IDs and refuses disabled or empty settings',async()=>{
  const f=fixture(),link=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');
  f.database.settings.robloxIds=['987654321'];const response=await f.loaderHttp('GET',link.url);assert.equal(response.status,200);assert.ok(response.body.includes('AllowedRobloxIds = { "987654321" }'));assert.ok(!response.body.includes('AllowedRobloxIds = { "123456789" }'));
  f.database.settings.robloxIds=[];assert.equal((await f.loaderHttp('GET',link.url)).status,410);
  f.database.settings.robloxIds=['987654321'];f.database.settings.enabled=false;assert.equal((await f.loaderHttp('GET',link.url)).status,410);
});
test('loader download rechecks Discord membership, blacklists and the primary-owner identity',async()=>{
  const f=fixture(),link=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');
  const member=f.members.get(f.user);f.members.delete(f.user);assert.equal((await f.loaderHttp('GET',link.url)).status,404);f.members.set(f.user,member);
  f.state.ownerSettings.blacklistedGuilds=[f.guild.id];assert.equal((await f.loaderHttp('GET',link.url)).status,404);
  await assert.rejects(f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example'),e=>e.status===403);
  f.state.ownerSettings.blacklistedGuilds=[];f.state.ownerSettings.blacklistedUsers=[f.user];assert.equal((await f.loaderHttp('GET',link.url)).status,404);f.state.ownerSettings.blacklistedUsers=[];
  f.database.ownerId=f.managerId;assert.equal((await f.loaderHttp('GET',link.url)).status,404);
  const fresh=await f.loader.getMdtLoaderCommand(f.guild.id,f.managerId,'https://test.example');assert.notEqual(fresh.url,link.url);assert.equal((await f.loaderHttp('GET',fresh.url)).status,200);assert.equal((await f.loaderHttp('GET',link.url)).status,404);
  assert.ok(f.state.memberFetches>=2);
});
test('private loader fails closed on unavailable persistence and hides unexpected error details',async()=>{
  const f=fixture(),link=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');
  f.database.persistent=false;assert.equal((await f.loaderHttp('GET',link.url)).status,503);await assert.rejects(f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example'),e=>e.status===503);
  f.database.persistent=true;const response=await f.loaderHttp('GET',link.url,async()=>{throw new Error('private-internal-detail');});assert.equal(response.status,503);assert.ok(!response.body.includes('private-internal-detail'));assert.equal(f.state.errors.length,1);
});
test('loader accepts GET and HEAD only and limits repeated downloads',async()=>{
  const f=fixture(),link=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');let builds=0;
  const builder=async()=>{builds++;return '-- Árvíztűrő';};
  assert.equal((await f.loaderHttp('POST',link.url,builder)).status,405);assert.equal(builds,0);
  const head=await f.loaderHttp('HEAD',link.url,builder);assert.equal(head.status,200);assert.equal(head.body,undefined);assert.equal(head.headers['Content-Length'],Buffer.byteLength('-- Árvíztűrő'));
  for(let i=0;i<29;i++)assert.equal((await f.loaderHttp('GET',link.url,builder)).status,200);
  assert.equal((await f.loaderHttp('GET',link.url,builder)).status,429);assert.equal(builds,30);
});
test('/mdt script returns an ephemeral one-line loader only to the primary owner',async()=>{
  const f=fixture(),replies=[],deferrals=[];
  const interaction={guild:f.guild,guildId:f.guild.id,user:{id:f.user},options:{getSubcommand:()=> 'script'},deferReply:async(x)=>deferrals.push(x),editReply:async(x)=>replies.push(x)};
  const command=f.mdt.buildMdtCommand();assert.ok(command.data.subcommands.some(sub=>sub.name==='script'));assert.equal(command.data.default_member_permissions,null);
  await f.mdt.handleMdtCommand(interaction);assert.deepEqual(deferrals,[{flags:64}]);const link=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');assert.ok(replies[0].includes(link.code));assert.ok(replies[0].includes('/mdt belepes'));assert.equal(f.database.codes.size,0);assert.equal(f.database.sessions.size,0);
  await f.mdt.handleMdtCommand({...interaction,user:{id:f.managerId}});assert.ok(replies[1].includes('Nincs MDT-hozzáférésed'));assert.ok(!replies[1].includes('loadstring('));assert.equal(f.database.loaderLinks.size,1);
});
test('Owner Center provides escaped one-line code, full source and a CSRF-protected rotation form',async()=>{
  const f=fixture(),session={user:{id:f.user},csrf:'owner-csrf'},helpers={layout:(_title,body)=>body,escapeHtml:(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
  const link=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');
  const page=await f.owner.mdtOwnerPage(f.client,session,f.guild.id,helpers),code=await f.owner.mdtClientCodePage(f.guild.id,f.user,'https://test.example',session,helpers);
  for(const html of [page,code]){assert.ok(html.includes(helpers.escapeHtml(link.code)));assert.ok(html.includes('/loader.lua'));assert.ok(html.includes('name="operation" value="rotate-loader"'));assert.ok(html.includes('name="csrf" value="owner-csrf"'));}
  assert.ok(code.includes('id="mdt-script-source"'));assert.ok(code.includes('AllowedRobloxIds = { &quot;123456789&quot; }'));
  await f.loader.rotateMdtLoaderLink(f.guild.id,f.user);f.database.settings.enabled=false;const disabled=await f.owner.mdtOwnerPage(f.client,session,f.guild.id,helpers);assert.ok(!disabled.includes('id="mdt-loader-code"'));assert.equal(f.database.loaderLinks.size,0);
});
test('a listed Roblox ID alone cannot log in, and a shared primary-owner code acts as that owner',async()=>{
  const f=fixture();f.database.settings.robloxIds.push('987654321');
  await assert.rejects(f.mdt.login(f.client,'A'.repeat(24),'987654321'),e=>e.status===401);
  await assert.rejects(f.mdt.issueCode(f.guild,f.managerCtx.member),e=>e.status===403);
  const code=await f.mdt.issueCode(f.guild,f.ctx.member),logged=await f.mdt.login(f.client,code,'987654321');
  const ctx=await f.mdt.authorize(f.client,'Bearer '+logged.token,'987654321');assert.equal(ctx.member.id,f.user);assert.equal(ctx.session.roblox_user_id,'987654321');
});
test('the owner registers a Discord-Roblox pair and that member gets their own code and identity',async()=>{
  const f=fixture();await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});
  const code=await f.mdt.issueCode(f.guild,f.members.get(f.managerId));
  const result=await f.mdt.login(f.client,code,'987654321',f.guild.id);assert.equal(result.officer.id,f.managerId);
  const ctx=await f.mdt.authorize(f.client,'Bearer '+result.token,'987654321');assert.equal(ctx.member.id,f.managerId);assert.equal(ctx.session.roblox_user_id,'987654321');
  const loader=await f.loader.getMdtLoaderCommand(f.guild.id,f.managerId,'https://test.example');assert.match(loader.code,/^loadstring\(game:HttpGet/);
  const res=await f.loaderHttp('GET',loader.url);assert.ok(res.body.includes('"123456789", "987654321"'));
  if(process.env.MDT_LOADER_FIXTURE_PATH)fs.writeFileSync(process.env.MDT_LOADER_FIXTURE_PATH,JSON.stringify({code:loader.code,url:loader.url,source:res.body}));
});
test('member codes cannot be used with the owner or a different registered Roblox account',async()=>{
  const f=fixture(),second='100000000000000004';f.addMember(second);
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});await f.mdt.updateMdtMember(f.guild,f.user,{discordId:second,robloxIds:'777777'});
  for(const id of ['123456789','777777'])await assert.rejects(f.mdt.login(f.client,await f.mdt.issueCode(f.guild,f.members.get(f.managerId)),id),e=>e.status===403);
  await assert.rejects(f.mdt.login(f.client,await f.mdt.issueCode(f.guild,f.ctx.member),'987654321'),e=>e.status===403);
});
test('member registration rejects other administrators, duplicate accounts, bots and absent members',async()=>{
  const f=fixture();await assert.rejects(f.mdt.updateMdtMember(f.guild,f.managerId,{discordId:f.managerId,robloxIds:'987654321'}),e=>e.status===403);
  await assert.rejects(f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'123456789'}),e=>e.status===400);
  await assert.rejects(f.mdt.updateMdtMember(f.guild,f.user,{discordId:'100000000000000099',robloxIds:'987654321'}),e=>e.status===400);
  f.members.get(f.managerId).user.bot=true;await assert.rejects(f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'}),e=>e.status===400);assert.equal(f.database.settings.members.length,0);
});
test('members can create and edit their own records while the owner retains review and other-record control',async()=>{
  const f=fixture();await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});
  const ctx={guild:f.guild,member:f.members.get(f.managerId),settings:await f.mdt.getSettings(f.guild.id)},record=await f.mdt.createRecord(ctx,f.draft());assert.equal(record.row.created_by,f.managerId);
  await f.mdt.mutateRecord(ctx,record.row.id,{revision:1,fields:{title:'Tag jelentése',content:'Saját módosítás'}},'edit');
  const other=await f.mdt.createRecord(f.ctx,{...f.draft(),clientKey:'owner-other-123456'});assert.equal(f.mdt.publicRecord(other.row,ctx).canEdit,false);
  await assert.rejects(f.mdt.mutateRecord(ctx,other.row.id,{revision:1},'archive'),e=>e.status===403);
  const pending=await f.mdt.createRecord(ctx,f.draft('case','member-pending-1234'));await assert.rejects(f.mdt.mutateRecord(ctx,pending.row.id,{revision:1,decision:'approve'},'review'),e=>e.status===403);
  await f.mdt.mutateRecord({...f.ctx,settings:ctx.settings},pending.row.id,{revision:1,decision:'approve'},'review');assert.equal(f.database.records.get(pending.row.id).status,'published');
});
test('member searches and direct record access hide other unapproved records before pagination',async()=>{
  const f=fixture();await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});
  const ctx={guild:f.guild,member:f.members.get(f.managerId),settings:await f.mdt.getSettings(f.guild.id)};
  const hidden=await f.mdt.createRecord(f.ctx,f.draft('case','owner-pending-1234')),own=await f.mdt.createRecord(ctx,f.draft('case','member-pending-1234'));
  const published=await f.mdt.createRecord(f.ctx,f.draft('case','owner-approved-1234'));await f.mdt.mutateRecord(f.ctx,published.row.id,{revision:1,decision:'approve'},'review');
  await assert.rejects(f.mdt.getRecord(ctx,hidden.row.id),e=>e.status===403);assert.equal((await f.mdt.getRecord(ctx,own.row.id)).id,own.row.id);
  const logged=await f.mdt.login(f.client,await f.mdt.issueCode(f.guild,ctx.member),'987654321');
  const req={method:'GET',headers:{authorization:'Bearer '+logged.token,'x-mdt-roblox-id':'987654321'},socket:{remoteAddress:'::1'}};
  const res={writeHead:(status)=>res.status=status,end:(text)=>res.body=JSON.parse(text)};
  await f.mdt.handleMdtApi(f.client,req,res,new URL('https://test.example/api/mdt/v1/records?key=case'));assert.equal(res.status,200);assert.deepEqual(res.body.records.map(r=>r.id),[published.row.id,own.row.id]);
});
test('removing a member revokes their codes and sessions and readding does not resurrect tokens',async()=>{
  const f=fixture();await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});
  const member=f.members.get(f.managerId),logged=await f.mdt.login(f.client,await f.mdt.issueCode(f.guild,member),'987654321');await f.mdt.issueCode(f.guild,member);
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId},true);assert.equal(f.database.codes.size,0);assert.equal(f.database.sessions.size,0);
  await assert.rejects(f.mdt.issueCode(f.guild,member),e=>e.status===403);await assert.rejects(f.mdt.authorize(f.client,'Bearer '+logged.token,'987654321'),e=>e.status===401);
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});await assert.rejects(f.mdt.authorize(f.client,'Bearer '+logged.token,'987654321'),e=>e.status===401);
});
test('only the bound Belv guild can configure MDT, issue codes or request loaders',async()=>{
  const f=fixture(),other={...f.guild,id:'100000000000000099'};f.client.guilds.cache.set(other.id,other);
  await assert.rejects(f.mdt.saveMdtOwnerConfig(other,f.user,f.database.settings),e=>e.status===403);await assert.rejects(f.mdt.provisionMdtOwnerChannels(other,f.user),e=>e.status===403);
  await assert.rejects(f.mdt.issueCode(other,f.ctx.member),e=>e.status===403);await assert.rejects(f.loader.getMdtLoaderCommand(other.id,f.user,'https://test.example'),e=>e.status===403);
  assert.equal(f.database.scopeGuildId,f.guild.id);assert.equal(f.database.loaderLinks.size,0);
  const loader=await f.loader.getMdtLoaderCommand(f.guild.id,f.user,'https://test.example');f.database.scopeGuildId=other.id;assert.equal((await f.loaderHttp('GET',loader.url)).status,403);
});
test('Belv staff gets a private status response but needs a registered ID pair for panel login',async()=>{
  const f=fixture();f.database.settings.staffRoleId='100000000000000011';const replies=[],deferrals=[];
  const base={guild:f.guild,guildId:f.guild.id,user:{id:f.managerId},deferReply:async(x)=>deferrals.push(x),editReply:async(x)=>replies.push(x)};
  await f.mdt.handleMdtButton({...base,customId:'mdt_hub:allapot'});assert.equal(deferrals.length,1);assert.equal(deferrals[0].flags,64);assert.ok(replies[0].includes('Discord-olvasó'));
  await f.mdt.handleMdtButton({...base,customId:'mdt_hub:belepes'});assert.ok(replies[1].includes('Nincs MDT-hozzáférésed'));assert.equal(f.database.codes.size,0);
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});await f.mdt.handleMdtButton({...base,customId:'mdt_hub:belepes'});assert.equal(f.database.codes.size,1);assert.ok(replies[2].includes('987654321'));
});
test('Discord hub grants staff and members view access without changing review-room or unrelated resources',async()=>{
  const f=fixture();await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});f.database.settings.staffRoleId='100000000000000011';
  const result=await f.discordModule.syncMdtDiscord(f.guild,f.user);assert.equal(result.readers,2);assert.equal(f.state.sends.length,2);assert.equal(f.state.mutations.length,0);
  for(const changed of f.state.permissionChanges){assert.notEqual(changed.channel,f.database.settings.reviewChannelId);const keys=['ReadMessageHistory','ViewChannel'];if(changed.channel===f.database.settings.discordChannelIds.hub&&[f.user,f.managerId].includes(changed.target))keys.push('UseApplicationCommands');assert.deepEqual(Object.keys(changed.values).sort(),keys.sort());}
  const hub=f.state.sends.find(s=>s.channel===f.database.settings.discordChannelIds.hub);assert.ok(hub.message.payload.components[0].data.components.some(b=>b.data.custom_id==='mdt_hub:belepes'));assert.deepEqual(hub.message.payload.allowedMentions,{parse:[]});
  const count=f.state.permissionChanges.length;await f.discordModule.syncMdtDiscord(f.guild,f.user);assert.equal(f.state.sends.length,2);assert.equal(f.state.messageEdits.length,2);assert.equal(f.state.permissionChanges.length,count);
  await assert.rejects(f.discordModule.syncMdtDiscord(f.guild,f.managerId),e=>e.status===403);
});
test('Discord member removal restores prior permissions and preserves unrelated SendMessages flags',async()=>{
  const f=fixture();await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);const channel=f.guild.channels.cache.get(f.database.settings.defaultChannelId);
  await channel.permissionOverwrites.edit(f.managerId,{ViewChannel:false,SendMessages:true},{type:1});
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});await f.discordModule.syncMdtDiscord(f.guild,f.user);
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId},true);await f.discordModule.syncMdtDiscord(f.guild,f.user);
  const overwrite=channel.permissionOverwrites.cache.get(f.managerId);assert.equal(overwrite.deny.has(bits.ViewChannel),true);assert.equal(overwrite.allow.has(bits.SendMessages),true);assert.equal(overwrite.allow.has(bits.ReadMessageHistory),false);assert.ok(f.database.discordStates.get(f.guild.id).overwrites.every(x=>x.targetId===f.user));
});
test('a partial Discord update persists permission snapshots and resumes without duplicates',async()=>{
  const f=fixture();await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});f.state.failPermission=true;
  await assert.rejects(f.discordModule.syncMdtDiscord(f.guild,f.user),e=>e.status===503);assert.equal(f.database.locks.size,0);assert.ok(f.database.discordStates.get(f.guild.id).overwrites.length);
  f.state.failPermission=false;await f.discordModule.syncMdtDiscord(f.guild,f.user);assert.equal(f.state.sends.length,2);await f.discordModule.syncMdtDiscord(f.guild,f.user);assert.equal(f.state.sends.length,2);
});
test('Owner Center pair forms add and revoke real member access while preserving the staff role',async()=>{
  const f=fixture();await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);f.database.settings.staffRoleId='100000000000000011';
  await f.owner.saveMdtOwnerForm(f.guild,f.user,new URLSearchParams({operation:'member-add',discord_id:f.managerId,member_roblox_ids:'987654321'}));assert.equal(f.database.settings.members[0].discordId,f.managerId);assert.equal(f.database.settings.staffRoleId,'100000000000000011');
  await f.owner.saveMdtOwnerForm(f.guild,f.user,new URLSearchParams({operation:'member-remove',discord_id:f.managerId}));assert.equal(f.database.settings.members.length,0);assert.equal(f.database.settings.staffRoleId,'100000000000000011');
  await assert.rejects(f.owner.saveMdtOwnerForm(f.guild,f.managerId,new URLSearchParams({operation:'member-add',discord_id:f.managerId,member_roblox_ids:'987654321'})),e=>e.status===403);
});
test('MDT guild-command synchronization updates Belv only and leaves other bot commands intact',async()=>{
  const f=fixture(),edited=[],deleted=[],created=[];
  const commands=new Map([['mdt',{name:'mdt',edit:async(p)=>edited.push(p),delete:async()=>deleted.push('mdt')}],['cia',{name:'cia',delete:async()=>deleted.push('cia')}] ]);
  const manager={fetch:async()=>commands,create:async(p)=>created.push(p)};
  await f.mdt.syncMdtGuildCommand({...f.guild,commands:manager});assert.equal(edited.length,1);assert.equal(edited[0].default_member_permissions,null);assert.equal(deleted.length,0);
  await f.mdt.syncMdtGuildCommand({...f.guild,id:'100000000000000099',commands:manager});assert.deepEqual(deleted,['mdt']);assert.equal(created.length,0);
});
test('MDT refresh overrides inherited application-command denial in the hub and revocation restores it',async()=>{
  const f=fixture();await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);
  const hub=f.guild.channels.cache.get(f.database.settings.discordChannelIds.hub);
  hub.permissionsFor=(member)=>({has:(bit)=>bit===bits.UseApplicationCommands?hub.permissionOverwrites.cache.get(member.id)?.allow.has(bit)===true:true});
  await hub.permissionOverwrites.edit(f.managerId,{UseApplicationCommands:false,SendMessages:false},{type:1});
  assert.equal(hub.permissionsFor(f.managerCtx.member).has(bits.UseApplicationCommands),false);
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});await f.discordModule.syncMdtDiscord(f.guild,f.user);
  assert.equal(hub.permissionsFor(f.managerCtx.member).has(bits.UseApplicationCommands),true);
  assert.equal(hub.permissionOverwrites.cache.get(f.managerId).deny.has(bits.SendMessages),true);
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId},true);await f.discordModule.syncMdtDiscord(f.guild,f.user);
  assert.equal(hub.permissionOverwrites.cache.get(f.managerId).deny.has(bits.UseApplicationCommands),true);
  assert.equal(hub.permissionOverwrites.cache.get(f.managerId).deny.has(bits.SendMessages),true);
});
test('moving the MDT hub removes its command grant while keeping the old room readable',async()=>{
  const f=fixture();await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});await f.discordModule.syncMdtDiscord(f.guild,f.user);
  const oldHub=f.database.settings.discordChannelIds.hub,newHub=f.database.settings.discordChannelIds.help;
  f.database.settings.channelIds.note=oldHub;f.database.settings.discordChannelIds.hub=newHub;
  await f.discordModule.syncMdtDiscord(f.guild,f.user);
  const overwrite=f.guild.channels.cache.get(oldHub).permissionOverwrites.cache.get(f.managerId);
  assert.equal(overwrite.allow.has(bits.UseApplicationCommands),false);assert.equal(overwrite.deny.has(bits.UseApplicationCommands),false);
  assert.equal(overwrite.allow.has(bits.ViewChannel),true);assert.equal(overwrite.allow.has(bits.ReadMessageHistory),true);
  assert.equal(f.guild.channels.cache.get(newHub).permissionOverwrites.cache.get(f.managerId).allow.has(bits.UseApplicationCommands),true);
});
test('MDT upgrades old permission snapshots and preserves a later manual denial on removal',async()=>{
  const f=fixture();await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});
  const hub=f.guild.channels.cache.get(f.database.settings.discordChannelIds.hub);
  f.database.discordStates.set(f.guild.id,{messages:{},overwrites:[{channelId:hub.id,targetId:f.managerId,type:1,before:{ViewChannel:null,ReadMessageHistory:null}}]});
  await hub.permissionOverwrites.edit(f.managerId,{ViewChannel:true,ReadMessageHistory:true,UseApplicationCommands:false},{type:1});
  await f.discordModule.syncMdtDiscord(f.guild,f.user);
  assert.equal(f.database.discordStates.get(f.guild.id).overwrites.find(x=>x.channelId===hub.id&&x.targetId===f.managerId).before.UseApplicationCommands,false);
  await hub.permissionOverwrites.edit(f.managerId,{UseApplicationCommands:false,SendMessages:true},{type:1});
  await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId},true);await f.discordModule.syncMdtDiscord(f.guild,f.user);
  assert.equal(hub.permissionOverwrites.cache.get(f.managerId).deny.has(bits.UseApplicationCommands),true);assert.equal(hub.permissionOverwrites.cache.get(f.managerId).allow.has(bits.SendMessages),true);
});
test('MDT command registration completes before a failing Discord channel refresh',async()=>{
  const f=fixture(),edits=[];f.guild.commands={fetch:async()=>new Map([['mdt',{name:'mdt',edit:async(x)=>edits.push(x)}]])};f.state.failFetch=true;
  await assert.rejects(f.discordModule.syncMdtDiscord(f.guild,f.user),e=>e.status===503);
  assert.equal(edits.length,1);assert.equal(edits[0].default_member_permissions,null);assert.equal(f.database.locks.size,0);
});
test('one failed guild registration does not skip later MDT registrations',async()=>{
  const f=fixture(),created=[];f.guild.commands={fetch:async()=>new Map(),create:async(x)=>created.push(x)};
  const other={id:'100000000000000099',commands:{fetch:async()=>{throw new Error('command fetch unavailable');}}};
  const result=await f.mdt.syncMdtGuildCommands({guilds:{cache:new Map([[other.id,other],[f.guild.id,f.guild]])}});
  assert.deepEqual(result.failed,[other.id]);assert.deepEqual(result.synced,[f.guild.id]);assert.equal(created[0].name,'mdt');
});
test('owner access diagnostics detect registration, hub and integration restrictions without issuing codes',async()=>{
  const f=fixture();await f.mdt.provisionMdtOwnerChannels(f.guild,f.user);await f.mdt.updateMdtMember(f.guild,f.user,{discordId:f.managerId,robloxIds:'987654321'});
  const command={id:'100000000000000088',name:'mdt',defaultMemberPermissions:{bitfield:0n}};
  f.guild.commands={fetch:async()=>new Map([[command.id,command]]),permissions:{fetch:async()=>new Map([[command.id,[{id:f.managerId,type:2,permission:false}]]])}};
  const hub=f.guild.channels.cache.get(f.database.settings.discordChannelIds.hub);hub.permissionsFor=()=>({has:(bit)=>bit!==bits.UseApplicationCommands});
  const report=await f.mdt.inspectMdtMemberAccess(f.guild,f.user,f.managerId),checks=Object.fromEntries(report.checks.map(x=>[x.key,x]));
  assert.equal(checks.code.ok,true);assert.equal(checks.command.ok,true);assert.equal(checks.defaults.ok,false);assert.equal(checks.application.ok,false);assert.equal(checks.integration.ok,null);assert.match(checks.integration.detail,/tiltás/);assert.equal(f.database.codes.size,0);
  await assert.rejects(f.mdt.inspectMdtMemberAccess(f.guild,f.managerId,f.managerId),e=>e.status===403);
  const escape=(x)=>String(x).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  const html=await f.owner.mdtOwnerPage(f.client,{user:{id:f.user},csrf:'<unsafe>'},f.guild.id,{layout:(_t,x)=>x,escapeHtml:escape,inspectMemberId:f.managerId});
  assert.ok(html.indexOf('name="discord_id"')<html.indexOf('name="roblox_ids"'));assert.match(html,/id="mdt-access-check"/);assert.match(html,/&lt;unsafe&gt;/);assert.equal(f.database.codes.size,0);
});
test('startup still synchronizes MDT after global command registration fails',async()=>{
  const marker='client.once(Events.ClientReady, async (readyClient) => {',start=source.indexOf(marker),end=source.indexOf('\n});',start);
  assert.ok(start>=0&&end>start);const calls=[],deps={readyClient:{guilds:{cache:{reduce:()=>0,size:1,get:()=>null}},user:{setPresence:()=>{},tag:'test'}},ActivityType:{Watching:3},setInterval:()=>({unref:()=>{}}),registerCommands:async()=>{throw new Error('Global commands unavailable');},recordError:async()=>calls.push('error'),syncMdtGuildCommands:async()=>calls.push('mdt'),console:{log:()=>{},error:()=>{}},SUPPORT_GUILD_ID:'1556219615858655254'};
  const names=Object.keys(deps);await new Function(...names,`return (async()=>{${source.slice(start+marker.length,end)}})();`)(...names.map(x=>deps[x]));
  assert.deepEqual(calls,['error','mdt']);
});
