import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import type { TwinElement } from './twin.types'

const isMesh = (object: THREE.Object3D): object is THREE.Mesh =>
  (object as THREE.Mesh).isMesh === true

const toStandardMaterial = (material: THREE.Material | THREE.Material[]) => {
  const source = Array.isArray(material) ? material[0] : material
  return source.clone()
}

/** Gives every mesh in a loaded model its own material (so selection can tint it) and a twin id. */
export const prepareLoadedModel = (root: THREE.Object3D, source: string) => {
  let index = 0
  root.traverse((object) => {
    if (!isMesh(object)) return
    index += 1
    object.material = toStandardMaterial(object.material)
    if (object.userData.twin) return
    const name = object.name || object.parent?.name || `Element ${index}`
    object.userData.twin = {
      id: `${source}-${index}`,
      name,
      level: '',
      room: '',
      category: 'Mesh',
      system: '',
      source,
      guid: object.uuid,
    } satisfies TwinElement
  })
  return root
}

export const collectElements = (root: THREE.Object3D): TwinElement[] => {
  const elements: TwinElement[] = []
  root.traverse((object) => {
    if (isMesh(object) && object.userData.twin) elements.push(object.userData.twin)
  })
  return elements
}

export const loadGlbFile = async (file: File): Promise<THREE.Group> => {
  const buffer = await file.arrayBuffer()
  const gltf = await new GLTFLoader().parseAsync(buffer, '')
  const group = new THREE.Group()
  group.name = file.name
  group.add(gltf.scene)
  return prepareLoadedModel(group, file.name) as THREE.Group
}

export const loadIfcFile = async (file: File): Promise<THREE.Group> => {
  const WebIFC = await import('web-ifc')
  const api = new WebIFC.IfcAPI()
  api.SetWasmPath('/wasm/')
  await api.Init()

  const modelId = api.OpenModel(new Uint8Array(await file.arrayBuffer()))
  const group = new THREE.Group()
  group.name = file.name

  api.StreamAllMeshes(modelId, (flatMesh) => {
    const expressId = flatMesh.expressID
    const line = api.GetLine(modelId, expressId)
    const name: string = line?.Name?.value || `Element ${expressId}`
    const category = api.GetNameFromTypeCode(api.GetLineType(modelId, expressId)).replace(/^IFC/, '')

    for (let i = 0; i < flatMesh.geometries.size(); i++) {
      const placed = flatMesh.geometries.get(i)
      const geometry = api.GetGeometry(modelId, placed.geometryExpressID)
      const vertices = api.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize())
      const indices = api.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize())

      const buffer = new THREE.InterleavedBuffer(new Float32Array(vertices), 6)
      const bufferGeometry = new THREE.BufferGeometry()
      bufferGeometry.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0))
      bufferGeometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(buffer, 3, 3))
      bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))

      const { color } = placed
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color.x, color.y, color.z),
        opacity: color.w,
        transparent: color.w < 1,
        side: THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(bufferGeometry, material)
      mesh.name = name
      mesh.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation))
      mesh.userData.twin = {
        id: `ifc-${expressId}-${i}`,
        name,
        level: '',
        room: '',
        category,
        system: '',
        source: file.name,
        guid: line?.GlobalId?.value ?? String(expressId),
      } satisfies TwinElement
      group.add(mesh)
      geometry.delete()
    }
  })

  api.CloseModel(modelId)
  // IFC is Z-up; three.js is Y-up.
  group.rotation.x = -Math.PI / 2
  return group
}

export const loadModelFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'ifc') return loadIfcFile(file)
  if (extension === 'glb' || extension === 'gltf') return loadGlbFile(file)
  return Promise.reject(new Error('Unsupported file type. Upload a GLB, glTF or IFC file.'))
}
