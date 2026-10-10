import { describe, expect, it } from 'vitest'

import {
  applyScenario,
  createControls,
  createState,
  getAlarms,
  PUMP_NAMES,
  SCENARIOS,
  stepSimulation,
} from './simulation.model'

const run = (seconds: number, controls = createControls(), state = createState()) => {
  let current = { state, controls, events: [] as string[] }
  for (let i = 0; i < seconds; i++) current = stepSimulation(current.state, current.controls, 1)
  return current
}

const noPumps = () => PUMP_NAMES.map(() => false)
const scenario = (id: string) => SCENARIOS.find((item) => item.id === id)!

describe('stepSimulation', () => {
  it('does not mutate its inputs', () => {
    const state = createState()
    const controls = createControls()
    stepSimulation(state, controls, 1)
    expect(state).toEqual(createState())
    expect(controls).toEqual(createControls())
  })

  it('raises the level when inflow exceeds pump flow', () => {
    const controls = { ...createControls(), auto: false, on: noPumps() }
    expect(run(60, controls).state.level).toBeGreaterThan(55)
  })

  it('starts lag pumps under storm inflow', () => {
    const controls = applyScenario(createControls(), scenario('storm'))
    const result = run(900, controls)
    expect(result.controls.on[1]).toBe(true)
  })

  it('stops every pump on power failure', () => {
    const controls = applyScenario(createControls(), scenario('power'))
    const { state } = run(5, controls)
    expect(state.flow).toBe(0)
    expect(state.running).toEqual(noPumps())
  })

  it('reports a vibration alarm and trip for the P-101 trip scenario', () => {
    const controls = applyScenario(createControls(), scenario('trip'))
    const { state, controls: next } = run(2, controls)
    const alarms = getAlarms(state, next)
    expect(alarms).toContain('P-101 tripped')
    expect(alarms.some((alarm) => alarm.startsWith('P-101 vibration'))).toBe(true)
  })

  it('raises pressure when the discharge valve closes', () => {
    const open = run(5, { ...createControls(), auto: false, on: noPumps().map((_, i) => i < 2) })
      .state.pressure
    const closed = run(5, applyScenario(createControls(), scenario('valve'))).state.pressure
    expect(closed).toBeGreaterThan(open)
  })

  it('keeps the level between 0 and 100', () => {
    const high = run(5000, {
      ...createControls(),
      inflow: 2000,
      auto: false,
      on: noPumps(),
    })
    expect(high.state.level).toBeLessThanOrEqual(100)
    const low = run(5000, { ...createControls(), inflow: 0 })
    expect(low.state.level).toBeGreaterThanOrEqual(0)
  })
})
