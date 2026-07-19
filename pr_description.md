💡 What
Added explicit `aria-label` and `title` attributes to all primary icon-only buttons in the main chat application (`src/App.tsx`) and the sidebar component (`src/Sidebar.tsx`).

🎯 Why
Icon-only buttons without accessible labels fail to provide context to screen reader users and lack tooltips for mouse users, diminishing the overall usability and accessibility of the interface. This enhancement ensures all interactive elements are properly identified.

📸 Before/After
Before:
`<button className="menu-btn">☰</button>`
After:
`<button className="menu-btn" aria-label="Open menu" title="Open menu">☰</button>`

*(Frontend verification video provided below via Playwright)*

♿ Accessibility
Improves screen reader compliance by supplying meaningful `aria-label`s and benefits all users by offering `title` tooltips on hover for icon buttons like settings, MCP servers, send, microphone, sidebar toggle, and session actions (rename/delete).
