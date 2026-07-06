💡 What
Memoized the `sessions` sorting operation in `src/Sidebar.tsx` using `useMemo()`.

🎯 Why
The `Sidebar` component re-renders frequently due to local state changes (e.g., typing in the rename input field or switching tabs). Sorting the `sessions` array is an `O(N log N)` operation that was previously running on every single render cycle, creating a performance bottleneck when the sessions list is large.

📊 Impact
Prevents unnecessary re-calculations of the sorted array on every render, significantly reducing CPU overhead and preventing UI lag during state updates within the sidebar.

🔬 Measurement
Verify that switching tabs or typing into the rename input in the sidebar feels instantaneous, without any perceivable lag, even with a large number of sessions loaded.
