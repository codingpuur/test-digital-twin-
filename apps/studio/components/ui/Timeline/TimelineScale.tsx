import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from 'ui'

import { clamp, getTicks, timeToX, xToTime } from './Timeline.utils'

type TimelineScaleProps = {
  start: number
  end: number
  cursor: number
  isLive: boolean
  onCursorChange: (time: number) => void
  className?: string
}

export const TimelineScale = ({
  start,
  end,
  cursor,
  isLive,
  onCursorChange,
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
      onPointerUp={() => setIsDragging(false)}
      onPointerCancel={() => setIsDragging(false)}
      onKeyDown={handleKeyDown}
    >
      {ticks.map((tick) => {
        const x = timeToX(tick.time, start, end, width)
        return (
          <div key={tick.time} className="absolute top-0 h-full" style={{ left: x }}>
            <div className={cn('w-px bg-foreground-muted', tick.isMajor ? 'h-6' : 'h-3')} />
            <span className="absolute left-1 top-6 whitespace-nowrap text-xs text-foreground-lighter">
              {tick.label}
            </span>
          </div>
        )
      })}
      <div
        className="pointer-events-none absolute top-0 h-full"
        style={{ left: cursorX, transform: 'translateX(-50%)' }}
      >
        <div className="mx-auto h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-brand" />
        <div className={cn('mx-auto h-8 w-0.5', isLive ? 'bg-destructive' : 'bg-brand')} />
      </div>
    </div>
  )
}
