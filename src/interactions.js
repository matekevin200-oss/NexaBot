const {handleEconomyCommand,handleEconomyInteraction}=require('./economy-discord');
const crypto = require('node:crypto');
const {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { NAMES, COLORS, SUPPORT_GUILD_ID } = require('./constants');
const {
  ticketControls,
  ticketManagement,
  ticketRenameModal,
  closeConfirmation,
  deleteTicketButton,
  applicationControls,
  applicationContinue,
  orderModal,
  applicationModal,
  applicationModalPart2,
  moderationModal,
  moderationActionRows,
  timeoutChoices,
  moderationConfirmation,
  rolePicker,
  unbanPicker,
  staffPanel,
  channelModal,
  TGF_QUESTIONS
} = require('./panels');
const {
  byName,
  safeChannelName,
  isStaff,
  baseEmbed,
  getText,
  sendLog,
  ephemeralError
} = require('./utils');
const { setupServer } = require('./setup');
const {
  installDocumentPanels,
  handleDocumentButton,
  handleDocumentSelect,
  handleDocumentModal
} = require('./documents');
const {
  handleSecurityCommand,
  handleRaidDecision
} = require('./security');
const {
  configuredChannel,
  configuredRole,
  getGuildConfig,
  getModuleState,
  moduleEnabled,
  isBviGuild,
  isAiAllowedUser,
  getOwnerSettings,
  isBotOwner,
  isOwnerUser,
  dbQuery,
  dashboardUrl
} = require('./config');
const { isSupportModerationPaused } = require('./config');
const { supportModerationPayload, handleSupportModerationButton } = require('./support-moderation');
const {
  handleAiCommand,
  answerGuildAi,
  setPersonalMemoryConsent,
  rememberPersonal,
  rememberServer,
  personalMemories,
  clearPersonalMemories
} = require('./ai');
const { handleShiftButton, handleShiftCommand, shiftPanel, shiftStats, formatDuration } = require('./shifts');
const {
  handleCommunityCommand,
  handleGiveawayButton,
  handleSelfRoleSelect,
  handleRoleButton,
  rolePanel,
  userXp,
  levelForXp,
  createSuggestion,
  createPoll,
  createAnnouncement,
  startGiveaway
} = require('./community');
const {
  communityPanel,
  aiPanel,
  aiModal,
  aiMemoryModal,
  suggestionModal,
  pollModal,
  announcementModal,
  giveawayModal
} = require('./control-center');
const { handleModerationCommand, createModerationCase } = require('./moderation');
const { handleHelpCommand, handleHelpSelect } = require('./help');
const { saveTranscript } = require('./transcripts');
const { recordUsage, recordAudit, recordError } = require('./telemetry');
const { pick } = require('./i18n');
const { checkInteractionRate } = require('./rate-limit');
const { handleEngagementCommand, handleVerificationButton } = require('./engagement');
const { handleApplicationButton, handleApplicationModal } = require('./applications');
const { handleChronoGuardCommand } = require('./chronoguard');
const { handleAegisCommand } = require('./aegis');
const { handleMdtCommand, handleMdtButton, handleMdtReviewModal } = require('./belv-mdt');
const { handleDiscordSupportInteraction } = require('./web-support');
const { ticketOptions } = require('./workflow-options');
const { handleTicketOperations, handleTicketCommand, ticketExtraControls, isTicketStaff } = require('./ticket-operations');
const { canonicalCommandName } = require('./command-localizations');
const {
  auditCiaServer,
  auditSupportServer,
  isCiaInstallationComplete,
  refreshCiaAmericanRanks,
  repairCiaServer,
  repairSupportServer,
  setupCiaServer,
  setupSupportServer
} = require('./support-server');

const EPHEMERAL = MessageFlags.Ephemeral;
const applicationDrafts = new Map();

function applicationDraftKey(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function ticketOwner(channel) {
  const parts = channel?.topic?.split('|');
  return parts?.[0] === 'nexabot-ticket' ? parts[1] : null;
}

const ticketOpening = new Map();
async function createTicket(interaction, type, details = null, options = {}) {
  const key = `${interaction.guildId}:${interaction.user.id}`;
  if (ticketOpening.has(key)) return interaction.reply({ content: 'A ticketed létrehozása már folyamatban van. Várd meg az eredményt.', flags: EPHEMERAL });
  const pending = createTicketUnlocked(interaction, type, details, options);
  ticketOpening.set(key,pending);
  try { return await pending; } finally { if(ticketOpening.get(key)===pending) ticketOpening.delete(key); }
}
async function createTicketUnlocked(interaction, type, details = null, options = {}) {
  await interaction.deferReply({ flags: EPHEMERAL });
  if(!interaction.guild)return interaction.editReply('Ticketet Discord-szerveren nyithatsz.');
  const token=crypto.randomUUID(),key=`discord:${interaction.guildId}:${interaction.user.id}`;
  const acquired=await dbQuery(`INSERT INTO nexabot_ticket_open_locks(scope_key,lease_token,expires_at) VALUES($1,$2,NOW()+INTERVAL '2 minutes') ON CONFLICT(scope_key) DO UPDATE SET lease_token=EXCLUDED.lease_token,expires_at=EXCLUDED.expires_at WHERE nexabot_ticket_open_locks.expires_at<NOW() RETURNING scope_key`,[key,token]).catch(()=>null);
  if(!acquired)return interaction.editReply('A ticketadatbázis nem érhető el. Próbáld újra később.');
  if(!acquired.rowCount)return interaction.editReply('A ticketnyitásod már folyamatban van. Várd meg az eredményt.');
  try{return await createTicketPrepared(interaction,type,details,options);}
  finally{await dbQuery('DELETE FROM nexabot_ticket_open_locks WHERE scope_key=$1 AND lease_token=$2',[key,token]).catch(()=>null);}
}
async function createTicketPrepared(interaction,type,details,options) {
  const guild = interaction.guild;
  if (!moduleEnabled(guild.id, 'tickets')) {
    return interaction.editReply(pick(guild.id, 'A segítségkérő rendszer ezen a szerveren ki van kapcsolva.', 'The ticket system is disabled on this server.'));
  }
  const storeCheck = await dbQuery('SELECT 1 AS ready').catch(() => null);
  if (!storeCheck) return interaction.editReply('A ticketadatbázis nem érhető el. A ticket nem nyílt meg; próbáld újra később.');
  const guildConfig = getGuildConfig(guild.id);
  if (!options.supportGateway && type !== 'order' && !guildConfig.tickets.enabledTypes.includes(type)) {
    return interaction.editReply(pick(guild.id, 'Ez a ticketkategória ezen a szerveren nincs engedélyezve.', 'This ticket category is not enabled on this server.'));
  }
  const policy=ticketOptions(guildConfig.tickets);
  await guild.channels.fetch();
  const existing=[...guild.channels.cache.values()].filter(channel=>channel.topic?.startsWith(`nexabot-ticket|${interaction.user.id}|`)&&!channel.name.startsWith('lezart-'));
  if(existing.length>=policy.maxOpenPerUser)return interaction.editReply(`Legfeljebb ${policy.maxOpenPerUser} aktív ticketed lehet. Meglévő ügy: ${existing[0]}`);

  const staffRole = configuredRole(guild, 'staff', NAMES.staffRole);
  const ticketAgentIds=policy.categoryRoleIds[type]?.length?policy.categoryRoleIds[type]:[staffRole?.id,...policy.agentRoleIds];
  if (!ticketAgentIds.some(id=>guild.roles.cache.has(id))) {
    return interaction.editReply(pick(guild.id, 'A Staff rang nincs beállítva a webpanelen.', 'The Staff role is not configured on the web dashboard.'));
  }

  const english = guildConfig.language === 'en';
  const categories = english ? {
    order: { slug: 'order', title: '🛒 New development order' },
    support: { slug: 'support', title: '💡 New support case' },
    application: { slug: 'application', title: '📝 New application question' },
    report: { slug: 'report', title: '🚨 New report' },
    purchase: { slug: 'billing', title: '💳 New billing case' },
    partnership: { slug: 'partnership', title: '🤝 New partnership case' },
    other: { slug: 'other', title: '📨 New general case' }
  } : {
    order: { slug: 'rendeles', title: '🛒 Új fejlesztési rendelés' },
    support: { slug: 'segitseg', title: '💡 Új segítségkérés' },
    application: { slug: 'jelentkezes', title: '📝 Új TGF / jelentkezési kérdés' },
    report: { slug: 'bejelentes', title: '🚨 Új bejelentés' },
    purchase: { slug: 'szamlazas', title: '💳 Új vásárlási vagy számlázási ügy' },
    partnership: { slug: 'egyuttmukodes', title: '🤝 Új együttműködési ügy' },
    other: { slug: 'egyeb', title: '📨 Új általános ügy' }
  };
  const customType=policy.customTypes.find(item=>item.key===type);
  const categoryInfo = customType ? {slug:type,title:'📨 '+customType.label} : { ...(categories[type] || categories.support) };
  if (!options.supportGateway && type !== 'order' && guildConfig.tickets.labels?.[type]) {
    categoryInfo.title = `${type === 'application' ? '📝' : type === 'report' ? '🚨' : type === 'purchase' ? '💳' : type === 'partnership' ? '🤝' : type === 'other' ? '📨' : '💡'} ${guildConfig.tickets.labels[type]}`;
  }
  const ticketBot=guild.members.me||await guild.members.fetchMe();
  const channel = await require('./ticket-recovery').createTicketChannel(guild,{
    name: `${categoryInfo.slug}-${safeChannelName(interaction.user.username)}`,
    parent:policy.categoryIds[type]||null,
    type: ChannelType.GuildText,
    topic: `nexabot-ticket|${interaction.user.id}|${type}`,
    permissionOverwrites: [
      { id: ticketBot.id, allow: [PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.EmbedLinks] },
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      ...[...new Set(ticketAgentIds.filter(id=>id&&id!==guild.id&&guild.roles.cache.has(id)))].map(id=>({
        id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages
        ]      }))
    ],
    reason: `NexaBot ticket: ${interaction.user.tag}`
  });

  const embed = baseEmbed(
    categoryInfo.title,
    pick(guild.id, `${interaction.user}, köszönöm, hogy írtál! A staff hamarosan válaszol.`, `${interaction.user}, thank you for contacting us! The staff will respond shortly.`)
  );
  if (details) embed.addFields(details);
  for(const [label,value] of Object.entries(options.metadata?.extra||{})){if(value)embed.addFields({name:label.slice(0,45),value:String(value).slice(0,1000)});}
  embed.addFields({ name: pick(guild.id, 'Létrehozta', 'Created by'), value: `${interaction.user.tag} (${interaction.user.id})` });

  const savedTicket = await dbQuery(
    `INSERT INTO nexabot_tickets (guild_id, channel_id, owner_id, category, subject, priority, form_data,agent_role_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7,$8::jsonb) ON CONFLICT (channel_id) DO NOTHING RETURNING *`,
    [guild.id, channel.id, interaction.user.id, type, options.metadata?.subject || categoryInfo.title, options.metadata?.priority || 'normal', options.metadata || {},JSON.stringify(ticketAgentIds.filter(Boolean))]
  ).catch(() => null);
  if (!savedTicket?.rowCount) {
    await channel.delete('NEXA: új ticket adatbázismentése sikertelen').catch(() => null);
    return interaction.editReply('A ticket mentése nem sikerült. Próbáld újra később.');
  }
  let controlMessage;
  try{await require('./next-design').load(guild.id);controlMessage=await channel.send(require('./next-design').ticket(savedTicket.rows[0],guild,[ticketControls(guildConfig.language,guild.id),ticketExtraControls('open',policy)]));
  await dbQuery("UPDATE nexabot_tickets SET control_message_id=$1,discord_state='synced' WHERE channel_id=$2",[controlMessage.id,channel.id]);
  }catch(error){await dbQuery("UPDATE nexabot_tickets SET discord_state='failed' WHERE channel_id=$1",[channel.id]).catch(()=>null);await recordError(error,{command:'ticket_open_controls',guildId:guild.id,userId:interaction.user.id}).catch(()=>null);return interaction.editReply(`A ticket és a kérés mentve van: ${channel}. A vezérlőket a ticket-staff a /ticket javitas paranccsal állíthatja helyre.`);}
  await recordAudit('ticket_open', { actorId: interaction.user.id, guildId: guild.id, targetId: channel.id, metadata: { type } });
  await sendLog(guild, baseEmbed('🎫 Ticket létrehozva', `${interaction.user.tag} létrehozta: ${channel}`, COLORS.success));
  return interaction.editReply(pick(guild.id, `Elkészült a privát csatornád: ${channel}`, `Your private ticket is ready: ${channel}`));
}

async function createSupportTicket(interaction, type = 'support') {
  if (interaction.guildId !== SUPPORT_GUILD_ID) {
    return ephemeralError(interaction, 'A NEXA Support ticket kizárólag a hivatalos Support szerveren használható. Ezen a szerveren az általános Ügyintézési központot használd.');
  }
  return createTicket(interaction, type, null, { supportGateway: true });
}

async function handleCommand(interaction) {
  const canonicalName = canonicalCommandName(interaction.commandName);
  if (canonicalName !== interaction.commandName) {
    try {
      Object.defineProperty(interaction, 'commandName', { value: canonicalName, configurable: true, writable: true });
    } catch (_error) {
      interaction.commandName = canonicalName;
    }
  }
  if(interaction.commandName==='moderacio')return require('./platform-moderation').panel(interaction);
  if (['zene', 'music'].includes(interaction.commandName)) return require('./music').handleMusicCommand(interaction);
  if (['penz','gazdasag'].includes(interaction.commandName)) return handleEconomyCommand(interaction);
  if (interaction.commandName === 'help') return handleHelpCommand(interaction);
  if (interaction.commandName === 'chronoguard') return handleChronoGuardCommand(interaction);
  if (interaction.commandName === 'aegis') return handleAegisCommand(interaction);
  if (interaction.commandName === 'szobeli') return require('./belv-oral-exam').handleCommand(interaction);
  if (interaction.commandName === 'mdt') return handleMdtCommand(interaction);
  if (interaction.commandName === 'allomany') return require('./belv-mdt').handleBelvRosterCommand(interaction);
  if (interaction.commandName === 'belv-rendszer') return require('./belv-discipline').handleCommand(interaction);
  if (interaction.commandName === 'ticket') return handleTicketCommand(interaction);
  if (interaction.commandName === 'feladat') return require('./staff-workflow').handleCommand(interaction);
  if (interaction.commandName === 'cia') {
    if (!isBotOwner(interaction.user.id)) {
      return ephemeralError(interaction, 'A CIA telepítését, frissítését és újratelepítését kizárólag a NEXA Bot elsődleges tulajdonosa használhatja.');
    }
    if (!interaction.guild) {
      return ephemeralError(interaction, 'A CIA rendszer kizárólag Discord-szerveren telepíthető.');
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return ephemeralError(interaction, 'A CIA telepítéshez ezen a szerveren Rendszergazda jogosultsággal kell rendelkezned. Nem szükséges, hogy te legyél a szerver tulajdonosa.');
    }
    const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null);
    if (!botMember?.permissions.has(PermissionFlagsBits.Administrator)) {
      return ephemeralError(interaction, 'A teljes rang-, csatorna- és jogosultságtelepítéshez adj Rendszergazda jogosultságot a NEXA Bot rangjának.');
    }
    const action = interaction.options.getSubcommand();
    if (action === 'ellenorzes') {
      const audit = auditCiaServer(interaction.guild);
      const lines = [
        `**Telepítve:** ${isCiaInstallationComplete(interaction.guild) ? '✅ igen' : '— még nem'}`,
        `**Újratelepítés:** kizárólag a fő botowner: \`/cia ujratelepites\``,
        `**Struktúra:** ${audit.structureComplete ? '✅ teljes' : '⚠️ hiányos'}`,
        `**Adatbázis-jelző:** ${audit.databaseMarker ? '✅' : '—'}`,
        `**Discord-jelző:** ${audit.discordMarker ? '✅' : '—'}`
      ];
      for (const [label, missing] of [['rangok', audit.missingRoles], ['kategóriák', audit.missingCategories], ['csatornák', audit.missingChannels]]) {
        if (missing.length) lines.push(`**Hiányzó ${label}:** ${missing.length} — ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
      }
      lines.push(`**Struktúraverzió:** ${audit.version} → ${audit.targetVersion}`);
      return interaction.reply({ content: `## CIA rendszerellenőrzés\n${lines.join('\n')}`.slice(0, 1950), flags: EPHEMERAL });
    }
    if (action === 'rangok-frissitese') {
      await interaction.deferReply({ flags: EPHEMERAL });
      try {
        const result = await refreshCiaAmericanRanks(interaction.guild, interaction.client.user, interaction.member);
        await recordAudit('cia_american_ranks_refresh', {
          actorId: interaction.user.id,
          guildId: interaction.guildId,
          metadata: { roles: result.count, hierarchyUpdated: result.hierarchyUpdated }
        });
        return interaction.editReply(
          `✅ **Az amerikai CIA ranghierarchia elkészült.**\n` +
          `• ${result.count} rang frissítve\n` +
          `• A meglévő rangazonosítók és tagi hozzárendelések megmaradtak\n` +
          `• A sorrend és a két rangtájékoztató frissült\n` +
          `• A szerver csatornái, paneljei, kérdései és botüzenetei továbbra is magyarok\n` +
          `• Hierarchiapanel: ${result.hierarchyUpdated ? 'frissítve' : 'nem található, ezért kihagyva'}`
        );
      } catch (error) {
        await recordError(error, { command: 'cia rangok-frissitese', guildId: interaction.guildId, userId: interaction.user.id });
        if (error.code === 'CIA_NOT_INSTALLED') return interaction.editReply(`⚠️ ${error.message}`);
        if (error.code === 'CIA_INSTALLER_FINALIZED') return interaction.editReply(`🔒 ${error.message}`);
        if (error.code === 'CIA_INSTALL_RUNNING') return interaction.editReply(`⏳ ${error.message}`);
        return interaction.editReply(`❌ A rangfrissítés megszakadt: ${String(error.message || error).slice(0, 1200)}`);
      }
    }
    if (!['telepites', 'ujratelepites'].includes(action)) {
      return ephemeralError(interaction, 'Ismeretlen CIA művelet. Használd a /cia ellenorzes parancsot.');
    }
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      const reinstall = action === 'ujratelepites' || isCiaInstallationComplete(interaction.guild);
      const result = reinstall
        ? await repairCiaServer(interaction.guild, interaction.client.user, interaction.member)
        : await setupCiaServer(interaction.guild, interaction.client.user, interaction.member);
      await recordAudit(reinstall ? 'cia_server_owner_reinstall' : 'cia_server_one_time_install', {
        actorId: interaction.user.id,
        guildId: interaction.guildId,
        metadata: {
          roles: result.roleCount,
          categories: result.categoryCount,
          channels: result.channelCount,
          panels: result.published,
          documentPanels: result.documentPanels
        }
      });
      return interaction.editReply(
        `✅ **A teljes CIA frakciórendszer ${reinstall ? 'frissítése és újratelepítése' : 'telepítése'} elkészült.**\n` +
        `• ${result.roleCount} kezelt rang\n` +
        `• ${result.categoryCount} jogosultságkezelt kategória\n` +
        `• ${result.channelCount} szöveges és hangcsatorna\n` +
        `• ${result.published} panel, tájékoztató és dokumentumfelület\n` +
        `• Ultimate védelem, szolgálat, ticket, TGF és egyedi CIA-iratok beállítva\n\n` +
        `🔒 Az egyszeri végső frissítés felhasználva; további telepítés nem engedélyezett.\n` +
        (result.commandRemoved ? `A /cia parancs eltávolítva erről a szerverről, és újraindításkor sem kerül vissza.\n` : `A parancs lezárt; a törlés átmenetileg sikertelen, a bot induláskor újra megpróbálja.\n`) +
        (result.persistenceWarning ? `${result.persistenceWarning}\n` : '') +
        `A meglévő tagi rangok, ticketek és beszélgetések megmaradnak.`
      );
    } catch (error) {
      await recordError(error, { command: 'cia', guildId: interaction.guildId, userId: interaction.user.id });
      if (error.code === 'CIA_INSTALLER_FINALIZED') return interaction.editReply(`🔒 ${error.message}`);
      if (error.code === 'CIA_NOT_INSTALLED') return interaction.editReply(`⚠️ ${error.message}`);
      if (error.code === 'CIA_INSTALL_RUNNING') return interaction.editReply(`⏳ ${error.message}`);
      console.error('CIA telepítési hiba:', error);
      return interaction.editReply(`❌ A CIA művelet megszakadt: ${String(error.message || error).slice(0, 1200)}\nA hiba javítása után ugyanazzal a paranccsal folytathatod; a már létrehozott elemek azonosítóját megőrizzük.`);
    }
  }
  if (interaction.commandName === 'support-szerver') {
    if (interaction.guildId !== SUPPORT_GUILD_ID) {
      return ephemeralError(interaction, `A Support szerver telepítője kizárólag a hivatalos NEXA Support szerveren használható. Szerver ID: ${SUPPORT_GUILD_ID}`);
    }
    if (!isBotOwner(interaction.user.id)) {
      return ephemeralError(interaction, 'Ezt a telepítőt kizárólag a NEXA Bot elsődleges tulajdonosa használhatja.');
    }
    if (interaction.options.getSubcommand() === 'moderacio') {
      return interaction.reply({ ...supportModerationPayload(), flags: EPHEMERAL });
    }
    if (interaction.guild.ownerId !== interaction.user.id) {
      return ephemeralError(interaction, 'A teljes support-szerver telepítést csak egy általad tulajdonolt Discord-szerveren indíthatod el.');
    }
    const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null);
    if (!botMember?.permissions.has(PermissionFlagsBits.Administrator)) {
      return ephemeralError(interaction, 'A telepítéshez ideiglenesen Rendszergazda jogosultságot kell adnod a NEXA Bot rangjának.');
    }
    const action = interaction.options.getSubcommand();
    if (action === 'ellenorzes') {
      const audit = auditSupportServer(interaction.guild);
      const verification = getModuleState(interaction.guildId, 'verification');
      if (audit.complete && verification.enabled) {
        return interaction.reply({ content: '✅ A teljes NEXA Support szerverstruktúra megtalálható, és a tagellenőrzés aktív.', flags: EPHEMERAL });
      }
      if (audit.complete) {
        const reason = verification.remotelyDisabled
          ? 'az Owner Center globális vészkapcsolója tiltja'
          : verification.planAllowed
            ? 'a szerver beállításaiban ki van kapcsolva'
            : 'a szerver csomagja nem engedélyezi';
        return interaction.reply({
          content: `⚠️ A szerverstruktúra teljes, de a tagellenőrzés nem aktív, mert ${reason}.\nFuttasd: \`/support-szerver javitas\``,
          flags: EPHEMERAL
        });
      }
      const lines = [];
      if (audit.missingRoles.length) lines.push(`**Hiányzó rangok:** ${audit.missingRoles.join(', ')}`);
      if (audit.missingCategories.length) lines.push(`**Hiányzó kategóriák:** ${audit.missingCategories.join(', ')}`);
      if (audit.missingChannels.length) lines.push(`**Hiányzó csatornák:** ${audit.missingChannels.join(', ')}`);
      return interaction.reply({ content: `⚠️ A telepítés még nem teljes.\n${lines.join('\n')}`, flags: EPHEMERAL });
    }
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      if (action === 'javitas') {
        const repaired = await repairSupportServer(interaction.guild, interaction.client.user, interaction.user.id);
        await recordAudit('support_server_repair', {
          actorId: interaction.user.id,
          guildId: interaction.guildId,
          metadata: {
            panels: repaired.published,
            globalVerificationBlockRemoved: repaired.hadGlobalVerificationBlock
          }
        });
        if (!repaired.verification.enabled) {
          return interaction.editReply('❌ A javítás lefutott, de a tagellenőrzés még nem aktív. Nézd meg a Render naplót.');
        }
        return interaction.editReply(
          `✅ **A NEXA Support rendszer kijavítva.**\n` +
          `• Tagellenőrzés: aktív\n` +
          `• Ellenőrzött rang és csatorna: beállítva\n` +
          `• Panelek frissítve: ${repaired.published}\n` +
          `${repaired.hadGlobalVerificationBlock ? '• Globális tagellenőrzési tiltás: eltávolítva\n' : ''}` +
          `Most nyomd meg újra az **Ellenőrzés** gombot.`
        );
      }
      if (action === 'panelek') {
        const repaired = await repairSupportServer(interaction.guild, interaction.client.user, interaction.user.id);
        return interaction.editReply(`✅ **${repaired.published} English NEXA panels and information messages** have been refreshed.`);
      }
      if (action === 'angolositas') {
        const result = await setupSupportServer(interaction.guild, interaction.client.user, interaction.member);
        await recordAudit('support_server_english_migration', {
          actorId: interaction.user.id,
          guildId: interaction.guildId,
          metadata: { roles: result.roleCount, categories: result.categoryCount, channels: result.channelCount, panels: result.published }
        });
        return interaction.editReply(
          `✅ **The NEXA Support server now uses English by default.**\n` +
          `• Existing managed roles, categories and channels were renamed without deleting their history.\n` +
          `• ${result.published} English panels and information messages were published.\n` +
          `• Hungarian remains available through the **🇭🇺 Magyar** role and **🇭🇺・hungarian-chat**.\n` +
          `• New member, verification, ticket and role-selection messages now use English.`
        );
      }
      const result = await setupSupportServer(interaction.guild, interaction.client.user, interaction.member);
      await recordAudit('support_server_setup', {
        actorId: interaction.user.id,
        guildId: interaction.guildId,
        metadata: { roles: result.roleCount, categories: result.categoryCount, channels: result.channelCount, panels: result.published }
      });
      return interaction.editReply(
        `✅ **A NEXA Support szerver elkészült.**\n` +
        `• ${result.roleCount} rang\n` +
        `• ${result.categoryCount} kategória\n` +
        `• ${result.channelCount} csatorna\n` +
        `• ${result.published} panel és tájékoztató\n` +
        `• Ultimate csomag és szigorú védelem aktiválva\n\n` +
        `A Discord **Szerverbeállítások → Közösség engedélyezése** részét neked kell egyszer kézzel befejezned.`
      );
    } catch (error) {
      console.error('NEXA Support szerver telepítési hiba:', error);
      await recordError(error, { command: 'support-szerver', guildId: interaction.guildId, userId: interaction.user.id });
      return interaction.editReply('❌ A telepítés megszakadt. Ellenőrizd a NEXA ranghelyét és Rendszergazda jogosultságát, majd futtasd újra ugyanazt a parancsot. A telepítő biztonságosan folytatja a hiányzó elemekkel.');
    }
  }
  const engagementResult = await handleEngagementCommand(interaction);
  if (engagementResult !== false) return engagementResult;
  if (await handleModerationCommand(interaction)) return;
  if (interaction.commandName === 'beallitas') {
    return interaction.reply({
      content: `⚙️ **NexaBot webes kezelőfelület:**\n${dashboardUrl(interaction.guildId)}`,
      flags: EPHEMERAL
    });
  }
  if (interaction.commandName === 'vedelem') {
    return handleSecurityCommand(interaction);
  }
  if (interaction.commandName === 'nexa') return handleAiCommand(interaction);
  if (interaction.commandName === 'szolgalat') return handleShiftCommand(interaction);
  if (['szint', 'szint-ranglista', 'rank', 'leaderboard', 'otlet', 'szavazas', 'bejelentes', 'rangpanel', 'nyeremenyjatek', 'giveaway'].includes(interaction.commandName)) {
    return handleCommunityCommand(interaction);
  }
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !isOwnerUser(interaction.user.id)) {
    return ephemeralError(interaction, 'Ehhez rendszergazdai jogosultság szükséges.');
  }

  if (['telepites', 'dokumentum-panelek'].includes(interaction.commandName) && !isBotOwner(interaction.user.id)) {
    return ephemeralError(interaction, 'Telepítést és újratelepítést kizárólag a NEXA Bot elsődleges tulajdonosa indíthat. A szerveradminok a normál beállításokat használhatják.');
  }

  if (interaction.commandName === 'dokumentum-panelek') {
    if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) {
      return ephemeralError(interaction, 'Az RP dokumentumrendszer csak a kijelölt fő RP-szerveren használható, ha be van kapcsolva.');
    }
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      const result = await installDocumentPanels(interaction.guild, interaction.client.user);
      const missingText = result.missing.length
        ? `\n⚠️ **Nem talált meglévő csatornák:** ${result.missing.join(', ')}`
        : '';
      return interaction.editReply(
        `✅ **${result.installed.length} dokumentumpanel** elkészült vagy frissült. A bot nem hozott létre új csatornát.${missingText}`
      );
    } catch (error) {
      console.error('Dokumentumpanel-telepítési hiba:', error);
      return interaction.editReply('❌ A dokumentumpaneleket nem sikerült minden meglévő csatornában beállítani. Ellenőrizd a bot jogosultságait.');
    }
  }

  if (interaction.commandName !== 'telepites') return;
  if (!isBviGuild(interaction.guildId)) {
    return ephemeralError(interaction, 'A /telepites teljes RP-rendszere csak a kijelölt fő RP-szerveren használható. Más szervereket a /beallitas webes panelen állíts be.');
  }
  await interaction.deferReply({ flags: EPHEMERAL });
  try {
    const result = await setupServer(interaction.guild, interaction.client.user);
    await interaction.editReply(
      `✅ A NexaBot telepítése kész!\n**${result.roles.length} rang** és **${result.channels.length} csatorna** van beállítva. A kezelőpanelek is elkészültek.`
    );
  } catch (error) {
    console.error('Telepítési hiba:', error);
    await interaction.editReply('❌ Nem sikerült minden elemet létrehozni. Ellenőrizd, hogy a bot Rendszergazda jogosultsággal rendelkezik.');
  }
}

async function handleButton(interaction) {
  const id = interaction.customId;
  const language = interaction.guildId ? getGuildConfig(interaction.guildId).language : 'hu';

  if (id === 'engagement_verify') return handleVerificationButton(interaction);

  if (id.startsWith('center_ai') && !isAiAllowedUser(interaction.user.id)) {
    return ephemeralError(interaction, 'A Nexa AI használatához a bot tulajdonosának engedélye szükséges.');
  }

  if (id === 'center_ai') {
    if (!moduleEnabled(interaction.guildId, 'ai')) return ephemeralError(interaction, 'A Nexa AI ezen a szerveren ki van kapcsolva.');
    return interaction.reply({ ...aiPanel(getGuildConfig(interaction.guildId).language), flags: EPHEMERAL });
  }
  if (id === 'center_ai_ask') return interaction.showModal(aiModal(language));
  if (id === 'center_ai_dm') {
    if (!moduleEnabled(interaction.guildId, 'ai')) return ephemeralError(interaction, 'A Nexa AI ezen a szerveren ki van kapcsolva.');
    const sent = await interaction.user.send(
      '✨ **Nexa AI privát beszélgetés**\n\nÍrj ide bármilyen kérdést, és normál üzenetben válaszolok. A privát beszélgetést elkülönítve kezelem a szerverek adataitól.'
    ).then(() => true).catch(() => false);
    return interaction.reply({
      content: sent ? '✅ Írtam neked privátban. Nyisd meg a NexaBot üzenetét!' : '❌ Nem tudtam privát üzenetet küldeni. Engedélyezd a szervertagoktól érkező privát üzeneteket.',
      flags: EPHEMERAL
    });
  }
  if (id === 'center_ai_consent_on' || id === 'center_ai_consent_off') {
    const allowed = id.endsWith('_on');
    await setPersonalMemoryConsent(interaction.guildId, interaction.user.id, allowed);
    return interaction.reply({
      content: allowed
        ? '✅ A személyes AI-memóriád be van kapcsolva ezen a szerveren.'
        : '✅ A személyes memória kikapcsolva; az emlékeidet és előzményeidet töröltem.',
      flags: EPHEMERAL
    });
  }
  if (id === 'center_ai_memory_add') return interaction.showModal(aiMemoryModal('personal', language));
  if (id === 'center_ai_server_add') {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Szerverismeretet csak Staff vagy adminisztrátor adhat hozzá.');
    return interaction.showModal(aiMemoryModal('server', language));
  }
  if (id === 'center_ai_memory_view') {
    const memories = await personalMemories(interaction.guildId, interaction.user.id);
    const list = memories.map((item, index) => `${index + 1}. ${item.content}`).join('\n').slice(0, 1800);
    return interaction.reply({ content: list ? `🧠 **Személyes emlékeid:**\n${list}` : '🧠 Nincs elmentett személyes emléked.', flags: EPHEMERAL });
  }
  if (id === 'center_ai_memory_clear') {
    await clearPersonalMemories(interaction.guildId, interaction.user.id);
    return interaction.reply({ content: '✅ A személyes AI-emlékeidet és előzményeidet töröltem.', flags: EPHEMERAL });
  }
  if (id === 'center_ticket') return createTicket(interaction, 'support');
  if (id === 'center_shift') {
    if (!moduleEnabled(interaction.guildId, 'shift')) return ephemeralError(interaction, 'A szolgálatkezelő ezen a szerveren ki van kapcsolva.');
    return interaction.reply({ ...shiftPanel(), flags: EPHEMERAL });
  }
  if (id === 'center_moderation') {
    if (!moduleEnabled(interaction.guildId, 'moderation')) return ephemeralError(interaction, 'A moderációs rendszer ki van kapcsolva.');
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Ezt csak Staff vagy adminisztrátor használhatja.');
    const staffRole = configuredRole(interaction.guild, 'staff', NAMES.staffRole);
    return interaction.reply({ ...staffPanel(staffRole?.name || 'Staff', getGuildConfig(interaction.guildId).language), flags: EPHEMERAL });
  }
  if (id === 'center_community') {
    if (!moduleEnabled(interaction.guildId, 'suggestions')) return ephemeralError(interaction, 'A közösségi funkciók ezen a szerveren ki vannak kapcsolva.');
    return interaction.reply({ ...communityPanel(getGuildConfig(interaction.guildId).language), flags: EPHEMERAL });
  }
  if (id === 'center_profile') {
    const config = getGuildConfig(interaction.guildId);
    const [xp, monthly] = await Promise.all([
      userXp(interaction.guildId, interaction.user.id),
      shiftStats(interaction.guildId, interaction.user.id, 30)
    ]);
    return interaction.reply({
      embeds: [baseEmbed('👤 Saját NexaBot-profil', `${interaction.user}`, COLORS.primary)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: 'Közösségi szint', value: config.modules.levels ? `${levelForXp(xp)}. szint • ${xp} XP` : 'Kikapcsolva', inline: true },
          { name: 'Szolgálat • 30 nap', value: config.modules.shift ? `${formatDuration(monthly.seconds)} • ${monthly.shifts} műszak` : 'Kikapcsolva', inline: true }
        )],
      flags: EPHEMERAL
    });
  }
  if (id === 'center_roles') {
    if (!moduleEnabled(interaction.guildId, 'reactionRoles')) return ephemeralError(interaction, 'A rangpanel ezen a szerveren ki van kapcsolva.');
    const roleIds = getGuildConfig(interaction.guildId).community.selfRoles;
    if (!roleIds.length) return ephemeralError(interaction, 'Ezen a szerveren még nincsenek választható rangok beállítva.');
    return interaction.reply({ ...rolePanel(interaction.guild, roleIds), flags: EPHEMERAL });
  }
  if (id === 'center_security') {
    const config = getGuildConfig(interaction.guildId);
    if (!config.modules.protection) return ephemeralError(interaction, 'A szervervédelem ki van kapcsolva.');
    const sensitivity = { strict: 'Szigorú', medium: 'Közepes', relaxed: 'Enyhe' }[config.protection.sensitivity] || 'Közepes';
    return interaction.reply({
      embeds: [baseEmbed('🔒 NexaBot védelem', `**Állapot:** 🟢 aktív\n**Érzékenység:** ${sensitivity}\n\nSpam-, raid-, link-, meghívó-, frissfiók-, jogosulatlanbot-, csatorna-, rang-, webhook- és tömeges moderációs védelem.`, COLORS.success)],
      flags: EPHEMERAL
    });
  }
  if (id === 'center_rp') {
    if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) return ephemeralError(interaction, 'Az RP-rendszert ezen a szerveren az Owner nem engedélyezte.');
    return interaction.reply({
      embeds: [baseEmbed('🎭 RP ügyintézési rendszer', 'A jelentkezési, vizsgálati, fegyelmi és irattári adatlapokat a hozzájuk tartozó meglévő csatornák gombos paneljein éred el.', COLORS.primary)],
      flags: EPHEMERAL
    });
  }
  if (id === 'center_suggestion') return interaction.showModal(suggestionModal(language));
  if (['center_poll', 'center_announce', 'center_giveaway'].includes(id)) {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Ezt csak Staff vagy adminisztrátor használhatja.');
    if (id === 'center_poll') return interaction.showModal(pollModal(language));
    if (id === 'center_announce') return interaction.showModal(announcementModal(language));
    return interaction.showModal(giveawayModal(language));
  }

  if (id.startsWith('shift_')) return handleShiftButton(interaction);
  if (id === 'giveaway_join') return handleGiveawayButton(interaction);
  if (id.startsWith('community_role_toggle:')) return handleRoleButton(interaction);
  if (id.startsWith('security_raid_')) return handleRaidDecision(interaction);
  if (id.startsWith('tgf_')) return handleApplicationButton(interaction);
  if (id.startsWith('doc_')) {
    if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) {
      return ephemeralError(interaction, 'Az RP dokumentumrendszer itt nem használható.');
    }
    return handleDocumentButton(interaction);
  }

  if (id === 'ticket_support') return createTicket(interaction, 'support');
  if (id === 'support_ticket_open') return createSupportTicket(interaction, 'support');
  if (id === 'ticket_order') return interaction.showModal(orderModal());
  if (id === 'application_open') {
    if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) {
      return ephemeralError(interaction, 'Az RP jelentkezési rendszer jelenleg nem használható.');
    }
    return interaction.showModal(applicationModal());
  }
  if (id.startsWith('application_continue:')) {
    const applicantId = id.split(':')[1];
    if (applicantId !== interaction.user.id) {
      return ephemeralError(interaction, 'Ezt a TGF-et csak a jelentkező folytathatja.');
    }
    if (!applicationDrafts.has(applicationDraftKey(interaction))) {
      return ephemeralError(interaction, 'Az első rész lejárt. Kezdd újra a TGF-et a jelentkezési csatornában.');
    }
    return interaction.showModal(applicationModalPart2());
  }

  if (id === 'staff_channel') {
    if (!moduleEnabled(interaction.guildId, 'moderation')) return ephemeralError(interaction, 'A moderációs rendszer ki van kapcsolva.');
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Ezt csak staff tag vagy adminisztrátor használhatja.');
    return interaction.showModal(channelModal());
  }

  if (id === 'mod_unban_open') {
    if (!moduleEnabled(interaction.guildId, 'moderation')) return ephemeralError(interaction, 'A moderációs rendszer ki van kapcsolva.');
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Ezt csak staff tag vagy adminisztrátor használhatja.');
    await interaction.deferReply({ flags: EPHEMERAL });
    const bans = await interaction.guild.bans.fetch().catch(() => null);
    if (!bans) return interaction.editReply('❌ Nem sikerült lekérni a kitiltott felhasználókat. Ellenőrizd a bot jogosultságait.');
    if (!bans.size) return interaction.editReply('✅ Jelenleg nincs kitiltott felhasználó.');
    const visibleBans = [...bans.values()].slice(0, 25);
    return interaction.editReply({
      content: bans.size > 25
        ? 'Válaszd ki, kinek oldod fel a kitiltását. A lista az első 25 kitiltott felhasználót mutatja.'
        : 'Válaszd ki, kinek oldod fel a kitiltását.',
      components: [unbanPicker(visibleBans)]
    });
  }

  if (id.startsWith('mod_action:')) {
    if (!moduleEnabled(interaction.guildId, 'moderation')) return ephemeralError(interaction, 'A moderációs rendszer ki van kapcsolva.');
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Ezt csak staff tag vagy adminisztrátor használhatja.');
    const [, action, targetId] = id.split(':');
    if (action === 'timeout') {
      return interaction.update({
        content: `Válaszd ki a felfüggesztés időtartamát <@${targetId}> számára:`,
        embeds: [],
        components: [timeoutChoices(targetId, getGuildConfig(interaction.guildId).language)]
      });
    }
    if (action === 'kick' || action === 'ban') {
      return interaction.update({
        content: `Biztosan végrehajtod ezt a műveletet: **${action === 'kick' ? 'kirúgás' : 'kitiltás'}** – <@${targetId}>?`,
        embeds: [],
        components: [moderationConfirmation(action, targetId, getGuildConfig(interaction.guildId).language)]
      });
    }
    if (action === 'role_add' || action === 'role_remove') {
      return interaction.update({
        content: `Válaszd ki a ${action === 'role_add' ? 'hozzáadandó' : 'leveendő'} rangot <@${targetId}> számára:`,
        embeds: [],
        components: [rolePicker(action, targetId, getGuildConfig(interaction.guildId).language)]
      });
    }
    return interaction.showModal(moderationModal(action, targetId));
  }

  if (id.startsWith('mod_timeout:')) {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Ezt csak staff tag vagy adminisztrátor használhatja.');
    const [, duration, targetId] = id.split(':');
    const action = duration === 'custom' ? 'timeout_custom' : `timeout_${duration}`;
    return interaction.showModal(moderationModal(action, targetId));
  }

  if (id.startsWith('mod_confirm:')) {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Ezt csak staff tag vagy adminisztrátor használhatja.');
    const [, action, targetId] = id.split(':');
    return interaction.showModal(moderationModal(action, targetId));
  }

  if (id === 'mod_cancel') {
    return interaction.update({ content: 'A művelet megszakítva.', embeds: [], components: [] });
  }

  if (id === 'ticket_claim') {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Csak staff tag veheti fel a ticketet.');
    await dbQuery('UPDATE nexabot_tickets SET claimed_by = $1 WHERE channel_id = $2', [interaction.user.id, interaction.channelId]).catch(() => null);
    await recordAudit('ticket_claim', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: interaction.channelId });
    return interaction.reply({
      embeds: [baseEmbed('🙋 Ticket felvéve', `${interaction.user} foglalkozik ezzel az üggyel.`, COLORS.success)]
    });
  }

  if (id === 'ticket_unclaim') {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Csak staff tag adhatja vissza a ticketet.');
    await dbQuery('UPDATE nexabot_tickets SET claimed_by = NULL WHERE channel_id = $1', [interaction.channelId]).catch(() => null);
    await recordAudit('ticket_unclaim', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: interaction.channelId });
    return interaction.reply({ embeds: [baseEmbed('↩️ Ticket visszaadva', `${interaction.user} visszaadta a ticketet a staffnak.`, COLORS.warning)] });
  }

  if (id === 'ticket_transcript') {
    if (!isStaff(interaction.member) && interaction.user.id !== ticketOwner(interaction.channel)) {
      return ephemeralError(interaction, 'A transcriptet csak a ticket létrehozója vagy a staff kérheti le.');
    }
    await interaction.deferReply({ flags: EPHEMERAL });
    const transcript = await saveTranscript(interaction.channel);
    return interaction.editReply({ content: `✅ A transcript elkészült (${transcript.count} üzenet).`, files: [transcript.attachment] });
  }

  if (id === 'ticket_manage') {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Csak staff tag kezelheti a ticket résztvevőit.');
    return interaction.reply({ ...ticketManagement(getGuildConfig(interaction.guildId).language), flags: EPHEMERAL });
  }

  if (id === 'ticket_rename') {
    if (!isTicketStaff(interaction.member)) return ephemeralError(interaction, 'Csak staff tag nevezheti át a ticketet.');
    return interaction.showModal(ticketRenameModal(getGuildConfig(interaction.guildId).language));
  }

  if (id === 'ticket_close') {
    const ownerId = ticketOwner(interaction.channel);
    if (!isStaff(interaction.member) && interaction.user.id !== ownerId) {
      return ephemeralError(interaction, 'Ezt a ticketet csak a létrehozója vagy egy staff tag zárhatja le.');
    }
    return interaction.reply({
      content: 'Biztosan le szeretnéd zárni ezt a ticketet?',
      components: [closeConfirmation(getGuildConfig(interaction.guildId).language)],
      flags: EPHEMERAL
    });
  }

  if (id === 'ticket_close_cancel') {
    return interaction.update({ content: 'A lezárás megszakítva.', components: [] });
  }

  if (id === 'ticket_close_confirm') {
    const ownerId = ticketOwner(interaction.channel);
    if (!isStaff(interaction.member) && interaction.user.id !== ownerId) {
      return ephemeralError(interaction, 'Nincs jogosultságod a lezáráshoz.');
    }
    await interaction.update({ content: '✅ A ticket lezárása folyamatban…', components: [] });
    if (ownerId) {
      await interaction.channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => null);
    }
    if (!interaction.channel.name.startsWith('lezart-')) {
      await interaction.channel.setName(`lezart-${interaction.channel.name}`.slice(0, 100)).catch(() => null);
    }
    await interaction.channel.send({
      embeds: [baseEmbed('🔒 Ticket lezárva', `${interaction.user} lezárta ezt a ticketet.`, COLORS.warning)],
      components: [deleteTicketButton(getGuildConfig(interaction.guildId).language)]
    });
    const transcript = await saveTranscript(interaction.channel);
    await interaction.channel.send({ content: `📄 Automatikus ticket transcript • ${transcript.count} üzenet`, files: [transcript.attachment] }).catch(() => null);
    await dbQuery('UPDATE nexabot_tickets SET status = $1, closed_at = NOW() WHERE channel_id = $2', ['closed', interaction.channelId]).catch(() => null);
    await recordAudit('ticket_close', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: interaction.channelId });
    return sendLog(interaction.guild, baseEmbed('🔒 Ticket lezárva', `${interaction.channel.name} • ${interaction.user.tag}`, COLORS.warning));
  }

  if (id.startsWith('application_accept:') || id.startsWith('application_reject:')) {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Csak staff tag bírálhatja el a jelentkezést.');
    const [action, userId] = id.split(':');
    const accepted = action === 'application_accept';
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(accepted ? COLORS.success : COLORS.danger)
      .addFields({
        name: accepted ? '✅ Elfogadva' : '❌ Elutasítva',
        value: `${interaction.user} bírálta el.`
      });

    if (accepted && member) {
      const acceptedRole = byName(interaction.guild.roles.cache, NAMES.acceptedRole);
      if (acceptedRole) await member.roles.add(acceptedRole, 'Elfogadott NexaBot jelentkezés').catch(() => null);
    }
    await member?.send(
      accepted
        ? `✅ A **${interaction.guild.name}** szerveren elfogadták az RP jelentkezésedet! Keresd a vezetőséget a további teendőkért.`
        : `❌ A **${interaction.guild.name}** szerveren most nem fogadták el az RP jelentkezésedet.`
    ).catch(() => null);
    await interaction.update({ embeds: [embed], components: [] });
    return sendLog(
      interaction.guild,
      baseEmbed('📋 Jelentkezés elbírálva', `<@${userId}> • ${accepted ? 'Elfogadva' : 'Elutasítva'} • ${interaction.user.tag}`, accepted ? COLORS.success : COLORS.danger)
    );
  }
}

async function handleSelectMenu(interaction) {
  if (interaction.customId === 'nexabot_help_category') return handleHelpSelect(interaction);
  if (interaction.customId === 'shift_leave_review_select') return handleShiftButton(interaction);
  if (interaction.customId.startsWith('doc_target:')) {
    if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) {
      return ephemeralError(interaction, 'Az RP dokumentumrendszer itt nem használható.');
    }
    return handleDocumentSelect(interaction);
  }
  if (interaction.customId === 'ticket_category_select') return createTicket(interaction, interaction.values[0]);
  if (interaction.customId === 'support_ticket_category_select') return createSupportTicket(interaction, interaction.values[0]);
  if (interaction.customId === 'ticket_user_add' || interaction.customId === 'ticket_user_remove') {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Csak staff tag kezelheti a ticket résztvevőit.');
    const userId = interaction.values[0];
    const add = interaction.customId.endsWith('_add');
    if (!add && userId === ticketOwner(interaction.channel)) return ephemeralError(interaction, 'A ticket létrehozója nem távolítható el.');
    if (add) {
      await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
    } else {
      await interaction.channel.permissionOverwrites.delete(userId).catch(() => null);
    }
    await recordAudit(add ? 'ticket_user_add' : 'ticket_user_remove', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: userId, metadata: { channelId: interaction.channelId } });
    return interaction.update({ content: add ? `<@${userId}> hozzáadva a tickethez.` : `<@${userId}> eltávolítva a ticketből.`, components: [] });
  }
  if (interaction.customId === 'community_self_roles') return handleSelfRoleSelect(interaction);
  if (!moduleEnabled(interaction.guildId, 'moderation')) {
    return ephemeralError(interaction, 'A moderációs rendszer ezen a szerveren ki van kapcsolva.');
  }
  if (!isStaff(interaction.member)) {
    return ephemeralError(interaction, 'Ezt csak staff tag vagy adminisztrátor használhatja.');
  }

  if (interaction.customId === 'mod_target_select') {
    const targetId = interaction.values[0];
    const target = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!target) return ephemeralError(interaction, 'Nem találom a kiválasztott felhasználót a szerveren.');
    return interaction.reply({
      embeds: [
        baseEmbed(
          '🛡️ Moderációs művelet kiválasztása',
          `**Kiválasztott tag:** ${target}\n**Felhasználónév:** ${target.user.tag}\n\nVálaszd ki, mit szeretnél tenni vele.`,
          COLORS.neutral
        ).setThumbnail(target.user.displayAvatarURL())
      ],
      components: moderationActionRows(targetId, getGuildConfig(interaction.guildId).language),
      flags: EPHEMERAL
    });
  }

  if (interaction.customId.startsWith('mod_role_select:')) {
    const [, action, targetId] = interaction.customId.split(':');
    const roleId = interaction.values[0];
    return interaction.showModal(moderationModal(action, targetId, roleId));
  }

  if (interaction.customId === 'mod_unban_select') {
    const targetId = interaction.values[0];
    return interaction.showModal(moderationModal('unban', targetId));
  }
}

async function handleOrderSubmit(interaction) {
  const details = [
    { name: 'Szerver típusa', value: getText(interaction, 'order_type') },
    { name: 'Elképzelés', value: getText(interaction, 'order_details') },
    { name: 'Csomag', value: getText(interaction, 'order_package'), inline: true },
    { name: 'Határidő', value: getText(interaction, 'order_deadline') || 'Nincs megadva', inline: true }
  ];
  return createTicket(interaction, 'order', details);
}

async function handleApplicationPart1(interaction) {
  if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) {
    return ephemeralError(interaction, 'Az RP jelentkezési rendszer jelenleg nem használható.');
  }
  const answers = TGF_QUESTIONS.slice(0, 5).map((_question, index) =>
    getText(interaction, `app_q${index + 1}`)
  );
  applicationDrafts.set(applicationDraftKey(interaction), {
    answers,
    createdAt: Date.now()
  });
  return interaction.reply({
    content: '✅ Az első 5 válaszodat elmentettem. Nyomd meg a **Folytatás** gombot a 6–10. kérdéshez.',
    components: [applicationContinue(interaction.user.id)],
    flags: EPHEMERAL
  });
}

async function handleApplicationPart2(interaction) {
  await interaction.deferReply({ flags: EPHEMERAL });
  if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) {
    return interaction.editReply('❌ Az RP jelentkezési rendszer jelenleg nem használható.');
  }
  const reviewChannel = byName(interaction.guild.channels.cache, NAMES.applicationReviewChannel);
  if (!reviewChannel?.isTextBased()) {
    return interaction.editReply('A jelentkezési csatorna még nincs beállítva. Egy admin használja a **/telepites** parancsot.');
  }

  const key = applicationDraftKey(interaction);
  const draft = applicationDrafts.get(key);
  if (!draft) {
    return interaction.editReply('❌ Az első rész nem található. Kezdd újra a TGF-et a jelentkezési csatornában.');
  }
  const answers = [
    ...draft.answers,
    ...TGF_QUESTIONS.slice(5).map((_question, index) => getText(interaction, `app_q${index + 6}`))
  ];

  const embed = baseEmbed('🎭 Új RP jelentkezés', `${interaction.user} új RP jelentkezést küldött.`)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      ...TGF_QUESTIONS.map((question, index) => ({
        name: `${index + 1}. ${question}`,
        value: answers[index]
      })),
      { name: 'Discord-felhasználó', value: `${interaction.user.tag} (${interaction.user.id})` }
    );
  await reviewChannel.send({ embeds: [embed], components: [applicationControls(interaction.user.id)] });
  applicationDrafts.delete(key);
  await sendLog(interaction.guild, baseEmbed('📨 RP jelentkezés érkezett', `${interaction.user.tag} jelentkezést küldött.`, COLORS.success));
  return interaction.editReply('✅ Az RP jelentkezésedet elküldtük a vezetőségnek.');
}

function canActOn(interaction, target) {
  if (!target || target.id === interaction.user.id || target.id === interaction.guild.ownerId) return false;
  const actor = interaction.member;
  const isOwner = actor.id === interaction.guild.ownerId;
  const isAdmin = actor.permissions.has(PermissionFlagsBits.Administrator);
  return isOwner || isAdmin || actor.roles.highest.position > target.roles.highest.position;
}

function evidenceFields(evidence) {
  return evidence ? [{ name: 'Bizonyíték', value: evidence }] : [];
}

async function sendModerationDM(target, guildName, action, reason, extra = null) {
  const message = [
    `🛡️ Moderációs intézkedés történt veled a **${guildName}** szerveren.`,
    `**Művelet:** ${action}`,
    `**Indok:** ${reason}`
  ];
  if (extra) message.push(`**Részletek:** ${extra}`);
  return target.send(message.join('\n')).then(() => true).catch(() => false);
}

async function handleModerationSubmit(interaction) {
  if(!moduleEnabled(interaction.guildId,'moderation'))return ephemeralError(interaction,'Moderation disabled / A moderáció ki van kapcsolva.');
  const [,action,targetId,extraId]=interaction.customId.split(':'),reason=getText(interaction,'mod_reason'),evidence=getText(interaction,'mod_evidence');
  if(['role_add','role_remove'].includes(action)){await interaction.deferReply({flags:EPHEMERAL});try{await require('./platform-members').changeRole(interaction.guild,interaction.user.id,{targetId,roleId:extraId,add:action==='role_add',requestKey:interaction.id});return interaction.editReply('Role change saved / A rangmódosítás mentve.');}catch(error){return interaction.editReply(error.message);}}
  const commandName=action.startsWith('timeout_')?'timeout':action==='nickname'?'nick':action;
  if(!['ban','unban','kick','warn','timeout','untimeout','nick'].includes(commandName))return ephemeralError(interaction,'Unknown moderation action / Ismeretlen moderációs művelet.');
  let minutes=null;if(commandName==='timeout'){minutes=action==='timeout_custom'?Number(getText(interaction,'mod_minutes')):Number(action.split('_')[1]);if(!Number.isInteger(minutes)||minutes<1||minutes>40320)return ephemeralError(interaction,'Timeout: 1–40320 minutes / 1–40320 perc.');}
  const target=commandName==='unban'?null:await interaction.guild.members.fetch({user:targetId,force:true}).catch(()=>null);
  const adapter={id:interaction.id,commandName,guild:interaction.guild,guildId:interaction.guildId,user:interaction.user,member:interaction.member,client:interaction.client,channel:interaction.channel,channelId:interaction.channelId,options:{getString:name=>({indok:reason,bizonyitek:evidence,felhasznalo_id:targetId,becenev:commandName==='nick'?getText(interaction,'mod_nickname'):null}[name]??null),getUser:()=>target?.user||null,getInteger:name=>name==='perc'?minutes:0},reply:interaction.reply.bind(interaction),deferReply:interaction.deferReply.bind(interaction),editReply:interaction.editReply.bind(interaction)};
  await require('./platform-moderation').commandAccess(adapter);return handleModerationCommand(adapter);
}

async function handleChannelSubmit(interaction) {
  await interaction.deferReply({flags:EPHEMERAL});
  try{await require('./platform-core').manager(interaction.guild,interaction.user.id,PermissionFlagsBits.ManageChannels);}catch(error){return interaction.editReply(error.message);}
  const name = safeChannelName(getText(interaction, 'channel_name'));
  const topic = getText(interaction, 'channel_topic') || 'NexaBottal létrehozott csatorna';
  const access = getText(interaction, 'channel_access').toLowerCase();
  const isPrivate = access.includes('priv');
  if (!isPrivate && !access.includes('nyil')) {
    return interaction.editReply('❌ A hozzáféréshez ezt írd: **nyilvános** vagy **privát**.');
  }
  if (interaction.guild.channels.cache.some((channel) => channel.name === name)) {
    return interaction.editReply('❌ Már létezik ilyen nevű csatorna.');
  }
  const parent = byName(
    interaction.guild.channels.cache,
    isPrivate ? NAMES.staffCategory : NAMES.infoCategory
  );
  const channel = await interaction.guild.channels.create({
    name,
    topic,
    type: ChannelType.GuildText,
    parent: parent?.id,
    permissionOverwrites:isPrivate?[{id:interaction.guild.id,deny:[PermissionFlagsBits.ViewChannel]},{id:interaction.client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels]},{id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]}]:undefined,
    reason: `NexaBot csatorna: ${interaction.user.tag}`
  });
  if (parent&&!isPrivate) await channel.lockPermissions();
  await sendLog(interaction.guild, baseEmbed('➕ Csatorna létrehozva', `${channel} • ${isPrivate ? 'Privát' : 'Nyilvános'} • ${interaction.user.tag}`, COLORS.success));
  return interaction.editReply(`✅ A csatorna elkészült: ${channel}`);
}

async function handleControlCenterModal(interaction) {
  const id = interaction.customId;
  if (!interaction.guild) return ephemeralError(interaction, 'Ezt a panelt egy Discord-szerveren használd.');
  if (id.startsWith('center_ai') && !isAiAllowedUser(interaction.user.id)) {
    return ephemeralError(interaction, 'A Nexa AI használatához a bot tulajdonosának engedélye szükséges.');
  }
  if (id === 'center_ai_submit') {
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      const answer = await answerGuildAi(interaction.guild, interaction.user, getText(interaction, 'center_ai_question'));
      return interaction.editReply(`✨ **Nexa AI**\n${answer.slice(0, 1900)}`);
    } catch (error) {
      return interaction.editReply(`❌ ${error.message}`);
    }
  }
  if (id === 'center_ai_memory_add_submit' || id === 'center_ai_server_add_submit') {
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      const content = getText(interaction, 'center_ai_memory_text');
      if (id === 'center_ai_server_add_submit') {
        if (!isStaff(interaction.member)) return interaction.editReply('❌ Szerverismeretet csak Staff vagy adminisztrátor adhat hozzá.');
        await rememberServer(interaction.guildId, interaction.user.id, content);
      } else {
        await rememberPersonal(interaction.guildId, interaction.user.id, content);
      }
      return interaction.editReply('✅ A Nexa AI elmentette az emléket.');
    } catch (error) {
      return interaction.editReply(`❌ ${error.message}`);
    }
  }
  if (id === 'center_suggestion_submit') {
    if (!moduleEnabled(interaction.guildId, 'suggestions')) return ephemeralError(interaction, 'A közösségi funkciók ki vannak kapcsolva.');
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      const message = await createSuggestion(interaction.guild, interaction.user, getText(interaction, 'center_suggestion_text'));
      return interaction.editReply(`✅ Az ötleted megjelent itt: ${message.url}`);
    } catch (error) {
      return interaction.editReply(`❌ ${error.message}`);
    }
  }
  if (['center_poll_submit', 'center_announce_submit', 'center_giveaway_submit'].includes(id)) {
    if (!isStaff(interaction.member)) return ephemeralError(interaction, 'Ezt csak Staff vagy adminisztrátor használhatja.');
    if (!moduleEnabled(interaction.guildId, 'suggestions')) return ephemeralError(interaction, 'A közösségi funkciók ki vannak kapcsolva.');
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      if (id === 'center_poll_submit') {
        await createPoll(interaction.channel, interaction.user, getText(interaction, 'center_poll_question'), getText(interaction, 'center_poll_answers'));
        return interaction.editReply('✅ A szavazás elindult.');
      }
      if (id === 'center_announce_submit') {
        const channel = await createAnnouncement(
          interaction.guild,
          interaction.channel,
          interaction.user,
          getText(interaction, 'center_announce_title'),
          getText(interaction, 'center_announce_text'),
          getText(interaction, 'center_announce_image') || null
        );
        return interaction.editReply(`✅ A bejelentés megjelent itt: ${channel}`);
      }
      const minutes = Number.parseInt(getText(interaction, 'center_giveaway_minutes'), 10);
      const winners = Number.parseInt(getText(interaction, 'center_giveaway_winners'), 10);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) throw new Error('Az időtartam 1 és 10080 perc közötti szám legyen.');
      if (!Number.isInteger(winners) || winners < 1 || winners > 10) throw new Error('A nyertesek száma 1 és 10 közötti szám legyen.');
      await startGiveaway(interaction.client, interaction.guildId, interaction.channel, getText(interaction, 'center_giveaway_prize'), minutes, winners);
      return interaction.editReply('✅ A nyereményjáték elindult.');
    } catch (error) {
      return interaction.editReply(`❌ ${error.message}`);
    }
  }
}

async function handleModal(interaction) {
  if (interaction.customId === 'ticket_rename_submit') {
    if (!isTicketStaff(interaction.member)) return ephemeralError(interaction, 'Csak staff tag nevezheti át a ticketet.');
    const name = safeChannelName(getText(interaction, 'ticket_new_name'));
    await interaction.channel.setName(name, `NEXA ticket átnevezés: ${interaction.user.tag}`);
    await recordAudit('ticket_rename', { actorId: interaction.user.id, guildId: interaction.guildId, targetId: interaction.channelId, metadata: { name } });
    return interaction.reply({ content: `✅ A ticket új neve: **${name}**`, flags: EPHEMERAL });
  }
  if (interaction.customId.startsWith('center_')) return handleControlCenterModal(interaction);
  if (interaction.customId.startsWith('tgf_')) return handleApplicationModal(interaction);
  if (interaction.customId.startsWith('doc_')) {
    if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, 'bvi')) {
      return ephemeralError(interaction, 'Az RP dokumentumrendszer itt nem használható.');
    }
    return handleDocumentModal(interaction);
  }
  if (interaction.customId.startsWith('mod_submit:')) {
    return handleModerationSubmit(interaction);
  }
  const handlers = {
    order_submit: handleOrderSubmit,
    application_submit_part1: handleApplicationPart1,
    application_submit_part2: handleApplicationPart2,
    channel_submit: handleChannelSubmit
  };
  return handlers[interaction.customId]?.(interaction);
}

async function handleInteraction(interaction) {
  try {
    const rate = checkInteractionRate(interaction);
    if (!rate.allowed) {
      const seconds = Math.max(1, Math.ceil(rate.retryAfterMs / 1000));
      return ephemeralError(interaction, `Túl sok művelet érkezett. Próbáld újra ${seconds} másodperc múlva.`);
    }
    const owner = getOwnerSettings();
    if (!isOwnerUser(interaction.user.id) && owner.blacklistedUsers.includes(interaction.user.id)) {
      return ephemeralError(interaction, 'A NEXA Bot használata ennél a fióknál le van tiltva.');
    }
    if (interaction.guildId && !isOwnerUser(interaction.user.id) && owner.blacklistedGuilds.includes(interaction.guildId)) {
      return ephemeralError(interaction, 'A NEXA Bot ezen a szerveren le van tiltva.');
    }
    if (owner.maintenance && !isOwnerUser(interaction.user.id)) {
      return ephemeralError(interaction, owner.maintenanceMessage);
    }
    require('./next-design').load(interaction.guildId).catch(()=>null);require('./next-design').install(interaction);
    recordUsage('interaction', {
      guildId: interaction.guildId,
      userId: interaction.user.id,
      name: interaction.commandName || interaction.customId || interaction.type
    }).catch(()=>null);
    if (isSupportModerationPaused(interaction.guildId) && /^(?:mod_|moderation_)/.test(String(interaction.customId || ''))) {
      return ephemeralError(interaction, 'A Support moderációja szünetel; ez a moderációs művelet nem hajtható végre.');
    }
    if(String(interaction.customId||'').startsWith('nt:'))return await require('./next-ticket').handle(interaction);
    if(String(interaction.customId||'').startsWith('nxform:'))return await require('./next-commands').handle(interaction);
    if(String(interaction.customId||'').startsWith('n5:'))return await require('./next-discord').handle(interaction);
    if (interaction.isChatInputCommand()) { await require('./platform-moderation').commandAccess(interaction);if(await require('./next-commands').handle(interaction))return;return await handleCommand(interaction); }
    if ((interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) && String(interaction.customId || '').startsWith('eco:')) return await handleEconomyInteraction(interaction);
    if(interaction.isButton()&&['platform_mod_pause','platform_mod_resume'].includes(interaction.customId))return require('./platform-moderation').panel(interaction);
    if (interaction.isButton() && String(interaction.customId || '').startsWith('support_moderation_')) return await handleSupportModerationButton(interaction);
    if ((interaction.isButton() || interaction.isModalSubmit()) && String(interaction.customId || '').startsWith('websupport_')) return await handleDiscordSupportInteraction(interaction);
    if (interaction.isButton() && String(interaction.customId || '').startsWith('belv_oral:')) return await require('./belv-oral-exam').handleButton(interaction);
    if (interaction.isButton() && String(interaction.customId || '').startsWith('nexa_task:')) return await require('./staff-workflow').handleButton(interaction);
    if (interaction.isUserSelectMenu() && String(interaction.customId || '').startsWith('belv_oral:')) return await require('./belv-oral-exam').handleUserSelect(interaction);
    if (interaction.isStringSelectMenu() && String(interaction.customId || '').startsWith('belv_oral:')) return await require('./belv-oral-exam').handleButton(interaction);
    if (interaction.isButton() && String(interaction.customId || '').startsWith('mdt_')) return await handleMdtButton(interaction);
    if ((interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) && await handleTicketOperations(interaction, createTicket)) return;
    if (interaction.isButton()) return await handleButton(interaction);
    if (interaction.isUserSelectMenu() || interaction.isRoleSelectMenu() || interaction.isStringSelectMenu()) {
      return await handleSelectMenu(interaction);
    }
    if (interaction.isModalSubmit() && String(interaction.customId || '').startsWith('belv_oral_score:')) return await require('./belv-oral-exam').handleModal(interaction);
    if (interaction.isModalSubmit() && String(interaction.customId || '').startsWith('mdt_review:')) return await handleMdtReviewModal(interaction);
    if (interaction.isModalSubmit()) return await handleModal(interaction);
  } catch (error) {
    console.error('Interakciós hiba:', error);
    await recordError(error, {
      command: interaction.commandName || interaction.customId,
      guildId: interaction.guildId,
      userId: interaction.user?.id
    });
    const discordErrorCode = Number(error?.code ?? error?.rawError?.code);
    const userMessage = discordErrorCode === 50013
      ? 'A Nexának nincs meg egy szükséges Discord-jogosultsága ehhez a művelethez. Ellenőrizd a bot csatornajogosultságait.'
      : error.status
        ? error.message
        : 'Váratlan hiba történt. Próbáld újra; ha ismétlődik, küldd el a hiba időpontját a szerver adminjának.';
    await ephemeralError(interaction, userMessage).catch(() => null);
  }
}

module.exports = { handleInteraction, createTicket };
