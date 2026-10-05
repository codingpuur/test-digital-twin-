import { useMemo, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogSectionSeparator,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from 'ui'

import { DashboardCardView } from './DashboardCardView'
import {
  CARD_DEFINITIONS,
  type CardConfig,
  type CardDefinition,
  type DashboardCard,
  type DateRangeId,
} from './dashboards.types'
import { MOCK_STREAMS } from './mock-streams'

const SAMPLE_STREAMS: Record<string, string[]> = {
  'parameter-value': ['power'],
  'parameters-summary': ['flow', 'pressure', 'level', 'power'],
  'value-over-time': ['flow', 'pressure'],
  'aggregate-value': ['level'],
  'last-value': ['level'],
  'custom-text': [],
}

const FORMATS = ['All', 'Value', 'Chart', 'Table', 'Text']

type AddCardDialogProps = {
  open: boolean
  rangeId: DateRangeId
  now: number
  onOpenChange: (open: boolean) => void
  onAdd: (card: Omit<DashboardCard, 'id'>) => void
}

export const AddCardDialog = ({ open, rangeId, now, onOpenChange, onAdd }: AddCardDialogProps) => {
  const [definition, setDefinition] = useState<CardDefinition | null>(null)
  const [format, setFormat] = useState('All')
  const [search, setSearch] = useState('')
  const [config, setConfig] = useState<CardConfig>({ streamIds: [] })
  const [useSampleData, setUseSampleData] = useState(false)

  const filtered = useMemo(
    () =>
      CARD_DEFINITIONS.filter(
        (item) =>
          (format === 'All' || item.format === format) &&
          item.label.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [format, search]
  )

  const groups = [...new Set(filtered.map((item) => item.group))]

  const reset = () => {
    setDefinition(null)
    setConfig({ streamIds: [] })
    setUseSampleData(false)
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) reset()
    onOpenChange(value)
  }

  const canAdd =
    !!definition &&
    (definition.type === 'custom-text' ? !!config.text : config.streamIds.length > 0)

  const toggleStream = (streamId: string, max: number) =>
    setConfig((previous) => {
      const selected = previous.streamIds.includes(streamId)
      if (selected)
        return { ...previous, streamIds: previous.streamIds.filter((id) => id !== streamId) }
      return { ...previous, streamIds: [...previous.streamIds, streamId].slice(-max) }
    })

  const previewConfig: CardConfig =
    useSampleData || !definition
      ? {
          streamIds: SAMPLE_STREAMS[definition?.type ?? ''] ?? [],
          text: config.text,
          title: config.title,
        }
      : config

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="xlarge" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add a card{definition ? ` / ${definition.label}` : ''}</DialogTitle>
        </DialogHeader>
        <DialogSectionSeparator />

        {!definition && (
          <DialogSection className="flex max-h-[60vh] flex-col gap-y-4 overflow-y-auto">
            <div className="flex gap-x-3">
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((item) => (
                    <SelectItem key={item} value={item}>
                      Format: {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-72"
                placeholder="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search cards"
              />
            </div>
            {groups.map((group) => (
              <div key={group} className="flex flex-col gap-y-3">
                <h4 className="text-sm text-foreground-light">{group}</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {filtered
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          setDefinition(item)
                          setConfig({ streamIds: [], text: '' })
                        }}
                        className="flex flex-col overflow-hidden rounded-md border bg-surface-100 text-left transition-colors hover:border-foreground-muted"
                      >
                        <div className="pointer-events-none h-44 overflow-hidden p-3">
                          <DashboardCardView
                            card={{
                              id: 'preview',
                              type: item.type,
                              config: { streamIds: SAMPLE_STREAMS[item.type] ?? [] },
                            }}
                            rangeId={rangeId}
                            now={now}
                            isSample
                          />
                        </div>
                        <div className="border-t px-3 py-2 text-sm">{item.label}</div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-foreground-lighter">No cards match your search.</p>
            )}
          </DialogSection>
        )}

        {definition && (
          <DialogSection className="grid max-h-[60vh] grid-cols-1 gap-6 overflow-y-auto md:grid-cols-5">
            <div className="flex flex-col gap-y-4 md:col-span-2">
              <h4 className="text-sm uppercase tracking-wide">Configurations</h4>
              {definition.type === 'custom-text' ? (
                <>
                  <Input
                    placeholder="Title (optional)"
                    value={config.title ?? ''}
                    onChange={(event) => setConfig({ ...config, title: event.target.value })}
                  />
                  <Textarea
                    rows={4}
                    placeholder="Write your text"
                    value={config.text ?? ''}
                    onChange={(event) => setConfig({ ...config, text: event.target.value })}
                  />
                </>
              ) : (
                <div className="flex flex-col gap-y-2">
                  <p className="text-sm">
                    Stream
                    <span className="ml-2 text-foreground-lighter">
                      (up to {definition.maxStreams})
                    </span>
                  </p>
                  {MOCK_STREAMS.map((stream) => (
                    <label
                      key={stream.id}
                      className="flex cursor-pointer items-center gap-x-2 text-sm"
                    >
                      <Checkbox
                        checked={config.streamIds.includes(stream.id)}
                        onCheckedChange={() => toggleStream(stream.id, definition.maxStreams)}
                      />
                      <span className="flex-1">{stream.name}</span>
                      <span className="text-foreground-lighter">{stream.unit}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-foreground-lighter">
                Date range follows the dashboard date range.
              </p>
            </div>
            <div className="flex flex-col gap-y-3 md:col-span-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm uppercase tracking-wide">Preview</h4>
                <label className="flex items-center gap-x-2 text-sm text-foreground-light">
                  Real data
                  <Switch checked={useSampleData} onCheckedChange={setUseSampleData} />
                  Sample data
                </label>
              </div>
              <div className="h-72 rounded-md border bg-surface-100 p-4">
                {!useSampleData && !canAdd ? (
                  <div className="flex h-full flex-col items-center justify-center gap-y-1 text-center">
                    <p>Preview not available</p>
                    <p className="text-sm text-foreground-lighter">
                      Select all fields to see preview
                    </p>
                  </div>
                ) : (
                  <DashboardCardView
                    card={{ id: 'preview', type: definition.type, config: previewConfig }}
                    rangeId={rangeId}
                    now={now}
                    isSample={useSampleData}
                  />
                )}
              </div>
              <p className="text-xs text-foreground-lighter">{definition.description}</p>
            </div>
          </DialogSection>
        )}

        <DialogSectionSeparator />
        <DialogFooter>
          {definition ? (
            <>
              <Button variant="default" onClick={reset}>
                Back
              </Button>
              <Button
                variant="primary"
                disabled={!canAdd}
                onClick={() => {
                  onAdd({ type: definition.type, config })
                  handleOpenChange(false)
                }}
              >
                OK
              </Button>
            </>
          ) : (
            <Button variant="default" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
