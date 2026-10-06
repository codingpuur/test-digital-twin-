import { elementTag } from './asset-bridge'
import type { ElementReading } from './simulation/signals'
import { STATUS_COLORS } from './status-colors'
import type { TwinElement } from './twin.types'
import type { TwinStreamRow } from '@/data/twin/twin-queries'
import { isWarning } from '@/lib/twin/streams'

export const groupStreamsByTag = (streams: TwinStreamRow[]) => {
  const byTag = new Map<string, TwinStreamRow[]>()
  streams.forEach((stream) => {
    if (!stream.assetTag) return
    byTag.set(stream.assetTag, [...(byTag.get(stream.assetTag) ?? []), stream])
  })
  return byTag
}

const formatValue = (stream: TwinStreamRow) =>
  stream.lastValue === null ? '-' : `${+stream.lastValue.toFixed(2)} ${stream.unit}`.trim()

export const getStreamReadings = (
  element: TwinElement,
  byTag: Map<string, TwinStreamRow[]>
): ElementReading[] =>
  (byTag.get(elementTag(element)) ?? []).map((stream) => ({
    label: stream.parameter || stream.key,
    value: formatValue(stream),
    isWarning: isWarning(stream),
    history: stream.recent.map((reading) => reading.value),
  }))

/** Elements with a mapped stream are coloured by it; the rest keep the colour they already had. */
export const applyStreamColors = (
  colors: Record<string, string> | null,
  elements: TwinElement[],
  byTag: Map<string, TwinStreamRow[]>
) => {
  if (!colors || byTag.size === 0) return colors
  const next = { ...colors }
  elements.forEach((element) => {
    const streams = byTag.get(elementTag(element))
    if (!streams) return
    next[element.id] = streams.some(isWarning) ? STATUS_COLORS.Warning : STATUS_COLORS.Normal
  })
  return next
}
