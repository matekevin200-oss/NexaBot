const { isBotOwner, dashboardUrl } = require('./config');
const { getSettings, saveMdtOwnerConfig, provisionMdtOwnerChannels, updateMdtMember, allRobloxIds, inspectMdtMemberAccess, MDT_CHANNELS, TYPES, MdtError } = require('./belv-mdt');
const { getMdtLoaderCommand } = require('./mdt-loader');
const { syncMdtDiscord } = require('./mdt-discord');
const clientSource = require('./mdt-client');

function requireOwner(id) {
  if (!isBotOwner(id)) throw new MdtError(403, 'A Belv MDT beállításait kizárólag a fő botowner kezelheti.');
}
async function loaderPanel(guildId, actorId, baseUrl, session, escape) {
  const loader = await getMdtLoaderCommand(guildId, actorId, baseUrl), action = `/owner/mdt/${escape(guildId)}`;
  return `<section class="card section"><h2>Egysoros MDT-betöltő</h2><p>A felvett tagok Discordon saját betöltőt kérhetnek: <code>/mdt script</code>. A panelbe mindenki a saját <code>/mdt belepes</code> kódjával jelentkezik be.</p><label for="mdt-loader-code">Betöltő • kattints a mezőbe, Ctrl+A, Ctrl+C</label><textarea id="mdt-loader-code" aria-label="Egysoros MDT-betöltő" readonly spellcheck="false" rows="3" style="width:100%;font-family:monospace;overflow-wrap:anywhere">${escape(loader.code)}</textarea><div class="actions"><a class="btn green" href="${action}/loader.lua">Egysoros betöltő letöltése</a><a class="btn secondary" href="${action}/script">Teljes kód megnyitása</a></div><p class="muted">F6: nyitás / elrejtés. A betöltőlink nem ad irathozzáférést; a belépőkód a kérő Discord-fiókjához felvett Roblox-ID-kre érvényes. A lista minden indításkor frissül.</p><form method="post" action="${action}"><input type="hidden" name="csrf" value="${escape(session.csrf || '')}"><input type="hidden" name="operation" value="rotate-loader"><button class="btn secondary" type="submit">Régi betöltőlink visszavonása és új készítése</button></form></section>`;
}
async function mdtOwnerPage(client, session, guildId, { layout, escapeHtml: escape, inspectMemberId = null }) {
  requireOwner(session?.user?.id);
  let content = `<div class="page-head"><div><div class="section-kicker">BELV • ÁLLOMÁNYI MDT</div><h1>Belv MDT • Hozzáférések</h1><p class="muted">Te veszed fel a Discord–Roblox fiókpárokat. A tagok saját néven dolgoznak; az állomány a közzétett iratokat olvashatja. Az MDT egyetlen Belv Discord-szerverhez kötött.</p></div><a class="btn secondary" href="/owner">← Owner Center</a></div>`;
  if (!guildId) {
    const guilds = [...client.guilds.cache.values()], current = guilds.length ? await getSettings(guilds[0].id) : {};
    content += `<div class="owner-tools">${guilds.filter((guild) => !current.scopeGuildId || guild.id === current.scopeGuildId).map((guild) => `<article class="card"><h3>${escape(guild.name)}</h3><p class="muted">${escape(guild.id)}</p><a class="btn" href="/owner/mdt/${escape(guild.id)}">${current.scopeGuildId ? 'Belv MDT kezelése' : 'Ez a Belv szerver'}</a></article>`).join('')}</div><p class="muted">Az első sikeres beállítás a kiválasztott Belv-szerverhez köti az MDT-t. Más Discord-szerveren nem használható.</p>`;
    return layout('Belv MDT • Owner', content, session);
  }
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new MdtError(404, 'A NEXA Bot nincs ezen a Discord-szerveren.');
  const settings = await getSettings(guild.id);
  if (settings.scopeGuildId && settings.scopeGuildId !== guild.id) throw new MdtError(403, 'Az MDT kizárólag a beállított Belv Discord-szerveren kezelhető.');
  const action = `/owner/mdt/${escape(guild.id)}`, csrf = `<input type="hidden" name="csrf" value="${escape(session.csrf)}">`;
  const channels = [...guild.channels.cache.values()].filter((channel) => channel.isTextBased?.() && !channel.isThread?.());
  const select = (name, value, optional = false) => `<select name="${escape(name)}">${optional ? '<option value="">Alapcsatorna használata</option>' : '<option value="">Válassz csatornát</option>'}${channels.map((channel) => `<option value="${escape(channel.id)}"${value === channel.id ? ' selected' : ''}>#${escape(channel.name)}</option>`).join('')}</select>`;
  const roles = [...(guild.roles.cache?.values() || [])].filter((role) => role.id !== guild.id);
  const roleSelect = `<select name="staff_role"><option value="">Állományi rang kiválasztása</option>${roles.map((role) => `<option value="${escape(role.id)}"${settings.staffRoleId === role.id ? ' selected' : ''}>${escape(role.name)}</option>`).join('')}</select>`;
  content += `<section id="mdt-members" class="card section"><h2>MDT-tagok • Discord-ID + Roblox-ID</h2><p class="muted">A felvett tag saját kódot kérhet és saját iratot rögzíthet. Jóváhagyás és beállításkezelés csak neked jár. Egy Roblox-fiók egy Discord-fiókhoz tartozhat.</p><form method="post" action="${action}">${csrf}<input type="hidden" name="operation" value="member-add"><div class="field-grid"><div><label>Tag Discord-ID-je</label><input name="discord_id" inputmode="numeric" pattern="[0-9]{16,22}" maxlength="22" required placeholder="A Discord fejlesztői módjában: ID másolása"></div><div><label>Tag saját Roblox-ID-je • legfeljebb 5</label><input name="member_roblox_ids" maxlength="120" required placeholder="123456789"></div></div><button class="btn green" type="submit">Tag hozzáadása / saját fiókok frissítése</button></form><div style="overflow-x:auto"><table><thead><tr><th>Ügyintéző</th><th>Discord-ID</th><th>Roblox-ID-k</th><th>Hozzáférés</th></tr></thead><tbody>${(settings.members || []).map((entry) => `<tr><td>${escape(entry.name)}</td><td><code>${escape(entry.discordId)}</code></td><td>${escape(entry.robloxIds.join(', '))}</td><td><form method="post" action="${action}">${csrf}<input type="hidden" name="operation" value="member-remove"><input type="hidden" name="discord_id" value="${escape(entry.discordId)}"><button class="btn secondary" type="submit">Visszavonás</button></form><a class="btn secondary small" href="${action}?check=${escape(entry.discordId)}#mdt-access-check">Hozzáférés ellenőrzése</a></td></tr>`).join('') || '<tr><td colspan="4">Még nincs felvett MDT-tag.</td></tr>'}</tbody></table></div><p class="muted">Visszavonáskor a tag személyes kódjai és munkamenetei törlődnek. A panel következő ellenőrzése kiüríti az adatokat. A Discord-frissítés a bot által hozzáadott olvasási jogot állítja vissza; más rangból eredő hozzáférést nem töröl.</p></section>`;
  if (inspectMemberId) {
    const inspection = await inspectMdtMemberAccess(guild, session.user.id, inspectMemberId);
    content += `<section id="mdt-access-check" class="card section"><h2>Tag hozzáférésének ellenőrzése</h2><p>Discord-ID: <code>${escape(inspection.discordId)}</code>. A szerver aktuális adatait kérdeztük le; belépőkód nem készült.</p><div style="overflow-x:auto"><table><thead><tr><th>Ellenőrzés</th><th>Állapot</th><th>Részletek</th></tr></thead><tbody>${inspection.checks.map((check) => `<tr><td>${escape(check.label)}</td><td>${check.ok === true ? '✅ Rendben' : check.ok === false ? '❌ Teendő' : '⚠️ Ellenőrizendő'}</td><td>${escape(check.detail)}</td></tr>`).join('')}</tbody></table></div><p class="muted">A személyes hozzáférés és a Discord parancsmegjelenítés külön ellenőrzés. A központ Belépőkód gombja is saját privát kódot ad.</p></section>`;
  }
  content += `<section class="card"><div class="section-kicker">${escape(guild.name)} • ${escape(guild.id)}</div><h2>Belv szerver és Discord-nézet</h2><form method="post" action="${action}">${csrf}<label><input type="checkbox" name="enabled"${settings.enabled ? ' checked' : ''}> MDT bekapcsolva</label><div class="field-grid"><div><label>A fő owner saját Roblox-ID-i</label><textarea name="roblox_ids" rows="3" maxlength="250" placeholder="123456789">${escape((settings.robloxIds || []).join('\n'))}</textarea></div><div><label>Belv állomány rangja • Discord-olvasási jog</label>${roleSelect}<p class="muted">A kiválasztott meglévő rang a közzétett MDT-iratokat, a központot és az útmutatót láthatja. Ez önmagában nem ad Roblox MDT-belépést.</p></div><div><label>Alapértelmezett MDT-csatorna</label>${select('default_channel', settings.defaultChannelId)}</div><div><label>Vezetői ellenőrzés • külön privát csatorna</label>${select('review_channel', settings.reviewChannelId)}</div>${TYPES.map((type) => `<div><label>${escape(type.title)}</label>${select(`channel_${type.key}`, settings.channelIds?.[type.key], true)}</div>`).join('')}</div><p class="muted">A telepítő a hiányzó szobákat pótolja. A Discord-frissítés csak az MDT célcsatornáiban ad olvasási jogot a felvett tagoknak és a választott állományi rangnak. Rangot, csatornanevet, sorrendet vagy más üzenetét nem módosítja; a bot saját MDT-központját frissíti.</p><p class="muted">MDT-szobák: ${MDT_CHANNELS.map((item) => `<code>#${escape(item.name)}</code>`).join(' • ')}.</p><div class="actions"><button class="btn green" name="operation" value="provision" type="submit">MDT-központ létrehozása és frissítése</button><button class="btn secondary" name="operation" value="save" type="submit">Beállítások és állományi hozzáférés mentése</button></div></form></section>`;
  if (settings.enabled && allRobloxIds(settings).length) content += await loaderPanel(guild.id, session.user.id, dashboardUrl(), session, escape);
  content += `<section class="card section"><h2>Discord-központ és saját belépések</h2><form method="post" action="${action}">${csrf}<button class="btn" name="operation" value="discord-refresh" type="submit">Discord-nézet és MDT-gombok frissítése</button></form><form method="post" action="${action}">${csrf}<button class="btn secondary" name="operation" value="revoke" type="submit">Saját owner-belépéseim visszavonása</button></form></section>`;
  return layout('Belv MDT • Owner', content, session);
}
async function saveMdtOwnerForm(guild, actorId, form) {
  requireOwner(actorId);
  const current = await getSettings(guild.id), operation = form.get('operation');
  if (['member-add', 'member-remove'].includes(operation)) {
    const settings = await updateMdtMember(guild, actorId, { discordId: form.get('discord_id'), robloxIds: form.get('member_roblox_ids') }, operation === 'member-remove');
    await syncMdtDiscord(guild, actorId);return { settings };
  }
  if (operation === 'discord-refresh') return syncMdtDiscord(guild, actorId);
  const input = { ...current, enabled: form.get('enabled') === 'on', robloxIds: form.get('roblox_ids'), staffRoleId: form.get('staff_role'), defaultChannelId: form.get('default_channel'), reviewChannelId: form.get('review_channel'), channelIds: Object.fromEntries(TYPES.map((type) => [type.key, form.get(`channel_${type.key}`)])) };
  const result = operation === 'provision' ? await provisionMdtOwnerChannels(guild, actorId, input) : { settings: await saveMdtOwnerConfig(guild, actorId, input) };
  if (result.settings.discordChannelIds?.hub || operation === 'provision') await syncMdtDiscord(guild, actorId);
  return result;
}
async function buildMdtClientScript(guildId, actorId, baseUrl) {
  requireOwner(actorId);
  const settings = await getSettings(guildId);
  if (settings.scopeGuildId !== guildId) throw new MdtError(403, 'Az MDT kizárólag a beállított Belv Discord-szerveren használható.');
  if (!settings.enabled || !allRobloxIds(settings).length) throw new MdtError(409, 'Előbb ments Roblox-ID-t és kapcsold be az MDT-t.');
  const root = new URL(baseUrl);
  if (root.protocol !== 'https:') throw new MdtError(409, 'A NEXA PUBLIC_URL értéke HTTPS-webcím legyen.');
  const config = `local CONFIG = { BaseUrl = ${JSON.stringify(root.origin)}, GuildId = ${JSON.stringify(guildId)}, AllowedRobloxIds = { ${allRobloxIds(settings).map((id) => JSON.stringify(id)).join(', ')} } }`;
  return clientSource.replace('local CONFIG = { BaseUrl = "", GuildId = "", AllowedRobloxIds = {} }', config);
}
async function mdtClientCodePage(guildId, actorId, baseUrl, session, { layout, escapeHtml: escape }) {
  const source = await buildMdtClientScript(guildId, actorId, baseUrl), loader = await loaderPanel(guildId, actorId, baseUrl, session, escape);
  const content = `<div class="page-head"><div><div class="section-kicker">BELV • SAJÁT MDT</div><h1>Betöltő és teljes panelkód</h1></div><a class="btn secondary" href="/owner/mdt/${escape(guildId)}">← MDT beállítások</a></div>${loader}<section class="card section"><h2>Teljes panelkód</h2><p>Az egysoros betöltő indítja a panelt. A teljes forrás is másolható; minden felvett tag a saját Discord-kódjával lép be.</p><textarea id="mdt-script-source" aria-label="Belv MDT teljes panelkód" readonly spellcheck="false" rows="24" style="width:100%;font-family:monospace;white-space:pre;min-height:520px">${escape(source)}</textarea><p><a class="btn" href="/owner/mdt/${escape(guildId)}/client.lua">Teljes kód .lua fájlban</a></p></section>`;
  return layout('Belv MDT • Script', content, session);
}
module.exports = { mdtOwnerPage, saveMdtOwnerForm, buildMdtClientScript, mdtClientCodePage };
