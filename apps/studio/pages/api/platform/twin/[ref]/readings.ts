import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getOwnedSite } from '@/lib/mock/twin-api'
import { saveReadings } from '@/lib/mock/twin-ingest'
import { normalizeReadings } from '@/lib/twin/streams'

// Signed-in users post readings here (CSV uploads, "send test reading"). Devices use /api/ingest.
export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const { readings, rejected } = normalizeReadings(req.body)
  return res.status(200).json({ ...saveReadings(site.ref, readings), rejected })
}
