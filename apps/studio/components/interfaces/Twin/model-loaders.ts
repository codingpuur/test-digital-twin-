import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { loadStepFile } from './step-loader'
import type { TwinElement } from './twin.types'
import { BASE_PATH } from '@/lib/constants'

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
      tag: name,
    } satisfies TwinElement
  })
  return root
}

export const collectElements = (root: THREE.Object3D): TwinElement[] => {
  const elements: TwinElement[] = []
  root.traverse((object) => {
    if (object.userData.twin) elements.push(object.userData.twin)
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

type WebIfcModule = typeof import('web-ifc')

/** Maps each element to the storey (level) and space (room) it sits in, from IfcRelContainedInSpatialStructure. */
const readSpatialStructure = (
  WebIFC: WebIfcModule,
  api: InstanceType<WebIfcModule['IfcAPI']>,
  modelId: number
) => {
  const levelByElement = new Map<number, string>()
  const roomByElement = new Map<number, string>()
  const relations = api.GetLineIDsWithType(modelId, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE)

  for (let i = 0; i < relations.size(); i++) {
    const relation = api.GetLine(modelId, relations.get(i))
    const structureId: number | undefined = relation?.RelatingStructure?.value
    if (structureId === undefined) continue
    const label: string = api.GetLine(modelId, structureId)?.Name?.value ?? ''
    const target =
      api.GetLineType(modelId, structureId) === WebIFC.IFCSPACE ? roomByElement : levelByElement
    const related: { value: number }[] = relation.RelatedElements ?? []
    related.forEach((reference) => target.set(reference.value, label))
  }
  return { levelByElement, roomByElement }
}

export const loadIfcFile = async (file: File): Promise<THREE.Group> => {
  const WebIFC = await import('web-ifc')
  const api = new WebIFC.IfcAPI()
  // `true` = absolute: otherwise web-ifc resolves the path from the JS chunk's folder and 404s.
  api.SetWasmPath(`${BASE_PATH}/wasm/`, true)
  await api.Init()

  const modelId = api.OpenModel(new Uint8Array(await file.arrayBuffer()))
  const group = new THREE.Group()
  group.name = file.name

  const { levelByElement, roomByElement } = readSpatialStructure(WebIFC, api, modelId)

  api.StreamAllMeshes(modelId, (flatMesh) => {
    const expressId = flatMesh.expressID
    // Openings and spaces are helper volumes, not things you would inventory or look at.
    const typeCode = api.GetLineType(modelId, expressId)
    if (typeCode === WebIFC.IFCOPENINGELEMENT || typeCode === WebIFC.IFCSPACE) return
    const line = api.GetLine(modelId, expressId)
    const name: string = line?.Name?.value || `Element ${expressId}`
    const category = api
      .GetNameFromTypeCode(api.GetLineType(modelId, expressId))
      .replace(/^IFC/, '')

    // One IFC element can have several geometry pieces (e.g. wall layers): keep them in one group
    // so the element is a single inventory row.
    const elementGroup = new THREE.Group()
    elementGroup.name = name
    elementGroup.userData.twin = {
      id: `ifc-${expressId}`,
      name,
      level: levelByElement.get(expressId) ?? '',
      room: roomByElement.get(expressId) ?? '',
      category,
      system: '',
      source: file.name,
      guid: line?.GlobalId?.value ?? String(expressId),
      tag: line?.Tag?.value || name,
    } satisfies TwinElement

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
      elementGroup.add(mesh)
      geometry.delete()
    }
    if (elementGroup.children.length > 0) group.add(elementGroup)
  })

  api.CloseModel(modelId)
  // web-ifc already returns Y-up geometry (IFC Z becomes Y), so no extra rotation here.
  return group
}

/** Parts and meshes often share a name; tags are the match key, so make them unique. */
const makeTagsUnique = (root: THREE.Object3D) => {
  const seen = new Map<string, number>()
  root.traverse((object) => {
    const twin = object.userData.twin as TwinElement | undefined
    if (!twin?.tag) return
    const count = (seen.get(twin.tag) ?? 0) + 1
    seen.set(twin.tag, count)
    if (count > 1) twin.tag = `${twin.tag} (${count})`
  })
  return root
}

export const loadModelFile = async (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'ifc') return makeTagsUnique(await loadIfcFile(file))
  if (extension === 'glb' || extension === 'gltf') return makeTagsUnique(await loadGlbFile(file))
  if (extension && ['step', 'stp', 'iges', 'igs'].includes(extension)) {
    return makeTagsUnique(await loadStepFile(file))
  }
  throw new Error('Unsupported file type. Upload a GLB, glTF, IFC or STEP file.')
}
