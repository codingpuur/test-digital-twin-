import type { VoiceAsset, VoiceContext, VoiceResult } from './voice.types'

// Turns what the user said into a reply plus actions on the 3D view. Rule based so it works offline
// and in Hinglish; a language model can replace `parseVoiceCommand` and keep the same result shape.

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const has = (text: string, pattern: RegExp) => pattern.test(text)

const YES = /\b(yes|yeah|haan|han|ha|confirm|kar do|kardo|karo|ok|okay|sure|theek hai|thik hai)\b/
const NO = /\b(no|nope|nahi|nahin|cancel|mat|ruko|stop)\b/
const CLEAR = /\b(clear|reset|hatao|hata do|saaf|blink band|remove highlight)\b/
const TICKET = /\b(ticket|complaint|work order)\b/
const HEALTH = /\b(health|score|rating)\b/
const DANGER =
  /\b(danger|dangerous|khatre|khatra|kharab|kharaab|problem|risk|risky|critical|alarm|alert|dikkat|bad|faulty|fault|fail|failing|warning|issue)\b/
const SHOW = /\b(show|dikhao|dikha|focus|zoom|kholo|dhundo|find|locate|go to|where|kahan)\b/
const QUESTION =
  /\b(kitna|kitni|kya|level|value|status|reading|readings|haal|how|what|batao|bata)\b/
const LIVE = /\b(live|abhi ka|right now|wapas|current|aaj ka haal)\b/

const TYPE_WORDS = ['pump', 'motor', 'valve', 'sensor', 'tank', 'pipe'] as const

/** A short list of ways a spoken asset name can be written: "P-101 Pump", "P101", "wet well". */
const assetKeys = (asset: VoiceAsset) => {
  const keys = new Set<string>()
  keys.add(norm(asset.tag))
  keys.add(norm(asset.name))
  const code = asset.name.split(/\s+/)[0]
  if (/\d/.test(code)) keys.add(norm(code))
  keys.delete('')
  return [...keys]
}

export const findAsset = (text: string, assets: VoiceAsset[]): VoiceAsset | null => {
  const spoken = norm(text)
  let best: { asset: VoiceAsset; length: number } | null = null
  for (const asset of assets) {
    for (const key of assetKeys(asset)) {
      if (key.length >= 3 && spoken.includes(key) && (!best || key.length > best.length)) {
        best = { asset, length: key.length }
      }
    }
  }
  return best?.asset ?? null
}

const typeFilter = (text: string) => TYPE_WORDS.find((word) => text.includes(word)) ?? null

const ofType = (assets: VoiceAsset[], type: string | null) =>
  type
    ? assets.filter((asset) => `${asset.category} ${asset.name}`.toLowerCase().includes(type))
    : assets

const TIME_UNITS: { pattern: RegExp; ms: number }[] = [
  { pattern: /(\d+)\s*(?:minute|minutes|min|mins)\s*(?:pehle|ago|back)/, ms: 60_000 },
  {
    pattern: /(\d+)\s*(?:hour|hours|hr|hrs|ghante|ghanta|ghantey)\s*(?:pehle|ago|back)/,
    ms: 3_600_000,
  },
  { pattern: /(\d+)\s*(?:day|days|din|dino)\s*(?:pehle|ago|back)/, ms: 86_400_000 },
]

/** "2 hours ago", "kal subah 6 baje", "yesterday 8 pm". Returns epoch ms, or null if no time was said. */
export const parseTimeReference = (text: string, now: number): number | null => {
  for (const unit of TIME_UNITS) {
    const match = text.match(unit.pattern)
    if (match) return now - Number(match[1]) * unit.ms
  }

  const isYesterday = /\b(kal|yesterday)\b/.test(text)
  const isToday = /\b(aaj|today)\b/.test(text)
  const hourMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|o'?clock)?/)
  if (!(isYesterday || isToday) || !hourMatch) return null

  let hour = Number(hourMatch[1])
  const minute = Number(hourMatch[2] ?? 0)
  const marker = hourMatch[3]
  const isEvening = /\b(shaam|evening|raat|night|dopahar|afternoon)\b/.test(text)
  if (marker === 'pm' || (marker !== 'am' && isEvening)) {
    if (hour < 12) hour += 12
  }
  if (hour > 23) return null

  const date = new Date(now)
  if (isYesterday) date.setDate(date.getDate() - 1)
  date.setHours(hour, minute, 0, 0)
  return date.getTime()
}

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  })

const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

const HELP =
  'You can say things like: “which pump is in danger?”, “show P-101”, “what is the level of the wet well?”, ' +
  '“show health of all motors”, “what was it yesterday 6 am?”, or “create a ticket for P-101”.'

export const parseVoiceCommand = (input: string, context: VoiceContext): VoiceResult => {
  const text = input.toLowerCase().trim()
  const { assets, now } = context
  const asset = findAsset(text, assets)

  if (text === '') return { reply: 'I did not catch that. Try again.', actions: [] }

  // 1. Waiting on a ticket confirmation: the next yes/no answers it.
  if (context.pendingTicketTag) {
    if (has(text, NO)) {
      return { reply: 'Okay, I did not create the ticket.', actions: [{ type: 'cancelTicket' }] }
    }
    if (has(text, YES)) {
      return {
        reply: `Done. I created a ticket for ${context.pendingTicketTag}.`,
        actions: [{ type: 'createTicket', assetTag: context.pendingTicketTag }],
      }
    }
  }

  // 2. Clear highlights and colours.
  if (has(text, CLEAR)) {
    return { reply: 'Cleared the highlights.', actions: [{ type: 'clear' }] }
  }

  // 3. Ticket: needs an asset, and asks before writing anything.
  if (has(text, TICKET)) {
    if (!asset) {
      return {
        reply: 'Which asset should the ticket be for? Say the asset name, like P-101.',
        actions: [],
      }
    }
    return {
      reply: `Create a ticket for ${asset.name}? Say yes to confirm or no to cancel.`,
      actions: [
        { type: 'focus', id: asset.id },
        { type: 'proposeTicket', assetTag: asset.tag },
      ],
    }
  }

  // 4. Health scores on the 3D model.
  if (has(text, HEALTH) && !asset) {
    const type = typeFilter(text)
    const scoped = ofType(assets, type)
    if (scoped.length === 0)
      return { reply: 'I could not find those assets in this model.', actions: [] }
    const worst = [...scoped].sort((a, b) => a.score - b.score)[0]
    return {
      reply: `Colouring ${type ? `${type}s` : 'assets'} by health score. Lowest is ${worst.name} at ${worst.score}.`,
      actions: [{ type: 'colorByScore', ids: scoped.map((item) => item.id) }],
    }
  }

  // 5. What is in danger.
  if (has(text, DANGER) && !asset) {
    const scoped = ofType(assets, typeFilter(text))
    const risky = scoped
      .filter((item) => item.risk)
      .sort(
        (a, b) => (a.risk?.level === 'critical' ? -1 : 1) - (b.risk?.level === 'critical' ? -1 : 1)
      )
    if (risky.length === 0) {
      return {
        reply: 'Nothing is in danger right now. Everything is within limits.',
        actions: [{ type: 'clear' }],
      }
    }
    const lines = risky.map((item) => `${item.name} is ${item.risk?.level}. ${item.risk?.reason}`)
    return {
      reply: `${risky.length === 1 ? 'One asset is' : `${risky.length} assets are`} in danger: ${list(risky.map((item) => item.name))}. ${lines.join(' ')}`,
      actions: [
        { type: 'highlight', ids: risky.map((item) => item.id) },
        { type: 'focus', id: risky[0].id },
      ],
    }
  }

  // 6. Time travel.
  const timestamp = parseTimeReference(text, now)
  if (timestamp !== null) {
    const readings = asset ? context.readingsFor(asset.id, timestamp) : []
    const detail = asset
      ? readings.length > 0
        ? ` ${asset.name}: ${readings.join(', ')}.`
        : ` ${asset.name} has no readings at that time.`
      : ''
    return {
      reply: `Moved the timeline to ${formatTime(timestamp)}.${detail}`,
      actions: [
        { type: 'jumpTime', timestamp },
        ...(asset ? [{ type: 'focus' as const, id: asset.id }] : []),
      ],
    }
  }

  // 7. A specific asset: show it, or read its values.
  if (asset) {
    const readings = context.readingsFor(asset.id, null)
    const status = asset.risk ? `${asset.risk.level}. ${asset.risk.reason}` : 'normal'
    const values = readings.length > 0 ? ` ${readings.join(', ')}.` : ' It has no live readings.'
    const isShowOnly = has(text, SHOW) && !has(text, QUESTION)
    return {
      reply: isShowOnly
        ? `Showing ${asset.name}. Status is ${status}.`
        : `${asset.name}: status ${status}${values}`,
      actions: [{ type: 'focus', id: asset.id }],
    }
  }

  // 8. Back to live.
  if (has(text, LIVE)) {
    return { reply: 'Back to live data.', actions: [{ type: 'goLive' }] }
  }

  return { reply: HELP, actions: [] }
}
