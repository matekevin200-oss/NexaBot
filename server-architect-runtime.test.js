const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadArchitectModule() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const marker = '"src/server-architect.js": function(module, exports, require) {';
  const start = source.indexOf(marker);
  const end = source.indexOf('\n\n},\n"src/dashboard.js"', start);
  assert.notEqual(start, -1, 'Server Architect bundle entry missing');
  assert.notEqual(end, -1, 'Server Architect bundle boundary missing');
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
  return {
    id: '100000000000000099',
    name: 'NEXA Architect Test',
    roles: { everyone, cache: new Map([[everyone.id, everyone]]) },
    channels: { cache: new Map() }
  };
}

test('local Server Architect creates a usable plan without an AI key', async () => {
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
    assert.equal(result.source, 'nexa-template');
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
