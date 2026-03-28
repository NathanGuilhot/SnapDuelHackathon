import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import { snapLog } from "../shared/debug.js";
import { registerGenerateCard } from "./generate-card.js";
import { registerNanoBanana } from "./nano-banana.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");

// --- Env validation ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FISHJAM_ID = process.env.FISHJAM_ID;

if (!GEMINI_API_KEY) {
  snapLog("FATAL", { error: "GEMINI_API_KEY is not set" });
  process.exit(1);
}
if (!FISHJAM_ID) {
  snapLog("FATAL", { error: "FISHJAM_ID is not set" });
  process.exit(1);
}

// --- Ensure uploads directory exists ---
const UPLOADS_DIR = join(PROJECT_ROOT, "uploads");
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  snapLog("INIT", { action: "created uploads directory" });
}

// --- Build server ---
const isDev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT) || 3001;

const app = Fastify({ logger: true });

// CORS for dev mode
if (isDev) {
  await app.register(fastifyCors, { origin: true });
  snapLog("INIT", { cors: "enabled (dev mode)" });
}

// Multipart file uploads
await app.register(fastifyMultipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Serve uploaded card images at /uploads/*
await app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: "/uploads/",
});

// In production, serve Vite build output
if (!isDev) {
  const DIST_DIR = join(PROJECT_ROOT, "dist");
  await app.register(fastifyStatic, {
    root: DIST_DIR,
    prefix: "/",
    decorateReply: false,
    wildcard: false,
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile("index.html", DIST_DIR);
  });
}

// --- Routes ---
app.get("/health", async () => {
  return { status: "ok" };
});

registerGenerateCard(app, {
  geminiApiKey: GEMINI_API_KEY,
  uploadsDir: UPLOADS_DIR,
});

registerNanoBanana(app, {
  geminiApiKey: GEMINI_API_KEY,
  uploadsDir: UPLOADS_DIR,
});

// --- Start ---
try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  snapLog("SERVER_READY", { port: PORT, env: isDev ? "development" : "production" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
