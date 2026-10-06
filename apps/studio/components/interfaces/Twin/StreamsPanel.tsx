import { useParams } from 'common'
import { Waves } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { elementTag } from './asset-bridge'
import { Sparkline } from './Sparkline'
import type { TwinElement } from './twin.types'
import {
  useTwinStreamsQuery,
  useUpdateTwinStreamMutation,
  type TwinStreamRow,
} from '@/data/twin/twin-queries'
import { isWarningValue } from '@/lib/twin/streams'

const UNMAPPED = '__unmapped'

type MappingForm = { assetTag: string; parameter: string; unit: string; warnAbove: string }

const StreamRow = ({
  stream,
  assetTags,
  isSaving,
  onSave,
}: {
  stream: TwinStreamRow
  assetTags: string[]
  isSaving: boolean
  onSave: (stream: TwinStreamRow, values: MappingForm) => void
}) => {
  const { control, register, handleSubmit, formState } = useForm<MappingForm>({
    defaultValues: {
      assetTag: stream.assetTag || UNMAPPED,
      parameter: stream.parameter,
      unit: stream.unit,
      warnAbove: stream.warnAbove === null ? '' : String(stream.warnAbove),
    },
  })

  return (
    <form
      className="flex flex-col gap-y-2 rounded-md border bg-surface-100 p-3"
      onSubmit={handleSubmit((values) => onSave(stream, values))}
    >
      <div className="flex items-center justify-between gap-x-2">
        <span className="break-all text-sm">{stream.key}</span>
        <Badge
          variant={
            isWarningValue(stream.lastValue, stream.warnAbove)
              ? 'warning'
              : stream.assetTag
                ? 'success'
                : 'default'
          }
        >
          {stream.assetTag
            ? isWarningValue(stream.lastValue, stream.warnAbove)
              ? 'Warning'
              : 'Mapped'
            : 'Unmapped'}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-foreground-lighter">
        <span>
          {stream.lastValue === null ? 'No data' : `Last: ${+stream.lastValue.toFixed(2)}`}
          {stream.lastTs ? ` · ${new Date(stream.lastTs).toLocaleTimeString()}` : ''}
        </span>
        <Sparkline values={stream.readings.slice(-40).map((reading) => reading.value)} />
      </div>

      <Controller
        control={control}
        name="assetTag"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger size="tiny" aria-label="Asset">
              <SelectValue>{field.value === UNMAPPED ? 'Select asset' : field.value}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNMAPPED}>Not mapped</SelectItem>
              {assetTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <div className="grid grid-cols-3 gap-x-2">
        <Input size="tiny" placeholder="Name" aria-label="Parameter" {...register('parameter')} />
        <Input size="tiny" placeholder="Unit" aria-label="Unit" {...register('unit')} />
        <Input
          size="tiny"
          type="number"
          step="any"
          placeholder="Warn >"
          aria-label="Warn above"
          {...register('warnAbove')}
        />
      </div>
      {formState.isDirty && (
        <Button
          type="submit"
          size="tiny"
          variant="primary"
          loading={isSaving}
          className="self-start"
        >
          Save mapping
        </Button>
      )}
    </form>
  )
}

export const StreamsPanel = ({ elements }: { elements: TwinElement[] }) => {
  const { ref } = useParams()
  const { data } = useTwinStreamsQuery(ref)
  const updateStream = useUpdateTwinStreamMutation(ref)
  const streams = data?.streams ?? []
  const assetTags = [...new Set(elements.map(elementTag))].sort()

  if (streams.length === 0) {
    return (
      <EmptyStatePresentational
        icon={Waves}
        title="No streams yet"
        description="Streams appear here when data arrives. Send readings from Connections, then map each stream to an asset."
      />
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      <p className="text-sm text-foreground-light">
        Map each stream to an asset parameter to see it in properties and colour the asset.
      </p>
      {streams.map((stream) => (
        <StreamRow
          // Remount when the mapping changes server-side so the form shows saved values.
          key={`${stream.id}-${stream.assetTag}-${stream.parameter}-${stream.unit}-${stream.warnAbove}`}
          stream={stream}
          assetTags={assetTags}
          isSaving={updateStream.isPending}
          onSave={(item, values) =>
            updateStream.mutate({
              id: item.id,
              assetTag: values.assetTag === UNMAPPED ? '' : values.assetTag,
              parameter: values.parameter.trim(),
              unit: values.unit.trim(),
              warnAbove: values.warnAbove === '' ? null : Number(values.warnAbove),
            })
          }
        />
      ))}
    </div>
  )
}
