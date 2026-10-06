import { Check, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from 'ui'

import { AnswerChart } from './AnswerChart'
import type { AssistantAnswer } from './assistant.types'

const Avatar = () => (
  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-background">
    <Sparkles size={14} />
  </div>
)

const Steps = ({ steps, doneCount }: { steps: string[]; doneCount: number }) => (
  <div className="mb-3 flex flex-col gap-y-1 rounded-lg border bg-surface-75 px-3 py-2 text-xs text-foreground-light">
    {steps.slice(0, doneCount + 1).map((step, index) => {
      const isDone = index < doneCount
      return (
        <div key={step} className="flex items-center gap-x-2">
          {isDone ? (
            <Check size={12} className="text-brand" />
          ) : (
            <Loader2 size={12} className="animate-spin" />
          )}
          {step}
        </div>
      )
    })}
  </div>
)

/** Shown while the answer is being "worked out": the steps appear one by one. */
export const PendingAnswer = ({ steps, doneCount }: { steps: string[]; doneCount: number }) => (
  <div className="flex gap-x-3">
    <Avatar />
    <div className="min-w-0 flex-1">
      <Steps steps={steps} doneCount={doneCount} />
    </div>
  </div>
)

type AnswerViewProps = {
  answer: AssistantAnswer
  siteRef: string
  onFollowUp: (question: string) => void
}

export const AnswerView = ({ answer, siteRef, onFollowUp }: AnswerViewProps) => (
  <div className="flex gap-x-3">
    <Avatar />
    <div className="min-w-0 flex-1 text-sm">
      <Steps steps={answer.steps} doneCount={answer.steps.length} />
      <p className="mb-2">{answer.intro}</p>
      {answer.chart && <AnswerChart chart={answer.chart} />}
      {answer.list && (
        <ol className="mb-2 flex list-decimal flex-col gap-y-1 pl-5">
          {answer.list.map((item) => (
            <li key={item.title}>
              <span className="font-medium">{item.title}.</span>{' '}
              <span className="text-foreground-light">{item.detail}</span>
            </li>
          ))}
        </ol>
      )}
      {answer.outro && <p className="mb-2 text-foreground-light">{answer.outro}</p>}

      {answer.sources.length > 0 && (
        <div className="my-3 flex flex-wrap gap-1.5">
          {answer.sources.map((source) => (
            <span
              key={source}
              className="rounded-md border bg-surface-100 px-2 py-0.5 text-xs text-foreground-light"
            >
              {source}
            </span>
          ))}
        </div>
      )}

      {answer.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.actions.map((action) => (
            <Button
              key={action.label}
              asChild
              size="tiny"
              variant={action.isPrimary ? 'primary' : 'default'}
            >
              <Link href={action.href.replace('{ref}', siteRef)}>{action.label}</Link>
            </Button>
          ))}
        </div>
      )}

      {answer.followUps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {answer.followUps.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onFollowUp(question)}
              className="rounded-full border px-3 py-1 text-xs text-foreground-light transition-colors hover:border-foreground-muted hover:text-foreground"
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
)
