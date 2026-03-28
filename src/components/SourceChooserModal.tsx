import NiceModal, { useModal } from "@ebay/nice-modal-react"
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  VStack,
} from "@chakra-ui/react"

export type SourceChoice = "camera" | "upload"

interface SourceChooserModalProps {
  onChoose: (choice: SourceChoice) => void
}

export const SourceChooserModal = NiceModal.create(
  ({ onChoose }: SourceChooserModalProps) => {
    const modal = useModal()

    const handleChoice = (choice: SourceChoice) => {
      modal.hide()
      onChoose(choice)
    }

    return (
      <Dialog.Root
        open={modal.visible}
        onOpenChange={(e) => {
          if (!e.open) modal.hide()
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              p="8"
              maxW="360px"
              borderRadius="xl"
              bg="bg"
              border="1px solid"
              borderColor="border"
              shadow="0 0 40px rgba(0, 0, 0, 0.5)"
            >
              <Dialog.Header p="0" mb="4">
                <Dialog.Title
                  fontSize="xl"
                  fontWeight="600"
                  color="fg.heading"
                >
                  Ready Your Shot
                </Dialog.Title>
              </Dialog.Header>

              <Dialog.Body p="0">
                <VStack gap="4" w="full">
                  <Button
                    w="full"
                    size="lg"
                    colorPalette="orange"
                    onClick={() => handleChoice("camera")}
                  >
                    Use Camera
                  </Button>
                  <Button
                    w="full"
                    size="lg"
                    variant="outline"
                    colorPalette="teal"
                    onClick={() => handleChoice("upload")}
                  >
                    Upload File
                  </Button>
                </VStack>
              </Dialog.Body>

              <Dialog.CloseTrigger
                asChild
                position="absolute"
                top="3"
                insetEnd="3"
              >
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    )
  },
)
