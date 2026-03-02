# Ever Teams – Agent Instructions (Cursor)

These instructions are for **Cursor agents** (Chat/Agent) working in this repository.

> **Related files**: See `CLAUDE.md` for detailed project instructions, and `.augment/rules/workspace.md` for Augment-specific rules.

## Project Overview

Ever Teams is an **Open Work and Project Management Platform** built as a monorepo with:

- **Web App**: Next.js 16 App Router (`apps/web`)
- **Mobile App**: React Native (`apps/mobile`)
- **Desktop App**: Electron (`apps/server-web`)
- **Browser Extensions**: (`apps/extensions`)
- **Shared Packages**: (`packages/*`) - constants, types, services, hooks, utils, ui

## Runtime & Tooling

- Use **Node.js >= 24.x.x** (see `.nvmrc` or `.node-version`).
- Use **Yarn 1.x** as the package manager.
- Run all commands from the **repository root**.
- The project uses **Turbo** for build orchestration and **Nx** for workspace management.

## Build, Dev, and Verification

### Primary Commands (Web App)

| Command | Description |
|---------|-------------|
| `yarn dev:web` | Start the dev server at `http://localhost:3030` |
| `yarn build:web` | Production build for the web app |
| `yarn start:web` | Serve the production build |
| `yarn lint` | Run ESLint across all packages (via Lerna) |
| `yarn lint-fix` | Auto-fix ESLint issues in `apps/web` |
| `yarn format` | Format code with Prettier (via Nx) |

### Package-Specific Builds

```bash
yarn build:services   # Build @ever-teams/services
yarn build:types      # Build @ever-teams/types
yarn build:constants  # Build @ever-teams/constants
yarn build:ui         # Build @ever-teams/ui
yarn build:hooks      # Build @ever-teams/hooks
yarn build:utils      # Build @ever-teams/utils
```

### Verification Steps

- **Quick checks**: Run `yarn lint` and check for TypeScript errors in your IDE.
- **Before committing**: Run `yarn lint-fix` and `yarn format`.
- **For larger or infra-level changes**: Also run `yarn build:web` to verify the production build.

## Environment & Data

- Assume `.env.local` (in `apps/web/`) already exists and is correctly configured.
- Do **not** create, modify, or print env secrets unless the user explicitly asks.
- See `apps/web/.env.sample` for available environment variables.
- The app connects to the Gauzy API backend (configured via `GAUZY_API_SERVER_URL`).

## Code Organization

### Web App (`apps/web/`)

```
apps/web/
├── app/[locale]/      # Next.js App Router pages (i18n routing)
├── app/api/           # API routes
├── core/
│   ├── components/    # React components (organized by feature)
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API service layer
│   ├── stores/        # State management (Jotai atoms)
│   ├── types/         # TypeScript interfaces and schemas
│   └── lib/           # Utilities, helpers, i18n config
├── locales/           # i18n translation JSON files
├── public/            # Static assets
└── styles/            # Global CSS and Tailwind config
```

### Shared Packages (`packages/`)

- `@ever-teams/constants` - Shared constants
- `@ever-teams/types` - TypeScript type definitions
- `@ever-teams/services` - Shared API services
- `@ever-teams/hooks` - Shared React hooks
- `@ever-teams/utils` - Shared utility functions
- `@ever-teams/ui` - Shared UI components (Radix UI based)

### When Implementing Features

- Put domain/business logic in `core/services/**` or `core/hooks/**`.
- Keep React components focused on rendering and wiring.
- Use Jotai atoms in `core/stores/**` for state management.
- Follow existing patterns for API calls (see `core/services/`).
- Prefer **TypeScript** for all code.

## Safety & Side Effects

### Avoid by Default (ask the user first)

- Installing new dependencies (`yarn add`, `yarn install` with changes).
- Running database migrations or modifying production data.
- Modifying environment files or secrets.
- Destructive scripts or scripts that affect external services.

### Safe to Run When Needed

- `yarn lint` / `yarn lint-fix`
- `yarn format`
- `yarn build:web`
- `yarn dev:web`
- `yarn start:web`

## Tech Stack Reference

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
| Icons | Lucide React, Heroicons, React Icons |

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Valid types:

- `feat` - New feature
- `fix` - Bug fix
- `test` - Adding tests
- `build` - Build system changes
- `refactor` - Code refactoring
- `docs` - Documentation
- `chore` - Maintenance tasks

---

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

---

## Source of Truth

- This file gives **high-level rules** for Cursor agents.
- For deeper details, refer to the project's `README.md` files and inline documentation.
- **Documentation**: <https://docs.ever.team/docs/introduction>
- **Docs Repository**: <https://github.com/ever-co/ever-teams-docs/tree/develop/website/docs>
- **GitHub Issues & Source**: <https://github.com/ever-co/ever-teams>
