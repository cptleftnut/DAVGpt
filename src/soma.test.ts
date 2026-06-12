// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getChainContext } from './soma';

describe('getChainContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty string when chain is empty', () => {
    expect(getChainContext()).toBe('');
  });

  it('returns formatted string for chain elements', () => {
    const mockChain = [
      { type: 'fact', content: 'test 1' },
      { type: 'context', content: 'test 2' },
    ];
    localStorage.setItem('davgpt_soma_chain', JSON.stringify(mockChain));

    const result = getChainContext();
    expect(result).toBe('\n\nMEMORY (SOMA chain):\n[fact] test 1\n[context] test 2');
  });

  it('respects the custom limit parameter', () => {
    const mockChain = [
      { type: 'fact', content: 'test 1' },
      { type: 'context', content: 'test 2' },
      { type: 'preference', content: 'test 3' },
    ];
    localStorage.setItem('davgpt_soma_chain', JSON.stringify(mockChain));

    const result = getChainContext(2);
    expect(result).toBe('\n\nMEMORY (SOMA chain):\n[context] test 2\n[preference] test 3');
  });

  it('uses default limit of 8', () => {
    const mockChain = Array.from({ length: 10 }, (_, i) => ({
      type: 'fact',
      content: `test ${i + 1}`
    }));
    localStorage.setItem('davgpt_soma_chain', JSON.stringify(mockChain));

    const result = getChainContext();
    const lines = result.split('\n');

    // 2 empty lines + 1 header + 8 items = 11 lines
    expect(lines.length).toBe(11);
    expect(lines[3]).toBe('[fact] test 3'); // First item shown (since it skipped 1 and 2)
    expect(lines[10]).toBe('[fact] test 10'); // Last item shown
  });
});
