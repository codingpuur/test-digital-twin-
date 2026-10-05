import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { PROJECT_REST_URL } from '@/lib/constants/api'
import { getUserFromRequest, readDb, toApiProject } from '@/lib/mock/store'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGet(req, res)
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = getUserFromRequest(req.headers.authorization)
  if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } })

  const db = readDb()
  const site = db.sites.find((item) => item.ref === req.query.ref)
  const organization = db.organizations.find(
    (org) => org.id === site?.organization_id && org.owner_id === user.id
  )
  if (!site || !organization) return res.status(404).json({ error: { message: 'Site not found' } })

  return res.status(200).json({ ...toApiProject(site, organization), restUrl: PROJECT_REST_URL })
}
