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
}
const bits = { Administrator: 1n, ViewChannel: 2n, SendMessages: 4n, EmbedLinks: 8n, ReadMessageHistory: 16n };
const discord = { EmbedBuilder: Builder, ActionRowBuilder: Builder, ButtonBuilder: Builder, ButtonStyle: { Success: 3, Danger: 4, Secondary: 2 }, MessageFlags: { Ephemeral: 64 }, PermissionFlagsBits: bits };
function load(deps) {
  const marker='"src/belv-mdt.js": function(module, exports, require) {\n';
  const start=source.indexOf(marker); const end=source.indexOf('\n},\n"',start);
  assert.ok(start>=0&&end>start); const module={exports:{}};
  new Function('module','exports','require',source.slice(start+marker.length,end))(module,module.exports,(name)=>name==='discord.js'?discord:name.startsWith('node:')?require(name):deps[name]);
  return module.exports;
}
function fixture() {
  const gid='100000000000000001', user='100000000000000002', managerId='100000000000000003', access='100000000000000010', managerRole='100000000000000011', docRole='100000000000000012';
  const database={records:new Map(),codes:new Map(),sessions:new Map(),settings:{enabled:true,robloxIds:['123456789'],accessRoleId:access,managerRoleId:managerRole,defaultChannelId:'100000000000000020',reviewChannelId:'100000000000000021',channelIds:{}},next:1,persistent:true};
  const state={failSend:false,memberFetches:0,sends:[],audits:[],errors:[],noView:new Set(),noWrite:false};
  const members=new Map();
  const member=(id,roles=[])=>({id,displayName:'Officer '+id.slice(-2),user:{id,username:'Test'},roles:{cache:new Map(roles.map(x=>[x,{}]))},permissions:{has:()=>false}});
  members.set(user,member(user,[access,docRole])); members.set(managerId,member(managerId,[access,managerRole,docRole]));
  const channels=new Map();
  const bot={id:'100000000000000090'};
  const guild={id:gid,name:'Belv test',members:{me:bot,fetch:async({user})=>{state.memberFetches++;return members.get(user)||null;}},channels:{cache:channels}};
  for(const id of [database.settings.defaultChannelId,database.settings.reviewChannelId,'100000000000000022']) {
    const messages=new Map(); const channel={id,guild,isTextBased:()=>true,isThread:()=>false,
      permissionsFor:(holder)=>({has:(bit)=>holder===bot?!state.noWrite:!state.noView.has(`${holder.id}:${id}`)}),
      messages:{fetch:async(id)=>{if(!messages.has(id)){const e=new Error('Unknown Message');e.code=10008;throw e;}return messages.get(id);}},
      send:async(payload)=>{if(state.failSend)throw new Error('Missing Permissions'); const message={id:String(1000+state.sends.length),payload,edit:async(data)=>{message.payload=data;return message;}};messages.set(message.id,message);state.sends.push({channel:id,message});return message;}};
    channels.set(id,channel);
  }
  async function dbQuery(sql, v) {
    if(!database.persistent)return null;
    const rows=(r)=>({rows:r,rowCount:r.length});
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
      let result=[...database.records.values()].filter(r=>r.guild_id===v[0]&&v[1].includes(r.template_key)&&(!v[2]||(r.title+' '+JSON.stringify(r.fields)).toLowerCase().includes(v[2].toLowerCase()))&&(!v[3]||BigInt(r.id)<BigInt(v[3])));
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
    './config':{dashboardUrl:()=> 'https://test.example/dashboard',dbQuery,getOwnerSettings:()=>({blacklistedUsers:[],blacklistedGuilds:[]}),isBotOwner:(id)=>id===user,isPersistentStore:()=>database.persistent},
    './documents':{allDocumentTypes:()=>[{key:'service_report',title:'Belv jelentés',approval:true,fields:[{id:'subject',label:'Tárgy',required:true,maxLength:100}]}],documentRule:()=>({accessRoleId:docRole}),findDocumentChannel:()=>channels.get('100000000000000022')},
    './telemetry':{recordAudit:async(...x)=>state.audits.push(x),recordError:async(...x)=>state.errors.push(x)}
  };
  const mdt=load(dependencies), ctx={guild,member:members.get(user),settings:database.settings}, managerCtx={...ctx,member:members.get(managerId)};
  const client={guilds:{cache:new Map([[gid,guild]])}};
  const draft=(key='note',clientKey='abcdefghijklmnop1234')=>({key,clientKey,fields:key==='note'?{title:'Teszt',content:'RP jelentés @everyone',reference:''}:key==='case'?{title:'Esemény',persons:'RP személy',location:'Hamburg',events:'RP esemény',evidence:''}:{subject:'Titkos jelentés'}});
  async function http(method,url,body,token) {
    if(url==='/auth'&&body)body={...body,robloxUserId:body.robloxUserId||'123456789',guildId:body.guildId||gid};
    const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={'content-type':'application/json',...(token?{authorization:'Bearer '+token,'x-mdt-roblox-id':'123456789'}:{})};req.socket={remoteAddress:'127.0.0.1'};
    const response={writeHead:(code,headers)=>{response.status=code;response.headers=headers;},end:(body)=>{response.body=JSON.parse(body);}};
    await mdt.handleMdtApi(client,req,response,new URL('https://test.example/api/mdt/v1'+url));return response;
  }
  return{mdt,state,database,ctx,managerCtx,members,user,managerId,guild,client,draft,http,load:()=>load(dependencies)};
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
  assert.equal(f.state.sends.length,1);assert.equal(f.state.sends[0].message.payload.embeds[0].data.description,'Módosítva');
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
  const deps={'./config':{isBotOwner:(id)=>id===f.user},'./belv-mdt':f.mdt,'./mdt-client':raw};
  new Function('module','exports','require',source.slice(start+marker.length,end))(module,module.exports,(name)=>deps[name]);
  await assert.rejects(module.exports.buildMdtClientScript(f.guild.id,f.managerId,'https://test.example'),e=>e.status===403);
  await assert.rejects(module.exports.mdtOwnerPage(f.client,{user:{id:f.managerId}},f.guild.id,{}),e=>e.status===403);
  const script=await module.exports.buildMdtClientScript(f.guild.id,f.user,'https://test.example/dashboard');assert.ok(script.includes('BaseUrl = "https://test.example"'));assert.ok(script.includes('AllowedRobloxIds = { "123456789" }'));assert.ok(script.includes('GuildId = "'+f.guild.id+'"'));
  assert.ok(source.includes("form.get('csrf') !== session.csrf"));
});
