import { ChevronLeft, ChevronRight, Minimize2, Minus, Pause, Play, Plus } from 'lucide-react'
import { Button, cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'ui'

import { TIMELINE_RANGE_OPTIONS, TIMELINE_SPEEDS, type TimelineSpeed } from './Timeline.types'
import { TimelineScale } from './TimelineScale'
import type { TimelineController } from './useTimeline'

type TimelineBarProps = {
  timeline: TimelineController
  className?: string
  /** When given, a button folds the bar down to a `TimelinePill`. */
  onCollapse?: () => void
}

const formatCursor = (time: number) =>
  new Date(time).toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/** Date, live toggle, scrubber, range, zoom and playback controls for a `useTimeline` controller. */
export const TimelineBar = ({ timeline, className, onCollapse }: TimelineBarProps) => {
  const {
    cursor,
    isLive,
    isPlaying,
    speed,
    rangeMs,
    windowStart,
    windowEnd,
    setCursor,
    goLive,
    togglePlay,
    setSpeed,
    setRangeMs,
    zoom,
    pan,
  } = timeline

  const rangeValue = TIMELINE_RANGE_OPTIONS.find((option) => option.ms === rangeMs)?.ms

  return (
    <div className={cn('flex flex-col gap-y-1 border-b bg-surface-100 px-4 pt-2', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {onCollapse && (
          <Button
            size="tiny"
            variant="text"
            aria-label="Close timeline"
            icon={<Minimize2 size={14} />}
            onClick={onCollapse}
          />
        )}
        <span className="text-sm">{formatCursor(cursor)}</span>
        <Button
          size="tiny"
          variant={isLive ? 'primary' : 'default'}
          onClick={goLive}
          aria-pressed={isLive}
        >
          <span
            className={cn(
              'mr-1.5 inline-block size-2 rounded-full',
              isLive ? 'bg-destructive' : 'bg-foreground-muted'
            )}
          />
          Live
        </Button>
        <div className="flex-1" />
        <Select
          value={rangeValue ? String(rangeValue) : undefined}
          onValueChange={(value) => setRangeMs(Number(value))}
        >
          <SelectTrigger className="w-40" size="tiny">
            <SelectValue placeholder="Custom range" />
          </SelectTrigger>
          <SelectContent>
            {TIMELINE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.ms} value={String(option.ms)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="tiny"
          variant="text"
          aria-label="Zoom out"
          icon={<Minus size={14} />}
          onClick={() => zoom(2)}
        />
        <Button
          size="tiny"
          variant="text"
          aria-label="Zoom in"
          icon={<Plus size={14} />}
          onClick={() => zoom(0.5)}
        />
        <Button
          size="tiny"
          variant="text"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          icon={isPlaying ? <Pause size={14} /> : <Play size={14} />}
          onClick={togglePlay}
        />
        <Select
          value={String(speed)}
          onValueChange={(value) => setSpeed(Number(value) as TimelineSpeed)}
        >
          <SelectTrigger className="w-16" size="tiny" aria-label="Playback speed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMELINE_SPEEDS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-x-2">
        <Button
          size="tiny"
          variant="outline"
          aria-label="Earlier"
          icon={<ChevronLeft size={14} />}
          onClick={() => pan(-1)}
        />
        <TimelineScale
          className="flex-1"
          start={windowStart}
          end={windowEnd}
          cursor={cursor}
          isLive={isLive}
          onCursorChange={setCursor}
        />
        <Button
          size="tiny"
          variant="outline"
          aria-label="Later"
          icon={<ChevronRight size={14} />}
          onClick={() => pan(1)}
        />
      </div>
    </div>
  )
}
