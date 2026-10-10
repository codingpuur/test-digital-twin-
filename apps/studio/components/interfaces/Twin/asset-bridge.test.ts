import { describe, expect, it } from 'vitest'

import { applyAssets, elementsToImportRows } from './asset-bridge'
import type { TwinElement } from './twin.types'
import type { TwinAsset } from '@/lib/twin/assets'

const element = (overrides: Partial<TwinElement> = {}): TwinElement => ({
  id: 'glb-1',
  name: 'P-101',
  level: '',
  room: '',
  category: 'Mesh',
  system: '',
  source: 'a.glb',
  guid: 'random-uuid',
  ...overrides,
})

const asset = (overrides: Partial<TwinAsset> = {}): TwinAsset => ({
  id: 'a1',
  tag: 'P-101',
  guid: '',
  source: 'a.glb',
  status: 'active',
  hasGeometry: true,
  revision: 1,
  imported: {
    name: 'P-101',
    category: 'Pump',
    level: 'L1',
    room: '',
    system: '',
    equipment: 'P-101',
    properties: { Power: '22 kW' },
  },
  override: {},
  ...overrides,
})

describe('asset bridge', () => {
  it('does not store a random GLB mesh uuid as the guid', () => {
    expect(elementsToImportRows([element()])[0].guid).toBe('')
    expect(elementsToImportRows([element({ id: 'ifc-5', guid: 'G1' })])[0].guid).toBe('G1')
  })

  it('overlays asset values but keeps the model name for bindings', () => {
    const [result] = applyAssets([element()], [asset({ override: { name: 'Booster pump' } })])
    expect(result.name).toBe('P-101')
    expect(result.displayName).toBe('Booster pump')
    expect(result.category).toBe('Pump')
    expect(result.isEdited).toBe(true)
  })

  it('appends CSV-only assets and skips removed ones', () => {
    const rows = applyAssets(
      [element()],
      [
        asset(),
        asset({ id: 'a2', tag: 'X-1', hasGeometry: false }),
        asset({ id: 'a3', tag: 'Z', status: 'removed' }),
      ]
    )
    expect(rows.map((row) => row.tag)).toEqual(['P-101', 'X-1'])
    expect(rows[1].hasGeometry).toBe(false)
  })
})
