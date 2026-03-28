import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { GoogleGenAI } from "@google/genai";
import { snapLog } from "../shared/debug.js";

const TOTAL_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 10_000;

// ── Status store ─────────────────────────────────────────────────
type AiImageStatus =
  | { state: "pending" }
  | { state: "ready"; url: string }
  | { state: "failed"; reason: string };

const aiImageStore = new Map<string, AiImageStatus>();
const aiImageResolvers = new Map<string, (status: AiImageStatus) => void>();
const aiImagePromises = new Map<string, Promise<AiImageStatus>>();

// ── Module-level refs (set during registration) ──────────────────
let ai: GoogleGenAI;
let uploadsDir: string;

// ── Helpers ──────────────────────────────────────────────────────

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

function parseRetryDelay(errorStr: string): number {
  const match = errorStr.match(/"retryDelay"\s*:\s*"(\d+)s?"/);
  if (match) return Math.min(Number(match[1]) * 1000, 30_000);
  return DEFAULT_RETRY_DELAY_MS;
}

function is429(err: unknown): boolean {
  return String(err).includes('"code":429');
}

function settleAiImage(cardId: string, status: AiImageStatus): void {
  aiImageStore.set(cardId, status);
  const resolve = aiImageResolvers.get(cardId);
  if (resolve) {
    resolve(status);
    aiImageResolvers.delete(cardId);
  }
}

// ── Public trigger (fire-and-forget) ─────────────────────────────
export function triggerNanoBanana(
  cardId: string,
  illustrationPrompt: string,
  referenceImage?: { base64: string; mimeType: string },
): void {
  aiImageStore.set(cardId, { state: "pending" });

  let resolve!: (status: AiImageStatus) => void;
  const promise = new Promise<AiImageStatus>((r) => { resolve = r; });
  aiImageResolvers.set(cardId, resolve);
  aiImagePromises.set(cardId, promise);

  (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        snapLog("NANOBANANA_SEND", { cardId, attempt });

        try {
          const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
            { text: illustrationPrompt },
          ];
          if (referenceImage) {
            contents.push({ inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.base64 } });
          }

          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-image-preview",
            contents,
            config: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: { aspectRatio: "1:1" },
              abortSignal: controller.signal,
            },
          });

          // Find the inline image part
          const parts = response.candidates?.[0]?.content?.parts;
          const imagePart = parts?.find(
            (p) => p.inlineData?.mimeType?.startsWith("image/"),
          );

          const imageData = imagePart?.inlineData?.data;
          if (!imageData) {
            snapLog("NANOBANANA_ERROR", { cardId, error: "No image in response" });
            settleAiImage(cardId, { state: "failed", reason: "no_image" });
            return;
          }

          // Write PNG to uploads
          const filename = `${cardId}-ai.png`;
          const filePath = join(uploadsDir, filename);
          const buffer = Buffer.from(imageData, "base64");
          await writeFile(filePath, buffer);

          const url = `/uploads/${filename}`;
          settleAiImage(cardId, { state: "ready", url });
          snapLog("NANOBANANA_RECV", { cardId, size: buffer.length });
          return;
        } catch (err) {
          if (is429(err) && attempt < MAX_ATTEMPTS) {
            const delay = parseRetryDelay(String(err));
            snapLog("NANOBANANA_RATE_LIMITED", { cardId, attempt, retryInMs: delay });
            await sleep(delay, controller.signal);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      const isAbort =
        err instanceof DOMException && err.name === "AbortError";

      if (isAbort) {
        snapLog("NANOBANANA_TIMEOUT", { cardId });
        settleAiImage(cardId, { state: "failed", reason: "timeout" });
      } else {
        snapLog("NANOBANANA_ERROR", { cardId, error: String(err) });
        settleAiImage(cardId, { state: "failed", reason: String(err) });
      }
    } finally {
      clearTimeout(timer);
    }
  })().catch((err) => {
    snapLog("NANOBANANA_ERROR", {
      cardId,
      error: `Unhandled: ${String(err)}`,
    });
    settleAiImage(cardId, { state: "failed", reason: "unhandled" });
  });
}

// ── Registration ─────────────────────────────────────────────────
export function registerNanoBanana(
  app: FastifyInstance,
  opts: { geminiApiKey: string; uploadsDir: string },
): void {
  ai = new GoogleGenAI({ apiKey: opts.geminiApiKey });
  uploadsDir = opts.uploadsDir;

  app.get<{ Params: { id: string } }>(
    "/api/card/:id/ai-image",
    async (request, reply) => {
      const { id } = request.params;
      const status = aiImageStore.get(id);

      // Already resolved — return immediately
      if (status?.state === "ready") {
        return reply.send({ status: "ready", url: status.url });
      }
      if (status?.state === "failed") {
        return reply.send({ status: "failed" });
      }

      // Pending — wait for the generation to finish
      const promise = aiImagePromises.get(id);
      if (!promise) {
        return reply.send({ status: "unknown" });
      }

      const result = await promise;
      if (result.state === "ready") {
        return reply.send({ status: "ready", url: result.url });
      }
      return reply.send({ status: "failed" });
    },
  );
}
