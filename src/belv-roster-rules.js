'use strict';
const RANKS = Object.freeze([
  { rank:'Főigazgató', nickRank:'Főigazgató', group:'Felsővezetés', min:1, max:1, key:'foigazgato' },
  { rank:'Főigazgató-helyettes', nickRank:'Fő Igazgató-H.', group:'Felsővezetés', min:2, max:2, key:'foigazgato-helyettes' },
  { rank:'Igazgató', nickRank:'Igazgató', group:'Felsővezetés', min:3, max:3, key:'igazgato' },
  { rank:'Igazgatóhelyettes', nickRank:'Igazgató-H.', group:'Felsővezetés', min:4, max:9, key:'igazgatohelyettes' },
  { rank:'Főosztályvezető', nickRank:'Főoszt. vez.', group:'Vezetői állomány', min:10, max:14, key:'foosztalyvezeto' },
  { rank:'Műveleti vezető', nickRank:'Műveleti vez.', group:'Vezetői állomány', min:15, max:19, key:'muveleti-vezeto' },
  { rank:'Ellenőrzési vezető', nickRank:'Ellenőrzési V.', group:'Vezetői állomány', min:20, max:24, key:'ellenorzesi-vezeto' },
  { rank:'Főellenőr', nickRank:'Főellenőr', group:'Ellenőrzési állomány', min:25, max:34, key:'foellenor' },
  { rank:'Vezető tiszt', nickRank:'Vezető Tiszt', group:'Hivatásos állomány', min:35, max:39, key:'vezeto-tiszt' },
  { rank:'Belvédelmi tiszt', nickRank:'Belv. Tiszt', group:'Hivatásos állomány', min:40, max:49, key:'belvedelmi-tiszt' },
  { rank:'Vezető ügynök', nickRank:'Vezető Ügynök', group:'Hivatásos állomány', min:50, max:59, key:'vezeto-ugynok' },
  { rank:'Különleges ügynök', nickRank:'Különl. Ügynök', group:'Hivatásos állomány', min:60, max:69, key:'kulonleges-ugynok' },
  { rank:'Belvédelmi ügynök', nickRank:'Belv. Ügynök', group:'Hivatásos állomány', min:70, max:89, key:'belvedelmi-ugynok' },
  { rank:'Belvédelmi jelölt', nickRank:'Belv. Jelölt', group:'Képzési állomány', min:90, max:99, key:'belvedelmi-jelolt' }
]);
function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function configuredRankRoleMap(raw) {
  try {
    const input = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    return Object.fromEntries(Object.entries(input).filter(([id, rank]) => /^\d{16,22}$/.test(id) && typeof rank === 'string'));
  } catch { return {}; }
}
function rankForCode(code, roleId = null, roleName = '') {
  const value = Number(code);
  const definition = RANKS.find((item) => value >= item.min && value <= item.max);
  return definition ? { ...definition, badge: 'BV-' + String(value).padStart(2,'0'), roleId, roleName, exactBadge: true } : null;
}
function classifyBelvRole(role, roleIdMap = {}) {
  if (!role) return null;
  const raw = roleIdMap[role.id] || role.name || '';
  const name = normalize(raw);
  const code = name.match(/(?:^|-)bv-(\d{1,2})(?:-(\d{1,2}))?(?:-|$)/);
  if (code) {
    const min = Number(code[1]), max = code[2] ? Number(code[2]) : min;
    if (min < 1 || max > 99 || max < min) return null;
    const definition = RANKS.find((item) => min >= item.min && min <= item.max);
    if (!definition) return null;
    return { ...definition, min, max, badge: max === min ? 'BV-' + String(min).padStart(2,'0') : null, exactBadge: max === min, roleId: role.id, roleName: role.name || raw, position: Number(role.position || 0) };
  }
  const definition = [...RANKS].sort((a,b)=>b.key.length-a.key.length).find((item) =>
    name === item.key || name.startsWith(item.key + '-') || name.includes('-' + item.key + '-') || name.includes(item.key + '-bv')
  );
  return definition ? { ...definition, badge:null, exactBadge:false, roleId:role.id, roleName:role.name || raw, position:Number(role.position||0) } : null;
}
function rankForMember(member, roleIdMap = {}) {
  return [...(member?.roles?.cache?.values?.() || [])]
    .map((role) => classifyBelvRole(role, roleIdMap))
    .filter(Boolean)
    .sort((a,b)=>b.position-a.position || (a.max-a.min)-(b.max-b.min))[0] || null;
}
function isConfiguredRoleHolder(member, roleId) {
  return /^\d{16,22}$/.test(String(roleId || '')) && Boolean(member?.roles?.cache?.has(String(roleId)));
}
function stripManagedNickname(current, nickRank, badge) {
  const value = String(current || '').trim();
  const suffix = ' | ' + String(nickRank || '').trim() + ' | ' + String(badge || '').trim();
  return value.endsWith(suffix) ? value.slice(0, -suffix.length).trimEnd() : value;
}
function cleanBotMention(content, botId) {
  const value = String(content || '');
  if (!/^\d{16,22}$/.test(String(botId || ''))) return value.replace(/<@!?\d{16,22}>/g, ' ').trim();
  return value.replace(new RegExp('<@!?' + String(botId) + '>', 'g'), ' ').trim();
}
function adjustedActiveSeconds(startedAt, endedAt, breakSeconds, adjustmentMinutes) {
  const start = new Date(startedAt).getTime(), end = new Date(endedAt).getTime();
  const minutes = Number(adjustmentMinutes), pause = Number(breakSeconds || 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isSafeInteger(minutes) || Math.abs(minutes) > 525600 || !Number.isFinite(pause) || pause < 0) throw new Error('Érvénytelen szolgálati időkorrekció.');
  return Math.max(0, Math.floor((end + minutes * 60000 - start) / 1000) - pause);
}
module.exports = { RANKS, normalize, configuredRankRoleMap, classifyBelvRole, rankForMember, isConfiguredRoleHolder, stripManagedNickname, cleanBotMention, adjustedActiveSeconds };
