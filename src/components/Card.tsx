import type { ReactNode } from "react"
import {
  Box,
  HStack,
  Portal,
  Text,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipRoot,
  TooltipTrigger,
} from "@chakra-ui/react"
import type { Card, Element } from "../../shared/types"

/* ── Element theming ────────────────────────────────────────────── */

interface ElementTheme {
  gradient: string
  border: string
  glow: string
}

const ELEMENT_THEMES: Record<Element, ElementTheme> = {
  fire: {
    gradient: "linear-gradient(145deg, #1a0800 0%, #2d0e00 40%, #3d1500 100%)",
    border: "#ff6b00",
    glow: "rgba(255, 107, 0, 0.45)",
  },
  water: {
    gradient: "linear-gradient(145deg, #000d1a 0%, #001a33 40%, #00264d 100%)",
    border: "#0088ff",
    glow: "rgba(0, 136, 255, 0.45)",
  },
  nature: {
    gradient: "linear-gradient(145deg, #001a00 0%, #002e0a 40%, #003d12 100%)",
    border: "#00cc44",
    glow: "rgba(0, 204, 68, 0.45)",
  },
  neutral: {
    gradient: "linear-gradient(145deg, #0d0019 0%, #1a0033 40%, #26004d 100%)",
    border: "#9933ff",
    glow: "rgba(153, 51, 255, 0.45)",
  },
}

const ELEMENT_EMOJI: Record<Element, string> = {
  fire: "\u{1F525}",
  water: "\u{1F4A7}",
  nature: "\u{1F33F}",
  neutral: "⚪",
}

const ELEMENT_DESCRIPTION: Record<Element, string> = {
  fire: "Fire — Strong against Nature, weak against Water",
  water: "Water — Strong against Fire, weak against Nature",
  nature: "Nature — Strong against Water, weak against Fire",
  neutral: "Neutral — No elemental weakness or strength",
}

/* ── Tip (tooltip wrapper) ─────────────────────────────────────── */

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipRoot openDelay={0} closeDelay={100}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <Portal>
        <TooltipPositioner>
          <TooltipContent
            bg="#1a1a2e"
            color="#e8f0ed"
            fontSize="11px"
            fontWeight="500"
            px="8px"
            py="4px"
            borderRadius="6px"
            border="1px solid rgba(255,255,255,0.1)"
            boxShadow="0 4px 12px rgba(0,0,0,0.4)"
          >
            <TooltipArrow />
            {label}
          </TooltipContent>
        </TooltipPositioner>
      </Portal>
    </TooltipRoot>
  )
}

/* ── Keyframes (injected once via <style>) ──────────────────────── */

const KEYFRAMES_CSS = `
@keyframes cardSummonScale {
  0%   { transform: scale(0) rotate(-3deg); opacity: 0; }
  50%  { transform: scale(1.08) rotate(1deg); opacity: 1; }
  70%  { transform: scale(0.97) rotate(-0.5deg); }
  85%  { transform: scale(1.02) rotate(0.2deg); }
  100% { transform: scale(1) rotate(0deg); }
}
@keyframes cardSummonFlash {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes cardSummonGlow {
  0%   { box-shadow: 0 0 40px 15px var(--glow-color), 0 0 80px 30px var(--glow-color); }
  100% { box-shadow: 0 0 12px 2px var(--glow-color), 0 0 25px 5px var(--glow-color); }
}
`

/* ── StatCircle ─────────────────────────────────────────────────── */

function StatCircle({
  value,
  color,
  label,
}: {
  value: number
  color: string
  label: string
}) {
  return (
    <Tip label={`${label}: ${value}`}>
      <Box
        w="32px"
        h="32px"
        borderRadius="full"
        bg={color}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        border="2px solid rgba(255,255,255,0.15)"
        boxShadow={`0 0 6px ${color}`}
        cursor="default"
      >
        <Text fontSize="11px" fontWeight="800" color="white" lineHeight="1">
          {value}
        </Text>
      </Box>
    </Tip>
  )
}

/* ── CardBattle component ───────────────────────────────────────── */

interface CardBattleProps {
  card: Card
}

export default function CardBattle({ card }: CardBattleProps) {
  const theme = ELEMENT_THEMES[card.element]
  const emoji = ELEMENT_EMOJI[card.element]

  return (
    <>
      <style>{KEYFRAMES_CSS}</style>

      <Box
        w="280px"
        h="400px"
        position="relative"
        borderRadius="16px"
        border="3px solid"
        borderColor={theme.border}
        overflow="hidden"
        flexShrink={0}
        style={
          {
            "--glow-color": theme.glow,
            background: theme.gradient,
            animation:
              "cardSummonScale 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both, cardSummonGlow 800ms ease-out both",
          } as React.CSSProperties
        }
      >
        {/* Brightness flash overlay */}
        <Box
          position="absolute"
          inset="0"
          bg="white"
          borderRadius="13px"
          pointerEvents="none"
          zIndex={10}
          style={{ animation: "cardSummonFlash 400ms ease-out forwards" }}
        />

        {/* Inner gold-bordered frame */}
        <Box
          m="6px"
          border="1px solid #b8860b"
          borderRadius="12px"
          h="calc(100% - 12px)"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          {/* Header: name + element emoji */}
          <HStack
            justify="space-between"
            align="center"
            px="10px"
            pt="8px"
            pb="4px"
            gap="2"
          >
            <Text
              fontFamily="'Cinzel', Georgia, serif"
              fontWeight="700"
              fontSize="14px"
              color="#e8f0ed"
              lineHeight="1.2"
              textShadow="0 1px 4px rgba(0,0,0,0.6)"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              flex="1"
              textAlign="left"
            >
              {card.name}
            </Text>
            <Tip label={ELEMENT_DESCRIPTION[card.element]}>
              <Text fontSize="20px" lineHeight="1" flexShrink={0} cursor="default">
                {emoji}
              </Text>
            </Tip>
          </HStack>

          {/* Illustration */}
          <Box
            mx="8px"
            mb="6px"
            flex="1"
            border="1px solid #b8860b"
            borderRadius="6px"
            overflow="hidden"
            bg="#000"
            position="relative"
          >
            <img
              src={card.imageUrl}
              alt={card.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </Box>

          {/* Stats row */}
          <HStack justify="center" gap="12px" pb="8px" px="10px">
            <StatCircle value={card.attack} color="#cc2222" label="Attack" />
            <StatCircle value={card.defense} color="#2266cc" label="Defense" />
            <StatCircle value={card.hp} color="#22aa44" label="HP" />
          </HStack>

          {/* Quote */}
          <Text
            px="10px"
            mb="4px"
            fontFamily="'Cinzel', Georgia, serif"
            fontStyle="italic"
            fontSize="9px"
            color="#7a9990"
            textAlign="right"
            lineHeight="1.4"
            lineClamp={2}
          >
            &ldquo;{card.quote}&rdquo;
          </Text>
        </Box>
      </Box>
    </>
  )
}
