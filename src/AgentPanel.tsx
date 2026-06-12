import { useState, useRef, useEffect, useCallback } from 'react'
import type { AgentTask, AgentStep, AgentStatus } from './agent'
import { parseAgentResponse, buildAgentMessages, AGENT_SYSTEM, AgentMessage } from './agent'
import type { MCPServer } from './mcp'
import './AgentPanel.css'

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'
const AGENT_MODEL = 'llama-3.3-70b-versatile'
const MAX_STEPS = 30

interface Props {
  apiKey: string
  sendCommand: (cmd: string) => boolean
  connState: string
  onOutput: (fn: (data: string) => void) => () => void
  mcpServers: MCPServer[]
  switchToTerminal: () => void
}

export default function AgentPanel({ apiKey, sendCommand, connState, onOutput, mcpServers, switchToTerminal }: Props) {
  const [task, setTask] = useState<AgentTask | null>(null)
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [goalInput, setGoalInput] = useState('')
  const [history, setHistory] = useState<AgentTask[]>([])
  const [autoMode, setAutoMode] = useState(true)
  const stepsRef = useRef<AgentStep[]>([])
  const logsRef = useRef<HTMLDivElement>(null)
  const outputBufRef = useRef('')
  const waitingForOutputRef = useRef(false)
  const abortRef = useRef(false)
  const stepIdRef = useRef(0)
  const resolveOutputRef = useRef<((v: string) => void) | null>(null)

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [task?.steps.length])

  // Listen for terminal output
  useEffect(() => {
    const unsub = onOutput((data) => {
      if (waitingForOutputRef.current) {
        outputBufRef.current += data
        // Detect prompt ($) = command finished
        if (data.includes('$ ') || data.endsWith('$ ')) {
          waitingForOutputRef.current = false
          const out = outputBufRef.current
          outputBufRef.current = ''
          resolveOutputRef.current?.(out)
          resolveOutputRef.current = null
        }
      }
    })
    return unsub
  }, [onOutput])

  const addStep = (step: Omit<AgentStep, 'id' | 'timestamp'>) => {
    const s: AgentStep = { ...step, id: ++stepIdRef.current, timestamp: Date.now() }
    stepsRef.current = [...stepsRef.current, s]
    setTask(prev => prev ? { ...prev, steps: stepsRef.current } : prev)
    return s
  }

  const waitForOutput = (timeoutMs = 15000): Promise<string> => {
    return new Promise((resolve) => {
      waitingForOutputRef.current = true
      outputBufRef.current = ''
      resolveOutputRef.current = resolve
      setTimeout(() => {
        if (waitingForOutputRef.current) {
          waitingForOutputRef.current = false
          const out = outputBufRef.current || '[timeout - no output]'
          outputBufRef.current = ''
          resolveOutputRef.current = null
          resolve(out)
        }
      }, timeoutMs)
    })
  }

  const runCommand = async (cmd: string): Promise<string> => {
    if (connState !== 'connected') return '[Terminal not connected]'
    switchToTerminal()
    setTimeout(() => switchToTerminalBack(), 500)
    const ok = sendCommand(cmd)
    if (!ok) return '[Failed to send command]'
    const output = await waitForOutput()
    return output.trim()
  }

  const switchToTerminalBack = () => {} // handled by parent tab

  const writeFile = async (path: string, content: string): Promise<string> => {
    // Use heredoc to write file via terminal
    const escaped = content.replace(/\\/g, '\\\\').replace(/'/g, "'\\''")
    const cmd = `mkdir -p "$(dirname '${path}')" && cat > '${path}' << 'AGENTEOF'\n${content}\nAGENTEOF`
    return runCommand(cmd)
  }

  const callLLM = async (messages: AgentMessage[]): Promise<string> => {
    const res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: AGENT_MODEL, messages, max_tokens: 2048, temperature: 0.2 }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? data.error?.message ?? ''
  }

  const runAgentLoop = async (goal: string) => {
    abortRef.current = false
    stepsRef.current = []
    stepIdRef.current = 0

    const newTask: AgentTask = {
      id: crypto.randomUUID(),
      goal,
      steps: [],
      status: 'thinking',
      createdAt: Date.now(),
      model: AGENT_MODEL,
    }
    setTask(newTask)
    setStatus('thinking')

    let iterations = 0

    try {
      while (iterations < MAX_STEPS && !abortRef.current) {
        iterations++
        setStatus('thinking')

        const messages = buildAgentMessages({ ...newTask, steps: stepsRef.current })
        const response = await callLLM(messages)

        if (!response || abortRef.current) break

        const action = parseAgentResponse(response)

        // Log thoughts
        for (const thought of action.thoughts) {
          addStep({ type: 'thought', content: thought })
        }

        // Log plan
        if (action.plan) {
          addStep({ type: 'plan', content: action.plan })
        }

        // Write file
        if (action.writeFile) {
          addStep({ type: 'file', content: `📄 Writing ${action.writeFile.path}` })
          setStatus('executing')
          const out = await writeFile(action.writeFile.path, action.writeFile.content)
          addStep({ type: 'output', content: out })
        }

        // Run command
        if (action.command) {
          addStep({ type: 'command', content: action.command })
          setStatus('executing')

          if (connState !== 'connected') {
            addStep({ type: 'error', content: '⚠️ Terminal not connected. Connect in Terminal tab first.' })
            setStatus('error')
            break
          }

          const output = await runCommand(action.command)
          addStep({ type: 'output', content: output })

          // Check for errors and continue loop
          if (output.includes('command not found') || output.includes('Error') || output.includes('error')) {
            addStep({ type: 'thought', content: 'Got an error. Analyzing and retrying...' })
          }
        }

        // Task complete
        if (action.result) {
          addStep({ type: 'result', content: action.result })
          setStatus('done')
          break
        }

        // Neither command nor result — agent is stuck
        if (!action.command && !action.writeFile && !action.result) {
          addStep({ type: 'result', content: response })
          setStatus('done')
          break
        }
      }

      if (iterations >= MAX_STEPS) {
        addStep({ type: 'error', content: `⚠️ Reached max steps (${MAX_STEPS}). Task may be incomplete.` })
        setStatus('error')
      }
    } catch (e: any) {
      addStep({ type: 'error', content: `Fatal error: ${e.message}` })
      setStatus('error')
    }

    const finalTask = { ...newTask, steps: stepsRef.current, status: status }
    setHistory(prev => [finalTask, ...prev.slice(0, 9)])
  }

  const start = () => {
    if (!goalInput.trim() || !apiKey) return
    if (connState !== 'connected') {
      alert('Connect to Termux bridge first (Terminal tab → Connect)')
      return
    }
    runAgentLoop(goalInput.trim())
    setGoalInput('')
  }

  const abort = () => { abortRef.current = true; setStatus('idle') }

  const stepIcon = (type: AgentStep['type']) => ({
    thought: '💭', plan: '📋', command: '▶', output: '📤',
    file: '📄', error: '❌', result: '✅', code: '💻'
  }[type] || '•')

  const stepColor = (type: AgentStep['type']) => ({
    thought: '#94a3b8', plan: '#a78bfa', command: '#34d399',
    output: '#64748b', file: '#60a5fa', error: '#f87171', result: '#4ade80', code: '#fbbf24'
  }[type] || '#94a3b8')

  return (
    <div className="agent-panel">
      <div className="agent-header">
        <div className="agent-title-row">
          <span className="agent-logo">⚡ KIRA</span>
          <span className="agent-subtitle">Autonomous Coding Agent</span>
        </div>
        <div className="agent-status-row">
          <span className={`agent-status-badge ${status}`}>{status}</span>
          <span className={`agent-conn ${connState === 'connected' ? 'ok' : 'off'}`}>
            {connState === 'connected' ? '🟢 Terminal' : '🔴 No Terminal'}
          </span>
        </div>
      </div>

      {/* Task log */}
      <div className="agent-log" ref={logsRef}>
        {!task && (
          <div className="agent-empty">
            <div className="agent-empty-icon">⚡</div>
            <p>KIRA is ready</p>
            <p className="agent-empty-sub">Describe a coding task and I'll handle it autonomously — writing code, running commands, fixing errors.</p>
            <div className="agent-examples">
              {[
                'Create a Python web scraper for hacker news',
                'Set up a Node.js Express API with SQLite',
                'Write and test a bash script to backup my files',
                'Install and configure neovim with plugins',
              ].map(ex => (
                <button key={ex} className="agent-example" onClick={() => setGoalInput(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {task && (
          <div className="agent-task">
            <div className="agent-goal">🎯 {task.goal}</div>
            {task.steps.map(step => (
              <div key={step.id} className={`agent-step step-${step.type}`}>
                <span className="step-icon" style={{ color: stepColor(step.type) }}>{stepIcon(step.type)}</span>
                <div className="step-content">
                  {step.type === 'command' ? (
                    <code className="step-command">{step.content}</code>
                  ) : step.type === 'output' || step.type === 'error' ? (
                    <pre className="step-output">{step.content.slice(0, 600)}{step.content.length > 600 ? '…' : ''}</pre>
                  ) : (
                    <p className="step-text">{step.content}</p>
                  )}
                </div>
              </div>
            ))}
            {status === 'thinking' && (
              <div className="agent-thinking">
                <span className="think-dot" /><span className="think-dot" /><span className="think-dot" />
                <span>KIRA is thinking...</span>
              </div>
            )}
            {status === 'executing' && (
              <div className="agent-thinking executing">
                <span className="think-dot" /><span className="think-dot" /><span className="think-dot" />
                <span>Executing command...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="agent-input-area">
        {(status === 'thinking' || status === 'executing') ? (
          <button className="agent-abort" onClick={abort}>⏹ Stop KIRA</button>
        ) : (
          <div className="agent-input-row">
            <textarea
              className="agent-input"
              placeholder={connState === 'connected' ? 'Describe a task for KIRA...' : 'Connect Terminal first...'}
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start() } }}
              rows={2}
              disabled={connState !== 'connected'}
            />
            <button className="agent-start" onClick={start} disabled={!goalInput.trim() || !apiKey || connState !== 'connected'}>
              ⚡
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
