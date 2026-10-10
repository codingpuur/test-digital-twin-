import type { PumpWhatIfRequest } from '@/data/twin/pump-types'

/** The inputs that fix an operating point; the one the user changed is the one that is solved from. */
const DRIVERS = ['flow_m3h', 'head_m', 'power_kw'] as const

export type PumpFormState = {
  /** Text typed per input; an input missing here is unchanged. */
  edits: Record<string, string>
  faults: Record<string, number>
  vfd: boolean
}

export const EMPTY_FORM: PumpFormState = { edits: {}, faults: {}, vfd: false }

/** Sends only what differs from the current reading; the backend validates and solves the rest. */
export const buildRequest = (
  defaults: Record<string, number>,
  form: PumpFormState
): PumpWhatIfRequest => {
  const over: Record<string, number> = {}
  Object.entries(form.edits).forEach(([key, text]) => {
    const value = Number(text)
    if (text.trim() === '' || !Number.isFinite(value)) return
    if (Math.abs(value - (defaults[key] ?? NaN)) > 1e-9) over[key] = value
  })
  const driver = DRIVERS.find((key) => key in over) ?? 'head_m'
  return {
    mode: 'consistent',
    driver,
    vfd: form.vfd,
    over,
    faults: Object.fromEntries(Object.entries(form.faults).filter(([, value]) => value > 0)),
  }
}

export const isChanged = (form: PumpFormState, request: PumpWhatIfRequest) =>
  Object.keys(request.over).length > 0 || Object.keys(request.faults).length > 0 || form.vfd
