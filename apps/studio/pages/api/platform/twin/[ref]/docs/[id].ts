import fs from 'fs'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { DOCS_DIR, readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  const db = readDb()
  const doc = db.docs.find((item) => item.site_ref === site.ref && item.id === req.query.id)
  if (!doc) return res.status(404).json({ error: { message: 'Document not found' } })
  const file = path.join(DOCS_DIR, doc.id)

  if (req.method === 'GET') {
    if (!fs.existsSync(file)) return res.status(404).json({ error: { message: 'File is missing' } })
    res.setHeader('Content-Type', 'application/octet-stream')
    return res.status(200).send(fs.readFileSync(file))
  }

  if (req.method === 'DELETE') {
    fs.rmSync(file, { force: true })
    db.docs = db.docs.filter((item) => item !== doc)
    writeDb(db)
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'DELETE'])
  return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
}
