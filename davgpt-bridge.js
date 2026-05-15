#!/data/data/com.termux/files/usr/bin/node
// DAVGpt Terminal Bridge - WebSocket Server
// Run this in Termux: node ~/davgpt-bridge.js
// Keeps running in background - DAVGpt connects via ws://localhost:7681

const { execFile, spawn } = require('child_process')
const http = require('http')
const crypto = require('crypto')

const PORT = 7681
const SHELL = process.env.SHELL || '/data/data/com.termux/files/usr/bin/bash'

// Minimal WebSocket server (no external deps)
const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
    res.end('pong')
    return
  }
  res.writeHead(404)
  res.end()
})

function wsHandshake(req, socket) {
  const key = req.headers['sec-websocket-key']
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64')
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n` +
    'Access-Control-Allow-Origin: *\r\n\r\n'
  )
}

function decodeFrame(buf) {
  if (buf.length < 2) return null
  const masked = !!(buf[1] & 0x80)
  let len = buf[1] & 0x7f
  let offset = 2
  if (len === 126) { len = buf.readUInt16BE(2); offset = 4 }
  else if (len === 127) { len = Number(buf.readBigUInt64BE(2)); offset = 10 }
  if (buf.length < offset + (masked ? 4 : 0) + len) return null
  let payload
  if (masked) {
    const mask = buf.slice(offset, offset + 4)
    payload = Buffer.alloc(len)
    for (let i = 0; i < len; i++) payload[i] = buf[offset + 4 + i] ^ mask[i % 4]
  } else {
    payload = buf.slice(offset, offset + len)
  }
  return payload.toString('utf8')
}

function encodeFrame(msg) {
  const payload = Buffer.from(msg, 'utf8')
  const len = payload.length
  let header
  if (len < 126) {
    header = Buffer.from([0x81, len])
  } else if (len < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x81; header[1] = 126
    header.writeUInt16BE(len, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x81; header[1] = 127
    header.writeBigUInt64BE(BigInt(len), 2)
  }
  return Buffer.concat([header, payload])
}

server.on('upgrade', (req, socket) => {
  wsHandshake(req, socket)
  console.log('[Bridge] Client connected')

  // Spawn a shell session per client
  const shell = spawn(SHELL, [], {
    env: { ...process.env, TERM: 'xterm-256color', HOME: process.env.HOME },
    cwd: process.env.HOME,
  })

  const send = (data) => {
    try { socket.write(encodeFrame(JSON.stringify(data))) } catch (_) {}
  }

  send({ type: 'ready', msg: `\r\n🟢 DAVGpt Terminal Bridge v1.0\r\nShell: ${SHELL}\r\n\r\n` })

  shell.stdout.on('data', d => send({ type: 'output', data: d.toString() }))
  shell.stderr.on('data', d => send({ type: 'output', data: d.toString() }))
  shell.on('exit', (code) => {
    send({ type: 'exit', code })
    socket.destroy()
  })

  let buf = Buffer.alloc(0)
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk])
    const msg = decodeFrame(buf)
    if (msg === null) return
    buf = Buffer.alloc(0)
    try {
      const parsed = JSON.parse(msg)
      if (parsed.type === 'input') shell.stdin.write(parsed.data)
      if (parsed.type === 'resize') {} // pty resize - skip without node-pty
    } catch (_) {
      shell.stdin.write(msg)
    }
  })

  socket.on('close', () => { shell.kill(); console.log('[Bridge] Client disconnected') })
  socket.on('error', () => shell.kill())
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[DAVGpt Bridge] Running on ws://localhost:${PORT}`)
  console.log(`[DAVGpt Bridge] Open DAVGpt → Terminal tab to connect`)
})
