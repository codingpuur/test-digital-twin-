import * as THREE from 'three'

import type { PumpLayer } from '@/data/twin/pump-types'

const EXTRAS_NAME = '__layer-extras'

const decodeBytes = (base64: string) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
const decodeBuffer = (base64: string) => decodeBytes(base64).buffer

/** Colour at `t` (0..1) on the scale the backend sent. */
export const sampleScale = (scale: [number, string][], t: number, out = new THREE.Color()) => {
  const clamped = Math.min(1, Math.max(0, t))
  const next = scale.findIndex(([position]) => position >= clamped)
  if (next <= 0) return out.set(scale[Math.max(next, 0)][1])
  const [fromPosition, fromColor] = scale[next - 1]
  const [toPosition, toColor] = scale[next]
  const span = toPosition - fromPosition || 1
  return out.set(fromColor).lerp(new THREE.Color(toColor), (clamped - fromPosition) / span)
}

type PartMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>

const partMeshes = (root: THREE.Object3D) => {
  const meshes: PartMesh[] = []
  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh && object.userData.twin) meshes.push(object as PartMesh)
  })
  return meshes
}

const paint = (scale: PumpLayer['scale'], bytes: Uint8Array) => {
  const color = new THREE.Color()
  const colors = new Float32Array(bytes.length * 3)
  bytes.forEach((byte, i) => sampleScale(scale, byte / 254, color).toArray(colors, i * 3))
  return new THREE.BufferAttribute(colors, 3)
}

/** Streamlines and cavity zones the layer draws besides the parts. */
const buildExtras = (layer: PumpLayer) => {
  const group = new THREE.Group()
  group.name = EXTRAS_NAME
  layer.extras.forEach((extra) => {
    if (extra.kind === 'lines') {
      extra.lines.forEach((line) => {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(new Float32Array(decodeBuffer(line.vertices)), 3)
        )
        geometry.setAttribute('color', paint(layer.scale, decodeBytes(line.values)))
        group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true })))
      })
      return
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(decodeBuffer(extra.vertices)), 3)
    )
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(decodeBuffer(extra.faces)), 1))
    geometry.setAttribute('color', paint(layer.scale, decodeBytes(extra.values)))
    geometry.computeVertexNormals()
    group.add(
      new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        })
      )
    )
  })
  return group
}

/** Paints each part with the layer's values. Parts the layer has no values for are left grey. */
export const applyLayer = (root: THREE.Object3D, layer: PumpLayer) => {
  clearLayer(root)
  const color = new THREE.Color()
  partMeshes(root).forEach((mesh, index) => {
    const geometry = mesh.geometry
    const count = geometry.getAttribute('position').count
    const bytes = layer.values[String(index)] ? decodeBytes(layer.values[String(index)]) : null
    if (!bytes || bytes.length !== count) return
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++)
      sampleScale(layer.scale, bytes[i] / 254, color).toArray(colors, i * 3)
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    mesh.material.vertexColors = true
    const opacity = layer.opacity[String(index)]
    mesh.material.transparent = opacity !== undefined
    mesh.material.opacity = opacity ?? 1
    mesh.material.needsUpdate = true
  })
  if (layer.extras.length > 0) root.add(buildExtras(layer))
}

export function clearLayer(root: THREE.Object3D) {
  const extras = root.getObjectByName(EXTRAS_NAME)
  if (extras) {
    root.remove(extras)
    extras.traverse((object) => {
      const drawn = object as THREE.Mesh
      drawn.geometry?.dispose()
      ;(drawn.material as THREE.Material | undefined)?.dispose()
    })
  }
  partMeshes(root).forEach((mesh) => {
    mesh.geometry.deleteAttribute('color')
    mesh.material.vertexColors = false
    mesh.material.transparent = false
    mesh.material.opacity = 1
    mesh.material.needsUpdate = true
  })
}
