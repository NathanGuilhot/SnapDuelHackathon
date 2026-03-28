import { useState, useRef, useEffect, useCallback } from "react"
import { Box, Button, Image, Text, VStack } from "@chakra-ui/react"
import NiceModal from "@ebay/nice-modal-react"
import { SourceChooserModal } from "./SourceChooserModal"

interface CameraCaptureProps {
  onCapture: (file: File) => void
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
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
            borderColor="border"
            objectFit="cover"
            aspectRatio="1/1"
            bg="bg.code"
          />
          <VStack gap="3" w="full" maxW="320px">
            <Button
              w="full"
              size="lg"
              colorPalette="purple"
              onClick={handleConfirm}
            >
              Use This Photo
            </Button>
            <Button
              w="full"
              size="lg"
              variant="outline"
              colorPalette="purple"
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
            borderColor="border"
            overflow="hidden"
            aspectRatio="1/1"
            bg="black"
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
              colorPalette="purple"
              onClick={captureFrame}
            >
              Capture
            </Button>
            <Button
              w="full"
              size="lg"
              variant="outline"
              colorPalette="purple"
              onClick={stopStream}
            >
              Cancel
            </Button>
          </VStack>
        </>
      ) : (
        <>
          <Text color="fg" fontSize="md">
            Take a picture of any object to start the duel.
          </Text>
          <Button
            size="lg"
            colorPalette="purple"
            onClick={handleTakePhoto}
          >
            Take Photo
          </Button>
        </>
      )}
    </VStack>
  )
}
