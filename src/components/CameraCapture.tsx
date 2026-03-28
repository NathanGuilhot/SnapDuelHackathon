import { useState, useRef, useEffect, useCallback } from "react"
import { Box, Button, Image, Text, VStack } from "@chakra-ui/react"
import NiceModal from "@ebay/nice-modal-react"
import { SourceChooserModal } from "./SourceChooserModal"
import type { Card } from "../../shared/types"

interface CameraCaptureProps {
  onCapture: (file: File) => void
  savedCards?: Card[]
  onUseSavedCards?: () => void
}

export default function CameraCapture({ onCapture, savedCards, onUseSavedCards }: CameraCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [streaming, setStreaming] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const url = previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [previewUrl])

  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [streaming])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStreaming(false)
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setCapturedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    },
    [],
  )

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      setStreaming(true)
    } catch {
      fileInputRef.current?.click()
    }
  }, [])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")!.drawImage(video, 0, 0)
    stopStream()
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" })
        setCapturedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
      },
      "image/jpeg",
      0.9,
    )
  }, [stopStream])

  const handleRetake = useCallback(() => {
    setPreviewUrl(null)
    setCapturedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleConfirm = useCallback(() => {
    if (capturedFile) onCapture(capturedFile)
  }, [capturedFile, onCapture])

  const handleTakePhoto = useCallback(() => {
    NiceModal.show(SourceChooserModal, {
      onChoose: (choice) => {
        if (choice === "camera") startWebcam()
        else fileInputRef.current?.click()
      },
    })
  }, [startWebcam])

  const handleChooseSaved = useCallback(() => {
    if (!savedCards || !onUseSavedCards) return
    onUseSavedCards()
  }, [savedCards, onUseSavedCards])

  return (
    <VStack gap="6" p="5" w="full" align="center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />

      {previewUrl ? (
        <>
          <Image
            src={previewUrl}
            alt="Captured photo"
            w="full"
            maxW="400px"
            borderRadius="xl"
            border="2px solid"
            borderColor="accent"
            objectFit="cover"
            aspectRatio="1/1"
            bg="bg.code"
            shadow="0 0 20px rgba(242, 116, 5, 0.2)"
          />
          <VStack gap="3" w="full" maxW="320px">
            <Button
              w="full"
              size="lg"
              colorPalette="orange"
              onClick={handleConfirm}
            >
              Use This Photo
            </Button>
            <Button
              w="full"
              size="lg"
              variant="outline"
              colorPalette="teal"
              onClick={handleRetake}
            >
              Retake
            </Button>
          </VStack>
        </>
      ) : streaming ? (
        <>
          <Box
            w="full"
            maxW="400px"
            borderRadius="xl"
            border="2px solid"
            borderColor="accent"
            overflow="hidden"
            aspectRatio="1/1"
            bg="black"
            shadow="0 0 30px rgba(242, 116, 5, 0.15)"
          >
            <video
              ref={videoRef}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
              autoPlay
              playsInline
              muted
            />
          </Box>
          <VStack gap="3" w="full" maxW="320px">
            <Button
              w="full"
              size="lg"
              colorPalette="orange"
              onClick={captureFrame}
            >
              Capture
            </Button>
            <Button
              w="full"
              size="lg"
              variant="outline"
              colorPalette="teal"
              onClick={stopStream}
            >
              Cancel
            </Button>
          </VStack>
        </>
      ) : (
        <VStack gap="6" align="center" py="8">
          <Box
            w="120px"
            h="120px"
            borderRadius="full"
            border="2px dashed"
            borderColor="accent"
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity="0.7"
          >
            <Text fontSize="4xl" lineHeight="1">
              {"\u{1F4F8}"}
            </Text>
          </Box>
          <VStack gap="2">
            <Text color="fg.heading" fontSize="lg" fontWeight="600">
              Forge Your Champion
            </Text>
            <Text color="fg.muted" fontSize="sm" maxW="280px">
              Photograph any object to forge it into a battle card
            </Text>
          </VStack>
          <Button
            size="lg"
            colorPalette="orange"
            onClick={handleTakePhoto}
            px="8"
          >
            Take Photo
          </Button>
          {savedCards && savedCards.length > 0 && onUseSavedCards && (
            <>
              <Text color="fg.muted" fontSize="sm">
                or
              </Text>
              <Button
                size="lg"
                variant="outline"
                colorPalette="teal"
                onClick={handleChooseSaved}
                px="8"
              >
                Use Saved Card
              </Button>
            </>
          )}
        </VStack>
      )}
    </VStack>
  )
}
