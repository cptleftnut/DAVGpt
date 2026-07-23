## 2024-05-18 - Main Thread Blocking from Synchronous IO in Render Loop
**Learning:** Using non-lazy state initializations (e.g. `useState(loadFunction())`) and calling synchronous IO functions (like `loadChain()` which reads from `localStorage` and parses JSON) directly within a React component's render loop can block the main thread and cause performance issues on every re-render.
**Action:** Always use lazy state initialization (`useState(() => loadFunction())`) for expensive synchronous operations and reference the existing state variable (e.g., `chain` instead of `loadChain()`) in the JSX to prevent unnecessary IO during the render loop.

## 2024-05-24 - Unused Expensive Variable Removals
**Learning:** Removing unused variables that trigger expensive synchronous IO (e.g. `loadIrisProfile()` reading from `localStorage`) directly in the render loop significantly improves component re-render performance, especially for components that re-render frequently (e.g. typing in a chat input).
**Action:** Always scan for and remove unused variables that invoke expensive functions inside frequently re-rendered components, and ensure state initializations requiring IO are lazy.
