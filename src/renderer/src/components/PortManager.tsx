import { useState, useCallback } from 'react'
import NavBar from './NavBar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RefreshCw, X, Search, AlertCircle } from 'lucide-react'

const WELL_KNOWN: Record<number, string> = {
  80: 'HTTP', 443: 'HTTPS', 3000: 'Dev Server', 3001: 'Dev Server',
  4000: 'Dev Server', 4200: 'Angular', 5000: 'Dev Server', 5173: 'Vite',
  5432: 'PostgreSQL', 5433: 'PostgreSQL', 6379: 'Redis', 8000: 'Python/Django',
  8080: 'HTTP Alt', 8443: 'HTTPS Alt', 8888: 'Jupyter', 9000: 'PHP-FPM',
  9200: 'Elasticsearch', 27017: 'MongoDB', 3306: 'MySQL', 1433: 'SQL Server',
}

interface Props {
  onBack: () => void
}

export default function PortManager({ onBack }: Props) {
  const [ports, setPorts] = useState<PortInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [killing, setKilling] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [killed, setKilled] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await window.api.ports.list()
      setPorts(list)
    } catch {
      setError('Erro ao listar portas.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleKill = async (p: PortInfo) => {
    if (!confirm(`Matar processo "${p.processName}" (PID ${p.pid}) na porta ${p.port}?`)) return
    setKilling(p.pid)
    const ok = await window.api.ports.kill(p.pid)
    setKilling(null)
    if (ok) {
      setKilled(prev => new Set([...prev, p.pid]))
      setPorts(prev => prev.filter(x => x.pid !== p.pid))
    } else {
      alert(`Não foi possível matar o processo ${p.pid}. Tente rodar como administrador.`)
    }
  }

  const filtered = ports.filter(p => {
    const q = search.toLowerCase()
    return String(p.port).includes(q) ||
      p.processName.toLowerCase().includes(q) ||
      String(p.pid).includes(q) ||
      (WELL_KNOWN[p.port] ?? '').toLowerCase().includes(q)
  })

  const isDevPort = (port: number) => port in WELL_KNOWN

  return (
    <div className="absolute inset-0 flex flex-col">
      <NavBar title="Port Manager" onBack={onBack} shortcut="Ctrl+P" />
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        {/* Toolbar */}
        <div className="border-b border-border px-4 py-2.5 flex gap-2 items-center bg-background">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
              placeholder="Filtrar por porta, processo, PID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('size-3.5 mr-1.5', loading && 'animate-spin')} />
            {loading ? 'Carregando...' : 'Escanear'}
          </Button>
          {ports.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {filtered.length} porta{filtered.length !== 1 ? 's' : ''}
              {search && ` de ${ports.length}`}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 m-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {ports.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <p className="text-sm">Clique em "Escanear" para ver as portas em uso</p>
              <Button size="sm" variant="secondary" onClick={refresh}>
                <RefreshCw className="size-3.5 mr-1.5" />
                Escanear portas
              </Button>
            </div>
          )}

          {filtered.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50 sticky top-0">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Porta</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Processo</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">PID</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Estado</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Serviço</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={`${p.port}-${p.pid}`}
                    className={cn(
                      'border-b border-border/50 transition-colors hover:bg-secondary/30',
                      isDevPort(p.port) && 'bg-primary/5'
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'font-mono font-bold',
                        isDevPort(p.port) ? 'text-primary' : 'text-foreground'
                      )}>
                        {p.port}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{p.processName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{p.pid}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        p.state === 'LISTENING' ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-muted-foreground'
                      )}>
                        {p.state}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {WELL_KNOWN[p.port] ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleKill(p)}
                        disabled={killing === p.pid}
                        className="flex items-center gap-1 ml-auto px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        <X className="size-3" />
                        {killing === p.pid ? 'Matando...' : 'Matar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
