// soma.ts — SHA-256 blockchain memory chain

export interface SomaBlock {
  index: number
  timestamp: number
  type: 'fact' | 'skill' | 'preference' | 'context' | 'error' | 'success' | 'monologue'
  content: string
  tags: string[]
  source: 'user' | 'agent' | 'daemon' | 'system'
  hash: string
  prevHash: string
}

const SOMA_KEY = 'davgpt_soma_chain'
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

async function sha256(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function computeHash(block: Omit<SomaBlock, 'hash'>): Promise<string> {
  const str = `${block.index}${block.timestamp}${block.type}${block.content}${block.prevHash}`
  return sha256(str)
}

export function loadChain(): SomaBlock[] {
  try { return JSON.parse(localStorage.getItem(SOMA_KEY) || '[]') } catch { return [] }
}

export function saveChain(chain: SomaBlock[]) {
  localStorage.setItem(SOMA_KEY, JSON.stringify(chain))
}

export async function addBlock(entry: {
  type: SomaBlock['type']
  content: string
  tags?: string[]
  source?: SomaBlock['source']
}): Promise<SomaBlock> {
  const chain = loadChain()
  const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS_HASH
  const partial: Omit<SomaBlock, 'hash'> = {
    index: chain.length,
    timestamp: Date.now(),
    type: entry.type,
    content: entry.content,
    tags: entry.tags || [],
    source: entry.source || 'system',
    prevHash,
  }
  const hash = await computeHash(partial)
  const block: SomaBlock = { ...partial, hash }
  chain.push(block)
  saveChain(chain)
  return block
}

export async function verifyChain(): Promise<{ valid: boolean; brokenAt?: number }> {
  const chain = loadChain()
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i]
    const expectedPrev = i === 0 ? GENESIS_HASH : chain[i - 1].hash
    if (block.prevHash !== expectedPrev) return { valid: false, brokenAt: i }
    const { hash, ...partial } = block
    const expected = await computeHash(partial)
    if (expected !== hash) return { valid: false, brokenAt: i }
  }
  return { valid: true }
}

export function searchChain(query: string): SomaBlock[] {
  const chain = loadChain()
  const q = query.toLowerCase()
  return chain.filter(b =>
    b.content.toLowerCase().includes(q) ||
    b.tags.some(t => t.toLowerCase().includes(q)) ||
    b.type.includes(q)
  ).slice(-20)
}

export function getChainContext(limit = 8): string {
  const chain = loadChain()
  if (chain.length === 0) return ''
  const recent = chain.slice(-limit)
  return '\n\nMEMORY (SOMA chain):\n' + recent.map(b =>
    `[${b.type}] ${b.content}`
  ).join('\n')
}
