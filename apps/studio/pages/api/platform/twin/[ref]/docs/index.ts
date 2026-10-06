import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { DOCS_DIR, getUserFromRequest, readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite, readRawBody } from '@/lib/mock/twin-api'
import type { TwinDoc } from '@/lib/twin/workspace'

// Files arrive as a raw binary body, so Next's JSON body parser is switched off.
export const config = { api: { bodyParser: false } }

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return
  const db = readDb()

  if (req.method === 'GET') {
    const docs = db.docs.filter((doc) => doc.site_ref === site.ref)
    return res.status(200).json({ docs: [...docs].reverse() })
  }

  if (req.method === 'POST') {
    const body = await readRawBody(req)
    const doc: TwinDoc = {
      id: crypto.randomUUID(),
      name: decodeURIComponent(String(req.headers['x-file-name'] ?? 'document')),
      size: body.length,
      assetTag: decodeURIComponent(String(req.headers['x-asset-tag'] ?? '')),
      uploadedBy: getUserFromRequest(req.headers.authorization)?.email ?? '',
      uploadedAt: new Date().toISOString(),
    }
    fs.mkdirSync(DOCS_DIR, { recursive: true })
    fs.writeFileSync(path.join(DOCS_DIR, doc.id), body)
    db.docs.push({ ...doc, site_ref: site.ref })
    writeDb(db)
    return res.status(200).json({ doc })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
}
