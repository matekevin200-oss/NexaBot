const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

test('release metadata is 15.1.0', () => {
  assert.equal(pkg.version, '15.1.0');
  assert.equal(lock.version, '15.1.0');
  assert.equal(lock.packages[''].version, '15.1.0');
  assert.match(source, /const APP_VERSION = '15\.1\.0'/);
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


test('Command Deck has dedicated server control routes and focused views', () => {
  for (const route of ['overview','moderation','automod','welcome','tickets','logs','reaction-roles','auto-role','level','giveaway','ai','security','stats','settings']) {
    assert.ok(source.includes(route), `missing dedicated dashboard view ${route}`);
  }
  assert.match(source, /data-dashboard-view/);
  assert.match(source, /data-server-switch/);
  assert.match(source, /data-nav-search/);
  assert.match(source, /Ctrl K/);
  assert.match(source, /data-persist-draft/);
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

test('Stripe readiness validates key formats and explains missing setup', () => {
  assert.match(source, /\^sk_\(\?:test\|live\)_/);
  assert.match(source, /\^price_\[A-Za-z0-9\]\+/);
  assert.match(source, /STRIPE READINESS/);
  assert.match(source, /MISSING \/ INVALID/);
  assert.match(source, /data-billing-form/);
});
