import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { resetRotor, rotorParts, spinRotor, spinStep } from './pump-spin'

const part = (category: string) => {
  const mesh = new THREE.Mesh()
  mesh.userData.twin = { category }
  return mesh
}

describe('pump spin', () => {
  it('turns only the shaft, impeller and coupling, and can put them back', () => {
    const root = new THREE.Group()
    const shaft = part('SHAFT')
    const casing = part('VOLUTE')
    root.add(shaft, casing, part('IMPELLER'), part('COUPLING'))
    const parts = rotorParts(root)
    expect(parts).toHaveLength(3)
    spinRotor(parts, 0.5)
    expect(shaft.rotation.x).toBeCloseTo(0.5)
    expect(casing.rotation.x).toBe(0)
    resetRotor(parts)
    expect(shaft.rotation.x).toBe(0)
  })

  it('is slowed down, and zero when the pump is stopped', () => {
    expect(spinStep(1500, true, 1)).toBeCloseTo((25 * 2 * Math.PI) / 25)
    expect(spinStep(1500, false, 1)).toBe(0)
  })
})
