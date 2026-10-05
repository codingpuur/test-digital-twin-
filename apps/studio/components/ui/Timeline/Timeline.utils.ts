import {
  MAX_TIMELINE_RANGE_MS,
  MIN_TIMELINE_RANGE_MS,
  type TimelineTick,
} from './Timeline.types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const TICK_STEPS = [
  5 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  4 * HOUR,
  8 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  7 * DAY,
]

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const clampRange = (rangeMs: number) =>
  clamp(rangeMs, MIN_TIMELINE_RANGE_MS, MAX_TIMELINE_RANGE_MS)

/** Smallest "nice" step that keeps ticks at least `minPx` apart. */
export const pickTickStep = (spanMs: number, widthPx: number, minPx = 72) => {
  const maxTicks = Math.max(1, Math.floor(widthPx / minPx))
  return TICK_STEPS.find((step) => spanMs / step <= maxTicks) ?? TICK_STEPS[TICK_STEPS.length - 1]
}

const formatDay = (time: number) =>
  new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' })

const formatHour = (time: number) =>
  new Date(time).toLocaleTimeString([], { hour: 'numeric' }).replace(' ', '')

/** Ticks aligned to local-time boundaries; local midnights are major ticks labelled with the date. */
export const getTicks = (start: number, end: number, widthPx: number): TimelineTick[] => {
  if (end <= start || widthPx <= 0) return []
  const step = pickTickStep(end - start, widthPx)
  // getTimezoneOffset is in minutes and positive west of UTC.
  const offset = new Date(start).getTimezoneOffset() * MINUTE
  const first = start - ((((start - offset) % step) + step) % step) + step

  const ticks: TimelineTick[] = []
  for (let time = first; time <= end; time += step) {
    const isMidnight = (((time - offset) % DAY) + DAY) % DAY === 0
    const isMajor = isMidnight || step >= DAY
    ticks.push({
      time,
      isMajor,
      label: isMajor ? formatDay(time) : step < HOUR ? formatTimeShort(time) : formatHour(time),
    })
  }
  return ticks
}

const formatTimeShort = (time: number) =>
  new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const timeToX = (time: number, start: number, end: number, widthPx: number) =>
  ((time - start) / (end - start)) * widthPx

export const xToTime = (x: number, start: number, end: number, widthPx: number) =>
  start + (clamp(x, 0, widthPx) / widthPx) * (end - start)
