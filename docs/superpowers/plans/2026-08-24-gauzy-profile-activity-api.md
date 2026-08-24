# Gauzy Profile Activity API Implementation Plan

> **Execution:** Use `superpowers:subagent-driven-development`. Every behavioral change follows RED -> confirm the expected failure -> GREEN -> refactor -> focused and full verification.

**Goal:** Add a permission-safe, employee-scoped `GET /timesheet/statistics/profile-activity` read that replaces Ever Teams' expensive profile-only rich report usage without changing any existing endpoint.

**Pinned base:** `ever-co/ever-gauzy` `origin/develop@99ba709847c5dd6962b9b19b95b941f9c8e5aab9`

**Approved design:** `../specs/2026-08-24-ever-teams-fast-startup-design.md`

## Invariants

- The existing `StatisticController`, its seven routes, guards, permissions, DTO defaults, and response contracts remain unchanged.
- Tenant scope comes only from `RequestContext`; the request cannot supply `tenantId`.
- The requested employee is never removed, replaced with the current employee, or widened to an organization-wide filter.
- Self, `CHANGE_SELECTED_EMPLOYEE`, active team manager, and active teammate sharing through `shareProfileView` are the only allowed paths.
- The time-log query always includes tenant, organization, employee, half-open date range, soft-delete, and positive-duration predicates.
- The read hydrates no employee, task, project, client, time-slot, screenshot, or activity relations.
- PostgreSQL aggregates in SQL. MySQL, SQLite, and better-sqlite3 use one narrow `startedAt`/`stoppedAt` projection and IANA-aware grouping in application code.
- All counts and durations are explicit JavaScript numbers.
- No migration is shipped unless measured query-plan evidence requires it and up/down succeeds on PostgreSQL, MySQL, SQLite, and better-sqlite3.

## Task 1: Define and validate the additive contract

**Files**

- Modify `packages/contracts/src/lib/timesheet-statistics.model.ts`.
- Create `packages/core/src/lib/time-tracking/statistic/dto/profile-activity-query.dto.ts`.
- Create `packages/core/src/lib/time-tracking/statistic/dto/profile-activity-query.dto.spec.ts`.
- Modify `packages/core/src/lib/time-tracking/statistic/dto/index.ts`.

**Contract**

```ts
export interface IGetProfileActivity {
	organizationId: ID;
	employeeId: ID;
	organizationTeamId?: ID;
	startDate: string;
	endDate: string;
	timeZone: string;
	includeDaily?: boolean;
}

export interface IProfileActivity {
	employeeId: ID;
	activeDays: number;
	totalDuration: number;
	firstActiveOn: string | null;
	lastActiveOn: string | null;
	period: { startDate: string; endDate: string; timeZone: string };
	daily?: Array<{ date: string; duration: number }>;
}
```

- [ ] Write failing tests for required UUIDs, strict ISO dates, valid IANA zones, `endDate > startDate`, the 366-local-day maximum, and exact `true`/`false` parsing.
- [ ] Run `yarn nx test core --runInBand --testPathPatterns=profile-activity-query.dto.spec.ts` and confirm failure is caused by the missing DTO.
- [ ] Implement the DTO with existing Gauzy validation-pipe conventions, `moment.tz.zone`, and a class-level/range validator that calculates local calendar boundaries.
- [ ] Re-run the focused test and commit as `feat(timesheet): define profile activity contract`.

## Task 2: Add explicit access checks without a module cycle

**Files**

- Modify `packages/core/src/lib/employee/managed-employee.service.ts`.
- Create `packages/core/src/lib/employee/managed-employee.service.profile-view.spec.ts`.
- Modify `packages/core/src/lib/time-tracking/statistic/statistic.service.ts`.
- Create `packages/core/src/lib/time-tracking/statistic/statistic.service.profile-activity-access.spec.ts`.

Add an additive method to the already-injected service:

```ts
canViewEmployeeProfile(
	targetEmployeeId: ID,
	organizationId: ID,
	organizationTeamId?: ID
): Promise<boolean>;
```

The method must:

1. Allow global permission and self.
2. Otherwise require a team ID and current employee ID.
3. Query only active, non-archived memberships for actor and target in that exact tenant/team.
4. Join the team and require the same tenant and organization.
5. Allow an active manager; otherwise require both memberships and `shareProfileView === true`.

`StatisticService` must separately prove the target employee exists and is active in the exact tenant/organization before calling this method. At the pinned base, `TypeOrmEmployeeRepository` is already the second constructor injection in `StatisticService`; this task reuses it and adds no module import. Lookup misses become `ForbiddenException` to avoid enumeration.

- [ ] Write the full failing matrix: nonexistent target, self, global permission, manager, sharing on/off, inactive actor, inactive target, cross-team, cross-org, missing team, and no current employee.
- [ ] Assert every denied case performs zero time-log reads.
- [ ] Implement through `ManagedEmployeeService` and the already-injected `TypeOrmEmployeeRepository`; do not import `OrganizationTeamModule` into `StatisticModule`, which would deepen its existing circular dependency.
- [ ] Run the two focused suites and commit as `feat(timesheet): authorize profile activity access`.

## Task 3: Implement pure period/grouping helpers

**Files**

- Create `packages/core/src/lib/time-tracking/statistic/profile-activity.helper.ts`.
- Create `packages/core/src/lib/time-tracking/statistic/profile-activity.helper.spec.ts`.

```ts
export type ProfileActivityRawRow =
	| { date: string; duration: unknown }
	| { startedAt: Date | string; stoppedAt: Date | string };

export function resolveProfileActivityPeriod(request: IGetProfileActivity): {
	startDate: Date;
	endDate: Date;
	timeZone: string;
};

export function buildProfileActivityResponse(
	request: IGetProfileActivity,
	period: ProfileActivityPeriod,
	rows: ProfileActivityRawRow[]
): IProfileActivity;
```

- [ ] Write failing tests for empty data, conditional `daily`, PostgreSQL numeric strings, invalid numeric values, zero/negative durations, UTC midnight, Europe/Madrid DST spring/fall transitions, year boundaries, and a log crossing local midnight.
- [ ] Implement finite-number normalization, positive elapsed seconds, local `YYYY-MM-DD` grouping, lexical sorting, and `null` first/last dates.
- [ ] Preserve current rich-report semantics: assign the entire duration to the local date of `startedAt`; never split a cross-midnight log.
- [ ] Run `yarn nx test core --runInBand --testPathPatterns=profile-activity.helper.spec.ts` and commit as `feat(timesheet): normalize profile activity rows`.

## Task 4: Add one-select cross-ORM reads

**Files**

- Modify `packages/core/src/lib/time-tracking/statistic/statistic.service.ts`.
- Create `packages/core/src/lib/time-tracking/statistic/statistic.service.profile-activity-query.spec.ts`.
- Create `packages/core/src/lib/time-tracking/statistic/profile-activity.integration.spec.ts`.

**Signatures**

```ts
getProfileActivity(request: IGetProfileActivity): Promise<IProfileActivity>;

private getProfileActivityRows(
	request: IGetProfileActivity,
	tenantId: ID,
	period: ProfileActivityPeriod
): Promise<ProfileActivityRawRow[]>;
```

- [ ] Write query-shape tests before code. Assert exact predicates, one terminal select after authorization, no joins/population/entity hydration, and a defined path for every configured dialect and ORM.
- [ ] For PostgreSQL TypeORM and MikroORM/Knex, group by a parameterized local-date expression and sum `stoppedAt - startedAt`; do not interpolate the timezone or IDs.
- [ ] For MySQL, SQLite, and better-sqlite3, select only aliased `startedAt` and `stoppedAt`, once, then call the pure helper.
- [ ] Use the same deterministic fixtures on PostgreSQL and better-sqlite3 and assert equivalent JSON for DST, deleted logs, invalid durations, two rows on one local day, and year boundaries.
- [ ] Run focused tests for both `DB_TYPE=better-sqlite3` and `DB_TYPE=postgres`; clear the environment variable afterward.
- [ ] Commit as `feat(timesheet): query profile activity efficiently`.

## Task 5: Expose the dedicated guarded controller

**Files**

- Create `packages/core/src/lib/time-tracking/statistic/profile-activity.controller.ts`.
- Create `packages/core/src/lib/time-tracking/statistic/profile-activity.controller.spec.ts`.
- Modify `packages/core/src/lib/time-tracking/statistic/statistic.module.ts`.

```ts
@ApiTags('TimesheetStatistic')
@UseGuards(TenantPermissionGuard)
@Controller('/timesheet/statistics')
export class ProfileActivityController {
	constructor(private readonly statisticService: StatisticService) {}

	@Get('/profile-activity')
	@UseValidationPipe({ transform: true, whitelist: true })
	getProfileActivity(@Query() query: ProfileActivityQueryDTO): Promise<IProfileActivity> {
		return this.statisticService.getProfileActivity(query);
	}
}
```

- [ ] First prove the new controller does not exist and write metadata tests for route, GET method, validation, and exactly `TenantPermissionGuard` without `PermissionGuard`.
- [ ] Register it additively beside `StatisticController`; do not edit the old controller.
- [ ] Assert service errors propagate unchanged and commit as `feat(timesheet): expose profile activity endpoint`.

## Task 6: Measure query plans; add no speculative migration

- [ ] Create `packages/core/src/lib/time-tracking/statistic/fixtures/profile-activity.fixture.ts`; its `seedProfileActivityFixture(dataSource, rowCount)` inserts one tenant, one organization, one team, two active employees, and deterministic 100-row or 10,000-row time logs without using a live database.
- [ ] Create `packages/core/src/lib/time-tracking/statistic/profile-activity.query-plan.spec.ts`. Use the repository's test application/DataSource harness; set `DB_TYPE` before boot, migrate a disposable test database, seed with the fixture, capture the plan, and close/drop only that disposable test database in `afterAll`.
- [ ] Capture PostgreSQL `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, MySQL `EXPLAIN FORMAT=JSON`, and SQLite/better-sqlite3 `EXPLAIN QUERY PLAN`. If local PostgreSQL/MySQL services are unavailable, record those suites as unverified rather than claiming them; CI must supply their service containers before making them required.
- [ ] Add `(tenantId, organizationId, employeeId, startedAt)` only if the scoped 10,000-row query scans the whole table or warm p95 exceeds 750 ms.
- [ ] If required, first add up/down tests for all four dialects and obey the backup/maintenance gate before any later live migration. Otherwise commit only the evidence test.

## Task 7: Concurrency, preservation, and full verification

- [ ] Create a secret-redacting external 32-request verifier under `scripts/verify-profile-activity-concurrency.mjs` and unit-test its percentile logic. It measures profile/liveness HTTP latency only.
- [ ] Create `profile-activity.concurrency.spec.ts` beside the service. In the API test process, wrap the same 32 concurrent service calls with `perf_hooks.monitorEventLoopDelay`, `process.cpuUsage()`, `process.memoryUsage()`, and the configured DataSource driver's pool counters when exposed. Fail on event-loop lag >=100 ms or pool exhaustion; record CPU/memory deltas diagnostically.
- [ ] Run the in-process suite and external verifier against disposable better-sqlite3 and PostgreSQL test API instances started from the pinned worktree with the deterministic fixture. Verify profile p95 <= 750 ms, liveness p95 <= 250 ms/max <= 500 ms, and all 2xx. Never infer event-loop or pool health from the external script.
- [ ] Prove `statistic.controller.ts` is unchanged: `git diff --exit-code 99ba709847c5dd6962b9b19b95b941f9c8e5aab9...HEAD -- packages/core/src/lib/time-tracking/statistic/statistic.controller.ts`.
- [ ] Prove no deletion under contracts/statistics/database with `git diff --diff-filter=D --name-status 99ba709847c5dd6962b9b19b95b941f9c8e5aab9...HEAD -- packages/contracts/src packages/core/src/lib/employee packages/core/src/lib/time-tracking/statistic packages/core/src/lib/database`.
- [ ] Run:

```powershell
yarn nx test core --runInBand --testPathPatterns=profile-activity
yarn nx run core:test --runInBand
yarn nx run core:lint
yarn nx run core:build
yarn nx run api:build
yarn nx affected -t test,lint,build --base=99ba709847c5dd6962b9b19b95b941f9c8e5aab9 --head=HEAD
git diff --check
```

- [ ] Inspect the final diff for exactly one additive route, exact employee predicates, no relation hydration, numeric output, no skipped tests, and no unjustified migration.
