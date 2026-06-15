## 2024-06-15 - React Component Re-render Bottleneck
**Learning:** Found a significant frontend performance bottleneck where `MessageBubble` components re-rendered on every keystroke because the `input` state lives in the parent `Chat` component. This causes expensive parsing of code blocks in chat history unnecessarily.
**Action:** Use `React.memo()` to wrap computationally expensive or deeply nested UI components like message bubbles. Additionally, remember to wrap callbacks (e.g., with `useCallback`) passed to those components so that reference changes don't break memoization.
