import { useState } from 'react'
import type * as THREE from 'three'

import { elementsToImportRows } from './asset-bridge'
import { collectElements } from './model-loaders'
import {
  useImportTwinAssetsMutation,
  useTwinAssetsQuery,
  useTwinModelFileQuery,
  useTwinModelQuery,
  useUpdateTwinAssetMutation,
  useUploadTwinModelMutation,
} from '@/data/twin/twin-queries'
import {
  toOverride,
  type AssetImportRow,
  type EditableValues,
  type ImportDiff,
} from '@/lib/twin/assets'
import { csvToImportRows } from '@/lib/twin/csv'

type PendingImport = { file: File; scene: THREE.Object3D; rows: AssetImportRow[]; diff: ImportDiff }

/**
 * The site's saved model and asset records. A freshly parsed model is first compared with the
 * existing assets; if any exist the user confirms the diff before it replaces them.
 */
export const useTwinStore = (ref: string | undefined) => {
  const modelQuery = useTwinModelQuery(ref)
  const fileQuery = useTwinModelFileQuery(ref, modelQuery.data)
  const assetsQuery = useTwinAssetsQuery(ref)
  const uploadModel = useUploadTwinModelMutation(ref)
  const importAssets = useImportTwinAssetsMutation(ref)
  const updateAsset = useUpdateTwinAssetMutation(ref)

  const [pending, setPending] = useState<PendingImport | null>(null)
  const [csvResult, setCsvResult] = useState<{ fileName: string; diff: ImportDiff } | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)

  const assets = assetsQuery.data ?? []

  const commit = async (file: File, rows: AssetImportRow[]) => {
    const model = await uploadModel.mutateAsync(file)
    await importAssets.mutateAsync({ rows, mode: 'model', source: file.name })
    return model.revision
  }

  /** Returns the new revision when applied straight away, or null when waiting for confirmation. */
  const requestModelImport = async (file: File, scene: THREE.Object3D) => {
    const rows = elementsToImportRows(collectElements(scene))
    if (assets.length === 0) return commit(file, rows)

    const { diff } = await importAssets.mutateAsync({
      rows,
      mode: 'model',
      source: file.name,
      dryRun: true,
    })
    setPending({ file, scene, rows, diff })
    return null
  }

  const confirmPending = async () => {
    if (!pending) return null
    const revision = await commit(pending.file, pending.rows)
    const applied = pending
    setPending(null)
    return { ...applied, revision }
  }

  const importCsv = async (file: File) => {
    setCsvError(null)
    const parsed = csvToImportRows(await file.text())
    if (parsed.status === 'error') {
      setCsvError(parsed.message)
      return
    }
    const { diff } = await importAssets.mutateAsync({
      rows: parsed.rows,
      mode: 'csv',
      source: file.name,
    })
    setCsvResult({ fileName: file.name, diff })
  }

  const saveEdits = (assetId: string, edited: EditableValues) => {
    const asset = assets.find((item) => item.id === assetId)
    if (!asset) return Promise.resolve()
    return updateAsset.mutateAsync({ id: assetId, override: toOverride(asset.imported, edited) })
  }

  const revertEdits = (assetId: string) => updateAsset.mutateAsync({ id: assetId, override: {} })

  return {
    model: modelQuery.data ?? null,
    savedFile: fileQuery.data ?? null,
    isRestoring: modelQuery.isLoading || fileQuery.isLoading,
    assets,
    pending,
    cancelPending: () => setPending(null),
    isCommitting: uploadModel.isPending || importAssets.isPending,
    requestModelImport,
    confirmPending,
    csvResult,
    csvError,
    isImportingCsv: importAssets.isPending,
    importCsv,
    saveEdits,
    revertEdits,
    isSavingEdits: updateAsset.isPending,
  }
}
