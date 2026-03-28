export type AiImageEvent = {
  cardId: string
  status: "ready" | "failed"
  url?: string
}

type SSEEventMap = {
  "ai-image-ready": AiImageEvent
}

type Callback<T> = (data: T) => void

class SSEClient {
  private source: EventSource | null = null
  private listeners = new Map<string, Set<Callback<unknown>>>()
  private reconnectCallbacks = new Set<() => void>()

  connect() {
    if (this.source) return

    this.source = new EventSource("/api/events")

    this.source.addEventListener("ai-image-ready", (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      const cbs = this.listeners.get("ai-image-ready")
      if (cbs) for (const cb of cbs) cb(data)
    })

    this.source.addEventListener("open", () => {
      for (const cb of this.reconnectCallbacks) cb()
    })
  }

  subscribe<K extends keyof SSEEventMap>(
    event: K,
    callback: Callback<SSEEventMap[K]>,
  ) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(callback as Callback<unknown>)
    this.connect()
  }

  unsubscribe<K extends keyof SSEEventMap>(
    event: K,
    callback: Callback<SSEEventMap[K]>,
  ) {
    this.listeners.get(event)?.delete(callback as Callback<unknown>)
  }

  onReconnect(callback: () => void) {
    this.reconnectCallbacks.add(callback)
  }

  offReconnect(callback: () => void) {
    this.reconnectCallbacks.delete(callback)
  }

  close() {
    this.source?.close()
    this.source = null
    this.listeners.clear()
    this.reconnectCallbacks.clear()
  }
}

export const sseClient = new SSEClient()
