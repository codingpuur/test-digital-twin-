import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts'

import { NeedsHistory } from './PumpLife'
import type { PumpHistory as PumpHistoryReply } from '@/data/twin/pump-types'

const SERIES = [
  { key: 'Q', label: 'Flow m³/h (estimated)', color: '#3ecf8e' },
  { key: 'H', label: 'Head m', color: '#3b82f6' },
  { key: 'vib', label: 'Pump vibration mm/s', color: '#e5a23b' },
  { key: 'Tb', label: 'Bearing °C', color: '#e5484d' },
  { key: 'Tw', label: 'Winding °C', color: '#8b95a5' },
] as const

/** The last weeks at six-hour steps, one small chart per signal. */
export const PumpHistory = ({ reply }: { reply: PumpHistoryReply | undefined }) => {
  if (!reply || reply.state !== 'ready') return <NeedsHistory reply={reply} />
  const data = reply.t.map((t, i) => ({
    t: t.slice(5, 10),
    Q: reply.Q[i],
    H: reply.H[i],
    vib: reply.vib[i],
    Tb: reply.Tb[i],
    Tw: reply.Tw[i],
  }))
  return (
    <div className="flex h-full flex-wrap overflow-auto">
      {SERIES.map((series) => (
        <div key={series.key} className="flex h-40 min-w-[260px] flex-1 flex-col p-3">
          <h4 className="text-xs uppercase tracking-wide text-foreground-light">{series.label}</h4>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="currentColor" className="text-border" strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Line
                dataKey={series.key}
                stroke={series.color}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
