## 2026-06-26 - Add missing ARIA labels to icon-only buttons
**Learning:** In a React/Vite/Capacitor application, it's common to find icon-only buttons without proper ARIA labels. This is critical for screen reader users to understand the purpose of elements that rely solely on visual cues (like emoji or generic symbols).
**Action:** Whenever introducing or reviewing icon-only buttons (e.g., menu toggles, mic buttons, settings buttons), I will ensure they have an `aria-label` or `title` that describes their function.
