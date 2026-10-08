import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from 'ui'

import { clamp, getTicks, timeToX, xToTime } from './Timeline.utils'

type TimelineScaleProps = {
  start: number
  end: number
  cursor: number
  isLive: boolean
  onCursorChange: (time: number) => void
  /** Called when the needle is dropped next to the "now" marker, so it can snap to live. */
  onGoLive?: () => void
  className?: string
}

/** Dropping the needle this close (in px) to the "now" marker snaps it onto it. */
const SNAP_TO_NOW_PX = 8

export const TimelineScale = ({
  start,
  end,
  cursor,
  isLive,
  onCursorChange,
  onGoLive,
  className,
}: TimelineScaleProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const element = trackRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const ticks = useMemo(() => getTicks(start, end, width), [start, end, width])
  const cursorX = clamp(timeToX(cursor, start, end, width), 0, width)
  // The "now" marker stays where live is while the needle is moved into the past.
  const rawNowX = timeToX(Date.now(), start, end, width)
  // A window that stopped following the clock a few seconds ago still shows "now" at its edge.
  const isNowVisible = rawNowX >= 0 && rawNowX <= width + SNAP_TO_NOW_PX
  const nowX = clamp(rawNowX, 0, width)

  const timeFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return xToTime(event.clientX - rect.left, start, end, width)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    onCursorChange(timeFromEvent(event))
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isDragging) onCursorChange(timeFromEvent(event))
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    if (isNowVisible && !isLive && Math.abs(cursorX - nowX) <= SNAP_TO_NOW_PX) onGoLive?.()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = (end - start) / 100
    if (event.key === 'ArrowLeft') onCursorChange(cursor - step)
    else if (event.key === 'ArrowRight') onCursorChange(cursor + step)
    else return
    event.preventDefault()
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Timeline"
      aria-valuemin={start}
      aria-valuemax={end}
      aria-valuenow={cursor}
      aria-valuetext={new Date(cursor).toLocaleString()}
      className={cn(
        'relative h-12 cursor-pointer touch-none select-none overflow-hidden focus-visible:outline-none',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setIsDragging(false)}
      onKeyDown={handleKeyDown}
    >
      {ticks.map((tick) => {
        const x = timeToX(tick.time, start, end, width)
        return (
          <div key={tick.time} className="absolute top-0 h-full" style={{ left: x }}>
            <div
              className={cn(
                'bg-foreground-muted',
                tick.level === 'day' && 'h-6 w-0.5 bg-foreground-light',
                tick.level === 'major' && 'h-3.5 w-px',
                tick.level === 'minor' && 'h-2 w-px opacity-60'
              )}
            />
            {tick.label && (
              <span
                className={cn(
                  'absolute left-1 top-6 whitespace-nowrap text-xs',
                  tick.level === 'day' ? 'text-foreground-light' : 'text-foreground-lighter'
                )}
              >
                {tick.label}
              </span>
            )}
          </div>
        )
      })}
      {isNowVisible && (
        <div
          className="pointer-events-none absolute bottom-0"
          style={{ left: nowX, transform: 'translateX(-50%)' }}
          title="Now"
        >
          <div className="h-0 w-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-destructive" />
        </div>
      )}
      <div
        className="pointer-events-none absolute top-0 h-full"
        style={{ left: cursorX, transform: 'translateX(-50%)' }}
      >
        <div className="mx-auto h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-brand" />
        <div className="mx-auto h-[calc(100%-8px)] w-0.5 bg-brand" />
      </div>
    </div>
  )
}
