import { useState, useEffect, useCallback } from 'react'
import type { SomaBlock } from './soma'
import { loadChain, addBlock, verifyChain, searchChain } from './soma'
import type { IrisProfile } from './iris'
import { IRIS_ROUTES, loadIrisProfile, saveIrisProfile } from './iris'
import type { GroundTask, DaemonMonologue } from './ground'
import {
  loadGroundTasks, saveGroundTasks, addGroundTask,
  loadDaemonLog, addDaemonMonologue, isDaemonDue, getLastDaemonRun,
  DAEMON_PROMPT, getDueGroundTasks, markGroundTaskDone,
} from './ground'
import { getChainContext } from './soma'
import './Cortex.css'

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'

type CortexTab = 'dashboard' | 'soma' | 'iris' | 'ground' | 'daemon' | 'self'

interface Props {
  apiKey: string
  sendCommand?: (cmd: string) => boolean
  connState?: string
}

export default function Cortex({ apiKey, sendCommand, connState }: Props) {
  const [tab, setTab] = useState<CortexTab>('dashboard')
  const [chain, setChain] = useState<SomaBlock[]>(() => loadChain())
  const [chainValid, setChainValid] = useState<boolean | null>(null)
  const [irisProfile, setIrisProfileState] = useState<IrisProfile>(() => loadIrisProfile())
  const [groundTasks, setGroundTasks] = useState<GroundTask[]>(() => loadGroundTasks())
  const [daemonLog, setDaemonLog] = useState<DaemonMonologue[]>(() => loadDaemonLog())
  const [daemonRunning, setDaemonRunning] = useState(false)
  const [somaQuery, setSomaQuery] = useState('')
  const [somaResults, setSomaResults] = useState<SomaBlock[]>([])
  const [newMemory, setNewMemory] = useState('')
  const [newTask, setNewTask] = useState({ name: '', command: '', schedule: 'every60s' as GroundTask['schedule'] })
  const [selfProposal, setSelfProposal] = useState('')
  const [selfGenerating, setSelfGenerating] = useState(false)
  const [lastDaemon, setLastDaemon] = useState(() => getLastDaemonRun())

  const refresh = () => {
    setChain(loadChain())
    setGroundTasks(loadGroundTasks())
    setDaemonLog(loadDaemonLog())
    setLastDaemon(getLastDaemonRun())
  }

  useEffect(() => { refresh() }, [tab])

  // GROUND tick — check every 30s
  useEffect(() => {
    const tick = async () => {
      const due = getDueGroundTasks()
      for (const task of due) {
        if (sendCommand && connState === 'connected') {
          sendCommand(task.command)
          markGroundTaskDone(task.id, '[sent to terminal]')
          await addBlock({ type: 'context', content: `GROUND ran: ${task.name}`, source: 'system' })
          refresh()
        }
      }

      // DAEMON tick
      if (isDaemonDue() && apiKey) {
        runDaemonTick('scheduled')
      }
    }
    const interval = setInterval(tick, 30_000)
    return () => clearInterval(interval)
  }, [apiKey, sendCommand, connState])

  const runDaemonTick = async (trigger: DaemonMonologue['trigger'] = 'manual') => {
    if (!apiKey || daemonRunning) return
    setDaemonRunning(true)
    try {
      const ctx = getChainContext(6)
      const res = await fetch(GROQ_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 256,
          temperature: 0.8,
          messages: [
            { role: 'system', content: DAEMON_PROMPT(ctx) },
            { role: 'user', content: 'Generate your inner monologue now.' },
          ],
        }),
      })
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || 'No monologue generated.'
      addDaemonMonologue(content, trigger)
      await addBlock({ type: 'monologue', content, source: 'daemon', tags: ['daemon'] })
      refresh()
    } catch (e: any) {
      addDaemonMonologue(`[Error: ${e.message}]`, trigger)
    } finally {
      setDaemonRunning(false)
    }
  }

  const verifyNow = async () => {
    const result = await verifyChain()
    setChainValid(result.valid)
  }

  const addMemoryBlock = async () => {
    if (!newMemory.trim()) return
    await addBlock({ type: 'fact', content: newMemory.trim(), source: 'user', tags: ['manual'] })
    setNewMemory('')
    setChain(loadChain())
  }

  const doSearch = () => setSomaResults(searchChain(somaQuery))

  const setIris = (p: IrisProfile) => { setIrisProfileState(p); saveIrisProfile(p) }

  const createGroundTask = () => {
    if (!newTask.name || !newTask.command) return
    addGroundTask({ ...newTask, enabled: true })
    setGroundTasks(loadGroundTasks())
    setNewTask({ name: '', command: '', schedule: 'every60s' })
  }

  const toggleTask = (blockId: string) => {
    const updated = groundTasks.map(t => t.id === blockId ? { ...t, enabled: !t.enabled } : t)
    saveGroundTasks(updated)
    setGroundTasks(updated)
  }

  const deleteTask = (blockId: string) => {
    const updated = groundTasks.filter(t => t.id !== blockId)
    saveGroundTasks(updated)
    setGroundTasks(updated)
  }

  const generateSelfProposal = async () => {
    if (!apiKey || selfGenerating) return
    setSelfGenerating(true)
    try {
      const res = await fetch(GROQ_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `You are DAVSI self-modification system. Propose an improvement to the DAVGpt app as a unified diff or code change. Be specific and implementable. Focus on one concrete improvement.`,
          }],
        }),
      })
      const data = await res.json()
      setSelfProposal(data.choices?.[0]?.message?.content || '')
    } finally { setSelfGenerating(false) }
  }

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    return `${Math.floor(s/3600)}h ago`
  }

  const nextDaemonIn = () => {
    const ms = 8 * 60 * 1000 - (Date.now() - lastDaemon)
    if (ms <= 0) return 'due now'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${m}m ${s}s`
  }

  return (
    <div className="cortex">
      {/* Top nav */}
      <div className="cortex-nav">
        {(['dashboard','soma','iris','ground','daemon','self'] as CortexTab[]).map(t => (
          <button key={t} className={`cortex-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{'dashboard':'◈','soma':'⛓','iris':'👁','ground':'⏱','daemon':'🌀','self':'⚙'}[t]}
            <span>{t.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="cortex-body">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="cortex-dashboard">
            <div className="cortex-title">DAVSI CORTEX <span className="online-dot">●</span> ONLINE</div>
            <div className="pillar-grid">
              {[
                { name: 'SOMA', icon: '⛓', val: `${chain.length} blocks`, sub: 'SHA-256 memory chain', color: '#34d399' },
                { name: 'IRIS', icon: '👁', val: irisProfile, sub: IRIS_ROUTES[irisProfile].description, color: IRIS_ROUTES[irisProfile].color },
                { name: 'GROUND', icon: '⏱', val: `${groundTasks.filter(t=>t.enabled).length} active`, sub: '60s scheduler', color: '#fbbf24' },
                { name: 'DAEMON', icon: '🌀', val: nextDaemonIn(), sub: `${daemonLog.length} monologues`, color: '#a78bfa' },
              ].map(p => (
                <div key={p.name} className="pillar-card" style={{'--accent': p.color} as any}>
                  <div className="pillar-icon">{p.icon}</div>
                  <div className="pillar-name">{p.name}</div>
                  <div className="pillar-val" style={{color: p.color}}>{p.val}</div>
                  <div className="pillar-sub">{p.sub}</div>
                </div>
              ))}
            </div>
            <div className="bridge-status">
              <span className="bridge-label">TERMUX BRIDGE</span>
              <span className={`bridge-badge ${connState === 'connected' ? 'online' : 'offline'}`}>
                {connState === 'connected' ? '● ONLINE' : '● OFFLINE'}
              </span>
            </div>
            <div className="quick-actions">
              <button className="qa-btn" onClick={() => runDaemonTick('manual')} disabled={daemonRunning}>
                {daemonRunning ? '🌀 thinking...' : '🌀 Trigger Daemon'}
              </button>
              <button className="qa-btn" onClick={verifyNow}>
                ⛓ Verify Chain {chainValid === true ? '✅' : chainValid === false ? '❌' : ''}
              </button>
            </div>
          </div>
        )}

        {/* ── SOMA ── */}
        {tab === 'soma' && (
          <div className="tab-content-inner">
            <div className="section-title">⛓ SOMA — Memory Chain ({chain.length} blocks)</div>
            <div className="soma-search">
              <input className="cx-input" placeholder="Search memory..." value={somaQuery}
                onChange={e => setSomaQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && doSearch()} />
              <button className="cx-btn" onClick={doSearch}>Search</button>
              <button className="cx-btn verify" onClick={verifyNow}>Verify {chainValid===true?'✅':chainValid===false?'❌':''}</button>
            </div>
            <div className="soma-add">
              <input className="cx-input" placeholder="Add memory block..." value={newMemory}
                onChange={e => setNewMemory(e.target.value)} onKeyDown={e => e.key==='Enter' && addMemoryBlock()} />
              <button className="cx-btn green" onClick={addMemoryBlock}>+ Add</button>
            </div>
            <div className="chain-list">
              {(somaResults.length > 0 ? somaResults : chain.slice(-20).reverse()).map(b => (
                <div key={b.hash} className={`chain-block type-${b.type}`}>
                  <div className="block-header">
                    <span className="block-type">{b.type}</span>
                    <span className="block-src">{b.source}</span>
                    <span className="block-time">{timeAgo(b.timestamp)}</span>
                  </div>
                  <p className="block-content">{b.content}</p>
                  <div className="block-hash">#{b.hash.slice(0,16)}…</div>
                </div>
              ))}
              {chain.length === 0 && <p className="cx-empty">No memory blocks yet. Start chatting!</p>}
            </div>
          </div>
        )}

        {/* ── IRIS ── */}
        {tab === 'iris' && (
          <div className="tab-content-inner">
            <div className="section-title">👁 IRIS — LLM Router</div>
            <div className="iris-grid">
              {(Object.values(IRIS_ROUTES)).map(route => (
                <div
                  key={route.profile}
                  className={`iris-card ${irisProfile === route.profile ? 'active' : ''}`}
                  style={{'--rc': route.color} as any}
                  onClick={() => setIris(route.profile)}
                >
                  <div className="iris-icon">{route.icon}</div>
                  <div className="iris-profile">{route.profile}</div>
                  <div className="iris-desc">{route.description}</div>
                  <div className="iris-model">{route.model.split('-').slice(0,3).join('-')}</div>
                  <div className="iris-params">
                    <span>temp: {route.temperature}</span>
                    <span>{route.maxTokens} tok</span>
                  </div>
                  {irisProfile === route.profile && <div className="iris-active-badge">ACTIVE</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GROUND ── */}
        {tab === 'ground' && (
          <div className="tab-content-inner">
            <div className="section-title">⏱ GROUND — Task Scheduler</div>
            <div className="ground-form">
              <input className="cx-input" placeholder="Task name" value={newTask.name}
                onChange={e => setNewTask(p => ({...p, name: e.target.value}))} />
              <input className="cx-input" placeholder="bash command" value={newTask.command}
                onChange={e => setNewTask(p => ({...p, command: e.target.value}))} />
              <select className="cx-select" value={newTask.schedule}
                onChange={e => setNewTask(p => ({...p, schedule: e.target.value as any}))}>
                <option value="once">Once</option>
                <option value="every60s">Every 60s</option>
                <option value="every5m">Every 5 min</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
              <button className="cx-btn green" onClick={createGroundTask}>+ Add Task</button>
            </div>
            <div className="task-list">
              {groundTasks.length === 0 && <p className="cx-empty">No scheduled tasks.</p>}
              {groundTasks.map(t => (
                <div key={t.id} className={`task-card ${t.enabled ? 'enabled' : 'disabled'}`}>
                  <div className="task-header">
                    <span className="task-name">{t.name}</span>
                    <span className="task-sched">{t.schedule}</span>
                  </div>
                  <code className="task-cmd">{t.command}</code>
                  {t.lastOutput && <p className="task-output">{t.lastOutput.slice(0, 80)}</p>}
                  <div className="task-actions">
                    <button className="task-btn" onClick={() => toggleTask(t.id)}>
                      {t.enabled ? '⏸ Pause' : '▶ Resume'}
                    </button>
                    <button className="task-btn del" onClick={() => deleteTask(t.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DAEMON ── */}
        {tab === 'daemon' && (
          <div className="tab-content-inner">
            <div className="section-title">🌀 DAEMON — Inner Monologue</div>
            <div className="daemon-status">
              <span>Next tick: <strong>{nextDaemonIn()}</strong></span>
              <button className="cx-btn purple" onClick={() => runDaemonTick('manual')} disabled={daemonRunning}>
                {daemonRunning ? 'Thinking...' : '▶ Trigger Now'}
              </button>
            </div>
            <div className="monologue-list">
              {[...daemonLog].reverse().map(m => (
                <div key={m.id} className="monologue-card">
                  <div className="mono-header">
                    <span className="mono-trigger">{m.trigger}</span>
                    <span className="mono-time">{timeAgo(m.timestamp)}</span>
                  </div>
                  <p className="mono-content">{m.content}</p>
                </div>
              ))}
              {daemonLog.length === 0 && <p className="cx-empty">No monologues yet. Trigger the daemon.</p>}
            </div>
          </div>
        )}

        {/* ── SELF ── */}
        {tab === 'self' && (
          <div className="tab-content-inner">
            <div className="section-title">⚙ SELF — Code Modification</div>
            <p className="cx-desc">Generate improvement proposals for DAVGpt. Review, copy, and apply manually.</p>
            <button className="cx-btn purple full" onClick={generateSelfProposal} disabled={selfGenerating || !apiKey}>
              {selfGenerating ? '🔄 Generating...' : '⚡ Generate Proposal'}
            </button>
            {selfProposal && (
              <div className="self-proposal">
                <div className="proposal-header">
                  <span>Proposal</span>
                  <button className="cx-btn small" onClick={() => navigator.clipboard.writeText(selfProposal)}>Copy</button>
                </div>
                <pre className="proposal-code">{selfProposal}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
