import { useParams } from 'common'
import { useMemo } from 'react'

import { DATE_RANGES, type DateRangeId } from './dashboards.types'
import {
  getSeries,
  MOCK_STREAMS,
  readStream,
  type MockStream,
  type StreamPoint,
} from './mock-streams'
import { useTwinStreamsQuery, type TwinStreamRow } from '@/data/twin/twin-queries'
import { isWarningValue, readingAt, readingsBetween } from '@/lib/twin/streams'

/** What a dashboard card needs from a stream, whether it is a sample or real sensor data. */
export type DashboardStream = {
  id: string
  name: string
  asset: string
  unit: string
  min: number
  max: number
  warnAbove?: number
  decimals: number
  isLive: boolean
  /** Value in force at a time, or null when the stream has no data yet at that time. */
  valueAt: (timestamp: number) => number | null
  series: (rangeId: DateRangeId, now: number) => StreamPoint[]
}

export const LIVE_STREAM_PREFIX = 'live:'

const fromMockStream = (stream: MockStream): DashboardStream => ({
  id: stream.id,
  name: stream.name,
  asset: stream.asset,
  unit: stream.unit,
  min: stream.min,
  max: stream.max,
  warnAbove: stream.warnAbove,
  decimals: stream.max <= 20 ? 1 : 0,
  isLive: false,
  valueAt: (timestamp) => readStream(stream, timestamp),
  series: (rangeId, now) => getSeries(stream, rangeId, now),
})

const fromTwinStream = (stream: TwinStreamRow): DashboardStream => {
  const values = stream.readings.map((reading) => reading.value)
  const highest = Math.max(...values, stream.warnAbove ?? 0, 1)
  return {
    id: `${LIVE_STREAM_PREFIX}${stream.id}`,
    name: stream.parameter || stream.key,
    asset: stream.assetTag || 'Unmapped',
    unit: stream.unit,
    min: Math.min(0, ...values),
    max: Math.ceil(highest * 1.2),
    warnAbove: stream.warnAbove ?? undefined,
    decimals: highest <= 20 ? 1 : 0,
    isLive: true,
    valueAt: (timestamp) => readingAt(stream.readings, timestamp)?.value ?? null,
    series: (rangeId, now) => {
      const hours = DATE_RANGES.find((range) => range.id === rangeId)?.hours ?? 24
      return readingsBetween(stream.readings, now - hours * 3_600_000, now).map((reading) => ({
        time: reading.ts,
        value: reading.value,
      }))
    },
  }
}

export const formatStreamValue = (stream: DashboardStream, value: number | null) =>
  value === null ? '-' : value.toFixed(stream.decimals)

export const getStreamStatus = (stream: DashboardStream, value: number | null) =>
  isWarningValue(value, stream.warnAbove ?? null) ? 'Warning' : 'Normal'

const sampleStreams = MOCK_STREAMS.map(fromMockStream)

/** Real streams of the current site first, then the built-in sample streams. */
export const useDashboardStreams = () => {
  const { ref } = useParams()
  const { data } = useTwinStreamsQuery(ref)
  return useMemo(() => {
    const live = (data?.streams ?? []).map(fromTwinStream)
    return { live, sample: sampleStreams, all: [...live, ...sampleStreams] }
  }, [data])
}
