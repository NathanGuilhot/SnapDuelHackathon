import type { Card } from "../../shared/types"

const COLLECTION_KEY = "snapduel_collection"

export function saveToCollection(card: Card): void {
  try {
    const existing = loadCollection()
    if (existing.some((c) => c.id === card.id)) return
    existing.push(card)
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(existing))
  } catch {
    /* quota exceeded — silently fail */
  }
}

export function updateCollectionCard(cardId: string, updates: Partial<Card>): void {
  try {
    const existing = loadCollection()
    const updated = existing.map((c) =>
      c.id === cardId ? { ...c, ...updates } : c,
    )
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated))
  } catch {
    /* silently fail */
  }
}

export function loadCollection(): Card[] {
  try {
    const raw = localStorage.getItem(COLLECTION_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Card[]
  } catch {
    return []
  }
}
