import { useRef, useState } from 'react'

import { seedChats } from './assistant-data'
import type { Chat, ChatMessage } from './assistant.types'
import { titleFromQuestion } from './assistant.utils'
import { useLocalStorage } from '@/hooks/misc/useLocalStorage'

const createId = () => `chat-${Math.random().toString(36).slice(2, 10)}`

/** Chat history for a site, kept in the browser, starting with a few sample conversations. */
export const useAssistantChats = (siteRef: string) => {
  const [seed] = useState(() => seedChats(Date.now()))
  const [chats, setChats] = useLocalStorage<Chat[]>(`twin-assistant-${siteRef}`, seed)

  // The answer arrives from a timer, long after the render that scheduled it. Read the latest list
  // from a ref and write whole lists back, so a stale closure cannot drop a chat created meanwhile.
  const latest = useRef(chats)
  latest.current = chats
  const commit = (next: Chat[]) => {
    latest.current = next
    setChats(next)
  }

  const createChat = (question: string) => {
    const chat: Chat = {
      id: createId(),
      title: titleFromQuestion(question),
      updatedAt: Date.now(),
      messages: [{ id: `${createId()}-q`, role: 'user', text: question }],
    }
    commit([...latest.current, chat])
    return chat.id
  }

  const addMessage = (chatId: string, message: ChatMessage) =>
    commit(
      latest.current.map((chat) =>
        chat.id === chatId
          ? { ...chat, updatedAt: Date.now(), messages: [...chat.messages, message] }
          : chat
      )
    )

  return { chats, createChat, addMessage }
}
