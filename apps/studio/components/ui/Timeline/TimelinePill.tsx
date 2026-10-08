import { Calendar, Maximize2 } from 'lucide-react'
import { cn } from 'ui'

import { formatTimelineDate, formatTimelineTime } from './Timeline.utils'
import type { TimelineController } from './useTimeline'

type TimelinePillProps = {
  timeline: Pick<TimelineController, 'cursor' | 'isLive' | 'goLive'>
  onExpand: () => void
  className?: string
}

/**
 * The timeline folded down to one line over a view: faint until hovered, and the expand button
 * opens the full `TimelineBar`.
 */
export const TimelinePill = ({ timeline, onExpand, className }: TimelinePillProps) => {
  const { cursor, isLive, goLive } = timeline

  return (
    <div
      className={cn(
        'flex max-w-full items-center gap-x-3 rounded-lg border bg-surface-100/80 px-2.5 py-1.5 text-sm shadow-md backdrop-blur',
        'opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100',
        className
      )}
    >
      <button
        type="button"
        aria-label="Open timeline"
        title="Open timeline"
        onClick={onExpand}
        className="rounded-sm p-0.5 text-foreground-light hover:text-foreground"
      >
        <Maximize2 size={16} />
      </button>
      <span className="h-5 w-px shrink-0 bg-border" />
      <span className="flex min-w-0 items-center gap-x-2 truncate">
        <Calendar size={16} className="shrink-0 text-foreground-light" />
        <span className="truncate text-foreground-light">{formatTimelineDate(cursor)}</span>
        <span className="shrink-0 font-medium">{formatTimelineTime(cursor)}</span>
      </span>
      <span className="h-5 w-px shrink-0 bg-border" />
      <button
        type="button"
        aria-pressed={isLive}
        aria-label={isLive ? 'Live' : 'Go live'}
        title={isLive ? 'Showing live data' : 'Go back to live data'}
        onClick={goLive}
        className={cn(
          'flex shrink-0 items-center gap-x-1.5 rounded-md border px-2 py-0.5 text-xs',
          isLive ? 'text-foreground' : 'text-foreground-lighter hover:text-foreground'
        )}
      >
        <span
          className={cn(
            'inline-block size-2 rounded-full',
            isLive ? 'bg-destructive' : 'bg-foreground-muted'
          )}
        />
        Live
      </button>
    </div>
  )
}
