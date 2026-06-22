
## 2024-05-18 - List Component Re-render Optimization
**Learning:** In a typical React chat implementation, the parent `App` or `Chat` component might pass inline functions (like event handlers) to each list item (`MessageBubble`). Standard `React.memo` will fail to prevent re-renders when the parent's state updates (e.g. from user typing in the input box) because the inline function props are structurally "new" every time.
**Action:** When optimizing list components with `React.memo` that receive inline functions, always provide a custom comparison function that specifically checks only the primitive props.
