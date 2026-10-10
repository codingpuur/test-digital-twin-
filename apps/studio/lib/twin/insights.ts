// AI/ML analysis of one piece of equipment. The platform only displays it: the numbers come from
// the ML service (or from sample data until one is connected).

export type FaultSeverity = 'critical' | 'warning'

export type EquipmentFault = {
  id: string
  title: string
  detail: string
  severity: FaultSeverity
  detectedHoursAgo: number
  /** 0-100 */
  confidence: number
}

export type PastFault = { id: string; title: string; daysAgo: number }

export type EquipmentInsights = {
  tag: string
  name: string
  type: string
  /** 0-100, higher is healthier. */
  health: number
  /** Remaining useful life in days. */
  rulDays: number
  rulMarginDays: number
  anomaly: 'none' | 'low' | 'high'
  nextAction: string
  faults: EquipmentFault[]
  history: PastFault[]
  rootCause: string
  trend: { label: string; unit: string; limit?: number; values: number[] }
  forecast: string
}

export type HealthStatus = 'healthy' | 'attention' | 'critical'

export const healthStatus = (score: number): HealthStatus => {
  if (score >= 85) return 'healthy'
  if (score >= 60) return 'attention'
  return 'critical'
}

export const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  attention: 'Needs attention',
  critical: 'Critical',
}

export const formatRul = (days: number) => {
  if (days >= 730) return `${(days / 365).toFixed(1)} years`
  if (days >= 60) return `${Math.round(days / 30)} months`
  return `${days} days`
}

export const formatAge = (hoursAgo: number) => {
  if (hoursAgo < 1) return 'just now'
  if (hoursAgo < 24) return `${Math.round(hoursAgo)} h ago`
  return `${Math.round(hoursAgo / 24)} d ago`
}
