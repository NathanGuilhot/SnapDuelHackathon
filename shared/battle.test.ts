import { describe, it, expect } from "vitest";
import { resolveBattle, getElementMultiplier } from "./battle.js";
import type { Card, Element } from "./types.js";

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

// ---------------------------------------------------------------------------
// Element multiplier table
// ---------------------------------------------------------------------------
describe("getElementMultiplier", () => {
  const cases: [Element, Element, number][] = [
    // Fire
    ["fire", "nature", 1.25],
    ["fire", "water", 0.80],
    ["fire", "fire", 1.0],
    ["fire", "neutral", 1.0],
    // Water
    ["water", "fire", 1.25],
    ["water", "nature", 0.80],
    ["water", "water", 1.0],
    ["water", "neutral", 1.0],
    // Nature
    ["nature", "water", 1.25],
    ["nature", "fire", 0.80],
    ["nature", "nature", 1.0],
    ["nature", "neutral", 1.0],
    // Neutral
    ["neutral", "fire", 1.0],
    ["neutral", "water", 1.0],
    ["neutral", "nature", 1.0],
    ["neutral", "neutral", 1.0],
  ];

  it.each(cases)("%s vs %s = %s", (atk, def, expected) => {
    expect(getElementMultiplier(atk, def)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Damage calculation
// ---------------------------------------------------------------------------
describe("resolveBattle — damage", () => {
  it("calculates standard damage: round(atk * mult) - def", () => {
    const a = makeCard({ element: "fire", attack: 60, defense: 30, hp: 100 });
    const b = makeCard({ element: "nature", attack: 40, defense: 20, hp: 100 });
    const r = resolveBattle(a, b);
    // A → B: round(60 * 1.25) - 20 = 75 - 20 = 55
    expect(r.damageToB).toBe(55);
    // B → A: round(40 * 0.80) - 30 = 32 - 30 = 2 → clamped to 5
    expect(r.damageToA).toBe(5);
  });

  it("enforces minimum 5 damage when defense exceeds effective attack", () => {
    const a = makeCard({ attack: 20, defense: 95, hp: 100 });
    const b = makeCard({ attack: 20, defense: 95, hp: 100 });
    const r = resolveBattle(a, b);
    expect(r.damageToA).toBe(5);
    expect(r.damageToB).toBe(5);
  });

  it("element advantage increases damage", () => {
    const base = makeCard({ attack: 80, defense: 40, hp: 100 });
    const weak = makeCard({ element: "nature", attack: 80, defense: 40, hp: 100 });
    const fire = makeCard({ ...base, element: "fire" });

    const r = resolveBattle(fire, weak);
    // fire → nature: round(80 * 1.25) - 40 = 100 - 40 = 60
    expect(r.damageToB).toBe(60);
    // Without advantage (neutral vs nature = 1.0): 80 - 40 = 40
    const rNeutral = resolveBattle(base, weak);
    expect(rNeutral.damageToB).toBe(40);
    expect(r.damageToB).toBeGreaterThan(rNeutral.damageToB);
  });

  it("element disadvantage decreases damage", () => {
    const water = makeCard({ element: "water", attack: 50, defense: 30, hp: 100 });
    const nature = makeCard({ element: "nature", attack: 50, defense: 30, hp: 100 });
    const r = resolveBattle(water, nature);
    // water → nature: round(50 * 0.80) - 30 = 40 - 30 = 10
    expect(r.damageToB).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Remaining HP
// ---------------------------------------------------------------------------
describe("resolveBattle — remaining HP", () => {
  it("computes remaining HP correctly", () => {
    const a = makeCard({ hp: 100, defense: 30 });
    const b = makeCard({ hp: 80, attack: 60 });
    const r = resolveBattle(a, b);
    expect(r.remainingHpA).toBe(a.hp - r.damageToA);
    expect(r.remainingHpB).toBe(b.hp - r.damageToB);
  });

  it("remaining HP can be negative", () => {
    const a = makeCard({ element: "fire", attack: 95, defense: 20, hp: 50 });
    const b = makeCard({ element: "nature", attack: 95, defense: 20, hp: 50 });
    const r = resolveBattle(a, b);
    // fire → nature: round(95 * 1.25) - 20 = 119 - 20 = 99, remainingHpB = 50 - 99 = -49
    expect(r.remainingHpB).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Winner determination
// ---------------------------------------------------------------------------
describe("resolveBattle — winner", () => {
  it("A wins when A survives and B dies", () => {
    const a = makeCard({ element: "fire", attack: 90, defense: 50, hp: 150 });
    const b = makeCard({ element: "nature", attack: 30, defense: 20, hp: 50 });
    const r = resolveBattle(a, b);
    expect(r.remainingHpA).toBeGreaterThan(0);
    expect(r.remainingHpB).toBeLessThanOrEqual(0);
    expect(r.winner).toBe("A");
  });

  it("B wins when B survives and A dies", () => {
    const a = makeCard({ element: "nature", attack: 30, defense: 20, hp: 50 });
    const b = makeCard({ element: "fire", attack: 90, defense: 50, hp: 150 });
    const r = resolveBattle(a, b);
    expect(r.winner).toBe("B");
  });

  it("both survive — higher remaining HP wins", () => {
    const a = makeCard({ attack: 50, defense: 40, hp: 120 });
    const b = makeCard({ attack: 50, defense: 30, hp: 100 });
    const r = resolveBattle(a, b);
    // A takes: max(50-40, 5) = 10, remainingA = 110
    // B takes: max(50-30, 5) = 20, remainingB = 80
    expect(r.remainingHpA).toBe(110);
    expect(r.remainingHpB).toBe(80);
    expect(r.winner).toBe("A");
  });

  it("both die — less-negative remaining HP wins", () => {
    const a = makeCard({ attack: 90, defense: 20, hp: 50 });
    const b = makeCard({ attack: 80, defense: 20, hp: 50 });
    const r = resolveBattle(a, b);
    // A takes: max(80-20, 5) = 60, remainingA = -10
    // B takes: max(90-20, 5) = 70, remainingB = -20
    expect(r.remainingHpA).toBeLessThanOrEqual(0);
    expect(r.remainingHpB).toBeLessThanOrEqual(0);
    expect(r.winner).toBe("A"); // -10 > -20
  });

  it("tied remaining HP — higher base ATK wins", () => {
    // Engineered tie: hpA - (atkB-defA) = hpB - (atkA-defB)
    // 90 - (50-30) = 70, 100 - (60-30) = 70 ✓
    const a = makeCard({ attack: 60, defense: 30, hp: 90 });
    const b = makeCard({ attack: 50, defense: 30, hp: 100 });
    const r = resolveBattle(a, b);
    expect(r.remainingHpA).toBe(70);
    expect(r.remainingHpB).toBe(70);
    expect(r.winner).toBe("A"); // 60 ATK > 50 ATK
  });

  it("perfect draw — identical remaining HP and ATK", () => {
    const a = makeCard({ attack: 50, defense: 30, hp: 100 });
    const b = makeCard({ attack: 50, defense: 30, hp: 100 });
    const r = resolveBattle(a, b);
    expect(r.remainingHpA).toBe(r.remainingHpB);
    expect(r.winner).toBe("draw");
  });
});

// ---------------------------------------------------------------------------
// Element advantage labels
// ---------------------------------------------------------------------------
describe("resolveBattle — advantage labels", () => {
  it("fire vs nature: A strong, B weak", () => {
    const a = makeCard({ element: "fire" });
    const b = makeCard({ element: "nature" });
    const r = resolveBattle(a, b);
    expect(r.advantageA).toBe("strong");
    expect(r.advantageB).toBe("weak");
  });

  it("water vs fire: A strong, B weak", () => {
    const a = makeCard({ element: "water" });
    const b = makeCard({ element: "fire" });
    const r = resolveBattle(a, b);
    expect(r.advantageA).toBe("strong");
    expect(r.advantageB).toBe("weak");
  });

  it("nature vs water: A strong, B weak", () => {
    const a = makeCard({ element: "nature" });
    const b = makeCard({ element: "water" });
    const r = resolveBattle(a, b);
    expect(r.advantageA).toBe("strong");
    expect(r.advantageB).toBe("weak");
  });

  it("neutral vs anything: both neutral", () => {
    for (const el of ["fire", "water", "nature", "neutral"] as Element[]) {
      const a = makeCard({ element: "neutral" });
      const b = makeCard({ element: el });
      const r = resolveBattle(a, b);
      expect(r.advantageA).toBe("neutral");
    }
  });

  it("same element: both neutral", () => {
    for (const el of ["fire", "water", "nature"] as Element[]) {
      const a = makeCard({ element: el });
      const b = makeCard({ element: el });
      const r = resolveBattle(a, b);
      expect(r.advantageA).toBe("neutral");
      expect(r.advantageB).toBe("neutral");
    }
  });
});

// ---------------------------------------------------------------------------
// Round number
// ---------------------------------------------------------------------------
describe("resolveBattle — round", () => {
  it("defaults to round 1", () => {
    const r = resolveBattle(makeCard(), makeCard());
    expect(r.round).toBe(1);
  });

  it("preserves explicit round number", () => {
    const r = resolveBattle(makeCard(), makeCard(), 5);
    expect(r.round).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
describe("resolveBattle — determinism", () => {
  it("produces identical results for identical inputs", () => {
    const a = makeCard({ element: "fire", attack: 75, defense: 40, hp: 120 });
    const b = makeCard({ element: "water", attack: 65, defense: 35, hp: 110 });
    const r1 = resolveBattle(a, b);
    const r2 = resolveBattle(a, b);
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// Card passthrough
// ---------------------------------------------------------------------------
describe("resolveBattle — card references", () => {
  it("returns the same card objects passed in", () => {
    const a = makeCard({ id: "card-a" });
    const b = makeCard({ id: "card-b" });
    const r = resolveBattle(a, b);
    expect(r.cardA).toBe(a);
    expect(r.cardB).toBe(b);
  });
});
