import { useState, useRef, useEffect } from 'react'
import { FolderOpen, Play, Square, FolderOpenIcon, ChevronRight, Check, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import NavBar from './NavBar'

// ── Templates ────────────────────────────────────────────────────────────────

interface TemplateOption {
  id: string
  label: string
  description?: string
  default: boolean
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  color: string         // tailwind bg color class
  textColor: string     // tailwind text color
  command: (name: string, opts: Record<string, boolean>) => string
  postInstall?: (name: string, opts: Record<string, boolean>) => string | null
  options: TemplateOption[]
}

const TEMPLATES: Template[] = [
  // ── Frontend ──
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'React framework full-stack',
    category: 'Frontend',
    color: 'bg-white/10',
    textColor: 'text-white',
    options: [
      { id: 'typescript', label: 'TypeScript', default: true },
      { id: 'tailwind', label: 'Tailwind CSS', default: true },
      { id: 'eslint', label: 'ESLint', default: true },
      { id: 'app-router', label: 'App Router', default: true },
      { id: 'shadcn', label: 'shadcn/ui', default: false, description: 'Instalado após scaffold' },
    ],
    command: (name, opts) => [
      'npx create-next-app@latest', name,
      opts.typescript ? '--typescript' : '--javascript',
      opts.tailwind ? '--tailwind' : '--no-tailwind',
      opts.eslint ? '--eslint' : '--no-eslint',
      opts['app-router'] ? '--app' : '--no-app',
      '--src-dir', '--import-alias "@/*"'
    ].join(' '),
    postInstall: (name, opts) =>
      opts.shadcn ? `cd ${name} && npx shadcn@latest init -d` : null,
  },
  {
    id: 'vite-react',
    name: 'Vite + React',
    description: 'SPA rápida com Vite',
    category: 'Frontend',
    color: 'bg-purple-500/20',
    textColor: 'text-purple-300',
    options: [
      { id: 'typescript', label: 'TypeScript', default: true },
    ],
    command: (name, opts) =>
      `npm create vite@latest ${name} -- --template ${opts.typescript ? 'react-ts' : 'react'}`,
  },
  {
    id: 'astro',
    name: 'Astro',
    description: 'Sites e apps com menos JS',
    category: 'Frontend',
    color: 'bg-orange-500/20',
    textColor: 'text-orange-300',
    options: [
      { id: 'typescript', label: 'TypeScript', default: true },
    ],
    command: (name) => `npm create astro@latest ${name} -- --template minimal --yes`,
  },

  // ── Backend ──
  {
    id: 'nestjs',
    name: 'NestJS',
    description: 'Framework Node escalável',
    category: 'Backend',
    color: 'bg-red-500/20',
    textColor: 'text-red-300',
    options: [],
    command: (name) => `npx @nestjs/cli new ${name} --package-manager npm --skip-git`,
  },
  {
    id: 'express',
    name: 'Express',
    description: 'API REST minimalista',
    category: 'Backend',
    color: 'bg-primary/20',
    textColor: 'text-primary',
    options: [
      { id: 'typescript', label: 'TypeScript', default: true },
    ],
    command: (name, opts) => opts.typescript
      ? `npx express-generator-typescript ${name}`
      : `npx express-generator --no-view ${name}`,
  },
  {
    id: 'fastify',
    name: 'Fastify',
    description: 'API Node de alta performance',
    category: 'Backend',
    color: 'bg-yellow-500/20',
    textColor: 'text-yellow-300',
    options: [
      { id: 'typescript', label: 'TypeScript', default: true },
    ],
    command: (name, opts) =>
      `npm create fastify@latest ${name} -- --lang=${opts.typescript ? 'ts' : 'js'}`,
  },

  // ── Desktop ──
  {
    id: 'electron-vite',
    name: 'Electron + Vite',
    description: 'Desktop app como o Devson',
    category: 'Desktop',
    color: 'bg-blue-500/20',
    textColor: 'text-blue-300',
    options: [
      { id: 'typescript', label: 'TypeScript', default: true },
    ],
    command: (name, opts) =>
      `npm create @quick-start/electron@latest ${name} -- --template ${opts.typescript ? 'react-ts' : 'react'} --skip-git`,
  },

  // ── Sistemas ──
  {
    id: 'rust',
    name: 'Rust',
    description: 'Projeto Cargo (binary)',
    category: 'Sistemas',
    color: 'bg-orange-600/20',
    textColor: 'text-orange-400',
    options: [
      { id: 'lib', label: 'Library (--lib)', default: false },
    ],
    command: (name, opts) => `cargo new ${name}${opts.lib ? ' --lib' : ''}`,
  },
  {
    id: 'dotnet',
    name: 'C# / .NET',
    description: 'Web API com ASP.NET Core',
    category: 'Sistemas',
    color: 'bg-violet-500/20',
    textColor: 'text-violet-300',
    options: [
      { id: 'webapi', label: 'Web API', default: true },
      { id: 'console', label: 'Console App', default: false },
    ],
    command: (name, opts) =>
      `dotnet new ${opts.console ? 'console' : 'webapi'} -n ${name} --no-openapi`,
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Projeto com uv (moderno)',
    category: 'Sistemas',
    color: 'bg-blue-400/20',
    textColor: 'text-blue-300',
    options: [],
    command: (name) => `uv init ${name}`,
  },
]

const CATEGORIES = ['Frontend', 'Backend', 'Desktop', 'Sistemas']

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
  shortcut?: string
}

type RunState = 'idle' | 'running' | 'done' | 'error'

export default function QuickStart({ onBack, shortcut }: Props) {
  const [category, setCategory] = useState('Frontend')
  const [selected, setSelected] = useState<Template | null>(null)
  const [options, setOptions] = useState<Record<string, boolean>>({})
  const [projectName, setProjectName] = useState('')
  const [outputFolder, setOutputFolder] = useState('')
  const [lines, setLines] = useState<QuickstartOutput[]>([])
  const [runState, setRunState] = useState<RunState>('idle')
  const terminalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  // Registra listeners IPC uma vez
  useEffect(() => {
    const offOutput = window.api.quickstart.onOutput((data) => {
      setLines(prev => [...prev, data])
    })
    const offExit = window.api.quickstart.onExit((code) => {
      setRunState(code === 0 ? 'done' : 'error')
      setLines(prev => [...prev, {
        type: code === 0 ? 'info' : 'stderr',
        data: code === 0 ? '\n✓ Projeto criado com sucesso!\n' : `\n✗ Falhou com código ${code}\n`
      }])
    })
    return () => { offOutput(); offExit() }
  }, [])

  const selectTemplate = (t: Template) => {
    setSelected(t)
    setOptions(Object.fromEntries(t.options.map(o => [o.id, o.default])))
    setLines([])
    setRunState('idle')
  }

  const pickFolder = async () => {
    const folder = await window.api.quickstart.selectFolder()
    if (folder) setOutputFolder(folder)
  }

  const run = async () => {
    if (!selected || !projectName.trim() || !outputFolder) return
    setLines([])
    setRunState('running')

    const name = projectName.trim().toLowerCase().replace(/\s+/g, '-')
    const cmd = selected.command(name, options)
    const code = await window.api.quickstart.run(outputFolder, cmd)

    if (code === 0 && selected.postInstall) {
      const post = selected.postInstall(name, options)
      if (post) {
        setLines(prev => [...prev, { type: 'info', data: '\n── Post-install ──\n' }])
        await window.api.quickstart.run(outputFolder, post)
      }
    }
  }

  const stop = () => {
    window.api.quickstart.kill()
    setRunState('idle')
  }

  const openProject = () => {
    if (outputFolder && projectName) {
      const name = projectName.trim().toLowerCase().replace(/\s+/g, '-')
      window.api.openFolder(`${outputFolder}\\${name}`)
    }
  }

  const canRun = selected && projectName.trim() && outputFolder && runState !== 'running'

  return (
    <div className="flex flex-col h-full">
      <NavBar title="Quick Start" onBack={onBack} shortcut={shortcut} />

      <div
        className="flex flex-1 overflow-hidden"
        style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        {/* ── Seletor de templates (esquerda) ── */}
        <div className="w-64 min-w-64 flex flex-col border-r border-border bg-card overflow-y-auto">
          {/* Categorias */}
          <div className="p-3 space-y-0.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors',
                  category === cat
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="h-px bg-border mx-3" />

          {/* Templates da categoria */}
          <div className="p-2 space-y-1 flex-1">
            {TEMPLATES.filter(t => t.category === category).map(t => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                  selected?.id === t.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-accent border border-transparent'
                )}
              >
                <span className={cn('flex items-center justify-center size-8 rounded-md text-xs font-bold shrink-0', t.color, t.textColor)}>
                  {t.name.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                </div>
                {selected?.id === t.id && <ChevronRight className="size-3.5 text-primary ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Painel direito ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Terminal className="size-10 opacity-20" />
              <p className="text-sm">Selecione um template para começar</p>
            </div>
          ) : (
            <>
              {/* Config */}
              <div className="p-6 border-b border-border space-y-4 shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.description}</p>
                </div>

                {/* Nome + pasta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nome do projeto</label>
                    <Input
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder="meu-projeto"
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Criar em</label>
                    <div className="flex gap-2">
                      <Input
                        value={outputFolder}
                        readOnly
                        placeholder="Escolha uma pasta..."
                        className="h-8 text-xs"
                      />
                      <Button variant="secondary" size="icon" onClick={pickFolder} className="h-8 w-8 shrink-0">
                        <FolderOpen className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Opções */}
                {selected.options.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Opções</label>
                    <div className="flex flex-wrap gap-2">
                      {selected.options.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setOptions(prev => ({ ...prev, [opt.id]: !prev[opt.id] }))}
                          title={opt.description}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all',
                            options[opt.id]
                              ? 'bg-primary/10 border-primary/40 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/30'
                          )}
                        >
                          {options[opt.id] && <Check className="size-3" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview do comando */}
                {projectName.trim() && (
                  <div className="rounded-md bg-background border border-border px-3 py-2">
                    <p className="text-[11px] font-mono text-muted-foreground break-all">
                      <span className="text-primary mr-1">$</span>
                      {selected.command(projectName.trim().toLowerCase().replace(/\s+/g, '-'), options)}
                    </p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  {runState !== 'running' ? (
                    <Button onClick={run} disabled={!canRun} className="gap-2">
                      <Play className="size-3.5" />
                      Criar projeto
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={stop} className="gap-2">
                      <Square className="size-3.5" />
                      Parar
                    </Button>
                  )}
                  {runState === 'done' && (
                    <Button variant="secondary" onClick={openProject} className="gap-2">
                      <FolderOpenIcon className="size-3.5" />
                      Abrir pasta
                    </Button>
                  )}
                  {runState === 'done' && (
                    <span className="flex items-center gap-1.5 text-xs text-primary ml-1">
                      <Check className="size-3.5" /> Pronto!
                    </span>
                  )}
                </div>
              </div>

              {/* Terminal */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
                  <Terminal className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-mono">output</span>
                  {runState === 'running' && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-primary animate-pulse">
                      <span className="size-1.5 rounded-full bg-primary" />
                      rodando...
                    </span>
                  )}
                </div>
                <div
                  ref={terminalRef}
                  className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-background"
                >
                  {lines.length === 0 && (
                    <p className="text-muted-foreground/40">Aguardando execução...</p>
                  )}
                  {lines.map((line, i) => (
                    <span
                      key={i}
                      className={cn(
                        'block whitespace-pre-wrap break-all',
                        line.type === 'stderr' && 'text-red-400',
                        line.type === 'info' && 'text-primary',
                        line.type === 'stdout' && 'text-foreground/80'
                      )}
                    >
                      {line.data}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
