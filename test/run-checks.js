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
new vm.Script(read('live-status.js'), { filename: 'live-status.js' });
const liveStatus = read('live-status.js');
assert.ok(!liveStatus.includes(".setName('belv-jogok')") && !liveStatus.includes('handleBelvPermissionsCommand'), 'BELV rank-permission command implementation is removed');
assert.ok(liveStatus.includes('removeBelvPermissionsCommand'), 'the previously registered BELV permission command is removed from Discord');

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
assert.ok(belv.includes('let belvRosterBadgeSchemaPromise = null;'), 'BELV roster badge schema initialization is declared');
assert.ok(belv.includes("client.on('guildMemberAdd'"), 'new members trigger roster reconciliation');
assert.ok(belv.includes("client.on('guildMemberRemove'"), 'departed members trigger roster reconciliation');
assert.ok(!belv.includes('if (!bot.permissions.has(PermissionFlagsBits.ManageNicknames)) fail'), 'nickname permission must not block roster publishing');
const docs = read('src/documents.js');
assert.ok(docs.includes('if (!member) return false;') && docs.includes('function isBelvDecisionMaker(member)'), 'BELV decision forms enforce server-side role checks');
assert.ok(docs.includes('missingDocumentPermissions(target, botMember, requiredTargetPermissions)'), 'document approval checks destination-channel permissions before publishing');
const discipline = read('src/belv-discipline.js');
assert.ok(order.includes('src/belv-discipline.js'), 'BELV discipline module is included in the runtime bundle');
assert.ok(discipline.includes('nexabot_belv_cases') && discipline.includes('nexabot_belv_case_audit'), 'BELV cases and audit events are persisted');
assert.ok(discipline.includes('UNIQUE(guild_id, interaction_id)'), 'BELV form submissions are idempotent');
assert.ok(discipline.includes('CHANNELS.filter((s) => !s.optional && !plan.channels.get(s.key))'), 'BELV installer creates only missing required channels');
assert.ok(discipline.includes('Meglévő jogosultságot nem módosítottam'), 'BELV installer never changes reused channel permissions');
assert.ok(discipline.includes('A megadott ügynek nincs jóváhagyott határozata') && discipline.includes('72 hours'), 'BELV appeal deadline is checked server-side');
const dashboard = read('src/dashboard.js');
assert.ok(!dashboard.includes('doc_default_roles') && !dashboard.includes('doc_manager_roles') && !dashboard.includes('doc_roles_') && !dashboard.includes('access_role_ids'), 'Owner Center no longer configures document access roles');
assert.ok(dashboard.includes('defaultAccessRoleIds: [], managerRoleIds: []'), 'saving document settings clears old global access-role restrictions');
const approval = docs.slice(docs.indexOf('function canApprove(member)'), docs.indexOf('\nfunction approvalDenialMessage'));
assert.ok(approval.includes('return isBelvDecisionMaker(member)'), 'BELV approval recognizes the configured role or senior BELV rank');
assert.ok(docs.includes('function belvApprovalRoleId(guild)'), 'BELV approval role ID resolver is defined');

const previousApprovalRoleId = process.env.BELV_APPROVAL_ROLE_ID;
delete process.env.BELV_APPROVAL_ROLE_ID;
try {
  const documentModule = require('../src/documents.js');
  const approvalRole = { id: '123456789012345678', name: 'BELVÉDELMI VEZETŐSÉG' };
  const approver = {
    guild: { id: '1517509643734221030', roles: { cache: [approvalRole] } },
    roles: { cache: new Map([[approvalRole.id, approvalRole]]) }
  };
  const nonApprover = {
    guild: { id: '1517509643734221030', roles: { cache: [approvalRole] } },
    roles: { cache: new Map() }
  };
  assert.equal(documentModule.canApprove(approver), true, 'the BELV leadership role can approve');
  assert.equal(documentModule.canApprove(nonApprover), false, 'members without the BELV leadership role cannot approve');
  const deputyRole = { id: '223456789012345678', name: 'BV-04 Igazgatóhelyettes', position: 20 };
  const deputy = {
    guild: { id: '1517509643734221030', roles: { cache: [deputyRole] } },
    roles: { cache: new Map([[deputyRole.id, deputyRole]]) }
  };
  assert.equal(documentModule.canApprove(deputy), true, 'BV-01–09 leadership ranks can approve without a specially named role');
} finally {
  if (previousApprovalRoleId === undefined) delete process.env.BELV_APPROVAL_ROLE_ID;
  else process.env.BELV_APPROVAL_ROLE_ID = previousApprovalRoleId;
}
assert.ok(!/if \([^\n]+BELV_APPROVAL_GUILD_ID[^\n]+\) return[\s\S]{0,150}Administrator/.test(approval), 'BELV approval must not fall back to admin');
assert.ok(read('src/interactions.js').includes('discordErrorCode === 50013'), 'missing Discord permissions receive a specific interaction error');
const shifts = read('src/shifts.js');
assert.ok(shifts.includes(".setName('reset')") && shifts.includes("setName('megerosites')"), 'shift reset is available through the shared server command');
assert.ok(shifts.includes("!== 'TELJES RESET'") && shifts.includes('PermissionFlagsBits.ManageGuild'), 'full shift reset requires server management and exact confirmation');
assert.ok(shifts.includes("subcommand !== 'reset' && !moduleEnabled"), 'server-wide reset remains usable when the shift module is disabled');
assert.ok(shifts.includes('resetShiftData(interaction.guildId, null, interaction.user.id)'), 'full reset is scoped to the invoking server and audit-logged');
assert.ok(shifts.includes('WHERE guild_id=$1 AND user_id=$2 AND ended_at IS NOT NULL ORDER BY ended_at DESC,id DESC LIMIT 1'), 'targeted service correction selects that member latest closed shift');
assert.ok(shifts.includes('String(row.user_id)!==String(targetUserId)'), 'targeted shift correction verifies row owner');
assert.ok(shifts.includes('Math.abs(minutes)>10080'), 'shift correction is bounded');
const economy = read('src/economy-schema.js');
assert.ok(economy.includes('UNIQUE(guild_id,request_id)'), 'money operations are idempotent by interaction request ID');
assert.ok(economy.includes("IF op='debit' AND"), 'debit requires sufficient target balance');
assert.ok(economy.includes('user_id=target'), 'debit updates the selected target account');
assert.ok(read('src/economy-discord.js').includes('eco.apply(i.guild,i.user.id,i.id,b)'), 'Discord command uses its unique interaction ID for idempotency');


const bomo = read('src/bomo.js');
const bomoDocs = read('src/documents.js');
const bomoMdt = read('src/belv-mdt.js');
assert.ok(order.includes('src/bomo.js'), 'BOMO Discord module is included in the runtime bundle');
assert.ok(bomo.includes("const BELV_GUILD_ID = '1517509643734221030'"), 'BOMO setup is pinned to the BELV guild');
assert.ok(bomo.includes('const MAX_INSTALL_ATTEMPTS = 5'), 'BOMO setup has a five-attempt limit');
assert.ok(bomo.includes('interaction.user?.id || \'\') !== String(interaction.guild.ownerId)'), 'BOMO setup is restricted to the guild owner');
assert.ok(bomo.includes('ALTER TABLE nexabot_bomo_installations ADD COLUMN IF NOT EXISTS attempt_count'), 'attempt counts persist across restarts');
assert.ok(bomo.includes('for (const statement of statements) await dbQuery(statement)'), 'BOMO schema migrations run as retryable single statements');
assert.ok(bomo.includes('guild.commands.create(payload)'), 'BOMO setup command is registered as a guild command');
assert.ok(!/applicationCommands\.create|client\.application\.commands/.test(bomo), 'BOMO setup is not registered globally');
assert.ok(bomo.includes("status === 'completed'") && bomo.includes("SETUP_COMMAND"), 'BOMO setup is persistent and removes its guild command after completion');
assert.ok(bomo.includes('isPersistentStore()') && bomo.includes('nexabot_bomo_cases'), 'BOMO requires persistent database storage for setup and cases');
assert.ok(bomo.includes('BOMO-') && bomo.includes('prepareSubmission'), 'BOMO forms assign persistent case numbers');
assert.ok(!/custom_bomo_service_log|service_log/.test(bomo), 'BOMO setup does not add or modify a separate service log channel or form');
const configSource = read('src/config.js');
assert.ok(configSource.includes('/^custom_[a-z0-9_]{4,50}$/'), 'custom document keys can store the BOMO form identifiers');
assert.ok(bomo.includes("key: 'custom_bomo_investigation'") && bomo.includes("name: '🔎┃bomo-belső-vizsgálatok'"), 'BOMO investigation form uses its own channel and leaves the existing BELV channel alone');
assert.ok(bomo.includes("key: 'custom_bomo_order'") && bomo.includes("label: 'Engedélyezett lépések'"), 'BOMO operation orders are a fillable form');
assert.ok(bomo.includes("typeKey === 'custom_bomo_order'"), 'operation order form submissions are restricted to leadership');
assert.ok(bomo.includes('function canSubmit') && bomo.includes('function canApprove'), 'BOMO form submission and approval are role-gated server-side');
assert.ok(bomo.includes('[...(member.roles?.cache?.values?.() || [])].some((role) => isChiefRole(role))'), 'BELV chief role has full BOMO supervision');
assert.ok(bomoDocs.includes('type.approvalChannelId') && bomoDocs.includes('? (configuredReview?.isTextBased?.() ? configuredReview : null)'), 'BOMO approvals cannot silently fall back to another channel');
assert.ok(bomo.includes('type: \'voice\''), 'BOMO voice channels are verified as voice channels');
assert.ok(bomo.includes('category.id !== recordedCategoryId') && bomo.includes('SELECT status,attempt_count,category_id'), 'BOMO retries resume only their recorded category');
assert.ok(bomo.includes('!category || existing.parentId !== categoryId'), 'same-name BELV channels outside a known BOMO category are never adopted');
assert.ok(bomo.includes('if (channel) return channel;') && bomo.includes('if (existing) return existing;') && bomo.includes('const sent = previous || await channel.send(panel)'), 'existing channels and reference messages are left unchanged');
assert.ok(bomo.includes("MARKER_PREFIX + 'orders'") && bomo.includes('previousPanel || previousTemplate'), 'the old orders template is converted to a button form');
assert.ok(!bomo.includes("title: 'Műveleti utasítás sablon'"), 'the static operation order template is removed');
assert.ok(bomo.includes('szerveren belüli RP-eseményekre'), 'BOMO documents are restricted to in-server RP events');
assert.ok(bomoDocs.includes("require('./bomo').canSubmit(member, type.key)"), 'BOMO document submissions are checked server-side');
assert.ok(bomoDocs.includes("require('./bomo').claimCaseDecision"), 'BOMO approvals are persisted and single-decision');
assert.ok(bomoMdt.includes("require('./bomo').syncSetupCommand(guild)"), 'BOMO command sync runs only in the target BELV guild');
assert.ok(read('src/interactions.js').includes("commandName === 'bomo-setup'"), 'BOMO setup interactions are routed');
assert.ok(!read('src/bomo.js').includes('web-'), 'BOMO setup does not add a website route');

const activity = read('src/belv-activity.js');
assert.ok(order.includes('src/belv-activity.js'), 'BELV weekly activity module is included in the runtime bundle');
assert.ok(activity.includes("const BELV_GUILD_ID = '1517509643734221030'"), 'weekly activity is pinned to the BELV guild');
assert.ok(activity.includes("const TIMEZONE = 'Europe/Budapest'"), 'weekly activity uses the Budapest timezone');
assert.ok(activity.includes('CREATE UNIQUE INDEX IF NOT EXISTS nexabot_belv_activity_one_open_shift'), 'only one active service shift per BELV member is allowed');
assert.ok(activity.includes("status=\\'approved\\'") && activity.includes('inspection_count') && activity.includes('SUM(GREATEST(inspection_count,CASE WHEN BTRIM(tasks)'), 'only approved weekly reports and tasks count toward activity');
assert.ok(activity.includes("recordAudit('belv_activity_correction'") && activity.includes('aktivitas-korrekcio'), 'leader corrections and activity changes are audited');
assert.ok(activity.includes('weekly') && activity.includes('leadership') && activity.includes('reports') && activity.includes('service'), 'all activity features use the separate BELV activity channels');
assert.ok(activity.includes("local.weekday === 'Sun' && Number(local.hour) >= 20") && activity.includes('Europe/Budapest') && activity.includes('publishSnapshot'), 'weekly preview and summary scheduler are installed');
assert.ok(read('src/interactions.js').includes("startsWith('aktivitas-')") && read('src/interactions.js').includes("belv_activity:"), 'activity commands, buttons, and forms are routed');
assert.ok(read('src/index.js').includes("require('./belv-activity').startJobs(readyClient)"), 'activity scheduler starts with the bot');
assert.ok(read('src/belv-mdt.js').includes("require('./belv-activity').syncGuildCommands(guild)"), 'activity commands sync only through BELV guild setup');
const activityModule = require('../src/belv-activity.js');
assert.equal(activityModule.weekStartFor(new Date('2026-11-08T22:00:00Z')), '2026-11-02', 'Sunday evening in Budapest remains in the current week');
assert.equal(activityModule.weekStartFor(new Date('2026-11-08T23:30:00Z')), '2026-11-09', 'Monday after Budapest midnight starts the next week');
assert.equal(activityModule.weekStartFor(new Date('2026-11-04T12:00:00Z'), '2026-11-01'), '2026-10-26', 'requested weekly periods normalize to Monday');
assert.ok(!activity.includes('dashboard') && !activity.includes('website') && !activity.includes('/api/'), 'BELV weekly activity does not add website endpoints');

console.log('NEXA checks passed: ' + order.length + ' source modules, reproducible bundle, BELV permissions, mentions, shifts, and economy invariants.');
