import { useState } from 'react'
import { Plus, Trash2, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const COLOR_PALETTE = [
  { bg: 'bg-primary/20', text: 'text-primary' },
  { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  { bg: 'bg-red-500/20', text: 'text-red-300' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  { bg: 'bg-violet-500/20', text: 'text-violet-300' },
  { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  { bg: 'bg-teal-500/20', text: 'text-teal-300' },
  { bg: 'bg-white/10', text: 'text-white' },
]

const TEXTAREA =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50'

interface Props {
  template: CustomTemplate | null
  allCategories: string[]
  onSave: (t: CustomTemplate) => void
  onCancel: () => void
}

export default function TemplateEditor({ template, allCategories, onSave, onCancel }: Props) {
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [category, setCategory] = useState(template?.category ?? 'Custom')
  const [icon, setIcon] = useState(template?.icon ?? '⚡')
  const [color, setColor] = useState(template?.color ?? COLOR_PALETTE[0].bg)
  const [textColor, setTextColor] = useState(template?.textColor ?? COLOR_PALETTE[0].text)
  const [commandTemplate, setCommandTemplate] = useState(template?.commandTemplate ?? '')
  const [postInstallTemplate, setPostInstallTemplate] = useState(template?.postInstallTemplate ?? '')
  const [options, setOptions] = useState<CustomTemplateOption[]>(template?.options ?? [])

  const addOption = () =>
    setOptions(prev => [...prev, { id: crypto.randomUUID(), label: '', flag: '', default: false }])

  const removeOption = (idx: number) => setOptions(prev => prev.filter((_, i) => i !== idx))

  const updateOption = (idx: number, field: keyof CustomTemplateOption, value: string | boolean) =>
    setOptions(prev => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)))

  const handleSave = () => {
    if (!name.trim() || !commandTemplate.trim() || !category.trim()) return
    onSave({
      id: template?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      icon: icon.trim() || '⚡',
      color,
      textColor,
      commandTemplate: commandTemplate.trim(),
      postInstallTemplate: postInstallTemplate.trim() || undefined,
      options: options.filter(o => o.label.trim()),
      createdAt: template?.createdAt ?? Date.now(),
    })
  }

  const isValid = name.trim() && commandTemplate.trim() && category.trim()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <div className={cn('flex items-center justify-center size-9 rounded-md text-xl shrink-0', color, textColor)}>
          {icon || '⚡'}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {template ? `Editar: ${template.name}` : 'Novo template'}
          </h2>
          <p className="text-xs text-muted-foreground">Configure comando, ícone e opções</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Identidade */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Meu Template" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Categoria *</label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Frontend"
              list="qs-categories-list"
              className="h-8 text-sm"
            />
            <datalist id="qs-categories-list">
              {allCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Descrição</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Uma breve descrição..." className="h-8 text-sm" />
        </div>

        {/* Aparência */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Aparência</label>
          <div className="flex items-start gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground/60">Ícone (emoji)</p>
              <Input
                value={icon}
                onChange={e => setIcon(e.target.value.slice(0, 2))}
                placeholder="⚡"
                className="h-8 w-16 text-center text-lg"
              />
            </div>
            <div className="space-y-1 flex-1">
              <p className="text-[10px] text-muted-foreground/60">Cor de fundo</p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c.bg}
                    onClick={() => { setColor(c.bg); setTextColor(c.text) }}
                    className={cn(
                      'size-6 rounded-full border-2 transition-all',
                      c.bg,
                      c.bg === color ? 'border-foreground scale-110' : 'border-transparent hover:border-border'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Comando */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Comando *</label>
          <textarea
            value={commandTemplate}
            onChange={e => setCommandTemplate(e.target.value)}
            placeholder="npx create-next-app@latest {name}"
            rows={2}
            className={TEXTAREA}
          />
          <p className="text-[10px] text-muted-foreground/60">
            Use <code className="bg-muted px-1 rounded font-mono">{'{name}'}</code> para o nome do projeto.
            Flags habilitadas nas opções são adicionadas automaticamente ao final.
          </p>
        </div>

        {/* Post-install */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Post-install <span className="text-muted-foreground/50 font-normal">(opcional)</span>
          </label>
          <textarea
            value={postInstallTemplate}
            onChange={e => setPostInstallTemplate(e.target.value)}
            placeholder="cd {name} && npm install"
            rows={2}
            className={TEXTAREA}
          />
        </div>

        {/* Opções */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Opções</label>
            <Button variant="ghost" size="sm" onClick={addOption} className="h-6 gap-1 text-xs px-2">
              <Plus className="size-3" /> Adicionar
            </Button>
          </div>

          {options.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 text-[10px] text-muted-foreground/60 px-1">
                <span>Label</span>
                <span>Flag (ex: --typescript)</span>
                <span>Padrão</span>
                <span />
              </div>
              {options.map((opt, idx) => (
                <div key={opt.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                  <Input
                    value={opt.label}
                    onChange={e => updateOption(idx, 'label', e.target.value)}
                    placeholder="TypeScript"
                    className="h-7 text-xs"
                  />
                  <Input
                    value={opt.flag}
                    onChange={e => updateOption(idx, 'flag', e.target.value)}
                    placeholder="--typescript"
                    className="h-7 text-xs font-mono"
                  />
                  <button
                    onClick={() => updateOption(idx, 'default', !opt.default)}
                    className={cn(
                      'size-7 rounded-md border text-xs font-medium transition-colors',
                      opt.default
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {opt.default ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => removeOption(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {options.length === 0 && (
            <p className="text-xs text-muted-foreground/40 pl-1">Nenhuma opção configurada</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 p-4 border-t border-border shrink-0">
        <Button variant="ghost" onClick={onCancel} className="gap-1.5">
          <X className="size-3.5" /> Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!isValid} className="gap-1.5 ml-auto">
          <Save className="size-3.5" /> Salvar template
        </Button>
      </div>
    </div>
  )
}
