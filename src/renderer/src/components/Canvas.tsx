import { useEffect, useState, useRef, useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI, AppState } from '@excalidraw/excalidraw/types/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'

interface Props {
  project: ProjectFile
}

const SAVE_DELAY = 1000

export default function Canvas({ project }: Props) {
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[]
    appState: Partial<AppState>
    files: Record<string, unknown>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    window.api.readProject(project.path).then((raw) => {
      if (cancelled) return
      if (raw) {
        try {
          const data = JSON.parse(raw)
          setInitialData({
            elements: data.elements ?? [],
            appState: {
              ...(data.appState ?? {}),
              collaborators: new Map()
            },
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
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        // flush pending save synchronously on unmount
        if (isDirtyRef.current && apiRef.current) {
          const scene = apiRef.current.getSceneElements()
          const appState = apiRef.current.getAppState()
          const files = apiRef.current.getFiles()
          const payload = JSON.stringify({
            type: 'excalidraw',
            version: 2,
            source: 'multi-projects-excalidraw',
            elements: scene,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              gridSize: appState.gridSize
            },
            files
          }, null, 2)
          window.api.saveProject(project.path, payload)
        }
      }
    }
  }, [project.path])

  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!apiRef.current) return
      const elements = apiRef.current.getSceneElements()
      const appState = apiRef.current.getAppState()
      const files = apiRef.current.getFiles()
      const payload = JSON.stringify({
        type: 'excalidraw',
        version: 2,
        source: 'multi-projects-excalidraw',
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize
        },
        files
      }, null, 2)
      await window.api.saveProject(project.path, payload)
      isDirtyRef.current = false
    }, SAVE_DELAY)
  }, [project.path])

  if (loading || !initialData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)',
        fontSize: '14px'
      }}>
        Carregando projeto...
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
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
    </div>
  )
}
