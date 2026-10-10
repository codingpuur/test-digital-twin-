import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { applyLayer, clearLayer, sampleScale } from './pump-layer'
import type { PumpLayer } from '@/data/twin/pump-types'

const SCALE: [number, string][] = [
  [0, '#000000'],
  [1, '#ffffff'],
]

describe('sampleScale', () => {
  it('interpolates between stops and clamps outside them', () => {
    // Blending happens in linear light, so the midpoint of black and white is lighter than 50 % grey.
    expect(sampleScale(SCALE, 0.5).getHexString()).toBe('bcbcbc')
    expect(sampleScale(SCALE, -1).getHexString()).toBe('000000')
    expect(sampleScale(SCALE, 2).getHexString()).toBe('ffffff')
  })
})

describe('applyLayer', () => {
  const makeRoot = () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3))
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
    mesh.userData.twin = { id: 'p' }
    const root = new THREE.Group()
    root.add(mesh)
    return { root, mesh }
  }
  const layer = {
    scale: SCALE,
    values: { '0': btoa(String.fromCharCode(0, 127, 254)) },
    opacity: { '0': 0.5 },
    extras: [],
  } as unknown as PumpLayer

  it('writes a colour per vertex and the part opacity, and clears them again', () => {
    const { root, mesh } = makeRoot()
    applyLayer(root, layer)
    const colors = mesh.geometry.getAttribute('color')
    expect(colors.count).toBe(3)
    expect(colors.getX(0)).toBeCloseTo(0)
    expect(colors.getX(2)).toBeCloseTo(1)
    expect(mesh.material.vertexColors).toBe(true)
    expect(mesh.material.opacity).toBe(0.5)
    clearLayer(root)
    expect(mesh.geometry.getAttribute('color')).toBeUndefined()
    expect(mesh.material.opacity).toBe(1)
  })

  it('ignores values that do not match the part', () => {
    const { root, mesh } = makeRoot()
    applyLayer(root, { ...layer, values: { '0': btoa('ab') } })
    expect(mesh.geometry.getAttribute('color')).toBeUndefined()
  })

  it('adds streamlines and removes them on clear', () => {
    const { root } = makeRoot()
    const floats = btoa(String.fromCharCode(...new Uint8Array(new Float32Array(6).buffer)))
    applyLayer(root, {
      ...layer,
      extras: [
        { kind: 'lines', name: 's', lines: [{ vertices: floats, values: btoa('\u0000\u00fe') }] },
      ],
    } as unknown as PumpLayer)
    const lines = root.getObjectByName('__layer-extras')
    expect(lines?.children).toHaveLength(1)
    clearLayer(root)
    expect(root.getObjectByName('__layer-extras')).toBeUndefined()
  })
})
