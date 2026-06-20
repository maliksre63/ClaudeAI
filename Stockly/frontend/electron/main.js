import { app, BrowserWindow, shell, Menu } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const isDev = !app.isPackaged

let mainWindow    = null
let backendProcess = null

function startBackend() {
  if (isDev) return
  const backendPath = path.join(process.resourcesPath, 'backend')
  const pythonExe   = path.join(backendPath, 'python', 'python.exe')
  const mainPy      = path.join(backendPath, 'main.py')
  try {
    backendProcess = spawn(pythonExe, [mainPy], { cwd: backendPath, windowsHide: true })
    backendProcess.on('exit', code => console.log('[backend] exited', code))
  } catch(e) { console.error('[backend] start failed:', e.message) }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  960,
    minHeight: 620,
    backgroundColor: '#3d0a14',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'Stockly',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  if (!isDev) Menu.setApplicationMenu(null)
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  startBackend()
  setTimeout(createWindow, isDev ? 400 : 1800)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})
