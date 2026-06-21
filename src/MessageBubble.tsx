import { useState } from 'react'
import './MessageBubble.css'

interface Props {
  content: string
  role: 'user' | 'assistant'
  onRunCommand?: (cmd: string) => boolean
  connState?: string
  onSpeak?: (text: string) => void
  speaking?: boolean
}

// Parse message into text and code blocks
function parseBlocks(content: string) {
  const blocks: { type: 'text' | 'code'; content: string; lang?: string }[] = []
  const regex = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0, m
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) blocks.push({ type: 'text', content: content.slice(last, m.index) })
    blocks.push({ type: 'code', lang: m[1] || 'bash', content: m[2].trim() })
    last = m.index + m[0].length
  }
  if (last < content.length) blocks.push({ type: 'text', content: content.slice(last) })
  return blocks
}

const RUNNABLE = ['bash', 'sh', 'shell', 'zsh', '', 'python', 'py', 'js', 'javascript', 'node']

function CodeBlock({ lang, code, onRun, connState }: {
  lang: string; code: string
  onRun?: (cmd: string) => boolean
  connState?: string
}) {
  const [ran, setRan] = useState(false)
  const [copied, setCopied] = useState(false)
  const canRun = RUNNABLE.includes(lang.toLowerCase()) && onRun

  const handleRun = () => {
    if (!onRun) return
    const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    const success = lines.every(line => onRun(line))
    if (success) setRan(true)
    else alert('Connect to Termux bridge first (Terminal tab → Connect)')
  }

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{lang || 'bash'}</span>
        <div className="code-actions">
          <button className="code-btn" onClick={copy}>{copied ? '✓' : 'Copy'}</button>
          {canRun && (
            <button
              className={`code-btn run-btn ${ran ? 'ran' : ''} ${connState !== 'connected' ? 'offline' : ''}`}
              onClick={handleRun}
            >
              {ran ? '✓ Sent' : connState === 'connected' ? '▶ Run' : '▶ Run (connect first)'}
            </button>
          )}
        </div>
      </div>
      <pre className="code-body"><code>{code}</code></pre>
    </div>
  )
}

export default function MessageBubble({ content, role, onRunCommand, connState, onSpeak, speaking }: Props) {
  if (role === 'user') {
    return <div className="bubble user-bubble">{content}</div>
  }

  const blocks = parseBlocks(content)

  return (
    <div className="bubble ai-bubble">
      <div className="bubble-actions">
        {onSpeak && (
          <button className="speak-btn" onClick={() => speaking ? window.speechSynthesis?.cancel() : onSpeak(content)} aria-label={speaking ? "Stop reading aloud" : "Read aloud"} title={speaking ? "Stop" : "Read aloud"}>
            {speaking ? '⏹' : '🔊'}
          </button>
        )}
      </div>
      {blocks.map((block, i) =>
        block.type === 'text' ? (
          <span key={i} className="text-block">{block.content}</span>
        ) : (
          <CodeBlock
            key={i}
            lang={block.lang || ''}
            code={block.content}
            onRun={onRunCommand}
            connState={connState}
          />
        )
      )}
    </div>
  )
}
