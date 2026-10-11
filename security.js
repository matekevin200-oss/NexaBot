const {
  ActionRowBuilder,
  AuditLogEvent,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const { NAMES, COLORS } = require('./constants');
const { baseEmbed, byName, ephemeralError } = require('./utils');
const { getGuildConfig, moduleEnabled, configuredChannel, configuredRole, isBviGuild, planAllows, isSupportModerationPaused } = require('./config');
const { recordAudit, recordError } = require('./telemetry');

const EPHEMERAL = MessageFlags.Ephemeral;
const RAID_WINDOW_MS = 30_000;
const RAID_JOIN_LIMIT = 8;
const FRESH_ACCOUNT_MS = 3 * 24 * 60 * 60 * 1000;
const SPAM_WINDOW_MS = 5_000;
const SPAM_MESSAGE_LIMIT = 6;
const STRIKE_RESET_MS = 30 * 60 * 1000;

const PROFILES = Object.freeze({
  strict: Object.freeze({ spamLimit: 4, spamWindowMs: 5_000, raidLimit: 5, freshRaidLimit: 3, raidWindowMs: 30_000, freshAccountMs: 7 * 24 * 60 * 60 * 1000, label: 'Szigorú' }),
  medium: Object.freeze({ spamLimit: 6, spamWindowMs: 5_000, raidLimit: 8, freshRaidLimit: 5, raidWindowMs: 30_000, freshAccountMs: 3 * 24 * 60 * 60 * 1000, label: 'Közepes' }),
  relaxed: Object.freeze({ spamLimit: 10, spamWindowMs: 10_000, raidLimit: 15, freshRaidLimit: 8, raidWindowMs: 45_000, freshAccountMs: 24 * 60 * 60 * 1000, label: 'Enyhe' })
});

function protectionProfile(guildId) {
  return PROFILES[getGuildConfig(guildId).protection.sensitivity] || PROFILES.medium;
}

function assessRaid(records, profile) {
  const unique = new Map(records.map((record) => [record.userId, record]));
  const candidates = [...unique.values()];
  const freshCount = candidates.filter((record) => record.fresh).length;
  const defaultAvatarCount = candidates.filter((record) => record.defaultAvatar).length;
  const volumeTriggered = candidates.length >= profile.raidLimit;
  const freshTriggered = freshCount >= profile.freshRaidLimit;
  return {
    triggered: volumeTriggered || freshTriggered,
    reason: freshTriggered && !volumeTriggered ? 'fresh_accounts' : 'join_burst',
    total: candidates.length,
    freshCount,
    defaultAvatarCount,
    records: candidates
  };
}

const LOCK_PERMISSIONS = Object.freeze({
  SendMessages: PermissionFlagsBits.SendMessages,
  AddReactions: PermissionFlagsBits.AddReactions,
  CreatePublicThreads: PermissionFlagsBits.CreatePublicThreads,
  CreatePrivateThreads: PermissionFlagsBits.CreatePrivateThreads,
  SendMessagesInThreads: PermissionFlagsBits.SendMessagesInThreads,
  Connect: PermissionFlagsBits.Connect
});

const joinWindows = new Map();
const spamWindows = new Map();
const spamCooldowns = new Map();
const memberStrikes = new Map();
const activeRaids = new Map();
const nukeWindows = new Map();
const guildSecurityQueues = new Map();
const processedAuditEntries = new Map();

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function isLeadership(member) {
  const dashboardRoleId = member?.guild?.id ? getGuildConfig(member.guild.id).roles.dashboard : null;
  const elevatedRole = isBviGuild(member?.guild?.id)
    ? member?.roles?.cache?.some((role) => normalizeName(role.name) === normalizeName(NAMES.leadershipRole))
    : dashboardRoleId && member?.roles?.cache?.has(dashboardRoleId);
  return Boolean(
    member?.id === member?.guild?.ownerId ||
    member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    elevatedRole
  );
}

function isLinkExempt(member) {
  const staffRoleId = member?.guild?.id ? getGuildConfig(member.guild.id).roles.staff : null;
  return Boolean(
    isLeadership(member) ||
    (staffRoleId && member?.roles?.cache?.has(staffRoleId)) ||
    member?.roles?.cache?.some((role) => {
      const name = normalizeName(role.name);
      return role.name === NAMES.staffRole || role.name === NAMES.leadershipRole || name === 'staff' || name === 'nexadevstaff';
    })
  );
}

function isProtectedMember(member) {
  const config = member?.guild?.id ? getGuildConfig(member.guild.id).protection : null;
  return isLinkExempt(member) || member?.id === member?.guild?.ownerId ||
    config?.whitelistUsers?.includes(member?.id) ||
    member?.roles?.cache?.some((role) => config?.whitelistRoles?.includes(role.id));
}

function isSecurityTrusted(member) {
  const config = member?.guild?.id ? getGuildConfig(member.guild.id).protection : null;
  if (member?.user?.bot) {
    return Boolean(
      member.id === member.client?.user?.id ||
      config?.trustedBots?.includes(member.id)
    );
  }
  return Boolean(
    isLeadership(member) ||
    member?.id === member?.guild?.ownerId ||
    config?.trustedBots?.includes(member?.id) ||
    config?.whitelistUsers?.includes(member?.id) ||
    member?.roles?.cache?.some((role) => config?.whitelistRoles?.includes(role.id))
  );
}

function containsBlockedLink(content) {
  return /(?:https?:\/\/|www\.|discord(?:app)?\.com\/invite\/|discord\.gg\/)/i.test(content || '');
}

function messageSecurityText(message) {
  const parts = [message?.content];
  for (const embed of message?.embeds || []) {
    parts.push(
      embed.title,
      embed.description,
      embed.url,
      embed.author?.name,
      embed.author?.url,
      embed.footer?.text,
      embed.image?.url,
      embed.thumbnail?.url
    );
    for (const field of embed.fields || []) parts.push(field.name, field.value);
  }
  for (const attachment of message?.attachments?.values?.() || []) {
    parts.push(attachment.name, attachment.description, attachment.url, attachment.proxyURL);
  }
  const visitComponent = (component) => {
    parts.push(component?.label, component?.placeholder, component?.url, component?.description);
    for (const option of component?.options || []) parts.push(option.label, option.description, option.value);
    for (const child of component?.components || []) visitComponent(child);
  };
  for (const component of message?.components || []) visitComponent(component);
  return parts.filter(Boolean).join('\n').slice(0, 50_000);
}

function detectMessageBomb(content, profileName = 'medium') {
  const text = String(content || '');
  const limits = profileName === 'strict'
    ? { repeatedLines: 4, repeatedGlyphs: 24, headings: 8 }
    : profileName === 'relaxed'
      ? { repeatedLines: 8, repeatedGlyphs: 70, headings: 18 }
      : { repeatedLines: 6, repeatedGlyphs: 40, headings: 12 };
  const lines = text.split(/\r?\n/)
    .map((line) => line.replace(/^[\s#>*_`~|-]+|[\s#>*_`~|-]+$/g, '').trim().toLowerCase())
    .filter((line) => line.length >= 2);
  const lineCounts = new Map();
  for (const line of lines) lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
  if ([...lineCounts.values()].some((count) => count >= limits.repeatedLines)) return 'Ismételt soros szövegáradat';
  if ((text.match(/^\s*#/gm) || []).length >= limits.headings) return 'Markdown szövegáradat';

  const glyphs = Array.from(text.replace(/[\s\p{L}\p{N}\p{P}\p{Emoji_Presentation}]/gu, ''));
  const glyphCounts = new Map();
  for (const glyph of glyphs) glyphCounts.set(glyph, (glyphCounts.get(glyph) || 0) + 1);
  if ([...glyphCounts.values()].some((count) => count >= limits.repeatedGlyphs)) return 'Ismételt Unicode-karakteráradat';
  return null;
}

function interactionActorUser(message) {
  return message?.interactionMetadata?.user ||
    message?.interactionMetadata?.triggeringInteractionMetadata?.user ||
    message?.interaction?.user ||
    null;
}

async function resolveMessageActor(message) {
  if (!message?.author?.bot && message?.member) return message.member;
  const actor = interactionActorUser(message);
  if (!actor?.id) return null;
  return message.guild.members.fetch(actor.id).catch(() => null);
}

function trustedAutomatedMessage(message, protection) {
  if (!message?.author?.bot && !message?.webhookId) return false;
  if (message.author?.id === message.client?.user?.id) return true;
  if (protection?.trustedBots?.includes(message.author?.id)) return true;
  return Boolean(message.member?.user?.bot && isSecurityTrusted(message.member));
}

async function removeUnauthorizedWebhook(message, protection) {
  if (isSupportModerationPaused(message.guild.id)) return null;
  if (!message?.webhookId || !protection?.webhookGuard) return null;
  const webhooks = await message.guild.fetchWebhooks().catch(() => null);
  const webhook = webhooks?.get(message.webhookId);
  if (!webhook?.delete) return 'A külső alkalmazás nem szerver-webhookként működik; az üzenet törölve lett.';
  if (webhook.owner?.id === message.client?.user?.id || protection.trustedBots?.includes(webhook.owner?.id)) {
    return 'A webhook megbízható tulajdonoshoz tartozik; csak az üzenet lett törölve.';
  }
  if (isSupportModerationPaused(message.guild.id)) return null;
  const deleted = await webhook.delete('NEXA Shield: jogosulatlan alkalmazás- vagy meghívóüzenet').then(() => true).catch(() => false);
  return deleted
    ? 'A jogosulatlan webhookot is automatikusan eltávolítottam.'
    : 'A webhook eltávolítása nem sikerült; ellenőrizd a Webhookok kezelése jogosultságot.';
}

async function logAutomatedMessageViolation(message, label, actor, webhookResult) {
  const source = message.webhookId ? `Webhook / felhasználói alkalmazás (${message.webhookId})` : `Nem engedélyezett alkalmazás (${message.author?.id || 'ismeretlen'})`;
  const actorText = actor ? `${actor.user.tag} (${actor.id})` : 'A Discord nem adta át a kezdeményező felhasználót';
  await sendSecurityLog(
    message.guild,
    baseEmbed('🧱 External App/Webhook Shield', `${label}`, COLORS.danger).addFields(
      { name: 'Forrás', value: source },
      { name: 'Kezdeményező', value: actorText },
      { name: 'Művelet', value: `Az üzenet törölve.${webhookResult ? ` ${webhookResult}` : ''}` },
      { name: 'Csatorna', value: `${message.channel}` }
    )
  );
}

function findSecurityChannel(guild) {
  const selected = configuredChannel(guild, 'securityLogs');
  if (selected?.isTextBased?.()) return selected;
  const wanted = normalizeName(NAMES.securityLogsChannel);
  return guild.channels.cache.find(
    (channel) => channel.isTextBased?.() && !channel.isThread?.() && normalizeName(channel.name) === wanted
  ) || guild.channels.cache.find(
    (channel) => channel.isTextBased?.() && !channel.isThread?.() && normalizeName(channel.name).includes('mindenlog')
  ) || byName(guild.channels.cache, NAMES.logsChannel) || guild.systemChannel || null;
}

function leadershipMentions(guild) {
  const role = configuredRole(guild, 'dashboard') || byName(guild.roles.cache, NAMES.leadershipRole);
  const userIds = [...guild.members.cache.values()]
    .filter((member) => member.id === guild.ownerId || member.permissions.has(PermissionFlagsBits.Administrator))
    .slice(0, 20)
    .map((member) => member.id);
  if (!userIds.includes(guild.ownerId)) userIds.unshift(guild.ownerId);
  return {
    content: [...new Set(userIds)].map((id) => `<@${id}>`).join(' ') + (role ? ` <@&${role.id}>` : ''),
    allowedMentions: {
      users: [...new Set(userIds)],
      roles: role ? [role.id] : []
    }
  };
}

async function sendSecurityLog(guild, embed, options = {}) {
  const channel = findSecurityChannel(guild);
  if (!channel?.isTextBased()) return null;
  return channel.send({ embeds: [embed], ...options }).catch(() => null);
}

function permissionState(overwrite, permission) {
  if (!overwrite) return null;
  if (overwrite.allow.has(permission)) return true;
  if (overwrite.deny.has(permission)) return false;
  return null;
}

async function lockGuild(guild, reason, exemptChannelIds = []) {
  const exempt = new Set(exemptChannelIds.filter(Boolean));
  const channels = [...guild.channels.cache.values()].filter(
    (channel) => !channel.isThread?.() && channel.permissionOverwrites?.edit && !exempt.has(channel.id)
  );
  const denied = Object.fromEntries(Object.keys(LOCK_PERMISSIONS).map((name) => [name, false]));
  const states = [];
  const failedChannelIds = [];
  for (let index = 0; index < channels.length; index += 5) {
    if (isSupportModerationPaused(guild.id)) break;
    const chunk = channels.slice(index, index + 5);
    await Promise.all(chunk.map(async (channel) => {
      if (isSupportModerationPaused(guild.id)) return;
      const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      const permissions = {};
      for (const [name, bit] of Object.entries(LOCK_PERMISSIONS)) permissions[name] = permissionState(overwrite, bit);
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, denied, { reason });
        states.push({ channelId: channel.id, permissions });
      } catch {
        failedChannelIds.push(channel.id);
      }
    }));
  }
  if (channels.length && !states.length && !isSupportModerationPaused(guild.id)) throw new Error('A bot egyetlen csatornát sem tudott lezárni. Ellenőrizd a Csatornák kezelése jogosultságot és a bot rangját.');
  return { states, failedChannelIds, total: channels.length };
}

async function restoreGuild(guild, session, reason) {
  const states = Array.isArray(session?.channelStates) ? session.channelStates : [];
  let restored = 0;
  const failedChannelIds = [];
  for (let index = 0; index < states.length; index += 5) {
    const chunk = states.slice(index, index + 5);
    await Promise.all(chunk.map(async ({ channelId, permissions }) => {
      const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
      if (!channel?.permissionOverwrites?.edit) {
        return;
      }
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, permissions, { reason });
        restored += 1;
      } catch {
        failedChannelIds.push(channelId);
      }
    }));
  }
  return { restored, failedChannelIds, total: states.length };
}

function raidDecisionRow(sessionId, protection = { kick: true, ban: true }) {
  const buttons = [];
  if (protection.kick) buttons.push(new ButtonBuilder()
      .setCustomId(`security_raid_kick:${sessionId}`)
      .setLabel('Gyanús tagok kirúgása')
      .setEmoji('🚪')
      .setStyle(ButtonStyle.Danger));
  if (protection.ban) buttons.push(new ButtonBuilder()
      .setCustomId(`security_raid_ban:${sessionId}`)
      .setLabel('Gyanús tagok kitiltása')
      .setEmoji('🔨')
      .setStyle(ButtonStyle.Danger));
  buttons.push(new ButtonBuilder()
      .setCustomId(`security_raid_false:${sessionId}`)
      .setLabel('Téves riasztás • feloldás')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success));
  return new ActionRowBuilder().addComponents(...buttons);
}

function serializableRaidSession(session) {
  return {
    ...session,
    candidateIds: [...session.candidateIds],
    lastSnapshotAt: undefined
  };
}

function snapshotAttachment(session) {
  return {
    attachment: Buffer.from(JSON.stringify(session), 'utf8'),
    name: `nexabot-raid-${session.id}.json`,
    description: 'NexaBot visszaállítási adat'
  };
}

function queueGuildSecurity(guildId, operation) {
  const previous = guildSecurityQueues.get(guildId) || Promise.resolve();
  const next = previous.catch(() => null).then(operation);
  const tracked = next.finally(() => {
    if (guildSecurityQueues.get(guildId) === tracked) guildSecurityQueues.delete(guildId);
  });
  guildSecurityQueues.set(guildId, tracked);
  return tracked;
}

async function beginRaidLockUnsafe(guild, assessment) {
  if (isSupportModerationPaused(guild.id)) return null;
  let existing = activeRaids.get(guild.id);
  if (!existing) {
    const recovered = await findPendingSession(guild, guild.client.user);
    if (recovered?.session) {
      existing = recovered.session;
      existing.messageId = existing.messageId || recovered.message?.id;
      activeRaids.set(guild.id, existing);
    }
  }
  if (isSupportModerationPaused(guild.id)) return existing || null;
  if (existing) {
    for (const record of assessment.records) existing.candidateIds.add(record.userId);
    existing.freshCount = Math.max(Number(existing.freshCount || 0), assessment.freshCount);
    existing.defaultAvatarCount = Math.max(Number(existing.defaultAvatarCount || 0), assessment.defaultAvatarCount);
    existing.eventLabel = existing.eventLabel || assessment.eventLabel || null;
    existing.quarantineResponse = existing.quarantineResponse || assessment.quarantineResponse || null;
    existing.quarantines = Array.isArray(existing.quarantines) ? existing.quarantines : [];
    if (assessment.quarantine && !existing.quarantines.some((item) => item.executorId === assessment.quarantine.executorId)) {
      existing.quarantines.push(assessment.quarantine);
    }
    await refreshRaidSnapshot(guild, existing);
    return existing;
  }
  if (isSupportModerationPaused(guild.id)) return null;
  const logChannel = findSecurityChannel(guild);
  if (!logChannel?.isTextBased()) {
    console.error('Raid gyanú észlelve, de nincs minden-log vagy napló csatorna; a lezárás biztonsági okból elmaradt.');
    return null;
  }

  const config = getGuildConfig(guild.id);
  const profile = protectionProfile(guild.id);
  const session = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    guildId: guild.id,
    detectedAt: Date.now(),
    candidateIds: new Set(assessment.records.map((record) => record.userId)),
    channelStates: [],
    lockedChannelCount: 0,
    failedChannelIds: [],
    triggerReason: assessment.reason,
    eventLabel: assessment.eventLabel || null,
    quarantineResponse: assessment.quarantineResponse || null,
    quarantines: assessment.quarantine ? [assessment.quarantine] : [],
    freshCount: assessment.freshCount,
    defaultAvatarCount: assessment.defaultAvatarCount,
    profile,
    protection: config.protection
  };
  activeRaids.set(guild.id, session);

  try {
    let lockdownError = null;
    if (config.protection.lockdown) {
      try {
        const lockResult = await lockGuild(
          guild,
          `NexaBot: ${profile.label.toLowerCase()} érzékenységű teljes raidvédelem`,
          [logChannel.id]
        );
        session.channelStates = lockResult.states;
        session.lockedChannelCount = lockResult.states.length;
        session.failedChannelIds = lockResult.failedChannelIds;
      } catch (error) {
        lockdownError = error;
        await recordError(error, { command: 'anti_raid_channel_lock', guildId: guild.id });
      }
    }
    const storedSession = serializableRaidSession(session);
    if (isSupportModerationPaused(guild.id)) return session;
    const mentions = leadershipMentions(guild);
    const triggerText = assessment.reason === 'dangerous_action'
      ? `A bot jogosulatlan **${assessment.eventLabel || 'veszélyes szerverműveletet'}** észlelt, ezért azonnal elindította a teljes védelmet.`
      : assessment.reason === 'fresh_accounts'
        ? `A bot **${assessment.freshCount} friss fiók** gyors belépését észlelte.`
        : `A bot **${assessment.total} belépést** észlelt ${profile.raidWindowMs / 1000} másodpercen belül.`;
    const embed = baseEmbed(
      config.protection.lockdown ? '🚨 RAID-RIASZTÁS • A SZERVER LEZÁRVA' : '🚨 RAID-RIASZTÁS',
      `${triggerText}\n\n` +
      (config.protection.lockdown ? 'A szerver a vezetői döntésig lezárva marad. ' : '') +
      'Válassz az alábbi gombok közül. A bot nem büntet senkit automatikusan raid miatt.',
      COLORS.danger
    ).addFields(
      { name: assessment.reason === 'dangerous_action' ? 'Érintett fiókok' : 'Gyanús belépők', value: `${session.candidateIds.size} fő`, inline: true },
      { name: 'Friss fiókok', value: `${assessment.freshCount} fő`, inline: true },
      { name: 'Érzékenység', value: profile.label, inline: true },
      { name: 'Lezárt csatornák', value: lockdownError ? '❌ A Discord megtagadta – ellenőrizd a NEXA rangját és jogosultságait' : `${session.lockedChannelCount} sikeres${session.failedChannelIds.length ? ` • ${session.failedChannelIds.length} sikertelen` : ''}`, inline: true },
      { name: 'Azonnali védelem', value: assessment.quarantineResponse || 'Teljes szerverlezárás és vezetői döntéskérés' },
      { name: 'Dönthet', value: 'Tulajdonos, adminisztrátor vagy kijelölt webes rang' }
    );
    const message = await logChannel.send({
      content: mentions.content,
      allowedMentions: mentions.allowedMentions,
      embeds: [embed],
      components: [raidDecisionRow(session.id, config.protection)],
      files: [snapshotAttachment(storedSession)]
    });
    session.messageId = message.id;
    await recordAudit('security_raid_lock', {
      guildId: guild.id,
      targetId: session.id,
      metadata: { candidates: session.candidateIds.size, fresh: assessment.freshCount, lockedChannels: session.lockedChannelCount, failedChannels: session.failedChannelIds.length }
    });
    return session;
  } catch (error) {
    console.error('A raidlezárás nem sikerült:', error);
    await recordError(error, { command: 'anti_raid_lockdown', guildId: guild.id });
    return session;
  }
}

function beginRaidLock(guild, assessment) {
  return queueGuildSecurity(guild.id, () => beginRaidLockUnsafe(guild, assessment));
}

async function suspendSecurityForGuild(guild) {
  const clearWindows = () => {
    joinWindows.delete(guild.id);
    for (const map of [spamWindows, spamCooldowns, memberStrikes, nukeWindows]) {
      for (const key of map.keys()) if (key.startsWith(`${guild.id}:`)) map.delete(key);
    }
  };
  clearWindows();
  return queueGuildSecurity(guild.id, async () => {
    if (!isSupportModerationPaused(guild.id)) return { restored: 0, failed: 0 };
    const pending = await findPendingSession(guild, guild.client.user);
    if (!pending) return { restored: 0, failed: 0 };
    const reason = 'NEXA Support: a fő owner szüneteltette a moderációt';
    const restored = await restoreGuild(guild, pending.session, reason);
    const quarantine = await restoreQuarantines(guild, pending.session, reason);
    const failed = restored.failedChannelIds.length + quarantine.failed;
    if (!failed) activeRaids.delete(guild.id);
    else activeRaids.set(guild.id, pending.session);
    const message = pending.message || (pending.session.messageId ? await findSecurityChannel(guild)?.messages.fetch(pending.session.messageId).catch(() => null) : null);
    // Keep a failed recovery discoverable after a restart; paused raid buttons are guarded.
    if (message && !failed) await message.edit({ components: [], attachments: [] }).catch(() => null);
    clearWindows();
    return { restored: restored.restored + quarantine.restored, failed };
  });
}

async function readSessionAttachment(message, expectedSessionId = null) {
  const attachment = message?.attachments?.find((item) => item.name?.startsWith('nexabot-raid-'));
  if (!attachment?.url) return null;
  try {
    const response = await fetch(attachment.url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.guildId || !data?.id || !Array.isArray(data.channelStates) || !Array.isArray(data.candidateIds)) return null;
    if (expectedSessionId && data.id !== expectedSessionId) return null;
    return { ...data, candidateIds: new Set(data.candidateIds) };
  } catch {
    return null;
  }
}

async function findPendingSession(guild, clientUser) {
  const current = activeRaids.get(guild.id);
  if (current) return { session: current, message: null };
  const channel = findSecurityChannel(guild);
  const messages = await channel?.messages?.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return null;
  for (const message of messages.values()) {
    if (message.author.id !== clientUser.id || !message.components.length) continue;
    const hasSecurityButton = message.components.some((row) =>
      row.components.some((component) => component.customId?.startsWith('security_raid_'))
    );
    if (!hasSecurityButton) continue;
    const session = await readSessionAttachment(message);
    if (session?.guildId === guild.id) {
      session.messageId = session.messageId || message.id;
      return { session, message };
    }
  }
  return null;
}

async function refreshRaidSnapshot(guild, session) {
  if (!session?.messageId || Date.now() - Number(session.lastSnapshotAt || 0) < 2_000) return;
  session.lastSnapshotAt = Date.now();
  const channel = findSecurityChannel(guild);
  const message = await channel?.messages?.fetch(session.messageId).catch(() => null);
  if (!message) return;
  const fields = (message.embeds[0]?.fields || []).map((field) => {
    if (field.name === 'Gyanús belépők' || field.name === 'Érintett fiókok') return { name: field.name, value: `${session.candidateIds.size} fő`, inline: field.inline };
    if (field.name === 'Friss fiókok') return { name: field.name, value: `${session.freshCount || 0} fő`, inline: field.inline };
    return { name: field.name, value: field.value, inline: field.inline };
  });
  const embeds = message.embeds[0] ? [EmbedBuilder.from(message.embeds[0]).setFields(fields)] : [];
  await message.edit({ embeds, attachments: [], files: [snapshotAttachment(serializableRaidSession(session))] }).catch(() => null);
}

async function notifyTemporary(channel, member, text) {
  const notice = await channel.send({
    content: `${member} ⚠️ ${text}`,
    allowedMentions: { users: [member.id] }
  }).catch(() => null);
  if (notice) setTimeout(() => notice.delete().catch(() => null), 8_000).unref?.();
}

function strikeKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

async function applyViolation(message, label, member = message.member) {
  if (isSupportModerationPaused(message.guild.id)) return;
  if (!member || isProtectedMember(member)) return;
  const key = strikeKey(message.guild.id, member.id);
  const now = Date.now();
  const protection = getGuildConfig(message.guild.id).protection;
  const previous = memberStrikes.get(key);
  const count = !previous || now - previous.lastAt > STRIKE_RESET_MS ? 1 : previous.count + 1;
  memberStrikes.set(key, { count, lastAt: now });

  let action = 'Figyelmeztetés';
  let details = 'A tiltott üzenet törölve.';
  try {
    if (count === 2 && protection.timeout && member.moderatable) {
      await member.timeout(10 * 60_000, `NexaBot automatikus védelem: ${label}`);
      action = '10 perces felfüggesztés';
      details = 'Második szabálysértés 30 percen belül.';
    } else if (count === 3 && protection.kick && member.kickable) {
      await member.send(`🚪 A **${message.guild.name}** szerverről az automatikus védelem kirúgott.\n**Indok:** ${label}`).catch(() => null);
      if (isSupportModerationPaused(message.guild.id)) return;
      await member.kick(`NexaBot automatikus védelem: ${label}`);
      action = 'Kirúgás';
      details = 'Harmadik szabálysértés 30 percen belül.';
    } else if (count >= 4 && protection.ban && member.bannable) {
      await member.send(`🔨 A **${message.guild.name}** szerverről az automatikus védelem kitiltott.\n**Indok:** ${label}`).catch(() => null);
      if (isSupportModerationPaused(message.guild.id)) return;
      await member.ban({ reason: `NexaBot automatikus védelem: ${label}` });
      action = 'Kitiltás';
      details = 'Negyedik szabálysértés 30 percen belül.';
    } else if (protection.warn) {
      await member.send(`⚠️ Figyelmeztetést kaptál a **${message.guild.name}** szerveren.\n**Indok:** ${label}`).catch(() => null);
    }
  } catch (error) {
    action = 'Intézkedés sikertelen';
    details = `A bot rangja vagy jogosultsága nem volt elegendő: ${error.message}`;
  }

  if (message.channel?.isTextBased() && count < 3) {
    await notifyTemporary(message.channel, member, `${label}. Intézkedés: **${action}**.`);
  }
  await sendSecurityLog(
    message.guild,
    baseEmbed('🛡️ Automatikus szervervédelem', `${member.user.tag} (${member.id})`, COLORS.warning).addFields(
      { name: 'Esemény', value: label, inline: true },
      { name: 'Intézkedés', value: action, inline: true },
      { name: 'Fokozat', value: `${count}/4`, inline: true },
      { name: 'Részletek', value: details },
      { name: 'Csatorna', value: `${message.channel}` }
    )
  );
}

async function handleProtectedMessage(message) {
  if (!message.guild) return;
  if (!moduleEnabled(message.guild.id, 'protection')) return;
  const config = getGuildConfig(message.guild.id);
  const profile = protectionProfile(message.guild.id);
  if (config.protection.whitelistChannels.includes(message.channelId)) return;
  if (trustedAutomatedMessage(message, config.protection)) return;
  const actorMember = await resolveMessageActor(message);
  if (isSupportModerationPaused(message.guild.id)) return;
  if (actorMember && isProtectedMember(actorMember)) return;
  if (!actorMember && !message.author.bot && !message.webhookId) return;
  const text = messageSecurityText(message);
  const invite = /discord(?:app)?\.com\/invite\/|discord\.gg\//i.test(text);
  const link = /(?:https?:\/\/|www\.)/i.test(text);
  const scam = config.protection.scamLinks && /(?:free\s*nitro|steamcommunity[^\s]*\.ru|discorcl|dlscord|airdrop|claim\s*(?:gift|nitro)|gift\s*inventory)/i.test(text);
  const mentionLimit = profile === PROFILES.strict ? 5 : profile === PROFILES.relaxed ? 12 : 8;
  const massMention = config.protection.massMention && (message.mentions.users.size + message.mentions.roles.size >= mentionLimit || message.mentions.everyone);
  const letters = text.match(/[a-záéíóöőúüű]/gi) || [];
  const capitals = text.match(/[A-ZÁÉÍÓÖŐÚÜŰ]/g) || [];
  const capsSpam = config.protection.capsSpam && letters.length >= 20 && capitals.length / letters.length >= 0.8;
  const emojiCount = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  const emojiSpam = config.protection.emojiSpam && emojiCount >= (profile === PROFILES.strict ? 8 : 12);
  const lowered = text.toLowerCase();
  const badWord = config.protection.badWords && config.protection.blockedWords.some((word) => lowered.includes(word));
  const messageBomb = (config.protection.spam || config.protection.flood || config.protection.repeatedMessage)
    ? detectMessageBomb(text, config.protection.sensitivity)
    : null;
  const rawEveryone = config.protection.massMention && /@(?:everyone|here)\b/i.test(text);
  let violation = null;
  if (scam) violation = 'Gyanús vagy adathalász hivatkozás';
  else if (invite && config.protection.invites) violation = 'Tiltott Discord-meghívó';
  else if (link && config.protection.links) violation = 'Tiltott hivatkozás';
  else if (massMention || rawEveryone) violation = 'Tömeges vagy jogosulatlan megjelölés';
  else if (messageBomb) violation = messageBomb;
  else if (capsSpam) violation = 'Nagybetűs spam';
  else if (emojiSpam) violation = 'Emoji spam';
  else if (badWord) violation = 'Tiltott szó használata';
  if (violation) {
    if (config.protection.deleteMessages) await message.delete().catch(() => null);
    const automated = Boolean(message.author.bot || message.webhookId);
    const webhookResult = automated ? await removeUnauthorizedWebhook(message, config.protection) : null;
    if (automated) await logAutomatedMessageViolation(message, violation, actorMember, webhookResult);
    if (actorMember) await applyViolation(message, violation, actorMember);
    return;
  }

  if (!actorMember) return;

  const key = strikeKey(message.guild.id, actorMember.id);
  const now = Date.now();
  const entries = (spamWindows.get(key) || []).filter((entry) => now - entry.createdAt <= profile.spamWindowMs);
  entries.push({ createdAt: now, message, normalized: lowered.replace(/\s+/g, ' ').trim() });
  spamWindows.set(key, entries);
  const repeated = config.protection.repeatedMessage && entries.filter((entry) => entry.normalized && entry.normalized === entries.at(-1).normalized).length >= 3;
  const flooded = (config.protection.spam || config.protection.flood) && entries.length >= profile.spamLimit;
  if ((!repeated && !flooded) || now - (spamCooldowns.get(key) || 0) < 15_000) return;

  spamCooldowns.set(key, now);
  spamWindows.set(key, []);
  if (config.protection.deleteMessages) {
    await Promise.allSettled(entries.map((entry) => isSupportModerationPaused(message.guild.id) ? Promise.resolve() : entry.message.delete().catch(() => null)));
  }
  await applyViolation(message, repeated ? 'Ismételt üzenet spam' : `Spam vagy üzenetáradat (${profile.spamLimit} üzenet / ${profile.spamWindowMs / 1000} mp)`, actorMember);
}

async function fetchBotAdder(member) {
  await new Promise((resolve) => setTimeout(resolve, 1_200));
  const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 6 }).catch(() => null);
  return logs?.entries.find(
    (entry) => entry.target?.id === member.id && Date.now() - entry.createdTimestamp < 20_000
  )?.executor || null;
}

async function handleBotJoin(member) {
  if (isSupportModerationPaused(member.guild.id)) return;
  if (member.id === member.client.user.id) return;
  const protection = getGuildConfig(member.guild.id).protection;
  const authorized = protection.trustedBots.includes(member.id);
  if (authorized) {
    const executor = await fetchBotAdder(member);
    await sendSecurityLog(
      member.guild,
      baseEmbed('🤖 Engedélyezett bot hozzáadva', `${member.user.tag} (${member.id})`, COLORS.success)
        .addFields({ name: 'Hozzáadta', value: executor ? `${executor.tag} (${executor.id})` : 'Nem sikerült biztosan azonosítani' })
    );
    return;
  }

  const kicked = member.kickable
    ? await member.kick('NexaBot: engedély nélkül hozzáadott bot').then(() => true).catch(() => false)
    : false;
  const executor = await fetchBotAdder(member);
  const executorMember = executor ? await member.guild.members.fetch(executor.id).catch(() => null) : null;
  const mentions = leadershipMentions(member.guild);
  await sendSecurityLog(
    member.guild,
    baseEmbed(
      '🚫 Engedély nélküli bot észlelve',
      `${member.user.tag} (${member.id}) ${kicked ? '**azonnal kirúgva**.' : '**nem volt kirúgható**.'}`,
      COLORS.danger
    ).addFields({
      name: 'Hozzáadta',
      value: executor ? `${executor.tag} (${executor.id})` : 'Nem sikerült biztosan azonosítani'
    }),
    { content: mentions.content, allowedMentions: mentions.allowedMentions }
  );

  if (planAllows(member.guild.id, 'ultimate') && protection.antiNuke) {
    const quarantine = executorMember && !isSecurityTrusted(executorMember)
      ? await quarantineExecutor(executorMember, member.guild, 'engedély nélküli bot hozzáadása')
      : null;
    const now = Date.now();
    const records = [{ userId: member.id, joinedAt: now, fresh: false, defaultAvatar: false }];
    if (executor && executor.id !== member.id) {
      records.push({ userId: executor.id, joinedAt: now, fresh: false, defaultAvatar: false });
    }
    await beginRaidLock(member.guild, {
      triggered: true,
      reason: 'dangerous_action',
      eventLabel: 'Engedély nélküli bot hozzáadása',
      quarantineResponse: `${kicked ? 'Az ismeretlen bot azonnal kirúgva' : 'A botot nem sikerült kirúgni'}${quarantine ? ` • ${quarantine.summary}` : ''}`,
      quarantine,
      total: records.length,
      freshCount: 0,
      defaultAvatarCount: 0,
      records
    });
  }
}

async function handleHumanJoin(member) {
  if (isSupportModerationPaused(member.guild.id)) return;
  const now = Date.now();
  const profile = protectionProfile(member.guild.id);
  const age = now - member.user.createdTimestamp;
  const protection = getGuildConfig(member.guild.id).protection;
  if (protection.freshAccounts && age < profile.freshAccountMs) {
    await sendSecurityLog(
      member.guild,
      baseEmbed('🆕 Gyanúsan friss fiók csatlakozott', `${member.user.tag} (${member.id})`, COLORS.warning)
        .addFields({ name: 'Fiók életkora', value: `${Math.max(0, Math.floor(age / 3_600_000))} óra` })
    );
  }

  if (isSupportModerationPaused(member.guild.id)) return;
  const active = activeRaids.get(member.guild.id);
  if (active) active.candidateIds.add(member.id);

  const records = (joinWindows.get(member.guild.id) || [])
    .filter((record) => now - record.joinedAt <= profile.raidWindowMs);
  records.push({
    userId: member.id,
    joinedAt: now,
    fresh: age < profile.freshAccountMs,
    defaultAvatar: member.user.avatar === null
  });
  joinWindows.set(member.guild.id, records);
  const assessment = assessRaid(records, profile);
  if (planAllows(member.guild.id, 'ultimate') && protection.raidDetection && assessment.triggered) {
    await beginRaidLock(member.guild, assessment);
  }
}

const DANGEROUS_AUDIT_ACTIONS = new Map([
  [AuditLogEvent.ChannelCreate, 'Csatorna létrehozás'],
  [AuditLogEvent.ChannelDelete, 'Csatorna törlés'],
  [AuditLogEvent.ChannelUpdate, 'Csatorna módosítás'],
  [AuditLogEvent.ChannelOverwriteCreate, 'Csatornajogosultság létrehozás'],
  [AuditLogEvent.ChannelOverwriteUpdate, 'Csatornajogosultság módosítás'],
  [AuditLogEvent.ChannelOverwriteDelete, 'Csatornajogosultság törlés'],
  [AuditLogEvent.RoleCreate, 'Rang létrehozás'],
  [AuditLogEvent.RoleDelete, 'Rang törlés'],
  [AuditLogEvent.RoleUpdate, 'Rang vagy jogosultság módosítás'],
  [AuditLogEvent.MemberRoleUpdate, 'Tag rangjainak tömeges módosítása'],
  [AuditLogEvent.GuildUpdate, 'Szerverbeállítás módosítás'],
  [AuditLogEvent.MemberBanAdd, 'Kitiltás'],
  [AuditLogEvent.MemberBanRemove, 'Kitiltás feloldás'],
  [AuditLogEvent.MemberKick, 'Kirúgás'],
  [AuditLogEvent.MemberPrune, 'Tömeges tageltávolítás'],
  [AuditLogEvent.WebhookCreate, 'Webhook létrehozás'],
  [AuditLogEvent.WebhookUpdate, 'Webhook módosítás'],
  [AuditLogEvent.WebhookDelete, 'Webhook törlés']
]);

const DANGEROUS_PERMISSIONS = Object.freeze([
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageWebhooks
]);

const REQUIRED_SECURITY_PERMISSIONS = Object.freeze([
  ['Auditnapló megtekintése', PermissionFlagsBits.ViewAuditLog],
  ['Csatornák kezelése', PermissionFlagsBits.ManageChannels],
  ['Rangok kezelése', PermissionFlagsBits.ManageRoles],
  ['Tagok kirúgása', PermissionFlagsBits.KickMembers],
  ['Tagok kitiltása', PermissionFlagsBits.BanMembers],
  ['Tagok felfüggesztése', PermissionFlagsBits.ModerateMembers]
]);

function securityReadiness(guild) {
  const botMember = guild.members.me;
  if (!botMember) return { missingPermissions: ['A bot szervertagsága nem érhető el'], higherBots: [] };
  const missingPermissions = REQUIRED_SECURITY_PERMISSIONS
    .filter(([, permission]) => !botMember.permissions.has(permission))
    .map(([label]) => label);
  const botPosition = botMember.roles.highest?.position || 0;
  const higherBots = [...guild.members.cache.values()]
    .filter((member) => member.user?.bot && member.id !== botMember.id && !isSecurityTrusted(member))
    .filter((member) => (member.roles.highest?.position || 0) >= botPosition)
    .map((member) => member.user.tag)
    .slice(0, 5);
  return { missingPermissions, higherBots };
}

function auditGuardEnabled(action, protection) {
  if ([AuditLogEvent.ChannelCreate, AuditLogEvent.ChannelDelete, AuditLogEvent.ChannelUpdate, AuditLogEvent.ChannelOverwriteCreate, AuditLogEvent.ChannelOverwriteUpdate, AuditLogEvent.ChannelOverwriteDelete].includes(action)) return protection.channelGuard;
  if ([AuditLogEvent.RoleCreate, AuditLogEvent.RoleDelete, AuditLogEvent.RoleUpdate, AuditLogEvent.MemberRoleUpdate, AuditLogEvent.GuildUpdate].includes(action)) return protection.roleGuard;
  if ([AuditLogEvent.MemberBanAdd, AuditLogEvent.MemberBanRemove, AuditLogEvent.MemberKick, AuditLogEvent.MemberPrune].includes(action)) return protection.moderationGuard;
  if ([AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookUpdate, AuditLogEvent.WebhookDelete].includes(action)) return protection.webhookGuard;
  return false;
}

function alreadyProcessedAuditEntry(entry) {
  if (!entry?.id) return false;
  const now = Date.now();
  if (processedAuditEntries.has(entry.id)) return true;
  processedAuditEntries.set(entry.id, now);
  if (processedAuditEntries.size > 5_000) {
    for (const [id, seenAt] of processedAuditEntries) {
      if (now - seenAt > 60_000) processedAuditEntries.delete(id);
    }
  }
  return false;
}

async function neutralizeUnauthorizedCreation(entry, guild, eventLabel = 'veszélyes művelet') {
  if (isSupportModerationPaused(guild.id)) return { applied: false, summary: null };
  const reason = `NEXA Shield: jogosulatlan ${eventLabel}`;
  try {
    if (entry.action === AuditLogEvent.ChannelCreate) {
      const channel = guild.channels.cache.get(entry.targetId) || await guild.channels.fetch(entry.targetId).catch(() => null);
      if (!channel?.delete || channel.deletable === false) {
        return { applied: false, summary: 'A létrehozott csatornát nem lehetett automatikusan eltávolítani' };
      }
      if (isSupportModerationPaused(guild.id)) return { applied: false, summary: null };
      await channel.delete(reason);
      return { applied: true, summary: 'A jogosulatlanul létrehozott csatorna automatikusan törölve' };
    }
    if (entry.action === AuditLogEvent.RoleCreate) {
      const role = guild.roles.cache.get(entry.targetId) || await guild.roles.fetch(entry.targetId).catch(() => null);
      if (!role?.delete || role.editable === false) {
        return { applied: false, summary: 'A létrehozott rangot nem lehetett automatikusan eltávolítani' };
      }
      if (isSupportModerationPaused(guild.id)) return { applied: false, summary: null };
      await role.delete(reason);
      return { applied: true, summary: 'A jogosulatlanul létrehozott rang automatikusan törölve' };
    }
    if (entry.action === AuditLogEvent.WebhookCreate) {
      const webhooks = await guild.fetchWebhooks().catch(() => null);
      const webhook = webhooks?.get(entry.targetId);
      if (!webhook?.delete) {
        return { applied: false, summary: 'A létrehozott webhookot nem lehetett automatikusan eltávolítani' };
      }
      if (isSupportModerationPaused(guild.id)) return { applied: false, summary: null };
      await webhook.delete(reason);
      return { applied: true, summary: 'A jogosulatlanul létrehozott webhook automatikusan törölve' };
    }
    return { applied: false, summary: null };
  } catch (error) {
    await recordError(error, {
      command: 'anti_nuke_neutralize',
      guildId: guild.id,
      userId: entry.executorId || entry.executor?.id
    });
    return { applied: false, summary: `Az automatikus visszavonás sikertelen: ${error.message}` };
  }
}

async function quarantineExecutor(executor, guild, eventLabel) {
  if (isSupportModerationPaused(guild.id)) return { executorId: executor.id, removedRoleIds: [], timedOut: false, kicked: false, summary: 'A Support moderációja szünetel.' };
  if (executor.user?.bot) {
    const kicked = executor.kickable
      ? await executor.kick(`NEXA Shield: jogosulatlan botművelet – ${eventLabel}`).then(() => true).catch(() => false)
      : false;
    return {
      executorId: executor.id,
      removedRoleIds: [],
      timedOut: false,
      kicked,
      summary: kicked
        ? 'A végrehajtó, engedélylistán nem szereplő bot azonnal kirúgva'
        : 'A végrehajtó botot nem sikerült kirúgni – emeld a NEXA rangját a bot rangja fölé'
    };
  }
  const removable = executor.roles.cache.filter(
    (role) => role.editable && DANGEROUS_PERMISSIONS.some((permission) => role.permissions.has(permission))
  );
  const actions = [];
  const removedRoleIds = [];
  let timedOut = false;
  try {
    if (removable.size) {
      await executor.roles.remove([...removable.keys()], `NEXA Shield: jogosulatlan ${eventLabel}`);
      removedRoleIds.push(...removable.keys());
      actions.push(`${removable.size} veszélyes rang eltávolítva`);
    }
    if (!isSupportModerationPaused(guild.id) && getGuildConfig(guild.id).protection.timeout && executor.moderatable) {
      await executor.timeout(24 * 60 * 60 * 1000, `NEXA Shield: jogosulatlan ${eventLabel}`);
      timedOut = true;
      actions.push('24 órás biztonsági felfüggesztés');
    }
  } catch (error) {
    await recordError(error, { command: 'anti_raid_quarantine', guildId: guild.id, userId: executor.id });
    actions.push(`részleges védelem: ${error.message}`);
  }
  return {
    executorId: executor.id,
    removedRoleIds,
    timedOut,
    kicked: false,
    summary: actions.length ? actions.join(' • ') : 'Riasztás és azonnali szerverlezárás'
  };
}

async function restoreQuarantines(guild, session, reason) {
  const quarantines = Array.isArray(session?.quarantines) ? session.quarantines : [];
  let restored = 0;
  let failed = 0;
  for (const quarantine of quarantines) {
    const member = await guild.members.fetch(quarantine.executorId).catch(() => null);
    if (!member) continue;
    try {
      const roles = (quarantine.removedRoleIds || [])
        .map((roleId) => guild.roles.cache.get(roleId))
        .filter((role) => role?.editable && !role.managed);
      if (roles.length) await member.roles.add(roles, reason);
      if (quarantine.timedOut && member.moderatable) await member.timeout(null, reason);
      restored += 1;
    } catch {
      failed += 1;
    }
  }
  return { restored, failed };
}

async function handleAuditLogEntry(entry, guild) {
  if (!moduleEnabled(guild.id, 'protection')) return;
  const config = getGuildConfig(guild.id);
  if (!planAllows(guild.id, 'ultimate') || !config.protection.antiNuke || !DANGEROUS_AUDIT_ACTIONS.has(entry.action)) return;
  if (alreadyProcessedAuditEntry(entry)) return;
  const executorId = entry.executorId || entry.executor?.id;
  if (!executorId || executorId === guild.client.user.id || executorId === guild.ownerId) return;
  const executor = await guild.members.fetch(executorId).catch(() => null);
  if (isSupportModerationPaused(guild.id)) return;
  if (executor && isSecurityTrusted(executor)) return;
  const now = Date.now();
  const key = `${guild.id}:${executorId}`;
  const records = (nukeWindows.get(key) || []).filter((item) => now - item.at < 12_000);
  records.push({ action: entry.action, at: now, targetId: entry.targetId });
  nukeWindows.set(key, records);
  const threshold = config.protection.sensitivity === 'strict' ? 2 : config.protection.sensitivity === 'relaxed' ? 5 : 3;
  const eventLabel = DANGEROUS_AUDIT_ACTIONS.get(entry.action);
  const immediate = auditGuardEnabled(entry.action, config.protection);
  await recordAudit('security_dangerous_action', { actorId: executorId, guildId: guild.id, targetId: entry.targetId, metadata: { type: eventLabel, count: records.length, immediate } });
  if (!immediate && records.length < threshold) return;

  if (isSupportModerationPaused(guild.id)) return;
  const neutralization = await neutralizeUnauthorizedCreation(entry, guild, eventLabel);
  if (neutralization.summary) {
    await recordAudit('security_action_neutralized', {
      actorId: executorId,
      guildId: guild.id,
      targetId: entry.targetId,
      metadata: { type: eventLabel, applied: neutralization.applied, summary: neutralization.summary }
    });
  }
  const quarantine = executor
    ? await quarantineExecutor(executor, guild, eventLabel)
    : {
        executorId,
        removedRoleIds: [],
        timedOut: false,
        kicked: false,
        summary: 'A végrehajtó már nincs a szerveren; azonnali lezárás elindítva'
      };
  const response = [neutralization.summary, quarantine.summary].filter(Boolean).join(' • ');
  nukeWindows.set(key, []);
  if (immediate && config.protection.lockdown) {
    await beginRaidLock(guild, {
      triggered: true,
      reason: 'dangerous_action',
      eventLabel,
      quarantineResponse: response,
      quarantine,
      total: 1,
      freshCount: 0,
      defaultAvatarCount: 0,
      records: [{ userId: executorId, joinedAt: now, fresh: false, defaultAvatar: false }]
    });
    return;
  }
  const mentions = leadershipMentions(guild);
  await sendSecurityLog(guild, baseEmbed('☢️ Anti-Nuke riasztás', `${executor?.user?.tag || entry.executor?.tag || executorId} **${eventLabel}** műveletet hajtott végre.`, COLORS.danger).addFields(
    { name: 'Észlelt művelet', value: eventLabel, inline: true },
    { name: 'Automatikus reakció', value: response, inline: true },
    { name: 'Executor ID', value: executorId }
  ), { content: mentions.content, allowedMentions: mentions.allowedMentions });
}

async function handleMemberJoin(member) {
  if (!moduleEnabled(member.guild.id, 'protection')) return;
  if (member.user.bot) return handleBotJoin(member);
  return handleHumanJoin(member);
}

async function handleRaidDecision(interaction) {
  if (isSupportModerationPaused(interaction.guildId)) return ephemeralError(interaction, 'A Support moderációja szünetel; a raid-gombok nem hajthatnak végre büntetést.');
  if (!isLeadership(interaction.member)) {
    return ephemeralError(interaction, 'A raid-riasztásról csak Adminisztrátor vagy Vezetőség dönthet.');
  }
  await interaction.deferReply({ flags: EPHEMERAL });
  const [actionPart, sessionId] = interaction.customId.split(':');
  const action = actionPart.replace('security_raid_', '');
  let session = activeRaids.get(interaction.guildId);
  if (!session || session.id !== sessionId) {
    session = await readSessionAttachment(interaction.message, sessionId);
  }
  if (!session || session.guildId !== interaction.guildId) {
    return interaction.editReply('❌ A lezárás visszaállítási adatai nem találhatók. Ne módosíts kézzel jogosultságokat; kérj technikai segítséget.');
  }

  let resultText = 'Téves riasztásként lezárva, büntetés nem történt.';
  let affected = 0;
  let skipped = 0;
  if (action === 'kick' || action === 'ban') {
    for (const userId of session.candidateIds) {
      const target = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!target) {
        skipped += 1;
        continue;
      }
      const protectedTarget = session.triggerReason === 'dangerous_action'
        ? isSecurityTrusted(target)
        : isProtectedMember(target);
      if (protectedTarget) {
        skipped += 1;
        continue;
      }
      try {
        if (action === 'kick' && target.kickable) {
          await target.send(`🚪 A **${interaction.guild.name}** szerverről raidvédelem miatt kirúgtak.`).catch(() => null);
          if (isSupportModerationPaused(interaction.guildId)) break;
          await target.kick(`Raid megerősítve: ${interaction.user.tag}`);
          affected += 1;
        } else if (action === 'ban' && target.bannable) {
          await target.send(`🔨 A **${interaction.guild.name}** szerverről raidvédelem miatt kitiltottak.`).catch(() => null);
          if (isSupportModerationPaused(interaction.guildId)) break;
          await target.ban({ reason: `Raid megerősítve: ${interaction.user.tag}` });
          affected += 1;
        } else {
          skipped += 1;
        }
      } catch {
        skipped += 1;
      }
    }
    resultText = `${action === 'kick' ? 'Kirúgva' : 'Kitiltva'}: **${affected} fő**. Kihagyva vagy már távozott: **${skipped} fő**.`;
  }

  const restoreResult = await restoreGuild(interaction.guild, session, `NexaBot: raidriasztás lezárva – ${interaction.user.tag}`);
  const quarantineRestore = action === 'false'
    ? await restoreQuarantines(interaction.guild, session, `NexaBot: téves raidriasztás – ${interaction.user.tag}`)
    : { restored: 0, failed: 0 };
  joinWindows.set(interaction.guildId, []);
  const fullyRestored = restoreResult.failedChannelIds.length === 0 && quarantineRestore.failed === 0;
  if (fullyRestored) activeRaids.delete(interaction.guildId);
  else activeRaids.set(interaction.guildId, session);
  const restoreText = fullyRestored
    ? `✅ Feloldva • ${restoreResult.restored} csatorna visszaállítva${quarantineRestore.restored ? ` • ${quarantineRestore.restored} karantén feloldva` : ''}`
    : `⚠️ Részleges feloldás • ${restoreResult.restored} csatorna visszaállítva • ${restoreResult.failedChannelIds.length + quarantineRestore.failed} hiba`;

  const updated = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(fullyRestored && action === 'false' ? COLORS.success : COLORS.danger)
    .addFields(
      { name: 'Döntés', value: resultText },
      { name: 'Döntéshozó', value: `${interaction.user.tag} (${interaction.user.id})` },
      { name: 'Szerver állapota', value: restoreText }
    );
  await interaction.message.edit({
    embeds: [updated],
    components: [],
    ...(fullyRestored ? { attachments: [] } : {})
  }).catch(() => null);
  await recordAudit('security_raid_decision', {
    actorId: interaction.user.id,
    guildId: interaction.guildId,
    targetId: session.id,
    metadata: { action, affected, skipped, restored: restoreResult.restored, restoreFailed: restoreResult.failedChannelIds.length, quarantinesRestored: quarantineRestore.restored, quarantineRestoreFailed: quarantineRestore.failed }
  });
  return interaction.editReply(`${fullyRestored ? '✅' : '⚠️'} ${resultText}\n${restoreText}.`);
}

function buildSecurityCommand() {
  return new SlashCommandBuilder()
    .setName('vedelem')
    .setDescription('A NexaBot automatikus szervervédelmének kezelése.')
    .addSubcommand((subcommand) =>
      subcommand.setName('statusz').setDescription('Megmutatja a védelem állapotát.')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('feloldas').setDescription('Feloldja az aktív raid miatti szerverlezárást.')
    )
    .setDMPermission(false);
}

async function handleSecurityCommand(interaction) {
  if (!isLeadership(interaction.member)) {
    return ephemeralError(interaction, 'A védelmet csak Adminisztrátor vagy Vezetőség kezelheti.');
  }
  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply({ flags: EPHEMERAL });
  if (subcommand === 'statusz') {
    const config = getGuildConfig(interaction.guildId);
    const profile = protectionProfile(interaction.guildId);
    const pending = await findPendingSession(interaction.guild, interaction.client.user);
    const fullRaidAccess = planAllows(interaction.guildId, 'ultimate');
    const readiness = securityReadiness(interaction.guild);
    return interaction.editReply(
      `🛡️ **NexaBot-védelem: ${moduleEnabled(interaction.guildId, 'protection') ? 'aktív' : 'kikapcsolva'}**\n` +
      `• Erősség: ${profile.label}\n` +
      `• Spam: ${profile.spamLimit} üzenet / ${profile.spamWindowMs / 1000} másodperc\n` +
      `• Tömeges raid: ${profile.raidLimit} belépő / ${profile.raidWindowMs / 1000} másodperc\n` +
      `• Frissfiók-raid: ${profile.freshRaidLimit} friss fiók / ${profile.raidWindowMs / 1000} másodperc\n` +
      `• Friss fiók: ${Math.round(profile.freshAccountMs / 86_400_000)} napnál fiatalabb\n` +
      `• Teljes Anti-Raid hozzáférés: ${fullRaidAccess ? '✅ aktív' : '🔒 Ultimate szükséges'}\n` +
      `• Csatornaőr: ${config.protection.channelGuard ? '✅ első jogosulatlan létrehozásnál/törlésnél zár' : 'kikapcsolva'}\n` +
      `• Rang-, moderáció- és webhookőr: ${config.protection.roleGuard && config.protection.moderationGuard && config.protection.webhookGuard ? '✅ aktív' : 'részben kikapcsolva'}\n` +
      `• Bot-őr: engedélyezett botok: ${config.protection.trustedBots.length}; minden más új bot azonnal kirúgva\n` +
      `• Védelmi jogosultságok: ${readiness.missingPermissions.length ? `❌ hiányzik: ${readiness.missingPermissions.join(', ')}` : '✅ rendben'}\n` +
      `• Bot rangpozíció: ${readiness.higherBots.length ? `❌ emeld a NEXA rangját ezek fölé: ${readiness.higherBots.join(', ')}` : '✅ nincs ismert, fölötte álló idegen bot'}\n` +
      `• Linkek: Staff, Admin és Vezetőség számára engedélyezve\n` +
      `• Szerver: ${pending ? '🔒 raid miatt lezárva' : '✅ nincs aktív raidlezárás'}`
    );
  }
  if (subcommand === 'feloldas') {
    const pending = await findPendingSession(interaction.guild, interaction.client.user);
    if (!pending) return interaction.editReply('✅ Nincs aktív NexaBot raidlezárás.');
    const restoreResult = await restoreGuild(interaction.guild, pending.session, `NexaBot: kézi feloldás – ${interaction.user.tag}`);
    const quarantineRestore = await restoreQuarantines(interaction.guild, pending.session, `NexaBot: kézi feloldás – ${interaction.user.tag}`);
    const fullyRestored = !restoreResult.failedChannelIds.length && !quarantineRestore.failed;
    if (fullyRestored) activeRaids.delete(interaction.guildId);
    else activeRaids.set(interaction.guildId, pending.session);
    if (pending.message) {
      const embed = pending.message.embeds[0]
        ? EmbedBuilder.from(pending.message.embeds[0]).setColor(COLORS.success).addFields(
          { name: 'Kézi feloldás', value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: 'Visszaállítás', value: fullyRestored ? `✅ ${restoreResult.restored} csatorna és ${quarantineRestore.restored} karantén visszaállítva` : `⚠️ ${restoreResult.failedChannelIds.length + quarantineRestore.failed} visszaállítás sikertelen` }
        )
        : baseEmbed('✅ Raidlezárás kézzel feloldva', `${interaction.user.tag}`, COLORS.success);
      await pending.message.edit({
        embeds: [embed],
        components: [],
        ...(fullyRestored ? { attachments: [] } : {})
      }).catch(() => null);
    }
    await recordAudit('security_raid_manual_unlock', {
      actorId: interaction.user.id,
      guildId: interaction.guildId,
      targetId: pending.session.id,
      metadata: { restored: restoreResult.restored, restoreFailed: restoreResult.failedChannelIds.length, quarantinesRestored: quarantineRestore.restored, quarantineRestoreFailed: quarantineRestore.failed }
    });
    return interaction.editReply(!fullyRestored
      ? `⚠️ Részleges feloldás: ${restoreResult.restored} csatorna visszaállt, ${restoreResult.failedChannelIds.length + quarantineRestore.failed} visszaállítás jogosultsági hiba miatt sikertelen.`
      : `✅ A raidlezárást feloldottam: ${restoreResult.restored} csatorna és ${quarantineRestore.restored} biztonsági karantén visszaállt.`);
  }
}

function registerSecurity(client) {
  client.on(Events.MessageCreate, handleProtectedMessage);
  client.on(Events.GuildMemberAdd, handleMemberJoin);
  client.on(Events.GuildAuditLogEntryCreate, handleAuditLogEntry);
}

module.exports = {
  suspendSecurityForGuild,
  RAID_WINDOW_MS,
  RAID_JOIN_LIMIT,
  FRESH_ACCOUNT_MS,
  SPAM_WINDOW_MS,
  SPAM_MESSAGE_LIMIT,
  normalizeName,
  containsBlockedLink,
  messageSecurityText,
  detectMessageBomb,
  assessRaid,
  auditGuardEnabled,
  isLeadership,
  isSecurityTrusted,
  isLinkExempt,
  findSecurityChannel,
  securityReadiness,
  lockGuild,
  raidDecisionRow,
  buildSecurityCommand,
  handleSecurityCommand,
  handleRaidDecision,
  handleAuditLogEntry,
  neutralizeUnauthorizedCreation,
  registerSecurity
};
