const {
  ChannelType, PermissionFlagsBits, SlashCommandBuilder, MessageFlags, Routes,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const {
  getGuildConfig, setGuildConfig, isBotOwner, getOwnerSettings, setOwnerSettings,
  grantGuildPlan, isPersistentStore, getModuleState
} = require('./config');
const { SUPPORT_GUILD_ID } = require('./constants');
const { localizeCommandJson } = require('./command-localizations');
const { ticketPanel } = require('./panels');
const { verificationPanel } = require('./engagement');
const { rolePanel } = require('./community');
const { recordAudit, recordError } = require('./telemetry');
const {
  CROWN_ROLES, CROWN_CATEGORIES, CROWN_APPLICATIONS, ROLE_GROUPS, MANAGEMENT_KEYS,
  STAFF_KEYS, LEADS, crownEmbed, contentForChannel, sessionPanel
} = require('./crown-city-content');

const EPHEMERAL = MessageFlags.Ephemeral;
const installLocks = new Set();
const sessionLocks = new Set();
const REASON = 'Crown City RP • NEXA szervertelepítő';
const READ = ['ViewChannel', 'ReadMessageHistory', 'UseApplicationCommands'];
const WRITE = ['SendMessages', 'SendMessagesInThreads', 'EmbedLinks', 'AttachFiles', 'AddReactions', 'Connect', 'Speak'];
const DENY_WRITE = ['SendMessages', 'SendMessagesInThreads', 'CreatePublicThreads', 'CreatePrivateThreads', 'AddReactions'];
const SELF_ROLE_KEYS = ['sessionPing', 'eventPing', 'newsPing'];
const MODULES = ['moderation', 'tickets', 'welcome', 'logging', 'verification', 'reactionRoles', 'suggestions', 'bvi'];
const bits = (names) => names.map((name) => PermissionFlagsBits[name]);
const values = (collection) => [...(collection?.values?.() || [])];
const mask = (permissions) => typeof permissions === 'bigint' ? permissions
  : Array.isArray(permissions) ? permissions.reduce((value, bit) => value | bit, 0n)
  : BigInt(permissions?.bitfield || 0);
const typeFor = (spec) => spec.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

function buildCrownCityCommand() {
  const codeOption = (option) => option.setName('szerverkod').setDescription('Az ER:LC privátszerver belépési kódja; később is megadható.').setMinLength(1).setMaxLength(32);
  return new SlashCommandBuilder().setName('crown-city')
    .setDescription('Crown City RP teljes ER:LC közösségi és frakciórendszere.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false)
    .addSubcommand((sub) => sub.setName('telepites').setDescription('Teljes Crown City RP szerverstruktúra létrehozása.').addStringOption(codeOption))
    .addSubcommand((sub) => sub.setName('javitas').setDescription('Hiányzó elemek pótlása és a Crown City botpanelek frissítése.').addStringOption(codeOption))
    .addSubcommand((sub) => sub.setName('ellenorzes').setDescription('Rangok, csatornák, privát hozzáférések és működő modulok ellenőrzése.'));
}

async function registerCrownCityInOwnerGuilds(client, options = {}) {
  const registered = [], failed = [];
  const ownerId = options.ownerId || process.env.BOT_OWNER_ID;
  if (!ownerId) return { registered, failed };
  for (const guild of values(client?.guilds?.cache)) {
    try {
      const owner = await guild.members.fetch(ownerId).catch(() => null);
      if (!owner || (guild.ownerId !== ownerId && !owner.permissions?.has(PermissionFlagsBits.Administrator))) continue;
      const body = localizeCommandJson(buildCrownCityCommand().toJSON());
      if (options.rest) await options.rest.post(Routes.applicationGuildCommands(options.applicationId, guild.id), { body });
      else await guild.commands.create(body);
      registered.push(guild.id);
    } catch (error) {
      failed.push({ guildId: guild.id, error: String(error.message || error) });
      await recordError(error, { command: 'crown_city_guild_registration', guildId: guild.id }).catch(() => null);
    }
  }
  return { registered, failed };
}

function crownStaffRoleIds(guildId) {
  const state = getGuildConfig(guildId).installations?.crownCity;
  if (!state?.completed) return [];
  return STAFF_KEYS.map((key) => state.roles[key]).filter(Boolean);
}
function actorAllowed(guild, member) {
  return Boolean(guild && member && isBotOwner(member.id) &&
    (guild.ownerId === member.id || member.permissions?.has(PermissionFlagsBits.Administrator)));
}
function accessKeys(access) {
  if (access === 'public') return [];
  if (access === 'member') return ['civil', ...STAFF_KEYS];
  if (access === 'staff') return STAFF_KEYS;
  if (access === 'management') return MANAGEMENT_KEYS;
  if (access === 'dispatch') return [...ROLE_GROUPS.pd, ...ROLE_GROUPS.sheriff, ...ROLE_GROUPS.fd, ...ROLE_GROUPS.dot, 'dispatcher', ...MANAGEMENT_KEYS];
  return [...(ROLE_GROUPS[access] || []), ...MANAGEMENT_KEYS];
}

function crownPermissions(guild, roles, botId, access, spec = {}) {
  const publicAccess = access === 'public';
  const readonly = Boolean(spec.readonly);
  const entries = new Map();
  const put = (id, allow, deny = []) => entries.set(id, { id, allow: bits(allow), deny: bits(deny) });
  put(guild.id, publicAccess ? READ : [], publicAccess ? (readonly ? DENY_WRITE : []) : ['ViewChannel']);
  for (const key of new Set([...accessKeys(access), ...(spec.readers || [])])) {
    if (roles[key]) put(roles[key].id, readonly ? READ : [...READ, ...WRITE], readonly ? DENY_WRITE : []);
  }
  const writers = spec.writers || (LEADS[access] || (['public', 'member', 'staff'].includes(access) ? STAFF_KEYS : MANAGEMENT_KEYS));
  for (const key of new Set([...writers, ...MANAGEMENT_KEYS])) {
    if (roles[key]) put(roles[key].id, [...READ, ...WRITE]);
  }
  // An explicit bot overwrite also keeps the installer visible inside private departments.
  put(botId, [...READ, ...WRITE, 'ManageMessages']);
  return [...entries.values()];
}
function sameOverwrites(channel, desired) {
  const current = values(channel.permissionOverwrites?.cache);
  return current.length === desired.length && desired.every((want) => {
    const actual = current.find((entry) => entry.id === want.id);
    return actual && mask(actual.allow) === mask(want.allow) && mask(actual.deny) === mask(want.deny);
  });
}
function namedResource(cache, name, predicate) { return values(cache).find((item) => item.name === name && predicate(item)); }
function resourceName(cache, name, predicate) {
  for (let suffix = 0; suffix < 100; suffix++) {
    const candidate = suffix ? `${name} • CC${suffix}`.slice(0, 100) : name;
    const existing = namedResource(cache, candidate, predicate);
    if (!existing) return candidate;
  }
  throw new Error(`Túl sok névütközés: ${name}`);
}
function freshState(previous = {}, serverCode) {
  return {
    ...previous, version: 1, completed: false, stage: 'roles',
    serverCode: serverCode === undefined ? previous.serverCode || '' : serverCode,
    roles: { ...(previous.roles || {}) }, categories: { ...(previous.categories || {}) },
    channels: { ...(previous.channels || {}) }, panels: { ...(previous.panels || {}) },
    session: { ...(previous.session || { status: 'closed' }) },
    installedAt: previous.installedAt || new Date().toISOString()
  };
}
function normalizeServerCode(value) {
  if (value === undefined || value === null) return undefined;
  const code = String(value).trim();
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(code)) throw new Error('A szerverkód 1–32 betűből, számból, kötőjelből vagy aláhúzásból állhat.');
  return code;
}
async function saveState(guildId, state) {
  const config = getGuildConfig(guildId);
  config.installations ||= {};
  config.installations.crownCity = state;
  await setGuildConfig(guildId, config);
}
async function upsertCrownPanel(channel, key, payload, state, botId) {
  const safePayload = { ...payload, allowedMentions: { parse: [] } };
  for (const embed of safePayload.embeds || []) embed.setFooter({ text: `Crown City RP • NEXA • ${key}` });
  let message = null;
  if (state.panels[key]) {
    try { message = await channel.messages.fetch(state.panels[key]); }
    catch (error) { if (Number(error.code) !== 10008) throw error; }
  }
  if (!message) {
    const recent = await channel.messages.fetch({ limit: 100 });
    message = recent.find((item) => item.author.id === botId && item.embeds?.some((embed) => embed.footer?.text === `Crown City RP • NEXA • ${key}`));
  }
  if (message && message.author.id !== botId) throw new Error(`A(z) ${key} panel azonosítója nem NEXA-üzenetre mutat.`);
  if (message) await message.edit(safePayload);
  else message = await channel.send(safePayload);
  state.panels[key] = message.id;
  return message;
}

function applicationTemplate(spec, roles, channels) {
  return {
    key: spec.key, title: spec.title, emoji: spec.emoji,
    description: `Jelentkezés a Crown City RP ${spec.department} részlegéhez. Válaszolj saját szavaiddal a kérdésekre. A válaszokat a kijelölt bírálók privát csatornában értékelik.`,
    openChannelId: channels[spec.open].id, reviewChannelId: channels[spec.review].id,
    resultChannelId: channels[spec.review].id, accessRoleId: roles.civil.id,
    reviewerRoleId: roles[spec.reviewer].id, acceptedRoleId: roles[spec.accepted].id,
    notificationRoleId: roles[spec.reviewer].id, blindReview: true, active: true, cooldownHours: 24,
    questions: [
      'Mi a Roblox-felhasználóneved és RP-karaktered neve?', 'Mennyi ER:LC RP-tapasztalatod van?',
      'Miért erre a részlegre jelentkezel?', 'Mikor tudsz általában részt venni sessionön vagy képzésen?',
      'Mutasd be röviden az MG, PG, RDM és VDM fogalmát.', ...spec.extra
    ].map((label) => ({ label, placeholder: 'Írd le saját szavaiddal.', required: true, maxLength: 1000 }))
  };
}
async function configureCrown(guild, state, roles, channels, categories, actorId, previous) {
  const config = getGuildConfig(guild.id);
  if (!state.configured) {
    await grantGuildPlan(guild.id, 'ultimate', { days: null, grantedBy: actorId, note: 'Crown City RP • elsődleges NEXA-tulajdonosi RP szerver' });
    const owner = getOwnerSettings();
    if (!owner.rpGuilds.includes(guild.id)) { owner.rpGuilds.push(guild.id); await setOwnerSettings(owner); }
    config.language = 'hu'; config.commandLanguage = 'hu';
    for (const key of [...MODULES, 'protection']) config.modules[key] = true;
    Object.assign(config.channels, {
      welcome: channels.welcome.id, goodbye: channels.memberLogs.id, ticketPanel: channels.ticketPanel.id,
      ticketCategory: categories.tickets.id, logs: channels.moderationLogs.id, warnings: channels.moderationLogs.id,
      securityLogs: channels.securityLogs.id, moderationPanel: channels.staffChat.id,
      controlCenter: channels.serverControl.id, verification: channels.verification.id,
      suggestions: channels.suggestions.id, announcements: channels.announcements.id
    });
    Object.assign(config.roles, { staff: roles.support.id, auto: roles.newMember.id, human: roles.newMember.id,
      bot: roles.bot.id, dashboard: roles.manager.id, verified: roles.civil.id });
    config.messages.welcome = `👑 Üdvözlünk Crown Cityben, {tag}! Szabályzat: <#${channels.rules.id}> • Hitelesítés: <#${channels.verification.id}> • Ügyintézés: <#${channels.ticketPanel.id}>`;
    config.messages.goodbye = '👋 {username} elhagyta Crown City RP közösségét.';
    config.messages.ticket = 'Válassz ügytípust. A NEXA privát csatornát nyit neked és a Crown City Staff csapatának.';
    config.tickets.enabledTypes = ['support', 'report', 'application', 'partnership', 'other'];
    Object.assign(config.tickets.labels, { support: 'Segítség / technikai hiba', report: 'Játékosbejelentés / fellebbezés', application: 'Frakció / Staff kérdés', partnership: 'Partnerség', other: 'Egyéb ügy' });
    config.community.selfRoles = SELF_ROLE_KEYS.map((key) => roles[key].id);
    Object.assign(config.branding, { title: 'Crown City RP • Control Center', primary: '#c9a55c', accent: '#748fa6' });
    Object.assign(config.protection, { sensitivity: 'medium', freshAccounts: false, raidDetection: false,
      kick: false, ban: false, lockdown: false, links: false, timeout: true, warn: true });
    config.protection.whitelistRoles = [...new Set([...config.protection.whitelistRoles, ...MANAGEMENT_KEYS.map((key) => roles[key].id)])];
  }
  // Repaired resource IDs replace only references that were part of this installation.
  const bindings = { welcome: 'welcome', goodbye: 'memberLogs', ticketPanel: 'ticketPanel', logs: 'moderationLogs',
    warnings: 'moderationLogs', securityLogs: 'securityLogs', moderationPanel: 'staffChat', controlCenter: 'serverControl',
    verification: 'verification', suggestions: 'suggestions', announcements: 'announcements' };
  for (const [key, resourceKey] of Object.entries(bindings)) {
    if (!state.configured || config.channels[key] === previous?.channels?.[resourceKey] || !config.channels[key]) config.channels[key] = channels[resourceKey].id;
  }
  if (!state.configured || config.channels.ticketCategory === previous?.categories?.tickets || !config.channels.ticketCategory) config.channels.ticketCategory = categories.tickets.id;
  for (const [key, resourceKey] of Object.entries({ staff: 'support', auto: 'newMember', human: 'newMember', bot: 'bot', dashboard: 'manager', verified: 'civil' })) {
    if (!state.configured || config.roles[key] === previous?.roles?.[resourceKey] || !config.roles[key]) config.roles[key] = roles[resourceKey].id;
  }
  if (state.configured) {
    config.community.selfRoles = config.community.selfRoles.map((id) => {
      const key = SELF_ROLE_KEYS.find((name) => previous?.roles?.[name] === id);
      return key ? roles[key].id : id;
    });
  }
  const crownKeys = new Set(CROWN_APPLICATIONS.map((item) => item.key));
  const oldTemplates = config.applications.templates.filter((item) => !crownKeys.has(item.key));
  config.applications.templates = [...oldTemplates, ...CROWN_APPLICATIONS.map((spec) => {
    const template = applicationTemplate(spec, roles, channels);
    const previous = config.applications.templates.find((item) => item.key === spec.key);
    return previous ? { ...template, questions: previous.questions, cooldownHours: previous.cooldownHours, active: previous.active, blindReview: previous.blindReview } : template;
  })];
  state.configured = true; config.installations.crownCity = state;
  await setGuildConfig(guild.id, config);
}

async function setupCrownCity(guild, botUser, actorId, options = {}) {
  if (!guild || !botUser?.id) throw new Error('A telepítéshez Discord-szerver és csatlakoztatott NEXA bot kell.');
  const actor = await guild.members.fetch(actorId);
  if (!actorAllowed(guild, actor)) throw new Error('A Crown City telepítőt kizárólag az elsődleges NEXA-tulajdonos használhatja, Rendszergazda vagy szervertulajdonosi joggal.');
  if (guild.id === SUPPORT_GUILD_ID || getGuildConfig(guild.id).installations?.cia?.completed) throw new Error('Ehhez külön Crown City RP Discord-szervert használj; a Support- és CIA-telepítés szervere védett.');
  if (installLocks.has(guild.id) || sessionLocks.has(guild.id)) throw new Error('Ezen a szerveren már folyamatban van Crown City művelet.');
  const code = normalizeServerCode(options.serverCode);
  installLocks.add(guild.id);
  const previous = getGuildConfig(guild.id).installations?.crownCity || {};
  const state = freshState(previous, code);
  const result = { roles: {}, categories: {}, channels: {}, createdRoles: 0, createdCategories: 0, createdChannels: 0, panels: 0, warnings: [] };
  let operations = 0;
  const checkpoint = async (force = false) => {
    if (force || ++operations % 8 === 0) {
      state.updatedAt = new Date().toISOString(); await saveState(guild.id, state);
      await options.onProgress?.({ stage: state.stage, ...result });
    }
  };
  try {
    await guild.roles.fetch(); await guild.channels.fetch();
    const me = guild.members.fetchMe ? await guild.members.fetchMe() : guild.members.me;
    if (!me?.permissions?.has(PermissionFlagsBits.Administrator)) throw new Error('A NEXA botnak Rendszergazda jogosultság és kezelhető ranghely szükséges.');
    const rolesNeeded = CROWN_ROLES.filter((spec) => !guild.roles.cache.has(state.roles[spec.key]) && !namedResource(guild.roles.cache, spec.name, (role) => !role.managed && mask(role.permissions) === mask(bits(spec.permissions)))).length;
    const channelCount = CROWN_CATEGORIES.length + CROWN_CATEGORIES.reduce((sum, spec) => sum + spec.channels.length, 0);
    const recorded = Object.values({ ...state.categories, ...state.channels }).filter((id) => guild.channels.cache.has(id)).length;
    if (guild.roles.cache.size + rolesNeeded > 250 || guild.channels.cache.size + channelCount - recorded > 500) throw new Error('A teljes Crown City sablon nem fér el a szerver rang- vagy csatornakeretében.');
    const templates = getGuildConfig(guild.id).applications.templates;
    if (templates.filter((item) => !CROWN_APPLICATIONS.some((spec) => spec.key === item.key)).length > 10) throw new Error('Az öt Crown City jelentkezéshez legalább öt szabad jelentkezési sablonhely szükséges.');
    if (!getOwnerSettings().rpGuilds.includes(guild.id) && getOwnerSettings().rpGuilds.length >= 250) throw new Error('A tulajdonosi RP-szerverlista betelt.');
    state.installedBy ||= actorId; await checkpoint(true);
    const newRoles = [];
    for (const spec of CROWN_ROLES) {
      let role = guild.roles.cache.get(state.roles[spec.key]);
      if (role?.managed) throw new Error(`A mentett ${spec.name} rangot más integráció kezeli.`);
      if (!role) role = namedResource(guild.roles.cache, spec.name, (item) => !item.managed && mask(item.permissions) === mask(bits(spec.permissions)));
      if (!role) {
        role = await guild.roles.create({ name: resourceName(guild.roles.cache, spec.name, () => true), colors: { primaryColor: spec.color },
          hoist: spec.hoist, mentionable: false, permissions: bits(spec.permissions), reason: REASON });
        newRoles.push(role); result.createdRoles++;
      }
      if (!role.editable) throw new Error(`A NEXA rangját tedd a(z) ${role.name} rang fölé, majd futtasd újra.`);
      result.roles[spec.key] = role; state.roles[spec.key] = role.id; await checkpoint();
    }
    if (newRoles.length) await guild.roles.setPositions(newRoles.slice().reverse().map((role, index) => ({ role: role.id, position: index + 1 })), REASON);
    if (guild.ownerId === actorId && !actor.roles.cache.has(result.roles.owner.id)) await actor.roles.add(result.roles.owner.id, REASON);
    state.stage = 'channels'; await checkpoint(true);
    for (const spec of CROWN_CATEGORIES) {
      const previousCategoryId = state.categories[spec.key];
      const recreateCategory = Boolean(previousCategoryId && !guild.channels.cache.has(previousCategoryId));
      const permissionOverwrites = crownPermissions(guild, result.roles, botUser.id, spec.access);
      let category = guild.channels.cache.get(state.categories[spec.key]);
      if (category && category.type !== ChannelType.GuildCategory) throw new Error(`Hibás mentett kategória: ${spec.name}`);
      if (!category) category = namedResource(guild.channels.cache, spec.name, (item) => item.type === ChannelType.GuildCategory && sameOverwrites(item, permissionOverwrites));
      if (!category) { category = await guild.channels.create({ name: resourceName(guild.channels.cache, spec.name, (item) => item.type === ChannelType.GuildCategory), type: ChannelType.GuildCategory, permissionOverwrites, reason: REASON }); result.createdCategories++; }
      result.categories[spec.key] = category; state.categories[spec.key] = category.id; await checkpoint();
      for (const child of spec.channels) {
        const access = child.access || spec.access;
        const desired = crownPermissions(guild, result.roles, botUser.id, access, child);
        let channel = guild.channels.cache.get(state.channels[child.key]);
        if (channel && channel.type !== typeFor(child)) throw new Error(`Hibás mentett csatornatípus: ${child.name}`);
        if (channel && recreateCategory && !channel.parentId) await channel.setParent(category.id, { lockPermissions: false, reason: REASON });
        if (!channel) channel = namedResource(guild.channels.cache, child.name, (item) => item.type === typeFor(child) && item.parentId === category.id && sameOverwrites(item, desired));
        if (!channel) {
          const data = { name: resourceName(guild.channels.cache, child.name, (item) => item.parentId === category.id),
            type: typeFor(child), parent: category.id, permissionOverwrites: desired, reason: REASON };
          if (child.type === 'voice') { data.userLimit = child.userLimit; data.bitrate = Math.min(64000, guild.maximumBitrate || 64000); }
          else { data.topic = `Crown City RP • ${child.topic}`; data.rateLimitPerUser = child.slowmode || 0; }
          channel = await guild.channels.create(data); result.createdChannels++;
        }
        result.channels[child.key] = channel; state.channels[child.key] = channel.id; await checkpoint();
      }
    }
    state.stage = 'configuration'; await checkpoint(true);
    await configureCrown(guild, state, result.roles, result.channels, result.categories, actorId, previous);
    state.stage = 'panels'; await checkpoint(true);
    for (const category of CROWN_CATEGORIES) for (const spec of category.channels.filter((item) => item.type === 'text')) {
      let payload = { embeds: [contentForChannel(spec, state, result.roles, result.channels)] };
      if (spec.key === 'verification') {
        payload = verificationPanel('hu');
        payload.embeds = [crownEmbed(spec.key, '✅ Crown City • Belépés', `Olvasd el a Discord- és RP-szabályzatot, majd kattints az **Ellenőrzés és belépés** gombra.\n\nMegkapod a <@&${result.roles.civil.id}> rangot, és megnyílnak a közösségi szobák, a sessionök és a jelentkezések.\nSegítséget az ügyintézési központban kérhetsz.`)];
      }
      if (spec.key === 'ticketPanel') {
        const config = getGuildConfig(guild.id);
        payload = ticketPanel(config.messages.ticket, 'hu', config.tickets.enabledTypes, config.tickets.labels);
        payload.embeds = [crownEmbed(spec.key, '🎫 Crown City • Ügyintézés', '**Válassz ügytípust az alábbi menüből.**\n\n• Segítség és technikai probléma\n• Játékosbejelentés vagy fellebbezés\n• Frakció- és Staff-kérdés\n• Partnerség\n• Egyéb ügy\n\nA rendszer külön **privát ügycsatornát** nyit neked és a Crown City Staff csapatának. Írd le a körülményeket, és ha szükséges, csatolj játékbeli bizonyítékot.')];
      }
      if (spec.key === 'notificationRoles') {
        payload = rolePanel(guild, SELF_ROLE_KEYS.map((key) => result.roles[key].id), 'button');
        payload.embeds = [crownEmbed(spec.key, '🔔 Crown City • Értesítési rangok', 'Válaszd ki, miről szeretnél értesítést kapni: **sessionnyitás**, **események**, **hírek és fejlesztések**.\n\nA gombokkal külön felveheted vagy leveheted a rangokat. A Staff- és frakciórangokat a vezetőség osztja ki.')];
      }
      if (spec.key === 'sessionControl') payload = sessionPanel(state);
      const application = CROWN_APPLICATIONS.find((item) => item.open === spec.key);
      if (application) {
        const available = isPersistentStore() && getModuleState(guild.id, 'bvi').enabled;
        const template = getGuildConfig(guild.id).applications.templates.find((item) => item.key === application.key);
        payload = { embeds: [crownEmbed(spec.key, `${application.emoji} ${application.title}`, `${template.description}\n\n**Kérdések:** ${template.questions.length}\n**Elbírálás:** privát, vak bírálat\n**Kezdő rang:** <@&${result.roles[application.accepted].id}>${available ? '' : '\n\nA jelentkezés még nem aktív. A vezetőség az állapotellenőrzéssel tudja megnézni a hiányzó beállítást.'}`)],
          components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`tgf_start:${application.key}`)
            .setLabel(available ? 'Jelentkezés indítása' : 'Jelentkezés előkészítve').setStyle(ButtonStyle.Primary).setDisabled(!available))] };
      }
      await upsertCrownPanel(result.channels[spec.key], spec.key, payload, state, botUser.id); result.panels++; await checkpoint();
    }
    state.stage = 'completed'; state.completed = true; await checkpoint(true);
    const audit = auditCrownCity(guild); result.warnings = audit.warnings;
    await recordAudit('crown_city_install', { actorId, guildId: guild.id, metadata: { createdRoles: result.createdRoles, createdChannels: result.createdChannels, createdCategories: result.createdCategories } }).catch(() => null);
    return result;
  } catch (error) {
    state.stage = 'interrupted'; state.completed = false;
    await saveState(guild.id, state).catch(() => null);
    throw error;
  } finally { installLocks.delete(guild.id); }
}

function auditCrownCity(guild) {
  const state = getGuildConfig(guild.id).installations?.crownCity;
  const missingRoles = [], missingCategories = [], missingChannels = [], warnings = [];
  for (const spec of CROWN_ROLES) if (!guild.roles.cache.has(state?.roles?.[spec.key])) missingRoles.push(spec.name);
  for (const category of CROWN_CATEGORIES) {
    if (!guild.channels.cache.has(state?.categories?.[category.key])) missingCategories.push(category.name);
    for (const child of category.channels) {
      const channel = guild.channels.cache.get(state?.channels?.[child.key]);
      if (!channel || channel.type !== typeFor(child)) { missingChannels.push(child.name); continue; }
      if ((child.access || category.access) !== 'public') {
        const overwrite = channel.permissionOverwrites.cache.get(guild.id);
        if (!overwrite || !(mask(overwrite.deny) & PermissionFlagsBits.ViewChannel)) warnings.push(`A privát láthatóság módosult: ${channel.name}`);
        const allowed = new Set([...accessKeys(child.access || category.access), ...(child.readers || []), ...(child.writers || []), ...MANAGEMENT_KEYS].map((key) => state.roles[key]).filter(Boolean));
        if (guild.members.me?.id) allowed.add(guild.members.me.id);
        for (const entry of values(channel.permissionOverwrites.cache)) {
          if (entry.id !== guild.id && !allowed.has(entry.id) && (mask(entry.allow) & PermissionFlagsBits.ViewChannel)) warnings.push(`További hozzáférés a(z) ${channel.name} csatornához: ${entry.id}`);
        }
      }
    }
  }
  if (state) {
    if (!getOwnerSettings().rpGuilds.includes(guild.id)) warnings.push('A szerver nincs engedélyezve az Owner Center RP-szerverlistáján.');
    for (const key of MODULES) { const module = getModuleState(guild.id, key); if (!module.enabled) warnings.push(`A(z) ${key} modul nem aktív${module.remotelyDisabled ? ' (Owner Center tiltás)' : !module.planAllowed ? ' (csomagjog)' : ''}.`); }
    if (!isPersistentStore()) warnings.push('A jelentkezésekhez és az újraindítás utáni tartós mentéshez PostgreSQL adatbázis szükséges.');
    for (const spec of CROWN_APPLICATIONS) if (!getGuildConfig(guild.id).applications.templates.some((item) => item.key === spec.key && item.active)) warnings.push(`A jelentkezés nem aktív: ${spec.title}`);
  }
  return { installed: Boolean(state), completed: Boolean(state?.completed), missingRoles, missingCategories, missingChannels,
    complete: Boolean(state?.completed) && !missingRoles.length && !missingCategories.length && !missingChannels.length, warnings: [...new Set(warnings)] };
}

async function handleCrownCityCommand(interaction) {
  if (!interaction.guild || !isBotOwner(interaction.user.id)) return interaction.reply({ content: '❌ Ezt a telepítőt kizárólag a NEXA elsődleges tulajdonosa használhatja Discord-szerveren.', flags: EPHEMERAL });
  const actor = await interaction.guild.members.fetch(interaction.user.id);
  if (!actorAllowed(interaction.guild, actor)) return interaction.reply({ content: '❌ A cél Discord-szerveren Rendszergazda vagy szervertulajdonosi jogosultság szükséges.', flags: EPHEMERAL });
  await interaction.deferReply({ flags: EPHEMERAL });
  const action = interaction.options.getSubcommand();
  if (action === 'ellenorzes') {
    await interaction.guild.roles.fetch(); await interaction.guild.channels.fetch();
    const audit = auditCrownCity(interaction.guild);
    const missing = [...audit.missingRoles, ...audit.missingCategories, ...audit.missingChannels];
    return interaction.editReply({ content: `👑 **Crown City RP • Állapot**\n${audit.complete ? '✅ A szerverstruktúra teljes.' : audit.installed ? '⚠️ A telepítés hiányos vagy megszakadt.' : 'A Crown City rendszer még nincs telepítve.'}\n**Rangok:** ${CROWN_ROLES.length - audit.missingRoles.length}/${CROWN_ROLES.length}\n**Kategóriák:** ${CROWN_CATEGORIES.length - audit.missingCategories.length}/${CROWN_CATEGORIES.length}\n**Csatornák:** ${CROWN_CATEGORIES.reduce((sum, spec) => sum + spec.channels.length, 0) - audit.missingChannels.length}/${CROWN_CATEGORIES.reduce((sum, spec) => sum + spec.channels.length, 0)}${missing.length ? `\n**Hiányzó elemek:** ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}` : ''}${audit.warnings.length ? `\n**Teendők:**\n${audit.warnings.slice(0, 8).map((text) => `• ${text}`).join('\n')}` : ''}\nJavítás: \`/crown-city javitas\``, allowedMentions: { parse: [] } });
  }
  if (!['telepites', 'javitas'].includes(action)) return interaction.editReply('❌ Ismeretlen Crown City művelet.');
  if (action === 'javitas' && !getGuildConfig(interaction.guildId).installations?.crownCity) return interaction.editReply('Előbb futtasd: `/crown-city telepites`.');
  const stages = { roles: 'Rangok és szervezeti hierarchia', channels: 'Csatornák és privát hozzáférések', configuration: 'Botmodulok és jelentkezések', panels: 'Szabályzatok és kezelőpanelek', completed: 'Befejezés' };
  try {
    const result = await setupCrownCity(interaction.guild, interaction.client.user, interaction.user.id, {
      serverCode: interaction.options.getString('szerverkod'),
      onProgress: async (status) => { await interaction.editReply(`👑 **Crown City RP készül…**\n${stages[status.stage] || status.stage}\nRangok: ${Object.keys(status.roles).length}/${CROWN_ROLES.length} • Szobák: ${Object.keys(status.channels).length} • Panelek: ${status.panels}`).catch(() => null); }
    });
    return interaction.editReply({ content: `✅ **Crown City RP elkészült!**\n**${Object.keys(result.roles).length} rang • ${Object.keys(result.categories).length} kategória • ${Object.keys(result.channels).length} szoba**\n**Új elemek:** ${result.createdRoles} rang, ${result.createdCategories} kategória, ${result.createdChannels} szoba.\n**${result.panels} információs és kezelőpanel**, 5 részleg jelentkezésével.\nHitelesítés: <#${result.channels.verification.id}> • Ügyintézés: <#${result.channels.ticketPanel.id}>\nSession központ: <#${result.channels.sessionControl.id}>${result.warnings.length ? `\n⚠️ **Teendők:**\n${result.warnings.slice(0, 5).map((text) => `• ${text}`).join('\n')}` : ''}\nÁllapot: \`/crown-city ellenorzes\``, allowedMentions: { parse: [] } });
  } catch (error) {
    await recordError(error, { command: `crown-city ${action}`, guildId: interaction.guildId, userId: interaction.user.id }).catch(() => null);
    return interaction.editReply({ content: `⚠️ **A Crown City telepítés megszakadt.**\n${String(error.message || error).slice(0, 650)}\nJavítás után futtasd újra ugyanazt a parancsot. A mentett elemeket a telepítő folytatáskor felismeri.`, allowedMentions: { parse: [] } });
  }
}

async function freshSessionActor(interaction) {
  if (!interaction.guild) throw new Error('A session csak Discord-szerveren kezelhető.');
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const state = getGuildConfig(interaction.guildId).installations?.crownCity;
  if (!state?.completed) throw new Error('Ezen a szerveren nincs teljes Crown City RP telepítés.');
  const allowedIds = [...STAFF_KEYS, 'eventHost'].map((key) => state.roles[key]).filter(Boolean);
  if (interaction.guild.ownerId !== member.id && !allowedIds.some((id) => member.roles.cache.has(id))) throw new Error('Sessiont kizárólag a Crown City Staff vagy a Session Host kezelhet.');
  if (installLocks.has(interaction.guildId) || sessionLocks.has(interaction.guildId)) throw new Error('Már folyamatban van egy Crown City művelet.');
  return state;
}
function claimSession(guildId) {
  if (installLocks.has(guildId) || sessionLocks.has(guildId)) throw new Error('Már folyamatban van egy Crown City művelet.');
  sessionLocks.add(guildId);
  return getGuildConfig(guildId).installations.crownCity;
}
async function updateSessionPanel(interaction, state) {
  const channel = interaction.guild.channels.cache.get(state.channels.sessionControl);
  if (channel) { await upsertCrownPanel(channel, 'sessionControl', sessionPanel(state), state, interaction.client.user.id); await saveState(interaction.guildId, state); }
}
async function handleCrownSessionButton(interaction) {
  try {
    let state = await freshSessionActor(interaction);
    if (interaction.customId === 'crown_session_open') {
      if (state.session.status === 'open') throw new Error('Már van aktív, meghirdetett session. Előbb zárd le.');
      return interaction.showModal(new ModalBuilder().setCustomId('crown_session_submit').setTitle('Crown City • Session meghirdetése')
        .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Session neve / rövid leírása').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('code').setLabel('ER:LC szerverkód (ha módosult)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32))));
    }
    if (interaction.customId !== 'crown_session_close') throw new Error('Ismeretlen session művelet.');
    if (state.session.status !== 'open') throw new Error('Nincs aktív session.');
    state = claimSession(interaction.guildId);
    try {
      if (state.session.status !== 'open') throw new Error('Nincs aktív session.');
      await interaction.deferReply({ flags: EPHEMERAL });
      const channel = interaction.guild.channels.cache.get(state.channels.sessionFeed);
      if (!channel) throw new Error('A sessionállapot csatornája hiányzik. Kérd a telepítés javítását.');
      await channel.send({ embeds: [crownEmbed('sessionClosed', '⚫ A session lezárult', `**Session:** ${state.session.title}\n**Lezárta:** <@${interaction.user.id}>\nKöszönjük a részvételt! A következő nyitást itt hirdetjük meg.`)], allowedMentions: { parse: [] } });
      state.session = { ...state.session, status: 'closed', closedAt: new Date().toISOString(), closedBy: interaction.user.id };
      await saveState(interaction.guildId, state); await updateSessionPanel(interaction, state);
      return interaction.editReply('✅ A session lezárását közzétettem.');
    } finally { sessionLocks.delete(interaction.guildId); }
  } catch (error) { return interaction.deferred ? interaction.editReply(`❌ ${error.message}`) : interaction.reply({ content: `❌ ${error.message}`, flags: EPHEMERAL }); }
}
async function handleCrownSessionModal(interaction) {
  let locked = false;
  try {
    await freshSessionActor(interaction);
    const state = claimSession(interaction.guildId); locked = true;
    if (state.session.status === 'open') throw new Error('Közben már meghirdettek egy sessiont.');
    const code = normalizeServerCode(interaction.fields.getTextInputValue('code') || undefined) || state.serverCode;
    if (!code) throw new Error('A sessionhez add meg az ER:LC privátszerverkódot.');
    const title = interaction.fields.getTextInputValue('title').trim().replace(/[\r\n]/g, ' ').slice(0, 100);
    if (!title) throw new Error('Add meg a session nevét.');
    await interaction.deferReply({ flags: EPHEMERAL });
    const channel = interaction.guild.channels.cache.get(state.channels.sessionFeed);
    if (!channel) throw new Error('A sessionállapot csatornája hiányzik. Kérd a telepítés javítását.');
    const openedAt = new Date().toISOString();
    const message = await channel.send({ content: `<@&${state.roles.sessionPing}>`,
      embeds: [crownEmbed('sessionOpened', '🟢 Crown City RP • Session nyitva', `**Session:** ${title}\n**Játék:** ER:LC\n**Belépési kód:** \`${code}\`\n**Session Host:** <@${interaction.user.id}>\n**Kezdés:** <t:${Math.floor(Date.parse(openedAt) / 1000)}:f>\n\nOlvasd el az RP-szabályzatot, és egyeztess a frakcióvezetőddel!`)],
      allowedMentions: { parse: [], roles: [state.roles.sessionPing] } });
    state.serverCode = code; state.session = { status: 'open', title, openedAt, openedBy: interaction.user.id, messageId: message.id };
    await saveState(interaction.guildId, state); await updateSessionPanel(interaction, state);
    return interaction.editReply('✅ A sessiont meghirdettem, és értesítettem a sessionrang tagjait.');
  } catch (error) { return interaction.deferred ? interaction.editReply(`❌ ${error.message}`) : interaction.reply({ content: `❌ ${error.message}`, flags: EPHEMERAL }); }
  finally { if (locked) sessionLocks.delete(interaction.guildId); }
}
module.exports = { buildCrownCityCommand, registerCrownCityInOwnerGuilds, crownStaffRoleIds, crownPermissions,
  normalizeServerCode, setupCrownCity, auditCrownCity, handleCrownCityCommand, handleCrownSessionButton, handleCrownSessionModal };
