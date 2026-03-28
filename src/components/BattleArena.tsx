import { useState, useEffect } from "react"
import { Box, Button, HStack, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react"
import CardBattle from "./Card"
import type { Card, RoundResult, ElementAdvantage } from "../../shared/types"

/* ── Props ─────────────────────────────────────────────────────── */

type BattlePhase = "PICKING" | "REVEAL" | "RESOLUTION" | "ROUND_SUMMARY" | "MATCH_END"

interface BattleArenaProps {
  phase: BattlePhase
  myCards: Card[]
  selectedIndex: number | null
  opponentPicked: boolean
  roundResult: RoundResult | null
  matchWinner: "A" | "B" | "draw" | null
  isHost: boolean
  onPickCard: (index: number) => void
  onPlayAgain: () => void
  onRematch: () => void
  scoreA: number
  scoreB: number
  currentRound: number
  usedIndices: number[]
  allRounds: RoundResult[]
}

/* ── Keyframes ─────────────────────────────────────────────────── */

const BATTLE_KEYFRAMES = `
@keyframes slideFromTop {
  0%   { transform: translateY(-80px) scale(0.85); opacity: 0; }
  60%  { transform: translateY(8px) scale(1.02); opacity: 1; }
  100% { transform: translateY(0) scale(1); }
}
@keyframes slideFromBottom {
  0%   { transform: translateY(80px) scale(0.85); opacity: 0; }
  60%  { transform: translateY(-8px) scale(1.02); opacity: 1; }
  100% { transform: translateY(0) scale(1); }
}
@keyframes vsPulse {
  0%, 100% { transform: scale(1); text-shadow: 0 0 20px rgba(242,116,5,0.6); }
  50%      { transform: scale(1.15); text-shadow: 0 0 40px rgba(242,116,5,0.9), 0 0 80px rgba(242,116,5,0.4); }
}
@keyframes damageFloat {
  0%   { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-50px); opacity: 0; }
}
@keyframes hpDrain {
  0%   { transform: scaleX(var(--hp-from)); }
  100% { transform: scaleX(var(--hp-to)); }
}
@keyframes winnerGlow {
  0%, 100% { box-shadow: 0 0 12px 4px rgba(255,215,0,0.4); }
  50%      { box-shadow: 0 0 25px 10px rgba(255,215,0,0.7), 0 0 50px 20px rgba(255,215,0,0.3); }
}
@keyframes loserDim {
  0%   { filter: brightness(1) grayscale(0); }
  100% { filter: brightness(0.6) grayscale(0.5); }
}
@keyframes victoryText {
  0%   { transform: scale(0); opacity: 0; }
  50%  { transform: scale(1.2); opacity: 1; }
  70%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}
@keyframes victoryPulse {
  0%, 100% { text-shadow: 0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.3); }
  50%      { text-shadow: 0 0 40px rgba(255,215,0,0.9), 0 0 80px rgba(255,215,0,0.5); }
}
@keyframes defeatPulse {
  0%, 100% { text-shadow: 0 0 20px rgba(224,82,82,0.6); }
  50%      { text-shadow: 0 0 40px rgba(224,82,82,0.9); }
}
@keyframes pickGlow {
  0%, 100% { box-shadow: 0 0 15px 3px rgba(242,116,5,0.3); }
  50%      { box-shadow: 0 0 25px 8px rgba(242,116,5,0.6); }
}
@keyframes selectedCheck {
  0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); }
}
@keyframes scorePop {
  0%   { transform: scale(0.8); opacity: 0; }
  60%  { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
`

/* ── Helpers ────────────────────────────────────────────────────── */

function advantageText(adv: ElementAdvantage, attackerElement: string, defenderElement: string): string | null {
  if (adv === "strong") {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    return `${cap(attackerElement)} beats ${cap(defenderElement)}!`
  }
  if (adv === "weak") return "Not very effective..."
  return null
}

function getMyCard(result: RoundResult, isHost: boolean): Card {
  return isHost ? result.cardA : result.cardB
}

function getOppCard(result: RoundResult, isHost: boolean): Card {
  return isHost ? result.cardB : result.cardA
}

function getMyDamage(result: RoundResult, isHost: boolean): number {
  return isHost ? result.damageToA : result.damageToB
}

function getOppDamage(result: RoundResult, isHost: boolean): number {
  return isHost ? result.damageToB : result.damageToA
}

function getMyRemainingHp(result: RoundResult, isHost: boolean): number {
  return isHost ? result.remainingHpA : result.remainingHpB
}

function getOppRemainingHp(result: RoundResult, isHost: boolean): number {
  return isHost ? result.remainingHpB : result.remainingHpA
}

function getMyAdvantage(result: RoundResult, isHost: boolean): ElementAdvantage {
  return isHost ? result.advantageA : result.advantageB
}

function didIWin(result: RoundResult, isHost: boolean): boolean {
  return (isHost && result.winner === "A") || (!isHost && result.winner === "B")
}

function didIDraw(result: RoundResult): boolean {
  return result.winner === "draw"
}

/* ── Sub-components ────────────────────────────────────────────── */

function CardSlot({
  card,
  animation,
  delay,
  isWinner,
  isLoser,
  damage,
  remainingHp,
  showDamage,
  cardWidth,
  cardHeight,
}: {
  card: Card
  animation: string
  delay: string
  isWinner?: boolean
  isLoser?: boolean
  damage?: number
  remainingHp?: number
  showDamage?: boolean
  cardWidth: number
  cardHeight: number
}) {
  const hpFraction = remainingHp != null ? Math.max(0, remainingHp / card.hp) : 1
  const ratio = cardWidth / 280
  const hpBarW = `${Math.round(180 * ratio)}px`
  const dmgFontSize = `${Math.max(16, Math.round(30 * ratio))}px`

  return (
    <Box
      position="relative"
      style={{
        animation: `${animation} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        animationDelay: delay,
        ...(isWinner ? { animation: `${animation} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both, winnerGlow 1.5s ease-in-out infinite` } : {}),
        ...(isLoser ? { animation: `${animation} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both, loserDim 800ms ease-out forwards` } : {}),
      }}
      borderRadius={`${Math.max(10, Math.round(18 * ratio))}px`}
    >
      <CardBattle card={card} width={cardWidth} height={cardHeight} />

      {/* Damage number floating up */}
      {showDamage && damage != null && (
        <Text
          position="absolute"
          top="30%"
          left="50%"
          transform="translateX(-50%)"
          fontSize={dmgFontSize}
          fontWeight="900"
          fontFamily="'Cinzel', Georgia, serif"
          color="#ff4444"
          textShadow="0 0 10px rgba(255,68,68,0.8), 0 2px 4px rgba(0,0,0,0.8)"
          style={{
            animation: "damageFloat 1.5s ease-out forwards",
            animationDelay: "0.8s",
            opacity: 0,
          }}
          pointerEvents="none"
          zIndex={20}
        >
          -{damage}
        </Text>
      )}

      {/* HP bar */}
      {showDamage && (
        <Box
          position="absolute"
          bottom="-4px"
          left="50%"
          transform="translateX(-50%)"
          w={hpBarW}
          h="8px"
          bg="rgba(0,0,0,0.6)"
          borderRadius="full"
          overflow="hidden"
          border="1px solid rgba(255,255,255,0.15)"
        >
          <Box
            h="full"
            bg={hpFraction > 0.5 ? "#22aa44" : hpFraction > 0.2 ? "#cc8822" : "#cc2222"}
            borderRadius="full"
            transformOrigin="left"
            style={{
              "--hp-from": "1",
              "--hp-to": String(hpFraction),
              animation: "hpDrain 1.2s ease-out forwards",
              animationDelay: "0.6s",
              transform: "scaleX(1)",
            } as React.CSSProperties}
          />
        </Box>
      )}
    </Box>
  )
}

function VsBadge() {
  return (
    <Text
      fontSize="3xl"
      fontWeight="900"
      fontFamily="'Cinzel', Georgia, serif"
      color="#F27405"
      style={{
        animation: "vsPulse 1.5s ease-in-out infinite",
        animationDelay: "0.6s",
      }}
      lineHeight="1"
      userSelect="none"
    >
      VS
    </Text>
  )
}

/* ── Score Banner ──────────────────────────────────────────────── */

function ScoreBanner({
  scoreA,
  scoreB,
  currentRound,
  isHost,
}: {
  scoreA: number
  scoreB: number
  currentRound: number
  isHost: boolean
}) {
  const myScore = isHost ? scoreA : scoreB
  const oppScore = isHost ? scoreB : scoreA

  return (
    <HStack justify="center" gap="3" py="1" w="full">
      <HStack gap="2">
        <Text
          fontSize="sm"
          fontWeight="700"
          fontFamily="'Cinzel', Georgia, serif"
          color="#ffd700"
        >
          You {myScore}
        </Text>
        <Text fontSize="sm" color="fg.muted" fontWeight="700">
          -
        </Text>
        <Text
          fontSize="sm"
          fontWeight="700"
          fontFamily="'Cinzel', Georgia, serif"
          color="#e05252"
        >
          {oppScore} Opp
        </Text>
      </HStack>
      <Text
        fontSize="xs"
        color="fg.muted"
        fontFamily="'Cinzel', Georgia, serif"
        fontWeight="600"
      >
        Round {currentRound}
      </Text>
    </HStack>
  )
}

/* ── Picking Phase ─────────────────────────────────────────────── */

function PickingPhase({
  myCards,
  selectedIndex,
  opponentPicked,
  onPickCard,
  usedIndices,
  currentRound,
}: {
  myCards: Card[]
  selectedIndex: number | null
  opponentPicked: boolean
  onPickCard: (index: number) => void
  usedIndices: number[]
  currentRound: number
}) {
  const picked = selectedIndex !== null
  const usedSet = new Set(usedIndices)

  const PICK_CARD_W = 116
  const PICK_CARD_H = 166

  return (
    <VStack gap="3" align="center" w="full">
      <Text
        fontSize="xl"
        fontWeight="700"
        fontFamily="'Cinzel', Georgia, serif"
        color="fg.heading"
        textShadow="0 0 20px rgba(242,116,5,0.3)"
      >
        Round {currentRound}
      </Text>

      <SimpleGrid columns={{ base: 2, md: 3 }} gap="3" justifyItems="center" w="full">
        {myCards.map((card, i) => {
          const isUsed = usedSet.has(i)
          const isPickable = !picked && !isUsed

          return (
            <Box
              key={card.id}
              w={`${PICK_CARD_W}px`}
              h={`${PICK_CARD_H}px`}
              position="relative"
              cursor={isPickable ? "pointer" : "default"}
              onClick={() => isPickable && onPickCard(i)}
              opacity={isUsed ? 0.25 : picked && selectedIndex !== i ? 0.4 : 1}
              transition="opacity 0.3s, transform 0.2s"
              _hover={isPickable ? { transform: "translateY(-4px)" } : undefined}
              style={
                isUsed
                  ? undefined
                  : !picked
                    ? { animation: "pickGlow 2s ease-in-out infinite" }
                    : selectedIndex === i
                      ? { animation: "winnerGlow 1.5s ease-in-out infinite" }
                      : undefined
              }
              borderRadius="12px"
              overflow="visible"
              pointerEvents={isUsed ? "none" : "auto"}
            >
              <CardBattle card={card} width={PICK_CARD_W} height={PICK_CARD_H} />

              {/* USED badge */}
              {isUsed && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  bg="rgba(0,0,0,0.7)"
                  borderRadius="full"
                  px="3"
                  py="1"
                  zIndex={15}
                >
                  <Text fontSize="xs" fontWeight="700" color="fg.muted" letterSpacing="0.1em">
                    USED
                  </Text>
                </Box>
              )}

              {/* Selected checkmark overlay */}
              {picked && selectedIndex === i && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  w="36px"
                  h="36px"
                  borderRadius="full"
                  bg="rgba(34,170,68,0.9)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  style={{ animation: "selectedCheck 500ms cubic-bezier(0.34,1.56,0.64,1) both" }}
                  zIndex={15}
                  border="3px solid rgba(255,255,255,0.3)"
                  boxShadow="0 0 20px rgba(34,170,68,0.5)"
                >
                  <Text fontSize="md" lineHeight="1">
                    {"\u2714"}
                  </Text>
                </Box>
              )}
            </Box>
          )
        })}
      </SimpleGrid>

      {/* Status text */}
      {picked ? (
        <HStack gap="3">
          {!opponentPicked && <Spinner size="sm" color="accent" />}
          <Text color="fg.muted" fontWeight="500" fontSize="md">
            {opponentPicked
              ? "Both ready — resolving battle..."
              : "Waiting for opponent\u2019s pick..."}
          </Text>
        </HStack>
      ) : (
        <Text color="fg.muted" fontSize="sm" fontStyle="italic">
          Tap a card to play it
        </Text>
      )}
    </VStack>
  )
}

/* ── Reveal Phase ──────────────────────────────────────────────── */

function RevealPhase({
  roundResult,
  isHost,
}: {
  roundResult: RoundResult
  isHost: boolean
}) {
  const myCard = getMyCard(roundResult, isHost)
  const oppCard = getOppCard(roundResult, isHost)
  const myAdv = getMyAdvantage(roundResult, isHost)
  const advText = advantageText(myAdv, myCard.element, oppCard.element)

  const BATTLE_CARD_W = 170
  const BATTLE_CARD_H = 243

  return (
    <VStack gap="2" align="center" w="full">
      <Text
        fontSize="xl"
        fontWeight="700"
        fontFamily="'Cinzel', Georgia, serif"
        color="fg.heading"
        textShadow="0 0 20px rgba(242,116,5,0.3)"
      >
        Battle!
      </Text>

      {/* Opponent's card (top) */}
      <CardSlot card={oppCard} animation="slideFromTop" delay="0ms" cardWidth={BATTLE_CARD_W} cardHeight={BATTLE_CARD_H} />

      <VsBadge />

      {/* My card (bottom) */}
      <CardSlot card={myCard} animation="slideFromBottom" delay="300ms" cardWidth={BATTLE_CARD_W} cardHeight={BATTLE_CARD_H} />

      {/* Element advantage text */}
      {advText && (
        <Text
          fontSize="md"
          fontWeight="700"
          fontFamily="'Cinzel', Georgia, serif"
          color={myAdv === "strong" ? "#22cc44" : "#cc4444"}
          textShadow={
            myAdv === "strong"
              ? "0 0 15px rgba(34,204,68,0.5)"
              : "0 0 15px rgba(204,68,68,0.5)"
          }
          style={{
            animation: "victoryText 600ms cubic-bezier(0.34,1.56,0.64,1) both",
            animationDelay: "1s",
          }}
        >
          {advText}
        </Text>
      )}
    </VStack>
  )
}

/* ── Resolution Phase ──────────────────────────────────────────── */

function ResolutionPhase({
  roundResult,
  isHost,
}: {
  roundResult: RoundResult
  isHost: boolean
}) {
  const myCard = getMyCard(roundResult, isHost)
  const oppCard = getOppCard(roundResult, isHost)
  const myDmg = getMyDamage(roundResult, isHost)
  const oppDmg = getOppDamage(roundResult, isHost)
  const myRemHp = getMyRemainingHp(roundResult, isHost)
  const oppRemHp = getOppRemainingHp(roundResult, isHost)
  const iWin = didIWin(roundResult, isHost)
  const draw = didIDraw(roundResult)

  const BATTLE_CARD_W = 170
  const BATTLE_CARD_H = 243

  return (
    <VStack gap="2" align="center" w="full">
      <Text
        fontSize="xl"
        fontWeight="700"
        fontFamily="'Cinzel', Georgia, serif"
        color="fg.heading"
        textShadow="0 0 20px rgba(242,116,5,0.3)"
      >
        Clash!
      </Text>

      {/* Opponent's card */}
      <CardSlot
        card={oppCard}
        animation="slideFromTop"
        delay="0ms"
        isWinner={!iWin && !draw}
        isLoser={iWin}
        damage={oppDmg}
        remainingHp={oppRemHp}
        showDamage
        cardWidth={BATTLE_CARD_W}
        cardHeight={BATTLE_CARD_H}
      />

      <VsBadge />

      {/* My card */}
      <CardSlot
        card={myCard}
        animation="slideFromBottom"
        delay="0ms"
        isWinner={iWin}
        isLoser={!iWin && !draw}
        damage={myDmg}
        remainingHp={myRemHp}
        showDamage
        cardWidth={BATTLE_CARD_W}
        cardHeight={BATTLE_CARD_H}
      />
    </VStack>
  )
}

/* ── Round Summary Phase ──────────────────────────────────────── */

function RoundSummaryPhase({
  allRounds,
  isHost,
  scoreA,
  scoreB,
}: {
  allRounds: RoundResult[]
  isHost: boolean
  scoreA: number
  scoreB: number
}) {
  const lastRound = allRounds[allRounds.length - 1]
  if (!lastRound) return null

  const iWin = didIWin(lastRound, isHost)
  const draw = didIDraw(lastRound)
  const myScore = isHost ? scoreA : scoreB
  const oppScore = isHost ? scoreB : scoreA

  const roundLabel = draw ? "ROUND DRAW" : iWin ? "ROUND WON!" : "ROUND LOST"
  const roundColor = draw ? "#F27405" : iWin ? "#ffd700" : "#e05252"

  return (
    <VStack gap="5" align="center" w="full" py="8">
      <Text
        fontSize="3xl"
        fontWeight="900"
        fontFamily="'Cinzel', Georgia, serif"
        color={roundColor}
        letterSpacing="0.05em"
        style={{
          animation: "victoryText 600ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        lineHeight="1"
      >
        {roundLabel}
      </Text>

      {/* Score */}
      <HStack gap="4" style={{ animation: "scorePop 500ms ease-out both", animationDelay: "0.3s" }}>
        <Text
          fontSize="5xl"
          fontWeight="900"
          fontFamily="'Cinzel', Georgia, serif"
          color="#ffd700"
          lineHeight="1"
        >
          {myScore}
        </Text>
        <Text
          fontSize="3xl"
          fontWeight="700"
          fontFamily="'Cinzel', Georgia, serif"
          color="fg.muted"
          lineHeight="1"
        >
          -
        </Text>
        <Text
          fontSize="5xl"
          fontWeight="900"
          fontFamily="'Cinzel', Georgia, serif"
          color="#e05252"
          lineHeight="1"
        >
          {oppScore}
        </Text>
      </HStack>

      <HStack gap="3">
        <Spinner size="sm" color="accent" />
        <Text color="fg.muted" fontWeight="500" fontSize="md">
          Next round starting...
        </Text>
      </HStack>
    </VStack>
  )
}

/* ── Match End Phase ───────────────────────────────────────────── */

function MatchEndPhase({
  matchWinner,
  isHost,
  onPlayAgain,
  onRematch,
  scoreA,
  scoreB,
  allRounds,
}: {
  matchWinner: "A" | "B" | "draw" | null
  isHost: boolean
  onPlayAgain: () => void
  onRematch: () => void
  scoreA: number
  scoreB: number
  allRounds: RoundResult[]
}) {
  const iWin = matchWinner === null
    ? false
    : (isHost && matchWinner === "A") || (!isHost && matchWinner === "B")
  const draw = matchWinner === "draw"
  const myScore = isHost ? scoreA : scoreB
  const oppScore = isHost ? scoreB : scoreA

  const resultLabel = draw ? "DRAW" : iWin ? "VICTORY" : "DEFEAT"
  const resultColor = draw ? "#F27405" : iWin ? "#ffd700" : "#e05252"
  const resultAnimation = draw
    ? "victoryPulse 2s ease-in-out infinite"
    : iWin
      ? "victoryPulse 2s ease-in-out infinite"
      : "defeatPulse 2s ease-in-out infinite"

  const MINI_CARD_W = 80
  const MINI_CARD_H = 114

  return (
    <VStack gap="4" align="center" w="full">
      {/* Result banner */}
      <Text
        fontSize="4xl"
        fontWeight="900"
        fontFamily="'Cinzel', Georgia, serif"
        color={resultColor}
        letterSpacing="0.08em"
        style={{
          animation: `victoryText 800ms cubic-bezier(0.34,1.56,0.64,1) both, ${resultAnimation}`,
        }}
        lineHeight="1"
      >
        {resultLabel}
      </Text>

      {/* Final score */}
      <HStack gap="3">
        <Text
          fontSize="3xl"
          fontWeight="900"
          fontFamily="'Cinzel', Georgia, serif"
          color="#ffd700"
          lineHeight="1"
        >
          {myScore}
        </Text>
        <Text fontSize="xl" color="fg.muted" fontWeight="700" lineHeight="1">-</Text>
        <Text
          fontSize="3xl"
          fontWeight="900"
          fontFamily="'Cinzel', Georgia, serif"
          color="#e05252"
          lineHeight="1"
        >
          {oppScore}
        </Text>
      </HStack>

      {/* Round-by-round summary */}
      <VStack gap="2" w="full" maxW="380px">
        {allRounds.map((round, idx) => {
          const myCard = getMyCard(round, isHost)
          const oppCard = getOppCard(round, isHost)
          const roundWin = didIWin(round, isHost)
          const roundDraw = didIDraw(round)

          return (
            <HStack
              key={idx}
              w="full"
              justify="center"
              gap="3"
              py="2"
              px="3"
              borderRadius="lg"
              bg="rgba(255,255,255,0.03)"
              border="1px solid"
              borderColor="border"
            >
              <Box borderRadius="8px" overflow="visible">
                <CardBattle card={myCard} width={MINI_CARD_W} height={MINI_CARD_H} />
              </Box>
              <VStack gap="0">
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  fontFamily="'Cinzel', Georgia, serif"
                  color="fg.muted"
                >
                  R{idx + 1}
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="700"
                  fontFamily="'Cinzel', Georgia, serif"
                  color={roundDraw ? "#F27405" : roundWin ? "#ffd700" : "#e05252"}
                >
                  {roundDraw ? "Draw" : roundWin ? "Won" : "Lost"}
                </Text>
              </VStack>
              <Box borderRadius="8px" overflow="visible">
                <CardBattle card={oppCard} width={MINI_CARD_W} height={MINI_CARD_H} />
              </Box>
            </HStack>
          )
        })}
      </VStack>

      {/* Buttons */}
      <VStack gap="2" w="full" maxW="320px" mt="2">
        <Button
          size="lg"
          colorPalette="orange"
          w="full"
          onClick={onRematch}
          fontFamily="'Cinzel', Georgia, serif"
          fontWeight="700"
          letterSpacing="0.05em"
        >
          Rematch
        </Button>
        <Button
          size="lg"
          variant="outline"
          colorPalette="teal"
          w="full"
          onClick={onPlayAgain}
          fontFamily="'Cinzel', Georgia, serif"
          fontWeight="600"
        >
          Back to Lobby
        </Button>
      </VStack>
    </VStack>
  )
}

/* ── Main BattleArena ──────────────────────────────────────────── */

export default function BattleArena({
  phase,
  myCards,
  selectedIndex,
  opponentPicked,
  roundResult,
  matchWinner,
  isHost,
  onPickCard,
  onPlayAgain,
  onRematch,
  scoreA,
  scoreB,
  currentRound,
  usedIndices,
  allRounds,
}: BattleArenaProps) {
  // Auto-advance from REVEAL to RESOLUTION after dramatic pause
  const [localPhase, setLocalPhase] = useState<BattlePhase>(phase)

  useEffect(() => {
    setLocalPhase(phase)
  }, [phase])

  useEffect(() => {
    if (localPhase === "REVEAL") {
      const timer = setTimeout(() => setLocalPhase("RESOLUTION"), 2500)
      return () => clearTimeout(timer)
    }
  }, [localPhase])

  return (
    <>
      <style>{BATTLE_KEYFRAMES}</style>

      <Box w="full" maxW="500px" px="2" maxH="100dvh" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        {/* Score banner — show during picking, reveal, resolution, round-summary */}
        {localPhase !== "MATCH_END" && (
          <ScoreBanner scoreA={scoreA} scoreB={scoreB} currentRound={currentRound} isHost={isHost} />
        )}

        {localPhase === "PICKING" && (
          <PickingPhase
            myCards={myCards}
            selectedIndex={selectedIndex}
            opponentPicked={opponentPicked}
            onPickCard={onPickCard}
            usedIndices={usedIndices}
            currentRound={currentRound}
          />
        )}

        {localPhase === "REVEAL" && roundResult && (
          <RevealPhase roundResult={roundResult} isHost={isHost} />
        )}

        {localPhase === "RESOLUTION" && roundResult && (
          <ResolutionPhase roundResult={roundResult} isHost={isHost} />
        )}

        {localPhase === "ROUND_SUMMARY" && (
          <RoundSummaryPhase
            allRounds={allRounds}
            isHost={isHost}
            scoreA={scoreA}
            scoreB={scoreB}
          />
        )}

        {localPhase === "MATCH_END" && (
          <MatchEndPhase
            matchWinner={matchWinner}
            isHost={isHost}
            onPlayAgain={onPlayAgain}
            onRematch={onRematch}
            scoreA={scoreA}
            scoreB={scoreB}
            allRounds={allRounds}
          />
        )}
      </Box>
    </>
  )
}
