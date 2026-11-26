# ArenaOBS

Multi-room live event roulette wheel, broadcast scoreboard, and full-screen stage studio — built for OBS streams, tournaments, trivia nights, giveaways, LAN stages, and community events.

## Features

- **General-Event Room Studio (`/`)**: Create an isolated room in seconds from 1-click presets (**1v1 Versus Match**, **Giveaway & Raffle**, **Trivia & Party Night**, **Variety & Challenges**), plus a classic shortcut for **FDN vs Lauchang**.
- **3 Adaptive Event Modes**:
  - **1v1 Versus**: 3D broadcast VS scoreboard with Best-of-N series pips and signed score delta popups.
  - **Multiplayer Leaderboard (2–8)**: Live sorted broadcast rankings with `+1` / `+5` / `-1` controls.
  - **Wheel Only / Raffle**: Clean giveaway/picker mode with **Keep vs Eliminate** draw toggle and **Bulk Paste** import (up to 64 segments).
- **Full-Screen Stage / Projector View (`/room/:roomId/stage`)**: Combined wheel, scoreboard/leaderboard, countdown timer, and announcement ticker for live venues and watch parties.
- **Themes, Icons & Direct Image Uploads**:
  - 5 built-in overlay themes (*Broadcast Emerald & Gold*, *Cyber Neon*, *Minimal Studio Light*, *Retro Arcade*, *Warm Festival*) + custom accent override + `?theme=` query parameter.
  - Built-in icon/emoji badges and monogram fallbacks, plus authenticated `POST /api/uploads` backed by **Vercel Blob** (PNG/JPEG/WebP magic-byte checked, 2 MB max).
- **Live Show Production Tools**:
  - Deterministic timestamp-based wheel physics and synthesized Web Audio tick + fanfare.
  - Deterministic **Countdown Timer** (`30s`, `1m`, `2m`, `5m`) and **Lower-Third Announcement Ticker**.
  - **Export / Import Room JSON**, 1-click **Copy OBS URL**, live mini preview, **Undo**, round history, keyboard shortcuts (`Space`, `1`, `2`), and EN/ES switcher.
- **Hardened Multi-Room Security & Scalability**:
  - Salted `crypto.scryptSync` per-room PIN hashing, expiring HMAC-SHA256 room tokens (`crypto.timingSafeEqual`), **PIN rotation**, and **Revoke All Sessions** (`tokenVersion`).
  - IP rate limiting on both `POST /api/auth` and `POST /api/rooms`, 30-day sliding Upstash Redis TTL on custom rooms, and adaptive polling (`300ms` active → `1800ms` idle).

## Routes

| Route | Purpose | Recommended Size |
|---|---|---|
| `/` | Room Creator & Preset Hub | — |
| `/room/:roomId/control` | Authenticated Event Control Panel | — |
| `/room/:roomId/roulette` | Transparent OBS Roulette Browser Source | `600 × 600` |
| `/room/:roomId/scoreboard` | Transparent OBS Scoreboard / Leaderboard | `920 × 220` (Versus) / `560 × 480` (Leaderboard) |
| `/room/:roomId/stage` | Full-Screen Live Stage / Projector Display | `1920 × 1080` |
| `/control`, `/roulette`, `/scoreboard`, `/stage` | Backward-compatible aliases for `fdn-vs-lauchang` | Same as above |

## Local Development & Verification

```bash
npm install
npm run dev
npm test
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local` or configure in Vercel Project Settings:

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | Yes (Production) | Random 32+ byte secret for HMAC-SHA256 room tokens (fails closed in production if missing). |
| `ADMIN_PASSWORD` | Default room only | Admin password for the legacy `fdn-vs-lauchang` room (no hardcoded fallback exists). |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Recommended | Upstash Redis REST credentials (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) for persistent multi-room sync with 30-day sliding TTL. |
| `BLOB_READ_WRITE_TOKEN` | Optional | Enables direct PNG/JPEG/WebP logo & banner uploads via Vercel Blob (`POST /api/uploads`). |
| `ALLOWED_ORIGINS` | Optional | Comma-separated extra origins allowed to call mutating API routes in addition to same-origin. |
