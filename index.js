var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/constants.js
var require_constants = __commonJS({
  "src/constants.js"(exports2, module2) {
    var NAMES = Object.freeze({
      staffRole: "NexaDev Staff",
      memberRole: "K\xF6z\xF6ss\xE9gi tag",
      acceptedRole: "Felvett tag",
      infoCategory: "\u2501\u2501 INFORM\xC1CI\xD3K \u2501\u2501",
      ticketCategory: "\u2501\u2501 TICKETEK \u2501\u2501",
      staffCategory: "\u2501\u2501 STAFF \u2501\u2501",
      welcomeChannel: "\u{1F44B}\u30FB\xFCdv\xF6zl\xE9s",
      serviceChannel: "\u{1F3AB}\u30FB\xFCgyint\xE9z\xE9s",
      applicationChannel: "\u{1F4CB}\u30FBjelentkez\xE9s",
      staffPanelChannel: "\u{1F6E1}\uFE0F\u30FBstaff-vez\xE9rl\u0151",
      logsChannel: "\u{1F4D1}\u30FBnapl\xF3",
      warningsChannel: "\u26A0\uFE0F\u30FBfigyelmeztet\xE9sek",
      applicationReviewChannel: "\u{1F4E8}\u30FBjelentkez\xE9sek"
    });
    var COLORS = Object.freeze({
      primary: 8150271,
      success: 5431460,
      warning: 16038210,
      danger: 15686508,
      neutral: 2830922
    });
    module2.exports = { NAMES, COLORS };
  }
});

// src/panels.js
var require_panels = __commonJS({
  "src/panels.js"(exports2, module2) {
    var {
      ActionRowBuilder,
      ButtonBuilder,
      ButtonStyle,
      EmbedBuilder,
      ModalBuilder,
      TextInputBuilder,
      TextInputStyle
    } = require("discord.js");
    var { COLORS } = require_constants();
    var TGF_QUESTIONS = Object.freeze([
      "Mi\xE9rt szeretn\xE9l a Belv\xE9delmi Igazgat\xF3s\xE1ghoz csatlakozni?",
      "Mit gondolsz, mi a Belv\xE9delmi Igazgat\xF3s\xE1g legfontosabb feladata?",
      "Mit tenn\xE9l, ha szolg\xE1lat k\xF6zben azt l\xE1tn\xE1d, hogy egy rendv\xE9delmi dolgoz\xF3 vissza\xE9l a jogk\xF6r\xE9vel?",
      "Mit tenn\xE9l, ha egy n\xE1lad magasabb rang\xFA szem\xE9ly olyan utas\xEDt\xE1st adna, amely szerinted szab\xE1lyellenes?",
      "Mit jelent sz\xE1modra a szolg\xE1lati hierarchia, \xE9s mi\xE9rt fontos annak betart\xE1sa?",
      "Mit tenn\xE9l, ha egy m\xE1sik Belv\xE9delmi tag bizalmas inform\xE1ci\xF3t adna ki illet\xE9ktelen szem\xE9lynek?",
      "Hogyan j\xE1rn\xE1l el, ha egy ellen\u0151rz\xE9s sor\xE1n szab\xE1lytalans\xE1got \xE9szleln\xE9l egy m\xE1sik rendv\xE9delmi szervezetn\xE9l?",
      "Mit jelent a jogk\xF6rrel val\xF3 vissza\xE9l\xE9s? \xCDrj r\xE1 egy p\xE9ld\xE1t!",
      "Mi\xE9rt fontos a bizony\xEDt\xE9kok \xE9s a szolg\xE1lati int\xE9zked\xE9sek megfelel\u0151 dokument\xE1l\xE1sa?",
      "Mi\xE9rt gondolod \xFAgy, hogy alkalmas lenn\xE9l a Belv\xE9delmi Igazgat\xF3s\xE1g tagj\xE1nak?"
    ]);
    function row(...components) {
      return new ActionRowBuilder().addComponents(...components);
    }
    function input(customId, label, style, placeholder, required = true, maxLength = 1e3) {
      return new TextInputBuilder().setCustomId(customId).setLabel(label).setStyle(style).setPlaceholder(placeholder).setRequired(required).setMaxLength(maxLength);
    }
    function ticketPanel() {
      const embed = new EmbedBuilder().setColor(COLORS.primary).setTitle("\u{1F3AB} Seg\xEDts\xE9gk\xE9r\xE9s").setDescription(
        "**Seg\xEDts\xE9gre van sz\xFCks\xE9ged?**\n\nNyomd meg az al\xE1bbi gombot. A bot l\xE9trehoz neked egy priv\xE1t seg\xEDts\xE9gk\xE9r\u0151 csatorn\xE1t, amelyet csak te \xE9s a staff l\xE1t."
      ).addFields(
        { name: "\u{1F4AC} Miben k\xE9rhetsz seg\xEDts\xE9get?", value: "K\xE9rd\xE9s, probl\xE9ma, bejelent\xE9s vagy \xE1ltal\xE1nos \xFCgyint\xE9z\xE9s." }
      ).setFooter({ text: "NexaBot \u2022 Egyszerre csak egy akt\xEDv ticketed lehet." });
      const buttons = row(
        new ButtonBuilder().setCustomId("ticket_support").setLabel("Seg\xEDts\xE9gk\xE9r\xE9s l\xE9trehoz\xE1sa").setEmoji("\u{1F4AC}").setStyle(ButtonStyle.Primary)
      );
      return { embeds: [embed], components: [buttons] };
    }
    function applicationPanel() {
      const embed = new EmbedBuilder().setColor(COLORS.primary).setTitle("\u{1F3DB}\uFE0F Belv\xE9delmi Igazgat\xF3s\xE1g TGF").setDescription(
        "**Szeretn\xE9l csatlakozni a Belv\xE9delmi Igazgat\xF3s\xE1ghoz?**\n\n" + TGF_QUESTIONS.map((question, index) => `**${index + 1}.** ${question}`).join("\n\n") + "\n\nA TGF k\xE9t, egyenk\xE9nt 5 k\xE9rd\xE9ses r\xE9szb\u0151l \xE1ll. \xCDrj komoly, \u0151szinte \xE9s r\xE9szletes v\xE1laszokat \u2014 ezeket csak a vezet\u0151s\xE9g \xE9s a staff l\xE1tja."
      ).setFooter({ text: "NexaBot \u2022 Belv\xE9delmi TGF rendszer" });
      const buttons = row(
        new ButtonBuilder().setCustomId("application_open").setLabel("Belv\xE9delmi TGF megkezd\xE9se").setEmoji("\u{1F4DD}").setStyle(ButtonStyle.Primary)
      );
      return { embeds: [embed], components: [buttons] };
    }
    function staffPanel() {
      const embed = new EmbedBuilder().setColor(COLORS.neutral).setTitle("\u{1F6E1}\uFE0F NexaBot staff vez\xE9rl\u0151pult").setDescription("A m\u0171veletek csak a **NexaDev Staff** ranggal vagy szerverkezel\xE9si jogosults\xE1ggal haszn\xE1lhat\xF3k.").addFields(
        { name: "Moder\xE1ci\xF3", value: "Figyelmeztet\xE9s, id\u0151korl\xE1t \xE9s kir\xFAg\xE1s gombokkal.", inline: true },
        { name: "Szerverkezel\xE9s", value: "\xDAj nyilv\xE1nos vagy priv\xE1t csatorna l\xE9trehoz\xE1sa.", inline: true }
      );
      const moderation = row(
        new ButtonBuilder().setCustomId("staff_warn").setLabel("Figyelmeztet\xE9s").setEmoji("\u26A0\uFE0F").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("staff_timeout").setLabel("Id\u0151korl\xE1t").setEmoji("\u23F1\uFE0F").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("staff_kick").setLabel("Kir\xFAg\xE1s").setEmoji("\u{1F6AA}").setStyle(ButtonStyle.Danger)
      );
      const management = row(
        new ButtonBuilder().setCustomId("staff_channel").setLabel("Csatorna l\xE9trehoz\xE1sa").setEmoji("\u2795").setStyle(ButtonStyle.Primary)
      );
      return { embeds: [embed], components: [moderation, management] };
    }
    function ticketControls() {
      return row(
        new ButtonBuilder().setCustomId("ticket_claim").setLabel("Ticket felv\xE9tele").setEmoji("\u{1F64B}").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ticket_close").setLabel("Ticket lez\xE1r\xE1sa").setEmoji("\u{1F512}").setStyle(ButtonStyle.Danger)
      );
    }
    function closeConfirmation() {
      return row(
        new ButtonBuilder().setCustomId("ticket_close_confirm").setLabel("Igen, lez\xE1rom").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("ticket_close_cancel").setLabel("M\xE9gse").setStyle(ButtonStyle.Secondary)
      );
    }
    function deleteTicketButton() {
      return row(
        new ButtonBuilder().setCustomId("ticket_delete").setLabel("Ticket t\xF6rl\xE9se").setEmoji("\u{1F5D1}\uFE0F").setStyle(ButtonStyle.Danger)
      );
    }
    function applicationControls(userId) {
      return row(
        new ButtonBuilder().setCustomId(`application_accept:${userId}`).setLabel("Elfogad\xE1s").setEmoji("\u2705").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`application_reject:${userId}`).setLabel("Elutas\xEDt\xE1s").setEmoji("\u274C").setStyle(ButtonStyle.Danger)
      );
    }
    function applicationContinue(userId) {
      return row(
        new ButtonBuilder().setCustomId(`application_continue:${userId}`).setLabel("Folytat\xE1s: 6\u201310. k\xE9rd\xE9s").setEmoji("\u27A1\uFE0F").setStyle(ButtonStyle.Primary)
      );
    }
    function orderModal() {
      return new ModalBuilder().setCustomId("order_submit").setTitle("Discord-fejleszt\xE9s rendel\xE9se").addComponents(
        row(input("order_type", "Milyen szervert szeretn\xE9l?", TextInputStyle.Short, "P\xE9ld\xE1ul: RP, gaming, k\xF6z\xF6ss\xE9gi", true, 100)),
        row(input("order_details", "\xCDrd le az elk\xE9pzel\xE9sedet", TextInputStyle.Paragraph, "Milyen csatorn\xE1k, rangok \xE9s botok kellenek?", true, 1e3)),
        row(input("order_package", "Melyik csomag \xE9rdekel?", TextInputStyle.Short, "Mini / Standard / Pr\xE9mium / Egyedi", true, 60)),
        row(input("order_deadline", "Mikorra szeretn\xE9d?", TextInputStyle.Short, "P\xE9ld\xE1ul: 1 h\xE9ten bel\xFCl", false, 80))
      );
    }
    function applicationModal() {
      return new ModalBuilder().setCustomId("application_submit_part1").setTitle("Belv\xE9delmi TGF \u2022 1/2").addComponents(
        row(input("app_q1", "1. Csatlakoz\xE1si motiv\xE1ci\xF3d", TextInputStyle.Paragraph, "Mi\xE9rt szeretn\xE9l csatlakozni?", true, 350)),
        row(input("app_q2", "2. A Belv\xE9delem f\u0151 feladata", TextInputStyle.Paragraph, "Mi a Belv\xE9delmi Igazgat\xF3s\xE1g legfontosabb feladata?", true, 350)),
        row(input("app_q3", "3. Jogk\xF6rrel val\xF3 vissza\xE9l\xE9s", TextInputStyle.Paragraph, "Mit tenn\xE9l, ha vissza\xE9l\xE9st l\xE1tn\xE1l?", true, 350)),
        row(input("app_q4", "4. Szab\xE1lyellenes utas\xEDt\xE1s", TextInputStyle.Paragraph, "Mit tenn\xE9l szab\xE1lyellenes utas\xEDt\xE1s eset\xE9n?", true, 350)),
        row(input("app_q5", "5. Szolg\xE1lati hierarchia", TextInputStyle.Paragraph, "Mit jelent, \xE9s mi\xE9rt fontos betartani?", true, 350))
      );
    }
    function applicationModalPart2() {
      return new ModalBuilder().setCustomId("application_submit_part2").setTitle("Belv\xE9delmi TGF \u2022 2/2").addComponents(
        row(input("app_q6", "6. Bizalmas inform\xE1ci\xF3 kiad\xE1sa", TextInputStyle.Paragraph, "Mit tenn\xE9l inform\xE1ci\xF3 kisziv\xE1rogtat\xE1sakor?", true, 350)),
        row(input("app_q7", "7. M\xE1s szervezet szab\xE1lytalans\xE1ga", TextInputStyle.Paragraph, "Hogyan j\xE1rn\xE1l el az ellen\u0151rz\xE9s sor\xE1n?", true, 350)),
        row(input("app_q8", "8. Jogk\xF6rrel val\xF3 vissza\xE9l\xE9s p\xE9ld\xE1ja", TextInputStyle.Paragraph, "\xCDrd le a jelent\xE9s\xE9t \xE9s egy p\xE9ld\xE1t!", true, 350)),
        row(input("app_q9", "9. Dokument\xE1l\xE1s fontoss\xE1ga", TextInputStyle.Paragraph, "Mi\xE9rt fontos mindent megfelel\u0151en dokument\xE1lni?", true, 350)),
        row(input("app_q10", "10. Mi\xE9rt lenn\xE9l alkalmas?", TextInputStyle.Paragraph, "Mi\xE9rt lenn\xE9l alkalmas Belv\xE9delmi tagnak?", true, 350))
      );
    }
    function moderationModal(type) {
      const definitions = {
        warn: ["Figyelmeztet\xE9s", "warn_submit", false],
        timeout: ["Id\u0151korl\xE1t kioszt\xE1sa", "timeout_submit", true],
        kick: ["Tag kir\xFAg\xE1sa", "kick_submit", false]
      };
      const [title, customId, needsMinutes] = definitions[type];
      const components = [
        row(input("mod_user_id", "Felhaszn\xE1l\xF3 azonos\xEDt\xF3ja", TextInputStyle.Short, "P\xE9ld\xE1ul: 123456789012345678", true, 25))
      ];
      if (needsMinutes) {
        components.push(row(input("mod_minutes", "Id\u0151tartam percben", TextInputStyle.Short, "1\u201340320 perc", true, 6)));
      }
      components.push(row(input("mod_reason", "Indokl\xE1s", TextInputStyle.Paragraph, "Mi\xE9rt kapja a b\xFCntet\xE9st?", true, 500)));
      return new ModalBuilder().setCustomId(customId).setTitle(title).addComponents(...components);
    }
    function channelModal() {
      return new ModalBuilder().setCustomId("channel_submit").setTitle("\xDAj csatorna l\xE9trehoz\xE1sa").addComponents(
        row(input("channel_name", "Csatorna neve", TextInputStyle.Short, "P\xE9ld\xE1ul: fejleszt\u0151i-besz\xE9lget\xE9s", true, 80)),
        row(input("channel_topic", "Csatorna t\xE9m\xE1ja", TextInputStyle.Paragraph, "R\xF6vid le\xEDr\xE1s a csatorn\xE1r\xF3l", false, 500)),
        row(input("channel_access", "Hozz\xE1f\xE9r\xE9s", TextInputStyle.Short, "\xCDrd be: nyilv\xE1nos vagy priv\xE1t", true, 20))
      );
    }
    module2.exports = {
      ticketPanel,
      applicationPanel,
      staffPanel,
      ticketControls,
      closeConfirmation,
      deleteTicketButton,
      applicationControls,
      applicationContinue,
      orderModal,
      applicationModal,
      applicationModalPart2,
      moderationModal,
      channelModal,
      TGF_QUESTIONS
    };
  }
});

// src/utils.js
var require_utils = __commonJS({
  "src/utils.js"(exports2, module2) {
    var { EmbedBuilder, PermissionFlagsBits: PermissionFlagsBits2 } = require("discord.js");
    var { NAMES, COLORS } = require_constants();
    function byName(cache, name) {
      return cache.find((item) => item.name === name);
    }
    function safeChannelName(value) {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "uj-csatorna";
    }
    function isStaff(member) {
      return Boolean(
        member?.permissions?.has(PermissionFlagsBits2.ManageGuild) || member?.roles?.cache?.some((role) => role.name === NAMES.staffRole)
      );
    }
    function baseEmbed(title, description, color = COLORS.primary) {
      return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setFooter({ text: "NexaBot \u2022 NexaDev" }).setTimestamp();
    }
    function getText(interaction, customId) {
      return interaction.fields.getTextInputValue(customId).trim();
    }
    async function sendLog(guild, embed) {
      const channel = byName(guild.channels.cache, NAMES.logsChannel);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed] }).catch(() => null);
      }
    }
    async function ephemeralError(interaction, message) {
      const payload = { content: `\u274C ${message}`, flags: 64 };
      if (interaction.deferred || interaction.replied) return interaction.followUp(payload);
      return interaction.reply(payload);
    }
    module2.exports = {
      byName,
      safeChannelName,
      isStaff,
      baseEmbed,
      getText,
      sendLog,
      ephemeralError
    };
  }
});

// src/setup.js
var require_setup = __commonJS({
  "src/setup.js"(exports2, module2) {
    var { ChannelType, PermissionFlagsBits: PermissionFlagsBits2 } = require("discord.js");
    var { NAMES, COLORS } = require_constants();
    var { byName } = require_utils();
    var { ticketPanel, applicationPanel, staffPanel } = require_panels();
    async function ensureRole(guild, name, options = {}) {
      const existing = byName(guild.roles.cache, name);
      if (existing) return existing;
      return guild.roles.create({
        name,
        color: options.color,
        permissions: options.permissions || [],
        hoist: options.hoist || false,
        mentionable: false,
        reason: "NexaBot automatikus telep\xEDt\xE9s"
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
        reason: "NexaBot automatikus telep\xEDt\xE9s"
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
        reason: "NexaBot automatikus telep\xEDt\xE9s"
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
          PermissionFlagsBits2.ManageChannels,
          PermissionFlagsBits2.ManageMessages,
          PermissionFlagsBits2.KickMembers,
          PermissionFlagsBits2.ModerateMembers
        ]
      });
      await ensureRole(guild, NAMES.memberRole, { color: COLORS.neutral });
      await ensureRole(guild, NAMES.acceptedRole, { color: COLORS.success });
      const publicPermissions = [
        { id: guild.roles.everyone.id, allow: [PermissionFlagsBits2.ViewChannel] }
      ];
      const privatePermissions = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits2.ViewChannel] },
        {
          id: staffRole.id,
          allow: [
            PermissionFlagsBits2.ViewChannel,
            PermissionFlagsBits2.SendMessages,
            PermissionFlagsBits2.ReadMessageHistory,
            PermissionFlagsBits2.ManageMessages
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
    module2.exports = { setupServer };
  }
});

// src/interactions.js
var require_interactions = __commonJS({
  "src/interactions.js"(exports2, module2) {
    var {
      ChannelType,
      EmbedBuilder,
      MessageFlags,
      PermissionFlagsBits: PermissionFlagsBits2
    } = require("discord.js");
    var { NAMES, COLORS } = require_constants();
    var {
      ticketControls,
      closeConfirmation,
      deleteTicketButton,
      applicationControls,
      applicationContinue,
      orderModal,
      applicationModal,
      applicationModalPart2,
      moderationModal,
      channelModal,
      TGF_QUESTIONS
    } = require_panels();
    var {
      byName,
      safeChannelName,
      isStaff,
      baseEmbed,
      getText,
      sendLog,
      ephemeralError
    } = require_utils();
    var { setupServer } = require_setup();
    var EPHEMERAL = MessageFlags.Ephemeral;
    var applicationDrafts = /* @__PURE__ */ new Map();
    function applicationDraftKey(interaction) {
      return `${interaction.guildId}:${interaction.user.id}`;
    }
    function ticketOwner(channel) {
      const parts = channel?.topic?.split("|");
      return parts?.[0] === "nexabot-ticket" ? parts[1] : null;
    }
    async function createTicket(interaction, type, details = null) {
      await interaction.deferReply({ flags: EPHEMERAL });
      const guild = interaction.guild;
      const existing = guild.channels.cache.find(
        (channel2) => channel2.topic?.startsWith(`nexabot-ticket|${interaction.user.id}|`) && !channel2.name.startsWith("lezart-")
      );
      if (existing) {
        return interaction.editReply(`M\xE1r van egy akt\xEDv ticketed: ${existing}`);
      }
      const category = byName(guild.channels.cache, NAMES.ticketCategory);
      const staffRole = byName(guild.roles.cache, NAMES.staffRole);
      if (!category || !staffRole) {
        return interaction.editReply("A rendszer m\xE9g nincs telep\xEDtve. Egy admin haszn\xE1lja a **/telepites** parancsot.");
      }
      const label = type === "order" ? "rendeles" : "segitseg";
      const channel = await guild.channels.create({
        name: `${label}-${safeChannelName(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `nexabot-ticket|${interaction.user.id}|${type}`,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits2.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits2.ViewChannel,
              PermissionFlagsBits2.SendMessages,
              PermissionFlagsBits2.ReadMessageHistory,
              PermissionFlagsBits2.AttachFiles,
              PermissionFlagsBits2.EmbedLinks
            ]
          },
          {
            id: staffRole.id,
            allow: [
              PermissionFlagsBits2.ViewChannel,
              PermissionFlagsBits2.SendMessages,
              PermissionFlagsBits2.ReadMessageHistory,
              PermissionFlagsBits2.ManageMessages
            ]
          }
        ],
        reason: `NexaBot ticket: ${interaction.user.tag}`
      });
      const embed = baseEmbed(
        type === "order" ? "\u{1F6D2} \xDAj fejleszt\xE9si rendel\xE9s" : "\u{1F4AC} \xDAj seg\xEDts\xE9gk\xE9r\xE9s",
        `${interaction.user}, k\xF6sz\xF6n\xF6m, hogy \xEDrt\xE1l! A staff hamarosan v\xE1laszol.`
      );
      if (details) embed.addFields(details);
      embed.addFields({ name: "L\xE9trehozta", value: `${interaction.user.tag} (${interaction.user.id})` });
      await channel.send({
        content: `${interaction.user} <@&${staffRole.id}>`,
        embeds: [embed],
        components: [ticketControls()]
      });
      await sendLog(guild, baseEmbed("\u{1F3AB} Ticket l\xE9trehozva", `${interaction.user.tag} l\xE9trehozta: ${channel}`, COLORS.success));
      return interaction.editReply(`Elk\xE9sz\xFClt a priv\xE1t csatorn\xE1d: ${channel}`);
    }
    async function handleCommand(interaction) {
      if (interaction.commandName !== "telepites") return;
      if (!interaction.member.permissions.has(PermissionFlagsBits2.Administrator)) {
        return ephemeralError(interaction, "Ehhez rendszergazdai jogosults\xE1g sz\xFCks\xE9ges.");
      }
      await interaction.deferReply({ flags: EPHEMERAL });
      try {
        const result = await setupServer(interaction.guild, interaction.client.user);
        await interaction.editReply(
          `\u2705 A NexaBot telep\xEDt\xE9se k\xE9sz!
**${result.roles.length} rang** \xE9s **${result.channels.length} csatorna** van be\xE1ll\xEDtva. A kezel\u0151panelek is elk\xE9sz\xFCltek.`
        );
      } catch (error) {
        console.error("Telep\xEDt\xE9si hiba:", error);
        await interaction.editReply("\u274C Nem siker\xFClt minden elemet l\xE9trehozni. Ellen\u0151rizd, hogy a bot Rendszergazda jogosults\xE1ggal rendelkezik.");
      }
    }
    async function handleButton(interaction) {
      const id = interaction.customId;
      if (id === "ticket_support") return createTicket(interaction, "support");
      if (id === "ticket_order") return interaction.showModal(orderModal());
      if (id === "application_open") return interaction.showModal(applicationModal());
      if (id.startsWith("application_continue:")) {
        const applicantId = id.split(":")[1];
        if (applicantId !== interaction.user.id) {
          return ephemeralError(interaction, "Ezt a TGF-et csak a jelentkez\u0151 folytathatja.");
        }
        if (!applicationDrafts.has(applicationDraftKey(interaction))) {
          return ephemeralError(interaction, "Az els\u0151 r\xE9sz lej\xE1rt. Kezdd \xFAjra a TGF-et a jelentkez\xE9si csatorn\xE1ban.");
        }
        return interaction.showModal(applicationModalPart2());
      }
      if (id.startsWith("staff_")) {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag haszn\xE1lhatja.");
        if (id === "staff_warn") return interaction.showModal(moderationModal("warn"));
        if (id === "staff_timeout") return interaction.showModal(moderationModal("timeout"));
        if (id === "staff_kick") return interaction.showModal(moderationModal("kick"));
        if (id === "staff_channel") return interaction.showModal(channelModal());
      }
      if (id === "ticket_claim") {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Csak staff tag veheti fel a ticketet.");
        return interaction.reply({
          embeds: [baseEmbed("\u{1F64B} Ticket felv\xE9ve", `${interaction.user} foglalkozik ezzel az \xFCggyel.`, COLORS.success)]
        });
      }
      if (id === "ticket_close") {
        const ownerId = ticketOwner(interaction.channel);
        if (!isStaff(interaction.member) && interaction.user.id !== ownerId) {
          return ephemeralError(interaction, "Ezt a ticketet csak a l\xE9trehoz\xF3ja vagy egy staff tag z\xE1rhatja le.");
        }
        return interaction.reply({
          content: "Biztosan le szeretn\xE9d z\xE1rni ezt a ticketet?",
          components: [closeConfirmation()],
          flags: EPHEMERAL
        });
      }
      if (id === "ticket_close_cancel") {
        return interaction.update({ content: "A lez\xE1r\xE1s megszak\xEDtva.", components: [] });
      }
      if (id === "ticket_close_confirm") {
        const ownerId = ticketOwner(interaction.channel);
        if (!isStaff(interaction.member) && interaction.user.id !== ownerId) {
          return ephemeralError(interaction, "Nincs jogosults\xE1god a lez\xE1r\xE1shoz.");
        }
        await interaction.update({ content: "\u2705 A ticket lez\xE1r\xE1sa folyamatban\u2026", components: [] });
        if (ownerId) {
          await interaction.channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => null);
        }
        if (!interaction.channel.name.startsWith("lezart-")) {
          await interaction.channel.setName(`lezart-${interaction.channel.name}`.slice(0, 100)).catch(() => null);
        }
        await interaction.channel.send({
          embeds: [baseEmbed("\u{1F512} Ticket lez\xE1rva", `${interaction.user} lez\xE1rta ezt a ticketet.`, COLORS.warning)],
          components: [deleteTicketButton()]
        });
        return sendLog(interaction.guild, baseEmbed("\u{1F512} Ticket lez\xE1rva", `${interaction.channel.name} \u2022 ${interaction.user.tag}`, COLORS.warning));
      }
      if (id === "ticket_delete") {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Csak staff tag t\xF6r\xF6lhet ticketet.");
        await interaction.reply({ content: "\u{1F5D1}\uFE0F A csatorna 3 m\xE1sodperc m\xFAlva t\xF6rl\u0151dik." });
        setTimeout(() => interaction.channel.delete(`Ticket t\xF6r\xF6lve: ${interaction.user.tag}`).catch(() => null), 3e3);
        return;
      }
      if (id.startsWith("application_accept:") || id.startsWith("application_reject:")) {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Csak staff tag b\xEDr\xE1lhatja el a jelentkez\xE9st.");
        const [action, userId] = id.split(":");
        const accepted = action === "application_accept";
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(accepted ? COLORS.success : COLORS.danger).addFields({
          name: accepted ? "\u2705 Elfogadva" : "\u274C Elutas\xEDtva",
          value: `${interaction.user} b\xEDr\xE1lta el.`
        });
        if (accepted && member) {
          const acceptedRole = byName(interaction.guild.roles.cache, NAMES.acceptedRole);
          if (acceptedRole) await member.roles.add(acceptedRole, "Elfogadott NexaBot jelentkez\xE9s").catch(() => null);
        }
        await member?.send(
          accepted ? `\u2705 A **${interaction.guild.name}** szerveren elfogadt\xE1k a Belv\xE9delmi TGF-edet! Keresd a vezet\u0151s\xE9get a tov\xE1bbi teend\u0151k\xE9rt.` : `\u274C A **${interaction.guild.name}** szerveren most nem fogadt\xE1k el a Belv\xE9delmi TGF-edet.`
        ).catch(() => null);
        await interaction.update({ embeds: [embed], components: [] });
        return sendLog(
          interaction.guild,
          baseEmbed("\u{1F4CB} Jelentkez\xE9s elb\xEDr\xE1lva", `<@${userId}> \u2022 ${accepted ? "Elfogadva" : "Elutas\xEDtva"} \u2022 ${interaction.user.tag}`, accepted ? COLORS.success : COLORS.danger)
        );
      }
    }
    async function handleOrderSubmit(interaction) {
      const details = [
        { name: "Szerver t\xEDpusa", value: getText(interaction, "order_type") },
        { name: "Elk\xE9pzel\xE9s", value: getText(interaction, "order_details") },
        { name: "Csomag", value: getText(interaction, "order_package"), inline: true },
        { name: "Hat\xE1rid\u0151", value: getText(interaction, "order_deadline") || "Nincs megadva", inline: true }
      ];
      return createTicket(interaction, "order", details);
    }
    async function handleApplicationPart1(interaction) {
      const answers = TGF_QUESTIONS.slice(0, 5).map(
        (_question, index) => getText(interaction, `app_q${index + 1}`)
      );
      applicationDrafts.set(applicationDraftKey(interaction), {
        answers,
        createdAt: Date.now()
      });
      return interaction.reply({
        content: "\u2705 Az els\u0151 5 v\xE1laszodat elmentettem. Nyomd meg a **Folytat\xE1s** gombot a 6\u201310. k\xE9rd\xE9shez.",
        components: [applicationContinue(interaction.user.id)],
        flags: EPHEMERAL
      });
    }
    async function handleApplicationPart2(interaction) {
      await interaction.deferReply({ flags: EPHEMERAL });
      const reviewChannel = byName(interaction.guild.channels.cache, NAMES.applicationReviewChannel);
      if (!reviewChannel?.isTextBased()) {
        return interaction.editReply("A jelentkez\xE9si csatorna m\xE9g nincs be\xE1ll\xEDtva. Egy admin haszn\xE1lja a **/telepites** parancsot.");
      }
      const key = applicationDraftKey(interaction);
      const draft = applicationDrafts.get(key);
      if (!draft) {
        return interaction.editReply("\u274C Az els\u0151 r\xE9sz nem tal\xE1lhat\xF3. Kezdd \xFAjra a TGF-et a jelentkez\xE9si csatorn\xE1ban.");
      }
      const answers = [
        ...draft.answers,
        ...TGF_QUESTIONS.slice(5).map((_question, index) => getText(interaction, `app_q${index + 6}`))
      ];
      const embed = baseEmbed("\u{1F3DB}\uFE0F \xDAj Belv\xE9delmi TGF", `${interaction.user} \xFAj Belv\xE9delmi TGF-et k\xFCld\xF6tt.`).setThumbnail(interaction.user.displayAvatarURL()).addFields(
        ...TGF_QUESTIONS.map((question, index) => ({
          name: `${index + 1}. ${question}`,
          value: answers[index]
        })),
        { name: "Discord-felhaszn\xE1l\xF3", value: `${interaction.user.tag} (${interaction.user.id})` }
      );
      await reviewChannel.send({ embeds: [embed], components: [applicationControls(interaction.user.id)] });
      applicationDrafts.delete(key);
      await sendLog(interaction.guild, baseEmbed("\u{1F4E8} Belv\xE9delmi TGF \xE9rkezett", `${interaction.user.tag} TGF-et k\xFCld\xF6tt.`, COLORS.success));
      return interaction.editReply("\u2705 A Belv\xE9delmi TGF-edet elk\xFCldt\xFCk a vezet\u0151s\xE9gnek.");
    }
    async function fetchTarget(interaction) {
      const userId = getText(interaction, "mod_user_id").replace(/\D/g, "");
      if (!userId) return null;
      return interaction.guild.members.fetch(userId).catch(() => null);
    }
    async function handleWarnSubmit(interaction) {
      if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag haszn\xE1lhatja.");
      await interaction.deferReply({ flags: EPHEMERAL });
      const target = await fetchTarget(interaction);
      if (!target) return interaction.editReply("\u274C Nem tal\xE1lom ezt a felhaszn\xE1l\xF3t a szerveren.");
      const reason = getText(interaction, "mod_reason");
      const embed = baseEmbed("\u26A0\uFE0F Figyelmeztet\xE9s", `${target} figyelmeztet\xE9st kapott.`, COLORS.warning).addFields(
        { name: "Indok", value: reason },
        { name: "Staff", value: `${interaction.user.tag} (${interaction.user.id})` }
      ).setFooter({ text: `NexaBot \u2022 Felhaszn\xE1l\xF3 ID: ${target.id}` });
      const warningChannel = byName(interaction.guild.channels.cache, NAMES.warningsChannel);
      await warningChannel?.send({ embeds: [embed] }).catch(() => null);
      await target.send(`\u26A0\uFE0F Figyelmeztet\xE9st kapt\xE1l a **${interaction.guild.name}** szerveren.
**Indok:** ${reason}`).catch(() => null);
      await sendLog(interaction.guild, embed);
      return interaction.editReply(`\u2705 ${target.user.tag} figyelmeztet\xE9se r\xF6gz\xEDtve.`);
    }
    async function handleTimeoutSubmit(interaction) {
      if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag haszn\xE1lhatja.");
      await interaction.deferReply({ flags: EPHEMERAL });
      const target = await fetchTarget(interaction);
      if (!target) return interaction.editReply("\u274C Nem tal\xE1lom ezt a felhaszn\xE1l\xF3t a szerveren.");
      const minutes = Number.parseInt(getText(interaction, "mod_minutes"), 10);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 40320) {
        return interaction.editReply("\u274C Az id\u0151tartam 1 \xE9s 40320 perc k\xF6z\xF6tt lehet.");
      }
      if (!target.moderatable) return interaction.editReply("\u274C Ezt a tagot a bot rangsorrend vagy jogosults\xE1g miatt nem tudja id\u0151korl\xE1tozni.");
      const reason = getText(interaction, "mod_reason");
      await target.timeout(minutes * 6e4, `${reason} \u2022 ${interaction.user.tag}`);
      await sendLog(
        interaction.guild,
        baseEmbed("\u23F1\uFE0F Id\u0151korl\xE1t kiosztva", `${target} \u2022 **${minutes} perc**
Indok: ${reason}
Staff: ${interaction.user}`, COLORS.warning)
      );
      return interaction.editReply(`\u2705 ${target.user.tag} ${minutes} perces id\u0151korl\xE1tot kapott.`);
    }
    async function handleKickSubmit(interaction) {
      if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag haszn\xE1lhatja.");
      await interaction.deferReply({ flags: EPHEMERAL });
      const target = await fetchTarget(interaction);
      if (!target) return interaction.editReply("\u274C Nem tal\xE1lom ezt a felhaszn\xE1l\xF3t a szerveren.");
      if (!target.kickable) return interaction.editReply("\u274C Ezt a tagot a bot rangsorrend vagy jogosults\xE1g miatt nem tudja kir\xFAgni.");
      const reason = getText(interaction, "mod_reason");
      const tag = target.user.tag;
      await target.send(`\u{1F6AA} Kir\xFAgtak a **${interaction.guild.name}** szerverr\u0151l.
**Indok:** ${reason}`).catch(() => null);
      await target.kick(`${reason} \u2022 ${interaction.user.tag}`);
      await sendLog(interaction.guild, baseEmbed("\u{1F6AA} Tag kir\xFAgva", `${tag}
Indok: ${reason}
Staff: ${interaction.user}`, COLORS.danger));
      return interaction.editReply(`\u2705 ${tag} elt\xE1vol\xEDtva a szerverr\u0151l.`);
    }
    async function handleChannelSubmit(interaction) {
      if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag haszn\xE1lhatja.");
      await interaction.deferReply({ flags: EPHEMERAL });
      const name = safeChannelName(getText(interaction, "channel_name"));
      const topic = getText(interaction, "channel_topic") || "NexaBottal l\xE9trehozott csatorna";
      const access = getText(interaction, "channel_access").toLowerCase();
      const isPrivate = access.includes("priv");
      if (!isPrivate && !access.includes("nyil")) {
        return interaction.editReply("\u274C A hozz\xE1f\xE9r\xE9shez ezt \xEDrd: **nyilv\xE1nos** vagy **priv\xE1t**.");
      }
      if (interaction.guild.channels.cache.some((channel2) => channel2.name === name)) {
        return interaction.editReply("\u274C M\xE1r l\xE9tezik ilyen nev\u0171 csatorna.");
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
        reason: `NexaBot csatorna: ${interaction.user.tag}`
      });
      if (parent) await channel.lockPermissions().catch(() => null);
      await sendLog(interaction.guild, baseEmbed("\u2795 Csatorna l\xE9trehozva", `${channel} \u2022 ${isPrivate ? "Priv\xE1t" : "Nyilv\xE1nos"} \u2022 ${interaction.user.tag}`, COLORS.success));
      return interaction.editReply(`\u2705 A csatorna elk\xE9sz\xFClt: ${channel}`);
    }
    async function handleModal(interaction) {
      const handlers = {
        order_submit: handleOrderSubmit,
        application_submit_part1: handleApplicationPart1,
        application_submit_part2: handleApplicationPart2,
        warn_submit: handleWarnSubmit,
        timeout_submit: handleTimeoutSubmit,
        kick_submit: handleKickSubmit,
        channel_submit: handleChannelSubmit
      };
      return handlers[interaction.customId]?.(interaction);
    }
    async function handleInteraction2(interaction) {
      try {
        if (interaction.isChatInputCommand()) return await handleCommand(interaction);
        if (interaction.isButton()) return await handleButton(interaction);
        if (interaction.isModalSubmit()) return await handleModal(interaction);
      } catch (error) {
        console.error("Interakci\xF3s hiba:", error);
        await ephemeralError(interaction, "V\xE1ratlan hiba t\xF6rt\xE9nt. Ellen\u0151rizd a bot jogosults\xE1gait, majd pr\xF3b\xE1ld \xFAjra.").catch(() => null);
      }
    }
    module2.exports = { handleInteraction: handleInteraction2, createTicket };
  }
});

// src/events.js
var require_events = __commonJS({
  "src/events.js"(exports2, module2) {
    var { Events: Events2 } = require("discord.js");
    var { NAMES, COLORS } = require_constants();
    var { byName, baseEmbed, sendLog } = require_utils();
    function registerEvents2(client2) {
      client2.on(Events2.GuildMemberAdd, async (member) => {
        const memberRole = byName(member.guild.roles.cache, NAMES.memberRole);
        if (memberRole) await member.roles.add(memberRole, "NexaBot automatikus rang").catch(() => null);
        const welcomeChannel = byName(member.guild.channels.cache, NAMES.welcomeChannel);
        if (welcomeChannel?.isTextBased()) {
          const welcome = baseEmbed(
            `\u{1F44B} \xDCdv\xF6zl\xFCnk, ${member.user.globalName || member.user.username}!`,
            `${member}, \xF6r\xFCl\xFCnk, hogy csatlakozt\xE1l a **${member.guild.name}** k\xF6z\xF6ss\xE9g\xE9hez.
N\xE9zd \xE1t az inform\xE1ci\xF3kat, majd haszn\xE1ld az \xFCgyint\xE9z\xE9si panelt, ha seg\xEDts\xE9gre van sz\xFCks\xE9ged.`,
            COLORS.primary
          ).setThumbnail(member.user.displayAvatarURL()).addFields({ name: "Tagl\xE9tsz\xE1m", value: `${member.guild.memberCount} f\u0151`, inline: true });
          await welcomeChannel.send({ content: `${member}`, embeds: [welcome] }).catch(() => null);
        }
        await sendLog(member.guild, baseEmbed("\u{1F4E5} Tag csatlakozott", `${member.user.tag} (${member.id})`, COLORS.success));
      });
      client2.on(Events2.GuildMemberRemove, async (member) => {
        await sendLog(member.guild, baseEmbed("\u{1F4E4} Tag t\xE1vozott", `${member.user.tag} (${member.id})`, COLORS.warning));
      });
      client2.on(Events2.MessageDelete, async (message) => {
        if (!message.guild || message.author?.bot) return;
        const author = message.author ? `${message.author.tag} (${message.author.id})` : "Ismeretlen felhaszn\xE1l\xF3";
        await sendLog(
          message.guild,
          baseEmbed("\u{1F5D1}\uFE0F \xDCzenet t\xF6r\xF6lve", `**Csatorna:** ${message.channel}
**Szerz\u0151:** ${author}`, COLORS.warning)
        );
      });
      client2.on(Events2.ChannelCreate, async (channel) => {
        if (!channel.guild) return;
        await sendLog(channel.guild, baseEmbed("\u2795 Csatorna l\xE9trehozva", `**N\xE9v:** ${channel.name}
**ID:** ${channel.id}`, COLORS.success));
      });
      client2.on(Events2.ChannelDelete, async (channel) => {
        if (!channel.guild) return;
        await sendLog(channel.guild, baseEmbed("\u2796 Csatorna t\xF6r\xF6lve", `**N\xE9v:** ${channel.name}
**ID:** ${channel.id}`, COLORS.danger));
      });
      client2.on(Events2.GuildRoleCreate, async (role) => {
        await sendLog(role.guild, baseEmbed("\u{1F3F7}\uFE0F Rang l\xE9trehozva", `**N\xE9v:** ${role.name}
**ID:** ${role.id}`, COLORS.success));
      });
      client2.on(Events2.GuildRoleDelete, async (role) => {
        await sendLog(role.guild, baseEmbed("\u{1F3F7}\uFE0F Rang t\xF6r\xF6lve", `**N\xE9v:** ${role.name}
**ID:** ${role.id}`, COLORS.danger));
      });
      client2.on(Events2.GuildBanAdd, async (ban) => {
        await sendLog(ban.guild, baseEmbed("\u{1F528} Felhaszn\xE1l\xF3 kitiltva", `${ban.user.tag} (${ban.user.id})`, COLORS.danger));
      });
      client2.on(Events2.GuildBanRemove, async (ban) => {
        await sendLog(ban.guild, baseEmbed("\u{1F513} Kitilt\xE1s feloldva", `${ban.user.tag} (${ban.user.id})`, COLORS.success));
      });
    }
    module2.exports = { registerEvents: registerEvents2 };
  }
});

// src/index.js
require("dotenv").config();
var http = require("node:http");
var {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
var { handleInteraction } = require_interactions();
var { registerEvents } = require_events();
var requiredVariables = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
var missingVariables = requiredVariables.filter((name) => !process.env[name]);
if (missingVariables.length) {
  console.error(`Hi\xE1nyz\xF3 k\xF6rnyezeti v\xE1ltoz\xF3k: ${missingVariables.join(", ")}`);
  process.exit(1);
}
var client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});
var command = new SlashCommandBuilder().setName("telepites").setDescription("L\xE9trehozza vagy friss\xEDti a NexaBot gombos rendszer\xE9t.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false);
async function registerCommand() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: [command.toJSON()] }
  );
}
client.once(Events.ClientReady, async (readyClient) => {
  readyClient.user.setPresence({
    activities: [{ name: "a ticketeket", type: ActivityType.Watching }],
    status: "online"
  });
  try {
    await registerCommand();
    console.log(`NexaBot elindult: ${readyClient.user.tag}`);
    console.log("A /telepites parancs haszn\xE1latra k\xE9sz.");
  } catch (error) {
    console.error("A parancs regisztr\xE1l\xE1sa nem siker\xFClt:", error);
  }
});
client.on(Events.InteractionCreate, handleInteraction);
registerEvents(client);
client.on(Events.Error, (error) => console.error("Discord klienshiba:", error));
client.on(Events.Warn, (message) => console.warn("Discord figyelmeztet\xE9s:", message));
var port = Number(process.env.PORT) || 3e3;
var server = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({
    name: "NexaBot",
    status: client.isReady() ? "online" : "starting"
  }));
});
server.listen(port, "0.0.0.0", () => {
  console.log(`\xC1llapotoldal elindult a ${port} porton.`);
});
async function shutdown(signal) {
  console.log(`${signal} \xE9rkezett, le\xE1ll\xEDt\xE1s\u2026`);
  client.destroy();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5e3).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("A bot nem tudott bejelentkezni. Ellen\u0151rizd a DISCORD_TOKEN \xE9rt\xE9k\xE9t.", error.message);
  process.exit(1);
});
