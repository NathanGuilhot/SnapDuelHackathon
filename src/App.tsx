import { useState } from "react"
import { Box, Button, Heading, Image, Text, VStack } from "@chakra-ui/react"
import CameraCapture from "./components/CameraCapture"

function App() {
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function handleCapture(file: File) {
    setCapturedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleReset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedFile(null)
    setPreviewUrl(null)
  }

  return (
    <Box
      as="main"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      p={{ base: "6 4", lg: "8 5" }}
      gap="4"
    >
      <Heading
        as="h1"
        fontSize={{ base: "4xl", lg: "6xl" }}
        fontWeight="500"
        letterSpacing="-0.03em"
        color="fg.heading"
        my={{ base: "5", lg: "8" }}
      >
        SnapDuel
      </Heading>

      {capturedFile && previewUrl ? (
        <VStack gap="4" p="5" align="center">
          <Image
            src={previewUrl}
            alt="Captured photo"
            w="full"
            maxW="400px"
            borderRadius="xl"
            border="2px solid"
            borderColor="border"
            objectFit="cover"
            aspectRatio="1/1"
          />
          <Text color="accent" fontWeight="500" fontSize="lg">
            Photo captured! Ready for card generation.
          </Text>
          <Button
            size="lg"
            variant="outline"
            colorPalette="purple"
            w="full"
            maxW="320px"
            onClick={handleReset}
          >
            Start Over
          </Button>
        </VStack>
      ) : (
        <CameraCapture onCapture={handleCapture} />
      )}
    </Box>
  )
}

export default App
