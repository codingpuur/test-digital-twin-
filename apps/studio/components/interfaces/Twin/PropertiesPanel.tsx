import { Layers, MousePointerClick } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { elementTag } from './asset-bridge'
import { AssetEditor } from './AssetEditor'
import { InsightsTab } from './insights/InsightsTab'
import type { AnimationBinding } from './simulation/animation.types'
import { BindingsSection } from './simulation/BindingsSection'
import { getElementReadings, type ElementReading, type Signals } from './simulation/signals'
import { Sparkline } from './Sparkline'
import type { TwinElement } from './twin.types'
import type { EditableValues } from '@/lib/twin/assets'
import type { TwinTicket } from '@/lib/twin/workspace'

type PropertiesPanelProps = {
  element: TwinElement | null
  signals: Signals
  /** What the readings below come from, shown in their heading. */
  readingsLabel: string
  /** Readings from mapped sensor streams, shown after the simulated ones. */
  streamReadings: ElementReading[]
  /** The simulated readings are keyed by the demo's element names, so only the demo gets them. */
  isDemoModel: boolean
  bindings: AnimationBinding[]
  onBindingsChange: (bindings: AnimationBinding[]) => void
  /** Tickets of the site, to show the ones about the selected asset. */
  tickets: TwinTicket[]
  onCreateTicket: (assetTag: string) => void
  /** How many parts share the selected element's equipment (itself included). */
  equipmentPartCount: number
  isUnitHighlighted: boolean
  onToggleUnitHighlight: () => void
  isSavingEdits: boolean
  onSaveEdits: (assetId: string, values: EditableValues) => Promise<unknown>
  onRevertEdits: (assetId: string) => Promise<unknown>
}

const PROPERTY_FIELDS: { key: keyof TwinElement; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'level', label: 'Level' },
  { key: 'room', label: 'Room' },
  { key: 'system', label: 'System' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'source', label: 'Source' },
  { key: 'guid', label: 'GUID' },
]

export const PropertiesPanel = ({
  element,
  signals,
  readingsLabel,
  streamReadings,
  isDemoModel,
  bindings,
  onBindingsChange,
  tickets,
  onCreateTicket,
  equipmentPartCount,
  isUnitHighlighted,
  onToggleUnitHighlight,
  isSavingEdits,
  onSaveEdits,
  onRevertEdits,
}: PropertiesPanelProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tab, setTab] = useState('properties')
  const simulatedReadings = element && isDemoModel ? getElementReadings(element, signals) : []
  const readings = [...simulatedReadings, ...streamReadings]
  const assetTickets = element
    ? tickets.filter(
        (ticket) => ticket.assetTag === elementTag(element) && ticket.status !== 'done'
      )
    : []

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
          <div className="flex flex-col gap-y-4">
            {element.equipment && (
              <button
                type="button"
                onClick={onToggleUnitHighlight}
                className="flex items-center gap-x-2 rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-left text-sm text-brand hover:bg-brand/20"
              >
                <Layers size={14} className="flex-none" />
                <span className="min-w-0 flex-1 truncate">Part of {element.equipment}</span>
                <span className="flex-none text-xs text-foreground-lighter">
                  {isUnitHighlighted ? 'Hide unit' : `Highlight ${equipmentPartCount} parts`}
                </span>
              </button>
            )}
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="gap-x-5">
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>
              <TabsContent value="insights" className="mt-4">
                <InsightsTab
                  equipmentTag={element.equipment ?? ''}
                  partName={element.displayName ?? element.name}
                  partCount={equipmentPartCount}
                  canEdit={!!element.assetId}
                  onEdit={() => {
                    setTab('properties')
                    setIsEditing(true)
                  }}
                  onCreateTicket={() => onCreateTicket(elementTag(element))}
                />
              </TabsContent>
              <TabsContent value="properties" className="mt-4">
                <div className="flex flex-col gap-y-6">
                  {isEditing && element.assetId && (
                    <AssetEditor
                      // Remount per element so the form never shows the previous one's values.
                      key={element.id}
                      values={{
                        name: element.displayName ?? element.name,
                        category: element.category,
                        level: element.level,
                        room: element.room,
                        system: element.system,
                        equipment: element.equipment ?? '',
                      }}
                      isSaving={isSavingEdits}
                      onSave={async (values) => {
                        await onSaveEdits(element.assetId!, values)
                        setIsEditing(false)
                      }}
                      onCancel={() => setIsEditing(false)}
                    />
                  )}
                  {!isEditing && (
                    <dl className="flex flex-col gap-y-3 text-sm">
                      {PROPERTY_FIELDS.map(({ key, label }) => (
                        <div key={key} className="flex flex-col">
                          <dt className="text-xs text-foreground-lighter">{label}</dt>
                          <dd className="break-all">
                            {key === 'name'
                              ? (element.displayName ?? element.name)
                              : (element[key] as string) || '-'}
                          </dd>
                        </div>
                      ))}
                      {Object.entries(element.properties ?? {}).map(([label, value]) => (
                        <div key={label} className="flex flex-col">
                          <dt className="text-xs text-foreground-lighter">{label}</dt>
                          <dd className="break-all">{value}</dd>
                        </div>
                      ))}
                      {element.assetId && (
                        <div className="flex gap-x-2">
                          <Button size="tiny" variant="default" onClick={() => setIsEditing(true)}>
                            Edit
                          </Button>
                          {element.isEdited && (
                            <Button
                              size="tiny"
                              variant="default"
                              onClick={() => onRevertEdits(element.assetId!)}
                            >
                              Revert to imported
                            </Button>
                          )}
                        </div>
                      )}
                    </dl>
                  )}

                  <div className="flex flex-col gap-y-2">
                    <h3 className="text-xs uppercase tracking-wide text-foreground-light">
                      Readings ({readingsLabel})
                    </h3>
                    {readings.length === 0 && (
                      <p className="text-sm text-foreground-lighter">
                        No signals linked to this element.
                      </p>
                    )}
                    {readings.map((reading, index) => (
                      <div
                        key={`${reading.label}-${index}`}
                        className="flex items-center justify-between rounded-md border bg-surface-100 px-3 py-2 text-sm"
                      >
                        <span>{reading.label}</span>
                        <span className="flex items-center gap-x-2">
                          {reading.history && <Sparkline values={reading.history} />}
                          {reading.value}
                          <Badge variant={reading.isWarning ? 'warning' : 'default'}>
                            {reading.isWarning ? 'Warning' : 'Normal'}
                          </Badge>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-y-2">
                    <h3 className="text-xs uppercase tracking-wide text-foreground-light">
                      Tickets
                    </h3>
                    {assetTickets.length === 0 && (
                      <p className="text-sm text-foreground-lighter">
                        No open tickets for this asset.
                      </p>
                    )}
                    {assetTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between gap-x-2 rounded-md border bg-surface-100 px-3 py-2 text-sm"
                      >
                        <span className="truncate">
                          T-{ticket.number} {ticket.title}
                        </span>
                        <Badge variant={ticket.priority === 'high' ? 'destructive' : 'default'}>
                          {ticket.status === 'open' ? 'Open' : 'In progress'}
                        </Badge>
                      </div>
                    ))}
                    <Button
                      size="tiny"
                      variant="default"
                      className="self-start"
                      onClick={() => onCreateTicket(elementTag(element))}
                    >
                      Create ticket
                    </Button>
                  </div>

                  <BindingsSection
                    elementName={element.name}
                    bindings={bindings}
                    onChange={onBindingsChange}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
