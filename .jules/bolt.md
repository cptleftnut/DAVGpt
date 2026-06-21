## 2024-05-14 - Optimize MessageBubble rendering to prevent O(N) re-renders
**Learning:** Standard `React.memo` fails when a parent component passes down inline functions (like `onRunCommand` and `onSpeak` in `App.tsx`), causing O(N) re-renders for every single message in the chat list during parent state updates like user typing.
**Action:** When optimizing long lists that receive inline functions as props, always use `React.memo` combined with a custom comparison function that only checks the equality of primitive props.
