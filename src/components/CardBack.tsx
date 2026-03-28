import { Box, Image } from "@chakra-ui/react"
import cardBackSrc from "../assets/cardback.png"

interface CardBackProps {
  width: number
  height: number
  isHovered?: boolean
  isSelected?: boolean
}

export default function CardBack({ width, height, isHovered, isSelected }: CardBackProps) {
  const ratio = width / 280
  const borderRadius = `${Math.max(8, Math.round(12 * ratio))}px`

  return (
    <Box
      w={`${width}px`}
      h={`${height}px`}
      borderRadius={borderRadius}
      overflow="hidden"
      transition="transform 0.15s, box-shadow 0.15s"
      transform={isHovered ? "translateY(-4px)" : "translateY(0)"}
      boxShadow={
        isSelected
          ? "0 4px 16px rgba(0,0,0,0.5), 0 0 0 3px rgba(34,170,68,0.8)"
          : isHovered
            ? "0 6px 20px rgba(0,0,0,0.5)"
            : "0 2px 8px rgba(0,0,0,0.4)"
      }
    >
      <Image
        src={cardBackSrc}
        alt="Card back"
        w="full"
        h="full"
        objectFit="cover"
        draggable={false}
        userSelect="none"
      />
    </Box>
  )
}
