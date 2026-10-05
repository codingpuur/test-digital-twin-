import type { DateRangeId } from './dashboards.types'
import { DATE_RANGES } from './dashboards.types'

export type MockStream = {
  id: string
  name: string
  asset: string
  unit: string
  min: number
  max: number
  warnAbove?: number
  base: number
  amplitude: number
  noise: number
  periodHours: number
  /** Extra reading added during a short recurring event, so warnings show up in history. */
  spike?: number
}

export const MOCK_STREAMS: MockStream[] = [
  {
    id: 'flow',
    name: 'Station flow',
    asset: 'FT-201 Flow meter',
    unit: 'm³/h',
    min: 0,
    max: 1500,
    base: 900,
    amplitude: 260,
    noise: 40,
    periodHours: 24,
  },
  {
    id: 'pressure',
    name: 'Header pressure',
    asset: 'PT-202 Pressure transmitter',
    unit: 'bar',
    min: 0,
    max: 10,
    warnAbove: 8,
    base: 5.4,
    amplitude: 1.1,
    noise: 0.15,
    periodHours: 12,
    spike: 3.5,
  },
  {
    id: 'level',
    name: 'Wet-well level',
    asset: 'LT-001 Level sensor',
    unit: '%',
    min: 0,
    max: 100,
    warnAbove: 90,
    base: 55,
    amplitude: 28,
    noise: 2,
    periodHours: 6,
    spike: 30,
  },
  {
    id: 'power',
    name: 'P-101 power',
    asset: 'M-101 Motor',
    unit: 'kW',
    min: 0,
    max: 120,
    base: 62,
    amplitude: 14,
    noise: 3,
    periodHours: 8,
  },
  {
    id: 'vibration',
    name: 'P-101 vibration',
    asset: 'P-101 Pump',
    unit: 'mm/s',
    min: 0,
    max: 12,
    warnAbove: 7,
    base: 3.2,
    amplitude: 0.8,
    noise: 0.35,
    periodHours: 5,
    spike: 5,
  },
  {
    id: 'temperature',
    name: 'M-101 winding temperature',
    asset: 'M-101 Motor',
    unit: '°C',
    min: 20,
    max: 120,
    warnAbove: 90,
    base: 66,
    amplitude: 8,
    noise: 1,
    periodHours: 10,
    spike: 30,
  },
]

export const getStream = (id: string) => MOCK_STREAMS.find((stream) => stream.id === id)

// Deterministic pseudo-random value in [-1, 1) so a given timestamp always yields the same reading.
const hashNoise = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

const hashString = (value: string) =>
  [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 100003, 7)

export const readStream = (stream: MockStream, timestamp: number): number => {
  const hours = timestamp / 3_600_000
  const wave = Math.sin((hours / stream.periodHours) * 2 * Math.PI + hashString(stream.id))
  // One ~50 minute event every 19 hours.
  const cycle = hours % 19
  const spike =
    stream.spike && cycle > 18.15 ? stream.spike * Math.sin(((cycle - 18.15) / 0.85) * Math.PI) : 0
  const value =
    stream.base +
    wave * stream.amplitude +
    spike +
    hashNoise(Math.floor(timestamp / 60_000)) * stream.noise
  return Math.min(stream.max, Math.max(stream.min, value))
}

export type StreamPoint = { time: number; value: number }

export const getSeries = (
  stream: MockStream,
  rangeId: DateRangeId,
  now: number,
  points = 120
): StreamPoint[] => {
  const hours = DATE_RANGES.find((range) => range.id === rangeId)?.hours ?? 24
  const span = hours * 3_600_000
  return Array.from({ length: points }, (_, index) => {
    const time = now - span + (span * index) / (points - 1)
    return { time, value: readStream(stream, time) }
  })
}

export type StreamStatus = 'Normal' | 'Warning'

export const getStatus = (stream: MockStream, value: number): StreamStatus =>
  stream.warnAbove !== undefined && value > stream.warnAbove ? 'Warning' : 'Normal'

export const formatValue = (stream: MockStream, value: number) =>
  stream.max <= 20 ? value.toFixed(1) : Math.round(value).toString()
