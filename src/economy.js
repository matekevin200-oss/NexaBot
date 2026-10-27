const crypto=require('node:crypto');
const {PermissionFlagsBits}=require('discord.js');
const {dbQuery,isBotOwner,moduleEnabled}=require('./config');
const DEFAULTS=Object.freeze({enabled:true,currency:'NEX',daily:250,streakBonus:25,workMin:100,workMax:300,workSeconds:3600,transferTax:0,maxBalance:1000000000});
const ADMIN=new Set(['settings','item','close-item','credit','debit']);
const ACTIONS=new Set([...ADMIN,'daily','work','deposit','withdraw','transfer','buy','use']);
function fail(message,field=''){const e=new Error(message);e.economy=true;e.field=field;throw e;}
function id(value){value=String(value||'');if(!/^[1-9]\d{15,21}$/.test(value))fail('Érvénytelen Discord-azonosító.');return value;}
function integer(value,min,max,label){if(!/^-?\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<min||Number(value)>max)fail(`${label}: ${min.toLocaleString('hu-HU')} és ${max.toLocaleString('hu-HU')} közötti egész szám kell.`,({Összeg:'amount',Ár:'price',Készlet:'stock','Munka pihenőideje':'workSeconds','Utalási díj százalékban':'transferTax','Egyenlegkorlát':'maxBalance'}[label]||label));return Number(value);}
async function query(sql,values=[]){const r=await dbQuery(sql,values);if(!r)fail('A pénzrendszerhez működő PostgreSQL-adatbázis szükséges. Pénzmozgás nem történt.');return r;}
async function member(guild,userId){id(guild?.id);id(userId);let m;try{m=await guild.members.fetch({user:userId,force:true});}catch{fail('A szervertagság most nem ellenőrizhető. Próbáld újra később.');}if(!m||m.user?.bot)fail('A pénzrendszert csak a szerver emberi tagjai használhatják.');return m;}
async function manager(guild,userId){const m=await member(guild,userId);if(guild.ownerId!==userId&&!isBotOwner(userId)&&!m.permissions?.has(PermissionFlagsBits.ManageGuild))fail('Ehhez Szerver kezelése jogosultság szükséges.');return m;}
function text(value,max,label,required=true){const s=String(value||'').trim();if(s.length>max||(required&&!s))fail(`${label}: ${required?'1':'0'}–${max} karakter kell.`,({Indok:'reason',Pénznem:'currency',Terméknév:'name',Termékleírás:'description'}[label]||label));return s;}
function settingsPatch(raw){
 const out={};for(const key of Object.keys(raw||{})){
  const v=raw[key];if(key==='enabled'){if(typeof v!=='boolean')fail('Érvénytelen kapcsoló.');out[key]=v;}
  else if(key==='currency'){out[key]=text(v,12,'Pénznem');if(/[\n\r<>@`]/.test(out[key]))fail('A pénznem nem tartalmazhat említést vagy formázást.');}
  else if(['daily','streakBonus','workMin','workMax'].includes(key))out[key]=integer(v,1,1000000,key);
  else if(key==='workSeconds')out[key]=integer(v,60,604800,'Munka pihenőideje');
  else if(key==='transferTax')out[key]=integer(v,0,25,'Utalási díj százalékban');
  else if(key==='maxBalance')out[key]=integer(v,1000,1000000000000,'Egyenlegkorlát');
  else fail('Ismeretlen gazdasági beállítás.');
 }if(!Object.keys(out).length)fail('Legalább egy beállítást adj meg.');return out;
}
async function settings(guildId){id(guildId);return{...DEFAULTS,...(await query('SELECT config FROM nexabot_economy_settings WHERE guild_id=$1',[guildId])).rows[0]?.config};}
async function apply(guild,userId,requestId,raw){
 await member(guild,userId);if(!/^[a-zA-Z0-9:_-]{1,100}$/.test(String(requestId||'')))fail('Hiányzó vagy érvénytelen kérésazonosító.');
 if(!ACTIONS.has(raw?.action))fail('Ismeretlen pénzügyi művelet.');
 if(ADMIN.has(raw.action))await manager(guild,userId);
 if(!moduleEnabled(guild.id,'economy')&&!ADMIN.has(raw.action))fail('The economy module is disabled / A gazdasági modul ki van kapcsolva.');
 const b={action:raw.action};
 if(['transfer','credit','debit'].includes(b.action)){b.target=id(raw.target);await member(guild,b.target);}
 if(['deposit','withdraw','transfer','credit','debit'].includes(b.action))b.amount=['deposit','withdraw'].includes(b.action)&&raw.amount==='all'?'all':integer(raw.amount,1,1000000000000,'Összeg');
 if(['credit','debit'].includes(b.action)){if(!['cash','bank'].includes(raw.pocket))fail('Pénztárcát vagy bankszámlát válassz.');b.pocket=raw.pocket;b.reason=text(raw.reason,300,'Indok');}
 if(b.action==='settings')b.config=settingsPatch(raw.config);
 if(b.action==='item'){b.name=text(raw.name,80,'Terméknév');b.description=text(raw.description,500,'Termékleírás',false);b.price=integer(raw.price,1,1000000000,'Ár');b.stock=integer(raw.stock??-1,-1,1000000,'Készlet');}
 if(['buy','use','close-item'].includes(b.action)){b.itemId=integer(raw.itemId,1,Number.MAX_SAFE_INTEGER,'Termékazonosító');if(b.action!=='close-item')b.quantity=integer(raw.quantity??1,1,100,'Mennyiség');if(raw.expectedPrice!==undefined)b.expectedPrice=integer(raw.expectedPrice,1,1000000000,'Ár');}
 const hash=crypto.createHash('sha256').update(JSON.stringify(b)).digest('hex');
 try{return(await query('SELECT nexabot_economy_apply($1,$2,$3,$4,$5::jsonb) AS result',[guild.id,userId,String(requestId),hash,b])).rows[0].result;}
 catch(e){if(e.message?.startsWith('ECO:'))fail(e.message.slice(4).trim());throw e;}
}
async function account(guild,userId){await member(guild,userId);const config=await settings(guild.id);const row=(await query('SELECT cash,bank,streak,daily_at,work_at FROM nexabot_economy_accounts WHERE guild_id=$1 AND user_id=$2',[guild.id,userId])).rows[0]||{cash:0,bank:0,streak:0};return{...row,cash:Number(row.cash),bank:Number(row.bank),config};}
async function top(guildId,page=1){id(guildId);page=integer(page,1,10000,'Oldal');const rows=(await query('SELECT user_id,cash,bank,(cash+bank) AS total FROM nexabot_economy_accounts WHERE guild_id=$1 AND cash+bank>0 ORDER BY total DESC,user_id ASC LIMIT 11 OFFSET $2',[guildId,(page-1)*10])).rows;return{rows:rows.slice(0,10),next:rows.length>10,page,config:await settings(guildId)};}
async function shop(guildId,page=1){id(guildId);page=integer(page,1,10000,'Oldal');const rows=(await query('SELECT * FROM nexabot_economy_items WHERE guild_id=$1 AND active=TRUE ORDER BY id ASC LIMIT 11 OFFSET $2',[guildId,(page-1)*10])).rows;return{rows:rows.slice(0,10),next:rows.length>10,page,config:await settings(guildId)};}
async function inventory(guildId,userId,page=1){id(guildId);id(userId);page=integer(page,1,10000,'Oldal');const rows=(await query('SELECT i.id,i.name,i.description,v.quantity FROM nexabot_economy_inventory v JOIN nexabot_economy_items i ON i.id=v.item_id AND i.guild_id=v.guild_id WHERE v.guild_id=$1 AND v.user_id=$2 AND v.quantity>0 ORDER BY i.id LIMIT 11 OFFSET $3',[guildId,userId,(page-1)*10])).rows;return{rows:rows.slice(0,10),next:rows.length>10,page};}
async function history(guild,userId,{all=false,page=1}={}){await member(guild,userId);if(all)await manager(guild,userId);page=integer(page,1,10000,'Oldal');const rows=(await query('SELECT id,actor_id,target_id,action,amount,details,created_at FROM nexabot_economy_ledger WHERE guild_id=$1 AND ($2::boolean OR actor_id=$3 OR target_id=$3) ORDER BY id DESC LIMIT 11 OFFSET $4',[guild.id,all,userId,(page-1)*10])).rows;return{rows:rows.slice(0,10),next:rows.length>10,page};}
module.exports={DEFAULTS,settings,apply,account,top,shop,inventory,history,manager,member,integer};
