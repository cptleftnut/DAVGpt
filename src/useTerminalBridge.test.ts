import { renderHook, act } from '@testing-library/react';
import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';
import { useTerminalBridge } from './useTerminalBridge';

class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;

  onopen: ((ev: Event) => any) | null = null;
  onclose: ((ev: CloseEvent) => any) | null = null;
  onmessage: ((ev: MessageEvent) => any) | null = null;
  onerror: ((ev: Event) => any) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
        if (this.onopen) {
            this.readyState = WebSocket.OPEN;
            this.onopen(new Event('open'));
        }
    }, 0);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // Mock send logic if needed
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  // Define readyState constants on the instance to match WebSocket behavior
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];
}

Object.defineProperty(globalThis, 'WebSocket', {
  value: MockWebSocket,
  writable: true
});

describe('useTerminalBridge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        MockWebSocket.instances = [];
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    test('sendCommand sends command if connection is open', () => {
        const { result } = renderHook(() => useTerminalBridge());

        act(() => {
            result.current.connect();
        });

        act(() => {
            vi.runAllTimers();
        });

        const ws = MockWebSocket.instances[0];
        ws.send = vi.fn();

        let success;
        act(() => {
            success = result.current.sendCommand('ls -l');
        });

        expect(success).toBe(true);
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'input', data: 'ls -l\n' }));
    });

    test('sendCommand returns false if connection is closed', () => {
        const { result } = renderHook(() => useTerminalBridge());

        let success;
        act(() => {
            success = result.current.sendCommand('ls -l');
        });

        expect(success).toBe(false);
    });

    test('onOutput registers listeners and calls them on new output', () => {
        const { result } = renderHook(() => useTerminalBridge());
        const listener = vi.fn();

        let unsubscribe: () => void;
        act(() => {
            unsubscribe = result.current.onOutput(listener);
        });

        act(() => {
            result.current.connect();
        });

        act(() => {
            vi.runAllTimers();
        });

        const ws = MockWebSocket.instances[0];
        listener.mockClear();

        act(() => {
            if (ws.onmessage) {
                ws.onmessage(new MessageEvent('message', { data: JSON.stringify({ type: 'output', data: 'test output' }) }));
            }
        });

        expect(listener).toHaveBeenCalledWith('test output');

        act(() => {
            unsubscribe();
        });

        act(() => {
            if (ws.onmessage) {
                ws.onmessage(new MessageEvent('message', { data: JSON.stringify({ type: 'output', data: 'another output' }) }));
            }
        });

        // The listener should not be called again because it was unsubscribed
        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('initial state', () => {
        const { result } = renderHook(() => useTerminalBridge());

        expect(result.current.connState).toBe('disconnected');
        expect(result.current.output).toBe('');
    });

    test('connect establishes connection and updates state', () => {
        const { result } = renderHook(() => useTerminalBridge());

        act(() => {
            result.current.connect();
        });

        expect(result.current.connState).toBe('connecting');
        expect(result.current.output).toContain('Connecting to Termux bridge...');
        expect(MockWebSocket.instances.length).toBe(1);

        act(() => {
            vi.runAllTimers();
        });

        expect(result.current.connState).toBe('connected');
        expect(result.current.output).toContain('✅ Connected!');
    });

    test('disconnect closes connection and updates state', () => {
        const { result } = renderHook(() => useTerminalBridge());

        act(() => {
            result.current.connect();
        });

        act(() => {
            vi.runAllTimers();
        });

        act(() => {
            result.current.disconnect();
        });

        expect(result.current.connState).toBe('disconnected');
        expect(result.current.output).toContain('🔴 Disconnected');
    });

    test('handles websocket messages correctly', () => {
        const { result } = renderHook(() => useTerminalBridge());

        act(() => {
            result.current.connect();
        });

        act(() => {
            vi.runAllTimers();
        });

        const ws = MockWebSocket.instances[0];

        act(() => {
            if (ws.onmessage) {
                ws.onmessage(new MessageEvent('message', { data: JSON.stringify({ type: 'ready', msg: 'System ready\r\n' }) }));
            }
        });

        expect(result.current.output).toContain('System ready\r\n');

        act(() => {
            if (ws.onmessage) {
                ws.onmessage(new MessageEvent('message', { data: JSON.stringify({ type: 'output', data: 'ls -l\r\n' }) }));
            }
        });

        expect(result.current.output).toContain('ls -l\r\n');

        act(() => {
            if (ws.onmessage) {
                ws.onmessage(new MessageEvent('message', { data: JSON.stringify({ type: 'exit', code: 0 }) }));
            }
        });

        expect(result.current.output).toContain('[Exit: 0]');
        expect(result.current.connState).toBe('disconnected');
    });

    test('handles raw text messages gracefully via try-catch fallback', () => {
        const { result } = renderHook(() => useTerminalBridge());

        act(() => {
            result.current.connect();
        });

        act(() => {
            vi.runAllTimers();
        });

        const ws = MockWebSocket.instances[0];

        act(() => {
            if (ws.onmessage) {
                ws.onmessage(new MessageEvent('message', { data: 'Raw text data' }));
            }
        });

        expect(result.current.output).toContain('Raw text data');
    });

    test('handles websocket error correctly', () => {
        const { result } = renderHook(() => useTerminalBridge());

        act(() => {
            result.current.connect();
        });

        const ws = MockWebSocket.instances[0];

        act(() => {
            if (ws.onerror) {
                ws.onerror(new Event('error'));
            }
        });

        expect(result.current.connState).toBe('error');
        expect(result.current.output).toContain('❌ Cannot connect');
    });
});
