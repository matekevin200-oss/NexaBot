var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// src/constants.js
var require_constants = __commonJS({
  "src/constants.js"(exports2, module2) {
    var NAMES = Object.freeze({
      staffRole: "NexaDev Staff",
      operativeRole: "Operat\xEDv \xE1llom\xE1ny",
      leadershipRole: "Vezet\u0151s\xE9g",
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
      applicationReviewChannel: "\u{1F4E8}\u30FBjelentkez\xE9sek",
      securityLogsChannel: "minden-log"
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
      RoleSelectMenuBuilder,
      StringSelectMenuBuilder,
      TextInputBuilder,
      TextInputStyle,
      UserSelectMenuBuilder
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
      const embed = new EmbedBuilder().setColor(COLORS.neutral).setTitle("\u{1F6E1}\uFE0F NexaBot staff vez\xE9rl\u0151pult").setDescription(
        "V\xE1laszd ki a kezelni k\xEDv\xE1nt tagot az al\xE1bbi list\xE1b\xF3l, majd v\xE1laszd ki a m\u0171veletet.\n\nA panelt csak a **NexaDev Staff** ranggal vagy adminisztr\xE1tori jogosults\xE1ggal lehet haszn\xE1lni."
      ).addFields(
        { name: "Moder\xE1ci\xF3", value: "Figyelmeztet\xE9s, id\u0151korl\xE1t, kir\xFAg\xE1s, kitilt\xE1s, rang- \xE9s becen\xE9vkezel\xE9s.", inline: true },
        { name: "Szerverkezel\xE9s", value: "\xDAj nyilv\xE1nos vagy priv\xE1t csatorna l\xE9trehoz\xE1sa.", inline: true }
      );
      const memberPicker = row(
        new UserSelectMenuBuilder().setCustomId("mod_target_select").setPlaceholder("V\xE1lassz ki egy szervertagot\u2026").setMinValues(1).setMaxValues(1)
      );
      const management = row(
        new ButtonBuilder().setCustomId("mod_unban_open").setLabel("Kitilt\xE1s felold\xE1sa").setEmoji("\u{1F513}").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("staff_channel").setLabel("Csatorna l\xE9trehoz\xE1sa").setEmoji("\u2795").setStyle(ButtonStyle.Primary)
      );
      return { embeds: [embed], components: [memberPicker, management] };
    }
    function moderationActionRows(targetId) {
      return [
        row(
          new ButtonBuilder().setCustomId(`mod_action:warn:${targetId}`).setLabel("Figyelmeztet\xE9s").setEmoji("\u26A0\uFE0F").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`mod_action:timeout:${targetId}`).setLabel("Felf\xFCggeszt\xE9s").setEmoji("\u23F1\uFE0F").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`mod_action:kick:${targetId}`).setLabel("Kir\xFAg\xE1s").setEmoji("\u{1F6AA}").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`mod_action:ban:${targetId}`).setLabel("Kitilt\xE1s").setEmoji("\u{1F528}").setStyle(ButtonStyle.Danger)
        ),
        row(
          new ButtonBuilder().setCustomId(`mod_action:untimeout:${targetId}`).setLabel("Felf\xFCggeszt\xE9s felold\xE1sa").setEmoji("\u2705").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`mod_action:role_add:${targetId}`).setLabel("Rang hozz\xE1ad\xE1sa").setEmoji("\u2795").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`mod_action:role_remove:${targetId}`).setLabel("Rang lev\xE9tele").setEmoji("\u2796").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`mod_action:nickname:${targetId}`).setLabel("Becen\xE9v m\xF3dos\xEDt\xE1sa").setEmoji("\u270F\uFE0F").setStyle(ButtonStyle.Secondary)
        )
      ];
    }
    function timeoutChoices(targetId) {
      return row(
        new ButtonBuilder().setCustomId(`mod_timeout:10:${targetId}`).setLabel("10 perc").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`mod_timeout:60:${targetId}`).setLabel("1 \xF3ra").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`mod_timeout:1440:${targetId}`).setLabel("1 nap").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`mod_timeout:custom:${targetId}`).setLabel("Egyedi id\u0151").setStyle(ButtonStyle.Primary)
      );
    }
    function moderationConfirmation(action, targetId) {
      const labels = {
        kick: ["Igen, kir\xFAgom", "\u{1F6AA}"],
        ban: ["Igen, kitiltom", "\u{1F528}"]
      };
      const [label, emoji] = labels[action];
      return row(
        new ButtonBuilder().setCustomId(`mod_confirm:${action}:${targetId}`).setLabel(label).setEmoji(emoji).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("mod_cancel").setLabel("M\xE9gse").setStyle(ButtonStyle.Secondary)
      );
    }
    function rolePicker(action, targetId) {
      return row(
        new RoleSelectMenuBuilder().setCustomId(`mod_role_select:${action}:${targetId}`).setPlaceholder(action === "role_add" ? "V\xE1laszd ki a hozz\xE1adand\xF3 rangot\u2026" : "V\xE1laszd ki a leveend\u0151 rangot\u2026").setMinValues(1).setMaxValues(1)
      );
    }
    function unbanPicker(bans) {
      const menu = new StringSelectMenuBuilder().setCustomId("mod_unban_select").setPlaceholder("V\xE1lassz a kitiltott felhaszn\xE1l\xF3k k\xF6z\xFCl\u2026").setMinValues(1).setMaxValues(1).addOptions(
        bans.slice(0, 25).map((ban) => ({
          label: (ban.user.globalName || ban.user.tag || ban.user.username).slice(0, 100),
          description: "Kitiltott felhaszn\xE1l\xF3",
          value: ban.user.id
        }))
      );
      return row(menu);
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
    function moderationModal(action, targetId, extraId = null) {
      const titles = {
        warn: "Figyelmeztet\xE9s",
        timeout_10: "Felf\xFCggeszt\xE9s \u2022 10 perc",
        timeout_60: "Felf\xFCggeszt\xE9s \u2022 1 \xF3ra",
        timeout_1440: "Felf\xFCggeszt\xE9s \u2022 1 nap",
        timeout_custom: "Egyedi felf\xFCggeszt\xE9s",
        untimeout: "Felf\xFCggeszt\xE9s felold\xE1sa",
        kick: "Tag kir\xFAg\xE1sa",
        ban: "Tag kitilt\xE1sa",
        unban: "Kitilt\xE1s felold\xE1sa",
        role_add: "Rang hozz\xE1ad\xE1sa",
        role_remove: "Rang lev\xE9tele",
        nickname: "Becen\xE9v m\xF3dos\xEDt\xE1sa"
      };
      const components = [];
      if (action === "timeout_custom") {
        components.push(row(input("mod_minutes", "Id\u0151tartam percben", TextInputStyle.Short, "1\u201340320 perc", true, 6)));
      }
      if (action === "nickname") {
        components.push(row(input("mod_nickname", "\xDAj becen\xE9v", TextInputStyle.Short, "A tag \xFAj szerverbeceneve", true, 32)));
      }
      components.push(
        row(input("mod_reason", "K\xF6telez\u0151 indokl\xE1s", TextInputStyle.Paragraph, "Mi\xE9rt t\xF6rt\xE9nik az int\xE9zked\xE9s?", true, 500)),
        row(input("mod_evidence", "Bizony\xEDt\xE9k vagy k\xE9p linkje", TextInputStyle.Paragraph, "Opcion\xE1lis: \xFCzenet- vagy k\xE9plink", false, 500))
      );
      const suffix = extraId ? `:${extraId}` : "";
      return new ModalBuilder().setCustomId(`mod_submit:${action}:${targetId}${suffix}`).setTitle(titles[action]).addComponents(...components);
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
      moderationActionRows,
      timeoutChoices,
      moderationConfirmation,
      rolePicker,
      unbanPicker,
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

// src/documents.js
var require_documents = __commonJS({
  "src/documents.js"(exports2, module2) {
    var {
      ActionRowBuilder,
      ButtonBuilder,
      ButtonStyle,
      EmbedBuilder,
      MessageFlags,
      ModalBuilder,
      PermissionFlagsBits: PermissionFlagsBits2,
      TextInputBuilder,
      TextInputStyle
    } = require("discord.js");
    var { NAMES, COLORS } = require_constants();
    var { baseEmbed, ephemeralError, sendLog } = require_utils();
    var EPHEMERAL = MessageFlags.Ephemeral;
    var REVIEW_CHANNEL_KEY = "case_files";
    var short = (id, label, placeholder, required = true, maxLength = 200) => ({
      id,
      label,
      placeholder,
      required,
      maxLength,
      style: "short"
    });
    var paragraph = (id, label, placeholder, required = true, maxLength = 1e3) => ({
      id,
      label,
      placeholder,
      required,
      maxLength,
      style: "paragraph"
    });
    var DOCUMENT_TYPES = Object.freeze([
      {
        key: "dc_rules",
        channel: "dc-szab\xE1lyzat",
        title: "Discord-szab\xE1lyzat",
        emoji: "\u{1F4C4}",
        approval: false,
        fields: [
          short("title", "Szab\xE1lyzat c\xEDme", "P\xE9ld\xE1ul: Discord k\xF6z\xF6ss\xE9gi szab\xE1lyzat"),
          short("section", "Fejezet vagy t\xE9mak\xF6r", "P\xE9ld\xE1ul: kommunik\xE1ci\xF3 \xE9s viselked\xE9s"),
          short("effective", "Hat\xE1lybal\xE9p\xE9s", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("content", "Szab\xE1lyzat tartalma", "\xCDrd le pontosan a szab\xE1lyokat"),
          paragraph("source", "Hivatkoz\xE1s vagy megjegyz\xE9s", "Opcion\xE1lis link vagy kieg\xE9sz\xEDt\xE9s", false, 500)
        ]
      },
      {
        key: "info_calls",
        channel: "felh\xEDv\xE1sok",
        parent: "inform\xE1ci\xF3k",
        title: "Felh\xEDv\xE1s",
        emoji: "\u{1F4E2}",
        approval: false,
        fields: [
          short("title", "Felh\xEDv\xE1s c\xEDme", "R\xF6vid, egy\xE9rtelm\u0171 c\xEDm"),
          short("audience", "C\xEDmzettek", "Kiknek sz\xF3l?"),
          short("deadline", "Id\u0151pont vagy hat\xE1rid\u0151", "\xC9\xC9\xC9\xC9.HH.NN. \xD3\xD3:PP"),
          paragraph("details", "R\xE9szletes felh\xEDv\xE1s", "Minden fontos tudnival\xF3"),
          short("contact", "Kapcsolattart\xF3", "N\xE9v vagy beoszt\xE1s", false)
        ]
      },
      {
        key: "internal_calls",
        channel: "felh\xEDv\xE1sok-bels\u0151s",
        parent: "inform\xE1ci\xF3k",
        title: "Bels\u0151 felh\xEDv\xE1s",
        emoji: "\u{1F4E3}",
        approval: false,
        fields: [
          short("title", "Bels\u0151 felh\xEDv\xE1s c\xEDme", "R\xF6vid c\xEDm"),
          short("units", "\xC9rintett \xE1llom\xE1ny vagy egys\xE9g", "Kiknek sz\xF3l?"),
          short("deadline", "Hat\xE1rid\u0151", "\xC9\xC9\xC9\xC9.HH.NN. \xD3\xD3:PP"),
          paragraph("task", "Feladat vagy t\xE1j\xE9koztat\xE1s", "\xCDrd le r\xE9szletesen"),
          paragraph("link", "Csatolm\xE1ny vagy link", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "important_info",
        channel: "fontos-inform\xE1ci\xF3k",
        parent: "inform\xE1ci\xF3k",
        title: "Fontos inform\xE1ci\xF3",
        emoji: "\u{1F4E3}",
        approval: false,
        fields: [
          short("title", "Inform\xE1ci\xF3 c\xEDme", "Mi a k\xF6zlem\xE9ny t\xE1rgya?"),
          short("affected", "\xC9rintettek", "Rang, egys\xE9g vagy teljes \xE1llom\xE1ny"),
          short("validity", "\xC9rv\xE9nyess\xE9g", "Mikort\xF3l meddig \xE9rv\xE9nyes?"),
          paragraph("details", "R\xE9szletes inform\xE1ci\xF3", "\xCDrd le a teljes t\xE1j\xE9koztat\xE1st"),
          paragraph("link", "Forr\xE1s vagy csatolm\xE1ny", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "rules",
        channel: "szab\xE1lyzatok",
        parent: "inform\xE1ci\xF3k",
        title: "Szab\xE1lyzat",
        emoji: "\u203C\uFE0F",
        approval: false,
        fields: [
          short("title", "Szab\xE1lyzat c\xEDme", "A szab\xE1lyzat megnevez\xE9se"),
          short("scope", "Hat\xE1ly \xE9s \xE9rintettek", "Kire vonatkozik?"),
          short("effective", "Hat\xE1lybal\xE9p\xE9s", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("content", "Szab\xE1lyzat sz\xF6vege", "\xCDrd le a rendelkez\xE9seket"),
          paragraph("source", "Forr\xE1s vagy mell\xE9klet", "Opcion\xE1lis link", false, 500)
        ]
      },
      {
        key: "inspection_rules",
        channelPrefix: "szab\xE1lyzatok-bels\u0151-ellen\u0151rz",
        parent: "inform\xE1ci\xF3k",
        title: "Bels\u0151 ellen\u0151rz\xE9si szab\xE1lyzat",
        emoji: "\u203C\uFE0F",
        approval: false,
        fields: [
          short("title", "Szab\xE1lyzat c\xEDme", "A bels\u0151 ellen\u0151rz\xE9s t\xE9m\xE1ja"),
          short("scope", "Ellen\u0151rz\xE9si hat\xE1ly", "Szervezet, egys\xE9g vagy szem\xE9lyi k\xF6r"),
          short("effective", "Hat\xE1lybal\xE9p\xE9s", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("procedure", "Ellen\u0151rz\xE9si elj\xE1r\xE1s", "L\xE9p\xE9sek, hat\xE1rid\u0151k \xE9s felel\u0151s\xF6k"),
          paragraph("attachment", "Mell\xE9klet vagy link", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "decrees",
        channel: "rendeletek",
        parent: "inform\xE1ci\xF3k",
        title: "Rendelet",
        emoji: "\u{1F4DC}",
        approval: false,
        fields: [
          short("number", "Rendelet sz\xE1ma", "P\xE9ld\xE1ul: 12/2026."),
          short("issuer", "Kiad\xF3 vagy elrendel\u0151", "N\xE9v \xE9s beoszt\xE1s"),
          short("effective", "Hat\xE1lybal\xE9p\xE9s", "\xC9\xC9\xC9\xC9.HH.NN."),
          short("subject", "Rendelet t\xE1rgya", "R\xF6vid t\xE1rgymegjel\xF6l\xE9s"),
          paragraph("content", "Rendelet teljes tartalma", "\xCDrd le a rendelkez\xE9st")
        ]
      },
      {
        key: "radio",
        channel: "r\xE1di\xF3-\xE9s-h\xEDv\xF3jel",
        parent: "inform\xE1ci\xF3k",
        title: "R\xE1di\xF3- \xE9s h\xEDv\xF3jelrend",
        emoji: "\u{1F4FB}",
        approval: false,
        fields: [
          short("unit", "Egys\xE9g vagy beoszt\xE1s", "Melyik egys\xE9ghez tartozik?"),
          short("frequency", "Frekvencia vagy h\xEDv\xF3jel", "R\xE1di\xF3frekvencia \xE9s h\xEDv\xF3jel"),
          short("access", "Haszn\xE1latra jogosultak", "Rangok vagy szem\xE9lyek"),
          paragraph("rules", "Haszn\xE1lati szab\xE1lyok", "R\xE1di\xF3z\xE1si rend \xE9s el\u0151\xEDr\xE1sok"),
          paragraph("note", "Megjegyz\xE9s", "Opcion\xE1lis kieg\xE9sz\xEDt\xE9s", false, 500)
        ]
      },
      {
        key: "uniform",
        channel: "ruh\xE1zat",
        parent: "inform\xE1ci\xF3k",
        title: "Ruh\xE1zati el\u0151\xEDr\xE1s",
        emoji: "\u{1F94B}",
        approval: false,
        fields: [
          short("unit", "Rang vagy egys\xE9g", "Kire vonatkozik?"),
          short("occasion", "Szolg\xE1lati helyzet", "Mikor kell ezt viselni?"),
          paragraph("required", "K\xF6telez\u0151 ruh\xE1zat", "Sorold fel a k\xF6telez\u0151 elemeket"),
          paragraph("forbidden", "Tiltott vagy elt\xE9r\u0151 elemek", "Mi nem viselhet\u0151?", false, 700),
          paragraph("image", "K\xE9p vagy minta linkje", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "vehicle_rules",
        channel: "j\xE1rm\u0171-szab\xE1lyzat",
        parent: "inform\xE1ci\xF3k",
        title: "J\xE1rm\u0171szab\xE1lyzat",
        emoji: "\u{1F693}",
        approval: false,
        fields: [
          short("vehicle", "J\xE1rm\u0171t\xEDpus", "Melyik j\xE1rm\u0171re vonatkozik?"),
          short("authorized", "Haszn\xE1latra jogosultak", "Rang vagy egys\xE9g"),
          paragraph("rules", "Haszn\xE1lati szab\xE1lyok", "Kiad\xE1s, vezet\xE9s \xE9s visszav\xE9tel rendje"),
          paragraph("equipment", "K\xF6telez\u0151 felszerel\xE9s", "A j\xE1rm\u0171 k\xF6telez\u0151 tartalma", false, 700),
          paragraph("image", "K\xE9p vagy dokumentum linkje", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "tgf_results",
        channel: "tgf-eredm\xE9nyek",
        parent: "inform\xE1ci\xF3k",
        title: "TGF-eredm\xE9ny",
        emoji: "\u2705",
        approval: false,
        fields: [
          short("applicant", "Jelentkez\u0151 neve", "Discord-n\xE9v vagy megjel\xF6l\xE9s"),
          short("result", "Eredm\xE9ny", "Elfogadva vagy elutas\xEDtva"),
          short("reviewer", "Elb\xEDr\xE1l\xF3", "N\xE9v \xE9s beoszt\xE1s"),
          short("date", "Elb\xEDr\xE1l\xE1s d\xE1tuma", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("note", "Indokl\xE1s vagy megjegyz\xE9s", "R\xF6vid \xE9rt\xE9kel\xE9s", false, 700)
        ]
      },
      {
        key: "btk",
        channel: "btk",
        parent: "inform\xE1ci\xF3k",
        title: "BTK-bejegyz\xE9s",
        emoji: "\u{1F4C1}",
        approval: false,
        fields: [
          short("section", "Szakasz vagy paragrafus", "P\xE9ld\xE1ul: 12. \xA7"),
          short("title", "T\xE9ny\xE1ll\xE1s megnevez\xE9se", "A szab\xE1lys\xE9rt\xE9s vagy b\u0171ncselekm\xE9ny neve"),
          paragraph("definition", "T\xE9ny\xE1ll\xE1s le\xEDr\xE1sa", "Mikor val\xF3sul meg?"),
          paragraph("sanction", "B\xFCntet\xE9si t\xE9tel", "Alkalmazhat\xF3 jogk\xF6vetkezm\xE9ny"),
          paragraph("note", "Kieg\xE9sz\xEDt\xE9s vagy p\xE9lda", "Opcion\xE1lis megjegyz\xE9s", false, 500)
        ]
      },
      {
        key: "service_log",
        channel: "szolg\xE1lati-napl\xF3",
        parent: "inform\xE1ci\xF3k",
        title: "Szolg\xE1lati napl\xF3",
        emoji: "\u{1F4DD}",
        approval: false,
        fields: [
          short("time", "Szolg\xE1lat kezdete \xE9s v\xE9ge", "\xC9\xC9\xC9\xC9.HH.NN. \xD3\xD3:PP\u2013\xD3\xD3:PP"),
          short("unit", "Egys\xE9g \xE9s h\xEDv\xF3jel", "Egys\xE9g, j\xE1rm\u0171, h\xEDv\xF3jel"),
          short("participants", "R\xE9sztvev\u0151k", "Nevek vagy Discord-megjel\xF6l\xE9sek"),
          paragraph("activity", "Elv\xE9gzett tev\xE9kenys\xE9g", "Feladatok \xE9s int\xE9zked\xE9sek"),
          paragraph("incident", "Rendk\xEDv\xFCli esem\xE9ny", "Esem\xE9ny vagy nincs", false, 700)
        ]
      },
      {
        key: "service_report",
        channel: "szolg\xE1lati-jelent\xE9s",
        parent: "inform\xE1ci\xF3k",
        title: "Szolg\xE1lati jelent\xE9s",
        emoji: "\u{1F4DD}",
        approval: false,
        fields: [
          short("subject", "Jelent\xE9s t\xE1rgya", "R\xF6vid t\xE1rgy"),
          short("time_place", "Id\u0151pont \xE9s helysz\xEDn", "Mikor \xE9s hol t\xF6rt\xE9nt?"),
          short("participants", "\xC9rintettek \xE9s r\xE9sztvev\u0151k", "Nevek, egys\xE9gek"),
          paragraph("events", "Esem\xE9ny r\xE9szletes le\xEDr\xE1sa", "Mi t\xF6rt\xE9nt id\u0151rendben?"),
          paragraph("action", "Megtett int\xE9zked\xE9sek", "Int\xE9zked\xE9s, eredm\xE9ny, bizony\xEDt\xE9k")
        ]
      },
      {
        key: "leave_request",
        channel: "szabads\xE1g-ig\xE9nyl\xE9s",
        parent: "inform\xE1ci\xF3k",
        title: "Szabads\xE1gig\xE9nyl\xE9s",
        emoji: "\u{1F4DD}",
        approval: false,
        fields: [
          short("period", "Szabads\xE1g id\u0151tartama", "Kezd\u0151 \xE9s befejez\u0151 d\xE1tum"),
          short("reason", "Ig\xE9nyl\xE9s oka", "R\xF6vid indokl\xE1s"),
          short("availability", "El\xE9rhet\u0151s\xE9g ezalatt", "El\xE9rhet\u0151 vagy nem el\xE9rhet\u0151"),
          short("substitute", "Helyettes\xEDt\u0151", "N\xE9v vagy nincs", false),
          paragraph("note", "Tov\xE1bbi megjegyz\xE9s", "Opcion\xE1lis kieg\xE9sz\xEDt\xE9s", false, 500)
        ]
      },
      {
        key: "members",
        channel: "tagok",
        parent: "inform\xE1ci\xF3k",
        title: "\xC1llom\xE1nytag-adatlap",
        emoji: "\u{1F6E1}\uFE0F",
        approval: false,
        fields: [
          short("member", "Tag neve", "Discord-n\xE9v \xE9s karakter neve"),
          short("badge", "Jelv\xE9nysz\xE1m", "A tag jelv\xE9nysz\xE1ma"),
          short("rank", "Rendfokozat", "Aktu\xE1lis rendfokozat"),
          short("unit", "Egys\xE9g vagy beoszt\xE1s", "Szervezeti hely"),
          short("status", "\xC1llapot", "Akt\xEDv, szabads\xE1gon vagy inakt\xEDv")
        ]
      },
      {
        key: "ranks",
        channel: "rendfokozatok",
        parent: "inform\xE1ci\xF3k",
        title: "Rendfokozati le\xEDr\xE1s",
        emoji: "\u{1F6E1}\uFE0F",
        approval: false,
        fields: [
          short("rank", "Rendfokozat neve", "A rendfokozat megnevez\xE9se"),
          short("level", "Helye a hierarchi\xE1ban", "Al\xE1- \xE9s f\xF6l\xE9rendelt fokozatok"),
          paragraph("requirements", "El\xE9r\xE9si k\xF6vetelm\xE9nyek", "Szolg\xE1lati id\u0151 \xE9s felt\xE9telek"),
          paragraph("authority", "Jogk\xF6r \xE9s feladatok", "Mire jogosult a visel\u0151je?"),
          paragraph("note", "Megjegyz\xE9s", "Opcion\xE1lis kieg\xE9sz\xEDt\xE9s", false, 500)
        ]
      },
      {
        key: "authority",
        channel: "hat\xE1sk\xF6r\xF6k",
        parent: "inform\xE1ci\xF3k",
        title: "Hat\xE1sk\xF6ri le\xEDr\xE1s",
        emoji: "\u{1F6E1}\uFE0F",
        approval: false,
        fields: [
          short("role", "Rang, egys\xE9g vagy beoszt\xE1s", "Kinek a hat\xE1sk\xF6re?"),
          short("scope", "Ter\xFCleti vagy t\xE1rgyi hat\xE1ly", "Mire terjed ki?"),
          paragraph("allowed", "Enged\xE9lyezett int\xE9zked\xE9sek", "Mit tehet?"),
          paragraph("limits", "Korl\xE1tok \xE9s tilalmak", "Mit nem tehet?"),
          paragraph("source", "Jogalap vagy forr\xE1s", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "badge_numbers",
        channel: "jelv\xE9nysz\xE1mok",
        parent: "inform\xE1ci\xF3k",
        title: "Jelv\xE9nysz\xE1m-nyilv\xE1ntart\xE1s",
        emoji: "\u{1F522}",
        approval: false,
        fields: [
          short("member", "Tag neve", "Discord-n\xE9v \xE9s karakter neve"),
          short("badge", "Jelv\xE9nysz\xE1m", "Kiadott jelv\xE9nysz\xE1m"),
          short("rank", "Rendfokozat", "Aktu\xE1lis rendfokozat"),
          short("issued", "Kiad\xE1s d\xE1tuma", "\xC9\xC9\xC9\xC9.HH.NN."),
          short("status", "\xC1llapot", "Akt\xEDv, bevont vagy m\xF3dos\xEDtott")
        ]
      },
      {
        key: "promotion",
        channel: "el\u0151l\xE9ptet\xE9s-lefokoz\xE1s",
        parent: "inform\xE1ci\xF3k",
        title: "El\u0151l\xE9ptet\xE9s vagy lefokoz\xE1s",
        emoji: "\u2195\uFE0F",
        approval: false,
        fields: [
          short("member", "\xC9rintett tag", "Discord-n\xE9v vagy megjel\xF6l\xE9s"),
          short("old_rank", "Jelenlegi rendfokozat", "A kor\xE1bbi rang"),
          short("new_rank", "\xDAj rendfokozat", "Az \xFAj rang"),
          short("effective", "Hat\xE1lybal\xE9p\xE9s", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("reason", "Indokl\xE1s", "Teljes\xEDtm\xE9ny, v\xE9ts\xE9g vagy d\xF6nt\xE9si ok")
        ]
      },
      {
        key: "ideas",
        channel: "\xF6tletek",
        parent: "inform\xE1ci\xF3k",
        title: "Fejleszt\xE9si \xF6tlet",
        emoji: "\u{1F4A1}",
        approval: false,
        fields: [
          short("title", "\xD6tlet c\xEDme", "R\xF6vid, \xE9rthet\u0151 c\xEDm"),
          short("area", "\xC9rintett ter\xFClet", "Melyik r\xE9szleget \xE9rinti?"),
          paragraph("idea", "\xD6tlet r\xE9szletes le\xEDr\xE1sa", "Mit szeretn\xE9l megv\xE1ltoztatni?"),
          paragraph("benefit", "V\xE1rhat\xF3 el\u0151ny", "Mi\xE9rt lenne hasznos?"),
          paragraph("implementation", "Megval\xF3s\xEDt\xE1si javaslat", "Opcion\xE1lis l\xE9p\xE9sek", false, 700)
        ]
      },
      {
        key: "internal_investigation",
        channel: "bels\u0151-vizsg\xE1latok",
        parent: "ellen\u0151rz\xE9s",
        title: "Bels\u0151 vizsg\xE1lat",
        emoji: "\u{1F50E}",
        approval: true,
        fields: [
          short("subject", "Vizsg\xE1lat t\xE1rgya vagy \xE9rintettje", "Szem\xE9ly, egys\xE9g vagy esem\xE9ny"),
          short("opened", "Megind\xEDt\xE1s d\xE1tuma", "\xC9\xC9\xC9\xC9.HH.NN."),
          short("investigator", "Kijel\xF6lt vizsg\xE1l\xF3", "N\xE9v \xE9s beoszt\xE1s"),
          paragraph("basis", "Vizsg\xE1lat alapja", "Bejelent\xE9s, gyan\xFA vagy esem\xE9ny"),
          paragraph("evidence", "Bizony\xEDt\xE9kok \xE9s hivatkoz\xE1sok", "Linkek, tan\xFAk, iratok")
        ]
      },
      {
        key: "weekly_inspection",
        channel: "heti-ellen\u0151rz\xE9si-feladat",
        parent: "ellen\u0151rz\xE9s",
        title: "Heti ellen\u0151rz\xE9si feladat",
        emoji: "\u{1F575}\uFE0F",
        approval: true,
        fields: [
          short("week", "H\xE9t \xE9s hat\xE1rid\u0151", "P\xE9ld\xE1ul: 36. h\xE9t, p\xE9ntek 20:00"),
          short("assigned", "Kijel\xF6lt szem\xE9ly vagy egys\xE9g", "Ki hajtja v\xE9gre?"),
          short("scope", "Ellen\u0151rz\xE9s helye vagy t\xE1rgya", "Mit kell ellen\u0151rizni?"),
          paragraph("tasks", "V\xE9grehajtand\xF3 feladatok", "L\xE9p\xE9sek \xE9s elv\xE1rt eredm\xE9ny"),
          paragraph("note", "Kiemelt szempontok", "Opcion\xE1lis megjegyz\xE9s", false, 600)
        ]
      },
      {
        key: "disciplinary",
        channel: "fegyelmi-elj\xE1r\xE1sok",
        parent: "ellen\u0151rz\xE9s",
        title: "Fegyelmi elj\xE1r\xE1s",
        emoji: "\u2696\uFE0F",
        approval: true,
        fields: [
          short("person", "Elj\xE1r\xE1s al\xE1 vont szem\xE9ly", "N\xE9v, rang, jelv\xE9nysz\xE1m"),
          short("incident", "Esem\xE9ny id\u0151pontja", "\xC9\xC9\xC9\xC9.HH.NN. \xD3\xD3:PP"),
          short("violation", "Felt\xE9telezett szab\xE1lys\xE9rt\xE9s", "Mely szab\xE1ly s\xE9r\xFClhetett?"),
          paragraph("facts", "T\xE9ny\xE1ll\xE1s \xE9s k\xF6r\xFClm\xE9nyek", "R\xE9szletes esem\xE9nyle\xEDr\xE1s"),
          paragraph("evidence", "Bizony\xEDt\xE9kok \xE9s javaslat", "Linkek, tan\xFAk, javasolt int\xE9zked\xE9s")
        ]
      },
      {
        key: "case_files",
        channel: "\xFCgyiratok",
        parent: "ellen\u0151rz\xE9s",
        title: "\xDCgyirat",
        emoji: "\u{1F4C1}",
        approval: true,
        fields: [
          short("title", "\xDCgy megnevez\xE9se", "R\xF6vid \xFCgyc\xEDm"),
          short("parties", "\xC9rintett szem\xE9lyek vagy egys\xE9gek", "Nevek \xE9s beoszt\xE1sok"),
          short("opened", "\xDCgy megnyit\xE1s\xE1nak d\xE1tuma", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("summary", "\xDCgy \xF6sszefoglal\xE1sa", "T\xE9ny\xE1ll\xE1s, el\u0151zm\xE9nyek \xE9s c\xE9l"),
          paragraph("attachment", "Bizony\xEDt\xE9k vagy irat linkje", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "case_documents",
        channel: "\xFCgyiratok-dokumentumban",
        parent: "ellen\u0151rz\xE9s",
        title: "\xDCgyirati dokumentum",
        emoji: "\u{1F4C1}",
        approval: true,
        fields: [
          short("document", "Dokumentum megnevez\xE9se", "Az irat c\xEDme"),
          short("reference", "Kapcsol\xF3d\xF3 \xFCgy vagy \xFCgysz\xE1m", "BVI-... vagy \xFCgy megnevez\xE9se"),
          short("date", "Dokumentum d\xE1tuma", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("description", "Dokumentum tartalma", "R\xE9szletes \xF6sszefoglal\xE1s"),
          paragraph("link", "Dokumentum vagy mell\xE9klet linkje", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "complaints",
        channel: "panaszok",
        parent: "ellen\u0151rz\xE9s",
        title: "Panasz",
        emoji: "\u2709\uFE0F",
        approval: false,
        fields: [
          short("complainant", "Panaszos neve", "N\xE9v vagy n\xE9vtelen"),
          short("subject", "Panasz t\xE1rgya vagy \xE9rintettje", "Szem\xE9ly, egys\xE9g vagy int\xE9zked\xE9s"),
          short("incident", "Esem\xE9ny id\u0151pontja", "\xC9\xC9\xC9\xC9.HH.NN. \xD3\xD3:PP"),
          paragraph("complaint", "Panasz r\xE9szletes le\xEDr\xE1sa", "Mi t\xF6rt\xE9nt \xE9s mit kifog\xE1sol?"),
          paragraph("evidence", "Bizony\xEDt\xE9k vagy link", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "orders",
        channel: "utas\xEDt\xE1sok",
        parent: "hivatalos-iratt\xE1r",
        title: "Hivatalos utas\xEDt\xE1s",
        emoji: "\u{1F4DC}",
        approval: true,
        fields: [
          short("subject", "Utas\xEDt\xE1s t\xE1rgya", "R\xF6vid t\xE1rgymegjel\xF6l\xE9s"),
          short("issuer", "Kiad\xF3 vezet\u0151", "N\xE9v \xE9s beoszt\xE1s"),
          short("effective", "Hat\xE1ly \xE9s hat\xE1rid\u0151", "Mikort\xF3l meddig \xE9rv\xE9nyes?"),
          paragraph("content", "Utas\xEDt\xE1s teljes sz\xF6vege", "Feladatok, felel\u0151s\xF6k \xE9s v\xE9grehajt\xE1s"),
          paragraph("attachment", "Mell\xE9klet vagy hivatkoz\xE1s", "Opcion\xE1lis link", false, 500)
        ]
      },
      {
        key: "decisions",
        channel: "hat\xE1rozatok",
        parent: "hivatalos-iratt\xE1r",
        title: "Hat\xE1rozat",
        emoji: "\u2696\uFE0F",
        approval: true,
        fields: [
          short("subject", "Hat\xE1rozat t\xE1rgya", "Mir\u0151l sz\xF3l a d\xF6nt\xE9s?"),
          short("reference", "Kapcsol\xF3d\xF3 \xFCgy", "\xDCgysz\xE1m vagy \xFCgy megnevez\xE9se"),
          short("effective", "Hat\xE1lybal\xE9p\xE9s", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("decision", "D\xF6nt\xE9s rendelkez\u0151 r\xE9sze", "A meghozott hat\xE1rozat"),
          paragraph("basis", "Indokl\xE1s \xE9s jogalap", "A d\xF6nt\xE9s alapja")
        ]
      },
      {
        key: "minutes",
        channel: "jegyz\u0151k\xF6nyv",
        parent: "hivatalos-iratt\xE1r",
        title: "Jegyz\u0151k\xF6nyv",
        emoji: "\u{1F4C1}",
        approval: true,
        fields: [
          short("subject", "Esem\xE9ny vagy \xFCl\xE9s t\xE1rgya", "Mi ker\xFClt jegyz\u0151k\xF6nyvez\xE9sre?"),
          short("time_place", "Id\u0151pont \xE9s helysz\xEDn", "\xC9\xC9\xC9\xC9.HH.NN. \xD3\xD3:PP, helysz\xEDn"),
          short("participants", "Jelenl\xE9v\u0151k", "Nevek \xE9s beoszt\xE1sok"),
          paragraph("events", "Elhangzottak \xE9s esem\xE9nyek", "R\xE9szletes, id\u0151rendi le\xEDr\xE1s"),
          paragraph("decisions", "D\xF6nt\xE9sek \xE9s feladatok", "Hat\xE1rid\u0151k \xE9s felel\u0151s\xF6k")
        ]
      },
      {
        key: "laws",
        channel: "jogszab\xE1lyok",
        parent: "hivatalos-iratt\xE1r",
        title: "Jogszab\xE1ly",
        emoji: "\u{1F4DA}",
        approval: true,
        fields: [
          short("number", "Jogszab\xE1ly sz\xE1ma \xE9s c\xEDme", "Hivatalos megnevez\xE9s"),
          short("source", "Kibocs\xE1t\xF3 vagy forr\xE1s", "Jogalkot\xF3 vagy hivatkoz\xE1s"),
          short("effective", "Hat\xE1lybal\xE9p\xE9s", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("summary", "Tartalmi \xF6sszefoglal\xF3", "A fontos rendelkez\xE9sek"),
          paragraph("link", "Teljes sz\xF6veg vagy mell\xE9klet", "Opcion\xE1lis link", false, 500)
        ]
      },
      {
        key: "circulars",
        channel: "k\xF6rlevelek",
        parent: "hivatalos-iratt\xE1r",
        title: "K\xF6rlev\xE9l",
        emoji: "\u{1F4D1}",
        approval: true,
        fields: [
          short("subject", "K\xF6rlev\xE9l t\xE1rgya", "R\xF6vid c\xEDm"),
          short("audience", "C\xEDmzettek", "Kik kapj\xE1k a t\xE1j\xE9koztat\xE1st?"),
          short("effective", "Kiad\xE1s \xE9s \xE9rv\xE9nyess\xE9g", "D\xE1tum vagy id\u0151szak"),
          paragraph("content", "K\xF6rlev\xE9l sz\xF6vege", "Teljes t\xE1j\xE9koztat\xE1s"),
          paragraph("attachment", "Mell\xE9klet vagy hivatkoz\xE1s", "Opcion\xE1lis link", false, 500)
        ]
      },
      {
        key: "archive",
        channel: "arch\xEDvum",
        parent: "hivatalos-iratt\xE1r",
        title: "Archiv\xE1l\xE1si bejegyz\xE9s",
        emoji: "\u{1F5C4}\uFE0F",
        approval: true,
        fields: [
          short("item", "Archiv\xE1land\xF3 irat vagy \xFCgy", "Megnevez\xE9s \xE9s \xFCgysz\xE1m"),
          short("origin", "Eredeti csatorna vagy forr\xE1s", "Honnan ker\xFClt az arch\xEDvumba?"),
          short("date", "Archiv\xE1l\xE1s d\xE1tuma", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("reason", "Archiv\xE1l\xE1s oka \xE9s \xE1llapot", "Lez\xE1r\xE1s, hat\xE1lyveszt\xE9s vagy egy\xE9b ok"),
          paragraph("link", "Irat vagy \xFCzenet linkje", "Opcion\xE1lis hivatkoz\xE1s", false, 500)
        ]
      },
      {
        key: "bomo_calls",
        channel: "felh\xEDv\xE1sok",
        parent: "bomo",
        title: "BOMO-felh\xEDv\xE1s",
        emoji: "\u{1F4E2}",
        approval: false,
        fields: [
          short("title", "Felh\xEDv\xE1s c\xEDme", "R\xF6vid m\u0171veleti c\xEDm"),
          short("audience", "C\xEDmzett \xE1llom\xE1ny", "Kiknek sz\xF3l?"),
          short("time", "Id\u0151pont vagy hat\xE1rid\u0151", "\xC9\xC9\xC9\xC9.HH.NN. \xD3\xD3:PP"),
          paragraph("details", "R\xE9szletes felh\xEDv\xE1s", "Feladat \xE9s sz\xFCks\xE9ges tudnival\xF3k"),
          short("contact", "Kapcsolattart\xF3", "N\xE9v vagy h\xEDv\xF3jel", false)
        ]
      },
      {
        key: "bomo_announcements",
        channel: "k\xF6zlem\xE9nyek",
        parent: "bomo",
        title: "BOMO-k\xF6zlem\xE9ny",
        emoji: "\u{1F4E2}",
        approval: false,
        fields: [
          short("title", "K\xF6zlem\xE9ny c\xEDme", "R\xF6vid c\xEDm"),
          short("audience", "C\xEDmzettek", "Kik sz\xE1m\xE1ra k\xE9sz\xFClt?"),
          short("validity", "\xC9rv\xE9nyess\xE9g", "D\xE1tum vagy id\u0151szak"),
          paragraph("content", "K\xF6zlem\xE9ny tartalma", "Teljes t\xE1j\xE9koztat\xE1s"),
          paragraph("link", "Hivatkoz\xE1s vagy mell\xE9klet", "Opcion\xE1lis link", false, 500)
        ]
      },
      {
        key: "bomo_rules",
        channel: "bomo-szab\xE1lyzat",
        parent: "bomo",
        title: "BOMO-szab\xE1lyzat",
        emoji: "\u{1F4DC}",
        approval: false,
        fields: [
          short("title", "Szab\xE1lyzat c\xEDme", "BOMO-szab\xE1lyzat megnevez\xE9se"),
          short("scope", "Hat\xE1ly \xE9s \xE9rintettek", "Kire \xE9s mire vonatkozik?"),
          short("effective", "Hat\xE1lybal\xE9p\xE9s", "\xC9\xC9\xC9\xC9.HH.NN."),
          paragraph("content", "Szab\xE1lyzat tartalma", "Elj\xE1r\xE1sok \xE9s k\xF6telezetts\xE9gek"),
          paragraph("attachment", "Mell\xE9klet vagy hivatkoz\xE1s", "Opcion\xE1lis link", false, 500)
        ]
      },
      {
        key: "covert_ops",
        channel: "fedett-m\u0171veletek",
        parent: "bomo",
        title: "Fedett m\u0171veleti terv",
        emoji: "\u{1F575}\uFE0F",
        approval: true,
        fields: [
          short("code", "M\u0171velet k\xF3dneve", "Bels\u0151 m\u0171veleti megnevez\xE9s"),
          short("classification", "Min\u0151s\xEDt\xE9s", "P\xE9ld\xE1ul: bizalmas vagy szigor\xFAan bizalmas"),
          short("target", "C\xE9l \xE9s \xE9rintettek", "Szem\xE9ly, csoport vagy helysz\xEDn"),
          paragraph("plan", "M\u0171veleti terv", "C\xE9l, m\xF3dszer, id\u0151z\xEDt\xE9s \xE9s kock\xE1zatok"),
          paragraph("responsible", "Felel\u0151s\xF6k \xE9s bizony\xEDt\xE9kok", "R\xE9sztvev\u0151k, enged\xE9lyek, linkek")
        ]
      },
      {
        key: "bomo_reports",
        channel: "jelent\xE9sek",
        parent: "bomo",
        title: "BOMO-jelent\xE9s",
        emoji: "\u{1F4DD}",
        approval: true,
        fields: [
          short("code", "Kapcsol\xF3d\xF3 m\u0171velet vagy \xFCgy", "K\xF3dn\xE9v vagy BVI-\xFCgysz\xE1m"),
          short("reporter", "Jelent\xE9st tev\u0151", "N\xE9v, beoszt\xE1s, h\xEDv\xF3jel"),
          short("time_place", "Id\u0151pont \xE9s helysz\xEDn", "Mikor \xE9s hol t\xF6rt\xE9nt?"),
          paragraph("events", "Esem\xE9nyek r\xE9szletesen", "Id\u0151rendi jelent\xE9s"),
          paragraph("result", "Eredm\xE9ny \xE9s bizony\xEDt\xE9k", "K\xF6vetkeztet\xE9s, linkek, tov\xE1bbi teend\u0151")
        ]
      },
      {
        key: "confidential_files",
        channel: "bizalmas-akt\xE1k",
        parent: "bomo",
        title: "Bizalmas akta",
        emoji: "\u{1F4C1}",
        approval: true,
        fields: [
          short("title", "Akta c\xEDme vagy k\xF3dja", "Bels\u0151 azonos\xEDt\xF3"),
          short("classification", "Titkos\xEDt\xE1si szint", "Bizalmas vagy szigor\xFAan bizalmas"),
          short("persons", "\xC9rintett szem\xE9lyek", "Nevek, fed\u0151nevek vagy egys\xE9gek"),
          paragraph("summary", "Akta r\xE9szletes \xF6sszefoglal\xF3ja", "T\xE9nyek, kapcsolatok \xE9s kock\xE1zatok"),
          paragraph("evidence", "Bizony\xEDt\xE9kok \xE9s iratok", "V\xE9dett hivatkoz\xE1sok vagy mell\xE9kletek")
        ]
      }
    ]);
    function normalizeName(value) {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    function findDocumentType(key) {
      return DOCUMENT_TYPES.find((type) => type.key === key);
    }
    function findDocumentChannel(guild, type) {
      const expected = normalizeName(type.channel || type.channelPrefix);
      const expectedParent = type.parent ? normalizeName(type.parent) : null;
      return guild.channels.cache.find((channel) => {
        if (!channel?.isTextBased?.() || channel.isThread?.()) return false;
        const name = normalizeName(channel.name);
        const nameMatches = type.channelPrefix ? name.startsWith(expected) : name === expected;
        if (!nameMatches) return false;
        if (!expectedParent) return true;
        return normalizeName(channel.parent?.name).includes(expectedParent);
      });
    }
    function fieldRow(field) {
      return new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId(field.id).setLabel(field.label).setStyle(field.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short).setPlaceholder(field.placeholder).setRequired(field.required).setMaxLength(field.maxLength)
      );
    }
    function documentModal(type) {
      return new ModalBuilder().setCustomId(`doc_submit:${type.key}`).setTitle(type.title.slice(0, 45)).addComponents(...type.fields.map(fieldRow));
    }
    function documentPanel(type) {
      const embed = new EmbedBuilder().setColor(type.approval ? COLORS.warning : COLORS.primary).setTitle(`${type.emoji} ${type.title}`).setDescription(
        type.approval ? "Az adatlap kit\xF6lt\xE9se ut\xE1n a dokumentum a **Vezet\u0151s\xE9g** j\xF3v\xE1hagy\xE1s\xE1ra ker\xFCl. J\xF3v\xE1hagy\xE1s ut\xE1n a NexaBot teszi k\xF6zz\xE9 ebben a csatorn\xE1ban." : "T\xF6ltsd ki az adatlapot. A k\xE9sz bejegyz\xE9st a NexaBot teszi k\xF6zz\xE9 ebben a csatorn\xE1ban."
      ).addFields({ name: "Hozz\xE1f\xE9r\xE9s", value: `Csak az **${NAMES.operativeRole}** rang haszn\xE1lhatja.` }).setFooter({ text: `NexaBot \u2022 Dokumentumpanel \u2022 ${type.key}` });
      const components = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`doc_open:${type.key}`).setLabel(`${type.title} kit\xF6lt\xE9se`.slice(0, 80)).setEmoji(type.emoji).setStyle(ButtonStyle.Primary)
        )
      ];
      return { embeds: [embed], components };
    }
    function approvalControls(type, targetChannelId, submitterId) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`doc_approve:${type.key}:${targetChannelId}:${submitterId}`).setLabel("J\xF3v\xE1hagy\xE1s").setEmoji("\u2705").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`doc_reject:${type.key}:${targetChannelId}:${submitterId}`).setLabel("Elutas\xEDt\xE1s").setEmoji("\u274C").setStyle(ButtonStyle.Danger)
      );
    }
    function rejectionModal(messageId, submitterId) {
      return new ModalBuilder().setCustomId(`doc_reject_submit:${messageId}:${submitterId}`).setTitle("Dokumentum elutas\xEDt\xE1sa").addComponents(fieldRow(paragraph("reject_reason", "Elutas\xEDt\xE1s k\xF6telez\u0151 indokl\xE1sa", "Mi\xE9rt nem fogadhat\xF3 el a dokumentum?", true, 700)));
    }
    function hasNamedRole(member, roleName) {
      const expected = normalizeName(roleName);
      return member?.roles?.cache?.some((role) => normalizeName(role.name) === expected);
    }
    function isOperative(member) {
      return hasNamedRole(member, NAMES.operativeRole);
    }
    function canApprove(member) {
      return Boolean(
        member?.permissions?.has(PermissionFlagsBits2.Administrator) || hasNamedRole(member, NAMES.leadershipRole)
      );
    }
    function bviCaseNumber(date = /* @__PURE__ */ new Date()) {
      const parts = new Intl.DateTimeFormat("hu-HU", {
        timeZone: "Europe/Budapest",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
      return `BVI-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
    }
    function documentEmbed(type, interaction, caseNumber, status) {
      const formFields = type.fields.map((field) => ({ field, value: interaction.fields.getTextInputValue(field.id).trim() })).filter(({ value }) => value).map(({ field, value }) => ({ name: field.label, value }));
      return baseEmbed(
        status === "pending" ? `\u23F3 J\xF3v\xE1hagy\xE1sra v\xE1r \u2022 ${type.title}` : `${type.emoji} ${type.title}`,
        status === "pending" ? "A dokumentum a **Vezet\u0151s\xE9g** vagy egy adminisztr\xE1tor d\xF6nt\xE9s\xE9re v\xE1r." : "Hivatalos bejegyz\xE9s a NexaBot dokument\xE1ci\xF3s rendszer\xE9b\u0151l.",
        status === "pending" ? COLORS.warning : COLORS.primary
      ).addFields(
        { name: "\xDCgysz\xE1m", value: caseNumber, inline: true },
        { name: "Bek\xFCldte", value: `${interaction.user} \u2022 ${interaction.user.tag}`, inline: true },
        ...formFields,
        { name: "\xC1llapot", value: status === "pending" ? "\u23F3 J\xF3v\xE1hagy\xE1sra v\xE1r" : "\u2705 K\xF6zz\xE9t\xE9ve" }
      );
    }
    async function installDocumentPanels(guild, botUser) {
      const installed = [];
      const missing = [];
      for (const type of DOCUMENT_TYPES) {
        const channel = findDocumentChannel(guild, type);
        if (!channel) {
          missing.push(type.channel || type.channelPrefix);
          continue;
        }
        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        const footer = `NexaBot \u2022 Dokumentumpanel \u2022 ${type.key}`;
        const existing = messages?.find(
          (message) => message.author.id === botUser.id && message.embeds[0]?.footer?.text === footer
        );
        if (existing) await existing.edit(documentPanel(type));
        else await channel.send(documentPanel(type));
        installed.push(channel.name);
      }
      return { installed, missing };
    }
    async function handleDocumentButton(interaction) {
      const id = interaction.customId;
      if (id.startsWith("doc_open:")) {
        if (!isOperative(interaction.member)) {
          return ephemeralError(interaction, `Ezt csak az **${NAMES.operativeRole}** rang haszn\xE1lhatja.`);
        }
        const type = findDocumentType(id.split(":")[1]);
        if (!type) return ephemeralError(interaction, "Ismeretlen dokumentumt\xEDpus.");
        return interaction.showModal(documentModal(type));
      }
      if (id.startsWith("doc_approve:")) {
        if (!canApprove(interaction.member)) {
          return ephemeralError(interaction, `Ezt csak adminisztr\xE1tor vagy a **${NAMES.leadershipRole}** rang haszn\xE1lhatja.`);
        }
        const [, key, targetChannelId, submitterId] = id.split(":");
        const type = findDocumentType(key);
        const target = interaction.guild.channels.cache.get(targetChannelId);
        if (!type || !target?.isTextBased()) return ephemeralError(interaction, "A c\xE9lcsatorna nem tal\xE1lhat\xF3.");
        await interaction.deferReply({ flags: EPHEMERAL });
        const approved = EmbedBuilder.from(interaction.message.embeds[0]).setTitle(`\u2705 J\xF3v\xE1hagyva \u2022 ${type.title}`).setColor(COLORS.success);
        approved.setFields(
          ...approved.data.fields.filter((field) => field.name !== "\xC1llapot"),
          { name: "\xC1llapot", value: `\u2705 J\xF3v\xE1hagyta: ${interaction.user}` }
        );
        if (target.id === interaction.channelId) {
          await interaction.message.edit({ embeds: [approved], components: [] });
        } else {
          await target.send({ embeds: [approved] });
          await interaction.message.edit({ embeds: [approved], components: [] });
        }
        const submitter = await interaction.client.users.fetch(submitterId).catch(() => null);
        await submitter?.send(`\u2705 A **${type.title}** dokumentumodat j\xF3v\xE1hagyt\xE1k a **${interaction.guild.name}** szerveren.`).catch(() => null);
        await sendLog(interaction.guild, baseEmbed("\u2705 Dokumentum j\xF3v\xE1hagyva", `${type.title} \u2022 ${interaction.user.tag}`, COLORS.success));
        return interaction.editReply(`\u2705 A dokumentum j\xF3v\xE1hagyva \xE9s k\xF6zz\xE9t\xE9ve itt: ${target}`);
      }
      if (id.startsWith("doc_reject:")) {
        if (!canApprove(interaction.member)) {
          return ephemeralError(interaction, `Ezt csak adminisztr\xE1tor vagy a **${NAMES.leadershipRole}** rang haszn\xE1lhatja.`);
        }
        const [, , , submitterId] = id.split(":");
        return interaction.showModal(rejectionModal(interaction.message.id, submitterId));
      }
    }
    async function handleDocumentModal(interaction) {
      if (interaction.customId.startsWith("doc_submit:")) {
        if (!isOperative(interaction.member)) {
          return ephemeralError(interaction, `Ezt csak az **${NAMES.operativeRole}** rang haszn\xE1lhatja.`);
        }
        const type = findDocumentType(interaction.customId.split(":")[1]);
        if (!type) return ephemeralError(interaction, "Ismeretlen dokumentumt\xEDpus.");
        await interaction.deferReply({ flags: EPHEMERAL });
        const caseNumber = bviCaseNumber();
        if (type.approval) {
          const reviewType = findDocumentType(REVIEW_CHANNEL_KEY);
          const reviewChannel = findDocumentChannel(interaction.guild, reviewType);
          if (!reviewChannel) {
            return interaction.editReply("\u274C A megl\xE9v\u0151 **\xFCgyiratok** j\xF3v\xE1hagy\xE1si csatorn\xE1t nem tal\xE1lom. \xDAj csatorn\xE1t nem hoztam l\xE9tre.");
          }
          const embed2 = documentEmbed(type, interaction, caseNumber, "pending").addFields({ name: "C\xE9lcsatorna", value: `${interaction.channel}` });
          const message2 = await reviewChannel.send({
            embeds: [embed2],
            components: [approvalControls(type, interaction.channelId, interaction.user.id)]
          });
          return interaction.editReply(`\u2705 A dokumentum j\xF3v\xE1hagy\xE1sra elk\xFCldve: ${message2.url}
**\xDCgysz\xE1m:** ${caseNumber}`);
        }
        const embed = documentEmbed(type, interaction, caseNumber, "published");
        const message = await interaction.channel.send({ embeds: [embed] });
        await sendLog(interaction.guild, baseEmbed("\u{1F4C4} Dokumentum k\xF6zz\xE9t\xE9ve", `${type.title} \u2022 ${caseNumber} \u2022 ${interaction.user.tag}`, COLORS.success));
        return interaction.editReply(`\u2705 A NexaBot k\xF6zz\xE9tette a bejegyz\xE9st: ${message.url}
**\xDCgysz\xE1m:** ${caseNumber}`);
      }
      if (interaction.customId.startsWith("doc_reject_submit:")) {
        if (!canApprove(interaction.member)) {
          return ephemeralError(interaction, `Ezt csak adminisztr\xE1tor vagy a **${NAMES.leadershipRole}** rang haszn\xE1lhatja.`);
        }
        await interaction.deferReply({ flags: EPHEMERAL });
        const [, messageId, submitterId] = interaction.customId.split(":");
        const reason = interaction.fields.getTextInputValue("reject_reason").trim();
        const pending = await interaction.channel.messages.fetch(messageId).catch(() => null);
        if (!pending?.embeds?.length) return interaction.editReply("\u274C A j\xF3v\xE1hagy\xE1sra v\xE1r\xF3 dokumentum nem tal\xE1lhat\xF3.");
        const rejected = EmbedBuilder.from(pending.embeds[0]).setTitle("\u274C Elutas\xEDtott dokumentum").setColor(COLORS.danger);
        rejected.setFields(
          ...rejected.data.fields.filter((field) => field.name !== "\xC1llapot"),
          { name: "\xC1llapot", value: `\u274C Elutas\xEDtotta: ${interaction.user}` },
          { name: "Elutas\xEDt\xE1s indoka", value: reason }
        );
        await pending.edit({ embeds: [rejected], components: [] });
        const submitter = await interaction.client.users.fetch(submitterId).catch(() => null);
        const dmSent = await submitter?.send(
          `\u274C A dokumentumodat elutas\xEDtott\xE1k a **${interaction.guild.name}** szerveren.
**Indok:** ${reason}`
        ).then(() => true).catch(() => false);
        await sendLog(interaction.guild, baseEmbed("\u274C Dokumentum elutas\xEDtva", `${reason}
Vezet\u0151: ${interaction.user.tag}`, COLORS.danger));
        return interaction.editReply(`\u2705 Az elutas\xEDt\xE1s r\xF6gz\xEDtve.${dmSent === false ? "\n\u26A0\uFE0F A priv\xE1t \xE9rtes\xEDt\xE9st nem siker\xFClt elk\xFCldeni." : ""}`);
      }
    }
    module2.exports = {
      DOCUMENT_TYPES,
      normalizeName,
      findDocumentType,
      findDocumentChannel,
      documentModal,
      documentPanel,
      approvalControls,
      rejectionModal,
      isOperative,
      canApprove,
      bviCaseNumber,
      installDocumentPanels,
      handleDocumentButton,
      handleDocumentModal
    };
  }
});

// src/security.js
var require_security = __commonJS({
  "src/security.js"(exports2, module2) {
    var {
      ActionRowBuilder,
      AuditLogEvent,
      ButtonBuilder,
      ButtonStyle,
      EmbedBuilder,
      Events: Events2,
      MessageFlags,
      PermissionFlagsBits: PermissionFlagsBits2,
      SlashCommandBuilder: SlashCommandBuilder2
    } = require("discord.js");
    var { NAMES, COLORS } = require_constants();
    var { baseEmbed, byName, ephemeralError } = require_utils();
    var EPHEMERAL = MessageFlags.Ephemeral;
    var RAID_WINDOW_MS = 2e4;
    var RAID_JOIN_LIMIT = 8;
    var FRESH_ACCOUNT_MS = 3 * 24 * 60 * 60 * 1e3;
    var SPAM_WINDOW_MS = 5e3;
    var SPAM_MESSAGE_LIMIT = 6;
    var STRIKE_RESET_MS = 30 * 60 * 1e3;
    var LOCK_PERMISSIONS = Object.freeze({
      SendMessages: PermissionFlagsBits2.SendMessages,
      AddReactions: PermissionFlagsBits2.AddReactions,
      CreatePublicThreads: PermissionFlagsBits2.CreatePublicThreads,
      CreatePrivateThreads: PermissionFlagsBits2.CreatePrivateThreads,
      SendMessagesInThreads: PermissionFlagsBits2.SendMessagesInThreads,
      Connect: PermissionFlagsBits2.Connect
    });
    var joinWindows = /* @__PURE__ */ new Map();
    var spamWindows = /* @__PURE__ */ new Map();
    var spamCooldowns = /* @__PURE__ */ new Map();
    var memberStrikes = /* @__PURE__ */ new Map();
    var activeRaids = /* @__PURE__ */ new Map();
    function normalizeName(value) {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    }
    function isLeadership(member) {
      return Boolean(
        member?.id === member?.guild?.ownerId || member?.permissions?.has(PermissionFlagsBits2.Administrator) || member?.roles?.cache?.some((role) => role.name === NAMES.leadershipRole)
      );
    }
    function isLinkExempt(member) {
      return Boolean(
        isLeadership(member) || member?.roles?.cache?.some((role) => {
          const name = normalizeName(role.name);
          return role.name === NAMES.staffRole || name === "staff" || name === "nexadevstaff";
        })
      );
    }
    function isProtectedMember(member) {
      return isLinkExempt(member) || member?.id === member?.guild?.ownerId;
    }
    function containsBlockedLink(content) {
      return /(?:https?:\/\/|www\.|discord(?:app)?\.com\/invite\/|discord\.gg\/)/i.test(content || "");
    }
    function findSecurityChannel(guild) {
      const wanted = normalizeName(NAMES.securityLogsChannel);
      return guild.channels.cache.find(
        (channel) => channel.isTextBased?.() && !channel.isThread?.() && normalizeName(channel.name) === wanted
      ) || byName(guild.channels.cache, NAMES.logsChannel);
    }
    function leadershipMentions(guild) {
      const role = byName(guild.roles.cache, NAMES.leadershipRole);
      const userIds = [...guild.members.cache.values()].filter((member) => member.id === guild.ownerId || member.permissions.has(PermissionFlagsBits2.Administrator)).slice(0, 20).map((member) => member.id);
      if (!userIds.includes(guild.ownerId)) userIds.unshift(guild.ownerId);
      return {
        content: [...new Set(userIds)].map((id) => `<@${id}>`).join(" ") + (role ? ` <@&${role.id}>` : ""),
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
    async function inChunks(items, size, callback) {
      for (let index = 0; index < items.length; index += size) {
        const chunk = items.slice(index, index + size);
        await Promise.allSettled(chunk.map(callback));
      }
    }
    async function lockGuild(guild, reason) {
      const channels = [...guild.channels.cache.values()].filter(
        (channel) => !channel.isThread?.() && channel.permissionOverwrites?.edit
      );
      const states = channels.map((channel) => {
        const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
        const permissions = {};
        for (const [name, bit] of Object.entries(LOCK_PERMISSIONS)) {
          permissions[name] = permissionState(overwrite, bit);
        }
        return { channelId: channel.id, permissions };
      });
      const denied = Object.fromEntries(Object.keys(LOCK_PERMISSIONS).map((name) => [name, false]));
      await inChunks(
        channels,
        5,
        (channel) => channel.permissionOverwrites.edit(guild.roles.everyone, denied, { reason })
      );
      return states;
    }
    async function restoreGuild(guild, session, reason) {
      const states = Array.isArray(session?.channelStates) ? session.channelStates : [];
      await inChunks(states, 5, async ({ channelId, permissions }) => {
        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (!channel?.permissionOverwrites?.edit) return;
        await channel.permissionOverwrites.edit(guild.roles.everyone, permissions, { reason });
      });
    }
    function raidDecisionRow(sessionId) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`security_raid_kick:${sessionId}`).setLabel("Gyan\xFAs tagok kir\xFAg\xE1sa").setEmoji("\u{1F6AA}").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`security_raid_ban:${sessionId}`).setLabel("Gyan\xFAs tagok kitilt\xE1sa").setEmoji("\u{1F528}").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`security_raid_false:${sessionId}`).setLabel("T\xE9ves riaszt\xE1s \u2022 felold\xE1s").setEmoji("\u2705").setStyle(ButtonStyle.Success)
      );
    }
    function snapshotAttachment(session) {
      return {
        attachment: Buffer.from(JSON.stringify(session), "utf8"),
        name: `nexabot-raid-${session.id}.json`,
        description: "NexaBot vissza\xE1ll\xEDt\xE1si adat"
      };
    }
    async function beginRaidLock(guild, records) {
      const existing = activeRaids.get(guild.id);
      if (existing) {
        for (const record of records) existing.candidateIds.add(record.userId);
        return existing;
      }
      const logChannel = findSecurityChannel(guild);
      if (!logChannel?.isTextBased()) {
        console.error("Raid gyan\xFA \xE9szlelve, de nincs minden-log vagy napl\xF3 csatorna; a lez\xE1r\xE1s biztons\xE1gi okb\xF3l elmaradt.");
        return null;
      }
      const session = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        guildId: guild.id,
        detectedAt: Date.now(),
        candidateIds: new Set(records.map((record) => record.userId)),
        channelStates: []
      };
      activeRaids.set(guild.id, session);
      try {
        session.channelStates = await lockGuild(guild, "NexaBot: k\xF6zepes \xE9rz\xE9kenys\xE9g\u0171 raidv\xE9delem");
        const storedSession = { ...session, candidateIds: [...session.candidateIds] };
        const mentions = leadershipMentions(guild);
        const embed = baseEmbed(
          "\u{1F6A8} RAID-RIASZT\xC1S \u2022 A SZERVER LEZ\xC1RVA",
          `A bot **${RAID_JOIN_LIMIT} vagy t\xF6bb bel\xE9p\xE9st** \xE9szlelt ${RAID_WINDOW_MS / 1e3} m\xE1sodpercen bel\xFCl.

A szerver a vezet\u0151i d\xF6nt\xE9sig lez\xE1rva marad. V\xE1lassz az al\xE1bbi gombok k\xF6z\xFCl. A bot nem b\xFCntet senkit automatikusan raid miatt.`,
          COLORS.danger
        ).addFields(
          { name: "Gyan\xFAs bel\xE9p\u0151k", value: `${session.candidateIds.size} f\u0151`, inline: true },
          { name: "\xC9rz\xE9kenys\xE9g", value: "K\xF6zepes", inline: true },
          { name: "D\xF6nthet", value: "Adminisztr\xE1tor vagy Vezet\u0151s\xE9g" }
        );
        const message = await logChannel.send({
          content: mentions.content,
          allowedMentions: mentions.allowedMentions,
          embeds: [embed],
          components: [raidDecisionRow(session.id)],
          files: [snapshotAttachment(storedSession)]
        });
        session.messageId = message.id;
        return session;
      } catch (error) {
        console.error("A raidlez\xE1r\xE1s nem siker\xFClt:", error);
        await restoreGuild(guild, session, "NexaBot: sikertelen raidlez\xE1r\xE1s vissza\xE1ll\xEDt\xE1sa").catch(() => null);
        activeRaids.delete(guild.id);
        return null;
      }
    }
    async function readSessionAttachment(message, expectedSessionId = null) {
      const attachment = message?.attachments?.find((item) => item.name?.startsWith("nexabot-raid-"));
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
        const hasSecurityButton = message.components.some(
          (row) => row.components.some((component) => component.customId?.startsWith("security_raid_"))
        );
        if (!hasSecurityButton) continue;
        const session = await readSessionAttachment(message);
        if (session?.guildId === guild.id) return { session, message };
      }
      return null;
    }
    async function notifyTemporary(channel, member, text) {
      const notice = await channel.send({
        content: `${member} \u26A0\uFE0F ${text}`,
        allowedMentions: { users: [member.id] }
      }).catch(() => null);
      if (notice) setTimeout(() => notice.delete().catch(() => null), 8e3).unref?.();
    }
    function strikeKey(guildId, userId) {
      return `${guildId}:${userId}`;
    }
    async function applyViolation(message, label) {
      const member = message.member;
      if (!member || isProtectedMember(member)) return;
      const key = strikeKey(message.guild.id, member.id);
      const now = Date.now();
      const previous = memberStrikes.get(key);
      const count = !previous || now - previous.lastAt > STRIKE_RESET_MS ? 1 : previous.count + 1;
      memberStrikes.set(key, { count, lastAt: now });
      let action = "Figyelmeztet\xE9s";
      let details = "A tiltott \xFCzenet t\xF6r\xF6lve.";
      try {
        if (count === 2 && member.moderatable) {
          await member.timeout(10 * 6e4, `NexaBot automatikus v\xE9delem: ${label}`);
          action = "10 perces felf\xFCggeszt\xE9s";
          details = "M\xE1sodik szab\xE1lys\xE9rt\xE9s 30 percen bel\xFCl.";
        } else if (count === 3 && member.kickable) {
          await member.send(`\u{1F6AA} A **${message.guild.name}** szerverr\u0151l az automatikus v\xE9delem kir\xFAgott.
**Indok:** ${label}`).catch(() => null);
          await member.kick(`NexaBot automatikus v\xE9delem: ${label}`);
          action = "Kir\xFAg\xE1s";
          details = "Harmadik szab\xE1lys\xE9rt\xE9s 30 percen bel\xFCl.";
        } else if (count >= 4 && member.bannable) {
          await member.send(`\u{1F528} A **${message.guild.name}** szerverr\u0151l az automatikus v\xE9delem kitiltott.
**Indok:** ${label}`).catch(() => null);
          await member.ban({ reason: `NexaBot automatikus v\xE9delem: ${label}` });
          action = "Kitilt\xE1s";
          details = "Negyedik szab\xE1lys\xE9rt\xE9s 30 percen bel\xFCl.";
        } else {
          await member.send(`\u26A0\uFE0F Figyelmeztet\xE9st kapt\xE1l a **${message.guild.name}** szerveren.
**Indok:** ${label}`).catch(() => null);
        }
      } catch (error) {
        action = "Int\xE9zked\xE9s sikertelen";
        details = `A bot rangja vagy jogosults\xE1ga nem volt elegend\u0151: ${error.message}`;
      }
      if (message.channel?.isTextBased() && count < 3) {
        await notifyTemporary(message.channel, member, `${label}. Int\xE9zked\xE9s: **${action}**.`);
      }
      await sendSecurityLog(
        message.guild,
        baseEmbed("\u{1F6E1}\uFE0F Automatikus szerverv\xE9delem", `${member.user.tag} (${member.id})`, COLORS.warning).addFields(
          { name: "Esem\xE9ny", value: label, inline: true },
          { name: "Int\xE9zked\xE9s", value: action, inline: true },
          { name: "Fokozat", value: `${count}/4`, inline: true },
          { name: "R\xE9szletek", value: details },
          { name: "Csatorna", value: `${message.channel}` }
        )
      );
    }
    async function handleProtectedMessage(message) {
      if (!message.guild || message.author.bot || !message.member) return;
      if (containsBlockedLink(message.content) && !isLinkExempt(message.member)) {
        await message.delete().catch(() => null);
        await applyViolation(message, "Tiltott link vagy Discord-megh\xEDv\xF3");
        return;
      }
      const key = strikeKey(message.guild.id, message.author.id);
      const now = Date.now();
      const entries = (spamWindows.get(key) || []).filter((entry) => now - entry.createdAt <= SPAM_WINDOW_MS);
      entries.push({ createdAt: now, message });
      spamWindows.set(key, entries);
      if (entries.length < SPAM_MESSAGE_LIMIT || now - (spamCooldowns.get(key) || 0) < 15e3) return;
      spamCooldowns.set(key, now);
      spamWindows.set(key, []);
      await Promise.allSettled(entries.map((entry) => entry.message.delete().catch(() => null)));
      await applyViolation(message, `Spam vagy \xFCzenet\xE1radat (${SPAM_MESSAGE_LIMIT} \xFCzenet / ${SPAM_WINDOW_MS / 1e3} mp)`);
    }
    async function fetchBotAdder(member) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 6 }).catch(() => null);
      return logs?.entries.find(
        (entry) => entry.target?.id === member.id && Date.now() - entry.createdTimestamp < 2e4
      )?.executor || null;
    }
    async function handleBotJoin(member) {
      if (member.id === member.client.user.id) return;
      const executor = await fetchBotAdder(member);
      const executorMember = executor ? await member.guild.members.fetch(executor.id).catch(() => null) : null;
      const authorized = Boolean(executorMember && isLeadership(executorMember));
      if (authorized) {
        await sendSecurityLog(
          member.guild,
          baseEmbed("\u{1F916} Enged\xE9lyezett bot hozz\xE1adva", `${member.user.tag} (${member.id})`, COLORS.success).addFields({ name: "Hozz\xE1adta", value: `${executor.tag} (${executor.id})` })
        );
        return;
      }
      const kicked = member.kickable ? await member.kick("NexaBot: enged\xE9ly n\xE9lk\xFCl hozz\xE1adott bot").then(() => true).catch(() => false) : false;
      const mentions = leadershipMentions(member.guild);
      await sendSecurityLog(
        member.guild,
        baseEmbed(
          "\u{1F6AB} Enged\xE9ly n\xE9lk\xFCli bot \xE9szlelve",
          `${member.user.tag} (${member.id}) ${kicked ? "**azonnal kir\xFAgva**." : "**nem volt kir\xFAghat\xF3**."}`,
          COLORS.danger
        ).addFields({
          name: "Hozz\xE1adta",
          value: executor ? `${executor.tag} (${executor.id})` : "Nem siker\xFClt biztosan azonos\xEDtani"
        }),
        { content: mentions.content, allowedMentions: mentions.allowedMentions }
      );
    }
    async function handleHumanJoin(member) {
      const now = Date.now();
      const age = now - member.user.createdTimestamp;
      if (age < FRESH_ACCOUNT_MS) {
        await sendSecurityLog(
          member.guild,
          baseEmbed("\u{1F195} Gyan\xFAsan friss fi\xF3k csatlakozott", `${member.user.tag} (${member.id})`, COLORS.warning).addFields({ name: "Fi\xF3k \xE9letkora", value: `${Math.max(0, Math.floor(age / 36e5))} \xF3ra` })
        );
      }
      const active = activeRaids.get(member.guild.id);
      if (active) active.candidateIds.add(member.id);
      const records = (joinWindows.get(member.guild.id) || []).filter((record) => now - record.joinedAt <= RAID_WINDOW_MS);
      records.push({ userId: member.id, joinedAt: now, fresh: age < FRESH_ACCOUNT_MS });
      joinWindows.set(member.guild.id, records);
      if (records.length >= RAID_JOIN_LIMIT) await beginRaidLock(member.guild, records);
    }
    async function handleMemberJoin(member) {
      if (member.user.bot) return handleBotJoin(member);
      return handleHumanJoin(member);
    }
    async function handleRaidDecision(interaction) {
      if (!isLeadership(interaction.member)) {
        return ephemeralError(interaction, "A raid-riaszt\xE1sr\xF3l csak Adminisztr\xE1tor vagy Vezet\u0151s\xE9g d\xF6nthet.");
      }
      await interaction.deferReply({ flags: EPHEMERAL });
      const [actionPart, sessionId] = interaction.customId.split(":");
      const action = actionPart.replace("security_raid_", "");
      let session = activeRaids.get(interaction.guildId);
      if (!session || session.id !== sessionId) {
        session = await readSessionAttachment(interaction.message, sessionId);
      }
      if (!session || session.guildId !== interaction.guildId) {
        return interaction.editReply("\u274C A lez\xE1r\xE1s vissza\xE1ll\xEDt\xE1si adatai nem tal\xE1lhat\xF3k. Ne m\xF3dos\xEDts k\xE9zzel jogosults\xE1gokat; k\xE9rj technikai seg\xEDts\xE9get.");
      }
      let resultText = "T\xE9ves riaszt\xE1sk\xE9nt lez\xE1rva, b\xFCntet\xE9s nem t\xF6rt\xE9nt.";
      let affected = 0;
      let skipped = 0;
      if (action === "kick" || action === "ban") {
        for (const userId of session.candidateIds) {
          const target = await interaction.guild.members.fetch(userId).catch(() => null);
          if (!target || isProtectedMember(target)) {
            skipped += 1;
            continue;
          }
          try {
            if (action === "kick" && target.kickable) {
              await target.send(`\u{1F6AA} A **${interaction.guild.name}** szerverr\u0151l raidv\xE9delem miatt kir\xFAgtak.`).catch(() => null);
              await target.kick(`Raid meger\u0151s\xEDtve: ${interaction.user.tag}`);
              affected += 1;
            } else if (action === "ban" && target.bannable) {
              await target.send(`\u{1F528} A **${interaction.guild.name}** szerverr\u0151l raidv\xE9delem miatt kitiltottak.`).catch(() => null);
              await target.ban({ reason: `Raid meger\u0151s\xEDtve: ${interaction.user.tag}` });
              affected += 1;
            } else {
              skipped += 1;
            }
          } catch {
            skipped += 1;
          }
        }
        resultText = `${action === "kick" ? "Kir\xFAgva" : "Kitiltva"}: **${affected} f\u0151**. Kihagyva vagy m\xE1r t\xE1vozott: **${skipped} f\u0151**.`;
      }
      await restoreGuild(interaction.guild, session, `NexaBot: raidriaszt\xE1s lez\xE1rva \u2013 ${interaction.user.tag}`);
      activeRaids.delete(interaction.guildId);
      joinWindows.set(interaction.guildId, []);
      const updated = EmbedBuilder.from(interaction.message.embeds[0]).setColor(action === "false" ? COLORS.success : COLORS.danger).addFields(
        { name: "D\xF6nt\xE9s", value: resultText },
        { name: "D\xF6nt\xE9shoz\xF3", value: `${interaction.user.tag} (${interaction.user.id})` },
        { name: "Szerver \xE1llapota", value: "\u2705 Feloldva" }
      );
      await interaction.message.edit({ embeds: [updated], components: [], attachments: [] }).catch(() => null);
      return interaction.editReply(`\u2705 ${resultText}
A szerver lez\xE1r\xE1s\xE1t feloldottam.`);
    }
    function buildSecurityCommand2() {
      return new SlashCommandBuilder2().setName("vedelem").setDescription("A NexaBot automatikus szerverv\xE9delm\xE9nek kezel\xE9se.").addSubcommand(
        (subcommand) => subcommand.setName("statusz").setDescription("Megmutatja a v\xE9delem \xE1llapot\xE1t.")
      ).addSubcommand(
        (subcommand) => subcommand.setName("feloldas").setDescription("Feloldja az akt\xEDv raid miatti szerverlez\xE1r\xE1st.")
      ).setDMPermission(false);
    }
    async function handleSecurityCommand(interaction) {
      if (!isLeadership(interaction.member)) {
        return ephemeralError(interaction, "A v\xE9delmet csak Adminisztr\xE1tor vagy Vezet\u0151s\xE9g kezelheti.");
      }
      const subcommand = interaction.options.getSubcommand();
      await interaction.deferReply({ flags: EPHEMERAL });
      if (subcommand === "statusz") {
        const pending = await findPendingSession(interaction.guild, interaction.client.user);
        return interaction.editReply(
          `\u{1F6E1}\uFE0F **NexaBot-v\xE9delem akt\xEDv**
\u2022 Spam: ${SPAM_MESSAGE_LIMIT} \xFCzenet / ${SPAM_WINDOW_MS / 1e3} m\xE1sodperc
\u2022 Raid: ${RAID_JOIN_LIMIT} bel\xE9p\u0151 / ${RAID_WINDOW_MS / 1e3} m\xE1sodperc
\u2022 Friss fi\xF3k: 3 napn\xE1l fiatalabb
\u2022 Linkek: Staff, Admin \xE9s Vezet\u0151s\xE9g sz\xE1m\xE1ra enged\xE9lyezve
\u2022 Szerver: ${pending ? "\u{1F512} raid miatt lez\xE1rva" : "\u2705 nincs akt\xEDv raidlez\xE1r\xE1s"}`
        );
      }
      if (subcommand === "feloldas") {
        const pending = await findPendingSession(interaction.guild, interaction.client.user);
        if (!pending) return interaction.editReply("\u2705 Nincs akt\xEDv NexaBot raidlez\xE1r\xE1s.");
        await restoreGuild(interaction.guild, pending.session, `NexaBot: k\xE9zi felold\xE1s \u2013 ${interaction.user.tag}`);
        activeRaids.delete(interaction.guildId);
        if (pending.message) {
          const embed = pending.message.embeds[0] ? EmbedBuilder.from(pending.message.embeds[0]).setColor(COLORS.success).addFields(
            { name: "K\xE9zi felold\xE1s", value: `${interaction.user.tag} (${interaction.user.id})` }
          ) : baseEmbed("\u2705 Raidlez\xE1r\xE1s k\xE9zzel feloldva", `${interaction.user.tag}`, COLORS.success);
          await pending.message.edit({ embeds: [embed], components: [], attachments: [] }).catch(() => null);
        }
        return interaction.editReply("\u2705 A raid miatti szerverlez\xE1r\xE1st feloldottam.");
      }
    }
    function registerSecurity2(client2) {
      client2.on(Events2.MessageCreate, handleProtectedMessage);
      client2.on(Events2.GuildMemberAdd, handleMemberJoin);
    }
    module2.exports = {
      RAID_WINDOW_MS,
      RAID_JOIN_LIMIT,
      FRESH_ACCOUNT_MS,
      SPAM_WINDOW_MS,
      SPAM_MESSAGE_LIMIT,
      normalizeName,
      containsBlockedLink,
      isLeadership,
      isLinkExempt,
      findSecurityChannel,
      raidDecisionRow,
      buildSecurityCommand: buildSecurityCommand2,
      handleSecurityCommand,
      handleRaidDecision,
      registerSecurity: registerSecurity2
    };
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
      moderationActionRows,
      timeoutChoices,
      moderationConfirmation,
      rolePicker,
      unbanPicker,
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
    var {
      installDocumentPanels,
      handleDocumentButton,
      handleDocumentModal
    } = require_documents();
    var {
      handleSecurityCommand,
      handleRaidDecision
    } = require_security();
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
      if (interaction.commandName === "vedelem") {
        return handleSecurityCommand(interaction);
      }
      if (!interaction.member.permissions.has(PermissionFlagsBits2.Administrator)) {
        return ephemeralError(interaction, "Ehhez rendszergazdai jogosults\xE1g sz\xFCks\xE9ges.");
      }
      if (interaction.commandName === "dokumentum-panelek") {
        await interaction.deferReply({ flags: EPHEMERAL });
        try {
          const result = await installDocumentPanels(interaction.guild, interaction.client.user);
          const missingText = result.missing.length ? `
\u26A0\uFE0F **Nem tal\xE1lt megl\xE9v\u0151 csatorn\xE1k:** ${result.missing.join(", ")}` : "";
          return interaction.editReply(
            `\u2705 **${result.installed.length} dokumentumpanel** elk\xE9sz\xFClt vagy friss\xFClt. A bot nem hozott l\xE9tre \xFAj csatorn\xE1t.${missingText}`
          );
        } catch (error) {
          console.error("Dokumentumpanel-telep\xEDt\xE9si hiba:", error);
          return interaction.editReply("\u274C A dokumentumpaneleket nem siker\xFClt minden megl\xE9v\u0151 csatorn\xE1ban be\xE1ll\xEDtani. Ellen\u0151rizd a bot jogosults\xE1gait.");
        }
      }
      if (interaction.commandName !== "telepites") return;
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
      if (id.startsWith("security_raid_")) return handleRaidDecision(interaction);
      if (id.startsWith("doc_")) return handleDocumentButton(interaction);
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
      if (id === "staff_channel") {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag vagy adminisztr\xE1tor haszn\xE1lhatja.");
        return interaction.showModal(channelModal());
      }
      if (id === "mod_unban_open") {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag vagy adminisztr\xE1tor haszn\xE1lhatja.");
        await interaction.deferReply({ flags: EPHEMERAL });
        const bans = await interaction.guild.bans.fetch().catch(() => null);
        if (!bans) return interaction.editReply("\u274C Nem siker\xFClt lek\xE9rni a kitiltott felhaszn\xE1l\xF3kat. Ellen\u0151rizd a bot jogosults\xE1gait.");
        if (!bans.size) return interaction.editReply("\u2705 Jelenleg nincs kitiltott felhaszn\xE1l\xF3.");
        const visibleBans = [...bans.values()].slice(0, 25);
        return interaction.editReply({
          content: bans.size > 25 ? "V\xE1laszd ki, kinek oldod fel a kitilt\xE1s\xE1t. A lista az els\u0151 25 kitiltott felhaszn\xE1l\xF3t mutatja." : "V\xE1laszd ki, kinek oldod fel a kitilt\xE1s\xE1t.",
          components: [unbanPicker(visibleBans)]
        });
      }
      if (id.startsWith("mod_action:")) {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag vagy adminisztr\xE1tor haszn\xE1lhatja.");
        const [, action, targetId] = id.split(":");
        if (action === "timeout") {
          return interaction.update({
            content: `V\xE1laszd ki a felf\xFCggeszt\xE9s id\u0151tartam\xE1t <@${targetId}> sz\xE1m\xE1ra:`,
            embeds: [],
            components: [timeoutChoices(targetId)]
          });
        }
        if (action === "kick" || action === "ban") {
          return interaction.update({
            content: `Biztosan v\xE9grehajtod ezt a m\u0171veletet: **${action === "kick" ? "kir\xFAg\xE1s" : "kitilt\xE1s"}** \u2013 <@${targetId}>?`,
            embeds: [],
            components: [moderationConfirmation(action, targetId)]
          });
        }
        if (action === "role_add" || action === "role_remove") {
          return interaction.update({
            content: `V\xE1laszd ki a ${action === "role_add" ? "hozz\xE1adand\xF3" : "leveend\u0151"} rangot <@${targetId}> sz\xE1m\xE1ra:`,
            embeds: [],
            components: [rolePicker(action, targetId)]
          });
        }
        return interaction.showModal(moderationModal(action, targetId));
      }
      if (id.startsWith("mod_timeout:")) {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag vagy adminisztr\xE1tor haszn\xE1lhatja.");
        const [, duration, targetId] = id.split(":");
        const action = duration === "custom" ? "timeout_custom" : `timeout_${duration}`;
        return interaction.showModal(moderationModal(action, targetId));
      }
      if (id.startsWith("mod_confirm:")) {
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag vagy adminisztr\xE1tor haszn\xE1lhatja.");
        const [, action, targetId] = id.split(":");
        return interaction.showModal(moderationModal(action, targetId));
      }
      if (id === "mod_cancel") {
        return interaction.update({ content: "A m\u0171velet megszak\xEDtva.", embeds: [], components: [] });
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
    async function handleSelectMenu(interaction) {
      if (!isStaff(interaction.member)) {
        return ephemeralError(interaction, "Ezt csak staff tag vagy adminisztr\xE1tor haszn\xE1lhatja.");
      }
      if (interaction.customId === "mod_target_select") {
        const targetId = interaction.values[0];
        const target = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!target) return ephemeralError(interaction, "Nem tal\xE1lom a kiv\xE1lasztott felhaszn\xE1l\xF3t a szerveren.");
        return interaction.reply({
          embeds: [
            baseEmbed(
              "\u{1F6E1}\uFE0F Moder\xE1ci\xF3s m\u0171velet kiv\xE1laszt\xE1sa",
              `**Kiv\xE1lasztott tag:** ${target}
**Felhaszn\xE1l\xF3n\xE9v:** ${target.user.tag}

V\xE1laszd ki, mit szeretn\xE9l tenni vele.`,
              COLORS.neutral
            ).setThumbnail(target.user.displayAvatarURL())
          ],
          components: moderationActionRows(targetId),
          flags: EPHEMERAL
        });
      }
      if (interaction.customId.startsWith("mod_role_select:")) {
        const [, action, targetId] = interaction.customId.split(":");
        const roleId = interaction.values[0];
        return interaction.showModal(moderationModal(action, targetId, roleId));
      }
      if (interaction.customId === "mod_unban_select") {
        const targetId = interaction.values[0];
        return interaction.showModal(moderationModal("unban", targetId));
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
    function canActOn(interaction, target) {
      if (!target || target.id === interaction.user.id || target.id === interaction.guild.ownerId) return false;
      const actor = interaction.member;
      const isOwner = actor.id === interaction.guild.ownerId;
      const isAdmin = actor.permissions.has(PermissionFlagsBits2.Administrator);
      return isOwner || isAdmin || actor.roles.highest.position > target.roles.highest.position;
    }
    function evidenceFields(evidence) {
      return evidence ? [{ name: "Bizony\xEDt\xE9k", value: evidence }] : [];
    }
    async function sendModerationDM(target, guildName, action, reason, extra = null) {
      const message = [
        `\u{1F6E1}\uFE0F Moder\xE1ci\xF3s int\xE9zked\xE9s t\xF6rt\xE9nt veled a **${guildName}** szerveren.`,
        `**M\u0171velet:** ${action}`,
        `**Indok:** ${reason}`
      ];
      if (extra) message.push(`**R\xE9szletek:** ${extra}`);
      return target.send(message.join("\n")).then(() => true).catch(() => false);
    }
    async function handleModerationSubmit(interaction) {
      if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag vagy adminisztr\xE1tor haszn\xE1lhatja.");
      await interaction.deferReply({ flags: EPHEMERAL });
      const [, action, targetId, extraId] = interaction.customId.split(":");
      const reason = getText(interaction, "mod_reason");
      const evidence = getText(interaction, "mod_evidence");
      const staffText = `${interaction.user.tag} (${interaction.user.id})`;
      if (action === "unban") {
        const ban = await interaction.guild.bans.fetch(targetId).catch(() => null);
        if (!ban) return interaction.editReply("\u274C Ez a felhaszn\xE1l\xF3 m\xE1r nincs a kitilt\xE1si list\xE1n.");
        await interaction.guild.members.unban(targetId, `${reason} \u2022 ${interaction.user.tag}`);
        const dmSent2 = await sendModerationDM(ban.user, interaction.guild.name, "Kitilt\xE1s felold\xE1sa", reason);
        const embed2 = baseEmbed("\u{1F513} Kitilt\xE1s feloldva", `${ban.user.tag} kitilt\xE1sa feloldva.`, COLORS.success).addFields(
          { name: "Indok", value: reason },
          ...evidenceFields(evidence),
          { name: "Staff", value: staffText }
        );
        await sendLog(interaction.guild, embed2);
        return interaction.editReply(`\u2705 ${ban.user.tag} kitilt\xE1sa feloldva.${dmSent2 ? "" : "\n\u26A0\uFE0F A priv\xE1t \xFCzenetet nem siker\xFClt elk\xFCldeni."}`);
      }
      const target = await interaction.guild.members.fetch(targetId).catch(() => null);
      if (!target) return interaction.editReply("\u274C A kiv\xE1lasztott felhaszn\xE1l\xF3 m\xE1r nincs a szerveren.");
      if (!canActOn(interaction, target)) {
        return interaction.editReply("\u274C Magadon, a szervertulajdonoson vagy n\xE1lad magasabb rang\xFA tagon nem hajthatod v\xE9gre ezt a m\u0171veletet.");
      }
      const targetTag = target.user.tag;
      let title;
      let description;
      let color = COLORS.warning;
      let actionLabel;
      let extraDetails = null;
      let dmSent = true;
      if (action === "warn") {
        title = "\u26A0\uFE0F Figyelmeztet\xE9s";
        description = `${target} figyelmeztet\xE9st kapott.`;
        actionLabel = "Figyelmeztet\xE9s";
      } else if (action.startsWith("timeout_")) {
        const minutes = action === "timeout_custom" ? Number.parseInt(getText(interaction, "mod_minutes"), 10) : Number.parseInt(action.split("_")[1], 10);
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 40320) {
          return interaction.editReply("\u274C Az id\u0151tartam 1 \xE9s 40320 perc k\xF6z\xF6tt lehet.");
        }
        if (!target.moderatable) return interaction.editReply("\u274C A bot rangsorrend vagy jogosults\xE1g miatt nem tudja felf\xFCggeszteni ezt a tagot.");
        await target.timeout(minutes * 6e4, `${reason} \u2022 ${interaction.user.tag}`);
        title = "\u23F1\uFE0F Felf\xFCggeszt\xE9s kiosztva";
        description = `${target} **${minutes} perces** felf\xFCggeszt\xE9st kapott.`;
        actionLabel = "Felf\xFCggeszt\xE9s / id\u0151korl\xE1t";
        extraDetails = `${minutes} perc`;
      } else if (action === "untimeout") {
        if (!target.moderatable) return interaction.editReply("\u274C A bot rangsorrend vagy jogosults\xE1g miatt nem tudja feloldani a felf\xFCggeszt\xE9st.");
        await target.timeout(null, `${reason} \u2022 ${interaction.user.tag}`);
        title = "\u2705 Felf\xFCggeszt\xE9s feloldva";
        description = `${target} felf\xFCggeszt\xE9se feloldva.`;
        actionLabel = "Felf\xFCggeszt\xE9s felold\xE1sa";
        color = COLORS.success;
      } else if (action === "kick") {
        if (!target.kickable) return interaction.editReply("\u274C A bot rangsorrend vagy jogosults\xE1g miatt nem tudja kir\xFAgni ezt a tagot.");
        actionLabel = "Kir\xFAg\xE1s";
        dmSent = await sendModerationDM(target, interaction.guild.name, actionLabel, reason);
        await target.kick(`${reason} \u2022 ${interaction.user.tag}`);
        title = "\u{1F6AA} Tag kir\xFAgva";
        description = `${targetTag} elt\xE1vol\xEDtva a szerverr\u0151l.`;
        color = COLORS.danger;
      } else if (action === "ban") {
        if (!target.bannable) return interaction.editReply("\u274C A bot rangsorrend vagy jogosults\xE1g miatt nem tudja kitiltani ezt a tagot.");
        actionLabel = "Kitilt\xE1s";
        dmSent = await sendModerationDM(target, interaction.guild.name, actionLabel, reason);
        await target.ban({ reason: `${reason} \u2022 ${interaction.user.tag}` });
        title = "\u{1F528} Tag kitiltva";
        description = `${targetTag} kitiltva a szerverr\u0151l.`;
        color = COLORS.danger;
      } else if (action === "role_add" || action === "role_remove") {
        const role = await interaction.guild.roles.fetch(extraId).catch(() => null);
        if (!role || role.id === interaction.guild.id || role.managed || !role.editable) {
          return interaction.editReply("\u274C Ezt a rangot a bot nem tudja kezelni. Ellen\u0151rizd a rangsort.");
        }
        const actor = interaction.member;
        const actorCanManage = actor.id === interaction.guild.ownerId || actor.permissions.has(PermissionFlagsBits2.Administrator) || actor.roles.highest.position > role.position;
        if (!actorCanManage) return interaction.editReply("\u274C N\xE1lad magasabb vagy azonos rangot nem kezelhetsz.");
        if (action === "role_add") await target.roles.add(role, `${reason} \u2022 ${interaction.user.tag}`);
        else await target.roles.remove(role, `${reason} \u2022 ${interaction.user.tag}`);
        actionLabel = action === "role_add" ? "Rang hozz\xE1ad\xE1sa" : "Rang lev\xE9tele";
        extraDetails = role.name;
        title = action === "role_add" ? "\u2795 Rang hozz\xE1adva" : "\u2796 Rang lev\xE9ve";
        description = `${target} \u2022 ${role}`;
        color = action === "role_add" ? COLORS.success : COLORS.warning;
      } else if (action === "nickname") {
        if (!target.manageable) return interaction.editReply("\u274C A bot rangsorrend miatt nem tudja m\xF3dos\xEDtani ezt a tagot.");
        const nickname = getText(interaction, "mod_nickname");
        await target.setNickname(nickname, `${reason} \u2022 ${interaction.user.tag}`);
        actionLabel = "Becen\xE9v m\xF3dos\xEDt\xE1sa";
        extraDetails = nickname;
        title = "\u270F\uFE0F Becen\xE9v m\xF3dos\xEDtva";
        description = `${target} \xFAj beceneve: **${nickname}**`;
        color = COLORS.success;
      } else {
        return interaction.editReply("\u274C Ismeretlen moder\xE1ci\xF3s m\u0171velet.");
      }
      if (action !== "kick" && action !== "ban") {
        dmSent = await sendModerationDM(target, interaction.guild.name, actionLabel, reason, extraDetails);
      }
      const embed = baseEmbed(title, description, color).addFields(
        { name: "Indok", value: reason },
        ...evidenceFields(evidence),
        { name: "Staff", value: staffText }
      );
      if (extraDetails) embed.addFields({ name: "R\xE9szletek", value: extraDetails });
      if (action === "warn") {
        const warningChannel = byName(interaction.guild.channels.cache, NAMES.warningsChannel);
        await warningChannel?.send({ embeds: [embed] }).catch(() => null);
      }
      await sendLog(interaction.guild, embed);
      return interaction.editReply(`\u2705 A m\u0171velet siker\xFClt: **${actionLabel}** \u2013 ${targetTag}.${dmSent ? "" : "\n\u26A0\uFE0F A priv\xE1t \xFCzenetet nem siker\xFClt elk\xFCldeni."}`);
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
      if (interaction.customId.startsWith("doc_")) {
        return handleDocumentModal(interaction);
      }
      if (interaction.customId.startsWith("mod_submit:")) {
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
    async function handleInteraction2(interaction) {
      try {
        if (interaction.isChatInputCommand()) return await handleCommand(interaction);
        if (interaction.isButton()) return await handleButton(interaction);
        if (interaction.isUserSelectMenu() || interaction.isRoleSelectMenu() || interaction.isStringSelectMenu()) {
          return await handleSelectMenu(interaction);
        }
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
var { buildSecurityCommand, registerSecurity } = require_security();
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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});
var command = new SlashCommandBuilder().setName("telepites").setDescription("L\xE9trehozza vagy friss\xEDti a NexaBot gombos rendszer\xE9t.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false);
var documentCommand = new SlashCommandBuilder().setName("dokumentum-panelek").setDescription("Paneleket tesz a megl\xE9v\u0151 BVI dokumentumcsatorn\xE1kba, \xFAj csatorna n\xE9lk\xFCl.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false);
async function registerCommand() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: [command.toJSON(), documentCommand.toJSON(), buildSecurityCommand().toJSON()] }
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
    console.log("A /telepites, /dokumentum-panelek \xE9s /vedelem parancs haszn\xE1latra k\xE9sz.");
  } catch (error) {
    console.error("A parancs regisztr\xE1l\xE1sa nem siker\xFClt:", error);
  }
});
client.on(Events.InteractionCreate, handleInteraction);
registerEvents(client);
registerSecurity(client);
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
