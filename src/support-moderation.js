const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { SUPPORT_GUILD_ID } = require('./constants');
const { getGuildConfig, setGuildConfig, isBotOwner, isPersistentStore } = require('./config');
const { suspendSecurityForGuild } = require('./security');
const { recordAudit, recordError } = require('./telemetry');

let controlQueue = Promise.resolve();
function controlState() {
  return { paused: false, nativeRules: [], incomplete: false, ...getGuildConfig(SUPPORT_GUILD_ID).supportModeration };
}
async function saveControl(patch) {
  const current = getGuildConfig(SUPPORT_GUILD_ID);
  return setGuildConfig(SUPPORT_GUILD_ID, { ...current, supportModeration: { ...controlState(), ...patch } }, { keepPauseOnFailure: true });
}
async function changeSupportModeration(guild, actorId, paused) {
  if (guild?.id !== SUPPORT_GUILD_ID || !isBotOwner(actorId)) {
    throw Object.assign(new Error('A Support moderációját kizárólag a fő botowner kezelheti, a hivatalos Support szerveren.'), { status: 403 });
  }
  if (typeof paused !== 'boolean') throw Object.assign(new Error('Érvényes kapcsolóállapot kell.'), { status: 400 });
  const warnings = [], previous = controlState();
  let nativeChanged = 0, restored = 0;
  if (paused) {
    try { await saveControl({ paused: true, incomplete: true, changedAt: previous.paused ? previous.changedAt : new Date().toISOString(), changedBy: actorId }); }
    catch (error) { warnings.push('A NEXA azonnal szünetel, de a tartós mentés sikertelen. Ismételd meg a kikapcsolást az adatbázis helyreállítása után.'); }
    try {
      const result = await suspendSecurityForGuild(guild);
      restored = result.restored;
      if (result.failed) warnings.push(`${result.failed} raidlezárás vagy karantén visszaállítása sikertelen; a kikapcsolás megismételhető.`);
    } catch (error) {
      warnings.push('A korábbi raidlezárás feloldása nem fejeződött be; ismételd meg a kikapcsolást.');
      await recordError(error, { command: 'support_moderation_unlock', guildId: guild.id, userId: actorId }).catch(() => {});
    }
    try {
      const rules = await guild.autoModerationRules.fetch();
      for (const rule of rules.values()) {
        if (!rule.enabled) continue;
        const ids = controlState().nativeRules;
        if (!ids.includes(rule.id)) {
          try { await saveControl({ nativeRules: [...ids, rule.id] }); }
          catch (error) { warnings.push(`Az AutoMod ${rule.id} korábbi állapotát csak az aktuális futás őrzi.`); }
        }
        try { await rule.edit({ enabled: false, reason: 'NEXA Support: owner moderációs szünet' }); nativeChanged++; }
        catch (error) {
          warnings.push(`A Discord AutoMod ${rule.id} szabálya nem kapcsolható ki; ellenőrizd a Szerver kezelése jogot.`);
          await recordError(error, { command: 'support_automod_pause', guildId: guild.id, userId: actorId }).catch(() => {});
        }
      }
    } catch (error) {
      warnings.push('A Discord AutoMod szabályai nem kérdezhetők le; a NEXA moderációja már szünetel. Ellenőrizd a Szerver kezelése jogot.');
      await recordError(error, { command: 'support_automod_fetch', guildId: guild.id, userId: actorId }).catch(() => {});
    }
    try { await saveControl({ incomplete: warnings.length > 0 }); }
    catch (error) { warnings.push('A szüneteltetés végső állapotát nem sikerült tartósan menteni.'); }
  } else {
    if (previous.paused) {
      try {
        const recovery = await suspendSecurityForGuild(guild);
        restored = recovery.restored;
        if (recovery.failed) warnings.push('A korábbi raidlezárás vagy karantén még nem oldható fel; a moderáció szünetel tovább.');
      } catch (error) {
        warnings.push('A raidlezárás ellenőrzése sikertelen; a moderáció szünetel tovább.');
        await recordError(error, { command: 'support_moderation_resume_unlock', guildId: guild.id, userId: actorId }).catch(() => {});
      }
    }
    if (!warnings.length) {
    try {
      const saved = [...controlState().nativeRules];
      const rules = saved.length ? await guild.autoModerationRules.fetch() : new Map();
      for (const id of saved) {
        const rule = rules.get(id);
        try {
          if (rule && !rule.enabled) { await rule.edit({ enabled: true, reason: 'NEXA Support: owner visszaállította a korábbi moderációt' }); nativeChanged++; }
          await saveControl({ nativeRules: controlState().nativeRules.filter((item) => item !== id) });
        } catch (error) {
          warnings.push(`A Discord AutoMod ${id} szabályának visszaállítása sikertelen.`);
          await recordError(error, { command: 'support_automod_resume', guildId: guild.id, userId: actorId }).catch(() => {});
        }
      }
    } catch (error) {
      warnings.push('A korábban szüneteltetett Discord AutoMod szabályokat nem sikerült visszaállítani.');
      await recordError(error, { command: 'support_automod_resume', guildId: guild.id, userId: actorId }).catch(() => {});
    }
    }
    await saveControl({ paused: warnings.length > 0, incomplete: warnings.length > 0, changedAt: new Date().toISOString(), changedBy: actorId });
  }
  if (!isPersistentStore()) warnings.push('A tartós adatbázis nem elérhető; a kapcsoló állapota újraindítás után nem garantált. A frissítés után ellenőrizd újra.');
  if (warnings.length && controlState().paused && !controlState().incomplete) await saveControl({ incomplete: true }).catch(() => null);
  const result = { paused: controlState().paused, complete: warnings.length === 0, warnings, nativeChanged, restored };
  await recordAudit(paused ? 'support_moderation_paused' : 'support_moderation_resumed', { guildId: guild.id, actorId, metadata: result }).catch(() => {});
  return result;
}
function setSupportModerationPaused(guild, actorId, paused) {
  const next = controlQueue.catch(() => {}).then(() => changeSupportModeration(guild, actorId, paused));
  controlQueue = next;
  return next;
}
function supportModerationPayload(result = null) {
  const state = controlState();
  const embed = new EmbedBuilder().setColor(state.paused ? 0xe5b967 : 0x6fcfa7).setTitle('NEXA SUPPORT | MODERÁCIÓS KAPCSOLÓ')
    .setDescription(state.paused
      ? '**A NEXA moderációja szünetel a Support szerveren.**\nNincs automatikus kick, ban, timeout, üzenettörlés vagy új raidlezárás. A NEXA moderációs parancsai és régi büntetési gombjai is blokkoltak.'
      : '**A korábban beállított moderáció érvényes.**\nEgy gombbal szüneteltetheted a NEXA moderációját és a Discord aktív AutoMod szabályait, majd visszaállíthatod a korábbi állapotot.')
    .addFields({ name: 'Hatáskör', value: 'Csak a hivatalos Support szerver. Más botok saját moderációját külön kell kezelni.' },
      { name: 'Beállítások', value: 'A korábbi védelmi kapcsolók megmaradnak. Ticketek, tagellenőrzés és üdvözlés tovább működhetnek.' })
    .setFooter({ text: 'NEXA Support • csak a fő owner kezelheti' });
  if (state.incomplete) embed.addFields({ name: 'Részleges művelet', value: 'A NEXA szünetel, de az AutoMod, a korábbi raidlezárás vagy a tartós mentés még hiányos. A kikapcsolás folytatható.' });
  if (result?.warnings.length) embed.addFields({ name: 'Teendő', value: result.warnings.join('\n').slice(0, 1000) });
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(state.paused ? 'support_moderation_resume' : 'support_moderation_pause')
    .setLabel(state.paused ? 'Moderáció visszakapcsolása' : 'Minden moderáció kikapcsolása').setStyle(state.paused ? ButtonStyle.Success : ButtonStyle.Danger));
  if (state.paused && state.incomplete) row.addComponents(new ButtonBuilder().setCustomId('support_moderation_pause').setLabel('Kikapcsolás folytatása').setStyle(ButtonStyle.Secondary));
  return { embeds: [embed], components: [row], allowedMentions: { parse: [] } };
}
async function handleSupportModerationButton(interaction) {
  if (interaction.guildId !== SUPPORT_GUILD_ID || !isBotOwner(interaction.user.id)) {
    return interaction.reply({ content: 'Ezt a kapcsolót csak a fő botowner használhatja a hivatalos Support szerveren.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    if (!['support_moderation_pause', 'support_moderation_resume'].includes(interaction.customId)) throw new Error('Ismeretlen kapcsolóművelet.');
    const result = await setSupportModerationPaused(interaction.guild, interaction.user.id, interaction.customId === 'support_moderation_pause');
    return interaction.editReply(supportModerationPayload(result));
  } catch (error) {
    await recordError(error, { command: 'support_moderation_button', guildId: interaction.guildId, userId: interaction.user.id }).catch(() => {});
    return interaction.editReply('A kapcsoló művelete nem fejeződött be. Ellenőrizd a bot naplóját és az adatbázist; ne tekintsd késznek a kikapcsolást.');
  }
}
function supportModerationControl(session, escape, en = false) {
  if (!isBotOwner(session?.user?.id)) return '';
  const state = controlState(), action = state.paused ? 'false' : 'true';
  const status = en ? (state.paused ? 'NEXA moderation paused' : 'Configured moderation applies') : (state.paused ? 'A NEXA moderációja szünetel' : 'A beállított moderáció érvényes');
  const label = en ? (state.paused ? 'Restore moderation' : 'Disable all moderation') : (state.paused ? 'Moderáció visszakapcsolása' : 'Minden moderáció kikapcsolása');
  const form = (value, text) => `<form method="post" action="/owner/support/moderation"><input type="hidden" name="csrf" value="${escape(session.csrf)}"><input type="hidden" name="paused" value="${value}"><button class="btn ${value === 'true' ? 'secondary' : 'green'}" type="submit">${text}</button></form>`;
  return `<section id="support-moderation" class="card section"><h2>${en ? 'Support moderation switch' : 'Support moderációs kapcsoló'}</h2><p><strong>${status}</strong></p><p>${en ? 'Pauses NEXA moderation and Discord AutoMod on the official Support server. Tickets, verification and welcome messages continue. Other bots are managed separately.' : 'A hivatalos Support szerveren szünetelteti a NEXA moderációját és a Discord AutoModot. A ticketek, tagellenőrzés és üdvözlés tovább működhetnek. Más botok védelmét külön kezeld.'}</p>${state.incomplete ? `<p class="notice warn">${en ? 'Partial operation: NEXA is paused; finish AutoMod / raid recovery and verify persistence before treating this as complete.' : 'Részleges művelet: a NEXA szünetel, de az AutoMod, a raidlezárás vagy a tartós mentés még hiányos.'}</p>` : ''}<div class="actions">${form(action, label)}${state.paused && state.incomplete ? form('true', en ? 'Continue disabling' : 'Kikapcsolás folytatása') : ''}</div></section>`;
}
module.exports = { setSupportModerationPaused, supportModerationPayload, handleSupportModerationButton, supportModerationControl };
