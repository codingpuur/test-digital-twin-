import { Badge, cn } from 'ui'

import type { PumpFmeaReply, PumpFmeaRow } from '@/data/twin/pump-types'

const COLUMNS: {
  key: string
  label: string
  unit: string
  get: (row: PumpFmeaRow) => number | null
  decimals: number
}[] = [
  { key: 'd_flow_pct', label: 'Flow', unit: '%', get: (row) => row.d_flow_pct, decimals: 1 },
  { key: 'd_head_pct', label: 'Head', unit: '%', get: (row) => row.d_head_pct, decimals: 1 },
  { key: 'd_power_pct', label: 'Power', unit: '%', get: (row) => row.d_power_pct, decimals: 1 },
  { key: 'vib_pump', label: 'Pump vib.', unit: 'mm/s', get: (row) => row.vib_pump, decimals: 1 },
  { key: 'vib_motor', label: 'Motor vib.', unit: 'mm/s', get: (row) => row.vib_motor, decimals: 1 },
  { key: 'brg_T', label: 'Bearing', unit: '°C', get: (row) => row.brg_T, decimals: 0 },
  { key: 'seal_T', label: 'Seal', unit: '°C', get: (row) => row.seal_T, decimals: 0 },
  { key: 'winding_T', label: 'Winding', unit: '°C', get: (row) => row.winding_T, decimals: 0 },
]

const cellClass = (row: PumpFmeaRow, key: string) => {
  if (row.big[key]) return 'font-medium text-destructive'
  if (row.changed[key]) return 'text-warning'
  return 'text-foreground-light'
}

/** What each failure mode of the FMEA workbook would look like on today's reading, as the twin simulated it. */
export const PumpFmea = ({ reply }: { reply: PumpFmeaReply | undefined }) => {
  if (!reply) return <p className="p-3 text-sm text-foreground-lighter">Loading…</p>
  if (reply.state === 'computing') {
    return (
      <p className="p-3 text-sm text-foreground-lighter">
        The twin is simulating every failure mode on today&apos;s reading. This takes a few seconds.
      </p>
    )
  }
  if (reply.state !== 'ready')
    return <p className="p-3 text-sm text-foreground-lighter">{reply.error}</p>

  const { fm } = reply
  const attention = (fm.insights ?? []).filter((item) => item.level !== 'info')
  return (
    <div className="flex h-full flex-col gap-y-3 overflow-auto p-3">
      <p className="text-xs text-foreground-lighter">
        {fm.n} failure modes simulated on the reading of {reply.timestamp}
        {reply.refreshing ? ' · refreshing' : ''}. Amber differs from today, red differs a lot.
      </p>
      {attention.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-y-0.5 rounded-md border bg-surface-100 p-2.5 text-sm"
        >
          <Badge variant={item.level === 'act' ? 'destructive' : 'warning'} className="self-start">
            {item.area}
          </Badge>
          {item.finding}
        </div>
      ))}
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="text-left text-xs text-foreground-lighter">
            <th className="py-1 font-normal">Failure mode</th>
            {COLUMNS.map((column) => (
              <th key={column.key} className="py-1 text-right font-normal">
                {column.label} <span className="text-foreground-muted">{column.unit}</span>
              </th>
            ))}
            <th className="py-1 text-right font-normal">Cavitation</th>
            <th className="py-1 text-right font-normal">Health</th>
            <th className="py-1 pl-3 font-normal">Seen by</th>
          </tr>
        </thead>
        <tbody>
          {fm.groups.map((group) => (
            <GroupRows key={group.group} group={group} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const GroupRows = ({ group }: { group: { group: string; rows: PumpFmeaRow[] } }) => (
  <>
    <tr>
      <td
        colSpan={COLUMNS.length + 4}
        className="pb-1 pt-3 text-xs uppercase tracking-wide text-foreground-light"
      >
        {group.group}
      </td>
    </tr>
    {group.rows.map((row) => (
      <tr key={row.failure_mode} className="border-t align-top" title={row.simulation}>
        <td className="py-1.5 pr-2">{row.failure_mode}</td>
        {COLUMNS.map((column) => {
          const value = column.get(row)
          const isDelta = column.key.startsWith('d_')
          return (
            <td key={column.key} className={cn('py-1.5 text-right', cellClass(row, column.key))}>
              {value === null
                ? '-'
                : `${isDelta && value > 0 ? '+' : ''}${value.toFixed(column.decimals)}`}
            </td>
          )
        })}
        <td className={cn('py-1.5 text-right', cellClass(row, 'cavitation'))}>{row.cav_txt}</td>
        <td className="py-1.5 text-right">
          {row.health_was !== null && (
            <span
              className={cn(
                row.health_delta < -0.05 ? 'text-destructive' : 'text-foreground-light'
              )}
            >
              {Math.round(row.health_was * 100)} →{' '}
              {Math.round((row.health_was + row.health_delta) * 100)}
            </span>
          )}
        </td>
        <td className="py-1.5 pl-3 text-xs text-foreground-lighter">{row.seen_by}</td>
      </tr>
    ))}
  </>
)
