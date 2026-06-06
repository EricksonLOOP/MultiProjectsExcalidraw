import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  onBack: () => void
}

export default function NavBar({ title, onBack }: Props) {
  return (
    <div
      className="fixed left-0 right-0 z-20 flex items-center gap-2 px-3 border-b border-border bg-card/80 backdrop-blur-sm"
      style={{ top: 'var(--titlebar-height)', height: 'var(--navbar-height)' }}
    >
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Hub
      </Button>
      <span className="text-sm font-medium text-foreground">{title}</span>
    </div>
  )
}
