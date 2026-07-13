cat >> .jules/bolt.md << 'EOL'

## 2024-07-12 - Main Thread Blocking in Chat Render Loop
**Learning:** Similar to the SOMA chain findings, non-lazy state initialization for `localStorage` checks (e.g. `!localStorage.getItem('key')` or `loadIrisProfile()`) in the Chat component causes synchronous disk I/O on every keystroke, leading to input latency.
**Action:** Always use lazy state initialization (`useState(() => loadFunction())`) for any synchronous I/O, especially in components with high re-render frequencies like the main chat interface.
EOL
