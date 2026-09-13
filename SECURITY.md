# Security Policy

discord-music-panel stores Discord bot tokens and panel passwords. Treat the SQLite file as a secrets store.

## Before you expose the panel

1. Set `JWT_SECRET`, `SESSION_SECRET`, and `TOKEN_ENCRYPTION_KEY` to long random values. Production refuses the documented placeholders.
2. Keep registration closed after the first admin exists.
3. Do not publish Docker on `0.0.0.0` without a reverse proxy and TLS.
4. Panel users can only manage bots they created, unless they are `admin`.
5. yt-dlp only accepts YouTube / SoundCloud / Spotify hosts. Search queries that are not URLs go to `ytsearch:`.

## Tokens at rest

Bot tokens are encrypted with AES-256-GCM. The key is `TOKEN_ENCRYPTION_KEY` (fallback: `JWT_SECRET`). Losing that key means you cannot start existing bots — you must paste the token again.

## Reporting

Open a private advisory on [KodYazicam/discord-music-panel](https://github.com/KodYazicam/discord-music-panel/security/advisories/new).
