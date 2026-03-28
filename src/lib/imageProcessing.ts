import {
  MAX_DIMENSION,
  JPEG_QUALITY,
  CARD_ILLUSTRATION_SIZE,
} from "../../shared/constants.ts"

export async function preprocessImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = bitmap
    const longest = Math.max(width, height)

    let targetW = width
    let targetH = height

    if (longest > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / longest
      targetW = Math.round(width * scale)
      targetH = Math.round(height * scale)
    }

    const canvas = new OffscreenCanvas(targetW, targetH)
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)

    return await canvas.convertToBlob({
      type: "image/jpeg",
      quality: JPEG_QUALITY,
    })
  } finally {
    bitmap.close()
  }
}

export async function cropToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = bitmap
    const side = Math.min(width, height)
    const sx = Math.round((width - side) / 2)
    const sy = Math.round((height - side) / 2)

    const canvas = new OffscreenCanvas(
      CARD_ILLUSTRATION_SIZE,
      CARD_ILLUSTRATION_SIZE,
    )
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(
      bitmap,
      sx,
      sy,
      side,
      side,
      0,
      0,
      CARD_ILLUSTRATION_SIZE,
      CARD_ILLUSTRATION_SIZE,
    )

    return await canvas.convertToBlob({
      type: "image/jpeg",
      quality: JPEG_QUALITY,
    })
  } finally {
    bitmap.close()
  }
}
