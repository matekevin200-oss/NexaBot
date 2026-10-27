const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  Routes,
  SlashCommandBuilder
} = require('discord.js');
const { COLORS, SUPPORT_GUILD_ID } = require('./constants');
const {
  getGuildConfig,
  setGuildConfig,
  getOwnerSettings,
  setOwnerSettings,
  getModuleState,
  grantGuildPlan,
  dashboardUrl,
  inviteUrl
} = require('./config');
const { supportTicketPanel, ticketPanel, staffPanel } = require('./panels');
const { verificationPanel } = require('./engagement');
const { rolePanel } = require('./community');
const { shiftPanel } = require('./shifts');
const { installApplicationPanel } = require('./applications');
const { installDocumentPanels } = require('./documents');
const { localizeCommandJson } = require('./command-localizations');
const { isBotOwner } = require('./config');
const { CIA_KNOWLEDGE_PANELS, CIA_ROLE_DETAILS } = require('./cia-content');

const SETUP_REASON = 'NEXA Bot official Support Server installer';
const MANAGED_FOOTER = 'NEXA Support Setup • automatically managed message';
const LEGACY_MANAGED_FOOTERS = new Set([
  MANAGED_FOOTER,
  'NEXA Support Setup • automatikusan kezelt üzenet'
]);

const SUPPORT_ROLES = Object.freeze([
  { key: 'owner', name: '👑 NEXA Owner', legacyNames: ['👑 NEXA Tulajdonos'], color: 0xf4b942, hoist: true, permissions: [PermissionFlagsBits.Administrator] },
  {
    key: 'management',
    name: '🛡️ Management',
    legacyNames: ['🛡️ Vezetőség'],
    color: 0xef5b6c,
    hoist: true,
    permissions: [
      PermissionFlagsBits.ViewAuditLog,
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageWebhooks,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.ManageNicknames,
      PermissionFlagsBits.MoveMembers,
      PermissionFlagsBits.MentionEveryone
    ]
  },
  {
    key: 'developer',
    name: '💻 Developer',
    legacyNames: ['💻 Fejlesztő'],
    color: 0x4e8cff,
    hoist: true,
    permissions: [
      PermissionFlagsBits.ViewAuditLog,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageWebhooks,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.ReadMessageHistory
    ]
  },
  {
    key: 'support',
    name: '🎧 Support Team',
    legacyNames: ['🎧 Ügyfélszolgálat'],
    color: 0x52e0a4,
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.ManageNicknames,
      PermissionFlagsBits.MoveMembers
    ]
  },
  { key: 'tester', name: '🧪 Tester', legacyNames: ['🧪 Tesztelő'], color: 0xa978ff, hoist: true, permissions: [] },
  { key: 'partner', name: '🤝 Partner', color: 0xf0a85b, hoist: true, permissions: [] },
  { key: 'supporter', name: '💎 Supporter', legacyNames: ['💎 Támogató'], color: 0x46d6cf, hoist: true, permissions: [] },
  { key: 'announcements', name: '📢 Announcements', legacyNames: ['📢 Értesítések'], color: 0xf4b942, mentionable: true, permissions: [] },
  { key: 'beta', name: '🧪 Beta Updates', legacyNames: ['🧪 Béta értesítések'], color: 0xa978ff, mentionable: true, permissions: [] },
  { key: 'hungarian', name: '🇭🇺 Magyar', color: 0x52e0a4, permissions: [] },
  { key: 'english', name: '🇬🇧 English', color: 0x4e8cff, permissions: [] },
  { key: 'verified', name: '✅ Verified Member', legacyNames: ['✅ Ellenőrzött tag'], color: 0x57f287, permissions: [] },
  { key: 'muted', name: '🔇 Muted', legacyNames: ['🔇 Némított'], color: 0x747f8d, permissions: [] }
]);

const SUPPORT_CATEGORIES = Object.freeze([
  {
    key: 'start',
    name: '━━━ 01 • START HERE ━━━',
    legacyNames: ['━━━ START HERE ━━━', '━━━ KEZDÉS ━━━'],
    access: 'public-readonly',
    channels: [
      ['welcome', '👋・welcome', 'readonly', ['👋・üdvözlés']],
      ['rules', '📜・rules', 'readonly', ['📜・szabályzat']],
      ['verification', '✅・verification', 'readonly', ['✅・ellenőrzés']],
      ['language', '🌐・language-selection', 'readonly', ['🌐・nyelvválasztás']],
      ['announcements', '📢・announcements', 'readonly', ['📢・bejelentések']],
      ['updates', '📰・updates', 'readonly', ['📰・frissítések']],
      ['status', '📊・system-status', 'readonly', ['📊・rendszerállapot']]
    ]
  },
  {
    key: 'nexa',
    name: '━━━ 02 • NEXA BOT ━━━',
    legacyNames: ['━━━ NEXA BOT ━━━'],
    access: 'public-readonly',
    channels: [
      ['about', '🤖・about-nexa', 'readonly', ['🤖・a-nexa-bot']],
      ['features', '✨・features', 'readonly', ['✨・funkciók']],
      ['guide', '📖・getting-started', 'readonly', ['📖・útmutató']],
      ['commands', '⌨️・commands', 'readonly', ['⌨️・parancsok']],
      ['dashboard', '🧭・web-dashboard', 'readonly', ['🧭・webes-kezelőfelület']],
      ['links', '🔗・official-links', 'readonly', ['🔗・hasznos-linkek']],
      ['faq', '❓・faq', 'readonly', ['❓・gyakori-kérdések']]
    ]
  },
  {
    key: 'support',
    name: '━━━ 03 • SUPPORT ━━━',
    legacyNames: ['━━━ SUPPORT ━━━', '━━━ TÁMOGATÁS ━━━'],
    access: 'verified',
    channels: [
      ['ticketPanel', '🎫・open-ticket', 'readonly', ['🎫・ticket-nyitás']],
      ['help', '🧩・help', 'chat', ['🧩・segítségkérés']],
      ['bugs', '🐞・bug-reports', 'chat', ['🐞・hibajelentés']],
      ['suggestions', '💡・suggestions', 'chat', ['💡・ötletek']],
      ['feedback', '⭐・feedback', 'chat', ['⭐・visszajelzések']]
    ]
  },
  {
    key: 'tickets',
    name: '━━━ 04 • TICKETS ━━━',
    legacyNames: ['━━━ TICKETS ━━━', '━━━ TICKETEK ━━━'],
    access: 'tickets',
    channels: []
  },
  {
    key: 'community',
    name: '━━━ 05 • COMMUNITY ━━━',
    legacyNames: ['━━━ COMMUNITY ━━━', '━━━ KÖZÖSSÉG ━━━'],
    access: 'verified',
    channels: [
      ['general', '💬・general', 'chat', ['💬・általános']],
      ['hungarianChat', '🇭🇺・hungarian-chat', 'chat', ['🌍・english-chat']],
      ['showcase', '🖼️・server-showcase', 'chat', ['🖼️・szerver-bemutatók']],
      ['botCommands', '🤖・bot-commands', 'chat', ['🤖・bot-parancsok']],
      ['giveaway', '🎉・giveaways', 'readonly', ['🎉・nyereményjáték']],
      ['lounge', '🔊・Lounge', 'voice', ['🔊・Társalgó']],
      ['supportVoice1', '🎧・Support 1', 'voice', ['🎧・Segítség 1']],
      ['supportVoice2', '🎧・Support 2', 'voice', ['🎧・Segítség 2']]
    ]
  },
  {
    key: 'staff',
    name: '━━━ 90 • STAFF ━━━',
    legacyNames: ['━━━ STAFF ━━━'],
    access: 'staff',
    channels: [
      ['staffChat', '🔒・staff-chat', 'chat'],
      ['staffTasks', '📋・staff-tasks', 'chat', ['📋・staff-feladatok']],
      ['ticketLogs', '🎫・ticket-log', 'readonly'],
      ['moderationLogs', '🧾・moderation-log', 'readonly', ['🧾・moderációs-log']],
      ['securityLogs', '🛡️・security-log', 'readonly', ['🛡️・biztonsági-log']],
      ['errorLogs', '💥・error-log', 'readonly', ['💥・hibalog']],
      ['memberLogs', '👥・member-log', 'readonly', ['👥・tag-változások']],
      ['reports', '📨・reports', 'chat', ['📨・jelentések']],
      ['staffAnnouncements', '📢・announcement-drafts', 'chat', ['📢・közlemény-készítés']],
      ['discordUpdates', '📨・discord-updates', 'readonly', ['📨・discord-frissítések']],
      ['staffVoice', '🔊・Staff Room', 'voice', ['🔊・Staff szoba']]
    ]
  },
  {
    key: 'owner',
    name: '━━━ 99 • OWNER ━━━',
    legacyNames: ['━━━ OWNER ━━━'],
    access: 'owner',
    channels: [
      ['ownerCenter', '👑・owner-center', 'chat', ['👑・owner-központ']],
      ['ownerLogs', '🔐・owner-log', 'readonly'],
      ['criticalAlerts', '🚨・critical-alerts', 'readonly', ['🚨・kritikus-riasztások']],
      ['developerTest', '🧪・developer-test', 'chat', ['🧪・fejlesztői-teszt']]
    ]
  }
]);

const CIA_INSTALLATION_VERSION = 3;
const CIA_INSTALL_MARKER = `NEXA_CIA_INSTALLATION_V${CIA_INSTALLATION_VERSION}`;
const CIA_FINAL_INSTALL_MARKER = 'NEXA_CIA_INSTALLER_FINALIZED';
const CIA_SETUP_REASON = 'NEXA Bot primary-owner CIA installer';
const CIA_PANEL_FOOTER = 'NEXA CIA RP Setup • managed message';
const CIA_LEGACY_PANEL_FOOTER = 'NEXA CIA RP Setup • one-time managed message';
const ciaInstallLocks = new Set();

const CIA_ROLES = Object.freeze([
  { key: 'director', name: '👑 Director of the CIA (D/CIA)', legacyNames: ['👑 CIA Főigazgató', '👑 Director of the CIA'], color: 0xd4af37, hoist: true, permissions: [PermissionFlagsBits.Administrator] },
  {
    key: 'deputy', name: '⭐ Deputy Director of the CIA (DD/CIA)', legacyNames: ['⭐ CIA Főigazgató-helyettes', '⭐ Deputy Director of the CIA'], color: 0xc0392b, hoist: true,
    permissions: [PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MentionEveryone]
  },
  {
    key: 'chiefOfStaff', name: '🏛️ Executive Director (EXDIR)', legacyNames: ['🏛️ Kabinetfőnök', '🏛️ Executive Director'], color: 0xe74c3c, hoist: true,
    permissions: [PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.KickMembers, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.MoveMembers]
  },
  {
    key: 'directorateHead', name: '🛡️ Deputy Director for Operations (DDO)', legacyNames: ['🛡️ Igazgatósági Vezető', '🛡️ Director of Operations'], color: 0x9b59b6, hoist: true,
    permissions: [PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.MoveMembers]
  },
  {
    key: 'operationsCommander', name: '🎖️ Chief of Station (COS)', legacyNames: ['🎖️ Műveleti Parancsnok', '🎖️ Chief of Station'], color: 0x8e44ad, hoist: true,
    permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.MoveMembers]
  },
  { key: 'seniorAgent', name: '🕶️ Deputy Chief of Station (DCOS)', legacyNames: ['🕶️ Vezető Különleges Ügynök', '🕶️ Deputy Chief of Station'], color: 0x2980b9, hoist: true, permissions: [] },
  { key: 'specialAgent', name: '🕵️ Case Officer (CO)', legacyNames: ['🕵️ Különleges Ügynök', '🕵️ Senior Operations Officer'], color: 0x3498db, hoist: true, permissions: [] },
  { key: 'intelligenceOfficer', name: '🎯 Targeting Officer (TO)', legacyNames: ['🔎 Hírszerzési Tiszt', '🔎 Intelligence Officer'], color: 0x16a085, hoist: true, permissions: [] },
  { key: 'fieldAgent', name: '📡 Staff Operations Officer (SOO)', legacyNames: ['📡 Terepi Ügynök', '📡 Operations Officer'], color: 0x1abc9c, hoist: true, permissions: [] },
  { key: 'collectionOfficer', name: '🗂️ Collection Management Officer (CMO)', color: 0x148f77, hoist: true, permissions: [] },
  { key: 'specializedOfficer', name: '🧩 Specialized Skills Officer (SSO)', color: 0x117864, hoist: true, permissions: [] },
  { key: 'paramilitaryOfficer', name: '🛡️ Paramilitary Officer (PMO)', color: 0x63754e, hoist: true, permissions: [] },
  { key: 'analyst', name: '🧠 Intelligence Analyst (IA)', color: 0x5b8def, hoist: true, permissions: [] },
  { key: 'technicalOfficer', name: '🧪 Technical Operations Officer (TOO)', color: 0x7f8cda, hoist: true, permissions: [] },
  { key: 'systemsOfficer', name: '💻 IT Engineer', color: 0x42c9cf, hoist: true, permissions: [] },
  { key: 'supportOfficer', name: '📦 Support Integration Officer (SIO)', color: 0xd6a756, hoist: true, permissions: [] },
  { key: 'trainee', name: '🎓 Professional Trainee (PT)', legacyNames: ['🎓 Próbaidős Ügynök', '🎓 Junior Operations Officer'], color: 0x2ecc71, hoist: true, permissions: [] },
  { key: 'analysisDivision', name: '🧠 Directorate of Analysis (DA)', color: 0x5b8def, permissions: [] },
  { key: 'scienceDivision', name: '🧪 Directorate of Science & Technology (DS&T)', color: 0x7f8cda, permissions: [] },
  { key: 'systemsDivision', name: '💻 Directorate of Mission Systems (DMS)', color: 0x42c9cf, permissions: [] },
  { key: 'supportDivision', name: '📦 Directorate of Support (DS)', color: 0xd6a756, permissions: [] },
  { key: 'candidate', name: '📋 CIA Jelölt', legacyNames: ['📋 CIA Applicant'], color: 0x95a5a6, permissions: [] },
  { key: 'verified', name: '✅ Ellenőrzött állomány', legacyNames: ['✅ Ellenőrzött Személy', '✅ Verified Personnel'], color: 0x57f287, permissions: [] },
  { key: 'operationAlert', name: '🚨 Műveleti Riasztás', legacyNames: ['🚨 Operation Alert'], color: 0xe67e22, mentionable: true, permissions: [] },
  { key: 'announcements', name: '📢 CIA Közlemények', legacyNames: ['📢 CIA Announcements'], color: 0xf1c40f, mentionable: true, permissions: [] },
  { key: 'suspended', name: '⛔ Felfüggesztett', legacyNames: ['⛔ Suspended'], color: 0x2c3e50, permissions: [] }
]);

const CIA_CATEGORIES = Object.freeze([
  {
    key: 'entry', name: '━━━ 01 • CIA BELÉPÉS ━━━', access: 'public-readonly', channels: [
      ['welcome', '👋・üdvözlés', 'readonly'],
      ['rules', '📜・szabályzat', 'readonly'],
      ['verification', '✅・ellenőrzés', 'readonly'],
      ['notificationRoles', '🎭・értesítési-rangok', 'readonly'],
      ['announcements', '📢・közlemények', 'readonly'],
      ['recruitmentInfo', '🕵️・toborzási-információk', 'readonly'],
      ['application', '📝・jelentkezés', 'readonly'],
      ['applicationResults', '✅・jelentkezési-eredmények', 'readonly'],
      ['ciaOverview', '🏛️・mi-a-cia', 'readonly'],
      ['faq', '❓・gyakori-kérdések', 'readonly'],
      ['serverGuide', '🧭・szerver-útmutató', 'readonly']
    ]
  },
  {
    key: 'information', name: '━━━ 02 • CIA INFORMÁCIÓ ━━━', access: 'verified-readonly', channels: [
      ['handbook', '📘・állományi-kézikönyv', 'readonly'],
      ['hierarchy', '🔰・szolgálati-hierarchia', 'readonly'],
      ['ranks', '🎖️・beosztások', 'readonly', ['🎖️・rendfokozatok']],
      ['radioCodes', '📻・rádiókódok', 'readonly'],
      ['equipment', '🧰・felszerelési-szabályzat', 'readonly'],
      ['protocols', '📑・eljárásrendek', 'readonly'],
      ['directorates', '🏢・igazgatóságok', 'readonly'],
      ['intelligenceCycle', '🔄・hírszerzési-ciklus', 'readonly'],
      ['rpJurisdiction', '⚖️・rp-hatáskörök', 'readonly'],
      ['classification', '🔐・hozzáférési-szintek', 'readonly'],
      ['ethics', '🤝・etikai-kódex', 'readonly'],
      ['glossary', '📖・fogalomtár', 'readonly']
    ]
  },
  {
    key: 'contact', name: '━━━ 03 • CIA ÜGYINTÉZÉS ━━━', access: 'verified', channels: [
      ['ticketPanel', '🎫・ügyintézés', 'readonly']
    ]
  },
  { key: 'tickets', name: '━━━ 04 • CIA TICKETEK ━━━', access: 'tickets', channels: [] },
  {
    key: 'community', name: '━━━ 05 • CIA KÖZÖSSÉG ━━━', access: 'verified', channels: [
      ['general', '💬・állományi-társalgó', 'chat'],
      ['media', '📸・média', 'chat'],
      ['botCommands', '🤖・bot-parancsok', 'chat'],
      ['lounge', '🔊・Társalgó', 'voice'],
      ['offTopic', '☕・ooc-társalgó', 'chat'],
      ['suggestions', '💡・állományi-ötletek', 'chat'],
      ['eventCalendar', '🗓️・eseménynaptár', 'readonly'],
      ['communityVoice', '🔊・Közösségi terem', 'voice']
    ]
  },
  {
    key: 'training', name: '━━━ 10 • KIKÉPZÉS ━━━', access: 'personnel', channels: [
      ['trainingAnnouncements', '📣・kiképzési-felhívások', 'readonly'],
      ['trainingMaterial', '📚・kiképzési-anyagok', 'readonly'],
      ['trainingSchedule', '📅・kiképzési-beosztás', 'readonly'],
      ['trainingReports', '📝・kiképzési-jelentések', 'chat'],
      ['trainingVoice', '🎧・Kiképzési terem', 'voice'],
      ['basicTraining', '🎓・alapképzés', 'readonly'],
      ['specialistTraining', '🧩・szakképzések', 'readonly'],
      ['examStandards', '📝・vizsgakövetelmények', 'readonly'],
      ['mentoring', '🤝・mentorálás', 'chat'],
      ['examVoice', '🎧・Vizsgaterem', 'voice']
    ]
  },
  {
    key: 'operations', name: '━━━ 20 • MŰVELETI KÖZPONT ━━━', access: 'operations', channels: [
      ['briefings', '🗺️・műveleti-eligazítás', 'readonly'],
      ['dispatch', '📟・központi-diszpécser', 'chat'],
      ['activeOperations', '🚨・aktív-műveletek', 'chat'],
      ['operationReports', '📄・műveleti-jelentések', 'chat'],
      ['operationRadio', '📻・műveleti-rádió', 'chat'],
      ['operationVoice', '🔊・Műveleti rádió', 'voice'],
      ['operationPlanning', '📋・műveleti-tervezés', 'chat'],
      ['riskAssessment', '⚠️・kockázatértékelés', 'chat'],
      ['operationDebrief', '🧾・műveleti-értékelés', 'chat'],
      ['operationArchive', '🗄️・műveleti-archívum', 'readonly'],
      ['operationVoiceTwo', '🔊・Műveleti rádió 2', 'voice'],
      ['briefingVoice', '🎧・Eligazító terem', 'voice']
    ]
  },
  {
    key: 'intelligence', name: '━━━ 30 • HÍRSZERZÉS ━━━', access: 'classified', channels: [
      ['intelligenceDesk', '🧠・hírszerzési-központ', 'chat'],
      ['targets', '🎯・célpontok', 'chat'],
      ['caseFiles', '🗃️・akták', 'chat'],
      ['evidence', '📎・bizonyítékok', 'chat'],
      ['intelligenceReports', '🔎・hírszerzési-jelentések', 'chat'],
      ['sourceRegister', '🗂️・rp-forrásjegyzék', 'chat'],
      ['collectionRequirements', '📥・információigények', 'chat'],
      ['sourceReliability', '📊・forrásértékelés', 'readonly'],
      ['intelligenceVoice', '🎧・Hírszerzési tárgyaló', 'voice']
    ]
  },
  {
    key: 'analysis', name: '━━━ 31 • ELEMZÉS — DA ━━━', access: 'analysis', channels: [
      ['analysisDesk', '🧠・elemzői-műhely', 'chat'],
      ['analysisReports', '📑・elemzések', 'chat'],
      ['situationBrief', '🌍・helyzetértékelés', 'chat'],
      ['analysisMethod', '📚・elemzési-alapelvek', 'readonly'],
      ['analysisVoice', '🎧・Elemzői tárgyaló', 'voice']
    ]
  },
  {
    key: 'science', name: '━━━ 32 • TUDOMÁNY ÉS TECHNOLÓGIA ━━━', access: 'science', channels: [
      ['technicalDesk', '🧪・technikai-koordináció', 'chat'],
      ['equipmentRequests', '🧰・eszközigénylések', 'chat'],
      ['technicalReports', '🔧・technikai-jelentések', 'chat'],
      ['technicalGuide', '📖・technikai-útmutató', 'readonly'],
      ['technicalVoice', '🎧・Technikai tárgyaló', 'voice']
    ]
  },
  {
    key: 'systems', name: '━━━ 33 • MISSION SYSTEMS — DMS ━━━', access: 'systems', channels: [
      ['systemsDesk', '💻・rendszer-koordináció', 'chat'],
      ['systemsIncidents', '🚧・rendszerhibák', 'chat'],
      ['systemsChanges', '🛠️・változásnapló', 'readonly'],
      ['systemsGuide', '🔐・digitális-biztonság', 'readonly'],
      ['systemsVoice', '🎧・Rendszerügyi tárgyaló', 'voice']
    ]
  },
  {
    key: 'support', name: '━━━ 34 • TÁMOGATÁS — DS ━━━', access: 'support', channels: [
      ['logistics', '📦・logisztika', 'chat'],
      ['resources', '🗃️・készletnyilvántartás', 'chat'],
      ['supportRequests', '📋・támogatási-igények', 'chat'],
      ['supportGuide', '📖・támogatási-rend', 'readonly'],
      ['supportVoice', '🎧・Támogatási tárgyaló', 'voice']
    ]
  },
  {
    key: 'liaison', name: '━━━ 35 • KAPCSOLATTARTÁS ━━━', access: 'leadership', channels: [
      ['liaisonDesk', '🤝・partnerkapcsolatok', 'chat'],
      ['liaisonRequests', '📨・együttműködési-kérelmek', 'chat'],
      ['liaisonProtocol', '📜・kapcsolattartási-rend', 'readonly'],
      ['liaisonVoice', '🎧・Egyeztető terem', 'voice']
    ]
  },
  {
    key: 'administration', name: '━━━ 40 • ADMINISZTRÁCIÓ ━━━', access: 'personnel', channels: [
      ['shiftPanel', '⏱️・szolgálati-panel', 'readonly'],
      ['serviceLogs', '📊・szolgálati-napló', 'readonly'],
      ['leaveRequests', '🏖️・szabadság-igénylés', 'chat'],
      ['personnelRecords', '👥・állományi-nyilvántartás', 'readonly'],
      ['dutySchedule', '📅・szolgálati-beosztás', 'readonly'],
      ['handover', '🔁・szolgálatátadás', 'chat'],
      ['documentGuide', '📑・dokumentum-útmutató', 'readonly']
    ]
  },
  {
    key: 'oversight', name: '━━━ 80 • BELSŐ ELLENŐRZÉS ━━━', access: 'leadership', channels: [
      ['reviewFiles', '📁・ügyiratok', 'chat'],
      ['internalReports', '📨・belső-jelentések', 'chat'],
      ['disciplinary', '⚖️・fegyelmi-eljárások', 'chat'],
      ['complaints', '✉️・panaszok', 'chat'],
      ['audits', '🔍・ellenőrzési-napló', 'readonly'],
      ['incidentReviews', '🧾・esemény-felülvizsgálat', 'chat'],
      ['oversightGuide', '📖・ellenőrzési-eljárásrend', 'readonly'],
      ['oversightVoice', '🎧・Meghallgató terem', 'voice']
    ]
  },
  {
    key: 'leadership', name: '━━━ 90 • VEZETŐSÉG ━━━', access: 'leadership', channels: [
      ['leadershipChat', '🔒・vezetőségi-chat', 'chat'],
      ['decisions', '📜・vezetői-határozatok', 'readonly'],
      ['promotions', '⬆️・előléptetés-lefokozás', 'chat'],
      ['staffPanel', '🛡️・állomány-kezelés', 'readonly'],
      ['leadershipVoice', '🔊・Vezetőségi tárgyaló', 'voice'],
      ['leadershipAgenda', '📋・vezetői-napirend', 'chat'],
      ['leadershipMinutes', '📝・értekezleti-jegyzőkönyv', 'chat']
    ]
  },
  {
    key: 'executive', name: '━━━ 99 • IGAZGATÓSÁG ━━━', access: 'executive', channels: [
      ['directorOffice', '👑・főigazgatói-iroda', 'chat'],
      ['classifiedArchive', '🗄️・szigorúan-bizalmas-archívum', 'chat'],
      ['securityLogs', '🛡️・biztonsági-napló', 'readonly'],
      ['botLogs', '🤖・bot-napló', 'readonly'],
      ['memberLogs', '👤・tag-napló', 'readonly'],
      ['systemControl', '⚙️・cia-rendszer', 'readonly'],
      ['installationHistory', '🔁・telepítési-napló', 'readonly'],
      ['executiveVoice', '🎧・Igazgatósági tárgyaló', 'voice']
    ]
  }
]);

const CIA_CHANNEL_TOPICS = Object.freeze({
  welcome: 'CIA RP szerver belépési és tájékoztató központ.',
  rules: 'A CIA RP frakció teljes szerver- és szolgálati szabályzata.',
  verification: 'Tagellenőrzés az állományi területek eléréséhez.',
  notificationRoles: 'Önkiszolgáló CIA értesítési rangok kiválasztása.',
  announcements: 'Hivatalos CIA RP közlemények.',
  recruitmentInfo: 'Felvételi feltételek és a jelentkezés menete.',
  application: 'A CIA egyedi TGF-jelentkezési panelje.',
  applicationResults: 'Elfogadott és elutasított jelentkezések eredményei.',
  handbook: 'Állományi kézikönyv és alapvető működési elvek.',
  hierarchy: 'Szolgálati út és utasítási rend.',
  ranks: 'CIA RP rangsor és hatáskörök.',
  radioCodes: 'Rádiófegyelem, hívójelek és rövid kódok.',
  equipment: 'Engedélyezett felszerelések és használati feltételek.',
  protocols: 'Általános eljárásrendek és dokumentálási követelmények.',
  ticketPanel: 'Privát CIA ügyintézés, jelentkezési kérdés és bejelentés.',
  trainingAnnouncements: 'Kötelező és opcionális kiképzések felhívásai.',
  trainingMaterial: 'Kiképzési segédanyagok és vizsgakövetelmények.',
  trainingSchedule: 'Kiképzési időpontok és beosztások.',
  trainingReports: 'Kiképzési értékelések és jelentések.',
  briefings: 'Vezető által jóváhagyott műveleti eligazítások.',
  dispatch: 'Szolgálati koordináció és egységirányítás.',
  activeOperations: 'Folyamatban lévő RP-műveletek valós idejű koordinációja.',
  operationReports: 'Lezárt műveletek részletes dokumentációja.',
  operationRadio: 'Írásos műveleti rádió és hívójelek.',
  intelligenceDesk: 'Minősített hírszerzési együttműködés.',
  targets: 'RP-célpontok és kockázati profilok.',
  caseFiles: 'Aktív és lezárt hírszerzési akták.',
  evidence: 'Bizonyítékok és ellenőrizhető hivatkozások.',
  intelligenceReports: 'Elemzői és hírszerzési jelentések.',
  shiftPanel: 'NEXA szolgálatkezelő panel.',
  serviceLogs: 'Szolgálati idő, beosztások és műszaknapló.',
  leaveRequests: 'Szabadság- és távolléti igénylések.',
  personnelRecords: 'Vezetőség által kezelt állományi nyilvántartás.',
  reviewFiles: 'Jóváhagyásra váró hivatalos dokumentumok.',
  internalReports: 'Belső ellenőrzési és visszaélési jelentések.',
  disciplinary: 'Fegyelmi eljárások és döntések.',
  complaints: 'Bizalmas panaszok és felülvizsgálatok.',
  audits: 'Ellenőrzési események és vezetői audit.',
  leadershipChat: 'Privát vezetőségi koordináció.',
  decisions: 'Jóváhagyott vezetői határozatok.',
  promotions: 'Előléptetések, lefokozások és személyzeti javaslatok.',
  staffPanel: 'NEXA gombos moderációs és állománykezelő panel.',
  directorOffice: 'A CIA RP főigazgatójának zárt vezérlőcsatornája.',
  classifiedArchive: 'Szigorúan bizalmas, vezetői hozzáférésű archívum.',
  securityLogs: 'Anti-Raid, Anti-Nuke és Automod biztonsági események.',
  botLogs: 'NEXA moderációs és rendszeresemények.',
  memberLogs: 'Tagbelépési, kilépési és személyazonossági események.'
});

function buildCiaSetupCommand() {
  return new SlashCommandBuilder()
    .setName('cia')
    .setDescription('Kizárólagos botowner CIA telepítő, frissítő és újratelepítő.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((subcommand) => subcommand
      .setName('telepites')
      .setDescription('Egyszer létrehozza a teljes CIA rang-, csatorna-, jog- és panelrendszert.'))
    .addSubcommand((subcommand) => subcommand
      .setName('ujratelepites')
      .setDescription('Csak a fő botowner: frissíti és bővíti a már telepített CIA rendszert.'))
    .addSubcommand((subcommand) => subcommand
      .setName('ellenorzes')
      .setDescription('Módosítás nélkül ellenőrzi a CIA telepítés állapotát.'))
    .addSubcommand((subcommand) => subcommand
      .setName('rangok-frissitese')
      .setDescription('A telepített CIA rangokat amerikai elnevezésekre frissíti.'));
}

function buildSupportSetupCommand() {
  return new SlashCommandBuilder()
    .setName('support-szerver')
    .setDescription('A hivatalos NEXA támogatási szerver tulajdonosi telepítője.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((subcommand) => subcommand
      .setName('moderacio')
      .setDescription('Fő owner: egygombos support moderációs kapcsoló.'))
    .addSubcommand((subcommand) => subcommand
      .setName('telepites')
      .setDescription('Létrehozza vagy frissíti a teljes szervert, jogosultságokat és paneleket.'))
    .addSubcommand((subcommand) => subcommand
      .setName('panelek')
      .setDescription('Újraküldi a NEXA által kezelt tájékoztató- és kezelőpaneleket.'))
    .addSubcommand((subcommand) => subcommand
      .setName('javitas')
      .setDescription('Kijavítja a support modulokat, rangokat, csatornákat és globális tiltásokat.'))
    .addSubcommand((subcommand) => subcommand
      .setName('angolositas')
      .setDescription('A meglévő Support szervert biztonságosan angol alapnyelvre állítja.'))
    .addSubcommand((subcommand) => subcommand
      .setName('ellenorzes')
      .setDescription('Ellenőrzi a szükséges rangokat, kategóriákat és csatornákat.'));
}

async function registerSupportCommandInOwnerGuilds({ rest, guilds, applicationId, ownerId }) {
  const normalizedOwnerId = String(ownerId || '').trim();
  const normalizedApplicationId = String(applicationId || '').trim();
  if (!rest || !normalizedOwnerId || !normalizedApplicationId) {
    return { registered: [], failed: [] };
  }

  const candidates = Array.from(guilds?.values?.() || guilds || [])
    .filter((guild) => guild?.id === SUPPORT_GUILD_ID && guild.ownerId === normalizedOwnerId);
  const command = localizeCommandJson(buildSupportSetupCommand().toJSON());
  const registered = [];
  const failed = [];

  for (const guild of candidates) {
    try {
      await rest.post(
        Routes.applicationGuildCommands(normalizedApplicationId, guild.id),
        { body: command }
      );
      registered.push(guild.id);
    } catch (error) {
      failed.push({ guildId: guild.id, error });
    }
  }

  return { registered, failed };
}

async function registerCiaCommandInOwnerGuilds({ rest, guilds, applicationId, ownerId }) {
  const normalizedOwnerId = String(ownerId || '').trim();
  const normalizedApplicationId = String(applicationId || '').trim();
  if (!rest || !normalizedOwnerId || !normalizedApplicationId) return { registered: [], failed: [] };
  const candidates = [];
  const removed = [];
  const failed = [];
  for (const guild of Array.from(guilds?.values?.() || guilds || [])) {
    if (!guild?.id) continue;
    if (isCiaInstallerFinalized(guild)) {
      try {
        await removeCiaGuildCommand(guild);
        removed.push(guild.id);
      } catch (error) {
        failed.push({ guildId: guild.id, error });
      }
      continue;
    }
    let ownerMember = guild.members?.cache?.get(normalizedOwnerId) || null;
    if (!ownerMember) ownerMember = await guild.members?.fetch?.(normalizedOwnerId).catch(() => null);
    if (guild.ownerId === normalizedOwnerId || ownerMember?.permissions?.has(PermissionFlagsBits.Administrator)) {
      candidates.push(guild);
    }
  }
  const command = localizeCommandJson(buildCiaSetupCommand().toJSON());
  const registered = [];
  for (const guild of candidates) {
    try {
      await rest.post(Routes.applicationGuildCommands(normalizedApplicationId, guild.id), { body: command });
      registered.push(guild.id);
    } catch (error) {
      failed.push({ guildId: guild.id, error });
    }
  }
  return { registered, removed, failed };
}

function roleBySpec(guild, spec) {
  const names = new Set([spec.name, ...(spec.legacyNames || [])]);
  return guild.roles.cache.find((role) => names.has(role.name) && !role.managed);
}

async function ensureRole(guild, spec) {
  const existing = roleBySpec(guild, spec);
  const data = {
    name: spec.name,
    color: spec.color,
    hoist: Boolean(spec.hoist),
    mentionable: Boolean(spec.mentionable),
    permissions: spec.permissions,
    reason: SETUP_REASON
  };
  if (!existing) return guild.roles.create(data);
  await existing.edit(data).catch(() => null);
  return existing;
}

function staffWrite(roleId) {
  return {
    id: roleId,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageThreads
    ]
  };
}

function categoryPermissions(guild, roles, access) {
  const everyone = guild.roles.everyone.id;
  const muted = {
    id: roles.muted.id,
    deny: [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.Speak
    ]
  };
  const owner = staffWrite(roles.owner.id);
  const management = staffWrite(roles.management.id);
  const developer = staffWrite(roles.developer.id);
  const support = staffWrite(roles.support.id);
  if (access === 'public-readonly') {
    return [
      {
        id: everyone,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads]
      },
      support,
      developer,
      management,
      owner,
      muted
    ];
  }
  if (access === 'verified') {
    return [
      { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: roles.verified.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.UseApplicationCommands,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak
        ]
      },
      support,
      developer,
      management,
      owner,
      muted
    ];
  }
  if (access === 'staff' || access === 'tickets') {
    return [
      { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
      support,
      developer,
      management,
      owner,
      muted
    ];
  }
  return [
    { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
    owner,
    { id: roles.management.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: roles.developer.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: roles.support.id, deny: [PermissionFlagsBits.ViewChannel] }
  ];
}

async function ensureCategory(guild, spec, roles) {
  const names = new Set([spec.name, ...(spec.legacyNames || [])]);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && names.has(channel.name));
  const overwrites = categoryPermissions(guild, roles, spec.access);
  if (!existing) {
    return guild.channels.create({
      name: spec.name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwrites,
      reason: SETUP_REASON
    });
  }
  if (existing.name !== spec.name) await existing.setName(spec.name, SETUP_REASON);
  await existing.permissionOverwrites.set(overwrites, SETUP_REASON);
  return existing;
}

const SUPPORT_CHANNEL_TOPICS = Object.freeze({
  welcome: 'Official NEXA welcome and onboarding information.',
  rules: 'Official NEXA Support server rules and safety requirements.',
  verification: 'Verify your account to unlock community channels.',
  language: 'Choose English or Hungarian and notification roles.',
  announcements: 'Official NEXA service announcements.',
  updates: 'Release notes, product changes and beta updates.',
  status: 'NEXA bot, web, database and service status.',
  about: 'What NEXA Bot is and what it manages.',
  features: 'NEXA platform capability overview.',
  guide: 'Start here when configuring NEXA Bot for a server.',
  commands: 'Important slash commands and command help.',
  dashboard: 'Web dashboard access and configuration guidance.',
  links: 'Official NEXA links only.',
  faq: 'Frequently asked questions and common fixes.',
  ticketPanel: 'Open a private NEXA Support ticket.',
  help: 'General public help. Use a private ticket for sensitive cases.',
  bugs: 'Public bug reporting without tokens, secrets or personal data.',
  suggestions: 'Product suggestions and feature requests.',
  feedback: 'Community feedback about NEXA Bot and support.',
  general: 'General NEXA community chat.',
  hungarianChat: 'Hungarian-language community chat.',
  showcase: 'Community server showcase under the published rules.',
  botCommands: 'Safe public bot command testing.',
  giveaway: 'Official NEXA giveaways and results.',
  staffChat: 'Private NEXA Support Team coordination.',
  staffTasks: 'Private operational task board for NEXA staff.',
  ticketLogs: 'Ticket lifecycle and transcript log.',
  moderationLogs: 'Moderation audit log.',
  securityLogs: 'Security, Anti-Raid and Anti-Nuke event log.',
  errorLogs: 'Internal error and incident log.',
  memberLogs: 'Member join, leave and identity event log.',
  reports: 'Internal escalations and staff reports.',
  staffAnnouncements: 'Draft and review announcements before publishing.',
  discordUpdates: 'Discord platform and community-system updates.',
  ownerCenter: 'Private NEXA owner coordination. Web Owner Center access is separately controlled.',
  ownerLogs: 'Owner-only audit events.',
  criticalAlerts: 'Critical NEXA infrastructure and security alerts.',
  developerTest: 'Private controlled testing for new NEXA features.'
});

async function ensureChannel(guild, category, channelSpec, roles) {
  const [key, name, mode, legacyNames = []] = channelSpec;
  const type = mode === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
  const names = new Set([name, ...legacyNames]);
  let channel = guild.channels.cache.find((item) => item.type === type && names.has(item.name));
  if (!channel) {
    channel = await guild.channels.create({ name, type, parent: category.id, reason: SETUP_REASON });
  } else {
    if (channel.name !== name) await channel.setName(name, SETUP_REASON);
    if (channel.parentId !== category.id) {
      await channel.setParent(category.id, { lockPermissions: true, reason: SETUP_REASON });
    }
  }
  await channel.lockPermissions().catch(() => null);
  if (type === ChannelType.GuildText && SUPPORT_CHANNEL_TOPICS[key] && channel.topic !== SUPPORT_CHANNEL_TOPICS[key]) {
    await channel.setTopic(SUPPORT_CHANNEL_TOPICS[key], SETUP_REASON).catch(() => null);
  }
  if (mode === 'readonly' && /SUPPORT/.test(category.name)) {
    await channel.permissionOverwrites.edit(roles.verified.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false,
      SendMessagesInThreads: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      AddReactions: false
    }, { reason: SETUP_REASON });
  }
  if (key === 'hungarianChat') {
    await channel.permissionOverwrites.edit(roles.verified.id, {
      ViewChannel: false
    }, { reason: SETUP_REASON });
    await channel.permissionOverwrites.edit(roles.hungarian.id, {
      ViewChannel: true,
      SendMessages: true,
      SendMessagesInThreads: true,
      ReadMessageHistory: true,
      EmbedLinks: true,
      AttachFiles: true,
      AddReactions: true
    }, { reason: SETUP_REASON });
  }
  return [key, channel];
}

function infoEmbed(title, description, color = COLORS.primary, fields = []) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .addFields(fields)
    .setFooter({ text: MANAGED_FOOTER })
    .setTimestamp();
}

function publicRoot() {
  return dashboardUrl().replace(/\/dashboard\/?$/, '');
}

function legacyStaticPanels() {
  const root = publicRoot();
  return {
    welcome: [infoEmbed(
      '👋 Üdvözlünk a NEXA Bot hivatalos szerverén!',
      'Itt segítséget kérhetsz, hibát jelenthetsz, ötletet küldhetsz és követheted a NEXA Bot fejlesztését.\n\n**Kezdés:**\n1. Olvasd el a `📜・szabályzat` csatornát.\n2. Ellenőrizd magad a `✅・ellenőrzés` csatornában.\n3. Válaszd ki a nyelvedet a `🌐・nyelvválasztás` csatornában.\n4. Ha segítség kell, nyiss ticketet a `🎫・ticket-nyitás` csatornában.\n\n🇬🇧 Read the rules, verify yourself, select your language and open a ticket if you need assistance.'
    )],
    rules: [infoEmbed(
      '📜 NEXA Bot | Support — Szabályzat',
      '**1.** Tiszteld a tagokat és a munkatársakat. Zaklatás, gyűlöletbeszéd és személyeskedés tilos.\n\n' +
      '**2.** Tilos a spam, flood, indokolatlan pingelés és a beszélgetések szándékos zavarása.\n\n' +
      '**3.** Reklámot, meghívót vagy külső linket csak engedéllyel küldhetsz.\n\n' +
      '**4.** Tilos kártékony, csaló, NSFW vagy jogellenes tartalom megosztása.\n\n' +
      '**5.** Ne adj ki tokent, API-kulcsot, jelszót vagy más bizalmas adatot. A staff soha nem kéri ezeket.\n\n' +
      '**6.** Hibajelentésnél adj pontos leírást, és csak személyes adat nélküli képet vagy naplórészletet küldj.\n\n' +
      '**7.** A ticketeket rendeltetésszerűen használd; az indokolatlan vagy ismételt ticketnyitás büntethető.\n\n' +
      '**8.** Ne próbáld kijátszani a bot védelmét, jogosultságait vagy korlátozásait.\n\n' +
      '**9.** Tartsd be a Discord Felhasználási feltételeit és Közösségi irányelveit.\n\n' +
      '**10.** Staffintézkedés ellen kulturáltan, ticketben kérhetsz felülvizsgálatot.\n\n' +
      '🇬🇧 Be respectful, do not spam, advertise, share harmful content or expose secrets. Use tickets responsibly and follow Discord rules.\n\n' +
      '**A szerveren maradással elfogadod a szabályzatot.**',
      COLORS.warning
    )],
    announcements: [infoEmbed('📢 Hivatalos bejelentések', 'Ebben a csatornában jelennek meg a NEXA Bot fontos hírei, karbantartásai és szolgáltatási közleményei. Az értesítésekhez válaszd a `📢 Értesítések` rangot a nyelvválasztó panelen.')],
    updates: [infoEmbed('📰 NEXA frissítések', 'Az új verziók változáslistája, biztonsági javításai és új funkciói itt jelennek meg. A bétatesztekhez válaszd a `🧪 Béta értesítések` rangot.')],
    status: [infoEmbed('📊 NEXA rendszerállapot', '🟢 **Discord bot:** online\n🟢 **Webes dashboard:** elérhető\n🟢 **Owner Center:** védett\n\nÉlő állapot és kezelőfelület: ' + root, COLORS.success)],
    about: [infoEmbed('🤖 Ismerd meg a NEXA Botot', 'A **NEXA Bot** egy magyar alapértelmezésű, angolra is átváltható Discord-kezelőplatform. Moderációt, automatikus védelmet, ticketeket, naplózást, közösségi funkciókat és modern webes kezelőfelületet biztosít több szerver számára.\n\n🇬🇧 NEXA Bot is a multilingual Discord management platform with moderation, security, tickets, logging, community tools and a modern web dashboard.')],
    features: [infoEmbed('✨ Mit tud a NEXA Bot?', '🛡️ Moderáció és ügyazonosítós naplózás\n🚨 Automod, anti-raid és anti-nuke védelem\n🎫 Kategóriás ticketek és HTML-transcript\n👋 Üdvözlés, búcsúzás és automatikus rangok\n🎭 Gombos és választómenüs rangok\n⭐ XP-, szint- és ranglistarendszer\n🎉 Nyereményjátékok\n🧩 Egyedi parancsok\n📊 Részletes esemény- és biztonsági naplók\n✨ NEXA AI engedélyhez kötve\n🌐 Szerverenkénti webes kezelőfelület\n👑 Elkülönített Owner Center')],
    guide: [infoEmbed('📖 Gyors kezdés', '**1.** Hívd meg a botot a hivatalos linkkel.\n**2.** A NEXA rangját helyezd a kezelendő rangok fölé.\n**3.** Használd a `/beallitas` parancsot.\n**4.** Válaszd ki a szerveredet a webes kezelőfelületen.\n**5.** Kapcsold be a szükséges modulokat, és válaszd ki a csatornákat és rangokat.\n**6.** Teszteld a beállításokat egy normál taggal.')],
    commands: [infoEmbed('⌨️ Fontos parancsok', '`/help` – interaktív súgó\n`/beallitas` – webes kezelőfelület\n`/ban`, `/kick`, `/timeout`, `/warn` – moderáció\n`/hitelesites panel` – ellenőrzőpanel\n`/rangpanel` – választható rangok\n`/nyeremenyjatek` – nyereményjáték\n`/nexa kerdes` – NEXA AI, ha engedélyezve van\n`/vedelem statusz` – védelem állapota\n\nA teljes lista a `/help` paranccsal érhető el.')],
    dashboard: [infoEmbed('🧭 Webes kezelőfelület', `A szerver beállításait a NEXA webes dashboardján kezelheted:\n\n${root}/dashboard\n\nDiscorddal jelentkezz be, majd válaszd ki azt a szervert, amelynek tulajdonosa vagy, vagy ahol megfelelő kezelési jogosultságod van.`)],
    links: [infoEmbed('🔗 Hivatalos NEXA linkek', `🌐 **Weboldal:** ${root}\n🧭 **Dashboard:** ${root}/dashboard\n🤖 **Bot meghívása:** ${inviteUrl()}\n📜 **Adatvédelem:** ${root}/privacy\n⚖️ **Felhasználási feltételek:** ${root}/terms\n\nCsak az itt közzétett hivatkozások tekinthetők hivatalosnak.`)],
    faq: [infoEmbed('❓ Gyakori kérdések', '**Hol állíthatom be a botot?**\nA `/beallitas` paranccsal megnyitható webes dashboardon.\n\n**Miért nem látom a szerveremet?**\nCsak azt látod, ahol megfelelő jogosultságod van, és a NEXA Bot is bent van.\n\n**Miért nem működik egy moderációs művelet?**\nA NEXA rangjának a kezelendő tag rangja fölött kell lennie.\n\n**Elkérheti a staff a tokenemet?**\nNem. Tokent, API-kulcsot vagy jelszót soha ne adj át senkinek.')],
    help: [infoEmbed('🧩 Segítségkérés használata', 'Rövid, általános kérdéseket itt is feltehetsz. Összetett, biztonsági vagy személyes adatot érintő ügyhöz nyiss privát ticketet.\n\nÍrd le: mit szerettél volna csinálni, mi történt helyette, melyik funkció érintett, és van-e hibaazonosító.')],
    bugs: [infoEmbed('🐞 Hibajelentés sablon', '**Hiba rövid neve:**\n**Érintett funkció:**\n**Mi történt:**\n**Mit vártál helyette:**\n**Megismétlés lépései:**\n**Szerverazonosító:**\n**Időpont:**\n**Kép vagy hibaazonosító:**\n\n⚠️ Tokent, API-kulcsot, jelszót és személyes adatot ne küldj!')],
    suggestions: [infoEmbed('💡 Ötletküldési sablon', '**Ötlet neve:**\n**Milyen problémát oldana meg:**\n**Hogyan működjön:**\n**Kik használnák:**\n**Opcionális kép vagy példa:**\n\nA tagok kulturáltan értékelhetik és továbbfejleszthetik az ötletet.')],
    feedback: [infoEmbed('⭐ Visszajelzések', 'Írd le, melyik NEXA funkciót használtad, mi működött jól, min lehetne javítani, és hány pontot adnál 1–5 között. Személyes adatot vagy bizalmas naplót ne ossz meg nyilvánosan.')],
    general: [infoEmbed('💬 NEXA közösség', 'Beszélgess kulturáltan a botról, Discord-szerverekről és közösségépítésről. A segítségkéréseket a támogatási csatornákba küldd.')],
    english: [infoEmbed('🌍 English chat', 'Welcome to the English NEXA community channel. Ask general questions here or open a private ticket for account, security or server-specific support.')],
    showcase: [infoEmbed('🖼️ Szerverbemutatók szabályai', 'Saját Discord-szerveredet csak rövid leírással, legfeljebb egy meghívóval és naponta legfeljebb egyszer mutathatod be. Tiltott vagy megtévesztő szerver reklámozása azonnali törlést von maga után.')],
    botCommands: [infoEmbed('🤖 Botparancsok', 'A publikus NEXA parancsokat ebben a csatornában próbálhatod ki. Ne spamelj, és ne indíts moderációs vagy biztonsági tesztet engedély nélkül.')],
    giveaway: [infoEmbed('🎉 Nyereményjátékok', 'A hivatalos NEXA nyereményjátékok itt jelennek meg. A bot vagy a staff soha nem kér jelszót, tokent vagy előzetes fizetést egy nyeremény átvételéhez.')],
    staffChat: [infoEmbed('🔒 Staff működési szabályzat', '1. Minden tagot pártatlanul és tisztelettel kezelünk.\n2. Bizalmas ticketet vagy naplót nem osztunk meg illetéktelennel.\n3. Intézkedéshez pontos indok és szükség esetén bizonyíték kell.\n4. Jogosultságot csak a feladathoz szükséges mértékben használunk.\n5. Biztonsági eseményt azonnal jelezni kell a Vezetőségnek.\n6. Tokent, API-kulcsot és személyes adatot tilos staffcsatornába másolni.\n7. Kétséges ügyben intézkedés előtt vezetői segítséget kérünk.', COLORS.danger)],
    staffTasks: [infoEmbed('📋 Staff feladatsablon', '**Feladat:**\n**Felelős:**\n**Prioritás:** alacsony / közepes / magas / kritikus\n**Határidő:**\n**Állapot:** tervezett / folyamatban / ellenőrzés / kész\n**Megjegyzés:**')],
    reports: [infoEmbed('📨 Belső jelentések', 'Ide kerüljenek a staff által továbbított visszaélések, biztonsági és moderációs esetek. Minden bejegyzés tartalmazza az érintett felhasználó azonosítóját, az időpontot, a rövid tényállást és az ellenőrizhető bizonyítékot.')],
    staffAnnouncements: [infoEmbed('📢 Közleménykészítés', 'A közleményt közzététel előtt ellenőrizze egy vezető. Legyen benne egyértelmű cím, rövid összefoglaló, pontos időpont és szükség esetén az értesítendő rang. A kész közlemény a `📢・bejelentések` csatornába kerül.')],
    ownerCenter: [infoEmbed('👑 NEXA Owner Center', `A globális Owner Center kizárólag a bot elsődleges tulajdonosának és az általa külön engedélyezett kezelőknek érhető el.\n\nMegnyitás: ${root}/owner\n\nAz Owner jogosultságot ne helyettesítsd hagyományos Discord-ranggal.`, COLORS.warning)],
    developerTest: [infoEmbed('🧪 Fejlesztői tesztcsatorna', 'Új panelek és parancsok ellenőrzése itt történjen. Éles moderációs, raid- vagy anti-nuke tesztet csak külön tesztszerveren végezz!')]
  };
}

function staticPanels() {
  const root = publicRoot();
  return {
    welcome: [infoEmbed(
      '👋 Welcome to the official NEXA Bot server!',
      'Get support, report bugs, submit ideas and follow NEXA Bot development here.\n\n**Start here:**\n1. Read `📜・rules`.\n2. Verify yourself in `✅・verification`.\n3. Choose your language and notification roles in `🌐・language-selection`.\n4. Open a private ticket in `🎫・open-ticket` when you need help.\n\n🇭🇺 Hungarian remains available from the language selector and in `🇭🇺・hungarian-chat`.'
    )],
    rules: [infoEmbed(
      '📜 NEXA Bot | Support — Rules',
      '**1.** Treat every member and staff member with respect. Harassment, hate speech and personal attacks are prohibited.\n\n' +
      '**2.** Spam, flooding, unnecessary mentions and intentionally disrupting conversations are prohibited.\n\n' +
      '**3.** Advertising, invites and external links require staff permission.\n\n' +
      '**4.** Malicious, fraudulent, NSFW or illegal content is strictly prohibited.\n\n' +
      '**5.** Never share tokens, API keys, passwords or other secrets. NEXA staff will never ask for them.\n\n' +
      '**6.** Bug reports must include accurate details without exposing personal or confidential information.\n\n' +
      '**7.** Use tickets responsibly. Duplicate or abusive tickets may result in moderation.\n\n' +
      '**8.** Do not attempt to bypass bot protections, permissions or restrictions.\n\n' +
      '**9.** Follow the Discord Terms of Service and Community Guidelines.\n\n' +
      '**10.** Staff actions may be appealed respectfully through a private ticket.\n\n' +
      '**By remaining on this server, you agree to these rules.**',
      COLORS.warning
    )],
    announcements: [infoEmbed('📢 Official announcements', 'Important NEXA Bot news, maintenance notices and service announcements appear here. Select the `📢 Announcements` role in the language and roles panel to receive notifications.')],
    updates: [infoEmbed('📰 NEXA updates', 'Release notes, security fixes and newly released features are published here. Select `🧪 Beta Updates` if you want beta notifications.')],
    status: [infoEmbed('📊 NEXA system status', `🟢 **Discord bot:** online\n🟢 **Web dashboard:** available\n🟢 **Owner Center:** protected\n\nLive website and dashboard: ${root}`, COLORS.success)],
    about: [infoEmbed('🤖 About NEXA Bot', 'NEXA Bot is a multilingual Discord management platform for community, gaming, support, creator and large public servers. It combines moderation, security, tickets, logging, community tools and a modern web dashboard. English is the default language; Hungarian remains available.')],
    features: [infoEmbed('✨ NEXA Bot features', '🛡️ Moderation with persistent Case IDs\n🚨 Automod, anti-raid and anti-nuke protection\n🎫 Category-based tickets and HTML transcripts\n👋 Welcome, goodbye and automatic roles\n🎭 Button and select-menu role panels\n⭐ XP, levels and leaderboards\n🎉 Giveaways\n🧩 Custom commands\n📊 Detailed event and security logs\n✨ Permission-controlled NEXA AI\n🌐 Per-server web dashboard\n👑 Isolated Owner Center')],
    guide: [infoEmbed('📖 Getting started', '**1.** Invite NEXA Bot using the official link.\n**2.** Move the NEXA Bot role above every role it must manage.\n**3.** Run `/beallitas` to open the dashboard.\n**4.** Select your server.\n**5.** Enable the required modules and select their channels and roles.\n**6.** Test the configuration using a normal member account.')],
    commands: [infoEmbed('⌨️ Important commands', '`/help` — interactive help\n`/beallitas` — web dashboard\n`/ban`, `/kick`, `/timeout`, `/warn` — moderation\n`/hitelesites panel` — verification panel\n`/rangpanel` — self-role panel\n`/nyeremenyjatek` — giveaway\n`/nexa kerdes` — NEXA AI when enabled\n`/vedelem statusz` — security status\n\nUse `/help` for the complete command browser.')],
    dashboard: [infoEmbed('🧭 Web dashboard', `Manage each server through the NEXA dashboard:\n\n${root}/dashboard\n\nSign in with Discord, then select a server that you own or have permission to manage.`)],
    links: [infoEmbed('🔗 Official NEXA links', `🌐 **Website:** ${root}\n🧭 **Dashboard:** ${root}/dashboard\n🤖 **Invite NEXA Bot:** ${inviteUrl()}\n📜 **Privacy Policy:** ${root}/privacy\n⚖️ **Terms of Service:** ${root}/terms\n\nOnly links published here should be treated as official.`)],
    faq: [infoEmbed('❓ Frequently asked questions', '**Where can I configure the bot?**\nOpen the web dashboard with `/beallitas`.\n\n**Why is my server missing?**\nYou only see servers where NEXA Bot is present and you have management permission.\n\n**Why did a moderation action fail?**\nThe NEXA Bot role must be above the affected member and role.\n\n**Will staff ever request my token?**\nNo. Never give anyone a token, API key or password.')],
    help: [infoEmbed('🧩 Asking for help', 'Use this channel for short, general questions. Open a private ticket for complex, security-sensitive or account-specific issues.\n\nInclude what you tried, what happened, what you expected, the affected feature and any safe error ID.')],
    bugs: [infoEmbed('🐞 Bug report template', '**Short title:**\n**Affected feature:**\n**What happened:**\n**Expected result:**\n**Steps to reproduce:**\n**Server ID:**\n**Date and time:**\n**Screenshot or error ID:**\n\n⚠️ Never include tokens, API keys, passwords or personal information.')],
    suggestions: [infoEmbed('💡 Suggestion template', '**Suggestion name:**\n**Problem it solves:**\n**How it should work:**\n**Who would use it:**\n**Optional screenshot or example:**\n\nMembers may discuss and improve suggestions respectfully.')],
    feedback: [infoEmbed('⭐ Feedback', 'Tell us which NEXA feature you used, what worked well, what could improve and your rating from 1 to 5. Do not post personal data or confidential logs publicly.')],
    general: [infoEmbed('💬 NEXA community', 'The main community language is English. Discuss NEXA Bot, Discord servers and community management respectfully. Use the support channels for help requests.')],
    hungarianChat: [infoEmbed('🇭🇺 Magyar közösségi chat', 'Ebben a csatornában magyarul beszélgethetsz és kérhetsz általános segítséget. A privát vagy biztonsági ügyekhez nyiss ticketet. A `🇭🇺 Magyar` rang továbbra is kiválasztható a nyelvválasztó panelen.')],
    showcase: [infoEmbed('🖼️ Server showcase rules', 'You may showcase your own Discord server with a short description and no more than one invite, at most once per day. Prohibited or deceptive servers are removed immediately.')],
    botCommands: [infoEmbed('🤖 Bot commands', 'Test public NEXA commands here. Do not spam and never run moderation, raid or anti-nuke tests without explicit authorization.')],
    giveaway: [infoEmbed('🎉 Giveaways', 'Official NEXA giveaways appear here. The bot and staff will never request a password, token or advance payment to deliver a prize.')],
    staffChat: [infoEmbed('🔒 Staff operating policy', '1. Treat every member impartially and respectfully.\n2. Never share confidential tickets or logs with unauthorized people.\n3. Every action requires a clear reason and evidence when appropriate.\n4. Use permissions only for assigned duties.\n5. Report security incidents to Management immediately.\n6. Never paste tokens, API keys or personal data into staff channels.\n7. Ask Management before acting when a case is unclear.', COLORS.danger)],
    staffTasks: [infoEmbed('📋 Staff task template', '**Task:**\n**Owner:**\n**Priority:** low / medium / high / critical\n**Deadline:**\n**Status:** planned / in progress / review / completed\n**Notes:**')],
    reports: [infoEmbed('📨 Internal reports', 'Use this channel for staff escalations involving abuse, moderation and security. Include the affected user ID, exact time, a concise factual summary and verifiable evidence.')],
    staffAnnouncements: [infoEmbed('📢 Announcement drafts', 'A manager must review announcements before publication. Include a clear title, concise summary, exact time and the notification role when needed. Publish approved posts in `📢・announcements`.')],
    ownerCenter: [infoEmbed('👑 NEXA Owner Center', `The global Owner Center is restricted to the primary bot owner and explicitly authorized operators.\n\nOpen: ${root}/owner\n\nOwner access must never be replaced with a normal Discord role.`, COLORS.warning)],
    developerTest: [infoEmbed('🧪 Developer test channel', 'Test new panels and commands here. Run live moderation, raid or anti-nuke tests only on a separate authorized test server.')]
  };
}

async function clearManagedMessages(channel, botId) {
  if (!channel?.isTextBased()) return;
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return;
  const managed = messages.filter((message) =>
    message.author.id === botId && message.embeds.some((embed) => LEGACY_MANAGED_FOOTERS.has(embed.footer?.text))
  );
  for (const message of managed.values()) await message.delete().catch(() => null);
}

async function sendStaticPanel(channel, embeds, botId) {
  if (!channel?.isTextBased() || !embeds?.length) return 0;
  await clearManagedMessages(channel, botId);
  for (const embed of embeds) await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  return embeds.length;
}

async function replaceInteractivePanel(channel, botId, matcher, payload) {
  if (!channel?.isTextBased()) return 0;
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const old = messages?.filter((message) => message.author.id === botId && matcher(message));
  if (old) for (const message of old.values()) await message.delete().catch(() => null);
  const message=await channel.send({ ...payload, allowedMentions: { parse: [] } });
  await require('./platform-panels').register(channel,message,payload);
  return 1;
}

async function publishSupportPanels(guild, channels, roles, botUser) {
  const panels = staticPanels();
  let published = 0;
  for (const [key, embeds] of Object.entries(panels)) {
    if (channels[key]) published += await sendStaticPanel(channels[key], embeds, botUser.id);
  }
  published += await replaceInteractivePanel(
    channels.verification,
    botUser.id,
    (message) => message.components.some((row) => row.components.some((component) => component.customId === 'engagement_verify')),
    verificationPanel('en')
  );
  published += await replaceInteractivePanel(
    channels.language,
    botUser.id,
    (message) => message.components.some((row) => row.components.some((component) => component.customId === 'community_self_roles')),
    rolePanel(guild, [roles.hungarian.id, roles.english.id, roles.announcements.id, roles.beta.id], 'select')
  );
  published += await replaceInteractivePanel(
    channels.ticketPanel,
    botUser.id,
    (message) => message.components.some((row) => row.components.some((component) => ['support_ticket_category_select', 'support_ticket_open'].includes(component.customId))),
    supportTicketPanel('en')
  );
  return published;
}

async function applyRolePositions(guild, roles) {
  const botTop = guild.members.me?.roles.highest.position || guild.roles.highest.position;
  const ordered = SUPPORT_ROLES.map((spec) => roles[spec.key]).filter(Boolean);
  const positions = ordered.map((role, index) => ({ role, position: Math.max(1, botTop - index - 1) }));
  await guild.roles.setPositions(positions).catch(() => null);
}

function ciaRoleBySpec(guild, spec) {
  const storedId = getGuildConfig(guild.id).installations?.cia?.roles?.[spec.key];
  const stored = storedId ? guild.roles.cache.get(storedId) : null;
  if (stored && !stored.managed) return stored;
  const names = new Set([spec.name, ...(spec.legacyNames || [])]);
  return guild.roles.cache.find((role) => names.has(role.name) && !role.managed);
}

async function ensureCiaRole(guild, spec) {
  const existing = ciaRoleBySpec(guild, spec);
  const data = {
    name: spec.name,
    color: spec.color,
    hoist: Boolean(spec.hoist),
    mentionable: Boolean(spec.mentionable),
    permissions: spec.permissions,
    reason: CIA_SETUP_REASON
  };
  if (!existing) return guild.roles.create(data);
  return existing.edit(data);
}

function ciaRoleAccess(roleId, options = {}) {
  const allow = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.UseApplicationCommands,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak
  ];
  if (options.write !== false) {
    allow.push(
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.AddReactions
    );
  }
  return {
    id: roleId, allow,
    ...(options.write === false ? { deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.AddReactions] } : {})
  };
}

function ciaCategoryRoleKeys(access) {
  const leadership = ['operationsCommander', 'directorateHead', 'chiefOfStaff', 'deputy', 'director'];
  const specialists = ['seniorAgent', 'specialAgent', 'intelligenceOfficer', 'fieldAgent', 'collectionOfficer', 'specializedOfficer', 'paramilitaryOfficer', 'analyst', 'technicalOfficer', 'systemsOfficer', 'supportOfficer'];
  const divisions = ['analysisDivision', 'scienceDivision', 'systemsDivision', 'supportDivision'];
  if (access === 'verified' || access === 'verified-readonly') {
    return ['verified', 'candidate', 'trainee', ...specialists, ...divisions, ...leadership];
  }
  if (access === 'personnel') {
    return ['trainee', ...specialists, ...divisions, ...leadership];
  }
  if (access === 'operations') {
    return ['fieldAgent', 'intelligenceOfficer', 'specialAgent', 'seniorAgent', 'collectionOfficer', 'specializedOfficer', 'paramilitaryOfficer', ...leadership];
  }
  if (access === 'classified') {
    return ['fieldAgent', 'intelligenceOfficer', 'specialAgent', 'seniorAgent', 'collectionOfficer', 'analyst', ...leadership];
  }
  if (access === 'analysis') return ['analyst', 'analysisDivision', ...leadership];
  if (access === 'science') return ['technicalOfficer', 'scienceDivision', ...leadership];
  if (access === 'systems') return ['systemsOfficer', 'systemsDivision', ...leadership];
  if (access === 'support') return ['supportOfficer', 'supportDivision', ...leadership];
  if (access === 'leadership') return leadership;
  if (access === 'executive') return ['deputy', 'director'];
  if (access === 'tickets') return leadership;
  return [];
}

function ciaCategoryPermissions(guild, roles, access) {
  const everyone = guild.roles.everyone.id;
  const suspended = {
    id: roles.suspended.id,
    deny: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak
    ]
  };
  const leadership = ['operationsCommander', 'directorateHead', 'chiefOfStaff', 'deputy', 'director']
    .map((key) => ciaRoleAccess(roles[key].id));
  if (access === 'public-readonly') {
    return [
      {
        id: everyone,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.UseApplicationCommands],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads]
      },
      ...leadership,
      suspended
    ];
  }
  const roleKeys = ciaCategoryRoleKeys(access);
  return [
    { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
    ...roleKeys.map((key) => ciaRoleAccess(roles[key].id, { write: access !== 'verified-readonly' || ['operationsCommander', 'directorateHead', 'chiefOfStaff', 'deputy', 'director'].includes(key) })),
    suspended
  ];
}

async function ensureCiaCategory(guild, spec, roles) {
  const storedId = getGuildConfig(guild.id).installations?.cia?.categories?.[spec.key];
  let category = storedId ? guild.channels.cache.get(storedId) : null;
  if (category?.type !== ChannelType.GuildCategory) category = null;
  category ||= guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === spec.name);
  const permissionOverwrites = ciaCategoryPermissions(guild, roles, spec.access);
  if (!category) {
    category = await guild.channels.create({
      name: spec.name,
      type: ChannelType.GuildCategory,
      permissionOverwrites,
      reason: CIA_SETUP_REASON
    });
  } else {
    if (category.name !== spec.name) await category.setName(spec.name, CIA_SETUP_REASON);
    await category.permissionOverwrites.set(permissionOverwrites, CIA_SETUP_REASON);
  }
  return category;
}

async function ensureCiaChannel(guild, category, categorySpec, channelSpec, roles) {
  const [key, name, mode, legacyNames = []] = channelSpec;
  const type = mode === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
  const storedId = getGuildConfig(guild.id).installations?.cia?.channels?.[key];
  let channel = storedId ? guild.channels.cache.get(storedId) : null;
  if (channel?.type !== type) channel = null;
  const names = new Set([name, ...legacyNames]);
  channel ||= guild.channels.cache.find((item) => item.type === type && names.has(item.name) && item.parentId === category.id);
  if (!channel && key === 'systemControl') {
    channel = guild.channels.cache.find((item) => item.type === type && names.has(item.name) && [ciaInstallationMarker(guild.id), `NEXA_CIA_INSTALLATION_V1:${guild.id}`, `NEXA_CIA_INSTALLATION_V2:${guild.id}`].some((marker) => String(item.topic || '').includes(marker)));
  }
  if (!channel) {
    channel = await guild.channels.create({ name, type, parent: category.id, reason: CIA_SETUP_REASON });
  } else {
    if (channel.name !== name) await channel.setName(name, CIA_SETUP_REASON);
    if (channel.parentId !== category.id) await channel.setParent(category.id, { lockPermissions: true, reason: CIA_SETUP_REASON });
  }
  if (type === ChannelType.GuildText && mode === 'readonly') {
    const readonlyIds = new Set(ciaCategoryRoleKeys(categorySpec.access)
      .filter((roleKey) => !['operationsCommander', 'directorateHead', 'chiefOfStaff', 'deputy', 'director'].includes(roleKey))
      .map((roleKey) => roles[roleKey].id));
    const denyWrites = [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.AddReactions];
    const overwrites = ciaCategoryPermissions(guild, roles, categorySpec.access).map((overwrite) => readonlyIds.has(overwrite.id) ? {
      ...overwrite,
      allow: (overwrite.allow || []).filter((permission) => !denyWrites.includes(permission)),
      deny: [...new Set([...(overwrite.deny || []), ...denyWrites])]
    } : overwrite);
    await channel.permissionOverwrites.set(overwrites, CIA_SETUP_REASON);
  } else {
    await channel.lockPermissions();
  }
  const topic = CIA_CHANNEL_TOPICS[key] || CIA_KNOWLEDGE_PANELS[key]?.[0] || `${name} • CIA RP munkaterület`;
  if (type === ChannelType.GuildText && key !== 'systemControl' && channel.topic !== topic) {
    await channel.setTopic(topic, CIA_SETUP_REASON);
  }
  return [key, channel];
}

async function applyCiaRolePositions(guild, roles) {
  const botTop = guild.members.me?.roles.highest.position || guild.roles.highest.position;
  const positions = CIA_ROLES
    .map((spec, index) => roles[spec.key] ? ({ role: roles[spec.key], position: Math.max(1, botTop - index - 1) }) : null)
    .filter(Boolean);
  await guild.roles.setPositions(positions);
}

function ciaInfoEmbed(title, description, color = COLORS.primary, fields = []) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .addFields(fields)
    .setFooter({ text: CIA_PANEL_FOOTER })
    .setTimestamp();
}

function ciaStaticPanels() {
  const panels = {
    welcome: [ciaInfoEmbed('🕵️ CIA Frakcióközpont', 'Üdvözlünk a CIA RP frakció hivatalos Discord-központjában. Olvasd el a szabályzatot, végezd el az ellenőrzést, majd használd a számodra engedélyezett szolgálati területeket.')],
    rules: [ciaInfoEmbed('📜 CIA szolgálati szabályzat', '**1.** A szolgálati utat és a rangsort minden helyzetben be kell tartani.\n**2.** Minősített információ illetéktelen személynek nem adható át.\n**3.** Minden intézkedéshez tényszerű indoklás és ellenőrizhető dokumentáció szükséges.\n**4.** A jogkörrel való visszaélés, bizonyítékhamisítás és metagaming tilos.\n**5.** Műveleti információt kizárólag a kijelölt csatornákban lehet megosztani.\n**6.** A NEXA biztonsági és naplórendszerének kijátszása azonnali felfüggesztést eredményezhet.', COLORS.warning)],
    announcements: [ciaInfoEmbed('📢 Hivatalos CIA-közlemények', 'A vezetőség jóváhagyott közleményei és szolgálati értesítései jelennek meg itt. Az értesítéshez válaszd ki a megfelelő rangot az értesítési panelen.')],
    recruitmentInfo: [ciaInfoEmbed('🕵️ Felvételi tájékoztató', 'A jelentkezést a `📝・jelentkezés` csatornában indíthatod. Válaszolj részletesen és saját szavaiddal. A bírálat vak eljárásban történik, az eredményről a bot privát üzenetet küld.')],
    handbook: [ciaInfoEmbed('📘 Állományi kézikönyv', 'A szolgálat megkezdése előtt ellenőrizd a rangodat, a kijelölt feladatodat, a hívójeledet és a szükséges felszerelést. Minden műveletet eligazítás, végrehajtás, jelentés és lezárás követ.')],
    hierarchy: [ciaInfoEmbed('🔰 Szolgálati hierarchia', '**Vezetési lánc:** Director of the CIA (D/CIA) → Deputy Director of the CIA (DD/CIA) → Executive Director (EXDIR) → Deputy Director for Operations (DDO) → Chief of Station (COS) → Deputy Chief of Station (DCOS).\n\n**Szakmai beosztások:** Case Officer (CO), Targeting Officer (TO), Staff Operations Officer (SOO), Professional Trainee (PT). A CIA a valóságban nem katonai rendfokozatokat, hanem vezetői és szakmai beosztásokat használ.')],
    ranks: [ciaInfoEmbed('🎖️ Beosztások és hatáskörök', 'Az angol elnevezések a valódi CIA nyilvános vezetői és Directorate of Operations beosztásaihoz igazodnak. A NEXA hozzáférési sorrendje a szerver működéséhez szükséges RP-jogosultsági rend; nem állítja, hogy a szakmai munkakörök a valóságban katonai rangsort alkotnak.')],
    radioCodes: [ciaInfoEmbed('📻 Rádiófegyelem', 'Használj rövid, tényszerű közléseket: egység/hívójel, helyszín, esemény, szükséges intézkedés. Minősített adatot nyilvános rádión ne közölj.')],
    equipment: [ciaInfoEmbed('🧰 Felszerelési rend', 'Csak a feladathoz és ranghoz engedélyezett felszerelés használható. Az átvételt, elvesztést és rendkívüli felhasználást dokumentálni kell.')],
    protocols: [ciaInfoEmbed('📑 Általános eljárásrend', 'Minden ügyet a legkisebb szükséges jogosultsággal kezelj. Rögzítsd az időpontot, résztvevőket, tényeket, bizonyítékokat, döntést és a további teendőt.')],
    trainingMaterial: [ciaInfoEmbed('📚 Kiképzési központ', 'A képzés részei: szolgálati rend, rádiózás, bizonyítékkezelés, jelentésírás, műveleti biztonság és gyakorlati vizsga.')],
    briefings: [ciaInfoEmbed('🗺️ Műveleti eligazítás', 'Az eligazítás tartalmazza a célt, hatáskört, felelős vezetőt, egységeket, kommunikációs tervet, kockázatokat és a megszakítás feltételeit.', COLORS.warning)],
    directorOffice: [ciaInfoEmbed('👑 CIA vezetői vezérlőközpont', 'A CIA-rendszer kizárólag Discordon, a botowner parancsaival kezelhető. Az újratelepítés kizárólag a fő botowner művelete.', COLORS.warning)]
  };
  for (const [key, [title, description]] of Object.entries(CIA_KNOWLEDGE_PANELS)) {
    panels[key] = [ciaInfoEmbed(title, description)];
  }
  panels.ranks = [];
  for (let offset = 0; offset < CIA_ROLES.length; offset += 8) {
    panels.ranks.push(ciaInfoEmbed(
      `🎖️ CIA beosztások és hozzáférési rangok — ${Math.floor(offset / 8) + 1}`,
      'A vezetői, szakmai és szervezeti címkék eltérő szerepet töltenek be. Az alábbi hatáskörök a saját RP szerver szabályai.',
      COLORS.primary,
      CIA_ROLES.slice(offset, offset + 8).map((spec) => ({ name: spec.name, value: CIA_ROLE_DETAILS[spec.key] || 'Kijelölt RP munkakör.', inline: false }))
    ));
  }
  for (const category of CIA_CATEGORIES) {
    for (const [key, name, mode] of category.channels) {
      if (mode !== 'voice' && !panels[key]) {
        panels[key] = [ciaInfoEmbed(name, `${CIA_CHANNEL_TOPICS[key] || 'A kijelölt CIA RP terület feladatai és bejegyzései.'}\n\n${mode === 'readonly' ? 'A szobát a bot vagy az illetékes vezetőség frissíti. A kapcsolódó kérdést az ügyintézésben jelezd.' : 'Használj ügyazonosítót, időpontot és tényszerű, játékbeli leírást. A témához kapcsolódó bejegyzéseket ide küldd.'}`)];
      }
    }
  }
  return panels;
}

async function clearCiaManagedMessages(channel, botId) {
  if (!channel?.isTextBased()) return;
  const messages = await channel.messages.fetch({ limit: 50 });
  const managed = messages.filter((message) => message.author.id === botId && message.embeds.some((embed) => [CIA_PANEL_FOOTER, CIA_LEGACY_PANEL_FOOTER].includes(embed.footer?.text)));
  for (const message of managed.values()) await message.delete();
}

async function sendCiaStaticPanel(channel, embeds, botId) {
  if (!channel?.isTextBased() || !embeds?.length) return 0;
  await clearCiaManagedMessages(channel, botId);
  for (const embed of embeds) await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  return embeds.length;
}

function ciaApplicationTemplate(channels, roles) {
  return {
    key: 'tgf_cia_felvetel',
    title: 'CIA felvételi eljárás',
    emoji: '🕵️',
    description: 'Töltsd ki a CIA felvételi adatlapját. A válaszokat a vezetőség vak bírálatban értékeli.',
    openChannelId: channels.application.id,
    reviewChannelId: channels.reviewFiles.id,
    resultChannelId: channels.applicationResults.id,
    accessRoleId: null,
    reviewerRoleId: roles.directorateHead.id,
    acceptedRoleId: roles.trainee.id,
    notificationRoleId: roles.announcements.id,
    blindReview: true,
    active: true,
    cooldownHours: 72,
    questions: [
      'Miért szeretnél a CIA frakcióhoz csatlakozni?',
      'Mit jelent számodra a szolgálati hierarchia?',
      'Mit tennél, ha egy magasabb rangú személy szabályellenes utasítást adna?',
      'Hogyan kezelnél egy bizalmas információ kiszivárgását?',
      'Mit tennél, ha szolgálat közben jogkörrel való visszaélést látnál?',
      'Hogyan dokumentálnál egy összetett műveletet?',
      'Miért fontos a bizonyítékok sértetlensége?',
      'Hogyan oldanál fel egy állományon belüli konfliktust?',
      'Milyen korábbi RP- vagy rendvédelmi tapasztalatod van?',
      'Miért gondolod, hogy alkalmas vagy a CIA állományába?'
    ].map((label, index) => ({
      id: `question_${index + 1}`,
      label,
      placeholder: 'Írj részletes, saját megfogalmazású választ.',
      required: true,
      maxLength: 1000
    }))
  };
}

function ciaDocumentTypes(channels, roles) {
  const field = (label, placeholder, style = 'paragraph', required = true) => ({ label, placeholder, style, required, maxLength: style === 'paragraph' ? 1000 : 200 });
  return [
    {
      key: 'custom_muvelet', title: 'CIA műveleti jelentés', emoji: '📄', channelId: channels.operationReports.id,
      approval: true, active: true, accessRoleId: roles.fieldAgent.id, notificationRoleId: roles.operationAlert.id, caseNumber: true, pingTarget: false,
      fields: [field('Művelet kódneve', 'Belső azonosító', 'short'), field('Időpont és helyszín', 'Mikor és hol történt?', 'short'), field('Résztvevő egységek', 'Hívójelek és feladatok'), field('Események időrendben', 'Tényszerű, részletes leírás'), field('Eredmény és további teendő', 'Bizonyítékok, kockázatok, javaslat')]
    },
    {
      key: 'custom_hirszer', title: 'Hírszerzési jelentés', emoji: '🔎', channelId: channels.intelligenceReports.id,
      approval: true, active: true, accessRoleId: roles.intelligenceOfficer.id, notificationRoleId: roles.directorateHead.id, caseNumber: true, pingTarget: false,
      fields: [field('Forrás és megbízhatóság', 'Forráskód és értékelés', 'short'), field('Érintett célpont', 'Személy, csoport vagy helyszín', 'short'), field('Megfigyelt tények', 'Ellenőrizhető információk'), field('Elemzés', 'Összefüggések és kockázatok'), field('Javasolt intézkedés', 'Következő lépések')]
    },
    {
      key: 'custom_kikepz', title: 'Kiképzési értékelés', emoji: '🎓', channelId: channels.trainingReports.id,
      approval: false, active: true, accessRoleId: roles.operationsCommander.id, notificationRoleId: null, caseNumber: false, pingTarget: true,
      fields: [field('Kiképzés megnevezése', 'Téma vagy gyakorlat', 'short'), field('Időpont', 'ÉÉÉÉ.HH.NN. ÓÓ:PP', 'short'), field('Teljesítmény', 'Erősségek és hibák'), field('Eredmény', 'Megfelelt / ismétlés szükséges', 'short'), field('Vezetői megjegyzés', 'Fejlesztési javaslat', 'paragraph', false)]
    },
    {
      key: 'custom_szabad', title: 'Szabadság- és távolléti kérelem', emoji: '🏖️', channelId: channels.leaveRequests.id,
      approval: true, active: true, accessRoleId: roles.trainee.id, notificationRoleId: roles.operationsCommander.id, caseNumber: false, pingTarget: false,
      fields: [field('Kezdő időpont', 'ÉÉÉÉ.HH.NN.', 'short'), field('Befejező időpont', 'ÉÉÉÉ.HH.NN.', 'short'), field('Indoklás', 'Rövid, szükséges részletek'), field('Átadott feladatok', 'Helyettesítés vagy nyitott feladat', 'paragraph', false)]
    },
    {
      key: 'custom_fegyelmi', title: 'Fegyelmi eljárási lap', emoji: '⚖️', channelId: channels.disciplinary.id,
      approval: true, active: true, accessRoleId: roles.directorateHead.id, notificationRoleId: roles.deputy.id, caseNumber: true, pingTarget: true,
      fields: [field('Esemény időpontja', 'ÉÉÉÉ.HH.NN. ÓÓ:PP', 'short'), field('Feltárt szabályszegés', 'Tényszerű leírás'), field('Bizonyítékok', 'Üzenetlinkek, képek, tanúk'), field('Meghallgatás összegzése', 'Érintetti nyilatkozat'), field('Javasolt döntés', 'Intézkedés és indoklás')]
    },
    {
      key: 'custom_elolept', title: 'Előléptetési javaslat', emoji: '⬆️', channelId: channels.promotions.id,
      approval: true, active: true, accessRoleId: roles.operationsCommander.id, notificationRoleId: roles.directorateHead.id, caseNumber: false, pingTarget: true,
      fields: [field('Jelenlegi rang', 'Az érintett jelenlegi rangja', 'short'), field('Javasolt rang', 'A javasolt új rang', 'short'), field('Szolgálati teljesítmény', 'Eredmények és aktivitás'), field('Indoklás', 'Miért indokolt az előléptetés?'), field('Megjegyzés', 'Opcionális kiegészítés', 'paragraph', false)]
    }
  ];
}

async function publishCiaPanels(guild, channels, roles, botUser, template) {
  let published = 0;
  const panels = ciaStaticPanels();
  const acceptedRole = guild.roles.cache.get(template.acceptedRoleId);
  panels.recruitmentInfo = [ciaInfoEmbed('🕵️ Aktuális felvételi eljárás',
    `**Jelentkezés:** ${template.title}\n**Kérdések:** ${template.questions.length}\n**Bírálat:** ${template.blindReview ? 'vak bírálat' : 'a beállított bírálati rend'}\n**Új jelentkezés várakozási ideje:** ${template.cooldownHours} óra\n**Elfogadás után:** ${acceptedRole?.name || 'a beállított beosztás'}\n\nIndítsd a jelentkezést a 📝・jelentkezés szobában. Saját megfogalmazású válaszokat írj; a bot privát értesítést próbál küldeni az eredményről.`)];
  for (const [key, embeds] of Object.entries(panels)) {
    if (channels[key]) published += await sendCiaStaticPanel(channels[key], embeds, botUser.id);
  }
  published += await replaceInteractivePanel(
    channels.verification,
    botUser.id,
    (message) => message.components.some((row) => row.components.some((component) => component.customId === 'engagement_verify')),
    verificationPanel('hu')
  );
  published += await replaceInteractivePanel(
    channels.notificationRoles,
    botUser.id,
    (message) => message.components.some((row) => row.components.some((component) => component.customId === 'community_self_roles')),
    rolePanel(guild, [roles.operationAlert.id, roles.announcements.id], 'select')
  );
  published += await replaceInteractivePanel(
    channels.ticketPanel,
    botUser.id,
    (message) => message.components.some((row) => row.components.some((component) => component.customId === 'ticket_category_select')),
    ticketPanel('Válaszd ki a CIA ügyintézés típusát. A NEXA privát csatornát nyit az ügyhöz.', 'hu', ['support', 'application', 'report', 'other'], {
      support: 'Általános segítségkérés', application: 'Felvételi / TGF kérdés', report: 'Bizalmas bejelentés', other: 'Egyéb CIA ügy'
    })
  );
  published += await replaceInteractivePanel(
    channels.shiftPanel,
    botUser.id,
    (message) => message.components.some((row) => row.components.some((component) => component.customId === 'shift_start')),
    shiftPanel()
  );
  published += await replaceInteractivePanel(
    channels.staffPanel,
    botUser.id,
    (message) => message.components.some((row) => row.components.some((component) => component.customId?.startsWith('staff_'))),
    staffPanel(roles.operationsCommander.name, 'hu')
  );
  await installApplicationPanel(guild, template, botUser);
  published += 1;
  const documentResult = await installDocumentPanels(guild, botUser);
  published += documentResult.installed.length;
  return { published, documents: documentResult };
}

function ciaInstallationMarker(guildId) {
  return `${CIA_INSTALL_MARKER}:${guildId}`;
}

function ciaDiscordMarkerPresent(guild) {
  const storedId = getGuildConfig(guild.id).installations?.cia?.channels?.systemControl;
  const markers = [ciaInstallationMarker(guild.id), `NEXA_CIA_INSTALLATION_V1:${guild.id}`, `NEXA_CIA_INSTALLATION_V2:${guild.id}`];
  return guild.channels.cache.some((channel) => channel.type === ChannelType.GuildText && (channel.id === storedId || channel.name === '⚙️・cia-rendszer') && markers.some((marker) => String(channel.topic || '').includes(marker)));
}

function isCiaInstallationComplete(guild) {
  return Boolean(getGuildConfig(guild.id).installations?.cia?.completed || ciaDiscordMarkerPresent(guild));
}

function isCiaInstallerFinalized(guild) {
  if (getGuildConfig(guild.id).installations?.cia?.finalized === true) return true;
  const marker = `${CIA_FINAL_INSTALL_MARKER}:${guild.id}`;
  return guild.channels.cache.some((channel) => channel.type === ChannelType.GuildText && String(channel.topic || '').includes(marker));
}

function assertCiaInstallerAvailable(guild) {
  if (isCiaInstallerFinalized(guild)) {
    const error = new Error('A kért egyszeri CIA-frissítés már sikeresen elkészült. A telepítő végleg lezárt; további telepítés nem engedélyezett.');
    error.code = 'CIA_INSTALLER_FINALIZED';
    throw error;
  }
}

async function removeCiaGuildCommand(guild) {
  const commands = await guild.commands.fetch();
  for (const command of commands.values()) {
    if (command.name === 'cia') await guild.commands.delete(command.id);
  }
  return true;
}

function auditCiaServer(guild) {
  const missingRoles = CIA_ROLES.filter((spec) => !ciaRoleBySpec(guild, spec)).map((spec) => spec.name);
  const missingCategories = CIA_CATEGORIES.filter((spec) => !guild.channels.cache.some((channel) => channel.type === ChannelType.GuildCategory && channel.name === spec.name)).map((spec) => spec.name);
  const missingChannels = CIA_CATEGORIES.flatMap((category) => category.channels)
    .filter(([, name, mode]) => !guild.channels.cache.some((channel) => channel.name === name && channel.type === (mode === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText)))
    .map(([, name]) => name);
  const databaseMarker = Boolean(getGuildConfig(guild.id).installations?.cia?.completed);
  const discordMarker = ciaDiscordMarkerPresent(guild);
  return {
    version: Number(getGuildConfig(guild.id).installations?.cia?.version || (discordMarker ? 1 : 0)),
    targetVersion: CIA_INSTALLATION_VERSION,
    missingRoles,
    missingCategories,
    missingChannels,
    databaseMarker,
    discordMarker,
    structureComplete: !missingRoles.length && !missingCategories.length && !missingChannels.length,
    complete: !missingRoles.length && !missingCategories.length && !missingChannels.length && (databaseMarker || discordMarker)
  };
}

function assertCiaOwner(guild, botUser, ownerMember) {
  if (!guild?.id || !botUser?.id || !ownerMember?.id) throw new Error('A CIA művelethez szerver, bot és fő botowner szükséges.');
  if (!isBotOwner(ownerMember.id)) {
    const error = new Error('A CIA rendszert kizárólag az elsődleges BOT_OWNER_ID fiók telepítheti vagy frissítheti.');
    error.code = 'CIA_OWNER_REQUIRED';
    throw error;
  }
  if (!ownerMember.permissions?.has(PermissionFlagsBits.Administrator)) throw new Error('A fő botownernek ezen a szerveren Rendszergazda jogosultság szükséges.');
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.Administrator)) throw new Error('A NEXA Botnak ezen a szerveren Rendszergazda jogosultság szükséges.');
}

async function refreshCiaAmericanRanks(guild, botUser, ownerMember) {
  assertCiaOwner(guild, botUser, ownerMember);
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  assertCiaInstallerAvailable(guild);
  if (!isCiaInstallationComplete(guild)) {
    const error = new Error('Előbb telepítsd a CIA rendszert a /cia telepites paranccsal.');
    error.code = 'CIA_NOT_INSTALLED';
    throw error;
  }
  if (ciaInstallLocks.has(guild.id)) {
    const error = new Error('A CIA rendszer módosítása ezen a szerveren már folyamatban van.');
    error.code = 'CIA_INSTALL_RUNNING';
    throw error;
  }

  ciaInstallLocks.add(guild.id);
  try {
    const config = JSON.parse(JSON.stringify(getGuildConfig(guild.id)));
    const storedRoleIds = config.installations?.cia?.roles || {};
    const roles = {};

    for (const spec of CIA_ROLES) {
      let role = storedRoleIds[spec.key] ? guild.roles.cache.get(storedRoleIds[spec.key]) : null;
      if (!role && storedRoleIds[spec.key]) role = await guild.roles.fetch(storedRoleIds[spec.key]).catch(() => null);
      if (!role || role.managed) role = ciaRoleBySpec(guild, spec);

      if (!role) {
        role = await guild.roles.create({
          name: spec.name,
          color: spec.color,
          hoist: Boolean(spec.hoist),
          mentionable: Boolean(spec.mentionable),
          permissions: spec.permissions,
          reason: `${CIA_SETUP_REASON} – American rank migration`
        });
      } else {
        role = await role.edit({
          name: spec.name,
          color: spec.color,
          hoist: Boolean(spec.hoist),
          mentionable: Boolean(spec.mentionable),
          reason: `${CIA_SETUP_REASON} – American rank migration`
        });
      }
      roles[spec.key] = role;
    }

    await applyCiaRolePositions(guild, roles);

    const panels = ciaStaticPanels();
    let hierarchyUpdated = false;
    for (const key of ['hierarchy', 'ranks']) {
      const storedId = config.installations?.cia?.channels?.[key];
      const spec = CIA_CATEGORIES.flatMap((category) => category.channels).find(([channelKey]) => channelKey === key);
      const names = new Set([spec[1], ...(spec[3] || [])]);
      const channel = (storedId ? guild.channels.cache.get(storedId) : null) || guild.channels.cache.find((item) => item.type === ChannelType.GuildText && names.has(item.name));
      if (channel?.isTextBased?.()) {
        await sendCiaStaticPanel(channel, panels[key], botUser.id);
        if (key === 'hierarchy') hierarchyUpdated = true;
      }
    }

    config.installations = config.installations || {};
    config.installations.cia = {
      ...(config.installations.cia || {}),
      completed: true,
      version: config.installations.cia?.version || CIA_INSTALLATION_VERSION,
      roles: Object.fromEntries(Object.entries(roles).map(([key, role]) => [key, role.id])),
      rankStyle: 'american',
      ranksUpdatedAt: new Date().toISOString()
    };
    await setGuildConfig(guild.id, config);
    return { count: Object.keys(roles).length, hierarchyUpdated };
  } finally {
    ciaInstallLocks.delete(guild.id);
  }
}

async function setupCiaServer(guild, botUser, ownerMember, options = {}) {
  assertCiaOwner(guild, botUser, ownerMember);
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  assertCiaInstallerAvailable(guild);
  const repair = options.repair === true || isCiaInstallationComplete(guild);
  if (!guild?.id || !ownerMember?.id) throw new Error('A CIA telepítéshez szerver és tulajdonos szükséges.');
  if (repair && !isCiaInstallationComplete(guild)) {
    const error = new Error('A CIA rendszer még nincs telepítve ezen a szerveren. Előbb használd a /cia telepites parancsot.');
    error.code = 'CIA_NOT_INSTALLED';
    throw error;
  }
  if (ciaInstallLocks.has(guild.id)) {
    const error = new Error('A CIA telepítés ezen a szerveren már folyamatban van.');
    error.code = 'CIA_INSTALL_RUNNING';
    throw error;
  }
  ciaInstallLocks.add(guild.id);
  try {
    const config = JSON.parse(JSON.stringify(getGuildConfig(guild.id)));
    const previousInstallation = config.installations?.cia || {};
    const roles = {};
    const categories = {};
    const channels = {};
    const checkpoint = async () => {
      config.installations = config.installations || {};
      config.installations.cia = {
        ...previousInstallation,
        completed: previousInstallation.completed === true,
        version: previousInstallation.version || CIA_INSTALLATION_VERSION,
        installedAt: previousInstallation.installedAt || new Date().toISOString(),
        installedBy: previousInstallation.installedBy || ownerMember.id,
        roles: { ...previousInstallation.roles, ...Object.fromEntries(Object.entries(roles).map(([key, item]) => [key, item.id])) },
        categories: { ...previousInstallation.categories, ...Object.fromEntries(Object.entries(categories).map(([key, item]) => [key, item.id])) },
        channels: { ...previousInstallation.channels, ...Object.fromEntries(Object.entries(channels).map(([key, item]) => [key, item.id])) }
      };
      await setGuildConfig(guild.id, config);
    };
    for (const spec of CIA_ROLES) {
      const existing = ciaRoleBySpec(guild, spec);
      if (existing?.editable === false) throw new Error(`A NEXA rangja legyen a kezelt CIA rang fölött: ${existing.name}`);
    }
    for (const spec of CIA_ROLES) {
      roles[spec.key] = await ensureCiaRole(guild, spec);
      await checkpoint();
    }
    await applyCiaRolePositions(guild, roles);
    if (!ownerMember.roles.cache.has(roles.director.id)) await ownerMember.roles.add(roles.director, CIA_SETUP_REASON);

    for (const categorySpec of CIA_CATEGORIES) {
      const category = await ensureCiaCategory(guild, categorySpec, roles);
      categories[categorySpec.key] = category;
      await checkpoint();
      for (const channelSpec of categorySpec.channels) {
        const [key, channel] = await ensureCiaChannel(guild, category, categorySpec, channelSpec, roles);
        channels[key] = channel;
      }
      await checkpoint();
      const positions = categorySpec.channels.map(([key], position) => channels[key] ? ({ channel: channels[key].id, position }) : null).filter(Boolean);
      if (positions.length) await guild.channels.setPositions(positions);
    }
    const categoryPositions = CIA_CATEGORIES.map((spec, position) => categories[spec.key] ? ({ channel: categories[spec.key].id, position }) : null).filter(Boolean);
    if (categoryPositions.length) await guild.channels.setPositions(categoryPositions);

    await grantGuildPlan(guild.id, 'ultimate', {
      days: null,
      grantedBy: ownerMember.id,
      note: repair ? 'CIA frakciórendszer – bot owner javítás' : 'Egyszeri CIA frakciórendszer – bot owner telepítés'
    });
    const ownerSettings = getOwnerSettings();
    if (!ownerSettings.rpGuilds.includes(guild.id)) {
      ownerSettings.rpGuilds.push(guild.id);
      await setOwnerSettings(ownerSettings);
    }

    config.language = 'hu';
    config.commandLanguage = 'hu';
    Object.assign(config.modules, {
      protection: true,
      moderation: true,
      tickets: true,
      welcome: true,
      shift: true,
      logging: true,
      verification: true,
      reminders: true,
      reactionRoles: true,
      suggestions: false,
      levels: false,
      giveaways: false,
      ai: false
    });
    Object.assign(config.channels, {
      securityLogs: channels.securityLogs.id,
      logs: channels.botLogs.id,
      controlCenter: channels.directorOffice.id,
      ticketPanel: channels.ticketPanel.id,
      ticketCategory: categories.tickets.id,
      moderationPanel: channels.staffPanel.id,
      welcome: channels.welcome.id,
      goodbye: channels.memberLogs.id,
      warnings: channels.disciplinary.id,
      shiftLogs: channels.serviceLogs.id,
      announcements: channels.announcements.id,
      verification: channels.verification.id
    });
    Object.assign(config.roles, {
      staff: roles.operationsCommander.id,
      auto: roles.verified.id,
      human: roles.verified.id,
      dashboard: roles.deputy.id,
      shift: roles.trainee.id,
      verified: roles.verified.id
    });
    config.community.selfRoles = [roles.operationAlert.id, roles.announcements.id];
    config.messages.welcome = '🕵️ Üdvözlünk a CIA frakcióközpontban, {tag}! Olvasd el a szabályzatot, majd végezd el az ellenőrzést.';
    config.messages.goodbye = '👤 {username} elhagyta a CIA frakcióközpontot.';
    config.messages.ticket = 'Válaszd ki a CIA ügyintézés típusát. A NEXA privát csatornát nyit az ügyhöz.';
    config.tickets.enabledTypes = ['support', 'application', 'report', 'other'];
    Object.assign(config.tickets.labels, {
      support: 'Általános segítségkérés',
      application: 'Felvételi / TGF kérdés',
      report: 'Bizalmas bejelentés',
      other: 'Egyéb CIA ügy'
    });
    Object.assign(config.protection, {
      sensitivity: 'strict', spam: true, flood: true, massMention: true, invites: true, links: true,
      scamLinks: true, capsSpam: true, emojiSpam: true, repeatedMessage: true, raidDetection: true,
      freshAccounts: true, antiNuke: true, channelGuard: true, roleGuard: true, moderationGuard: true,
      webhookGuard: true, deleteMessages: true, warn: true, timeout: true, kick: true, ban: true, lockdown: true
    });
    config.protection.whitelistRoles = [roles.director.id, roles.deputy.id, roles.chiefOfStaff.id];
    config.protection.whitelistChannels = [channels.directorOffice.id, channels.systemControl.id];
    config.documents.defaultAccessRoleId = roles.trainee.id;
    const existingTypes = config.documents.customTypes || [];
    const definitions = ciaDocumentTypes(channels, roles);
    config.documents.customTypes = [
      ...definitions.map((definition) => ({ ...definition, ...existingTypes.find((type) => type.key === definition.key), channelId: definition.channelId })),
      ...existingTypes.filter((type) => !definitions.some((definition) => definition.key === type.key))
    ];
    const defaultTemplate = ciaApplicationTemplate(channels, roles);
    const existingTemplates = config.applications.templates || [];
    const template = {
      ...defaultTemplate,
      ...existingTemplates.find((item) => item.key === defaultTemplate.key),
      openChannelId: channels.application.id,
      reviewChannelId: channels.reviewFiles.id,
      resultChannelId: channels.applicationResults.id
    };
    config.applications.templates = [template, ...existingTemplates.filter((item) => item.key !== template.key)];
    await setGuildConfig(guild.id, config);

    const panelResult = await publishCiaPanels(guild, channels, roles, botUser, template);
    const marker = ciaInstallationMarker(guild.id);

    config.installations = config.installations || {};
    config.installations.cia = {
      completed: true,
      version: CIA_INSTALLATION_VERSION,
      installedAt: previousInstallation.installedAt || new Date().toISOString(),
      installedBy: previousInstallation.installedBy || ownerMember.id,
      rankStyle: 'american',
      ranksUpdatedAt: new Date().toISOString(),
      lastRepairedAt: repair ? new Date().toISOString() : previousInstallation.lastRepairedAt || null,
      repairCount: repair ? Number(previousInstallation.repairCount || 0) + 1 : Number(previousInstallation.repairCount || 0),
      roles: Object.fromEntries(Object.entries(roles).map(([key, role]) => [key, role.id])),
      categories: Object.fromEntries(Object.entries(categories).map(([key, category]) => [key, category.id])),
      channels: Object.fromEntries(Object.entries(channels).map(([key, channel]) => [key, channel.id]))
    };
    await setGuildConfig(guild.id, config);
    await channels.installationHistory.send({
      content: `✅ CIA v${CIA_INSTALLATION_VERSION} ${repair ? 'újratelepítés / frissítés' : 'telepítés'} • végrehajtó: ${ownerMember.id} • ${Object.keys(roles).length} rang, ${Object.keys(categories).length} kategória, ${Object.keys(channels).length} csatorna • ${new Date().toISOString()}`,
      allowedMentions: { parse: [] }
    });
    // Consume the last permitted run only after every role, channel and panel succeeded.
    await channels.systemControl.setTopic(`NEXA CIA rendszervezérlés • ${marker} • ${CIA_FINAL_INSTALL_MARKER}:${guild.id}`, CIA_SETUP_REASON);
    config.installations.cia.finalized = true;
    config.installations.cia.finalizedAt = new Date().toISOString();
    config.installations.cia.finalizedBy = ownerMember.id;
    let persistenceWarning = null;
    try {
      await setGuildConfig(guild.id, config);
    } catch (error) {
      persistenceWarning = 'A Discord-lezárás aktív; az adatbázis-jelző mentése átmenetileg sikertelen.';
      console.error('CIA finalization database marker:', error);
    }
    let commandRemoved = false;
    try {
      commandRemoved = await removeCiaGuildCommand(guild);
    } catch (error) {
      console.error('CIA command cleanup will retry on startup:', error);
    }
    return {
      finalized: true,
      commandRemoved,
      persistenceWarning,
      roles,
      categories,
      channels,
      roleCount: Object.keys(roles).length,
      categoryCount: Object.keys(categories).length,
      channelCount: Object.keys(channels).length,
      published: panelResult.published,
      documentPanels: panelResult.documents.installed.length
    };
  } finally {
    ciaInstallLocks.delete(guild.id);
  }
}

async function repairCiaServer(guild, botUser, ownerMember) {
  return setupCiaServer(guild, botUser, ownerMember, { repair: true });
}

async function setupSupportServer(guild, botUser, ownerMember) {
  if (guild?.id !== SUPPORT_GUILD_ID) {
    throw new Error(`A NEXA Support rendszer kizárólag ezen a szerveren telepíthető: ${SUPPORT_GUILD_ID}`);
  }
  const roles = {};
  for (const spec of SUPPORT_ROLES) roles[spec.key] = await ensureRole(guild, spec);
  await applyRolePositions(guild, roles);
  if (ownerMember && !ownerMember.roles.cache.has(roles.owner.id)) {
    await ownerMember.roles.add(roles.owner, SETUP_REASON);
  }

  const categories = {};
  const channels = {};
  for (const categorySpec of SUPPORT_CATEGORIES) {
    const category = await ensureCategory(guild, categorySpec, roles);
    categories[categorySpec.key] = category;
    for (const channelSpec of categorySpec.channels) {
      const [key, channel] = await ensureChannel(guild, category, channelSpec, roles);
      channels[key] = channel;
    }
    const orderedChildren = categorySpec.channels
      .map(([key], position) => channels[key] ? ({ channel: channels[key].id, position }) : null)
      .filter(Boolean);
    if (orderedChildren.length) await guild.channels.setPositions(orderedChildren).catch(() => null);
  }
  const orderedCategories = SUPPORT_CATEGORIES
    .map((spec, position) => categories[spec.key] ? ({ channel: categories[spec.key].id, position }) : null)
    .filter(Boolean);
  if (orderedCategories.length) await guild.channels.setPositions(orderedCategories).catch(() => null);

  await grantGuildPlan(guild.id, 'ultimate', {
    days: null,
    grantedBy: ownerMember?.id || 'owner',
    note: 'Official NEXA Support Server'
  });

  const config = JSON.parse(JSON.stringify(getGuildConfig(guild.id)));
  config.language = 'en';
  config.commandLanguage = 'en';
  Object.assign(config.modules, {
    protection: true,
    moderation: true,
    tickets: true,
    welcome: true,
    suggestions: true,
    customCommands: true,
    reactionRoles: true,
    giveaways: true,
    logging: true,
    verification: true,
    reminders: true,
    levels: false,
    shift: false,
    ai: false,
    bvi: false
  });
  Object.assign(config.channels, {
    securityLogs: channels.securityLogs.id,
    logs: channels.moderationLogs.id,
    controlCenter: channels.ownerCenter.id,
    ticketPanel: channels.ticketPanel.id,
    ticketCategory: categories.tickets.id,
    moderationPanel: channels.staffChat.id,
    welcome: channels.welcome.id,
    goodbye: channels.memberLogs.id,
    warnings: channels.moderationLogs.id,
    suggestions: channels.suggestions.id,
    announcements: channels.announcements.id,
    verification: channels.verification.id
  });
  Object.assign(config.roles, {
    staff: roles.support.id,
    auto: roles.verified.id,
    human: roles.verified.id,
    dashboard: roles.management.id,
    verified: roles.verified.id
  });
  config.community.selfRoles = [roles.hungarian.id, roles.english.id, roles.announcements.id, roles.beta.id];
  config.messages.welcome = '👋 Welcome to the official NEXA Bot server, {tag}! Read the rules, then complete verification.';
  config.messages.goodbye = '👋 {username} has left the NEXA Bot community.';
  config.messages.ticket = 'Select a category and NEXA Bot will create a private support channel.';
  Object.assign(config.protection, {
    sensitivity: 'strict',
    spam: true,
    flood: true,
    massMention: true,
    invites: true,
    links: true,
    scamLinks: true,
    capsSpam: true,
    emojiSpam: true,
    repeatedMessage: true,
    raidDetection: true,
    freshAccounts: true,
    antiNuke: true,
    channelGuard: true,
    roleGuard: true,
    moderationGuard: true,
    webhookGuard: true,
    deleteMessages: true,
    warn: true,
    timeout: true,
    kick: true,
    ban: true,
    lockdown: true
  });
  config.protection.whitelistRoles = [roles.owner.id, roles.management.id, roles.developer.id, roles.support.id];
  config.protection.whitelistChannels = [channels.staffChat.id, channels.developerTest.id];
  await setGuildConfig(guild.id, config);

  const published = await publishSupportPanels(guild, channels, roles, botUser);
  return {
    roles,
    categories,
    channels,
    published,
    roleCount: Object.keys(roles).length,
    categoryCount: Object.keys(categories).length,
    channelCount: Object.keys(channels).length
  };
}

function resolveSupportResources(guild) {
  const roles = Object.fromEntries(SUPPORT_ROLES.map((spec) => [spec.key, roleBySpec(guild, spec)]));
  const missingRole = Object.entries(roles).find(([, role]) => !role);
  if (missingRole) {
    throw new Error(`Hiányzó kezelt rang: ${missingRole[0]}. Futtasd előbb a /support-szerver telepites parancsot.`);
  }

  const channels = {};
  for (const category of SUPPORT_CATEGORIES) {
    for (const [key, name, mode, legacyNames = []] of category.channels) {
      const names = new Set([name, ...legacyNames]);
      channels[key] = guild.channels.cache.find((channel) =>
        names.has(channel.name) && channel.type === (mode === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText)
      );
      if (!channels[key]) {
        throw new Error(`Hiányzó kezelt csatorna: ${name}. Futtasd előbb a /support-szerver telepites parancsot.`);
      }
    }
  }
  const ticketCategory = guild.channels.cache.find((channel) =>
    channel.type === ChannelType.GuildCategory && ['━━━ 04 • TICKETS ━━━', '━━━ TICKETS ━━━', '━━━ TICKETEK ━━━'].includes(channel.name)
  );
  if (!ticketCategory) {
    throw new Error('Hiányzik a TICKETEK kategória. Futtasd előbb a /support-szerver telepites parancsot.');
  }
  return { roles, channels, ticketCategory };
}

async function repairSupportServer(guild, botUser, actorId) {
  if (guild?.id !== SUPPORT_GUILD_ID) {
    throw new Error(`A NEXA Support rendszer kizárólag ezen a szerveren javítható: ${SUPPORT_GUILD_ID}`);
  }
  let resources;
  let rebuilt = null;
  try {
    resources = resolveSupportResources(guild);
  } catch (_missingResourceError) {
    const actorMember = actorId ? await guild.members.fetch(actorId).catch(() => null) : null;
    rebuilt = await setupSupportServer(guild, botUser, actorMember);
    resources = resolveSupportResources(guild);
  }
  const { roles, channels, ticketCategory } = resources;
  await applyRolePositions(guild, roles);
  await grantGuildPlan(guild.id, 'ultimate', {
    days: null,
    grantedBy: actorId || 'owner',
    note: 'Hivatalos NEXA Support szerver – javítás'
  });

  const config = JSON.parse(JSON.stringify(getGuildConfig(guild.id)));
  config.language = 'en';
  Object.assign(config.modules, {
    tickets: true,
    welcome: true,
    reactionRoles: true,
    logging: true,
    verification: true,
    reminders: true
  });
  Object.assign(config.channels, {
    logs: channels.moderationLogs.id,
    ticketPanel: channels.ticketPanel.id,
    ticketCategory: ticketCategory.id,
    welcome: channels.welcome.id,
    goodbye: channels.memberLogs.id,
    announcements: channels.announcements.id,
    verification: channels.verification.id
  });
  Object.assign(config.roles, {
    staff: roles.support.id,
    auto: roles.verified.id,
    human: roles.verified.id,
    dashboard: roles.management.id,
    verified: roles.verified.id
  });
  config.community.selfRoles = [roles.hungarian.id, roles.english.id, roles.announcements.id, roles.beta.id];
  config.messages.welcome = '👋 Welcome to the official NEXA Bot server, {tag}! Read the rules, then complete verification.';
  config.messages.goodbye = '👋 {username} has left the NEXA Bot community.';
  config.messages.ticket = 'Select a category and NEXA Bot will create a private support channel.';
  Object.assign(config.protection, {
    sensitivity: 'strict',
    spam: true,
    flood: true,
    massMention: true,
    invites: true,
    links: true,
    scamLinks: true,
    capsSpam: true,
    emojiSpam: true,
    repeatedMessage: true,
    raidDetection: true,
    freshAccounts: true,
    antiNuke: true,
    channelGuard: true,
    roleGuard: true,
    moderationGuard: true,
    webhookGuard: true,
    deleteMessages: true,
    warn: true,
    timeout: true,
    kick: true,
    ban: true,
    lockdown: true
  });
  await setGuildConfig(guild.id, config);

  const ownerSettings = getOwnerSettings();
  const hadGlobalVerificationBlock = ownerSettings.remoteDisabledModules.includes('verification');
  if (hadGlobalVerificationBlock) {
    ownerSettings.remoteDisabledModules = ownerSettings.remoteDisabledModules.filter((key) => key !== 'verification');
    await setOwnerSettings(ownerSettings);
  }

  const published = await publishSupportPanels(guild, channels, roles, botUser);
  return {
    ...(rebuilt || {}),
    published,
    verification: getModuleState(guild.id, 'verification'),
    hadGlobalVerificationBlock,
    recreatedMissingResources: Boolean(rebuilt)
  };
}

function auditSupportServer(guild) {
  const missingRoles = SUPPORT_ROLES.filter((spec) => !roleBySpec(guild, spec)).map((spec) => spec.name);
  const missingCategories = SUPPORT_CATEGORIES.filter((spec) => {
    const names = new Set([spec.name, ...(spec.legacyNames || [])]);
    return !guild.channels.cache.some((channel) => channel.type === ChannelType.GuildCategory && names.has(channel.name));
  }).map((spec) => spec.name);
  const missingChannels = SUPPORT_CATEGORIES.flatMap((category) => category.channels)
    .filter(([, name, mode, legacyNames = []]) => {
      const names = new Set([name, ...legacyNames]);
      return !guild.channels.cache.some((channel) => names.has(channel.name) && channel.type === (mode === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText));
    })
    .map(([, name]) => name);
  return {
    missingRoles,
    missingCategories,
    missingChannels,
    complete: !missingRoles.length && !missingCategories.length && !missingChannels.length
  };
}

module.exports = {
  CIA_CATEGORIES,
  CIA_INSTALL_MARKER,
  CIA_ROLES,
  CIA_INSTALLATION_VERSION,
  ciaStaticPanels,
  MANAGED_FOOTER,
  SUPPORT_GUILD_ID,
  SUPPORT_CATEGORIES,
  SUPPORT_ROLES,
  auditCiaServer,
  auditSupportServer,
  buildCiaSetupCommand,
  buildSupportSetupCommand,
  isCiaInstallationComplete,
  isCiaInstallerFinalized,
  publishSupportPanels,
  refreshCiaAmericanRanks,
  repairCiaServer,
  repairSupportServer,
  registerCiaCommandInOwnerGuilds,
  registerSupportCommandInOwnerGuilds,
  setupCiaServer,
  setupSupportServer,
  staticPanels
};
