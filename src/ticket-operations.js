const crypto=require('node:crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');
const { dbQuery, getGuildConfig, isBotOwner, moduleEnabled } = require('./config');
const { baseEmbed, isStaff, safeChannelName } = require('./utils');
const { saveTranscript } = require('./transcripts');
const { recordAudit } = require('./telemetry');
const { SUPPORT_GUILD_ID } = require('./constants');
const { ticketOptions, priorityValue } = require('./workflow-options');
const { ticketManagement,ticketControls } = require('./panels');
const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
async function query(sql, values) {
  const result = await dbQuery(sql, values);
  if (!result) throw new Error('A ticketadatbázis nem érhető el. Próbáld újra később.');
  return result;
}
async function withTicketLease(scope,action){
 const token=crypto.randomUUID(),lock=await query("INSERT INTO nexabot_ticket_open_locks(scope_key,lease_token,expires_at) VALUES($1,$2,NOW()+INTERVAL '5 minutes') ON CONFLICT(scope_key) DO UPDATE SET lease_token=EXCLUDED.lease_token,expires_at=EXCLUDED.expires_at WHERE nexabot_ticket_open_locks.expires_at<NOW() RETURNING scope_key",[scope,token]);
 if(!lock.rowCount)throw new Error('A ticket helyreállítása már folyamatban van. Várd meg az eredményt.');
 try{return await action();}finally{await query('DELETE FROM nexabot_ticket_open_locks WHERE scope_key=$1 AND lease_token=$2',[scope,token]).catch(()=>null);}
}
async function syncGenericTicket(channel,ticket){return withTicketLease('generic-repair:'+ticket.guild_id+':'+ticket.id,async()=>{
 ticket=(await query('SELECT * FROM nexabot_tickets WHERE id=$1 AND guild_id=$2',[ticket.id,ticket.guild_id])).rows[0];if(!ticket||ticket.channel_id!==channel.id||ticket.status==='deleted')throw new Error('A ticketcsatorna időközben megváltozott.');
 const policy=ticketOptions(getGuildConfig(ticket.guild_id).tickets),closed=ticket.status==='closed',blocked=closed||ticket.locked,problems=[];
 try{await channel.permissionOverwrites.edit(ticket.owner_id,{ViewChannel:true,ReadMessageHistory:true,SendMessages:!blocked,AttachFiles:!blocked});}catch(error){problems.push('Jogosultság: '+error.message);}
 try{
  const config=getGuildConfig(ticket.guild_id),next=policy.categoryRoleIds[ticket.category]?.length?policy.categoryRoleIds[ticket.category]:[config.roles.staff,...policy.agentRoleIds].filter(Boolean),previous=ticket.agent_role_ids||[config.roles.staff,...policy.agentRoleIds].filter(Boolean);
  for(const roleId of previous)if(!next.includes(roleId)&&![ticket.owner_id,channel.guild.id,channel.guild.members.me?.id].includes(roleId)&&channel.permissionOverwrites.cache?.has(roleId))await channel.permissionOverwrites.delete(roleId);
  for(const roleId of next)if(roleId!==channel.guild.id&&channel.guild.roles.cache.has(roleId))await channel.permissionOverwrites.edit(roleId,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});
  await query('UPDATE nexabot_tickets SET agent_role_ids=$1 WHERE id=$2',[JSON.stringify(next),ticket.id]);
 }catch(error){problems.push('Kategóriajogosultság: '+error.message);}
 const name=closed?'lezart-'+channel.name.replace(/^lezart-/,''):channel.name.replace(/^lezart-/,'');
 if(name!==channel.name)try{await channel.setName(name.slice(0,100));}catch(error){problems.push('Csatornanév: '+error.message);}
 try{
  let message=null;if(ticket.control_message_id){try{message=await channel.messages.fetch(ticket.control_message_id);}catch(error){if(Number(error.code)!==10008)throw error;}}
  const components=[ticketControls(getGuildConfig(ticket.guild_id).language,ticket.guild_id),ticketExtraControls(ticket.status,policy)];
  if(message?.author?.id===channel.guild.members.me?.id&&!ticket.form_data?.content&&message.embeds?.length){const original=message.embeds.map(e=>(e.toJSON?e.toJSON():e).description||'').filter(Boolean).join('\n\n');if(original){ticket.form_data={...ticket.form_data,content:original};await query("UPDATE nexabot_tickets SET form_data=$1 WHERE id=$2",[ticket.form_data,ticket.id]);}}
  await require('./next-design').load(ticket.guild_id);const payload=require('./next-design').ticket(ticket,channel.guild,components);
  if(message&&message.author?.id===channel.guild.members.me?.id)await message.edit(require('./next-design').prepareEdit(message,payload,ticket.guild_id));
  else{const nonce=crypto.createHash('sha256').update('ticket-controls:'+ticket.id+':'+channel.id+':'+(ticket.control_message_id||'new')).digest('hex').slice(0,24);message=await channel.send({...payload,nonce,enforceNonce:true});}
  await query('UPDATE nexabot_tickets SET control_message_id=$1 WHERE id=$2',[message.id,ticket.id]);
 }catch(error){problems.push('Vezérlőpanel: '+error.message);}
 await query('UPDATE nexabot_tickets SET discord_state=$1 WHERE id=$2',[problems.length?'failed':'synced',ticket.id]);
 return{synced:!problems.length,warning:problems.length?'Az ügy mentve van; a Discord-helyreállítás javításra vár. '+problems.join(' · ').slice(0,500):null};
});}
function ticketExtraControls(status = 'open', options = {}) {
  const policy=ticketOptions(options);
  return new ActionRowBuilder().addComponents(
    status==='closed'?new ButtonBuilder().setCustomId('ticket_delete').setLabel('Ticket törlése').setStyle(ButtonStyle.Danger):new ButtonBuilder().setCustomId('ticket_priority').setLabel('Prioritás').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('Visszaadás / Unclaim').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Újranyitás').setStyle(ButtonStyle.Success).setDisabled(status !== 'closed'),
    new ButtonBuilder().setCustomId('ticket_rate').setLabel('Értékelés').setStyle(ButtonStyle.Secondary).setDisabled(status !== 'closed'||!policy.ratingEnabled),
    new ButtonBuilder().setCustomId('ticket_sync').setLabel('Javítás').setStyle(ButtonStyle.Secondary)
  );
}
function form(customId, title, inputs) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  for (const input of inputs) modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(input.id).setLabel(input.label).setStyle(input.paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(input.required !== false).setMaxLength(input.max || 1000)));
  return modal;
}
function ticketOpeningModal(type,mode,policy){return form(`ticket_open:${type}:${mode}`,'NEXA • Új ügy',[
  {id:'subject',label:'Az ügy tárgya',max:100},{id:'content',label:'Részletek / lépések / érintettek',paragraph:true,max:3000},
  {id:'priority',label:'Prioritás: low / normal / high / urgent',max:10,required:false},
  ...policy.questions.map((question,index)=>({id:question.id,label:`Kiegészítő válasz ${index+1}`,required:question.required,paragraph:true,max:1000}))
]);}
function ticketQuestionPrompt(type,policy,language){const hu=language!=='en',embed=baseEmbed(hu?'NEXA · Ügy megnyitása':'NEXA · Open a case',hu?'A kérdések teljes szövege itt látható. A válaszűrlapban külön válaszmezőt találsz mindegyikhez.':'Read every question in full here. The form has a separate answer field for each one.');embed.addFields(policy.questions.map((q,i)=>({name:`${i+1}. ${hu?'Kérdés':'Question'}`,value:String(q.label).slice(0,1000)})));return embed;}
function isTicketStaff(member,category=null) {
  const categoryRoles=member?.guild?.id&&category?ticketOptions(getGuildConfig(member.guild.id).tickets).categoryRoleIds[category]:null;
  if(categoryRoles?.length)return Boolean(member&&(isBotOwner(member.id)||member.id===member.guild.ownerId||member.permissions?.has(require('discord.js').PermissionFlagsBits.ManageGuild)||categoryRoles.some(id=>member.roles.cache.has(id))));
  return Boolean(member&&(isBotOwner(member.id)||isStaff(member)||ticketOptions(getGuildConfig(member.guild.id).tickets).agentRoleIds.some(id=>member.roles.cache.has(id))));
}
async function ticketActor(interaction) {
  const member = await interaction.guild.members.fetch({ user: interaction.user.id, force: true }).catch(() => null);
  if (!member) throw new Error('A szervertagságod nem ellenőrizhető.');
  return { member, staff: isTicketStaff(member) };
}
async function getTicket(interaction) {
  const result = await query('SELECT * FROM nexabot_tickets WHERE guild_id=$1 AND channel_id=$2', [interaction.guildId, interaction.channelId]);
  if (!result.rows[0]||(result.rows[0].status==='deleted'||result.rows[0].status==='deleting'&&interaction.customId!=='ticket_delete_submit')) throw new Error('Ez a csatorna nem aktív NEXA-ticket, vagy törlése folyamatban van.');
  return result.rows[0];
}
async function handleTicketOperations(interaction, createTicket) {
  const id = String(interaction.customId || '');
  let type;
  if (['ticket_category_select', 'support_ticket_category_select'].includes(id)) type = interaction.values?.[0];
  if (['ticket_support', 'center_ticket', 'support_ticket_open'].includes(id)) type = 'support';
  if (type) {
    const config = getGuildConfig(interaction.guildId), policy=ticketOptions(config.tickets);
    if (!moduleEnabled(interaction.guildId, 'tickets')) { await interaction.reply({ content: 'A ticketmodul ki van kapcsolva.', flags: MessageFlags.Ephemeral }); return true; }
    const mode=['support_ticket_category_select','support_ticket_open'].includes(id)?'gateway':'guild';
    if(mode==='gateway'&&interaction.guildId!==SUPPORT_GUILD_ID||mode==='guild'&&type!=='order'&&!config.tickets.enabledTypes.includes(type)){await interaction.reply({content:'Ez a ticket-típus jelenleg nem használható ezen a szerveren.',flags:MessageFlags.Ephemeral});return true;}
    if(policy.questions.length){await interaction.reply({embeds:[ticketQuestionPrompt(type,policy,config.language)],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`ticket_begin:${type}:${mode}`).setLabel(config.language==='en'?'Continue to form':'Tovább az űrlaphoz').setStyle(ButtonStyle.Primary))],flags:MessageFlags.Ephemeral});return true;}
    await interaction.showModal(ticketOpeningModal(type,mode,policy));
    return true;
  }
  const begin=id.match(/^ticket_begin:([a-z][a-z0-9_-]{0,31}):(gateway|guild)$/);
  if(begin){const config=getGuildConfig(interaction.guildId),policy=ticketOptions(config.tickets);if(!moduleEnabled(interaction.guildId,'tickets')||begin[2]==='gateway'&&interaction.guildId!==SUPPORT_GUILD_ID||begin[2]==='guild'&&begin[1]!=='order'&&!config.tickets.enabledTypes.includes(begin[1])){await interaction.reply({content:'Ez a ticket-típus már nem használható.',flags:MessageFlags.Ephemeral});return true;}await interaction.showModal(ticketOpeningModal(begin[1],begin[2],policy));return true;}
  const opening = id.match(/^ticket_open:([a-z][a-z0-9_-]{0,31}):(gateway|guild)$/);
  if (opening) {
    const subject = interaction.fields.getTextInputValue('subject').trim(), content = interaction.fields.getTextInputValue('content').trim();
    const priority = priorityValue(interaction.fields.getTextInputValue('priority')||'normal');
    const extra={};for(const question of ticketOptions(getGuildConfig(interaction.guildId).tickets).questions) {
      const value=interaction.fields.getTextInputValue(question.id).trim();
      if(question.required&&!value){await interaction.reply({content:'Hiányzó mező: '+question.label,flags:MessageFlags.Ephemeral});return true;}
      extra[question.label]=value.slice(0,1000);
    }
    if (subject.length < 3 || content.length < 5 || !PRIORITIES.has(priority) || opening[2] === 'gateway' && interaction.guildId !== SUPPORT_GUILD_ID) {
      await interaction.reply({ content: 'Adj meg értelmes tárgyat, részletes leírást és érvényes prioritást.', flags: MessageFlags.Ephemeral }); return true;
    }
    await createTicket(interaction, opening[1], [{ name: 'Tárgy', value: subject }, { name: 'Leírás', value: content.slice(0, 1000) }, { name: 'Prioritás', value: priority.toUpperCase() }], { supportGateway: opening[2] === 'gateway', metadata: { subject, content, priority, extra } });
    return true;
  }
  const supported = ['ticket_delete','ticket_delete_submit','ticket_claim', 'ticket_unclaim', 'ticket_close', 'ticket_close_confirm', 'ticket_priority', 'ticket_reopen', 'ticket_rate', 'ticket_status', 'ticket_close_submit', 'ticket_priority_submit', 'ticket_rate_submit', 'ticket_sync', 'ticket_pending', 'ticket_assign', 'ticket_assign_submit', 'ticket_note', 'ticket_note_submit', 'ticket_notes', 'ticket_events', 'ticket_manage', 'ticket_reply_select','ticket_rename','ticket_rename_submit','ticket_user_add','ticket_user_remove'];
  if (!supported.includes(id)) return false;
  if(id==='ticket_delete'){await interaction.showModal(form('ticket_delete_submit','Lezárt ticket törlése',[{id:'value',label:'Megerősítés: írd be, hogy TORLES',max:6}]));return true;}
  if (['ticket_close', 'ticket_close_confirm', 'ticket_priority', 'ticket_rate','ticket_assign','ticket_note','ticket_rename'].includes(id)) {
    // The modal itself exposes no ticket data. Submission rechecks current membership and record access.
    const options = id==='ticket_rename'?['ticket_rename_submit','Ticket átnevezése',[{id:'ticket_new_name',label:'Új csatornanév',max:80}]]
      : id==='ticket_assign'?['ticket_assign_submit','Felelős kijelölése',[{id:'value',label:'Ügyintéző Discord-ID-je',max:22}]]
      : id==='ticket_note'?['ticket_note_submit','Belső staff-jegyzet',[{id:'value',label:'Jegyzet • csak ticket-staff láthatja',paragraph:true,max:3000}]]
      : id === 'ticket_priority' ? ['ticket_priority_submit','Ticket prioritása',[{id:'value',label:'low / normal / high / urgent',max:10}]]
      : id === 'ticket_rate' ? ['ticket_rate_submit','Ticket értékelése',[{id:'value',label:'Értékelés: 1–5',max:1},{id:'comment',label:'Megjegyzés',paragraph:true,required:false,max:1000}]]
      : ['ticket_close_submit','Ticket lezárása',[{id:'value',label:'Lezárás indoka',paragraph:true,max:1000,required:ticketOptions(getGuildConfig(interaction.guildId).tickets).requireCloseReason}]];
    await interaction.showModal(form(...options)); return true;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const { member: actorMember } = await ticketActor(interaction), ticket = await getTicket(interaction), staff=isTicketStaff(actorMember,ticket.category), own = ticket.owner_id === interaction.user.id, policy=ticketOptions(getGuildConfig(interaction.guildId).tickets);
    if(interaction.expectedRevision!==undefined&&Number(interaction.expectedRevision)!==ticket.revision)throw new Error('A ticket időközben megváltozott. Frissítsd az oldalt.');
    if (!staff && !own) throw new Error('Ehhez a tickethez nincs hozzáférésed.');
    if (id === 'ticket_status') {
      const statusEmbed=baseEmbed(`NEXA ügy #${ticket.id}`, `**Tárgy:** ${ticket.subject || ticket.category}\n**Állapot:** ${ticket.status}\n**Prioritás:** ${ticket.priority}\n**Felelős:** ${ticket.claimed_by ? '<@'+ticket.claimed_by+'>' : 'Nincs kijelölve'}\n**Lezárás indoka:** ${ticket.close_reason || '—'}\n**Értékelés:** ${ticket.rating ? ticket.rating+'/5' : '—'}`);
      const original=String(ticket.form_data?.content||'').slice(0,3000);for(let i=0;i<original.length;i+=1000)statusEmbed.addFields({name:'Ügyfél leírása • '+(i/1000+1),value:original.slice(i,i+1000)});
      for(const [label,value]of Object.entries(ticket.form_data?.extra||{}).slice(0,2)){if(value)statusEmbed.addFields({name:label.slice(0,45),value:String(value).slice(0,1000)});}
      await interaction.editReply({embeds:[statusEmbed],allowedMentions:{parse:[]}});return true;
    }
    if (id === 'ticket_rate_submit') {
      const score = Number(interaction.fields.getTextInputValue('value'));
      if (!policy.ratingEnabled || !own || ticket.status !== 'closed' || !Number.isInteger(score) || score < 1 || score > 5) throw new Error('Lezárt saját ticketet értékelhetsz 1–5 között.');
      const saved = await query("UPDATE nexabot_tickets SET rating=$1,rating_comment=$2 WHERE guild_id=$3 AND channel_id=$4 AND owner_id=$5 AND status='closed' AND rating IS NULL RETURNING id", [score,interaction.fields.getTextInputValue('comment').slice(0,1000),interaction.guildId,interaction.channelId,interaction.user.id]);
      if (!saved.rowCount) throw new Error('Ezt a ticketet már értékelted, vagy időközben megváltozott.');
      await interaction.editReply('✅ Köszönjük az értékelést.'); return true;
    }
    if (!staff && !(own&&id==='ticket_close_submit'&&policy.allowCreatorClose) && !(own&&id==='ticket_reopen'&&policy.allowCreatorReopen)) throw new Error('Ehhez staff-jogosultság szükséges.');
    if(id==='ticket_delete_submit'){if(interaction.fields.getTextInputValue('value').trim().toUpperCase()!=='TORLES')throw new Error('A törléshez írd be: TORLES.');const result=await deleteGenericTicket(interaction,ticket);await interaction.editReply(result.warning?'⚠️ '+result.warning:'✅ A ticketcsatorna törölve; az archív előzmény megmaradt.').catch(()=>null);return true;}
    if(id==='ticket_rename_submit') {
      const requested=interaction.fields.getTextInputValue('ticket_new_name').trim();if(!requested)throw new Error('Adj meg csatornanevet.');
      const name=safeChannelName(requested).replace(/^lezart-/,'');await interaction.channel.setName((ticket.status==='closed'?'lezart-':'')+name);
      await recordAudit('ticket_rename',{actorId:interaction.user.id,guildId:interaction.guildId,targetId:interaction.channelId,metadata:{name}});await interaction.editReply('✅ A ticket új neve mentve.');return true;
    }
    if(id==='ticket_user_add'||id==='ticket_user_remove') {
      const target=String(interaction.values?.[0]||''),add=id.endsWith('_add');if(!/^\d{16,22}$/.test(target))throw new Error('Érvénytelen Discord-ID.');
      if(!add&&(target===ticket.owner_id||target===interaction.guild.members.me?.id||isBotOwner(target)))throw new Error('A létrehozó, a fő owner és a bot nem távolítható el.');
      if(add){const member=await interaction.guild.members.fetch({user:target,force:true}).catch(()=>null);if(!member||member.user.bot)throw new Error('A résztvevő legyen tag ezen a szerveren.');await interaction.channel.permissionOverwrites.edit(target,{ViewChannel:true,SendMessages:ticket.status!=='closed',ReadMessageHistory:true,AttachFiles:ticket.status!=='closed'});}
      else await interaction.channel.permissionOverwrites.delete(target);
      await recordAudit(id,{actorId:interaction.user.id,guildId:interaction.guildId,targetId:target,metadata:{channelId:interaction.channelId}});await interaction.editReply(add?'✅ Résztvevő hozzáadva.':'✅ A külön résztvevői jogosultság visszavonva.');return true;
    }
    if(id==='ticket_manage') {
      const panel=ticketManagement(getGuildConfig(interaction.guildId).language);
      panel.components.push(new ActionRowBuilder().addComponents(...[['ticket_pending','Várakoztatás'],['ticket_assign','Felelős'],['ticket_note','Belső jegyzet'],['ticket_notes','Jegyzetek'],['ticket_events','Előzmények']].map(([key,label])=>new ButtonBuilder().setCustomId(key).setLabel(label).setStyle(ButtonStyle.Secondary))));
      if(policy.quickReplies.length)panel.components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_reply_select').setPlaceholder('Gyors válasz küldése…').addOptions(policy.quickReplies.map((item,index)=>({label:item.title,value:String(index)})))));
      await interaction.editReply(panel);return true;
    }
    if(id==='ticket_note_submit') {
      const content=interaction.fields.getTextInputValue('value').trim();if(!content||content.length>3000)throw new Error('A jegyzet 1–3000 karakter legyen.');
      await query('INSERT INTO nexabot_ticket_notes(ticket_id,author_id,content) VALUES($1,$2,$3)',[ticket.id,interaction.user.id,content]);
      await interaction.editReply('✅ Belső staff-jegyzet mentve. Az ügyfél nem látja.');return true;
    }
    if(id==='ticket_notes'||id==='ticket_events') {
      const records=await query(id==='ticket_notes'?'SELECT * FROM nexabot_ticket_notes WHERE ticket_id=$1 ORDER BY id DESC LIMIT 15':'SELECT * FROM nexabot_ticket_events WHERE ticket_id=$1 ORDER BY revision DESC LIMIT 15',[ticket.id]);
      const content=records.rows.map(row=>id==='ticket_notes'?`<@${row.author_id}> • ${row.content}`:`r${row.revision} • <@${row.actor_id}> • ${row.snapshot.status} • ${row.snapshot.priority}`).join('\n\n').slice(0,3900);
      await interaction.editReply({embeds:[baseEmbed(id==='ticket_notes'?'Belső staff-jegyzetek':'Ticketelőzmények',content||'Még nincs bejegyzés.')],allowedMentions:{parse:[]}});return true;
    }
    if(id==='ticket_reply_select') {
      if(ticket.status==='closed')throw new Error('A lezárt ticketet előbb nyisd újra.');
      const key=String(interaction.values?.[0]||'');if(!/^\d$/.test(key)||!policy.quickReplies[Number(key)])throw new Error('Ez a gyorsválasz már nem érhető el.');
      const reply=policy.quickReplies[Number(key)];await interaction.channel.send({embeds:[baseEmbed(reply.title,reply.content)],allowedMentions:{parse:[]},nonce:`TQR${interaction.id}`,enforceNonce:true});
      await interaction.editReply('✅ Gyors válasz elküldve.');return true;
    }
    if(id==='ticket_sync') {
      const result=await syncGenericTicket(interaction.channel,ticket);
      await recordAudit('ticket_sync',{actorId:interaction.user.id,guildId:interaction.guildId,targetId:interaction.channelId});
      await interaction.editReply(result.warning?'⚠️ '+result.warning:'✅ A ticket csatornaállapota és vezérlői helyreállítva.');return true;
    }
    let update, params = [], text;
    if (id === 'ticket_claim') {
      if (ticket.status === 'closed') throw new Error('Lezárt ügyet előbb nyiss újra.');
      if (ticket.claimed_by && ticket.claimed_by !== interaction.user.id) throw new Error('Ezt az ügyet már másik stafftag felvette.');
      update='claimed_by=$1';params=[interaction.user.id];text=`${interaction.user} felvette az ügyet.`;
    } else if (id === 'ticket_unclaim') {
      if (ticket.claimed_by !== interaction.user.id && !isBotOwner(interaction.user.id)) throw new Error('Csak a saját ügyedet adhatod vissza.');
      update='claimed_by=NULL';text=`${interaction.user} visszaadta az ügyet.`;
    } else if(id==='ticket_pending') {
      if(ticket.status==='closed')throw new Error('A lezárt ticketet előbb nyisd újra.');
      update="status='pending'";text='Az ügy várakozik a következő válaszra.';
    } else if(id==='ticket_assign_submit') {
      const target=interaction.fields.getTextInputValue('value').trim();if(!/^\d{16,22}$/.test(target))throw new Error('Érvénytelen Discord-ID.');
      const member=await interaction.guild.members.fetch({user:target,force:true}).catch(()=>null);
      if(!member||member.user.bot||!isTicketStaff(member,ticket.category))throw new Error('A kijelölt személynek ticket-staff jogosultság kell.');
      update='claimed_by=$1';params=[target];text=`Felelős kijelölve: <@${target}>.`;
    } else if (id === 'ticket_priority_submit') {
      const priority=priorityValue(interaction.fields.getTextInputValue('value'));
      if (!PRIORITIES.has(priority)) throw new Error('Érvénytelen prioritás.');
      update='priority=$1';params=[priority];text=`Prioritás: **${priority.toUpperCase()}**.`;
    } else if (id === 'ticket_reopen') {
      if (ticket.status !== 'closed') throw new Error('A ticket már nyitva van.');
      update="status='open',closed_at=NULL,close_reason=NULL,archived_at=NULL";text=`${interaction.user} újranyitotta az ügyet.`;
    } else {
      if (ticket.status === 'closed') throw new Error('A ticket már le van zárva.');
      const reason=interaction.fields.getTextInputValue('value').trim()||(!policy.requireCloseReason?'Lezárva az ügyintéző által.':'');
      if (reason.length < 3 || reason.length > 1000) throw new Error('Adj meg 3–1000 karakteres lezárási indokot.');
      update="status='closed',closed_at=NOW(),close_reason=$1";params=[reason];text=`${interaction.user} lezárta az ügyet.\n**Indok:** ${reason}`;
    }
    const n=params.length;params.push(interaction.guildId,interaction.channelId,ticket.revision,interaction.user.id);
    const saved=await query(`UPDATE nexabot_tickets SET ${update},revision=revision+1,updated_by=$${n+4} WHERE guild_id=$${n+1} AND channel_id=$${n+2} AND revision=$${n+3} RETURNING *`,params);
    if (!saved.rowCount) throw new Error('Másik ügyintéző időközben módosította a ticketet. Próbáld újra.');
    const current=saved.rows[0];
    const warnings=[];
    try{const sync=await syncGenericTicket(interaction.channel,current);if(sync.warning)warnings.push(sync.warning);}catch(error){await query("UPDATE nexabot_tickets SET discord_state='failed' WHERE id=$1",[current.id]);warnings.push('A Discord-szinkron javításra vár: '+error.message);}
    try{await interaction.channel.send({embeds:[baseEmbed('NEXA ügy #'+ticket.id,text)],allowedMentions:{parse:[]}});}catch(error){warnings.push('Az állapotértesítés küldése nem sikerült.');}
    if(policy.transcriptOnClose&&current.status==='closed'&&id==='ticket_close_submit'){
      try{const transcript=await saveTranscript(interaction.channel);await interaction.channel.send({content:'📄 Ügyelőzmény • '+transcript.count+' üzenet',files:[transcript.attachment],allowedMentions:{parse:[]}});}catch(error){warnings.push('A ticket lezárva; a transcriptet a jogosultságok javítása után külön kell elkészíteni.');}
    }
    try{await recordAudit('ticket_operation',{actorId:interaction.user.id,guildId:interaction.guildId,targetId:interaction.channelId,metadata:{operation:id,status:current.status}});}catch(error){warnings.push('Az auditnapló írását ellenőrizni kell.');}
    await interaction.editReply(warnings.length?'⚠️ A ticketművelet mentve. '+warnings.join(' '):'✅ A ticketművelet mentve.');
  } catch(error) { await interaction.editReply(`❌ ${error.message}`); }
  return true;
}

async function deleteGenericTicket(interaction,ticket){return withTicketLease('generic-repair:'+ticket.guild_id+':'+ticket.id,async()=>{
 const {member}=await ticketActor(interaction);if(!isTicketStaff(member,ticket.category))throw new Error('Ticketet csak staff törölhet.');
 const current=(await query('SELECT * FROM nexabot_tickets WHERE id=$1 AND guild_id=$2',[ticket.id,interaction.guildId])).rows[0];
 if(!current||current.channel_id!==interaction.channelId||!['closed','deleting'].includes(current.status))throw new Error('A ticketet törlés előtt le kell zárni.');
 await saveTranscript(interaction.channel,{strict:true});
 const reserved=await query("UPDATE nexabot_tickets SET status='deleting',revision=revision+1,updated_by=$1 WHERE id=$2 AND revision=$3 AND status IN('closed','deleting') RETURNING id",[interaction.user.id,current.id,current.revision]);if(!reserved.rowCount)throw new Error('A ticket időközben megváltozott. Frissítsd az állapotot.');
 try{await interaction.channel.delete('NEXA: megerősített staff tickettörlés');}catch(error){if(Number(error.code)!==10003){await query("UPDATE nexabot_tickets SET status='closed',discord_state='failed',revision=revision+1 WHERE id=$1 AND status='deleting'",[current.id]);throw new Error('A csatorna törlése nem sikerült; a ticket megmaradt. '+error.message);}}
 const warnings=[];
 try{await query("UPDATE nexabot_tickets SET status='deleted',discord_state='synced',revision=revision+1 WHERE id=$1",[current.id]);}catch(error){warnings.push('A csatorna törölve; az adatbázis állapotát ellenőrizni kell.');}
 try{await recordAudit('ticket_delete',{actorId:interaction.user.id,guildId:interaction.guildId,targetId:current.channel_id,metadata:{ticketId:current.id,transcriptSaved:true}});}catch(error){warnings.push('Az auditnapló írása nem sikerült.');}
 return{deleted:true,warning:warnings.join(' ')||null};
});}

async function captureTicketFirstResponse(message) {
  if (!message.guild || message.author.bot || !String(message.channel.topic||'').startsWith('nexabot-ticket|')) return;
  const ticket=(await query('SELECT category FROM nexabot_tickets WHERE guild_id=$1 AND channel_id=$2',[message.guild.id,message.channel.id])).rows[0];if(!ticket||!isTicketStaff(message.member,ticket.category))return;
  await dbQuery("UPDATE nexabot_tickets SET first_response_at=COALESCE(first_response_at,NOW()) WHERE guild_id=$1 AND channel_id=$2 AND status IN('open','pending') AND owner_id<>$3",[message.guild.id,message.channel.id,message.author.id]);
}

module.exports = { isTicketStaff, handleTicketOperations, ticketExtraControls, captureTicketFirstResponse, ticketOpeningModal, ticketQuestionPrompt };

function buildTicketCommand(){return new SlashCommandBuilder().setName('ticket').setDescription('NEXA ticket állapota, kezelése és javítása.').setDMPermission(false).setDefaultMemberPermissions(null).addSubcommand(sub=>sub.setName('allapot').setDescription('A jelenlegi ticket állapota.')).addSubcommand(sub=>sub.setName('kezeles').setDescription('Privát staff-kezelőpanel, jegyzetek és gyors válaszok.')).addSubcommand(sub=>sub.setName('torles').setDescription('Lezárt ticket megerősített törlése staffként.')).addSubcommand(sub=>sub.setName('javitas').setDescription('Ticketjogok és vezérlők helyreállítása.'));}
async function handleTicketCommand(interaction){
 if(!interaction.guild)return interaction.reply({content:'Ticketműveletet szerveren használhatsz.',flags:MessageFlags.Ephemeral});
 const actions={allapot:'ticket_status',kezeles:'ticket_manage',javitas:'ticket_sync',torles:'ticket_delete'},customId=actions[interaction.options.getSubcommand()];
 if(!customId)return interaction.reply({content:'Ismeretlen ticketművelet.',flags:MessageFlags.Ephemeral});
 return handleTicketOperations({customId,guild:interaction.guild,guildId:interaction.guildId,user:interaction.user,channel:interaction.channel,channelId:interaction.channelId,client:interaction.client,showModal:interaction.showModal?.bind(interaction),deferReply:interaction.deferReply.bind(interaction),editReply:interaction.editReply.bind(interaction),reply:interaction.reply.bind(interaction)});
}
module.exports.buildTicketCommand=buildTicketCommand;module.exports.handleTicketCommand=handleTicketCommand;

module.exports.withTicketLease=withTicketLease;module.exports.syncGenericTicket=syncGenericTicket;

module.exports.deleteGenericTicket=deleteGenericTicket;
