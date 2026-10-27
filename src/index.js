const {FACTIONS}=require('./mdt-factions');
const {economyCommands}=require('./economy-discord');
require('dotenv').config();
const { buildTicketCommand }=require('./ticket-operations');
const {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Options,
  Partials,
  REST,
  Routes
} = require('discord.js');
const { handleInteraction } = require('./interactions');
const { registerEvents } = require('./events');
const { buildSecurityCommand, registerSecurity } = require('./security');
const { buildSettingsCommand, buildRpCommands, startDashboardServer } = require('./dashboard');
const {
  initConfigStore,
  getBotOwnerId,
  pruneExpiredPremium,
  checkDatabaseConnection,
  closeConfigStore
} = require('./config');
const { buildAiCommand } = require('./ai');
const { buildShiftCommand } = require('./shifts');
const { communityCommands, restoreGiveaways } = require('./community');
const { moderationCommands } = require('./moderation');
const { buildHelpCommand } = require('./help');
const { engagementCommands, startEngagementJobs } = require('./engagement');
const { recordError, pruneTelemetry } = require('./telemetry');
const { createRuntimeSupervisor, positiveInteger } = require('./runtime');
const { buildChronoGuardCommand, startChronoGuardJobs } = require('./chronoguard');
const { buildAegisCommand } = require('./aegis');
const { syncMdtGuildCommands, getSettings: getMdtSettings, BELV_GUILD_ID } = require('./belv-mdt');
const { syncMdtDiscord } = require('./mdt-discord');
const { retireLegacyCommands } = require('./platform-update');
const {
  auditSupportServer,
  buildCiaSetupCommand,
  buildSupportSetupCommand,
  registerCiaCommandInOwnerGuilds,
  registerSupportCommandInOwnerGuilds,
  SUPPORT_GUILD_ID
} = require('./support-server');
const { localizeCommandJson } = require('./command-localizations');

const requiredVariables = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);
if (missingVariables.length) {
  console.error(`Hiányzó környezeti változók: ${missingVariables.join(', ')}`);
  process.exit(1);
}

const client = new Client({
  shards: process.env.SHARD_COUNT ? Array.from({ length: Math.max(1, Number.parseInt(process.env.SHARD_COUNT, 10) || 1) }, (_, index) => index) : 'auto',
  shardCount: Math.max(1, Number.parseInt(process.env.SHARD_COUNT || '1', 10) || 1),
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 100,
    ReactionManager: 100,
    GuildMemberManager: {
      maxSize: 10_000,
      keepOverLimit: (member) => member.id === member.client.user.id
    }
  }),
  sweepers: {
    messages: { interval: 300, lifetime: 1800 },
    users: { interval: 1800, filter: () => (user) => user.bot && user.id !== user.client.user.id }
  }
});

async function registerCommands(readyClient) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    {
      body: [
        buildSettingsCommand(),
        ...buildRpCommands(),
        buildSecurityCommand(),
        buildAiCommand(),
        buildShiftCommand(),
        buildHelpCommand(),
        buildTicketCommand(),
        buildChronoGuardCommand(),
        buildAegisCommand(),
        require('./staff-workflow').buildCommand(),
        buildSupportSetupCommand(),
        ...engagementCommands(),
        ...economyCommands(),
        require('./platform-moderation').command(),
        ...moderationCommands(),
        ...communityCommands()
      ].map((item) => localizeCommandJson(item.toJSON()))
    }
  );

  // Global slash-command updates can take a while to propagate in Discord.
  // Publish the complete /nexa command at guild scope as well so `/nexa elo`
  // appears immediately without replacing any of the guild's other commands.
  const nexaGuildPayload = localizeCommandJson(buildAiCommand().toJSON());
  for (const guild of readyClient?.guilds?.cache?.values?.() || []) {
    try {
      await rest.post(Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id), {
        body: nexaGuildPayload
      });
      console.log(`A /nexa parancs azonnali guild-regisztrációja kész: ${guild.id}`);
    } catch (error) {
      console.error(`A /nexa guild-regisztrációja sikertelen (${guild.id}):`, error);
      await recordError(error, { command: 'nexa_guild_registration', guildId: guild.id });
    }
  }

  const ownerGuildRegistration = await registerSupportCommandInOwnerGuilds({
    rest,
    guilds: readyClient?.guilds?.cache,
    applicationId: process.env.CLIENT_ID,
    ownerId: process.env.BOT_OWNER_ID || process.env.OWNER_ID
  });
  for (const failure of ownerGuildRegistration.failed) {
    console.error(`A /support-szerver azonnali regisztrációja sikertelen (${failure.guildId}):`, failure.error);
    await recordError(failure.error, {
      command: 'support_server_guild_registration',
      guildId: failure.guildId
    });
  }
  if (ownerGuildRegistration.registered.length) {
    console.log(`A /support-szerver parancs azonnal regisztrálva: ${ownerGuildRegistration.registered.join(', ')}`);
  } else {
    console.warn('A /support-szerver azonnali regisztrációjához nem található BOT_OWNER_ID által tulajdonolt szerver.');
  }

  const ciaGuildRegistration = await registerCiaCommandInOwnerGuilds({
    rest,
    guilds: readyClient?.guilds?.cache,
    applicationId: process.env.CLIENT_ID,
    ownerId: process.env.BOT_OWNER_ID || process.env.OWNER_ID
  });
  for (const failure of ciaGuildRegistration.failed) {
    console.error(`A /cia azonnali regisztrációja sikertelen (${failure.guildId}):`, failure.error);
    await recordError(failure.error, { command: 'cia_guild_registration', guildId: failure.guildId });
  }
  if (ciaGuildRegistration.registered.length) {
    console.log(`A /cia tulajdonosi parancs azonnal regisztrálva: ${ciaGuildRegistration.registered.join(', ')}`);
  } else {
    console.warn('A /cia parancshoz nem található olyan szerver, ahol a BOT_OWNER_ID fiók Rendszergazda vagy szervertulajdonos.');
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  const updatePresence = () => {
    const users = readyClient.guilds.cache.reduce((sum, guild) => sum + Number(guild.memberCount || 0), 0);
    const entries = [
      `${readyClient.guilds.cache.size} szervert`,
      `${users.toLocaleString('hu-HU')} felhasználót`,
      '/help • nexabot'
    ];
    const index = Math.floor(Date.now() / 30_000) % entries.length;
    readyClient.user.setPresence({ activities: [{ name: entries[index], type: ActivityType.Watching }], status: 'online' });
  };
  updatePresence();
  setInterval(updatePresence, 30_000).unref();
  try {
    await registerCommands(readyClient);
    readyClient.nexaCommandsReady=true;
    const supportGuild = readyClient.guilds.cache.get(SUPPORT_GUILD_ID);
    if (supportGuild) {
      try {
        const audit = auditSupportServer(supportGuild);
        if (audit.complete) {
          console.log(`A NEXA Support Center felismerve, újratelepítés kihagyva: ${SUPPORT_GUILD_ID}`);
        } else {
          const missing = [...audit.missingRoles, ...audit.missingCategories, ...audit.missingChannels];
          console.warn(`A NEXA Support Center hiányos (${missing.length} elem), de az újraindítás biztonsági okból nem módosítja. Futtasd kézzel: /support-szerver javitas`);
        }
      } catch (supportError) {
        console.error('A NEXA Support Center indítási ellenőrzése sikertelen:', supportError);
        await recordError(supportError, { command: 'support_server_startup_audit', guildId: SUPPORT_GUILD_ID });
      }
    }
    console.log(`NexaBot elindult: ${readyClient.user.tag}`);
    await restoreGiveaways(readyClient);
    console.log('A NEXA Bot 25.0.3 MDT Network • öt frakció és közös RP-nyilvántartás használatra kész.');
  } catch (error) {
    console.error('A parancs regisztrálása nem sikerült:', error);
    await recordError(error, { command: 'registerCommands' });
  } finally {
    await retireLegacyCommands(readyClient);
    await syncMdtGuildCommands(readyClient);
    require('./belv-mdt').startBelvRosterMonitor(readyClient);
    for(const faction of FACTIONS){
      const guild=readyClient.guilds.cache.get(faction.guildId);if(!guild)continue;
      try{const settings=await getMdtSettings(faction.guildId);if(settings.enabled)await syncMdtDiscord(guild,getBotOwnerId());}
      catch(error){await recordError(error,{command:'mdt_startup_discord_sync',guildId:faction.guildId}).catch(()=>null);}
    }
  }
});

const {invalidateMember}=require('./mdt-network-auth');
client.on(Events.GuildMemberUpdate,(_old,member)=>invalidateMember(member.guild.id,member.id));
client.on(Events.GuildMemberRemove,member=>invalidateMember(member.guild.id,member.id));
client.on(Events.InteractionCreate, handleInteraction);
registerEvents(client);
registerSecurity(client);

client.on(Events.Error, (error) => {
  console.error('Discord klienshiba:', error);
  recordError(error, { command: 'discord_client' }).catch(() => null);
});
client.on(Events.Warn, (message) => console.warn('Discord figyelmeztetés:', message));

const port = Number(process.env.PORT) || 3000;
let server = null;
let runtimeSupervisor = null;
let premiumTimer = null;
let databaseTimer = null;
let telemetryTimer = null;
let platformJobs;
let engagementJobs = null;
let chronoGuardJobs = null;
let stopping = false;
let restartRequested = false;

async function closeHttpServer() {
  if (!server?.listening) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 4_000);
    timeout.unref();
    server.close(() => {
      clearTimeout(timeout);
      resolve();
    });
    server.closeIdleConnections?.();
  });
}

async function terminate(code, reason) {
  if (stopping) return;
  stopping = true;
  console.log(`${reason}: a NexaBot szabályosan leáll…`);
  if (premiumTimer) clearInterval(premiumTimer);
  if (databaseTimer) clearInterval(databaseTimer);
  if (telemetryTimer) clearInterval(telemetryTimer);
  platformJobs?.stop?.();
  engagementJobs?.stop();
  chronoGuardJobs?.stop();
  runtimeSupervisor?.stop();
  client.destroy();
  const forcedExit = setTimeout(() => process.exit(code), 5_000);
  forcedExit.unref();
  await Promise.allSettled([closeHttpServer(), closeConfigStore()]);
  clearTimeout(forcedExit);
  process.exit(code);
}

function requestRestart(reason, error = null) {
  if (restartRequested || stopping) return;
  restartRequested = true;
  const restartError = error instanceof Error ? error : new Error(reason);
  console.error(`Öngyógyító újraindítás: ${reason}`, error || '');
  recordError(restartError, { command: 'runtime_restart' }).catch(() => null);
  setTimeout(() => terminate(1, 'WATCHDOG'), 500);
}

runtimeSupervisor = createRuntimeSupervisor(client, { onRestart: requestRestart });
runtimeSupervisor.start();
server = startDashboardServer(client, port, { healthProvider: runtimeSupervisor.snapshot });
server.on('error', (error) => requestRestart('A webkiszolgáló leállt.', error));

async function shutdown(signal) {
  await terminate(0, signal);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  console.error('Nem kezelt Promise-hiba:', error);
  recordError(error, { command: 'unhandledRejection' }).catch(() => null);
});
process.on('uncaughtException', (error) => {
  console.error('Nem kezelt futási hiba:', error);
  requestRestart('Nem kezelt futási hiba miatt biztonságos újraindítás szükséges.', error);
});

async function start() {
  await initConfigStore();
  await require('./next-design').prime().catch(error=>recordError(error,{command:'appearance_cache'}));
  const cleanupTelemetry = () => pruneTelemetry({
    usageDays: process.env.TELEMETRY_RETENTION_DAYS,
    errorDays: process.env.ERROR_RETENTION_DAYS,
    auditDays: process.env.AUDIT_RETENTION_DAYS,
    aiHistoryDays: process.env.AI_HISTORY_RETENTION_DAYS
  }).catch((error) => recordError(error, { command: 'telemetry_retention' }));
  await cleanupTelemetry();
  telemetryTimer = setInterval(cleanupTelemetry, 24 * 60 * 60 * 1000);
  telemetryTimer.unref();
  const cleanupPremium = () => pruneExpiredPremium().catch(() => null);
  await cleanupPremium();
  premiumTimer = setInterval(cleanupPremium, 60 * 60 * 1000);
  premiumTimer.unref();
  const databaseRetryMs = positiveInteger(process.env.DB_RETRY_MS, 60_000, 15_000, 15 * 60 * 1000);
  databaseTimer = setInterval(() => {
    checkDatabaseConnection().catch((error) => {
      console.error('Az adatbázis állapotellenőrzése sikertelen:', error.message);
    });
  }, databaseRetryMs);
  databaseTimer.unref();
  await client.login(process.env.DISCORD_TOKEN);
  engagementJobs = startEngagementJobs(client);
  platformJobs = require('./platform-jobs').start(client);
  chronoGuardJobs = startChronoGuardJobs(client);
}

start().catch((error) => {
  console.error('A bot nem tudott elindulni. Ellenőrizd a beállításokat.', error.message);
  requestRestart('A Discord kliens indulása sikertelen.', error);
});
