import { MousePointerClick } from 'lucide-react'
import { Badge } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import type { TwinElement } from '../twin.types'
import type { PumpMeta, PumpWhatIfView } from '@/data/twin/pump-types'

type PumpPropertiesProps = {
  element: TwinElement | null
  view: PumpWhatIfView | undefined
  meta: PumpMeta
}

const BADGE = { ok: 'default', watch: 'warning', act: 'destructive' } as const

/** Health of the pump and of the selected part's component, as the backend scored it. */
export const PumpProperties = ({ element, view, meta }: PumpPropertiesProps) => {
  const component = view?.components.find((item) => item.key === element?.system)
  const alarms = view?.alarms.filter((alarm) => alarm.component === element?.system) ?? []

  return (
    <div className="flex h-full flex-col bg-dash-sidebar">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm uppercase tracking-wide">Properties</h2>
      </div>
      <div className="flex flex-1 flex-col gap-y-4 overflow-y-auto p-4">
        {view && (
          <div className="flex flex-col gap-y-1 rounded-md border bg-surface-100 p-3">
            <span className="text-xs text-foreground-lighter">Pump health</span>
            <span className="flex items-center gap-x-2 text-lg">
              {view.health.index}
              <span className="text-xs text-foreground-lighter">/ 100</span>
              <Badge variant={BADGE[view.health.status]}>{view.health.label}</Badge>
            </span>
            <span className="text-xs text-foreground-lighter">
              Now: {view.health.baseline_index}
            </span>
          </div>
        )}

        {!element && (
          <EmptyStatePresentational
            icon={MousePointerClick}
            title="No part selected"
            description="Select a part in the 3D view to see how its component is doing."
          />
        )}

        {element && (
          <div className="flex flex-col gap-y-3">
            <div>
              <p className="text-xs text-foreground-lighter">Part</p>
              <p className="break-words text-sm">{element.name}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-lighter">Role</p>
              <p className="text-sm">{element.category}</p>
            </div>
            {component && (
              <div className="flex flex-col gap-y-1.5 rounded-md border bg-surface-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{component.label}</span>
                  <Badge variant={BADGE[component.status]}>
                    {meta.status_labels[component.status]}
                  </Badge>
                </div>
                <p className="text-2xl">{component.value}</p>
                <p className="text-xs text-foreground-light">{component.why}</p>
              </div>
            )}
            {!component && (
              <p className="text-sm text-foreground-lighter">This part is not scored on its own.</p>
            )}
            {alarms.map((alarm) => (
              <div key={alarm.text} className="flex flex-col gap-y-1 rounded-md border p-2.5">
                <Badge variant={alarm.severity === 'act' ? 'destructive' : 'warning'}>
                  {alarm.area}
                </Badge>
                <p className="text-sm">{alarm.text}</p>
                <p className="text-xs text-foreground-light">{alarm.recommendation}</p>
              </div>
            ))}
          </div>
        )}

        {view && (
          <div className="flex flex-col gap-y-1.5">
            <h3 className="text-xs uppercase tracking-wide text-foreground-light">Components</h3>
            {view.components.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-md border bg-surface-100 px-3 py-1.5 text-sm"
              >
                {item.label}
                <span className="flex items-center gap-x-2">
                  {item.value}
                  <Badge variant={BADGE[item.status]}>{meta.status_labels[item.status]}</Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
