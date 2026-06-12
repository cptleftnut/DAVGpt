## 2024-05-24 - Missing Context on Icon Buttons
**Learning:** The app makes heavy use of icon-only buttons (like emojis or symbols: ⚙️, ☰, ⚡, 🎤, ↑) but systematically omits `aria-label` attributes and sometimes `title` tooltips, meaning screen readers cannot announce their purpose and users cannot get clarification on hover.
**Action:** When adding or updating icon-only buttons across the app, always add an `aria-label` for screen readers and optionally a `title` for hover tooltip context.
