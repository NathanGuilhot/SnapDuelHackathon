import { z, toJSONSchema } from "zod";
import {
  STAT_MIN,
  STAT_MAX,
  HP_MIN,
  HP_MAX,
  BUDGET_MIN,
  BUDGET_MAX,
  ELEMENTS,
  NAME_MAX_LEN,
  QUOTE_MAX_LEN,
} from "../shared/constants.js";
import type { Card, Element } from "../shared/types.js";
import { snapLog } from "../shared/debug.js";

const geminiJsonSchema = z.object({
  name: z.string(),
  element: z.enum(ELEMENTS),
  attack: z.number(),
  defense: z.number(),
  hp: z.number(),
  quote: z.string(),
  illustration_prompt: z.string(),
});

export const cardJsonSchema = toJSONSchema(geminiJsonSchema);

const geminiCardSchema = z.object({
  name: z.string().catch("Mysterious Entity"),
  element: z.enum(ELEMENTS).catch("neutral"),
  attack: z.number().catch(50),
  defense: z.number().catch(50),
  hp: z.number().catch(80),
  quote: z.string().catch("..."),
  illustration_prompt: z.string().catch(""),
});

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(val)));
}

export function validateCard(
  raw: unknown,
  cardId: string,
  imageUrl: string,
): Card {
  const parsed = geminiCardSchema.parse(raw);

  // Strip HTML & truncate strings
  let name = stripHtml(parsed.name).slice(0, NAME_MAX_LEN);
  const quote = stripHtml(parsed.quote).slice(0, QUOTE_MAX_LEN);
  const illustrationPrompt = stripHtml(parsed.illustration_prompt);
  const element: Element = parsed.element;

  // Clamp individual stats
  let attack = clamp(parsed.attack, STAT_MIN, STAT_MAX);
  let defense = clamp(parsed.defense, STAT_MIN, STAT_MAX);
  let hp = clamp(parsed.hp, HP_MIN, HP_MAX);

  // Enforce stat budget [BUDGET_MIN, BUDGET_MAX]
  const budget = attack + defense + hp;
  if (budget < BUDGET_MIN || budget > BUDGET_MAX) {
    const target = budget < BUDGET_MIN ? BUDGET_MIN : BUDGET_MAX;
    const scale = target / budget;
    attack = clamp(Math.round(parsed.attack * scale), STAT_MIN, STAT_MAX);
    defense = clamp(Math.round(parsed.defense * scale), STAT_MIN, STAT_MAX);
    hp = clamp(Math.round(parsed.hp * scale), HP_MIN, HP_MAX);

    // After re-clamping the budget may still be slightly off — adjust HP
    const newBudget = attack + defense + hp;
    if (newBudget < BUDGET_MIN || newBudget > BUDGET_MAX) {
      const diff =
        (newBudget < BUDGET_MIN ? BUDGET_MIN : BUDGET_MAX) - newBudget;
      hp = clamp(hp + diff, HP_MIN, HP_MAX);
    }
  }

  if (!name.trim()) name = "Mysterious Entity";

  snapLog("VALIDATE", {
    name,
    element,
    attack,
    defense,
    hp,
    budget: attack + defense + hp,
  });

  return {
    id: cardId,
    name,
    element,
    attack,
    defense,
    hp,
    quote: quote || "...",
    illustration_prompt: illustrationPrompt,
    imageUrl,
  };
}

const GLITCH_NAMES = [
  "Data Phantom (???)",
  "Null Specter (???)",
  "Glitch Wraith (???)",
  "Static Shade (???)",
  "Byte Revenant (???)",
  "Void Walker (???)",
  "Echo Fragment (???)",
  "Pixel Ghost (???)",
];

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateGlitchCard(cardId: string, imageUrl: string): Card {
  const name = GLITCH_NAMES[Math.floor(Math.random() * GLITCH_NAMES.length)];

  const card: Card = {
    id: cardId,
    name,
    element: "neutral",
    attack: randBetween(40, 60),
    defense: randBetween(40, 60),
    hp: randBetween(70, 110),
    quote: "Reality glitched. I survived.",
    illustration_prompt: "",
    imageUrl,
  };

  snapLog("GLITCH_CARD", {
    name: card.name,
    attack: card.attack,
    defense: card.defense,
    hp: card.hp,
  });

  return card;
}
