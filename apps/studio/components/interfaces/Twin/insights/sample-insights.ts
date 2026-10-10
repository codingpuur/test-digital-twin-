import type { EquipmentInsights } from '@/lib/twin/insights'

// Sample analysis until the ML service is connected. Swap `getEquipmentInsights` for a call to it:
// the rest of the UI only depends on the `EquipmentInsights` shape.

const SAMPLE: Record<string, EquipmentInsights> = {
  'P-101': {
    tag: 'P-101',
    name: 'Pump-Motor Unit P-101',
    type: 'Centrifugal pump with electric motor',
    health: 72,
    rulDays: 41,
    rulMarginDays: 6,
    anomaly: 'high',
    nextAction: 'Replace drive-end bearing in about 5 weeks',
    faults: [
      {
        id: 'f1',
        title: 'Bearing wear (drive end)',
        detail: 'Vibration 7.8 mm/s and rising for 3 days',
        severity: 'critical',
        detectedHoursAgo: 4,
        confidence: 91,
      },
      {
        id: 'f2',
        title: 'Motor winding temperature high',
        detail: '84 °C, limit 80 °C',
        severity: 'warning',
        detectedHoursAgo: 28,
        confidence: 78,
      },
    ],
    history: [
      { id: 'h1', title: 'Seal leak', daysAgo: 28 },
      { id: 'h2', title: 'Cavitation', daysAgo: 43 },
    ],
    rootCause:
      'Likely shaft misalignment at the coupling, which loads the drive-end bearing. Check alignment and lubrication.',
    trend: {
      label: 'Vibration',
      unit: 'mm/s',
      limit: 9,
      values: [3.1, 3, 3.2, 3.4, 3.3, 3.8, 4.2, 4.9, 5.8, 6.5, 7.1, 7.8],
    },
    forecast: 'Vibration is expected to cross the 9 mm/s trip limit in about 9 days.',
  },
}

const hash = (text: string) =>
  [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)

const generated = (tag: string): EquipmentInsights => {
  const seed = hash(tag)
  const health = 88 + (seed % 11)
  return {
    tag,
    name: tag,
    type: 'Equipment',
    health,
    rulDays: 400 + (seed % 700),
    rulMarginDays: 30 + (seed % 40),
    anomaly: 'none',
    nextAction: 'Routine inspection in 90 days',
    faults: [],
    history: [],
    rootCause: 'No active fault. Behavior is within the normal range.',
    trend: {
      label: 'Vibration',
      unit: 'mm/s',
      values: Array.from({ length: 12 }, (_, index) => 1 + ((seed >> index) % 7) / 20),
    },
    forecast: 'No threshold crossing expected in the next 30 days.',
  }
}

export const getEquipmentInsights = (tag: string): EquipmentInsights =>
  SAMPLE[tag] ?? generated(tag)
