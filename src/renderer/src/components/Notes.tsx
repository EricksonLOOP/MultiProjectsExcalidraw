import { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import NavBar from './NavBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Eye, Edit3, Search } from 'lucide-react'

marked.setOptions({ breaks: true, gfm: true } as Parameters<typeof marked.setOptions>[0])

function emptyNote(workspaceId: string): Note {
  const now = Date.now()
  return { id: crypto.randomUUID(), title: 'Nova nota', content: '', workspaceId, createdAt: now, updatedAt: now }
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

interface Props {
  workspaceId: string
  onBack: () => void
}

export default function Notes({ workspaceId, onBack }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [active, setActive] = useState<Note | null>(null)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNotes([])
    setActive(null)
    window.api.db.getNotes(workspaceId).then(list => {
      setNotes(list)
      if (list.length > 0) setActive(list[0])
    })
  }, [workspaceId])

  const save = useCallback((n: Note) => {
    const updated = { ...n, updatedAt: Date.now() }
    window.api.db.upsertNote(updated)
    setNotes(prev => {
      const idx = prev.findIndex(x => x.id === updated.id)
      if (idx === -1) return [updated, ...prev]
      const next = [...prev]
      next[idx] = updated
      return next.sort((a, b) => b.updatedAt - a.updatedAt)
    })
  }, [])

  const debouncedSave = useCallback((n: Note) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(n), 500)
  }, [save])

  const handleNew = () => {
    const n = emptyNote(workspaceId)
    window.api.db.upsertNote(n)
    setNotes(prev => [n, ...prev])
    setActive(n)
    setPreview(false)
  }

  const handleDelete = (id: string) => {
    window.api.db.deleteNote(id)
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      if (active?.id === id) setActive(next[0] ?? null)
      return next
    })
  }

  const updateActive = (patch: Partial<Note>) => {
    if (!active) return
    const updated = { ...active, ...patch }
    setActive(updated)
    debouncedSave(updated)
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  )

  const previewHtml = active ? marked(active.content) as string : ''

  return (
    <div className="absolute inset-0 flex flex-col">
      <NavBar title="Notas" onBack={onBack} shortcut="Ctrl+N" />
      <div
        className="flex flex-1 overflow-hidden"
        style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        {/* Lista */}
        <div className="w-60 border-r border-border flex flex-col bg-background">
          <div className="p-2 border-b border-border flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <input
                className="w-full bg-secondary border border-border rounded-md pl-6 pr-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleNew} className="shrink-0 px-2">
              <Plus className="size-3.5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                {search ? 'Nenhum resultado' : 'Nenhuma nota ainda'}
              </p>
            )}
            {filtered.map(n => (
              <button
                key={n.id}
                onClick={() => setActive(n)}
                className={cn(
                  'w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors group flex items-start justify-between gap-2',
                  active?.id === n.id ? 'bg-primary/10' : 'hover:bg-secondary'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {n.content.split('\n')[0].slice(0, 60) || 'Nota vazia'}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatDate(n.updatedAt)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(n.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                >
                  <Trash2 className="size-3" />
                </button>
              </button>
            ))}
          </div>
        </div>

        {/* Editor / Preview */}
        {active ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="border-b border-border px-4 py-2 flex gap-3 items-center bg-background">
              <Input
                className="flex-1 h-7 text-sm font-medium border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
                value={active.title}
                onChange={e => updateActive({ title: e.target.value })}
                placeholder="Título da nota"
              />
              <button
                onClick={() => setPreview(false)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  !preview ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Edit3 className="size-3" /> Editar
              </button>
              <button
                onClick={() => setPreview(true)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  preview ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Eye className="size-3" /> Preview
              </button>
            </div>

            {/* Conteúdo */}
            {!preview ? (
              <textarea
                className="flex-1 resize-none bg-background p-5 font-mono text-sm text-foreground outline-none leading-relaxed"
                placeholder={`# Título\n\nEscreva em **Markdown**...\n\n- Item 1\n- Item 2`}
                value={active.content}
                onChange={e => updateActive({ content: e.target.value })}
                spellCheck={false}
              />
            ) : (
              <div
                className="flex-1 overflow-y-auto p-5 prose prose-invert prose-sm max-w-none"
                style={{
                  color: 'var(--foreground)',
                  lineHeight: '1.7',
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <p className="text-sm">Nenhuma nota selecionada</p>
            <Button size="sm" onClick={handleNew}>
              <Plus className="size-3.5 mr-1.5" />
              Criar nota
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
