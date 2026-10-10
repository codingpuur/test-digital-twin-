import { describe, expect, it } from 'vitest'

import {
  mergeImport,
  resolveAsset,
  toOverride,
  type AssetImportRow,
  type TwinAsset,
} from './assets'
import { csvToImportRows, parseCsv } from './csv'

let counter = 0
const createId = () => `asset-${++counter}`

const modelRow = (
  tag: string,
  overrides: Partial<AssetImportRow['fields']> = {}
): AssetImportRow => ({
  tag,
  guid: '',
  hasGeometry: true,
  fields: {
    name: tag,
    category: 'Mesh',
    level: '',
    room: '',
    system: '',
    equipment: '',
    properties: {},
    ...overrides,
  },
})

const importModel = (existing: TwinAsset[], rows: AssetImportRow[], revision = 1) =>
  mergeImport(existing, rows, { mode: 'model', source: 'model.glb', revision, createId })

describe('mergeImport (model)', () => {
  it('adds assets on first import', () => {
    const { assets, diff } = importModel([], [modelRow('P-101'), modelRow('V-201')])
    expect(assets).toHaveLength(2)
    expect(diff.added).toEqual(['P-101', 'V-201'])
  })

  it('keeps user overrides when the model is re-imported and updates imported values', () => {
    const first = importModel([], [modelRow('P-101', { category: 'Pump' })])
    first.assets[0].override = { name: 'Booster pump' }

    const second = importModel(
      first.assets,
      [modelRow('P-101', { category: 'Pump', level: 'L1' })],
      2
    )
    const resolved = resolveAsset(second.assets[0])
    expect(second.diff.matched).toBe(1)
    expect(resolved.name).toBe('Booster pump')
    expect(resolved.level).toBe('L1')
    expect(second.assets[0].revision).toBe(2)
  })

  it('marks assets missing from the new model as removed instead of deleting them', () => {
    const first = importModel([], [modelRow('P-101'), modelRow('P-102')])
    const second = importModel(first.assets, [modelRow('P-101')], 2)
    expect(second.assets).toHaveLength(2)
    expect(second.diff.removed).toEqual(['P-102'])
    expect(second.assets.find((asset) => asset.tag === 'P-102')?.status).toBe('removed')
  })

  it('matches by guid when the tag changed', () => {
    const first = importModel([], [{ ...modelRow('old-tag'), guid: 'GUID-1' }])
    const second = importModel(first.assets, [{ ...modelRow('new-tag'), guid: 'GUID-1' }], 2)
    expect(second.assets).toHaveLength(1)
    expect(second.diff.matched).toBe(1)
  })

  it('does not let a placeholder category overwrite one that came from a CSV', () => {
    const first = importModel([], [modelRow('P-101')])
    const csv = mergeImport(
      first.assets,
      [{ ...modelRow('P-101', { category: 'Pump' }), hasGeometry: false }],
      { mode: 'csv', source: 'bom.csv', revision: 1, createId }
    )
    const second = importModel(csv.assets, [modelRow('P-101')], 2)
    expect(resolveAsset(second.assets[0]).category).toBe('Pump')
  })
})

describe('mergeImport (csv)', () => {
  it('enriches matching assets and adds unmatched rows without geometry', () => {
    const model = importModel([], [modelRow('P-101')])
    const csv = mergeImport(
      model.assets,
      [
        {
          ...modelRow('P-101', { category: 'Pump', properties: { Power: '22 kW' } }),
          hasGeometry: false,
        },
        { ...modelRow('X-999'), hasGeometry: false },
      ],
      { mode: 'csv', source: 'bom.csv', revision: 1, createId }
    )
    expect(csv.diff.matched).toBe(1)
    expect(csv.diff.unmatched).toEqual(['X-999'])
    const pump = csv.assets.find((asset) => asset.tag === 'P-101')!
    expect(pump.hasGeometry).toBe(true)
    expect(resolveAsset(pump).properties.Power).toBe('22 kW')
    expect(csv.assets.find((asset) => asset.tag === 'X-999')?.hasGeometry).toBe(false)
  })
})

describe('csv parsing', () => {
  it('handles quoted commas, escaped quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ])
  })

  it('maps known headers to fields and the rest to properties', () => {
    const result = csvToImportRows(
      'Part Number,Description,Type,Level,Power\nP-101,Booster pump,Pump,L1,22 kW\n'
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.rows[0]).toMatchObject({
      tag: 'P-101',
      fields: {
        name: 'Booster pump',
        category: 'Pump',
        level: 'L1',
        properties: { Power: '22 kW' },
      },
    })
  })

  it('rejects a CSV with no tag or name column', () => {
    expect(csvToImportRows('Power\n22 kW').status).toBe('error')
  })
})

describe('toOverride', () => {
  it('keeps only changed fields', () => {
    const imported = {
      name: 'P-101',
      category: 'Pump',
      level: 'L1',
      room: '',
      system: '',
      equipment: '',
      properties: {},
    }
    expect(
      toOverride(imported, {
        name: 'Booster',
        category: 'Pump',
        level: 'L1',
        room: '',
        system: '',
        equipment: '',
      })
    ).toEqual({ name: 'Booster' })
  })
})
