import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { snapLog } from "../shared/debug.js";
import { validateCard, generateGlitchCard } from "./validate.js";
import {
  CARD_ANALYSIS_PROMPT,
  GEMINI_MODEL,
  GEMINI_CARD_CONFIG,
} from "./prompts.js";
import { triggerNanoBanana } from "./nano-banana.js";

export function registerGenerateCard(
  app: FastifyInstance,
  opts: { geminiApiKey: string; uploadsDir: string },
): void {
  const ai = new GoogleGenAI({ apiKey: opts.geminiApiKey });

  async function callGeminiOnce(base64: string, mimeType: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    snapLog("GEMINI_CALL", {
      mimeType,
      base64Len: base64.length,
      model: GEMINI_MODEL,
    });

    try {
      return await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: CARD_ANALYSIS_PROMPT },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
        config: {
          ...GEMINI_CARD_CONFIG,
          abortSignal: controller.signal,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function callGemini(base64: string, mimeType: string) {
    try {
      return await callGeminiOnce(base64, mimeType);
    } catch (err) {
      snapLog("GEMINI_RETRY", { error: String(err) });
      return await callGeminiOnce(base64, mimeType);
    }
  }

  app.post("/api/generate-card", async (request, reply) => {
    // 1. Parse multipart
    const buffers: Record<string, { buffer: Buffer; mimetype: string }> = {};

    for await (const part of request.parts()) {
      if (part.type === "file") {
        buffers[part.fieldname] = {
          buffer: await part.toBuffer(),
          mimetype: part.mimetype,
        };
      }
    }

    const resized = buffers["resized"];
    const cropped = buffers["cropped"];

    if (!resized || !cropped) {
      return reply
        .status(400)
        .send({ error: "Missing required files: 'resized' and 'cropped'" });
    }

    // 2. Generate ID and save cropped image
    const cardId = uuidv4();
    const imageFilename = `${cardId}.jpg`;
    const imagePath = join(opts.uploadsDir, imageFilename);
    const imageUrl = `/uploads/${imageFilename}`;

    await writeFile(imagePath, cropped.buffer);

    // 3. Call Gemini
    const base64 = resized.buffer.toString("base64");
    snapLog("GEMINI_SEND", {
      cardId,
      imageSize: resized.buffer.length,
      mimeType: resized.mimetype,
      base64Len: base64.length,
    });

    let card;
    try {
      const response = await callGemini(base64, resized.mimetype);
      snapLog("GEMINI_RECV", {
        cardId,
        finishReason: response.candidates?.[0]?.finishReason,
        hasText: !!response.text,
      });

      // 4. Check for safety / empty candidates
      const candidate = response.candidates?.[0];
      if (
        !candidate ||
        !response.text ||
        candidate.finishReason === "SAFETY"
      ) {
        card = generateGlitchCard(cardId, imageUrl);
      } else {
        // 5. Parse & validate
        const raw = JSON.parse(response.text);
        card = validateCard(raw, cardId, imageUrl);
      }
    } catch (err) {
      const isAbort =
        err instanceof DOMException && err.name === "AbortError";
      snapLog("GEMINI_ERROR", {
        cardId,
        type: isAbort ? "TIMEOUT" : "ERROR",
        error: String(err),
      });
      card = generateGlitchCard(cardId, imageUrl);
    }

    // 6. Kick off AI illustration in background
    if (card.illustration_prompt) {
      triggerNanoBanana(card.id, card.illustration_prompt, {
        base64,
        mimeType: resized.mimetype,
      });
    }

    // 7. Return card
    return reply.send(card);
  });
}
