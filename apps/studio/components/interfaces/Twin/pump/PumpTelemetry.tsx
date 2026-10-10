import { Badge } from 'ui'

import type { PumpTelemetryLatest } from '@/data/twin/pump-types'

const BADGE = {
  ok: { variant: 'default', label: 'Normal' },
  watch: { variant: 'warning', label: 'Watch' },
  act: { variant: 'destructive', label: 'Limit' },
} as const

/** The newest reading of every channel. The unit, limit and status of each come from the backend. */
export const PumpTelemetry = ({ latest }: { latest: PumpTelemetryLatest | undefined }) => {
  if (!latest) return <p className="p-3 text-sm text-foreground-lighter">Waiting for readings…</p>

  const groups = new Map<string, PumpTelemetryLatest['readings']>()
  latest.readings.forEach((reading) =>
    groups.set(reading.group, [...(groups.get(reading.group) ?? []), reading])
  )

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <p className="px-3 pt-2 text-xs text-foreground-lighter">
        Pump {latest.pump} · {latest.source} · {Math.round(latest.age_s)} s ago
        {latest.poll_error ? ` · ${latest.poll_error}` : ''}
      </p>
      <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
        {[...groups.entries()].map(([group, readings]) => (
          <div key={group} className="flex flex-col gap-y-1">
            <h4 className="text-xs uppercase tracking-wide text-foreground-light">{group}</h4>
            {readings.map((reading) => (
              <div
                key={reading.channel}
                className="flex items-center justify-between gap-x-2 rounded-md border bg-surface-100 px-2.5 py-1.5 text-sm"
              >
                <span className="truncate">{reading.label}</span>
                <span className="flex flex-none items-center gap-x-2">
                  {reading.value === null
                    ? '-'
                    : `${reading.value.toFixed(reading.decimals)} ${reading.unit}`}
                  {reading.status && (
                    <Badge variant={BADGE[reading.status].variant}>
                      {BADGE[reading.status].label}
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
