import { elementTag } from './asset-bridge'
import type { ElementReading } from './simulation/signals'
import { STATUS_COLORS } from './status-colors'
import type { TwinElement } from './twin.types'
import type { TwinStreamRow } from '@/data/twin/twin-queries'
import { isWarningValue, readingAt, readingsBetween } from '@/lib/twin/streams'

const SPARKLINE_WINDOW_MS = 60 * 60 * 1000

export const groupStreamsByTag = (streams: TwinStreamRow[]) => {
  const byTag = new Map<string, TwinStreamRow[]>()
  streams.forEach((stream) => {
    if (!stream.assetTag) return
    byTag.set(stream.assetTag, [...(byTag.get(stream.assetTag) ?? []), stream])
  })
  return byTag
}

/** `atMs = null` is live; otherwise the timeline cursor, so the twin replays stored history. */
const valueOf = (stream: TwinStreamRow, atMs: number | null) =>
  readingAt(stream.readings, atMs)?.value ?? null

const formatValue = (stream: TwinStreamRow, value: number | null) =>
  value === null ? '-' : `${+value.toFixed(2)} ${stream.unit}`.trim()

export const getStreamReadings = (
  element: TwinElement,
  byTag: Map<string, TwinStreamRow[]>,
  atMs: number | null
): ElementReading[] =>
  (byTag.get(elementTag(element)) ?? []).map((stream) => {
    const value = valueOf(stream, atMs)
    const end = atMs ?? stream.lastTs ?? 0
    return {
      label: stream.parameter || stream.key,
      value: formatValue(stream, value),
      isWarning: isWarningValue(value, stream.warnAbove),
      history: readingsBetween(stream.readings, end - SPARKLINE_WINDOW_MS, end).map(
        (reading) => reading.value
      ),
    }
  })

/** Elements with a mapped stream are coloured by it; the rest keep the colour they already had. */
export const applyStreamColors = (
  colors: Record<string, string> | null,
  elements: TwinElement[],
  byTag: Map<string, TwinStreamRow[]>,
  atMs: number | null
) => {
  if (!colors || byTag.size === 0) return colors
  const next = { ...colors }
  elements.forEach((element) => {
    const streams = byTag.get(elementTag(element))
    if (!streams) return
    const values = streams.map((stream) => ({ stream, value: valueOf(stream, atMs) }))
    if (values.every(({ value }) => value === null)) {
      next[element.id] = STATUS_COLORS.Unlinked
      return
    }
    const hasWarning = values.some(({ stream, value }) => isWarningValue(value, stream.warnAbove))
    next[element.id] = hasWarning ? STATUS_COLORS.Warning : STATUS_COLORS.Normal
  })
  return next
}
