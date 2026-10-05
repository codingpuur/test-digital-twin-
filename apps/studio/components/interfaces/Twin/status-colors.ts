import { getStatus, getStream, readStream } from './dashboards/mock-streams'
import type { TwinElement } from './twin.types'

export const STATUS_COLORS = {
  Normal: '#3ecf8e',
  Warning: '#e5484d',
  Unlinked: '#6b7280',
} as const

/** Colour per element id based on the worst stream status at `time`. */
export const getStatusColors = (elements: TwinElement[], time: number) => {
  const colors: Record<string, string> = {}
  elements.forEach((element) => {
    const streams = (element.streamIds ?? []).flatMap((id) => getStream(id) ?? [])
    if (streams.length === 0) {
      colors[element.id] = STATUS_COLORS.Unlinked
      return
    }
    const hasWarning = streams.some(
      (stream) => getStatus(stream, readStream(stream, time)) === 'Warning'
    )
    colors[element.id] = hasWarning ? STATUS_COLORS.Warning : STATUS_COLORS.Normal
  })
  return colors
}
