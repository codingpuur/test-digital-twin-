export type RiskLevel = 'critical' | 'warning'

export type VoiceAsset = {
  /** Element id in the 3D scene. */
  id: string
  tag: string
  name: string
  category: string
  risk: { level: RiskLevel; reason: string } | null
  /** 0-100 health score. */
  score: number
}

export type VoiceContext = {
  assets: VoiceAsset[]
  now: number
  /** Tag of the asset a ticket was proposed for, waiting for a yes/no. */
  pendingTicketTag: string | null
  /** Readings of an asset as lines like "Vibration: 7.4 mm/s"; `atMs = null` is live. */
  readingsFor: (assetId: string, atMs: number | null) => string[]
}

export type VoiceAction =
  /** Blink these assets red. */
  | { type: 'highlight'; ids: string[] }
  /** Fly the camera to an asset and select it. */
  | { type: 'focus'; id: string }
  /** Colour these assets by health score. */
  | { type: 'colorByScore'; ids: string[] }
  | { type: 'jumpTime'; timestamp: number }
  | { type: 'goLive' }
  | { type: 'clear' }
  | { type: 'proposeTicket'; assetTag: string }
  | { type: 'createTicket'; assetTag: string }
  | { type: 'cancelTicket' }

export type VoiceResult = {
  reply: string
  actions: VoiceAction[]
}
