// iris.ts — 6-profile LLM router

export type IrisProfile = 'REFLEX' | 'FAST' | 'SHARP' | 'GENTLE' | 'BALANCED' | 'DEEP'

export interface IrisRoute {
  profile: IrisProfile
  model: string
  maxTokens: number
  temperature: number
  systemSuffix: string
  description: string
  icon: string
  color: string
}

export const IRIS_ROUTES: Record<IrisProfile, IrisRoute> = {
  REFLEX: {
    profile: 'REFLEX',
    model: 'llama-3.1-8b-instant',
    maxTokens: 256,
    temperature: 0.1,
    systemSuffix: 'Respond in 1-2 sentences max. Be instant and direct.',
    description: 'Instant one-liner responses',
    icon: '⚡',
    color: '#f59e0b',
  },
  FAST: {
    profile: 'FAST',
    model: 'llama-3.1-8b-instant',
    maxTokens: 512,
    temperature: 0.3,
    systemSuffix: 'Be concise and clear. Prioritize speed over depth.',
    description: 'Quick answers, minimal latency',
    icon: '🚀',
    color: '#34d399',
  },
  SHARP: {
    profile: 'SHARP',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 1024,
    temperature: 0.1,
    systemSuffix: 'Be precise, technical, and accurate. No fluff.',
    description: 'Technical precision mode',
    icon: '🎯',
    color: '#60a5fa',
  },
  GENTLE: {
    profile: 'GENTLE',
    model: 'gemma2-9b-it',
    maxTokens: 1024,
    temperature: 0.7,
    systemSuffix: 'Be warm, supportive, and encouraging. Use a friendly tone.',
    description: 'Warm, empathetic responses',
    icon: '🌱',
    color: '#86efac',
  },
  BALANCED: {
    profile: 'BALANCED',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 2048,
    temperature: 0.4,
    systemSuffix: 'Balance depth with clarity. Structure your response well.',
    description: 'Default balanced mode',
    icon: '⚖️',
    color: '#a78bfa',
  },
  DEEP: {
    profile: 'DEEP',
    model: 'mixtral-8x7b-32768',
    maxTokens: 4096,
    temperature: 0.6,
    systemSuffix: 'Think deeply and thoroughly. Explore multiple angles. Be comprehensive.',
    description: 'Deep reasoning, long context',
    icon: '🔭',
    color: '#c084fc',
  },
}

const IRIS_KEY = 'davgpt_iris_profile'

export function loadIrisProfile(): IrisProfile {
  return (localStorage.getItem(IRIS_KEY) as IrisProfile) || 'BALANCED'
}

export function saveIrisProfile(profile: IrisProfile) {
  localStorage.setItem(IRIS_KEY, profile)
}

export function routeMessage(profile: IrisProfile, baseSystem: string): {
  model: string; maxTokens: number; temperature: number; system: string
} {
  const route = IRIS_ROUTES[profile]
  return {
    model: route.model,
    maxTokens: route.maxTokens,
    temperature: route.temperature,
    system: baseSystem + '\n\n' + route.systemSuffix,
  }
}
