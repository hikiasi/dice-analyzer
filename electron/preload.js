const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),
  activate: (key) => ipcRenderer.invoke('activate', key),
  incrementUsage: () => ipcRenderer.invoke('increment-usage')
});
