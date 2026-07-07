💡 What
- Updated `src/Cortex.tsx` to use lazy initialization for state variables like `chain` and `daemonLog` (`useState(() => loadChain())`).
- Replaced inline function calls to `loadChain()` and `loadDaemonLog()` inside the render function's JSX with their respective state variables (`chain` and `daemonLog`).

🎯 Why
- Calling `loadChain()` and `loadDaemonLog()` inside the render block triggers synchronous `localStorage` disk access and `JSON.parse` operations on *every single render*.
- Eager initialization in `useState` (e.g., `useState(loadChain())`) evaluates the expensive function on every render, even though React ignores the value after the initial render.
- These actions block the main thread and severely impact render performance in `Cortex.tsx`.

📊 Impact
- Prevents expensive synchronous disk I/O and JSON parsing on re-renders, significantly improving rendering performance.
- Eliminates O(N) operations during state updates where N is the size of the memory chain/log, ensuring a smoother user experience in the Cortex tab.

🔬 Measurement
- By running `pnpm run build` and `pnpm exec tsc --noEmit`, we can verify that the optimization preserves correct functionality.
- Performance profiling of the `Cortex` component will show zero calls to `loadChain` or `loadDaemonLog` during typical re-renders (only during initial mount or explicit updates).
