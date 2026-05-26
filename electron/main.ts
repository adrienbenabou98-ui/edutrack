import { app, BrowserWindow, shell, Menu, ipcMain } from 'electron'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'
let win: BrowserWindow | null = null

function getIconPath() {
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  return app.isPackaged
    ? path.join(process.resourcesPath, iconFile)
    : path.join(__dirname, '../../build', iconFile)
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  win.once('ready-to-show', () => win!.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
  ipcMain.on('win-minimize', () => win?.minimize())
  ipcMain.on('win-maximize', () => win?.isMaximized() ? win.unmaximize() : win?.maximize())
  ipcMain.on('win-close',    () => win?.close())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
