import type { RoundResult, MatchState } from "./types.js";
import { WINS_NEEDED, MAX_ROUNDS } from "./constants.js";

export function createMatchState(): MatchState {
  return {
    currentRound: 1,
    rounds: [],
    scoreA: 0,
    scoreB: 0,
    usedIndicesA: [],
    usedIndicesB: [],
  };
}

export function applyRoundResult(
  state: MatchState,
  result: RoundResult,
  pickedIndexA: number,
  pickedIndexB: number,
): MatchState {
  return {
    currentRound: state.currentRound + 1,
    rounds: [...state.rounds, result],
    scoreA: state.scoreA + (result.winner === "A" ? 1 : 0),
    scoreB: state.scoreB + (result.winner === "B" ? 1 : 0),
    usedIndicesA: [...state.usedIndicesA, pickedIndexA],
    usedIndicesB: [...state.usedIndicesB, pickedIndexB],
  };
}

export function isMatchOver(state: MatchState): boolean {
  return (
    state.scoreA >= WINS_NEEDED ||
    state.scoreB >= WINS_NEEDED ||
    state.currentRound > MAX_ROUNDS
  );
}

export function getMatchWinner(state: MatchState): "A" | "B" | "draw" {
  if (state.scoreA >= WINS_NEEDED) return "A";
  if (state.scoreB >= WINS_NEEDED) return "B";
  if (state.scoreA > state.scoreB) return "A";
  if (state.scoreB > state.scoreA) return "B";
  return "draw";
}

export function getAvailableIndices(
  handSize: number,
  usedIndices: number[],
): number[] {
  return Array.from({ length: handSize }, (_, i) => i).filter(
    (i) => !usedIndices.includes(i),
  );
}
