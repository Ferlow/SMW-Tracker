const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startServer: (data) => ipcRenderer.send('start-server', data),
    stopServer: () => ipcRenderer.send('stop-server'),
    onServerStatus: (callback) => ipcRenderer.on('server-status', callback)
});