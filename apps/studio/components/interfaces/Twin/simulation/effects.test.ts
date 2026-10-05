import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import type { AnimationBinding } from './animation.types'
import { EFFECTS } from './effects'

const binding = (patch: Partial<AnimationBinding>): AnimationBinding => ({
  id: 'b',
  elementName: 'x',
  effect: 'rotate',
  signal: 's',
  max: 100,
  enabled: true,
  ...patch,
})

const context = (mesh: THREE.Mesh, value: number, b: AnimationBinding, extra = {}) => ({
  mesh,
  value,
  binding: b,
  delta: 0.1,
  time: 1,
  isSelected: false,
  ...extra,
})

const standardMesh = () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())

describe('animation effects', () => {
  it('rotates the impeller faster as the signal rises, and not at all at zero', () => {
    const mesh = standardMesh()
    const impeller = new THREE.Group()
    impeller.name = 'impeller'
    mesh.add(impeller)
    const b = binding({ effect: 'rotate' })

    EFFECTS.rotate(context(mesh, 0, b))
    expect(impeller.rotation.y).toBe(0)

    EFFECTS.rotate(context(mesh, 50, b))
    const half = impeller.rotation.y
    impeller.rotation.y = 0
    EFFECTS.rotate(context(mesh, 100, b))
    expect(impeller.rotation.y).toBeGreaterThan(half)
  })

  it('scales the water with the level and hides it when empty', () => {
    const mesh = standardMesh()
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1))
    water.name = 'water'
    water.userData.fullHeight = 2
    mesh.add(water)
    const b = binding({ effect: 'fill' })

    EFFECTS.fill(context(mesh, 50, b))
    expect(water.scale.y).toBeCloseTo(1)
    expect(water.visible).toBe(true)

    EFFECTS.fill(context(mesh, 0, b))
    expect(water.visible).toBe(false)
  })

  it('turns the valve handle across the pipe when closed and along it when open', () => {
    const mesh = standardMesh()
    const handle = new THREE.Mesh()
    handle.name = 'handle'
    mesh.add(handle)
    const b = binding({ effect: 'valve' })

    EFFECTS.valve(context(mesh, 100, b))
    expect(handle.rotation.y).toBeCloseTo(0)
    EFFECTS.valve(context(mesh, 0, b))
    expect(handle.rotation.y).toBeCloseTo(Math.PI / 2)
  })

  it('shows flow dashes only while there is flow and moves their texture', () => {
    const mesh = standardMesh()
    const overlay = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ map: new THREE.Texture() })
    )
    overlay.name = 'flow'
    overlay.userData.flowAxis = 'x'
    mesh.add(overlay)
    const b = binding({ effect: 'flow' })

    EFFECTS.flow(context(mesh, 0, b))
    expect(overlay.visible).toBe(false)

    EFFECTS.flow(context(mesh, 80, b))
    expect(overlay.visible).toBe(true)
    expect((overlay.material as THREE.MeshBasicMaterial).map?.offset.x).toBeLessThan(0)
  })

  it('pulses above the threshold and restores the emissive colour afterwards', () => {
    const mesh = standardMesh()
    const material = mesh.material as THREE.MeshStandardMaterial
    const b = binding({ effect: 'pulse', threshold: 7 })

    EFFECTS.pulse(context(mesh, 9, b))
    expect(material.emissive.getHexString()).toBe('e5484d')

    EFFECTS.pulse(context(mesh, 3, b))
    expect(material.emissive.getHexString()).toBe('000000')
    expect(material.emissiveIntensity).toBe(0)

    // Selected elements fall back to the selection tint, not black.
    EFFECTS.pulse(context(mesh, 9, b))
    EFFECTS.pulse(context(mesh, 3, b, { isSelected: true }))
    expect(material.emissive.getHexString()).toBe('3ecf8e')
  })
})
