## 2026-06-14 - Memoize MessageBubble parsing
**Learning:** Message blocks were being parsed with RegExp on every render for every message, creating a small but continuous re-render bottleneck when the chat gets long.
**Action:** Use React.memo on MessageBubble and wrap parseBlocks in useMemo to reduce CPU load during chat sessions.
