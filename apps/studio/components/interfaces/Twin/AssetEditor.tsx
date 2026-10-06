import { useForm } from 'react-hook-form'
import { Button, Input } from 'ui'

import { EDITABLE_FIELDS, type EditableValues } from '@/lib/twin/assets'

const LABELS: Record<keyof EditableValues, string> = {
  name: 'Name',
  category: 'Category',
  level: 'Level',
  room: 'Room',
  system: 'System',
}

type AssetEditorProps = {
  values: EditableValues
  isSaving: boolean
  onSave: (values: EditableValues) => void
  onCancel: () => void
}

export const AssetEditor = ({ values, isSaving, onSave, onCancel }: AssetEditorProps) => {
  const { register, handleSubmit } = useForm<EditableValues>({ defaultValues: values })

  return (
    <form className="flex flex-col gap-y-3" onSubmit={handleSubmit(onSave)}>
      {EDITABLE_FIELDS.map((key) => (
        <label key={key} className="flex flex-col gap-y-1 text-xs text-foreground-lighter">
          {LABELS[key]}
          <Input size="tiny" {...register(key)} />
        </label>
      ))}
      <div className="flex gap-x-2">
        <Button type="submit" variant="primary" size="tiny" loading={isSaving}>
          Save
        </Button>
        <Button type="button" variant="default" size="tiny" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
