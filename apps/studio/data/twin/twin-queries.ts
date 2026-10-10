import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { twinFetch, twinFetchJson } from './twin-api'
import type {
  AssetFields,
  AssetImportRow,
  ImportDiff,
  ImportMode,
  TwinAsset,
} from '@/lib/twin/assets'
import type { StreamReading, TwinStream } from '@/lib/twin/streams'

export type TwinModelMeta = {
  name: string
  format: string
  size: number
  revision: number
  uploaded_at: string
}

export const twinKeys = {
  model: (ref: string | undefined) => ['twin', ref, 'model'] as const,
  modelFile: (ref: string | undefined, revision: number | undefined) =>
    ['twin', ref, 'model-file', revision] as const,
  assets: (ref: string | undefined) => ['twin', ref, 'assets'] as const,
  streams: (ref: string | undefined) => ['twin', ref, 'streams'] as const,
  poll: (ref: string | undefined) => ['twin', ref, 'poll'] as const,
}

export const useTwinModelQuery = (ref: string | undefined) =>
  useQuery({
    queryKey: twinKeys.model(ref),
    queryFn: async () =>
      (await twinFetchJson<{ model: TwinModelMeta | null }>(`/${ref}/model`)).model,
    enabled: Boolean(ref),
  })

/** The model file as a browser `File`, so it goes through the same loaders as a fresh upload. */
export const useTwinModelFileQuery = (
  ref: string | undefined,
  model: TwinModelMeta | null | undefined
) =>
  useQuery({
    queryKey: twinKeys.modelFile(ref, model?.revision),
    queryFn: async () => {
      const blob = await (await twinFetch(`/${ref}/model-file`)).blob()
      return new File([blob], model!.name)
    },
    enabled: Boolean(ref) && Boolean(model),
    staleTime: Infinity,
  })

export const useTwinAssetsQuery = (ref: string | undefined) =>
  useQuery({
    queryKey: twinKeys.assets(ref),
    queryFn: async () => (await twinFetchJson<{ assets: TwinAsset[] }>(`/${ref}/assets`)).assets,
    enabled: Boolean(ref),
  })

export const useUploadTwinModelMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const response = await twinFetch(`/${ref}/model`, {
        method: 'PUT',
        headers: { 'X-File-Name': encodeURIComponent(file.name) },
        body: file,
      })
      return ((await response.json()) as { model: TwinModelMeta }).model
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: twinKeys.model(ref) }),
  })
}

export type ImportAssetsVariables = {
  rows: AssetImportRow[]
  mode: ImportMode
  source: string
  dryRun?: boolean
}

export const useImportTwinAssetsMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: ImportAssetsVariables) =>
      twinFetchJson<{ diff: ImportDiff; assets: TwinAsset[] }>(`/${ref}/assets`, {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_data, variables) => {
      if (!variables.dryRun) queryClient.invalidateQueries({ queryKey: twinKeys.assets(ref) })
    },
  })
}

export const useUpdateTwinAssetMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, override }: { id: string; override: Partial<AssetFields> }) =>
      twinFetchJson<{ asset: TwinAsset }>(`/${ref}/assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ override }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: twinKeys.assets(ref) }),
  })
}

export type TwinStreamRow = TwinStream & { readings: StreamReading[] }

export const useTwinStreamsQuery = (ref: string | undefined) =>
  useQuery({
    queryKey: twinKeys.streams(ref),
    queryFn: () =>
      twinFetchJson<{ streams: TwinStreamRow[]; ingestKey: string }>(`/${ref}/streams`),
    enabled: Boolean(ref),
    // Readings arrive from outside the app, so poll to keep the twin live.
    refetchInterval: 3000,
  })

export type TwinPollStatus = {
  isConfigured: boolean
  label: string
  source: string
  intervalSec: number
  lastPollAt: number | null
  lastError: string | null
  lastAccepted: number
  lastSkipped: number
  totalAccepted: number
}

/** State of the server-side poll of an external API (configured with TWIN_POLL_* settings). */
export const useTwinPollStatusQuery = (ref: string | undefined) =>
  useQuery({
    queryKey: twinKeys.poll(ref),
    queryFn: () => twinFetchJson<TwinPollStatus>(`/${ref}/poll`),
    enabled: Boolean(ref),
    refetchInterval: 3000,
  })

export const usePollTwinNowMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => twinFetchJson<TwinPollStatus>(`/${ref}/poll`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twinKeys.poll(ref) })
      queryClient.invalidateQueries({ queryKey: twinKeys.streams(ref) })
    },
  })
}

export const useUpdateTwinStreamMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...mapping
    }: { id: string } & Pick<TwinStream, 'assetTag' | 'parameter' | 'unit' | 'warnAbove'>) =>
      twinFetchJson<{ stream: TwinStream }>(`/${ref}/streams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(mapping),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: twinKeys.streams(ref) }),
  })
}

export const usePostTwinReadingsMutation = (ref: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (readings: { stream: string; value: number; ts?: number }[]) =>
      twinFetchJson<{ accepted: number; rejected: number }>(`/${ref}/readings`, {
        method: 'POST',
        body: JSON.stringify({ readings }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: twinKeys.streams(ref) }),
  })
}
