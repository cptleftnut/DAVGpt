import { useState, useRef, useCallback } from 'react'

export type ConnState = 'disconnected' | 'connecting' | 'connected' | 'error'

const WS_URL = 'ws://localhost:7681'

export function useTerminalBridge() {
  const [connState, setConnState] = useState<ConnState>('disconnected')
  const [output, setOutput] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef<((data: string) => void)[]>([])

  const append = (text: string) => {
    setOutput(prev => prev + text)
    listenersRef.current.forEach(fn => fn(text))
  }

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setConnState('connecting')
    append('\r\n🔌 Connecting to Termux bridge...\r\n')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws
    ws.onopen = () => { setConnState('connected'); append('✅ Connected!\r\n') }
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'ready') append(msg.msg)
        else if (msg.type === 'output') append(msg.data)
        else if (msg.type === 'exit') { append(`\r\n[Exit: ${msg.code}]\r\n`); setConnState('disconnected') }
      } catch { append(e.data) }
    }
    ws.onclose = () => { setConnState('disconnected'); append('\r\n🔴 Disconnected\r\n') }
    ws.onerror = () => {
      setConnState('error')
      append('\r\n❌ Cannot connect. Run: node ~/davgpt-bridge.js in Termux\r\n')
    }
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null; setConnState('disconnected')
  }, [])

  const sendCommand = useCallback((cmd: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: cmd + '\n' }))
      return true
    }
    return false
  }, [])

  const onOutput = useCallback((fn: (data: string) => void) => {
    listenersRef.current.push(fn)
    return () => { listenersRef.current = listenersRef.current.filter(f => f !== fn) }
  }, [])

  return { connState, output, setOutput, connect, disconnect, sendCommand, onOutput }
}
