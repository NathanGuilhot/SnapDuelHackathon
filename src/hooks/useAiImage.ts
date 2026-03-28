import { useState, useEffect } from "react"
import { snapLog } from "../../shared/debug"

export type AiImageState = "idle" | "generating" | "ready" | "failed"

export function useAiImage(cardId: string | null): {
  aiImageUrl: string | null
  aiImageState: AiImageState
} {
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null)
  const [aiImageState, setAiImageState] = useState<AiImageState>("idle")

  useEffect(() => {
    const controller = new AbortController()
    const resetTimer = setTimeout(() => {
      setAiImageUrl(null)
      setAiImageState(cardId ? "generating" : "idle")
    }, 0)

    if (!cardId) {
      return () => {
        clearTimeout(resetTimer)
        controller.abort()
      }
    }

    fetch(`/api/card/${cardId}/ai-image`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ready") {
          setAiImageUrl(data.url)
          setAiImageState("ready")
          snapLog("AI_IMAGE_READY", { cardId, url: data.url })
        } else {
          setAiImageState("failed")
          snapLog("AI_IMAGE_FAILED", { cardId })
        }
      })
      .catch(() => {
        // Aborted or network error
      })

    return () => {
      clearTimeout(resetTimer)
      controller.abort()
    }
  }, [cardId])

  return { aiImageUrl, aiImageState }
}
