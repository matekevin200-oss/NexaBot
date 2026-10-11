const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { COLORS } = require('./constants');

function row(...components) {
  return new ActionRowBuilder().addComponents(...components);
}

function button(customId, label, emoji, style = ButtonStyle.Secondary, disabled = false) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(style)
    .setDisabled(disabled);
}

function l(language, hu, en) {
  return language === 'en' ? en : hu;
}

function controlCenterPanel(config, webUrl) {
  const language = config.language || 'hu';
  const title = config.branding?.title || 'NexaBot Control Center';
  const embed = new EmbedBuilder()
    .setColor(config.branding?.primary || COLORS.primary)
    .setTitle(`🎛️ ${title}`)
    .setDescription(
      l(language,
        '**Minden fontos funkció egy helyen — parancsok beírása nélkül.**\n\nVálassz az alábbi gombok közül. A személyes adatlapok és kezelőpanelek csak neked jelennek meg.',
        '**Every important feature in one place — without typing commands.**\n\nChoose an option below. Personal profiles and management panels are visible only to you.')
    )
    .addFields(
      { name: '✨ Nexa AI', value: l(language, 'Kérdezz itt vagy beszélgess a bottal privát üzenetben.', 'Ask here or chat with the bot in direct messages.'), inline: true },
      { name: l(language, '🛡️ Kezelés', '🛡️ Management'), value: l(language, 'Moderáció, védelem, ticketek és naplózás.', 'Moderation, security, tickets and logging.'), inline: true },
      { name: l(language, '⭐ Közösség', '⭐ Community'), value: l(language, 'Profil, rangok, ötletek, szavazások és nyereményjáték.', 'Profile, roles, suggestions, polls and giveaways.'), inline: true }
    )
    .setFooter({ text: l(language, 'NEXA Bot • Biztonságos, gombos vezérlés', 'NEXA Bot • Secure button controls') });
  if (config.branding?.logoUrl) embed.setThumbnail(config.branding.logoUrl);

  const components = [
    row(
      button('center_ai', 'Nexa AI', '✨', ButtonStyle.Primary, !config.modules.ai),
      button('center_ai_dm', l(language, 'Privát AI', 'Private AI'), '💬', ButtonStyle.Primary, !config.modules.ai),
      button('center_ticket', l(language, 'Segítségkérés', 'Support'), '🎫', ButtonStyle.Success, !config.modules.tickets),
      button('center_profile', l(language, 'Saját profil', 'My profile'), '👤', ButtonStyle.Secondary),
      button('center_roles', l(language, 'Rangjaim', 'My roles'), '🏷️', ButtonStyle.Secondary, !config.modules.reactionRoles)
    ),
    row(
      button('center_shift', l(language, 'Szolgálat', 'Shift'), '🕒', ButtonStyle.Success, !config.modules.shift),
      button('center_moderation', l(language, 'Moderáció', 'Moderation'), '🛡️', ButtonStyle.Danger, !config.modules.moderation),
      button('center_community', l(language, 'Közösség', 'Community'), '⭐', ButtonStyle.Primary, !config.modules.suggestions),
      button('center_security', l(language, 'Védelem', 'Security'), '🔒', ButtonStyle.Secondary, !config.modules.protection),
      ...(config.modules.bvi ? [button('center_rp', l(language, 'Owner RP', 'Owner RP'), '🎭', ButtonStyle.Primary)] : [])
    )
  ];
  if (webUrl) {
    components.push(row(
      new ButtonBuilder().setLabel(l(language, 'Webes vezérlőpult', 'Web dashboard')).setEmoji('⚙️').setStyle(ButtonStyle.Link).setURL(webUrl)
    ));
  }
  return { embeds: [embed], components };
}

function communityPanel(language = 'hu') {
  return {
    embeds: [new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(l(language, '⭐ Közösségi központ', '⭐ Community center'))
      .setDescription(l(language, 'Válaszd ki, mit szeretnél létrehozni. A Staff-funkciókat csak jogosult tag használhatja.', 'Choose what you want to create. Staff functions require permission.'))],
    components: [
      row(
        button('center_suggestion', l(language, 'Ötlet beküldése', 'Submit idea'), '💡', ButtonStyle.Primary),
        button('center_poll', l(language, 'Szavazás', 'Poll'), '📊', ButtonStyle.Secondary),
        button('center_announce', l(language, 'Bejelentés', 'Announcement'), '📣', ButtonStyle.Secondary),
        button('center_giveaway', l(language, 'Nyereményjáték', 'Giveaway'), '🎁', ButtonStyle.Success)
      )
    ]
  };
}

function aiPanel(language = 'hu') {
  return {
    embeds: [new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(l(language, '✨ Nexa AI központ', '✨ Nexa AI center'))
      .setDescription(l(language, 'Kérdezz, kezeld a saját engedélyezett memóriádat, vagy indíts elkülönített privát beszélgetést — parancsok nélkül.', 'Ask questions, manage your approved memory, or start a private conversation — without commands.'))],
    components: [
      row(
        button('center_ai_ask', l(language, 'Kérdés', 'Ask'), '✨', ButtonStyle.Primary),
        button('center_ai_dm', l(language, 'Privát AI', 'Private AI'), '💬', ButtonStyle.Primary),
        button('center_ai_consent_on', l(language, 'Memória be', 'Memory on'), '🧠', ButtonStyle.Success),
        button('center_ai_consent_off', l(language, 'Memória ki', 'Memory off'), '🔕', ButtonStyle.Secondary)
      ),
      row(
        button('center_ai_memory_add', l(language, 'Emlék hozzáadása', 'Add memory'), '➕', ButtonStyle.Secondary),
        button('center_ai_memory_view', l(language, 'Emlékeim', 'My memories'), '📖', ButtonStyle.Secondary),
        button('center_ai_memory_clear', l(language, 'Emlékek törlése', 'Clear memories'), '🗑️', ButtonStyle.Danger),
        button('center_ai_server_add', l(language, 'Szerverismeret', 'Server knowledge'), '🏢', ButtonStyle.Secondary)
      )
    ]
  };
}

function textInput(customId, label, style, placeholder, required = true, maxLength = 1000) {
  return new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setPlaceholder(placeholder)
    .setRequired(required)
    .setMaxLength(maxLength);
}

function aiModal(language = 'hu') {
  return new ModalBuilder()
    .setCustomId('center_ai_submit')
    .setTitle(l(language, 'Nexa AI kérdés', 'Nexa AI question'))
    .addComponents(row(textInput('center_ai_question', l(language, 'Mit szeretnél kérdezni?', 'What would you like to ask?'), TextInputStyle.Paragraph, l(language, 'Írd le részletesen a kérdésed…', 'Describe your question in detail…'), true, 1500)));
}

function aiMemoryModal(scope = 'personal', language = 'hu') {
  const server = scope === 'server';
  return new ModalBuilder()
    .setCustomId(server ? 'center_ai_server_add_submit' : 'center_ai_memory_add_submit')
    .setTitle(server
      ? l(language, 'Szerverismeret hozzáadása', 'Add server knowledge')
      : l(language, 'Személyes emlék hozzáadása', 'Add personal memory'))
    .addComponents(row(textInput(
      'center_ai_memory_text',
      server
        ? l(language, 'Mit tudjon a szerverről?', 'What should it know about the server?')
        : l(language, 'Mit jegyezzen meg rólad?', 'What should it remember about you?'),
      TextInputStyle.Paragraph,
      l(language, 'Ne adj meg jelszót, tokent vagy más titkos adatot.', 'Never enter passwords, tokens or other secrets.'),
      true,
      1000
    )));
}

function suggestionModal(language = 'hu') {
  return new ModalBuilder()
    .setCustomId('center_suggestion_submit')
    .setTitle(l(language, 'Ötlet beküldése', 'Submit an idea'))
    .addComponents(row(textInput('center_suggestion_text', l(language, 'Az ötleted', 'Your idea'), TextInputStyle.Paragraph, l(language, 'Írd le az ötleted…', 'Describe your idea…'), true, 1500)));
}

function pollModal(language = 'hu') {
  return new ModalBuilder()
    .setCustomId('center_poll_submit')
    .setTitle(l(language, 'Új szavazás', 'New poll'))
    .addComponents(
      row(textInput('center_poll_question', l(language, 'Kérdés', 'Question'), TextInputStyle.Short, l(language, 'Miről szavazzanak?', 'What should members vote on?'), true, 250)),
      row(textInput('center_poll_answers', l(language, 'Válaszok | jellel elválasztva', 'Answers separated with |'), TextInputStyle.Paragraph, l(language, 'Igen | Nem | Tartózkodom', 'Yes | No | Abstain'), true, 1000))
    );
}

function announcementModal(language = 'hu') {
  return new ModalBuilder()
    .setCustomId('center_announce_submit')
    .setTitle(l(language, 'Új bejelentés', 'New announcement'))
    .addComponents(
      row(textInput('center_announce_title', l(language, 'Cím', 'Title'), TextInputStyle.Short, l(language, 'A bejelentés címe', 'Announcement title'), true, 250)),
      row(textInput('center_announce_text', l(language, 'Szöveg', 'Message'), TextInputStyle.Paragraph, l(language, 'A teljes bejelentés…', 'Full announcement…'), true, 3500)),
      row(textInput('center_announce_image', l(language, 'Kép HTTPS-linkje (nem kötelező)', 'Image HTTPS URL (optional)'), TextInputStyle.Short, 'https://…', false, 500))
    );
}

function giveawayModal(language = 'hu') {
  return new ModalBuilder()
    .setCustomId('center_giveaway_submit')
    .setTitle(l(language, 'Új nyereményjáték', 'New giveaway'))
    .addComponents(
      row(textInput('center_giveaway_prize', l(language, 'Nyeremény', 'Prize'), TextInputStyle.Short, l(language, 'Mit lehet nyerni?', 'What can members win?'), true, 250)),
      row(textInput('center_giveaway_minutes', l(language, 'Időtartam percben', 'Duration in minutes'), TextInputStyle.Short, l(language, 'Például: 60', 'For example: 60'), true, 6)),
      row(textInput('center_giveaway_winners', l(language, 'Nyertesek száma', 'Number of winners'), TextInputStyle.Short, '1–10', true, 2))
    );
}

module.exports = {
  controlCenterPanel,
  communityPanel,
  aiPanel,
  aiModal,
  aiMemoryModal,
  suggestionModal,
  pollModal,
  announcementModal,
  giveawayModal
};
