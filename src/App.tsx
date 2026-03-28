import { useState, useCallback, useEffect, useRef } from "react"
import {
  Box,
  Button,
  Image,
  Text,
  VStack,
  HStack,
} from "@chakra-ui/react"
import { useConnection, usePeers } from "@fishjam-cloud/react-client"
import BattleArena from "./components/BattleArena"
import CreateRoom from "./components/CreateRoom"
import MyCards from "./components/MyCards"
import JoinRoom from "./components/JoinRoom"
import HandBuilder from "./components/HandBuilder"
import { preprocessImage, cropToSquare } from "./lib/imageProcessing"
import { saveHand, loadHand, clearHand } from "./lib/handStorage"
import { saveToCollection, updateCollectionCard, loadCollection } from "./lib/collectionStorage"
import { generateSoloOpponents, soloPickCard } from "./lib/soloOpponent"
import snapDuelLogo from "./assets/snapduellogo.png"
import { snapLog } from "../shared/debug.ts"
import { useGameChannel } from "./hooks/useGameChannel"
import { useAiImage } from "./hooks/useAiImage"
import { resolveBattle } from "../shared/battle.ts"
import { createMatchState, applyRoundResult, isMatchOver, getMatchWinner, getAvailableIndices } from "../shared/match.ts"
import type { Card, GameMessage, MatchState, PeerMetadata, PresenceMessage, ReactionId, RoundResult } from "../shared/types.ts"
import { HAND_SIZE, MAX_CARD_USES } from "../shared/constants.ts"

type Screen =
  | "lobby"
  | "join"
  | "card-building"
  | "picking"
  | "reveal"
  | "round-summary"
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
  const [collection, setCollection] = useState<Card[]>(() => loadCollection())
  const [handReady, setHandReady] = useState(false)
  const [opponentCards, setOpponentCards] = useState<Card[]>([])
  const [opponentReady, setOpponentReady] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [opponentPickedIndex, setOpponentPickedIndex] = useState<number | null>(null)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [matchWinner, setMatchWinner] = useState<"A" | "B" | "draw" | null>(null)
  const [matchState, setMatchState] = useState<MatchState | null>(null)
  const [disconnected, setDisconnected] = useState(false)

  // Live interactivity state
  const [incomingReaction, setIncomingReaction] = useState<{ reactionId: ReactionId; ts: number } | null>(null)
  const [reactionCooldown, setReactionCooldown] = useState(false)
  const [opponentHoveredIndex, setOpponentHoveredIndex] = useState<number | null>(null)
  const [opponentShuffled, setOpponentShuffled] = useState(0)
  const hoverStaleRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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

      NEXT_ROUND: (msg: GameMessage & { type: "NEXT_ROUND" }) => {
        snapLog("NEXT_ROUND_RECV", { round: msg.round, scoreA: msg.scoreA, scoreB: msg.scoreB })
        setMatchState((prev) => prev ? {
          ...prev,
          currentRound: msg.round,
          scoreA: msg.scoreA,
          scoreB: msg.scoreB,
        } : prev)
        setSelectedIndex(null)
        setOpponentPickedIndex(null)
        setRoundResult(null)
        setScreen("round-summary")
      },

      MATCH_RESULT: (msg: GameMessage & { type: "MATCH_RESULT" }) => {
        snapLog("MATCH_RESULT_RECV", { winner: msg.winner, scoreA: msg.scoreA, scoreB: msg.scoreB })
        const winner = msg.scoreA > msg.scoreB ? "A" : msg.scoreB > msg.scoreA ? "B" : "draw"
        setMatchWinner(winner)
        setMatchState((prev) => prev ? {
          ...prev,
          rounds: msg.rounds,
          scoreA: msg.scoreA,
          scoreB: msg.scoreB,
        } : prev)
        setScreen("match-end")
      },

      PHASE_CHANGE: (msg: GameMessage & { type: "PHASE_CHANGE" }) => {
        snapLog("PHASE_CHANGE_RECV", { phase: msg.phase })
        if (msg.phase === "PICKING") setScreen("picking")
      },

      REACTION: (msg: GameMessage & { type: "REACTION" }) => {
        setIncomingReaction({ reactionId: msg.reactionId, ts: Date.now() })
      },

      SHUFFLE: (_msg: GameMessage & { type: "SHUFFLE" }) => {
        setOpponentShuffled((prev) => prev + 1)
      },
    },
    onPresence: (msg: PresenceMessage) => {
      if (msg.type === "HOVER") {
        setOpponentHoveredIndex(msg.hoveredIndex)
        // Staleness timeout: clear if no update in 300ms
        if (hoverStaleRef.current) clearTimeout(hoverStaleRef.current)
        hoverStaleRef.current = setTimeout(() => setOpponentHoveredIndex(null), 300)
      }
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
    // Update permanent collection too
    updateCollectionCard(card.id, { imageUrl: aiImageUrl })
    setCollection((prev) =>
      prev.map((c) => c.id === card.id ? { ...c, imageUrl: aiImageUrl } : c),
    )
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
    if (!isHost && !isSolo) return
    if (selectedIndex === null || opponentPickedIndex === null) return
    if (roundResult) return // already resolved
    if (!matchState) return

    const myCard = hand[selectedIndex]
    const oppCard = opponentCards[opponentPickedIndex]
    if (!myCard || !oppCard) return

    snapLog("RESOLVING_BATTLE", {
      myCard: myCard.name,
      oppCard: oppCard.name,
      round: matchState.currentRound,
    })

    // cardA = host's card, cardB = opponent's card
    const result = resolveBattle(myCard, oppCard, matchState.currentRound)
    setRoundResult(result)

    // Broadcast reveal (multiplayer only)
    if (!isSolo) {
      gameChannel.broadcast({ type: "ROUND_REVEAL", result })
    }
    setScreen("reveal")

    // After reveal drama, check if match is over or advance to next round
    const timer = setTimeout(() => {
      const newState = applyRoundResult(matchState, result, selectedIndex, opponentPickedIndex)
      setMatchState(newState)

      if (isMatchOver(newState)) {
        const winner = getMatchWinner(newState)
        const winnerStr = winner === "draw"
          ? null
          : winner === "A"
            ? (isSolo ? "host" : gameChannel.localPeerId)
            : "opponent"

        if (!isSolo) {
          gameChannel.broadcast({
            type: "MATCH_RESULT",
            winner: winnerStr,
            rounds: newState.rounds,
            scoreA: newState.scoreA,
            scoreB: newState.scoreB,
          })
        }
        setMatchWinner(winner)
        setScreen("match-end")
      } else {
        // Next round
        if (!isSolo) {
          gameChannel.broadcast({
            type: "NEXT_ROUND",
            round: newState.currentRound,
            scoreA: newState.scoreA,
            scoreB: newState.scoreB,
          })
        }
        setSelectedIndex(null)
        setOpponentPickedIndex(null)
        setRoundResult(null)
        setScreen("round-summary")
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [isHost, isSolo, selectedIndex, opponentPickedIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Round summary → next picking auto-advance
  useEffect(() => {
    if (screen !== "round-summary") return
    const timer = setTimeout(() => {
      setScreen("picking")
    }, 3000)
    return () => clearTimeout(timer)
  }, [screen])

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

      // Save to permanent collection
      saveToCollection(data)
      setCollection((prev) => prev.some((c) => c.id === data.id) ? prev : [...prev, data])

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

  function handleAddFromCollection(cardToAdd: Card) {
    if (hand.length >= HAND_SIZE) return
    if (hand.some((c) => c.id === cardToAdd.id)) return
    const newHand = [...hand, cardToAdd]
    setHand(newHand)
    saveHand(newHand)
    snapLog("CARD_ADDED_FROM_COLLECTION", { id: cardToAdd.id, name: cardToAdd.name })
  }

  function handleRemoveFromHand(index: number) {
    const newHand = hand.filter((_, i) => i !== index)
    setHand(newHand)
    saveHand(newHand)
  }

  function handleHandReady() {
    setHandReady(true)
    const ms = createMatchState()
    setMatchState(ms)

    if (isSolo) {
      const opponents = generateSoloOpponents(HAND_SIZE)
      setOpponentCards(opponents)
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

  function handleSendReaction(reactionId: ReactionId) {
    if (reactionCooldown || isSolo) return
    gameChannel.broadcast({
      type: "REACTION",
      playerId: gameChannel.localPeerId!,
      reactionId,
    })
    setReactionCooldown(true)
    setTimeout(() => setReactionCooldown(false), 2000)
  }

  function handleHoverCard(index: number | null) {
    if (isSolo) return
    gameChannel.publishPresence({
      type: "HOVER",
      playerId: gameChannel.localPeerId!,
      hoveredIndex: index,
    })
  }

  function handleShuffle() {
    if (selectedIndex !== null) return
    const usedIndices = matchState?.usedIndicesA ?? []
    const shuffleUseCounts = new Map<number, number>()
    for (const idx of usedIndices) {
      shuffleUseCounts.set(idx, (shuffleUseCounts.get(idx) ?? 0) + 1)
    }
    const available = hand.map((_, i) => i).filter((i) => (shuffleUseCounts.get(i) ?? 0) < MAX_CARD_USES)
    if (available.length <= 1) return

    // Fisher-Yates on available indices
    const shuffledIndices = [...available]
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]]
    }

    // Build new hand with shuffled available cards
    const newHand = [...hand]
    const availableCards = available.map((i) => hand[i])
    shuffledIndices.forEach((targetIdx, i) => {
      newHand[targetIdx] = availableCards[i]
    })
    setHand(newHand)

    if (!isSolo) {
      gameChannel.broadcast({
        type: "SHUFFLE",
        playerId: gameChannel.localPeerId!,
        newOrder: shuffledIndices,
      })
    }
  }

  function handlePickCard(index: number) {
    setSelectedIndex(index)

    if (isSolo) {
      // Solo: opponent picks randomly from available cards
      const oppAvailable = getAvailableIndices(
        opponentCards.length,
        matchState?.usedIndicesB ?? [],
      )
      const oppPick = soloPickCard(oppAvailable)
      setOpponentPickedIndex(oppPick)
      snapLog("SOLO_CARD_PICKED", { index, oppPick })
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
    setMatchState(null)
    setCard(null)
    setPreviewUrl(null)
    setGeminiBlob(null)
    setCardBlob(null)
    setLoading(false)
    setError(null)
    setDisconnected(false)
    setIncomingReaction(null)
    setReactionCooldown(false)
    setOpponentHoveredIndex(null)
    setOpponentShuffled(0)
    hadOpponent.current = false

    if (isSolo) {
      setIsSolo(false)
    }
    setScreen("lobby")
    snapLog("PLAY_AGAIN")
  }

  function handleRematch() {
    // Clean up preview URL
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    // Reset match state but keep connection and collection
    clearHand()
    setHand([])
    setHandReady(false)
    setOpponentCards([])
    setOpponentReady(false)
    setSelectedIndex(null)
    setOpponentPickedIndex(null)
    setRoundResult(null)
    setMatchWinner(null)
    setMatchState(null)
    setCard(null)
    setPreviewUrl(null)
    setGeminiBlob(null)
    setCardBlob(null)
    setLoading(false)
    setError(null)
    setIncomingReaction(null)
    setReactionCooldown(false)
    setOpponentHoveredIndex(null)
    setOpponentShuffled(0)

    setScreen("card-building")
    snapLog("REMATCH")
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

  const isBattleScreen =
    screen === "picking" || screen === "reveal" || screen === "round-summary" || screen === "match-end"

  const myUsedIndices = matchState?.usedIndicesA ?? []

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
          <Image
            src={snapDuelLogo}
            alt="SnapDuel"
            maxW="320px"
            w="100%"
            h="auto"
          />
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
            {collection.length > 0 && (
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
        <MyCards cards={collection} onBack={() => setScreen("lobby")} />
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
        <HandBuilder
          hand={hand}
          collection={collection}
          latestCard={card}
          isGenerating={loading}
          generatingPreviewUrl={previewUrl}
          generatingError={error}
          aiImageUrl={aiImageUrl}
          aiGenerating={aiImageState === "generating"}
          handReady={handReady}
          opponentReady={opponentReady}
          onCapture={handleCapture}
          onRetry={handleRetry}
          onAddFromCollection={handleAddFromCollection}
          onRemoveFromHand={handleRemoveFromHand}
          onReady={handleHandReady}
          onReset={handleReset}
        />
      )}

      {/* Battle screens */}
      {isBattleScreen && (
        <BattleArena
          phase={
            screen === "picking"
              ? "PICKING"
              : screen === "reveal"
                ? "REVEAL"
                : screen === "round-summary"
                  ? "ROUND_SUMMARY"
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
          onRematch={handleRematch}
          scoreA={matchState?.scoreA ?? 0}
          scoreB={matchState?.scoreB ?? 0}
          currentRound={matchState?.currentRound ?? 1}
          usedIndices={myUsedIndices}
          allRounds={matchState?.rounds ?? []}
          isSolo={isSolo}
          onSendReaction={handleSendReaction}
          incomingReaction={incomingReaction}
          reactionCooldown={reactionCooldown}
          opponentCardCount={opponentCards.length}
          opponentUsedIndices={matchState?.usedIndicesB ?? []}
          opponentHoveredIndex={opponentHoveredIndex}
          onHoverCard={handleHoverCard}
          onShuffle={handleShuffle}
          opponentShuffled={opponentShuffled}
        />
      )}
    </Box>
  )
}

export default App
