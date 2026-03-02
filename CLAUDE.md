# CLAUDE.md — Ever Teams Project Instructions

This file gives Claude Code (and other AI coding tools) project-specific instructions for working in this repo.

## 1. Project Overview

Ever Teams is an **Open Work and Project Management Platform** built as a monorepo:

- **Web App**: Next.js 16 App Router (`apps/web`) - Main application
- **Mobile App**: React Native (`apps/mobile`)
- **Desktop App**: Electron wrapper (`apps/server-web`)
- **Browser Extensions**: (`apps/extensions`)
- **Shared Packages**: (`packages/*`) - constants, types, services, hooks, utils, ui

## 2. Environment & Tooling

- Always run commands from the **repository root**.
- Node.js: **>= 24.x.x** (see `package.json` engines and `.nvmrc`).
- Primary package manager: **Yarn 1.x** (lockfile: `yarn.lock`).
- Build orchestration: **Turbo** + **Nx** for workspace management.
- Scripts should be invoked via `yarn`; avoid calling `npm` or `pnpm`.

## 3. Install Dependencies

Prefer these commands:

```bash
yarn install
# or
yarn bootstrap
```

- Avoid re-running `yarn install` if `node_modules/` already exists, unless dependencies changed.
- Do **not** add new dependencies without an explicit request; prefer using existing libraries.
- The monorepo uses Yarn Workspaces + Lerna for package management.

## 4. Required Environment Variables

Before `dev`, `build`, or `start`, ensure a `.env.local` file exists in `apps/web/`. See `apps/web/.env.sample` for the full list. Key variables:

```bash
# API Configuration
GAUZY_API_SERVER_URL=https://api.ever.team
NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://api.ever.team

# Auth (NextAuth v5)
AUTH_SECRET=...          # openssl rand -base64 32

# Application
NEXT_PUBLIC_WEB_APP_URL=http://localhost:3030

# Optional: Sentry, Analytics, etc.
SENTRY_DSN=...
```

- The web app runs on port **3030** by default.
- `apps/web/env.js` handles environment injection at startup.

## 5. Common Commands

### Web App Development

```bash
# Start dev server (http://localhost:3030)
yarn dev:web

# Production build
yarn build:web

# Start built app
yarn start:web

# Lint all packages
yarn lint

# Fix lint issues in apps/web
yarn lint-fix

# Format code
yarn format
```

### Package Builds (run before dev if needed)

```bash
yarn build:services    # @ever-teams/services
yarn build:types       # @ever-teams/types
yarn build:constants   # @ever-teams/constants
yarn build:ui          # @ever-teams/ui
yarn build:hooks       # @ever-teams/hooks
yarn build:utils       # @ever-teams/utils
```

### Full Build

```bash
yarn build             # Build all packages via Turbo
```

### Nx Commands

```bash
yarn nx affected:build   # Build affected projects
yarn nx affected:lint    # Lint affected projects
yarn nx dep-graph        # View dependency graph
```

### Verification Steps

- Treat `yarn lint`, and `yarn build:web` as the main "test suite".
- For non-trivial code changes, run at least `yarn lint`.
- For infra-level changes, also run `yarn build:web`.

## 6. Code Organization

### Web App (`apps/web/`)

```
apps/web/
├── app/
│   ├── [locale]/        # Next.js App Router pages (i18n via next-intl)
│   └── api/             # API route handlers
├── core/
│   ├── components/      # React components (organized by feature)
│   │   ├── auth/        # Authentication components
│   │   ├── common/      # Shared UI components
│   │   ├── features/    # Feature-specific components
│   │   ├── layouts/     # Layout components
│   │   ├── pages/       # Page-level components
│   │   ├── tasks/       # Task management components
│   │   ├── teams/       # Team components
│   │   └── ...
│   ├── hooks/           # Custom React hooks (~159 hooks)
│   ├── services/        # API service layer (~121 services)
│   ├── stores/          # Jotai atoms for state management
│   ├── types/           # TypeScript interfaces, schemas, enums
│   └── lib/
│       ├── auth/        # Auth utilities
│       ├── helpers/     # Helper functions
│       ├── i18n/        # Internationalization config
│       ├── utils/       # Utility functions
│       └── validation/  # Zod validators
├── locales/             # i18n JSON files (en, es, fr, de, ar, etc.)
├── public/              # Static assets
└── styles/              # Global CSS, Tailwind config
```

### Shared Packages (`packages/`)

| Package | Purpose |
|---------|---------|
| `@ever-teams/constants` | Shared constants and configuration |
| `@ever-teams/types` | TypeScript type definitions |
| `@ever-teams/services` | Shared API service utilities |
| `@ever-teams/hooks` | Shared React hooks |
| `@ever-teams/utils` | Shared utility functions |
| `@ever-teams/ui` | Shared UI components (Radix-based) |

### When Adding Features

- Put business logic in `core/services/**` or `core/hooks/**`, not in components.
- Keep React components mostly presentational and data-fetching.
- Use Jotai atoms in `core/stores/**` for global state.
- Follow existing patterns for API calls (see `core/services/`).
- Reuse existing hooks and services instead of duplicating logic.

## 7. Coding Style & Conventions

- Use **TypeScript** everywhere; avoid plain `.js` files.
- Follow the existing **Prettier** config (tabs, 4-space tabWidth, 120-char printWidth, single quotes).
- Prefer `async/await` over raw Promise chains.
- Validate input with **Zod** where appropriate; see schemas in `core/types/schemas/`.
- For forms, prefer `react-hook-form` + Zod; follow patterns in existing auth forms.
- For API routes:
  - Put shared logic in `core/services/`.
  - Keep handlers thin: validate → call service → return response.
- Keep i18n-friendly: use `next-intl` messages, avoid hard-coded strings.

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat` - New feature
- `fix` - Bug fix
- `test` - Adding tests
- `build` - Build system changes
- `refactor` - Code refactoring
- `docs` - Documentation
- `chore` - Maintenance tasks

## 8. Tech Stack Reference

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI, shadcn/ui patterns |
| State Management | Jotai |
| Data Fetching | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| i18n | next-intl |
| Auth | NextAuth.js v5 (beta) |
| Monitoring | Sentry |
| Build | Turbo + Nx |
| Icons | Lucide React, Heroicons, React Icons |

## 9. Safe Command & Editing Guidelines

### Safe to Run

- `yarn lint` / `yarn lint-fix`
- `yarn format`
- `yarn build:web`
- `yarn dev:web` / `yarn start:web`

### Require User Confirmation

- `yarn install` or `yarn add` (adding dependencies)
- Any script that modifies external services or databases
- Changes to auth, payments, or analytics integrations
- Modifying `.env` files or secrets

### Avoid Unless Explicitly Asked

- Running destructive scripts
- Installing new global tools
- Modifying system-level config

## 10. Related Documentation

Before large changes, consult:

- `README.md` - High-level overview and setup
- `AGENTS.md` - Cursor agent instructions + Nx MCP tooling
- **Live Docs**: <https://docs.ever.team/docs/introduction>
- **Docs Repository**: <https://github.com/ever-co/ever-teams-docs/tree/develop/website/docs>
- **GitHub**: <https://github.com/ever-co/ever-teams>
