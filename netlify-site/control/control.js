'use strict';
const config = window.NEXA_CONFIG || {};
const origin = typeof config.dashboardUrl === 'string' ? config.dashboardUrl : '';
let valid = false;
try {
  const parsed = new URL(origin);
  valid = parsed.protocol === 'https:' && parsed.origin === origin && !parsed.username && !parsed.password;
} catch { /* configuration is missing or invalid */ }
for (const a of document.querySelectorAll('a.backend')) {
  if (!valid) continue;
  const route = a.dataset.path;
  if (!['/login', '/dashboard', '/helpdesk', '/owner'].includes(route)) continue;
  a.href = origin + route;
  a.hidden = false;
}
document.getElementById('year').textContent = String(new Date().getFullYear());
document.getElementById('configuration-alert').hidden = valid;
document.getElementById('backend-state').textContent = valid ? 'Render-cím beállítva' : 'Beállítás szükséges';
document.getElementById('backend-note').textContent = valid ? 'A szerver élő állapotát ez a felület nem ellenőrzi.' : 'A kapcsolódáshoz szükséges URL hiányzik.';
