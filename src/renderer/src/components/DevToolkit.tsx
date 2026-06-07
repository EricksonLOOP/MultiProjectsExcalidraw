import { useState, useCallback } from 'react'
import NavBar from './NavBar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Copy, Check, RefreshCw } from 'lucide-react'

type Tool = 'json' | 'base64' | 'uuid' | 'hash' | 'color'

const TOOLS: { id: Tool; label: string; emoji: string }[] = [
  { id: 'json',   label: 'JSON',    emoji: '{ }' },
  { id: 'base64', label: 'Base64',  emoji: 'B64' },
  { id: 'uuid',   label: 'UUID',    emoji: '#' },
  { id: 'hash',   label: 'Hash',    emoji: 'SHA' },
  { id: 'color',  label: 'Cores',   emoji: '🎨' },
]

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [])
  return { copied, copy }
}

// ── JSON Formatter ────────────────────────────────────────────────────────────

function JsonTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const { copied, copy } = useCopy()

  const format = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, 2))
      setError('')
    } catch (e) {
      setError(String(e))
      setOutput('')
    }
  }

  const minify = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError('')
    } catch (e) {
      setError(String(e))
      setOutput('')
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={format}>Formatar</Button>
        <Button size="sm" variant="secondary" onClick={minify}>Minificar</Button>
        {output && (
          <Button size="sm" variant="ghost" onClick={() => copy(output)}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Input</span>
          <textarea
            className="flex-1 resize-none bg-secondary border border-border rounded-lg p-3 font-mono text-xs text-foreground outline-none focus:border-primary/50 min-h-0"
            placeholder='{"chave": "valor"}'
            value={input}
            onChange={e => setInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Output</span>
          <pre className="flex-1 overflow-auto bg-secondary border border-border rounded-lg p-3 font-mono text-xs text-foreground min-h-0">
            {error ? <span className="text-destructive">{error}</span> : output}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ── Base64 ────────────────────────────────────────────────────────────────────

function Base64Tool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const { copied, copy } = useCopy()

  const run = () => {
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))))
      } else {
        setOutput(decodeURIComponent(escape(atob(input))))
      }
    } catch {
      setOutput('❌ Entrada inválida')
    }
  }

  const swap = () => {
    setMode(m => m === 'encode' ? 'decode' : 'encode')
    setInput(output)
    setOutput('')
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-2 items-center">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode('encode')}
            className={cn('px-3 py-1.5 text-xs font-medium transition-colors', mode === 'encode' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >Encode</button>
          <button
            onClick={() => setMode('decode')}
            className={cn('px-3 py-1.5 text-xs font-medium transition-colors', mode === 'decode' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >Decode</button>
        </div>
        <Button size="sm" onClick={run}>{mode === 'encode' ? 'Encode' : 'Decode'}</Button>
        <Button size="sm" variant="ghost" onClick={swap} title="Trocar input/output">
          <RefreshCw className="size-3.5" />
        </Button>
        {output && (
          <Button size="sm" variant="ghost" onClick={() => copy(output)}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{mode === 'encode' ? 'Texto' : 'Base64'}</span>
          <textarea
            className="flex-1 resize-none bg-secondary border border-border rounded-lg p-3 font-mono text-xs text-foreground outline-none focus:border-primary/50 min-h-0"
            placeholder={mode === 'encode' ? 'Texto para codificar' : 'Base64 para decodificar'}
            value={input}
            onChange={e => setInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{mode === 'encode' ? 'Base64' : 'Texto'}</span>
          <pre className="flex-1 overflow-auto break-all whitespace-pre-wrap bg-secondary border border-border rounded-lg p-3 font-mono text-xs text-foreground min-h-0">
            {output}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ── UUID ──────────────────────────────────────────────────────────────────────

function UuidTool() {
  const [uuids, setUuids] = useState<string[]>([crypto.randomUUID()])
  const [count, setCount] = useState(1)
  const { copied, copy } = useCopy()

  const generate = () => {
    setUuids(Array.from({ length: Math.min(count, 50) }, () => crypto.randomUUID()))
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-2 items-center">
        <input
          type="number"
          min={1} max={50}
          value={count}
          onChange={e => setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
          className="w-16 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 text-center"
        />
        <span className="text-xs text-muted-foreground">UUIDs</span>
        <Button size="sm" onClick={generate}>Gerar</Button>
        <Button size="sm" variant="ghost" onClick={() => copy(uuids.join('\n'))}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span className="ml-1.5 text-xs">Copiar todos</span>
        </Button>
      </div>
      <div className="flex-1 overflow-auto bg-secondary border border-border rounded-lg p-3 min-h-0">
        {uuids.map((u, i) => (
          <div key={i} className="flex items-center justify-between group py-1 border-b border-border/50 last:border-0">
            <span className="font-mono text-xs text-foreground select-all">{u}</span>
            <button
              onClick={() => copy(u)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/10"
            >
              <Copy className="size-3 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Hash ──────────────────────────────────────────────────────────────────────

type HashAlgo = 'SHA-1' | 'SHA-256' | 'SHA-512'

function HashTool() {
  const [input, setInput] = useState('')
  const [algo, setAlgo] = useState<HashAlgo>('SHA-256')
  const [output, setOutput] = useState('')
  const { copied, copy } = useCopy()

  const hash = async () => {
    if (!input) return
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(input))
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    setOutput(hex)
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-2 items-center">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['SHA-1', 'SHA-256', 'SHA-512'] as HashAlgo[]).map(a => (
            <button
              key={a}
              onClick={() => { setAlgo(a); setOutput('') }}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors', algo === a ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >{a}</button>
          ))}
        </div>
        <Button size="sm" onClick={hash}>Gerar Hash</Button>
        {output && (
          <Button size="sm" variant="ghost" onClick={() => copy(output)}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        )}
      </div>
      <textarea
        className="resize-none bg-secondary border border-border rounded-lg p-3 font-mono text-xs text-foreground outline-none focus:border-primary/50 h-32"
        placeholder="Texto para gerar o hash..."
        value={input}
        onChange={e => { setInput(e.target.value); setOutput('') }}
        onKeyDown={e => e.key === 'Enter' && e.ctrlKey && hash()}
      />
      {output && (
        <div className="bg-secondary border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">{algo}</p>
          <p className="font-mono text-xs text-foreground break-all select-all">{output}</p>
        </div>
      )}
    </div>
  )
}

// ── Color Converter ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function ColorTool() {
  const [hex, setHex] = useState('#3b82f6')
  const [pickerHex, setPickerHex] = useState('#3b82f6')
  const { copied, copy } = useCopy()

  const rgb = hexToRgb(hex)
  const hsl = rgb ? rgbToHsl(...rgb) : null

  const handleHexChange = (val: string) => {
    setHex(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setPickerHex(val)
  }

  const handlePickerChange = (val: string) => {
    setPickerHex(val)
    setHex(val)
  }

  const rgbStr = rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : ''
  const hslStr = hsl ? `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` : ''

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-4 items-start">
        <div className="flex flex-col gap-2">
          <input
            type="color"
            value={pickerHex}
            onChange={e => handlePickerChange(e.target.value)}
            className="size-20 rounded-xl border-2 border-border cursor-pointer bg-transparent p-0.5"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="rounded-xl h-20 border border-border" style={{ background: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000' }} />
        </div>
      </div>

      {[
        { label: 'HEX', value: hex, input: true },
        { label: 'RGB', value: rgbStr },
        { label: 'HSL', value: hslStr },
      ].map(({ label, value, input: isInput }) => (
        <div key={label} className="flex items-center gap-3 bg-secondary border border-border rounded-lg px-3 py-2">
          <span className="text-xs font-mono text-muted-foreground w-8">{label}</span>
          {isInput ? (
            <input
              className="flex-1 bg-transparent font-mono text-xs text-foreground outline-none"
              value={value}
              onChange={e => handleHexChange(e.target.value)}
            />
          ) : (
            <span className="flex-1 font-mono text-xs text-foreground select-all">{value}</span>
          )}
          <button
            onClick={() => copy(value)}
            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

export default function DevToolkit({ onBack }: Props) {
  const [active, setActive] = useState<Tool>('json')

  return (
    <div className="absolute inset-0 flex flex-col">
      <NavBar title="Dev Toolkit" onBack={onBack} shortcut="Ctrl+T" />
      <div
        className="flex flex-1 overflow-hidden"
        style={{ paddingTop: 'calc(var(--titlebar-height) + var(--navbar-height))' }}
      >
        {/* Sidebar de ferramentas */}
        <div className="w-32 border-r border-border flex flex-col gap-1 p-2 bg-background">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                'flex flex-col items-center gap-1 p-2.5 rounded-lg text-xs font-medium transition-colors',
                active === t.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <span className="font-mono text-[10px] font-bold">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Área da ferramenta ativa */}
        <div className="flex-1 p-5 overflow-hidden flex flex-col">
          {active === 'json'   && <JsonTool />}
          {active === 'base64' && <Base64Tool />}
          {active === 'uuid'   && <UuidTool />}
          {active === 'hash'   && <HashTool />}
          {active === 'color'  && <ColorTool />}
        </div>
      </div>
    </div>
  )
}
