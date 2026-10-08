import { elementTag } from '../asset-bridge'
import type { TwinElement } from '../twin.types'
import type { VoiceAsset } from './voice.types'

/** Sample health scores, matching the Assistant and Insights samples. Other assets get a steady score. */
const SAMPLE_SCORES: Record<string, number> = {
  'P-101 Pump': 38,
  'M-101 Motor': 62,
  'P-102 Pump': 71,
  'M-102 Motor': 84,
  'M-103 Motor': 88,
  'P-103 Pump': 91,
}

const hashScore = (value: string) =>
  80 + [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 19, 7)

export const getSampleScore = (element: Pick<TwinElement, 'name' | 'tag'>) =>
  SAMPLE_SCORES[element.name] ?? hashScore(element.tag ?? element.name)

/** Risks of the demo station, told the same way as in the Assistant. */
const DEMO_RISKS: Record<string, NonNullable<VoiceAsset['risk']>> = {
  'P-101 Pump': {
    level: 'critical',
    reason:
      'Bearing wear is severe. Vibration rose from 3 to 7.4 millimetres per second in 14 days, and about 9 days of life are left.',
  },
  'M-101 Motor': {
    level: 'warning',
    reason:
      'Phase B current has run 7 percent above the other phases since August 20, and a rotor bar fault is developing.',
  },
}

export type StreamRisk = { assetTag: string; reason: string }

export const buildVoiceAssets = (
  elements: TwinElement[],
  options: { isDemo: boolean; streamRisks: StreamRisk[] }
): VoiceAsset[] =>
  elements
    .filter((element) => element.hasGeometry !== false)
    .map((element) => {
      const tag = elementTag(element)
      const streamRisk = options.streamRisks.find((risk) => risk.assetTag === tag)
      const demoRisk = options.isDemo ? DEMO_RISKS[element.name] : undefined
      return {
        id: element.id,
        tag,
        name: element.displayName ?? element.name,
        category: element.category,
        score: options.isDemo ? getSampleScore(element) : 100,
        risk: demoRisk ?? (streamRisk ? { level: 'warning', reason: streamRisk.reason } : null),
      }
    })

export const SCORE_COLORS = { healthy: '#3ecf8e', watch: '#e5a23b', critical: '#e5484d' } as const

export const colorForScore = (score: number) =>
  score >= 80 ? SCORE_COLORS.healthy : score >= 50 ? SCORE_COLORS.watch : SCORE_COLORS.critical
