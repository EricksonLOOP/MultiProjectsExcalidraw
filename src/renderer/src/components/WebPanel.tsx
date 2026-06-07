import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NavBar from './NavBar'

interface Props {
  integration: WebIntegration
  onBack: () => void
  shortcut?: string
}

export default function WebPanel({ integration, onBack, shortcut }: Props) {
  const [loading, setLoading] = useState(true)
  const webviewRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = webviewRef.current
    if (!el) return

    const onReady = () => setLoading(false)
    const onFail = () => setLoading(false)

    el.addEventListener('dom-ready', onReady)
    el.addEventListener('did-fail-load', onFail)

    // fallback caso dom-ready nunca dispare
    const fallback = setTimeout(() => setLoading(false), 12_000)

    return () => {
      el.removeEventListener('dom-ready', onReady)
      el.removeEventListener('did-fail-load', onFail)
      clearTimeout(fallback)
    }
  }, [])

  const reload = () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(webviewRef.current as any)?.reload()
  }

  return (
    <div className="flex flex-col h-full">
      <NavBar title={integration.name} onBack={onBack} shortcut={shortcut}>
        <Button variant="ghost" size="icon" onClick={reload} className="size-8 text-muted-foreground">
          <RotateCcw className="size-3.5" />
        </Button>
      </NavBar>

      <div
        className="flex-1 relative"
        style={{ marginTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Carregando {integration.name}...</p>
          </div>
        )}
        <webview
          ref={webviewRef as React.RefObject<HTMLElement>}
          src={integration.url}
          partition={`persist:${integration.id}`}
          allowpopups="true"
          className="w-full h-full"
        />
      </div>
    </div>
  )
}
