## 2024-06-23 - Memoizing Message Bubbles with Inline Functions
**Learning:** When optimizing React component lists (e.g., `MessageBubble`) to prevent O(N) re-renders during parent state updates (like user typing), standard `React.memo` will fail if inline functions (e.g. `onRunCommand={...}`) are passed as props from the parent.
**Action:** Ensure `React.memo` is used with a custom comparison function checking only the primitive props.
