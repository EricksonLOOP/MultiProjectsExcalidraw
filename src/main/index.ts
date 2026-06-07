import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import {
  initDatabase,
  getSetting, setSetting,
  getWorkspaces, upsertWorkspace, deleteWorkspace,
  getIntegrations, upsertIntegration, deleteIntegration,
  getTemplates, upsertTemplate, deleteTemplate,
  getSnippets, upsertSnippet, deleteSnippet,
  getNotes, upsertNote, deleteNote,
  type DbWorkspace, type DbWebIntegration, type DbTemplate, type DbSnippet, type DbNote,
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

  ipcMain.handle('workspace:list', () => getWorkspaces())
  ipcMain.handle('workspace:upsert', (_e, w: DbWorkspace) => upsertWorkspace(w))
  ipcMain.handle('workspace:delete', (_e, id: string) => deleteWorkspace(id))

  ipcMain.handle('db:getIntegrations', (_e, workspaceId: string) => getIntegrations(workspaceId))
  ipcMain.handle('db:upsertIntegration', (_e, i: DbWebIntegration) => upsertIntegration(i))
  ipcMain.handle('db:deleteIntegration', (_e, id: string) => deleteIntegration(id))

  ipcMain.handle('db:getTemplates', () => getTemplates())
  ipcMain.handle('db:upsertTemplate', (_e, t: DbTemplate) => upsertTemplate(t))
  ipcMain.handle('db:deleteTemplate', (_e, id: string) => deleteTemplate(id))

  ipcMain.handle('db:getSnippets', (_e, workspaceId: string) => getSnippets(workspaceId))
  ipcMain.handle('db:upsertSnippet', (_e, s: DbSnippet) => upsertSnippet(s))
  ipcMain.handle('db:deleteSnippet', (_e, id: string) => deleteSnippet(id))

  ipcMain.handle('db:getNotes', (_e, workspaceId: string) => getNotes(workspaceId))
  ipcMain.handle('db:upsertNote', (_e, n: DbNote) => upsertNote(n))
  ipcMain.handle('db:deleteNote', (_e, id: string) => deleteNote(id))

  // ── Port Manager ─────────────────────────────────────────────────────────────

  ipcMain.handle('ports:list', async () => {
    return new Promise<PortInfo[]>((resolve) => {
      const proc = spawn('netstat', ['-ano', '-p', 'TCP'], { shell: true, stdio: 'pipe' })
      let out = ''
      proc.stdout?.on('data', (d) => { out += d.toString() })
      proc.on('close', () => {
        const pidNames = new Map<number, string>()
        const pidsNeeded = new Set<number>()
        const ports: PortInfo[] = []

        for (const line of out.split('\n')) {
          const parts = line.trim().split(/\s+/)
          if (parts.length < 5) continue
          const [proto, local, , state, pidStr] = parts
          if (proto !== 'TCP') continue
          const portMatch = local.match(/:(\d+)$/)
          if (!portMatch) continue
          const port = parseInt(portMatch[1])
          const pid = parseInt(pidStr)
          if (isNaN(port) || isNaN(pid)) continue
          ports.push({ port, pid, processName: '', protocol: 'TCP', state })
          pidsNeeded.add(pid)
        }

        if (pidsNeeded.size === 0) { resolve([]); return }

        const pidList = [...pidsNeeded].join(',')
        const tl = spawn('tasklist', ['/FI', `PID eq ${[...pidsNeeded][0]}`, '/FO', 'CSV', '/NH'], { shell: true, stdio: 'pipe' })
        let tlOut = ''
        tl.stdout?.on('data', (d) => { tlOut += d.toString() })
        tl.on('close', () => {
          for (const line of tlOut.split('\n')) {
            const m = line.match(/"([^"]+)","(\d+)"/)
            if (m) pidNames.set(parseInt(m[2]), m[1].replace('.exe', ''))
          }

          // Get all process names in one call
          const wmic = spawn('wmic', ['process', 'get', 'ProcessId,Name', '/FORMAT:CSV'], { shell: true, stdio: 'pipe' })
          let wmicOut = ''
          wmic.stdout?.on('data', (d) => { wmicOut += d.toString() })
          wmic.on('close', () => {
            for (const line of wmicOut.split('\n')) {
              const parts = line.trim().split(',')
              if (parts.length >= 3) {
                const name = parts[1]?.trim()
                const pid = parseInt(parts[2]?.trim())
                if (name && !isNaN(pid)) pidNames.set(pid, name.replace('.exe', ''))
              }
            }
            for (const p of ports) {
              p.processName = pidNames.get(p.pid) ?? 'Unknown'
            }
            const seen = new Set<number>()
            const unique = ports.filter(p => {
              if (seen.has(p.port)) return false
              seen.add(p.port)
              return true
            })
            resolve(unique.sort((a, b) => a.port - b.port))
          })
          wmic.on('error', () => {
            for (const p of ports) p.processName = pidNames.get(p.pid) ?? 'Unknown'
            resolve(ports.sort((a, b) => a.port - b.port))
          })
        })
        tl.on('error', () => resolve(ports))
        void pidList
      })
      proc.on('error', () => resolve([]))
    })
  })

  ipcMain.handle('ports:kill', async (_e, pid: number) => {
    return new Promise<boolean>((resolve) => {
      const proc = spawn('taskkill', ['/PID', String(pid), '/F'], { shell: true, stdio: 'pipe' })
      proc.on('close', (code) => resolve(code === 0))
      proc.on('error', () => resolve(false))
    })
  })

  // ── Git Repos Browser ─────────────────────────────────────────────────────

  ipcMain.handle('git:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Escolher pasta para escanear repositórios git'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('git:scanRepos', async (_e, folderPath: string) => {
    const repos: GitRepo[] = []

    const scanDir = (dir: string, depth: number) => {
      if (depth > 3) return
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        const hasGit = entries.some(e => e.isDirectory() && e.name === '.git')
        if (hasGit) {
          repos.push({ name: dir.split(/[\\/]/).pop() ?? dir, path: dir, branch: '', isDirty: false, lastCommit: '' })
          return
        }
        for (const e of entries) {
          if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
            scanDir(`${dir}/${e.name}`, depth + 1)
          }
        }
      } catch { /* skip unreadable */ }
    }

    scanDir(folderPath, 0)

    for (const repo of repos) {
      try {
        const runGit = (args: string[]) => new Promise<string>((res) => {
          const p = spawn('git', ['-C', repo.path, ...args], { shell: true, stdio: 'pipe' })
          let o = ''
          p.stdout?.on('data', (d) => { o += d.toString() })
          p.on('close', () => res(o.trim()))
          p.on('error', () => res(''))
        })
        repo.branch = await runGit(['branch', '--show-current'])
        const status = await runGit(['status', '--short'])
        repo.isDirty = status.length > 0
        const log = await runGit(['log', '-1', '--pretty=format:%s'])
        repo.lastCommit = log || '—'
      } catch { /* skip */ }
    }

    return repos
  })

  ipcMain.handle('git:openVscode', (_e, repoPath: string) => {
    spawn('code', [repoPath], { shell: true, detached: true, stdio: 'ignore' })
  })

  ipcMain.handle('git:openTerminal', (_e, repoPath: string) => {
    spawn('cmd', ['/K', `cd /D "${repoPath}"`], { shell: true, detached: true, stdio: 'ignore' })
  })

  ipcMain.handle('git:openExplorer', (_e, repoPath: string) => {
    shell.openPath(repoPath)
  })
}
