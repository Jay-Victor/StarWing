const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onGameControl: (callback) => {
        ipcRenderer.on('game-control', (event, action) => {
            callback(action);
        });
    },
    getAppVersion: () => {
        return '1.0.0';
    },
    getAppName: () => {
        return 'StarWing';
    },
    
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: (releaseInfo) => ipcRenderer.invoke('update:download', releaseInfo),
    installUpdate: (filePath) => ipcRenderer.invoke('update:install', filePath),
    getUpdateConfig: () => ipcRenderer.invoke('update:get-config'),
    setUpdateConfig: (config) => ipcRenderer.invoke('update:set-config', config),
    getLastCheckTime: () => ipcRenderer.invoke('update:get-last-check'),
    
    onDownloadProgress: (callback) => {
        ipcRenderer.on('update:download-progress', (event, progress) => callback(progress));
    },
    
    onUpdateInfo: (callback) => {
        ipcRenderer.on('update:info', (event, info) => callback(info));
    },
    
    removeAllUpdateListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

console.log('[StarWing] Preload script loaded');
