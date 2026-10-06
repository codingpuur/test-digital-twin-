import { useParams } from 'common'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useRef, useState } from 'react'
import { Button, cn } from 'ui'

import { answerFor } from './assistant-engine'
import { groupChats } from './assistant.utils'
import { AssistantHome } from './AssistantHome'
import { ChatView, type PendingState } from './ChatView'
import { useAssistantChats } from './useAssistantChats'
import { useProfile } from '@/lib/profile'

const STEP_DELAY_MS = 450

export const AssistantPage = () => {
  const { ref } = useParams()
  const siteRef = ref ?? ''
  const { profile } = useProfile()
  const { chats, createChat, addMessage } = useAssistantChats(siteRef)
  const [chatId, setChatId] = useQueryState('chat', parseAsString)
  const [pending, setPending] = useState<PendingState | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Stop any "thinking" in progress when leaving the page.
  useEffect(() => {
    const active = timers.current
    return () => active.forEach(clearTimeout)
  }, [])

  const activeChat = chats.find((chat) => chat.id === chatId) ?? null

  const handleAsk = (question: string) => {
    if (pending) return
    const id = activeChat?.id ?? createChat(question)
    if (activeChat) {
      addMessage(id, { id: `m-${Date.now()}`, role: 'user', text: question })
    }
    setChatId(id)

    // Reveal the steps one at a time, then the answer, so it feels like the work is being done.
    const answer = answerFor(question)
    setPending({ steps: answer.steps, doneCount: 0 })
    answer.steps.forEach((_, index) => {
      timers.current.push(
        setTimeout(
          () => setPending({ steps: answer.steps, doneCount: index + 1 }),
          (index + 1) * STEP_DELAY_MS
        )
      )
    })
    timers.current.push(
      setTimeout(
        () => {
          addMessage(id, { id: `a-${Date.now()}`, role: 'assistant', answer })
          setPending(null)
        },
        (answer.steps.length + 1) * STEP_DELAY_MS
      )
    )
  }

  const groups = groupChats(chats, Date.now())

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b px-4 py-3">
        <Link
          href={`/project/${siteRef}`}
          className="flex items-center gap-x-2 text-sm text-foreground-light hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to site
        </Link>
        <span className="mx-auto text-sm">Assistant</span>
        <span className="w-24" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[250px_1fr]">
        <aside className="flex flex-col gap-y-1 overflow-y-auto border-r bg-dash-sidebar p-3">
          <Button
            variant="default"
            icon={<Plus size={14} />}
            className="mb-2"
            disabled={pending !== null}
            onClick={() => setChatId(null)}
          >
            New chat
          </Button>
          {groups.map(({ group, chats: items }) => (
            <div key={group} className="flex flex-col gap-y-0.5">
              <p className="px-2 pb-0.5 pt-3 text-xs uppercase tracking-wide text-foreground-lighter">
                {group}
              </p>
              {items.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => setChatId(chat.id)}
                  className={cn(
                    'truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    chat.id === activeChat?.id
                      ? 'bg-surface-300 text-foreground'
                      : 'text-foreground-light hover:bg-surface-200 hover:text-foreground'
                  )}
                >
                  {chat.title}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <main className="min-h-0 min-w-0">
          {activeChat ? (
            <ChatView chat={activeChat} siteRef={siteRef} pending={pending} onAsk={handleAsk} />
          ) : (
            <AssistantHome
              name={profile?.first_name || undefined}
              isDisabled={pending !== null}
              onAsk={handleAsk}
            />
          )}
        </main>
      </div>
    </div>
  )
}
