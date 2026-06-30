
## 2024-05-18 - Memoizing Components with Inline Function Props
**Learning:** Standard `React.memo` is ineffective (O(N) re-renders) when a parent component passes down inline function props (like `onRunCommand` or `onSpeak`), which frequently change reference during state updates (e.g. user typing).
**Action:** When memoizing list components with inline function props to prevent re-renders on parent state updates, implement a custom comparison function that specifically checks only primitive props, intentionally ignoring the unstable function references.
