import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { sseClient, type AiImageEvent } from "../lib/sseClient"
import { snapLog } from "../../shared/debug"

export type AiImageStatus =
  | { status: "pending" }
  | { status: "ready"; url: string }
  | { status: "failed" }

type AiImageContextValue = {
  statuses: Map<string, AiImageStatus>
  markPending: (cardId: string) => void
}

const AiImageContext = createContext<AiImageContextValue | null>(null)

export function AiImageEventsProvider({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const [statuses, setStatuses] = useState<Map<string, AiImageStatus>>(() => new Map())
  const pendingRef = useRef<Set<string>>(new Set())

  const markPending = useCallback((cardId: string) => {
    if (disabled) return
    pendingRef.current.add(cardId)
    setStatuses((prev) => {
      const next = new Map(prev)
      next.set(cardId, { status: "pending" })
      return next
    })
  }, [disabled])

  // Poll status for all pending cards (used on SSE reconnect)
  const recheckPending = useCallback(() => {
    for (const cardId of pendingRef.current) {
      fetch(`/api/card/${cardId}/ai-image`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === "ready") {
            pendingRef.current.delete(cardId)
            setStatuses((prev) => {
              const next = new Map(prev)
              next.set(cardId, { status: "ready", url: data.url })
              return next
            })
            snapLog("AI_IMAGE_RECHECK_READY", { cardId, url: data.url })
          } else if (data.status === "failed") {
            pendingRef.current.delete(cardId)
            setStatuses((prev) => {
              const next = new Map(prev)
              next.set(cardId, { status: "failed" })
              return next
            })
          }
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (disabled) return

    const handleEvent = (ev: AiImageEvent) => {
      pendingRef.current.delete(ev.cardId)
      setStatuses((prev) => {
        const next = new Map(prev)
        if (ev.status === "ready" && ev.url) {
          next.set(ev.cardId, { status: "ready", url: ev.url })
        } else {
          next.set(ev.cardId, { status: "failed" })
        }
        return next
      })
      snapLog("AI_IMAGE_SSE", { cardId: ev.cardId, status: ev.status })
    }

    sseClient.subscribe("ai-image-ready", handleEvent)
    sseClient.onReconnect(recheckPending)

    return () => {
      sseClient.unsubscribe("ai-image-ready", handleEvent)
      sseClient.offReconnect(recheckPending)
    }
  }, [recheckPending, disabled])

  return (
    <AiImageContext.Provider value={{ statuses, markPending }}>
      {children}
    </AiImageContext.Provider>
  )
}

export function useAiImageEvents() {
  const ctx = useContext(AiImageContext)
  if (!ctx) throw new Error("useAiImageEvents must be used within AiImageEventsProvider")
  return ctx
}
