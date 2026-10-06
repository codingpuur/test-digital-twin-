export type ChartSeries = {
  name: string
  color: string
  /** One value per label; null leaves a gap (e.g. actual vs forecast). */
  values: (number | null)[]
  isDashed?: boolean
  axis?: 'left' | 'right'
}

export type AnswerChart = {
  title: string
  labels: string[]
  series: ChartSeries[]
}

export type AnswerAction = {
  label: string
  /** Path inside the site; `{ref}` is replaced with the current site. */
  href: string
  isPrimary?: boolean
}

export type AnswerListItem = { title: string; detail: string }

export type AssistantAnswer = {
  /** What the assistant "looked at", shown as steps before the answer. */
  steps: string[]
  intro: string
  chart?: AnswerChart
  list?: AnswerListItem[]
  outro?: string
  sources: string[]
  actions: AnswerAction[]
  followUps: string[]
}

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; answer: AssistantAnswer }

export type Chat = {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
}
