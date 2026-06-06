import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'

function getIconPath(): string {
  const names = ['icon.png', 'icon.ico']
  const bases = [
    join(__dirname, '../../resources'),
    join(process.resourcesPath ?? '', 'resources')
  ]
  for (const base of bases) {
    for (const name of names) {
      const p = join(base, name)
      if (fs.existsSync(p)) return p
    }
  }
  return join(__dirname, '../../resources/icon.ico')
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: getIconPath(),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0d0d0d',
      symbolColor: '#ffffff',
      height: 36
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.devson.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// --- IPC Handlers ---

function registerIpcHandlers(): void {
  // Escolher pasta de projetos
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Escolher pasta para os projetos'
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // Listar projetos (.excalidraw) em uma pasta
  ipcMain.handle('projects:list', async (_event, folderPath: string) => {
    if (!fs.existsSync(folderPath)) return []
    const files = fs.readdirSync(folderPath)
    return files
      .filter((f) => f.endsWith('.excalidraw'))
      .map((f) => ({
        name: f.replace('.excalidraw', ''),
        path: join(folderPath, f),
        modifiedAt: fs.statSync(join(folderPath, f)).mtimeMs
      }))
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
  })

  // Ler conteúdo de um projeto
  ipcMain.handle('projects:read', async (_event, filePath: string) => {
    if (!fs.existsSync(filePath)) return null
    return fs.readFileSync(filePath, 'utf-8')
  })

  // Salvar projeto
  ipcMain.handle('projects:save', async (_event, filePath: string, content: string) => {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  })

  // Criar novo projeto
  ipcMain.handle('projects:create', async (_event, folderPath: string, name: string) => {
    const filePath = join(folderPath, `${name}.excalidraw`)
    if (fs.existsSync(filePath)) {
      return { error: 'Já existe um projeto com esse nome.' }
    }
    const empty = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: 'devson',
      elements: [],
      appState: { viewBackgroundColor: '#ffffff', gridSize: null },
      files: {}
    })
    fs.writeFileSync(filePath, empty, 'utf-8')
    return { path: filePath }
  })

  // Renomear projeto
  ipcMain.handle('projects:rename', async (_event, oldPath: string, folderPath: string, newName: string) => {
    const newPath = join(folderPath, `${newName}.excalidraw`)
    if (fs.existsSync(newPath)) {
      return { error: 'Já existe um projeto com esse nome.' }
    }
    fs.renameSync(oldPath, newPath)
    return { path: newPath }
  })

  // Deletar projeto
  ipcMain.handle('projects:delete', async (_event, filePath: string) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return true
  })

  // Abrir pasta no Explorer
  ipcMain.handle('shell:openFolder', async (_event, folderPath: string) => {
    shell.openPath(folderPath)
  })
}
