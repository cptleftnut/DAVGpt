## 2024-05-19 - Memoize session sorting in Sidebar
**Learning:** Found a performance bottleneck where sorting a potentially large array of sessions was occurring inside the render loop of the Sidebar component. Given that user actions like typing in an input (`renameVal`) trigger frequent re-renders, the O(N log N) sorting was unnecessarily re-calculated on each keystroke.
**Action:** Always wrap expensive list operations (like sorting or complex mapping) inside `useMemo` when they are inside a component that re-renders frequently due to separate local state changes (e.g., controlled inputs).
