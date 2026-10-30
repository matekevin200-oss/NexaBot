'use strict';

const { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig, isBotOwner } = require('./config');
const { recordAudit, recordError } = require('./telemetry');
const { normalizeName, customDocumentTypes, documentPanel } = require('./documents');
const { isConfiguredRoleHolder } = require('./belv-roster-rules');

const BELV_GUILD_ID = '1517509643734221030';
const CATEGORY = '⚖️┃BELV • FEGYELMI ÉS JOGI OSZTÁLY';
const LEADERSHIP_ROLE = 'BELVÉDELMI VEZETŐSÉG';
const CHANNELS = Object.freeze([
  { key: 'statute', name: 'belv-btk', public: true },
  { key: 'penalties', name: 'büntetési-tételek', public: true },
  { key: 'rules', name: 'fegyelmi-szabályzat', public: true },
  { key: 'intake', name: 'fegyelmi-bejelentések', public: true },
  { key: 'open', name: 'folyamatban-lévő-eljárások', aliases: ['fegyelmi-eljárások'] },
  { key: 'review', name: 'vezetőségi-elbírálás', aliases: ['ügyiratok'] },
  { key: 'decisions', name: 'fegyelmi-határozatok', aliases: ['határozatok'] },
  { key: 'appeals', name: 'fegyelmi-felülvizsgálatok' },
  { key: 'archive', name: 'lezárt-fegyelmi-ügyek', aliases: ['archívum'] }
]);
const FORM_TYPES = Object.freeze([
  { key: 'custom_belv_bej', title: 'Fegyelmi bejelentés', emoji: '📨', channel: 'intake', fields: [
    { label: 'Érintett személy, rang', placeholder: 'Név és beosztás' },
    { label: 'Esemény időpontja', placeholder: 'ÉÉÉÉ.HH.NN. ÓÓ:PP' },
    { label: 'Bejelentés tárgya', placeholder: 'Rövid, tényszerű megnevezés' },
    { label: 'Tényállás és szabály', placeholder: 'Mi történt, mely szabály érintett?', style: 'paragraph' },
    { label: 'Bizonyíték vagy tanú', placeholder: 'Hivatkozás vagy elérhetőség', required: false }
  ] },
  { key: 'custom_belv_viz', title: 'Vizsgálati jelentés', emoji: '🔎', channel: 'open', fields: [
    { label: 'Ügyszám', placeholder: 'RP-ÉÉÉÉHHNN-ÓÓPP' },
    { label: 'Vizsgáló és érintett', placeholder: 'Név, rang, jelvényszám' },
    { label: 'Vizsgálati lépések', placeholder: 'Elvégzett lépések', style: 'paragraph' },
    { label: 'Megállapítások és bizonyítékok', placeholder: 'Tények, hivatkozások', style: 'paragraph' },
    { label: 'Javaslat', placeholder: 'További intézkedés vagy lezárás', style: 'paragraph' }
  ] },
  { key: 'custom_belv_hat', title: 'Fegyelmi határozat', emoji: '⚖️', channel: 'decisions', fields: [
    { label: 'Ügyszám és érintett', placeholder: 'Ügyszám, név, rang' },
    { label: 'Elbírált tényállás', placeholder: 'Rövid összefoglaló', style: 'paragraph' },
    { label: 'Hivatkozott szabály', placeholder: 'Pontos fejezet és pont' },
    { label: 'Döntés vagy javaslat', placeholder: 'Indoklással', style: 'paragraph' },
    { label: 'Felülvizsgálat határideje', placeholder: 'ÉÉÉÉ.HH.NN.' }
  ] },
  { key: 'custom_belv_fel', title: 'Fegyelmi felülvizsgálati kérelem', emoji: '🔁', channel: 'appeals', fields: [
    { label: 'Ügyszám és kérelmező', placeholder: 'Ügyszám, név, rang' },
    { label: 'Megtámadott döntés', placeholder: 'Döntés dátuma és tárgya' },
    { label: 'Kérelem indoka', placeholder: 'Részletes indoklás', style: 'paragraph' },
    { label: 'Új bizonyíték', placeholder: 'Leírás vagy hivatkozás', required: false, style: 'paragraph' },
    { label: 'Kért felülvizsgálat', placeholder: 'Mit kér a kérelmező?', style: 'paragraph' }
  ] },
  { key: 'custom_belv_lez', title: 'Fegyelmi ügy lezárása', emoji: '📁', channel: 'archive', fields: [
    { label: 'Ügyszám és érintett', placeholder: 'Ügyszám, név, rang' },
    { label: 'Lezárás dátuma', placeholder: 'ÉÉÉÉ.HH.NN.' },
    { label: 'Végleges eredmény', placeholder: 'A jóváhagyott döntés röviden', style: 'paragraph' },
    { label: 'Döntéshozó', placeholder: 'Név és rang' },
    { label: 'Kapcsolódó irat vagy bizonyíték', placeholder: 'Hivatkozás', required: false }
  ] }
]);

function buildCommand() {
  return new SlashCommandBuilder()
    .setName('belv-rendszer')
    .setDescription('A BELV fegyelmi és jogi ügykezelés ellenőrzése és telepítése.')
    .setDMPermission(false).setDefaultMemberPermissions(null)
    .addSubcommand((sub) => sub.setName('ellenorzes').setDescription('Csak ellenőrzi a BELV csatornáit és jogosultságait.'))
    .addSubcommand((sub) => sub.setName('telepites').setDescription('Létrehozza a hiányzó BELV ügykezelő csatornákat és űrlapokat.'));
}

function leadership(guild) {
  const expected = normalizeName(LEADERSHIP_ROLE);
  return guild.roles.cache.find((role) => normalizeName(role.name) === expected) || null;
}
function resolvePlan(guild) {
  const categories = [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildCategory && normalizeName(c.name) === normalizeName(CATEGORY));
  if (categories.length > 1) throw new Error('Több azonos BELV ügykezelő kategória van. Semmit nem módosítottam.');
  const channels = new Map(), conflicts = [];
  for (const spec of CHANNELS) {
    const names = new Set([spec.name, ...(spec.aliases || [])].map(normalizeName));
    const found = [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildText && names.has(normalizeName(c.name)));
    if (found.length > 1) conflicts.push(spec.name + ': több lehetséges meglévő csatorna');
    else channels.set(spec.key, found[0] || null);
  }
  if (conflicts.length) throw new Error(conflicts.join('\n') + '\nSemmit nem módosítottam.');
  return { category: categories[0] || null, channels };
}
function checkExisting(guild, role, plan) {
  const errors = [];
  for (const spec of CHANNELS) {
    const channel = plan.channels.get(spec.key);
    if (!channel) continue;
    const permissions = channel.permissionsFor(guild.members.me);
    if (!permissions || !permissions.has(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory))
      errors.push('#' + channel.name + ': a Nexának csatornamegtekintés, üzenetküldés, beágyazás és előzményolvasás kell.');
    if (!spec.public && (!role || channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)))
      errors.push('#' + channel.name + ': érzékeny ügyiratcsatorna, amelyet @everyone láthat vagy nincs vezetőségi rang. Meglévő jogosultságot nem változtatok.');
  }
  return errors;
}
function overwrites(guild, me, role) {
  if (!role) throw new Error('A „' + LEADERSHIP_ROLE + '” rang hiányzik; biztonságos privát csatornákat nem hozok létre.');
  return [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
    { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] }
  ];
}
async function configureForms(guild, channels) {
  const old = getGuildConfig(guild.id);
  const customTypes = (old.documents?.customTypes || []).filter((x) => !FORM_TYPES.some((item) => item.key === x.key));
  const nextTypes = FORM_TYPES.map((type) => ({
    ...type, approval: true, caseNumber: true, pingTarget: false, active: true,
    channelId: channels.get(type.channel === 'intake' ? 'review' : type.channel).id,
    fields: type.fields.map((field) => ({ ...field }))
  }));
  await setGuildConfig(guild.id, { ...old, documents: { ...old.documents, customTypes: [...customTypes, ...nextTypes] } });
  return customDocumentTypes(guild);
}
async function publishPanel(channel, botId, type, guild) {
  const messages = await channel.messages.fetch({ limit: 50 });
  const footer = 'NexaBot • Dokumentumpanel • ' + type.key;
  const previous = messages.find((m) => m.author.id === botId && m.embeds[0]?.footer?.text === footer);
  if (previous) await previous.edit(documentPanel(type, guild));
  else await channel.send(documentPanel(type, guild));
}
async function provision(interaction, install) {
  const guild = interaction.guild;
  if (!guild || guild.id !== BELV_GUILD_ID) throw new Error('Ez a parancs kizárólag a BELV szerveren használható.');
  await guild.channels.fetch();
  await guild.roles.fetch();
  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  const role = leadership(guild);
  if (!member || !(member.id === guild.ownerId || isBotOwner(member.id) || isConfiguredRoleHolder(member, role?.id)))
    throw new Error('Ezt csak a szerver tulajdonosa, a NEXA fő ownere vagy a „' + LEADERSHIP_ROLE + '” rang használhatja.');
  const me = guild.members.me || await guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) throw new Error('A Nexának hiányzik a Csatornák kezelése jogosultság.');
  const plan = resolvePlan(guild);
  const failures = checkExisting(guild, role, plan);
  if (failures.length) throw new Error(failures.join('\n') + '\nMeglévő jogosultságot nem módosítottam.');
  const missing = CHANNELS.filter((s) => !plan.channels.get(s.key));
  if (!install) return { created: [], reused: CHANNELS.filter((s) => plan.channels.get(s.key)).map((s) => plan.channels.get(s.key).name), missing: missing.map((s) => s.name), categoryMissing: !plan.category };

  let category = plan.category;
  const base = overwrites(guild, me, role);
  if (!category) category = await guild.channels.create({ name: CATEGORY, type: ChannelType.GuildCategory, permissionOverwrites: base, reason: 'BELV ügykezelő kategória • ' + interaction.user.id });
  const created = [], resolved = new Map(plan.channels);
  for (const spec of missing) {
    const permissionOverwrites = spec.public
      ? [{ id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }, ...base.slice(1)]
      : base;
    const channel = await guild.channels.create({
      name: spec.name, type: ChannelType.GuildText, parent: category.id,
      topic: 'NEXA BELV • ' + spec.name + ' • ügykezelési csatorna',
      permissionOverwrites, reason: 'BELV ügykezelés • ' + interaction.user.id
    });
    resolved.set(spec.key, channel);
    created.push(channel.name);
  }
  const types = await configureForms(guild, resolved);
  const byKey = new Map(types.map((type) => [type.key, type]));
  const panels = [];
  for (const form of FORM_TYPES) {
    const channel = resolved.get(form.channel);
    await publishPanel(channel, me.id, byKey.get(form.key), guild);
    panels.push(channel.name);
  }
  await recordAudit('belv_discipline_provision', {
    guildId: guild.id, actorId: interaction.user.id,
    metadata: { created, reused: [...resolved.values()].filter((c) => !created.includes(c.name)).map((c) => c.name), panels }
  }).catch(() => {});
  return { created, reused: [...resolved.values()].filter((c) => !created.includes(c.name)).map((c) => c.name), panels, category: category.name };
}
async function handleCommand(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const install = interaction.options.getSubcommand() === 'telepites';
    const result = await provision(interaction, install);
    if (!install) return interaction.editReply('✅ BELV ügykezelés ellenőrzése kész.\nKategória: ' + (result.categoryMissing ? 'hiányzik' : 'rendben') +
      '\nHiányzó csatornák: ' + (result.missing.length ? result.missing.map((n) => '#' + n).join(', ') : 'nincs') +
      '\nMeglévő csatornák: ' + (result.reused.length ? result.reused.map((n) => '#' + n).join(', ') : 'nincs') +
      '\nEz ellenőrzés volt; semmit nem módosítottam.');
    return interaction.editReply('✅ BELV ügykezelés telepítve.\nKategória: ' + result.category +
      '\nLétrehozott csatornák: ' + (result.created.length ? result.created.map((n) => '#' + n).join(', ') : 'nincs új csatorna') +
      '\nFelhasznált csatornák: ' + (result.reused.length ? result.reused.map((n) => '#' + n).join(', ') : 'nincs') +
      '\nŰrlappanelek: ' + result.panels.map((n) => '#' + n).join(', ') +
      '\n\nA BTK teljes szövege nincs a feltöltött fájlban, ezért nem tettem közzé. A bot emberi jóváhagyás nélkül nem alkalmaz büntetést.');
  } catch (error) {
    await recordError(error, { command: 'belv_rendszer', guildId: interaction.guildId, userId: interaction.user.id }).catch(() => {});
    return interaction.editReply('❌ ' + (error.message || 'A BELV rendszer telepítése nem sikerült.'));
  }
}
module.exports = { buildCommand, handleCommand, BELV_GUILD_ID, CHANNELS, FORM_TYPES };
