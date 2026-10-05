import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button, cn, Switch } from 'ui'

import { PUMP_NAMES, SCENARIOS } from './simulation.model'
import type { SimulationController } from './useSimulation'

export type DataSource = 'live' | 'sim'

type SimulationPanelProps = {
  simulation: SimulationController
  dataSource: DataSource
  onDataSourceChange: (source: DataSource) => void
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-y-2 border-b px-4 py-3">
    <h3 className="text-xs uppercase tracking-wide text-foreground-light">{title}</h3>
    {children}
  </section>
)

const SliderRow = ({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  unit: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) => (
  <div className="flex flex-col gap-y-1">
    <div className="flex justify-between text-sm">
      <span className="text-foreground-light">{label}</span>
      <span>
        {value.toLocaleString()} {unit}
      </span>
    </div>
    <input
      type="range"
      aria-label={label}
      className="w-full accent-brand"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </div>
)

export const SimulationPanel = ({
  simulation,
  dataSource,
  onDataSourceChange,
}: SimulationPanelProps) => {
  const { snapshot, isRunning, setIsRunning, updateControls, setPumpOn, setPumpSpeed } = simulation
  const { controls, scenario } = snapshot

  return (
    <div className="flex flex-col">
      <Section title="Data source">
        <div className="flex overflow-hidden rounded-md border">
          {(['live', 'sim'] as const).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => onDataSourceChange(source)}
              className={cn(
                'flex-1 py-1.5 text-sm transition-colors',
                dataSource === source
                  ? 'bg-surface-300 text-foreground'
                  : 'text-foreground-light hover:bg-surface-200'
              )}
            >
              {source === 'live' ? 'Live data' : 'Simulation'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Scenarios">
        <div className="flex flex-col gap-y-2">
          {SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onDataSourceChange('sim')
                simulation.runScenario(item.id)
              }}
              className={cn(
                'rounded-md border px-3 py-2 text-left transition-colors hover:border-foreground-muted',
                dataSource === 'sim' && scenario === item.id
                  ? 'border-brand bg-surface-200'
                  : 'bg-surface-100'
              )}
            >
              <span className="block text-sm">{item.label}</span>
              <span className="block text-xs text-foreground-lighter">{item.description}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Controls">
        <SliderRow
          label="Inflow"
          value={controls.inflow}
          unit="m³/h"
          min={0}
          max={2000}
          step={50}
          onChange={(inflow) => updateControls({ inflow })}
        />
        <SliderRow
          label="Discharge valve"
          value={controls.valve}
          unit="%"
          min={0}
          max={100}
          step={5}
          onChange={(valve) => updateControls({ valve })}
        />
        <label className="flex items-center justify-between text-sm text-foreground-light">
          Auto lead/lag
          <Switch checked={controls.auto} onCheckedChange={(auto) => updateControls({ auto })} />
        </label>
        {PUMP_NAMES.map((name, i) => (
          <div key={name} className="grid grid-cols-[48px_1fr_auto] items-center gap-x-2 text-sm">
            <span>{name}</span>
            <input
              type="range"
              aria-label={`${name} speed`}
              className="w-full accent-brand"
              min={30}
              max={100}
              value={controls.speed[i]}
              onChange={(event) => setPumpSpeed(i, Number(event.target.value))}
            />
            <Switch
              aria-label={`${name} on`}
              checked={controls.on[i] && !controls.trip[i]}
              disabled={controls.trip[i]}
              onCheckedChange={(isOn) => setPumpOn(i, isOn)}
            />
          </div>
        ))}
      </Section>

      <div className="flex gap-x-2 px-4 py-3">
        <Button
          className="flex-1"
          variant="primary"
          icon={isRunning ? <Pause size={14} /> : <Play size={14} />}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? 'Pause' : 'Play'}
        </Button>
        <Button
          className="flex-1"
          variant="default"
          icon={<RotateCcw size={14} />}
          onClick={simulation.reset}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
