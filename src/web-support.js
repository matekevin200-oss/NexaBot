const { isTicketStaff,withTicketLease }=require('./ticket-operations');
const crypto = require('node:crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { SUPPORT_GUILD_ID } = require('./constants');
const { dbQuery, isBotOwner, getGuildConfig } = require('./config');
const { recordAudit, recordError } = require('./telemetry');
const { safeChannelName, baseEmbed } = require('./utils');
const { ticketOptions,priorityValue } = require('./workflow-options');

const SUPPORT_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const SUPPORT_STATUSES = new Set(['open', 'pending', 'closed']);
const SUPPORT_SLA_HOURS = Object.freeze({ urgent: 1, high: 4, normal: 24, low: 48 });
async function query(sql, values = []) {
  const result = await dbQuery(sql, values);
  if (!result) throw new Error('A ticketadatbázis nem érhető el. Próbáld újra később.');
  return result;
}
async function requireOperator(client, actor) {
  if (isBotOwner(actor?.id)) return;
  const guild = client.guilds.cache.get(SUPPORT_GUILD_ID);
  const member = await guild?.members.fetch({ user: actor?.id, force: true }).catch(() => null);
  if (!member || !(member.permissions?.has(PermissionFlagsBits.ManageMessages)||isTicketStaff(member))) throw new Error('A ticketet csak a fő owner vagy NEXA Support staff kezelheti.');
}
function ticketMetrics(ticket, now = Date.now()) {
  const start = new Date(ticket.created_at).getTime();
  const targets=ticketOptions(getGuildConfig(SUPPORT_GUILD_ID).tickets).slaHours;
  const due = start + (targets[ticket.priority] || 24) * 3600000;
  const response = ticket.first_response_at ? new Date(ticket.first_response_at).getTime() : null;
  return { responseDueAt: new Date(due).toISOString(), waitingMinutes: Math.max(0, Math.floor((now-start)/60000)), firstResponseMinutes: response ? Math.max(0, Math.floor((response-start)/60000)) : null, overdue: !response && ticket.status !== 'closed' && now > due, targetHours: targets[ticket.priority] || 24 };
}


function supportControls(ticketId, status = 'open') {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`websupport_claim:${ticketId}`).setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Primary).setDisabled(status === 'closed'),
    new ButtonBuilder().setCustomId(`websupport_pending:${ticketId}`).setLabel('Pending').setEmoji('⏸️').setStyle(ButtonStyle.Secondary).setDisabled(status === 'pending' || status === 'closed')
  );
  if (status === 'closed') {
    row.addComponents(new ButtonBuilder().setCustomId(`websupport_reopen:${ticketId}`).setLabel('Reopen').setEmoji('🔓').setStyle(ButtonStyle.Success));
  } else {
    row.addComponents(new ButtonBuilder().setCustomId(`websupport_close:${ticketId}`).setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger));
  }
  row.addComponents(new ButtonBuilder().setCustomId(`websupport_priority:${ticketId}`).setLabel('Prioritás').setStyle(ButtonStyle.Secondary), status==='closed'?new ButtonBuilder().setCustomId(`websupport_delete:${ticketId}`).setLabel('Ticket törlése').setStyle(ButtonStyle.Danger):new ButtonBuilder().setCustomId(`websupport_unclaim:${ticketId}`).setLabel('Visszaadás').setStyle(ButtonStyle.Secondary));
  return row;
}

function normalizePriority(value) {
  return SUPPORT_PRIORITIES.has(value) ? value : 'normal';
}

async function listWebTickets(userId) {
  const result = await query(
    "SELECT * FROM nexabot_web_support_tickets WHERE user_id = $1 AND status NOT IN('deleted','deleting') ORDER BY updated_at DESC LIMIT 50",
    [userId]
  );
  return result?.rows || [];
}

async function getWebTicket(ticketId, userId, owner = false, before = null) {
  if(before!=null&&!/^\d{1,20}$/.test(String(before)))throw new Error('Érvénytelen üzenetlapozás.');
  const result = await query(
    `SELECT * FROM nexabot_web_support_tickets WHERE id = $1${owner ? '' : ' AND user_id = $2'} AND ${owner?"status<>'deleted'":"status NOT IN('deleted','deleting')"} LIMIT 1`,
    owner ? [ticketId] : [ticketId, userId]
  );
  const ticket = result?.rows?.[0] || null;
  if (!ticket) return null;
  const messages = await query(
    `SELECT * FROM (SELECT * FROM nexabot_web_support_messages WHERE ticket_id=$1${owner?'':' AND internal=FALSE'} AND ($2::bigint IS NULL OR id<$2) ORDER BY id DESC LIMIT 500) AS recent ORDER BY id ASC`,
    [ticketId,before]
  );
  return { ticket: { ...ticket, metrics: ticketMetrics(ticket) }, historyPage:before!=null, messages: messages?.rows || [], previous: messages.rows.length===500?String(messages.rows[0].id):null };
}

async function listAllWebTickets({ status = '', priority = '', search = '' } = {}) {
  const values = [];
  const where = ["status<>'deleted'"];
  if (SUPPORT_STATUSES.has(status)) { values.push(status); where.push(`status=$${values.length}`); }
  if (SUPPORT_PRIORITIES.has(priority)) { values.push(priority); where.push(`priority=$${values.length}`); }
  if (search) { values.push(`%${String(search).slice(0, 100)}%`); where.push(`(subject ILIKE $${values.length} OR username ILIKE $${values.length} OR CAST(id AS TEXT) ILIKE $${values.length})`); }
  const result = await query(`SELECT * FROM nexabot_web_support_tickets${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, updated_at DESC LIMIT 250`, values);
  return result?.rows || [];
}

async function ensureSupportDestination(guild) {
  await guild.channels.fetch().catch(() => null);
  await guild.roles.fetch().catch(() => null);
  const parent=await require('./ticket-recovery').ensureTicketCategory(guild);
  let supportRole = guild.roles.cache.get(getGuildConfig(guild.id).roles.staff) || guild.roles.cache.find((role) => !role.managed && /support|ügyf[eé]l|staff/i.test(role.name));
  if (!supportRole) supportRole = await guild.roles.create({ name: 'NEXA Support Team', permissions: [], reason: 'NEXA 20.1.1 Support Center öngyógyítás' });
  return { parent, supportRole };
}

function replyEmbed(ticket,row) {
  const embed=baseEmbed(`NEXA Support #${ticket.id} • ${String(row.author_name||'Ügyfél').slice(0,80)}`,String(row.content||'').slice(0,4000));
  if(row.source==='web'&&String(row.author_id)===String(ticket.user_id)) {
    embed.addFields({name:'Téma',value:String(ticket.subject).slice(0,1000)},{name:'Kategória',value:String(ticket.category)},{name:'Felhasználó',value:String(ticket.username)+' ('+ticket.user_id+')'});
  }
  return embed;
}
async function postSupportControls(channel,ticket,eventText='') {
  let message=null;if(ticket.control_message_id){try{message=await channel.messages.fetch(ticket.control_message_id);}catch(error){if(Number(error.code)!==10008)throw error;}}
  if(message) {
    const original=(await query('SELECT * FROM nexabot_web_support_messages WHERE ticket_id=$1 AND discord_message_id=$2 AND source<>\'system\' LIMIT 1',[ticket.id,ticket.control_message_id])).rows[0];
    if(original){await message.edit({embeds:[replyEmbed(ticket,original)],components:[],allowedMentions:{parse:[]}});message=null;}
  }
  const payload={embeds:[baseEmbed(`Support #${ticket.id} • ${ticket.subject}`,`**Állapot:** ${ticket.status}\n**Prioritás:** ${ticket.priority}\n**Felelős:** ${ticket.assigned_name||'Nincs kijelölve'}\n${eventText}`)],components:[supportControls(ticket.id,ticket.status)],allowedMentions:{parse:[]}};
  const nonce=crypto.createHash('sha256').update(`WSC:${ticket.id}:${channel.id}:${ticket.control_message_id||'new'}`).digest('hex').slice(0,24);
  const controls=message?await message.edit(payload):await channel.send({...payload,nonce,enforceNonce:true});
  await query('UPDATE nexabot_web_support_tickets SET control_message_id=$1 WHERE id=$2',[controls.id,ticket.id]);
  return controls;
}
async function createWebTicket(client,user,{subject,category,content,priority='normal',formData={},clientKey=null}) {
  subject=String(subject||'').trim();content=String(content||'').trim();
  if(subject.length<3||subject.length>100||content.length<5||content.length>4000)throw new Error('A téma 3–100, a leírás 5–4000 karakter legyen.');
  if(!['technical','bug','billing','partnership','other'].includes(category))throw new Error('Érvénytelen ticketkategória.');
  priority=normalizePriority(priority);
  if(clientKey!=null&&!/^[a-zA-Z0-9_-]{16,80}$/.test(String(clientKey)))throw new Error('Érvénytelen beküldési azonosító. Frissítsd az űrlapot.');
  clientKey=clientKey||crypto.randomBytes(16).toString('hex');
  const fields=Object.fromEntries(['serverId','steps','expected'].map(key=>[key,String(formData[key]||'').trim().slice(0,1000)]));
  if(fields.serverId&&!/^\d{16,22}$/.test(fields.serverId))throw new Error('Érvénytelen Discord-szerver-ID.');
  const hash=crypto.createHash('sha256').update(JSON.stringify([subject,category,content,priority,fields])).digest('hex');
  const previous=(await query('SELECT * FROM nexabot_web_support_tickets WHERE user_id=$1 AND client_key=$2',[user.id,clientKey])).rows[0];
  if(previous){if(previous.input_hash!==hash)throw new Error('A korábbi beküldés más tartalommal már megvan. Nyiss új űrlapot.');return previous;}
  const guild=client.guilds.cache.get(SUPPORT_GUILD_ID);if(!guild)throw new Error('A NEXA Support szerver nem érhető el.');
  const lease=crypto.randomUUID(),key='web:'+user.id;
  const acquired=await query(`INSERT INTO nexabot_ticket_open_locks(scope_key,lease_token,expires_at) VALUES($1,$2,NOW()+INTERVAL '2 minutes')
    ON CONFLICT(scope_key) DO UPDATE SET lease_token=EXCLUDED.lease_token,expires_at=EXCLUDED.expires_at WHERE nexabot_ticket_open_locks.expires_at<NOW() RETURNING scope_key`,[key,lease]);
  if(!acquired.rowCount)throw new Error('Az előző ticketnyitásod még folyamatban van. Várd meg az eredményt.');
  try {
    const repeated=(await query('SELECT * FROM nexabot_web_support_tickets WHERE user_id=$1 AND client_key=$2',[user.id,clientKey])).rows[0];if(repeated){if(repeated.input_hash!==hash)throw new Error('A korábbi beküldés más tartalommal már megvan.');return repeated;}
    const active=await query("SELECT COUNT(*)::integer AS total FROM nexabot_web_support_tickets WHERE user_id=$1 AND status IN('open','pending')",[user.id]);
    const options=ticketOptions(getGuildConfig(SUPPORT_GUILD_ID).tickets);
    if(Number(active.rows[0].total)>=options.webMaxOpenPerUser)throw new Error(`Legfeljebb ${options.webMaxOpenPerUser} aktív webes ticketed lehet.`);
    const inserted=await query(`WITH created AS (
      INSERT INTO nexabot_web_support_tickets(user_id,username,subject,category,priority,form_data,discord_state,client_key,input_hash)
      VALUES($1,$2,$3,$4,$5,$6,'pending',$8,$9) RETURNING *
    ), opening AS (
      INSERT INTO nexabot_web_support_messages(ticket_id,author_id,author_name,source,content,discord_state)
      SELECT id,$1,$2,'web',$7,'pending' FROM created RETURNING id,ticket_id
    ) SELECT created.*,opening.id AS opening_message_id FROM created JOIN opening ON opening.ticket_id=created.id`,[user.id,user.username,subject,category,priority,fields,content,clientKey,hash]);
    const ticket=inserted.rows[0];
    try {
      const {parent,supportRole}=await ensureSupportDestination(guild),bot=guild.members.me||await guild.members.fetchMe();
      const channel=await require('./ticket-recovery').createTicketChannel(guild,{name:`web-${ticket.id}-${safeChannelName(user.username)}`,type:ChannelType.GuildText,parent:parent.id,topic:`nexabot-web-support|${ticket.id}|${user.id}`,permissionOverwrites:[{id:guild.id,deny:[PermissionFlagsBits.ViewChannel]},{id:bot.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.EmbedLinks]},{id:supportRole.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageMessages]},...options.agentRoleIds.filter(id=>id!==supportRole.id&&guild.roles.cache.has(id)).map(id=>({id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageMessages]}))],reason:`NEXA Support #${ticket.id}`});
      await query('UPDATE nexabot_web_support_tickets SET channel_id=$1 WHERE id=$2',[channel.id,ticket.id]);ticket.channel_id=channel.id;
      const opening=await channel.send({embeds:[replyEmbed(ticket,{author_id:user.id,author_name:user.username,source:'web',content})],allowedMentions:{parse:[]},nonce:crypto.createHash('sha256').update(`WS:${ticket.opening_message_id}:${channel.id}`).digest('hex').slice(0,24),enforceNonce:true});
      await query("UPDATE nexabot_web_support_messages SET discord_state='synced',discord_message_id=$1 WHERE id=$2",[opening.id,ticket.opening_message_id]);
      const controls=await postSupportControls(channel,ticket);
      await query("UPDATE nexabot_web_support_tickets SET discord_state='synced' WHERE id=$1",[ticket.id]);
      return {...ticket,control_message_id:controls.id,discord_state:'synced'};
    }catch(error){
      await query("UPDATE nexabot_web_support_tickets SET discord_state='failed' WHERE id=$1",[ticket.id]);
      await recordError(error,{command:'web_ticket_discord_create',userId:user.id}).catch(()=>null);
      return {...ticket,discord_state:'failed'};
    }
  }finally{await query('DELETE FROM nexabot_ticket_open_locks WHERE scope_key=$1 AND lease_token=$2',[key,lease]).catch(()=>null);}
}

async function addWebReply(client, ticket, user, content) {
  content = String(content || '').trim();
  if (!content || content.length > 4000) throw new Error('A válasz 1–4000 karakter legyen.');
  if (user.id !== ticket.user_id && !isBotOwner(user.id)) throw new Error('Ehhez a tickethez nincs hozzáférésed.');
  const ownerReply = user.id !== ticket.user_id;
  const inserted = await query(`INSERT INTO nexabot_web_support_messages (ticket_id,author_id,author_name,source,content,discord_state)
    SELECT id,$2,$3,$4,$5,'pending' FROM nexabot_web_support_tickets
    WHERE id=$1 AND status IN('open','pending') AND (user_id=$2 OR $6=TRUE) RETURNING id`, [ticket.id,user.id,user.username,ownerReply?'owner':'web',content,ownerReply]);
  if (!inserted.rowCount) throw new Error('A ticket időközben lezárult. Nyisd újra a válasz előtt.');
  await query(`UPDATE nexabot_web_support_tickets SET updated_at=NOW(), first_response_at=CASE WHEN $2 THEN COALESCE(first_response_at,NOW()) ELSE first_response_at END WHERE id=$1`, [ticket.id,ownerReply]);
  const channel = client.channels.cache.get(ticket.channel_id) || (ticket.channel_id ? await client.channels.fetch(ticket.channel_id).catch(() => null) : null);
  try {
    if (!channel?.isTextBased()) throw new Error('A Discord-ticketcsatorna nem érhető el.');
    const message = await channel.send({ embeds: [replyEmbed(ticket,{author_name:user.username,source:ownerReply?'owner':'web',content})], allowedMentions: { parse: [] }, nonce: crypto.createHash('sha256').update(`WS:${inserted.rows[0].id}:${channel.id}`).digest('hex').slice(0,24), enforceNonce: true });
    await query("UPDATE nexabot_web_support_messages SET discord_state='synced',discord_message_id=$1 WHERE id=$2", [message.id,inserted.rows[0].id]);
  } catch (error) {
    await query("UPDATE nexabot_web_support_messages SET discord_state='failed' WHERE id=$1", [inserted.rows[0].id]);
    await query("UPDATE nexabot_web_support_tickets SET discord_state='failed' WHERE id=$1", [ticket.id]);
    await recordError(error,{command:'web_support_reply_sync',userId:user.id}).catch(() => null);
  }
}

async function manageWebTicket(client, ticketId, actor, action, value = '', options = {}) {
  await requireOperator(client, actor);
  if(action==='delete')return deleteWebTicket(client,ticketId,actor,options);
  const data = await getWebTicket(ticketId, actor.id, true);
  if (!data) throw new Error('A ticket nem található.');
  const ticket = data.ticket;if(ticket.status==='deleting')throw new Error('A ticket törlése folyamatban van. A törlés folytatását válaszd.');
  const revision = options.revision == null ? ticket.revision : Number(options.revision);
  if (!Number.isInteger(revision) || revision !== ticket.revision) throw new Error('A ticket megváltozott. Frissítsd az oldalt.');
  let update, values, eventText;
  const name = actor.globalName || actor.username || actor.id;
  if (action === 'claim') {
    if (ticket.status === 'closed') throw new Error('Lezárt ticket nem vehető fel.');
    if (ticket.assigned_to && ticket.assigned_to !== actor.id) throw new Error('A ticketet már más ügyintéző felvette.');
    update='assigned_to=$1,assigned_name=$2'; values=[actor.id,name]; eventText=`${name} felvette a ticketet.`;
  } else if (action === 'assign') {
    if (!isBotOwner(actor.id)) throw new Error('Másik ügyintézőt csak a fő owner jelölhet ki.');
    const guild = client.guilds.cache.get(SUPPORT_GUILD_ID);
    const member = await guild?.members.fetch({ user: String(value), force: true }).catch(() => null);
    if (!member || member.user.bot || !(member.permissions.has(PermissionFlagsBits.ManageMessages)||isTicketStaff(member))) throw new Error('A kijelölt személy NEXA Support staff legyen.');
    update='assigned_to=$1,assigned_name=$2';values=[member.id,member.displayName];eventText=`Ügyintéző kijelölve: ${member.displayName}.`;
  } else if (action === 'unclaim') {
    if (ticket.assigned_to !== actor.id && !isBotOwner(actor.id)) throw new Error('Csak a saját ticketedet adhatod vissza.');
    update='assigned_to=NULL,assigned_name=NULL';values=[];eventText=`${name} visszaadta a ticketet.`;
  } else if (action === 'priority') {
    value=priorityValue(value);
    if (!SUPPORT_PRIORITIES.has(value)) throw new Error('A prioritás low, normal, high vagy urgent legyen.');
    update='priority=$1';values=[value];eventText=`Prioritás: ${value.toUpperCase()} • ${name}.`;
  } else if (action === 'status' && SUPPORT_STATUSES.has(value)) {
    const policy=ticketOptions(getGuildConfig(SUPPORT_GUILD_ID).tickets);
    const reason = String(options.reason || '').trim() || (value==='closed'&&!policy.requireCloseReason?'Lezárva az ügyintéző által.':'');
    if (value === 'closed' && (reason.length < 3 || reason.length > 1000)) throw new Error('A lezáráshoz 3–1000 karakteres indok kell.');
    if (ticket.status === 'closed' && value === 'pending') throw new Error('A lezárt ticketet előbb nyisd újra.');
    update="status=$1,closed_at=CASE WHEN $1='closed' THEN NOW() ELSE NULL END,close_reason=CASE WHEN $1='closed' THEN $2 ELSE NULL END";
    values=[value,reason];eventText=`Állapot: ${value.toUpperCase()} • ${name}${reason?' • '+reason:''}.`;
  } else if (action === 'sync') { return repairWebTicket(client,ticketId,actor); }
  else throw new Error('Ismeretlen ticketművelet.');
  const count=values.length;values.push(ticketId,revision);
  const result = await query(`UPDATE nexabot_web_support_tickets SET ${update},revision=revision+1,updated_at=NOW()
    WHERE id=$${count+1} AND revision=$${count+2} RETURNING *`,values);
  if (!result.rowCount) throw new Error('Más ügyintéző időközben módosította a ticketet. Frissítsd az állapotot.');
  const updated=result.rows[0];
  await query(`INSERT INTO nexabot_web_support_messages(ticket_id,author_id,author_name,source,content) VALUES($1,$2,$3,'system',$4)`,[ticketId,actor.id,'NEXA Support',eventText]);
  await query(`INSERT INTO nexabot_web_notifications(user_id,type,title,body,link) VALUES($1,'support',$2,$3,$4)`,[ticket.user_id,`Support #${ticketId}`,eventText.slice(0,300),`/support/${ticketId}`]);
  await recordAudit('support_ticket_'+action,{actorId:actor.id,targetId:String(ticketId),metadata:{status:updated.status}});
  const channel = client.channels.cache.get(ticket.channel_id) || (ticket.channel_id ? await client.channels.fetch(ticket.channel_id).catch(() => null) : null);
  if (channel?.isTextBased()) {
    try {
      const prefix=updated.status==='closed'?'closed-web':updated.status==='pending'?'pending-web':'web';
      const desiredName=`${prefix}-${ticketId}-${safeChannelName(ticket.username||'user')}`.slice(0,100);
      if(channel.name!==desiredName)await channel.setName(desiredName,`NEXA Support #${ticketId}`);
      await postSupportControls(channel,{...updated,control_message_id:ticket.control_message_id},eventText);
    }catch(error){await query("UPDATE nexabot_web_support_tickets SET discord_state='failed' WHERE id=$1",[ticketId]);}
  } else await query("UPDATE nexabot_web_support_tickets SET discord_state='failed' WHERE id=$1",[ticketId]);
  const final=(await getWebTicket(ticketId,actor.id,true)).ticket;
  return{...final,...(final.discord_state==='failed'?{warning:'Az állapot mentve van; a Discord-kapcsolat javításra vár.'}:{})};
}
async function repairWebTicket(client,ticketId,actor) {
  await requireOperator(client,actor);
  return withTicketLease('web-repair:'+ticketId,async()=>{
  try{
  const data=await getWebTicket(ticketId,actor.id,true);
  if(!data)throw new Error('A ticket nem található.');
  if(data.ticket.status==='deleting')throw new Error('A ticket törlése folyamatban van; nem állítható helyre.');
  const {ticket}=data,guild=client.guilds.cache.get(SUPPORT_GUILD_ID);
  if(!guild)throw new Error('A Support szerver nem érhető el.');
  await guild.channels.fetch();
  let channel=guild.channels.cache.get(ticket.channel_id)||guild.channels.cache.find(c=>c.topic===`nexabot-web-support|${ticket.id}|${ticket.user_id}`);
  let recreated=false;
  if(!channel){
    recreated=true;
    const {parent,supportRole}=await ensureSupportDestination(guild);
    channel=await require('./ticket-recovery').createTicketChannel(guild,{name:`web-${ticket.id}-${safeChannelName(ticket.username)}`,type:ChannelType.GuildText,parent:parent.id,topic:`nexabot-web-support|${ticket.id}|${ticket.user_id}`,permissionOverwrites:[{id:guild.id,deny:[PermissionFlagsBits.ViewChannel]},{id:supportRole.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},{id:guild.members.me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.EmbedLinks]},...ticketOptions(getGuildConfig(SUPPORT_GUILD_ID).tickets).agentRoleIds.filter(id=>id!==supportRole.id&&guild.roles.cache.has(id)).map(id=>({id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageMessages]}))],reason:'NEXA ticket Discord-szinkron javítás'});
  }
  const moved=recreated||channel.id!==ticket.channel_id;
  if(moved){await query("UPDATE nexabot_web_support_messages SET discord_state='pending',discord_message_id=NULL WHERE ticket_id=$1 AND internal=FALSE AND source<>'system'",[ticketId]);ticket.control_message_id=null;}
  await query('UPDATE nexabot_web_support_tickets SET channel_id=$1,control_message_id=CASE WHEN $3 THEN NULL ELSE control_message_id END WHERE id=$2',[channel.id,ticketId,moved]);
  const prefix=ticket.status==='closed'?'closed-web':ticket.status==='pending'?'pending-web':'web';
  const desiredName=`${prefix}-${ticket.id}-${safeChannelName(ticket.username)}`.slice(0,100);
  if(channel.name!==desiredName)await channel.setName(desiredName,'NEXA ticket helyreállítás');
  const pending=await query("SELECT * FROM nexabot_web_support_messages WHERE ticket_id=$1 AND discord_state IN ('pending','failed') AND internal=FALSE AND source<>'system' ORDER BY id ASC LIMIT 100",[ticketId]);
  for(const row of pending.rows){
    const nonce=crypto.createHash('sha256').update(`WS:${row.id}:${channel.id}`).digest('hex').slice(0,24);
    const message=await channel.send({embeds:[replyEmbed(ticket,row)],allowedMentions:{parse:[]},nonce,enforceNonce:true});
    await query("UPDATE nexabot_web_support_messages SET discord_state='synced',discord_message_id=$1 WHERE id=$2",[message.id,row.id]);
  }
  const latest=(await getWebTicket(ticketId,actor.id,true)).ticket;
  const latestName=`${latest.status==='closed'?'closed-web':latest.status==='pending'?'pending-web':'web'}-${latest.id}-${safeChannelName(latest.username)}`.slice(0,100);if(channel.name!==latestName)await channel.setName(latestName,'NEXA ticket állapot egyeztetése');
  const message=await postSupportControls(channel,latest);
  const remaining=await query("SELECT COUNT(*)::integer AS total FROM nexabot_web_support_messages WHERE ticket_id=$1 AND discord_state IN ('pending','failed') AND internal=FALSE AND source<>'system'",[ticketId]);
  await query('UPDATE nexabot_web_support_tickets SET discord_state=$1,control_message_id=$2 WHERE id=$3',[Number(remaining.rows[0]?.total)?'failed':'synced',message.id,ticketId]);
  await recordAudit('support_ticket_sync',{actorId:actor.id,targetId:String(ticketId)});
  const result=(await getWebTicket(ticketId,actor.id,true)).ticket;return{...result,repairRemaining:Number(remaining.rows[0]?.total)||0};
  }catch(error){await query("UPDATE nexabot_web_support_tickets SET discord_state='failed' WHERE id=$1",[ticketId]).catch(()=>null);throw error;}
  });
}

async function deleteWebTicket(client,ticketId,actor,options={}){
 await requireOperator(client,actor);if(String(options.confirmation||'').trim().toUpperCase()!=='TORLES')throw Object.assign(new Error('A törléshez írd be: TORLES.'),{status:400});
 return withTicketLease('web-repair:'+ticketId,async()=>{
  const ticket=(await query('SELECT * FROM nexabot_web_support_tickets WHERE id=$1',[ticketId])).rows[0];if(!ticket)throw new Error('A ticket nem található.');
  if(ticket.status==='deleted')return ticket;
  if(!['closed','deleting'].includes(ticket.status))throw new Error('A ticketet törlés előtt le kell zárni.');
  const revision=options.revision==null?ticket.revision:Number(options.revision);if(revision!==ticket.revision)throw new Error('A ticket megváltozott. Frissítsd az állapotot.');
  const reserved=await query("UPDATE nexabot_web_support_tickets SET status='deleting',revision=revision+1,updated_at=NOW() WHERE id=$1 AND revision=$2 AND status IN('closed','deleting') RETURNING id",[ticketId,revision]);if(!reserved.rowCount)throw new Error('A ticket időközben megváltozott.');
  try{
   let channel=ticket.channel_id?client.channels.cache.get(ticket.channel_id):null;
   if(!channel&&ticket.channel_id)try{channel=await client.channels.fetch(ticket.channel_id);}catch(error){if(Number(error.code)!==10003)throw error;}
   if(channel){if(channel.guild?.id!==SUPPORT_GUILD_ID||channel.topic!==`nexabot-web-support|${ticket.id}|${ticket.user_id}`)throw new Error('A csatorna nem a megadott Support tickethez tartozik.');try{await channel.delete('NEXA: megerősített staff tickettörlés');}catch(error){if(Number(error.code)!==10003)throw error;}}
  }catch(error){await query("UPDATE nexabot_web_support_tickets SET status='closed',discord_state='failed',revision=revision+1,updated_at=NOW() WHERE id=$1 AND status='deleting'",[ticketId]);throw new Error('A törlés nem sikerült; a ticket megmaradt. '+error.message);}
  let deleted;try{deleted=(await query("UPDATE nexabot_web_support_tickets SET status='deleted',channel_id=NULL,control_message_id=NULL,discord_state='synced',revision=revision+1,updated_at=NOW() WHERE id=$1 RETURNING *",[ticketId])).rows[0];}catch(error){return{...ticket,status:'deleting',warning:'A csatorna törölve; az adatbázis törlési állapotát ellenőrizni kell.'};}
  try{await recordAudit('support_ticket_delete',{actorId:actor.id,targetId:String(ticketId),metadata:{archived:true,previousChannelId:ticket.channel_id}});}catch(error){return{...deleted,warning:'A ticket törölve; az auditnapló írása nem sikerült.'};}return deleted;
 });
}

async function handleDiscordSupportInteraction(interaction) {
  const match=String(interaction.customId||'').match(/^websupport_(claim|unclaim|pending|close|reopen|priority|delete|close_submit|priority_submit|delete_submit):(\d+)$/);
  if(!match)return false;
  let allowed=interaction.guildId===SUPPORT_GUILD_ID;
  if(allowed){try{await requireOperator(interaction.client,interaction.user);}catch{allowed=false;}}
  if(!allowed) {
    await interaction.reply({content:'Ezeket a gombokat a hivatalos NEXA Support staff használhatja.',flags:MessageFlags.Ephemeral});return true;
  }
  const operation=match[1],id=match[2];
  if(operation==='delete'){const modal=new ModalBuilder().setCustomId(`websupport_delete_submit:${id}`).setTitle('Lezárt ticket törlése').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('value').setLabel('Megerősítés: írd be, hogy TORLES').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(6)));await interaction.showModal(modal);return true;}
  if(operation==='close'||operation==='priority') {
    const modal=new ModalBuilder().setCustomId(`websupport_${operation}_submit:${id}`).setTitle(operation==='close'?'Ticket lezárása':'Ticket prioritása');
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('value').setLabel(operation==='close'?'Lezárás indoka':'low / normal / high / urgent').setStyle(operation==='close'?TextInputStyle.Paragraph:TextInputStyle.Short).setRequired(operation!=='close'||ticketOptions(getGuildConfig(SUPPORT_GUILD_ID).tickets).requireCloseReason).setMaxLength(operation==='close'?1000:10)));
    await interaction.showModal(modal);return true;
  }
  await interaction.deferReply({flags:MessageFlags.Ephemeral});
  try {
    const supplied=operation.endsWith('_submit')?interaction.fields.getTextInputValue('value').trim():'';
    const map={delete_submit:['delete',''],claim:['claim',''],unclaim:['unclaim',''],pending:['status','pending'],reopen:['status','open'],close_submit:['status','closed'],priority_submit:['priority',supplied.toLowerCase()]};
    const [action,value]=map[operation];
    const current=await getWebTicket(id,interaction.user.id,true);
    if(!current||current.ticket.channel_id!==interaction.channelId)throw new Error('Ez a gomb másik tickethez tartozik.');
    const updated=await manageWebTicket(interaction.client,id,interaction.user,action,value,{reason:supplied,confirmation:supplied});
    await interaction.editReply(updated.warning?`⚠️ Ticket #${id}: ${updated.status}. ${updated.warning}`:`✅ Ticket #${id}: ${updated.status}. A webes nézet automatikusan frissül.`);
  }catch(error){await interaction.editReply(`❌ ${error.message}`);}
  return true;
}

async function addInternalNote(ticketId, actor, content) {
  if (!isBotOwner(actor?.id)) throw new Error('Belső webes jegyzetet csak a fő owner írhat.');
  await query(`INSERT INTO nexabot_web_support_messages (ticket_id, author_id, author_name, source, content, internal) VALUES ($1,$2,$3,'owner',$4,TRUE)`, [ticketId, actor.id, actor.username, content]);
  await query('UPDATE nexabot_web_support_tickets SET updated_at=NOW() WHERE id=$1', [ticketId]);
}

async function rateWebTicket(ticketId, userId, rating, comment = '') {
  if(!ticketOptions(getGuildConfig(SUPPORT_GUILD_ID).tickets).ratingEnabled)throw new Error('Az ügyfélértékelés ki van kapcsolva.');
  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error('Az értékelés 1 és 5 közötti egész szám legyen.');
  const result = await query("UPDATE nexabot_web_support_tickets SET rating=$1, rating_comment=$2, updated_at=NOW() WHERE id=$3 AND user_id=$4 AND status='closed' AND rating IS NULL RETURNING id", [score, String(comment).slice(0, 1000), ticketId, userId]);
  if (!result?.rowCount) throw new Error('Csak lezárt saját ticket értékelhető.');
}

async function listNotifications(userId) {
  const result = await query('SELECT * FROM nexabot_web_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [userId]);
  return result?.rows || [];
}

async function markNotificationsRead(userId) {
  await query('UPDATE nexabot_web_notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL', [userId]);
}

async function captureDiscordSupportReply(message) {
  if(message.guild?.id!==SUPPORT_GUILD_ID||message.author.bot)return;
  const match=String(message.channel.topic||'').match(/^nexabot-web-support\|(\d+)\|(\d{16,22})$/);
  if(!match||!message.member||!(message.member.permissions.has(PermissionFlagsBits.ManageMessages)||isTicketStaff(message.member)))return;
  const attachments=[...(message.attachments?.values()||[])].filter(file=>/^https:\/\//i.test(file.url||'')).slice(0,5).map(file=>`${file.name||'Melléklet'}: ${file.url}`);
  const content=[String(message.content||'').trim(),...attachments].filter(Boolean).join('\n').slice(0,4000);
  if(!content)return;
  const inserted=await query(`INSERT INTO nexabot_web_support_messages(ticket_id,author_id,author_name,source,content,discord_message_id)
    SELECT id,$2,$3,'discord',$4,$5 FROM nexabot_web_support_tickets WHERE id=$1 AND channel_id=$6 AND user_id=$7 AND status IN('open','pending')
    ON CONFLICT(discord_message_id) WHERE discord_message_id IS NOT NULL DO NOTHING RETURNING id`,[match[1],message.author.id,message.author.username,content,message.id,message.channel.id,match[2]]);
  if(!inserted.rowCount)return;
  await query('UPDATE nexabot_web_support_tickets SET updated_at=NOW(),first_response_at=COALESCE(first_response_at,NOW()) WHERE id=$1',[match[1]]);
  await query(`INSERT INTO nexabot_web_notifications(user_id,type,title,body,link) VALUES($1,'support',$2,$3,$4)`,[match[2],`NEXA Support #${match[1]}`,content.slice(0,300),`/support/${match[1]}`]);
}

module.exports = { replyEmbed, postSupportControls, ticketMetrics, repairWebTicket, requireOperator, listWebTickets, listAllWebTickets, getWebTicket, createWebTicket, addWebReply, manageWebTicket, handleDiscordSupportInteraction, supportControls, addInternalNote, rateWebTicket, listNotifications, markNotificationsRead, captureDiscordSupportReply, normalizePriority };

module.exports.deleteWebTicket=deleteWebTicket;
