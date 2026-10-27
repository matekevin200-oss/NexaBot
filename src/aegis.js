const crypto = require('node:crypto');
const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const {
  dashboardUrl,
  dbQuery,
  getGuildConfig,
  isOwnerUser,
  isPersistentStore
} = require('./config');
const { recordAudit } = require('./telemetry');

const AEGIS_SCHEMA = 1;
const DISCORD_EPOCH = 1420070400000n;
const memoryScans = new Map();

const DANGEROUS_PERMISSIONS = Object.freeze([
  { key: 'administrator', label: 'Administrator', bit: PermissionFlagsBits.Administrator, weight: 55 },
  { key: 'manageGuild', label: 'Szerver kezelése', bit: PermissionFlagsBits.ManageGuild, weight: 12 },
  { key: 'manageRoles', label: 'Rangok kezelése', bit: PermissionFlagsBits.ManageRoles, weight: 14 },
  { key: 'manageChannels', label: 'Csatornák kezelése', bit: PermissionFlagsBits.ManageChannels, weight: 12 },
  { key: 'manageWebhooks', label: 'Webhookok kezelése', bit: PermissionFlagsBits.ManageWebhooks, weight: 9 },
  { key: 'banMembers', label: 'Tagok kitiltása', bit: PermissionFlagsBits.BanMembers, weight: 9 },
  { key: 'kickMembers', label: 'Tagok kirúgása', bit: PermissionFlagsBits.KickMembers, weight: 7 },
  { key: 'moderateMembers', label: 'Tagok felfüggesztése', bit: PermissionFlagsBits.ModerateMembers, weight: 5 }
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function hashValue(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function hasPermission(holder, bit) {
  try {
    if (holder?.permissions?.has) return Boolean(holder.permissions.has(bit));
    const value = BigInt(holder?.permissions?.bitfield ?? holder?.permissions ?? 0);
    return (value & bit) === bit || (value & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator;
  } catch {
    return false;
  }
}

function permissionSet(holder) {
  return DANGEROUS_PERMISSIONS.filter((permission) => hasPermission(holder, permission.bit));
}

function snowflakeTimestamp(id) {
  try {
    return Number((BigInt(String(id)) >> 22n) + DISCORD_EPOCH);
  } catch {
    return 0;
  }
}

function ageDays(timestamp, now = Date.now()) {
  if (!timestamp || timestamp > now) return 0;
  return Math.floor((now - timestamp) / 86_400_000);
}

function riskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function rolePosition(member) {
  return Number(member?.roles?.highest?.position || 0);
}

function roleIds(member) {
  if (member?.roles?.cache?.keys) return [...member.roles.cache.keys()].map(String).sort();
  return [];
}

function memberLabel(member) {
  return String(member?.user?.tag || member?.user?.username || member?.displayName || member?.id || 'Ismeretlen').slice(0, 100);
}

function analyseIdentity(member, context) {
  const permissions = permissionSet(member);
  const administrator = permissions.some((permission) => permission.key === 'administrator');
  const id = String(member.id);
  const isOwner = id === context.ownerId;
  const accountDays = ageDays(snowflakeTimestamp(id), context.now);
  const joinedDays = ageDays(member.joinedTimestamp || member.joinedAt?.getTime?.() || 0, context.now);
  const highestPosition = rolePosition(member);
  const containable = isOwner ? false : highestPosition < context.botHighestPosition;
  const bot = Boolean(member.user?.bot);
  const trustedBot = bot && context.trustedBotIds.has(id);
  let score = administrator ? 55 : permissions.reduce((sum, permission) => sum + permission.weight, 0);
  const reasons = permissions.map((permission) => permission.label);
  if (permissions.length && accountDays < 7) {
    score += 18;
    reasons.push('7 napnál frissebb fiók');
  } else if (permissions.length && accountDays < 30) {
    score += 8;
    reasons.push('30 napnál frissebb fiók');
  }
  if (permissions.length && joinedDays < 2) {
    score += 10;
    reasons.push('48 órán belül csatlakozott');
  }
  if (permissions.length && !containable && !isOwner) {
    score += 20;
    reasons.push('A NEXA rangja alatt nem elszigetelhető');
  }
  if (bot && !trustedBot) {
    score += permissions.length ? 22 : 12;
    reasons.push('Nincs a megbízható botok listáján');
  }
  if (isOwner) {
    score = 0;
    reasons.length = 0;
    reasons.push('Discord szervertulajdonos');
  }
  score = Math.min(100, Math.max(0, score));
  return {
    id,
    label: memberLabel(member),
    bot,
    trustedBot,
    owner: isOwner,
    permissions: permissions.map((permission) => permission.key).sort(),
    permissionLabels: permissions.map((permission) => permission.label),
    roleIds: roleIds(member),
    highestRolePosition: highestPosition,
    containable,
    accountAgeDays: accountDays,
    joinedAgeDays: joinedDays,
    score,
    level: riskLevel(score),
    reasons
  };
}

function permissionDna(snapshot) {
  return hashValue({
    schema: snapshot.schema,
    guildId: snapshot.guild.id,
    botHighestPosition: snapshot.bot.highestRolePosition,
    roles: snapshot.roles.map((role) => ({
      id: role.id,
      position: role.position,
      permissions: role.permissions
    })),
    identities: snapshot.identities.map((identity) => ({
      id: identity.id,
      bot: identity.bot,
      permissions: identity.permissions,
      roleIds: identity.roleIds,
      highestRolePosition: identity.highestRolePosition,
      containable: identity.containable
    }))
  });
}

async function analyseGuildPermissions(guild, options = {}) {
  if (options.refresh !== false) {
    await Promise.allSettled([
      guild.roles?.fetch?.(),
      guild.members?.fetch?.({ withPresences: false })
    ]);
  }
  const config = getGuildConfig(guild.id);
  const botMember = guild.members.me;
  const botId = String(guild.client?.user?.id || '');
  const botHighestPosition = Number(botMember?.roles?.highest?.position || 0);
  const trustedBotIds = new Set([
    botId,
    ...(config.protection?.trustedBots || []).map(String)
  ].filter(Boolean));
  const context = {
    now: Number(options.now || Date.now()),
    ownerId: String(guild.ownerId),
    botHighestPosition,
    trustedBotIds
  };
  const roles = [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id)
    .map((role) => {
      const permissions = permissionSet(role);
      return {
        id: String(role.id),
        name: String(role.name || role.id).slice(0, 100),
        position: Number(role.position || 0),
        managed: Boolean(role.managed),
        permissions: permissions.map((permission) => permission.key).sort(),
        permissionLabels: permissions.map((permission) => permission.label),
        aboveBot: Number(role.position || 0) >= botHighestPosition
      };
    })
    .filter((role) => role.permissions.length)
    .sort((a, b) => b.position - a.position || a.id.localeCompare(b.id));
  const identities = [...guild.members.cache.values()]
    .map((member) => analyseIdentity(member, context))
    .filter((identity) => identity.id !== botId)
    .filter((identity) => identity.permissions.length || (identity.bot && !identity.trustedBot))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const privileged = identities.filter((identity) => identity.permissions.length && !identity.owner);
  const counts = {
    critical: privileged.filter((identity) => identity.level === 'critical').length,
    high: privileged.filter((identity) => identity.level === 'high').length,
    medium: privileged.filter((identity) => identity.level === 'medium').length,
    administrators: privileged.filter((identity) => identity.permissions.includes('administrator')).length,
    uncontainable: privileged.filter((identity) => !identity.containable).length,
    untrustedBots: identities.filter((identity) => identity.bot && !identity.trustedBot).length,
    privilegedIdentities: privileged.length,
    riskyRoles: roles.length
  };
  const postureScore = Math.max(0, Math.min(100,
    100
    - counts.critical * 13
    - counts.high * 7
    - counts.medium * 2
    - counts.uncontainable * 5
    - counts.untrustedBots * 8
  ));
  const snapshot = {
    schema: AEGIS_SCHEMA,
    capturedAt: new Date(context.now).toISOString(),
    guild: { id: String(guild.id), name: String(guild.name), ownerId: String(guild.ownerId) },
    bot: {
      id: String(guild.client?.user?.id || ''),
      highestRoleId: botMember?.roles?.highest?.id || null,
      highestRolePosition: botHighestPosition
    },
    postureScore,
    postureLevel: riskLevel(100 - postureScore),
    counts,
    roles,
    identities
  };
  snapshot.permissionDna = permissionDna(snapshot);
  return snapshot;
}

function comparePermissionDna(baseline, current) {
  if (!baseline) return {
    changed: false,
    riskDelta: 0,
    addedIdentities: [],
    removedIdentities: [],
    changedIdentities: [],
    changedRoles: []
  };
  const previousMembers = new Map((baseline.identities || []).map((item) => [item.id, item]));
  const currentMembers = new Map((current.identities || []).map((item) => [item.id, item]));
  const previousRoles = new Map((baseline.roles || []).map((item) => [item.id, item]));
  const currentRoles = new Map((current.roles || []).map((item) => [item.id, item]));
  const addedIdentities = [...currentMembers.values()].filter((item) => !previousMembers.has(item.id));
  const removedIdentities = [...previousMembers.values()].filter((item) => !currentMembers.has(item.id));
  const changedIdentities = [...currentMembers.values()].filter((item) => {
    const previous = previousMembers.get(item.id);
    if (!previous) return false;
    return stableJson({ permissions: previous.permissions, roleIds: previous.roleIds, containable: previous.containable }) !==
      stableJson({ permissions: item.permissions, roleIds: item.roleIds, containable: item.containable });
  });
  const changedRoles = [...currentRoles.values()].filter((item) => {
    const previous = previousRoles.get(item.id);
    if (!previous) return true;
    return stableJson({ permissions: previous.permissions, position: previous.position }) !==
      stableJson({ permissions: item.permissions, position: item.position });
  });
  for (const item of previousRoles.values()) if (!currentRoles.has(item.id)) changedRoles.push(item);
  return {
    changed: baseline.permissionDna !== current.permissionDna,
    riskDelta: Number(baseline.postureScore || 0) - Number(current.postureScore || 0),
    addedIdentities,
    removedIdentities,
    changedIdentities,
    changedRoles
  };
}

function memoryRecords(guildId) {
  if (!memoryScans.has(guildId)) memoryScans.set(guildId, []);
  return memoryScans.get(guildId);
}

function normalizeRecord(row) {
  if (!row) return null;
  return {
    ...row,
    snapshot: typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot,
    diff: typeof row.diff === 'string' ? JSON.parse(row.diff) : (row.diff || {})
  };
}

async function aegisBaseline(guildId) {
  if (!isPersistentStore()) return memoryRecords(String(guildId)).find((record) => record.is_baseline) || null;
  const result = await dbQuery(
    'SELECT * FROM nexabot_aegis_scans WHERE guild_id = $1 AND is_baseline = TRUE ORDER BY created_at DESC LIMIT 1',
    [String(guildId)]
  );
  return normalizeRecord(result?.rows?.[0]);
}

async function recentAegisScans(guildId, limit = 12) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
  if (!isPersistentStore()) return memoryRecords(String(guildId)).slice(-safeLimit).reverse();
  const result = await dbQuery(
    'SELECT * FROM nexabot_aegis_scans WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
    [String(guildId), safeLimit]
  );
  return (result?.rows || []).map(normalizeRecord);
}

async function runAegisScan(guild, options = {}) {
  const snapshot = await analyseGuildPermissions(guild, { refresh: options.refresh !== false });
  const baseline = await aegisBaseline(guild.id);
  const diff = comparePermissionDna(baseline?.snapshot, snapshot);
  const baselineMode = Boolean(options.baseline);
  let record;
  if (isPersistentStore()) {
    if (baselineMode) await dbQuery('UPDATE nexabot_aegis_scans SET is_baseline = FALSE WHERE guild_id = $1', [guild.id]);
    const result = await dbQuery(
      `INSERT INTO nexabot_aegis_scans
        (guild_id, dna_hash, posture_score, snapshot, diff, source, created_by, is_baseline)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
       RETURNING *`,
      [guild.id, snapshot.permissionDna, snapshot.postureScore, JSON.stringify(snapshot), JSON.stringify(diff), String(options.source || 'manual'), String(options.createdBy || 'owner'), baselineMode]
    );
    record = normalizeRecord(result?.rows?.[0]);
  } else {
    const records = memoryRecords(guild.id);
    if (baselineMode) for (const item of records) item.is_baseline = false;
    record = {
      id: records.length + 1,
      guild_id: guild.id,
      dna_hash: snapshot.permissionDna,
      posture_score: snapshot.postureScore,
      snapshot,
      diff,
      source: String(options.source || 'manual'),
      created_by: String(options.createdBy || 'owner'),
      is_baseline: baselineMode,
      created_at: new Date()
    };
    records.push(record);
  }
  await recordAudit(baselineMode ? 'aegis_baseline' : 'aegis_scan', {
    actorId: options.createdBy || 'owner',
    guildId: guild.id,
    targetId: String(record?.id || snapshot.permissionDna.slice(0, 12)),
    metadata: { postureScore: snapshot.postureScore, dna: snapshot.permissionDna, changed: diff.changed }
  });
  return { record, snapshot, baseline, diff };
}

async function aegisOverview(guild) {
  const [current, baseline, scans] = await Promise.all([
    analyseGuildPermissions(guild, { refresh: false }),
    aegisBaseline(guild.id),
    recentAegisScans(guild.id, 12)
  ]);
  return { current, baseline, scans, diff: comparePermissionDna(baseline?.snapshot, current) };
}

function ownerAegisUrl(guildId) {
  return `${dashboardUrl().replace(/\/dashboard\/?$/, '')}/owner/aegis/${guildId}`;
}

function buildAegisCommand() {
  return new SlashCommandBuilder()
    .setName('aegis')
    .setDescription('NEXA Permission DNA és jogosultsági robbanási sugár elemzés.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((subcommand) => subcommand.setName('statusz').setDescription('Megmutatja az élő jogosultsági kockázatot.'))
    .addSubcommand((subcommand) => subcommand.setName('vizsgalat').setDescription('Teljes Permission DNA vizsgálatot indít.'))
    .addSubcommand((subcommand) => subcommand.setName('bazis').setDescription('Jóváhagyott jogosultsági bázist rögzít.'));
}

async function handleAegisCommand(interaction) {
  if (!interaction.inGuild()) return interaction.reply({ content: '❌ Ez a parancs csak szerveren használható.', flags: MessageFlags.Ephemeral });
  if (!isOwnerUser(interaction.user.id)) {
    return interaction.reply({ content: '🔒 A Permission DNA rendszert csak a bot Owner és az általa kijelölt Owner-kezelők használhatják.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const subcommand = interaction.options.getSubcommand();
  const panelUrl = ownerAegisUrl(interaction.guildId);
  if (subcommand === 'statusz') {
    const overview = await aegisOverview(interaction.guild);
    const snapshot = overview.current;
    return interaction.editReply(`🛡️ **NEXA AEGIS állapot**\nBiztonsági pontszám: **${snapshot.postureScore}/100**\nKritikus identitás: **${snapshot.counts.critical}**\nNem elszigetelhető jogosult: **${snapshot.counts.uncontainable}**\nPermission DNA: \`${snapshot.permissionDna.slice(0, 20)}…\`\nOwner Center: ${panelUrl}`);
  }
  if (subcommand === 'bazis' && !isPersistentStore()) {
    return interaction.editReply('❌ A tartós AEGIS-bázishoz működő PostgreSQL adatbázis szükséges.');
  }
  const result = await runAegisScan(interaction.guild, {
    baseline: subcommand === 'bazis',
    source: 'discord-owner',
    createdBy: interaction.user.id,
    refresh: true
  });
  const top = result.snapshot.identities.filter((identity) => !identity.owner).slice(0, 5)
    .map((identity) => `• **${identity.score}/100** – ${identity.label}: ${identity.reasons.slice(0, 3).join(', ')}`)
    .join('\n');
  return interaction.editReply(`🧬 **${subcommand === 'bazis' ? 'Permission DNA bázis rögzítve' : 'AEGIS vizsgálat elkészült'}**\nBiztonsági pontszám: **${result.snapshot.postureScore}/100**\nDNA-eltérés: **${result.diff.changed ? 'IGEN' : 'NINCS'}**\n${top || '✅ Nem található kiemelt jogosultsági kockázat.'}\n\nRészletes elemzés: ${panelUrl}`);
}

module.exports = {
  AEGIS_SCHEMA,
  DANGEROUS_PERMISSIONS,
  riskLevel,
  permissionDna,
  analyseGuildPermissions,
  comparePermissionDna,
  aegisBaseline,
  recentAegisScans,
  runAegisScan,
  aegisOverview,
  buildAegisCommand,
  handleAegisCommand
};
