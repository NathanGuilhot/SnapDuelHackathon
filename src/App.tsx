import { useState } from "react"
import {
  Box,
  Button,
  Heading,
  Image,
  Spinner,
  Text,
  VStack,
  HStack,
  Badge,
} from "@chakra-ui/react"
import CameraCapture from "./components/CameraCapture"
import { preprocessImage, cropToSquare } from "./lib/imageProcessing"
import { snapLog } from "../shared/debug.ts"
import type { Card } from "../shared/types.ts"

const ELEMENT_COLORS: Record<string, string> = {
  fire: "orange",
  water: "blue",
  nature: "green",
  neutral: "purple",
}

function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [geminiBlob, setGeminiBlob] = useState<Blob | null>(null)
  const [cardBlob, setCardBlob] = useState<Blob | null>(null)
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateCard(resized: Blob, cropped: Blob) {
    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append("resized", resized, "resized.jpg")
      form.append("cropped", cropped, "cropped.jpg")

      const res = await fetch("/api/generate-card", {
        method: "POST",
        body: form,
      })

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

      const data: Card = await res.json()
      setCard(data)
      snapLog("CARD_RECEIVED", { id: data.id, name: data.name })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      snapLog("GENERATE_ERROR", { error: msg })
    } finally {
      setLoading(false)
    }
  }

  async function handleCapture(file: File) {
    try {
      const originalKB = Math.round(file.size / 1024)

      const [resized, cropped] = await Promise.all([
        preprocessImage(file),
        cropToSquare(file),
      ])

      const resizedKB = Math.round(resized.size / 1024)
      const croppedKB = Math.round(cropped.size / 1024)

      snapLog("PREPROCESS", { originalKB, resizedKB, croppedKB })

      setGeminiBlob(resized)
      setCardBlob(cropped)
      setPreviewUrl(URL.createObjectURL(resized))

      generateCard(resized, cropped)
    } catch (err) {
      snapLog("PREPROCESS_ERROR", { error: String(err) })
    }
  }

  function handleRetry() {
    if (geminiBlob && cardBlob) {
      generateCard(geminiBlob, cardBlob)
    }
  }

  function handleReset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setGeminiBlob(null)
    setCardBlob(null)
    setCard(null)
    setLoading(false)
    setError(null)
  }

  const hasCapture =
    geminiBlob !== null && cardBlob !== null && previewUrl !== null

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

      {hasCapture ? (
        <VStack gap="4" p="5" align="center" w="full" maxW="400px">
          {card ? (
            <>
              <Image
                src={card.imageUrl}
                alt={card.name}
                w="full"
                borderRadius="xl"
                border="2px solid"
                borderColor="border"
                objectFit="cover"
                aspectRatio="1/1"
              />
              <VStack gap="2" w="full" align="center">
                <HStack gap="3" align="baseline">
                  <Text fontWeight="700" fontSize="2xl" color="fg.heading">
                    {card.name}
                  </Text>
                  <Badge
                    colorPalette={ELEMENT_COLORS[card.element]}
                    size="lg"
                    textTransform="capitalize"
                  >
                    {card.element}
                  </Badge>
                </HStack>
                <HStack gap="4" w="full" justify="center">
                  <Text fontSize="md" color="fg">
                    ATK {card.attack}
                  </Text>
                  <Text fontSize="md" color="fg">
                    DEF {card.defense}
                  </Text>
                  <Text fontSize="md" color="fg">
                    HP {card.hp}
                  </Text>
                </HStack>
                <Text
                  fontStyle="italic"
                  color="fg.muted"
                  fontSize="sm"
                  textAlign="center"
                >
                  "{card.quote}"
                </Text>
              </VStack>
            </>
          ) : loading ? (
            <>
              <Image
                src={previewUrl}
                alt="Captured photo"
                w="full"
                borderRadius="xl"
                border="2px solid"
                borderColor="border"
                objectFit="cover"
                aspectRatio="1/1"
              />
              <HStack gap="3">
                <Spinner size="sm" color="accent" />
                <Text color="accent" fontWeight="500" fontSize="lg">
                  Generating card...
                </Text>
              </HStack>
            </>
          ) : error ? (
            <>
              <Image
                src={previewUrl}
                alt="Captured photo"
                w="full"
                borderRadius="xl"
                border="2px solid"
                borderColor="border"
                objectFit="cover"
                aspectRatio="1/1"
              />
              <Text color="fg.error" fontWeight="500" fontSize="md">
                {error}
              </Text>
              <Button
                size="lg"
                colorPalette="purple"
                w="full"
                maxW="320px"
                onClick={handleRetry}
              >
                Retry
              </Button>
            </>
          ) : null}
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
