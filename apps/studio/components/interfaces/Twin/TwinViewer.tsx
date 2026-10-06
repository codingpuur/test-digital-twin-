import { Bounds, GizmoHelper, GizmoViewcube, Grid, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { AnimationBinding } from './simulation/animation.types'
import { AnimationDriver } from './simulation/AnimationDriver'
import { LabelOverlay, LabelProjector, resolveLabelTargets } from './simulation/SignalLabels'
import type { Signals } from './simulation/signals'
import type { TwinElement } from './twin.types'

const SELECTED_EMISSIVE = new THREE.Color('#3ecf8e')
const NO_EMISSIVE = new THREE.Color('#000000')

/** The element an object belongs to: itself, or the nearest ancestor that carries element data. */
const findTwin = (object: THREE.Object3D): TwinElement | undefined => {
  let current: THREE.Object3D | null = object
  while (current && !current.userData.twin) current = current.parent
  return current?.userData.twin
}

const applyColorOverrides = (root: THREE.Object3D, overrides: Record<string, string> | null) => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    const material = mesh.material as THREE.MeshStandardMaterial | undefined
    if (!mesh.isMesh || !material?.color) return
    // Remember the model's own colour the first time we touch it.
    mesh.userData.baseColor ??= material.color.getHex()
    const override = overrides?.[findTwin(mesh)?.id ?? '']
    material.color.set(override ?? mesh.userData.baseColor)
  })
}

const highlightSelection = (root: THREE.Object3D, selectedId: string | null) => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    const material = mesh.material as THREE.MeshStandardMaterial | undefined
    if (!mesh.isMesh || !material?.emissive) return
    const twin = findTwin(mesh)
    const isSelected = !!twin && twin.id === selectedId
    material.emissive.copy(isSelected ? SELECTED_EMISSIVE : NO_EMISSIVE)
    material.emissiveIntensity = isSelected ? 0.8 : 0
  })
}

type TwinViewerProps = {
  scene: THREE.Object3D
  selectedId: string | null
  /** Element id to colour, e.g. by status. Elements missing from the map keep their own colour. */
  colorOverrides?: Record<string, string> | null
  bindings?: AnimationBinding[]
  /** Latest signal values; read every frame by the animation driver. */
  getSignals?: () => Signals
  showLabels?: boolean
  onSelect: (id: string | null) => void
}

export const TwinViewer = ({
  scene,
  selectedId,
  colorOverrides = null,
  bindings = [],
  getSignals,
  showLabels = true,
  onSelect,
}: TwinViewerProps) => {
  useEffect(() => {
    applyColorOverrides(scene, colorOverrides)
  }, [scene, colorOverrides])

  const labelElements = useRef(new Map<string, HTMLDivElement>())
  const labelTargets = useMemo(() => resolveLabelTargets(scene), [scene])
  const hasLabels = showLabels && !!getSignals

  useEffect(() => {
    highlightSelection(scene, selectedId)
  }, [scene, selectedId])

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
        camera={{ position: [14, 10, 14], fov: 45 }}
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
        <Bounds fit observe margin={1.3}>
          <primitive object={scene} onClick={handleClick} />
        </Bounds>
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
