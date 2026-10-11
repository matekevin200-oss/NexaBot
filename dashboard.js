const crypto = require('node:crypto');
const { ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { NAMES, SUPPORT_GUILD_ID } = require('./constants');
const { dashboardTheme } = require('./dashboard-theme');
const {
  getGuildConfig,
  setGuildConfig,
  getOwnerSettings,
  setOwnerSettings,
  isPersistentStore,
  isBotOwner,
  isOwnerUser,
  isBviGuild,
  moduleEnabled,
  getGuildPlan,
  getGuildEntitlement,
  planAllows,
  planAllowsModule,
  grantGuildPlan,
  revokeGuildPlan,
  getGuildSubscription,
  MODULE_MINIMUM_PLAN,
  dbQuery,
  databaseHealth,
  MODULE_KEYS,
  dashboardUrl,
  inviteUrl
} = require('./config');
const {
  PLAN_CATALOG,
  paymentReadiness,
  validateStripeConfiguration,
  createCheckoutSession,
  createCustomerPortalSession,
  reconcileCheckoutSession,
  verifyWebhookSignature,
  processStripeEvent
} = require('./payments');
const { ticketPanel, staffPanel } = require('./panels');
const { listWebTickets, listAllWebTickets, getWebTicket, createWebTicket, addWebReply, manageWebTicket, addInternalNote, rateWebTicket, listNotifications, markNotificationsRead } = require('./web-support');
const { controlCenterPanel } = require('./control-center');
const {
  runtimeStats,
  usageSummary,
  operationalSummary,
  recentEvents,
  recentGuildEvents,
  recordAudit,
  recordError
} = require('./telemetry');
const { securityReadiness } = require('./security');
const { guildCommands, saveCustomCommand, deleteCustomCommand } = require('./custom-commands');
const {
  DOCUMENT_TYPES,
  allDocumentTypes,
  documentRule,
  documentPanel,
  findDocumentChannel,
  installDocumentPanels
} = require('./documents');
const { upsertVerificationPanel } = require('./engagement');
const {
  getErlcIntegration,
  saveErlcIntegration,
  setErlcEnabled,
  deleteErlcIntegration,
  fetchErlcServer,
  runErlcCommand
} = require('./erlc');
const {
  formatDuration,
  listShiftRecords,
  shiftOverview,
  updateShiftRecord,
  deleteShiftRecord,
  resetShiftData
} = require('./shifts');
const {
  applicationStats,
  findApplicationTemplate,
  installApplicationPanel,
  templateVersion
} = require('./applications');
const {
  buildIncidentCapsule,
  chronoguardOverview,
  createSnapshot,
  restoreSnapshot,
  setBaseline,
  shadowScan,
  verifyChainSignature
} = require('./chronoguard');
const { aegisOverview, runAegisScan } = require('./aegis');
const {
  applyServerBlueprint,
  architectDeploymentHistory,
  blueprintStats,
  blueprintSimulation,
  generateServerBlueprint,
  latestArchitectDeployment,
  planHash,
  signBlueprintToken,
  verifyBlueprintToken
} = require('./server-architect');
const { repairSupportServer } = require('./support-server');
const { setSupportModerationPaused, supportModerationControl } = require('./support-moderation');
const { buildMdtCommand, syncMdtGuildCommand, requireBelvGuild, handleMdtApi, revokeMdtOwnerSessions, PREFIX: MDT_API_PREFIX } = require('./belv-mdt');
const { mdtOwnerPage, saveMdtOwnerForm, buildMdtClientScript, mdtClientCodePage } = require('./mdt-owner');
const { LOADER_PREFIX: MDT_LOADER_PREFIX, serveMdtLoader, getMdtLoaderCommand, rotateMdtLoaderLink } = require('./mdt-loader');

const sessions = new Map();
const oauthStates = new Map();
const SESSION_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 100_000;
const requestWindows = new Map();
const sessionSigningKey = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function rateAllowed(request) {
  const address = String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const current = requestWindows.get(address);
  const window = !current || now - current.startedAt > 60_000 ? { startedAt: now, count: 0 } : current;
  window.count += 1;
  requestWindows.set(address, window);
  const limit = request.method === 'POST' ? 40 : 180;
  return window.count <= limit;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function rootUrl() {
  return dashboardUrl().replace(/\/dashboard$/, '');
}

function environmentReadiness(environment = process.env) {
  const present = (name) => Boolean(String(environment[name] || '').trim());
  const publicUrl = String(environment.PUBLIC_URL || environment.RENDER_EXTERNAL_URL || '').trim();
  const checks = [
    { key: 'DISCORD_TOKEN', label: 'Discord bot token', ready: present('DISCORD_TOKEN'), required: true },
    { key: 'CLIENT_ID', label: 'Discord Application ID', ready: /^\d{16,22}$/.test(String(environment.CLIENT_ID || '')), required: true },
    { key: 'BOT_OWNER_ID', label: 'Fő bot-owner azonosító', ready: /^\d{16,22}$/.test(String(environment.BOT_OWNER_ID || '')), required: true },
    { key: 'DISCORD_CLIENT_SECRET', label: 'Discord OAuth2 titok', ready: present('DISCORD_CLIENT_SECRET'), required: true },
    { key: 'DATABASE_URL', label: 'PostgreSQL adatbázis', ready: present('DATABASE_URL'), required: true },
    { key: 'SESSION_SECRET', label: 'Tartós munkamenet-titok', ready: String(environment.SESSION_SECRET || '').length >= 32, required: true },
    { key: 'CHRONOGUARD_SIGNING_KEY', label: 'ChronoGuard külön aláírókulcs', ready: String(environment.CHRONOGUARD_SIGNING_KEY || '').length >= 32, required: false },
    { key: 'PUBLIC_URL', label: 'HTTPS publikus cím', ready: /^https:\/\//i.test(publicUrl), required: true },
    { key: 'OPENAI_API_KEY', label: 'Nexa AI API-kulcs', ready: present('OPENAI_API_KEY'), required: false },
    { key: 'STRIPE_SECRET_KEY', label: 'Stripe szerveroldali kulcs', ready: /^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+$/.test(String(environment.STRIPE_SECRET_KEY || '').trim()), required: false },
    { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe webhook aláírás', ready: String(environment.STRIPE_WEBHOOK_SECRET || '').startsWith('whsec_'), required: false },
    { key: 'STRIPE_PRICES', label: 'Stripe előfizetések (4 Price ID)', ready: Object.values(paymentReadiness(environment).prices).every(Boolean), required: false },
    { key: 'ERLC_ENCRYPTION_KEY', label: 'ER:LC kulcstitkosítás', ready: String(environment.ERLC_ENCRYPTION_KEY || '').length >= 32, required: false },
    { key: 'ERLC_API_KEY', label: 'Globális ER:LC kulcs + szerver-hozzárendelés', ready: present('ERLC_API_KEY') && /^\d{16,22}$/.test(String(environment.ERLC_GUILD_ID || '')), required: false }
  ];
  return {
    checks,
    ready: checks.filter((item) => item.required).every((item) => item.ready),
    missingRequired: checks.filter((item) => item.required && !item.ready).map((item) => item.key)
  };
}

function oauthRedirectUri() {
  return `${rootUrl()}/oauth/callback`;
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function cookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function sessionFor(request) {
  const sid = verifiedSessionId(cookies(request).nexabot_session);
  const session = sid ? sessions.get(sid) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (sid) sessions.delete(sid);
    return null;
  }
  return session;
}

function verifiedSessionId(value) {
  if (!value) return null;
  const [sid, signature] = String(value).split('.');
  if (!sid || !signature) return null;
  const expected = crypto.createHmac('sha256', sessionSigningKey).update(sid).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return sid;
}

function baseHeaders(extra = {}) {
  return {
    'Content-Security-Policy': "default-src 'self'; img-src 'self' https://cdn.discordapp.com https://media.discordapp.net data:; style-src 'unsafe-inline'; form-action 'self' https://checkout.stripe.com https://billing.stripe.com; frame-ancestors 'none'; base-uri 'self'",
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cache-Control': 'no-store',
    ...extra
  };
}

function sendHtml(response, status, html, extraHeaders = {}) {
  response.writeHead(status, baseHeaders({ 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders }));
  response.end(html);
}

function sendJson(response, status, value) {
  response.writeHead(status, baseHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
  response.end(JSON.stringify(value));
}

function sendJavaScript(response, status, source) {
  response.writeHead(status, baseHeaders({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300'
  }));
  response.end(source);
}

function dashboardClientScript() {
  return `(function(){
'use strict';
const qs=(selector,root=document)=>root.querySelector(selector);
const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
function toast(message,type='success',timeout=3600){
  let stack=qs('.toast-stack');if(!stack){stack=document.createElement('div');stack.className='toast-stack';document.body.append(stack);}
  const node=document.createElement('div');node.className='nexa-toast '+type;node.textContent=message;stack.append(node);setTimeout(()=>node.remove(),timeout);
}
function markNavigation(){
  const path=location.pathname.replace(/\/$/,'')||'/';
  const hash=location.hash;
  qsa('.side-link').forEach((link)=>{
    const target=new URL(link.href,location.origin);const targetPath=target.pathname.replace(/\/$/,'')||'/';
    const exact=targetPath===path;const ownerHash=target.hash&&hash&&target.hash===hash&&targetPath===path;
    link.classList.toggle('active',Boolean(exact||ownerHash));
  });
  qsa('.settings-jump a').forEach((link)=>link.classList.toggle('active',Boolean(link.hash&&link.hash===hash)));
  const locationNode=qs('[data-current-location]');if(locationNode)locationNode.textContent=(document.title.split('•')[0]||'NEXA').trim();
}
function focusRequestedField(){
  const focus=new URLSearchParams(location.search).get('focus')||qs('form[data-focus-field]')?.dataset.focusField||'';if(!focus)return;
  const field=document.getElementById(focus)||qs('[name="'+CSS.escape(focus)+'"]');if(!field)return;
  field.classList.add('field-invalid');const card=field.closest('.card');if(card)card.classList.add('section-attention');
  setTimeout(()=>{field.scrollIntoView({behavior:'smooth',block:'center'});field.focus({preventScroll:true});toast(document.documentElement.lang==='hu'?'Itt van a javítandó beállítás. A többi módosításod megmaradt.':'This setting needs attention. Your other changes were preserved.','warn',5200);},140);
}
function validationBanner(form,message){let node=qs('.client-validation',form);if(!node){node=document.createElement('div');node.className='notice error client-validation';form.prepend(node);}node.textContent=message;return node;}
function validateSettings(form){
  const rules=[['module_moderation',['channel_moderationPanel','channel_logs','role_staff'],'Moderation'],['module_tickets',['channel_ticketPanel','channel_ticketCategory','role_staff'],'Tickets'],['module_welcome',['channel_welcome'],'Welcome'],['module_suggestions',['channel_suggestions'],'Community'],['module_shift',['channel_shiftLogs','role_shift'],'Shift'],['module_verification',['channel_verification','role_verified'],'Verification'],['module_starboard',['channel_starboard'],'Starboard'],['module_tempVoice',['channel_tempVoiceLobby'],'Temporary voice'],['module_protection',['channel_securityLogs'],'Protection']];
  qsa('.field-invalid',form).forEach((node)=>node.classList.remove('field-invalid'));
  for(const [toggle,required,label] of rules){const enabled=qs('[name="'+toggle+'"]',form);if(!enabled||!enabled.checked)continue;for(const name of required){const field=qs('[name="'+name+'"]',form);if(field&&!String(field.value||'').trim()){field.classList.add('field-invalid');validationBanner(form,label+' is enabled, but a required field is missing. Your other settings are still here.');field.closest('.card')?.classList.add('section-attention');field.scrollIntoView({behavior:'smooth',block:'center'});field.focus({preventScroll:true});toast(label+': required setting missing','warn',5200);return false;}}}
  const tickets=qs('[name="module_tickets"]',form);if(tickets&&tickets.checked&&!qsa('[name^="ticket_type_"]:checked',form).length){const first=qs('[name^="ticket_type_"]',form);if(first){first.classList.add('field-invalid');first.scrollIntoView({behavior:'smooth',block:'center'});}validationBanner(form,'Tickets are enabled, but no ticket type is selected. Choose at least one type; your other settings are unchanged.');toast('Ticket Center: select at least one ticket type','warn',5200);return false;}return true;
}
function draftKey(form){return 'nexa:draft:'+new URL(form.action,location.origin).pathname;}
function serializeDraft(form){const values={};for(const el of form.elements){if(!el.name||el.name==='csrf'||el.disabled)continue;if((el.type==='checkbox'||el.type==='radio')){values[el.name]=el.checked;}else if(el.multiple){values[el.name]=Array.from(el.selectedOptions).map(o=>o.value);}else{values[el.name]=el.value;}}return {at:Date.now(),values};}
function restoreDraft(form){if(new URLSearchParams(location.search).get('saved')==='1'){sessionStorage.removeItem(draftKey(form));return;}let draft=null;try{draft=JSON.parse(sessionStorage.getItem(draftKey(form))||'null');}catch(_e){}if(!draft||Date.now()-Number(draft.at||0)>7200000)return;for(const el of form.elements){if(!el.name||!(el.name in draft.values)||el.name==='csrf'||el.disabled)continue;const value=draft.values[el.name];if(el.type==='checkbox'||el.type==='radio')el.checked=Boolean(value);else if(el.multiple){const wanted=new Set(Array.isArray(value)?value:[]);Array.from(el.options).forEach(o=>o.selected=wanted.has(o.value));}else el.value=String(value??'');}const state=qs('[data-draft-state]',form);if(state){state.textContent=document.documentElement.lang==='hu'?'Nem mentett piszkozat visszaállítva':'Unsaved draft restored';state.classList.add('unsaved');}toast(document.documentElement.lang==='hu'?'A nem mentett beállításaidat visszaállítottam.':'Your unsaved settings draft was restored.','warn',4200);}
function wireDraft(form){restoreDraft(form);let timer=null;const save=()=>{clearTimeout(timer);timer=setTimeout(()=>{try{sessionStorage.setItem(draftKey(form),JSON.stringify(serializeDraft(form)));const state=qs('[data-draft-state]',form);if(state){state.textContent=document.documentElement.lang==='hu'?'Nem mentett módosítások':'Unsaved changes';state.classList.add('unsaved');}}catch(_e){}},180);};form.addEventListener('input',save);form.addEventListener('change',save);}
function renderSupportMessages(root,messages){const list=qs('[data-support-messages]',root);if(!list)return;const current=Number(list.dataset.count||0);if(current===messages.length)return;list.replaceChildren();for(const message of messages){const article=document.createElement('article');article.className='card support-message';const kicker=document.createElement('div');kicker.className='section-kicker';kicker.textContent=message.internal?'INTERNAL NOTE':(message.source==='discord'?'NEXA SUPPORT':message.source==='system'?'SYSTEM':'YOU • WEB');const author=document.createElement('strong');author.textContent=message.author_name||'NEXA';const body=document.createElement('p');body.textContent=message.content||'';const time=document.createElement('div');time.className='muted';time.textContent=new Date(message.created_at).toLocaleString();article.append(kicker,author,body,time);list.append(article);}list.dataset.count=String(messages.length);const last=list.lastElementChild;if(last)last.scrollIntoView({behavior:'smooth',block:'nearest'});}
function applyTicketState(root,ticket){const hu=document.documentElement.lang==='hu';const statusLabels=hu?{open:'nyitott',pending:'várakozik',closed:'lezárt'}:{open:'open',pending:'pending',closed:'closed'};const previous=root.dataset.ticketStatus||'';root.dataset.ticketStatus=ticket.status||previous;const status=qs('[data-support-status]',root);if(status)status.textContent=statusLabels[ticket.status]||ticket.status||'—';const assignee=qs('[data-support-assignee]',root);if(assignee)assignee.textContent=ticket.assigned_name||(hu?'Nincs kijelölve':'Unassigned');const composer=qs('[data-support-composer]',root);const closed=qs('[data-support-closed]',root);if(composer)composer.hidden=ticket.status==='closed';if(closed)closed.hidden=ticket.status!=='closed';if(previous&&ticket.status&&previous!==ticket.status){toast((hu?'Ticket állapot: ':'Ticket status: ')+(statusLabels[ticket.status]||ticket.status),'success',3400);}}
async function refreshSupport(root){const id=root.dataset.ticketId;if(!id)return;try{const response=await fetch('/api/support/'+encodeURIComponent(id),{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error('sync');const data=await response.json();applyTicketState(root,data.ticket||{});const sync=qs('[data-live-sync]',root);if(sync){sync.textContent=(document.documentElement.lang==='hu'?'ÉLŐ':'LIVE')+' · '+new Date().toLocaleTimeString(document.documentElement.lang==='hu'?'hu-HU':'en-GB');sync.classList.add('is-live');}renderSupportMessages(root,data.messages||[]);}catch(_error){const sync=qs('[data-live-sync]',root);if(sync){sync.textContent=document.documentElement.lang==='hu'?'ÚJRACSATLAKOZÁS':'RECONNECTING';sync.classList.remove('is-live');}}}
function wireSidebar(){const toggle=qs('[data-sidebar-toggle]'),sidebar=qs('.sidebar');if(toggle&&sidebar){let backdrop=null;const close=()=>{sidebar.classList.remove('open');backdrop?.remove();backdrop=null;};toggle.addEventListener('click',()=>{if(sidebar.classList.contains('open'))return close();sidebar.classList.add('open');backdrop=document.createElement('div');backdrop.className='sidebar-backdrop';backdrop.addEventListener('click',close);document.body.append(backdrop);});qsa('.side-link',sidebar).forEach(a=>a.addEventListener('click',()=>{if(innerWidth<=900)close();}));}qsa('[data-server-switch]').forEach(select=>select.addEventListener('change',()=>{if(select.value)location.href=select.value;}));const search=qs('[data-nav-search]');if(search){const run=()=>{const q=search.value.trim().toLowerCase();qsa('.side-link').forEach(link=>{const text=(link.dataset.navLabel||link.textContent||'').toLowerCase();link.style.display=!q||text.includes(q)?'flex':'none';});};search.addEventListener('input',run);document.addEventListener('keydown',(event)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();search.focus();search.select();}});}}
function billingError(form,message){let node=qs('.billing-client-error',form);if(!node){node=document.createElement('div');node.className='notice error billing-client-error';const button=qs('button[type="submit"]',form);if(button)button.before(node);else form.append(node);}node.textContent=message;node.scrollIntoView({behavior:'smooth',block:'nearest'});}
async function submitBillingForm(form,event){
  event.preventDefault();if(form.dataset.submitting==='1')return;
  const hu=document.documentElement.lang==='hu';const button=qs('button[type="submit"]',form);if(!button)return;
  const original=button.dataset.originalText||button.textContent;button.dataset.originalText=original;form.dataset.submitting='1';button.disabled=true;button.classList.add('is-loading');button.textContent=hu?'Kapcsolódás a Stripe-hoz…':'Connecting to Stripe…';qs('.billing-client-error',form)?.remove();
  toast(hu?'A biztonságos fizetési oldal előkészítése…':'Preparing secure checkout…','success',5000);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch(form.action,{method:'POST',credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams(new FormData(form)),signal:controller.signal});
    const data=await response.json().catch(()=>({}));if(!response.ok||!data.url)throw new Error(data.error||(hu?'A fizetési oldal nem indult el.':'Checkout could not be started.'));
    button.textContent=hu?'Stripe megnyitása…':'Opening Stripe…';window.location.assign(data.url);
  }catch(error){
    const message=error?.name==='AbortError'?(hu?'A Stripe válasza túl sokáig tartott. Próbáld újra, vagy nézd meg a fizetési diagnosztikát.':'Stripe took too long to respond. Try again or open payment diagnostics.'):String(error?.message||error);
    form.dataset.submitting='0';button.disabled=false;button.classList.remove('is-loading');button.textContent=original;billingError(form,message);toast(message,'warn',8000);
  }finally{clearTimeout(timeout);}
}
document.addEventListener('DOMContentLoaded',()=>{markNavigation();focusRequestedField();wireSidebar();qsa('form[data-smart-settings]').forEach((form)=>{wireDraft(form);form.addEventListener('submit',(event)=>{if(!validateSettings(form)){event.preventDefault();return;}const state=qs('[data-draft-state]',form);if(state){state.textContent=document.documentElement.lang==='hu'?'Mentés…':'Saving…';state.classList.remove('unsaved');}});});qsa('form[data-billing-form]').forEach((form)=>form.addEventListener('submit',(event)=>submitBillingForm(form,event)));if(new URLSearchParams(location.search).get('saved')==='1')toast(document.documentElement.lang==='hu'?'A beállítások sikeresen mentve.':'Settings saved successfully.','success');qsa('[data-live-support]').forEach((root)=>{refreshSupport(root);setInterval(()=>refreshSupport(root),1800);});});
window.addEventListener('hashchange',markNavigation);
})();`;
}

function redirect(response, location, cookie = null, status = 302) {
  const headers = { Location: location };
  if (cookie) headers['Set-Cookie'] = cookie;
  response.writeHead(status, baseHeaders(headers));
  response.end();
}

function sessionCookie(value, maxAge = Math.floor(SESSION_AGE_MS / 1000)) {
  const secure = rootUrl().startsWith('https://') ? '; Secure' : '';
  const signed = value ? `${value}.${crypto.createHmac('sha256', sessionSigningKey).update(value).digest('base64url')}` : '';
  return `nexabot_session=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function layout(title, content, session = null, branding = null, language = null, activePage = '') {
  const user = session?.user;
  const primary = branding?.primary || '#7657ff';
  const accent = branding?.accent || '#52e0c4';
  const productName = branding?.title || 'NexaBot Control Center';
  const ownerView = Boolean(user && isOwnerUser(user.id) && (
    title === 'Owner Center'
    || title.includes('Owner állapot')
    || title.startsWith('Iratvezérlés')
    || title.startsWith('Workflow Studio')
    || title.startsWith('Szolgálatkezelés')
    || title.startsWith('ER:LC')
    || title.startsWith('ChronoGuard')
    || title.startsWith('AEGIS')
    || title.startsWith('NEXA OS Studio')
    || title.startsWith('Owner Support')
    || title.startsWith('Belv MDT')
  ));
  const pageLanguage = ownerView ? 'hu' : ((language || session?.language || 'en') === 'hu' ? 'hu' : 'en');
  const homeUrl = pageLanguage === 'en' ? '/?lang=en' : '/';
  const platformUrl = pageLanguage === 'en' ? '/platform?lang=en' : '/platform';
  const commandsUrl = pageLanguage === 'en' ? '/commands?lang=en' : '/commands';
  const pricingUrl = pageLanguage === 'en' ? '/subscriptions?lang=en' : '/subscriptions';
  const guideUrl = pageLanguage === 'en' ? '/tudaskozpont?lang=en' : '/tudaskozpont';
  const privacyUrl = pageLanguage === 'en' ? '/privacy?lang=en' : '/privacy';
  const publicLocalizedPath = activePage === 'platform' ? '/platform' : activePage === 'commands' ? '/commands' : activePage === 'subscriptions' ? '/subscriptions' : activePage === 'guide' ? '/tudaskozpont' : activePage === 'privacy' ? '/privacy' : activePage === 'terms' ? '/terms' : '/';
  const localizedPath = user && session?.currentPath ? session.currentPath : publicLocalizedPath;
  const huUrl = `/language?lang=hu&return=${encodeURIComponent(localizedPath)}`;
  const enUrl = `/language?lang=en&return=${encodeURIComponent(localizedPath)}`;
  const navClass = (key) => activePage === key ? ' class="active" aria-current="page"' : '';
  const platformLabel = pageLanguage === 'en' ? 'Platform' : 'Platform';
  const commandsLabel = pageLanguage === 'en' ? 'Commands' : 'Parancsok';
  const pricingLabel = pageLanguage === 'en' ? 'Subscriptions' : 'Előfizetés';
  const guideLabel = pageLanguage === 'en' ? 'Knowledge Base' : 'Tudásközpont';
  const privacyLabel = pageLanguage === 'en' ? 'Privacy' : 'Adatvédelem';
  const loginLabel = pageLanguage === 'en' ? 'Sign in' : 'Belépés';
  const currentPath = String(session?.currentPath || '');
  const currentGuildMatch = currentPath.match(/^\/dashboard\/guild\/(\d{16,22})(?:\/([a-z0-9-]+))?/i);
  const activeGuildId = currentGuildMatch?.[1] || null;
  const activeSection = currentGuildMatch?.[2] || (activeGuildId ? 'control' : '');
  const guildBase = activeGuildId ? `/dashboard/guild/${activeGuildId}` : '';
  const sideActiveKey = ownerView
    ? (title.startsWith('Owner Support') ? 'owner-support' : 'owner')
    : (title === 'Profile' || title === 'Profil' ? 'profile' : title.startsWith('Support #') || title === 'Web Support' ? 'support' : title === 'Értesítések' || title === 'Notifications' ? 'notifications' : title === 'Számlázás' || title === 'Subscription' ? 'billing' : title === 'Custom Commands' ? 'custom-commands' : activeGuildId ? activeSection : 'dashboard');
  const sideClass = (key) => sideActiveKey === key ? ' side-link active' : ' side-link';
  const nav = (key, href, icon, enLabel, huLabel = enLabel) => `<a class="${sideClass(key).trim()}" data-nav-label="${escapeHtml((pageLanguage === 'en' ? enLabel : huLabel).toLowerCase())}" href="${href}"><span class="side-icon">${icon}</span><span>${pageLanguage === 'en' ? enLabel : huLabel}</span></a>`;
  let sidebarGuilds = [];
  if (user) {
    sidebarGuilds = (session?.guilds || []).filter((item) => {
      if (item.id === activeGuildId) return true;
      try {
        const permissions = BigInt(item.permissions || '0');
        return Boolean(item.owner || (permissions & PermissionFlagsBits.Administrator) !== 0n || (permissions & PermissionFlagsBits.ManageGuild) !== 0n);
      } catch (_error) { return false; }
    }).slice(0, 40);
  }
  const currentGuild = activeGuildId ? sidebarGuilds.find((item) => item.id === activeGuildId) : null;
  const serverSwitcher = activeGuildId ? `<div class="server-context"><div class="server-context-label">${pageLanguage === 'en' ? 'Active server' : 'Aktív szerver'}</div><select class="server-select" data-server-switch aria-label="${pageLanguage === 'en' ? 'Switch server' : 'Szerverváltás'}"><option value="${guildBase}/control">${escapeHtml(currentGuild?.name || title.split('•').pop()?.trim() || activeGuildId)}</option>${sidebarGuilds.filter((item)=>item.id!==activeGuildId).map((item)=>`<option value="/dashboard/guild/${escapeHtml(item.id)}/control">${escapeHtml(item.name)}</option>`).join('')}<option value="/dashboard">— ${pageLanguage === 'en' ? 'All servers' : 'Összes szerver'} —</option></select><div class="server-context-id">${escapeHtml(activeGuildId)}</div></div>` : '';
  const serverNav = activeGuildId ? `${serverSwitcher}<div class="side-search"><span>⌕</span><input data-nav-search type="search" autocomplete="off" placeholder="${pageLanguage === 'en' ? 'Find…  Ctrl K' : 'Keresés…  Ctrl K'}"></div><div class="side-label">${pageLanguage === 'en' ? 'Server workspace' : 'Szerverkezelés'}</div>${nav('control',`${guildBase}/control`,'◈','Control Center','Kezelőközpont')}${nav('overview',`${guildBase}/overview`,'▥','Server status','Szerverállapot')}${nav('custom-commands',`${guildBase}/commands`,'⌘','Custom Commands','Egyedi parancsok')}<a class="side-link" data-nav-label="${pageLanguage === 'en' ? 'subscription' : 'előfizetés'}" href="/billing?guild=${escapeHtml(activeGuildId)}"><span class="side-icon">◉</span><span>${pageLanguage === 'en' ? 'Subscription' : 'Előfizetés'}</span></a><div class="side-label">${pageLanguage === 'en' ? 'Navigation' : 'Navigáció'}</div>${nav('dashboard','/dashboard','←','All servers','Összes szerver')}` : '';
  const sidebarNavigation = ownerView
    ? `<div class="side-search"><span>⌕</span><input data-nav-search type="search" autocomplete="off" placeholder="${pageLanguage === 'en' ? 'Find owner tools…  Ctrl K' : 'Owner eszköz keresése…  Ctrl K'}"></div><div class="side-label">Owner Operations</div>${nav('owner','/owner#overview','◈','Overview','Áttekintés')}${nav('owner-support','/owner/support','🎫','Support Operations','Support műveletek')}<a class="side-link" data-nav-label="servers" href="/owner#servers"><span class="side-icon">▦</span><span>${pageLanguage === 'en' ? 'Servers' : 'Szerverek'}</span></a><a class="side-link" data-nav-label="subscriptions" href="/owner#packages"><span class="side-icon">✦</span><span>${pageLanguage === 'en' ? 'Subscriptions' : 'Előfizetések'}</span></a><a class="side-link" data-nav-label="access" href="/owner#access"><span class="side-icon">◇</span><span>${pageLanguage === 'en' ? 'Access' : 'Hozzáférések'}</span></a><a class="side-link" data-nav-label="system" href="/owner#system"><span class="side-icon">⬡</span><span>${pageLanguage === 'en' ? 'System' : 'Rendszer'}</span></a><a class="side-link" data-nav-label="audit errors" href="/owner#audit"><span class="side-icon">⌁</span><span>${pageLanguage === 'en' ? 'Audit & errors' : 'Audit és hibák'}</span></a><div class="side-label">${pageLanguage === 'en' ? 'Quick access' : 'Gyors elérés'}</div>${nav('dashboard','/dashboard','←','Server network','Szerverhálózat')}`
    : `${serverNav || `<div class="side-search"><span>⌕</span><input data-nav-search type="search" autocomplete="off" placeholder="${pageLanguage === 'en' ? 'Find a section…  Ctrl K' : 'Menü keresése…  Ctrl K'}"></div><div class="side-label">Command Deck</div>${nav('dashboard','/dashboard','◈','Servers','Szerverek')}`}${isOwnerUser(user?.id) ? `<div class="side-label">Owner</div>${nav('owner','/owner','⌾','Owner Center','Owner Center')}` : ''}<div class="side-label">${pageLanguage === 'en' ? 'Account' : 'Fiók'}</div>${nav('profile','/profile','◎','Profile','Profil')}${nav('support','/support','🎫','Support','Support')}${nav('notifications','/notifications','🔔','Notifications','Értesítések')}${nav('billing','/billing','◉','Subscription','Előfizetés')}`;
  const pageDescription = pageLanguage === 'en'
    ? 'NEXA Bot is a secure Discord management platform for moderation, support, community automation, AI and server protection.'
    : 'A NEXA Bot biztonságos Discord management platform moderációhoz, supporthoz, közösségi automatizáláshoz, AI-hoz és szervervédelemhez.';
  const avatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${escapeHtml(user.id)}/${escapeHtml(user.avatar)}.png?size=128` : '';
  const userMenu = user ? `<details class="profile-menu"><summary aria-label="${pageLanguage === 'en' ? 'Open account menu' : 'Fiókmenü megnyitása'}">${avatarUrl ? `<img class="avatar" alt="" src="${avatarUrl}">` : `<span class="avatar avatar-fallback">${escapeHtml(String(user.global_name || user.username || 'N').slice(0, 1).toUpperCase())}</span>`}<span class="profile-summary"><strong>${escapeHtml(user.global_name || user.username)}</strong><small>@${escapeHtml(user.username)}</small></span><span class="profile-chevron">⌄</span></summary><div class="profile-popover"><div class="profile-popover-head"><strong>${escapeHtml(user.global_name || user.username)}</strong><span>${escapeHtml(user.id)}</span></div><a href="/profile">${pageLanguage === 'en' ? 'Profile & language' : 'Profil és nyelv'}</a><a href="/dashboard">${pageLanguage === 'en' ? 'Server network' : 'Szerverhálózat'}</a>${isOwnerUser(user.id) ? `<a href="/owner">Owner Center</a>` : ''}<a class="profile-logout" href="/logout">${pageLanguage === 'en' ? 'Sign out' : 'Kilépés'}</a></div></details>` : `<a class="btn small" href="/login">${loginLabel}</a>`;
  const localeSwitcher = ownerView
    ? '<div class="locale-switch owner-language-lock" title="Az Owner Center kizárólag magyar nyelvű"><span>OWNER · HU</span></div>'
    : `<div class="locale-switch" aria-label="Language"><a class="${pageLanguage === 'hu' ? 'active' : ''}" href="${huUrl}">HU</a><a class="${pageLanguage === 'en' ? 'active' : ''}" href="${enUrl}">EN</a></div>`;
  return `<!doctype html>
<html lang="${pageLanguage}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07100e"><meta name="description" content="${escapeHtml(pageDescription)}"><title>${escapeHtml(title)} • NexaBot</title><style>
.owner-server-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.owner-server{display:grid;gap:18px;overflow:hidden;min-width:0}.owner-server-head{display:flex;align-items:center;gap:14px;min-width:0}.owner-server-head img,.owner-server-head .server-icon{width:58px;height:58px;flex:0 0 58px;border-radius:17px;background:var(--card2);display:grid;place-items:center;object-fit:cover;font-size:18px;font-weight:900;border:1px solid var(--line)}.owner-server-title{min-width:0}.owner-server-title h3{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:0}.owner-server-title .server-name{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.owner-server-id{font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#718099;margin-top:5px;overflow-wrap:anywhere}.owner-server-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.owner-server-metric{padding:11px 9px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.022)}.owner-server-metric strong{display:block;font-size:17px}.owner-server-metric span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.6px}.owner-server-details{display:grid;grid-template-columns:1fr 1fr;gap:7px 15px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}.owner-server-details strong{color:#dce3f2}.owner-server-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.owner-server-actions>.btn,.owner-server-actions>form>.btn{width:100%;min-height:44px}.owner-package{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}.owner-package select{min-width:0}.owner-server-actions form:not(.owner-package){margin:0}.owner-server.blacklisted{border-color:rgba(255,97,116,.38)}.owner-search{display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:9px;margin:0 0 18px}.owner-search input[type=search]{width:100%;border:1px solid var(--line);border-radius:11px;background:#080c15;color:#fff;padding:11px;font:inherit;outline:none}.owner-search input[type=search]:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 14%,transparent)}.pagination{display:flex;align-items:center;justify-content:center;gap:14px;margin:18px 0;color:var(--muted);font-size:13px;font-weight:800}.status-list{display:grid;gap:9px}.status-row{display:grid;grid-template-columns:minmax(170px,.7fr) 1fr;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}.status-row:last-child{border-bottom:0}.status-ok{color:var(--accent)}.status-bad{color:var(--red)}@media(max-width:1180px){.owner-server-grid{grid-template-columns:1fr}}@media(max-width:600px){.owner-search{grid-template-columns:1fr}.owner-server-metrics{grid-template-columns:repeat(2,1fr)}.owner-server-details{grid-template-columns:1fr}.owner-server-actions{grid-template-columns:1fr}.owner-package{grid-column:auto;grid-template-columns:1fr}.owner-server-actions>.btn,.owner-server-actions>form{width:100%}.status-row{grid-template-columns:1fr;gap:3px}}
:root{color-scheme:dark;--bg:#05070d;--panel:#0b0f19;--card:#101725;--card2:#171f31;--line:#29344c;--text:#f8f9ff;--muted:#9ca8bf;--primary:${primary};--accent:${accent};--cyan:#54d7ff;--red:#ff6174;--gold:#ffca64;--shadow:0 28px 90px rgba(0,0,0,.42)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(1100px 650px at 78% -10%,color-mix(in srgb,var(--primary) 29%,transparent),transparent 70%),radial-gradient(760px 520px at -8% 28%,rgba(84,215,255,.10),transparent 72%),linear-gradient(180deg,#060812 0,var(--bg) 42%);color:var(--text);font:16px/1.58 Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh}a{color:inherit}.topbar{position:sticky;top:0;z-index:20;height:72px;background:rgba(5,7,13,.76);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,.075)}.topbar-inner{height:100%;padding:0 24px;display:flex;align-items:center;gap:14px}.brand{display:flex;align-items:center;gap:11px;font-size:19px;font-weight:900;text-decoration:none;letter-spacing:-.4px}.brand-mark{width:40px;height:40px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(145deg,var(--primary),#2b1f70);box-shadow:0 0 0 1px rgba(255,255,255,.14),0 12px 34px color-mix(in srgb,var(--primary) 38%,transparent);position:relative}.brand-mark::after{content:"";position:absolute;inset:5px;border:1px solid rgba(255,255,255,.22);border-radius:10px}.brand span{color:var(--accent)}.live-pill{display:flex;align-items:center;gap:7px;border:1px solid rgba(82,224,164,.25);background:rgba(82,224,164,.07);color:#b8f8df;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800}.live-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}.spacer{flex:1}.user{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:13px}.avatar{width:38px;height:38px;border-radius:13px;background:var(--card2);border:1px solid var(--line)}.app{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:calc(100vh - 72px)}.sidebar{position:sticky;top:72px;height:calc(100vh - 72px);padding:24px 16px;border-right:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(11,15,25,.92),rgba(7,10,17,.62))}.side-label{padding:8px 12px;color:#65708a;font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase}.side-link{display:flex;align-items:center;gap:10px;margin:3px 0;padding:11px 12px;border-radius:11px;color:var(--muted);font-weight:700;text-decoration:none}.side-link:hover,.side-link.active{color:#fff;background:linear-gradient(90deg,color-mix(in srgb,var(--primary) 26%,transparent),rgba(84,215,255,.035));box-shadow:inset 3px 0 var(--primary)}main{width:100%;max-width:1320px;margin:0 auto;padding:36px 32px 96px}.public-main{max-width:1240px}.hero{padding:80px 0 52px}.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid color-mix(in srgb,var(--primary) 35%,transparent);border-radius:999px;background:color-mix(in srgb,var(--primary) 9%,transparent);color:#d6ceff;font-size:12px;font-weight:900;letter-spacing:.7px;text-transform:uppercase}.hero h1{max-width:960px;font-size:clamp(44px,8vw,88px);line-height:.96;margin:22px 0;letter-spacing:-4px}.gradient{background:linear-gradient(105deg,#fff 18%,color-mix(in srgb,var(--primary) 65%,#fff) 57%,var(--cyan));-webkit-background-clip:text;color:transparent}.lead{color:var(--muted);max-width:780px;font-size:clamp(17px,2vw,21px)}.actions{display:flex;flex-wrap:wrap;gap:11px;margin-top:28px}.btn{border:0;border-radius:12px;background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary) 65%,#221c54));color:#fff;padding:12px 17px;font:inherit;font-weight:850;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 10px 28px color-mix(in srgb,var(--primary) 25%,transparent);transition:.18s transform,.18s border-color,.18s filter}.btn:hover{transform:translateY(-2px);filter:brightness(1.08)}.btn.secondary{background:rgba(255,255,255,.035);border:1px solid var(--line);box-shadow:none}.btn.green{background:linear-gradient(135deg,#168b64,#11634b);box-shadow:0 10px 25px rgba(22,139,100,.18)}.btn.small{padding:8px 11px;font-size:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:15px}.bento{grid-template-columns:repeat(12,1fr)}.bento .card{grid-column:span 4}.card{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(19,27,43,.96),rgba(10,14,24,.96));border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:22px;box-shadow:var(--shadow)}.card::before{content:"";position:absolute;width:190px;height:190px;border-radius:50%;background:color-mix(in srgb,var(--primary) 9%,transparent);filter:blur(52px);right:-90px;top:-100px;pointer-events:none}.card h2,.card h3{position:relative;margin:0 0 8px;letter-spacing:-.3px}.feature-icon{width:46px;height:46px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--primary) 28%,transparent);border-radius:14px;background:color-mix(in srgb,var(--primary) 12%,transparent);font-size:22px;margin-bottom:16px}.muted{color:var(--muted)}.notice{padding:13px 15px;border-radius:12px;margin:0 0 18px;background:rgba(82,224,164,.08);border:1px solid rgba(82,224,164,.25);color:#bdf7df}.warn{background:rgba(244,185,66,.08);border-color:rgba(244,185,66,.26);color:#ffe2a5}.error{background:rgba(239,91,108,.09);border-color:rgba(239,91,108,.28);color:#ffc0ca}.server{display:flex;align-items:center;gap:14px}.server img,.server-icon{width:56px;height:56px;border-radius:17px;background:var(--card2);display:grid;place-items:center;font-size:20px;font-weight:900;border:1px solid var(--line)}.server-body{min-width:0;flex:1}.server-body h1,.server-body h3{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}.page-head{display:flex;align-items:center;gap:15px;margin-bottom:24px}.page-head h1{font-size:clamp(30px,5vw,46px);letter-spacing:-1.5px}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0}.stat{padding:17px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012))}.stat-value{font-size:25px;font-weight:900}.stat-label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px}.section{scroll-margin-top:94px}.section-title{display:flex;align-items:center;gap:9px;margin:0 0 14px;font-size:22px}.section-kicker{font-size:11px;text-transform:uppercase;letter-spacing:1.15px;color:#a99cff;font-weight:900}.settings{display:grid;grid-template-columns:1fr;gap:17px}.field-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:14px}.module-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}label{display:block;font-weight:750;margin-bottom:6px}.switch{display:flex;align-items:flex-start;gap:11px;background:rgba(255,255,255,.026);border:1px solid var(--line);border-radius:14px;padding:13px;margin:0;min-height:60px}.switch:hover{border-color:color-mix(in srgb,var(--primary) 45%,var(--line))}.switch input{width:20px;height:20px;accent-color:var(--primary);flex:0 0 auto;margin-top:2px}.switch.locked{opacity:.64;border-style:dashed;background:rgba(255,255,255,.014)}.plan-tag{display:inline-flex;margin-left:6px;padding:2px 7px;border-radius:999px;background:linear-gradient(135deg,#6950ff,#294d86);font-size:10px;letter-spacing:.8px;color:#fff}select,textarea,input[type=text],input[type=number],input[type=url],input[type=color]{width:100%;border:1px solid var(--line);border-radius:11px;background:#080c15;color:#fff;padding:11px;font:inherit;outline:none}select:focus,textarea:focus,input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 14%,transparent)}input[type=color]{height:46px;padding:5px}textarea{min-height:105px;resize:vertical}.help{font-size:12px;color:var(--muted);margin-top:5px}.savebar{position:sticky;bottom:12px;z-index:8;background:rgba(15,21,34,.94);backdrop-filter:blur(20px);border:1px solid var(--line);border-radius:16px;padding:11px 13px;display:flex;align-items:center;gap:12px;box-shadow:0 18px 58px #000}.savebar .btn{margin-left:auto}.footer-note{text-align:center;color:#59647a;font-size:12px;margin-top:42px}@media(max-width:900px){.app{grid-template-columns:1fr}.sidebar{display:none}.bento .card{grid-column:span 6}.stats{grid-template-columns:repeat(2,1fr)}main{padding:26px 18px 82px}}@media(max-width:600px){.topbar{height:64px}.topbar-inner{padding:0 14px}.brand-text,.user span,.live-pill{display:none}.app{min-height:calc(100vh - 64px)}main{padding:22px 13px 78px}.hero{padding-top:42px}.hero h1{letter-spacing:-2.4px}.bento{display:grid;grid-template-columns:1fr}.bento .card{grid-column:auto}.card{padding:16px;border-radius:15px}.stats{grid-template-columns:1fr 1fr}.stat{padding:13px}.stat-value{font-size:20px}.savebar{bottom:7px}.savebar .muted{font-size:11px}.page-head{align-items:flex-start}}
.badge{display:inline-block;padding:3px 8px;border-radius:999px;background:rgba(82,224,164,.12);color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.7px;vertical-align:middle}.badge.pro{background:rgba(124,92,255,.16);color:#c9c0ff}.badge.ultimate{background:linear-gradient(135deg,rgba(124,92,255,.25),rgba(84,215,255,.14));color:#dcd8ff}.command-deck{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(320px,.88fr);gap:18px;align-items:stretch}.deck-panel{min-height:390px;background:linear-gradient(145deg,rgba(16,23,38,.97),rgba(7,11,20,.98));border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:20px;box-shadow:0 36px 110px rgba(0,0,0,.48);position:relative;overflow:hidden}.deck-panel::after{content:"";position:absolute;inset:auto -80px -110px auto;width:280px;height:280px;border-radius:50%;background:color-mix(in srgb,var(--cyan) 13%,transparent);filter:blur(50px)}.deck-top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px}.deck-row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:13px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.022);margin:9px 0}.deck-row strong{display:block}.pulse{width:9px;height:9px;background:var(--accent);border-radius:50%;box-shadow:0 0 0 6px rgba(82,224,164,.08),0 0 18px var(--accent)}.metric-orbit{display:grid;place-items:center;min-height:390px}.orbit{width:min(320px,78vw);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at center,#111a2c 0 37%,transparent 38%),conic-gradient(from 20deg,var(--primary),var(--cyan),var(--accent),var(--primary));padding:2px;box-shadow:0 0 90px color-mix(in srgb,var(--primary) 20%,transparent)}.orbit-core{width:76%;height:76%;border-radius:50%;background:#090e19;display:grid;place-items:center;text-align:center;border:1px solid rgba(255,255,255,.1)}.orbit-core strong{font-size:52px;line-height:1}.eyeline{height:1px;background:linear-gradient(90deg,transparent,var(--primary),var(--cyan),transparent);margin:58px 0 32px}.feature-wide{grid-column:span 8!important}.feature-narrow{grid-column:span 4!important}.navlinks{display:flex;gap:6px;padding:4px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.018)}.navlinks a{position:relative;color:var(--muted);text-decoration:none;font-size:13px;font-weight:800;padding:8px 11px;border-radius:9px}.navlinks a:hover{color:#fff;background:rgba(255,255,255,.05)}.navlinks a.active{color:#fff;background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 34%,transparent),rgba(84,215,255,.09));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 40%,transparent)}.navlinks a.active::after{content:"";position:absolute;left:28%;right:28%;bottom:-5px;height:2px;border-radius:2px;background:var(--accent);box-shadow:0 0 10px var(--accent)}.btn.danger{background:linear-gradient(135deg,#a92c45,#651d30);box-shadow:0 10px 25px rgba(169,44,69,.18)}.owner-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.record-list{display:grid;gap:10px}.record{display:grid;grid-template-columns:minmax(170px,.75fr) repeat(3,minmax(150px,1fr)) auto;gap:10px;align-items:end;padding:14px;border:1px solid var(--line);border-radius:15px;background:rgba(255,255,255,.022)}.record .actions{margin:0}.template-card{border-color:color-mix(in srgb,var(--primary) 28%,var(--line))}.secret-state{display:flex;align-items:center;gap:8px;color:var(--accent);font-weight:850}.secret-state::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 14px currentColor}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:9px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.7px}@media(max-width:1100px){.record{grid-template-columns:1fr 1fr}.record>div:first-child{grid-column:1/-1}}@media(max-width:900px){.command-deck{grid-template-columns:1fr}.feature-wide,.feature-narrow{grid-column:span 6!important}.navlinks{display:none}}@media(max-width:600px){.feature-wide,.feature-narrow{grid-column:auto!important}.deck-panel,.metric-orbit{min-height:330px}.record{grid-template-columns:1fr}}
.desktop-owner-nav{position:sticky;top:84px;z-index:9;display:flex;align-items:center;gap:8px;padding:9px;margin:0 0 24px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(8,12,21,.9);backdrop-filter:blur(20px);box-shadow:0 14px 45px rgba(0,0,0,.28);overflow-x:auto}.desktop-owner-nav a{white-space:nowrap;text-decoration:none;color:var(--muted);font-size:12px;font-weight:850;padding:9px 13px;border-radius:10px}.desktop-owner-nav a:hover{color:#fff;background:rgba(124,92,255,.16)}.owner-mode .sidebar{overflow-y:auto}.owner-mode .section{scroll-margin-top:148px}.owner-mode .card{box-shadow:0 18px 60px rgba(0,0,0,.28)}.owner-mode .page-head{justify-content:space-between}.owner-mode .page-head>div{max-width:980px}.owner-mode .field-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.owner-mode table{font-size:13px}.owner-mode th,.owner-mode td{padding:12px 9px}.owner-mode input[type=password],.owner-mode input[type=datetime-local],.owner-mode input[type=search]{width:100%;border:1px solid var(--line);border-radius:11px;background:#080c15;color:#fff;padding:11px;font:inherit;outline:none}.owner-mode input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 14%,transparent)}@media(min-width:901px){.owner-mode .app{grid-template-columns:288px minmax(0,1fr)}.owner-mode main{max-width:1680px;padding:38px 44px 110px}.owner-mode .sidebar{padding:28px 19px}.owner-mode .side-link{padding:12px 14px}.owner-mode .stats{gap:15px}.owner-mode .stat{padding:20px}.owner-mode .card{padding:26px}.owner-mode .owner-server-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.owner-mode .owner-server-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1740px){.owner-mode .owner-server-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:900px){.desktop-owner-nav{top:76px}.owner-mode .page-head{align-items:flex-start;flex-direction:column}.owner-mode .page-head>.btn{width:100%}}

/* NEXA 15 Command Deck ---------------------------------------------------- */
.sidebar-toggle{display:none;width:40px;height:40px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.035);color:#fff;font-size:19px;cursor:pointer}.sidebar{background:linear-gradient(180deg,rgba(9,13,23,.98),rgba(5,8,14,.99));border-right:1px solid rgba(255,255,255,.075)}.side-label{margin-top:18px}.side-link{display:flex!important;align-items:center;gap:10px;min-height:42px;position:relative}.side-icon{width:23px;height:23px;display:grid;place-items:center;border-radius:7px;background:rgba(255,255,255,.035);font-size:12px;flex:0 0 23px}.side-link.active .side-icon{background:color-mix(in srgb,var(--primary) 25%,transparent);box-shadow:0 0 18px color-mix(in srgb,var(--primary) 18%,transparent)}.side-link.active::before{content:"";position:absolute;left:-10px;width:3px;height:24px;border-radius:4px;background:linear-gradient(var(--cyan),var(--primary));box-shadow:0 0 14px color-mix(in srgb,var(--cyan) 45%,transparent)}.side-search{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px;margin-bottom:12px;padding:8px 10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}.side-search input{width:100%;border:0!important;outline:0!important;background:transparent!important;color:#fff!important;padding:0!important;font-size:12px!important;box-shadow:none!important}.side-search span{color:var(--muted)}.server-context{margin:0 0 14px;padding:12px;border:1px solid rgba(255,255,255,.095);border-radius:15px;background:linear-gradient(145deg,rgba(118,87,255,.11),rgba(84,215,255,.035));box-shadow:inset 0 1px rgba(255,255,255,.035)}.server-context-label{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:900;margin-bottom:7px}.server-select{width:100%;font-weight:850;background:#090e19!important;border-color:rgba(255,255,255,.1)!important}.server-context-id{margin-top:7px;color:#617089;font:10px ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis}.contextbar{position:sticky;top:72px;z-index:8;padding:10px 0 11px;background:linear-gradient(180deg,rgba(5,7,13,.97),rgba(5,7,13,.76),transparent);backdrop-filter:blur(12px)}.control-ribbon{display:grid;grid-template-columns:1.3fr repeat(5,minmax(90px,1fr));gap:1px;margin:0 0 20px;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.06);box-shadow:0 18px 55px rgba(0,0,0,.22)}.control-ribbon>div{min-height:64px;padding:12px 14px;background:linear-gradient(180deg,rgba(14,20,34,.98),rgba(9,13,23,.98));display:flex;flex-direction:column;justify-content:center}.control-ribbon>div:first-child{flex-direction:row;align-items:center;justify-content:flex-start;gap:8px}.control-ribbon span,.control-ribbon small{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);font-weight:850}.control-ribbon strong{font-size:14px}.control-pulse{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 6px color-mix(in srgb,var(--accent) 9%,transparent),0 0 16px var(--accent)}.draft-state{font-size:11px;color:var(--muted);font-weight:800}.draft-state.unsaved{color:var(--gold)}.toast-stack{position:fixed;right:18px;bottom:18px;z-index:100;display:grid;gap:9px;max-width:min(420px,calc(100vw - 36px))}.nexa-toast{padding:13px 15px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(10,15,26,.96);box-shadow:0 22px 70px rgba(0,0,0,.42);backdrop-filter:blur(18px);font-size:13px;animation:nexaToastIn .22s ease-out}.nexa-toast.success{border-color:rgba(82,224,164,.28)}.nexa-toast.warn{border-color:rgba(255,202,100,.3)}@keyframes nexaToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.live-sync{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:900;letter-spacing:.6px;color:var(--gold)}.live-sync.is-live{color:var(--accent)}.live-sync.is-live::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor}.guild-settings .settings>section{transition:opacity .18s ease,transform .18s ease}.guild-settings.view-overview form[data-smart-settings]{display:none}.guild-settings.view-stats form[data-smart-settings]{display:none}.guild-settings:not(.view-overview):not(.view-stats) .grid[style*="margin:0 0 20px"]{display:none}.guild-settings.view-moderation .settings>section:not(#modules):not(#channels):not(#roles),.guild-settings.view-welcome .settings>section:not(#modules):not(#channels):not(#roles):not(#messages),.guild-settings.view-reaction-roles .settings>section:not(#modules):not(#roles),.guild-settings.view-auto-role .settings>section:not(#roles),.guild-settings.view-level .settings>section:not(#modules):not(#channels):not(#community),.guild-settings.view-giveaway .settings>section:not(#modules):not(#channels),.guild-settings.view-tickets .settings>section:not(#tickets),.guild-settings.view-logs .settings>section:not(#modules):not(#logs):not(#channels),.guild-settings.view-ai .settings>section:not(#modules):not(#ai),.guild-settings.view-automod .settings>section:not(#modules):not(#protection):not(#channels),.guild-settings.view-security .settings>section:not(#modules):not(#anti-raid):not(#protection):not(#bot-guard):not(#channels):not(#roles),.guild-settings.view-settings .settings>section:not(#modules):not(#messages):not(#branding):not(#channels):not(#roles){display:none}.guild-settings.view-moderation #modules [data-module]:not([data-module="moderation"]),.guild-settings.view-welcome #modules [data-module]:not([data-module="welcome"]),.guild-settings.view-reaction-roles #modules [data-module]:not([data-module="reactionRoles"]),.guild-settings.view-level #modules [data-module]:not([data-module="levels"]),.guild-settings.view-giveaway #modules [data-module]:not([data-module="giveaways"]),.guild-settings.view-logs #modules [data-module]:not([data-module="logging"]),.guild-settings.view-ai #modules [data-module]:not([data-module="ai"]),.guild-settings.view-automod #modules [data-module]:not([data-module="protection"]),.guild-settings.view-security #modules [data-module]:not([data-module="protection"]){display:none}.guild-settings.view-moderation #channels [data-field]:not([data-field="channel_moderationPanel"]):not([data-field="channel_logs"]),.guild-settings.view-moderation #roles [data-field]:not([data-field="role_staff"]),.guild-settings.view-welcome #channels [data-field]:not([data-field="channel_welcome"]):not([data-field="channel_goodbye"]),.guild-settings.view-welcome #roles [data-field]:not([data-field="role_auto"]):not([data-field="role_human"]):not([data-field="role_bot"]),.guild-settings.view-auto-role #roles [data-field]:not([data-field="role_auto"]):not([data-field="role_human"]):not([data-field="role_bot"]):not([data-field="role_verified"]),.guild-settings.view-level #channels [data-field]:not([data-field="channel_levels"]),.guild-settings.view-giveaway #channels [data-field]:not([data-field="channel_announcements"]),.guild-settings.view-logs #channels [data-field]:not([data-field="channel_logs"]):not([data-field="channel_securityLogs"]),.guild-settings.view-automod #channels [data-field]:not([data-field="channel_securityLogs"]),.guild-settings.view-security #channels [data-field]:not([data-field="channel_securityLogs"]),.guild-settings.view-settings #channels [data-field]:not([data-field="channel_controlCenter"]),.guild-settings.view-settings #roles [data-field]:not([data-field="role_dashboard"]){display:none}.guild-settings:not(.view-settings) .settings-jump{display:none}.guild-settings.view-settings .settings-jump{position:sticky;top:115px;z-index:7}.section-attention{animation:nexaAttention 1.2s ease}@keyframes nexaAttention{0%,100%{box-shadow:var(--shadow)}50%{box-shadow:0 0 0 2px var(--red),0 20px 70px rgba(255,97,116,.18)}}.support-composer[hidden],.support-closed[hidden]{display:none!important}.footer-release{font-size:10px;color:#66758e}
@media(max-width:1180px){.control-ribbon{grid-template-columns:repeat(3,1fr)}.control-ribbon>div:first-child{grid-column:span 3}}
@media(max-width:900px){.sidebar-toggle{display:grid;place-items:center}.app .sidebar{display:block;position:fixed;left:0;top:64px;bottom:0;width:min(310px,88vw);z-index:50;transform:translateX(-105%);transition:transform .22s ease;box-shadow:30px 0 80px rgba(0,0,0,.55);overflow:auto}.app .sidebar.open{transform:translateX(0)}.sidebar-backdrop{position:fixed;inset:64px 0 0;background:rgba(0,0,0,.52);backdrop-filter:blur(3px);z-index:49}.contextbar{top:64px}.control-ribbon{grid-template-columns:repeat(2,1fr)}.control-ribbon>div:first-child{grid-column:span 2}}
@media(max-width:600px){.control-ribbon{grid-template-columns:1fr 1fr}.control-ribbon>div{min-height:58px;padding:10px}.control-ribbon>div:first-child{grid-column:1/-1}.toast-stack{right:10px;bottom:10px;max-width:calc(100vw - 20px)}}

${dashboardTheme()}
.guild-settings.view-control .settings-jump{display:flex!important;position:sticky;top:115px;z-index:7}
/* NEXA 15.3 Calm Horizon profile shell */
.nexa-v153{--primary:#d6a16a;--accent:#79c4a3;--cyan:#80b7bf;--bg:#07100e;--panel:#0a1512;--card:#101d19;--card2:#172822;--line:#294039;--text:#f3f7f4;--muted:#96aaa2;--red:#e87986;--gold:#e1b46f}.profile-menu{position:relative}.profile-menu summary{display:flex;align-items:center;gap:9px;min-width:190px;padding:5px 8px;border:1px solid transparent;border-radius:14px;cursor:pointer;list-style:none}.profile-menu summary::-webkit-details-marker{display:none}.profile-menu[open] summary,.profile-menu summary:hover{background:#14231e;border-color:#314b42}.profile-summary{display:grid;min-width:0}.profile-summary strong,.profile-summary small{max-width:132px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.profile-summary strong{font-size:12px}.profile-summary small{color:var(--muted);font-size:10px}.profile-chevron{color:var(--muted)}.profile-popover{position:absolute;right:0;top:calc(100% + 10px);width:250px;padding:8px;border:1px solid #314b42;border-radius:16px;background:rgba(10,21,18,.99);box-shadow:0 24px 80px rgba(0,0,0,.55);z-index:70}.profile-popover-head{display:grid;padding:11px 12px;border-bottom:1px solid var(--line);margin-bottom:5px}.profile-popover-head span{color:var(--muted);font:10px ui-monospace,monospace}.profile-popover a{display:block;padding:10px 12px;border-radius:9px;text-decoration:none;font-size:12px;font-weight:800}.profile-popover a:hover{background:#172a23}.profile-popover .profile-logout{color:#f0a0aa}.avatar-fallback{display:grid;place-items:center;font-weight:900;color:#17100a;background:linear-gradient(145deg,var(--primary),#a66c3f)}.profile-hero{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:20px;padding:28px}.profile-avatar-large{width:92px;height:92px;border-radius:28px;border:1px solid #42675a;object-fit:cover;display:grid;place-items:center;background:linear-gradient(145deg,var(--primary),#8d5c38);font-size:32px;font-weight:950}.profile-identity h1{margin:0}.profile-identity code{color:var(--muted);font-size:12px}.language-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.language-card{display:flex;align-items:center;gap:13px;padding:17px;border:1px solid var(--line);border-radius:15px;background:#0d1a16;text-decoration:none}.language-card.active{border-color:var(--accent);box-shadow:0 0 0 2px rgba(121,196,163,.1)}.language-card b,.language-card span{display:block}.language-card span{color:var(--muted);font-size:12px}.readiness-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}.readiness-item{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:10px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#0d1a16;font:11px ui-monospace,monospace}.readiness-item.ready{border-color:#315d4b}.readiness-item.missing{border-color:#6c5130}.readiness-item.ready b{color:var(--accent)}.readiness-item.missing b{color:var(--gold)}.readiness-item small{grid-column:1/-1;color:var(--muted);line-height:1.5;white-space:normal;overflow-wrap:anywhere}

/* Calm Horizon: visible navigation, clearer cards and desktop-first spacing */
.nexa-v153{background:radial-gradient(900px 600px at 84% -12%,rgba(71,126,103,.24),transparent 72%),radial-gradient(760px 520px at -8% 66%,rgba(184,126,73,.11),transparent 72%),linear-gradient(155deg,#07100e 0,#09130f 48%,#080d0c 100%);background-attachment:fixed}.nexa-v153::before{background:linear-gradient(180deg,rgba(5,12,10,.05),rgba(5,11,9,.55))}.nexa-v153 .topbar{height:78px;background:rgba(7,16,14,.88);border-bottom:1px solid #263b34;box-shadow:0 10px 35px rgba(0,0,0,.24)}.nexa-v153 .topbar-inner{max-width:1920px;padding:0 30px}.nexa-v153 .brand-mark{background:linear-gradient(145deg,#e2b27e,#a96c3e);color:#1b120b;box-shadow:0 0 0 1px rgba(255,235,211,.28),0 12px 34px rgba(0,0,0,.34)}.nexa-v153 .brand-text{color:#f4f7f4}.nexa-v153 .brand-text span{color:#86d2b0}.nexa-v153 .live-pill{background:#0d211a;border-color:#285943;color:#a8dcc4}.nexa-v153 .live-dot{background:#7bc5a4;box-shadow:0 0 0 4px rgba(123,197,164,.09),0 0 16px rgba(123,197,164,.5)}.nexa-v153 .navlinks{background:#0b1713;border:1px solid #22372f}.nexa-v153 .navlinks a.active{background:#182821;box-shadow:inset 0 0 0 1px #365347}.nexa-v153 .navlinks a.active::after{background:var(--primary);box-shadow:none}.nexa-v153 .locale-switch{background:#0b1713;border-color:#294039}.nexa-v153 .locale-switch a.active{background:#23372f;color:#fff}.nexa-v153 .app{grid-template-columns:300px minmax(0,1fr);min-height:calc(100vh - 78px)}.nexa-v153 .sidebar{top:78px;height:calc(100vh - 78px);padding:25px 17px;background:linear-gradient(180deg,rgba(10,22,18,.98),rgba(7,15,13,.98));border-right:1px solid #22372f}.nexa-v153 .side-label{margin-top:20px;padding:8px 12px;color:#6f887e}.nexa-v153 .side-search,.nexa-v153 .server-context{border-color:#294039;background:#0d1b17}.nexa-v153 .server-context{background:linear-gradient(145deg,rgba(214,161,106,.10),rgba(121,196,163,.05))}.nexa-v153 .server-select{background:#0a1512!important;border-color:#304a40!important}.nexa-v153 .side-link{min-height:44px;border-radius:11px;color:#91a69d}.nexa-v153 .side-link:hover{background:#14241e;border-color:#2b453b}.nexa-v153 .side-link.active{background:linear-gradient(90deg,rgba(214,161,106,.17),rgba(121,196,163,.08));border-color:#365346;box-shadow:inset 3px 0 #d6a16a;color:#f7faf8}.nexa-v153 .side-link.active::before{display:none}.nexa-v153 .side-icon{background:#15251f;border:1px solid #263f35}.nexa-v153 .side-link.active .side-icon{background:#2a3f35;color:#f2c795;box-shadow:none}.nexa-v153 main{max-width:1640px;padding:36px 44px 120px}.nexa-v153 .contextbar{top:78px;padding:11px 2px 15px;background:linear-gradient(180deg,rgba(7,16,14,.98),rgba(7,16,14,.74),transparent);color:#789087}.nexa-v153 .contextbar strong{color:#d9e3de}.nexa-v153 .page-head{padding-bottom:22px;border-bottom:1px solid #20342d}.nexa-v153 .page-head h1{font-weight:860}.nexa-v153 .section-kicker{color:#dcb07d}.nexa-v153 .card{overflow:hidden;border:1px solid #294139;border-radius:18px;background:linear-gradient(145deg,rgba(19,34,29,.98),rgba(11,23,19,.98));box-shadow:0 18px 55px rgba(0,0,0,.24)}.nexa-v153 .card::before{background:rgba(121,196,163,.045)}.nexa-v153 .card:hover{border-color:#36554a}.nexa-v153 .stats{gap:10px;background:transparent;border:0}.nexa-v153 .stat{border:1px solid #294139;border-radius:14px;background:linear-gradient(145deg,#13231d,#0d1a16)}.nexa-v153 .control-ribbon{gap:9px;padding:9px;border-color:#294139;border-radius:18px;background:#0a1613}.nexa-v153 .control-ribbon>div{border:1px solid #233a31;border-radius:11px;background:linear-gradient(180deg,#14231e,#0e1a17)}.nexa-v153 .settings{gap:22px}.nexa-v153 .settings>.card{padding:26px}.nexa-v153 .module-grid{grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:11px}.nexa-v153 .switch{min-height:68px;background:#0e1b17;border-color:#294139}.nexa-v153 .switch:hover{background:#14251f;border-color:#416155}.nexa-v153 select,.nexa-v153 textarea,.nexa-v153 input[type=text],.nexa-v153 input[type=number],.nexa-v153 input[type=url],.nexa-v153 input[type=color],.nexa-v153 input[type=password],.nexa-v153 input[type=datetime-local],.nexa-v153 input[type=search]{background:#091411!important;border-color:#2d463c!important;color:#f3f7f4!important}.nexa-v153 select:focus,.nexa-v153 textarea:focus,.nexa-v153 input:focus{border-color:#77b99d!important;box-shadow:0 0 0 3px rgba(121,196,163,.11)!important}.nexa-v153 .btn{border:1px solid #e0b17c;background:linear-gradient(135deg,#e0ad76,#b87946);color:#1c120a;box-shadow:0 10px 24px rgba(89,51,25,.2)}.nexa-v153 .btn:hover{filter:brightness(1.07)}.nexa-v153 .btn.secondary{background:#14231e;border-color:#375248;color:#dbe7e1}.nexa-v153 .btn.green{background:linear-gradient(135deg,#70bc9a,#3f886c);border-color:#82caaa;color:#07140f}.nexa-v153 .btn.danger{background:linear-gradient(135deg,#b95a65,#7d3440);border-color:#d47680;color:#fff}.nexa-v153 .badge{background:#10241c;border-color:#32624e;color:#92d7b8}.nexa-v153 .badge.pro{background:#172821;border-color:#466556;color:#bad7ca}.nexa-v153 .badge.ultimate{background:#2a2018;border-color:#705034;color:#efc18f}.nexa-v153 .notice{background:#10231c;border-color:#315d4b;color:#b9e0cc}.nexa-v153 .notice.warn{background:#261e12;border-color:#6b512e;color:#efd09a}.nexa-v153 .notice.error,.nexa-v153 .error{background:#291519;border-color:#6d333d;color:#efb8c0}.nexa-v153 .settings-jump{top:82px;border-color:#294139;background:rgba(9,20,17,.95)}.nexa-v153 .settings-jump a.active{background:#24372f;box-shadow:inset 0 0 0 1px #496557}.nexa-v153 .owner-server,.nexa-v153 .server.card{background:linear-gradient(145deg,#12211c,#0c1915)}.nexa-v153 .owner-server-metrics{background:#294139;border-color:#294139}.nexa-v153 .owner-server-metric{background:#0f1d19}.nexa-v153 table{border-color:#294139}.nexa-v153 thead{background:#0b1714}.nexa-v153 th,.nexa-v153 td{border-color:#23372f}

/* Rebuilt subscription workspace */
.billing-page{max-width:1460px;margin:auto}.billing-page-head{align-items:center}.billing-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 18px}.billing-steps>div{display:flex;align-items:center;gap:12px;min-height:68px;padding:13px 16px;border:1px solid #263b34;border-radius:14px;background:#0b1714;color:#72877e}.billing-steps>div.active{border-color:#3d5c4f;background:linear-gradient(145deg,#14251f,#0e1b17);color:#dce8e2}.billing-steps span{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:#15251f;color:#7e958b;font:800 10px ui-monospace,monospace}.billing-steps .active span{background:#3a2b1d;color:#efc18f}.billing-steps strong{font-size:12px}.billing-selector{display:grid;grid-template-columns:minmax(260px,.9fr) minmax(360px,1.3fr) auto;align-items:center;gap:18px;margin:0 0 18px;padding:18px 20px}.billing-selector form{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:9px;margin:0}.billing-selected-server{display:flex;align-items:center;gap:12px;min-width:0}.billing-selected-server img,.billing-selected-server>.server-icon{width:48px;height:48px;flex:0 0 48px;border:1px solid #3a584c;border-radius:13px;object-fit:cover;display:grid;place-items:center;background:#172822}.billing-selected-server div{display:grid;min-width:0}.billing-selected-server span,.billing-selected-server small{color:var(--muted);font-size:10px}.billing-selected-server strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.billing-health{display:flex;align-items:center;gap:8px;white-space:nowrap;color:#e0b46f;font-size:11px;font-weight:850}.billing-health i{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor}.billing-health.ready{color:#79c4a3}.billing-grid{grid-template-columns:minmax(290px,.58fr) minmax(640px,1.42fr);align-items:start;gap:18px}.billing-grid>section:first-child{position:sticky;top:132px}.billing-plans-shell{padding:27px}.billing-plans-shell>h2{margin-bottom:20px}.billing-plans{grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.billing-plan{display:flex;flex-direction:column;min-height:560px;padding:22px;border:1px solid #2d463c;border-radius:16px;background:linear-gradient(160deg,#14241f,#0d1916);box-shadow:inset 0 1px rgba(255,255,255,.025)}.billing-plan.featured{border-color:#745235;box-shadow:inset 0 3px #d6a16a}.billing-plan-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.billing-plan h3{margin:16px 0 2px;font-size:31px;letter-spacing:-1px}.billing-plan h3 small{color:var(--muted);font-size:12px;font-weight:700}.billing-recommended{padding:6px 8px;border:1px solid #6e4d32;border-radius:8px;background:#2c2017;color:#edc08e;font:850 9px ui-monospace,monospace;letter-spacing:.7px}.billing-feature-list{list-style:none;margin:22px 0;padding:0;border-top:1px solid #263c34}.billing-feature-list li{padding:10px 0;border-bottom:1px solid #23372f;color:#abc0b7;font-size:12px}.billing-feature-list li::before{content:'✓';margin-right:9px;color:#79c4a3;font-weight:900}.billing-plan form{display:flex;flex-direction:column;gap:10px;margin-top:auto}.billing-cycle{gap:8px;margin:0}.billing-cycle label{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:3px 8px;margin:0;padding:11px;border-color:#304a40;background:#0b1714;cursor:pointer}.billing-cycle label:has(input:checked){border-color:#c18a56;background:#2a2018;box-shadow:inset 0 0 0 1px rgba(214,161,106,.2)}.billing-cycle label small{grid-column:2;color:#d09a62;font-size:9px}.billing-plan .btn{width:100%;min-height:48px}.checkout-trust{text-align:center;color:#6f887e;font-size:10px;letter-spacing:.35px}.billing-client-error{margin:0!important}.btn.is-loading{cursor:wait;opacity:.86}.btn.is-loading::before{content:'';width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:nexaSpin .7s linear infinite}@keyframes nexaSpin{to{transform:rotate(360deg)}}.billing-diagnostics{margin-top:18px;padding:0}.billing-diagnostics summary{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 23px;cursor:pointer;list-style:none}.billing-diagnostics summary::-webkit-details-marker{display:none}.billing-diagnostics summary>span{display:grid;gap:5px}.billing-diagnostics summary strong{font-size:17px}.billing-diagnostics summary>b{color:#d8aa75;font:850 10px ui-monospace,monospace}.billing-diagnostics[open] summary{border-bottom:1px solid #294139}.billing-diagnostics-body{padding:22px}.billing-diagnostics:not([open]) .billing-diagnostics-body{display:none}

@media(min-width:1500px){.nexa-v153 .owner-server-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:1180px){.billing-selector{grid-template-columns:1fr}.billing-selector form{grid-template-columns:1fr auto}.billing-grid{grid-template-columns:1fr}.billing-grid>section:first-child{position:static}.billing-plan{min-height:520px}}@media(max-width:900px){.nexa-v153 .topbar{height:64px}.nexa-v153 .app{grid-template-columns:1fr}.nexa-v153 .app .sidebar{top:64px;height:calc(100vh - 64px)}.nexa-v153 main{padding:24px 18px 96px}.nexa-v153 .contextbar{top:64px}.billing-steps{grid-template-columns:1fr}.billing-plans{grid-template-columns:1fr}.billing-plan{min-height:0}.billing-selector form{grid-template-columns:1fr}.billing-selector .btn{width:100%}}@media(max-width:760px){.profile-summary{display:none}.profile-menu summary{min-width:auto}.profile-hero{grid-template-columns:1fr;text-align:center}.profile-avatar-large{margin:auto}.language-grid,.readiness-grid{grid-template-columns:1fr}.billing-page-head{align-items:flex-start}.billing-page-head>.btn{width:100%}.billing-selector{padding:15px}.billing-plans-shell{padding:18px}.billing-diagnostics summary{align-items:flex-start;flex-direction:column}}

/* NEXA Azure Command — calm, desktop-first operations theme */
.footer-release{font-size:0!important}.footer-release::after{content:'NEXA Bot 20.3.1 • NEXA OS Studio';font-size:10px}
.nexa-v153{--primary:#4b9dff;--accent:#5ed8c4;--cyan:#78c8ff;--bg:#07101d;--panel:#0a1423;--card:#0e1b2d;--card2:#13243a;--line:#263b55;--text:#f4f8ff;--muted:#91a4bd;--red:#ff7185;--gold:#efc46b;background:radial-gradient(1050px 640px at 82% -12%,rgba(63,137,225,.22),transparent 70%),radial-gradient(820px 580px at -12% 78%,rgba(61,188,171,.10),transparent 72%),linear-gradient(150deg,#07101d 0,#091625 48%,#07111f 100%);background-attachment:fixed}.nexa-v153::before{background:linear-gradient(180deg,rgba(4,10,19,.03),rgba(4,10,19,.52))}.nexa-v153 .topbar{background:rgba(6,15,27,.9);border-bottom-color:#20344d;box-shadow:0 12px 40px rgba(0,0,0,.26)}.nexa-v153 .brand-mark{background:linear-gradient(145deg,#6fc4ff,#3578dc);color:#04101f;box-shadow:0 0 0 1px rgba(192,229,255,.3),0 13px 38px rgba(37,116,213,.25)}.nexa-v153 .brand-text span{color:#6fe1cd}.nexa-v153 .live-pill{background:#0b211f;border-color:#245950;color:#a9eee0}.nexa-v153 .live-dot{background:#62d9c5;box-shadow:0 0 0 4px rgba(98,217,197,.09),0 0 18px rgba(98,217,197,.55)}.nexa-v153 .navlinks,.nexa-v153 .locale-switch{background:#0b1727;border-color:#253a53}.nexa-v153 .navlinks a.active,.nexa-v153 .locale-switch a.active{background:#172b44;box-shadow:inset 0 0 0 1px #315074}.nexa-v153 .app{grid-template-columns:286px minmax(0,1fr)}.nexa-v153 .sidebar{background:linear-gradient(180deg,rgba(9,20,35,.985),rgba(5,13,24,.99));border-right-color:#1f344c}.nexa-v153 .side-label{color:#6f88a7}.nexa-v153 .side-search,.nexa-v153 .server-context{border-color:#29415d;background:#0b192a}.nexa-v153 .server-context{background:linear-gradient(145deg,rgba(75,157,255,.13),rgba(94,216,196,.045))}.nexa-v153 .server-select{background:#081524!important;border-color:#2d4868!important}.nexa-v153 .side-link{color:#91a7c2}.nexa-v153 .side-link:hover{background:#10223a;border-color:#29496b}.nexa-v153 .side-link.active{background:linear-gradient(90deg,rgba(75,157,255,.20),rgba(94,216,196,.065));border-color:#32618b;box-shadow:inset 3px 0 #5fb5ff,0 10px 26px rgba(0,0,0,.12);color:#f7fbff}.nexa-v153 .side-icon{background:#12263e;border-color:#29435f}.nexa-v153 .side-link.active .side-icon{background:#1d4266;color:#8ad8ff}.nexa-v153 main{max-width:1700px;padding:38px 46px 120px}.nexa-v153 .contextbar{background:linear-gradient(180deg,rgba(7,16,29,.985),rgba(7,16,29,.74),transparent);color:#7991ae}.nexa-v153 .contextbar strong{color:#dceaff}.nexa-v153 .page-head{border-bottom-color:#203750}.nexa-v153 .section-kicker{color:#70c8ff}.nexa-v153 .card{border-color:#263e5a;background:linear-gradient(145deg,rgba(15,30,49,.98),rgba(9,20,35,.98));box-shadow:0 22px 68px rgba(0,0,0,.25)}.nexa-v153 .card::before{display:block;background:rgba(75,157,255,.055)}.nexa-v153 .card:hover{border-color:#355b7f}.nexa-v153 .stat{border-color:#28435f;background:linear-gradient(145deg,#11263e,#0b1b2d)}.nexa-v153 .control-ribbon{border-color:#28415d;background:#081624}.nexa-v153 .control-ribbon>div{border-color:#213a55;background:linear-gradient(180deg,#11263d,#0b1a2c)}.nexa-v153 .settings-jump{border-color:#2a4664;background:rgba(8,21,36,.96);box-shadow:0 14px 45px rgba(0,0,0,.25)}.nexa-v153 .settings-jump a{color:#91a9c4}.nexa-v153 .settings-jump a:hover,.nexa-v153 .settings-jump a.active{background:#183450;color:#fff;box-shadow:inset 0 0 0 1px #396589}.nexa-v153 .switch{background:#0c1c2e;border-color:#263f5b}.nexa-v153 .switch:hover{background:#112740;border-color:#3a6389}.nexa-v153 select,.nexa-v153 textarea,.nexa-v153 input[type=text],.nexa-v153 input[type=number],.nexa-v153 input[type=url],.nexa-v153 input[type=color],.nexa-v153 input[type=password],.nexa-v153 input[type=datetime-local],.nexa-v153 input[type=search]{background:#071523!important;border-color:#2a4563!important;color:#f4f8ff!important}.nexa-v153 select:focus,.nexa-v153 textarea:focus,.nexa-v153 input:focus{border-color:#58aaff!important;box-shadow:0 0 0 3px rgba(75,157,255,.13)!important}.nexa-v153 .btn{border-color:#6db8ff;background:linear-gradient(135deg,#58abff,#3474d0);color:#fff;box-shadow:0 11px 28px rgba(38,105,191,.24)}.nexa-v153 .btn.secondary{background:#11243a;border-color:#31506f;color:#dceaff}.nexa-v153 .btn.green{background:linear-gradient(135deg,#62d9c5,#2e9f8d);border-color:#78ead6;color:#041713}.nexa-v153 .badge{background:#0c2928;border-color:#2b6760;color:#8ee6d7}.nexa-v153 .badge.pro{background:#112c48;border-color:#35658f;color:#9ed3ff}.nexa-v153 .badge.ultimate{background:#182844;border-color:#4c6896;color:#bfd7ff}.nexa-v153 .notice{background:#0d2928;border-color:#296158;color:#b7e9df}.nexa-v153 .notice.warn{background:#2b2414;border-color:#6d582d;color:#f0d79c}.nexa-v153 .notice.error,.nexa-v153 .error{background:#2a151d;border-color:#753344;color:#ffc1cc}.nexa-v153 .owner-server,.nexa-v153 .server.card{background:linear-gradient(145deg,#10243a,#091929)}.nexa-v153 .owner-server-metrics{background:#29425e;border-color:#29425e}.nexa-v153 .owner-server-metric{background:#0d1d30}.nexa-v153 .profile-menu[open] summary,.nexa-v153 .profile-menu summary:hover{background:#10243a;border-color:#315273}.nexa-v153 .profile-popover{background:rgba(8,20,34,.99);border-color:#315273}.nexa-v153 .profile-popover a:hover{background:#142c47}.nexa-v153 .language-card,.nexa-v153 .readiness-item{background:#0c1d30;border-color:#29435f}.nexa-v153 table{border-color:#29435f}.nexa-v153 thead{background:#091726}.nexa-v153 th,.nexa-v153 td{border-color:#213950}.nexa-v153 .savebar{border-color:#315371;background:rgba(7,18,31,.96);box-shadow:0 20px 62px rgba(0,0,0,.42)}.nexa-v153 .billing-steps>div{border-color:#263f5b;background:#0c1b2d}.nexa-v153 .billing-steps>div.active{border-color:#37638a;background:linear-gradient(145deg,#132b45,#0d1e32)}.nexa-v153 .billing-plan{border-color:#2b4765;background:linear-gradient(160deg,#10243a,#09192a)}.nexa-v153 .billing-plan.featured{border-color:#4b82b3;box-shadow:inset 0 3px #5eafff}.nexa-v153 .billing-cycle label{border-color:#2d4a69;background:#0a192a}.nexa-v153 .billing-cycle label:has(input:checked){border-color:#4e91ca;background:#122b47}.nexa-v153 .billing-feature-list{border-color:#263f5b}.nexa-v153 .billing-feature-list li{border-color:#213950}.nexa-v153 .billing-feature-list li::before{color:#62d9c5}
@media(min-width:1500px){.nexa-v153 .guild-settings.view-control .settings{grid-template-columns:repeat(12,minmax(0,1fr));align-items:start}.nexa-v153 .guild-settings.view-control .settings>.card{grid-column:span 6}.nexa-v153 .guild-settings.view-control .settings>#modules,.nexa-v153 .guild-settings.view-control .settings>#tickets,.nexa-v153 .guild-settings.view-control .settings>#anti-raid,.nexa-v153 .guild-settings.view-control .settings>#protection,.nexa-v153 .guild-settings.view-control .settings>#channels,.nexa-v153 .guild-settings.view-control .settings>#roles,.nexa-v153 .guild-settings.view-control .settings>#messages,.nexa-v153 .guild-settings.view-control .settings>#branding,.nexa-v153 .guild-settings.view-control .settings>.savebar{grid-column:1/-1}}

/* NEXA Platform 20 */
.page-platform main,.page-platform .public-main{max-width:1600px}.platform-v20{display:grid;gap:88px;width:100%;min-width:0;padding:30px 0 70px;overflow:hidden}.platform-hero-v20{position:relative;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(430px,.92fr);gap:42px;align-items:center;min-height:620px;padding:64px;border:1px solid #294c6c;border-radius:34px;background:radial-gradient(740px 440px at 92% 4%,rgba(61,161,235,.22),transparent 70%),radial-gradient(500px 380px at 1% 100%,rgba(75,221,192,.1),transparent 72%),linear-gradient(145deg,#0b1c30,#071321 70%);box-shadow:0 40px 130px rgba(0,0,0,.38)}.platform-hero-v20::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.22;background-image:linear-gradient(rgba(132,195,240,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(132,195,240,.07) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(90deg,#000,transparent 72%)}.platform-hero-copy{position:relative;z-index:2}.platform-eyebrow{display:inline-flex;align-items:center;gap:9px;padding:8px 11px;border:1px solid #356184;border-radius:999px;background:rgba(44,111,158,.12);color:#9ddcff;font:900 10px ui-monospace,monospace;letter-spacing:1.15px}.platform-eyebrow i{width:7px;height:7px;border-radius:50%;background:#66e0c8;box-shadow:0 0 16px #66e0c8}.platform-hero-copy h1{max-width:820px;margin:22px 0 18px;font-size:clamp(50px,6vw,88px);line-height:.94;letter-spacing:-4.5px}.platform-hero-copy h1 span{background:linear-gradient(100deg,#7dc9ff,#72e5ce 72%);-webkit-background-clip:text;color:transparent}.platform-hero-copy>p{max-width:720px;margin:0;color:#9db1c7;font-size:18px;line-height:1.7}.platform-proof{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:30px;color:#8ea4b9;font-size:11px;font-weight:800}.platform-proof span{display:flex;align-items:center;gap:7px}.platform-proof b{display:grid;place-items:center;width:19px;height:19px;border:1px solid #347367;border-radius:6px;background:#0c2b28;color:#7ee4d1}.platform-map{position:relative;z-index:2;overflow:hidden;border:1px solid #315574;border-radius:26px;background:linear-gradient(160deg,rgba(14,35,57,.96),rgba(6,18,31,.98));box-shadow:0 35px 85px rgba(0,0,0,.36)}.platform-map-bar{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px 17px;border-bottom:1px solid #27455f;background:#0c1d30;color:#7896b0;font:900 9px ui-monospace,monospace;letter-spacing:.8px}.platform-map-bar b{display:flex;align-items:center;gap:7px;color:#80dac9}.platform-map-bar b i{width:7px;height:7px;border-radius:50%;background:#66dfc7;box-shadow:0 0 13px #66dfc7}.platform-orbit{position:relative;display:grid;place-items:center;height:360px;background:radial-gradient(circle at center,rgba(74,160,224,.14),transparent 62%)}.orbit-ring{position:absolute;border:1px solid rgba(105,190,245,.2);border-radius:50%}.ring-one{width:260px;height:260px}.ring-two{width:185px;height:185px;border-color:rgba(95,222,196,.18)}.ring-one::after,.ring-two::after{content:'';position:absolute;width:9px;height:9px;border-radius:50%;background:#6fd5ff;box-shadow:0 0 17px #6fd5ff}.ring-one::after{left:21px;top:47px}.ring-two::after{right:9px;bottom:48px;background:#71e2cc;box-shadow:0 0 17px #71e2cc}.platform-core{position:relative;z-index:3;display:grid;place-items:center;align-content:center;width:128px;height:128px;border:1px solid #4d86ad;border-radius:38px;background:linear-gradient(145deg,#173b5b,#0a2035);box-shadow:inset 0 0 35px rgba(84,190,255,.12),0 0 55px rgba(57,158,224,.2)}.platform-core small{color:#89aeca;font:900 8px ui-monospace,monospace;letter-spacing:1px}.platform-core strong{font-size:54px;line-height:1;color:#e9f7ff}.platform-core span{color:#6ee0ca;font:900 10px ui-monospace,monospace}.orbit-node{position:absolute;z-index:4;padding:6px 9px;border:1px solid #305675;border-radius:8px;background:#0a1d31;color:#8fb9d6;font:900 8px ui-monospace,monospace;letter-spacing:.7px;box-shadow:0 10px 24px rgba(0,0,0,.3)}.node-shield{left:13%;top:21%}.node-ai{right:14%;top:27%;border-color:#3b7168;color:#83dbc9}.node-data{left:21%;bottom:15%}.platform-map-metrics{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #27455f}.platform-map-metrics>div{display:grid;gap:2px;padding:16px;border-right:1px solid #27455f}.platform-map-metrics>div:last-child{border-right:0}.platform-map-metrics strong{font-size:23px}.platform-map-metrics span{color:#7590a8;font-size:9px;text-transform:uppercase;letter-spacing:.7px}.platform-section{display:grid;gap:25px;min-width:0}.platform-section-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.65fr);gap:42px;align-items:end}.platform-section-head>div>span,.platform-final>div>span{color:#73c9ff;font:900 10px ui-monospace,monospace;letter-spacing:1.2px}.platform-section-head h2,.platform-final h2{max-width:870px;margin:7px 0 0;font-size:clamp(34px,4.2vw,57px);line-height:1.02;letter-spacing:-2.5px}.platform-section-head>p{margin:0;color:#8fa4ba;font-size:15px;line-height:1.7}.platform-system-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}.platform-system{--system:#63b8ff;position:relative;display:flex;flex-direction:column;min-width:0;min-height:285px;grid-column:span 4;padding:24px;border:1px solid #29435e;border-radius:21px;background:radial-gradient(300px 190px at 100% 0,color-mix(in srgb,var(--system) 11%,transparent),transparent 70%),linear-gradient(145deg,#0e2136,#091828);box-shadow:0 20px 55px rgba(0,0,0,.22);transition:.2s transform,.2s border-color}.platform-system:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--system) 55%,#29435e)}.platform-system.system-featured{grid-column:span 8;min-height:315px}.system-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.system-code{display:grid;place-items:center;width:43px;height:43px;border:1px solid color-mix(in srgb,var(--system) 55%,#29435e);border-radius:13px;background:color-mix(in srgb,var(--system) 12%,#0b1928);color:color-mix(in srgb,var(--system) 75%,white);font:950 11px ui-monospace,monospace}.system-state{display:flex;align-items:center;gap:6px;color:#6f8ba2;font:900 8px ui-monospace,monospace;letter-spacing:.7px}.system-state i{width:6px;height:6px;border-radius:50%;background:#6bdcc6;box-shadow:0 0 10px #6bdcc6}.platform-system h3{margin:22px 0 9px;font-size:25px;letter-spacing:-.8px}.platform-system p{max-width:680px;margin:0;color:#91a7bc;font-size:13px;line-height:1.7}.system-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:auto;padding-top:22px}.system-tags span{padding:6px 8px;border:1px solid color-mix(in srgb,var(--system) 25%,#29435e);border-radius:8px;background:color-mix(in srgb,var(--system) 6%,#0a1827);color:#91a8bb;font:800 9px ui-monospace,monospace}.system-primary{--system:#69caff}.system-shield{--system:#6fe2c9}.system-cyan{--system:#56d6ec}.system-violet{--system:#a78bfa}.system-blue{--system:#6a9cff}.system-gold{--system:#e7bc6c}.system-mint{--system:#65d5a7}.system-rose{--system:#ea86a8}.system-slate{--system:#9aaec3}.platform-flow{padding:35px;border:1px solid #29465f;border-radius:28px;background:linear-gradient(145deg,#0c1d30,#081521)}.platform-flow-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.platform-flow-step{display:grid;grid-template-columns:auto 1fr;gap:13px;min-width:0;padding:18px;border:1px solid #273f57;border-radius:16px;background:#091827}.platform-flow-step>span{display:grid;place-items:center;width:36px;height:36px;border:1px solid #366083;border-radius:11px;background:#102b45;color:#7ed0ff;font:900 10px ui-monospace,monospace}.platform-flow-step h3{margin:1px 0 5px;font-size:15px}.platform-flow-step p{margin:0;color:#7f96aa;font-size:11px;line-height:1.55}.platform-final{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:35px;align-items:center;padding:48px;border:1px solid #357165;border-radius:28px;background:radial-gradient(500px 240px at 90% 20%,rgba(98,218,196,.15),transparent 72%),linear-gradient(135deg,#0d292a,#091d29)}.platform-final p{max-width:800px;margin:13px 0 0;color:#93aaa9}.platform-final .actions{justify-content:flex-end;margin:0}.page-platform .contextbar{margin-bottom:8px}@media(max-width:1250px){.platform-hero-v20{grid-template-columns:1fr;padding:48px}.platform-map{max-width:720px}.platform-system{grid-column:span 6}.platform-system.system-featured{grid-column:span 12}.platform-flow-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:850px){.platform-v20{gap:58px;padding-top:16px}.platform-hero-v20{padding:34px 25px;border-radius:24px;min-height:0}.platform-hero-copy h1{letter-spacing:-3px}.platform-section-head,.platform-final{grid-template-columns:1fr}.platform-section-head{gap:15px}.platform-system,.platform-system.system-featured{grid-column:span 12;min-height:250px}.platform-final .actions{justify-content:flex-start}.platform-map-bar{align-items:flex-start;flex-direction:column}.platform-orbit{height:320px}}@media(max-width:560px){.platform-hero-v20{padding:28px 18px}.platform-hero-copy h1{font-size:43px;letter-spacing:-2.4px}.platform-hero-copy>p{font-size:15px}.platform-map-metrics{grid-template-columns:1fr}.platform-map-metrics>div{border-right:0;border-bottom:1px solid #27455f}.platform-map-metrics>div:last-child{border-bottom:0}.platform-flow{padding:20px 15px}.platform-flow-grid{grid-template-columns:1fr}.platform-final{padding:30px 22px}.platform-system{padding:20px}.platform-proof{display:grid}.ring-one{width:230px;height:230px}.ring-two{width:165px;height:165px}.platform-core{width:110px;height:110px;border-radius:31px}}

/* NEXA OS Studio 20 */
.os-studio{display:grid;gap:20px}.os-studio-hero{position:relative;overflow:hidden;min-height:320px;padding:48px;border:1px solid #315576;border-radius:30px;background:radial-gradient(600px 340px at 85% 18%,rgba(89,190,255,.22),transparent 68%),radial-gradient(480px 300px at 12% 100%,rgba(86,224,195,.12),transparent 70%),linear-gradient(135deg,#0b1c31,#081421 72%);box-shadow:0 34px 100px rgba(0,0,0,.35);display:flex;align-items:center}.os-studio-hero>div:first-child{position:relative;z-index:2;max-width:850px}.os-version{display:inline-flex;padding:7px 11px;border:1px solid #397499;border-radius:999px;background:rgba(66,161,220,.1);color:#8bd8ff;font:900 10px ui-monospace,monospace;letter-spacing:1.3px}.os-studio-hero h1{margin:19px 0 12px;font-size:clamp(44px,6vw,76px);line-height:.95;letter-spacing:-4px}.os-studio-hero h1 em{font-style:normal;background:linear-gradient(100deg,#6cc6ff,#6fe4c9);-webkit-background-clip:text;color:transparent}.os-studio-hero p{max-width:760px;margin:0;color:#a5b9cf;font-size:17px}.os-studio-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px}.os-studio-pills span{padding:7px 10px;border:1px solid #294964;border-radius:9px;background:#0a1828;color:#8faac2;font:800 9px ui-monospace,monospace;letter-spacing:.8px}.os-orbit{position:absolute;right:75px;top:50%;width:170px;height:170px;transform:translateY(-50%);display:grid;place-items:center;border:1px solid rgba(111,214,255,.22);border-radius:50%;box-shadow:0 0 80px rgba(69,164,224,.15)}.os-orbit::before,.os-orbit::after{content:'';position:absolute;border:1px solid rgba(105,224,201,.17);border-radius:50%}.os-orbit::before{inset:-28px}.os-orbit::after{inset:32px}.os-orbit i{position:absolute;width:12px;height:12px;border-radius:50%;background:#70e1c9;box-shadow:0 0 22px #70e1c9;animation:osOrbit 6s linear infinite;transform-origin:0 85px}.os-orbit b{font-size:68px;letter-spacing:-5px;color:#dff5ff}.os-orbit span{position:absolute;right:17px;bottom:18px;color:#70e1c9;font:900 13px ui-monospace,monospace}@keyframes osOrbit{to{transform:rotate(360deg)}}.studio-owner-lock{padding:13px 16px;border:1px solid #2c4a64;border-radius:13px;background:#0b1928;color:#97abc1;font-size:12px}.studio-steps{position:sticky;top:128px;z-index:8;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;border:1px solid #284760;border-radius:17px;background:rgba(7,19,31,.92);backdrop-filter:blur(18px)}.studio-steps a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:11px;text-decoration:none;color:#8fa7bd}.studio-steps a:hover{background:#112a43;color:#fff}.studio-steps b{display:grid;place-items:center;width:30px;height:30px;border:1px solid #315979;border-radius:9px;color:#75caff;font:900 10px ui-monospace,monospace}.studio-steps span{font-size:12px;font-weight:850}.studio-builder,.studio-preview{padding:30px;border:1px solid #294a65;border-radius:24px;background:linear-gradient(145deg,rgba(12,29,47,.98),rgba(7,19,31,.98));box-shadow:0 24px 70px rgba(0,0,0,.26)}.studio-builder-copy{max-width:800px;margin-bottom:24px}.studio-builder-copy h2{margin:5px 0;font-size:32px}.studio-builder-copy p{margin:0;color:var(--muted)}.studio-prompt{display:grid;gap:8px}.studio-prompt>span,.studio-control-row label{font-size:12px;font-weight:850;color:#c8d9e8}.studio-prompt textarea{min-height:170px;font-size:15px;line-height:1.65}.studio-prompt small{color:#718ba2}.studio-block{margin-top:28px;padding-top:24px;border-top:1px solid #223d54}.studio-block-head{display:flex;gap:13px;align-items:flex-start;margin-bottom:15px}.studio-block-head>span{display:grid;place-items:center;width:38px;height:38px;border:1px solid #32638a;border-radius:11px;background:#102b45;color:#76cbff;font:900 11px ui-monospace,monospace}.studio-block-head h3{margin:0}.studio-block-head p{margin:2px 0 0;color:var(--muted);font-size:12px}.studio-template-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.studio-template input,.studio-feature input{position:absolute;opacity:0;pointer-events:none}.studio-template>span{display:grid;min-height:132px;padding:16px;border:1px solid #29445d;border-radius:15px;background:#091827;cursor:pointer;transition:.18s}.studio-template>span:hover{transform:translateY(-2px);border-color:#42739a}.studio-template input:checked+span{border-color:#64bfff;background:linear-gradient(145deg,#123252,#0c2239);box-shadow:inset 0 0 0 1px rgba(104,198,255,.2),0 12px 30px rgba(31,110,168,.18)}.studio-template i{font-style:normal;font-size:24px;color:#74d9c6}.studio-template strong{margin-top:8px}.studio-template small{color:#8299ae;font-size:10px;line-height:1.35}.studio-feature-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.studio-feature>span{position:relative;display:flex;align-items:center;gap:9px;min-height:54px;padding:12px 42px 12px 13px;border:1px solid #29445d;border-radius:13px;background:#091827;cursor:pointer;font-size:12px}.studio-feature strong{font-size:11px}.studio-feature i{position:absolute;right:13px;width:28px;height:16px;border-radius:999px;background:#233a4d}.studio-feature i::after{content:'';position:absolute;left:3px;top:3px;width:10px;height:10px;border-radius:50%;background:#7890a3;transition:.18s}.studio-feature input:checked+span{border-color:#347a73;background:#0c282a}.studio-feature input:checked+span i{background:#2b8073}.studio-feature input:checked+span i::after{left:15px;background:#8ff1dd}.studio-control-row{display:grid;grid-template-columns:minmax(170px,.6fr) minmax(170px,.6fr) minmax(240px,1fr);align-items:end;gap:12px;margin-top:24px}.studio-control-row label{display:grid;gap:7px}.studio-generate{min-height:50px;font-size:13px}.studio-generate span{font-size:18px}.studio-preview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-bottom:22px;border-bottom:1px solid #26455e}.studio-preview-head h2{margin:5px 0 3px;font-size:34px}.studio-preview-head p{margin:0;color:var(--muted)}.studio-hash{display:grid;gap:4px;text-align:right}.studio-hash span{color:#6f899f;font:800 9px ui-monospace,monospace}.studio-hash code{padding:8px 10px;border:1px solid #315979;border-radius:10px;background:#091725;color:#8bd6ff}.studio-simulation{display:grid;grid-template-columns:170px 1fr;gap:25px;margin:22px 0;padding:22px;border:1px solid #2d5c5a;border-radius:20px;background:linear-gradient(145deg,#0b2929,#0a2025)}.studio-simulation.warning{border-color:#6b5b31;background:linear-gradient(145deg,#292313,#181b1c)}.studio-simulation.blocked{border-color:#723746;background:linear-gradient(145deg,#2b1720,#171923)}.studio-score{position:relative;display:grid;place-items:center;align-content:center;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle at center,#0c1d2b 55%,transparent 57%),conic-gradient(#65dbc5 calc(var(--score)*1%),#24384a 0);box-shadow:0 0 35px rgba(66,184,164,.13)}.studio-score strong{font-size:39px;line-height:1}.studio-score span{margin-top:4px;color:#83a199;font:800 8px ui-monospace,monospace}.studio-sim-body h3{margin:3px 0}.studio-sim-body>p{margin:0 0 14px;color:#91a9b9}.studio-diff{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.studio-diff>div{display:grid;padding:12px;border:1px solid #2b4b5d;border-radius:12px;background:rgba(6,17,27,.45)}.studio-diff b{font-size:20px;color:#7ddfc9}.studio-diff span{font-size:11px;font-weight:800}.studio-diff small{color:#718b9c;font-size:9px}.studio-diff .safe b{color:#82e6d2}.studio-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:18px 0}.studio-metrics>div{display:grid;padding:15px;border:1px solid #29465f;border-radius:14px;background:#0a1929}.studio-metrics strong{font-size:24px}.studio-metrics span{color:#8098ad;font-size:10px;text-transform:uppercase}.studio-modules{display:flex;align-items:center;justify-content:space-between;gap:18px}.studio-modules>div:last-child{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}.studio-modules>div:last-child span{padding:6px 9px;border:1px solid #2f6b64;border-radius:8px;background:#0d2b2a;color:#8ae6d5;font:800 9px ui-monospace,monospace}.studio-blueprint-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}.studio-category{overflow:hidden;border:1px solid #29465f;border-radius:17px;background:#091827}.studio-category-head{display:flex;align-items:center;gap:12px;padding:15px;border-bottom:1px solid #263f57;background:linear-gradient(90deg,#112a44,#0b1d30)}.studio-category-head>span{color:#69c6ff;font:900 19px ui-monospace,monospace}.studio-category-head small{color:#6e879c;font:800 8px ui-monospace,monospace}.studio-category-head h3{margin:1px 0 0;font-size:14px}.studio-channel-list{display:grid}.studio-channel-list>div{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:8px;padding:10px 13px;border-bottom:1px solid #1d3347}.studio-channel-list>div:last-child{border-bottom:0}.studio-channel-list i{color:#68c7ff;font-style:normal}.studio-channel-list span{display:grid}.studio-channel-list strong{font-size:11px}.studio-channel-list small{color:#6e879d;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.studio-channel-list b{color:#6b859a;font:800 8px ui-monospace,monospace}.studio-color{display:inline-block;width:9px;height:9px;margin-right:8px;border-radius:50%}.studio-deploy{display:grid;grid-template-columns:1fr minmax(340px,.75fr);gap:24px;margin-top:18px;padding:25px;border:1px solid #347267;border-radius:20px;background:linear-gradient(135deg,#0d2d2b,#0a2027)}.studio-deploy h3{margin:4px 0}.studio-deploy p{margin:0;color:#91aaa7}.studio-deploy form{display:grid;grid-template-columns:1fr auto;align-items:end;gap:10px}.studio-deploy label{display:grid;gap:6px;font-size:11px;font-weight:800}.studio-deploy .btn[disabled]{opacity:.45;cursor:not-allowed;filter:grayscale(.5)}.studio-two-col{display:grid;grid-template-columns:1fr 1fr;gap:15px}.studio-last form{display:grid;grid-template-columns:1fr auto;align-items:end;gap:10px;margin-top:16px}.studio-last form label{display:grid;gap:6px;font-size:11px;font-weight:800}.studio-history{display:grid}.studio-history-row{display:grid;grid-template-columns:34px 1fr auto auto;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #223a51}.studio-history-row:last-child{border-bottom:0}.studio-history-row>span{color:#6ebff1;font:900 10px ui-monospace,monospace}.studio-history-row>div{display:grid}.studio-history-row strong{font-size:11px}.studio-history-row small{color:#70889e;font-size:9px}.studio-history-row code{color:#82d7c7;font-size:9px}.studio-history-row>b{color:#849cb1;font:800 9px ui-monospace,monospace}.studio-empty{border-style:dashed!important;background:#0a1928!important;color:#8aa2b8!important}
@media(max-width:1250px){.os-orbit{opacity:.35;right:30px}.studio-template-grid,.studio-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.studio-two-col{grid-template-columns:1fr}.studio-simulation{grid-template-columns:140px 1fr}.studio-score{width:120px;height:120px}}@media(max-width:760px){.os-studio-hero{min-height:0;padding:28px 22px}.os-orbit{display:none}.os-studio-hero h1{font-size:45px}.studio-steps{position:static;grid-template-columns:repeat(2,1fr)}.studio-builder,.studio-preview{padding:19px}.studio-template-grid,.studio-feature-grid,.studio-blueprint-grid{grid-template-columns:1fr}.studio-control-row,.studio-deploy,.studio-deploy form,.studio-last form{grid-template-columns:1fr}.studio-simulation{grid-template-columns:1fr}.studio-score{margin:auto}.studio-diff,.studio-metrics{grid-template-columns:repeat(2,1fr)}.studio-preview-head,.studio-modules{align-items:flex-start;flex-direction:column}.studio-hash{text-align:left}.studio-history-row{grid-template-columns:30px 1fr auto}.studio-history-row>b{display:none}}
</style></head><body class="nexa-v153 ${ownerView ? 'owner-mode' : ''}${activePage ? ` page-${escapeHtml(activePage)}` : ''}"><header class="topbar"><div class="topbar-inner">${user ? `<button class="sidebar-toggle" type="button" data-sidebar-toggle aria-label="Menu">☰</button>` : ``}<a class="brand" href="${homeUrl}"><span class="brand-mark">N</span><span class="brand-text">Nexa<span>Bot</span></span></a><div class="live-pill"><i class="live-dot"></i> NEXA CORE ONLINE</div><nav class="navlinks" aria-label="${pageLanguage === 'en' ? 'Main navigation' : 'Fő navigáció'}"><a${navClass('platform')} href="${platformUrl}">${platformLabel}</a><a${navClass('commands')} href="${commandsUrl}">${commandsLabel}</a><a${navClass('subscriptions')} href="${pricingUrl}">${pricingLabel}</a><a${navClass('guide')} href="${guideUrl}">${guideLabel}</a><a${navClass('privacy')} href="${privacyUrl}">${privacyLabel}</a></nav><div class="spacer"></div>${localeSwitcher}${userMenu}</div></header>${user ? `<div class="app"><aside class="sidebar">${sidebarNavigation}<div class="footer-note">${escapeHtml(productName)}<br><span class="footer-release">NEXA Bot 20.3.1 • NEXA OS Studio</span></div></aside><main><div class="contextbar"><span>NEXA</span><b>›</b><span>${ownerView ? 'OWNER' : 'CONTROL'}</span><b>›</b><strong data-current-location>${escapeHtml(title)}</strong></div>${content}</main></div>` : `<main class="public-main">${content}</main>`}<script src="/assets/nexa-dashboard.js" defer></script></body></html>`;
}

function publicLanguage(url, request = null) {
  const requested = url.searchParams.get('lang');
  if (requested === 'en' || requested === 'hu') return requested;
  const stored = request ? cookies(request).nexabot_language : '';
  return stored === 'hu' ? 'hu' : 'en';
}

function languageCookie(language) {
  const secure = rootUrl().startsWith('https://') ? '; Secure' : '';
  return `nexabot_language=${language === 'en' ? 'en' : 'hu'}; Path=/; SameSite=Lax; Max-Age=31536000${secure}`;
}

function publicLanguageHeaders(url) {
  const requested = url.searchParams.get('lang');
  return requested === 'en' || requested === 'hu' ? { 'Set-Cookie': languageCookie(requested) } : {};
}

function compactNumber(value, language) {
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'hu-HU', {
    notation: Number(value) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1
  }).format(Number(value) || 0);
}

function uptimeLabel(seconds, language) {
  const hours = Math.floor((Number(seconds) || 0) / 3600);
  if (hours >= 24) return `${Math.floor(hours / 24)} ${language === 'en' ? 'days' : 'nap'}`;
  if (hours >= 1) return `${hours} ${language === 'en' ? 'hours' : 'óra'}`;
  return `${Math.max(1, Math.floor((Number(seconds) || 0) / 60))} ${language === 'en' ? 'min' : 'perc'}`;
}

function landing(client, session, language = 'hu') {
  const en = language === 'en';
  const guilds = [...client.guilds.cache.values()];
  const guildCount = guilds.length;
  const memberCount = guilds.reduce((sum, guild) => sum + Number(guild.memberCount || 0), 0);
  const runtime = runtimeStats(client);
  const ping = runtime.ping >= 0 ? `${runtime.ping} ms` : '—';
  const online = client.isReady?.() !== false;
  const moduleCount = MODULE_KEYS.filter((key) => key !== 'bvi').length;
  const dashboardHref = session ? '/dashboard' : '/login';
  const query = en ? '?lang=en' : '';
  const copy = en ? {
    eyebrow: 'NEXA BOT 20.3.1 · NEXA OS STUDIO',
    headlineA: 'Your server.', headlineB: 'Operating at its next level.',
    lead: 'Moderation, support, community automation, AI and serious server protection in one auditable control system built for growth.',
    dashboard: session ? 'Open dashboard' : 'Sign in with Discord', invite: 'Invite NEXA Bot', explore: 'Explore the platform',
    proof: ['Hungarian and English', 'Server-specific settings', 'Owner-controlled access'],
    shellTitle: 'Network overview', active: online ? 'SYSTEM ONLINE' : 'STARTING', servers: 'Servers', users: 'Members', latency: 'Latency', activity: 'Protected activity', shield: 'Security shield', shieldState: 'Active monitoring', aiState: 'AI access', aiPrivate: 'Private by design',
    networkTitle: 'Live network', networkText: 'Actual data reported by the running NEXA instance.', uptime: 'Uptime', database: 'Database', modules: 'Module families', status: 'Service', online: online ? 'Online' : 'Starting', persistent: isPersistentStore() ? 'PostgreSQL' : 'Memory mode',
    platformKicker: 'One platform, connected systems', platformTitle: 'More control. Less operational noise.', platformLead: 'Every module shares permissions, logging and server-specific configuration, so the system remains manageable as your community grows.',
    workflowKicker: 'From invite to operation', workflowTitle: 'Ready in three controlled steps.', workflowLead: 'Discord remains the daily workspace. Detailed setup and network oversight live on the web.',
    accessKicker: 'Flexible access', accessTitle: 'Start free. Upgrade when your server grows.', accessLead: 'Secure monthly and annual Stripe subscriptions work alongside complimentary plans granted by the bot owner.',
    securityKicker: 'Security architecture', securityTitle: 'Protection that can explain every action.', securityLead: 'Sensitive operations are permission-checked, rate-limited and written to an audit trail. Secrets remain server-side.',
    ctaKicker: 'NEXA is ready', ctaTitle: 'Give your Discord server a real operating system.', ctaLead: 'Invite the bot, sign in with Discord and configure each server independently from a responsive command center.',
    footer: 'Discord management platform · Version 20.3.1', privacy: 'Privacy', terms: 'Terms', commands: 'Commands'
  } : {
    eyebrow: 'NEXA BOT 20.3.1 · NEXA OS STUDIO',
    headlineA: 'A szervered.', headlineB: 'Egy szinttel feljebb.',
    lead: 'Moderáció, ügyféltámogatás, közösségi automatizálás, AI és komoly szervervédelem egyetlen auditálható, növekedésre tervezett rendszerben.',
    dashboard: session ? 'Vezérlőpult megnyitása' : 'Belépés Discorddal', invite: 'NEXA Bot meghívása', explore: 'Platform felfedezése',
    proof: ['Magyar és angol felület', 'Szerverenkénti beállítás', 'Owner által kezelt hozzáférés'],
    shellTitle: 'Hálózati áttekintés', active: online ? 'RENDSZER ONLINE' : 'INDULÁS', servers: 'Szerver', users: 'Tag', latency: 'Késleltetés', activity: 'Védett aktivitás', shield: 'Biztonsági pajzs', shieldState: 'Aktív felügyelet', aiState: 'AI-hozzáférés', aiPrivate: 'Adatvédett működés',
    networkTitle: 'Élő hálózat', networkText: 'A futó NEXA-példány által jelentett valós adatok.', uptime: 'Futási idő', database: 'Adatbázis', modules: 'Modulcsalád', status: 'Szolgáltatás', online: online ? 'Online' : 'Indul', persistent: isPersistentStore() ? 'PostgreSQL' : 'Memóriamód',
    platformKicker: 'Egy platform, összekapcsolt rendszerek', platformTitle: 'Több irányítás. Kevesebb üzemeltetési zaj.', platformLead: 'Minden modul közös jogosultság-, napló- és szerverbeállítási rendszerre épül, ezért növekedés közben is átlátható marad.',
    workflowKicker: 'Meghívástól a működésig', workflowTitle: 'Három ellenőrzött lépésben használatra kész.', workflowLead: 'A napi munka Discordon marad. A részletes konfiguráció és a hálózat felügyelete a weben történik.',
    accessKicker: 'Rugalmas hozzáférés', accessTitle: 'Kezdd ingyen. Válts, amikor nő a szervered.', accessLead: 'A biztonságos havi és éves Stripe-előfizetés együtt működik a bot Owner által ingyen kiosztott csomagokkal.',
    securityKicker: 'Biztonsági architektúra', securityTitle: 'Védelem, amely minden döntésről elszámol.', securityLead: 'Az érzékeny műveleteket jogosultság-ellenőrzés, rate limit és auditnapló védi. A titkos kulcsok kizárólag szerveroldalon maradnak.',
    ctaKicker: 'A NEXA készen áll', ctaTitle: 'Adj valódi operációs rendszert a Discord-szerverednek.', ctaLead: 'Hívd meg a botot, lépj be Discorddal, majd állíts be minden szervert külön a mobilbarát irányítóközpontból.',
    footer: 'Discord management platform · 20.3.1-es verzió', privacy: 'Adatvédelem', terms: 'Feltételek', commands: 'Parancsok'
  };
  const capabilities = en ? [
    ['MD', 'Moderation with context', 'Every action becomes a searchable Case ID instead of disappearing into chat history.', ['Ban, kick and timeout', 'Warnings and clearing', 'Lock and slowmode', 'Member information']],
    ['SC', 'Automod and Anti-Nuke', 'Layered protection watches messages, joins and dangerous administrative operations.', ['Spam and flood filters', 'Scam and invite blocking', 'Raid detection', 'Whitelist controls']],
    ['TK', 'Support from open to archive', 'Category-based ticket workflows with claim, member control and saved HTML transcripts.', ['Custom ticket panels', 'Claim and unclaim', 'Participant controls', 'HTML transcript']],
    ['CM', 'Community systems', 'Welcome, levels, role panels, giveaways and temporary voice rooms share one configuration.', ['Welcome and autorole', 'XP and rewards', 'Button roles', 'Giveaways']],
    ['AI', 'Nexa AI with privacy boundaries', 'Channel and DM assistance with cooldown, usage controls and opt-in personal memory.', ['AI channel', 'Private DM assistant', 'Usage statistics', 'Opt-in memory']],
    ['OW', 'Network-grade owner control', 'See servers, health, errors and activity; control access and emergency settings remotely.', ['Live server inventory', 'Audit and error center', 'Remote module switch', 'Blacklist and maintenance']],
    ['CG', 'ChronoGuard Digital Twin', 'A signed digital twin detects structural drift and prepares a safe, owner-approved recovery plan.', ['SHA-256 and HMAC chain', 'Explainable risk map', 'Incident Capsule export', 'Non-destructive recovery']],
    ['AG', 'AEGIS Permission DNA', 'Privilege intelligence maps dangerous access, blast radius, containment gaps and later permission drift.', ['Cryptographic permission DNA', 'Identity risk scoring', 'Role hierarchy analysis', 'Owner-only baseline']]
  ] : [
    ['MD', 'Moderáció összefüggésekkel', 'Minden intézkedés kereshető Case ID-t kap, nem vész el a beszélgetések között.', ['Kitiltás, kirúgás, timeout', 'Figyelmeztetések kezelése', 'Lezárás és slowmode', 'Tag- és szerverinformáció']],
    ['SC', 'Automod és Anti-Nuke', 'Többrétegű védelem figyeli az üzeneteket, belépéseket és veszélyes adminműveleteket.', ['Spam- és floodszűrés', 'Scam- és meghívóvédelem', 'Raidfelismerés', 'Whitelist-kezelés']],
    ['TK', 'Support a nyitástól az archívumig', 'Kategóriás ticketfolyamat claimmel, résztvevőkezeléssel és mentett HTML-átirattal.', ['Egyedi ticketpanelek', 'Claim és unclaim', 'Résztvevőkezelés', 'HTML transcript']],
    ['CM', 'Közösségi rendszerek', 'Az üdvözlés, XP, rangpanelek, nyereményjátékok és ideiglenes hangszobák együtt kezelhetők.', ['Welcome és autorole', 'XP és jutalomrang', 'Gombos rangpanelek', 'Nyereményjátékok']],
    ['AI', 'Nexa AI adatvédelmi korlátokkal', 'Csatornás és privát segítség cooldownnal, használati korláttal és beleegyezéses személyes memóriával.', ['AI-csatorna', 'Privát DM-asszisztens', 'Használati statisztika', 'Beleegyezéses memória']],
    ['OW', 'Hálózati Owner-irányítás', 'Szerverek, állapot, hibák és aktivitás egy helyen, távoli hozzáférés- és vészkapcsolókkal.', ['Élő szerverlista', 'Audit- és hibaközpont', 'Távoli modulkapcsoló', 'Blacklist és maintenance']],
    ['CG', 'ChronoGuard Digital Twin', 'Az aláírt digitális szerveriker észleli a szerkezeti eltérést, majd biztonságos, Owner által jóváhagyható helyreállítást készít.', ['SHA-256 és HMAC-lánc', 'Magyarázható kockázati térkép', 'Incident Capsule export', 'Rombolásmentes helyreállítás']],
    ['AG', 'AEGIS Permission DNA', 'A jogosultsági intelligencia feltérképezi a veszélyes hozzáférést, a robbanási sugarat, az elszigetelési hiányt és a későbbi jogeltérést.', ['Kriptográfiai Permission DNA', 'Identitáskockázat', 'Ranghierarchia-elemzés', 'Owner-only bázis']]
  ];
  const steps = en ? [
    ['Invite securely', 'NEXA requests scoped Discord permissions and never exposes bot or API secrets in the browser.'],
    ['Configure per server', 'Choose modules, channels, roles, language and branding from the web dashboard.'],
    ['Operate from panels', 'Staff use clear Discord panels while every important action is logged in the background.']
  ] : [
    ['Biztonságos meghívás', 'A NEXA célzott Discord-jogosultságokat kér, a bot- és API-titkokat soha nem mutatja meg a böngészőben.'],
    ['Szerverenkénti beállítás', 'A webes dashboardon kiválaszthatók a modulok, csatornák, rangok, nyelv és arculat.'],
    ['Napi munka panelekről', 'A Staff áttekinthető Discord-paneleket használ, miközben minden fontos művelet naplózásra kerül.']
  ];
  const tiers = en ? [
    ['FREE', 'Core control', ['Moderation and cases', 'Welcome and verification', 'Tickets and reminders', 'Detailed logging']],
    ['PRO', 'Community operations', ['Everything in Free', 'Automod and Starboard', 'Levels and role panels', 'Giveaways, shifts and voice']],
    ['ULTIMATE', 'Full protection', ['Everything in Pro', 'Nexa AI', 'Anti-Nuke monitoring', 'Raid detection and lockdown']]
  ] : [
    ['FREE', 'Alapirányítás', ['Moderáció és esetek', 'Welcome és hitelesítés', 'Ticket és emlékeztetők', 'Részletes naplózás']],
    ['PRO', 'Közösségi működés', ['Minden Free funkció', 'Automod és Starboard', 'Szintek és rangpanelek', 'Giveaway, shift és hangszobák']],
    ['ULTIMATE', 'Teljes védelem', ['Minden Pro funkció', 'Nexa AI', 'Anti-Nuke megfigyelés', 'Raidfelismerés és lezárás']]
  ];
  const capabilityCards = capabilities.map(([code, title, body, items], index) => `<article class="capability${index === 0 || index === 5 ? ' wide' : ''}" data-code="${escapeHtml(code)}"><div class="capability-code">${escapeHtml(code)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`).join('');
  const workflowCards = steps.map(([title, body]) => `<article class="workflow-step"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join('');
  const tierCards = tiers.map(([name, title, items], index) => `<article class="access-card${index === 2 ? ' featured' : ''}"><div class="access-name">NEXA ${escapeHtml(name)}</div><h3>${escapeHtml(title)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="access-note">${index === 0 ? (en ? 'Free forever.' : 'Örökre ingyenes.') : (en ? 'Monthly, annual or complimentary owner access.' : 'Havi, éves vagy Owner által ingyen adott hozzáférés.')}</div></article>`).join('');
  const content = `<div class="marketing"><section class="hero"><div class="hero-copy"><div class="eyebrow">${copy.eyebrow}</div><h1><span>${copy.headlineA}</span><br><span class="gradient">${copy.headlineB}</span></h1><p class="lead">${copy.lead}</p><div class="actions"><a class="btn" href="${dashboardHref}">${copy.dashboard} →</a><a class="btn secondary" href="${escapeHtml(inviteUrl())}">${copy.invite}</a><a class="btn secondary" href="#platform">${copy.explore}</a></div><div class="hero-proof">${copy.proof.map((item) => `<span><i>✓</i>${escapeHtml(item)}</span>`).join('')}</div></div><div class="product-stage" aria-label="NEXA Command Deck preview"><div class="float-chip chip-a"><strong>${copy.shield}</strong>${copy.shieldState}</div><div class="float-chip chip-b"><strong>${copy.aiState}</strong>${copy.aiPrivate}</div><div class="product-shell"><div class="shell-bar"><i></i><i></i><i></i><span class="shell-title">NEXA COMMAND DECK</span></div><div class="shell-body"><aside class="shell-side"><div class="shell-brand"><b>N</b>NEXA</div><div class="shell-link active">◈ ${en ? 'Overview' : 'Áttekintés'}</div><div class="shell-link">⬡ ${en ? 'Modules' : 'Modulok'}</div><div class="shell-link"># ${en ? 'Channels' : 'Csatornák'}</div><div class="shell-link">◇ ${en ? 'Roles' : 'Rangok'}</div><div class="shell-link">⬢ ${en ? 'Security' : 'Védelem'}</div><div class="shell-link">✦ NEXA AI</div></aside><div class="shell-main"><div class="shell-head"><div><div class="section-kicker">NEXA CORE</div><h3>${copy.shellTitle}</h3></div><span class="shell-status">${copy.active}</span></div><div class="shell-metrics"><div class="shell-metric"><strong>${compactNumber(guildCount, language)}</strong><span>${copy.servers}</span></div><div class="shell-metric"><strong>${compactNumber(memberCount, language)}</strong><span>${copy.users}</span></div><div class="shell-metric"><strong>${ping}</strong><span>${copy.latency}</span></div></div><div class="signal-card"><div class="signal-top"><span>${copy.activity}</span><span class="muted">24H</span></div><div class="signal-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="deck-row"><div><strong>Automod Core</strong><span class="muted">${en ? 'Message and raid protection' : 'Üzenet- és raidvédelem'}</span></div><i class="pulse"></i></div></div></div></div></div></section>
  <section class="live-network" aria-label="${escapeHtml(copy.networkTitle)}"><div class="network-intro"><div class="section-kicker">LIVE TELEMETRY</div><strong>${copy.networkTitle}</strong><span class="muted">${copy.networkText}</span></div><div class="network-stat"><strong>${uptimeLabel(runtime.uptimeSeconds, language)}</strong><span>${copy.uptime}</span></div><div class="network-stat"><strong>${escapeHtml(copy.persistent)}</strong><span>${copy.database}</span></div><div class="network-stat"><strong>${moduleCount}</strong><span>${copy.modules}</span></div><div class="network-stat"><strong>${copy.online}</strong><span>${copy.status}</span></div></section>
  <section id="platform" class="section-block"><div class="section-heading"><div><div class="section-kicker">${copy.platformKicker}</div><h2>${copy.platformTitle}</h2></div><p>${copy.platformLead}</p></div><div class="capability-grid">${capabilityCards}</div></section>
  <section class="section-block"><div class="section-heading"><div><div class="section-kicker">${copy.workflowKicker}</div><h2>${copy.workflowTitle}</h2></div><p>${copy.workflowLead}</p></div><div class="workflow">${workflowCards}</div></section>
  <section class="section-block"><div class="section-heading"><div><div class="section-kicker">${copy.accessKicker}</div><h2>${copy.accessTitle}</h2></div><p>${copy.accessLead}</p></div><div class="access-grid">${tierCards}</div></section>
  <section class="section-block security-showcase"><div class="security-copy"><div class="section-kicker">${copy.securityKicker}</div><h2>${copy.securityTitle}</h2><p class="muted">${copy.securityLead}</p><div class="trust-list"><div class="trust-item"><b>01</b><div><strong>OAuth2 + CSRF</strong><span>${en ? 'Protected sign-in and state-changing forms.' : 'Védett belépés és állapotmódosító űrlapok.'}</span></div></div><div class="trust-item"><b>02</b><div><strong>PostgreSQL + audit</strong><span>${en ? 'Persistent configuration and traceable operations.' : 'Tartós konfiguráció és visszakövethető műveletek.'}</span></div></div><div class="trust-item"><b>03</b><div><strong>${en ? 'Server-side secrets' : 'Szerveroldali titkok'}</strong><span>${en ? 'Tokens and API keys never enter public code.' : 'A tokenek és API-kulcsok nem kerülnek publikus kódba.'}</span></div></div></div></div><div class="security-console" aria-label="Security event preview"><div class="section-kicker">SECURITY EVENT STREAM</div><div class="console-line"><time>20:41:08</time><span>automod / repeated-message</span><b>${en ? 'BLOCKED' : 'BLOKKOLVA'}</b></div><div class="console-line"><time>20:41:14</time><span>permission / role-hierarchy</span><b>${en ? 'VERIFIED' : 'ELLENŐRIZVE'}</b></div><div class="console-line"><time>20:42:03</time><span>oauth / session-integrity</span><b>${en ? 'SECURE' : 'VÉDETT'}</b></div><div class="console-line"><time>20:43:29</time><span>audit / case-record</span><b>${en ? 'STORED' : 'MENTVE'}</b></div><div class="console-line"><time>20:44:02</time><span>nexa-core / network-health</span><b>${en ? 'ONLINE' : 'ONLINE'}</b></div></div></section>
  <section class="section-block"><div class="cta-panel"><div class="eyebrow">${copy.ctaKicker}</div><h2>${copy.ctaTitle}</h2><p>${copy.ctaLead}</p><div class="actions" style="justify-content:center"><a class="btn" href="${escapeHtml(inviteUrl())}">${copy.invite} →</a><a class="btn secondary" href="${dashboardHref}">${copy.dashboard}</a></div></div></section>
  <footer class="site-footer"><a class="brand" href="${en ? '/?lang=en' : '/'}"><span class="brand-mark">N</span><span>NexaBot</span></a><span>${copy.footer}</span><a href="/subscriptions${query}">${en ? 'Subscriptions' : 'Előfizetés'}</a><a href="/commands${query}">${copy.commands}</a><a href="/privacy${query}">${copy.privacy}</a><a href="/terms${query}">${copy.terms}</a></footer></div>`;
  return layout(en ? 'Home' : 'Kezdőlap', content, session, null, language);
}

function formatEur(value, language = 'hu') {
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'hu-HU', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function formatMinorCurrency(value, currency = 'eur', language = 'hu') {
  const code = String(currency || 'eur').toUpperCase();
  const zeroDecimal = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'HUF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
  const amount = (Number(value) || 0) / (zeroDecimal.has(code) ? 1 : 100);
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'hu-HU', {
    style: 'currency', currency: code
  }).format(amount);
}

function pricingPage(session, language = 'hu') {
  const en = language === 'en';
  const labels = en ? {
    eyebrow: 'NEXA SUBSCRIPTIONS', title: 'Choose the subscription that fits your server.',
    lead: 'Start free, then upgrade securely through Stripe. Annual plans include two months at no additional cost.',
    month: 'month', yearly: 'or {price} / year', free: 'Forever free', choose: 'Choose plan', open: 'Open dashboard',
    secure: 'Secure Stripe Checkout · cancel or change the subscription from the customer portal.',
    manual: 'The NEXA owner can still grant complimentary access independently of paid subscriptions.'
  } : {
    eyebrow: 'NEXA ELŐFIZETÉS', title: 'Válaszd ki a szerveredhez illő előfizetést.',
    lead: 'Indulj ingyen, majd válts magasabb csomagra biztonságos Stripe-fizetéssel. Az éves díj két hónap kedvezményt tartalmaz.',
    month: 'hó', yearly: 'vagy {price} / év', free: 'Örökre ingyenes', choose: 'Csomag kiválasztása', open: 'Vezérlőpult megnyitása',
    secure: 'Biztonságos Stripe Checkout · az előfizetés az ügyfélportálon módosítható vagy lemondható.',
    manual: 'A NEXA Owner a fizetős előfizetésektől függetlenül továbbra is adhat ingyenes csomaghozzáférést.'
  };
  const cards = Object.entries(PLAN_CATALOG).map(([key, plan]) => {
    const free = key === 'free';
    const href = free ? (session ? '/dashboard' : '/login') : (session ? `/billing?plan=${key}` : '/login');
    const button = free ? labels.open : labels.choose;
    const features = en ? plan.featuresEn : plan.features;
    return `<article class="price-card${key === 'ultimate' ? ' featured' : ''}"><div class="price-plan">NEXA ${escapeHtml(plan.name.toUpperCase())}</div><h2>${escapeHtml(plan.name)}</h2><div class="price-value">${free ? formatEur(0, language) : formatEur(plan.monthly, language)} <small>/ ${labels.month}</small></div><div class="price-year">${free ? labels.free : labels.yearly.replace('{price}', formatEur(plan.yearly, language))}</div><ul>${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul><div class="actions"><a class="btn${key === 'ultimate' ? '' : ' secondary'}" href="${href}">${button}</a></div></article>`;
  }).join('');
  const content = `<section class="pricing-hero"><div class="eyebrow">${labels.eyebrow}</div><h1>${labels.title}</h1><p class="lead">${labels.lead}</p></section><div class="secure-checkout"><strong>🔒</strong><span>${labels.secure}</span></div><section class="pricing-grid">${cards}</section><div class="notice" style="margin-top:22px">${labels.manual}</div>`;
  return layout(en ? 'Subscriptions' : 'Előfizetés', content, session, null, language, 'subscriptions');
}

function subscriptionStatusLabel(status, language = 'hu') {
  const labels = language === 'en'
    ? { active: 'Active', trialing: 'Trial', past_due: 'Payment due', canceled: 'Cancelled', unpaid: 'Unpaid', incomplete: 'Incomplete' }
    : { active: 'Aktív', trialing: 'Próbaidő', past_due: 'Fizetésre vár', canceled: 'Lemondva', unpaid: 'Sikertelen fizetés', incomplete: 'Folyamatban' };
  return labels[status] || status || (language === 'en' ? 'None' : 'Nincs');
}

async function billingPage(client, session, url) {
  const en = (session?.language || 'en') !== 'hu';
  const language = en ? 'en' : 'hu';
  const t = en ? {
    noGuildTitle: 'No manageable server', noGuildText: 'Invite NEXA Bot to a server you manage first.',
    success: '✅ Payment verified with Stripe and the subscription is active.',
    pending: 'The payment return was received, but activation could not be verified yet.',
    canceled: 'Checkout was cancelled. No charge was made.', failed: 'Payment action failed.',
    currentStripe: 'CURRENT STRIPE SUBSCRIPTION', currentPlan: 'CURRENT PLAN', none: 'No Stripe subscription',
    noneHelp: 'This does not change the server’s Free plan or an Owner-granted plan.', monthly: 'Monthly', yearly: 'Yearly',
    next: 'next renewal', ends: 'ends at the end of the billing period', portal: 'Manage billing and cancellation',
    title: 'Subscription & billing', lead: 'Card details are handled only by Stripe’s secure checkout. NEXA never sees or stores card details.',
    overview: 'Subscription overview', incomplete: 'Online billing is not fully configured yet. The Owner Center shows which Stripe secret or Price ID is missing.',
    target: 'Subscription server', chooseServer: 'Select server', change: 'CHANGE PLAN', choosePlan: 'Choose a paid subscription',
    month: 'month', year: 'year', monthlyChoice: 'Monthly', yearlyChoice: 'Yearly', unavailable: 'unavailable', checkout: 'Continue to secure checkout',
    setupError: 'Stripe setup error', seeError: 'Show the exact error', recommended: 'RECOMMENDED',
    stepServer: '1 · Server', stepPlan: '2 · Plan', stepPayment: '3 · Secure payment', protected: 'Encrypted Stripe checkout'
  } : {
    noGuildTitle: 'Nincs kezelhető szerver', noGuildText: 'Előbb hívd meg a NEXA Botot egy olyan szerverre, amelyet kezelsz.',
    success: '✅ A fizetést a Stripe-nál ellenőriztük, az előfizetés aktív.',
    pending: 'A fizetési visszatérés megérkezett, de az aktiválás még nem volt ellenőrizhető.',
    canceled: 'A fizetés megszakadt, nem történt terhelés.', failed: 'A fizetési művelet nem sikerült.',
    currentStripe: 'JELENLEGI STRIPE ELŐFIZETÉS', currentPlan: 'JELENLEGI CSOMAG', none: 'Nincs Stripe-előfizetés',
    noneHelp: 'A szerver Free vagy Owner által adott csomagját ez nem módosítja.', monthly: 'Havi', yearly: 'Éves',
    next: 'következő forduló', ends: 'a ciklus végén megszűnik', portal: 'Számlázás és lemondás kezelése',
    title: 'Előfizetés és számlázás', lead: 'A kártyaadatokat kizárólag a Stripe biztonságos oldala kezeli; a NEXA nem látja és nem tárolja őket.',
    overview: 'Előfizetések áttekintése', incomplete: 'A fizetés még nincs teljesen bekapcsolva. Az Owner Centerben látható, mely Stripe-kulcs vagy Price ID hiányzik.',
    target: 'Előfizetés cél-szervere', chooseServer: 'Szerver kiválasztása', change: 'CSOMAGVÁLTÁS', choosePlan: 'Válassz fizetős csomagot',
    month: 'hó', year: 'év', monthlyChoice: 'Havi', yearlyChoice: 'Éves', unavailable: 'nem elérhető', checkout: 'Tovább a biztonságos fizetéshez',
    setupError: 'Stripe-beállítási hiba', seeError: 'Pontos hiba megtekintése', recommended: 'AJÁNLOTT',
    stepServer: '1 · Szerver', stepPlan: '2 · Csomag', stepPayment: '3 · Biztonságos fizetés', protected: 'Titkosított Stripe fizetés'
  };
  const guilds = await manageableGuilds(client, session);
  if (!guilds.length) return errorPage(t.noGuildTitle, t.noGuildText, session);
  const requested = String(url.searchParams.get('guild') || '');
  const selected = guilds.find(({ botGuild }) => botGuild.id === requested) || guilds[0];
  let activationError = '';
  let activated = false;
  const checkoutSessionId = String(url.searchParams.get('session_id') || '').trim();
  if (url.searchParams.get('success') === '1') {
    try {
      if (!checkoutSessionId) throw new Error(en ? 'Missing Checkout Session ID.' : 'Hiányzik a Checkout Session azonosító.');
      await reconcileCheckoutSession({
        sessionId: checkoutSessionId,
        guildId: selected.botGuild.id,
        discordUserId: session.user.id
      });
      activated = true;
      await recordAudit('billing_checkout_reconciled', {
        actorId: session.user.id,
        guildId: selected.botGuild.id,
        metadata: { checkoutSessionId: checkoutSessionId.slice(0, 80) }
      });
    } catch (error) {
      activationError = String(error.message || error).slice(0, 500);
      await recordError(error, { command: 'billing_checkout_reconcile', guildId: selected.botGuild.id, userId: session.user.id });
    }
  }
  const subscription = getGuildSubscription(selected.botGuild.id);
  const readiness = await validateStripeConfiguration();
  const options = guilds.map(({ botGuild }) => option(botGuild.id, botGuild.name, selected.botGuild.id)).join('');
  const billingError = String(url.searchParams.get('error') || '').slice(0, 500);
  const notice = activated
    ? `<div class="notice">${t.success}</div>`
    : url.searchParams.get('success') === '1'
      ? `<div class="notice error"><strong>${escapeHtml(t.pending)}</strong><br>${escapeHtml(activationError)}</div>`
    : url.searchParams.get('canceled') === '1'
      ? `<div class="notice warn">${t.canceled}</div>`
      : billingError ? `<div class="notice error"><strong>${t.failed}</strong><br>${escapeHtml(billingError)}</div>` : '';
  const current = subscription
    ? `<section class="card"><div class="section-kicker">${t.currentStripe}</div><h2><span class="badge ${escapeHtml(subscription.plan)}">${planName(subscription.plan)}</span> ${escapeHtml(subscriptionStatusLabel(subscription.status, language))}</h2><p class="muted">${subscription.billingCycle === 'yearly' ? t.yearly : t.monthly}${subscription.expiresAt ? ` · ${t.next}: ${escapeHtml(subscription.expiresAt.toLocaleDateString(en ? 'en-GB' : 'hu-HU'))}` : ''}${subscription.cancelAtPeriodEnd ? ` · ${t.ends}` : ''}</p><form method="post" action="/billing/portal" data-billing-form><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="guild_id" value="${escapeHtml(selected.botGuild.id)}"><button class="btn" type="submit">${t.portal}</button></form></section>`
    : `<section class="card"><div class="section-kicker">${t.currentPlan}</div><h2>${t.none}</h2><p class="muted">${t.noneHelp}</p></section>`;
  const cards = ['pro', 'ultimate'].map((key) => {
    const plan = PLAN_CATALOG[key];
    const monthlyReady = Boolean(readiness.secret && readiness.prices[`${key}:monthly`]);
    const yearlyReady = Boolean(readiness.secret && readiness.prices[`${key}:yearly`]);
    const disabled = !monthlyReady && !yearlyReady;
    const action = disabled
      ? `<div class="notice error billing-inline-error"><strong>${t.setupError}</strong><br>${escapeHtml(readiness.details.prices[`${key}:monthly`]?.message || readiness.details.secret.message)}</div><a class="btn secondary" href="#stripe-readiness">${t.seeError}</a>`
      : `<button class="btn${key === 'ultimate' ? '' : ' secondary'}" type="submit">${t.checkout}</button>`;
    const features = en ? plan.featuresEn : plan.features;
    return `<article class="billing-plan billing-plan-${key}${key === 'ultimate' ? ' featured' : ''}"><div class="billing-plan-head"><div><span class="badge ${key}">NEXA ${plan.name.toUpperCase()}</span><h3>${formatEur(plan.monthly, language)} <small>/ ${t.month}</small></h3><div class="muted">${formatEur(plan.yearly, language)} / ${t.year}</div></div>${key === 'ultimate' ? `<span class="billing-recommended">${t.recommended}</span>` : ''}</div><ul class="billing-feature-list">${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul><form method="post" action="/billing/checkout" data-billing-form><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="plan" value="${key}"><input type="hidden" name="guild_id" value="${escapeHtml(selected.botGuild.id)}"><div class="billing-cycle"><label class="${monthlyReady ? '' : 'cycle-disabled'}"><input type="radio" name="cycle" value="monthly"${monthlyReady ? ' checked' : ' disabled'}> <span>${t.monthlyChoice}</span>${monthlyReady ? '' : `<small>${t.unavailable}</small>`}</label><label class="${yearlyReady ? '' : 'cycle-disabled'}"><input type="radio" name="cycle" value="yearly"${!monthlyReady && yearlyReady ? ' checked' : ''}${yearlyReady ? '' : ' disabled'}> <span>${t.yearlyChoice}</span>${yearlyReady ? '' : `<small>${t.unavailable}</small>`}</label></div>${action}<div class="checkout-trust">⌁ ${t.protected}</div></form></article>`;
  }).join('');
  const readinessChecks = [
    ['STRIPE_SECRET_KEY', readiness.details.secret],
    ['STRIPE_WEBHOOK_SECRET', readiness.details.webhook],
    ['STRIPE_PRICE_PRO_MONTHLY', readiness.details.prices['pro:monthly']],
    ['STRIPE_PRICE_PRO_YEARLY', readiness.details.prices['pro:yearly']],
    ['STRIPE_PRICE_ULTIMATE_MONTHLY', readiness.details.prices['ultimate:monthly']],
    ['STRIPE_PRICE_ULTIMATE_YEARLY', readiness.details.prices['ultimate:yearly']]
  ];
  const readinessPanel = `<details class="card section billing-diagnostics" id="stripe-readiness"${!readiness.fullyReady ? ' open' : ''}><summary><span><span class="section-kicker">STRIPE READINESS · ${escapeHtml((readiness.mode || 'OFFLINE').toUpperCase())}</span><strong>${en ? 'Live payment diagnostics' : 'Élő fizetési diagnosztika'}</strong></span><b>${readiness.fullyReady ? `✓ ${en ? 'READY' : 'KÉSZ'}` : `! ${en ? 'ACTION NEEDED' : 'BEÁLLÍTÁS KELL'}`}</b></summary><div class="billing-diagnostics-body"><p class="muted">${en ? 'NEXA verifies every configured Price directly with Stripe. Secret values are never exposed.' : 'A NEXA minden beállított Price azonosítót közvetlenül ellenőriz a Stripe-nál. Titkos értéket soha nem jelenít meg.'}</p><div class="readiness-grid">${readinessChecks.map(([name, result]) => `<div class="readiness-item ${result?.ready ? 'ready' : 'missing'}"><span>${name}</span><b>${result?.ready ? `✓ ${en ? 'VERIFIED' : 'ELLENŐRIZVE'}` : `! ${en ? 'ERROR' : 'HIBA'}`}</b><small>${escapeHtml(result?.message || (en ? 'No diagnostic result.' : 'Nincs diagnosztikai eredmény.'))}</small></div>`).join('')}</div>${!readiness.checkoutReady ? `<div class="notice warn" style="margin-top:14px">${en ? 'Checkout is unavailable until the Stripe secret and at least one recurring EUR Price are verified.' : 'A fizetés addig nem indítható, amíg a Stripe-kulcs és legalább egy ismétlődő EUR Price nincs ellenőrizve.'}</div>` : ''}</div></details>`;
  const persistence = databaseHealth();
  const databaseWarning = persistence.persistent ? '' : `<div class="notice error"><strong>${en ? 'Persistent database unavailable.' : 'A tartós adatbázis nem érhető el.'}</strong><br>${en ? 'Do not accept live payments until DATABASE_URL is connected, otherwise an activation can be lost after a restart.' : 'Ne fogadj éles fizetést addig, amíg a DATABASE_URL nincs csatlakoztatva, mert újraindításkor elveszhet az aktiválás.'}</div>`;
  const paymentState = readiness.checkoutReady ? (en ? 'Stripe ready' : 'Stripe kész') : (en ? 'Setup required' : 'Beállítás szükséges');
  const content = `<div class="billing-page"><div class="page-head billing-page-head"><div><div class="section-kicker">NEXA SUBSCRIPTION CENTER</div><h1>${t.title}</h1><p class="muted">${t.lead}</p></div><a class="btn secondary" href="/subscriptions?lang=${language}">${t.overview}</a></div><div class="billing-steps"><div class="active"><span>01</span><strong>${t.stepServer}</strong></div><div class="active"><span>02</span><strong>${t.stepPlan}</strong></div><div class="${readiness.checkoutReady ? 'active' : ''}"><span>03</span><strong>${t.stepPayment}</strong></div></div>${notice}${databaseWarning}${!readiness.fullyReady ? `<div class="notice warn">${t.incomplete}</div>` : ''}<section class="billing-selector card"><div class="billing-selected-server">${guildIcon(selected.botGuild)}<div><span>${t.target}</span><strong>${escapeHtml(selected.botGuild.name)}</strong><small>${escapeHtml(selected.botGuild.id)}</small></div></div><form method="get" action="/billing"><select name="guild">${options}</select><button class="btn secondary" type="submit">${t.chooseServer}</button></form><div class="billing-health ${readiness.checkoutReady ? 'ready' : 'missing'}"><i></i><span>${paymentState}</span></div></section><div class="billing-grid" id="subscription-action">${current}<section class="card billing-plans-shell"><div class="section-kicker">${t.change}</div><h2>${t.choosePlan}</h2><div class="billing-plans">${cards}</div></section></div>${readinessPanel}</div>`;
  return layout(en ? 'Subscription' : 'Előfizetés', content, session, getGuildConfig(selected.botGuild.id).branding);
}
function platformShowcasePage(session, language = 'hu') {
  const en = language === 'en';
  const dashboardHref = session ? '/dashboard' : '/login';
  const copy = en ? {
    eyebrow: 'NEXA PLATFORM 20.0 · CONNECTED OPERATIONS',
    titleA: 'One platform.', titleB: 'Every Discord operation.',
    lead: 'A connected management layer for moderation, security, support, automation and owner-grade infrastructure — designed to stay clear as your network grows.',
    primary: session ? 'Open Command Deck' : 'Sign in with Discord', invite: 'Invite NEXA Bot',
    proof: ['English and Hungarian', 'Server-specific control', 'Audited operations'],
    map: 'LIVE SYSTEM MAP', core: 'NEXA CORE', coreState: 'ALL SYSTEMS NOMINAL',
    metricA: 'connected systems', metricB: 'security layers', metricC: 'languages',
    sectionKicker: 'MODULAR ARCHITECTURE', sectionTitle: 'Purpose-built systems. One control plane.',
    sectionLead: 'Each module remains independently configurable while sharing identity, permissions, audit and server context.',
    flowKicker: 'CONTROLLED OPERATIONS', flowTitle: 'From intent to verified action.',
    flowLead: 'Important changes move through a visible, permission-aware workflow instead of becoming hidden one-click actions.',
    ctaKicker: 'DEPLOY NEXA', ctaTitle: 'Turn your Discord server into an operated platform.',
    ctaLead: 'Start with the core systems, then activate advanced protection and owner tools when your server is ready.',
    open: 'Open dashboard', learn: 'Explore knowledge base'
  } : {
    eyebrow: 'NEXA PLATFORM 20.0 · ÖSSZEKAPCSOLT MŰKÖDÉS',
    titleA: 'Egy platform.', titleB: 'Minden Discord-művelet.',
    lead: 'Összekapcsolt irányítási réteg moderációhoz, védelemhez, supporthoz, automatizáláshoz és owner szintű infrastruktúrához — növekedés közben is átláthatóan.',
    primary: session ? 'Command Deck megnyitása' : 'Belépés Discorddal', invite: 'NEXA Bot meghívása',
    proof: ['Magyar és angol', 'Szerverenkénti vezérlés', 'Auditált műveletek'],
    map: 'ÉLŐ RENDSZERTÉRKÉP', core: 'NEXA MAG', coreState: 'MINDEN RENDSZER ÜZEMKÉSZ',
    metricA: 'összekapcsolt rendszer', metricB: 'védelmi réteg', metricC: 'nyelv',
    sectionKicker: 'MODULÁRIS ARCHITEKTÚRA', sectionTitle: 'Célzott rendszerek. Egyetlen irányítás.',
    sectionLead: 'Minden modul külön konfigurálható, miközben közös identitás-, jogosultság-, audit- és szerverkörnyezetet használ.',
    flowKicker: 'ELLENŐRZÖTT MŰKÖDÉS', flowTitle: 'A szándéktól a hitelesített végrehajtásig.',
    flowLead: 'A fontos változások látható, jogosultságtudatos folyamaton haladnak végig, nem rejtett egykattintásos műveletként futnak le.',
    ctaKicker: 'NEXA TELEPÍTÉS', ctaTitle: 'Alakítsd valóban üzemeltetett platformmá a Discord-szervered.',
    ctaLead: 'Indulj az alap rendszerekkel, majd kapcsold be a fejlett védelmet és owner eszközöket, amikor a szerver készen áll.',
    open: 'Dashboard megnyitása', learn: 'Tudásközpont'
  };
  const systems = en ? [
    ['OS', 'NEXA OS Studio', 'Build signed, repeatable server blueprints with a local engine and a zero-delete Digital Twin preview.', ['Local engine', 'Digital Twin', 'Signed plan'], 'primary'],
    ['SH', 'NEXA Shield', 'Layered Automod, raid detection, Bot Guard and emergency lockdown with traceable decisions.', ['Anti-Nuke', 'Raid defense', 'Bot Guard'], 'shield'],
    ['CG', 'ChronoGuard', 'Detect structural drift through signed snapshots and prepare previewed, owner-approved recovery.', ['Snapshots', 'Drift map', 'Recovery'], 'cyan'],
    ['AG', 'AEGIS Permission DNA', 'Map dangerous privileges, role hierarchy, blast radius and identities the bot cannot contain.', ['Risk score', 'Role DNA', 'Containment'], 'violet'],
    ['CD', 'Command Deck', 'Configure modules, channels, roles, command language and branding separately for every server.', ['Live state', 'Draft recovery', 'Validation'], 'blue'],
    ['WF', 'Workflow Studio', 'Design forms, approvals, target channels, role access, pings and case-number rules without code.', ['Custom forms', 'Approvals', 'Role access'], 'gold'],
    ['SP', 'Support Bridge', 'Connect web requests to private Discord tickets with live status, staff replies and transcripts.', ['Web ↔ Discord', 'Live sync', 'Transcript'], 'mint'],
    ['AI', 'NEXA AI', 'Permission-bound channel and DM assistance with cooldowns, usage limits and consent-based memory.', ['AI channels', 'Private DM', 'Opt-in memory'], 'rose'],
    ['ER', 'ER:LC Bridge', 'Keep private-server credentials encrypted while exposing controlled telemetry and owner operations.', ['Encrypted key', 'Telemetry', 'Owner console'], 'slate']
  ] : [
    ['OS', 'NEXA OS Studio', 'Aláírt, ismételhető szerverterv helyi motorral és törlésmentes Digital Twin előnézettel.', ['Helyi motor', 'Digital Twin', 'Aláírt terv'], 'primary'],
    ['SH', 'NEXA Shield', 'Többrétegű Automod, raidfelismerés, Bot Guard és vészlezárás visszakövethető döntésekkel.', ['Anti-Nuke', 'Raidvédelem', 'Bot Guard'], 'shield'],
    ['CG', 'ChronoGuard', 'Aláírt pillanatképekkel észleli a szerkezeti eltérést, majd előnézetes helyreállítást készít.', ['Pillanatkép', 'Drift térkép', 'Helyreállítás'], 'cyan'],
    ['AG', 'AEGIS Permission DNA', 'Feltérképezi a veszélyes jogokat, ranghierarchiát, robbanási sugarat és elszigetelési hiányt.', ['Kockázati pont', 'Jogosultság-DNS', 'Elszigetelés'], 'violet'],
    ['CD', 'Command Deck', 'Szerverenként kezeli a modulokat, csatornákat, rangokat, parancsnyelvet és arculatot.', ['Élő állapot', 'Piszkozatmentés', 'Validáció'], 'blue'],
    ['WF', 'Workflow Studio', 'Kód nélkül készíthető egyedi adatlap, jóváhagyás, célcsatorna, rangping és ügyszámszabály.', ['Egyedi űrlap', 'Jóváhagyás', 'Rangjog'], 'gold'],
    ['SP', 'Support Bridge', 'A webes segítségkérést privát Discord-tickethez kapcsolja élő állapottal és átirattal.', ['Web ↔ Discord', 'Élő szinkron', 'Transcript'], 'mint'],
    ['AI', 'NEXA AI', 'Jogosultsághoz kötött csatornás és privát segítség korláttal és beleegyezéses memóriával.', ['AI-csatorna', 'Privát DM', 'Opt-in memória'], 'rose'],
    ['ER', 'ER:LC Bridge', 'Titkosítva tárolja a privátszerver-kulcsot, és ellenőrzött telemetriát ad az ownernek.', ['Titkosított kulcs', 'Telemetria', 'Owner konzol'], 'slate']
  ];
  const steps = en ? [
    ['01', 'Configure', 'Select the server, modules, channels, roles and operating language.'],
    ['02', 'Validate', 'NEXA checks permissions, required targets and unsafe configuration before saving.'],
    ['03', 'Operate', 'Staff work from Discord panels while the web reports live state and history.'],
    ['04', 'Recover', 'Signed snapshots and owner gates keep critical recovery deliberate and auditable.']
  ] : [
    ['01', 'Beállítás', 'Válaszd ki a szervert, modulokat, csatornákat, rangokat és működési nyelvet.'],
    ['02', 'Ellenőrzés', 'A NEXA mentés előtt ellenőrzi a jogokat, célokat és veszélyes beállításokat.'],
    ['03', 'Működtetés', 'A Staff Discord-panelekről dolgozik, a web pedig élő állapotot és előzményt mutat.'],
    ['04', 'Helyreállítás', 'Aláírt pillanatkép és owner jóváhagyás védi a kritikus helyreállítást.']
  ];
  const cards = systems.map(([code, title, body, tags, tone], index) => `<article class="platform-system system-${escapeHtml(tone)}${index === 0 ? ' system-featured' : ''}"><div class="system-top"><span class="system-code">${escapeHtml(code)}</span><span class="system-state"><i></i>${en ? 'CONNECTED' : 'KAPCSOLVA'}</span></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p><div class="system-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></article>`).join('');
  const flow = steps.map(([number, title, body]) => `<article class="platform-flow-step"><span>${number}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div></article>`).join('');
  const content = `<div class="platform-v20"><section class="platform-hero-v20"><div class="platform-hero-copy"><div class="platform-eyebrow"><i></i>${copy.eyebrow}</div><h1>${copy.titleA}<br><span>${copy.titleB}</span></h1><p>${copy.lead}</p><div class="actions"><a class="btn" href="${dashboardHref}">${copy.primary} →</a><a class="btn secondary" href="${escapeHtml(inviteUrl())}">${copy.invite}</a></div><div class="platform-proof">${copy.proof.map((item) => `<span><b>✓</b>${escapeHtml(item)}</span>`).join('')}</div></div><div class="platform-map"><div class="platform-map-bar"><span>${copy.map}</span><b><i></i>${copy.coreState}</b></div><div class="platform-orbit"><div class="orbit-ring ring-one"></div><div class="orbit-ring ring-two"></div><div class="orbit-node node-shield">SHIELD</div><div class="orbit-node node-ai">AI</div><div class="orbit-node node-data">DATA</div><div class="platform-core"><small>${copy.core}</small><strong>N</strong><span>20.0</span></div></div><div class="platform-map-metrics"><div><strong>9</strong><span>${copy.metricA}</span></div><div><strong>4</strong><span>${copy.metricB}</span></div><div><strong>2</strong><span>${copy.metricC}</span></div></div></div></section><section class="platform-section"><header class="platform-section-head"><div><span>${copy.sectionKicker}</span><h2>${copy.sectionTitle}</h2></div><p>${copy.sectionLead}</p></header><div class="platform-system-grid">${cards}</div></section><section class="platform-section platform-flow"><header class="platform-section-head"><div><span>${copy.flowKicker}</span><h2>${copy.flowTitle}</h2></div><p>${copy.flowLead}</p></header><div class="platform-flow-grid">${flow}</div></section><section class="platform-final"><div><span>${copy.ctaKicker}</span><h2>${copy.ctaTitle}</h2><p>${copy.ctaLead}</p></div><div class="actions"><a class="btn" href="${dashboardHref}">${copy.open} →</a><a class="btn secondary" href="/tudaskozpont${en ? '?lang=en' : ''}">${copy.learn}</a></div></section></div>`;
  return layout(en ? 'Platform' : 'NEXA Platform', content, session, null, language, 'platform');
}

function publicInfoPage(kind, session, language = 'hu') {
  if (kind === 'platform') return platformShowcasePage(session, language);
  const en = language === 'en';
  const pages = en ? {
    platform: ['Platform', 'A production-grade Discord operations platform built around secure automation, live oversight and owner-controlled integrations.', [
      ['Command Deck', 'Per-server modules, channels, roles, language and branding with clear saved-state feedback.'],
      ['Owner Operations', 'Network inventory, health, packages, audit, custom document workflows and full shift administration.'],
      ['NEXA OS Studio', 'Primary-owner-only written blueprints, signed previews, repeatable deployment and non-destructive recovery.'],
      ['NEXA Shield', 'Automod, raid detection, Anti-Nuke, whitelists and emergency lockdown with traceable decisions.'],
      ['ChronoGuard', 'Signed server snapshots, explainable drift detection, Incident Capsules and owner-approved safe recovery.'],
      ['AEGIS Permission DNA', 'Owner-only privilege intelligence for dangerous access, blast radius, containment gaps and permission drift.'],
      ['ER:LC Bridge', 'Encrypted private-server key storage, live server telemetry, player/staff overview and owner-only remote commands.'],
      ['Workflow Studio', 'Create custom forms with your own questions, target channel, access role, approval and case-number rules.'],
      ['NEXA AI', 'Private, permission-bound AI channels and direct assistance with consent-based memory and usage controls.']
    ]],
    commands: ['Commands', 'NEXA Bot combines clear Discord panels with slash commands for precise actions.', [
      ['Moderation', '/ban, /unban, /kick, /timeout, /untimeout, /warn, /warnings, /clearwarns, /clear, /slowmode, /lock, /unlock, /nick'],
      ['Information', '/userinfo, /serverinfo, /avatar, /help'],
      ['Community', '/szint, /szint-ranglista, /otlet, /szavazas, /rangpanel, /nyeremenyjatek'],
      ['System', '/beallitas, /vedelem, /nexa, /szolgalat, /chronoguard, /aegis']
    ]],
    privacy: ['Privacy notice', 'The bot stores only the Discord identifiers, server settings, moderation cases and usage statistics required for its features. For subscriptions it also stores Stripe customer and subscription identifiers, plan, status and renewal date, but never card details. Secret keys remain server-side or use authenticated encryption. Private AI conversations are not exposed in the Owner Center; personal memory requires explicit consent.', []],
    terms: ['Terms of service', 'Paid plans renew monthly or annually until cancelled in the Stripe Customer Portal. Cancellation normally takes effect at the end of the paid period. The current price and billing cycle are shown before checkout; mandatory consumer rights remain unaffected. Server owners remain responsible for lawful permissions, moderation and local rules. Access may be suspended for abuse, unsafe API load, non-payment or a security risk.', []]
  } : {
    platform: ['NEXA Platform', 'Production szintű Discord üzemeltetési rendszer biztonságos automatizálással, élő felügyelettel és owner által vezérelt integrációkkal.', [
      ['Command Deck', 'Szerverenkénti modulok, csatornák, rangok, nyelv és arculat egyértelmű mentési állapottal.'],
      ['Owner Operations', 'Hálózati áttekintés, állapot, csomagok, audit, egyedi dokumentumfolyamatok és teljes szolgálatkezelés.'],
      ['NEXA OS Studio', 'Csak az elsődleges owner által elérhető leírásos terv, aláírt előnézet, ismételhető telepítés és rombolásmentes javítás.'],
      ['NEXA Shield', 'Automod, raidfelismerés, Anti-Nuke, whitelist és vészlezárás visszakövethető döntésekkel.'],
      ['ChronoGuard', 'Aláírt szerverpillanatképek, magyarázható eltérésészlelés, Incident Capsule és Owner által jóváhagyott biztonságos helyreállítás.'],
      ['AEGIS Permission DNA', 'Owner-only jogosultsági intelligencia veszélyes hozzáféréshez, robbanási sugárhoz, elszigetelési hiányhoz és jogeltéréshez.'],
      ['ER:LC Bridge', 'Titkosított privátszerver-kulcs, élő szerveradatok, játékos- és staffnézet, owneres távoli parancsok.'],
      ['Workflow Studio', 'Saját kérdésekkel, célcsatornával, ranggal, jóváhagyással és ügyszámszabállyal készíthető adatlapok.'],
      ['NEXA AI', 'Jogosultsághoz kötött AI-csatornák és privát segítség beleegyezéses memóriával és használati korlátokkal.']
    ]],
    commands: ['Parancsok', 'A NEXA Bot fő funkciói átlátható Discord-panelekről és slash parancsokkal is elérhetők.', [
      ['Moderáció', '/ban, /unban, /kick, /timeout, /untimeout, /warn, /warnings, /clearwarns, /clear, /slowmode, /lock, /unlock, /nick'],
      ['Információ', '/userinfo, /serverinfo, /avatar, /help'],
      ['Közösség', '/szint, /szint-ranglista, /otlet, /szavazas, /rangpanel, /nyeremenyjatek'],
      ['Rendszer', '/beallitas, /vedelem, /nexa, /szolgalat, /chronoguard, /aegis']
    ]],
    privacy: ['Adatvédelmi tájékoztató', 'A bot csak a működéshez szükséges Discord-azonosítókat, szerverbeállításokat, moderációs eseteket és használati statisztikát tárolja. Előfizetésnél a Stripe ügyfél- és előfizetés-azonosítója, a csomag, az állapot és a fordulónap is mentésre kerül, bankkártyaadat azonban soha. A titkos kulcsok szerveroldali környezeti változók vagy hitelesített titkosítással tárolt értékek. Az Owner Center nem jelenít meg privát AI-beszélgetéseket; a személyes memória külön beleegyezést igényel.', []],
    terms: ['Felhasználási feltételek', 'A fizetős csomag havonta vagy évente automatikusan megújul a Stripe ügyfélportálon történő lemondásig. A lemondás főszabály szerint a kifizetett időszak végén lép életbe. A pontos ár és számlázási ciklus fizetés előtt látható; a kötelező fogyasztói jogokat ez nem korlátozza. A szervertulajdonos felel a jogosultságok, moderáció és helyi szabályzat jogszerű beállításáért. Visszaélés, veszélyes API-terhelés, nemfizetés vagy biztonsági kockázat esetén a hozzáférés felfüggeszthető.', []]
  };
  const [title, description, sections] = pages[kind] || pages.commands;
  const query = en ? '?lang=en' : '';
  return layout(title, `<section class="hero"><div class="eyebrow">NEXA Bot 20.3.1</div><h1>${escapeHtml(title)}</h1><p class="lead">${escapeHtml(description)}</p><div class="actions"><a class="btn secondary" href="/${query}">← ${en ? 'Home' : 'Kezdőlap'}</a><a class="btn" href="${escapeHtml(inviteUrl())}">${en ? 'Invite bot' : 'Bot meghívása'}</a></div></section><div class="grid">${sections.map(([name, body], index) => `<article class="card${kind === 'platform' && index < 2 ? ' feature-wide' : ''}"><div class="feature-icon">${['◈','⌾','⬢','↗','▤','✦'][index] || '◇'}</div><h2>${escapeHtml(name)}</h2><p class="muted">${escapeHtml(body)}</p></article>`).join('')}</div>`, session, null, language, kind);
}

function knowledgeBasePage(session, language = 'hu') {
  const en = language === 'en';
  const entries = en ? [
    ['01', 'Getting started and dashboard', 'Connect NEXA to a server, sign in with Discord OAuth2 and configure every guild separately.', 'Server owner, administrators and the selected dashboard role.', 'Dashboard → select server → Settings.', 'Bot invitation, correct Discord permissions and OAuth redirect URL.'],
    ['02', 'Moderation and Case IDs', 'Ban, kick, timeout, warnings, channel locks and cleanup. Every action receives an auditable Case ID.', 'Members with the required Discord moderation permission or configured staff role.', 'Discord commands and the Moderation module in the dashboard.', 'The NEXA role must sit above the target member and target role.'],
    ['03', 'Automod', 'Filters spam, flood, repeated text, mass mentions, invites, links, scams, caps, emoji abuse and blocked words.', 'Administrators configure it; enforcement runs automatically.', 'Dashboard → Automod / Protection.', 'Enable the desired filters, choose punishment and optional user, role or channel exceptions.'],
    ['04', 'Raid, Anti-Nuke and Bot Guard', 'Watches mass joins, channel or role destruction, bans, kicks, webhooks, permission changes and unapproved bots; it can lock the server immediately.', 'Administrators and leadership decide alerts; only trusted bots are exempt.', 'Dashboard → Protection, plus the log channel.', 'Audit Log permission, a correctly positioned NEXA role and a carefully maintained whitelist.'],
    ['05', 'AEGIS Permission DNA', 'Maps dangerous permissions, blast radius and accounts NEXA cannot contain. A cryptographic DNA baseline reveals later privilege drift.', 'Only the bot owner and owner-authorized operators.', 'Owner Center → server → AEGIS Permission DNA, or /aegis.', 'PostgreSQL for persistent baselines and Member intent for a complete scan.'],
    ['06', 'ChronoGuard Digital Twin', 'Stores signed server snapshots, explains structural drift and prepares non-destructive, previewed recovery.', 'Only the bot owner and owner-authorized operators.', 'Owner Center → server → ChronoGuard.', 'PostgreSQL; CHRONOGUARD_SIGNING_KEY is recommended for HMAC verification.'],
    ['07', 'Tickets and transcripts', 'Creates categorized private support rooms with claim, member management, close, delete and saved HTML transcript.', 'Members open tickets; configured staff handle them.', 'Dashboard → Ticket; publish the panel in a selected channel.', 'Ticket category, staff role and transcript/log channel.'],
    ['08', 'Welcome, autorole and verification', 'Greets new members, sends goodbye messages, assigns separate human/bot roles and can require button verification.', 'Administrators configure it; new members use verification.', 'Dashboard → Welcome / Auto Role.', 'Writable welcome channel and assignable roles below NEXA.'],
    ['09', 'Community systems', 'XP, rank rewards, leaderboards, role buttons, giveaways, polls, suggestions, announcements, starboard and temporary voice rooms.', 'Server members use them; staff configure and moderate them.', 'Dashboard modules and the related Discord panels.', 'Enable only the modules you need and select their channels and roles.'],
    ['10', 'NEXA AI', 'Responds in an appointed AI channel or DM, with cooldown, token limits, abuse protection and opt-in memory.', 'Users can ask; administrators decide where AI is enabled.', 'Dashboard → AI and the Discord AI panel.', 'OPENAI_API_KEY with available API credit; the key stays server-side.'],
    ['11', 'Shift management', 'Tracks duty start, pause, resume and end; owners can edit or fully reset records and inspect statistics.', 'The configured duty role uses it; owners manage records.', 'Discord duty panel and Owner Center → Shift management.', 'Duty role and optional duty log channel.'],
    ['12', 'Owner Center and access plans', 'Shows the complete server network, uptime, resources, errors, audits, paid subscriptions and complimentary plans.', 'The Owner Center is restricted to the bot owner and explicitly authorized operators; server managers can only access billing for their own servers.', 'Owner Center or Billing Center after Discord login.', 'BOT_OWNER_ID, PostgreSQL and Stripe secrets plus Price IDs for online billing.'],
    ['13', 'Custom commands and workflows', 'Creates text, embed and button replies plus custom forms with questions, target channel, allowed role, approval and optional case numbering.', 'Server admins create commands; RP/workflow tools require explicit owner enablement.', 'Dashboard → Custom Commands; Owner Center → Workflow Studio.', 'Chosen output channel, access/reviewer roles and an enabled module.'],
    ['14', 'RP, TGF and ER:LC bridge', 'Provides optional recruitment, records, publishing, service and encrypted ER:LC tools without making NEXA RP-specific.', 'Only on servers explicitly enabled by the bot owner.', 'Owner Center → enable RP system → TGF Forge / Document Studio / ER:LC.', 'Owner permission; ER:LC needs an API key stored with server-side encryption.'],
    ['15', 'NEXA OS Studio and Recovery Center', 'Turns a written owner request into a reviewed role, category, channel, permission, panel and module plan, then applies or repairs it without deleting server resources.', 'Only the primary BOT_OWNER_ID; delegated owner operators cannot open or run it.', 'Owner Center → Servers → NEXA OS Studio.', 'Manage Roles and Manage Channels for NEXA, PostgreSQL for restart-safe deployment history, and SESSION_SECRET for stable signed previews.']
  ] : [
    ['01', 'Kezdés és vezérlőpult', 'A NEXA csatlakoztatása, Discord OAuth2-belépés és minden szerver külön beállítása.', 'Szervertulajdonos, adminisztrátor és a kijelölt webes kezelőrang.', 'Vezérlőpult → szerver kiválasztása → Beállítások.', 'Botmeghívás, megfelelő Discord-jogok és helyes OAuth átirányítási cím.'],
    ['02', 'Moderáció és Case ID', 'Kitiltás, kirúgás, timeout, figyelmeztetés, csatornazárás és törlés. Minden intézkedés visszakereshető Case ID-t kap.', 'A szükséges Discord-joggal vagy kijelölt staff ranggal rendelkező tagok.', 'Discord-parancsok és a webes Moderáció modul.', 'A NEXA rangja legyen a kezelt tag és rang fölött.'],
    ['03', 'Automod', 'Szűri a spamet, floodot, ismétlést, tömeges említést, meghívókat, linkeket, scamet, caps- és emojispamet, valamint tiltott szavakat.', 'Az adminok állítják be, utána automatikusan működik.', 'Vezérlőpult → Automod / Védelem.', 'Kapcsold be a kívánt szűrőket, válassz büntetést és szükség esetén kivételeket.'],
    ['04', 'Raid, Anti-Nuke és Bot Guard', 'Figyeli a tömeges belépést, csatorna- és rangrombolást, banokat, kickeket, webhookokat, jogváltozásokat és az engedély nélküli botokat; veszélyben azonnal lezárhat.', 'A riasztásokról Admin és Vezetőség dönt; csak a megbízható botok kivételek.', 'Vezérlőpult → Védelem, az események pedig a beállított logcsatornába kerülnek.', 'Audit Log jog, jól elhelyezett NEXA-rang és gondosan kezelt whitelist.'],
    ['05', 'AEGIS Permission DNA', 'Feltérképezi a veszélyes jogokat, a lehetséges kár nagyságát és azt, kit nem tudna a bot elszigetelni. A kriptográfiai jogosultság-DNS jelzi a későbbi jogeltérést.', 'Kizárólag a bot Owner és az általa feljogosított Owner-kezelők.', 'Owner Center → szerver → AEGIS Permission DNA, vagy /aegis.', 'Tartós bázishoz PostgreSQL, teljes vizsgálathoz Server Members Intent.'],
    ['06', 'ChronoGuard Digital Twin', 'Aláírt szerverpillanatképet készít, elmagyarázza a szerkezeti eltérést és rombolásmentes, előnézetes helyreállítást készít.', 'Kizárólag a bot Owner és az általa feljogosított Owner-kezelők.', 'Owner Center → szerver → ChronoGuard.', 'PostgreSQL; hiteles HMAC-lánchoz ajánlott a CHRONOGUARD_SIGNING_KEY.'],
    ['07', 'Ticket és átirat', 'Kategóriás privát segítségcsatornát nyit claimmel, tagkezeléssel, lezárással, törléssel és mentett HTML-átirattal.', 'A tagok nyitják, a kijelölt staff kezeli.', 'Vezérlőpult → Ticket; a panelt a kiválasztott csatornába kell telepíteni.', 'Ticket kategória, staff rang és átirat- vagy logcsatorna.'],
    ['08', 'Üdvözlés, autorang és hitelesítés', 'Köszönti és búcsúztatja a tagokat, külön ember- és botrangot adhat, valamint gombos ellenőrzést kérhet.', 'Admin állítja be, az új tag használja a hitelesítést.', 'Vezérlőpult → Welcome / Auto Role.', 'Írható üdvözlőcsatorna és a NEXA rangja alatt lévő kiosztható rangok.'],
    ['09', 'Közösségi rendszerek', 'XP, jutalomrang, ranglista, gombos rang, nyereményjáték, szavazás, ötlet, közlemény, starboard és ideiglenes hangszoba.', 'A tagok használják, a staff állítja be és felügyeli.', 'Webes modulok és a hozzájuk tartozó Discord-panelek.', 'Csak a szükséges modulokat kapcsold be, majd rendeld hozzá a csatornákat és rangokat.'],
    ['10', 'NEXA AI', 'A kijelölt AI-csatornában vagy privát üzenetben válaszol cooldownnal, tokenlimittel, visszaélés-védelemmel és engedélyhez kötött memóriával.', 'A tagok kérdeznek, az admin dönti el, hol legyen engedélyezve.', 'Vezérlőpult → AI és a Discord AI-panel.', 'OPENAI_API_KEY használható API-egyenleggel; a kulcs csak szerveroldalon marad.'],
    ['11', 'Szolgálatkezelés', 'Méri a szolgálat indítását, szünetét, folytatását és végét; az Owner szerkesztheti vagy teljesen nullázhatja az adatokat.', 'A kijelölt szolgálati rang használja, az Owner kezeli az adatokat.', 'Discord szolgálati panel és Owner Center → Szolgálatkezelés.', 'Szolgálati rang és opcionális szolgálati naplócsatorna.'],
    ['12', 'Owner Center és csomagok', 'Megmutatja a teljes szerverhálózatot, uptime-ot, erőforrásokat, hibákat, auditot és funkcióállapotot; innen kezelhető blacklist, maintenance, fizetett előfizetés és ingyen kiosztott csomag.', 'Az Owner Center csak a bot Owner és az általa külön engedélyezett kezelők számára elérhető; a saját számlázást a szerver kezelője nyithatja meg.', 'Discord-belépés után az Owner Centerben vagy a Számlázási központban.', 'BOT_OWNER_ID, PostgreSQL és az online fizetéshez Stripe-kulcsok és Price ID-k.'],
    ['13', 'Egyedi parancsok és workflow-k', 'Szöveges, embed- és gombos válaszokat, valamint saját kérdéses adatlapot készít célcsatornával, használati ranggal, jóváhagyással és opcionális ügyszámmal.', 'A szerveradmin saját parancsot készít; az RP/workflow részt az Owner külön engedélyezi.', 'Vezérlőpult → Custom Commands; Owner Center → Workflow Studio.', 'Célcsatorna, használó/bíráló rang és bekapcsolt modul.'],
    ['14', 'RP, TGF és ER:LC Bridge', 'Opcionális felvételi, irat-, közzétételi, szolgálati és titkosított ER:LC-eszközöket ad anélkül, hogy a NEXA alapból RP-bot lenne.', 'Csak azon a szerveren, amelyen a bot Owner ezt külön bekapcsolta.', 'Owner Center → RP-rendszer bekapcsolása → TGF Forge / Iratstúdió / ER:LC.', 'Owner jogosultság; ER:LC-hez titkosítva tárolt API-kulcs.'],
    ['15', 'NEXA OS Studio és Recovery Center', 'A leírt owner-igényből ellenőrizhető rang-, kategória-, csatorna-, jogosultság-, panel- és modultervet készít, majd törlés nélkül telepíti vagy javítja.', 'Kizárólag az elsődleges BOT_OWNER_ID; a külön felvett Owner-kezelők sem nyithatják meg és nem futtathatják.', 'Owner Center → Szerverek → NEXA OS Studio.', 'NEXA Rangok kezelése és Csatornák kezelése jog, PostgreSQL az újraindításbiztos előzményekhez, valamint SESSION_SECRET a tartós tervaláíráshoz.']
  ];
  const labels = en
    ? { title: 'NEXA Knowledge Base', lead: 'A practical map of every major NEXA system: what it does, who can use it, where to configure it and what it needs.', what: 'What does it do?', who: 'Who can use it?', where: 'Where do I configure it?', need: 'What does it need?', back: 'Back to home', open: 'Open dashboard' }
    : { title: 'NEXA Tudásközpont', lead: 'Gyakorlati térkép minden fontos NEXA-rendszerhez: mit tud, ki használhatja, hol állítható és mi kell a működéséhez.', what: 'Mit csinál?', who: 'Ki használhatja?', where: 'Hol állítod?', need: 'Mi kell hozzá?', back: 'Vissza a kezdőlapra', open: 'Vezérlőpult megnyitása' };
  const cards = entries.map(([number, title, what, who, where, need], index) => `<details class="knowledge-card"${index === 0 ? ' open' : ''}><summary><span>${escapeHtml(number)}</span><strong>${escapeHtml(title)}</strong><i>+</i></summary><div class="knowledge-body"><dl><div><dt>${labels.what}</dt><dd>${escapeHtml(what)}</dd></div><div><dt>${labels.who}</dt><dd>${escapeHtml(who)}</dd></div><div><dt>${labels.where}</dt><dd>${escapeHtml(where)}</dd></div><div><dt>${labels.need}</dt><dd>${escapeHtml(need)}</dd></div></dl></div></details>`).join('');
  const content = `<section class="knowledge-hero"><div class="eyebrow">NEXA 20.3.1 • SYSTEM ATLAS</div><h1>${labels.title}</h1><p class="lead">${labels.lead}</p><div class="actions"><a class="btn secondary" href="/${en ? '?lang=en' : ''}">← ${labels.back}</a><a class="btn" href="${session ? '/dashboard' : '/login'}">${labels.open}</a></div></section><nav class="knowledge-index" aria-label="${en ? 'Knowledge categories' : 'Tudástár kategóriák'}">${entries.map(([number, title]) => `<span><b>${escapeHtml(number)}</b>${escapeHtml(title)}</span>`).join('')}</nav><section class="knowledge-grid">${cards}</section>`;
  return layout(labels.title, content, session, null, language, 'guide');
}

function errorPage(title, message, session = null) {
  return layout(title, `<div class="card"><h1>${escapeHtml(title)}</h1><p class="error">${escapeHtml(message)}</p><a class="btn secondary" href="/">Vissza</a></div>`, session);
}

function guildIcon(guild) {
  return guild.icon
    ? `<img alt="" src="https://cdn.discordapp.com/icons/${escapeHtml(guild.id)}/${escapeHtml(guild.icon)}.png">`
    : `<div class="server-icon">${escapeHtml(guild.name.slice(0, 2).toUpperCase())}</div>`;
}

async function userCanManageGuild(session, oauthGuild, botGuild) {
  if (isOwnerUser(session?.user?.id)) return true;
  if (!oauthGuild) return false;
  const permissions = BigInt(oauthGuild.permissions || '0');
  const ownerOrAdmin = oauthGuild.owner ||
    (permissions & PermissionFlagsBits.Administrator) !== 0n;
  if (ownerOrAdmin) return true;
  const roleId = getGuildConfig(botGuild.id).roles.dashboard;
  if (!roleId) return false;
  const member = await botGuild.members.fetch(session.user.id).catch(() => null);
  return Boolean(member?.roles.cache.has(roleId));
}

async function manageableGuilds(client, session) {
  if (isOwnerUser(session.user.id)) {
    return [...client.guilds.cache.values()].map((botGuild) => ({
      botGuild,
      oauthGuild: {
        id: botGuild.id,
        name: botGuild.name,
        icon: botGuild.icon,
        owner: botGuild.ownerId === session.user.id,
        permissions: '0'
      }
    }));
  }
  const result = [];
  for (const oauthGuild of session.guilds) {
    const botGuild = client.guilds.cache.get(oauthGuild.id);
    if (!botGuild) continue;
    if (await userCanManageGuild(session, oauthGuild, botGuild)) result.push({ oauthGuild, botGuild });
  }
  return result;
}

async function ownerDashboard(client, session, saved = false, options = {}) {
  const guilds = [...client.guilds.cache.values()]
    .sort((a, b) => Number(b.memberCount || 0) - Number(a.memberCount || 0));
  const search = String(options.search || '').trim().slice(0, 100);
  const normalizedSearch = search.toLocaleLowerCase('hu-HU');
  const filteredGuilds = normalizedSearch
    ? guilds.filter((guild) => guild.id.includes(normalizedSearch) || guild.name.toLocaleLowerCase('hu-HU').includes(normalizedSearch))
    : guilds;
  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(filteredGuilds.length / pageSize));
  const requestedPage = Number.parseInt(options.page, 10);
  const page = Math.min(totalPages, Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1));
  const visibleGuilds = filteredGuilds.slice((page - 1) * pageSize, page * pageSize);
  const settings = getOwnerSettings();
  const resolveUsers = async (ids) => Promise.all(ids.map(async (id) => {
    const user = client.users.cache.get(id) || await client.users.fetch(id).catch(() => null);
    return { id, label: user ? (user.globalName || user.username || user.tag) : 'Ismeretlen felhasználó' };
  }));
  const [allowedUsers, ownerUsers, summary, operations, errors, audit, premiumResult, subscriptionResult, paymentSummaryResult, paymentsResult] = await Promise.all([
    resolveUsers(settings.aiAllowedUsers),
    resolveUsers(settings.ownerUsers),
    usageSummary(),
    operationalSummary(),
    recentEvents('errors', 8),
    recentEvents('audit', 8),
    dbQuery('SELECT guild_id, premium_type, starts_at, expires_at, granted_by, source, note FROM nexabot_premium ORDER BY starts_at DESC LIMIT 250').catch(() => null),
    dbQuery('SELECT guild_id, discord_user_id, plan, billing_cycle, status, current_period_end, cancel_at_period_end, updated_at FROM nexabot_subscriptions ORDER BY updated_at DESC LIMIT 250').catch(() => null),
    dbQuery("SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND currency = 'eur'), 0) AS total_paid, COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND currency = 'eur' AND created_at >= NOW() - INTERVAL '30 days'), 0) AS paid_30d, COUNT(*) FILTER (WHERE status = 'paid') AS successful, COUNT(*) FILTER (WHERE status <> 'paid') AS failed FROM nexabot_payments").catch(() => null),
    dbQuery('SELECT stripe_invoice_id, guild_id, amount, currency, status, paid_at, created_at FROM nexabot_payments ORDER BY created_at DESC LIMIT 50').catch(() => null)
  ]);
  await Promise.all(visibleGuilds.map((guild) => client.users.cache.get(guild.ownerId) || client.users.fetch(guild.ownerId).catch(() => null)));
  const runtime = runtimeStats(client);
  const environment = environmentReadiness();
  const stripeReadiness = await validateStripeConfiguration();
  const stripeChecks = {
    STRIPE_SECRET_KEY: { ready: stripeReadiness.secret, message: stripeReadiness.details.secret.message },
    STRIPE_WEBHOOK_SECRET: { ready: stripeReadiness.webhook, message: stripeReadiness.details.webhook.message },
    STRIPE_PRICES: {
      ready: Object.values(stripeReadiness.prices).every(Boolean),
      message: `${Object.values(stripeReadiness.prices).filter(Boolean).length}/4 Stripe Price ellenőrizve · ${(stripeReadiness.mode || 'offline').toUpperCase()}`
    }
  };
  const environmentRows = environment.checks.map((item) => {
    const live = stripeChecks[item.key];
    const ready = live ? live.ready : item.ready;
    const state = ready ? '● Ellenőrizve' : item.required ? '● Hiányzik vagy hibás' : '○ Nincs kész';
    return `<div class="status-row"><strong>${escapeHtml(item.label)}</strong><span class="${ready ? 'status-ok' : item.required ? 'status-bad' : 'muted'}">${state}${live ? `<br><small>${escapeHtml(live.message)}</small>` : ''}</span></div>`;
  }).join('');
  const packageRows = (premiumResult?.rows || []).length
    ? premiumResult.rows.map((row) => `<tr><td>${escapeHtml(row.guild_id)}</td><td><span class="badge ${escapeHtml(row.premium_type)}">${planName(row.premium_type)}</span></td><td>${row.expires_at ? escapeHtml(new Date(row.expires_at).toLocaleDateString('hu-HU')) : 'Korlátlan'}</td><td>${escapeHtml(row.note || 'Owner által kiosztva')}</td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">Még nincs külön kiosztott csomag.</td></tr>';
  const subscriptionRows = (subscriptionResult?.rows || []).length
    ? subscriptionResult.rows.map((row) => `<tr><td>${escapeHtml(row.guild_id)}</td><td><span class="badge ${escapeHtml(row.plan)}">${planName(row.plan)}</span></td><td>${escapeHtml(subscriptionStatusLabel(row.status))}</td><td>${row.billing_cycle === 'yearly' ? 'Éves' : 'Havi'}</td><td>${row.current_period_end ? escapeHtml(new Date(row.current_period_end).toLocaleDateString('hu-HU')) : '—'}${row.cancel_at_period_end ? ' · lemondva a ciklus végére' : ''}</td></tr>`).join('')
    : '<tr><td colspan="5" class="muted">Még nincs Stripe-előfizetés.</td></tr>';
  const paymentSummary = paymentSummaryResult?.rows?.[0] || { total_paid: 0, paid_30d: 0, successful: 0, failed: 0 };
  const paymentRows = (paymentsResult?.rows || []).length
    ? paymentsResult.rows.map((row) => `<tr><td>${escapeHtml(row.stripe_invoice_id)}</td><td>${escapeHtml(row.guild_id)}</td><td>${formatMinorCurrency(Number(row.amount || 0), row.currency || 'eur')}</td><td>${escapeHtml(String(row.currency || 'eur').toUpperCase())}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(new Date(row.paid_at || row.created_at).toLocaleString('hu-HU'))}</td></tr>`).join('')
    : '<tr><td colspan="6" class="muted">Még nincs rögzített Stripe-számla.</td></tr>';
  let serverCards = visibleGuilds.length ? visibleGuilds.map((guild) => {
    const activeModules = Object.entries(getGuildConfig(guild.id).modules)
      .filter(([key, enabled]) => key !== 'bvi' && enabled)
      .map(([key]) => key);
    const rpActive = settings.rpGuilds.includes(guild.id);
    if (rpActive) activeModules.push('owner-rp');
    const owner = client.users.cache.get(guild.ownerId);
    const ownerDisplay = owner ? `${owner.globalName || owner.username || owner.tag} (@${owner.username})` : 'Unknown Discord user';
    const disabled = settings.blacklistedGuilds.includes(guild.id);
    const entitlement = getGuildEntitlement(guild.id);
    const plan = entitlement.plan;
    const joined = guild.members.me?.joinedAt ? guild.members.me.joinedAt.toLocaleDateString('hu-HU') : 'ismeretlen';
    const permissions = guild.members.me?.permissions?.toArray?.().length || 0;
    return `<article class="card owner-server${disabled ? ' blacklisted' : ''}"><div class="owner-server-head">${guildIcon(guild)}<div class="owner-server-title"><h3><span class="server-name">${escapeHtml(guild.name)}</span><span class="badge ${plan}">${planName(plan)}</span>${rpActive ? '<span class="badge ultimate">RP AKTÍV</span>' : ''}${disabled ? '<span class="badge" style="color:#ff9cab;background:rgba(255,97,116,.12)">BLACKLIST</span>' : ''}</h3><div class="owner-server-id">${escapeHtml(guild.id)}</div></div></div><div class="owner-server-metrics"><div class="owner-server-metric"><strong>${Number(guild.memberCount || 0)}</strong><span>tag</span></div><div class="owner-server-metric"><strong>${guild.channels.cache.size}</strong><span>csatorna</span></div><div class="owner-server-metric"><strong>${guild.roles.cache.size}</strong><span>rang</span></div><div class="owner-server-metric"><strong>${activeModules.length}</strong><span>aktív modul</span></div></div><div class="owner-server-details"><div><strong>Server owner</strong><br>${escapeHtml(ownerDisplay)}<br><span class="muted">${escapeHtml(guild.ownerId)}</span></div><div><strong>Bot csatlakozott</strong><br>${escapeHtml(joined)}</div><div><strong>Bot jogosultság</strong><br>${permissions} engedély</div><div><strong>Hozzáférési szint</strong><br>${planName(plan)}</div></div><div class="owner-server-actions"><a class="btn secondary" href="/owner/guild/${escapeHtml(guild.id)}">Részletes állapot</a><a class="btn" href="/dashboard/guild/${escapeHtml(guild.id)}">Beállítások</a>${isBotOwner(session.user.id) ? `<a class="btn green" href="/owner/architect/${escapeHtml(guild.id)}">NEXA OS Studio</a>` : ''}<a class="btn" href="/billing?guild=${escapeHtml(guild.id)}">Számlázás</a><a class="btn green" href="/owner/chronoguard/${escapeHtml(guild.id)}">ChronoGuard 10.0</a>${rpActive ? `<a class="btn green" href="/owner/documents/${escapeHtml(guild.id)}">Iratvezérlés</a><a class="btn green" href="/owner/document-studio/${escapeHtml(guild.id)}">Saját iratok</a><a class="btn green" href="/owner/tgf-forge/${escapeHtml(guild.id)}">TGF Forge</a><a class="btn secondary" href="/owner/shifts/${escapeHtml(guild.id)}">Szolgálatkezelés</a><a class="btn secondary" href="/owner/erlc/${escapeHtml(guild.id)}">ER:LC Bridge</a>` : ''}<form class="owner-package" method="post" action="/owner/global"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="premium_guild" value="${escapeHtml(guild.id)}"><select name="premium_plan" aria-label="Csomag"><option value="free"${plan === 'free' ? ' selected' : ''}>Owner-ajándék törlése (fizetett megmarad)</option><option value="pro"${plan === 'pro' ? ' selected' : ''}>PRO csomag</option><option value="ultimate"${plan === 'ultimate' ? ' selected' : ''}>ULTIMATE csomag</option></select><button class="btn secondary" name="operation" value="package_set" type="submit">Owner-ajándék mentése</button></form><form method="post" action="/owner/rp-toggle"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="guild_id" value="${escapeHtml(guild.id)}"><button class="btn ${rpActive ? 'secondary' : 'green'}" type="submit">${rpActive ? 'RP-rendszer kikapcsolása' : 'RP-rendszer bekapcsolása'}</button></form></div></article>`;
  }).join('') : '<div class="card"><h2>A bot még nincs szerveren</h2><p class="muted">Hívd meg a NexaBotot az első szerverre.</p></div>';
  serverCards = serverCards.replace(/<a class="btn green" href="\/owner\/chronoguard\/(\d+)">ChronoGuard 10\.0<\/a>/g, (_match, guildId) => `<a class="btn green" href="/owner/chronoguard/${guildId}">ChronoGuard</a><a class="btn" href="/owner/aegis/${guildId}">AEGIS Permission DNA</a>`);
  if (isBotOwner(session.user.id)) serverCards = serverCards.replace(/(<a class="btn green" href="\/owner\/architect\/(\d+)">NEXA OS Studio<\/a>)/g, '$1<a class="btn secondary" href="/owner/mdt/$2">Belv MDT</a>');
  const accessCards = allowedUsers.length ? allowedUsers.map((user) => `<article class="card"><h3>${escapeHtml(user.label)}</h3><p class="muted">Discord ID: ${escapeHtml(user.id)}</p><form method="post" action="/owner/ai-access/remove"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="user_id" value="${escapeHtml(user.id)}"><button class="btn secondary" type="submit">Hozzáférés eltávolítása</button></form></article>`).join('') : '<div class="notice warn">Jelenleg csak te használhatod a Nexa AI-t.</div>';
  const ownerCards = ownerUsers.length ? ownerUsers.map((user) => `<article class="card"><h3>${escapeHtml(user.label)}</h3><p class="muted">Owner-kezelő • ${escapeHtml(user.id)}</p>${isBotOwner(session.user.id) ? `<form method="post" action="/owner/access/remove"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="user_id" value="${escapeHtml(user.id)}"><button class="btn secondary" type="submit">Owner-hozzáférés elvétele</button></form>` : ''}</article>`).join('') : '<p class="muted">Nincs további owner-kezelő.</p>';
  const eventRows = (items, error = false) => items.length ? items.map((item) => `<tr><td>${escapeHtml(item.created_at || item.createdAt || '')}</td><td>${escapeHtml(error ? (item.error_type || item.errorType) : item.action)}</td><td>${escapeHtml(error ? item.message : (item.guild_id || item.guildId || 'globális'))}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">Nincs bejegyzés.</td></tr>';
  const members = guilds.reduce((sum, guild) => sum + Number(guild.memberCount || 0), 0);
  const proCount = guilds.filter((guild) => getGuildPlan(guild.id) === 'pro').length;
  const ultimateCount = guilds.filter((guild) => getGuildPlan(guild.id) === 'ultimate').length;
  const queryFor = (targetPage) => `/owner?page=${targetPage}${search ? `&q=${encodeURIComponent(search)}` : ''}`;
  const pagination = totalPages > 1
    ? `<nav class="pagination" aria-label="Szerverlista oldalak">${page > 1 ? `<a class="btn secondary small" href="${queryFor(page - 1)}">← Előző</a>` : ''}<span>${page}. oldal / ${totalPages}</span>${page < totalPages ? `<a class="btn secondary small" href="${queryFor(page + 1)}">Következő →</a>` : ''}</nav>`
    : '';
  const financialSection = `<section class="card section"><div class="section-kicker">Stripe pénzügyi áttekintés</div><h2 class="section-title">◉ Bevétel és számlaesemények</h2><div class="stats"><div class="stat"><div class="stat-value">${formatMinorCurrency(Number(paymentSummary.total_paid || 0), 'eur')}</div><div class="stat-label">Összes sikeres fizetés</div></div><div class="stat"><div class="stat-value">${formatMinorCurrency(Number(paymentSummary.paid_30d || 0), 'eur')}</div><div class="stat-label">Utolsó 30 nap</div></div><div class="stat"><div class="stat-value">${Number(paymentSummary.successful || 0)}</div><div class="stat-label">Sikeres számla</div></div><div class="stat"><div class="stat-value">${Number(paymentSummary.failed || 0)}</div><div class="stat-label">Sikertelen / nyitott</div></div></div><p class="muted">A kimutatás a Stripe webhook által rögzített bruttó EUR-számlaösszegeket mutatja. Kártyaadatot nem tárol.</p><div style="overflow:auto"><table><thead><tr><th>Stripe számla</th><th>Szerver ID</th><th>Összeg</th><th>Pénznem</th><th>Állapot</th><th>Időpont</th></tr></thead><tbody>${paymentRows}</tbody></table></div></section>`;
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA Bot 20.3.1 • Owner Command Center</div><h1>Hálózati irányítóközpont</h1><p class="muted">A teljes botinfrastruktúra, jogosultsági csomagok, védelem és AI-hozzáférés egy helyen.</p></div><a class="btn secondary" href="${escapeHtml(inviteUrl())}">Bot meghívása</a></div>
${saved ? '<div class="notice">✅ A tulajdonosi beállítás mentve.</div>' : ''}
<nav class="desktop-owner-nav" aria-label="Owner Center szakaszok"><a href="#overview">Áttekintés</a><a href="#system">Rendszer</a>${isBotOwner(session.user.id) ? '<a href="#architect">NEXA OS Studio</a>' : ''}<a href="#packages">Csomagok</a><a href="#access">Hozzáférések</a><a href="#audit">Audit</a><a href="#servers">Szerverek</a></nav>
${financialSection}
<div id="overview" class="stats section"><div class="stat"><div class="stat-value">${guilds.length}</div><div class="stat-label">Szerver</div></div><div class="stat"><div class="stat-value">${members}</div><div class="stat-label">Összes tag</div></div><div class="stat"><div class="stat-value">${proCount}</div><div class="stat-label">Pro hozzáférés</div></div><div class="stat"><div class="stat-value">${ultimateCount}</div><div class="stat-label">Ultimate hozzáférés</div></div></div>
<section id="system" class="card section"><div class="section-kicker">Élő infrastruktúra</div><h2 class="section-title">Rendszerállapot</h2><div class="stats"><div class="stat"><div class="stat-value">${runtime.ping} ms</div><div class="stat-label">Discord ping</div></div><div class="stat"><div class="stat-value">${Math.floor(runtime.uptimeSeconds / 3600)} óra</div><div class="stat-label">Uptime</div></div><div class="stat"><div class="stat-value">${runtime.memoryMb} MB</div><div class="stat-label">Memória</div></div><div class="stat"><div class="stat-value">${isPersistentStore() ? 'ONLINE' : 'MEMÓRIA'}</div><div class="stat-label">Adatbázis</div></div></div><div class="stats"><div class="stat"><div class="stat-value">${operations.usage24h}</div><div class="stat-label">Művelet • 24 óra</div></div><div class="stat"><div class="stat-value">${operations.security24h}</div><div class="stat-label">Védelmi esemény</div></div><div class="stat"><div class="stat-value">${operations.audit24h}</div><div class="stat-label">Auditbejegyzés</div></div><div class="stat"><div class="stat-value">${operations.errors24h}</div><div class="stat-label">Hiba • 24 óra</div></div></div><p class="muted">Node ${escapeHtml(runtime.node)} • AI hívás (30 nap): ${Number(summary.ai || summary.ai_request || 0)} • Összes interakció (30 nap): ${Number(summary.interaction || 0)}</p></section>
<section class="card section"><div class="section-kicker">Production readiness</div><h2 class="section-title">Környezeti biztonsági ellenőrzés</h2><div class="notice ${environment.ready ? '' : 'error'}">${environment.ready ? '✅ Minden kötelező production beállítás rendelkezésre áll.' : `⚠️ Hiányzó kötelező kulcsok: ${escapeHtml(environment.missingRequired.join(', '))}`}</div><div class="status-list">${environmentRows}</div><p class="muted">Az Owner Center csak azt jelzi, hogy egy kulcs megfelelően be van-e állítva; titkos értéket soha nem jelenít meg.</p></section>
<section class="card section"><div class="section-kicker">Kizárólag Owner</div><h2 class="section-title">🎭 RP-rendszer hozzáférése</h2><p class="muted">Az RP-rendszer csak azokon a szervereken működik, amelyeknél lent megnyomod az <strong>RP bekapcsolása</strong> gombot. Normál szerveradmin nem kapcsolhatja be. Aktiválás után a <code>/telepites</code> és <code>/dokumentum-panelek</code> parancs használható, a Discord Control Center pedig RP-gombot kap.</p><div class="notice ${settings.rpGuilds.length ? '' : 'warn'}">Aktív RP-szerverek: <strong>${settings.rpGuilds.length}</strong></div></section>
${isBotOwner(session.user.id) ? `<section id="architect" class="card section"><div class="section-kicker">NEXA OS STUDIO • PRIMARY OWNER ONLY</div><h2 class="section-title">✦ Leírásból teljes Discord-szerver</h2><p class="muted">Írd le természetes nyelven, milyen szervert szeretnél. A NEXA rang-, kategória-, csatorna-, jogosultság-, panel- és modul-tervet készít, előnézetet mutat, majd csak az aláírt jóváhagyásod után hajtja végre. A korábbi tervet később javíthatod és újrafuttathatod.</p><div class="notice">A NEXA OS Studio műveletei a szerverenkénti kártyákon érhetők el. A hozzáadott Owner-kezelők ezt a részt nem látják és nem futtathatják.</div><a class="btn green" href="#servers">Szerver kiválasztása</a></section>` : ''}
<section id="packages" class="card section"><div class="section-kicker">Owner jogosultságkezelés</div><h2 class="section-title">✦ Ingyenes csomag kiosztása</h2><p class="muted">A Stripe-előfizetéstől független Owner-ajándék. Így partnernek, tesztelőnek vagy támogatott szervernek fizetés nélkül adhatsz Pro vagy Ultimate csomagot meghatározott időre vagy korlátlanul.</p><form method="post" action="/owner/global"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>Cél szerver ID</label><input type="text" name="premium_guild" inputmode="numeric" placeholder="Discord szerver ID" required></div><div><label>Kiosztott csomag</label><select name="premium_plan"><option value="pro">PRO</option><option value="ultimate">ULTIMATE</option></select></div><div><label>Időtartam</label><select name="premium_days"><option value="">Korlátlan idő</option><option value="30">30 nap</option><option value="90">90 nap</option><option value="365">1 év</option></select></div><div><label>Owner megjegyzés</label><input type="text" name="premium_note" maxlength="300" placeholder="Például: partner szerver"></div></div><div class="actions"><button class="btn green" name="operation" value="package_grant" type="submit">Csomag kiosztása</button><button class="btn secondary" name="operation" value="package_remove" type="submit">Ajándékcsomag eltávolítása</button></div></form><h3 style="margin-top:24px">Owner által kiosztott csomagok</h3><div style="overflow:auto"><table><thead><tr><th>Szerver ID</th><th>Csomag</th><th>Lejárat</th><th>Megjegyzés</th></tr></thead><tbody>${packageRows}</tbody></table></div><h3 style="margin-top:24px">Stripe-előfizetések</h3><div style="overflow:auto"><table><thead><tr><th>Szerver ID</th><th>Csomag</th><th>Állapot</th><th>Számlázás</th><th>Forduló</th></tr></thead><tbody>${subscriptionRows}</tbody></table></div></section>
<section class="card section"><div class="section-kicker">Globális vezérlés</div><h2 class="section-title">Maintenance, blacklist és közlemény</h2><form method="post" action="/owner/global"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>Maintenance mód</label><select name="maintenance"><option value="off"${settings.maintenance ? '' : ' selected'}>Kikapcsolva</option><option value="on"${settings.maintenance ? ' selected' : ''}>Bekapcsolva</option></select></div><div><label>Karbantartási üzenet</label><input type="text" name="maintenance_message" maxlength="500" value="${escapeHtml(settings.maintenanceMessage)}"></div><div><label>Szerver blacklist ID</label><input type="text" name="blacklist_guild" inputmode="numeric" placeholder="Discord szerver ID"></div><div><label>Felhasználó blacklist ID</label><input type="text" name="blacklist_user" inputmode="numeric" placeholder="Discord felhasználó ID"></div><div><label>Közlemény cél szerver ID</label><input type="text" name="premium_guild" inputmode="numeric" placeholder="Discord szerver ID"></div><div><label>Közlemény címe</label><input type="text" name="announcement_title" maxlength="200" placeholder="NEXA Bot közlemény"></div><div><label>Közlemény szövege</label><textarea name="announcement_text" maxlength="3000" placeholder="A kijelölt szerver bejelentési csatornájába küldi."></textarea></div><div><label>Globálisan letiltott modulok</label><select name="disabled_modules" multiple size="7">${MODULE_KEYS.filter((key) => key !== 'bvi').map((key) => `<option value="${key}"${settings.remoteDisabledModules.includes(key) ? ' selected' : ''}>${key}</option>`).join('')}</select><div class="help">Vészkapcsoló: minden szerveren leállítja a kijelölt modulokat.</div></div></div><div class="actions"><button class="btn" name="operation" value="save" type="submit">Globális mentés</button><button class="btn secondary" name="operation" value="blacklist_guild_toggle" type="submit">Szerver blacklist váltás</button><button class="btn secondary" name="operation" value="blacklist_user_toggle" type="submit">User blacklist váltás</button><button class="btn" name="operation" value="announcement" type="submit">Közlemény küldése</button></div></form></section>
${isBotOwner(session.user.id) ? `<section class="card section"><div class="section-kicker">Bizalmi hozzáférés</div><h2 class="section-title">Owner-kezelők</h2><form method="post" action="/owner/access"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>Discord felhasználói ID</label><input name="user_id" type="text" inputmode="numeric" required></div><div style="align-self:end"><button class="btn green" type="submit">+ Owner-kezelő hozzáadása</button></div></div></form><div class="grid" style="margin-top:18px">${ownerCards}</div></section>` : ''}
<section id="access" class="card section"><div class="section-kicker">Privát hozzáférés</div><h2 class="section-title">✨ Nexa AI engedélylista</h2><p class="muted">Rajtat kívül csak az itt hozzáadott Discord-fiókok használhatják az AI-t szerveren vagy privátban.</p><form method="post" action="/owner/ai-access"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label for="user_id">Discord felhasználói azonosító</label><input id="user_id" name="user_id" type="text" inputmode="numeric" maxlength="22" placeholder="Például: 123456789012345678" required></div><div style="align-self:end"><button class="btn green" type="submit">+ AI-hozzáférés hozzáadása</button></div></div></form><div class="grid" style="margin-top:18px">${accessCards}</div></section>
<div id="audit" class="grid section"><section class="card"><div class="section-kicker">Hibaközpont</div><h2>Legutóbbi hibák</h2><div style="overflow:auto"><table><thead><tr><th>Idő</th><th>Típus</th><th>Üzenet</th></tr></thead><tbody>${eventRows(errors, true)}</tbody></table></div></section><section class="card"><div class="section-kicker">Owner audit</div><h2>Legutóbbi műveletek</h2><div style="overflow:auto"><table><thead><tr><th>Idő</th><th>Művelet</th><th>Szerver</th></tr></thead><tbody>${eventRows(audit)}</tbody></table></div></section></div>
<div id="servers" class="page-head section" style="margin-top:34px"><div><div class="section-kicker">Valós idejű hálózat</div><h2>Szerverek</h2><p class="muted">${filteredGuilds.length} találat • oldalanként legfeljebb ${pageSize} szerver.</p></div></div><form class="owner-search" method="get" action="/owner"><input type="search" name="q" maxlength="100" value="${escapeHtml(search)}" placeholder="Keresés név vagy szerver ID alapján"><button class="btn" type="submit">Keresés</button>${search ? '<a class="btn secondary" href="/owner">Törlés</a>' : ''}</form>${pagination}<div class="owner-server-grid">${serverCards}</div>${pagination}`;
  return layout('Owner Center', content, session);
}

async function ownerGuildPage(guild, session) {
  const config = getGuildConfig(guild.id);
  const settings = getOwnerSettings();
  const entitlement = getGuildEntitlement(guild.id);
  const readiness = securityReadiness(guild);
  const [audit, errors, owner] = await Promise.all([
    recentGuildEvents('audit', guild.id, 25),
    recentGuildEvents('errors', guild.id, 15),
    guild.fetchOwner().catch(() => null)
  ]);
  const botMember = guild.members.me;
  const rpActive = isBviGuild(guild.id);
  const blacklisted = settings.blacklistedGuilds.includes(guild.id);
  const moduleRows = Object.keys(config.modules)
    .filter((key) => key !== 'bvi')
    .map((key) => `<tr><td>${escapeHtml(key)}</td><td class="${moduleEnabled(guild.id, key) ? 'status-ok' : 'muted'}">${moduleEnabled(guild.id, key) ? '● Aktív' : '○ Kikapcsolva'}</td><td>${planAllowsModule(guild.id, key) ? planName(MODULE_MINIMUM_PLAN[key] || 'free') : `🔒 ${planName(MODULE_MINIMUM_PLAN[key] || 'free')}`}</td></tr>`)
    .join('');
  const channelRows = Object.entries(config.channels)
    .map(([key, id]) => {
      const channel = id ? guild.channels.cache.get(id) : null;
      return `<tr><td>${escapeHtml(key)}</td><td>${channel ? `${escapeHtml(channel.name)}<br><span class="muted">${escapeHtml(channel.id)}</span>` : '<span class="status-bad">Nincs beállítva</span>'}</td></tr>`;
    }).join('');
  const roleRows = Object.entries(config.roles)
    .map(([key, id]) => {
      const role = id ? guild.roles.cache.get(id) : null;
      return `<tr><td>${escapeHtml(key)}</td><td>${role ? `${escapeHtml(role.name)}<br><span class="muted">${escapeHtml(role.id)}</span>` : '<span class="status-bad">Nincs beállítva</span>'}</td></tr>`;
    }).join('');
  const permissionNames = botMember?.permissions?.toArray?.() || [];
  const auditRows = audit.length ? audit.map((item) => `<tr><td>${escapeHtml(item.created_at || item.createdAt || '')}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.actor_id || item.actorId || 'rendszer')}</td><td>${escapeHtml(item.target_id || item.targetId || '—')}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">Nincs auditbejegyzés.</td></tr>';
  const errorRows = errors.length ? errors.map((item) => `<tr><td>${escapeHtml(item.created_at || item.createdAt || '')}</td><td>${escapeHtml(item.error_type || item.errorType)}</td><td>${escapeHtml(item.message)}</td></tr>`).join('') : '<tr><td colspan="3" class="status-ok">Nincs rögzített hiba ennél a szervernél.</td></tr>';
  const securityReady = !readiness.missingPermissions.length && !readiness.higherBots.length;
  const joinedAt = botMember?.joinedAt ? botMember.joinedAt.toLocaleString('hu-HU') : 'Ismeretlen';
  const content = `<div class="page-head"><div>${guildIcon(guild)}<div class="section-kicker">NEXA Bot 20.3.1 • Owner Server Inspector</div><h1>${escapeHtml(guild.name)}</h1><p class="muted">${escapeHtml(guild.id)} • részletes, csak tulajdonosi rendszerállapot</p></div><div class="actions"><a class="btn secondary" href="/owner">← Owner Center</a><a class="btn" href="/dashboard/guild/${escapeHtml(guild.id)}">Beállítások</a>${isBotOwner(session.user.id) ? `<a class="btn green" href="/owner/architect/${escapeHtml(guild.id)}">NEXA OS Studio</a>` : ''}<a class="btn green" href="/owner/chronoguard/${escapeHtml(guild.id)}">ChronoGuard</a><a class="btn" href="/owner/aegis/${escapeHtml(guild.id)}">AEGIS Permission DNA</a><a class="btn" href="/owner/shifts/${escapeHtml(guild.id)}">Szolgálatkezelés</a>${rpActive ? `<a class="btn green" href="/owner/documents/${escapeHtml(guild.id)}">Iratvezérlés</a><a class="btn green" href="/owner/document-studio/${escapeHtml(guild.id)}">Workflow Studio</a><a class="btn green" href="/owner/tgf-forge/${escapeHtml(guild.id)}">TGF Forge</a><a class="btn" href="/owner/erlc/${escapeHtml(guild.id)}">ER:LC Bridge</a>` : ''}</div></div>
  ${blacklisted ? '<div class="notice error">🚫 Ez a szerver jelenleg blacklisten van, ezért a normál botfunkciók le vannak tiltva.</div>' : ''}
  <div class="stats"><div class="stat"><div class="stat-value">${Number(guild.memberCount || 0)}</div><div class="stat-label">Tag</div></div><div class="stat"><div class="stat-value">${guild.channels.cache.size}</div><div class="stat-label">Csatorna</div></div><div class="stat"><div class="stat-value">${guild.roles.cache.size}</div><div class="stat-label">Rang</div></div><div class="stat"><div class="stat-value">${planName(entitlement.plan)}</div><div class="stat-label">Csomag</div></div></div>
  <div class="grid"><section class="card"><div class="section-kicker">Azonosítás</div><h2>Szerveradatok</h2><div class="status-list"><div class="status-row"><strong>Tulajdonos</strong><span>${escapeHtml(owner?.user?.tag || owner?.displayName || guild.ownerId)}<br><span class="muted">${escapeHtml(guild.ownerId)}</span></span></div><div class="status-row"><strong>Bot csatlakozott</strong><span>${escapeHtml(joinedAt)}</span></div><div class="status-row"><strong>RP-rendszer</strong><span class="${rpActive ? 'status-ok' : 'muted'}">${rpActive ? '● Owner által engedélyezve' : '○ Kikapcsolva'}</span></div><div class="status-row"><strong>Csomag forrása</strong><span>${escapeHtml(entitlement.source || 'default')}</span></div></div></section>
  <section class="card"><div class="section-kicker">NEXA Shield</div><h2>Védelmi készenlét</h2><div class="status-list"><div class="status-row"><strong>Összesített állapot</strong><span class="${securityReady ? 'status-ok' : 'status-bad'}">${securityReady ? '● Bevetésre kész' : '● Beavatkozás szükséges'}</span></div><div class="status-row"><strong>Hiányzó jogok</strong><span>${readiness.missingPermissions.length ? escapeHtml(readiness.missingPermissions.join(', ')) : 'Nincs'}</span></div><div class="status-row"><strong>NEXA fölötti idegen botok</strong><span>${readiness.higherBots.length ? escapeHtml(readiness.higherBots.join(', ')) : 'Nincs'}</span></div><div class="status-row"><strong>Bot jogosultságok</strong><span>${permissionNames.length} engedély</span></div></div></section></div>
  <div class="grid" style="margin-top:16px"><section class="card"><div class="section-kicker">Konfiguráció</div><h2>Modulok</h2><div style="overflow:auto"><table><thead><tr><th>Modul</th><th>Állapot</th><th>Hozzáférés</th></tr></thead><tbody>${moduleRows}</tbody></table></div></section><section class="card"><div class="section-kicker">Jogosultsági felület</div><h2>Kijelölt rangok</h2><div style="overflow:auto"><table><thead><tr><th>Kulcs</th><th>Rang</th></tr></thead><tbody>${roleRows}</tbody></table></div></section></div>
  <section class="card section" style="margin-top:16px"><div class="section-kicker">Útvonalak</div><h2>Csatornakiosztás</h2><div style="overflow:auto"><table><thead><tr><th>Funkció</th><th>Csatorna</th></tr></thead><tbody>${channelRows}</tbody></table></div></section>
  <div class="grid" style="margin-top:16px"><section class="card"><div class="section-kicker">Audit</div><h2>Legutóbbi műveletek</h2><div style="overflow:auto"><table><thead><tr><th>Idő</th><th>Művelet</th><th>Végrehajtó</th><th>Cél</th></tr></thead><tbody>${auditRows}</tbody></table></div></section><section class="card"><div class="section-kicker">Hibaközpont</div><h2>Szerverhibák</h2><div style="overflow:auto"><table><thead><tr><th>Idő</th><th>Típus</th><th>Üzenet</th></tr></thead><tbody>${errorRows}</tbody></table></div></section></div>`;
  return layout(`${guild.name} • Owner állapot`, content, session, config.branding);
}

async function ownerArchitectPageLegacy(guild, session, options = {}) {
  const config = getGuildConfig(guild.id);
  const latest = await latestArchitectDeployment(guild.id);
  let latestPlan = latest?.plan || null;
  if (typeof latestPlan === 'string') {
    try { latestPlan = JSON.parse(latestPlan); } catch (_error) { latestPlan = null; }
  }
  const selectedPlan = options.plan || null;
  const selectedStats = selectedPlan ? blueprintStats(selectedPlan) : null;
  const selectedToken = options.planToken || '';
  const latestStats = latestPlan ? blueprintStats(latestPlan) : null;
  const latestToken = latestPlan ? signBlueprintToken(latestPlan, guild.id, session.user.id) : '';
  const prompt = options.prompt ?? latest?.prompt ?? '';
  const roleRows = selectedPlan?.roles?.map((role) => `<tr><td><strong>${escapeHtml(role.name)}</strong><br><span class="muted">${escapeHtml(role.key)}</span></td><td>${role.permissions.length ? role.permissions.map(escapeHtml).join(', ') : 'Alap jogosultság'}</td><td>${role.hoist ? 'Külön látszik' : 'Normál'}${role.mentionable ? ' • pingelhető' : ''}</td></tr>`).join('') || '';
  const categoryCards = selectedPlan?.categories?.map((category) => `<article class="card"><div class="section-kicker">${escapeHtml(category.visibility.toUpperCase())}</div><h3>${escapeHtml(category.name)}</h3><p class="muted">Hozzáférés: ${category.accessRoleKeys.length ? category.accessRoleKeys.map((key) => escapeHtml(key)).join(', ') : 'mindenki'}</p><div class="status-list">${category.channels.map((channel) => `<div class="status-row"><strong>${channel.type === 'voice' ? '🔊' : '#'} ${escapeHtml(channel.name)}</strong><span>${channel.readonly ? 'csak olvasható' : 'írható'}${channel.topic ? `<br><small>${escapeHtml(channel.topic)}</small>` : ''}</span></div>`).join('')}</div></article>`).join('') || '';
  const planPreview = selectedPlan ? `<section class="section" id="architect-preview"><div class="page-head"><div><div class="section-kicker">ALÁÍRT ELŐNÉZET • ${escapeHtml(String(options.source || 'nexa').toUpperCase())}</div><h2>${escapeHtml(selectedPlan.name)}</h2><p class="muted">${escapeHtml(selectedPlan.summary)}</p></div><span class="badge ultimate">${escapeHtml(planHash(selectedPlan).slice(0, 12))}</span></div>
    ${options.warning ? `<div class="notice warn">⚠️ ${escapeHtml(options.warning)}</div>` : ''}
    <div class="stats"><div class="stat"><div class="stat-value">${selectedStats.roles}</div><div class="stat-label">Rang</div></div><div class="stat"><div class="stat-value">${selectedStats.categories}</div><div class="stat-label">Kategória</div></div><div class="stat"><div class="stat-value">${selectedStats.channels}</div><div class="stat-label">Csatorna</div></div><div class="stat"><div class="stat-value">${selectedStats.panels}</div><div class="stat-label">Panel</div></div></div>
    <section class="card"><h3>Bekapcsolandó NEXA-modulok</h3><div class="actions">${selectedPlan.modules.map((moduleKey) => `<span class="badge pro">${escapeHtml(moduleKey)}</span>`).join('')}</div></section>
    <div class="grid" style="margin-top:16px">${categoryCards}</div>
    <section class="card section" style="margin-top:16px"><h3>Rangterv és legkisebb szükséges jogosultság</h3><div style="overflow:auto"><table><thead><tr><th>Rang</th><th>Jogosultságok</th><th>Megjelenés</th></tr></thead><tbody>${roleRows}</tbody></table></div></section>
    <section class="card section" style="margin-top:16px"><div class="section-kicker">VÉGLEGESÍTÉS</div><h3>Terv alkalmazása</h3><p class="muted">A NEXA létrehozza a hiányzó elemeket, a korábban általa kezelt elemeket frissíti, de csatornát, rangot vagy üzenetet nem töröl. Indítás előtt ChronoGuard-pillanatkép készül.</p><form method="post" action="/owner/architect/${guild.id}/apply"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="plan_token" value="${escapeHtml(selectedToken)}"><input type="hidden" name="prompt" value="${escapeHtml(prompt)}"><div class="field-grid"><div><label>Megerősítés</label><input name="confirmation" autocomplete="off" placeholder="Írd be: NEXA OWNER" required></div><div style="align-self:end"><button class="btn green" type="submit">Biztonságos telepítés indítása</button></div></div></form></section></section>` : '';
  const lastSummary = latest?.result_summary && typeof latest.result_summary === 'object' ? latest.result_summary : {};
  const latestCard = latestPlan ? `<section class="card section"><div class="section-kicker">UTOLSÓ KEZELT TELEPÍTÉS</div><h2 class="section-title">Újrafuttatható szerverterv</h2><div class="status-list"><div class="status-row"><strong>Tervazonosító</strong><span><code>${escapeHtml(String(latest.plan_hash || planHash(latestPlan)).slice(0, 16))}</code></span></div><div class="status-row"><strong>Alkalmazva</strong><span>${escapeHtml(new Date(latest.created_at || Date.now()).toLocaleString('hu-HU'))}</span></div><div class="status-row"><strong>Eredmény</strong><span>${Number(lastSummary.rolesCreated || 0)} új rang • ${Number(lastSummary.channelsCreated || 0)} új csatorna • ${Number(lastSummary.panelsPublished || 0)} panel</span></div><div class="status-row"><strong>Terjedelem</strong><span>${latestStats.roles} rang • ${latestStats.categories} kategória • ${latestStats.channels} csatorna</span></div></div><form method="post" action="/owner/architect/${guild.id}/apply"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="plan_token" value="${escapeHtml(latestToken)}"><input type="hidden" name="prompt" value="${escapeHtml(latest.prompt || '')}"><div class="field-grid"><div><label>Újrafuttatás megerősítése</label><input name="confirmation" autocomplete="off" placeholder="Írd be: NEXA OWNER" required></div><div style="align-self:end"><button class="btn secondary" type="submit">Terv javítása / újrafuttatása</button></div></div></form></section>` : '<div class="notice warn">Ehhez a szerverhez még nincs NEXA OS Studio telepítés.</div>';
  const supportRepair = guild.id === SUPPORT_GUILD_ID ? `<button class="btn secondary" name="operation" value="support-repair" type="submit">Support-rendszer javítása</button>` : '';
  const notice = options.applied
    ? '<div class="notice">✅ A NEXA OS Studio biztonságosan alkalmazta a tervet. Az eredmény és az erőforrás-azonosítók mentve lettek.</div>'
    : options.repaired
      ? `<div class="notice">✅ A javítás elkészült: ${escapeHtml(options.repaired)}.</div>`
      : '';
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA 20.0 • OWNER-ONLY NEXA OS STUDIO</div><h1>Szerverépítő és helyreállító központ</h1><p class="muted">${escapeHtml(guild.name)} • Írd le, milyen szervert szeretnél; a NEXA ellenőrzött tervet készít, előnézetet mutat, majd csak a külön jóváhagyásod után épít.</p></div><div class="actions"><a class="btn secondary" href="/owner">← Owner Center</a><a class="btn" href="/owner/guild/${guild.id}">Szerverállapot</a></div></div>
  ${notice}<div class="notice warn">🔒 Ezt az oldalt kizárólag az elsődleges <code>BOT_OWNER_ID</code> használhatja. A hozzáadott Owner-kezelők sem telepíthetnek vagy javíthatnak innen.</div>
  <section class="card section"><div class="section-kicker">PROMPT → TERV → ELŐNÉZET → TELEPÍTÉS</div><h2 class="section-title">Mit építsen a NEXA?</h2><p class="muted">Leírhatod a szerver témáját, kívánt részlegeit, rangjait, nyelvét és működését. Titkos kulcsot vagy tokent ne írj ide. A meglévő szervert a tervező csak tájékozódásként olvassa.</p><form method="post" action="/owner/architect/${guild.id}/plan"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div><label>Részletes szerverleírás *</label><textarea name="prompt" rows="9" minlength="15" maxlength="4000" required placeholder="Példa: Készíts egy magyar, valósághű ügynökségi közösségi szervert nyilvános előtérrel, ellenőrzéssel, részlegekkel, biztonságos staff-zónával, ticketekkel és külön naplókkal.">${escapeHtml(prompt)}</textarea></div><div class="field-grid" style="margin-top:16px"><div><label>Discord feliratok nyelve</label><select name="language"><option value="hu"${selectedPlan?.language !== 'en' ? ' selected' : ''}>Magyar</option><option value="en"${selectedPlan?.language === 'en' ? ' selected' : ''}>English</option></select></div><div><label>Részletesség</label><select name="scale"><option value="professional">Professzionális</option><option value="compact">Kompakt</option><option value="enterprise">Nagy / enterprise</option></select></div></div><div class="actions" style="margin-top:18px"><button class="btn" type="submit">Ellenőrzött terv és előnézet készítése</button></div></form></section>
  ${planPreview}
  ${latestCard}
  <section class="card section"><div class="section-kicker">OWNER RECOVERY CENTER</div><h2 class="section-title">Kézi javítás és szinkronizálás</h2><p class="muted">Render-újraindítás nem telepít újra semmit. Az alábbi műveletek csak kézzel, innen indíthatók, nem törölnek szerverelemeket, és minden futás bekerül az Owner auditba.</p><form method="post" action="/owner/architect/${guild.id}/repair"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>Owner megerősítés</label><input name="confirmation" autocomplete="off" placeholder="Írd be: OWNER JAVÍTÁS" required></div></div><div class="actions" style="margin-top:18px"><button class="btn" name="operation" value="sync-panels" type="submit">NEXA panelek szinkronizálása</button>${supportRepair}</div></form></section>`;
  return layout(`NEXA OS Studio • ${guild.name}`, content, session, config.branding);
}

async function ownerArchitectPage(guild, session, options = {}) {
  const config = getGuildConfig(guild.id);
  const [latest, history] = await Promise.all([
    latestArchitectDeployment(guild.id),
    architectDeploymentHistory(guild.id, 8)
  ]);
  const parsePlan = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (_error) { return null; }
  };
  const latestPlan = parsePlan(latest?.plan);
  const selectedPlan = options.plan || null;
  const selectedStats = selectedPlan ? blueprintStats(selectedPlan) : null;
  const selectedToken = options.planToken || '';
  const latestStats = latestPlan ? blueprintStats(latestPlan) : null;
  const latestToken = latestPlan ? signBlueprintToken(latestPlan, guild.id, session.user.id) : '';
  const prompt = options.prompt ?? latest?.prompt ?? '';
  const selectedTemplate = selectedPlan?.studio?.template || options.template || latestPlan?.studio?.template || 'smart';
  const selectedScale = selectedPlan?.studio?.scale || options.scale || latestPlan?.studio?.scale || 'professional';
  const selectedFeatures = selectedPlan?.studio?.features?.length
    ? selectedPlan.studio.features
    : Array.isArray(options.features) && options.features.length
      ? options.features
      : latestPlan?.studio?.features?.length
        ? latestPlan.studio.features
        : ['tickets', 'verification', 'moderation', 'security', 'levels', 'events', 'applications', 'shift', 'voice', 'suggestions', 'reactionRoles', 'giveaways'];
  const featureSet = new Set(selectedFeatures);
  const simulation = selectedPlan ? blueprintSimulation(guild, selectedPlan, latest) : null;
  const roleRows = selectedPlan?.roles?.map((role) => `<tr><td><span class="studio-color" style="background:${escapeHtml(role.color)}"></span><strong>${escapeHtml(role.name)}</strong><br><span class="muted">${escapeHtml(role.key)}</span></td><td>${role.permissions.length ? role.permissions.map(escapeHtml).join(', ') : 'Alap jogosultság'}</td><td>${role.hoist ? 'Kiemelt' : 'Normál'}${role.mentionable ? ' • pingelhető' : ''}</td></tr>`).join('') || '';
  const categoryCards = selectedPlan?.categories?.map((category, index) => `<article class="studio-category"><div class="studio-category-head"><span>${String(index + 1).padStart(2, '0')}</span><div><small>${escapeHtml(category.visibility.toUpperCase())}</small><h3>${escapeHtml(category.name)}</h3></div></div><div class="studio-channel-list">${category.channels.map((channel) => `<div><i>${channel.type === 'voice' ? '◉' : '#'}</i><span><strong>${escapeHtml(channel.name)}</strong>${channel.topic ? `<small>${escapeHtml(channel.topic)}</small>` : ''}</span><b>${channel.readonly ? 'READ' : 'WRITE'}</b></div>`).join('')}</div></article>`).join('') || '';
  const templateOptions = [
    ['smart', '✦', 'Smart Detect', 'A leírásból választ rendszert.'],
    ['community', '◈', 'Community', 'Közösség, welcome és staff.'],
    ['gaming', '⌁', 'Gaming', 'Csapatkereső, klipek és események.'],
    ['creator', '▶', 'Creator', 'Tartalom, közlemény és ötletközpont.'],
    ['support', '◎', 'Support', 'Ticket- és ügyfélszolgálati rendszer.'],
    ['clan', '◆', 'Clan', 'Csapatszervezés és ranglétra.'],
    ['business', '▦', 'Business', 'Professzionális belső munkatér.'],
    ['agency', '⬡', 'Agency / RP', 'Részlegek, felvétel és műveletek.']
  ].map(([value, icon, title, description]) => `<label class="studio-template"><input type="radio" name="template" value="${value}"${selectedTemplate === value ? ' checked' : ''}><span><i>${icon}</i><strong>${title}</strong><small>${description}</small></span></label>`).join('');
  const featureOptions = [
    ['security', '🛡️', 'Security Core'], ['moderation', '🔨', 'Moderáció'], ['tickets', '🎫', 'Ticket Center'],
    ['verification', '✅', 'Ellenőrzés'], ['levels', '⭐', 'XP és szintek'], ['events', '📅', 'Eseményközpont'],
    ['applications', '📝', 'Jelentkezések'], ['shift', '⏱️', 'Szolgálat / shift'], ['voice', '🔊', 'Hangközpont'],
    ['suggestions', '💡', 'Ötletek'], ['reactionRoles', '🎭', 'Választható rangok'], ['giveaways', '🎉', 'Nyereményjáték'],
    ['ai', '✦', 'NEXA AI modul']
  ].map(([value, icon, title]) => `<label class="studio-feature"><input type="checkbox" name="features" value="${value}"${featureSet.has(value) ? ' checked' : ''}><span>${icon}<strong>${title}</strong><i></i></span></label>`).join('');
  const simulationPanel = simulation ? `<section class="studio-simulation ${simulation.status}"><div class="studio-score" style="--score:${simulation.score}"><strong>${simulation.score}</strong><span>READY SCORE</span></div><div class="studio-sim-body"><div class="section-kicker">NEXA DIGITAL TWIN • VÉGREHAJTÁS ELŐTT</div><h3>${simulation.status === 'blocked' ? 'Telepítés blokkolva' : simulation.status === 'warning' ? 'Telepíthető figyelmeztetéssel' : 'Biztonságosan telepíthető'}</h3><p>A NEXA előre kiszámolta, pontosan mi változik. Törlés nem történik.</p><div class="studio-diff"><div><b>+${simulation.roles.create}</b><span>új rang</span><small>${simulation.roles.update} frissül</small></div><div><b>+${simulation.categories.create}</b><span>új kategória</span><small>${simulation.categories.update} frissül</small></div><div><b>+${simulation.channels.create}</b><span>új csatorna</span><small>${simulation.channels.update} frissül</small></div><div class="safe"><b>0</b><span>törlés</span><small>garantált</small></div></div>${simulation.missingPermissions.length ? `<div class="notice error"><strong>Hiányzó botjogok:</strong> ${escapeHtml(simulation.missingPermissions.join(', '))}</div>` : ''}${simulation.warnings.map((warning) => `<div class="notice warn">⚠️ ${escapeHtml(warning)}</div>`).join('')}</div></section>` : '';
  const planPreview = selectedPlan ? `<section class="studio-preview" id="architect-preview"><div class="studio-preview-head"><div><div class="section-kicker">ALÁÍRT BLUEPRINT • LOCAL ENGINE 20</div><h2>${escapeHtml(selectedPlan.name)}</h2><p>${escapeHtml(selectedPlan.summary)}</p></div><div class="studio-hash"><span>BLUEPRINT ID</span><code>${escapeHtml(planHash(selectedPlan).slice(0, 12))}</code></div></div>${simulationPanel}<div class="studio-metrics"><div><strong>${selectedStats.roles}</strong><span>Rang</span></div><div><strong>${selectedStats.categories}</strong><span>Kategória</span></div><div><strong>${selectedStats.channels}</strong><span>Csatorna</span></div><div><strong>${selectedStats.panels}</strong><span>Panel</span></div><div><strong>${simulation?.operations || 0}</strong><span>Művelet</span></div></div><section class="card studio-modules"><div><span class="section-kicker">AKTIVÁLÁSI TERV</span><h3>NEXA-modulok</h3></div><div>${selectedPlan.modules.map((moduleKey) => `<span>${escapeHtml(moduleKey)}</span>`).join('')}</div></section><div class="studio-blueprint-grid">${categoryCards}</div><section class="card section"><div class="section-kicker">LEAST PRIVILEGE MATRIX</div><h3>Rangok és engedélyek</h3><div style="overflow:auto"><table><thead><tr><th>Rang</th><th>Jogosultságok</th><th>Típus</th></tr></thead><tbody>${roleRows}</tbody></table></div></section><section class="studio-deploy"><div><div class="section-kicker">OWNER EXECUTION GATE</div><h3>Biztonságos alkalmazás</h3><p>Indítás előtt ChronoGuard-pillanatkép készül. A Studio létrehoz és frissít, de nem töröl szerverelemet.</p></div><form method="post" action="/owner/architect/${guild.id}/apply"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="plan_token" value="${escapeHtml(selectedToken)}"><input type="hidden" name="prompt" value="${escapeHtml(prompt)}"><label>Megerősítés<input name="confirmation" autocomplete="off" placeholder="NEXA OWNER" required></label><button class="btn green" type="submit"${simulation?.status === 'blocked' ? ' disabled' : ''}>${simulation?.status === 'blocked' ? 'Hiányzó botjogok' : 'Blueprint alkalmazása'}</button></form></section></section>` : '';
  const lastSummary = latest?.result_summary && typeof latest.result_summary === 'object' ? latest.result_summary : {};
  const latestCard = latestPlan ? `<section class="card section studio-last"><div><div class="section-kicker">AKTÍV BLUEPRINT</div><h2>Biztonságosan újrafuttatható</h2><p class="muted">${escapeHtml(new Date(latest.created_at || Date.now()).toLocaleString('hu-HU'))} • ${latestStats.roles} rang • ${latestStats.categories} kategória • ${latestStats.channels} csatorna</p></div><div class="status-list"><div class="status-row"><strong>Blueprint</strong><code>${escapeHtml(String(latest.plan_hash || planHash(latestPlan)).slice(0, 16))}</code></div><div class="status-row"><strong>Legutóbbi eredmény</strong><span>${Number(lastSummary.rolesCreated || 0)} rang • ${Number(lastSummary.channelsCreated || 0)} csatorna • ${Number(lastSummary.panelsPublished || 0)} panel</span></div></div><form method="post" action="/owner/architect/${guild.id}/apply"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="plan_token" value="${escapeHtml(latestToken)}"><input type="hidden" name="prompt" value="${escapeHtml(latest.prompt || '')}"><label>Újrafuttatás megerősítése<input name="confirmation" autocomplete="off" placeholder="NEXA OWNER" required></label><button class="btn secondary" type="submit">Javítás / újrafuttatás</button></form></section>` : '<div class="notice studio-empty">Még nincs alkalmazott NEXA OS blueprint ezen a szerveren.</div>';
  const historyRows = history.length ? history.map((entry, index) => {
    const entryPlan = parsePlan(entry.plan);
    const stats = entryPlan ? blueprintStats(entryPlan) : { roles: 0, categories: 0, channels: 0 };
    return `<div class="studio-history-row"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(entryPlan?.name || 'NEXA blueprint')}</strong><small>${escapeHtml(new Date(entry.created_at || Date.now()).toLocaleString('hu-HU'))}</small></div><code>${escapeHtml(String(entry.plan_hash || '').slice(0, 10))}</code><b>${stats.roles}R / ${stats.categories}K / ${stats.channels}CS</b></div>`;
  }).join('') : '<p class="muted">Az első telepítés után itt jelennek meg a blueprint-verziók.</p>';
  const supportRepair = guild.id === SUPPORT_GUILD_ID ? `<button class="btn secondary" name="operation" value="support-repair" type="submit">Support-rendszer javítása</button>` : '';
  const notice = options.applied
    ? '<div class="notice">✅ A NEXA OS Studio alkalmazta a blueprintet és mentette az erőforrás-azonosítókat.</div>'
    : options.repaired
      ? `<div class="notice">✅ A javítás elkészült: ${escapeHtml(options.repaired)}.</div>`
      : '';
  const content = `<div class="os-studio"><section class="os-studio-hero"><div><span class="os-version">NEXA 20.0 • OWNER OS</span><h1>NEXA OS <em>Studio</em></h1><p>${escapeHtml(guild.name)} teljes szerverarchitektúrája egy helyen — API-kredit nélkül, helyi tervezőmotorral és végrehajtás előtti Digital Twin szimulációval.</p><div class="os-studio-pills"><span>LOCAL ENGINE</span><span>ZERO DELETE</span><span>SIGNED PLAN</span><span>RESTART SAFE</span></div></div><div class="os-orbit"><i></i><b>N</b><span>20</span></div></section>${notice}<div class="studio-owner-lock">🔒 Kizárólag az elsődleges <code>BOT_OWNER_ID</code> használhatja. Delegált kezelő nem futtathat telepítést.</div><nav class="studio-steps"><a href="#studio-design"><b>01</b><span>Tervezés</span></a><a href="#architect-preview"><b>02</b><span>Digital Twin</span></a><a href="#studio-deployments"><b>03</b><span>Telepítés</span></a><a href="#studio-recovery"><b>04</b><span>Helyreállítás</span></a></nav><section class="studio-builder" id="studio-design"><div class="studio-builder-copy"><div class="section-kicker">BLUEPRINT COMPOSER</div><h2>Írd le. Állítsd össze. Ellenőrizd.</h2><p>A 20.0 motor teljesen helyben dolgozik, ezért nincs OpenAI-hívás, kreditigény vagy váratlan AI-hiba.</p></div><form method="post" action="/owner/architect/${guild.id}/plan"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><label class="studio-prompt"><span>Szerverleírás</span><textarea name="prompt" rows="7" minlength="15" maxlength="4000" required placeholder="Példa: Készíts modern magyar FBI RP szervert valósághű rangokkal, nyilvános előtérrel, felvétellel, biztonságos részlegekkel és műveleti központtal.">${escapeHtml(prompt)}</textarea><small>A Studio nem fogad el tokent vagy API-kulcsot.</small></label><div class="studio-block"><div class="studio-block-head"><span>01</span><div><h3>Blueprint sablon</h3><p>Válassz alapot, vagy hagyd a felismerést a Smart Detect motorra.</p></div></div><div class="studio-template-grid">${templateOptions}</div></div><div class="studio-block"><div class="studio-block-head"><span>02</span><div><h3>Rendszermodulok</h3><p>Csak azt jelöld be, amire ezen a szerveren szükség van.</p></div></div><div class="studio-feature-grid">${featureOptions}</div></div><div class="studio-control-row"><label>Discord nyelve<select name="language"><option value="hu"${selectedPlan?.language !== 'en' ? ' selected' : ''}>Magyar</option><option value="en"${selectedPlan?.language === 'en' ? ' selected' : ''}>English</option></select></label><label>Részletesség<select name="scale"><option value="compact"${selectedScale === 'compact' ? ' selected' : ''}>Kompakt</option><option value="professional"${selectedScale === 'professional' ? ' selected' : ''}>Professzionális</option><option value="enterprise"${selectedScale === 'enterprise' ? ' selected' : ''}>Enterprise</option></select></label><button class="btn studio-generate" type="submit">Digital Twin elkészítése <span>→</span></button></div></form></section>${planPreview}<section id="studio-deployments" class="studio-two-col">${latestCard}<section class="card section"><div class="section-kicker">BLUEPRINT TIMELINE</div><h2>Telepítési előzmények</h2><div class="studio-history">${historyRows}</div></section></section><section class="card section" id="studio-recovery"><div class="section-kicker">OWNER RECOVERY CENTER</div><h2>Kontrollált helyreállítás</h2><p class="muted">Render-újraindítás nem futtat telepítést. A műveletek csak a kézi owner-megerősítés után indulnak, és bekerülnek az auditnaplóba.</p><form method="post" action="/owner/architect/${guild.id}/repair"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="studio-control-row"><label>Megerősítés<input name="confirmation" autocomplete="off" placeholder="OWNER JAVÍTÁS" required></label><button class="btn" name="operation" value="sync-panels" type="submit">NEXA panelek szinkronizálása</button>${supportRepair}</div></form></section></div>`;
  return layout(`NEXA OS Studio • ${guild.name}`, content, session, config.branding);
}

function ownerDocumentsPage(guild, session, saved = false) {
  const config = getGuildConfig(guild.id);
  const defaultAccessRoleId = config.documents?.defaultAccessRoleId || null;
  const defaultAccessRoleName = defaultAccessRoleId
    ? guild.roles.cache.get(defaultAccessRoleId)?.name || 'Ismeretlen rang'
    : 'Nincs beállítva';
  const categoryNames = {
    root: 'Alaprendszer',
    informaciok: 'Információk és nyilvántartások',
    ellenorzes: 'Ellenőrzés és ügyiratok',
    'hivatalos-irattar': 'Hivatalos irattár',
    bomo: 'BOMO'
  };
  const groups = new Map();
  for (const type of DOCUMENT_TYPES) {
    const groupKey = String(type.parent || 'root').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(type);
  }
  const sections = [...groups.entries()].map(([groupKey, types]) => {
    const cards = types.map((type) => {
      const rule = documentRule(guild, type);
      return `<article class="card"><div class="section-kicker"># ${escapeHtml(type.channel || type.channelPrefix)}</div><h3>${escapeHtml(type.emoji)} ${escapeHtml(type.title)}</h3><div class="field-grid"><div><label for="doc_role_${escapeHtml(type.key)}">Használati rang</label><select id="doc_role_${escapeHtml(type.key)}" name="doc_role_${escapeHtml(type.key)}">${roleOptions(guild, rule.overrideAccessRoleId, `Alapértelmezett: ${defaultAccessRoleName}`)}</select><div class="help">Ha itt nem választasz külön rangot, a fenti alapértelmezett használati rang érvényes.</div></div><div><label for="doc_notify_${escapeHtml(type.key)}">Értesítendő rang</label><select id="doc_notify_${escapeHtml(type.key)}" name="doc_notify_${escapeHtml(type.key)}">${roleOptions(guild, rule.notificationRoleId, 'Ne pingeljen rangot')}</select><div class="help">A bot a kész irat közzétételekor ezt a rangot pingeli.</div></div><div><label class="switch"><input type="checkbox" name="doc_case_${escapeHtml(type.key)}"${rule.caseNumber ? ' checked' : ''}><span><strong>Ügyszám hozzáadása</strong><br><span class="muted">Kikapcsolva a felhívásoknál és egyszerű közleményeknél.</span></span></label></div><div><label class="switch"><input type="checkbox" name="doc_ping_${escapeHtml(type.key)}"${rule.pingTarget ? ' checked' : ''}><span><strong>Személy kiválasztása és pingelése</strong><br><span class="muted">A beküldő Discord-listából választ; ID beírása nem kell.</span></span></label></div></div></article>`;
    }).join('');
    return `<section class="section" style="margin-top:28px"><div class="page-head"><div><div class="section-kicker">Dokumentumcsoport</div><h2>${escapeHtml(categoryNames[groupKey] || groupKey)}</h2></div></div><div class="grid">${cards}</div></section>`;
  }).join('');
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA Bot 20.3.1 • Owner Document Control</div><h1>Irat- és jogosultságvezérlés</h1><p class="muted">${escapeHtml(guild.name)} • Itt állíthatod be, melyik Discord-rang használhatja a dokumentumpaneleket.</p></div><a class="btn secondary" href="/owner">← Owner Center</a></div>
${saved ? '<div class="notice">✅ A dokumentumszabályok mentve, a meglévő Discord-panelek frissítve.</div>' : ''}
<div class="notice warn">Az egyszerű felhívások és tájékoztatások alapból nem kapnak ügyszámot. A hivatalos, jóváhagyásos iratok alapból igen.</div>
<form method="post" action="/owner/documents/${escapeHtml(guild.id)}"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><section class="card section"><div class="section-kicker">Globális jogosultság</div><h2 class="section-title">Ki használhatja a dokumentumrendszert?</h2><div class="field-grid"><div><label for="doc_default_role">Alapértelmezett használati rang</label><select id="doc_default_role" name="doc_default_role" required>${roleOptions(guild, defaultAccessRoleId, 'Válassz egy rangot')}</select><div class="help">Ez váltja le a korábbi, fix „Operatív állomány” korlátozást. A kiválasztott rang használhatja az összes olyan panelt, amelynél lent nem adsz meg külön rangot.</div></div></div></section>${sections}<div class="savebar"><span class="muted">A mentés után a bot frissíti a már kihelyezett dokumentumpaneleket is.</span><button class="btn green" type="submit">Minden szabály mentése</button></div></form>`;
  return layout(`Iratvezérlés • ${guild.name}`, content, session);
}

function ownerDocumentStudioPage(guild, session, options = {}) {
  const config = getGuildConfig(guild.id);
  const templates = config.documents?.customTypes || [];
  const selected = templates.find((item) => item.key === options.editKey) || null;
  const fields = selected?.fields || [];
  const textChannels = [...guild.channels.cache.values()]
    .filter((channel) => channel.isTextBased?.() && !channel.isThread?.())
    .sort((a, b) => a.position - b.position)
    .map((channel) => `<option value="${escapeHtml(channel.id)}"${selected?.channelId === channel.id ? ' selected' : ''}># ${escapeHtml(channel.name)}</option>`)
    .join('');
  const questionRows = Array.from({ length: 5 }, (_, index) => {
    const field = fields[index] || {};
    return `<div class="record"><div><label>${index + 1}. kérdés${index === 0 ? ' *' : ''}</label><input type="text" name="field_${index + 1}_label" maxlength="45" value="${escapeHtml(field.label || '')}" placeholder="Például: Mi történt?"${index === 0 ? ' required' : ''}></div><div><label>Mező típusa</label><select name="field_${index + 1}_style"><option value="short"${field.style === 'paragraph' ? '' : ' selected'}>Rövid válasz</option><option value="paragraph"${field.style === 'paragraph' ? ' selected' : ''}>Hosszú válasz</option></select></div><div><label>Segítő szöveg</label><input type="text" name="field_${index + 1}_placeholder" maxlength="100" value="${escapeHtml(field.placeholder || '')}" placeholder="Mit írjon ide a kitöltő?"></div><div><label class="switch"><input type="checkbox" name="field_${index + 1}_required"${field.required !== false ? ' checked' : ''}><span><strong>Kötelező</strong><br><span class="muted">Nem hagyható üresen.</span></span></label></div></div>`;
  }).join('');
  const cards = templates.length ? templates.map((template) => {
    const channel = guild.channels.cache.get(template.channelId);
    const role = guild.roles.cache.get(template.accessRoleId || config.documents.defaultAccessRoleId);
    const notificationRole = guild.roles.cache.get(template.notificationRoleId);
    return `<article class="card template-card"><div class="section-kicker">${escapeHtml(template.key)}</div><h3>${escapeHtml(template.emoji)} ${escapeHtml(template.title)}</h3><p class="muted">${template.fields.length} kérdés • ${channel ? `#${escapeHtml(channel.name)}` : 'hiányzó csatorna'} • használat: ${role ? escapeHtml(role.name) : 'alapértelmezett rang'} • értesítés: ${notificationRole ? `@${escapeHtml(notificationRole.name)}` : 'nincs rangping'}</p><div class="actions"><a class="btn secondary small" href="/owner/document-studio/${guild.id}?edit=${encodeURIComponent(template.key)}">Szerkesztés</a><form method="post" action="/owner/document-studio/${guild.id}/install"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="template_key" value="${escapeHtml(template.key)}"><button class="btn green small" type="submit">Panel kihelyezése</button></form><form method="post" action="/owner/document-studio/${guild.id}/delete"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="template_key" value="${escapeHtml(template.key)}"><button class="btn danger small" type="submit">Törlés</button></form></div></article>`;
  }).join('') : '<div class="notice warn">Még nincs egyedi dokumentumsablon. Készítsd el az elsőt az alábbi szerkesztőben.</div>';
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA 20.3.1 • Workflow Studio</div><h1>Egyedi dokumentumstúdió</h1><p class="muted">${escapeHtml(guild.name)} • Saját kérdések, célcsatorna, rang, ping, ügyszám és vezetői jóváhagyás.</p></div><div class="actions"><a class="btn secondary" href="/owner/guild/${guild.id}">← Szerver</a><a class="btn" href="/owner/documents/${guild.id}">Alap iratok</a></div></div>
  ${options.saved ? '<div class="notice">✅ A sablon mentve. A panel most már kihelyezhető a kiválasztott Discord-csatornába.</div>' : ''}
  ${options.installed ? '<div class="notice">✅ A dokumentumpanel kihelyezve vagy frissítve.</div>' : ''}
  <section class="section"><div class="page-head"><div><div class="section-kicker">Aktív sablonok</div><h2>Dokumentumfolyamatok</h2></div></div><div class="grid">${cards}</div></section>
  <section class="card section" style="margin-top:24px"><div class="section-kicker">${selected ? 'Sablon szerkesztése' : 'Új sablon'}</div><h2 class="section-title">${selected ? escapeHtml(selected.title) : 'Egyedi adatlap létrehozása'}</h2><form method="post" action="/owner/document-studio/${guild.id}/save"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="template_key" value="${escapeHtml(selected?.key || '')}"><div class="field-grid"><div><label>Dokumentum neve *</label><input type="text" name="title" maxlength="45" value="${escapeHtml(selected?.title || '')}" placeholder="Például: Egyedi ügyirat" required></div><div><label>Emoji</label><input type="text" name="emoji" maxlength="16" value="${escapeHtml(selected?.emoji || '📄')}"></div><div><label>Célcsatorna *</label><select name="channel_id" required><option value="">Válassz csatornát</option>${textChannels}</select></div><div><label>Használati rang</label><select name="access_role_id">${roleOptions(guild, selected?.accessRoleId || null, 'Alapértelmezett dokumentumrang')}</select><div class="help">Ez a rang töltheti ki az adatlapot.</div></div><div><label>Értesítendő rang</label><select name="notification_role_id">${roleOptions(guild, selected?.notificationRoleId || null, 'Ne pingeljen rangot')}</select><div class="help">A kész irat közzétételekor a bot ezt a rangot pingeli.</div></div></div><div class="module-grid" style="margin:18px 0"><label class="switch"><input type="checkbox" name="approval"${selected?.approval ? ' checked' : ''}><span><strong>Vezetői jóváhagyás</strong><br><span class="muted">Az ügyiratok csatornába kerül döntésre.</span></span></label><label class="switch"><input type="checkbox" name="case_number"${selected?.caseNumber ? ' checked' : ''}><span><strong>Automatikus ügyszám</strong><br><span class="muted">RP-ÉÉÉÉHHNN-ÓÓPP formátum.</span></span></label><label class="switch"><input type="checkbox" name="ping_target"${selected?.pingTarget ? ' checked' : ''}><span><strong>Személy kiválasztása</strong><br><span class="muted">Discord-listából választ és pingel.</span></span></label></div><h3>Kérdések</h3><p class="muted">A Discord egy adatlapon legfeljebb 5 kérdést enged, ezért egy sablonban legfeljebb öt mező használható.</p><div class="record-list">${questionRows}</div><div class="actions"><button class="btn green" type="submit">${selected ? 'Sablon frissítése' : 'Sablon létrehozása'}</button>${selected ? `<a class="btn secondary" href="/owner/document-studio/${guild.id}">Mégse</a>` : ''}</div></form></section>`;
  return layout(`Workflow Studio • ${guild.name}`, content, session, config.branding);
}

async function ownerTgfForgePage(guild, session, options = {}) {
  const config = getGuildConfig(guild.id);
  const templates = config.applications?.templates || [];
  const selected = templates.find((item) => item.key === options.editKey) || null;
  const stats = await applicationStats(guild.id);
  const questionText = (selected?.questions || [])
    .map((question) => `${question.required === false ? '? ' : ''}${question.label}`)
    .join('\n');
  const cards = templates.length ? templates.map((template) => {
    const openChannel = guild.channels.cache.get(template.openChannelId);
    const reviewChannel = guild.channels.cache.get(template.reviewChannelId);
    const reviewerRole = guild.roles.cache.get(template.reviewerRoleId);
    const version = templateVersion(template);
    return `<article class="card template-card"><div class="section-kicker">TGF-időkapszula • ${escapeHtml(version)}</div><h3>${escapeHtml(template.emoji)} ${escapeHtml(template.title)}</h3><p class="muted">${template.questions.length} kérdés • ${Math.ceil(template.questions.length / 5)} lépés • ${template.blindReview ? 'vak bírálat' : 'normál bírálat'}</p><div class="status-list"><div class="status-row"><strong>Nyitócsatorna</strong><span>${openChannel ? `#${escapeHtml(openChannel.name)}` : 'Hiányzik'}</span></div><div class="status-row"><strong>Bírálati csatorna</strong><span>${reviewChannel ? `#${escapeHtml(reviewChannel.name)}` : 'Hiányzik'}</span></div><div class="status-row"><strong>Bírálók</strong><span>${reviewerRole ? `@${escapeHtml(reviewerRole.name)}` : 'Csak admin'}</span></div></div><div class="actions"><a class="btn secondary small" href="/owner/tgf-forge/${guild.id}?edit=${encodeURIComponent(template.key)}">Szerkesztés</a><form method="post" action="/owner/tgf-forge/${guild.id}/install"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="template_key" value="${escapeHtml(template.key)}"><button class="btn green small" type="submit">Panel kihelyezése</button></form><form method="post" action="/owner/tgf-forge/${guild.id}/delete"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="template_key" value="${escapeHtml(template.key)}"><button class="btn danger small" type="submit">Törlés</button></form></div></article>`;
  }).join('') : '<div class="notice warn">Még nincs egyedi TGF. Az első folyamatot az alábbi Forge-ban készítheted el.</div>';
  const notice = options.saved
    ? '<div class="notice">✅ A TGF-folyamat mentve. A korábbi jelentkezéseket az időkapszula változatlanul megőrzi.</div>'
    : options.installed
      ? '<div class="notice">✅ A TGF-panel kihelyezve vagy frissítve a Discordon.</div>'
      : options.published
        ? '<div class="notice">✅ A bot közzétette az üzenetet a kiválasztott csatornában.</div>'
        : '';
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA TGF Forge • Decision Intelligence</div><h1>Egyedi TGF és kiadói központ</h1><p class="muted">${escapeHtml(guild.name)} • Többoldalas kérdéssor, vak bírálat, pontozás, verzióbiztos megőrzés és azonnali bot-közlemény.</p></div><div class="actions"><a class="btn secondary" href="/owner/guild/${guild.id}">← Szerver</a><a class="btn" href="/owner/document-studio/${guild.id}">Iratstúdió</a></div></div>
  ${notice}
  <div class="stats"><div class="stat"><div class="stat-value">${Number(stats.total || 0)}</div><div class="stat-label">Összes TGF</div></div><div class="stat"><div class="stat-value">${Number(stats.pending || 0)}</div><div class="stat-label">Bírálatra vár</div></div><div class="stat"><div class="stat-value">${Number(stats.accepted || 0)}</div><div class="stat-label">Elfogadva</div></div><div class="stat"><div class="stat-value">${Number(stats.average_integrity || 0)}</div><div class="stat-label">Átlag Integrity Pulse</div></div></div>
  <section class="section"><div class="page-head"><div><div class="section-kicker">Élő folyamatok</div><h2>TGF-sablonok</h2></div></div><div class="grid">${cards}</div></section>
  <section class="card section" style="margin-top:24px"><div class="section-kicker">${selected ? 'Folyamat szerkesztése' : 'Új felvételi folyamat'}</div><h2 class="section-title">TGF Forge</h2><p class="muted">Legfeljebb 15 kérdést adhatsz meg; a bot automatikusan több Discord-oldalra bontja őket. A kérdés elején lévő <strong>?</strong> opcionális választ jelent.</p><form method="post" action="/owner/tgf-forge/${guild.id}/save"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="template_key" value="${escapeHtml(selected?.key || '')}"><div class="field-grid"><div><label>TGF neve *</label><input name="title" maxlength="45" value="${escapeHtml(selected?.title || '')}" placeholder="Például: Staff tagfelvétel" required></div><div><label>Emoji</label><input name="emoji" maxlength="16" value="${escapeHtml(selected?.emoji || '📋')}"></div><div><label>Nyitócsatorna *</label><select name="open_channel_id" required>${channelOptions(guild, selected?.openChannelId)}</select></div><div><label>Bírálati csatorna *</label><select name="review_channel_id" required>${channelOptions(guild, selected?.reviewChannelId)}</select></div><div><label>Eredménycsatorna</label><select name="result_channel_id">${channelOptions(guild, selected?.resultChannelId)}</select></div><div><label>Jelentkezéshez szükséges rang</label><select name="access_role_id">${roleOptions(guild, selected?.accessRoleId, 'Bárki jelentkezhet')}</select></div><div><label>Bírálói rang</label><select name="reviewer_role_id">${roleOptions(guild, selected?.reviewerRoleId, 'Csak adminisztrátor')}</select></div><div><label>Elfogadáskor adott rang</label><select name="accepted_role_id">${roleOptions(guild, selected?.acceptedRoleId, 'Ne adjon rangot')}</select></div><div><label>Új TGF értesítési rang</label><select name="notification_role_id">${roleOptions(guild, selected?.notificationRoleId, 'Ne pingeljen rangot')}</select></div><div><label>Újraküldési várakozás (óra)</label><input type="number" name="cooldown_hours" min="0" max="720" value="${Number(selected?.cooldownHours ?? 24)}"></div></div><div style="margin-top:16px"><label>Panel leírása</label><textarea name="description" maxlength="1000" placeholder="Mit kell tudnia a jelentkezőnek?">${escapeHtml(selected?.description || '')}</textarea></div><div style="margin-top:16px"><label>Kérdések, soronként egy *</label><textarea name="questions" rows="12" maxlength="12000" required placeholder="Miért szeretnél csatlakozni?&#10;Mit tudsz hozzáadni a közösséghez?&#10;? Van korábbi tapasztalatod?">${escapeHtml(questionText)}</textarea></div><div class="module-grid" style="margin:18px 0"><label class="switch"><input type="checkbox" name="blind_review"${selected?.blindReview !== false ? ' checked' : ''}><span><strong>Vak bírálat</strong><br><span class="muted">A bíráló a döntésig nem látja a jelentkező személyét.</span></span></label><label class="switch"><input type="checkbox" name="active"${selected?.active !== false ? ' checked' : ''}><span><strong>Aktív folyamat</strong><br><span class="muted">A panelről azonnal indítható.</span></span></label></div><div class="actions"><button class="btn green" type="submit">${selected ? 'TGF frissítése' : 'TGF létrehozása'}</button>${selected ? `<a class="btn secondary" href="/owner/tgf-forge/${guild.id}">Mégse</a>` : ''}</div></form></section>
  <section class="card section" style="margin-top:24px"><div class="section-kicker">Zero-Form Broadcast</div><h2 class="section-title">Gyors közzététel</h2><p class="muted">Nincs kérdés, nincs ügyszám és nincs jóváhagyás. A NexaBot egyszerűen kiírja az üzenetedet a kiválasztott meglévő csatornába.</p><form method="post" action="/owner/tgf-forge/${guild.id}/publish"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>Célcsatorna *</label><select name="publish_channel_id" required>${channelOptions(guild, null)}</select></div><div><label>Pingelendő rang</label><select name="publish_role_id">${roleOptions(guild, null, 'Ne pingeljen rangot')}</select></div><div><label>Cím</label><input name="publish_title" maxlength="256" placeholder="Például: Fontos felhívás"></div><div><label>Megjelenés</label><select name="publish_style"><option value="embed">Prémium beágyazott kártya</option><option value="plain">Egyszerű szöveges üzenet</option></select></div></div><div style="margin-top:16px"><label>Üzenet *</label><textarea name="publish_message" rows="8" maxlength="4000" required placeholder="Írd ide pontosan, amit a bot közzétegyen."></textarea></div><div class="actions"><button class="btn" type="submit">Közzététel a bottal</button></div></form></section>`;
  return layout(`TGF Forge • ${guild.name}`, content, session, config.branding);
}

function chronoRiskLabel(level) {
  return ({ clean: 'TISZTA', low: 'ALACSONY', medium: 'KÖZEPES', high: 'MAGAS', critical: 'KRITIKUS' })[level] || 'ISMERETLEN';
}

async function ownerChronoGuardPage(guild, session, options = {}) {
  const config = getGuildConfig(guild.id);
  const settings = config.chronoGuard;
  const overview = await chronoguardOverview(guild);
  const baseline = overview.baseline;
  const incident = overview.latestIncident;
  const diff = incident?.diff || { riskScore: 0, riskLevel: 'clean', counts: { critical: 0, high: 0, medium: 0, low: 0 }, changes: [] };
  const snapshots = overview.snapshots || [];
  const snapshotOptions = snapshots.map((snapshot) => `<option value="${escapeHtml(snapshot.id)}"${snapshot.is_baseline ? ' selected' : ''}>#${escapeHtml(snapshot.id)} • ${escapeHtml(String(snapshot.snapshot_hash).slice(0, 12))} • ${escapeHtml(new Date(snapshot.created_at).toLocaleString('hu-HU'))}${snapshot.is_baseline ? ' • BÁZIS' : ''}</option>`).join('');
  const snapshotRows = snapshots.length ? snapshots.map((snapshot) => {
    const integrity = snapshot.signature ? verifyChainSignature(snapshot) : false;
    return `<tr><td>#${escapeHtml(snapshot.id)}</td><td><code>${escapeHtml(String(snapshot.snapshot_hash).slice(0, 16))}</code>${snapshot.is_baseline ? '<br><span class="badge ultimate">BÁZIS</span>' : ''}</td><td>${escapeHtml(snapshot.source)}</td><td>${escapeHtml(new Date(snapshot.created_at).toLocaleString('hu-HU'))}</td><td><span class="${integrity ? 'status-ok' : 'status-bad'}">${integrity ? '● Hiteles lánc' : snapshot.signature ? '● Hibás aláírás' : '○ Nincs aláírva'}</span></td><td><div class="actions"><form method="post" action="/owner/chronoguard/${guild.id}/baseline"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="snapshot_id" value="${escapeHtml(snapshot.id)}"><button class="btn secondary small" type="submit">Legyen bázis</button></form><a class="btn secondary small" href="/owner/chronoguard/${guild.id}/export/${escapeHtml(snapshot.id)}">Kapszula</a></div></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="muted">Még nincs pillanatkép.</td></tr>';
  const changeRows = (diff.changes || []).length ? diff.changes.slice(0, 40).map((change) => `<tr><td><span class="badge ${change.severity === 'critical' || change.severity === 'high' ? 'ultimate' : 'free'}">${escapeHtml(String(change.severity).toUpperCase())}</span></td><td>${escapeHtml(change.kind)}</td><td>${escapeHtml(change.label)}</td><td>${escapeHtml(change.detail)}</td><td>${change.recoverable ? '<span class="status-ok">Igen</span>' : '<span class="muted">Csak kézi döntéssel</span>'}</td></tr>`).join('') : '<tr><td colspan="5" class="status-ok">Nem látható szerkezeti eltérés a legutóbbi vizsgálatban.</td></tr>';
  const notice = options.saved ? '<div class="notice">✅ A ChronoGuard beállításai mentve.</div>'
    : options.snapshot ? '<div class="notice">✅ Az új, kriptográfiai láncba kapcsolt szerverpillanatkép elkészült.</div>'
      : options.scanned ? '<div class="notice">✅ A Shadow Scan lefutott. A kockázati eredmény lent látható.</div>'
        : options.restored ? `<div class="notice">✅ A biztonságos helyreállítás lefutott. ${escapeHtml(options.restored)}</div>`
          : '';
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA 20.3.1 • ChronoGuard Digital Twin</div><h1>Szerver-időgép és incidensközpont</h1><p class="muted">${escapeHtml(guild.name)} • A szerver szerkezetének aláírt digitális ikre, eltérésmagyarázat, bizonyítékkapszula és előnézetes helyreállítás.</p></div><div class="actions"><a class="btn secondary" href="/owner/guild/${guild.id}">← Szerver</a><form method="post" action="/owner/chronoguard/${guild.id}/scan"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><button class="btn" type="submit">Shadow Scan futtatása</button></form></div></div>
  ${notice}
  ${!overview.available ? '<div class="notice error">A ChronoGuard használatához élő PostgreSQL DATABASE_URL szükséges.</div>' : ''}
  <div class="stats"><div class="stat"><div class="stat-value">${Number(diff.riskScore || 0)}/100</div><div class="stat-label">Drift kockázat</div></div><div class="stat"><div class="stat-value">${chronoRiskLabel(diff.riskLevel)}</div><div class="stat-label">Veszélyszint</div></div><div class="stat"><div class="stat-value">${snapshots.length}</div><div class="stat-label">Megőrzött állapot</div></div><div class="stat"><div class="stat-value">${baseline ? 'AKTÍV' : 'NINCS'}</div><div class="stat-label">Digitális bázis</div></div></div>
  <div class="grid"><section class="card"><div class="section-kicker">Tamper-evident chain</div><h2>Digitális iker integritása</h2><div class="status-list"><div class="status-row"><strong>Bázisazonosító</strong><span>${baseline ? `#${escapeHtml(baseline.id)}` : 'Nincs'}</span></div><div class="status-row"><strong>SHA-256 lenyomat</strong><span><code>${baseline ? escapeHtml(String(baseline.snapshot_hash).slice(0, 20)) : '—'}</code></span></div><div class="status-row"><strong>HMAC láncaláírás</strong><span class="${baseline?.signature && verifyChainSignature(baseline) ? 'status-ok' : 'status-bad'}">${baseline?.signature && verifyChainSignature(baseline) ? '● Érvényes' : '○ Nem ellenőrizhető'}</span></div></div><div class="actions"><form method="post" action="/owner/chronoguard/${guild.id}/snapshot"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><button class="btn secondary" type="submit">Új pillanatkép</button></form><form method="post" action="/owner/chronoguard/${guild.id}/snapshot-baseline"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><button class="btn green" type="submit">Új bázis rögzítése</button></form></div></section>
  <section class="card"><div class="section-kicker">Causal Drift Engine</div><h2>Legutóbbi eltérés</h2><div class="status-list"><div class="status-row"><strong>Kritikus</strong><span>${Number(diff.counts?.critical || 0)}</span></div><div class="status-row"><strong>Magas</strong><span>${Number(diff.counts?.high || 0)}</span></div><div class="status-row"><strong>Közepes</strong><span>${Number(diff.counts?.medium || 0)}</span></div><div class="status-row"><strong>Alacsony</strong><span>${Number(diff.counts?.low || 0)}</span></div></div><p class="muted">A NEXA nemcsak azt jelzi, hogy változás történt, hanem megmutatja, mi hiányzik, mi módosult, mi új, és mi állítható vissza biztonságosan.</p></section></div>
  <section class="card section" style="margin-top:20px"><div class="section-kicker">ChronoGuard szabályok</div><h2 class="section-title">Automatikus megfigyelés</h2><form method="post" action="/owner/chronoguard/${guild.id}/save"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="module-grid"><label class="switch"><input type="checkbox" name="enabled"${settings.enabled ? ' checked' : ''}><span><strong>ChronoGuard aktív</strong><br><span class="muted">Háttérben figyeli a digitális iker eltéréseit.</span></span></label></div><div class="field-grid"><div><label>Automatikus pillanatkép óránként</label><input type="number" name="auto_snapshot_hours" min="1" max="168" value="${Number(settings.autoSnapshotHours)}"></div><div><label>Megőrzött pillanatképek</label><input type="number" name="retention" min="5" max="100" value="${Number(settings.retention)}"></div><div><label>Riasztási küszöb (1–100)</label><input type="number" name="alert_threshold" min="1" max="100" value="${Number(settings.alertThreshold)}"></div><div><label>Védett rangok</label><select name="protected_role_ids" multiple size="8">${roleOptionsMulti(guild, settings.protectedRoleIds)}</select><div class="help">Eltérésük automatikusan kritikus kockázat.</div></div><div><label>Védett csatornák</label><select name="protected_channel_ids" multiple size="8">${channelOptionsMulti(guild, settings.protectedChannelIds)}</select><div class="help">Törlésük vagy átírásuk kritikus jelzést ad.</div></div></div><div class="actions"><button class="btn green" type="submit">ChronoGuard mentése</button></div></form></section>
  <section class="card section" style="margin-top:20px"><div class="section-kicker">Shadow Recovery</div><h2 class="section-title">Biztonságos helyreállítás</h2><div class="notice warn">A NEXA először eltérést számol. A helyreállítás nem törli az új rangokat vagy csatornákat. Alapból csak a meglévő elemek módosított beállításait állítja vissza; a hiányzók újralétrehozása külön kapcsolható.</div><form method="post" action="/owner/chronoguard/${guild.id}/restore"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>Helyreállítási pillanatkép</label><select name="snapshot_id" required>${snapshotOptions}</select></div><div><label>Megerősítés</label><input name="confirmation" placeholder="CHRONOGUARD" required><div class="help">Pontosan ezt írd be: CHRONOGUARD</div></div><div><label class="switch"><input type="checkbox" name="create_missing"><span><strong>Hiányzó elemek újralétrehozása</strong><br><span class="muted">Új Discord ID-val készülnek el; a bot soha nem töröl új elemet.</span></span></label></div></div><div class="actions"><button class="btn danger" type="submit">Előnézet alapján helyreállítás</button></div></form></section>
  <section class="card section" style="margin-top:20px"><div class="section-kicker">Drift térkép</div><h2 class="section-title">Észlelt változások</h2><div style="overflow:auto"><table><thead><tr><th>Súly</th><th>Típus</th><th>Elem</th><th>Magyarázat</th><th>Helyreállítható</th></tr></thead><tbody>${changeRows}</tbody></table></div></section>
  <section class="card section" style="margin-top:20px"><div class="section-kicker">Incident Capsules</div><h2 class="section-title">Aláírt szerverpillanatképek</h2><div style="overflow:auto"><table><thead><tr><th>ID</th><th>Lenyomat</th><th>Forrás</th><th>Idő</th><th>Integritás</th><th>Művelet</th></tr></thead><tbody>${snapshotRows}</tbody></table></div></section>`;
  return layout(`ChronoGuard • ${guild.name}`, content, session, config.branding);
}

function aegisRiskLabel(level) {
  return ({ low: 'ALACSONY', medium: 'KÖZEPES', high: 'MAGAS', critical: 'KRITIKUS' })[level] || 'ISMERETLEN';
}

async function ownerAegisPage(guild, session, options = {}) {
  const config = getGuildConfig(guild.id);
  const overview = await aegisOverview(guild);
  const current = overview.current;
  const baseline = overview.baseline;
  const diff = overview.diff;
  const identities = current.identities.filter((identity) => !identity.owner).slice(0, 60);
  const identityRows = identities.length ? identities.map((identity) => `<tr><td><strong>${escapeHtml(identity.label)}</strong><br><code>${escapeHtml(identity.id)}</code>${identity.bot ? '<br><span class="badge">BOT</span>' : ''}</td><td><strong class="risk-${escapeHtml(identity.level)}">${Number(identity.score)}/100 • ${aegisRiskLabel(identity.level)}</strong></td><td>${escapeHtml(identity.permissionLabels.join(', ') || 'Nincs kiemelt jog')}</td><td>${identity.containable ? '<span class="status-ok">● Igen</span>' : '<span class="status-bad">● Nem</span>'}</td><td>${escapeHtml(identity.reasons.join(' • '))}</td></tr>`).join('') : '<tr><td colspan="5" class="status-ok">Nem található kiemelt jogosultsági kockázat.</td></tr>';
  const roleRows = current.roles.length ? current.roles.slice(0, 60).map((role) => `<tr><td><strong>${escapeHtml(role.name)}</strong><br><code>${escapeHtml(role.id)}</code></td><td>${Number(role.position)}</td><td>${escapeHtml(role.permissionLabels.join(', '))}</td><td>${role.aboveBot ? '<span class="status-bad">A NEXA fölött</span>' : '<span class="status-ok">A NEXA alatt</span>'}</td></tr>`).join('') : '<tr><td colspan="4" class="status-ok">Nincs veszélyes jogosultságú rang.</td></tr>';
  const scanRows = overview.scans.length ? overview.scans.map((scan) => `<tr><td>#${escapeHtml(scan.id)}</td><td>${Number(scan.posture_score)}/100</td><td><code>${escapeHtml(String(scan.dna_hash).slice(0, 18))}…</code>${scan.is_baseline ? '<br><span class="badge ultimate">BÁZIS</span>' : ''}</td><td>${escapeHtml(scan.source)}</td><td>${escapeHtml(new Date(scan.created_at).toLocaleString('hu-HU'))}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Még nincs elmentett AEGIS-vizsgálat.</td></tr>';
  const changedNames = [...diff.addedIdentities, ...diff.changedIdentities].slice(0, 12).map((identity) => identity.label).join(', ');
  const notices = [
    options.scanned ? '<div class="notice">✅ A teljes Permission DNA-vizsgálat elkészült.</div>' : '',
    options.baseline ? '<div class="notice">✅ Az új, jóváhagyott jogosultsági bázis rögzítve.</div>' : '',
    options.error ? `<div class="notice error">${escapeHtml(options.error)}</div>` : ''
  ].join('');
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA 20.3.1 • AEGIS PERMISSION DNA</div><h1>Jogosultsági intelligencia</h1><p class="muted">${escapeHtml(guild.name)} • Veszélyes jogok, robbanási sugár, elszigetelhetőség és kriptográfiai jogosultság-eltérés egy helyen.</p></div><div class="actions"><a class="btn secondary" href="/owner/guild/${guild.id}">← Szerver</a><a class="btn secondary" href="/tudaskozpont">Mit tud az AEGIS?</a></div></div>
  ${notices}
  <div class="grid" style="grid-template-columns:minmax(260px,.55fr) minmax(0,1.45fr)"><section class="card" style="display:grid;place-items:center"><div class="aegis-score" style="--score:${Number(current.postureScore)}%"><div><strong>${Number(current.postureScore)}</strong><span>biztonsági pont / 100</span></div></div><p class="muted" style="text-align:center">Minél magasabb, annál kisebb a jogosultsági robbanási sugár.</p></section><section class="card"><div class="section-kicker">Élő Permission DNA</div><h2>Jelenlegi jogosultsági lenyomat</h2><code class="dna-code">${escapeHtml(current.permissionDna)}</code><div class="status-list" style="margin-top:14px"><div class="status-row"><strong>Jóváhagyott bázis</strong><span>${baseline ? `#${escapeHtml(baseline.id)} • ${escapeHtml(String(baseline.dna_hash).slice(0, 18))}…` : 'Még nincs'}</span></div><div class="status-row"><strong>Eltérés a bázistól</strong><span class="${diff.changed ? 'status-bad' : 'status-ok'}">${baseline ? (diff.changed ? '● IGEN' : '● NINCS') : '○ Először rögzíts bázist'}</span></div><div class="status-row"><strong>Kockázatváltozás</strong><span>${Number(diff.riskDelta || 0) > 0 ? '+' : ''}${Number(diff.riskDelta || 0)} pont</span></div><div class="status-row"><strong>Érintett identitások</strong><span>${escapeHtml(changedNames || 'Nincs')}</span></div></div><div class="actions"><form method="post" action="/owner/aegis/${guild.id}/scan"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><button class="btn" type="submit">Teljes vizsgálat</button></form><form method="post" action="/owner/aegis/${guild.id}/baseline"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><button class="btn secondary" type="submit">Jóváhagyott bázis rögzítése</button></form></div></section></div>
  <div class="stats"><div class="stat"><div class="stat-value risk-critical">${Number(current.counts.critical)}</div><div class="stat-label">Kritikus identitás</div></div><div class="stat"><div class="stat-value risk-high">${Number(current.counts.high)}</div><div class="stat-label">Magas kockázat</div></div><div class="stat"><div class="stat-value">${Number(current.counts.uncontainable)}</div><div class="stat-label">Nem elszigetelhető</div></div><div class="stat"><div class="stat-value">${Number(current.counts.untrustedBots)}</div><div class="stat-label">Ismeretlen bot</div></div></div>
  <div class="notice warn">Az AEGIS elemző és döntéstámogató rendszer: nem vesz el automatikusan rangot, és nem tilt ki felhasználót. A tényleges védelmi reakciót a NEXA Shield / Anti-Nuke végzi a beállított szabályok szerint.</div>
  <section class="card section" style="margin-top:20px"><div class="section-kicker">Identity Blast Radius</div><h2 class="section-title">Kockázatos identitások</h2><div style="overflow:auto"><table><thead><tr><th>Tag / bot</th><th>Kockázat</th><th>Veszélyes jogok</th><th>Elszigetelhető</th><th>Magyarázat</th></tr></thead><tbody>${identityRows}</tbody></table></div></section>
  <section class="card section" style="margin-top:20px"><div class="section-kicker">Privilege topology</div><h2 class="section-title">Veszélyes rangok</h2><div style="overflow:auto"><table><thead><tr><th>Rang</th><th>Pozíció</th><th>Jogok</th><th>NEXA-hierarchia</th></tr></thead><tbody>${roleRows}</tbody></table></div></section>
  <div class="grid" style="margin-top:20px"><section class="card"><div class="section-kicker">Drift summary</div><h2>Változás a bázishoz képest</h2><div class="status-list"><div class="status-row"><strong>Új jogosult identitás</strong><span>${diff.addedIdentities.length}</span></div><div class="status-row"><strong>Módosult identitás</strong><span>${diff.changedIdentities.length}</span></div><div class="status-row"><strong>Eltűnt identitás</strong><span>${diff.removedIdentities.length}</span></div><div class="status-row"><strong>Módosult veszélyes rang</strong><span>${diff.changedRoles.length}</span></div></div></section><section class="card"><div class="section-kicker">Containment readiness</div><h2>Mit jelent az elszigetelhetőség?</h2><p class="muted">A NEXA csak olyan tag rangjait tudja módosítani, akinek legmagasabb rangja a NEXA saját rangja alatt van. A pirossal jelzett identitások ellen a bot technikailag nem tudna biztonsági intézkedést végrehajtani, ezért a Discord rangsorrendet kézzel kell javítani.</p></section></div>
  <section class="card section" style="margin-top:20px"><div class="section-kicker">AEGIS history</div><h2 class="section-title">Korábbi vizsgálatok</h2><div style="overflow:auto"><table><thead><tr><th>ID</th><th>Pont</th><th>DNA</th><th>Forrás</th><th>Idő</th></tr></thead><tbody>${scanRows}</tbody></table></div></section>`;
  return layout(`AEGIS • ${guild.name}`, content, session, config.branding);
}

async function installCustomDocumentPanel(guild, type, botUser) {
  const channel = findDocumentChannel(guild, type);
  if (!channel) throw new Error('A kiválasztott Discord-csatorna nem található vagy nem írható.');
  const footer = `NexaBot • Dokumentumpanel • ${type.key}`;
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = messages?.find((message) => message.author.id === botUser.id && message.embeds[0]?.footer?.text === footer);
  if (existing) await existing.edit(documentPanel(type, guild));
  else await channel.send(documentPanel(type, guild));
  return channel;
}

function budapestInput(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value)).reduce((output, part) => ({ ...output, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function parseBudapestInput(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const wantedUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let guess = wantedUtc;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit',
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

async function ownerShiftsPage(guild, session, options = {}) {
  const [overview, rows] = await Promise.all([
    shiftOverview(guild.id),
    listShiftRecords(guild.id, { limit: 150, userId: options.userId })
  ]);
  const records = rows.length ? rows.map((row) => {
    const member = guild.members.cache.get(row.user_id);
    const name = member?.displayName || member?.user?.username || row.user_id;
    return `<form class="record" method="post" action="/owner/shifts/${guild.id}/record/${row.id}"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div><strong>${escapeHtml(name)}</strong><div class="muted">${escapeHtml(row.user_id)} • #${escapeHtml(row.id)}</div><div class="badge ${row.ended_at ? '' : 'pro'}">${row.ended_at ? formatDuration(row.active_seconds) : 'AKTÍV'}</div></div><div><label>Kezdés • Budapest</label><input type="datetime-local" name="started_at" value="${escapeHtml(budapestInput(row.started_at))}" required></div><div><label>Befejezés • Budapest</label><input type="datetime-local" name="ended_at" value="${escapeHtml(budapestInput(row.ended_at))}"><div class="help">Üresen hagyva aktív szolgálat.</div></div><div><label>Szünet másodpercben</label><input type="number" name="break_seconds" min="0" max="31536000" value="${Number(row.break_seconds || 0)}"></div><div class="actions"><button class="btn green small" name="operation" value="update" type="submit">Mentés</button><button class="btn danger small" name="operation" value="delete" type="submit">Törlés</button></div></form>`;
  }).join('') : '<div class="notice warn">A szűréshez nem található szolgálati rekord.</div>';
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA 20.3.1 • Shift Operations</div><h1>Szolgálati irányítóközpont</h1><p class="muted">${escapeHtml(guild.name)} • Aktív és lezárt szolgálatok szerkesztése, törlése és nullázása.</p></div><a class="btn secondary" href="/owner/guild/${guild.id}">← Szerver</a></div>
  ${options.saved ? '<div class="notice">✅ A szolgálati adat módosítása rögzítve és auditálva.</div>' : ''}
  <div class="stats"><div class="stat"><div class="stat-value">${overview.active}</div><div class="stat-label">Aktív szolgálat</div></div><div class="stat"><div class="stat-value">${overview.completed}</div><div class="stat-label">Lezárt műszak</div></div><div class="stat"><div class="stat-value">${overview.members}</div><div class="stat-label">Érintett tag</div></div><div class="stat"><div class="stat-value">${formatDuration(overview.seconds)}</div><div class="stat-label">Összes aktív idő</div></div></div>
  <section class="card section"><div class="section-kicker">Keresés és veszélyes műveletek</div><h2 class="section-title">Tulajdonosi kezelés</h2><div class="owner-tools"><form method="get" action="/owner/shifts/${guild.id}"><label>Tag Discord ID szerinti szűrése</label><input type="text" name="user" inputmode="numeric" maxlength="22" value="${escapeHtml(options.userId || '')}" placeholder="123456789012345678"><div class="actions"><button class="btn" type="submit">Szűrés</button><a class="btn secondary" href="/owner/shifts/${guild.id}">Összes</a></div></form><form method="post" action="/owner/shifts/${guild.id}/reset-user"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><label>Egy tag teljes nullázása</label><input type="text" name="user_id" inputmode="numeric" maxlength="22" placeholder="Discord felhasználói ID" required><label>Megerősítés</label><input type="text" name="confirmation" placeholder="Írd be: RESET" required><button class="btn danger" type="submit">Tag szolgálatának nullázása</button></form><form method="post" action="/owner/shifts/${guild.id}/reset-all"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><label>Teljes szerver nullázása</label><p class="muted">Minden aktív és korábbi szolgálati rekord végleg törlődik.</p><input type="text" name="confirmation" placeholder="Írd be: TELJES RESET" required><button class="btn danger" type="submit">Minden szolgálat nullázása</button></form></div></section>
  <section class="section" style="margin-top:24px"><div class="page-head"><div><div class="section-kicker">Legfeljebb 150 rekord</div><h2>Szolgálati rekordok</h2></div></div><div class="record-list">${records}</div></section>`;
  return layout(`Szolgálatkezelés • ${guild.name}`, content, session, getGuildConfig(guild.id).branding);
}

async function ownerErlcPage(guild, session, options = {}) {
  const integration = await getErlcIntegration(guild.id);
  let live = null;
  let apiError = null;
  if (integration.configured && integration.enabled) {
    try {
      live = (await fetchErlcServer(guild.id, { Players: true, Staff: true, Queue: true })).data;
    } catch (error) { apiError = error.message; }
  }
  const players = Array.isArray(live?.Players) ? live.Players : [];
  const playerRows = players.slice(0, 75).map((player) => {
    const [name, id] = String(player.Player || '').split(':');
    return `<tr><td>${escapeHtml(name || 'Ismeretlen')}</td><td>${escapeHtml(id || '—')}</td><td>${escapeHtml(player.Team || '—')}</td><td>${escapeHtml(player.Callsign || '—')}</td><td>${escapeHtml(player.Permission || 'Normal')}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="muted">Nincs online játékos vagy az API nem elérhető.</td></tr>';
  const staff = live?.Staff || {};
  const staffCount = Object.values(staff).reduce((sum, group) => sum + Object.keys(group || {}).length, 0);
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA 20.3.1 • ER:LC Bridge</div><h1>ER:LC integráció</h1><p class="muted">${escapeHtml(guild.name)} • Privát szerver állapot, játékosok, staff és owneres parancsvezérlés.</p></div><a class="btn secondary" href="/owner/guild/${guild.id}">← Szerver</a></div>
  ${options.saved ? '<div class="notice">✅ Az ER:LC kulcs ellenőrizve, titkosítva és elmentve.</div>' : ''}${options.commandSent ? '<div class="notice">✅ Az ER:LC parancsot az API elfogadta.</div>' : ''}${apiError ? `<div class="notice error">⚠️ ER:LC API: ${escapeHtml(apiError)}</div>` : ''}
  <div class="stats"><div class="stat"><div class="stat-value">${live ? Number(live.CurrentPlayers || 0) : '—'}</div><div class="stat-label">Online játékos</div></div><div class="stat"><div class="stat-value">${live ? Number(live.MaxPlayers || 0) : '—'}</div><div class="stat-label">Férőhely</div></div><div class="stat"><div class="stat-value">${live ? (Array.isArray(live.Queue) ? live.Queue.length : 0) : '—'}</div><div class="stat-label">Várólista</div></div><div class="stat"><div class="stat-value">${live ? staffCount : '—'}</div><div class="stat-label">ER:LC staff</div></div></div>
  <div class="grid"><section class="card"><div class="section-kicker">Titkos kapcsolat</div><h2>API-kulcs</h2><div class="status-list"><div class="status-row"><strong>Állapot</strong><span class="${integration.enabled ? 'status-ok' : 'muted'}">${integration.configured ? (integration.enabled ? '● Bekapcsolva' : '○ Kikapcsolva') : '○ Nincs beállítva'}</span></div><div class="status-row"><strong>Forrás</strong><span>${escapeHtml(integration.source || '—')}</span></div><div class="status-row"><strong>Kulcs</strong><span>${escapeHtml(integration.keyMask)}</span></div><div class="status-row"><strong>ER:LC szerver</strong><span>${escapeHtml(live?.Name || integration.serverName || '—')}</span></div><div class="status-row"><strong>Join Key</strong><span>${escapeHtml(live?.JoinKey || integration.joinKey || '—')}</span></div></div></section><section class="card"><div class="section-kicker">Kulcs cseréje</div><h2>Biztonságos beállítás</h2><form method="post" action="/owner/erlc/${guild.id}/save"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><label>ER:LC Server Key</label><input type="password" name="server_key" minlength="10" maxlength="500" autocomplete="new-password" placeholder="A kulcs értéke nem lesz többé megjelenítve" required><p class="help">Mentés előtt a NEXA élő API-hívással ellenőrzi, majd AES-256-GCM titkosítással tárolja. A GitHubba nem kerül.</p><button class="btn green" type="submit">Kapcsolat tesztelése és mentése</button></form>${integration.source === 'database' ? `<div class="actions"><form method="post" action="/owner/erlc/${guild.id}/toggle"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="enabled" value="${integration.enabled ? '0' : '1'}"><button class="btn secondary" type="submit">${integration.enabled ? 'Ideiglenes kikapcsolás' : 'Bekapcsolás'}</button></form><form method="post" action="/owner/erlc/${guild.id}/delete"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="text" name="confirmation" placeholder="Írd be: ERLC TÖRLÉS" required><button class="btn danger" type="submit">Kulcs törlése</button></form></div>` : ''}</section></div>
  <section class="card section" style="margin-top:18px"><div class="section-kicker">Virtuális szerverkezelés</div><h2 class="section-title">Owner parancskonzol</h2><form method="post" action="/owner/erlc/${guild.id}/command"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>ER:LC parancs</label><input type="text" name="command" maxlength="200" placeholder=":h Szolgálati közlemény" required><div class="help">Csak egy soros, „:” jellel kezdődő parancs küldhető.</div></div><div><label>Megerősítés</label><input type="text" name="confirmation" placeholder="Írd be: KÜLDÉS" required></div></div><button class="btn" type="submit">Parancs elküldése az ER:LC szerverre</button></form></section>
  <section class="card section" style="margin-top:18px"><div class="section-kicker">Élő szerverlista</div><h2 class="section-title">Játékosok</h2><div style="overflow:auto"><table><thead><tr><th>Név</th><th>Roblox ID</th><th>Csapat</th><th>Hívójel</th><th>Jogosultság</th></tr></thead><tbody>${playerRows}</tbody></table></div></section>`;
  return layout(`ER:LC • ${guild.name}`, content, session, getGuildConfig(guild.id).branding);
}

async function dashboardList(client, session) {
  const en = (session?.language || 'en') !== 'hu';
  const guilds = await manageableGuilds(client, session);
  const cards = guilds.length
    ? guilds.map(({ oauthGuild, botGuild }) => {
      const plan = getGuildPlan(botGuild.id);
      return `<article class="card server">${guildIcon(oauthGuild)}<div class="server-body"><h3>${escapeHtml(oauthGuild.name)} <span class="badge ${plan}">${planName(plan)}</span></h3><div class="muted">${en ? 'NEXA Core connected' : 'NEXA Core csatlakoztatva'} • ${Number(botGuild.memberCount || 0)} ${en ? 'members' : 'tag'}</div></div><div class="actions"><a class="btn secondary small" href="/billing?guild=${escapeHtml(oauthGuild.id)}">${en ? 'Subscription' : 'Csomag'}</a><a class="btn" href="/dashboard/guild/${escapeHtml(oauthGuild.id)}">Command Deck →</a></div></article>`;
    }).join('')
    : `<div class="card"><h2>${en ? 'No manageable server' : 'Nincs kezelhető szerver'}</h2><p class="muted">${en ? 'Invite NEXA Bot to a server where you are the owner, an administrator or an authorized role member.' : 'Hívd meg a NexaBotot egy olyan szerverre, ahol tulajdonos, adminisztrátor vagy kijelölt rangú tag vagy.'}</p><a class="btn" href="${escapeHtml(inviteUrl())}">${en ? 'Invite bot' : 'Bot meghívása'}</a></div>`;
  const persistence = isPersistentStore() ? '' : `<div class="notice warn">⚠️ ${en ? 'DATABASE_URL is not configured. Changes may be lost after a restart.' : 'Nincs DATABASE_URL beállítva. A módosítások újraindításkor elveszhetnek.'}</div>`;
  const members = guilds.reduce((sum, item) => sum + Number(item.botGuild.memberCount || 0), 0);
  const modules = guilds.reduce((sum, item) => sum + Object.values(getGuildConfig(item.botGuild.id).modules).filter(Boolean).length, 0);
  return layout(en ? 'My servers' : 'Szervereim', `<div class="page-head"><div><div class="section-kicker">NEXA Bot 20.3.1 • Command Deck</div><h1>${en ? 'Server network' : 'Szerverhálózat'}</h1><p class="muted">${en ? 'Only servers where you are an owner, administrator or authorized manager are shown.' : 'Csak azok a szerverek láthatók, amelyekhez tulajdonosi, adminisztrátori vagy kijelölt kezelői jogosultságod van.'}</p></div></div><div class="stats"><div class="stat"><div class="stat-value">${guilds.length}</div><div class="stat-label">${en ? 'Managed servers' : 'Kezelt szerver'}</div></div><div class="stat"><div class="stat-value">${members}</div><div class="stat-label">${en ? 'Total members' : 'Összes tag'}</div></div><div class="stat"><div class="stat-value">${modules}</div><div class="stat-label">${en ? 'Configured modules' : 'Konfigurált modul'}</div></div><div class="stat"><div class="stat-value">ONLINE</div><div class="stat-label">NEXA Core</div></div></div>${persistence}<div class="grid">${cards}</div>`, session);
}

async function profilePage(client, session) {
  const en = (session?.language || 'en') !== 'hu';
  const user = session.user;
  const guilds = await manageableGuilds(client, session);
  const avatar = user.avatar
    ? `<img class="profile-avatar-large" alt="" src="https://cdn.discordapp.com/avatars/${escapeHtml(user.id)}/${escapeHtml(user.avatar)}.png?size=256">`
    : `<div class="profile-avatar-large">${escapeHtml(String(user.global_name || user.username || 'N').slice(0, 1).toUpperCase())}</div>`;
  const access = isBotOwner(user.id)
    ? (en ? 'Primary bot owner' : 'Elsődleges bottulajdonos')
    : isOwnerUser(user.id)
      ? (en ? 'Authorized Owner operator' : 'Engedélyezett Owner-kezelő')
      : (en ? 'Server manager' : 'Szerverkezelő');
  const serverRows = guilds.length
    ? guilds.slice(0, 12).map(({ oauthGuild, botGuild }) => `<a class="language-card" href="/dashboard/guild/${escapeHtml(botGuild.id)}/overview">${guildIcon(oauthGuild)}<div><b>${escapeHtml(oauthGuild.name)}</b><span>${Number(botGuild.memberCount || 0).toLocaleString(en ? 'en-GB' : 'hu-HU')} ${en ? 'members' : 'tag'} · ${planName(getGuildPlan(botGuild.id))}</span></div></a>`).join('')
    : `<div class="notice warn">${en ? 'No manageable NEXA server is connected to this account yet.' : 'Ehhez a fiókhoz még nem tartozik kezelhető NEXA-szerver.'}</div>`;
  const content = `<section class="card profile-hero">${avatar}<div class="profile-identity"><div class="section-kicker">NEXA IDENTITY CENTER</div><h1>${escapeHtml(user.global_name || user.username)}</h1><div class="muted">@${escapeHtml(user.username)}</div><code>${escapeHtml(user.id)}</code></div><span class="badge ${isOwnerUser(user.id) ? 'ultimate' : 'pro'}">${escapeHtml(access)}</span></section>
  <div class="stats"><div class="stat"><div class="stat-value">${guilds.length}</div><div class="stat-label">${en ? 'Managed servers' : 'Kezelt szerverek'}</div></div><div class="stat"><div class="stat-value">${isOwnerUser(user.id) ? 'OWNER' : 'ADMIN'}</div><div class="stat-label">${en ? 'Access tier' : 'Hozzáférés'}</div></div><div class="stat"><div class="stat-value">${en ? 'EN' : 'HU'}</div><div class="stat-label">${en ? 'Interface language' : 'Felület nyelve'}</div></div><div class="stat"><div class="stat-value">SECURE</div><div class="stat-label">Discord OAuth2</div></div></div>
  <div class="grid"><section class="card section"><div class="section-kicker">${en ? 'LANGUAGE' : 'NYELV'}</div><h2>${en ? 'Choose your dashboard language' : 'Válaszd ki a dashboard nyelvét'}</h2><p class="muted">${en ? 'Your choice is saved in a secure browser cookie and remains active after signing in again.' : 'A választást biztonságos böngészősüti menti, ezért az újabb belépés után is megmarad.'}</p><div class="language-grid"><a class="language-card${en ? ' active' : ''}" href="/language?lang=en&return=%2Fprofile"><strong>🇬🇧</strong><div><b>English</b><span>${en ? 'Current language' : 'Angol felület'}</span></div></a><a class="language-card${en ? '' : ' active'}" href="/language?lang=hu&return=%2Fprofile"><strong>🇭🇺</strong><div><b>Magyar</b><span>${en ? 'Hungarian interface' : 'Jelenlegi nyelv'}</span></div></a></div></section><section class="card section"><div class="section-kicker">${en ? 'ACCOUNT SECURITY' : 'FIÓKBIZTONSÁG'}</div><h2>${en ? 'Protected Discord session' : 'Védett Discord-munkamenet'}</h2><div class="status-list"><div class="status-row"><strong>Discord OAuth2</strong><span class="status-ok">✓ ${en ? 'Authenticated' : 'Hitelesítve'}</span></div><div class="status-row"><strong>CSRF</strong><span class="status-ok">✓ ${en ? 'Protected forms' : 'Védett űrlapok'}</span></div><div class="status-row"><strong>Owner Center</strong><span class="${isOwnerUser(user.id) ? 'status-ok' : 'muted'}">${isOwnerUser(user.id) ? `✓ ${en ? 'Authorized' : 'Engedélyezve'}` : `— ${en ? 'No owner access' : 'Nincs owner-hozzáférés'}`}</span></div></div></section></div>
  <section class="card section" style="margin-top:16px"><div class="section-kicker">${en ? 'SERVER ACCESS' : 'SZERVERHOZZÁFÉRÉS'}</div><h2>${en ? 'Servers you can manage' : 'Általad kezelhető szerverek'}</h2><div class="language-grid">${serverRows}</div></section>`;
  return layout(en ? 'Profile' : 'Profil', content, session, null, en ? 'en' : 'hu', 'profile');
}

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}

function channelOptions(guild, selected, categoriesOnly = false) {
  const channels = [...guild.channels.cache.values()]
    .filter((channel) => categoriesOnly
      ? channel.type === ChannelType.GuildCategory
      : channel.isTextBased?.() && !channel.isThread?.())
    .sort((a, b) => a.rawPosition - b.rawPosition || a.name.localeCompare(b.name, 'hu'));
  return option('', 'Nincs kiválasztva', selected) + channels.map((channel) => option(channel.id, `# ${channel.name}`, selected)).join('');
}

function roleOptions(guild, selected, emptyLabel = 'Nincs kiválasztva') {
  const roles = [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id && !role.managed)
    .sort((a, b) => b.position - a.position);
  return option('', emptyLabel, selected) + roles.map((role) => option(role.id, role.name, selected)).join('');
}

function roleOptionsMulti(guild, selected = []) {
  const selectedIds = new Set(selected);
  return [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id && !role.managed)
    .sort((a, b) => b.position - a.position)
    .map((role) => `<option value="${escapeHtml(role.id)}"${selectedIds.has(role.id) ? ' selected' : ''}>${escapeHtml(role.name)}</option>`)
    .join('');
}

function channelOptionsMulti(guild, selected = []) {
  const selectedIds = new Set(selected);
  return [...guild.channels.cache.values()]
    .filter((channel) => channel.isTextBased?.() && !channel.isThread?.())
    .sort((a, b) => a.rawPosition - b.rawPosition || a.name.localeCompare(b.name, 'hu'))
    .map((channel) => `<option value="${escapeHtml(channel.id)}"${selectedIds.has(channel.id) ? ' selected' : ''}># ${escapeHtml(channel.name)}</option>`)
    .join('');
}

function voiceChannelOptions(guild, selected) {
  const channels = [...guild.channels.cache.values()]
    .filter((channel) => channel.type === ChannelType.GuildVoice)
    .sort((a, b) => a.rawPosition - b.rawPosition || a.name.localeCompare(b.name, 'hu'));
  return option('', 'Nincs kiválasztva', selected) + channels.map((channel) => option(channel.id, `🔊 ${channel.name}`, selected)).join('');
}

function check(name, label, checked, help = '') {
  return `<label class="switch"><input type="checkbox" name="${escapeHtml(name)}"${checked ? ' checked' : ''}><span>${escapeHtml(label)}${help ? `<div class="help">${escapeHtml(help)}</div>` : ''}</span></label>`;
}

function planName(plan) {
  return ({ free: 'FREE', pro: 'PRO', ultimate: 'ULTIMATE', premium: 'ULTIMATE' })[plan] || 'FREE';
}

function moduleCheck(guildId, key, name, label, checked, help = '') {
  const allowed = planAllowsModule(guildId, key);
  const minimum = MODULE_MINIMUM_PLAN[key] || 'free';
  if (allowed) return check(name, label, checked, help).replace('<label class="switch"', `<label class="switch" data-module="${escapeHtml(key)}"`);
  return `<label class="switch locked" data-module="${escapeHtml(key)}"><input type="checkbox" disabled><span>${escapeHtml(label)} <b class="plan-tag">${planName(minimum)}</b><div class="help">${escapeHtml(help || 'Ehhez magasabb Owner-csomag szükséges.')}</div></span></label>`;
}

function featureCheck(guildId, requiredPlan, name, label, checked, help = '') {
  if (planAllows(guildId, requiredPlan)) return check(name, label, checked, help);
  return `<label class="switch locked"><input type="checkbox" disabled><span>${escapeHtml(label)} <b class="plan-tag">${planName(requiredPlan)}</b><div class="help">${escapeHtml(help || 'Ehhez magasabb Owner-csomag szükséges.')}</div></span></label>`;
}

function selectField(name, label, options, help = '') {
  return `<div data-field="${escapeHtml(name)}"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><select id="${escapeHtml(name)}" name="${escapeHtml(name)}">${options}</select>${help ? `<div class="help">${escapeHtml(help)}</div>` : ''}</div>`;
}

const CONTROL_CENTER_ENGLISH = Object.freeze([
  ["Minden szerverbeállítás egyetlen átlátható kezelőfelületen.", "Every server setting in one clear control center."],
  ["Az adatbázis még nincs beállítva, ezért az AI-memória, XP, emlékeztetők és szolgálati statisztika újraindításkor elveszhet.", "The database is not configured yet, so AI memory, XP, reminders and shift statistics may be lost after a restart."],
  ["Owner RP aktív ezen a szerveren.", "Owner RP is active on this server."],
  ["Discordon a /telepites paranccsal a teljes alap RP-rendszer, a /dokumentum-panelek paranccsal pedig kizárólag a meglévő csatornák dokumentumpaneljei telepíthetők.", "Use /telepites for the base RP system and /dokumentum-panelek to publish document panels only in existing channels."],
  ["A panelek és a Discord-válaszok a kiválasztott nyelven jelennek meg.", "Panels and Discord responses use the selected language."],
  ["Mentés után az adott szerveren frissülnek a slash parancsnevek.", "After saving, slash command names are refreshed for this server."],
  ["Automatikus • a Discord nyelve alapján", "Automatic • based on each user's Discord language"],
  ["Csak Owner által engedélyezett felhasználók használhatják.", "Only users approved by the bot owner may use it."],
  ["Spam-, link- és tartalomvédelem. Anti-Nuke és raid csak Ultimate csomagban.", "Spam, link and content protection. Anti-Nuke and raid protection require Ultimate."],
  ["Case ID és tagválasztós moderációs panel.", "Case IDs and a member-picker moderation panel."],
  ["Egy kattintással adja az ellenőrzött tag rangot.", "Assigns the verified member role with one click."],
  ["A legtöbb csillagot kapott üzenetek automatikus kiemelése.", "Automatically highlights the most-starred messages."],
  ["Adatbázisos személyes emlékeztetők.", "Persistent personal reminders."],
  ["Privát ügycsatorna, Staff-kezelés és HTML transcript.", "Private case channel, staff controls and HTML transcript."],
  ["Itt egy helyen állítható a teljes általános ticket-rendszer.", "Configure the complete general ticket system here."],
  ["ettől elkülönül, és kizárólag a", "is isolated from it and works only on the"],
  ["azonosítójú Support szerveren működik.", "Support server."],
  ["Csak a bejelölt típusok jelennek meg a szerver ügyintézési paneljén.", "Only selected types appear on the server's ticket panel."],
  ["A neveket szerverenként átírhatod, például: Segélykérés, TGF kérdés, Panasz vagy Frakciójelentkezés.", "You can rename each type per server, for example Support, Application question, Report or Faction application."],
  ["Mentés után a bot frissíti vagy létrehozza a panelt a kiválasztott csatornában.", "After saving, the bot creates or updates the panel in the selected channel."],
  ["Ide kerül a szerver saját Ügyintézési központ panelje.", "The server's own ticket panel is posted here."],
  ["A privát ticketcsatornákat ebben a Discord-kategóriában hozza létre.", "Private ticket channels are created in this Discord category."],
  ["Ez a rang látja és kezelheti a ticketeket, valamint a moderációt.", "This role can view and manage tickets and moderation."],
  ["A tulajdonos és adminok mellett ez az egy rang léphet be.", "Alongside the owner and admins, this selected role can access the dashboard."],
  ["Ez a rang használhatja a Shift Management panelt.", "This role may use the Shift Management panel."],
  ["A tag ezt kapja az ellenőrzőgomb megnyomásakor.", "Members receive this role after verification."],
  ["Ha nincs kiválasztva, az aktuális csatornába ír.", "If not selected, the bot posts in the current channel."],
  ["Ide kerül az egykattintásos ellenőrzőpanel.", "The one-click verification panel is posted here."],
  ["A legtöbb csillagot kapott üzenetek kiemelt csatornája.", "Destination for the most-starred messages."],
  ["A szünet nem számít bele az aktív szolgálatba.", "Break time is excluded from active duty time."],
  ["A saját profilban és a szolgálati rendszerben látható.", "Shown in member profiles and the shift system."],
  ["A szolgálat a Discord fő vezérlőpaneljéről, gombokkal kezelhető.", "Shifts are controlled with buttons from the main Discord panel."],
  ["Csak Staff adhat hozzá szerverinformációt.", "Only staff can add server knowledge."],
  ["A tag külön engedélye nélkül semmit nem tárol róla.", "Nothing personal is stored without the member's consent."],
  ["Titkos kulcsot ide se írj. Az OPENAI_API_KEY csak a Render Environmentbe kerülhet.", "Never enter secrets here. OPENAI_API_KEY must only be stored in Render Environment."],
  ["A teljes védelem gyanús eseménynél azonnal zárol, megőrzi a csatornák eredeti jogosultságait, és Admin/Vezetőség döntését kéri a biztonsági naplóban.", "On suspicious activity, protection locks the server immediately, preserves original channel permissions and requests an Admin/Management decision in the security log."],
  ["A közepes mód normál közösségi szerverhez ajánlott.", "Medium sensitivity is recommended for normal community servers."],
  ["Ide kerül az azonnali riasztás és a három vezetői döntési gomb. Például: minden-log", "Immediate alerts and management decision buttons are posted here."],
  ["Adaptív észlelés normál és friss fiókokra.", "Adaptive detection for normal and fresh accounts."],
  ["Jogosulatlan műveletnél már az első esemény lezárást indít.", "The first unauthorized action triggers lockdown."],
  ["A bot nem választ automatikusan a kirúgás és kitiltás között. A szerver a döntésig lezárva marad; téves riasztásnál pontosan visszaállítja az eredeti csatornajogosultságokat.", "The bot does not choose between kick and ban automatically. The server remains locked until a decision; false alarms restore the original channel permissions."],
  ["Minden új botot azonnal kirúg a NEXA, ha az ID-je nincs ezen a listán — akkor is, ha ismert vagy biztonságos botnak tűnik. A bot ID-jét még a meghívás előtt add hozzá. A Discord ranglistában a NEXA Bot rangja legyen minden más bot rangja fölött, különben a Discord nem engedi kirúgni a támadó botot.", "NEXA immediately removes every newly added bot whose ID is not listed here, even if it appears trusted. Add its ID before inviting it and keep the NEXA role above all other bot roles."],
  ["Bot nyelve ezen a szerveren", "Bot language on this server"],
  ["/ parancsok nyelve", "/ command language"],
  ["Mindig magyar", "Always Hungarian"],
  ["Alaprendszer", "Core system"],
  ["Modulmátrix", "Module matrix"],
  ["Automod és védelem", "Automod and protection"],
  ["Moderáció", "Moderation"],
  ["Részletes naplózás", "Detailed logging"],
  ["XP és szintrendszer", "XP and levels"],
  ["Közösségi extrák", "Community tools"],
  ["Ötletek, szavazás és bejelentés.", "Suggestions, polls and announcements."],
  ["Szolgálat, szünet, statisztika és napló.", "Duty time, breaks, statistics and logs."],
  ["Nexa AI és memória", "NEXA AI and memory"],
  ["Ideiglenes hangcsatornák", "Temporary voice channels"],
  ["Gombos tagellenőrzés", "Button verification"],
  ["Emlékeztetők", "Reminders"],
  ["Custom Command kezelő", "Custom Command manager"],
  ["Eseményfigyelés", "Event monitoring"],
  ["Külön kapcsolható logok", "Individually configurable logs"],
  ["Üzenettörlés", "Message deletion"],
  ["Üzenetszerkesztés", "Message editing"],
  ["Belépés", "Member join"],
  ["Kilépés", "Member leave"],
  ["Rangváltozás", "Role changes"],
  ["Csatornaváltozás", "Channel changes"],
  ["Voice belépés", "Voice join"],
  ["Voice kilépés", "Voice leave"],
  ["Becenév", "Nickname changes"],
  ["Meghívók", "Invites"],
  ["Külön Ticket Center", "Dedicated Ticket Center"],
  ["Bekapcsolva", "Enabled"],
  ["Kikapcsolva", "Disabled"],
  ["Panelcsatorna", "Panel channel"],
  ["Ticket-kategória", "Ticket category"],
  ["Ügyintéző rang", "Staff role"],
  ["Kiválasztva", "Selected"],
  ["Nincs beállítva", "Not configured"],
  ["Rendszer és útvonalak", "System and routing"],
  ["Általános ticket-rendszer", "General ticket system"],
  ["Ticketpanel csatornája", "Ticket panel channel"],
  ["Létrehozott ticketek kategóriája", "Ticket category"],
  ["Ügyintéző / Staff rang", "Support / Staff role"],
  ["Engedélyezett ticket-típusok", "Enabled ticket types"],
  ["Segítségkérés", "Support request"],
  ["TGF / jelentkezési kérdés", "Application question"],
  ["Tag vagy probléma bejelentése", "Member or issue report"],
  ["Vásárlás vagy számlázás", "Purchase or billing"],
  ["Partnerség és együttműködés", "Partnership"],
  ["Egyéb ügy", "Other request"],
  ["Saját elnevezések", "Custom labels"],
  ["Panel szövege", "Panel text"],
  ["Ügyintézési panel leírása", "Ticket panel description"],
  ["Típusválasztás", "Choose type"],
  ["Privát csatorna", "Private channel"],
  ["Lezárás és HTML transcript", "Close and HTML transcript"],
  ["Útvonalak", "Routing"],
  ["Csatornák és kategóriák", "Channels and categories"],
  ["NexaBot fő vezérlőpanel", "Main NEXA control panel"],
  ["Nexa AI beszélgetőcsatorna", "NEXA AI channel"],
  ["Moderációs napló", "Moderation log"],
  ["Figyelmeztetések", "Warnings"],
  ["Moderációs panel", "Moderation panel"],
  ["Üdvözlőcsatorna", "Welcome channel"],
  ["Búcsúzócsatorna", "Goodbye channel"],
  ["Szintlépési értesítések", "Level-up notifications"],
  ["Ötletek csatornája", "Suggestions channel"],
  ["Szolgálati napló", "Shift log"],
  ["Bejelentések csatornája", "Announcements channel"],
  ["Tagellenőrző panel", "Verification panel"],
  ["Starboard csatorna", "Starboard channel"],
  ["Ideiglenes hangszoba belépő", "Temporary voice lobby"],
  ["Ideiglenes hangszobák kategóriája", "Temporary voice category"],
  ["Jogosultságok", "Permissions"],
  ["Rangok és hozzáférés", "Roles and access"],
  ["Automatikus ember rang", "Automatic human role"],
  ["Automatikus bot rang", "Automatic bot role"],
  ["Webes kezelői rang", "Dashboard manager role"],
  ["Szolgálati rang", "Shift role"],
  ["Ellenőrzött tag rang", "Verified member role"],
  ["Önkiszolgáló rangok", "Self-service roles"],
  ["Legfeljebb 10 rang. Telefonon tartsd nyomva a több kijelöléshez.", "Up to 10 roles. Use Ctrl/Cmd to select multiple roles on desktop."],
  ["Kommunikáció", "Communication"],
  ["Botüzenetek", "Bot messages"],
  ["Üdvözlőszöveg", "Welcome message"],
  ["Búcsúzó szöveg", "Goodbye message"],
  ["Szintlépési szöveg", "Level-up message"],
  ["Használható:", "Available:"],
  ["Aktivitás", "Activity"],
  ["Közösségi rendszer", "Community system"],
  ["XP-időkorlát másodpercben", "XP cooldown in seconds"],
  ["Minimum XP üzenetenként", "Minimum XP per message"],
  ["Maximum XP üzenetenként", "Maximum XP per message"],
  ["Starboard küszöb", "Starboard threshold"],
  ["Ennyi ⭐ reakció után kerül ki az üzenet.", "The message is featured after this many ⭐ reactions."],
  ["Szintjutalom rangok", "Level reward roles"],
  ["Soronként: szint:rangkód. Legfeljebb 25 jutalom.", "One per line: level:role-id. Up to 25 rewards."],
  ["Állománykezelés", "Shift management"],
  ["Szünetek követése", "Track breaks"],
  ["Havi szolgálati ranglista", "Monthly shift leaderboard"],
  ["Intelligens asszisztens", "Intelligent assistant"],
  ["Nexa AI memória", "NEXA AI memory"],
  ["Szerverismeretek tárolása", "Store server knowledge"],
  ["Beleegyezéses személyes memória", "Consent-based personal memory"],
  ["Memóriák száma típusonként", "Memories per type"],
  ["Nexa AI szerverutasítása", "NEXA AI server instruction"],
  ["Megjelenés", "Appearance"],
  ["Saját arculat", "Custom branding"],
  ["Vezérlőpult neve", "Dashboard name"],
  ["Elsődleges szín", "Primary color"],
  ["Kiemelő szín", "Accent color"],
  ["Logó HTTPS-címe", "Logo HTTPS URL"],
  ["Külön Anti-Raid irányítóközpont", "Dedicated Anti-Raid control center"],
  ["Anti-Raid érzékenység", "Anti-Raid sensitivity"],
  ["Szigorú • 5 belépő / 30 mp", "Strict • 5 joins / 30 sec"],
  ["Közepes • 8 belépő / 30 mp", "Medium • 8 joins / 30 sec"],
  ["Enyhe • 15 belépő / 45 mp", "Relaxed • 15 joins / 45 sec"],
  ["Riasztási és döntési csatorna", "Alert and decision channel"],
  ["Anti-Raid whitelist rangok", "Anti-Raid whitelisted roles"],
  ["Anti-Raid whitelist csatornák", "Anti-Raid whitelisted channels"],
  ["Anti-Raid whitelist felhasználói ID-k", "Anti-Raid whitelisted user IDs"],
  ["Egy Discord ID soronként", "One Discord ID per line"],
  ["Azonnal figyelt veszélyek", "Threats monitored immediately"],
  ["Tömeges belépési hullám", "Mass join wave"],
  ["Friss fiókok észlelése", "Fresh account detection"],
  ["Csatorna létrehozás és törlés", "Channel creation and deletion"],
  ["Rang- és jogosultságváltozás", "Role and permission changes"],
  ["Gyanús ban és kick", "Suspicious bans and kicks"],
  ["Webhook létrehozás", "Webhook creation"],
  ["Teljes Anti-Nuke auditvédelem", "Full Anti-Nuke audit protection"],
  ["Azonnali teljes szerverlezárás", "Immediate server lockdown"],
  ["Vezetői döntés után", "After a management decision"],
  ["Gyanús fiókok kirúgása választható", "Optional kick of suspicious accounts"],
  ["Gyanús fiókok kitiltása választható", "Optional ban of suspicious accounts"],
  ["Üzenetvédelem és büntetések", "Message protection and sanctions"],
  ["Tiltott szavak", "Blocked words"],
  ["Üzenetfigyelés", "Message monitoring"],
  ["Külső linkek", "External links"],
  ["Káromkodás / tiltott szavak", "Profanity / blocked words"],
  ["Ismételt üzenetek", "Repeated messages"],
  ["Automatikus üzenetreakciók", "Automatic enforcement"],
  ["Tiltott üzenetek törlése", "Delete prohibited messages"],
  ["Figyelmeztetés", "Warning"],
  ["Ideiglenes felfüggesztés", "Temporary timeout"],
  ["Engedélyezett botok", "Allowed bots"],
  ["Megbízható botok Discord ID-je", "Trusted bot Discord IDs"],
  ["Nincs kiválasztva", "Not selected"],
  ["Aktív modul", "Active modules"],
  ["Csatorna", "Channels"],
  ["Rang", "Roles"],
  ["Tag", "Members"],
  ["AKTÍV", "ACTIVE"],
  ["KIKAPCSOLVA", "DISABLED"],
  ["Modulok", "Modules"]
]);

function localizeControlCenterHtml(html, language = 'en') {
  if (language !== 'en') return html;
  const protectedParts = [];
  let output = String(html).replace(/<textarea\b[\s\S]*?<\/textarea>|\bvalue="[^"]*"/gi, (part) => {
    const key = `__NEXA_PROTECTED_${protectedParts.length}__`;
    protectedParts.push(part);
    return key;
  });
  for (const [hungarian, english] of [...CONTROL_CENTER_ENGLISH].sort((a, b) => b[0].length - a[0].length)) {
    output = output.split(hungarian).join(english);
  }
  return output.replace(/__NEXA_PROTECTED_(\d+)__/g, (_match, index) => protectedParts[Number(index)] || '');
}

function settingsPage(guild, config, session, saved = false, options = {}) {
  const language = (session?.language || 'en') === 'hu' ? 'hu' : 'en';
  const en = language === 'en';
  const validationError = String(options.error || '').trim().slice(0, 700);
  const validationField = String(options.focus || '').trim().slice(0, 100);
  const view = 'control';
  const viewMeta = {
    control: [en ? 'Control Center' : 'Kezelőközpont', en ? 'Every server setting in one clear control center.' : 'Minden szerverbeállítás egyetlen átlátható kezelőfelületen.'],
    overview: ['Overview','Live server health, active modules and configuration status.'],
    moderation: ['Moderation','Moderation controls, staff access and moderation routing.'],
    automod: ['Automod','Message protection, anti-spam and automatic sanctions.'],
    welcome: ['Welcome','Member arrival, goodbye and onboarding configuration.'],
    tickets: ['Ticket Center','Ticket types, staff routing, categories and transcripts.'],
    logs: ['Logs','Event logging, audit destinations and activity coverage.'],
    'reaction-roles': ['Reaction Roles','Role interaction module and related access configuration.'],
    'auto-role': ['Auto Role','Automatic member, bot and verification role assignment.'],
    level: ['Level','XP, level rewards, cooldowns and ranking configuration.'],
    giveaway: ['Giveaway','Giveaway module access and announcement routing.'],
    ai: ['NEXA AI','AI permissions, memory policy and server instructions.'],
    security: ['Security','Anti-Raid, Anti-Nuke, trusted bots and security controls.'],
    stats: ['Server Stats','Server metrics and enabled feature overview.'],
    settings: ['Settings','Language, branding, messages and advanced configuration.']
  }[view];
  const rpEnabled = isBviGuild(guild.id);
  const entitlement = getGuildEntitlement(guild.id);
  const plan = entitlement.plan;
  const textChannels = (selected) => channelOptions(guild, selected, false);
  const categories = (selected) => channelOptions(guild, selected, true);
  const voiceChannels = (selected) => voiceChannelOptions(guild, selected);
  const roles = (selected) => roleOptions(guild, selected);
  const enabledModules = Object.entries(config.modules).filter(([key]) => key !== 'bvi' && moduleEnabled(guild.id, key)).length + (rpEnabled ? 1 : 0);
  const icon = guild.icon
    ? `<img alt="" src="https://cdn.discordapp.com/icons/${escapeHtml(guild.id)}/${escapeHtml(guild.icon)}.png">`
    : `<div class="server-icon">${escapeHtml(guild.name.slice(0, 2).toUpperCase())}</div>`;
  if (guild.id === SUPPORT_GUILD_ID) {
    const supportContent = `<div class="page-head server">${icon}<div class="server-body"><div class="section-kicker">OFFICIAL NEXA OPERATIONS</div><h1>NEXA Support Center <span class="badge ultimate">MANAGED</span></h1><div class="muted">The official NEXA Support server is isolated, owner-managed and restart-safe.</div></div><a class="btn secondary" href="/dashboard">← Szerverek</a></div>${saved ? '<div class="notice">✅ A Support Center automatikus ellenőrzése elkészült.</div>' : ''}<div class="stats"><div class="stat"><div class="stat-value">${guild.memberCount}</div><div class="stat-label">Tag</div></div><div class="stat"><div class="stat-value">ULTIMATE</div><div class="stat-label">Fix csomag</div></div><div class="stat"><div class="stat-value">EN</div><div class="stat-label">Fix nyelv</div></div><div class="stat"><div class="stat-value">SAFE</div><div class="stat-label">Restart audit</div></div></div><section class="card section ticket-center"><div class="section-kicker">NEXA SUPPORT GATEWAY</div><h2 class="section-title">🛰️ Felügyelt Support rendszer</h2><div class="notice">Az első telepítést a botowner kézzel indítja. Render-újraindításkor a NEXA csak olvasási auditot végez, és soha nem hozza létre újra vagy írja felül a rangokat, csatornákat és paneleket. Hiány esetén futtasd kézzel a /support-szerver javitas parancsot.</div><div class="ticket-status-grid"><div><strong>Ticketek</strong><span>✅ Technikai segítség</span></div><div><strong>Ügytípusok</strong><span>✅ Hiba, számlázás, partner</span></div><div><strong>Védelem</strong><span>✅ Anti-Raid + Anti-Nuke</span></div><div><strong>Nyelv</strong><span>✅ Angol alap</span></div></div><div class="ticket-flow"><span>① Indítási audit</span><b>→</b><span>② Kézi owner-javítás</span><b>→</b><span>③ Support Gateway</span><b>→</b><span>④ Napló és transcript</span></div></section><section class="card section"><h2>Fix Support ticket-típusok</h2><div class="module-grid"><div class="switch">🛠️ Technikai segítség</div><div class="switch">🧪 Hibajelentés</div><div class="switch">💳 Előfizetés és számlázás</div><div class="switch">🤝 Partnerség</div><div class="switch">📨 Egyéb NEXA ügy</div></div><p class="help">Ezek kizárólag a hivatalos Support szerveren jelennek meg. A többi szerver saját ticket-típusait a saját Ticket Centerében állíthatja.</p></section>`;
    return layout('NEXA Support Center', localizeControlCenterHtml(supportContent, language), session, config.branding, language);
  }
  const ticketSection = `<section id="tickets" class="card section ticket-center"><div class="section-kicker">NEXA CASE MANAGEMENT</div><h2 class="section-title">🎟️ Külön Ticket Center</h2><div class="notice">Itt egy helyen állítható a teljes általános ticket-rendszer. A hivatalos <strong>NEXA Support Gateway</strong> ettől elkülönül, és kizárólag a <code>${SUPPORT_GUILD_ID}</code> azonosítójú Support szerveren működik.</div><div class="ticket-status-grid"><div><strong>Modul</strong><span>${config.modules.tickets ? '🟢 Bekapcsolva' : '⚫ Kikapcsolva'}</span></div><div><strong>Panelcsatorna</strong><span>${config.channels.ticketPanel ? '✅ Kiválasztva' : '⚠️ Nincs beállítva'}</span></div><div><strong>Ticket-kategória</strong><span>${config.channels.ticketCategory ? '✅ Kiválasztva' : '⚠️ Nincs beállítva'}</span></div><div><strong>Ügyintéző rang</strong><span>${config.roles.staff ? '✅ Kiválasztva' : '⚠️ Nincs beállítva'}</span></div></div><h3>1. Rendszer és útvonalak</h3><div class="module-grid">${moduleCheck(guild.id,"tickets","module_tickets","Általános ticket-rendszer",config.modules.tickets,"Privát ügycsatorna, Staff-kezelés és HTML transcript.")}</div><div class="field-grid">${selectField("channel_ticketPanel","Ticketpanel csatornája",textChannels(config.channels.ticketPanel),"Ide kerül a szerver saját Ügyintézési központ panelje.")}${selectField("channel_ticketCategory","Létrehozott ticketek kategóriája",categories(config.channels.ticketCategory),"A privát ticketcsatornákat ebben a Discord-kategóriában hozza létre.")}${selectField("role_staff","Ügyintéző / Staff rang",roles(config.roles.staff),"Ez a rang látja és kezelheti a ticketeket, valamint a moderációt.")}</div><h3>2. Engedélyezett ticket-típusok</h3><p class="muted">Csak a bejelölt típusok jelennek meg a szerver ügyintézési paneljén.</p><div class="module-grid">${check("ticket_type_support","Segítségkérés",config.tickets.enabledTypes.includes("support"),"Általános segítségkérés.")}${check("ticket_type_application","TGF / jelentkezési kérdés",config.tickets.enabledTypes.includes("application"),"Jelentkezéssel vagy felvétellel kapcsolatos kérdés.")}${check("ticket_type_report","Tag vagy probléma bejelentése",config.tickets.enabledTypes.includes("report"),"Bizalmas bejelentés a Staffnak.")}${check("ticket_type_purchase","Vásárlás vagy számlázás",config.tickets.enabledTypes.includes("purchase"),"Szerverhez kapcsolódó vásárlási ügy.")}${check("ticket_type_partnership","Partnerség és együttműködés",config.tickets.enabledTypes.includes("partnership"),"Partneri megkeresések.")}${check("ticket_type_other","Egyéb ügy",config.tickets.enabledTypes.includes("other"),"Más kategóriába nem tartozó ügy.")}</div><h3>3. Saját elnevezések</h3><p class="muted">A neveket szerverenként átírhatod, például: Segélykérés, TGF kérdés, Panasz vagy Frakciójelentkezés.</p><div class="field-grid">${["support","application","report","purchase","partnership","other"].map((type) => `<div><label for="ticket_label_${type}">${escapeHtml(config.tickets.labels[type])}</label><input id="ticket_label_${type}" name="ticket_label_${type}" maxlength="60" value="${escapeHtml(config.tickets.labels[type])}"></div>`).join("")}</div><h3>4. Panel szövege</h3><div><label for="message_ticket">Ügyintézési panel leírása</label><textarea id="message_ticket" name="message_ticket">${escapeHtml(config.messages.ticket)}</textarea><div class="help">Mentés után a bot frissíti vagy létrehozza a panelt a kiválasztott csatornában.</div></div><div class="ticket-flow"><span>① Típusválasztás</span><b>→</b><span>② Privát csatorna</span><b>→</b><span>③ Staff claim</span><b>→</b><span>④ Lezárás és HTML transcript</span></div></section>`;
  const content = `<div class="guild-settings view-${escapeHtml(view)}" data-dashboard-view="${escapeHtml(view)}"><div class="page-head server">${icon}<div class="server-body"><div class="section-kicker">NEXA COMMAND DECK • ${escapeHtml(viewMeta[0].toUpperCase())}</div><h1>${escapeHtml(guild.name)} <span class="badge ${plan}">${planName(plan)}</span></h1><div class="muted">${escapeHtml(viewMeta[1])}${entitlement.expiresAt ? ` • access until ${escapeHtml(entitlement.expiresAt.toLocaleDateString('en-GB'))}` : ''}</div></div><div class="actions"><a class="btn secondary" href="/dashboard">← Servers</a><a class="btn" href="/billing?guild=${escapeHtml(guild.id)}">Subscription</a></div></div>
<div class="control-ribbon"><div><span class="control-pulse"></span><strong>NEXA CORE</strong><small>LIVE</small></div><div><span>Members</span><strong>${guild.memberCount}</strong></div><div><span>Channels</span><strong>${guild.channels.cache.size}</strong></div><div><span>Roles</span><strong>${guild.roles.cache.size}</strong></div><div><span>Modules</span><strong>${enabledModules}</strong></div><div><span>View</span><strong>${escapeHtml(viewMeta[0])}</strong></div></div>
<div class="stats"><div class="stat"><div class="stat-value">${guild.memberCount}</div><div class="stat-label">Tag</div></div><div class="stat"><div class="stat-value">${guild.channels.cache.size}</div><div class="stat-label">Csatorna</div></div><div class="stat"><div class="stat-value">${guild.roles.cache.size}</div><div class="stat-label">Rang</div></div><div class="stat"><div class="stat-value">${enabledModules}</div><div class="stat-label">Aktív modul</div></div></div>
<div class="grid" style="margin:0 0 20px"><article class="card"><div class="feature-icon">✅</div><div class="section-kicker">IDENTITY GATEWAY</div><h3>Gombos tagellenőrzés</h3><p class="muted">Modern beléptetőpanel automatikus rangkiosztással és auditnaplóval.</p><span class="badge ${config.modules.verification ? 'ultimate' : ''}">${config.modules.verification ? 'AKTÍV' : 'KIKAPCSOLVA'}</span></article><article class="card"><div class="feature-icon">⭐</div><div class="section-kicker">COMMUNITY SIGNAL</div><h3>NEXA Starboard</h3><p class="muted">A közösség legjobb üzenetei automatikusan látványos kiemelést kapnak.</p><span class="badge ${config.modules.starboard ? 'ultimate' : ''}">${config.modules.starboard ? 'AKTÍV' : 'KIKAPCSOLVA'}</span></article><article class="card"><div class="feature-icon">⏰</div><div class="section-kicker">PERSISTENT JOBS</div><h3>Okos emlékeztetők</h3><p class="muted">PostgreSQL-alapú értesítések, amelyek újraindítás után is megmaradnak.</p><span class="badge ${config.modules.reminders ? 'ultimate' : ''}">${config.modules.reminders ? 'AKTÍV' : 'KIKAPCSOLVA'}</span></article></div>
${saved ? '<div class="notice">✅ The NEXA Bot settings and selected panels have been updated.</div>' : ''}${validationError ? `<div class="notice error"><strong>⚠️ The settings were not saved.</strong><br>${escapeHtml(validationError)}${validationField ? `<br><span class="muted">The page kept your changes and highlighted the field that needs attention.</span>` : ''}</div>` : ''}${!isPersistentStore() ? '<div class="notice warn">⚠️ Az adatbázis még nincs beállítva, ezért az AI-memória, XP, emlékeztetők és szolgálati statisztika újraindításkor elveszhet.</div>' : ''}${rpEnabled ? '<div class="notice">🎭 <strong>Owner RP aktív ezen a szerveren.</strong> Discordon a /telepites paranccsal a teljes alap RP-rendszer, a /dokumentum-panelek paranccsal pedig kizárólag a meglévő csatornák dokumentumpaneljei telepíthetők.</div>' : ''}
<form method="post" action="/dashboard/guild/${escapeHtml(guild.id)}" data-smart-settings data-persist-draft data-focus-field="${escapeHtml(validationField)}"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="dashboard_view" value="${escapeHtml(view)}"><nav class="settings-jump"><a href="#modules">Modulok</a><a href="#tickets">Ticket Center</a><a href="#channels">Csatornák</a><a href="#roles">Rangok</a><a href="#anti-raid">Anti-Raid</a><a href="#protection">Automod</a></nav><div class="settings">
<section id="modules" class="card section"><div class="section-kicker">Alaprendszer • ${planName(plan)}</div><h2 class="section-title">⬡ Modulmátrix</h2><div class="field-grid"><div><label for="language">Bot nyelve ezen a szerveren</label><select id="language" name="language">${option('en','English (default)',config.language)}${option('hu','Magyar',config.language)}</select><div class="help">A panelek és a Discord-válaszok a kiválasztott nyelven jelennek meg.</div></div><div><label for="commandLanguage">/ parancsok nyelve</label><select id="commandLanguage" name="commandLanguage">${option("auto","Automatikus • a Discord nyelve alapján",config.commandLanguage)}${option("hu","Mindig magyar",config.commandLanguage)}${option("en","Always English",config.commandLanguage)}</select><div class="help">Mentés után az adott szerveren frissülnek a slash parancsnevek.</div></div></div><div class="module-grid">${moduleCheck(guild.id,'protection','module_protection','Automod és védelem',config.modules.protection,'Spam-, link- és tartalomvédelem. Anti-Nuke és raid csak Ultimate csomagban.')}${moduleCheck(guild.id,'moderation','module_moderation','Moderáció',config.modules.moderation,'Case ID és tagválasztós moderációs panel.')}${moduleCheck(guild.id,'logging','module_logging','Részletes naplózás',config.modules.logging)}${moduleCheck(guild.id,'welcome','module_welcome','Welcome és Auto Role',config.modules.welcome)}${moduleCheck(guild.id,'levels','module_levels','XP és szintrendszer',config.modules.levels)}${moduleCheck(guild.id,'reactionRoles','module_reactionRoles','Button / Reaction Role',config.modules.reactionRoles)}${moduleCheck(guild.id,'customCommands','module_customCommands','Custom Commands',config.modules.customCommands)}${moduleCheck(guild.id,'giveaways','module_giveaways','Giveaway',config.modules.giveaways)}${moduleCheck(guild.id,'suggestions','module_suggestions','Közösségi extrák',config.modules.suggestions,'Ötletek, szavazás és bejelentés.')}${moduleCheck(guild.id,'shift','module_shift','Shift Management',config.modules.shift,'Szolgálat, szünet, statisztika és napló.')}${moduleCheck(guild.id,'ai','module_ai','Nexa AI és memória',config.modules.ai,'Csak Owner által engedélyezett felhasználók használhatják.')}${moduleCheck(guild.id,'tempVoice','module_tempVoice','Ideiglenes hangcsatornák',config.modules.tempVoice)}${moduleCheck(guild.id,'verification','module_verification','Gombos tagellenőrzés',config.modules.verification,'Egy kattintással adja az ellenőrzött tag rangot.')}${moduleCheck(guild.id,'starboard','module_starboard','Starboard',config.modules.starboard,'A legtöbb csillagot kapott üzenetek automatikus kiemelése.')}${moduleCheck(guild.id,'reminders','module_reminders','Emlékeztetők',config.modules.reminders,'Adatbázisos személyes emlékeztetők.')}</div><div class="actions"><a class="btn secondary" href="/dashboard/guild/${escapeHtml(guild.id)}/commands">Custom Command kezelő →</a></div></section>

<section id="logs" class="card section"><div class="section-kicker">Eseményfigyelés</div><h2 class="section-title">📋 Külön kapcsolható logok</h2><div class="module-grid">${check('log_messageDelete','Üzenettörlés',config.logging.messageDelete)}${check('log_messageEdit','Üzenetszerkesztés',config.logging.messageEdit)}${check('log_memberJoin','Belépés',config.logging.memberJoin)}${check('log_memberLeave','Kilépés',config.logging.memberLeave)}${check('log_ban','Ban / unban',config.logging.ban)}${check('log_timeout','Timeout',config.logging.timeout)}${check('log_roleUpdate','Rangváltozás',config.logging.roleUpdate)}${check('log_channelUpdate','Csatornaváltozás',config.logging.channelUpdate)}${check('log_voiceJoin','Voice belépés',config.logging.voiceJoin)}${check('log_voiceLeave','Voice kilépés',config.logging.voiceLeave)}${check('log_nicknameChange','Becenév',config.logging.nicknameChange)}${check('log_invite','Meghívók',config.logging.invite)}${check('log_moderation','Moderáció',config.logging.moderation)}${check('log_automod','Automod',config.logging.automod)}${check('log_security','Security',config.logging.security)}</div></section>

${ticketSection}<section id="channels" class="card section"><div class="section-kicker">Útvonalak</div><h2 class="section-title"># Csatornák és kategóriák</h2><div class="field-grid">${selectField('channel_controlCenter','NexaBot fő vezérlőpanel',textChannels(config.channels.controlCenter),'Ide kerül a teljes gombos Discord-panel.')}${selectField('channel_ai','Nexa AI beszélgetőcsatorna',textChannels(config.channels.ai),'Itt minden nem-bot üzenetre válaszol a Nexa AI.')}${selectField('channel_logs','Moderációs napló',textChannels(config.channels.logs))}${selectField('channel_warnings','Figyelmeztetések',textChannels(config.channels.warnings))}${selectField('channel_moderationPanel','Moderációs panel',textChannels(config.channels.moderationPanel))}${selectField('channel_welcome','Üdvözlőcsatorna',textChannels(config.channels.welcome))}${selectField('channel_goodbye','Búcsúzócsatorna',textChannels(config.channels.goodbye))}${selectField('channel_levels','Szintlépési értesítések',textChannels(config.channels.levels),'Ha nincs kiválasztva, az aktuális csatornába ír.')}${selectField('channel_suggestions','Ötletek csatornája',textChannels(config.channels.suggestions))}${selectField('channel_shiftLogs','Szolgálati napló',textChannels(config.channels.shiftLogs))}${selectField('channel_announcements','Bejelentések csatornája',textChannels(config.channels.announcements))}${selectField('channel_verification','Tagellenőrző panel',textChannels(config.channels.verification),'Ide kerül az egykattintásos ellenőrzőpanel.')}${selectField('channel_starboard','Starboard csatorna',textChannels(config.channels.starboard),'A legtöbb csillagot kapott üzenetek kiemelt csatornája.')}${selectField('channel_tempVoiceLobby','Ideiglenes hangszoba belépő',voiceChannels(config.channels.tempVoiceLobby))}${selectField('channel_tempVoiceCategory','Ideiglenes hangszobák kategóriája',categories(config.channels.tempVoiceCategory))}</div></section>

<section id="roles" class="card section"><div class="section-kicker">Jogosultságok</div><h2 class="section-title">◇ Rangok és hozzáférés</h2><div class="field-grid">${selectField('role_human','Automatikus ember rang',roles(config.roles.human || config.roles.auto))}${selectField('role_bot','Automatikus bot rang',roles(config.roles.bot))}${selectField('role_dashboard','Webes kezelői rang',roles(config.roles.dashboard),'A tulajdonos és adminok mellett ez az egy rang léphet be.')}${selectField('role_shift','Szolgálati rang',roles(config.roles.shift),'Ez a rang használhatja a Shift Management panelt.')}${selectField('role_verified','Ellenőrzött tag rang',roles(config.roles.verified),'A tag ezt kapja az ellenőrzőgomb megnyomásakor.')}<div><label for="role_selfRoles">Önkiszolgáló rangok</label><select id="role_selfRoles" name="role_selfRoles" multiple size="7">${roleOptionsMulti(guild, config.community.selfRoles)}</select><div class="help">Legfeljebb 10 rang. Telefonon tartsd nyomva a több kijelöléshez.</div></div></div></section>

<section id="messages" class="card section"><div class="section-kicker">Kommunikáció</div><h2 class="section-title">💬 Botüzenetek</h2><div class="field-grid"><div><label for="message_welcome">Üdvözlőszöveg</label><textarea id="message_welcome" name="message_welcome">${escapeHtml(config.messages.welcome)}</textarea><div class="help">Használható: {tag}, {username}, {server}, {memberCount}</div></div><div><label for="message_goodbye">Búcsúzó szöveg</label><textarea id="message_goodbye" name="message_goodbye">${escapeHtml(config.messages.goodbye)}</textarea></div><div><label for="message_levelUp">Szintlépési szöveg</label><textarea id="message_levelUp" name="message_levelUp">${escapeHtml(config.messages.levelUp)}</textarea><div class="help">Használható: {tag}, {level}, {server}</div></div></div></section>

<section id="community" class="card section"><div class="section-kicker">Aktivitás</div><h2 class="section-title">★ Közösségi rendszer</h2><div class="field-grid"><div><label for="community_xpCooldownSeconds">XP-időkorlát másodpercben</label><input id="community_xpCooldownSeconds" name="community_xpCooldownSeconds" type="number" min="15" max="300" value="${config.community.xpCooldownSeconds}"></div><div><label for="community_xpMin">Minimum XP üzenetenként</label><input id="community_xpMin" name="community_xpMin" type="number" min="1" max="50" value="${config.community.xpMin}"></div><div><label for="community_xpMax">Maximum XP üzenetenként</label><input id="community_xpMax" name="community_xpMax" type="number" min="1" max="100" value="${config.community.xpMax}"></div><div><label for="community_starboardThreshold">Starboard küszöb</label><input id="community_starboardThreshold" name="community_starboardThreshold" type="number" min="2" max="25" value="${config.community.starboardThreshold}"><div class="help">Ennyi ⭐ reakció után kerül ki az üzenet.</div></div><div><label>Szintjutalom rangok</label><textarea name="community_rewardRoles" placeholder="5:123456789012345678">${escapeHtml(config.community.rewardRoles.map((item) => `${item.level}:${item.roleId}`).join('\n'))}</textarea><div class="help">Soronként: szint:rangkód. Legfeljebb 25 jutalom.</div></div></div></section>

<section id="shift" class="card section"><div class="section-kicker">Állománykezelés</div><h2 class="section-title">◷ Shift Management</h2><div class="module-grid">${check('shift_trackBreaks','Szünetek követése',config.shift.trackBreaks,'A szünet nem számít bele az aktív szolgálatba.')}${check('shift_showLeaderboard','Havi szolgálati ranglista',config.shift.showLeaderboard,'A saját profilban és a szolgálati rendszerben látható.')}</div><div class="help">A szolgálat a Discord fő vezérlőpaneljéről, gombokkal kezelhető.</div></section>

<section id="ai" class="card section"><div class="section-kicker">Intelligens asszisztens</div><h2 class="section-title">✦ Nexa AI memória</h2><div class="module-grid">${check('ai_serverMemory','Szerverismeretek tárolása',config.ai.serverMemory,'Csak Staff adhat hozzá szerverinformációt.')}${check('ai_personalMemory','Beleegyezéses személyes memória',config.ai.personalMemory,'A tag külön engedélye nélkül semmit nem tárol róla.')}</div><div class="field-grid"><div><label for="ai_maxMemories">Memóriák száma típusonként</label><input id="ai_maxMemories" name="ai_maxMemories" type="number" min="5" max="100" value="${config.ai.maxMemories}"></div><div><label for="ai_systemPrompt">Nexa AI szerverutasítása</label><textarea id="ai_systemPrompt" name="ai_systemPrompt">${escapeHtml(config.ai.systemPrompt)}</textarea><div class="help">Titkos kulcsot ide se írj. Az OPENAI_API_KEY csak a Render Environmentbe kerülhet.</div></div></div></section>

<section id="branding" class="card section"><div class="section-kicker">Megjelenés</div><h2 class="section-title">◈ Saját arculat</h2><div class="field-grid"><div><label for="branding_title">Vezérlőpult neve</label><input id="branding_title" name="branding_title" type="text" maxlength="60" value="${escapeHtml(config.branding.title)}"></div><div><label for="branding_primary">Elsődleges szín</label><input id="branding_primary" name="branding_primary" type="color" value="${escapeHtml(config.branding.primary)}"></div><div><label for="branding_accent">Kiemelő szín</label><input id="branding_accent" name="branding_accent" type="color" value="${escapeHtml(config.branding.accent)}"></div><div><label for="branding_logoUrl">Logó HTTPS-címe</label><input id="branding_logoUrl" name="branding_logoUrl" type="url" maxlength="500" placeholder="https://…" value="${escapeHtml(config.branding.logoUrl)}"></div></div></section>

<section id="anti-raid" class="card section"><div class="section-kicker">NEXA SHIELD • ULTIMATE</div><h2 class="section-title">🚨 Külön Anti-Raid irányítóközpont</h2><div class="notice">A teljes védelem gyanús eseménynél azonnal zárol, megőrzi a csatornák eredeti jogosultságait, és Admin/Vezetőség döntését kéri a biztonsági naplóban.</div><div class="field-grid"><div><label for="protection_sensitivity">Anti-Raid érzékenység</label><select id="protection_sensitivity" name="protection_sensitivity">${option('strict','Szigorú • 5 belépő / 30 mp',config.protection.sensitivity)}${option('medium','Közepes • 8 belépő / 30 mp',config.protection.sensitivity)}${option('relaxed','Enyhe • 15 belépő / 45 mp',config.protection.sensitivity)}</select><div class="help">A közepes mód normál közösségi szerverhez ajánlott.</div></div>${selectField('raid_securityLogs','Riasztási és döntési csatorna',textChannels(config.channels.securityLogs),'Ide kerül az azonnali riasztás és a három vezetői döntési gomb. Például: minden-log')}<div><label>Anti-Raid whitelist rangok</label><select name="protection_whitelistRoles" multiple size="6">${roleOptionsMulti(guild, config.protection.whitelistRoles)}</select></div><div><label>Anti-Raid whitelist csatornák</label><select name="protection_whitelistChannels" multiple size="6">${channelOptionsMulti(guild, config.protection.whitelistChannels)}</select></div><div><label>Anti-Raid whitelist felhasználói ID-k</label><textarea name="protection_whitelistUsers" placeholder="Egy Discord ID soronként">${escapeHtml(config.protection.whitelistUsers.join('\n'))}</textarea></div></div><h3>Azonnal figyelt veszélyek</h3><div class="module-grid">${featureCheck(guild.id,'ultimate','protection_raidDetection','Tömeges belépési hullám',config.protection.raidDetection,'Adaptív észlelés normál és friss fiókokra.')}${featureCheck(guild.id,'ultimate','protection_freshAccounts','Friss fiókok észlelése',config.protection.freshAccounts)}${featureCheck(guild.id,'ultimate','protection_channelGuard','Csatorna létrehozás és törlés',config.protection.channelGuard,'Jogosulatlan műveletnél már az első esemény lezárást indít.')}${featureCheck(guild.id,'ultimate','protection_roleGuard','Rang- és jogosultságváltozás',config.protection.roleGuard)}${featureCheck(guild.id,'ultimate','protection_moderationGuard','Gyanús ban és kick',config.protection.moderationGuard)}${featureCheck(guild.id,'ultimate','protection_webhookGuard','Webhook létrehozás',config.protection.webhookGuard)}${featureCheck(guild.id,'ultimate','protection_antiNuke','Teljes Anti-Nuke auditvédelem',config.protection.antiNuke)}${featureCheck(guild.id,'ultimate','protection_lockdown','Azonnali teljes szerverlezárás',config.protection.lockdown)}</div><h3>Vezetői döntés után</h3><div class="module-grid">${check('protection_kick','Gyanús fiókok kirúgása választható',config.protection.kick)}${check('protection_ban','Gyanús fiókok kitiltása választható',config.protection.ban)}</div><div class="help">A bot nem választ automatikusan a kirúgás és kitiltás között. A szerver a döntésig lezárva marad; téves riasztásnál pontosan visszaállítja az eredeti csatornajogosultságokat.</div></section>

<section id="protection" class="card section"><div class="section-kicker">AUTOMOD</div><h2 class="section-title">⬢ Üzenetvédelem és büntetések</h2><div class="field-grid"><div><label>Tiltott szavak</label><textarea name="protection_blockedWords" placeholder="szó1, szó2, szó3">${escapeHtml(config.protection.blockedWords.join(', '))}</textarea></div></div><h3>Üzenetfigyelés</h3><div class="module-grid">${check('protection_spam','Spam és flood',config.protection.spam)}${check('protection_massMention','Mass mention',config.protection.massMention)}${check('protection_invites','Discord invite',config.protection.invites)}${check('protection_links','Külső linkek',config.protection.links)}${check('protection_scamLinks','Scam linkek',config.protection.scamLinks)}${check('protection_badWords','Káromkodás / tiltott szavak',config.protection.badWords)}${check('protection_capsSpam','Caps spam',config.protection.capsSpam)}${check('protection_emojiSpam','Emoji spam',config.protection.emojiSpam)}${check('protection_repeatedMessage','Ismételt üzenetek',config.protection.repeatedMessage)}</div><h3>Automatikus üzenetreakciók</h3><div class="module-grid">${check('protection_deleteMessages','Tiltott üzenetek törlése',config.protection.deleteMessages)}${check('protection_warn','Figyelmeztetés',config.protection.warn)}${check('protection_timeout','Ideiglenes felfüggesztés',config.protection.timeout)}</div></section>

<section id="bot-guard" class="card section"><div class="section-kicker">NEXA BOT-GUARD</div><h2 class="section-title">🤖 Engedélyezett botok</h2><div class="notice warn">Minden új botot azonnal kirúg a NEXA, ha az ID-je nincs ezen a listán — akkor is, ha ismert vagy biztonságos botnak tűnik. A bot ID-jét még a meghívás előtt add hozzá. A Discord ranglistában a NEXA Bot rangja legyen minden más bot rangja fölött, különben a Discord nem engedi kirúgni a támadó botot.</div><div><label for="protection_trustedBots">Megbízható botok Discord ID-je</label><textarea id="protection_trustedBots" name="protection_trustedBots" placeholder="Egy bot ID soronként">${escapeHtml(config.protection.trustedBots.join('\n'))}</textarea></div></section>

<div class="savebar"><span class="muted">Changes are applied to Discord immediately after a successful save.</span><span class="draft-state" data-draft-state>Saved configuration</span><button class="btn green" type="submit">✓ Save changes</button></div></div></form></div>`;
  return layout(`${viewMeta[0]} • ${guild.name}`, localizeControlCenterHtml(content, language), session, config.branding, language);
}

async function customCommandsPage(guild, session, saved = false) {
  const en = (session?.language || 'en') !== 'hu';
  const commands = await guildCommands(guild.id, true);
  const cards = commands.length ? commands.map((command) => `<article class="card"><h3>!${escapeHtml(command.name)}</h3><p class="muted">${escapeHtml(command.response_type)} • ${escapeHtml(command.response?.title || (en ? 'text response' : 'szöveges válasz'))}</p><p>${escapeHtml(String(command.response?.content || '').slice(0, 260))}</p><form method="post" action="/dashboard/guild/${guild.id}/commands/delete"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><input type="hidden" name="name" value="${escapeHtml(command.name)}"><button class="btn secondary" type="submit">${en ? 'Delete' : 'Törlés'}</button></form></article>`).join('') : `<div class="notice warn">${en ? 'No custom commands have been created yet.' : 'Még nincs saját parancs.'}</div>`;
  return layout('Custom Commands', `<div class="page-head"><div><div class="section-kicker">${escapeHtml(guild.name)}</div><h1>Custom Commands</h1><p class="muted">${en ? 'Create safe custom !commands with text, embed or link-button responses.' : 'Saját !parancsok biztonságos szöveges, embed vagy linkgombos válasszal.'}</p></div><a class="btn secondary" href="/dashboard/guild/${guild.id}">← ${en ? 'Settings' : 'Beállítások'}</a></div>${saved ? `<div class="notice">✅ ${en ? 'Command saved.' : 'A parancs mentve.'}</div>` : ''}<section class="card section"><h2>${en ? 'Create or update a command' : 'Parancs létrehozása vagy módosítása'}</h2><form method="post" action="/dashboard/guild/${guild.id}/commands"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>${en ? 'Command name' : 'Parancs neve'}</label><input type="text" name="name" placeholder="rules" maxlength="32" required></div><div><label>${en ? 'Response type' : 'Válasz típusa'}</label><select name="type"><option value="text">${en ? 'Text' : 'Szöveg'}</option><option value="embed">Embed</option><option value="button">${en ? 'Link button' : 'Linkgomb'}</option></select></div><div><label>${en ? 'Embed title' : 'Embed címe'}</label><input type="text" name="title" maxlength="200"></div><div><label>${en ? 'Response' : 'Válasz'}</label><textarea name="content" maxlength="1900" required></textarea></div><div><label>${en ? 'Button label' : 'Gomb felirata'}</label><input type="text" name="button_label" maxlength="80" placeholder="${en ? 'Open website' : 'Weboldal megnyitása'}"></div><div><label>${en ? 'Button HTTPS URL' : 'Gomb HTTPS-linkje'}</label><input type="url" name="button_url" maxlength="500" placeholder="https://example.com"></div></div><button class="btn green" type="submit">${en ? 'Save' : 'Mentés'}</button></form></section><div class="grid">${cards}</div>`, session, getGuildConfig(guild.id).branding, en ? 'en' : 'hu');
}

async function webSupportPage(session, notice = '') {
  const en = (session?.language || 'en') !== 'hu';
  const tickets = await listWebTickets(session.user.id);
  const statusText = (status) => en ? ({ open: 'OPEN', pending: 'PENDING', closed: 'CLOSED' }[status] || String(status).toUpperCase()) : ({ open: 'NYITOTT', pending: 'VÁRAKOZIK', closed: 'LEZÁRT' }[status] || String(status).toUpperCase());
  const rows = tickets.length ? tickets.map((ticket) => `<a class="record" href="/support/${ticket.id}" style="text-decoration:none"><div><strong>#${ticket.id} • ${escapeHtml(ticket.subject)}</strong><div class="muted">${escapeHtml(ticket.category)} • ${escapeHtml(new Date(ticket.updated_at).toLocaleString(en ? 'en-GB' : 'hu-HU'))}</div></div><span class="badge ${ticket.status === 'open' ? 'ultimate' : ''}">${statusText(ticket.status)}</span></a>`).join('') : `<div class="notice warn">${en ? 'You have no web support tickets yet.' : 'Még nincs webes segítségkérésed.'}</div>`;
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA 20.3.1 • SUPPORT OPERATIONS</div><h1>${en ? 'Support Center' : 'Segítségkérés'}</h1><p class="muted">${en ? 'Your request opens a private ticket on the official NEXA Support server. Replies and status changes appear here automatically.' : 'A kérésedből privát ticket nyílik a hivatalos NEXA Support szerveren. A válaszokat és állapotváltozásokat itt automatikusan követheted.'}</p></div><a class="btn secondary" href="/dashboard">← Dashboard</a></div>${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ''}<div class="grid"><section class="card section"><h2>${en ? 'New support request' : 'Új segítségkérés'}</h2><form method="post" action="/support"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>${en ? 'Subject' : 'Téma'}</label><input type="text" name="subject" maxlength="100" required placeholder="${en ? 'What do you need help with?' : 'Miben kérsz segítséget?'}"></div><div><label>${en ? 'Category' : 'Kategória'}</label><select name="category"><option value="technical">${en ? 'Technical support' : 'Technikai segítség'}</option><option value="bug">${en ? 'Bug report' : 'Hibajelentés'}</option><option value="billing">${en ? 'Subscription / billing' : 'Előfizetés / számlázás'}</option><option value="partnership">${en ? 'Partnership' : 'Partnerség'}</option><option value="other">${en ? 'Other' : 'Egyéb'}</option></select></div><div><label>${en ? 'Priority' : 'Prioritás'}</label><select name="priority"><option value="low">${en ? 'Low' : 'Alacsony'}</option><option value="normal" selected>${en ? 'Normal' : 'Normál'}</option><option value="high">${en ? 'High' : 'Magas'}</option><option value="urgent">${en ? 'Urgent' : 'Sürgős'}</option></select></div></div><label>${en ? 'Message' : 'Üzenet'}</label><textarea name="content" maxlength="4000" required placeholder="${en ? 'Describe the problem in detail…' : 'Írd le pontosan a problémát…'}"></textarea><button class="btn green" type="submit">${en ? 'Open ticket' : 'Ticket megnyitása'}</button></form></section><section class="card section"><h2>${en ? 'My previous tickets' : 'Korábbi ügyeim'}</h2><div class="record-list">${rows}</div></section></div>`;
  return layout(en ? 'Web Support' : 'Webes segítség', content, session, null);
}

async function webSupportTicketPage(ticketData, session) {
  const { ticket, messages } = ticketData;
  const en = (session?.language || 'en') !== 'hu';
  const sourceText = (message) => message.internal ? (en ? 'INTERNAL NOTE' : 'BELSŐ JEGYZET') : message.source === 'discord' ? 'NEXA SUPPORT' : message.source === 'system' ? (en ? 'SYSTEM' : 'RENDSZER') : (en ? 'YOU • WEB' : 'TE • WEB');
  const messageHtml = messages.map((message) => `<article class="card support-message"><div class="section-kicker">${sourceText(message)}</div><strong>${escapeHtml(message.author_name || 'NEXA')}</strong><p>${escapeHtml(message.content).replaceAll('\n', '<br>')}</p><div class="muted">${escapeHtml(new Date(message.created_at).toLocaleString(en ? 'en-GB' : 'hu-HU'))}</div></article>`).join('');
  const rating = ticket.status === 'closed' && !ticket.rating ? `<section class="card section" style="margin-top:18px"><h2>${en ? 'Rate your support experience' : 'Értékeld az ügyintézést'}</h2><form method="post" action="/support/${ticket.id}/rate"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>${en ? 'Rating' : 'Értékelés'}</label><select name="rating"><option value="5">5 • ${en ? 'Excellent' : 'Kiváló'}</option><option value="4">4 • ${en ? 'Good' : 'Jó'}</option><option value="3">3 • ${en ? 'Okay' : 'Rendben'}</option><option value="2">2 • ${en ? 'Poor' : 'Gyenge'}</option><option value="1">1 • ${en ? 'Bad' : 'Rossz'}</option></select></div><div><label>${en ? 'Comment' : 'Megjegyzés'}</label><textarea name="comment" maxlength="1000"></textarea></div></div><button class="btn green" type="submit">${en ? 'Submit rating' : 'Értékelés elküldése'}</button></form></section>` : '';
  const statusText = en ? ticket.status : ({ open: 'nyitott', pending: 'várakozik', closed: 'lezárt' }[ticket.status] || ticket.status);
  const content = `<div data-live-support data-ticket-id="${ticket.id}" data-ticket-status="${escapeHtml(ticket.status)}"><div class="page-head"><div><div class="section-kicker">WEB SUPPORT #${ticket.id} • ${escapeHtml(String(ticket.priority || 'normal').toUpperCase())}</div><h1>${escapeHtml(ticket.subject)}</h1><p class="muted">${en ? 'Status' : 'Állapot'}: <strong data-support-status>${escapeHtml(statusText)}</strong> • ${en ? 'Agent' : 'Ügyintéző'}: <strong data-support-assignee>${escapeHtml(ticket.assigned_name || (en ? 'Unassigned' : 'Nincs kijelölve'))}</strong> • <span class="live-sync" data-live-sync>${en ? 'CONNECTING' : 'KAPCSOLÓDÁS'}</span></p></div><a class="btn secondary" href="/support">← ${en ? 'My tickets' : 'Jegyeim'}</a></div><div class="record-list" data-support-messages data-count="${messages.length}">${messageHtml || `<div class="notice">${en ? 'No messages yet.' : 'Még nincs üzenet.'}</div>`}</div><section class="card section support-composer" data-support-composer style="margin-top:18px"${ticket.status === 'closed' ? ' hidden' : ''}><h2>${en ? 'Send a reply' : 'Válasz küldése'}</h2><form method="post" action="/support/${ticket.id}/reply"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><textarea name="content" maxlength="4000" required placeholder="${en ? 'Write your reply…' : 'Írd meg a válaszod…'}"></textarea><button class="btn green" type="submit">${en ? 'Send reply to NEXA Support' : 'Válasz küldése a NEXA Supportnak'}</button></form></section><div class="notice warn support-closed" data-support-closed${ticket.status === 'closed' ? '' : ' hidden'}>${en ? 'This ticket is closed. Reopen it from Discord or Support Operations to continue.' : 'Ez a ticket le van zárva. A folytatáshoz nyisd újra Discordról vagy a Support Operations felületén.'}${ticket.rating ? ` ${en ? 'Your rating' : 'Értékelésed'}: ${Number(ticket.rating)}/5.` : ''}</div>${rating}</div>`;
  return layout(`Support #${ticket.id}`, content, session, null);
}

async function ownerSupportPage(session, url) {
  const tickets = await listAllWebTickets({ status: url.searchParams.get('status') || '', priority: url.searchParams.get('priority') || '', search: url.searchParams.get('q') || '' });
  const counts = tickets.reduce((acc, ticket) => { acc[ticket.status] = (acc[ticket.status] || 0) + 1; return acc; }, {});
  const rows = tickets.map((ticket) => `<a class="record" href="/owner/support/${ticket.id}" style="text-decoration:none"><div><strong>#${ticket.id} • ${escapeHtml(ticket.subject)}</strong><div class="muted">${escapeHtml(ticket.username)} • ${escapeHtml(ticket.category)}</div></div><div><span class="badge ${ticket.priority === 'urgent' ? 'pro' : ''}">${escapeHtml(String(ticket.priority).toUpperCase())}</span></div><div>${escapeHtml(ticket.assigned_name || 'Nincs felelős')}</div><div>${escapeHtml(new Date(ticket.updated_at).toLocaleString('hu-HU'))}</div><span class="badge ${ticket.status === 'open' ? 'ultimate' : ''}">${escapeHtml(String(ticket.status).toUpperCase())}</span></a>`).join('') || '<div class="notice warn">Nincs találat.</div>';
  const content = `<div class="page-head"><div><div class="section-kicker">NEXA 20.3.1 • OWNER SUPPORT OPERATIONS</div><h1>Support irányítóközpont</h1><p class="muted">Prioritás, felelős, állapot, belső jegyzet és ügyfélelégedettség egy helyen.</p></div><a class="btn secondary" href="/owner">← Owner Center</a></div>${supportModerationControl(session, escapeHtml)}<div class="stats"><div class="stat"><div class="stat-value">${tickets.length}</div><div class="stat-label">Találat</div></div><div class="stat"><div class="stat-value">${counts.open || 0}</div><div class="stat-label">Nyitott</div></div><div class="stat"><div class="stat-value">${counts.pending || 0}</div><div class="stat-label">Várakozik</div></div><div class="stat"><div class="stat-value">${counts.closed || 0}</div><div class="stat-label">Lezárt</div></div></div><form class="owner-search" method="get" action="/owner/support"><input type="search" name="q" placeholder="Ticket, felhasználó vagy téma"><select name="status"><option value="">Minden állapot</option><option value="open">Nyitott</option><option value="pending">Várakozik</option><option value="closed">Lezárt</option></select><select name="priority"><option value="">Minden prioritás</option><option value="urgent">Sürgős</option><option value="high">Magas</option><option value="normal">Normál</option><option value="low">Alacsony</option></select><button class="btn" type="submit">Szűrés</button></form><div class="record-list">${rows}</div>`;
  return layout('Owner Support Operations', content, session, null);
}

async function ownerSupportTicketPage(ticketData, session) {
  const { ticket, messages } = ticketData;
  const messagesHtml = messages.map((message) => `<article class="card support-message" style="border-color:${message.internal ? 'rgba(255,202,100,.35)' : 'var(--line)'}"><div class="section-kicker">${message.internal ? 'INTERNAL NOTE' : escapeHtml(String(message.source || 'system').toUpperCase())}</div><strong>${escapeHtml(message.author_name || 'NEXA')}</strong><p>${escapeHtml(message.content).replaceAll('\n','<br>')}</p><div class="muted">${escapeHtml(new Date(message.created_at).toLocaleString())}</div></article>`).join('');
  const content = `<div data-live-support data-ticket-id="${ticket.id}" data-ticket-status="${escapeHtml(ticket.status)}"><div class="page-head"><div><div class="section-kicker">SUPPORT OPERATIONS • #${ticket.id}</div><h1>${escapeHtml(ticket.subject)}</h1><p class="muted">${escapeHtml(ticket.username)} (${escapeHtml(ticket.user_id)}) • ${escapeHtml(ticket.category)} • Status: <strong data-support-status>${escapeHtml(ticket.status)}</strong> • Agent: <strong data-support-assignee>${escapeHtml(ticket.assigned_name || 'Unassigned')}</strong> • <span class="live-sync" data-live-sync>CONNECTING</span></p></div><a class="btn secondary" href="/owner/support">← Support queue</a></div><div class="grid"><section class="card section"><h2>Ticket controls</h2><form method="post" action="/owner/support/${ticket.id}/manage"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><div class="field-grid"><div><label>Priority</label><select name="value"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><button class="btn secondary small" name="action" value="priority">Save priority</button></div><div><label>Status</label><select name="status_value"><option value="open"${ticket.status === 'open' ? ' selected' : ''}>Open</option><option value="pending"${ticket.status === 'pending' ? ' selected' : ''}>Pending</option><option value="closed"${ticket.status === 'closed' ? ' selected' : ''}>Closed</option></select><button class="btn secondary small" name="action" value="status">Save status</button></div></div><div class="actions"><button class="btn green" name="action" value="claim">Claim ticket</button><button class="btn secondary" name="action" value="unclaim">Unassign</button></div></form></section><section class="card section"><h2>Internal note</h2><form method="post" action="/owner/support/${ticket.id}/note"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><textarea name="content" maxlength="4000" required placeholder="The customer cannot see this note."></textarea><button class="btn" type="submit">Save internal note</button></form></section></div><div class="record-list" style="margin-top:18px" data-support-messages data-count="${messages.length}">${messagesHtml || '<div class="notice">No messages yet.</div>'}</div></div>`;
  return layout(`Owner Support #${ticket.id}`, content, session, null);
}
async function notificationsPage(session) {
  const en = (session?.language || 'en') !== 'hu';
  const notifications = await listNotifications(session.user.id);
  await markNotificationsRead(session.user.id);
  const rows = notifications.map((item) => `<a class="record" href="${escapeHtml(item.link || '/support')}" style="text-decoration:none"><div><strong>${escapeHtml(item.title)}</strong><div class="muted">${escapeHtml(item.body)}</div></div><span class="badge ${item.read_at ? '' : 'ultimate'}">${item.read_at ? (en ? 'READ' : 'OLVASOTT') : (en ? 'NEW' : 'ÚJ')}</span></a>`).join('') || `<div class="notice">${en ? 'You have no notifications.' : 'Nincs értesítésed.'}</div>`;
  return layout(en ? 'Notifications' : 'Értesítések', `<div class="page-head"><div><div class="section-kicker">NEXA NOTIFICATION CENTER</div><h1>${en ? 'Notifications' : 'Értesítések'}</h1></div><a class="btn secondary" href="/dashboard">← Dashboard</a></div><div class="record-list">${rows}</div>`, session, null);
}

async function readBody(request) {
  return new URLSearchParams((await readRawBody(request, MAX_BODY_BYTES)).toString('utf8'));
}

async function readRawBody(request, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Túl nagy kérés');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function validChannelId(guild, value, categoriesOnly = false) {
  if (!value) return null;
  const channel = guild.channels.cache.get(value);
  if (!channel) return null;
  if (categoriesOnly) return channel.type === ChannelType.GuildCategory ? channel.id : null;
  return channel.isTextBased?.() && !channel.isThread?.() ? channel.id : null;
}

function validVoiceId(guild, value) {
  if (!value) return null;
  const channel = guild.channels.cache.get(value);
  return channel?.type === ChannelType.GuildVoice ? channel.id : null;
}

function validRoleId(guild, value) {
  if (!value) return null;
  const role = guild.roles.cache.get(value);
  return role && role.id !== guild.id && !role.managed ? role.id : null;
}

function configFromForm(guild, form) {
  const current = getGuildConfig(guild.id);
  return {
    language: form.get('language') === 'en' ? 'en' : 'hu',
    commandLanguage: ['auto', 'hu', 'en'].includes(form.get('commandLanguage')) ? form.get('commandLanguage') : 'en',
    modules: {
      protection: form.has('module_protection'),
      moderation: form.has('module_moderation'),
      tickets: form.has('module_tickets'),
      welcome: form.has('module_welcome'),
      levels: form.has('module_levels'),
      suggestions: form.has('module_suggestions'),
      customCommands: form.has('module_customCommands'),
      reactionRoles: form.has('module_reactionRoles'),
      giveaways: form.has('module_giveaways'),
      logging: form.has('module_logging'),
      shift: form.has('module_shift'),
      ai: form.has('module_ai'),
      tempVoice: form.has('module_tempVoice'),
      verification: form.has('module_verification'),
      starboard: form.has('module_starboard'),
      reminders: form.has('module_reminders'),
      bvi: false
    },
    channels: {
      controlCenter: validChannelId(guild, form.get('channel_controlCenter')),
      ai: validChannelId(guild, form.get('channel_ai')),
      securityLogs: validChannelId(guild, form.get('raid_securityLogs') || form.get('channel_securityLogs')),
      logs: validChannelId(guild, form.get('channel_logs')),
      ticketPanel: validChannelId(guild, form.get('channel_ticketPanel')),
      ticketCategory: validChannelId(guild, form.get('channel_ticketCategory'), true),
      moderationPanel: validChannelId(guild, form.get('channel_moderationPanel')),
      welcome: validChannelId(guild, form.get('channel_welcome')),
      goodbye: validChannelId(guild, form.get('channel_goodbye')),
      warnings: validChannelId(guild, form.get('channel_warnings')),
      levels: validChannelId(guild, form.get('channel_levels')),
      suggestions: validChannelId(guild, form.get('channel_suggestions')),
      shiftLogs: validChannelId(guild, form.get('channel_shiftLogs')),
      announcements: validChannelId(guild, form.get('channel_announcements')),
      verification: validChannelId(guild, form.get('channel_verification')),
      starboard: validChannelId(guild, form.get('channel_starboard')),
      tempVoiceLobby: validVoiceId(guild, form.get('channel_tempVoiceLobby')),
      tempVoiceCategory: validChannelId(guild, form.get('channel_tempVoiceCategory'), true)
    },
    roles: {
      staff: validRoleId(guild, form.get('role_staff')),
      auto: validRoleId(guild, form.get('role_human')),
      human: validRoleId(guild, form.get('role_human')),
      bot: validRoleId(guild, form.get('role_bot')),
      dashboard: validRoleId(guild, form.get('role_dashboard')),
      shift: validRoleId(guild, form.get('role_shift')),
      verified: validRoleId(guild, form.get('role_verified'))
    },
    messages: {
      welcome: form.get('message_welcome'),
      goodbye: form.get('message_goodbye'),
      levelUp: form.get('message_levelUp'),
      ticket: form.get('message_ticket')
    },
    tickets: {
      enabledTypes: ['support', 'application', 'report', 'purchase', 'partnership', 'other']
        .filter((type) => form.has(`ticket_type_${type}`)),
      labels: Object.fromEntries(['support', 'application', 'report', 'purchase', 'partnership', 'other']
        .map((type) => [type, form.get(`ticket_label_${type}`)]))
    },
    protection: {
      sensitivity: form.get('protection_sensitivity'),
      spam: form.has('protection_spam'),
      flood: form.has('protection_spam'),
      massMention: form.has('protection_massMention'),
      invites: form.has('protection_invites'),
      links: form.has('protection_links'),
      scamLinks: form.has('protection_scamLinks'),
      badWords: form.has('protection_badWords'),
      capsSpam: form.has('protection_capsSpam'),
      emojiSpam: form.has('protection_emojiSpam'),
      repeatedMessage: form.has('protection_repeatedMessage'),
      raidDetection: form.has('protection_raidDetection'),
      freshAccounts: form.has('protection_freshAccounts'),
      antiNuke: form.has('protection_antiNuke'),
      channelGuard: form.has('protection_channelGuard'),
      roleGuard: form.has('protection_roleGuard'),
      moderationGuard: form.has('protection_moderationGuard'),
      webhookGuard: form.has('protection_webhookGuard'),
      deleteMessages: form.has('protection_deleteMessages'),
      warn: form.has('protection_warn'),
      timeout: form.has('protection_timeout'),
      kick: form.has('protection_kick'),
      ban: form.has('protection_ban'),
      lockdown: form.has('protection_lockdown'),
      blockedWords: String(form.get('protection_blockedWords') || '').split(','),
      whitelistRoles: form.getAll('protection_whitelistRoles').map((id) => validRoleId(guild, id)).filter(Boolean),
      whitelistChannels: form.getAll('protection_whitelistChannels').map((id) => validChannelId(guild, id)).filter(Boolean),
      whitelistUsers: String(form.get('protection_whitelistUsers') || '').split(/\s+/).filter((id) => /^\d{16,22}$/.test(id)),
      trustedBots: String(form.get('protection_trustedBots') || '').split(/\s+/).filter((id) => /^\d{16,22}$/.test(id))
    },
    community: {
      xpCooldownSeconds: form.get('community_xpCooldownSeconds'),
      xpMin: form.get('community_xpMin'),
      xpMax: form.get('community_xpMax'),
      starboardThreshold: form.get('community_starboardThreshold'),
      selfRoles: form.getAll('role_selfRoles').map((id) => validRoleId(guild, id)).filter(Boolean),
      rewardRoles: String(form.get('community_rewardRoles') || '').split(/\r?\n/).map((line) => {
        const [level, roleId] = line.split(':').map((item) => item.trim());
        return { level, roleId: validRoleId(guild, roleId) };
      }).filter((item) => item.roleId)
    },
    shift: {
      trackBreaks: form.has('shift_trackBreaks'),
      showLeaderboard: form.has('shift_showLeaderboard')
    },
    ai: {
      serverMemory: form.has('ai_serverMemory'),
      personalMemory: form.has('ai_personalMemory'),
      maxMemories: form.get('ai_maxMemories'),
      systemPrompt: form.get('ai_systemPrompt')
    },
    documents: current.documents,
    applications: current.applications,
    chronoGuard: current.chronoGuard,
    branding: {
      title: form.get('branding_title'),
      primary: form.get('branding_primary'),
      accent: form.get('branding_accent'),
      logoUrl: form.get('branding_logoUrl')
    },
    logging: {
      messageDelete: form.has('log_messageDelete'),
      messageEdit: form.has('log_messageEdit'),
      memberJoin: form.has('log_memberJoin'),
      memberLeave: form.has('log_memberLeave'),
      ban: form.has('log_ban'),
      timeout: form.has('log_timeout'),
      roleUpdate: form.has('log_roleUpdate'),
      channelUpdate: form.has('log_channelUpdate'),
      voiceJoin: form.has('log_voiceJoin'),
      voiceLeave: form.has('log_voiceLeave'),
      nicknameChange: form.has('log_nicknameChange'),
      invite: form.has('log_invite'),
      moderation: form.has('log_moderation'),
      automod: form.has('log_automod'),
      security: form.has('log_security')
    }
  };
}

function dashboardViewForField(field, fallback = 'settings') {
  void field;
  void fallback;
  return 'control';
}

function validationFailure(message, field = '') {
  const error = new Error(message);
  error.configurationField = field;
  error.statusCode = 400;
  return error;
}

function validateConfiguration(config, guildId = null) {
  if (guildId) {
    const lockedModules = Object.entries(config.modules)
      .filter(([key, enabled]) => key !== 'bvi' && enabled && !planAllowsModule(guildId, key))
      .map(([key]) => `${key} (${planName(MODULE_MINIMUM_PLAN[key])})`);
    if (lockedModules.length) throw validationFailure(`Your current subscription does not include: ${lockedModules.join(', ')}.`, `module_${lockedModules[0]?.split(' ')[0] || ''}`);
    if (!planAllows(guildId, 'ultimate') && (
      config.protection.raidDetection || config.protection.antiNuke || config.protection.lockdown ||
      config.protection.channelGuard || config.protection.roleGuard ||
      config.protection.moderationGuard || config.protection.webhookGuard
    )) {
      throw validationFailure('Anti-Raid Center, Anti-Nuke and instant server lockdown require the Ultimate subscription.', 'protection_raidDetection');
    }
  }
  const requirements = [];
  const need = (condition, field, label) => { if (condition) requirements.push({ field, label }); };
  need(config.modules.protection && !config.channels.securityLogs, 'channel_securityLogs', 'Security log channel');
  need(config.modules.moderation && !config.channels.moderationPanel, 'channel_moderationPanel', 'Moderation panel channel');
  need(config.modules.moderation && !config.channels.logs, 'channel_logs', 'Moderation log channel');
  need(config.modules.moderation && !config.roles.staff, 'role_staff', 'Staff role');
  need(config.modules.tickets && !config.channels.ticketPanel, 'channel_ticketPanel', 'Ticket panel channel');
  need(config.modules.tickets && !config.channels.ticketCategory, 'channel_ticketCategory', 'Ticket category');
  need(config.modules.tickets && !config.roles.staff, 'role_staff', 'Staff role');
  need(config.modules.welcome && !config.channels.welcome, 'channel_welcome', 'Welcome channel');
  need(config.modules.suggestions && !config.channels.suggestions, 'channel_suggestions', 'Suggestions channel');
  need(config.modules.shift && !config.channels.shiftLogs, 'channel_shiftLogs', 'Shift log channel');
  need(config.modules.shift && !config.roles.shift, 'role_shift', 'Shift role');
  need(config.modules.verification && !config.channels.verification, 'channel_verification', 'Verification channel');
  need(config.modules.verification && !config.roles.verified, 'role_verified', 'Verified member role');
  need(config.modules.starboard && !config.channels.starboard, 'channel_starboard', 'Starboard channel');
  need(config.modules.tempVoice && !config.channels.tempVoiceLobby, 'channel_tempVoiceLobby', 'Temporary voice lobby');
  need(config.modules.tickets && !config.tickets.enabledTypes.length, 'ticket_type_support', 'At least one enabled ticket type');
  if (requirements.length) {
    const unique = requirements.filter((item, index, array) => array.findIndex((other) => other.field === item.field) === index);
    throw validationFailure(`Complete the required setting${unique.length === 1 ? '' : 's'}: ${unique.map((item) => item.label).join(', ')}.`, unique[0].field);
  }
}
async function upsertPanel(channel, botId, titlePrefix, payload) {
  if (!channel?.isTextBased()) return;
  const titlePrefixes = Array.isArray(titlePrefix) ? titlePrefix : [titlePrefix];
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = messages?.find((message) =>
    message.author.id === botId && message.embeds.some((embed) =>
      titlePrefixes.some((prefix) => embed.title?.startsWith(prefix))
    )
  );
  if (existing) await existing.edit(payload).catch(() => null);
  else await channel.send(payload).catch(() => null);
}

async function syncConfiguredPanels(guild, config, botUser) {
  const panelConfig = {
    ...config,
    modules: Object.fromEntries(MODULE_KEYS.map((key) => [key, moduleEnabled(guild.id, key)]))
  };
  if (config.channels.controlCenter) {
    const channel = guild.channels.cache.get(config.channels.controlCenter);
    await upsertPanel(
      channel,
      botUser.id,
      '🎛️',
      controlCenterPanel(panelConfig, dashboardUrl(guild.id))
    );
  }
  if (moduleEnabled(guild.id, 'tickets') && config.channels.ticketPanel) {
    const channel = guild.channels.cache.get(config.channels.ticketPanel);
    await upsertPanel(
      channel,
      botUser.id,
      [config.language === 'en' ? '📨 Contact center' : '📨 Ügyintézési központ', '🎫 Segítségkérés', '🎫 Support tickets'],
      ticketPanel(config.messages.ticket, config.language, config.tickets.enabledTypes, config.tickets.labels)
    );
  }
  if (moduleEnabled(guild.id, 'moderation') && config.channels.moderationPanel) {
    const channel = guild.channels.cache.get(config.channels.moderationPanel);
    const roleName = config.roles.staff ? guild.roles.cache.get(config.roles.staff)?.name : NAMES.staffRole;
    await upsertPanel(channel, botUser.id, '🛡️ NEXA', staffPanel(roleName || 'Staff', config.language));
  }
  if (moduleEnabled(guild.id, 'verification') && config.channels.verification) {
    const channel = guild.channels.cache.get(config.channels.verification);
    if (channel?.isTextBased()) await upsertVerificationPanel(guild, channel, botUser.id);
  }
}

function forceCommandLocale(node, language, depth = 0) {
  const locale = language === 'en' ? 'en-US' : 'hu';
  // Only the root command name is replaced. Subcommand and option names remain
  // canonical so every existing command handler keeps working in both modes.
  if (depth === 0 && node.name_localizations?.[locale]) node.name = node.name_localizations[locale];
  if (node.description_localizations?.[locale]) node.description = node.description_localizations[locale];
  delete node.name_localizations;
  delete node.description_localizations;
  for (const choice of node.choices || []) {
    if (choice.name_localizations?.[locale]) choice.name = choice.name_localizations[locale];
    delete choice.name_localizations;
  }
  for (const option of node.options || []) forceCommandLocale(option, language, depth + 1);
  return node;
}

async function syncGuildCommandLanguage(guild, language = 'auto') {
  if (!guild?.commands) return;
  if (language === 'auto') {
    await guild.commands.set([]);
    await syncMdtGuildCommand(guild);
    return;
  }
  const { localizeCommandJson } = require('./command-localizations');
  const { buildSecurityCommand } = require('./security');
  const { buildAiCommand } = require('./ai');
  const { buildShiftCommand } = require('./shifts');
  const { buildHelpCommand } = require('./help');
  const { buildChronoGuardCommand } = require('./chronoguard');
  const { buildAegisCommand } = require('./aegis');
  const { buildSupportSetupCommand } = require('./support-server');
  const { engagementCommands } = require('./engagement');
  const { moderationCommands } = require('./moderation');
  const { communityCommands } = require('./community');
  const commands = [
    buildSettingsCommand(), ...buildRpCommands(), buildSecurityCommand(), buildAiCommand(),
    buildShiftCommand(), buildHelpCommand(), buildChronoGuardCommand(), buildAegisCommand(),
    ...engagementCommands(), ...moderationCommands(), ...communityCommands()
  ];
  try { await requireBelvGuild(guild.id); commands.push(buildMdtCommand()); } catch (error) { if (error.status !== 403) throw error; }
  if (guild.id === SUPPORT_GUILD_ID) commands.push(buildSupportSetupCommand());
  const payload = commands.map((command) => forceCommandLocale(localizeCommandJson(command.toJSON()), language));
  await guild.commands.set(payload);
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauthRedirectUri()
  });
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) throw new Error('A Discord nem fogadta el a belépési kódot.');
  return response.json();
}

async function discordApi(path, accessToken) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('A Discord-fiók adatait nem sikerült lekérni.');
  return response.json();
}

function defaultHealthSnapshot(client) {
  const ready = Boolean(client.isReady());
  const startup = process.uptime() < 180;
  return {
    name: 'NexaBot',
    version: '20.3.1',
    healthy: ready || startup,
    status: ready ? 'online' : startup ? 'starting' : 'offline',
    guilds: client.guilds?.cache?.size || 0,
    uptimeSeconds: Math.floor(process.uptime()),
    discord: {
      ready,
      ping: Number.isFinite(client.ws?.ping) ? client.ws.ping : -1
    },
    database: databaseHealth()
  };
}

async function handleRequest(client, request, response, healthProvider = null) {
  const url = new URL(request.url, rootUrl());
  if (url.pathname.startsWith(MDT_LOADER_PREFIX)) return serveMdtLoader(client, request, response, url, rootUrl(), buildMdtClientScript);
  if (url.pathname.startsWith(MDT_API_PREFIX + '/')) return handleMdtApi(client, request, response, url);
  if (request.method === 'POST' && url.pathname === '/webhooks/stripe') {
    const rawBody = await readRawBody(request, 1_000_000);
    if (!verifyWebhookSignature(rawBody, request.headers['stripe-signature'])) {
      return sendJson(response, 400, { received: false, error: 'Érvénytelen Stripe aláírás.' });
    }
    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
      await processStripeEvent(event);
      return sendJson(response, 200, { received: true });
    } catch (error) {
      await recordError(error, { command: `stripe_webhook:${event?.type || 'parse'}` });
      return sendJson(response, 500, { received: false });
    }
  }
  const session = sessionFor(request);
  if (session) {
    const requestedLanguage = url.searchParams.get('lang');
    if (requestedLanguage === 'en' || requestedLanguage === 'hu') session.language = requestedLanguage;
    else if (!session.language) session.language = 'en';
    if (url.pathname !== '/language') session.currentPath = url.pathname;
  }

  if (request.method === 'GET' && url.pathname === '/language') {
    const language = url.searchParams.get('lang') === 'hu' ? 'hu' : 'en';
    const requestedReturn = String(url.searchParams.get('return') || (session ? '/dashboard' : '/'));
    const destination = requestedReturn.startsWith('/') && !requestedReturn.startsWith('//') ? requestedReturn : (session ? '/dashboard' : '/');
    if (session) session.language = language;
    return redirect(response, destination, languageCookie(language), 303);
  }

  if (request.method === 'GET' && url.pathname === '/assets/nexa-dashboard.js') {
    return sendJavaScript(response, 200, dashboardClientScript());
  }
  if (request.method === 'GET' && url.pathname === '/health/live') {
    return sendJson(response, 200, { name: 'NexaBot', live: true, uptimeSeconds: Math.floor(process.uptime()) });
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    const current = healthProvider ? await healthProvider() : defaultHealthSnapshot(client);
    const safeHealth = {
      ...current,
      database: current.database ? {
        configured: current.database.configured,
        persistent: current.database.persistent,
        state: current.database.state
      } : undefined
    };
    return sendJson(response, current.healthy ? 200 : 503, safeHealth);
  }
  if (!rateAllowed(request)) return sendHtml(response, 429, errorPage('Túl sok kérés', 'Várj egy percet, majd próbáld újra.', session));
  if (request.method === 'GET' && url.pathname === '/') return sendHtml(response, 200, landing(client, session, publicLanguage(url, request)), publicLanguageHeaders(url));
  if (request.method === 'GET' && url.pathname === '/platform') return sendHtml(response, 200, publicInfoPage('platform', session, publicLanguage(url, request)), publicLanguageHeaders(url));
  if (request.method === 'GET' && url.pathname === '/commands') return sendHtml(response, 200, publicInfoPage('commands', session, publicLanguage(url, request)), publicLanguageHeaders(url));
  if (request.method === 'GET' && url.pathname === '/pricing') return redirect(response, `/subscriptions${url.search || ''}`, null, 301);
  if (request.method === 'GET' && url.pathname === '/subscriptions') return sendHtml(response, 200, pricingPage(session, publicLanguage(url, request)), publicLanguageHeaders(url));
  if (request.method === 'GET' && url.pathname === '/tudaskozpont') return sendHtml(response, 200, knowledgeBasePage(session, publicLanguage(url, request)), publicLanguageHeaders(url));
  if (request.method === 'GET' && url.pathname === '/privacy') return sendHtml(response, 200, publicInfoPage('privacy', session, publicLanguage(url, request)), publicLanguageHeaders(url));
  if (request.method === 'GET' && url.pathname === '/terms') return sendHtml(response, 200, publicInfoPage('terms', session, publicLanguage(url, request)), publicLanguageHeaders(url));
  if (request.method === 'GET' && url.pathname === '/login') {
    if (!process.env.DISCORD_CLIENT_SECRET) {
      return sendHtml(response, 503, errorPage('A webes belépés még nincs bekapcsolva', 'A Renderben add hozzá a DISCORD_CLIENT_SECRET környezeti változót.'));
    }
    const state = randomToken(24);
    oauthStates.set(state, Date.now() + 10 * 60 * 1000);
    const authorize = new URL('https://discord.com/oauth2/authorize');
    authorize.search = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      redirect_uri: oauthRedirectUri(),
      response_type: 'code',
      scope: 'identify guilds',
      state
    });
    return redirect(response, authorize.toString());
  }
  if (request.method === 'GET' && url.pathname === '/oauth/callback') {
    const state = url.searchParams.get('state');
    const expiresAt = state ? oauthStates.get(state) : null;
    if (!state || !expiresAt || expiresAt < Date.now()) {
      return sendHtml(response, 400, errorPage('Sikertelen belépés', 'A belépési kérés lejárt vagy érvénytelen. Próbáld újra.'));
    }
    oauthStates.delete(state);
    try {
      const code = url.searchParams.get('code');
      if (!code) throw new Error('A Discord-belépést megszakították vagy elutasították.');
      const token = await exchangeCode(code);
      const [user, guilds] = await Promise.all([
        discordApi('/users/@me', token.access_token),
        discordApi('/users/@me/guilds', token.access_token)
      ]);
      const sid = randomToken();
      const storedLanguage = cookies(request).nexabot_language === 'hu' ? 'hu' : 'en';
      sessions.set(sid, { user, guilds, language: storedLanguage, csrf: randomToken(20), expiresAt: Date.now() + SESSION_AGE_MS });
      return redirect(response, isOwnerUser(user.id) ? '/owner' : '/dashboard', sessionCookie(sid));
    } catch (error) {
      return sendHtml(response, 502, errorPage('Sikertelen Discord-belépés', error.message));
    }
  }
  if (request.method === 'GET' && url.pathname === '/logout') {
    const sid = verifiedSessionId(cookies(request).nexabot_session);
    if (sid) sessions.delete(sid);
    return redirect(response, '/', sessionCookie('', 0));
  }
  if ((url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/owner') || url.pathname.startsWith('/billing') || url.pathname.startsWith('/support') || url.pathname.startsWith('/notifications') || url.pathname.startsWith('/profile')) && !session) return redirect(response, '/login');
  if (request.method === 'GET' && url.pathname === '/profile') {
    return sendHtml(response, 200, await profilePage(client, session));
  }
  if (request.method === 'GET' && url.pathname === '/notifications') {
    return sendHtml(response, 200, await notificationsPage(session));
  }
  const apiSupportMatch = url.pathname.match(/^\/api\/support\/(\d+)$/);
  if (request.method === 'GET' && apiSupportMatch) {
    if (!session) return sendJson(response, 401, { error: 'Authentication required.' });
    const ticketData = await getWebTicket(apiSupportMatch[1], session.user.id, isOwnerUser(session.user.id));
    if (!ticketData) return sendJson(response, 404, { error: 'Ticket not found.' });
    return sendJson(response, 200, {
      ticket: {
        id: ticketData.ticket.id,
        subject: ticketData.ticket.subject,
        status: ticketData.ticket.status,
        priority: ticketData.ticket.priority,
        assigned_name: ticketData.ticket.assigned_name || null,
        updated_at: ticketData.ticket.updated_at,
        rating: ticketData.ticket.rating || null
      },
      messages: ticketData.messages.map((message) => ({
        id: message.id,
        author_name: message.author_name,
        source: message.source,
        content: message.content,
        internal: Boolean(message.internal),
        created_at: message.created_at
      }))
    });
  }
  if (request.method === 'GET' && url.pathname === '/support') {
    return sendHtml(response, 200, await webSupportPage(session, url.searchParams.get('created') === '1' ? 'A ticket létrejött a hivatalos Support szerveren.' : ''));
  }
  if (request.method === 'POST' && url.pathname === '/support') {
    try {
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
      const subject = String(form.get('subject') || '').trim().slice(0, 100);
      const content = String(form.get('content') || '').trim().slice(0, 4000);
      const allowedCategories = new Set(['technical', 'bug', 'billing', 'partnership', 'other']);
      const category = allowedCategories.has(form.get('category')) ? form.get('category') : 'other';
      const priority = ['low', 'normal', 'high', 'urgent'].includes(form.get('priority')) ? form.get('priority') : 'normal';
      if (subject.length < 3 || content.length < 5) throw new Error('Adj meg értelmes témát és részletes üzenetet.');
      const ticket = await createWebTicket(client, session.user, { subject, category, content, priority });
      await recordAudit('web_support_create', { actorId: session.user.id, targetId: String(ticket.id) });
      return redirect(response, `/support/${ticket.id}`, null, 303);
    } catch (error) {
      await recordError(error, { command: 'web_support_create', userId: session.user.id });
      return sendHtml(response, 400, errorPage('A segítségkérés nem nyitható meg', error.message, session));
    }
  }
  const supportMatch = url.pathname.match(/^\/support\/(\d+)(?:\/(reply|rate))?$/);
  if (supportMatch) {
    const ticketData = await getWebTicket(supportMatch[1], session.user.id, isOwnerUser(session.user.id));
    if (!ticketData) return sendHtml(response, 404, errorPage('A ticket nem található', 'Ehhez az ügyhöz nincs hozzáférésed.', session));
    if (request.method === 'GET' && !supportMatch[2]) return sendHtml(response, 200, await webSupportTicketPage(ticketData, session));
    if (request.method === 'POST' && supportMatch[2] === 'reply') {
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
      const content = String(form.get('content') || '').trim().slice(0, 4000);
      if (content.length < 1 || ticketData.ticket.status === 'closed') return sendHtml(response, 400, errorPage('A válasz nem küldhető el', 'The message is empty or the ticket is already closed.', session));
      await addWebReply(client, ticketData.ticket, session.user, content);
      return redirect(response, `/support/${ticketData.ticket.id}`, null, 303);
    }
    if (request.method === 'POST' && supportMatch[2] === 'rate') {
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
      await rateWebTicket(ticketData.ticket.id, session.user.id, form.get('rating'), form.get('comment'));
      return redirect(response, `/support/${ticketData.ticket.id}`, null, 303);
    }
  }
  if (request.method === 'GET' && url.pathname === '/billing') {
    return sendHtml(response, 200, await billingPage(client, session, url));
  }
  if (request.method === 'POST' && ['/billing/checkout', '/billing/portal'].includes(url.pathname)) {
    const wantsJson = String(request.headers.accept || '').toLowerCase().includes('application/json');
    const form = await readBody(request);
    if (form.get('csrf') !== session.csrf) {
      return wantsJson
        ? sendJson(response, 403, { ok: false, error: 'Lejárt a munkamenet. Frissítsd az oldalt, majd próbáld újra.' })
        : sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
    }
    const guildId = String(form.get('guild_id') || '').trim();
    const guild = client.guilds.cache.get(guildId);
    const oauthGuild = session.guilds.find((item) => item.id === guildId) || (guild && isOwnerUser(session.user.id) ? { id: guild.id, name: guild.name, permissions: '0' } : null);
    if (!guild || !(await userCanManageGuild(session, oauthGuild, guild))) {
      return wantsJson
        ? sendJson(response, 403, { ok: false, error: 'Ehhez a szerverhez nincs kezelői jogosultságod.' })
        : sendHtml(response, 403, errorPage('Nincs hozzáférésed', 'Ehhez a szerverhez nincs kezelői jogosultságod.', session));
    }
    try {
      if (url.pathname === '/billing/portal') {
        const subscription = getGuildSubscription(guildId);
        const portal = await createCustomerPortalSession(subscription?.customerId, rootUrl(), guildId);
        await recordAudit('billing_portal_open', { actorId: session.user.id, guildId });
        if (wantsJson) return sendJson(response, 200, { ok: true, url: portal.url });
        return redirect(response, portal.url, null, 303);
      }
      const current = getGuildSubscription(guildId);
      if (current && ['active', 'trialing', 'past_due'].includes(current.status)) {
        if (wantsJson) return sendJson(response, 409, { ok: false, error: 'Ehhez a szerverhez már tartozik aktív előfizetés. A módosításhoz nyisd meg a számlázási portált.' });
        return redirect(response, `/billing?guild=${encodeURIComponent(guildId)}&error=${encodeURIComponent('This server already has an active subscription. Use the customer portal to change or cancel it.')}`, null, 303);
      }
      const checkout = await createCheckoutSession({
        guildId,
        discordUserId: session.user.id,
        plan: form.get('plan'),
        cycle: form.get('cycle'),
        returnUrl: rootUrl()
      });
      await recordAudit('billing_checkout_create', { actorId: session.user.id, guildId, metadata: { plan: form.get('plan'), cycle: form.get('cycle') } });
      if (wantsJson) return sendJson(response, 200, { ok: true, url: checkout.url });
      return redirect(response, checkout.url, null, 303);
    } catch (error) {
      await recordError(error, { command: url.pathname, guildId, userId: session.user.id });
      if (wantsJson) return sendJson(response, 400, { ok: false, error: String(error.message || 'Stripe operation failed.').slice(0, 500) });
      return redirect(response, `/billing?guild=${encodeURIComponent(guildId)}&error=${encodeURIComponent(String(error.message || 'Stripe operation failed.').slice(0, 500))}`, null, 303);
    }
  }
  if (url.pathname.startsWith('/owner')) {
    if (!isOwnerUser(session.user.id)) {
      return sendHtml(response, 403, errorPage('Tulajdonosi hozzáférés szükséges', 'Ezt az oldalt csak a bot tulajdonosa és az általa kijelölt kezelők nyithatják meg.', session));
    }
    if (request.method === 'GET' && url.pathname === '/owner/support') {
      return sendHtml(response, 200, await ownerSupportPage(session, url));
    }
    if (request.method === 'POST' && url.pathname === '/owner/support/moderation') {
      if (!isBotOwner(session.user.id)) return sendHtml(response, 403, errorPage('Csak a fő botowner', 'A Support moderációs kapcsolóját csak a fő owner kezelheti.', session));
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
      if (!['true', 'false'].includes(form.get('paused'))) return sendHtml(response, 400, errorPage('Hibás kapcsolóállapot', 'Frissítsd a Support vezérlőt.', session));
      const guild = client.guilds.cache.get(SUPPORT_GUILD_ID);
      if (!guild) return sendHtml(response, 404, errorPage('A Support szerver nem található', 'A NEXA nincs a hivatalos Support szerveren.', session));
      try {
        const result = await setSupportModerationPaused(guild, session.user.id, form.get('paused') === 'true');
        return redirect(response, `/owner/support?moderation=${result.complete ? 'saved' : 'partial'}#support-moderation`, null, 303);
      } catch (error) {
        await recordError(error, { command: 'support_moderation_web', guildId: guild.id, userId: session.user.id }).catch(() => {});
        return sendHtml(response, error.status || 503, errorPage('A moderációs kapcsoló művelete nem fejeződött be', 'Ellenőrizd az adatbázist és a bot naplóját. Ne tekintsd késznek a kikapcsolást.', session));
      }
    }
    const ownerSupportMatch = url.pathname.match(/^\/owner\/support\/(\d+)(?:\/(manage|note))?$/);
    if (ownerSupportMatch) {
      const ticketData = await getWebTicket(ownerSupportMatch[1], session.user.id, true);
      if (!ticketData) return sendHtml(response, 404, errorPage('A ticket nem található', 'Az ügy már nem érhető el.', session));
      if (request.method === 'GET' && !ownerSupportMatch[2]) return sendHtml(response, 200, await ownerSupportTicketPage(ticketData, session));
      if (request.method === 'POST') {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
        if (ownerSupportMatch[2] === 'note') {
          const content = String(form.get('content') || '').trim().slice(0, 4000);
          if (!content) return sendHtml(response, 400, errorPage('Üres jegyzet', 'A belső jegyzet nem lehet üres.', session));
          await addInternalNote(ownerSupportMatch[1], session.user, content);
        } else {
          const action = String(form.get('action') || '');
          const value = action === 'status' ? form.get('status_value') : form.get('value');
          await manageWebTicket(client, ownerSupportMatch[1], session.user, action, value);
        }
        await recordAudit('owner_support_manage', { actorId: session.user.id, targetId: ownerSupportMatch[1], metadata: { action: ownerSupportMatch[2] } });
        return redirect(response, `/owner/support/${ownerSupportMatch[1]}`, null, 303);
      }
    }
    if (request.method === 'GET' && url.pathname === '/owner') {
      return sendHtml(response, 200, await ownerDashboard(client, session, url.searchParams.get('saved') === '1', {
        search: url.searchParams.get('q'),
        page: url.searchParams.get('page')
      }));
    }
    const ownerMdtMatch = url.pathname.match(/^\/owner\/mdt(?:\/(\d{16,22})(?:\/(client\.lua|loader\.lua|script))?)?$/);
    if (ownerMdtMatch) {
      if (!isBotOwner(session.user.id)) return sendHtml(response, 403, errorPage('Csak a fő botowner', 'A Belv MDT nem használható delegált Owner Center-hozzáféréssel.', session));
      const guild = ownerMdtMatch[1] ? client.guilds.cache.get(ownerMdtMatch[1]) : null;
      if (ownerMdtMatch[1] && !guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA nincs ezen a szerveren.', session));
      try {
        if (request.method === 'GET' && ownerMdtMatch[2] === 'loader.lua') {
          const loader = await getMdtLoaderCommand(guild.id, session.user.id, rootUrl());
          response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="Belv-MDT-Xeno-Loader.lua"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return response.end(loader.code + '\n');
        }
        if (request.method === 'GET' && ownerMdtMatch[2] === 'script') return sendHtml(response, 200, await mdtClientCodePage(guild.id, session.user.id, rootUrl(), session, { layout, escapeHtml }));
        if (request.method === 'GET' && ownerMdtMatch[2] === 'client.lua') {
          const script = await buildMdtClientScript(guild.id, session.user.id, rootUrl());
          response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="Belv-MDT-Emergency-Hamburg.lua"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return response.end(script);
        }
        if (request.method === 'GET') return sendHtml(response, 200, await mdtOwnerPage(client, session, guild?.id, { layout, escapeHtml, inspectMemberId: url.searchParams.get('check') }));
        if (request.method === 'POST' && guild && !ownerMdtMatch[2]) {
          const form = await readBody(request);
          if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
          if (form.get('operation') === 'revoke') {
            await revokeMdtOwnerSessions(guild.id, session.user.id);
          } else if (form.get('operation') === 'rotate-loader') {
            await rotateMdtLoaderLink(guild.id, session.user.id);
          } else await saveMdtOwnerForm(guild, session.user.id, form);
          return redirect(response, `/owner/mdt/${guild.id}?saved=1`, null, 303);
        }
        return sendHtml(response, 405, errorPage('Nem engedélyezett kérés', 'Az MDT-beállítás ezen a műveleten nem módosítható.', session));
      } catch (error) {
        return sendHtml(response, error.status || 503, errorPage('Belv MDT', error.status ? error.message : 'Az MDT-adatbázis nem érhető el.', session));
      }
    }
    const ownerArchitectMatch = url.pathname.match(/^\/owner\/architect\/(\d{16,22})(?:\/(plan|apply|repair))?$/);
    if (ownerArchitectMatch) {
      if (!isBotOwner(session.user.id)) {
        return sendHtml(response, 403, errorPage('Elsődleges botowner szükséges', 'A NEXA OS Studio telepítési és javítási műveleteit kizárólag a BOT_OWNER_ID használhatja. A hozzáadott Owner-kezelők sem kapnak hozzáférést.', session));
      }
      const guild = client.guilds.cache.get(ownerArchitectMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      const action = ownerArchitectMatch[2];
      if (request.method === 'GET' && !action) {
        return sendHtml(response, 200, await ownerArchitectPage(guild, session, {
          applied: url.searchParams.get('applied') === '1',
          repaired: String(url.searchParams.get('repaired') || '').slice(0, 80)
        }));
      }
      if (request.method === 'POST' && action) {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt, majd próbáld újra.', session));
        try {
          if (action === 'plan') {
            const prompt = String(form.get('prompt') || '').trim().slice(0, 4000);
            const language = form.get('language') === 'en' ? 'en' : 'hu';
            const scale = ['compact', 'professional', 'enterprise'].includes(form.get('scale')) ? form.get('scale') : 'professional';
            const template = ['smart', 'community', 'gaming', 'creator', 'support', 'clan', 'business', 'agency'].includes(form.get('template'))
              ? form.get('template')
              : 'smart';
            const features = form.getAll('features').filter((key) => ['tickets', 'verification', 'moderation', 'security', 'levels', 'events', 'applications', 'shift', 'voice', 'suggestions', 'reactionRoles', 'giveaways', 'ai'].includes(key));
            const generated = await generateServerBlueprint({ guild, prompt, language, scale, template, features });
            const token = signBlueprintToken(generated.plan, guild.id, session.user.id);
            await recordAudit('owner_architect_plan', {
              actorId: session.user.id,
              guildId: guild.id,
              targetId: planHash(generated.plan),
              metadata: { source: generated.source, scale, template, features, ...blueprintStats(generated.plan) }
            });
            return sendHtml(response, 200, await ownerArchitectPage(guild, session, {
              plan: generated.plan,
              planToken: token,
              prompt,
              template,
              scale,
              features,
              source: generated.source,
              warning: generated.warning
            }));
          }
          if (action === 'apply') {
            if (String(form.get('confirmation') || '').trim() !== 'NEXA OWNER') throw new Error('A megerősítő szöveg pontosan NEXA OWNER legyen.');
            const plan = verifyBlueprintToken(form.get('plan_token'), guild.id, session.user.id);
            await createSnapshot(guild, { source: 'architect-preflight', createdBy: session.user.id, force: true }).catch(() => null);
            const result = await applyServerBlueprint(guild, plan, session.user.id, { prompt: String(form.get('prompt') || '').slice(0, 4000) });
            const panelSync = await syncConfiguredPanels(guild, getGuildConfig(guild.id), client.user).catch((error) => ({ warning: String(error.message || error).slice(0, 300) }));
            await recordAudit('owner_architect_apply', {
              actorId: session.user.id,
              guildId: guild.id,
              targetId: planHash(plan),
              metadata: { ...result.summary, persistent: result.persistent, panelSync }
            });
            return redirect(response, `/owner/architect/${guild.id}?applied=1`, null, 303);
          }
          if (String(form.get('confirmation') || '').trim() !== 'OWNER JAVÍTÁS') throw new Error('A megerősítő szöveg pontosan OWNER JAVÍTÁS legyen.');
          const operation = String(form.get('operation') || '');
          await createSnapshot(guild, { source: `owner-repair-${operation}`, createdBy: session.user.id, force: true }).catch(() => null);
          let label = '';
          let result = null;
          if (operation === 'sync-panels') {
            result = await syncConfiguredPanels(guild, getGuildConfig(guild.id), client.user);
            label = 'NEXA panelek szinkronizálása';
          } else if (operation === 'support-repair' && guild.id === SUPPORT_GUILD_ID) {
            result = await repairSupportServer(guild, client.user, session.user.id);
            label = 'Support-rendszer javítása';
          } else {
            throw new Error('Ismeretlen vagy ezen a szerveren nem engedélyezett javítási művelet.');
          }
          await recordAudit('owner_architect_repair', {
            actorId: session.user.id,
            guildId: guild.id,
            targetId: operation,
            metadata: result || {}
          });
          return redirect(response, `/owner/architect/${guild.id}?repaired=${encodeURIComponent(label)}`, null, 303);
        } catch (error) {
          await recordError(error, { command: `owner_architect_${action}`, guildId: guild.id, userId: session.user.id });
          return sendHtml(response, 400, errorPage('A NEXA OS Studio művelete nem sikerült', error.message, session));
        }
      }
      return sendHtml(response, 405, errorPage('Nem engedélyezett kérés', 'Ezen az útvonalon ez a HTTP-művelet nem használható.', session));
    }
    const ownerGuildMatch = url.pathname.match(/^\/owner\/guild\/(\d{16,22})$/);
    if (request.method === 'GET' && ownerGuildMatch) {
      const guild = client.guilds.cache.get(ownerGuildMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      return sendHtml(response, 200, await ownerGuildPage(guild, session));
    }
    const ownerAegisMatch = url.pathname.match(/^\/owner\/aegis\/(\d{16,22})(?:\/(scan|baseline))?$/);
    if (ownerAegisMatch) {
      const guild = client.guilds.cache.get(ownerAegisMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      const action = ownerAegisMatch[2];
      if (request.method === 'GET' && !action) {
        try {
          return sendHtml(response, 200, await ownerAegisPage(guild, session, {
            scanned: url.searchParams.get('scan') === '1',
            baseline: url.searchParams.get('baseline') === '1',
            error: String(url.searchParams.get('error') || '').slice(0, 250)
          }));
        } catch (error) {
          await recordError(error, { command: 'owner_aegis_page', guildId: guild.id, userId: session.user.id });
          return sendHtml(response, 500, errorPage('Az AEGIS elemzés nem tölthető be', error.message, session));
        }
      }
      if (request.method === 'POST' && action) {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
        try {
          await runAegisScan(guild, {
            baseline: action === 'baseline',
            source: 'owner-center',
            createdBy: session.user.id,
            refresh: true
          });
          return redirect(response, `/owner/aegis/${guild.id}?${action}=1`);
        } catch (error) {
          await recordError(error, { command: `owner_aegis_${action}`, guildId: guild.id, userId: session.user.id });
          return redirect(response, `/owner/aegis/${guild.id}?error=${encodeURIComponent(error.message)}`);
        }
      }
    }
    const chronoExportMatch = url.pathname.match(/^\/owner\/chronoguard\/(\d{16,22})\/export\/(\d+)$/);
    if (request.method === 'GET' && chronoExportMatch) {
      const guild = client.guilds.cache.get(chronoExportMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      try {
        const capsule = await buildIncidentCapsule(guild, chronoExportMatch[2]);
        const body = Buffer.from(`${JSON.stringify(capsule, null, 2)}\n`, 'utf8');
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="nexa-chronoguard-${guild.id}-${chronoExportMatch[2]}.json"`,
          'Content-Length': body.length,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        return response.end(body);
      } catch (error) {
        await recordError(error, { command: 'owner_chronoguard_export', guildId: guild.id, userId: session.user.id });
        return sendHtml(response, 400, errorPage('A bizonyítékkapszula nem készíthető el', error.message, session));
      }
    }
    const ownerChronoGuardMatch = url.pathname.match(/^\/owner\/chronoguard\/(\d{16,22})(?:\/(save|snapshot|snapshot-baseline|baseline|scan|restore))?$/);
    if (ownerChronoGuardMatch) {
      const guild = client.guilds.cache.get(ownerChronoGuardMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      const action = ownerChronoGuardMatch[2];
      if (request.method === 'GET' && !action) {
        return sendHtml(response, 200, await ownerChronoGuardPage(guild, session, {
          saved: url.searchParams.get('saved') === '1',
          snapshot: url.searchParams.get('snapshot') === '1',
          scanned: url.searchParams.get('scan') === '1',
          restored: String(url.searchParams.get('restored') || '').slice(0, 300)
        }));
      }
      if (request.method === 'POST' && action) {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
        try {
          if (action === 'save') {
            const current = getGuildConfig(guild.id);
            const chronoGuard = {
              enabled: form.has('enabled'),
              autoSnapshotHours: form.get('auto_snapshot_hours'),
              retention: form.get('retention'),
              alertThreshold: form.get('alert_threshold'),
              protectedRoleIds: form.getAll('protected_role_ids').map((id) => validRoleId(guild, id)).filter(Boolean),
              protectedChannelIds: form.getAll('protected_channel_ids').map((id) => validChannelId(guild, id)).filter(Boolean)
            };
            await setGuildConfig(guild.id, { ...current, chronoGuard });
            const overview = await chronoguardOverview(guild);
            if (chronoGuard.enabled && !overview.baseline) await createSnapshot(guild, { source: 'owner-enable', createdBy: session.user.id, baseline: true, force: true });
            await recordAudit('owner_chronoguard_settings', { actorId: session.user.id, guildId: guild.id, metadata: { enabled: chronoGuard.enabled } });
            return redirect(response, `/owner/chronoguard/${guild.id}?saved=1`);
          }
          if (action === 'snapshot' || action === 'snapshot-baseline') {
            await createSnapshot(guild, { source: 'owner', createdBy: session.user.id, baseline: action === 'snapshot-baseline', force: true });
            return redirect(response, `/owner/chronoguard/${guild.id}?snapshot=1`);
          }
          if (action === 'baseline') {
            await setBaseline(guild.id, String(form.get('snapshot_id') || ''), session.user.id);
            return redirect(response, `/owner/chronoguard/${guild.id}?saved=1`);
          }
          if (action === 'scan') {
            await shadowScan(guild, { createdBy: session.user.id });
            return redirect(response, `/owner/chronoguard/${guild.id}?scan=1`);
          }
          if (String(form.get('confirmation') || '').trim() !== 'CHRONOGUARD') throw new Error('A megerősítő szöveg pontosan CHRONOGUARD legyen.');
          const recovery = await restoreSnapshot(guild, String(form.get('snapshot_id') || ''), {
            createdBy: session.user.id,
            createMissing: form.has('create_missing')
          });
          const summary = `${recovery.results.restoredRoles} rang és ${recovery.results.restoredChannels} csatorna beállítása visszaállítva; ${recovery.results.createdRoles + recovery.results.createdChannels} hiányzó elem újralétrehozva; ${recovery.results.errors.length} hiba.`;
          return redirect(response, `/owner/chronoguard/${guild.id}?restored=${encodeURIComponent(summary)}`);
        } catch (error) {
          await recordError(error, { command: `owner_chronoguard_${action}`, guildId: guild.id, userId: session.user.id });
          return sendHtml(response, 400, errorPage('A ChronoGuard művelet nem sikerült', error.message, session));
        }
      }
    }
    const ownerTgfForgeMatch = url.pathname.match(/^\/owner\/tgf-forge\/(\d{16,22})(?:\/(save|delete|install|publish))?$/);
    if (ownerTgfForgeMatch) {
      const guild = client.guilds.cache.get(ownerTgfForgeMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      if (!isBviGuild(guild.id)) return sendHtml(response, 403, errorPage('Az RP-rendszer nincs bekapcsolva', 'A TGF Forge kizárólag az Owner által engedélyezett RP-szervereken használható.', session));
      const action = ownerTgfForgeMatch[2];
      if (request.method === 'GET' && !action) {
        return sendHtml(response, 200, await ownerTgfForgePage(guild, session, {
          editKey: String(url.searchParams.get('edit') || ''),
          saved: url.searchParams.get('saved') === '1',
          installed: url.searchParams.get('installed') === '1',
          published: url.searchParams.get('published') === '1'
        }));
      }
      if (request.method === 'POST' && action) {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
        const current = getGuildConfig(guild.id);
        const templates = [...(current.applications?.templates || [])];
        const key = String(form.get('template_key') || '').trim();
        const existingIndex = templates.findIndex((item) => item.key === key);
        try {
          if (action === 'publish') {
            const channelId = validChannelId(guild, form.get('publish_channel_id'));
            const channel = channelId ? guild.channels.cache.get(channelId) : null;
            const roleId = validRoleId(guild, form.get('publish_role_id'));
            const title = String(form.get('publish_title') || '').trim().slice(0, 256);
            const message = String(form.get('publish_message') || '').trim().slice(0, 4000);
            const style = form.get('publish_style') === 'plain' ? 'plain' : 'embed';
            if (!channel?.isTextBased?.() || !message) throw new Error('A célcsatorna és az üzenet megadása kötelező.');
            if (style === 'plain' && message.length > 1900) throw new Error('Az egyszerű szöveges üzenet legfeljebb 1900 karakter lehet. Használd a beágyazott kártyát hosszabb szöveghez.');
            const ping = roleId ? `<@&${roleId}>` : '';
            const payload = style === 'plain'
              ? { content: [ping, title ? `**${title}**` : '', message].filter(Boolean).join('\n\n') }
              : { content: ping || undefined, embeds: [new EmbedBuilder().setColor(current.branding?.primary || '#7c5cff').setTitle(title || 'NEXA közlemény').setDescription(message).setFooter({ text: 'Közzétette a NexaBot Owner Center' }).setTimestamp()] };
            payload.allowedMentions = { roles: roleId ? [roleId] : [] };
            const sent = await channel.send(payload);
            await recordAudit('owner_quick_publish', { actorId: session.user.id, guildId: guild.id, targetId: sent.id, metadata: { channelId, roleId, style } });
            return redirect(response, `/owner/tgf-forge/${guild.id}?published=1`);
          }
          if (action === 'save') {
            if (existingIndex < 0 && templates.length >= 15) throw new Error('Egy szerveren legfeljebb 15 egyedi TGF-folyamat használható.');
            const title = String(form.get('title') || '').trim().slice(0, 45);
            const openChannelId = validChannelId(guild, form.get('open_channel_id'));
            const reviewChannelId = validChannelId(guild, form.get('review_channel_id'));
            const questions = String(form.get('questions') || '').split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .slice(0, 15)
              .map((line, index) => {
                const optional = /^\?\s*/.test(line);
                return {
                  id: `question_${index + 1}`,
                  label: line.replace(/^\?\s*/, '').trim().slice(0, 200),
                  placeholder: 'Írd le részletesen a válaszodat.',
                  required: !optional,
                  maxLength: 1000
                };
              })
              .filter((question) => question.label);
            if (!title || !openChannelId || !reviewChannelId) throw new Error('A TGF neve, nyitócsatornája és bírálati csatornája kötelező.');
            if (!questions.length) throw new Error('Legalább egy TGF-kérdést adj meg.');
            const template = {
              key: existingIndex >= 0 ? key : `tgf_${Date.now().toString(36).slice(-6)}_${crypto.randomBytes(2).toString('hex')}`,
              title,
              emoji: String(form.get('emoji') || '📋').trim().slice(0, 16) || '📋',
              description: String(form.get('description') || 'Nyomd meg a gombot a jelentkezés megkezdéséhez.').trim().slice(0, 1000),
              openChannelId,
              reviewChannelId,
              resultChannelId: validChannelId(guild, form.get('result_channel_id')),
              accessRoleId: validRoleId(guild, form.get('access_role_id')),
              reviewerRoleId: validRoleId(guild, form.get('reviewer_role_id')),
              acceptedRoleId: validRoleId(guild, form.get('accepted_role_id')),
              notificationRoleId: validRoleId(guild, form.get('notification_role_id')),
              cooldownHours: Math.min(720, Math.max(0, Number.parseInt(form.get('cooldown_hours'), 10) || 0)),
              blindReview: form.has('blind_review'),
              active: form.has('active'),
              questions
            };
            if (existingIndex >= 0) templates[existingIndex] = template; else templates.push(template);
            await setGuildConfig(guild.id, { ...current, applications: { templates } });
            await recordAudit(existingIndex >= 0 ? 'owner_tgf_template_update' : 'owner_tgf_template_create', { actorId: session.user.id, guildId: guild.id, targetId: template.key, metadata: { version: templateVersion(template) } });
            return redirect(response, `/owner/tgf-forge/${guild.id}?saved=1`);
          }
          if (existingIndex < 0) throw new Error('A TGF-sablon nem található.');
          if (action === 'delete') {
            const [removed] = templates.splice(existingIndex, 1);
            await setGuildConfig(guild.id, { ...current, applications: { templates } });
            await recordAudit('owner_tgf_template_delete', { actorId: session.user.id, guildId: guild.id, targetId: removed.key, metadata: { version: templateVersion(removed) } });
            return redirect(response, `/owner/tgf-forge/${guild.id}?saved=1`);
          }
          const template = findApplicationTemplate(guild.id, key);
          if (!template) throw new Error('A TGF-sablon nem található.');
          const channel = await installApplicationPanel(guild, template, client.user);
          await recordAudit('owner_tgf_template_install', { actorId: session.user.id, guildId: guild.id, targetId: template.key, metadata: { channelId: channel.id, version: templateVersion(template) } });
          return redirect(response, `/owner/tgf-forge/${guild.id}?installed=1`);
        } catch (error) {
          await recordError(error, { command: `owner_tgf_forge_${action}`, guildId: guild.id, userId: session.user.id });
          return sendHtml(response, 400, errorPage('A TGF Forge művelete nem sikerült', error.message, session));
        }
      }
    }
    const ownerDocumentStudioMatch = url.pathname.match(/^\/owner\/document-studio\/(\d{16,22})(?:\/(save|delete|install))?$/);
    if (ownerDocumentStudioMatch) {
      const guild = client.guilds.cache.get(ownerDocumentStudioMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      if (!isBviGuild(guild.id)) return sendHtml(response, 403, errorPage('Az RP-rendszer nincs bekapcsolva', 'A Workflow Studio kizárólag az Owner által engedélyezett RP-szervereken használható.', session));
      const action = ownerDocumentStudioMatch[2];
      if (request.method === 'GET' && !action) {
        return sendHtml(response, 200, ownerDocumentStudioPage(guild, session, {
          editKey: String(url.searchParams.get('edit') || ''),
          saved: url.searchParams.get('saved') === '1',
          installed: url.searchParams.get('installed') === '1'
        }));
      }
      if (request.method === 'POST' && action) {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
        const current = getGuildConfig(guild.id);
        const templates = [...(current.documents?.customTypes || [])];
        const key = String(form.get('template_key') || '').trim();
        const existingIndex = templates.findIndex((item) => item.key === key);
        try {
          if (action === 'save') {
            if (existingIndex < 0 && templates.length >= 25) throw new Error('Egy szerveren legfeljebb 25 egyedi dokumentumsablon használható.');
            const title = String(form.get('title') || '').trim().slice(0, 45);
            const channelId = validChannelId(guild, form.get('channel_id'));
            if (!title || !channelId) throw new Error('A dokumentum neve és a célcsatorna kötelező.');
            const fields = [];
            for (let index = 1; index <= 5; index += 1) {
              const label = String(form.get(`field_${index}_label`) || '').trim().slice(0, 45);
              if (!label) continue;
              const style = form.get(`field_${index}_style`) === 'paragraph' ? 'paragraph' : 'short';
              fields.push({
                id: `field_${fields.length + 1}`,
                label,
                placeholder: String(form.get(`field_${index}_placeholder`) || '').trim().slice(0, 100),
                required: form.has(`field_${index}_required`),
                style,
                maxLength: style === 'paragraph' ? 1000 : 200
              });
            }
            if (!fields.length) throw new Error('Legalább egy kérdést adj meg.');
            const template = {
              key: existingIndex >= 0 ? key : `custom_${Date.now().toString(36).slice(-5)}_${crypto.randomBytes(2).toString('hex')}`,
              title,
              emoji: String(form.get('emoji') || '📄').trim().slice(0, 16) || '📄',
              channelId,
              approval: form.has('approval'),
              active: true,
              accessRoleId: validRoleId(guild, form.get('access_role_id')),
              notificationRoleId: validRoleId(guild, form.get('notification_role_id')),
              caseNumber: form.has('case_number'),
              pingTarget: form.has('ping_target'),
              fields
            };
            if (existingIndex >= 0) templates[existingIndex] = template; else templates.push(template);
            await setGuildConfig(guild.id, { ...current, documents: { ...current.documents, customTypes: templates } });
            await recordAudit(existingIndex >= 0 ? 'owner_document_template_update' : 'owner_document_template_create', {
              actorId: session.user.id, guildId: guild.id, targetId: template.key
            });
            return redirect(response, `/owner/document-studio/${guild.id}?saved=1`);
          }
          if (existingIndex < 0) throw new Error('Az egyedi dokumentumsablon nem található.');
          if (action === 'delete') {
            const [removed] = templates.splice(existingIndex, 1);
            await setGuildConfig(guild.id, { ...current, documents: { ...current.documents, customTypes: templates } });
            await recordAudit('owner_document_template_delete', { actorId: session.user.id, guildId: guild.id, targetId: removed.key });
            return redirect(response, `/owner/document-studio/${guild.id}?saved=1`);
          }
          const type = allDocumentTypes(guild).find((item) => item.key === key && item.custom);
          if (!type) throw new Error('Az egyedi dokumentumsablon nem található.');
          const channel = await installCustomDocumentPanel(guild, type, client.user);
          await recordAudit('owner_document_template_install', { actorId: session.user.id, guildId: guild.id, targetId: type.key, metadata: { channelId: channel.id } });
          return redirect(response, `/owner/document-studio/${guild.id}?installed=1`);
        } catch (error) {
          await recordError(error, { command: `owner_document_studio_${action}`, guildId: guild.id, userId: session.user.id });
          return sendHtml(response, 400, errorPage('A dokumentumsablon művelete nem sikerült', error.message, session));
        }
      }
    }
    const ownerShiftsMatch = url.pathname.match(/^\/owner\/shifts\/(\d{16,22})(?:\/(record\/(\d+)|reset-user|reset-all))?$/);
    if (ownerShiftsMatch) {
      const guild = client.guilds.cache.get(ownerShiftsMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      if (request.method === 'GET' && !ownerShiftsMatch[2]) {
        const userId = /^\d{16,22}$/.test(String(url.searchParams.get('user') || '')) ? String(url.searchParams.get('user')) : null;
        return sendHtml(response, 200, await ownerShiftsPage(guild, session, { userId, saved: url.searchParams.get('saved') === '1' }));
      }
      if (request.method === 'POST' && ownerShiftsMatch[2]) {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
        try {
          if (ownerShiftsMatch[2].startsWith('record/')) {
            if (form.get('operation') === 'delete') await deleteShiftRecord(guild.id, ownerShiftsMatch[3], session.user.id);
            else {
              const startedAt = parseBudapestInput(form.get('started_at'));
              const endedAt = form.get('ended_at') ? parseBudapestInput(form.get('ended_at')) : null;
              if (!startedAt || (form.get('ended_at') && !endedAt)) throw new Error('Érvénytelen budapesti dátum vagy időpont.');
              await updateShiftRecord(guild.id, ownerShiftsMatch[3], { startedAt, endedAt, breakSeconds: form.get('break_seconds') }, session.user.id);
            }
          } else if (ownerShiftsMatch[2] === 'reset-user') {
            if (String(form.get('confirmation') || '').trim() !== 'RESET') throw new Error('A megerősítő szöveg pontosan RESET legyen.');
            const userId = String(form.get('user_id') || '').trim();
            if (!/^\d{16,22}$/.test(userId)) throw new Error('Érvénytelen Discord felhasználói ID.');
            await resetShiftData(guild.id, userId, session.user.id);
          } else {
            if (String(form.get('confirmation') || '').trim() !== 'TELJES RESET') throw new Error('A megerősítő szöveg pontosan TELJES RESET legyen.');
            await resetShiftData(guild.id, null, session.user.id);
          }
          return redirect(response, `/owner/shifts/${guild.id}?saved=1`);
        } catch (error) {
          await recordError(error, { command: 'owner_shift_operation', guildId: guild.id, userId: session.user.id });
          return sendHtml(response, 400, errorPage('A szolgálati művelet nem sikerült', error.message, session));
        }
      }
    }
    const ownerErlcMatch = url.pathname.match(/^\/owner\/erlc\/(\d{16,22})(?:\/(save|toggle|delete|command))?$/);
    if (ownerErlcMatch) {
      const guild = client.guilds.cache.get(ownerErlcMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      if (!isBviGuild(guild.id)) return sendHtml(response, 403, errorPage('Az RP-rendszer nincs bekapcsolva', 'Az ER:LC Bridge csak Owner által engedélyezett RP-szerveren használható.', session));
      const action = ownerErlcMatch[2];
      if (request.method === 'GET' && !action) {
        return sendHtml(response, 200, await ownerErlcPage(guild, session, {
          saved: url.searchParams.get('saved') === '1', commandSent: url.searchParams.get('command') === '1'
        }));
      }
      if (request.method === 'POST' && action) {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
        try {
          if (action === 'save') await saveErlcIntegration(guild.id, form.get('server_key'), session.user.id);
          if (action === 'toggle') await setErlcEnabled(guild.id, form.get('enabled') === '1', session.user.id);
          if (action === 'delete') {
            if (String(form.get('confirmation') || '').trim() !== 'ERLC TÖRLÉS') throw new Error('A megerősítő szöveg pontosan ERLC TÖRLÉS legyen.');
            await deleteErlcIntegration(guild.id);
          }
          if (action === 'command') {
            if (String(form.get('confirmation') || '').trim() !== 'KÜLDÉS') throw new Error('A megerősítő szöveg pontosan KÜLDÉS legyen.');
            await runErlcCommand(guild.id, form.get('command'));
          }
          await recordAudit(`owner_erlc_${action}`, { actorId: session.user.id, guildId: guild.id });
          return redirect(response, `/owner/erlc/${guild.id}?${action === 'command' ? 'command=1' : 'saved=1'}`);
        } catch (error) {
          await recordError(error, { command: `owner_erlc_${action}`, guildId: guild.id, userId: session.user.id });
          return sendHtml(response, 400, errorPage('Az ER:LC művelet nem sikerült', error.message, session));
        }
      }
    }
    const ownerDocumentsMatch = url.pathname.match(/^\/owner\/documents\/(\d{16,22})$/);
    if (ownerDocumentsMatch) {
      const guild = client.guilds.cache.get(ownerDocumentsMatch[1]);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      if (!isBviGuild(guild.id)) return sendHtml(response, 403, errorPage('Az RP-rendszer nincs bekapcsolva', 'Előbb kapcsold be ennél a szervernél az Owner Centerben.', session));
      if (request.method === 'GET') {
        return sendHtml(response, 200, ownerDocumentsPage(guild, session, url.searchParams.get('saved') === '1'));
      }
      if (request.method === 'POST') {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
        const current = getGuildConfig(guild.id);
        const defaultAccessRoleId = validRoleId(guild, form.get('doc_default_role'));
        if (!defaultAccessRoleId) {
          return sendHtml(response, 400, errorPage('Használati rang szükséges', 'Válaszd ki, melyik Discord-rang használhatja alapból a dokumentumpaneleket.', session));
        }
        const types = Object.fromEntries(DOCUMENT_TYPES.map((type) => [type.key, {
          caseNumber: form.has(`doc_case_${type.key}`),
          pingTarget: form.has(`doc_ping_${type.key}`),
          accessRoleId: validRoleId(guild, form.get(`doc_role_${type.key}`)),
          notificationRoleId: validRoleId(guild, form.get(`doc_notify_${type.key}`))
        }]));
        try {
          await setGuildConfig(guild.id, { ...current, documents: { ...current.documents, defaultAccessRoleId, types } });
          await installDocumentPanels(guild, client.user);
          await recordAudit('owner_document_rules_save', { actorId: session.user.id, guildId: guild.id });
          return redirect(response, `/owner/documents/${guild.id}?saved=1`);
        } catch (error) {
          await recordError(error, { command: 'owner_document_rules', guildId: guild.id, userId: session.user.id });
          return sendHtml(response, 500, errorPage('A dokumentumbeállítás mentése nem sikerült', error.message, session));
        }
      }
    }
    if (request.method === 'POST' && url.pathname === '/owner/rp-toggle') {
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
      const guildId = String(form.get('guild_id') || '').trim();
      if (!/^\d{16,22}$/.test(guildId)) return sendHtml(response, 400, errorPage('Érvénytelen szerver ID', 'Adj meg egy érvényes Discord szerver ID-t.', session));
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
      const settings = getOwnerSettings();
      const rpGuilds = new Set(settings.rpGuilds);
      const enabled = !rpGuilds.has(guildId);
      if (enabled) rpGuilds.add(guildId); else rpGuilds.delete(guildId);
      await setOwnerSettings({ ...settings, rpGuilds: [...rpGuilds] });
      await syncConfiguredPanels(guild, getGuildConfig(guildId), client.user);
      await recordAudit(enabled ? 'owner_rp_enable' : 'owner_rp_disable', { actorId: session.user.id, guildId, targetId: guildId });
      return redirect(response, '/owner?saved=1');
    }
    if (request.method === 'POST' && (url.pathname === '/owner/ai-access' || url.pathname === '/owner/ai-access/remove')) {
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) {
        return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt, majd próbáld újra.', session));
      }
      const userId = String(form.get('user_id') || '').trim();
      if (!/^\d{16,22}$/.test(userId)) {
        return sendHtml(response, 400, errorPage('Érvénytelen Discord ID', 'A felhasználói azonosító 16–22 számjegyből álljon.', session));
      }
      const settings = getOwnerSettings();
      const users = new Set(settings.aiAllowedUsers);
      if (url.pathname.endsWith('/remove')) users.delete(userId);
      else if (!isOwnerUser(userId)) users.add(userId);
      await setOwnerSettings({ ...settings, aiAllowedUsers: [...users] });
      await recordAudit(url.pathname.endsWith('/remove') ? 'owner_ai_access_remove' : 'owner_ai_access_add', { actorId: session.user.id, targetId: userId });
      return redirect(response, '/owner?saved=1');
    }
    if (request.method === 'POST' && (url.pathname === '/owner/access' || url.pathname === '/owner/access/remove')) {
      if (!isBotOwner(session.user.id)) return sendHtml(response, 403, errorPage('Főtulajdonosi hozzáférés szükséges', 'Owner-kezelőt csak a BOT_OWNER_ID fiók módosíthat.', session));
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
      const userId = String(form.get('user_id') || '').trim();
      if (!/^\d{16,22}$/.test(userId) || isBotOwner(userId)) return sendHtml(response, 400, errorPage('Érvénytelen Discord ID', 'Adj meg egy másik érvényes Discord felhasználói ID-t.', session));
      const settings = getOwnerSettings();
      const users = new Set(settings.ownerUsers);
      if (url.pathname.endsWith('/remove')) users.delete(userId);
      else users.add(userId);
      await setOwnerSettings({ ...settings, ownerUsers: [...users] });
      await recordAudit(url.pathname.endsWith('/remove') ? 'owner_access_remove' : 'owner_access_add', { actorId: session.user.id, targetId: userId });
      return redirect(response, '/owner?saved=1');
    }
    if (request.method === 'POST' && url.pathname === '/owner/global') {
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
      const settings = getOwnerSettings();
      const operation = String(form.get('operation') || 'save');
      const guildId = String(form.get('blacklist_guild') || form.get('premium_guild') || '').trim();
      const userId = String(form.get('blacklist_user') || '').trim();
      const blacklistedGuilds = new Set(settings.blacklistedGuilds);
      const blacklistedUsers = new Set(settings.blacklistedUsers);
      if (operation === 'blacklist_guild_toggle') {
        if (!/^\d{16,22}$/.test(guildId)) return sendHtml(response, 400, errorPage('Érvénytelen szerver ID', 'A Discord szerver ID-je 16–22 számjegy.', session));
        if (blacklistedGuilds.has(guildId)) blacklistedGuilds.delete(guildId); else blacklistedGuilds.add(guildId);
      }
      if (operation === 'blacklist_user_toggle') {
        if (!/^\d{16,22}$/.test(userId) || isOwnerUser(userId)) return sendHtml(response, 400, errorPage('Érvénytelen felhasználó ID', 'Owner-kezelő nem tehető blackliste-re.', session));
        if (blacklistedUsers.has(userId)) blacklistedUsers.delete(userId); else blacklistedUsers.add(userId);
      }
      if (!['package_grant', 'package_remove', 'package_set', 'announcement'].includes(operation)) {
        await setOwnerSettings({
          ...settings,
          maintenance: form.get('maintenance') === 'on',
          maintenanceMessage: form.get('maintenance_message'),
          blacklistedGuilds: [...blacklistedGuilds],
          blacklistedUsers: [...blacklistedUsers],
          remoteDisabledModules: form.getAll('disabled_modules')
        });
      }
      if (operation === 'package_grant') {
        if (!/^\d{16,22}$/.test(guildId)) return sendHtml(response, 400, errorPage('Érvénytelen szerver ID', 'Adj meg érvényes Discord szerver ID-t.', session));
        if (!client.guilds.cache.has(guildId)) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
        await grantGuildPlan(guildId, form.get('premium_plan'), {
          days: form.get('premium_days') || null,
          grantedBy: session.user.id,
          note: form.get('premium_note')
        });
      }
      if (operation === 'package_remove') {
        if (!/^\d{16,22}$/.test(guildId)) return sendHtml(response, 400, errorPage('Érvénytelen szerver ID', 'Adj meg érvényes Discord szerver ID-t.', session));
        await revokeGuildPlan(guildId);
      }
      if (operation === 'package_set') {
        if (!/^\d{16,22}$/.test(guildId)) return sendHtml(response, 400, errorPage('Érvénytelen szerver ID', 'Adj meg érvényes Discord szerver ID-t.', session));
        if (!client.guilds.cache.has(guildId)) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
        if (String(form.get('premium_plan')) === 'free') await revokeGuildPlan(guildId);
        else await grantGuildPlan(guildId, form.get('premium_plan'), { days: null, grantedBy: session.user.id, note: 'Owner gyorsbeállítás' });
      }
      if (operation === 'announcement') {
        if (!/^\d{16,22}$/.test(guildId)) return sendHtml(response, 400, errorPage('Érvénytelen szerver ID', 'A közleményhez add meg a cél szerver ID-jét.', session));
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return sendHtml(response, 404, errorPage('A szerver nem található', 'A NEXA Bot nincs ezen a szerveren.', session));
        const config = getGuildConfig(guildId);
        const channel = (config.channels.announcements && guild.channels.cache.get(config.channels.announcements)) || guild.systemChannel;
        if (!channel?.isTextBased()) return sendHtml(response, 400, errorPage('Nincs küldhető csatorna', 'Állíts be bejelentési csatornát a szerver dashboardján.', session));
        const title = String(form.get('announcement_title') || 'NEXA Bot közlemény').trim().slice(0, 200);
        const text = String(form.get('announcement_text') || '').trim().slice(0, 3000);
        if (!text) return sendHtml(response, 400, errorPage('Üres közlemény', 'Írd be a közlemény szövegét.', session));
        await channel.send({ content: `## ${title}\n${text}`, allowedMentions: { parse: [] } });
      }
      if (['package_grant', 'package_remove', 'package_set'].includes(operation)) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) await syncConfiguredPanels(guild, getGuildConfig(guildId), client.user);
      }
      await recordAudit(`owner_${operation}`, { actorId: session.user.id, targetId: guildId || userId || null });
      return redirect(response, '/owner?saved=1');
    }
  }
  if (request.method === 'GET' && url.pathname === '/dashboard') {
    return sendHtml(response, 200, await dashboardList(client, session));
  }

  const commandsMatch = url.pathname.match(/^\/dashboard\/guild\/(\d{16,22})\/commands(\/delete)?$/);
  if (commandsMatch) {
    const guild = client.guilds.cache.get(commandsMatch[1]);
    const oauthGuild = session.guilds.find((item) => item.id === commandsMatch[1]) || (guild && isOwnerUser(session.user.id) ? { id: guild.id, name: guild.name, permissions: '0' } : null);
    if (!guild || !(await userCanManageGuild(session, oauthGuild, guild))) return sendHtml(response, 403, errorPage('Nincs hozzáférésed', 'Ehhez a szerverhez nincs kezelői jogosultságod.', session));
    if (!planAllowsModule(guild.id, 'customCommands')) return sendHtml(response, 403, errorPage('Pro csomag szükséges', 'A Custom Commands modult az Owner Centerben kiosztott Pro vagy Ultimate csomag nyitja meg.', session));
    if (request.method === 'GET' && !commandsMatch[2]) return sendHtml(response, 200, await customCommandsPage(guild, session, url.searchParams.get('saved') === '1'));
    if (request.method === 'POST') {
      const form = await readBody(request);
      if (form.get('csrf') !== session.csrf) return sendHtml(response, 403, errorPage('Lejárt munkamenet', 'Frissítsd az oldalt.', session));
      try {
        if (commandsMatch[2]) await deleteCustomCommand(guild.id, form.get('name'));
        else await saveCustomCommand(guild.id, session.user.id, { name: form.get('name'), type: form.get('type'), title: form.get('title'), content: form.get('content'), buttonLabel: form.get('button_label'), buttonUrl: form.get('button_url') });
        await recordAudit(commandsMatch[2] ? 'custom_command_delete' : 'custom_command_save', { actorId: session.user.id, guildId: guild.id, targetId: form.get('name') });
        return redirect(response, `/dashboard/guild/${guild.id}/commands?saved=1`);
      } catch (error) {
        return sendHtml(response, 400, errorPage('A Custom Command mentése nem sikerült', error.message, session));
      }
    }
  }

  const guildMatch = url.pathname.match(/^\/dashboard\/guild\/(\d{16,22})(?:\/(control|overview|moderation|automod|welcome|tickets|logs|reaction-roles|auto-role|level|giveaway|ai|security|stats|settings))?$/);
  if (guildMatch) {
    const guild = client.guilds.cache.get(guildMatch[1]);
    const oauthGuild = session.guilds.find((item) => item.id === guildMatch[1]) || (guild && isOwnerUser(session.user.id) ? {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: false,
      permissions: '0'
    } : null);
    if (!guild || !(await userCanManageGuild(session, oauthGuild, guild))) {
      return sendHtml(response, 403, errorPage('Nincs hozzáférésed', 'Ehhez a szerverhez nincs kezelői jogosultságod.', session));
    }
    if (request.method === 'GET') {
      if (guildMatch[2] && guildMatch[2] !== 'control') {
        return redirect(response, `/dashboard/guild/${guild.id}/control`);
      }
      return sendHtml(response, 200, settingsPage(guild, getGuildConfig(guild.id), session, url.searchParams.get('saved') === '1', { view: 'control' }));
    }
    if (request.method === 'POST') {
      let requestedConfig = null;
      const requestedView = 'control';
      try {
        const form = await readBody(request);
        if (form.get('csrf') !== session.csrf) {
          return sendHtml(response, 403, errorPage('Session expired', 'Refresh the page, then try again.', session));
        }
        requestedConfig = configFromForm(guild, form);
        validateConfiguration(requestedConfig, guild.id);
        const config = await setGuildConfig(guild.id, requestedConfig);
        await syncConfiguredPanels(guild, config, client.user);
        await syncGuildCommandLanguage(guild, config.commandLanguage);
        await recordAudit('dashboard_settings_save', { actorId: session.user.id, guildId: guild.id });
        return redirect(response, `/dashboard/guild/${guild.id}/${requestedView}?saved=1`);
      } catch (error) {
        await recordError(error, { command: 'dashboard_settings', guildId: guild.id, userId: session.user.id });
        if (requestedConfig) {
          return sendHtml(response, Number(error.statusCode || 400), settingsPage(guild, requestedConfig, session, false, {
            error: error.message,
            focus: error.configurationField || '',
            view: dashboardViewForField(error.configurationField || '', requestedView)
          }));
        }
        return sendHtml(response, 400, errorPage('Settings could not be saved', error.message, session));
      }
    }
  }
  return sendHtml(response, 404, errorPage('Az oldal nem található', 'Ellenőrizd a címet.', session));
}

function startDashboardServer(client, port, options = {}) {
  const http = require('node:http');
  const server = http.createServer((request, response) => {
    handleRequest(client, request, response, options.healthProvider).catch((error) => {
      console.error('Webes kezelőfelület hibája:', error);
      recordError(error, { command: `${request.method} ${request.url}` });
      if (!response.headersSent) sendHtml(response, 500, errorPage('Váratlan hiba', 'Próbáld újra később.'));
      else response.end();
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 20_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  });
  server.listen(port, '0.0.0.0', () => console.log(`NexaBot webes kezelőfelület elindult a ${port} porton.`));
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessions) if (value.expiresAt < now) sessions.delete(key);
    for (const [key, value] of oauthStates) if (value < now) oauthStates.delete(key);
    for (const [key, value] of requestWindows) if (now - value.startedAt > 120_000) requestWindows.delete(key);
  }, 10 * 60 * 1000);
  cleanup.unref();
  return server;
}

function buildSettingsCommand() {
  return new SlashCommandBuilder()
    .setName('beallitas')
    .setDescription('Megnyitja a NexaBot webes kezelőfelületét.')
    .setDMPermission(false);
}

function buildRpCommands() {
  return [
    new SlashCommandBuilder()
      .setName('telepites')
      .setDescription('Telepíti az Owner által engedélyezett teljes RP-alaprendszert.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .setDMPermission(false),
    new SlashCommandBuilder()
      .setName('dokumentum-panelek')
      .setDescription('Telepíti az RP dokumentumpaneleket a meglévő csatornákba.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .setDMPermission(false)
  ];
}

module.exports = {
  escapeHtml,
  environmentReadiness,
  ownerDashboard,
  ownerGuildPage,
  ownerArchitectPage,
  ownerDocumentsPage,
  ownerTgfForgePage,
  ownerChronoGuardPage,
  ownerAegisPage,
  knowledgeBasePage,
  configFromForm,
  validateConfiguration,
  userCanManageGuild,
  syncConfiguredPanels,
  syncGuildCommandLanguage,
  startDashboardServer,
  buildSettingsCommand,
  buildRpCommands
};
