const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { COLORS } = require('./constants');
const { dbQuery, getGuildConfig, isBviGuild, isPersistentStore, moduleEnabled } = require('./config');
const { ephemeralError } = require('./utils');
const { recordAudit } = require('./telemetry');

const EPHEMERAL = MessageFlags.Ephemeral;
const QUESTIONS_PER_PAGE = 5;

function templatesForGuild(guildId) {
  return getGuildConfig(guildId).applications?.templates || [];
}

function findApplicationTemplate(guildId, key) {
  return templatesForGuild(guildId).find((template) => template.key === key) || null;
}

function templateVersion(template) {
  const source = JSON.stringify({
    key: template.key,
    title: template.title,
    description: template.description,
    questions: template.questions
  });
  return crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
}

function calculateIntegrityPulse(answers, questions = []) {
  const clean = answers.map((answer) => String(answer || '').trim());
  const required = questions.map((question, index) => ({ question, answer: clean[index] || '' }))
    .filter((item) => item.question?.required !== false);
  const completed = required.length ? required.filter((item) => item.answer.length >= 3).length / required.length : 1;
  const averageLength = clean.length ? clean.reduce((sum, answer) => sum + answer.length, 0) / clean.length : 0;
  const detail = Math.min(1, averageLength / 140);
  const normalized = clean.filter(Boolean).map((answer) => answer.toLocaleLowerCase('hu-HU').replace(/\s+/g, ' '));
  const uniqueness = normalized.length ? new Set(normalized).size / normalized.length : 0;
  const score = Math.round((completed * 45) + (detail * 35) + (uniqueness * 20));
  const flags = [];
  if (completed < 1) flags.push('Hiányos kötelező válasz');
  if (averageLength < 45) flags.push('Szokatlanul rövid válaszok');
  if (uniqueness < 0.75) flags.push('Ismétlődő válaszminta');
  return { score: Math.max(0, Math.min(100, score)), flags };
}

function applicationPanel(template) {
  const version = templateVersion(template);
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`${template.emoji || '📋'} ${template.title}`)
    .setDescription(template.description || 'Nyomd meg a gombot a jelentkezés megkezdéséhez.')
    .addFields(
      { name: 'Kérdések', value: `${template.questions.length} db`, inline: true },
      { name: 'Folyamat', value: `${Math.ceil(template.questions.length / QUESTIONS_PER_PAGE)} lépés`, inline: true },
      { name: 'Adatvédelem', value: template.blindReview ? 'Vak bírálat aktív' : 'Normál bírálat', inline: true }
    )
    .setFooter({ text: `NexaBot • TGF Forge • ${template.key} • ${version}` });
  const button = new ButtonBuilder()
    .setCustomId(`tgf_start:${template.key}`)
    .setLabel('Jelentkezés indítása')
    .setEmoji('📝')
    .setStyle(ButtonStyle.Primary);
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] };
}

async function installApplicationPanel(guild, template, botUser) {
  const channel = guild.channels.cache.get(template.openChannelId);
  if (!channel?.isTextBased?.() || channel.isThread?.()) throw new Error('A jelentkezési panel csatornája nem található vagy nem írható.');
  const marker = `NexaBot • TGF Forge • ${template.key}`;
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = messages?.find((message) => message.author.id === botUser.id && message.embeds[0]?.footer?.text?.startsWith(marker));
  if (existing) await existing.edit(applicationPanel(template));
  else await channel.send(applicationPanel(template));
  return channel;
}

function applicationModal(template, page) {
  const start = page * QUESTIONS_PER_PAGE;
  const questions = template.questions.slice(start, start + QUESTIONS_PER_PAGE);
  const totalPages = Math.ceil(template.questions.length / QUESTIONS_PER_PAGE);
  const modal = new ModalBuilder()
    .setCustomId(`tgf_submit:${template.key}:${page}`)
    .setTitle(`${template.title} • ${page + 1}/${totalPages}`.slice(0, 45));
  for (const [offset, question] of questions.entries()) {
    const index = start + offset;
    const input = new TextInputBuilder()
      .setCustomId(`tgf_q_${index}`)
      .setLabel(`${index + 1}. válasz`)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(question.required !== false)
      .setMaxLength(Math.min(1000, Math.max(50, Number(question.maxLength) || 1000)));
    input.setPlaceholder('A teljes kérdést a megnyitás előtti oldalon látod.');
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

function questionPrompt(template,page){
  const start=page*QUESTIONS_PER_PAGE,questions=template.questions.slice(start,start+QUESTIONS_PER_PAGE),totalPages=Math.ceil(template.questions.length/QUESTIONS_PER_PAGE);
  const embed=new EmbedBuilder().setColor(COLORS.primary).setTitle(`${template.emoji||'📋'} ${template.title} · ${page+1}/${totalPages}`).setDescription('A válaszűrlap megnyitása előtt itt olvashatod el a kérdések teljes szövegét.');
  embed.addFields(questions.map((question,offset)=>({name:`${start+offset+1}. kérdés${question.required===false?' · opcionális':''}`,value:String(question.label||'').slice(0,1000)||'—'})));
  return embed;
}

function beginRow(templateKey,page,userId,continuing=false){return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${continuing?'tgf_continue':'tgf_begin'}:${templateKey}:${page}:${userId}`).setLabel(continuing?`Folytatás • ${page+1}. rész`:'Válaszok megadása').setEmoji(continuing?'➡️':'📝').setStyle(ButtonStyle.Primary));}

function continuationRow(templateKey, page, userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tgf_continue:${templateKey}:${page}:${userId}`)
      .setLabel(`Folytatás • ${page + 1}. rész`)
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Primary)
  );
}

function decisionRow(applicationId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tgf_accept:${applicationId}`).setLabel('Elfogadás').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`tgf_reject:${applicationId}`).setLabel('Elutasítás').setEmoji('❌').setStyle(ButtonStyle.Danger)
  );
}

function reviewModal(action, applicationId) {
  const accepted = action === 'accept';
  const modal = new ModalBuilder()
    .setCustomId(`tgf_review_submit:${action}:${applicationId}`)
    .setTitle(accepted ? 'Jelentkezés elfogadása' : 'Jelentkezés elutasítása');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('tgf_review_score')
        .setLabel('Bírálati pontszám (1–10)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2)
        .setPlaceholder('Például: 8')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('tgf_review_reason')
        .setLabel(accepted ? 'Megjegyzés' : 'Elutasítás indoka')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(!accepted)
        .setMaxLength(1000)
        .setPlaceholder(accepted ? 'Opcionális vezetői megjegyzés' : 'Írd le röviden az elutasítás okát')
    )
  );
  return modal;
}

function hasRoleOrAdmin(member, roleId) {
  return Boolean(
    member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    (roleId && member?.roles?.cache?.has(roleId))
  );
}

function reviewTemplate(guildId, snapshot) {
  return snapshot;
}

function canReview(member, template) {
  return [template.reviewerRoleId, ...(template.reviewerRoleIds || [])].some((id) => hasRoleOrAdmin(member, id));
}

function reviewEmbeds(application, guild, revealIdentity = false) {
  const template = application.template_snapshot || application.templateSnapshot;
  const answers = application.answers || [];
  const status = String(application.status || 'pending');
  const statusText = status === 'accepted' ? '✅ Elfogadva' : status === 'rejected' ? '❌ Elutasítva' : '⏳ Elbírálásra vár';
  const applicant = revealIdentity || !template.blindReview
    ? `<@${application.applicant_id || application.applicantId}> (${application.applicant_id || application.applicantId})`
    : '🔒 Rejtve a döntésig';
  const summary = new EmbedBuilder()
    .setColor(status === 'accepted' ? COLORS.success : status === 'rejected' ? COLORS.danger : COLORS.warning)
    .setTitle(`${template.emoji || '📋'} ${template.title} • #${application.id}`)
    .setDescription(`**Állapot:** ${statusText}\n**Jelentkező:** ${applicant}`)
    .addFields(
      { name: 'TGF-időkapszula', value: `\`${application.template_version || application.templateVersion}\``, inline: true },
      { name: 'NEXA Integrity Pulse', value: `${application.integrity_score ?? application.integrityScore ?? 0}/100`, inline: true },
      { name: 'Automatikus jelzések', value: (application.integrity_flags || application.integrityFlags || []).join(', ') || 'Nincs jelzés' }
    )
    .setFooter({ text: `NexaBot TGF Forge • ${guild.name}` })
    .setTimestamp(application.created_at ? new Date(application.created_at) : new Date());
  if (status !== 'pending') {
    summary.addFields(
      { name: 'Bíráló', value: `<@${application.reviewer_id || application.reviewerId}>`, inline: true },
      { name: 'Pontszám', value: `${application.review_score || application.reviewScore || '—'}/10`, inline: true },
      { name: 'Indoklás', value: String(application.review_reason || application.reviewReason || 'Nincs külön megjegyzés').slice(0, 1000) }
    );
  }
  const answerEmbeds = [];
  for (let start = 0; start < template.questions.length; start += 5) {
    const embed = new EmbedBuilder().setColor(COLORS.neutral).setTitle(`Válaszok • ${start + 1}–${Math.min(start + 5, template.questions.length)}`);
    embed.addFields(template.questions.slice(start, start + 5).map((question, offset) => ({
      name: `${start + offset + 1}. ${question.label}`.slice(0, 100),
      value: String(answers[start + offset] || '—').slice(0, 180)
    })));
    answerEmbeds.push(embed);
  }
  return [summary, ...answerEmbeds];
}

function fullAnswersAttachment(application) {
  const template = application.template_snapshot || application.templateSnapshot;
  const answers = application.answers || [];
  const lines = [
    `NEXA TGF Forge #${application.id}`,
    `Sablon: ${template.title}`,
    `Verzió: ${application.template_version || application.templateVersion}`,
    '',
    ...template.questions.flatMap((question, index) => [
      `${index + 1}. ${question.label}`,
      String(answers[index] || '—'),
      ''
    ])
  ];
  return new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'), { name: `nexa-tgf-${application.id}.txt` });
}

async function loadDraft(guildId, templateKey, userId) {
  const result = await dbQuery(
    `SELECT template_snapshot, answers, next_page, expires_at
     FROM nexabot_application_drafts
     WHERE guild_id = $1 AND template_key = $2 AND user_id = $3 AND expires_at > NOW()`,
    [guildId, templateKey, userId]
  );
  return result?.rows?.[0] || null;
}

async function saveDraft(guildId, template, userId, answers, nextPage) {
  await dbQuery(
    `INSERT INTO nexabot_application_drafts
      (guild_id, template_key, user_id, template_snapshot, answers, next_page, updated_at, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, NOW(), NOW() + INTERVAL '2 hours')
     ON CONFLICT (guild_id, template_key, user_id) DO UPDATE SET
      template_snapshot = EXCLUDED.template_snapshot,
      answers = EXCLUDED.answers,
      next_page = EXCLUDED.next_page,
      updated_at = NOW(),
      expires_at = EXCLUDED.expires_at`,
    [guildId, template.key, userId, JSON.stringify(template), JSON.stringify(answers), nextPage]
  );
}

async function handleApplicationButton(interaction) {
  if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) {
    return ephemeralError(interaction, 'Az egyedi TGF-rendszert ezen a szerveren az Owner nem engedélyezte.');
  }
  if (!isPersistentStore()) return ephemeralError(interaction, 'A TGF Forge biztonságos használatához PostgreSQL adatbázis szükséges.');
  const [action, value, pageText, ownerId] = interaction.customId.split(':');
  if (action === 'tgf_start') {
    const template = findApplicationTemplate(interaction.guildId, value);
    if (!template?.active) return ephemeralError(interaction, 'Ez a jelentkezési folyamat jelenleg nem aktív.');
    if (template.accessRoleId && !hasRoleOrAdmin(interaction.member, template.accessRoleId)) {
      return ephemeralError(interaction, 'A jelentkezés megnyitásához nem rendelkezel a szükséges ranggal.');
    }
    if (template.cooldownHours > 0) {
      const recent = await dbQuery(
        `SELECT created_at FROM nexabot_applications
         WHERE guild_id = $1 AND template_key = $2 AND applicant_id = $3
           AND created_at > NOW() - ($4::integer * INTERVAL '1 hour')
         ORDER BY created_at DESC LIMIT 1`,
        [interaction.guildId, template.key, interaction.user.id, template.cooldownHours]
      );
      if (recent?.rowCount) return ephemeralError(interaction, `Ezt a jelentkezést ${template.cooldownHours} óránként egyszer lehet beküldeni.`);
    }
    await dbQuery('DELETE FROM nexabot_application_drafts WHERE guild_id = $1 AND template_key = $2 AND user_id = $3', [interaction.guildId, template.key, interaction.user.id]);
    return interaction.reply({embeds:[questionPrompt(template,0)],components:[beginRow(template.key,0,interaction.user.id)],flags:EPHEMERAL});
  }
  if(action==='tgf_begin'){
    const page=Number.parseInt(pageText,10);if(ownerId!==interaction.user.id||!Number.isInteger(page)||page!==0)return ephemeralError(interaction,'Ezt a jelentkezést csak a saját, megnyitott kérdésoldaladról indíthatod.');
    const template=findApplicationTemplate(interaction.guildId,value);if(!template?.active)return ephemeralError(interaction,'Ez a jelentkezési folyamat már nem aktív.');
    if(template.accessRoleId&&!hasRoleOrAdmin(interaction.member,template.accessRoleId))return ephemeralError(interaction,'A jelentkezés megnyitásához nem rendelkezel a szükséges ranggal.');
    return interaction.showModal(applicationModal(template,page));
  }
  if (action === 'tgf_continue') {
    const page = Number.parseInt(pageText, 10);
    if (ownerId !== interaction.user.id) return ephemeralError(interaction, 'Ezt a jelentkezést csak annak létrehozója folytathatja.');
    const draft = await loadDraft(interaction.guildId, value, interaction.user.id);
    if (!draft || draft.next_page !== page) return ephemeralError(interaction, 'Ez a jelentkezési lépés lejárt vagy már elkészült. Kezdd újra a panelről.');
    return interaction.showModal(applicationModal(draft.template_snapshot, page));
  }
  if (action === 'tgf_accept' || action === 'tgf_reject') {
    const result = await dbQuery('SELECT * FROM nexabot_applications WHERE id = $1 AND guild_id = $2', [value, interaction.guildId]);
    const application = result?.rows?.[0];
    if (!application || application.status !== 'pending') return ephemeralError(interaction, 'Ez a jelentkezés már el lett bírálva vagy nem található.');
    if (!canReview(interaction.member, reviewTemplate(interaction.guildId, application.template_snapshot))) {
      return ephemeralError(interaction, 'Csak a kijelölt bírálói rang vagy egy adminisztrátor dönthet.');
    }
    return interaction.showModal(reviewModal(action === 'tgf_accept' ? 'accept' : 'reject', application.id));
  }
  return false;
}

async function handleApplicationModal(interaction) {
  if (!isPersistentStore()) return ephemeralError(interaction, 'A TGF Forge biztonságos használatához PostgreSQL adatbázis szükséges.');
  const parts = interaction.customId.split(':');
  if (parts[0] === 'tgf_submit') {
    await interaction.deferReply({ flags: EPHEMERAL });
    const templateKey = parts[1];
    const page = Number.parseInt(parts[2], 10);
    let template;
    let answers = [];
    if (page === 0) {
      template = findApplicationTemplate(interaction.guildId, templateKey);
      if (!template?.active) return interaction.editReply('❌ Ez a jelentkezési folyamat már nem aktív.');
    } else {
      const draft = await loadDraft(interaction.guildId, templateKey, interaction.user.id);
      if (!draft || draft.next_page !== page) return interaction.editReply('❌ Ez a jelentkezési lépés lejárt. Kezdd újra a panelről.');
      template = draft.template_snapshot;
      answers = Array.isArray(draft.answers) ? [...draft.answers] : [];
    }
    const start = page * QUESTIONS_PER_PAGE;
    for (let index = start; index < Math.min(start + QUESTIONS_PER_PAGE, template.questions.length); index += 1) {
      answers[index] = interaction.fields.getTextInputValue(`tgf_q_${index}`).trim();
    }
    const nextPage = page + 1;
    const totalPages = Math.ceil(template.questions.length / QUESTIONS_PER_PAGE);
    if (nextPage < totalPages) {
      await saveDraft(interaction.guildId, template, interaction.user.id, answers, nextPage);
      return interaction.editReply({
        content: `✅ A(z) **${page + 1}/${totalPages}**. részt titkosítva elmentettem.`,
        embeds:[questionPrompt(template,nextPage)],
        components: [beginRow(template.key, nextPage, interaction.user.id,true)]
      });
    }
    const integrity = calculateIntegrityPulse(answers, template.questions);
    const inserted = await dbQuery(
      `INSERT INTO nexabot_applications
        (guild_id, template_key, template_version, template_snapshot, applicant_id, answers, integrity_score, integrity_flags)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7, $8::jsonb)
       RETURNING *`,
      [interaction.guildId, template.key, templateVersion(template), JSON.stringify(template), interaction.user.id, JSON.stringify(answers), integrity.score, JSON.stringify(integrity.flags)]
    );
    const application = inserted.rows[0];
    const reviewChannel = interaction.guild.channels.cache.get(template.reviewChannelId);
    if (!reviewChannel?.isTextBased?.()) {
      await dbQuery('DELETE FROM nexabot_applications WHERE id = $1', [application.id]);
      return interaction.editReply('❌ A bírálati csatorna már nem elérhető. Értesítsd a vezetőséget.');
    }
    const content = template.notificationRoleId ? `<@&${template.notificationRoleId}> új TGF érkezett.` : 'Új TGF érkezett.';
    const reviewMessage = await reviewChannel.send({
      content,
      embeds: reviewEmbeds(application, interaction.guild, false),
      components: [decisionRow(application.id)],
      files: [fullAnswersAttachment(application)],
      allowedMentions: { roles: template.notificationRoleId ? [template.notificationRoleId] : [] }
    });
    await dbQuery(
      `UPDATE nexabot_applications SET review_message_id = $1, review_channel_id = $2 WHERE id = $3`,
      [reviewMessage.id, reviewChannel.id, application.id]
    );
    await dbQuery('DELETE FROM nexabot_application_drafts WHERE guild_id = $1 AND template_key = $2 AND user_id = $3', [interaction.guildId, template.key, interaction.user.id]);
    await recordAudit('tgf_submit', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: String(application.id), metadata: { template: template.key, version: application.template_version } });
    return interaction.editReply(`✅ A jelentkezésed megérkezett. Azonosító: **TGF-${application.id}**`);
  }

  if (parts[0] === 'tgf_review_submit') {
    await interaction.deferReply({ flags: EPHEMERAL });
    const action = parts[1];
    const applicationId = parts[2];
    const current = await dbQuery('SELECT * FROM nexabot_applications WHERE id = $1 AND guild_id = $2', [applicationId, interaction.guildId]);
    const application = current?.rows?.[0];
    if (!application || application.status !== 'pending') return interaction.editReply('❌ Ez a jelentkezés már el lett bírálva vagy nem található.');
    if (!canReview(interaction.member, reviewTemplate(interaction.guildId, application.template_snapshot))) return interaction.editReply('❌ Nincs bírálói jogosultságod.');
    const score = Number.parseInt(interaction.fields.getTextInputValue('tgf_review_score'), 10);
    const reason = interaction.fields.getTextInputValue('tgf_review_reason').trim();
    if (!Number.isInteger(score) || score < 1 || score > 10) return interaction.editReply('❌ A bírálati pontszám 1 és 10 közötti egész szám legyen.');
    if (action === 'reject' && reason.length < 3) return interaction.editReply('❌ Elutasításkor az indoklás kötelező.');
    const status = action === 'accept' ? 'accepted' : 'rejected';
    const decided = await dbQuery(
      `UPDATE nexabot_applications SET status = $1, reviewer_id = $2, review_score = $3,
        review_reason = $4, decided_at = NOW()
       WHERE id = $5 AND guild_id = $6 AND status = 'pending' RETURNING *`,
      [status, interaction.user.id, score, reason || null, applicationId, interaction.guildId]
    );
    if (!decided?.rowCount) return interaction.editReply('❌ Közben egy másik bíráló már döntött erről a jelentkezésről.');
    const finalApplication = decided.rows[0];
    const template = reviewTemplate(interaction.guildId, finalApplication.template_snapshot);
    const member = await interaction.guild.members.fetch(finalApplication.applicant_id).catch(() => null);
    if (status === 'accepted' && member && template.acceptedRoleId) {
      await member.roles.add(template.acceptedRoleId, `NexaBot TGF #${applicationId} elfogadva`).catch(() => null);
    }
    const resultText = status === 'accepted' ? 'elfogadták' : 'elutasították';
    await member?.send(`📋 A **${interaction.guild.name}** szerveren a(z) **${template.title}** jelentkezésedet ${resultText}.\n**Bírálati pont:** ${score}/10${reason ? `\n**Indoklás:** ${reason}` : ''}`).catch(() => null);
    const resultChannel = interaction.guild.channels.cache.get(template.resultChannelId);
    if (resultChannel?.isTextBased?.()) {
      await resultChannel.send({
        content: `<@${finalApplication.applicant_id}>`,
        embeds: [new EmbedBuilder()
          .setColor(status === 'accepted' ? COLORS.success : COLORS.danger)
          .setTitle(`${status === 'accepted' ? '✅' : '❌'} ${template.title} • eredmény`)
          .setDescription(`<@${finalApplication.applicant_id}> jelentkezését **${resultText}**.\n**Pont:** ${score}/10${reason ? `\n**Indoklás:** ${reason}` : ''}`)
          .setFooter({ text: `TGF-${applicationId} • ${finalApplication.template_version}` })],
        allowedMentions: { users: [finalApplication.applicant_id] }
      }).catch(() => null);
    }
    await interaction.message.edit({ embeds: reviewEmbeds(finalApplication, interaction.guild, true), components: [] });
    await recordAudit(`tgf_${status}`, { actorId: interaction.user.id, guildId: interaction.guildId, targetId: String(applicationId), metadata: { score } });
    return interaction.editReply(`✅ A jelentkezést ${resultText}. A vak bírálat feloldva, a jelentkező értesítést kapott.`);
  }
  return false;
}

async function applicationStats(guildId) {
  const result = await dbQuery(
    `SELECT COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::integer AS pending,
      COUNT(*) FILTER (WHERE status = 'accepted')::integer AS accepted,
      COUNT(*) FILTER (WHERE status = 'rejected')::integer AS rejected,
      COALESCE(ROUND(AVG(integrity_score)), 0)::integer AS average_integrity
     FROM nexabot_applications WHERE guild_id = $1`,
    [guildId]
  ).catch(() => null);
  return result?.rows?.[0] || { total: 0, pending: 0, accepted: 0, rejected: 0, average_integrity: 0 };
}

module.exports = {
  QUESTIONS_PER_PAGE,
  templatesForGuild,
  findApplicationTemplate,
  templateVersion,
  calculateIntegrityPulse,
  applicationPanel,
  applicationModal,
  questionPrompt,
  beginRow,
  installApplicationPanel,
  handleApplicationButton,
  handleApplicationModal,
  applicationStats
};
