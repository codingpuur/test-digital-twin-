import { describe, expect, it } from 'vitest'

import {
  csvToReadings,
  ingestReadings,
  isWarningValue,
  normalizeReadings,
  parseTimestamp,
  readingAt,
  readingsBetween,
} from './streams'

let counter = 0
const createId = () => `s${++counter}`

describe('parseTimestamp', () => {
  it('reads ISO strings, epoch seconds and epoch milliseconds', () => {
    expect(parseTimestamp('2026-01-01T00:00:00Z')).toBe(Date.UTC(2026, 0, 1))
    expect(parseTimestamp(1767225600)).toBe(1767225600000)
    expect(parseTimestamp('1767225600000')).toBe(1767225600000)
    expect(parseTimestamp('not a date')).toBeNull()
    expect(parseTimestamp(undefined, 5)).toBe(5)
  })
})

describe('normalizeReadings', () => {
  it('accepts a single reading, a list, or {readings} and counts bad items', () => {
    expect(normalizeReadings({ stream: 'a', value: 1 }, 10).readings).toHaveLength(1)
    expect(
      normalizeReadings(
        [
          { stream: 'a', value: 1 },
          { stream: 'b', value: 'x' },
        ],
        10
      )
    ).toMatchObject({
      rejected: 1,
    })
    expect(
      normalizeReadings({ readings: [{ stream: 'a', value: '2' }] }, 10).readings[0].value
    ).toBe(2)
  })
})

describe('ingestReadings', () => {
  it('creates unknown streams unmapped and keeps the latest value', () => {
    const result = ingestReadings(
      { streams: [], readings: {} },
      [
        { stream: 'P-101.vibration', value: 2, ts: 1000 },
        { stream: 'P-101.vibration', value: 3, ts: 2000 },
      ],
      createId
    )
    expect(result.streams).toHaveLength(1)
    expect(result.streams[0]).toMatchObject({ assetTag: '', lastValue: 3, lastTs: 2000 })
    expect(Object.values(result.readings)[0]).toHaveLength(2)
  })

  it('keeps an existing mapping and orders late readings by time', () => {
    const first = ingestReadings(
      { streams: [], readings: {} },
      [{ stream: 'k', value: 1, ts: 2000 }],
      createId
    )
    first.streams[0].assetTag = 'P-101'
    const second = ingestReadings(first, [{ stream: 'k', value: 9, ts: 1000 }], createId)
    expect(second.streams[0].assetTag).toBe('P-101')
    expect(second.streams[0].lastValue).toBe(1)
  })
})

describe('csvToReadings', () => {
  it('reads long format', () => {
    const result = csvToReadings(
      'timestamp,stream,value\n2026-01-01T00:00:00Z,a,1\n2026-01-01T00:00:01Z,b,2\n'
    )
    expect(result.status === 'success' && result.readings).toHaveLength(2)
  })

  it('reads wide format with one column per stream', () => {
    const result = csvToReadings('time,P-101.speed,P-101.vib\n1767225600,80,2.5\n1767225601,81,\n')
    expect(result.status === 'success' && result.readings.map((r) => r.stream)).toEqual([
      'P-101.speed',
      'P-101.vib',
      'P-101.speed',
    ])
  })

  it('rejects a CSV without a timestamp column', () => {
    expect(csvToReadings('a,b\n1,2').status).toBe('error')
  })
})

describe('readingAt', () => {
  const readings = [
    { ts: 1000, value: 1 },
    { ts: 2000, value: 2 },
    { ts: 3000, value: 3 },
  ]

  it('returns the newest reading when live', () => {
    expect(readingAt(readings, null)?.value).toBe(3)
  })

  it('returns the reading in force at a past time, or null before the first', () => {
    expect(readingAt(readings, 2500)?.value).toBe(2)
    expect(readingAt(readings, 3000)?.value).toBe(3)
    expect(readingAt(readings, 500)).toBeNull()
    expect(readingAt([], null)).toBeNull()
  })

  it('selects a window', () => {
    expect(readingsBetween(readings, 1500, 3000).map((reading) => reading.value)).toEqual([2, 3])
  })
})

describe('isWarningValue', () => {
  it('flags a value above the threshold', () => {
    expect(isWarningValue(6, 5)).toBe(true)
    expect(isWarningValue(6, null)).toBe(false)
    expect(isWarningValue(null, 5)).toBe(false)
  })
})
