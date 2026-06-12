🔒 Fix Arbitrary Code Execution in `calculate` Tool

🎯 **What:**
The `calculate` tool in `src/App.tsx` previously evaluated math expressions using `Function(\`"use strict"; return (${args.expression})\`)()`. This is a severe anti-pattern that allows for arbitrary code execution since the input is un-sandboxed. I replaced this with the `evaluate` function from the `mathjs` library.

⚠️ **Risk:**
If left unfixed, attackers could craft mathematical expressions that bypass the intended functionality and execute arbitrary JavaScript code on the host environment (or the client's browser if the app executes locally), leading to data theft, cross-site scripting (XSS), or potentially full system compromise depending on how the application runs.

🛡️ **Solution:**
- Installed the safe mathematical expression evaluation library, `mathjs` (version ^15.2.0).
- Modified the `executeTool` function to import and use `mathjs`'s `evaluate(args.expression)` function. This acts as a robust sandbox, safely computing expressions while preventing arbitrary JavaScript execution.
- Added necessary typescript type definitions and verified that the change passed the build phase without any syntax or type issues.
- Fixed some build issues related to duplicating imports, types mismatch in `src/Cortex.tsx` and removed a duplicate property from `src/mcp.ts`. Fixed missing type declaration by adding `@capacitor/core`.
