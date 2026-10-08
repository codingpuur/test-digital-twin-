import { describe, expect, it } from 'vitest'

import {
  advancePlayback,
  clampRange,
  getTicks,
  pickTickStep,
  timeToX,
  xToTime,
} from './Timeline.utils'

const HOUR = 3_600_000
const DAY = 24 * HOUR

describe('Timeline utils', () => {
  it('uses a coarser tick step for a longer span', () => {
    expect(pickTickStep(DAY, 800)).toBeLessThan(pickTickStep(30 * DAY, 800))
  })

  it('keeps ticks at least 72px apart', () => {
    const start = Date.UTC(2026, 9, 1)
    const end = start + 3 * DAY
    // Only labelled ticks need room for their text; the small marks sit between them.
    const ticks = getTicks(start, end, 720).filter((tick) => tick.label !== '')
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

  it('draws three levels of ticks: dated midnights, labelled steps and small marks', () => {
    const start = new Date(2026, 9, 6, 1).getTime()
    const end = start + 3 * DAY
    const ticks = getTicks(start, end, 1400)
    const levels = new Set(ticks.map((tick) => tick.level))
    expect(levels).toEqual(new Set(['day', 'major', 'minor']))
    ticks.filter((tick) => tick.level === 'minor').forEach((tick) => expect(tick.label).toBe(''))
    ticks
      .filter((tick) => tick.level === 'day')
      .forEach((tick) => {
        expect(new Date(tick.time).getHours()).toBe(0)
      })
  })
})

describe('advancePlayback', () => {
  const now = 1_000_000
  const position = { cursor: 400_000, windowEnd: 600_000, rangeMs: 300_000, isLooping: false }

  it('moves the cursor forward and keeps playing', () => {
    expect(advancePlayback(position, 50_000, now)).toEqual({
      cursor: 450_000,
      windowEnd: 600_000,
      isLive: false,
      isPlaying: true,
    })
  })

  it('slides the window along when the cursor passes its end', () => {
    const result = advancePlayback({ ...position, cursor: 590_000 }, 30_000, now)
    expect(result.windowEnd).toBeGreaterThan(600_000)
    expect(result.isPlaying).toBe(true)
  })

  it('goes live when it reaches now without looping', () => {
    const result = advancePlayback({ ...position, windowEnd: now, cursor: 990_000 }, 50_000, now)
    expect(result).toEqual({ cursor: now, windowEnd: now, isLive: true, isPlaying: false })
  })

  it('jumps back to the start of the window when looping', () => {
    const result = advancePlayback({ ...position, cursor: 590_000, isLooping: true }, 30_000, now)
    expect(result).toEqual({ cursor: 300_000, windowEnd: 600_000, isLive: false, isPlaying: true })
  })
})
