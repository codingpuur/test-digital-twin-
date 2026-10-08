import { useEffect, useRef, useState } from 'react'

// Thin wrapper over the browser's speech recognition and speech synthesis. Recognition works in
// Chrome and Edge (and partly Safari); speaking works almost everywhere.

type RecognitionAlternative = { transcript: string }
type RecognitionResult = ArrayLike<RecognitionAlternative> & { isFinal: boolean }
type RecognitionEvent = { results: ArrayLike<RecognitionResult> }
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

const getRecognitionConstructor = (): (new () => Recognition) | null => {
  if (typeof window === 'undefined') return null
  const host = window as unknown as {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

export type SpeechLanguage = 'en-IN' | 'hi-IN'

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it in the browser address bar.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in the browser address bar.',
  'no-speech': 'I did not hear anything. Try again.',
  'audio-capture': 'No microphone was found.',
  network: 'Speech recognition needs an internet connection.',
}

export const useSpeech = (onFinalTranscript: (transcript: string) => void) => {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognition = useRef<Recognition | null>(null)
  // The latest callback, so a recognition started earlier never calls a stale one.
  const onFinal = useRef(onFinalTranscript)
  onFinal.current = onFinalTranscript

  // Support is only known in the browser, so it is read after mount rather than during render.
  useEffect(() => {
    setIsSupported(getRecognitionConstructor() !== null)
    return () => {
      recognition.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const start = (language: SpeechLanguage) => {
    const Constructor = getRecognitionConstructor()
    if (!Constructor) return
    window.speechSynthesis?.cancel()
    setError(null)
    setInterim('')

    const instance = new Constructor()
    instance.lang = language
    instance.interimResults = true
    instance.continuous = false
    instance.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      const text = last[0].transcript
      if (last.isFinal) {
        setInterim('')
        onFinal.current(text)
      } else {
        setInterim(text)
      }
    }
    instance.onerror = (event) =>
      setError(ERROR_MESSAGES[event.error] ?? `Voice error: ${event.error}`)
    instance.onend = () => {
      setIsListening(false)
      setInterim('')
    }
    recognition.current = instance
    instance.start()
    setIsListening(true)
  }

  const stop = () => recognition.current?.stop()

  const speak = (text: string, language: SpeechLanguage) => {
    const synthesis = typeof window === 'undefined' ? undefined : window.speechSynthesis
    if (!synthesis) return
    synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    synthesis.speak(utterance)
  }

  const stopSpeaking = () => window.speechSynthesis?.cancel()

  return { isSupported, isListening, interim, error, start, stop, speak, stopSpeaking }
}
