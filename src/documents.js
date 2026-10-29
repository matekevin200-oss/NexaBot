const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder
} = require('discord.js');
const { NAMES, COLORS } = require('./constants');
const { getGuildConfig } = require('./config');
const { isConfiguredRoleHolder } = require('./belv-roster-rules');
const { baseEmbed, ephemeralError, sendLog } = require('./utils');

const EPHEMERAL = MessageFlags.Ephemeral;
const BELV_APPROVAL_GUILD_ID = '1517509643734221030';
const REVIEW_CHANNEL_KEY = 'case_files';
const DEFAULT_TARGET_PING_TYPES = new Set([
  'info_calls', 'internal_calls', 'important_info', 'tgf_results', 'leave_request',
  'members', 'promotion', 'internal_investigation', 'weekly_inspection',
  'disciplinary', 'case_files', 'case_documents', 'complaints', 'bomo_calls',
  'covert_ops', 'bomo_reports', 'confidential_files'
]);

const short = (id, label, placeholder, required = true, maxLength = 200) => ({
  id, label, placeholder, required, maxLength, style: 'short'
});
const paragraph = (id, label, placeholder, required = true, maxLength = 1000) => ({
  id, label, placeholder, required, maxLength, style: 'paragraph'
});

const DOCUMENT_TYPES = Object.freeze([
  {
    key: 'dc_rules', channel: 'dc-szabályzat', title: 'Discord-szabályzat', emoji: '📄', approval: false,
    fields: [
      short('title', 'Szabályzat címe', 'Például: Discord közösségi szabályzat'),
      short('section', 'Fejezet vagy témakör', 'Például: kommunikáció és viselkedés'),
      short('effective', 'Hatálybalépés', 'ÉÉÉÉ.HH.NN.'),
      paragraph('content', 'Szabályzat tartalma', 'Írd le pontosan a szabályokat'),
      paragraph('source', 'Hivatkozás vagy megjegyzés', 'Opcionális link vagy kiegészítés', false, 500)
    ]
  },
  {
    key: 'info_calls', channel: 'felhívások', parent: 'információk', title: 'Felhívás', emoji: '📢', approval: false,
    fields: [
      short('title', 'Felhívás címe', 'Rövid, egyértelmű cím'),
      short('audience', 'Címzettek', 'Kiknek szól?'),
      short('deadline', 'Időpont vagy határidő', 'ÉÉÉÉ.HH.NN. ÓÓ:PP'),
      paragraph('details', 'Részletes felhívás', 'Minden fontos tudnivaló'),
      short('contact', 'Kapcsolattartó', 'Név vagy beosztás', false)
    ]
  },
  {
    key: 'internal_calls', channel: 'felhívások-belsős', parent: 'információk', title: 'Belső felhívás', emoji: '📣', approval: false,
    fields: [
      short('title', 'Belső felhívás címe', 'Rövid cím'),
      short('units', 'Érintett állomány vagy egység', 'Kiknek szól?'),
      short('deadline', 'Határidő', 'ÉÉÉÉ.HH.NN. ÓÓ:PP'),
      paragraph('task', 'Feladat vagy tájékoztatás', 'Írd le részletesen'),
      paragraph('link', 'Csatolmány vagy link', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'important_info', channel: 'fontos-információk', parent: 'információk', title: 'Fontos információ', emoji: '📣', approval: false,
    fields: [
      short('title', 'Információ címe', 'Mi a közlemény tárgya?'),
      short('affected', 'Érintettek', 'Rang, egység vagy teljes állomány'),
      short('validity', 'Érvényesség', 'Mikortól meddig érvényes?'),
      paragraph('details', 'Részletes információ', 'Írd le a teljes tájékoztatást'),
      paragraph('link', 'Forrás vagy csatolmány', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'rules', channel: 'szabályzatok', parent: 'információk', title: 'Szabályzat', emoji: '‼️', approval: false,
    fields: [
      short('title', 'Szabályzat címe', 'A szabályzat megnevezése'),
      short('scope', 'Hatály és érintettek', 'Kire vonatkozik?'),
      short('effective', 'Hatálybalépés', 'ÉÉÉÉ.HH.NN.'),
      paragraph('content', 'Szabályzat szövege', 'Írd le a rendelkezéseket'),
      paragraph('source', 'Forrás vagy melléklet', 'Opcionális link', false, 500)
    ]
  },
  {
    key: 'inspection_rules', channelPrefix: 'szabályzatok-belső-ellenőrz', parent: 'információk', title: 'Belső ellenőrzési szabályzat', emoji: '‼️', approval: false,
    fields: [
      short('title', 'Szabályzat címe', 'A belső ellenőrzés témája'),
      short('scope', 'Ellenőrzési hatály', 'Szervezet, egység vagy személyi kör'),
      short('effective', 'Hatálybalépés', 'ÉÉÉÉ.HH.NN.'),
      paragraph('procedure', 'Ellenőrzési eljárás', 'Lépések, határidők és felelősök'),
      paragraph('attachment', 'Melléklet vagy link', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'decrees', channel: 'rendeletek', parent: 'információk', title: 'Rendelet', emoji: '📜', approval: false,
    fields: [
      short('number', 'Rendelet száma', 'Például: 12/2026.'),
      short('issuer', 'Kiadó vagy elrendelő', 'Név és beosztás'),
      short('effective', 'Hatálybalépés', 'ÉÉÉÉ.HH.NN.'),
      short('subject', 'Rendelet tárgya', 'Rövid tárgymegjelölés'),
      paragraph('content', 'Rendelet teljes tartalma', 'Írd le a rendelkezést')
    ]
  },
  {
    key: 'radio', channel: 'rádió-és-hívójel', parent: 'információk', title: 'Rádió- és hívójelrend', emoji: '📻', approval: false,
    fields: [
      short('unit', 'Egység vagy beosztás', 'Melyik egységhez tartozik?'),
      short('frequency', 'Frekvencia vagy hívójel', 'Rádiófrekvencia és hívójel'),
      short('access', 'Használatra jogosultak', 'Rangok vagy személyek'),
      paragraph('rules', 'Használati szabályok', 'Rádiózási rend és előírások'),
      paragraph('note', 'Megjegyzés', 'Opcionális kiegészítés', false, 500)
    ]
  },
  {
    key: 'uniform', channel: 'ruházat', parent: 'információk', title: 'Ruházati előírás', emoji: '🥋', approval: false,
    fields: [
      short('unit', 'Rang vagy egység', 'Kire vonatkozik?'),
      short('occasion', 'Szolgálati helyzet', 'Mikor kell ezt viselni?'),
      paragraph('required', 'Kötelező ruházat', 'Sorold fel a kötelező elemeket'),
      paragraph('forbidden', 'Tiltott vagy eltérő elemek', 'Mi nem viselhető?', false, 700),
      paragraph('image', 'Kép vagy minta linkje', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'vehicle_rules', channel: 'jármű-szabályzat', parent: 'információk', title: 'Járműszabályzat', emoji: '🚓', approval: false,
    fields: [
      short('vehicle', 'Járműtípus', 'Melyik járműre vonatkozik?'),
      short('authorized', 'Használatra jogosultak', 'Rang vagy egység'),
      paragraph('rules', 'Használati szabályok', 'Kiadás, vezetés és visszavétel rendje'),
      paragraph('equipment', 'Kötelező felszerelés', 'A jármű kötelező tartalma', false, 700),
      paragraph('image', 'Kép vagy dokumentum linkje', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'tgf_results', channel: 'tgf-eredmények', parent: 'információk', title: 'TGF-eredmény', emoji: '✅', approval: false,
    fields: [
      short('applicant', 'Jelentkező neve', 'Discord-név vagy megjelölés'),
      short('result', 'Eredmény', 'Elfogadva vagy elutasítva'),
      short('reviewer', 'Elbíráló', 'Név és beosztás'),
      short('date', 'Elbírálás dátuma', 'ÉÉÉÉ.HH.NN.'),
      paragraph('note', 'Indoklás vagy megjegyzés', 'Rövid értékelés', false, 700)
    ]
  },
  {
    key: 'btk', channel: 'btk', parent: 'információk', title: 'BTK-bejegyzés', emoji: '📁', approval: false,
    fields: [
      short('section', 'Szakasz vagy paragrafus', 'Például: 12. §'),
      short('title', 'Tényállás megnevezése', 'A szabálysértés vagy bűncselekmény neve'),
      paragraph('definition', 'Tényállás leírása', 'Mikor valósul meg?'),
      paragraph('sanction', 'Büntetési tétel', 'Alkalmazható jogkövetkezmény'),
      paragraph('note', 'Kiegészítés vagy példa', 'Opcionális megjegyzés', false, 500)
    ]
  },
  {
    key: 'service_log', channel: 'szolgálati-napló', parent: 'információk', title: 'Szolgálati napló', emoji: '📝', approval: false,
    fields: [
      short('time', 'Szolgálat kezdete és vége', 'ÉÉÉÉ.HH.NN. ÓÓ:PP–ÓÓ:PP'),
      short('unit', 'Egység és hívójel', 'Egység, jármű, hívójel'),
      short('participants', 'Résztvevők', 'Nevek vagy Discord-megjelölések'),
      paragraph('activity', 'Elvégzett tevékenység', 'Feladatok és intézkedések'),
      paragraph('incident', 'Rendkívüli esemény', 'Esemény vagy nincs', false, 700)
    ]
  },
  {
    key: 'service_report', channel: 'szolgálati-jelentés', parent: 'információk', title: 'Szolgálati jelentés', emoji: '📝', approval: false,
    fields: [
      short('subject', 'Jelentés tárgya', 'Rövid tárgy'),
      short('time_place', 'Időpont és helyszín', 'Mikor és hol történt?'),
      short('participants', 'Érintettek és résztvevők', 'Nevek, egységek'),
      paragraph('events', 'Esemény részletes leírása', 'Mi történt időrendben?'),
      paragraph('action', 'Megtett intézkedések', 'Intézkedés, eredmény, bizonyíték')
    ]
  },
  {
    key: 'leave_request', channel: 'szabadság-igénylés', parent: 'információk', title: 'Szabadságigénylés', emoji: '📝', approval: false,
    fields: [
      short('period', 'Szabadság időtartama', 'Kezdő és befejező dátum'),
      short('reason', 'Igénylés oka', 'Rövid indoklás'),
      short('availability', 'Elérhetőség ezalatt', 'Elérhető vagy nem elérhető'),
      short('substitute', 'Helyettesítő', 'Név vagy nincs', false),
      paragraph('note', 'További megjegyzés', 'Opcionális kiegészítés', false, 500)
    ]
  },
  {
    key: 'members', channel: 'tagok', parent: 'információk', title: 'Állománytag-adatlap', emoji: '🛡️', approval: false,
    fields: [
      short('member', 'Tag neve', 'Discord-név és karakter neve'),
      short('badge', 'Jelvényszám', 'A tag jelvényszáma'),
      short('rank', 'Rendfokozat', 'Aktuális rendfokozat'),
      short('unit', 'Egység vagy beosztás', 'Szervezeti hely'),
      short('status', 'Állapot', 'Aktív, szabadságon vagy inaktív')
    ]
  },
  {
    key: 'ranks', channel: 'rendfokozatok', parent: 'információk', title: 'Rendfokozati leírás', emoji: '🛡️', approval: false,
    fields: [
      short('rank', 'Rendfokozat neve', 'A rendfokozat megnevezése'),
      short('level', 'Helye a hierarchiában', 'Alá- és fölérendelt fokozatok'),
      paragraph('requirements', 'Elérési követelmények', 'Szolgálati idő és feltételek'),
      paragraph('authority', 'Jogkör és feladatok', 'Mire jogosult a viselője?'),
      paragraph('note', 'Megjegyzés', 'Opcionális kiegészítés', false, 500)
    ]
  },
  {
    key: 'authority', channel: 'hatáskörök', parent: 'információk', title: 'Hatásköri leírás', emoji: '🛡️', approval: false,
    fields: [
      short('role', 'Rang, egység vagy beosztás', 'Kinek a hatásköre?'),
      short('scope', 'Területi vagy tárgyi hatály', 'Mire terjed ki?'),
      paragraph('allowed', 'Engedélyezett intézkedések', 'Mit tehet?'),
      paragraph('limits', 'Korlátok és tilalmak', 'Mit nem tehet?'),
      paragraph('source', 'Jogalap vagy forrás', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'badge_numbers', channel: 'jelvényszámok', parent: 'információk', title: 'Jelvényszám-nyilvántartás', emoji: '🔢', approval: false,
    fields: [
      short('member', 'Tag neve', 'Discord-név és karakter neve'),
      short('badge', 'Jelvényszám', 'Kiadott jelvényszám'),
      short('rank', 'Rendfokozat', 'Aktuális rendfokozat'),
      short('issued', 'Kiadás dátuma', 'ÉÉÉÉ.HH.NN.'),
      short('status', 'Állapot', 'Aktív, bevont vagy módosított')
    ]
  },
  {
    key: 'promotion', channel: 'előléptetés-lefokozás', parent: 'információk', title: 'Előléptetés vagy lefokozás', emoji: '↕️', approval: false,
    fields: [
      short('member', 'Érintett tag', 'Discord-név vagy megjelölés'),
      short('old_rank', 'Jelenlegi rendfokozat', 'A korábbi rang'),
      short('new_rank', 'Új rendfokozat', 'Az új rang'),
      short('effective', 'Hatálybalépés', 'ÉÉÉÉ.HH.NN.'),
      paragraph('reason', 'Indoklás', 'Teljesítmény, vétség vagy döntési ok')
    ]
  },
  {
    key: 'ideas', channel: 'ötletek', parent: 'információk', title: 'Fejlesztési ötlet', emoji: '💡', approval: false,
    fields: [
      short('title', 'Ötlet címe', 'Rövid, érthető cím'),
      short('area', 'Érintett terület', 'Melyik részleget érinti?'),
      paragraph('idea', 'Ötlet részletes leírása', 'Mit szeretnél megváltoztatni?'),
      paragraph('benefit', 'Várható előny', 'Miért lenne hasznos?'),
      paragraph('implementation', 'Megvalósítási javaslat', 'Opcionális lépések', false, 700)
    ]
  },
  {
    key: 'internal_investigation', channel: 'belső-vizsgálatok', parent: 'ellenőrzés', title: 'Belső vizsgálat', emoji: '🔎', approval: true,
    fields: [
      short('subject', 'Vizsgálat tárgya vagy érintettje', 'Személy, egység vagy esemény'),
      short('opened', 'Megindítás dátuma', 'ÉÉÉÉ.HH.NN.'),
      short('investigator', 'Kijelölt vizsgáló', 'Név és beosztás'),
      paragraph('basis', 'Vizsgálat alapja', 'Bejelentés, gyanú vagy esemény'),
      paragraph('evidence', 'Bizonyítékok és hivatkozások', 'Linkek, tanúk, iratok')
    ]
  },
  {
    key: 'weekly_inspection', channel: 'heti-ellenőrzési-feladat', parent: 'ellenőrzés', title: 'Heti ellenőrzési feladat', emoji: '🕵️', approval: true,
    fields: [
      short('week', 'Hét és határidő', 'Például: 36. hét, péntek 20:00'),
      short('assigned', 'Kijelölt személy vagy egység', 'Ki hajtja végre?'),
      short('scope', 'Ellenőrzés helye vagy tárgya', 'Mit kell ellenőrizni?'),
      paragraph('tasks', 'Végrehajtandó feladatok', 'Lépések és elvárt eredmény'),
      paragraph('note', 'Kiemelt szempontok', 'Opcionális megjegyzés', false, 600)
    ]
  },
  {
    key: 'disciplinary', channel: 'fegyelmi-eljárások', parent: 'ellenőrzés', title: 'Fegyelmi eljárás', emoji: '⚖️', approval: true,
    fields: [
      short('person', 'Eljárás alá vont személy', 'Név, rang, jelvényszám'),
      short('incident', 'Esemény időpontja', 'ÉÉÉÉ.HH.NN. ÓÓ:PP'),
      short('violation', 'Feltételezett szabálysértés', 'Mely szabály sérülhetett?'),
      paragraph('facts', 'Tényállás és körülmények', 'Részletes eseményleírás'),
      paragraph('evidence', 'Bizonyítékok és javaslat', 'Linkek, tanúk, javasolt intézkedés')
    ]
  },
  {
    key: 'case_files', channel: 'ügyiratok', parent: 'ellenőrzés', title: 'Ügyirat', emoji: '📁', approval: true,
    fields: [
      short('title', 'Ügy megnevezése', 'Rövid ügycím'),
      short('parties', 'Érintett személyek vagy egységek', 'Nevek és beosztások'),
      short('opened', 'Ügy megnyitásának dátuma', 'ÉÉÉÉ.HH.NN.'),
      paragraph('summary', 'Ügy összefoglalása', 'Tényállás, előzmények és cél'),
      paragraph('attachment', 'Bizonyíték vagy irat linkje', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'case_documents', channel: 'ügyiratok-dokumentumban', parent: 'ellenőrzés', title: 'Ügyirati dokumentum', emoji: '📁', approval: true,
    fields: [
      short('document', 'Dokumentum megnevezése', 'Az irat címe'),
      short('reference', 'Kapcsolódó ügy vagy ügyszám', 'RP-... vagy ügy megnevezése'),
      short('date', 'Dokumentum dátuma', 'ÉÉÉÉ.HH.NN.'),
      paragraph('description', 'Dokumentum tartalma', 'Részletes összefoglalás'),
      paragraph('link', 'Dokumentum vagy melléklet linkje', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'complaints', channel: 'panaszok', parent: 'ellenőrzés', title: 'Panasz', emoji: '✉️', approval: false,
    fields: [
      short('complainant', 'Panaszos neve', 'Név vagy névtelen'),
      short('subject', 'Panasz tárgya vagy érintettje', 'Személy, egység vagy intézkedés'),
      short('incident', 'Esemény időpontja', 'ÉÉÉÉ.HH.NN. ÓÓ:PP'),
      paragraph('complaint', 'Panasz részletes leírása', 'Mi történt és mit kifogásol?'),
      paragraph('evidence', 'Bizonyíték vagy link', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'orders', channel: 'utasítások', parent: 'hivatalos-irattár', title: 'Hivatalos utasítás', emoji: '📜', approval: true,
    fields: [
      short('subject', 'Utasítás tárgya', 'Rövid tárgymegjelölés'),
      short('issuer', 'Kiadó vezető', 'Név és beosztás'),
      short('effective', 'Hatály és határidő', 'Mikortól meddig érvényes?'),
      paragraph('content', 'Utasítás teljes szövege', 'Feladatok, felelősök és végrehajtás'),
      paragraph('attachment', 'Melléklet vagy hivatkozás', 'Opcionális link', false, 500)
    ]
  },
  {
    key: 'decisions', channel: 'határozatok', parent: 'hivatalos-irattár', title: 'Határozat', emoji: '⚖️', approval: true,
    fields: [
      short('subject', 'Határozat tárgya', 'Miről szól a döntés?'),
      short('reference', 'Kapcsolódó ügy', 'Ügyszám vagy ügy megnevezése'),
      short('effective', 'Hatálybalépés', 'ÉÉÉÉ.HH.NN.'),
      paragraph('decision', 'Döntés rendelkező része', 'A meghozott határozat'),
      paragraph('basis', 'Indoklás és jogalap', 'A döntés alapja')
    ]
  },
  {
    key: 'minutes', channel: 'jegyzőkönyv', parent: 'hivatalos-irattár', title: 'Jegyzőkönyv', emoji: '📁', approval: true,
    fields: [
      short('subject', 'Esemény vagy ülés tárgya', 'Mi került jegyzőkönyvezésre?'),
      short('time_place', 'Időpont és helyszín', 'ÉÉÉÉ.HH.NN. ÓÓ:PP, helyszín'),
      short('participants', 'Jelenlévők', 'Nevek és beosztások'),
      paragraph('events', 'Elhangzottak és események', 'Részletes, időrendi leírás'),
      paragraph('decisions', 'Döntések és feladatok', 'Határidők és felelősök')
    ]
  },
  {
    key: 'laws', channel: 'jogszabályok', parent: 'hivatalos-irattár', title: 'Jogszabály', emoji: '📚', approval: true,
    fields: [
      short('number', 'Jogszabály száma és címe', 'Hivatalos megnevezés'),
      short('source', 'Kibocsátó vagy forrás', 'Jogalkotó vagy hivatkozás'),
      short('effective', 'Hatálybalépés', 'ÉÉÉÉ.HH.NN.'),
      paragraph('summary', 'Tartalmi összefoglaló', 'A fontos rendelkezések'),
      paragraph('link', 'Teljes szöveg vagy melléklet', 'Opcionális link', false, 500)
    ]
  },
  {
    key: 'circulars', channel: 'körlevelek', parent: 'hivatalos-irattár', title: 'Körlevél', emoji: '📑', approval: true,
    fields: [
      short('subject', 'Körlevél tárgya', 'Rövid cím'),
      short('audience', 'Címzettek', 'Kik kapják a tájékoztatást?'),
      short('effective', 'Kiadás és érvényesség', 'Dátum vagy időszak'),
      paragraph('content', 'Körlevél szövege', 'Teljes tájékoztatás'),
      paragraph('attachment', 'Melléklet vagy hivatkozás', 'Opcionális link', false, 500)
    ]
  },
  {
    key: 'archive', channel: 'archívum', parent: 'hivatalos-irattár', title: 'Archiválási bejegyzés', emoji: '🗄️', approval: true,
    fields: [
      short('item', 'Archiválandó irat vagy ügy', 'Megnevezés és ügyszám'),
      short('origin', 'Eredeti csatorna vagy forrás', 'Honnan került az archívumba?'),
      short('date', 'Archiválás dátuma', 'ÉÉÉÉ.HH.NN.'),
      paragraph('reason', 'Archiválás oka és állapot', 'Lezárás, hatályvesztés vagy egyéb ok'),
      paragraph('link', 'Irat vagy üzenet linkje', 'Opcionális hivatkozás', false, 500)
    ]
  },
  {
    key: 'bomo_calls', channel: 'felhívások', parent: 'bomo', title: 'BOMO-felhívás', emoji: '📢', approval: false,
    fields: [
      short('title', 'Felhívás címe', 'Rövid műveleti cím'),
      short('audience', 'Címzett állomány', 'Kiknek szól?'),
      short('time', 'Időpont vagy határidő', 'ÉÉÉÉ.HH.NN. ÓÓ:PP'),
      paragraph('details', 'Részletes felhívás', 'Feladat és szükséges tudnivalók'),
      short('contact', 'Kapcsolattartó', 'Név vagy hívójel', false)
    ]
  },
  {
    key: 'bomo_announcements', channel: 'közlemények', parent: 'bomo', title: 'BOMO-közlemény', emoji: '📢', approval: false,
    fields: [
      short('title', 'Közlemény címe', 'Rövid cím'),
      short('audience', 'Címzettek', 'Kik számára készült?'),
      short('validity', 'Érvényesség', 'Dátum vagy időszak'),
      paragraph('content', 'Közlemény tartalma', 'Teljes tájékoztatás'),
      paragraph('link', 'Hivatkozás vagy melléklet', 'Opcionális link', false, 500)
    ]
  },
  {
    key: 'bomo_rules', channel: 'bomo-szabályzat', parent: 'bomo', title: 'BOMO-szabályzat', emoji: '📜', approval: false,
    fields: [
      short('title', 'Szabályzat címe', 'BOMO-szabályzat megnevezése'),
      short('scope', 'Hatály és érintettek', 'Kire és mire vonatkozik?'),
      short('effective', 'Hatálybalépés', 'ÉÉÉÉ.HH.NN.'),
      paragraph('content', 'Szabályzat tartalma', 'Eljárások és kötelezettségek'),
      paragraph('attachment', 'Melléklet vagy hivatkozás', 'Opcionális link', false, 500)
    ]
  },
  {
    key: 'covert_ops', channel: 'fedett-műveletek', parent: 'bomo', title: 'Fedett műveleti terv', emoji: '🕵️', approval: true,
    fields: [
      short('code', 'Művelet kódneve', 'Belső műveleti megnevezés'),
      short('classification', 'Minősítés', 'Például: bizalmas vagy szigorúan bizalmas'),
      short('target', 'Cél és érintettek', 'Személy, csoport vagy helyszín'),
      paragraph('plan', 'Műveleti terv', 'Cél, módszer, időzítés és kockázatok'),
      paragraph('responsible', 'Felelősök és bizonyítékok', 'Résztvevők, engedélyek, linkek')
    ]
  },
  {
    key: 'bomo_reports', channel: 'jelentések', parent: 'bomo', title: 'BOMO-jelentés', emoji: '📝', approval: true,
    fields: [
      short('code', 'Kapcsolódó művelet vagy ügy', 'Kódnév vagy RP-ügyszám'),
      short('reporter', 'Jelentést tevő', 'Név, beosztás, hívójel'),
      short('time_place', 'Időpont és helyszín', 'Mikor és hol történt?'),
      paragraph('events', 'Események részletesen', 'Időrendi jelentés'),
      paragraph('result', 'Eredmény és bizonyíték', 'Következtetés, linkek, további teendő')
    ]
  },
  {
    key: 'confidential_files', channel: 'bizalmas-akták', parent: 'bomo', title: 'Bizalmas akta', emoji: '📁', approval: true,
    fields: [
      short('title', 'Akta címe vagy kódja', 'Belső azonosító'),
      short('classification', 'Titkosítási szint', 'Bizalmas vagy szigorúan bizalmas'),
      short('persons', 'Érintett személyek', 'Nevek, fedőnevek vagy egységek'),
      paragraph('summary', 'Akta részletes összefoglalója', 'Tények, kapcsolatok és kockázatok'),
      paragraph('evidence', 'Bizonyítékok és iratok', 'Védett hivatkozások vagy mellékletek')
    ]
  }
]);

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function customDocumentTypes(guildOrId) {
  const guildId = typeof guildOrId === 'string' ? guildOrId : guildOrId?.id;
  if (!guildId) return [];
  return (getGuildConfig(guildId).documents?.customTypes || [])
    .filter((type) => type.active !== false)
    .map((type) => ({ ...type, custom: true }));
}

function allDocumentTypes(guildOrId = null) {
  return [...DOCUMENT_TYPES, ...customDocumentTypes(guildOrId)];
}

function findDocumentType(key, guildOrId = null) {
  return allDocumentTypes(guildOrId).find((type) => type.key === key);
}

function findDocumentChannel(guild, type) {
  if (type?.channelId) {
    const selected = guild.channels.cache.get(type.channelId);
    return selected?.isTextBased?.() && !selected.isThread?.() ? selected : null;
  }
  const expected = normalizeName(type.channel || type.channelPrefix);
  const expectedParent = type.parent ? normalizeName(type.parent) : null;
  return guild.channels.cache.find((channel) => {
    if (!channel?.isTextBased?.() || channel.isThread?.()) return false;
    const name = normalizeName(channel.name);
    const nameMatches = type.channelPrefix ? name.startsWith(expected) : name === expected;
    if (!nameMatches) return false;
    if (!expectedParent) return true;
    return normalizeName(channel.parent?.name).includes(expectedParent);
  });
}

function fieldRow(field) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(field.id)
      .setLabel(field.label)
      .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setPlaceholder(field.placeholder)
      .setRequired(field.required)
      .setMaxLength(field.maxLength)
  );
}

function documentModal(type, targetUserId = null) {
  return new ModalBuilder()
    .setCustomId(`doc_submit:${type.key}:${targetUserId || '0'}`)
    .setTitle(type.title.slice(0, 45))
    .addComponents(...type.fields.map(fieldRow));
}

function documentRule(guildOrId, type) {
  const guildId = typeof guildOrId === 'string' ? guildOrId : guildOrId?.id;
  const documents = guildId ? getGuildConfig(guildId).documents : null;
  const stored = documents?.types?.[type.key];
  const normalizeRoleIds = (value, legacyValue) => [...new Set(
    (Array.isArray(value) && value.length ? value : [legacyValue])
      .map((id) => /^\d{16,22}$/.test(String(id || '')) ? String(id) : null)
      .filter(Boolean)
  )].slice(0, 20);
  const overrideAccessRoleIds = normalizeRoleIds(type?.accessRoleIds || stored?.accessRoleIds, type?.accessRoleId || stored?.accessRoleId);
  const defaultAccessRoleIds = normalizeRoleIds(documents?.defaultAccessRoleIds, documents?.defaultAccessRoleId);
  const usageRoleIds = overrideAccessRoleIds.length
    ? overrideAccessRoleIds
    : type?.accessRoleId || stored?.accessRoleId
      ? normalizeRoleIds(null, type?.accessRoleId || stored?.accessRoleId)
      : defaultAccessRoleIds;
  const managerRoleIds = normalizeRoleIds(documents?.managerRoleIds, null);
  const accessRoleIds = [...new Set([...usageRoleIds, ...managerRoleIds])].slice(0, 40);
  return {
    caseNumber: typeof type?.caseNumber === 'boolean'
      ? type.caseNumber
      : typeof stored?.caseNumber === 'boolean' ? stored.caseNumber : Boolean(type.approval),
    pingTarget: typeof type?.pingTarget === 'boolean'
      ? type.pingTarget
      : typeof stored?.pingTarget === 'boolean' ? stored.pingTarget : DEFAULT_TARGET_PING_TYPES.has(type.key),
    accessRoleIds,
    accessRoleId: accessRoleIds[0] || null,
    notificationRoleId: type?.notificationRoleId || stored?.notificationRoleId || null,
    overrideAccessRoleIds,
    overrideAccessRoleId: overrideAccessRoleIds[0] || null,
    defaultAccessRoleIds,
    defaultAccessRoleId: defaultAccessRoleIds[0] || null,
    managerRoleIds
  };
}

function documentMentions(targetUserId = null, notificationRoleId = null) {
  const users = /^\d{16,22}$/.test(String(targetUserId || '')) ? [String(targetUserId)] : [];
  const roles = /^\d{16,22}$/.test(String(notificationRoleId || '')) ? [String(notificationRoleId)] : [];
  return {
    content: [...roles.map((id) => `<@&${id}>`), ...users.map((id) => `<@${id}>`)].join(' • ') || undefined,
    allowedMentions: { parse: [], users, roles }
  };
}

function documentAccessLabel(guild, type) {
  const roleIds = documentRule(guild, type).accessRoleIds;
  return roleIds.length
    ? roleIds.map((roleId) => guild?.roles?.cache?.get(roleId)?.name || `Rang: ${roleId}`).join(', ').slice(0, 900)
    : 'mindenki';
}

function canUseDocument(member, type) {
  if (!member) return false;
  const roleIds = documentRule(member?.guild, type).accessRoleIds;
  return roleIds.length === 0 || roleIds.some((roleId) => member?.roles?.cache?.has(roleId));
}

const DOCUMENT_PERMISSION_LABELS = new Map([
  [PermissionFlagsBits.ViewChannel, 'Csatorna megtekintése'],
  [PermissionFlagsBits.SendMessages, 'Üzenetek küldése'],
  [PermissionFlagsBits.ReadMessageHistory, 'Üzenetek olvasási előzményei'],
  [PermissionFlagsBits.EmbedLinks, 'Hivatkozások beágyazása'],
  [PermissionFlagsBits.MentionEveryone, 'Mindenki és rangok megemlítése']
]);

function missingDocumentPermissions(channel, botMember, requiredPermissions) {
  if (!channel || !botMember) return ['a csatorna vagy a Nexa tagsági adatai nem érhetők el'];
  const permissions = channel.permissionsFor(botMember);
  if (!permissions) return ['a csatorna megtekintése'];
  return requiredPermissions
    .filter((permission) => !permissions.has(permission))
    .map((permission) => DOCUMENT_PERMISSION_LABELS.get(permission) || 'szükséges csatornajogosultság');
}

function documentPermissionError(channel, missing) {
  return `A Nexának nincs jogosultsága a ${channel} csatornában. Add meg neki: **${missing.join(', ')}**.`;
}

function targetPicker(type) {
  return new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`doc_target:${type.key}`)
      .setPlaceholder('Válaszd ki a megjelölendő személyt')
      .setMinValues(1)
      .setMaxValues(1)
  );
}

function documentPanel(type, guild = null) {
  const rule = documentRule(guild, type);
  const embed = new EmbedBuilder()
    .setColor(type.approval ? COLORS.warning : COLORS.primary)
    .setTitle(`${type.emoji} ${type.title}`)
    .setDescription(
      type.approval
        ? belvApprovalRoleExists(guild)
          ? 'Az adatlap kitöltése után a dokumentum a **BELVÉDELMI VEZETŐSÉG** jóváhagyására kerül. Jóváhagyás után a NexaBot teszi közzé ebben a csatornában.'
          : 'Az adatlap kitöltése után a dokumentum a **Vezetőség** jóváhagyására kerül. Jóváhagyás után a NexaBot teszi közzé ebben a csatornában.'
        : 'Töltsd ki az adatlapot. A kész bejegyzést a NexaBot teszi közzé ebben a csatornában.'
    )
    .addFields(
      { name: 'Hozzáférés', value: rule.accessRoleIds.length ? `A használati vagy iratkezelői rangok bármelyikével használható: **${documentAccessLabel(guild, type)}**.` : '**Minden szervertag használhatja.**', inline: true },
      { name: 'Ügyszám', value: rule.caseNumber ? 'Bekapcsolva' : 'Kikapcsolva', inline: true },
      { name: 'Személy megjelölése', value: rule.pingTarget ? 'Kötelező' : 'Nincs', inline: true },
      { name: 'Értesítendő rang', value: rule.notificationRoleId ? `<@&${rule.notificationRoleId}>` : 'Nincs', inline: true }
    )
    .setFooter({ text: `NexaBot • Dokumentumpanel • ${type.key}` });
  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`doc_open:${type.key}`)
        .setLabel(`${type.title} kitöltése`.slice(0, 80))
        .setEmoji(type.emoji)
        .setStyle(ButtonStyle.Primary)
    )
  ];
  return { embeds: [embed], components };
}

function approvalControls(type, targetChannelId, submitterId, targetUserId = '0') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`doc_approve:${type.key}:${targetChannelId}:${submitterId}:${targetUserId || '0'}`)
      .setLabel('Jóváhagyás')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`doc_reject:${type.key}:${targetChannelId}:${submitterId}`)
      .setLabel('Elutasítás')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );
}

function rejectionModal(messageId, submitterId) {
  return new ModalBuilder()
    .setCustomId(`doc_reject_submit:${messageId}:${submitterId}`)
    .setTitle('Dokumentum elutasítása')
    .addComponents(fieldRow(paragraph('reject_reason', 'Elutasítás kötelező indoklása', 'Miért nem fogadható el a dokumentum?', true, 700)));
}

function hasNamedRole(member, roleName) {
  const expected = normalizeName(roleName);
  return member?.roles?.cache?.some((role) => normalizeName(role.name) === expected);
}

function isOperative(member) {
  return hasNamedRole(member, NAMES.operativeRole);
}

const BELV_APPROVAL_ROLE_NAME = 'BELVÉDELMI VEZETŐSÉG';

function belvApprovalRoleExists(guild) {
  const expected = normalizeName(BELV_APPROVAL_ROLE_NAME);
  return Boolean(guild?.roles?.cache?.some((role) => normalizeName(role.name) === expected));
}

function canApprove(member) {
  if (member?.guild?.id === BELV_APPROVAL_GUILD_ID) return isConfiguredRoleHolder(member, belvApprovalRoleId(member.guild));
  if (hasNamedRole(member, BELV_APPROVAL_ROLE_NAME)) return true;
  if (belvApprovalRoleExists(member?.guild)) return false;
  const dashboardRoleId = member?.guild?.id ? getGuildConfig(member.guild.id).roles?.dashboard : null;
  const managerRoleIds = member?.guild?.id ? getGuildConfig(member.guild.id).documents?.managerRoleIds || [] : [];
  return Boolean(
    member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    (dashboardRoleId && member?.roles?.cache?.has(dashboardRoleId)) ||
    managerRoleIds.some((roleId) => member?.roles?.cache?.has(roleId)) ||
    hasNamedRole(member, NAMES.leadershipRole)
  );
}

function approvalDenialMessage(guild) {
  if (guild?.id === BELV_APPROVAL_GUILD_ID) return belvApprovalRoleId(guild)
    ? `Ezt kizárólag a beállított **${BELV_APPROVAL_ROLE_NAME}** rang fogadhatja el vagy utasíthatja el.`
    : 'A BELV jóváhagyó rangazonosító nincs beállítva; állítsd be a BELV_APPROVAL_ROLE_ID változót.';
  return belvApprovalRoleExists(guild)
    ? `Ezt kizárólag a **${BELV_APPROVAL_ROLE_NAME}** rang fogadhatja el vagy utasíthatja el.`
    : `Ezt csak adminisztrátor vagy a **${NAMES.leadershipRole}** rang használhatja.`;
}

function bviCaseNumber(date = new Date()) {
  const parts = new Intl.DateTimeFormat('hu-HU', {
    timeZone: 'Europe/Budapest',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `RP-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

function documentEmbed(type, interaction, caseNumber, status, targetUserId = null) {
  const formFields = type.fields
    .map((field) => ({ field, value: interaction.fields.getTextInputValue(field.id).trim() }))
    .filter(({ value }) => value)
    .map(({ field, value }) => ({ name: field.label, value }));
  return baseEmbed(
    status === 'pending' ? `⏳ Jóváhagyásra vár • ${type.title}` : `${type.emoji} ${type.title}`,
    status === 'pending'
      ? 'A dokumentum a kijelölt vezetői rang jóváhagyására vár.'
      : 'Hivatalos bejegyzés a NexaBot dokumentációs rendszeréből.',
    status === 'pending' ? COLORS.warning : COLORS.primary
  ).addFields(
    ...(caseNumber ? [{ name: 'Ügyszám', value: caseNumber, inline: true }] : []),
    { name: 'Beküldte', value: `${interaction.user} • ${interaction.user.tag}`, inline: true },
    ...(targetUserId ? [{ name: 'Megjelölt személy', value: `<@${targetUserId}>`, inline: true }] : []),
    ...formFields,
    { name: 'Állapot', value: status === 'pending' ? '⏳ Jóváhagyásra vár' : '✅ Közzétéve' }
  );
}

async function installDocumentPanels(guild, botUser) {
  const installed = [];
  const missing = [];
  for (const type of allDocumentTypes(guild)) {
    const channel = findDocumentChannel(guild, type);
    if (!channel) {
      missing.push(type.channel || type.channelPrefix || type.channelId || type.title);
      continue;
    }
    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const footer = `NexaBot • Dokumentumpanel • ${type.key}`;
    const existing = messages?.find(
      (message) => message.author.id === botUser.id && message.embeds[0]?.footer?.text === footer
    );
    if (existing) await existing.edit(documentPanel(type, guild));
    else await channel.send(documentPanel(type, guild));
    installed.push(channel.name);
  }
  return { installed, missing };
}

async function handleDocumentButton(interaction) {
  const id = interaction.customId;
  if (id.startsWith('doc_open:')) {
    const type = findDocumentType(id.split(':')[1], interaction.guild);
    if (!type) return ephemeralError(interaction, 'Ismeretlen dokumentumtípus.');
    if (!canUseDocument(interaction.member, type)) {
      const rule = documentRule(interaction.guild, type);
      return ephemeralError(interaction, rule.accessRoleIds.length
        ? `Ezt a következő rangok bármelyike használhatja: **${documentAccessLabel(interaction.guild, type)}**.`
        : 'Ehhez a dokumentumhoz még nincs használati rang beállítva az Owner Centerben.');
    }
    if (documentRule(interaction.guild, type).pingTarget) {
      return interaction.reply({
        content: `👤 Válaszd ki, kit jelöljön meg a bot a **${type.title}** bejegyzésben.`,
        components: [targetPicker(type)],
        flags: EPHEMERAL
      });
    }
    return interaction.showModal(documentModal(type));
  }

  if (id.startsWith('doc_approve:')) {
    if (!canApprove(interaction.member)) {
      return ephemeralError(interaction, approvalDenialMessage(interaction.guild));
    }
    const [, key, targetChannelId, submitterId, selectedUserId] = id.split(':');
    const targetUserId = /^\d{16,22}$/.test(selectedUserId || '') ? selectedUserId : null;
    const type = findDocumentType(key, interaction.guild);
    const target = interaction.guild.channels.cache.get(targetChannelId);
    if (!type || !target?.isTextBased()) return ephemeralError(interaction, 'A célcsatorna nem található.');
    const notificationRoleId = documentRule(interaction.guild, type).notificationRoleId;
    const botMember = interaction.guild.members.me;
    const requiredTargetPermissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks];
    const notifyRole = notificationRoleId ? interaction.guild.roles.cache.get(notificationRoleId) : null;
    if (notifyRole && !notifyRole.mentionable) requiredTargetPermissions.push(PermissionFlagsBits.MentionEveryone);
    const missingTargetPermissions = missingDocumentPermissions(target, botMember, requiredTargetPermissions);
    if (missingTargetPermissions.length) return ephemeralError(interaction, documentPermissionError(target, missingTargetPermissions));
    const missingReviewPermissions = missingDocumentPermissions(interaction.channel, botMember, [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]);
    if (missingReviewPermissions.length) return ephemeralError(interaction, documentPermissionError(interaction.channel, missingReviewPermissions));
    const mentions = documentMentions(targetUserId, notificationRoleId);
    await interaction.deferReply({ flags: EPHEMERAL });
    const approved = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle(`✅ Jóváhagyva • ${type.title}`)
      .setColor(COLORS.success);
    approved.setFields(
      ...approved.data.fields.filter((field) => field.name !== 'Állapot'),
      { name: 'Állapot', value: `✅ Jóváhagyta: ${interaction.user}` }
    );
    if (target.id === interaction.channelId) {
      await interaction.message.edit({ embeds: [approved], components: [] });
      if (mentions.content) {
        await target.send({
          content: `${mentions.content} • Jóváhagyták a következő dokumentumot: **${type.title}**.`,
          allowedMentions: mentions.allowedMentions
        });
      }
    } else {
      await target.send({
        content: mentions.content,
        embeds: [approved],
        allowedMentions: mentions.allowedMentions
      });
      await interaction.message.edit({ embeds: [approved], components: [] });
    }
    const submitter = await interaction.client.users.fetch(submitterId).catch(() => null);
    await submitter?.send(`✅ A **${type.title}** dokumentumodat jóváhagyták a **${interaction.guild.name}** szerveren.`).catch(() => null);
    await sendLog(interaction.guild, baseEmbed('✅ Dokumentum jóváhagyva', `${type.title} • ${interaction.user.tag}`, COLORS.success));
    return interaction.editReply(`✅ A dokumentum jóváhagyva és közzétéve itt: ${target}`);
  }

  if (id.startsWith('doc_reject:')) {
    if (!canApprove(interaction.member)) {
      return ephemeralError(interaction, approvalDenialMessage(interaction.guild));
    }
    const missingPermissions = missingDocumentPermissions(interaction.channel, interaction.guild.members.me, [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages]);
    if (missingPermissions.length) return ephemeralError(interaction, documentPermissionError(interaction.channel, missingPermissions));
    const [, , , submitterId] = id.split(':');
    return interaction.showModal(rejectionModal(interaction.message.id, submitterId));
  }
}

async function handleDocumentSelect(interaction) {
  const type = findDocumentType(interaction.customId.split(':')[1], interaction.guild);
  if (!type) return ephemeralError(interaction, 'Ismeretlen dokumentumtípus.');
  if (!canUseDocument(interaction.member, type)) {
    const rule = documentRule(interaction.guild, type);
    return ephemeralError(interaction, rule.accessRoleIds.length
      ? `Ezt a következő rangok bármelyike használhatja: **${documentAccessLabel(interaction.guild, type)}**.`
      : 'Ehhez a dokumentumhoz még nincs használati rang beállítva az Owner Centerben.');
  }
  const targetUserId = interaction.values?.[0];
  if (!/^\d{16,22}$/.test(targetUserId || '')) return ephemeralError(interaction, 'Nem sikerült kiválasztani a személyt.');
  return interaction.showModal(documentModal(type, targetUserId));
}

async function handleDocumentModal(interaction) {
  if (interaction.customId.startsWith('doc_submit:')) {
    const [, typeKey, selectedUserId] = interaction.customId.split(':');
    const type = findDocumentType(typeKey, interaction.guild);
    if (!type) return ephemeralError(interaction, 'Ismeretlen dokumentumtípus.');
    if (!canUseDocument(interaction.member, type)) {
      const rule = documentRule(interaction.guild, type);
      return ephemeralError(interaction, rule.accessRoleIds.length
        ? `Ezt a következő rangok bármelyike használhatja: **${documentAccessLabel(interaction.guild, type)}**.`
        : 'Ehhez a dokumentumhoz még nincs használati rang beállítva az Owner Centerben.');
    }
    const rule = documentRule(interaction.guild, type);
    const targetUserId = rule.pingTarget && /^\d{16,22}$/.test(selectedUserId || '') ? selectedUserId : null;
    if (rule.pingTarget && !targetUserId) return ephemeralError(interaction, 'Ehhez a bejegyzéshez előbb válassz ki egy megjelölendő személyt.');
    await interaction.deferReply({ flags: EPHEMERAL });
    const caseNumber = rule.caseNumber ? bviCaseNumber() : null;
    if (type.approval) {
      const reviewType = findDocumentType(REVIEW_CHANNEL_KEY, interaction.guild);
      const reviewChannel = findDocumentChannel(interaction.guild, reviewType);
      if (!reviewChannel) {
        return interaction.editReply('❌ A meglévő **ügyiratok** jóváhagyási csatornát nem találom. Új csatornát nem hoztam létre.');
      }
      const embed = documentEmbed(type, interaction, caseNumber, 'pending', targetUserId)
        .addFields({ name: 'Célcsatorna', value: `${interaction.channel}` });
      const message = await reviewChannel.send({
        embeds: [embed],
        components: [approvalControls(type, interaction.channelId, interaction.user.id, targetUserId)]
      });
      return interaction.editReply(`✅ A dokumentum jóváhagyásra elküldve: ${message.url}${caseNumber ? `\n**Ügyszám:** ${caseNumber}` : ''}`);
    }
    const embed = documentEmbed(type, interaction, caseNumber, 'published', targetUserId);
    const mentions = documentMentions(targetUserId, rule.notificationRoleId);
    const message = await interaction.channel.send({
      content: mentions.content,
      embeds: [embed],
      allowedMentions: mentions.allowedMentions
    });
    await sendLog(interaction.guild, baseEmbed('📄 Dokumentum közzétéve', `${type.title}${caseNumber ? ` • ${caseNumber}` : ''} • ${interaction.user.tag}`, COLORS.success));
    return interaction.editReply(`✅ A NexaBot közzétette a bejegyzést: ${message.url}${caseNumber ? `\n**Ügyszám:** ${caseNumber}` : ''}`);
  }

  if (interaction.customId.startsWith('doc_reject_submit:')) {
    if (!canApprove(interaction.member)) {
      return ephemeralError(interaction, approvalDenialMessage(interaction.guild));
    }
    const missingPermissions = missingDocumentPermissions(interaction.channel, interaction.guild.members.me, [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages]);
    if (missingPermissions.length) return ephemeralError(interaction, documentPermissionError(interaction.channel, missingPermissions));
    await interaction.deferReply({ flags: EPHEMERAL });
    const [, messageId, submitterId] = interaction.customId.split(':');
    const reason = interaction.fields.getTextInputValue('reject_reason').trim();
    const pending = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!pending?.embeds?.length) return interaction.editReply('❌ A jóváhagyásra váró dokumentum nem található.');
    const rejected = EmbedBuilder.from(pending.embeds[0]).setTitle('❌ Elutasított dokumentum').setColor(COLORS.danger);
    rejected.setFields(
      ...rejected.data.fields.filter((field) => field.name !== 'Állapot'),
      { name: 'Állapot', value: `❌ Elutasította: ${interaction.user}` },
      { name: 'Elutasítás indoka', value: reason }
    );
    await pending.edit({ embeds: [rejected], components: [] });
    const submitter = await interaction.client.users.fetch(submitterId).catch(() => null);
    const dmSent = await submitter?.send(
      `❌ A dokumentumodat elutasították a **${interaction.guild.name}** szerveren.\n**Indok:** ${reason}`
    ).then(() => true).catch(() => false);
    await sendLog(interaction.guild, baseEmbed('❌ Dokumentum elutasítva', `${reason}\nVezető: ${interaction.user.tag}`, COLORS.danger));
    return interaction.editReply(`✅ Az elutasítás rögzítve.${dmSent === false ? '\n⚠️ A privát értesítést nem sikerült elküldeni.' : ''}`);
  }
}

module.exports = {
  DOCUMENT_TYPES,
  customDocumentTypes,
  allDocumentTypes,
  normalizeName,
  findDocumentType,
  findDocumentChannel,
  documentModal,
  documentPanel,
  documentRule,
  documentMentions,
  documentAccessLabel,
  canUseDocument,
  targetPicker,
  approvalControls,
  rejectionModal,
  isOperative,
  canApprove,
  bviCaseNumber,
  installDocumentPanels,
  handleDocumentButton,
  handleDocumentSelect,
  handleDocumentModal
};
