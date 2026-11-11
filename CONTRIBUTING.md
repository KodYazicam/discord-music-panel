# Contributing to Discord Music Panel

## Setup

```bash
npm install
cd frontend && npm install && cd ..
cp .env.example .env
npm test
```

`@discordjs/opus` native builds fail on some Node versions (including 24). Docker uses Node 20. Tests under `tests/` do not load opus.

## Rules

- Bot tokens never leave the API in plaintext (`BotManager.getAllBots` already strips them; DB encrypts at rest).
- Every bot/playlist/socket action must go through `requireBotAccess` or an owner check.
- yt-dlp hosts stay allowlisted. Do not pass user URLs without `assertAllowedQuery`.
- Socket.IO: emit both `bot:status` / `music:*` (frontend) and `bot:update` / `queue:update` (legacy).
- Keep MIT license on this repo.

## Tests

```bash
npm test
```

The suite uses `node:test` and does not need a Discord token, network access, real audio, or a compiled `better-sqlite3` binding. Route tests replace `src/database/db` via `require.cache` before loading the API.

- `tests/music-queue.test.js`, `tests/music-bot.test.js`: queue and player lifecycle with mocked Socket.IO, audio player, voice connection, and yt-dlp.
- `tests/api-auth.test.js`: register/login/me, admin-only `/api/users`, and the global 429 rate-limit path with an in-memory user store.
- `tests/preset-*.test.js`, `tests/status-routes.test.js`: validation and route behavior for presets, health, and public status.
- `tests/ytdlp-health.test.js`: fake executables for the cached yt-dlp probe.
- `tests/deployment.test.js`, `tests/server-config.test.js`: Docker Compose/Dockerfile and Express 5 production serving.
