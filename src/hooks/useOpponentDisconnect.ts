import { useCallback, useEffect, useRef, useState } from "react"
import { snapLog } from "../../shared/debug.ts"

export function useOpponentDisconnect(
  remotePeersLength: number,
  isInMatch: boolean,
): { disconnected: boolean; resetDisconnect: () => void } {
  const [disconnected, setDisconnected] = useState(false)
  const hadOpponent = useRef(false)
  const resetDisconnect = useCallback(() => setDisconnected(false), [])

  useEffect(() => {
    if (!isInMatch) {
      hadOpponent.current = false
    }
  }, [isInMatch])

  useEffect(() => {
    let disconnectTimer: ReturnType<typeof setTimeout> | undefined

    if (remotePeersLength > 0) {
      hadOpponent.current = true
      setDisconnected(false)
    } else if (hadOpponent.current && isInMatch) {
      disconnectTimer = setTimeout(() => {
        setDisconnected(true)
        snapLog("OPPONENT_DISCONNECTED")
      }, 3000)
    }

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer)
    }
  }, [remotePeersLength, isInMatch])

  return { disconnected, resetDisconnect }
}
