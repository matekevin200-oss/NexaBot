const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadArchitectModule() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const marker = '"src/server-architect.js": function(module, exports, require) {';
  const start = source.indexOf(marker);
  const end = source.indexOf('\n\n},\n"src/dashboard.js"', start);
  assert.notEqual(start, -1, 'NEXA OS Studio bundle entry missing');
  assert.notEqual(end, -1, 'NEXA OS Studio bundle boundary missing');
  const body = source.slice(start + marker.length, end);
  const module = { exports: {} };
  const config = {
    dbQuery: async () => null,
    getGuildConfig: () => ({
      modules: {}, channels: {}, roles: {}, branding: { primary: '#4b9dff' }
    }),
    setGuildConfig: async () => null,
    planAllowsModule: () => true,
    isPersistentStore: () => true
  };
  const permissionNames = [
    'ViewAuditLog', 'ManageGuild', 'ManageChannels', 'ManageRoles', 'ManageWebhooks',
    'ManageMessages', 'ManageThreads', 'KickMembers', 'BanMembers', 'ModerateMembers',
    'ManageNicknames', 'MoveMembers', 'MentionEveryone', 'ViewChannel', 'ReadMessageHistory',
    'UseApplicationCommands', 'SendMessages', 'SendMessagesInThreads', 'EmbedLinks',
    'AttachFiles', 'Connect', 'Speak', 'AddReactions'
  ];
  const discord = {
    ChannelType: { GuildText: 0, GuildVoice: 2, GuildCategory: 4 },
    EmbedBuilder: class EmbedBuilder {},
    PermissionFlagsBits: Object.fromEntries(permissionNames.map((name, index) => [name, 1n << BigInt(index)]))
  };
  const localRequire = (request) => request === './config' ? config : request === 'discord.js' ? discord : require(request);
  new Function('module', 'exports', 'require', body)(module, module.exports, localRequire);
  return module.exports;
}

function fakeGuild() {
  const everyone = { id: '100000000000000001' };
  const roles = new Map([[everyone.id, everyone]]);
  const channels = new Map();
  roles.find = (predicate) => [...roles.values()].find(predicate);
  channels.find = (predicate) => [...channels.values()].find(predicate);
  return {
    id: '100000000000000099',
    name: 'NEXA Architect Test',
    roles: { everyone, cache: roles },
    channels: { cache: channels },
    members: { me: { permissions: { has: () => true } } }
  };
}

test('local NEXA OS Studio creates a usable plan without an AI key', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const architect = loadArchitectModule();
    const result = await architect.generateServerBlueprint({
      guild: fakeGuild(),
      prompt: 'Készíts professzionális magyar közösségi és support szervert.',
      language: 'hu',
      scale: 'professional'
    });
    const stats = architect.blueprintStats(result.plan);
    assert.equal(result.source, 'nexa-os-local-v20');
    assert.equal(result.warning, '');
    assert.equal(result.plan.studio.engine, 'nexa-os-local-v20');
    assert.ok(stats.roles >= 2);
    assert.ok(stats.categories >= 3);
    assert.ok(stats.channels >= 8);
    assert.ok(result.plan.modules.includes('protection'));
    assert.ok(result.plan.roles.every((role) => !role.permissions.includes('Administrator')));
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test('NEXA OS Studio uses templates and selected modules without any OpenAI planner call', async () => {
  const architect = loadArchitectModule();
  const result = await architect.generateServerBlueprint({
    guild: fakeGuild(),
    prompt: 'Create a professional creator community with events and secure moderation.',
    language: 'en',
    scale: 'enterprise',
    template: 'creator',
    features: ['security', 'moderation', 'events', 'voice']
  });
  assert.equal(result.source, 'nexa-os-local-v20');
  assert.equal(result.plan.studio.template, 'creator');
  assert.equal(result.plan.studio.scale, 'enterprise');
  assert.deepEqual(result.plan.studio.features.sort(), ['events', 'moderation', 'security', 'voice']);
  assert.ok(result.plan.modules.includes('protection'));
  assert.ok(result.plan.modules.includes('moderation'));
  assert.ok(result.plan.categories.some((category) => category.key === 'content'));
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const architectModule = source.match(/"src\/server-architect\.js": function[\s\S]+?\n\},\n"src\/dashboard\.js"/)[0];
  assert.doesNotMatch(architectModule, /api\.openai\.com|OPENAI_API_KEY|\/v1\/responses/);
});

test('Digital Twin reports exact additive changes and never schedules deletion', async () => {
  const architect = loadArchitectModule();
  const guild = fakeGuild();
  const { plan } = await architect.generateServerBlueprint({
    guild,
    prompt: 'Készíts biztonságos gaming közösségi szervert ticket és esemény modullal.',
    template: 'gaming',
    features: ['security', 'tickets', 'events']
  });
  const simulation = architect.blueprintSimulation(guild, plan);
  assert.equal(simulation.status, 'ready');
  assert.equal(simulation.destructiveChanges, 0);
  assert.equal(simulation.roles.create, plan.roles.length);
  assert.equal(simulation.categories.create, plan.categories.length);
  assert.equal(simulation.channels.create, plan.categories.flatMap((category) => category.channels).length);
  assert.ok(simulation.operations > 0);
});

test('signed Architect previews are server- and owner-bound', () => {
  const architect = loadArchitectModule();
  const plan = architect.sanitizeBlueprint({
    name: 'Signed plan',
    roles: [{ key: 'owner', name: 'Owner', permissions: ['ManageGuild', 'Administrator'] }],
    categories: [{ key: 'main', name: 'MAIN', visibility: 'public', channels: [{ key: 'general', name: 'general', type: 'text' }] }]
  });
  const token = architect.signBlueprintToken(plan, '100000000000000099', '100000000000000088');
  const verified = architect.verifyBlueprintToken(token, '100000000000000099', '100000000000000088');
  assert.equal(architect.planHash(verified), architect.planHash(plan));
  assert.deepEqual(verified.roles[0].permissions, ['ManageGuild']);
  assert.throws(() => architect.verifyBlueprintToken(token, '100000000000000077', '100000000000000088'), /másik szerverhez/);
  assert.throws(() => architect.verifyBlueprintToken(`${token.slice(0, -1)}x`, '100000000000000099', '100000000000000088'), /módosították|megsérült/);
});

test('Architect rejects secrets in server descriptions', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const architect = loadArchitectModule();
    await assert.rejects(
      architect.generateServerBlueprint({ guild: fakeGuild(), prompt: 'Use this key sk-live-super-secret-value in my server build.' }),
      /Titkos adatot ne adj meg/
    );
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
