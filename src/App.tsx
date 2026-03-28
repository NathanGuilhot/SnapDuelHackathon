import { useState, useCallback, useEffect, useRef } from "react"
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
import { useConnection, usePeers } from "@fishjam-cloud/react-client"
import CameraCapture from "./components/CameraCapture"
import CardBattle from "./components/Card"
import BattleArena from "./components/BattleArena"
import CreateRoom from "./components/CreateRoom"
import { ErrorTap } from "./components/ErrorModal"
import MyCards from "./components/MyCards"
import JoinRoom from "./components/JoinRoom"
import { preprocessImage, cropToSquare } from "./lib/imageProcessing"
import { saveHand, loadHand, clearHand } from "./lib/handStorage"
import { generateSoloOpponent } from "./lib/soloOpponent"
import { snapLog } from "../shared/debug.ts"
import { useGameChannel } from "./hooks/useGameChannel"
import { useAiImage } from "./hooks/useAiImage"
import { resolveBattle } from "../shared/battle.ts"
import type { Card, GameMessage, PeerMetadata, RoundResult } from "../shared/types.ts"

type Screen =
  | "lobby"
  | "join"
  | "card-building"
  | "picking"
  | "reveal"
  | "match-end"
  | "my-cards"

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

  // Hand & battle state
  const [hand, setHand] = useState<Card[]>(() => loadHand())
  const [handReady, setHandReady] = useState(false)
  const [opponentCards, setOpponentCards] = useState<Card[]>([])
  const [opponentReady, setOpponentReady] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [opponentPickedIndex, setOpponentPickedIndex] = useState<number | null>(null)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [matchWinner, setMatchWinner] = useState<"A" | "B" | "draw" | null>(null)
  const [disconnected, setDisconnected] = useState(false)

  // AI illustration polling
  const { aiImageUrl, aiImageState } = useAiImage(card?.id ?? null)

  // Track if opponent was ever connected (to detect disconnect vs never-connected)
  const hadOpponent = useRef(false)
  const { leaveRoom } = useConnection()
  const { remotePeers } = usePeers<PeerMetadata>()

  // Game protocol — data channel messaging
  const gameChannel = useGameChannel({
    isHost,
    handlers: {
      PLAYER_READY: (msg: GameMessage & { type: "PLAYER_READY" }, from) =>
        snapLog("PLAYER_READY_RECV", { from, nickname: msg.nickname }),

      HAND_READY: (msg: GameMessage & { type: "HAND_READY" }, from) => {
        snapLog("HAND_READY_RECV", { from, cardCount: msg.cardCount })
        setOpponentCards(msg.cards)
        setOpponentReady(true)
      },

      CARD_PICKED: (msg: GameMessage & { type: "CARD_PICKED" }, from) => {
        snapLog("CARD_PICKED_RECV", { from, cardIndex: msg.cardIndex })
        setOpponentPickedIndex(msg.cardIndex)
      },

      ROUND_REVEAL: (msg: GameMessage & { type: "ROUND_REVEAL" }) => {
        snapLog("ROUND_REVEAL_RECV", { round: msg.result.round })
        setRoundResult(msg.result)
        setScreen("reveal")
      },

      MATCH_RESULT: (msg: GameMessage & { type: "MATCH_RESULT" }) => {
        snapLog("MATCH_RESULT_RECV", { winner: msg.winner })
        // Determine winner from our perspective
        const result = msg.rounds[0]
        if (result) {
          setMatchWinner(result.winner)
        }
        setScreen("match-end")
      },

      PHASE_CHANGE: (msg: GameMessage & { type: "PHASE_CHANGE" }) => {
        snapLog("PHASE_CHANGE_RECV", { phase: msg.phase })
        if (msg.phase === "PICKING") setScreen("picking")
      },
    },
  })

  // Auto-send PLAYER_READY when data channel is up
  useEffect(() => {
    if (gameChannel.ready && gameChannel.localPeerId && !isSolo) {
      gameChannel.broadcast({
        type: "PLAYER_READY",
        playerId: gameChannel.localPeerId,
        nickname: isHost ? "host" : "guest",
      })
    }
  }, [gameChannel.ready, gameChannel.localPeerId, isSolo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track opponent connection for disconnect detection (debounced to tolerate brief reconnects)
  useEffect(() => {
    let disconnectTimer: ReturnType<typeof setTimeout> | undefined

    if (remotePeers.length > 0) {
      hadOpponent.current = true
      setDisconnected(false)
    } else if (hadOpponent.current && screen !== "lobby" && screen !== "join" && !isSolo) {
      disconnectTimer = setTimeout(() => {
        setDisconnected(true)
        snapLog("OPPONENT_DISCONNECTED")
      }, 3000)
    }

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer)
    }
  }, [remotePeers.length, screen, isSolo])

  // Swap card image when AI illustration arrives
  useEffect(() => {
    if (!card || !aiImageUrl) return
    setCard((prev) => prev ? { ...prev, imageUrl: aiImageUrl } : prev)
    setHand((prev) => {
      const updated = prev.map((c) =>
        c.id === card.id ? { ...c, imageUrl: aiImageUrl } : c,
      )
      saveHand(updated)
      return updated
    })
  }, [aiImageUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Host: advance to PICKING when both hands ready
  useEffect(() => {
    if (isHost && handReady && opponentReady && screen === "card-building") {
      snapLog("BOTH_HANDS_READY")
      gameChannel.broadcast({ type: "PHASE_CHANGE", phase: "PICKING" })
      setScreen("picking")
    }
  }, [isHost, handReady, opponentReady, screen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Host: resolve battle when both picks are in
  useEffect(() => {
    if (!isHost) return
    if (selectedIndex === null || opponentPickedIndex === null) return
    if (roundResult) return // already resolved

    const myCard = hand[selectedIndex]
    const oppCard = opponentCards[opponentPickedIndex]
    if (!myCard || !oppCard) return

    snapLog("RESOLVING_BATTLE", {
      myCard: myCard.name,
      oppCard: oppCard.name,
    })

    // cardA = host's card, cardB = opponent's card
    const result = resolveBattle(myCard, oppCard)
    setRoundResult(result)

    // Broadcast reveal
    gameChannel.broadcast({ type: "ROUND_REVEAL", result })
    setScreen("reveal")

    // After reveal drama, broadcast match result
    const timer = setTimeout(() => {
      const winner = result.winner === "draw"
        ? null
        : result.winner === "A"
          ? gameChannel.localPeerId
          : "opponent"
      gameChannel.broadcast({
        type: "MATCH_RESULT",
        winner,
        rounds: [result],
      })
      setMatchWinner(result.winner)
      setScreen("match-end")
    }, 5000)

    return () => clearTimeout(timer)
  }, [isHost, selectedIndex, opponentPickedIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guest: auto-advance to match-end after seeing reveal
  useEffect(() => {
    if (isHost) return
    if (screen !== "reveal" || !roundResult) return

    const timer = setTimeout(() => {
      setMatchWinner(roundResult.winner)
      setScreen("match-end")
    }, 5000)

    return () => clearTimeout(timer)
  }, [isHost, screen, roundResult])

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

      // Add to hand and persist
      const newHand = [...hand, data]
      setHand(newHand)
      saveHand(newHand)

      snapLog("CARD_RECEIVED", { id: data.id, name: data.name })
    } catch (err) {
      const msg = err instanceof Error ? (err.message || "Failed to generate card") : (err != null ? String(err) : "Failed to generate card")
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

  function handleHandReady() {
    setHandReady(true)

    if (isSolo) {
      // Solo mode: generate opponent and go straight to picking
      const opp = generateSoloOpponent()
      setOpponentCards([opp])
      setOpponentReady(true)
      setTimeout(() => setScreen("picking"), 500)
      snapLog("SOLO_HAND_READY", { cardCount: hand.length })
    } else {
      gameChannel.broadcast({
        type: "HAND_READY",
        playerId: gameChannel.localPeerId!,
        cardCount: hand.length,
        cards: hand,
      })
      snapLog("HAND_READY_SENT", { cardCount: hand.length })
    }
  }

  function handlePickCard(index: number) {
    setSelectedIndex(index)

    if (isSolo) {
      // Solo: opponent always picks index 0, resolve immediately
      setOpponentPickedIndex(0)
      snapLog("SOLO_CARD_PICKED", { index })
    } else {
      gameChannel.broadcast({
        type: "CARD_PICKED",
        playerId: gameChannel.localPeerId!,
        cardIndex: index,
      })
      snapLog("CARD_PICKED_SENT", { index })
    }
  }

  function handlePlayAgain() {
    // Leave Fishjam room before resetting
    leaveRoom()

    // Clean up preview URL
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    // Reset all state
    clearHand()
    setHand([])
    setHandReady(false)
    setOpponentCards([])
    setOpponentReady(false)
    setSelectedIndex(null)
    setOpponentPickedIndex(null)
    setRoundResult(null)
    setMatchWinner(null)
    setCard(null)
    setPreviewUrl(null)
    setGeminiBlob(null)
    setCardBlob(null)
    setLoading(false)
    setError(null)
    setDisconnected(false)
    hadOpponent.current = false

    if (isSolo) {
      setIsSolo(false)
    }
    setScreen("lobby")
    snapLog("PLAY_AGAIN")
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

  const isBattleScreen =
    screen === "picking" || screen === "reveal" || screen === "match-end"

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
      {/* Disconnect overlay */}
      {disconnected && (
        <Box
          position="fixed"
          inset="0"
          bg="rgba(0,0,0,0.8)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={100}
          backdropFilter="blur(4px)"
        >
          <VStack gap="4" p="8" maxW="320px">
            <Text
              fontSize="2xl"
              fontWeight="700"
              fontFamily="'Cinzel', Georgia, serif"
              color="#e05252"
              textShadow="0 0 20px rgba(224,82,82,0.5)"
            >
              Opponent Disconnected
            </Text>
            <Text color="fg.muted" textAlign="center">
              Your opponent has left the battle.
            </Text>
            <Button
              size="lg"
              colorPalette="orange"
              w="full"
              onClick={handlePlayAgain}
            >
              Back to Lobby
            </Button>
          </VStack>
        </Box>
      )}

      {/* Header — hide during battle for more space */}
      {!isBattleScreen && (
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
      )}

      {/* Lobby — auto-creates room, waits for opponent */}
      {screen === "lobby" && (
        <>
          <HStack
            position="absolute"
            top={{ base: "4", lg: "6" }}
            right={{ base: "4", lg: "6" }}
            gap="2"
          >
            {hand.length > 0 && (
              <Button
                size="md"
                variant="outline"
                colorPalette="orange"
                px="4"
                onClick={() => setScreen("my-cards")}
              >
                My Cards
              </Button>
            )}
            <Button
              size="md"
              variant="outline"
              colorPalette="orange"
              px="4"
              onClick={() => {
                setIsSolo(true)
                setScreen("card-building")
              }}
            >
              Solo mode
            </Button>
          </HStack>
          <CreateRoom
            onOpponentJoined={handleOpponentJoined}
            onJoinWithCode={handleJoinWithCode}
          />
        </>
      )}

      {/* My Cards — browse saved cards */}
      {screen === "my-cards" && (
        <MyCards cards={hand} onBack={() => setScreen("lobby")} />
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
                <>
                  <CardBattle card={card} aiImageUrl={aiImageUrl} aiGenerating={aiImageState === "generating"} />

                  {/* Ready to Battle button */}
                  {!handReady ? (
                    <Button
                      size="lg"
                      colorPalette="orange"
                      w="full"
                      maxW="320px"
                      fontFamily="'Cinzel', Georgia, serif"
                      fontWeight="700"
                      letterSpacing="0.05em"
                      onClick={handleHandReady}
                    >
                      Ready to Battle!
                    </Button>
                  ) : (
                    <HStack gap="3">
                      <Spinner size="sm" color="accent" />
                      <Text color="fg.muted" fontWeight="500" fontSize="lg">
                        {opponentReady
                          ? "Both ready! Starting battle..."
                          : "Waiting for opponent\u2019s card..."}
                      </Text>
                    </HStack>
                  )}
                </>
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
                  <ErrorTap message={error} />
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
              {!handReady && (
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
              )}
            </VStack>
          ) : (
            <CameraCapture onCapture={handleCapture} />
          )}
        </>
      )}

      {/* Battle screens */}
      {isBattleScreen && (
        <BattleArena
          phase={
            screen === "picking"
              ? "PICKING"
              : screen === "reveal"
                ? "REVEAL"
                : "MATCH_END"
          }
          myCards={hand}
          selectedIndex={selectedIndex}
          opponentPicked={opponentPickedIndex !== null}
          roundResult={roundResult}
          matchWinner={matchWinner}
          isHost={isHost}
          onPickCard={handlePickCard}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </Box>
  )
}

export default App
