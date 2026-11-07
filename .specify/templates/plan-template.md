# Implementation Plan: [FEATURE NAME]

> Translates an approved `spec.md` into routes, components, hooks, services and flags.
> The plan owns implementation details; the spec owns behaviour.

**Feature ID**: `[short-slug]`
**Spec**: `./spec.md`
**Tasks**: `./tasks.md`
**Status**: `Draft` | `In Review` | `Approved` | `In Progress` | `Done`
**Last updated**: YYYY-MM-DD

---

## 1. Architecture Summary

```mermaid
flowchart LR
    P[Page under app/[locale]] --> C[Feature components]
    C --> H[Hooks: TanStack Query + Jotai]
    H --> S[Client services core/services/client/api]
    S --> R[Route handler app/api (thin proxy)]
    R --> G[Platform API]
    G -. push channel .-> H
```

## 2. Tech Choices

| Concern | Choice | Rationale |
| ------- | ------ | --------- |
| Data fetching | TanStack Query hooks in `core/hooks/<feature>/` | Principle II |
| State | Jotai atoms in `core/stores/<feature>.ts` | Principle II |
| Live updates | shared platform push client | Principle VII |
| UI | `core/components/common` wrappers, Tailwind tokens, central icons | Principle V |
| Flag | `NEXT_PUBLIC_<FLAG>` via `readRuntimeEnv()` | Principle IV |

## 3. Platform API Used

| Method | Endpoint | Purpose | Platform spec |
| ------ | -------- | ------- | ------------- |

## 4. Types and Schemas

- Interfaces in `core/types/interfaces/<feature>/`, Zod schemas in `core/types/schemas/<feature>/`.
- Shared types promoted to `@ever-teams/types` when another client needs them.

## 5. Services and Route Handlers

- Client service `core/services/client/api/<feature>/<feature>.service.ts`.
- Server-side calls `core/services/server/requests/<feature>.ts` (if proxied).
- Route handlers `app/api/<feature>/…/route.ts` — validate → service → response.

## 6. Hooks and State

| Hook | Query key / atom | Purpose |
| ---- | ---------------- | ------- |

## 7. Pages, Components and Navigation

- Routes under `app/[locale]/<feature>/`.
- Components under `core/components/<feature>/`.
- Sidebar / header entries, keyboard shortcuts, command palette entries.
- i18n namespaces and keys (every locale in `apps/web/locales/`).

## 8. Other Clients

- Mobile (`apps/mobile`), desktop (`apps/server-web`), extensions: what ships now, what later.
- Toolkit / `@ever-teams/*` packages touched.

## 9. Security & Privacy

- What the client shows per role; sanitisation of user content; outbound calls listed.

## 10. Phased Rollout

1. Types, services, hooks (flag off).
2. Pages and components (flag off; reachable in dev with the flag on).
3. Live updates and notifications.
4. Flag default-on after soak, owner's decision.

## 11. Constitution Reconciliation

- I … XI (one line each)

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |

## 13. References

- Spec: `./spec.md` · Tasks: `./tasks.md` · Platform specs: …
