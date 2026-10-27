const crypto = require('node:crypto');
const {requireFaction}=require('./mdt-factions');
const {webUrl}=require('./mdt-network-auth');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { dbQuery, getBotOwnerId, isBotOwner, isPersistentStore } = require('./config');
const { getSettings, requireBelvGuild, textChannel, writable, syncMdtGuildCommand, MdtError } = require('./belv-mdt');
const { allDocumentTypes, findDocumentChannel } = require('./documents');
const { recordAudit, recordError } = require('./telemetry');

async function query(sql, values = []) {
  if (!isPersistentStore()) throw new MdtError(503, 'A Discord MDT-központhoz működő adatbázis kell.');
  const result = await dbQuery(sql, values);
  if (!result) throw new MdtError(503, 'Az MDT-adatbázis átmenetileg nem érhető el.');
  return result;
}
const saveState = (guildId, state) => query('INSERT INTO nexabot_mdt_discord(guild_id,state) VALUES($1,$2) ON CONFLICT(guild_id) DO UPDATE SET state=EXCLUDED.state,updated_at=NOW()', [guildId, state]);
const MARKER = 'BELV MDT • NEXA • állományi központ';
const markerFor=guild=>requireFaction(guild.id).name.toUpperCase()+' MDT • NEXA • állományi központ';
function hubPayload(guild, settings) {
  const embed = new EmbedBuilder().setColor(0x4b9dff).setTitle(requireFaction(guild.id).name.toUpperCase()+' | MDT NETWORK KÖZPONT')
    .setDescription('**Műveleti nyilvántartás • személyes hozzáférés**\nA saját Discord–Roblox fiókpároddal jelentkezhetsz be. A gombok privát választ adnak.')
    .addFields(
      { name: '01 • Panel indítása', value: 'Kattints a **Saját betöltő** gombra. A kapott egyetlen sort futtasd a Roblox-kliensben.', inline: false },
      { name: '02 • Személyes belépés', value: 'Kattints a **Belépőkód** gombra. A tíz percig érvényes egyszeri kódot a saját panelbe írd.', inline: false },
      { name: '03 • Iratkezelés', value: 'Játékosadatlap, személyek, járművek, ügyiratok, RP-körözések, szolgálati napló és engedélyezett frakciós iratsablonok.', inline: false },
      { name: 'Hozzáférés', value: `${(settings.members || []).length} felvett MDT-ügyintéző + fő owner`, inline: true },
      { name: 'Állományi nézet', value: settings.staffRoleId ? `<@&${settings.staffRoleId}> • közzétett iratok` : 'A fő owner az Owner Centerben választ állományi rangot.', inline: true },
      { name: 'Vezetői döntés', value: guild?.id === BELV_GUILD_ID ? 'A BELV-iratokat kizárólag a 🏛️ | BELVÉDELMI VEZETŐSÉG rang fogadhatja el vagy utasíthatja el. A tagkezeléshez vezetőségi Discord-rang és jelszó kell; a telepítés fő owner feladat.' : 'A jóváhagyást a beállított vezetőség vagy kijelölt ellenőr végzi. A tagkezeléshez vezetőségi Discord-rang és jelszó kell; a telepítés fő owner feladat.', inline: false })
    .setFooter({ text: guild?markerFor(guild):MARKER }).setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mdt_hub:script').setLabel('Saját betöltő').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('mdt_hub:belepes').setLabel('Belépőkód').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('mdt_hub:allapot').setLabel('Saját állapot').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mdt_hub:kijelentkezes').setLabel('Belépések visszavonása').setStyle(ButtonStyle.Danger));
  const web=new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('MDT web megnyitása').setStyle(ButtonStyle.Link).setURL(webUrl()));
  return { embeds: [embed], components: [row,web], allowedMentions: { parse: [] } };
}
function helpPayload(guild=null) {
  const embed = new EmbedBuilder().setColor(0xe5b967).setTitle((guild?requireFaction(guild.id).name.toUpperCase():'NEXA')+' MDT | ÁLLOMÁNYI HASZNÁLATI REND')
    .setDescription('**A közzétett nyilvántartás az állomány közös RP-munkáját támogatja.**')
    .addFields(
      { name: 'Személyes használat', value: 'A feloldott vezetőség a Discord-ID-det és a saját Roblox-ID-det párosítja. Saját kódot kérj; a másik tag kódja nem a te fiókodhoz tartozik.' },
      { name: 'Jogosultságok', value: 'A felvett MDT-tag olvashat és rögzíthet, saját iratát módosíthatja vagy lezárhatja. A vezetőség és a kijelölt ellenőrök bírálhatnak; az owner engedélyezhet tágabb bírálati kört. Más tag iratát módosítani és lezárni a fő owner tudja. Az állományi rang Discord-olvasást ad.' },
      { name: 'Ügyiratok és körözések', value: 'Beküldés után vezetői ellenőrzésre kerülnek. Jóváhagyás előtt a létrehozó, a vezetőség és a kijelölt ellenőrök láthatják. A közzétett irat az állomány célcsatornájában jelenik meg.' },
      { name: 'Nyilvántartási rend', value: 'Pontos Roblox-ID-vel kapcsolj személyadatot, ügyet és RP-körözést. Valós személyes adat helyett RP-adatot használj. A régi Discord-üzenetek nem importálódnak automatikusan.' },
      { name: 'Játékadat', value: 'A játék körözési jelzését a megnyitott rendőrségi listából olvassa a panel, ha felismeri. Hiányzó jelzés: ismeretlen. Saját RP-körözés felvitele nem módosítja a játékot.' },
      { name: 'Gyorsparancsok', value: '`/mdt script` • `/mdt belepes` • `/mdt allapot` • `/mdt kijelentkezes`\n**F6:** panel nyitása / elrejtése.' },
      { name: 'Segítség', value: 'Belépési hiba vagy hibás fiókpár esetén a fő ownernek jelezd. Az adatokhoz csak a hozzád rendelt frakció Discord-szerverén kapsz MDT-hozzáférést.' })
    .setFooter({ text: guild?markerFor(guild):MARKER }).setTimestamp();
  return { embeds: [embed], components: [], allowedMentions: { parse: [] } };
}
function permissionValue(overwrite, name) {
  const bit = PermissionFlagsBits[name];
  if (overwrite?.allow?.has(bit)) return true;
  if (overwrite?.deny?.has(bit)) return false;
  return null;
}
async function syncMdtDiscord(guild, actorId) {
  if (!isBotOwner(actorId)) throw new MdtError(403, 'A Discord MDT-központot csak a fő owner frissítheti.');
  await requireBelvGuild(guild.id);
  await syncMdtGuildCommand(guild);
  const token = crypto.randomUUID();
  const acquired = await query(`INSERT INTO nexabot_mdt_provision_locks(guild_id,lease_token,expires_at)
    VALUES($1,$2,NOW()+INTERVAL '5 minutes') ON CONFLICT(guild_id) DO UPDATE
    SET lease_token=EXCLUDED.lease_token,expires_at=EXCLUDED.expires_at
    WHERE nexabot_mdt_provision_locks.expires_at<NOW() RETURNING guild_id`, [guild.id, token]);
  if (!acquired.rowCount) throw new MdtError(409, 'Az MDT-beállítás vagy Discord-frissítés már folyamatban van.');
  try {
    await guild.channels.fetch();
    const settings = await getSettings(guild.id);
    const bot = guild.members.me || await guild.members.fetchMe();
    if (!bot.permissions.has(PermissionFlagsBits.ManageChannels)) throw new MdtError(403, 'A Discord MDT-hozzáférések beállításához a botnak Csatornák kezelése jog kell.');
    const stored = (await query('SELECT state FROM nexabot_mdt_discord WHERE guild_id=$1', [guild.id])).rows[0]?.state || {};
    const state = { messages: stored.messages || {}, overwrites: stored.overwrites || [] };
    const channels = new Set([settings.defaultChannelId, ...Object.values(settings.channelIds || {}), ...Object.values(settings.discordChannelIds || {}), ...(settings.exposeDocumentTemplates?allDocumentTypes(guild).map((type)=>findDocumentChannel(guild,type)?.id):[])].filter((id) => id && id !== settings.reviewChannelId && (!settings.networkEnabled||(settings.managedChannelIds||[]).includes(id))));
    const targets = settings.enabled ? [...(settings.members || []).map((entry) => ({ id: entry.discordId, type: 1 })), ...(settings.staffRoleId ? [{ id: settings.staffRoleId, type: 0 }] : [])] : [];
    const desired = new Map();
    for (const id of channels) {
      const readers = [...targets];
      if (settings.enabled && id === settings.discordChannelIds?.hub) readers.push({ id: getBotOwnerId(), type: 1 });
      for (const target of readers) {
        const permissions = { ViewChannel: true, ReadMessageHistory: true };
        if (id === settings.discordChannelIds?.hub && target.type === 1) permissions.UseApplicationCommands = true;
        desired.set(`${id}:${target.id}`, { channelId: id, targetId: target.id, type: target.type, permissions });
      }
    }
    if (settings.enabled && settings.reviewChannelId && (!settings.networkEnabled||(settings.managedChannelIds||[]).includes(settings.reviewChannelId))) {
      for (const targetId of new Set([getBotOwnerId(), ...(settings.members || []).filter(entry=>settings.reviewMode==='all_members'||entry.reviewer||settings.reviewerDiscordIds?.includes(entry.discordId)).map((entry)=>entry.discordId)])) {
        if (targetId) desired.set(`${settings.reviewChannelId}:${targetId}`, { channelId: settings.reviewChannelId, targetId, type: 1, permissions: { ViewChannel: true, ReadMessageHistory: true, UseApplicationCommands: true } });
      }
    }
    if(settings.enabled&&settings.reviewChannelId&&settings.networkEnabled&&(settings.managedChannelIds||[]).includes(settings.reviewChannelId))for(const roleId of settings.leaderRoleIds||[])desired.set(`${settings.reviewChannelId}:${roleId}`,{channelId:settings.reviewChannelId,targetId:roleId,type:0,permissions:{ViewChannel:true,ReadMessageHistory:true,UseApplicationCommands:true}});
    const heartbeat = async () => {
      const result = await query("UPDATE nexabot_mdt_provision_locks SET expires_at=NOW()+INTERVAL '5 minutes' WHERE guild_id=$1 AND lease_token=$2 AND expires_at>NOW() RETURNING guild_id", [guild.id, token]);
      if (!result.rowCount) throw new MdtError(409, 'A Discord-frissítés zárolása lejárt. Ismételd meg a műveletet.');
    };
    for (const previous of [...state.overwrites]) {
      const wanted = desired.get(`${previous.channelId}:${previous.targetId}`);
      const removed = Object.keys(previous.before).filter((key) => !wanted?.permissions[key]);
      if (!removed.length) continue;
      await heartbeat();
      const channel = textChannel(guild, previous.channelId);
      if (channel) {
        const current = channel.permissionOverwrites.cache?.get(previous.targetId), restore = {};
        for (const key of removed) if (permissionValue(current, key) === true) restore[key] = previous.before[key];
        if (Object.keys(restore).length) await channel.permissionOverwrites.edit(previous.targetId, restore, { type: previous.type, reason: 'NEXA MDT: korábban hozzáadott hozzáférés visszavonása' });
      }
      for (const key of removed) delete previous.before[key];
      if (!Object.keys(previous.before).length) state.overwrites = state.overwrites.filter((item) => item !== previous);
      await saveState(guild.id, state);
    }
    for (const wanted of desired.values()) {
      await heartbeat();
      const channel = await writable({ guild }, wanted.channelId);
      let entry = state.overwrites.find((item) => item.channelId === wanted.channelId && item.targetId === wanted.targetId);
      if (!entry) {
        entry = { channelId: wanted.channelId, targetId: wanted.targetId, type: wanted.type, before: {} };
        state.overwrites.push(entry);
      }
      const current = channel.permissionOverwrites.cache?.get(wanted.targetId);
      for (const key of Object.keys(wanted.permissions)) if (!(key in entry.before)) entry.before[key] = permissionValue(current, key);
      await saveState(guild.id, state);
      const changes = Object.fromEntries(Object.entries(wanted.permissions).filter(([key, value]) => permissionValue(current, key) !== value));
      if (Object.keys(changes).length) await channel.permissionOverwrites.edit(wanted.targetId, changes, { type: wanted.type, reason: 'NEXA MDT: felvett tag / állomány célzott hozzáférése' });
    }
    if (settings.enabled) for (const [key, payload] of [['hub', hubPayload(guild, settings)], ['help', helpPayload(guild)]]) {
      await heartbeat();
      const channelId = settings.discordChannelIds?.[key];
      if (!channelId){if(settings.networkEnabled)continue;throw new MdtError(409, 'Előbb hozd létre a hiányzó MDT-szobákat: központ és útmutató.');}
      const channel = await writable({ guild }, channelId), previousId = state.messages[key];
      const previous = previousId ? await channel.messages.fetch(previousId).catch((error) => { if (error.code === 10008) return null; throw error; }) : null;
      const own = previous?.author?.id === bot.id && previous.embeds?.some((embed) => [MARKER,markerFor(guild)].includes(embed.footer?.text));
      const nonce = crypto.createHash('sha256').update(`MDT:${key}:${guild.id}:${channel.id}:${previousId||'new'}`).digest('hex').slice(0,24);
      const message = own ? await previous.edit(payload) : await channel.send({ ...payload, nonce, enforceNonce: true });
      state.messages[key] = message.id;await saveState(guild.id, state);
    }
    await recordAudit('mdt_discord_refresh', { guildId: guild.id, actorId, metadata: { readers: targets.length, channels: channels.size } });
    return { readers: targets.length, channels: channels.size };
  } catch (error) {
    await recordError(error, { command: 'mdt_discord_refresh', guildId: guild.id, userId: actorId }).catch(() => {});
    throw new MdtError(error.status || 503, `${error.status ? error.message : 'A Discord MDT-frissítés megszakadt. Ellenőrizd a bot csatornajogait.'} A hozzáféréslista mentve maradt; a Discord-frissítés megismételhető.`);
  } finally {
    await query('DELETE FROM nexabot_mdt_provision_locks WHERE guild_id=$1 AND lease_token=$2', [guild.id, token]).catch(() => {});
  }
}
module.exports = { syncMdtDiscord, hubPayload, helpPayload };
