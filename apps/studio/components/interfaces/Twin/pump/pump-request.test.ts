import { describe, expect, it } from 'vitest'

import { buildRequest, EMPTY_FORM, isChanged } from './pump-request'

const DEFAULTS = { flow_m3h: 2553.1, head_m: 124.05, power_kw: 1036.1 }

describe('buildRequest', () => {
  it('sends nothing for an untouched form', () => {
    const request = buildRequest(DEFAULTS, EMPTY_FORM)
    expect(request).toMatchObject({ over: {}, faults: {}, driver: 'head_m' })
    expect(isChanged(EMPTY_FORM, request)).toBe(false)
  })

  it('sends only changed inputs and solves from the one that changed', () => {
    const form = { ...EMPTY_FORM, edits: { flow_m3h: '3000', head_m: '124.05', bad: 'x' } }
    const request = buildRequest(DEFAULTS, form)
    expect(request.over).toEqual({ flow_m3h: 3000 })
    expect(request.driver).toBe('flow_m3h')
  })

  it('drops zero faults', () => {
    const form = { ...EMPTY_FORM, faults: { impeller_wear: 0.4, passage_blockage: 0 } }
    const request = buildRequest(DEFAULTS, form)
    expect(request.faults).toEqual({ impeller_wear: 0.4 })
    expect(isChanged(form, request)).toBe(true)
  })
})
