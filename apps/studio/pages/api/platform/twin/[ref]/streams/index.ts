import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { readDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'
import { getIngestKey } from '@/lib/mock/twin-ingest'
import { pollIfDue } from '@/lib/mock/twin-poll'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  // Pulls fresh readings from the external API first, when one is configured and the last poll is old.
  await pollIfDue(site.ref)

  const db = readDb()
  const streams = db.streams
    .filter((stream) => stream.site_ref === site.ref)
    // Capped per stream on write, so the whole series is small enough to send for replay.
    .map((stream) => ({ ...stream, readings: db.readings[stream.id] ?? [] }))
  return res.status(200).json({ streams, ingestKey: getIngestKey(site.ref) })
}
