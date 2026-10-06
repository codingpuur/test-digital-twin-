import { ConfirmationModal } from 'ui-patterns/Dialogs/ConfirmationModal'

import type { ImportDiff } from '@/lib/twin/assets'

type ImportDiffModalProps = {
  diff: ImportDiff | null
  fileName: string
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

const NameList = ({ label, names }: { label: string; names: string[] }) =>
  names.length > 0 && (
    <div>
      <p>
        {names.length} {label}
      </p>
      <p className="max-h-24 overflow-y-auto break-words text-foreground-lighter">
        {names.join(', ')}
      </p>
    </div>
  )

export const ImportDiffModal = ({
  diff,
  fileName,
  isLoading,
  onConfirm,
  onCancel,
}: ImportDiffModalProps) => (
  <ConfirmationModal
    visible={diff !== null}
    loading={isLoading}
    title={`Replace the model with ${fileName}?`}
    description="Assets are matched by tag (then GUID). Your edits, sensor links and tickets stay with matched assets."
    confirmLabel="Apply new model"
    onConfirm={onConfirm}
    onCancel={onCancel}
  >
    {diff && (
      <div className="flex flex-col gap-y-2 text-sm">
        <p>{diff.matched} assets matched</p>
        <NameList label="new assets" names={diff.added} />
        <NameList label="no longer in the model (kept, marked removed)" names={diff.removed} />
      </div>
    )}
  </ConfirmationModal>
)
