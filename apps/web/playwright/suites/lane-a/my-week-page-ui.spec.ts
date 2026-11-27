import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page } from '../../fixtures';
import { mockReset, mockStateWhen, signInAndVisit, waitForShellReady } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on **My week** (`/my-week`,
 * `app/[locale]/(main)/my-week/page.tsx:9-14` → `MyWeekPage`), on lane-a (app `http://localhost:3031`,
 * mock `http://127.0.0.1:3992`, control `3994`, `playwright/test-servers.ts`).
 *
 * ## The code this file drives (every line opened before it is named)
 *
 * - `core/components/dashboards/my-week/my-week-page.tsx` — `:30 TIMER_PATH = '/'` (the empty state's link),
 *   `:32-36 PERIOD_LABEL_KEYS` (`common.THIS_WEEK / LAST_WEEK / THIS_MONTH`), `:45-64 PeriodSwitch` →
 *   `core/components/common/segmented-control.tsx:118-171` (`role="tablist"`, one `role="tab"` per choice,
 *   `aria-selected`, the inactive one `tabindex="-1"`), `:67-92 EmptyPeriod`, `:94-130 MyWeekBody` (the gate:
 *   no-member → error → skeleton → empty → body), `:145` the goals only for `shownKey === 'thisWeek'`, `:161` the
 *   toolbar meta `formatPeriod(page.shownPeriod, locale)` (`core/lib/utils/dashboard-period.ts:147-158`).
 * - the body: `my-week-summary.tsx:109-136` (the week figure) and `:189-213` (Today / Billable / Billable amount),
 *   `my-week-days.tsx:56-103` → `kit/day-bars-chart.tsx:366-383` (the `role="slider"`) and `:509-524` (the values in a
 *   `table.sr-only`, one row per day: `<th scope="row">{full day label}</th><td>{formatDurationShort}</td>`),
 *   `my-week-projects.tsx:43-67` → `kit/share-rows.tsx:63-103`, `my-week-recent-entries.tsx:95-167` →
 *   `my-week-entry-start.tsx:6-12` → `tasks/task-card.tsx:459-524` → `timer/timer-button.tsx:51-79` (`aria-label` =
 *   `hotkeys.START_TIMER` / `hotkeys.STOP_TIMER`), `my-week-goals.tsx:15-40` → `goals/goal-row.tsx:80-121` +
 *   `goals/goal-labels.ts`; the states in `kit/dashboard-states.tsx:11-49`.
 * - the hook and the maths: `core/hooks/dashboards/my-week/use-my-week-page.ts:105-249`,
 *   `core/lib/utils/dashboards/my-week.ts` (`myWeekEntriesOf:133-174`, `myWeekDaysOf:193-206`,
 *   `myWeekFiguresOf:232-247`, `myWeekBillableOf:363-389`, `myWeekProjectsOf:472-528`, `RECENT_ENTRY_COUNT = 8` at `:32`).
 * - the reads: `core/services/client/api/timesheets/time-log.service.ts:271-343` (the week read),
 *   `time-log-report.service.ts:51-63` (the billed read), `rate.service.ts:42-49` (one rates read per project),
 *   `core/services/client/api/timesheets/time-goal.service.ts` (`/api/time-goals`, `/api/time-goals/progress`),
 *   `core/hooks/roles/use-my-role-permissions-query.ts:15-44` + `core/lib/utils/rates.ts:11,258-260`.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's dev server and the lane's mock — the sign-in, the shell (`/api/user/me`,
 * `/api/organization-team`, `/api/timesheet/timer/status`, `/api/organization/<id>`) and the role permissions
 * (`/api/role-permissions/me`, whose fixture role already holds `ORG_EMPLOYEES_EDIT`,
 * `cypress/support/mock-gauzy-server.mjs:50`).
 *
 * **Served by this file** with `page.route` on the mock origin, store-backed, restating the mock's CORS answer and
 * answering `OPTIONS` with 204 (the pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`): the time logs
 * (the mock answers `[]` unless `scenario.timeLogs` is set, `mock-gauzy-server.mjs:798-801`), the billed (kept-rates)
 * read, the project rates (the mock has no `/api/organization-projects/<id>/rates` handler at all), the time goals and
 * their progress (`/api/time-goals/progress` → `[]` at `:820`). `route.fetch()` is never called, so every served
 * answer is this file's.
 *
 * ## Time zones
 *
 * The page builds its days and its `timeZone` param from `getDefaultTimezone()`
 * (`core/lib/helpers/date-and-time.ts:313` = `Intl.DateTimeFormat().resolvedOptions().timeZone`), reached at
 * `use-my-week-page.ts:105`; `localDayKeyOf` (`core/lib/utils/dashboard-export.ts:90-95`) and the printed clocks are
 * local too. **The browser's zone is the zone of this page's days**, and the mock organization's own `timeZone: 'UTC'`
 * (`mock-gauzy-server.mjs:795`) is never used here — test 10 pins the read's `timeZone` against the zone read from the
 * page. The lane's config sets no `timezoneId` (`playwright/playwright.lane.config.ts:45-55`), so the browser runs in
 * the machine's zone and the served instants and the expected labels come from the same clock. Every date here is
 * calendar arithmetic (`setDate`), never ± 24 h, and no test pins today's date.
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-myweek\probe1.spec.ts` (log `probe1.log`, 2026-11-27: the lane as-is,
 * served logs, the period switch, the empty week, goals, the rate-admin money, start/stop, a refused read, a reload, an
 * entry over midnight) and `probe2.spec.ts` (logs `probe2.log`, run twice, and `probe2c.log`: the money with rates for
 * both projects, the shapes the week read comes in, a refused goals read, a refused role read). Each served value here
 * is fed through the page's own rules (`planOf` below), so every expectation is computed from what the stub answers;
 * the two acceptance runs (`s3-lane-a-myweek-1.log`, `-2.log`) confirmed every pin.
 *
 * ## Findings (measured; no comment, type, unit test or product copy says these are unwanted, so none is tagged)
 *
 * 1. **The week is read twice, and the two reads are not identical.** The first carries `relations[0..5] = project,
 *    task, organizationContact, employee.user, task.taskStatus, timesheet`; a later one adds `relations[6]=tags` with
 *    the same range and the same `employeeIds[0]`. That is `core/hooks/timer/use-entry-labels-support.ts:58-70`: the
 *    labels answer arrives from the shell's own timer status (`mock-gauzy-server.mjs:285 lastLog.tags: []`), the week
 *    query key includes it, so the same period is fetched again. Measured in every load (`probe2.log` "A read shapes",
 *    both repeats; `probe1.log` P2, P3, P6, P8, P9, P10).
 * 2. **A reload forgets the period.** `use-my-week-page.ts:106` is a plain `useState` — no URL param, no storage — so
 *    after a reload the page is back on *This week* and reads it again (`probe1.log` P9; test 11).
 * 3. **A recent row's Start button does not flip on the click; it flips when the shell's active task becomes that
 *    task.** `core/hooks/tasks/use-timer-button.ts:37-40` `activeTaskStatus = activeTeamTask?.id === task.id ?
 *    timerStatus : undefined`, and the button is `running = optimisticRunning ?? activeTaskStatus?.running`
 *    (`task-card.tsx:474`). Measured in `probe1.log` P7: right after the click the row still said *Start timer* while
 *    the shell already had a *Stop timer*; the row's own button became *Stop timer* a moment later.
 * 4. **A rate non-admin cannot be armed by taking a permission away.** `scenario.extraPermissions` only appends
 *    (`playwright/helpers.ts:116-126`, `mock-gauzy-server.mjs:54-63`), and the fixture role already holds
 *    `ORG_EMPLOYEES_EDIT` (`:50`), which is what `core/lib/utils/rates.ts:11` asks for — so every test here is a rate
 *    admin, and the "not an admin" half of test 6 arms the refusal the lane can arm: no permissions answered
 *    (`scenario.fails` on `/api/role-permissions/me`), the arm `suites/lane-a/reports-gate-by-role-ui.spec.ts` uses.
 *    `use-my-role-permissions-query.ts:15-44` then leaves the permissions unloaded, so `readsBillable` is false
 *    (`use-my-week-page.ts:156`) and neither read is sent (`probe2c.log`).
 * 5. **The billed read answers nothing in this lane** (this file's own stub answers `[]`), yet the money is right:
 *    `myWeekBillableOf` (`my-week.ts:363-389`) prices the *served entries* with the project rates. Measured
 *    `probe2.log` A: 3 h + 1 h 30 m at 100 and 2 h 15 m at 60 → `$585.00`.
 * 6. **A `scenario.fails` arm cannot reach a route this file stubs** — the stub answers before the mock is asked.
 *    Measured in `dev2-lane-a-myweek.log`: with `fails: {'/api/timesheet/time-log': 500}` the page still showed its
 *    whole body (`3h 0m` on Monday and all). Tests 8 and 9 therefore arm the refusal inside the stub (`Script.refusals`);
 *    test 6 arms `fails` on `/api/role-permissions/me`, a route the stub does not take.
 * 7. **`role="slider"` is not the readable half of the chart.** Its `aria-valuenow` / `aria-valuemax` are pointer state,
 *    not day totals (`kit/day-bars-chart.tsx:366-383`; `probe1.log` P2 read `valuenow="0"`, `valuemax="6"`,
 *    `valuetext=null` with three days of time on the page). The values are the `sr-only` table (`:509-524`), which is
 *    what test 1 reads.
 *
 * ## What this file does not reach, and why
 *
 * - **The no-member notice** (`isMemberUnknown` at `use-my-week-page.ts:235`, printed at `my-week-page.tsx:99-102`) is
 *   **not reachable with the mock's users**: the mock always answers an employee for the fixture user
 *   (`mock-gauzy-server.mjs:155 baseUser.employee = employees.self`, served at `:478-492`), and answering
 *   `/api/user/me` *without* one never gets a shell at all — the team list read's organization is the employee's
 *   (`core/hooks/organizations/teams/use-organization-teams-query.ts:135`, and the comment at
 *   `core/components/layouts/app/init-state.tsx:118-119` says it outright), so `criticalReady` (`init-state.tsx:266-271`)
 *   never becomes true. Measured in `probe1.log` P11: `the shell never became ready … marks in this page:
 *   ["ever-teams:shell-bootstrap-start"]`.
 * - **The weekly limit and its verdicts** (`LIMIT_SHARE`, `LIMIT_LEFT/UNDER/OVER`, the `VERDICT_*` badge,
 *   `my-week-summary.tsx:43-98`): the mock's employee carries no `reWeeklyLimit` (`mock-gauzy-server.mjs`
 *   `makeEmployee`), so the page always prints `myWeek.NO_LIMIT` here. Those states are pinned by
 *   `core/lib/utils/dashboards/my-week.test.ts` (`weeklyLimitSecondsOf`, `myWeekTargetOf`, the verdicts at 25 / 75 /
 *   92.5 / 105 %).
 * - The `RECENT_ENTRY_COUNT = 8` cap and its `myWeek.RECENT_LATEST` meta (`my-week-recent-entries.tsx:132-138`) are not
 *   exercised: a served list longer than eight would leave half of it unasserted. The cap is a constant at
 *   `my-week.ts:32` and no unit test pins it.
 * - `api/page-gate.spec.ts`, `suites/lane-d/page-gate-*.spec.ts` and `suites/mock/routes.spec.ts` already cover the
 *   route and its gate; this file does not repeat them.
 */

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: Record<string, string>;
	hotkeys: Record<string, string>;
	pages: { unauthorized: Record<string, string> };
	dashboard: {
		calendar: Record<string, string>;
		goals: Record<string, string>;
		myWeek: Record<string, string>;
		period: Record<string, string>;
		states: Record<string, string>;
		team: { cards: Record<string, string>; projects: Record<string, string> };
		timeActivity: { columns: Record<string, string>; figures: Record<string, string> };
		timesheets: Record<string, string>;
		weeklyLimit: Record<string, string>;
	};
};

/** English, filled the way next-intl fills it: `{name}` slots and a `{count, plural, one {…} other {…}}` block. */
function copy(path: string, values: Record<string, number | string> = {}): string {
	const template = path.split('.').reduce((holder: unknown, key) => (holder as Record<string, unknown>)?.[key], EN);
	if (typeof template !== 'string') throw new Error(`locales/en.json has no key ${path}`);
	const filled = template.replace(
		/\{(\w+), plural, one \{([^{}]*)\} other \{([^{}]*)\}\}/g,
		(_all, name: string, one: string, other: string) =>
			(Number(values[name]) === 1 ? one : other).replace('#', String(values[name]))
	);
	return Object.entries(values).reduce(
		(text, [name, value]) => text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
		filled
	);
}

const HOUR = 3600;
const PAGE = '/my-week';
const LOGS_PATH = '/api/timesheet/time-log';
const GOALS_PATH = '/api/time-goals';
const PROGRESS_PATH = '/api/time-goals/progress';
const TIMER_START_PATH = '/api/timesheet/timer/start';
const TIMER_STOP_PATH = '/api/timesheet/timer/stop';
/** A project of the served week that the lane's mock does not know; its rates are served too. */
const PROJECT_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-111111111111';
const PROJECT_B_NAME = 'Probe second project';
/** A task that is not in the team's task list, so its row offers no start button (`my-week-recent-entries.tsx:124-130`). */
const TASK_B_ID = 'task-probe-second';
const TASK_B_NAME = 'Probe second task';
/** `core/constants/config/constants.tsx:1119-1126`, the relations the week read carries. */
const TIMESHEET_RELATIONS = ['project', 'task', 'organizationContact', 'employee.user', 'task.taskStatus', 'timesheet'];

/** The mock's own CORS answer, restated (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`). */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => d.toISOString();
/** The local day `offset` days from today, at `hour:minute` — `setDate`, so a daylight-saving day is still one day. */
const at = (offset: number, hour: number, minute = 0) => {
	const d = new Date();
	d.setHours(hour, minute, 0, 0);
	d.setDate(d.getDate() + offset);
	return d;
};
const dayKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** The Monday-starting week holding today, moved by `weeksAgo` (`weekStartOf(undefined) = 1`, `dashboards/weekly-limit.ts:27`). */
const localWeek = (weeksAgo = 0) => {
	const monday = new Date();
	monday.setHours(0, 0, 0, 0);
	monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weeksAgo * 7);
	const from = new Date(monday);
	const to = new Date(monday);
	to.setDate(to.getDate() + 6);
	to.setHours(23, 59, 59, 999);
	return { from, to };
};
/** Day `index` of that week (negative indexes reach into the week before it). */
const dayOf = (week: { from: Date }, index: number, hour = 9, minute = 0) => {
	const d = new Date(week.from);
	d.setDate(d.getDate() + index);
	d.setHours(hour, minute, 0, 0);
	return d;
};
const localMonth = () => {
	const now = new Date();
	return {
		from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
		to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
	};
};
/** `formatStartAndEndDateRange` for a whole period, in the zone the read is sent with (`core/lib/helpers/format-date-range.ts:125-155`). */
const rangeOf = (from: Date, to: Date) => ({ startDate: iso(from), endDate: iso(endOfDayOf(to)) });
const endOfDayOf = (d: Date) => {
	const end = new Date(d);
	end.setHours(23, 59, 59, 999);
	return end;
};
/** The week read's range: the shown period widened by one day on each side (`calendar-view.ts:207-211`). */
const widenedOf = (period: { from: Date; to: Date }) => {
	const from = new Date(period.from);
	from.setDate(from.getDate() - 1);
	const to = new Date(period.to);
	to.setDate(to.getDate() + 1);
	return rangeOf(from, to);
};

/** `formatDurationShort` as the page prints it: `7h 15m`, `2h 0m` (`probe1.log` P2). */
const durationOf = (seconds: number) => `${Math.floor(seconds / HOUR)}h ${Math.round((seconds % HOUR) / 60)}m`;
/** `formatPercent` rounds to whole percent (`probe2.log` A: 6.75 / 7.25 → 93 %). */
const percentOf = (part: number, whole: number) => `${Math.round((part / whole) * 100)}%`;
/** `formatAmounts` of one currency (`probe2.log` A: `$585.00`). */
const amountOf = (value: number, currency: string) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
/** `formatPeriod` in the page's locale (`dashboard-period.ts:147-158`; `probe1.log` P2: `Nov 23 – 29`). */
const periodLabel = (period: { from: Date; to: Date }) =>
	new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).formatRange(period.from, period.to);
/** The chart's `sr-only` row label (`probe1.log` P10: `Thursday, Nov 26`). */
const dayLabel = (d: Date) =>
	new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(d);
/** A recent row's day word (`probe1.log` P2: `Wed, Nov 25`). */
const shortDayLabel = (d: Date) =>
	new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
/** A recent row's clock pair, `timeRangeTextOf` (`timesheets.ts:598-611`; `probe1.log` P2: `08:15 AM – 09:45 AM`). */
const clockOf = (d: Date) =>
	new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(d);

type Fixture = { ids: Record<string, string>; names: Record<string, string> };
type ServedLog = Record<string, unknown>;
type ServedCall = { method: string; path: string; search: string; params: Record<string, string>; body: string | null };

/** The time-log answer the mock would give, started on `date` (which carries the hour and the minute). */
const logOf = (
	fixture: Fixture,
	options: {
		id: string;
		date: Date;
		seconds: number;
		projectId?: string | null;
		projectName?: string | null;
		taskId?: string | null;
		taskTitle?: string | null;
		employeeId?: string;
		isBillable?: boolean;
	}
): ServedLog => {
	const startedAt = new Date(options.date);
	startedAt.setSeconds(0, 0);
	const employeeId = options.employeeId ?? fixture.ids.employee;
	const projectId = options.projectId ?? null;
	return {
		id: options.id,
		startedAt: iso(startedAt),
		stoppedAt: iso(new Date(startedAt.getTime() + options.seconds * 1000)),
		duration: options.seconds,
		logType: 'TRACKED',
		source: 'TEAMS',
		isBillable: options.isBillable ?? false,
		isRunning: false,
		version: '1',
		employeeId,
		employee: { id: employeeId, fullName: fixture.names.user, user: { id: fixture.ids.user } },
		taskId: options.taskId ?? null,
		task: options.taskId ? { id: options.taskId, title: options.taskTitle ?? TASK_B_NAME } : null,
		projectId,
		project: projectId
			? { id: projectId, name: options.projectName ?? PROJECT_B_NAME, color: '#22c55e', imageUrl: null }
			: null,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	};
};

/**
 * The served week: three days of the shown week on two projects (two of them billable at project A's rate, one at
 * project B's), today and yesterday, a teammate's log on the same project (which is not the member's week) and a log
 * in the week before (which is not in this week). Every day is built from the shown week's Monday or from today, so
 * the week always holds several days whatever day the run happens on.
 */
const weekLogs = (fixture: Fixture, week: { from: Date; to: Date }): ServedLog[] => [
	logOf(fixture, {
		id: 'own-monday',
		date: dayOf(week, 0, 9),
		seconds: 3 * HOUR,
		projectId: fixture.ids.project,
		projectName: 'Probe first project',
		taskId: fixture.ids.task,
		taskTitle: fixture.names.task,
		isBillable: true
	}),
	logOf(fixture, {
		id: 'own-wednesday',
		date: dayOf(week, 2, 10),
		seconds: 2 * HOUR + 15 * 60,
		projectId: PROJECT_B_ID,
		projectName: PROJECT_B_NAME,
		taskId: TASK_B_ID,
		taskTitle: TASK_B_NAME,
		isBillable: true
	}),
	logOf(fixture, {
		id: 'own-friday',
		date: dayOf(week, 4, 11),
		seconds: 90 * 60,
		projectId: fixture.ids.project,
		projectName: 'Probe first project',
		taskId: fixture.ids.task,
		taskTitle: fixture.names.task,
		isBillable: true
	}),
	logOf(fixture, { id: 'own-today', date: at(0, 13), seconds: 30 * 60 }),
	logOf(fixture, {
		id: 'own-yesterday',
		date: at(-1, 10),
		seconds: 45 * 60,
		projectId: fixture.ids.project,
		projectName: 'Probe first project'
	}),
	logOf(fixture, {
		id: 'teammate-monday',
		date: dayOf(week, 0, 14),
		seconds: 2 * HOUR,
		projectId: fixture.ids.project,
		projectName: 'Probe first project',
		employeeId: fixture.ids.teammateEmployee
	}),
	logOf(fixture, {
		id: 'own-last-week',
		date: dayOf(week, -7, 9),
		seconds: 4 * HOUR,
		projectId: PROJECT_B_ID,
		projectName: PROJECT_B_NAME,
		isBillable: true
	})
];

/** What each project of the served week is priced at (`projectRatesSchema`, `rates.schema.ts:13-20`). */
const ratesFor = (fixture: Fixture) => ({
	[fixture.ids.project]: { id: fixture.ids.project, billRateValue: 100, currency: 'USD' },
	[PROJECT_B_ID]: { id: PROJECT_B_ID, billRateValue: 60, currency: 'USD' }
});

/* ───────────────────────── the served API (page.route on the mock origin) ───────────────────────── */

type Script = {
	logs: ServedLog[];
	/** The billed (kept-rates) read's answer; the lane's mock has nothing to answer here. */
	billable?: ServedLog[];
	/** project id → the `projectRatesSchema` answer (`core/types/schemas/organization/rates.schema.ts:13-20`). */
	rates?: Record<string, Record<string, unknown>>;
	goals?: Array<Record<string, unknown>>;
	progress?: Array<Record<string, unknown>>;
	/**
	 * A path this stub answers with a refusal instead of its store. `scenario.fails` cannot arm these: the stub
	 * answers the call before the mock ever sees it (measured in `dev2-lane-a-myweek.log`, where a `scenario.fails`
	 * on `/api/timesheet/time-log` left the page with its whole body).
	 */
	refusals?: Record<string, number>;
};

/**
 * Store-backed: every answer is the current store, `route.fetch()` is never called, and `OPTIONS` answers 204 with the
 * mock's CORS headers (a page on `localhost:3031` talking to `127.0.0.1:3992` throws an answer away without them).
 */
async function serveMyWeek(page: Page, script: Script) {
	const calls: ServedCall[] = [];
	const json = { ...CORS_HEADERS, 'content-type': 'application/json' };

	await page.route(
		(url) =>
			url.origin === new URL(MOCK_ORIGIN).origin &&
			(url.pathname === LOGS_PATH ||
				url.pathname === GOALS_PATH ||
				url.pathname === PROGRESS_PATH ||
				(url.pathname.startsWith('/api/organization-projects/') && url.pathname.endsWith('/rates'))),
		async (route) => {
			const request = route.request();
			const method = request.method();
			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });

			const url = new URL(request.url());
			const params: Record<string, string> = {};
			url.searchParams.forEach((value, key) => {
				params[key] = value;
			});
			calls.push({ method, path: url.pathname, search: url.search, params, body: request.postData() });

			const answer = (status: number, body: unknown) =>
				route.fulfill({ status, headers: json, body: JSON.stringify(body) });

			const refusal = script.refusals?.[url.pathname];
			if (refusal) return answer(refusal, { statusCode: refusal, message: 'this spec refused the read' });

			if (url.pathname === LOGS_PATH) {
				// the entry-labels probe: `relations[0]=tags` over the last minute, no `employeeIds`
				if (params['relations[0]'] === 'tags' && !params['employeeIds[0]']) return answer(200, []);
				if (params['billableOnly'] === 'true') return answer(200, script.billable ?? []);
				const asked = Object.entries(params)
					.filter(([name]) => name.startsWith('employeeIds['))
					.map(([, value]) => value);
				const from = params['startDate'] ? new Date(params['startDate']).getTime() : null;
				const to = params['endDate'] ? new Date(params['endDate']).getTime() : null;
				return answer(
					200,
					script.logs.filter((log) => {
						if (asked.length && !asked.includes(String(log.employeeId))) return false;
						const startedAt = new Date(String(log.startedAt)).getTime();
						if (from !== null && startedAt < from) return false;
						if (to !== null && startedAt > to) return false;
						return true;
					})
				);
			}

			if (url.pathname === GOALS_PATH) {
				const goals = script.goals ?? [];
				return answer(200, { items: goals, total: goals.length });
			}
			if (url.pathname === PROGRESS_PATH) return answer(200, script.progress ?? []);

			const projectId = url.pathname.split('/')[3];
			const rates = script.rates?.[projectId];
			return rates ? answer(200, rates) : answer(404, { statusCode: 404, message: 'no rates served for it' });
		}
	);

	return {
		calls,
		/** The period read:`…/time-log` for the member's own employee, never the billed read of the same path. */
		weekReads: () =>
			calls.filter(
				(c) =>
					c.method === 'GET' &&
					c.path === LOGS_PATH &&
					Boolean(c.params['employeeIds[0]']) &&
					!c.params['billableOnly']
			),
		billableReads: () => calls.filter((c) => c.params['billableOnly'] === 'true'),
		rateReads: () => calls.filter((c) => c.method === 'GET' && c.path.endsWith('/rates')),
		goalReads: () => calls.filter((c) => c.method === 'GET' && c.path === GOALS_PATH),
		progressReads: () => calls.filter((c) => c.method === 'GET' && c.path === PROGRESS_PATH)
	};
}

/**
 * Every call the browser makes to the mock origin, including the timer writes this file does not stub (the mock
 * answers those itself, `mock-gauzy-server.mjs:750-758`).
 */
function recordCalls(page: Page) {
	const calls: Array<{ method: string; path: string; search: string; body: string | null }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== new URL(MOCK_ORIGIN).origin) return;
		calls.push({ method: request.method(), path: url.pathname, search: url.search, body: request.postData() });
	});
	return {
		calls,
		/** A page that polls never gives the write at `calls[i]`: pick it by method (`brief-common.md`). */
		writeTo: (path: string) => calls.find((c) => c.method !== 'GET' && c.path === path)
	};
}

/* ───────────────────────── what the page is expected to print ───────────────────────── */

type Entry = ServedLog & {
	seconds: number;
	billableSeconds: number;
	startedAtMs: number;
	dayKey: string;
	projectName: string;
	taskTitle: string;
	rate: number;
	currency: string;
};

/**
 * The page's own rules over the same served values (`myWeekEntriesOf`, `my-week.ts:133-174`: the member's own
 * employee only, the period's own day keys, newest first). Every expectation below comes from this.
 */
function planOf(fixture: Fixture, logs: ServedLog[], rates: Record<string, Record<string, unknown>>) {
	const own: Entry[] = logs
		.filter((log) => log.employeeId === fixture.ids.employee)
		.map((log) => {
			const startedAt = new Date(String(log.startedAt));
			const projectId = (log.projectId as string | null) ?? null;
			const rate = rates[projectId ?? ''] ?? {};
			return {
				...log,
				seconds: Number(log.duration),
				billableSeconds: log.isBillable ? Number(log.duration) : 0,
				startedAtMs: startedAt.getTime(),
				dayKey: dayKeyOf(startedAt),
				projectName: (log.project as { name?: string } | null)?.name ?? EN.dashboard.timesheets.NO_PROJECT,
				taskTitle: (log.task as { title?: string } | null)?.title ?? EN.dashboard.timesheets.NO_TASK,
				rate: Number(rate.billRateValue ?? 0),
				currency: String(rate.currency ?? 'USD')
			};
		})
		.sort((a, b) => b.startedAtMs - a.startedAtMs);

	const within = (period: { from: Date; to: Date }) => {
		const first = dayKeyOf(period.from);
		const last = dayKeyOf(period.to);
		return own.filter((entry) => entry.dayKey >= first && entry.dayKey <= last);
	};
	const secondsOf = (entries: Entry[]) => entries.reduce((sum, entry) => sum + entry.seconds, 0);
	const billableOf = (entries: Entry[]) => entries.reduce((sum, entry) => sum + entry.billableSeconds, 0);

	return {
		own,
		within,
		secondsOf,
		billableOf,
		/** `myWeekDaysOf` (`my-week.ts:193-206`): one row per calendar day of the shown week, Monday first. */
		weekDayRowsOf: (week: { from: Date; to: Date }, entries: Entry[]) =>
			Array.from({ length: 7 }, (_, index) => {
				const date = new Date(week.from);
				date.setDate(date.getDate() + index);
				const key = dayKeyOf(date);
				return `${dayLabel(date)}${durationOf(entries.filter((e) => e.dayKey === key).reduce((s, e) => s + e.seconds, 0))}`;
			}),
		/** `myWeekProjectsOf` (`my-week.ts:472-528`): the biggest share first; `No project` is its own row. */
		projectRowsOf: (entries: Entry[]) => {
			const total = secondsOf(entries);
			const byProject = new Map<string, { name: string; seconds: number }>();
			for (const entry of entries) {
				const key = String(entry.projectId ?? 'no-project');
				const row = byProject.get(key) ?? { name: entry.projectName, seconds: 0 };
				row.seconds += entry.seconds;
				byProject.set(key, row);
			}
			return [...byProject.values()]
				.sort((a, b) => b.seconds - a.seconds)
				.map((row) => {
					// whole minutes only, so the redistribution `projectsInMinutesOf` does cannot move a value here
					const minutes = Math.round(row.seconds / 60);
					return `${percentOf(minutes * 60, total)}${row.name}${durationOf(minutes * 60)}`;
				});
		},
		/** `myWeekBillableOf` (`my-week.ts:363-389`): never adds across currencies. */
		amountTextOf: (entries: Entry[]) => {
			const byCurrency = new Map<string, number>();
			for (const entry of entries) {
				if (!entry.billableSeconds || !entry.rate) continue;
				byCurrency.set(
					entry.currency,
					(byCurrency.get(entry.currency) ?? 0) + (entry.seconds / HOUR) * entry.rate
				);
			}
			return [...byCurrency.entries()].map(([currency, value]) => amountOf(value, currency)).join(' · ');
		},
		/** `recentEntries = entries.slice(0, RECENT_ENTRY_COUNT)` (`use-my-week-page.ts:152`, `my-week.ts:32`). */
		recentRowsOf: (entries: Entry[]) => {
			const todayKey = dayKeyOf(new Date());
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayKey = dayKeyOf(yesterday);
			return entries.slice(0, 8).map((entry) => {
				const dayText =
					entry.dayKey === todayKey
						? EN.common.TODAY
						: entry.dayKey === yesterdayKey
							? EN.common.YESTERDAY
							: shortDayLabel(new Date(entry.startedAtMs));
				const rangeText = `${clockOf(new Date(entry.startedAtMs))} – ${clockOf(
					new Date(entry.startedAtMs + entry.seconds * 1000)
				)}`;
				// the `·` belongs to the project (`my-week-recent-entries.tsx:58-71`), so a row without one has none
				const projectText = entry.projectId ? `${entry.projectName}·` : '';
				return `${entry.taskTitle}${projectText}${dayText} · ${rangeText}${durationOf(entry.seconds)}`;
			});
		}
	};
}

/* ───────────────────────── locators and console ───────────────────────── */

const headingOf = (page: Page) => page.getByRole('heading', { level: 1, name: EN.dashboard.myWeek.TITLE, exact: true });
const metaLineOf = (page: Page) => page.locator('h1 + span');
const tabsOf = (page: Page) => page.getByRole('tablist', { name: EN.dashboard.period.LABEL, exact: true });
const tabOf = (page: Page, label: string) => tabsOf(page).getByRole('tab', { name: label, exact: true });
const summaryOf = (page: Page) => page.getByRole('region', { name: EN.dashboard.myWeek.SUMMARY_LABEL, exact: true });
const projectsOf = (page: Page) => page.getByRole('region', { name: EN.dashboard.myWeek.PROJECTS_TITLE, exact: true });
const recentOf = (page: Page) => page.getByRole('region', { name: EN.dashboard.myWeek.RECENT_TITLE, exact: true });
const goalsOf = (page: Page) => page.getByRole('region', { name: EN.dashboard.goals.TITLE, exact: true });
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The week figure's title, whichever period is shown (`myWeek.TRACKED_THIS_WEEK / LAST_WEEK / THIS_MONTH`). */
const TRACKED_TITLES = ['TRACKED_THIS_WEEK', 'TRACKED_LAST_WEEK', 'TRACKED_THIS_MONTH'].map((key) =>
	copy(`dashboard.myWeek.${key}`)
);
const weekFigureOf = (page: Page) =>
	summaryOf(page).getByRole('heading', {
		level: 2,
		name: new RegExp(`^(${TRACKED_TITLES.map(escapeRegExp).join('|')})$`)
	});
const dayTableOf = (page: Page) => summaryOf(page).locator('table.sr-only');
const metaOf = (section: Locator) => section.locator('h2 + span');
const rowTexts = (nodes: Element[]) => nodes.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim());
const rowsOf = (section: Locator) => section.locator('li').evaluateAll(rowTexts);
const textsOf = (locator: Locator) => locator.evaluateAll(rowTexts);

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The client's own HTTP error line for a refusal this file armed (`api.service.ts logError`): it names the verb, the
 * path *with its query string*, then the status twice (`… GET /timesheet/time-log?<qs> 500 {statusCode: 500, …}`), so
 * it is matched as a predicate on those three parts and on nothing else.
 */
const armedHttpError =
	(verb: string, path: string, status: number) =>
	(line: string): boolean =>
		line.includes('[ERROR] [HttpClient] HTTP Error') &&
		line.includes(`${verb} ${path}`) &&
		line.includes(` ${status} {statusCode: ${status}`);

const consoleFindings = (shield: { consoleErrors: () => string[] }, armed: Array<(line: string) => boolean> = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !armed.some((matches) => matches(line)));

/** Never hard-coded: the zone the page itself reads (`date-and-time.ts:313`). */
const zoneOf = (page: Page) => page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

test.beforeEach(async () => {
	await mockReset();
});

test('the week with served logs: the summary, the day totals, the project shares, the recent rows, and the reads as sent', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const rates = ratesFor(fixture);
	const logs = weekLogs(fixture, week);
	const served = await serveMyWeek(page, { logs, billable: [], rates });
	await signInAndVisit(page, fixture, PAGE);
	const plan = planOf(fixture, logs, rates);
	const entries = plan.within(week);
	const tracked = plan.secondsOf(entries);
	const billable = plan.billableOf(entries);
	const todaySeconds = plan.secondsOf(entries.filter((entry) => entry.dayKey === dayKeyOf(new Date())));

	await expect(headingOf(page)).toBeVisible();
	await expect(metaLineOf(page)).toHaveText(periodLabel(week));
	await expect(tabOf(page, EN.common.THIS_WEEK)).toHaveAttribute('aria-selected', 'true');
	await expect(tabOf(page, EN.common.LAST_WEEK)).toHaveAttribute('tabindex', '-1');

	// the summary: the week total, no weekly limit (the mock's employee carries none), today, the billable share and money
	await expect(weekFigureOf(page)).toHaveText(copy('dashboard.myWeek.TRACKED_THIS_WEEK'));
	await expect(summaryOf(page)).toContainText(durationOf(tracked));
	await expect(summaryOf(page)).toContainText(EN.dashboard.myWeek.NO_LIMIT);
	await expect(summaryOf(page)).toContainText(`${EN.common.TODAY}${durationOf(todaySeconds)}`);
	await expect(summaryOf(page)).toContainText(EN.dashboard.timesheets.BILLABLE);
	await expect(summaryOf(page)).toContainText(`${percentOf(billable, tracked)}${durationOf(billable)}`);
	await expect(summaryOf(page)).toContainText(
		copy('dashboard.timeActivity.figures.BILLABLE_TIME', { duration: durationOf(billable) })
	);
	await expect(summaryOf(page)).toContainText(EN.dashboard.timeActivity.columns.BILLABLE);
	await expect(summaryOf(page)).toContainText(plan.amountTextOf(entries));
	// the rates note is not printed text: it rides in the amount's `title` (`my-week-summary.tsx:158-187`, `probe2.log` A)
	await expect(summaryOf(page).getByTitle(EN.dashboard.myWeek.BILLABLE_RATES_HINT)).toBeVisible();

	// the day totals: the chart's sr-only table, one row per day of the shown week
	await expect.poll(() => textsOf(dayTableOf(page).locator('tr'))).toEqual(plan.weekDayRowsOf(week, entries));

	// the project shares, each row `percent name duration`; the teammate's 2 h is not the member's, last week's 4 h is not this week's
	await expect.poll(() => rowsOf(projectsOf(page))).toEqual(plan.projectRowsOf(entries));
	await expect(metaOf(projectsOf(page))).toHaveText(
		copy('dashboard.team.projects.COUNT', {
			count: new Set(entries.filter((entry) => entry.projectId).map((entry) => String(entry.projectId))).size
		})
	);

	// the recent entries as printed: newest first, the day word, the clock pair, the duration
	await expect.poll(() => rowsOf(recentOf(page))).toEqual(plan.recentRowsOf(entries));
	await expect(metaOf(recentOf(page))).toHaveText(copy('dashboard.calendar.ENTRY_COUNT', { count: entries.length }));

	/* the reads. The week is read twice, once before the labels answer and once with it (header finding 1); both carry
	   the same widened range, the member's own employee and the browser's zone. */
	await expect.poll(() => served.weekReads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
	const zone = await zoneOf(page);
	const widened = widenedOf(week);
	const expectedParams = {
		'activityLevel[start]': '0',
		'activityLevel[end]': '100',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		startDate: widened.startDate,
		endDate: widened.endDate,
		timeZone: zone,
		'employeeIds[0]': fixture.ids.employee
	};
	const relationsOf = (params: Record<string, string>) =>
		Object.keys(params)
			.filter((name) => name.startsWith('relations['))
			.sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
			.map((name) => params[name]);
	const shapes: string[][] = [];
	for (const read of served.weekReads()) {
		const rest = Object.fromEntries(Object.entries(read.params).filter(([name]) => !name.startsWith('relations[')));
		expect(rest, `the week read ${read.search}`).toEqual(expectedParams);
		const relations = relationsOf(read.params);
		expect(relations.length, `the relations of ${read.search}`).toBeLessThanOrEqual(TIMESHEET_RELATIONS.length + 1);
		expect(relations.slice(0, TIMESHEET_RELATIONS.length), `the relations of ${read.search}`).toEqual(
			TIMESHEET_RELATIONS
		);
		shapes.push(relations);
	}
	expect(
		[...new Set(shapes.map((relations) => relations.join(',')))].sort(),
		'two shapes only: the read before the labels answer and the read after it'
	).toEqual([TIMESHEET_RELATIONS.join(','), [...TIMESHEET_RELATIONS, 'tags'].join(',')]);
	expect(
		[
			...new Set(served.weekReads().map((read) => `${read.params['startDate']} → ${read.params['endDate']}`))
		].sort(),
		'the page read exactly one range'
	).toEqual([`${widened.startDate} → ${widened.endDate}`]);

	// the billed (kept-rates) read: the period's own instants, not the widened ones (`time-log-report.service.ts:51-63`)
	await expect.poll(() => served.billableReads().length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
	const billableRead = served.billableReads()[0];
	expect(Object.fromEntries(new URLSearchParams(billableRead.search))).toEqual({
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA,
		startDate: iso(week.from),
		endDate: iso(week.to),
		timeZone: zone,
		'employeeIds[0]': fixture.ids.employee,
		billableOnly: 'true',
		withClientRates: 'true'
	});

	// one rates read per project of the week (`rate.service.ts:42-49`)
	await expect
		.poll(
			() =>
				served
					.rateReads()
					.map((read) => read.path)
					.sort(),
			{ timeout: 20_000 }
		)
		.toEqual(
			[
				`/api/organization-projects/${fixture.ids.project}/rates`,
				`/api/organization-projects/${PROJECT_B_ID}/rates`
			].sort()
		);
	for (const read of served.rateReads()) {
		expect(Object.fromEntries(new URLSearchParams(read.search))).toEqual({
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA
		});
	}

	expect(consoleFindings(shield), 'a clean week logs nothing').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

test('the period switch: the range each choice reads, what each one prints, and that goals belong to this week', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const lastWeek = localWeek(-1);
	const month = localMonth();
	const rates = ratesFor(fixture);
	const logs = weekLogs(fixture, week);
	const goals = [
		{
			id: 'goal-week',
			name: 'Probe weekly goal',
			comparison: 'AT_LEAST',
			targetHours: 20,
			period: 'WEEK',
			scope: 'EMPLOYEE',
			employeeId: fixture.ids.employee,
			isArchived: false
		}
	];
	const progress = [
		{
			goalId: 'goal-week',
			goal: goals[0],
			employeeId: fixture.ids.employee,
			period: 'WEEK',
			startDate: iso(week.from),
			endDate: iso(week.to),
			timeZone: 'UTC',
			trackedSeconds: 12 * HOUR,
			targetSeconds: 20 * HOUR,
			state: 'IN_PROGRESS'
		}
	];
	const served = await serveMyWeek(page, { logs, billable: [], rates, goals, progress });
	await signInAndVisit(page, fixture, PAGE);
	const plan = planOf(fixture, logs, rates);

	await expect(weekFigureOf(page)).toHaveText(copy('dashboard.myWeek.TRACKED_THIS_WEEK'));
	await expect(goalsOf(page)).toBeVisible();

	// Last week: its own range, its own title, and no Today figure (the period does not hold today)
	await tabOf(page, EN.common.LAST_WEEK).click();
	await expect(metaLineOf(page)).toHaveText(periodLabel(lastWeek));
	await expect(weekFigureOf(page)).toHaveText(copy('dashboard.myWeek.TRACKED_LAST_WEEK'));
	await expect(summaryOf(page)).toContainText(durationOf(plan.secondsOf(plan.within(lastWeek))));
	await expect(summaryOf(page)).not.toContainText(EN.common.TODAY);
	await expect(goalsOf(page)).toHaveCount(0);
	await expect
		.poll(() => served.weekReads().map((read) => `${read.params['startDate']} → ${read.params['endDate']}`), {
			timeout: 30_000
		})
		.toContain(`${widenedOf(lastWeek).startDate} → ${widenedOf(lastWeek).endDate}`);

	// This month: the month's own range, the month's own total, goals still away
	await tabOf(page, EN.common.THIS_MONTH).click();
	await expect(metaLineOf(page)).toHaveText(periodLabel(month));
	await expect(weekFigureOf(page)).toHaveText(copy('dashboard.myWeek.TRACKED_THIS_MONTH'));
	await expect(summaryOf(page)).toContainText(durationOf(plan.secondsOf(plan.within(month))));
	await expect(goalsOf(page)).toHaveCount(0);
	await expect
		.poll(() => served.weekReads().map((read) => `${read.params['startDate']} → ${read.params['endDate']}`), {
			timeout: 30_000
		})
		.toContain(`${widenedOf(month).startDate} → ${widenedOf(month).endDate}`);

	// back to this week: the switch is the only state, the reads are the same period reads
	await tabOf(page, EN.common.THIS_WEEK).click();
	await expect(metaLineOf(page)).toHaveText(periodLabel(week));
	await expect(goalsOf(page)).toBeVisible();
	expect(
		[
			...new Set(served.weekReads().map((read) => `${read.params['startDate']} → ${read.params['endDate']}`))
		].sort(),
		'the three choices read exactly their three ranges'
	).toEqual(
		[
			`${widenedOf(week).startDate} → ${widenedOf(week).endDate}`,
			`${widenedOf(lastWeek).startDate} → ${widenedOf(lastWeek).endDate}`,
			`${widenedOf(month).startDate} → ${widenedOf(month).endDate}`
		].sort()
	);
	await expect
		.poll(() => served.progressReads().length, { message: 'the progress read of this week’s goals was sent' })
		.toBeGreaterThanOrEqual(1);
	expect(consoleFindings(shield), 'the switch logs nothing').toEqual([]);
});

test('an empty week says so, points to the timer, and points nowhere for a week that is not the current one', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const lastWeek = localWeek(-1);
	await serveMyWeek(page, { logs: [] });
	await signInAndVisit(page, fixture, PAGE);

	await expect(metaLineOf(page)).toHaveText(periodLabel(week));
	await expect(page.getByText(copy('dashboard.myWeek.EMPTY_THIS_WEEK'), { exact: true })).toBeVisible();
	await expect(page.getByText(copy('dashboard.myWeek.EMPTY_HINT'), { exact: true })).toBeVisible();
	// the empty state's own link, and where it leads: the timer on the home page (`my-week-page.tsx:30 TIMER_PATH = '/'`)
	const timerLink = page.getByRole('link', { name: EN.dashboard.myWeek.OPEN_TIMER, exact: true });
	await expect(timerLink).toHaveAttribute('href', '/');
	await expect(projectsOf(page)).toHaveCount(0);
	await expect(recentOf(page)).toHaveCount(0);
	await expect(goalsOf(page)).toHaveCount(0);

	// a period that holds no today says the same words for itself and offers no timer
	await tabOf(page, EN.common.LAST_WEEK).click();
	await expect(metaLineOf(page)).toHaveText(periodLabel(lastWeek));
	await expect(page.getByText(copy('dashboard.myWeek.EMPTY_LAST_WEEK'), { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: EN.dashboard.myWeek.OPEN_TIMER, exact: true })).toHaveCount(0);

	expect(consoleFindings(shield), 'an empty week logs nothing').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/** `formatHoursLabel` as the goal row writes it: whole hours are `2h`, `20h` (`goals/goal-row.tsx:39-40,79`). */
const hoursLabelOf = (seconds: number) => (seconds % HOUR === 0 ? `${seconds / HOUR}h` : durationOf(seconds));

/** One `GoalProgressRow` (`goals/goal-row.tsx:71-121`): name, state, rule, the sr-only figure, hours against target, percent, gap. */
const goalRowTextOf = (
	goal: { name: string; comparison: string; targetHours: number },
	row: { period: string; state: string; trackedSeconds: number; targetSeconds: number }
) => {
	const isAtMost = goal.comparison === 'AT_MOST';
	const tracked = durationOf(row.trackedSeconds);
	const target = hoursLabelOf(row.targetSeconds);
	const gapSeconds = isAtMost ? row.trackedSeconds - row.targetSeconds : row.targetSeconds - row.trackedSeconds;
	const gapKey = isAtMost ? (gapSeconds > 0 ? 'OVER_LIMIT' : 'LEFT') : gapSeconds > 0 ? 'TO_GO' : 'TARGET_REACHED';
	return [
		goal.name,
		copy(`dashboard.goals.state.${row.state}`),
		copy(`dashboard.goals.rule.${isAtMost ? 'AT_MOST' : 'AT_LEAST'}_${row.period}`, { hours: target }),
		copy('dashboard.goals.FIGURE', { tracked, target }),
		`${tracked} / ${target}`,
		percentOf(row.trackedSeconds, row.targetSeconds),
		copy(`dashboard.goals.gap.${gapKey}`, { duration: durationOf(Math.abs(gapSeconds)) })
	].join('');
};

const goalOf = (
	fixture: Fixture,
	goal: { id: string; name: string; comparison: 'AT_LEAST' | 'AT_MOST'; targetHours: number; period: 'DAY' | 'WEEK' }
) => ({
	...goal,
	scope: 'EMPLOYEE',
	employeeId: fixture.ids.employee,
	isArchived: false
});

test('served goals and their progress: the state, the rule, the hours against the target, and where All goals leads', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const goals = [
		goalOf(fixture, {
			id: 'goal-week',
			name: 'Probe weekly goal',
			comparison: 'AT_LEAST',
			targetHours: 20,
			period: 'WEEK'
		}),
		goalOf(fixture, {
			id: 'goal-day',
			name: 'Probe daily cap',
			comparison: 'AT_MOST',
			targetHours: 2,
			period: 'DAY'
		})
	];
	const progress = [
		{
			goalId: 'goal-week',
			goal: goals[0],
			employeeId: fixture.ids.employee,
			period: 'WEEK',
			startDate: iso(week.from),
			endDate: iso(week.to),
			timeZone: 'UTC',
			trackedSeconds: 12 * HOUR,
			targetSeconds: 20 * HOUR,
			state: 'IN_PROGRESS'
		},
		{
			goalId: 'goal-day',
			goal: goals[1],
			employeeId: fixture.ids.employee,
			period: 'DAY',
			startDate: iso(week.from),
			endDate: iso(week.to),
			timeZone: 'UTC',
			trackedSeconds: 2.5 * HOUR,
			targetSeconds: 2 * HOUR,
			state: 'EXCEEDED'
		}
	];
	const served = await serveMyWeek(page, {
		logs: weekLogs(fixture, week),
		billable: [],
		rates: ratesFor(fixture),
		goals,
		progress
	});
	await signInAndVisit(page, fixture, PAGE);

	await expect(goalsOf(page)).toBeVisible();
	// `GOAL_PERIODS` order — day, then week, then month (`core/lib/utils/time-goals.ts:19-23`, used at `use-my-week-goals.ts:22-25`)
	await expect
		.poll(() => rowsOf(goalsOf(page)))
		.toEqual([goalRowTextOf(goals[1], progress[1]), goalRowTextOf(goals[0], progress[0])]);
	await expect(goalsOf(page).getByRole('link', { name: EN.dashboard.goals.ALL_GOALS, exact: true })).toHaveAttribute(
		'href',
		'/goals'
	);

	const scope = { organizationId: fixture.ids.organizationA, tenantId: fixture.ids.tenantA };
	await expect.poll(() => served.goalReads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
	expect(Object.fromEntries(new URLSearchParams(served.goalReads()[0].search))).toEqual({
		...scope,
		includeArchived: 'true'
	});
	// the progress read is enabled only once the goals answered non-empty (`use-my-week-goals.ts:19`)
	await expect.poll(() => served.progressReads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
	expect(Object.fromEntries(new URLSearchParams(served.progressReads()[0].search))).toEqual(scope);

	expect(consoleFindings(shield), 'goals log nothing').toEqual([]);
});

test('no goals answered: the goals block stays away, and its progress read is never sent', async ({
	page,
	fixture,
	shield
}) => {
	const served = await serveMyWeek(page, {
		logs: weekLogs(fixture, localWeek(0)),
		billable: [],
		rates: ratesFor(fixture),
		goals: [],
		progress: []
	});
	await signInAndVisit(page, fixture, PAGE);

	await expect(summaryOf(page)).toBeVisible();
	await expect(goalsOf(page)).toHaveCount(0);
	// the goals read has answered (`[]`) before the window opens, so a progress read would already be on its way
	await expect.poll(() => served.goalReads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
	// a quiet window (1,5 s) that proves the progress read is not sent for a member with no goal
	await page.waitForTimeout(1_500);
	expect(served.progressReads(), 'no goal answered, so no progress read').toEqual([]);
	expect(consoleFindings(shield), 'no goals logs nothing').toEqual([]);
});

test('the rate admin pays the project rates for its billed time; a caller with no permissions answered sends neither read', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const rates = ratesFor(fixture);
	const logs = weekLogs(fixture, week);
	const served = await serveMyWeek(page, { logs, billable: [], rates });
	await signInAndVisit(page, fixture, PAGE);
	const plan = planOf(fixture, logs, rates);
	const entries = plan.within(week);
	const scope = { organizationId: fixture.ids.organizationA, tenantId: fixture.ids.tenantA };

	// the admin half: the fixture role already holds ORG_EMPLOYEES_EDIT (`mock-gauzy-server.mjs:50`, `rates.ts:11`)
	await expect.poll(() => served.rateReads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
	expect(
		served
			.rateReads()
			.map((read) => `${read.path}?${new URLSearchParams(read.search).toString()}`)
			.sort(),
		'one rates read per project of the week (sent in parallel, so compared sorted), scoped as `rate.service.ts:42-49` sends it'
	).toEqual(
		[
			...Object.keys(rates).map(
				(projectId) => `/api/organization-projects/${projectId}/rates?${new URLSearchParams(scope).toString()}`
			)
		].sort()
	);
	await expect.poll(() => served.billableReads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
	expect(Object.fromEntries(new URLSearchParams(served.billableReads()[0].search))).toEqual({
		...scope,
		startDate: iso(week.from),
		endDate: iso(week.to),
		timeZone: await zoneOf(page),
		'employeeIds[0]': fixture.ids.employee,
		billableOnly: 'true',
		withClientRates: 'true'
	});
	await expect(summaryOf(page)).toContainText(plan.amountTextOf(entries));

	// the other half: no permissions answered at all (`finding 4`), the same arm as reports-gate-by-role-ui.spec.ts
	const callsBefore = served.calls.length;
	const readsBefore = served.weekReads().length;
	await signInAndVisit(page, fixture, PAGE, { scenario: { fails: { '/api/role-permissions/me': 500 } } });
	await expect(summaryOf(page)).toBeVisible();
	await expect.poll(() => served.weekReads().length, { timeout: 30_000 }).toBeGreaterThan(readsBefore);
	// a quiet window (1,5 s) that proves neither the rates read nor the billed read arrives for that caller
	await page.waitForTimeout(1_500);
	const after = served.calls.slice(callsBefore);
	expect(
		after.filter((call) => call.path.endsWith('/rates')),
		'no permissions, no rates read'
	).toEqual([]);
	expect(
		after.filter((call) => call.params['billableOnly'] === 'true'),
		'no permissions, no billed read'
	).toEqual([]);
	await expect(summaryOf(page)).not.toContainText(EN.dashboard.timeActivity.columns.BILLABLE);

	expect(
		consoleFindings(shield, [armedHttpError('GET', '/role-permissions/me', 500)]),
		'only the refusal this file armed is logged'
	).toEqual([]);
});

test('a recent entry starts the timer and stops it again: the start body, the shell’s timer, the stop body', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	await serveMyWeek(page, { logs: weekLogs(fixture, week), billable: [], rates: ratesFor(fixture) });
	const calls = recordCalls(page);
	const bodyOf = (path: string) => calls.calls.find((call) => call.path === path)?.body ?? null;
	await signInAndVisit(page, fixture, PAGE);
	// the plan and estimate modals would sit on top of the start button (`suites/mock/timer-mutation.spec.ts:72-80`);
	// the date is the UTC one on purpose: the handler compares `new Date().toISOString().split('T')[0]`
	// (`core/hooks/activities/use-start-stop-timer-handler.ts:96`)
	await page.evaluate(
		(today) => {
			window.localStorage.setItem('daily-plan-suggestion-modal-date', today);
			window.localStorage.setItem('tasks-estimate-hours-modal-date', today);
			window.localStorage.setItem('daily-plan-estimate-hours-modal', today);
		},
		iso(new Date()).slice(0, 10)
	);

	/* The row is picked by the task its entry names — never by "the row that has a Start button", because that filter
	   moves to another row the moment this one's button flips (a `ssr: false` chunk, `my-week-recent-entries.tsx:131`,
	   so the button itself is awaited through its own attribute). */
	const trackableRow = recentOf(page).locator('li').filter({ hasText: fixture.names.task }).first();
	const startButton = trackableRow.getByRole('button', { name: EN.hotkeys.START_TIMER, exact: true });
	await expect(startButton).toHaveAttribute('aria-disabled', 'false', { timeout: 30_000 });
	await startButton.click({ timeout: 15_000 });

	await expect.poll(() => bodyOf(TIMER_START_PATH), { timeout: 30_000 }).not.toBeNull();
	expect(JSON.parse(bodyOf(TIMER_START_PATH) ?? '{}'), 'the start the page sent').toEqual({
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA,
		taskId: fixture.ids.task,
		projectId: fixture.ids.project,
		logType: 'TRACKED',
		source: 'TEAMS',
		tags: [],
		isBillable: false,
		organizationTeamId: fixture.ids.teamA,
		// the start always names the plan day it belongs to: `getTodayPlanDay()` = the browser's own today
		// (`core/lib/helpers/daily-plan-day.ts:21`, sent at `core/services/client/api/timers/timer.service.ts:121,135`)
		planDay: dayKeyOf(new Date())
	});
	await mockStateWhen<{ mutationProof: Record<string, boolean> }>(
		(state) => state.mutationProof.startedTimer === true
	);
	// the shell's own timer bar took the run (`timer/timer-button.tsx:51-79`)
	await expect(page.getByRole('button', { name: EN.hotkeys.STOP_TIMER }).first()).toBeVisible({ timeout: 30_000 });
	// finding 3: the row's button flips once the shell's active task is that task (`use-timer-button.ts:37-40`)
	await expect(trackableRow.getByRole('button', { name: EN.hotkeys.STOP_TIMER, exact: true })).toBeVisible({
		timeout: 30_000
	});
	await expect
		.poll(
			() => {
				const write = calls.calls.find((call) => call.method === 'PUT' && call.path.includes('/active-task'));
				return write ? JSON.parse(write.body ?? '{}') : undefined;
			},
			{ message: 'the run made this task the active one of the shell', timeout: 30_000 }
		)
		.toEqual({
			organizationId: fixture.ids.organizationA,
			activeTaskId: fixture.ids.task,
			organizationTeamId: fixture.ids.teamA,
			tenantId: fixture.ids.tenantA
		});

	await trackableRow.getByRole('button', { name: EN.hotkeys.STOP_TIMER, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => bodyOf(TIMER_STOP_PATH), { timeout: 30_000 }).not.toBeNull();
	expect(JSON.parse(bodyOf(TIMER_STOP_PATH) ?? '{}'), 'the stop the page sent').toEqual({
		source: 'TEAMS',
		logType: 'TRACKED',
		taskId: fixture.ids.task,
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	await mockStateWhen<{ scenario: Record<string, unknown> }>((state) => state.scenario.timerRunning === false);

	expect(consoleFindings(shield), 'a start and a stop log nothing').toEqual([]);
});

test('a refused week read: the error notice, the page without its body, and Try again sending the read again', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const served = await serveMyWeek(page, {
		logs: weekLogs(fixture, week),
		billable: [],
		rates: ratesFor(fixture),
		refusals: { [LOGS_PATH]: 500 }
	});
	await signInAndVisit(page, fixture, PAGE);

	await expect(headingOf(page)).toBeVisible();
	await expect(metaLineOf(page)).toHaveText(periodLabel(week));
	await expect(page.getByText(EN.dashboard.states.ERROR_TITLE, { exact: true })).toBeVisible();
	await expect(page.getByText(EN.dashboard.states.ERROR_MESSAGE, { exact: true })).toBeVisible();
	// with no data behind it the read's refusal replaces the whole body (`my-week-page.tsx:107` ahead of `:112`)
	await expect(summaryOf(page)).toHaveCount(0);
	await expect(projectsOf(page)).toHaveCount(0);
	await expect(recentOf(page)).toHaveCount(0);
	await expect(goalsOf(page)).toHaveCount(0);

	await expect.poll(() => served.weekReads().length, { timeout: 30_000 }).toBeGreaterThan(0);
	const tryAgain = page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true });
	await expect(tryAgain).toBeVisible();
	// a failing query is retried by itself, so this proves only that another read followed the click
	const beforeTheClick = served.weekReads().length;
	await tryAgain.click({ timeout: 15_000 });
	await expect.poll(() => served.weekReads().length, { timeout: 30_000 }).toBeGreaterThan(beforeTheClick);
	await expect(page.getByText(EN.dashboard.states.ERROR_TITLE, { exact: true })).toBeVisible();

	expect(
		consoleFindings(shield, [armedHttpError('GET', '/timesheet/time-log', 500)]),
		'only the refusal this file armed is logged'
	).toEqual([]);
});

test('a refused goals read: the goals block stays away and the rest of the week is intact', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const goal = goalOf(fixture, {
		id: 'goal-week',
		name: 'Probe weekly goal',
		comparison: 'AT_LEAST',
		targetHours: 20,
		period: 'WEEK'
	});
	const served = await serveMyWeek(page, {
		logs: weekLogs(fixture, week),
		billable: [],
		rates: ratesFor(fixture),
		goals: [goal],
		// its progress row is served too: without the refusal below the block would show (test 4), so its absence is the refusal's
		progress: [
			{
				goalId: goal.id,
				goal,
				employeeId: fixture.ids.employee,
				period: 'WEEK',
				startDate: iso(week.from),
				endDate: iso(week.to),
				timeZone: 'UTC',
				trackedSeconds: 12 * HOUR,
				targetSeconds: 20 * HOUR,
				state: 'IN_PROGRESS'
			}
		],
		refusals: { [GOALS_PATH]: 500 }
	});
	await signInAndVisit(page, fixture, PAGE);

	await expect(summaryOf(page)).toBeVisible();
	await expect(projectsOf(page)).toBeVisible();
	await expect(recentOf(page)).toBeVisible();
	// a goals read that failed is not "no goals": `use-time-goals.ts:68-85` leaves the availability unknown, so the block stays away
	await expect(goalsOf(page)).toHaveCount(0);
	await expect.poll(() => served.goalReads().length, { timeout: 30_000 }).toBeGreaterThan(0);

	expect(
		consoleFindings(shield, [armedHttpError('GET', '/time-goals', 500)]),
		'only the armed goals refusal'
	).toEqual([]);
});

test('an entry that crosses midnight stays on the day it started on, in the zone the page counts its days in', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const rates = ratesFor(fixture);
	// Tuesday of the shown week, 23:30, one and a half hours: its midnight half lands on Wednesday, still inside the week
	const startedAt = dayOf(week, 1, 23, 30);
	const logs = [
		logOf(fixture, {
			id: 'crossing-midnight',
			date: startedAt,
			seconds: 90 * 60,
			projectId: fixture.ids.project,
			projectName: 'Probe first project'
		})
	];
	const served = await serveMyWeek(page, { logs, billable: [], rates });
	await signInAndVisit(page, fixture, PAGE);
	const plan = planOf(fixture, logs, rates);
	const entries = plan.within(week);

	await expect(metaLineOf(page)).toHaveText(periodLabel(week));
	await expect(summaryOf(page)).toContainText(durationOf(plan.secondsOf(entries)));
	await expect(summaryOf(page)).toContainText(
		`${EN.common.TODAY}${durationOf(plan.secondsOf(entries.filter((entry) => entry.dayKey === dayKeyOf(new Date()))))}`
	);

	// the whole entry on its starting day; the day it spilled into stays at nothing
	const dayRows = plan.weekDayRowsOf(week, entries);
	await expect.poll(() => textsOf(dayTableOf(page).locator('tr'))).toEqual(dayRows);
	const nextDay = new Date(startedAt);
	nextDay.setDate(nextDay.getDate() + 1);
	expect(dayRows, 'the midnight half did not move to the next day').toContain(`${dayLabel(nextDay)}0h 0m`);
	await expect.poll(() => rowsOf(recentOf(page))).toEqual(plan.recentRowsOf(entries));

	// the read is built in the browser's own zone, not in the mock organization's 'UTC' (`date-and-time.ts:313`)
	await expect.poll(() => served.weekReads().length, { timeout: 30_000 }).toBeGreaterThan(0);
	const zone = await zoneOf(page);
	for (const read of served.weekReads()) {
		expect(read.params['timeZone'], `the read ${read.search}`).toBe(zone);
	}
	expect(consoleFindings(shield), 'an entry over midnight logs nothing').toEqual([]);
});

test('a reload keeps no period: the page is back on this week and reads it again', async ({
	page,
	fixture,
	shield
}) => {
	const week = localWeek(0);
	const lastWeek = localWeek(-1);
	const served = await serveMyWeek(page, { logs: weekLogs(fixture, week), billable: [], rates: ratesFor(fixture) });
	await signInAndVisit(page, fixture, PAGE);

	await tabOf(page, EN.common.LAST_WEEK).click({ timeout: 15_000 });
	await expect(metaLineOf(page)).toHaveText(periodLabel(lastWeek));
	await expect(tabOf(page, EN.common.LAST_WEEK)).toHaveAttribute('aria-selected', 'true');
	const beforeTheReload = served.weekReads().length;

	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForShellReady(page);

	// finding 2: the period is `useState` (`use-my-week-page.ts:106`) — a reload is the page starting over
	await expect(metaLineOf(page)).toHaveText(periodLabel(week));
	await expect(tabOf(page, EN.common.THIS_WEEK)).toHaveAttribute('aria-selected', 'true');
	await expect(summaryOf(page)).toBeVisible();
	await expect(projectsOf(page)).toBeVisible();
	await expect(recentOf(page)).toBeVisible();
	await expect.poll(() => served.weekReads().length, { timeout: 30_000 }).toBeGreaterThan(beforeTheReload);
	const remembered = await page.evaluate(() => Object.keys(window.localStorage));
	expect(
		remembered.some((key) => /week|period|my-week/i.test(key)),
		`nothing in localStorage names the period (${remembered.join(', ')})`
	).toBe(false);

	expect(consoleFindings(shield), 'a reload logs nothing').toEqual([]);
});
