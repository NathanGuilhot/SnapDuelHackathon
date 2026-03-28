import type { Card, Element, ElementAdvantage, RoundResult } from "./types.js";
import { ELEMENT_MULTIPLIERS, MIN_DAMAGE } from "./constants.js";

export function getElementMultiplier(
  attacker: Element,
  defender: Element,
): number {
  return ELEMENT_MULTIPLIERS[attacker][defender];
}

function toAdvantage(multiplier: number): ElementAdvantage {
  if (multiplier > 1) return "strong";
  if (multiplier < 1) return "weak";
  return "neutral";
}

export function resolveBattle(
  cardA: Card,
  cardB: Card,
  round: number = 1,
): RoundResult {
  const multA = getElementMultiplier(cardA.element, cardB.element);
  const multB = getElementMultiplier(cardB.element, cardA.element);

  const effectiveAtkA = Math.round(cardA.attack * multA);
  const effectiveAtkB = Math.round(cardB.attack * multB);

  const damageToB = Math.max(effectiveAtkA - cardB.defense, MIN_DAMAGE);
  const damageToA = Math.max(effectiveAtkB - cardA.defense, MIN_DAMAGE);

  const remainingHpA = cardA.hp - damageToA;
  const remainingHpB = cardB.hp - damageToB;

  let winner: "A" | "B" | "draw";
  const aAlive = remainingHpA > 0;
  const bAlive = remainingHpB > 0;

  if (aAlive && !bAlive) {
    winner = "A";
  } else if (!aAlive && bAlive) {
    winner = "B";
  } else if (remainingHpA !== remainingHpB) {
    winner = remainingHpA > remainingHpB ? "A" : "B";
  } else if (cardA.attack !== cardB.attack) {
    winner = cardA.attack > cardB.attack ? "A" : "B";
  } else {
    winner = "draw";
  }

  return {
    round,
    cardA,
    cardB,
    damageToA,
    damageToB,
    remainingHpA,
    remainingHpB,
    advantageA: toAdvantage(multA),
    advantageB: toAdvantage(multB),
    winner,
  };
}
