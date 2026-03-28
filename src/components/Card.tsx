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
  0%   { box-shadow: 0 0 20px 8px var(--glow-color), 0 0 40px 15px var(--glow-color); }
  100% { box-shadow: 0 0 8px 2px var(--glow-color), 0 0 16px 4px var(--glow-color); }
}
@keyframes aiImageFadeIn {
  0%   { opacity: 0; filter: brightness(1.8); transform: scale(1.04); }
  40%  { opacity: 1; filter: brightness(1.4); transform: scale(1.02); }
  100% { opacity: 1; filter: brightness(1);   transform: scale(1); }
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
  ratio = 1,
}: {
  value: number
  color: string
  label: string
  ratio?: number
}) {
  const size = `${Math.round(32 * ratio)}px`
  const font = `${Math.max(8, Math.round(11 * ratio))}px`
  return (
    <Tip label={`${label}: ${value}`}>
      <Box
        w={size}
        h={size}
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
        <Text fontSize={font} fontWeight="800" color="white" lineHeight="1">
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
  width?: number   // default 280
  height?: number  // default 400
  animate?: boolean // default false — only play summon animations when true
}

export default function CardBattle({ card, aiImageUrl, aiGenerating, width, height, animate = false }: CardBattleProps) {
  const theme = ELEMENT_THEMES[card.element]
  const elementSrc = ELEMENT_IMAGE[card.element]

  const w = width ?? 280
  const h = height ?? 400
  const r = w / 280 // ratio for scaling internal dimensions

  const nameFontSize = `${Math.max(7, Math.round(14 * r))}px`
  const quoteFontSize = `${Math.max(5, Math.round(9 * r))}px`
  const iconW = `${Math.round(50 * r)}px`
  const iconH = `${Math.round(60 * r)}px`
  const iconMt = `${Math.round(-25 * r)}px`
  const iconMr = `${Math.round(-10 * r)}px`
  const innerMargin = `${Math.round(6 * r)}px`
  const innerRadius = `${Math.round(12 * r)}px`
  const headerPx = `${Math.round(10 * r)}px`
  const headerPt = `${Math.round(8 * r)}px`
  const headerPb = `${Math.round(4 * r)}px`
  const illustrationMx = `${Math.round(8 * r)}px`
  const illustrationMb = `${Math.round(6 * r)}px`
  const statsPb = `${Math.round(8 * r)}px`
  const statsGap = `${Math.round(12 * r)}px`
  const quotePx = `${Math.round(10 * r)}px`
  const quoteMb = `${Math.round(4 * r)}px`

  return (
    <>
      <style>{KEYFRAMES_CSS}</style>

      <Box
        w={`${w}px`}
        h={`${h}px`}
        position="relative"
        borderRadius={`${Math.max(10, Math.round(16 * r))}px`}
        border="3px solid"
        borderColor={theme.border}
        overflow="visible"
        flexShrink={0}
        style={
          {
            "--glow-color": theme.glow,
            background: theme.gradient,
            ...(animate
              ? {
                  animation:
                    "cardSummonScale 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both, cardSummonGlow 800ms ease-out both",
                }
              : {}),
          } as React.CSSProperties
        }
      >
        {/* Brightness flash overlay */}
        {animate && (
          <Box
            position="absolute"
            inset="0"
            bg="white"
            borderRadius={`${Math.max(7, Math.round(13 * r))}px`}
            pointerEvents="none"
            zIndex={10}
            style={{ animation: "cardSummonFlash 400ms ease-out forwards" }}
          />
        )}

        {/* Inner gold-bordered frame */}
        <Box
          m={innerMargin}
          border="1px solid #b8860b"
          borderRadius={innerRadius}
          h={`calc(100% - ${Math.round(12 * r)}px)`}
          display="flex"
          flexDirection="column"
          overflow="visible"
        >
          {/* Header: name + element emoji */}
          <HStack
            justify="space-between"
            align="flex-start"
            px={headerPx}
            pt={headerPt}
            pb={headerPb}
            gap="2"
          >
            <Text
              fontFamily="'Cinzel', Georgia, serif"
              fontWeight="700"
              fontSize={nameFontSize}
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
                w={iconW}
                h={iconH}
                style={{
                  flexShrink: 0,
                  cursor: "default",
                  marginTop: iconMt,
                  marginRight: iconMr,
                  filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.55)) drop-shadow(0 6px 14px rgba(0,0,0,0.35))",
                }}
              />
            </Tip>
          </HStack>

          {/* Illustration */}
          <Box
            mx={illustrationMx}
            mb={illustrationMb}
            flex="1"
            border="1px solid #b8860b"
            borderRadius={`${Math.max(4, Math.round(6 * r))}px`}
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
                  animation: "aiImageFadeIn 1200ms ease-out forwards",
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
                  bottom={`${Math.round(6 * r)}px`}
                  left="50%"
                  transform="translateX(-50%)"
                  bg="rgba(0,0,0,0.7)"
                  backdropFilter="blur(4px)"
                  borderRadius="full"
                  px={`${Math.round(10 * r)}px`}
                  py={`${Math.round(3 * r)}px`}
                  display="flex"
                  alignItems="center"
                  gap={`${Math.round(6 * r)}px`}
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
                    fontSize={`${Math.max(7, Math.round(9 * r))}px`}
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
          <HStack justify="center" gap={statsGap} pb={statsPb} px={headerPx}>
            <StatCircle value={card.attack} color="#cc2222" label="Attack" ratio={r} />
            <StatCircle value={card.defense} color="#2266cc" label="Defense" ratio={r} />
            <StatCircle value={card.hp} color="#22aa44" label="HP" ratio={r} />
          </HStack>

          {/* Quote */}
          <Text
            px={quotePx}
            mb={quoteMb}
            fontFamily="'Cinzel', Georgia, serif"
            fontStyle="italic"
            fontSize={quoteFontSize}
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
