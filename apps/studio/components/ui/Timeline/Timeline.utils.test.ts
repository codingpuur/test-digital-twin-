import { describe, expect, it } from 'vitest'

import { clampRange, getTicks, pickTickStep, timeToX, xToTime } from './Timeline.utils'

const HOUR = 3_600_000
const DAY = 24 * HOUR

describe('Timeline utils', () => {
  it('uses a coarser tick step for a longer span', () => {
    expect(pickTickStep(DAY, 800)).toBeLessThan(pickTickStep(30 * DAY, 800))
  })

  it('keeps ticks at least 72px apart', () => {
    const start = Date.UTC(2026, 9, 1)
    const end = start + 3 * DAY
    const ticks = getTicks(start, end, 720)
    const spacing = ((ticks[1].time - ticks[0].time) / (end - start)) * 720
    expect(spacing).toBeGreaterThanOrEqual(72)
  })

  it('only returns ticks inside the window', () => {
    const start = Date.UTC(2026, 9, 1, 3)
    const end = start + DAY
    getTicks(start, end, 600).forEach((tick) => {
      expect(tick.time).toBeGreaterThanOrEqual(start)
      expect(tick.time).toBeLessThanOrEqual(end)
    })
  })

  it('returns no ticks for an empty window or zero width', () => {
    expect(getTicks(10, 10, 500)).toEqual([])
    expect(getTicks(0, 100, 0)).toEqual([])
  })

  it('converts between time and x', () => {
    expect(timeToX(150, 100, 200, 500)).toBe(250)
    expect(xToTime(250, 100, 200, 500)).toBe(150)
    expect(xToTime(-20, 100, 200, 500)).toBe(100)
    expect(xToTime(900, 100, 200, 500)).toBe(200)
  })

  it('clamps the range to 1 hour - 30 days', () => {
    expect(clampRange(1000)).toBe(HOUR)
    expect(clampRange(100 * DAY)).toBe(30 * DAY)
  })
})
