import * as THREE from 'three'

import type { TwinElement } from './twin.types'

const SELECTED_EMISSIVE = new THREE.Color('#3ecf8e')
const NO_EMISSIVE = new THREE.Color('#000000')

/** The element an object belongs to: itself, or the nearest ancestor that carries element data. */
export const findTwin = (object: THREE.Object3D): TwinElement | undefined => {
  let current: THREE.Object3D | null = object
  while (current && !current.userData.twin) current = current.parent
  return current?.userData.twin
}

export const applyColorOverrides = (
  root: THREE.Object3D,
  overrides: Record<string, string> | null
) => {
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

export const highlightSelection = (root: THREE.Object3D, selectedId: string | null) => {
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

/** The first object in the scene that belongs to the element with this id. */
export const findObjectByTwinId = (scene: THREE.Object3D, id: string) => {
  let found: THREE.Object3D | null = null
  scene.traverse((object) => {
    if (!found && (object.userData.twin as TwinElement | undefined)?.id === id) found = object
  })
  return found
}

/** Every mesh that belongs to one of the given elements. */
export const meshesOfElements = (scene: THREE.Object3D, ids: string[]) => {
  const wanted = new Set(ids)
  const meshes: THREE.Mesh[] = []
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const twin = findTwin(mesh)
    if (twin && wanted.has(twin.id)) meshes.push(mesh)
  })
  return meshes
}
