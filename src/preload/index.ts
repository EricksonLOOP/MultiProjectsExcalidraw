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
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:openFolder', folderPath)
})
