import { useState, useRef, useEffect, useCallback } from 'react'
import './CameraCapture.css'

interface CameraCaptureProps {
  onCapture: (file: File) => void
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Revoke old preview URLs to avoid memory leaks
  useEffect(() => {
    const url = previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [previewUrl])

  // Assign stream to video element after React renders it
  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [streaming])

  // Stop stream on unmount
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
    setShowModal(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setStreaming(true)
    } catch {
      // Permission denied or no camera — fall back to file input
      fileInputRef.current?.click()
    }
  }, [])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    stopStream()
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
        setCapturedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
      },
      'image/jpeg',
      0.9,
    )
  }, [stopStream])

  const handleRetake = useCallback(() => {
    setPreviewUrl(null)
    setCapturedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleConfirm = useCallback(() => {
    if (capturedFile) onCapture(capturedFile)
  }, [capturedFile, onCapture])

  const handleUploadFile = useCallback(() => {
    setShowModal(false)
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="camera-capture">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />

      {previewUrl ? (
        <>
          <img
            className="camera-capture__preview"
            src={previewUrl}
            alt="Captured photo"
          />
          <div className="camera-capture__actions">
            <button
              className="camera-capture__btn camera-capture__btn--primary"
              onClick={handleConfirm}
            >
              Use This Photo
            </button>
            <button
              className="camera-capture__btn camera-capture__btn--secondary"
              onClick={handleRetake}
            >
              Retake
            </button>
          </div>
        </>
      ) : streaming ? (
        <>
          <video
            ref={videoRef}
            className="camera-capture__video"
            autoPlay
            playsInline
            muted
          />
          <div className="camera-capture__actions">
            <button
              className="camera-capture__btn camera-capture__btn--primary"
              onClick={captureFrame}
            >
              Capture
            </button>
            <button
              className="camera-capture__btn camera-capture__btn--secondary"
              onClick={stopStream}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="camera-capture__prompt">
            Snap any object. It becomes your weapon.
          </p>
          <button
            className="camera-capture__btn camera-capture__btn--primary"
            onClick={() => setShowModal(true)}
          >
            Take Photo
          </button>
        </>
      )}

      {showModal && (
        <div
          className="camera-capture__overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="camera-capture__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="camera-capture__modal-title">Choose source</h2>
            <button
              className="camera-capture__btn camera-capture__btn--primary"
              onClick={startWebcam}
            >
              Use Camera
            </button>
            <button
              className="camera-capture__btn camera-capture__btn--secondary"
              onClick={handleUploadFile}
            >
              Upload File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
