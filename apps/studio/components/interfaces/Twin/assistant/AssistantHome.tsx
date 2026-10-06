import { MessageSquare } from 'lucide-react'
import { cn } from 'ui'

import { Sparkline } from '../Sparkline'
import { ATTENTION_CARDS, SUGGESTED_PROMPTS } from './assistant-data'
import { greetingFor } from './assistant.utils'
import { Composer } from './Composer'

const LEVEL_STYLE = {
  Critical: { dot: 'bg-destructive', line: 'text-destructive' },
  Warning: { dot: 'bg-warning', line: 'text-warning' },
  Ok: { dot: 'bg-brand', line: 'text-brand' },
} as const

type AssistantHomeProps = {
  name: string | undefined
  isDisabled: boolean
  onAsk: (question: string) => void
}

export const AssistantHome = ({ name, isDisabled, onAsk }: AssistantHomeProps) => (
  <div className="flex h-full flex-col items-center overflow-y-auto px-6 pt-16 pb-10">
    <h1 className="mb-6 text-3xl">
      {greetingFor(new Date().getHours())}
      {name ? `, ${name}` : ''}
    </h1>
    <div className="w-full max-w-2xl">
      <Composer
        placeholder="Ask about alarms, assets, tickets, forecasts or how the station is running…"
        isDisabled={isDisabled}
        onSend={onAsk}
      />
      <div className="mt-3 flex flex-col">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onAsk(prompt)}
            className="flex items-center gap-x-3 rounded-md px-3 py-2 text-left text-sm text-foreground-light transition-colors hover:bg-surface-100 hover:text-foreground"
          >
            <MessageSquare size={14} className="shrink-0 text-brand" />
            {prompt}
          </button>
        ))}
      </div>
    </div>

    <div className="mt-12 w-full max-w-4xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wide text-foreground-light">Needs attention</h2>
        <span className="text-xs text-foreground-lighter">Updated just now · sample data</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ATTENTION_CARDS.map((card) => (
          <div
            key={card.asset}
            className="flex flex-col gap-y-1 rounded-lg border bg-surface-100 p-3"
          >
            <p className="flex items-center gap-x-2 text-sm font-medium">
              <span className={cn('size-2 rounded-full', LEVEL_STYLE[card.level].dot)} />
              {card.level}
            </p>
            <p className="text-sm">{card.asset}</p>
            <p className="min-h-9 text-xs text-foreground-light">{card.detail}</p>
            <Sparkline
              values={card.trend}
              className={cn('h-7 w-full', LEVEL_STYLE[card.level].line)}
            />
            <p className="text-xs text-foreground-lighter">{card.footer}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
)
