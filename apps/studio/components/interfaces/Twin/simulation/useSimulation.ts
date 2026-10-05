import { useCallback, useEffect, useRef, useState } from 'react'

import { getLiveSignals, getSimSignals, type Signals } from './signals'
import {
  applyScenario,
  createControls,
  createState,
  getAlarms,
  SCENARIOS,
  stepSimulation,
  type ScenarioId,
  type SimControls,
  type SimState,
} from './simulation.model'

export type SimulationSpeed = 1 | 4 | 8 | 16
export const SIMULATION_SPEEDS: SimulationSpeed[] = [1, 4, 8, 16]

export type HistoryPoint = {
  t: number
  level: number
  flow: number
  actualLevel: number
  actualFlow: number
}

export type SimulationLogEntry = { id: number; t: number; message: string }

const HISTORY_INTERVAL_SECONDS = 12
const MAX_HISTORY = 120
const MAX_LOG = 30
/** React-visible state refreshes at this rate; the 3D view reads the ref every frame instead. */
const UI_REFRESH_MS = 250

type Snapshot = {
  state: SimState
  controls: SimControls
  scenario: ScenarioId
  alarms: string[]
  history: HistoryPoint[]
  log: SimulationLogEntry[]
  signals: Signals
}

/**
 * Runs the station model on a requestAnimationFrame loop. The authoritative state lives in refs so
 * the loop does not re-render React 60 times a second; `snapshot` is a throttled copy for the UI.
 */
export const useSimulation = () => {
  const [isRunning, setIsRunning] = useState(true)
  const [speed, setSpeed] = useState<SimulationSpeed>(8)
  // Wall-clock time the run started: lets "actual" readings line up with the simulated clock.
  const startedAtRef = useRef(Date.now())
  const logId = useRef(0)

  const stateRef = useRef(createState())
  const controlsRef = useRef(createControls())
  const scenarioRef = useRef<ScenarioId>('normal')
  const historyRef = useRef<HistoryPoint[]>([])
  const logRef = useRef<SimulationLogEntry[]>([])
  const sinceSampleRef = useRef(0)
  const signalsRef = useRef<Signals>(getSimSignals(stateRef.current, controlsRef.current))

  const addLog = useCallback((message: string) => {
    logId.current += 1
    logRef.current = [
      { id: logId.current, t: stateRef.current.t, message },
      ...logRef.current,
    ].slice(0, MAX_LOG)
  }, [])

  const buildSnapshot = useCallback(
    (): Snapshot => ({
      state: stateRef.current,
      controls: controlsRef.current,
      scenario: scenarioRef.current,
      alarms: getAlarms(stateRef.current, controlsRef.current),
      history: historyRef.current,
      log: logRef.current,
      signals: signalsRef.current,
    }),
    []
  )

  const [snapshot, setSnapshot] = useState<Snapshot>(buildSnapshot)

  const alarmsRef = useRef<string[]>([])

  useEffect(() => {
    if (!isRunning) return
    let frame = 0
    let last = performance.now()
    let lastUiUpdate = 0

    const tick = (now: number) => {
      const wallSeconds = Math.min((now - last) / 1000, 0.1)
      last = now
      // Advance in small steps so fast playback stays stable.
      let remaining = wallSeconds * speed
      while (remaining > 0) {
        const dt = Math.min(remaining, 2)
        remaining -= dt
        const result = stepSimulation(stateRef.current, controlsRef.current, dt)
        stateRef.current = result.state
        controlsRef.current = result.controls
        result.events.forEach(addLog)

        sinceSampleRef.current += dt
        if (sinceSampleRef.current >= HISTORY_INTERVAL_SECONDS) {
          sinceSampleRef.current = 0
          const actual = getLiveSignals(startedAtRef.current + result.state.t * 1000)
          historyRef.current = [
            ...historyRef.current,
            {
              t: result.state.t,
              level: result.state.level,
              flow: result.state.flow,
              actualLevel: actual.level,
              actualFlow: actual.flow,
            },
          ].slice(-MAX_HISTORY)
        }
      }

      signalsRef.current = getSimSignals(stateRef.current, controlsRef.current)

      const alarms = getAlarms(stateRef.current, controlsRef.current)
      alarms
        .filter((alarm) => !alarmsRef.current.includes(alarm))
        .forEach((alarm) => addLog(`Alarm: ${alarm}`))
      alarmsRef.current = alarms

      if (now - lastUiUpdate >= UI_REFRESH_MS) {
        lastUiUpdate = now
        setSnapshot(buildSnapshot())
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isRunning, speed, addLog, buildSnapshot])

  const refresh = useCallback(() => setSnapshot(buildSnapshot()), [buildSnapshot])

  const updateControls = useCallback(
    (patch: Partial<SimControls>) => {
      controlsRef.current = { ...controlsRef.current, ...patch }
      refresh()
    },
    [refresh]
  )

  const setPumpOn = useCallback(
    (index: number, isOn: boolean) => {
      const on = [...controlsRef.current.on] as SimControls['on']
      on[index] = isOn
      // Manual control means lead/lag steps aside.
      updateControls({ on, auto: false })
    },
    [updateControls]
  )

  const setPumpSpeed = useCallback(
    (index: number, value: number) => {
      const next = [...controlsRef.current.speed] as SimControls['speed']
      next[index] = value
      updateControls({ speed: next })
    },
    [updateControls]
  )

  const runScenario = useCallback(
    (id: ScenarioId) => {
      const scenario = SCENARIOS.find((item) => item.id === id)
      if (!scenario) return
      controlsRef.current = applyScenario(controlsRef.current, scenario)
      scenarioRef.current = id
      addLog(scenario.message)
      refresh()
    },
    [addLog, refresh]
  )

  const reset = useCallback(() => {
    stateRef.current = createState()
    controlsRef.current = createControls()
    scenarioRef.current = 'normal'
    historyRef.current = []
    logRef.current = []
    alarmsRef.current = []
    sinceSampleRef.current = 0
    startedAtRef.current = Date.now()
    signalsRef.current = getSimSignals(stateRef.current, controlsRef.current)
    addLog('Simulation reset: Normal operation')
    refresh()
  }, [addLog, refresh])

  return {
    snapshot,
    /** Latest signals, updated every frame while running. */
    signalsRef,
    isRunning,
    speed,
    setIsRunning,
    setSpeed,
    updateControls,
    setPumpOn,
    setPumpSpeed,
    runScenario,
    reset,
  }
}

export type SimulationController = ReturnType<typeof useSimulation>
