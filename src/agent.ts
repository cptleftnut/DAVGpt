// agent.ts — Autonomous coding agent core

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'waiting' | 'done' | 'error'

export interface AgentStep {
  id: number
  type: 'thought' | 'plan' | 'command' | 'output' | 'code' | 'file' | 'error' | 'result'
  content: string
  timestamp: number
}

export interface AgentTask {
  id: string
  goal: string
  steps: AgentStep[]
  status: AgentStatus
  createdAt: number
  model: string
}

// ── Agent system prompt ────────────────────────────────────
export const AGENT_SYSTEM = `You are KIRA — an autonomous AI coding agent running on Android via Termux.
You have full control of a bash shell and can write, run, and fix code autonomously.

CAPABILITIES:
- Execute any bash/shell command
- Write and edit files
- Install packages via npm, pip, pkg
- Run scripts and fix errors autonomously
- Access the internet, APIs, and local filesystem

RESPONSE FORMAT — always use XML tags:

<thought>Your reasoning about what to do next</thought>

<plan>
1. Step one
2. Step two
</plan>

<command>the bash command to run</command>

<write_file path="/path/to/file">
file contents here
</write_file>

<result>Final answer or summary when task is complete</result>

RULES:
- Always think before acting
- Run one command at a time and observe output
- Fix errors autonomously — retry with corrected approach
- When done, wrap up with <result>
- Be concise in thoughts, precise in commands
- Working directory: /data/data/com.termux/files/home`

// ── Parse agent response ───────────────────────────────────
export interface AgentAction {
  thoughts: string[]
  plan: string | null
  command: string | null
  writeFile: { path: string; content: string } | null
  result: string | null
}

export function parseAgentResponse(text: string): AgentAction {
  const get = (tag: string) => {
    const m = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return m ? m[1].trim() : null
  }
  const thoughts = [...text.matchAll(/<thought>([\s\S]*?)<\/thought>/gi)].map(m => m[1].trim())
  const fileMatch = text.match(/<write_file path="([^"]+)">([\s\S]*?)<\/write_file>/i)

  return {
    thoughts,
    plan: get('plan'),
    command: get('command'),
    writeFile: fileMatch ? { path: fileMatch[1], content: fileMatch[2].trim() } : null,
    result: get('result'),
  }
}

// ── Build messages for agent loop ─────────────────────────
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function buildAgentMessages(task: AgentTask): AgentMessage[] {
  const msgs: AgentMessage[] = [{ role: 'system', content: AGENT_SYSTEM }]
  msgs.push({ role: 'user', content: `TASK: ${task.goal}` })

  // Replay steps as conversation
  let pendingOutput = ''
  for (const step of task.steps) {
    if (step.type === 'thought' || step.type === 'plan' || step.type === 'command' || step.type === 'file') {
      if (pendingOutput) {
        msgs.push({ role: 'user', content: `<output>\n${pendingOutput}\n</output>` })
        pendingOutput = ''
      }
      // Group agent actions as assistant messages
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant') {
        last.content += '\n' + step.content
      } else {
        msgs.push({ role: 'assistant', content: step.content })
      }
    } else if (step.type === 'output' || step.type === 'error') {
      pendingOutput += step.content + '\n'
    }
  }

  if (pendingOutput) {
    msgs.push({ role: 'user', content: `<output>\n${pendingOutput.trim()}\n</output>\n\nContinue with the next step.` })
  }

  return msgs
}
