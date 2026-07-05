💡 What
Added `aria-label` and `title` attributes to all icon-only buttons in the main chat interface (`src/App.tsx`).

🎯 Why
Icon-only buttons without accessible labels are announced simply as "button" by screen readers, making the interface completely inaccessible to visually impaired users. Adding `aria-label` ensures the purpose of the button is clearly communicated to assistive technologies. The `title` attribute adds an intuitive tooltip for mouse users who might be unsure what an icon means.

📸 Before/After
No visual changes to the UI itself. Screen readers will now announce the buttons correctly:
- ☰ -> "Open sidebar menu"
- ⚙️ -> "Open settings"
- ⚡ -> "Open skills menu"
- 🎤 -> "Start listening" / "Stop listening"
- ↑ -> "Send message"

♿ Accessibility
- Ensured all icon-only buttons in the main view have explicit, context-aware `aria-label` attributes.
- Ensured dynamic states (like the microphone recording state) update their ARIA labels dynamically so screen readers remain synchronized with the application state.
