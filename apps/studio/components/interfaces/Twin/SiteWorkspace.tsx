import dynamic from 'next/dynamic'
import { parseAsString, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'
import type * as THREE from 'three'
import { Switch } from 'ui'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from 'ui'

import { TimelineBar } from '@/components/ui/Timeline/TimelineBar'
import { useTimeline } from '@/components/ui/Timeline/useTimeline'

import { buildDemoStation } from './demo-station'
import { PropertiesPanel } from './PropertiesPanel'
import { getStatusColors, STATUS_COLORS } from './status-colors'
import { InventoryTable } from './InventoryTable'
import { collectElements, loadModelFile } from './model-loaders'
import { ModulePanel } from './ModulePanel'
import { DEFAULT_TWIN_MODULE } from './twin.types'

const TwinViewer = dynamic(() => import('./TwinViewer').then((mod) => mod.TwinViewer), {
  ssr: false,
})

const DEMO_MODEL_NAME = 'Demo pumping station'

export const SiteWorkspace = () => {
  const [moduleId] = useQueryState('module', parseAsString.withDefault(DEFAULT_TWIN_MODULE))

  const [scene, setScene] = useState<THREE.Object3D>(() => buildDemoStation())
  const [modelName, setModelName] = useState(DEMO_MODEL_NAME)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

  const timeline = useTimeline()
  const [colorByStatus, setColorByStatus] = useState(true)

  const elements = useMemo(() => collectElements(scene), [scene])
  const visibleElements = useMemo(
    () => elements.filter((element) => !hiddenCategories.has(element.category)),
    [elements, hiddenCategories]
  )

  const selectedElement = elements.find((element) => element.id === selectedId) ?? null

  // Recompute at most once a minute: readings only change that often.
  const minuteBucket = Math.floor(timeline.cursor / 60_000)
  const statusColors = useMemo(
    () => (colorByStatus ? getStatusColors(elements, minuteBucket * 60_000) : null),
    [colorByStatus, elements, minuteBucket]
  )

  const handleUploadFile = async (file: File) => {
    setIsLoadingModel(true)
    setModelError(null)
    try {
      setScene(await loadModelFile(file))
      setModelName(file.name)
      setSelectedId(null)
      setHiddenCategories(new Set())
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Could not load this model')
    } finally {
      setIsLoadingModel(false)
    }
  }

  const handleUseDemo = () => {
    setScene(buildDemoStation())
    setModelName(DEMO_MODEL_NAME)
    setSelectedId(null)
    setModelError(null)
  }

  const handleToggleCategory = (category: string) => {
    setHiddenCategories((previous) => {
      const next = new Set(previous)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
      <ResizablePanel id="twin-module-panel" defaultSize={300} minSize={220} maxSize={480}>
        <ModulePanel
          moduleId={moduleId}
          elements={elements}
          modelName={modelName}
          isLoadingModel={isLoadingModel}
          modelError={modelError}
          hiddenCategories={hiddenCategories}
          onToggleCategory={handleToggleCategory}
          onUploadFile={handleUploadFile}
          onUseDemo={handleUseDemo}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="twin-main">
        <ResizablePanelGroup orientation="vertical" className="h-full w-full">
          <ResizablePanel id="twin-viewer" defaultSize="58%" minSize="25%">
            <div className="flex h-full w-full flex-col bg-surface-100">
              <TimelineBar timeline={timeline} />
              <div className="relative min-h-0 flex-1">
                <TwinViewer
                  scene={scene}
                  selectedId={selectedId}
                  colorOverrides={statusColors}
                  onSelect={setSelectedId}
                />
                <div className="absolute bottom-3 left-3 flex flex-col gap-y-2 rounded-md border bg-surface-100/90 px-3 py-2 text-xs">
                  <label className="flex items-center gap-x-2">
                    <Switch checked={colorByStatus} onCheckedChange={setColorByStatus} />
                    Colour by status
                  </label>
                  {colorByStatus && (
                    <div className="flex items-center gap-x-3 text-foreground-light">
                      {(['Normal', 'Warning', 'Unlinked'] as const).map((status) => (
                        <span key={status} className="flex items-center gap-x-1">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ background: STATUS_COLORS[status] }}
                          />
                          {status}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="twin-inventory" defaultSize="42%" minSize="15%">
            <InventoryTable
              elements={visibleElements}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="twin-properties" defaultSize={300} minSize={220} maxSize={480}>
        <PropertiesPanel element={selectedElement} time={timeline.cursor} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
