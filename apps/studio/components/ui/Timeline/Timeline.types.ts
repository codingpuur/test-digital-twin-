export type TimelineSpeed = 1 | 2 | 4 | 8

export const TIMELINE_SPEEDS: TimelineSpeed[] = [1, 2, 4, 8]

export type TimelineRangeOption = { label: string; ms: number }

const HOUR = 3_600_000
const DAY = 24 * HOUR

export const TIMELINE_RANGE_OPTIONS: TimelineRangeOption[] = [
  { label: 'Last 24 hours', ms: DAY },
  { label: 'Last 3 days', ms: 3 * DAY },
  { label: 'Last 7 days', ms: 7 * DAY },
  { label: 'Last 30 days', ms: 30 * DAY },
]

export const MIN_TIMELINE_RANGE_MS = HOUR
export const MAX_TIMELINE_RANGE_MS = 30 * DAY

/** Playing at 1x crosses the visible range in this many seconds. */
export const PLAYBACK_SECONDS_PER_RANGE = 60

export type TimelineTickLevel = 'day' | 'major' | 'minor'

export type TimelineTick = {
  time: number
  /** day: a local midnight (tall, dated); major: a labelled step; minor: a small unlabelled mark. */
  level: TimelineTickLevel
  label: string
}
