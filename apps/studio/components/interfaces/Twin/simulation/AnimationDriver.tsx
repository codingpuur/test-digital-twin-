import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

import type { TwinElement } from '../twin.types'
import type { AnimationBinding } from './animation.types'
import { EFFECTS } from './effects'
import type { Signals } from './signals'

type AnimationDriverProps = {
  scene: THREE.Object3D
  bindings: AnimationBinding[]
  /** Read every frame; a ref-backed getter keeps React out of the animation loop. */
  getSignals: () => Signals
  selectedId: string | null
}

type ResolvedBinding = { binding: AnimationBinding; mesh: THREE.Mesh }

const resolveBindings = (
  scene: THREE.Object3D,
  bindings: AnimationBinding[]
): ResolvedBinding[] => {
  const meshesByName = new Map<string, THREE.Mesh>()
  scene.traverse((object) => {
    const twin: TwinElement | undefined = object.userData.twin
    if (twin) meshesByName.set(twin.name, object as THREE.Mesh)
  })
  return bindings.flatMap((binding) => {
    const mesh = meshesByName.get(binding.elementName)
    return binding.enabled && mesh ? [{ binding, mesh }] : []
  })
}

/** Runs inside the R3F canvas and applies every enabled binding to its element each frame. */
export const AnimationDriver = ({
  scene,
  bindings,
  getSignals,
  selectedId,
}: AnimationDriverProps) => {
  const resolved = useMemo(() => resolveBindings(scene, bindings), [scene, bindings])

  useFrame(({ clock }, delta) => {
    const signals = getSignals()
    const time = clock.elapsedTime
    // Clamp so a background tab does not make parts jump when it wakes up.
    const step = Math.min(delta, 0.1)
    resolved.forEach(({ binding, mesh }) => {
      const twin: TwinElement | undefined = mesh.userData.twin
      EFFECTS[binding.effect]({
        mesh,
        value: signals[binding.signal] ?? 0,
        binding,
        delta: step,
        time,
        isSelected: twin?.id === selectedId,
      })
    })
  })

  return null
}
