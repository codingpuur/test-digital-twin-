import fs from 'fs'
import path from 'path'

import { readDb } from './store'
import { saveReadings } from './twin-ingest'
import { mapPollResponse, type PollMapping } from '@/lib/twin/poll-mapping'
import { POLL_PRESETS } from '@/lib/twin/poll-presets'

// Pulls readings from an external HTTP API on the server, so the API key never reaches the browser
// and there is no CORS. Polls lazily: when the app asks for the streams and the last poll is older
// than the interval. That works the same locally and on serverless hosts, which cannot run loops.

export type PollConfig = {
  label: string
  url: string
  headers: Record<string, string>
  intervalSec: number
  mapping: PollMapping
}

export type PollStatus = {
  isConfigured: boolean
  label: string
  /** Host and path only: never the query string, which can carry a key. */
  source: string
  intervalSec: number
  lastPollAt: number | null
  lastError: string | null
  lastAccepted: number
  lastSkipped: number
  totalAccepted: number
}

const FETCH_TIMEOUT_MS = 5000
const DEFAULT_INTERVAL_SEC = 5

const parseJsonEnv = <T>(value: string | undefined, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/** Reads the poll settings from the environment; null when polling is not set up. */
export const getPollConfig = (
  env: Record<string, string | undefined> = process.env
): PollConfig | null => {
  const preset = env.TWIN_POLL_PRESET ? POLL_PRESETS[env.TWIN_POLL_PRESET] : undefined
  const url = env.TWIN_POLL_URL || preset?.url
  if (!url) return null

  let mapping = preset?.mapping
  if (env.TWIN_POLL_MAPPING_FILE) {
    mapping = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), env.TWIN_POLL_MAPPING_FILE), 'utf8')
    ) as PollMapping
  }
  if (!mapping) return null

  const interval = Number(env.TWIN_POLL_INTERVAL_SEC)
  return {
    label: preset && !env.TWIN_POLL_URL ? preset.label : 'Custom API',
    url,
    headers: parseJsonEnv<Record<string, string>>(env.TWIN_POLL_HEADERS, {}),
    intervalSec: interval > 0 ? interval : DEFAULT_INTERVAL_SEC,
    mapping,
  }
}

type SiteState = {
  lastPollAt: number | null
  lastError: string | null
  lastAccepted: number
  lastSkipped: number
  totalAccepted: number
  inFlight: Promise<void> | null
}

// On globalThis so dev-server hot reloads do not forget the last poll.
const globalState = globalThis as unknown as { __twinPollState?: Map<string, SiteState> }
const states = (globalState.__twinPollState ??= new Map<string, SiteState>())

const stateOf = (siteRef: string): SiteState => {
  let state = states.get(siteRef)
  if (!state) {
    state = {
      lastPollAt: null,
      lastError: null,
      lastAccepted: 0,
      lastSkipped: 0,
      totalAccepted: 0,
      inFlight: null,
    }
    states.set(siteRef, state)
  }
  return state
}

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : 'Could not reach the API'

const fetchAndStore = async (siteRef: string, config: PollConfig, state: SiteState) => {
  try {
    const response = await fetch(config.url, {
      headers: { accept: 'application/json', ...config.headers },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`The API answered ${response.status}`)
    const { readings, skipped } = mapPollResponse(await response.json(), config.mapping)

    // The API may return the same reading until it updates; storing it again would only add noise.
    const db = readDb()
    const lastTs = new Map(
      db.streams
        .filter((stream) => stream.site_ref === siteRef)
        .map((stream) => [stream.key, stream.lastTs])
    )
    const fresh = readings.filter(
      (reading) => reading.ts === undefined || reading.ts !== lastTs.get(reading.stream)
    )
    if (fresh.length > 0) saveReadings(siteRef, fresh)

    state.lastError = null
    state.lastAccepted = fresh.length
    state.lastSkipped = skipped
    state.totalAccepted += fresh.length
  } catch (error) {
    // A broken API must never break the app: keep the old data and show the error.
    state.lastError = describeError(error)
    state.lastAccepted = 0
  } finally {
    state.lastPollAt = Date.now()
  }
}

/** Polls when the last poll is older than the interval (or `force`). Concurrent calls share one poll. */
export const pollIfDue = async (siteRef: string, options: { force?: boolean } = {}) => {
  const config = getPollConfig()
  if (!config) return
  const state = stateOf(siteRef)
  const isDue =
    options.force ||
    state.lastPollAt === null ||
    Date.now() - state.lastPollAt >= config.intervalSec * 1000
  if (!isDue && !state.inFlight) return
  state.inFlight ??= fetchAndStore(siteRef, config, state).finally(() => {
    state.inFlight = null
  })
  await state.inFlight
}

export const getPollStatus = (siteRef: string): PollStatus => {
  const config = getPollConfig()
  const state = stateOf(siteRef)
  const parsed = config ? new URL(config.url) : null
  return {
    isConfigured: config !== null,
    label: config?.label ?? '',
    source: parsed ? `${parsed.host}${parsed.pathname}` : '',
    intervalSec: config?.intervalSec ?? DEFAULT_INTERVAL_SEC,
    lastPollAt: state.lastPollAt,
    lastError: state.lastError,
    lastAccepted: state.lastAccepted,
    lastSkipped: state.lastSkipped,
    totalAccepted: state.totalAccepted,
  }
}
