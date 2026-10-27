const {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const { COLORS } = require('./constants');
const { localeFor } = require('./i18n');

const CATEGORIES = Object.freeze({
  economy: {emoji:'💳',title:'Pénzrendszer',text:'`/penz panel` – saját központ\n`/penz napi|munka|egyenleg|befizetes|felvetel|utalas`\n`/penz bolt|vasarlas|leltar|felhasznalas|ranglista|elozmenyek`\n`/gazdasag` – kezelői beállítások, termékek és pénzügyi napló',en:'`/penz panel` – personal finance center\nWallet, bank, work, daily rewards, transfers, shop, inventory and history.\n`/gazdasag` – manager settings, products and audit log.'},
  moderation: {
    emoji: '🛡️',
    title: 'Moderáció',
    text: '`/ban` `/unban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarns` `/clear` `/slowmode` `/lock` `/unlock` `/nick`',
    en: 'Complete case-based moderation: `/ban` `/unban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarns` `/clear` `/slowmode` `/lock` `/unlock` `/nick`'
  },
  utility: {
    emoji: '🧰',
    title: 'Utility',
    text: '`/userinfo` `/serverinfo` `/avatar` `/beallitas`\n`/emlekezteto letrehozas|lista|torles`\n`/hitelesites panel` – admin tagellenőrző panel',
    en: '`/userinfo` `/serverinfo` `/avatar` `/beallitas`\n`/emlekezteto letrehozas|lista|torles`\n`/hitelesites panel` – admin verification panel'
  },
  security: {
    emoji: '🔒',
    title: 'Security',
    text: '`/vedelem statusz` – állapot\n`/vedelem feloldas` – kézi raidfeloldás\n`/chronoguard statusz|vizsgalat|pillanatkep` – Owner digitális szerveriker\n`/aegis statusz|vizsgalat|bazis` – Owner Permission DNA\nA részletes Automod, Anti-Nuke, ChronoGuard és AEGIS a webes kezelőből állítható.',
    en: '`/vedelem statusz` – status\n`/vedelem feloldas` – manual raid unlock\n`/chronoguard statusz|vizsgalat|pillanatkep` – Owner digital server twin\n`/aegis statusz|vizsgalat|bazis` – Owner Permission DNA\nConfigure Automod, Anti-Nuke, ChronoGuard and AEGIS on the web dashboard.'
  },
  tickets: {
    emoji: '🎫',
    title: 'Tickets',
    text: 'A Discord Control Centerből vagy a szerver ticketpaneljéről nyitható. Claim, lezárás, transcript és törlés gombokkal.',
    en: 'Open tickets from the Discord Control Center or ticket panel. Includes claim, close, transcript and delete controls.'
  },
  tasks: {emoji:'📌',title:'Staff Feladatközpont',text:`/feladat kiosztas — felelős, leírás és opcionális határidő
/feladat sajat — saját nyitott feladatok
/feladat allapot — átvétel, lezárás vagy vezetői újranyitás
/feladat attekintes — Staff-only szerverlista`,en:`/feladat kiosztas — assign an owner, clear steps and optional deadline
/feladat sajat — your open tasks
/feladat allapot — accept, complete or reopen with Staff access
/feladat attekintes — staff-only server task board`},
  levels: {
    emoji: '⭐',
    title: 'Levels',
    text: '`/szint` – saját vagy más tag szintje\n`/szint-ranglista` – szerver ranglista\n⭐ Starboard – automatikus kiemelés a beállított reakciószámnál',
    en: '`/szint` – your or another member\'s level\n`/szint-ranglista` – server leaderboard\n⭐ Starboard – automatic highlights at the configured reaction threshold'
  },
  giveaway: {
    emoji: '🎁',
    title: 'Giveaway',
    text: '`/nyeremenyjatek` vagy a közösségi panel. A részvétel gombbal történik, a sorsolás automatikus.',
    en: 'Use `/nyeremenyjatek` or the community panel. Members enter with a button and winners are drawn automatically.'
  },
  ai: {
    emoji: '✨',
    title: 'Nexa AI',
    text: '`/nexa kerdes` és a gombos AI-panel. Privát üzenetben és kijelölt AI-csatornában is működik, kizárólag tulajdonosi engedéllyel.',
    en: 'Use `/nexa kerdes` or the AI panel. AI works in DMs and a selected channel, and requires owner approval.'
  },
  admin: {
    emoji: '⚙️',
    title: 'Admin',
    text: '`/beallitas` – webes dashboard\nDiscord Control Center – parancsok nélküli gombos vezérlés\n`/telepites` és `/dokumentum-panelek` – csak Owner által engedélyezett RP-szerveren\nAz Owner Center csak a bot tulajdonosának és kijelölt kezelőinek érhető el.',
    en: '`/beallitas` – web dashboard\nDiscord Control Center – button-based management\n`/telepites` and `/dokumentum-panelek` – only on an Owner-approved RP server\nOwner Center is available only to the bot owner and approved operators.'
  }
});

function helpMenu(selected = null, language = 'hu') {
  const englishTitles = { economy:'Economy', moderation: 'Moderation', utility: 'Utility', security: 'Security', tickets: 'Tickets', tasks:'Staff Tasks', levels: 'Levels', giveaway: 'Giveaway', ai: 'AI', admin: 'Admin' };
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('nexabot_help_category')
      .setPlaceholder(language === 'en' ? 'Choose a category…' : 'Válassz egy kategóriát…')
      .addOptions(Object.entries(CATEGORIES).map(([value, item]) => ({
        label: language === 'en' ? englishTitles[value] : item.title,
        value,
        emoji: item.emoji,
        default: value === selected
      })))
  );
}

function helpEmbed(category = null, language = 'hu') {
  if (!category || !CATEGORIES[category]) {
    return new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(language === 'en' ? '✨ NEXA Bot Help Center' : '✨ NEXA Bot Súgóközpont')
      .setDescription(language === 'en' ? 'Choose a category below. I will show only the commands and usage for that system.' : 'Válassz egy kategóriát az alábbi menüből. Csak az adott rendszer parancsait és használatát mutatom meg.')
      .addFields({ name: language === 'en' ? 'Tip' : 'Tipp', value: language === 'en' ? 'Most features are also available through buttons in the Discord Control Center and the web dashboard.' : 'A legtöbb funkció a Discord Control Center gombjaival és a webes dashboardon is használható.' })
    .setFooter({ text: 'NEXA Bot 20.1.1 • AEGIS Platform' });
  }
  const item = CATEGORIES[category];
  const englishTitles = { economy:'Economy', moderation: 'Moderation', utility: 'Utility', security: 'Security', tickets: 'Tickets', tasks:'Staff Tasks', levels: 'Levels', giveaway: 'Giveaway', ai: 'AI', admin: 'Admin' };
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`${item.emoji} ${language === 'en' ? englishTitles[category] : item.title}`)
    .setDescription(language === 'en' ? item.en : item.text)
    .setFooter({ text: language === 'en' ? 'NEXA Bot 20.1.1 • Choose another category from the menu' : 'NEXA Bot 20.1.1 • Válassz másik kategóriát a menüből' });
}

function buildHelpCommand() {
  return new SlashCommandBuilder()
    .setName('help')
    .setDescription('Megnyitja a NEXA Bot interaktív súgóközpontját.')
    .setDescriptionLocalizations({ 'en-US': 'Open the interactive NEXA Bot help center.', 'en-GB': 'Open the interactive NEXA Bot help centre.' });
}

async function handleHelpCommand(interaction) {
 await interaction.deferReply({flags:MessageFlags.Ephemeral});return require('./next-discord').send(interaction,await require('./next-discord').help(interaction));
}

async function handleHelpSelect(interaction) {
  const selected = interaction.values[0];
  const language = localeFor(interaction.guildId);
  await interaction.update({ embeds: [helpEmbed(selected, language)], components: [helpMenu(selected, language)] });
}

module.exports = { CATEGORIES, buildHelpCommand, handleHelpCommand, handleHelpSelect, helpEmbed, helpMenu };
