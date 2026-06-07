import { useState, useEffect, useCallback } from 'react'
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dashboard from './components/Dashboard'
import NavBar from './components/NavBar'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import WebPanel from './components/WebPanel'
import QuickStart from './components/QuickStart'

const FOLDER_KEY = 'devson-excalidraw-folder'

// Esquema de atalhos:
// Ctrl+H → Hub
// Ctrl+1 → Excalidraw
// Ctrl+2, Ctrl+3... → painéis web na ordem em que foram abertos
const HUB_KEY = 'h'
const EXCALIDRAW_KEY = '1'

export default function App() {
  const [activePanel, setActivePanel] = useState<string>('home')
  const [openWebPanels, setOpenWebPanels] = useState<WebIntegration[]>([])

  // Estado do Excalidraw
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

  // Keyboard shortcuts
  useEffect(() => {
    const webKeys = Object.fromEntries(
      openWebPanels.map((p, i) => [`${i + 2}`, p.id])
    )

    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      const key = e.key.toLowerCase()

      if (key === HUB_KEY) { e.preventDefault(); setActivePanel('home'); return }
      if (key === EXCALIDRAW_KEY) { e.preventDefault(); setActivePanel('excalidraw'); return }
      if (key === 'q') { e.preventDefault(); setActivePanel('quickstart'); return }
      if (webKeys[key]) { e.preventDefault(); setActivePanel(webKeys[key]); return }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openWebPanels])

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
    setActivePanel('excalidraw')
  }

  const handleOpenWeb = (integration: WebIntegration) => {
    setOpenWebPanels(prev =>
      prev.find(p => p.id === integration.id) ? prev : [...prev, integration]
    )
    setActivePanel(integration.id)
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

  const webShortcut = (index: number) => `Ctrl+${index + 2}`

  return (
    <div className="relative h-full overflow-hidden">

      {/* ── Hub / Dashboard ── */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ display: activePanel === 'home' ? 'flex' : 'none' }}
      >
        <Dashboard
          onOpenExcalidraw={handleOpenExcalidraw}
          onOpenWeb={handleOpenWeb}
          onOpenQuickStart={() => setActivePanel('quickstart')}
          openWebPanelIds={openWebPanels.map(p => p.id)}
        />
      </div>

      {/* ── Excalidraw ── */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ display: activePanel === 'excalidraw' ? 'flex' : 'none' }}
      >
        <NavBar title="Excalidraw" onBack={() => setActivePanel('home')} shortcut="Ctrl+1" />
        <div
          className="flex flex-1 overflow-hidden"
          style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
        >
          {folderPath ? (
            <>
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
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <p className="text-sm text-muted-foreground">Nenhum projeto aberto.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 flex-1">
              <p className="text-sm text-muted-foreground">Escolha uma pasta para seus projetos</p>
              <Button onClick={handleSelectFolder}>
                <FolderOpen />
                Escolher pasta
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Start ── */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ display: activePanel === 'quickstart' ? 'flex' : 'none' }}
      >
        <QuickStart onBack={() => setActivePanel('home')} shortcut="Ctrl+Q" />
      </div>

      {/* ── Painéis Web (sempre montados, ocultos via visibility) ── */}
      {openWebPanels.map((integration, index) => (
        <div
          key={integration.id}
          className="absolute inset-0 flex flex-col"
          style={{
            // visibility:hidden mantém o processo vivo (áudio continua)
            // display:none destruiria o webview
            visibility: activePanel === integration.id ? 'visible' : 'hidden',
            pointerEvents: activePanel === integration.id ? 'auto' : 'none',
          }}
        >
          <WebPanel
            integration={integration}
            onBack={() => setActivePanel('home')}
            shortcut={webShortcut(index)}
          />
        </div>
      ))}
    </div>
  )
}
