import { describe, expect, it } from 'vitest'

import { getPath, mapPollResponse } from './poll-mapping'
import { POLL_PRESETS } from './poll-presets'
import { ingestReadings } from './streams'

const NOW = 1_700_000_000_000

describe('getPath', () => {
  it('reads nested keys and array items, and returns undefined for a missing step', () => {
    const data = { current: { temp: 21 }, list: [{ v: 1 }, { v: 2 }], 'P-101': { vib: 3 } }
    expect(getPath(data, 'current.temp')).toBe(21)
    expect(getPath(data, 'list[1].v')).toBe(2)
    expect(getPath(data, 'P-101.vib')).toBe(3)
    expect(getPath(data, 'current.missing.deeper')).toBeUndefined()
  })
})

describe('mapPollResponse (values)', () => {
  const mapping = {
    kind: 'values' as const,
    timePath: 'time',
    streams: [
      { stream: 'P-101.temp', path: 'a.temp', scale: 1, unit: '°C', assetTag: 'P-101' },
      { stream: 'P-101.vib', path: 'a.vib', scale: 2, offset: 1 },
      { stream: 'P-101.missing', path: 'a.nope' },
    ],
  }

  it('maps values, applies scale and offset, and counts missing ones as skipped', () => {
    const { readings, skipped } = mapPollResponse(
      { time: 1_700_000_100, a: { temp: 40, vib: 3 } },
      mapping,
      NOW
    )
    expect(skipped).toBe(1)
    expect(readings).toHaveLength(2)
    expect(readings[0]).toMatchObject({ stream: 'P-101.temp', value: 40, ts: 1_700_000_100_000 })
    expect(readings[0].meta).toMatchObject({ unit: '°C', assetTag: 'P-101' })
    expect(readings[1].value).toBe(7)
  })

  it('uses the poll time when the response has no timestamp, and skips non-numbers', () => {
    const { readings, skipped } = mapPollResponse({ a: { temp: 'hot', vib: '4' } }, mapping, NOW)
    expect(readings.map((reading) => [reading.stream, reading.value, reading.ts])).toEqual([
      ['P-101.vib', 9, NOW],
    ])
    expect(skipped).toBe(2)
  })
})

describe('mapPollResponse (rows)', () => {
  const mapping = {
    kind: 'rows' as const,
    rowsPath: 'data',
    streamPath: 'sensor',
    valuePath: 'reading.value',
    timePath: 'at',
    streamPrefix: 'plant.',
  }

  it('turns each row into a reading and skips bad rows', () => {
    const { readings, skipped } = mapPollResponse(
      {
        data: [
          { sensor: 'P-101', reading: { value: 2.9 }, at: '2026-01-01T10:00:00Z' },
          { sensor: 'P-102', reading: { value: 'x' } },
        ],
      },
      mapping,
      NOW
    )
    expect(readings).toHaveLength(1)
    expect(readings[0]).toMatchObject({ stream: 'plant.P-101', value: 2.9 })
    expect(skipped).toBe(1)
  })

  it('treats a response that is not a list as one skipped item', () => {
    expect(mapPollResponse({ data: 'oops' }, mapping, NOW)).toEqual({ readings: [], skipped: 1 })
  })
})

describe('new streams from a poll', () => {
  it('start mapped, and a later poll does not overwrite what the user edited', () => {
    const first = ingestReadings(
      { streams: [], readings: {} },
      [
        {
          stream: 'P-101.vib',
          value: 3,
          ts: 1,
          meta: { assetTag: 'P-101', unit: 'mm/s', warnAbove: 7 },
        },
      ],
      () => 'id-1'
    )
    expect(first.streams[0]).toMatchObject({ assetTag: 'P-101', unit: 'mm/s', warnAbove: 7 })

    const edited = first.streams.map((stream) => ({ ...stream, warnAbove: 9 }))
    const second = ingestReadings(
      { streams: edited, readings: first.readings },
      [{ stream: 'P-101.vib', value: 4, ts: 2, meta: { warnAbove: 7 } }],
      () => 'id-2'
    )
    expect(second.streams[0].warnAbove).toBe(9)
  })
})

describe('presets', () => {
  it('map a sample ISS response', () => {
    const { readings } = mapPollResponse(
      { latitude: 10, longitude: 20, altitude: 421.5, velocity: 27600, timestamp: 1_700_000_000 },
      POLL_PRESETS.iss.mapping,
      NOW
    )
    expect(readings.map((reading) => reading.stream)).toEqual([
      'ISS.altitude',
      'ISS.velocity',
      'ISS.latitude',
      'ISS.longitude',
    ])
    expect(readings[1].value).toBe(27.6)
  })
})
