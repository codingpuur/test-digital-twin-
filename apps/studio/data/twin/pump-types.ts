// Shapes of the pump twin API replies (services/pump-twin-api). The screens render these as they
// are: every status, delta, limit and unit is decided by the backend.

export type PumpStatus = 'ok' | 'watch' | 'act'

export type PumpMeta = {
  station: string
  source: string
  pumps: number[]
  fields: {
    k: string
    label: string
    unit: string
    step: number
    ch: string | null
    hint: string
  }[]
  faults: { key: string; label: string; max: number; step: number }[]
  drivers: string[]
  kpis: {
    key: string
    label: string
    unit: string
    decimals: number
    better: 'higher' | 'lower' | null
  }[]
  bands: { ok: number; act: number }
  status_labels: Record<PumpStatus, string>
  components: string[]
  focus_part: Record<string, string>
}

export type PumpSummary = {
  pump: number
  timestamp: string | null
  usable: boolean
  flow_m3h: number | null
  head_m: number | null
  power_kw: number | null
  pump_eff_pct: number | null
  region: string | null
  health_index: {
    index: number
    components: Record<string, number>
    worst: string
    status: PumpStatus
  }
}

export type PumpWhatIfDefaults = {
  pump: number
  defaults: Record<string, number>
  ranges: Record<string, [number, number] | number>
  limits: Record<string, [number, number]>
  timestamp: string | null
}

export type PumpWhatIfMode = 'consistent' | 'raw'

export type PumpWhatIfRequest = {
  mode: PumpWhatIfMode
  driver: string
  vfd: boolean
  over: Record<string, number>
  faults: Record<string, number>
}

export type PumpComponentRow = {
  key: string
  label: string
  value: number
  status: PumpStatus
  why: string
}

export type PumpKpiDelta = {
  key: string
  label: string
  unit: string
  decimals: number
  base: number
  value: number
  delta: number
  direction: 'same' | 'changed' | 'improved' | 'worse'
}

export type PumpAlarm = {
  severity: 'act' | 'watch'
  area: string
  text: string
  recommendation: string
  component: string | null
}

export type PumpFinding = {
  id: string
  area: string
  level: 'info' | PumpStatus
  finding: string
  significance: string
  recommendation: string
  audience: string[]
}

export type PumpWhatIfView = {
  health: { index: number; status: PumpStatus; label: string; baseline_index: number }
  components: PumpComponentRow[]
  worst_component: string | null
  focus_part: string | null
  deltas: PumpKpiDelta[]
  alarms: PumpAlarm[]
}

export type PumpWhatIfResult = {
  pump: number
  ms: number
  notes: string[]
  solved: Record<string, unknown> & { implausible?: boolean }
  scenario: {
    insights: Record<string, PumpFinding[]>
    charts: PumpCharts
    dots: Record<string, [string, string][]>
    an: Record<string, unknown>
  }
  view: PumpWhatIfView
  reading_timestamp: string | null
}

export type PumpModelPart = {
  name: string
  role: string
  sub: string | null
  component: string | null
  focus: boolean
}

export type PumpMesh = {
  up: 'z' | 'y'
  axis: 'x'
  unit: 'm'
  parts: (PumpModelPart & { vertices: string; faces: string })[]
}

export type PumpTelemetryReading = {
  channel: string
  label: string
  unit: string
  decimals: number
  group: string
  value: number | null
  limit: number | null
  status: PumpStatus | null
}

export type PumpTelemetryLatest = {
  pump: number
  ts: number
  age_s: number
  source: string
  poll_error: string | null
  readings: PumpTelemetryReading[]
}

export type PumpLayerWhich = 'baseline' | 'scenario'

export type PumpLayerInfo = {
  key: string
  title: string
  unit: string
  about: string
  lo: number
  hi: number
  /** Colour stops, position 0..1 and a CSS colour. */
  scale: [number, string][]
}

export type PumpLayer = PumpLayerInfo & {
  pump: number
  which: PumpLayerWhich
  /** Per part index, one byte per vertex (0 = low end of the scale, 254 = high end), base64. */
  values: Record<string, string>
  opacity: Record<string, number>
  extras: (
    | { kind: 'mesh'; name: string; vertices: string; faces: string; values: string }
    | { kind: 'lines'; name: string; lines: { vertices: string; values: string }[] }
  )[]
}

type Regions = { por: [number, number]; aor: [number, number]; qmin: number; qmax: number }

/** Chart data of one run. Curves, regions and limits are the backend's; the screen only draws them. */
export type PumpCharts = {
  perf: {
    q: number[]
    H: number[]
    eta: number[]
    sysH: number[]
    npsh3: number[]
    npshi: number[]
    op: [number, number]
    npsha: number
    bep: [number, number]
    bep_eta: number
    npshr_pts: { q: number[]; v: number[] } | null
    regions: Regions
  }
  power: {
    q: number[]
    P: number[]
    q_head: number | null
    p_curve: number | null
    p_shaft: number | null
    rated: number
    regions: Regions
  }
  campbell: {
    rpm: number[]
    modes: number[]
    run_rpm: number
    z: number
    casing: number[]
    note: string
  }
  therm: {
    nodes: Record<string, number>
    hot: number
    alarm: number
    cls: number
    model: number | null
  }
  loss: Record<string, number>
  tabs: [string, string, string[]][]
  hidden: Record<string, string>
}
