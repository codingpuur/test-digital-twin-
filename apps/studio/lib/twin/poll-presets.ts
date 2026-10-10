import type { PollMapping } from './poll-mapping'

export type PollPreset = { label: string; url: string; mapping: PollMapping }

// Ready-made mappings. Pick one with TWIN_POLL_PRESET, or point TWIN_POLL_URL and
// TWIN_POLL_MAPPING_FILE at your own API.
export const POLL_PRESETS: Record<string, PollPreset> = {
  // A free public API that needs no key and changes every second, so the demo visibly moves.
  iss: {
    label: 'Public demo API (ISS position)',
    url: 'https://api.wheretheiss.at/v1/satellites/25544',
    mapping: {
      kind: 'values',
      timePath: 'timestamp',
      streams: [
        {
          stream: 'ISS.altitude',
          path: 'altitude',
          assetTag: 'ISS',
          parameter: 'Altitude',
          unit: 'km',
        },
        {
          stream: 'ISS.velocity',
          path: 'velocity',
          scale: 0.001,
          assetTag: 'ISS',
          parameter: 'Velocity',
          unit: 'k km/h',
        },
        {
          stream: 'ISS.latitude',
          path: 'latitude',
          assetTag: 'ISS',
          parameter: 'Latitude',
          unit: '°',
        },
        {
          stream: 'ISS.longitude',
          path: 'longitude',
          assetTag: 'ISS',
          parameter: 'Longitude',
          unit: '°',
        },
      ],
    },
  },
  // This app's own /api/dummy-sensors: pump-shaped data that works offline.
  'local-pumps': {
    label: 'Local dummy pump sensors',
    url: 'http://localhost:8082/api/dummy-sensors',
    mapping: {
      kind: 'values',
      timePath: 'ts',
      streams: ['P-101', 'P-102'].flatMap((pump) => [
        {
          stream: `${pump}.vibration`,
          path: `pumps.${pump}.vibration`,
          assetTag: pump,
          parameter: 'Vibration',
          unit: 'mm/s',
          warnAbove: 7,
        },
        {
          stream: `${pump}.temperature`,
          path: `pumps.${pump}.temperature`,
          assetTag: pump,
          parameter: 'Temperature',
          unit: '°C',
          warnAbove: 80,
        },
        {
          stream: `${pump}.power`,
          path: `pumps.${pump}.power`,
          assetTag: pump,
          parameter: 'Power',
          unit: 'kW',
        },
      ]),
    },
  },
}
