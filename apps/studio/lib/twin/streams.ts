import { parseCsv } from './csv'

// Sensor streams: a stream is one named series of numbers (e.g. "P-101.vibration"). It is mapped
// to one asset parameter; readings arrive over HTTP or from a CSV.

export type TwinStream = {
  id: string
  /** Name the sender uses, e.g. "P-101.vibration". Unique per site. */
  key: string
  /** Asset tag this stream reports on ('' while unmapped). */
  assetTag: string
  /** Parameter shown on the asset, e.g. "Vibration". */
  parameter: string
  unit: string
  warnAbove: number | null
  lastValue: number | null
  lastTs: number | null
}

export type StreamReading = { ts: number; value: number }

/** How a brand-new stream is set up. Never applied to a stream that already exists, so edits stay. */
export type StreamMeta = Partial<Pick<TwinStream, 'assetTag' | 'parameter' | 'unit' | 'warnAbove'>>

export type IncomingReading = { stream: string; value: number; ts?: number; meta?: StreamMeta }

export const MAX_READINGS_PER_STREAM = 500

/** Accepts ISO strings or epoch seconds/milliseconds. Returns epoch ms, or null if unreadable. */
export const parseTimestamp = (input: unknown, now = Date.now()): number | null => {
  if (input === undefined || input === null || input === '') return now
  if (typeof input === 'number' || /^\d+(\.\d+)?$/.test(String(input))) {
    const numeric = Number(input)
    // Anything below 1e11 is epoch seconds (year 5138 in ms), otherwise milliseconds.
    return numeric < 1e11 ? numeric * 1000 : numeric
  }
  const parsed = Date.parse(String(input))
  return Number.isNaN(parsed) ? null : parsed
}

/** Validates a request body of one reading or a list. Bad items are counted, not fatal. */
export const normalizeReadings = (body: unknown, now = Date.now()) => {
  const items = Array.isArray(body) ? body : ((body as { readings?: unknown })?.readings ?? [body])
  const readings: IncomingReading[] = []
  let rejected = 0
  for (const item of items as Record<string, unknown>[]) {
    const value = Number(item?.value)
    const ts = parseTimestamp(item?.ts, now)
    if (
      typeof item?.stream !== 'string' ||
      item.stream.trim() === '' ||
      Number.isNaN(value) ||
      ts === null
    ) {
      rejected += 1
      continue
    }
    readings.push({ stream: item.stream.trim(), value, ts })
  }
  return { readings, rejected }
}

type StreamStore = {
  streams: TwinStream[]
  readings: Record<string, StreamReading[]>
}

/** Appends readings, creating unknown streams as unmapped so the user can map them later. */
export const ingestReadings = (
  store: StreamStore,
  incoming: IncomingReading[],
  createId: () => string
): StreamStore => {
  const streams = store.streams.map((stream) => ({ ...stream }))
  const readings = { ...store.readings }

  for (const item of incoming) {
    let stream = streams.find((existing) => existing.key === item.stream)
    if (!stream) {
      stream = {
        id: createId(),
        key: item.stream,
        assetTag: item.meta?.assetTag ?? '',
        parameter: item.meta?.parameter ?? '',
        unit: item.meta?.unit ?? '',
        warnAbove: item.meta?.warnAbove ?? null,
        lastValue: null,
        lastTs: null,
      }
      streams.push(stream)
    }
    const ts = item.ts ?? Date.now()
    const series = [...(readings[stream.id] ?? []), { ts, value: item.value }]
    series.sort((a, b) => a.ts - b.ts)
    readings[stream.id] = series.slice(-MAX_READINGS_PER_STREAM)
    const latest = readings[stream.id].at(-1)!
    stream.lastValue = latest.value
    stream.lastTs = latest.ts
  }
  return { streams, readings }
}

/**
 * CSV to readings. Long format: `timestamp,stream,value`. Wide format: a `timestamp` column plus one
 * column per stream (the usual historian / spreadsheet export).
 */
export const csvToReadings = (
  text: string
): { status: 'success'; readings: IncomingReading[] } | { status: 'error'; message: string } => {
  const [headers, ...body] = parseCsv(text)
  if (!headers) return { status: 'error', message: 'The CSV file is empty.' }
  const names = headers.map((header) => header.trim().toLowerCase())
  const timeIndex = names.findIndex((name) => ['timestamp', 'time', 'ts', 'date'].includes(name))
  if (timeIndex === -1) {
    return { status: 'error', message: 'Add a "timestamp" column (ISO time or epoch).' }
  }

  const streamIndex = names.indexOf('stream')
  const valueIndex = names.indexOf('value')
  const readings: IncomingReading[] = []

  for (const cells of body) {
    const ts = parseTimestamp(cells[timeIndex]?.trim())
    if (ts === null) continue
    if (streamIndex !== -1 && valueIndex !== -1) {
      readings.push({
        stream: cells[streamIndex]?.trim() ?? '',
        value: Number(cells[valueIndex]),
        ts,
      })
      continue
    }
    headers.forEach((header, index) => {
      if (index === timeIndex || (cells[index] ?? '').trim() === '') return
      readings.push({ stream: header.trim(), value: Number(cells[index]), ts })
    })
  }

  const valid = readings.filter((reading) => reading.stream !== '' && !Number.isNaN(reading.value))
  if (valid.length === 0) return { status: 'error', message: 'No readings found in this CSV.' }
  return { status: 'success', readings: valid }
}

/**
 * The reading in force at `atMs`: the latest one at or before it. `null` means no data yet at that
 * time. `atMs = null` means live, i.e. the newest reading.
 */
export const readingAt = (readings: StreamReading[], atMs: number | null): StreamReading | null => {
  if (atMs === null) return readings.at(-1) ?? null
  // Readings are time-ordered, so scan back from the end.
  for (let index = readings.length - 1; index >= 0; index--) {
    if (readings[index].ts <= atMs) return readings[index]
  }
  return null
}

export const readingsBetween = (readings: StreamReading[], fromMs: number, toMs: number) =>
  readings.filter((reading) => reading.ts >= fromMs && reading.ts <= toMs)

export const isWarningValue = (value: number | null, warnAbove: number | null) =>
  warnAbove !== null && value !== null && value > warnAbove
