const NAMES = Object.freeze({
  staffRole: 'NexaDev Staff',
  operativeRole: 'Operatív állomány',
  leadershipRole: 'Vezetőség',
  memberRole: 'Közösségi tag',
  acceptedRole: 'Felvett tag',
  infoCategory: '━━ INFORMÁCIÓK ━━',
  ticketCategory: '━━ TICKETEK ━━',
  staffCategory: '━━ STAFF ━━',
  welcomeChannel: '👋・üdvözlés',
  serviceChannel: '🎫・ügyintézés',
  applicationChannel: '📋・jelentkezés',
  staffPanelChannel: '🛡️・staff-vezérlő',
  logsChannel: '📑・napló',
  warningsChannel: '⚠️・figyelmeztetések',
  applicationReviewChannel: '📨・jelentkezések',
  securityLogsChannel: 'minden-log'
});

const COLORS = Object.freeze({
  primary: 0x7c5cff,
  success: 0x52e0a4,
  warning: 0xf4b942,
  danger: 0xef5b6c,
  neutral: 0x2b324a
});

const SUPPORT_GUILD_ID = '1556219615858655254';

module.exports = { NAMES, COLORS, SUPPORT_GUILD_ID };
