import { useCallback, useEffect, useRef, useState } from 'react'

import {
  PLAYBACK_SECONDS_PER_RANGE,
  TIMELINE_RANGE_OPTIONS,
  type TimelineSpeed,
} from './Timeline.types'
import { advancePlayback, clamp, clampRange } from './Timeline.utils'

type TimelineState = {
  cursor: number
  windowEnd: number
  rangeMs: number
  isLive: boolean
  isPlaying: boolean
  isLooping: boolean
  speed: TimelineSpeed
}

type UseTimelineOptions = {
  defaultRangeMs?: number
  /** Override the clock, e.g. in tests. */
  getNow?: () => number
}

/**
 * State for a scrubbable time axis. Domain-agnostic: it only knows about timestamps, a visible
 * window, a cursor, live mode and playback. Feed `cursor` to anything that depends on time.
 */
export const useTimeline = ({
  defaultRangeMs = TIMELINE_RANGE_OPTIONS[1].ms,
  getNow = Date.now,
}: UseTimelineOptions = {}) => {
  const getNowRef = useRef(getNow)
  getNowRef.current = getNow

  const [state, setState] = useState<TimelineState>(() => {
    const now = getNow()
    return {
      cursor: now,
      windowEnd: now,
      rangeMs: clampRange(defaultRangeMs),
      isLive: true,
      isPlaying: false,
      isLooping: false,
      speed: 1,
    }
  })

  const { isLive, isPlaying } = state

  // Live: follow the wall clock once a second.
  useEffect(() => {
    if (!isLive || isPlaying) return
    const timer = setInterval(() => {
      const now = getNowRef.current()
      setState((previous) => ({ ...previous, cursor: now, windowEnd: now }))
    }, 1000)
    return () => clearInterval(timer)
  }, [isLive, isPlaying])

  // Playback: advance the cursor every frame. At the end it loops (if on) or returns to live.
  useEffect(() => {
    if (!isPlaying) return
    let frame = 0
    let last = performance.now()

    const tick = (timestamp: number) => {
      const elapsedSeconds = (timestamp - last) / 1000
      last = timestamp
      setState((previous) => {
        const now = getNowRef.current()
        // At 1x the cursor crosses the visible range in PLAYBACK_SECONDS_PER_RANGE seconds.
        const step =
          (previous.rangeMs / PLAYBACK_SECONDS_PER_RANGE) * previous.speed * elapsedSeconds
        return { ...previous, ...advancePlayback(previous, step, now) }
      })
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying])

  const setCursor = useCallback((time: number) => {
    setState((previous) => {
      const now = getNowRef.current()
      const cursor = Math.min(time, now)
      const windowStart = previous.windowEnd - previous.rangeMs
      let windowEnd = previous.windowEnd
      if (cursor > windowEnd) windowEnd = Math.min(now, cursor + previous.rangeMs / 4)
      if (cursor < windowStart) windowEnd = cursor + previous.rangeMs * 0.75
      return { ...previous, cursor, windowEnd, isLive: false }
    })
  }, [])

  const goLive = useCallback(() => {
    const now = getNowRef.current()
    setState((previous) => ({
      ...previous,
      cursor: now,
      windowEnd: now,
      isLive: true,
      isPlaying: false,
    }))
  }, [])

  const togglePlay = useCallback(() => {
    setState((previous) => ({ ...previous, isPlaying: !previous.isPlaying, isLive: false }))
  }, [])

  const toggleLoop = useCallback(() => {
    setState((previous) => ({ ...previous, isLooping: !previous.isLooping }))
  }, [])

  const setSpeed = useCallback((speed: TimelineSpeed) => {
    setState((previous) => ({ ...previous, speed }))
  }, [])

  const setRangeMs = useCallback((rangeMs: number) => {
    setState((previous) => ({ ...previous, rangeMs: clampRange(rangeMs) }))
  }, [])

  const zoom = useCallback((factor: number) => {
    setState((previous) => ({ ...previous, rangeMs: clampRange(previous.rangeMs * factor) }))
  }, [])

  /** Slide the visible window by half a range. Leaves live mode; the cursor stays where it is. */
  const pan = useCallback((direction: -1 | 1) => {
    setState((previous) => {
      const now = getNowRef.current()
      const windowEnd = clamp(
        previous.windowEnd + (direction * previous.rangeMs) / 2,
        previous.rangeMs / 2,
        now
      )
      return { ...previous, windowEnd, isLive: previous.isLive && windowEnd >= now }
    })
  }, [])

  return {
    cursor: state.cursor,
    isLive: state.isLive,
    isPlaying: state.isPlaying,
    isLooping: state.isLooping,
    speed: state.speed,
    rangeMs: state.rangeMs,
    windowStart: state.windowEnd - state.rangeMs,
    windowEnd: state.windowEnd,
    setCursor,
    goLive,
    togglePlay,
    toggleLoop,
    setSpeed,
    setRangeMs,
    zoom,
    pan,
  }
}

export type TimelineController = ReturnType<typeof useTimeline>
