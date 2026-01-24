---
description: Repository Information Overview
alwaysApply: true
---

# Ever Teams Information

## Summary
Ever Teams is an **Open Work and Project Management Platform** designed for workforce management, time tracking, and project collaboration. It is built as a highly modular monorepo utilizing **Turbo**, **Nx**, and **Lerna** for efficient build orchestration and workspace management.

## Repository Structure
The project follows a monorepo architecture with applications and shared packages.

### Main Repository Components
- **apps/web**: Main application built with **Next.js 16** (App Router) and **Tailwind CSS 4**.
- **apps/mobile**: Cross-platform mobile application using **React Native** and **Expo**.
- **apps/server-web**: Desktop application wrapper built with **Electron**.
- **apps/extensions**: Browser extension built with **Plasmo Framework** for time tracking.
- **apps/playground**: Next.js 16 playground for component development and testing.
- **packages/**: Shared logic and components:
  - `@ever-teams/ui`: Radix UI-based component library with Storybook
  - `@ever-teams/services`: API services and HTTP client utilities
  - `@ever-teams/types`: Shared TypeScript type definitions
  - `@ever-teams/hooks`: React hooks library
  - `@ever-teams/utils`: Utility functions
  - `@ever-teams/constants`: Shared constants and configurations

## Projects

### Web Application (Next.js)
**Configuration File**: `apps/web/package.json`

#### Language & Runtime
**Language**: TypeScript  
**Version**: Node.js >= 24.x.x  
**Build System**: Turbo + Nx  
**Package Manager**: Yarn 1.x

#### Dependencies
**Main Dependencies**:
- **Framework**: Next.js 16 (App Router)
- **UI**: Radix UI, Tailwind CSS 4, Lucide React
- **State**: Jotai, TanStack Query (React Query)
- **Auth**: NextAuth.js v5 (beta)
- **Forms**: React Hook Form + Zod

#### Build & Installation
```bash
# Installation (from root)
yarn install

# Development
yarn dev:web

# Production Build
yarn build:web
```

### Mobile Application (React Native)
**Configuration File**: `apps/mobile/package.json`

#### Language & Runtime
**Language**: TypeScript  
**Version**: React Native 0.79.2, Expo 53  
**Package Manager**: Yarn 1.x

#### Dependencies
**Main Dependencies**:
- Expo, React Navigation, MobX State Tree, TanStack Query, Sentry.

#### Testing
**Framework**: Jest, Detox (E2E)
**Run Command**:
```bash
yarn test
yarn test:detox
```

### Desktop Application (Electron)
**Configuration File**: `apps/server-web/package.json`

#### Language & Runtime
**Language**: TypeScript  
**Framework**: Electron 35.7.5, React 19  
**Build System**: Webpack

#### Build & Installation
```bash
# Build desktop app
yarn build:server-web

# Pack for specific OS
yarn pack:server-web:mac
yarn pack:server-web:win
yarn pack:server-web:linux
```

### Browser Extension (Plasmo)
**Configuration File**: `apps/extensions/package.json`

#### Language & Runtime
**Language**: TypeScript  
**Framework**: Plasmo 0.85.2 (Chrome Extension Framework)  
**UI**: React 18, Tailwind CSS 3  
**Package Manager**: Yarn 1.x

#### Dependencies
**Main Dependencies**:
- Plasmo Framework, React, React Timer Hook, Tailwind CSS

#### Build & Installation
```bash
# Development (hot-reload)
yarn plasmo dev

# Production Build
yarn plasmo build
```

### Playground (Next.js)
**Configuration File**: `apps/playground/package.json`

#### Language & Runtime
**Language**: TypeScript  
**Framework**: Next.js 16, React 19  
**UI**: Tailwind CSS 4, @ever-teams/ui  
**Package Manager**: Yarn 1.x

#### Build & Installation
```bash
# Development
yarn dev:playground

# Production Build
cd apps/playground && yarn build
```

## Shared Packages
The monorepo includes several internal packages that provide shared functionality across all applications.

### @ever-teams/ui
**Configuration**: `packages/ui/package.json`  
**Build System**: Rollup + Tailwind CSS 4  
**Description**: Component library built on Radix UI primitives with Storybook documentation.

**Key Dependencies**: Radix UI suite, Lucide React, React Hook Form, Zod, Recharts, Sonner

**Commands**:
```bash
yarn build:ui       # Build package
yarn run storybook  # Run Storybook (from packages/ui)
```

### @ever-teams/services
**Configuration**: `packages/services/package.json`  
**Build System**: tsup  
**Description**: API client services and HTTP utilities using Axios.

### @ever-teams/hooks
**Configuration**: `packages/hooks/package.json`  
**Build System**: tsup  
**Description**: Shared React hooks for common functionality.

### @ever-teams/types
**Description**: Shared TypeScript type definitions and interfaces.

### @ever-teams/utils
**Description**: Common utility functions and helpers.

### @ever-teams/constants
**Description**: Shared constants and configuration values.

## Docker Configuration

### Docker Compose Configurations

The repository includes multiple Docker Compose setups for different environments:

- **`docker-compose.yml`** - Production-like setup with Gauzy API (`ghcr.io/ever-co/gauzy-api` and `ever-teams-webapp`)
- **`docker-compose.dev.yml`** - Development environment with hot-reloading
- **`docker-compose.infra.yml`** - Infrastructure services only (PostgreSQL, Redis, Minio, Elasticsearch, Zipkin)
- **`docker-compose.build.yml`** - Build configuration
- **`docker-compose.demo.yml`** - Demo environment

### Infrastructure Services

- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **Minio** - S3-compatible object storage
- **Elasticsearch** - Search and analytics
- **Zipkin** - Distributed tracing

## Testing & Validation
**Frameworks**: 
- **Unit/Integration**: Jest (across all projects)
- **E2E**: Cypress (web), Detox (mobile)
- **Linting**: ESLint, Stylelint, Prettier, Commitlint

**Run Commands**:
```bash
# Lint all packages
yarn lint

# Fix lint issues
yarn lint-fix

# Format code
yarn format

# Run all tests (via Nx)
yarn nx run-many --target=test --all
```

## Architectural Organization
- **Monorepo Strategy**: Uses Yarn Workspaces and Lerna to manage internal dependencies between `packages/` and `apps/`.
- **Shared Packages**: Domain logic (services, hooks, types) is abstracted into internal packages to ensure consistency across Web, Mobile, and Desktop.
- **i18n**: Uses `next-intl` (Web) and `i18next` (Mobile/Desktop) for comprehensive internationalization.
- **Styling**: Standardized on Tailwind CSS 4 and Radix UI primitives.
