'use strict';

const path = require('node:path');
const { pathToFileURL, URL } = require('node:url');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');

const OWNER_URL = 'https://nexabot-25vo.onrender.com/owner';
const SITE_ORIGIN = new URL(OWNER_URL).origin;
const APP_HOME = path.join(__dirname, 'app.html');
const APP_HOME_URL = pathToFileURL(APP_HOME).href;
const ALLOWED_AUTH_PATHS = new Set(['/login', '/logout', '/oauth/callback']);
const DISCORD_HOSTS = new Set(['discord.com', 'www.discord.com']);
let mainWindow = null;

function isOwnerPath(pathname) {
  return pathname === '/owner' || pathname.startsWith('/owner/');
}

function ownerUrl(route = '/owner#overview') {
  try {
    const url = new URL(String(route || '/owner#overview'), SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN || !isOwnerPath(url.pathname)) return OWNER_URL;
    return url.href;
  } catch {
    return OWNER_URL;
  }
}

function isAllowedNavigation(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'file:') return url.href === APP_HOME_URL;
    if (url.origin === SITE_ORIGIN) {
      return isOwnerPath(url.pathname) || ALLOWED_AUTH_PATHS.has(url.pathname);
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

function loadHome(window = mainWindow) {
  if (!window || window.isDestroyed()) return;
  void window.loadFile(APP_HOME);
}

function openOwner(route, window = mainWindow) {
  if (!window || window.isDestroyed()) return;
  void window.loadURL(ownerUrl(route));
}

function createMenu() {
  const tools = [
    { label: 'Áttekintés', route: '/owner#overview', accelerator: 'CmdOrCtrl+1' },
    { label: 'Szerverek', route: '/owner#servers', accelerator: 'CmdOrCtrl+2' },
    { label: 'Előfizetések', route: '/owner#packages', accelerator: 'CmdOrCtrl+3' },
    { label: 'Support műveletek', route: '/owner/support', accelerator: 'CmdOrCtrl+4' },
    { label: 'Owner hozzáférések', route: '/owner#access', accelerator: 'CmdOrCtrl+5' },
    { label: 'AI-hozzáférések', route: '/owner/ai-access', accelerator: 'CmdOrCtrl+6' },
    { label: 'Auditnapló', route: '/owner#audit', accelerator: 'CmdOrCtrl+7' },
    { label: 'Rendszerállapot', route: '/owner#system', accelerator: 'CmdOrCtrl+8' }
  ];

  const template = [
    {
      label: 'NEXA',
      submenu: [
        { label: 'Owner Center kezdőlap', accelerator: 'CmdOrCtrl+0', click: () => loadHome() },
        { type: 'separator' },
        { label: 'Kilépés', role: 'quit' }
      ]
    },
    {
      label: 'Navigáció',
      submenu: [
        { label: 'Vissza', accelerator: 'Alt+Left', click: () => mainWindow?.webContents.canGoBack() && mainWindow.webContents.goBack() },
        { label: 'Előre', accelerator: 'Alt+Right', click: () => mainWindow?.webContents.canGoForward() && mainWindow.webContents.goForward() },
        { label: 'Frissítés', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.webContents.reload() }
      ]
    },
    {
      label: 'Kezelés',
      submenu: [
        ...tools.map((item) => ({
          label: item.label,
          accelerator: item.accelerator,
          click: () => openOwner(item.route)
        })),
        { type: 'separator' },
        { label: 'Teljes webes Owner Center', click: () => openOwner('/owner#overview') }
      ]
    },
    {
      label: 'Súgó',
      submenu: [
        { label: 'Owner Center hozzáférés', click: () => openOwner('/owner#access') },
        { label: 'Kapcsolat és support', click: () => openOwner('/owner/support') }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1510,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    title: 'NEXA Owner Center',
    backgroundColor: '#070b09',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow = window;

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      if (url.startsWith('file:')) loadHome(window);
      else if (new URL(url).origin === SITE_ORIGIN) openOwner(url, window);
      else void window.loadURL(url);
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
      if (url.origin === SITE_ORIGIN) loadHome(window);
      else openExternal(value);
    } catch {
      loadHome(window);
    }
  });

  window.webContents.on('will-redirect', (event, value) => {
    if (isAllowedNavigation(value)) return;
    event.preventDefault();
    try {
      const url = new URL(value);
      if (url.origin === SITE_ORIGIN) loadHome(window);
      else openExternal(value);
    } catch {
      loadHome(window);
    }
  });

  void window.loadFile(APP_HOME);
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });
}

ipcMain.handle('owner-app:open-owner', (event, route) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window !== mainWindow) return false;
  openOwner(route, window);
  return true;
});

ipcMain.handle('owner-app:open-home', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window !== mainWindow) return false;
  loadHome(window);
  return true;
});

ipcMain.handle('owner-app:refresh', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window !== mainWindow) return false;
  window.webContents.reload();
  return true;
});

app.whenReady().then(() => {
  createMenu();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
