import { useState, useEffect, useCallback } from 'react'
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dashboard from './components/Dashboard'
import NavBar from './components/NavBar'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import WebPanel from './components/WebPanel'

const FOLDER_KEY = 'devson-excalidraw-folder'

type View =
  | { type: 'home' }
  | { type: 'excalidraw' }
  | { type: 'web'; integration: WebIntegration }

export default function App() {
  const [view, setView] = useState<View>({ type: 'home' })
  const [folderPath, setFolderPath] = useState<string | null>(() => localStorage.getItem(FOLDER_KEY))
  const [projects, setProjects] = useState<ProjectFile[]>([])
  const [activeProject, setActiveProject] = useState<ProjectFile | null>(null)

  const loadProjects = useCallback(async (folder: string) => {
    const list = await window.api.listProjects(folder)
    setProjects(list)
    return list
  }, [])

  useEffect(() => {
    if (folderPath) {
      loadProjects(folderPath).then(list => {
        if (list.length > 0 && !activeProject) setActiveProject(list[0])
      })
    }
  }, [folderPath])

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (!folder) return
    localStorage.setItem(FOLDER_KEY, folder)
    setFolderPath(folder)
    setActiveProject(null)
    const list = await loadProjects(folder)
    if (list.length > 0) setActiveProject(list[0])
  }

  const handleOpenExcalidraw = async () => {
    if (!folderPath) {
      const folder = await window.api.selectFolder()
      if (!folder) return
      localStorage.setItem(FOLDER_KEY, folder)
      setFolderPath(folder)
      const list = await loadProjects(folder)
      if (list.length > 0) setActiveProject(list[0])
    }
    setView({ type: 'excalidraw' })
  }

  const handleProjectCreated = async () => {
    if (!folderPath) return
    const list = await loadProjects(folderPath)
    if (list.length > 0) setActiveProject(list[0])
  }

  const handleProjectDeleted = async (deleted: ProjectFile) => {
    if (!folderPath) return
    const list = await loadProjects(folderPath)
    if (activeProject?.path === deleted.path) setActiveProject(list.length > 0 ? list[0] : null)
  }

  const handleProjectRenamed = async (oldPath: string, newProject: ProjectFile) => {
    if (!folderPath) return
    await loadProjects(folderPath)
    if (activeProject?.path === oldPath) setActiveProject(newProject)
  }

  const goHome = () => setView({ type: 'home' })

  // --- Dashboard ---
  if (view.type === 'home') {
    return (
      <Dashboard
        onOpenExcalidraw={handleOpenExcalidraw}
        onOpenWeb={integration => setView({ type: 'web', integration })}
      />
    )
  }

  // --- Painel Web (Spotify, etc.) ---
  if (view.type === 'web') {
    return <WebPanel integration={view.integration} onBack={goHome} />
  }

  // --- Excalidraw ---
  if (!folderPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-background">
        <h1 className="text-2xl font-semibold text-foreground">Excalidraw</h1>
        <p className="text-sm text-muted-foreground">Escolha uma pasta para armazenar seus projetos</p>
        <Button onClick={handleSelectFolder}>
          <FolderOpen />
          Escolher pasta
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <NavBar title="Excalidraw" onBack={goHome} />
      <div
        className="flex flex-1 overflow-hidden"
        style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        <Sidebar
          folderPath={folderPath}
          projects={projects}
          activeProject={activeProject}
          onSelectProject={setActiveProject}
          onProjectCreated={handleProjectCreated}
          onProjectDeleted={handleProjectDeleted}
          onProjectRenamed={handleProjectRenamed}
          onChangeFolder={handleSelectFolder}
        />
        <div className="flex-1 overflow-hidden">
          {activeProject ? (
            <Canvas key={activeProject.path} project={activeProject} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Nenhum projeto aberto. Crie um novo na barra lateral.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
