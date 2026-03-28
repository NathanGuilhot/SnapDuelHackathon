import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cardJsonSchema } from "./validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, "..", "prompts");

export const CARD_ANALYSIS_PROMPT = readFileSync(
  join(PROMPTS_DIR, "card-analysis.txt"),
  "utf-8",
);

export const ILLUSTRATION_PROMPT = readFileSync(
  join(PROMPTS_DIR, "illustration.txt"),
  "utf-8",
);

export const GEMINI_MODEL = "gemini-2.5-flash-lite";

export const GEMINI_CARD_CONFIG = {
  responseMimeType: "application/json" as const,
  responseJsonSchema: cardJsonSchema,
};
