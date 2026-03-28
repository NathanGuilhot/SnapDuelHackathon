export type Element = "fire" | "water" | "nature" | "neutral";

export type PeerMetadata = {
  name: string;
  isHost: boolean;
};

export type GamePhase =
  | "LOBBY"
  | "HAND_BUILDING"
  | "PICKING"
  | "REVEAL"
  | "RESOLUTION"
  | "MATCH_END";

export interface Card {
  id: string;
  name: string;
  element: Element;
  attack: number;
  defense: number;
  hp: number;
  quote: string;
  illustration_prompt: string;
  imageUrl: string;
}

export type ElementAdvantage = "strong" | "weak" | "neutral";

export interface RoundResult {
  round: number;
  cardA: Card;
  cardB: Card;
  damageToA: number;
  damageToB: number;
  remainingHpA: number;
  remainingHpB: number;
  advantageA: ElementAdvantage;
  advantageB: ElementAdvantage;
  winner: "A" | "B" | "draw";
}

export type GameMessage =
  | { type: "PLAYER_READY"; playerId: string; nickname: string }
  | { type: "HAND_READY"; playerId: string; cardCount: number }
  | { type: "CARD_PICKED"; playerId: string; cardIndex: number }
  | { type: "ROUND_REVEAL"; result: RoundResult }
  | { type: "MATCH_RESULT"; winner: string | null; rounds: RoundResult[] }
  | { type: "PHASE_CHANGE"; phase: GamePhase };

export interface GameEnvelope {
  from: string;
  target?: string;
  ts: number;
  payload: GameMessage;
}
