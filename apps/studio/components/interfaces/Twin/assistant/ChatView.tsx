import { useEffect, useRef } from 'react'

import { AnswerView, PendingAnswer } from './AnswerView'
import type { Chat } from './assistant.types'
import { Composer } from './Composer'

export type PendingState = { steps: string[]; doneCount: number }

type ChatViewProps = {
  chat: Chat
  siteRef: string
  pending: PendingState | null
  onAsk: (question: string) => void
}

export const ChatView = ({ chat, siteRef, pending, onAsk }: ChatViewProps) => {
  const endRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [chat.messages.length, pending?.doneCount])

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center border-b px-6">
        <h1 className="truncate text-sm">{chat.title}</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-y-6 px-6 py-6">
          {chat.messages.map((message) =>
            message.role === 'user' ? (
              <div
                key={message.id}
                className="ml-auto max-w-lg rounded-2xl rounded-br-sm border bg-surface-200 px-4 py-2 text-sm"
              >
                {message.text}
              </div>
            ) : (
              <AnswerView
                key={message.id}
                answer={message.answer}
                siteRef={siteRef}
                onFollowUp={onAsk}
              />
            )
          )}
          {pending && <PendingAnswer steps={pending.steps} doneCount={pending.doneCount} />}
          <div ref={endRef} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl shrink-0 px-6 pb-5 pt-2">
        <Composer placeholder="Ask a follow-up…" isDisabled={pending !== null} onSend={onAsk} />
        <p className="mt-1.5 text-center text-xs text-foreground-lighter">
          Demo assistant: answers are scripted sample data.
        </p>
      </div>
    </div>
  )
}
