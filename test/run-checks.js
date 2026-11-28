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
assert.equal(roster.rankForMember(member).badge, 'BELV-01', 'leadership ranks use the four-letter BELV prefix with two digits');
assert.equal(roster.classifyBelvRole({ id: '123456789012345681', name: 'BV-40', position: 3 }).badge, 'BVI-40', 'non-leadership ranks keep the BVI prefix');
assert.equal(roster.badgeCode({ group: 'Felsővezetés', max: 9 }, 9), 'BELV-09');
assert.equal(roster.badgeCode({ group: 'Vezetői állomány', max: 14 }, 10), 'BELV-10', 'all leadership ranks use the four-letter BELV prefix');
assert.equal(roster.badgeCode({ group: 'Hivatásos állomány', max: 69 }, 60), 'BVI-60');
assert.deepEqual(roster.badgeRange({ group: 'Felsővezetés', min: 1, max: 1 }), { min: 1, max: 24 }, 'leadership can receive unique badges across the shared BELV-01–BELV-24 pool');
assert.deepEqual(roster.badgeRange({ group: 'Hivatásos állomány', min: 70, max: 89 }), { min: 70, max: 89 }, 'non-leadership badge ranges remain rank-specific');
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

const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const security = require('../src/security.js');
const manageRoleExecutor = { user: { bot: false }, permissions: { has: (permission) => permission === PermissionFlagsBits.ManageRoles } };
assert.equal(security.isAuthorizedMemberRoleChange({ action: AuditLogEvent.MemberRoleUpdate }, manageRoleExecutor), true, 'a human with Manage Roles can make ordinary member role changes without anti-nuke lockdown');
assert.equal(security.isAuthorizedMemberRoleChange({ action: AuditLogEvent.RoleDelete }, manageRoleExecutor), false, 'Manage Roles does not exempt role deletion from anti-nuke');
assert.equal(security.isAuthorizedMemberRoleChange({ action: AuditLogEvent.MemberRoleUpdate }, { ...manageRoleExecutor, user: { bot: true } }), false, 'bots are not exempt from member role update checks');
assert.equal(security.isAuthorizedMemberRoleChange({ action: AuditLogEvent.MemberRoleUpdate }, { user: { bot: false }, permissions: { has: () => false } }), false, 'members without Manage Roles remain subject to the guard');

const belv = read('src/belv-mdt.js');
const belvMdt = require('../src/belv-mdt.js');
assert.ok(!belv.includes('KIO'), 'KIO remains separate from BELV rank roster handling');
const kio = read('src/belv-kio.js');
assert.ok(order.includes('src/belv-kio.js'), 'BELV KIO module is included in the runtime bundle');
assert.ok(kio.includes("const BELV_GUILD_ID = '1517509643734221030'"), 'KIO stays inside the BELV guild');
assert.ok(kio.includes("'Közúti Igazgató'") && kio.includes("'Közúti Munkatárs Próbaidőn'"), 'KIO rank ladder is restored');
assert.ok(kio.includes('Meglévő csatornák jogosultságait nem módosítottam.'), 'KIO setup leaves reused channel permissions unchanged');
assert.ok(kio.includes('custom_belv_kio_jelentes') && kio.includes('custom_belv_kio_jegyzokonyv') && kio.includes('custom_belv_kio_fegyelmi'), 'KIO report, minutes and discipline forms are available');
assert.ok(kio.includes("setName('belv-kio')"), 'KIO has a dedicated BELV setup command');
assert.ok(belv.includes('guild.members.fetch()'), 'roster reads current guild membership');
assert.ok(belv.includes('let belvRosterBadgeSchemaPromise = null;'), 'BELV roster badge schema initialization is declared');
assert.ok(belv.includes("badge: 'BELV-01'") && belv.includes("badge: 'BELV-04'"), 'static leadership roster uses the BELV badge prefix');
assert.ok(belv.includes('result.skipped.length}') && !belv.includes('result.skipped.length - result.inactive.length'), 'roster summary does not show a negative skipped count');
assert.ok(belv.includes("['BELV-', 'BVI-', 'BV-']"), 'old nickname badge prefixes are removed during the first re-sync');
const belvNicknameSync = belv.slice(belv.indexOf('for (const { member, rank } of ranked)'), belv.indexOf('for (let offset = 0; offset < writes.length'));
assert.ok(!belv.includes('BELV_NICKNAME_EXEMPT_USER_IDS') && !belvNicknameSync.includes('isBotOwner(member.id)'), 'BELV leaders, including the bot owner, are not skipped during nickname synchronization');
assert.ok(belv.includes("client.on('guildMemberAdd'"), 'new members trigger roster reconciliation');
assert.ok(belv.includes("client.on('guildMemberRemove'"), 'departed members trigger roster reconciliation');
assert.ok(!belv.includes('periodic-reconcile') && !belv.includes('setInterval(() => schedule('), 'BELV roster does not run periodic nickname reconciliations');
assert.ok(belv.includes("client.on('guildMemberUpdate'") && belv.includes('belvRankSignature(oldMember) !== belvRankSignature(newMember)'), 'only BELV rank changes trigger member-update reconciliation');
const belvRank = { id: '123456789012345678', name: 'BV-03', position: 10 };
const otherRole = { id: '123456789012345679', name: 'Közösségi tag', position: 20 };
const rankMember = (roles) => ({ roles: { cache: new Map(roles.map((role) => [role.id, role])) } });
assert.equal(belvMdt.belvRankSignature(rankMember([belvRank])), belvMdt.belvRankSignature(rankMember([belvRank, otherRole])), 'non-BELV role changes do not count as a rank change');
assert.notEqual(belvMdt.belvRankSignature(rankMember([belvRank])), belvMdt.belvRankSignature(rankMember([{ ...belvRank, name: 'BV-04' }])), 'changing the BELV rank changes the monitored rank signature');
assert.equal(belvMdt.belvRankRoleChanged(belvRank, { ...belvRank }), false, 'unchanged BELV rank roles do not trigger reconciliation');
assert.equal(belvMdt.belvRankRoleChanged(belvRank, { ...belvRank, position: 11 }), true, 'BELV rank role order changes trigger reconciliation');
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
const approval = docs.slice(docs.indexOf('function canApprove(member, type = null)'), docs.indexOf('\nfunction approvalDenialMessage'));
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
const telemetry = require('../src/telemetry.js');
assert.equal(telemetry.redactLogText('DISCORD_TOKEN=abc.def.ghi'), 'DISCORD_TOKEN=[REDACTED]');
assert.equal(telemetry.redactLogText('Authorization: Bearer secret-value'), 'Authorization: [REDACTED]');
assert.equal(telemetry.redactLogText('token: value123'), 'token: [REDACTED]');
const safeMeta = { token: 'value123', nested: 'api_key=private' };
assert.deepEqual(telemetry.safeMetadata(safeMeta), { token: '[REDACTED]', nested: 'api_key=[REDACTED]' });
const eventsSource = read('src/events.js');
assert.ok(eventsSource.includes("recordAudit('bot_guild_joined'") && eventsSource.includes("recordAudit('bot_guild_left'"), 'guild join and leave are persisted');
assert.ok(eventsSource.includes('actorId: null') && eventsSource.includes('actor and cause are unknown'), 'guild leave events never guess an actor');

const ticketRecovery = read('src/ticket-recovery.js');
assert.ok(ticketRecovery.includes('filter(c=>c&&(c.name===NAMES.ticketCategory'), 'ticket category recovery tolerates missing cache entries');
assert.ok(ticketRecovery.includes('filter(c=>c?.parentId===channel.id)') && ticketRecovery.includes('filter(c=>c?.parentId===parent.id)'), 'ticket category recovery tolerates null channel entries');
assert.ok(ticketRecovery.includes('filter(c=>c&&(!c.parentId||c.parentId===channel.id)'), 'ticket orphan recovery skips null channel entries');

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

const legal = read('src/belv-legal.js');
assert.ok(order.includes('src/belv-legal.js'), 'BELV legal subdepartment is bundled');
assert.ok(legal.includes("const BELV_GUILD_ID='1517509643734221030'"), 'BELV legal module is isolated to the BELV guild');
assert.ok(legal.includes("guild.id!==BELV_GUILD_ID"), 'legal setup commands are registered only in BELV');
assert.ok(legal.includes("setName('belv-jogi-setup')") && legal.includes("setName('belv-jogi-ugy')") && legal.includes("setName('belv-jogi-lezaras')"), 'BELV legal setup and case commands exist');
assert.ok(legal.includes('PermissionFlagsBits.Administrator') && legal.includes('PermissionFlagsBits.ManageRoles') && legal.includes('PermissionFlagsBits.ManageChannels'), 'legal installation checks administrator and bot permissions');
assert.ok(legal.includes('nexabot_belv_legal_cases') && legal.includes('UNIQUE(guild_id,channel_id)'), 'legal cases persist with guild-scoped unique channels');
assert.ok(legal.includes('permissionOverwrites:perms') && legal.includes('clientUser.id') && legal.includes('lawyer.id'), 'private legal cases grant access to the selected client and lawyer');
assert.ok(legal.includes("function access(g,key){return overwrites(g,[LAWYER_ROLE]);}") && legal.includes("function isLegalMember(m){return Boolean(m?.roles?.cache?.some(r=>r.name===LAWYER_ROLE));}"), 'only the shared lawyers role grants legal-channel access');
assert.ok(legal.includes("LAWYER_ROLE='Ügyvédek'") && legal.includes('syncAttorneyMemberships') && legal.includes('syncAttorneyAggregate'), 'lawyer ranks receive the shared role at setup and rank updates');
assert.ok(read('src/index.js').includes("require('./belv-legal').syncAttorneyAggregate(member)"), 'lawyer aggregate role follows future rank changes');
assert.ok(legal.includes('Lezáráskor az ügycsatorna megmarad') && legal.includes('csak olvasható'), 'case closure preserves the channel');
assert.ok(legal.includes('guild.id!==BELV_GUILD_ID)return') && legal.includes("guild.commands.create(payload)"), 'legal commands register only in the BELV guild');
assert.ok(read('src/belv-mdt.js').includes("require('./belv-legal').syncGuildCommands(guild)"), 'BELV startup sync publishes the legal commands on the BELV server');
const legalModule = require('../src/belv-legal.js');
assert.deepEqual(legalModule.buildCommands().map(command => command.name), ['belv-jogi-setup', 'belv-jogi-ugy', 'belv-jogi-lezaras']);
assert.equal(legalModule.CATEGORIES.reduce((sum, category) => sum + category.channels.length, 0), 13, 'BELV legal setup includes the application channel');

const musicModule = require('../src/music.js');
const musicCommands = musicModule.buildMusicCommands().map(command => command.toJSON());
assert.deepEqual(musicCommands.map(command => command.name), ['zene', 'music']);
assert.ok(musicCommands.every(command => command.options.some(option => option.name === 'panel')), 'music panel publishing is available in both command languages');
const musicMessage = musicModule.musicPanel({ channels: { cache: new Map([
  ['voice-1', { id: 'voice-1', name: 'Zene voice', type: 2, position: 1 }]
]) } }, 'hu');
const musicControls = musicMessage.components.flatMap(row => row.components).map(component => component.toJSON());
assert.ok(musicControls.some(component => component.custom_id === 'nexa_music:channel:hu' && component.options[0].value === 'voice-1'), 'music panel offers the guild voice channels');
assert.ok(musicControls.some(component => component.custom_id === 'nexa_music:search:hu'), 'music panel opens YouTube search');
assert.ok(musicControls.some(component => component.custom_id === 'nexa_music:url:hu'), 'music panel accepts a pasted link');
assert.ok(musicControls.some(component => component.custom_id === 'nexa_music:volume_down:hu') && musicControls.some(component => component.custom_id === 'nexa_music:volume_up:hu'), 'music panel can adjust volume');

console.log('NEXA checks passed: ' + order.length + ' source modules, reproducible bundle, BELV permissions, mentions, shifts, economy invariants, and music panel controls.');
