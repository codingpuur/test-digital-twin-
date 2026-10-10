import type * as THREE from 'three'

/** Parts that turn with the shaft. The model's shaft runs along X through the origin. */
const ROTATING_ROLES = new Set(['SHAFT', 'IMPELLER', 'COUPLING'])

/** The real speed is far too fast to follow on screen, so it is played this many times slower. */
const SLOW_MOTION = 25

export const rotorParts = (root: THREE.Object3D) => {
  const parts: THREE.Object3D[] = []
  root.traverse((object) => {
    if (ROTATING_ROLES.has(object.userData.twin?.category)) parts.push(object)
  })
  return parts
}

/** Radians to turn in `seconds` at the pump's speed, as shown (slowed down). 0 when it is not running. */
export const spinStep = (rpm: number, isRunning: boolean, seconds: number) =>
  isRunning ? ((rpm / 60) * 2 * Math.PI * seconds) / SLOW_MOTION : 0

export const spinRotor = (parts: THREE.Object3D[], radians: number) =>
  parts.forEach((part) => (part.rotation.x += radians))

export const resetRotor = (parts: THREE.Object3D[]) =>
  parts.forEach((part) => (part.rotation.x = 0))
