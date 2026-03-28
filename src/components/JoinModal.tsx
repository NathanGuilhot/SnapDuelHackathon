import { useState } from "react"
import NiceModal, { useModal } from "@ebay/nice-modal-react"
import {
  Button,
  CloseButton,
  Dialog,
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"

const VALID_CODE = /^[A-HJ-NP-Z]{4}$/

interface JoinModalProps {
  onJoin: (code: string) => void
}

export const JoinModal = NiceModal.create(({ onJoin }: JoinModalProps) => {
  const modal = useModal()
  const [code, setCode] = useState("")

  const codeValid = VALID_CODE.test(code)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!codeValid) return
    modal.hide()
    onJoin(code)
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
                Join a Room
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body p="0">
              <form onSubmit={handleSubmit}>
                <VStack gap="5" w="full">
                  <VStack gap="1" w="full">
                    <Text
                      fontSize="sm"
                      color="fg.muted"
                      textTransform="uppercase"
                      letterSpacing="0.1em"
                    >
                      Room Code
                    </Text>
                    <Input
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.toUpperCase().slice(0, 4))
                      }
                      placeholder="ABCD"
                      maxLength={4}
                      fontFamily="mono"
                      fontSize="3xl"
                      textAlign="center"
                      letterSpacing="0.2em"
                      textTransform="uppercase"
                      h="64px"
                      border="2px solid"
                      borderColor={
                        code.length === 4 && !codeValid
                          ? "fg.error"
                          : "border"
                      }
                      bg="bg.code"
                      color="fg.heading"
                      _placeholder={{ color: "fg.muted", opacity: 0.4 }}
                      _focus={{
                        borderColor: "accent.border",
                        outline: "none",
                        boxShadow: "0 0 0 1px rgba(242, 116, 5, 0.3)",
                      }}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {code.length === 4 && !codeValid && (
                      <Text color="fg.error" fontSize="xs">
                        Invalid code
                      </Text>
                    )}
                  </VStack>

                  <Button
                    type="submit"
                    size="lg"
                    colorPalette="orange"
                    w="full"
                    disabled={!codeValid}
                  >
                    Join Room
                  </Button>
                </VStack>
              </form>
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
