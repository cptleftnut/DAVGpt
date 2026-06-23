import { useState, useMemo } from 'react'
import type { Session, Environment } from './sessions'
import { DEFAULT_ENVIRONMENTS } from './sessions'
import './Sidebar.css'

interface Props {
  sessions: Session[]
  activeId: string
  environments: Environment[]
  onSelect: (id: string) => void
  onNew: (envId?: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onNewEnv: () => void
  onClose: () => void
}

export default function Sidebar({
  sessions, activeId, environments,
  onSelect, onNew, onDelete, onRename, onNewEnv, onClose
}: Props) {
  const [tab, setTab] = useState<'chats' | 'envs'>('chats')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)

  const startRename = (s: Session) => {
    setRenamingId(s.id)
    setRenameVal(s.name)
  }

  const finishRename = () => {
    if (renamingId && renameVal.trim()) onRename(renamingId, renameVal.trim())
    setRenamingId(null)
  }

  const envMap = useMemo(() => new Map(environments.map(e => [e.id, e])), [environments])
  const getEnv = (envId: string) => envMap.get(envId)

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sb-header">
          <span className="sb-title">DAVGpt</span>
          <button className="sb-close" onClick={onClose} title="Close sidebar" aria-label="Close sidebar">✕</button>
        </div>

        {/* Tabs */}
        <div className="sb-tabs">
          <button className={`sb-tab ${tab === 'chats' ? 'active' : ''}`} onClick={() => setTab('chats')}>💬 Chats</button>
          <button className={`sb-tab ${tab === 'envs' ? 'active' : ''}`} onClick={() => setTab('envs')}>🌐 Environments</button>
        </div>

        {tab === 'chats' && (
          <>
            <button className="new-chat-btn" onClick={() => { onNew(); onClose() }}>
              + New Chat
            </button>

            <div className="sb-list">
              {sorted.length === 0 && (
                <p className="sb-empty">No conversations yet</p>
              )}
              {sorted.map(s => {
                const env = getEnv(s.environmentId)
                return (
                  <div
                    key={s.id}
                    className={`sb-item ${s.id === activeId ? 'active' : ''}`}
                    onClick={() => { onSelect(s.id); onClose() }}
                  >
                    <span className="sb-env-icon">{env?.icon || '💬'}</span>
                    <div className="sb-item-info">
                      {renamingId === s.id ? (
                        <input
                          className="rename-input"
                          value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onBlur={finishRename}
                          onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingId(null) }}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="sb-name">{s.name}</span>
                          <span className="sb-meta">{env?.name} · {s.messages.length} msgs</span>
                        </>
                      )}
                    </div>
                    <div className="sb-actions" onClick={e => e.stopPropagation()}>
                      <button className="sb-action" onClick={() => startRename(s)} title="Rename" aria-label="Rename">✏️</button>
                      <button className="sb-action del" onClick={() => onDelete(s.id)} title="Delete" aria-label="Delete">🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'envs' && (
          <>
            <div className="sb-list">
              {environments.map(env => (
                <div key={env.id} className="env-card">
                  <div className="env-card-top">
                    <span className="env-icon">{env.icon}</span>
                    <div className="env-info">
                      <span className="env-name">{env.name}</span>
                      <span className="env-model">{env.model.split('-').slice(0,3).join('-')}</span>
                    </div>
                    <button
                      className="use-env-btn"
                      onClick={() => { onNew(env.id); onClose() }}
                    >Start</button>
                  </div>
                  <p className="env-prompt">{env.systemPrompt.slice(0, 80)}…</p>
                </div>
              ))}
            </div>
            <button className="new-env-btn" onClick={() => { onNewEnv(); onClose() }}>
              + Create Environment
            </button>
          </>
        )}
      </div>
    </div>
  )
}
