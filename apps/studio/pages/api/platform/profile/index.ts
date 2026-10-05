import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getUserFromRequest, readDb, toApiOrganization, toApiProject } from '@/lib/mock/store'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res
      .status(405)
      .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }

  const user = getUserFromRequest(req.headers.authorization)
  if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } })

  const db = readDb()
  const organizations = db.organizations
    .filter((org) => org.owner_id === user.id)
    .map((org) => ({
      ...toApiOrganization(org, user),
      projects: db.sites
        .filter((site) => site.organization_id === org.id)
        .map((site) => toApiProject(site, org)),
    }))

  return res.status(200).json({
    id: 1,
    gotrue_id: user.id,
    auth0_id: user.id,
    primary_email: user.email,
    username: user.email.split('@')[0],
    first_name: user.first_name,
    last_name: user.last_name,
    mobile: '',
    is_alpha_user: false,
    is_sso_user: false,
    free_project_limit: 100,
    disabled_features: [],
    organizations,
  })
}
