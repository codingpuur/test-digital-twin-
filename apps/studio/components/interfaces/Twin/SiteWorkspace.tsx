import { useParams } from 'common'
import dynamic from 'next/dynamic'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as THREE from 'three'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from 'ui'

import { applyAssets } from './asset-bridge'
import { BottomDrawer } from './BottomDrawer'
import { buildDemoStation } from './demo-station'
import { HOLOGRAM_COLORS } from './hologram'
import { ImportDiffModal } from './ImportDiffModal'
import { InventoryTable } from './InventoryTable'
import { collectElements, loadModelFile } from './model-loaders'
import { ModulePanel } from './ModulePanel'
import { PanelToggles } from './PanelToggles'
import { PropertiesPanel } from './PropertiesPanel'
import { PumpWorkspace } from './pump/PumpWorkspace'
import type { AnimationBinding } from './simulation/animation.types'
import { getDefaultBindings } from './simulation/default-bindings'
import { getLiveSignals, getSimSignals, type Signals } from './simulation/signals'
import { SimulationBar } from './simulation/SimulationBar'
import type { DataSource } from './simulation/SimulationPanel'
import { SimulationResults } from './simulation/SimulationResults'
import { useSimulation } from './simulation/useSimulation'
import { getStatusColors, getUnlinkedColors, STATUS_COLORS } from './status-colors'
import { applyStreamColors, getStreamReadings, groupStreamsByTag } from './stream-bridge'
import { TOGGLE_STREAMS_DRAWER_EVENT } from './streams-drawer-events'
import { StreamsTable } from './StreamsTable'
import { DEFAULT_TWIN_MODULE } from './twin.types'
import { useCollapsiblePanel } from './useCollapsiblePanel'
import { useTwinStore } from './useTwinStore'
import type { ViewerApi } from './ViewerBridge'
import { useViews } from './views/useViews'
import type { TwinView, ViewSnapshot } from './views/views.types'
import { ViewsPanel } from './views/ViewsPanel'
import { ViewStyleToggle, type ViewStyle } from './ViewStyleToggle'
import { useVoiceCommands } from './voice/useVoiceCommands'
import { VoiceAgent } from './voice/VoiceAgent'
import { WorkspaceStatusBar } from './WorkspaceStatusBar'
import { TimelineBar } from '@/components/ui/Timeline/TimelineBar'
import { TimelinePill } from '@/components/ui/Timeline/TimelinePill'
import { useTimeline } from '@/components/ui/Timeline/useTimeline'
import { useTwinStreamsQuery } from '@/data/twin/twin-queries'
import {
  useCreateTwinTicketMutation,
  useTwinTicketsQuery,
} from '@/data/twin/twin-workspace-queries'
import { useLocalStorage } from '@/hooks/misc/useLocalStorage'
import { partsOfEquipment } from '@/lib/twin/equipment'

const TwinViewer = dynamic(() => import('./TwinViewer').then((mod) => mod.TwinViewer), {
  ssr: false,
})

const DEMO_MODEL_NAME = 'Demo pumping station'
// A stable empty list, so the viewer's highlight effect does not re-run on every render.
const NO_GROUP_IDS: string[] = []
// The demo hall is long, so it is viewed from the front rather than from a corner.
const DEMO_CAMERA_POSITION: [number, number, number] = [6, 12, 24]

type BottomTab = 'inventory' | 'streams' | 'simulation'

const DRAWER_TABS = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'streams', label: 'Streams' },
  { id: 'simulation', label: 'Simulation' },
]

/** The Pump twin module has its own workspace (fed by the pump twin API); every other module shares this one. */
export const SiteWorkspace = () => {
  const [moduleId] = useQueryState('module', parseAsString.withDefault(DEFAULT_TWIN_MODULE))
  return moduleId === 'pump' ? <PumpWorkspace /> : <ModelWorkspace />
}

const ModelWorkspace = () => {
  const { ref } = useParams()
  const [moduleId, setModuleId] = useQueryState(
    'module',
    parseAsString.withDefault(DEFAULT_TWIN_MODULE)
  )
  // Set when "Create ticket" is used on an asset: the tickets panel opens a form linked to it.
  const [newTicketAsset, setNewTicketAsset] = useState<string | null>(null)
  const { data: tickets = [] } = useTwinTicketsQuery(ref)

  const [scene, setScene] = useState<THREE.Object3D>(() => buildDemoStation())
  const [modelName, setModelName] = useState(DEMO_MODEL_NAME)
  const [isDemoModel, setIsDemoModel] = useState(true)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [highlightedEquipment, setHighlightedEquipment] = useState('')
  const store = useTwinStore(ref)
  const leftPanel = useCollapsiblePanel()
  // Properties stays closed until a part is selected (or the status bar button opens it).
  const rightPanel = useCollapsiblePanel({ startCollapsed: true, openSize: 300 })
  // The bottom drawer floats over the 3D view and stays closed until something needs it: the
  // Streams item in the sidebar, or a simulation.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerHeight, setDrawerHeight] = useLocalStorage('twin-drawer-height', 320)
  const drawer = {
    isCollapsed: !isDrawerOpen,
    toggle: () => setIsDrawerOpen((previous) => !previous),
    collapse: () => setIsDrawerOpen(false),
    expand: () => setIsDrawerOpen(true),
  }
  const streamsQuery = useTwinStreamsQuery(ref)
  // Revision of the saved model already shown, so restoring (or our own upload) is not re-applied.
  const shownRevision = useRef<number | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const [dataSource, setDataSource] = useState<DataSource>('live')
  const [bottomTab, setBottomTab] = useState<BottomTab>('inventory')

  const timeline = useTimeline()
  // Folded to a faint pill over the 3D view by default; the pill's expand button opens the full bar.
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const simulation = useSimulation()
  // How the 3D model is drawn: its own colours, status colours, or a glowing hologram.
  const [viewStyle, setViewStyle] = useState<ViewStyle>('status')
  const colorByStatus = viewStyle === 'status'
  const isHologram = viewStyle === 'hologram'
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
  const selectedEquipment = selectedElement?.equipment ?? ''
  const equipmentParts = partsOfEquipment(elements, selectedEquipment)
  // The whole unit only glows while a part of that same unit is selected.
  const groupIds =
    highlightedEquipment !== '' && highlightedEquipment === selectedEquipment
      ? equipmentParts.map((part) => part.id)
      : NO_GROUP_IDS

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
  // The hologram tints each part by the same status, so it needs the colours too.
  const colorsNow =
    colorByStatus || isHologram
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

  const createTicket = useCreateTwinTicketMutation(ref)
  const voice = useVoiceCommands({
    elements,
    isDemoModel,
    streamsByTag,
    onSelect: setSelectedId,
    onJumpTime: timeline.setCursor,
    onGoLive: timeline.goLive,
    onCreateTicket: (input) => createTicket.mutate(input),
  })

  // Saved views: camera and filters, kept like dashboards. `?view=` opens one (from a dashboard).
  const { views, addView, updateView, renameView, deleteView } = useViews(ref ?? '')
  const [viewerApi, setViewerApi] = useState<ViewerApi | null>(null)
  const [isViewsOpen, setIsViewsOpen] = useState(false)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [viewParam, setViewParam] = useQueryState('view')

  const takeSnapshot = (): ViewSnapshot | null => {
    const shot = viewerApi?.capture()
    if (!shot) return null
    return {
      thumbnail: shot.thumbnail,
      camera: shot.camera,
      hiddenCategories: [...hiddenCategories],
      selectedId,
      isColorByStatus: colorByStatus,
    }
  }

  const applyView = (view: TwinView) => {
    viewerApi?.applyCamera(view.camera)
    setHiddenCategories(new Set(view.hiddenCategories))
    setSelectedId(view.selectedId)
    setViewStyle(view.isColorByStatus ? 'status' : 'model')
    setActiveViewId(view.id)
  }

  const handleSaveView = () => {
    const snapshot = takeSnapshot()
    if (snapshot && activeViewId) updateView(activeViewId, snapshot)
  }

  const handleSaveViewAs = (name: string) => {
    const snapshot = takeSnapshot()
    if (!snapshot) return
    setActiveViewId(addView(name, snapshot).id)
  }

  // A dashboard links here with `?view=<id>`: apply it once the 3D canvas and the model are ready.
  useEffect(() => {
    const view = viewParam ? views.find((item) => item.id === viewParam) : undefined
    if (!view || !viewerApi || store.isRestoring) return
    // The viewer frames the whole model when it loads; wait for that so it does not undo the view.
    const timer = setTimeout(() => {
      applyView(view)
      setViewParam(null)
    }, 700)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParam, viewerApi, store.isRestoring, views.length])

  // Simulation shows its charts in the drawer; leaving it returns to the inventory.
  useEffect(() => {
    if (isSimulation) {
      setBottomTab('simulation')
      drawer.expand()
    } else {
      setBottomTab((tab) => (tab === 'simulation' ? 'inventory' : tab))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulation])

  // Selecting a part (in the 3D view or the inventory) opens the Properties panel.
  useEffect(() => {
    if (selectedId) rightPanel.expand()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Clicking Streams in the sidebar while it is already open toggles the drawer.
  useEffect(() => {
    const handleToggle = () => setIsDrawerOpen((previous) => !previous)
    window.addEventListener(TOGGLE_STREAMS_DRAWER_EVENT, handleToggle)
    return () => window.removeEventListener(TOGGLE_STREAMS_DRAWER_EVENT, handleToggle)
  }, [])

  // Opening Streams in the sidebar opens the drawer on the streams table.
  useEffect(() => {
    if (moduleId !== 'streams') return
    setBottomTab('streams')
    drawer.expand()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId])

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

  // Overlays that sit on the bottom edge of the 3D view lift above an open drawer.
  const overlayBottom = isDrawerOpen ? drawerHeight + 12 : 12

  const handleBindingsChange = (next: AnimationBinding[]) =>
    // On an uploaded model the demo defaults are hidden, not deleted: keep them for when the demo returns.
    setStoredBindings(
      isDemoModel
        ? next
        : [...storedBindings.filter((item) => item.id.startsWith('default-')), ...next]
    )

  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
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
              newTicketAsset={newTicketAsset}
              onNewTicketHandled={() => setNewTicketAsset(null)}
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
            <div className="flex h-full w-full flex-col bg-surface-100">
              {isSimulation && <SimulationBar simulation={simulation} />}
              {!isSimulation && isTimelineOpen && (
                <TimelineBar timeline={timeline} onCollapse={() => setIsTimelineOpen(false)} />
              )}
              <div className="relative min-h-0 flex-1">
                <PanelToggles
                  left={leftPanel}
                  bottom={drawer}
                  bottomOffset={overlayBottom}
                  isViewsOpen={isViewsOpen}
                  onToggleViews={() => setIsViewsOpen((previous) => !previous)}
                />
                {isViewsOpen && (
                  <ViewsPanel
                    siteRef={ref ?? ''}
                    views={views}
                    activeViewId={activeViewId}
                    onSave={handleSaveView}
                    onSaveAs={handleSaveViewAs}
                    onApply={applyView}
                    onUpdate={(view) => {
                      const snapshot = takeSnapshot()
                      if (snapshot) updateView(view.id, snapshot)
                    }}
                    onRename={(view, name) => renameView(view.id, name)}
                    onDelete={(view) => {
                      deleteView(view.id)
                      if (view.id === activeViewId) setActiveViewId(null)
                    }}
                    onClose={() => setIsViewsOpen(false)}
                  />
                )}
                <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-col items-start gap-y-2">
                  {!isSimulation && !isTimelineOpen && (
                    <TimelinePill timeline={timeline} onExpand={() => setIsTimelineOpen(true)} />
                  )}
                  <VoiceAgent
                    onCommand={voice.handleCommand}
                    isAwaitingConfirmation={voice.pendingTicketTag !== null}
                    hasHighlights={voice.alertIds.length > 0 || voice.scoreColors !== null}
                    onClear={voice.clear}
                  />
                  {isSimulation && simulation.snapshot.alarms.length > 0 && (
                    <div className="pointer-events-none flex flex-col items-start gap-y-1.5">
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
                </div>
                <TwinViewer
                  scene={scene}
                  selectedId={selectedId}
                  groupIds={groupIds}
                  isHologram={isHologram}
                  cameraPosition={isDemoModel ? DEMO_CAMERA_POSITION : undefined}
                  colorOverrides={voice.scoreColors ?? statusColors}
                  alertIds={voice.alertIds}
                  focusRequest={voice.focusRequest}
                  onViewerReady={setViewerApi}
                  bindings={bindings}
                  getSignals={getSignals}
                  showLabels={isDemoModel}
                  onSelect={setSelectedId}
                />
                <div
                  style={{ bottom: overlayBottom }}
                  className="absolute left-3 flex flex-col gap-y-2 rounded-md border bg-surface-100/90 px-3 py-2 text-xs"
                >
                  <ViewStyleToggle value={viewStyle} onChange={setViewStyle} />
                  {viewStyle !== 'model' && (
                    <div className="flex items-center gap-x-3 text-foreground-light">
                      {(['Normal', 'Warning', 'Unlinked'] as const).map((status) => (
                        <span key={status} className="flex items-center gap-x-1">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{
                              background: isHologram
                                ? HOLOGRAM_COLORS[
                                    status === 'Normal'
                                      ? 'normal'
                                      : status === 'Warning'
                                        ? 'warning'
                                        : 'unlinked'
                                  ]
                                : STATUS_COLORS[status],
                            }}
                          />
                          {status}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <BottomDrawer
                  isOpen={isDrawerOpen}
                  height={drawerHeight}
                  onHeightChange={setDrawerHeight}
                  tabs={DRAWER_TABS}
                  activeTab={bottomTab}
                  onTabChange={(tab) => setBottomTab(tab as BottomTab)}
                  onClose={drawer.collapse}
                >
                  {bottomTab === 'inventory' && (
                    <InventoryTable
                      elements={visibleElements}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                    />
                  )}
                  {bottomTab === 'streams' && <StreamsTable />}
                  {bottomTab === 'simulation' && (
                    <SimulationResults
                      history={simulation.snapshot.history}
                      log={simulation.snapshot.log}
                    />
                  )}
                </BottomDrawer>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="twin-properties"
            defaultSize={0}
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
              readingsLabel={
                isSimulation ? 'simulated' : new Date(timeline.cursor).toLocaleString()
              }
              bindings={bindings}
              onBindingsChange={handleBindingsChange}
              tickets={tickets}
              onCreateTicket={(assetTag) => {
                setNewTicketAsset(assetTag)
                setModuleId('tickets')
              }}
              equipmentPartCount={equipmentParts.length}
              isUnitHighlighted={groupIds.length > 0}
              onToggleUnitHighlight={() =>
                setHighlightedEquipment(groupIds.length > 0 ? '' : selectedEquipment)
              }
              isSavingEdits={store.isSavingEdits}
              onSaveEdits={store.saveEdits}
              onRevertEdits={store.revertEdits}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <WorkspaceStatusBar
        modelName={modelName}
        elementCount={elements.length}
        isPropertiesOpen={!rightPanel.isCollapsed}
        onToggleProperties={rightPanel.toggle}
      />
      <ImportDiffModal
        diff={store.pending?.diff ?? null}
        fileName={store.pending?.file.name ?? ''}
        isLoading={store.isCommitting}
        onConfirm={handleConfirmImport}
        onCancel={store.cancelPending}
      />
    </div>
  )
}
