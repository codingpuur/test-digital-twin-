import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getUserFromRequest, readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'
import { isValidEmail, type MemberRole, type TwinMember } from '@/lib/twin/workspace'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return
  const owner = getUserFromRequest(req.headers.authorization)!
  const db = readDb()

  if (req.method === 'GET') {
    const ownerRow: TwinMember = {
      id: owner.id,
      email: owner.email,
      role: 'admin',
      addedAt: owner.created_at,
      isOwner: true,
    }
    const invited = db.members
      .filter((member) => member.site_ref === site.ref)
      .map((member): TwinMember => ({ ...member, isOwner: false }))
    return res.status(200).json({ members: [ownerRow, ...invited] })
  }

  if (req.method === 'POST') {
    const { email, role } = req.body as { email: string; role: MemberRole }
    const normalized = email?.trim().toLowerCase()
    if (!normalized || !isValidEmail(normalized)) {
      return res.status(400).json({ error: { message: 'Enter a valid email address' } })
    }
    const exists =
      normalized === owner.email.toLowerCase() ||
      db.members.some((member) => member.site_ref === site.ref && member.email === normalized)
    if (exists)
      return res.status(400).json({ error: { message: 'This person already has access' } })

    db.members.push({
      id: crypto.randomUUID(),
      site_ref: site.ref,
      email: normalized,
      role: role ?? 'viewer',
      addedAt: new Date().toISOString(),
    })
    writeDb(db)
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
}
