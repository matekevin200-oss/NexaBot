const crypto = require('node:crypto');
const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  dbQuery,
  getGuildConfig,
  setGuildConfig,
  planAllowsModule,
  isPersistentStore
} = require('./config');

const ARCHITECT_VERSION = 20;
const ARCHITECT_FOOTER = 'NEXA OS Studio 20 • managed';
const architectFallback = new Map();
const architectLocks = new Set();
const architectSigningKey = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ALLOWED_MODULES = new Set(['protection', 'moderation', 'tickets', 'welcome', 'logging', 'verification', 'reactionRoles', 'shift', 'levels', 'suggestions', 'giveaways', 'tempVoice', 'starboard', 'reminders', 'customCommands', 'ai']);
const STUDIO_TEMPLATES = new Set(['smart', 'community', 'gaming', 'creator', 'support', 'clan', 'business', 'agency']);
const STUDIO_FEATURES = new Set(['tickets', 'verification', 'moderation', 'security', 'levels', 'events', 'applications', 'shift', 'voice', 'suggestions', 'reactionRoles', 'giveaways', 'ai']);
const PERMISSIONS = Object.freeze({
  ViewAuditLog: PermissionFlagsBits.ViewAuditLog,
  ManageGuild: PermissionFlagsBits.ManageGuild,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ManageRoles: PermissionFlagsBits.ManageRoles,
  ManageWebhooks: PermissionFlagsBits.ManageWebhooks,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  ManageThreads: PermissionFlagsBits.ManageThreads,
  KickMembers: PermissionFlagsBits.KickMembers,
  BanMembers: PermissionFlagsBits.BanMembers,
  ModerateMembers: PermissionFlagsBits.ModerateMembers,
  ManageNicknames: PermissionFlagsBits.ManageNicknames,
  MoveMembers: PermissionFlagsBits.MoveMembers,
  MentionEveryone: PermissionFlagsBits.MentionEveryone
});

function cleanText(value, fallback = '', max = 100) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  return text || fallback;
}

function safeKey(value, fallback) {
  const key = String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return key || fallback;
}

function uniqueKey(base, used) {
  let key = base;
  let index = 2;
  while (used.has(key)) key = `${base.slice(0, 35)}_${index++}`;
  used.add(key);
  return key;
}

function channelName(value, fallback) {
  const cleaned = cleanText(value, fallback, 100)
    .replace(/[@#:`]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-');
  return cleaned.slice(0, 100) || fallback;
}

function validColor(value, fallback = '#4b9dff') {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function hasSecret(value) {
  const text = String(value || '');
  return /(?:sk-(?:live|test|proj)-|whsec_|mfa\.|[\w-]{23,28}\.[\w-]{6}\.[\w-]{25,})/i.test(text);
}

function sanitizeBlueprint(input = {}, defaults = {}) {
  const roleKeys = new Set();
  const categoryKeys = new Set();
  const channelKeys = new Set();
  const roleNames = new Set();
  const channelNames = new Set();
  const roles = [];

  for (const [index, raw] of (Array.isArray(input.roles) ? input.roles : []).slice(0, 20).entries()) {
    const key = uniqueKey(safeKey(raw?.key, `role_${index + 1}`), roleKeys);
    let name = cleanText(raw?.name, `Role ${index + 1}`, 100).replace(/@everyone|@here/gi, '').trim();
    if (!name) name = `Role ${index + 1}`;
    if (roleNames.has(name.toLowerCase())) name = `${name} ${index + 1}`.slice(0, 100);
    roleNames.add(name.toLowerCase());
    roles.push({
      key,
      name,
      color: validColor(raw?.color, index === 0 ? '#d4af37' : '#4b9dff'),
      hoist: raw?.hoist !== false,
      mentionable: Boolean(raw?.mentionable),
      permissions: [...new Set((Array.isArray(raw?.permissions) ? raw.permissions : []).filter((name) => Object.hasOwn(PERMISSIONS, name)))].slice(0, 12)
    });
  }
  if (!roles.length) {
    roles.push(
      { key: 'management', name: '🛡️ Vezetőség', color: '#d4af37', hoist: true, mentionable: false, permissions: ['ViewAuditLog', 'ManageChannels', 'ManageRoles', 'ManageMessages', 'ModerateMembers'] },
      { key: 'member', name: '✅ Tag', color: '#57f287', hoist: false, mentionable: false, permissions: [] }
    );
    roleKeys.add('management');
    roleKeys.add('member');
  }

  const categories = [];
  let channelCount = 0;
  for (const [categoryIndex, rawCategory] of (Array.isArray(input.categories) ? input.categories : []).slice(0, 15).entries()) {
    if (channelCount >= 60) break;
    const key = uniqueKey(safeKey(rawCategory?.key, `category_${categoryIndex + 1}`), categoryKeys);
    const visibility = ['public', 'restricted', 'private'].includes(rawCategory?.visibility) ? rawCategory.visibility : 'public';
    const accessRoleKeys = [...new Set((Array.isArray(rawCategory?.accessRoleKeys) ? rawCategory.accessRoleKeys : []).map((item) => safeKey(item, '')).filter((item) => roleKeys.has(item)))].slice(0, 15);
    if (visibility !== 'public' && !accessRoleKeys.length) accessRoleKeys.push(roles[0].key);
    const channels = [];
    for (const [channelIndex, rawChannel] of (Array.isArray(rawCategory?.channels) ? rawCategory.channels : []).entries()) {
      if (channelCount >= 60 || channels.length >= 15) break;
      const type = rawChannel?.type === 'voice' ? 'voice' : 'text';
      const channelKey = uniqueKey(safeKey(rawChannel?.key, `${key}_channel_${channelIndex + 1}`), channelKeys);
      let name = channelName(rawChannel?.name, type === 'voice' ? `Voice ${channelIndex + 1}` : `channel-${channelIndex + 1}`);
      if (channelNames.has(name.toLowerCase())) name = `${name}-${channelIndex + 1}`.slice(0, 100);
      channelNames.add(name.toLowerCase());
      channels.push({
        key: channelKey,
        name,
        type,
        topic: type === 'text' ? cleanText(rawChannel?.topic, '', 900) : '',
        readonly: type === 'text' && Boolean(rawChannel?.readonly),
        writeRoleKeys: [...new Set((Array.isArray(rawChannel?.writeRoleKeys) ? rawChannel.writeRoleKeys : []).map((item) => safeKey(item, '')).filter((item) => roleKeys.has(item)))].slice(0, 10)
      });
      channelCount += 1;
    }
    if (channels.length) categories.push({
      key,
      name: cleanText(rawCategory?.name, `━━━ ${categoryIndex + 1} ━━━`, 100),
      visibility,
      accessRoleKeys,
      channels
    });
  }
  if (!categories.length) throw new Error('Az építési terv nem tartalmaz használható kategóriát és csatornát.');

  const textChannelKeys = new Set(categories.flatMap((category) => category.channels.filter((channel) => channel.type === 'text').map((channel) => channel.key)));
  const panels = (Array.isArray(input.panels) ? input.panels : []).slice(0, 20).map((raw, index) => ({
    channelKey: safeKey(raw?.channelKey, ''),
    title: cleanText(raw?.title, `NEXA panel ${index + 1}`, 200),
    description: cleanText(raw?.description, 'A szerver hivatalos információs felülete.', 3500),
    color: validColor(raw?.color, '#4b9dff')
  })).filter((panel) => textChannelKeys.has(panel.channelKey));

  return {
    version: ARCHITECT_VERSION,
    name: cleanText(input.name, defaults.name || 'NEXA professzionális szerver', 80),
    summary: cleanText(input.summary, defaults.summary || 'Biztonságosan újrafuttatható NEXA szerverstruktúra.', 500),
    language: input.language === 'en' ? 'en' : 'hu',
    themeColor: validColor(input.themeColor, '#4b9dff'),
    modules: [...new Set((Array.isArray(input.modules) ? input.modules : []).filter((key) => ALLOWED_MODULES.has(key)))],
    studio: {
      template: STUDIO_TEMPLATES.has(input.studio?.template) ? input.studio.template : 'smart',
      scale: ['compact', 'professional', 'enterprise'].includes(input.studio?.scale) ? input.studio.scale : 'professional',
      features: [...new Set((Array.isArray(input.studio?.features) ? input.studio.features : []).filter((key) => STUDIO_FEATURES.has(key)))],
      engine: 'nexa-os-local-v20'
    },
    roles,
    categories,
    panels
  };
}

function localBlueprint(prompt, language = 'hu', scale = 'professional', guildName = '', studioOptions = {}) {
  const hu = language !== 'en';
  const text = String(prompt || '').toLocaleLowerCase(hu ? 'hu-HU' : 'en-US');
  const requestedTemplate = STUDIO_TEMPLATES.has(studioOptions.template) ? studioOptions.template : 'smart';
  const detectedTemplate = /cia|fbi|rendőr|police|sheriff|ügynök|agency|hírszer|katon|military|frakci/.test(text)
    ? 'agency'
    : /stream|youtube|twitch|tartalom|creator/.test(text)
      ? 'creator'
      : /support|segíts|ticket|ügyfélszolg/.test(text)
        ? 'support'
        : /gaming|játék|esport|roblox|fivem|erlc/.test(text)
          ? 'gaming'
          : /clan|klán|csapat|team/.test(text)
            ? 'clan'
            : /business|vállalkoz|cég|company/.test(text)
              ? 'business'
              : 'community';
  const template = requestedTemplate === 'smart' ? detectedTemplate : requestedTemplate;
  const agency = template === 'agency';
  const roleplay = agency || /\brp\b|roleplay|város|city|erlc|fivem|roblox/.test(text);
  const support = template === 'support' || /support|segíts|ticket|ügyfélszolg/.test(text);
  const gaming = ['gaming', 'clan'].includes(template) || /gaming|játék|clan|klán|esport/.test(text);
  const streamer = template === 'creator' || /stream|youtube|twitch|tartalom|creator/.test(text);
  const defaults = ['tickets', 'verification', 'moderation', 'security', 'voice', 'suggestions'];
  if (gaming || roleplay) defaults.push('levels', 'events', 'reactionRoles', 'giveaways');
  if (roleplay || agency) defaults.push('applications', 'shift');
  const requestedFeatures = (Array.isArray(studioOptions.features) ? studioOptions.features : []).filter((key) => STUDIO_FEATURES.has(key));
  const features = new Set(requestedFeatures.length ? requestedFeatures : defaults);
  const label = (hungarian, english) => hu ? hungarian : english;
  const roles = agency ? [
    ['director', '👑 Director', '#d4af37', ['ViewAuditLog', 'ManageGuild', 'ManageChannels', 'ManageRoles', 'ManageWebhooks', 'ManageMessages', 'ManageThreads', 'KickMembers', 'BanMembers', 'ModerateMembers']],
    ['deputy', '⭐ Deputy Director', '#c0392b', ['ViewAuditLog', 'ManageChannels', 'ManageRoles', 'ManageMessages', 'ManageThreads', 'KickMembers', 'ModerateMembers']],
    ['command', '🎖️ Command Staff', '#9b59b6', ['ViewAuditLog', 'ManageChannels', 'ManageMessages', 'ManageThreads', 'ModerateMembers']],
    ['senior', '🕶️ Senior Officer', '#2980b9', ['ManageMessages', 'ManageThreads']],
    ['officer', '📡 Operations Officer', '#3498db', []],
    ['trainee', '🎓 Trainee', '#2ecc71', []],
    ['verified', label('✅ Ellenőrzött állomány', '✅ Cleared Personnel'), '#57f287', []],
    ['alerts', label('🚨 Műveleti riasztás', '🚨 Operation Alerts'), '#e67e22', []]
  ] : [
    ['owner_team', label('👑 Tulajdonosi csapat', '👑 Ownership Team'), '#d4af37', ['ViewAuditLog', 'ManageGuild', 'ManageChannels', 'ManageRoles', 'ManageWebhooks', 'ManageMessages', 'ManageThreads']],
    ['management', label('🛡️ Vezetőség', '🛡️ Management'), '#e74c3c', ['ViewAuditLog', 'ManageChannels', 'ManageRoles', 'ManageMessages', 'ManageThreads', 'KickMembers', 'BanMembers', 'ModerateMembers']],
    ['administrator', label('⚙️ Adminisztrátor', '⚙️ Administrator'), '#9b59b6', ['ViewAuditLog', 'ManageChannels', 'ManageMessages', 'ManageThreads', 'KickMembers', 'ModerateMembers']],
    ['moderator', label('🔨 Moderátor', '🔨 Moderator'), '#3498db', ['ManageMessages', 'ManageThreads', 'ModerateMembers']],
    ['support', label('🎫 Ügyfélszolgálat', '🎫 Support Team'), '#1abc9c', ['ManageMessages', 'ManageThreads']],
    ['member', label('✅ Tag', '✅ Member'), '#57f287', []],
    ['announcements', label('📢 Értesítések', '📢 Announcements'), '#f1c40f', []],
    ['bots', label('🤖 Botok', '🤖 Bots'), '#95a5a6', []]
  ];
  const roleObjects = roles.map(([key, name, color, permissions], index) => ({ key, name, color, permissions, hoist: index < 6, mentionable: key === 'alerts' || key === 'announcements' }));
  const staffKeys = agency ? ['director', 'deputy', 'command', 'senior'] : ['owner_team', 'management', 'administrator', 'moderator', 'support'];
  const memberKeys = agency ? ['verified', ...staffKeys, 'officer', 'trainee'] : ['member', ...staffKeys];
  const startChannels = [
      { key: 'welcome', name: label('👋・üdvözlés', '👋・welcome'), type: 'text', readonly: true, writeRoleKeys: staffKeys, topic: label('Üdvözlés és belépési információk.', 'Welcome and onboarding information.') },
      { key: 'rules', name: label('📜・szabályzat', '📜・rules'), type: 'text', readonly: true, writeRoleKeys: staffKeys, topic: label('A szerver hivatalos szabályzata.', 'Official server rules.') },
      { key: 'announcements', name: label('📢・közlemények', '📢・announcements'), type: 'text', readonly: true, writeRoleKeys: staffKeys, topic: label('Hivatalos közlemények.', 'Official announcements.') }
  ];
  if (features.has('verification')) startChannels.push({ key: 'verification', name: label('✅・ellenőrzés', '✅・verification'), type: 'text', readonly: true, writeRoleKeys: staffKeys, topic: label('Tagellenőrzési központ.', 'Member verification center.') });
  const communityChannels = [
      { key: 'general', name: label('💬・társalgó', '💬・general'), type: 'text', topic: label('Közösségi beszélgetés.', 'Community conversation.') },
      { key: 'media', name: label('📸・média', '📸・media'), type: 'text', topic: label('Képek és videók.', 'Images and videos.') },
      { key: 'bot_commands', name: label('🤖・bot-parancsok', '🤖・bot-commands'), type: 'text', topic: label('Botparancsok helye.', 'Bot commands.') }
  ];
  if (features.has('suggestions')) communityChannels.push({ key: 'suggestions', name: label('💡・ötletek', '💡・suggestions'), type: 'text', topic: label('Közösségi ötletek és szavazások.', 'Community ideas and voting.') });
  if (features.has('voice')) communityChannels.push({ key: 'lounge', name: label('🔊・Társalgó', '🔊・General Voice'), type: 'voice' });
  const categories = [
    { key: 'start', name: label('━━━ 01 • KEZDÉS ━━━', '━━━ 01 • START HERE ━━━'), visibility: 'public', accessRoleKeys: [], channels: startChannels },
    { key: 'community', name: label('━━━ 10 • KÖZÖSSÉG ━━━', '━━━ 10 • COMMUNITY ━━━'), visibility: 'restricted', accessRoleKeys: memberKeys, channels: communityChannels }
  ];
  if (features.has('tickets')) categories.push({ key: 'support', name: label('━━━ 20 • ÜGYINTÉZÉS ━━━', '━━━ 20 • SUPPORT ━━━'), visibility: 'public', accessRoleKeys: [], channels: [
      { key: 'ticket_panel', name: label('🎫・segítségkérés', '🎫・open-a-ticket'), type: 'text', readonly: true, writeRoleKeys: staffKeys, topic: label('NEXA ticketnyitó panel.', 'NEXA ticket panel.') },
      { key: 'reports', name: label('📨・bejelentések', '📨・reports'), type: 'text', readonly: true, writeRoleKeys: staffKeys, topic: label('Bizalmas bejelentések indítása.', 'Start confidential reports.') }
  ]});
  if (gaming) categories.push({ key: 'gaming', name: label('━━━ 25 • JÁTÉK ÉS CSAPAT ━━━', '━━━ 25 • GAMING & TEAM ━━━'), visibility: 'restricted', accessRoleKeys: memberKeys, channels: [
    { key: 'looking_for_group', name: label('🎮・csapatkereső', '🎮・looking-for-group'), type: 'text', topic: label('Játékos- és csapatkereső.', 'Find players and teams.') },
    { key: 'clips', name: label('🎬・klipek', '🎬・clips'), type: 'text', topic: label('Klipek és eredmények.', 'Clips and results.') },
    ...(features.has('voice') ? [{ key: 'gaming_voice', name: label('🔊・Játék szoba', '🔊・Gaming Room'), type: 'voice' }] : [])
  ]});
  if (roleplay || features.has('applications')) categories.push(
    { key: 'recruitment', name: label('━━━ 30 • FELVÉTEL ━━━', '━━━ 30 • RECRUITMENT ━━━'), visibility: 'public', accessRoleKeys: [], channels: [
      { key: 'recruitment_info', name: label('📋・felvételi-információk', '📋・recruitment-info'), type: 'text', readonly: true, writeRoleKeys: staffKeys },
      { key: 'applications', name: label('📝・jelentkezés', '📝・applications'), type: 'text', readonly: true, writeRoleKeys: staffKeys },
      { key: 'application_results', name: label('✅・eredmények', '✅・results'), type: 'text', readonly: true, writeRoleKeys: staffKeys }
    ]}
  );
  if (roleplay || features.has('shift')) categories.push(
    { key: 'operations', name: label('━━━ 40 • MŰVELETEK ━━━', '━━━ 40 • OPERATIONS ━━━'), visibility: 'private', accessRoleKeys: memberKeys, channels: [
      { key: 'briefings', name: label('🗺️・eligazítás', '🗺️・briefings'), type: 'text', readonly: true, writeRoleKeys: staffKeys },
      { key: 'operations_chat', name: label('📡・műveleti-központ', '📡・operations-center'), type: 'text' },
      { key: 'documents', name: label('📄・ügyiratok', '📄・records'), type: 'text' },
      { key: 'operations_voice', name: label('🔊・Műveleti rádió', '🔊・Operations Radio'), type: 'voice' }
    ]}
  );
  if (streamer) categories.push({ key: 'content', name: label('━━━ 50 • TARTALOM ━━━', '━━━ 50 • CONTENT ━━━'), visibility: 'restricted', accessRoleKeys: memberKeys, channels: [
    { key: 'new_content', name: label('🎬・új-tartalmak', '🎬・new-content'), type: 'text', readonly: true, writeRoleKeys: staffKeys },
    { key: 'content_calendar', name: label('🗓️・tartalomnaptár', '🗓️・content-calendar'), type: 'text', readonly: true, writeRoleKeys: staffKeys },
    { key: 'creator_ideas', name: label('💡・tartalomötletek', '💡・content-ideas'), type: 'text' }
  ]});
  if (features.has('events')) categories.push({ key: 'events', name: label('━━━ 60 • ESEMÉNYEK ━━━', '━━━ 60 • EVENTS ━━━'), visibility: 'restricted', accessRoleKeys: memberKeys, channels: [
    { key: 'event_announcements', name: label('📅・események', '📅・events'), type: 'text', readonly: true, writeRoleKeys: staffKeys },
    { key: 'event_chat', name: label('🎉・esemény-társalgó', '🎉・event-chat'), type: 'text' }
  ]});
  const staffChannels = [
    { key: 'staff_chat', name: label('🛡️・staff-társalgó', '🛡️・staff-chat'), type: 'text', topic: label('Belső staff koordináció.', 'Private staff coordination.') },
    { key: 'logs', name: label('📋・minden-log', '📋・all-logs'), type: 'text', readonly: true, writeRoleKeys: staffKeys, topic: label('NEXA rendszer- és moderációs napló.', 'NEXA system and moderation logs.') }
  ];
  if (features.has('security')) staffChannels.push({ key: 'security_logs', name: label('🚨・biztonsági-log', '🚨・security-log'), type: 'text', readonly: true, writeRoleKeys: staffKeys, topic: label('Anti-Raid és Anti-Nuke események.', 'Anti-Raid and Anti-Nuke events.') });
  if (features.has('voice')) staffChannels.push({ key: 'staff_voice', name: label('🔊・Staff szoba', '🔊・Staff Room'), type: 'voice' });
  categories.push({ key: 'staff', name: label('━━━ 90 • STAFF ━━━', '━━━ 90 • STAFF ━━━'), visibility: 'private', accessRoleKeys: staffKeys, channels: staffChannels });
  if (scale === 'enterprise') categories.push({ key: 'leadership', name: label('━━━ 99 • VEZETŐSÉGI KÖZPONT ━━━', '━━━ 99 • EXECUTIVE CENTER ━━━'), visibility: 'private', accessRoleKeys: staffKeys.slice(0, 3), channels: [
    { key: 'executive_chat', name: label('👑・vezetőségi-társalgó', '👑・executive-chat'), type: 'text' },
    { key: 'audit_review', name: label('🔎・audit-ellenőrzés', '🔎・audit-review'), type: 'text', readonly: true, writeRoleKeys: staffKeys.slice(0, 3) },
    { key: 'executive_voice', name: label('🔊・Vezetőségi terem', '🔊・Executive Room'), type: 'voice' }
  ]});
  let finalCategories = categories;
  if (scale === 'compact') finalCategories = categories.filter((category) => ['start', 'community', 'support', 'staff'].includes(category.key));
  const panels = [
    { channelKey: 'welcome', title: label(`👋 Üdvözlünk a ${guildName || 'szerveren'}!`, `👋 Welcome to ${guildName || 'the server'}!`), description: label('Olvasd el a szabályzatot, végezd el az ellenőrzést, majd válaszd ki a számodra szükséges értesítéseket.', 'Read the rules, complete verification and choose the notifications you need.'), color: '#4b9dff' },
    { channelKey: 'rules', title: label('📜 Szerver szabályzat', '📜 Server Rules'), description: label('Tiszteld a közösséget, kerüld a spamet, a zaklatást és a jogosulatlan reklámot. Kövesd a Discord szabályait és a staff utasításait.', 'Respect the community, avoid spam, harassment and unauthorized advertising. Follow Discord rules and staff instructions.'), color: '#5ed8c4' }
  ];
  if (features.has('tickets')) panels.push({ channelKey: 'ticket_panel', title: label('🎫 Segítségkérés', '🎫 Support Center'), description: label('A NEXA ticketpanelen biztonságosan kérhetsz segítséget a stafftól.', 'Use the NEXA ticket panel to contact the staff securely.'), color: '#4b9dff' });
  const modules = ['welcome', 'logging'];
  if (features.has('security')) modules.push('protection');
  if (features.has('moderation')) modules.push('moderation');
  if (features.has('tickets')) modules.push('tickets');
  if (features.has('verification')) modules.push('verification');
  if (features.has('reactionRoles')) modules.push('reactionRoles');
  if (features.has('shift')) modules.push('shift');
  if (features.has('levels')) modules.push('levels');
  if (features.has('suggestions')) modules.push('suggestions');
  if (features.has('giveaways')) modules.push('giveaways');
  if (features.has('voice')) modules.push('tempVoice');
  if (features.has('ai')) modules.push('ai');
  return sanitizeBlueprint({
    name: cleanText(prompt.split(/\r?\n/)[0], `${guildName} professzionális rendszer`, 80),
    summary: label(`NEXA OS 20 ${template} sablon • helyi, biztonságosan újrafuttatható szerverstruktúra.`, `NEXA OS 20 ${template} blueprint • local and safely reusable server structure.`),
    language,
    themeColor: '#4b9dff',
    studio: { template, scale, features: [...features] },
    modules,
    roles: roleObjects,
    categories: finalCategories,
    panels
  }, { name: guildName });
}

async function generateServerBlueprint({ guild, prompt, language = 'hu', scale = 'professional', template = 'smart', features = [] }) {
  const request = cleanText(prompt, '', 4000);
  if (request.length < 15) throw new Error('Írd le legalább 15 karakterben, milyen szervert szeretnél.');
  if (hasSecret(request)) throw new Error('A leírás API-kulcsnak, tokennek vagy más titkos adatnak tűnik. Titkos adatot ne adj meg.');
  const selectedTemplate = STUDIO_TEMPLATES.has(template) ? template : 'smart';
  const selectedFeatures = (Array.isArray(features) ? features : []).filter((key) => STUDIO_FEATURES.has(key));
  const plan = localBlueprint(request, language, scale, guild?.name || '', { template: selectedTemplate, features: selectedFeatures });
  return { plan, source: 'nexa-os-local-v20', warning: '' };
}

function planHash(plan) {
  return crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');
}

function signBlueprintToken(plan, guildId, ownerId) {
  const payload = Buffer.from(JSON.stringify({ guildId: String(guildId), ownerId: String(ownerId), expiresAt: Date.now() + 30 * 60 * 1000, nonce: crypto.randomBytes(12).toString('hex'), plan })).toString('base64url');
  const signature = crypto.createHmac('sha256', architectSigningKey).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyBlueprintToken(token, guildId, ownerId) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) throw new Error('Az építési terv aláírása hiányzik. Készíts új előnézetet.');
  const expected = crypto.createHmac('sha256', architectSigningKey).update(payload).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) throw new Error('Az építési tervet módosították vagy megsérült.');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (decoded.guildId !== String(guildId) || decoded.ownerId !== String(ownerId)) throw new Error('Az építési terv másik szerverhez vagy tulajdonoshoz tartozik.');
  if (Number(decoded.expiresAt || 0) < Date.now()) throw new Error('Az előnézet lejárt. Készíts új tervet.');
  return sanitizeBlueprint(decoded.plan, { name: 'NEXA szerver' });
}

async function latestArchitectDeployment(guildId) {
  const result = await dbQuery('SELECT * FROM nexabot_architect_deployments WHERE guild_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT 1', [String(guildId), 'completed']).catch(() => null);
  if (result?.rows?.[0]) return result.rows[0];
  return architectFallback.get(String(guildId)) || null;
}

async function architectDeploymentHistory(guildId, limit = 8) {
  const safeLimit = Math.min(20, Math.max(1, Number.parseInt(limit, 10) || 8));
  const result = await dbQuery(
    `SELECT plan_hash, prompt, plan, applied_by, status, result_summary, created_at
     FROM nexabot_architect_deployments
     WHERE guild_id=$1
     ORDER BY created_at DESC
     LIMIT $2`,
    [String(guildId), safeLimit]
  ).catch(() => null);
  if (result?.rows?.length) return result.rows;
  const fallback = architectFallback.get(String(guildId));
  return fallback ? [fallback] : [];
}

function objectValue(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_error) { return {}; }
}

function blueprintSimulation(guild, planInput, previousDeployment = null) {
  const plan = sanitizeBlueprint(planInput, { name: guild?.name || 'NEXA szerver' });
  const resources = objectValue(previousDeployment?.resources);
  const findRole = (spec) => {
    const tracked = resources.roles?.[spec.key] ? guild.roles.cache.get(resources.roles[spec.key]) : null;
    return tracked && !tracked.managed ? tracked : guild.roles.cache.find((item) => !item.managed && item.name === spec.name);
  };
  const findCategory = (spec) => {
    const tracked = resources.categories?.[spec.key] ? guild.channels.cache.get(resources.categories[spec.key]) : null;
    return tracked?.type === ChannelType.GuildCategory ? tracked : guild.channels.cache.find((item) => item.type === ChannelType.GuildCategory && item.name === spec.name);
  };
  const findChannel = (spec) => {
    const tracked = resources.channels?.[spec.key] ? guild.channels.cache.get(resources.channels[spec.key]) : null;
    const expectedType = spec.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
    return tracked?.type === expectedType ? tracked : guild.channels.cache.find((item) => item.type === expectedType && item.name === spec.name);
  };
  const rolesUpdate = plan.roles.filter(findRole).length;
  const categoriesUpdate = plan.categories.filter(findCategory).length;
  const allChannels = plan.categories.flatMap((category) => category.channels);
  const channelsUpdate = allChannels.filter(findChannel).length;
  const config = getGuildConfig(guild.id);
  const modulesEnable = plan.modules.filter((key) => !config.modules?.[key] && planAllowsModule(guild.id, key)).length;
  const botMember = guild.members.me;
  const missingPermissions = [];
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) missingPermissions.push('Csatornák kezelése');
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) missingPermissions.push('Rangok kezelése');
  const warnings = [];
  if (!botMember?.permissions.has(PermissionFlagsBits.ViewAuditLog)) warnings.push('Az Auditnapló megtekintése jog ajánlott a teljes biztonsági elemzéshez.');
  if (guild.roles.cache.size + (plan.roles.length - rolesUpdate) >= 245) warnings.push('A szerver közel van a Discord rangkorlátjához.');
  if (guild.channels.cache.size + (allChannels.length - channelsUpdate) + (plan.categories.length - categoriesUpdate) >= 490) warnings.push('A szerver közel van a Discord csatornakorlátjához.');
  if (!isPersistentStore()) warnings.push('A PostgreSQL nem elérhető; a telepítési előzmény újraindítás után elveszhet.');
  const blocked = missingPermissions.length > 0;
  const score = Math.max(0, 100 - missingPermissions.length * 30 - warnings.length * 8);
  return {
    score,
    status: blocked ? 'blocked' : warnings.length ? 'warning' : 'ready',
    missingPermissions,
    warnings,
    destructiveChanges: 0,
    operations: (plan.roles.length + plan.categories.length + allChannels.length + plan.panels.length + modulesEnable),
    roles: { create: plan.roles.length - rolesUpdate, update: rolesUpdate },
    categories: { create: plan.categories.length - categoriesUpdate, update: categoriesUpdate },
    channels: { create: allChannels.length - channelsUpdate, update: channelsUpdate },
    panels: { publish: plan.panels.length },
    modules: { enable: modulesEnable }
  };
}

async function saveArchitectDeployment(guildId, prompt, plan, resources, actorId, summary) {
  const row = {
    guild_id: String(guildId), prompt: cleanText(prompt, '', 4000), plan, resources, applied_by: String(actorId),
    plan_hash: planHash(plan), status: 'completed', result_summary: summary, created_at: new Date().toISOString()
  };
  architectFallback.set(String(guildId), row);
  await dbQuery(
    `INSERT INTO nexabot_architect_deployments (guild_id, plan_hash, prompt, plan, resources, applied_by, status, result_summary)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,'completed',$7::jsonb)`,
    [row.guild_id, row.plan_hash, row.prompt, JSON.stringify(plan), JSON.stringify(resources), row.applied_by, JSON.stringify(summary)]
  ).catch(() => null);
  return row;
}

function categoryPermissions(guild, category, roles) {
  const everyone = guild.roles.everyone.id;
  const botId = guild.members.me?.id || guild.client.user?.id;
  const botAccess = botId ? [{
    id: botId,
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]
  }] : [];
  if (category.visibility === 'public') {
    return [{ id: everyone, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.UseApplicationCommands] }, ...botAccess];
  }
  return [
    { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
    ...botAccess,
    ...category.accessRoleKeys.map((key) => roles[key]).filter(Boolean).map((role) => ({
      id: role.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.UseApplicationCommands]
    }))
  ];
}

function colorNumber(hex) {
  return Number.parseInt(String(hex).replace('#', ''), 16);
}

async function applyServerBlueprint(guild, planInput, actorId, options = {}) {
  const plan = sanitizeBlueprint(planInput, { name: guild.name });
  if (architectLocks.has(guild.id)) throw new Error('Ezen a szerveren már folyamatban van egy NEXA OS Studio művelet.');
  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels) || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('A NEXA Botnak Rangok kezelése és Csatornák kezelése jogosultság szükséges.');
  }
  architectLocks.add(guild.id);
  try {
    await Promise.allSettled([guild.roles.fetch(), guild.channels.fetch()]);
    const previous = await latestArchitectDeployment(guild.id);
    const previousResources = previous?.resources && typeof previous.resources === 'object' ? previous.resources : {};
    const roles = {};
    const categories = {};
    const channels = {};
    const summary = { rolesCreated: 0, rolesUpdated: 0, categoriesCreated: 0, categoriesUpdated: 0, channelsCreated: 0, channelsUpdated: 0, panelsPublished: 0 };

    for (const spec of plan.roles) {
      let role = previousResources.roles?.[spec.key] ? guild.roles.cache.get(previousResources.roles[spec.key]) : null;
      if (!role || role.managed) role = guild.roles.cache.find((item) => !item.managed && item.name === spec.name);
      const data = { name: spec.name, color: colorNumber(spec.color), hoist: spec.hoist, mentionable: spec.mentionable, permissions: spec.permissions.map((name) => PERMISSIONS[name]), reason: `NEXA OS Studio by ${actorId}` };
      if (!role) {
        role = await guild.roles.create(data);
        summary.rolesCreated += 1;
      } else {
        role = await role.edit(data);
        summary.rolesUpdated += 1;
      }
      roles[spec.key] = role;
    }
    const top = botMember.roles.highest.position;
    await guild.roles.setPositions(plan.roles.map((spec, index) => roles[spec.key] ? ({ role: roles[spec.key], position: Math.max(1, top - index - 1) }) : null).filter(Boolean)).catch(() => null);
    const ownerRole = roles[plan.roles[0]?.key];
    const ownerMember = await guild.members.fetch(actorId).catch(() => null);
    if (ownerMember && ownerRole && ownerRole.editable && !ownerMember.roles.cache.has(ownerRole.id)) await ownerMember.roles.add(ownerRole, 'NEXA OS Studio primary owner role').catch(() => null);

    for (const [categoryIndex, categorySpec] of plan.categories.entries()) {
      let category = previousResources.categories?.[categorySpec.key] ? guild.channels.cache.get(previousResources.categories[categorySpec.key]) : null;
      if (!category || category.type !== ChannelType.GuildCategory) category = guild.channels.cache.find((item) => item.type === ChannelType.GuildCategory && item.name === categorySpec.name);
      const permissions = categoryPermissions(guild, categorySpec, roles);
      if (!category) {
        category = await guild.channels.create({ name: categorySpec.name, type: ChannelType.GuildCategory, permissionOverwrites: permissions, reason: `NEXA OS Studio by ${actorId}` });
        summary.categoriesCreated += 1;
      } else {
        await category.edit({ name: categorySpec.name, permissionOverwrites: permissions, reason: `NEXA OS Studio by ${actorId}` });
        summary.categoriesUpdated += 1;
      }
      categories[categorySpec.key] = category;

      for (const [channelIndex, channelSpec] of categorySpec.channels.entries()) {
        const type = channelSpec.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
        let channel = previousResources.channels?.[channelSpec.key] ? guild.channels.cache.get(previousResources.channels[channelSpec.key]) : null;
        if (!channel || channel.type !== type) channel = guild.channels.cache.find((item) => item.type === type && item.name === channelSpec.name && item.parentId === category.id);
        const channelData = { name: channelSpec.name, type, parent: category.id, reason: `NEXA OS Studio by ${actorId}` };
        if (type === ChannelType.GuildText) channelData.topic = channelSpec.topic || null;
        if (!channel) {
          channel = await guild.channels.create(channelData);
          summary.channelsCreated += 1;
        } else {
          await channel.edit(channelData);
          summary.channelsUpdated += 1;
        }
        await channel.lockPermissions().catch(() => null);
        if (type === ChannelType.GuildText && channelSpec.readonly) {
          await channel.permissionOverwrites.edit(guild.roles.everyone.id, { SendMessages: false, SendMessagesInThreads: false, AddReactions: false }, { reason: 'NEXA OS Studio readonly channel' });
          for (const roleKey of channelSpec.writeRoleKeys) {
            if (roles[roleKey]) await channel.permissionOverwrites.edit(roles[roleKey].id, { ViewChannel: true, SendMessages: true, SendMessagesInThreads: true, AddReactions: true }, { reason: 'NEXA OS Studio writer role' });
          }
        }
        channels[channelSpec.key] = channel;
        await channel.setPosition(channelIndex).catch(() => null);
      }
      await category.setPosition(categoryIndex).catch(() => null);
    }

    for (const panel of plan.panels) {
      const channel = channels[panel.channelKey];
      if (!channel?.isTextBased()) continue;
      const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      const existing = recent?.find((message) => message.author.id === guild.client.user.id && message.embeds.some((embed) => String(embed.footer?.text || '').startsWith(ARCHITECT_FOOTER)));
      const payload = {
        embeds: [new EmbedBuilder().setColor(panel.color).setTitle(panel.title).setDescription(panel.description).setFooter({ text: `${ARCHITECT_FOOTER} • ${planHash(plan).slice(0, 10)}` }).setTimestamp()],
        allowedMentions: { parse: [] }
      };
      if (existing) await existing.edit(payload);
      else await channel.send(payload);
      summary.panelsPublished += 1;
    }

    const current = JSON.parse(JSON.stringify(getGuildConfig(guild.id)));
    for (const moduleKey of plan.modules) if (planAllowsModule(guild.id, moduleKey)) current.modules[moduleKey] = true;
    const channelByPattern = (...patterns) => Object.entries(channels).find(([key]) => patterns.some((pattern) => key.includes(pattern)))?.[1]?.id || null;
    const categoryByPattern = (...patterns) => Object.entries(categories).find(([key]) => patterns.some((pattern) => key.includes(pattern)))?.[1]?.id || null;
    const roleByPattern = (...patterns) => Object.entries(roles).find(([key]) => patterns.some((pattern) => key.includes(pattern)))?.[1]?.id || null;
    current.channels.welcome = channelByPattern('welcome') || current.channels.welcome;
    current.channels.announcements = channelByPattern('announcement', 'kozlemeny') || current.channels.announcements;
    current.channels.verification = channelByPattern('verification', 'ellenorzes') || current.channels.verification;
    current.channels.ticketPanel = channelByPattern('ticket_panel', 'ticket') || current.channels.ticketPanel;
    current.channels.ticketCategory = categoryByPattern('support', 'ticket', 'ugyintezes') || current.channels.ticketCategory;
    current.channels.logs = channelByPattern('logs', 'log') || current.channels.logs;
    current.channels.securityLogs = channelByPattern('security_logs', 'security') || current.channels.securityLogs;
    current.channels.moderationPanel = channelByPattern('staff_chat', 'moderation', 'operations_center') || current.channels.moderationPanel;
    current.channels.controlCenter = channelByPattern('staff_chat', 'operations_center', 'bot_commands') || current.channels.controlCenter;
    current.channels.shiftLogs = channelByPattern('service_logs', 'logs') || current.channels.shiftLogs;
    current.channels.warnings = channelByPattern('disciplinary', 'security_logs', 'logs') || current.channels.warnings;
    current.roles.staff = roleByPattern('management', 'command', 'staff', 'moderator') || current.roles.staff;
    current.roles.dashboard = roleByPattern('management', 'deputy', 'administrator') || current.roles.dashboard;
    current.roles.verified = roleByPattern('verified', 'member') || current.roles.verified;
    current.roles.auto = current.roles.verified || current.roles.auto;
    current.roles.shift = roleByPattern('officer', 'trainee', 'member') || current.roles.shift;
    current.language = plan.language;
    current.commandLanguage = plan.language;
    current.branding.primary = plan.themeColor;
    await setGuildConfig(guild.id, current);

    const resources = {
      roles: Object.fromEntries(Object.entries(roles).map(([key, role]) => [key, role.id])),
      categories: Object.fromEntries(Object.entries(categories).map(([key, category]) => [key, category.id])),
      channels: Object.fromEntries(Object.entries(channels).map(([key, channel]) => [key, channel.id]))
    };
    await saveArchitectDeployment(guild.id, options.prompt || previous?.prompt || '', plan, resources, actorId, summary);
    return { plan, resources, summary, persistent: isPersistentStore() };
  } finally {
    architectLocks.delete(guild.id);
  }
}

function blueprintStats(plan) {
  return {
    roles: plan.roles.length,
    categories: plan.categories.length,
    channels: plan.categories.reduce((sum, category) => sum + category.channels.length, 0),
    panels: plan.panels.length,
    modules: plan.modules.length
  };
}

module.exports = {
  ARCHITECT_FOOTER,
  applyServerBlueprint,
  architectDeploymentHistory,
  blueprintStats,
  blueprintSimulation,
  generateServerBlueprint,
  latestArchitectDeployment,
  planHash,
  sanitizeBlueprint,
  signBlueprintToken,
  verifyBlueprintToken
};
