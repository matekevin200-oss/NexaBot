const { AttachmentBuilder } = require('discord.js');
const { dbQuery } = require('./config');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchMessages(channel, maximum = 1000) {
  const messages = [];
  let before;
  while (messages.length < maximum) {
    const batch = await channel.messages.fetch({ limit: Math.min(100, maximum - messages.length), before }).catch(() => null);
    if (!batch?.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function renderTranscript(channel, messages) {
  const rows = messages.map((message) => {
    const files = [...message.attachments.values()].map((file) => `<a href="${escapeHtml(file.url)}" rel="noreferrer">${escapeHtml(file.name || 'melléklet')}</a>`).join(' · ');
    const embeds = message.embeds.map((embed) => escapeHtml(embed.title || embed.description || '[embed]')).join('<br>');
    const body = escapeHtml(message.cleanContent || message.content || '').replace(/\n/g, '<br>');
    return `<article class="message"><img src="${escapeHtml(message.author.displayAvatarURL({ size: 64 }))}" alt=""><div><div class="meta"><strong>${escapeHtml(message.author.tag)}</strong><span>${escapeHtml(message.createdAt.toISOString())}</span></div><div class="body">${body || embeds || '<em>[üres üzenet]</em>'}</div>${files ? `<div class="files">${files}</div>` : ''}</div></article>`;
  }).join('\n');
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEXA Ticket – ${escapeHtml(channel.name)}</title><style>body{margin:0;background:#080b12;color:#eef1fa;font:15px/1.5 system-ui}.wrap{max-width:900px;margin:auto;padding:28px}.head{padding:24px;border:1px solid #273149;border-radius:18px;background:#101624;margin-bottom:18px}.message{display:grid;grid-template-columns:44px 1fr;gap:12px;padding:15px 6px;border-bottom:1px solid #20283a}.message img{width:42px;height:42px;border-radius:14px}.meta{display:flex;gap:10px;align-items:center}.meta span{color:#8994aa;font-size:12px}.body{white-space:normal;word-break:break-word}.files a{color:#8b7cff}h1{margin:0 0 5px}</style></head><body><main class="wrap"><section class="head"><h1>🎫 ${escapeHtml(channel.name)}</h1><div>${messages.length} üzenet • NEXA Bot hitelesített transcript</div></section>${rows}</main></body></html>`;
}

async function saveTranscript(channel) {
  const messages = await fetchMessages(channel);
  const html = renderTranscript(channel, messages);
  const ticket = await dbQuery('SELECT id FROM nexabot_tickets WHERE channel_id = $1', [channel.id]).catch(() => null);
  const ticketId = ticket?.rows?.[0]?.id;
  if (ticketId) {
    await dbQuery(
      `INSERT INTO nexabot_ticket_transcripts (ticket_id, html) VALUES ($1, $2)
       ON CONFLICT (ticket_id) DO UPDATE SET html = EXCLUDED.html, created_at = NOW()`,
      [ticketId, html]
    ).catch(() => null);
  }
  return {
    html,
    count: messages.length,
    attachment: new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: `nexa-transcript-${channel.id}.html` })
  };
}

module.exports = { escapeHtml, fetchMessages, renderTranscript, saveTranscript };
