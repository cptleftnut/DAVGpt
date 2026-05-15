// sessions.ts — session & environment management

export interface Environment {
  id: string
  name: string
  icon: string
  systemPrompt: string
  model: string
}

export interface Message {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCall?: { name: string; args: any }
  toolResult?: string
}

export interface Session {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  model: string
  environmentId: string
  messages: Message[]
}

// ── Built-in environments ──────────────────────────────────
export const DEFAULT_ENVIRONMENTS: Environment[] = [
  {
    id: 'default',
    name: 'General',
    icon: '💬',
    model: 'llama-3.3-70b-versatile',
    systemPrompt: 'You are a helpful, friendly AI assistant. Be concise and clear.',
  },
  {
    id: 'coder',
    name: 'Code Assistant',
    icon: '💻',
    model: 'llama-3.3-70b-versatile',
    systemPrompt: 'You are an expert software engineer. Always write clean, commented code. Prefer showing working examples. When suggesting terminal commands, wrap them in ```bash blocks.',
  },
  {
    id: 'terminal',
    name: 'Terminal Helper',
    icon: '⌨️',
    model: 'llama-3.3-70b-versatile',
    systemPrompt: 'You are a Linux/Termux terminal expert. Always provide commands in ```bash code blocks so they can be run directly. Explain what each command does briefly.',
  },
  {
    id: 'danish',
    name: 'Dansk',
    icon: '🇩🇰',
    model: 'llama-3.3-70b-versatile',
    systemPrompt: 'Du er en hjælpsom AI-assistent. Svar altid på dansk med mindre brugeren skriver på et andet sprog.',
  },
  {
    id: 'researcher',
    name: 'Researcher',
    icon: '🔬',
    model: 'llama-3.3-70b-versatile',
    systemPrompt: 'You are a thorough research assistant. Provide well-structured, detailed answers with clear sections. Cite reasoning and acknowledge uncertainty when relevant.',
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: '🎨',
    model: 'mixtral-8x7b-32768',
    systemPrompt: 'You are a creative writing and brainstorming partner. Be imaginative, expressive, and think outside the box. Help with stories, ideas, poetry, and creative projects.',
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    icon: '🤖',
    model: 'nous-hermes-2-pro-llama-3-8b',
    systemPrompt: `You are a helpful AI assistant with access to tools. When you want to use a tool, respond with a tool_call block:

<tool_call>
{"name": "tool_name", "arguments": {"arg1": "value1"}}
</tool_call>

Available tools: web_search(query), calculate(expression), get_time(), summarize(text)`,
  },
]

// ── Storage helpers ────────────────────────────────────────
const SESSIONS_KEY = 'davgpt_sessions'
const ACTIVE_KEY = 'davgpt_active_session'
const ENVS_KEY = 'davgpt_environments'

export function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
  } catch { return [] }
}

export function saveSessions(sessions: Session[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function loadEnvironments(): Environment[] {
  try {
    const custom = JSON.parse(localStorage.getItem(ENVS_KEY) || '[]')
    return [...DEFAULT_ENVIRONMENTS, ...custom]
  } catch { return DEFAULT_ENVIRONMENTS }
}

export function saveCustomEnvironments(envs: Environment[]) {
  const custom = envs.filter(e => !DEFAULT_ENVIRONMENTS.find(d => d.id === e.id))
  localStorage.setItem(ENVS_KEY, JSON.stringify(custom))
}

export function createSession(environmentId = 'default', environments: Environment[]): Session {
  const env = environments.find(e => e.id === environmentId) || environments[0]
  return {
    id: crypto.randomUUID(),
    name: 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: env.model,
    environmentId: env.id,
    messages: [],
  }
}

export function autoNameSession(messages: Message[]): string {
  const first = messages.find(m => m.role === 'user')?.content || ''
  return first.slice(0, 40) + (first.length > 40 ? '…' : '') || 'New Chat'
}
