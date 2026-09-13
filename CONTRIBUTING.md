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
