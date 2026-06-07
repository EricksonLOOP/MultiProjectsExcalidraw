import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
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
  }
})
