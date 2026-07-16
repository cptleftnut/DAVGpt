## 2024-05-18 - Main Thread Blocking from Synchronous IO in Render Loop
**Learning:** Using non-lazy state initializations (e.g. `useState(loadFunction())`) and calling synchronous IO functions (like `loadChain()` which reads from `localStorage` and parses JSON) directly within a React component's render loop can block the main thread and cause performance issues on every re-render.
**Action:** Always use lazy state initialization (`useState(() => loadFunction())`) for expensive synchronous operations and reference the existing state variable (e.g., `chain` instead of `loadChain()`) in the JSX to prevent unnecessary IO during the render loop.

## 2024-07-16 - Main Thread Blocking from Synchronous IO in Render Loop for Local Storage
**Learning:** Calling `localStorage.getItem()` directly within a `useState()` initialization block without an arrow function causes a synchronous, blocking I/O operation on every single re-render of the component.
**Action:** Always use lazy state initialization (`useState(() => localStorage.getItem('key'))`) when initializing state from `localStorage` to prevent main thread blocking and unnecessary I/O during the render loop.
