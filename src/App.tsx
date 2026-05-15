import { useState, useRef, useEffect } from 'react'
import Terminal from './Terminal'
import SkillsPanel, { Skill } from './Skills'
import MessageBubble from './MessageBubble'
import { useTerminalBridge } from './useTerminalBridge'
import './App.css'

interface Message {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCall?: { name: string; args: any }
  toolResult?: string
}

const MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', agent: false },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', agent: false },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', agent: false },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B', agent: false },
  { id: 'nous-hermes-2-pro-llama-3-8b', label: '🤖 Hermes Agent', agent: true },
]

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'

const HERMES_SYSTEM = `You are a helpful AI assistant with access to tools. When you want to use a tool, respond with a tool_call block in this exact format:

<tool_call>
{"name": "tool_name", "arguments": {"arg1": "value1"}}
</tool_call>

Available tools:
- web_search(query: string): Search the web
- calculate(expression: string): Evaluate a math expression
- get_time(): Get the current date and time
- summarize(text: string): Summarize a long text

After receiving a tool result, continue your response naturally.`

function parseToolCall(content: string) {
  const match = content.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/)
  if (!match) return null
  try { return JSON.parse(match[1]) } catch { return null }
}

async function executeTool(name: string, args: any): Promise<string> {
  switch (name) {
    case 'calculate':
      try { return `Result: ${Function(`"use strict"; return (${args.expression})`)()}` } catch { return 'Error: invalid expression' }
    case 'get_time': return `Current time: ${new Date().toLocaleString()}`
    case 'summarize': return `[Summarize the following in your next response]`
    case 'web_search': return `[Search: "${args.query}" — use training knowledge]`
    default: return `[Tool "${name}" unavailable]`
  }
}

function Chat({ bridge, switchToTerminal }: {
  bridge: ReturnType<typeof useTerminalBridge>
  switchToTerminal: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('davgpt_groq_key') || '')
  const [model, setModel] = useState(MODELS[0].id)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('davgpt_groq_key'))
  const [showSkills, setShowSkills] = useState(false)
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isHermes = MODELS.find(m => m.id === model)?.agent ?? false

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveKey = () => { localStorage.setItem('davgpt_groq_key', apiKey); setShowSettings(false) }

  const onSkillSelect = (skill: Skill) => {
    setActiveSkill(skill)
    if (skill.inputTemplate) setInput(skill.inputTemplate)
    textareaRef.current?.focus()
  }

  const buildApiMessages = (msgs: Message[]) => {
    const result: any[] = []
    if (isHermes) result.push({ role: 'system', content: HERMES_SYSTEM })
    else if (activeSkill) result.push({ role: 'system', content: activeSkill.systemPrompt })
    for (const m of msgs) {
      if (m.role === 'system') continue
      result.push({ role: m.role, content: m.content })
      if (m.toolResult) result.push({ role: 'user', content: `<tool_response>\n${m.toolResult}\n</tool_response>` })
    }
    return result
  }

  const callGroq = async (msgs: Message[]) => {
    const res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: buildApiMessages(msgs) }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? data.error?.message ?? 'No response'
  }

  const handleRunCommand = (cmd: string): boolean => {
    const ok = bridge.sendCommand(cmd)
    if (ok) switchToTerminal()
    return ok
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading || !apiKey) return
    const userMsg: Message = { id: Date.now(), role: 'user', content: text }
    let history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      let reply = await callGroq(history)
      const toolCall = isHermes ? parseToolCall(reply) : null
      if (toolCall) {
        const assistantMsg: Message = { id: Date.now(), role: 'assistant', content: reply, toolCall }
        history = [...history, assistantMsg]
        setMessages(history)
        const toolResult = await executeTool(toolCall.name, toolCall.args)
        const withResult: Message = { ...assistantMsg, toolResult }
        history = [...history.slice(0, -1), withResult]
        setMessages(history)
        reply = await callGroq(history)
        history = [...history, { id: Date.now() + 1, role: 'assistant', content: reply }]
      } else {
        history = [...history, { id: Date.now(), role: 'assistant', content: reply }]
      }
      setMessages(history)
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
        <div className="header-right">
          <span className={`mini-conn ${bridge.connState}`} title={`Terminal: ${bridge.connState}`}>⌨️</span>
          <button className="icon-btn" onClick={() => setShowSettings(true)}>⚙️</button>
        </div>
      </header>

      {showSkills && <SkillsPanel onSelect={onSkillSelect} onClose={() => setShowSkills(false)} />}

      {activeSkill && !isHermes && (
        <div className="skill-banner">
          {activeSkill.icon} {activeSkill.label}
          <button className="skill-clear" onClick={() => { setActiveSkill(null); setInput('') }}>✕</button>
        </div>
      )}

      {isHermes && <div className="agent-banner">🤖 Hermes Agent Mode — tool calling enabled</div>}

      {showSettings && (
        <div className="modal-overlay" onClick={() => apiKey && setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            <label>Groq API Key</label>
            <input type="password" className="key-input" placeholder="gsk_..." value={apiKey}
              onChange={e => setApiKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveKey()} autoFocus />
            <p className="hint">Get your free key at console.groq.com — stored locally only.</p>
            <button className="btn-primary" onClick={saveKey} disabled={!apiKey}>Save & Continue</button>
          </div>
        </div>
      )}

      <main className="messages">
        {messages.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <p>{isHermes ? 'Hermes Agent ready.' : 'How can I help you today?'}</p>
            {bridge.connState !== 'connected' && (
              <p className="empty-hint">💡 Connect Terminal to run AI-suggested commands directly</p>
            )}
          </div>
        )}
        {messages.map(msg => msg.role !== 'system' && (
          <div key={msg.id} className={`msg msg-${msg.role}`}>
            <MessageBubble
              content={msg.content}
              role={msg.role as 'user' | 'assistant'}
              onRunCommand={msg.role === 'assistant' ? handleRunCommand : undefined}
              connState={bridge.connState}
            />
            {msg.toolCall && (
              <div className="tool-call">
                <span className="tool-tag">🔧 {msg.toolCall.name}</span>
                <code>{JSON.stringify(msg.toolCall.args)}</code>
              </div>
            )}
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
          {!isHermes && (
            <button className="skill-btn" onClick={() => setShowSkills(true)} disabled={!apiKey}>⚡</button>
          )}
          <textarea ref={textareaRef} className="input" rows={1}
            placeholder={apiKey ? (isHermes ? 'Ask Hermes Agent...' : activeSkill ? activeSkill.placeholder : 'Message DAVGpt...') : 'Add your Groq API key in settings first'}
            value={input} onChange={autoResize} onKeyDown={onKeyDown} disabled={!apiKey || loading}
          />
          <button className="send-btn" onClick={send} disabled={!input.trim() || loading || !apiKey}>↑</button>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'chat' | 'terminal'>('chat')
  const bridge = useTerminalBridge()

  return (
    <div className="app">
      <div className="tab-content">
        {tab === 'chat'
          ? <Chat bridge={bridge} switchToTerminal={() => setTab('terminal')} />
          : <Terminal bridge={bridge} />
        }
      </div>
      <nav className="tab-bar">
        <button className={`tab-btn ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          <span className="tab-icon">💬</span>
          <span className="tab-label">Chat</span>
        </button>
        <button className={`tab-btn ${tab === 'terminal' ? 'active' : ''}`} onClick={() => setTab('terminal')}>
          <span className="tab-icon">⌨️</span>
          <span className="tab-label">Terminal</span>
          {bridge.connState === 'connected' && <span className="tab-dot" />}
        </button>
      </nav>
    </div>
  )
}
