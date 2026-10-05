import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getUserFromRequest, readDb } from '@/lib/mock/store'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

// Every signed-in user owns their organizations, so grant full access on each one.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req.headers.authorization)
  if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } })

  const permissions = readDb()
    .organizations.filter((org) => org.owner_id === user.id)
    .map((org) => ({
      actions: ['%'],
      condition: null,
      organization_id: org.id,
      organization_slug: org.slug,
      project_ids: null,
      project_refs: null,
      resources: ['%'],
      restrictive: false,
    }))

  return res.status(200).json(permissions)
}
