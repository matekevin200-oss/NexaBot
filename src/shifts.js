const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  SlashCommandBuilder
} = require('discord.js');
const {
  configuredChannel,
  configuredRole,
  dbQuery,
  getGuildConfig,
  moduleEnabled
} = require('./config');
const { NAMES, COLORS } = require('./constants');
const { baseEmbed, isStaff } = require('./utils');
const { recordAudit } = require('./telemetry');
const { adjustedActiveSeconds } = require('./belv-roster-rules');

const EPHEMERAL = MessageFlags.Ephemeral;
const openFallback = new Map();
const historyFallback = new Map();
const leaveFallback = new Map();
const scheduleFallback = [];
const closingShifts = new Set();

function buildShiftCommand() {
  return new SlashCommandBuilder()
    .setName('szolgalat')
    .setDescription('Szolgálat- és műszakkezelés.')
    .setDMPermission(false)
    .addSubcommand((subcommand) => subcommand
      .setName('panel')
      .setDescription('Kihelyezi a szolgálati vezérlőpanelt.'))
    .addSubcommand((subcommand) => subcommand
      .setName('kerelmek')
      .setDescription('Megnyitja a függő távolléti kérelmek vezetői paneljét.'))
    .addSubcommand((subcommand) => subcommand
      .setName('idomodositas')
      .setDescription('A megjelölt tag legutóbbi lezárt szolgálati idejének korrigálása (Staff).')
      .addUserOption((option) => option.setName('tag').setDescription('A tag, akinek a legutóbbi lezárt szolgálatát módosítod.').setRequired(true))
      .addStringOption((option) => option.setName('irany').setDescription('Hozzáadás vagy levonás.').setRequired(true).addChoices({name:'Idő hozzáadása',value:'add'},{name:'Idő levonása',value:'remove'}))
      .addIntegerOption((option) => option.setName('perc').setDescription('Korrigálandó percek száma (1–10080).').setRequired(true).setMinValue(1).setMaxValue(10080))
      .addStringOption((option) => option.setName('indok').setDescription('A korrekció indoka (kötelező).').setRequired(true).setMinLength(5).setMaxLength(500)))
    .addSubcommand((subcommand) => subcommand
      .setName('statisztika')
      .setDescription('Megmutatja a szolgálati időt és műszakokat.')
      .addUserOption((option) => option
        .setName('tag')
        .setDescription('Másik tag megtekintése Staff jogosultsággal.')))
    .addSubcommand((subcommand) => subcommand
      .setName('ranglista')
      .setDescription('Megmutatja a havi szolgálati ranglistát.'))
    .addSubcommand((subcommand) => subcommand
      .setName('naplo')
      .setDescription('Megmutatja a legutóbbi szolgálati rekordokat és azok azonosítóját.')
      .addUserOption((option) => option.setName('tag').setDescription('Másik tag rekordjait Staff jogosultsággal.'))
      .addIntegerOption((option) => option.setName('darab').setDescription('Rekordok száma (1–20).').setMinValue(1).setMaxValue(20)))
    .addSubcommand((subcommand) => subcommand
      .setName('szabadsag')
      .setDescription('Szabadság- vagy távolléti kérelmet küld.')
      .addStringOption((option) => option.setName('kezdet').setDescription('Kezdőnap: ÉÉÉÉ-HH-NN').setRequired(true).setMaxLength(10))
      .addStringOption((option) => option.setName('vege').setDescription('Utolsó nap: ÉÉÉÉ-HH-NN').setRequired(true).setMaxLength(10))
      .addStringOption((option) => option.setName('indok').setDescription('A távollét indoka.').setRequired(true).setMaxLength(1000)))
    .addSubcommand((subcommand) => subcommand
      .setName('beosztas')
      .setDescription('Műszakot oszt be egy tagnak (Staff).')
      .addUserOption((option) => option.setName('tag').setDescription('A beosztott tag.').setRequired(true))
      .addStringOption((option) => option.setName('kezdet').setDescription('ÉÉÉÉ-HH-NN ÓÓ:PP, magyar idő szerint.').setRequired(true).setMaxLength(16))
      .addStringOption((option) => option.setName('vege').setDescription('ÉÉÉÉ-HH-NN ÓÓ:PP, magyar idő szerint.').setRequired(true).setMaxLength(16))
      .addStringOption((option) => option.setName('megjegyzes').setDescription('Opcionális feladat vagy megjegyzés.').setMaxLength(1000)));
}

function shiftPanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('🕒 Nexa Shift Management')
        .setDescription('A gombokkal indíthatod, szüneteltetheted vagy lezárhatod a szolgálatodat. Minden művelet automatikusan bekerül a szolgálati naplóba.')
        .addFields(
          { name: '▶️ Kezdés', value: 'Új szolgálat indítása', inline: true },
          { name: '☕ Szünet', value: 'Szünet be- vagy kikapcsolása', inline: true },
          { name: '⏹️ Befejezés', value: 'Szolgálat lezárása', inline: true }
        )
        .setFooter({ text: 'NexaBot • Shift Management' })
    ],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shift_start').setLabel('Szolgálat kezdése').setEmoji('▶️').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shift_break').setLabel('Szünet').setEmoji('☕').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shift_end').setLabel('Befejezés').setEmoji('⏹️').setStyle(ButtonStyle.Danger)
    )]
  };
}

function shiftKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function canUseShift(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const configured = configuredRole(member.guild, 'shift', NAMES.operativeRole);
  return Boolean(configured && member.roles.cache.has(configured.id)) || isStaff(member);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours} óra ${minutes} perc`;
  return `${minutes} perc`;
}

function liveActiveSeconds(shift, now = Date.now()) {
  const elapsed=Math.max(0,Math.floor((Number(now)-new Date(shift.started_at).getTime())/1000));
  const activeBreak=shift.break_started_at?Math.max(0,Math.floor((Number(now)-new Date(shift.break_started_at).getTime())/1000)):0;
  return Math.max(0,elapsed-Number(shift.break_seconds||0)-activeBreak);
}

function budapestDate(value, dateOnly = false) {
  const match = String(value || '').trim().match(dateOnly
    ? /^(\d{4})-(\d{2})-(\d{2})$/
    : /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour = '00', minute = '00'] = match;
  const wantedUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let guess = wantedUtc;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    guess += wantedUtc - represented;
  }
  const date = new Date(guess);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function createLeaveRequest(guildId, userId, startsOn, endsOn, reason) {
  const result = await dbQuery(
    `INSERT INTO nexabot_leave_requests (guild_id, user_id, starts_on, ends_on, reason)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [guildId, userId, startsOn, endsOn, reason]
  );
  const request = { id: result?.rows[0]?.id || Date.now(), guildId, userId, startsOn, endsOn, reason, status: 'pending' };
  if (!result) leaveFallback.set(String(request.id), request);
  return request;
}

async function getLeaveRequest(guildId, id) {
  const result = await dbQuery('SELECT * FROM nexabot_leave_requests WHERE guild_id = $1 AND id = $2', [guildId, id]);
  if (result) return result.rows[0] || null;
  const request = leaveFallback.get(String(id));
  return request?.guildId === guildId ? request : null;
}

async function decideLeaveRequest(guildId, id, status, decidedBy) {
  const result = await dbQuery(
    `UPDATE nexabot_leave_requests SET status = $3, decided_by = $4
     WHERE guild_id = $1 AND id = $2 AND status = 'pending' RETURNING *`,
    [guildId, id, status, decidedBy]
  );
  if (result) return result.rows[0] || null;
  const request = leaveFallback.get(String(id));
  if (!request || request.guildId !== guildId || request.status !== 'pending') return null;
  request.status = status;
  request.decided_by = decidedBy;
  return request;
}

async function leaveReviewPanel(guildId) {
  const result = await dbQuery(
    `SELECT id, user_id, starts_on, ends_on, reason, created_at
       FROM nexabot_leave_requests
      WHERE guild_id = $1 AND status = 'pending'
      ORDER BY created_at ASC LIMIT 25`,
    [guildId]
  );
  const pending = result ? result.rows : [...leaveFallback.values()]
    .filter((request) => request.guildId === guildId && request.status === 'pending')
    .slice(0, 25);
  const embed = baseEmbed(
    '🏖️ Távolléti kérelmek · vezetői panel',
    pending.length
      ? `**${pending.length}** függő kérelem. Válassz ki egyet az adatok és a döntési gombok megnyitásához.`
      : 'Jelenleg nincs elbírálásra váró távolléti kérelem.',
    pending.length ? COLORS.warning : COLORS.success
  );
  const components = pending.length ? [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('shift_leave_review_select')
      .setPlaceholder('Válassz egy függő kérelmet…')
      .addOptions(pending.map((request) => ({
        label: `#${request.id} · ${String(request.user_id || request.userId).slice(-6)}`.slice(0, 100),
        description: `${String(request.starts_on || request.startsOn).slice(0, 10)} – ${String(request.ends_on || request.endsOn).slice(0, 10)}`.slice(0, 100),
        value: String(request.id)
      })))
  )] : [];
  return { embeds: [embed], components };
}

async function createSchedule(guildId, userId, startsAt, endsAt, note, createdBy) {
  const result = await dbQuery(
    `INSERT INTO nexabot_schedules (guild_id, user_id, starts_at, ends_at, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [guildId, userId, startsAt, endsAt, note, createdBy]
  );
  if (!result) scheduleFallback.push({ id: Date.now(), guildId, userId, startsAt, endsAt, note, createdBy });
}

async function openShift(guildId, userId) {
  const result = await dbQuery(
    `SELECT id, started_at, break_started_at, break_seconds FROM nexabot_shifts
     WHERE guild_id = $1 AND user_id = $2 AND ended_at IS NULL LIMIT 1`,
    [guildId, userId]
  );
  return result ? result.rows[0] || null : openFallback.get(shiftKey(guildId, userId)) || null;
}

async function startShift(guildId, userId) {
  const result = await dbQuery(
    `INSERT INTO nexabot_shifts (guild_id, user_id) VALUES ($1, $2)
     RETURNING id, started_at, break_started_at, break_seconds`,
    [guildId, userId]
  );
  if (result) return result.rows[0];
  const shift = { id: Date.now(), started_at: new Date(), break_started_at: null, break_seconds: 0 };
  openFallback.set(shiftKey(guildId, userId), shift);
  return shift;
}

async function toggleBreak(guildId, userId, shift) {
  const now = new Date();
  if (shift.break_started_at) {
    const extra = Math.max(0, Math.floor((now - new Date(shift.break_started_at)) / 1000));
    const total = Number(shift.break_seconds || 0) + extra;
    const result = await dbQuery(
      `UPDATE nexabot_shifts SET break_started_at = NULL, break_seconds = $2
       WHERE id = $1 RETURNING id, started_at, break_started_at, break_seconds`,
      [shift.id, total]
    );
    if (result) return { shift: result.rows[0], started: false };
    shift.break_started_at = null;
    shift.break_seconds = total;
    return { shift, started: false };
  }
  const result = await dbQuery(
    `UPDATE nexabot_shifts SET break_started_at = NOW() WHERE id = $1
     RETURNING id, started_at, break_started_at, break_seconds`,
    [shift.id]
  );
  if (result) return { shift: result.rows[0], started: true };
  shift.break_started_at = now;
  return { shift, started: true };
}

async function endShift(guildId, userId, shift) {
  const key = shiftKey(guildId, userId);
  if (closingShifts.has(key)) return { closed: false, reason: 'closing' };
  closingShifts.add(key);
  try {
  const now = new Date();
  const activeBreak = shift.break_started_at
    ? Math.max(0, Math.floor((now - new Date(shift.break_started_at)) / 1000))
    : 0;
  const breakSeconds = Number(shift.break_seconds || 0) + activeBreak;
  const totalSeconds = Math.max(0, Math.floor((now - new Date(shift.started_at)) / 1000) - breakSeconds);
  const result = await dbQuery(
    `UPDATE nexabot_shifts
     SET ended_at = NOW(), break_started_at = NULL, break_seconds = $2
     WHERE id = $1 AND guild_id = $3 AND user_id = $4 AND ended_at IS NULL
     RETURNING ended_at, started_at, break_seconds`,
    [shift.id, breakSeconds, guildId, userId]
  );
  if (result) {
    if (result.rowCount !== 1 || !result.rows?.[0]) return { closed: false, reason: 'already-closed' };
    const ended = result.rows[0];
    return {
      closed: true,
      endedAt: ended.ended_at,
      totalSeconds: Math.max(0, Math.floor((new Date(ended.ended_at).getTime() - new Date(ended.started_at).getTime()) / 1000) - Number(ended.break_seconds || 0)),
      breakSeconds: Number(ended.break_seconds || 0)
    };
  }
  const active = openFallback.get(key);
  if (!active || String(active.id) !== String(shift.id)) return { closed: false, reason: 'already-closed' };
  openFallback.delete(key);
  const history = historyFallback.get(key) || [];
  history.push({ ...active, ended_at: now, break_started_at: null, break_seconds: breakSeconds });
  historyFallback.set(key, history);
  return { closed: true, endedAt: now, totalSeconds, breakSeconds };
  } finally {
    closingShifts.delete(key);
  }
}

async function shiftStats(guildId, userId, days = 30) {
  const result = await dbQuery(
    `SELECT COUNT(*)::int AS shifts,
       COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) - break_seconds), 0)::bigint AS seconds
     FROM nexabot_shifts
     WHERE guild_id = $1 AND user_id = $2 AND ended_at IS NOT NULL
       AND started_at >= NOW() - ($3::int * INTERVAL '1 day')`,
    [guildId, userId, days]
  );
  if (result) return { shifts: Number(result.rows[0].shifts), seconds: Number(result.rows[0].seconds) };
  const since = Date.now() - days * 86_400_000;
  const rows = (historyFallback.get(shiftKey(guildId, userId)) || []).filter((item) => new Date(item.started_at).getTime() >= since);
  return {
    shifts: rows.length,
    seconds: rows.reduce((sum, item) => sum + Math.max(0, Math.floor((new Date(item.ended_at) - new Date(item.started_at)) / 1000) - Number(item.break_seconds || 0)), 0)
  };
}

async function shiftLeaderboard(guildId, limit = 10) {
  const result = await dbQuery(
    `SELECT user_id, COUNT(*)::int AS shifts,
       COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) - break_seconds), 0)::bigint AS seconds
     FROM nexabot_shifts
     WHERE guild_id = $1 AND ended_at IS NOT NULL AND started_at >= NOW() - INTERVAL '30 days'
     GROUP BY user_id ORDER BY seconds DESC LIMIT $2`,
    [guildId, limit]
  );
  if (result) return result.rows.map((row) => ({ userId: row.user_id, shifts: Number(row.shifts), seconds: Number(row.seconds) }));
  const totals = [];
  for (const [key, rows] of historyFallback) {
    if (!key.startsWith(`${guildId}:`)) continue;
    const userId = key.split(':')[1];
    const recent = rows.filter((item) => new Date(item.started_at).getTime() >= Date.now() - 30 * 86_400_000);
    totals.push({
      userId,
      shifts: recent.length,
      seconds: recent.reduce((sum, item) => sum + Math.max(0, Math.floor((new Date(item.ended_at) - new Date(item.started_at)) / 1000) - Number(item.break_seconds || 0)), 0)
    });
  }
  return totals.sort((a, b) => b.seconds - a.seconds).slice(0, limit);
}

async function listShiftRecords(guildId, options = {}) {
  const limit = Math.min(250, Math.max(1, Number.parseInt(options.limit, 10) || 100));
  const userId = /^\d{16,22}$/.test(String(options.userId || '')) ? String(options.userId) : null;
  const result = await dbQuery(
    `SELECT id, guild_id, user_id, started_at, ended_at, break_started_at, break_seconds,
            GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at) - (break_seconds * INTERVAL '1 second') - CASE WHEN break_started_at IS NULL THEN INTERVAL '0 seconds' ELSE NOW() - break_started_at END))::bigint) AS active_seconds
       FROM nexabot_shifts
      WHERE guild_id = $1 AND ($2::text IS NULL OR user_id = $2)
      ORDER BY started_at DESC LIMIT $3`,
    [guildId, userId, limit]
  );
  if (result) return result.rows.map((row) => ({
    ...row,
    break_seconds: Number(row.break_seconds || 0),
    active_seconds: Number(row.active_seconds || 0)
  }));
  const rows = [];
  for (const [key, history] of historyFallback) {
    if (!key.startsWith(`${guildId}:`)) continue;
    const rowUserId = key.slice(String(guildId).length + 1);
    if (userId && rowUserId !== userId) continue;
    for (const item of history) rows.push({ ...item, guild_id: guildId, user_id: rowUserId });
  }
  for (const [key, item] of openFallback) {
    if (!key.startsWith(`${guildId}:`)) continue;
    const rowUserId = key.slice(String(guildId).length + 1);
    if (userId && rowUserId !== userId) continue;
    rows.push({ ...item, guild_id: guildId, user_id: rowUserId, ended_at: null });
  }
  return rows.sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, limit).map((row) => ({
    ...row,
    active_seconds: Math.max(0, Math.floor(((row.ended_at ? new Date(row.ended_at) : new Date()) - new Date(row.started_at)) / 1000) - Number(row.break_seconds || 0))
  }));
}

async function shiftOverview(guildId) {
  const result = await dbQuery(
    `SELECT
       COUNT(*) FILTER (WHERE ended_at IS NULL)::int AS active,
       COUNT(*) FILTER (WHERE ended_at IS NOT NULL)::int AS completed,
       COUNT(DISTINCT user_id)::int AS members,
       COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at)) - break_seconds)) FILTER (WHERE ended_at IS NOT NULL), 0)::bigint AS seconds
     FROM nexabot_shifts WHERE guild_id = $1`,
    [guildId]
  );
  if (result) return {
    active: Number(result.rows[0].active || 0),
    completed: Number(result.rows[0].completed || 0),
    members: Number(result.rows[0].members || 0),
    seconds: Number(result.rows[0].seconds || 0)
  };
  const rows = await listShiftRecords(guildId, { limit: 250 });
  return {
    active: rows.filter((row) => !row.ended_at).length,
    completed: rows.filter((row) => row.ended_at).length,
    members: new Set(rows.map((row) => row.user_id)).size,
    seconds: rows.filter((row) => row.ended_at).reduce((sum, row) => sum + Number(row.active_seconds || 0), 0)
  };
}

async function updateShiftRecord(guildId, recordId, values, actorId = null) {
  const id = Number.parseInt(recordId, 10);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Érvénytelen szolgálati rekord.');
  let startedAt = new Date(values.startedAt);
  let endedAt = values.endedAt ? new Date(values.endedAt) : null;
  const rawAdjustment=values.adjustmentMinutes??0;
  if(!/^-?\d+$/.test(String(rawAdjustment)))throw new Error('Az időkorrekció egész percekben adható meg.');
  const adjustmentMinutes=Number(rawAdjustment);
  if(!Number.isSafeInteger(adjustmentMinutes)||Math.abs(adjustmentMinutes)>525600)throw new Error('Az időkorrekció legfeljebb 525600 perc lehet.');
  if(adjustmentMinutes){if(endedAt)endedAt=new Date(endedAt.getTime()+adjustmentMinutes*60000);else startedAt=new Date(startedAt.getTime()-adjustmentMinutes*60000);}
  const breakSeconds = Math.max(0, Number.parseInt(values.breakSeconds, 10) || 0);
  if (Number.isNaN(startedAt.getTime()) || (endedAt && Number.isNaN(endedAt.getTime()))) throw new Error('Érvénytelen dátum vagy időpont.');
  if (endedAt && endedAt <= startedAt) throw new Error('A befejezésnek későbbinek kell lennie a kezdésnél.');
  if (endedAt && breakSeconds > Math.floor((endedAt - startedAt) / 1000)) throw new Error('A szünet nem lehet hosszabb a teljes szolgálatnál.');
  const result = await dbQuery(
    `UPDATE nexabot_shifts SET started_at = $3, ended_at = $4, break_seconds = $5,
       break_started_at = CASE WHEN $4::timestamptz IS NULL THEN break_started_at ELSE NULL END
     WHERE id = $1 AND guild_id = $2 RETURNING id`,
    [id, guildId, startedAt, endedAt, breakSeconds]
  );
  if (!result) {
    let found = false;
    for (const [key, history] of historyFallback) {
      const item = history.find((entry) => Number(entry.id) === id && key.startsWith(`${guildId}:`));
      if (item) {
        item.started_at = startedAt; item.ended_at = endedAt; item.break_seconds = breakSeconds; found = true; break;
      }
    }
    if (!found) {
      for (const [key, item] of openFallback) {
        if (Number(item.id) === id && key.startsWith(`${guildId}:`)) {
          item.started_at = startedAt; item.ended_at = endedAt; item.break_seconds = breakSeconds;
          if (endedAt) {
            openFallback.delete(key);
            const history = historyFallback.get(key) || [];
            history.push(item);
            historyFallback.set(key, history);
          }
          found = true; break;
        }
      }
    }
    if (!found) throw new Error('A szolgálati rekord nem található.');
  } else if (!result.rowCount) throw new Error('A szolgálati rekord nem található.');
  await recordAudit('owner_shift_update', { actorId, guildId, targetId: String(id), metadata: { breakSeconds, adjustmentMinutes, reason: String(values.adjustmentReason||'').slice(0,500), userId: values.adjustedUserId||null } });
}

async function adjustShiftMinutes(guildId,recordId,adjustmentMinutes,reason,actorId,targetUserId=null){
  const hasRecordId=recordId!==null&&recordId!==undefined,id=hasRecordId?Number.parseInt(recordId,10):null,minutes=Number(adjustmentMinutes),why=String(reason||'').trim();
  if(hasRecordId&&(!Number.isSafeInteger(id)||id<=0))throw new Error('Érvénytelen szolgálati rekordazonosító.');
  if(!hasRecordId&&!/^\d{16,22}$/.test(String(targetUserId||'')))throw new Error('Jelölj meg egy tagot, vagy adj meg szolgálati rekordazonosítót.');
  if(!Number.isSafeInteger(minutes)||minutes===0||Math.abs(minutes)>10080)throw new Error('A korrekció 1 és 10080 perc közötti egész idő legyen.');
  if(why.length<5||why.length>500)throw new Error('Adj meg 5–500 karakteres indokot.');
  const result=hasRecordId
    ? await dbQuery('SELECT id,user_id,started_at,ended_at,break_seconds FROM nexabot_shifts WHERE id=$1 AND guild_id=$2',[id,guildId])
    : await dbQuery('SELECT id,user_id,started_at,ended_at,break_seconds FROM nexabot_shifts WHERE guild_id=$1 AND user_id=$2 AND ended_at IS NOT NULL ORDER BY ended_at DESC,id DESC LIMIT 1',[guildId,String(targetUserId)]);
  const fallbackRows=!result?await listShiftRecords(guildId,{limit:250,userId:hasRecordId?undefined:String(targetUserId)}):[];
  const row=result?.rows?.[0]||(hasRecordId?fallbackRows.find(item=>Number(item.id)===id):fallbackRows.filter(item=>item.ended_at).sort((a,b)=>new Date(b.ended_at)-new Date(a.ended_at))[0]);
  if(!row)throw new Error('A megadott szolgálati rekord nem található ezen a szerveren.');
  if(targetUserId&&String(row.user_id)!==String(targetUserId))throw new Error('A megadott rekord nem a megjelölt taghoz tartozik.');
  const startedAt=new Date(row.started_at),endedAt=row.ended_at?new Date(row.ended_at):null;
  if(!Number.isFinite(startedAt.getTime())||(endedAt&&!Number.isFinite(endedAt.getTime())))throw new Error('A rekord időadata hibás, ezért nem módosítottam.');
  if(!endedAt)throw new Error('Csak lezárt szolgálati rekord időtartama korrigálható.');
  const recordIdValue=Number(row.id);
  await updateShiftRecord(guildId,recordIdValue,{startedAt,endedAt,breakSeconds:Number(row.break_seconds||0),adjustmentMinutes:minutes,adjustmentReason:why,adjustedUserId:row.user_id},actorId);
  const end=endedAt?new Date(endedAt.getTime()+minutes*60000):null,adjustedStart=endedAt?startedAt:new Date(startedAt.getTime()-minutes*60000);
  const activeSeconds=adjustedActiveSeconds(adjustedStart,end||new Date(),Number(row.break_seconds||0),0);
  return{id:recordIdValue,userId:row.user_id,adjustmentMinutes:minutes,activeSeconds};
}

async function deleteShiftRecord(guildId, recordId, actorId = null) {
  const id = Number.parseInt(recordId, 10);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Érvénytelen szolgálati rekord.');
  const result = await dbQuery('DELETE FROM nexabot_shifts WHERE id = $1 AND guild_id = $2 RETURNING user_id', [id, guildId]);
  let deleted = Boolean(result?.rowCount);
  if (!result) {
    for (const [key, history] of historyFallback) {
      if (!key.startsWith(`${guildId}:`)) continue;
      const next = history.filter((item) => Number(item.id) !== id);
      if (next.length !== history.length) { historyFallback.set(key, next); deleted = true; }
    }
    for (const [key, item] of openFallback) {
      if (key.startsWith(`${guildId}:`) && Number(item.id) === id) { openFallback.delete(key); deleted = true; }
    }
  }
  if (!deleted) throw new Error('A szolgálati rekord nem található.');
  await recordAudit('owner_shift_delete', { actorId, guildId, targetId: String(id) });
}

async function resetShiftData(guildId, userId = null, actorId = null) {
  const targetUserId = userId && /^\d{16,22}$/.test(String(userId)) ? String(userId) : null;
  const result = await dbQuery(
    `DELETE FROM nexabot_shifts WHERE guild_id = $1 AND ($2::text IS NULL OR user_id = $2)`,
    [guildId, targetUserId]
  );
  let deleted = result?.rowCount || 0;
  if (!result) {
    for (const key of [...historyFallback.keys()]) {
      if (key.startsWith(`${guildId}:`) && (!targetUserId || key === shiftKey(guildId, targetUserId))) {
        deleted += historyFallback.get(key)?.length || 0; historyFallback.delete(key);
      }
    }
    for (const key of [...openFallback.keys()]) {
      if (key.startsWith(`${guildId}:`) && (!targetUserId || key === shiftKey(guildId, targetUserId))) {
        deleted += 1; openFallback.delete(key);
      }
    }
  }
  await recordAudit(targetUserId ? 'owner_shift_reset_user' : 'owner_shift_reset_all', {
    actorId, guildId, targetId: targetUserId, metadata: { deleted }
  });
  return deleted;
}

async function logShift(guild, title, description, color = COLORS.primary) {
  const channel = configuredChannel(guild, 'shiftLogs');
  if (channel?.isTextBased()) await channel.send({ embeds: [baseEmbed(title, description, color)] }).catch(() => null);
}

async function handleShiftButton(interaction) {
  if (!moduleEnabled(interaction.guildId, 'shift')) {
    return interaction.reply({ content: '❌ A szolgálatkezelő ezen a szerveren ki van kapcsolva.', flags: EPHEMERAL });
  }
  if (interaction.customId.startsWith('shift_leave_')) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ A kérelmet csak Staff vagy adminisztrátor bírálhatja el.', flags: EPHEMERAL });
    }
    if (interaction.customId === 'shift_leave_review_select') {
      const id = interaction.values?.[0];
      const request = await getLeaveRequest(interaction.guildId, id);
      if (!request || request.status !== 'pending') {
        return interaction.reply({ content: '❌ Ez a kérelem már nem függő vagy nem ezen a szerveren található.', flags: EPHEMERAL });
      }
      const startsOn = request.starts_on || request.startsOn;
      const endsOn = request.ends_on || request.endsOn;
      const embed = baseEmbed('🏖️ Távolléti kérelem · elbírálás', `<@${request.user_id || request.userId}>`, COLORS.warning)
        .addFields(
          { name: 'Kérelem', value: `#${request.id}`, inline: true },
          { name: 'Időszak', value: `<t:${Math.floor(new Date(startsOn).getTime() / 1000)}:d> – <t:${Math.floor(new Date(endsOn).getTime() / 1000)}:d>`, inline: true },
          { name: 'Indok', value: String(request.reason || 'Nincs megadva.').slice(0, 1000) },
          { name: 'Állapot', value: '⏳ Vezetői döntésre vár' }
        );
      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`shift_leave_approve:${request.id}`).setLabel('Jóváhagyás').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`shift_leave_reject:${request.id}`).setLabel('Elutasítás').setEmoji('❌').setStyle(ButtonStyle.Danger)
      );
      return interaction.reply({ embeds: [embed], components: [controls], flags: EPHEMERAL });
    }
    const [prefix, id] = interaction.customId.split(':');
    const status = prefix.endsWith('_approve') ? 'approved' : 'rejected';
    const request = await decideLeaveRequest(interaction.guildId, id, status, interaction.user.id);
    if (!request) return interaction.reply({ content: '❌ Ez a kérelem már el lett bírálva vagy nem található.', flags: EPHEMERAL });
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(status === 'approved' ? COLORS.success : COLORS.danger)
      .addFields({ name: status === 'approved' ? '✅ Jóváhagyva' : '❌ Elutasítva', value: `${interaction.user} döntése.` });
    await interaction.update({ embeds: [embed], components: [] });
    const user = await interaction.client.users.fetch(request.user_id || request.userId).catch(() => null);
    await user?.send(
      `${status === 'approved' ? '✅ Jóváhagyták' : '❌ Elutasították'} a **${interaction.guild.name}** szerverre beadott szabadság-/távolléti kérelmedet.`
    ).catch(() => null);
    return;
  }
  if (!canUseShift(interaction.member)) {
    return interaction.reply({ content: '❌ A szolgálathoz a beállított szolgálati rang szükséges.', flags: EPHEMERAL });
  }
  await interaction.deferReply({ flags: EPHEMERAL });
  const current = await openShift(interaction.guildId, interaction.user.id);

  if (interaction.customId === 'shift_start') {
    if (current) return interaction.editReply('❌ Már van folyamatban lévő szolgálatod.');
    await startShift(interaction.guildId, interaction.user.id);
    await logShift(interaction.guild, '▶️ Szolgálat elkezdve', `${interaction.user} megkezdte a szolgálatát.`, COLORS.success);
    return interaction.editReply('✅ A szolgálatod elindult.');
  }
  if (!current) return interaction.editReply('❌ Nincs folyamatban lévő szolgálatod.');

  if (interaction.customId === 'shift_break') {
    if (!getGuildConfig(interaction.guildId).shift.trackBreaks) return interaction.editReply('❌ A szünetkövetés ki van kapcsolva.');
    const result = await toggleBreak(interaction.guildId, interaction.user.id, current);
    await logShift(
      interaction.guild,
      result.started ? '☕ Szünet elkezdve' : '▶️ Szünet befejezve',
      `${interaction.user} ${result.started ? 'szünetet kezdett' : 'folytatja a szolgálatát'}.`,
      COLORS.warning
    );
    return interaction.editReply(result.started ? '☕ A szüneted elindult.' : '✅ A szüneted lezárult, a szolgálat folytatódik.');
  }

  let result;
  try {
    result = await endShift(interaction.guildId, interaction.user.id, current);
  } catch (error) {
    const latest = await openShift(interaction.guildId, interaction.user.id).catch(() => current);
    if (!latest) return interaction.editReply('✅ A szolgálatod lezárult. A zárást a rendszer már elmentette.');
    console.error('Shift close failed:', error);
    return interaction.editReply('❌ Nem sikerült elmenteni a szolgálat lezárását; továbbra is aktívként látszik. Próbáld meg újra.');
  }
  if (!result.closed) {
    const latest = await openShift(interaction.guildId, interaction.user.id).catch(() => current);
    return interaction.editReply(latest
      ? '⏳ A szolgálat lezárása már folyamatban van vagy nem sikerült. Ellenőrizd az állapotot, majd próbáld újra.'
      : 'ℹ️ Ez a szolgálat már le van zárva.');
  }
  await logShift(
    interaction.guild,
    '⏹️ Szolgálat befejezve',
    `${interaction.user} lezárta a szolgálatát.\n**Aktív idő:** ${formatDuration(result.totalSeconds)}\n**Szünet:** ${formatDuration(result.breakSeconds)}`,
    COLORS.danger
  );
  return interaction.editReply(`✅ Szolgálat lezárva.\n**Aktív idő:** ${formatDuration(result.totalSeconds)}\n**Szünet:** ${formatDuration(result.breakSeconds)}`);
}

async function handleShiftCommand(interaction) {
  if (!moduleEnabled(interaction.guildId, 'shift')) {
    return interaction.reply({ content: '❌ A szolgálatkezelő ezen a szerveren ki van kapcsolva.', flags: EPHEMERAL });
  }
  const subcommand = interaction.options.getSubcommand();
  if(subcommand==='idomodositas'){
    if(!isStaff(interaction.member))return interaction.reply({content:'❌ A szolgálati idő módosításához Staff vagy Szerver kezelése jogosultság szükséges.',flags:EPHEMERAL});
    await interaction.deferReply({flags:EPHEMERAL});
    try{
      const target=interaction.options.getUser('tag',true),direction=interaction.options.getString('irany',true),amount=interaction.options.getInteger('perc',true),reason=interaction.options.getString('indok',true),minutes=direction==='remove'?-amount:amount;
      const result=await adjustShiftMinutes(interaction.guildId,null,minutes,reason,interaction.user.id,target.id);
      await logShift(interaction.guild,'🛠️ Szolgálati idő korrigálva',`**Tag:** <@${result.userId}>\n**Rekord:** #${result.id}\n**Korrekció:** ${minutes>0?'+':''}${minutes} perc\n**Új aktív idő:** ${formatDuration(result.activeSeconds)}\n**Indok:** ${reason}\n**Végrehajtotta:** ${interaction.user}`,COLORS.warning);
      return interaction.editReply({content:`✅ <@${result.userId}> · a #${result.id} szolgálati rekordot ${minutes>0?'+':''}${minutes} perccel korrigáltam. Új aktív idő: **${formatDuration(result.activeSeconds)}**. Az indok bekerült az auditnaplóba.`,allowedMentions:{parse:[]}});
    }catch(error){return interaction.editReply({content:`❌ ${error.message}`,allowedMentions:{parse:[]}});}
  }
  if (subcommand === 'panel') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ A panel kihelyezéséhez Szerver kezelése jogosultság szükséges.', flags: EPHEMERAL });
    }
    await interaction.channel.send(shiftPanel());
    return interaction.reply({ content: '✅ A szolgálati panel elkészült.', flags: EPHEMERAL });
  }
  if (subcommand === 'kerelmek') {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ A kérelmi panelt csak Staff vagy adminisztrátor tekintheti meg.', flags: EPHEMERAL });
    }
    return interaction.reply({ ...(await leaveReviewPanel(interaction.guildId)), flags: EPHEMERAL });
  }
  if (subcommand === 'szabadsag') {
    if (!canUseShift(interaction.member)) {
      return interaction.reply({ content: '❌ A kérelemhez a beállított szolgálati rang szükséges.', flags: EPHEMERAL });
    }
    const startsOn = budapestDate(interaction.options.getString('kezdet', true), true);
    const endsOn = budapestDate(interaction.options.getString('vege', true), true);
    if (!startsOn || !endsOn || endsOn < startsOn) {
      return interaction.reply({ content: '❌ A dátum formátuma ÉÉÉÉ-HH-NN legyen, és a befejezés nem lehet korábbi a kezdésnél.', flags: EPHEMERAL });
    }
    const reason = interaction.options.getString('indok', true);
    const request = await createLeaveRequest(interaction.guildId, interaction.user.id, startsOn, endsOn, reason);
    const channel = configuredChannel(interaction.guild, 'shiftLogs');
    if (!channel?.isTextBased()) return interaction.reply({ content: '❌ A szolgálati naplócsatorna nincs beállítva.', flags: EPHEMERAL });
    const embed = baseEmbed('🏖️ Új szabadság-/távolléti kérelem', `${interaction.user}`, COLORS.warning).addFields(
      { name: 'Időszak', value: `<t:${Math.floor(startsOn.getTime() / 1000)}:d> – <t:${Math.floor(endsOn.getTime() / 1000)}:d>` },
      { name: 'Indok', value: reason },
      { name: 'Állapot', value: '⏳ Vezetői döntésre vár' }
    );
    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shift_leave_approve:${request.id}`).setLabel('Jóváhagyás').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`shift_leave_reject:${request.id}`).setLabel('Elutasítás').setEmoji('❌').setStyle(ButtonStyle.Danger)
    );
    await channel.send({ embeds: [embed], components: [controls] });
    return interaction.reply({ content: `✅ A kérelmedet elküldtem ide: ${channel}`, flags: EPHEMERAL });
  }
  if (subcommand === 'beosztas') {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Műszakot csak Staff vagy adminisztrátor oszthat be.', flags: EPHEMERAL });
    }
    const target = interaction.options.getUser('tag', true);
    const startsAt = budapestDate(interaction.options.getString('kezdet', true));
    const endsAt = budapestDate(interaction.options.getString('vege', true));
    if (!startsAt || !endsAt || endsAt <= startsAt) {
      return interaction.reply({ content: '❌ Ezt a formátumot használd: `2026-09-10 18:00`. A befejezés legyen később a kezdésnél.', flags: EPHEMERAL });
    }
    const note = interaction.options.getString('megjegyzes') || '';
    await createSchedule(interaction.guildId, target.id, startsAt, endsAt, note, interaction.user.id);
    const description = `${target}\n**Kezdés:** <t:${Math.floor(startsAt.getTime() / 1000)}:F>\n**Befejezés:** <t:${Math.floor(endsAt.getTime() / 1000)}:t>${note ? `\n**Feladat:** ${note}` : ''}\n**Beosztotta:** ${interaction.user}`;
    await logShift(interaction.guild, '📅 Új szolgálati beosztás', description, COLORS.primary);
    await target.send(`📅 Új szolgálati beosztást kaptál a **${interaction.guild.name}** szerveren.\nKezdés: <t:${Math.floor(startsAt.getTime() / 1000)}:F>\nBefejezés: <t:${Math.floor(endsAt.getTime() / 1000)}:t>${note ? `\nFeladat: ${note}` : ''}`).catch(() => null);
    return interaction.reply({ content: `✅ ${target} szolgálati beosztása elkészült.`, flags: EPHEMERAL });
  }
  if (subcommand === 'ranglista') {
    if (!getGuildConfig(interaction.guildId).shift.showLeaderboard) {
      return interaction.reply({ content: '❌ A szolgálati ranglista ki van kapcsolva.', flags: EPHEMERAL });
    }
    const rows = await shiftLeaderboard(interaction.guildId);
    const text = rows.map((row, index) => `**${index + 1}.** <@${row.userId}> — ${formatDuration(row.seconds)} (${row.shifts} műszak)`).join('\n');
    return interaction.reply({ embeds: [baseEmbed('🏆 Havi szolgálati ranglista', text || 'Még nincs lezárt szolgálat.', COLORS.primary)] });
  }
  if(subcommand==='naplo'){
    const requested=interaction.options.getUser('tag'),staff=isStaff(interaction.member);
    if(requested&&requested.id!==interaction.user.id&&!staff)return interaction.reply({content:'❌ Más tag szolgálati naplóját csak Staff vagy admin nézheti meg.',flags:EPHEMERAL});
    const target=requested||interaction.user,limit=interaction.options.getInteger('darab')||10;
    const rows=await listShiftRecords(interaction.guildId,{limit,userId:staff&&!requested?null:target.id});
    const lines=rows.map(row=>`• **#${row.id}** · <@${row.user_id}> · ${formatDuration(row.active_seconds||0)} · ${row.ended_at?'Lezárt':'Aktív'} · <t:${Math.floor(new Date(row.started_at).getTime()/1000)}:d>`);
    return interaction.reply({embeds:[baseEmbed(`📒 Szolgálati napló · ${rows.length} rekord`,lines.join('\n')||'Nincs megjeleníthető szolgálati rekord.',COLORS.primary)],flags:EPHEMERAL,allowedMentions:{parse:[]}});
  }
  const target = interaction.options.getUser('tag') || interaction.user;
  if (target.id !== interaction.user.id && !isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Más tag statisztikáját csak Staff vagy admin nézheti meg.', flags: EPHEMERAL });
  }
  const [weekly, monthly, current] = await Promise.all([
    shiftStats(interaction.guildId, target.id, 7),
    shiftStats(interaction.guildId, target.id, 30),
    openShift(interaction.guildId, target.id)
  ]);
  return interaction.reply({
    embeds: [baseEmbed('📊 Szolgálati statisztika', `${target}`, COLORS.primary).addFields(
      { name: 'Elmúlt 7 nap', value: `${formatDuration(weekly.seconds)} • ${weekly.shifts} műszak`, inline: true },
      { name: 'Elmúlt 30 nap', value: `${formatDuration(monthly.seconds)} • ${monthly.shifts} műszak`, inline: true },
      { name: 'Jelenlegi állapot', value: current ? `${current.break_started_at ? '☕ Szüneten' : '🟢 Szolgálatban'} · ${formatDuration(liveActiveSeconds(current))}` : '⚫ Nincs szolgálatban' }
    )],
    flags: target.id === interaction.user.id ? EPHEMERAL : undefined
  });
}

module.exports = {
  buildShiftCommand,
  shiftPanel,
  handleShiftButton,
  handleShiftCommand,
  formatDuration,
  liveActiveSeconds,
  shiftStats,
  shiftLeaderboard,
  canUseShift,
  startShift,
  endShift,
  listShiftRecords,
  shiftOverview,
  updateShiftRecord,
  adjustShiftMinutes,
  deleteShiftRecord,
  resetShiftData
};
