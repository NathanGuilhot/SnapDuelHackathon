import { Box, HStack } from "@chakra-ui/react"
import type { ReactionId } from "../../shared/types"
import { REACTION_DATA, REACTIONS } from "../lib/reactions"

interface ReactionBarProps {
  onSend: (id: ReactionId) => void
  cooldown: boolean
}

export default function ReactionBar({ onSend, cooldown }: ReactionBarProps) {
  return (
    <HStack
      position="fixed"
      bottom="env(safe-area-inset-bottom, 8px)"
      left="50%"
      transform="translateX(-50%)"
      bg="rgba(0,0,0,0.7)"
      backdropFilter="blur(12px)"
      borderRadius="full"
      px="3"
      py="1.5"
      gap="1"
      border="1px solid rgba(184,134,11,0.3)"
      zIndex={50}
      opacity={cooldown ? 0.5 : 1}
      transition="opacity 0.2s"
    >
      {REACTIONS.map((r) => (
        <Box
          key={r.id}
          as="button"
          aria-label={REACTION_DATA[r.id].label}
          fontSize="xl"
          minW="44px"
          minH="44px"
          w="44px"
          h="44px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="full"
          cursor={cooldown ? "default" : "pointer"}
          transition="transform 0.15s, background 0.15s"
          _hover={cooldown ? undefined : { bg: "rgba(242,116,5,0.2)", transform: "scale(1.2)" }}
          _active={cooldown ? undefined : { transform: "scale(0.9)" }}
          onClick={() => {
            if (cooldown) return
            onSend(r.id)
          }}
          aria-disabled={cooldown}
          pointerEvents={cooldown ? "none" : "auto"}
          lineHeight="1"
          userSelect="none"
        >
          {r.emoji}
        </Box>
      ))}
    </HStack>
  )
}
