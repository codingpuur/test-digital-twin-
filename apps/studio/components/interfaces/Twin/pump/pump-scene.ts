import * as THREE from 'three'

import { STATUS_COLORS } from '../status-colors'
import type { TwinElement } from '../twin.types'
import { SCORE_COLORS } from '../voice/voice-context'
import type { PumpMesh, PumpStatus } from '@/data/twin/pump-types'

const decode = (base64: string) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** Colour the 3D view gives a status. Which status a part has is decided by the backend. */
export const PUMP_STATUS_COLORS: Record<PumpStatus, string> = {
  ok: STATUS_COLORS.Normal,
  watch: SCORE_COLORS.watch,
  act: STATUS_COLORS.Warning,
}

/** Builds the pump from the backend's geometry. Each part is an element named after its CAD part. */
export const buildPumpScene = (mesh: PumpMesh, equipment: string): THREE.Group => {
  const root = new THREE.Group()
  root.name = equipment
  // The model is Z-up with the shaft along X; the viewer is Y-up.
  if (mesh.up === 'z') root.rotation.x = -Math.PI / 2

  mesh.parts.forEach((part, index) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(decode(part.vertices)), 3)
    )
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(decode(part.faces)), 1))
    geometry.computeVertexNormals()

    const object = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: '#8b95a5',
        roughness: 0.55,
        metalness: 0.3,
        side: THREE.DoubleSide,
      })
    )
    object.name = part.name
    const twin: TwinElement = {
      id: `pump-${index}`,
      name: part.name,
      level: '',
      room: '',
      category: part.role,
      system: part.component ?? '',
      equipment,
      source: 'Pump twin',
      guid: part.name,
    }
    object.userData.twin = twin
    root.add(object)
  })
  return root
}

/** Element id → colour, from the status the backend gives each component. */
export const colorsByComponent = (
  elements: { id: string; system: string }[],
  statusOf: Record<string, PumpStatus>
): Record<string, string> =>
  Object.fromEntries(
    elements.map((element) => [element.id, PUMP_STATUS_COLORS[statusOf[element.system] ?? 'ok']])
  )
