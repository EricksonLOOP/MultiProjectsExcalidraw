/// <reference types="vite/client" />

interface Window {
  api: {
    selectFolder: () => Promise<string | null>
    listProjects: (folderPath: string) => Promise<ProjectFile[]>
    readProject: (filePath: string) => Promise<string | null>
    saveProject: (filePath: string, content: string) => Promise<boolean>
    createProject: (folderPath: string, name: string) => Promise<{ path?: string; error?: string }>
    renameProject: (oldPath: string, folderPath: string, newName: string) => Promise<{ path?: string; error?: string }>
    deleteProject: (filePath: string) => Promise<boolean>
    openFolder: (folderPath: string) => Promise<void>
  }
}

interface ProjectFile {
  name: string
  path: string
  modifiedAt: number
}
