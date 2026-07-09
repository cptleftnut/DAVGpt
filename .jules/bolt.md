## 2026-07-09 - Lazy Initialization in React state

**Learning:** When a React component loads data from synchronous sources (e.g. `localStorage`) to initialize state variables, passing the function directly (e.g. `useState(loadData())`) will cause that function to execute on every re-render of the component, even though the state only takes the initial value. This can cause severe performance issues (like blocking the main thread) in components with frequent re-renders or expensive fetch operations.

**Action:** Always use lazy state initialization `useState(() => loadData())` for state variables that fetch from synchronous sources, and ensure you use the state variables (not the fetch functions) inside the component's render loop.
