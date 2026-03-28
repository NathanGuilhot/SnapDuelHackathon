import { useState, useEffect, useRef } from "react"
import { snapLog } from "../../shared/debug"

export type AiImageState = "idle" | "generating" | "ready" | "failed"

export function useAiImage(cardId: string | null): {
  aiImageUrl: string | null
  aiImageState: AiImageState
} {
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null)
  const [aiImageState, setAiImageState] = useState<AiImageState>("idle")
  const doneRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!cardId || doneRef.current.has(cardId)) return

    setAiImageState("generating")

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/card/${cardId}/ai-image`)
        const data = await res.json()

        if (data.status === "ready") {
          clearInterval(interval)
          doneRef.current.add(cardId)
          setAiImageUrl(data.url)
          setAiImageState("ready")
          snapLog("AI_IMAGE_READY", { cardId, url: data.url })
        } else if (data.status === "failed" || data.status === "unknown") {
          clearInterval(interval)
          doneRef.current.add(cardId)
          setAiImageState("failed")
          snapLog("AI_IMAGE_FAILED", { cardId })
        }
      } catch {
        // Network error — keep polling
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [cardId])

  return { aiImageUrl, aiImageState }
}
