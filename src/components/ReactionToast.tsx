import { useState, useEffect, useRef } from "react"
import { Box, Text } from "@chakra-ui/react"
import type { ReactionId } from "../../shared/types"

const REACTION_DATA: Record<ReactionId, { label: string; emoji: string }> = {
  gg:      { label: "Good game!",            emoji: "\u{1F91D}" },
  oops:    { label: "Oops!",                 emoji: "\u{1F62C}" },
  revenge: { label: "I'll get my revenge...", emoji: "\u{1F608}" },
  wow:     { label: "Wow!",                  emoji: "\u{1F62E}" },
  think:   { label: "Hmm, interesting...",    emoji: "\u{1F914}" },
  fear:    { label: "I'm scared...",          emoji: "\u{1F628}" },
}

const TOAST_KEYFRAMES = `
@keyframes reactionEnter {
  0%   { transform: translateX(-50%) translateY(20px) scale(0.5); opacity: 0; }
  50%  { transform: translateX(-50%) translateY(-5px) scale(1.1); opacity: 1; }
  100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
}
@keyframes reactionExit {
  0%   { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
  100% { transform: translateX(-50%) translateY(-30px) scale(0.8); opacity: 0; }
}
`

interface ReactionToastProps {
  reaction: { reactionId: ReactionId; ts: number } | null
}

type Phase = "hidden" | "entering" | "visible" | "exiting"

export default function ReactionToast({ reaction }: ReactionToastProps) {
  const [phase, setPhase] = useState<Phase>("hidden")
  const [current, setCurrent] = useState<ReactionId | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!reaction) return

    // Clear any pending timers
    if (timerRef.current) clearTimeout(timerRef.current)

    setCurrent(reaction.reactionId)
    setPhase("entering")

    // entering -> visible
    timerRef.current = setTimeout(() => {
      setPhase("visible")
      // visible -> exiting
      timerRef.current = setTimeout(() => {
        setPhase("exiting")
        // exiting -> hidden
        timerRef.current = setTimeout(() => {
          setPhase("hidden")
          setCurrent(null)
        }, 500)
      }, 2200)
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [reaction?.ts]) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "hidden" || !current) return null

  const data = REACTION_DATA[current]

  const animation =
    phase === "entering"
      ? "reactionEnter 300ms cubic-bezier(0.34,1.56,0.64,1) forwards"
      : phase === "exiting"
        ? "reactionExit 500ms ease-out forwards"
        : "none"

  return (
    <>
      <style>{TOAST_KEYFRAMES}</style>
      <Box
        position="absolute"
        top="48px"
        left="50%"
        transform="translateX(-50%)"
        zIndex={60}
        pointerEvents="none"
        style={{ animation }}
      >
        <Box
          bg="rgba(0,0,0,0.8)"
          backdropFilter="blur(12px)"
          borderRadius="full"
          px="4"
          py="2"
          border="1px solid rgba(242,116,5,0.4)"
          boxShadow="0 0 20px rgba(242,116,5,0.2)"
          display="flex"
          alignItems="center"
          gap="2"
          whiteSpace="nowrap"
        >
          <Text fontSize="lg" lineHeight="1">{data.emoji}</Text>
          <Text
            fontSize="sm"
            fontWeight="600"
            fontFamily="'Cinzel', Georgia, serif"
            color="rgba(255,255,255,0.9)"
            letterSpacing="0.02em"
          >
            {data.label}
          </Text>
        </Box>
      </Box>
    </>
  )
}
