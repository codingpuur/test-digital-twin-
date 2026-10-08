import { MAX_TIMELINE_RANGE_MS, MIN_TIMELINE_RANGE_MS, type TimelineTick } from './Timeline.types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const TICK_STEPS = [
  5 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  7 * DAY,
]

/** The small marks between two labelled ticks, by labelled step. */
const MINOR_STEPS = new Map<number, number>([
  [5 * MINUTE, MINUTE],
  [15 * MINUTE, 5 * MINUTE],
  [30 * MINUTE, 5 * MINUTE],
  [HOUR, 15 * MINUTE],
  [3 * HOUR, HOUR],
  [6 * HOUR, HOUR],
  [12 * HOUR, 3 * HOUR],
  [DAY, 6 * HOUR],
  [2 * DAY, 12 * HOUR],
  [7 * DAY, DAY],
])

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

/**
 * Ticks aligned to local-time boundaries, in three levels: local midnights are tall and dated, a
 * "nice" step (6 h, 1 h, ...) is labelled, and finer marks in between are small and unlabelled.
 */
export const getTicks = (start: number, end: number, widthPx: number): TimelineTick[] => {
  if (end <= start || widthPx <= 0) return []
  const step = pickTickStep(end - start, widthPx)
  const minorStep = MINOR_STEPS.get(step) ?? step
  // getTimezoneOffset is in minutes and positive west of UTC.
  const offset = new Date(start).getTimezoneOffset() * MINUTE
  const mod = (time: number, by: number) => (((time - offset) % by) + by) % by
  const first = start - mod(start, minorStep) + minorStep

  const ticks: TimelineTick[] = []
  for (let time = first; time <= end; time += minorStep) {
    if (mod(time, DAY) === 0 || step >= DAY) {
      // Past a day, every labelled tick is a date; below it, only midnights are.
      if (mod(time, step) === 0) {
        ticks.push({ time, level: 'day', label: formatDay(time) })
        continue
      }
    }
    if (mod(time, step) === 0) {
      ticks.push({
        time,
        level: 'major',
        label: step < HOUR ? formatTimeShort(time) : formatHour(time),
      })
      continue
    }
    ticks.push({ time, level: 'minor', label: '' })
  }
  return ticks
}

const formatTimeShort = (time: number) =>
  new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const timeToX = (time: number, start: number, end: number, widthPx: number) =>
  ((time - start) / (end - start)) * widthPx

export const xToTime = (x: number, start: number, end: number, widthPx: number) =>
  start + (clamp(x, 0, widthPx) / widthPx) * (end - start)

type PlaybackPosition = {
  cursor: number
  windowEnd: number
  rangeMs: number
  isLooping: boolean
}

/**
 * Moves the cursor forward by `step` while playing. Reaching the end of the window either loops
 * back to its start, or (without looping) carries on to "now" and then switches to live.
 */
export const advancePlayback = (position: PlaybackPosition, step: number, now: number) => {
  const { cursor, windowEnd, rangeMs, isLooping } = position
  const next = cursor + step

  if (isLooping && next >= Math.min(windowEnd, now)) {
    return { cursor: windowEnd - rangeMs, windowEnd, isLive: false, isPlaying: true }
  }
  if (next >= now) {
    return { cursor: now, windowEnd: now, isLive: true, isPlaying: false }
  }
  // Keep the cursor inside the visible window while it moves.
  const nextWindowEnd = next > windowEnd ? Math.min(now, next + rangeMs / 4) : windowEnd
  return { cursor: next, windowEnd: nextWindowEnd, isLive: false, isPlaying: true }
}

export const formatTimelineDate = (time: number) =>
  new Date(time).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

/** "5:26 AM GMT+5:30": the time and the offset, so a reading is never ambiguous. */
export const formatTimelineTime = (time: number) =>
  new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
  }).format(time)
