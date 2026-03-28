import { useState } from "react"
import {
  Box,
  Button,
  HStack,
  Image,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { X, Plus, Camera, BookOpen } from "lucide-react"
import CameraCapture from "./CameraCapture"
import CardBattle from "./Card"
import { ErrorTap } from "./ErrorModal"
import type { Card } from "../../shared/types"
import { HAND_SIZE } from "../../shared/constants"

type SubView = "default" | "camera" | "collection"

interface HandBuilderProps {
  hand: Card[]
  collection: Card[]
  latestCard: Card | null
  isGenerating: boolean
  generatingPreviewUrl: string | null
  generatingError: string | null
  aiImageUrl: string | null
  aiGenerating: boolean
  handReady: boolean
  opponentReady: boolean
  onCapture: (file: File) => void
  onRetry: () => void
  onAddFromCollection: (card: Card) => void
  onRemoveFromHand: (index: number) => void
  onReady: () => void
  onReset: () => void
}

const SLOT_W = 116
const SLOT_H = 166

export default function HandBuilder({
  hand,
  collection,
  latestCard,
  isGenerating,
  generatingPreviewUrl,
  generatingError,
  aiImageUrl,
  aiGenerating,
  handReady,
  opponentReady,
  onCapture,
  onRetry,
  onAddFromCollection,
  onRemoveFromHand,
  onReady,
  onReset,
}: HandBuilderProps) {
  const [subView, setSubView] = useState<SubView>("default")
  const handFull = hand.length >= HAND_SIZE
  const handIds = new Set(hand.map((c) => c.id))
  const availableCollection = collection.filter((c) => !handIds.has(c.id))

  function handleCaptureAndReturn(file: File) {
    onCapture(file)
    setSubView("default")
  }

  function handlePickFromCollection(card: Card) {
    onAddFromCollection(card)
    if (hand.length + 1 >= HAND_SIZE) {
      setSubView("default")
    }
  }

  // Show generating state
  if (isGenerating && generatingPreviewUrl) {
    return (
      <VStack gap="4" p="5" align="center" w="full" maxW="400px">
        <Image
          src={generatingPreviewUrl}
          alt="Captured photo"
          w="full"
          borderRadius="xl"
          border="2px solid"
          borderColor="accent"
          objectFit="cover"
          aspectRatio="1/1"
          shadow="0 0 20px rgba(242, 116, 5, 0.2)"
        />
        <HStack gap="3">
          <Spinner size="sm" color="accent" />
          <Text color="accent" fontWeight="500" fontSize="lg">
            Generating card...
          </Text>
        </HStack>
      </VStack>
    )
  }

  // Show error state
  if (generatingError && generatingPreviewUrl) {
    return (
      <VStack gap="4" p="5" align="center" w="full" maxW="400px">
        <Image
          src={generatingPreviewUrl}
          alt="Captured photo"
          w="full"
          borderRadius="xl"
          border="2px solid"
          borderColor="border"
          objectFit="cover"
          aspectRatio="1/1"
          shadow="0 0 20px rgba(242, 116, 5, 0.1)"
        />
        <ErrorTap message={generatingError} />
        <Button size="lg" colorPalette="orange" w="full" maxW="320px" onClick={onRetry}>
          Retry
        </Button>
        <Button size="lg" variant="outline" colorPalette="teal" w="full" maxW="320px" onClick={onReset}>
          Start Over
        </Button>
      </VStack>
    )
  }

  // Show latest card preview (just generated, waiting to be acknowledged)
  if (latestCard && !handFull && subView === "default" && hand.length > 0 && hand[hand.length - 1]?.id === latestCard.id) {
    // Card was just generated and auto-added — show it briefly then return to default
    // Actually, we just show the default view which includes the card in the hand slots
  }

  // Camera sub-view
  if (subView === "camera") {
    return (
      <VStack gap="4" align="center" w="full" maxW="400px">
        <Button
          alignSelf="flex-start"
          size="sm"
          variant="ghost"
          colorPalette="orange"
          onClick={() => setSubView("default")}
        >
          Back to Hand
        </Button>
        <CameraCapture onCapture={handleCaptureAndReturn} />
      </VStack>
    )
  }

  // Collection picker sub-view
  if (subView === "collection") {
    return (
      <VStack gap="4" align="center" w="full" maxW="500px" p="4">
        <HStack justify="space-between" w="full">
          <Text
            fontSize="lg"
            fontWeight="700"
            fontFamily="'Cinzel', Georgia, serif"
            color="fg.heading"
          >
            Select from Collection
          </Text>
          <Button size="sm" variant="ghost" colorPalette="orange" onClick={() => setSubView("default")}>
            Back
          </Button>
        </HStack>

        {availableCollection.length === 0 ? (
          <Text color="fg.muted" fontSize="sm" py="8">
            No available cards. All your cards are already in your hand.
          </Text>
        ) : (
          <SimpleGrid columns={{ base: 2, md: 3 }} gap="3" justifyItems="center" w="full">
            {availableCollection.map((card) => (
              <Box
                key={card.id}
                w={`${SLOT_W}px`}
                h={`${SLOT_H}px`}
                cursor="pointer"
                transition="transform 0.2s"
                _hover={{ transform: "translateY(-4px)" }}
                onClick={() => handlePickFromCollection(card)}
                borderRadius="12px"
                overflow="visible"
              >
                <CardBattle card={card} width={SLOT_W} height={SLOT_H} />
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    )
  }

  // Default view: hand slots + action buttons
  return (
    <VStack gap="5" align="center" w="full" maxW="420px" p="4">
      {/* Header */}
      <VStack gap="1">
        <Text
          fontSize="xl"
          fontWeight="700"
          fontFamily="'Cinzel', Georgia, serif"
          color="fg.heading"
          textShadow="0 0 20px rgba(242,116,5,0.3)"
        >
          Forge Your Hand
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {hand.length}/{HAND_SIZE} cards
        </Text>
      </VStack>

      {/* Hand slots */}
      <HStack gap="3" justify="center">
        {Array.from({ length: HAND_SIZE }, (_, i) => {
          const card = hand[i]
          if (card) {
            return (
              <Box key={card.id} position="relative">
                <Box borderRadius="12px" overflow="visible">
                  <CardBattle
                    card={card}
                    width={SLOT_W}
                    height={SLOT_H}
                    aiImageUrl={latestCard?.id === card.id ? aiImageUrl : undefined}
                    aiGenerating={latestCard?.id === card.id ? aiGenerating : false}
                  />
                </Box>
                {!handReady && (
                  <Box
                    position="absolute"
                    top="-6px"
                    right="-6px"
                    w="24px"
                    h="24px"
                    borderRadius="full"
                    bg="rgba(224,82,82,0.9)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    onClick={() => onRemoveFromHand(i)}
                    zIndex={10}
                    border="2px solid rgba(255,255,255,0.2)"
                    _hover={{ bg: "rgba(224,82,82,1)" }}
                  >
                    <X size={12} color="white" />
                  </Box>
                )}
              </Box>
            )
          }
          return (
            <Box
              key={`empty-${i}`}
              w={`${SLOT_W}px`}
              h={`${SLOT_H}px`}
              borderRadius="12px"
              border="2px dashed"
              borderColor="border"
              display="flex"
              alignItems="center"
              justifyContent="center"
              opacity={0.5}
            >
              <Plus size={24} color="#6b8a80" />
            </Box>
          )
        })}
      </HStack>

      {/* Action buttons */}
      {!handReady && !handFull && (
        <VStack gap="3" w="full" maxW="320px">
          <Button
            size="lg"
            colorPalette="orange"
            w="full"
            onClick={() => setSubView("camera")}
          >
            <Camera size={18} />
            Snap New Card
          </Button>
          {availableCollection.length > 0 && (
            <Button
              size="lg"
              variant="outline"
              colorPalette="teal"
              w="full"
              onClick={() => setSubView("collection")}
            >
              <BookOpen size={18} />
              From Collection ({availableCollection.length})
            </Button>
          )}
        </VStack>
      )}

      {/* Ready section */}
      {!handReady && handFull && (
        <Button
          size="lg"
          colorPalette="orange"
          w="full"
          maxW="320px"
          fontFamily="'Cinzel', Georgia, serif"
          fontWeight="700"
          letterSpacing="0.05em"
          onClick={onReady}
        >
          Ready to Battle!
        </Button>
      )}

      {handReady && (
        <HStack gap="3">
          <Spinner size="sm" color="accent" />
          <Text color="fg.muted" fontWeight="500" fontSize="lg">
            {opponentReady
              ? "Both ready! Starting battle..."
              : "Waiting for opponent\u2019s card..."}
          </Text>
        </HStack>
      )}

      {/* Start Over */}
      {!handReady && hand.length === 0 && (
        <Button
          size="lg"
          variant="outline"
          colorPalette="teal"
          w="full"
          maxW="320px"
          onClick={onReset}
        >
          Start Over
        </Button>
      )}
    </VStack>
  )
}
