const { contextBridge, ipcMain } = require('electron');

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electron', {
  app: {
    getVersion: () => require('../package.json').version,
    getName: () => 'CA Management System',
  },
  ipc: {
    send: (channel, data) => {
      // Whitelist of allowed channels
      const validChannels = ['app-version', 'app-name'];
      if (validChannels.includes(channel)) {
        ipcMain.send(channel, data);
      }
    },
    receive: (channel, func) => {
      // Whitelist of allowed channels
      const validChannels = ['app-version', 'app-name'];
      if (validChannels.includes(channel)) {
        ipcMain.on(channel, (event, ...args) => func(...args));
      }
    },
  },
});
