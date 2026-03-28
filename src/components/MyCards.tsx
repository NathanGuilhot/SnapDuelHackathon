import NiceModal from "@ebay/nice-modal-react"
import { Box, Button, SimpleGrid, Text, VStack, useBreakpointValue } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"
import CardBattle from "./Card"
import CardPreviewModal from "./CardPreviewModal"
import type { Card } from "../../shared/types"
import type { KeyboardEvent } from "react"

interface MyCardsProps {
  cards: Card[]
  onBack: () => void
}

export default function MyCards({ cards, onBack }: MyCardsProps) {
  const cardW = useBreakpointValue({ base: 132, md: 154 }) ?? 132
  const cardH = Math.round((220 / 154) * cardW)

  function openPreview(card: Card) {
    NiceModal.show(CardPreviewModal, { card })
  }

  function cardKeyDown(e: KeyboardEvent, card: Card) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      openPreview(card)
    }
  }

  return (
    <VStack gap="5" align="center" w="full" maxW={{ base: "100%", md: "700px" }} px={{ base: 2, md: 0 }}>
      <Button
        alignSelf="flex-start"
        size="sm"
        variant="ghost"
        colorPalette="orange"
        onClick={onBack}
      >
        <ArrowLeft size={16} /> Back
      </Button>

      <Text
        fontSize="2xl"
        fontWeight="700"
        fontFamily="'Cinzel', Georgia, serif"
        color="fg.heading"
        textShadow="0 0 20px rgba(242,116,5,0.3)"
      >
        My Cards
      </Text>

      {cards.length === 0 ? (
        <VStack gap="3" py="10">
          <Text color="fg.muted" fontSize="lg">
            No cards yet
          </Text>
          <Text color="fg.muted" fontSize="sm">
            Create cards in Solo mode or multiplayer to see them here.
          </Text>
        </VStack>
      ) : (
        <SimpleGrid columns={{ base: 2, md: 3 }} gap="3" justifyItems="center" w="full">
          {cards.map((card) => (
            <Box
              key={card.id}
              as="button"
              w={`${cardW}px`}
              h={`${cardH}px`}
              p="0"
              border="none"
              bg="transparent"
              position="relative"
              overflow="visible"
              cursor="pointer"
              aria-label={`Open ${card.name}`}
              onClick={() => openPreview(card)}
              onKeyDown={(e) => cardKeyDown(e, card)}
            >
              <CardBattle card={card} width={cardW} height={cardH} />
            </Box>
          ))}
        </SimpleGrid>
      )}
    </VStack>
  )
}
