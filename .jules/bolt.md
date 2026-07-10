## 2024-05-30 - Eager localStorage Reads in React State Initialization
**Learning:** Directly initializing state with `localStorage` reads (e.g., `useState(loadData())`) causes synchronous I/O on every re-render, blocking the main thread.
**Action:** Always use lazy state initialization (`useState(() => loadData())`) for expensive or synchronous I/O operations in React components.
