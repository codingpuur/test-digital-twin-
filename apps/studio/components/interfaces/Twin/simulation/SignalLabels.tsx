import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'

import type { TwinElement } from '../twin.types'
import type { Signals } from './signals'
import { HIGH_LEVEL_WARNING, PRESSURE_WARNING, VIBRATION_WARNING } from './simulation.model'

type LabelSpec = {
  id: string
  elementName: string
  offset: [number, number, number]
  text: (signals: Signals) => string
  isWarning: (signals: Signals) => boolean
}

const PUMP_LABELS: LabelSpec[] = [1, 2, 3].map((n) => ({
  id: `pump-${n}`,
  elementName: `P-10${n} Pump`,
  offset: [0, 2.6, 0],
  text: (s) => `${(s[`p${n}.speed`] ?? 0) > 1 ? '●' : '○'} ${Math.round(s[`p${n}.speed`] ?? 0)}%`,
  isWarning: (s) => (s[`p${n}.vib`] ?? 0) > VIBRATION_WARNING,
}))

const LABEL_SPECS: LabelSpec[] = [
  {
    id: 'level',
    elementName: 'Wet well',
    offset: [0, 2.2, 0],
    text: (s) => `LT-001 · ${Math.round(s.level ?? 0)} %`,
    isWarning: (s) => (s.level ?? 0) > HIGH_LEVEL_WARNING,
  },
  {
    id: 'discharge',
    elementName: 'Discharge header',
    offset: [0, 1.6, 0],
    text: (s) =>
      `${Math.round(s.flow ?? 0).toLocaleString()} m³/h · ${(s.pressure ?? 0).toFixed(1)} bar`,
    isWarning: (s) => (s.pressure ?? 0) > PRESSURE_WARNING,
  },
  ...PUMP_LABELS,
]

export type LabelTarget = { spec: LabelSpec; position: THREE.Vector3 }

/** Finds the world position of each labelled element in a loaded model. Elements the model lacks are skipped. */
export const resolveLabelTargets = (scene: THREE.Object3D): LabelTarget[] => {
  const byName = new Map<string, THREE.Object3D>()
  scene.updateMatrixWorld(true)
  scene.traverse((object) => {
    const twin: TwinElement | undefined = object.userData.twin
    if (twin) byName.set(twin.name, object)
  })
  return LABEL_SPECS.flatMap((spec) => {
    const object = byName.get(spec.elementName)
    if (!object) return []
    const position = object
      .getWorldPosition(new THREE.Vector3())
      .add(new THREE.Vector3(...spec.offset))
    return [{ spec, position }]
  })
}

const TEXT_REFRESH_SECONDS = 0.25

type LabelProjectorProps = {
  targets: LabelTarget[]
  /** DOM nodes of the label overlay, keyed by label id. Owned by the viewer, rendered by React. */
  elements: MutableRefObject<Map<string, HTMLDivElement>>
  getSignals: () => Signals
}

/**
 * Lives inside the canvas. Each frame it projects every label's 3D point to the screen and moves
 * the matching overlay node. Text is written into an empty child span React never touches.
 */
export const LabelProjector = ({ targets, elements, getSignals }: LabelProjectorProps) => {
  const sinceText = useRef(TEXT_REFRESH_SECONDS)
  const projected = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera, size }, delta) => {
    sinceText.current += delta
    const refreshText = sinceText.current >= TEXT_REFRESH_SECONDS
    if (refreshText) sinceText.current = 0
    const signals = refreshText ? getSignals() : null

    targets.forEach(({ spec, position }) => {
      const node = elements.current.get(spec.id)
      if (!node) return
      projected.copy(position).project(camera)
      const isVisible = projected.z < 1
      node.style.visibility = isVisible ? 'visible' : 'hidden'
      node.style.transform = `translate(${((projected.x + 1) / 2) * size.width}px, ${
        ((1 - projected.y) / 2) * size.height
      }px) translate(-50%, -50%)`
      if (signals) {
        const text = node.firstElementChild
        if (text) text.textContent = spec.text(signals)
        node.dataset.warning = String(spec.isWarning(signals))
      }
    })
  })

  return null
}

type LabelOverlayProps = {
  targets: LabelTarget[]
  elements: MutableRefObject<Map<string, HTMLDivElement>>
}

/** Value tags floating over key elements, like the tags in an operator HMI. */
export const LabelOverlay = ({ targets, elements }: LabelOverlayProps) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {targets.map(({ spec }) => (
      <div
        key={spec.id}
        ref={(node) => {
          if (node) elements.current.set(spec.id, node)
          else elements.current.delete(spec.id)
        }}
        className="absolute left-0 top-0 whitespace-nowrap rounded-md border bg-surface-100/90 px-2 py-0.5 text-xs data-[warning=true]:border-destructive data-[warning=true]:text-destructive"
        style={{ visibility: 'hidden' }}
      >
        <span />
      </div>
    ))}
  </div>
)
