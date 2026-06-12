// mcp.ts — MCP server registry and connection manager

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
}

export interface MCPServer {
  id: string
  name: string
  icon: string
  description: string
  url: string
  authType: 'token' | 'oauth' | 'none'
  authLabel?: string
  authPlaceholder?: string
  connected: boolean
  token?: string
  tools?: MCPTool[]
}

export const BUILTIN_SERVERS: Omit<MCPServer, 'connected' | 'token' | 'tools'>[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    description: 'Read repos, issues, PRs, code search',
    url: 'https://api.githubcopilot.com/mcp/',
    authType: 'token',
    authLabel: 'GitHub Personal Access Token',
    authPlaceholder: 'ghp_...',
  },
  {
    id: 'googledrive',
    name: 'Google Drive',
    icon: '📁',
    description: 'Search and read your Drive files',
    url: 'https://drivemcp.googleapis.com/mcp/v1',
    authType: 'token',
    authLabel: 'Google API Key or OAuth Token',
    authPlaceholder: 'ya29... or AIza...',
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    icon: '🗂️',
    description: 'Read/write local files via Termux',
    url: 'http://localhost:7682/mcp',
    authType: 'none',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    description: 'Read and write Notion pages and databases',
    url: 'https://mcp.notion.com/mcp',
    authType: 'token',
    authLabel: 'Notion Integration Token',
    authPlaceholder: 'secret_...',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💬',
    description: 'Read channels, send messages',
    url: 'https://mcp.slack.com/mcp',
    authType: 'token',
    authLabel: 'Slack Bot Token',
    authPlaceholder: 'xoxb-...',
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: '📋',
    description: 'Manage issues and projects',
    url: 'https://mcp.linear.app/sse',
    authType: 'token',
    authLabel: 'Linear API Key',
    authPlaceholder: 'lin_api_...',
  },
  {
    id: 'custom',
    name: 'Custom MCP',
    icon: '🔌',
    description: 'Connect any MCP-compatible server',
    url: '',
    authType: 'token',
    authLabel: 'Bearer Token (optional)',
    authPlaceholder: 'token...',
  },
]

const STORAGE_KEY = 'davgpt_mcp_servers'

export function loadMCPServers(): MCPServer[] {
  try {
    const saved: Record<string, { connected: boolean; token?: string }> =
      JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return BUILTIN_SERVERS.map(s => ({
      ...s,
      connected: saved[s.id]?.connected || false,
      token: saved[s.id]?.token,
    }))
  } catch {
    return BUILTIN_SERVERS.map(s => ({ ...s, connected: false }))
  }
}

export function saveMCPServers(servers: MCPServer[]) {
  const data: Record<string, { connected: boolean; token?: string }> = {}
  servers.forEach(s => { data[s.id] = { connected: s.connected, token: s.token } })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// Call a tool on a connected MCP server (SSE/HTTP transport)
export async function callMCPTool(
  server: MCPServer,
  toolName: string,
  args: Record<string, any>
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (server.token) headers['Authorization'] = `Bearer ${server.token}`

  try {
    const res = await fetch(server.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
    })
    const data = await res.json()
    if (data.error) return `MCP Error: ${data.error.message}`
    const content = data.result?.content
    if (Array.isArray(content)) return content.map((c: any) => c.text || JSON.stringify(c)).join('\n')
    return JSON.stringify(data.result)
  } catch (e: any) {
    return `Connection error: ${e.message}`
  }
}

// List tools from a connected MCP server
export async function fetchMCPTools(server: MCPServer): Promise<MCPTool[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (server.token) headers['Authorization'] = `Bearer ${server.token}`
  try {
    const res = await fetch(server.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })
    const data = await res.json()
    return data.result?.tools || []
  } catch { return [] }
}
