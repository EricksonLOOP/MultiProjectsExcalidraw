import { useState, useEffect, useCallback } from 'react'
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dashboard from './components/Dashboard'
import NavBar from './components/NavBar'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import WebPanel from './components/WebPanel'
import QuickStart from './components/QuickStart'
import DevToolkit from './components/DevToolkit'
import SnippetManager from './components/SnippetManager'
import Notes from './components/Notes'
import PortManager from './components/PortManager'
import GitRepos from './components/GitRepos'
import WorkspaceSwitcher from './components/WorkspaceSwitcher'

// Atalhos de teclado:
// Ctrl+H → Hub      Ctrl+1 → Excalidraw  Ctrl+Q → Quick Start
// Ctrl+S → Snippets Ctrl+T → Dev Toolkit  Ctrl+N → Notas
// Ctrl+G → Git      Ctrl+P → Ports        Ctrl+2,3... → web panels

export default function App() {
  const [activePanel, setActivePanel] = useState<string>('home')
  const [openWebPanels, setOpenWebPanels] = useState<WebIntegration[]>([])

  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectFile[]>([])
  const [activeProject, setActiveProject] = useState<ProjectFile | null>(null)

  // ── Workspaces ───────────────────────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('default')

  useEffect(() => {
    Promise.all([
      window.api.workspace.list(),
      window.api.db.getSetting('active-workspace'),
    ]).then(([list, activeId]) => {
      setWorkspaces(list)
      if (activeId && list.some(w => w.id === activeId)) {
        setCurrentWorkspaceId(activeId)
      }
    })
  }, [])

  // Carrega pasta do Excalidraw quando workspace muda
  useEffect(() => {
    const key = `excalidraw-folder:${currentWorkspaceId}`
    const load = async () => {
      const saved = await window.api.db.getSetting(key)
      if (saved) {
        setFolderPath(saved)
        return
      }
      if (currentWorkspaceId === 'default') {
        // Migração: tenta chave legada
        const legacySetting = await window.api.db.getSetting('excalidraw-folder')
        if (legacySetting) {
          setFolderPath(legacySetting)
          window.api.db.setSetting(key, legacySetting)
          return
        }
        const legacy = localStorage.getItem('devson-excalidraw-folder')
        if (legacy) {
          setFolderPath(legacy)
          window.api.db.setSetting(key, legacy)
          return
        }
      }
      setFolderPath(null)
    }
    setProjects([])
    setActiveProject(null)
    load()
  }, [currentWorkspaceId])

  const handleWorkspaceSwitch = useCallback((id: string) => {
    setCurrentWorkspaceId(id)
    window.api.db.setSetting('active-workspace', id)
    setOpenWebPanels([])
    setActivePanel('home')
  }, [])

  const handleWorkspaceCreate = useCallback(async (name: string, color: string) => {
    const id = crypto.randomUUID()
    const w: Workspace = { id, name, color, createdAt: Date.now() }
    await window.api.workspace.upsert(w)
    setWorkspaces(prev => [...prev, w])
    handleWorkspaceSwitch(id)
  }, [handleWorkspaceSwitch])

  const handleWorkspaceRename = useCallback(async (id: string, name: string, color: string) => {
    const existing = workspaces.find(w => w.id === id)
    if (!existing) return
    const updated = { ...existing, name, color }
    await window.api.workspace.upsert(updated)
    setWorkspaces(prev => prev.map(w => w.id === id ? updated : w))
  }, [workspaces])

  const handleWorkspaceDelete = useCallback(async (id: string) => {
    await window.api.workspace.delete(id)
    setWorkspaces(prev => {
      const next = prev.filter(w => w.id !== id)
      if (currentWorkspaceId === id && next.length > 0) {
        handleWorkspaceSwitch(next[0].id)
      }
      return next
    })
  }, [currentWorkspaceId, handleWorkspaceSwitch])

  // ── Projetos ─────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    const webKeys = Object.fromEntries(openWebPanels.map((p, i) => [`${i + 2}`, p.id]))

    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      const key = e.key.toLowerCase()

      const shortcuts: Record<string, string> = {
        h: 'home', '1': 'excalidraw', q: 'quickstart',
        s: 'snippets', t: 'toolkit', n: 'notes', g: 'git', p: 'ports',
      }

      if (key in shortcuts) { e.preventDefault(); setActivePanel(shortcuts[key]); return }
      if (webKeys[key]) { e.preventDefault(); setActivePanel(webKeys[key]); return }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openWebPanels])

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (!folder) return
    window.api.db.setSetting(`excalidraw-folder:${currentWorkspaceId}`, folder)
    setFolderPath(folder)
    setActiveProject(null)
    const list = await loadProjects(folder)
    if (list.length > 0) setActiveProject(list[0])
  }

  const handleOpenExcalidraw = async () => {
    if (!folderPath) {
      const folder = await window.api.selectFolder()
      if (!folder) return
      window.api.db.setSetting(`excalidraw-folder:${currentWorkspaceId}`, folder)
      setFolderPath(folder)
      const list = await loadProjects(folder)
      if (list.length > 0) setActiveProject(list[0])
    }
    setActivePanel('excalidraw')
  }

  const handleOpenWeb = (integration: WebIntegration) => {
    setOpenWebPanels(prev => prev.find(p => p.id === integration.id) ? prev : [...prev, integration])
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
  const goHome = () => setActivePanel('home')

  return (
    <div className="relative h-full overflow-hidden">

      {/* ── Workspace Switcher (sempre visível na barra de título) ── */}
      <div
        className="absolute left-2 z-50 flex items-center"
        style={{ top: 0, height: 'var(--titlebar-height)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onSwitch={handleWorkspaceSwitch}
          onCreate={handleWorkspaceCreate}
          onRename={handleWorkspaceRename}
          onDelete={handleWorkspaceDelete}
        />
      </div>

      {/* ── Hub / Dashboard ── */}
      <div className="absolute inset-0 flex flex-col" style={{ display: activePanel === 'home' ? 'flex' : 'none' }}>
        <Dashboard
          workspaceId={currentWorkspaceId}
          onOpenExcalidraw={handleOpenExcalidraw}
          onOpenWeb={handleOpenWeb}
          onOpenQuickStart={() => setActivePanel('quickstart')}
          onOpenSnippets={() => setActivePanel('snippets')}
          onOpenToolkit={() => setActivePanel('toolkit')}
          onOpenNotes={() => setActivePanel('notes')}
          onOpenPorts={() => setActivePanel('ports')}
          onOpenGit={() => setActivePanel('git')}
          openWebPanelIds={openWebPanels.map(p => p.id)}
        />
      </div>

      {/* ── Excalidraw ── */}
      <div className="absolute inset-0 flex flex-col" style={{ display: activePanel === 'excalidraw' ? 'flex' : 'none' }}>
        <NavBar title="Excalidraw" onBack={goHome} shortcut="Ctrl+1" />
        <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}>
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
      <div className="absolute inset-0 flex flex-col" style={{ display: activePanel === 'quickstart' ? 'flex' : 'none' }}>
        <QuickStart onBack={goHome} shortcut="Ctrl+Q" />
      </div>

      {/* ── Snippets ── */}
      <div className="absolute inset-0 flex flex-col" style={{ display: activePanel === 'snippets' ? 'flex' : 'none' }}>
        <SnippetManager workspaceId={currentWorkspaceId} onBack={goHome} />
      </div>

      {/* ── Dev Toolkit ── */}
      <div className="absolute inset-0 flex flex-col" style={{ display: activePanel === 'toolkit' ? 'flex' : 'none' }}>
        <DevToolkit onBack={goHome} />
      </div>

      {/* ── Notas ── */}
      <div className="absolute inset-0 flex flex-col" style={{ display: activePanel === 'notes' ? 'flex' : 'none' }}>
        <Notes workspaceId={currentWorkspaceId} onBack={goHome} />
      </div>

      {/* ── Port Manager ── */}
      <div className="absolute inset-0 flex flex-col" style={{ display: activePanel === 'ports' ? 'flex' : 'none' }}>
        <PortManager onBack={goHome} />
      </div>

      {/* ── Git Repos ── */}
      <div className="absolute inset-0 flex flex-col" style={{ display: activePanel === 'git' ? 'flex' : 'none' }}>
        <GitRepos onBack={goHome} />
      </div>

      {/* ── Painéis Web (sempre montados, ocultos via visibility) ── */}
      {openWebPanels.map((integration, index) => (
        <div
          key={integration.id}
          className="absolute inset-0 flex flex-col"
          style={{
            visibility: activePanel === integration.id ? 'visible' : 'hidden',
            pointerEvents: activePanel === integration.id ? 'auto' : 'none',
          }}
        >
          <WebPanel
            integration={integration}
            onBack={goHome}
            shortcut={webShortcut(index)}
          />
        </div>
      ))}
    </div>
  )
}
