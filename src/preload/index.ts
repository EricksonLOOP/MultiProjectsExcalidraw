import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  db: {
    getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
    setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),
    getIntegrations: (workspaceId: string) => ipcRenderer.invoke('db:getIntegrations', workspaceId),
    upsertIntegration: (i: WebIntegration) => ipcRenderer.invoke('db:upsertIntegration', i),
    deleteIntegration: (id: string) => ipcRenderer.invoke('db:deleteIntegration', id),
    getTemplates: () => ipcRenderer.invoke('db:getTemplates'),
    upsertTemplate: (t: CustomTemplate) => ipcRenderer.invoke('db:upsertTemplate', t),
    deleteTemplate: (id: string) => ipcRenderer.invoke('db:deleteTemplate', id),
    getSnippets: (workspaceId: string) => ipcRenderer.invoke('db:getSnippets', workspaceId),
    upsertSnippet: (s: Snippet) => ipcRenderer.invoke('db:upsertSnippet', s),
    deleteSnippet: (id: string) => ipcRenderer.invoke('db:deleteSnippet', id),
    getNotes: (workspaceId: string) => ipcRenderer.invoke('db:getNotes', workspaceId),
    upsertNote: (n: Note) => ipcRenderer.invoke('db:upsertNote', n),
    deleteNote: (id: string) => ipcRenderer.invoke('db:deleteNote', id),
  },
  workspace: {
    list: () => ipcRenderer.invoke('workspace:list'),
    upsert: (w: Workspace) => ipcRenderer.invoke('workspace:upsert', w),
    delete: (id: string) => ipcRenderer.invoke('workspace:delete', id),
  },
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  listProjects: (folderPath: string) => ipcRenderer.invoke('projects:list', folderPath),
  readProject: (filePath: string) => ipcRenderer.invoke('projects:read', filePath),
  saveProject: (filePath: string, content: string) => ipcRenderer.invoke('projects:save', filePath, content),
  createProject: (folderPath: string, name: string) => ipcRenderer.invoke('projects:create', folderPath, name),
  renameProject: (oldPath: string, folderPath: string, newName: string) =>
    ipcRenderer.invoke('projects:rename', oldPath, folderPath, newName),
  deleteProject: (filePath: string) => ipcRenderer.invoke('projects:delete', filePath),
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:openFolder', folderPath),

  quickstart: {
    run: (cwd: string, command: string) => ipcRenderer.invoke('quickstart:run', { cwd, command }),
    kill: () => ipcRenderer.invoke('quickstart:kill'),
    selectFolder: () => ipcRenderer.invoke('quickstart:selectFolder'),
    onOutput: (cb: (data: { type: 'stdout' | 'stderr' | 'info'; data: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { type: 'stdout' | 'stderr' | 'info'; data: string }) => cb(data)
      ipcRenderer.on('quickstart:output', handler)
      return () => ipcRenderer.removeListener('quickstart:output', handler)
    },
    onExit: (cb: (code: number) => void) => {
      const handler = (_: Electron.IpcRendererEvent, code: number) => cb(code)
      ipcRenderer.on('quickstart:exit', handler)
      return () => ipcRenderer.removeListener('quickstart:exit', handler)
    },
    exportTemplates: (templates: CustomTemplate[]) =>
      ipcRenderer.invoke('quickstart:exportTemplates', templates),
    importTemplates: () => ipcRenderer.invoke('quickstart:importTemplates'),
  },

  ports: {
    list: () => ipcRenderer.invoke('ports:list'),
    kill: (pid: number) => ipcRenderer.invoke('ports:kill', pid),
  },

  git: {
    selectFolder: () => ipcRenderer.invoke('git:selectFolder'),
    scanRepos: (folderPath: string) => ipcRenderer.invoke('git:scanRepos', folderPath),
    openVscode: (repoPath: string) => ipcRenderer.invoke('git:openVscode', repoPath),
    openTerminal: (repoPath: string) => ipcRenderer.invoke('git:openTerminal', repoPath),
    openExplorer: (repoPath: string) => ipcRenderer.invoke('git:openExplorer', repoPath),
  },
})
