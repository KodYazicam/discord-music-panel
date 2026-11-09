# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Cleaned up the MIT license file so GitHub detects the license.
- Added issue templates, pull request template, roadmap, Dependabot, and code of conduct.
- Removed the unused `express-session` middleware; authentication is JWT bearer-token only.

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
