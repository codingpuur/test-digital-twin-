import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'
import { mergeImport, type AssetImportRow, type ImportMode } from '@/lib/twin/assets'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

type ImportBody = {
  rows: AssetImportRow[]
  mode: ImportMode
  source: string
  /** Report what would change without saving it. */
  dryRun?: boolean
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  const db = readDb()
  const siteAssets = db.assets.filter((asset) => asset.site_ref === site.ref)

  if (req.method === 'GET') {
    return res.status(200).json({ assets: siteAssets })
  }

  if (req.method === 'POST') {
    const { rows, mode, source, dryRun } = req.body as ImportBody
    const revision = db.models.find((item) => item.site_ref === site.ref)?.revision ?? 1
    const { assets, diff } = mergeImport(siteAssets, rows, {
      mode,
      source,
      revision,
      createId: () => crypto.randomUUID(),
    })
    if (!dryRun) {
      db.assets = [
        ...db.assets.filter((asset) => asset.site_ref !== site.ref),
        ...assets.map((asset) => ({ ...asset, site_ref: site.ref })),
      ]
      writeDb(db)
    }
    return res.status(200).json({ diff, assets })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
}
