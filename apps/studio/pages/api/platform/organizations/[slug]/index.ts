import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getUserFromRequest, readDb, toApiOrganization } from '@/lib/mock/store'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req.headers.authorization)
  if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } })

  const organization = readDb().organizations.find(
    (org) => org.slug === req.query.slug && org.owner_id === user.id
  )
  if (!organization) return res.status(404).json({ error: { message: 'Organization not found' } })

  return res.status(200).json(toApiOrganization(organization, user))
}
