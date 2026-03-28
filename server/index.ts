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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FISHJAM_ID = process.env.FISHJAM_ID;
const DISABLE_AI_IMAGES = process.env.VITE_DISABLE_AI_IMAGES === "true";

if (!GEMINI_API_KEY) {
  snapLog("FATAL", { error: "GEMINI_API_KEY is not set" });
  process.exit(1);
}
if (!FISHJAM_ID) {
  snapLog("FATAL", { error: "FISHJAM_ID is not set" });
  process.exit(1);
}

const UPLOADS_DIR = join(PROJECT_ROOT, "uploads");
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  snapLog("INIT", { action: "created uploads directory" });
}

const isDev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT) || 3001;

const app = Fastify({ logger: true });

if (isDev) {
  await app.register(fastifyCors, { origin: true });
  snapLog("INIT", { cors: "enabled (dev mode)" });
}

await app.register(fastifyMultipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
});

await app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: "/uploads/",
});

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

app.get("/health", async () => {
  return { status: "ok" };
});

registerGenerateCard(app, {
  geminiApiKey: GEMINI_API_KEY,
  uploadsDir: UPLOADS_DIR,
  disableAiImages: DISABLE_AI_IMAGES,
});

if (!DISABLE_AI_IMAGES) {
  registerNanoBanana(app, {
    geminiApiKey: GEMINI_API_KEY,
    uploadsDir: UPLOADS_DIR,
  });
} else {
  snapLog("INIT", { aiImages: "DISABLED" });
}

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  snapLog("SERVER_READY", { port: PORT, env: isDev ? "development" : "production" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
