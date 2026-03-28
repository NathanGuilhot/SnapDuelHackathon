import { useState, useEffect, useCallback, useRef } from "react"
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useConnection, usePeers, useSandbox } from "@fishjam-cloud/react-client"
import { ErrorTap } from "./ErrorModal"
import { snapLog } from "../../shared/debug"
import type { PeerMetadata } from "../../shared/types"
import { VALID_ROOM_CODE } from "../../shared/constants"

const STATUS_COLOR: Record<string, string> = {
  idle: "gray",
  connecting: "yellow",
  connected: "green",
  error: "red",
}

const ADJECTIVES = ["Swift", "Bold", "Sly", "Brave", "Wild", "Keen", "Grim", "Deft"]
const NOUNS = ["Fox", "Hawk", "Wolf", "Bear", "Lynx", "Stag", "Crow", "Hare"]

function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}${noun}`
}

interface JoinRoomProps {
  initialCode?: string
  onBothConnected: () => void
  onBackToLobby?: () => void
}

export default function JoinRoom({ initialCode, onBothConnected, onBackToLobby }: JoinRoomProps) {
  const { getSandboxPeerToken } = useSandbox()
  const { joinRoom, leaveRoom, peerStatus } = useConnection()
  const { remotePeers } = usePeers()

  const [roomCode, setRoomCode] = useState(initialCode ?? "")
  const [playerName] = useState(() => randomName())
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const joinAttempted = useRef(false)
  const peerStatusRef = useRef(peerStatus)
  peerStatusRef.current = peerStatus
  const leaveRoomRef = useRef(leaveRoom)
  leaveRoomRef.current = leaveRoom

  const codeValid = VALID_ROOM_CODE.test(roomCode)

  const doJoin = useCallback(
    async (code: string) => {
      setJoining(true)
      setError(null)
      snapLog("JOIN_ATTEMPT", { roomCode: code, playerName })

      try {
        // Leave any existing room (e.g. auto-created host room)
        leaveRoom()
        // Brief yield so SDK disconnect events settle before reconnecting
        await new Promise((r) => setTimeout(r, 50))
        const token = await getSandboxPeerToken(code, playerName, "conference")
        const metadata: PeerMetadata = { name: playerName, isHost: false }
        await joinRoom({ peerToken: token, peerMetadata: metadata })
        setJoined(true)
        snapLog("JOIN_SUCCESS", { roomCode: code })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed — check your network and try again"
        setError(msg)
        snapLog("JOIN_ERROR", { error: msg, rawType: typeof err, rawValue: String(err), peerStatus: peerStatusRef.current })
      } finally {
        setJoining(false)
      }
    },
    [getSandboxPeerToken, joinRoom, leaveRoom, playerName],
  )

  const doJoinRef = useRef(doJoin)
  doJoinRef.current = doJoin

  // Auto-join when initialCode is provided
  useEffect(() => {
    if (initialCode && VALID_ROOM_CODE.test(initialCode) && !joinAttempted.current) {
      joinAttempted.current = true
      doJoinRef.current(initialCode)
    }
    return () => {
      joinAttempted.current = false
      leaveRoomRef.current()
    }
  }, [initialCode])

  // Watch for host presence
  useEffect(() => {
    if (joined && remotePeers.length > 0) {
      snapLog("HOST_DETECTED", { peerCount: remotePeers.length })
      onBothConnected()
    }
  }, [joined, remotePeers.length, onBothConnected])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (codeValid && !joining) {
      doJoin(roomCode)
    }
  }

  // Auto-join mode: show minimal UI while connecting
  if (initialCode) {
    return (
      <VStack gap="6" p={{ base: "4", sm: "5" }} align="center" w="full" maxW={{ base: "100%", sm: "400px" }}>
        <VStack gap="1">
          <Text fontSize="sm" color="fg.muted" textTransform="uppercase" letterSpacing="0.1em">
            Joining Room
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
            {initialCode}
          </Heading>
        </VStack>

        {error ? (
          <VStack gap="3" w="full" maxW="320px">
            <ErrorTap message={error} />
            <Button
              size="lg"
              colorPalette="orange"
              w="full"
              onClick={() => {
                joinAttempted.current = false
                doJoin(initialCode)
              }}
            >
              Try Again
            </Button>
            {onBackToLobby && (
              <Button
                size="lg"
                variant="outline"
                colorPalette="orange"
                w="full"
                onClick={onBackToLobby}
              >
                Back to Lobby
              </Button>
            )}
          </VStack>
        ) : joined && remotePeers.length === 0 ? (
          <VStack gap="4">
            <VStack gap="2" w="full" maxW="340px">
              <HStack gap="3" justify="center">
                <Spinner size="sm" color="accent" />
                <Text color="fg.muted" fontWeight="500" fontSize="lg">
                  Waiting for host...
                </Text>
              </HStack>
              <Text fontSize="sm" color="fg.muted" textAlign="center" lineHeight="1.5">
                Sit tight — you'll advance when the host is ready.
              </Text>
            </VStack>
            {onBackToLobby && (
              <Button
                size="lg"
                variant="outline"
                colorPalette="orange"
                w="full"
                maxW="320px"
                onClick={onBackToLobby}
              >
                Back to Lobby
              </Button>
            )}
          </VStack>
        ) : joining ? (
          <HStack gap="3">
            <Spinner size="sm" color="accent" />
            <Text color="accent" fontWeight="500" fontSize="lg">
              Joining...
            </Text>
          </HStack>
        ) : null}
      </VStack>
    )
  }

  // Manual join mode: code input + join button
  return (
    <VStack gap="6" p={{ base: "4", sm: "5" }} align="center" w="full" maxW={{ base: "100%", sm: "400px" }}>
      <Box as="form" onSubmit={handleSubmit} w="full">
        <VStack gap="5" w="full">
          <VStack gap="1" w="full">
            <Text fontSize="sm" color="fg.muted" textTransform="uppercase" letterSpacing="0.1em">
              Room Code
            </Text>
            <Text fontSize="xs" color="fg.muted" textAlign="center">
              Enter the code from the host.
            </Text>
            <Input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="ABCD"
              maxLength={4}
              fontFamily="mono"
              fontSize="4xl"
              textAlign="center"
              letterSpacing="0.2em"
              textTransform="uppercase"
              h="80px"
              border="2px solid"
              borderColor={roomCode.length === 4 && !codeValid ? "fg.error" : "border"}
              bg="bg.code"
              color="fg.heading"
              _placeholder={{ color: "fg.muted", opacity: 0.4 }}
              _focus={{
                borderColor: "accent.border",
                outline: "none",
                boxShadow: "0 0 0 1px rgba(242, 116, 5, 0.3)",
              }}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            {roomCode.length === 4 && !codeValid && (
              <Text color="fg.error" fontSize="xs">
                Invalid code characters
              </Text>
            )}
          </VStack>

          <VStack gap="1" w="full">
            <Text fontSize="sm" color="fg.muted" textTransform="uppercase" letterSpacing="0.1em">
              Your Name
            </Text>
            <Text fontSize="lg" color="fg.heading" fontWeight="600">
              {playerName}
            </Text>
          </VStack>

          <Button
            type="submit"
            size="lg"
            colorPalette="orange"
            w="full"
            maxW="320px"
            disabled={!codeValid || joining}
          >
            {joining ? (
              <HStack gap="2">
                <Spinner size="sm" />
                <Text>Joining...</Text>
              </HStack>
            ) : (
              "Join Room"
            )}
          </Button>
        </VStack>
      </Box>

      {peerStatus !== "idle" && (
        <Badge
          colorPalette={STATUS_COLOR[peerStatus] ?? "gray"}
          size="lg"
          textTransform="capitalize"
        >
          {peerStatus}
        </Badge>
      )}

      {error && (
        <VStack gap="3" w="full" maxW="320px">
          <ErrorTap message={error} />
          <Button
            size="lg"
            variant="outline"
            colorPalette="orange"
            w="full"
            onClick={() => doJoin(roomCode)}
          >
            Try Again
          </Button>
          {onBackToLobby && (
            <Button
              size="lg"
              variant="outline"
              colorPalette="orange"
              w="full"
              onClick={onBackToLobby}
            >
              Back to Lobby
            </Button>
          )}
        </VStack>
      )}

      {joined && remotePeers.length === 0 && (
        <VStack gap="2" mt="2" w="full" maxW="340px">
          <HStack gap="3" justify="center">
            <Spinner size="sm" color="accent" />
            <Text color="fg.muted" fontWeight="500" fontSize="lg">
              Waiting for host...
            </Text>
          </HStack>
          <Text fontSize="sm" color="fg.muted" textAlign="center" lineHeight="1.5">
            Sit tight — you'll advance when the host is ready.
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
