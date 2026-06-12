import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadMCPServers, BUILTIN_SERVERS } from './mcp'

const STORAGE_KEY = 'davgpt_mcp_servers'

describe('loadMCPServers', () => {
  let mockStorage: Record<string, string> = {}

  beforeEach(() => {
    mockStorage = {}

    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value
      }),
      clear: vi.fn(() => {
        mockStorage = {}
      })
    }
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should return built-in servers with default values when localStorage is empty', () => {
    const servers = loadMCPServers()
    expect(servers).toHaveLength(BUILTIN_SERVERS.length)
    expect(servers[0].connected).toBe(false)
    expect(servers[0].token).toBeUndefined()
  })

  it('should return servers with saved connected state and token', () => {
    const customId = BUILTIN_SERVERS[0].id
    mockStorage[STORAGE_KEY] = JSON.stringify({
      [customId]: { connected: true, token: 'test-token' }
    })

    const servers = loadMCPServers()
    const server = servers.find(s => s.id === customId)

    expect(server).toBeDefined()
    expect(server?.connected).toBe(true)
    expect(server?.token).toBe('test-token')

    // Other servers should remain disconnected
    const otherServer = servers.find(s => s.id !== customId)
    expect(otherServer?.connected).toBe(false)
  })

  it('should handle malformed JSON in localStorage gracefully', () => {
    mockStorage[STORAGE_KEY] = 'invalid-json'

    // Should not throw, should return defaults
    const servers = loadMCPServers()
    expect(servers).toHaveLength(BUILTIN_SERVERS.length)
    expect(servers[0].connected).toBe(false)
  })
})
