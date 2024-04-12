const { contextBridge, ipcRenderer } = require('electron');
const { Titlebar, TitlebarColor } = require('custom-electron-titlebar');

contextBridge.exposeInMainWorld('electronAPI', {
    startServer: (data) => ipcRenderer.send('start-server', data),
    stopServer: () => ipcRenderer.send('stop-server'),
    onServerStatus: (callback) => ipcRenderer.on('server-status', callback),
    onLoadData: (callback) => ipcRenderer.on('load-data', callback),
    onSaveData: (callback) => ipcRenderer.on('save-data', callback),
    sendSaveData: (data) => ipcRenderer.send('save-data-response', data),
    onCloseSaveDate: (callback) => ipcRenderer.on('close-save-data', callback),
    sendCloseSaveData: (data) => ipcRenderer.send('close-save-data-response', data)

});

window.addEventListener('DOMContentLoaded', () => {
    // Title bar implementation
    new Titlebar({
        overflow: 'auto',
        backgroundColor: TitlebarColor.fromHex('#f0f0f1'),
        maximizable: false,
    });
  });