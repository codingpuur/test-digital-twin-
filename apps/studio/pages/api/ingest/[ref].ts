import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { readDb } from '@/lib/mock/store'
import { saveReadings } from '@/lib/mock/twin-ingest'
import { normalizeReadings } from '@/lib/twin/streams'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

/**
 * Public ingest endpoint for devices and gateways. Authenticates with the site's ingest key
 * (`x-ingest-key` or `Authorization: Bearer`), not a user session.
 *
 *   POST /api/ingest/<site-ref>
 *   { "stream": "P-101.vibration", "value": 2.9, "ts": "2026-01-01T10:00:00Z" }
 *   or a list: [{...}, {...}]   or   { "readings": [{...}] }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Devices post from anywhere, so allow any origin; the key is the credential.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-ingest-key, authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const ref = String(req.query.ref)
  const db = readDb()
  const key = String(req.headers['x-ingest-key'] ?? req.headers.authorization ?? '').replace(
    /^bearer /i,
    ''
  )
  if (!db.sites.some((site) => site.ref === ref) || !key || db.ingestKeys[ref] !== key) {
    return res.status(401).json({ error: { message: 'Invalid ingest key' } })
  }

  const { readings, rejected } = normalizeReadings(req.body)
  if (readings.length === 0) {
    return res
      .status(400)
      .json({ error: { message: 'No valid readings in the request body' }, rejected })
  }
  return res.status(200).json({ ...saveReadings(ref, readings), rejected })
}
