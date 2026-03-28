import { useState, useEffect, useRef, useCallback } from "react"
import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Check, Copy } from "lucide-react"
import { useConnection, usePeers, useSandbox } from "@fishjam-cloud/react-client"
import NiceModal from "@ebay/nice-modal-react"
import { ErrorTap } from "./ErrorModal"
import QRCode from "qrcode"
import { snapLog } from "../../shared/debug"
import { JoinModal } from "./JoinModal"
import type { PeerMetadata } from "../../shared/types"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ" // no I/O to avoid confusion

function generateRoomCode(): string {
  return Array.from(
    { length: 4 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("")
}

interface CreateRoomProps {
  onOpponentJoined: () => void
  onJoinWithCode: (code: string) => void
}

export default function CreateRoom({
  onOpponentJoined,
  onJoinWithCode,
}: CreateRoomProps) {
  const { getSandboxPeerToken } = useSandbox()
  const { joinRoom, leaveRoom, peerStatus } = useConnection()
  const { remotePeers } = usePeers()

  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shareableUrl = roomCode
    ? `${window.location.origin}/${roomCode}`
    : null

  const copyShareableUrl = useCallback(async () => {
    if (!shareableUrl) return
    try {
      await navigator.clipboard.writeText(shareableUrl)
      if (copyFeedbackTimeoutRef.current !== null) {
        clearTimeout(copyFeedbackTimeoutRef.current)
      }
      setUrlCopied(true)
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setUrlCopied(false)
        copyFeedbackTimeoutRef.current = null
      }, 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      snapLog("CLIPBOARD_ERROR", { error: msg })
    }
  }, [shareableUrl])

  useEffect(() => () => {
    if (copyFeedbackTimeoutRef.current !== null) {
      clearTimeout(copyFeedbackTimeoutRef.current)
    }
  }, [])

  const createRoom = useCallback(async () => {
    setError(null)
    const code = generateRoomCode()
    snapLog("ROOM_CREATE", { roomCode: code })

    try {
      leaveRoom()
      await new Promise((r) => setTimeout(r, 50))
      const token = await getSandboxPeerToken(code, "host", "conference")
      const metadata: PeerMetadata = { name: "host", isHost: true }
      await joinRoom({ peerToken: token, peerMetadata: metadata })
      setRoomCode(code)
      snapLog("ROOM_JOINED", { roomCode: code })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed — check your network and try again"
      setError(msg)
      snapLog("ROOM_ERROR", { error: msg, rawType: typeof err, rawValue: String(err), peerStatus })
    }
  }, [getSandboxPeerToken, joinRoom, leaveRoom, peerStatus])

  // Auto-create room on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      void createRoom()
    }, 0)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Generate QR code when shareable URL is available
  useEffect(() => {
    if (!shareableUrl) return
    QRCode.toDataURL(shareableUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#e8f0ed", light: "#011a1a" },
    }).then(setQrDataUrl)
  }, [shareableUrl])

  // Watch for opponent joining
  useEffect(() => {
    if (remotePeers.length > 0 && roomCode) {
      snapLog("OPPONENT_JOINED", { roomCode, peerCount: remotePeers.length })
      onOpponentJoined()
    }
  }, [remotePeers.length, roomCode, onOpponentJoined])

  // Still connecting — show loading state
  if (!roomCode) {
    return (
      <VStack gap="6" p={{ base: "4", sm: "5" }} align="center" w="full" maxW={{ base: "100%", sm: "400px" }}>
        {error ? (
          <VStack gap="3" w="full" maxW="320px">
            <ErrorTap message={error} />
            <Button
              size="lg"
              colorPalette="orange"
              w="full"
              onClick={() => createRoom()}
            >
              Try Again
            </Button>
          </VStack>
        ) : (
          <HStack gap="3">
            <Spinner size="sm" color="accent" />
            <Text color="accent" fontWeight="500" fontSize="lg">
              Creating room...
            </Text>
          </HStack>
        )}
      </VStack>
    )
  }

  // Room created — show lobby
  return (
    <VStack gap="6" p={{ base: "4", sm: "5" }} align="center" w="full" maxW={{ base: "100%", sm: "400px" }}>
      {/* Room code */}
      <VStack gap="1">
        <Text fontSize="sm" color="fg.muted" textTransform="uppercase" letterSpacing="0.1em">
          Room Code
        </Text>
        <Heading
          mt="2"
          as="h2"
          fontSize="6xl"
          fontWeight="800"
          fontFamily="mono"
          letterSpacing="0.15em"
          color="fg.heading"
          textShadow="0 0 30px rgba(242, 116, 5, 0.4)"
        >
          {roomCode}
        </Heading>
      </VStack>

      {/* QR code */}
      {qrDataUrl && (
        <Box
          p="3"
          borderRadius="xl"
          border="2px solid"
          borderColor="border"
          bg="bg.subtle"
        >
          <Image
            src={qrDataUrl}
            alt={`QR code for room ${roomCode}`}
            w={{ base: "180px", sm: "200px" }}
            h={{ base: "180px", sm: "200px" }}
            borderRadius="md"
          />
        </Box>
      )}

      {shareableUrl && (
        <Box
          role="button"
          tabIndex={0}
          w="full"
          px="4"
          py="3"
          minH="12"
          borderRadius="lg"
          bg="bg.code"
          border="1px solid"
          borderColor={urlCopied ? "accent.border" : "border"}
          cursor="pointer"
          onClick={() => void copyShareableUrl()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              void copyShareableUrl()
            }
          }}
          aria-label={urlCopied ? "Link copied" : "Copy room link"}
          _hover={{ borderColor: "accent.border" }}
          _active={{ bg: "bg.subtle" }}
          _focusVisible={{ outline: "2px solid", outlineColor: "accent.border", outlineOffset: "2px" }}
          transition="border-color 0.2s, background 0.15s"
          style={{ touchAction: "manipulation" }}
        >
          <HStack align="flex-start" gap="3" w="full">
            <Text
              flex="1"
              minW={0}
              fontSize="sm"
              fontFamily="mono"
              color="fg"
              wordBreak="break-all"
              textAlign="left"
            >
              {shareableUrl}
            </Text>
            <Box
              flexShrink={0}
              mt="0.5"
              color={urlCopied ? "accent" : "fg.muted"}
              display="flex"
              aria-hidden
            >
              {urlCopied ? (
                <Check size={20} strokeWidth={2} />
              ) : (
                <Copy size={20} strokeWidth={2} />
              )}
            </Box>
          </HStack>
        </Box>
      )}

      <Text fontSize="xs" color="fg.muted" textAlign="center" px="2" maxW="360px" lineHeight="1.5">
        Share the link or QR code to invite your friend.
      </Text>

      {/* Waiting indicator */}
      <HStack gap="3" mt="2">
        <Spinner size="sm" color="accent" />
        <Text color="fg.muted" fontWeight="500" fontSize="lg">
          Waiting for opponent...
        </Text>
      </HStack>

      {/* Join existing room */}
      <Button
        variant="plain"
        size="md"
        color="fg.muted"
        fontWeight="400"
        fontSize={{ base: "md", lg: "sm" }}
        textDecoration="underline"
        textUnderlineOffset="3px"
        _hover={{ color: "fg.heading" }}
        mt="2"
        px="4"
        onClick={() =>
          NiceModal.show(JoinModal, {
            onJoin: (code: string) => onJoinWithCode(code),
          })
        }
      >
        Have a code? Join a room
      </Button>
    </VStack>
  )
}
