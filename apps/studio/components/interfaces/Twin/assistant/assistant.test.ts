import { describe, expect, it } from 'vitest'

import { seedChats } from './assistant-data'
import { answerFor } from './assistant-engine'
import { greetingFor, groupChats, groupOf, titleFromQuestion } from './assistant.utils'

const HOUR = 60 * 60 * 1000

describe('answerFor', () => {
  it('routes questions to the matching script', () => {
    expect(answerFor('Why is M-101 dropping?').chart?.series).toHaveLength(2)
    expect(answerFor('Forecast tomorrow').chart?.series[1].isDashed).toBe(true)
    expect(answerFor('List open tickets').list?.length).toBeGreaterThan(0)
  })

  it('prefers ticket answers over other keywords', () => {
    expect(answerFor('Create a ticket for the bearing fault on P-101').intro).toContain('tickets')
  })

  it('falls back to a list of things to try', () => {
    const answer = answerFor('hello there')
    expect(answer.list?.length).toBeGreaterThan(0)
    expect(answer.actions).toEqual([])
  })

  it('gives every chart series one value per label', () => {
    for (const question of ['Why is M-101 dropping?', 'Forecast tomorrow', 'Compare vibration']) {
      const chart = answerFor(question).chart!
      chart.series.forEach((item) => expect(item.values).toHaveLength(chart.labels.length))
    }
  })
})

describe('chat grouping', () => {
  const noon = new Date('2026-03-10T12:00:00').getTime()

  it('groups by calendar day', () => {
    expect(groupOf(noon - 1 * HOUR, noon)).toBe('Today')
    expect(groupOf(noon - 13 * HOUR, noon)).toBe('Yesterday')
    expect(groupOf(noon - 5 * 24 * HOUR, noon)).toBe('Earlier')
  })

  it('orders newest first and drops empty groups', () => {
    const groups = groupChats(seedChats(noon), noon)
    expect(groups.map((entry) => entry.group)).toEqual(['Today', 'Yesterday', 'Earlier'])
    expect(groups[0].chats[0].id).toBe('seed-score')
  })

  it('shortens long titles and greets by time of day', () => {
    expect(titleFromQuestion('a'.repeat(80)).length).toBe(48)
    expect(titleFromQuestion('  hi   there ')).toBe('hi there')
    expect(greetingFor(9)).toBe('Good morning')
    expect(greetingFor(14)).toBe('Good afternoon')
    expect(greetingFor(20)).toBe('Good evening')
  })
})
