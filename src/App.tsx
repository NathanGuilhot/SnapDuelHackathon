import { useState, useCallback, useEffect } from "react"
import {
  Box,
  Button,
  Heading,
  Image,
  Spinner,
  Text,
  VStack,
  HStack,
} from "@chakra-ui/react"
import CameraCapture from "./components/CameraCapture"
import CardBattle from "./components/Card"
import CreateRoom from "./components/CreateRoom"
import JoinRoom from "./components/JoinRoom"
import { preprocessImage, cropToSquare } from "./lib/imageProcessing"
import { snapLog } from "../shared/debug.ts"
import { useGameChannel } from "./hooks/useGameChannel"
import type { Card, GameMessage } from "../shared/types.ts"

type Screen = "lobby" | "join" | "card-building"

function extractRoomCode(): string | null {
  const path = window.location.pathname.replace(/^\//, "")
  if (/^[A-HJ-NP-Z]{4}$/.test(path)) return path
  return null
}

function App() {
  // Screen & role management
  const [joinCode, setJoinCode] = useState<string | null>(() => extractRoomCode())
  const [isHost, setIsHost] = useState(() => !extractRoomCode())
  const [screen, setScreen] = useState<Screen>(() =>
    extractRoomCode() ? "join" : "lobby",
  )
  const [isSolo, setIsSolo] = useState(false)

  // Card generation state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [geminiBlob, setGeminiBlob] = useState<Blob | null>(null)
  const [cardBlob, setCardBlob] = useState<Blob | null>(null)
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Game protocol — data channel messaging
  const gameChannel = useGameChannel({
    isHost,
    handlers: {
      PLAYER_READY: (msg: GameMessage & { type: "PLAYER_READY" }, from) =>
        snapLog("PLAYER_READY_RECV", { from, nickname: msg.nickname }),
      HAND_READY: (msg: GameMessage & { type: "HAND_READY" }, from) =>
        snapLog("HAND_READY_RECV", { from, cardCount: msg.cardCount }),
      CARD_PICKED: (msg: GameMessage & { type: "CARD_PICKED" }, from) =>
        snapLog("CARD_PICKED_RECV", { from, cardIndex: msg.cardIndex }),
      ROUND_REVEAL: (msg: GameMessage & { type: "ROUND_REVEAL" }) =>
        snapLog("ROUND_REVEAL_RECV", { round: msg.result.round }),
      MATCH_RESULT: (msg: GameMessage & { type: "MATCH_RESULT" }) =>
        snapLog("MATCH_RESULT_RECV", { winner: msg.winner }),
      PHASE_CHANGE: (msg: GameMessage & { type: "PHASE_CHANGE" }) =>
        snapLog("PHASE_CHANGE_RECV", { phase: msg.phase }),
    },
  })

  // Auto-send PLAYER_READY when data channel is up — serves as handshake + e2e test
  useEffect(() => {
    if (gameChannel.ready && gameChannel.localPeerId && !isSolo) {
      gameChannel.broadcast({
        type: "PLAYER_READY",
        playerId: gameChannel.localPeerId,
        nickname: isHost ? "host" : "guest",
      })
    }
  }, [gameChannel.ready, gameChannel.localPeerId, isSolo]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpponentJoined = useCallback(() => {
    setScreen("card-building")
    window.history.replaceState({}, "", "/")
    snapLog("OPPONENT_JOINED_TRANSITION")
  }, [])

  const handleJoinWithCode = useCallback((code: string) => {
    setJoinCode(code)
    setIsHost(false)
    setScreen("join")
  }, [])

  const handleBothConnected = useCallback(() => {
    setScreen("card-building")
    window.history.replaceState({}, "", "/")
    snapLog("BOTH_CONNECTED_TRANSITION", { isHost })
  }, [isHost])

  async function generateCard(resized: Blob, cropped: Blob) {
    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append("resized", resized, "resized.jpg")
      form.append("cropped", cropped, "cropped.jpg")

      const res = await fetch("/api/generate-card", {
        method: "POST",
        body: form,
      })

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

      const data: Card = await res.json()
      setCard(data)
      snapLog("CARD_RECEIVED", { id: data.id, name: data.name })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      snapLog("GENERATE_ERROR", { error: msg })
    } finally {
      setLoading(false)
    }
  }

  async function handleCapture(file: File) {
    try {
      const originalKB = Math.round(file.size / 1024)

      const [resized, cropped] = await Promise.all([
        preprocessImage(file),
        cropToSquare(file),
      ])

      const resizedKB = Math.round(resized.size / 1024)
      const croppedKB = Math.round(cropped.size / 1024)

      snapLog("PREPROCESS", { originalKB, resizedKB, croppedKB })

      setGeminiBlob(resized)
      setCardBlob(cropped)
      setPreviewUrl(URL.createObjectURL(resized))

      generateCard(resized, cropped)
    } catch (err) {
      snapLog("PREPROCESS_ERROR", { error: String(err) })
    }
  }

  function handleRetry() {
    if (geminiBlob && cardBlob) {
      generateCard(geminiBlob, cardBlob)
    }
  }

  function handleReset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setGeminiBlob(null)
    setCardBlob(null)
    setCard(null)
    setLoading(false)
    setError(null)
    if (isSolo) {
      setIsSolo(false)
      setScreen("lobby")
    }
  }

  const hasCapture =
    geminiBlob !== null && cardBlob !== null && previewUrl !== null

  return (
    <Box
      as="main"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      position="relative"
      p={{ base: "6 4", lg: "8 5" }}
      gap="4"
    >
      <VStack gap="1" my={{ base: "6", lg: "10" }}>
        <Heading
          as="h1"
          fontSize={{ base: "5xl", lg: "7xl" }}
          fontWeight="800"
          fontFamily="heading"
          letterSpacing="-0.02em"
          color="fg.heading"
          textShadow="0 0 40px rgba(242, 116, 5, 0.3)"
          lineHeight="1"
        >
          SnapDuel
        </Heading>
        <Text
          fontSize={{ base: "sm", lg: "md" }}
          color="fg.muted"
          fontStyle="italic"
          letterSpacing="0.05em"
        >
          Snap. Forge. Fight.
        </Text>
      </VStack>

      {/* Lobby — auto-creates room, waits for opponent */}
      {screen === "lobby" && (
        <>
          <Button
            position="absolute"
            top={{ base: "4", lg: "6" }}
            right={{ base: "4", lg: "6" }}
            size="sm"
            variant="outline"
            colorPalette="orange"
            onClick={() => {
              setIsSolo(true)
              setScreen("card-building")
            }}
          >
            Solo mode
          </Button>
          <CreateRoom
            onOpponentJoined={handleOpponentJoined}
            onJoinWithCode={handleJoinWithCode}
          />
        </>
      )}

      {/* Guest joining — auto-join from URL or modal code entry */}
      {screen === "join" && (
        <JoinRoom
          initialCode={joinCode ?? undefined}
          onBothConnected={handleBothConnected}
        />
      )}

      {/* Card building screen */}
      {screen === "card-building" && (
        <>
          {hasCapture ? (
            <VStack gap="4" p="5" align="center" w="full" maxW="400px">
              {card ? (
                <CardBattle card={card} />
              ) : loading ? (
                <>
                  <Image
                    src={previewUrl}
                    alt="Captured photo"
                    w="full"
                    borderRadius="xl"
                    border="2px solid"
                    borderColor="accent"
                    objectFit="cover"
                    aspectRatio="1/1"
                    shadow="0 0 20px rgba(242, 116, 5, 0.2)"
                  />
                  <HStack gap="3">
                    <Spinner size="sm" color="accent" />
                    <Text color="accent" fontWeight="500" fontSize="lg">
                      Generating card...
                    </Text>
                  </HStack>
                </>
              ) : error ? (
                <>
                  <Image
                    src={previewUrl}
                    alt="Captured photo"
                    w="full"
                    borderRadius="xl"
                    border="2px solid"
                    borderColor="border"
                    objectFit="cover"
                    aspectRatio="1/1"
                    shadow="0 0 20px rgba(242, 116, 5, 0.1)"
                  />
                  <Text color="fg.error" fontWeight="500" fontSize="md">
                    {error}
                  </Text>
                  <Button
                    size="lg"
                    colorPalette="orange"
                    w="full"
                    maxW="320px"
                    onClick={handleRetry}
                  >
                    Retry
                  </Button>
                </>
              ) : null}
              <Button
                size="lg"
                variant="outline"
                colorPalette="teal"
                w="full"
                maxW="320px"
                onClick={handleReset}
              >
                Start Over
              </Button>
            </VStack>
          ) : (
            <CameraCapture onCapture={handleCapture} />
          )}
        </>
      )}
    </Box>
  )
}

export default App
