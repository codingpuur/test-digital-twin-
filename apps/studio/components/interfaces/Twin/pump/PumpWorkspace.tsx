import { useParams } from 'common'
import { Boxes } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { Badge, ResizableHandle, ResizablePanel, ResizablePanelGroup } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { BottomDrawer } from '../BottomDrawer'
import { collectElements } from '../model-loaders'
import { PanelToggles } from '../PanelToggles'
import { useCollapsiblePanel } from '../useCollapsiblePanel'
import { ViewStyleToggle, type ViewStyle } from '../ViewStyleToggle'
import { WorkspaceStatusBar } from '../WorkspaceStatusBar'
import { applyLayer, clearLayer } from './pump-layer'
import { buildRequest, EMPTY_FORM, isChanged, type PumpFormState } from './pump-request'
import { buildPumpScene, colorsByComponent, PUMP_STATUS_COLORS } from './pump-scene'
import { MotorCharts, PerformanceCharts, RotorCharts } from './PumpCharts'
import { PumpFmea } from './PumpFmea'
import { PumpLayerPicker } from './PumpLayerPicker'
import { PumpPanel } from './PumpPanel'
import { PumpProperties } from './PumpProperties'
import { PumpResults } from './PumpResults'
import { PumpTelemetry } from './PumpTelemetry'
import {
  usePumpBaselineQuery,
  usePumpDefaultsQuery,
  usePumpFmeaQuery,
  usePumpLatestQuery,
  usePumpLayerQuery,
  usePumpLayersQuery,
  usePumpListQuery,
  usePumpMeshQuery,
  usePumpMetaQuery,
  usePumpWhatIfMutation,
} from '@/data/twin/pump-queries'
import type { PumpStatus } from '@/data/twin/pump-types'
import { useLocalStorage } from '@/hooks/misc/useLocalStorage'

const TwinViewer = dynamic(() => import('../TwinViewer').then((mod) => mod.TwinViewer), {
  ssr: false,
})

// The chart tabs (id and name) come from the backend with the charts; the rest are fixed.
type PumpTab = string

const CHART_VIEWS = {
  hyd: PerformanceCharts,
  rot: RotorCharts,
  mot: MotorCharts,
} as const

const STATUS_LEGEND: { status: PumpStatus; label: string }[] = [
  { status: 'ok', label: 'Healthy' },
  { status: 'watch', label: 'Needs attention' },
  { status: 'act', label: 'Critical' },
]

/** The Pump module: the same workspace as the rest of the site, fed only by the pump twin API. */
export const PumpWorkspace = () => {
  const { ref } = useParams()
  const metaQuery = usePumpMetaQuery(ref)
  const meta = metaQuery.data
  const meshQuery = usePumpMeshQuery(ref, Boolean(meta))
  const pumpsQuery = usePumpListQuery(ref, Boolean(meta))

  const [pumpChoice, setPumpChoice] = useState<number | null>(null)
  const pump = pumpChoice ?? meta?.pumps[0]
  const defaultsQuery = usePumpDefaultsQuery(ref, pump)
  const baselineQuery = usePumpBaselineQuery(ref, pump)
  const latestQuery = usePumpLatestQuery(ref, pump)
  const whatIf = usePumpWhatIfMutation(ref, pump)

  const [form, setForm] = useState<PumpFormState>(EMPTY_FORM)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewStyle, setViewStyle] = useState<ViewStyle>('status')
  const [tab, setTab] = useState<PumpTab>('whatif')
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)
  const [drawerHeight, setDrawerHeight] = useLocalStorage('twin-drawer-height', 320)
  const leftPanel = useCollapsiblePanel()
  const rightPanel = useCollapsiblePanel({ openSize: 300 })
  const drawer = {
    isCollapsed: !isDrawerOpen,
    toggle: () => setIsDrawerOpen((previous) => !previous),
    collapse: () => setIsDrawerOpen(false),
    expand: () => setIsDrawerOpen(true),
  }

  const scene = useMemo(
    () => (meshQuery.data && pump ? buildPumpScene(meshQuery.data, `Pump P${pump}`) : null),
    [meshQuery.data, pump]
  )
  const elements = useMemo(() => (scene ? collectElements(scene) : []), [scene])
  const result = whatIf.data ?? baselineQuery.data
  const view = result?.view

  // The backend keeps the 3D layers of each pump's last run: the scenario's once one was run.
  const which = whatIf.data ? 'scenario' : 'baseline'
  const runId = whatIf.data ? whatIf.submittedAt : baselineQuery.dataUpdatedAt
  const [layerKey, setLayerKey] = useState<string | null>(null)
  const layersQuery = usePumpLayersQuery(ref, pump, which, Boolean(result))
  const layerQuery = usePumpLayerQuery(ref, pump, which, layerKey, runId)
  const layer = layerKey ? (layerQuery.data ?? null) : null

  useEffect(() => {
    if (!scene) return
    if (layer) applyLayer(scene, layer)
    else clearLayer(scene)
    return () => clearLayer(scene)
  }, [scene, layer])

  const colorOverrides = useMemo(() => {
    // Under a layer every part is white, so the layer's own colours show unchanged.
    if (layerKey) return Object.fromEntries(elements.map((element) => [element.id, '#ffffff']))
    if (!view) return null
    const statusOf = Object.fromEntries(view.components.map((item) => [item.key, item.status]))
    return colorsByComponent(elements, statusOf)
  }, [view, elements, layerKey])

  const fmeaQuery = usePumpFmeaQuery(ref, pump, tab === 'fmea')
  const chartTabs = result?.scenario.charts.tabs ?? []
  const drawerTabs = [
    { id: 'whatif', label: 'What-if' },
    ...chartTabs.map(([id, label]) => ({ id, label })),
    { id: 'fmea', label: 'Failure modes' },
    { id: 'telemetry', label: 'Telemetry' },
  ]
  const ChartView = tab in CHART_VIEWS ? CHART_VIEWS[tab as keyof typeof CHART_VIEWS] : null
  const attention = result?.scenario.dots[tab] ?? []

  const selectedElement = elements.find((element) => element.id === selectedId) ?? null
  const overlayBottom = isDrawerOpen ? drawerHeight + 12 : 12

  const handlePumpChange = (next: number) => {
    setPumpChoice(next)
    setForm(EMPTY_FORM)
    setSelectedId(null)
    setLayerKey(null)
    whatIf.reset()
  }

  const handleRun = () => {
    if (!defaultsQuery.data) return
    const request = buildRequest(defaultsQuery.data.defaults, form)
    if (!isChanged(form, request)) return whatIf.reset()
    whatIf.mutate(request)
    setTab('whatif')
    setIsDrawerOpen(true)
  }

  const handleReset = () => {
    setForm(EMPTY_FORM)
    whatIf.reset()
  }

  if (metaQuery.isPending) return <p className="p-6 text-sm text-foreground-lighter">Loading…</p>
  if (!meta) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyStatePresentational
          icon={Boxes}
          title="Pump twin not connected"
          description={`Set TWIN_PUMP_API_URL (and TWIN_PUMP_API_KEY) on the server. ${metaQuery.error?.message ?? ''}`}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          <ResizablePanel
            id="pump-module-panel"
            defaultSize={300}
            minSize={220}
            maxSize={480}
            {...leftPanel.panelProps}
          >
            <div className="h-full overflow-y-auto bg-dash-sidebar">
              <PumpPanel
                meta={meta}
                pumps={pumpsQuery.data ?? []}
                pump={pump ?? meta.pumps[0]}
                onPumpChange={handlePumpChange}
                defaults={defaultsQuery.data}
                form={form}
                onFormChange={setForm}
                isRunning={whatIf.isPending}
                onRun={handleRun}
                onReset={handleReset}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="pump-main">
            <div className="relative h-full w-full bg-surface-100">
              <PanelToggles left={leftPanel} bottom={drawer} bottomOffset={overlayBottom} />
              <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-col items-start gap-y-1.5">
                {view?.alarms.map((alarm) => (
                  <div
                    key={alarm.text}
                    className={
                      alarm.severity === 'act'
                        ? 'animate-pulse rounded-md border border-destructive bg-destructive-200 px-2.5 py-1 text-xs text-destructive'
                        : 'rounded-md border border-warning bg-warning-200 px-2.5 py-1 text-xs text-warning'
                    }
                  >
                    ⚠ {alarm.text}
                  </div>
                ))}
              </div>
              {meshQuery.isPending && (
                <p className="p-6 text-sm text-foreground-lighter">Loading the pump model…</p>
              )}
              {scene && (
                <TwinViewer
                  scene={scene}
                  selectedId={selectedId}
                  isHologram={viewStyle === 'hologram' && !layerKey}
                  cameraPosition={[2.2, 1.4, 2.6]}
                  colorOverrides={viewStyle === 'model' ? null : colorOverrides}
                  showLabels={false}
                  onSelect={(id) => {
                    setSelectedId(id)
                    if (id) rightPanel.expand()
                  }}
                />
              )}
              <div
                style={{ bottom: overlayBottom }}
                className="absolute left-3 flex flex-col gap-y-2 rounded-md border bg-surface-100/90 px-3 py-2 text-xs"
              >
                <PumpLayerPicker
                  layers={layersQuery.data ?? []}
                  activeKey={layerKey}
                  active={layer}
                  isLoading={layerQuery.isFetching}
                  onChange={setLayerKey}
                />
                {!layerKey && <ViewStyleToggle value={viewStyle} onChange={setViewStyle} />}
                {!layerKey && viewStyle !== 'model' && (
                  <div className="flex items-center gap-x-3 text-foreground-light">
                    {STATUS_LEGEND.map((item) => (
                      <span key={item.status} className="flex items-center gap-x-1">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ background: PUMP_STATUS_COLORS[item.status] }}
                        />
                        {meta.status_labels[item.status] ?? item.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <BottomDrawer
                isOpen={isDrawerOpen}
                height={drawerHeight}
                onHeightChange={setDrawerHeight}
                tabs={drawerTabs}
                activeTab={tab}
                onTabChange={(id) => setTab(id as PumpTab)}
                onClose={drawer.collapse}
              >
                {tab === 'whatif' && result && <PumpResults result={result} />}
                {tab === 'whatif' && !result && (
                  <p className="p-3 text-sm text-foreground-lighter">Reading the pump…</p>
                )}
                {ChartView && result && (
                  <div className="flex h-full flex-col overflow-y-auto">
                    {attention.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-3 pt-2">
                        {attention.map(([level, text]) => (
                          <Badge key={text} variant={level === 'bad' ? 'destructive' : 'warning'}>
                            {text}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap">
                      <ChartView charts={result.scenario.charts} />
                    </div>
                  </div>
                )}
                {tab === 'fmea' && <PumpFmea reply={fmeaQuery.data} />}
                {tab === 'telemetry' && <PumpTelemetry latest={latestQuery.data} />}
              </BottomDrawer>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="pump-properties"
            defaultSize={300}
            minSize={220}
            maxSize={480}
            {...rightPanel.panelProps}
          >
            <PumpProperties element={selectedElement} view={view} meta={meta} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <WorkspaceStatusBar
        modelName={`${meta.station} · pump ${pump} · ${meta.source}`}
        elementCount={elements.length}
        isPropertiesOpen={!rightPanel.isCollapsed}
        onToggleProperties={rightPanel.toggle}
      />
    </div>
  )
}
