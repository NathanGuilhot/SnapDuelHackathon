import type { ReactionId } from "../../shared/types"

export const REACTION_DATA: Record<ReactionId, { label: string; emoji: string }> = {
  gg:      { label: "Good game!",            emoji: "\u{1F91D}" },
  oops:    { label: "Oops!",                 emoji: "\u{1F62C}" },
  revenge: { label: "I'll get my revenge...", emoji: "\u{1F608}" },
  wow:     { label: "Wow!",                  emoji: "\u{1F62E}" },
  think:   { label: "Hmm, interesting...",    emoji: "\u{1F914}" },
  fear:    { label: "I'm scared...",          emoji: "\u{1F628}" },
}

export const REACTIONS = (Object.keys(REACTION_DATA) as ReactionId[]).map((id) => ({
  id,
  emoji: REACTION_DATA[id].emoji,
}))
