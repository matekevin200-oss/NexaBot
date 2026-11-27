const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { NAMES, COLORS, BELV_GUILD_ID } = require('./constants');
const { getOwnerSettings } = require('./config');
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

  const panelCleanup = [clearOldPanels(service, botUser.id), clearOldPanels(staffPanelChannel, botUser.id)];
  if (guild.id === BELV_GUILD_ID) panelCleanup.push(clearOldPanels(application, botUser.id));
  await Promise.all(panelCleanup);

  await service.send(ticketPanel());
  if (guild.id === BELV_GUILD_ID) await application.send(applicationPanel());
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

async function syncApplicationPanel(guild, botUser) {
  if (guild.id !== BELV_GUILD_ID) throw new Error('A BELV jelentkezési panel kizárólag a kijelölt BELV-szerveren telepíthető.');
  const preferred = byName(guild.channels.cache, NAMES.applicationChannel);
  const candidates = [...guild.channels.cache.values()].filter((channel) =>
    channel?.isTextBased?.() && !channel.isThread?.() &&
    (channel.id === preferred?.id || /belv|jelentkez|tgf|application/i.test(channel.name))
  );
  const payload = applicationPanel();
  const footer = payload.embeds[0]?.toJSON?.().footer?.text || '';
  let channel = null;
  let existing = null;
  for (const candidate of candidates) {
    const messages = await candidate.messages.fetch({ limit: 50 }).catch(() => null);
    const match = messages?.find((message) => {
      if (message.author.id !== botUser.id) return false;
      const embed = message.embeds[0];
      const text = `${embed?.title || ''}\n${embed?.description || ''}\n${embed?.footer?.text || ''}`.toLocaleLowerCase('hu-HU');
      return message.components?.some((component) => component.components?.some((button) => button.customId === 'application_open')) ||
        String(embed?.footer?.text || '').startsWith('NexaBot • BELV írásbeli') ||
        text.includes('belvédelmi igazgatóság tgf');
    });
    if (match) { channel = candidate; existing = match; break; }
  }
  channel ||= preferred || candidates.find((candidate) => /belv|tgf|jelentkez/i.test(candidate.name));
  if (!channel?.isTextBased?.()) throw new Error('A BELV TGF csatornája nem található vagy nem írható.');
  const needsUpdate = Boolean(existing && String(existing.embeds[0]?.footer?.text || '') !== footer);
  if (needsUpdate) await existing.edit(payload);
  else if (!existing) await channel.send(payload);
  return { channelId: channel.id, updated: needsUpdate, created: !existing };
}

async function retireBelvApplicationPanels(guild, botUser) {
  let removed = 0;
  for (const channel of [...guild.channels.cache.values()].filter((item) =>
    item?.isTextBased?.() && !item.isThread?.() && /belv|jelentkez|tgf|application/i.test(item.name)
  )) {
    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    for (const message of messages?.values?.() || []) {
      if (message.author.id !== botUser.id) continue;
      const embed = message.embeds[0];
      const text = `${embed?.title || ''}\n${embed?.description || ''}\n${embed?.footer?.text || ''}`.toLocaleLowerCase('hu-HU');
      const isBelvTgf = text.includes('belvédelmi igazgatóság') && text.includes('tgf') ||
        String(embed?.footer?.text || '').startsWith('NexaBot • BELV írásbeli');
      if (!isBelvTgf) continue;
      try { await message.delete(); removed += 1; }
      catch (error) { console.warn(`Másik szerveren lévő BELV TGF-panel törlése sikertelen (${guild.id}/${channel.id}):`, error.message); }
    }
  }
  return removed;
}

async function syncRpApplicationPanels(client) {
  const summary = { updated: 0, created: 0, unchanged: 0, removedElsewhere: 0, missing: 0, failed: 0 };
  for (const guildId of getOwnerSettings().rpGuilds) {
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) { summary.missing += 1; continue; }
    if (guildId === BELV_GUILD_ID) {
      try {
        const result = await syncApplicationPanel(guild, client.user);
        if (result.updated) summary.updated += 1;
        else if (result.created) summary.created += 1;
        else summary.unchanged += 1;
      } catch (error) {
        summary.failed += 1;
        console.warn(`BELV TGF-panel frissítése sikertelen (${guildId}):`, error.message);
      }
      continue;
    }
    try { summary.removedElsewhere += await retireBelvApplicationPanels(guild, client.user); }
    catch (error) { summary.failed += 1; console.warn(`BELV TGF-panel eltávolítása sikertelen (${guildId}):`, error.message); }
  }
  return summary;
}

module.exports = { setupServer, syncApplicationPanel, syncRpApplicationPanels };
