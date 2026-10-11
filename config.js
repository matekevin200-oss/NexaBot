const { Pool } = require('pg');
const { PermissionFlagsBits } = require('discord.js');
const { NAMES, SUPPORT_GUILD_ID } = require('./constants');

const cache = new Map();
const premiumCache = new Map();
const subscriptionCache = new Map();
let ownerSettings = {
  aiAllowedUsers: [],
  ownerUsers: [],
  rpGuilds: [],
  blacklistedUsers: [],
  blacklistedGuilds: [],
  maintenance: false,
  maintenanceMessage: 'A NexaBot jelenleg karbantartás alatt áll. Kérlek, próbáld újra később.',
  remoteDisabledModules: []
};
let pool = null;
let persistent = false;
let databaseInitPromise = null;
let databaseState = {
  state: process.env.DATABASE_URL ? 'disconnected' : 'disabled',
  lastConnectedAt: null,
  lastCheckedAt: null,
  lastError: null
};

function updateDatabaseState(state, error = null) {
  databaseState = {
    ...databaseState,
    state,
    lastCheckedAt: new Date(),
    lastConnectedAt: state === 'online' ? new Date() : databaseState.lastConnectedAt,
    lastError: error ? String(error.message || error).slice(0, 500) : state === 'online' ? null : databaseState.lastError
  };
}

function databaseHealth() {
  return {
    configured: Boolean(process.env.DATABASE_URL),
    persistent,
    state: databaseState.state,
    lastConnectedAt: databaseState.lastConnectedAt?.toISOString?.() || null,
    lastCheckedAt: databaseState.lastCheckedAt?.toISOString?.() || null,
    lastError: databaseState.lastError
  };
}

const MODULE_KEYS = Object.freeze([
  'protection',
  'moderation',
  'tickets',
  'welcome',
  'levels',
  'suggestions',
  'customCommands',
  'reactionRoles',
  'giveaways',
  'logging',
  'shift',
  'ai',
  'tempVoice',
  'verification',
  'starboard',
  'reminders',
  'bvi'
]);
const CHANNEL_KEYS = Object.freeze([
  'securityLogs',
  'logs',
  'controlCenter',
  'ai',
  'ticketPanel',
  'ticketCategory',
  'moderationPanel',
  'welcome',
  'goodbye',
  'warnings',
  'levels',
  'suggestions',
  'shiftLogs',
  'announcements',
  'verification',
  'starboard',
  'tempVoiceLobby',
  'tempVoiceCategory'
]);
const ROLE_KEYS = Object.freeze(['staff', 'auto', 'human', 'bot', 'dashboard', 'shift', 'verified']);
const LOG_KEYS = Object.freeze(['messageDelete', 'messageEdit', 'memberJoin', 'memberLeave', 'ban', 'timeout', 'roleUpdate', 'channelUpdate', 'voiceJoin', 'voiceLeave', 'nicknameChange', 'invite', 'moderation', 'automod', 'security']);

const PLAN_LEVELS = Object.freeze({ free: 0, pro: 1, ultimate: 2 });
const MODULE_MINIMUM_PLAN = Object.freeze({
  protection: 'pro',
  moderation: 'free',
  tickets: 'free',
  welcome: 'free',
  levels: 'pro',
  suggestions: 'pro',
  customCommands: 'pro',
  reactionRoles: 'pro',
  giveaways: 'pro',
  logging: 'free',
  shift: 'free',
  ai: 'ultimate',
  tempVoice: 'pro',
  verification: 'free',
  starboard: 'pro',
  reminders: 'free',
  bvi: 'ultimate'
});

function normalizePlan(value) {
  const plan = String(value || '').toLowerCase();
  if (plan === 'premium') return 'ultimate';
  return Object.hasOwn(PLAN_LEVELS, plan) ? plan : 'free';
}

function getGuildEntitlement(guildId) {
  const id = String(guildId || '');
  const candidates = [];
  if (isBviGuild(id)) candidates.push({ guildId: id, plan: 'ultimate', source: 'owner_rp', expiresAt: null, status: 'active' });
  const manual = premiumCache.get(id);
  if (manual?.status === 'active') {
    if (manual.expiresAt && manual.expiresAt.getTime() <= Date.now()) premiumCache.delete(id);
    else candidates.push({ ...manual, plan: normalizePlan(manual.plan) });
  }
  const subscription = subscriptionCache.get(id);
  if (subscription) {
    const validStatus = ['active', 'trialing'].includes(subscription.status)
      || (subscription.status === 'past_due' && (!subscription.expiresAt || subscription.expiresAt.getTime() > Date.now()));
    if (validStatus) candidates.push({ ...subscription, plan: normalizePlan(subscription.plan) });
  }
  if (!candidates.length) return { guildId: id, plan: 'free', source: 'default', expiresAt: null, status: 'active' };
  return candidates.sort((a, b) => PLAN_LEVELS[b.plan] - PLAN_LEVELS[a.plan])[0];
}

function getGuildPlan(guildId) {
  return getGuildEntitlement(guildId).plan;
}

function planAllows(guildId, requiredPlan = 'free') {
  return PLAN_LEVELS[getGuildPlan(guildId)] >= PLAN_LEVELS[normalizePlan(requiredPlan)];
}

function planAllowsModule(guildId, moduleKey) {
  if (moduleKey === 'bvi') return isBviGuild(guildId);
  return planAllows(guildId, MODULE_MINIMUM_PLAN[moduleKey] || 'free');
}

function cachePremiumRow(row) {
  if (!row?.guild_id) return;
  premiumCache.set(String(row.guild_id), {
    guildId: String(row.guild_id),
    plan: normalizePlan(row.premium_type),
    source: String(row.source || 'owner_gift'),
    status: String(row.status || 'active'),
    startsAt: row.starts_at ? new Date(row.starts_at) : new Date(),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    grantedBy: String(row.granted_by || ''),
    note: String(row.note || '')
  });
}

function cacheSubscriptionRow(row) {
  if (!row?.guild_id) return;
  subscriptionCache.set(String(row.guild_id), {
    guildId: String(row.guild_id),
    plan: normalizePlan(row.plan),
    source: 'stripe_subscription',
    status: String(row.status || 'incomplete'),
    startsAt: row.created_at ? new Date(row.created_at) : new Date(),
    expiresAt: row.current_period_end ? new Date(row.current_period_end) : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    customerId: String(row.stripe_customer_id || ''),
    subscriptionId: String(row.stripe_subscription_id || ''),
    billingCycle: String(row.billing_cycle || 'monthly'),
    purchasedBy: String(row.discord_user_id || '')
  });
}

function isBviGuild(guildId) {
  const id = String(guildId || '');
  return Boolean(id && ownerSettings.rpGuilds.includes(id));
}

function isBotOwner(userId) {
  const ownerId = String(process.env.BOT_OWNER_ID || '').trim();
  return /^\d{16,22}$/.test(ownerId) && String(userId) === ownerId;
}
function getBotOwnerId() {
  const id = String(process.env.BOT_OWNER_ID || '').trim();
  return /^\d{16,22}$/.test(id) ? id : null;
}

function sanitizeOwnerSettings(input = {}) {
  const ids = (value, limit = 500) => [...new Set((Array.isArray(value) ? value : [])
    .map(sanitizeId)
    .filter(Boolean))].slice(0, limit);
  return {
    aiAllowedUsers: ids(input.aiAllowedUsers),
    ownerUsers: ids(input.ownerUsers, 25),
    rpGuilds: ids(input.rpGuilds, 250),
    blacklistedUsers: ids(input.blacklistedUsers, 5000),
    blacklistedGuilds: ids(input.blacklistedGuilds, 5000),
    maintenance: Boolean(input.maintenance),
    maintenanceMessage: String(input.maintenanceMessage || 'A NexaBot jelenleg karbantartás alatt áll. Kérlek, próbáld újra később.').trim().slice(0, 500),
    remoteDisabledModules: [...new Set((Array.isArray(input.remoteDisabledModules) ? input.remoteDisabledModules : [])
      .filter((key) => MODULE_KEYS.includes(key) && key !== 'bvi'))]
  };
}

function getOwnerSettings() {
  return JSON.parse(JSON.stringify(ownerSettings));
}

function isOwnerUser(userId) {
  const id = String(userId || '');
  return isBotOwner(id) || ownerSettings.ownerUsers.includes(id);
}

function isAiAllowedUser(userId) {
  const id = String(userId || '');
  return isOwnerUser(id) || ownerSettings.aiAllowedUsers.includes(id);
}

function defaultConfig(guildId) {
  const bvi = false;
  return {
    language: 'en',
    commandLanguage: 'en',
    supportModeration: { paused: false, changedAt: null, changedBy: null, nativeRules: [], incomplete: false },
    modules: {
      protection: bvi,
      moderation: bvi,
      tickets: bvi,
      welcome: bvi,
      levels: false,
      suggestions: false,
      customCommands: false,
      reactionRoles: false,
      giveaways: false,
      logging: false,
      shift: false,
      ai: false,
      tempVoice: false,
      verification: false,
      starboard: false,
      reminders: false,
      bvi
    },
    channels: Object.fromEntries(CHANNEL_KEYS.map((key) => [key, null])),
    roles: Object.fromEntries(ROLE_KEYS.map((key) => [key, null])),
    messages: {
      welcome: 'Welcome to the server, {tag}! Please read the rules.',
      goodbye: '{username} has left the server.',
      levelUp: 'Congratulations {tag}, you reached level {level}!',
      ticket: 'Choose the category of your request. The bot will open a private ticket for you and the assigned staff.'
    },
    tickets: {
      enabledTypes: ['support', 'application', 'report', 'other'],
      labels: {
        support: 'Support request',
        application: 'Application question',
        report: 'Report',
        purchase: 'Purchase / billing',
        partnership: 'Partnership',
        other: 'Other request'
      }
    },
    protection: {
      sensitivity: 'medium',
      spam: true,
      flood: true,
      massMention: true,
      invites: true,
      links: true,
      scamLinks: true,
      badWords: false,
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
      lockdown: true,
      blockedWords: [],
      whitelistRoles: [],
      whitelistUsers: [],
      whitelistChannels: [],
      trustedBots: []
    },
    community: {
      xpCooldownSeconds: 60,
      xpMin: 8,
      xpMax: 15,
      starboardThreshold: 3,
      selfRoles: [],
      rewardRoles: []
    },
    shift: {
      trackBreaks: true,
      showLeaderboard: true
    },
    ai: {
      serverMemory: true,
      personalMemory: true,
      maxMemories: 25,
      systemPrompt: 'You are a helpful, concise Discord assistant. Use English by default unless the user asks for another language. Never invent server information.'
    },
    documents: {
      defaultAccessRoleId: null,
      types: {},
      customTypes: []
    },
    applications: {
      templates: []
    },
    chronoGuard: {
      enabled: false,
      autoSnapshotHours: 6,
      retention: 30,
      alertThreshold: 40,
      protectedRoleIds: [],
      protectedChannelIds: []
    },
    installations: {
      cia: null,
      crownCity: null
    },
    branding: {
      title: 'NexaBot Control Center',
      primary: '#a87345',
      accent: '#d2b079',
      logoUrl: ''
    },
    logging: Object.fromEntries(LOG_KEYS.map((key) => [key, true]))
  };
}

function sanitizeId(value) {
  const id = String(value || '').trim();
  return /^\d{16,22}$/.test(id) ? id : null;
}

function sanitizeConfig(guildId, input = {}) {
  const defaults = defaultConfig(guildId);
  const config = {
    language: input.language === 'hu' ? 'hu' : defaults.language,
    commandLanguage: ['auto', 'hu', 'en'].includes(input.commandLanguage) ? input.commandLanguage : 'en',
    supportModeration: { ...defaults.supportModeration },
    modules: { ...defaults.modules },
    channels: { ...defaults.channels },
    roles: { ...defaults.roles },
    messages: { ...defaults.messages },
    tickets: { ...defaults.tickets },
    protection: { ...defaults.protection },
    community: { ...defaults.community },
    shift: { ...defaults.shift },
    ai: { ...defaults.ai },
    documents: { defaultAccessRoleId: null, types: {}, customTypes: [] },
    applications: { templates: [] },
    chronoGuard: { ...defaults.chronoGuard },
    installations: { cia: null, crownCity: null },
    branding: { ...defaults.branding },
    logging: { ...defaults.logging }
  };

  if (guildId === SUPPORT_GUILD_ID) {
    const pause = input.supportModeration || {};
    config.supportModeration = {
      paused: pause.paused === true,
      changedAt: typeof pause.changedAt === 'string' ? pause.changedAt.slice(0, 40) : null,
      changedBy: sanitizeId(pause.changedBy),
      nativeRules: [...new Set((Array.isArray(pause.nativeRules) ? pause.nativeRules : []).map(sanitizeId).filter(Boolean))].slice(0, 100),
      incomplete: pause.incomplete === true
    };
  }

  for (const key of MODULE_KEYS) config.modules[key] = Boolean(input.modules?.[key]);
  config.modules.bvi = false;
  for (const key of CHANNEL_KEYS) config.channels[key] = sanitizeId(input.channels?.[key]);
  for (const key of ROLE_KEYS) config.roles[key] = sanitizeId(input.roles?.[key]);

  const welcome = String(input.messages?.welcome || defaults.messages.welcome).trim().slice(0, 1000);
  const ticket = String(input.messages?.ticket || defaults.messages.ticket).trim().slice(0, 1000);
  const goodbye = String(input.messages?.goodbye || defaults.messages.goodbye).trim().slice(0, 1000);
  const levelUp = String(input.messages?.levelUp || defaults.messages.levelUp).trim().slice(0, 500);
  config.messages.welcome = welcome || defaults.messages.welcome;
  config.messages.goodbye = goodbye || defaults.messages.goodbye;
  config.messages.levelUp = levelUp || defaults.messages.levelUp;
  config.messages.ticket = ticket || defaults.messages.ticket;

  const allowedTicketTypes = new Set(['support', 'application', 'report', 'purchase', 'partnership', 'other']);
  config.tickets.enabledTypes = input.tickets?.enabledTypes === undefined
    ? [...defaults.tickets.enabledTypes]
    : [...new Set((Array.isArray(input.tickets.enabledTypes) ? input.tickets.enabledTypes : [])
      .map((type) => String(type || '').trim().toLowerCase())
      .filter((type) => allowedTicketTypes.has(type)))];
  config.tickets.labels = {};
  for (const type of allowedTicketTypes) {
    const label = String(input.tickets?.labels?.[type] || defaults.tickets.labels[type]).trim().slice(0, 60);
    config.tickets.labels[type] = label || defaults.tickets.labels[type];
  }

  const sensitivity = String(input.protection?.sensitivity || 'medium');
  config.protection.sensitivity = ['strict', 'medium', 'relaxed'].includes(sensitivity) ? sensitivity : 'medium';
  for (const key of ['deleteMessages', 'warn', 'timeout', 'kick', 'ban', 'lockdown']) {
    config.protection[key] = Boolean(input.protection?.[key]);
  }
  for (const key of ['spam', 'flood', 'massMention', 'invites', 'links', 'scamLinks', 'badWords', 'capsSpam', 'emojiSpam', 'repeatedMessage', 'raidDetection', 'freshAccounts', 'antiNuke', 'channelGuard', 'roleGuard', 'moderationGuard', 'webhookGuard']) {
    config.protection[key] = input.protection?.[key] === undefined ? defaults.protection[key] : Boolean(input.protection[key]);
  }
  config.protection.blockedWords = [...new Set((Array.isArray(input.protection?.blockedWords) ? input.protection.blockedWords : String(input.protection?.blockedWords || '').split(','))
    .map((word) => String(word).trim().toLowerCase().slice(0, 50))
    .filter(Boolean))].slice(0, 200);
  for (const key of ['whitelistRoles', 'whitelistUsers', 'whitelistChannels', 'trustedBots']) {
    config.protection[key] = [...new Set((Array.isArray(input.protection?.[key]) ? input.protection[key] : [])
      .map(sanitizeId).filter(Boolean))].slice(0, 100);
  }

  const cooldown = Number.parseInt(input.community?.xpCooldownSeconds, 10);
  const xpMin = Number.parseInt(input.community?.xpMin, 10);
  const xpMax = Number.parseInt(input.community?.xpMax, 10);
  const starboardThreshold = Number.parseInt(input.community?.starboardThreshold, 10);
  config.community.xpCooldownSeconds = Number.isInteger(cooldown) ? Math.min(300, Math.max(15, cooldown)) : 60;
  config.community.xpMin = Number.isInteger(xpMin) ? Math.min(50, Math.max(1, xpMin)) : 8;
  config.community.xpMax = Number.isInteger(xpMax) ? Math.min(100, Math.max(config.community.xpMin, xpMax)) : 15;
  config.community.starboardThreshold = Number.isInteger(starboardThreshold) ? Math.min(25, Math.max(2, starboardThreshold)) : 3;
  config.community.selfRoles = [...new Set((Array.isArray(input.community?.selfRoles) ? input.community.selfRoles : [])
    .map(sanitizeId)
    .filter(Boolean))].slice(0, 10);
  config.community.rewardRoles = (Array.isArray(input.community?.rewardRoles) ? input.community.rewardRoles : [])
    .map((item) => ({ level: Number.parseInt(item?.level, 10), roleId: sanitizeId(item?.roleId) }))
    .filter((item) => Number.isInteger(item.level) && item.level > 0 && item.level <= 1000 && item.roleId)
    .slice(0, 25);

  config.shift.trackBreaks = Boolean(input.shift?.trackBreaks);
  config.shift.showLeaderboard = Boolean(input.shift?.showLeaderboard);

  config.ai.serverMemory = Boolean(input.ai?.serverMemory);
  config.ai.personalMemory = Boolean(input.ai?.personalMemory);
  const maxMemories = Number.parseInt(input.ai?.maxMemories, 10);
  config.ai.maxMemories = Number.isInteger(maxMemories) ? Math.min(100, Math.max(5, maxMemories)) : 25;
  const systemPrompt = String(input.ai?.systemPrompt || defaults.ai.systemPrompt).trim().slice(0, 2000);
  config.ai.systemPrompt = systemPrompt || defaults.ai.systemPrompt;

  const documentTypes = input.documents?.types && typeof input.documents.types === 'object'
    ? input.documents.types
    : {};
  config.documents.defaultAccessRoleId = sanitizeId(input.documents?.defaultAccessRoleId);
  for (const [key, value] of Object.entries(documentTypes).slice(0, 100)) {
    if (!/^[a-z0-9_]{1,50}$/.test(key) || !value || typeof value !== 'object') continue;
    const rule = { accessRoleId: sanitizeId(value.accessRoleId) };
    const notificationRoleId = sanitizeId(value.notificationRoleId);
    if (notificationRoleId) rule.notificationRoleId = notificationRoleId;
    if (typeof value.caseNumber === 'boolean') rule.caseNumber = value.caseNumber;
    if (typeof value.pingTarget === 'boolean') rule.pingTarget = value.pingTarget;
    config.documents.types[key] = rule;
  }
  config.documents.customTypes = (Array.isArray(input.documents?.customTypes) ? input.documents.customTypes : [])
    .map((item) => {
      const key = String(item?.key || '').trim().toLowerCase();
      const fields = (Array.isArray(item?.fields) ? item.fields : []).slice(0, 5).map((field, index) => ({
        id: `field_${index + 1}`,
        label: String(field?.label || '').trim().slice(0, 45),
        placeholder: String(field?.placeholder || '').trim().slice(0, 100),
        required: field?.required !== false,
        maxLength: field?.style === 'paragraph'
          ? Math.min(1000, Math.max(50, Number.parseInt(field?.maxLength, 10) || 1000))
          : Math.min(200, Math.max(10, Number.parseInt(field?.maxLength, 10) || 200)),
        style: field?.style === 'paragraph' ? 'paragraph' : 'short'
      })).filter((field) => field.label);
      if (!/^custom_[a-z0-9_]{4,11}$/.test(key) || !fields.length) return null;
      return {
        key,
        title: String(item?.title || 'Egyedi dokumentum').trim().slice(0, 45) || 'Egyedi dokumentum',
        emoji: String(item?.emoji || '📄').trim().slice(0, 16) || '📄',
        channelId: sanitizeId(item?.channelId),
        approval: Boolean(item?.approval),
        active: item?.active !== false,
        accessRoleId: sanitizeId(item?.accessRoleId),
        notificationRoleId: sanitizeId(item?.notificationRoleId),
        caseNumber: Boolean(item?.caseNumber),
        pingTarget: Boolean(item?.pingTarget),
        fields
      };
    })
    .filter(Boolean)
    .slice(0, 25);

  config.applications.templates = (Array.isArray(input.applications?.templates) ? input.applications.templates : [])
    .map((item) => {
      const key = String(item?.key || '').trim().toLowerCase();
      const questions = (Array.isArray(item?.questions) ? item.questions : [])
        .slice(0, 15)
        .map((question, index) => ({
          id: `question_${index + 1}`,
          label: String(question?.label || '').trim().slice(0, 200),
          placeholder: String(question?.placeholder || '').trim().slice(0, 100),
          required: question?.required !== false,
          maxLength: Math.min(1000, Math.max(50, Number.parseInt(question?.maxLength, 10) || 1000))
        }))
        .filter((question) => question.label);
      if (!/^tgf_[a-z0-9_]{4,20}$/.test(key) || !questions.length) return null;
      const cooldownHours = Number.parseInt(item?.cooldownHours, 10);
      return {
        key,
        title: String(item?.title || 'Egyedi tagfelvétel').trim().slice(0, 45) || 'Egyedi tagfelvétel',
        emoji: String(item?.emoji || '📋').trim().slice(0, 16) || '📋',
        description: String(item?.description || 'Nyomd meg a gombot a jelentkezés megkezdéséhez.').trim().slice(0, 1000),
        openChannelId: sanitizeId(item?.openChannelId),
        reviewChannelId: sanitizeId(item?.reviewChannelId),
        resultChannelId: sanitizeId(item?.resultChannelId),
        accessRoleId: sanitizeId(item?.accessRoleId),
        reviewerRoleId: sanitizeId(item?.reviewerRoleId),
        acceptedRoleId: sanitizeId(item?.acceptedRoleId),
        notificationRoleId: sanitizeId(item?.notificationRoleId),
        blindReview: item?.blindReview !== false,
        active: item?.active !== false,
        cooldownHours: Number.isInteger(cooldownHours) ? Math.min(720, Math.max(0, cooldownHours)) : 24,
        questions
      };
    })
    .filter(Boolean)
    .slice(0, 15);

  const autoSnapshotHours = Number.parseInt(input.chronoGuard?.autoSnapshotHours, 10);
  const chronoRetention = Number.parseInt(input.chronoGuard?.retention, 10);
  const alertThreshold = Number.parseInt(input.chronoGuard?.alertThreshold, 10);
  config.chronoGuard.enabled = Boolean(input.chronoGuard?.enabled);
  config.chronoGuard.autoSnapshotHours = Number.isInteger(autoSnapshotHours) ? Math.min(168, Math.max(1, autoSnapshotHours)) : 6;
  config.chronoGuard.retention = Number.isInteger(chronoRetention) ? Math.min(100, Math.max(5, chronoRetention)) : 30;
  config.chronoGuard.alertThreshold = Number.isInteger(alertThreshold) ? Math.min(100, Math.max(1, alertThreshold)) : 40;
  config.chronoGuard.protectedRoleIds = [...new Set((Array.isArray(input.chronoGuard?.protectedRoleIds) ? input.chronoGuard.protectedRoleIds : [])
    .map(sanitizeId).filter(Boolean))].slice(0, 50);
  config.chronoGuard.protectedChannelIds = [...new Set((Array.isArray(input.chronoGuard?.protectedChannelIds) ? input.chronoGuard.protectedChannelIds : [])
    .map(sanitizeId).filter(Boolean))].slice(0, 100);

  const ciaInstallation = input.installations?.cia;
  if (ciaInstallation && typeof ciaInstallation === 'object') {
    const safeResourceMap = (value, limit) => Object.fromEntries(
      Object.entries(value && typeof value === 'object' ? value : {})
        .filter(([key]) => /^[a-zA-Z0-9_]{1,50}$/.test(key))
        .map(([key, id]) => [key, sanitizeId(id)])
        .filter(([, id]) => Boolean(id))
        .slice(0, limit)
    );
    const installedAt = String(ciaInstallation.installedAt || '').trim().slice(0, 40);
    const ranksUpdatedAt = String(ciaInstallation.ranksUpdatedAt || '').trim().slice(0, 40);
    const lastRepairedAt = String(ciaInstallation.lastRepairedAt || '').trim().slice(0, 40);
    const finalizedAt = String(ciaInstallation.finalizedAt || '').trim().slice(0, 40);
    config.installations.cia = {
      completed: ciaInstallation.completed === true,
      version: Math.min(100, Math.max(1, Number.parseInt(ciaInstallation.version, 10) || 1)),
      installedAt: /^\d{4}-\d{2}-\d{2}T/.test(installedAt) ? installedAt : new Date().toISOString(),
      installedBy: sanitizeId(ciaInstallation.installedBy),
      rankStyle: ciaInstallation.rankStyle === 'american' ? 'american' : 'american',
      ranksUpdatedAt: /^\d{4}-\d{2}-\d{2}T/.test(ranksUpdatedAt) ? ranksUpdatedAt : null,
      lastRepairedAt: /^\d{4}-\d{2}-\d{2}T/.test(lastRepairedAt) ? lastRepairedAt : null,
      repairCount: Math.min(10000, Math.max(0, Number.parseInt(ciaInstallation.repairCount, 10) || 0)),
      finalized: ciaInstallation.finalized === true,
      finalizedAt: /^\d{4}-\d{2}-\d{2}T/.test(finalizedAt) ? finalizedAt : null,
      finalizedBy: sanitizeId(ciaInstallation.finalizedBy),
      roles: safeResourceMap(ciaInstallation.roles, 50),
      categories: safeResourceMap(ciaInstallation.categories, 30),
      channels: safeResourceMap(ciaInstallation.channels, 200)
    };
  }

  const crownInstallation = input.installations?.crownCity;
  if (crownInstallation && typeof crownInstallation === 'object') {
    const resourceMap = (value, limit) => Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {})
      .filter(([key]) => /^[a-zA-Z0-9_]{1,50}$/.test(key)).slice(0, limit)
      .map(([key, id]) => [key, sanitizeId(id)]).filter(([, id]) => id));
    const date = (value) => /^\d{4}-\d{2}-\d{2}T/.test(String(value || '')) ? String(value).slice(0, 40) : null;
    const serverCode = String(crownInstallation.serverCode || '').trim();
    const session = crownInstallation.session || {};
    config.installations.crownCity = {
      version: 1, completed: crownInstallation.completed === true, configured: crownInstallation.configured === true,
      stage: ['roles', 'channels', 'configuration', 'panels', 'completed', 'interrupted'].includes(crownInstallation.stage) ? crownInstallation.stage : 'interrupted',
      installedAt: date(crownInstallation.installedAt), installedBy: sanitizeId(crownInstallation.installedBy),
      updatedAt: date(crownInstallation.updatedAt),
      serverCode: /^[A-Za-z0-9_-]{1,32}$/.test(serverCode) ? serverCode : '',
      roles: resourceMap(crownInstallation.roles, 100), categories: resourceMap(crownInstallation.categories, 30),
      channels: resourceMap(crownInstallation.channels, 200), panels: resourceMap(crownInstallation.panels, 200),
      session: { status: session.status === 'open' ? 'open' : 'closed', title: String(session.title || '').replace(/[\r\n]/g, ' ').slice(0, 100),
        openedAt: date(session.openedAt), openedBy: sanitizeId(session.openedBy), messageId: sanitizeId(session.messageId),
        closedAt: date(session.closedAt), closedBy: sanitizeId(session.closedBy) }
    };
  }

  const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : fallback;
  config.branding.title = String(input.branding?.title || defaults.branding.title).trim().slice(0, 60) || defaults.branding.title;
  config.branding.primary = validColor(input.branding?.primary, defaults.branding.primary);
  config.branding.accent = validColor(input.branding?.accent, defaults.branding.accent);
  const logoUrl = String(input.branding?.logoUrl || '').trim().slice(0, 500);
  config.branding.logoUrl = /^https:\/\//i.test(logoUrl) ? logoUrl : '';
  for (const key of LOG_KEYS) config.logging[key] = input.logging?.[key] === undefined ? defaults.logging[key] : Boolean(input.logging[key]);
  return config;
}

function mergeStoredConfig(guildId, stored) {
  if (!stored || typeof stored !== 'object') return defaultConfig(guildId);
  const defaults = defaultConfig(guildId);
  const merged = {
    language: stored.language || defaults.language,
    commandLanguage: stored.commandLanguage || defaults.commandLanguage,
    modules: { ...defaults.modules, ...(stored.modules || {}) },
    channels: { ...defaults.channels, ...(stored.channels || {}) },
    roles: { ...defaults.roles, ...(stored.roles || {}) },
    messages: { ...defaults.messages, ...(stored.messages || {}) },
    tickets: {
      ...defaults.tickets,
      ...(stored.tickets || {}),
      labels: { ...defaults.tickets.labels, ...(stored.tickets?.labels || {}) }
    },
    protection: { ...defaults.protection, ...(stored.protection || {}) },
    supportModeration: { ...defaults.supportModeration, ...(stored.supportModeration || {}) },
    community: { ...defaults.community, ...(stored.community || {}) },
    shift: { ...defaults.shift, ...(stored.shift || {}) },
    ai: { ...defaults.ai, ...(stored.ai || {}) },
    documents: {
      defaultAccessRoleId: stored.documents?.defaultAccessRoleId || null,
      types: { ...(stored.documents?.types || {}) },
      customTypes: Array.isArray(stored.documents?.customTypes) ? stored.documents.customTypes : []
    },
    applications: {
      templates: Array.isArray(stored.applications?.templates) ? stored.applications.templates : []
    },
    chronoGuard: { ...defaults.chronoGuard, ...(stored.chronoGuard || {}) },
    installations: { cia: stored.installations?.cia || null, crownCity: stored.installations?.crownCity || null },
    branding: { ...defaults.branding, ...(stored.branding || {}) },
    logging: { ...defaults.logging, ...(stored.logging || {}) }
  };
  merged.modules.bvi = false;
  return sanitizeConfig(guildId, merged);
}

async function initializeConfigStore() {
  if (!process.env.DATABASE_URL) {
    persistent = false;
    updateDatabaseState('disabled');
    console.warn('DATABASE_URL nincs beállítva: a webes beállítások csak a következő újraindításig maradnak meg.');
    return false;
  }
  updateDatabaseState('connecting');
  const previousPool = pool;
  pool = null;
  persistent = false;
  if (previousPool) await previousPool.end().catch(() => null);
  try {
    const nextPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: Math.min(20, Math.max(2, Number.parseInt(process.env.DB_POOL_MAX || '10', 10) || 10)),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      query_timeout: 20_000,
      statement_timeout: 20_000
    });
    nextPool.on('error', (error) => {
      if (pool !== nextPool) return;
      persistent = false;
      updateDatabaseState('degraded', error);
      console.error('Adatbázis-kapcsolati hiba, automatikus újracsatlakozás következik:', error.message);
    });
    pool = nextPool;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nexabot_guild_configs (
        guild_id TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexabot_owner_settings (
        settings_key TEXT PRIMARY KEY,
        settings JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexabot_schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nexabot_levels (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        last_xp_at TIMESTAMPTZ,
        PRIMARY KEY (guild_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS nexabot_shifts (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        break_started_at TIMESTAMPTZ,
        break_seconds INTEGER NOT NULL DEFAULT 0
      );
      CREATE UNIQUE INDEX IF NOT EXISTS nexabot_one_open_shift
        ON nexabot_shifts (guild_id, user_id) WHERE ended_at IS NULL;
      CREATE TABLE IF NOT EXISTS nexabot_leave_requests (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        starts_on DATE NOT NULL,
        ends_on DATE NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        decided_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexabot_schedules (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        note TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexabot_ai_memories (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT,
        content TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_ai_memory_lookup
        ON nexabot_ai_memories (guild_id, user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS nexabot_shift_history_lookup
        ON nexabot_shifts (guild_id, user_id, ended_at DESC);
      CREATE INDEX IF NOT EXISTS nexabot_schedule_lookup
        ON nexabot_schedules (guild_id, user_id, starts_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_ai_consent (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        allowed BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS nexabot_ai_messages (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_ai_message_lookup
        ON nexabot_ai_messages (guild_id, user_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_giveaways (
        message_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        prize TEXT NOT NULL,
        winner_count INTEGER NOT NULL DEFAULT 1,
        ends_at TIMESTAMPTZ NOT NULL,
        entrants JSONB NOT NULL DEFAULT '[]'::jsonb
      );
      ALTER TABLE nexabot_giveaways ADD COLUMN IF NOT EXISTS ended BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE nexabot_giveaways ADD COLUMN IF NOT EXISTS winner_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE nexabot_giveaways ADD COLUMN IF NOT EXISTS required_role_id TEXT;
      ALTER TABLE nexabot_giveaways ADD COLUMN IF NOT EXISTS required_server_id TEXT;
      ALTER TABLE nexabot_giveaways ADD COLUMN IF NOT EXISTS min_account_age_days INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS nexabot_moderation_cases (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        moderator_id TEXT NOT NULL,
        action TEXT NOT NULL,
        reason TEXT NOT NULL,
        duration_seconds INTEGER,
        evidence TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_case_guild_target
        ON nexabot_moderation_cases (guild_id, target_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_tickets (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT UNIQUE NOT NULL,
        owner_id TEXT NOT NULL,
        category TEXT NOT NULL,
        claimed_by TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS nexabot_ticket_guild_status
        ON nexabot_tickets (guild_id, status, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_web_support_tickets (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        subject TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'help',
        channel_id TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_web_support_owner
        ON nexabot_web_support_tickets (user_id, updated_at DESC);
      ALTER TABLE nexabot_web_support_tickets ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
      ALTER TABLE nexabot_web_support_tickets ADD COLUMN IF NOT EXISTS assigned_to TEXT;
      ALTER TABLE nexabot_web_support_tickets ADD COLUMN IF NOT EXISTS assigned_name TEXT;
      ALTER TABLE nexabot_web_support_tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
      ALTER TABLE nexabot_web_support_tickets ADD COLUMN IF NOT EXISTS rating INTEGER;
      ALTER TABLE nexabot_web_support_tickets ADD COLUMN IF NOT EXISTS rating_comment TEXT;
      CREATE TABLE IF NOT EXISTS nexabot_web_support_messages (
        id BIGSERIAL PRIMARY KEY,
        ticket_id BIGINT NOT NULL REFERENCES nexabot_web_support_tickets(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        source TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_web_support_message_lookup
        ON nexabot_web_support_messages (ticket_id, created_at ASC);
      ALTER TABLE nexabot_web_support_messages ADD COLUMN IF NOT EXISTS internal BOOLEAN NOT NULL DEFAULT FALSE;
      CREATE TABLE IF NOT EXISTS nexabot_web_notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'support',
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        link TEXT,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_web_notification_lookup
        ON nexabot_web_notifications (user_id, read_at, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_ticket_transcripts (
        ticket_id BIGINT PRIMARY KEY REFERENCES nexabot_tickets(id) ON DELETE CASCADE,
        html TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexabot_usage_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        guild_id TEXT,
        user_id TEXT,
        name TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_usage_event_lookup
        ON nexabot_usage_events (event_type, created_at DESC);
      CREATE INDEX IF NOT EXISTS nexabot_usage_guild_lookup
        ON nexabot_usage_events (guild_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_error_logs (
        id BIGSERIAL PRIMARY KEY,
        error_type TEXT NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        command TEXT,
        guild_id TEXT,
        user_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_error_lookup
        ON nexabot_error_logs (created_at DESC);
      CREATE INDEX IF NOT EXISTS nexabot_error_guild_lookup
        ON nexabot_error_logs (guild_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        actor_id TEXT,
        guild_id TEXT,
        target_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_audit_lookup
        ON nexabot_audit_logs (guild_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS nexabot_audit_action_lookup
        ON nexabot_audit_logs (action, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_premium (
        guild_id TEXT PRIMARY KEY,
        premium_type TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        granted_by TEXT NOT NULL
      );
      ALTER TABLE nexabot_premium ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
      ALTER TABLE nexabot_premium ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'owner_gift';
      ALTER TABLE nexabot_premium ADD COLUMN IF NOT EXISTS note TEXT;
      ALTER TABLE nexabot_premium ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      UPDATE nexabot_premium SET premium_type = 'ultimate' WHERE premium_type NOT IN ('pro', 'ultimate');
      CREATE INDEX IF NOT EXISTS nexabot_premium_expiry
        ON nexabot_premium (expires_at);
      CREATE TABLE IF NOT EXISTS nexabot_subscriptions (
        guild_id TEXT PRIMARY KEY,
        discord_user_id TEXT NOT NULL,
        stripe_customer_id TEXT NOT NULL,
        stripe_subscription_id TEXT UNIQUE NOT NULL,
        stripe_price_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        status TEXT NOT NULL,
        current_period_end TIMESTAMPTZ,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_subscription_customer
        ON nexabot_subscriptions (stripe_customer_id);
      CREATE INDEX IF NOT EXISTS nexabot_subscription_status
        ON nexabot_subscriptions (status, current_period_end);
      CREATE TABLE IF NOT EXISTS nexabot_payment_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'processing',
        last_error TEXT,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexabot_payments (
        stripe_invoice_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        stripe_customer_id TEXT NOT NULL,
        stripe_subscription_id TEXT,
        amount BIGINT NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'eur',
        status TEXT NOT NULL,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_payments_guild
        ON nexabot_payments (guild_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS nexabot_payments_status
        ON nexabot_payments (status, created_at DESC);
      ALTER TABLE nexabot_payments ALTER COLUMN currency SET DEFAULT 'eur';
      UPDATE nexabot_subscriptions SET plan = 'ultimate' WHERE plan NOT IN ('pro', 'ultimate');
      CREATE TABLE IF NOT EXISTS nexabot_custom_commands (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        response_type TEXT NOT NULL DEFAULT 'text',
        response JSONB NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (guild_id, name)
      );
      CREATE TABLE IF NOT EXISTS nexabot_role_panels (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT UNIQUE NOT NULL,
        panel_type TEXT NOT NULL,
        roles JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexabot_reminders (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        due_at TIMESTAMPTZ NOT NULL,
        sent BOOLEAN NOT NULL DEFAULT FALSE,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_reminder_due_lookup
        ON nexabot_reminders (due_at ASC) WHERE sent = FALSE;
      CREATE INDEX IF NOT EXISTS nexabot_reminder_user_lookup
        ON nexabot_reminders (guild_id, user_id, due_at ASC) WHERE sent = FALSE;
      CREATE TABLE IF NOT EXISTS nexabot_starboard (
        guild_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        starboard_message_id TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, message_id)
      );
      CREATE INDEX IF NOT EXISTS nexabot_starboard_score_lookup
        ON nexabot_starboard (guild_id, score DESC);
      CREATE TABLE IF NOT EXISTS nexabot_erlc_integrations (
        guild_id TEXT PRIMARY KEY,
        encrypted_server_key TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        server_name TEXT,
        join_key TEXT,
        last_status TEXT NOT NULL DEFAULT 'configured',
        last_checked_at TIMESTAMPTZ,
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_erlc_status_lookup
        ON nexabot_erlc_integrations (enabled, last_checked_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_application_drafts (
        guild_id TEXT NOT NULL,
        template_key TEXT NOT NULL,
        user_id TEXT NOT NULL,
        template_snapshot JSONB NOT NULL,
        answers JSONB NOT NULL DEFAULT '[]'::jsonb,
        next_page INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (guild_id, template_key, user_id)
      );
      CREATE INDEX IF NOT EXISTS nexabot_application_draft_expiry
        ON nexabot_application_drafts (expires_at);
      CREATE TABLE IF NOT EXISTS nexabot_applications (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        template_key TEXT NOT NULL,
        template_version TEXT NOT NULL,
        template_snapshot JSONB NOT NULL,
        applicant_id TEXT NOT NULL,
        answers JSONB NOT NULL,
        integrity_score INTEGER NOT NULL DEFAULT 0,
        integrity_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewer_id TEXT,
        review_score INTEGER,
        review_reason TEXT,
        review_message_id TEXT,
        review_channel_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        decided_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS nexabot_application_review_lookup
        ON nexabot_applications (guild_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS nexabot_application_user_lookup
        ON nexabot_applications (guild_id, template_key, applicant_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_server_snapshots (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        snapshot_hash TEXT NOT NULL,
        previous_hash TEXT,
        signature TEXT,
        snapshot JSONB NOT NULL,
        summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        source TEXT NOT NULL DEFAULT 'manual',
        created_by TEXT NOT NULL,
        is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_snapshot_guild_lookup
        ON nexabot_server_snapshots (guild_id, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS nexabot_one_chronoguard_baseline
        ON nexabot_server_snapshots (guild_id) WHERE is_baseline = TRUE;
      CREATE TABLE IF NOT EXISTS nexabot_chronoguard_incidents (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        baseline_snapshot_id BIGINT NOT NULL,
        current_hash TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        diff JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_by TEXT NOT NULL,
        resolved_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS nexabot_chronoguard_incident_lookup
        ON nexabot_chronoguard_incidents (guild_id, status, created_at DESC);
      CREATE TABLE IF NOT EXISTS nexabot_aegis_scans (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        dna_hash TEXT NOT NULL,
        posture_score INTEGER NOT NULL,
        snapshot JSONB NOT NULL,
        diff JSONB NOT NULL DEFAULT '{}'::jsonb,
        source TEXT NOT NULL DEFAULT 'manual',
        created_by TEXT NOT NULL,
        is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_aegis_scan_lookup
        ON nexabot_aegis_scans (guild_id, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS nexabot_one_aegis_baseline
        ON nexabot_aegis_scans (guild_id) WHERE is_baseline = TRUE;
      CREATE TABLE IF NOT EXISTS nexabot_mdt_settings (
        guild_id TEXT PRIMARY KEY, config JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexabot_mdt_codes (
        code_hash TEXT PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS nexabot_mdt_codes_owner ON nexabot_mdt_codes(guild_id,user_id);
      CREATE TABLE IF NOT EXISTS nexabot_mdt_sessions (
        token_hash TEXT PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL, roblox_user_id TEXT NOT NULL DEFAULT ''
      );
      ALTER TABLE nexabot_mdt_sessions ADD COLUMN IF NOT EXISTS roblox_user_id TEXT NOT NULL DEFAULT '';
      CREATE INDEX IF NOT EXISTS nexabot_mdt_sessions_owner ON nexabot_mdt_sessions(guild_id,user_id);
      CREATE TABLE IF NOT EXISTS nexabot_mdt_records (
        id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, template_key TEXT NOT NULL,
        title TEXT NOT NULL, fields JSONB NOT NULL, status TEXT NOT NULL,
        approval_required BOOLEAN NOT NULL DEFAULT FALSE,
        created_by TEXT NOT NULL, updated_by TEXT NOT NULL, reviewed_by TEXT,
        review_reason TEXT, client_key TEXT NOT NULL, input_hash TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1, discord_state TEXT NOT NULL DEFAULT 'pending',
        discord_channel_id TEXT, discord_message_id TEXT,
        review_channel_id TEXT, review_message_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(guild_id,created_by,client_key)
      );
      CREATE INDEX IF NOT EXISTS nexabot_mdt_records_guild ON nexabot_mdt_records(guild_id,id DESC);
      CREATE INDEX IF NOT EXISTS nexabot_mdt_records_roblox
        ON nexabot_mdt_records(guild_id,(fields->>'robloxId'),id DESC);
      CREATE TABLE IF NOT EXISTS nexabot_mdt_provision_locks (
        guild_id TEXT PRIMARY KEY, lease_token TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS nexabot_mdt_loader_links (
        guild_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, nonce TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexabot_mdt_scope (
        scope_key TEXT PRIMARY KEY, guild_id TEXT NOT NULL
      );
      INSERT INTO nexabot_mdt_scope(scope_key,guild_id)
        SELECT 'belv',MIN(guild_id) FROM nexabot_mdt_settings
        WHERE config->>'enabled'='true' HAVING COUNT(*)=1 ON CONFLICT(scope_key) DO NOTHING;
      CREATE TABLE IF NOT EXISTS nexabot_mdt_discord (
        guild_id TEXT PRIMARY KEY, state JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO nexabot_schema_migrations(version,name)
      VALUES(14,'nexabot_20_3_0_mdt_members_discord_scope') ON CONFLICT(version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations(version,name)
      VALUES(13,'nexabot_20_2_2_mdt_private_loader') ON CONFLICT(version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations(version,name)
      VALUES(12,'nexabot_20_2_1_mdt_missing_channels_people') ON CONFLICT(version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations(version,name)
      VALUES(11,'nexabot_20_2_belv_mdt') ON CONFLICT(version) DO NOTHING;
      CREATE TABLE IF NOT EXISTS nexabot_architect_deployments (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        plan_hash TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        plan JSONB NOT NULL,
        resources JSONB NOT NULL DEFAULT '{}'::jsonb,
        applied_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexabot_architect_guild_lookup
        ON nexabot_architect_deployments (guild_id, created_at DESC);
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (1, 'nexabot_4_core') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (2, 'nexabot_6_owner_observability_indexes') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (3, 'nexabot_6_1_engagement_suite') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (4, 'nexabot_7_erlc_and_owner_operations') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (5, 'nexabot_7_tgf_forge') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (6, 'nexabot_10_chronoguard_digital_twin') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (7, 'nexabot_11_aegis_permission_dna') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (8, 'nexabot_12_stripe_subscriptions') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (9, 'nexabot_12_eur_pro_ultimate_catalog') ON CONFLICT (version) DO NOTHING;
      INSERT INTO nexabot_schema_migrations (version, name)
      VALUES (10, 'nexabot_15_5_server_architect') ON CONFLICT (version) DO NOTHING;
    `);
    const result = await pool.query('SELECT guild_id, config FROM nexabot_guild_configs');
    for (const row of result.rows) cache.set(row.guild_id, mergeStoredConfig(row.guild_id, row.config));
    const ownerResult = await pool.query("SELECT settings FROM nexabot_owner_settings WHERE settings_key = 'global'");
    ownerSettings = sanitizeOwnerSettings(ownerResult.rows[0]?.settings);
    const premiumResult = await pool.query(
      "SELECT guild_id, premium_type, starts_at, expires_at, granted_by, status, source, note FROM nexabot_premium WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())"
    );
    premiumCache.clear();
    for (const row of premiumResult.rows) cachePremiumRow(row);
    const subscriptionResult = await pool.query(
      "SELECT guild_id, discord_user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, billing_cycle, status, current_period_end, cancel_at_period_end, created_at FROM nexabot_subscriptions"
    );
    subscriptionCache.clear();
    for (const row of subscriptionResult.rows) cacheSubscriptionRow(row);
    persistent = true;
    updateDatabaseState('online');
    console.log(`${result.rowCount} szerver beállításai betöltve az adatbázisból.`);
    return true;
  } catch (error) {
    persistent = false;
    const failedPool = pool;
    pool = null;
    await failedPool?.end().catch(() => null);
    updateDatabaseState('degraded', error);
    console.error('Az adatbázis nem érhető el, a bot ideiglenes memóriát használ:', error.message);
    return false;
  }
}

function initConfigStore() {
  if (!databaseInitPromise) {
    databaseInitPromise = initializeConfigStore().finally(() => {
      databaseInitPromise = null;
    });
  }
  return databaseInitPromise;
}

function getGuildConfig(guildId) {
  if (!cache.has(guildId)) cache.set(guildId, defaultConfig(guildId));
  return cache.get(guildId);
}

async function setGuildConfig(guildId, input) {
  const config = sanitizeConfig(guildId, input);
  const previousCia = cache.get(guildId)?.installations?.cia;
  if (previousCia?.finalized === true) {
    config.installations.cia = {
      ...(config.installations.cia || previousCia),
      completed: true,
      finalized: true,
      finalizedAt: previousCia.finalizedAt,
      finalizedBy: previousCia.finalizedBy
    };
  }
  cache.set(guildId, config);
  if (pool) {
    await dbQuery(
      `INSERT INTO nexabot_guild_configs (guild_id, config, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [guildId, JSON.stringify(config)]
    );
  }
  return config;
}

async function setOwnerSettings(input) {
  ownerSettings = sanitizeOwnerSettings(input);
  if (pool) {
    await dbQuery(
      `INSERT INTO nexabot_owner_settings (settings_key, settings, updated_at)
       VALUES ('global', $1::jsonb, NOW())
       ON CONFLICT (settings_key) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
      [JSON.stringify(ownerSettings)]
    );
  }
  return getOwnerSettings();
}

function isPersistentStore() {
  return persistent;
}

async function dbQuery(text, values = []) {
  if (!pool) return null;
  try {
    const result = await pool.query(text, values);
    if (!persistent) persistent = true;
    updateDatabaseState('online');
    return result;
  } catch (error) {
    persistent = false;
    updateDatabaseState('degraded', error);
    throw error;
  }
}

async function checkDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    updateDatabaseState('disabled');
    return false;
  }
  if (!pool) return initConfigStore();
  try {
    await dbQuery('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function closeConfigStore() {
  const closingPool = pool;
  pool = null;
  persistent = false;
  if (closingPool) await closingPool.end().catch(() => null);
  updateDatabaseState(process.env.DATABASE_URL ? 'closed' : 'disabled');
}

async function grantGuildPlan(guildId, plan, options = {}) {
  const id = sanitizeId(guildId);
  const normalizedPlan = normalizePlan(plan);
  if (!id) throw new Error('Érvénytelen Discord szerver ID.');
  if (normalizedPlan === 'free') return revokeGuildPlan(id);
  const daysValue = options.days === null || options.days === undefined || options.days === ''
    ? null
    : Math.min(3650, Math.max(1, Number.parseInt(options.days, 10) || 30));
  const startsAt = new Date();
  const expiresAt = daysValue ? new Date(startsAt.getTime() + daysValue * 86_400_000) : null;
  const record = {
    guildId: id,
    plan: normalizedPlan,
    source: 'owner_gift',
    status: 'active',
    startsAt,
    expiresAt,
    grantedBy: String(options.grantedBy || 'owner'),
    note: String(options.note || '').trim().slice(0, 300)
  };
  if (pool) {
    await dbQuery(
      `INSERT INTO nexabot_premium
        (guild_id, premium_type, starts_at, expires_at, granted_by, status, source, note, updated_at)
       VALUES ($1, $2, NOW(), $3, $4, 'active', 'owner_gift', $5, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET
        premium_type = EXCLUDED.premium_type,
        starts_at = NOW(),
        expires_at = EXCLUDED.expires_at,
        granted_by = EXCLUDED.granted_by,
        status = 'active',
        source = 'owner_gift',
        note = EXCLUDED.note,
        updated_at = NOW()`,
      [id, normalizedPlan, expiresAt, record.grantedBy, record.note || null]
    );
  }
  premiumCache.set(id, record);
  return getGuildEntitlement(id);
}

async function revokeGuildPlan(guildId) {
  const id = sanitizeId(guildId);
  if (!id) throw new Error('Érvénytelen Discord szerver ID.');
  if (pool) await dbQuery('DELETE FROM nexabot_premium WHERE guild_id = $1', [id]);
  premiumCache.delete(id);
  return getGuildEntitlement(id);
}

async function upsertGuildSubscription(input) {
  const guildId = sanitizeId(input?.guildId);
  const userId = sanitizeId(input?.discordUserId);
  const plan = normalizePlan(input?.plan);
  const status = String(input?.status || 'incomplete').slice(0, 40);
  const customerId = String(input?.customerId || '').trim();
  const subscriptionId = String(input?.subscriptionId || '').trim();
  const priceId = String(input?.priceId || '').trim();
  const billingCycle = input?.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const currentPeriodEnd = input?.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null;
  if (!guildId || !userId) throw new Error('Érvénytelen Discord előfizetési azonosító.');
  if (plan === 'free' || !customerId || !subscriptionId || !priceId) throw new Error('Hiányos Stripe előfizetési adat.');
  if (currentPeriodEnd && Number.isNaN(currentPeriodEnd.getTime())) throw new Error('Érvénytelen előfizetési lejárat.');
  const row = {
    guild_id: guildId,
    discord_user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    plan,
    billing_cycle: billingCycle,
    status,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
    created_at: input.createdAt ? new Date(input.createdAt) : new Date()
  };
  if (pool) {
    await dbQuery(
      `INSERT INTO nexabot_subscriptions
        (guild_id, discord_user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, billing_cycle, status, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,NOW()),NOW())
       ON CONFLICT (guild_id) DO UPDATE SET
        discord_user_id = EXCLUDED.discord_user_id,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        stripe_price_id = EXCLUDED.stripe_price_id,
        plan = EXCLUDED.plan,
        billing_cycle = EXCLUDED.billing_cycle,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW()`,
      [guildId, userId, customerId, subscriptionId, priceId, plan, billingCycle, status, currentPeriodEnd, row.cancel_at_period_end, row.created_at]
    );
  }
  cacheSubscriptionRow(row);
  return getGuildEntitlement(guildId);
}

function getGuildSubscription(guildId) {
  const record = subscriptionCache.get(String(guildId || ''));
  return record ? { ...record } : null;
}

async function removeGuildSubscription(guildId, status = 'canceled') {
  const id = sanitizeId(guildId);
  if (!id) throw new Error('Érvénytelen Discord szerver ID.');
  if (pool) await dbQuery('UPDATE nexabot_subscriptions SET status = $2, updated_at = NOW() WHERE guild_id = $1', [id, String(status).slice(0, 40)]);
  const record = subscriptionCache.get(id);
  if (record) subscriptionCache.set(id, { ...record, status: String(status) });
  return getGuildEntitlement(id);
}

async function pruneExpiredPremium() {
  const now = Date.now();
  for (const [guildId, record] of premiumCache) {
    if (record.expiresAt && record.expiresAt.getTime() <= now) premiumCache.delete(guildId);
  }
  if (pool) await dbQuery('DELETE FROM nexabot_premium WHERE expires_at IS NOT NULL AND expires_at <= NOW()');
  for (const [guildId, record] of subscriptionCache) {
    if (record.status === 'past_due' && record.expiresAt && record.expiresAt.getTime() <= now) {
      subscriptionCache.set(guildId, { ...record, status: 'unpaid' });
    }
  }
}

function configuredChannel(guild, key, fallbackName = null) {
  const id = getGuildConfig(guild.id).channels[key];
  const selected = id ? guild.channels.cache.get(id) : null;
  if (selected) return selected;
  return fallbackName ? guild.channels.cache.find((channel) => channel.name === fallbackName) : null;
}

function configuredRole(guild, key, fallbackName = null) {
  const id = getGuildConfig(guild.id).roles[key];
  const selected = id ? guild.roles.cache.get(id) : null;
  if (selected) return selected;
  return fallbackName ? guild.roles.cache.find((role) => role.name === fallbackName) : null;
}

function getModuleState(guildId, key) {
  if (key === 'bvi') {
    const enabled = isBviGuild(guildId);
    return {
      enabled,
      configured: enabled,
      planAllowed: enabled,
      remotelyDisabled: false
    };
  }
  const configured = Boolean(getGuildConfig(guildId).modules[key]);
  const planAllowed = planAllowsModule(guildId, key);
  const remotelyDisabled = ownerSettings.remoteDisabledModules.includes(key);
  const moderationPaused = ['protection', 'moderation'].includes(key) && isSupportModerationPaused(guildId);
  return {
    enabled: configured && planAllowed && !remotelyDisabled && !moderationPaused,
    configured,
    planAllowed,
    remotelyDisabled,
    moderationPaused
  };
}

function isSupportModerationPaused(guildId) {
  return guildId === SUPPORT_GUILD_ID && getGuildConfig(guildId).supportModeration?.paused === true;
}

function moduleEnabled(guildId, key) {
  return getModuleState(guildId, key).enabled;
}

function logEnabled(guildId, key) {
  return moduleEnabled(guildId, 'logging') && Boolean(getGuildConfig(guildId).logging[key]);
}

function dashboardUrl(guildId = null) {
  const root = String(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000').replace(/\/$/, '');
  return guildId ? `${root}/dashboard/guild/${guildId}` : `${root}/dashboard`;
}

function inviteUrl() {
  const clientId = process.env.CLIENT_ID || '';
  const permissions = [
    PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.MoveMembers
  ].reduce((sum, value) => sum | value, 0n);
  return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&scope=bot%20applications.commands&permissions=${permissions.toString()}`;
}

module.exports = {
  getBotOwnerId,
  MODULE_KEYS,
  CHANNEL_KEYS,
  ROLE_KEYS,
  LOG_KEYS,
  PLAN_LEVELS,
  MODULE_MINIMUM_PLAN,
  defaultConfig,
  sanitizeConfig,
  initConfigStore,
  getGuildConfig,
  setGuildConfig,
  getOwnerSettings,
  setOwnerSettings,
  isPersistentStore,
  dbQuery,
  databaseHealth,
  checkDatabaseConnection,
  closeConfigStore,
  getGuildPlan,
  getGuildEntitlement,
  planAllows,
  planAllowsModule,
  grantGuildPlan,
  revokeGuildPlan,
  upsertGuildSubscription,
  getGuildSubscription,
  removeGuildSubscription,
  pruneExpiredPremium,
  configuredChannel,
  configuredRole,
  getModuleState,
  isSupportModerationPaused,
  moduleEnabled,
  logEnabled,
  isBviGuild,
  isBotOwner,
  isOwnerUser,
  isAiAllowedUser,
  dashboardUrl,
  inviteUrl
};
