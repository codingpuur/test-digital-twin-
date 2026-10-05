import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { readDb, writeDb } from '@/lib/mock/store'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res
      .status(405)
      .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }

  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Email and password are required' } })
  }

  const db = readDb()
  if (db.users.some((user) => user.email === email)) {
    return res.status(400).json({ error: { message: 'User already registered' } })
  }

  db.users.push({
    id: crypto.randomUUID(),
    email,
    password,
    first_name: '',
    last_name: '',
    created_at: new Date().toISOString(),
  })
  writeDb(db)
  return res.status(200).json({})
}
