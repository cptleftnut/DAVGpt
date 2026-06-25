## 2024-06-25 - React.memo fails with inline function props in lists
**Learning:** When optimizing React component lists (e.g., `MessageBubble`) to prevent O(N) re-renders during parent state updates (like user typing), standard `React.memo` will fail if inline functions are passed as props.
**Action:** Ensure `React.memo` is used with a custom comparison function checking only primitive props when dealing with component lists receiving inline callbacks.
