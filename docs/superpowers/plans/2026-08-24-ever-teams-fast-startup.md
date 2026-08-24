# Ever Teams Fast Startup Implementation Plan

> **Execution:** Use `superpowers:subagent-driven-development`, one reviewed task at a time. All behavior changes are test-first. Never stage or modify the user's untracked `apps/mobile/app.json`.

**Goal:** Make the authenticated shell interactive through its actual dependency chain, consolidate authenticated task metadata reads, and show employee-scoped profile activity while preserving every existing feature and compatibility path.

**Pinned bases:** Ever Teams `origin/develop@7a75a102464779008f4b6e9fa61bb69e2cde8621`; Gauzy API `origin/develop@99ba709847c5dd6962b9b19b95b941f9c8e5aab9`.

**Approved design:** `../specs/2026-08-24-ever-teams-fast-startup-design.md`

## Invariants

- Do not delete, skip, hide, rename away, or make inaccessible any route, modal, control, flag, public export, service method, mutation, permission check, or test.
- Preserve the legacy initializer behind `NEXT_PUBLIC_FAST_APP_BOOTSTRAP=false` as the default rollback path in this change.
- Preserve `NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS=true`; default remains off.
- Keep public-team `byTeam` keys and legacy reads unchanged.
- Metadata fallback occurs only on 404, 405, or 501.
- Query keys fully scope tenant, organization, team, optional project/include, and profile employee/range/timezone.
- Scope changes cancel old queries, clear incompatible Jotai mirrors, and prevent late old responses from writing new scope.
- Personal plans load for every active team, even when `requirePlanToTrack=false`; they block timer actions only when required.
- Team plan atom hydration, current-user permissions, timer facade methods, auto-assignment, task statistics, and all route-owned data remain functional.
- Existing rich time-log/report hooks, atoms, API clients, and endpoints remain exported and callable.

## Task 1: Add a machine-enforced feature-preservation gate

**Files**

- Create `tools/preservation/ever-teams-surface.mjs`.
- Create `tools/preservation/ever-teams-preservation.allow.json` initialized to `[]`.
- Create `apps/web/test/architecture/feature-surface-preserved.test.ts`.
- Modify `apps/web/project.json` to point Jest at tracked `apps/web/jest.config.ts`.

The manifest records routes/layouts, modal/dialog/drawer components, navigation href/route constants, `NEXT_PUBLIC_*` occurrences, public barrel exports, API service methods, test names/skips/only markers, and Jest/Nx exclusions.

- [ ] Write failing synthetic tests proving removed route/export/service method and skipped test are violations.
- [ ] Implement `collectSurface`, `compareSurface`, and CLI support with Node built-ins plus Git plumbing.
- [ ] Generate base/head evidence and require zero allow entries:

```powershell
node tools/preservation/ever-teams-surface.mjs --base=7a75a102464779008f4b6e9fa61bb69e2cde8621 --head=HEAD --allow=tools/preservation/ever-teams-preservation.allow.json --out=artifacts/ever-teams-surface.json
yarn nx run web:test --runInBand
```

- [ ] Commit as `test: enforce Ever Teams feature preservation`.

## Task 2: Add scoped metadata client, key, and strict fallback

**Files**

- Create `apps/web/core/types/interfaces/task/task-metadata-bootstrap.ts`.
- Create `apps/web/core/services/client/api/tasks/task-metadata-bootstrap.service.ts` and tests.
- Modify the tasks service barrel and `apps/web/core/query/keys/index.ts`.
- Add optional captured scope arguments to the seven legacy read methods without breaking no-argument callers.

```ts
export type TaskMetadataScope = {
	tenantId: string;
	organizationId: string;
	organizationTeamId?: string;
	projectId?: string;
};

taskMetadata.bootstrap(scope, canonicalInclude) => [
	'task-metadata', 'bootstrap', scope.tenantId, scope.organizationId,
	scope.organizationTeamId ?? null, scope.projectId ?? null,
	canonicalInclude.join(',')
];
```

- [ ] Write failing tests for include sorting/deduplication, explicit query parameters, all section shapes, and no-argument legacy compatibility.
- [ ] Prove `tenantId` participates in cache keys only and is never serialized into the HTTP query; Gauzy derives tenant scope from the authenticated request context.
- [ ] Test 404/405/501 fallback and non-fallback for 400/401/403/409/422/429/5xx/timeout/cancel/network.
- [ ] Assemble fallback with the existing seven services in `Promise.all`; labels retain their existing `/tags/level` behavior.
- [ ] Add authenticated `byScope` section keys while leaving every `byTeam` function untouched.
- [ ] Run focused tests/typecheck and commit as `feat: add scoped task metadata bootstrap client`.

## Task 3: Coalesce authenticated metadata facades and preserve mutations

**Files**

- Create `use-task-metadata-bootstrap-query.ts`, `task-metadata-cache.ts`, and focused tests under `apps/web/core/hooks/tasks/`.
- Modify the seven authenticated query facades and their invalidation/mutation hooks.

Authenticated facades call the same reactive `useQuery` key/query function for all seven sections and select their existing section from the shared result. TanStack Query coalesces the shared in-flight request and propagates loading/error/data updates to every facade. `ensureQueryData` is reserved for deliberate prefetching, not facade reactivity. Public mode keeps the old query and key.

Cache helpers must update matching bundle entries and legacy/authenticated section keys while preserving sibling sections, section totals, optimistic label helpers, public `byTeam` caches, and different scopes/includes.

- [ ] Prove seven simultaneous consumers produce one bundle HTTP request and zero legacy reads.
- [ ] Prove 404 yields one bundle request plus the seven legacy requests; other failures yield none.
- [ ] Prove canonical partial keys cannot poison the full key.
- [ ] Prove all existing public return names/setters remain unchanged and public mode never calls the bundle.
- [ ] Prove each metadata create/edit/delete path updates or invalidates bundle and legacy keys without dropping siblings/totals.
- [ ] Run focused and existing mutation suites, typecheck, and commit as `feat: share scoped task metadata queries`.

## Task 4: Add employee-scoped profile activity

**Files**

- Create `apps/web/core/types/schemas/activities/profile-activity.schema.ts`.
- Add `getProfileActivity` to `apps/web/core/services/client/api/timesheets/statistic.service.ts` and `apps/web/core/services/client/api/timesheets/index.ts`.
- Create `apps/web/core/hooks/activities/use-profile-activity.ts` and its test; export it from `apps/web/core/hooks/activities/index.ts`.
- Modify `apps/web/core/hooks/tasks/use-task-filter.ts`.
- Modify `apps/web/core/components/activities/activity-calendar.tsx`.
- Modify `apps/web/core/components/pages/profile/user-profile-tasks.tsx`.
- Modify `apps/web/app/[locale]/(main)/profile/[memberId]/page.tsx`.

```ts
profileActivity.byScope(request) => [
	'profile-activity', request.tenantId, request.organizationId,
	request.organizationTeamId ?? null, request.employeeId,
	request.startDate, request.endDate, request.timeZone,
	request.includeDaily === true
];
```

- [ ] Write failing tests for exact target employee/team/range/timezone parameters, current-month `activeDays`, forbidden neutrality, profile switching, and absence of rich-report fallback.
- [ ] Thread scope explicitly through `Profile -> UserProfileTask -> ActivityCalendar`.
- [ ] The profile route owns the current-month summary; the calendar requests selected-year `includeDaily=true` only when the Stats tab mounts.
- [ ] Replace only the badge/calendar dependency on the rich report. Do not delete its state, hook, client, or other consumers.
- [ ] Run focused tests/typecheck and commit as `feat: scope profile activity to the selected employee`.

## Task 5: Preserve the legacy initializer and add the reversible selector

**Files**

- Create `legacy-init-state.tsx`, `fast-init-state.tsx`, `legacy-time-log-preloader.tsx`, and selector tests under `apps/web/core/components/layouts/app/`.
- Modify `init-state.tsx` and the existing public config constants.

Move the existing initializer implementation into `LegacyInitState` without removing or changing its capabilities. `AppState` remains the stable exported entry and selects legacy by default:

```tsx
return FAST_APP_BOOTSTRAP.value ? <FastInitState /> : <LegacyInitState />;
```

- [ ] First test default/false and true selections.
- [ ] Prove the default path invokes the baseline legacy hook set.
- [ ] Mount an explicit legacy yearly preloader in both paths; its existing hook stays disabled unless `NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS === 'true'`.
- [ ] Commit as `feat: add reversible fast app bootstrap`.

## Task 6: Implement the dependency-gated shell path

**Files**

- Create `fast-init-state.test.tsx` and `use-scope-transition-guard.ts`.
- Add optional `enabled`/interval options to organization-team, task, timer, daily-plan, auto-assignment, and task-statistics hooks without changing defaults or public facade methods.
- Add scoped keys; keep old key factories.

Critical order:

1. User.
2. Workspaces and active tenant/organization.
3. Teams and active team.
4. In parallel: team tasks, timer status, personal plans, and current-user permissions.
5. Auto-assignment after timer/active task; statistics only after active task.
6. Token refresh once; timer/presence polling only while relevant.

- [ ] Write failing tests for no dependent request before scope, exactly one request per phase, plans with `requirePlanToTrack=false`, timer blocking when true, active-task-only statistics, and one token-refresh schedule.
- [ ] Preserve `getTimerStatus`, `startTimer`, `stopTimer`, `toggleTimer`, `syncTimer`, `hasPlan`, `hasPlanForTomorrow`, `canRunTimer`, `canTrack`, and `isPlanVerified`.
- [ ] On scope change, cancel only old keys, clear old Jotai mirrors, and use a monotonic token/abort signal so late responses cannot write.
- [ ] Replace one-shot pseudo-refreshes with query intervals only on the fast path; do not delete compatibility utilities.
- [ ] Mark `ever-teams:shell-ready` only after critical success.
- [ ] Run initializer/timer/task regression suites and commit as `feat: gate shell startup by resolved scope`.

## Task 7: Move data ownership without losing atom hydration

Mount the existing hooks in every surface that directly reads their atom before removing that hook from the fast initializer:

- Weekly-limit/report route -> current organization.
- Team invite/member UI -> employees/invitations.
- Project financial settings -> currencies.
- Task, kanban, profile, and relevant team surfaces -> team daily plans and `dailyPlanListState` hydration.
- Permission-sensitive shell -> current-user permissions remains global.
- Role lists -> permission/edit/invite/project surfaces.
- Sidebar projects and languages -> deferred prefetch after interactive paint plus existing route/modal owners.

- [ ] Create `route-data-ownership.test.tsx` using a fresh QueryClient/Jotai store for each hard-loaded surface.
- [ ] Prove planned badges, optional plans, currencies, roles, permissions, invitations, projects, languages, and public-team behavior all remain available without warming legacy startup.
- [ ] Commit as `refactor: move feature data to owning surfaces`.

## Task 8: Wire the build-time flag safely

- [ ] Add `NEXT_PUBLIC_FAST_APP_BOOTSTRAP=false` to `apps/web/.env.sample`, never to a secret/local `.env` file.
- [ ] Trace every actual web image build path and pass the build arg through `.deploy/web/Dockerfile`, relevant compose files, and relevant dev/stage/prod workflows. Do not edit unrelated ChatGPT/API deploy paths.
- [ ] Keep generic, stage, and production defaults false. The workflow expression reads `vars.NEXT_PUBLIC_FAST_APP_BOOTSTRAP` with a literal false fallback, so the absent new variable is safely false. After local proof and a pushed maintenance claim, create/update the canonical `develop` environment variable with `gh variable set NEXT_PUBLIC_FAST_APP_BOOTSTRAP --body true --env develop` (or the actual existing develop environment name discovered read-only); record the previous/absent state for rollback.
- [ ] Build both flag positions locally and verify generated behavior.
- [ ] Commit as `build: wire fast app bootstrap flag`.

## Task 9: Add browser parity and reproducible performance evidence

Use the already-pinned Cypress dependency; add no new dependency.

- [ ] Create `apps/web/cypress.config.ts`, `apps/web/cypress/support/e2e.ts`, `apps/web/cypress/support/commands.ts`, and non-secret fixtures under `apps/web/cypress/fixtures/`.
- [ ] Create `apps/web/cypress/e2e/fast-startup.cy.ts`, `profile-activity.cy.ts`, `route-ownership.cy.ts`, `feature-parity.cy.ts`, and `fast-startup-performance.cy.ts`.
- [ ] Add a `web:e2e` target to `apps/web/project.json` using `nx:run-commands` and `yarn cypress run --config-file apps/web/cypress.config.ts`; add root scripts `e2e:web`, `perf:web`, and `preservation:web` in `package.json`.
- [ ] Add a deterministic support command that stubs the NextAuth session and Gauzy bootstrap calls from checked-in non-secret fixtures; add a separate live-auth command that reads `CYPRESS_AUTH_*` only from the environment and never logs or saves values.
- [ ] Add authenticated Cypress specs for empty-cache hard loads of team settings, permissions, projects/financial settings, profile, task, kanban, weekly limit, and invitations.
- [ ] Cover delayed workspace/team switch, timer/task mutation, plans on/off policy, permission controls, currencies, invitations, public team, self/manager/shared/denied profiles, and employee A -> B cache isolation.
- [ ] Never write auth cookie/token values to artifacts.
- [ ] Normalize only Gauzy fetch/XHR traffic: exclude OPTIONS, WebSocket, assets, RSC, session, and health; sort query params and UUID-normalize paths.
- [ ] Create `tools/performance/normalize-gauzy-request.mjs` and `tools/performance/compare-fast-startup.mjs` with unit tests. Compare five cold samples against base SHA and assert <=12 critical reads before shell-ready, <=20 Gauzy requests in five seconds, no duplicate normalized GET, and no global rich time-log/report read.
- [ ] Assert profile navigation adds one current-month summary and Stats adds one selected-year lightweight read.
- [ ] For local/CI execution, build first, start `yarn start:web` in the background, wait for `http://127.0.0.1:3030` with a bounded PowerShell/Bash loop, run `yarn e2e:web`, then always terminate only the captured server PID. The API's deterministic 100/10,000-row seed comes from the Gauzy profile plan fixture; Teams does not invent a second seed format.

## Task 10: CI and final local gate

- [ ] Expand `.github/workflows/web.before-merge.yml` paths to include changed shared packages/tools/config.
- [ ] Require preservation, existing/new Jest suites, typecheck, lint, build, affected-project audit, and deterministic browser parity. Live performance remains recorded evidence when CI lacks the database/browser fixture; it may not be silently reported as passed.
- [ ] Run:

```powershell
node tools/preservation/ever-teams-surface.mjs --base=7a75a102464779008f4b6e9fa61bb69e2cde8621 --head=HEAD --allow=tools/preservation/ever-teams-preservation.allow.json --out=artifacts/ever-teams-surface.json
yarn test:web --runInBand
yarn workspace @ever-teams/web tsc --noEmit -p tsconfig.json
yarn nx run web:lint
$env:NEXT_PUBLIC_FAST_APP_BOOTSTRAP='false'; yarn build:web
$env:NEXT_PUBLIC_FAST_APP_BOOTSTRAP='true'; yarn build:web
Remove-Item Env:NEXT_PUBLIC_FAST_APP_BOOTSTRAP
yarn nx show projects --affected --base=7a75a102464779008f4b6e9fa61bb69e2cde8621 --head=HEAD
yarn nx affected -t lint,test,build --base=7a75a102464779008f4b6e9fa61bb69e2cde8621 --head=HEAD
yarn e2e:web
git diff --check
git status --short
```

- [ ] Verify the original 10 suites / 41 tests remain present and passing, no skipped/excluded test is added, preservation allowlist is empty, and `apps/mobile/app.json` is neither modified nor staged.

## Delivery and rollback

1. Validate Teams against both the new API and an older API that exercises only the allowed metadata fallback.
2. Open/merge the Gauzy API PR first and wait for its `develop` build.
3. Before any live dev effect, claim the relevant targets in `MAINTENANCE.md` and satisfy the backup gate if a measured migration exists.
4. Merge Teams to `develop` only with reviews/checks green and flag false.
5. Canary dev with the flag true and repeat browser/performance checks.
6. Immediate rollback is flag false plus rebuild; code revert remains available. No feature or existing API is removed.
