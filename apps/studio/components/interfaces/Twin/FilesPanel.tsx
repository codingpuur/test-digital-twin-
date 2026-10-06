import { FileSpreadsheet, FileUp } from 'lucide-react'
import { useRef } from 'react'
import { Button } from 'ui'
import { EmptyStatePresentational } from 'ui-patterns/EmptyStatePresentational'

import type { ImportDiff } from '@/lib/twin/assets'

type FilesPanelProps = {
  modelName: string
  revision?: number
  elementCount: number
  isLoadingModel: boolean
  isImportingCsv: boolean
  modelError: string | null
  csvResult: { fileName: string; diff: ImportDiff } | null
  csvError: string | null
  onUploadModel: (file: File) => void
  onUploadCsv: (file: File) => void
  onUseDemo: () => void
}

const FileButton = ({
  accept,
  loading,
  variant = 'default',
  children,
  onFile,
}: {
  accept: string
  loading: boolean
  variant?: 'default' | 'primary'
  children: React.ReactNode
  onFile: (file: File) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
      <Button variant={variant} loading={loading} onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
    </>
  )
}

export const FilesPanel = ({
  modelName,
  revision,
  elementCount,
  isLoadingModel,
  isImportingCsv,
  modelError,
  csvResult,
  csvError,
  onUploadModel,
  onUploadCsv,
  onUseDemo,
}: FilesPanelProps) => (
  <div className="flex flex-col gap-y-4">
    <EmptyStatePresentational
      icon={FileUp}
      title="3D model"
      description="Upload a GLB, glTF or IFC file. It is saved with the site and its elements become assets."
    >
      <FileButton
        accept=".glb,.gltf,.ifc"
        loading={isLoadingModel}
        variant="primary"
        onFile={onUploadModel}
      >
        Upload model
      </FileButton>
      <Button variant="default" onClick={onUseDemo}>
        Use demo model
      </Button>
    </EmptyStatePresentational>
    {modelError && <p className="text-sm text-destructive">{modelError}</p>}

    <div className="rounded-md border bg-surface-100 p-3 text-sm">
      <p className="text-foreground-light">Current model</p>
      <p>{modelName}</p>
      <p className="text-foreground-lighter">
        {elementCount} elements{revision ? ` · revision ${revision}` : ''}
      </p>
    </div>

    <EmptyStatePresentational
      icon={FileSpreadsheet}
      title="Asset data (CSV)"
      description='Add category, level, system and properties from a CSV or SolidWorks BOM. Rows match the model by a "tag" or "name" column.'
    >
      <FileButton accept=".csv" loading={isImportingCsv} onFile={onUploadCsv}>
        Import CSV
      </FileButton>
    </EmptyStatePresentational>
    {csvError && <p className="text-sm text-destructive">{csvError}</p>}
    {csvResult && (
      <div className="rounded-md border bg-surface-100 p-3 text-sm">
        <p className="text-foreground-light">{csvResult.fileName}</p>
        <p>
          {csvResult.diff.matched} {csvResult.diff.matched === 1 ? 'row' : 'rows'} matched the model
        </p>
        {csvResult.diff.unmatched.length > 0 && (
          <div className="mt-2">
            <p className="text-warning">
              {csvResult.diff.unmatched.length}{' '}
              {csvResult.diff.unmatched.length === 1 ? 'row' : 'rows'} matched nothing and added
              without 3D:
            </p>
            <p className="max-h-32 overflow-y-auto break-words text-foreground-lighter">
              {csvResult.diff.unmatched.join(', ')}
            </p>
          </div>
        )}
      </div>
    )}
  </div>
)
