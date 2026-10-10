import { Badge, Button } from 'ui'

import { getEquipmentInsights } from './sample-insights'
import { TrendChart } from './TrendChart'
import {
  formatAge,
  formatRul,
  HEALTH_LABELS,
  healthStatus,
  type HealthStatus,
} from '@/lib/twin/insights'

type InsightsTabProps = {
  /** Tag of the equipment the selected part belongs to; empty when it belongs to none. */
  equipmentTag: string
  partName: string
  partCount: number
  canEdit: boolean
  onEdit: () => void
  onCreateTicket: (title: string) => void
}

const HEALTH_RING: Record<HealthStatus, string> = {
  healthy: 'border-brand',
  attention: 'border-warning',
  critical: 'border-destructive',
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-y-2 rounded-md border bg-surface-100 p-3">
    <h3 className="text-xs uppercase tracking-wide text-foreground-light">{title}</h3>
    {children}
  </div>
)

export const InsightsTab = ({
  equipmentTag,
  partName,
  partCount,
  canEdit,
  onEdit,
  onCreateTicket,
}: InsightsTabProps) => {
  if (equipmentTag === '') {
    return (
      <div className="flex flex-col gap-y-3 text-sm text-foreground-light">
        <p>
          {partName} is not part of any equipment, so there is no analysis to show. Analysis
          (health, faults, remaining life) is calculated for a whole equipment, such as a pump with
          its motor.
        </p>
        <p>
          Set the same <span className="text-foreground">Equipment</span> value on its parts: add an
          Equipment column to the CSV, or edit the part.
        </p>
        {canEdit && (
          <Button size="tiny" variant="default" className="self-start" onClick={onEdit}>
            Edit part
          </Button>
        )}
      </div>
    )
  }

  const insights = getEquipmentInsights(equipmentTag)
  const status = healthStatus(insights.health)

  return (
    <div className="flex flex-col gap-y-3">
      <p className="rounded-md border border-info/40 bg-info/10 px-3 py-2 text-xs text-foreground-light">
        This analysis is for the whole <span className="text-foreground">{insights.name}</span> (
        {partCount} {partCount === 1 ? 'part' : 'parts'}), not only {partName}.
      </p>

      <Section title="Asset health">
        <div className="flex items-center gap-x-3">
          <div
            className={`flex h-16 w-16 flex-none items-center justify-center rounded-full border-4 text-xl ${HEALTH_RING[status]}`}
          >
            {insights.health}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{HEALTH_LABELS[status]}</p>
            <p className="text-xs text-foreground-lighter">{insights.type}</p>
            <p className="text-xs text-foreground-lighter">Next: {insights.nextAction}</p>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-x-3">
        <div className="rounded-md border bg-surface-100 p-3">
          <p className="text-xs text-foreground-lighter">Remaining life</p>
          <p className="text-base">{formatRul(insights.rulDays)}</p>
          <p className="text-xs text-foreground-lighter">± {insights.rulMarginDays} days</p>
        </div>
        <div className="rounded-md border bg-surface-100 p-3">
          <p className="text-xs text-foreground-lighter">Anomaly</p>
          <p
            className={`text-base capitalize ${insights.anomaly === 'high' ? 'text-destructive' : ''}`}
          >
            {insights.anomaly}
          </p>
          <p className="text-xs text-foreground-lighter">last 24 h</p>
        </div>
      </div>

      <Section title={`Active faults (${insights.faults.length})`}>
        {insights.faults.length === 0 && (
          <p className="text-sm text-foreground-lighter">No active faults.</p>
        )}
        {insights.faults.map((fault) => (
          <div key={fault.id} className="flex items-start justify-between gap-x-2 text-sm">
            <div className="min-w-0">
              <p className="flex items-center gap-x-2">
                <Badge variant={fault.severity === 'critical' ? 'destructive' : 'warning'}>
                  {fault.severity === 'critical' ? 'Critical' : 'Warning'}
                </Badge>
                <span>{fault.title}</span>
              </p>
              <p className="text-xs text-foreground-lighter">
                {fault.detail} · {formatAge(fault.detectedHoursAgo)} · confidence {fault.confidence}
                %
              </p>
            </div>
            <Button
              size="tiny"
              variant="default"
              onClick={() => onCreateTicket(`${insights.tag}: ${fault.title}`)}
            >
              Ticket
            </Button>
          </div>
        ))}
      </Section>

      <Section title={`Trend: ${insights.trend.label} (${insights.trend.unit})`}>
        <TrendChart values={insights.trend.values} limit={insights.trend.limit} />
        <p className="text-xs text-foreground-lighter">{insights.forecast}</p>
      </Section>

      <Section title="Root cause">
        <p className="text-sm text-foreground-light">{insights.rootCause}</p>
      </Section>

      <Section title="Fault history">
        {insights.history.length === 0 && (
          <p className="text-sm text-foreground-lighter">No past faults.</p>
        )}
        {insights.history.map((past) => (
          <div key={past.id} className="flex justify-between text-sm">
            <span>{past.title}</span>
            <span className="text-foreground-lighter">{past.daysAgo} d ago · resolved</span>
          </div>
        ))}
      </Section>
    </div>
  )
}
