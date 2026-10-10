import { describe, expect, it } from 'vitest'

import {
  buildUpstreamUrl,
  isSiteAllowed,
  readPumpProxyConfig,
  resolvePumpPath,
  upstreamHeaders,
} from './pump-proxy'

describe('resolvePumpPath', () => {
  it('accepts the documented endpoints', () => {
    expect(resolvePumpPath(['meta'])).toBe('meta')
    expect(resolvePumpPath(['pumps', '3', 'whatif'])).toBe('pumps/3/whatif')
    expect(resolvePumpPath(['pumps', '3', 'whatif', 'range'])).toBe('pumps/3/whatif/range')
    expect(resolvePumpPath(['pumps', '3', 'telemetry', 'latest'])).toBe('pumps/3/telemetry/latest')
    expect(resolvePumpPath(['station', 'simulation', 'run'])).toBe('station/simulation/run')
    expect(resolvePumpPath(['model', 'mesh'])).toBe('model/mesh')
    expect(resolvePumpPath(['pumps', '3', 'layers'])).toBe('pumps/3/layers')
    expect(resolvePumpPath(['pumps', '3', 'layers', 'cavitation'])).toBe(
      'pumps/3/layers/cavitation'
    )
    expect(resolvePumpPath(['pumps', '3', 'fmea'])).toBe('pumps/3/fmea')
  })

  it('rejects traversal, unknown paths and the push endpoint', () => {
    expect(resolvePumpPath(['..', 'health'])).toBeNull()
    expect(resolvePumpPath(['health'])).toBeNull()
    expect(resolvePumpPath(['pumps', 'x', 'whatif'])).toBeNull()
    expect(resolvePumpPath(['pumps', '3', 'telemetry'])).toBeNull()
    expect(resolvePumpPath(undefined)).toBeNull()
  })
})

describe('config', () => {
  it('is off without a URL and parses sites and key', () => {
    expect(readPumpProxyConfig({} as NodeJS.ProcessEnv)).toBeNull()
    const config = readPumpProxyConfig({
      TWIN_PUMP_API_URL: 'http://x:8100/',
      TWIN_PUMP_API_KEY: 'k',
      TWIN_PUMP_SITES: 'a, b',
    } as unknown as NodeJS.ProcessEnv)!
    expect(config).toEqual({ baseUrl: 'http://x:8100', apiKey: 'k', siteRefs: ['a', 'b'] })
    expect(isSiteAllowed(config, 'a')).toBe(true)
    expect(isSiteAllowed(config, 'z')).toBe(false)
    expect(buildUpstreamUrl(config, 'meta', '?a=1')).toBe('http://x:8100/v1/meta?a=1')
    expect(upstreamHeaders(config, true)).toMatchObject({ 'x-api-key': 'k' })
    expect(upstreamHeaders({ ...config, apiKey: '' }, false)).not.toHaveProperty('x-api-key')
  })
})
