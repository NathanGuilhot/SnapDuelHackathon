import type { ReactNode } from "react"
import {
  Box,
  HStack,
  Image,
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

import fireImg from "../assets/elements/fire.png"
import waterImg from "../assets/elements/water.png"
import natureImg from "../assets/elements/nature.png"
import neutralImg from "../assets/elements/neutral.png"

const ELEMENT_IMAGE: Record<Element, string> = {
  fire: fireImg,
  water: waterImg,
  nature: natureImg,
  neutral: neutralImg,
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
@keyframes aiImageFadeIn {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes aiShimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
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
  aiImageUrl?: string | null
  aiGenerating?: boolean
}

export default function CardBattle({ card, aiImageUrl, aiGenerating }: CardBattleProps) {
  const theme = ELEMENT_THEMES[card.element]
  const elementSrc = ELEMENT_IMAGE[card.element]

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
        // visible: l'icône élément peut dépasser le cadre (même emplacement, non rognée)
        overflow="visible"
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
          overflow="visible"
        >
          {/* Header: name + element emoji */}
          <HStack
            justify="space-between"
            align="flex-start"
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
              flex="1"
              minW={0}
              textAlign="left"
              overflowWrap="break-word"
            >
              {card.name}
            </Text>
            <Tip label={ELEMENT_DESCRIPTION[card.element]}>
              <Image
                src={elementSrc}
                alt={card.element}
                w="50px"
                h="60px"
                style={{
                  flexShrink: 0,
                  cursor: "default",
                  marginTop: "-25px",
                  marginRight: "-10px",
                  filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.55)) drop-shadow(0 6px 14px rgba(0,0,0,0.35))",
                }}
              />
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
            {/* Photo layer (always present) */}
            <img
              src={card.imageUrl}
              alt={card.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                position: "absolute",
                inset: 0,
              }}
            />
            {/* AI illustration layer (fades in over the photo) */}
            {aiImageUrl && (
              <img
                src={aiImageUrl}
                alt={`${card.name} illustration`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  position: "absolute",
                  inset: 0,
                  animation: "aiImageFadeIn 600ms ease-out forwards",
                }}
              />
            )}
            {/* Generating indicator — shimmer + label */}
            {aiGenerating && !aiImageUrl && (
              <>
                <Box
                  position="absolute"
                  inset="0"
                  overflow="hidden"
                  pointerEvents="none"
                  zIndex={2}
                >
                  <Box
                    position="absolute"
                    inset="0"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                      animation: "aiShimmer 1.8s ease-in-out infinite",
                    }}
                  />
                </Box>
                <Box
                  position="absolute"
                  bottom="6px"
                  left="50%"
                  transform="translateX(-50%)"
                  bg="rgba(0,0,0,0.7)"
                  backdropFilter="blur(4px)"
                  borderRadius="full"
                  px="10px"
                  py="3px"
                  display="flex"
                  alignItems="center"
                  gap="6px"
                  zIndex={3}
                >
                  <Box
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg={theme.border}
                    style={{
                      animation: "cardSummonGlow 1.5s ease-in-out infinite",
                      boxShadow: `0 0 6px ${theme.glow}`,
                    }}
                  />
                  <Text
                    fontSize="9px"
                    fontWeight="600"
                    color="#ccc"
                    whiteSpace="nowrap"
                    letterSpacing="0.03em"
                  >
                    AI painting...
                  </Text>
                </Box>
              </>
            )}
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
