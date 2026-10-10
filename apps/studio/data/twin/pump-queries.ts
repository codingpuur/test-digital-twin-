import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { pumpKeys } from './pump-keys'
import type {
  PumpLayer,
  PumpLayerInfo,
  PumpLayerWhich,
  PumpMesh,
  PumpMeta,
  PumpSummary,
  PumpTelemetryLatest,
  PumpWhatIfDefaults,
  PumpWhatIfRequest,
  PumpWhatIfResult,
} from './pump-types'
import { twinFetchJson } from './twin-api'

const NO_CHANGES: PumpWhatIfRequest = {
  mode: 'consistent',
  driver: 'head_m',
  vfd: false,
  over: {},
  faults: {},
}

// Every call goes through the site's proxy; the pump twin API's key never reaches the browser.
const pumpPath = (ref: string, path: string) => `/${ref}/pump/${path}`

export const usePumpMetaQuery = (ref: string | undefined) =>
  useQuery({
    queryKey: pumpKeys.meta(ref),
    queryFn: () => twinFetchJson<PumpMeta>(pumpPath(ref!, 'meta')),
    enabled: Boolean(ref),
    staleTime: 5 * 60_000,
    retry: false,
  })

export const usePumpListQuery = (ref: string | undefined, isEnabled: boolean) =>
  useQuery({
    queryKey: pumpKeys.list(ref),
    queryFn: async () =>
      (await twinFetchJson<{ pumps: PumpSummary[] }>(pumpPath(ref!, 'pumps'))).pumps,
    enabled: Boolean(ref) && isEnabled,
    refetchInterval: 30_000,
  })

export const usePumpDefaultsQuery = (ref: string | undefined, pump: number | undefined) =>
  useQuery({
    queryKey: pumpKeys.defaults(ref, pump),
    queryFn: () =>
      twinFetchJson<PumpWhatIfDefaults>(pumpPath(ref!, `pumps/${pump}/whatif/defaults`)),
    enabled: Boolean(ref) && pump !== undefined,
    // The baseline moves with every new reading, so the defaults are re-read when the pump changes.
    staleTime: 0,
  })

export const usePumpMeshQuery = (ref: string | undefined, isEnabled: boolean) =>
  useQuery({
    queryKey: pumpKeys.mesh(ref),
    queryFn: () => twinFetchJson<PumpMesh>(pumpPath(ref!, 'model/mesh')),
    enabled: Boolean(ref) && isEnabled,
    staleTime: Infinity,
  })

export const usePumpLatestQuery = (ref: string | undefined, pump: number | undefined) =>
  useQuery({
    queryKey: pumpKeys.latest(ref, pump),
    queryFn: () =>
      twinFetchJson<PumpTelemetryLatest>(pumpPath(ref!, `pumps/${pump}/telemetry/latest`)),
    enabled: Boolean(ref) && pump !== undefined,
    refetchInterval: 5_000,
  })

/** The pump as it is now: a what-if with nothing changed. The backend decides every status in it. */
export const usePumpBaselineQuery = (ref: string | undefined, pump: number | undefined) =>
  useQuery({
    queryKey: pumpKeys.baseline(ref, pump),
    queryFn: () =>
      twinFetchJson<PumpWhatIfResult>(pumpPath(ref!, `pumps/${pump}/whatif`), {
        method: 'POST',
        body: JSON.stringify(NO_CHANGES),
      }),
    enabled: Boolean(ref) && pump !== undefined,
    refetchInterval: 60_000,
  })

export const usePumpWhatIfMutation = (ref: string | undefined, pump: number | undefined) =>
  useMutation({
    mutationFn: (payload: PumpWhatIfRequest) =>
      twinFetchJson<PumpWhatIfResult>(pumpPath(ref!, `pumps/${pump}/whatif`), {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onError: (error: Error) => toast.error(error.message),
  })

/** Which 3D layers the last run has. Wait for a run first: the backend keeps the layers of the last run. */
export const usePumpLayersQuery = (
  ref: string | undefined,
  pump: number | undefined,
  which: PumpLayerWhich,
  isEnabled: boolean
) =>
  useQuery({
    queryKey: pumpKeys.layers(ref, pump, which),
    queryFn: async () =>
      (
        await twinFetchJson<{ layers: PumpLayerInfo[] }>(
          pumpPath(ref!, `pumps/${pump}/layers?which=${which}`)
        )
      ).layers,
    enabled: Boolean(ref) && pump !== undefined && isEnabled,
  })

export const usePumpLayerQuery = (
  ref: string | undefined,
  pump: number | undefined,
  which: PumpLayerWhich,
  key: string | null,
  /** Changes with each run, so a new scenario fetches its own values. */
  runId: number
) =>
  useQuery({
    queryKey: [...pumpKeys.layer(ref, pump, which, key), runId],
    queryFn: () =>
      twinFetchJson<PumpLayer>(pumpPath(ref!, `pumps/${pump}/layers/${key}?which=${which}`)),
    enabled: Boolean(ref) && pump !== undefined && key !== null,
    staleTime: Infinity,
  })
