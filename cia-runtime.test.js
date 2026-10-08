const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
const ownerId = '100000000000000001';
const botId = '100000000000000002';
process.env.BOT_OWNER_ID = ownerId;

class Collection extends Map {
  find(fn) { return [...this.values()].find(fn); }
  some(fn) { return [...this.values()].some(fn); }
  filter(fn) { return new Collection([...this].filter(([, value]) => fn(value))); }
}

class Embed {
  constructor() { this.data = { fields: [] }; }
  setColor(value) { this.data.color = value; return this; }
  setTitle(value) { this.data.title = value; return this; }
  setDescription(value) { this.data.description = value; return this; }
  setFooter(value) { this.data.footer = value; return this; }
  setTimestamp() { return this; }
  addFields(fields) { this.data.fields.push(...fields); return this; }
  toJSON() { return this.data; }
}

class Command {
  constructor() { this.data = { options: [] }; }
  setName(name) { this.data.name = name; return this; }
  setDescription(description) { this.data.description = description; return this; }
  setDefaultMemberPermissions(value) { this.data.default_member_permissions = value.toString(); return this; }
  setDMPermission(value) { this.data.dm_permission = value; return this; }
  addSubcommand(fn) { this.data.options.push(fn(new Command()).data); return this; }
  toJSON() { return this.data; }
}

const permissions = [...new Set([...source.matchAll(/PermissionFlagsBits\.([A-Za-z]+)/g)].map((m) => m[1]))];
const bits = Object.fromEntries(permissions.map((name, i) => [name, 1n << BigInt(i)]));
const discord = { ChannelType: { GuildText: 0, GuildVoice: 2, GuildCategory: 4 }, PermissionFlagsBits: bits, EmbedBuilder: Embed, SlashCommandBuilder: Command, MessageFlags: { Ephemeral: 64 } };

function load(name, dependencies = {}) {
  const marker = `"src/${name}.js": function(module, exports, require) {`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing bundle module ${name}`);
  const end = source.indexOf('\n\n},\n"src/', start);
  assert.ok(end > start, `missing bundle boundary ${name}`);
  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === 'discord.js') return discord;
    if (Object.hasOwn(dependencies, request)) return dependencies[request];
    if (request.startsWith('node:')) return require(request);
    return {};
  };
  new Function('module', 'exports', 'require', source.slice(start + marker.length, end))(module, module.exports, localRequire);
  return module.exports;
}

const content = load('cia-content');

function fixture() {
  const realConfig = load('config', { pg: { Pool: class Pool {} }, './constants': { NAMES: {} } });
  const guildId = '100000000000000099';
  const state = { config: realConfig.defaultConfig(guildId), created: 0, deleted: 0, failChannel: '', audits: [], errors: [] };
  const config = {
    ...realConfig,
    getGuildConfig: () => state.config,
    setGuildConfig: async (_id, value) => { state.config = realConfig.sanitizeConfig(guildId, value); },
    getOwnerSettings: () => ({ rpGuilds: [], ownerUsers: ['100000000000000003'], blacklistedUsers: [], blacklistedGuilds: [], maintenance: false }),
    setOwnerSettings: async () => {},
    grantGuildPlan: async () => {},
    isOwnerUser: (id) => id === ownerId || id === '100000000000000003'
  };
  const panel = (customId) => ({ components: [{ components: [{ customId }] }] });
  const cia = load('support-server', {
    './config': config,
    './constants': { COLORS: { primary: 1, success: 2, warning: 3, danger: 4 } },
    './cia-content': content,
    './command-localizations': { localizeCommandJson: (value) => value },
    './panels': { ticketPanel: () => panel('ticket_category_select'), staffPanel: () => panel('staff_actions') },
    './engagement': { verificationPanel: () => panel('engagement_verify') },
    './community': { rolePanel: () => panel('community_self_roles') },
    './shifts': { shiftPanel: () => panel('shift_start') },
    './applications': { installApplicationPanel: async () => {} },
    './documents': { installDocumentPanels: async () => ({ installed: state.config.documents.customTypes.map((type) => type.key) }) }
  });
  let nextId = 100000000000001000n;
  const id = () => String(nextId++);
  const roles = new Collection();
  const channels = new Collection();
  const memberRoles = new Collection();
  const guild = {
    id: guildId, ownerId: '100000000000000088', name: 'CIA Test',
    members: { me: { permissions: { has: () => true }, roles: { highest: { position: 80 } } } },
    roles: {
      everyone: { id: guildId }, cache: roles,
      fetch: async (roleId) => roleId ? roles.get(roleId) : roles,
      create: async (data) => {
        state.created++;
        const role = { id: id(), editable: true, managed: false, ...data, edit: async (changes) => { Object.assign(role, changes); return role; } };
        roles.set(role.id, role); return role;
      },
      setPositions: async (positions) => { for (const item of positions) item.role.position = item.position; }
    },
    channels: {
      cache: channels, fetch: async () => channels,
      create: async (data) => {
        if (data.name === state.failChannel) throw new Error('Injected channel failure');
        state.created++;
        const messages = new Collection();
        const overwrites = new Collection((data.permissionOverwrites || []).map((overwrite) => [overwrite.id, overwrite]));
        const channel = {
          id: id(), ...data, parentId: data.parent, messages: { fetch: async () => messages }, overwrites,
          isTextBased: () => channel.type === discord.ChannelType.GuildText,
          setName: async (value) => { channel.name = value; },
          setTopic: async (value) => { channel.topic = value; },
          setParent: async (value) => { channel.parentId = value; },
          permissionOverwrites: {
            set: async (values) => { overwrites.clear(); for (const value of values) overwrites.set(value.id, value); },
            edit: async (roleId, values) => { const current = overwrites.get(roleId) || { id: roleId, allow: [], deny: [] }; const allow = new Set(current.allow); const deny = new Set(current.deny); for (const [name, value] of Object.entries(values)) { if (value) { allow.add(bits[name]); deny.delete(bits[name]); } else { deny.add(bits[name]); allow.delete(bits[name]); } } overwrites.set(roleId, { id: roleId, allow: [...allow], deny: [...deny] }); }
          },
          lockPermissions: async () => { const parent = channels.get(channel.parentId); if (parent) await channel.permissionOverwrites.set([...parent.overwrites.values()]); },
          send: async (payload) => {
            const message = { id: id(), author: { id: botId }, content: payload.content, embeds: (payload.embeds || []).map((embed) => embed.toJSON?.() || embed), components: payload.components || [], delete: async () => { messages.delete(message.id); } };
            messages.set(message.id, message); return message;
          }
        };
        channels.set(channel.id, channel); return channel;
      },
      setPositions: async () => {}
    }
  };
  const owner = { id: ownerId, permissions: { has: () => true }, roles: { cache: memberRoles, add: async (role) => memberRoles.set(role.id, role) } };
  const bot = { id: botId };
  return { cia, config, guild, owner, bot, state, channels, roles };
}

test('all CIA mutators reject admins, server owners and delegated owners before changes', async () => {
  const f = fixture();
  for (const id of [f.guild.ownerId, '100000000000000003', '100000000000000004']) {
    const actor = { ...f.owner, id };
    for (const action of [f.cia.setupCiaServer, f.cia.repairCiaServer, f.cia.refreshCiaAmericanRanks]) {
      await assert.rejects(action(f.guild, f.bot, actor), { code: 'CIA_OWNER_REQUIRED' });
    }
  }
  assert.equal(f.state.created, 0);
});

test('primary owner can install and reinstall without duplicate resources or lost assignments', async () => {
  const f = fixture();
  const first = await f.cia.setupCiaServer(f.guild, f.bot, f.owner);
  assert.equal(first.roleCount, 26);
  assert.ok(first.categoryCount >= 17);
  assert.ok(first.channelCount > 100);
  const roleId = first.roles.specialAgent.id;
  const message = await first.channels.general.send({ content: 'User conversation survives' });
  message.author.id = '100000000000000007';
  await first.roles.specialAgent.edit({ name: 'Manually renamed CO' });
  await first.channels.ranks.setName('renamed-reference');
  await first.categories.operations.setName('renamed-category');
  const before = f.state.created;
  await assert.rejects(f.cia.setupCiaServer(f.guild, f.bot, f.owner), { code: 'CIA_ALREADY_INSTALLED' });
  const result = await f.cia.repairCiaServer(f.guild, f.bot, f.owner);
  assert.equal(f.state.created, before);
  assert.equal(result.roles.specialAgent.id, roleId);
  assert.equal(result.channels.ranks.id, first.channels.ranks.id);
  assert.equal(result.categories.operations.id, first.categories.operations.id);
  assert.equal(f.state.config.installations.cia.repairCount, 1);
  assert.ok((await result.channels.general.messages.fetch()).has(message.id));
  assert.equal(f.state.config.installations.cia.roles.chiefOfStaff, first.roles.chiefOfStaff.id);
  assert.equal(f.state.config.installations.cia.channels.operationVoiceTwo, first.channels.operationVoiceTwo.id);
});

test('reinstall repairs missing rooms and retains customized application questions', async () => {
  const f = fixture();
  const first = await f.cia.setupCiaServer(f.guild, f.bot, f.owner);
  f.state.config.applications.templates[0].title = 'Custom CIA application';
  f.state.config.applications.templates[0].cooldownHours = 24;
  f.state.config.applications.templates[0].questions[0].label = 'Custom question';
  f.channels.delete(first.channels.operationVoiceTwo.id);
  const next = await f.cia.repairCiaServer(f.guild, f.bot, f.owner);
  assert.notEqual(next.channels.operationVoiceTwo.id, first.channels.operationVoiceTwo.id);
  assert.equal(f.state.config.applications.templates[0].title, 'Custom CIA application');
  assert.equal(f.state.config.applications.templates[0].cooldownHours, 24);
  assert.equal(f.state.config.applications.templates[0].questions[0].label, 'Custom question');
});

test('old Discord-only V1 marker permits explicit migration but blocks first install', async () => {
  const f = fixture();
  const oldControl = await f.guild.channels.create({ name: '⚙️・cia-rendszer', type: discord.ChannelType.GuildText, topic: `NEXA_CIA_INSTALLATION_V1:${f.guild.id}` });
  assert.equal(f.cia.isCiaInstallationComplete(f.guild), true);
  await assert.rejects(f.cia.setupCiaServer(f.guild, f.bot, f.owner), { code: 'CIA_ALREADY_INSTALLED' });
  const upgraded = await f.cia.repairCiaServer(f.guild, f.bot, f.owner);
  assert.equal(upgraded.channels.systemControl.id, oldControl.id);
  assert.equal(f.state.config.installations.cia.version, 2);
});

test('interrupted first install keeps resource IDs and can continue after the failure is fixed', async () => {
  const f = fixture();
  f.state.failChannel = '🧭・szerver-útmutató';
  await assert.rejects(f.cia.setupCiaServer(f.guild, f.bot, f.owner), /Injected channel failure/);
  assert.equal(f.state.config.installations.cia.completed, false);
  const retainedRoles = Object.values(f.state.config.installations.cia.roles);
  assert.equal(retainedRoles.length, 26);
  f.state.failChannel = '';
  await f.cia.setupCiaServer(f.guild, f.bot, f.owner);
  assert.equal(f.roles.size, 26);
  assert.deepEqual(Object.values(f.state.config.installations.cia.roles), retainedRoles);
});

test('all information messages fit Discord embed limits and department access stays restricted', async () => {
  const f = fixture();
  const result = await f.cia.setupCiaServer(f.guild, f.bot, f.owner);
  for (const embeds of Object.values(f.cia.ciaStaticPanels())) for (const embed of embeds) {
    const data = embed.toJSON();
    assert.ok(data.title.length <= 256);
    assert.ok(data.description.length <= 4096);
    assert.ok(data.fields.length <= 25);
    assert.ok(data.fields.every((field) => field.name.length <= 256 && field.value.length <= 1024));
    const total = data.title.length + data.description.length + (data.footer?.text?.length || 0) + data.fields.reduce((sum, field) => sum + field.name.length + field.value.length, 0);
    assert.ok(total <= 6000);
  }
  assert.equal(result.categories.analysis.overwrites.has(result.roles.verified.id), false);
  assert.equal(result.categories.analysis.overwrites.has(result.roles.analyst.id), true);
  assert.equal(result.categories.systems.overwrites.has(result.roles.analyst.id), false);
  assert.equal(result.categories.operations.overwrites.has(result.roles.specialAgent.id), true);
  const readonly = result.channels.ranks.overwrites.get(result.roles.verified.id);
  assert.ok(readonly.deny.includes(bits.SendMessages));
  assert.ok(result.channels.ranks.overwrites.get(result.roles.directorateHead.id).allow.includes(bits.SendMessages));
  assert.deepEqual(f.state.config.community.selfRoles, [result.roles.operationAlert.id, result.roles.announcements.id]);
});

test('rank-only refresh runs through the real slash-command handler', async () => {
  const f = fixture();
  await f.cia.setupCiaServer(f.guild, f.bot, f.owner);
  const interactionModule = load('interactions', {
    './config': f.config, './support-server': f.cia,
    './command-localizations': { canonicalCommandName: (name) => name },
    './rate-limit': { checkInteractionRate: () => ({ allowed: true }) },
    './telemetry': { recordUsage: async () => {}, recordAudit: async (...args) => f.state.audits.push(args), recordError: async (...args) => f.state.errors.push(args) },
    './utils': { ephemeralError: async (_interaction, message) => { throw new Error(message); } }
  });
  let reply = '';
  let action = 'rangok-frissitese';
  const interaction = {
    commandName: 'cia', guild: f.guild, guildId: f.guild.id, member: f.owner,
    user: { id: ownerId }, client: { user: f.bot }, memberPermissions: f.owner.permissions,
    options: { getSubcommand: () => action },
    isChatInputCommand: () => true, deferReply: async () => {}, editReply: async (value) => { reply = value; }
  };
  await interactionModule.handleInteraction(interaction);
  assert.match(reply, /26 rang frissítve/);
  assert.equal(f.state.errors.length, 0);
  assert.equal(f.state.audits[0][0], 'cia_american_ranks_refresh');
  action = 'ujratelepites';
  await interactionModule.handleInteraction(interaction);
  assert.match(reply, /frissítése és újratelepítése/);
  assert.equal(f.state.audits[1][0], 'cia_server_owner_reinstall');
  assert.equal(f.state.config.installations.cia.repairCount, 1);
  assert.equal(f.state.errors.length, 0);
});
