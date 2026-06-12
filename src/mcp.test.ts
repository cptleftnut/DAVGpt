import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callMCPTool, MCPServer } from './mcp';

describe('callMCPTool', () => {
  const mockServer: MCPServer = {
    id: 'test-server',
    name: 'Test Server',
    icon: '🧪',
    description: 'A test server',
    url: 'http://localhost:1234/mcp',
    authType: 'token',
    connected: true,
  };

  const toolName = 'test-tool';
  const args = { arg1: 'value1' };

  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1600000000000));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('calls fetch with correct method, headers, and body without token', async () => {
    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce({ result: { success: true } }),
    });

    await callMCPTool(mockServer, toolName, args);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:1234/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1600000000000,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
    });
  });

  it('includes Authorization header if server has a token', async () => {
    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce({ result: { success: true } }),
    });

    const serverWithToken = { ...mockServer, token: 'test-token' };
    await callMCPTool(serverWithToken, toolName, args);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:1234/mcp', expect.objectContaining({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
    }));
  });

  it('handles array content response correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce({
        result: {
          content: [
            { text: 'Line 1' },
            { other: 'Line 2' }, // should be JSON.stringified
            { text: 'Line 3' }
          ]
        }
      }),
    });

    const result = await callMCPTool(mockServer, toolName, args);
    expect(result).toBe('Line 1\n{"other":"Line 2"}\nLine 3');
  });

  it('handles non-array result correctly by stringifying it', async () => {
    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce({
        result: { someKey: 'someValue' }
      }),
    });

    const result = await callMCPTool(mockServer, toolName, args);
    expect(result).toBe('{"someKey":"someValue"}');
  });

  it('returns formatted error if response contains data.error', async () => {
    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce({
        error: { message: 'Something went wrong' }
      }),
    });

    const result = await callMCPTool(mockServer, toolName, args);
    expect(result).toBe('MCP Error: Something went wrong');
  });

  it('catches connection errors and returns a formatted message', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network failure'));

    const result = await callMCPTool(mockServer, toolName, args);
    expect(result).toBe('Connection error: Network failure');
  });
});
