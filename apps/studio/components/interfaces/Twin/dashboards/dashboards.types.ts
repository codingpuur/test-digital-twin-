export type CardType =
  | 'parameter-value'
  | 'custom-text'
  | 'parameters-summary'
  | 'value-over-time'
  | 'aggregate-value'
  | 'last-value'

export type CardConfig = {
  streamIds: string[]
  text?: string
  title?: string
}

export type DashboardCard = {
  id: string
  type: CardType
  config: CardConfig
}

export type Dashboard = {
  id: string
  name: string
  description: string
  cards: DashboardCard[]
  createdAt: string
}

export type DateRangeId = '24h' | '7d' | '30d'

export const DATE_RANGES: { id: DateRangeId; label: string; hours: number }[] = [
  { id: '24h', label: 'Last 24 hours', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { id: '30d', label: 'Last 30 days', hours: 24 * 30 },
]

export type CardDefinition = {
  type: CardType
  label: string
  group: 'General' | 'Asset monitoring'
  format: 'Value' | 'Chart' | 'Table' | 'Text'
  description: string
  maxStreams: number
}

export const CARD_DEFINITIONS: CardDefinition[] = [
  {
    type: 'parameter-value',
    label: 'Asset, parameter value',
    group: 'General',
    format: 'Value',
    description: 'One asset parameter shown as a large number.',
    maxStreams: 1,
  },
  {
    type: 'custom-text',
    label: 'Custom text',
    group: 'General',
    format: 'Text',
    description: 'Notes or instructions for the people viewing this dashboard.',
    maxStreams: 0,
  },
  {
    type: 'parameters-summary',
    label: 'Parameters, summary',
    group: 'General',
    format: 'Table',
    description: 'Latest value and status for several streams.',
    maxStreams: 6,
  },
  {
    type: 'value-over-time',
    label: 'Stream value over time',
    group: 'Asset monitoring',
    format: 'Chart',
    description: 'Line chart of one or more streams for the selected date range.',
    maxStreams: 3,
  },
  {
    type: 'aggregate-value',
    label: 'Stream, aggregate value',
    group: 'Asset monitoring',
    format: 'Value',
    description: 'Average of a stream over the selected date range.',
    maxStreams: 1,
  },
  {
    type: 'last-value',
    label: 'Stream, last value',
    group: 'Asset monitoring',
    format: 'Value',
    description: 'Most recent reading on a gauge.',
    maxStreams: 1,
  },
]
