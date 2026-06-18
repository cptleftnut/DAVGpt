## 2024-06-13 - [Found Performance Opportunity]
**Learning:** `MessageBubble` does not use memoization, causing all messages to re-render in `Chat` when any state changes (like `input` or `loading`), leading to noticeable lag in long conversations. The `Chat` component also rerenders `MessageBubble` every time any typing occurs, since `setInput` updates its local state.
**Action:** React.memo should be added to `MessageBubble` or `Chat` message rendering.
