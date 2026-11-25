# ArenaOBS (FDN vs Lauchang)

Multi-room OBS browser source roulette wheel and 3D broadcast scoreboard studio — built for streamers, tournaments, showmatches, and variety nights, with the classic **FDN vs Lauchang** event available as a 1-click preset.

## Features

- **Multi-Room Studio & 1-Click Presets (`/`)**: Spin up an isolated OBS room in under 30 seconds with custom team names, subtitles, colors, logo URLs (with automatic monogram fallbacks), Best-of-N series pips, and weighted roulette segments.
- **Classic Compatibility**: `/control`, `/roulette`, and `/scoreboard` remain mapped directly to the `fdn-vs-lauchang` room so existing OBS browser sources keep working.
- **Deterministic Wheel Physics**: Timestamp-based spin interpolation (`spinStartedAt`, `spinDurationMs`, `startRotation`, `targetRotation`) ensures OBS overlays joining mid-spin land on the exact winning slice without jumping.
- **Synthesized Web Audio**: Built-in Web Audio API wheel ticks and victory fanfare with zero external audio files and a mute toggle (plus `?sound=0|1` and `?size=520` query params).
- **Hardened Security**:
  - Salted `crypto.scryptSync` per-room admin PIN hashing.
  - Expiring HMAC-SHA256 room-scoped Bearer tokens verified with `crypto.timingSafeEqual`.
  - Authenticated `POST /api/sync`, strict cross-room isolation (`403`), login rate limiting (`429`), restricted mutating CORS, and media URL sanitization.
- **Streamer Ergonomics**: 1-click Copy OBS URL with recommended dimensions, live mini preview, Undo, round/score history log, keyboard shortcuts (`Space`, `1`, `2`), EN/ES language switcher, and Redis vs memory persistence indicator.

## Routes

| Route | Purpose | Recommended OBS Size |
|---|---|---|
| `/` | Room Creator & Preset Hub | — |
| `/room/:roomId/control` | Authenticated Streamer Control Panel | — |
| `/room/:roomId/roulette` | Transparent OBS Roulette Browser Source | `600 × 600` |
| `/room/:roomId/scoreboard` | Transparent OBS 3D Scoreboard Source | `920 × 220` |
| `/control`, `/roulette`, `/scoreboard` | Legacy aliases for `fdn-vs-lauchang` | Same as above |

## OBS Setup Guide

1. Open `/` and create a room (or click **Open Classic** for FDN vs Lauchang).
2. In your Control Panel, open the **OBS Sources & Preview** tab and click **Copy OBS URL** for the Roulette or Scoreboard source.
3. In OBS Studio, add a **Browser** source, paste the URL, set the recommended width/height (`600×600` for Roulette, `920×220` for Scoreboard), and leave Custom CSS empty (the background is transparent by default).
4. Optional roulette query parameters: `?sound=0` (mute overlay audio), `?sound=1` (force audio on), `?size=520` (canvas pixel size).

## Local Development

```bash
npm install
npm run dev
```

## Tests & Production Build

```bash
npm test
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local` for local or Vercel deployment:

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | Yes (Production) | Random 32+ byte secret used to sign HMAC-SHA256 room tokens. Fails closed in production if missing. |
| `ADMIN_PASSWORD` | For default room | Admin password for the default `fdn-vs-lauchang` room (no hardcoded fallback exists). |
| `ALLOWED_ORIGINS` | Optional | Comma-separated extra origins allowed to call mutating API routes in addition to same-origin. |
| `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` | Recommended | Upstash Redis REST URL for persistent cross-instance state sync on Vercel. |
| `KV_REST_API_TOKEN` / `UPSTASH_REDIS_REST_TOKEN` | Recommended | Upstash Redis REST token. Without Redis env vars, the app falls back to volatile in-memory state and displays a **Memory Fallback** banner. |
