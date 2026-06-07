/// <reference types="vite/client" />

interface QuickstartOutput { type: 'stdout' | 'stderr' | 'info'; data: string }

interface Workspace {
  id: string
  name: string
  color: string
  createdAt: number
}

interface CustomTemplateOption {
  id: string
  label: string
  description?: string
  default: boolean
  flag: string
}

interface CustomTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  textColor: string
  commandTemplate: string
  postInstallTemplate?: string
  options: CustomTemplateOption[]
  createdAt: number
}

interface Snippet {
  id: string
  title: string
  language: string
  code: string
  tags: string[]
  workspaceId: string
  createdAt: number
  updatedAt: number
}

interface Note {
  id: string
  title: string
  content: string
  workspaceId: string
  createdAt: number
  updatedAt: number
}

interface PortInfo {
  port: number
  pid: number
  processName: string
  protocol: string
  state: string
}

interface GitRepo {
  name: string
  path: string
  branch: string
  isDirty: boolean
  lastCommit: string
}

interface WebIntegration {
  id: string
  name: string
  url: string
  description: string
  color: string
  workspaceId: string
}

interface Window {
  api: {
    db: {
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<void>
      getIntegrations: (workspaceId: string) => Promise<WebIntegration[]>
      upsertIntegration: (i: WebIntegration) => Promise<void>
      deleteIntegration: (id: string) => Promise<void>
      getTemplates: () => Promise<CustomTemplate[]>
      upsertTemplate: (t: CustomTemplate) => Promise<void>
      deleteTemplate: (id: string) => Promise<void>
      getSnippets: (workspaceId: string) => Promise<Snippet[]>
      upsertSnippet: (s: Snippet) => Promise<void>
      deleteSnippet: (id: string) => Promise<void>
      getNotes: (workspaceId: string) => Promise<Note[]>
      upsertNote: (n: Note) => Promise<void>
      deleteNote: (id: string) => Promise<void>
    }
    workspace: {
      list: () => Promise<Workspace[]>
      upsert: (w: Workspace) => Promise<void>
      delete: (id: string) => Promise<void>
    }
    selectFolder: () => Promise<string | null>
    listProjects: (folderPath: string) => Promise<ProjectFile[]>
    readProject: (filePath: string) => Promise<string | null>
    saveProject: (filePath: string, content: string) => Promise<boolean>
    createProject: (folderPath: string, name: string) => Promise<{ path?: string; error?: string }>
    renameProject: (oldPath: string, folderPath: string, newName: string) => Promise<{ path?: string; error?: string }>
    deleteProject: (filePath: string) => Promise<boolean>
    openFolder: (folderPath: string) => Promise<void>
    quickstart: {
      run: (cwd: string, command: string) => Promise<number>
      kill: () => Promise<void>
      selectFolder: () => Promise<string | null>
      onOutput: (cb: (data: QuickstartOutput) => void) => () => void
      onExit: (cb: (code: number) => void) => () => void
      exportTemplates: (templates: CustomTemplate[]) => Promise<boolean>
      importTemplates: () => Promise<unknown>
    }
    ports: {
      list: () => Promise<PortInfo[]>
      kill: (pid: number) => Promise<boolean>
    }
    git: {
      selectFolder: () => Promise<string | null>
      scanRepos: (folderPath: string) => Promise<GitRepo[]>
      openVscode: (repoPath: string) => Promise<void>
      openTerminal: (repoPath: string) => Promise<void>
      openExplorer: (repoPath: string) => Promise<void>
    }
  }
}

interface ProjectFile {
  name: string
  path: string
  modifiedAt: number
}

// Electron webview JSX element
declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string
        allowpopups?: string
        partition?: string
        useragent?: string
      },
      HTMLElement
    >
  }
}
