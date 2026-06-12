import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import AgentPanel from './AgentPanel'

const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock crypto.randomUUID
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234',
  },
})

// Mock fetch
global.fetch = vi.fn()

describe('AgentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders correctly initially', () => {
    render(<AgentPanel connState="disconnected" apiKey="test-key" sendCommand={() => true} onOutput={() => () => {}} switchToTerminal={() => {}} mcpServers={[]} />)

    expect(screen.getByText('⚡ KIRA')).toBeInTheDocument()
    expect(screen.getByText('KIRA is ready')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Connect Terminal first...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '⚡' })).toBeDisabled()
  })
})

describe('runAgentLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('should run a successful agent loop', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        choices: [
          { message: { content: '<thought>I will run a command</thought><command>echo hello</command>' } }
        ]
      })
    } as any).mockResolvedValueOnce({
      json: async () => ({
        choices: [
          { message: { content: '<result>Task completed successfully</result>' } }
        ]
      })
    } as any)

    let outputCallback: ((data: string) => void) | null = null;

    render(<AgentPanel
      connState="connected"
      apiKey="test-key"
      sendCommand={() => true}
      onOutput={(cb) => {
        outputCallback = cb;
        return () => {};
      }}
      switchToTerminal={() => {}}
      mcpServers={[]}
    />)

    const input = screen.getByPlaceholderText('Describe a task for KIRA...')
    act(() => { fireEvent.change(input, { target: { value: 'Test goal' } }) })

    const startButton = screen.getByRole('button', { name: '⚡' })
    await act(async () => { fireEvent.click(startButton) })

    await waitFor(() => {
       expect(screen.getByText('I will run a command')).toBeInTheDocument()
    })

    expect(screen.getByText('echo hello')).toBeInTheDocument()

    await act(async () => {
      if (outputCallback) {
        outputCallback('hello\n$ ')
      }
      await vi.runAllTimersAsync()
    })

    await waitFor(() => {
       expect(screen.getByText('Task completed successfully')).toBeInTheDocument()
    })
  })

  it('should handle max iterations reached', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue({
      json: async () => ({
        choices: [
          { message: { content: '<thought>Thinking...</thought><command>echo looping</command>' } }
        ]
      })
    } as any)

    let outputCallback: ((data: string) => void) | null = null;

    render(<AgentPanel
      connState="connected"
      apiKey="test-key"
      sendCommand={() => true}
      onOutput={(cb) => {
        outputCallback = cb;
        return () => {};
      }}
      switchToTerminal={() => {}}
      mcpServers={[]}
    />)

    const input = screen.getByPlaceholderText('Describe a task for KIRA...')
    act(() => { fireEvent.change(input, { target: { value: 'Loop task' } }) })

    const startButton = screen.getByRole('button', { name: '⚡' })
    await act(async () => { fireEvent.click(startButton) })

    for (let i = 0; i < 30; i++) { await act(async () => { await vi.runAllTimersAsync(); });
      await waitFor(() => {
        const thoughts = screen.queryAllByText('Thinking...')
        expect(thoughts.length).toBeGreaterThan(0)
      })

      await act(async () => {
        if (outputCallback) {
          outputCallback('output\n$ ')
        }
        await vi.runAllTimersAsync()
      })
    }

    await waitFor(() => {
       expect(screen.getByText('⚠️ Reached max steps (30). Task may be incomplete.')).toBeInTheDocument()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockRejectedValue(new Error('Network error'))

    render(<AgentPanel
      connState="connected"
      apiKey="test-key"
      sendCommand={() => true}
      onOutput={() => () => {}}
      switchToTerminal={() => {}}
      mcpServers={[]}
    />)

    const input = screen.getByPlaceholderText('Describe a task for KIRA...')
    act(() => { fireEvent.change(input, { target: { value: 'Test goal' } }) })

    const startButton = screen.getByRole('button', { name: '⚡' })
    await act(async () => { fireEvent.click(startButton) })

    await waitFor(() => {
       expect(screen.getByText('Fatal error: Network error')).toBeInTheDocument()
    })
  })

  it('should stop agent when stop button is clicked', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue({
      json: async () => ({
        choices: [
          { message: { content: '<thought>I will run a command</thought><command>sleep 10</command>' } }
        ]
      })
    } as any)

    render(<AgentPanel
      connState="connected"
      apiKey="test-key"
      sendCommand={() => true}
      onOutput={() => () => {}}
      switchToTerminal={() => {}}
      mcpServers={[]}
    />)

    const input = screen.getByPlaceholderText('Describe a task for KIRA...')
    act(() => { fireEvent.change(input, { target: { value: 'Test abort' } }) })

    const startButton = screen.getByRole('button', { name: '⚡' })
    await act(async () => { fireEvent.click(startButton) })

    await waitFor(() => {
       expect(screen.getByText('I will run a command')).toBeInTheDocument()
    })

    const stopButton = screen.getByRole('button', { name: '⏹ Stop KIRA' })
    await act(async () => { fireEvent.click(stopButton) })

    await waitFor(() => {
       expect(screen.getByPlaceholderText('Describe a task for KIRA...')).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
