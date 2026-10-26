'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexaOwnerApp', {
  openOwner: (route) => ipcRenderer.invoke('owner-app:open-owner', String(route || '')),
  openHome: () => ipcRenderer.invoke('owner-app:open-home'),
  refresh: () => ipcRenderer.invoke('owner-app:refresh')
});
