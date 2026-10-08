import { describe, expect, it } from 'vitest'

import { findAsset, parseTimeReference, parseVoiceCommand } from './voice-intents'
import type { VoiceAsset, VoiceContext } from './voice.types'

const asset = (
  id: string,
  name: string,
  category: string,
  extra: Partial<VoiceAsset> = {}
): VoiceAsset => ({
  id,
  tag: name,
  name,
  category,
  risk: null,
  score: 90,
  ...extra,
})

const assets = [
  asset('p1', 'P-101 Pump', 'Pumps', {
    risk: { level: 'critical', reason: 'Bearing wear.' },
    score: 38,
  }),
  asset('p2', 'P-102 Pump', 'Pumps', { score: 71 }),
  asset('m1', 'M-101 Motor', 'Motors', {
    risk: { level: 'warning', reason: 'Phase imbalance.' },
    score: 62,
  }),
  asset('w1', 'Wet well', 'Tanks'),
]

const context = (overrides: Partial<VoiceContext> = {}): VoiceContext => ({
  assets,
  now: new Date('2026-03-10T15:30:00').getTime(),
  pendingTicketTag: null,
  readingsFor: (id) => (id === 'w1' ? ['Level: 62 %'] : []),
  ...overrides,
})

describe('findAsset', () => {
  it('matches spoken variants of a tag', () => {
    expect(findAsset('show p 101', assets)?.id).toBe('p1')
    expect(findAsset('show P101 please', assets)?.id).toBe('p1')
    expect(findAsset('wet well ka level', assets)?.id).toBe('w1')
    expect(findAsset('hello', assets)).toBeNull()
  })
})

describe('danger', () => {
  it('highlights every risky asset and names why', () => {
    const result = parseVoiceCommand('konsa asset danger mein hai', context())
    expect(result.actions).toContainEqual({ type: 'highlight', ids: ['p1', 'm1'] })
    expect(result.reply).toContain('Bearing wear')
  })

  it('filters by type', () => {
    const result = parseVoiceCommand('which pump is in danger', context())
    expect(result.actions).toContainEqual({ type: 'highlight', ids: ['p1'] })
  })

  it('says so when nothing is wrong', () => {
    const result = parseVoiceCommand('any problem', context({ assets: [assets[1]] }))
    expect(result.reply).toContain('Nothing is in danger')
  })
})

describe('asset commands', () => {
  it('focuses an asset when asked to show it', () => {
    const result = parseVoiceCommand('P-101 dikhao', context())
    expect(result.actions).toEqual([{ type: 'focus', id: 'p1' }])
    expect(result.reply).toContain('critical')
  })

  it('reads values when asked a question', () => {
    const result = parseVoiceCommand('wet well ka level kitna hai', context())
    expect(result.reply).toContain('Level: 62 %')
  })
})

describe('health scores', () => {
  it('colours the requested type by score', () => {
    const result = parseVoiceCommand('sabhi motors ka health score batao', context())
    expect(result.actions).toEqual([{ type: 'colorByScore', ids: ['m1'] }])
  })
})

describe('time', () => {
  const now = new Date('2026-03-10T15:30:00').getTime()

  it('parses relative and clock times', () => {
    expect(parseTimeReference('2 hours ago', now)).toBe(now - 2 * 3_600_000)
    expect(parseTimeReference('3 ghante pehle', now)).toBe(now - 3 * 3_600_000)
    const yesterday6 = new Date(parseTimeReference('kal subah 6 baje', now)!)
    expect([yesterday6.getDate(), yesterday6.getHours()]).toEqual([9, 6])
    const yesterday8pm = new Date(parseTimeReference('yesterday 8 pm', now)!)
    expect(yesterday8pm.getHours()).toBe(20)
    expect(parseTimeReference('hello', now)).toBeNull()
  })

  it('moves the timeline', () => {
    const result = parseVoiceCommand('show me 2 hours ago', context())
    expect(result.actions[0]).toEqual({
      type: 'jumpTime',
      timestamp: context().now - 2 * 3_600_000,
    })
  })
})

describe('tickets', () => {
  it('asks before creating, then creates on yes', () => {
    const proposal = parseVoiceCommand('P-101 ke liye ticket banao', context())
    expect(proposal.actions).toContainEqual({ type: 'proposeTicket', assetTag: 'P-101 Pump' })
    expect(proposal.actions.some((action) => action.type === 'createTicket')).toBe(false)

    const confirmed = parseVoiceCommand('haan kar do', context({ pendingTicketTag: 'P-101 Pump' }))
    expect(confirmed.actions).toEqual([{ type: 'createTicket', assetTag: 'P-101 Pump' }])

    const cancelled = parseVoiceCommand('nahi', context({ pendingTicketTag: 'P-101 Pump' }))
    expect(cancelled.actions).toEqual([{ type: 'cancelTicket' }])
  })

  it('asks which asset when none was named', () => {
    expect(parseVoiceCommand('create a ticket', context()).reply).toContain('Which asset')
  })
})

describe('other', () => {
  it('clears, goes live and falls back to help', () => {
    expect(parseVoiceCommand('clear', context()).actions).toEqual([{ type: 'clear' }])
    expect(parseVoiceCommand('wapas live', context()).actions).toEqual([{ type: 'goLive' }])
    expect(parseVoiceCommand('blah blah', context()).reply).toContain('You can say')
    expect(parseVoiceCommand('   ', context()).actions).toEqual([])
  })
})
