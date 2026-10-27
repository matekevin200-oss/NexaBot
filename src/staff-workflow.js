const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { dbQuery } = require('./config');
const { baseEmbed, isStaff } = require('./utils');
const { recordAudit } = require('./telemetry');
const EPHEMERAL=MessageFlags.Ephemeral;
function staff(member){return Boolean(member&&(isStaff(member)||member.permissions?.has(require('discord.js').PermissionFlagsBits.ManageGuild)||member.id===member.guild?.ownerId));}
function budapestDate(value){
 const m=String(value||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);if(!m)return null;
 const [,ys,ms,ds,hs,mins]=m,y=Number(ys),mo=Number(ms),d=Number(ds),h=Number(hs),mi=Number(mins);
 const wanted=Date.UTC(y,mo-1,d,h,mi);if(new Date(wanted).getUTCFullYear()!==y||new Date(wanted).getUTCMonth()!==mo-1||new Date(wanted).getUTCDate()!==d||h>23||mi>59)return null;
 let guess=wanted;const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const parts=Object.fromEntries(fmt.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));guess+=wanted-Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute));}
 const out=new Date(guess);const shown=Object.fromEntries(fmt.formatToParts(out).map(x=>[x.type,x.value]));if(Number(shown.year)!==y||Number(shown.month)!==mo||Number(shown.day)!==d||Number(shown.hour)!==h||Number(shown.minute)!==mi)return null;return out;
}
function taskEmbed(row){const status={open:'Kiosztva',working:'Folyamatban',done:'Lezárva'}[row.status]||row.status;const fields=[{name:'Felelős',value:`<@${row.assignee_id}>`,inline:true},{name:'Állapot',value:status,inline:true},{name:'Azonosító',value:`#${row.id}`,inline:true}];if(row.due_at)fields.push({name:'Határidő',value:`<t:${Math.floor(new Date(row.due_at).getTime()/1000)}:F>`,inline:false});return baseEmbed(`📌 Staff-feladat · #${row.id}`,`**${String(row.title||'').slice(0,150)}**\n${String(row.description||'Nincs kiegészítő leírás.').slice(0,2500)}`,row.status==='done'?0x52b788:row.status==='working'?0xe0a84f:0x5474d4).addFields(fields).setFooter({text:`NEXA Task Center • r${row.revision}`}).setTimestamp(new Date(row.created_at||Date.now()));}
function taskControls(row){return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`nexa_task:${row.guild_id}:${row.id}:working`).setLabel('Átveszem').setStyle(ButtonStyle.Primary).setDisabled(row.status!=='open'),new ButtonBuilder().setCustomId(`nexa_task:${row.guild_id}:${row.id}:done`).setLabel('Készre jelölöm').setStyle(ButtonStyle.Success).setDisabled(row.status==='done'))];}
function buildCommand(){return new SlashCommandBuilder().setName('feladat').setDescription('NEXA Staff Feladatközpont.').setDMPermission(false).setDefaultMemberPermissions(null)
 .addSubcommand(s=>s.setName('kiosztas').setDescription('Feladatot ad egy tagnak határidővel. (Staff)').addUserOption(o=>o.setName('tag').setDescription('A felelős szervertag.').setRequired(true)).addStringOption(o=>o.setName('cim').setDescription('Rövid, egyértelmű feladatcím.').setRequired(true).setMaxLength(150)).addStringOption(o=>o.setName('leiras').setDescription('Teendők és elfogadási feltétel.').setRequired(true).setMaxLength(1500)).addStringOption(o=>o.setName('hatarido').setDescription('Opcionális: ÉÉÉÉ-HH-NN ÓÓ:PP, magyar idő szerint.').setMaxLength(16)))
 .addSubcommand(s=>s.setName('sajat').setDescription('Megmutatja a saját nyitott feladataidat.'))
 .addSubcommand(s=>s.setName('attekintes').setDescription('A szerver feladatainak megtekintése. (Staff)').addStringOption(o=>o.setName('allapot').setDescription('Állapot szerinti szűrés.').addChoices({name:'Minden aktív',value:'active'},{name:'Kiosztva',value:'open'},{name:'Folyamatban',value:'working'},{name:'Lezárva',value:'done'})))
 .addSubcommand(s=>s.setName('allapot').setDescription('Feladat átvétele, lezárása vagy vezetői újranyitása.').addIntegerOption(o=>o.setName('azonosito').setDescription('Feladatazonosító.').setRequired(true).setMinValue(1)).addStringOption(o=>o.setName('uj_allapot').setDescription('Új állapot.').setRequired(true).addChoices({name:'Folyamatban',value:'working'},{name:'Kész',value:'done'},{name:'Újranyitás (Staff)',value:'open'})));
}
async function getTask(guildId,id){const result=await dbQuery('SELECT * FROM nexabot_staff_tasks WHERE guild_id=$1 AND id=$2',[guildId,String(id)]);return result?.rows?.[0]||null;}
async function transition(guild,actorId,row,next,member,source){
 const elevated=staff(member);if(row.assignee_id!==actorId&&!elevated)throw new Error('Ezt a feladatot csak a felelős vagy Staff módosíthatja.');
 if(!elevated&&!(row.status==='open'&&next==='working'||row.status==='working'&&next==='done'))throw new Error('Feladatot csak átvehetsz, majd készre jelölhetsz. Újranyitáshoz Staff kell.');
 if(row.status===next)throw new Error('A feladat már ebben az állapotban van.');
 const saved=await dbQuery("UPDATE nexabot_staff_tasks SET status=$1,revision=revision+1,completed_at=CASE WHEN $1='done' THEN NOW() ELSE NULL END WHERE guild_id=$2 AND id=$3 AND revision=$4 RETURNING *",[next,guild.id,row.id,row.revision]);
 if(!saved?.rowCount)throw new Error('A feladat közben megváltozott. Frissítsd a listát.');const updated=saved.rows[0];
 await recordAudit('staff_task_status_changed',{guildId:guild.id,actorId,targetId:row.assignee_id,metadata:{taskId:String(row.id),from:row.status,to:next,source}});
 return updated;
}
async function handleCommand(i){
 if(!i.guild)return i.reply({content:'A feladatkezelő csak Discord-szerveren használható.',flags:EPHEMERAL});
 const sub=i.options.getSubcommand();
 if(sub==='kiosztas'){
  if(!staff(i.member))return i.reply({content:'❌ Feladatot kiosztani csak Staff vagy szerverkezelő jogosultsággal lehet.',flags:EPHEMERAL});
  const assignee=i.options.getUser('tag',true);if(assignee.bot)return i.reply({content:'Botnak nem lehet feladatot kiosztani.',flags:EPHEMERAL});
  const member=await i.guild.members.fetch(assignee.id).catch(()=>null);if(!member)return i.reply({content:'A felelősnek ezen a szerveren kell lennie.',flags:EPHEMERAL});
  const title=i.options.getString('cim',true).trim(),description=i.options.getString('leiras',true).trim(),rawDeadline=i.options.getString('hatarido'),dueAt=rawDeadline?budapestDate(rawDeadline):null;
  if(rawDeadline&&(!dueAt||dueAt<=new Date()||dueAt>Date.now()+90*86400000))return i.reply({content:'❌ A határidő legyen érvényes, jövőbeli budapesti időpont, legfeljebb 90 napon belül. Formátum: `2026-11-10 18:30`.',flags:EPHEMERAL});
  await i.deferReply({flags:EPHEMERAL});
  try{const result=await dbQuery('INSERT INTO nexabot_staff_tasks(guild_id,creator_id,assignee_id,title,description,due_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[i.guildId,i.user.id,assignee.id,title,description,dueAt]);if(!result?.rows?.[0])throw new Error('Az adatbázis nem érhető el.');const row=result.rows[0];await recordAudit('staff_task_created',{guildId:i.guildId,actorId:i.user.id,targetId:assignee.id,metadata:{taskId:String(row.id),title,dueAt:dueAt?.toISOString()||null}});
   let notified=true;try{await assignee.send({embeds:[taskEmbed(row)],components:taskControls(row),allowedMentions:{parse:[]}});}catch{notified=false;}
   return i.editReply({content:`✅ **Feladat #${row.id} kiosztva** ${assignee} részére.${dueAt?` Határidő: <t:${Math.floor(dueAt.getTime()/1000)}:F>.`:''}\n${notified?'A felelős privát Discord-értesítést kapott.':'A privát üzenet nem kézbesíthető; a feladat a /feladat sajat paranccsal elérhető.'}`,embeds:[taskEmbed(row)],allowedMentions:{parse:[]}});
  }catch(error){console.error('Staff task creation failed:',error);return i.editReply('❌ A feladatot nem sikerült elmenteni. Ellenőrizd az adatbázis kapcsolatát.');}
 }
 if(sub==='sajat'){
  const result=await dbQuery("SELECT * FROM nexabot_staff_tasks WHERE guild_id=$1 AND assignee_id=$2 AND status IN('open','working') ORDER BY due_at NULLS LAST,created_at DESC LIMIT 15",[i.guildId,i.user.id]);
  if(!result)return i.reply({content:'❌ A feladatlista most nem érhető el.',flags:EPHEMERAL});
  return i.reply({embeds:[baseEmbed(`📌 Saját feladataim · ${result.rows.length}`,result.rows.map(row=>`**#${row.id} · ${row.status==='working'?'Folyamatban':'Kiosztva'}** — ${row.title}${row.due_at?` · <t:${Math.floor(new Date(row.due_at).getTime()/1000)}:R>`:''}`).join('\\n')||'Nincs nyitott feladatod.',0x5474d4)],flags:EPHEMERAL});
 }
 if(sub==='attekintes'){
  if(!staff(i.member))return i.reply({content:'❌ A teljes feladatlistát csak Staff vagy szerverkezelő tekintheti meg.',flags:EPHEMERAL});
  const filter=i.options.getString('allapot')||'active',result=await dbQuery(`SELECT * FROM nexabot_staff_tasks WHERE guild_id=$1 AND ($2='active' AND status IN('open','working') OR status=$2) ORDER BY CASE WHEN status='working' THEN 0 WHEN status='open' THEN 1 ELSE 2 END,due_at NULLS LAST,created_at DESC LIMIT 20`,[i.guildId,filter]);
  if(!result)return i.reply({content:'❌ A feladatlista most nem érhető el.',flags:EPHEMERAL});
  const lines=result.rows.map(row=>`**#${row.id} · ${row.status==='working'?'Folyamatban':row.status==='done'?'Lezárva':'Kiosztva'}** — <@${row.assignee_id}>\n${row.title}${row.due_at?` · <t:${Math.floor(new Date(row.due_at).getTime()/1000)}:R>`:''}`).join('\\n')||'Nincs ilyen feladat.';
  return i.reply({embeds:[baseEmbed(`📋 Staff Feladatközpont · ${result.rows.length}`,lines,0x5474d4)],flags:EPHEMERAL,allowedMentions:{parse:[]}});
 }
 const id=i.options.getInteger('azonosito',true),next=i.options.getString('uj_allapot',true),row=await getTask(i.guildId,id);if(!row)return i.reply({content:'❌ Ezen a szerveren nem található ilyen feladat.',flags:EPHEMERAL});
 try{const updated=await transition(i.guild,i.user.id,row,next,i.member,'slash');if(i.user.id===row.assignee_id){const user=await i.client.users.fetch(row.assignee_id).catch(()=>null);await user?.send({embeds:[taskEmbed(updated)],components:taskControls(updated),allowedMentions:{parse:[]}}).catch(()=>null);}return i.reply({content:`✅ A **#${id}** feladat állapota: **${updated.status==='done'?'Lezárva':updated.status==='working'?'Folyamatban':'Újranyitva'}**.`,flags:EPHEMERAL});}catch(error){return i.reply({content:`❌ ${error.message}`,flags:EPHEMERAL});}
}
async function handleButton(i){
 const m=String(i.customId||'').match(/^nexa_task:(\d{16,22}):(\d{1,20}):(working|done)$/);if(!m)return false;
 try{const [,guildId,id,next]=m,row=await getTask(guildId,id);if(!row)throw new Error('A feladat nem található vagy már törölték.');if(row.assignee_id!==i.user.id)throw new Error('Ezt a gombot csak a kijelölt felelős használhatja.');
  const guild=i.client.guilds.cache.get(guildId)||await i.client.guilds.fetch(guildId).catch(()=>null);if(!guild)throw new Error('A feladat szervere nem érhető el.');const member=await guild.members.fetch(i.user.id).catch(()=>null);if(!member)throw new Error('A feladat kezeléséhez a kijelölt Discord-szerver tagjának kell lenned.');
  await i.deferUpdate();const updated=await transition(guild,i.user.id,row,next,member,'button');await i.message.edit({embeds:[taskEmbed(updated)],components:taskControls(updated),allowedMentions:{parse:[]}});return true;
 }catch(error){if(i.deferred||i.replied)await i.followUp({content:`❌ ${error.message}`,flags:EPHEMERAL}).catch(()=>null);else await i.reply({content:`❌ ${error.message}`,flags:EPHEMERAL}).catch(()=>null);return true;}
}
module.exports={buildCommand,handleCommand,handleButton};
