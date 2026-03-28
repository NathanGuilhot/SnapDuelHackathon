import { useEffect, useRef, useState } from "react"
import { Box, HStack, Text } from "@chakra-ui/react"
import CardBack from "./CardBack"
import { MAX_CARD_USES } from "../../shared/constants"

const SHUFFLE_KEYFRAMES = `
@keyframes shuffleGather {
  0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
  40%  { transform: translate(var(--gather-x), var(--gather-y)) rotate(var(--gather-rot)) scale(0.88); opacity: 0.7; }
  50%  { transform: translate(var(--gather-x), var(--gather-y)) rotate(calc(var(--gather-rot) * -0.6)) scale(0.88); opacity: 0.7; }
  60%  { transform: translate(var(--gather-x), var(--gather-y)) rotate(var(--gather-rot)) scale(0.88); opacity: 0.7; }
  100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
}
@keyframes selectedGlow {
  0%, 100% { box-shadow: 0 0 8px 2px rgba(34,170,68,0.3); }
  50%      { box-shadow: 0 0 16px 6px rgba(34,170,68,0.6); }
}
`

interface OpponentCardBacksProps {
  cardCount: number
  usedIndices: number[]
  hoveredIndex: number | null
  opponentPicked: boolean
  shuffleCounter: number
}

const CARD_W = 56
const CARD_H = 80

export default function OpponentCardBacks({
  cardCount,
  usedIndices,
  hoveredIndex,
  opponentPicked,
  shuffleCounter,
}: OpponentCardBacksProps) {
  const useCounts = new Map<number, number>()
  for (const idx of usedIndices) {
    useCounts.set(idx, (useCounts.get(idx) ?? 0) + 1)
  }
  const activeIndices = Array.from({ length: cardCount }, (_, i) => i).filter(
    (i) => (useCounts.get(i) ?? 0) < MAX_CARD_USES,
  )

  const [isShuffling, setIsShuffling] = useState(false)
  const prevCounter = useRef(shuffleCounter)
  const shuffleRotations = useRef<number[]>([])

  useEffect(() => {
    if (shuffleCounter > prevCounter.current) {
      prevCounter.current = shuffleCounter
      shuffleRotations.current = Array.from({ length: cardCount }, () =>
        (Math.random() - 0.5) * 12
      )
      setIsShuffling(true)
      const timer = setTimeout(() => setIsShuffling(false), 700)
      return () => clearTimeout(timer)
    }
  }, [shuffleCounter, cardCount])

  if (activeIndices.length === 0) return null

  return (
    <>
      <style>{SHUFFLE_KEYFRAMES}</style>
      <Box w="full">
        <Text
          fontSize="xs"
          fontWeight="600"
          fontFamily="'Cinzel', Georgia, serif"
          color="fg.muted"
          textAlign="center"
          mb="1"
          letterSpacing="0.05em"
        >
          Opponent
        </Text>
        <HStack justify="center" gap="2">
          {activeIndices.map((cardIdx, i) => {
            const isHovered = !opponentPicked && hoveredIndex === cardIdx
            const OPP_CARD_STRIDE = CARD_W + 8
            const centerPos = (activeIndices.length - 1) / 2
            const gatherX = -((i - centerPos) * OPP_CARD_STRIDE)
            const gatherRot = shuffleRotations.current[i] ?? 0

            return (
              <Box
                key={cardIdx}
                style={
                  isShuffling
                    ? {
                        "--gather-x": `${gatherX}px`,
                        "--gather-y": "0px",
                        "--gather-rot": `${gatherRot}deg`,
                        animation: "shuffleGather 700ms cubic-bezier(0.34,1.56,0.64,1) both",
                      } as React.CSSProperties
                    : undefined
                }
              >
                <CardBack
                  width={CARD_W}
                  height={CARD_H}
                  isHovered={isHovered}
                  isSelected={false}
                />
              </Box>
            )
          })}
        </HStack>

        {/* Opponent picked indicator */}
        {opponentPicked && (
          <Text
            fontSize="xs"
            fontWeight="700"
            fontFamily="'Cinzel', Georgia, serif"
            color="rgba(34,170,68,0.9)"
            textAlign="center"
            mt="1"
            textShadow="0 0 8px rgba(34,170,68,0.4)"
            style={{ animation: "selectedGlow 1.5s ease-in-out infinite" }}
          >
            Locked in
          </Text>
        )}
      </Box>
    </>
  )
}
