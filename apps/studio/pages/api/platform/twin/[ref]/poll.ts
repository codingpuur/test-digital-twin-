import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getOwnedSite } from '@/lib/mock/twin-api'
import { getPollStatus, pollIfDue } from '@/lib/mock/twin-poll'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

// GET: status of the external API poll. POST: poll right now.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return
  if (req.method === 'POST') await pollIfDue(site.ref, { force: true })
  else if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }
  return res.status(200).json(getPollStatus(site.ref))
}
