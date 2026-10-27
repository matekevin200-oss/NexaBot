const FACTIONS=Object.freeze([
 {key:'belv',name:'Belv',title:'Belvédelmi Igazgatóság',guildId:'1517509643734221030',color:'#35d3c8',short:'BVI'},
 {key:'fbi',name:'FBI',title:'Federal Bureau of Investigation',guildId:'1520397344829603871',color:'#5e9cff',short:'FBI'},
 {key:'arfk',name:'ARFK',title:'ARFK • Rendőrség',guildId:'1479777567702777889',color:'#a38bfa',short:'ARFK'},
 {key:'tek',name:'TEK',title:'Terrorelhárítási Központ',guildId:'1526575205475156099',color:'#f07b88',short:'TEK'},
 {key:'cia',name:'CIA',title:'Central Intelligence Agency',guildId:'1557420697968578690',color:'#e7b96e',short:'CIA'}
]);
const findFaction=value=>FACTIONS.find(item=>item.guildId===String(value)||item.key===String(value));
function requireFaction(value){const faction=findFaction(value);if(!faction)throw Object.assign(new Error('Az MDT kizárólag az öt engedélyezett Belv, FBI, ARFK, TEK és CIA Discord-szerveren használható.'),{status:403});return faction;}
function normalized(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');}
const LEADER_NAMES=new Set(['vezetoseg','frakcioleader','frakcionalleader','frakciovezeto','frakciovezetohelyettes','leader','alleader','foigazgato','igazgato','parancsnok','tulajdonos']);
const CHANNEL_NAMES={default:['mdt-iratok','akták','iratok'],review:['mdt-ellenorzes','ügyiratok','határozatok'],person:['mdt-szemelyek','állományi-nyilvántartás','személynyilvántartás'],vehicle:['mdt-jarmuvek','járműnyilvántartás'],case:['mdt-ugyiratok','ügyiratok-dokumentumban','akták'],warrant:['mdt-korozesek','körözések'],shift:['mdt-szolgalati-naplo','szolgálati-napló','szolgálati-jelentés'],arrest:['mdt-eloallitasok','előállítások','letartóztatások'],fine:['mdt-birsagok','bírságok'],evidence:['mdt-bizonyitekok','bizonyítékok'],dispatch:['mdt-muveletek','központi-diszpécser','aktív-műveletek'],note:['mdt-feljegyzesek','feljegyzések'],identity:['mdt-szemelyik','személyik','személyi-igazolványok'],characters:['mdt-szemelyek','személynyilvántartás']};
module.exports={FACTIONS,findFaction,requireFaction,normalized,LEADER_NAMES,CHANNEL_NAMES};
