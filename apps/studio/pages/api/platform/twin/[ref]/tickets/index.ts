import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getUserFromRequest, readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'
import { nextTicketNumber, type TicketInput, type TwinTicket } from '@/lib/twin/workspace'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  const db = readDb()
  const tickets = db.tickets.filter((ticket) => ticket.site_ref === site.ref)

  if (req.method === 'GET') {
    return res.status(200).json({ tickets: [...tickets].sort((a, b) => b.number - a.number) })
  }

  if (req.method === 'POST') {
    const input = req.body as TicketInput
    if (!input.title?.trim()) {
      return res.status(400).json({ error: { message: 'A ticket needs a title' } })
    }
    const now = new Date().toISOString()
    const ticket: TwinTicket = {
      id: crypto.randomUUID(),
      number: nextTicketNumber(tickets),
      title: input.title.trim(),
      description: input.description ?? '',
      assetTag: input.assetTag ?? '',
      priority: input.priority ?? 'medium',
      status: 'open',
      assignee: input.assignee ?? '',
      createdBy: getUserFromRequest(req.headers.authorization)?.email ?? '',
      createdAt: now,
      updatedAt: now,
    }
    db.tickets.push({ ...ticket, site_ref: site.ref })
    writeDb(db)
    return res.status(200).json({ ticket })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
}
