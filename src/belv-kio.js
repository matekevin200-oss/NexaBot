'use strict';

const { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig, isBotOwner } = require('./config');
const { recordAudit, recordError } = require('./telemetry');
const { normalizeName, customDocumentTypes, documentPanel } = require('./documents');
const { classifyBelvRole } = require('./belv-roster-rules');

const BELV_GUILD_ID = '1517509643734221030';
const CATEGORY = '🚘┃BELV • KÖZÚTI IGAZGATÓSÁGI OSZTÁLY';
const RANKS = Object.freeze([
  'Közúti Igazgató', 'Közúti Igazgató Helyettes', 'Közúti Osztályvezető',
  'Közúti Csoportvezető', 'Közúti Vezető Ellenőr', 'Közúti Ellenőr',
  'Közúti Ügyintéző', 'Közúti Munkatárs', 'Közúti Munkatárs Próbaidőn'
]);
const CHANNELS = Object.freeze([
  { key: 'ranks', name: '📊┃kio-ranglétra', public: true },
  { key: 'powers', name: '⚖️┃kio-hatáskörök', public: true },
  { key: 'procedure', name: '📘┃intézkedési-rend', public: true },
  { key: 'announcements', name: '📢┃kio-közlemények', public: true },
  { key: 'service', name: '🚔┃kio-szolgálat', writers: 'all' },
  { key: 'reports', name: '📝┃kio-jelentések' },
  { key: 'minutes', name: '📋┃kio-jegyzőkönyvek' },
  { key: 'discipline', name: '⚠️┃kio-fegyelmi-ügyek' },
  { key: 'review', name: '🔎┃kio-vezetőségi-elbírálás' }
]);
const FORMS = Object.freeze([
  { key: 'custom_belv_kio_jelentes', title: 'KIO intézkedési jelentés', emoji: '📝', channel: 'reports', review: 'review', fields: [
    { label: 'Ügyintéző neve és KIO-rangja', placeholder: 'Név és KIO-beosztás' },
    { label: 'Intézkedés helye és időpontja', placeholder: 'Pontos helyszín, dátum és idő' },
    { label: 'Érintettek és járművek', placeholder: 'Nevek, rendszámok, szolgálati azonosítók', style: 'paragraph' },
    { label: 'Intézkedés és megállapítások', placeholder: 'Tárgyilagos, időrendi leírás', style: 'paragraph' },
    { label: 'Bizonyítékok és további intézkedés', placeholder: 'Linkek, tanúk, javaslat', style: 'paragraph', required: false }
  ] },
  { key: 'custom_belv_kio_jegyzokonyv', title: 'KIO jegyzőkönyv', emoji: '📋', channel: 'minutes', review: 'review', fields: [
    { label: 'Jegyzőkönyvvezető és ügyazonosító', placeholder: 'Név, rang, RP-azonosító' },
    { label: 'Meghallgatott személyek', placeholder: 'Nevek és szerepük', style: 'paragraph' },
    { label: 'Esemény rövid leírása', placeholder: 'Hely és időpont' },
    { label: 'Nyilatkozatok és tények', placeholder: 'Tárgyilagos, részletes feljegyzés', style: 'paragraph' },
    { label: 'Bizonyíték vagy megjegyzés', placeholder: 'Hivatkozás vagy kiegészítés', style: 'paragraph', required: false }
  ] },
  { key: 'custom_belv_kio_fegyelmi', title: 'KIO fegyelmi kezdeményezés', emoji: '⚠️', channel: 'discipline', review: 'review', fields: [
    { label: 'Bejelentő és érintett', placeholder: 'Nevek, rangok, szolgálati azonosítók' },
    { label: 'Esemény időpontja és helyszíne', placeholder: 'Pontos dátum, idő és hely' },
    { label: 'Feltételezett szabályszegés', placeholder: 'Szabályzat pontja és rövid megnevezése' },
    { label: 'Tényállás és bizonyítékok', placeholder: 'Részletes leírás és hivatkozások', style: 'paragraph' },
    { label: 'Javasolt intézkedés', placeholder: 'Indoklással; a döntés vezetői felülvizsgálatot igényel', style: 'paragraph' }
  ] }
]);

function normalize(value) { return normalizeName(value); }
function kioRole(guild, rank) { return guild.roles.cache.find((role) => normalize(role.name) === normalize(rank)) || null; }
function isKioMember(member) {
  return Boolean(member?.roles?.cache?.some((role) => RANKS.some((rank) => normalize(role.name) === normalize(rank))));
}
function isKioLeader(member) {
  const leaderNames = RANKS.slice(0, 3).map(normalize);
  return Boolean(member?.roles?.cache?.some((role) => leaderNames.includes(normalize(role.name))));
}
function canSubmit(member, key) {
  if (!String(key || '').startsWith('custom_belv_kio_')) return false;
  if (key === 'custom_belv_kio_fegyelmi') return isKioLeader(member);
  return isKioMember(member) || Boolean(member?.roles?.cache?.some((role) => {
    const rank = classifyBelvRole(role);
    return rank && rank.min <= 9;
  }));
}
function canApprove(member, key) {
  if (member?.guild?.id !== BELV_GUILD_ID || !String(key || '').startsWith('custom_belv_kio_')) return false;
  return isKioLeader(member) || Boolean(member?.roles?.cache?.some((role) => {
    const rank = classifyBelvRole(role);
    return rank && rank.min <= 9;
  }));
}
function embed(title, description) {
  return new EmbedBuilder().setColor(0x246b73).setTitle(title).setDescription(description)
    .setFooter({ text: 'NexaBot • BELV Közúti Igazgatósági Osztály • RP' });
}
function buildCommand() {
  return new SlashCommandBuilder().setName('belv-kio').setDescription('A BELV Közúti Igazgatósági Osztály ellenőrzése és telepítése.')
    .setDMPermission(false).setDefaultMemberPermissions(null)
    .addSubcommand((sub) => sub.setName('ellenorzes').setDescription('Csak ellenőrzi a BELV KIO rangokat és csatornákat.'))
    .addSubcommand((sub) => sub.setName('telepites').setDescription('Létrehozza a hiányzó KIO rangokat, csatornákat és űrlappaneleket.'));
}
function resolvePlan(guild) {
  const categories = [...guild.channels.cache.values()].filter((channel) => channel.type === ChannelType.GuildCategory && normalize(channel.name) === normalize(CATEGORY));
  if (categories.length > 1) throw new Error('Több KIO kategóriát találtam. Semmit nem módosítottam.');
  const channels = new Map(), conflicts = [];
  for (const spec of CHANNELS) {
    const found = [...guild.channels.cache.values()].filter((channel) => channel.type === ChannelType.GuildText && normalize(channel.name) === normalize(spec.name));
    if (found.length > 1) conflicts.push(spec.name + ': több azonos nevű csatorna');
    else channels.set(spec.key, found[0] || null);
  }
  if (conflicts.length) throw new Error(conflicts.join('\n') + '\nSemmit nem módosítottam.');
  return { category: categories[0] || null, channels };
}
function kioRoles(guild) { return RANKS.map((rank) => ({ rank, role: kioRole(guild, rank) })); }
function channelOverwrites(guild, bot, allRanks, spec) {
  const everyone = spec.public
    ? { id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
    : { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] };
  const roles = allRanks.filter(({ role }) => role).map(({ role }) => ({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, ...(spec.public ? [] : [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])] }));
  for (const role of guild.roles.cache.values()) {
    const belv = classifyBelvRole(role);
    if (belv && belv.min <= 9 && !roles.some((item) => item.id === role.id)) roles.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] });
  }
  const botOverwrite = { id: bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages] };
  const writers = spec.writers === 'all' ? roles : roles.filter((_item, index) => allRanks[index]?.rank);
  if (spec.public) return [everyone, ...roles, botOverwrite];
  return [everyone, ...(spec.writers === 'all' ? roles : writers), botOverwrite];
}
function checkExisting(guild, plan) {
  const problems = [];
  for (const spec of CHANNELS) {
    const channel = plan.channels.get(spec.key);
    if (!channel) continue;
    const botPerms = channel.permissionsFor(guild.members.me);
    if (!botPerms?.has(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory)) problems.push('#' + channel.name + ': a botnak hiányzik egy csatornajogosultsága; nem módosítottam.');
    if (!spec.public && channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)) problems.push('#' + channel.name + ': a privát KIO-csatornát @everyone is láthatja; nem módosítottam.');
  }
  return problems;
}
async function configureForms(guild, channels) {
  const old = getGuildConfig(guild.id), prior = old.documents?.customTypes || [];
  const customTypes = prior.filter((item) => !FORMS.some((form) => form.key === item.key));
  if (customTypes.length + FORMS.length > 25) throw new Error('A KIO űrlapok nem férnek el a NEXA egyedi irattípus-korlátjában; meglévő űrlapot nem töröltem.');
  const forms = FORMS.map((form) => ({ ...form, approval: true, caseNumber: true, active: true,
    channelId: channels.get(form.channel)?.id, approvalChannelId: channels.get(form.review)?.id,
    fields: form.fields.map((field) => ({ ...field })) }));
  await setGuildConfig(guild.id, { ...old, documents: { ...old.documents, customTypes: [...customTypes, ...forms] } });
  return customDocumentTypes(guild);
}
async function publish(channel, botId, type, guild) {
  const footer = 'NexaBot • Dokumentumpanel • ' + type.key;
  const embedMessage = documentPanel(type, guild);
  const messages = await channel.messages.fetch({ limit: 50 });
  const existing = messages.find((message) => message.author.id === botId && message.embeds[0]?.footer?.text === footer);
  if (existing) await existing.edit(embedMessage); else await channel.send(embedMessage);
}
async function provision(interaction, install) {
  const guild = interaction.guild;
  if (!guild || guild.id !== BELV_GUILD_ID) throw new Error('A KIO kizárólag a BELV Discord-szerveren, annak alosztályaként használható.');
  await guild.channels.fetch(); await guild.roles.fetch();
  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member || !(member.id === guild.ownerId || isBotOwner(member.id) || canApprove(member, 'custom_belv_kio_setup'))) throw new Error('A KIO telepítését a BELV szervertulajdonosa, a NEXA fő ownere, KIO-vezető vagy BV-01–09 rang használhatja.');
  const bot = guild.members.me || await guild.members.fetchMe();
  if (!bot.permissions.has(PermissionFlagsBits.ManageChannels) || !bot.permissions.has(PermissionFlagsBits.ManageRoles)) throw new Error('A Nexának Csatornák kezelése és Rangok kezelése jogosultság szükséges a hiányzó KIO-elemek létrehozásához.');
  const plan = resolvePlan(guild), failures = checkExisting(guild, plan);
  if (failures.length) throw new Error(failures.join('\n') + '\nMeglévő jogosultságot nem módosítottam.');
  const missingChannels = CHANNELS.filter((spec) => !plan.channels.get(spec.key));
  const missingRanks = RANKS.filter((rank) => !kioRole(guild, rank));
  if (!install) return { missingChannels: missingChannels.map((item) => item.name), missingRanks, reusedChannels: CHANNELS.filter((item) => plan.channels.get(item.key)).map((item) => plan.channels.get(item.key).name) };

  let category = plan.category;
  if (!category) category = await guild.channels.create({ name: CATEGORY, type: ChannelType.GuildCategory, reason: 'BELV KIO alosztály létrehozása • ' + interaction.user.id });
  const createdRoles = [];
  for (const rank of missingRanks) {
    await guild.roles.create({ name: rank, permissions: [], hoist: false, mentionable: false, reason: 'BELV KIO ranglétra • ' + interaction.user.id });
    createdRoles.push(rank);
  }
  await guild.roles.fetch();
  const roles = kioRoles(guild), createdChannels = [], resolved = new Map(plan.channels);
  for (const spec of missingChannels) {
    const channel = await guild.channels.create({ name: spec.name, type: ChannelType.GuildText, parent: category.id,
      topic: 'NEXA • BELV KIO alosztály • ' + spec.name,
      permissionOverwrites: channelOverwrites(guild, bot, roles, spec), reason: 'BELV KIO csatorna • ' + interaction.user.id });
    resolved.set(spec.key, channel); createdChannels.push(channel.name);
  }
  const references = [
    ['ranks', 'KIO ranglétra', RANKS.map((rank, index) => `**${index + 1}. ${rank}**`).join('\n') + '\n\nA rangok a BELV alosztályához tartoznak; nem külön frakciót vagy szervert jelentenek.'],
    ['powers', 'KIO hatáskörök', 'A KIO közúti ellenőrzési és közlekedésbiztonsági RP-feladatokat lát el. Minden intézkedésnek a BELV szabályzataival és a szerver RP-szabályaival összhangban kell történnie. A rang önmagában nem ad valós hatósági jogkört.'],
    ['procedure', 'KIO intézkedési rend', '1. Szolgálat megkezdése és azonosítás.\n2. A helyzet felmérése és a szükséges segítség kérése.\n3. Tárgyilagos, arányos és szabályos RP-intézkedés.\n4. Az érintettek és bizonyítékok rögzítése.\n5. Jelentés beküldése a NexaBot űrlapján.\n6. Vezetői jóváhagyás; a bot nem szab ki automatikus büntetést.']
  ];
  for (const [key, title, text] of references) {
    const channel = resolved.get(key), footer = 'NexaBot • BELV KIO referencia • ' + key;
    const messages = await channel.messages.fetch({ limit: 50 });
    const previous = messages.find((message) => message.author.id === interaction.client.user.id && message.embeds[0]?.footer?.text === footer);
    const message = embed(title, text).setFooter({ text: footer });
    if (previous) await previous.edit({ embeds: [message] }); else await channel.send({ embeds: [message] });
  }
  const allTypes = await configureForms(guild, resolved), byKey = new Map(allTypes.map((type) => [type.key, type]));
  for (const form of FORMS) await publish(resolved.get(form.channel), interaction.client.user.id, byKey.get(form.key), guild);
  await recordAudit('belv_kio_provision', { guildId: guild.id, actorId: interaction.user.id, metadata: { createdRoles, createdChannels } }).catch(() => {});
  return { createdRoles, createdChannels, reusedChannels: CHANNELS.filter((item) => plan.channels.get(item.key)).map((item) => plan.channels.get(item.key).name), panels: FORMS.map((form) => resolved.get(form.channel).name), category: category.name };
}
async function handleCommand(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const install = interaction.options.getSubcommand() === 'telepites', result = await provision(interaction, install);
    if (!install) return interaction.editReply(`✅ BELV KIO ellenőrzése kész.\nHiányzó KIO-rangok: ${result.missingRanks.length ? result.missingRanks.join(', ') : 'nincs'}\nHiányzó csatornák: ${result.missingChannels.length ? result.missingChannels.join(', ') : 'nincs'}\nMeglévő csatornák: ${result.reusedChannels.join(', ') || 'nincs'}\nEllenőrzés volt, semmit nem módosítottam.`);
    return interaction.editReply(`✅ A KIO a BELV alosztályaként települt.\nKategória: ${result.category}\nLétrehozott rangok: ${result.createdRoles.join(', ') || 'nincs új rang'}\nLétrehozott csatornák: ${result.createdChannels.join(', ') || 'nincs új csatorna'}\nŰrlappanelek: ${result.panels.join(', ')}\nMeglévő csatornák jogosultságait nem módosítottam.`);
  } catch (error) {
    await recordError(error, { command: 'belv_kio', guildId: interaction.guildId, userId: interaction.user.id }).catch(() => {});
    return interaction.editReply('❌ ' + (error.message || 'A KIO telepítése nem sikerült.'));
  }
}
module.exports = { BELV_GUILD_ID, CATEGORY, RANKS, CHANNELS, FORMS, buildCommand, handleCommand, isKioMember, isKioLeader, canSubmit, canApprove };
