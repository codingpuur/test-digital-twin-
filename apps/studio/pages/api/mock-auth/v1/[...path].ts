import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

import {
  createSession,
  getUserFromRequest,
  readDb,
  toGoTrueUser,
  verifyJwt,
  writeDb,
} from '@/lib/mock/store'

// Minimal GoTrue-compatible mock so the Studio auth client works without a backend.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const route = ([] as string[]).concat(req.query.path ?? []).join('/')
  const fail = (status: number, message: string) =>
    res.status(status).json({ code: status, error_code: 'mock_error', msg: message })

  if (route === 'settings' && req.method === 'GET') {
    return res.status(200).json({
      external: { email: true },
      disable_signup: false,
      mailer_autoconfirm: true,
      phone_autoconfirm: false,
      sms_provider: '',
    })
  }

  if (route === 'signup' && req.method === 'POST') {
    const { email, password, data } = req.body ?? {}
    const db = readDb()
    if (!email || !password) return fail(422, 'Email and password are required')
    if (db.users.some((user) => user.email === email)) return fail(422, 'User already registered')
    const user = {
      id: crypto.randomUUID(),
      email,
      password,
      first_name: data?.first_name ?? '',
      last_name: data?.last_name ?? '',
      created_at: new Date().toISOString(),
    }
    db.users.push(user)
    writeDb(db)
    return res.status(200).json(createSession(user))
  }

  if (route === 'token' && req.method === 'POST') {
    const grantType = req.query.grant_type
    const db = readDb()
    if (grantType === 'password') {
      const { email, password } = req.body ?? {}
      const user = db.users.find((u) => u.email === email && u.password === password)
      if (!user) return fail(400, 'Invalid login credentials')
      return res.status(200).json(createSession(user))
    }
    if (grantType === 'refresh_token') {
      const payload = verifyJwt(req.body?.refresh_token ?? '')
      const user = db.users.find((u) => u.id === payload?.sub)
      if (!user) return fail(400, 'Invalid refresh token')
      return res.status(200).json(createSession(user))
    }
    return fail(400, 'Unsupported grant type')
  }

  if (route === 'user' && req.method === 'GET') {
    const user = getUserFromRequest(req.headers.authorization)
    if (!user) return fail(401, 'Invalid token')
    return res.status(200).json(toGoTrueUser(user))
  }

  if (route === 'logout' && req.method === 'POST') {
    return res.status(204).end()
  }

  return fail(404, `Mock auth route not implemented: ${req.method} /${route}`)
}
