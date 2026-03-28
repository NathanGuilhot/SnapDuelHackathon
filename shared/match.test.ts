import { describe, it, expect } from "vitest";
import {
  createMatchState,
  applyRoundResult,
  isMatchOver,
  getMatchWinner,
  getAvailableIndices,
} from "./match.js";
import type { RoundResult, Card } from "./types.js";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "test-id",
    name: "Test Card",
    element: "neutral",
    attack: 50,
    defense: 30,
    hp: 100,
    quote: "test",
    illustration_prompt: "",
    imageUrl: "/test.jpg",
    ...overrides,
  };
}

function makeRoundResult(winner: "A" | "B" | "draw", round = 1): RoundResult {
  return {
    round,
    cardA: makeCard({ id: "a" }),
    cardB: makeCard({ id: "b" }),
    damageToA: 20,
    damageToB: 25,
    remainingHpA: 80,
    remainingHpB: 75,
    advantageA: "neutral",
    advantageB: "neutral",
    winner,
  };
}

// ---------------------------------------------------------------------------
// createMatchState
// ---------------------------------------------------------------------------
describe("createMatchState", () => {
  it("returns correct initial values", () => {
    const s = createMatchState();
    expect(s.currentRound).toBe(1);
    expect(s.rounds).toEqual([]);
    expect(s.scoreA).toBe(0);
    expect(s.scoreB).toBe(0);
    expect(s.usedIndicesA).toEqual([]);
    expect(s.usedIndicesB).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// applyRoundResult
// ---------------------------------------------------------------------------
describe("applyRoundResult", () => {
  it("increments scoreA when A wins", () => {
    const s = applyRoundResult(createMatchState(), makeRoundResult("A"), 0, 2);
    expect(s.scoreA).toBe(1);
    expect(s.scoreB).toBe(0);
    expect(s.currentRound).toBe(2);
  });

  it("increments scoreB when B wins", () => {
    const s = applyRoundResult(createMatchState(), makeRoundResult("B"), 1, 0);
    expect(s.scoreA).toBe(0);
    expect(s.scoreB).toBe(1);
  });

  it("increments neither score on draw", () => {
    const s = applyRoundResult(createMatchState(), makeRoundResult("draw"), 0, 0);
    expect(s.scoreA).toBe(0);
    expect(s.scoreB).toBe(0);
    expect(s.currentRound).toBe(2);
  });

  it("tracks used card indices", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("A"), 0, 2);
    expect(s.usedIndicesA).toEqual([0]);
    expect(s.usedIndicesB).toEqual([2]);

    s = applyRoundResult(s, makeRoundResult("B"), 1, 0);
    expect(s.usedIndicesA).toEqual([0, 1]);
    expect(s.usedIndicesB).toEqual([2, 0]);
  });

  it("appends round result to rounds array", () => {
    let s = createMatchState();
    const r1 = makeRoundResult("A", 1);
    const r2 = makeRoundResult("B", 2);
    s = applyRoundResult(s, r1, 0, 0);
    s = applyRoundResult(s, r2, 1, 1);
    expect(s.rounds).toHaveLength(2);
    expect(s.rounds[0]).toBe(r1);
    expect(s.rounds[1]).toBe(r2);
  });
});

// ---------------------------------------------------------------------------
// isMatchOver
// ---------------------------------------------------------------------------
describe("isMatchOver", () => {
  it("returns false at start", () => {
    expect(isMatchOver(createMatchState())).toBe(false);
  });

  it("returns false at 1-0 after round 1", () => {
    const s = applyRoundResult(createMatchState(), makeRoundResult("A"), 0, 0);
    expect(isMatchOver(s)).toBe(false);
  });

  it("returns false at 1-1 after round 2", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("A"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("B"), 1, 1);
    expect(isMatchOver(s)).toBe(false);
  });

  it("returns true at 2-0 (early win)", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("A"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("A"), 1, 1);
    expect(isMatchOver(s)).toBe(true);
  });

  it("returns true at 0-2 (early win for B)", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("B"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("B"), 1, 1);
    expect(isMatchOver(s)).toBe(true);
  });

  it("returns true after round 3 regardless of score", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("draw"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("draw"), 1, 1);
    s = applyRoundResult(s, makeRoundResult("draw"), 2, 2);
    // currentRound is now 4 (> MAX_ROUNDS)
    expect(isMatchOver(s)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getMatchWinner
// ---------------------------------------------------------------------------
describe("getMatchWinner", () => {
  it("A wins with 2-0", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("A"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("A"), 1, 1);
    expect(getMatchWinner(s)).toBe("A");
  });

  it("B wins with 0-2", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("B"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("B"), 1, 1);
    expect(getMatchWinner(s)).toBe("B");
  });

  it("A wins with 2-1", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("A"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("B"), 1, 1);
    s = applyRoundResult(s, makeRoundResult("A"), 2, 2);
    expect(getMatchWinner(s)).toBe("A");
  });

  it("B wins with 1-2", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("B"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("A"), 1, 1);
    s = applyRoundResult(s, makeRoundResult("B"), 2, 2);
    expect(getMatchWinner(s)).toBe("B");
  });

  it("draw when 1-1 + draw round", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("A"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("B"), 1, 1);
    s = applyRoundResult(s, makeRoundResult("draw"), 2, 2);
    expect(getMatchWinner(s)).toBe("draw");
  });

  it("draw when all 3 rounds are draws", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("draw"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("draw"), 1, 1);
    s = applyRoundResult(s, makeRoundResult("draw"), 2, 2);
    expect(getMatchWinner(s)).toBe("draw");
  });

  it("A wins 1-0 with 2 draws", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("A"), 0, 0);
    s = applyRoundResult(s, makeRoundResult("draw"), 1, 1);
    s = applyRoundResult(s, makeRoundResult("draw"), 2, 2);
    expect(getMatchWinner(s)).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// getAvailableIndices
// ---------------------------------------------------------------------------
describe("getAvailableIndices", () => {
  it("returns all indices when none used", () => {
    expect(getAvailableIndices(3, [])).toEqual([0, 1, 2]);
  });

  it("filters out used index", () => {
    expect(getAvailableIndices(3, [1])).toEqual([0, 2]);
  });

  it("filters out multiple used indices", () => {
    expect(getAvailableIndices(3, [0, 2])).toEqual([1]);
  });

  it("returns empty when all used", () => {
    expect(getAvailableIndices(3, [0, 1, 2])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Integration: simulate full match
// ---------------------------------------------------------------------------
describe("full match simulation", () => {
  it("2-1 match flows correctly through all functions", () => {
    let s = createMatchState();
    expect(isMatchOver(s)).toBe(false);

    // Round 1: A wins
    s = applyRoundResult(s, makeRoundResult("A", 1), 0, 2);
    expect(s.scoreA).toBe(1);
    expect(s.scoreB).toBe(0);
    expect(s.currentRound).toBe(2);
    expect(isMatchOver(s)).toBe(false);
    expect(getAvailableIndices(3, s.usedIndicesA)).toEqual([1, 2]);
    expect(getAvailableIndices(3, s.usedIndicesB)).toEqual([0, 1]);

    // Round 2: B wins
    s = applyRoundResult(s, makeRoundResult("B", 2), 1, 0);
    expect(s.scoreA).toBe(1);
    expect(s.scoreB).toBe(1);
    expect(s.currentRound).toBe(3);
    expect(isMatchOver(s)).toBe(false);
    expect(getAvailableIndices(3, s.usedIndicesA)).toEqual([2]);
    expect(getAvailableIndices(3, s.usedIndicesB)).toEqual([1]);

    // Round 3: A wins
    s = applyRoundResult(s, makeRoundResult("A", 3), 2, 1);
    expect(s.scoreA).toBe(2);
    expect(s.scoreB).toBe(1);
    expect(isMatchOver(s)).toBe(true);
    expect(getMatchWinner(s)).toBe("A");
    expect(s.rounds).toHaveLength(3);
  });

  it("2-0 early finish skips round 3", () => {
    let s = createMatchState();
    s = applyRoundResult(s, makeRoundResult("B", 1), 0, 0);
    s = applyRoundResult(s, makeRoundResult("B", 2), 1, 1);

    expect(isMatchOver(s)).toBe(true);
    expect(getMatchWinner(s)).toBe("B");
    expect(s.rounds).toHaveLength(2);
    expect(s.currentRound).toBe(3); // would be round 3, but match is over
  });
});
