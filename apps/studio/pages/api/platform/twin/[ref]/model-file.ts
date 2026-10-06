import fs from 'fs'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { MODELS_DIR, readDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  const model = readDb().models.find((item) => item.site_ref === site.ref)
  const file = model && path.join(MODELS_DIR, `${site.ref}-v${model.revision}`)
  if (!file || !fs.existsSync(file)) {
    return res.status(404).json({ error: { message: 'No model uploaded for this site' } })
  }

  res.setHeader('Content-Type', 'application/octet-stream')
  return res.status(200).send(fs.readFileSync(file))
}
