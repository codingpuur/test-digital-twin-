import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'ui'

import { SIMULATION_SPEEDS, type SimulationController, type SimulationSpeed } from './useSimulation'

const formatClock = (seconds: number) => {
  const total = Math.floor(seconds)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `T+${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`
}

/** Replaces the timeline bar while the simulation is the data source. */
export const SimulationBar = ({ simulation }: { simulation: SimulationController }) => (
  <div className="flex items-center gap-x-3 border-b bg-surface-100 px-4 py-2.5">
    <span className="text-sm">Simulation · {formatClock(simulation.snapshot.state.t)}</span>
    <span className="flex items-center gap-x-1.5 rounded-md border border-warning/40 px-2 py-0.5 text-xs text-warning">
      <span className="inline-block size-2 rounded-full bg-warning" />
      Simulation
    </span>
    <div className="flex-1" />
    <span className="text-sm text-foreground-light">Speed</span>
    <Select
      value={String(simulation.speed)}
      onValueChange={(value) => simulation.setSpeed(Number(value) as SimulationSpeed)}
    >
      <SelectTrigger className="w-20" size="tiny" aria-label="Simulation speed">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SIMULATION_SPEEDS.map((speed) => (
          <SelectItem key={speed} value={String(speed)}>
            {speed}x
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)
