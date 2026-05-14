import { useState, useRef, useEffect } from 'react'
import Terminal from './Terminal'
import './App.css'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
]

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions'

function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('davgpt_openai_key') || '')
  const [model, setModel] = useState(MODELS[0].id)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('davgpt_openai_key'))
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveKey = () => {
    localStorage.setItem('davgpt_openai_key', apiKey)
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
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      const res = await fetch(OPENAI_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content ?? data.error?.message ?? 'No response'
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <div className="chat-page">
      <header className="header">
        <div className="header-left">
          <span className="logo">DAVGpt</span>
          <select className="model-select" value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)}>⚙️</button>
      </header>

      {showSettings && (
        <div className="modal-overlay" onClick={() => apiKey && setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            <label>OpenAI API Key</label>
            <input
              type="password"
              className="key-input"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              autoFocus
            />
            <p className="hint">Get your key at platform.openai.com — stored locally only.</p>
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
          <div className="msg msg-assistant">
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
            placeholder={apiKey ? 'Message DAVGpt...' : 'Add your OpenAI API key in settings first'}
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

export default function App() {
  const [tab, setTab] = useState<'chat' | 'terminal'>('chat')

  return (
    <div className="app">
      <div className="tab-content">
        {tab === 'chat' ? <Chat /> : <Terminal />}
      </div>
      <nav className="tab-bar">
        <button
          className={`tab-btn ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => setTab('chat')}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">Chat</span>
        </button>
        <button
          className={`tab-btn ${tab === 'terminal' ? 'active' : ''}`}
          onClick={() => setTab('terminal')}
        >
          <span className="tab-icon">⌨️</span>
          <span className="tab-label">Terminal</span>
        </button>
      </nav>
    </div>
  )
}
