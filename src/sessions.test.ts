import { describe, it, expect } from 'vitest';
import { autoNameSession, Message } from './sessions';

describe('autoNameSession', () => {
  it('returns exact message if under 40 chars', () => {
    const messages: Message[] = [{ id: 1, role: 'user', content: 'Short message' }];
    expect(autoNameSession(messages)).toBe('Short message');
  });

  it('truncates and adds ellipsis if over 40 chars', () => {
    const longMessage = 'This is a very long message that definitely exceeds forty characters.';
    const messages: Message[] = [{ id: 1, role: 'user', content: longMessage }];
    expect(autoNameSession(messages)).toBe('This is a very long message that definit…');
  });

  it('returns New Chat if no user messages exist', () => {
    const messages: Message[] = [
      { id: 1, role: 'assistant', content: 'Hello' },
      { id: 2, role: 'system', content: 'System prompt' }
    ];
    expect(autoNameSession(messages)).toBe('New Chat');
  });

  it('returns New Chat if user message is empty', () => {
    const messages: Message[] = [{ id: 1, role: 'user', content: '' }];
    expect(autoNameSession(messages)).toBe('New Chat');
  });

  it('ignores assistant messages and finds the first user message', () => {
    const messages: Message[] = [
      { id: 1, role: 'assistant', content: 'How can I help?' },
      { id: 2, role: 'user', content: 'I need some help with testing.' }
    ];
    expect(autoNameSession(messages)).toBe('I need some help with testing.');
  });
});
