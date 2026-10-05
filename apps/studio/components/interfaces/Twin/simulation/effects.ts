import * as THREE from 'three'

import type { AnimationBinding, EffectId } from './animation.types'

export type EffectContext = {
  mesh: THREE.Mesh
  value: number
  binding: AnimationBinding
  /** Seconds since the last frame. */
  delta: number
  /** Seconds since the viewer mounted. */
  time: number
  isSelected: boolean
}

type Effect = (context: EffectContext) => void

const MAX_ROTATION_SPEED = 18 // rad/s at the binding's max
const PULSE_COLOR = new THREE.Color('#e5484d')
const SELECTED_COLOR = new THREE.Color('#3ecf8e')
const BLACK = new THREE.Color('#000000')

const ratio = (value: number, max: number) => Math.min(1, Math.max(0, value / (max || 1)))

const getStandardMaterial = (mesh: THREE.Mesh) => {
  const material = mesh.material as THREE.MeshStandardMaterial | undefined
  return material?.emissive ? material : null
}

const rotate: Effect = ({ mesh, value, binding, delta }) => {
  const target = mesh.getObjectByName('impeller') ?? mesh
  target.rotation.y += ratio(value, binding.max) * MAX_ROTATION_SPEED * delta
}

const flow: Effect = ({ mesh, value, binding, delta }) => {
  const overlay = mesh.getObjectByName('flow') as THREE.Mesh | undefined
  if (!overlay) return
  const speed = ratio(value, binding.max)
  overlay.visible = speed > 0.02
  const material = overlay.material as THREE.MeshBasicMaterial
  if (!material.map || !overlay.visible) return
  const axis = overlay.userData.flowAxis === 'y' ? 'y' : 'x'
  material.map.offset[axis] -= speed * 1.4 * delta
}

const fill: Effect = ({ mesh, value, binding }) => {
  const water = mesh.getObjectByName('water') as THREE.Mesh | undefined
  if (!water) return
  const full: number = water.userData.fullHeight ?? 1
  const height = Math.max(0.001, full * ratio(value, binding.max))
  water.scale.y = height
  water.position.y = -full / 2 + height / 2
  water.visible = ratio(value, binding.max) > 0.01
}

const valve: Effect = ({ mesh, value, binding }) => {
  const handle = mesh.getObjectByName('handle')
  // Open (full) = handle along the pipe, closed = across it.
  if (handle) handle.rotation.y = (1 - ratio(value, binding.max)) * (Math.PI / 2)
}

const pulse: Effect = ({ mesh, value, binding, time, isSelected }) => {
  const material = getStandardMaterial(mesh)
  if (!material) return
  const isActive = value > (binding.threshold ?? binding.max)
  if (isActive) {
    material.emissive.copy(PULSE_COLOR)
    material.emissiveIntensity = 0.5 + 0.5 * Math.sin(time * 8)
    mesh.userData.isPulsing = true
  } else if (mesh.userData.isPulsing) {
    // Hand the emissive channel back to the selection highlight.
    material.emissive.copy(isSelected ? SELECTED_COLOR : BLACK)
    material.emissiveIntensity = isSelected ? 0.8 : 0
    mesh.userData.isPulsing = false
  }
}

export const EFFECTS: Record<EffectId, Effect> = { rotate, flow, fill, valve, pulse }
