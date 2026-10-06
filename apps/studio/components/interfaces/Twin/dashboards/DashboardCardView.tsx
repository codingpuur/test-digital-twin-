import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge, cn } from 'ui'

import {
  formatStreamValue,
  getStreamStatus,
  useDashboardStreams,
  type DashboardStream,
} from './dashboard-streams'
import type { DashboardCard, DateRangeId } from './dashboards.types'

const LINE_COLORS = ['#3ecf8e', '#4c9be8', '#e5a23b']

type DashboardCardViewProps = {
  card: DashboardCard
  rangeId: DateRangeId
  now: number
  isSample?: boolean
}

const resolveStreams = (card: DashboardCard, catalog: DashboardStream[]) =>
  card.config.streamIds
    .map((id) => catalog.find((stream) => stream.id === id))
    .filter((stream): stream is DashboardStream => !!stream)

const CardTitle = ({ children }: { children: string }) => (
  <p className="text-xs uppercase tracking-wide text-foreground-light">{children}</p>
)

const BigValue = ({
  title,
  subtitle,
  value,
  unit,
}: {
  title: string
  subtitle: string
  value: string
  unit: string
}) => (
  <div className="flex h-full flex-col items-center justify-center gap-y-1 text-center">
    <CardTitle>{title}</CardTitle>
    <p className="text-xs text-foreground-lighter">{subtitle}</p>
    <p className="text-4xl">
      {value}
      <span className="ml-1 text-lg text-foreground-light">{unit}</span>
    </p>
  </div>
)

const Gauge = ({ stream, value }: { stream: DashboardStream; value: number | null }) => {
  const ratio = ((value ?? stream.min) - stream.min) / (stream.max - stream.min)
  const angle = Math.PI * Math.min(1, Math.max(0, ratio))
  const radius = 70
  const endX = 90 - radius * Math.cos(angle)
  const endY = 90 - radius * Math.sin(angle)
  const isWarning = getStreamStatus(stream, value) === 'Warning'

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-1">
      <CardTitle>{stream.name}</CardTitle>
      <p className="text-xs text-foreground-lighter">{stream.asset}</p>
      <svg viewBox="0 0 180 100" className="w-48">
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="rgba(128,128,128,0.3)"
          strokeWidth="12"
        />
        <path
          d={`M 20 90 A 70 70 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke={isWarning ? '#e5a23b' : '#3ecf8e'}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <text x="90" y="86" textAnchor="middle" className="fill-foreground text-[22px]">
          {formatStreamValue(stream, value)}
          <tspan className="fill-foreground-light text-[11px]"> {stream.unit}</tspan>
        </text>
      </svg>
      <p className="text-xs italic text-foreground-lighter">just now</p>
    </div>
  )
}

export const DashboardCardView = ({ card, rangeId, now, isSample }: DashboardCardViewProps) => {
  const catalog = useDashboardStreams()
  const streams = resolveStreams(card, catalog.all)
  const primary = streams[0]

  const series = useMemo(() => {
    if (card.type !== 'value-over-time') return []
    // One row per timestamp across all streams, so recharts can draw several lines (live streams
    // do not share timestamps).
    const rows = new Map<number, Record<string, number>>()
    streams.forEach((stream) =>
      stream.series(rangeId, now).forEach((point) => {
        rows.set(point.time, { ...rows.get(point.time), [stream.id]: point.value })
      })
    )
    return [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .map(([time, values]) => ({ time, ...values }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.type, card.config.streamIds.join(','), rangeId, Math.floor(now / 60_000), catalog.live])

  // Real streams often cover only hours, so label the axis by time rather than by day.
  const spanMs = series.length > 1 ? series[series.length - 1].time - series[0].time : 0
  const isShortSpan = rangeId === '24h' || spanMs <= 48 * 3_600_000

  if (card.type === 'custom-text') {
    return (
      <div className="flex h-full flex-col gap-y-2">
        <CardTitle>{card.config.title || 'Custom text'}</CardTitle>
        <p className="whitespace-pre-wrap text-sm text-foreground-light">
          {card.config.text || (isSample ? 'Use this card to show notes for your team.' : '')}
        </p>
      </div>
    )
  }

  if (!primary) {
    return <p className="m-auto text-sm text-foreground-lighter">Select a stream</p>
  }

  if (card.type === 'last-value') return <Gauge stream={primary} value={primary.valueAt(now)} />

  if (card.type === 'parameter-value') {
    return (
      <BigValue
        title={primary.name}
        subtitle={primary.asset}
        value={formatStreamValue(primary, primary.valueAt(now))}
        unit={primary.unit}
      />
    )
  }

  if (card.type === 'aggregate-value') {
    const points = primary.series(rangeId, now)
    const average =
      points.length === 0
        ? null
        : points.reduce((total, point) => total + point.value, 0) / points.length
    return (
      <BigValue
        title={`${primary.name} (average)`}
        subtitle={
          rangeId === '24h' ? 'Last 24 hours' : rangeId === '7d' ? 'Last 7 days' : 'Last 30 days'
        }
        value={formatStreamValue(primary, average)}
        unit={primary.unit}
      />
    )
  }

  if (card.type === 'parameters-summary') {
    return (
      <div className="flex h-full flex-col gap-y-2">
        <CardTitle>Parameters</CardTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-foreground-lighter">
              <th className="py-1 font-normal">Name</th>
              <th className="py-1 font-normal">Value</th>
              <th className="py-1 font-normal">Asset</th>
              <th className="py-1 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) => {
              const value = stream.valueAt(now)
              const status = getStreamStatus(stream, value)
              return (
                <tr key={stream.id} className="border-t">
                  <td className="py-1.5">{stream.name}</td>
                  <td className={cn('py-1.5', status === 'Warning' && 'text-warning')}>
                    {formatStreamValue(stream, value)} {stream.unit}
                  </td>
                  <td className="py-1.5 text-foreground-light">{stream.asset}</td>
                  <td className="py-1.5">
                    <Badge variant={status === 'Warning' ? 'warning' : 'default'}>{status}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-48 flex-col gap-y-2">
      <CardTitle>{streams.map((stream) => `${stream.name} (${stream.unit})`).join(', ')}</CardTitle>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="currentColor" className="text-border" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              tick={{ fontSize: 10 }}
              tickFormatter={(time: number) =>
                new Date(time).toLocaleString(
                  [],
                  isShortSpan
                    ? { hour: '2-digit', minute: '2-digit' }
                    : { month: 'short', day: 'numeric' }
                )
              }
            />
            {streams.map((stream, index) => (
              <YAxis
                key={stream.id}
                yAxisId={stream.id}
                orientation={index === 0 ? 'left' : 'right'}
                hide={index > 1}
                tick={{ fontSize: 10, fill: LINE_COLORS[index % LINE_COLORS.length] }}
                domain={[stream.min, stream.max]}
              />
            ))}
            <Tooltip
              labelFormatter={(time: number) => new Date(time).toLocaleString()}
              contentStyle={{
                background: 'hsl(var(--background-overlay-default))',
                border: '1px solid hsl(var(--border-default))',
                fontSize: 12,
              }}
            />
            {streams.map((stream, index) => (
              <Line
                key={stream.id}
                type="monotone"
                dataKey={stream.id}
                yAxisId={stream.id}
                name={stream.name}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
