import { useState, useEffect, useRef, useCallback } from 'react'
import NavBar from './NavBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Copy, Check, Search, Tag, X } from 'lucide-react'

const LANGUAGES = [
  'text', 'javascript', 'typescript', 'python', 'rust', 'go',
  'java', 'csharp', 'cpp', 'bash', 'sql', 'html', 'css', 'json',
  'yaml', 'markdown', 'dockerfile', 'graphql', 'php', 'ruby',
]

function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }, [])
  return { copiedId, copy }
}

function emptySnippet(workspaceId: string): Snippet {
  const now = Date.now()
  return { id: crypto.randomUUID(), title: 'Novo snippet', language: 'text', code: '', tags: [], workspaceId, createdAt: now, updatedAt: now }
}

interface Props {
  workspaceId: string
  onBack: () => void
}

export default function SnippetManager({ workspaceId, onBack }: Props) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [active, setActive] = useState<Snippet | null>(null)
  const [search, setSearch] = useState('')
  const [tagInput, setTagInput] = useState('')
  const { copiedId, copy } = useCopy()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSnippets([])
    setActive(null)
    window.api.db.getSnippets(workspaceId).then(list => {
      setSnippets(list)
      if (list.length > 0) setActive(list[0])
    })
  }, [workspaceId])

  const save = useCallback((s: Snippet) => {
    const updated = { ...s, updatedAt: Date.now() }
    window.api.db.upsertSnippet(updated)
    setSnippets(prev => {
      const idx = prev.findIndex(x => x.id === updated.id)
      if (idx === -1) return [updated, ...prev]
      const next = [...prev]
      next[idx] = updated
      return next.sort((a, b) => b.updatedAt - a.updatedAt)
    })
    return updated
  }, [])

  const debouncedSave = useCallback((s: Snippet) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(s), 600)
  }, [save])

  const handleNew = () => {
    const s = emptySnippet(workspaceId)
    window.api.db.upsertSnippet(s)
    setSnippets(prev => [s, ...prev])
    setActive(s)
  }

  const handleDelete = (id: string) => {
    window.api.db.deleteSnippet(id)
    setSnippets(prev => {
      const next = prev.filter(s => s.id !== id)
      if (active?.id === id) setActive(next[0] ?? null)
      return next
    })
  }

  const updateActive = (patch: Partial<Snippet>) => {
    if (!active) return
    const updated = { ...active, ...patch }
    setActive(updated)
    debouncedSave(updated)
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag || !active || active.tags.includes(tag)) { setTagInput(''); return }
    updateActive({ tags: [...active.tags, tag] })
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    if (!active) return
    updateActive({ tags: active.tags.filter(t => t !== tag) })
  }

  const filtered = snippets.filter(s => {
    const q = search.toLowerCase()
    return s.title.toLowerCase().includes(q) ||
      s.language.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
  })

  return (
    <div className="absolute inset-0 flex flex-col">
      <NavBar title="Snippets" onBack={onBack} shortcut="Ctrl+S" />
      <div
        className="flex flex-1 overflow-hidden"
        style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        {/* Lista */}
        <div className="w-64 border-r border-border flex flex-col bg-background">
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
                {search ? 'Nenhum resultado' : 'Nenhum snippet ainda'}
              </p>
            )}
            {filtered.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s)}
                className={cn(
                  'w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors group flex items-start justify-between gap-2',
                  active?.id === s.id ? 'bg-primary/10' : 'hover:bg-secondary'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{s.language}</p>
                  {s.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {s.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[9px] bg-secondary border border-border px-1 rounded text-muted-foreground">{t}</span>
                      ))}
                      {s.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{s.tags.length - 2}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                >
                  <Trash2 className="size-3" />
                </button>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        {active ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header do editor */}
            <div className="border-b border-border px-4 py-2 flex gap-3 items-center bg-background">
              <Input
                className="flex-1 h-7 text-sm font-medium border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
                value={active.title}
                onChange={e => updateActive({ title: e.target.value })}
                placeholder="Título do snippet"
              />
              <select
                value={active.language}
                onChange={e => updateActive({ language: e.target.value })}
                className="bg-secondary border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50"
              >
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copy(active.code, active.id)}
                className="shrink-0"
              >
                {copiedId === active.id ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
              </Button>
            </div>

            {/* Tags */}
            <div className="border-b border-border px-4 py-1.5 flex gap-1.5 items-center flex-wrap bg-background">
              <Tag className="size-3 text-muted-foreground shrink-0" />
              {active.tags.map(t => (
                <span key={t} className="flex items-center gap-0.5 text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                  {t}
                  <button onClick={() => removeTag(t)} className="ml-0.5 hover:text-destructive">
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
              <input
                className="text-[10px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground min-w-16 max-w-24"
                placeholder="+ tag"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
              />
            </div>

            {/* Código */}
            <textarea
              className="flex-1 resize-none bg-[#0d0d0d] p-4 font-mono text-sm text-foreground outline-none leading-relaxed"
              placeholder="// Cole ou escreva seu snippet aqui..."
              value={active.code}
              onChange={e => updateActive({ code: e.target.value })}
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <p className="text-sm">Nenhum snippet selecionado</p>
            <Button size="sm" onClick={handleNew}>
              <Plus className="size-3.5 mr-1.5" />
              Criar snippet
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
