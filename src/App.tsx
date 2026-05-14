import { useState, useRef, useEffect } from 'react'
import './App.css'

interface Message {
  id: number
  role: 'user' | 'model'
  content: string
}

const MODELS = [
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
]

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('davgpt_gemini_key') || '')
  const [model, setModel] = useState(MODELS[0].id)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('davgpt_gemini_key'))
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveKey = () => {
    localStorage.setItem('davgpt_gemini_key', apiKey)
    setShowSettings(false)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading || !apiKey) return

    const userMsg: Message = { id: Date.now(), role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch(
        `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: history.map(m => ({
              role: m.role,
              parts: [{ text: m.content }],
            })),
          }),
        }
      )

      const data = await res.json()
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        data.error?.message ??
        'No response'

      setMessages(prev => [...prev, { id: Date.now(), role: 'model', content: reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'model', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">DAVGpt</span>
          <select className="model-select" value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
      </header>

      {showSettings && (
        <div className="modal-overlay" onClick={() => apiKey && setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            <label>Google Gemini API Key</label>
            <input
              type="password"
              className="key-input"
              placeholder="AIza..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              autoFocus
            />
            <p className="hint">Get your key at aistudio.google.com — stored locally only.</p>
            <button className="btn-primary" onClick={saveKey} disabled={!apiKey}>Save & Continue</button>
          </div>
        </div>
      )}

      <main className="messages">
        {messages.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <p>How can I help you today?</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`msg msg-${msg.role}`}>
            <div className="bubble">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="msg msg-model">
            <div className="bubble typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="input-bar">
        <div className="input-wrap">
          <textarea
            ref={textareaRef}
            className="input"
            rows={1}
            placeholder={apiKey ? 'Message DAVGpt...' : 'Add your Gemini API key in settings first'}
            value={input}
            onChange={autoResize}
            onKeyDown={onKeyDown}
            disabled={!apiKey || loading}
          />
          <button className="send-btn" onClick={send} disabled={!input.trim() || loading || !apiKey}>↑</button>
        </div>
      </footer>
    </div>
  )
}
