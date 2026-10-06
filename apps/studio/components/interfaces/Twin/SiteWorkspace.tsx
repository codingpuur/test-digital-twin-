import { useParams } from 'common'
import dynamic from 'next/dynamic'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as THREE from 'three'
import { cn, ResizableHandle, ResizablePanel, ResizablePanelGroup, Switch } from 'ui'

import { applyAssets } from './asset-bridge'
import { buildDemoStation } from './demo-station'
import { ImportDiffModal } from './ImportDiffModal'
import { InventoryTable } from './InventoryTable'
import { collectElements, loadModelFile } from './model-loaders'
import { ModulePanel } from './ModulePanel'
import { PanelToggles } from './PanelToggles'
import { PropertiesPanel } from './PropertiesPanel'
import type { AnimationBinding } from './simulation/animation.types'
import { getDefaultBindings } from './simulation/default-bindings'
import { getLiveSignals, getSimSignals, type Signals } from './simulation/signals'
import { SimulationBar } from './simulation/SimulationBar'
import type { DataSource } from './simulation/SimulationPanel'
import { SimulationResults } from './simulation/SimulationResults'
import { useSimulation } from './simulation/useSimulation'
import { getStatusColors, getUnlinkedColors, STATUS_COLORS } from './status-colors'
import { applyStreamColors, getStreamReadings, groupStreamsByTag } from './stream-bridge'
import { DEFAULT_TWIN_MODULE } from './twin.types'
import { useCollapsiblePanel } from './useCollapsiblePanel'
import { useTwinStore } from './useTwinStore'
import { TimelineBar } from '@/components/ui/Timeline/TimelineBar'
import { useTimeline } from '@/components/ui/Timeline/useTimeline'
import { useTwinStreamsQuery } from '@/data/twin/twin-queries'
import { useLocalStorage } from '@/hooks/misc/useLocalStorage'

const TwinViewer = dynamic(() => import('./TwinViewer').then((mod) => mod.TwinViewer), {
  ssr: false,
})

const DEMO_MODEL_NAME = 'Demo pumping station'

type BottomTab = 'inventory' | 'simulation'

export const SiteWorkspace = () => {
  const { ref } = useParams()
  const [moduleId] = useQueryState('module', parseAsString.withDefault(DEFAULT_TWIN_MODULE))

  const [scene, setScene] = useState<THREE.Object3D>(() => buildDemoStation())
  const [modelName, setModelName] = useState(DEMO_MODEL_NAME)
  const [isDemoModel, setIsDemoModel] = useState(true)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const store = useTwinStore(ref)
  const leftPanel = useCollapsiblePanel()
  const rightPanel = useCollapsiblePanel()
  const bottomPanel = useCollapsiblePanel()
  const streamsQuery = useTwinStreamsQuery(ref)
  // Revision of the saved model already shown, so restoring (or our own upload) is not re-applied.
  const shownRevision = useRef<number | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const [dataSource, setDataSource] = useState<DataSource>('live')
  const [bottomTab, setBottomTab] = useState<BottomTab>('inventory')

  const timeline = useTimeline()
  const simulation = useSimulation()
  const [colorByStatus, setColorByStatus] = useState(true)
  const [storedBindings, setStoredBindings] = useLocalStorage<AnimationBinding[]>(
    `twin-bindings-${ref ?? 'site'}`,
    getDefaultBindings()
  )
  // Bindings match elements by name, so the demo's defaults mean nothing for an uploaded model.
  const bindings = useMemo(
    () =>
      isDemoModel
        ? storedBindings
        : storedBindings.filter((item) => !item.id.startsWith('default-')),
    [isDemoModel, storedBindings]
  )

  const isSimulation = dataSource === 'sim'

  const sceneElements = useMemo(() => collectElements(scene), [scene])
  // The demo has no asset records; an uploaded model is overlaid with the site's saved assets.
  const elements = useMemo(
    () => (isDemoModel ? sceneElements : applyAssets(sceneElements, store.assets)),
    [isDemoModel, sceneElements, store.assets]
  )
  const visibleElements = useMemo(
    () => elements.filter((element) => !hiddenCategories.has(element.category)),
    [elements, hiddenCategories]
  )
  const selectedElement = elements.find((element) => element.id === selectedId) ?? null

  // Live signals follow the timeline cursor; simulated signals come from the model.
  const cursorSecond = Math.floor(timeline.cursor / 1000)
  const liveSignals = useMemo(() => getLiveSignals(cursorSecond * 1000), [cursorSecond])
  const liveSignalsRef = useRef<Signals>(liveSignals)
  liveSignalsRef.current = liveSignals

  const getSignals = useCallback(
    () => (isSimulation ? simulation.signalsRef.current : liveSignalsRef.current),
    [isSimulation, simulation.signalsRef]
  )

  // React-side copy (throttled for the simulation) for panels and colours.
  const signals = isSimulation
    ? getSimSignals(simulation.snapshot.state, simulation.snapshot.controls)
    : liveSignals
  // Live follows the newest reading; scrubbing the timeline replays what was stored at that time.
  const replayAt = timeline.isLive ? null : timeline.cursor
  const streamsByTag = useMemo(
    () => groupStreamsByTag(streamsQuery.data?.streams ?? []),
    [streamsQuery.data]
  )
  const colorsNow = colorByStatus
    ? applyStreamColors(
        isDemoModel ? getStatusColors(elements, signals) : getUnlinkedColors(elements),
        elements,
        streamsByTag,
        replayAt
      )
    : null
  // Colours only change when a reading crosses a threshold: key on the result so the viewer is not
  // re-tinted on every throttled simulation update.
  const colorKey = JSON.stringify(colorsNow)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const statusColors = useMemo(() => colorsNow, [colorKey])

  // Switching to simulation shows its charts; switching back returns to the inventory.
  useEffect(() => {
    setBottomTab(isSimulation ? 'simulation' : 'inventory')
  }, [isSimulation])

  const showModel = (nextScene: THREE.Object3D, name: string, revision: number | null) => {
    shownRevision.current = revision
    setScene(nextScene)
    setModelName(name)
    setIsDemoModel(false)
    setSelectedId(null)
    setHiddenCategories(new Set())
  }

  // Bring the site's saved model back after a refresh or when opening the site later.
  useEffect(() => {
    const { model, savedFile } = store
    if (!model || !savedFile || shownRevision.current === model.revision) return
    shownRevision.current = model.revision
    loadModelFile(savedFile)
      .then((loaded) => showModel(loaded, model.name, model.revision))
      .catch((error) =>
        setModelError(error instanceof Error ? error.message : 'Could not load the saved model')
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.model, store.savedFile])

  const handleUploadFile = async (file: File) => {
    setIsLoadingModel(true)
    setModelError(null)
    try {
      const loaded = await loadModelFile(file)
      const revision = await store.requestModelImport(file, loaded)
      if (revision !== null) showModel(loaded, file.name, revision)
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Could not load this model')
    } finally {
      setIsLoadingModel(false)
    }
  }

  const handleConfirmImport = async () => {
    const applied = await store.confirmPending()
    if (applied) showModel(applied.scene, applied.file.name, applied.revision)
  }

  const handleUseDemo = () => {
    setScene(buildDemoStation())
    setModelName(DEMO_MODEL_NAME)
    setIsDemoModel(true)
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

  const handleBindingsChange = (next: AnimationBinding[]) =>
    // On an uploaded model the demo defaults are hidden, not deleted: keep them for when the demo returns.
    setStoredBindings(
      isDemoModel
        ? next
        : [...storedBindings.filter((item) => item.id.startsWith('default-')), ...next]
    )

  return (
    <>
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        <ResizablePanel
          id="twin-module-panel"
          defaultSize={300}
          minSize={220}
          maxSize={480}
          {...leftPanel.panelProps}
        >
          <ModulePanel
            moduleId={moduleId}
            elements={elements}
            modelName={modelName}
            modelRevision={isDemoModel ? undefined : store.model?.revision}
            isImportingCsv={store.isImportingCsv}
            csvResult={store.csvResult}
            csvError={store.csvError}
            onUploadCsv={store.importCsv}
            isLoadingModel={isLoadingModel}
            modelError={modelError}
            hiddenCategories={hiddenCategories}
            onToggleCategory={handleToggleCategory}
            onUploadFile={handleUploadFile}
            onUseDemo={handleUseDemo}
            simulation={simulation}
            dataSource={dataSource}
            onDataSourceChange={setDataSource}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="twin-main">
          <ResizablePanelGroup orientation="vertical" className="h-full w-full">
            <ResizablePanel id="twin-viewer" defaultSize="58%" minSize="25%">
              <div className="flex h-full w-full flex-col bg-surface-100">
                {isSimulation ? (
                  <SimulationBar simulation={simulation} />
                ) : (
                  <TimelineBar timeline={timeline} />
                )}
                <div className="relative min-h-0 flex-1">
                  <PanelToggles left={leftPanel} right={rightPanel} bottom={bottomPanel} />
                  <TwinViewer
                    scene={scene}
                    selectedId={selectedId}
                    colorOverrides={statusColors}
                    bindings={bindings}
                    getSignals={getSignals}
                    showLabels={isDemoModel}
                    onSelect={setSelectedId}
                  />
                  {isSimulation && simulation.snapshot.alarms.length > 0 && (
                    <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-y-1.5">
                      {simulation.snapshot.alarms.map((alarm) => (
                        <div
                          key={alarm}
                          className="animate-pulse rounded-md border border-destructive bg-destructive-200 px-2.5 py-1 text-xs text-destructive"
                        >
                          ⚠ {alarm}
                        </div>
                      ))}
                    </div>
                  )}
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
            <ResizablePanel
              id="twin-bottom"
              defaultSize="42%"
              minSize="15%"
              {...bottomPanel.panelProps}
            >
              <div className="flex h-full flex-col bg-surface-100">
                <div className="flex gap-x-1 border-b px-3">
                  {(['inventory', 'simulation'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setBottomTab(tab)}
                      className={cn(
                        'border-b-2 px-3 py-2 text-sm capitalize transition-colors',
                        bottomTab === tab
                          ? 'border-brand text-foreground'
                          : 'border-transparent text-foreground-light hover:text-foreground'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 flex-1">
                  {bottomTab === 'inventory' && (
                    <InventoryTable
                      elements={visibleElements}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                    />
                  )}
                  {bottomTab === 'simulation' && (
                    <SimulationResults
                      history={simulation.snapshot.history}
                      log={simulation.snapshot.log}
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="twin-properties"
          defaultSize={300}
          minSize={220}
          maxSize={480}
          {...rightPanel.panelProps}
        >
          <PropertiesPanel
            element={selectedElement}
            signals={signals}
            isDemoModel={isDemoModel}
            streamReadings={
              selectedElement ? getStreamReadings(selectedElement, streamsByTag, replayAt) : []
            }
            readingsLabel={isSimulation ? 'simulated' : new Date(timeline.cursor).toLocaleString()}
            bindings={bindings}
            onBindingsChange={handleBindingsChange}
            isSavingEdits={store.isSavingEdits}
            onSaveEdits={store.saveEdits}
            onRevertEdits={store.revertEdits}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      <ImportDiffModal
        diff={store.pending?.diff ?? null}
        fileName={store.pending?.file.name ?? ''}
        isLoading={store.isCommitting}
        onConfirm={handleConfirmImport}
        onCancel={store.cancelPending}
      />
    </>
  )
}
