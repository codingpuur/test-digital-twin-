/** Paths of the pump twin API (`/v1/...`) the browser may reach through the Next.js proxy. */
const ALLOWED = [
  /^meta$/,
  /^pumps$/,
  /^pumps\/\d+\/whatif(\/defaults|\/range)?$/,
  /^pumps\/\d+\/telemetry\/(latest|history)$/,
  /^telemetry\/channels$/,
  /^model\/(parts|mesh)$/,
  /^station\/simulation\/(meta|run)$/,
]

export type PumpProxyConfig = {
  baseUrl: string
  apiKey: string
  /** Site refs that may use the pump twin; empty means every site. */
  siteRefs: string[]
}

export const readPumpProxyConfig = (
  env: NodeJS.ProcessEnv = process.env
): PumpProxyConfig | null => {
  const baseUrl = env.TWIN_PUMP_API_URL?.trim().replace(/\/+$/, '')
  if (!baseUrl) return null
  return {
    baseUrl,
    apiKey: env.TWIN_PUMP_API_KEY?.trim() ?? '',
    siteRefs: (env.TWIN_PUMP_SITES ?? '')
      .split(',')
      .map((ref) => ref.trim())
      .filter(Boolean),
  }
}

export const isSiteAllowed = (config: PumpProxyConfig, ref: string) =>
  config.siteRefs.length === 0 || config.siteRefs.includes(ref)

/** Joins the catch-all segments into an allowed upstream path, or null when it is not allowed. */
export const resolvePumpPath = (segments: string | string[] | undefined): string | null => {
  const parts = Array.isArray(segments) ? segments : segments ? [segments] : []
  if (parts.length === 0 || parts.some((part) => part === '' || part === '.' || part === '..'))
    return null
  const path = parts.join('/')
  return ALLOWED.some((pattern) => pattern.test(path)) ? path : null
}

export const buildUpstreamUrl = (config: PumpProxyConfig, path: string, search: string) =>
  `${config.baseUrl}/v1/${path}${search}`

export const upstreamHeaders = (config: PumpProxyConfig, hasBody: boolean) => {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (config.apiKey) headers['x-api-key'] = config.apiKey
  if (hasBody) headers['Content-Type'] = 'application/json'
  return headers
}
