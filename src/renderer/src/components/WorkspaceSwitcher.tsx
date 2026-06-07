import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const WORKSPACE_COLORS: Record<string, { dot: string; label: string }> = {
  slate:  { dot: '#64748b', label: 'Cinza' },
  blue:   { dot: '#3b82f6', label: 'Azul' },
  green:  { dot: '#22c55e', label: 'Verde' },
  orange: { dot: '#f97316', label: 'Laranja' },
  purple: { dot: '#a855f7', label: 'Roxo' },
  pink:   { dot: '#ec4899', label: 'Rosa' },
  red:    { dot: '#ef4444', label: 'Vermelho' },
  yellow: { dot: '#eab308', label: 'Amarelo' },
}

interface Props {
  workspaces: Workspace[]
  currentWorkspaceId: string
  onSwitch: (id: string) => void
  onCreate: (name: string, color: string) => Promise<void>
  onRename: (id: string, name: string, color: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type EditState = { id: string | null; name: string; color: string }

export default function WorkspaceSwitcher({ workspaces, currentWorkspaceId, onSwitch, onCreate, onRename, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EditState | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const current = workspaces.find(w => w.id === currentWorkspaceId)
  const dotColor = WORKSPACE_COLORS[current?.color ?? 'slate']?.dot ?? '#64748b'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setEditing(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openCreate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing({ id: null, name: '', color: 'blue' })
  }

  const openRename = (e: React.MouseEvent, w: Workspace) => {
    e.stopPropagation()
    setEditing({ id: w.id, name: w.name, color: w.color })
  }

  const handleDelete = async (e: React.MouseEvent, w: Workspace) => {
    e.stopPropagation()
    if (workspaces.length <= 1) return
    if (!confirm(`Deletar o workspace "${w.name}"?\n\nTodos os snippets, notas e integrações web deste workspace serão apagados permanentemente.`)) return
    await onDelete(w.id)
  }

  const handleSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!editing || !editing.name.trim()) return
    if (editing.id === null) {
      await onCreate(editing.name.trim(), editing.color)
    } else {
      await onRename(editing.id, editing.name.trim(), editing.color)
    }
    setEditing(null)
  }

  const handleSwitch = (id: string) => {
    onSwitch(id)
    setOpen(false)
    setEditing(null)
  }

  return (
    <div ref={ref} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="relative">
      {/* Trigger */}
      <button
        onClick={() => { setOpen(o => !o); setEditing(null) }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
      >
        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="max-w-[100px] truncate font-medium">{current?.name ?? 'Workspace'}</span>
        <ChevronDown className={cn('size-3 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-60 bg-popover border border-border rounded-lg shadow-2xl z-[9999] py-1 overflow-hidden">

          {/* Lista de workspaces */}
          <div className="max-h-52 overflow-y-auto">
            {workspaces.map(w => (
              <div
                key={w.id}
                onClick={() => handleSwitch(w.id)}
                className="group flex items-center gap-2 px-3 py-2 hover:bg-secondary/60 cursor-pointer"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: WORKSPACE_COLORS[w.color]?.dot ?? '#64748b' }}
                />
                <span className="flex-1 text-xs truncate text-foreground">{w.name}</span>
                {w.id === currentWorkspaceId && <Check className="size-3 text-primary shrink-0" />}
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => openRename(e, w)}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                    title="Renomear"
                  >
                    <Pencil className="size-2.5" />
                  </button>
                  <button
                    onClick={e => handleDelete(e, w)}
                    disabled={workspaces.length <= 1}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive disabled:opacity-30"
                    title="Deletar workspace"
                  >
                    <Trash2 className="size-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="my-1 border-t border-border" />

          {/* Formulário de edição / criação */}
          {editing ? (
            <div className="px-3 py-2 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-medium text-muted-foreground">
                {editing.id ? 'Renomear workspace' : 'Novo workspace'}
              </p>
              <input
                autoFocus
                className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                placeholder="Nome do workspace"
                value={editing.name}
                onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') setEditing(null)
                }}
              />
              {/* Paleta de cores */}
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(WORKSPACE_COLORS).map(([key, { dot }]) => (
                  <button
                    key={key}
                    onClick={() => setEditing(prev => prev ? { ...prev, color: key } : prev)}
                    className={cn(
                      'size-4 rounded-full transition-all',
                      editing.color === key && 'ring-2 ring-white ring-offset-1 ring-offset-popover scale-110'
                    )}
                    style={{ backgroundColor: dot }}
                    title={WORKSPACE_COLORS[key].label}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleSave}
                  className="flex-1 py-1 text-[10px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  {editing.id ? 'Salvar' : 'Criar'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setEditing(null) }}
                  className="flex-1 py-1 text-[10px] bg-secondary text-muted-foreground rounded hover:bg-secondary/70 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={openCreate}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Plus className="size-3" />
              Novo workspace
            </button>
          )}
        </div>
      )}
    </div>
  )
}
