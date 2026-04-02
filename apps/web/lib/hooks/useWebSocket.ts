"use client"

import { useEffect, useState, useCallback } from "react"

const WS_URL = typeof window !== "undefined" 
  ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
  : ""

interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
}

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])

  const connect = useCallback((orgId?: string, userId?: string) => {
    if (!WS_URL) return

    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      setConnected(true)
      // Authenticate
      ws.send(JSON.stringify({ type: "auth", orgId, userId }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setMessages((prev) => [...prev.slice(-50), data]) // Keep last 50
      } catch (e) {
        console.error("Invalid WS message", e)
      }
    }

    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [])

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close()
      setSocket(null)
      setConnected(false)
    }
  }, [socket])

  // Listen for specific event types
  const onEvent = useCallback((type: string, callback: (payload: any) => void) => {
    const handler = (msg: WebSocketMessage) => {
      if (msg.type === type) {
        callback(msg.payload)
      }
    }
    // Could store handlers, but for simplicity just iterate messages
  }, [])

  return {
    connect,
    disconnect,
    connected,
    messages,
    onEvent,
  }
}
