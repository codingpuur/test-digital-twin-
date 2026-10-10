import { getStream, readStream } from '../dashboards/mock-streams'
import type { TwinElement } from '../twin.types'
import {
  HIGH_LEVEL_WARNING,
  PRESSURE_WARNING,
  PUMP_NAMES,
  VIBRATION_WARNING,
  type SimControls,
  type SimState,
} from './simulation.model'

/** A flat map of signal id to its current numeric value. Anything animated or coloured reads from this. */
export type Signals = Record<string, number>

export type SignalOption = { id: string; label: string; unit: string; max: number }

export const SIGNAL_OPTIONS: SignalOption[] = [
  { id: 'level', label: 'Wet-well level', unit: '%', max: 100 },
  { id: 'flow', label: 'Station flow', unit: 'm³/h', max: 1500 },
  { id: 'pressure', label: 'Header pressure', unit: 'bar', max: 10 },
  { id: 'valve.pos', label: 'Discharge valve position', unit: '%', max: 100 },
  ...PUMP_NAMES.flatMap((name, i) => [
    { id: `p${i + 1}.speed`, label: `${name} speed`, unit: '%', max: 100 },
    { id: `p${i + 1}.power`, label: `${name} power`, unit: 'kW', max: 95 },
    { id: `p${i + 1}.vib`, label: `${name} vibration`, unit: 'mm/s', max: 12 },
  ]),
]

const read = (streamId: string, time: number) => {
  const stream = getStream(streamId)
  return stream ? readStream(stream, time) : 0
}

/** Pumps 2 and up are standby (stopped) in the live data. */
const standbySignals: Signals = Object.fromEntries(
  PUMP_NAMES.slice(1).flatMap((_, i) => [
    [`p${i + 2}.speed`, 0],
    [`p${i + 2}.power`, 0],
    [`p${i + 2}.vib`, 0.4],
    [`p${i + 2}.state`, 0],
  ])
)

/** Signals derived from the mock streams at a point in time. */
export const getLiveSignals = (time: number): Signals => {
  const power = read('power', time)
  const vibration = read('vibration', time)
  const isRunning = power > 5
  return {
    level: read('level', time),
    flow: read('flow', time),
    pressure: read('pressure', time),
    'valve.pos': 100,
    'p1.speed': isRunning ? Math.min(100, (power / 95) ** (1 / 3) * 100) : 0,
    'p1.power': power,
    'p1.vib': vibration,
    'p1.state': isRunning ? 1 : 0,
    ...standbySignals,
  }
}

export const getSimSignals = (state: SimState, controls: SimControls): Signals => {
  const signals: Signals = {
    level: state.level,
    flow: state.flow,
    pressure: state.pressure,
    'valve.pos': controls.valve,
  }
  PUMP_NAMES.forEach((_, i) => {
    const key = `p${i + 1}`
    signals[`${key}.speed`] = state.running[i] ? controls.speed[i] : 0
    signals[`${key}.power`] = state.power[i]
    signals[`${key}.vib`] = state.vibration[i]
    signals[`${key}.state`] = controls.trip[i] ? 2 : state.running[i] ? 1 : 0
  })
  return signals
}

export type ReadingSpec = {
  label: string
  signal: string
  unit: string
  decimals?: number
  warnAbove?: number
  /** Show these labels instead of a number: index = rounded signal value. */
  states?: string[]
}

const PUMP_STATES = ['Stopped', 'Running', 'Tripped']

const pumpReadings = (n: number): ReadingSpec[] => [
  { label: 'Status', signal: `p${n}.state`, unit: '', states: PUMP_STATES, warnAbove: 1.5 },
  { label: 'Speed', signal: `p${n}.speed`, unit: '%', decimals: 0 },
  {
    label: 'Vibration',
    signal: `p${n}.vib`,
    unit: 'mm/s',
    decimals: 1,
    warnAbove: VIBRATION_WARNING,
  },
]

const motorReadings = (n: number): ReadingSpec[] => [
  { label: 'Power', signal: `p${n}.power`, unit: 'kW', decimals: 0 },
  {
    label: 'Vibration',
    signal: `p${n}.vib`,
    unit: 'mm/s',
    decimals: 1,
    warnAbove: VIBRATION_WARNING,
  },
]

const LEVEL_READING: ReadingSpec = {
  label: 'Level',
  signal: 'level',
  unit: '%',
  decimals: 0,
  warnAbove: HIGH_LEVEL_WARNING,
}
const FLOW_READING: ReadingSpec = { label: 'Flow', signal: 'flow', unit: 'm³/h', decimals: 0 }
const PRESSURE_READING: ReadingSpec = {
  label: 'Pressure',
  signal: 'pressure',
  unit: 'bar',
  decimals: 1,
  warnAbove: PRESSURE_WARNING,
}

/** Which signals describe which demo element. Elements missing here have no live data. */
export const READINGS_BY_ELEMENT: Record<string, ReadingSpec[]> = {
  ...Object.fromEntries(
    PUMP_NAMES.flatMap((_, i) => [
      [`P-10${i + 1} Pump`, pumpReadings(i + 1)],
      [`M-10${i + 1} Motor`, motorReadings(i + 1)],
    ])
  ),
  'Wet well': [LEVEL_READING],
  'LT-001 Level sensor': [LEVEL_READING],
  'Suction header': [FLOW_READING],
  'Discharge header': [FLOW_READING, PRESSURE_READING],
  ...Object.fromEntries(
    PUMP_NAMES.map((_, i) => [
      `DV-10${i + 1} Discharge valve`,
      [{ label: 'Position', signal: 'valve.pos', unit: '%', decimals: 0 }],
    ])
  ),
}

export type ElementReading = {
  label: string
  value: string
  isWarning: boolean
  /** Recent values, for a sparkline (stream readings only). */
  history?: number[]
}

export const getElementReadings = (element: TwinElement, signals: Signals): ElementReading[] =>
  (READINGS_BY_ELEMENT[element.name] ?? []).map((spec) => {
    const raw = signals[spec.signal] ?? 0
    const isWarning = spec.warnAbove !== undefined && raw > spec.warnAbove
    const value = spec.states
      ? (spec.states[Math.round(raw)] ?? '-')
      : `${raw.toFixed(spec.decimals ?? 0)} ${spec.unit}`.trim()
    return { label: spec.label, value, isWarning }
  })
