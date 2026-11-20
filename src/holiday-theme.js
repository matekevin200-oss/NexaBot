'use strict';

const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { dbQuery, isPersistentStore } = require('./config');
const { recordAudit, recordError } = require('./telemetry');

const BELV_GUILD_ID = '1517509643734221030';
const locks = new Set();
const THEMES = Object.freeze({
  karacsony: { label: 'Karácsony', emojis: ['🎄', '❄️', '🎁', '🕯️', '⭐', '🔔'] },
  uj_ev: { label: 'Újév', emojis: ['🎆', '✨', '🥂', '🎊', '🪩', '⭐'] },
  valentin: { label: 'Valentin-nap', emojis: ['💝', '❤️', '🌹', '💌', '💕', '💘'] },
  husvet: { label: 'Húsvét', emojis: ['🐣', '🐰', '🥚', '🌷', '🪻', '🌼'] },
  halloween: { label: 'Halloween', emojis: ['🎃', '👻', '🦇', '🕸️', '☠️', '🌙'] },
  mikulas: { label: 'Mikulás', emojis: ['🎅', '🧦', '🍬', '🔔', '🎁', '❄️'] },
  farsang: { label: 'Farsang', emojis: ['🎭', '🎉', '🎈', '🎊', '🥳', '🎶'] },
  marcius15: { label: 'Március 15.', emojis: ['🇭🇺', '⭐', '📜', '🟥', '⬜', '🟩'] },
  augusztus20: { label: 'Augusztus 20.', emojis: ['🇭🇺', '👑', '🌾', '⭐', '🟥', '🟩'] },
  mindenszentek: { label: 'Mindenszentek', emojis: ['🕯️', '🕊️', '🌹', '⭐', '🍂', '🤍'] },
  anyak_napja: { label: 'Anyák napja', emojis: ['🌷', '💐', '💝', '🌸', '❤️', '🌼'] },
  gyereknap: { label: 'Gyereknap', emojis: ['🎈', '🧸', '🎨', '🎉', '🌈', '🎁'] }
});

function buildCommand() {
  return new SlashCommandBuilder()
    .setName('unnepi-megjelenes')
    .setDescription('Ünnepi emojik beállítása a BELV Discordon és a NexaBot becenevén.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => option.setName('tema').setDescription('Válassz ünnepet; a visszaállítás az eredeti emojikat állítja vissza.').setRequired(true)
      .addChoices(
        ...Object.entries(THEMES).map(([value, theme]) => ({ name: theme.label, value })),
        { name: 'Egyedi ünnep', value: 'egyedi' },
        { name: 'Eredeti megjelenés visszaállítása', value: 'visszaallitas' }
      ))
    .addStringOption(option => option.setName('emoji').setDescription('Egyedi ünnepnél kötelező emoji; választható témánál mindent felülír.').setRequired(false).setMaxLength(16));
}

async function syncGuildCommand(guild) {
  if (!guild?.commands || guild.id !== BELV_GUILD_ID) return;
  const current = await guild.commands.fetch();
  const payload = buildCommand().toJSON();
  const existing = current.find(command => command.name === payload.name);
  if (existing) await existing.edit(payload);
  else await guild.commands.create(payload);
}

async function ensureSchema() {
  if (!isPersistentStore()) throw new Error('Az ünnepi megjelenéshez tartós adatbázis szükséges.');
  await dbQuery(`CREATE TABLE IF NOT EXISTS nexabot_belv_holiday_appearance (
    guild_id TEXT PRIMARY KEY,
    original_roles JSONB NOT NULL,
    original_channels JSONB NOT NULL,
    original_nickname TEXT,
    theme TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

function objectValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try { return JSON.parse(String(value || '{}')); } catch { return {}; }
}
function firstGrapheme(value) {
  return [...new Intl.Segmenter('hu', { granularity: 'grapheme' }).segment(String(value || ''))][0]?.segment || '';
}
function looksLikeEmoji(value) {
  return [...String(value || '')].some(char => {
    const cp = char.codePointAt(0);
    return (cp >= 0x1f000 && cp <= 0x1faff) || (cp >= 0x2600 && cp <= 0x27ff) || (cp >= 0x1f1e6 && cp <= 0x1f1ff);
  });
}
function replaceLeadingEmoji(original, emoji) {
  const source = String(original || '');
  const grapheme = firstGrapheme(source);
  const emojiStart = looksLikeEmoji(grapheme);
  const result = emojiStart ? emoji + source.slice(grapheme.length) : emoji + source;
  if (result.length > 100) throw new Error('A név az emoji cseréje után túllépné a Discord 100 karakteres korlátját.');
  return result;
}
function separatorRole(name) {
  const marks = new Set(['-', '—', '_', '─', '━']);
  const symbols = new Set(['|', '┃', '•', '·', '…']);
  const chars = [...String(name || '').trim()];
  return chars.filter(char => marks.has(char)).length >= 4
    && chars.every(char => marks.has(char) || symbols.has(char) || char.trim() === '');
}
function emojiFor(theme, original, override) {
  if (override) return override;
  const value = String(original || '');
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.codePointAt(0)) % 100000;
  return theme.emojis[hash % theme.emojis.length];
}
function actorCanManage(interaction) {
  return Boolean(interaction.guild && (
    interaction.user.id === interaction.guild.ownerId
    || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  ));
}
function botPermissions(guild, bot) {
  const missing = [];
  if (!bot?.permissions.has(PermissionFlagsBits.ManageRoles)) missing.push('Szerepkörök kezelése');
  if (!bot?.permissions.has(PermissionFlagsBits.ManageChannels)) missing.push('Csatornák kezelése');
  if (!bot?.permissions.has(PermissionFlagsBits.ManageNicknames)) missing.push('Becenevek kezelése');
  return missing;
}
async function loadState(guildId) {
  const result = await dbQuery('SELECT original_roles,original_channels,original_nickname,theme FROM nexabot_belv_holiday_appearance WHERE guild_id=$1', [guildId]);
  const row = result?.rows?.[0];
  if (!row) return null;
  return {
    roles: objectValue(row.original_roles),
    channels: objectValue(row.original_channels),
    nickname: row.original_nickname,
    theme: row.theme
  };
}
async function saveState(guildId, state, theme) {
  await dbQuery(
    'INSERT INTO nexabot_belv_holiday_appearance(guild_id,original_roles,original_channels,original_nickname,theme) VALUES($1,$2::jsonb,$3::jsonb,$4,$5) ON CONFLICT(guild_id) DO UPDATE SET original_roles=EXCLUDED.original_roles,original_channels=EXCLUDED.original_channels,theme=EXCLUDED.theme,updated_at=NOW()',
    [guildId, JSON.stringify(state.roles), JSON.stringify(state.channels), state.nickname, theme]
  );
}
async function captureOriginals(guild, bot, existing) {
  const state = existing || { roles: {}, channels: {}, nickname: bot.nickname ?? null, theme: '' };
  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.roles.everyone.id || role.managed || separatorRole(role.name)) continue;
    if (!(role.id in state.roles)) state.roles[role.id] = role.name;
  }
  for (const channel of guild.channels.cache.values()) {
    if (channel.isThread?.()) continue;
    if (!(channel.id in state.channels)) state.channels[channel.id] = channel.name;
  }
  return state;
}
async function applyNames(guild, bot, state, theme, override, restoring) {
  const errors = [];
  let rolesChanged = 0, channelsChanged = 0;
  const roleEntries = Object.entries(state.roles);
  for (const [id, originalName] of roleEntries) {
    const target = guild.roles.cache.get(id);
    if (!target || target.managed || target.id === guild.roles.everyone.id || separatorRole(originalName)) continue;
    if (target.position >= (bot.roles?.highest?.position || 0)) {
      errors.push('Nem kezelhető ranghierarchia miatt: ' + originalName);
      continue;
    }
    const nextName = restoring ? originalName : replaceLeadingEmoji(originalName, emojiFor(theme, originalName, override));
    if (target.name === nextName) continue;
    try { await target.edit({ name: nextName, reason: restoring ? 'BELV ünnepi megjelenés visszaállítása' : 'BELV ünnepi rangemoji' }); rolesChanged++; }
    catch (error) { errors.push('Rang ' + originalName + ': ' + String(error.message || error)); }
  }
  for (const [id, originalName] of Object.entries(state.channels)) {
    const target = guild.channels.cache.get(id);
    if (!target || target.isThread?.()) continue;
    const nextName = restoring ? originalName : replaceLeadingEmoji(originalName, emojiFor(theme, originalName, override));
    if (target.name === nextName) continue;
    try { await target.setName(nextName, restoring ? 'BELV ünnepi megjelenés visszaállítása' : 'BELV ünnepi csatornaemoji'); channelsChanged++; }
    catch (error) { errors.push('Csatorna ' + originalName + ': ' + String(error.message || error)); }
  }
  const nextNickname = restoring
    ? state.nickname
    : replaceLeadingEmoji(state.nickname || 'NexaBot', emojiFor(theme, 'NexaBot', override));
  if ((bot.nickname ?? null) !== nextNickname) {
    try { await bot.setNickname(nextNickname, restoring ? 'BELV ünnepi megjelenés visszaállítása' : 'BELV ünnepi NexaBot-becenév'); }
    catch (error) { errors.push('NexaBot becenév: ' + String(error.message || error)); }
  }
  return { rolesChanged, channelsChanged, errors };
}

async function handleCommand(interaction) {
  if (!interaction.guild || interaction.guildId !== BELV_GUILD_ID) {
    return interaction.reply({ content: 'Ez a parancs kizárólag a BELV Discord-szerveren használható.', flags: MessageFlags.Ephemeral });
  }
  if (!actorCanManage(interaction)) {
    return interaction.reply({ content: 'Az ünnepi megjelenést csak a BELV szerver tulajdonosa vagy adminisztrátora állíthatja.', flags: MessageFlags.Ephemeral });
  }
  if (locks.has(interaction.guildId)) {
    return interaction.reply({ content: 'Már folyamatban van egy ünnepi megjelenés módosítása. Próbáld újra később.', flags: MessageFlags.Ephemeral });
  }
  const themeKey = interaction.options.getString('tema', true);
  const override = interaction.options.getString('emoji');
  if (themeKey === 'egyedi' && !looksLikeEmoji(override)) {
    return interaction.reply({ content: 'Egyedi témához adj meg egy Unicode emojit az emoji mezőben.', flags: MessageFlags.Ephemeral });
  }
  if (override && !looksLikeEmoji(override)) {
    return interaction.reply({ content: 'Az emoji mezőbe egy érvényes Unicode emojit írj.', flags: MessageFlags.Ephemeral });
  }
  locks.add(interaction.guildId);
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await ensureSchema();
    const guild = interaction.guild;
    const bot = guild.members.me || await guild.members.fetchMe();
    const missing = botPermissions(guild, bot);
    if (missing.length) throw new Error('A NexaBot jogosultságai hiányoznak: ' + missing.join(', ') + '.');
    await guild.roles.fetch();
    await guild.channels.fetch();
    const current = await loadState(guild.id);
    if (themeKey === 'visszaallitas') {
      if (!current) return interaction.editReply('Nincs elmentett ünnepi BELV-megjelenés, amit vissza lehetne állítani.');
      const result = await applyNames(guild, bot, current, null, null, true);
      if (!result.errors.length) await dbQuery('DELETE FROM nexabot_belv_holiday_appearance WHERE guild_id=$1', [guild.id]);
      await recordAudit('belv_holiday_appearance_restored', { guildId: guild.id, actorId: interaction.user.id, metadata: { roles: result.rolesChanged, channels: result.channelsChanged, errors: result.errors.length } }).catch(() => null);
      return interaction.editReply('🔄 **Eredeti BELV-megjelenés visszaállítva.**\nRangok: ' + result.rolesChanged + ' · csatornák: ' + result.channelsChanged + ' · NexaBot-becenév: ' + (result.errors.some(item => item.startsWith('NexaBot')) ? 'hiba' : 'visszaállítva') + (result.errors.length ? '\nEllenőrizendő: ' + result.errors.slice(0, 8).join(' • ') : ''));
    }
    const theme = THEMES[themeKey];
    if (!theme) throw new Error('Ismeretlen ünnepi téma.');
    const state = await captureOriginals(guild, bot, current);
    await saveState(guild.id, state, themeKey);
    const result = await applyNames(guild, bot, state, theme, override, false);
    await dbQuery('UPDATE nexabot_belv_holiday_appearance SET theme=$2,updated_at=NOW() WHERE guild_id=$1', [guild.id, override ? themeKey + ':custom' : themeKey]);
    await recordAudit('belv_holiday_appearance_applied', { guildId: guild.id, actorId: interaction.user.id, metadata: { theme: themeKey, roles: result.rolesChanged, channels: result.channelsChanged, errors: result.errors.length } }).catch(() => null);
    const summary = '🎉 **BELV ünnepi megjelenés beállítva: ' + theme.label + '**\nRangok: ' + result.rolesChanged + ' · kategóriák/csatornák: ' + result.channelsChanged + ' · NexaBot-becenév frissítve.';
    return interaction.editReply((summary + (result.errors.length ? '\n\n⚠️ Nem sikerült minden elem: ' + result.errors.slice(0, 8).join(' • ') : '\nCsak az emojik változtak; az eredeti nevek mentve vannak az egyparancsos visszaállításhoz.')).slice(0, 1950));
  } catch (error) {
    await recordError(error, { command: 'unnepi-megjelenes', guildId: interaction.guildId, userId: interaction.user.id }).catch(() => null);
    const message = error.status ? error.message : 'Az ünnepi megjelenés módosítása nem sikerült: ' + String(error.message || error);
    return interaction.editReply('❌ ' + message.slice(0, 1700));
  } finally {
    locks.delete(interaction.guildId);
  }
}

module.exports = { buildCommand, syncGuildCommand, handleCommand };
