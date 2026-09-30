// Bridge between the game page and the Electron shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskbarShell', {
  setIgnore: (ignore) => ipcRenderer.send('set-ignore', ignore),
  setMode: (mode) => ipcRenderer.send('set-mode', mode),
  miniWidth: (w) => ipcRenderer.send('mini-width', w),
  quit: () => ipcRenderer.send('quit'),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  onMode: (cb) => ipcRenderer.on('mode', (_e, m) => cb(m)),
});
