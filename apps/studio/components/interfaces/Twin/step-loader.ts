import * as THREE from 'three'

import type { TwinElement } from './twin.types'
import { BASE_PATH } from '@/lib/constants'

type OcctNode = { name: string; meshes: number[]; children: OcctNode[] }
type OcctMesh = {
  color?: [number, number, number]
  attributes: { position: { array: number[] }; normal?: { array: number[] } }
  index: { array: number[] }
}
type OcctResult = { success: boolean; root: OcctNode; meshes: OcctMesh[] }

const DEFAULT_COLOR = new THREE.Color(0x8a94a6)

/** STEP geometry comes out in millimetres; the viewer works in metres. */
const MM_TO_M = 0.001

const buildMesh = (source: OcctMesh) => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(source.attributes.position.array, 3)
  )
  if (source.attributes.normal) {
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(source.attributes.normal.array, 3)
    )
  } else {
    geometry.computeVertexNormals()
  }
  geometry.setIndex(source.index.array)
  const color = source.color ? new THREE.Color(...source.color) : DEFAULT_COLOR
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }))
}

/**
 * Reads a STEP/IGES file in the browser with OpenCascade (WASM). Every node of the assembly tree
 * that owns geometry becomes one element named after the part, so a SolidWorks assembly turns into
 * one inventory row per component.
 */
export const loadStepFile = async (file: File): Promise<THREE.Group> => {
  const { default: occtimport } = await import('occt-import-js')
  const occt = await occtimport({ locateFile: () => `${BASE_PATH}/wasm/occt-import-js.wasm` })

  const bytes = new Uint8Array(await file.arrayBuffer())
  const extension = file.name.split('.').pop()?.toLowerCase()
  const result: OcctResult =
    extension === 'igs' || extension === 'iges'
      ? occt.ReadIgesFile(bytes, null)
      : occt.ReadStepFile(bytes, null)
  if (!result.success)
    throw new Error('Could not read this STEP file. Is it a valid STEP/IGES export?')

  const group = new THREE.Group()
  group.name = file.name
  group.scale.setScalar(MM_TO_M)

  const walk = (node: OcctNode, path: string) => {
    if (node.meshes.length > 0) {
      const name = node.name || `Part ${group.children.length + 1}`
      const part = new THREE.Group()
      part.name = name
      part.userData.twin = {
        id: `step-${group.children.length}-${path}`,
        name,
        level: '',
        room: '',
        category: 'Part',
        system: '',
        source: file.name,
        guid: '',
        tag: name,
      } satisfies TwinElement
      node.meshes.forEach((index) => {
        const mesh = buildMesh(result.meshes[index])
        mesh.name = name
        part.add(mesh)
      })
      group.add(part)
    }
    node.children.forEach((child, index) => walk(child, `${path}.${index}`))
  }
  walk(result.root, '0')

  // The viewer frames the model from its world-space box, which needs the scale applied already.
  group.updateMatrixWorld(true)

  if (group.children.length === 0) throw new Error('This STEP file has no 3D geometry.')
  return group
}
