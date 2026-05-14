import { useState, useRef, useEffect } from 'react'
import './App.css'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const MODELS = [
  { id: 'claude-opus-4-5', label: 'Claude Opus' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku' },
]

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('davgpt_key') || '')
  const [model, setModel] = useState(MODELS[1].id)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('davgpt_key'))
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveKey = () => {
    localStorage.setItem('davgpt_key', apiKey)
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
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      const reply = data.content?.[0]?.text ?? data.error?.message ?? 'No response'
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: `Error: ${e.message}` }])
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
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">DAVGpt</span>
          <select
            className="model-select"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
          ⚙️
        </button>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => apiKey && setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            <label>Anthropic API Key</label>
            <input
              type="password"
              className="key-input"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              autoFocus
            />
            <p className="hint">Your key is stored locally on this device only.</p>
            <button className="btn-primary" onClick={saveKey} disabled={!apiKey}>
              Save & Continue
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
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
          <div className="msg msg-assistant">
            <div className="bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <footer className="input-bar">
        <div className="input-wrap">
          <textarea
            ref={textareaRef}
            className="input"
            rows={1}
            placeholder={apiKey ? 'Message DAVGpt...' : 'Add your API key in settings first'}
            value={input}
            onChange={autoResize}
            onKeyDown={onKeyDown}
            disabled={!apiKey || loading}
          />
          <button
            className="send-btn"
            onClick={send}
            disabled={!input.trim() || loading || !apiKey}
          >
            ↑
          </button>
        </div>
      </footer>
    </div>
  )
}
