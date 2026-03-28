import type { Card } from "../../shared/types"

const HAND_KEY = "snapduel_hand"

export function saveHand(cards: Card[]): void {
  try {
    localStorage.setItem(HAND_KEY, JSON.stringify(cards))
  } catch {
    /* quota exceeded — silently fail */
  }
}

export function loadHand(): Card[] {
  try {
    const raw = localStorage.getItem(HAND_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Card[]
  } catch {
    return []
  }
}

export function clearHand(): void {
  localStorage.removeItem(HAND_KEY)
}
