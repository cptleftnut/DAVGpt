import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSessions, saveSessions, Session } from './sessions';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('sessions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadSessions', () => {
    it('should return empty array if nothing in localStorage', () => {
      const sessions = loadSessions();
      expect(sessions).toEqual([]);
      expect(window.localStorage.getItem).toHaveBeenCalledWith('davgpt_sessions');
    });

    it('should parse and return sessions from localStorage', () => {
      const mockSessions: Session[] = [
        {
          id: 'test-1',
          name: 'Test Session',
          createdAt: 1234,
          updatedAt: 1234,
          model: 'test-model',
          environmentId: 'test-env',
          messages: [],
        },
      ];
      window.localStorage.setItem('davgpt_sessions', JSON.stringify(mockSessions));

      const sessions = loadSessions();
      expect(sessions).toEqual(mockSessions);
    });

    it('should return empty array and catch error if JSON is invalid', () => {
      window.localStorage.setItem('davgpt_sessions', 'invalid json');

      const sessions = loadSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('saveSessions', () => {
    it('should stringify and save sessions to localStorage', () => {
       const mockSessions: Session[] = [
        {
          id: 'test-1',
          name: 'Test Session',
          createdAt: 1234,
          updatedAt: 1234,
          model: 'test-model',
          environmentId: 'test-env',
          messages: [],
        },
      ];
      saveSessions(mockSessions);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('davgpt_sessions', JSON.stringify(mockSessions));
    });
  });
});
