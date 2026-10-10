import { Button } from 'ui'

import { NeedsHistory } from './PumpLife'
import type { PumpReport as PumpReportReply, PumpReportWindow } from '@/data/twin/pump-types'

const ROWS: { key: keyof PumpReportWindow; label: string; unit: string; decimals: number }[] = [
  { key: 'running_h', label: 'Running time', unit: 'h', decimals: 1 },
  { key: 'availability_pct', label: 'Availability', unit: '%', decimals: 1 },
  { key: 'energy_kwh', label: 'Energy', unit: 'kWh', decimals: 0 },
  { key: 'volume_ml_est', label: 'Volume (estimated)', unit: 'ML', decimals: 1 },
  { key: 'sec_kwh_per_ml', label: 'Specific energy', unit: 'kWh/ML', decimals: 1 },
  { key: 'starts', label: 'Starts', unit: '', decimals: 0 },
  { key: 'head_m', label: 'Head', unit: 'm', decimals: 1 },
  { key: 'power_vs_kubota_pct', label: 'Power vs maker curve', unit: '%', decimals: 1 },
  { key: 'pump_vib_max', label: 'Pump vibration, max', unit: 'mm/s', decimals: 2 },
  { key: 'motor_vib_max', label: 'Motor vibration, max', unit: 'mm/s', decimals: 2 },
  { key: 'pump_brg_max_c', label: 'Pump bearing, max', unit: '°C', decimals: 0 },
  { key: 'motor_brg_max_c', label: 'Motor bearing, max', unit: '°C', decimals: 0 },
  { key: 'winding_max_c', label: 'Winding, max', unit: '°C', decimals: 0 },
]

const PERIODS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
] as const

type PumpReportProps = {
  reply: PumpReportReply | undefined
  period: 'day' | 'week' | 'month'
  onPeriodChange: (period: 'day' | 'week' | 'month') => void
}

const format = (value: number | string | null | undefined, decimals: number) =>
  typeof value === 'number' ? value.toFixed(decimals) : '-'

/** The period against the one before it: running hours, energy, volume and the maxima. */
export const PumpReport = ({ reply, period, onPeriodChange }: PumpReportProps) => (
  <div className="flex h-full flex-col gap-y-2 overflow-auto p-3">
    <div role="group" aria-label="Report period" className="flex gap-x-1">
      {PERIODS.map((item) => (
        <Button
          key={item.id}
          size="tiny"
          variant={period === item.id ? 'primary' : 'default'}
          aria-pressed={period === item.id}
          onClick={() => onPeriodChange(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
    {(!reply || reply.state !== 'ready') && <NeedsHistory reply={reply} />}
    {reply?.state === 'ready' && !reply.current && (
      <p className="text-sm text-foreground-lighter">
        {reply.error ?? 'No readings in this period.'}
      </p>
    )}
    {reply?.state === 'ready' && reply.current && (
      <>
        <table className="w-full max-w-xl text-sm">
          <thead>
            <tr className="text-left text-xs text-foreground-lighter">
              <th className="py-1 font-normal">Measure</th>
              <th className="py-1 text-right font-normal">This {period}</th>
              <th className="py-1 text-right font-normal">Before</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t">
                <td className="py-1.5">
                  {row.label} <span className="text-xs text-foreground-lighter">{row.unit}</span>
                </td>
                <td className="py-1.5 text-right">
                  {format(reply.current?.[row.key], row.decimals)}
                </td>
                <td className="py-1.5 text-right text-foreground-light">
                  {format(reply.previous?.[row.key], row.decimals)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-foreground-lighter">{reply.note}</p>
      </>
    )}
  </div>
)
