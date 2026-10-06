import fs from 'fs'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { MODELS_DIR, readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite, readRawBody } from '@/lib/mock/twin-api'

// The model arrives as a raw binary body, so Next's JSON body parser is switched off.
export const config = { api: { bodyParser: false } }

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  if (req.method === 'GET') {
    const model = readDb().models.find((item) => item.site_ref === site.ref) ?? null
    return res.status(200).json({ model })
  }

  if (req.method === 'PUT') {
    const name = decodeURIComponent(String(req.headers['x-file-name'] ?? 'model'))
    const body = await readRawBody(req)
    const db = readDb()
    const previous = db.models.find((item) => item.site_ref === site.ref)
    const revision = (previous?.revision ?? 0) + 1

    // One file per revision so an earlier model can be restored later.
    fs.mkdirSync(MODELS_DIR, { recursive: true })
    fs.writeFileSync(path.join(MODELS_DIR, `${site.ref}-v${revision}`), body)

    const model = {
      site_ref: site.ref,
      name,
      format: name.split('.').pop()?.toLowerCase() ?? '',
      size: body.length,
      revision,
      uploaded_at: new Date().toISOString(),
    }
    db.models = [...db.models.filter((item) => item.site_ref !== site.ref), model]
    writeDb(db)
    return res.status(200).json({ model })
  }

  res.setHeader('Allow', ['GET', 'PUT'])
  return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
}
