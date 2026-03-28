import NiceModal, { useModal } from "@ebay/nice-modal-react"
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
} from "@chakra-ui/react"
import { Plus } from "lucide-react"
import CardBattle from "./Card"
import type { Card } from "../../shared/types"

interface CardPreviewModalProps {
  card: Card
  aiImageUrl?: string | null
  aiGenerating?: boolean
  onAddToHand?: () => void
}

const CARD_ASPECT = 7 / 10

const CardPreviewModal = NiceModal.create(
  ({ card, aiImageUrl, aiGenerating, onAddToHand }: CardPreviewModalProps) => {
    const modal = useModal()

    const maxW = typeof window !== "undefined" ? window.innerWidth - 48 : 320
    const maxH = typeof window !== "undefined" ? window.innerHeight - 160 : 500
    const w = Math.min(maxW, maxH * CARD_ASPECT)
    const h = w / CARD_ASPECT

    function handleAdd() {
      modal.hide()
      onAddToHand?.()
    }

    return (
      <Dialog.Root
        open={modal.visible}
        onOpenChange={(e) => {
          if (!e.open) modal.hide()
        }}
      >
        <Portal>
          <Dialog.Backdrop
            bg="rgba(0,0,0,0.85)"
            backdropFilter="blur(8px)"
          />
          <Dialog.Positioner
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Dialog.Content
              bg="transparent"
              shadow="none"
              border="none"
              p="0"
              maxW="none"
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap="4"
            >
              <CardBattle
                card={card}
                width={w}
                height={h}
                aiImageUrl={aiImageUrl ?? undefined}
                aiGenerating={aiGenerating}
              />

              {onAddToHand && (
                <Button
                  size="lg"
                  colorPalette="orange"
                  w="full"
                  maxW="280px"
                  onClick={handleAdd}
                >
                  <Plus size={18} />
                  Add to Hand
                </Button>
              )}

              <Dialog.CloseTrigger
                asChild
                position="absolute"
                top="2"
                insetEnd="2"
              >
                <CloseButton
                  size="md"
                  bg="rgba(0,0,0,0.6)"
                  color="white"
                  borderRadius="full"
                  _hover={{ bg: "rgba(0,0,0,0.8)" }}
                />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    )
  }
)

export default CardPreviewModal
