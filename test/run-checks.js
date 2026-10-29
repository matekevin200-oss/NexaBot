'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const order = read('module-order.txt').split(/\r?\n/).filter(Boolean);
assert.equal(order.length, new Set(order).size, 'module-order.txt contains duplicate paths');
assert.ok(order.includes('src/belv-roster-rules.js'), 'shared BELV helpers are packaged');
for (const name of order) {
  assert.ok(fs.existsSync(path.join(root, name)), 'missing source module: ' + name);
  new vm.Script(read(name), { filename: name });
}
const expectedBundle = read('bundle-header.txt')
  + order.map((name) => '"' + name + '": function(module, exports, require) {\n' + read(name).replace(/\n+$/, '') + '\n\n}').join(',\n')
  + read('bundle-footer.txt');
assert.equal(read('index.js'), expectedBundle, 'index.js is stale; run python3 bundle.py');

const roster = require('../src/belv-roster-rules.js');
assert.equal(roster.classifyBelvRole({ id: '123456789012345678', name: 'Főigazgató BV-01', position: 10 }).rank, 'Főigazgató');
assert.equal(roster.classifyBelvRole({ id: '123456789012345679', name: 'BV-74', position: 5 }).group, 'Hivatásos állomány');
assert.equal(roster.classifyBelvRole({ id: '123456789012345680', name: 'Belvédelmi tag', position: 5 }), null);
assert.equal(roster.classifyBelvRole({ id: '123456789012345678', name: 'Member', position: 5 }, { '123456789012345678': 'BV-10–14' }).group, 'Vezetői állomány');
const mapped = roster.configuredRankRoleMap('{"123456789012345678":"Főigazgató"}');
assert.equal(mapped['123456789012345678'], 'Főigazgató');
assert.deepEqual(roster.configuredRankRoleMap('{bad json'), {});
const member = { roles: { cache: new Map([['123456789012345678', { id: '123456789012345678', name: 'BV-01', position: 1 }]]) } };
assert.equal(roster.rankForMember(member).badge, 'BV-01');
assert.equal(roster.isConfiguredRoleHolder(member, '123456789012345678'), true);
assert.equal(roster.isConfiguredRoleHolder(member, '123456789012345679'), false);
assert.equal(roster.isConfiguredRoleHolder(member, ''), false);
assert.equal(roster.stripManagedNickname('Kevin | Főigazgató | BV-01', 'Főigazgató', 'BV-01'), 'Kevin');
assert.equal(roster.stripManagedNickname('Kevin | rang nélkül', 'Főigazgató', 'BV-01'), 'Kevin | rang nélkül');
const botId = '123456789012345678', otherId = '123456789012345679';
assert.equal(roster.cleanBotMention('<@' + botId + '> szia <@' + otherId + '>', botId), 'szia <@' + otherId + '>');
assert.equal(roster.cleanBotMention('<@!' + botId + '> szia', botId), 'szia');
assert.equal(roster.adjustedActiveSeconds('2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z', 300, 15), 4200);
assert.equal(roster.adjustedActiveSeconds('2026-01-01T00:00:00Z', '2026-01-01T00:02:00Z', 0, -10), 0);
assert.throws(() => roster.adjustedActiveSeconds('bad', '2026-01-01T00:00:00Z', 0, 1));

const belv = read('src/belv-mdt.js');
assert.ok(!belv.includes('KIO'), 'KIO must not remain in BELV roster handling');
assert.ok(belv.includes('guild.members.fetch()'), 'roster reads current guild membership');
assert.ok(belv.includes("client.on('guildMemberAdd'"), 'new members trigger roster reconciliation');
assert.ok(belv.includes("client.on('guildMemberRemove'"), 'departed members trigger roster reconciliation');
assert.ok(!belv.includes('if (!bot.permissions.has(PermissionFlagsBits.ManageNicknames)) fail'), 'nickname permission must not block roster publishing');
const docs = read('src/documents.js');
assert.ok(docs.includes('return Boolean(member);'), 'document forms are available to every server member');
assert.ok(docs.includes('missingDocumentPermissions(target, botMember, requiredTargetPermissions)'), 'document approval checks destination-channel permissions before publishing');
assert.ok(!read('src/dashboard.js').includes('doc_default_roles') && !read('src/dashboard.js').includes('doc_roles_'), 'Owner Center no longer configures per-document access roles');
const approval = docs.slice(docs.indexOf('function canApprove(member)'), docs.indexOf('\nfunction approvalDenialMessage'));
assert.ok(approval.includes('isConfiguredRoleHolder(member, belvApprovalRoleId(member.guild))'), 'BELV approval uses the configured exact role ID');
assert.ok(!/if \([^\n]+BELV_APPROVAL_GUILD_ID[^\n]+\) return[\s\S]{0,150}Administrator/.test(approval), 'BELV approval must not fall back to admin');
assert.ok(read('src/interactions.js').includes('discordErrorCode === 50013'), 'missing Discord permissions receive a specific interaction error');
const shifts = read('src/shifts.js');
assert.ok(shifts.includes('WHERE guild_id=$1 AND user_id=$2 AND ended_at IS NOT NULL ORDER BY ended_at DESC,id DESC LIMIT 1'), 'targeted service correction selects that member latest closed shift');
assert.ok(shifts.includes('String(row.user_id)!==String(targetUserId)'), 'targeted shift correction verifies row owner');
assert.ok(shifts.includes('Math.abs(minutes)>10080'), 'shift correction is bounded');
const economy = read('src/economy-schema.js');
assert.ok(economy.includes('UNIQUE(guild_id,request_id)'), 'money operations are idempotent by interaction request ID');
assert.ok(economy.includes("IF op='debit' AND"), 'debit requires sufficient target balance');
assert.ok(economy.includes('user_id=target'), 'debit updates the selected target account');
assert.ok(read('src/economy-discord.js').includes('eco.apply(i.guild,i.user.id,i.id,b)'), 'Discord command uses its unique interaction ID for idempotency');

console.log('NEXA checks passed: ' + order.length + ' source modules, reproducible bundle, BELV permissions, mentions, shifts, and economy invariants.');
