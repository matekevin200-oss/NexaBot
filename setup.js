const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { NAMES, COLORS } = require('./constants');
const { byName } = require('./utils');
const { ticketPanel, applicationPanel, staffPanel } = require('./panels');

async function ensureRole(guild, name, options = {}) {
  const existing = byName(guild.roles.cache, name);
  if (existing) return existing;
  return guild.roles.create({
    name,
    color: options.color,
    permissions: options.permissions || [],
    hoist: options.hoist || false,
    mentionable: false,
    reason: 'NexaBot automatikus telepítés'
  });
}

async function ensureCategory(guild, name, permissionOverwrites) {
  const existing = guild.channels.cache.find(
    (channel) => channel.name === name && channel.type === ChannelType.GuildCategory
  );
  if (existing) return existing;
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: 'NexaBot automatikus telepítés'
  });
}

async function ensureTextChannel(guild, name, parent) {
  const existing = guild.channels.cache.find(
    (channel) => channel.name === name && channel.type === ChannelType.GuildText
  );
  if (existing) return existing;
  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parent.id,
    reason: 'NexaBot automatikus telepítés'
  });
}

async function clearOldPanels(channel, botId) {
  const messages = await channel.messages.fetch({ limit: 30 }).catch(() => null);
  if (!messages) return;
  const ownMessages = messages.filter((message) => message.author.id === botId);
  if (ownMessages.size) await channel.bulkDelete(ownMessages, true).catch(() => null);
}

async function setupServer(guild, botUser) {
  const staffRole = await ensureRole(guild, NAMES.staffRole, {
    color: COLORS.primary,
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ModerateMembers
    ]
  });
  await ensureRole(guild, NAMES.memberRole, { color: COLORS.neutral });
  await ensureRole(guild, NAMES.acceptedRole, { color: COLORS.success });

  const publicPermissions = [
    { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel] }
  ];
  const privatePermissions = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: staffRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    }
  ];

  const infoCategory = await ensureCategory(guild, NAMES.infoCategory, publicPermissions);
  await ensureCategory(guild, NAMES.ticketCategory, privatePermissions);
  const staffCategory = await ensureCategory(guild, NAMES.staffCategory, privatePermissions);

  const welcome = await ensureTextChannel(guild, NAMES.welcomeChannel, infoCategory);
  const service = await ensureTextChannel(guild, NAMES.serviceChannel, infoCategory);
  const application = await ensureTextChannel(guild, NAMES.applicationChannel, infoCategory);
  const staffPanelChannel = await ensureTextChannel(guild, NAMES.staffPanelChannel, staffCategory);
  await ensureTextChannel(guild, NAMES.logsChannel, staffCategory);
  await ensureTextChannel(guild, NAMES.warningsChannel, staffCategory);
  await ensureTextChannel(guild, NAMES.applicationReviewChannel, staffCategory);

  await Promise.all([
    clearOldPanels(service, botUser.id),
    clearOldPanels(application, botUser.id),
    clearOldPanels(staffPanelChannel, botUser.id)
  ]);

  await service.send(ticketPanel());
  await application.send(applicationPanel());
  await staffPanelChannel.send(staffPanel());

  return {
    roles: [NAMES.staffRole, NAMES.memberRole, NAMES.acceptedRole],
    channels: [
      welcome.name,
      service.name,
      application.name,
      staffPanelChannel.name,
      NAMES.logsChannel,
      NAMES.warningsChannel,
      NAMES.applicationReviewChannel
    ]
  };
}

module.exports = { setupServer };
