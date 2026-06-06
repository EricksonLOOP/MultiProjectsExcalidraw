import { useRef, useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NavBar from './NavBar'

interface Props {
  integration: WebIntegration
  onBack: () => void
}

export default function WebPanel({ integration, onBack }: Props) {
  const [loading, setLoading] = useState(true)
  const webviewRef = useRef<HTMLElement>(null)

  const handleReload = () => {
    if (webviewRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(webviewRef.current as any).reload()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <NavBar title={integration.name} onBack={onBack} />

      {/* Reload button */}
      <div
        className="fixed right-3 z-20 flex items-center"
        style={{ top: 'var(--titlebar-height)', height: 'var(--navbar-height)' }}
      >
        <Button variant="ghost" size="icon" onClick={handleReload} className="size-8 text-muted-foreground">
          <RotateCcw className="size-3.5" />
        </Button>
      </div>

      {/* Webview */}
      <div
        className="flex-1 relative"
        style={{ marginTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <webview
          ref={webviewRef as React.RefObject<HTMLElement>}
          src={integration.url}
          allowpopups="true"
          className="w-full h-full"
          onDomReady={() => setLoading(false)}
        />
      </div>
    </div>
  )
}
