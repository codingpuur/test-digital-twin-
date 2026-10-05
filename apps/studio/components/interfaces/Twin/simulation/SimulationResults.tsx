import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import { HIGH_LEVEL_WARNING } from './simulation.model'
import type { HistoryPoint, SimulationLogEntry } from './useSimulation'

const formatClock = (seconds: number) =>
  `T+${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

const SeriesChart = ({
  title,
  history,
  simKey,
  actualKey,
  max,
  warnAt,
}: {
  title: string
  history: HistoryPoint[]
  simKey: 'level' | 'flow'
  actualKey: 'actualLevel' | 'actualFlow'
  max: number
  warnAt?: number
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-y-2 p-3">
    <div className="flex items-center justify-between">
      <h4 className="text-xs uppercase tracking-wide text-foreground-light">{title}</h4>
      <span className="flex gap-x-3 text-xs text-foreground-lighter">
        <span className="text-brand-link">Simulated</span>
        <span>Actual</span>
      </span>
    </div>
    <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="currentColor" className="text-border" strokeDasharray="3 3" />
          <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={formatClock} />
          <YAxis domain={[0, max]} tick={{ fontSize: 10 }} />
          {warnAt !== undefined && (
            <ReferenceLine y={warnAt} stroke="#e5484d" strokeDasharray="4 4" strokeOpacity={0.6} />
          )}
          <Line
            dataKey={actualKey}
            stroke="#8a8a8a"
            strokeDasharray="4 3"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey={simKey}
            stroke="#3ecf8e"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)

type SimulationResultsProps = {
  history: HistoryPoint[]
  log: SimulationLogEntry[]
}

export const SimulationResults = ({ history, log }: SimulationResultsProps) => (
  <div className="flex h-full divide-x bg-surface-100">
    <SeriesChart
      title="Wet-well level (%)"
      history={history}
      simKey="level"
      actualKey="actualLevel"
      max={100}
      warnAt={HIGH_LEVEL_WARNING}
    />
    <SeriesChart
      title="Station flow (m³/h)"
      history={history}
      simKey="flow"
      actualKey="actualFlow"
      max={2000}
    />
    <div className="flex min-w-0 flex-1 flex-col gap-y-2 overflow-hidden p-3">
      <h4 className="text-xs uppercase tracking-wide text-foreground-light">Events</h4>
      <ul className="flex-1 overflow-y-auto text-sm text-foreground-light">
        {log.length === 0 && <li className="text-foreground-lighter">No events yet.</li>}
        {log.map((entry) => (
          <li key={entry.id} className="border-b py-1">
            <span className="text-foreground">{formatClock(entry.t)}</span> {entry.message}
          </li>
        ))}
      </ul>
    </div>
  </div>
)
