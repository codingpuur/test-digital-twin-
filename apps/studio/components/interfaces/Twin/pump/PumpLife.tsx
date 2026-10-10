import { Badge, cn } from 'ui'

import type { PumpLife as PumpLifeReply } from '@/data/twin/pump-types'

export const NeedsHistory = ({
  reply,
}: {
  reply: { state: string; error?: string; status?: string | null } | undefined
}) => {
  if (!reply) return <p className="p-3 text-sm text-foreground-lighter">Loading…</p>
  if (reply.state === 'preparing') {
    return (
      <p className="p-3 text-sm text-foreground-lighter">
        The twin is reading the history{reply.status ? ` (${reply.status})` : ''}. This takes a few
        minutes the first time.
      </p>
    )
  }
  return <p className="p-3 text-sm text-foreground-lighter">{reply.error ?? 'Not available.'}</p>
}

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'destructive'> = {
  ok: 'default',
  watch: 'warning',
  act: 'destructive',
}

/** How the pump's parts are wearing: indicator against its limit, the trend, and the likely causes. */
export const PumpLife = ({ reply }: { reply: PumpLifeReply | undefined }) => {
  if (!reply || reply.state !== 'ready') return <NeedsHistory reply={reply} />
  return (
    <div className="flex h-full flex-col gap-y-3 overflow-auto p-3">
      <p className="text-xs text-foreground-lighter">
        {reply.running_hours.toLocaleString()} running hours since {reply.data_from.slice(0, 10)} ·
        duty {reply.duty_pct} %
      </p>
      {reply.hypotheses.map((item) => (
        <div
          key={item.name}
          className="flex flex-col gap-y-0.5 rounded-md border bg-surface-100 p-2.5 text-sm"
        >
          <span className="flex items-center gap-x-2">
            {item.name}
            <Badge variant={item.confidence === 'likely' ? 'warning' : 'default'}>
              {item.confidence}
            </Badge>
          </span>
          <span className="text-xs text-foreground-light">{item.evidence.join('; ')}</span>
          <span className="text-xs text-foreground-lighter">{item.action}</span>
        </div>
      ))}
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs text-foreground-lighter">
            <th className="py-1 font-normal">Part</th>
            <th className="py-1 font-normal">Indicator</th>
            <th className="py-1 text-right font-normal">Now</th>
            <th className="py-1 text-right font-normal">Limit</th>
            <th className="py-1 pl-3 font-normal">Trend</th>
          </tr>
        </thead>
        <tbody>
          {reply.components.map((item) => (
            <tr key={`${item.component}-${item.indicator}`} className="border-t">
              <td className="py-1.5">{item.component}</td>
              <td className="py-1.5 text-foreground-light">{item.indicator}</td>
              <td className={cn('py-1.5 text-right', item.status === 'act' && 'text-destructive')}>
                {item.now === null ? '-' : `${item.now} ${item.unit}`}
                {item.status && item.status !== 'ok' && (
                  <Badge className="ml-2" variant={STATUS_VARIANT[item.status] ?? 'default'}>
                    {item.status}
                  </Badge>
                )}
              </td>
              <td className="py-1.5 text-right text-foreground-light">{item.limit ?? '-'}</td>
              <td className="py-1.5 pl-3 text-xs text-foreground-light">
                {item.trend?.text ?? item.trend?.kind ?? ''}
                {item.trend?.per_month !== undefined &&
                  ` (${item.trend.per_month.toFixed(2)} ${item.unit}/month)`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
