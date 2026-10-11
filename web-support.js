const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { SUPPORT_GUILD_ID } = require('./constants');
const { dbQuery } = require('./config');
const { safeChannelName, baseEmbed } = require('./utils');

const SUPPORT_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const SUPPORT_STATUSES = new Set(['open', 'pending', 'closed']);

function supportControls(ticketId, status = 'open') {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`websupport_claim:${ticketId}`).setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`websupport_pending:${ticketId}`).setLabel('Pending').setEmoji('⏸️').setStyle(ButtonStyle.Secondary).setDisabled(status === 'pending' || status === 'closed')
  );
  if (status === 'closed') {
    row.addComponents(new ButtonBuilder().setCustomId(`websupport_reopen:${ticketId}`).setLabel('Reopen').setEmoji('🔓').setStyle(ButtonStyle.Success));
  } else {
    row.addComponents(new ButtonBuilder().setCustomId(`websupport_close:${ticketId}`).setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger));
  }
  return row;
}

function normalizePriority(value) {
  return SUPPORT_PRIORITIES.has(value) ? value : 'normal';
}

async function listWebTickets(userId) {
  const result = await dbQuery(
    'SELECT * FROM nexabot_web_support_tickets WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50',
    [userId]
  );
  return result?.rows || [];
}

async function getWebTicket(ticketId, userId, owner = false) {
  const result = await dbQuery(
    `SELECT * FROM nexabot_web_support_tickets WHERE id = $1${owner ? '' : ' AND user_id = $2'} LIMIT 1`,
    owner ? [ticketId] : [ticketId, userId]
  );
  const ticket = result?.rows?.[0] || null;
  if (!ticket) return null;
  const messages = await dbQuery(
    `SELECT * FROM nexabot_web_support_messages WHERE ticket_id = $1${owner ? '' : ' AND internal=FALSE'} ORDER BY created_at ASC LIMIT 500`,
    [ticketId]
  );
  return { ticket, messages: messages?.rows || [] };
}

async function listAllWebTickets({ status = '', priority = '', search = '' } = {}) {
  const values = [];
  const where = [];
  if (SUPPORT_STATUSES.has(status)) { values.push(status); where.push(`status=$${values.length}`); }
  if (SUPPORT_PRIORITIES.has(priority)) { values.push(priority); where.push(`priority=$${values.length}`); }
  if (search) { values.push(`%${String(search).slice(0, 100)}%`); where.push(`(subject ILIKE $${values.length} OR username ILIKE $${values.length} OR CAST(id AS TEXT) ILIKE $${values.length})`); }
  const result = await dbQuery(`SELECT * FROM nexabot_web_support_tickets${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, updated_at DESC LIMIT 250`, values);
  return result?.rows || [];
}

async function ensureSupportDestination(guild) {
  await guild.channels.fetch().catch(() => null);
  await guild.roles.fetch().catch(() => null);
  let parent = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && /TICKETS|TICKETEK/i.test(channel.name));
  let supportRole = guild.roles.cache.find((role) => !role.managed && /support|ügyf[eé]l|staff/i.test(role.name));
  if (!supportRole) supportRole = await guild.roles.create({ name: 'NEXA Support Team', permissions: [], reason: 'NEXA 20.1.1 Support Center öngyógyítás' });
  if (!parent) parent = await guild.channels.create({ name: '━━━ 04 • TICKETS ━━━', type: ChannelType.GuildCategory, reason: 'NEXA 20.1.1 Support Center öngyógyítás' });
  return { parent, supportRole };
}

async function createWebTicket(client, user, { subject, category, content, priority = 'normal' }) {
  const guild = client.guilds.cache.get(SUPPORT_GUILD_ID);
  if (!guild) throw new Error('A hivatalos NEXA Support szerver jelenleg nem elérhető.');
  const { parent, supportRole } = await ensureSupportDestination(guild);
  priority = normalizePriority(priority);
  const inserted = await dbQuery(
    `INSERT INTO nexabot_web_support_tickets (user_id, username, subject, category, priority)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [user.id, user.username, subject, category, priority]
  );
  const ticket = inserted.rows[0];
  try {
    const channel = await guild.channels.create({
      name: `web-${ticket.id}-${safeChannelName(user.username)}`,
      type: ChannelType.GuildText,
      parent: parent.id,
      topic: `nexabot-web-support|${ticket.id}|${user.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: supportRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] }
      ],
      reason: `NEXA web support #${ticket.id}`
    });
    await dbQuery('UPDATE nexabot_web_support_tickets SET channel_id=$1, updated_at=NOW() WHERE id=$2', [channel.id, ticket.id]);
    await dbQuery(
      `INSERT INTO nexabot_web_support_messages (ticket_id, author_id, author_name, source, content)
       VALUES ($1,$2,$3,'web',$4)`,
      [ticket.id, user.id, user.username, content]
    );
    await channel.send({
      content: `<@&${supportRole.id}>`,
      embeds: [baseEmbed(`🌐 Web Support #${ticket.id} • ${subject}`, `**User:** ${user.username} (${user.id})\n**Category:** ${category}\n**Priority:** ${priority.toUpperCase()}\n\n${content}`)],
      components: [supportControls(ticket.id, 'open')]
    });
    return { ...ticket, channel_id: channel.id };
  } catch (error) {
    await dbQuery('DELETE FROM nexabot_web_support_tickets WHERE id=$1', [ticket.id]).catch(() => null);
    throw error;
  }
}

async function addWebReply(client, ticket, user, content) {
  await dbQuery(
    `INSERT INTO nexabot_web_support_messages (ticket_id, author_id, author_name, source, content)
     VALUES ($1,$2,$3,'web',$4)`,
    [ticket.id, user.id, user.username, content]
  );
  await dbQuery('UPDATE nexabot_web_support_tickets SET updated_at=NOW() WHERE id=$1', [ticket.id]);
  const channel = client.channels.cache.get(ticket.channel_id);
  if (channel?.isTextBased()) await channel.send({ embeds: [baseEmbed(`🌐 Webes válasz • #${ticket.id}`, `**${user.username}:**\n${content}`)] });
}

async function manageWebTicket(client, ticketId, actor, action, value = '') {
  const data = await getWebTicket(ticketId, actor.id, true);
  if (!data) throw new Error('The ticket was not found.');
  const ticket = data.ticket;
  let eventText = '';
  if (action === 'claim') {
    await dbQuery('UPDATE nexabot_web_support_tickets SET assigned_to=$1, assigned_name=$2, updated_at=NOW() WHERE id=$3', [actor.id, actor.globalName || actor.username, ticketId]);
    eventText = `${actor.globalName || actor.username} claimed this ticket.`;
  } else if (action === 'unclaim') {
    await dbQuery('UPDATE nexabot_web_support_tickets SET assigned_to=NULL, assigned_name=NULL, updated_at=NOW() WHERE id=$1', [ticketId]);
    eventText = `${actor.globalName || actor.username} removed the assignee.`;
  } else if (action === 'priority') {
    const priority = normalizePriority(value);
    await dbQuery('UPDATE nexabot_web_support_tickets SET priority=$1, updated_at=NOW() WHERE id=$2', [priority, ticketId]);
    eventText = `Priority changed to ${priority.toUpperCase()} by ${actor.globalName || actor.username}.`;
  } else if (action === 'status' && SUPPORT_STATUSES.has(value)) {
    await dbQuery("UPDATE nexabot_web_support_tickets SET status=$1, closed_at=CASE WHEN $1='closed' THEN NOW() ELSE NULL END, updated_at=NOW() WHERE id=$2", [value, ticketId]);
    eventText = `Ticket status changed to ${value.toUpperCase()} by ${actor.globalName || actor.username}.`;
  } else {
    throw new Error('Unknown support operation.');
  }

  await dbQuery(
    `INSERT INTO nexabot_web_support_messages (ticket_id, author_id, author_name, source, content)
     VALUES ($1,$2,$3,'system',$4)`,
    [ticketId, actor.id, 'NEXA Support', eventText]
  ).catch(() => null);
  await dbQuery(
    `INSERT INTO nexabot_web_notifications (user_id, type, title, body, link)
     VALUES ($1,'support',$2,$3,$4)`,
    [ticket.user_id, `Support update • #${ticketId}`, eventText.slice(0, 300), `/support/${ticketId}`]
  ).catch(() => null);

  const channel = client.channels.cache.get(ticket.channel_id);
  const updated = (await getWebTicket(ticketId, actor.id, true))?.ticket || ticket;
  if (channel?.isTextBased()) {
    const prefix = updated.status === 'closed' ? 'closed-web' : updated.status === 'pending' ? 'pending-web' : 'web';
    const desiredName = `${prefix}-${ticketId}-${safeChannelName(ticket.username || 'user')}`.slice(0, 100);
    if (channel.name !== desiredName) await channel.setName(desiredName, `NEXA Support #${ticketId} status sync`).catch(() => null);
    await channel.send({
      embeds: [baseEmbed(`Support #${ticketId} updated`, eventText)],
      components: [supportControls(ticketId, updated.status)]
    }).catch(() => null);
  }
  return updated;
}

async function handleDiscordSupportInteraction(interaction) {
  const match = String(interaction.customId || '').match(/^websupport_(claim|pending|close|reopen):(\d+)$/);
  if (!match) return false;
  if (!interaction.guild || interaction.guildId !== SUPPORT_GUILD_ID) {
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'This support control can only be used on the official NEXA Support server.', flags: MessageFlags.Ephemeral });
    return true;
  }
  const permissions = interaction.memberPermissions;
  if (!permissions?.has(PermissionFlagsBits.ManageMessages) && !permissions?.has(PermissionFlagsBits.Administrator)) {
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Only NEXA Support staff can manage web tickets.', flags: MessageFlags.Ephemeral });
    return true;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const ticketId = match[2];
  const operation = match[1];
  const map = {
    claim: ['claim', ''],
    pending: ['status', 'pending'],
    close: ['status', 'closed'],
    reopen: ['status', 'open']
  };
  try {
    const [action, value] = map[operation];
    const updated = await manageWebTicket(interaction.client, ticketId, interaction.user, action, value);
    await interaction.message.edit({ components: [supportControls(ticketId, updated.status)] }).catch(() => null);
    await interaction.editReply(`✅ Ticket #${ticketId}: ${operation === 'claim' ? 'claimed' : `status is now ${updated.status}`}. The web dashboard will update automatically.`);
  } catch (error) {
    await interaction.editReply(`❌ ${error.message}`);
  }
  return true;
}

async function addInternalNote(ticketId, actor, content) {
  await dbQuery(`INSERT INTO nexabot_web_support_messages (ticket_id, author_id, author_name, source, content, internal) VALUES ($1,$2,$3,'owner',$4,TRUE)`, [ticketId, actor.id, actor.username, content]);
  await dbQuery('UPDATE nexabot_web_support_tickets SET updated_at=NOW() WHERE id=$1', [ticketId]);
}

async function rateWebTicket(ticketId, userId, rating, comment = '') {
  const score = Math.max(1, Math.min(5, Number(rating) || 0));
  const result = await dbQuery("UPDATE nexabot_web_support_tickets SET rating=$1, rating_comment=$2, updated_at=NOW() WHERE id=$3 AND user_id=$4 AND status='closed' RETURNING id", [score, String(comment).slice(0, 1000), ticketId, userId]);
  if (!result?.rowCount) throw new Error('Csak lezárt saját ticket értékelhető.');
}

async function listNotifications(userId) {
  const result = await dbQuery('SELECT * FROM nexabot_web_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [userId]);
  return result?.rows || [];
}

async function markNotificationsRead(userId) {
  await dbQuery('UPDATE nexabot_web_notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL', [userId]);
}

async function captureDiscordSupportReply(message) {
  if (!message.guild || message.guild.id !== SUPPORT_GUILD_ID || message.author.bot) return;
  const match = String(message.channel.topic || '').match(/^nexabot-web-support\|(\d+)\|(\d{16,22})$/);
  if (!match || !message.content?.trim()) return;
  await dbQuery(
    `INSERT INTO nexabot_web_support_messages (ticket_id, author_id, author_name, source, content)
     VALUES ($1,$2,$3,'discord',$4)`,
    [match[1], message.author.id, message.author.username, message.content.trim().slice(0, 4000)]
  );
  await dbQuery('UPDATE nexabot_web_support_tickets SET updated_at=NOW() WHERE id=$1', [match[1]]);
  await dbQuery(`INSERT INTO nexabot_web_notifications (user_id, type, title, body, link) VALUES ($1,'support',$2,$3,$4)`, [match[2], `New Support reply • #${match[1]}`, message.content.trim().slice(0, 300), `/support/${match[1]}`]);
}

module.exports = { listWebTickets, listAllWebTickets, getWebTicket, createWebTicket, addWebReply, manageWebTicket, handleDiscordSupportInteraction, supportControls, addInternalNote, rateWebTicket, listNotifications, markNotificationsRead, captureDiscordSupportReply, normalizePriority };
