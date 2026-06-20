## 2026-06-20 - Initializing
**Learning:** Just starting.
**Action:** Create file.
## 2024-05-14 - React.memo with Inline Functions
**Learning:** In React components rendering lists (like `MessageBubble`), using standard `React.memo` fails to prevent O(N) re-renders when the parent component passes inline functions as props, which are recreated on every parent re-render (e.g. user typing).
**Action:** When applying `React.memo` to list items that receive function props, always use a custom comparison function (`arePropsEqual`) that explicitly checks only the relevant primitive props, ignoring the function props.
