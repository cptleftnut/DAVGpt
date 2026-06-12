import { renderHook, act, waitFor } from '@testing-library/react';
import { useTTS } from './useSpeech';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useTTS', () => {
  let mockSpeak: ReturnType<typeof vi.fn>;
  let mockCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock SpeechSynthesisUtterance
    class MockUtterance {
      text: string;
      rate: number = 1;
      pitch: number = 1;
      volume: number = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

    // Mock window.speechSynthesis
    mockSpeak = vi.fn((utterance) => {
      // Synchronously call onstart inside act simulation (simulated by caller)
    });
    mockCancel = vi.fn();

    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTTS());

    expect(result.current.speaking).toBe(false);
    expect(result.current.autoSpeak).toBe(false);
    expect(result.current.supported).toBe(true);
  });

  it('should initialize autoSpeak from localStorage', () => {
    localStorage.setItem('davgpt_autospeak', 'true');
    const { result } = renderHook(() => useTTS());

    expect(result.current.autoSpeak).toBe(true);
  });

  it('should call speechSynthesis.speak and update speaking state', async () => {
    const { result } = renderHook(() => useTTS());

    act(() => {
      result.current.speak('Hello world');
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('Hello world');

    // Simulate events inside act to avoid React warnings
    act(() => {
      if (utterance.onstart) utterance.onstart();
    });
    expect(result.current.speaking).toBe(true);

    act(() => {
      if (utterance.onend) utterance.onend();
    });
    expect(result.current.speaking).toBe(false);
  });

  it('should set speaking false on error', async () => {
    const { result } = renderHook(() => useTTS());

    act(() => {
      result.current.speak('Hello world');
    });

    const utterance = mockSpeak.mock.calls[0][0];
    act(() => {
      if (utterance.onstart) utterance.onstart();
    });
    expect(result.current.speaking).toBe(true);

    act(() => {
      if (utterance.onerror) utterance.onerror();
    });
    expect(result.current.speaking).toBe(false);
  });

  it('should strip markdown and format text correctly before speaking', () => {
    const { result } = renderHook(() => useTTS());

    act(() => {
      result.current.speak('Hello\n\n```javascript\nconsole.log("test");\n```\n*bold* _italic_ `code`');
    });

    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('Hello [code block] bold italic');
  });

  it('should call speechSynthesis.cancel when stop is called', () => {
    const { result } = renderHook(() => useTTS());

    act(() => {
      result.current.stop();
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.speaking).toBe(false);
  });

  it('should toggle autoSpeak and update localStorage', () => {
    const { result } = renderHook(() => useTTS());

    act(() => {
      result.current.toggleAutoSpeak();
    });

    expect(result.current.autoSpeak).toBe(true);
    expect(localStorage.getItem('davgpt_autospeak')).toBe('true');

    act(() => {
      result.current.toggleAutoSpeak();
    });

    expect(result.current.autoSpeak).toBe(false);
    expect(localStorage.getItem('davgpt_autospeak')).toBe('false');
  });

  it('should cancel speech on unmount', () => {
    const { unmount } = renderHook(() => useTTS());

    unmount();

    expect(mockCancel).toHaveBeenCalled();
  });

  describe('unsupported environment', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        writable: true,
        value: undefined,
      });
    });

    it('should set supported to false', () => {
      const { result } = renderHook(() => useTTS());
      expect(result.current.supported).toBe(false);
    });

    it('should not throw error on speak', () => {
      const { result } = renderHook(() => useTTS());
      expect(() => {
        act(() => {
          result.current.speak('Hello world');
        });
      }).not.toThrow();
    });

    it('should not throw error on stop', () => {
      const { result } = renderHook(() => useTTS());
      expect(() => {
        act(() => {
          result.current.stop();
        });
      }).not.toThrow();
    });
  });
});
