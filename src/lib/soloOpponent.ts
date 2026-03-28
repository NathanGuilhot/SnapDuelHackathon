import type { Card, Element } from "../../shared/types"
import { v4 as uuidv4 } from "uuid"

const SOLO_NAMES = [
  "Shadow Clone",
  "Mirror Knight",
  "Echo Beast",
  "Phase Specter",
  "Void Sentinel",
  "Glitch Wraith",
]

const ELEMENTS: Element[] = ["fire", "water", "nature", "neutral"]

const QUOTES = [
  "A shadow of yourself...",
  "Born from the void.",
  "Reality bends around me.",
  "I am what you fear.",
]

export function generateSoloOpponent(): Card {
  return {
    id: uuidv4(),
    name: SOLO_NAMES[Math.floor(Math.random() * SOLO_NAMES.length)],
    element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
    attack: 40 + Math.floor(Math.random() * 40),
    defense: 30 + Math.floor(Math.random() * 30),
    hp: 70 + Math.floor(Math.random() * 60),
    quote: QUOTES[Math.floor(Math.random() * QUOTES.length)],
    illustration_prompt: "",
    imageUrl: "/placeholder-opponent.svg",
  }
}

export function generateSoloOpponents(count: number = 3): Card[] {
  return Array.from({ length: count }, () => generateSoloOpponent())
}

export function soloPickCard(availableIndices: number[]): number {
  return availableIndices[Math.floor(Math.random() * availableIndices.length)]
}
