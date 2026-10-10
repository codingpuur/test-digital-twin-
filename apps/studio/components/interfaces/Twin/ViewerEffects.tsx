import { useBounds } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import {
  applyColorOverrides,
  findObjectByTwinId,
  highlightSelection,
  meshesOfElements,
} from './viewer-helpers'

const ALERT_COLOR = new THREE.Color('#ff2b36')
const BLINK_SPEED = 6

export type FocusRequest = { id: string | null; nonce: number }

/** Pulses the given elements red until the list is emptied, then restores their normal look. */
export const AlertBlink = ({
  scene,
  ids,
  selectedId,
  groupIds,
  colorOverrides,
}: {
  scene: THREE.Object3D
  ids: string[]
  selectedId: string | null
  groupIds: string[]
  colorOverrides: Record<string, string> | null | undefined
}) => {
  const meshes = useMemo(() => meshesOfElements(scene, ids), [scene, ids])
  const isBlinking = useRef(false)
  const baseColor = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    if (meshes.length === 0) {
      if (!isBlinking.current) return
      isBlinking.current = false
      applyColorOverrides(scene, colorOverrides ?? null)
      highlightSelection(scene, selectedId, groupIds)
      return
    }
    isBlinking.current = true
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * BLINK_SPEED)
    meshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial
      if (!material?.color) return
      mesh.userData.baseColor ??= material.color.getHex()
      baseColor.set(mesh.userData.baseColor)
      material.color.copy(baseColor).lerp(ALERT_COLOR, 0.35 + 0.65 * pulse)
      material.emissive.copy(ALERT_COLOR)
      material.emissiveIntensity = 0.1 + 1.1 * pulse
    })
  })

  return null
}

/** Flies the camera to an element when asked. Must be rendered inside `<Bounds>`. */
export const CameraFocus = ({
  scene,
  request,
}: {
  scene: THREE.Object3D
  request: FocusRequest | null
}) => {
  const bounds = useBounds()

  useEffect(() => {
    if (!request) return
    const target = request.id ? findObjectByTwinId(scene, request.id) : null
    if (target) bounds.refresh(target).fit()
    else bounds.refresh().fit()
    // Only a new request moves the camera, not a change of scene or of the bounds helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce])

  return null
}
