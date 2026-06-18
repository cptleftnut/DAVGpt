// useSpeech.ts — TTS + STT via Web Speech API (built into Android WebView)
import { useState, useRef, useCallback, useEffect } from 'react'

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: () => void;
  onresult: (e: SpeechRecognitionEvent) => void;
  onerror: (e: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}


// ── TTS ────────────────────────────────────────────────────
export function useTTS() {
  const [speaking, setSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem('davgpt_autospeak') === 'true')
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    // Strip markdown and code blocks for cleaner reading
    const clean = text
      .replace(/```[\s\S]*?```/g, '[code block]')
      .replace(/`[^`]+`/g, '')
      .replace(/[*_#>~]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
    const utter = new SpeechSynthesisUtterance(clean)
    utter.rate = 1.05
    utter.pitch = 1
    utter.volume = 1
    utter.onstart = () => setSpeaking(true)
    utter.onend = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)
    utterRef.current = utter
    window.speechSynthesis.speak(utter)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak(prev => {
      const next = !prev
      localStorage.setItem('davgpt_autospeak', String(next))
      return next
    })
  }, [])

  // Cancel speech on unmount
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  return { speaking, speak, stop, autoSpeak, toggleAutoSpeak, supported: !!window.speechSynthesis }
}

// ── STT ────────────────────────────────────────────────────
export function useSTT(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recogRef = useRef<ISpeechRecognition | null>(null)

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const supported = !!SpeechRecognition

  const start = useCallback(() => {
    if (!SpeechRecognition) { setError('Speech recognition not supported'); return }
    setError(null)
    const recog = new SpeechRecognition()
    recog.lang = navigator.language || 'en-US'
    recog.continuous = false
    recog.interimResults = false
    recog.maxAlternatives = 1
    recog.onstart = () => setListening(true)
    recog.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      onResult(transcript)
      setListening(false)
    }
    recog.onerror = (e: SpeechRecognitionErrorEvent) => {
      setError(e.error === 'not-allowed' ? 'Mic permission denied' : e.error)
      setListening(false)
    }
    recog.onend = () => setListening(false)
    recogRef.current = recog
    recog.start()
  }, [onResult])

  const stop = useCallback(() => {
    recogRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, start, stop, error, supported }
}
