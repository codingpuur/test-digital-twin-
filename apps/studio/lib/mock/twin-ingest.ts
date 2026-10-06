import crypto from 'crypto'

import { readDb, writeDb } from './store'
import { ingestReadings, type IncomingReading, type TwinStream } from '@/lib/twin/streams'

export const getIngestKey = (siteRef: string) => {
  const db = readDb()
  if (!db.ingestKeys[siteRef]) {
    db.ingestKeys[siteRef] = `ipt_${crypto.randomBytes(18).toString('base64url')}`
    writeDb(db)
  }
  return db.ingestKeys[siteRef]
}

export const saveReadings = (siteRef: string, incoming: IncomingReading[]) => {
  const db = readDb()
  const siteStreams: TwinStream[] = db.streams.filter((stream) => stream.site_ref === siteRef)
  const next = ingestReadings({ streams: siteStreams, readings: db.readings }, incoming, () =>
    crypto.randomUUID()
  )
  db.streams = [
    ...db.streams.filter((stream) => stream.site_ref !== siteRef),
    ...next.streams.map((stream) => ({ ...stream, site_ref: siteRef })),
  ]
  db.readings = next.readings
  writeDb(db)
  return { accepted: incoming.length }
}
