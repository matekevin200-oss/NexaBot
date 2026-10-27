function automodPolicy(input = {}) {
  const number = (key, fallback, min, max) => Number.isFinite(Number(input[key])) && input[key] !== '' && input[key] != null ? Math.max(min, Math.min(max, Math.floor(Number(input[key])))) : fallback;
  const timeoutAfter = number('timeoutAfter', 2, 1, 20);
  const kickAfter = Math.max(timeoutAfter + 1, number('kickAfter', 3, 2, 30));
  return {
    mode: ['alerts', 'warn', 'progressive'].includes(input.mode) ? input.mode : 'progressive',
    strikeResetMinutes: number('strikeResetMinutes', 30, 5, 1440),
    timeoutMinutes: number('timeoutMinutes', 10, 1, 40320),
    timeoutAfter, kickAfter, banAfter: Math.max(kickAfter + 1, number('banAfter', 4, 3, 50)),
    spamLimit: number('spamLimit', 0, 0, 50), spamWindowSeconds: number('spamWindowSeconds', 0, 0, 60),
    mentionLimit:number('mentionLimit',0,0,30),emojiLimit:number('emojiLimit',0,0,100),capsPercent:number('capsPercent',0,0,100),
    raidJoinLimit:number('raidJoinLimit',0,0,100),freshRaidLimit:number('freshRaidLimit',0,0,100),raidWindowSeconds:number('raidWindowSeconds',0,0,120),freshAccountDays:number('freshAccountDays',0,0,30),
    allowedDomains:[...new Set((Array.isArray(input.allowedDomains)?input.allowedDomains:String(input.allowedDomains||'').split(/[\s,;]+/)).map(value=>String(value).trim().toLowerCase()).filter(value=>/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)))].slice(0,50)
  };
}

function violationAction(protection, strikes, member) {
  const policy = automodPolicy(protection);
  if (policy.mode === 'alerts') return 'alert';
  if (policy.mode === 'progressive') {
    if (strikes >= policy.banAfter && protection.ban && member.bannable) return 'ban';
    if (strikes >= policy.kickAfter && protection.kick && member.kickable) return 'kick';
    if (strikes >= policy.timeoutAfter && protection.timeout && member.moderatable) return 'timeout';
  }
  return protection.warn ? 'warn' : 'alert';
}

module.exports = { automodPolicy, violationAction };

function containsUntrustedLink(text,allowedDomains=[]) {
  const urls=String(text||'').match(/(?:https?:\/\/|www\.)[^\s<>]+/gi)||[];
  return urls.some(raw=>{try{const hostname=new URL(raw.startsWith('www.')?'https://'+raw:raw).hostname.toLowerCase();return !allowedDomains.some(domain=>hostname===domain||hostname.endsWith('.'+domain));}catch{return true;}});
}
module.exports.containsUntrustedLink=containsUntrustedLink;
