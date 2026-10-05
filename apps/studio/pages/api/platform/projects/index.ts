import crypto from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getUserFromRequest, readDb, slugify, toApiProject, writeDb } from '@/lib/mock/store'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req.headers.authorization)
  if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } })

  const db = readDb()
  const ownedOrganizations = db.organizations.filter((org) => org.owner_id === user.id)

  switch (req.method) {
    case 'GET': {
      const sites = db.sites.filter((site) =>
        ownedOrganizations.some((org) => org.id === site.organization_id)
      )
      const projects = sites.map((site) =>
        toApiProject(
          site,
          ownedOrganizations.find((org) => org.id === site.organization_id)
        )
      )
      return res
        .status(200)
        .json({ projects, pagination: { count: projects.length, limit: 100, offset: 0 } })
    }
    case 'POST': {
      const { name, organization_slug } = req.body ?? {}
      const organization = ownedOrganizations.find(
        (org) => org.slug === organization_slug || org.id === req.body?.organization_id
      )
      if (!name || !organization) {
        return res.status(400).json({ error: { message: 'Name and organization are required' } })
      }
      const site = {
        id: Math.max(0, ...db.sites.map((item) => item.id)) + 1,
        ref: `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`,
        name,
        organization_id: organization.id,
        site_type: req.body?.site_type ?? 'pumping-station',
        location: req.body?.location ?? '',
        timezone: req.body?.timezone ?? 'UTC',
        inserted_at: new Date().toISOString(),
      }
      db.sites.push(site)
      writeDb(db)
      return res.status(201).json(toApiProject(site, organization))
    }
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res
        .status(405)
        .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }
}
