import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSession, Environment } from './sessions'

describe('createSession', () => {
  const mockDate = 1680000000000
  const mockUUID = '123e4567-e89b-12d3-a456-426614174000'

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(mockDate)
    vi.stubGlobal('crypto', { randomUUID: () => mockUUID })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const environments: Environment[] = [
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
      systemPrompt: 'You are an expert software engineer.',
    }
  ]

  it('should create a session with the requested environment', () => {
    const session = createSession('coder', environments)

    expect(session).toEqual({
      id: mockUUID,
      name: 'New Chat',
      createdAt: mockDate,
      updatedAt: mockDate,
      model: 'llama-3.3-70b-versatile',
      environmentId: 'coder',
      messages: [],
    })
  })

  it('should create a session with the default environment when no ID is provided', () => {
    const session = createSession(undefined, environments)

    expect(session).toEqual({
      id: mockUUID,
      name: 'New Chat',
      createdAt: mockDate,
      updatedAt: mockDate,
      model: 'llama-3.3-70b-versatile',
      environmentId: 'default',
      messages: [],
    })
  })

  it('should fallback to the first environment if requested environment is not found', () => {
    const session = createSession('non-existent', environments)

    expect(session).toEqual({
      id: mockUUID,
      name: 'New Chat',
      createdAt: mockDate,
      updatedAt: mockDate,
      model: 'llama-3.3-70b-versatile',
      environmentId: 'default', // First in the array
      messages: [],
    })
  })
})
