import { useState, useRef, useEffect } from 'react'

interface Props {
  folderPath: string
  projects: ProjectFile[]
  activeProject: ProjectFile | null
  onSelectProject: (p: ProjectFile) => void
  onProjectCreated: () => void
  onProjectDeleted: (p: ProjectFile) => void
  onProjectRenamed: (oldPath: string, newProject: ProjectFile) => void
  onChangeFolder: () => void
}

export default function Sidebar({
  folderPath,
  projects,
  activeProject,
  onSelectProject,
  onProjectCreated,
  onProjectDeleted,
  onProjectRenamed,
  onChangeFolder
}: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; project: ProjectFile } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creating) newInputRef.current?.focus()
  }, [creating])

  useEffect(() => {
    if (renamingPath) renameInputRef.current?.focus()
  }, [renamingPath])

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    const result = await window.api.createProject(folderPath, name)
    if (result.error) {
      setError(result.error)
      return
    }
    setCreating(false)
    setNewName('')
    setError(null)
    onProjectCreated()
  }

  const handleRename = async (project: ProjectFile) => {
    const name = renameName.trim()
    if (!name || name === project.name) {
      setRenamingPath(null)
      return
    }
    const result = await window.api.renameProject(project.path, folderPath, name)
    if (result.error) {
      setError(result.error)
      return
    }
    setRenamingPath(null)
    setError(null)
    onProjectRenamed(project.path, { name, path: result.path!, modifiedAt: Date.now() })
  }

  const handleDelete = async (project: ProjectFile) => {
    if (!confirm(`Deletar "${project.name}"? Essa ação não pode ser desfeita.`)) return
    await window.api.deleteProject(project.path)
    onProjectDeleted(project)
    setContextMenu(null)
  }

  const folderName = folderPath.split(/[\\/]/).pop() ?? folderPath

  return (
    <div style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      paddingTop: 'var(--titlebar-height)'
    }}>
      {/* Cabeçalho da pasta */}
      <div style={{
        padding: '12px 12px 8px',
        borderBottom: '1px solid var(--border)'
      }}>
        <button
          onClick={() => window.api.openFolder(folderPath)}
          title={folderPath}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
            padding: '6px 8px',
            borderRadius: '6px',
            color: 'var(--text-muted)',
            fontSize: '12px',
            textAlign: 'left',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis'
          }}
        >
          <span style={{ flexShrink: 0 }}>📁</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{folderName}</span>
        </button>
        <button
          onClick={onChangeFolder}
          style={{
            width: '100%',
            padding: '4px 8px',
            borderRadius: '6px',
            color: 'var(--text-muted)',
            fontSize: '11px',
            textAlign: 'left'
          }}
        >
          Trocar pasta
        </button>
      </div>

      {/* Lista de projetos */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {projects.map((p) => (
          <div
            key={p.path}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, project: p })
            }}
          >
            {renamingPath === p.path ? (
              <div style={{ padding: '2px 12px' }}>
                <input
                  ref={renameInputRef}
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  onBlur={() => handleRename(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(p)
                    if (e.key === 'Escape') setRenamingPath(null)
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--accent)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    outline: 'none',
                    fontSize: '13px',
                    color: 'var(--text)'
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => onSelectProject(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '7px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: activeProject?.path === p.path ? 'var(--accent)' : 'var(--text)',
                  background: activeProject?.path === p.path ? 'var(--bg-hover)' : 'transparent',
                  borderLeft: activeProject?.path === p.path
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => {
                  if (activeProject?.path !== p.path)
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (activeProject?.path !== p.path)
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <span style={{ fontSize: '14px' }}>✏️</span>
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{p.name}</span>
              </button>
            )}
          </div>
        ))}

        {projects.length === 0 && !creating && (
          <p style={{
            padding: '16px',
            color: 'var(--text-muted)',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            Nenhum projeto ainda.<br />Crie um novo abaixo.
          </p>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          padding: '8px 12px',
          color: 'var(--danger)',
          fontSize: '12px',
          borderTop: '1px solid var(--border)'
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>×</button>
        </div>
      )}

      {/* Input de novo projeto */}
      {creating && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
          <input
            ref={newInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do projeto"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            style={{
              width: '100%',
              background: 'var(--bg-hover)',
              border: '1px solid var(--accent)',
              borderRadius: '6px',
              padding: '6px 10px',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--text)'
            }}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button
              onClick={handleCreate}
              style={{
                flex: 1,
                background: 'var(--accent)',
                color: '#1e1e2e',
                padding: '5px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Criar
            </button>
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              style={{
                flex: 1,
                background: 'var(--bg-hover)',
                padding: '5px',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Botão novo projeto */}
      {!creating && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setCreating(true)}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: '#1e1e2e',
              padding: '8px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            + Novo projeto
          </button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '4px',
            zIndex: 1000,
            minWidth: '140px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setRenamingPath(contextMenu.project.path)
              setRenameName(contextMenu.project.name)
              setContextMenu(null)
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '7px 12px',
              textAlign: 'left',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--text)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-active)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Renomear
          </button>
          <button
            onClick={() => handleDelete(contextMenu.project)}
            style={{
              display: 'block',
              width: '100%',
              padding: '7px 12px',
              textAlign: 'left',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--danger)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-active)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Deletar
          </button>
        </div>
      )}
    </div>
  )
}
