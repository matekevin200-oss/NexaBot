const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadLocalizationModule() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const marker = '"src/command-localizations.js": function(module, exports, require) {';
  const start = source.indexOf(marker);
  const end = source.indexOf('\n\n},\n"src/community.js"', start);
  assert.notEqual(start, -1, 'command localization bundle entry missing');
  assert.notEqual(end, -1, 'command localization bundle boundary missing');
  const module = { exports: {} };
  new Function('module', 'exports', 'require', source.slice(start + marker.length, end))(module, module.exports, require);
  return module.exports;
}

test('English and Hungarian slash command aliases resolve to one canonical handler', () => {
  const localization = loadLocalizationModule();
  assert.equal(localization.canonicalCommandName('settings'), 'beallitas');
  assert.equal(localization.canonicalCommandName('beallitas'), 'beallitas');
  assert.equal(localization.canonicalCommandName('sugo'), 'help');
  assert.equal(localization.canonicalCommandName('help'), 'help');
  assert.equal(localization.canonicalCommandName('verification'), 'hitelesites');
});

test('localized command payload contains both English and Hungarian display names', () => {
  const localization = loadLocalizationModule();
  const localized = localization.localizeCommandJson({
    name: 'beallitas',
    description: 'A webes kezelőfelület megnyitása.',
    options: []
  });
  assert.equal(localized.name_localizations.hu, 'beallitas');
  assert.equal(localized.name_localizations['en-US'], 'settings');
  assert.ok(localized.description_localizations.hu);
  assert.ok(localized.description_localizations['en-US']);
});
