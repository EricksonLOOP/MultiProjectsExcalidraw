import { useState, useCallback } from 'react'
import NavBar from './NavBar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FolderOpen, RefreshCw, GitBranch, Terminal, Code2, FolderOpenDot, AlertCircle, Circle } from 'lucide-react'

interface Props {
  onBack: () => void
}

export default function GitRepos({ onBack }: Props) {
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const scan = useCallback(async (folder: string) => {
    setLoading(true)
    setError('')
    try {
      const list = await window.api.git.scanRepos(folder)
      setRepos(list)
    } catch {
      setError('Erro ao escanear repositórios.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelectFolder = async () => {
    const folder = await window.api.git.selectFolder()
    if (!folder) return
    setFolderPath(folder)
    setRepos([])
    await scan(folder)
  }

  const handleRefresh = () => {
    if (folderPath) scan(folderPath)
  }

  const dirtyCount = repos.filter(r => r.isDirty).length

  return (
    <div className="absolute inset-0 flex flex-col">
      <NavBar title="Git Repos" onBack={onBack} shortcut="Ctrl+G" />
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        {/* Toolbar */}
        <div className="border-b border-border px-4 py-2.5 flex gap-2 items-center bg-background">
          <Button size="sm" variant="secondary" onClick={handleSelectFolder}>
            <FolderOpen className="size-3.5 mr-1.5" />
            {folderPath ? 'Trocar pasta' : 'Escolher pasta'}
          </Button>
          {folderPath && (
            <>
              <span className="text-xs text-muted-foreground font-mono truncate max-w-xs" title={folderPath}>
                {folderPath}
              </span>
              <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={loading} className="ml-auto shrink-0">
                <RefreshCw className={cn('size-3.5 mr-1.5', loading && 'animate-spin')} />
                Atualizar
              </Button>
            </>
          )}
          {repos.length > 0 && (
            <div className="flex gap-3 text-xs text-muted-foreground ml-auto shrink-0">
              <span>{repos.length} repo{repos.length !== 1 ? 's' : ''}</span>
              {dirtyCount > 0 && (
                <span className="text-yellow-400">{dirtyCount} com alterações</span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {!folderPath && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <FolderOpenDot className="size-10 opacity-30" />
              <p className="text-sm">Escolha uma pasta para escanear repositórios git</p>
              <Button size="sm" onClick={handleSelectFolder}>
                <FolderOpen className="size-3.5 mr-1.5" />
                Escolher pasta
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" />
              <span className="text-sm">Escaneando repositórios...</span>
            </div>
          )}

          {!loading && folderPath && repos.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <p className="text-sm">Nenhum repositório git encontrado</p>
              <p className="text-xs">A busca vai até 3 níveis de profundidade, ignorando node_modules</p>
            </div>
          )}

          {!loading && repos.length > 0 && (
            <div className="grid gap-2">
              {repos.map(repo => (
                <div
                  key={repo.path}
                  className={cn(
                    'flex items-center gap-4 p-3.5 rounded-xl border transition-colors',
                    repo.isDirty
                      ? 'border-yellow-500/20 bg-yellow-500/5'
                      : 'border-border bg-card'
                  )}
                >
                  {/* Status dot */}
                  <Circle className={cn(
                    'size-2 shrink-0 fill-current',
                    repo.isDirty ? 'text-yellow-400' : 'text-green-400'
                  )} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">{repo.name}</span>
                      {repo.isDirty && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shrink-0">
                          alterado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {repo.branch && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <GitBranch className="size-2.5" />
                          {repo.branch}
                        </span>
                      )}
                      {repo.lastCommit && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-xs" title={repo.lastCommit}>
                          {repo.lastCommit}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-mono truncate" title={repo.path}>
                      {repo.path}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <ActionButton
                      onClick={() => window.api.git.openVscode(repo.path)}
                      title="Abrir no VS Code"
                    >
                      <Code2 className="size-3.5" />
                    </ActionButton>
                    <ActionButton
                      onClick={() => window.api.git.openTerminal(repo.path)}
                      title="Abrir terminal aqui"
                    >
                      <Terminal className="size-3.5" />
                    </ActionButton>
                    <ActionButton
                      onClick={() => window.api.git.openExplorer(repo.path)}
                      title="Abrir no Explorer"
                    >
                      <FolderOpen className="size-3.5" />
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
    >
      {children}
    </button>
  )
}
