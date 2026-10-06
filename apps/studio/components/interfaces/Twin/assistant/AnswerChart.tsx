import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { AnswerChart as AnswerChartData } from './assistant.types'

export const AnswerChart = ({ chart }: { chart: AnswerChartData }) => {
  const data = chart.labels.map((label, index) => ({
    label,
    ...Object.fromEntries(chart.series.map((item) => [item.name, item.values[index]])),
  }))
  const hasRightAxis = chart.series.some((item) => item.axis === 'right')

  return (
    <div className="my-3 rounded-lg border bg-surface-100 px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-x-3">
        <p className="text-xs uppercase tracking-wide text-foreground-light">{chart.title}</p>
        <div className="flex items-center gap-x-3 text-xs text-foreground-lighter">
          {chart.series.map((item) => (
            <span key={item.name} className="flex items-center gap-x-1">
              <span
                className="inline-block w-3 border-t-2"
                style={{
                  borderColor: item.color,
                  borderTopStyle: item.isDashed ? 'dashed' : 'solid',
                }}
              />
              {item.name}
            </span>
          ))}
        </div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="currentColor" className="text-border" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                domain={['auto', 'auto']}
              />
            )}
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background-overlay-default))',
                border: '1px solid hsl(var(--border-default))',
                fontSize: 12,
              }}
            />
            {chart.series.map((item) => (
              <Line
                key={item.name}
                yAxisId={item.axis ?? 'left'}
                type="monotone"
                dataKey={item.name}
                stroke={item.color}
                strokeWidth={1.8}
                strokeDasharray={item.isDashed ? '5 4' : undefined}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
