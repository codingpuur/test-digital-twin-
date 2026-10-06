import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

type MappingBody = {
  assetTag: string
  parameter: string
  unit: string
  warnAbove: number | null
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const db = readDb()
  const stream = db.streams.find((item) => item.site_ref === site.ref && item.id === req.query.id)
  if (!stream) return res.status(404).json({ error: { message: 'Stream not found' } })

  const { assetTag, parameter, unit, warnAbove } = req.body as MappingBody
  Object.assign(stream, { assetTag, parameter, unit, warnAbove })
  writeDb(db)
  return res.status(200).json({ stream })
}
