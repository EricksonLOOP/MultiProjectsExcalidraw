import { useState, useRef, useEffect } from 'react'
import { FolderOpen, FileText, Plus, X, Pencil, Trash2, FolderSync } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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
    if (result.error) { setError(result.error); return }
    setCreating(false)
    setNewName('')
    setError(null)
    onProjectCreated()
  }

  const handleRename = async (project: ProjectFile) => {
    const name = renameName.trim()
    if (!name || name === project.name) { setRenamingPath(null); return }
    const result = await window.api.renameProject(project.path, folderPath, name)
    if (result.error) { setError(result.error); return }
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
    <div
      className="flex flex-col h-full bg-card border-r border-border"
      style={{ width: 260, minWidth: 260, paddingTop: 'var(--titlebar-height)' }}
    >
      {/* Cabeçalho da pasta */}
      <div className="px-3 py-2 border-b border-border space-y-0.5">
        <button
          onClick={() => window.api.openFolder(folderPath)}
          title={folderPath}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors truncate"
        >
          <FolderOpen className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{folderName}</span>
        </button>
        <button
          onClick={onChangeFolder}
          className="flex items-center gap-2 w-full px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <FolderSync className="size-3 shrink-0" />
          Trocar pasta
        </button>
      </div>

      {/* Lista de projetos */}
      <div className="flex-1 overflow-y-auto py-2">
        {projects.map((p) => (
          <div
            key={p.path}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, project: p })
            }}
          >
            {renamingPath === p.path ? (
              <div className="px-3 py-1">
                <Input
                  ref={renameInputRef}
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  onBlur={() => handleRename(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(p)
                    if (e.key === 'Escape') setRenamingPath(null)
                  }}
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <button
                onClick={() => onSelectProject(p)}
                className={cn(
                  'flex items-center gap-2 w-full px-4 py-1.5 text-left text-sm transition-colors border-l-2',
                  activeProject?.path === p.path
                    ? 'border-primary bg-accent text-primary'
                    : 'border-transparent text-foreground hover:bg-accent/50'
                )}
              >
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{p.name}</span>
              </button>
            )}
          </div>
        ))}

        {projects.length === 0 && !creating && (
          <p className="px-4 py-4 text-xs text-muted-foreground text-center">
            Nenhum projeto ainda.<br />Crie um novo abaixo.
          </p>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border text-xs text-destructive">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Input de novo projeto */}
      {creating && (
        <div className="px-3 py-2 border-t border-border space-y-2">
          <Input
            ref={newInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do projeto"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} className="flex-1 h-7 text-xs">
              Criar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { setCreating(false); setNewName('') }}
              className="flex-1 h-7 text-xs"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Botão novo projeto */}
      {!creating && (
        <div className="p-3 border-t border-border">
          <Button onClick={() => setCreating(true)} className="w-full">
            <Plus />
            Novo projeto
          </Button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setRenamingPath(contextMenu.project.path)
              setRenameName(contextMenu.project.name)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="size-3.5" />
            Renomear
          </button>
          <button
            onClick={() => handleDelete(contextMenu.project)}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-3.5" />
            Deletar
          </button>
        </div>
      )}
    </div>
  )
}
