import { describe, expect, it } from 'vitest'

import { getPollConfig } from './twin-poll'

describe('getPollConfig', () => {
  it('is off when nothing is set', () => {
    expect(getPollConfig({})).toBeNull()
  })

  it('uses a preset and its default interval', () => {
    const config = getPollConfig({ TWIN_POLL_PRESET: 'iss' })
    expect(config?.url).toContain('wheretheiss.at')
    expect(config?.intervalSec).toBe(5)
    expect(config?.mapping.kind).toBe('values')
  })

  it('lets TWIN_POLL_URL replace the preset url, and reads headers and interval', () => {
    const config = getPollConfig({
      TWIN_POLL_PRESET: 'local-pumps',
      TWIN_POLL_URL: 'https://api.example.com/x',
      TWIN_POLL_HEADERS: '{"Authorization":"Bearer t"}',
      TWIN_POLL_INTERVAL_SEC: '10',
    })
    expect(config).toMatchObject({
      url: 'https://api.example.com/x',
      headers: { Authorization: 'Bearer t' },
      intervalSec: 10,
      label: 'Custom API',
    })
  })

  it('ignores broken headers instead of throwing, and needs a mapping for a custom url', () => {
    expect(getPollConfig({ TWIN_POLL_PRESET: 'iss', TWIN_POLL_HEADERS: '{oops' })?.headers).toEqual(
      {}
    )
    expect(getPollConfig({ TWIN_POLL_URL: 'https://api.example.com/x' })).toBeNull()
  })
})
