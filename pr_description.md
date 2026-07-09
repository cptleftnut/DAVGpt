💡 What
- Updated `src/Cortex.tsx` to use lazy state initialization (`useState(() => loadFunction())`) for data that is synchronously loaded from `localStorage` (`loadChain`, `loadDaemonLog`, `loadGroundTasks`, `loadIrisProfile`, and `getLastDaemonRun`).
- Updated the JSX to reference the state variables (`chain`, `daemonLog`) instead of calling the fetch functions inside the render loop.

🎯 Why
- Before this change, the `Cortex` component was calling expensive synchronous functions like `loadChain()` and `loadDaemonLog()` inside the render function and as arguments to `useState()`. This caused these expensive synchronous read operations to execute *on every single render* of the component (e.g., during input typing or any other state update), blocking the main thread.
- `useState(loadData())` always evaluates `loadData()` immediately, even though the result is only used on the first render. `useState(() => loadData())` delays the execution until it is actually needed.

📊 Impact
- Reduces main thread blocking significantly. Synchronous `localStorage` parsing and array manipulation now only occur on component mount or explicit refresh, rather than continuously during typing or state updates.
- Number of `loadChain` executions reduced from O(renders) to O(refresh).

🔬 Measurement
- Run the app, go to the "CORTEX" tab. Before the fix, the `Soma` blocks search input would feel slightly sluggish because every keystroke triggered a state update and caused `loadChain()` to be evaluated multiple times. After the fix, typing should feel instantly responsive.
