import { useState, useRef, useEffect } from 'react'
import Terminal from './Terminal'
import SkillsPanel, { Skill } from './Skills'
import MessageBubble from './MessageBubble'
import Sidebar from './Sidebar'
import { useTerminalBridge } from './useTerminalBridge'
import { useTTS, useSTT } from './useSpeech'
import MCPPanel from './MCPPanel'
import Cortex from './Cortex'
import { addBlock, getChainContext } from './soma'
import { loadIrisProfile, routeMessage, IRIS_ROUTES } from './iris'
import AgentPanel from './AgentPanel'
import { type MCPServer, loadMCPServers, callMCPTool } from './mcp'
import {
  type Session, type Environment, type Message,
  loadSessions, saveSessions, loadActiveId, saveActiveId,
  loadEnvironments, saveCustomEnvironments,
  createSession, autoNameSession,
} from './sessions'
import './App.css'

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'

function parseToolCall(content: string) {
  const match = content.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/)
  if (!match) return null
  try { return JSON.parse(match[1]) } catch { return null }
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'calculate':
      try { return `Result: ${Function(`"use strict"; return (${String(args.expression)})`)()}` } catch { return 'Error' }
    case 'get_time': return `Current time: ${new Date().toLocaleString()}`
    default: return `[Tool "${name}" unavailable]`
  }
}

function Chat({ session, environments, onUpdateSession, onOpenSidebar, bridge, switchToTerminal, mcpServers, onOpenMCP }: {
  session: Session
  environments: Environment[]
  onUpdateSession: (s: Session) => void
  onOpenSidebar: () => void
  bridge: ReturnType<typeof useTerminalBridge>
  switchToTerminal: () => void
  mcpServers: MCPServer[]
  onOpenMCP: () => void
}) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('davgpt_groq_key'))
  const [showSkills, setShowSkills] = useState(false)
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('davgpt_groq_key') || '')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const env = environments.find(e => e.id === session.environmentId) || environments[0]
  const irisProfile = loadIrisProfile()
  const irisRoute = IRIS_ROUTES[irisProfile]
  const isHermes = session.environmentId === 'hermes'

  const tts = useTTS()
  const stt = useSTT((transcript) => setInput(prev => prev ? prev + ' ' + transcript : transcript))

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [session.messages, loading])

  const saveKey = () => { localStorage.setItem('davgpt_groq_key', apiKey); setShowSettings(false) }

  const updateMessages = (messages: Message[]) => {
    const updated: Session = {
      ...session,
      messages,
      updatedAt: Date.now(),
      name: session.messages.length === 0 ? autoNameSession(messages) : session.name,
    }
    onUpdateSession(updated)
  }

  const buildApiMessages = (msgs: Message[]) => {
    const connected = mcpServers.filter(s => s.connected)
    const mcpContext = connected.length > 0
      ? '\n\nYou have access to these MCP integrations:\n' + connected.map(s =>
          `- ${s.name} (${s.icon}): ${s.tools?.map(t => t.name).join(', ') || 'connected'}`
        ).join('\n') +
        '\n\nTo use an MCP tool, include in your response:\n<mcp_call>{"server":"server_id","tool":"tool_name","args":{}}</mcp_call>'
      : ''
    const somaCtx = getChainContext(6)
    const result: any[] = [{ role: 'system', content: (activeSkill ? activeSkill.systemPrompt : env.systemPrompt) + mcpContext + somaCtx }]
    for (const m of msgs) {
      if (m.role === 'system') continue
      result.push({ role: m.role, content: m.content })
      if (m.toolResult) result.push({ role: 'user', content: `<tool_response>\n${m.toolResult}\n</tool_response>` })
    }
    return result
  }

  const callGroq = async (msgs: Message[]) => {
    const irisProfile = loadIrisProfile()
    const routed = routeMessage(irisProfile, (environments.find(e => e.id === session.environmentId) || environments[0]).systemPrompt)
    const res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: session.model, max_tokens: routed.maxTokens, temperature: routed.temperature, messages: buildApiMessages(msgs) }),
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
    addBlock({ type: 'context', content: text, source: 'user', tags: ['chat', session.environmentId] })
    let msgs = [...session.messages, userMsg]
    updateMessages(msgs)
    setInput('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      let reply = await callGroq(msgs)

      // Handle MCP tool calls
      const mcpMatch = reply.match(/<mcp_call>([\s\S]*?)<\/mcp_call>/)
      if (mcpMatch) {
        try {
          const { server: serverId, tool, args } = JSON.parse(mcpMatch[1])
          const srv = mcpServers.find(s => s.id === serverId && s.connected)
          if (srv) {
            const mcpResult = await callMCPTool(srv, tool, args)
            const cleanReply = reply.replace(/<mcp_call>[\s\S]*?<\/mcp_call>/, '').trim()
            const aMsg: Message = { id: Date.now(), role: 'assistant', content: cleanReply || `Using ${srv.name}...`, toolCall: { name: `${srv.icon} ${tool}`, args } }
            msgs = [...msgs, aMsg]
            updateMessages(msgs)
            msgs = [...msgs.slice(0,-1), { ...aMsg, toolResult: mcpResult }]
            updateMessages(msgs)
            reply = await callGroq([...msgs, { id: 0, role: 'user' as const, content: `MCP Result from ${srv.name}:\n${mcpResult}` }])
          }
        } catch (_) {}
      }

      const toolCall = isHermes ? parseToolCall(reply) : null
      if (toolCall) {
        const aMsg: Message = { id: Date.now(), role: 'assistant', content: reply, toolCall }
        msgs = [...msgs, aMsg]
        updateMessages(msgs)
        const toolResult = await executeTool(toolCall.name, toolCall.args)
        msgs = [...msgs.slice(0,-1), { ...aMsg, toolResult }]
        updateMessages(msgs)
        reply = await callGroq(msgs)
      }
      msgs = [...msgs, { id: Date.now()+1, role: 'assistant', content: reply }]
      updateMessages(msgs)
      addBlock({ type: 'context', content: reply.slice(0,300), source: 'agent', tags: ['chat', 'response'] })
      if (tts.autoSpeak) tts.speak(reply)
      // Store in SOMA chain
      addBlock({ type: 'context', content: `User: ${text}`, source: 'user', tags: [session.environmentId] })
      addBlock({ type: 'context', content: `AI: ${reply.slice(0, 200)}`, source: 'agent', tags: [session.environmentId] })
    } catch (e: any) {
      msgs = [...msgs, { id: Date.now(), role: 'assistant', content: `Error: ${e.message}` }]
      updateMessages(msgs)
    } finally { setLoading(false) }
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
        <button className="menu-btn" aria-label="Open sidebar" title="Open sidebar" onClick={onOpenSidebar}>☰</button>
        <div className="header-center">
          <span className="session-env-icon">{env.icon}</span>
          <span className="session-name">{session.name}</span>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={onOpenMCP} aria-label="MCP Servers" title="MCP Servers">
            🔌{mcpServers.filter(s=>s.connected).length > 0 && <span className="mcp-badge">{mcpServers.filter(s=>s.connected).length}</span>}
          </button>
          <span className={`mini-conn ${bridge.connState}`}>⌨️</span>
          <button className="icon-btn" aria-label="Settings" title="Settings" onClick={() => setShowSettings(true)}>⚙️</button>
        </div>
      </header>

      {showSkills && <SkillsPanel onSelect={(s) => { setActiveSkill(s); if(s.inputTemplate) setInput(s.inputTemplate); setShowSkills(false) }} onClose={() => setShowSkills(false)} />}

      {activeSkill && <div className="skill-banner">{activeSkill.icon} {activeSkill.label}<button className="skill-clear" aria-label="Clear active skill" title="Clear active skill" onClick={() => { setActiveSkill(null); setInput('') }}>✕</button></div>}
      {isHermes && <div className="agent-banner">🤖 Hermes Agent Mode — tool calling enabled</div>}

      {showSettings && (
        <div className="modal-overlay" onClick={() => apiKey && setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            <label>Groq API Key</label>
            <input type="password" className="key-input" placeholder="gsk_..." value={apiKey}
              onChange={e => setApiKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveKey()} autoFocus />
            <p className="hint">Get your free key at console.groq.com — stored locally only.</p>
            <div className="setting-row">
              <label>Auto-speak responses</label>
              <button className={`toggle-btn ${tts.autoSpeak ? 'on' : ''}`} onClick={tts.toggleAutoSpeak}>{tts.autoSpeak ? 'ON' : 'OFF'}</button>
            </div>
            <button className="btn-primary" onClick={saveKey} disabled={!apiKey}>Save & Continue</button>
          </div>
        </div>
      )}

      <main className="messages">
        {session.messages.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">{env.icon}</div>
            <p className="empty-env-name">{env.name}</p>
            <p className="empty-hint-sub">{env.systemPrompt.slice(0, 60)}…</p>
            {bridge.connState !== 'connected' && <p className="empty-hint">💡 Connect Terminal to run commands</p>}
          </div>
        )}
        {session.messages.map(msg => msg.role !== 'system' && (
          <div key={msg.id} className={`msg msg-${msg.role}`}>
            <MessageBubble
              content={msg.content}
              role={msg.role as 'user'|'assistant'}
              onRunCommand={msg.role === 'assistant' ? handleRunCommand : undefined}
              connState={bridge.connState}
              onSpeak={msg.role === 'assistant' ? tts.speak : undefined}
              speaking={tts.speaking}
            />
            {msg.toolCall && (
              <div className="tool-call">
                <span className="tool-tag">🔧 {msg.toolCall.name}</span>
                <code>{JSON.stringify(msg.toolCall.args)}</code>
              </div>
            )}
          </div>
        ))}
        {loading && <div className="msg msg-assistant"><div className="bubble typing"><span/><span/><span/></div></div>}
        <div ref={bottomRef} />
      </main>

      <footer className="input-bar">
        <div className="input-wrap">
          {!isHermes && <button className="skill-btn" aria-label="Use skill" title="Use skill" onClick={() => setShowSkills(true)} disabled={!apiKey}>⚡</button>}
          {stt.supported && (
            <button className={`mic-btn ${stt.listening ? 'listening' : ''}`} aria-label={stt.listening ? 'Stop listening' : 'Start listening'} title={stt.listening ? 'Stop listening' : 'Start listening'} onClick={stt.listening ? stt.stop : stt.start}>
              {stt.listening ? '⏹' : '🎤'}
            </button>
          )}
          <textarea ref={textareaRef} className="input" rows={1}
            placeholder={apiKey ? (activeSkill ? activeSkill.placeholder : 'Message DAVGpt...') : 'Add Groq API key in ⚙️'}
            value={input} onChange={autoResize} onKeyDown={onKeyDown} disabled={!apiKey || loading} />
          <button className="send-btn" aria-label="Send message" title="Send message" onClick={send} disabled={!input.trim() || loading || !apiKey}>↑</button>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'chat' | 'terminal' | 'agent' | 'cortex'>('chat')
  const [showSidebar, setShowSidebar] = useState(false)
  const bridge = useTerminalBridge()

  const [environments] = useState<Environment[]>(() => loadEnvironments())
  const [mcpServers, setMcpServers] = useState<MCPServer[]>(() => loadMCPServers())
  const [showMCP, setShowMCP] = useState(false)
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = loadSessions()
    if (saved.length === 0) {
      const first = createSession('default', loadEnvironments())
      return [first]
    }
    return saved
  })
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = loadActiveId()
    const all = loadSessions()
    return (saved && all.find(s => s.id === saved)) ? saved : all[0]?.id || ''
  })

  const activeSession = sessions.find(s => s.id === activeId) || sessions[0]

  const persistSessions = (updated: Session[]) => {
    setSessions(updated)
    saveSessions(updated)
  }

  const handleUpdateSession = (updated: Session) => {
    persistSessions(sessions.map(s => s.id === updated.id ? updated : s))
  }

  const handleNewSession = (envId = 'default') => {
    const s = createSession(envId, environments)
    const updated = [s, ...sessions]
    persistSessions(updated)
    setActiveId(s.id)
    saveActiveId(s.id)
  }

  const handleSelectSession = (id: string) => {
    setActiveId(id)
    saveActiveId(id)
  }

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id)
    if (updated.length === 0) {
      const fresh = createSession('default', environments)
      persistSessions([fresh])
      setActiveId(fresh.id)
      saveActiveId(fresh.id)
    } else {
      persistSessions(updated)
      if (id === activeId) { setActiveId(updated[0].id); saveActiveId(updated[0].id) }
    }
  }

  const handleRenameSession = (id: string, name: string) => {
    persistSessions(sessions.map(s => s.id === id ? { ...s, name } : s))
  }

  return (
    <div className="app">
      {showMCP && (
        <MCPPanel onClose={() => setShowMCP(false)} onServersChange={setMcpServers} />
      )}

      {showSidebar && (
        <Sidebar
          sessions={sessions}
          activeId={activeId}
          environments={environments}
          onSelect={handleSelectSession}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
          onRename={handleRenameSession}
          onNewEnv={() => {}}
          onClose={() => setShowSidebar(false)}
        />
      )}

      <div className="tab-content">
        {tab === 'chat' ? (
          activeSession && (
            <Chat
              key={activeId}
              session={activeSession}
              environments={environments}
              onUpdateSession={handleUpdateSession}
              onOpenSidebar={() => setShowSidebar(true)}
              bridge={bridge}
              switchToTerminal={() => setTab('terminal')}
              mcpServers={mcpServers}
              onOpenMCP={() => setShowMCP(true)}
            />
          )
        ) : tab === 'terminal' ? (
          <Terminal bridge={bridge} />
        ) : tab === 'agent' ? (
          <AgentPanel
            apiKey={localStorage.getItem('davgpt_groq_key') || ''}
            sendCommand={bridge.sendCommand}
            connState={bridge.connState}
            onOutput={bridge.onOutput}
            mcpServers={mcpServers}
            switchToTerminal={() => setTab('terminal')}
          />
        ) : (
          <Cortex
            apiKey={localStorage.getItem('davgpt_groq_key') || ''}
            sendCommand={bridge.sendCommand}
            connState={bridge.connState}
          />
        )}
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
        <button className={`tab-btn ${tab === 'agent' ? 'active' : ''}`} onClick={() => setTab('agent')}>
          <span className="tab-icon">⚡</span>
          <span className="tab-label">KIRA</span>
        </button>
        <button className={`tab-btn ${tab === 'cortex' ? 'active' : ''}`} onClick={() => setTab('cortex')}>
          <span className="tab-icon">◈</span>
          <span className="tab-label">CORTEX</span>
        </button>
        <button className={`tab-btn ${tab === 'cortex' ? 'active' : ''}`} onClick={() => setTab('cortex')}>
          <span className="tab-icon">◈</span>
          <span className="tab-label">CORTEX</span>
        </button>
      </nav>
    </div>
  )
}
