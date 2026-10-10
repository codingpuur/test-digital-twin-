import { describe, expect, it } from 'vitest'

import { mergeImport, resolveAsset, type AssetImportRow } from './assets'
import { csvToImportRows } from './csv'
import { equipmentTags, partsOfEquipment } from './equipment'
import { formatAge, formatRul, healthStatus } from './insights'

const part = (id: string, equipment?: string) => ({ id, equipment })

describe('equipment', () => {
  it('finds every part of one equipment', () => {
    const parts = [part('a', 'P-101'), part('b', 'P-101'), part('c', 'V-201'), part('d')]
    expect(partsOfEquipment(parts, 'P-101').map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('has no parts for an empty tag, so unassigned parts are not grouped together', () => {
    expect(partsOfEquipment([part('a'), part('b', '')], '')).toEqual([])
  })

  it('lists distinct tags in first-seen order', () => {
    const parts = [part('a', 'V-201'), part('b'), part('c', 'P-101'), part('d', 'V-201')]
    expect(equipmentTags(parts)).toEqual(['V-201', 'P-101'])
  })
})

describe('equipment in imports', () => {
  it('reads an Equipment column from a CSV', () => {
    const result = csvToImportRows('Tag,Name,Equipment\nP-101-IMP,Impeller,P-101\n')
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.rows[0].fields.equipment).toBe('P-101')
  })

  const modelRow = (tag: string, equipment: string): AssetImportRow => ({
    tag,
    guid: '',
    hasGeometry: true,
    fields: {
      name: tag,
      category: 'Part',
      level: '',
      room: '',
      system: '',
      equipment,
      properties: {},
    },
  })
  let counter = 0
  const options = { source: 'file', revision: 1, createId: () => `id-${++counter}` }

  it('keeps an equipment set by a CSV when the model is imported again with its own guess', () => {
    const first = mergeImport([], [modelRow('shaft', 'Guess')], { ...options, mode: 'model' })
    const csv = mergeImport(first.assets, [modelRow('shaft', 'P-101')], { ...options, mode: 'csv' })
    const again = mergeImport(csv.assets, [modelRow('shaft', 'Guess')], {
      ...options,
      mode: 'model',
      revision: 2,
    })
    expect(resolveAsset(again.assets[0]).equipment).toBe('P-101')
  })

  it('takes the model equipment when nothing else supplied one', () => {
    const { assets } = mergeImport([], [modelRow('shaft', 'P-101')], { ...options, mode: 'model' })
    expect(resolveAsset(assets[0]).equipment).toBe('P-101')
  })
})

describe('insights helpers', () => {
  it('maps a score to a status', () => {
    expect([95, 72, 40].map(healthStatus)).toEqual(['healthy', 'attention', 'critical'])
  })

  it('formats remaining life and age', () => {
    expect(formatRul(41)).toBe('41 days')
    expect(formatRul(120)).toBe('4 months')
    expect(formatRul(800)).toBe('2.2 years')
    expect(formatAge(4)).toBe('4 h ago')
    expect(formatAge(48)).toBe('2 d ago')
  })
})
