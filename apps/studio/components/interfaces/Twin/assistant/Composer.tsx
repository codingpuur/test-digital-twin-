import { ArrowUp } from 'lucide-react'
import { useState } from 'react'
import { Button, Textarea } from 'ui'

type ComposerProps = {
  placeholder: string
  isDisabled: boolean
  onSend: (question: string) => void
}

export const Composer = ({ placeholder, isDisabled, onSend }: ComposerProps) => {
  const [value, setValue] = useState('')
  const canSend = value.trim().length > 0 && !isDisabled

  const send = () => {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <div className="rounded-xl border bg-surface-100 p-3 focus-within:border-foreground-muted">
      <Textarea
        value={value}
        rows={2}
        placeholder={placeholder}
        aria-label="Ask the assistant"
        className="resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, Shift+Enter adds a line, like most chat apps.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            send()
          }
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-foreground-lighter">
          Enter to send · Shift+Enter for a new line
        </span>
        <Button
          variant="primary"
          size="tiny"
          aria-label="Send"
          disabled={!canSend}
          icon={<ArrowUp size={14} />}
          onClick={send}
        />
      </div>
    </div>
  )
}
