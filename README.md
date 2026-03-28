# SnapDuel

Photograph any real-world object. AI turns it into a fantasy battle card. Fight other players instantly.

Built for the Software Mansion x Gemini Hackathon (March 28, 2026, Krakow). Track 3 — Game Jam.

## Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Fastify (Node.js)
- **AI:** Gemini Flash (card generation), Nano Banana (illustration), MediaPipe (on-device detection)
- **Multiplayer:** Fishjam (data channels)
- **Hosting:** VPS + nginx + Let's Encrypt

## Run

```bash
yarn install
yarn dev        # Vite dev server (client)
```

## Structure

```
client/    — React frontend (camera, cards, battle UI)
server/    — Fastify API (Gemini proxy, image storage, game logic)
shared/    — Types & constants shared between client and server
uploads/   — Card images (runtime, gitignored)
prompts/   — Gemini system prompts
```
