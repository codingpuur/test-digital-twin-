// Pure model of the pumping station used by the Simulation mode. No React, no three.js.

/** One entry per pump, in `PUMP_NAMES` order. */
export type PumpTuple<T> = T[]

export type SimControls = {
  inflow: number // m³/h
  valve: number // discharge valve position, 0-100 %
  auto: boolean // lead/lag control
  on: PumpTuple<boolean>
  speed: PumpTuple<number> // %
  trip: PumpTuple<boolean>
  vibrationFault: PumpTuple<boolean>
}

export type SimState = {
  t: number // simulated seconds since start
  level: number // wet-well level, %
  flow: number // m³/h
  pressure: number // bar
  power: PumpTuple<number> // kW
  vibration: PumpTuple<number> // mm/s
  running: PumpTuple<boolean>
}

export type ScenarioId = 'normal' | 'storm' | 'trip' | 'valve' | 'power'

export type Scenario = {
  id: ScenarioId
  label: string
  description: string
  message: string
  controls: Partial<SimControls>
}

export const PUMP_NAMES = [
  'P-101',
  'P-102',
  'P-103',
  'P-104',
  'P-105',
  'P-106',
  'P-107',
  'P-108',
] as const

/** A flag per pump: true for the listed pump indexes, false for the rest. */
const flags = (...onIndexes: number[]): boolean[] =>
  PUMP_NAMES.map((_, index) => onIndexes.includes(index))

export const VIBRATION_WARNING = 7
export const PRESSURE_WARNING = 8
export const HIGH_LEVEL_WARNING = 90
export const LOW_LEVEL_WARNING = 12

const WELL_CAPACITY = 4200
const MAX_PUMP_FLOW = 520
const MAX_PUMP_POWER = 95

const NO_TRIP: PumpTuple<boolean> = flags()

export const SCENARIOS: Scenario[] = [
  {
    id: 'normal',
    label: 'Normal operation',
    description: 'Inflow 800 m³/h, auto lead/lag',
    message: 'Normal operation restored',
    controls: {
      inflow: 800,
      valve: 100,
      auto: true,
      on: flags(0),
      trip: NO_TRIP,
      vibrationFault: NO_TRIP,
    },
  },
  {
    id: 'storm',
    label: 'Storm inflow',
    description: 'Inflow rises to 1,800 m³/h',
    message: 'Storm inflow: inflow rising to 1,800 m³/h',
    controls: {
      inflow: 1800,
      valve: 100,
      auto: true,
      on: flags(0),
      trip: NO_TRIP,
      vibrationFault: NO_TRIP,
    },
  },
  {
    id: 'trip',
    label: 'P-101 trip',
    description: 'Pump 1 stops, vibration alarm',
    message: 'P-101 tripped on high vibration',
    controls: {
      inflow: 900,
      valve: 100,
      auto: true,
      on: flags(1),
      trip: flags(0),
      vibrationFault: flags(0),
    },
  },
  {
    id: 'valve',
    label: 'Discharge valve closed',
    description: 'Pressure rises, flow drops',
    message: 'Discharge valve DV-01 closed to 15 %',
    controls: {
      inflow: 900,
      valve: 15,
      auto: false,
      on: flags(0, 1),
      trip: NO_TRIP,
      vibrationFault: NO_TRIP,
    },
  },
  {
    id: 'power',
    label: 'Power failure',
    description: 'All pumps stop',
    message: 'Power failure: all pumps stopped',
    controls: {
      inflow: 900,
      valve: 100,
      auto: false,
      on: flags(),
      trip: PUMP_NAMES.map(() => true),
      vibrationFault: NO_TRIP,
    },
  },
]

export const createControls = (): SimControls => ({
  inflow: 800,
  valve: 100,
  auto: true,
  on: flags(0),
  speed: PUMP_NAMES.map(() => 80),
  trip: [...NO_TRIP],
  vibrationFault: [...NO_TRIP],
})

export const createState = (): SimState => ({
  t: 0,
  level: 55,
  flow: 0,
  pressure: 0.3,
  power: PUMP_NAMES.map(() => 0),
  vibration: PUMP_NAMES.map(() => 0.4),
  running: flags(),
})

export const applyScenario = (controls: SimControls, scenario: Scenario): SimControls => ({
  ...controls,
  ...scenario.controls,
  on: [...(scenario.controls.on ?? controls.on)],
  trip: [...(scenario.controls.trip ?? controls.trip)],
  vibrationFault: [...(scenario.controls.vibrationFault ?? controls.vibrationFault)],
})

// Start/stop levels of each pump under lead/lag control. Pumps 4-8 only join in an extreme storm.
const LEAD_LAG: [start: number, stop: number][] = [
  [35, 20],
  [70, 55],
  [85, 68],
  [90, 76],
  [93, 80],
  [95, 84],
  [97, 88],
  [99, 90],
]

export type StepResult = { state: SimState; controls: SimControls; events: string[] }

/** Advances the station by `dt` simulated seconds. Never mutates its inputs. */
export const stepSimulation = (state: SimState, controls: SimControls, dt: number): StepResult => {
  const events: string[] = []
  const on = [...controls.on]

  if (controls.auto) {
    LEAD_LAG.forEach(([start, stop], i) => {
      if (controls.trip[i]) return
      if (state.level > start && !on[i]) {
        on[i] = true
        if (i > 0) events.push(`${PUMP_NAMES[i]} started (level ${state.level.toFixed(0)} %)`)
      } else if (state.level < stop && on[i]) {
        on[i] = false
        if (i > 0) events.push(`${PUMP_NAMES[i]} stopped (level ${state.level.toFixed(0)} %)`)
      }
    })
  }

  const valveCapacity = Math.min(1, 0.25 + controls.valve / 130)
  const running = on.map((isOn, i) => isOn && !controls.trip[i])
  const pumpFlow = running.map((isRunning, i) =>
    isRunning ? MAX_PUMP_FLOW * (controls.speed[i] / 100) * valveCapacity : 0
  )
  const flow = pumpFlow.reduce((total, value) => total + value, 0)

  const power = running.map((isRunning, i) =>
    isRunning ? MAX_PUMP_POWER * Math.pow(controls.speed[i] / 100, 3) : 0
  )

  const vibration = running.map((isRunning, i) => {
    if (controls.vibrationFault[i]) return 9.4
    if (!isRunning) return 0.4
    return 2.6 + controls.speed[i] / 60 + (controls.valve < 30 ? 3.2 : 0)
  })

  const pressure = flow > 0 ? 2.2 + flow / 380 + ((100 - controls.valve) / 100) * 6.5 : 0.3
  const level = Math.max(
    0,
    Math.min(100, state.level + ((controls.inflow - flow) / WELL_CAPACITY) * dt)
  )

  return {
    state: { t: state.t + dt, level, flow, pressure, power, vibration, running },
    controls: { ...controls, on },
    events,
  }
}

export const getAlarms = (state: SimState, controls: SimControls): string[] => {
  const alarms: string[] = []
  if (state.level > HIGH_LEVEL_WARNING) alarms.push('High level > 90 %')
  if (state.level < LOW_LEVEL_WARNING && state.flow > 0) alarms.push('Low level < 12 %')
  if (state.pressure > PRESSURE_WARNING) alarms.push('High pressure > 8 bar')
  PUMP_NAMES.forEach((name, i) => {
    if (state.vibration[i] > VIBRATION_WARNING) {
      alarms.push(`${name} vibration ${state.vibration[i].toFixed(1)} mm/s`)
    }
    if (controls.trip[i]) alarms.push(`${name} tripped`)
  })
  return alarms
}
