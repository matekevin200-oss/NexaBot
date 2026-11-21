'use strict';
document.getElementById('year').textContent = String(new Date().getFullYear());
const url = window.NEXA_CONFIG && window.NEXA_CONFIG.dashboardUrl;
if (typeof url === 'string' && /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(url)) {
  for (const link of document.querySelectorAll('.dashboard-link')) {
    link.href = url;
    link.hidden = false;
  }
} else {
  document.getElementById('setup-note').hidden = false;
}
