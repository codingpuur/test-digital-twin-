import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

import type { TwinAsset } from '@/lib/twin/assets'

// File-backed mock database for the digital twin UI. Server-side only.
// Replace with a real backend later.

export type MockUser = {
  id: string
  email: string
  password: string
  first_name: string
  last_name: string
  created_at: string
}

export type MockOrganization = {
  id: number
  name: string
  slug: string
  owner_id: string
}

export type MockSite = {
  id: number
  ref: string
  name: string
  organization_id: number
  site_type: string
  location: string
  timezone: string
  inserted_at: string
}

export type MockModel = {
  site_ref: string
  name: string
  format: string
  size: number
  revision: number
  uploaded_at: string
}

type MockDb = {
  users: MockUser[]
  organizations: MockOrganization[]
  sites: MockSite[]
  /** Latest uploaded 3D model per site (the file itself lives in `MODELS_DIR`). */
  models: MockModel[]
  /** Asset records per site, keyed by `site_ref`. */
  assets: (TwinAsset & { site_ref: string })[]
}

// Serverless hosts (Vercel) have a read-only project dir; only the OS temp dir is writable there.
const DB_DIR = process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), '.mock-data')
const DB_PATH = path.join(DB_DIR, 'db.json')
const JWT_SECRET = 'digital-twin-mock-secret'

const emptyDb = (): MockDb => ({ users: [], organizations: [], sites: [], models: [], assets: [] })

export const MODELS_DIR = path.join(DB_DIR, 'models')

export const readDb = (): MockDb => {
  try {
    // Spread over an empty db so files written before models/assets existed still load.
    return { ...emptyDb(), ...(JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as Partial<MockDb>) }
  } catch {
    return emptyDb()
  }
}

export const writeDb = (db: MockDb) => {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item'

const base64url = (input: string) => Buffer.from(input).toString('base64url')

export const signJwt = (payload: Record<string, unknown>) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url')
  return `${header}.${body}.${signature}`
}

export const verifyJwt = (token: string): { sub: string } | null => {
  const [header, body, signature] = token.split('.')
  if (!header || !body || !signature) return null
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url')
  if (expected !== signature) return null
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (payload.exp && payload.exp < Date.now() / 1000) return null
  return payload
}

export const toGoTrueUser = (user: MockUser) => ({
  id: user.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: user.email,
  email_confirmed_at: user.created_at,
  phone: '',
  confirmed_at: user.created_at,
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { first_name: user.first_name, last_name: user.last_name },
  identities: [],
  created_at: user.created_at,
  updated_at: user.created_at,
})

export const createSession = (user: MockUser) => {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 3600
  const accessToken = signJwt({
    aud: 'authenticated',
    role: 'authenticated',
    sub: user.id,
    email: user.email,
    iat: now,
    exp: now + expiresIn,
    session_id: crypto.randomUUID(),
  })
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    refresh_token: signJwt({
      sub: user.id,
      type: 'refresh',
      iat: now,
      exp: now + 60 * 60 * 24 * 30,
    }),
    user: toGoTrueUser(user),
  }
}

export const getUserFromRequest = (authorization?: string): MockUser | null => {
  const token = authorization?.replace(/bearer /i, '')
  if (!token) return null
  const payload = verifyJwt(token)
  if (!payload) return null
  return readDb().users.find((user) => user.id === payload.sub) ?? null
}

export const toApiOrganization = (org: MockOrganization, user?: MockUser | null) => ({
  id: org.id,
  name: org.name,
  slug: org.slug,
  billing_email: user?.email ?? null,
  billing_partner: null,
  integration_source: null,
  is_owner: true,
  opt_in_tags: [],
  organization_missing_address: false,
  organization_missing_tax_id: false,
  organization_requires_mfa: false,
  plan: { id: 'enterprise', name: 'Enterprise' },
  requires_indirect_tax_declaration: false,
  restriction_data: null,
  restriction_status: null,
  subscription_id: `sub_${org.id}`,
  usage_billing_enabled: false,
})

export const toApiProject = (site: MockSite, org?: MockOrganization) => ({
  id: site.id,
  ref: site.ref,
  name: site.name,
  organization_id: site.organization_id,
  organization_slug: org?.slug ?? '',
  cloud_provider: 'localhost',
  status: 'ACTIVE_HEALTHY',
  region: 'local',
  inserted_at: site.inserted_at,
  is_branch_enabled: false,
  is_physical_backups_enabled: false,
  preview_branch_refs: [],
  infra_compute_size: 'micro',
  disk_volume_size_gb: 8,
  connectionString: '',
  dbVersion: '',
  restUrl: '',
  subscription_id: null,
  site_type: site.site_type,
  location: site.location,
  timezone: site.timezone,
})

export const toApiOrgProject = (site: MockSite, org?: MockOrganization) => ({
  ...toApiProject(site, org),
  databases: [
    {
      cloud_provider: 'localhost',
      identifier: site.ref,
      region: 'local',
      status: 'ACTIVE_HEALTHY',
      type: 'PRIMARY',
    },
  ],
})
