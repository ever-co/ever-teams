<!--
Guidance for AI coding assistants working in the Ever Teams monorepo.
Keep this file short, actionable, and specific to this repository's structure and workflows.
-->

# Copilot / AI Assistant Instructions — Ever Teams

Summary: quick, actionable notes to help an AI assistant be productive in this mono-repo.

- **Big picture**: This is a TypeScript monorepo containing multiple apps:
  - `apps/web` — Next.js React web frontend (primary user-facing app).
  - `apps/mobile` — Expo / React Native mobile app.
  - `apps/desktop` — Electron desktop app wrapping web build.
  - `apps/extensions` — Browser extensions (Plasmo-based).
  - `apps/server-api` and `apps/server-web` — backend/API and server wrapper.
  Libraries and shared code live under `packages/`, `libs/` and `tools/`.

- **How the repo is built / run (important commands)**
  - Fast local web dev (cached builds + dev server):
    - `yarn dev:web` — builds services/libs then starts `turbo dev --filter=@ever-teams/web`.
    - `yarn start:web:dev` — alias that starts web with `turbo` in dev mode.
  - Production local build for web: `yarn build:web` then `yarn start:web:prod`.
  - Mono-repo builds use `turbo` and `nx` side-by-side. `yarn build` runs `turbo build`.
  - Quick full-platform run: use Docker Compose:
    - `docker-compose -f docker-compose.demo.yml up` (demo images)
    - `docker-compose -f docker-compose.build.yml up` (build everything locally — slow)

- **Keys to debugging and testing**
  - Unit / integration tests: `yarn test` (runs `postinstall.web` + `config:dev` + `nx` tests).
  - E2E / Cypress: `yarn e2e` (uses `postinstall.web` and `config:dev`).
  - Mobile: Detox + Expo. See `apps/mobile/detox/README.md` for device/emulator steps.
  - If a CI-like reproducible environment is needed, use the provided Docker Compose stacks.

- **Common repo conventions and gotchas**
  - Code formatting uses `prettier` configured in `package.json`. Prettier uses tabs and `tabWidth: 4` by default; SCSS/YML override to 2 spaces.
  - Commits should follow Conventional Commits. Use `yarn commit` (commitizen). Commit linting is enforced by Husky (`commit-msg` hook).
  - Many scripts rely on `yarn` v1 workspaces + `lerna`. Prefer `yarn install` then `yarn build` or `yarn dev:web`.
  - Node engine requirement: `node >= 20.11.0` (see `package.json` `engines`).

- **Where to look for integration / API wiring**
  - Frontend → Backend environment wiring: `apps/web/env-config.ts` and `apps/web/.env.sample`.
    - By default the web app connects to `https://api.ever.team`. To use local Gauzy backend set `GAUZY_API_SERVER_URL` and `NEXT_PUBLIC_GAUZY_API_SERVER_URL`.
  - Server implementations and API behaviour are in `apps/server-api` and related Gauzy repo (external dependency).
  - Desktop packaging and electron helpers: `.scripts/*`, `apps/server-web`, and `tools/electron` scripts used by `yarn build:web:desktop` and `yarn build:server-web`.

- **Project structure patterns to follow when editing**
  - Shared code lives under `packages/*` and `libs/*` — prefer moving reusable logic there.
  - UI components and types: check `apps/web/core/components` and `apps/web/core/types` before adding duplicates.
  - Build filters: many scripts use `turbo --filter=@ever-teams/<pkg>`; follow that pattern when creating small-scoped builds or dev tasks.

- **CI / caching**
  - Nx Cloud is configured in `nx.json` (runner: `nx-cloud`), so prefer incremental builds and keep `targetDefaults` in mind.

- **Files to reference for examples**
  - `package.json` — canonical scripts and formatting rules.
  - `nx.json` — caching and target defaults.
  - `apps/web` — primary frontend code, `.env.sample`, `env-config.ts`, `core/*` directories.
  - `apps/mobile/detox/README.md` and `apps/desktop/README.md` for platform-specific tasks.

- **When making suggestions or code changes**
  - Provide exact `yarn` or `docker-compose` commands to reproduce the change locally.
  - Indicate which app(s) will be affected (use `apps/<name>` path). If change affects shared code, list dependent packages using `yarn nx affected:apps` or `nx dep-graph`.
  - If a runtime env var is required mention the exact variable name (example: `NEXT_PUBLIC_GAUZY_API_SERVER_URL`).

If anything here is unclear, tell me which area you'd like expanded (local dev, CI, mobile, desktop packaging, or API integration) and I'll update this file.
