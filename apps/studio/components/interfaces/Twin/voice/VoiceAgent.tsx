import { Mic, Square, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { Button, cn, Input } from 'ui'

import { useSpeech, type SpeechLanguage } from './useSpeech'
import type { VoiceResult } from './voice.types'

type Exchange = { heard: string; reply: string }

type VoiceAgentProps = {
  /** Runs a command against the twin and returns what to say. */
  onCommand: (transcript: string) => VoiceResult
  /** True while a ticket is waiting for yes/no. */
  isAwaitingConfirmation: boolean
  hasHighlights: boolean
  onClear: () => void
}

/** Push-to-talk assistant over the 3D view: speak or type a question, it answers and acts on the model. */
export const VoiceAgent = ({
  onCommand,
  isAwaitingConfirmation,
  hasHighlights,
  onClear,
}: VoiceAgentProps) => {
  const [exchange, setExchange] = useState<Exchange | null>(null)
  const [language, setLanguage] = useState<SpeechLanguage>('en-IN')
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [typed, setTyped] = useState('')

  const speech = useSpeech((transcript) => run(transcript))

  const run = (transcript: string) => {
    const result = onCommand(transcript)
    setExchange({ heard: transcript, reply: result.reply })
    if (isSpeakerOn) speech.speak(result.reply, language)
  }

  const handleMic = () => {
    if (speech.isListening) speech.stop()
    else speech.start(language)
  }

  const handleTyped = () => {
    if (!typed.trim()) return
    run(typed.trim())
    setTyped('')
  }

  const statusLine = speech.isListening
    ? speech.interim || 'Listening…'
    : (speech.error ?? exchange?.heard ?? null)

  return (
    <div className="absolute left-3 top-3 z-10 flex w-[min(340px,calc(100%-24px))] flex-col gap-y-2">
      <div className="flex items-center gap-x-2 rounded-full border bg-surface-100/95 p-1.5 shadow-lg backdrop-blur">
        <Button
          variant={speech.isListening ? 'danger' : 'primary'}
          size="small"
          className={cn('shrink-0 rounded-full', speech.isListening && 'animate-pulse')}
          aria-label={speech.isListening ? 'Stop listening' : 'Talk to the assistant'}
          disabled={!speech.isSupported}
          title={
            speech.isSupported
              ? undefined
              : 'Voice input needs Chrome or Edge. You can type instead.'
          }
          icon={speech.isListening ? <Square size={14} /> : <Mic size={14} />}
          onClick={handleMic}
        />
        <Input
          size="tiny"
          className="min-w-0 flex-1 border-0 bg-transparent"
          placeholder={speech.isSupported ? 'Press the mic and speak, or type…' : 'Type a command…'}
          aria-label="Type a command"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleTyped()}
        />
        <Button
          variant="text"
          size="tiny"
          className="shrink-0"
          aria-label={`Language: ${language === 'en-IN' ? 'English' : 'Hindi'}`}
          onClick={() => setLanguage((previous) => (previous === 'en-IN' ? 'hi-IN' : 'en-IN'))}
        >
          {language === 'en-IN' ? 'EN' : 'HI'}
        </Button>
        <Button
          variant="text"
          size="tiny"
          className="shrink-0"
          aria-label={isSpeakerOn ? 'Mute voice replies' : 'Speak replies'}
          icon={isSpeakerOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          onClick={() => {
            if (isSpeakerOn) speech.stopSpeaking()
            setIsSpeakerOn((previous) => !previous)
          }}
        />
      </div>
      {(exchange || speech.isListening || speech.error) && (
        <div className="rounded-lg border bg-surface-100/95 p-3 text-sm shadow-lg backdrop-blur">
          {statusLine && (
            <p
              className={cn(
                'text-xs',
                speech.error ? 'text-destructive' : 'text-foreground-lighter'
              )}
            >
              {speech.isListening ? statusLine : speech.error ? statusLine : `You: ${statusLine}`}
            </p>
          )}
          {exchange && !speech.isListening && (
            <p className="mt-1 max-h-40 overflow-y-auto">{exchange.reply}</p>
          )}
          {(isAwaitingConfirmation || hasHighlights) && !speech.isListening && (
            <div className="mt-2 flex gap-x-2">
              {isAwaitingConfirmation && (
                <>
                  <Button size="tiny" variant="primary" onClick={() => run('yes')}>
                    Yes, create
                  </Button>
                  <Button size="tiny" variant="default" onClick={() => run('no')}>
                    No
                  </Button>
                </>
              )}
              {hasHighlights && !isAwaitingConfirmation && (
                <Button size="tiny" variant="default" onClick={onClear}>
                  Clear highlights
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
