const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

test('release metadata is 20.2.0', () => {
  assert.equal(pkg.version, '20.2.0');
  assert.equal(lock.version, '20.2.0');
  assert.equal(lock.packages[''].version, '20.2.0');
  assert.match(source, /const APP_VERSION = '20\.2\.0'/);
});

test('subscriptions replaces public pricing while preserving redirect', () => {
  assert.match(source, /url\.pathname === '\/pricing'.*\/subscriptions.*301/);
  assert.match(source, /url\.pathname === '\/subscriptions'/);
  for (const key of ['pro:monthly', 'pro:yearly', 'ultimate:monthly', 'ultimate:yearly']) {
    assert.ok(source.includes(`'${key}': 'STRIPE_PRICE_`), `missing Stripe mapping for ${key}`);
  }
  assert.match(source, /readiness\.prices\[\`\$\{key\}:monthly\`\]/);
  assert.match(source, /readiness\.prices\[\`\$\{key\}:yearly\`\]/);
});

test('web support has Discord controls and live web API', () => {
  for (const control of ['claim', 'pending', 'close', 'reopen']) {
    assert.match(source, new RegExp(`websupport_${control}`));
  }
  assert.match(source, /handleDiscordSupportInteraction/);
  assert.match(source, /\/api\/support\//);
  assert.match(source, /setInterval\(\(\)=>refreshSupport\(root\),1800\)/);
  assert.match(source, /nexabot-web-support/);
});

test('settings validation preserves form and targets invalid field', () => {
  assert.match(source, /data-smart-settings/);
  assert.match(source, /data-focus-field/);
  assert.match(source, /configurationField/);
  assert.match(source, /settingsPage\(guild, requestedConfig/);
});

test('English is the new default while HU remains selectable', () => {
  assert.match(source, /language: 'en'/);
  assert.match(source, /commandLanguage: 'en'/);
  assert.match(source, /English \(default\)/);
  assert.match(source, /href="\$\{huUrl\}">HU<\/a>/);
  assert.match(source, /language: input\.language === 'hu' \? 'hu' : defaults\.language/);
  assert.match(source, /Use English by default unless the user asks for another language/);
  assert.match(source, /const pageLanguage = ownerView \? 'hu'/);
  assert.match(source, /function localizeControlCenterHtml\(html, language = 'en'\)/);
  assert.match(source, /await syncGuildCommandLanguage\(guild, config\.commandLanguage\)/);
  assert.match(source, /function canonicalCommandName\(name\)/);
});

test('Owner Center remains restricted to bot owner or explicit owner users', () => {
  assert.match(source, /function isOwnerUser\(userId\)/);
  assert.match(source, /isBotOwner\(id\) \|\| ownerSettings\.ownerUsers\.includes\(id\)/);
  assert.match(source, /isOwnerUser\(user\?\.id\)/);
});

test('Support server has ordered managed categories and safe ticket destination', () => {
  for (const label of ['01 • START HERE', '02 • NEXA BOT', '03 • SUPPORT', '04 • TICKETS', '05 • COMMUNITY', '90 • STAFF', '99 • OWNER']) {
    assert.ok(source.includes(label), `missing category ${label}`);
  }
  assert.match(source, /\/TICKETS\|TICKETEK\/i/);
  assert.match(source, /guild\.channels\.setPositions/);
});


test('Command Deck keeps one unified server control entry with compatible deep routes', () => {
  for (const route of ['overview','moderation','automod','welcome','tickets','logs','reaction-roles','auto-role','level','giveaway','ai','security','stats','settings']) {
    assert.ok(source.includes(route), `missing dedicated dashboard view ${route}`);
  }
  const serverNavigation = source.match(/const serverNav = activeGuildId \? ([\s\S]+?) : '';/);
  assert.ok(serverNavigation, 'server navigation definition missing');
  assert.match(serverNavigation[0], /Control Center/);
  assert.match(serverNavigation[0], /\/control/);
  assert.doesNotMatch(serverNavigation[0], /nav\('security'/);
  assert.doesNotMatch(serverNavigation[0], /nav\('tickets'/);
  assert.doesNotMatch(serverNavigation[0], /nav\('automod'/);
  assert.match(source, /data-dashboard-view/);
  assert.match(source, /data-server-switch/);
  assert.match(source, /data-nav-search/);
  assert.match(source, /Ctrl K/);
  assert.match(source, /data-persist-draft/);
  assert.match(source, /const view = 'control'/);
  assert.match(source, /guildMatch\[2\] && guildMatch\[2\] !== 'control'/);
  assert.match(source, /return redirect\(response, `\/dashboard\/guild\/\$\{guild\.id\}\/control`\)/);
  assert.doesNotMatch(source, /requestedView = \['control','overview','moderation'/);
});

test('live web support applies ticket state without forced reload', () => {
  assert.match(source, /function applyTicketState\(root,ticket\)/);
  assert.match(source, /data-support-composer/);
  assert.match(source, /data-support-closed/);
  assert.doesNotMatch(source, /root\.dataset\.ticketStatus!==ticket\.status\)\{location\.reload\(\)/);
});

test('Render restart audits Support without reinstalling Discord structure', () => {
  assert.match(source, /NEXA Support Center felismerve, újratelepítés kihagyva/);
  assert.match(source, /Futtasd kézzel: \/support-szerver javitas/);
  const readyBlock = source.match(/client\.once\(Events\.ClientReady,[\s\S]+?client\.on\(Events\.InteractionCreate/);
  assert.ok(readyBlock, 'ClientReady block missing');
  assert.doesNotMatch(readyBlock[0], /await setupSupportServer/);
});

test('profile center and persistent language switch are available', () => {
  assert.match(source, /async function profilePage\(client, session\)/);
  assert.match(source, /url\.pathname === '\/profile'/);
  assert.match(source, /url\.pathname === '\/language'/);
  assert.match(source, /nexabot_language/);
  assert.match(source, /Profile & language/);
});

test('Stripe subscription flow validates live configuration and reconciles Checkout', () => {
  assert.match(source, /\^\(\?:sk\|rk\)_\(\?:test\|live\)_/);
  assert.match(source, /\^price_\[A-Za-z0-9\]\+/);
  assert.match(source, /STRIPE READINESS/);
  assert.match(source, /async function validateStripeConfiguration/);
  assert.match(source, /\/prices\/\$\{encodeURIComponent\(priceId\)\}/);
  assert.match(source, /async function reconcileCheckoutSession/);
  assert.match(source, /billing_checkout_reconciled/);
  assert.match(source, /checkout\.session\.async_payment_succeeded/);
  assert.match(source, /A tartós adatbázis nem érhető el/);
  assert.match(source, /Pontos hiba megtekintése/);
  assert.match(source, /const action = disabled/);
  assert.doesNotMatch(source, /type="submit"\$\{disabled \? ' disabled'/);
  assert.match(source, /data-billing-form/);
});

test('Stripe checkout gives visible feedback and a direct browser navigation', () => {
  assert.match(source, /async function submitBillingForm\(form,event\)/);
  assert.match(source, /window\.location\.assign\(data\.url\)/);
  assert.match(source, /billing-client-error/);
  assert.match(source, /const wantsJson = String\(request\.headers\.accept/);
  assert.match(source, /sendJson\(response, 200, \{ ok: true, url: checkout\.url \}\)/);
  assert.match(source, /form-action 'self' https:\/\/checkout\.stripe\.com https:\/\/billing\.stripe\.com/);
});

test('Azure Command UI provides a calm professional unified workspace', () => {
  assert.match(source, /class="nexa-v153/);
  assert.match(source, /NEXA Bot 20\.2\.0 • NEXA OS Studio/);
  assert.match(source, /NEXA Azure Command — calm, desktop-first operations theme/);
  assert.match(source, /--primary:#4b9dff;--accent:#5ed8c4/);
  assert.match(source, /guild-settings\.view-control \.settings/);
  assert.match(source, /class="settings-jump"/);
  assert.match(source, /class="billing-steps"/);
  assert.match(source, /class="billing-selector card"/);
  assert.match(source, /class="card section billing-diagnostics"/);
});

test('Platform 20 uses a responsive system architecture instead of oversized legacy cards', () => {
  assert.match(source, /function platformShowcasePage\(session, language = 'hu'\)/);
  assert.match(source, /class="platform-hero-v20"/);
  assert.match(source, /class="platform-system-grid"/);
  assert.match(source, /class="platform-flow-grid"/);
  assert.match(source, /if \(kind === 'platform'\) return platformShowcasePage\(session, language\)/);
  assert.match(source, /NEXA OS Studio/);
  assert.match(source, /@media\(max-width:850px\).*\.platform-system,.platform-system\.system-featured\{grid-column:span 12/s);
});

test('CIA final upgrade is primary-owner-only and permanently disables the installer', () => {
  assert.match(source, /const CIA_INSTALLATION_VERSION = 3/);
  assert.match(source, /const CIA_INSTALL_MARKER = `NEXA_CIA_INSTALLATION_V\$\{CIA_INSTALLATION_VERSION\}`/);
  assert.match(source, /function buildCiaSetupCommand\(\)/);
  assert.match(source, /\.setName\('cia'\)/);
  assert.match(source, /\.setName\('telepites'\)/);
  assert.match(source, /\.setName\('ellenorzes'\)/);
  assert.match(source, /\.setName\('rangok-frissitese'\)/);
  assert.match(source, /\.setName\('ujratelepites'\)/);
  assert.match(source, /if \(!isBotOwner\(interaction\.user\.id\)\)/);
  assert.match(source, /!interaction\.memberPermissions\?\.has\(PermissionFlagsBits\.Administrator\)/);
  assert.match(source, /ownerMember\?\.permissions\?\.has\(PermissionFlagsBits\.Administrator\)/);
  assert.match(source, /function isCiaInstallationComplete\(guild\)/);
  assert.match(source, /installations\?\.cia\?\.completed \|\| ciaDiscordMarkerPresent\(guild\)/);
  assert.match(source, /error\.code = 'CIA_INSTALLER_FINALIZED'/);
  assert.match(source, /config\.installations\.cia = \{/);
  assert.match(source, /await channels\.systemControl\.setTopic\(`/);
});

test('CIA factory installs roles, permissioned categories, panels and workflows', () => {
  for (const role of ['Director of the CIA (D/CIA)', 'Deputy Director of the CIA (DD/CIA)', 'Executive Director (EXDIR)', 'Deputy Director for Operations (DDO)', 'Chief of Station (COS)', 'Case Officer (CO)', 'Targeting Officer (TO)', 'Staff Operations Officer (SOO)', 'Professional Trainee (PT)']) {
    assert.ok(source.includes(role), `missing CIA role ${role}`);
  }
  for (const category of ['CIA BELÉPÉS', 'CIA INFORMÁCIÓ', 'MŰVELETI KÖZPONT', 'HÍRSZERZÉS', 'BELSŐ ELLENŐRZÉS', 'IGAZGATÓSÁG']) {
    assert.ok(source.includes(category), `missing CIA category ${category}`);
  }
  for (const capability of ['ciaApplicationTemplate', 'ciaDocumentTypes', 'publishCiaPanels', 'ticketPanel', 'shiftPanel', 'staffPanel']) {
    assert.match(source, new RegExp(`function ${capability}\\(`));
  }
  assert.match(source, /await grantGuildPlan\(guild\.id, 'ultimate'/);
  assert.match(source, /config\.protection\.whitelistRoles/);
  assert.match(source, /antiNuke: true/);
  assert.match(source, /config\.language = 'hu'/);
  assert.match(source, /rankStyle: 'american'/);
  assert.match(source, /function refreshCiaAmericanRanks\(guild, botUser, ownerMember\)/);
  assert.match(source, /A CIA a valóságban nem katonai rendfokozatokat/);
});

test('CIA setup never auto-runs after a Render restart', () => {
  const readyBlock = source.match(/client\.once\(Events\.ClientReady,[\s\S]+?client\.on\(Events\.InteractionCreate/);
  assert.ok(readyBlock, 'ClientReady block missing');
  assert.doesNotMatch(readyBlock[0], /await setupCiaServer/);
  assert.match(source, /registerCiaCommandInOwnerGuilds/);
  const globalCommands = source.match(/Routes\.applicationCommands\(process\.env\.CLIENT_ID\)[\s\S]+?\.map\(\(item\) => localizeCommandJson/);
  assert.ok(globalCommands, 'global command registration block missing');
  assert.doesNotMatch(globalCommands[0], /buildCiaSetupCommand\(\)/);
});

test('CIA management stays Discord-only and is absent from the web dashboard', () => {
  const dashboardModule = source.match(/"src\/dashboard\.js": function[\s\S]+?\n\},\n"src\/interactions\.js"/);
  assert.ok(dashboardModule, 'Dashboard module missing');
  assert.doesNotMatch(dashboardModule[0], /CIA frakciórendszer|cia-repair|repairCiaServer|isCiaInstallationComplete/);
  assert.match(source, /A CIA-rendszer kizárólag Discordon, a botowner parancsaival kezelhető/);
});

test('NEXA OS Studio is primary-owner-only and uses signed expiring previews', () => {
  assert.match(source, /"src\/server-architect\.js"/);
  assert.match(source, /function signBlueprintToken\(plan, guildId, ownerId\)/);
  assert.match(source, /expiresAt: Date\.now\(\) \+ 30 \* 60 \* 1000/);
  assert.match(source, /crypto\.timingSafeEqual/);
  assert.match(source, /ownerArchitectMatch/);
  assert.match(source, /if \(!isBotOwner\(session\.user\.id\)\)/);
  assert.match(source, /A hozzáadott Owner-kezelők sem kapnak hozzáférést/);
  assert.match(source, /A hozzáadott Owner-kezelők ezt a részt nem látják/);
});

test('NEXA OS Studio is repeatable, audited and non-destructive', () => {
  assert.match(source, /CREATE TABLE IF NOT EXISTS nexabot_architect_deployments/);
  assert.match(source, /owner_architect_plan/);
  assert.match(source, /owner_architect_apply/);
  assert.match(source, /owner_architect_repair/);
  assert.match(source, /architect-preflight/);
  assert.match(source, /latestArchitectDeployment/);
  assert.match(source, /Terv javítása \/ újrafuttatása/);
  const architectModule = source.match(/"src\/server-architect\.js": function[\s\S]+?\n\},\n"src\/dashboard\.js"/);
  assert.ok(architectModule, 'NEXA OS Studio module missing');
  assert.doesNotMatch(architectModule[0], /Administrator:\s*PermissionFlagsBits\.Administrator/);
  assert.doesNotMatch(architectModule[0], /guild\.channels\.delete|guild\.roles\.delete/);
});

test('Discord reinstall commands are also restricted to the primary bot owner', () => {
  assert.match(source, /\['telepites', 'dokumentum-panelek'\]\.includes\(interaction\.commandName\) && !isBotOwner\(interaction\.user\.id\)/);
  assert.match(source, /Telepítést és újratelepítést kizárólag a NEXA Bot elsődleges tulajdonosa/);
});
