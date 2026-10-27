const { Locale } = require('discord.js');
const ENGLISH_LOCALES = Object.values(Locale).filter((locale) => locale !== 'hu');
const TRANSLATIONS = Object.freeze({
  mdt: ['mdt', 'Belv MDT: personal access and records.'],
  'mdt.belepes': ['access-code', 'Create a personal, single-use MDT access code.'],
  'mdt.script': ['load-script', 'Show your one-line loader for the Roblox MDT.'],
  'mdt.kijelentkezes': ['logout', 'Revoke your own MDT sessions.'],
  'mdt.telepites': ['install', 'Create missing MDT channels only; existing channels are left untouched.'],
  'mdt.allapot': ['status', 'Show the MDT status. Configure it in the Owner Center.'],
  beallitas: ['settings', 'Open the NEXA Bot web dashboard.'],
  telepites: ['rp-install', 'Install the complete Owner-approved RP base system.'],
  'dokumentum-panelek': ['document-panels', 'Install RP document panels in the existing channels.'],
  vedelem: ['security', 'Manage NEXA Bot automatic server protection.'],
  'vedelem.statusz': ['status', 'Show the current protection status.'],
  'vedelem.feloldas': ['unlock', 'Release the active raid lockdown.'],
  nexa: ['nexa', 'NEXA command center, system status and AI assistant.'],
  'nexa.kerdes': ['ask', 'Ask NEXA AI a question.'],
  'nexa.kerdes.szoveg': ['text', 'What would you like to ask?'],
  'nexa.dokumentum': ['document', 'Create an official or community document.'],
  'nexa.dokumentum.tipus': ['type', 'What kind of document should be created?'],
  'nexa.dokumentum.reszletek': ['details', 'Required content and details.'],
  'nexa.emlekezz': ['remember', 'Save an authorized memory.'],
  'nexa.emlekezz.tipus': ['type', 'Who does this memory belong to?'],
  'nexa.emlekezz.szoveg': ['text', 'What should NEXA remember?'],
  'nexa.memoria': ['memory', 'Show saved memories.'],
  'nexa.memoria.tipus': ['type', 'Which memory would you like to view?'],
  'nexa.felejts': ['forget', 'Delete the selected memory.'],
  'nexa.felejts.tipus': ['type', 'Which memory should be deleted?'],
  'nexa.beleegyezes': ['consent', 'Allow or disable personal AI memory.'],
  'nexa.beleegyezes.engedelyezve': ['enabled', 'May NEXA AI store personal memories for you on this server?'],
  szolgalat: ['shift', 'Shift and duty management.'],
  'szolgalat.panel': ['panel', 'Post the shift control panel.'],
  'szolgalat.idomodositas': ['time-adjustment', 'Correct a shift record by exact minutes (Staff).'],
  'szolgalat.idomodositas.tag': ['member', 'Member whose latest closed shift will be adjusted.'],
  'szolgalat.idomodositas.irany': ['direction', 'Add or subtract time.'],
  'szolgalat.idomodositas.perc': ['minutes', 'Minutes to adjust (1–10080).'],
  'szolgalat.idomodositas.indok': ['reason', 'Required reason for the correction.'],
  'szolgalat.statisztika': ['statistics', 'Show duty time and shift statistics.'],
  'szolgalat.statisztika.tag': ['member', 'View another member with Staff permission.'],
  'szolgalat.ranglista': ['leaderboard', 'Show the monthly duty leaderboard.'],
  'szolgalat.naplo': ['records', 'Show recent shift records and their IDs.'],
  'szolgalat.naplo.tag': ['member', 'View another member with Staff permission.'],
  'szolgalat.naplo.darab': ['count', 'Number of records (1–20).'],
  'szolgalat.aktivak': ['active-duty', 'Show the active duty roster privately (Staff).'],
  'szolgalat.osszesito': ['roster-summary', 'Show the staff duty summary for 7, 30 or 90 days.'],
  'szolgalat.osszesito.napok': ['days', 'Choose the reporting period.'],
  feladat: ['task', 'NEXA Staff Task Center.'],
  'feladat.kiosztas': ['assign', 'Assign a task and an optional deadline to a member.'],
  'feladat.kiosztas.tag': ['member', 'The member responsible for the task.'],
  'feladat.kiosztas.cim': ['title', 'Short, clear task title.'],
  'feladat.kiosztas.leiras': ['details', 'Instructions and completion criteria.'],
  'feladat.kiosztas.hatarido': ['deadline', 'Optional: YYYY-MM-DD HH:MM in Budapest time.'],
  'feladat.sajat': ['mine', 'Show your open tasks.'],
  'feladat.attekintes': ['overview', 'View server tasks. (Staff)'],
  'feladat.attekintes.allapot': ['status', 'Filter tasks by status.'],
  'feladat.allapot': ['update', 'Accept, complete or reopen a task.'],
  'feladat.allapot.azonosito': ['task_id', 'Task ID.'],
  'feladat.allapot.uj_allapot': ['new_status', 'New task status.'],
  ticket: ['ticket', 'NEXA ticket controls and staff statistics.'],
  'ticket.statisztika': ['statistics', 'Show private ticket statistics for ticket staff.'],
  'ticket.statisztika.napok': ['days', 'Choose the reporting period.'],
  'szolgalat.szabadsag': ['leave-request', 'Submit a leave or absence request.'],
  'szolgalat.szabadsag.kezdet': ['start', 'First day: YYYY-MM-DD'],
  'szolgalat.szabadsag.vege': ['end', 'Last day: YYYY-MM-DD'],
  'szolgalat.szabadsag.indok': ['reason', 'Reason for the absence.'],
  'szolgalat.beosztas': ['schedule', 'Schedule a member for a shift (Staff).'],
  'szolgalat.beosztas.tag': ['member', 'Member to schedule.'],
  'szolgalat.beosztas.kezdet': ['start', 'YYYY-MM-DD HH:MM in server time.'],
  'szolgalat.beosztas.vege': ['end', 'YYYY-MM-DD HH:MM in server time.'],
  'szolgalat.beosztas.megjegyzes': ['note', 'Optional task or note.'],
  help: ['help', 'Open the interactive NEXA Bot help center.', 'sugo'],
  chronoguard: ['chronoguard', 'Owner controls for the NEXA digital server twin.'],
  'chronoguard.statusz': ['status', 'Show ChronoGuard snapshots and incident status.'],
  'chronoguard.vizsgalat': ['scan', 'Compare the live server with the security baseline.'],
  'chronoguard.pillanatkep': ['snapshot', 'Create a signed server snapshot manually.'],
  aegis: ['aegis', 'NEXA Permission DNA and privilege blast-radius analysis.'],
  'aegis.statusz': ['status', 'Show live permission risk.'],
  'aegis.vizsgalat': ['scan', 'Run a complete Permission DNA scan.'],
  'aegis.bazis': ['baseline', 'Record an approved permission baseline.'],
  'support-szerver': ['support-server', 'Owner installer for the official NEXA support server.'],
  'support-szerver.moderacio': ['moderation', 'Owner controls to pause or restore Support moderation.'],
  'support-szerver.telepites': ['install', 'Create or update the complete server, permissions and panels.'],
  'support-szerver.panelek': ['panels', 'Refresh all NEXA-managed information and control panels.'],
  'support-szerver.javitas': ['repair', 'Repair support modules, roles, channels and global blocks.'],
  'support-szerver.angolositas': ['english-migration', 'Safely migrate the existing Support server to English.'],
  'support-szerver.ellenorzes': ['check', 'Check required roles, categories and channels.'],
  cia: ['cia', 'Primary-owner-only CIA installer, updater and reinstaller.'],
  'cia.telepites': ['install', 'Create the complete CIA faction structure once.'],
  'cia.ujratelepites': ['reinstall', 'Only the primary owner: update and expand the installed CIA system.'],
  'cia.rangok-frissitese': ['refresh-roles', 'Refresh installed CIA role names and reference panels.'],
  'cia.ellenorzes': ['check', 'Check the installed CIA faction structure without changing it.'],
  hitelesites: ['verification', 'Manage button-based member verification.'],
  'hitelesites.panel': ['panel', 'Post or refresh the verification panel.'],
  emlekezteto: ['reminder', 'Persistent personal reminders.'],
  'emlekezteto.letrehozas': ['create', 'Create a new reminder.'],
  'emlekezteto.letrehozas.ido': ['time', 'For example: 10m, 2h, 3d or 1w.'],
  'emlekezteto.letrehozas.uzenet': ['message', 'What should NEXA remind you about?'],
  'emlekezteto.lista': ['list', 'Show your active reminders.'],
  'emlekezteto.torles': ['delete', 'Delete a reminder.'],
  'emlekezteto.torles.azonosito': ['id', 'ID shown in the reminder list.'],
  ban: ['ban', 'Ban a member from the server.', 'kitiltas'],
  'ban.tag': ['member', 'Member to ban.'],
  'ban.indok': ['reason', 'Reason for the ban.'],
  'ban.uzenet_torles': ['delete_hours', 'Delete this many hours of messages.'],
  unban: ['unban', 'Remove a user ban.', 'kitiltas-feloldas'],
  'unban.felhasznalo_id': ['user_id', 'Discord ID of the banned user.'],
  'unban.indok': ['reason', 'Reason for removing the ban.'],
  kick: ['kick', 'Kick a member from the server.', 'kirugas'],
  'kick.tag': ['member', 'Member to kick.'],
  'kick.indok': ['reason', 'Reason for the kick.'],
  timeout: ['timeout', 'Temporarily suspend a member.', 'felfuggesztes'],
  'timeout.tag': ['member', 'Member to suspend.'],
  'timeout.perc': ['minutes', 'Duration in minutes, up to 28 days.'],
  'timeout.indok': ['reason', 'Reason for the suspension.'],
  untimeout: ['untimeout', 'Remove a member suspension.', 'felfuggesztes-feloldas'],
  'untimeout.tag': ['member', 'Member whose suspension should be removed.'],
  'untimeout.indok': ['reason', 'Reason for removing the suspension.'],
  warn: ['warn', 'Issue a warning to a member.', 'figyelmeztetes'],
  'warn.tag': ['member', 'Member to warn.'],
  'warn.indok': ['reason', 'Reason for the warning.'],
  'warn.bizonyitek': ['evidence', 'Optional evidence or image URL.'],
  warnings: ['warnings', 'Show a member’s active warnings.', 'figyelmeztetesek'],
  'warnings.tag': ['member', 'Member whose warnings should be shown.'],
  clearwarns: ['clearwarns', 'Delete a member’s active warnings.', 'figyelmeztetesek-torlese'],
  'clearwarns.tag': ['member', 'Member whose warnings should be deleted.'],
  'clearwarns.indok': ['reason', 'Reason for deleting the warnings.'],
  clear: ['clear', 'Delete multiple messages.', 'uzenetek-torlese'],
  'clear.darab': ['amount', 'Number of messages from 1 to 100.'],
  slowmode: ['slowmode', 'Set the channel slowmode.', 'lassitas'],
  'slowmode.masodperc': ['seconds', 'Use 0 to disable; maximum 6 hours.'],
  lock: ['lock', 'Lock the current channel.', 'zaras'],
  'lock.indok': ['reason', 'Reason for locking the channel.'],
  unlock: ['unlock', 'Unlock the current channel.', 'feloldas'],
  'unlock.indok': ['reason', 'Reason for unlocking the channel.'],
  nick: ['nick', 'Change a member nickname.', 'becenev'],
  'nick.tag': ['member', 'Member whose nickname should change.'],
  'nick.indok': ['reason', 'Reason for the change.'],
  'nick.becenev': ['nickname', 'New nickname; leave empty to remove it.'],
  userinfo: ['userinfo', 'Show detailed information about a member.', 'tagadatok'],
  'userinfo.tag': ['member', 'Member to view.'],
  serverinfo: ['serverinfo', 'Show detailed server information.', 'szerveradatok'],
  avatar: ['avatar', 'Show a user profile picture.', 'profilkep'],
  'avatar.tag': ['member', 'User to view.'],
  szint: ['level', 'Show your community level.'],
  'szint.tag': ['member', 'Show another member’s level.'],
  'szint-ranglista': ['level-leaderboard', 'Show the server XP leaderboard.'],
  rank: ['rank', 'Show your community rank.'],
  'rank.tag': ['member', 'Show another member’s rank.'],
  leaderboard: ['leaderboard', 'Show the server XP leaderboard.', 'xp-ranglista'],
  otlet: ['suggestion', 'Submit a suggestion to the voting channel.'],
  'otlet.szoveg': ['text', 'Your suggestion.'],
  szavazas: ['poll', 'Create a multiple-choice poll.'],
  'szavazas.kerdes': ['question', 'Poll question.'],
  'szavazas.valaszok': ['answers', 'Answers separated with |, up to 10.'],
  bejelentes: ['announcement', 'Post a polished announcement as the bot.'],
  'bejelentes.cim': ['title', 'Announcement title.'],
  'bejelentes.szoveg': ['text', 'Announcement text.'],
  'bejelentes.kep': ['image', 'Optional HTTPS image URL.'],
  rangpanel: ['role-panel', 'Post the self-service role selection panel.'],
  'rangpanel.tipus': ['type', 'Panel control type.'],
  nyeremenyjatek: ['quick-giveaway', 'Start a quick giveaway.'],
  'nyeremenyjatek.nyeremeny': ['prize', 'Prize to win.'],
  'nyeremenyjatek.percek': ['minutes', 'Duration in minutes.'],
  'nyeremenyjatek.nyertesek': ['winners', 'Number of winners.'],
  giveaway: ['giveaway', 'Create and manage giveaways.', 'nyeremeny-kezelo'],
  'giveaway.create': ['create', 'Create a new giveaway.'],
  'giveaway.create.prize': ['prize', 'Giveaway prize.'],
  'giveaway.create.minutes': ['minutes', 'Duration in minutes.'],
  'giveaway.create.winners': ['winners', 'Number of winners.'],
  'giveaway.create.required_role': ['required_role', 'Required role.'],
  'giveaway.create.required_server': ['required_server', 'Required external server ID.'],
  'giveaway.create.min_account_age': ['min_account_age', 'Minimum account age in days.'],
  'giveaway.end': ['end', 'End a giveaway immediately.'],
  'giveaway.end.message_id': ['message_id', 'Giveaway message ID.'],
  'giveaway.reroll': ['reroll', 'Draw a new winner.'],
  'giveaway.reroll.message_id': ['message_id', 'Closed giveaway message ID.']
});

const CHOICE_TRANSLATIONS = Object.freeze({
  'nexa.dokumentum.tipus': {
    hivatalos: 'Official document',
    bejelentes: 'Announcement or notice',
    szabalyzat: 'Policy or procedure',
    jelentes: 'Summary or report'
  },
  'nexa.emlekezz.tipus': { personal: 'Personal memory', server: 'Server knowledge (Staff)' },
  'nexa.memoria.tipus': { personal: 'My personal memories', server: 'Server knowledge (Staff)' },
  'nexa.felejts.tipus': { personal: 'All personal memories', server: 'All server knowledge (Admin)' },
  'rangpanel.tipus': { select: 'Select menu', button: 'Buttons', reaction: 'Emoji reactions' }
});

function localizeNode(node, path) {
  const translation = TRANSLATIONS[path];
  if (translation) {
    const [englishName, englishDescription, hungarianName = node.name] = translation;
    node.name_localizations = { ...Object.fromEntries(ENGLISH_LOCALES.map((locale) => [locale, englishName])), hu: hungarianName };
    if (node.description) {
      node.description_localizations = {
        hu: node.description,
        ...Object.fromEntries(ENGLISH_LOCALES.map((locale) => [locale, englishDescription]))
      };
    }
  }
  const choices = CHOICE_TRANSLATIONS[path];
  if (choices && Array.isArray(node.choices)) {
    for (const choice of node.choices) {
      const english = choices[choice.value];
      if (english) choice.name_localizations = { hu: choice.name, ...Object.fromEntries(ENGLISH_LOCALES.map((locale) => [locale, english])) };
    }
  }
  for (const option of node.options || []) localizeNode(option, `${path}.${option.name}`);
  return node;
}

function localizeCommandJson(command) {
  const localized = JSON.parse(JSON.stringify(command));
  return localizeNode(localized, localized.name);
}

const CANONICAL_COMMAND_NAMES = new Map();
for (const [path, translation] of Object.entries(TRANSLATIONS)) {
  if (path.includes('.')) continue;
  CANONICAL_COMMAND_NAMES.set(path.toLowerCase(), path);
  if (translation?.[0]) CANONICAL_COMMAND_NAMES.set(String(translation[0]).toLowerCase(), path);
  if (translation?.[2]) CANONICAL_COMMAND_NAMES.set(String(translation[2]).toLowerCase(), path);
}

function canonicalCommandName(name) {
  const input = String(name || '').toLowerCase();
  return CANONICAL_COMMAND_NAMES.get(input) || input;
}

module.exports = { TRANSLATIONS, localizeCommandJson, canonicalCommandName };
