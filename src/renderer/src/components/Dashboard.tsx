import { useState } from 'react'
import { PenLine, Plus, Globe, Trash2, X } from 'lucide-react'

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

const INTEGRATIONS_KEY = 'hub-web-integrations'

const DEFAULT_INTEGRATIONS: WebIntegration[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    url: 'https://open.spotify.com',
    description: 'Música enquanto trabalha',
    color: '',
  }
]

function loadIntegrations(): WebIntegration[] {
  try {
    const stored = localStorage.getItem(INTEGRATIONS_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_INTEGRATIONS
  } catch {
    return DEFAULT_INTEGRATIONS
  }
}

function saveIntegrations(integrations: WebIntegration[]) {
  localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations))
}

interface Props {
  onOpenExcalidraw: () => void
  onOpenWeb: (integration: WebIntegration) => void
  openWebPanelIds: string[]
}

export default function Dashboard({ onOpenExcalidraw, onOpenWeb, openWebPanelIds }: Props) {
  const [integrations, setIntegrations] = useState<WebIntegration[]>(loadIntegrations)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', url: '' })
  const [error, setError] = useState('')

  const handleAdd = () => {
    const name = form.name.trim()
    let url = form.url.trim()
    if (!name || !url) { setError('Preencha nome e URL.'); return }
    if (!url.startsWith('http')) url = 'https://' + url
    const next = [...integrations, { id: crypto.randomUUID(), name, url, description: url, color: '' }]
    setIntegrations(next)
    saveIntegrations(next)
    setForm({ name: '', url: '' })
    setAdding(false)
    setError('')
  }

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = integrations.filter(i => i.id !== id)
    setIntegrations(next)
    saveIntegrations(next)
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

          {/* Excalidraw — card primário com verde */}
          <button
            onClick={onOpenExcalidraw}
            className={cn(
              'group relative flex flex-col gap-3 p-5 rounded-xl border text-left transition-all duration-200',
              'bg-card border-primary/30',
              'hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02]'
            )}
          >
            <span className="absolute top-2 right-2 text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
              Ctrl+1
            </span>
            <div className="flex items-center justify-center size-11 rounded-lg bg-primary/10 border border-primary/20">
              <PenLine className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Excalidraw</p>
              <p className="text-xs text-muted-foreground mt-0.5">Diagramas e rascunhos</p>
            </div>
          </button>

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
