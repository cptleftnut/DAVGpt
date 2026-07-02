import { useState, useEffect } from 'react'
import type { MCPServer } from './mcp'
import { loadMCPServers, saveMCPServers, fetchMCPTools } from './mcp'
import './MCPPanel.css'

interface Props {
  onClose: () => void
  onServersChange: (servers: MCPServer[]) => void
}

export default function MCPPanel({ onClose, onServersChange }: Props) {
  const [servers, setServers] = useState<MCPServer[]>(() => loadMCPServers())
  const [editing, setEditing] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, string>>({})

  const update = (updated: MCPServer[]) => {
    setServers(updated)
    saveMCPServers(updated)
    onServersChange(updated)
  }

  const connect = async (id: string) => {
    setTesting(id)
    const server = servers.find(s => s.id === id)!
    const withCreds: MCPServer = {
      ...server,
      token: tokenInput || server.token,
      url: (id === 'custom' ? urlInput : server.url),
      connected: false,
    }
    const tools = await fetchMCPTools(withCreds)
    const connected = tools.length > 0
    setTestResult(prev => ({
      ...prev,
      [id]: connected
        ? `✅ Connected — ${tools.length} tools available`
        : '⚠️ Connected but no tools listed (may still work)',
    }))
    const updated = servers.map(s => s.id === id
      ? { ...withCreds, connected: true, tools }
      : s
    )
    update(updated)
    setEditing(null)
    setTesting(null)
    setTokenInput('')
  }

  const disconnect = (id: string) => {
    update(servers.map(s => s.id === id ? { ...s, connected: false, token: undefined, tools: [] } : s))
    setTestResult(prev => { const n = {...prev}; delete n[id]; return n })
  }

  const connectedServers = servers.filter(s => s.connected)
  const availableServers = servers.filter(s => !s.connected)

  return (
    <div className="mcp-overlay" onClick={onClose}>
      <div className="mcp-panel" onClick={e => e.stopPropagation()}>
        <div className="mcp-header">
          <span>🔌 MCP Servers</span>
          <button className="mcp-close" onClick={onClose} aria-label="Close MCP servers panel" title="Close MCP servers panel">✕</button>
        </div>

        {connectedServers.length > 0 && (
          <>
            <div className="mcp-section-label">Connected</div>
            {connectedServers.map(s => (
              <div key={s.id} className="mcp-item connected">
                <span className="mcp-icon">{s.icon}</span>
                <div className="mcp-info">
                  <span className="mcp-name">{s.name}</span>
                  <span className="mcp-desc">
                    {s.tools?.length ? `${s.tools.length} tools` : 'Connected'}
                  </span>
                </div>
                <button className="mcp-disconnect-btn" onClick={() => disconnect(s.id)}>Disconnect</button>
              </div>
            ))}
          </>
        )}

        <div className="mcp-section-label">Available</div>
        {availableServers.map(s => (
          <div key={s.id} className="mcp-item">
            <span className="mcp-icon">{s.icon}</span>
            <div className="mcp-info">
              <span className="mcp-name">{s.name}</span>
              <span className="mcp-desc">{s.description}</span>
            </div>
            <button className="mcp-connect-btn" onClick={() => {
              setEditing(s.id)
              setTokenInput(s.token || '')
              setUrlInput(s.url || '')
            }}>Connect</button>

            {editing === s.id && (
              <div className="mcp-auth-form" onClick={e => e.stopPropagation()}>
                {s.id === 'custom' && (
                  <>
                    <label>Server URL</label>
                    <input
                      className="mcp-input"
                      placeholder="https://your-mcp-server.com/mcp"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                    />
                  </>
                )}
                {s.authType === 'token' && (
                  <>
                    <label>{s.authLabel}</label>
                    <input
                      className="mcp-input"
                      type="password"
                      placeholder={s.authPlaceholder}
                      value={tokenInput}
                      onChange={e => setTokenInput(e.target.value)}
                      autoFocus
                    />
                  </>
                )}
                {testResult[s.id] && <p className="mcp-result">{testResult[s.id]}</p>}
                <div className="mcp-form-actions">
                  <button className="mcp-cancel" onClick={() => setEditing(null)}>Cancel</button>
                  <button
                    className="mcp-save"
                    onClick={() => connect(s.id)}
                    disabled={testing === s.id}
                  >
                    {testing === s.id ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="mcp-footer">
          <p>MCP tools are available to the AI in chat. Ask it to use GitHub, Drive, etc.</p>
        </div>
      </div>
    </div>
  )
}
