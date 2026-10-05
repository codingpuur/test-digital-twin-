import { READINGS_BY_ELEMENT, type Signals } from './simulation/signals'
import type { TwinElement } from './twin.types'

export const STATUS_COLORS = {
  Normal: '#3ecf8e',
  Warning: '#e5484d',
  Unlinked: '#6b7280',
} as const

/** Colour per element id: worst reading wins; elements with no readings are grey. */
export const getStatusColors = (elements: TwinElement[], signals: Signals) => {
  const colors: Record<string, string> = {}
  elements.forEach((element) => {
    const specs = READINGS_BY_ELEMENT[element.name]
    if (!specs || specs.length === 0) {
      colors[element.id] = STATUS_COLORS.Unlinked
      return
    }
    const hasWarning = specs.some(
      (spec) => spec.warnAbove !== undefined && (signals[spec.signal] ?? 0) > spec.warnAbove
    )
    colors[element.id] = hasWarning ? STATUS_COLORS.Warning : STATUS_COLORS.Normal
  })
  return colors
}
