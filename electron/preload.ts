import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  setTitleBarOverlay: (opts: { color: string; symbolColor: string }) =>
    ipcRenderer.send('update-titlebar', opts),
})
