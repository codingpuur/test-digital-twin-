import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import type { PumpCharts as PumpChartsData } from '@/data/twin/pump-types'

const POR_FILL = '#3ecf8e'
const AOR_FILL = '#e5a23b'
const TEXT_TICK = { fontSize: 10 }

const ChartCard = ({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) => (
  <div className="flex min-w-[280px] flex-1 flex-col gap-y-1 p-3">
    <h4 className="text-xs uppercase tracking-wide text-foreground-light">{title}</h4>
    <div className="min-h-[140px] flex-1">{children}</div>
    {note && <p className="text-xs text-foreground-lighter">{note}</p>}
  </div>
)

const zip = <T extends Record<string, number>>(x: number[], series: Record<keyof T, number[]>) =>
  x.map((value, i) => ({
    q: value,
    ...Object.fromEntries(
      Object.entries(series).map(([key, values]) => [key, (values as number[])[i]])
    ),
  }))

const Regions = ({ por, aor }: { por: [number, number]; aor: [number, number] }) => (
  <>
    <ReferenceArea x1={aor[0]} x2={aor[1]} fill={AOR_FILL} fillOpacity={0.08} />
    <ReferenceArea x1={por[0]} x2={por[1]} fill={POR_FILL} fillOpacity={0.12} />
  </>
)

const Frame = ({
  data,
  yLabel,
  children,
  xKey = 'q',
  xLabel = 'm³/h',
}: {
  data: Record<string, number>[]
  yLabel: string
  children: React.ReactNode
  xKey?: string
  xLabel?: string
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
      <CartesianGrid stroke="currentColor" className="text-border" strokeDasharray="3 3" />
      <XAxis
        dataKey={xKey}
        type="number"
        domain={['dataMin', 'dataMax']}
        tickFormatter={(value: number) => String(Math.round(value))}
        tick={TEXT_TICK}
        unit={` ${xLabel}`}
      />
      <YAxis
        tick={TEXT_TICK}
        label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 10 }}
      />
      {children}
    </ComposedChart>
  </ResponsiveContainer>
)

export const PerformanceCharts = ({ charts }: { charts: PumpChartsData }) => {
  const { perf, power } = charts
  const head = zip(perf.q, { H: perf.H, sysH: perf.sysH })
  const npsh = zip(perf.q, { npshi: perf.npshi, npsh3: perf.npsh3 })
  const powerData = zip(power.q, { P: power.P })
  return (
    <>
      <ChartCard
        title="Head and system curve"
        note={`Operating point ${Math.round(perf.op[0])} m³/h, ${perf.op[1].toFixed(1)} m. Best point ${Math.round(perf.bep[0])} m³/h at ${perf.bep_eta.toFixed(1)} % efficiency.`}
      >
        <Frame data={head} yLabel="m">
          <Regions por={perf.regions.por} aor={perf.regions.aor} />
          <Line
            dataKey="H"
            name="Pump curve"
            stroke="#3ecf8e"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="sysH"
            name="System"
            stroke="#8b95a5"
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot x={perf.op[0]} y={perf.op[1]} r={5} fill="#e5484d" stroke="none" />
        </Frame>
      </ChartCard>
      <ChartCard
        title="Suction (NPSH)"
        note={`Available ${perf.npsha.toFixed(1)} m. Cavitation starts where the available line meets the curve.`}
      >
        <Frame data={npsh} yLabel="m">
          <Line
            dataKey="npshi"
            name="NPSH incipient"
            stroke="#e5a23b"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="npsh3"
            name="NPSH 3 %"
            stroke="#e5484d"
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceLine
            y={perf.npsha}
            stroke="#3ecf8e"
            label={{ value: 'available', fontSize: 10 }}
          />
          <ReferenceLine x={perf.op[0]} stroke="#8b95a5" strokeDasharray="3 3" />
        </Frame>
      </ChartCard>
      <ChartCard
        title="Power against the maker's curve"
        note={
          power.p_curve === null
            ? undefined
            : `Maker's curve ${Math.round(power.p_curve)} kW at this head; motor rated ${Math.round(power.rated)} kW.`
        }
      >
        <Frame data={powerData} yLabel="kW">
          <Regions por={power.regions.por} aor={power.regions.aor} />
          <Line
            dataKey="P"
            name="Shaft power"
            stroke="#3ecf8e"
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceLine
            y={power.rated}
            stroke="#e5484d"
            strokeDasharray="4 4"
            label={{ value: 'rated', fontSize: 10 }}
          />
          {power.q_head !== null && power.p_shaft !== null && (
            <ReferenceDot x={power.q_head} y={power.p_shaft} r={5} fill="#e5484d" stroke="none" />
          )}
        </Frame>
      </ChartCard>
    </>
  )
}

export const RotorCharts = ({ charts }: { charts: PumpChartsData }) => {
  const { campbell } = charts
  const data = campbell.rpm.map((rpm) => {
    const row: Record<string, number> = { rpm }
    campbell.modes.forEach((mode, i) => (row[`mode${i + 1}`] = mode))
    row.x1 = rpm / 60
    row.x2 = (2 * rpm) / 60
    row.vane = (campbell.z * rpm) / 60
    return row
  })
  return (
    <ChartCard title="Campbell diagram" note={campbell.note || undefined}>
      <Frame data={data} yLabel="Hz" xKey="rpm" xLabel="rpm">
        {campbell.modes.map((_, i) => (
          <Line
            key={i}
            dataKey={`mode${i + 1}`}
            name={`Rotor mode ${i + 1}`}
            stroke="#8b95a5"
            dot={false}
            isAnimationActive={false}
          />
        ))}
        <Line dataKey="x1" name="1X" stroke="#3ecf8e" dot={false} isAnimationActive={false} />
        <Line dataKey="x2" name="2X" stroke="#3b82f6" dot={false} isAnimationActive={false} />
        <Line
          dataKey="vane"
          name="Vane pass"
          stroke="#e5a23b"
          dot={false}
          isAnimationActive={false}
        />
        <ReferenceLine
          x={campbell.run_rpm}
          stroke="#e5484d"
          label={{ value: 'running', fontSize: 10 }}
        />
      </Frame>
    </ChartCard>
  )
}

const LOSS_LABELS: Record<string, string> = {
  stator_cu: 'Stator copper',
  iron: 'Iron',
  rotor_cu: 'Rotor copper',
  fw: 'Friction and windage',
  stray: 'Stray',
}

export const MotorCharts = ({ charts }: { charts: PumpChartsData }) => {
  const { therm, loss } = charts
  const total = Object.values(loss).reduce((sum, value) => sum + value, 0) || 1
  return (
    <>
      <ChartCard
        title="Motor temperatures"
        note={`Insulation class limit ${therm.cls} °C, alarm ${therm.alarm} °C.`}
      >
        <div className="flex flex-col gap-y-1.5 text-sm">
          {Object.entries(therm.nodes).map(([name, value]) => (
            <div key={name} className="flex items-center gap-x-2">
              <span className="w-20 capitalize text-foreground-light">{name}</span>
              <div className="h-2 flex-1 rounded-full bg-surface-300">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (value / therm.cls) * 100)}%`,
                    background:
                      value >= therm.alarm
                        ? '#e5484d'
                        : value >= therm.cls * 0.85
                          ? '#e5a23b'
                          : '#3ecf8e',
                  }}
                />
              </div>
              <span className="w-16 text-right">{value.toFixed(0)} °C</span>
            </div>
          ))}
          <p className="text-xs text-foreground-lighter">
            Winding hot spot {therm.hot.toFixed(0)} °C.
          </p>
        </div>
      </ChartCard>
      <ChartCard title="Motor losses">
        <div className="flex flex-col gap-y-1.5 text-sm">
          {Object.entries(loss).map(([name, watts]) => (
            <div key={name} className="flex items-center gap-x-2">
              <span className="w-36 text-foreground-light">{LOSS_LABELS[name] ?? name}</span>
              <div className="h-2 flex-1 rounded-full bg-surface-300">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${(watts / total) * 100}%` }}
                />
              </div>
              <span className="w-16 text-right">{(watts / 1000).toFixed(1)} kW</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </>
  )
}
