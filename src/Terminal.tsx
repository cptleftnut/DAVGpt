import { useState, useRef, useEffect, useCallback } from 'react'
import './Terminal.css'

const WS_URL = 'ws://localhost:7681'
const PING_URL = 'http://localhost:7681/ping'

type ConnState = 'disconnected' | 'connecting' | 'connected' | 'error'

export default function Terminal() {
  const [output, setOutput] = useState<string>('')
  const [input, setInput] = useState('')
  const [connState, setConnState] = useState<ConnState>('disconnected')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const wsRef = useRef<WebSocket | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const append = (text: string) => {
    setOutput(prev => prev + text)
    setTimeout(() => {
      if (outputRef.current)
        outputRef.current.scrollTop = outputRef.current.scrollHeight
    }, 20)
  }

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setConnState('connecting')
    append('\r\n🔌 Connecting to Termux bridge...\r\n')

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnState('connected')
        append('✅ Connected!\r\n')
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'ready') append(msg.msg)
          else if (msg.type === 'output') append(msg.data)
          else if (msg.type === 'exit') {
            append(`\r\n[Process exited: ${msg.code}]\r\n`)
            setConnState('disconnected')
          }
        } catch {
          append(e.data)
        }
      }

      ws.onclose = () => {
        setConnState('disconnected')
        append('\r\n🔴 Disconnected\r\n')
      }

      ws.onerror = () => {
        setConnState('error')
        append('\r\n❌ Cannot connect. Is the bridge running in Termux?\r\n')
        append('   Run: node ~/davgpt-bridge.js\r\n\r\n')
      }
    } catch (e) {
      setConnState('error')
      append('\r\n❌ WebSocket error\r\n')
    }
  }, [])

  const disconnect = () => {
    wsRef.current?.close()
    wsRef.current = null
    setConnState('disconnected')
  }

  const send = (data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data }))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = input
      if (cmd && connState === 'connected') {
        send(cmd + '\n')
        setHistory(prev => [cmd, ...prev.slice(0, 49)])
        setHistIdx(-1)
      } else if (cmd.startsWith('node ~/') || cmd === 'node davgpt-bridge.js') {
        append('\r\n⚠️  Run commands in Termux, not here. Connect first.\r\n')
      }
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setInput(history[next] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setInput(next === -1 ? '' : history[next])
    } else if (e.key === 'c' && e.ctrlKey) {
      send('\x03') // SIGINT
    } else if (e.key === 'l' && e.ctrlKey) {
      send('\x0c') // clear
    } else if (e.key === 'd' && e.ctrlKey) {
      send('\x04') // EOF
    }
  }

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output])

  const stateColor = {
    disconnected: '#64748b',
    connecting: '#fbbf24',
    connected: '#34d399',
    error: '#f87171',
  }[connState]

  const stateLabel = {
    disconnected: '● Disconnected',
    connecting: '◌ Connecting...',
    connected: '● Connected',
    error: '● Error',
  }[connState]

  return (
    <div className="terminal-page">
      {/* Top bar */}
      <div className="term-header">
        <span className="term-title">⌨️ Terminal</span>
        <span className="conn-status" style={{ color: stateColor }}>{stateLabel}</span>
        <div className="term-actions">
          {connState !== 'connected' ? (
            <button className="term-action-btn connect" onClick={connect}>Connect</button>
          ) : (
            <button className="term-action-btn disconnect" onClick={disconnect}>Disconnect</button>
          )}
          <button className="term-action-btn" onClick={() => setOutput('')}>Clear</button>
        </div>
      </div>

      {/* Setup hint when disconnected */}
      {connState !== 'connected' && (
        <div className="bridge-hint">
          <p>1. Open Termux and run:</p>
          <code>node ~/davgpt-bridge.js</code>
          <p>2. Come back and tap <strong>Connect</strong></p>
          <p className="hint-sub">First time? Copy the bridge file:</p>
          <code style={{fontSize:'0.7rem'}}>curl -sL https://raw.githubusercontent.com/cptleftnut/DAVGpt/main/davgpt-bridge.js -o ~/davgpt-bridge.js</code>
        </div>
      )}

      {/* Terminal output */}
      <div
        className="term-output"
        ref={outputRef}
        onClick={() => inputRef.current?.focus()}
      >
        <pre>{output}</pre>
      </div>

      {/* Input */}
      <div className="term-input-row">
        <span className="prompt" style={{ color: connState === 'connected' ? '#34d399' : '#475569' }}>$</span>
        <input
          ref={inputRef}
          className="term-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connState === 'connected' ? 'Type command...' : 'Connect first...'}
          disabled={connState !== 'connected'}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {connState === 'connected' && (
          <div className="ctrl-btns">
            <button className="ctrl-btn" onClick={() => send('\x03')}>^C</button>
            <button className="ctrl-btn" onClick={() => send('\x09')}>Tab</button>
            <button className="ctrl-btn" onClick={() => send('\x0c')}>^L</button>
          </div>
        )}
      </div>
    </div>
  )
}
