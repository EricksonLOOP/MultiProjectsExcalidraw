import { useState, useEffect } from 'react'
import { PenLine, Plus, Globe, Trash2, X, Zap, Code2, FileText, Wrench, GitBranch, Network } from 'lucide-react'

function FaviconIcon({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  try {
    const domain = new URL(url).hostname
    if (!failed) {
      return (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          className={cn('size-6 rounded-sm object-contain', className)}
          onError={() => setFailed(true)}
        />
      )
    }
  } catch { /* URL inválida */ }
  return <Globe className={cn('size-5 text-muted-foreground', className)} />
}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type HubColor = 'green' | 'yellow' | 'blue' | 'purple' | 'orange' | 'pink' | 'red'

const COLOR_MAP: Record<HubColor, { border: string; hover: string; bg: string; iconBorder: string }> = {
  green:  { border: 'border-primary/30',    hover: 'hover:border-primary hover:shadow-primary/10',      bg: 'bg-primary/10',    iconBorder: 'border-primary/20' },
  yellow: { border: 'border-yellow-500/20', hover: 'hover:border-yellow-500/50 hover:shadow-yellow-500/10', bg: 'bg-yellow-500/10', iconBorder: 'border-yellow-500/20' },
  blue:   { border: 'border-blue-500/20',   hover: 'hover:border-blue-500/50 hover:shadow-blue-500/10',  bg: 'bg-blue-500/10',   iconBorder: 'border-blue-500/20' },
  purple: { border: 'border-purple-500/20', hover: 'hover:border-purple-500/50 hover:shadow-purple-500/10', bg: 'bg-purple-500/10', iconBorder: 'border-purple-500/20' },
  orange: { border: 'border-orange-500/20', hover: 'hover:border-orange-500/50 hover:shadow-orange-500/10', bg: 'bg-orange-500/10', iconBorder: 'border-orange-500/20' },
  pink:   { border: 'border-pink-500/20',   hover: 'hover:border-pink-500/50 hover:shadow-pink-500/10',  bg: 'bg-pink-500/10',   iconBorder: 'border-pink-500/20' },
  red:    { border: 'border-red-500/20',    hover: 'hover:border-red-500/50 hover:shadow-red-500/10',    bg: 'bg-red-500/10',    iconBorder: 'border-red-500/20' },
}

function HubCard({ onClick, shortcut, color, icon, title, description }: {
  onClick: () => void
  shortcut: string
  color: HubColor
  icon: React.ReactNode
  title: string
  description: string
}) {
  const c = COLOR_MAP[color]
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-3 p-5 rounded-xl border text-left transition-all duration-200',
        'bg-card hover:shadow-lg hover:scale-[1.02]',
        c.border, c.hover
      )}
    >
      <span className="absolute top-2 right-2 text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity">
        {shortcut}
      </span>
      <div className={cn('flex items-center justify-center size-11 rounded-lg border', c.bg, c.iconBorder)}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  )
}

interface Props {
  workspaceId: string
  onOpenExcalidraw: () => void
  onOpenWeb: (integration: WebIntegration) => void
  onOpenQuickStart: () => void
  onOpenSnippets: () => void
  onOpenToolkit: () => void
  onOpenNotes: () => void
  onOpenPorts: () => void
  onOpenGit: () => void
  openWebPanelIds: string[]
}

export default function Dashboard({ workspaceId, onOpenExcalidraw, onOpenWeb, onOpenQuickStart, onOpenSnippets, onOpenToolkit, onOpenNotes, onOpenPorts, onOpenGit, openWebPanelIds }: Props) {
  const [integrations, setIntegrations] = useState<WebIntegration[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', url: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    setIntegrations([])
    window.api.db.getIntegrations(workspaceId).then(async dbInts => {
      if (dbInts.length > 0) {
        setIntegrations(dbInts)
      } else if (workspaceId === 'default') {
        // Primeira execução do workspace padrão: migra do localStorage
        try {
          const legacy = localStorage.getItem('hub-web-integrations')
          if (legacy) {
            const parsed: WebIntegration[] = JSON.parse(legacy)
            const withWs = parsed.map(i => ({ ...i, workspaceId }))
            for (const i of withWs) await window.api.db.upsertIntegration(i)
            setIntegrations(withWs)
            return
          }
        } catch { /* usa defaults */ }
        // Default: Spotify para o workspace padrão
        const spotify: WebIntegration = {
          id: crypto.randomUUID(),
          name: 'Spotify',
          url: 'https://open.spotify.com',
          description: 'Música enquanto trabalha',
          color: '',
          workspaceId,
        }
        await window.api.db.upsertIntegration(spotify)
        setIntegrations([spotify])
      }
    })
  }, [workspaceId])

  const handleAdd = () => {
    const name = form.name.trim()
    let url = form.url.trim()
    if (!name || !url) { setError('Preencha nome e URL.'); return }
    if (!url.startsWith('http')) url = 'https://' + url
    const item: WebIntegration = { id: crypto.randomUUID(), name, url, description: url, color: '', workspaceId }
    window.api.db.upsertIntegration(item)
    setIntegrations(prev => [...prev, item])
    setForm({ name: '', url: '' })
    setAdding(false)
    setError('')
  }

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.db.deleteIntegration(id)
    setIntegrations(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div
      className="flex flex-col h-full bg-background overflow-y-auto"
      style={{ paddingTop: 'var(--titlebar-height)' }}
    >
      <div className="max-w-3xl w-full mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Dev</span>
            <span className="text-foreground">son</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Suas ferramentas em um só lugar</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

          {/* Quick Start */}
          <HubCard onClick={onOpenQuickStart} shortcut="Ctrl+Q" color="yellow" icon={<Zap className="size-5 text-yellow-400" />} title="Quick Start" description="Scaffolding de projetos" />

          {/* Excalidraw */}
          <HubCard onClick={onOpenExcalidraw} shortcut="Ctrl+1" color="green" icon={<PenLine className="size-5 text-primary" />} title="Excalidraw" description="Diagramas e rascunhos" />

          {/* Snippets */}
          <HubCard onClick={onOpenSnippets} shortcut="Ctrl+S" color="blue" icon={<Code2 className="size-5 text-blue-400" />} title="Snippets" description="Trechos de código" />

          {/* Notas */}
          <HubCard onClick={onOpenNotes} shortcut="Ctrl+N" color="purple" icon={<FileText className="size-5 text-purple-400" />} title="Notas" description="Notas em Markdown" />

          {/* Dev Toolkit */}
          <HubCard onClick={onOpenToolkit} shortcut="Ctrl+T" color="orange" icon={<Wrench className="size-5 text-orange-400" />} title="Dev Toolkit" description="JSON, Base64, UUID, Hash" />

          {/* Git Repos */}
          <HubCard onClick={onOpenGit} shortcut="Ctrl+G" color="pink" icon={<GitBranch className="size-5 text-pink-400" />} title="Git Repos" description="Repositórios locais" />

          {/* Port Manager */}
          <HubCard onClick={onOpenPorts} shortcut="Ctrl+P" color="red" icon={<Network className="size-5 text-red-400" />} title="Port Manager" description="Portas em uso" />

          {/* Integrações web */}
          {integrations.map((integration, index) => {
            const isOpen = openWebPanelIds.includes(integration.id)
            const shortcut = `Ctrl+${index + 2}`
            return (
            <button
              key={integration.id}
              onClick={() => onOpenWeb(integration)}
              className={cn(
                'group relative flex flex-col gap-3 p-5 rounded-xl border text-left transition-all duration-200',
                'bg-card border-border',
                'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02]'
              )}
            >
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                {isOpen && (
                  <span className="size-1.5 rounded-full bg-primary" title="Rodando em background" />
                )}
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity">
                  {shortcut}
                </span>
                <button
                  onClick={(e) => handleRemove(integration.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
              <div className="flex items-center justify-center size-11 rounded-lg bg-secondary border border-border overflow-hidden">
                <FaviconIcon url={integration.url} />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{integration.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{integration.description}</p>
              </div>
            </button>
            )
          })}

          {/* Adicionar */}
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-2 p-5 rounded-xl border transition-all duration-200',
                'border-dashed border-border',
                'hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              <div className="flex items-center justify-center size-11 rounded-lg bg-secondary">
                <Plus className="size-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Adicionar ferramenta</p>
            </button>
          ) : (
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-primary/30 bg-card col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  {form.url ? <FaviconIcon url={form.url.startsWith('http') ? form.url : `https://${form.url}`} className="size-3.5 rounded-sm" /> : <Globe className="size-3.5 text-primary" />}
                  Nova ferramenta
                </span>
                <button onClick={() => { setAdding(false); setError('') }}>
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <Input placeholder="Nome (ex: Notion)" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-8 text-xs" />
              <Input placeholder="URL (ex: notion.so)" value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="h-8 text-xs" />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 mt-1">
                <Button size="sm" onClick={handleAdd} className="flex-1 h-7 text-xs">Adicionar</Button>
                <Button size="sm" variant="secondary" onClick={() => { setAdding(false); setError('') }} className="flex-1 h-7 text-xs">Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
