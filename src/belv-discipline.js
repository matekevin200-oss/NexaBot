'use strict';

const { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig, isBotOwner, isPersistentStore, dbQuery } = require('./config');
const { recordAudit, recordError } = require('./telemetry');
const { normalizeName, customDocumentTypes, documentPanel } = require('./documents');
const { isConfiguredRoleHolder } = require('./belv-roster-rules');

const BELV_GUILD_ID = '1517509643734221030';
const CATEGORY = '⚖️┃BELV • FEGYELMI ÉS JOGI OSZTÁLY';
const LEADERSHIP_ROLE = 'BELVÉDELMI VEZETŐSÉG';
const CHANNELS = Object.freeze([
  { key: 'statute', name: '📕┃belv-btk', public: true },
  { key: 'penalties', name: '⚖️┃büntetési-tételek', public: true },
  { key: 'rules', name: '📜┃fegyelmi-szabályzat', public: true },
  { key: 'intake', name: '📩┃fegyelmi-bejelentések', public: true },
  { key: 'open', name: '🔎┃folyamatban-lévő-eljárások', aliases: ['fegyelmi-eljárások'] },
  { key: 'review', name: '🧑‍⚖️┃vezetőségi-elbírálás', aliases: ['ügyiratok'] },
  { key: 'decisions', name: '📋┃fegyelmi-határozatok', aliases: ['határozatok'] },
  { key: 'appeals', name: '📨┃fegyelmi-felülvizsgálatok' },
  { key: 'archive', name: '🗄️┃lezárt-fegyelmi-ügyek', aliases: ['archívum'] },
  { key: 'internal', name: 'belső-vizsgálatok', optional: true },
  { key: 'reports', name: 'vizsgálati-jelentések', optional: true },
  { key: 'minutes', name: 'jegyzőkönyv', optional: true }
]);
const FORM_TYPES = Object.freeze([
  { key: 'custom_belv_bej', title: 'Fegyelmi bejelentés', emoji: '📩', channel: 'intake', pingTarget: true, fields: [
    { label: 'Bejelentett személy neve és szolgálati azonosítója', placeholder: 'Név és azonosító' },
    { label: 'Érintett frakciója', placeholder: 'BELV, FBI, CIA, TEK, NAV, BV, ARFK, BBO vagy KR' },
    { label: 'Szabályszegés részletes leírása', placeholder: 'Mi történt és milyen szolgálati szabály sérülhetett?', style: 'paragraph' },
    { label: 'Esemény időpontja és helyszíne', placeholder: 'Dátum, időpont és pontos RP-helyszín' },
    { label: 'Bizonyítékok', placeholder: 'Videó, kép, üzenetlink, tanú vagy egyéb bizonyíték', required: false, style: 'paragraph' }
  ] },
  { key: 'custom_belv_viz', title: 'Vizsgálati jelentés', emoji: '🔎', channel: 'reports', fields: [
    { label: 'Ügyszám', placeholder: 'RP-ÉÉÉÉHHNN-ÓÓPP' },
    { label: 'Vizsgáló és érintett', placeholder: 'Név, rang, jelvényszám' },
    { label: 'Vizsgálati lépések', placeholder: 'Elvégzett lépések', style: 'paragraph' },
    { label: 'Megállapítások és bizonyítékok', placeholder: 'Tények, hivatkozások', style: 'paragraph' },
    { label: 'Javaslat', placeholder: 'További intézkedés vagy lezárás', style: 'paragraph' }
  ] },
  { key: 'custom_belv_hat', title: 'Fegyelmi határozat', emoji: '⚖️', channel: 'decisions', pingTarget: true, fields: [
    { label: 'Ügyszám', placeholder: 'RP-ÉÉÉÉHHNN-ÓÓPP' },
    { label: 'Elbírált tényállás', placeholder: 'Rövid összefoglaló', style: 'paragraph' },
    { label: 'Hivatkozott szabály', placeholder: 'Pontos fejezet és pont' },
    { label: 'Döntés vagy javaslat', placeholder: 'Indoklással', style: 'paragraph' },
    { label: 'Felülvizsgálat határideje', placeholder: 'ÉÉÉÉ.HH.NN.' }
  ] },
  { key: 'custom_belv_fel', title: 'Fegyelmi felülvizsgálati kérelem', emoji: '🔁', channel: 'appeals', fields: [
    { label: 'Ügyazonosító', placeholder: 'Az eredeti fegyelmi ügy RP-azonosítója' },
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
  ] },
  { key: 'custom_belv_jegyz', title: 'Meghallgatási jegyzőkönyv', emoji: '🗣️', channel: 'minutes', pingTarget: true, fields: [
    { label: 'Ügyszám', placeholder: 'Az eredeti fegyelmi ügy száma' },
    { label: 'Meghallgatott személy', placeholder: 'Név, frakció, szolgálati azonosító' },
    { label: 'Nyilatkozat', placeholder: 'A személy saját beszámolója', style: 'paragraph' },
    { label: 'Bizonyítékok és tanúk', placeholder: 'Hivatkozások, tanúk', required: false, style: 'paragraph' },
    { label: 'További nyilatkozat', placeholder: 'Enyhítő körülmények, észrevételek', required: false, style: 'paragraph' }
  ] }
]);

const STATUTE_NOTICE = 'A feltöltött specifikáció csak a 3–18. § címét és büntetési tartományát tartalmazza. Az 1–2. és 19–25. § teljes szövege nincs mellékelve; ez a közlés ezért nem teljes BTK.';
const PENALTY_TEXT = [
  'I. Szóbeli figyelmeztetés',
  'II. Írásbeli figyelmeztetés',
  'III. Hivatalos megrovás',
  'IV. 1–7 nap szolgálati felfüggesztés',
  'V. Lefokozás vagy vezetői felmentés',
  'VI. Állományból eltávolítás',
  '',
  '3. § Indokolatlan villogóhasználat: II–IV.',
  '4. § Villogóval visszaélés: III–V.',
  '5. § Indokolatlan igazoltatás: II–III.',
  '6. § Jogellenes előállítás: III–V.',
  '7. § Hatáskörrel visszaélés: III–VI.',
  '8. § Szolgálati járművel visszaélés: II–IV.',
  '9. § Jogszerű utasítás megtagadása: II–IV.',
  '10. § Szolgálati mulasztás: I–V.',
  '11. § Bizalmas információ kiadása: IV–VI.',
  '12. § Bizonyítékhamisítás: V–VI.',
  '13. § Hamis jelentés: III–VI.',
  '14. § Indokolatlan erőalkalmazás: IV–VI.',
  '15. § Korrupció: V–VI.',
  '16. § Vezetői visszaélés: IV–VI.',
  '17. § Intézkedés akadályozása: III–V.',
  '18. § Ismételt súlyos szabályszegés: V–VI.'
].join(String.fromCharCode(10));
async function upsertReference(channel, botId, key, title, description) {
  const footer = 'NexaBot • BELV referencia • ' + key;
  const embed = new EmbedBuilder().setColor(0x9d2638).setTitle(title).setDescription(description).setFooter({ text: footer });
  const messages = await channel.messages.fetch({ limit: 50 });
  const existing = messages.find((message) => message.author.id === botId && message.embeds[0]?.footer?.text === footer);
  if (existing) await existing.edit({ embeds: [embed] });
  else await channel.send({ embeds: [embed] });
}
async function publishReferences(channels, botId) {
  const rules = [
    'Ügyút: bejelentés → előzetes ellenőrzés → vizsgálat → meghallgatás → jelentés → vezetőségi döntés → határozat → legfeljebb 72 órán belüli felülvizsgálati kérelem → lezárás.',
    'Állapotok: BEJELENTVE, ELŐZETES ELLENŐRZÉS, VIZSGÁLAT ALATT, MEGHALLGATÁSRA VÁR, JELENTÉS ELKÉSZÜLT, VEZETŐSÉGI ELBÍRÁLÁS, HATÁROZAT KIADVA, FELÜLVIZSGÁLAT ALATT, LEZÁRVA vagy MEGSZÜNTETVE.',
    'A NEXA nem alkalmaz automatikus büntetést. A döntést jogosult vezetőnek kell jóváhagynia. Más frakció tagjánál közvetlen szankció helyett alapértelmezés szerint javaslat készül.',
    STATUTE_NOTICE
  ].join(String.fromCharCode(10) + String.fromCharCode(10));
  await upsertReference(channels.get('statute'), botId, 'belv-btk', 'BELV-BTK/2026 • A rendelkezésre álló szövegrész', STATUTE_NOTICE + String.fromCharCode(10) + String.fromCharCode(10) + PENALTY_TEXT);
  await upsertReference(channels.get('penalties'), botId, 'buntetesi-tetelek', 'Fegyelmi fokozatok és tételek', PENALTY_TEXT + String.fromCharCode(10) + String.fromCharCode(10) + 'A megadott büntetési sáv nem automatikus döntés; az ügy körülményeit ember bírálja el.');
  await upsertReference(channels.get('rules'), botId, 'eljarasi-rend', 'BELV fegyelmi ügykezelés • eljárási kivonat', rules);
}
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
    if (spec.public && channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.SendMessages))
      errors.push('#' + channel.name + ': a nyilvános BELV-csatornának olvashatónak, de nem írhatónak kell lennie. Meglévő jogosultságot nem változtatok.');
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
  if (customTypes.length + FORM_TYPES.length > 25) throw new Error('A BELV űrlapok nem férnek el a NEXA 25 egyedi irattípusos korlátjában. Meglévő iratot nem töröltem.');
  const nextTypes = FORM_TYPES.map((type) => ({
    ...type, approval: true, caseNumber: true, pingTarget: Boolean(type.pingTarget), active: true,
    channelId: (channels.get(type.channel === 'intake' ? 'review' : type.channel)?.id || channels.get('open')?.id),
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
async function ensureSchema() {
  if (!isPersistentStore()) throw new Error('A BELV ügyek tartós tárolásához működő PostgreSQL-adatbázis szükséges.');
  const sql = [
    'CREATE TABLE IF NOT EXISTS nexabot_belv_cases (',
    'id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, case_number TEXT NOT NULL, form_key TEXT NOT NULL,',
    'interaction_id TEXT NOT NULL, submitter_id TEXT NOT NULL, subject_user_id TEXT, linked_case_number TEXT, answers JSONB NOT NULL DEFAULT \'{}\'::jsonb,',
    'status TEXT NOT NULL DEFAULT \'pending_review\', review_channel_id TEXT, review_message_id TEXT, decision_by TEXT, decision_at TIMESTAMPTZ,',
    'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
    'UNIQUE(guild_id, case_number), UNIQUE(guild_id, interaction_id));',
    'ALTER TABLE nexabot_belv_cases ADD COLUMN IF NOT EXISTS linked_case_number TEXT;',
    'CREATE TABLE IF NOT EXISTS nexabot_belv_case_audit (',
    'id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, case_number TEXT NOT NULL, actor_id TEXT NOT NULL,',
    'action TEXT NOT NULL, details JSONB NOT NULL DEFAULT \'{}\'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());',
    'INSERT INTO nexabot_schema_migrations(version,name) VALUES(26,\'belv_discipline_cases\') ON CONFLICT(version) DO NOTHING'
  ].join(String.fromCharCode(10));
  await dbQuery(sql);
}
async function saveSubmission(interaction, type, caseNumber, targetUserId) {
  if (!String(type?.key || '').startsWith('custom_belv_')) return true;
  const answers = Object.fromEntries(type.fields.map((field) => [field.label, interaction.fields.getTextInputValue(field.id).trim()]));
  const linkedCaseNumber = String(answers['Ügyszám'] || answers['Ügyazonosító'] || '').trim();
  if (linkedCaseNumber && !/^RP-[0-9]{8}-[0-9]{4}(?:-[0-9]{1,22})?$/.test(linkedCaseNumber)) throw new Error('Az ügyazonosító formátuma nem megfelelő.');
  if (linkedCaseNumber) {
    const parent = await dbQuery(
      'SELECT case_number FROM nexabot_belv_cases WHERE guild_id=$1 AND (case_number=$2 OR linked_case_number=$2) AND status NOT IN (\'rejected\',\'closed\') LIMIT 1',
      [interaction.guildId, linkedCaseNumber]
    );
    if (!parent?.rowCount) throw new Error('A megadott kapcsolódó fegyelmi ügy nem található vagy már nem aktív.');
  }
  if (type.key === 'custom_belv_hat') {
    const report = await dbQuery(
      "SELECT case_number FROM nexabot_belv_cases WHERE guild_id=$1 AND linked_case_number=$2 AND form_key='custom_belv_viz' AND status='approved' LIMIT 1",
      [interaction.guildId, linkedCaseNumber]
    );
    if (!report?.rowCount) throw new Error('Vezetőségi döntéshez előbb egy vizsgálati jelentés jóváhagyása szükséges.');
  }
  if (type.key === 'custom_belv_lez') {
    const decision = await dbQuery(
      "SELECT case_number FROM nexabot_belv_cases WHERE guild_id=$1 AND linked_case_number=$2 AND form_key='custom_belv_hat' AND status='approved' LIMIT 1",
      [interaction.guildId, linkedCaseNumber]
    );
    const appeal = await dbQuery(
      "SELECT case_number FROM nexabot_belv_cases WHERE guild_id=$1 AND linked_case_number=$2 AND form_key='custom_belv_felulviz' AND status IN ('pending_review','decision_processing') LIMIT 1",
      [interaction.guildId, linkedCaseNumber]
    );
    if (!decision?.rowCount) throw new Error('Az ügy nem zárható le jóváhagyott határozat nélkül.');
    if (appeal?.rowCount) throw new Error('Az ügy nem zárható le, amíg felülvizsgálati kérelem van elbírálás alatt.');
  }
  if (type.key === 'custom_belv_felulviz') {
    const decision = await dbQuery(
      "SELECT case_number FROM nexabot_belv_cases WHERE guild_id=$1 AND (case_number=$2 OR linked_case_number=$2) AND form_key='custom_belv_hat' AND status='approved' AND decision_at >= NOW()-INTERVAL '72 hours' ORDER BY decision_at DESC LIMIT 1",
      [interaction.guildId, linkedCaseNumber]
    );
    if (!decision?.rowCount) throw new Error('A megadott ügynek nincs jóváhagyott határozata, vagy a 72 órás felülvizsgálati határidő lejárt.');
  }
  const inserted = await dbQuery(
    "INSERT INTO nexabot_belv_cases(guild_id,case_number,form_key,interaction_id,submitter_id,subject_user_id,linked_case_number,answers,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'pending_review') ON CONFLICT(guild_id,interaction_id) DO NOTHING RETURNING case_number",
    [interaction.guildId, caseNumber, type.key, interaction.id, interaction.user.id, targetUserId, linkedCaseNumber || null, JSON.stringify(answers)]
  );
  if (!inserted?.rowCount) throw new Error('Ezt az űrlapot már rögzítette a rendszer, nem küldtem be kétszer.');
  await dbQuery(
    'INSERT INTO nexabot_belv_case_audit(guild_id,case_number,actor_id,action,details) VALUES($1,$2,$3,$4,$5::jsonb)',
    [interaction.guildId, caseNumber, interaction.user.id, 'submitted', JSON.stringify({ formKey: type.key, linkedCaseNumber: linkedCaseNumber || null })]
  );
  return true;
}
async function attachReviewMessage(guildId, caseNumber, channelId, messageId) {
  await dbQuery('UPDATE nexabot_belv_cases SET review_channel_id=$3,review_message_id=$4,updated_at=NOW() WHERE guild_id=$1 AND case_number=$2', [guildId, caseNumber, channelId, messageId]);
}
async function claimCaseDecision(guildId, caseNumber, actorId) {
  if (!caseNumber || !String(caseNumber).startsWith('RP-')) return true;
  const result = await dbQuery(
    'UPDATE nexabot_belv_cases SET status=\'decision_processing\',decision_by=$3,updated_at=NOW() WHERE guild_id=$1 AND case_number=$2 AND status=\'pending_review\' RETURNING id',
    [guildId, caseNumber, actorId]
  );
  if (!result?.rowCount) return false;
  await dbQuery(
    'INSERT INTO nexabot_belv_case_audit(guild_id,case_number,actor_id,action,details) VALUES($1,$2,$3,$4,$5::jsonb)',
    [guildId, caseNumber, actorId, 'decision_started', '{}']
  );
  return true;
}
async function setCaseStatus(guildId, caseNumber, actorId, status, details = {}) {
  if (!caseNumber || !String(caseNumber).startsWith('RP-')) return false;
  const updated = await dbQuery(
    'UPDATE nexabot_belv_cases SET status=$3,decision_by=$4,decision_at=NOW(),updated_at=NOW() WHERE guild_id=$1 AND case_number=$2 AND status=\'decision_processing\' RETURNING id',
    [guildId, caseNumber, status, actorId]
  );
  if (!updated?.rowCount) return false;
  await dbQuery(
    'INSERT INTO nexabot_belv_case_audit(guild_id,case_number,actor_id,action,details) VALUES($1,$2,$3,$4,$5::jsonb)',
    [guildId, caseNumber, actorId, status, JSON.stringify(details)]
  );
  return true;
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
  const missing = CHANNELS.filter((s) => !s.optional && !plan.channels.get(s.key));
  if (!install) return { created: [], reused: CHANNELS.filter((s) => plan.channels.get(s.key)).map((s) => plan.channels.get(s.key).name), missing: missing.map((s) => s.name), categoryMissing: !plan.category };

  await ensureSchema();
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
  await publishReferences(resolved, me.id);
  const types = await configureForms(guild, resolved);
  const byKey = new Map(types.map((type) => [type.key, type]));
  const panels = [];
  for (const form of FORM_TYPES) {
    const channel = resolved.get(form.channel) || resolved.get('internal') || resolved.get('open');
    await publishPanel(channel, me.id, byKey.get(form.key), guild);
    panels.push(channel.name);
  }
  await recordAudit('belv_discipline_provision', {
    guildId: guild.id, actorId: interaction.user.id,
    metadata: { created, reused: [...resolved.values()].filter((c) => c && !created.includes(c.name)).map((c) => c.name), panels }
  }).catch(() => {});
  return { created, reused: [...resolved.values()].filter((c) => c && !created.includes(c.name)).map((c) => c.name), panels, category: category.name };
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
module.exports = { buildCommand, handleCommand, BELV_GUILD_ID, CHANNELS, FORM_TYPES, saveSubmission, attachReviewMessage, claimCaseDecision, setCaseStatus };
