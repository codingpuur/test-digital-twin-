import { parseTimestamp, type IncomingReading, type StreamMeta } from './streams'

// Turns the JSON an external API returns into readings. The API's structure is described by a
// mapping, so connecting a different API means writing a mapping, not code.

/** One value in the response and the stream it feeds. */
export type PollStreamSpec = StreamMeta & {
  /** Stream key, e.g. "P-101.vibration". */
  stream: string
  /** Where the value is in the response, e.g. "current.temperature" or "pumps[0].vib". */
  path: string
  /** value = raw * scale + offset, to convert units. */
  scale?: number
  offset?: number
}

export type PollMapping =
  /** One object holding many values (the usual "current state" endpoint). */
  | { kind: 'values'; timePath?: string; streams: PollStreamSpec[] }
  /** A list of rows, each one reading: `[{ "sensor": "P-101", "value": 2.9, "time": "..." }]`. */
  | {
      kind: 'rows'
      /** Path to the list; leave out when the response itself is the list. */
      rowsPath?: string
      streamPath: string
      valuePath: string
      timePath?: string
      /** Added in front of the stream path value, e.g. "plant." */
      streamPrefix?: string
      meta?: StreamMeta
    }

/** Reads `a.b[0].c` from parsed JSON. Returns undefined when any step is missing. */
export const getPath = (source: unknown, path: string): unknown => {
  if (path === '') return source
  const steps = path.split(/[.[\]]/).filter((step) => step !== '')
  let current: unknown = source
  for (const step of steps) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[step]
  }
  return current
}

export type MappedPoll = { readings: IncomingReading[]; skipped: number }

/** Values that are missing or not numbers are counted as skipped instead of failing the whole poll. */
export const mapPollResponse = (
  response: unknown,
  mapping: PollMapping,
  now = Date.now()
): MappedPoll => {
  const readings: IncomingReading[] = []
  let skipped = 0

  if (mapping.kind === 'values') {
    const ts = parseTimestamp(
      mapping.timePath ? getPath(response, mapping.timePath) : undefined,
      now
    )
    for (const spec of mapping.streams) {
      const raw = getPath(response, spec.path)
      const value = typeof raw === 'string' && raw.trim() === '' ? NaN : Number(raw)
      if (ts === null || raw === undefined || raw === null || Number.isNaN(value)) {
        skipped += 1
        continue
      }
      const { assetTag, parameter, unit, warnAbove } = spec
      readings.push({
        stream: spec.stream,
        value: +(value * (spec.scale ?? 1) + (spec.offset ?? 0)).toFixed(4),
        ts,
        meta: { assetTag, parameter, unit, warnAbove },
      })
    }
    return { readings, skipped }
  }

  const rows = getPath(response, mapping.rowsPath ?? '')
  if (!Array.isArray(rows)) return { readings, skipped: 1 }
  for (const row of rows) {
    const name = getPath(row, mapping.streamPath)
    const raw = getPath(row, mapping.valuePath)
    const value = Number(raw)
    const ts = parseTimestamp(mapping.timePath ? getPath(row, mapping.timePath) : undefined, now)
    if (
      (typeof name !== 'string' && typeof name !== 'number') ||
      raw === undefined ||
      raw === null ||
      Number.isNaN(value) ||
      ts === null
    ) {
      skipped += 1
      continue
    }
    readings.push({
      stream: `${mapping.streamPrefix ?? ''}${name}`,
      value,
      ts,
      meta: mapping.meta,
    })
  }
  return { readings, skipped }
}
