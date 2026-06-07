/// <reference types="vite/client" />

interface QuickstartOutput { type: 'stdout' | 'stderr' | 'info'; data: string }

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

interface Window {
  api: {
    db: {
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<void>
      getIntegrations: () => Promise<WebIntegration[]>
      upsertIntegration: (i: WebIntegration) => Promise<void>
      deleteIntegration: (id: string) => Promise<void>
      getTemplates: () => Promise<CustomTemplate[]>
      upsertTemplate: (t: CustomTemplate) => Promise<void>
      deleteTemplate: (id: string) => Promise<void>
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
  }
}

interface ProjectFile {
  name: string
  path: string
  modifiedAt: number
}

interface WebIntegration {
  id: string
  name: string
  url: string
  description: string
  color: string
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
