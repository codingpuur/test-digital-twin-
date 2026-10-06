import { useParams } from 'common'
import { Download, FileText, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'ui'
import { ConfirmationModal } from 'ui-patterns/Dialogs/ConfirmationModal'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import { elementTag } from './asset-bridge'
import type { TwinElement } from './twin.types'
import {
  downloadTwinDoc,
  useDeleteTwinDocMutation,
  useTwinDocsQuery,
  useUploadTwinDocMutation,
} from '@/data/twin/twin-workspace-queries'
import { formatFileSize, type TwinDoc } from '@/lib/twin/workspace'

const NONE = '__none'

export const DocsPanel = ({ elements }: { elements: TwinElement[] }) => {
  const { ref } = useParams()
  const { data: docs = [] } = useTwinDocsQuery(ref)
  const uploadDoc = useUploadTwinDocMutation(ref)
  const deleteDoc = useDeleteTwinDocMutation(ref)
  const inputRef = useRef<HTMLInputElement>(null)

  const [assetTag, setAssetTag] = useState(NONE)
  const [docToDelete, setDocToDelete] = useState<TwinDoc | null>(null)
  const assetTags = [...new Set(elements.map(elementTag))].sort()

  const handleFile = (file: File) =>
    uploadDoc.mutate(
      { file, assetTag: assetTag === NONE ? '' : assetTag },
      { onSuccess: () => toast.success(`Uploaded ${file.name}`) }
    )

  return (
    <div className="flex flex-col gap-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
      />
      <div className="flex flex-col gap-y-2 rounded-md border bg-surface-100 p-3">
        <p className="text-xs text-foreground-light">Link the next upload to an asset (optional)</p>
        <Select value={assetTag} onValueChange={setAssetTag}>
          <SelectTrigger size="tiny" aria-label="Asset for upload">
            <SelectValue>{assetTag === NONE ? 'No asset' : assetTag}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No asset</SelectItem>
            {assetTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="primary"
          loading={uploadDoc.isPending}
          onClick={() => inputRef.current?.click()}
        >
          Upload document
        </Button>
      </div>

      {docs.length === 0 && (
        <EmptyStatePresentational
          icon={FileText}
          title="No documents yet"
          description="Keep manuals, datasheets and P&IDs next to the assets they belong to."
        />
      )}

      {docs.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-x-2 rounded-md border bg-surface-100 px-3 py-2"
        >
          <FileText size={16} className="shrink-0 text-foreground-lighter" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{doc.name}</p>
            <p className="truncate text-xs text-foreground-lighter">
              {formatFileSize(doc.size)} · {doc.assetTag || 'No asset'}
            </p>
          </div>
          <Button
            variant="text"
            size="tiny"
            aria-label={`Download ${doc.name}`}
            icon={<Download size={14} />}
            onClick={() => ref && downloadTwinDoc(ref, doc)}
          />
          <Button
            variant="text"
            size="tiny"
            aria-label={`Delete ${doc.name}`}
            icon={<Trash2 size={14} />}
            onClick={() => setDocToDelete(doc)}
          />
        </div>
      ))}

      <ConfirmationModal
        visible={docToDelete !== null}
        title={`Delete ${docToDelete?.name}?`}
        description="The file is removed for everyone on the site."
        confirmLabel="Delete document"
        loading={deleteDoc.isPending}
        onCancel={() => setDocToDelete(null)}
        onConfirm={() =>
          docToDelete && deleteDoc.mutate(docToDelete.id, { onSuccess: () => setDocToDelete(null) })
        }
      />
    </div>
  )
}
