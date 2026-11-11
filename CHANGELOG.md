# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Added queue and player lifecycle test coverage under `tests/` using
  `node:test` with mocked Socket.IO, audio player, voice connection, `yt-dlp`,
  and database modules. Queue mutations, max size, loop modes, pause/resume,
  skip, stop, and playback transitions are now covered without network access.
- Added a Testing section to the README.
- Added a public read-only `/status` page and `GET /api/status`, showing
  aggregate counters and an allowlisted per-bot summary without tokens, client
  IDs, guild names, queue contents, or settings.
- `GET /api/health` now probes SQLite and returns 503 when the database is
  unavailable, so Docker restarts a wedged panel instead of reporting healthy.
- Added per-guild playback presets (`volume`, `maxQueueSize`,
  `defaultLoopMode`, `announceSongs`, `stayInChannel`) with validated
  `GET`/`PUT /api/bots/:id/guilds/:guildId/presets`, SQLite persistence, and
  immediate application to active queues. The server detail page now saves a
  real playback preset instead of showing a fake success message.

### Changed

- Docker Compose now includes an optional `bot` profile that runs the panel plus
  one standalone bot (`docker compose --profile bot up --build`). The bot keeps
  its own `bot-data` and `bot-logs` volumes so it never shares SQLite with the
  panel. `.env.example` and the README document `DISCORD_TOKEN`, `BOT_NAME`, and
  `BOT_PREFIX`.
- The image creates `/app/data` and `/app/logs` with ownership for UID 10001
  before dropping privileges, so first-run named volumes are writable.
- Added deployment tests covering compose services, profile isolation, separate
  volumes, image permissions, and absence of committed tokens.
- Cleaned up the MIT license file so GitHub detects the license.
- Added issue templates, pull request template, roadmap, Dependabot, and code of conduct.
- Removed the unused `express-session` middleware; authentication is JWT bearer-token only.

### Fixed

- Production mode crashed at startup because Express 5 rejects the bare `'*'`
  route. The SPA fallback now uses `'/{*splat}'`, so `NODE_ENV=production`
  boots and serves `/status` and other client-side routes.
- Imported `EmbedBuilder` in `src/bot/MusicQueue.js`; the now-playing and queue
  embeds previously threw a `ReferenceError` when song announcements were enabled.

### Security

- Added a global API rate limiter and a separate static-asset limiter.
- Replaced the disabled Helmet CSP with explicit development and production policies.
- Overrode `tar` to `^7.5.21` and `minimatch` to `^11.0.5` for transitive
  install-time dependencies, clearing the remaining Dependabot advisories.
- Upgraded the frontend to `vite@^6.4.4` and `react-router-dom@^7.18.5`,
  added a frontend lockfile, and cleared the remaining Vite and React Router
  advisories. The production frontend build still succeeds.

## [1.0.0] - 2026-09-20

### Added

- Self-hosted Discord music bot panel with a React dashboard.
- SQLite storage, JWT auth, rate limiting, and WebSocket events.
- Docker Compose support bound to localhost by default.
