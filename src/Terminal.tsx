import { useRef, useEffect } from 'react'
import { useTerminalBridge } from './useTerminalBridge'
import './Terminal.css'

interface Props { bridge: ReturnType<typeof useTerminalBridge> }

export default function Terminal({ bridge }: Props) {
  const { connState, output, setOutput, connect, disconnect, sendCommand } = bridge
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputValRef = useRef('')

  useEffect(() => {
    if (outputRef.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = inputValRef.current
      if (cmd && connState === 'connected') sendCommand(cmd)
      inputValRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
    } else if (e.key === 'c' && e.ctrlKey) { sendCommand('\x03') }
    else if (e.key === 'l' && e.ctrlKey) { sendCommand('\x0c') }
    else if (e.key === 'd' && e.ctrlKey) { sendCommand('\x04') }
  }

  const stateColor = { disconnected: '#64748b', connecting: '#fbbf24', connected: '#34d399', error: '#f87171' }[connState]
  const stateLabel = { disconnected: '● Disconnected', connecting: '◌ Connecting...', connected: '● Connected', error: '● Error' }[connState]

  return (
    <div className="terminal-page">
      <div className="term-header">
        <span className="term-title">⌨️ Terminal</span>
        <span className="conn-status" style={{ color: stateColor }}>{stateLabel}</span>
        <div className="term-actions">
          {connState !== 'connected'
            ? <button className="term-action-btn connect" onClick={connect}>Connect</button>
            : <button className="term-action-btn disconnect" onClick={disconnect}>Disconnect</button>
          }
          <button className="term-action-btn" onClick={() => setOutput('')}>Clear</button>
        </div>
      </div>

      {connState !== 'connected' && (
        <div className="bridge-hint">
          <p>1. Open Termux and run:</p>
          <code>node ~/davgpt-bridge.js</code>
          <p>2. Come back and tap <strong>Connect</strong></p>
          <p className="hint-sub">First time setup:</p>
          <code style={{fontSize:'0.7rem'}}>curl -sL https://raw.githubusercontent.com/cptleftnut/DAVGpt/main/davgpt-bridge.js -o ~/davgpt-bridge.js</code>
        </div>
      )}

      <div className="term-output" ref={outputRef} onClick={() => inputRef.current?.focus()}>
        <pre>{output}</pre>
      </div>

      <div className="term-input-row">
        <span className="prompt" style={{ color: connState === 'connected' ? '#34d399' : '#475569' }}>$</span>
        <input
          ref={inputRef}
          className="term-input"
          defaultValue=""
          onChange={e => { inputValRef.current = e.target.value }}
          onKeyDown={handleKeyDown}
          placeholder={connState === 'connected' ? 'Type command...' : 'Connect first...'}
          disabled={connState !== 'connected'}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {connState === 'connected' && (
          <div className="ctrl-btns">
            <button className="ctrl-btn" onClick={() => sendCommand('\x03')}>^C</button>
            <button className="ctrl-btn" onClick={() => sendCommand('\x09')}>Tab</button>
            <button className="ctrl-btn" onClick={() => sendCommand('\x0c')}>^L</button>
          </div>
        )}
      </div>
    </div>
  )
}
