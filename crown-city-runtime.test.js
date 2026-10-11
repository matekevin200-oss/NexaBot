const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const discord = require('discord.js');
const { Collection, PermissionFlagsBits: P, PermissionsBitField } = discord;
const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
const ownerId = '100000000000000001', botId = '100000000000000002', guildId = '100000000000000099';
process.env.BOT_OWNER_ID = ownerId;
const copy = (value) => JSON.parse(JSON.stringify(value));
function load(name, dependencies = {}) {
  const marker = `"src/${name}.js": function(module, exports, require) {`;
  const start = source.indexOf(marker), end = source.indexOf('\n\n},\n"src/', start);
  assert.ok(start >= 0 && end > start, `Missing bundled module: ${name}`);
  const module = { exports: {} };
  const body = source.slice(start + marker.length, end) + (name === 'config' ? '\nmodule.exports.__mergeStoredConfig = mergeStoredConfig;' : '');
  new Function('module', 'exports', 'require', body)(module, module.exports, (request) =>
    request === 'discord.js' ? discord : Object.hasOwn(dependencies, request) ? dependencies[request] : request.startsWith('node:') ? require(request) : {});
  return module.exports;
}
const content = load('crown-city-content');
const realConfig = load('config', { pg: { Pool: class Pool {} }, './constants': { NAMES: {}, SUPPORT_GUILD_ID: '1556219615858655254' } });
function fixture() {
  const state = { config: realConfig.defaultConfig(guildId), owner: { rpGuilds: ['100000000000000088'], remoteDisabledModules: [] },
    createdRoles: 0, createdChannels: 0, sent: 0, edited: 0, deleted: 0, admin: true, persistent: true, failChannel: '', failPanel: '', grants: 0, audits: [] };
  const config = {
    ...realConfig, getGuildConfig: () => copy(state.config),
    setGuildConfig: async (_id, value) => { state.config = realConfig.sanitizeConfig(guildId, value); },
    getOwnerSettings: () => copy(state.owner), setOwnerSettings: async (value) => { state.owner = copy(value); await realConfig.setOwnerSettings(value); },
    isPersistentStore: () => state.persistent,
    grantGuildPlan: async () => { state.grants++; },
    getModuleState: (_id, key) => key === 'bvi'
      ? { enabled: state.owner.rpGuilds.includes(_id), configured: state.owner.rpGuilds.includes(_id), planAllowed: state.owner.rpGuilds.includes(_id), remotelyDisabled: false }
      : { enabled: Boolean(state.config.modules[key]) && !state.owner.remoteDisabledModules.includes(key),
        configured: Boolean(state.config.modules[key]), planAllowed: true, remotelyDisabled: state.owner.remoteDisabledModules.includes(key) },
    moduleEnabled: (_id, key) => key === 'bvi' ? state.owner.rpGuilds.includes(_id) : Boolean(state.config.modules[key]), dbQuery: async () => null,
    configuredChannel: (_guild, key) => channels.get(state.config.channels[key]),
    configuredRole: (_guild, key) => roles.get(state.config.roles[key])
  };
  const roles = new Collection(), channels = new Collection(), members = new Collection();
  let nextId = 100000000000010000n;
  const id = () => String(nextId++);
  const everyone = { id: guildId, name: '@everyone', managed: false, editable: false,
    permissions: new PermissionsBitField([P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.Connect, P.Speak]) };
  roles.set(everyone.id, everyone);
  const me = { id: botId, permissions: { has: () => state.admin }, roles: { highest: { position: 200 } } };
  const owner = { id: ownerId, roles: { cache: new Collection(), add: async (roleId) => owner.roles.cache.set(roleId, roles.get(roleId)) }, permissions: new PermissionsBitField(P.Administrator) };
  members.set(ownerId, owner); members.set(botId, me);
  const guild = {
    id: guildId, ownerId, name: 'Crown City RP', maximumBitrate: 64000,
    roles: { everyone, cache: roles, fetch: async () => roles,
      create: async (data) => {
        state.createdRoles++; const role = { ...data, id: id(), editable: true, managed: false,
          permissions: new PermissionsBitField(data.permissions), position: 1, edit: async () => { throw Error('Existing role was modified'); } };
        roles.set(role.id, role); return role;
      }, setPositions: async (entries) => { for (const entry of entries) roles.get(entry.role).position = entry.position; }
    },
    members: { me, cache: members, fetchMe: async () => me, fetch: async (memberId) => { if (!members.has(memberId)) throw Error('Unknown member'); return members.get(memberId); } },
    channels: { cache: channels, fetch: async () => channels,
      create: async (data) => {
        if (data.name === state.failChannel) throw Error('Injected channel failure');
        state.createdChannels++;
        const messageCache = new Collection();
        const channel = { ...data, id: id(), parentId: data.parent, isTextBased: () => data.type === 0,
          permissionOverwrites: { cache: new Collection((data.permissionOverwrites || []).map((entry) => [entry.id,
            { ...entry, allow: new PermissionsBitField(entry.allow), deny: new PermissionsBitField(entry.deny) }])) },
          messages: { cache: messageCache, fetch: async (value) => {
            if (typeof value === 'string') { if (!messageCache.has(value)) throw Object.assign(Error('Unknown Message'), { code: 10008 }); return messageCache.get(value); }
            return messageCache;
          } },
          send: async (payload) => {
            if (channel.name === state.failPanel) throw Error('Injected panel failure');
            for (const embed of payload.embeds || []) {
              const json = embed.toJSON(); assert.ok(JSON.stringify(json).length < 6000, 'Embed exceeds size budget');
            }
            state.sent++;
            const message = { id: id(), author: { id: botId }, payload, embeds: (payload.embeds || []).map((embed) => embed.toJSON()),
              edit: async (replacement) => { state.edited++; message.payload = replacement; message.embeds = (replacement.embeds || []).map((embed) => embed.toJSON()); return message; },
              delete: async () => { state.deleted++; throw Error('The installer must never delete messages'); } };
            messageCache.set(message.id, message); return message;
          }, setParent: async (parentId, options) => { assert.equal(options.lockPermissions, false); channel.parentId = parentId; },
          edit: async () => { throw Error('Existing channel was modified'); }
        };
        channels.set(channel.id, channel); return channel;
      }
    }, commands: { create: async (data) => data }
  };
  owner.guild = guild;
  const panel = (customId) => ({ embeds: [new discord.EmbedBuilder().setTitle(customId)], components: [new discord.ActionRowBuilder().addComponents(new discord.ButtonBuilder().setCustomId(customId).setLabel('Action').setStyle(discord.ButtonStyle.Primary))] });
  const panels = load('panels', { './constants': { COLORS: { primary: 1 } } });
  const utils = load('utils', { './config': config, './constants': { NAMES: {}, COLORS: { primary: 1, success: 2 } }, './crown-city-content': content });
  const community = load('community', { './config': config, './constants': { COLORS: { primary: 1 } }, './utils': utils });
  const telemetry = { recordAudit: async (...args) => state.audits.push(args), recordError: async () => {}, recordUsage: async () => {} };
  const runtime = load('crown-city', { './config': config, './constants': { SUPPORT_GUILD_ID: '1556219615858655254' },
    './crown-city-content': content, './command-localizations': load('command-localizations'),
    './panels': panels, './engagement': { verificationPanel: () => panel('engagement_verify') },
    './community': community, './telemetry': telemetry });
  const bot = { id: botId };
  const install = (options = {}) => runtime.setupCrownCity(guild, bot, ownerId, options);
  const interaction = (userId = ownerId, customId = '') => {
    const value = { guild, guildId, user: { id: userId, username: 'test', tag: 'test' }, customId,
      member: members.get(userId), client: { user: bot }, responses: [],
      reply: async (payload) => value.responses.push(payload), deferReply: async () => { value.deferred = true; },
      editReply: async (payload) => value.responses.push(payload), showModal: async (modal) => { value.modal = modal; } };
    return value;
  };
  return { state, config, runtime, guild, roles, channels, members, bot, owner, install, utils, panels, telemetry, interaction };
}
function effective(f, channelKey, roleKeys) {
  const state = f.state.config.installations.crownCity;
  const channel = f.channels.get(state.channels[channelKey]);
  const roleIds = roleKeys.map((key) => state.roles[key]);
  let result = f.roles.get(guildId).permissions.bitfield;
  for (const roleId of roleIds) result |= f.roles.get(roleId).permissions.bitfield;
  const base = channel.permissionOverwrites.cache.get(guildId);
  if (base) result = (result & ~base.deny.bitfield) | base.allow.bitfield;
  let allow = 0n, deny = 0n;
  for (const roleId of roleIds) { const entry = channel.permissionOverwrites.cache.get(roleId); if (entry) { allow |= entry.allow.bitfield; deny |= entry.deny.bitfield; } }
  return (result & ~deny) | allow;
}

test('Crown command validates against actual discord.js builders and localizations', () => {
  const f = fixture(); const json = load('command-localizations').localizeCommandJson(f.runtime.buildCrownCityCommand().toJSON());
  assert.equal(json.name, 'crown-city'); assert.equal(json.dm_permission, false);
  assert.equal(json.default_member_permissions, P.Administrator.toString());
  assert.deepEqual(json.options.map((option) => option.name), ['telepites', 'javitas', 'ellenorzes']);
  assert.equal(json.options[0].name_localizations['en-US'], 'install');
});
test('complete setup creates 69 roles, 15 categories, 98 channels and five private applications', async () => {
  const f = fixture(); const result = await f.install({ serverCode: 'Crown123' });
  assert.equal(result.createdRoles, 69); assert.equal(result.createdCategories, 15); assert.equal(result.createdChannels, 98);
  assert.equal(f.state.config.applications.templates.length, 5); assert.equal(f.runtime.auditCrownCity(f.guild).complete, true);
  assert.deepEqual(result.warnings, []); assert.ok(result.panels > 70);
  assert.equal(f.state.config.roles.human, result.roles.newMember.id);
  assert.notEqual(f.state.config.roles.human, f.state.config.roles.verified);
  assert.equal(f.state.config.protection.kick, false); assert.equal(f.state.config.protection.ban, false);
  assert.ok(f.state.owner.rpGuilds.includes('100000000000000088'));
  assert.ok(f.state.owner.rpGuilds.includes(guildId));
  for (const template of f.state.config.applications.templates) {
    assert.equal(template.resultChannelId, template.reviewChannelId);
    assert.ok(template.reviewChannelId !== template.openChannelId);
    assert.equal(template.questions.length, 8);
  }
});
test('unverified users have information and ticket access but no community or private department access', async () => {
  const f = fixture(); await f.install();
  assert.ok(effective(f, 'verification', ['newMember']) & P.ViewChannel);
  assert.ok(effective(f, 'ticketPanel', ['newMember']) & P.ViewChannel);
  assert.equal(effective(f, 'rules', ['newMember']) & P.SendMessages, 0n);
  assert.equal(effective(f, 'general', ['newMember']) & P.ViewChannel, 0n);
  assert.equal(effective(f, 'pdReports', ['newMember']) & P.ViewChannel, 0n);
});
test('actual Discord overwrite precedence isolates faction reviews, leadership and readonly channels', async () => {
  const f = fixture(); await f.install();
  assert.ok(effective(f, 'general', ['civil']) & P.SendMessages);
  assert.equal(effective(f, 'rules', ['civil']) & P.SendMessages, 0n);
  assert.equal(effective(f, 'announcements', ['civil']) & P.SendMessages, 0n);
  assert.ok(effective(f, 'pdReports', ['pdCadet']) & P.ViewChannel);
  assert.equal(effective(f, 'shReports', ['pdCadet']) & P.ViewChannel, 0n);
  assert.equal(effective(f, 'pdReview', ['pdCadet']) & P.ViewChannel, 0n);
  assert.ok(effective(f, 'pdReview', ['pdRecruiter']) & P.ViewChannel);
  assert.equal(effective(f, 'fdReview', ['pdRecruiter']) & P.ViewChannel, 0n);
  assert.ok(effective(f, 'staffChat', ['trialMod']) & P.ViewChannel);
  assert.equal(effective(f, 'managementChat', ['trialMod']) & P.ViewChannel, 0n);
  assert.equal(effective(f, 'pdChat', ['mod']) & P.ViewChannel, 0n);
  assert.ok(effective(f, 'jointRadio', ['fdEmt']) & P.Connect);
  for (const group of ['pd', 'sheriff', 'fd', 'dot']) for (const key of content.ROLE_GROUPS[group]) {
    assert.equal(f.roles.get(f.state.config.installations.crownCity.roles[key]).permissions.has(P.Administrator), false);
    assert.equal(f.roles.get(f.state.config.installations.crownCity.roles[key]).permissions.has(P.ManageGuild), false);
  }
});
test('repeated setup reuses every resource and edits only existing bot panels', async () => {
  const f = fixture(); await f.install();
  const first = copy(f.state.config.installations.crownCity), sent = f.state.sent;
  const result = await f.install({ serverCode: 'NEW456' });
  assert.equal(result.createdRoles, 0); assert.equal(result.createdCategories, 0); assert.equal(result.createdChannels, 0);
  assert.equal(f.state.sent, sent); assert.equal(f.state.deleted, 0); assert.equal(f.state.grants, 1);
  assert.deepEqual(f.state.config.installations.crownCity.channels, first.channels);
  assert.equal(f.state.config.installations.crownCity.serverCode, 'NEW456');
});
test('unrelated channels, manual Crown renames, permissions and disabled modules survive repair', async () => {
  const f = fixture(); const legacy = await f.guild.channels.create({ name: 'meglévő-szoba', type: 0, topic: 'ne módosítsd' });
  await f.install(); const crown = f.state.config.installations.crownCity;
  const general = f.channels.get(crown.channels.general); general.name = 'egyedi-beszélgetés'; general.topic = 'saját leírás';
  f.state.config.modules.welcome = false;
  const pd = f.channels.get(crown.channels.pdChat); pd.permissionOverwrites.cache.set('100000000000000777', { id: '100000000000000777', allow: new PermissionsBitField(P.ViewChannel), deny: new PermissionsBitField() });
  const result = await f.install();
  assert.equal(legacy.name, 'meglévő-szoba'); assert.equal(legacy.topic, 'ne módosítsd');
  assert.equal(general.name, 'egyedi-beszélgetés'); assert.equal(general.topic, 'saját leírás');
  assert.equal(f.state.config.modules.welcome, false); assert.equal(result.createdChannels, 0);
  assert.ok(result.warnings.some((message) => message.includes('További hozzáférés')));
});
test('a partial channel failure is persisted and resumes without duplicate roles or rooms', async () => {
  const f = fixture(); f.state.failChannel = '💬・ccpd-belső';
  await assert.rejects(f.install(), /Injected channel failure/);
  assert.equal(f.state.config.installations.crownCity.completed, false);
  const roleCount = f.roles.size; f.state.failChannel = '';
  const result = await f.install(); assert.equal(result.createdRoles, 0); assert.equal(f.roles.size, roleCount);
  assert.equal(f.channels.size, 113); assert.equal(f.runtime.auditCrownCity(f.guild).complete, true);
});
test('a partial panel failure resumes with no duplicate messages', async () => {
  const f = fixture(); f.state.failPanel = '❓・gyakori-kérdések';
  await assert.rejects(f.install(), /Injected panel failure/); f.state.failPanel = '';
  await f.install(); const counts = [...f.channels.values()].filter((channel) => channel.type === 0).map((channel) => channel.messages.cache.size);
  assert.ok(counts.every((count) => count === 1));
});
test('deleted managed resources repair role and channel configuration references', async () => {
  const f = fixture(); await f.install(); const before = copy(f.state.config.installations.crownCity);
  f.roles.delete(before.roles.civil); f.roles.delete(before.roles.sessionPing);
  f.channels.delete(before.channels.ticketPanel); f.channels.delete(before.channels.moderationLogs);
  await f.install(); const after = f.state.config.installations.crownCity;
  assert.notEqual(after.roles.civil, before.roles.civil);
  assert.equal(f.state.config.roles.verified, after.roles.civil);
  assert.equal(f.state.config.channels.ticketPanel, after.channels.ticketPanel);
  assert.equal(f.state.config.channels.logs, after.channels.moderationLogs);
  assert.equal(f.state.config.channels.warnings, after.channels.moderationLogs);
  assert.ok(f.state.config.community.selfRoles.includes(after.roles.sessionPing));
});
test('Crown installation and session survive the actual config reload sanitizer', async () => {
  const f = fixture(); await f.install({ serverCode: 'Crown123' });
  const original = copy(f.state.config.installations.crownCity);
  f.state.config = realConfig.__mergeStoredConfig(guildId, copy(f.state.config));
  assert.deepEqual(f.state.config.installations.crownCity, original);
  assert.equal((await f.install()).createdChannels, 0);
});
test('nonprimary owners, delegated owners and missing bot permissions cannot install', async () => {
  const f = fixture(); const delegated = '100000000000000003';
  f.members.set(delegated, { id: delegated, permissions: new PermissionsBitField(P.Administrator) });
  await assert.rejects(f.runtime.setupCrownCity(f.guild, f.bot, delegated), /elsődleges/);
  f.state.admin = false; await assert.rejects(f.install(), /Rendszergazda/);
  assert.equal(f.state.createdRoles, 0); assert.equal(f.state.createdChannels, 0);
});
test('concurrent installs are rejected and the per-guild lock releases after a failure', async () => {
  const f = fixture(); let second;
  await f.install({ onProgress: async (status) => { if (status.stage === 'roles' && !second) second = assert.rejects(f.install(), /folyamatban/); } });
  await second; assert.equal((await f.install()).createdRoles, 0);
});
test('role/channel capacity is checked before any resource mutations', async () => {
  const f = fixture(); for (let i = 0; i < 190; i++) f.roles.set(`existing-${i}`, { id: `existing-${i}`, name: `existing-${i}`, permissions: new PermissionsBitField(), managed: false });
  await assert.rejects(f.install(), /nem fér el/); assert.equal(f.state.createdRoles, 0);
});
test('missing PostgreSQL and remote module blocks are visible instead of fake working applications', async () => {
  const f = fixture(); f.state.persistent = false; f.state.owner.remoteDisabledModules = ['verification'];
  const result = await f.install(); assert.ok(result.warnings.some((message) => message.includes('PostgreSQL')));
  assert.ok(result.warnings.some((message) => message.includes('Owner Center')));
  const channel = f.channels.get(f.state.config.installations.crownCity.channels.pdApply);
  const button = channel.messages.cache.first().payload.components[0].toJSON().components[0];
  assert.equal(button.disabled, true);
});
test('session opening, opt-in notification and closing update the stored session and panel', async () => {
  const f = fixture(); await f.install({ serverCode: 'Crown123' });
  const open = f.interaction(ownerId, 'crown_session_submit'); open.fields = { getTextInputValue: (key) => key === 'title' ? 'Esti RP' : '' };
  await f.runtime.handleCrownSessionModal(open); assert.equal(f.state.config.installations.crownCity.session.status, 'open');
  const feed = f.channels.get(f.state.config.installations.crownCity.channels.sessionFeed); const latest = feed.messages.cache.last();
  assert.deepEqual(latest.payload.allowedMentions, { parse: [], roles: [f.state.config.installations.crownCity.roles.sessionPing] });
  const close = f.interaction(ownerId, 'crown_session_close'); await f.runtime.handleCrownSessionButton(close);
  assert.equal(f.state.config.installations.crownCity.session.status, 'closed');
});
test('civilian or another-server roles cannot operate sessions', async () => {
  const f = fixture(); await f.install(); const userId = '100000000000000004';
  f.members.set(userId, { id: userId, roles: { cache: new Collection([['other-server-host', {}]]) } });
  const interaction = f.interaction(userId, 'crown_session_open'); await f.runtime.handleCrownSessionButton(interaction);
  assert.ok(interaction.responses[0].content.includes('kizárólag')); assert.equal(interaction.modal, undefined);
});
test('simultaneous session submits announce only one session', async () => {
  const f = fixture(); await f.install({ serverCode: 'Crown123' });
  const submit = () => { const value = f.interaction(ownerId, 'crown_session_submit'); value.fields = { getTextInputValue: (key) => key === 'title' ? 'RP' : '' }; return value; };
  const first = submit(), second = submit(); await Promise.all([f.runtime.handleCrownSessionModal(first), f.runtime.handleCrownSessionModal(second)]);
  const feed = f.channels.get(f.state.config.installations.crownCity.channels.sessionFeed);
  assert.equal(feed.messages.cache.size, 2);
  assert.ok([...first.responses, ...second.responses].some((response) => typeof response === 'object' && response.content.includes('folyamatban')));
});
test('every Crown Staff rank is recognized without giving faction ranks moderator status', async () => {
  const f = fixture(); await f.install(); const crown = f.state.config.installations.crownCity;
  for (const key of content.STAFF_KEYS) assert.equal(f.utils.isStaff({ guild: f.guild, roles: { cache: new Collection([[crown.roles[key], f.roles.get(crown.roles[key])]]) } }), true);
  assert.equal(f.utils.isStaff({ guild: f.guild, roles: { cache: new Collection([[crown.roles.pdChief, f.roles.get(crown.roles.pdChief)]]) } }), false);
});
test('immediate guild registration isolates a failed guild and preserves other commands', async () => {
  const f = fixture(); const calls = [];
  const failed = { ...f.guild, id: '100000000000000098', commands: { create: async () => { throw Error('Injected registration failure'); } } };
  f.guild.commands.create = async (command) => { calls.push(command.name); };
  const result = await f.runtime.registerCrownCityInOwnerGuilds({ guilds: { cache: new Map([[failed.id, failed], [guildId, f.guild]]) } });
  assert.deepEqual(result.registered, [guildId]); assert.equal(result.failed.length, 1); assert.deepEqual(calls, ['crown-city']);
});
test('an orphaned managed channel returns to its recreated category without resetting overwrites', async () => {
  const f = fixture(); await f.install(); const old = f.state.config.installations.crownCity.categories.community;
  f.channels.delete(old);
  for (const channel of f.channels.values()) if (channel.parentId === old) channel.parentId = null;
  const before = f.channels.get(f.state.config.installations.crownCity.channels.general).permissionOverwrites.cache;
  const result = await f.install(); assert.equal(result.createdCategories, 1); assert.equal(result.createdChannels, 0);
  const general = f.channels.get(f.state.config.installations.crownCity.channels.general);
  assert.equal(general.parentId, f.state.config.installations.crownCity.categories.community);
  assert.equal(general.permissionOverwrites.cache, before);
});
test('the NEXA Support and completed CIA servers cannot receive the Crown installer', async () => {
  const f = fixture(); f.guild.id = '1556219615858655254';
  await assert.rejects(f.install(), /védett/); f.guild.id = guildId;
  f.state.config.installations.cia = { completed: true };
  await assert.rejects(f.install(), /védett/); assert.equal(f.state.createdRoles, 0);
});
test('Crown tickets are private to their creator and every authorized Staff rank', async () => {
  const f = fixture(); await f.install();
  const interactions = load('interactions', { './config': f.config, './crown-city': f.runtime, './panels': f.panels,
    './utils': f.utils, './telemetry': f.telemetry, './constants': { NAMES: {}, COLORS: { primary: 1, success: 2 } }, './i18n': { pick: (_id, hu) => hu } });
  const ticketOwnerId = '100000000000000008'; const interaction = f.interaction(ticketOwnerId);
  await interactions.createTicket(interaction, 'support');
  const channel = f.channels.find((item) => item.topic?.startsWith(`nexabot-ticket|${ticketOwnerId}|`));
  assert.ok(channel);
  assert.ok(channel.permissionOverwrites.cache.get(guildId).deny.has(P.ViewChannel));
  assert.ok(channel.permissionOverwrites.cache.get(ticketOwnerId).allow.has(P.ViewChannel));
  for (const roleId of f.runtime.crownStaffRoleIds(guildId)) assert.ok(channel.permissionOverwrites.cache.get(roleId).allow.has(P.ViewChannel));
  assert.equal(channel.permissionOverwrites.cache.has(f.state.config.installations.crownCity.roles.pdChief), false);
});
