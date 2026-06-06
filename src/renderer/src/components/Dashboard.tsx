import { useState } from 'react'
import { PenLine, Music, Plus, Globe, Trash2, X } from 'lucide-react'
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
    color: 'from-green-500/20 to-emerald-600/10 border-green-500/20',
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
}

export default function Dashboard({ onOpenExcalidraw, onOpenWeb }: Props) {
  const [integrations, setIntegrations] = useState<WebIntegration[]>(loadIntegrations)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', url: '' })
  const [error, setError] = useState('')

  const handleAdd = () => {
    const name = form.name.trim()
    let url = form.url.trim()
    if (!name || !url) { setError('Preencha nome e URL.'); return }
    if (!url.startsWith('http')) url = 'https://' + url
    const next = [...integrations, {
      id: crypto.randomUUID(),
      name,
      url,
      description: url,
      color: 'from-blue-500/20 to-cyan-600/10 border-blue-500/20'
    }]
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
          <h1 className="text-3xl font-bold text-foreground">Meu Hub</h1>
          <p className="text-muted-foreground mt-1 text-sm">Suas ferramentas em um só lugar</p>
        </div>

        {/* Grid de ferramentas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

          {/* Excalidraw — nativo */}
          <button
            onClick={onOpenExcalidraw}
            className={cn(
              'group relative flex flex-col gap-3 p-5 rounded-xl border text-left transition-all',
              'bg-gradient-to-br from-violet-500/20 to-indigo-600/10 border-violet-500/20',
              'hover:border-violet-500/40 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10'
            )}
          >
            <div className="flex items-center justify-center size-11 rounded-lg bg-violet-500/20">
              <PenLine className="size-5 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Excalidraw</p>
              <p className="text-xs text-muted-foreground mt-0.5">Diagramas e rascunhos</p>
            </div>
          </button>

          {/* Integrações web */}
          {integrations.map(integration => (
            <button
              key={integration.id}
              onClick={() => onOpenWeb(integration)}
              className={cn(
                'group relative flex flex-col gap-3 p-5 rounded-xl border text-left transition-all',
                `bg-gradient-to-br ${integration.color}`,
                'hover:scale-[1.02] hover:shadow-lg'
              )}
            >
              {/* Remover */}
              <button
                onClick={(e) => handleRemove(integration.id, e)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>

              <div className="flex items-center justify-center size-11 rounded-lg bg-white/10">
                <Globe className="size-5 text-foreground/70" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{integration.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{integration.description}</p>
              </div>
            </button>
          ))}

          {/* Adicionar integração */}
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-2 p-5 rounded-xl border text-left transition-all',
                'border-dashed border-border hover:border-primary/50 hover:bg-primary/5'
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
                  <Globe className="size-3.5" /> Nova ferramenta
                </span>
                <button onClick={() => { setAdding(false); setError('') }}>
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </div>
              <Input
                placeholder="Nome (ex: Notion)"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-8 text-xs"
              />
              <Input
                placeholder="URL (ex: notion.so)"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="h-8 text-xs"
              />
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
