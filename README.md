# FDN vs Lauchang

Real-time roulette wheel and scoreboard overlay system for OBS live streams.

## Routes

- `/` - Main hub with quick links.
- `/control` - Control panel to spin the wheel, manage scores, and select games.
- `/roulette` - OBS browser source overlay for the animated roulette wheel.
- `/scoreboard` - OBS browser source overlay for the score counter.

## Setup

```bash
npm install
npm run dev
```

## Environment Variables (Optional)

Used for cross-internet state sync via Upstash Redis on Vercel:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `ADMIN_PASSWORD`
