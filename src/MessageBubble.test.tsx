import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import MessageBubble from './MessageBubble'

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

describe('MessageBubble', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders user messages correctly', () => {
    render(<MessageBubble role="user" content="Hello world" />)
    const element = screen.getByText('Hello world')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('bubble user-bubble')
  })

  it('renders assistant messages correctly without code blocks', () => {
    render(<MessageBubble role="assistant" content="Hello I am an AI" />)
    expect(screen.getByText('Hello I am an AI')).toBeInTheDocument()
    expect(screen.getByText('Hello I am an AI').parentElement).toHaveClass('bubble ai-bubble')
  })

  it('renders assistant messages with code blocks and copies code', async () => {
    vi.useFakeTimers()
    render(<MessageBubble role="assistant" content={"Here is some code:\n```javascript\nconsole.log('hello');\n```"} />)
    expect(screen.getByText('Here is some code:')).toBeInTheDocument()
    expect(screen.getByText('javascript')).toBeInTheDocument()
    expect(screen.getByText("console.log('hello');")).toBeInTheDocument()

    const copyBtn = screen.getByText('Copy')
    await act(async () => {
      fireEvent.click(copyBtn)
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("console.log('hello');")
    expect(screen.getByText('✓')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.getByText('Copy')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('calls onSpeak when read aloud button is clicked', () => {
    const onSpeakMock = vi.fn()
    render(<MessageBubble role="assistant" content="Hello" onSpeak={onSpeakMock} speaking={false} />)
    const speakButton = screen.getByTitle('Read aloud')
    fireEvent.click(speakButton)
    expect(onSpeakMock).toHaveBeenCalledWith('Hello')
  })

  it('cancels speech when stop button is clicked', () => {
    const onSpeakMock = vi.fn()
    const cancelMock = vi.fn()
    window.speechSynthesis = { cancel: cancelMock } as any
    render(<MessageBubble role="assistant" content="Hello" onSpeak={onSpeakMock} speaking={true} />)
    const stopButton = screen.getByTitle('Stop')
    fireEvent.click(stopButton)
    expect(cancelMock).toHaveBeenCalled()
    expect(onSpeakMock).not.toHaveBeenCalled()
  })

  it('renders run button for runnable code when onRunCommand provided', () => {
    const onRunMock = vi.fn().mockReturnValue(true)
    render(
      <MessageBubble
        role="assistant"
        content={"```bash\necho test\n```"}
        onRunCommand={onRunMock}
        connState="connected"
      />
    )

    const runBtn = screen.getByText('▶ Run')
    expect(runBtn).toBeInTheDocument()

    fireEvent.click(runBtn)
    expect(onRunMock).toHaveBeenCalledWith('echo test')
    expect(screen.getByText('✓ Sent')).toBeInTheDocument()
  })

  it('shows appropriate text on run button when not connected', () => {
    const onRunMock = vi.fn()
    render(
      <MessageBubble
        role="assistant"
        content={"```bash\necho test\n```"}
        onRunCommand={onRunMock}
        connState="disconnected"
      />
    )

    expect(screen.getByText('▶ Run (connect first)')).toBeInTheDocument()
  })

  it('alerts when run fails', () => {
    const onRunMock = vi.fn().mockReturnValue(false)
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <MessageBubble
        role="assistant"
        content={"```bash\necho test\n```"}
        onRunCommand={onRunMock}
        connState="connected"
      />
    )

    const runBtn = screen.getByText('▶ Run')
    fireEvent.click(runBtn)

    expect(onRunMock).toHaveBeenCalledWith('echo test')
    expect(alertMock).toHaveBeenCalledWith('Connect to Termux bridge first (Terminal tab → Connect)')
    expect(screen.getByText('▶ Run')).toBeInTheDocument() // Button text shouldn't change to "✓ Sent"

    alertMock.mockRestore()
  })

  it('does not render run button if code is not runnable', () => {
    const onRunMock = vi.fn()
    render(
      <MessageBubble
        role="assistant"
        content={"```plaintext\njust text\n```"}
        onRunCommand={onRunMock}
      />
    )

    expect(screen.queryByText('▶ Run')).not.toBeInTheDocument()
    expect(screen.queryByText('▶ Run (connect first)')).not.toBeInTheDocument()
  })
})
