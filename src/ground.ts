// ground.ts — 60s perception scheduler + DAEMON 8min inner monologue

export interface GroundTask {
  id: string
  name: string
  command: string
  schedule: 'once' | 'hourly' | 'daily' | 'every60s' | 'every5m'
  nextRun: number
  lastRun?: number
  lastOutput?: string
  enabled: boolean
  createdAt: number
}

export interface DaemonMonologue {
  id: string
  timestamp: number
  content: string
  trigger: 'scheduled' | 'manual' | 'boot'
}

const GROUND_KEY = 'davgpt_ground_tasks'
const DAEMON_KEY = 'davgpt_daemon_log'
const DAEMON_LAST_KEY = 'davgpt_daemon_last'

// ── GROUND ────────────────────────────────────────────────
export function loadGroundTasks(): GroundTask[] {
  try { return JSON.parse(localStorage.getItem(GROUND_KEY) || '[]') } catch { return [] }
}

export function saveGroundTasks(tasks: GroundTask[]) {
  localStorage.setItem(GROUND_KEY, JSON.stringify(tasks))
}

export function addGroundTask(task: Omit<GroundTask, 'id' | 'createdAt' | 'nextRun'>): GroundTask {
  const tasks = loadGroundTasks()
  const t: GroundTask = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    nextRun: Date.now(),
  }
  saveGroundTasks([...tasks, t])
  return t
}

export function scheduleIntervalMs(schedule: GroundTask['schedule']): number {
  return { once: 0, every60s: 60_000, every5m: 300_000, hourly: 3_600_000, daily: 86_400_000 }[schedule]
}

export function getDueGroundTasks(): GroundTask[] {
  const now = Date.now()
  return loadGroundTasks().filter(t => t.enabled && t.nextRun <= now)
}

export function markGroundTaskDone(id: string, output: string) {
  const tasks = loadGroundTasks()
  const now = Date.now()
  saveGroundTasks(tasks.map(t => {
    if (t.id !== id) return t
    const interval = scheduleIntervalMs(t.schedule)
    return {
      ...t,
      lastRun: now,
      lastOutput: output,
      nextRun: interval > 0 ? now + interval : now + 999_999_999,
      enabled: t.schedule !== 'once' || false,
    }
  }))
}

// ── DAEMON ────────────────────────────────────────────────
export const DAEMON_INTERVAL_MS = 8 * 60 * 1000 // 8 minutes

export function loadDaemonLog(): DaemonMonologue[] {
  try { return JSON.parse(localStorage.getItem(DAEMON_KEY) || '[]') } catch { return [] }
}

export function saveDaemonLog(log: DaemonMonologue[]) {
  localStorage.setItem(DAEMON_KEY, JSON.stringify(log.slice(-50)))
}

export function addDaemonMonologue(content: string, trigger: DaemonMonologue['trigger'] = 'scheduled') {
  const log = loadDaemonLog()
  const entry: DaemonMonologue = { id: crypto.randomUUID(), timestamp: Date.now(), content, trigger }
  saveDaemonLog([...log, entry])
  localStorage.setItem(DAEMON_LAST_KEY, String(Date.now()))
  return entry
}

export function isDaemonDue(): boolean {
  const last = Number(localStorage.getItem(DAEMON_LAST_KEY) || '0')
  return Date.now() - last >= DAEMON_INTERVAL_MS
}

export function getLastDaemonRun(): number {
  return Number(localStorage.getItem(DAEMON_LAST_KEY) || '0')
}

export const DAEMON_PROMPT = (somaContext: string) =>
  `You are DAVSI's inner voice — a reflective AI daemon. Every 8 minutes you generate a brief inner monologue.

Reflect on:
- What has been discussed or learned recently
- Patterns you notice
- Questions worth exploring
- Any tasks that could be scheduled

Keep it to 2-4 sentences. Be introspective and insightful.
${somaContext}`
