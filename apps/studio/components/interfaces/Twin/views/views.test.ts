import { describe, expect, it } from 'vitest'

import type { TwinView } from './views.types'
import { filterViews, splitByDashboards, uniqueViewName } from './views.utils'

const view = (id: string, name: string): TwinView => ({
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z',
  thumbnail: '',
  camera: { position: [0, 0, 0], target: [0, 0, 0] },
  hiddenCategories: [],
  selectedId: null,
  isColorByStatus: true,
})

const views = [view('a', '01_Pump 1'), view('b', '02_Transition'), view('c', 'Facility View')]

describe('views utils', () => {
  it('filters by name, ignoring case and spaces around the query', () => {
    expect(filterViews(views, ' pump ').map((item) => item.id)).toEqual(['a'])
    expect(filterViews(views, '')).toHaveLength(3)
  })

  it('splits views bound to dashboards from the rest', () => {
    const { fromDashboards, others } = splitByDashboards(views, new Set(['b']))
    expect(fromDashboards.map((item) => item.id)).toEqual(['b'])
    expect(others.map((item) => item.id)).toEqual(['a', 'c'])
  })

  it('numbers a name that already exists', () => {
    expect(uniqueViewName('Pump Room', views)).toBe('Pump Room')
    expect(uniqueViewName('facility view', views)).toBe('facility view 2')
    expect(uniqueViewName('Facility View', [...views, view('d', 'Facility View 2')])).toBe(
      'Facility View 3'
    )
  })
})
