import { useState } from 'react'
import CameraCapture from './components/CameraCapture'
import './App.css'

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
    <main>
      <h1>SnapDuel</h1>

      {capturedFile && previewUrl ? (
        <div className="captured">
          <img
            className="captured__preview"
            src={previewUrl}
            alt="Captured photo"
          />
          <p className="captured__text">Photo captured! Ready for card generation.</p>
          <button className="captured__btn" onClick={handleReset}>
            Start Over
          </button>
        </div>
      ) : (
        <CameraCapture onCapture={handleCapture} />
      )}
    </main>
  )
}

export default App
