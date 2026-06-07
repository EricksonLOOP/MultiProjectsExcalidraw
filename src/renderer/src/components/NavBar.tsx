import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  onBack: () => void
  shortcut?: string
  children?: React.ReactNode
}

export default function NavBar({ title, onBack, shortcut, children }: Props) {
  return (
    <div
      className="fixed left-0 right-0 z-20 flex items-center gap-2 px-3 border-b border-border bg-background/90 backdrop-blur-sm"
      style={{ top: 'var(--titlebar-height)', height: 'var(--navbar-height)' }}
    >
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground hover:text-foreground h-7 px-2">
        <ChevronLeft className="size-4" />
        Hub
      </Button>

      <div className="w-px h-4 bg-border" />

      <span className="text-sm font-medium text-foreground">{title}</span>

      {shortcut && (
        <span className="ml-1 text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
          {shortcut}
        </span>
      )}

      <div className="flex-1" />
      {children}
    </div>
  )
}
