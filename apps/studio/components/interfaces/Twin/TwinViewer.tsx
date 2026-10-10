import { Bounds, GizmoHelper, GizmoViewcube, Grid, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { AnimationBinding } from './simulation/animation.types'
import { AnimationDriver } from './simulation/AnimationDriver'
import { LabelOverlay, LabelProjector, resolveLabelTargets } from './simulation/SignalLabels'
import type { Signals } from './simulation/signals'
import type { TwinElement } from './twin.types'
import { applyColorOverrides, highlightSelection } from './viewer-helpers'
import { ViewerBridge, type ViewerApi } from './ViewerBridge'
import { AlertBlink, CameraFocus, type FocusRequest } from './ViewerEffects'

type TwinViewerProps = {
  scene: THREE.Object3D
  selectedId: string | null
  /** Where the camera starts; it is then moved back until the whole model fits. */
  cameraPosition?: [number, number, number]
  /** Other parts of the selected element's equipment, glowing dimmer than the selection. */
  groupIds?: string[]
  /** Element id to colour, e.g. by status. Elements missing from the map keep their own colour. */
  colorOverrides?: Record<string, string> | null
  bindings?: AnimationBinding[]
  /** Latest signal values; read every frame by the animation driver. */
  getSignals?: () => Signals
  showLabels?: boolean
  /** Elements that blink red, e.g. the ones the voice agent says are in danger. */
  alertIds?: string[]
  /** Asks the camera to fly to an element (or back to the whole model when `id` is null). */
  focusRequest?: FocusRequest | null
  /** Called with a handle to capture thumbnails and move the camera (null when the canvas unmounts). */
  onViewerReady?: (api: ViewerApi | null) => void
  onSelect: (id: string | null) => void
}

const DEFAULT_CAMERA_POSITION: [number, number, number] = [14, 10, 14]

// A stable empty list, so the highlight effect does not re-run on every render.
const NO_GROUP: string[] = []

export const TwinViewer = ({
  scene,
  selectedId,
  cameraPosition = DEFAULT_CAMERA_POSITION,
  groupIds = NO_GROUP,
  colorOverrides = null,
  bindings = [],
  getSignals,
  showLabels = true,
  alertIds = [],
  focusRequest = null,
  onViewerReady,
  onSelect,
}: TwinViewerProps) => {
  useEffect(() => {
    applyColorOverrides(scene, colorOverrides)
  }, [scene, colorOverrides])

  const labelElements = useRef(new Map<string, HTMLDivElement>())
  const labelTargets = useMemo(() => resolveLabelTargets(scene), [scene])
  const hasLabels = showLabels && !!getSignals

  useEffect(() => {
    highlightSelection(scene, selectedId, groupIds)
  }, [scene, selectedId, groupIds])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    // Animated child parts (impellers, water) have no data of their own: select their element instead.
    let target: THREE.Object3D | null = event.object
    while (target && !target.userData.twin) target = target.parent
    const twin: TwinElement | undefined = target?.userData.twin
    onSelect(twin?.id ?? null)
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        onPointerMissed={() => onSelect(null)}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 16, 6]} intensity={1.4} />
        <directionalLight position={[-8, 6, -10]} intensity={0.4} />
        <Grid
          position={[0, -0.31, 0]}
          args={[40, 40]}
          cellColor="#6b7280"
          sectionColor="#9ca3af"
          fadeDistance={45}
          infiniteGrid
        />
        <Bounds key={scene.uuid} fit observe margin={1.3}>
          <primitive object={scene} onClick={handleClick} />
          <CameraFocus scene={scene} request={focusRequest} />
        </Bounds>
        {onViewerReady && <ViewerBridge onReady={onViewerReady} />}
        <AlertBlink
          scene={scene}
          ids={alertIds}
          selectedId={selectedId}
          groupIds={groupIds}
          colorOverrides={colorOverrides}
        />
        {getSignals && (
          <AnimationDriver
            scene={scene}
            bindings={bindings}
            getSignals={getSignals}
            selectedId={selectedId}
          />
        )}
        {getSignals && hasLabels && (
          <LabelProjector targets={labelTargets} elements={labelElements} getSignals={getSignals} />
        )}
        <OrbitControls makeDefault />
        <GizmoHelper alignment="top-right" margin={[72, 72]}>
          <GizmoViewcube />
        </GizmoHelper>
      </Canvas>
      {hasLabels && <LabelOverlay targets={labelTargets} elements={labelElements} />}
    </div>
  )
}
