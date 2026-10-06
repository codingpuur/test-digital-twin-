import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { readDb, writeDb } from '@/lib/mock/store'
import { getOwnedSite } from '@/lib/mock/twin-api'
import type { TicketInput, TicketStatus } from '@/lib/twin/workspace'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  const db = readDb()
  const ticket = db.tickets.find((item) => item.site_ref === site.ref && item.id === req.query.id)
  if (!ticket) return res.status(404).json({ error: { message: 'Ticket not found' } })

  if (req.method === 'PATCH') {
    const changes = req.body as Partial<TicketInput & { status: TicketStatus }>
    Object.assign(ticket, changes, { updatedAt: new Date().toISOString() })
    writeDb(db)
    return res.status(200).json({ ticket })
  }

  if (req.method === 'DELETE') {
    db.tickets = db.tickets.filter((item) => item !== ticket)
    writeDb(db)
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
}
