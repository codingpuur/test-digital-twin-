import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Badge, cn } from 'ui'

import type { PumpKpiDelta, PumpWhatIfResult } from '@/data/twin/pump-types'

const format = (value: number, decimals: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const DIRECTION_CLASS: Record<PumpKpiDelta['direction'], string> = {
  improved: 'text-brand',
  worse: 'text-destructive',
  changed: 'text-foreground-light',
  same: 'text-foreground-lighter',
}

const DeltaIcon = ({ delta }: { delta: PumpKpiDelta }) => {
  if (delta.direction === 'same') return <Minus size={12} />
  return delta.delta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />
}

export const PumpResults = ({ result }: { result: PumpWhatIfResult }) => {
  const findings = Object.values(result.scenario.insights)
    .flat()
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .filter((item) => item.level !== 'info')

  return (
    <div className="flex h-full min-h-0 divide-x overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-y-2 overflow-y-auto p-3">
        <h4 className="text-xs uppercase tracking-wide text-foreground-light">
          Scenario against now
          <span className="ml-2 normal-case text-foreground-lighter">
            solved in {Math.round(result.ms)} ms
          </span>
        </h4>
        {result.notes.map((note) => (
          <p key={note} className="text-xs text-foreground-lighter">
            {note}
          </p>
        ))}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-foreground-lighter">
              <th className="py-1 font-normal">Measure</th>
              <th className="py-1 text-right font-normal">Now</th>
              <th className="py-1 text-right font-normal">Scenario</th>
              <th className="py-1 text-right font-normal">Change</th>
            </tr>
          </thead>
          <tbody>
            {result.view.deltas.map((delta) => (
              <tr key={delta.key} className="border-t">
                <td className="py-1.5">
                  {delta.label}
                  <span className="ml-1 text-xs text-foreground-lighter">{delta.unit}</span>
                </td>
                <td className="py-1.5 text-right text-foreground-light">
                  {format(delta.base, delta.decimals)}
                </td>
                <td className="py-1.5 text-right">{format(delta.value, delta.decimals)}</td>
                <td className={cn('py-1.5 text-right', DIRECTION_CLASS[delta.direction])}>
                  <span className="inline-flex items-center gap-x-1">
                    <DeltaIcon delta={delta} />
                    {format(Math.abs(delta.delta), delta.decimals)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-y-2 overflow-y-auto p-3">
        <h4 className="text-xs uppercase tracking-wide text-foreground-light">Findings</h4>
        {findings.length === 0 && (
          <p className="text-sm text-foreground-lighter">
            Nothing needs attention in this scenario.
          </p>
        )}
        {findings.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-y-1 rounded-md border bg-surface-100 p-2.5"
          >
            <div className="flex items-center gap-x-2">
              <Badge variant={item.level === 'act' ? 'destructive' : 'warning'}>
                {item.level === 'act' ? 'Act' : 'Watch'}
              </Badge>
              <span className="text-xs text-foreground-lighter">{item.area}</span>
            </div>
            <p className="text-sm">{item.finding}</p>
            <p className="text-xs text-foreground-light">{item.recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
