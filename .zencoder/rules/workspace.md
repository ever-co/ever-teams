---
description: Zencoder Workspace Rules
alwaysApply: true
---

# Ever Teams – Zencoder Workspace Rules

Comprehensive workspace rules and project instructions for Zencoder when working in this repository.

---

## Project Overview

**Ever Teams** is an Open Work and Project Management Platform built as a highly modular **monorepo** with multiple applications and shared packages:

### Applications
- **Web App** (`apps/web`) - Next.js 16 App Router, Tailwind CSS 4, main application
- **Mobile App** (`apps/mobile`) - React Native 0.79.2 + Expo 53, cross-platform
- **Desktop App** (`apps/server-web`) - Electron 35.7.5 wrapper with React 19
- **Browser Extension** (`apps/extensions`) - Plasmo Framework for time tracking
- **Playground** (`apps/playground`) - Next.js 16 component development sandbox

### Shared Packages (`packages/`)
- `@ever-teams/ui` - Radix UI-based component library with Storybook
- `@ever-teams/services` - API client services (Axios-based)
- `@ever-teams/hooks` - Shared React hooks
- `@ever-teams/types` - TypeScript type definitions
- `@ever-teams/utils` - Utility functions
- `@ever-teams/constants` - Shared constants and configurations
- `@ever-teams/eslint-config` - Shared ESLint configuration
- `@ever-teams/ts-config` - Shared TypeScript configuration

---

## Quick Reference

| What | Command | Notes |
|------|---------|-------|
| Install | `yarn install` | From repo root |
| Dev Server | `yarn dev:web` | http://localhost:3030 |
| Build | `yarn build:web` | Production build |
| Lint | `yarn lint` | Check all packages |
| Lint Fix | `yarn lint-fix` | Auto-fix issues |
| Format | `yarn format` | Prettier formatting |

---

## Runtime Environment

### Requirements
- **Node.js**: `>= 24.x.x` (see `.nvmrc` and `.node-version`)
- **Package Manager**: Yarn 1.x (lockfile: `yarn.lock`)
- **Build Orchestration**: Turbo + Nx for efficient monorepo management
- **Working Directory**: Always run commands from **repository root**

### Key Configuration Files
- `turbo.json` - Turbo build pipeline configuration
- `nx.json` - Nx workspace configuration
- `lerna.json` - Lerna monorepo management
- `tsconfig.base.json` - Base TypeScript configuration
- `.prettierrc` - Prettier formatting rules (embedded in web app's package.json)

---

## Verification Strategy

Since this project has minimal test infrastructure, use these as the primary "test suite":

### Always Run
```bash
yarn lint              # ESLint check (primary verification)
```

### For Significant Changes
```bash
yarn build:web         # Verify production build succeeds
```

### Quick Type Check
- Monitor TypeScript errors in your IDE/editor
- No need to run `tsc --noEmit` separately if IDE shows no errors

### Before Committing
```bash
yarn lint-fix          # Auto-fix lint issues
yarn format            # Format code with Prettier
yarn build:web         # Final build verification
```

---

## Common Commands

### Web Application Development

```bash
# Install dependencies (from root)
yarn install
# or
yarn bootstrap

# Start development server (http://localhost:3030)
yarn dev:web

# Production build
yarn build:web

# Start production server
yarn start:web

# Code quality
yarn lint              # Lint all packages
yarn lint-fix          # Auto-fix lint issues
yarn format            # Format with Prettier
```

### Package-Specific Builds

Build shared packages before web development:

```bash
yarn build:services    # @ever-teams/services
yarn build:types       # @ever-teams/types
yarn build:constants   # @ever-teams/constants
yarn build:ui          # @ever-teams/ui
yarn build:hooks       # @ever-teams/hooks
yarn build:utils       # @ever-teams/utils
```

### Full Monorepo Build

```bash
yarn build             # Build all packages via Turbo
```

### Other Applications

```bash
# Mobile development
yarn dev:mobile

# Desktop development
yarn dev:server-web

# Browser extension development
yarn plasmo dev

# Playground development
yarn dev:playground
```

### Nx Commands

```bash
yarn nx affected:build      # Build affected projects
yarn nx affected:lint       # Lint affected projects
yarn nx dep-graph           # View dependency graph
yarn nx run-many --target=test --all  # Run tests across all projects
```

---

## Environment Variables

### Web App Configuration (`apps/web/.env.local`)

Required environment variables (see `apps/web/.env.sample` for full list):

```bash
# API Configuration
GAUZY_API_SERVER_URL=https://api.ever.team
NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://api.ever.team

# Auth (NextAuth v5)
AUTH_SECRET=<generated-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3030

# Application
NEXT_PUBLIC_WEB_APP_URL=http://localhost:3030
NEXT_PUBLIC_APP_NAME="Ever Teams"

# Optional: Monitoring & Analytics
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=...
```

### Important Notes
- **Assume** `.env.local` exists in `apps/web/` and is correctly configured
- **Never** create, modify, or print environment secrets without explicit user request
- **Never** log or expose secrets (API keys, auth tokens, etc.)
- The web app runs on port **3030** by default
- Environment injection handled by `apps/web/env.js` at startup

---

## Code Organization

### Web App Structure (`apps/web/`)

```
apps/web/
├── app/
│   ├── [locale]/           # Next.js App Router with i18n routing
│   │   ├── (auth)/         # Auth-related pages
│   │   ├── (dashboard)/    # Dashboard pages
│   │   └── ...
│   └── api/                # API route handlers
├── core/
│   ├── components/         # React components (feature-organized)
│   │   ├── auth/           # Authentication components
│   │   ├── common/         # Shared UI components
│   │   ├── features/       # Feature-specific components
│   │   ├── layouts/        # Layout components
│   │   ├── pages/          # Page-level components
│   │   ├── tasks/          # Task management
│   │   ├── teams/          # Team management
│   │   └── ...
│   ├── hooks/              # Custom React hooks (~159 hooks)
│   ├── services/           # API service layer (~121 services)
│   │   ├── client/         # Client-side services
│   │   └── server/         # Server-side services
│   ├── stores/             # Jotai atoms for state management
│   ├── types/              # TypeScript types, interfaces, schemas
│   │   ├── schemas/        # Zod validation schemas
│   │   └── ...
│   └── lib/
│       ├── auth/           # Auth utilities
│       ├── helpers/        # Helper functions
│       ├── i18n/           # i18n configuration
│       ├── utils/          # Utility functions
│       └── validation/     # Zod validators
├── locales/                # i18n JSON files (en, es, fr, de, ar, etc.)
├── public/                 # Static assets
├── styles/                 # Global CSS and Tailwind
└── assets/                 # Images, fonts, icons
```

### Where to Put Code

| Type | Location | Example |
|------|----------|---------|
| Business Logic | `apps/web/core/services/` | API calls, data transformations |
| Custom Hooks | `apps/web/core/hooks/` | Reusable React hooks |
| State Management | `apps/web/core/stores/` | Jotai atoms |
| UI Components | `apps/web/core/components/` | React components (feature-organized) |
| Types/Interfaces | `apps/web/core/types/` | TypeScript definitions |
| Validation | `apps/web/core/types/schemas/` | Zod schemas |
| Utilities | `apps/web/core/lib/` | Helper functions |
| API Routes | `apps/web/app/api/` | Next.js API handlers |
| Pages | `apps/web/app/[locale]/` | Next.js App Router pages |

### Architecture Guidelines

**Component Organization**:
- Keep components **feature-organized** rather than type-organized
- Business logic belongs in `core/services/**` or `core/hooks/**`
- Components should be mostly **presentational** and handle wiring/data-fetching
- Use Jotai atoms (`core/stores/**`) for global state management

**Service Layer**:
- API calls abstracted in `core/services/**`
- Follow existing patterns for service implementation
- Server-side services in `core/services/server/`
- Client-side services in `core/services/client/`

**State Management**:
- Use **Jotai** for global state (atoms in `core/stores/**`)
- Use **TanStack Query** for server state (data fetching/caching)
- Local component state with `useState` for UI-only state

---

## Coding Standards (Quick Reference)

### TypeScript
- Use TypeScript everywhere; **no plain `.js` files**
- Define types/interfaces for all data structures
- Use Zod schemas for runtime validation
- Export types alongside implementations

### Formatting (Prettier)
```json
{
  "printWidth": 120,
  "singleQuote": true,
  "semi": true,
  "useTabs": true,
  "tabWidth": 4,
  "arrowParens": "always",
  "trailingComma": "none"
}
```

### React Patterns
- **Functional components** with hooks (no class components)
- **async/await** over raw Promises
- **React Hook Form + Zod** for forms
- **next-intl** for all user-facing text (no hard-coded strings)

### Import Order
```typescript
// 1. External dependencies
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal packages
import { Button } from '@ever-teams/ui';
import { useAuth } from '@ever-teams/hooks';

// 3. Relative imports
import { TaskCard } from './TaskCard';
```

---

## Safety Guidelines

### Safe to Run Immediately ✅

```bash
yarn lint                  # Read-only check
yarn lint-fix              # Auto-fix lint issues
yarn format                # Format code
yarn build:web             # Verify build
yarn dev:web               # Start dev server
yarn nx dep-graph          # View dependencies
```

### Require User Confirmation ⚠️

```bash
yarn install               # Install/update dependencies
yarn add <package>         # Add new dependencies
yarn upgrade               # Upgrade dependencies
```

**Also require confirmation for**:
- Modifying `.env` files or secrets
- Running scripts that affect external services/databases
- Installing global tools
- Modifying Docker configurations
- Modifying CI/CD pipelines
- Committing changes (unless explicitly requested)

---

## Tech Stack Reference

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| **Framework** | Next.js | 16 (App Router) | SSR, RSC, API routes |
| **Language** | TypeScript | 5.9+ | Strict mode enabled |
| **Styling** | Tailwind CSS | 4 | With Tailwind 4 features |
| **UI Components** | Radix UI | Latest | Unstyled, accessible primitives |
| **State (Global)** | Jotai | 2.15+ | Atomic state management |
| **State (Server)** | TanStack Query | 5.90+ | Data fetching/caching |
| **Forms** | React Hook Form | 7.68+ | With Zod validation |
| **Validation** | Zod | 3.25+ | Runtime type validation |
| **i18n** | next-intl | 4.5+ | Internationalization |
| **Auth** | NextAuth.js | v5 (beta) | Authentication |
| **Monitoring** | Sentry | 10.29+ | Error tracking |
| **Build** | Turbo | Latest | Monorepo build system |
| **Workspace** | Nx | Latest | Monorepo management |
| **Icons** | Lucide React | Latest | Primary icon library |
| **Charts** | Recharts | 2.15+ | Data visualization |
| **Mobile** | React Native | 0.79.2 | With Expo 53 |
| **Desktop** | Electron | 35.7.5 | Desktop wrapper |
| **Extension** | Plasmo | 0.85.2 | Browser extension framework |

---

## Monorepo Structure

```
ever-teams/
├── apps/
│   ├── web/              # Next.js 16 web app (primary)
│   ├── mobile/           # React Native + Expo
│   ├── server-web/       # Electron desktop app
│   ├── extensions/       # Plasmo browser extension
│   └── playground/       # Next.js component playground
├── packages/
│   ├── ui/               # @ever-teams/ui (Radix UI components)
│   ├── services/         # @ever-teams/services (API clients)
│   ├── hooks/            # @ever-teams/hooks (React hooks)
│   ├── types/            # @ever-teams/types (TypeScript types)
│   ├── utils/            # @ever-teams/utils (Utilities)
│   └── constants/        # @ever-teams/constants (Constants)
└── .zencoder/
    └── rules/            # Zencoder-specific rules
```

---

## Dependency Management

### Before Adding Dependencies
1. **Check if it already exists** in the project
2. **Search for similar functionality** in existing packages
3. **Ask user for approval** before running `yarn add`

### Building Shared Packages
If you modify a shared package, rebuild it before testing in apps:

```bash
yarn build:services       # After modifying @ever-teams/services
yarn build:types          # After modifying @ever-teams/types
yarn build:ui             # After modifying @ever-teams/ui
yarn build:hooks          # After modifying @ever-teams/hooks
yarn build:utils          # After modifying @ever-teams/utils
yarn build:constants      # After modifying @ever-teams/constants
```

---

## Internationalization (i18n)

**Critical Rule**: Never use hard-coded strings in UI components.

### Correct Usage
```typescript
import { useTranslations } from 'next-intl';

export function WelcomeHeader() {
  const t = useTranslations('common');
  return <h1>{t('welcome')}</h1>;
}
```

### Incorrect Usage ❌
```typescript
export function WelcomeHeader() {
  return <h1>Welcome</h1>;  // ❌ Hard-coded string
}
```

Translation files are in `apps/web/locales/{locale}/*.json`.

---

## Commit Convention

This project uses **Conventional Commits** enforced by Commitlint.

### Format
```
<type>(<scope>): <subject>
```

### Valid Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting, whitespace)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding/updating tests
- `build` - Build system changes
- `ci` - CI/CD changes
- `chore` - Maintenance

### Examples
```
feat(web): add task filtering by priority
fix(mobile): resolve crash on task creation
refactor(services): simplify API error handling
docs(readme): update installation steps
```

---

## Zencoder Workflow

### Standard Task Flow
1. **Understand**: Clarify requirements and constraints
2. **Search**: Use Grep/Glob to find relevant files
3. **Read**: Review context before modifying
4. **Plan**: Identify minimal changes needed
5. **Implement**: Make focused, surgical edits
6. **Verify**: Run `yarn lint` (and `yarn build:web` for significant changes)
7. **Report**: Summarize changes clearly

### Tool Usage Best Practices
- **Batch reads**: Read multiple related files in parallel when possible
- **Minimal edits**: Change only what's necessary
- **Match style**: Preserve existing formatting and patterns
- **Verify immediately**: Run lint/build after changes

---

## Common Pitfalls to Avoid

❌ **Don't**:
- Add dependencies without checking if they already exist
- Use hard-coded strings instead of i18n
- Put business logic in React components
- Create `.env` files without explicit request
- Run `yarn install` unnecessarily
- Commit changes without being asked
- Print or log environment secrets

✅ **Do**:
- Reuse existing services, hooks, and components
- Use Zod for validation
- Keep components presentational
- Run `yarn lint` after changes
- Follow existing patterns and conventions
- Ask for clarification when uncertain

---

## Key Patterns to Follow

### When Implementing Features

1. **Plan first**: Understand the existing architecture and patterns
2. **Locate existing patterns**: Search for similar implementations
3. **Reuse services/hooks**: Don't duplicate logic that already exists
4. **Small, focused changes**: Prefer incremental improvements
5. **Type everything**: Use TypeScript types and Zod schemas
6. **i18n from the start**: Use translation keys, not hard-coded strings
7. **Follow component structure**: Business logic in services/hooks, not components
8. **Test your changes**: Run lint, build, and manual testing

### When Modifying Existing Code

1. **Read surrounding context**: Understand the existing implementation
2. **Match code style**: Follow existing patterns and conventions
3. **Preserve behavior**: Don't introduce breaking changes unless intended
4. **Update related files**: Keep documentation in sync
5. **Consider impacts**: Think about dependent components/services

### When Uncertain

- **Ask clarifying questions** before making assumptions
- **Search the codebase** for similar implementations
- **Consult documentation** for project-specific patterns
- **Run verification commands** to ensure changes work
- **Request user confirmation** for risky or unclear changes

---

## Documentation & Resources

### Project Documentation
- **Live Docs**: https://docs.ever.team/docs/introduction
- **Docs Repository**: https://github.com/ever-co/ever-teams-docs/tree/develop/website/docs
- **GitHub Repository**: https://github.com/ever-co/ever-teams

### Related Configuration Files
- **`.zencoder/rules/repo.md`** - Repository structure overview (auto-generated)
- **`.zencoder/rules/coding-standards.md`** - Detailed coding standards
- **`CLAUDE.md`** - Claude-specific instructions
- **`AGENTS.md`** - Cursor agent instructions with Nx MCP
- **`.augment/rules/workspace.md`** - Augment Code rules
- **`README.md`** - High-level project overview

### When to Consult Docs
- Before making large architectural changes
- When adding new features or integrations
- When modifying build or deployment configurations
- When unclear about existing patterns or conventions

---

## Final Checklist

Before completing any task:

- [ ] Code follows TypeScript and React best practices
- [ ] Existing patterns and conventions matched
- [ ] i18n used for all user-facing text
- [ ] Types and Zod schemas defined
- [ ] Business logic in services/hooks (not components)
- [ ] Code properly formatted (Prettier)
- [ ] `yarn lint` passes without errors
- [ ] `yarn build:web` succeeds (for significant changes)
- [ ] No unauthorized dependency additions
- [ ] No secrets exposed or logged
- [ ] Documentation updated if necessary
