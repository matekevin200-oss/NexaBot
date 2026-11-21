'use strict';
// Netlify builds only the public website, never starts the Discord gateway bot.
// Set NEXA_DASHBOARD_URL to the HTTPS origin of the existing Render dashboard.
const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve(__dirname, '..', 'netlify-site', 'config.js');
const candidate = (process.env.NEXA_DASHBOARD_URL || '').trim();
let dashboardUrl = '';
if (candidate) {
  let parsed;
  try { parsed = new URL(candidate); } catch { throw new Error('NEXA_DASHBOARD_URL must be a valid HTTPS URL'); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('NEXA_DASHBOARD_URL must be an HTTPS URL without credentials, query or fragment');
  }
  dashboardUrl = parsed.origin;
}
fs.writeFileSync(target, 'window.NEXA_CONFIG = ' + JSON.stringify({ dashboardUrl }) + ';\n', 'utf8');
console.log(dashboardUrl ? 'NEXA dashboard link configured.' : 'NEXA_DASHBOARD_URL unset: dashboard link hidden.');
