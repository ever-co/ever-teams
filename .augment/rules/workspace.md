# Ever Teams – Augment Rules

These rules are for **Augment Code / Augment Agent** when working in this repository.

Most project details (build, run, tests, env, docs) are documented in `CLAUDE.md`. Keep this file short and treat `CLAUDE.md` as the single source of truth.

## Runtime & Tooling

- Use **Node.js >= 24.x.x** (see `package.json` engines).
- Use **Yarn 1.x** as the package manager (lockfile: `yarn.lock`).
- Run all commands from the **repository root**.
- Build orchestration uses **Turbo** + **Nx**.

## Build, Dev, and "Tests"

From the repo root:

| Command | Purpose |
|---------|---------|
| `yarn dev:web` | Start dev server (http://localhost:3030) |
| `yarn build:web` | Production build for web app |
| `yarn start:web` | Start built app |
| `yarn lint` | ESLint across all packages |
| `yarn lint-fix` | Auto-fix lint issues |
| `yarn format` | Format code with Prettier |

### Treat as Main "Tests"

- `yarn lint`
- `yarn build:web` (for bigger or infra-level changes)

If the user asks to "run tests" or "make sure it works", run at least **lint**, and for non-trivial changes also `yarn build:web`.

## Environment Expectations

- Assume `.env.local` (in `apps/web/`) already exists and is valid.
- Do **not** create or edit `.env.local` unless explicitly asked.
- Never print secrets (auth keys, API URLs, etc.) in responses or logs.
- The app connects to the Gauzy API backend via `GAUZY_API_SERVER_URL`.

## Editing Guidelines

- Prefer **small, localized diffs** and follow existing patterns.
- Put business logic in:
  - `apps/web/core/services/**`
  - `apps/web/core/hooks/**`
- Keep React components (in `apps/web/core/components/**` and `apps/web/app/**`) mostly presentational.
- Use Jotai atoms in `apps/web/core/stores/**` for state management.
- When modifying env vars or API contracts, also update:
  - `apps/web/.env.sample`
  - `README.md`
- Do **not** add new dependencies unless the user explicitly approves.

## Safe Commands for Augment

### Safe Without Extra Confirmation

- `yarn lint` / `yarn lint-fix`
- `yarn format`
- `yarn build:web` (when checking a change or when requested)
- `yarn dev:web` (to start a dev server if not already running)

### Require Explicit User Confirmation

- `yarn install` or `yarn add`
- Any script that modifies external services
- Database or API changes against production-like environments

## Monorepo Structure

```
ever-teams/
├── apps/
│   ├── web/           # Next.js 16 web app (main)
│   ├── mobile/        # React Native mobile app
│   ├── server-web/    # Electron desktop app
│   └── extensions/    # Browser extensions
├── packages/
│   ├── constants/     # @ever-teams/constants
│   ├── types/         # @ever-teams/types
│   ├── services/      # @ever-teams/services
│   ├── hooks/         # @ever-teams/hooks
│   ├── utils/         # @ever-teams/utils
│   └── ui/            # @ever-teams/ui
└── libs/              # Additional shared libraries
```

## Relationship to CLAUDE.md

- Treat this file as a **thin rules layer** for Augment.
- For full instructions (environment variables, project structure, scripts, docs, coding conventions), **always refer to `CLAUDE.md` at the repo root**.
- For Cursor-specific instructions and Nx MCP tooling, see `AGENTS.md`.

## Documentation

- **Live Docs**: <https://docs.ever.team/docs/introduction>
- **Docs Repository**: <https://github.com/ever-co/ever-teams-docs/tree/develop/website/docs>
- **GitHub**: <https://github.com/ever-co/ever-teams>
