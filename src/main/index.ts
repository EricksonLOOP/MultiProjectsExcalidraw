import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import {
  initDatabase,
  getSetting, setSetting,
  getIntegrations, upsertIntegration, deleteIntegration,
  getTemplates, upsertTemplate, deleteTemplate,
  type DbWebIntegration, type DbTemplate,
} from './database'

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

  initDatabase()
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

let activeProcess: ChildProcess | null = null

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

  // Quick Start: rodar comando com output em tempo real
  ipcMain.handle('quickstart:run', (event, { cwd, command }: { cwd: string; command: string }) => {
    return new Promise<number>((resolve) => {
      if (activeProcess) { activeProcess.kill(); activeProcess = null }

      const proc = spawn(command, { cwd, shell: true, stdio: 'pipe' })
      activeProcess = proc

      const send = (type: 'stdout' | 'stderr' | 'info', data: string) => {
        event.sender.send('quickstart:output', { type, data })
      }

      send('info', `$ ${command}\n`)
      proc.stdout?.on('data', (d) => send('stdout', d.toString()))
      proc.stderr?.on('data', (d) => send('stderr', d.toString()))

      proc.on('close', (code) => {
        activeProcess = null
        event.sender.send('quickstart:exit', code ?? 0)
        resolve(code ?? 0)
      })
      proc.on('error', (err) => {
        send('stderr', `\nErro: ${err.message}\n`)
        event.sender.send('quickstart:exit', 1)
        activeProcess = null
        resolve(1)
      })
    })
  })

  ipcMain.handle('quickstart:kill', () => {
    if (activeProcess) { activeProcess.kill(); activeProcess = null }
  })

  ipcMain.handle('quickstart:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Onde criar o projeto?'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('quickstart:exportTemplates', async (_event, templates: unknown[]) => {
    const result = await dialog.showSaveDialog({
      title: 'Exportar templates do Quick Start',
      defaultPath: 'devson-templates.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false
    const data = JSON.stringify({ version: 1, exportedAt: Date.now(), templates }, null, 2)
    fs.writeFileSync(result.filePath, data, 'utf-8')
    return true
  })

  ipcMain.handle('quickstart:importTemplates', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Importar templates do Quick Start',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  })

  // ── Database ────────────────────────────────────────────────────────────────

  ipcMain.handle('db:getSetting', (_e, key: string) => getSetting(key))
  ipcMain.handle('db:setSetting', (_e, key: string, value: string) => setSetting(key, value))

  ipcMain.handle('db:getIntegrations', () => getIntegrations())
  ipcMain.handle('db:upsertIntegration', (_e, i: DbWebIntegration) => upsertIntegration(i))
  ipcMain.handle('db:deleteIntegration', (_e, id: string) => deleteIntegration(id))

  ipcMain.handle('db:getTemplates', () => getTemplates())
  ipcMain.handle('db:upsertTemplate', (_e, t: DbTemplate) => upsertTemplate(t))
  ipcMain.handle('db:deleteTemplate', (_e, id: string) => deleteTemplate(id))
}
