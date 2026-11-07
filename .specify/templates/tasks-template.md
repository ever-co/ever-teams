# Task Breakdown: [FEATURE NAME]

> Ordered, granular tasks derived from `plan.md`. Each task is small enough to land in
> one PR and ships with tests per Constitution Principle IX.

**Feature ID**: `[short-slug]`
**Plan**: `./plan.md`
**Status**: `Draft` | `Ready` | `In Progress` | `Done`
**Last updated**: YYYY-MM-DD

---

## How to use

- Tasks are sequential by default; `(parallel)` tasks can run alongside their predecessor.
- Each task names its files so an implementer can pick it up cold.
- Tick the checkbox as the PR lands; add new tasks at the bottom, never renumber.
- Everything stays behind the runtime flag until the last phase.

## Phase 1 — Types, services, hooks

- [ ] **T1**. Interfaces and Zod schemas in `core/types/`
- [ ] **T2**. Client service in `core/services/client/api/<feature>/` (+ server requests / route handlers if proxied)
- [ ] **T3**. Hooks in `core/hooks/<feature>/` with Jest specs; atoms in `core/stores/`
- [ ] **T4**. Runtime flag `NEXT_PUBLIC_<FLAG>` documented in `apps/web/.env.sample`

## Phase 2 — Pages and components

- [ ] **T5**. Components in `core/components/<feature>/` with rendering tests
- [ ] **T6**. Page(s) under `app/[locale]/<feature>/`; sidebar / header entry behind the flag
- [ ] **T7**. i18n keys in every locale file; cspell words added

## Phase 3 — Live updates, notifications, polish

- [ ] **T8**. Subscribe to the shared push client; invalidate queries on events
- [ ] **T9**. Notifications / inbox entries wired; keyboard shortcuts and command palette

## Phase 4 — Other clients and docs

- [ ] **T10**. Mobile / desktop / extension parity items (or explicit deferral in the spec)
- [ ] **T11**. User docs; `docs/specs/README.md` index row; spec status `Implemented`

## Definition of Done

- All checkboxes ticked; `web.before-merge` gate green.
- Flag default stays off; enabling it in dev shows the feature end to end.
- Constitution gates in `spec.md` §9 confirmed.
