import { useState, useEffect } from "react"
import { Box, Button, HStack, Spinner, Text, VStack } from "@chakra-ui/react"
import CardBattle from "./Card"
import type { Card, RoundResult, ElementAdvantage } from "../../shared/types"

/* ── Props ─────────────────────────────────────────────────────── */

type BattlePhase = "PICKING" | "REVEAL" | "RESOLUTION" | "MATCH_END"

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
  0%, 100% { box-shadow: 0 0 20px 5px rgba(255,215,0,0.4); }
  50%      { box-shadow: 0 0 40px 15px rgba(255,215,0,0.7), 0 0 80px 30px rgba(255,215,0,0.3); }
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
}: {
  card: Card
  animation: string
  delay: string
  isWinner?: boolean
  isLoser?: boolean
  damage?: number
  remainingHp?: number
  showDamage?: boolean
}) {
  const hpFraction = remainingHp != null ? Math.max(0, remainingHp / card.hp) : 1

  return (
    <Box
      position="relative"
      style={{
        animation: `${animation} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        animationDelay: delay,
        ...(isWinner ? { animation: `${animation} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both, winnerGlow 1.5s ease-in-out infinite` } : {}),
        ...(isLoser ? { animation: `${animation} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both, loserDim 800ms ease-out forwards` } : {}),
      }}
      borderRadius="18px"
    >
      <Box transform="scale(0.78)" transformOrigin="center">
        <CardBattle card={card} />
      </Box>

      {/* Damage number floating up */}
      {showDamage && damage != null && (
        <Text
          position="absolute"
          top="30%"
          left="50%"
          transform="translateX(-50%)"
          fontSize="3xl"
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
          w="180px"
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
      fontSize="4xl"
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

/* ── Picking Phase ─────────────────────────────────────────────── */

function PickingPhase({
  myCards,
  selectedIndex,
  opponentPicked,
  onPickCard,
}: {
  myCards: Card[]
  selectedIndex: number | null
  opponentPicked: boolean
  onPickCard: (index: number) => void
}) {
  const picked = selectedIndex !== null

  return (
    <VStack gap="5" align="center" w="full">
      <Text
        fontSize="2xl"
        fontWeight="700"
        fontFamily="'Cinzel', Georgia, serif"
        color="fg.heading"
        textShadow="0 0 20px rgba(242,116,5,0.3)"
      >
        Choose Your Champion
      </Text>

      <HStack gap="4" justify="center" flexWrap="wrap">
        {myCards.map((card, i) => (
          <Box
            key={card.id}
            position="relative"
            cursor={picked ? "default" : "pointer"}
            onClick={() => !picked && onPickCard(i)}
            opacity={picked && selectedIndex !== i ? 0.4 : 1}
            transition="opacity 0.3s, transform 0.2s"
            _hover={!picked ? { transform: "translateY(-4px)" } : undefined}
            style={
              !picked
                ? { animation: "pickGlow 2s ease-in-out infinite" }
                : selectedIndex === i
                  ? { animation: "winnerGlow 1.5s ease-in-out infinite" }
                  : undefined
            }
            borderRadius="18px"
          >
            <Box transform="scale(0.78)" transformOrigin="center">
              <CardBattle card={card} />
            </Box>

            {/* Selected checkmark overlay */}
            {picked && selectedIndex === i && (
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                w="60px"
                h="60px"
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
                <Text fontSize="2xl" lineHeight="1">
                  {"\u2714"}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </HStack>

      {/* Status text */}
      {picked ? (
        <HStack gap="3">
          {!opponentPicked && <Spinner size="sm" color="accent" />}
          <Text color="fg.muted" fontWeight="500" fontSize="lg">
            {opponentPicked
              ? "Both ready — resolving battle..."
              : "Waiting for opponent\u2019s pick..."}
          </Text>
        </HStack>
      ) : (
        <Text color="fg.muted" fontSize="md" fontStyle="italic">
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

  return (
    <VStack gap="3" align="center" w="full">
      <Text
        fontSize="2xl"
        fontWeight="700"
        fontFamily="'Cinzel', Georgia, serif"
        color="fg.heading"
        textShadow="0 0 20px rgba(242,116,5,0.3)"
      >
        Battle!
      </Text>

      {/* Opponent's card (top) */}
      <CardSlot card={oppCard} animation="slideFromTop" delay="0ms" />

      <VsBadge />

      {/* My card (bottom) */}
      <CardSlot card={myCard} animation="slideFromBottom" delay="300ms" />

      {/* Element advantage text */}
      {advText && (
        <Text
          fontSize="lg"
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

  return (
    <VStack gap="3" align="center" w="full">
      <Text
        fontSize="2xl"
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
      />
    </VStack>
  )
}

/* ── Match End Phase ───────────────────────────────────────────── */

function MatchEndPhase({
  roundResult,
  matchWinner: _matchWinner,
  isHost,
  onPlayAgain,
}: {
  roundResult: RoundResult
  matchWinner: "A" | "B" | "draw" | null
  isHost: boolean
  onPlayAgain: () => void
}) {
  const iWin = didIWin(roundResult, isHost)
  const draw = didIDraw(roundResult)
  const myCard = getMyCard(roundResult, isHost)
  const oppCard = getOppCard(roundResult, isHost)
  const oppDmg = getOppDamage(roundResult, isHost)

  const resultLabel = draw ? "DRAW" : iWin ? "VICTORY" : "DEFEAT"
  const resultColor = draw ? "#F27405" : iWin ? "#ffd700" : "#e05252"
  const resultAnimation = draw
    ? "victoryPulse 2s ease-in-out infinite"
    : iWin
      ? "victoryPulse 2s ease-in-out infinite"
      : "defeatPulse 2s ease-in-out infinite"

  return (
    <VStack gap="5" align="center" w="full">
      {/* Result banner */}
      <Text
        fontSize="5xl"
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

      {/* Both cards side by side — winner glowing, loser dimmed */}
      <HStack gap="2" justify="center" align="start" flexWrap="wrap">
        <CardSlot
          card={myCard}
          animation="slideFromBottom"
          delay="0.3s"
          isWinner={iWin}
          isLoser={!iWin && !draw}
        />
        <CardSlot
          card={oppCard}
          animation="slideFromTop"
          delay="0.5s"
          isWinner={!iWin && !draw}
          isLoser={iWin}
        />
      </HStack>

      {/* Summary */}
      {!draw && (
        <Text
          color="fg"
          fontSize="md"
          fontFamily="'Cinzel', Georgia, serif"
          textAlign="center"
          maxW="300px"
        >
          {iWin
            ? `${myCard.name} dealt ${oppDmg} damage!`
            : `${oppCard.name} overpowered ${myCard.name}!`}
        </Text>
      )}

      <Button
        size="lg"
        colorPalette="orange"
        w="full"
        maxW="320px"
        mt="2"
        onClick={onPlayAgain}
        fontFamily="'Cinzel', Georgia, serif"
        fontWeight="700"
        letterSpacing="0.05em"
      >
        Play Again
      </Button>
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

      <Box w="full" maxW="500px" px="2">
        {localPhase === "PICKING" && (
          <PickingPhase
            myCards={myCards}
            selectedIndex={selectedIndex}
            opponentPicked={opponentPicked}
            onPickCard={onPickCard}
          />
        )}

        {localPhase === "REVEAL" && roundResult && (
          <RevealPhase roundResult={roundResult} isHost={isHost} />
        )}

        {localPhase === "RESOLUTION" && roundResult && (
          <ResolutionPhase roundResult={roundResult} isHost={isHost} />
        )}

        {localPhase === "MATCH_END" && roundResult && (
          <MatchEndPhase
            roundResult={roundResult}
            matchWinner={matchWinner}
            isHost={isHost}
            onPlayAgain={onPlayAgain}
          />
        )}
      </Box>
    </>
  )
}
