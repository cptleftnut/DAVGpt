import { describe, it, expect } from 'vitest'
import { routeMessage } from './iris'

describe('routeMessage', () => {
  it('should return correct route config for BALANCED', () => {
    const result = routeMessage('BALANCED', 'Base system prompt')
    expect(result.model).toBe('llama-3.3-70b-versatile')
    expect(result.maxTokens).toBe(2048)
    expect(result.temperature).toBe(0.4)
    expect(result.system).toBe('Base system prompt\n\nBalance depth with clarity. Structure your response well.')
  })

  it('should return correct route config for FAST', () => {
    const result = routeMessage('FAST', 'Base system prompt')
    expect(result.model).toBe('llama-3.1-8b-instant')
    expect(result.maxTokens).toBe(512)
    expect(result.temperature).toBe(0.3)
    expect(result.system).toBe('Base system prompt\n\nBe concise and clear. Prioritize speed over depth.')
  })

  it('should return correct route config for DEEP', () => {
    const result = routeMessage('DEEP', 'Base system prompt')
    expect(result.model).toBe('mixtral-8x7b-32768')
    expect(result.maxTokens).toBe(4096)
    expect(result.temperature).toBe(0.6)
    expect(result.system).toBe('Base system prompt\n\nThink deeply and thoroughly. Explore multiple angles. Be comprehensive.')
  })

  it('should handle empty base system prompt correctly', () => {
    const result = routeMessage('BALANCED', '')
    expect(result.system).toBe('\n\nBalance depth with clarity. Structure your response well.')
  })
})
