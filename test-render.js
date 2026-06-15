const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'src/MessageBubble.tsx')
let content = fs.readFileSync(file, 'utf8')
content = content.replace('export default function MessageBubble', 'export default function MessageBubble({ content, role, onRunCommand, connState, onSpeak, speaking }: Props) {\n  console.log("Render MessageBubble");\n  if (role === \'user\') {')

content = content.replace('export default function MessageBubble({ content, role, onRunCommand, connState, onSpeak, speaking }: Props) {\n  console.log("Render MessageBubble");', 'export default function MessageBubble')
// Just testing visually or conceptually: we know React re-renders children when parent re-renders.
