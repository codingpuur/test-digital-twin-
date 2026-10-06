import type { Chat } from './assistant.types'

export type ChatGroup = 'Today' | 'Yesterday' | 'Earlier'

const startOfDay = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export const groupOf = (updatedAt: number, now: number): ChatGroup => {
  const dayMs = 24 * 60 * 60 * 1000
  const today = startOfDay(now)
  if (updatedAt >= today) return 'Today'
  if (updatedAt >= today - dayMs) return 'Yesterday'
  return 'Earlier'
}

export const groupChats = (chats: Chat[], now: number) => {
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt)
  return (['Today', 'Yesterday', 'Earlier'] as const)
    .map((group) => ({
      group,
      chats: sorted.filter((chat) => groupOf(chat.updatedAt, now) === group),
    }))
    .filter((entry) => entry.chats.length > 0)
}

export const titleFromQuestion = (question: string) => {
  const clean = question.trim().replace(/\s+/g, ' ')
  return clean.length > 48 ? `${clean.slice(0, 47)}…` : clean
}

export const greetingFor = (hour: number) => {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
