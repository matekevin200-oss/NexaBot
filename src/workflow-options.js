const BASE_TICKET_TYPES=Object.freeze(['support','application','report','purchase','partnership','other']);
const PRIORITIES=Object.freeze(['low','normal','high','urgent']);
function bounded(value,fallback,min,max) {
  const parsed=Number(value);
  return value!==''&&value!=null&&Number.isFinite(parsed)?Math.max(min,Math.min(max,Math.floor(parsed))):fallback;
}
function ticketOptions(input={}) {
  const customTypes=(Array.isArray(input.customTypes)?input.customTypes:[]).filter(item=>item&&/^[a-z][a-z0-9_-]{0,31}$/.test(item.key)&&!BASE_TICKET_TYPES.includes(item.key)&&item.key!=='order')
    .filter((item,index,array)=>array.findIndex(other=>other.key===item.key)===index).slice(0,10).map(item=>({key:item.key,label:String(item.label||item.key).trim().slice(0,60)}));
  const questions=(Array.isArray(input.questions)?input.questions:[]).filter(item=>item&&String(item.label||'').trim()).slice(0,2).map((item,index)=>({id:'extra_'+(index+1),label:String(item.label).trim().slice(0,1000),required:item.required===true,maxLength:1000,paragraph:true}));
  return {
    panelChannelIds:[...new Set((Array.isArray(input.panelChannelIds)?input.panelChannelIds:[]).map(String).filter(id=>/^\d{16,22}$/.test(id)))].slice(0,10),
    maxOpenPerUser:bounded(input.maxOpenPerUser,1,1,10),webMaxOpenPerUser:bounded(input.webMaxOpenPerUser,5,1,10),
    allowCreatorClose:input.allowCreatorClose!==false,allowCreatorReopen:input.allowCreatorReopen===true,
    requireCloseReason:input.requireCloseReason!==false,transcriptOnClose:input.transcriptOnClose!==false,ratingEnabled:input.ratingEnabled!==false,
    fallbackCategoryId:/^\d{16,22}$/.test(String(input.fallbackCategoryId||''))?String(input.fallbackCategoryId):null,
    agentRoleIds:[...new Set((Array.isArray(input.agentRoleIds)?input.agentRoleIds:[]).map(String).filter(id=>/^\d{16,22}$/.test(id)))].slice(0,10),
    quickReplies:(Array.isArray(input.quickReplies)?input.quickReplies:[{title:'Adatok kérése',content:'Kérlek, írd meg az érintett szerverazonosítót és a pontos hibaüzenetet.'},{title:'Megoldás ellenőrzése',content:'A javítást elkészítettük. Kérlek, ellenőrizd újra a működést.'},{title:'Várakoztatás',content:'Az ügyed vizsgálata folyamatban van; jelentkezünk az eredménnyel.'}]).filter(item=>item&&String(item.title||'').trim()&&String(item.content||'').trim()).slice(0,10).map(item=>({title:String(item.title).trim().slice(0,60),content:String(item.content).trim().slice(0,4000)})),
    categoryRoleIds:Object.fromEntries(Object.entries(input.categoryRoleIds||{}).filter(([key])=>/^[a-z][a-z0-9_-]{0,31}$/.test(key)).slice(0,20).map(([key,values])=>[key,[...new Set((Array.isArray(values)?values:[]).map(String).filter(id=>/^\d{16,22}$/.test(id)))].slice(0,10)])),
    categoryIds:Object.fromEntries(Object.entries(input.categoryIds||{}).filter(([key,value])=>/^[a-z][a-z0-9_-]{0,31}$/.test(key)&&/^\d{16,22}$/.test(String(value))).slice(0,20)),
    customTypes,questions,slaHours:Object.fromEntries(PRIORITIES.map(priority=>[priority,bounded(input.slaHours?.[priority],{urgent:1,high:4,normal:24,low:48}[priority],1,168)]))
  };
}
function isConnectionFailure(error) {
  const code=String(error?.code||'');
  return /^08/.test(code)||['57P01','57P02','57P03','53300','ECONNRESET','ECONNREFUSED','EPIPE','ETIMEDOUT','ENOTFOUND','EAI_AGAIN'].includes(code)
    ||(!/^[0-9A-Z]{5}$/.test(code)&&/connection|socket|network|terminat|closed|timeout|connect/i.test(String(error?.message||'')));
}
module.exports={BASE_TICKET_TYPES,PRIORITIES,bounded,ticketOptions,isConnectionFailure};

function priorityValue(value) {
  const key=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  return ({low:'low',alacsony:'low',normal:'normal',normalis:'normal',kozepes:'normal',high:'high',magas:'high',urgent:'urgent',surgos:'urgent'})[key]||null;
}
module.exports.priorityValue=priorityValue;
