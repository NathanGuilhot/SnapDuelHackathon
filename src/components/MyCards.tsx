import { Box, Button, SimpleGrid, Text, VStack } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"
import CardBattle from "./Card"
import type { Card } from "../../shared/types"

interface MyCardsProps {
  cards: Card[]
  onBack: () => void
}

export default function MyCards({ cards, onBack }: MyCardsProps) {
  return (
    <VStack gap="5" align="center" w="full" maxW="700px">
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
              w="154px"
              h="220px"
              position="relative"
              overflow="visible"
            >
              <Box transform="scale(0.55)" transformOrigin="top left">
                <CardBattle card={card} />
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </VStack>
  )
}
