import * as THREE from 'three'

import { STATUS_COLORS } from './status-colors'
import { findTwin } from './viewer-helpers'
import { SCORE_COLORS } from './voice/voice-context'

// Hologram look: every part becomes a glowing, see-through shell with bright edges. Healthy parts
// stay a calm cyan so a part that needs attention (red, pulsing) is easy to spot at a glance.

export const HOLOGRAM_COLORS = {
  normal: '#22d3ee',
  unlinked: '#3b82f6',
  warning: '#ff3b4a',
  watch: '#ffb020',
  selected: '#ff9f1a',
  group: '#ffc766',
} as const

/** What a status colour (from "Colour by status" or the voice agent) becomes in the hologram. */
const TINT_BY_SOURCE: Record<string, string> = {
  [STATUS_COLORS.Normal]: HOLOGRAM_COLORS.normal,
  [STATUS_COLORS.Unlinked]: HOLOGRAM_COLORS.unlinked,
  [STATUS_COLORS.Warning]: HOLOGRAM_COLORS.warning,
  // The voice agent's healthy and critical colours are the same as Normal and Warning above.
  [SCORE_COLORS.watch]: HOLOGRAM_COLORS.watch,
}

const CONTEXT_CATEGORIES = new Set(['Floors', 'Walls', 'Roofs'])

export type HologramTint = { color: string; intensity: number }

/** Colour and strength of one part. Building shell stays faint so the equipment stands out. */
export const hologramTint = (input: {
  statusColor?: string
  category?: string
  isSelected: boolean
  isGrouped: boolean
}): HologramTint => {
  if (input.isSelected) return { color: HOLOGRAM_COLORS.selected, intensity: 1.5 }
  if (input.isGrouped) return { color: HOLOGRAM_COLORS.group, intensity: 1.2 }
  const color = input.statusColor
    ? (TINT_BY_SOURCE[input.statusColor] ?? input.statusColor)
    : HOLOGRAM_COLORS.normal
  if (input.category && CONTEXT_CATEGORIES.has(input.category)) return { color, intensity: 0.3 }
  if (color === HOLOGRAM_COLORS.warning) return { color, intensity: 1.5 }
  return { color, intensity: color === HOLOGRAM_COLORS.unlinked ? 0.6 : 0.9 }
}

const VERTEX = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying float vWorldY;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPosition.xyz);
    vWorldY = (modelMatrix * vec4(position, 1.0)).y;
    gl_Position = projectionMatrix * viewPosition;
  }
`

// Brighter towards the silhouette (fresnel), with a slow scan line rising through the model.
const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying float vWorldY;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.2);
    float scan = 0.5 + 0.5 * sin(vWorldY * 18.0 - uTime * 2.0);
    float alpha = (0.1 + rim * 0.75 + scan * 0.06) * uIntensity;
    gl_FragColor = vec4(uColor * (0.7 + rim * 1.3), clamp(alpha, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const createFillMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(HOLOGRAM_COLORS.normal) },
      uTime: { value: 0 },
      uIntensity: { value: 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })

const EDGE_ANGLE_DEGREES = 25
/** Edge extraction is skipped for very dense meshes: it is slow and the lines turn into noise. */
const MAX_EDGE_VERTICES = 150_000
const edgeCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry | null>()

const getEdges = (geometry: THREE.BufferGeometry) => {
  if (!edgeCache.has(geometry)) {
    const count = geometry.getAttribute('position')?.count ?? 0
    edgeCache.set(
      geometry,
      count > 0 && count <= MAX_EDGE_VERTICES
        ? new THREE.EdgesGeometry(geometry, EDGE_ANGLE_DEGREES)
        : null
    )
  }
  return edgeCache.get(geometry) ?? null
}

const noRaycast = () => {}

export type HologramPart = {
  mesh: THREE.Mesh
  fill: THREE.Mesh
  edges: THREE.LineSegments | null
  fillMaterial: THREE.ShaderMaterial
  edgeMaterial: THREE.LineBasicMaterial | null
  twinId: string
  category: string
}

/** Meshes that are solid parts (not the animated flow strips, which already glow on their own). */
const isSolidPart = (object: THREE.Object3D): object is THREE.Mesh => {
  const mesh = object as THREE.Mesh
  const material = mesh.material as THREE.Material | undefined
  return (
    !!mesh.isMesh &&
    !mesh.userData.isHologram &&
    mesh.name !== 'flow' &&
    !!material &&
    (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true
  )
}

/** Covers every solid part with a hologram shell and hides the original; returns the shells. */
export const attachHologram = (root: THREE.Object3D): HologramPart[] => {
  const targets: THREE.Mesh[] = []
  root.traverse((object) => {
    if (isSolidPart(object)) targets.push(object)
  })

  return targets.map((mesh) => {
    const fillMaterial = createFillMaterial()
    const fill = new THREE.Mesh(mesh.geometry, fillMaterial)
    fill.userData.isHologram = true
    fill.raycast = noRaycast
    mesh.add(fill)

    const edgeGeometry = getEdges(mesh.geometry)
    const edgeMaterial = edgeGeometry
      ? new THREE.LineBasicMaterial({
          color: HOLOGRAM_COLORS.normal,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        })
      : null
    const edges =
      edgeGeometry && edgeMaterial ? new THREE.LineSegments(edgeGeometry, edgeMaterial) : null
    if (edges) {
      edges.userData.isHologram = true
      edges.raycast = noRaycast
      mesh.add(edges)
    }

    // Hidden but still clickable: picking uses the geometry, not the material.
    ;(mesh.material as THREE.Material).visible = false
    const twin = findTwin(mesh)
    return {
      mesh,
      fill,
      edges,
      fillMaterial,
      edgeMaterial,
      twinId: twin?.id ?? '',
      category: twin?.category ?? '',
    }
  })
}

export const detachHologram = (parts: HologramPart[]) => {
  parts.forEach(({ mesh, fill, edges, fillMaterial, edgeMaterial }) => {
    mesh.remove(fill)
    if (edges) mesh.remove(edges)
    fillMaterial.dispose()
    edgeMaterial?.dispose()
    ;(mesh.material as THREE.Material).visible = true
  })
}
