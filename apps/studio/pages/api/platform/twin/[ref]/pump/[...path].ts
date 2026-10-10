import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getOwnedSite } from '@/lib/mock/twin-api'
import {
  buildUpstreamUrl,
  isSiteAllowed,
  readPumpProxyConfig,
  resolvePumpPath,
  upstreamHeaders,
} from '@/lib/twin/pump-proxy'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

// Forwards the browser's calls to the pump twin API. The API key and URL stay on the server, and
// only the listed paths and sites get through.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = getOwnedSite(req, res)
  if (!site) return

  const config = readPumpProxyConfig()
  if (!config) {
    return res.status(503).json({ error: { message: 'The pump twin API is not configured.' } })
  }
  if (!isSiteAllowed(config, site.ref)) {
    return res.status(404).json({ error: { message: 'No pump twin for this site.' } })
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const path = resolvePumpPath(req.query.path)
  if (!path) return res.status(404).json({ error: { message: 'Unknown pump twin path.' } })

  const { ref: _ref, path: _path, ...rest } = req.query
  const search = new URLSearchParams(
    Object.entries(rest).flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value ?? '']).map((item) => [key, item] as [string, string])
    )
  ).toString()

  const hasBody = req.method === 'POST'
  try {
    const upstream = await fetch(buildUpstreamUrl(config, path, search ? `?${search}` : ''), {
      method: req.method,
      headers: {
        ...upstreamHeaders(config, hasBody),
        ...(typeof req.headers['if-none-match'] === 'string'
          ? { 'If-None-Match': req.headers['if-none-match'] }
          : {}),
      },
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      signal: AbortSignal.timeout(30_000),
    })
    const etag = upstream.headers.get('etag')
    if (etag) res.setHeader('ETag', etag)
    if (upstream.status === 304) return res.status(304).end()
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
    return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()))
  } catch {
    return res.status(502).json({ error: { message: 'The pump twin API did not respond.' } })
  }
}
