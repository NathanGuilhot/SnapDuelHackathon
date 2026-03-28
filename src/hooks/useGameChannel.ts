import { useEffect, useRef, useCallback } from "react"
import { useConnection, useDataChannel, usePeers } from "@fishjam-cloud/react-client"
import { snapLog } from "../../shared/debug"
import type { GameMessage, GameEnvelope, PeerMetadata } from "../../shared/types"

type MessageHandlers = {
  [K in GameMessage["type"]]?: (msg: Extract<GameMessage, { type: K }>, from: string) => void
}

interface UseGameChannelOptions {
  isHost: boolean
  handlers?: MessageHandlers
}

interface UseGameChannelReturn {
  ready: boolean
  broadcast: (msg: GameMessage) => void
  sendTo: (peerId: string, msg: GameMessage) => void
  localPeerId: string | null
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function useGameChannel(options: UseGameChannelOptions): UseGameChannelReturn {
  const { peerStatus } = useConnection()
  const {
    initializeDataChannel,
    publishData,
    subscribeData,
    dataChannelReady,
  } = useDataChannel()
  const { localPeer } = usePeers<PeerMetadata>()

  const handlersRef = useRef(options.handlers)
  handlersRef.current = options.handlers

  const localPeerIdRef = useRef<string | null>(null)
  localPeerIdRef.current = localPeer?.id ?? null

  // Initialize data channel AFTER connected (silent failure otherwise)
  useEffect(() => {
    if (peerStatus === "connected") {
      snapLog("DATA_CHANNEL_INIT")
      initializeDataChannel()
    }
  }, [peerStatus, initializeDataChannel])

  // Subscribe to incoming messages on the reliable channel
  useEffect(() => {
    if (!dataChannelReady) return

    const unsub = subscribeData((raw: Uint8Array) => {
      try {
        const text = decoder.decode(raw)
        const envelope: GameEnvelope = JSON.parse(text)

        // Self-echo guard
        if (envelope.from === localPeerIdRef.current) return

        // Directed message filtering
        if (envelope.target && envelope.target !== localPeerIdRef.current) return

        const type = envelope.payload.type
        const handler = handlersRef.current?.[type] as
          | ((msg: GameMessage, from: string) => void)
          | undefined
        if (handler) {
          handler(envelope.payload, envelope.from)
        }

        snapLog("DATA_RECV", { type: envelope.payload.type, from: envelope.from })
      } catch (e) {
        snapLog("DATA_CHANNEL_PARSE_ERROR", { error: String(e) })
      }
    }, { reliable: true })

    return unsub
  }, [subscribeData, dataChannelReady])

  const send = useCallback(
    (msg: GameMessage, target?: string) => {
      const peerId = localPeerIdRef.current
      if (!dataChannelReady || !peerId) {
        snapLog("DATA_CHANNEL_NOT_READY", { type: msg.type })
        return
      }

      const envelope: GameEnvelope = {
        from: peerId,
        target,
        ts: Date.now(),
        payload: msg,
      }

      publishData(encoder.encode(JSON.stringify(envelope)), { reliable: true })
      snapLog("DATA_SEND", { type: msg.type, ...(target && { target }) })
    },
    [dataChannelReady, publishData],
  )

  const broadcast = useCallback(
    (msg: GameMessage) => send(msg),
    [send],
  )

  const sendTo = useCallback(
    (peerId: string, msg: GameMessage) => send(msg, peerId),
    [send],
  )

  return {
    ready: dataChannelReady,
    broadcast,
    sendTo,
    localPeerId: localPeer?.id ?? null,
  }
}
