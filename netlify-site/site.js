'use strict';
document.getElementById('year').textContent = String(new Date().getFullYear());
const url = window.NEXA_CONFIG && window.NEXA_CONFIG.dashboardUrl;
if (typeof url !== 'string' || !url.startsWith('https://')) {
  document.getElementById('setup-note').hidden = false;
}
