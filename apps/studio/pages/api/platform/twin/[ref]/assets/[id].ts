import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'
import type { AssetFields } from '@/lib/twin/assets'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const db = readDb()
  const asset = db.assets.find((item) => item.site_ref === site.ref && item.id === req.query.id)
  if (!asset) return res.status(404).json({ error: { message: 'Asset not found' } })

  // `override` replaces the whole user-edit layer; sending {} reverts to the imported values.
  asset.override = (req.body as { override: Partial<AssetFields> }).override
  writeDb(db)
  return res.status(200).json({ asset })
}
