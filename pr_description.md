## 💡 What
Added missing `aria-label` and `title` attributes to all icon-only buttons across the main application interface (`src/App.tsx`). This includes the sidebar menu button, settings button, skill clear button, auto-speak toggle button, skills menu button, microphone button, and send button.

## 🎯 Why
Icon-only buttons without accessible labels are completely invisible to screen readers, making the application difficult or impossible for visually impaired users to navigate. Additionally, users without screen readers benefit from the `title` attribute which provides a helpful hover tooltip, clarifying the function of ambiguous icons.

## 📸 Before/After
**Before:**
```tsx
<button className="menu-btn" onClick={onOpenSidebar}>☰</button>
```

**After:**
```tsx
<button className="menu-btn" onClick={onOpenSidebar} aria-label="Open sidebar" title="Open sidebar">☰</button>
```

## ♿ Accessibility
- 100% of icon-only buttons in the main chat interface now have semantic labels for assistive technologies.
- Dynamic buttons (like the microphone toggle) have reactive labels that update based on application state (`Start listening` / `Stop listening`).
- Enhanced visual accessibility by providing native browser hover tooltips via the `title` attribute.
