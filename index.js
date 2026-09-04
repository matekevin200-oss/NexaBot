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
    function ticketPanel(customDescription = null) {
      const embed = new EmbedBuilder().setColor(COLORS.primary).setTitle("\u{1F3AB} Seg\xEDts\xE9gk\xE9r\xE9s").setDescription(
        customDescription || "**Seg\xEDts\xE9gre van sz\xFCks\xE9ged?**\n\nNyomd meg az al\xE1bbi gombot. A bot l\xE9trehoz neked egy priv\xE1t seg\xEDts\xE9gk\xE9r\u0151 csatorn\xE1t, amelyet csak te \xE9s a staff l\xE1t."
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
    function staffPanel(staffRoleName = "NexaDev Staff") {
      const embed = new EmbedBuilder().setColor(COLORS.neutral).setTitle("\u{1F6E1}\uFE0F NexaBot staff vez\xE9rl\u0151pult").setDescription(
        `V\xE1laszd ki a kezelni k\xEDv\xE1nt tagot az al\xE1bbi list\xE1b\xF3l, majd v\xE1laszd ki a m\u0171veletet.

A panelt csak a **${staffRoleName}** ranggal vagy adminisztr\xE1tori jogosults\xE1ggal lehet haszn\xE1lni.`
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

// node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/postgres-array/index.js"(exports2) {
    "use strict";
    exports2.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/pg-types/lib/arrayParser.js"(exports2, module2) {
    var array = require_postgres_array();
    module2.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/postgres-date/index.js"(exports2, module2) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module2.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/xtend/mutable.js"(exports2, module2) {
    module2.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/postgres-interval/index.js"(exports2, module2) {
    "use strict";
    var extend = require_mutable();
    module2.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/postgres-bytea/index.js"(exports2, module2) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module2.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/pg-types/lib/textParsers.js"(exports2, module2) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/pg-int8/index.js"(exports2, module2) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module2.exports = readInt8;
  }
});

// node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/pg-types/lib/binaryParsers.js"(exports2, module2) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/pg-types/lib/builtins.js"(exports2, module2) {
    module2.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/pg-types/index.js"(exports2) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports2.getTypeParser = getTypeParser;
    exports2.setTypeParser = setTypeParser;
    exports2.arrayParser = arrayParser;
    exports2.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/pg/lib/defaults.js"(exports2, module2) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module2.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module2.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "node_modules/pg/lib/utils.js"(exports2, module2) {
    "use strict";
    var defaults = require_defaults();
    var { isDate } = require("util/types");
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (defaults.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : config;
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    var escapeIdentifier = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module2.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier,
      escapeLiteral
    };
  }
});

// node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "node_modules/pg/lib/crypto/utils.js"(exports2, module2) {
    var nodeCrypto = require("crypto");
    module2.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "node_modules/pg/lib/crypto/cert-signatures.js"(exports2, module2) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https: return//github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module2.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/pg/lib/crypto/sasl.js"(exports2, module2) {
    "use strict";
    var crypto = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto.sha256(clientKey);
      const clientSignature = await crypto.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module2.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/pg/lib/type-overrides.js"(exports2, module2) {
    "use strict";
    var types = require_pg_types();
    function TypeOverrides(userTypes) {
      this._types = userTypes || types;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module2.exports = TypeOverrides;
  }
});

// node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/pg-connection-string/index.js"(exports2, module2) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = dummyHost ? "" : result.hostname;
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs = config.sslcert || config.sslkey || config.sslrootcert ? require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module2.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/pg/lib/connection-parameters.js"(exports2, module2) {
    "use strict";
    var dns = require("dns");
    var defaults = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module2.exports = ConnectionParameters;
  }
});

// node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/pg/lib/result.js"(exports2, module2) {
    "use strict";
    var types = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result = class {
      constructor(rowMode, types2) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types2;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module2.exports = Result;
  }
});

// node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/pg/lib/query.js"(exports2, module2) {
    "use strict";
    var { EventEmitter } = require("events");
    var Result = require_result();
    var utils = require_utils();
    var Query = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name]);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module2.exports = Query;
  }
});

// node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/pg-protocol/dist/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoticeMessage = exports2.DataRowMessage = exports2.CommandCompleteMessage = exports2.ReadyForQueryMessage = exports2.NotificationResponseMessage = exports2.BackendKeyDataMessage = exports2.AuthenticationMD5Password = exports2.ParameterStatusMessage = exports2.ParameterDescriptionMessage = exports2.RowDescriptionMessage = exports2.Field = exports2.CopyResponse = exports2.CopyDataMessage = exports2.DatabaseError = exports2.copyDone = exports2.emptyQuery = exports2.replicationStart = exports2.portalSuspended = exports2.noData = exports2.closeComplete = exports2.bindComplete = exports2.parseComplete = void 0;
    exports2.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports2.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports2.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports2.noData = {
      name: "noData",
      length: 5
    };
    exports2.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports2.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports2.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports2.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports2.DatabaseError = DatabaseError;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports2.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports2.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports2.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports2.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports2.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports2.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports2.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports2.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports2.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports2.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports2.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports2.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports2.NoticeMessage = NoticeMessage;
  }
});

// node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/pg-protocol/dist/buffer-writer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports2.Writer = Writer;
  }
});

// node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/pg-protocol/dist/serializer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types = query2.types || emptyArray;
      const len = types.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var paramWriter = new buffer_writer_1.Writer();
    var writeValues = function(values, valueMapper) {
      for (let i = 0; i < values.length; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        if (mappedVal == null) {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          writer.addInt16(
            1
            /* ParamType.BINARY */
          );
          paramWriter.addInt32(mappedVal.length);
          paramWriter.add(mappedVal);
        } else {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32PrefixedString(mappedVal);
        }
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper);
      } catch (err) {
        writer.clear();
        paramWriter.clear();
        throw err;
      }
      writer.addInt16(len);
      writer.add(paramWriter.flush());
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports2.serialize = serialize;
  }
});

// node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/pg-protocol/dist/buffer-reader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start2 = this.offset;
        let end = start2;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start2, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports2.BufferReader = BufferReader;
  }
});

// node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/pg-protocol/dist/parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports2.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "node_modules/pg-protocol/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseError = exports2.serialize = void 0;
    exports2.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports2, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "node_modules/pg-cloudflare/dist/empty.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = {};
  }
});

// node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/pg/lib/stream.js"(exports2, module2) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module2.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/pg/lib/connection.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port2, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port2, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._ending = true;
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module2.exports = Connection;
  }
});

// node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/split2/index.js"(exports2, module2) {
    "use strict";
    var { Transform } = require("stream");
    var { StringDecoder } = require("string_decoder");
    var kLast = /* @__PURE__ */ Symbol("last");
    var kDecoder = /* @__PURE__ */ Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module2.exports = split;
  }
});

// node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/pgpass/lib/helper.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var Stream = require("stream").Stream;
    var split = require_split2();
    var util = require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module2.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module2.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module2.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module2.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module2.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module2.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module2.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module2.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/pgpass/lib/index.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs = require("fs");
    var helper = require_helper();
    module2.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module2.exports.warnTo = helper.warnTo;
  }
});

// node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/pg/lib/client.js"(exports2, module2) {
    var EventEmitter = require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = require("util");
    var sasl = require_sasl();
    var TypeOverrides = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query = require_query();
    var defaults = require_defaults();
    var Connection = require_connection();
    var crypto = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client2 = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client2, query) {
        if (client2.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client2.processID, client2.secretKey);
          });
        } else if (client2._queryQueue.indexOf(query) !== -1) {
          client2._queryQueue.splice(client2._queryQueue.indexOf(query), 1);
        } else if (client2._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client2.Query = Query;
    module2.exports = Client2;
  }
});

// node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/pg-pool/index.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client2, idleListener, timeoutId) {
        this.client = client2;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client2) {
        err ? rej(err) : res(client2);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client2) {
      return function idleListener(err) {
        err.client = client2;
        client2.removeListener("error", idleListener);
        client2.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client2);
        pool.emit("error", err, client2);
      };
    }
    var Pool = class extends EventEmitter {
      constructor(options, Client2) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client2 || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client2 = idleItem.client;
          client2.ref && client2.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client2, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client2, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client2);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client2);
        const context = this;
        client2.end(() => {
          context.emit("remove", client2);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client2 = new this.Client(this.options);
        this._clients.push(client2);
        const idleListener = makeIdleListener(this, client2);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client2.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client2.connection.stream.destroy();
            } else if (!client2.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client2.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client2.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client2.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client2);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client2)).then(
                () => {
                  this._afterConnect(client2, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client2);
                  client2.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client2, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client2, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client2);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client2);
            if (idleIndex !== -1) {
              this._acquireClient(
                client2,
                new PendingItem((err, client3, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client2.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client2, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client2, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client2);
        }
        this.emit("acquire", client2);
        client2.release = this._releaseOnce(client2, idleListener);
        client2.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client2, (err) => {
              if (err) {
                client2.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client2, client2.release);
            });
          } else {
            pendingItem.callback(void 0, client2, client2.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client2, client2.release);
          } else {
            client2.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client2, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client2, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client2, idleListener, err) {
        client2.on("error", idleListener);
        client2._poolUseCount = (client2._poolUseCount || 0) + 1;
        this.emit("release", err, client2);
        if (err || this.ending || !client2._queryable || client2._ending || client2._poolUseCount >= this.options.maxUses) {
          if (client2._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client2, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client2);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client2);
          return this._remove(client2, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client2, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client2.unref();
        }
        this._idle.push(new IdleItem(client2, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client2) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client2.release(err2);
            cb(err2);
          };
          client2.once("error", onError);
          this.log("dispatching query");
          try {
            client2.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client2.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client2.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client2.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client2) => acc + (this._expired.has(client2) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module2.exports = Pool;
  }
});

// node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/pg/lib/native/query.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var utils = require_utils();
    var NativeQuery = module2.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native && this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client2) {
      this.state = "running";
      const self = this;
      this.native = client2.native;
      client2.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client2.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client2.namedQueries[this.name]) {
          if (this.text && client2.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client2.native.execute(this.name, values, after);
        }
        return client2.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client2.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client2.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client2.native.query(this.text, [], after);
      } else {
        client2.native.query(this.text, after);
      }
    };
  }
});

// node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/pg/lib/native/client.js"(exports2, module2) {
    var nodeUtils = require("util");
    var Native;
    try {
      Native = require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides = require_type_overrides();
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client2 = module2.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config.pipeline);
      this._pipelineInFlight = false;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client2.Query = NativeQuery;
    util.inherits(Client2, EventEmitter);
    Client2.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client2.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client2.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client2.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client2.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client2.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client2.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client2.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          for (let i = 0; i < nativeQueries.length; i++) {
            const q = nativeQueries[i];
            q.native = self.native;
            q.handleError(err);
          }
          self._pulsePipelinedQueryQueue();
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          const r = results[i];
          q.native = self.native;
          if (r.err) {
            q.handleError(r.err);
          } else {
            if (q.name) {
              self.namedQueries[q.name] = q.text;
            }
            q.state = "end";
            q.emit("end", r.result);
            if (q.callback) {
              q.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client2.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client2.prototype.ref = function() {
    };
    Client2.prototype.unref = function() {
    };
    Client2.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client2.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client2.prototype.isConnected = function() {
      return this._connected;
    };
    Client2.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/pg/lib/native/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_client2();
  }
});

// node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/pg/lib/index.js"(exports2, module2) {
    "use strict";
    var Client2 = require_client();
    var defaults = require_defaults();
    var Connection = require_connection();
    var Result = require_result();
    var utils = require_utils();
    var Pool = require_pg_pool();
    var TypeOverrides = require_type_overrides();
    var { DatabaseError } = require_dist();
    var { escapeIdentifier, escapeLiteral } = require_utils();
    var poolFactory = (Client3) => {
      return class BoundPool extends Pool {
        constructor(options) {
          super(options, Client3);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError;
      this.TypeOverrides = TypeOverrides;
      this.escapeIdentifier = escapeIdentifier;
      this.escapeLiteral = escapeLiteral;
      this.Result = Result;
      this.utils = utils;
    };
    var clientConstructor = Client2;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module2.exports = new PG(clientConstructor);
    Object.defineProperty(module2.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module2.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// src/config.js
var require_config = __commonJS({
  "src/config.js"(exports2, module2) {
    var { Pool } = require_lib2();
    var { PermissionFlagsBits: PermissionFlagsBits2 } = require("discord.js");
    var { NAMES } = require_constants();
    var cache = /* @__PURE__ */ new Map();
    var pool = null;
    var persistent = false;
    var MODULE_KEYS = Object.freeze(["protection", "moderation", "tickets", "welcome", "bvi"]);
    var CHANNEL_KEYS = Object.freeze([
      "securityLogs",
      "logs",
      "ticketPanel",
      "ticketCategory",
      "moderationPanel",
      "welcome",
      "warnings"
    ]);
    var ROLE_KEYS = Object.freeze(["staff", "auto", "dashboard"]);
    function isBviGuild(guildId) {
      return Boolean(process.env.GUILD_ID && guildId === process.env.GUILD_ID);
    }
    function defaultConfig(guildId) {
      const bvi = isBviGuild(guildId);
      return {
        modules: {
          protection: bvi,
          moderation: bvi,
          tickets: bvi,
          welcome: bvi,
          bvi
        },
        channels: Object.fromEntries(CHANNEL_KEYS.map((key) => [key, null])),
        roles: Object.fromEntries(ROLE_KEYS.map((key) => [key, null])),
        messages: {
          welcome: "\xDCdv\xF6zl\xFCnk a szerveren, {tag}! K\xE9rj\xFCk, olvasd el a szab\xE1lyzatot.",
          ticket: "Nyomd meg az al\xE1bbi gombot, ha seg\xEDts\xE9gre van sz\xFCks\xE9ged."
        },
        protection: {
          sensitivity: "medium",
          deleteMessages: true,
          warn: true,
          timeout: true,
          kick: true,
          ban: true,
          lockdown: true
        }
      };
    }
    function sanitizeId(value) {
      const id = String(value || "").trim();
      return /^\d{16,22}$/.test(id) ? id : null;
    }
    function sanitizeConfig(guildId, input = {}) {
      const defaults = defaultConfig(guildId);
      const config = {
        modules: { ...defaults.modules },
        channels: { ...defaults.channels },
        roles: { ...defaults.roles },
        messages: { ...defaults.messages },
        protection: { ...defaults.protection }
      };
      for (const key of MODULE_KEYS) config.modules[key] = Boolean(input.modules?.[key]);
      if (!isBviGuild(guildId)) config.modules.bvi = false;
      for (const key of CHANNEL_KEYS) config.channels[key] = sanitizeId(input.channels?.[key]);
      for (const key of ROLE_KEYS) config.roles[key] = sanitizeId(input.roles?.[key]);
      const welcome = String(input.messages?.welcome || defaults.messages.welcome).trim().slice(0, 1e3);
      const ticket = String(input.messages?.ticket || defaults.messages.ticket).trim().slice(0, 1e3);
      config.messages.welcome = welcome || defaults.messages.welcome;
      config.messages.ticket = ticket || defaults.messages.ticket;
      const sensitivity = String(input.protection?.sensitivity || "medium");
      config.protection.sensitivity = ["strict", "medium", "relaxed"].includes(sensitivity) ? sensitivity : "medium";
      for (const key of ["deleteMessages", "warn", "timeout", "kick", "ban", "lockdown"]) {
        config.protection[key] = Boolean(input.protection?.[key]);
      }
      return config;
    }
    function mergeStoredConfig(guildId, stored) {
      if (!stored || typeof stored !== "object") return defaultConfig(guildId);
      const defaults = defaultConfig(guildId);
      const merged = {
        modules: { ...defaults.modules, ...stored.modules || {} },
        channels: { ...defaults.channels, ...stored.channels || {} },
        roles: { ...defaults.roles, ...stored.roles || {} },
        messages: { ...defaults.messages, ...stored.messages || {} },
        protection: { ...defaults.protection, ...stored.protection || {} }
      };
      if (!isBviGuild(guildId)) merged.modules.bvi = false;
      return sanitizeConfig(guildId, merged);
    }
    async function initConfigStore2() {
      if (!process.env.DATABASE_URL) {
        console.warn("DATABASE_URL nincs be\xE1ll\xEDtva: a webes be\xE1ll\xEDt\xE1sok csak a k\xF6vetkez\u0151 \xFAjraind\xEDt\xE1sig maradnak meg.");
        return false;
      }
      try {
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
          max: 5,
          idleTimeoutMillis: 3e4
        });
        await pool.query(`
      CREATE TABLE IF NOT EXISTS nexabot_guild_configs (
        guild_id TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        const result = await pool.query("SELECT guild_id, config FROM nexabot_guild_configs");
        for (const row of result.rows) cache.set(row.guild_id, mergeStoredConfig(row.guild_id, row.config));
        persistent = true;
        console.log(`${result.rowCount} szerver be\xE1ll\xEDt\xE1sai bet\xF6ltve az adatb\xE1zisb\xF3l.`);
        return true;
      } catch (error) {
        persistent = false;
        pool = null;
        console.error("Az adatb\xE1zis nem \xE9rhet\u0151 el, a bot ideiglenes mem\xF3ri\xE1t haszn\xE1l:", error.message);
        return false;
      }
    }
    function getGuildConfig(guildId) {
      if (!cache.has(guildId)) cache.set(guildId, defaultConfig(guildId));
      return cache.get(guildId);
    }
    async function setGuildConfig(guildId, input) {
      const config = sanitizeConfig(guildId, input);
      cache.set(guildId, config);
      if (pool) {
        await pool.query(
          `INSERT INTO nexabot_guild_configs (guild_id, config, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
          [guildId, JSON.stringify(config)]
        );
      }
      return config;
    }
    function isPersistentStore() {
      return persistent;
    }
    function configuredChannel(guild, key, fallbackName = null) {
      const id = getGuildConfig(guild.id).channels[key];
      const selected = id ? guild.channels.cache.get(id) : null;
      if (selected) return selected;
      return fallbackName ? guild.channels.cache.find((channel) => channel.name === fallbackName) : null;
    }
    function configuredRole(guild, key, fallbackName = null) {
      const id = getGuildConfig(guild.id).roles[key];
      const selected = id ? guild.roles.cache.get(id) : null;
      if (selected) return selected;
      return fallbackName ? guild.roles.cache.find((role) => role.name === fallbackName) : null;
    }
    function moduleEnabled(guildId, key) {
      return Boolean(getGuildConfig(guildId).modules[key]);
    }
    function dashboardUrl(guildId = null) {
      const root = String(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");
      return guildId ? `${root}/dashboard/guild/${guildId}` : `${root}/dashboard`;
    }
    function inviteUrl() {
      const clientId = process.env.CLIENT_ID || "";
      const permissions = [
        PermissionFlagsBits2.ViewAuditLog,
        PermissionFlagsBits2.ManageChannels,
        PermissionFlagsBits2.KickMembers,
        PermissionFlagsBits2.BanMembers,
        PermissionFlagsBits2.ManageRoles,
        PermissionFlagsBits2.ManageMessages,
        PermissionFlagsBits2.ViewChannel,
        PermissionFlagsBits2.SendMessages,
        PermissionFlagsBits2.EmbedLinks,
        PermissionFlagsBits2.AttachFiles,
        PermissionFlagsBits2.ReadMessageHistory,
        PermissionFlagsBits2.AddReactions,
        PermissionFlagsBits2.ManageNicknames,
        PermissionFlagsBits2.ModerateMembers
      ].reduce((sum, value) => sum | value, 0n);
      return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&scope=bot%20applications.commands&permissions=${permissions.toString()}`;
    }
    module2.exports = {
      MODULE_KEYS,
      CHANNEL_KEYS,
      ROLE_KEYS,
      defaultConfig,
      sanitizeConfig,
      initConfigStore: initConfigStore2,
      getGuildConfig,
      setGuildConfig,
      isPersistentStore,
      configuredChannel,
      configuredRole,
      moduleEnabled,
      isBviGuild,
      dashboardUrl,
      inviteUrl
    };
  }
});

// src/utils.js
var require_utils3 = __commonJS({
  "src/utils.js"(exports2, module2) {
    var { EmbedBuilder, PermissionFlagsBits: PermissionFlagsBits2 } = require("discord.js");
    var { NAMES, COLORS } = require_constants();
    var { getGuildConfig, configuredChannel, moduleEnabled } = require_config();
    function byName(cache, name) {
      return cache.find((item) => item.name === name);
    }
    function safeChannelName(value) {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "uj-csatorna";
    }
    function isStaff(member) {
      const configuredRoleId = member?.guild?.id ? getGuildConfig(member.guild.id).roles.staff : null;
      return Boolean(
        member?.permissions?.has(PermissionFlagsBits2.ManageGuild) || configuredRoleId && member?.roles?.cache?.has(configuredRoleId) || member?.roles?.cache?.some((role) => role.name === NAMES.staffRole || role.name.toLowerCase() === "staff")
      );
    }
    function baseEmbed(title, description, color = COLORS.primary) {
      return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setFooter({ text: "NexaBot \u2022 NexaDev" }).setTimestamp();
    }
    function getText(interaction, customId) {
      return interaction.fields.getTextInputValue(customId).trim();
    }
    async function sendLog(guild, embed) {
      if (!moduleEnabled(guild.id, "moderation")) return;
      const channel = configuredChannel(guild, "logs", NAMES.logsChannel);
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
    var { byName } = require_utils3();
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
    var { baseEmbed, ephemeralError, sendLog } = require_utils3();
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
    var { baseEmbed, byName, ephemeralError } = require_utils3();
    var { getGuildConfig, moduleEnabled, configuredChannel, isBviGuild } = require_config();
    var EPHEMERAL = MessageFlags.Ephemeral;
    var RAID_WINDOW_MS = 2e4;
    var RAID_JOIN_LIMIT = 8;
    var FRESH_ACCOUNT_MS = 3 * 24 * 60 * 60 * 1e3;
    var SPAM_WINDOW_MS = 5e3;
    var SPAM_MESSAGE_LIMIT = 6;
    var STRIKE_RESET_MS = 30 * 60 * 1e3;
    var PROFILES = Object.freeze({
      strict: Object.freeze({ spamLimit: 4, spamWindowMs: 5e3, raidLimit: 5, raidWindowMs: 2e4, freshAccountMs: 7 * 24 * 60 * 60 * 1e3, label: "Szigor\xFA" }),
      medium: Object.freeze({ spamLimit: 6, spamWindowMs: 5e3, raidLimit: 8, raidWindowMs: 2e4, freshAccountMs: 3 * 24 * 60 * 60 * 1e3, label: "K\xF6zepes" }),
      relaxed: Object.freeze({ spamLimit: 10, spamWindowMs: 1e4, raidLimit: 15, raidWindowMs: 3e4, freshAccountMs: 24 * 60 * 60 * 1e3, label: "Enyhe" })
    });
    function protectionProfile(guildId) {
      return PROFILES[getGuildConfig(guildId).protection.sensitivity] || PROFILES.medium;
    }
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
      const dashboardRoleId = member?.guild?.id ? getGuildConfig(member.guild.id).roles.dashboard : null;
      const elevatedRole = isBviGuild(member?.guild?.id) ? member?.roles?.cache?.some((role) => role.name === NAMES.leadershipRole) : dashboardRoleId && member?.roles?.cache?.has(dashboardRoleId);
      return Boolean(
        member?.id === member?.guild?.ownerId || member?.permissions?.has(PermissionFlagsBits2.Administrator) || elevatedRole
      );
    }
    function canAuthorizeBot(member) {
      return Boolean(
        member?.id === member?.guild?.ownerId || member?.permissions?.has(PermissionFlagsBits2.Administrator) || isBviGuild(member?.guild?.id) && member?.roles?.cache?.some((role) => role.name === NAMES.leadershipRole)
      );
    }
    function isLinkExempt(member) {
      const staffRoleId = member?.guild?.id ? getGuildConfig(member.guild.id).roles.staff : null;
      return Boolean(
        isLeadership(member) || staffRoleId && member?.roles?.cache?.has(staffRoleId) || member?.roles?.cache?.some((role) => {
          const name = normalizeName(role.name);
          return role.name === NAMES.staffRole || role.name === NAMES.leadershipRole || name === "staff" || name === "nexadevstaff";
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
      const selected = configuredChannel(guild, "securityLogs");
      if (selected?.isTextBased?.()) return selected;
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
    function raidDecisionRow(sessionId, protection = { kick: true, ban: true }) {
      const buttons = [];
      if (protection.kick) buttons.push(new ButtonBuilder().setCustomId(`security_raid_kick:${sessionId}`).setLabel("Gyan\xFAs tagok kir\xFAg\xE1sa").setEmoji("\u{1F6AA}").setStyle(ButtonStyle.Danger));
      if (protection.ban) buttons.push(new ButtonBuilder().setCustomId(`security_raid_ban:${sessionId}`).setLabel("Gyan\xFAs tagok kitilt\xE1sa").setEmoji("\u{1F528}").setStyle(ButtonStyle.Danger));
      buttons.push(new ButtonBuilder().setCustomId(`security_raid_false:${sessionId}`).setLabel("T\xE9ves riaszt\xE1s \u2022 felold\xE1s").setEmoji("\u2705").setStyle(ButtonStyle.Success));
      return new ActionRowBuilder().addComponents(...buttons);
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
      const config = getGuildConfig(guild.id);
      const profile = protectionProfile(guild.id);
      const session = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        guildId: guild.id,
        detectedAt: Date.now(),
        candidateIds: new Set(records.map((record) => record.userId)),
        channelStates: [],
        profile,
        protection: config.protection
      };
      activeRaids.set(guild.id, session);
      try {
        if (config.protection.lockdown) {
          session.channelStates = await lockGuild(guild, `NexaBot: ${profile.label.toLowerCase()} \xE9rz\xE9kenys\xE9g\u0171 raidv\xE9delem`);
        }
        const storedSession = { ...session, candidateIds: [...session.candidateIds] };
        const mentions = leadershipMentions(guild);
        const embed = baseEmbed(
          config.protection.lockdown ? "\u{1F6A8} RAID-RIASZT\xC1S \u2022 A SZERVER LEZ\xC1RVA" : "\u{1F6A8} RAID-RIASZT\xC1S",
          `A bot **${profile.raidLimit} vagy t\xF6bb bel\xE9p\xE9st** \xE9szlelt ${profile.raidWindowMs / 1e3} m\xE1sodpercen bel\xFCl.

` + (config.protection.lockdown ? "A szerver a vezet\u0151i d\xF6nt\xE9sig lez\xE1rva marad. " : "") + "V\xE1lassz az al\xE1bbi gombok k\xF6z\xFCl. A bot nem b\xFCntet senkit automatikusan raid miatt.",
          COLORS.danger
        ).addFields(
          { name: "Gyan\xFAs bel\xE9p\u0151k", value: `${session.candidateIds.size} f\u0151`, inline: true },
          { name: "\xC9rz\xE9kenys\xE9g", value: profile.label, inline: true },
          { name: "D\xF6nthet", value: "Tulajdonos, adminisztr\xE1tor vagy kijel\xF6lt webes rang" }
        );
        const message = await logChannel.send({
          content: mentions.content,
          allowedMentions: mentions.allowedMentions,
          embeds: [embed],
          components: [raidDecisionRow(session.id, config.protection)],
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
      const protection = getGuildConfig(message.guild.id).protection;
      const previous = memberStrikes.get(key);
      const count = !previous || now - previous.lastAt > STRIKE_RESET_MS ? 1 : previous.count + 1;
      memberStrikes.set(key, { count, lastAt: now });
      let action = "Figyelmeztet\xE9s";
      let details = "A tiltott \xFCzenet t\xF6r\xF6lve.";
      try {
        if (count === 2 && protection.timeout && member.moderatable) {
          await member.timeout(10 * 6e4, `NexaBot automatikus v\xE9delem: ${label}`);
          action = "10 perces felf\xFCggeszt\xE9s";
          details = "M\xE1sodik szab\xE1lys\xE9rt\xE9s 30 percen bel\xFCl.";
        } else if (count === 3 && protection.kick && member.kickable) {
          await member.send(`\u{1F6AA} A **${message.guild.name}** szerverr\u0151l az automatikus v\xE9delem kir\xFAgott.
**Indok:** ${label}`).catch(() => null);
          await member.kick(`NexaBot automatikus v\xE9delem: ${label}`);
          action = "Kir\xFAg\xE1s";
          details = "Harmadik szab\xE1lys\xE9rt\xE9s 30 percen bel\xFCl.";
        } else if (count >= 4 && protection.ban && member.bannable) {
          await member.send(`\u{1F528} A **${message.guild.name}** szerverr\u0151l az automatikus v\xE9delem kitiltott.
**Indok:** ${label}`).catch(() => null);
          await member.ban({ reason: `NexaBot automatikus v\xE9delem: ${label}` });
          action = "Kitilt\xE1s";
          details = "Negyedik szab\xE1lys\xE9rt\xE9s 30 percen bel\xFCl.";
        } else if (protection.warn) {
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
      if (!moduleEnabled(message.guild.id, "protection")) return;
      const config = getGuildConfig(message.guild.id);
      const profile = protectionProfile(message.guild.id);
      if (containsBlockedLink(message.content) && !isLinkExempt(message.member)) {
        if (config.protection.deleteMessages) await message.delete().catch(() => null);
        await applyViolation(message, "Tiltott link vagy Discord-megh\xEDv\xF3");
        return;
      }
      const key = strikeKey(message.guild.id, message.author.id);
      const now = Date.now();
      const entries = (spamWindows.get(key) || []).filter((entry) => now - entry.createdAt <= profile.spamWindowMs);
      entries.push({ createdAt: now, message });
      spamWindows.set(key, entries);
      if (entries.length < profile.spamLimit || now - (spamCooldowns.get(key) || 0) < 15e3) return;
      spamCooldowns.set(key, now);
      spamWindows.set(key, []);
      if (config.protection.deleteMessages) {
        await Promise.allSettled(entries.map((entry) => entry.message.delete().catch(() => null)));
      }
      await applyViolation(message, `Spam vagy \xFCzenet\xE1radat (${profile.spamLimit} \xFCzenet / ${profile.spamWindowMs / 1e3} mp)`);
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
      const authorized = Boolean(executorMember && canAuthorizeBot(executorMember));
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
      const profile = protectionProfile(member.guild.id);
      const age = now - member.user.createdTimestamp;
      if (age < profile.freshAccountMs) {
        await sendSecurityLog(
          member.guild,
          baseEmbed("\u{1F195} Gyan\xFAsan friss fi\xF3k csatlakozott", `${member.user.tag} (${member.id})`, COLORS.warning).addFields({ name: "Fi\xF3k \xE9letkora", value: `${Math.max(0, Math.floor(age / 36e5))} \xF3ra` })
        );
      }
      const active = activeRaids.get(member.guild.id);
      if (active) active.candidateIds.add(member.id);
      const records = (joinWindows.get(member.guild.id) || []).filter((record) => now - record.joinedAt <= profile.raidWindowMs);
      records.push({ userId: member.id, joinedAt: now, fresh: age < profile.freshAccountMs });
      joinWindows.set(member.guild.id, records);
      if (records.length >= profile.raidLimit) await beginRaidLock(member.guild, records);
    }
    async function handleMemberJoin(member) {
      if (!moduleEnabled(member.guild.id, "protection")) return;
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
        const config = getGuildConfig(interaction.guildId);
        const profile = protectionProfile(interaction.guildId);
        const pending = await findPendingSession(interaction.guild, interaction.client.user);
        return interaction.editReply(
          `\u{1F6E1}\uFE0F **NexaBot-v\xE9delem: ${config.modules.protection ? "akt\xEDv" : "kikapcsolva"}**
\u2022 Er\u0151ss\xE9g: ${profile.label}
\u2022 Spam: ${profile.spamLimit} \xFCzenet / ${profile.spamWindowMs / 1e3} m\xE1sodperc
\u2022 Raid: ${profile.raidLimit} bel\xE9p\u0151 / ${profile.raidWindowMs / 1e3} m\xE1sodperc
\u2022 Friss fi\xF3k: ${Math.round(profile.freshAccountMs / 864e5)} napn\xE1l fiatalabb
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
    } = require_utils3();
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
    var {
      configuredChannel,
      configuredRole,
      moduleEnabled,
      isBviGuild,
      dashboardUrl
    } = require_config();
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
      if (!moduleEnabled(guild.id, "tickets")) {
        return interaction.editReply("A seg\xEDts\xE9gk\xE9r\u0151 rendszer ezen a szerveren ki van kapcsolva.");
      }
      const existing = guild.channels.cache.find(
        (channel2) => channel2.topic?.startsWith(`nexabot-ticket|${interaction.user.id}|`) && !channel2.name.startsWith("lezart-")
      );
      if (existing) {
        return interaction.editReply(`M\xE1r van egy akt\xEDv ticketed: ${existing}`);
      }
      const category = configuredChannel(guild, "ticketCategory", NAMES.ticketCategory);
      const staffRole = configuredRole(guild, "staff", NAMES.staffRole);
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
      if (interaction.commandName === "beallitas") {
        return interaction.reply({
          content: `\u2699\uFE0F **NexaBot webes kezel\u0151fel\xFClet:**
${dashboardUrl(interaction.guildId)}`,
          flags: EPHEMERAL
        });
      }
      if (interaction.commandName === "vedelem") {
        return handleSecurityCommand(interaction);
      }
      if (!interaction.member.permissions.has(PermissionFlagsBits2.Administrator)) {
        return ephemeralError(interaction, "Ehhez rendszergazdai jogosults\xE1g sz\xFCks\xE9ges.");
      }
      if (interaction.commandName === "dokumentum-panelek") {
        if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, "bvi")) {
          return ephemeralError(interaction, "A BVI dokumentumrendszer csak a Belv\xE9delmi szerveren haszn\xE1lhat\xF3, ha be van kapcsolva.");
        }
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
      if (!isBviGuild(interaction.guildId)) {
        return ephemeralError(interaction, "A /telepites BVI-rendszere csak a Belv\xE9delmi szerveren haszn\xE1lhat\xF3. M\xE1s szervereket a /beallitas webes panelen \xE1ll\xEDts be.");
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
      if (id.startsWith("security_raid_")) return handleRaidDecision(interaction);
      if (id.startsWith("doc_")) {
        if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, "bvi")) {
          return ephemeralError(interaction, "A BVI dokumentumrendszer itt nem haszn\xE1lhat\xF3.");
        }
        return handleDocumentButton(interaction);
      }
      if (id === "ticket_support") return createTicket(interaction, "support");
      if (id === "ticket_order") return interaction.showModal(orderModal());
      if (id === "application_open") {
        if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, "bvi")) {
          return ephemeralError(interaction, "A BVI TGF jelenleg nem haszn\xE1lhat\xF3.");
        }
        return interaction.showModal(applicationModal());
      }
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
        if (!moduleEnabled(interaction.guildId, "moderation")) return ephemeralError(interaction, "A moder\xE1ci\xF3s rendszer ki van kapcsolva.");
        if (!isStaff(interaction.member)) return ephemeralError(interaction, "Ezt csak staff tag vagy adminisztr\xE1tor haszn\xE1lhatja.");
        return interaction.showModal(channelModal());
      }
      if (id === "mod_unban_open") {
        if (!moduleEnabled(interaction.guildId, "moderation")) return ephemeralError(interaction, "A moder\xE1ci\xF3s rendszer ki van kapcsolva.");
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
        if (!moduleEnabled(interaction.guildId, "moderation")) return ephemeralError(interaction, "A moder\xE1ci\xF3s rendszer ki van kapcsolva.");
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
      if (!moduleEnabled(interaction.guildId, "moderation")) {
        return ephemeralError(interaction, "A moder\xE1ci\xF3s rendszer ezen a szerveren ki van kapcsolva.");
      }
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
      if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, "bvi")) {
        return ephemeralError(interaction, "A BVI TGF jelenleg nem haszn\xE1lhat\xF3.");
      }
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
      if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, "bvi")) {
        return interaction.editReply("\u274C A BVI TGF jelenleg nem haszn\xE1lhat\xF3.");
      }
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
      if (!moduleEnabled(interaction.guildId, "moderation")) {
        return ephemeralError(interaction, "A moder\xE1ci\xF3s rendszer ezen a szerveren ki van kapcsolva.");
      }
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
        const warningChannel = configuredChannel(interaction.guild, "warnings", NAMES.warningsChannel);
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
        if (!isBviGuild(interaction.guildId) || !moduleEnabled(interaction.guildId, "bvi")) {
          return ephemeralError(interaction, "A BVI dokumentumrendszer itt nem haszn\xE1lhat\xF3.");
        }
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
    var { baseEmbed, sendLog } = require_utils3();
    var {
      getGuildConfig,
      configuredChannel,
      configuredRole,
      moduleEnabled,
      dashboardUrl
    } = require_config();
    function registerEvents2(client2) {
      client2.on(Events2.GuildMemberAdd, async (member) => {
        if (moduleEnabled(member.guild.id, "welcome")) {
          const memberRole = configuredRole(member.guild, "auto", NAMES.memberRole);
          if (memberRole) await member.roles.add(memberRole, "NexaBot automatikus rang").catch(() => null);
          const welcomeChannel = configuredChannel(member.guild, "welcome", NAMES.welcomeChannel);
          if (welcomeChannel?.isTextBased()) {
            const template = getGuildConfig(member.guild.id).messages.welcome;
            const description = template.replaceAll("{tag}", `${member}`).replaceAll("{server}", member.guild.name).replaceAll("{memberCount}", String(member.guild.memberCount));
            const welcome = baseEmbed(
              `\u{1F44B} \xDCdv\xF6zl\xFCnk, ${member.user.globalName || member.user.username}!`,
              description,
              COLORS.primary
            ).setThumbnail(member.user.displayAvatarURL()).addFields({ name: "Tagl\xE9tsz\xE1m", value: `${member.guild.memberCount} f\u0151`, inline: true });
            await welcomeChannel.send({ content: `${member}`, embeds: [welcome] }).catch(() => null);
          }
        }
        await sendLog(member.guild, baseEmbed("\u{1F4E5} Tag csatlakozott", `${member.user.tag} (${member.id})`, COLORS.success));
      });
      client2.on(Events2.GuildCreate, async (guild) => {
        const owner = await guild.fetchOwner().catch(() => null);
        await owner?.send(
          `\u{1F44B} K\xF6sz\xF6n\xF6m, hogy megh\xEDvtad a **NexaBotot** a **${guild.name}** szerverre!
A funkci\xF3kat itt \xE1ll\xEDthatod be: ${dashboardUrl(guild.id)}`
        ).catch(() => null);
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

// src/dashboard.js
var require_dashboard = __commonJS({
  "src/dashboard.js"(exports2, module2) {
    var crypto = require("node:crypto");
    var { ChannelType, PermissionFlagsBits: PermissionFlagsBits2, SlashCommandBuilder: SlashCommandBuilder2 } = require("discord.js");
    var { NAMES } = require_constants();
    var {
      getGuildConfig,
      setGuildConfig,
      isPersistentStore,
      isBviGuild,
      dashboardUrl,
      inviteUrl
    } = require_config();
    var { ticketPanel, staffPanel } = require_panels();
    var sessions = /* @__PURE__ */ new Map();
    var oauthStates = /* @__PURE__ */ new Map();
    var SESSION_AGE_MS = 12 * 60 * 60 * 1e3;
    var MAX_BODY_BYTES = 1e5;
    function escapeHtml(value) {
      return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    function rootUrl() {
      return dashboardUrl().replace(/\/dashboard$/, "");
    }
    function oauthRedirectUri() {
      return `${rootUrl()}/oauth/callback`;
    }
    function randomToken(bytes = 32) {
      return crypto.randomBytes(bytes).toString("base64url");
    }
    function cookies(request) {
      return Object.fromEntries(
        String(request.headers.cookie || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
          const index = part.indexOf("=");
          return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
        })
      );
    }
    function sessionFor(request) {
      const sid = cookies(request).nexabot_session;
      const session = sid ? sessions.get(sid) : null;
      if (!session || session.expiresAt < Date.now()) {
        if (sid) sessions.delete(sid);
        return null;
      }
      return session;
    }
    function baseHeaders(extra = {}) {
      return {
        "Content-Security-Policy": "default-src 'self'; img-src 'self' https://cdn.discordapp.com https://media.discordapp.net data:; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        ...extra
      };
    }
    function sendHtml(response, status, html, extraHeaders = {}) {
      response.writeHead(status, baseHeaders({ "Content-Type": "text/html; charset=utf-8", ...extraHeaders }));
      response.end(html);
    }
    function sendJson(response, status, value) {
      response.writeHead(status, baseHeaders({ "Content-Type": "application/json; charset=utf-8" }));
      response.end(JSON.stringify(value));
    }
    function redirect(response, location, cookie = null) {
      const headers = { Location: location };
      if (cookie) headers["Set-Cookie"] = cookie;
      response.writeHead(302, baseHeaders(headers));
      response.end();
    }
    function sessionCookie(value, maxAge = Math.floor(SESSION_AGE_MS / 1e3)) {
      const secure = rootUrl().startsWith("https://") ? "; Secure" : "";
      return `nexabot_session=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
    }
    function layout(title, content, session = null) {
      const user = session?.user;
      return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} \u2022 NexaBot</title><style>
:root{color-scheme:dark;--bg:#090b12;--card:#121621;--card2:#191e2b;--line:#2a3142;--text:#f6f7fb;--muted:#a8b0c2;--purple:#7c5cff;--green:#52e0a4;--red:#ef5b6c;--gold:#f4b942}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#17142d 0,#090b12 36%);color:var(--text);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh}nav{position:sticky;top:0;z-index:3;background:rgba(9,11,18,.9);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.nav{max-width:1080px;margin:auto;padding:14px 18px;display:flex;align-items:center;gap:12px}.brand{font-size:20px;font-weight:850;color:#fff;text-decoration:none}.brand span{color:var(--purple)}.spacer{flex:1}.user{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:14px}.avatar{width:34px;height:34px;border-radius:50%;background:var(--card2)}main{max-width:1080px;margin:auto;padding:32px 18px 70px}.hero{padding:55px 0 35px}.hero h1{font-size:clamp(38px,8vw,72px);line-height:1.03;margin:0 0 18px;letter-spacing:-2px}.gradient{background:linear-gradient(100deg,#fff 20%,#b6a6ff 60%,#52e0a4);-webkit-background-clip:text;color:transparent}.lead{color:var(--muted);max-width:720px;font-size:19px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}.btn{border:0;border-radius:12px;background:var(--purple);color:#fff;padding:13px 18px;font-weight:800;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.btn.secondary{background:var(--card2);border:1px solid var(--line)}.btn.green{background:#168b64}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:15px}.card{background:linear-gradient(145deg,var(--card),#10131c);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 15px 40px rgba(0,0,0,.18)}.card h2,.card h3{margin:0 0 8px}.muted{color:var(--muted)}.notice{padding:13px 15px;border-radius:12px;margin:0 0 18px;background:#19261f;border:1px solid #285d48;color:#bdf7df}.warn{background:#2a2112;border-color:#6c5120;color:#ffe2a5}.error{background:#2b171b;border-color:#71313c;color:#ffc0ca}.server{display:flex;align-items:center;gap:14px}.server img,.server-icon{width:54px;height:54px;border-radius:16px;background:var(--card2);display:grid;place-items:center;font-size:21px;font-weight:800}.server-body{min-width:0;flex:1}.server-body h3{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.section{margin-top:24px}.section-title{margin:0 0 13px;font-size:22px}.settings{display:grid;grid-template-columns:1fr;gap:18px}.field-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}label{display:block;font-weight:700;margin-bottom:6px}.switch{display:flex;align-items:center;gap:10px;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px;margin:8px 0}.switch input{width:20px;height:20px;accent-color:var(--purple)}select,textarea,input[type=text]{width:100%;border:1px solid var(--line);border-radius:10px;background:#0b0e16;color:#fff;padding:12px;font:inherit}textarea{min-height:110px;resize:vertical}.help{font-size:13px;color:var(--muted);margin-top:5px}.savebar{position:sticky;bottom:12px;background:rgba(18,22,33,.94);border:1px solid var(--line);border-radius:16px;padding:12px;display:flex;align-items:center;gap:12px;box-shadow:0 12px 40px #000}.savebar .btn{margin-left:auto}@media(max-width:600px){.user span{display:none}.hero{padding-top:34px}.card{padding:16px}.savebar{bottom:7px}}
</style></head><body><nav><div class="nav"><a class="brand" href="/">Nexa<span>Bot</span></a><div class="spacer"></div>${user ? `<div class="user"><span>${escapeHtml(user.username)}</span>${user.avatar ? `<img class="avatar" alt="" src="https://cdn.discordapp.com/avatars/${escapeHtml(user.id)}/${escapeHtml(user.avatar)}.png">` : ""}<a class="btn secondary" href="/logout">Kil\xE9p\xE9s</a></div>` : ""}</div></nav><main>${content}</main></body></html>`;
    }
    function landing(session) {
      const content = `<section class="hero"><div class="muted">T\xF6bbszerveres Discord-kezel\xE9s</div><h1 class="gradient">A szervered. A szab\xE1lyaid. Egyetlen NexaBot.</h1><p class="lead">V\xE9delem, moder\xE1ci\xF3, napl\xF3z\xE1s, ticketek \xE9s \xFCdv\xF6zl\xE9s szerverenk\xE9nt k\xFCl\xF6n be\xE1ll\xEDthat\xF3, mobilbar\xE1t kezel\u0151fel\xFCleten.</p><div class="actions"><a class="btn" href="${session ? "/dashboard" : "/login"}">${session ? "Szervereim kezel\xE9se" : "Bel\xE9p\xE9s Discorddal"}</a><a class="btn secondary" href="${escapeHtml(inviteUrl())}">NexaBot megh\xEDv\xE1sa</a></div></section><section class="grid"><article class="card"><h2>\u{1F6E1}\uFE0F Automatikus v\xE9delem</h2><p class="muted">Raid, spam, tiltott linkek, friss fi\xF3kok \xE9s jogosulatlan botok figyel\xE9se.</p></article><article class="card"><h2>\u{1F3AB} \xDCgyint\xE9z\xE9s</h2><p class="muted">Seg\xEDts\xE9gk\xE9r\u0151 ticketek, moder\xE1ci\xF3s panel \xE9s napl\xF3z\xE1s.</p></article><article class="card"><h2>\u2699\uFE0F Saj\xE1t be\xE1ll\xEDt\xE1sok</h2><p class="muted">Minden szerveren m\xE1s rangok, csatorn\xE1k, \xFCzenetek \xE9s v\xE9delmi er\u0151ss\xE9g.</p></article></section>`;
      return layout("Kezd\u0151lap", content, session);
    }
    function errorPage(title, message, session = null) {
      return layout(title, `<div class="card"><h1>${escapeHtml(title)}</h1><p class="error">${escapeHtml(message)}</p><a class="btn secondary" href="/">Vissza</a></div>`, session);
    }
    function guildIcon(guild) {
      return guild.icon ? `<img alt="" src="https://cdn.discordapp.com/icons/${escapeHtml(guild.id)}/${escapeHtml(guild.icon)}.png">` : `<div class="server-icon">${escapeHtml(guild.name.slice(0, 2).toUpperCase())}</div>`;
    }
    async function userCanManageGuild(session, oauthGuild, botGuild) {
      const permissions = BigInt(oauthGuild.permissions || "0");
      const ownerOrAdmin = oauthGuild.owner || (permissions & PermissionFlagsBits2.Administrator) !== 0n;
      if (ownerOrAdmin) return true;
      const roleId = getGuildConfig(botGuild.id).roles.dashboard;
      if (!roleId) return false;
      const member = await botGuild.members.fetch(session.user.id).catch(() => null);
      return Boolean(member?.roles.cache.has(roleId));
    }
    async function manageableGuilds(client2, session) {
      const result = [];
      for (const oauthGuild of session.guilds) {
        const botGuild = client2.guilds.cache.get(oauthGuild.id);
        if (!botGuild) continue;
        if (await userCanManageGuild(session, oauthGuild, botGuild)) result.push({ oauthGuild, botGuild });
      }
      return result;
    }
    async function dashboardList(client2, session) {
      const guilds = await manageableGuilds(client2, session);
      const cards = guilds.length ? guilds.map(({ oauthGuild }) => `<article class="card server">${guildIcon(oauthGuild)}<div class="server-body"><h3>${escapeHtml(oauthGuild.name)}</h3><div class="muted">NexaBot telep\xEDtve</div></div><a class="btn" href="/dashboard/guild/${escapeHtml(oauthGuild.id)}">Be\xE1ll\xEDt\xE1s</a></article>`).join("") : `<div class="card"><h2>Nincs kezelhet\u0151 szerver</h2><p class="muted">H\xEDvd meg a NexaBotot egy olyan szerverre, ahol tulajdonos, adminisztr\xE1tor vagy kijel\xF6lt rang\xFA tag vagy.</p><a class="btn" href="${escapeHtml(inviteUrl())}">Bot megh\xEDv\xE1sa</a></div>`;
      const persistence = isPersistentStore() ? "" : '<div class="notice warn">\u26A0\uFE0F Nincs DATABASE_URL be\xE1ll\xEDtva. A m\xF3dos\xEDt\xE1sok \xFAjraind\xEDt\xE1skor elveszhetnek.</div>';
      return layout("Szervereim", `<h1>Szervereim</h1><p class="muted">Csak azok a szerverek l\xE1that\xF3k, amelyekhez jogosults\xE1god van.</p>${persistence}<div class="grid">${cards}</div>`, session);
    }
    function option(value, label, selected) {
      return `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
    }
    function channelOptions(guild, selected, categoriesOnly = false) {
      const channels = [...guild.channels.cache.values()].filter((channel) => categoriesOnly ? channel.type === ChannelType.GuildCategory : channel.isTextBased?.() && !channel.isThread?.()).sort((a, b) => a.rawPosition - b.rawPosition || a.name.localeCompare(b.name, "hu"));
      return option("", "Nincs kiv\xE1lasztva", selected) + channels.map((channel) => option(channel.id, `# ${channel.name}`, selected)).join("");
    }
    function roleOptions(guild, selected) {
      const roles = [...guild.roles.cache.values()].filter((role) => role.id !== guild.id && !role.managed).sort((a, b) => b.position - a.position);
      return option("", "Nincs kiv\xE1lasztva", selected) + roles.map((role) => option(role.id, role.name, selected)).join("");
    }
    function check(name, label, checked, help = "") {
      return `<label class="switch"><input type="checkbox" name="${escapeHtml(name)}"${checked ? " checked" : ""}><span>${escapeHtml(label)}${help ? `<div class="help">${escapeHtml(help)}</div>` : ""}</span></label>`;
    }
    function selectField(name, label, options, help = "") {
      return `<div><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><select id="${escapeHtml(name)}" name="${escapeHtml(name)}">${options}</select>${help ? `<div class="help">${escapeHtml(help)}</div>` : ""}</div>`;
    }
    function settingsPage(guild, config, session, saved = false) {
      const bvi = isBviGuild(guild.id);
      const textChannels = (selected) => channelOptions(guild, selected, false);
      const categories = (selected) => channelOptions(guild, selected, true);
      const roles = (selected) => roleOptions(guild, selected);
      const content = `<div class="server"><div class="server-icon">${escapeHtml(guild.name.slice(0, 2).toUpperCase())}</div><div class="server-body"><h1>${escapeHtml(guild.name)}</h1><div class="muted">Szerverbe\xE1ll\xEDt\xE1sok</div></div></div>${saved ? '<div class="notice">\u2705 A be\xE1ll\xEDt\xE1sok \xE9s a kiv\xE1lasztott panelek friss\xFCltek.</div>' : ""}${!isPersistentStore() ? '<div class="notice warn">\u26A0\uFE0F Az adatb\xE1zis m\xE9g nincs be\xE1ll\xEDtva, ez\xE9rt a ment\xE9s \xFAjraind\xEDt\xE1skor elveszhet.</div>' : ""}
<form method="post" action="/dashboard/guild/${escapeHtml(guild.id)}"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="settings">
<section class="card section"><h2 class="section-title">\u{1F9E9} Funkci\xF3k</h2>${check("module_protection", "V\xE9delem \xE9s linksz\u0171r\xE9s", config.modules.protection)}${check("module_moderation", "Moder\xE1ci\xF3 \xE9s napl\xF3z\xE1s", config.modules.moderation)}${check("module_tickets", "Ticket \xE9s seg\xEDts\xE9gk\xE9r\xE9s", config.modules.tickets)}${check("module_welcome", "\xDCdv\xF6zl\xE9s \xE9s automatikus rang", config.modules.welcome)}${bvi ? check("module_bvi", "TGF \xE9s BVI dokumentumrendszer", config.modules.bvi, "Csak ezen a Belv\xE9delmi szerveren \xE9rhet\u0151 el.") : '<div class="help">A TGF \xE9s BVI dokumentumrendszer kiz\xE1r\xF3lag a Belv\xE9delmi szerveren haszn\xE1lhat\xF3.</div>'}</section>
<section class="card"><h2 class="section-title">#\uFE0F\u20E3 Csatorn\xE1k</h2><div class="field-grid">${selectField("channel_securityLogs", "Biztons\xE1gi napl\xF3", textChannels(config.channels.securityLogs), "P\xE9ld\xE1ul: minden-log")}${selectField("channel_logs", "Moder\xE1ci\xF3s napl\xF3", textChannels(config.channels.logs))}${selectField("channel_ticketPanel", "Seg\xEDts\xE9gk\xE9r\u0151 panel", textChannels(config.channels.ticketPanel))}${selectField("channel_ticketCategory", "Ticket kateg\xF3ria", categories(config.channels.ticketCategory))}${selectField("channel_moderationPanel", "Moder\xE1ci\xF3s panel", textChannels(config.channels.moderationPanel))}${selectField("channel_welcome", "\xDCdv\xF6zl\u0151csatorna", textChannels(config.channels.welcome))}${selectField("channel_warnings", "Figyelmeztet\xE9sek csatorn\xE1ja", textChannels(config.channels.warnings))}</div></section>
<section class="card"><h2 class="section-title">\u{1F3F7}\uFE0F Rangok \xE9s hozz\xE1f\xE9r\xE9s</h2><div class="field-grid">${selectField("role_staff", "Staff rang", roles(config.roles.staff), "Moder\xE1ci\xF3, linkk\xFCld\xE9s \xE9s ticketkezel\xE9s.")}${selectField("role_auto", "Automatikusan kiosztott rang", roles(config.roles.auto))}${selectField("role_dashboard", "Webes kezel\u0151i rang", roles(config.roles.dashboard), "A tulajdonos \xE9s adminok mellett ez az egy rang l\xE9phet be.")}</div></section>
<section class="card"><h2 class="section-title">\u{1F4AC} Bot\xFCzenetek</h2><div class="field-grid"><div><label for="message_welcome">\xDCdv\xF6zl\u0151sz\xF6veg</label><textarea id="message_welcome" name="message_welcome">${escapeHtml(config.messages.welcome)}</textarea><div class="help">Haszn\xE1lhat\xF3: {tag}, {server}, {memberCount}</div></div><div><label for="message_ticket">Seg\xEDts\xE9gk\xE9r\u0151 panel sz\xF6vege</label><textarea id="message_ticket" name="message_ticket">${escapeHtml(config.messages.ticket)}</textarea></div></div></section>
<section class="card"><h2 class="section-title">\u{1F6E1}\uFE0F V\xE9delem</h2><div class="field-grid"><div><label for="protection_sensitivity">\xC9rz\xE9kenys\xE9g</label><select id="protection_sensitivity" name="protection_sensitivity">${option("strict", "Szigor\xFA", config.protection.sensitivity)}${option("medium", "K\xF6zepes", config.protection.sensitivity)}${option("relaxed", "Enyhe", config.protection.sensitivity)}</select></div><div>${check("protection_deleteMessages", "Tiltott \xFCzenetek t\xF6rl\xE9se", config.protection.deleteMessages)}${check("protection_warn", "Figyelmeztet\xE9s", config.protection.warn)}${check("protection_timeout", "Ideiglenes felf\xFCggeszt\xE9s", config.protection.timeout)}</div><div>${check("protection_kick", "Kir\xFAg\xE1s", config.protection.kick)}${check("protection_ban", "Kitilt\xE1s", config.protection.ban)}${check("protection_lockdown", "Raid eset\xE9n szerverlez\xE1r\xE1s", config.protection.lockdown)}</div></div></section>
<div class="savebar"><span class="muted">A ment\xE9s friss\xEDti a kiv\xE1lasztott paneleket.</span><button class="btn green" type="submit">Be\xE1ll\xEDt\xE1sok ment\xE9se</button></div></div></form>`;
      return layout(`${guild.name} be\xE1ll\xEDt\xE1sai`, content, session);
    }
    async function readBody(request) {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw new Error("T\xFAl nagy k\xE9r\xE9s");
        chunks.push(chunk);
      }
      return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    }
    function validChannelId(guild, value, categoriesOnly = false) {
      if (!value) return null;
      const channel = guild.channels.cache.get(value);
      if (!channel) return null;
      if (categoriesOnly) return channel.type === ChannelType.GuildCategory ? channel.id : null;
      return channel.isTextBased?.() && !channel.isThread?.() ? channel.id : null;
    }
    function validRoleId(guild, value) {
      if (!value) return null;
      const role = guild.roles.cache.get(value);
      return role && role.id !== guild.id && !role.managed ? role.id : null;
    }
    function configFromForm(guild, form) {
      return {
        modules: {
          protection: form.has("module_protection"),
          moderation: form.has("module_moderation"),
          tickets: form.has("module_tickets"),
          welcome: form.has("module_welcome"),
          bvi: isBviGuild(guild.id) && form.has("module_bvi")
        },
        channels: {
          securityLogs: validChannelId(guild, form.get("channel_securityLogs")),
          logs: validChannelId(guild, form.get("channel_logs")),
          ticketPanel: validChannelId(guild, form.get("channel_ticketPanel")),
          ticketCategory: validChannelId(guild, form.get("channel_ticketCategory"), true),
          moderationPanel: validChannelId(guild, form.get("channel_moderationPanel")),
          welcome: validChannelId(guild, form.get("channel_welcome")),
          warnings: validChannelId(guild, form.get("channel_warnings"))
        },
        roles: {
          staff: validRoleId(guild, form.get("role_staff")),
          auto: validRoleId(guild, form.get("role_auto")),
          dashboard: validRoleId(guild, form.get("role_dashboard"))
        },
        messages: {
          welcome: form.get("message_welcome"),
          ticket: form.get("message_ticket")
        },
        protection: {
          sensitivity: form.get("protection_sensitivity"),
          deleteMessages: form.has("protection_deleteMessages"),
          warn: form.has("protection_warn"),
          timeout: form.has("protection_timeout"),
          kick: form.has("protection_kick"),
          ban: form.has("protection_ban"),
          lockdown: form.has("protection_lockdown")
        }
      };
    }
    function validateConfiguration(config) {
      const missing = [];
      if (config.modules.protection && !config.channels.securityLogs) missing.push("biztons\xE1gi napl\xF3csatorna");
      if (config.modules.moderation) {
        if (!config.channels.moderationPanel) missing.push("moder\xE1ci\xF3s panelcsatorna");
        if (!config.channels.logs) missing.push("moder\xE1ci\xF3s napl\xF3csatorna");
        if (!config.roles.staff) missing.push("Staff rang");
      }
      if (config.modules.tickets) {
        if (!config.channels.ticketPanel) missing.push("seg\xEDts\xE9gk\xE9r\u0151 panelcsatorna");
        if (!config.channels.ticketCategory) missing.push("ticket kateg\xF3ria");
        if (!config.roles.staff) missing.push("Staff rang");
      }
      if (config.modules.welcome && !config.channels.welcome) missing.push("\xFCdv\xF6zl\u0151csatorna");
      if (missing.length) {
        throw new Error(`A bekapcsolt funkci\xF3khoz m\xE9g v\xE1laszd ki: ${[...new Set(missing)].join(", ")}.`);
      }
    }
    async function upsertPanel(channel, botId, titlePrefix, payload) {
      if (!channel?.isTextBased()) return;
      const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      const existing = messages?.find(
        (message) => message.author.id === botId && message.embeds.some((embed) => embed.title?.startsWith(titlePrefix))
      );
      if (existing) await existing.edit(payload).catch(() => null);
      else await channel.send(payload).catch(() => null);
    }
    async function syncConfiguredPanels(guild, config, botUser) {
      if (config.modules.tickets && config.channels.ticketPanel) {
        const channel = guild.channels.cache.get(config.channels.ticketPanel);
        await upsertPanel(channel, botUser.id, "\u{1F3AB} Seg\xEDts\xE9gk\xE9r\xE9s", ticketPanel(config.messages.ticket));
      }
      if (config.modules.moderation && config.channels.moderationPanel) {
        const channel = guild.channels.cache.get(config.channels.moderationPanel);
        const roleName = config.roles.staff ? guild.roles.cache.get(config.roles.staff)?.name : NAMES.staffRole;
        await upsertPanel(channel, botUser.id, "\u{1F6E1}\uFE0F NexaBot", staffPanel(roleName || "Staff"));
      }
    }
    async function exchangeCode(code) {
      const body = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: oauthRedirectUri()
      });
      const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      if (!response.ok) throw new Error("A Discord nem fogadta el a bel\xE9p\xE9si k\xF3dot.");
      return response.json();
    }
    async function discordApi(path, accessToken) {
      const response = await fetch(`https://discord.com/api/v10${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) throw new Error("A Discord-fi\xF3k adatait nem siker\xFClt lek\xE9rni.");
      return response.json();
    }
    async function handleRequest(client2, request, response) {
      const url = new URL(request.url, rootUrl());
      const session = sessionFor(request);
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, { name: "NexaBot", status: client2.isReady() ? "online" : "starting", guilds: client2.guilds.cache.size });
      }
      if (request.method === "GET" && url.pathname === "/") return sendHtml(response, 200, landing(session));
      if (request.method === "GET" && url.pathname === "/login") {
        if (!process.env.DISCORD_CLIENT_SECRET) {
          return sendHtml(response, 503, errorPage("A webes bel\xE9p\xE9s m\xE9g nincs bekapcsolva", "A Renderben add hozz\xE1 a DISCORD_CLIENT_SECRET k\xF6rnyezeti v\xE1ltoz\xF3t."));
        }
        const state = randomToken(24);
        oauthStates.set(state, Date.now() + 10 * 60 * 1e3);
        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.search = new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          redirect_uri: oauthRedirectUri(),
          response_type: "code",
          scope: "identify guilds",
          state
        });
        return redirect(response, authorize.toString());
      }
      if (request.method === "GET" && url.pathname === "/oauth/callback") {
        const state = url.searchParams.get("state");
        const expiresAt = state ? oauthStates.get(state) : null;
        if (!state || !expiresAt || expiresAt < Date.now()) {
          return sendHtml(response, 400, errorPage("Sikertelen bel\xE9p\xE9s", "A bel\xE9p\xE9si k\xE9r\xE9s lej\xE1rt vagy \xE9rv\xE9nytelen. Pr\xF3b\xE1ld \xFAjra."));
        }
        oauthStates.delete(state);
        try {
          const code = url.searchParams.get("code");
          if (!code) throw new Error("A Discord-bel\xE9p\xE9st megszak\xEDtott\xE1k vagy elutas\xEDtott\xE1k.");
          const token = await exchangeCode(code);
          const [user, guilds] = await Promise.all([
            discordApi("/users/@me", token.access_token),
            discordApi("/users/@me/guilds", token.access_token)
          ]);
          const sid = randomToken();
          sessions.set(sid, { user, guilds, csrf: randomToken(20), expiresAt: Date.now() + SESSION_AGE_MS });
          return redirect(response, "/dashboard", sessionCookie(sid));
        } catch (error) {
          return sendHtml(response, 502, errorPage("Sikertelen Discord-bel\xE9p\xE9s", error.message));
        }
      }
      if (request.method === "GET" && url.pathname === "/logout") {
        const sid = cookies(request).nexabot_session;
        if (sid) sessions.delete(sid);
        return redirect(response, "/", sessionCookie("", 0));
      }
      if (url.pathname.startsWith("/dashboard") && !session) return redirect(response, "/login");
      if (request.method === "GET" && url.pathname === "/dashboard") {
        return sendHtml(response, 200, await dashboardList(client2, session));
      }
      const guildMatch = url.pathname.match(/^\/dashboard\/guild\/(\d{16,22})$/);
      if (guildMatch) {
        const guild = client2.guilds.cache.get(guildMatch[1]);
        const oauthGuild = session.guilds.find((item) => item.id === guildMatch[1]);
        if (!guild || !oauthGuild || !await userCanManageGuild(session, oauthGuild, guild)) {
          return sendHtml(response, 403, errorPage("Nincs hozz\xE1f\xE9r\xE9sed", "Ehhez a szerverhez nincs kezel\u0151i jogosults\xE1god.", session));
        }
        if (request.method === "GET") {
          return sendHtml(response, 200, settingsPage(guild, getGuildConfig(guild.id), session, url.searchParams.get("saved") === "1"));
        }
        if (request.method === "POST") {
          try {
            const form = await readBody(request);
            if (form.get("csrf") !== session.csrf) {
              return sendHtml(response, 403, errorPage("Lej\xE1rt munkamenet", "Friss\xEDtsd az oldalt, majd pr\xF3b\xE1ld \xFAjra.", session));
            }
            const requestedConfig = configFromForm(guild, form);
            validateConfiguration(requestedConfig);
            const config = await setGuildConfig(guild.id, requestedConfig);
            await syncConfiguredPanels(guild, config, client2.user);
            return redirect(response, `/dashboard/guild/${guild.id}?saved=1`);
          } catch (error) {
            return sendHtml(response, 500, errorPage("A ment\xE9s nem siker\xFClt", error.message, session));
          }
        }
      }
      return sendHtml(response, 404, errorPage("Az oldal nem tal\xE1lhat\xF3", "Ellen\u0151rizd a c\xEDmet.", session));
    }
    function startDashboardServer2(client2, port2) {
      const http = require("node:http");
      const server2 = http.createServer((request, response) => {
        handleRequest(client2, request, response).catch((error) => {
          console.error("Webes kezel\u0151fel\xFClet hib\xE1ja:", error);
          if (!response.headersSent) sendHtml(response, 500, errorPage("V\xE1ratlan hiba", "Pr\xF3b\xE1ld \xFAjra k\xE9s\u0151bb."));
          else response.end();
        });
      });
      server2.listen(port2, "0.0.0.0", () => console.log(`NexaBot webes kezel\u0151fel\xFClet elindult a ${port2} porton.`));
      const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, value] of sessions) if (value.expiresAt < now) sessions.delete(key);
        for (const [key, value] of oauthStates) if (value < now) oauthStates.delete(key);
      }, 10 * 60 * 1e3);
      cleanup.unref();
      return server2;
    }
    function buildSettingsCommand2() {
      return new SlashCommandBuilder2().setName("beallitas").setDescription("Megnyitja a NexaBot webes kezel\u0151fel\xFClet\xE9t.").setDMPermission(false);
    }
    module2.exports = {
      escapeHtml,
      configFromForm,
      validateConfiguration,
      userCanManageGuild,
      syncConfiguredPanels,
      startDashboardServer: startDashboardServer2,
      buildSettingsCommand: buildSettingsCommand2
    };
  }
});

// src/index.js
require("dotenv").config();
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
var { buildSettingsCommand, startDashboardServer } = require_dashboard();
var { initConfigStore } = require_config();
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
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await Promise.all([
    rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [buildSettingsCommand().toJSON(), buildSecurityCommand().toJSON()] }
    ),
    rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [command.toJSON(), documentCommand.toJSON()] }
    )
  ]);
}
client.once(Events.ClientReady, async (readyClient) => {
  readyClient.user.setPresence({
    activities: [{ name: `${readyClient.guilds.cache.size} szervert`, type: ActivityType.Watching }],
    status: "online"
  });
  try {
    await registerCommands();
    console.log(`NexaBot elindult: ${readyClient.user.tag}`);
    console.log("A glob\xE1lis /beallitas \xE9s /vedelem parancs, valamint a BVI-parancsok haszn\xE1latra k\xE9szek.");
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
var server = startDashboardServer(client, port);
async function shutdown(signal) {
  console.log(`${signal} \xE9rkezett, le\xE1ll\xEDt\xE1s\u2026`);
  client.destroy();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5e3).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
async function start() {
  await initConfigStore();
  await client.login(process.env.DISCORD_TOKEN);
}
start().catch((error) => {
  console.error("A bot nem tudott elindulni. Ellen\u0151rizd a be\xE1ll\xEDt\xE1sokat.", error.message);
  process.exit(1);
});
