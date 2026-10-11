const {
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
} = require('discord.js');
const { COLORS } = require('./constants');

const TGF_QUESTIONS = Object.freeze([
  'Miért szeretnél csatlakozni ehhez az RP szervezethez?',
  'Mit gondolsz, mi az RP szervezet legfontosabb feladata?',
  'Mit tennél, ha szolgálat közben azt látnád, hogy egy rendvédelmi dolgozó visszaél a jogkörével?',
  'Mit tennél, ha egy nálad magasabb rangú személy olyan utasítást adna, amely szerinted szabályellenes?',
  'Mit jelent számodra a szolgálati hierarchia, és miért fontos annak betartása?',
  'Mit tennél, ha egy másik szervezeti tag bizalmas információt adna ki illetéktelen személynek?',
  'Hogyan járnál el, ha egy ellenőrzés során szabálytalanságot észlelnél egy másik rendvédelmi szervezetnél?',
  'Mit jelent a jogkörrel való visszaélés? Írj rá egy példát!',
  'Miért fontos a bizonyítékok és a szolgálati intézkedések megfelelő dokumentálása?',
  'Miért gondolod úgy, hogy alkalmas lennél az RP szervezet tagjának?'
]);

function row(...components) {
  return new ActionRowBuilder().addComponents(...components);
}

function input(customId, label, style, placeholder, required = true, maxLength = 1000) {
  return new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setPlaceholder(placeholder)
    .setRequired(required)
    .setMaxLength(maxLength);
}

function l(language, hu, en) {
  return language === 'en' ? en : hu;
}

function ticketPanel(customDescription = null, language = 'hu', enabledTypes = null, customLabels = {}) {
  const allowedTypes = new Set(Array.isArray(enabledTypes) && enabledTypes.length
    ? enabledTypes
    : ['support', 'application', 'report', 'purchase', 'partnership', 'other']);
  const label = (type, hu, en) => String(customLabels?.[type] || l(language, hu, en)).slice(0, 100);
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(l(language, '📨 Ügyintézési központ', '📨 Contact center'))
    .setDescription(
      customDescription || (
        l(language, '**Válaszd ki az ügyed típusát az alábbi menüből.**\n\nA rendszer külön privát ügycsatornát nyit, amelyet csak te és a kijelölt ügyintézők láthatnak.', '**Choose your case type from the menu below.**\n\nThe system opens a private case channel visible only to you and the assigned team.')
      )
    )
    .addFields(
      { name: l(language, '① Kategória kiválasztása', '① Choose a category'), value: l(language, 'Kérdés, bejelentés, vásárlás, együttműködés vagy egyéb ügy.', 'Question, report, purchase, cooperation or another matter.'), inline: true },
      { name: l(language, '② Privát ügy megnyitása', '② Private case opens'), value: l(language, 'Írd le röviden és pontosan, miben kérsz segítséget.', 'Describe clearly what you need help with.'), inline: true },
      { name: l(language, '🔐 Adatvédelem', '🔐 Privacy'), value: l(language, 'Jelszót, tokent, API-kulcsot vagy bankkártyaadatot soha ne küldj el.', 'Never send passwords, tokens, API keys or payment-card data.') }
    )
    .setFooter({ text: l(language, 'Privát ügykezelés • Egyszerre egy aktív ügy nyitható.', 'Private case management • One active case at a time.') });

  const buttons = row(
    new ButtonBuilder().setCustomId('ticket_support').setLabel(l(language, 'Általános ügy megnyitása', 'Open general case')).setEmoji('📨').setStyle(ButtonStyle.Secondary)
  );
  const categories = row(new StringSelectMenuBuilder()
    .setCustomId('ticket_category_select')
    .setPlaceholder(l(language, 'Válassz ticket kategóriát…', 'Choose a ticket category…'))
    .addOptions([
      { label: label('support', 'Segítségkérés', 'Help request'), value: 'support', emoji: '💡' },
      { label: label('application', 'TGF / jelentkezési kérdés', 'Application question'), value: 'application', emoji: '📝' },
      { label: label('report', 'Bejelentés', 'Report'), value: 'report', emoji: '🚨' },
      { label: label('purchase', 'Vásárlás / számlázás', 'Purchase / billing'), value: 'purchase', emoji: '🛒' },
      { label: label('partnership', 'Partnerség', 'Partnership'), value: 'partnership', emoji: '🤝' },
      { label: label('other', 'Egyéb ügy', 'Other case'), value: 'other', emoji: '📨' }
    ].filter((option) => allowedTypes.has(option.value))));
  return { embeds: [embed], components: [categories, buttons] };
}

function supportTicketPanel(language = 'en') {
  const embed = new EmbedBuilder()
    .setColor(0x35d07f)
    .setTitle('🛰️ NEXA Support Gateway')
    .setDescription(l(
      language,
      '**Hivatalos NEXA Bot ügyfélszolgálat**\n\nVálaszd ki, hogy technikai segítséget, hibajelentést, számlázási támogatást vagy partnerségi ügyintézést kérsz. A beszélgetést kizárólag a NEXA Support Team látja.',
      '**Official NEXA Bot customer support**\n\nChoose technical support, bug reporting, billing assistance or partnership services. Only you and the NEXA Support Team can view the conversation.'
    ))
    .addFields(
      { name: l(language, '🛠️ Technikai segítség', '🛠️ Technical support'), value: l(language, 'Bot, dashboard, beállítás vagy jogosultsági probléma.', 'Bot, dashboard, configuration or permission issues.'), inline: true },
      { name: l(language, '💳 Számlázás', '💳 Billing'), value: l(language, 'Pro vagy Ultimate előfizetés kezelése.', 'Help with Pro or Ultimate subscriptions.'), inline: true },
      { name: l(language, '🧪 Hibajelentés', '🧪 Bug report'), value: l(language, 'Írd le a hibát és a reprodukálás lépéseit.', 'Describe the issue and steps to reproduce it.'), inline: true },
      { name: l(language, '🔒 Biztonsági figyelmeztetés', '🔒 Security notice'), value: l(language, 'Discord tokent, API-kulcsot, jelszót vagy bankkártyaadatot soha ne küldj.', 'Never send Discord tokens, API keys, passwords or payment-card data.') }
    )
    .setFooter({ text: l(language, 'NEXA Support • Hivatalos és bizalmas ügykezelés', 'NEXA Support • Official confidential case handling') });

  const categories = row(new StringSelectMenuBuilder()
    .setCustomId('support_ticket_category_select')
    .setPlaceholder(l(language, 'NEXA ügytípus kiválasztása…', 'Select a NEXA support topic…'))
    .addOptions([
      { label: l(language, 'Technikai segítség', 'Technical support'), value: 'support', emoji: '🛠️' },
      { label: l(language, 'Hibajelentés', 'Bug report'), value: 'report', emoji: '🧪' },
      { label: l(language, 'Előfizetés és számlázás', 'Subscription and billing'), value: 'purchase', emoji: '💳' },
      { label: l(language, 'Partnerség', 'Partnership'), value: 'partnership', emoji: '🤝' },
      { label: l(language, 'Egyéb NEXA ügy', 'Other NEXA request'), value: 'other', emoji: '📨' }
    ]));
  const direct = row(
    new ButtonBuilder().setCustomId('support_ticket_open').setLabel(l(language, 'Gyors technikai ticket', 'Quick technical ticket')).setEmoji('⚡').setStyle(ButtonStyle.Success)
  );
  return { embeds: [embed], components: [categories, direct] };
}

function applicationPanel() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🎭 RP szervezeti jelentkezés')
    .setDescription(
      '**Szeretnél csatlakozni az RP szervezethez?**\n\n' +
      TGF_QUESTIONS.map((question, index) => `**${index + 1}.** ${question}`).join('\n\n') +
      '\n\nA TGF két, egyenként 5 kérdéses részből áll. Írj komoly, őszinte és részletes válaszokat — ezeket csak a vezetőség és a staff látja.'
    )
    .setFooter({ text: 'NexaBot • RP jelentkezési rendszer' });

  const buttons = row(
    new ButtonBuilder().setCustomId('application_open').setLabel('RP jelentkezés megkezdése').setEmoji('📝').setStyle(ButtonStyle.Primary)
  );
  return { embeds: [embed], components: [buttons] };
}

function staffPanel(staffRoleName = 'NexaDev Staff', language = 'hu') {
  const embed = new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle(l(language, '🛡️ NEXA Bot staff vezérlőpult', '🛡️ NEXA Bot staff control panel'))
    .setDescription(
      l(language,
        `Válaszd ki a kezelni kívánt tagot az alábbi listából, majd válaszd ki a műveletet.\n\nA panelt csak a **${staffRoleName}** ranggal vagy adminisztrátori jogosultsággal lehet használni.`,
        `Select the member you want to manage, then choose an action.\n\nOnly members with **${staffRoleName}** or Administrator permission can use this panel.`)
    )
    .addFields(
      { name: l(language, 'Moderáció', 'Moderation'), value: l(language, 'Figyelmeztetés, időkorlát, kirúgás, kitiltás, rang- és becenévkezelés.', 'Warnings, timeout, kick, ban, role and nickname management.'), inline: true },
      { name: l(language, 'Szerverkezelés', 'Server management'), value: l(language, 'Új nyilvános vagy privát csatorna létrehozása.', 'Create public or private channels.'), inline: true }
    );

  const memberPicker = row(
    new UserSelectMenuBuilder()
      .setCustomId('mod_target_select')
      .setPlaceholder(l(language, 'Válassz ki egy szervertagot…', 'Select a server member…'))
      .setMinValues(1)
      .setMaxValues(1)
  );
  const management = row(
    new ButtonBuilder().setCustomId('mod_unban_open').setLabel(l(language, 'Kitiltás feloldása', 'Unban user')).setEmoji('🔓').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('staff_channel').setLabel(l(language, 'Csatorna létrehozása', 'Create channel')).setEmoji('➕').setStyle(ButtonStyle.Primary)
  );
  return { embeds: [embed], components: [memberPicker, management] };
}

function moderationActionRows(targetId, language = 'hu') {
  return [
    row(
      new ButtonBuilder().setCustomId(`mod_action:warn:${targetId}`).setLabel(l(language, 'Figyelmeztetés', 'Warn')).setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`mod_action:timeout:${targetId}`).setLabel(l(language, 'Felfüggesztés', 'Timeout')).setEmoji('⏱️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`mod_action:kick:${targetId}`).setLabel(l(language, 'Kirúgás', 'Kick')).setEmoji('🚪').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`mod_action:ban:${targetId}`).setLabel(l(language, 'Kitiltás', 'Ban')).setEmoji('🔨').setStyle(ButtonStyle.Danger)
    ),
    row(
      new ButtonBuilder().setCustomId(`mod_action:untimeout:${targetId}`).setLabel(l(language, 'Felfüggesztés feloldása', 'Remove timeout')).setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`mod_action:role_add:${targetId}`).setLabel(l(language, 'Rang hozzáadása', 'Add role')).setEmoji('➕').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`mod_action:role_remove:${targetId}`).setLabel(l(language, 'Rang levétele', 'Remove role')).setEmoji('➖').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`mod_action:nickname:${targetId}`).setLabel(l(language, 'Becenév módosítása', 'Change nickname')).setEmoji('✏️').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function timeoutChoices(targetId, language = 'hu') {
  return row(
    new ButtonBuilder().setCustomId(`mod_timeout:10:${targetId}`).setLabel(l(language, '10 perc', '10 minutes')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`mod_timeout:60:${targetId}`).setLabel(l(language, '1 óra', '1 hour')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`mod_timeout:1440:${targetId}`).setLabel(l(language, '1 nap', '1 day')).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mod_timeout:custom:${targetId}`).setLabel(l(language, 'Egyedi idő', 'Custom')).setStyle(ButtonStyle.Primary)
  );
}

function moderationConfirmation(action, targetId, language = 'hu') {
  const labels = {
    kick: [l(language, 'Igen, kirúgom', 'Yes, kick'), '🚪'],
    ban: [l(language, 'Igen, kitiltom', 'Yes, ban'), '🔨']
  };
  const [label, emoji] = labels[action];
  return row(
    new ButtonBuilder().setCustomId(`mod_confirm:${action}:${targetId}`).setLabel(label).setEmoji(emoji).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('mod_cancel').setLabel(l(language, 'Mégse', 'Cancel')).setStyle(ButtonStyle.Secondary)
  );
}

function rolePicker(action, targetId, language = 'hu') {
  return row(
    new RoleSelectMenuBuilder()
      .setCustomId(`mod_role_select:${action}:${targetId}`)
      .setPlaceholder(action === 'role_add' ? l(language, 'Válaszd ki a hozzáadandó rangot…', 'Select a role to add…') : l(language, 'Válaszd ki a leveendő rangot…', 'Select a role to remove…'))
      .setMinValues(1)
      .setMaxValues(1)
  );
}

function unbanPicker(bans) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('mod_unban_select')
    .setPlaceholder('Válassz a kitiltott felhasználók közül…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      bans.slice(0, 25).map((ban) => ({
        label: (ban.user.globalName || ban.user.tag || ban.user.username).slice(0, 100),
        description: 'Kitiltott felhasználó',
        value: ban.user.id
      }))
    );
  return row(menu);
}

function ticketControls(language = 'hu') {
  return row(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel(l(language, 'Felvétel', 'Claim')).setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_unclaim').setLabel(l(language, 'Visszaadás', 'Unclaim')).setEmoji('↩️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_manage').setLabel(l(language, 'Kezelés', 'Manage')).setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel(l(language, 'Lezárás', 'Close')).setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
}

function ticketManagement(language = 'hu') {
  return {
    content: l(language, 'Válassz felhasználót a hozzáadáshoz vagy eltávolításhoz.', 'Select a user to add or remove.'),
    components: [
      row(new UserSelectMenuBuilder().setCustomId('ticket_user_add').setPlaceholder(l(language, 'Felhasználó hozzáadása…', 'Add user…')).setMinValues(1).setMaxValues(1)),
      row(new UserSelectMenuBuilder().setCustomId('ticket_user_remove').setPlaceholder(l(language, 'Felhasználó eltávolítása…', 'Remove user…')).setMinValues(1).setMaxValues(1)),
      row(new ButtonBuilder().setCustomId('ticket_rename').setLabel(l(language, 'Ticket átnevezése', 'Rename ticket')).setEmoji('✏️').setStyle(ButtonStyle.Primary))
    ]
  };
}

function ticketRenameModal(language = 'hu') {
  return new ModalBuilder()
    .setCustomId('ticket_rename_submit')
    .setTitle(l(language, 'Ticket átnevezése', 'Rename ticket'))
    .addComponents(row(input('ticket_new_name', l(language, 'Új csatornanév', 'New channel name'), TextInputStyle.Short, l(language, 'például: fizetési-probléma', 'example: payment-problem'), true, 80)));
}

function closeConfirmation(language = 'hu') {
  return row(
    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel(l(language, 'Igen, lezárom', 'Yes, close')).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel(l(language, 'Mégse', 'Cancel')).setStyle(ButtonStyle.Secondary)
  );
}

function deleteTicketButton(language = 'hu') {
  return row(
    new ButtonBuilder().setCustomId('ticket_delete').setLabel(l(language, 'Ticket törlése', 'Delete ticket')).setEmoji('🗑️').setStyle(ButtonStyle.Danger)
  );
}

function applicationControls(userId) {
  return row(
    new ButtonBuilder().setCustomId(`application_accept:${userId}`).setLabel('Elfogadás').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`application_reject:${userId}`).setLabel('Elutasítás').setEmoji('❌').setStyle(ButtonStyle.Danger)
  );
}

function applicationContinue(userId) {
  return row(
    new ButtonBuilder()
      .setCustomId(`application_continue:${userId}`)
      .setLabel('Folytatás: 6–10. kérdés')
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Primary)
  );
}

function orderModal() {
  return new ModalBuilder()
    .setCustomId('order_submit')
    .setTitle('Discord-fejlesztés rendelése')
    .addComponents(
      row(input('order_type', 'Milyen szervert szeretnél?', TextInputStyle.Short, 'Például: RP, gaming, közösségi', true, 100)),
      row(input('order_details', 'Írd le az elképzelésedet', TextInputStyle.Paragraph, 'Milyen csatornák, rangok és botok kellenek?', true, 1000)),
      row(input('order_package', 'Melyik csomag érdekel?', TextInputStyle.Short, 'Mini / Standard / Prémium / Egyedi', true, 60)),
      row(input('order_deadline', 'Mikorra szeretnéd?', TextInputStyle.Short, 'Például: 1 héten belül', false, 80))
    );
}

function applicationModal() {
  return new ModalBuilder()
    .setCustomId('application_submit_part1')
    .setTitle('RP jelentkezés • 1/2')
    .addComponents(
      row(input('app_q1', '1. Csatlakozási motivációd', TextInputStyle.Paragraph, 'Miért szeretnél csatlakozni?', true, 350)),
      row(input('app_q2', '2. Az RP szervezet feladata', TextInputStyle.Paragraph, 'Mi az RP szervezet legfontosabb feladata?', true, 350)),
      row(input('app_q3', '3. Jogkörrel való visszaélés', TextInputStyle.Paragraph, 'Mit tennél, ha visszaélést látnál?', true, 350)),
      row(input('app_q4', '4. Szabályellenes utasítás', TextInputStyle.Paragraph, 'Mit tennél szabályellenes utasítás esetén?', true, 350)),
      row(input('app_q5', '5. Szolgálati hierarchia', TextInputStyle.Paragraph, 'Mit jelent, és miért fontos betartani?', true, 350))
    );
}

function applicationModalPart2() {
  return new ModalBuilder()
    .setCustomId('application_submit_part2')
    .setTitle('RP jelentkezés • 2/2')
    .addComponents(
      row(input('app_q6', '6. Bizalmas információ kiadása', TextInputStyle.Paragraph, 'Mit tennél információ kiszivárogtatásakor?', true, 350)),
      row(input('app_q7', '7. Más szervezet szabálytalansága', TextInputStyle.Paragraph, 'Hogyan járnál el az ellenőrzés során?', true, 350)),
      row(input('app_q8', '8. Jogkörrel való visszaélés példája', TextInputStyle.Paragraph, 'Írd le a jelentését és egy példát!', true, 350)),
      row(input('app_q9', '9. Dokumentálás fontossága', TextInputStyle.Paragraph, 'Miért fontos mindent megfelelően dokumentálni?', true, 350)),
      row(input('app_q10', '10. Miért lennél alkalmas?', TextInputStyle.Paragraph, 'Miért lennél alkalmas az RP szervezetbe?', true, 350))
    );
}

function moderationModal(action, targetId, extraId = null) {
  const titles = {
    warn: 'Figyelmeztetés',
    timeout_10: 'Felfüggesztés • 10 perc',
    timeout_60: 'Felfüggesztés • 1 óra',
    timeout_1440: 'Felfüggesztés • 1 nap',
    timeout_custom: 'Egyedi felfüggesztés',
    untimeout: 'Felfüggesztés feloldása',
    kick: 'Tag kirúgása',
    ban: 'Tag kitiltása',
    unban: 'Kitiltás feloldása',
    role_add: 'Rang hozzáadása',
    role_remove: 'Rang levétele',
    nickname: 'Becenév módosítása'
  };
  const components = [];
  if (action === 'timeout_custom') {
    components.push(row(input('mod_minutes', 'Időtartam percben', TextInputStyle.Short, '1–40320 perc', true, 6)));
  }
  if (action === 'nickname') {
    components.push(row(input('mod_nickname', 'Új becenév', TextInputStyle.Short, 'A tag új szerverbeceneve', true, 32)));
  }
  components.push(
    row(input('mod_reason', 'Kötelező indoklás', TextInputStyle.Paragraph, 'Miért történik az intézkedés?', true, 500)),
    row(input('mod_evidence', 'Bizonyíték vagy kép linkje', TextInputStyle.Paragraph, 'Opcionális: üzenet- vagy képlink', false, 500))
  );
  const suffix = extraId ? `:${extraId}` : '';
  return new ModalBuilder()
    .setCustomId(`mod_submit:${action}:${targetId}${suffix}`)
    .setTitle(titles[action])
    .addComponents(...components);
}

function channelModal() {
  return new ModalBuilder()
    .setCustomId('channel_submit')
    .setTitle('Új csatorna létrehozása')
    .addComponents(
      row(input('channel_name', 'Csatorna neve', TextInputStyle.Short, 'Például: fejlesztői-beszélgetés', true, 80)),
      row(input('channel_topic', 'Csatorna témája', TextInputStyle.Paragraph, 'Rövid leírás a csatornáról', false, 500)),
      row(input('channel_access', 'Hozzáférés', TextInputStyle.Short, 'Írd be: nyilvános vagy privát', true, 20))
    );
}

module.exports = {
  ticketPanel,
  supportTicketPanel,
  applicationPanel,
  staffPanel,
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
  channelModal,
  TGF_QUESTIONS
};
