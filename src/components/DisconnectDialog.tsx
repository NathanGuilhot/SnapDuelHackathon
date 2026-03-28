import { Button, Dialog, Portal, Text } from "@chakra-ui/react"

interface DisconnectDialogProps {
  open: boolean
  onDismiss: () => void
}

export default function DisconnectDialog({ open, onDismiss }: DisconnectDialogProps) {
  if (!open) return null

  return (
    <Dialog.Root
      open={open}
      role="alertdialog"
      onOpenChange={(e) => {
        if (!e.open) onDismiss()
      }}
    >
      <Portal>
        <Dialog.Backdrop bg="rgba(0,0,0,0.8)" backdropFilter="blur(4px)" />
        <Dialog.Positioner
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={100}
        >
          <Dialog.Content
            maxW="320px"
            w="full"
            bg="bg"
            border="1px solid"
            borderColor="border"
            borderRadius="xl"
            p="8"
            mx="4"
            shadow="0 0 40px rgba(0, 0, 0, 0.5)"
          >
            <Dialog.Header p="0" mb="4">
              <Dialog.Title
                fontSize="2xl"
                fontWeight="700"
                fontFamily="'Cinzel', Georgia, serif"
                color="#e05252"
                textShadow="0 0 20px rgba(224,82,82,0.5)"
              >
                Opponent Disconnected
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body p="0" mb="6">
              <Text color="fg.muted" textAlign="center">
                Your opponent has left the battle.
              </Text>
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <Button size="lg" colorPalette="orange" w="full">
                Back to Lobby
              </Button>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
