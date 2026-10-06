import { answerFor } from './assistant-engine'
import type { Chat } from './assistant.types'

const HOUR = 60 * 60 * 1000

const chat = (id: string, question: string, updatedAt: number): Chat => ({
  id,
  title: question,
  updatedAt,
  messages: [
    { id: `${id}-q`, role: 'user', text: question },
    { id: `${id}-a`, role: 'assistant', answer: answerFor(question) },
  ],
})

/** Sample conversations so the history is not empty on a new site. */
export const seedChats = (now: number): Chat[] => [
  chat('seed-score', 'Why is M-101’s score dropping?', now - 0.3 * HOUR),
  chat('seed-forecast', 'Forecast tomorrow’s power consumption', now - 3 * HOUR),
  chat('seed-tickets', 'List open tickets for the pump room', now - 27 * HOUR),
  chat('seed-compare', 'Compare P-101 and P-102 vibration', now - 30 * HOUR),
  chat('seed-report', 'Summarize the weekly health report', now - 6 * 24 * HOUR),
]

export const SUGGESTED_PROMPTS = [
  'What changed on P-101 in the last 24 hours?',
  'Why is M-101’s health score dropping?',
  'Forecast tomorrow’s power consumption for the pump room.',
  'List open tickets for the pump room.',
]

export type AttentionCard = {
  level: 'Critical' | 'Warning' | 'Ok'
  asset: string
  detail: string
  footer: string
  trend: number[]
}

export const ATTENTION_CARDS: AttentionCard[] = [
  {
    level: 'Critical',
    asset: 'P-101 Pump',
    detail: 'Bearing wear severe, RUL about 9 days.',
    footer: 'Detected 5 min ago',
    trend: [22, 20, 21, 17, 18, 12, 9, 6, 3],
  },
  {
    level: 'Warning',
    asset: 'M-101 Motor',
    detail: 'Current imbalance on phase B.',
    footer: 'Detected 12 min ago',
    trend: [16, 18, 14, 17, 12, 15, 9, 12, 7],
  },
  {
    level: 'Ok',
    asset: 'P-103 Pump',
    detail: 'Score 91, no active faults.',
    footer: 'Stable for 14 days',
    trend: [16, 14, 17, 13, 16, 14, 16, 13, 15],
  },
  {
    level: 'Ok',
    asset: 'Power forecast',
    detail: 'Tomorrow peak 412 kW at 14:00.',
    footer: 'Within contract limit',
    trend: [22, 18, 10, 6, 8, 14, 20],
  },
]
