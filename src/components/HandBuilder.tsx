import { useState, type KeyboardEvent } from "react"
import {
  Box,
  Button,
  HStack,
  IconButton,
  Image,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react"
import NiceModal from "@ebay/nice-modal-react"
import { X, Plus, Camera, BookOpen } from "lucide-react"
import CameraCapture from "./CameraCapture"
import CardBattle from "./Card"
import CardPreviewModal from "./CardPreviewModal"
import { ErrorTap } from "./ErrorModal"
import type { Card } from "../../shared/types"
import { HAND_SIZE } from "../../shared/constants"

function cardPreviewKeyDown(
  e: KeyboardEvent,
  action: () => void,
) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    action()
  }
}

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
  const slotW = useBreakpointValue({ base: 92, sm: 100, md: 116 }) ?? 92
  const slotH = Math.round((166 / 116) * slotW)
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
                as="button"
                w={`${slotW}px`}
                h={`${slotH}px`}
                p="0"
                border="none"
                bg="transparent"
                cursor="pointer"
                transition="transform 0.2s"
                _hover={{ transform: "translateY(-4px)" }}
                aria-label={`Open preview: ${card.name}`}
                onClick={() =>
                  NiceModal.show(CardPreviewModal, {
                    card,
                    onAddToHand: () => handlePickFromCollection(card),
                  })
                }
                onKeyDown={(e) =>
                  cardPreviewKeyDown(e, () =>
                    NiceModal.show(CardPreviewModal, {
                      card,
                      onAddToHand: () => handlePickFromCollection(card),
                    }),
                  )
                }
                borderRadius="12px"
                overflow="visible"
              >
                <CardBattle card={card} width={slotW} height={slotH} />
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    )
  }

  // Default view: hand slots + action buttons
  return (
    <VStack gap="5" align="center" w="full" maxW={{ base: "100%", sm: "420px" }} p={{ base: 3, sm: 4 }}>
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
        {!handReady && (
          <Text color="fg.muted" fontSize="xs" maxW="320px" lineHeight="1.5">
            Fill your hand, then confirm to battle.
          </Text>
        )}
      </VStack>

      {/* Hand slots */}
      <HStack gap="3" justify="center" flexWrap="wrap" rowGap="3">
        {Array.from({ length: HAND_SIZE }, (_, i) => {
          const card = hand[i]
          if (card) {
            return (
              <Box key={card.id} position="relative">
                <Box
                  as="button"
                  p="0"
                  border="none"
                  bg="transparent"
                  borderRadius="12px"
                  overflow="visible"
                  cursor="pointer"
                  aria-label={`View ${card.name}`}
                  onClick={() =>
                    NiceModal.show(CardPreviewModal, {
                      card,
                      aiImageUrl: latestCard?.id === card.id ? aiImageUrl : undefined,
                      aiGenerating: latestCard?.id === card.id ? aiGenerating : false,
                    })
                  }
                  onKeyDown={(e) =>
                    cardPreviewKeyDown(e, () =>
                      NiceModal.show(CardPreviewModal, {
                        card,
                        aiImageUrl: latestCard?.id === card.id ? aiImageUrl : undefined,
                        aiGenerating: latestCard?.id === card.id ? aiGenerating : false,
                      }),
                    )
                  }
                >
                  <CardBattle
                    card={card}
                    width={slotW}
                    height={slotH}
                    aiImageUrl={latestCard?.id === card.id ? aiImageUrl : undefined}
                    aiGenerating={latestCard?.id === card.id ? aiGenerating : false}
                    animate={latestCard?.id === card.id}
                  />
                </Box>
                {!handReady && (
                  <IconButton
                    aria-label={`Remove ${card.name} from hand`}
                    position="absolute"
                    top="-8px"
                    right="-8px"
                    size="sm"
                    variant="solid"
                    colorPalette="red"
                    minW="44px"
                    minH="44px"
                    borderRadius="full"
                    bg="rgba(224,82,82,0.9)"
                    color="white"
                    border="2px solid rgba(255,255,255,0.2)"
                    zIndex={10}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveFromHand(i)
                    }}
                    _hover={{ bg: "rgba(224,82,82,1)" }}
                  >
                    <X size={16} color="white" />
                  </IconButton>
                )}
              </Box>
            )
          }
          return (
            <Box
              key={`empty-${i}`}
              w={`${slotW}px`}
              h={`${slotH}px`}
              borderRadius="12px"
              border="2px dashed"
              borderColor="border"
              display="flex"
              alignItems="center"
              justifyContent="center"
              opacity={0.5}
              aria-hidden
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
          <Text color="fg.muted" fontWeight="500" fontSize="lg" textAlign="center" px="2">
            {opponentReady
              ? "Both ready! Starting battle..."
              : "Waiting for opponent\u2019s hand..."}
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
