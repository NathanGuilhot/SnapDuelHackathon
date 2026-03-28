import type { Element } from "./types.js";

export const STAT_MIN = 20;
export const STAT_MAX = 95;
export const HP_MIN = 50;
export const HP_MAX = 150;
export const BUDGET_MIN = 150;
export const BUDGET_MAX = 280;

export const ELEMENTS = ["fire", "water", "nature", "neutral"] as const;

export const ELEMENT_MULTIPLIERS: Record<Element, Record<Element, number>> = {
  fire:    { fire: 1.0, water: 0.80, nature: 1.25, neutral: 1.0 },
  water:   { fire: 1.25, water: 1.0, nature: 0.80, neutral: 1.0 },
  nature:  { fire: 0.80, water: 1.25, nature: 1.0, neutral: 1.0 },
  neutral: { fire: 1.0, water: 1.0, nature: 1.0, neutral: 1.0 },
};

export const MIN_DAMAGE = 5;

export const NAME_MAX_LEN = 30;
export const QUOTE_MAX_LEN = 60;

export const MAX_DIMENSION = 1024;
export const JPEG_QUALITY = 0.7;
export const CARD_ILLUSTRATION_SIZE = 512;

export const NANO_BANANA_TIMEOUT = 20000;

export const STAT_KEYS = ["attack", "defense", "hp"] as const;

export const HAND_SIZE = 3;
export const WINS_NEEDED = 2;
export const MAX_ROUNDS = 3;
export const MAX_CARD_USES = 2;
