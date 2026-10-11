const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const CROWN_TITLE = 'Crown City RP';
const CROWN_COLOR = 0xc9a55c;
const MANAGEMENT_KEYS = ['owner', 'coOwner', 'director', 'manager'];
const STAFF_KEYS = [...MANAGEMENT_KEYS, 'staffLead', 'headAdmin', 'admin', 'seniorMod', 'mod', 'trialMod', 'support'];
const BASIC_PERMISSIONS = ['ViewChannel', 'ReadMessageHistory', 'UseApplicationCommands'];
const MOD_PERMISSIONS = ['ManageMessages', 'ManageThreads', 'ModerateMembers', 'MoveMembers'];
const ADMIN_PERMISSIONS = [...MOD_PERMISSIONS, 'KickMembers', 'BanMembers', 'ViewAuditLog', 'ManageNicknames'];
const ROLE_GROUPS = {};
const CROWN_ROLES = [];
function role(key, name, group, color, permissions = [], hoist = true) {
  CROWN_ROLES.push({ key, name, group, color, permissions, hoist });
  (ROLE_GROUPS[group] ||= []).push(key);
}
role('owner', '👑 Crown City • Tulajdonos', 'management', 0xe8bf64, [...ADMIN_PERMISSIONS, 'ManageGuild', 'ManageChannels', 'ManageRoles']);
role('coOwner', '👑 Crown City • Társtulajdonos', 'management', 0xd9aa50, [...ADMIN_PERMISSIONS, 'ManageGuild']);
role('director', '🏛️ Projektvezető', 'management', 0xc69048, [...ADMIN_PERMISSIONS, 'ManageGuild']);
role('manager', '🧭 Management', 'management', 0xb88046, ADMIN_PERMISSIONS);
role('staffLead', '🛡️ Staff Manager', 'staff', 0xa8517a, ADMIN_PERMISSIONS);
role('headAdmin', '🛡️ Head Administrator', 'staff', 0x9b496e, ADMIN_PERMISSIONS);
role('admin', '🛡️ Administrator', 'staff', 0x914769, ADMIN_PERMISSIONS);
role('seniorMod', '🔰 Senior Moderator', 'staff', 0x8054ad, MOD_PERMISSIONS);
role('mod', '🔰 Moderator', 'staff', 0x7152a0, MOD_PERMISSIONS);
role('trialMod', '🔰 Trial Moderator', 'staff', 0x65528b, ['ManageMessages', 'ModerateMembers']);
role('support', '🎧 Support Team', 'staff', 0x53848f, []);
role('developer', '💻 Developer', 'special', 0x5c8fc2, []);
role('eventHost', '🎬 Session Host', 'special', 0xbf8a50, []);
role('media', '📷 Media Team', 'special', 0xa16ca0, []);
role('partner', '🤝 Partner', 'special', 0x638b85, [], false);
role('vip', '💎 VIP', 'special', 0x77aec5, [], false);
role('supporter', '✨ Támogató', 'special', 0xb878aa, [], false);
const pdRanks = [
  ['pdChief', 'Chief of Police'], ['pdDeputyChief', 'Deputy Chief'], ['pdCommander', 'Commander'],
  ['pdCaptain', 'Captain'], ['pdLieutenant', 'Lieutenant'], ['pdSergeant', 'Sergeant'],
  ['pdCorporal', 'Corporal'], ['pdSeniorOfficer', 'Senior Officer'], ['pdOfficer', 'Police Officer'], ['pdCadet', 'Cadet']
];
for (const [key, name] of pdRanks) role(key, `🚓 CCPD • ${name}`, 'pd', 0x447da7);
for (const [key, name] of [['pdDetective', 'Detective'], ['pdSwat', 'SWAT'], ['pdFto', 'FTO'], ['pdRecruiter', 'Recruiter']]) role(key, `🚓 CCPD • ${name}`, 'pd', 0x6896b4, [], false);
const sheriffRanks = [
  ['shSheriff', 'Sheriff'], ['shUndersheriff', 'Undersheriff'], ['shChiefDeputy', 'Chief Deputy'],
  ['shCaptain', 'Captain'], ['shLieutenant', 'Lieutenant'], ['shSergeant', 'Sergeant'],
  ['shCorporal', 'Corporal'], ['shSeniorDeputy', 'Senior Deputy'], ['shDeputy', 'Deputy Sheriff'], ['shCadet', 'Cadet']
];
for (const [key, name] of sheriffRanks) role(key, `🤠 CCSO • ${name}`, 'sheriff', 0xa79559);
for (const [key, name] of [['shFto', 'FTO'], ['shRecruiter', 'Recruiter']]) role(key, `🤠 CCSO • ${name}`, 'sheriff', 0xb6a770, [], false);
const fdRanks = [
  ['fdChief', 'Fire Chief'], ['fdDeputyChief', 'Deputy Chief'], ['fdCaptain', 'Captain'],
  ['fdLieutenant', 'Lieutenant'], ['fdEngineer', 'Engineer'], ['fdFirefighter', 'Firefighter'],
  ['fdParamedic', 'Paramedic'], ['fdEmt', 'EMT'], ['fdRecruit', 'Recruit']
];
for (const [key, name] of fdRanks) role(key, `🚒 CCFD / EMS • ${name}`, 'fd', 0xb96558);
for (const [key, name] of [['fdFto', 'FTO'], ['fdRecruiter', 'Recruiter']]) role(key, `🚒 CCFD / EMS • ${name}`, 'fd', 0xc98277, [], false);
for (const [key, name] of [['dotDirector', 'Director'], ['dotSupervisor', 'Supervisor'], ['dotSeniorTech', 'Senior Technician'], ['dotTech', 'Technician'], ['dotTrainee', 'Trainee'], ['dotRecruiter', 'Recruiter']]) role(key, `🚧 CCDOT • ${name}`, 'dot', 0xc59147, [], key !== 'dotRecruiter');
role('dispatcher', '📡 Diszpécser', 'dispatch', 0x628b92);
role('business', '🏢 Vállalkozó', 'civil', 0x6c937f, [], false);
role('lawyer', '⚖️ Ügyvéd', 'civil', 0x7c829c, [], false);
role('civil', '👤 Állampolgár', 'civil', 0x89959f, BASIC_PERMISSIONS, false);
role('newMember', '🆕 Új lakos', 'civil', 0x6f7884, [], false);
role('bot', '🤖 Automatizáció', 'civil', 0x526a80, [], false);
role('sessionPing', '🔔 Session értesítések', 'notification', 0xa89062, [], false);
role('eventPing', '🎉 Esemény értesítések', 'notification', 0xa89062, [], false);
role('newsPing', '📢 Hírek és fejlesztések', 'notification', 0xa89062, [], false);

const LEADS = {
  pd: ['pdChief', 'pdDeputyChief', 'pdCommander', 'pdRecruiter', 'pdFto'],
  sheriff: ['shSheriff', 'shUndersheriff', 'shChiefDeputy', 'shRecruiter', 'shFto'],
  fd: ['fdChief', 'fdDeputyChief', 'fdCaptain', 'fdRecruiter', 'fdFto'],
  dot: ['dotDirector', 'dotSupervisor', 'dotRecruiter']
};
function text(key, name, topic, options = {}) { return { key, name, topic, type: 'text', ...options }; }
function voice(key, name, userLimit = 0, options = {}) { return { key, name, type: 'voice', userLimit, ...options }; }
function category(key, label, access, channels) { return { key, name: `${label}  |  CROWN CITY`, access, channels }; }
const CROWN_CATEGORIES = [
  category('start', '01 • INFORMÁCIÓ', 'public', [
    text('welcome', '👑・üdvözlünk', 'Az első lépések és a közösség bemutatása.', { readonly: true }),
    text('rules', '📜・discord-szabályzat', 'Közösségi szabályok és ügykezelési alapelvek.', { readonly: true }),
    text('rpRules', '🎭・rp-szabályzat', 'Az ER:LC szerepjáték alapelvei és tiltott magatartások.', { readonly: true }),
    text('serverInfo', '🎮・szerver-információ', 'Crown City RP privátszerver és csatlakozás.', { readonly: true }),
    text('verification', '✅・hitelesítés', 'Szabályelfogadás és az Állampolgár rang felvétele.', { readonly: true }),
    text('ranks', '🏷️・rangok-és-hatáskörök', 'Rangrendszer, frakciók és kinevezések.', { readonly: true }),
    text('faq', '❓・gyakori-kérdések', 'Belépés, jelentkezés, segítségkérés és fellebbezés.', { readonly: true })
  ]),
  category('news', '02 • HÍREK ÉS SESSIONÖK', 'member', [
    text('announcements', '📢・közlemények', 'A vezetőség hivatalos bejelentései.', { readonly: true }),
    text('sessionFeed', '🟢・session-állapot', 'Sessionnyitások és lezárások.', { readonly: true }),
    text('sessionControl', '🎛️・session-központ', 'Session információk; a vezérlőgombokat a Staff és a Session Host használhatja.', { readonly: true }),
    text('events', '🎉・események', 'Szervezett szerepjáték-események és részvételi feltételek.', { readonly: true }),
    text('changelog', '🛠️・fejlesztési-napló', 'Crown City RP változások és szerverfrissítések.', { readonly: true }),
    text('notificationRoles', '🔔・értesítési-rangok', 'Önként felvehető session-, esemény- és hírrangok.', { readonly: true })
  ]),
  category('community', '03 • KÖZÖSSÉG', 'member', [
    text('general', '💬・közösségi-chat', 'Kulturált OOC beszélgetés.', { slowmode: 3 }),
    text('media', '📷・képek-és-videók', 'Saját ER:LC képek, videók és jelenetek.'),
    text('suggestions', '💡・ötletláda', 'A /otlet paranccsal szavazható javaslatokat küldhetsz.', { slowmode: 15 }),
    text('polls', '📊・szavazások', 'Közösségi döntések és visszajelzések.', { readonly: true }),
    text('botCommands', '🤖・bot-parancsok', 'A bot általános parancsainak használata.'),
    voice('loungeOne', 'Közösségi társalgó 01'), voice('loungeTwo', 'Közösségi társalgó 02'), voice('afk', 'Pihenő', 20)
  ]),
  category('civilian', '04 • CIVIL SZEREPJÁTÉK', 'member', [
    text('characters', '🪪・karakterlapok', 'Csak a kitalált RP-karakter adatait add meg; valós személyes adatot ne írj ide.', { slowmode: 10 }),
    text('icAds', '📰・ic-hirdetések', 'Kitalált, szerepen belüli hirdetések és szolgáltatások.'),
    text('businesses', '🏢・vállalkozások', 'Jóváhagyott RP-vállalkozások és üzleti jelenetek.'),
    text('civilJobs', '💼・civil-munkák', 'Civil munkalehetőségek és szerepjáték-feladatok.'),
    text('sceneIdeas', '🎬・rp-ötletek', 'Egyeztetett, szabályos szerepjáték-jelenetek.'),
    voice('civilMeeting', 'Civil egyeztetés', 12)
  ]),
  category('recruitment', '05 • TAGFELVÉTEL', 'member', [
    text('applicationGuide', '📋・jelentkezési-tudnivalók', 'Frakció- és Staff-jelentkezések menete.', { readonly: true }),
    text('staffApply', '🛡️・staff-jelentkezés', 'Jelentkezés a Crown City Staff csapatába.', { readonly: true }),
    text('pdApply', '🚓・ccpd-jelentkezés', 'Crown City Police Department jelentkezés.', { readonly: true }),
    text('shApply', '🤠・ccso-jelentkezés', 'Crown County Sheriff’s Office jelentkezés.', { readonly: true }),
    text('fdApply', '🚒・ccfd-ems-jelentkezés', 'Tűzoltó- és EMS-jelentkezés.', { readonly: true }),
    text('dotApply', '🚧・ccdot-jelentkezés', 'Department of Transportation jelentkezés.', { readonly: true })
  ]),
  category('support', '06 • ÜGYINTÉZÉS', 'public', [
    text('ticketPanel', '🎫・ügyintézési-központ', 'Privát segítségkérés, játékosbejelentés, fellebbezés és technikai ügy.', { readonly: true }),
    text('reportGuide', '🚨・bejelentési-útmutató', 'Bizonyíték, időpont és pontos eseményleírás megadása privát ticketben.', { readonly: true }),
    text('appeals', '⚖️・fellebbezési-útmutató', 'Moderációs döntések kulturált felülvizsgálata.', { readonly: true }),
    text('partners', '🤝・partnerség', 'Együttműködési feltételek és kapcsolatfelvétel.', { readonly: true }),
    text('supporters', '💎・támogatói-információ', 'Közösségi támogatás; nem biztosít Staff- vagy frakcióhatáskört.', { readonly: true })
  ]),
  category('staff', '07 • STAFF MŰVELETEK', 'staff', [
    text('staffAnnouncements', '🛡️・staff-közlemények', 'Belső Staff-utasítások és változások.', { readonly: true, writers: ['staffLead', 'headAdmin', 'admin'] }),
    text('staffChat', '💬・staff-chat', 'Belső koordináció és folyamatban lévő ügyek.'),
    text('staffCases', '📁・ügymegbeszélés', 'Bejelentések és szankciók indoklása; az IC és OOC ügyek elkülönítése.'),
    text('staffEvidence', '📎・bizonyítékok', 'Csak ügyhöz tartozó játékbeli bizonyíték; érzékeny adatot ne tárolj.'),
    text('staffTraining', '🎓・staff-képzés', 'Moderációs eljárásrend, kommunikáció és arányosság.', { readonly: true, writers: ['staffLead', 'headAdmin'] }),
    text('staffReview', '📝・staff-bírálat', 'Staff-jelentkezések privát elbírálása.', { access: 'management', readers: ['staffLead', 'headAdmin'] }),
    voice('staffVoice', 'Staff eligazítás', 16), voice('staffInterview', 'Staff interjú', 5)
  ]),
  category('management', '08 • VEZETŐSÉG', 'management', [
    text('managementChat', '🏛️・vezetőségi-chat', 'Projektvezetés és bizalmas döntések.'),
    text('managementTasks', '🗂️・vezetőségi-feladatok', 'Határidők, kinevezések és szervezeti feladatok.'),
    text('incidentPlans', '🧭・eseménytervezés', 'Nagyobb RP-események és szervezési feladatok.'),
    text('serverControl', '⚙️・szerver-kezelés', 'Crown City RP telepítő és karbantartási útmutató.', { readonly: true }),
    voice('managementVoice', 'Vezetőségi megbeszélés', 8)
  ]),
  category('pd', '09 • CCPD', 'pd', [
    text('pdHandbook', '📘・ccpd-kézikönyv', 'A rendőri RP szolgálati rendje.', { readonly: true }),
    text('pdAnnouncements', '📢・ccpd-közlemények', 'Parancsnoki közlemények.', { readonly: true }),
    text('pdRoster', '👥・ccpd-állomány', 'Állomány, rendfokozat, hívójel és szolgálati státusz.', { readonly: true }),
    text('pdChat', '💬・ccpd-belső', 'Belső koordináció.'),
    text('pdReports', '📝・ccpd-jelentések', 'Játékbeli intézkedések és szolgálati jelentések.'),
    text('pdTraining', '🎓・ccpd-képzések', 'FTO, járőr-, üldözési és rádióképzés.', { readonly: true }),
    text('pdReview', '📋・ccpd-bírálat', 'Privát rendőrségi felvételi bírálat.', { access: 'management', readers: LEADS.pd }),
    voice('pdRadioOne', 'CCPD • Rádió 01'), voice('pdRadioTwo', 'CCPD • Rádió 02'),
    voice('pdCommandVoice', 'CCPD • Parancsnoki', 8, { access: 'management', readers: LEADS.pd })
  ]),
  category('sheriff', '10 • CCSO', 'sheriff', [
    text('shHandbook', '📘・ccso-kézikönyv', 'Megyei járőrszolgálat és Sheriff RP.', { readonly: true }),
    text('shAnnouncements', '📢・ccso-közlemények', 'Sheriff vezetői közlemények.', { readonly: true }),
    text('shRoster', '👥・ccso-állomány', 'Állomány, hívójelek és szolgálati státusz.', { readonly: true }),
    text('shChat', '💬・ccso-belső', 'Belső koordináció.'),
    text('shReports', '📝・ccso-jelentések', 'Járőr-, körözési és együttműködési jelentések.'),
    text('shTraining', '🎓・ccso-képzések', 'FTO és megyei járőrképzés.', { readonly: true }),
    text('shReview', '📋・ccso-bírálat', 'Privát Sheriff-jelentkezések.', { access: 'management', readers: LEADS.sheriff }),
    voice('shRadio', 'CCSO • Rádió'), voice('shCommandVoice', 'CCSO • Parancsnoki', 8, { access: 'management', readers: LEADS.sheriff })
  ]),
  category('fd', '11 • CCFD / EMS', 'fd', [
    text('fdHandbook', '📘・ccfd-ems-kézikönyv', 'Tűzoltó- és mentőszolgálati RP-eljárások.', { readonly: true }),
    text('fdAnnouncements', '📢・ccfd-ems-közlemények', 'Szolgálati közlemények.', { readonly: true }),
    text('fdRoster', '👥・ccfd-ems-állomány', 'Tűzoltó- és EMS-állomány, képesítések és hívójelek.', { readonly: true }),
    text('fdChat', '💬・ccfd-ems-belső', 'Belső szolgálati koordináció.'),
    text('fdReports', '📝・esemény-jelentések', 'Tűz-, baleseti és műszaki mentési RP-jelentések.'),
    text('emsReports', '🚑・ems-jelentések', 'Kizárólag kitalált játékbeli ellátási jelentések; valódi egészségügyi adatot ne írj ide.'),
    text('fdTraining', '🎓・ccfd-ems-képzések', 'Tűzoltási, műszaki mentési és EMS RP-képzések.', { readonly: true }),
    text('fdReview', '📋・ccfd-ems-bírálat', 'Privát tűzoltó- és EMS-felvételi.', { access: 'management', readers: LEADS.fd }),
    voice('fdRadio', 'CCFD • Rádió'), voice('emsRadio', 'EMS • Rádió')
  ]),
  category('dot', '12 • CCDOT', 'dot', [
    text('dotHandbook', '📘・ccdot-kézikönyv', 'Közútkezelési és vontatási szerepjáték.', { readonly: true }),
    text('dotAnnouncements', '📢・ccdot-közlemények', 'DOT szolgálati közlemények.', { readonly: true }),
    text('dotRoster', '👥・ccdot-állomány', 'Állomány és szolgálati hívójelek.', { readonly: true }),
    text('dotChat', '💬・ccdot-belső', 'Vontatás, útjavítás és terelések koordinációja.'),
    text('dotReports', '📝・ccdot-munkalapok', 'Munkavégzési és vontatási jelentések.'),
    text('dotTraining', '🎓・ccdot-képzések', 'Munkaterület-biztosítás és szolgálati képzés.', { readonly: true }),
    text('dotReview', '📋・ccdot-bírálat', 'Privát DOT-jelentkezések.', { access: 'management', readers: LEADS.dot }),
    voice('dotRadio', 'CCDOT • Diszpécser')
  ]),
  category('dispatch', '13 • KÖZÖS IRÁNYÍTÁS', 'dispatch', [
    text('dispatchGuide', '📡・rádióprotokoll', 'Egységes hívójelek, rövid rádiózás és incidenskoordináció.', { readonly: true }),
    text('dispatchCalls', '📞・hívásnapló', 'Játékbeli bejelentések és egységkiosztások.'),
    text('unitStatus', '🟩・egység-státusz', 'Szabad, kiérkező, helyszíni és szolgálaton kívüli egységek.'),
    voice('jointRadio', 'Közös műveleti rádió'), voice('dispatchVoice', 'Központi diszpécser')
  ]),
  category('system', '14 • NAPLÓK ÉS ARCHÍVUM', 'management', [
    text('moderationLogs', '🛡️・moderációs-napló', 'Discord moderációs és Staff-műveletek.', { readers: ['staffLead', 'headAdmin', 'admin', 'seniorMod', 'mod'] }),
    text('securityLogs', '🔐・biztonsági-napló', 'A beállított szervervédelmi modul jelzései.'),
    text('memberLogs', '📥・tag-napló', 'Csatlakozás, távozás és változások.'),
    text('rpArchive', '🗃️・rp-archívum', 'Lezárt RP-események és vezetőség által megőrzött anyagok.'),
    text('applicationArchive', '📚・jelentkezési-archívum', 'Lezárt tagfelvételi ügyek privát eredményei.')
  ]),
  category('tickets', '15 • PRIVÁT ÜGYEK', 'staff', [])
];

const CROWN_APPLICATIONS = [
  { key: 'tgf_crown_staff', title: 'Crown City • Staff felvétel', emoji: '🛡️', open: 'staffApply', review: 'staffReview', reviewer: 'staffLead', accepted: 'trialMod', department: 'Staff', extra: [
    'Hogyan kezelnél egy vitás játékosbejelentést?', 'Mi a különbség az IC szabálysértés és az OOC moderáció között?', 'Mit tennél, ha egy barátod szabályt sértene?'
  ] },
  { key: 'tgf_crown_ccpd', title: 'Crown City • CCPD felvétel', emoji: '🚓', open: 'pdApply', review: 'pdReview', reviewer: 'pdRecruiter', accepted: 'pdCadet', department: 'CCPD', extra: [
    'Hogyan építesz fel egy szabályos közúti ellenőrzést RP-ben?', 'Mit tennél, ha a gyanúsított együttműködő?', 'Hogyan kérsz rádión erősítést és adsz helyzetjelentést?'
  ] },
  { key: 'tgf_crown_ccso', title: 'Crown City • CCSO felvétel', emoji: '🤠', open: 'shApply', review: 'shReview', reviewer: 'shRecruiter', accepted: 'shCadet', department: 'CCSO', extra: [
    'Hogyan kezelnél egy vidéki közlekedési eseményt RP-ben?', 'Mikor kérsz együttműködést másik frakciótól?', 'Hogyan választod külön a karaktered tudását az OOC információtól?'
  ] },
  { key: 'tgf_crown_ccfd', title: 'Crown City • CCFD / EMS felvétel', emoji: '🚒', open: 'fdApply', review: 'fdReview', reviewer: 'fdRecruiter', accepted: 'fdRecruit', department: 'CCFD / EMS', extra: [
    'Tűzoltó vagy EMS terület érdekel, és miért?', 'Hogyan egyeztetnél egy baleseti RP-jelenet résztvevőivel?', 'Hogyan koordinálsz egy eseményt a PD, Sheriff és DOT egységekkel?'
  ] },
  { key: 'tgf_crown_ccdot', title: 'Crown City • CCDOT felvétel', emoji: '🚧', open: 'dotApply', review: 'dotReview', reviewer: 'dotRecruiter', accepted: 'dotTrainee', department: 'CCDOT', extra: [
    'Hogyan szervezel terelési vagy útjavítási RP-jelenetet?', 'Hogyan egyeztetsz egy vontatásról a többi résztvevővel?', 'Miért fontos a munkaterület jelzése a szerepjátékban?'
  ] }
];

function crownEmbed(key, title, description) {
  return new EmbedBuilder().setColor(CROWN_COLOR).setTitle(title).setDescription(description)
    .setFooter({ text: `Crown City RP • NEXA • ${key}` });
}
const PANEL_TEXT = {
  welcome: ['👑 Üdvözlünk Crown Cityben!', 'Egy szervezett, történetekre és együttműködésre épülő magyar ER:LC RP-közösség vár.\n\n**01** Olvasd el a Discord- és RP-szabályzatot.\n**02** A hitelesítőgombbal vedd fel az Állampolgár rangot.\n**03** Válassz értesítési rangokat és kövesd a sessionöket.\n**04** Készíts karaktert, vagy jelentkezz a CCPD, CCSO, CCFD / EMS, CCDOT és Staff részleghez.\n\nKérdés esetén az ügyintézési központban nyiss privát ticketet.'],
  rules: ['📜 Crown City • Discord-szabályzat', '**1. Tisztelet:** személyeskedés, zaklatás, gyűlöletkeltés és fenyegetés tilos.\n**2. Rend:** a megfelelő szobát használd; spam, kéretlen ping és reklám nem megengedett.\n**3. Adatvédelem:** valós személyes adatot, privát beszélgetést és mások adatait ne publikáld.\n**4. Tartalom:** tiltott vagy a közösséghez nem illő tartalmat ne ossz meg.\n**5. Fiókbiztonság:** bot-token, jelszó és hitelesítő kód nem kerülhet a szerverre.\n**6. Ügykezelés:** játékosbejelentést és fellebbezést bizonyítékkal, privát ticketben küldj.\n**7. Moderáció:** a döntéshez indok és megfelelő bizonyíték szükséges; vitás ügy felülvizsgálható.\n**8. Alapszabályok:** a Discord és Roblox szabályait is be kell tartani.\n\nA vezetőség a változásokat a közleményekben jelzi.'],
  rpRules: ['🎭 Crown City • RP-szabályzat', '**IC / OOC:** a karakter története és a játékosok közötti egyeztetés külön marad.\n**Metagaming:** OOC szerzett információt a karakter nem használhat indokolatlanul.\n**Powergaming:** ne kényszeríts másokra megoldhatatlan vagy egyeztetés nélküli kimenetelt.\n**RDM / VDM:** indokolatlan támadás és járművel történő szándékos elütés nem megengedett.\n**Fear RP:** a karakter reagáljon hihetően a veszélyre.\n**Fail RP:** az ER:LC lehetőségein belül következetes, hihető szerepjátékot várunk.\n**Combat logging:** folyamatban lévő jelenetet következmények elkerüléséért ne hagyj el. Technikai megszakítást jelezz.\n**New Life:** új élet után a lezárt eseményből nem vihetsz tovább bosszút vagy meg nem szerzett tudást.\n**Fair play:** csalás, exploit és szándékos hibakihasználás tilos.\n**Frakciójog:** frakciós szerepet, szolgálati járművet és hatáskört csak jóváhagyott státusszal használj.\n**Nagy események:** a túszhelyzeteket és összetett jeleneteket a session vezetőjével egyeztesd.\n\nSzabályvita esetén a jelenet megakasztása helyett kérj Staff-segítséget.'],
  faq: ['❓ Gyakori kérdések', '**Nem látom a közösségi szobákat.** Vedd fel az Állampolgár rangot a hitelesítésnél.\n**Mikor lehet játszani?** A session-állapot és az események szobában kapsz tájékoztatást.\n**Hogyan leszek frakciótag?** A jelentkezési részlegben a kiválasztott frakció gombjával. A vezetőség dönt; a rang önmagában nem helyettesít képzést.\n**Hol jelentsek játékost?** Privát bejelentési ticketben, időponttal és bizonyítékkal.\n**Hogyan fellebbezzek?** Nyiss ügyet, írd le a döntés azonosítóját és a felülvizsgálat okát.\n**A támogató rang ad hatáskört?** Nem. Staff- és frakcióhatáskör külön kinevezéshez kötött.'],
  applicationGuide: ['📋 Jelentkezés • 5 részleg', 'CCPD, CCSO, CCFD / EMS, CCDOT és Staff felvételi panel áll rendelkezésre.\n\n**Folyamat:** gomb → kérdések → privát bírálat → döntés → értesítés.\nA jelentkezéshez Állampolgár rang kell. Ugyanahhoz a részleghez 24 óránként jelentkezhetsz. A válaszokat kizárólag a kijelölt bírálók és a jogosult vezetőség látják.\nElfogadás után a kezdő rangot a bot kiosztja. A további rendfokozatokról a frakcióvezető dönt.\n\nCsak Roblox-felhasználónevet, játékbeli tapasztalatot és rendelkezésre állást adj meg; valós személyes adatra nincs szükség.'],
  reportGuide: ['🚨 Játékosbejelentés', 'A bejelentést a ticketközpont **Játékosbejelentés / fellebbezés** menüpontjában küldd el.\n\n**Sablon:**\nJátékos Roblox-neve:\nIdőpont és session:\nMi történt:\nMelyik szerverregel lehet kapcsolatban:\nVideó vagy képernyőkép:\nTanúk / további körülmények:\n\nNe indíts nyilvános megszégyenítést. A Staff a teljes eseményt vizsgálja meg.'],
  appeals: ['⚖️ Fellebbezés', 'A ticketközpont bejelentési kategóriájában kérj felülvizsgálatot.\n\nDöntés vagy ügy azonosítója:\nÉrintett Roblox-fiók:\nMiért kéred a felülvizsgálatot:\nÚj bizonyíték vagy tisztázandó körülmény:\n\nA felülvizsgálatot lehetőség szerint az eredeti döntéstől független Staff-tag végzi. A fellebbezés nem jogosít szabálykerülésre.'],
  partners: ['🤝 Partnerségi kapcsolat', 'Olyan RP-közösségekkel keressük az együttműködést, amelyek rendezett szabályzattal és kulturált vezetéssel működnek.\n\nA partnerségi ticketben mutasd be a szervert, a témáját és az együttműködési ötletet. Partner rangot a vezetőség ad; kéretlen reklám és tömeges meghívózás nem megengedett.'],
  supporters: ['💎 A közösség támogatása', 'A VIP és Támogató rangot a vezetőség osztja ki. Az aktuális feltételeket külön közleményben ismertetjük.\n\nA támogatás nem ad moderációs jogot, frakcióvezetést, szabály alóli felmentést vagy automatikus előléptetést.'],
  characters: ['🪪 RP-karakterlap', '**Kitalált név:**\n**Karakter életkora:**\n**Foglalkozás / frakció:**\n**Háttértörténet:**\n**Célok és jellemvonások:**\n**Roblox-felhasználónév:**\n\nCsak kitalált karakteradatok kerüljenek a lapra. A valós lakcím, telefonszám, születési dátum és személyes okmány nem tartozik ide.'],
  staffTraining: ['🛡️ Staff • eljárásrend', '**1. Befogadás:** az ügyhöz kérj időpontot, érintett fiókot és bizonyítékot.\n**2. Vizsgálat:** hallgasd meg az érintetteket; különítsd el az IC konfliktust az OOC szabálysértéstől.\n**3. Döntés:** csak indokolható, arányos döntés szülessen. Érintettség esetén add át az ügyet.\n**4. Dokumentálás:** rögzítsd a döntést, a szabályt és a bizonyítékot.\n**5. Felülvizsgálat:** jelezd a fellebbezés lehetőségét.\n\nStaff-rang nem ad automatikusan frakcióparancsnoki jogot. A Discord- és a játékbeli moderáció külön rendszer.'],
  dispatchGuide: ['📡 Közös rádióprotokoll', '**Felépítés:** hívójel → címzett → helyszín → rövid helyzet → kérés.\n**Példa:** „PD-21 a központnak. Main Street, közúti ellenőrzés. Egy támogató egységet kérek.”\n\nStátuszok: szolgálatra kész / kiérkező / helyszínen / intézkedés alatt / szolgálaton kívül.\nEgy időben egy beszélő; sürgős közlés elsőbbséget kap. A szereplők a session elején egyeztetik a hívójeleket. Csak játékbeli incidensről rádiózz.'],
  serverControl: ['⚙️ Crown City • kezelés', '**Telepítés / hiányzó elemek pótlása:** `/crown-city telepites`\n**Állapot és jogosultságok ellenőrzése:** `/crown-city ellenorzes`\n**Hiányok javítása / botpanelek frissítése:** `/crown-city javitas`\n\nA telepítőt kizárólag a NEXA elsődleges tulajdonosa használhatja, szervertulajdonosi vagy Rendszergazda jogosultsággal.\nA privátszerverkód a telepítési vagy javítási parancs `szerverkod` mezőjével adható meg.\nA session-központ gombjait a Staff és a Session Host használja. A játékbeli szerver megnyitását az ER:LC-ben végezd el.']
};
const HANDBOOKS = {
  pdHandbook: ['🚓 CCPD • szolgálati kézikönyv', '**Feladat:** városi rendőri szerepjáték, közúti ellenőrzés, eseménykezelés és más frakciók támogatása.\n**Szolgálat:** jóváhagyott rang, hívójel, egyeztetett felszerelés és rádió.\n**Intézkedés:** bemutatkozás, érthető ok, lehetőség az együttműködésre, hihető RP és utólagos jelentés.\n**Üldözés:** helyzetjelentés és vezetői koordináció; ne alakítsd indokolatlan járműrombolássá.\n**Képzés:** Cadet → FTO-képzés → vezetői jóváhagyás. SWAT és Detective kiegészítő beosztás; önmagában nem ad magasabb rendfokozatot.'],
  shHandbook: ['🤠 CCSO • szolgálati kézikönyv', '**Feladat:** megyei és vidéki járőrszolgálat, közlekedési események és CCPD-együttműködés.\n**Szolgálat:** hívójel, feladatkiosztás és egyeztetett járőrkörzet.\n**Intézkedés:** kulturált kommunikáció, hihető jelenet és megfelelő jelentés.\n**Képzés:** Cadet → FTO-képzés → Deputy kinevezés.\n**Koordináció:** a nagyobb műveleteket a session vezetésével és az érintett frakcióval egyeztesd.'],
  fdHandbook: ['🚒 CCFD / EMS • szolgálati kézikönyv', '**Feladat:** tűzoltási, műszaki mentési és játékbeli egészségügyi jelenetek.\n**Szolgálat:** hívójel, kijelölt egység és képzettségnek megfelelő szerep.\n**Jelenet:** a résztvevőkkel egyeztetett állapot és hihető cselekmény; ne erőltess rájuk kimenetelt.\n**Koordináció:** rendőri területbiztosítás, DOT-terelés és közös rádiózás.\n**Jelentés:** esemény, egységek, játékbeli beavatkozás és lezárás.\n**Képzés:** Recruit → FTO / frakcióképzés → megfelelő beosztás. Ez RP-eljárásrend, nem valós ellátási útmutató.'],
  dotHandbook: ['🚧 CCDOT • szolgálati kézikönyv', '**Feladat:** vontatás, útjavítás, forgalomterelés és közútkezelési szerepjáték.\n**Szolgálat:** hívójel és egyeztetett munkafeladat.\n**Munkaterület:** az érintett játékosokkal egyeztesd a terelést és a lezárást; figyeld az érkező egységeket.\n**Vontatás:** tisztázd az RP-indokot és az illetékes fél kérését.\n**Munkalap:** helyszín, feladat, érintett jármű, megrendelő és befejezés.\n**Képzés:** Trainee → szolgálati képzés → Technician jóváhagyás.']
};
function contentForChannel(spec, state, roles, channels) {
  const mention = (key) => channels[key] ? `<#${channels[key].id}>` : 'a megfelelő csatorna';
  if (spec.key === 'serverInfo') return crownEmbed(spec.key, '🎮 Crown City RP • ER:LC', `**Játék:** Emergency Response: Liberty County\n**Közösség:** Crown City RP\n**Nyelv:** magyar\n**Privátszerverkód:** ${state.serverCode ? `\`${state.serverCode}\`` : 'A vezetőség hamarosan közzéteszi.'}\n\nSessionállapot: ${mention('sessionFeed')}\nRP-szabályzat: ${mention('rpRules')}\nSegítség: ${mention('ticketPanel')}\n\nA sessionnyitásról az értesítési rangokkal kapsz jelzést.`);
  if (spec.key === 'ranks') {
    const embed = crownEmbed(spec.key, '🏷️ Rangrendszer és hatáskörök', '**Vezetőség:** Tulajdonos → Társtulajdonos → Projektvezető → Management.\n**Staff:** Staff Manager → Head Administrator → Administrator → Senior Moderator → Moderator → Trial Moderator; külön Support Team.\nA frakciórangok játékbeli kinevezések; nem adnak Discord-adminisztrátori hatáskört.');
    for (const [group, title] of [['pd', 'CCPD'], ['sheriff', 'CCSO'], ['fd', 'CCFD / EMS'], ['dot', 'CCDOT']]) {
      embed.addFields({ name: title, value: ROLE_GROUPS[group].map((key) => `<@&${roles[key].id}>`).join(' → ').slice(0, 1024) });
    }
    return embed;
  }
  const entry = PANEL_TEXT[spec.key] || HANDBOOKS[spec.key];
  if (entry) return crownEmbed(spec.key, entry[0], entry[1]);
  if (/Reports$|dotReports/.test(spec.key)) return crownEmbed(spec.key, spec.name.replace(/・/g, ' '), '**Jelentéssablon:**\nDátum / session:\nÜgyintéző és hívójel:\nHelyszín:\nEsemény / feladat:\nÉrintett RP-szereplők:\nVégrehajtott játékbeli intézkedés:\nLezárás és bizonyíték:\n\nKizárólag játékbeli, az ügyhöz szükséges adatokat adj meg.');
  if (/Roster$/.test(spec.key)) return crownEmbed(spec.key, spec.name.replace(/・/g, ' '), '**Állományi bejegyzés:**\nRoblox-felhasználónév:\nRP-név:\nRendfokozat / beosztás:\nHívójel:\nKépzések:\nAktív / szabadságon / felfüggesztve:\n\nA listát a frakció kijelölt vezetője tartja naprakészen.');
  return crownEmbed(spec.key, spec.name.replace(/・/g, ' '), `${spec.topic}\n\n**Crown City RP** • A megfelelő szobát használd, és tartsd be a közösségi és RP-szabályokat.`);
}
function sessionPanel(state) {
  const active = state.session?.status === 'open';
  const embed = crownEmbed('sessionControl', '🎛️ Crown City • Session központ', `**Állapot:** ${active ? '🟢 Session nyitva' : '⚫ Nincs meghirdetett session'}\n${active ? `**Session:** ${state.session.title}\n` : ''}**Értesítések:** a session értesítési rang önként felvehető.\n\nA Staff és a Session Host az alábbi gombokkal hirdethet vagy zárhat sessiont.`);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('crown_session_open').setLabel('Session meghirdetése').setStyle(ButtonStyle.Success).setDisabled(active),
    new ButtonBuilder().setCustomId('crown_session_close').setLabel('Session lezárása').setStyle(ButtonStyle.Secondary).setDisabled(!active)
  );
  return { embeds: [embed], components: [row] };
}
module.exports = { CROWN_TITLE, CROWN_COLOR, CROWN_ROLES, CROWN_CATEGORIES, CROWN_APPLICATIONS, ROLE_GROUPS, MANAGEMENT_KEYS, STAFF_KEYS, LEADS, crownEmbed, contentForChannel, sessionPanel };
