import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Terminal from './Terminal'
import { describe, it, expect, vi } from 'vitest'

describe('Terminal Component', () => {
  const createMockBridge = (overrides = {}) => ({
    connState: 'disconnected' as const,
    output: '',
    setOutput: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendCommand: vi.fn(),
    onOutput: vi.fn(),
    ...overrides,
  })

  it('renders correctly', () => {
    const bridge = createMockBridge()
    render(<Terminal bridge={bridge} />)
    expect(screen.getByText('⌨️ Terminal')).toBeInTheDocument()
  })

  describe('Rendering states based on connState', () => {
    it('shows Disconnected state UI', () => {
      const bridge = createMockBridge({ connState: 'disconnected' })
      render(<Terminal bridge={bridge} />)

      // Connection status
      expect(screen.getByText('● Disconnected')).toBeInTheDocument()

      // Buttons
      expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument()

      // Hint should be visible when not connected
      expect(screen.getByText(/Open Termux and run/i)).toBeInTheDocument()

      // Input should be disabled
      const input = screen.getByPlaceholderText('Connect first...')
      expect(input).toBeDisabled()
    })

    it('shows Connecting state UI', () => {
      const bridge = createMockBridge({ connState: 'connecting' })
      render(<Terminal bridge={bridge} />)

      expect(screen.getByText('◌ Connecting...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
      expect(screen.getByText(/Open Termux and run/i)).toBeInTheDocument()
    })

    it('shows Connected state UI', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      expect(screen.getByText('● Connected')).toBeInTheDocument()

      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Connect' })).not.toBeInTheDocument()

      expect(screen.queryByText(/Open Termux and run/i)).not.toBeInTheDocument()

      const input = screen.getByPlaceholderText('Type command...')
      expect(input).not.toBeDisabled()

      // Ctrl buttons should be visible
      expect(screen.getByRole('button', { name: '^C' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Tab' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '^L' })).toBeInTheDocument()
    })

    it('shows Error state UI', () => {
      const bridge = createMockBridge({ connState: 'error' })
      render(<Terminal bridge={bridge} />)

      expect(screen.getByText('● Error')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
    })
  })

  describe('Output rendering', () => {
    it('renders output from the bridge', () => {
      const bridge = createMockBridge({ output: 'Hello, world!' })
      render(<Terminal bridge={bridge} />)

      const preElement = screen.getByText('Hello, world!')
      expect(preElement).toBeInTheDocument()
      expect(preElement.tagName).toBe('PRE')
    })
  })
})

describe('Terminal Component Interactions', () => {
  const createMockBridge = (overrides = {}) => ({
    connState: 'disconnected' as const,
    output: '',
    setOutput: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendCommand: vi.fn(),
    onOutput: vi.fn(),
    ...overrides,
  })

  it('calls connect when Connect button is clicked', () => {
    const bridge = createMockBridge()
    render(<Terminal bridge={bridge} />)

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    expect(bridge.connect).toHaveBeenCalled()
  })

  it('calls disconnect when Disconnect button is clicked', () => {
    const bridge = createMockBridge({ connState: 'connected' })
    render(<Terminal bridge={bridge} />)

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(bridge.disconnect).toHaveBeenCalled()
  })

  it('calls setOutput with empty string when Clear button is clicked', () => {
    const bridge = createMockBridge()
    render(<Terminal bridge={bridge} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(bridge.setOutput).toHaveBeenCalledWith('')
  })

  describe('Input interactions', () => {
    it('updates input value and sends command on Enter', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      const input = screen.getByPlaceholderText('Type command...')
      fireEvent.change(input, { target: { value: 'ls -la' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      expect(bridge.sendCommand).toHaveBeenCalledWith('ls -la')
      expect(input).toHaveValue('')
    })

    it('does not send command on Enter if input is empty', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      const input = screen.getByPlaceholderText('Type command...')
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      expect(bridge.sendCommand).not.toHaveBeenCalled()
    })

    it('sends Ctrl+C on Ctrl+C keydown', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      const input = screen.getByPlaceholderText('Type command...')
      fireEvent.keyDown(input, { key: 'c', ctrlKey: true })

      expect(bridge.sendCommand).toHaveBeenCalledWith('\x03')
    })

    it('sends Ctrl+L on Ctrl+L keydown', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      const input = screen.getByPlaceholderText('Type command...')
      fireEvent.keyDown(input, { key: 'l', ctrlKey: true })

      expect(bridge.sendCommand).toHaveBeenCalledWith('\x0c')
    })

    it('sends Ctrl+D on Ctrl+D keydown', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      const input = screen.getByPlaceholderText('Type command...')
      fireEvent.keyDown(input, { key: 'd', ctrlKey: true })

      expect(bridge.sendCommand).toHaveBeenCalledWith('\x04')
    })
  })

  describe('Control Buttons Interactions', () => {
    it('sends ^C when ^C button is clicked', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      fireEvent.click(screen.getByRole('button', { name: '^C' }))
      expect(bridge.sendCommand).toHaveBeenCalledWith('\x03')
    })

    it('sends Tab when Tab button is clicked', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      fireEvent.click(screen.getByRole('button', { name: 'Tab' }))
      expect(bridge.sendCommand).toHaveBeenCalledWith('\x09')
    })

    it('sends ^L when ^L button is clicked', () => {
      const bridge = createMockBridge({ connState: 'connected' })
      render(<Terminal bridge={bridge} />)

      fireEvent.click(screen.getByRole('button', { name: '^L' }))
      expect(bridge.sendCommand).toHaveBeenCalledWith('\x0c')
    })
  })
})
