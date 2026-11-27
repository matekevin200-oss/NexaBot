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
  'A BELV a szerveren belüli rendvédelmi RP része. Foglald össze a feladatkörét, a vezetőségi felügyelet jelentését és azt, milyen valós életbeli adatot vagy ügyet nem kezelhet.',
  'Egy másik frakció tagjával szemben szabályszegés gyanúja merül fel. Mi a BELV jogköre ebben az esetben, mit dokumentálsz, és milyen döntést nem hozhatsz meg helyette?',
  'Egy magasabb rangú vezető szóban olyan utasítást ad, amely szerinted szabályellenes. Hogyan tisztázod az utasítást, hogyan őrzöd meg a szolgálati rendet, és kinek jelzed az aggályodat?',
  'Magyarázd el az ártatlanság vélelmét egy folyamatban lévő fegyelmi ügy példáján. Mit mondanál azoknak, akik a vizsgálat lezárása előtt már büntetést követelnek?',
  'Egy bejelentéshez képernyőképet csatolnak, de nem látszik rajta a dátum, az eredeti üzenet vagy a teljes beszélgetés. Sorold fel, mit ellenőriznél, mielőtt tényként hivatkoznál rá.',
  'A §7 a hatáskörrel való visszaélést III–VI. fokozatú következménnyel jelöli. Írj egy konkrét RP-példát, és különítsd el a bizonyított tényt a bejelentő állításától.',
  'Egy tag bizalmas adatot küld egy nyilvános csatornába. A §11 IV–VI. fokozatot jelöl. Mi az első három intézkedésed az adat további terjedésének megállítására és a szabályos vizsgálat biztosítására?',
  'A §12 a bizonyíték meghamisítására V–VI., a §13 a hamis jelentésre III–VI. fokozatot jelöl. Mi a különbség a két eset között, és hogyan őriznéd meg az eredeti bizonyítékot?',
  'Egy intézkedés során indokolatlan erő alkalmazásának gyanúja merül fel (§14: IV–VI.). Milyen adatokat rögzítenél, kit hallgatnál meg, és miért nem dönthetsz büntetésről a vizsgálat előtt?',
  'Egy beosztott szerint a vezetője korrupciót követett el (§15: V–VI.). Hogyan kezeled az összeférhetetlenséget, a bizalmas adatokat és a vezetői érintettséget?',
  'A §16 a vezetői visszaélést IV–VI. fokozattal jelöli. Mit teszel, ha maga a vizsgálatot irányító vezető is érintett az ügyben?',
  'A §18 ismételt súlyos szabályszegésre V–VI. fokozatot jelöl. Milyen dokumentumok alapján lehet megállapítani az ismétlődést, és hogyan akadályozod meg, hogy régi, lezárt ügyet bizonyíték nélkül újra felhasználjanak?',
  'Sorold fel a fegyelmi eljárás szabályos sorrendjét a bejelentéstől az ügy lezárásáig. Melyik lépés biztosít lehetőséget az érintett meghallgatására és a vezetői döntésre?',
  'Egy bejelentés részletes és hihető, de még nincs hozzá bizonyíték. Hogyan indítasz előzetes ellenőrzést úgy, hogy közben ne kezeld bizonyítottként az állítást?',
  'A vizsgálat során két tanú ellentmondó vallomást tesz, a videó pedig csak az esemény végét mutatja. Hogyan rögzíted az eltéréseket, és milyen további ellenőrzést kérsz?',
  'Az érintett a te közeli barátod, és te kapnád az ügyet. Mit teszel az összeférhetetlenség miatt, és hogyan biztosítható a pártatlan ügyelosztás?',
  'Nevezd meg az I–VI. fegyelmi fokozatokat sorrendben. Miért nem választható ki a legsúlyosabb fokozat pusztán a bejelentés vagy egy vezető kérése alapján?',
  'A szabályzat szerint nincs automatikus büntetés, és a vezetőség hagyja jóvá a döntést. Mit teszel, ha egy vezető a vizsgálat befejezése előtt azonnali lefokozást követel?',
  'A felülvizsgálati kérelmet legfeljebb 72 órán belül lehet benyújtani. Hogyan tájékoztatod erről az érintettet, és milyen iratokat teszel elérhetővé a felülvizsgálathoz?',
  'Egy másik szervezet tagjának ügyében a BELV csak javaslatot tehet közvetlen szankció helyett. Milyen formában továbbítanád a megállapításokat, és mit hagynál az illetékes vezetőség döntésére?',
  'A vizsgálat közben egy stafftag azt kéri, hogy töröld a terhelő üzenetet, mert „csak bonyolítja az ügyet”. Hogyan reagálsz, és miként biztosítod a bizonyíték változatlanságát és visszakövethetőségét?',
  'Lezártak egy ügyet, és a csatorna csak olvasható maradt. Új bizonyíték érkezik. Hogyan kezeled úgy, hogy megőrizd az eredeti ügyiratot, és az új információ megfelelő felülvizsgálatot kapjon?',
  'Egy jelentésben biztos tényként szerepel valami, amit csak egy tanú állít; egy képernyőképről pedig kiderül, hogy módosították. Mely részeket jelölöd át, mit teszel a bizonyítékkal, és kinek jelented az esetet?',
  'Összetett eset: a bejelentő a vizsgáló barátja, a vezető érintett, és a bizonyíték hiányos. Írd le az eljárásod a bejelentéstől a felülvizsgálatig.',
  'A bejelentő a legsúlyosabb szankciót követeli. Milyen tények alapján teszel arányos javaslatot, és ki hagyja jóvá a végleges döntést?'
]);

const TGF_SECTIONS = Object.freeze([
  'I. Alapelvek és hatáskör',
  'II. Bizonyítékok és adatvédelem',
  'III. Fegyelmi eljárás',
  'IV. Döntések és felülvizsgálat',
  'V. Összetett helyzetgyakorlatok'
]);
const TGF_SECTION_SUMMARIES = Object.freeze([
  'Feladatkör, parancsnoki rend, jogkör és alapelvek.',
  'Forrásellenőrzés, bizonyítékmegőrzés és bizalmas adatok.',
  'Bejelentés, előzetes ellenőrzés, meghallgatás és vizsgálat.',
  'Fokozatok, vezetői jóváhagyás, más frakciók és jogorvoslat.',
  'Összeférhetetlenség és több szabályt érintő esettanulmányok.'
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

function ticketPanel(customDescription = null, language = 'hu', enabledTypes = null, customLabels = {}, customTypes = [],guildId=null) {
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
    .setFooter({ text: l(language, 'Privát ügykezelés • Az aktív ügyek számát a szerver beállítása szabályozza.', "Private case management • The number of active cases follows this server's settings.") });

  const buttons = row(
    new ButtonBuilder().setCustomId('ticket_support').setLabel(l(language, 'Általános ügy megnyitása', 'Open general case')).setEmoji('📨').setStyle(ButtonStyle.Secondary).setDisabled(!allowedTypes.has('support'))
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
    ].concat(customTypes.map(item=>({label:String(item.label).slice(0,60),value:item.key,emoji:'📨'}))).filter((option) => allowedTypes.has(option.value))));
  if(guildId&&/^\d{16,22}$/.test(guildId))buttons.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(l(language,'Webes ügyfélkapu','Web helpdesk')).setURL(new URL('/helpdesk/'+guildId,require('./config').dashboardUrl()).toString()));
  const payload={embeds:[embed],components:[categories,buttons]};return guildId&&require('./next-design').get(guildId).componentsV2?require('./next-design').legacyV2(payload,guildId):payload;
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
    .setAuthor({ name: 'NEXA • HIVATALOS BELV-FELVÉTELI' })
    .setTitle('🏛️ Belvédelmi Igazgatóság • ÍRÁSBELI TGF')
    .setDescription('**25 kérdés • 5 rövid rész • saját szavas válaszok**\n\nMinden rész külön nyílik meg, a haladásod látható, a kész válaszaid megmaradnak. Csak a BELV vezetősége bírálja el a jelentkezést. Valós személyes adatot ne adj meg.')
    .addFields(TGF_SECTIONS.map((section, page) => ({ name: section, value: TGF_SECTION_SUMMARIES[page] })))
    .setFooter({ text: 'BELV szerver • írásbeli alkalmassági • 5 × 5 kérdés • Panel v3' });

  const buttons = row(
    new ButtonBuilder().setCustomId('application_open').setLabel('BELV jelentkezés indítása').setEmoji('📝').setStyle(ButtonStyle.Primary)
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

function ticketControls(language = 'hu',guildId=null) {
 const s=require('./next-design').get(guildId);return row(
  new ButtonBuilder().setCustomId('ticket_claim').setLabel(s.claim||l(language,'Átvétel','Claim')).setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('ticket_assign').setLabel(s.transfer||l(language,'Átadás','Assign')).setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('ticket_manage').setLabel(s.participant||l(language,'Résztvevők','Participants')).setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('ticket_close').setLabel(s.close||l(language,'Lezárás','Close')).setStyle(ButtonStyle.Danger)
 );
}

function ticketManagement(language = 'hu') {
  return {
    content: l(language, 'Válassz felhasználót a hozzáadáshoz vagy eltávolításhoz.', 'Select a user to add or remove.'),
    components: [
      row(new UserSelectMenuBuilder().setCustomId('ticket_user_add').setPlaceholder(l(language, 'Felhasználó hozzáadása…', 'Add user…')).setMinValues(1).setMaxValues(1)),
      row(new UserSelectMenuBuilder().setCustomId('ticket_user_remove').setPlaceholder(l(language, 'Felhasználó eltávolítása…', 'Remove user…')).setMinValues(1).setMaxValues(1)),
      row(new ButtonBuilder().setCustomId('ticket_rename').setLabel(l(language, 'Ticket átnevezése', 'Rename ticket')).setEmoji('✏️').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('ticket_delete').setLabel(l(language,'Ticket törlése','Delete ticket')).setStyle(ButtonStyle.Danger),new ButtonBuilder().setCustomId('nt:metadata').setLabel(l(language,'Címkék és zárolás','Tags and lock')).setStyle(ButtonStyle.Secondary))
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

function applicationContinue(userId, page = 1) {
  return row(
    new ButtonBuilder()
      .setCustomId(`application_begin:${userId}:${page}`)
      .setLabel(`${page === 0 ? 'Kezdés' : `Tovább • ${page + 1}/5. rész`}`)
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Primary)
  );
}

function applicationQuestionPreview(page = 0) {
  const start = page * 5;
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: 'NEXA • BELV ÍRÁSBELI TGF' })
    .setTitle(`${TGF_SECTIONS[page] || 'Jelentkezési rész'} • ${page + 1}/5`)
    .setDescription(`**HALADÁS**  ${'▰'.repeat(page)}${'▱'.repeat(5 - page)}  **${page}/5 kész**\n\nOlvasd át ezt az öt kérdést, majd nyomd meg a gombot a válaszok kitöltéséhez.`)
    .addFields(TGF_QUESTIONS.slice(start, start + 5).map((question, offset) => ({
      name: `${String(start + offset + 1).padStart(2, '0')}. kérdés`,
      value: question
    })))
    .setFooter({ text: 'A kész részek válaszai megmaradnak • csak a BELV vezetősége látja' });
  return embed;
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

function applicationModal(page = 0) {
  const start = page * 5;
  return new ModalBuilder()
    .setCustomId(`application_submit_part${page + 1}`)
    .setTitle(`BELV írásbeli • ${TGF_SECTIONS[page]?.split('. ')[0] || `V${page + 1}`}/V`)
    .addComponents(TGF_QUESTIONS.slice(start, start + 5).map((_question, offset) =>
      row(input(`app_q${start + offset + 1}`, `${String(start + offset + 1).padStart(2, '0')}. válasz`, TextInputStyle.Paragraph, String(_question).slice(0, 100), true, 1000))
    ));
}

function applicationModalPart2(page = 1) {
  return applicationModal(page);
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
  applicationQuestionPreview,
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
  TGF_QUESTIONS,
  TGF_SECTIONS,
  TGF_SECTION_SUMMARIES
};
