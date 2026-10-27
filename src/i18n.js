const { getGuildConfig } = require('./config');

function localeFor(guildOrId) {
  const guildId = typeof guildOrId === 'string' ? guildOrId : guildOrId?.id;
  if (!guildId) return 'hu';
  return getGuildConfig(guildId).language === 'en' ? 'en' : 'hu';
}

function pick(guildOrId, hungarian, english) {
  return localeFor(guildOrId) === 'en' ? english : hungarian;
}

function format(template, values = {}) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => values[key] ?? match);
}

function text(guildOrId, hungarian, english, values = {}) {
  return format(pick(guildOrId, hungarian, english), values);
}

module.exports = { localeFor, pick, format, text };
