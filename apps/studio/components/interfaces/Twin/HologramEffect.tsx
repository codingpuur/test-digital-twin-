import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import {
  attachHologram,
  detachHologram,
  HOLOGRAM_COLORS,
  hologramTint,
  type HologramPart,
} from './hologram'

type HologramEffectProps = {
  scene: THREE.Object3D
  isActive: boolean
  selectedId: string | null
  groupIds: string[]
  /** Status colour per element id, from "Colour by status" or the voice agent. */
  colorOverrides: Record<string, string> | null | undefined
  /** Elements the voice agent says are in danger: they pulse. */
  alertIds: string[]
}

const ALERT_PULSE_SPEED = 6
const WARNING = new THREE.Color(HOLOGRAM_COLORS.warning)
const ALERT_PEAK = new THREE.Color('#ffffff')

/** Runs inside the R3F canvas: swaps the model for its hologram while `isActive`, and keeps it tinted. */
export const HologramEffect = ({
  scene,
  isActive,
  selectedId,
  groupIds,
  colorOverrides,
  alertIds,
}: HologramEffectProps) => {
  const parts = useRef<HologramPart[]>([])
  const color = useRef(new THREE.Color())

  useEffect(() => {
    if (!isActive) return
    parts.current = attachHologram(scene)
    return () => {
      detachHologram(parts.current)
      parts.current = []
    }
  }, [scene, isActive])

  useFrame(({ clock }) => {
    if (!isActive) return
    const grouped = new Set(groupIds)
    const alerting = new Set(alertIds)
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * ALERT_PULSE_SPEED)

    parts.current.forEach((part) => {
      const tint = hologramTint({
        statusColor: colorOverrides?.[part.twinId],
        category: part.category,
        isSelected: part.twinId === selectedId,
        isGrouped: grouped.has(part.twinId),
      })
      color.current.set(tint.color)
      let intensity = tint.intensity
      if (alerting.has(part.twinId)) {
        color.current.copy(WARNING).lerp(ALERT_PEAK, pulse * 0.5)
        intensity = 1.2 + pulse * 1.2
      }
      part.fillMaterial.uniforms.uColor.value.copy(color.current)
      part.fillMaterial.uniforms.uIntensity.value = intensity
      part.fillMaterial.uniforms.uTime.value = clock.elapsedTime
      if (part.edgeMaterial) {
        part.edgeMaterial.color.copy(color.current)
        part.edgeMaterial.opacity = Math.min(1, 0.45 + intensity * 0.4)
      }
    })
  })

  return null
}
