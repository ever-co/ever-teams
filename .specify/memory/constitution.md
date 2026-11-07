# Ever Teams Constitution

> The constitution is the highest-priority document in this repository. Every feature
> spec, implementation plan and task list MUST reconcile with these principles.
> Conflicts are resolved in favour of the constitution. Non-negotiable principles are
> marked **(NON-NEGOTIABLE)**.

**Version**: 1.0.0
**Ratified**: 2026-11-07
**Applies to**: `apps/*`, `packages/*`

---

## I. The Platform API Is the Backend (NON-NEGOTIABLE)

Ever Teams is a client of the Ever Gauzy API. It stores no business data of its own:
every record a feature needs (tasks, comments, messages, documents, notifications,
integration settings) lives behind a documented platform endpoint. A feature that
needs new data first lands its API in the platform, then its client here. Next.js
route handlers under `apps/web/app/api/` are thin proxies (validate → call the
service → return the response); they never hold state.

## II. Layered Web App (NON-NEGOTIABLE)

`apps/web` keeps business logic out of components: API calls in
`core/services/client/api/<feature>/`, server-side calls in `core/services/server/`,
data fetching and mutations in `core/hooks/<feature>/` (TanStack Query), global state
in `core/stores/` (Jotai atoms), types and Zod schemas in `core/types/`, UI in
`core/components/<feature>/`, pages under `app/[locale]/`. Components render and
wire; they do not fetch or compute.

## III. Every String Is Translated (NON-NEGOTIABLE)

User-visible text is a `next-intl` message key present in **every** locale file under
`apps/web/locales/`; the mobile app uses its own i18n tables the same way. A missing
key in any locale fails the gate.

## IV. Runtime Configuration and Default-Off Flags (NON-NEGOTIABLE)

Deployment values are read at runtime through `readRuntimeEnv()` /
`getNextPublicEnv()`, never `process.env.NEXT_PUBLIC_*` directly in client code and
never as Docker build args. New behaviour ships behind a runtime flag that is **off
by default** and is documented in `apps/web/.env.sample`. Existing behaviour, options,
routes and files are never removed or replaced by a feature; what must be superseded
is gated and left for the owner's decision.

## V. One Design System

UI is built from the wrappers in `core/components/common/` (Base UI based, shadcn
patterns), Tailwind CSS 4 tokens, and icons from the central `core/components/icons/`
module. No new component library, no raw third-party primitives in feature code, no
inline colour values. Dark and light themes both work.

## VI. Security and Privacy

Secrets never reach the client bundle; tokens are exchanged server-side. Outbound
calls to anything outside the platform API are listed in
`docs/ever-platform/outbound-calls.md` and are opt-in. User content is sanitised
before rendering; links from user content open safely. Permissions mirror the
platform's roles: the client hides what the API forbids but never relies on hiding.

## VII. Real-Time Through the Platform Channel

Live updates (presence, timers, messages, notifications) come from the platform's
push channel through one shared client; features subscribe to it instead of opening
their own sockets or polling loops. Polling is a documented fallback with a stated
interval.

## VIII. Multi-Client Parity Is Planned, Web Ships First

Each feature spec states what the mobile app, the desktop app and the browser
extensions get and when. The web app ships first; shared logic that the other clients
can reuse lives in `packages/*` (`@ever-teams/types`, `services`, `hooks`, `utils`) or
in the published toolkit, not only in `apps/web`.

## IX. Tests and Gates

Hooks, services and helpers ship with Jest specs; pages and components with rendering
tests; the `web.before-merge` gate (lint, type check, cspell, Jest) must pass. New
words go in the cspell dictionary in the same change.

## X. Specs Are Behaviour-First

`spec.md` describes what a user observes (scenarios, requirements, acceptance
criteria), never the implementation. `plan.md` owns routes, components, hooks,
services and flags. `tasks.md` owns the PR-sized breakdown. A spec with an open
`[NEEDS CLARIFICATION]` marker is not approved.

## XI. Documentation Describes Our Product

Specs, comments, commit messages and user docs describe Ever Teams' behaviour in its
own terms. They never reference, compare with, or name other products or vendors as
the reason for a feature.

---

## Compliance checklist

Every `spec.md` §9 and `plan.md` §12 ticks or explains each principle:

- [ ] I Platform API is the backend; route handlers are thin proxies
- [ ] II Layered web app (services → hooks → stores → components → pages)
- [ ] III Every string in every locale
- [ ] IV Runtime config; default-off flag; nothing removed
- [ ] V One design system (common wrappers, Tailwind tokens, central icons)
- [ ] VI Security and privacy (no secrets client-side; outbound calls listed; sanitised content)
- [ ] VII Real-time through the shared platform channel
- [ ] VIII Multi-client parity stated; shared logic in packages
- [ ] IX Tests and the before-merge gate
- [ ] X Behaviour-first spec
- [ ] XI Documentation describes our product only
