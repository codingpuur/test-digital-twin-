import type { NextApiRequest, NextApiResponse } from 'next'

import { getUserFromRequest, readDb } from './store'

/** Resolves the site in `?ref=` if the caller owns it; otherwise answers 401/404 and returns null. */
export const getOwnedSite = (req: NextApiRequest, res: NextApiResponse) => {
  const user = getUserFromRequest(req.headers.authorization)
  if (!user) {
    res.status(401).json({ error: { message: 'Unauthorized' } })
    return null
  }
  const db = readDb()
  const site = db.sites.find((item) => item.ref === req.query.ref)
  const isOwner = db.organizations.some(
    (org) => org.id === site?.organization_id && org.owner_id === user.id
  )
  if (!site || !isOwner) {
    res.status(404).json({ error: { message: 'Site not found' } })
    return null
  }
  return site
}

export const readRawBody = async (req: NextApiRequest) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}
