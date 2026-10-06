import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'
import type { MemberRole } from '@/lib/twin/workspace'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  const db = readDb()
  const member = db.members.find((item) => item.site_ref === site.ref && item.id === req.query.id)
  if (!member) return res.status(404).json({ error: { message: 'Member not found' } })

  if (req.method === 'PATCH') {
    member.role = (req.body as { role: MemberRole }).role
    writeDb(db)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    db.members = db.members.filter((item) => item !== member)
    writeDb(db)
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
}
