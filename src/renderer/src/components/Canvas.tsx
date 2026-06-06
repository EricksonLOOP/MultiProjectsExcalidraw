import { useEffect, useState, useRef, useCallback } from 'react'
import { Excalidraw, getSceneVersion } from '@excalidraw/excalidraw'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExcalidrawImperativeAPI, AppState } from '@excalidraw/excalidraw/types/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'

interface Props {
  project: ProjectFile
}

type SaveStatus = 'idle' | 'pending' | 'saved'

const SAVE_DELAY = 1000
const SAVED_DISPLAY_MS = 2000

export default function Canvas({ project }: Props) {
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[]
    appState: Partial<AppState>
    files: Record<string, unknown>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)
  const lastVersionRef = useRef<number>(-1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSaveStatus('idle')
    lastVersionRef.current = -1
    window.api.readProject(project.path).then((raw) => {
      if (cancelled) return
      if (raw) {
        try {
          const data = JSON.parse(raw)
          setInitialData({
            elements: data.elements ?? [],
            appState: { ...(data.appState ?? {}), collaborators: new Map() },
            files: data.files ?? {}
          })
        } catch {
          setInitialData({ elements: [], appState: { collaborators: new Map() }, files: {} })
        }
      } else {
        setInitialData({ elements: [], appState: { collaborators: new Map() }, files: {} })
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        if (isDirtyRef.current && apiRef.current) {
          const scene = apiRef.current.getSceneElements()
          const appState = apiRef.current.getAppState()
          const files = apiRef.current.getFiles()
          const payload = JSON.stringify({
            type: 'excalidraw', version: 2, source: 'devson',
            elements: scene,
            appState: { viewBackgroundColor: appState.viewBackgroundColor, gridSize: appState.gridSize },
            files
          }, null, 2)
          window.api.saveProject(project.path, payload)
        }
      }
    }
  }, [project.path])

  const scheduleSave = useCallback((elements: readonly ExcalidrawElement[]) => {
    const version = getSceneVersion(elements)
    if (version === lastVersionRef.current) return
    lastVersionRef.current = version

    isDirtyRef.current = true
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!apiRef.current) return
      setSaveStatus('pending')
      const elements = apiRef.current.getSceneElements()
      const appState = apiRef.current.getAppState()
      const files = apiRef.current.getFiles()
      const payload = JSON.stringify({
        type: 'excalidraw', version: 2, source: 'devson',
        elements,
        appState: { viewBackgroundColor: appState.viewBackgroundColor, gridSize: appState.gridSize },
        files
      }, null, 2)
      await window.api.saveProject(project.path, payload)
      isDirtyRef.current = false
      setSaveStatus('saved')
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), SAVED_DISPLAY_MS)
    }, SAVE_DELAY)
  }, [project.path])

  if (loading || !initialData) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Carregando projeto...
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <Excalidraw
        excalidrawAPI={(api) => { apiRef.current = api }}
        initialData={initialData}
        onChange={scheduleSave}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: { saveFileToDisk: true }
          }
        }}
      />

      {/* Save indicator */}
      <div
        className={cn(
          'absolute bottom-14 left-1/2 -translate-x-1/2 z-10',
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'bg-card border border-border shadow-md',
          'text-xs text-muted-foreground',
          'transition-all duration-300',
          saveStatus === 'idle'
            ? 'opacity-0 pointer-events-none translate-y-1'
            : 'opacity-100 translate-y-0'
        )}
      >
        {saveStatus === 'pending' ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Check className="size-3 text-green-400" />
            Salvo
          </>
        )}
      </div>
    </div>
  )
}
