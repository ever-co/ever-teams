import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a manager sees on **Dashboards › Team dashboard** (`/dashboard/team-dashboard/<teamId>`,
 * `app/[locale]/(main)/dashboard/team-dashboard/[teamId]/page.tsx` → `core/components/dashboards/team/team-dashboard-page.tsx:28-77`),
 * on lane-b (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, statistics `3997`, control `3998`,
 * `playwright/test-servers.ts`).
 *
 * **Which layer is real and which is served.** The shell, the team roster, the tasks board, the daily plan and the
 * timer come from the lane's mock (`cypress/support/mock-gauzy-server.mjs`) exactly as it answers them. The three
 * period reads — the daily report, `statistics/counts` and the time logs — are answered by this file on the mock
 * origin (`page.route`; the mock has no handler that could produce the figures pinned here), restating the mock's own
 * CORS answer and answering `OPTIONS` with 204 exactly like `mock-gauzy-server.mjs:1087-1101`. No stub ever calls
 * `route.fetch()`, so an answer can only be the one this file wrote.
 *
 * **Where every number came from.** Throwaway probes on this lane, logs `E:/Coding/.tmp/s3-lane-b-teamdashboard-probe-1.log`
 * … `-12.log`: the mock-only page and its reads (`-1` P1, `-8` S1); the served figures, chart rows, legend, split,
 * heatmap cells, day-timeline blocks, members rows and the member sheet (`-4` Q10/Q1/Q2, `-11` T1); the tasks card
 * with served tasks (`-5` Q3); a refused daily read, a refused logs read, a refused counts read, a foreign team id and
 * the narrowed reads (`-5` Q4/Q5/Q6/Q7/Q8); the period picker, its presets, the granularity tabs, a custom range and
 * the refused teams list (`-3` P4, `-8` S2/S3/S4); the filter flow end to end (`-6` R1, `-7` R8, `-10` S6, `-5` Q8);
 * and `-12` T2,
 * which re-measured the hour cells together with every request the page makes. Each test prints what it asserted as a
 * `[lane-b team-dashboard] MEASURE …` line.
 *
 * **Dates.** Nothing pins today: the served days are today, today − 1 and today − 2 in local calendar days, and every
 * expected label, period window and file name is counted by `clockOf` on the Node side, in the zone that process
 * resolved. Test 1 then asserts the browser resolved the very same zone, because the served rows and the period
 * windows the page sends have to be counted in one calendar; neither zone is ever hard-coded here.
 *
 * **Never pinned:** the live "now" line of the day timeline and of the member sheet (measured `8:34 AM`, `8:47 AM`,
 * `8:58 AM`, `8:59 AM` across the probes — it is the clock), and anything about a running timer (the lane mock
 * answers none for this person).
 *
 * ## What this page is built from
 *
 * `team-dashboard-page.tsx:55-74` renders seven subjects, each once: `TeamFigures` (`team-figures.tsx`, four cards
 * titled `dashboard.team.figures.TRACKED_TODAY` / `WORKING_NOW` / `THIS_PERIOD` / `TEAM_TASKS`), `TeamTimeByDay`
 * (`team-time-by-day.tsx`), `TeamHourHeatmap` (`team-hour-heatmap.tsx`), `TeamDayTimeline` (`team-day-timeline.tsx`,
 * card titled `dashboard.team.timeline.TITLE` "Today"), `TeamTasksByStatus` (`team-tasks-status.tsx`), `TeamTimeSplit`
 * (`team-time-split.tsx`, titled `dashboard.team.projects.TITLE`) and `TeamMembersTable` (`team-members-table.tsx`,
 * which owns the sheet `team-member-sheet.tsx:246`). The toolbar is `team-toolbar.tsx`: filter menu (`:49-79`),
 * applied-filter chips and Clear filters (`:137-150`), period meta (`:155-176`), export menu (`:215`) and
 * `PeriodPicker` (`core/components/dashboards/kit/period-picker.tsx`).
 *
 * Components in `core/components/dashboards/team/` that **no route to this page renders**, so nothing here can reach
 * them: `team-pulse-tiles.tsx`, `team-roster.tsx`, `team-roster-sort.tsx` (imported only by `team-roster.tsx:14`),
 * `team-table.tsx`, `team-overview.tsx`, `team-right-now.tsx`, `team-today-plan.tsx`, `team-recent-card.tsx`,
 * `team-recent-work.tsx` (imported only by `team-recent-card.tsx`), `team-time-by-project.tsx` and `team-day-card.tsx`
 * (imported only by `team-roster.tsx:12`). `team-period.tsx`'s own `TeamPeriod` card is unreachable too — only
 * `SplitControl`, `legendEntriesOf`, `focusedKeyOf`, `PeriodSplit` and `stacksOfSplit` are imported from it
 * (`team-time-by-day.tsx:19-25`) — and `team-top-project-chip.tsx` is imported only by `team-member-card.tsx:21` and
 * `team-marks.test.tsx:11`, while this page reaches `team-member-card.tsx` solely for `MicroColumns`
 * (`team-member-sheet.tsx:26`). `dashboard.team.period.BY_PROJECT` "By project" and `dashboard.team.table.BY_MEMBER`
 * "By member" therefore never appear on this page.
 *
 * ## Findings
 *
 * 1. **The toolbar's member part is a second read.** `ToolbarMeta` (`team-toolbar.tsx:155-176`) prints the period
 *    text always and `dashboard.team.META_MEMBERS` only when `memberCountOf(counts?.employeesCount)` is a number. The
 *    mock's `GET /timesheet/time-log/statistics/counts` answer carries no `employeesCount`, so with the mock alone the
 *    meta line is the period text only (measured `["Nov 19 – 25"]`, `-8` S1) and becomes `Nov 19 – 25 · 3 members` as
 *    soon as `employeesCount` is served (`-8` S2, `-10` S6).
 * 2. **A manager of the whole organization sends no team and no member filter.** The daily and counts reads carry
 *    `organizationId` + `tenantId` only — no `teamIds[…]`, no `employeeIds[…]`, no `includeTimeWithoutTeam` (`-2` P2,
 *    `-5` Q8) — while the time-log read carries all three employee ids of the roster. Picking a team adds
 *    `teamIds[0]` **and** `includeTimeWithoutTeam=true` to the daily read and `teamIds[0]` to the counts read (`-7`
 *    R8, `-10` S6); picking a member adds `employeeIds[0]` to all three (`-5` Q8). The two reads number their
 *    relations (`relations[0]=project`, …) while the teams list repeats an unnumbered key — `relations[]=members`,
 *    `relations[]=members.role`, … — so its recorded query holds one key with eight values.
 * 3. **The "N open" of the tasks card is every task that is not done.** `taskGroupCountsOf`
 *    (`core/lib/utils/dashboards/team.ts:1903-1914`) adds every non-`done` group into `counts.open`, and the card meta
 *    is `dashboard.team.tasks.OPEN_COUNT` of that value (`team-tasks-status.tsx:147`). With one `open` and one
 *    `in-progress` task served the card read `2 open` while its status rows were `open 1 50%` and `in progress 1 50%`
 *    (`-5` Q3) — the in-progress task counts as "open" there, and on the figures card as well.
 * 4. **Status labels are lowercase in the DOM.** `statusLabelOf` (`team-task-lanes.tsx:40-43`) turns the mock's
 *    `in-progress` into `in progress`, and the row heading is `capitalize`d by CSS (`team-tasks-status.tsx:196`), so
 *    `textContent` reads `in progress150%` while the screen shows `In Progress`. Every status assertion below compares
 *    DOM text, not rendered text.
 * 5. **"Tracked today" comes from the team read, not from the logs read.** It is `todayTotalSecondsOf(liveMembers)`
 *    (`core/hooks/dashboards/team/use-team-live-board.ts:124`), which sums each member record's `totalTodayTasks`
 *    (`core/lib/utils/dashboards/team.ts:1323-1329`) — by design: the comment at `:1322` calls it "the sum the team
 *    home cards show". The mock's employee fixture answers `totalTodayTasks: []` (`mock-gauzy-server.mjs:137-170`)
 *    while this file serves today's logs, so here the two sources disagree: with 2h 30m of today's logs served the
 *    figure stays `0h 0m` while the day timeline says `2h 30m tracked` (`-4` Q10), and the members table's `Today`
 *    column, which uses the same helper, prints `–` for every member (`-2` P2, `-4` Q10). A real server fills both
 *    from the same tracked time; that disagreement is this lane's served data, not a page defect, so it is untagged.
 * 6. **The line under "Tracked today" follows the picked members.** With nobody picked the mock's plan answers and the
 *    card shows the share of it → `0h 0m0%` (`-1` P1); after a member is picked the plan read answers for that member
 *    and the card shows `dashboard.team.today.NO_PLAN` → `0h 0mNo plan today` (`-5` Q8, `-10` S6).
 * 7. **The period figures are the answer, not the filter.** This file answers every variant of the daily read with the
 *    same rows, so after a member is picked `This period` still reads `5h 15m over 3 days · 2 members` and `Where the
 *    time went` still reads `3 projects`, while the roster-driven cards do narrow (`Working now 0 of 1`, one member
 *    row, `Tasks by status` down to `dashboard.team.tasks.EMPTY`) (`-5` Q8). Test 12 pins the query shape and the
 *    cards that follow it, and nothing else. On the day timeline the picked member's lane is named from the roster
 *    while a filtered-out member keeps the name its log answer carried (`Served Name A`), and its `not started today`
 *    line follows the picked roster — with one member picked and that member working, the line is gone (run log `-2`).
 *    `dashboard.team.UNNAMED_MEMBER` only stands in when an answer carries no member at all (measured that way in
 *    `-5` Q8, whose served logs carried no member node).
 * 8. **`No team` counts as a project in `Where the time went`.** `namedSplitCountOf`
 *    (`core/lib/utils/dashboards/time-split.ts:188-190`) counts the groups that hold time and are named: the
 *    without-team pseudo-group is named (`dashboard.NO_TEAM_GROUP`), `dashboard.team.projects.NONE` is not → four rows
 *    under the meta `3 projects` (`-4` Q10).
 * 9. **The chart's split tabs are relabelled.** `SplitControl`'s defaults are `By member` / `By project`
 *    (`team-period.tsx:145-146`); `team-time-by-day.tsx:140-141` passes `common.MEMBERS` "Members" and
 *    `dashboard.team.table.PROJECTS` "Projects", which is what this page shows (`-11` T1).
 * 10. **A route team id the person is not in still draws the active team.** `pageTeamOf` falls back to the active team
 *     (`core/hooks/dashboards/team/use-team-dashboard.ts:68-75`); measured with a uuid the mock knows nothing about:
 *     same pathname, same breadcrumb, same three members (`-5` Q7).
 * 11. **While the teams read is refused the page never becomes "ready".** With `scenario.fails['/api/organization-team']`
 *     the only performance mark is `ever-teams:shell-bootstrap-start` (no `shell-ready`, so `waitForShellReady` would
 *     throw at `playwright/helpers.ts:407` — hence `requireShell: false`); the two day-board cards stay
 *     `aria-busy="true"` (they wait on `isMembersLoading`, `use-team-day-board.ts:52`), the members card keeps its
 *     column headers with `0` rows and pulse skeletons, and the report-backed cards keep their served figures (`-8` S4).
 * 12. **Outside days carry no class a test can select by.** `core/components/common/calendar.tsx:293` gives
 *     `day_outside` its own `text-muted-foreground/50`, and react-day-picker v8 then uses that in place of its own
 *     `rdp-day_outside` class (a style choice, untagged): the grid measured 42 day buttons including Oct 26–31 and
 *     Dec 1–6 (`showOutsideDays`) while `document.querySelectorAll('.rdp-day_outside')` counted `0` (`-8` S2), so a day
 *     number ≤ 6 appears on two buttons and nothing tells them apart. This file picks the 10th and the 14th of the
 *     month the grid opens on, which are never outside days.
 * 13. **Removing a filter does not read anything again.** The unfiltered query is still fresh (`staleTime`), so the
 *     daily read count after a chip's Remove was the same as before it (`-10` S6: no new shape after the chip click).
 * 14. **The shell warns that the profile zone and the browser zone differ.** The mock's profile is UTC and this browser
 *     runs in `Europe/Madrid`, so a `role=output` notice ("Your profile uses UTC … Keep UTC / Use Europe/Madrid") is on
 *     the page in every run here (`-5` Q8). It is not a card; nothing here asserts it.
 *
 * ## Not covered here
 *
 * Whether a signed-out visitor or a role may open the page at all (`suites/lane-d/page-gate-browser.spec.ts`,
 * `page-gate-lane.spec.ts`); the content of the exported *document* beyond the CSV's first lines (the PDF is only
 * named — no byte of it was read); the clients split (`dashboard.team.projects.SPLIT`, which this page never renders);
 * the `Month` granularity tab (it never appeared for the periods measured here); the member sheet of a member whose
 * `totalTodayTasks` is non-empty (the mock answers `[]` for every member); `dashboard.team.UPDATING` (no read here was
 * slow enough to show it); and every component listed above as unreachable.
 */

/* ------------------------------------------------------------------ messages ------------------------------------------------------------------ */

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: Record<string, string>;
	dashboard: {
		TEAM_DASHBOARD: string;
		NO_TEAM_GROUP: string;
		period: Record<string, string>;
		states: Record<string, string>;
		team: {
			META_MEMBERS: string;
			UNNAMED_MEMBER: string;
			figures: Record<string, string>;
			chart: Record<string, string>;
			projects: Record<string, string>;
			table: Record<string, string>;
			filters: Record<string, string>;
			export: Record<string, string>;
			tasks: Record<string, string>;
			cards: Record<string, string>;
			sheet: Record<string, string>;
			timeline: Record<string, string>;
			heatmap: Record<string, string>;
			live: Record<string, string>;
			today: Record<string, string>;
			columns: Record<string, string>;
			period: Record<string, string>;
		};
	};
	pages: { unauthorized: Record<string, string> };
};

const T = EN.dashboard.team;

/** Reads `en.json` the way next-intl does: `{name}` and `{name, plural, one {…} other {…}}`, including `#`. */
function readBlock(text: string, start: number): [string, number] {
	let depth = 0;
	for (let index = start; index < text.length; index += 1) {
		const char = text[index];
		if (char === '{') depth += 1;
		else if (char === '}') {
			depth -= 1;
			if (depth === 0) return [text.slice(start + 1, index), index];
		}
	}
	return [text.slice(start + 1), text.length];
}

function pluralTextOf(body: string, count: number) {
	const forms = new Map<string, string>();
	let index = 0;
	while (index < body.length) {
		const key = /([=\w]+)\s*\{/.exec(body.slice(index));
		if (!key) break;
		const [form, end] = readBlock(body, index + (key.index ?? 0) + key[0].length - 1);
		forms.set(key[1], form);
		index = end + 1;
	}
	const exact = forms.get(`=${count}`) ?? (count === 1 ? forms.get('one') : undefined) ?? forms.get('other') ?? '';
	return exact.replaceAll('#', String(count));
}

function interpolate(template: string, values: Record<string, string | number>) {
	let out = '';
	let index = 0;
	while (index < template.length) {
		const brace = template.indexOf('{', index);
		if (brace < 0) {
			out += template.slice(index);
			break;
		}
		out += template.slice(index, brace);
		const [body, end] = readBlock(template, brace);
		const plural = /^(\w+),\s*plural,\s*([\s\S]*)$/.exec(body);
		out += plural ? pluralTextOf(plural[2], Number(values[plural[1]] ?? 0)) : String(values[body] ?? '');
		index = end + 1;
	}
	return out;
}

const msg = (key: string, values: Record<string, string | number> = {}) =>
	interpolate(
		String(
			key
				.split('.')
				.reduce(
					(node: unknown, part) => (node as Record<string, unknown> | undefined)?.[part],
					EN as unknown as Record<string, unknown>
				)
		),
		values
	);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b team-dashboard] MEASURE ${label} ${JSON.stringify(value)}`);

/* ------------------------------------------------------------------ served answers ------------------------------------------------------------------ */

const DAILY = '/api/timesheet/time-log/report/daily';
const COUNTS = '/api/timesheet/statistics/counts';
const LOGS = '/api/timesheet/time-log';
const TEAM_LIST = '/api/organization-team';
const TASKS = '/api/tasks/team';

/** The client logs a refusal without the `/api` prefix, so an excused path is written the way the client writes it. */
const DAILY_LOG_PATH = '/timesheet/time-log/report/daily';
const LOGS_LOG_PATH = '/timesheet/time-log';
const TEAM_LIST_LOG_PATH = '/organization-team';

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const NODE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** A local calendar day `offset` days back from the day the run runs on, as `YYYY-MM-DD`. */
const dayKey = (offset: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() - offset);
	return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};

/** A wall-clock instant on local day `offset`, at `hour`:`minute`. */
const localIso = (offset: number, hour: number, minute = 0) => {
	const day = new Date();
	day.setHours(hour, minute, 0, 0);
	day.setDate(day.getDate() - offset);
	return day.toISOString();
};

const flat = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();

/**
 * One recorded call. A query key the client sent more than once (`relations[]=…&relations[]=…`) holds every value it
 * carried, in the order the client sent them; a key sent once is a plain string.
 */
type ServedCall = { method: string; path: string; search: string; params: Record<string, string | string[]> };

const paramsOfUrl = (url: URL) => {
	const params: Record<string, string | string[]> = {};
	url.searchParams.forEach((value: string, key: string) => {
		const seen = params[key];
		if (seen === undefined) params[key] = value;
		else params[key] = Array.isArray(seen) ? [...seen, value] : [seen, value];
	});
	return params;
};

/** One `GET` on the mock origin answering a fixed body — or a refusal — and recording every call that hit it. */
async function answer(page: Page, path: string, body: unknown, options: { status?: number } = {}) {
	const calls: ServedCall[] = [];
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === path,
		(route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({ method: request.method(), path: url.pathname, search: url.search, params: paramsOfUrl(url) });
			if (options.status && options.status >= 400) {
				return route.fulfill({
					status: options.status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: JSON.stringify({ statusCode: options.status, message: 'synthetic browser refusal' })
				});
			}
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
		}
	);
	return calls;
}

/** Records the browser's own requests to the mock origin under these exact paths. */
function recordReads(page: Page, paths: string[]) {
	const calls: ServedCall[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN || !paths.includes(url.pathname)) return;
		calls.push({ method: request.method(), path: url.pathname, search: url.search, params: paramsOfUrl(url) });
	});
	return {
		calls,
		/** The params of every recorded call to `path`, oldest first. */
		paramsOf: (path: string) => calls.filter((call) => call.path === path).map((call) => call.params),
		/** `<METHOD> <path>?<search>` shapes, oldest first, identical ones collapsed with a count. */
		shapes: () => {
			const counts = new Map<string, number>();
			for (const call of calls) {
				const shape = `${call.method} ${call.path}${call.search ? `?${call.search}` : ''}`;
				counts.set(shape, (counts.get(shape) ?? 0) + 1);
			}
			return Array.from(counts.entries()).map(([shape, count]) => (count > 1 ? `${shape} x${count}` : shape));
		}
	};
}

/**
 * Excuse only the refusal a test armed, status included: the client's line is `[HttpClient] HTTP Error: GET
 * <path>?<query> <status> {…}`, so the pattern names the path *and* the status and cannot excuse a different status
 * on the same path. A test that arms nothing passes no patterns.
 */
const armedRead = (path: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${path}(\?\S*)? ${status} `);
const consoleFindings = (shield: Shield, excused: RegExp[] = []) =>
	shield.consoleErrors().filter((line) => !excused.some((pattern) => pattern.test(line)));

/* ------------------------------------------------------------------ the clock the page and this file share ------------------------------------------------------------------ */

/**
 * Everything date-shaped this file expects, counted from the Node process's own calendar: the period windows the reads
 * must carry, the labels the cards print, and the two calendar days a custom range picks. Test 1 pins that the browser
 * resolved the same `timeZone`, so these values are the page's own.
 */
function clockOf() {
	const now = new Date();
	const key = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	const at = (offset: number, hour: number, minute: number, second: number, ms: number) => {
		const date = new Date(now);
		date.setDate(date.getDate() - offset);
		date.setHours(hour, minute, second, ms);
		return date;
	};
	const startOf = (offset: number) => at(offset, 0, 0, 0, 0);
	const endOf = (offset: number) => at(offset, 23, 59, 59, 999);
	const shift = (date: Date, days: number) => {
		const moved = new Date(date);
		moved.setDate(moved.getDate() + days);
		return moved;
	};
	const longDay = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' });
	const shortDay = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' });
	const monthDay = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
	const hourName = new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: true });
	const clockTime = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: true });
	// `formatRange` separates with thin spaces (U+2009) around the dash; the page renders the very same range through
	// the same API, and both sides are folded to plain spaces here so a comparison is a comparison of dates.
	const range = (from: Date, to: Date) =>
		new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).formatRange(from, to).replace(/\s+/g, ' ');

	const year = now.getFullYear();
	const month = now.getMonth();
	// The 10th and the 14th lie inside the month `defaultMonth={value.from}` opens on whatever today is, and
	// `showOutsideDays` fills at most six cells on each side, so exactly one button carries each of those numbers.
	const customFrom = new Date(year, month, 10, 0, 0, 0, 0);
	const customTo = new Date(year, month, 14, 0, 0, 0, 0);
	const customEnd = new Date(year, month, 14, 23, 59, 59, 999);
	const customDays = Math.round((customEnd.getTime() - customFrom.getTime()) / 86_400_000);
	const customPrevFrom = shift(customFrom, -customDays);
	const customPrevTo = shift(customEnd, -customDays);
	const monthFrom = new Date(year, month - 1, 1, 0, 0, 0, 0);
	const monthTo = new Date(year, month, 0, 23, 59, 59, 999);

	const mondaysOf = (from: Date, to: Date) => {
		const seen: Date[] = [];
		for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
			const monday = shift(day, -((day.getDay() + 6) % 7));
			monday.setHours(0, 0, 0, 0);
			if (!seen.some((other) => other.getTime() === monday.getTime())) seen.push(new Date(monday));
		}
		return seen;
	};

	return {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		todayKey: key(now),
		fromKey: key(startOf(6)),
		longDays: [6, 5, 4, 3, 2, 1, 0].map((offset) => longDay.format(startOf(offset))),
		todayLong: longDay.format(now),
		todayWeekday: new Intl.DateTimeFormat('en', { weekday: 'long' }).format(now),
		shortToday: shortDay.format(now),
		last7Text: range(startOf(6), endOf(0)),
		prev7Text: range(startOf(13), endOf(7)),
		prev7From: startOf(13).toISOString(),
		prev7To: endOf(7).toISOString(),
		twoWeeksText: range(startOf(13), endOf(0)),
		twoWeeksFrom: startOf(13).toISOString(),
		monthText: range(monthFrom, monthTo),
		monthFrom: monthFrom.toISOString(),
		monthTo: monthTo.toISOString(),
		monthWeeks: mondaysOf(monthFrom, monthTo).map((monday) =>
			msg('dashboard.team.chart.WEEK_OF', { date: monthDay.format(monday) })
		),
		dailyFrom: startOf(6).toISOString(),
		dailyTo: endOf(0).toISOString(),
		logsFrom: startOf(7).toISOString(),
		// the logs window reaches one day past today, which is `endOf` of a negative offset
		logsTo: endOf(-1).toISOString(),
		customFrom: customFrom.toISOString(),
		customTo: customEnd.toISOString(),
		customFromKey: key(customFrom),
		customToKey: key(customTo),
		customText: range(customFrom, customTo),
		customLogsFrom: shift(customFrom, -1).toISOString(),
		customPrevText: range(customPrevFrom, customPrevTo),
		customPrevFrom: customPrevFrom.toISOString(),
		customPrevTo: customPrevTo.toISOString(),
		hourName: (hour: number) => hourName.format(new Date(year, month, Math.min(now.getDate(), 15), hour, 0, 0, 0)),
		clockTime: (offset: number, hour: number, minute: number) => clockTime.format(at(offset, hour, minute, 0, 0))
	};
}

type Clock = ReturnType<typeof clockOf>;

const cellLabel = (clock: Clock, weekday: string, hour: number, duration: string) =>
	flat(
		msg('dashboard.team.heatmap.CELL', {
			day: weekday,
			from: clock.hourName(hour),
			to: clock.hourName(hour + 1),
			duration
		})
	);

const blockLabel = (
	clock: Clock,
	offset: number,
	fromHour: number,
	fromMinute: number,
	toHour: number,
	toMinute: number,
	duration: string,
	task: string
) =>
	flat(
		msg('dashboard.team.timeline.BLOCK_LABEL', {
			start: clock.clockTime(offset, fromHour, fromMinute),
			end: clock.clockTime(offset, toHour, toMinute),
			duration,
			task
		})
	);

/** The hour window the heat grid drew, measured per served data set: no logs → 8 AM … 3 PM, today's logs → 9 AM … 4 PM. */
const hoursOf = (from: number, to: number, clock: Clock) =>
	Array.from({ length: to - from + 1 }, (_, index) => clock.hourName(from + index));

/* ------------------------------------------------------------------ served data ------------------------------------------------------------------ */

const PROJECT_ONE = { id: 'probe-project-1', name: 'Probe Project One' };
const PROJECT_TWO = { id: 'probe-project-2', name: 'Probe Project Two' };
const SERVED_A = { userId: 'served-user-a', name: 'Served Name A' };
const SERVED_B = { userId: 'served-user-b', name: 'Served Name B' };

type ServedRow = {
	day: string;
	member: 'employee' | 'teammateEmployee';
	project: { id: string; name: string } | null;
	seconds: number;
	activity: number;
	taskId?: string;
	taskTitle?: string;
	withoutTeam?: boolean;
};

/** Five rows over three days for two members, in four groups: two projects, the `No team` group and the no-project
 *  row (`-4` Q10, `-11` T1, `-12` T2). */
const SERVED_ROWS: ServedRow[] = [
	{
		day: dayKey(0),
		member: 'employee',
		project: PROJECT_ONE,
		seconds: 3600,
		activity: 80,
		taskId: 'probe-task-1',
		taskTitle: 'Probe task one'
	},
	{
		day: dayKey(0),
		member: 'teammateEmployee',
		project: PROJECT_TWO,
		seconds: 5400,
		activity: 40,
		taskId: 'probe-task-2',
		taskTitle: 'Probe task two'
	},
	{
		day: dayKey(1),
		member: 'employee',
		project: PROJECT_ONE,
		seconds: 1800,
		activity: 50,
		taskId: 'probe-task-1',
		taskTitle: 'Probe task one'
	},
	{
		day: dayKey(2),
		member: 'teammateEmployee',
		project: null,
		seconds: 900,
		activity: 30,
		taskTitle: 'Probe description only'
	},
	{
		day: dayKey(2),
		member: 'employee',
		project: PROJECT_TWO,
		seconds: 7200,
		activity: 90,
		taskId: 'probe-task-3',
		taskTitle: 'Probe task three',
		withoutTeam: true
	}
];

function employeeNode(fixture: BootstrapFixture, member: 'employee' | 'teammateEmployee') {
	const served = member === 'employee' ? SERVED_A : SERVED_B;
	return {
		id: fixture.ids[member],
		userId: served.userId,
		fullName: served.name,
		user: { id: served.userId, name: served.name, email: `${served.userId}@probe.test`, imageUrl: null },
		billRateValue: null,
		billRateCurrency: null,
		isTrackingEnabled: true
	};
}

/** Today's two time logs, stamped at local 09:00–10:00 and 11:00–12:30 so no label depends on a zone (`-12` T2). */
const servedLogsOf = (fixture: BootstrapFixture) => [
	{
		id: 'probe-log-1',
		employeeId: fixture.ids.employee,
		employee: employeeNode(fixture, 'employee'),
		startedAt: localIso(0, 9, 0),
		stoppedAt: localIso(0, 10, 0),
		duration: 3600,
		projectId: PROJECT_ONE.id,
		project: PROJECT_ONE,
		taskId: 'probe-task-1',
		task: { id: 'probe-task-1', title: 'Probe task one' }
	},
	{
		id: 'probe-log-2',
		employeeId: fixture.ids.teammateEmployee,
		employee: employeeNode(fixture, 'teammateEmployee'),
		startedAt: localIso(0, 11, 0),
		stoppedAt: localIso(0, 12, 30),
		duration: 5400,
		projectId: PROJECT_TWO.id,
		project: PROJECT_TWO,
		taskId: 'probe-task-2',
		task: { id: 'probe-task-2', title: 'Probe task two' }
	}
];

/** An `ITimeLogGroupedDailyReport[]` answer (`-4` Q10) out of the flat rows: one group per day, project and team. */
function dailyReportOf(rows: ServedRow[], fixture: BootstrapFixture) {
	const grouped = new Map<string, ServedRow[]>();
	for (const row of rows) {
		const groupKey = `${row.day}|${row.project?.id ?? 'no-project'}|${row.withoutTeam ? 'no-team' : 'team'}|${row.member}`;
		grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), row]);
	}
	const days = new Map<string, unknown[]>();
	for (const entries of grouped.values()) {
		const first = entries[0];
		const group = {
			project: first.project
				? {
						id: first.project.id,
						name: first.project.name,
						organizationContactId: null,
						organizationContact: null
					}
				: null,
			employeeLogs: [
				{
					employee: employeeNode(fixture, first.member),
					sum: entries.reduce((total, entry) => total + entry.seconds, 0),
					activity: first.activity,
					tasks: entries.map((entry) => ({
						task: entry.taskId ? { id: entry.taskId, title: entry.taskTitle } : null,
						description: entry.taskTitle ?? 'Probe description',
						duration: entry.seconds,
						organizationTeamId: entry.withoutTeam ? null : 'TEAM_A'
					}))
				}
			]
		};
		days.set(first.day, [...(days.get(first.day) ?? []), group]);
	}
	return Array.from(days.entries()).map(([date, logs]) => ({ date, logs }));
}

const serveReport = async (
	page: Page,
	fixture: BootstrapFixture,
	options: { daily?: unknown; counts?: unknown; logs?: unknown } = {}
) => {
	await answer(page, DAILY, options.daily ?? dailyReportOf(SERVED_ROWS, fixture));
	await answer(page, COUNTS, options.counts ?? { employeesCount: 3, projectsCount: 2 });
	await answer(page, LOGS, options.logs ?? servedLogsOf(fixture));
};

/** The mock's own task object (`mock-gauzy-server.mjs:183-201`) with only its status changed (`-5` Q3). */
function taskOf(
	fixture: BootstrapFixture,
	id: string,
	title: string,
	statusId: string,
	isInProgress: boolean,
	memberIds: string[]
) {
	return {
		id,
		title,
		number: 1,
		public: false,
		status: isInProgress ? 'in-progress' : 'open',
		taskStatusId: statusId,
		taskStatus: {
			id: statusId,
			name: isInProgress ? 'in-progress' : 'open',
			value: isInProgress ? 'in-progress' : 'open',
			color: isInProgress ? '#6366f1' : '#94a3b8',
			order: isInProgress ? 2 : 1,
			isSystem: true,
			isInProgress,
			isTodo: !isInProgress,
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA,
			organizationTeamId: fixture.ids.teamA
		},
		estimate: 3600,
		description: 'Synthetic browser fixture task',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		members: memberIds.map((employeeId) => ({ id: employeeId })),
		tags: [],
		teams: [
			{
				id: fixture.ids.teamA,
				name: fixture.names.teamA,
				organizationId: fixture.ids.organizationA,
				tenantId: fixture.ids.tenantA
			}
		]
	};
}

/* ------------------------------------------------------------------ locators ------------------------------------------------------------------ */

const pagePathOf = (teamId: string) => `/dashboard/team-dashboard/${teamId}`;

const card = (page: Page, title: string) => page.locator(`section[aria-label="${title}"]`);
const cardMeta = async (page: Page, title: string) =>
	flat(await card(page, title).locator('header > div > span').first().textContent());
const cardRows = async (page: Page, title: string) =>
	(await card(page, title).locator('li').allTextContents()).map(flat);
const cardCells = (page: Page, title: string) => card(page, title).locator('[role=img]');
/**
 * The `aria-label` of every element a card marks out — the heat cells and the timeline blocks carry their whole
 * reading in the label and hold no text of their own, so `textContent` of them is empty.
 */
const labelsOf = async (scope: Locator) =>
	scope.evaluateAll((nodes) =>
		nodes.map((node) => (node.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim())
	);
const cardText = async (page: Page, title: string) => flat(await card(page, title).textContent());

/**
 * The `sr-only` data table a chart carries: its caption and its rows, in DOM order. The table is drawn together
 * with the chart, so this waits for it to exist before reading it (a card that has just been served has no table
 * yet, and an empty read here is a render that has not happened, not a wrong figure).
 */
async function tableOf(scope: Locator) {
	const rows = scope.locator('table tr');
	await expect.poll(async () => (await rows.all()).length, { timeout: 20_000 }).toBeGreaterThan(0);
	const body: string[][] = [];
	for (const row of await rows.all()) body.push((await row.locator('th, td').allTextContents()).map(flat));
	return { caption: flat(await scope.locator('table caption').first().textContent()), rows: body };
}

/** A locator's rendered text with every run of whitespace folded to one space, exactly as `flat` folds the expected. */
const flatText = async (locator: Locator) => flat(await locator.innerText());
const menuItemsOf = (page: Page) =>
	page
		.getByRole('menuitem')
		.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
const toolbarMeta = (page: Page) => flatText(page.locator('h1 ~ span').first());
const exportButton = (page: Page) => page.getByRole('button', { name: EN.common.EXPORT, exact: true }).first();
const filterTrigger = (page: Page) => page.getByRole('button', { name: /^Filter/ }).first();
const filterChip = (page: Page, value: string) =>
	page.getByRole('button', { name: msg('dashboard.team.filters.REMOVE', { value }), exact: true }).first();
const chipsOf = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('button[aria-label^="Remove "]')).map((button) =>
			button.getAttribute('aria-label')
		)
	);
const periodGroup = (page: Page) => page.getByRole('group', { name: EN.dashboard.period.LABEL, exact: true });
const periodTrigger = (page: Page) => periodGroup(page).locator('button:not([aria-label])').first();
const memberRows = (page: Page) => page.locator('#team-members li');
const memberRowNames = (page: Page) =>
	page
		.locator('#team-members button[aria-label^="Open "]')
		.evaluateAll((nodes) =>
			nodes.map((node) => (node.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim())
		);
const sheetOf = (page: Page) => page.locator('[role=dialog]');
const tabsOf = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[role=tablist]')).map((list) => ({
			aria: list.getAttribute('aria-label'),
			tabs: Array.from(list.querySelectorAll('[role=tab]')).map((tab) => ({
				name: (tab.textContent ?? '').replace(/\s+/g, ' ').trim(),
				selected: tab.getAttribute('aria-selected')
			}))
		}))
	);

const SPLIT_TABS = [
	{ name: EN.common.MEMBERS, selected: 'true' },
	{ name: T.table.PROJECTS, selected: 'false' }
];

/** Closes the filter menu by clicking its trigger again. Escape does not close it: measured in `-6` R1, where the
 *  Clear-filters click timed out with the popover open — the popover covers the chip row. */
async function closeFilterMenu(page: Page) {
	await filterTrigger(page).click();
	await expect(page.getByRole('menuitem')).toHaveCount(0, { timeout: 10_000 });
}

async function openPeriod(page: Page) {
	await periodTrigger(page).click();
	await expect(sheetOf(page)).toHaveCount(1);
}

/** A preset row of the popover. Its accessible name also carries the resolved dates, so it is matched by text. */
async function pickPreset(page: Page, label: string) {
	await openPeriod(page);
	const row = sheetOf(page).locator('button').filter({ hasText: label }).first();
	await row.click();
}

/** The 10th and the 14th of the month the grid opens on; neither is ever an outside day (`clockOf`, finding 12). */
async function pickCustomRange(page: Page) {
	await openPeriod(page);
	const days = sheetOf(page).locator('button:not(.rdp-day_outside)');
	await expect(days.filter({ hasText: /^10$/ }).first()).toHaveCount(1);
	await expect(days.filter({ hasText: /^14$/ }).first()).toHaveCount(1);
	await days.filter({ hasText: /^10$/ }).first().click();
	await days.filter({ hasText: /^14$/ }).first().click();
}

/* ------------------------------------------------------------------ tests ------------------------------------------------------------------ */

test.describe('Team dashboard UI (lane-b)', () => {
	test('1 · the page as the lane mock answers it: every read the page makes, and every card with nothing tracked', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		const browserZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
		expect(browserZone, 'the served days and the period windows have to be counted in one calendar').toBe(
			NODE_ZONE
		);

		const reads = recordReads(page, [DAILY, COUNTS, LOGS, TEAM_LIST]);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		await expect(
			page.getByRole('heading', { level: 1, name: EN.dashboard.TEAM_DASHBOARD, exact: true })
		).toHaveCount(1);
		const crumbs = page.locator('nav[aria-label="breadcrumb"] a');
		await expect(crumbs).toHaveCount(2);
		await expect(crumbs.nth(0)).toHaveText(fixture.names.teamA);
		await expect(crumbs.nth(0)).toHaveAttribute('href', '/');
		await expect(crumbs.nth(1)).toHaveText(EN.dashboard.TEAM_DASHBOARD);

		// finding 1: no `employeesCount` from the mock, so no member part on the meta line
		expect(await toolbarMeta(page)).toBe(clock.last7Text);

		// the three period reads exactly as this manager sends them, with no team and no member filter (finding 2)
		const activity = { 'activityLevel[start]': '0', 'activityLevel[end]': '100' };
		expect(reads.paramsOf(DAILY)[0]).toEqual({
			...activity,
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			startDate: clock.dailyFrom,
			endDate: clock.dailyTo,
			timeZone: clock.timeZone,
			groupBy: 'date'
		});
		expect(reads.paramsOf(COUNTS)[0]).toEqual({
			...activity,
			'logType[0]': 'TRACKED',
			organizationId: fixture.ids.organizationA,
			startDate: clock.dailyFrom,
			endDate: clock.dailyTo,
			timeZone: clock.timeZone
		});
		const rosterIds = [fixture.ids.employee, fixture.ids.teammateEmployee, fixture.ids.deniedEmployee].sort();
		expect(reads.paramsOf(LOGS)[0]).toEqual({
			...activity,
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			startDate: clock.logsFrom,
			endDate: clock.logsTo,
			timeZone: clock.timeZone,
			'relations[0]': 'project',
			'relations[1]': 'task',
			'relations[2]': 'organizationContact',
			'relations[3]': 'employee.user',
			'relations[4]': 'task.taskStatus',
			'relations[5]': 'timesheet',
			'employeeIds[0]': rosterIds[0],
			'employeeIds[1]': rosterIds[1],
			'employeeIds[2]': rosterIds[2]
		});
		// the teams read repeats `relations[]` instead of numbering it (`relations[0]…` on the time-log read above)
		expect(reads.paramsOf(TEAM_LIST)[0]).toEqual({
			'where[organizationId]': fixture.ids.organizationA,
			'where[tenantId]': fixture.ids.tenantA,
			source: 'TEAMS',
			withLastWorkedTask: 'true',
			'relations[]': [
				'members',
				'members.role',
				'members.employee',
				'members.employee.user',
				'members.employee.user.role',
				'createdByUser',
				'projects',
				'projects.customFields.repository'
			]
		});

		// every card of a team that tracked nothing (probe -1)
		expect(await cardText(page, T.figures.TRACKED_TODAY)).toContain(`0h 0m0%`);
		expect(await cardText(page, T.figures.WORKING_NOW)).toContain(
			`0 ${msg('dashboard.team.figures.OF_TOTAL', { total: 3 })}${T.figures.NOBODY_TRACKING}`
		);
		expect(await cardText(page, T.figures.THIS_PERIOD)).toContain(
			`0h 0m${msg('dashboard.team.figures.OVER_DAYS', { days: 0 })} · ${msg('dashboard.team.META_MEMBERS', { count: 0 })}`
		);
		const tasksFigures = card(page, T.figures.TEAM_TASKS);
		await expect(
			tasksFigures.getByText(msg('dashboard.team.tasks.GROUPS_SUMMARY', { inProgress: 0, inReview: 0, done: 0 }))
		).toHaveCount(1);
		await expect(
			tasksFigures.getByText(msg('dashboard.team.tasks.IN_PROGRESS_COUNT', { count: 0 }), { exact: true })
		).toHaveCount(1);

		expect(await cardMeta(page, T.cards.TIME_BY_DAY)).toBe(clock.last7Text);
		const emptyChart = await tableOf(card(page, T.cards.TIME_BY_DAY));
		expect(emptyChart.caption).toBe(T.period.LABEL_MEMBER);
		expect(emptyChart.rows).toEqual(clock.longDays.map((day) => [day, '0h 0m', '']));
		await expect(card(page, T.cards.TIME_BY_DAY).getByText(T.chart.EMPTY, { exact: true })).toHaveCount(1);
		// no project carries time, so the split's second tab is blocked (finding 9 names the tabs); no granularity tabs
		expect(await tabsOf(page)).toEqual([{ aria: T.period.SPLIT, tabs: SPLIT_TABS }]);
		await expect(page.getByRole('tab', { name: T.table.PROJECTS, exact: true })).toBeDisabled();

		expect(await cardMeta(page, T.heatmap.TITLE)).toBe(T.heatmap.META);
		expect(await cardText(page, T.heatmap.TITLE)).toContain(
			`MTWTFSS${hoursOf(8, 15, clock).join('')}${T.heatmap.EMPTY}`
		);
		// the grid is drawn even with nothing tracked: all 8 × 7 cells, each labelled 0h 0m (`-1` P1)
		const idleCells = await labelsOf(cardCells(page, T.heatmap.TITLE));
		expect(idleCells.length).toBe(56);
		expect(idleCells.every((label) => label.includes('0h 0m'))).toBe(true);
		expect(idleCells).toContain(cellLabel(clock, 'Monday', 8, '0h 0m'));

		expect(await cardMeta(page, T.timeline.TITLE)).toBe(
			msg('dashboard.team.timeline.META', { day: clock.shortToday, duration: '0h 0m', count: 0 })
		);
		await expect(card(page, T.timeline.TITLE).getByText(T.today.NOBODY, { exact: true })).toHaveCount(1);
		await expect(card(page, T.timeline.TITLE)).toContainText(msg('dashboard.team.live.NOT_STARTED', { count: 3 }));

		expect(await cardMeta(page, T.cards.TASKS_BY_STATUS)).toBe(
			msg('dashboard.team.tasks.OPEN_COUNT', { count: 1 })
		);
		expect(await cardRows(page, T.cards.TASKS_BY_STATUS)).toEqual(['open1100%']); // finding 4
		await expect(
			card(page, T.cards.TASKS_BY_STATUS).getByText(T.tasks.NO_IN_PROGRESS, { exact: true })
		).toHaveCount(1);

		expect(await cardText(page, T.projects.TITLE)).toContain(T.projects.EMPTY);

		expect(await cardMeta(page, T.cards.TEAM_MEMBERS)).toBe(msg('dashboard.team.table.MEMBER_COUNT', { count: 3 }));
		expect(await cardRows(page, T.cards.TEAM_MEMBERS)).toEqual([
			`FM${fixture.names.user}ManagerNot started#1${fixture.names.task}––––`,
			`FT${fixture.names.denied}MemberNot started–––––`,
			`FT${fixture.names.teammate}MemberNot started–––––`
		]);

		expect(await exportButton(page).isDisabled()).toBe(true);
		await expect(page.getByText(EN.dashboard.states.ERROR_TITLE, { exact: true })).toHaveCount(0);
		expect(consoleFindings(shield), 'the page was not expected to log anything').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);

		report('1 mock-only', {
			zone: clock.timeZone,
			toolbarMeta: await toolbarMeta(page),
			dailyRead: reads.paramsOf(DAILY)[0],
			countsRead: reads.paramsOf(COUNTS)[0],
			logsRead: reads.paramsOf(LOGS)[0],
			heatmapCells: await cardCells(page, T.heatmap.TITLE).count(),
			memberRows: await memberRows(page).count()
		});
	});

	test('2 · served time for two members: the four figure cards, the meta line and Export', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		const reads = recordReads(page, [DAILY, COUNTS, LOGS]);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		expect(await cardText(page, T.figures.THIS_PERIOD)).toContain(
			`5h 15m${msg('dashboard.team.figures.OVER_DAYS', { days: 3 })} · ${msg('dashboard.team.META_MEMBERS', { count: 2 })}`
		);
		// finding 5: today's figure follows the member records, which the mock answers with no tasks for today
		expect(await cardText(page, T.figures.TRACKED_TODAY)).toContain('0h 0m0%');
		expect(await cardText(page, T.figures.WORKING_NOW)).toContain(
			`0 ${msg('dashboard.team.figures.OF_TOTAL', { total: 3 })}${T.figures.NOBODY_TRACKING}`
		);
		expect(await cardText(page, T.figures.TEAM_TASKS)).toContain(
			`1${msg('dashboard.team.tasks.GROUPS_SUMMARY', { inProgress: 0, inReview: 0, done: 0 })}${msg('dashboard.team.tasks.IN_PROGRESS_COUNT', { count: 0 })}`
		);

		// finding 1: the member part appears as soon as `employeesCount` is answered
		expect(await toolbarMeta(page)).toBe(
			`${clock.last7Text} · ${msg('dashboard.team.META_MEMBERS', { count: 3 })}`
		);
		expect(await exportButton(page).isDisabled()).toBe(false);

		expect(reads.paramsOf(DAILY)[0]?.startDate).toBe(reads.paramsOf(COUNTS)[0]?.startDate);
		expect(reads.paramsOf(LOGS)[0]?.startDate).not.toBe(reads.paramsOf(DAILY)[0]?.startDate);
		expect(consoleFindings(shield)).toEqual([]);

		report('2 served figures', {
			thisPeriod: await cardText(page, T.figures.THIS_PERIOD),
			toolbarMeta: await toolbarMeta(page),
			exportDisabled: await exportButton(page).isDisabled()
		});
	});

	test('3 · Time by day: the seven day columns, the member legend, the Projects split and back', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		const timeByDay = card(page, T.cards.TIME_BY_DAY);
		// the legend only exists once the served members are in the chart, so it is the signal that the read landed
		await expect(timeByDay.locator('button[aria-pressed]')).toHaveCount(2);
		const memberView = await tableOf(timeByDay);
		expect(memberView.caption).toBe(T.period.LABEL_MEMBER);
		expect(memberView.rows).toEqual([
			[clock.longDays[0], '0h 0m', ''],
			[clock.longDays[1], '0h 0m', ''],
			[clock.longDays[2], '0h 0m', ''],
			[clock.longDays[3], '0h 0m', ''],
			[clock.longDays[4], '2h 15m', `${SERVED_A.name} 2h 0m, ${SERVED_B.name} 0h 15m`],
			[clock.longDays[5], '0h 30m', `${SERVED_A.name} 0h 30m`],
			[clock.longDays[6], '2h 30m', `${SERVED_A.name} 1h 0m, ${SERVED_B.name} 1h 30m`]
		]);
		const legend = (await timeByDay.locator('button[aria-pressed]').allTextContents()).map(flat);
		expect(legend).toEqual([`${SERVED_A.name}3h 30m`, `${SERVED_B.name}1h 45m`]);

		expect(await tabsOf(page)).toEqual([{ aria: T.period.SPLIT, tabs: SPLIT_TABS }]); // finding 9

		await page.getByRole('tab', { name: T.table.PROJECTS, exact: true }).first().click();
		const projectView = await tableOf(timeByDay);
		expect(projectView.caption).toBe(T.columns.LABEL);
		expect(projectView.rows).toEqual([
			[clock.longDays[0], '0h 0m', ''],
			[clock.longDays[1], '0h 0m', ''],
			[clock.longDays[2], '0h 0m', ''],
			[clock.longDays[3], '0h 0m', ''],
			[clock.longDays[4], '2h 15m', `${EN.dashboard.NO_TEAM_GROUP} 2h 0m, ${T.projects.NONE} 0h 15m`],
			[clock.longDays[5], '0h 30m', `${PROJECT_ONE.name} 0h 30m`],
			[clock.longDays[6], '2h 30m', `${PROJECT_ONE.name} 1h 0m, ${PROJECT_TWO.name} 1h 30m`]
		]);
		expect((await timeByDay.locator('button[aria-pressed]').allTextContents()).map(flat)).toEqual([
			`${EN.dashboard.NO_TEAM_GROUP}2h 0m`,
			`${PROJECT_ONE.name}1h 30m`,
			`${PROJECT_TWO.name}1h 30m`,
			`${T.projects.NONE}0h 15m`
		]);
		expect(await timeByDay.locator('[role=slider]').first().getAttribute('aria-label')).toBe(T.columns.LABEL);

		await page.getByRole('tab', { name: EN.common.MEMBERS, exact: true }).first().click();
		expect((await tableOf(timeByDay)).caption).toBe(T.period.LABEL_MEMBER);

		report('3 time by day', { memberCaption: memberView.caption, projectCaption: projectView.caption, legend });
	});

	test('4 · Where the time went: the four groups, their whole-number shares and the total', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		// finding 8: the No team group is counted and the No project group is not → 3 projects over 4 rows
		expect(await cardMeta(page, T.projects.TITLE)).toBe(msg('dashboard.team.projects.COUNT', { count: 3 }));
		expect(await cardRows(page, T.projects.TITLE)).toEqual([
			`38%${EN.dashboard.NO_TEAM_GROUP}2h 0m`,
			`29%${PROJECT_ONE.name}1h 30m`,
			`28%${PROJECT_TWO.name}1h 30m`,
			`5%${T.projects.NONE}0h 15m`
		]);
		await expect(card(page, T.projects.TITLE)).toContainText(`${EN.common.TOTAL}5h 15m`);

		report('4 time split', {
			meta: await cardMeta(page, T.projects.TITLE),
			rows: await cardRows(page, T.projects.TITLE)
		});
	});

	test('5 · Hours of work: the 8 × 7 grid, its three filled cells and the busiest hour', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		expect(await cardMeta(page, T.heatmap.TITLE)).toBe(T.heatmap.META);
		expect(await cardText(page, T.heatmap.TITLE)).toContain(
			`MTWTFSS${hoursOf(9, 16, clock).join('')}${T.heatmap.LESS}${T.heatmap.MORE}${msg('dashboard.team.heatmap.BUSIEST', { duration: '1h 0m' })}`
		);

		const cells = await labelsOf(cardCells(page, T.heatmap.TITLE));
		expect(cells.length).toBe(56);
		const tracked = [
			cellLabel(clock, clock.todayWeekday, 9, '1h 0m'),
			cellLabel(clock, clock.todayWeekday, 11, '1h 0m'),
			cellLabel(clock, clock.todayWeekday, 12, '0h 30m')
		];
		expect(cells.filter((label) => !String(label).includes('0h 0m'))).toEqual(tracked);
		const emptyCells = cells.filter((label) => String(label).includes('0h 0m'));
		expect(emptyCells.length).toBe(53);
		expect(emptyCells).toContain(cellLabel(clock, clock.todayWeekday, 10, '0h 0m'));

		report('5 hour heat', {
			cells: cells.length,
			tracked,
			busiest: msg('dashboard.team.heatmap.BUSIEST', { duration: '1h 0m' })
		});
	});

	test('6 · Today: the two lanes, the two blocks, the project shares and the not-started line', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		expect(await cardMeta(page, T.timeline.TITLE)).toBe(
			msg('dashboard.team.timeline.META', { day: clock.shortToday, duration: '2h 30m', count: 2 })
		);
		expect(await labelsOf(cardCells(page, T.timeline.TITLE))).toEqual([
			blockLabel(clock, 0, 11, 0, 12, 30, '1h 30m', 'Probe task two'),
			blockLabel(clock, 0, 9, 0, 10, 0, '1h 0m', 'Probe task one')
		]);
		// the lanes are named from the roster, not from the names in the answer
		expect(await cardText(page, T.timeline.TITLE)).toContain(`${fixture.names.teammate}1h 30m`);
		expect(await cardText(page, T.timeline.TITLE)).toContain(`${fixture.names.user}1h 0m`);
		expect(await cardRows(page, T.timeline.TITLE)).toEqual([`60%${PROJECT_TWO.name}`, `40%${PROJECT_ONE.name}`]);
		await expect(card(page, T.timeline.TITLE)).toContainText(msg('dashboard.team.live.NOT_STARTED', { count: 1 }));

		report('6 today', {
			meta: await cardMeta(page, T.timeline.TITLE),
			blocks: await labelsOf(cardCells(page, T.timeline.TITLE)),
			notStarted: msg('dashboard.team.live.NOT_STARTED', { count: 1 })
		});
	});

	test('7 · Tasks by status: served tasks, their counts and the in-progress task worked in the period', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		await serveReport(page, fixture, {
			daily: dailyReportOf(
				[
					{
						day: dayKey(0),
						member: 'employee',
						project: PROJECT_ONE,
						seconds: 3600,
						activity: 80,
						taskId: fixture.ids.task,
						taskTitle: fixture.names.task
					},
					{
						day: dayKey(0),
						member: 'teammateEmployee',
						project: PROJECT_ONE,
						seconds: 1800,
						activity: 70,
						taskId: '77777777-7777-4777-8777-222222222222',
						taskTitle: 'Probe open task'
					}
				],
				fixture
			)
		});
		const tasks = [
			taskOf(fixture, fixture.ids.task, fixture.names.task, fixture.ids.inProgressStatus, true, [
				fixture.ids.employee
			]),
			taskOf(fixture, '77777777-7777-4777-8777-222222222222', 'Probe open task', fixture.ids.todoStatus, false, [
				fixture.ids.employee
			])
		];
		const read = await answer(page, TASKS, { items: tasks, total: tasks.length });
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		expect(read.length).toBeGreaterThan(0);
		expect(await cardMeta(page, T.cards.TASKS_BY_STATUS)).toBe(
			msg('dashboard.team.tasks.OPEN_COUNT', { count: 2 })
		); // finding 3
		expect(await cardRows(page, T.cards.TASKS_BY_STATUS)).toEqual([
			'open150%',
			'in progress150%', // finding 4
			`#1${fixture.names.task}1h 0m / 1h`
		]);
		await expect(
			card(page, T.cards.TASKS_BY_STATUS).getByText(T.tasks.IN_PROGRESS_WORKED, { exact: true })
		).toHaveCount(1);
		expect(await cardText(page, T.figures.TEAM_TASKS)).toContain(
			`2${msg('dashboard.team.tasks.GROUPS_SUMMARY', { inProgress: 1, inReview: 0, done: 0 })}${msg('dashboard.team.tasks.IN_PROGRESS_COUNT', { count: 1 })}`
		);

		report('7 tasks', {
			meta: await cardMeta(page, T.cards.TASKS_BY_STATUS),
			rows: await cardRows(page, T.cards.TASKS_BY_STATUS),
			figures: await cardText(page, T.figures.TEAM_TASKS)
		});
	});

	test('8 · Team members: the three rows, the sort buttons and the order after each sort', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		expect(await cardMeta(page, T.cards.TEAM_MEMBERS)).toBe(msg('dashboard.team.table.MEMBER_COUNT', { count: 3 }));
		expect(await cardRows(page, T.cards.TEAM_MEMBERS)).toEqual([
			`FM${fixture.names.user}ManagerNot started#1${fixture.names.task}–3h 30m3${EN.dashboard.NO_TEAM_GROUP}`,
			`FT${fixture.names.denied}MemberNot started–––––`,
			`FT${fixture.names.teammate}MemberNot started––1h 45m2${PROJECT_TWO.name}`
		]);

		const sortArias = (
			await page
				.locator('#team-members button[aria-label^="Sort by "]')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''))
		).sort();
		expect(sortArias).toEqual(
			[EN.common.STATUS, EN.common.STATUS, T.table.MEMBER, EN.common.TODAY, T.figures.THIS_PERIOD, T.table.DAYS]
				.map((column) => msg('dashboard.team.table.SORT_BY', { column }))
				.sort()
		);

		const namesAtLoad = [fixture.names.user, fixture.names.denied, fixture.names.teammate];
		const expected = (names: string[]) => names.map((name) => msg('dashboard.team.table.OPEN_MEMBER', { name }));
		expect(await memberRowNames(page)).toEqual(expected(namesAtLoad));

		const sortBy = (column: string) =>
			page
				.locator('#team-members')
				.getByRole('button', { name: msg('dashboard.team.table.SORT_BY', { column }), exact: true })
				.first();

		await sortBy(T.table.MEMBER).click();
		expect(await memberRowNames(page)).toEqual(expected(namesAtLoad));
		await sortBy(EN.common.TODAY).click();
		expect(await memberRowNames(page)).toEqual(expected(namesAtLoad));
		await sortBy(T.figures.THIS_PERIOD).click();
		expect(await memberRowNames(page)).toEqual(
			expected([fixture.names.user, fixture.names.teammate, fixture.names.denied])
		);
		await sortBy(T.table.DAYS).click();
		expect(await memberRowNames(page)).toEqual(
			expected([fixture.names.user, fixture.names.teammate, fixture.names.denied])
		);

		// three members: the card shows them all, so there is nothing to fold
		await expect(
			page.getByRole('button', { name: msg('dashboard.team.table.SHOW_MORE_MEMBERS', { count: 4 }), exact: true })
		).toHaveCount(0);
		await expect(page.getByRole('button', { name: T.table.SHOW_FEWER, exact: true })).toHaveCount(0);

		report('8 members', { rows: await cardRows(page, T.cards.TEAM_MEMBERS), sortButtons: sortArias });
	});

	test('9 · a member row opens the member sheet, and Escape closes it back onto that row', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		const openRow = msg('dashboard.team.table.OPEN_MEMBER', { name: fixture.names.user });
		await page.locator('#team-members').getByRole('button', { name: openRow, exact: true }).click();
		const sheet = sheetOf(page);
		await expect(sheet).toHaveCount(1);

		const timesheet = sheet.getByRole('link', { name: EN.common.VIEW_TIMESHEET, exact: true });
		const timesheetHref = await timesheet.getAttribute('href');
		await expect(timesheet).toHaveCount(1);
		await expect(timesheet).toHaveAttribute(
			'href',
			`/reports/timesheet/${fixture.ids.user}?name=${encodeURIComponent(fixture.names.user)}`
		);
		await expect(sheet).toContainText(`${EN.common.EMAIL}manager@example.test`);
		await expect(sheet).toContainText(`${T.sheet.STATUS_NOW}Not started`);
		await expect(sheet).toContainText(`${T.sheet.CURRENT_TASK}${msg('dashboard.team.live.TRACKED_TODAY')}`);
		await expect(sheet).toContainText(`${EN.common.RATE}${T.sheet.NO_RATE}`);

		// finding 5 inside the sheet: the Today figure is 0h 0m and says nothing was tracked, while the strip beside it
		// carries the served hour block and the legend built from it
		await expect(sheet).toContainText(T.sheet.NO_TODAY);
		expect(await labelsOf(sheet.locator('[role=img]'))).toEqual([
			blockLabel(clock, 0, 9, 0, 10, 0, '1h 0m', 'Probe task one')
		]);
		await expect(sheet).toContainText('3h 30m');
		expect(await sheet.locator('li').allTextContents()).toEqual([
			`100%${PROJECT_ONE.name}`,
			`${clock.longDays[0]}: 0h 0m`,
			`${clock.longDays[1]}: 0h 0m`,
			`${clock.longDays[2]}: 0h 0m`,
			`${clock.longDays[3]}: 0h 0m`,
			`${clock.longDays[4]}: 2h 0m`,
			`${clock.longDays[5]}: 0h 30m`,
			`${clock.longDays[6]}: 1h 0m`,
			`57%${EN.dashboard.NO_TEAM_GROUP}2h 0m`,
			`43%${PROJECT_ONE.name}1h 30m`
		]);

		await page.keyboard.press('Escape');
		await expect(sheet).toHaveCount(0);
		const focus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
		expect(focus).toBe(openRow);

		report('9 sheet', { timesheetHref, focusAfterEscape: focus });
	});

	test('10 · the period picker: its presets, Previous and Next, and the tabs each period gets', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		const reads = recordReads(page, [DAILY]);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		await expect(
			periodGroup(page).getByRole('button', { name: EN.dashboard.period.PREVIOUS, exact: true })
		).toHaveCount(1);
		await expect(
			periodGroup(page).getByRole('button', { name: EN.dashboard.period.NEXT, exact: true })
		).toHaveCount(1);
		expect(await flatText(periodTrigger(page))).toBe(msg('common.FILTER_LAST_7_DAYS'));

		await openPeriod(page);
		const presets = [
			'common.TODAY',
			'common.YESTERDAY',
			'common.THIS_WEEK',
			'common.LAST_WEEK',
			'common.FILTER_LAST_7_DAYS',
			'common.LAST_TWO_WEEKS',
			'common.THIS_MONTH',
			'common.LAST_MONTH'
		];
		const dialogText = flat(await sheetOf(page).first().innerText());
		for (const key of presets) expect(dialogText).toContain(msg(key));
		await expect(sheetOf(page).locator('button').filter({ hasText: clock.last7Text }).first()).toContainText(
			'Selected'
		);

		// Previous and Next step by the period's own length (`-3` P4)
		await periodGroup(page).getByRole('button', { name: EN.dashboard.period.PREVIOUS, exact: true }).click();
		expect(await flatText(periodTrigger(page))).toBe(clock.prev7Text);
		expect(reads.paramsOf(DAILY).at(-1)?.startDate).toBe(clock.prev7From);
		expect(reads.paramsOf(DAILY).at(-1)?.endDate).toBe(clock.prev7To);
		await periodGroup(page).getByRole('button', { name: EN.dashboard.period.NEXT, exact: true }).click();
		expect(await flatText(periodTrigger(page))).toBe(msg('common.FILTER_LAST_7_DAYS'));
		expect((await tableOf(card(page, T.cards.TIME_BY_DAY))).rows.map((row) => row[0])).toEqual(clock.longDays);

		// 14 days: the split tabs only, no granularity tablist at all
		await pickPreset(page, msg('common.LAST_TWO_WEEKS'));
		expect(await flatText(periodTrigger(page))).toBe(msg('common.LAST_TWO_WEEKS'));
		expect(await toolbarMeta(page)).toBe(
			`${clock.twoWeeksText} · ${msg('dashboard.team.META_MEMBERS', { count: 3 })}`
		);
		expect(reads.paramsOf(DAILY).at(-1)?.startDate).toBe(clock.twoWeeksFrom);
		expect(await tabsOf(page)).toEqual([{ aria: T.period.SPLIT, tabs: SPLIT_TABS }]);

		// last month: a granularity tablist appears, and it offers Day and Week only
		await pickPreset(page, msg('common.LAST_MONTH'));
		expect(await flatText(periodTrigger(page))).toBe(msg('common.LAST_MONTH'));
		expect(reads.paramsOf(DAILY).at(-1)?.startDate).toBe(clock.monthFrom);
		expect(reads.paramsOf(DAILY).at(-1)?.endDate).toBe(clock.monthTo);
		expect(await tabsOf(page)).toEqual([
			{ aria: T.period.SPLIT, tabs: SPLIT_TABS },
			{
				aria: T.chart.GROUP_BY,
				tabs: [
					{ name: T.chart.DAY, selected: 'true' },
					{ name: T.chart.WEEK, selected: 'false' }
				]
			}
		]);

		await page.getByRole('tab', { name: T.chart.WEEK, exact: true }).first().click();
		const weeks = await tableOf(card(page, T.cards.TIME_BY_DAY));
		expect(weeks.rows).toEqual(clock.monthWeeks.map((label) => [label, '0h 0m', '']));

		report('10 period', {
			presets: presets.map((key) => msg(key)),
			twoWeeks: clock.twoWeeksText,
			lastMonth: clock.monthText,
			weekRows: weeks.rows.map((row) => row[0])
		});
	});

	test('11 · a custom range in the picker: the 10th to the 14th, in every read and every card', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		const reads = recordReads(page, [DAILY, COUNTS, LOGS]);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		await pickCustomRange(page);

		expect(await flatText(periodTrigger(page))).toBe(clock.customText);
		expect(await toolbarMeta(page)).toBe(
			`${clock.customText} · ${msg('dashboard.team.META_MEMBERS', { count: 3 })}`
		);
		expect(reads.paramsOf(DAILY).at(-1)?.startDate).toBe(clock.customFrom);
		expect(reads.paramsOf(DAILY).at(-1)?.endDate).toBe(clock.customTo);
		expect(reads.paramsOf(COUNTS).at(-1)?.startDate).toBe(clock.customFrom);
		expect(reads.paramsOf(COUNTS).at(-1)?.endDate).toBe(clock.customTo);
		// the logs read keeps today inside its window even when the picked period does not (`-8` S2)
		expect(reads.paramsOf(LOGS).at(-1)?.startDate).toBe(clock.customLogsFrom);
		expect(reads.paramsOf(LOGS).at(-1)?.endDate).toBe(clock.logsTo);

		expect(await cardMeta(page, T.cards.TIME_BY_DAY)).toBe(clock.customText);
		// today's cards stay today's, whatever the picked period says
		expect(await cardMeta(page, T.timeline.TITLE)).toBe(
			msg('dashboard.team.timeline.META', { day: clock.shortToday, duration: '2h 30m', count: 2 })
		);

		await periodGroup(page).getByRole('button', { name: EN.dashboard.period.PREVIOUS, exact: true }).click();
		expect(await flatText(periodTrigger(page))).toBe(clock.customPrevText);
		expect(reads.paramsOf(DAILY).at(-1)?.startDate).toBe(clock.customPrevFrom);
		expect(reads.paramsOf(DAILY).at(-1)?.endDate).toBe(clock.customPrevTo);

		await periodGroup(page).getByRole('button', { name: EN.dashboard.period.NEXT, exact: true }).click();
		expect(await flatText(periodTrigger(page))).toBe(clock.customText);

		report('11 custom range', {
			range: `${clock.customFromKey} → ${clock.customToKey}`,
			trigger: clock.customText,
			daily: reads.paramsOf(DAILY).at(-1),
			logs: reads.paramsOf(LOGS).at(-1)
		});
	});

	test('12 · the filters: the team pick, its chip, the member pick, removing a chip and Clear filters', async ({
		page,
		fixture
	}) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		const reads = recordReads(page, [DAILY, COUNTS, LOGS]);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		expect(await flatText(filterTrigger(page))).toBe(EN.common.FILTER);
		await filterTrigger(page).click();
		await expect(page.getByRole('menuitem')).toHaveCount(2); // the menu holds exactly its two categories
		const menuItemsWhileOpen = await menuItemsOf(page);
		expect(menuItemsWhileOpen).toEqual([EN.common.TEAMS, EN.common.MEMBERS]);

		// a team pick: teamIds[0] + includeTimeWithoutTeam on the daily read, teamIds[0] on the counts read
		await page.getByRole('menuitem', { name: EN.common.TEAMS, exact: true }).first().hover();
		const teamBox = page.getByRole('menuitemcheckbox', { name: fixture.names.teamA, exact: false }).first();
		await expect(teamBox).toBeVisible({ timeout: 15_000 });
		await teamBox.click();
		await closeFilterMenu(page);
		expect(await chipsOf(page)).toEqual([msg('dashboard.team.filters.REMOVE', { value: fixture.names.teamA })]);
		expect(reads.paramsOf(DAILY).at(-1)?.['teamIds[0]']).toBe(fixture.ids.teamA);
		expect(reads.paramsOf(DAILY).at(-1)?.['includeTimeWithoutTeam']).toBe('true');
		const teamPickParams = { ...reads.paramsOf(DAILY).at(-1) };
		expect(reads.paramsOf(COUNTS).at(-1)?.['teamIds[0]']).toBe(fixture.ids.teamA);

		const dailyReadsBeforeRemove = reads.paramsOf(DAILY).length;
		await filterChip(page, fixture.names.teamA).click();
		expect(await chipsOf(page)).toEqual([]);
		expect(
			reads.paramsOf(DAILY).length,
			'finding 13: the unfiltered query is still fresh, so nothing is re-read'
		).toBe(dailyReadsBeforeRemove);

		// a member pick: employeeIds[0] on all three reads, and only the roster-driven cards follow it (finding 7)
		await filterTrigger(page).click();
		await page.getByRole('menuitem', { name: EN.common.MEMBERS, exact: true }).first().hover();
		const memberBox = page.getByRole('menuitemcheckbox', { name: fixture.names.teammate, exact: false }).first();
		await expect(memberBox).toBeVisible({ timeout: 15_000 });
		await memberBox.click();
		expect(await flatText(filterTrigger(page))).toBe(`${EN.common.FILTER} 1`);
		expect(await chipsOf(page)).toEqual([msg('dashboard.team.filters.REMOVE', { value: fixture.names.teammate })]);
		expect(reads.paramsOf(DAILY).at(-1)?.['employeeIds[0]']).toBe(fixture.ids.teammateEmployee);
		expect(reads.paramsOf(DAILY).at(-1)?.['teamIds[0]']).toBeUndefined();
		expect(reads.paramsOf(COUNTS).at(-1)?.['employeeIds[0]']).toBe(fixture.ids.teammateEmployee);
		expect(reads.paramsOf(LOGS).at(-1)?.['employeeIds[0]']).toBe(fixture.ids.teammateEmployee);

		expect(await cardText(page, T.figures.WORKING_NOW)).toContain(
			`0 ${msg('dashboard.team.figures.OF_TOTAL', { total: 1 })}${T.figures.NOBODY_TRACKING}`
		);
		expect(await cardText(page, T.figures.TRACKED_TODAY)).toContain(`0h 0m${T.today.NO_PLAN}`); // finding 6
		await expect(card(page, T.cards.TASKS_BY_STATUS).getByText(T.tasks.EMPTY, { exact: true })).toHaveCount(1);
		expect(await cardMeta(page, T.cards.TEAM_MEMBERS)).toBe(msg('dashboard.team.table.MEMBER_COUNT', { count: 1 }));
		expect(await cardRows(page, T.cards.TEAM_MEMBERS)).toEqual([
			`FT${fixture.names.teammate}MemberNot started––1h 45m2${PROJECT_TWO.name}`
		]);
		// the picked member's lane is named from the roster; a log of a member the filter left out is named from the
		// member node its answer carried (`Served Name A`), and `dashboard.team.UNNAMED_MEMBER` only stands in when an
		// answer carries no member at all (measured that way in `-5` Q8, whose served logs carried no member node)
		expect(await cardText(page, T.timeline.TITLE)).toContain(`${fixture.names.teammate}1h 30m`);
		expect(await cardText(page, T.timeline.TITLE)).toContain(`${SERVED_A.name}1h 0m`);
		// the card's own figures follow the served answer, not the filter, and its not-started line follows the roster:
		// one picked member, nobody left not started, so the line is gone
		expect(await cardMeta(page, T.timeline.TITLE)).toBe(
			msg('dashboard.team.timeline.META', { day: clock.shortToday, duration: '2h 30m', count: 2 })
		);
		await expect(card(page, T.timeline.TITLE)).not.toContainText(
			msg('dashboard.team.live.NOT_STARTED', { count: 1 })
		);
		expect(await cardText(page, T.figures.THIS_PERIOD)).toContain(
			`5h 15m${msg('dashboard.team.figures.OVER_DAYS', { days: 3 })} · ${msg('dashboard.team.META_MEMBERS', { count: 2 })}`
		);

		await closeFilterMenu(page);
		await page.getByRole('button', { name: EN.common.CLEAR_FILTERS, exact: true }).first().click();
		expect(await chipsOf(page)).toEqual([]);
		expect(await flatText(filterTrigger(page))).toBe(EN.common.FILTER);
		expect(await toolbarMeta(page)).toBe(
			`${clock.last7Text} · ${msg('dashboard.team.META_MEMBERS', { count: 3 })}`
		);

		report('12 filters', {
			menuItemsWhileOpen,
			chipsAfterClear: await chipsOf(page),
			teamPickKeys: Object.keys(teamPickParams)
				.filter((key) => key.startsWith('teamIds') || key === 'includeTimeWithoutTeam')
				.map((key) => `${key}=${JSON.stringify(teamPickParams[key])}`),
			readShapes: reads.shapes()
		});
	});

	test('13 · export: the CSV name, its header and its rows, and the PDF name', async ({ page, fixture }) => {
		test.setTimeout(120_000);
		const clock = clockOf();
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		await exportButton(page).click();
		await expect(page.getByRole('menuitem', { name: EN.common.PDF, exact: true })).toHaveCount(1);
		await expect(page.getByRole('menuitem', { name: T.export.CSV, exact: true })).toHaveCount(1);

		const csvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: T.export.CSV, exact: true }).click();
		const csv = await csvEvent;
		expect(csv.suggestedFilename()).toBe(`team-report-${clock.fromKey}-${clock.todayKey}.csv`);

		const lines = readFileSync(await csv.path(), 'utf8').split(/\r?\n/);
		expect(lines[0]).toBe(
			`\ufeff${[T.export.DATE, T.table.MEMBER, T.export.PROJECT, T.export.TRACKED_HOURS, T.export.ACTIVITY_PERCENT].join(',')}`
		);
		expect(lines.length).toBe(6);
		expect(lines.slice(1)).toEqual([
			`${dayKey(2)},${SERVED_A.name},${EN.dashboard.NO_TEAM_GROUP},2:00,90`,
			`${dayKey(2)},${SERVED_B.name},${T.projects.NONE},0:15,30`,
			`${dayKey(1)},${SERVED_A.name},${PROJECT_ONE.name},0:30,50`,
			`${dayKey(0)},${SERVED_A.name},${PROJECT_ONE.name},1:00,80`,
			`${dayKey(0)},${SERVED_B.name},${PROJECT_TWO.name},1:30,40`
		]);

		await page.keyboard.press('Escape');
		await exportButton(page).click();
		const pdfEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: EN.common.PDF, exact: true }).click();
		const pdf = await pdfEvent;
		expect(pdf.suggestedFilename()).toBe(`team-report-${clock.fromKey}-${clock.todayKey}.pdf`);

		report('13 export', {
			csvName: csv.suggestedFilename(),
			pdfName: pdf.suggestedFilename(),
			header: lines[0],
			rows: lines.length - 1
		});
	});

	test('14 · a refused daily read: the notice in the two report cards, the rest intact, and Try again', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(120_000);
		await answer(page, DAILY, null, { status: 500 });
		await answer(page, COUNTS, { employeesCount: 3, projectsCount: 2 });
		await answer(page, LOGS, servedLogsOf(fixture));
		const reads = recordReads(page, [DAILY]);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		const retry = page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true });
		for (const title of [T.cards.TIME_BY_DAY, T.projects.TITLE]) {
			await expect(card(page, title).getByText(EN.dashboard.states.ERROR_TITLE, { exact: true })).toHaveCount(1);
			await expect(card(page, title).getByText(EN.dashboard.states.ERROR_MESSAGE, { exact: true })).toHaveCount(
				1
			);
			// one retry button per notice, two on the page
			await expect(
				card(page, title).getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true })
			).toHaveCount(1);
		}
		await expect(retry).toHaveCount(2);

		// the cards that never read the report keep their content, with a dash where a figure would be
		expect(await cardText(page, T.figures.THIS_PERIOD)).toContain(
			`–${msg('dashboard.team.figures.OVER_DAYS', { days: 0 })} · ${msg('dashboard.team.META_MEMBERS', { count: 0 })}`
		);
		expect(await cardRows(page, T.cards.TEAM_MEMBERS)).toEqual([
			`FM${fixture.names.user}ManagerNot started#1${fixture.names.task}––––`,
			`FT${fixture.names.denied}MemberNot started–––––`,
			`FT${fixture.names.teammate}MemberNot started–––––`
		]);
		expect(await cardText(page, T.heatmap.TITLE)).toContain(
			msg('dashboard.team.heatmap.BUSIEST', { duration: '1h 0m' })
		);
		expect(await cardRows(page, T.cards.TASKS_BY_STATUS)).toEqual(['open1100%']);
		await expect(
			card(page, T.cards.TASKS_BY_STATUS).getByText(T.tasks.NO_IN_PROGRESS, { exact: true })
		).toHaveCount(1);

		expect(
			shield.logMatching(armedRead(DAILY_LOG_PATH, 500)).length,
			'the refusal this file armed was not logged by the client'
		).toBeGreaterThan(0);
		expect(
			consoleFindings(shield, [armedRead(DAILY_LOG_PATH, 500)]),
			'a console error that was not the refusal this file armed'
		).toEqual([]);

		// Try again reads again; only "more than before" is pinned, because retries vary
		const before = reads.paramsOf(DAILY).length;
		await retry.first().click();
		await expect.poll(() => reads.paramsOf(DAILY).length, { timeout: 25_000 }).toBeGreaterThan(before);
		await expect(
			card(page, T.cards.TIME_BY_DAY).getByText(EN.dashboard.states.ERROR_TITLE, { exact: true })
		).toHaveCount(1);

		report('14 refused daily', {
			notices: await page.getByText(EN.dashboard.states.ERROR_TITLE, { exact: true }).count(),
			retryButtons: await retry.count(),
			dailyReadsBeforeRetry: before,
			dailyReadsAfterRetry: reads.paramsOf(DAILY).length
		});
	});

	test('15 · a refused logs read: the notice in Hours of work and in Today, the report cards untouched', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(120_000);
		await answer(page, DAILY, dailyReportOf(SERVED_ROWS, fixture));
		await answer(page, COUNTS, { employeesCount: 3, projectsCount: 2 });
		await answer(page, LOGS, null, { status: 500 });
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA));

		for (const title of [T.heatmap.TITLE, T.timeline.TITLE]) {
			await expect(card(page, title).getByText(EN.dashboard.states.ERROR_TITLE, { exact: true })).toHaveCount(1);
			await expect(card(page, title).getByText(EN.dashboard.states.ERROR_MESSAGE, { exact: true })).toHaveCount(
				1
			);
			await expect(
				card(page, title).getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true })
			).toHaveCount(1);
		}
		expect(await cardText(page, T.figures.THIS_PERIOD)).toContain('5h 15m');
		expect(await cardRows(page, T.projects.TITLE)).toHaveLength(4);
		expect(await cardRows(page, T.cards.TEAM_MEMBERS)).toHaveLength(3);
		expect(await cardCells(page, T.heatmap.TITLE).count()).toBe(0);

		expect(
			consoleFindings(shield, [armedRead(LOGS_LOG_PATH, 500)]),
			'only the armed logs refusal may be on the console'
		).toEqual([]);

		report('15 refused logs', {
			notices: await page.getByText(EN.dashboard.states.ERROR_TITLE, { exact: true }).count(),
			memberRows: await memberRows(page).count()
		});
	});

	test('16 · a team id the person is not in, and a refused teams read', async ({ page, fixture, mock, shield }) => {
		test.setTimeout(120_000);
		const foreignId = '33333333-3333-4333-8333-999999999999';
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(foreignId));

		// finding 10: the route id is unknown to the mock, the active team is drawn anyway
		const foreignPath = new URL(page.url()).pathname;
		expect(foreignPath).toBe(pagePathOf(foreignId));
		await expect(
			page.getByRole('heading', { level: 1, name: EN.dashboard.TEAM_DASHBOARD, exact: true })
		).toHaveCount(1);
		expect(flat(await page.locator('nav[aria-label="breadcrumb"]').textContent())).toBe(
			`${fixture.names.teamA}${EN.dashboard.TEAM_DASHBOARD}`
		);
		expect(await cardMeta(page, T.cards.TEAM_MEMBERS)).toBe(msg('dashboard.team.table.MEMBER_COUNT', { count: 3 }));
		await expect(memberRows(page)).toHaveCount(3);

		// finding 11: the teams read refused, so the roster never settles
		await serveReport(page, fixture);
		await signInAndVisit(page, fixture, pagePathOf(fixture.ids.teamA), {
			requireShell: false,
			scenario: { fails: { [TEAM_LIST]: 500 } }
		});
		await expect(
			page.getByRole('heading', { level: 1, name: EN.dashboard.TEAM_DASHBOARD, exact: true })
		).toHaveCount(1);
		const marks = await page.evaluate(() => performance.getEntriesByType('mark').map((mark) => mark.name));
		expect(marks).not.toContain('ever-teams:shell-ready');
		await expect(card(page, T.heatmap.TITLE)).toHaveAttribute('aria-busy', 'true');
		await expect(card(page, T.timeline.TITLE)).toHaveAttribute('aria-busy', 'true');
		await expect(card(page, T.cards.TIME_BY_DAY)).toContainText('2h 15m');
		await expect(card(page, T.cards.TIME_BY_DAY)).toContainText('2h 30m');
		await expect(card(page, T.projects.TITLE)).toContainText(`${EN.dashboard.NO_TEAM_GROUP}2h 0m`);
		await expect(memberRows(page)).toHaveCount(0);
		expect(await card(page, T.cards.TEAM_MEMBERS).locator('[class*="animate-pulse"]').count()).toBeGreaterThan(0);

		const refused = (await mock.paths()).filter((path) => path.includes(TEAM_LIST));
		expect(refused.length).toBeGreaterThan(0);
		expect(
			consoleFindings(shield, [armedRead(TEAM_LIST_LOG_PATH, 500)]),
			'only the armed teams refusal may be on the console'
		).toEqual([]);

		await mock.scenario({ fails: {} });
		report('16 odd teams', {
			foreignPath,
			marks,
			refusedTeamReads: refused.length,
			memberRowsWhileRefused: await memberRows(page).count()
		});
	});
});
