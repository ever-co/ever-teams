# Ever Teams Fast Startup and Profile Activity Design

**Date:** 2026-08-24
**Status:** Approved architecture; written specification revised after independent review
**Repositories:** `ever-co/ever-gauzy` and `ever-co/ever-teams`
**Target branches:** `develop` only

## 1. Purpose

Ever Teams currently starts a large set of server-state queries from `init-state.tsx`. The hooks begin fetching during render, so invoking `firstLoad...` functions afterward does not sequence those requests. A cold authenticated load can consequently start roughly 22 reads plus two statistics POSTs. The current-month time-log daily report is especially harmful on better-sqlite3 because it hydrates time logs and multiple relations, then groups them in application code, while the global result is used only for a profile Stats-tab badge.

This change will make the shell interactive using only its true dependencies, move feature data to the route or modal that displays it, and add two focused additive Gauzy API reads:

1. A cheap employee profile activity summary.
2. A task-metadata bootstrap response that replaces six or seven concurrent metadata HTTP requests with one request.

The change is an orchestration and read-path redesign. It must not remove a feature, API, route, modal, permission rule, mutation, or compatibility facade.

## 2. Non-negotiable feature-preservation contract

The implementation is incomplete if any item below disappears or becomes inaccessible.

| Capability | Preservation requirement | Proof required before merge |
| --- | --- | --- |
| Authentication and token refresh | User gating, refresh scheduling, logout behavior, and existing auth routes remain unchanged. | Existing auth tests plus authenticated local browser session. |
| Workspace and organization switching | Switching scope loads the new tenant/organization/team data and never reuses the previous scope's cache. | Query-key tests and a browser switch test. |
| Team selection and team presence | Team list/detail, member state, public-team behavior, and timer-related team refresh remain available. | Existing team UI smoke tests and public-key compatibility test. |
| Tasks and timer | Task list, active task, timer start/stop/sync/status, and task status transitions retain current behavior. | Timer/task regression tests and local browser smoke. |
| Auto-assignment and task statistics | Existing behavior remains, but runs only after the timer and active task are resolved. | Focused effect tests covering the same triggering conditions. |
| Task metadata reads and mutations | Statuses, priorities, sizes, labels, versions, issue types, and related issue types remain readable and mutable. Optimistic updates and invalidation continue to work. | One-read bundle test plus CRUD/mutation invalidation tests. |
| Public-team metadata | Existing unscoped public-team cache keys and flows remain supported. | Public-team compatibility test. |
| Daily-plan policy and UI | `requirePlanToTrack`, personal plans, team plans, planned badges, and plan routes remain functional. | Conditional bootstrap and route tests. |
| Invitations | Team invitations and personal invitations remain available in their existing pages and modals. | Route/modal smoke tests. |
| Projects, languages, employees, roles, permissions, and currencies | All existing consumers retain their data; only ownership and load timing change. | Route/modal tests for each moved domain. |
| Profile task tabs and activity | Assigned, unassigned, worked, daily-plan, and Stats tabs remain. Stats becomes correctly employee-scoped. | Profile tests for self, manager, and shared teammate. |
| `shareProfileView` | Two active teammates may view the target profile activity only when the active team allows profile sharing. | API authorization tests and browser profile test. |
| Legacy yearly time-log preload | `NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS=true` continues to enable the existing preload capability; the default remains off. | Feature-flag test. |
| Existing Gauzy endpoints | No current endpoint changes its route, request defaults, response contract, or permission guard. | API diff audit and existing tests. |
| Existing Ever Teams hook facades | Public return objects and call sites remain compatible unless a typed additive field is introduced. | Typecheck/build and facade contract tests. |
| Source-level feature surface | Existing routes, modals, navigation controls, feature flags, public exports, API clients, and test suites may not disappear, be skipped, or be excluded. | Machine-generated base-vs-head preservation manifest and explicit approval for every intentional exception. |

No implementation may satisfy performance targets by hiding a control, removing a tab, skipping a mutation, disabling a route, or weakening an authorization check.

## 3. Current-state findings

- `AppState` is a sidecar to the main shell and mounts `InitState` after `/user/me` succeeds.
- Most query hooks mounted in `InitState` begin requests immediately. Their `firstLoad...` callbacks generally mark lifecycle state or return cached data; they do not control the initial request.
- Team loading is orchestrated twice, and timer synchronization mounts another full timer facade, duplicating query observers.
- The existing refresh helper used for much of `AutoRefresher` is a one-shot timeout, not a recurring interval. Several metadata callbacks merely read cached data and therefore never refresh it.
- React Query already has a five-minute default stale time. Manual server-state mirroring and refresh orchestration duplicate that behavior.
- Several authenticated metadata keys contain only the team ID; organization-team and time-report caches can survive a workspace switch under an insufficiently scoped key.
- `useTimeLogs()` is already default-off behind `NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS=true` and its global atoms have no active consumer.
- The global current-month `/timesheet/time-log/report/daily` response is read only as `timeLogsDailyReport.length` for the Stats-tab badge.
- The activity calendar separately requests a selected year, but does not pass the displayed employee ID; it can therefore show incorrectly scoped data while executing the expensive rich report.
- Gauzy has no cheap active-day/profile-summary endpoint. `/timesheet/statistics/counts` has different semantics and performs unrelated employee/project/week/today aggregates.

## 4. Target startup architecture

Server state will be owned by React Query and enabled by explicit dependency scope. Existing Jotai mirrors needed by current consumers remain until separately migrated and proven unnecessary.

### 4.1 Critical shell chain

The critical chain is:

1. Authenticated user.
2. Workspaces and resolution of the active tenant/organization.
3. Organization teams and resolution of the active team.
4. In parallel after the active team exists:
   - active-team tasks;
   - timer status;
   - personal daily plans for every active team. When `requirePlanToTrack` is true, timer actions wait for the result; otherwise the plans load without blocking shell interactivity because timer/card UI still uses `hasPlan` and `hasPlanForTomorrow`.
5. Token refresh scheduling and timer/active-task-dependent auto-assignment.

Each scope transition receives a distinct query key. A late response for an old scope must not seed or overwrite the new scope.

### 4.2 Deferred but non-blocking work

- Sidebar projects may prefetch after the first interactive paint because the persistent sidebar displays them.
- The language catalog may prefetch after paint; applying the user's existing language preference remains immediate.
- Task metadata loads through the shared bootstrap query when the first task/timer consumer needs it. It does not block the shell.
- Task statistics run only after an active task exists and are not part of shell readiness.

### 4.3 Route- or modal-owned work

- Current organization details: weekly-limit/report routes.
- Team invitations: team settings/member pages and invite modal.
- Personal invitations: invitation landing/response UI.
- Employees: invite/member UI that needs the member list.
- Team daily plans: task/daily-plan surfaces that show planned state. `TaskAllStatusTypes` currently reads `dailyPlanListState` directly, so its owning task/team surface must mount `useTeamDailyPlans` and preserve atom hydration before the global mount changes.
- Profile activity summary: profile route only.
- Profile daily activity: Stats tab only.
- Roles and role options: permissions and editing modals. Current-user role permissions remain shell-scoped because they gate controls outside permission editors.
- Currencies: project financial settings. That surface must mount `useCurrencies` before startup ownership changes because it currently reads `currenciesState` directly.
- Task metadata settings: shared bootstrap cache, consumed by the relevant task/settings UI.

### 4.4 Periodic synchronization

Periodic reads use TanStack Query `refetchInterval`, focus/visibility controls, and mutation invalidation:

- Timer heartbeat/status runs only while a timer is active.
- Team presence refresh runs only where presence is visible or needed by a running timer.
- Active-team tasks may refresh while visible, with the existing deep-check behavior preserved.
- Static metadata, currencies, languages, roles, projects, reports, and team-wide daily plans do not poll.

The existing refresh utilities remain available for compatibility, but `InitState` no longer uses one-shot timeouts as pretend intervals.

## 5. Additive Gauzy API design

### 5.1 Profile activity endpoint

`GET /timesheet/statistics/profile-activity`

Required query fields:

- `organizationId`
- `employeeId`
- `startDate`
- `endDate`
- `timeZone` (validated IANA zone)

Optional fields:

- `organizationTeamId`, required for team-manager or teammate-sharing authorization
- `includeDaily=false`

The range is half-open and limited to at most 366 local calendar days. The tenant always comes from `RequestContext`; a client-supplied tenant is not trusted.

Response:

```json
{
  "employeeId": "uuid",
  "activeDays": 12,
  "totalDuration": 123456,
  "firstActiveOn": "2026-08-01",
  "lastActiveOn": "2026-08-23",
  "period": {
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-09-01T00:00:00.000Z",
    "timeZone": "Europe/Madrid"
  },
  "daily": [
    { "date": "2026-08-01", "duration": 7200 }
  ]
}
```

`daily` is omitted unless requested. An active day uses the existing rich daily-report convention: the local calendar date of `startedAt` for at least one non-deleted time log with `stoppedAt > startedAt`. A log crossing local midnight is counted once and its full positive elapsed duration is assigned to its local start date; it is not split across days. The query does not hydrate employee, project, task, client, or time-slot relations.

Authorization is explicit and never silently substitutes another employee:

1. Self access is allowed.
2. `CHANGE_SELECTED_EMPLOYEE` access is allowed within the requested tenant/organization.
3. A manager may access an active member of the specified managed team.
4. Two active members of the specified team may share profile activity only when that team's `shareProfileView` is true.
5. Otherwise return 403. An empty or inaccessible employee filter must never become organization-wide access.

Implementation belongs in `StatisticService`, which already owns TypeORM/MikroORM and database-dialect branches. A dedicated `ProfileActivityController` uses only `TenantPermissionGuard` and delegates all employee authorization explicitly; it must not inherit the existing `StatisticController` class-level permission list, which would reject valid self/manager/shared-profile access before the custom policy runs. PostgreSQL performs an indexed date aggregate in SQL. better-sqlite3 performs one narrow indexed projection of `startedAt`/`stoppedAt` and IANA-aware grouping in application code so DST semantics remain correct. Both paths execute one business SELECT after authorization.

All aggregate results are normalized explicitly to JSON numbers. PostgreSQL drivers may return counts and sums as strings; `activeDays`, `totalDuration`, and every `daily.duration` must have identical numeric types on every dialect.

An additive `(tenantId, organizationId, employeeId, startedAt)` index is added only if local query plans prove it is needed. If added, the migration supports every Gauzy dialect handled by migrations, including PostgreSQL, MySQL, SQLite, and better-sqlite3, and is verified under the backup/coordination rules before any live development deployment. If cross-dialect safety cannot be proven, the release omits the index rather than shipping a partial migration.

### 5.2 Task metadata bootstrap endpoint

`GET /task-metadata/bootstrap`

Query:

- required `organizationId`
- optional `organizationTeamId`
- optional `projectId`
- optional comma-separated `include`

When `include` is omitted, all sections are returned. Supported sections are:

- `taskStatuses`
- `taskPriorities`
- `taskSizes`
- `taskLabels`
- `taskVersions`
- `issueTypes`
- `relatedIssueTypes`

Response sections retain the existing pagination shapes:

```json
{
  "taskStatuses": { "items": [], "total": 0 },
  "taskPriorities": { "items": [], "total": 0 },
  "taskSizes": { "items": [], "total": 0 },
  "taskLabels": { "items": [], "total": 0 },
  "taskVersions": { "items": [], "total": 0 },
  "issueTypes": { "items": [], "total": 0 },
  "relatedIssueTypes": { "items": [], "total": 0 }
}
```

The endpoint is housed in a standalone task-metadata bootstrap module to avoid introducing a `TaskModule`/organization-project dependency cycle. `TaskStatusModule`, `TaskPriorityModule`, `TaskSizeModule`, `IssueTypeModule`, and `TaskRelatedIssueTypeModule` gain additive service exports; version and tag modules already export their services. The bootstrap calls the same services/query behavior as the existing controllers concurrently, preserving each section's current semantics. Read authorization remains `TenantPermissionGuard`, matching the existing metadata read endpoints; the bundle must not become more permissive or more restrictive.

Labels are loaded specifically through `TagService.findTagsByLevel`. They keep their existing organization/team behavior, exclusion of system tags, and lack of project scoping; the bootstrap must not falsely apply the generic task-metadata system-default fallback to labels.

Roles, teams, currencies, languages, and project modules are deliberately excluded because they have different permission, sensitivity, ownership, or cache-freshness boundaries.

## 6. Ever Teams integration

### 6.1 Shared task metadata query

One fully scoped query key contains tenant, organization, team, optional project, and a sorted canonical `include` list. All existing metadata hook facades select their section from that shared response while preserving their public return objects. Teams initially requests all seven sections so partial responses cannot poison the full cache.

The bundle request must not race the six/seven legacy reads. The shared query function either:

1. Receives the bundle successfully and exposes every included section; or
2. Only on an explicit endpoint-unavailable response (`404`, `405`, or `501`), invokes the existing individual services as a compatibility fallback and assembles the same response shape.

Authentication, authorization, validation, throttling, and ordinary server failures never trigger fan-out fallback. Mutation handlers preserve sibling sections/totals and update or invalidate both the shared bundle key and legacy section keys. Existing optimistic helpers remain intact. Existing public-team `byTeam` keys remain unchanged; authenticated reads gain new `byScope` keys.

No new Jotai metadata store is introduced.

### 6.2 Profile activity

- The profile route resolves and passes the target employee and active team IDs.
- The current-month badge uses the profile activity summary's `activeDays`.
- The global current-month rich daily-report preload is no longer mounted.
- The Stats calendar mounts only when the Stats tab is selected and requests the same lightweight endpoint with `includeDaily=true` for the selected employee/year.
- The old rich daily-report hook and API remain for other report consumers.
- If access is denied, the badge is neutral/hidden and no fallback organization data is displayed.
- Scope is threaded explicitly through `Profile -> UserProfileTask -> ActivityCalendar`. Profile query keys contain tenant, organization, team, employee, normalized range, timezone, and `includeDaily`.

### 6.3 Optional legacy yearly preload

The existing `useTimeLogs()` capability remains in an explicitly conditional preloader component. It mounts only when `NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS=true`; default startup makes no yearly time-log request.

## 7. Error handling and rollout compatibility

- Critical user/workspace/team failures retain existing loading/error/retry behavior and do not start dependent queries with incomplete scope.
- Deferred and route-owned failures affect only their feature surface and use React Query retry/error states.
- Metadata bootstrap uses legacy services only for `404`/`405`/`501`. No metadata control disappears when an older API lacks the endpoint, and security/validation failures are never bypassed.
- Profile summary failure does not fall back to the expensive organization-wide report or leak another employee's data.
- The Gauzy API PR is merged and its development build is healthy before the Ever Teams PR begins relying on it. The frontend fallback still protects mixed-version local/self-hosted deployments.
- Existing endpoints, DTO defaults, and controllers are not changed destructively.
- A build-time rollout switch keeps the legacy initializer/read path available. Development first runs the new path as a canary after the API deploy; operators can restore the legacy path without reverting code. The switch is tested in both positions and is not removed in this change.
- Workspace/team changes cancel or ignore old-scope requests and clear incompatible Jotai mirrors before new-scope data is exposed; query keys alone are not treated as stale-response protection.

## 8. TDD and verification plan

All behavioral work begins with a failing test.

### 8.1 Gauzy API tests

- Profile DTO validation: required scope/range/timezone, 366-day maximum, boolean parsing.
- Self, global permission, manager, `shareProfileView`, inactive member, cross-team, cross-org, and forbidden access.
- Empty data, deleted logs, zero/negative duration, UTC midnight, DST transition, and year boundary.
- Identical response semantics for PostgreSQL and better-sqlite3.
- Explicit numeric JSON types for PostgreSQL, MySQL, SQLite, and better-sqlite3 result normalization.
- One business SELECT and no relation hydration.
- Bootstrap `include` parsing, every section, omitted sections, exact existing pagination shapes, system fallback behavior, and tenant isolation.
- Bootstrap service calls execute concurrently and retain the existing read guard.
- Migration up/down and query-plan evidence if the composite index is introduced.

### 8.2 Ever Teams tests

- `InitState` starts no team work before scope is ready and starts each critical phase exactly once per scope.
- A workspace/team switch uses new scoped keys and ignores late prior-scope results.
- Default startup issues no `/timesheet/time-log`, rich daily-report, or activity-report request.
- The legacy yearly preload flag still invokes its existing service.
- Concurrent metadata consumers cause one bootstrap request; success does not call legacy reads; failure uses every required fallback.
- Existing facade return objects, setters, optimistic updates, and mutation invalidation continue to work.
- Public-team cache behavior remains unchanged.
- Stats badge uses the target employee summary; profile switching changes its query scope.
- Calendar loads only on the Stats tab and requests the selected employee/team/year.
- Every moved route/modal still obtains projects, invitations, employees, plans, roles, permissions, currencies, and languages.
- Personal plan/card behavior remains available when `requirePlanToTrack=false`; team planned badges still hydrate `dailyPlanListState` from their owning surface.
- Partial metadata includes use distinct canonical keys and never overwrite omitted sibling caches.
- Timer start/stop/sync/status, `requirePlanToTrack`, auto-assignment, and statistics triggers remain behaviorally equivalent.

### 8.3 Machine-enforced preservation and CI evidence

- Generate a base-vs-head manifest from `origin/develop` covering routes, modal components, navigation controls, feature flags, public hook/package exports, API service methods, and tracked test names. The verifier fails if an item disappears or a test becomes skipped/excluded without an explicit reviewed allow entry.
- Hard-load every moved route/modal with an empty React Query cache rather than first warming it through the legacy shell.
- Add authenticated browser coverage for workspace/team switching with delayed old responses, timer/task mutations, roles/permissions-gated controls, project financial currencies, invitations, planned badges, self/manager/shared/denied profiles, and cross-employee cache leakage.
- Required Teams commands include the proven `yarn test:web --runInBand`, web build, lint, typecheck, the new browser target, and an affected-project audit. Correct the Nx Jest target from the nonexistent `.js` config to the tracked `.ts` config before relying on `nx test web`.
- Run affected shared package, mobile, desktop, and extension targets whenever the base-vs-head dependency graph shows they consume a changed public package/export.
- Required Gauzy commands include focused tests, full `core:test`, `core:lint`, `core:build`, and `api:build`.
- These gates run in PR CI where practical; local success alone is not accepted as merge proof.

### 8.4 Reproducible local performance and browser evidence

- Preserve the clean Ever Teams baseline of 10 suites / 41 tests and add focused tests.
- Build/lint/typecheck both affected projects.
- Use a documented deterministic fixture: one tenant, one organization, one active team, eight members, representative tasks/plans/metadata, and both 100-row and 10,000-row employee time-log sets.
- Preserve the authenticated cookie while clearing HTTP cache, service workers, local query persistence, and application storage not required for login. Disable browser cache and begin each sample from a hard navigation.
- Count only Gauzy API fetch/XHR requests; exclude OPTIONS, WebSocket frames, Next.js RSC/assets, session proxy calls, and health probes. Normalize UUID path segments, sort query parameters/array values, and compare method plus normalized URL.
- Add an explicit shell-ready performance mark after user/workspace/team/tasks/timer prerequisites have rendered. Run at least five cold samples per database and compare median/p95 against the same base SHA.
- Cold authenticated shell:
  - no more than 12 critical Gauzy API reads before interactivity;
  - no more than 20 total Gauzy fetch/XHR requests within five seconds;
  - no duplicate normalized GET;
  - zero global time-log/rich-report requests.
- Profile navigation performs one current-month summary request.
- Opening Stats performs one lightweight selected-year request and never calls the rich daily report.
- Run 32 concurrent profile-summary requests while probing dependency-free liveness on PostgreSQL and better-sqlite3; all return 2xx, summary p95 is at most 750 ms, liveness p95 is at most 250 ms and maximum at most 500 ms, event-loop lag remains below 100 ms, and CPU/memory/DB-pool evidence shows no exhaustion. Record p99 diagnostically without treating 32 samples as a statistically strong p99.
- Compare a before/after HAR by normalized method/path, TTFB, and duplicate count.
- Manually smoke the feature-preservation matrix in a local authenticated browser before any PR is opened.

## 9. Delivery and rollback

1. Implement and prove Gauzy locally on an isolated branch/worktree.
2. Implement and prove Ever Teams locally against that API.
3. Perform independent code review and feature-preservation audit.
4. Test Ever Teams locally against both an older API (legacy fallback) and the new API.
5. Before a development merge that changes running state, claim the relevant dev targets in `MAINTENANCE.md` and verify backup requirements for any migration.
6. Open the Gauzy `develop` PR, inspect human/bot review conclusions, merge, and monitor the development build.
7. Open the Ever Teams `develop` PR, inspect human/bot review conclusions, merge, and monitor the development build with the new path canaried behind its rollout switch.
8. Verify the deployed development browser behavior, enable the new path broadly in development, and release the maintenance claim.

Rollback is additive and low-risk:

- Revert the Ever Teams orchestration PR to restore legacy request timing.
- Before a revert is needed, disable the rollout switch to restore the legacy initializer immediately on the next frontend configuration/build rollout.
- The existing Gauzy endpoints remain available throughout.
- Revert the additive API PR if necessary; an optional index can remain harmlessly or be removed by its tested down migration after the required backup gate.
- No data transformation or destructive schema operation is part of this design.

## 10. Definition of done

The objective is complete only when:

- Both additive Gauzy endpoints are implemented and verified locally.
- Ever Teams no longer globally loads rich time reports or unrelated feature data.
- Task metadata consumers produce one shared request under normal operation.
- Profile badge and calendar are correctly employee-scoped and permission-safe.
- All explicit preservation requirements have direct test or browser evidence.
- Local request-count, concurrency, build, lint, and test gates pass.
- Both `develop` PRs are merged after review and their builds finish successfully.
- The deployed development environment is verified and ready for owner testing.
