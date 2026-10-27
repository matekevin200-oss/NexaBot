const { Events, Status } = require('discord.js');
const { databaseHealth } = require('./config');

const APP_VERSION = '25.0.3';

function positiveInteger(value, fallback, minimum = 1_000, maximum = 60 * 60 * 1000) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function gatewayStatusName(status) {
  return Status[status] || 'Unknown';
}

function createRuntimeSupervisor(client, options = {}) {
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const startedAt = now();
  const startupGraceMs = positiveInteger(
    options.startupGraceMs ?? process.env.STARTUP_GRACE_MS,
    180_000,
    30_000
  );
  const maxOfflineMs = positiveInteger(
    options.maxOfflineMs ?? process.env.DISCORD_MAX_OFFLINE_MS,
    180_000,
    30_000
  );
  const checkIntervalMs = positiveInteger(
    options.checkIntervalMs ?? process.env.WATCHDOG_INTERVAL_MS,
    15_000,
    5_000,
    300_000
  );
  const onRestart = typeof options.onRestart === 'function' ? options.onRestart : () => {};
  let timer = null;
  let restartRequested = false;
  let offlineSince = startedAt;
  let lastReadyAt = null;
  let lastGatewayEvent = 'boot';
  let lastGatewayEventAt = startedAt;

  function mark(event, ready = false) {
    const timestamp = now();
    lastGatewayEvent = event;
    lastGatewayEventAt = timestamp;
    if (ready) {
      offlineSince = null;
      lastReadyAt = timestamp;
    } else if (!offlineSince) {
      offlineSince = timestamp;
    }
  }

  function requestRestart(reason, error = null) {
    if (restartRequested) return;
    restartRequested = true;
    onRestart(reason, error);
  }

  function inspect() {
    if (client.isReady()) {
      if (offlineSince) mark('watchdog-ready', true);
      return;
    }
    if (!offlineSince) offlineSince = now();
    const startupExpired = now() - startedAt >= startupGraceMs;
    const offlineExpired = now() - offlineSince >= maxOfflineMs;
    if (startupExpired && offlineExpired) {
      requestRestart(`A Discord gateway ${Math.round((now() - offlineSince) / 1000)} másodperce nem üzemkész.`);
    }
  }

  const listeners = [
    [Events.ClientReady, () => mark('client-ready', true)],
    [Events.ShardReady, (id) => mark(`shard-${id}-ready`, true)],
    [Events.ShardResume, (id) => mark(`shard-${id}-resumed`, true)],
    [Events.ShardReconnecting, (id) => mark(`shard-${id}-reconnecting`)],
    [Events.ShardDisconnect, (_event, id) => mark(`shard-${id}-disconnected`)],
    [Events.ShardError, (error, id) => mark(`shard-${id}-error:${error?.message || 'unknown'}`)],
    [Events.Invalidated, () => {
      mark('session-invalidated');
      requestRestart('A Discord munkamenet érvénytelenné vált.');
    }]
  ];
  for (const [event, listener] of listeners) client.on(event, listener);

  function snapshot() {
    const timestamp = now();
    const ready = Boolean(client.isReady());
    const startup = timestamp - startedAt < startupGraceMs;
    const healthy = ready || startup;
    const database = databaseHealth();
    return {
      name: 'NexaBot',
      version: APP_VERSION,
      healthy,
      status: ready ? 'online' : startup ? 'starting' : 'offline',
      guilds: client.guilds?.cache?.size || 0,
      uptimeSeconds: Math.max(0, Math.floor((timestamp - startedAt) / 1000)),
      discord: {
        ready,
        gateway: gatewayStatusName(client.ws?.status),
        ping: Number.isFinite(client.ws?.ping) ? client.ws.ping : -1,
        offlineSeconds: ready || !offlineSince ? 0 : Math.max(0, Math.floor((timestamp - offlineSince) / 1000)),
        lastReadyAt: lastReadyAt ? new Date(lastReadyAt).toISOString() : null,
        lastEvent: lastGatewayEvent,
        lastEventAt: new Date(lastGatewayEventAt).toISOString()
      },
      database
    };
  }

  function start() {
    if (timer) return;
    timer = setInterval(inspect, checkIntervalMs);
    timer.unref();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    for (const [event, listener] of listeners) client.off(event, listener);
  }

  return { inspect, snapshot, start, stop };
}

module.exports = {
  APP_VERSION,
  createRuntimeSupervisor,
  gatewayStatusName,
  positiveInteger
};
