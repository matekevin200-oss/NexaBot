const { databaseHealth,checkDatabaseConnection,isBotOwner,getGuildConfig }=require('./config');
const { SUPPORT_GUILD_ID }=require('./constants');
async function diagnosticState(client,actorId,verify=false) {
 if(!isBotOwner(actorId))throw Object.assign(new Error('A diagnosztikát csak a fő owner használhatja.'),{status:403});
 if(verify)await checkDatabaseConnection();
 const health=databaseHealth(),checks=[{name:'Discord-kapcsolat',ok:Boolean(client.isReady?.()),detail:client.isReady?.()?'A bot kapcsolódott.':'A bot még csatlakozik vagy újracsatlakozik.'},{name:'PostgreSQL',ok:health.persistent&&health.state==='online',detail:health.state==='online'?'A tároló elérhető.':'Ellenőrizd a DATABASE_URL beállítást és az adatbázis elérhetőségét.'}];
 const support=client.guilds.cache.get(SUPPORT_GUILD_ID);
 checks.push({name:'NEXA Support',ok:Boolean(support),detail:support?(getGuildConfig(SUPPORT_GUILD_ID).supportModeration.paused?'Moderáció szünetel.':'Moderáció a beállított kapcsolók szerint.'): 'A bot nincs a hivatalos Support szerveren.'});
 return{checks,checkedAt:new Date().toISOString()};
}
async function diagnosticsPage(client,session,helpers,verify=false) {
 const {layout,escapeHtml:escape}=helpers,state=await diagnosticState(client,session.user.id,verify);
 return layout('NEXA • Rendszerellenőrzés',`<div class="page-head"><div><h1>Rendszerellenőrzés</h1><p class="muted">A saját bot és a hozzá tartozó szolgáltatások aktuális állapota.</p></div><a class="btn secondary" href="/owner">← Owner Center</a></div><section class="card section"><div style="overflow-x:auto"><table><thead><tr><th>Ellenőrzés</th><th>Állapot</th><th>Teendő</th></tr></thead><tbody>${state.checks.map(check=>`<tr><td>${escape(check.name)}</td><td>${check.ok?'✅ Rendben':'⚠️ Ellenőrizendő'}</td><td>${escape(check.detail)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Lekérdezés: ${escape(state.checkedAt)}</p><form method="post" action="/owner/diagnostics"><input type="hidden" name="csrf" value="${escape(session.csrf)}"><button class="btn green" type="submit">Kapcsolatok újraellenőrzése</button></form><div class="actions"><a class="btn secondary" href="/owner/support">Support műveletek</a></div></section>`,session);
}
module.exports={diagnosticState,diagnosticsPage};
