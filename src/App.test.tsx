import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeTool } from './App';

describe('executeTool', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculate', () => {
    it('should successfully evaluate a valid expression', async () => {
      const result = await executeTool('calculate', { expression: '2 + 2' });
      expect(result).toBe('Result: 4');
    });

    it('should handle complex expressions', async () => {
      const result = await executeTool('calculate', { expression: '10 * (5 - 2)' });
      expect(result).toBe('Result: 30');
    });

    it('should return Error for invalid expressions', async () => {
      const result = await executeTool('calculate', { expression: '2 + * 5' });
      expect(result).toBe('Error');
    });

    it('should handle runtime errors in expressions', async () => {
       const result = await executeTool('calculate', { expression: 'throw new Error()' });
       expect(result).toBe('Error');
    })
  });

  describe('get_time', () => {
    it('should return the current system time', async () => {
      const result = await executeTool('get_time', {});
      // We expect the local string version of the fake time we set
      expect(result).toBe(`Current time: ${new Date('2024-01-01T12:00:00Z').toLocaleString()}`);
    });
  });

  describe('unknown tools', () => {
    it('should return unavailable message for unknown tool', async () => {
      const result = await executeTool('unknown_tool', { foo: 'bar' });
      expect(result).toBe('[Tool "unknown_tool" unavailable]');
    });
  });
});
