'use strict';

const { app, BrowserWindow, shell } = require('electron');
const { URL } = require('node:url');

const OWNER_URL = 'https://nexabot-25vo.onrender.com/owner';
const SITE_ORIGIN = new URL(OWNER_URL).origin;
const ALLOWED_SITE_PATHS = new Set(['/owner', '/login', '/logout', '/oauth/callback']);
const DISCORD_HOSTS = new Set(['discord.com', 'www.discord.com']);

function isAllowedNavigation(value) {
  try {
    const url = new URL(value);
    if (url.origin === SITE_ORIGIN) {
      return ALLOWED_SITE_PATHS.has(url.pathname) || url.pathname.startsWith('/owner/');
    }
    return url.protocol === 'https:' && DISCORD_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function openExternal(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'mailto:') {
      void shell.openExternal(url.href);
    }
  } catch {
    // Invalid or unsupported links stay inside the app.
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 920,
    minHeight: 640,
    title: 'NEXA Owner Center',
    backgroundColor: '#07100d',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  window.removeMenu();

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      void window.loadURL(url);
    } else {
      openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, value) => {
    if (isAllowedNavigation(value)) return;
    event.preventDefault();
    try {
      const url = new URL(value);
      if (url.origin === SITE_ORIGIN) {
        void window.loadURL(OWNER_URL);
      } else {
        openExternal(value);
      }
    } catch {
      void window.loadURL(OWNER_URL);
    }
  });

  window.webContents.on('will-redirect', (event, value) => {
    if (isAllowedNavigation(value)) return;
    event.preventDefault();
    try {
      const url = new URL(value);
      if (url.origin === SITE_ORIGIN) {
        void window.loadURL(OWNER_URL);
      } else {
        openExternal(value);
      }
    } catch {
      void window.loadURL(OWNER_URL);
    }
  });

  void window.loadURL(OWNER_URL);
}

app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
