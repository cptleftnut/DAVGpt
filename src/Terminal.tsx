import { useState } from 'react'
import Termux from './termux'
import './Terminal.css'

const SETUP_COMMANDS = [
  { label: 'Full Setup', cmd: 'curl -sL https://raw.githubusercontent.com/cptleftnut/DAVGpt/main/setup.sh | bash', desc: 'Install zsh, Node, Java & aliases' },
  { label: 'Update Packages', cmd: 'pkg update -y && pkg upgrade -y', desc: 'Update all Termux packages' },
  { label: 'Install Node', cmd: 'pkg install -y nodejs', desc: 'Install Node.js' },
  { label: 'Install Java 21', cmd: 'pkg install -y openjdk-21', desc: 'Install OpenJDK 21' },
  { label: 'Install zsh', cmd: 'pkg install -y zsh && chsh -s zsh', desc: 'Install & set zsh as default' },
  { label: 'Install Git', cmd: 'pkg install -y git', desc: 'Install Git' },
  { label: 'Install yarn', cmd: 'npm install -g yarn', desc: 'Install Yarn globally' },
]

const QUICK_COMMANDS = [
  { label: '📁 Home', cmd: 'cd ~ && ls' },
  { label: '📦 Storage', cmd: 'termux-setup-storage' },
  { label: '🔄 Update', cmd: 'pkg update -y' },
  { label: '🌐 IP', cmd: 'curl ifconfig.me' },
  { label: '💾 Disk', cmd: 'df -h' },
  { label: '🖥 Info', cmd: 'uname -a' },
]

type LogEntry = { type: 'info' | 'success' | 'error' | 'cmd'; text: string }

export default function Terminal() {
  const [log, setLog] = useState<LogEntry[]>([
    { type: 'info', text: 'DAVGpt Terminal — Termux Bridge' },
    { type: 'info', text: 'Tap a command below or type your own.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const addLog = (entry: LogEntry) => setLog(prev => [...prev, entry])

  const runInTermux = async (cmd: string) => {
    if (loading) return
    setLoading(true)
    addLog({ type: 'cmd', text: `$ ${cmd}` })
    try {
      await Termux.runCommand({ command: cmd })
      addLog({ type: 'success', text: '✓ Sent to Termux' })
    } catch (e: any) {
      addLog({ type: 'error', text: `✗ ${e.message ?? 'Failed — is Termux installed?'}` })
    } finally {
      setLoading(false)
    }
  }

  const openTermux = async () => {
    try {
      await Termux.openTermux()
      addLog({ type: 'success', text: '✓ Opened Termux' })
    } catch (e: any) {
      addLog({ type: 'error', text: `✗ ${e.message}` })
    }
  }

  const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      runInTermux(input.trim())
      setInput('')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addLog({ type: 'info', text: '📋 Copied to clipboard' })
  }

  return (
    <div className="terminal-page">
      {/* Header */}
      <div className="term-header">
        <span className="term-title">⌨️ Terminal</span>
        <button className="open-termux-btn" onClick={openTermux}>
          Open Termux ↗
        </button>
      </div>

      {/* Log output */}
      <div className="term-log">
        {log.map((entry, i) => (
          <div key={i} className={`log-line log-${entry.type}`}>
            {entry.text}
          </div>
        ))}
        {loading && <div className="log-line log-info blink">Running...</div>}
      </div>

      {/* Custom command input */}
      <div className="term-input-row">
        <span className="prompt">$</span>
        <input
          className="term-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInput}
          placeholder="Type a command and press Enter..."
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      {/* Quick commands */}
      <div className="term-section-label">Quick Commands</div>
      <div className="quick-grid">
        {QUICK_COMMANDS.map(q => (
          <button key={q.label} className="quick-btn" onClick={() => runInTermux(q.cmd)}>
            {q.label}
          </button>
        ))}
      </div>

      {/* Setup commands */}
      <div className="term-section-label">Setup Scripts</div>
      <div className="setup-list">
        {SETUP_COMMANDS.map(s => (
          <div key={s.label} className="setup-item">
            <div className="setup-info">
              <span className="setup-label">{s.label}</span>
              <span className="setup-desc">{s.desc}</span>
            </div>
            <div className="setup-actions">
              <button className="setup-copy" onClick={() => copyToClipboard(s.cmd)}>Copy</button>
              <button className="setup-run" onClick={() => runInTermux(s.cmd)}>Run</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
