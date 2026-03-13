const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isElectron: true,
    saveProgress: (data) => ipcRenderer.invoke('save-progress', data),
    loadProgress: () => ipcRenderer.invoke('load-progress'),
    deleteProgress: () => ipcRenderer.invoke('delete-progress'),
    getSavePath: () => ipcRenderer.invoke('get-save-path')
});
