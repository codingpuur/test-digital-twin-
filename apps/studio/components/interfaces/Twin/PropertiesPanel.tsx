import { MousePointerClick } from 'lucide-react'
import { Badge } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { formatValue, getStatus, getStream, readStream } from './dashboards/mock-streams'
import type { TwinElement } from './twin.types'

type PropertiesPanelProps = {
  element: TwinElement | null
  /** Timestamp the readings are shown for. */
  time: number
}

const PROPERTY_FIELDS: { key: keyof TwinElement; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'level', label: 'Level' },
  { key: 'room', label: 'Room' },
  { key: 'system', label: 'System' },
  { key: 'source', label: 'Source' },
  { key: 'guid', label: 'GUID' },
]

export const PropertiesPanel = ({ element, time }: PropertiesPanelProps) => {
  const streams = (element?.streamIds ?? []).flatMap((id) => getStream(id) ?? [])

  return (
    <div className="flex h-full flex-col bg-dash-sidebar">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm uppercase tracking-wide">Properties</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!element && (
          <EmptyStatePresentational
            icon={MousePointerClick}
            title="No items selected"
            description="Use the left panels, viewer or inventory table to make a selection."
          />
        )}

        {element && (
          <div className="flex flex-col gap-y-6">
            <dl className="flex flex-col gap-y-3 text-sm">
              {PROPERTY_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex flex-col">
                  <dt className="text-xs text-foreground-lighter">{label}</dt>
                  <dd className="break-all">{(element[key] as string) || '-'}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-y-2">
              <h3 className="text-xs uppercase tracking-wide text-foreground-light">
                Readings at {new Date(time).toLocaleString()}
              </h3>
              {streams.length === 0 && (
                <p className="text-sm text-foreground-lighter">No streams linked to this element.</p>
              )}
              {streams.map((stream) => {
                const value = readStream(stream, time)
                const status = getStatus(stream, value)
                return (
                  <div
                    key={stream.id}
                    className="flex items-center justify-between rounded-md border bg-surface-100 px-3 py-2 text-sm"
                  >
                    <span>{stream.name}</span>
                    <span className="flex items-center gap-x-2">
                      {formatValue(stream, value)} {stream.unit}
                      <Badge variant={status === 'Warning' ? 'warning' : 'default'}>{status}</Badge>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
