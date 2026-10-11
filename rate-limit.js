'use strict';

function positiveNumber(value, fallback, minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function createWindowLimiter(options = {}) {
  const limit = positiveNumber(options.limit, 30, 1, 100_000);
  const windowMs = positiveNumber(options.windowMs, 10_000, 250, 3_600_000);
  const maxEntries = positiveNumber(options.maxEntries, 50_000, 100, 1_000_000);
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const windows = new Map();

  function sweep(timestamp = now(), force = false) {
    for (const [key, entry] of windows) {
      if (timestamp - entry.lastSeenAt >= windowMs || (force && windows.size > maxEntries && entry.count <= 1)) {
        windows.delete(key);
      }
    }
    if (windows.size > maxEntries) {
      const oldest = [...windows.entries()]
        .sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt)
        .slice(0, windows.size - maxEntries);
      for (const [key] of oldest) windows.delete(key);
    }
  }

  function consume(rawKey, cost = 1) {
    const key = String(rawKey || 'anonymous').slice(0, 160);
    const timestamp = now();
    const safeCost = positiveNumber(cost, 1, 1, limit);
    const existing = windows.get(key);
    const entry = !existing || timestamp - existing.startedAt >= windowMs
      ? { startedAt: timestamp, count: 0, lastSeenAt: timestamp }
      : existing;
    entry.count += safeCost;
    entry.lastSeenAt = timestamp;
    windows.set(key, entry);
    if (windows.size > maxEntries) sweep(timestamp, true);
    return {
      allowed: entry.count <= limit,
      limit,
      remaining: Math.max(0, limit - entry.count),
      retryAfterMs: Math.max(0, windowMs - (timestamp - entry.startedAt))
    };
  }

  function reset(key = null) {
    if (key === null) windows.clear();
    else windows.delete(String(key));
  }

  return { consume, reset, size: () => windows.size, sweep };
}

const interactionWindowMs = positiveNumber(process.env.INTERACTION_WINDOW_MS, 10_000, 1_000, 60_000);
const userLimiter = createWindowLimiter({
  limit: positiveNumber(process.env.INTERACTION_USER_LIMIT, 30, 10, 300),
  windowMs: interactionWindowMs
});
const guildLimiter = createWindowLimiter({
  limit: positiveNumber(process.env.INTERACTION_GUILD_LIMIT, 300, 50, 5_000),
  windowMs: interactionWindowMs
});

function interactionCost(interaction) {
  if (interaction?.isModalSubmit?.()) return 2;
  if (interaction?.isChatInputCommand?.()) return 2;
  return 1;
}

function checkInteractionRate(interaction) {
  const userId = interaction?.user?.id || 'unknown';
  const guildId = interaction?.guildId || 'dm';
  const cost = interactionCost(interaction);
  const user = userLimiter.consume(`${guildId}:${userId}`, cost);
  if (!user.allowed) return { ...user, allowed: false, scope: 'user' };
  const guild = guildLimiter.consume(guildId, cost);
  if (!guild.allowed) return { ...guild, allowed: false, scope: 'guild' };
  return { allowed: true, remaining: Math.min(user.remaining, guild.remaining), retryAfterMs: 0, scope: null };
}

module.exports = {
  checkInteractionRate,
  createWindowLimiter,
  interactionCost,
  positiveNumber
};
