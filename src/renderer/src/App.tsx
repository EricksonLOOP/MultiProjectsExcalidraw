import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'

const FOLDER_KEY = 'excalidraw-projects-folder'

export default function App() {
  const [folderPath, setFolderPath] = useState<string | null>(() => {
    return localStorage.getItem(FOLDER_KEY)
  })
  const [projects, setProjects] = useState<ProjectFile[]>([])
  const [activeProject, setActiveProject] = useState<ProjectFile | null>(null)

  const loadProjects = useCallback(async (folder: string) => {
    const list = await window.api.listProjects(folder)
    setProjects(list)
    return list
  }, [])

  useEffect(() => {
    if (folderPath) {
      loadProjects(folderPath).then((list) => {
        if (list.length > 0 && !activeProject) {
          setActiveProject(list[0])
        }
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

  const handleProjectCreated = async () => {
    if (!folderPath) return
    const list = await loadProjects(folderPath)
    if (list.length > 0) setActiveProject(list[0])
  }

  const handleProjectDeleted = async (deleted: ProjectFile) => {
    if (!folderPath) return
    const list = await loadProjects(folderPath)
    if (activeProject?.path === deleted.path) {
      setActiveProject(list.length > 0 ? list[0] : null)
    }
  }

  const handleProjectRenamed = async (oldPath: string, newProject: ProjectFile) => {
    if (!folderPath) return
    await loadProjects(folderPath)
    if (activeProject?.path === oldPath) {
      setActiveProject(newProject)
    }
  }

  if (!folderPath) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '16px',
        background: 'var(--bg)'
      }}>
        <h1 style={{ fontSize: '24px', color: 'var(--text)', fontWeight: 600 }}>
          MultiProjects Excalidraw
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Escolha uma pasta para armazenar seus projetos
        </p>
        <button
          onClick={handleSelectFolder}
          style={{
            background: 'var(--accent)',
            color: '#1e1e2e',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600
          }}
        >
          Escolher pasta
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
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
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeProject ? (
          <Canvas key={activeProject.path} project={activeProject} />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: '15px'
          }}>
            Nenhum projeto aberto. Crie um novo na barra lateral.
          </div>
        )}
      </div>
    </div>
  )
}
