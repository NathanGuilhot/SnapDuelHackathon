import NiceModal, { useModal } from "@ebay/nice-modal-react"
import {
  Box,
  CloseButton,
  Dialog,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"

interface ErrorModalProps {
  message: string
}

const ErrorModal = NiceModal.create(({ message }: ErrorModalProps) => {
  const modal = useModal()

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
                Error Details
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body p="0">
              <Text
                color="fg.error"
                fontSize="md"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
              >
                {message}
              </Text>
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
})

interface ErrorTapProps {
  message: string
  label?: string
}

export function ErrorTap({ message, label = "Something went wrong" }: ErrorTapProps) {
  function showDetails() {
    NiceModal.show(ErrorModal, { message })
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      cursor="pointer"
      onClick={showDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          showDetails()
        }
      }}
      aria-label="View error details"
      py="1"
    >
      <VStack gap="0">
        <Text color="fg.error" fontWeight="500" fontSize="md">
          {label}
        </Text>
        <Text color="fg.muted" fontSize="xs">
          Click or press Enter for details
        </Text>
      </VStack>
    </Box>
  )
}
