import { expect, test, type MockControl, type Page, type Shield } from '../../fixtures';
import {
	APP_ORIGIN,
	hardVisit,
	mockReset,
	mockScenario,
	signInWithFixture,
	stubNextAuthSession,
	unstubNextAuthSession,
	type BootstrapFixture,
	type MockScenario,
	type StubRequest
} from '../../helpers';

/**
 * Who `/reports/*` lets in, with the role NAME and the team-manager FLAG held apart — the case `lane-a/PLAN.md` §8.3
 * recorded as unreachable (there, `scenario.manager` drove both halves at once). `scenario.roleName`
 * (`cypress/support/mock-gauzy-server.mjs:70-82`) now sets the fixture role's name on its own, so each admission path
 * the gate has can be armed alone. Pinned in a real Chrome on lane-a (app `http://localhost:3031`, mock `3992`,
 * control `3994`, `playwright/test-servers.ts:38`) on 2026-11-23. Every URL, count, string and call list below was
 * measured — in the hand measurements that chose the assertions (`E:\Coding\.tmp\probe-reports-gate\matrix-1.jsonl`,
 * 64 visits = 8 arms × 8 URLs, and `E:\Coding\.tmp\probe-reports-gate\timing-1.jsonl`, 18 timed visits over 3
 * rounds) and in this file's own green runs (`E:\Coding\.tmp\s2-lane-a-reports-3.log` … `-7.log`, 42 visits each;
 * `-1.log` and `-2.log` are the two runs that found the assertions' own flaws and are kept), and each case prints a
 * `MEASURE` line with what its page and the mock actually did, so any assertion here can be re-checked against a log.
 *
 * ## The code this file measures (each line read out of its file before it is named)
 *
 * - `core/components/auth/must-be-a-manager.tsx`: `isGlobalAdmin` (`:48-49`) is **the user's own role name**,
 *   `ERoleName.ADMIN` or `ERoleName.SUPER_ADMIN`; `isAuthorizedManager = isTeamManager || isGlobalAdmin` (`:50`);
 *   `isAdmitted = isAuthorizedManager || admitsMembers` (`:51`). Not admitted → `router.replace(redirectTo)` with
 *   `redirectTo = '/'` (`:36`, `:93-102`), and until then the guard renders the guarded page's own skeleton
 *   (`fallback`, `:110`, `:113-127`). The wait is bounded: `SELF_MEMBERSHIP_WAIT_MS = 8000` once the teams are known,
 *   `TEAMS_LIST_WAIT_MS = 30000` while they are not (`:23-31`, armed at `:86-90`), and the guard decides at
 *   `selfMembershipLoaded` — the current user's own member row of `activeTeam.members` (`:68-72`) — long before that.
 * - **The `isTeamManager` the guard uses is not only the member's `isManager` flag.** It comes from
 *   `useAuthenticateUser` (`core/hooks/auth/use-authenticate-user.ts:77`) → `useIsMemberManager`
 *   (`core/hooks/organizations/teams/use-team-member.ts:19-33`), which counts a member as the team's manager when
 *   `member.isManager === true` **or `member.role?.name` is `MANAGER`, `SUPER_ADMIN` or `ADMIN`** (`:25-31`), plus the
 *   team creator (`:35-41`). The lane mock hands every member the same fixture role object
 *   (`mock-gauzy-server.mjs:199-216`), so `scenario.roleName` moves that branch too. This is why arm 5 below is let in
 *   although the brief's reading of `must-be-a-manager.tsx` alone says it should be bounced — see "What a first read
 *   of the guard says, and what the page really does".
 * - `app/[locale]/(main)/reports/layout.tsx`: `MEMBER_REPORTS = new Set(['time-and-activity'])` (`:72`), so only that
 *   segment asks `admitsMembers` on, and only when `readsTimeLogReports(myPermissions)` (`:85-87`); every other
 *   report keeps the manager-only guard (`:93`). While the permission read is still running for a member report the
 *   layout renders the report's own skeleton instead of deciding (`:88`, `:90`).
 * - `core/lib/utils/report-access.ts:5-10`: `TIME_LOG_REPORT_PERMISSIONS = ['TIME_TRACKER', 'ALL_ORG_EDIT',
 *   'ALL_ORG_VIEW']`, and `readsTimeLogReports` is true when the role holds **one** of them.
 * - The reports themselves, which are what "admitted" is read from: each writes its own `<h1>` through
 *   `DashboardToolbar` (`core/components/dashboards/kit/dashboard-layout.tsx:44`) and its own breadcrumb link for its
 *   own path (`core/components/dashboards/kit/dashboard-breadcrumb.tsx` → `duplicated-components/breadcrumb.tsx:55-65`,
 *   the last crumb is a `Link` too), and its data hooks live inside the page component the guard renders — so a report
 *   read in the mock's log proves the children really mounted, and no read proves they never did. Titles as measured:
 *   `weekly-limit` **`Daily limit`** (`weekly-limit-page.tsx:29-34` with `use-weekly-limit-report.ts:163`
 *   `useState<LimitDuration>('day')`), `manual-time-edits` `Manual time edits` (`:111`), `project-budget`
 *   `Project budget` (`:72`), `actual-and-expected-hours` `Actual & expected hours` (`:38`), `payments-due`
 *   `Payments due` (`:42`), `time-and-activity` `Time and activity` (`time-activity-page.tsx:69`), `timesheet`
 *   `Timesheets` (`timesheets-page.tsx:191`).
 *   The heading alone proves nothing: `ToolbarBandSkeleton` renders the *same* `<h1>` text while the guard is deciding
 *   (`core/components/layouts/page-skeleton.tsx:70`, and `weekly-limit-page-skeleton.tsx:21` writes `Daily limit` for
 *   the same reason the page does). What is pinned is the report's breadcrumb link, scoped to
 *   `nav[aria-label="breadcrumb"]` — the skeleton's trail is `BreadcrumbSkeleton`, spans with no links
 *   (`page-skeleton.tsx:28-36`), and the sidebar's own `/reports/` links stay out of that scope.
 * - The mock's switches: `scenario.manager` is the member rows' `isManager` only
 *   (`mock-gauzy-server.mjs:218-224`) and, when unset-but-false, also the default role name (`:73-78`);
 *   `scenario.roleName` is the role's name on its own, only upper-case names counting (`:70-78`), served on
 *   `/api/user/me` and `/api/roles`; `scenario.extraPermissions` only **adds** to the role's five base permissions
 *   `TIME_TRACKER, ORG_TASK_ADD, ORG_TASK_EDIT, ORG_INVITE_EDIT, ORG_EMPLOYEES_EDIT` (`:50-63`, answered at
 *   `GET /api/role-permissions/me` at `:627`); `scenario.fails` answers a path with a status (`:1081-1095`).
 *   `mockReset()` clears all of them and `setScenario` merges, which is why every case below resets before arming.
 *
 * ## What was measured (the matrix the assertions are pinned on, `matrix-1.jsonl`)
 *
 * 8 arms × 8 URLs = 64 visits, each from a reset mock. "admitted" = the person stayed on the report URL with that
 * report's own breadcrumb link rendered (1) and its own read in the mock's log (1-2 calls); "bounced" = the person was
 * on `http://localhost:3031/` with the team home's own `Fixture Team A` heading, no breadcrumb link for the report
 * (0) and **no** report read at all (0 calls). Every one of the 64 visits showed exactly one URL and no oscillation.
 *
 * | arm (from a reset mock)                    | weekly-limit | manual-time-edits | project-budget | actual-and-expected-hours | payments-due | time-and-activity | timesheet (own id) | timesheet (teammate id) |
 * | ------------------------------------------- | ------------ | ----------------- | -------------- | ------------------------- | ------------ | ----------------- | ------------------ | ----------------------- |
 * | 1 unset (`isManager` true, role `ADMIN`)    | admitted     | admitted          | admitted       | admitted                  | admitted     | admitted          | admitted           | admitted                |
 * | 2 `{ manager: false }` (role `EMPLOYEE`)    | bounced      | bounced           | bounced        | bounced                   | bounced      | **admitted**      | bounced            | bounced                 |
 * | 3 `{ manager: false, roleName: 'ADMIN' }`   | admitted     | admitted          | admitted       | admitted                  | admitted     | admitted          | admitted           | admitted                |
 * | 4 `{ …, roleName: 'SUPER_ADMIN' }`          | admitted     | admitted          | admitted       | admitted                  | admitted     | admitted          | admitted           | admitted                |
 * | 5 `{ …, roleName: 'MANAGER' }`              | **admitted** | admitted          | admitted       | admitted                  | admitted     | admitted          | admitted           | admitted                |
 * | 6 `{ roleName: 'EMPLOYEE' }`, manager true  | admitted     | admitted          | admitted       | admitted                  | admitted     | admitted          | admitted           | admitted                |
 * | 7a `{ manager: false }` + `ALL_ORG_VIEW`    | bounced      | bounced           | bounced        | bounced                   | bounced      | admitted          | bounced            | bounced                 |
 * | 7b `{ manager: false }` + the read refused  | bounced      | bounced           | bounced        | bounced                   | bounced      | **bounced**       | bounced            | bounced                 |
 *
 * - **Arm 2's `time-and-activity` is admitted** without arming anything: the fixture role already holds
 *   `TIME_TRACKER` (`mock-gauzy-server.mjs:50`), which is one of `TIME_LOG_REPORT_PERMISSIONS`, so
 *   `admitsMembers` is on for that segment (`reports/layout.tsx:87`) and the member reaches their own time. Arms 2,
 *   7a and 7b are the proof of the split: the same non-manager is bounced from six reports and admitted at the
 *   seventh, and 7b shows the seventh closes again when the permission the layout asks for cannot be read.
 * - Bounce timing, warm page (`timing-1.jsonl`, 12 bounced and 6 admitted visits timed over 3 rounds, all on one
 *   clock): the bounced person was on `/` **4 325–5 756 ms** after the report navigation started and **624–1 328 ms**
 *   after the mock answered the team read carrying the member rows the guard compares against the user
 *   (`must-be-a-manager.tsx:68-72`), and always after it — the decision followed the membership data, and the
 *   8 s / 30 s valves (`:23-24`, `:86-90`) released nothing in any of the 12 samples. Admitted reports mounted their
 *   own breadcrumb 3 011–5 136 ms after navigation and sent their own read 3 666–5 370 ms after it.
 * - Bounce timing, this file's own green runs `-3.log` … `-7.log` — 60 bounced and 150 admitted visits, a first visit
 *   to a route paying a cold `next dev` compile: bounced visits land **4 674–10 352 ms** after navigation, their
 *   members read 284–5 525 ms after navigation and the bounce **1 789–10 057 ms** after that read; admitted visits
 *   mount their breadcrumb 4 197–16 317 ms after navigation.
 *   Every bounce followed its members read and every one is inside the 30 s valve, so none came from that valve — and
 *   that is exactly what the assertions pin, nothing tighter. The gap after the members read does **not** by itself
 *   prove the 8 s valve stayed shut (a bounce from the valve would land in the same place with the same ordering);
 *   the valve is separated from the data by the 3-round warm probe above, not by a single suite run.
 *   `matrix-1.jsonl` keeps the extreme artifact: the same arm bounced at `time-and-activity` in 3 509 ms and at a
 *   timesheet URL in **26 939 ms**, the second being that route's first compile rather than the guard waiting.
 * - Console: `shield.consoleErrors()` and `shield.pageErrors()` were empty in all 56 probe visits of arms 1-7a. Arm 7b
 *   printed the app's own log of the refusal it was answered (`[ERROR] [HttpClient] HTTP Error: GET
 *   /role-permissions/me 500`, 4-9 times per visit, because the permission read is retried), so 7b asserts the
 *   refusal was logged instead of asserting silence. In the suite's own green runs (42 visits, 43 `MEASURE` lines
 *   each) `pageErrors()` was empty in every visit that asserts on it, and `consoleErrors()` empty except a React
 *   `getSnapshot should be cached to avoid an infinite loop` warning in 40 of the 215 `MEASURE` lines of those runs,
 *   spread over arms 1, 2, 3, 4 and 6 — store noise from a
 *   `useSyncExternalStore` subscriber in the shell (e.g. `core/components/pages/auth/sign-in/session-ended-notice.tsx`),
 *   which no arm here touches, so it is printed in `MEASURE` and asserted on nowhere.
 *
 * ## What a first read of the guard says, and what the page really does (a finding, pinned as measured)
 *
 * - Arm 5 — `{ manager: false, roleName: 'MANAGER' }`: a person whose role is NAMED manager, `member.isManager` false.
 *   `must-be-a-manager.tsx:48-51` alone says bounced (`isGlobalAdmin` false, `admitsMembers` false). **Measured:
 *   admitted at all eight URLs**, because `useIsMemberManager` counts `member.role.name === ERoleName.MANAGER` as the
 *   team's manager (`core/hooks/organizations/teams/use-team-member.ts:25-31`) and the mock's member rows carry that
 *   role (`mock-gauzy-server.mjs:212-213`). This is the app's design, not a defect: a member whose **team** role is
 *   MANAGER is the team's manager, and the guard's manager half is that, not `member.isManager` alone. What makes the
 *   arm look odd is a **mock limit** — the mock gives every member row the user's own role, so "role named MANAGER,
 *   manages no team" cannot be built here; in Gauzy the member's team role and the user's role are separate rows.
 * - Arms 3 and 4 admit through **both** halves at once (`isTeamManager` via the member's role name, and
 *   `isGlobalAdmin` via the user's own role name), so no arm this mock can build isolates `isGlobalAdmin` on its own;
 *   see the mock limits.
 * - The sidebar's own timesheet link uses the **user** id (`/reports/timesheet/<userId>?name=…`, seen in the
 *   measured page's sidebar link list), while `TimesheetsPage` uses the same value as an **employee** id
 *   (`use-copy-previous-week.ts:121` `employeeIds: [memberId]`, `use-sheet-cell-writes.ts:211` `employeeId: memberId`).
 *   Both ids were measured here and both are let in by the gate; what a person sees at the user-id URL is out of this
 *   file's scope, so it is reported and not pinned.
 *
 * ## Mock limits this file runs into (they are not app defects)
 *
 * - **`extraPermissions` cannot remove a permission** (`mock-gauzy-server.mjs:54-63` only appends to the five base
 *   ones), so "a role that holds none of `TIME_LOG_REPORT_PERMISSIONS`" is **not arammable**: `TIME_TRACKER` is always
 *   served. The nearest arm the mock does have is 7b (`fails: { '/api/role-permissions/me': 500 }`), measured here as
 *   `useMyRolePermissionsQuery` keeping `myPermissions` empty (`core/hooks/roles/use-my-role-permissions-query.ts:30-39`)
 *   and the layout therefore never opening `time-and-activity` for the non-manager. That is a refused read, not a role
 *   without the permission, and the test says so. Making the real arm needs the mock to answer the role's permission
 *   list on its own — the mock owner's change, like PLAN §8.3 asked for.
 * - **`roleName` moves the member's role too** (`mock-gauzy-server.mjs:212-213` puts the fixture `role` on every
 *   member row), so `isGlobalAdmin` (user role name) and the role-name branch of `isTeamManager` (member role name)
 *   cannot be separated by any combination of the current switches. Isolating the flag (`member.isManager`) *is*
 *   possible — arm 6 does it, role `EMPLOYEE` with `isManager: true` admitted everywhere — and isolating the
 *   member-role-name branch is possible too (arm 5). Isolating `isGlobalAdmin` is not, until the mock can give a
 *   member row a role other than the user's.
 * - The mock answers an unmatched `GET` with `pagination([])` = `{ items: [], total: 0 }` (`mock-gauzy-server.mjs:827`),
 *   so every report here really loads and shows its empty state; nothing in this file stubs a report read.
 * - `/api/organization-team/<teamId>` and the list read `GET /api/organization-team` are both answered from the same
 *   team object with its `members` (`mock-gauzy-server.mjs:608-609`), so either one is "the members arrived" here; a
 *   visit that only listed the teams is a real visit, not a missing read.
 * - "When" is read from the mock's own request log, polled until the guard's decision is visible (`openReport` +
 *   `Visit.finish`), never from browser response events (`helpers.ts:59-66`). Reading it only until `hardVisit`
 *   returns was measured to lose a real team read, because `hardVisit` returns at the shell-ready mark.
 */

const ROLE_READ_PATH = '/api/role-permissions/me';
const TEAM_HOME_HEADING = 'Fixture Team A'; // names.teamA, the h1 of '/' for a signed-in member
const SELF_MEMBERSHIP_WAIT_MS = 8_000; // must-be-a-manager.tsx:23
const TEAMS_LIST_WAIT_MS = 30_000; // :24
const MEMBER_REPORT_PATH = '/reports/time-and-activity';

/** The arms, each armed on top of a reset mock. */
const DEFAULT_PERSON: MockScenario = {}; // role ADMIN (mock-gauzy-server.mjs:73-78) and isManager true (:218)
const NOT_MANAGER: MockScenario = { manager: false }; // role EMPLOYEE, isManager false
const TENANT_ADMIN_WITHOUT_TEAM: MockScenario = { manager: false, roleName: 'ADMIN' };
const SUPER_ADMIN_WITHOUT_TEAM: MockScenario = { manager: false, roleName: 'SUPER_ADMIN' };
const ROLE_NAMED_MANAGER_WITHOUT_TEAM: MockScenario = { manager: false, roleName: 'MANAGER' };
const EMPLOYEE_ROLE_TEAM_MANAGER: MockScenario = { roleName: 'EMPLOYEE' }; // isManager stays true
const NOT_MANAGER_WITH_TIME_PERMISSION: MockScenario = {
	manager: false,
	extraPermissions: ['ALL_ORG_VIEW'] // another of TIME_LOG_REPORT_PERMISSIONS, on top of TIME_TRACKER
};
const NOT_MANAGER_PERMISSION_READ_REFUSED: MockScenario = { manager: false, fails: { [ROLE_READ_PATH]: 500 } };

type ReportRoute = {
	key: string;
	path: string;
	/** The `<h1>` the loaded report writes; the same text is written by its skeleton, so it is never the only proof. */
	heading: string;
	/** A mock path only this report's own read asks for, measured across all 64 probe visits. */
	readPath: string;
	/** `mock.calls` matches by substring; the timesheets read needs the path matched exactly. */
	exactRead?: boolean;
};

/** The three manager-only reports the matrix walks, plus the member report. */
const MATRIX_ROUTES: ReportRoute[] = [
	{
		key: 'weekly-limit',
		path: '/reports/weekly-limit',
		heading: 'Daily limit',
		readPath: '/api/timesheet/time-log/time-limit'
	},
	{
		key: 'manual-time-edits',
		path: '/reports/manual-time-edits',
		heading: 'Manual time edits',
		readPath: '/api/timesheet/time-log/history'
	},
	{
		key: 'project-budget',
		path: '/reports/project-budget',
		heading: 'Project budget',
		readPath: '/api/timesheet/time-log/project-budget-limit'
	},
	{
		key: 'time-and-activity',
		path: MEMBER_REPORT_PATH,
		heading: 'Time and activity',
		readPath: '/api/saved-reports'
	}
];

/** Every manager-only report URL, the sweep's set: the three above (minus the member report) plus the rest. */
const managerOnlyRoutes = (fixture: BootstrapFixture): ReportRoute[] => [
	{
		key: 'actual-and-expected-hours',
		path: '/reports/actual-and-expected-hours',
		heading: 'Actual & expected hours',
		readPath: '/api/timesheet/time-log/report/weekly'
	},
	{
		key: 'payments-due',
		path: '/reports/payments-due',
		heading: 'Payments due',
		readPath: '/api/timesheet/time-log/report/owed-report'
	},
	...MATRIX_ROUTES.filter((route) => route.path !== MEMBER_REPORT_PATH),
	{
		key: 'timesheet',
		path: `/reports/timesheet/${fixture.ids.employee}`,
		heading: 'Timesheets',
		readPath: '/api/timesheet/time-log',
		exactRead: true
	}
];

const reportCrumb = (page: Page, path: string) => page.locator(`nav[aria-label="breadcrumb"] a[href="${path}"]`);
const homeHeading = (page: Page) => page.getByRole('heading', { level: 1, name: TEAM_HOME_HEADING });
const reportHeading = (page: Page, route: ReportRoute) =>
	page.getByRole('heading', { level: 1, name: route.heading }).first();

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a reports-gate] MEASURE ${label} ${JSON.stringify(value)}`);

/** What the mock recorded of one report's own read; exact for the paths several reports share. */
const readCalls = async (mock: MockControl, route: ReportRoute) =>
	(await mock.requests()).filter((call) =>
		route.exactRead ? call.path === route.readPath : call.path.includes(route.readPath)
	);

const delay = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * The visit, timed on the Node clock from the moment the report navigation starts.
 *
 * The two moments that matter to the guard are watched **in the mock's own log**, not in the browser's response
 * events: `helpers.ts:59-66` is explicit that "did the app call X" is only answerable from this log, and a response
 * event can be swallowed by the navigation that triggered it (`hardVisit` navigates twice). Polling the log is how the
 * ordering "the members arrived, then the guard bounced" is measured.
 *
 * The member rows arrive with **either** team read — `GET /api/organization-team` (the list) or
 * `GET /api/organization-team/<activeTeam>`; the mock answers both from the same team object, `members` included
 * (`mock-gauzy-server.mjs:608-609`), and `must-be-a-manager.tsx:68-72` reads the rows off the active team whichever
 * brought them. Both are watched and the earlier one counts as "the members arrived"; a visit that only listed the
 * teams would otherwise look like a visit that never got them (measured in run 1: a bounce whose team read landed
 * after the shell marked itself ready, so a watcher closed at `hardVisit` missed it).
 * `GET /api/role-permissions/me` is the read the reports layout itself mounts (`reports/layout.tsx:84`), so its
 * arrival says the guard was there and deciding.
 *
 * The watcher therefore outlives `hardVisit` — which returns at the shell-ready perf mark, i.e. possibly before any
 * of this reaches the mock — and is stopped by `finish()`, which the assertion helpers call the moment the guard's
 * decision is visible. It also gives up on its own after 2 minutes so a failing test cannot leave it polling.
 */
async function openReport(
	page: Page,
	mock: MockControl,
	fixture: BootstrapFixture,
	route: ReportRoute,
	scenario: MockScenario
): Promise<Visit> {
	await mockReset();
	if (Object.keys(scenario).length) await mockScenario(scenario);

	const membershipReadPaths = new Set(['/api/organization-team', `/api/organization-team/${fixture.ids.teamA}`]);
	const timing: VisitTiming = { navigatedAt: 0 };
	let watching = true;
	const watcherDeadline = Date.now() + 120_000;
	const watcher = (async () => {
		while (watching && Date.now() < watcherDeadline) {
			const requests: StubRequest[] = await mock.requests();
			if (timing.membersReadAt === undefined && requests.some((call) => membershipReadPaths.has(call.path))) {
				timing.membersReadAt = Date.now();
			}
			if (timing.permissionReadAt === undefined && requests.some((call) => call.path === ROLE_READ_PATH)) {
				timing.permissionReadAt = Date.now();
			}
			if (timing.membersReadAt !== undefined && timing.permissionReadAt !== undefined) break;
			await delay(150);
		}
	})();

	const finish = async () => {
		watching = false;
		await watcher;
	};

	try {
		await signInWithFixture(page.context(), fixture);
		await unstubNextAuthSession(page);
		await stubNextAuthSession(page);

		timing.navigatedAt = Date.now();
		await hardVisit(page, route.path);
	} catch (error) {
		await finish();
		throw error;
	}
	return { timing, finish };
}

/** The URL the page held during `windowMs`: how "nothing moved afterwards" is measured, sampled. */
async function urlPathsWhileWatching(page: Page, windowMs: number): Promise<string[]> {
	const paths: string[] = [];
	const until = Date.now() + windowMs;
	while (Date.now() < until) {
		paths.push(new URL(page.url()).pathname);
		await page.waitForTimeout(250);
	}
	return paths;
}

const bodyText = async (page: Page): Promise<string> => {
	const shown = await page
		.locator('body')
		.innerText()
		.catch(() => '<unreadable>');
	return shown.replace(/\s+/g, ' ').trim().slice(0, 240);
};

/** What one visit's clocks recorded, all on the Node clock so they compare with each other. */
type VisitTiming = {
	/** Just before `hardVisit` opened the report URL. */
	navigatedAt: number;
	/** When the mock's log first held a team read carrying the member rows (either team read — see `openReport`). */
	membersReadAt?: number;
	/** When the mock's log first held the permission read the reports layout mounts. */
	permissionReadAt?: number;
};

/** A visit plus the call that stops its log watcher; the assertion helpers call `finish` at the guard's decision. */
type Visit = {
	timing: VisitTiming;
	finish: () => Promise<void>;
};

/**
 * The report's own read, re-read from the mock's log until it appears: a mounted report sends it a moment after its
 * breadcrumb appears (`helpers.ts:236-250` exists for the same reason — a fixed wait hides a late read).
 */
async function waitForReadCalls(
	mock: MockControl,
	route: ReportRoute,
	{ tries = 60, intervalMs = 250 }: { tries?: number; intervalMs?: number } = {}
) {
	for (let attempt = 0; attempt < tries; attempt += 1) {
		const calls = await readCalls(mock, route);
		if (calls.length) return calls;
		await delay(intervalMs);
	}
	return [];
}

/**
 * Admitted: the person is still on the report URL, the report's own breadcrumb link is there (the guard rendered its
 * children), its own read reached the mock, and nothing moved for the next 1.5 s.
 */
async function expectAdmitted(
	page: Page,
	mock: MockControl,
	shield: Shield,
	arm: string,
	route: ReportRoute,
	visit: Visit
) {
	const { timing } = visit;
	let mountedAt = 0;
	let reads: StubRequest[] = [];
	try {
		await expect(page, `${arm}: ${route.path} sent the person away`).toHaveURL(`${APP_ORIGIN}${route.path}`, {
			timeout: 45_000
		});
		await expect(
			reportCrumb(page, route.path),
			`${arm}: ${route.path} stayed in the URL without rendering the report itself`
		).toHaveCount(1);
		mountedAt = Date.now();
		// The guard admitted the person: everything the timing needs has reached the mock's log by here, so stop
		// watching at the decision rather than at the end of `hardVisit` (see `openReport`).
		await visit.finish();
		await expect(
			reportHeading(page, route),
			`${arm}: ${route.path} rendered its breadcrumb without its heading`
		).toBeVisible();
		reads = await waitForReadCalls(mock, route);
	} finally {
		await visit.finish();
	}
	expect(
		reads.length,
		`${arm}: ${route.path} was let in, yet the report read that only its own component sends was never sent`
	).toBeGreaterThan(0);
	const refusedReads = reads.filter((call) => call.status >= 400);
	expect(
		refusedReads.map((call) => [call.method, call.path, call.status]),
		`${arm}: the read that proves the report mounted was refused`
	).toEqual([]);

	const paths = await urlPathsWhileWatching(page, 1_500);
	expect(
		[...new Set(paths)],
		`${arm}: admitted at ${route.path}, but the person was moved during the next 1.5 s`
	).toEqual([route.path]);

	report(`${arm} :: ${route.key} admitted`, {
		url: page.url(),
		breadcrumbLinks: await reportCrumb(page, route.path).count(),
		heading: (await reportHeading(page, route).innerText()).replace(/\s+/g, ' ').trim(),
		mountedAfterNavigationMs: mountedAt - timing.navigatedAt,
		membersReadAfterNavigationMs:
			timing.membersReadAt === undefined ? null : timing.membersReadAt - timing.navigatedAt,
		permissionReadAfterNavigationMs:
			timing.permissionReadAt === undefined ? null : timing.permissionReadAt - timing.navigatedAt,
		reportReads: reads.map((call) => [call.method, call.path, call.status]),
		roleReads: (await mock.calls(ROLE_READ_PATH)).length,
		urlPathsWhileWatching: [...new Set(paths)],
		consoleErrors: shield.consoleErrors()
	});
}

/**
 * Bounced: the person is on `/` with the team home really rendered, no trace of the report is left, the report read
 * was never sent, and the bounce came after the member rows arrived rather than out of a bounded wait.
 */
async function expectBounced(
	page: Page,
	mock: MockControl,
	shield: Shield,
	arm: string,
	route: ReportRoute,
	visit: Visit
) {
	const { timing } = visit;
	let bouncedAt = 0;
	let reads: StubRequest[] = [];
	try {
		await expect(page, `${arm}: ${route.path} kept a person the guard refuses`).toHaveURL(`${APP_ORIGIN}/`, {
			timeout: 45_000
		});
		bouncedAt = Date.now();
		// The guard has bounced: the log watcher has now seen everything the decision could have been made from, so
		// it stops here rather than at the end of `hardVisit` (see `openReport`).
		await visit.finish();
		await expect(
			homeHeading(page),
			`${arm}: bounced from ${route.path} to a home page that never rendered`
		).toBeVisible({ timeout: 25_000 });
		await expect(
			reportCrumb(page, route.path),
			`${arm}: ${route.path} is still on screen behind the bounce`
		).toHaveCount(0);
		reads = await readCalls(mock, route);
	} finally {
		await visit.finish();
	}
	expect(reads, `${arm}: ${route.path} read its report data before the guard bounced the person`).toEqual([]);

	// The guard decides on the user's own member row (`must-be-a-manager.tsx:68-72`), and that row arrives with a team
	// read. Pinned as an ordering, and only as an ordering: a first visit to a route pays a cold `next dev` compile,
	// so a hard ceiling on the whole page time would turn the compile into a false red (header).
	const arrivedAt = timing.membersReadAt;
	expect(
		arrivedAt,
		`${arm}: bounced from ${route.path} before either team read that carries the members reached the mock`
	).not.toBeUndefined();
	const afterMembersMs = bouncedAt - (arrivedAt as number);
	// The guard mounts no earlier than this navigation, so a bounce that lands inside `TEAMS_LIST_WAIT_MS` cannot have
	// come from the long bounded wait (`must-be-a-manager.tsx:24`, armed at `:86-90`). Measured max 10 352 ms here,
	// on a route whose first visit also paid a cold `next dev` compile.
	expect(
		bouncedAt - timing.navigatedAt,
		`${arm}: the bounce at ${route.path} landed no sooner than the guard's long bounded wait could have`
	).toBeLessThan(TEAMS_LIST_WAIT_MS);

	report(`${arm} :: ${route.key} bounced`, {
		url: page.url(),
		homeHeading: await homeHeading(page).first().innerText(),
		breadcrumbLinks: await reportCrumb(page, route.path).count(),
		reportReads: reads.length,
		bouncedAfterNavigationMs: bouncedAt - timing.navigatedAt,
		membersReadAfterNavigationMs: (arrivedAt as number) - timing.navigatedAt,
		permissionReadAfterNavigationMs:
			timing.permissionReadAt === undefined ? null : timing.permissionReadAt - timing.navigatedAt,
		afterMembersMs,
		boundedWaitsMs: { selfMembership: SELF_MEMBERSHIP_WAIT_MS, teamsList: TEAMS_LIST_WAIT_MS },
		roleReads: (await mock.calls(ROLE_READ_PATH)).length,
		body: await bodyText(page),
		consoleErrors: shield.consoleErrors()
	});
}

test.describe('lane-a · who each /reports page lets in: role name and team-manager flag, apart', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------------------------------------- 1-2. the two halves the mock can arm on their own

	test('1 · the default person (isManager true, role ADMIN) is admitted everywhere, and a non-manager is bounced from every manager-only report but not from time-and-activity', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const cases: Array<{ arm: string; scenario: MockScenario; admitted: (route: ReportRoute) => boolean }> = [
			{ arm: '1 manager+ADMIN', scenario: DEFAULT_PERSON, admitted: () => true },
			{
				arm: '2 no manager+EMPLOYEE',
				scenario: NOT_MANAGER,
				admitted: (route) => route.path === MEMBER_REPORT_PATH
			}
		];

		for (const testCase of cases) {
			for (const route of MATRIX_ROUTES) {
				const visit = await openReport(page, mock, fixture, route, testCase.scenario);
				const admitted = testCase.admitted(route);
				if (admitted) {
					await expectAdmitted(page, mock, shield, testCase.arm, route, visit);
				} else {
					await expectBounced(page, mock, shield, testCase.arm, route, visit);
				}
				expect(shield.pageErrors(), `${testCase.arm} at ${route.key}: an uncaught error`).toEqual([]);
			}
		}
	});

	// ------------------------------------------- 3-4. the tenant-wide role names, with no team managed

	test('2 · a tenant ADMIN or SUPER_ADMIN who manages no team is admitted everywhere', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const cases: Array<{ arm: string; scenario: MockScenario }> = [
			{ arm: '3 ADMIN without team', scenario: TENANT_ADMIN_WITHOUT_TEAM },
			{ arm: '4 SUPER_ADMIN without team', scenario: SUPER_ADMIN_WITHOUT_TEAM }
		];

		for (const testCase of cases) {
			for (const route of MATRIX_ROUTES) {
				const visit = await openReport(page, mock, fixture, route, testCase.scenario);
				await expectAdmitted(page, mock, shield, testCase.arm, route, visit);
				expect(shield.pageErrors(), `${testCase.arm} at ${route.key}: an uncaught error`).toEqual([]);
			}
		}
	});

	// ------------------------------------------- 5-6. the two arms that separate the manager halves

	test('3 · role MANAGER (the mock puts it on the member row too), and a team manager whose role is EMPLOYEE: both admitted everywhere', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// Arm 5 is the case the guard's own file says should bounce (`isGlobalAdmin` false, `admitsMembers` false) and
		// the page admits, because `useIsMemberManager` reads the member's role name too
		// (`core/hooks/organizations/teams/use-team-member.ts:25-31`) — by design; the mock copies the user's role onto
		// every member row (`mock-gauzy-server.mjs:212-213`), a mock limit, so the arm is "team role MANAGER" here.
		// Arm 6 is the manager flag alone: role EMPLOYEE, `member.isManager: true`.
		const cases: Array<{ arm: string; scenario: MockScenario }> = [
			{ arm: '5 role MANAGER without team', scenario: ROLE_NAMED_MANAGER_WITHOUT_TEAM },
			{ arm: '6 EMPLOYEE role who is a manager', scenario: EMPLOYEE_ROLE_TEAM_MANAGER }
		];

		for (const testCase of cases) {
			for (const route of MATRIX_ROUTES) {
				const visit = await openReport(page, mock, fixture, route, testCase.scenario);
				await expectAdmitted(page, mock, shield, testCase.arm, route, visit);
				expect(shield.pageErrors(), `${testCase.arm} at ${route.key}: an uncaught error`).toEqual([]);
			}
		}
	});

	// ------------------------------------------- 7. the member report's permission half

	test('4 · time-and-activity for a non-manager: open while the role holds a time-log permission, closed when that read is refused', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const route: ReportRoute = MATRIX_ROUTES.find((entry) => entry.path === MEMBER_REPORT_PATH) as ReportRoute;

		// With ALL_ORG_VIEW armed on top of the role's base TIME_TRACKER: still admitted (reports/layout.tsx:87 wants
		// any one of TIME_LOG_REPORT_PERMISSIONS, report-access.ts:5-10). The arm that would CLOSE it for a role
		// holding none of them is not arammable — `extraPermissions` only adds (mock-gauzy-server.mjs:54-63).
		{
			const visit = await openReport(page, mock, fixture, route, NOT_MANAGER_WITH_TIME_PERMISSION);
			await expectAdmitted(page, mock, shield, '7a non-manager + ALL_ORG_VIEW', route, visit);
		}

		{
			const visit = await openReport(page, mock, fixture, route, NOT_MANAGER_PERMISSION_READ_REFUSED);
			await expectBounced(page, mock, shield, '7b non-manager + refused permission read', route, visit);
			// The refusal the page was answered is its own explanation of why the report stayed shut.
			const roleReads = await mock.calls(ROLE_READ_PATH);
			expect(
				roleReads.map((call) => call.status),
				'the permission read the layout asks for was not the refused one this arm armed'
			).toEqual(roleReads.map(() => 500));
			expect(
				shield.logMatching(/role-permissions\/me 500/).length,
				'the app logged nothing about the permission read it was refused'
			).toBeGreaterThan(0);
			expect(
				roleReads.length,
				'the layout never asked for the permissions its member report is gated on'
			).toBeGreaterThan(0);
			report('7b refused permission read', {
				roleReadStatuses: roleReads.map((call) => call.status),
				consoleErrors: shield.consoleErrors().length
			});
		}
	});

	// ------------------------------------------- 8. the sweep: every manager-only URL, both directions

	test('5 · sweep: every manager-only report URL bounces the non-manager', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		for (const route of managerOnlyRoutes(fixture)) {
			const visit = await openReport(page, mock, fixture, route, NOT_MANAGER);
			await expectBounced(page, mock, shield, '2 no manager+EMPLOYEE', route, visit);
			expect(shield.pageErrors(), `sweep ${route.key}: an uncaught error`).toEqual([]);
		}
	});

	test('6 · sweep: every manager-only report URL admits the tenant admin who manages no team', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		for (const route of managerOnlyRoutes(fixture)) {
			const visit = await openReport(page, mock, fixture, route, TENANT_ADMIN_WITHOUT_TEAM);
			await expectAdmitted(page, mock, shield, '3 ADMIN without team', route, visit);
			expect(shield.pageErrors(), `sweep ${route.key}: an uncaught error`).toEqual([]);
		}
	});

	// ------------------------------------------- 9. the timesheet route takes the member id in its path

	test('7 · /reports/timesheet/<memberId> gates on the reader, not on whose sheet the URL names', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// `memberId` is used as an employee id by the page (`use-copy-previous-week.ts:121`,
		// `use-sheet-cell-writes.ts:211`), so this is the fixture's own employee and a teammate's. The gate decided the
		// same way for both ids in every measured arm (`matrix-1.jsonl`, columns "timesheet (own id)" / "(teammate id)").
		const routes: ReportRoute[] = [
			{
				key: 'timesheet-own-employee',
				path: `/reports/timesheet/${fixture.ids.employee}`,
				heading: 'Timesheets',
				readPath: '/api/timesheet/time-log',
				exactRead: true
			},
			{
				key: 'timesheet-teammate-employee',
				path: `/reports/timesheet/${fixture.ids.teammateEmployee}`,
				heading: 'Timesheets',
				readPath: '/api/timesheet/time-log',
				exactRead: true
			}
		];

		for (const route of routes) {
			const bounced = await openReport(page, mock, fixture, route, NOT_MANAGER);
			await expectBounced(page, mock, shield, '2 no manager+EMPLOYEE', route, bounced);
		}
		for (const route of routes) {
			const admitted = await openReport(page, mock, fixture, route, SUPER_ADMIN_WITHOUT_TEAM);
			await expectAdmitted(page, mock, shield, '4 SUPER_ADMIN without team', route, admitted);
		}
	});
});
