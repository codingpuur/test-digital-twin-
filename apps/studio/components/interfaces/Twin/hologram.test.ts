import { describe, expect, it } from 'vitest'

import { HOLOGRAM_COLORS, hologramTint } from './hologram'
import { STATUS_COLORS } from './status-colors'

const base = { isSelected: false, isGrouped: false }

describe('hologramTint', () => {
  it('shows healthy parts in calm cyan and a warning part in strong red', () => {
    const healthy = hologramTint({ ...base, statusColor: STATUS_COLORS.Normal })
    const faulty = hologramTint({ ...base, statusColor: STATUS_COLORS.Warning })
    expect(healthy.color).toBe(HOLOGRAM_COLORS.normal)
    expect(faulty.color).toBe(HOLOGRAM_COLORS.warning)
    expect(faulty.intensity).toBeGreaterThan(healthy.intensity)
  })

  it('dims parts that have no data', () => {
    const unlinked = hologramTint({ ...base, statusColor: STATUS_COLORS.Unlinked })
    expect(unlinked.color).toBe(HOLOGRAM_COLORS.unlinked)
    expect(unlinked.intensity).toBeLessThan(hologramTint(base).intensity)
  })

  it('makes the selection orange, even when the part is faulty', () => {
    const selected = hologramTint({ ...base, isSelected: true, statusColor: STATUS_COLORS.Warning })
    expect(selected.color).toBe(HOLOGRAM_COLORS.selected)
  })

  it('shows the rest of the selected equipment in a softer orange', () => {
    expect(hologramTint({ ...base, isGrouped: true }).color).toBe(HOLOGRAM_COLORS.group)
  })

  it('keeps floors and walls faint so equipment stands out', () => {
    const wall = hologramTint({ ...base, category: 'Walls' })
    expect(wall.intensity).toBeLessThan(hologramTint(base).intensity)
  })

  it('passes through a colour it does not know', () => {
    expect(hologramTint({ ...base, statusColor: '#123456' }).color).toBe('#123456')
  })
})
