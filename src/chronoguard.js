const crypto = require('node:crypto');
const {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const {
  configuredChannel,
  dashboardUrl,
  dbQuery,
  getGuildConfig,
  isOwnerUser,
  isPersistentStore
} = require('./config');
const { COLORS } = require('./constants');
const { recordAudit, recordError } = require('./telemetry');

const SNAPSHOT_SCHEMA = 1;
const CHRONOGUARD_DISABLED_GUILDS = new Set(['1517509643734221030']);
const SEVERITY_WEIGHT = Object.freeze({ critical: 30, high: 16, medium: 8, low: 3 });

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function structuralState(state) {
  const clone = JSON.parse(JSON.stringify(state));
  delete clone.capturedAt;
  return clone;
}

function stateFingerprint(state) {
  return crypto.createHash('sha256').update(stableJson(structuralState(state))).digest('hex');
}

function signingKey() {
  return String(process.env.CHRONOGUARD_SIGNING_KEY || process.env.SESSION_SECRET || '').trim();
}

function chainSignature(guildId, hash, previousHash = '') {
  const key = signingKey();
  if (!key) return null;
  return crypto.createHmac('sha256', key).update(`${guildId}:${previousHash}:${hash}`).digest('hex');
}

function verifyChainSignature(record) {
  if (!record?.signature) return false;
  const expected = chainSignature(record.guild_id || record.guildId, record.snapshot_hash || record.hash, record.previous_hash || record.previousHash || '');
  if (!expected || expected.length !== String(record.signature).length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(record.signature)));
}

function serializeRole(role) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    mentionable: role.mentionable,
    managed: role.managed,
    position: role.position,
    permissions: role.permissions.bitfield.toString()
  };
}

function serializeOverwrite(overwrite) {
  return {
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString()
  };
}

function serializeChannel(channel) {
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId || null,
    position: Number(channel.rawPosition ?? channel.position ?? 0),
    topic: typeof channel.topic === 'string' ? channel.topic : null,
    nsfw: Boolean(channel.nsfw),
    rateLimitPerUser: Number(channel.rateLimitPerUser || 0),
    bitrate: Number(channel.bitrate || 0),
    userLimit: Number(channel.userLimit || 0),
    permissionOverwrites: channel.permissionOverwrites?.cache
      ? [...channel.permissionOverwrites.cache.values()].map(serializeOverwrite).sort((a, b) => a.id.localeCompare(b.id))
      : []
  };
}

async function captureGuildState(guild, options = {}) {
  if (options.refresh !== false) {
    await Promise.allSettled([guild.roles.fetch(), guild.channels.fetch()]);
  }
  const roles = [...guild.roles.cache.values()].map(serializeRole).sort((a, b) => a.id.localeCompare(b.id));
  const channels = [...guild.channels.cache.values()]
    .filter((channel) => !channel.isThread?.())
    .map(serializeChannel)
    .sort((a, b) => a.id.localeCompare(b.id));
  const botMember = guild.members.me;
  return {
    schema: SNAPSHOT_SCHEMA,
    capturedAt: new Date().toISOString(),
    guild: {
      id: guild.id,
      name: guild.name,
      ownerId: guild.ownerId,
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      afkChannelId: guild.afkChannelId || null,
      systemChannelId: guild.systemChannelId || null,
      premiumTier: guild.premiumTier
    },
    bot: {
      id: guild.client.user.id,
      permissions: botMember?.permissions?.bitfield?.toString?.() || '0',
      highestRoleId: botMember?.roles?.highest?.id || null,
      roleIds: botMember ? [...botMember.roles.cache.keys()].sort() : []
    },
    roles,
    channels
  };
}

function protectedTarget(config, kind, id) {
  const list = kind === 'role' ? config?.protectedRoleIds : config?.protectedChannelIds;
  return Array.isArray(list) && list.includes(id);
}

function diffItem(kind, change, target, severity, detail, recoverable = true, protectedItem = false) {
  return {
    kind,
    change,
    targetId: target.id,
    label: target.name || target.id,
    severity: protectedItem && severity !== 'critical' ? 'critical' : severity,
    protected: protectedItem,
    recoverable,
    detail
  };
}

function compareGuildStates(baseline, current, config = {}) {
  const changes = [];
  const baselineRoles = new Map((baseline.roles || []).map((role) => [role.id, role]));
  const currentRoles = new Map((current.roles || []).map((role) => [role.id, role]));
  const baselineChannels = new Map((baseline.channels || []).map((channel) => [channel.id, channel]));
  const currentChannels = new Map((current.channels || []).map((channel) => [channel.id, channel]));

  for (const role of baselineRoles.values()) {
    const actual = currentRoles.get(role.id);
    const protectedItem = protectedTarget(config, 'role', role.id);
    if (!actual) {
      changes.push(diffItem('role', 'missing', role, role.managed ? 'low' : 'high', 'A pillanatképben szereplő rang hiányzik.', !role.managed, protectedItem));
      continue;
    }
    const fields = ['name', 'color', 'hoist', 'mentionable', 'permissions'];
    const changedFields = fields.filter((field) => String(role[field]) !== String(actual[field]));
    if (changedFields.length) {
      const lostPermissions = BigInt(role.permissions || '0') & ~BigInt(actual.permissions || '0');
      const severity = lostPermissions || protectedItem ? 'high' : 'medium';
      changes.push(diffItem('role', 'modified', role, severity, `Módosult: ${changedFields.join(', ')}.`, !role.managed, protectedItem));
    }
  }
  for (const role of currentRoles.values()) {
    if (baselineRoles.has(role.id)) continue;
    const administrator = (BigInt(role.permissions || '0') & PermissionFlagsBits.Administrator) !== 0n;
    changes.push(diffItem('role', 'added', role, administrator ? 'critical' : 'low', administrator ? 'Új Administrator jogosultságú rang jelent meg.' : 'Új rang jelent meg.', false));
  }

  for (const channel of baselineChannels.values()) {
    const actual = currentChannels.get(channel.id);
    const protectedItem = protectedTarget(config, 'channel', channel.id);
    if (!actual) {
      changes.push(diffItem('channel', 'missing', channel, 'high', 'A pillanatképben szereplő csatorna hiányzik.', true, protectedItem));
      continue;
    }
    const fields = ['name', 'type', 'parentId', 'topic', 'nsfw', 'rateLimitPerUser', 'bitrate', 'userLimit'];
    const changedFields = fields.filter((field) => String(channel[field] ?? '') !== String(actual[field] ?? ''));
    const overwritesChanged = stableJson(channel.permissionOverwrites || []) !== stableJson(actual.permissionOverwrites || []);
    if (overwritesChanged) changedFields.push('jogosultsági felülírások');
    if (changedFields.length) {
      changes.push(diffItem('channel', 'modified', channel, overwritesChanged ? 'high' : 'medium', `Módosult: ${changedFields.join(', ')}.`, true, protectedItem));
    }
  }
  for (const channel of currentChannels.values()) {
    if (!baselineChannels.has(channel.id)) changes.push(diffItem('channel', 'added', channel, 'low', 'Új csatorna jelent meg.', false));
  }

  const baselineBotPermissions = BigInt(baseline.bot?.permissions || '0');
  const currentBotPermissions = BigInt(current.bot?.permissions || '0');
  if ((baselineBotPermissions & ~currentBotPermissions) !== 0n) {
    changes.push({
      kind: 'bot', change: 'permissions_lost', targetId: current.bot?.id || 'bot', label: 'NexaBot',
      severity: 'critical', protected: true, recoverable: false,
      detail: 'A NexaBot a bázisállapothoz képest jogosultságokat veszített.'
    });
  }

  for (const field of ['verificationLevel', 'explicitContentFilter', 'defaultMessageNotifications']) {
    if (String(baseline.guild?.[field]) !== String(current.guild?.[field])) {
      changes.push({
        kind: 'guild', change: 'modified', targetId: current.guild?.id, label: 'Szerverbeállítás',
        severity: 'medium', protected: false, recoverable: false,
        detail: `${field} megváltozott.`
      });
    }
  }

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  let rawScore = 0;
  for (const change of changes) {
    counts[change.severity] += 1;
    rawScore += SEVERITY_WEIGHT[change.severity];
  }
  const riskScore = Math.min(100, rawScore);
  const riskLevel = riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 16 ? 'medium' : riskScore > 0 ? 'low' : 'clean';
  return {
    baselineHash: stateFingerprint(baseline),
    currentHash: stateFingerprint(current),
    riskScore,
    riskLevel,
    counts,
    changes,
    recoverableChanges: changes.filter((change) => change.recoverable).length
  };
}

function snapshotSummary(state) {
  return {
    guildName: state.guild.name,
    roles: state.roles.length,
    channels: state.channels.length,
    botPermissions: state.bot.permissions
  };
}

function requirePersistence() {
  if (!isPersistentStore()) throw new Error('A ChronoGuard használatához PostgreSQL adatbázis szükséges.');
}

async function latestSnapshot(guildId, baselineOnly = false) {
  requirePersistence();
  const result = await dbQuery(
    `SELECT * FROM nexabot_server_snapshots WHERE guild_id = $1 ${baselineOnly ? 'AND is_baseline = TRUE' : ''}
     ORDER BY created_at DESC LIMIT 1`,
    [guildId]
  );
  return result?.rows?.[0] || null;
}

async function getSnapshot(guildId, snapshotId) {
  requirePersistence();
  const result = await dbQuery('SELECT * FROM nexabot_server_snapshots WHERE guild_id = $1 AND id = $2', [guildId, snapshotId]);
  return result?.rows?.[0] || null;
}

async function listSnapshots(guildId, limit = 20) {
  requirePersistence();
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const result = await dbQuery(
    'SELECT id, snapshot_hash, previous_hash, signature, summary, source, created_by, is_baseline, created_at FROM nexabot_server_snapshots WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
    [guildId, safeLimit]
  );
  return result?.rows || [];
}

async function createSnapshot(guild, options = {}) {
  requirePersistence();
  const state = options.state || await captureGuildState(guild);
  const hash = stateFingerprint(state);
  const previous = await latestSnapshot(guild.id);
  if (!options.force && previous?.snapshot_hash === hash) return { ...previous, unchanged: true };
  const previousHash = previous?.snapshot_hash || '';
  const signature = chainSignature(guild.id, hash, previousHash);
  const result = await dbQuery(
    `INSERT INTO nexabot_server_snapshots
      (guild_id, snapshot_hash, previous_hash, signature, snapshot, summary, source, created_by, is_baseline)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9) RETURNING *`,
    [guild.id, hash, previousHash || null, signature, JSON.stringify(state), JSON.stringify(snapshotSummary(state)), String(options.source || 'manual').slice(0, 32), String(options.createdBy || 'system').slice(0, 32), false]
  );
  if (options.baseline) {
    await dbQuery(
      'UPDATE nexabot_server_snapshots SET is_baseline = (id = $2) WHERE guild_id = $1',
      [guild.id, result.rows[0].id]
    );
    result.rows[0].is_baseline = true;
  }
  await recordAudit('chronoguard_snapshot', { actorId: options.createdBy || 'system', guildId: guild.id, targetId: String(result.rows[0].id), metadata: { hash, baseline: Boolean(options.baseline), source: options.source || 'manual' } });
  return result.rows[0];
}

async function setBaseline(guildId, snapshotId, actorId) {
  requirePersistence();
  const existing = await getSnapshot(guildId, snapshotId);
  if (!existing) throw new Error('A kiválasztott ChronoGuard-pillanatkép nem található.');
  const result = await dbQuery(
    `UPDATE nexabot_server_snapshots SET is_baseline = (id = $2)
     WHERE guild_id = $1 RETURNING *`,
    [guildId, snapshotId]
  );
  const selected = result?.rows?.find((row) => String(row.id) === String(snapshotId));
  if (!selected) throw new Error('A ChronoGuard-bázisállapot mentése nem sikerült.');
  await recordAudit('chronoguard_baseline_set', { actorId, guildId, targetId: String(snapshotId), metadata: { hash: selected.snapshot_hash } });
  return selected;
}

async function shadowScan(guild, options = {}) {
  requirePersistence();
  const baseline = options.baselineId
    ? await getSnapshot(guild.id, options.baselineId)
    : await latestSnapshot(guild.id, true);
  if (!baseline) throw new Error('Még nincs ChronoGuard-bázisállapot. Készíts egy bázispillanatképet.');
  const currentState = options.currentState || await captureGuildState(guild);
  const diff = compareGuildStates(baseline.snapshot, currentState, getGuildConfig(guild.id).chronoGuard);
  const duplicate = await dbQuery(
    `SELECT * FROM nexabot_chronoguard_incidents
     WHERE guild_id = $1 AND baseline_snapshot_id = $2 AND current_hash = $3
     ORDER BY created_at DESC LIMIT 1`,
    [guild.id, baseline.id, diff.currentHash]
  );
  if (duplicate?.rowCount) return { incident: duplicate.rows[0], baseline, currentState, diff, duplicate: true };
  const inserted = await dbQuery(
    `INSERT INTO nexabot_chronoguard_incidents
      (guild_id, baseline_snapshot_id, current_hash, risk_score, risk_level, diff, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) RETURNING *`,
    [guild.id, baseline.id, diff.currentHash, diff.riskScore, diff.riskLevel, JSON.stringify(diff), diff.riskScore > 0 ? 'open' : 'clean', String(options.createdBy || 'system').slice(0, 32)]
  );
  await recordAudit('chronoguard_shadow_scan', { actorId: options.createdBy || 'system', guildId: guild.id, targetId: String(inserted.rows[0].id), metadata: { riskScore: diff.riskScore, riskLevel: diff.riskLevel, changes: diff.changes.length } });
  return { incident: inserted.rows[0], baseline, currentState, diff, duplicate: false };
}

function mapOverwrites(overwrites, idMap = new Map()) {
  return (overwrites || []).map((overwrite) => ({
    id: idMap.get(overwrite.id) || overwrite.id,
    type: overwrite.type,
    allow: BigInt(overwrite.allow || '0'),
    deny: BigInt(overwrite.deny || '0')
  }));
}

function channelEditPayload(channel, idMap = new Map()) {
  const payload = {
    name: channel.name,
    permissionOverwrites: mapOverwrites(channel.permissionOverwrites, idMap),
    reason: 'NEXA ChronoGuard biztonságos helyreállítás'
  };
  const textTypes = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia]);
  if (textTypes.has(channel.type)) {
    if (typeof channel.topic === 'string' || channel.topic === null) payload.topic = channel.topic;
    if (typeof channel.nsfw === 'boolean') payload.nsfw = channel.nsfw;
    if (Number.isFinite(channel.rateLimitPerUser)) payload.rateLimitPerUser = channel.rateLimitPerUser;
  }
  if ([ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
    if (Number.isFinite(channel.bitrate) && channel.bitrate > 0) payload.bitrate = channel.bitrate;
    if (Number.isFinite(channel.userLimit)) payload.userLimit = channel.userLimit;
  }
  return payload;
}

async function restoreSnapshot(guild, snapshotId, options = {}) {
  requirePersistence();
  const snapshot = await getSnapshot(guild.id, snapshotId);
  if (!snapshot) throw new Error('A helyreállítási pillanatkép nem található.');
  const current = await captureGuildState(guild);
  const diff = compareGuildStates(snapshot.snapshot, current, getGuildConfig(guild.id).chronoGuard);
  const results = { restoredRoles: 0, restoredChannels: 0, createdRoles: 0, createdChannels: 0, skipped: 0, errors: [] };
  const roleIdMap = new Map();
  const channelIdMap = new Map();
  const modifiedRoleIds = new Set(diff.changes.filter((change) => change.kind === 'role' && change.change === 'modified').map((change) => change.targetId));
  const modifiedChannelIds = new Set(diff.changes.filter((change) => change.kind === 'channel' && change.change === 'modified').map((change) => change.targetId));

  if (options.createMissing) {
    for (const roleData of snapshot.snapshot.roles.filter((role) => !role.managed && role.id !== guild.id && !guild.roles.cache.has(role.id))) {
      try {
        const role = await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: roleData.mentionable,
          permissions: BigInt(roleData.permissions || '0'),
          reason: `NEXA ChronoGuard snapshot #${snapshot.id}`
        });
        roleIdMap.set(roleData.id, role.id);
        results.createdRoles += 1;
      } catch (error) {
        results.errors.push(`Rang: ${roleData.name} – ${error.message}`);
      }
    }
  }

  for (const roleData of snapshot.snapshot.roles) {
    if (!modifiedRoleIds.has(roleData.id)) continue;
    const role = guild.roles.cache.get(roleData.id);
    if (!role || role.managed || (role.id !== guild.id && !role.editable)) {
      results.skipped += 1;
      continue;
    }
    try {
      await role.edit({
        name: roleData.id === guild.id ? undefined : roleData.name,
        color: roleData.id === guild.id ? undefined : roleData.color,
        hoist: roleData.id === guild.id ? undefined : roleData.hoist,
        mentionable: roleData.id === guild.id ? undefined : roleData.mentionable,
        permissions: BigInt(roleData.permissions || '0'),
        reason: `NEXA ChronoGuard snapshot #${snapshot.id}`
      });
      results.restoredRoles += 1;
    } catch (error) {
      results.errors.push(`Rang: ${roleData.name} – ${error.message}`);
    }
  }

  if (options.createMissing) {
    const missing = snapshot.snapshot.channels.filter((channel) => !guild.channels.cache.has(channel.id));
    const ordered = [...missing].sort((a, b) => Number(b.type === ChannelType.GuildCategory) - Number(a.type === ChannelType.GuildCategory));
    for (const channelData of ordered) {
      try {
        const channel = await guild.channels.create({
          name: channelData.name,
          type: channelData.type,
          parent: channelIdMap.get(channelData.parentId) || (guild.channels.cache.has(channelData.parentId) ? channelData.parentId : null),
          ...channelEditPayload(channelData, roleIdMap),
          position: channelData.position
        });
        channelIdMap.set(channelData.id, channel.id);
        results.createdChannels += 1;
      } catch (error) {
        results.errors.push(`Csatorna: ${channelData.name} – ${error.message}`);
      }
    }
  }

  for (const channelData of snapshot.snapshot.channels) {
    if (!modifiedChannelIds.has(channelData.id)) continue;
    const channel = guild.channels.cache.get(channelData.id);
    if (!channel || !channel.manageable) {
      results.skipped += 1;
      continue;
    }
    try {
      const parent = channelIdMap.get(channelData.parentId) || (guild.channels.cache.has(channelData.parentId) ? channelData.parentId : null);
      await channel.edit({ ...channelEditPayload(channelData, roleIdMap), parent, position: channelData.position });
      results.restoredChannels += 1;
    } catch (error) {
      results.errors.push(`Csatorna: ${channelData.name} – ${error.message}`);
    }
  }

  const after = await createSnapshot(guild, { source: 'recovery', createdBy: options.createdBy || 'owner', force: true });
  await dbQuery(
    `UPDATE nexabot_chronoguard_incidents SET status = 'resolved', resolved_at = NOW(), resolved_by = $1
     WHERE guild_id = $2 AND baseline_snapshot_id = $3 AND status = 'open'`,
    [String(options.createdBy || 'owner'), guild.id, snapshot.id]
  );
  await recordAudit('chronoguard_restore', { actorId: options.createdBy || 'owner', guildId: guild.id, targetId: String(snapshot.id), metadata: { ...results, errors: results.errors.slice(0, 10), recoverySnapshotId: after.id } });
  return { snapshot, before: diff, after, results };
}

async function buildIncidentCapsule(guild, snapshotId) {
  const snapshot = await getSnapshot(guild.id, snapshotId);
  if (!snapshot) throw new Error('A pillanatkép nem található.');
  const current = await captureGuildState(guild);
  const diff = compareGuildStates(snapshot.snapshot, current, getGuildConfig(guild.id).chronoGuard);
  return {
    format: 'NEXA-CHRONOGUARD-CAPSULE',
    version: 1,
    generatedAt: new Date().toISOString(),
    guild: { id: guild.id, name: guild.name },
    integrity: {
      snapshotHash: snapshot.snapshot_hash,
      recomputedHash: stateFingerprint(snapshot.snapshot),
      previousHash: snapshot.previous_hash,
      signaturePresent: Boolean(snapshot.signature),
      signatureValid: verifyChainSignature(snapshot)
    },
    snapshot: snapshot.snapshot,
    current,
    drift: diff
  };
}

async function chronoguardOverview(guild) {
  if (!isPersistentStore()) return { available: false, snapshots: [], baseline: null, latestIncident: null };
  const [snapshots, baseline, incidentResult] = await Promise.all([
    listSnapshots(guild.id, 30),
    latestSnapshot(guild.id, true),
    dbQuery('SELECT * FROM nexabot_chronoguard_incidents WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 1', [guild.id])
  ]);
  return { available: true, snapshots, baseline, latestIncident: incidentResult?.rows?.[0] || null };
}

function alertEmbed(scan, guild) {
  const diff = scan.diff;
  return new EmbedBuilder()
    .setColor(diff.riskLevel === 'critical' ? COLORS.danger : diff.riskLevel === 'high' ? COLORS.warning : COLORS.primary)
    .setTitle('🕰️ ChronoGuard szervereltérés')
    .setDescription(`A NEXA digitális iker **${diff.riskScore}/100** kockázatú eltérést észlelt a bázisállapothoz képest.`)
    .addFields(
      { name: 'Kritikus', value: String(diff.counts.critical), inline: true },
      { name: 'Magas', value: String(diff.counts.high), inline: true },
      { name: 'Visszaállítható', value: String(diff.recoverableChanges), inline: true },
      { name: 'Fontos', value: 'A bot nem töröl új elemeket és nem indít automatikus helyreállítást. A döntés az Owner Centerben történik.' }
    )
    .setFooter({ text: `NEXA ChronoGuard • ${guild.name}` })
    .setTimestamp();
}

async function removeChronoGuardAlerts(guild, botUserId) {
  const channel = configuredChannel(guild, 'securityLogs');
  if (!channel?.isTextBased?.() || !channel.messages?.fetch) return 0;
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return 0;
  let removed = 0;
  for (const message of messages.values()) {
    const belongsToBot = message.author?.id === botUserId;
    const isChronoGuardAlert = (message.embeds || []).some((embed) =>
      (embed.title || embed.data?.title) === '🕰️ ChronoGuard szervereltérés'
      && String(embed.footer?.text || embed.data?.footer?.text || '').startsWith('NEXA ChronoGuard')
    );
    if (belongsToBot && isChronoGuardAlert && await message.delete('ChronoGuard riasztás eltávolítása a Belv szerverről').then(() => true).catch(() => false)) removed += 1;
  }
  return removed;
}

function ownerChronoGuardUrl(guildId) {
  return `${dashboardUrl().replace(/\/dashboard\/?$/, '')}/owner/chronoguard/${guildId}`;
}

function buildChronoGuardCommand() {
  return new SlashCommandBuilder()
    .setName('chronoguard')
    .setDescription('A NEXA digitális szerverikerének Owner vezérlése.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((subcommand) => subcommand
      .setName('statusz')
      .setDescription('Megmutatja a ChronoGuard pillanatképek és incidensek állapotát.'))
    .addSubcommand((subcommand) => subcommand
      .setName('vizsgalat')
      .setDescription('Összehasonlítja az élő szervert a biztonsági bázisállapottal.'))
    .addSubcommand((subcommand) => subcommand
      .setName('pillanatkep')
      .setDescription('Kézzel létrehoz egy aláírt szerver-pillanatképet.'));
}

async function handleChronoGuardCommand(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: '❌ Ez a parancs csak szerveren használható.', flags: MessageFlags.Ephemeral });
  }
  if (!isOwnerUser(interaction.user.id)) {
    return interaction.reply({ content: '🔒 A ChronoGuard helyreállítási rendszerét kizárólag a bot Owner és az általa kijelölt Owner-kezelők használhatják.', flags: MessageFlags.Ephemeral });
  }
  if (!isPersistentStore()) {
    return interaction.reply({ content: '❌ A ChronoGuardhoz működő PostgreSQL adatbázis szükséges.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const subcommand = interaction.options.getSubcommand();
  const panelUrl = ownerChronoGuardUrl(interaction.guildId);
  if (subcommand === 'pillanatkep') {
    const snapshot = await createSnapshot(interaction.guild, { source: 'discord-owner', createdBy: interaction.user.id, force: true });
    return interaction.editReply(`✅ Aláírt pillanatkép elkészült: **#${snapshot.id}**\nUjjlenyomat: \`${snapshot.snapshot_hash.slice(0, 16)}…\`\n${panelUrl}`);
  }
  if (subcommand === 'vizsgalat') {
    const scan = await shadowScan(interaction.guild, { createdBy: interaction.user.id });
    const topChanges = scan.diff.changes.slice(0, 5).map((change) => `• **${change.severity.toUpperCase()}** – ${change.label}: ${change.detail}`).join('\n');
    return interaction.editReply(`🕰️ **ChronoGuard Shadow Scan**\nKockázat: **${scan.diff.riskScore}/100 • ${scan.diff.riskLevel.toUpperCase()}**\nEltérések: **${scan.diff.changes.length}**\n${topChanges || '✅ A szerkezet megegyezik a bázisállapottal.'}\n\nRészletes döntési központ: ${panelUrl}`);
  }
  const overview = await chronoguardOverview(interaction.guild);
  const incident = overview.latestIncident;
  return interaction.editReply(`🛡️ **NEXA ChronoGuard állapot**\nBázis: **${overview.baseline ? `#${overview.baseline.id}` : 'nincs'}**\nPillanatképek: **${overview.snapshots.length}**\nUtolsó kockázat: **${incident ? `${incident.risk_score}/100 • ${String(incident.risk_level).toUpperCase()}` : 'még nincs vizsgálat'}**\nOwner Center: ${panelUrl}`);
}

function startChronoGuardJobs(client) {
  let running = false;
  const cleanedGuilds = new Set();
  const execute = async () => {
    if (running || !client.isReady()) return;
    running = true;
    try {
      for (const guild of client.guilds.cache.values()) {
        if (CHRONOGUARD_DISABLED_GUILDS.has(guild.id)) {
          if (!cleanedGuilds.has(guild.id)) {
            await removeChronoGuardAlerts(guild, client.user.id).catch((error) => recordError(error, { command: 'chronoguard_alert_cleanup', guildId: guild.id }));
            cleanedGuilds.add(guild.id);
          }
          continue;
        }
        if (!isPersistentStore()) continue;
        const settings = getGuildConfig(guild.id).chronoGuard;
        if (!settings?.enabled) continue;
        try {
          let baseline = await latestSnapshot(guild.id, true);
          if (!baseline) baseline = await createSnapshot(guild, { source: 'auto-baseline', createdBy: 'system', baseline: true });
          const latest = await latestSnapshot(guild.id);
          const ageHours = latest?.created_at ? (Date.now() - new Date(latest.created_at).getTime()) / 3_600_000 : Infinity;
          if (ageHours >= settings.autoSnapshotHours) await createSnapshot(guild, { source: 'automatic', createdBy: 'system' });
          const scan = await shadowScan(guild, { createdBy: 'system' });
          if (!scan.duplicate && scan.diff.riskScore >= settings.alertThreshold) {
            const channel = configuredChannel(guild, 'securityLogs');
            if (channel?.isTextBased?.()) await channel.send({ embeds: [alertEmbed(scan, guild)] }).catch(() => null);
          }
          await dbQuery(
            `DELETE FROM nexabot_server_snapshots WHERE id IN (
               SELECT id FROM nexabot_server_snapshots WHERE guild_id = $1 AND is_baseline = FALSE
               ORDER BY created_at DESC OFFSET $2
             )`,
            [guild.id, settings.retention]
          );
        } catch (error) {
          await recordError(error, { command: 'chronoguard_background', guildId: guild.id });
        }
      }
    } finally {
      running = false;
    }
  };
  const timer = setInterval(execute, 30 * 60 * 1000);
  timer.unref();
  setTimeout(execute, 60_000).unref();
  return { stop: () => clearInterval(timer), runNow: execute };
}

module.exports = {
  SNAPSHOT_SCHEMA,
  canonicalize,
  stateFingerprint,
  chainSignature,
  verifyChainSignature,
  captureGuildState,
  compareGuildStates,
  createSnapshot,
  setBaseline,
  latestSnapshot,
  getSnapshot,
  listSnapshots,
  shadowScan,
  restoreSnapshot,
  buildIncidentCapsule,
  chronoguardOverview,
  removeChronoGuardAlerts,
  buildChronoGuardCommand,
  handleChronoGuardCommand,
  startChronoGuardJobs
};
