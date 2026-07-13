## 2024-05-18 - Main Thread Blocking from Synchronous IO in Render Loop
**Learning:** Using non-lazy state initializations (e.g. `useState(loadFunction())`) and calling synchronous IO functions (like `loadChain()` which reads from `localStorage` and parses JSON) directly within a React component's render loop can block the main thread and cause performance issues on every re-render.
**Action:** Always use lazy state initialization (`useState(() => loadFunction())`) for expensive synchronous operations and reference the existing state variable (e.g., `chain` instead of `loadChain()`) in the JSX to prevent unnecessary IO during the render loop.

## 2024-07-12 - Main Thread Blocking in Chat Render Loop
**Learning:** Similar to the SOMA chain findings, non-lazy state initialization for `localStorage` checks (e.g. `!localStorage.getItem('key')` or `loadIrisProfile()`) in the Chat component causes synchronous disk I/O on every keystroke, leading to input latency.
**Action:** Always use lazy state initialization (`useState(() => loadFunction())`) for any synchronous I/O, especially in components with high re-render frequencies like the main chat interface.
