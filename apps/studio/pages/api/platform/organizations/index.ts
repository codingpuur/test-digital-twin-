import crypto from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  getUserFromRequest,
  readDb,
  slugify,
  toApiOrganization,
  writeDb,
} from '@/lib/mock/store'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req.headers.authorization)
  if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } })

  switch (req.method) {
    case 'GET': {
      const organizations = readDb().organizations.filter((org) => org.owner_id === user.id)
      return res.status(200).json(organizations.map((org) => toApiOrganization(org, user)))
    }
    case 'POST': {
      const name: string = req.body?.name?.trim()
      if (!name) return res.status(400).json({ error: { message: 'Name is required' } })
      const db = readDb()
      const slug = `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`
      const organization = {
        id: Math.max(0, ...db.organizations.map((org) => org.id)) + 1,
        name,
        slug,
        owner_id: user.id,
      }
      db.organizations.push(organization)
      writeDb(db)
      return res.status(201).json(toApiOrganization(organization, user))
    }
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res
        .status(405)
        .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }
}
