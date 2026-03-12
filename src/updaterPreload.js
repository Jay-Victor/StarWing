const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updateAPI', {
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: (releaseInfo) => ipcRenderer.invoke('update:download', releaseInfo),
    installUpdate: (filePath) => ipcRenderer.invoke('update:install', filePath),
    getConfig: () => ipcRenderer.invoke('update:get-config'),
    setConfig: (config) => ipcRenderer.invoke('update:set-config', config),
    getLastCheckTime: () => ipcRenderer.invoke('update:get-last-check'),
    
    checkDeltaUpdate: (currentVersion, targetVersion) => 
        ipcRenderer.invoke('update:check-delta', currentVersion, targetVersion),
    downloadDeltaUpdate: (currentVersion, targetVersion) => 
        ipcRenderer.invoke('update:download-delta', currentVersion, targetVersion),
    
    closeWindow: () => ipcRenderer.send('update:close'),
    minimizeWindow: () => ipcRenderer.send('update:minimize'),
    later: () => ipcRenderer.send('update:later'),
    
    onDownloadProgress: (callback) => {
        const handler = (event, progress) => callback(progress);
        ipcRenderer.on('update:download-progress', handler);
        return () => ipcRenderer.removeListener('update:download-progress', handler);
    },
    
    onDeltaProgress: (callback) => {
        const handler = (event, progress) => callback(progress);
        ipcRenderer.on('update:delta-progress', handler);
        return () => ipcRenderer.removeListener('update:delta-progress', handler);
    },
    
    onUpdateInfo: (callback) => {
        const handler = (event, info) => callback(info);
        ipcRenderer.on('update:info', handler);
        return () => ipcRenderer.removeListener('update:info', handler);
    },
    
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

console.log('[StarWing] Updater preload script loaded');
