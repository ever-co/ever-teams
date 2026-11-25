import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type BootstrapFixture, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, devOverlayErrors, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What **Reports › Time and activity** (`/reports/time-and-activity`) shows and sends, on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`). It signs in as the mock's team manager
 * (`fixture.names.user` = "Fixture Manager", `isManager: true`), so the manager-only figures are on screen; who may
 * open the page at all is `suites/lane-a/reports-gate-by-role-ui.spec.ts`.
 *
 * ## The code this file drives (every `file:line` read out of its file before it is named)
 *
 * - `app/[locale]/(main)/reports/time-and-activity/page.tsx:13` gates the page with `withAuthentication(TimeAndActivity…)`;
 *   `core/components/dashboards/time-activity/time-activity-page.tsx:101-141` is the page: the breadcrumb (`:85-101`),
 *   `TimeActivityReportSheet` (`:105`), `TimeActivityTimeSplit` (`:124`), then either `TimeActivityWeekGrid` (`:126`,
 *   grouping `week`) or `TimeActivityBreakdown` (`:136`) with the notice under it (`:42` `LabelOverlapNotice`).
 * - Three reads, all to the mock origin: the daily report `core/hooks/dashboards/time-activity/use-time-activity-queries.ts:60-77`
 *   (`groupBy:'date'`, `activityLevel {0,100}`) → `core/services/client/api/timesheets/time-log.service.ts:553-626`,
 *   which **validates nothing** and returns `response.data`; the counts read `:86-96` (`logType:['TRACKED']`) →
 *   `core/services/client/api/timesheets/statistic.service.ts`; and, for the week view, `getTimeLogReportWeekly`
 *   (`time-log.service.ts:636-681`), the only one of the three validated with zod (`timeLogReportWeeklySchema.array()`,
 *   `:668-672`, logged at `:676`). The billable read is the same daily read with `billableOnly=true&withClientRates=true`
 *   (`use-time-activity-report.ts` `billableRequestOf`), asked only of a holder of the rate-admin permission; a billable
 *   *filter* asks it as `billableOnly=true` without the rate parameters, and then the sheet sums its figures from the
 *   rows (`use-time-activity-report.ts` `sumsFiguresFromRows`).
 * - Groupings and their columns: `TIME_ACTIVITY_GROUPINGS` `core/lib/utils/dashboards/time-activity.ts:38`, the label
 *   grouping added by `offeredGroupingsOf` (`:116-130`), the link parameter `groupBy` (`:41`), the columns (`:134-140`),
 *   the row order `compareNodes` (`:1621`: seconds first, then the key), the Monday week start `TIME_ACTIVITY_WEEK_START = 1`
 *   (`:1054`), the overlap test `labelGroupsOverlap` (`:1580`: any fact with more than one label).
 * - What each row prints and how it opens: `time-activity-breakdown.tsx` `breakdownColumnsOf` (`:82-101`), the column
 *   headers `HeaderCells` (`:745-791`, the Rank header is an `sr-only` span), the row cells (`:575-659`: `role="row"`
 *   with `role="rowheader"` / `role="cell"`), `CountPill` (`:451-458`, a number plus an `sr-only` label, which is why a
 *   cell reads "2" then "2 members"), the subject toggle `SubjectCell` (`:467-491`, a `button[aria-expanded]` only when
 *   the node has children), the totals row `TotalsCells` (`:812-830`), the empty block (`:862-895`), Expand all /
 *   Collapse all (`toggleAllLabelOf` `:962-967`); only the largest node opens by default
 *   (`core/hooks/dashboards/time-activity/use-time-activity-breakdown.ts:32-39`).
 * - The figures and their hints: `time-activity-summary-band.tsx` — `bandFiguresOf` (`:252-271`) draws total, then
 *   breaks **only when the period has any** (`breaksFigureOf` `:229-245`: `breakSeconds <= 0` returns no figure), then
 *   activity, then earnings (manager only), then billable (when offered), then members; each figure is a
 *   `div[title=<hint>] > dt + dd` (`FigureItem` `:290-313`) and a missing value is `MISSING_VALUE = '–'` (`:25`) with the
 *   reason in an `sr-only` span (`MissingValue` `:57-64`); `TimeActivityBandExport` `canExport = hasRows && !isPending && !isError`
 *   (`:366-368`).
 * - Filters: `time-activity-filter-menu.tsx` — the trigger `Filter` + its count chip (`:43`, `:239-243`), one submenu per
 *   field (`:167-214`, a field with no options and no choice reads `filters.NONE` `:179`), options as
 *   `Menu.CheckboxItem` (`:134-147`), the per-field Clear (`:200-208`), "Clear filters" (`:256-264`), and the chips with
 *   their `filters.REMOVE` buttons (`AppliedTimeActivityFilters` `:291-349`). `use-time-activity-settings.ts`: teams /
 *   members / projects / tasks go to **both** the link (`time-activity-link.ts:31-36`) and `localStorage`
 *   (`TIME_ACTIVITY_FILTERS_STORAGE_KEY` `time-activity.ts:189`), while billable, clients and labels are **link only**
 *   (`use-time-activity-settings.ts:44-48`, `:121-134`); `clearFilters` empties both (`:144-150`). Columns are kept in
 *   `localStorage` (`TIME_ACTIVITY_COLUMNS_STORAGE_KEY` = `ever-teams-activity-view-options`, `time-activity.ts:191`,
 *   `toggleColumn` `:168-173`).
 * - The view menu: `time-activity-view-menu.tsx` — `aria-pressed` buttons (`:46-67`), which columns are offered
 *   (`columnsOfferedFor` `:30-44`), all of them disabled in the week grid with the note `view.WEEK_NOTE_V2` (`:104`,
 *   `:109-113`).
 * - The period: `core/components/dashboards/kit/period-picker.tsx` — `role="group"` (`:117`), previous/next (`:118-125`,
 *   `:165-172`), the preset rows (`:135-149`), a `react-day-picker` range calendar whose first click only stores a draft
 *   and whose second click picks and closes (`handleRangeSelect` `:100-112`, `:152-161`); a stepped period lands in the
 *   link as `from`/`to`, a preset as `period=` (`time-activity-link.ts:24-35`, `:89-112`).
 * - Export: `time-activity-export-menu.tsx` (`FILE_PREFIX = 'time-activity-report'` `:62`, `csvColumnsOf` `:298-325`) and
 *   `periodFileNameOf` (`core/lib/utils/dashboard-export.ts:86-88`) → `<prefix>-<from>-<to>.<ext>`, both days written in
 *   the browser's own zone.
 *
 * ## What is real and what this file serves
 *
 * The lane's mock answers the daily report and the counts with nothing (`cypress/support/mock-gauzy-server.mjs`), so
 * every figure-bearing case here is served by this file with `page.route` on the mock origin only (CORS restated from
 * `mock-gauzy-server.mjs`, `OPTIONS` answered 204), and every request is read from what the browser really sent — never
 * `route.fetch()`. Nothing outside those paths is stubbed: the shell, the workspace, the user, the team and its three
 * members ("Fixture Manager", "Fixture Teammate", `fixture.names.denied` = "Fixture Restricted Teammate"), the
 * organisation (currency `USD`) and the labels stay the mock's own. No token or header value is printed or asserted.
 * Saved reports are out of scope by the brief: only the menu's own button is checked (test 1).
 *
 * ## Where the numbers came from
 *
 * Throwaway probes on this lane, all on 2026-11-25, each with a config that has no `webServer`
 * (`E:\Coding\.tmp\probe-timeactivity\probe.config.mjs`): `probe1.spec.ts` → `E:\Coding\.tmp\probe-1.log` (the grouping
 * tabs and each table's `aria-label`; its *cell* strings are unreadable — see finding 10 — so nothing is pinned from
 * them); `probe2.spec.ts` → `probe-2.log` (the empty page exactly as the mock answers it, the served sheet's
 * `dt`/`dd`/`title` triplets, the week grid's columns and its "Outside the period" titles and the previous week, the view
 * menu and its reload, the period picker's previous/next/presets and the 10th → 14th calendar range, the three export
 * downloads with their file names and the CSV header, the three armed 500s, the label grouping with and without overlap);
 * `probe3.spec.ts` → `probe-3.log` (the filter menu's items and the member submenu, the member filter's
 * query/URL/chip/`localStorage`, the Billable filter's own read, what switching a grouping re-reads, the split rows and
 * the day bars' text, a malformed daily answer, malformed counts, a malformed weekly answer). This file serves the
 * probes' own rows (`Row ta-alpha`, `Task ta-one`, …), so every pinned string is one a probe log printed for the same
 * served data. What the probes could not print — the CSV body against this file's served set, the expanded row counts,
 * the calendar's own cell text — was printed by this file's own first run `E:\Coding\.tmp\s3-lane-a-timeactivity-1.log`;
 * every test prints its own `[lane-a time-activity] MEASURE …` line.
 *
 * Dates come from the browser's clock (`browserClock`): never a pinned day, never a hard-coded zone. The lane ran in
 * `Europe/Madrid` while the mock's profile says `UTC`, which is what the notice under `main output` prints; this file
 * asserts only zones that string carries, read back from the browser itself.
 *
 * ## Findings (measured, with the line that explains them)
 *
 * 1. **Switching a grouping re-reads nothing.** Date → Member → Project → Date issued no new request at all (the daily
 *    query stays `groupBy=date` whatever the switch shows), and only Week asked `report/weekly` (`probe-3.log` p3, test 3).
 *    The rows are computed from rows already loaded: the grouping is a view, not a query.
 * 2. **`groupBy=date` in the query, but the date view ranks by time, not by date.** With 3h 0m yesterday and 2h 15m
 *    today, rank 1 was **Yesterday** and rank 2 **Today** (`probe-3.log` "after Date rows", tests 2 and 3):
 *    `compareNodes` (`time-activity.ts:1621`) sorts by seconds first, then by the key.
 * 3. **The mock's own project never reaches the Projects filter.** `isProject` (`core/lib/helpers/type-guards.ts:29-42`)
 *    needs `status`, `billing`, `billingFlat`, `budget`, `budgetType`, `projectUrl`, `teams` and `currency`, and
 *    `mock-gauzy-server.mjs:226-238` carries only `name`, `public`, `owner`, `code`, `currency`, `members`, `teams`,
 *    `tags`, so the Projects submenu reads "None" exactly as the Teams submenu does for a manager with no managed team
 *    (`time-activity-filter-menu.tsx:165`, `:179`, test 8). Member and Billable filters, which the mock does serve, are
 *    used instead. Serving projects oneself does not help either: a stub without those fields puts a
 *    `Open OrganizationProjectService.getOrganizationProjects in editor` button on screen (a Next.js dev overlay error),
 *    which is `probe-2.log` p2's `regions` line — this file therefore never stubs `/api/organization-projects`.
 * 4. **A member filter is saved twice, a Billable filter only once.** Picking a member wrote `?members=<employeeId>`
 *    *and* `ever-teams-activity-filters` `{"teamIds":[],"employeeIds":["…"],"projectIds":[],"taskIds":[]}`; ticking
 *    Billable wrote `?billable=true` and left `localStorage` at `null` (`probe-3.log` p1/p2, test 8) — the two halves of
 *    `use-time-activity-settings.ts:44-48`. The grouping lives only in the link and the hidden columns only in
 *    `localStorage` (`{"hiddenColumns":["activity"]}`, test 7), so a reload keeps the columns and the member filter and
 *    keeps neither the grouping nor the Billable tick unless the link carried them.
 * 5. **A malformed answer is absorbed by two of the three reads and reported by the third.** An object where the daily
 *    report should be an array answered HTTP 200 and the page showed no rows, a disabled export and "0h 0m 5h 15m by
 *    timer" beside it, with **no console error and no notice** (`probe-3.log` "malformed daily", test 12) — that read is
 *    returned unvalidated (`time-log.service.ts:624-626`). Malformed counts behaved the same way ("5h 15m 0h 0m by
 *    timer", `– No tracked time`) and left the rows on screen. A malformed weekly row failed the schema and said so: one
 *    "This part of the report could not load" notice plus `[ERROR] [App] Weekly report validation failed: …
 *    getTimeLogReportWeekly API response …` (`probe-3.log` "malformed weekly", test 12c).
 * 6. **A refused read shows one notice per block that needs it, not one per request.** Refusing the daily read put a
 *    notice in the sheet, in the split and in the table (three notices, four `Try again` buttons) and left the counts
 *    figures alive; refusing the counts read left one notice, set only Activity to `– Could not load` and left all five
 *    rows; refusing the weekly read left one notice and no week rows (`probe-2.log` p8, tests 11, 11b, 11c). The client
 *    retries, so the number of failed requests is never pinned.
 * 7. **Nothing opens a report sheet.** A row's subject is a `button[aria-expanded]` (`time-activity-breakdown.tsx:486`);
 *    expanding one draws nested rows inside the same `role="table"` and no dialog appears (test 4:
 *    `getByRole('dialog')` count 0 while nested rows are on screen). "The report sheet" on this page is the section
 *    `sheet.LABEL` = "Report of the period", i.e. the figures band, which is always open.
 * 8. **The week grid's empty day cells are two different things.** A day inside the period with no entry reads `0h`; a day
 *    the period does not cover is an empty cell whose column header carries `title` = `week.OUTSIDE_PERIOD`
 *    (`time-activity-week-grid.tsx:131`, `:196`, test 6), and the entry sitting on the period's first day appeared as
 *    `0h 10m` only after the grid was walked back a week (`probe-2.log` p3).
 * 9. **`role="row"` is not the same as "a row is on screen".** While a block loads, the grid keeps mounted rows that hold
 *    no cell at all (7 of them in the week grid, 8 in the breakdown: `probe-2.log` "empty rows" and
 *    `probe-3.log` "after Date rows"). Every row count in this file therefore counts only `role="row"` elements that
 *    hold a `rowheader`/`cell` (`gridRows` above): 0 for the empty page, 5 for the served date view.
 * 10. **A probe run can print cell text with letters missing.** `probe-1.log` printed `"Ye terdayNov 24…"`,
 *    `"Ta k"`, `"Earning"` for text that `probe-2.log` and `probe-3.log` printed correctly in the same served data, so
 *    nothing here is pinned from `probe-1.log`'s strings, only from its request strings.
 * 11. **Not covered here, and why.** The saved-reports menu and the share panel (`saved-reports-menu.tsx`,
 *    `saved-report-*.tsx`, `use-saved-reports.ts`, `use-shared-report-token.ts`) are out of scope by the brief — only the
 *    `savedReports.MENU` button is checked (test 1). The PDF's *bytes* are never read, only its file name, per the brief.
 *    The breaks figure is unreachable: the mock answers no break seconds, so `breakSeconds` stays 0 and `breaksFigureOf`
 *    returns no figure (`time-activity-summary-band.tsx:241-243`) — test 1 pins that as the band holding exactly five
 *    figures. The client grouping needs a client filter, which needs a listed client, so it is unreachable with this mock
 *    (finding 3); test 1 pins that its tab is *not* on the switch. The 60-second live re-read of a range that covers
 *    today is not pinned either: no test here counts requests of one path, only what each request carried.
 *
 * ## Console
 *
 * `shield.consoleErrors()` was empty in every healthy case measured, including the malformed daily and counts answers
 * (`probe-3.log` p5/p6). The armed refusals print exactly `Failed to load resource: the server responded with a status of
 * 500 (Internal Server Error)` and `[ERROR] [HttpClient] HTTP Error: GET <path>?<query> 500 {…}`
 * (`core/services/logs/logger-adapter.service.ts`), and only those named lines are excused, with the path and the armed
 * status in the pattern (`armedRead`). The malformed weekly answer prints `[ERROR] [App] Weekly report validation
 * failed: …`. Counts of such lines are never pinned: the client retries (`core/query/config/index.ts`) and `next dev`
 * mounts twice, so the same armed refusal printed 2 of them in one probe and 4 in another.
 */

const PAGE_PATH = '/reports/time-and-activity';
const DAILY_PATH = '/api/timesheet/time-log/report/daily';
/** The same read as the client logs it (`error.config.url`, no `/api` prefix): `probe-2.log` p8. */
const DAILY_LOG_PATH = '/timesheet/time-log/report/daily';
const COUNTS_PATH = '/api/timesheet/statistics/counts';
const COUNTS_LOG_PATH = '/timesheet/statistics/counts';
const WEEKLY_PATH = '/api/timesheet/time-log/report/weekly';
const WEEKLY_LOG_PATH = '/timesheet/time-log/report/weekly';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** Only the namespaces this file reads, so a key that does not exist is a type error rather than `undefined`. */
type Leaf = Record<string, string>;
type Messages = {
	common: Leaf;
	clients: Leaf;
	pages: { unauthorized: Leaf };
	timeActivity: Leaf;
	timeReports: { filters: Leaf };
	timer: { labels: Leaf };
	breaks: Leaf;
	dashboard: {
		states: Leaf;
		period: Leaf;
		savedReports: Leaf;
		timesheets: Leaf;
		team: { export: Leaf; projects: Leaf };
		timeActivity: {
			grouping: Leaf;
			view: Leaf;
			columns: Leaf;
			figures: Leaf;
			filters: Leaf;
			chart: Leaf;
			table: Leaf;
			week: Leaf;
			export: Leaf;
			sheet: Leaf;
			breakdown: Leaf;
			empty: Leaf;
		} & Leaf;
	};
};

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as Messages;
const TA = EN.dashboard.timeActivity;
const LABEL_TITLE: string = EN.timer.labels.BY_LABEL_TITLE;
/** `MISSING_VALUE` (`time-activity-summary-band.tsx:25`): a figure or a cell that has no value starts with it. */
const MISSING_VALUE = '–';

/* --------------------------------------------- messages ----------------------------------------------- */

/** The ICU parts these keys use: `{name}`/`{value}`/`{period}`/`{duration}`/`{week}`/`{count}` and `{count, plural, …}`. */
function readBraced(text: string, from: number): [string, number] {
	let depth = 0;
	for (let index = from; index < text.length; index += 1) {
		if (text[index] === '{') depth += 1;
		else if (text[index] === '}') {
			depth -= 1;
			if (depth === 0) return [text.slice(from + 1, index), index + 1];
		}
	}
	return [text.slice(from), text.length];
}

function resolvePlural(count: number, body: string): string {
	const branches: Record<string, string> = {};
	let index = 0;
	while (index < body.length) {
		const branch = /^(=[0-9]+|zero|one|two|few|many|other)/.exec(body.slice(index));
		if (!branch) {
			index += 1;
			continue;
		}
		index += branch[0].length;
		while (index < body.length && body[index] !== '{') index += 1;
		const [inner, next] = readBraced(body, index);
		branches[branch[0]] = inner;
		index = next;
	}
	const chosen = branches[`=${count}`] ?? (count === 1 ? branches.one : branches.other) ?? '';
	return chosen.replace(/#/g, String(count));
}

function msg(key: string, values: Record<string, string | number> = {}): string {
	const raw = key.split('.').reduce((node: unknown, part) => (node as Record<string, unknown>)?.[part], EN) as string;
	let out = '';
	let index = 0;
	while (index < raw.length) {
		if (raw[index] !== '{') {
			out += raw[index];
			index += 1;
			continue;
		}
		const [inner, next] = readBraced(raw, index);
		if (/^count,\s*plural,/.test(inner)) {
			out += resolvePlural(Number(values.count ?? 0), inner.replace(/^count,\s*plural,/, ''));
		} else {
			const value = values[inner.trim()];
			out += value === undefined ? `{${inner}}` : String(value);
		}
		index = next;
	}
	return out;
}

const figureDays = (count: number) => msg('dashboard.timeActivity.figures.TRACKED_DAYS', { count });
const figureProjects = (count: number) => msg('dashboard.timeActivity.figures.MEMBERS_PROJECTS', { count });
const billableNote = (duration: string) => msg('dashboard.timeActivity.figures.BILLABLE_TIME', { duration });
const timerNote = (duration: string) => msg('dashboard.timeActivity.sheet.BY_TIMER', { duration });
const metaMembers = (count: number) => msg('dashboard.timeActivity.META_MEMBERS', { count });
const weekNumber = (week: number) => msg('dashboard.timeActivity.week.WEEK_NUMBER', { week });
const emptyTitle = (period: string) => msg('dashboard.timeActivity.empty.TITLE', { period });
const removeChip = (value: string) => msg('dashboard.timeActivity.filters.REMOVE', { value });
/** A band figure with no value: `– <reason>` (`probe-2.log` "band dd"). */
const bandMissing = (reason: string) => `${MISSING_VALUE} ${reason}`;
/** A table cell with no value: `–<reason>` (`probe-3.log` "after Date rows"). */
const cellMissing = (reason: string) => `${MISSING_VALUE}${reason}`;
const noRate = cellMissing(TA.table.NO_RATE);
const noBillable = cellMissing(TA.figures.BILLABLE_NONE);
/** The count beside a row's name: `CountPill` prints the number, then the `sr-only` label (`time-activity-breakdown.tsx:451-458`). */
const countPill = (key: string, count: number) => `${count}${msg(key, { count })}`;
const memberPill = (count: number) => countPill('dashboard.timeActivity.table.MEMBERS', count);
const projectPill = (count: number) => countPill('dashboard.timeActivity.table.PROJECTS', count);
/** A totals row prints `Total <label>`, with no second number (`TotalsCells` `:816-821`). */
const totalsPill = (key: string, count: number) => `${EN.common.TOTAL}${msg(key, { count })}`;

/** The figures in the order `bandFiguresOf` draws them (`time-activity-summary-band.tsx:252-271`). */
const BAND_TERMS = [
	TA.figures.TRACKED,
	TA.columns.ACTIVITY,
	TA.columns.EARNINGS,
	TA.columns.BILLABLE,
	TA.figures.MEMBERS
];

/** The CSV header exactly as `csvColumnsOf` (`time-activity-export-menu.tsx:298-325`) builds it for a manager. */
const CSV_HEADER = [
	EN.common.DATE,
	EN.common.MEMBER,
	TA.grouping.PROJECT,
	TA.export.TASK,
	TA.export.STATUS,
	EN.timer.labels.LABELS,
	TA.export.TRACKED_HOURS,
	TA.columns.EARNINGS,
	TA.export.CURRENCY,
	TA.export.BILLABLE_HOURS,
	TA.columns.BILLABLE,
	TA.export.BILLABLE_CURRENCY,
	TA.export.ACTIVITY_PERCENT
].join(',');

const report = (label: string, value: unknown) =>
	console.log(`[lane-a time-activity] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const textOf = (node: Element) => (node.textContent || '').replace(/\s+/g, ' ').trim();

const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** Only the exact refusal a test armed, path and status included: `[HttpClient] HTTP Error: GET <path>?<query> <status> `. */
const armedRead = (path: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${path}(\?\S*)? ${status} `);
const FAILED_RESOURCE = /Failed to load resource/;
const VALIDATION_LINE = /Weekly report validation failed/;
const consoleFindings = (shield: Shield, excused: RegExp[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !excused.some((pattern) => pattern.test(line)));

/* --------------------------------------------- the browser clock ------------------------------------- */

/**
 * Today, the last-7-days bounds, the week the grid draws, the 10th and the 14th of the month the calendar opens on
 * (`defaultMonth={value.from}`, `period-picker.tsx:156`), and the labels the page prints for them — all from the
 * browser's own clock and zone (the page formats a period with the same `Intl.DateTimeFormat` range:
 * `core/lib/utils/dashboard-period.ts:148-163`).
 */
function browserClock(page: Page) {
	return page.evaluate(() => {
		const now = new Date();
		const pad = (value: number) => String(value).padStart(2, '0');
		const key = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
		const from = (offset: number) => {
			const moved = day(offset);
			return new Date(moved.getFullYear(), moved.getMonth(), moved.getDate(), 0, 0, 0, 0);
		};
		const to = (offset: number) => {
			const moved = day(offset);
			return new Date(moved.getFullYear(), moved.getMonth(), moved.getDate(), 23, 59, 59, 999);
		};
		const dayFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
		const weekdayFormat = new Intl.DateTimeFormat('en', { weekday: 'short' });
		const periodText = (start: Date, end: Date) => dayFormat.formatRange(start, end);
		// Monday-based week containing today (`TIME_ACTIVITY_WEEK_START = 1`, `time-activity.ts:1054`)
		const mondayIndex = (date: Date) => (date.getDay() + 6) % 7;
		const weekStartDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayIndex(now), 0, 0, 0, 0);
		const isoWeekOf = (date: Date) => {
			const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
			target.setDate(target.getDate() - mondayIndex(target) + 3);
			const firstThursday = new Date(target.getFullYear(), 0, 4);
			firstThursday.setDate(firstThursday.getDate() - mondayIndex(firstThursday) + 3);
			return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 86_400_000);
		};
		const columnsOf = (start: Date) => {
			const out: Array<{ key: string; label: string }> = [];
			for (let offset = 0; offset < 7; offset += 1) {
				const column = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset, 12, 0, 0, 0);
				out.push({ key: key(column), label: `${column.getDate()} ${weekdayFormat.format(column)}` });
			}
			return out;
		};
		const last7From = from(-6);
		const last7To = to(0);
		const previousFrom = from(-13);
		const previousTo = to(-7);
		const weekStart = weekStartDay < last7From ? last7From : weekStartDay;
		const previousWeekStart = new Date(
			weekStartDay.getFullYear(),
			weekStartDay.getMonth(),
			weekStartDay.getDate() - 7,
			0,
			0,
			0,
			0
		);
		const customFrom = new Date(last7From.getFullYear(), last7From.getMonth(), 10, 0, 0, 0, 0);
		const customTo = new Date(last7From.getFullYear(), last7From.getMonth(), 14, 23, 59, 59, 999);
		const periodDays: Array<{ key: string; label: string }> = [];
		for (let offset = -6; offset <= 0; offset += 1) {
			const moved = day(offset);
			periodDays.push({ key: key(moved), label: weekdayFormat.format(moved) });
		}
		return {
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			todayKey: key(now),
			yesterdayKey: key(day(-1)),
			firstPeriodDayKey: key(day(-6)),
			todayLabel: dayFormat.format(day(0)),
			yesterdayLabel: dayFormat.format(day(-1)),
			last7From: last7From.toISOString(),
			last7To: last7To.toISOString(),
			last7Text: periodText(last7From, last7To),
			previousFrom: previousFrom.toISOString(),
			previousTo: previousTo.toISOString(),
			previousFromKey: key(previousFrom),
			previousToKey: key(previousTo),
			previousText: periodText(previousFrom, previousTo),
			weekColumns: columnsOf(weekStartDay),
			previousWeekColumns: columnsOf(previousWeekStart),
			isoWeek: isoWeekOf(now),
			/** The period clipped to the current week is what the week grid reads (`probe-3.log` "after Week weekly reads"). */
			weekReadFrom: weekStart.toISOString(),
			weekReadTo: last7To.toISOString(),
			weekWindowText: periodText(weekStart, last7To),
			previousWeekReadFrom: last7From.toISOString(),
			previousWeekReadTo: new Date(
				weekStartDay.getFullYear(),
				weekStartDay.getMonth(),
				weekStartDay.getDate() - 1,
				23,
				59,
				59,
				999
			).toISOString(),
			periodDays,
			customFrom: customFrom.toISOString(),
			customTo: customTo.toISOString(),
			customFromDay: String(customFrom.getDate()),
			customToDay: String(customTo.getDate()),
			customText: periodText(customFrom, customTo),
			fileRange: `${key(last7From)}-${key(last7To)}`
		};
	});
}

type Clock = Awaited<ReturnType<typeof browserClock>>;

/* --------------------------------------------- the served set --------------------------------------- */

type ServedCall = { method: string; path: string; search: string; params: URLSearchParams };
type ServedTask = {
	task?: { id?: string; title?: string };
	description?: string;
	duration: number;
	tags?: Array<{ id: string; name: string }>;
	billRateValue?: number;
	billRateCurrency?: string;
};
type ServedDaily = {
	date: string;
	logs: Array<{
		project: { id?: string; name?: string | null; currency?: string; projectHidden?: boolean; status?: string };
		employeeLogs: Array<{
			employee: { id?: string; fullName?: string; billRateValue?: number; billRateCurrency?: string };
			sum: number;
			activity: number;
			tasks: ServedTask[];
		}>;
	}>;
};
type ServedWeekly = Array<{ employee: { id?: string; fullName?: string }; dates: Record<string, { sum: number }> }>;
type ReportScript = {
	daily?: ServedDaily[];
	billableDaily?: ServedDaily[];
	counts?: Record<string, unknown>;
	weekly?: ServedWeekly;
	rates?: Record<string, unknown>;
	status?: Record<string, number>;
	raw?: Record<string, unknown>;
};

const ALPHA = { id: 'ta-alpha', name: 'Row ta-alpha', status: 'active' };
const BETA = { id: 'ta-beta', name: 'Row ta-beta', status: 'active' };
const HIDDEN = { id: 'ta-hidden', name: 'Row ta-hidden', status: 'active', projectHidden: true };

/**
 * The probes' set, unchanged: yesterday 5 400 s + 1 800 s on `Row ta-alpha` and 3 600 s on `Row ta-beta`, today 7 200 s
 * on `Row ta-alpha` and 900 s on a project the reader is not on. Totals 18 900 s = 5h 15m over 2 days, 2 members, 3
 * projects — which is what `probe-2.log` p2 and `probe-3.log` printed for it.
 */
function servedRows(clock: Clock, fixture: BootstrapFixture): ServedDaily[] {
	const self = { id: fixture.ids.employee, fullName: fixture.names.user };
	const mate = { id: fixture.ids.teammateEmployee, fullName: fixture.names.teammate };
	return [
		{
			date: clock.yesterdayKey,
			logs: [
				{
					project: ALPHA,
					employeeLogs: [
						{
							employee: self,
							sum: 5400,
							activity: 60,
							tasks: [
								{ task: { id: 'ta-task-one', title: 'Task ta-one' }, description: '', duration: 3600 },
								{ task: { id: 'ta-task-two', title: 'Task ta-two' }, description: '', duration: 1800 }
							]
						},
						{
							employee: mate,
							sum: 1800,
							activity: 50,
							tasks: [
								{ task: { id: 'ta-task-one', title: 'Task ta-one' }, description: '', duration: 1800 }
							]
						}
					]
				},
				{
					project: BETA,
					employeeLogs: [
						{
							employee: self,
							sum: 3600,
							activity: 80,
							tasks: [
								{
									task: { id: 'ta-task-three', title: 'Task ta-three' },
									description: '',
									duration: 3600
								}
							]
						}
					]
				}
			]
		},
		{
			date: clock.todayKey,
			logs: [
				{
					project: ALPHA,
					employeeLogs: [
						{
							employee: self,
							sum: 7200,
							activity: 25,
							tasks: [
								{ task: { id: 'ta-task-one', title: 'Task ta-one' }, description: '', duration: 7200 }
							]
						}
					]
				},
				{
					project: HIDDEN,
					employeeLogs: [
						{
							employee: mate,
							sum: 900,
							activity: 40,
							tasks: [
								{ task: { id: 'ta-task-four', title: 'Task ta-four' }, description: '', duration: 900 }
							]
						}
					]
				}
			]
		}
	];
}

/** One billable hour priced at the member's own 40 USD rate: the sheet then reads $40.00 (`probe-3.log` p2). */
function servedBillable(clock: Clock, fixture: BootstrapFixture): ServedDaily[] {
	return [
		{
			date: clock.yesterdayKey,
			logs: [
				{
					project: ALPHA,
					employeeLogs: [
						{
							employee: { id: fixture.ids.employee, fullName: fixture.names.user },
							sum: 3600,
							activity: 60,
							tasks: [
								{
									task: { id: 'ta-task-one', title: 'Task ta-one' },
									description: '',
									duration: 3600,
									billRateValue: 40,
									billRateCurrency: 'USD'
								}
							]
						}
					]
				}
			]
		}
	];
}

/** The week grid's read: 600 s on the period's first day, 9 000 s yesterday, 7 200 s today, 1 800 s for the teammate. */
function servedWeekly(clock: Clock, fixture: BootstrapFixture): ServedWeekly {
	return [
		{
			employee: { id: fixture.ids.employee, fullName: fixture.names.user },
			dates: {
				[clock.firstPeriodDayKey]: { sum: 600 },
				[clock.yesterdayKey]: { sum: 9000 },
				[clock.todayKey]: { sum: 7200 }
			}
		},
		{
			employee: { id: fixture.ids.teammateEmployee, fullName: fixture.names.teammate },
			dates: { [clock.yesterdayKey]: { sum: 1800 }, [clock.todayKey]: { sum: 0 } }
		}
	];
}

function servedScript(clock: Clock, fixture: BootstrapFixture): ReportScript {
	return {
		daily: servedRows(clock, fixture),
		billableDaily: servedBillable(clock, fixture),
		counts: { weekDuration: 18900, weekActivities: 55 },
		weekly: servedWeekly(clock, fixture),
		rates: {
			billRateValue: null,
			currency: 'USD',
			members: [{ employeeId: fixture.ids.employee, billRateValue: 40 }]
		}
	};
}

const emptyScript = (): ReportScript => ({
	daily: [],
	billableDaily: [],
	counts: { weekDuration: 0, weekActivities: 0 },
	weekly: []
});

/** Served labels, on yesterday's first two tasks, so one entry carries two of them (`probe-2.log` p9). */
function servedLabels(clock: Clock, fixture: BootstrapFixture): ServedDaily[] {
	const rows = servedRows(clock, fixture);
	rows[0].logs[0].employeeLogs[0].tasks[0].tags = [
		{ id: 'ta-label-a', name: 'Label ta-a' },
		{ id: 'ta-label-b', name: 'Label ta-b' }
	];
	rows[0].logs[0].employeeLogs[1].tasks[0].tags = [{ id: 'ta-label-a', name: 'Label ta-a' }];
	return rows;
}

function recordCalls(page: Page, paths: string[]): ServedCall[] {
	const calls: ServedCall[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN || request.method() === 'OPTIONS' || !paths.includes(url.pathname)) return;
		calls.push({
			method: request.method(),
			path: url.pathname,
			search: url.search,
			params: new URLSearchParams(url.search)
		});
	});
	return calls;
}

const ofPath = (calls: ServedCall[], path: string) => calls.filter((call) => call.path === path);
const searches = (calls: ServedCall[], path: string) => ofPath(calls, path).map((call) => call.search);

function serveReport(page: Page, script: ReportScript): void {
	const fulfill = (route: Parameters<Parameters<Page['route']>[1]>[0], status: number, body: unknown) =>
		route.fulfill({
			status,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});

	page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === DAILY_PATH,
		(route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			const status = script.status?.[DAILY_PATH];
			if (status) return fulfill(route, status, { statusCode: status, message: 'this file refused the read' });
			const raw = script.raw?.[DAILY_PATH];
			if (raw !== undefined) return fulfill(route, 200, raw);
			const billable = new URL(request.url()).searchParams.has('billableOnly');
			return fulfill(route, 200, billable ? (script.billableDaily ?? []) : (script.daily ?? []));
		}
	);

	for (const [path, bodyOf] of [
		[COUNTS_PATH, () => script.counts ?? { weekDuration: 0, weekActivities: 0 }],
		[WEEKLY_PATH, () => script.weekly ?? []]
	] as Array<[string, () => unknown]>) {
		page.route(
			(url) => url.origin === MOCK_API_ORIGIN && url.pathname === path,
			(route) => {
				const request = route.request();
				if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
				const status = script.status?.[path];
				if (status)
					return fulfill(route, status, { statusCode: status, message: 'this file refused the read' });
				const raw = script.raw?.[path];
				return fulfill(route, 200, raw !== undefined ? raw : bodyOf());
			}
		);
	}

	page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			url.pathname.startsWith('/api/organization-projects/') &&
			url.pathname.endsWith('/rates'),
		(route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			const id = new URL(request.url()).pathname.split('/')[3];
			return fulfill(route, 200, {
				billRateValue: null,
				currency: 'USD',
				members: [],
				...(script.rates ?? {}),
				id
			});
		}
	);
}

/** Routes first, cookies second, navigation last (`helpers.ts:439-470`); the clock is read before any of them. */
async function openReport(
	page: Page,
	fixture: BootstrapFixture,
	options: { script?: (clock: Clock) => ReportScript; path?: string } = {}
): Promise<Clock> {
	const clock = await browserClock(page);
	if (options.script) serveReport(page, options.script(clock));
	await signInAndVisit(page, fixture, options.path ?? PAGE_PATH);
	await settle(page);
	return clock;
}

/**
 * The toolbar, the figures band and the grouping switch are attached, and the band has stopped being a skeleton: while
 * a figure loads its `dd` is a bar with no text (`FigureItem` `time-activity-summary-band.tsx:299-302`), so a band cell
 * holding text is the page's own "the report answered" signal.
 */
async function settle(page: Page): Promise<void> {
	await page
		.getByRole('group', { name: EN.dashboard.period.LABEL })
		.first()
		.waitFor({ state: 'visible', timeout: 45_000 });
	await page.getByRole('tab').first().waitFor({ state: 'attached', timeout: 45_000 });
	await expect
		.poll(
			() =>
				page
					.locator('main dl dd')
					.evaluateAll((nodes) => nodes.map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())),
			{
				timeout: 45_000
			}
		)
		.not.toEqual([]);
	await expect.poll(() => page.locator('main dl dd').first().textContent(), { timeout: 45_000 }).not.toBe('');
}

/**
 * The only fixed wait in this file, and it proves an absence: after an action that should not ask for anything, this
 * window lets any request it *did* make arrive before the recorded requests are counted (tests 3 and 7).
 */
async function quietWindow(page: Page): Promise<void> {
	await page.waitForTimeout(1500);
}

/* --------------------------------------------- locators ----------------------------------------------- */

const metaLine = (page: Page) => page.locator('h1').locator('xpath=following-sibling::span');
const bandFigure = (page: Page, index: number) => page.locator('main dl > div').nth(index);
const bandValue = (page: Page, index: number) => bandFigure(page, index).locator('dd');
const bandValues = (page: Page) => page.locator('main dl dd').evaluateAll((nodes) => nodes.map(textOf));
const bandTerms = (page: Page) => page.locator('main dl dt').evaluateAll((nodes) => nodes.map(textOf));
const bandTitles = (page: Page) =>
	page.locator('main dl > div').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('title')));
const sheet = (page: Page) => page.getByRole('region', { name: TA.sheet.LABEL });
const split = (page: Page) => page.getByRole('region', { name: EN.dashboard.team.projects.TITLE });
const splitRows = (page: Page) => split(page).getByRole('listitem');
const bars = (page: Page) => page.locator(`main [aria-label="${TA.sheet.CHART_LABEL}"]`);
const table = (page: Page, title: string) => page.getByRole('table', { name: title });
/** `role="row"` elements that hold cells; the rows the grid keeps mounted while loading hold none (finding 9). */
const gridRows = (page: Page, title: string) =>
	table(page, title)
		.locator('[role="row"]')
		.filter({ has: page.locator('[role="rowheader"],[role="cell"]') });
const groupSwitch = (page: Page) => page.getByRole('tablist', { name: TA.grouping.LABEL });
const groupingTab = (page: Page, name: string) => groupSwitch(page).getByRole('tab', { name, exact: true });
const filterButton = (page: Page) => page.getByRole('button', { name: /^Filter/ }).first();
const viewButton = (page: Page) => page.getByRole('button', { name: EN.common.VIEW, exact: true }).first();
const viewPopover = (page: Page) => page.getByRole('dialog');
const exportButton = (page: Page) => page.getByRole('button', { name: EN.common.EXPORT, exact: true }).first();
const periodGroup = (page: Page) => page.getByRole('group', { name: EN.dashboard.period.LABEL });
const tryAgain = (page: Page) => page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true });
const notices = (page: Page) => page.locator('main output').filter({ hasText: EN.dashboard.states.ERROR_TITLE });
const overlapNotice = (page: Page) => page.locator('main output').filter({ hasText: EN.timer.labels.OVERLAP_TITLE });
const chips = (page: Page) =>
	page.locator('main span.rounded-full').filter({ has: page.locator('[aria-label^="Remove "]') });
const filterMenu = (page: Page) => page.getByRole('menu').first();
const subMenuOptions = (page: Page) => page.getByRole('menuitemcheckbox');

async function rowTexts(page: Page, title: string): Promise<string[][]> {
	return gridRows(page, title).evaluateAll((rows) =>
		rows.map((row) => Array.from(row.querySelectorAll('[role="rowheader"],[role="cell"]')).map(textOf))
	);
}

async function columnHeaders(page: Page, title: string): Promise<string[]> {
	return table(page, title)
		.getByRole('columnheader')
		.evaluateAll((nodes) => nodes.map(textOf));
}

/* --------------------------------------------- the tests ---------------------------------------------- */

test.describe('lane-a · Reports › Time and activity: what the page shows and sends', () => {
	/* ------------------------------- 1. the page exactly as the lane's mock answers it ------------------------------- */

	test('1 · nothing tracked: title, trail, meta, the five figures at their empty values, three empty blocks, no export', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordCalls(page, [DAILY_PATH, COUNTS_PATH, WEEKLY_PATH]);
		const clock = await openReport(page, fixture);

		await expect(page.getByRole('heading', { level: 1, name: EN.timeActivity.TIME_AND_ACTIVITY })).toHaveCount(1);
		const crumbs = page.locator('nav[aria-label="breadcrumb"] a');
		await expect(crumbs).toHaveCount(2);
		await expect(crumbs.nth(0)).toHaveAttribute('href', '/');
		await expect(crumbs.nth(0)).toHaveText(EN.common.REPORTS);
		await expect(crumbs.nth(1)).toHaveText(EN.timeActivity.TIME_AND_ACTIVITY);
		await expect(metaLine(page)).toHaveText(`${clock.last7Text} · ${metaMembers(0)}`);
		await expect(page).toHaveURL(/period=last7Days/);

		// five figures, in `bandFiguresOf`'s order, and no breaks figure at all (finding 11)
		await expect(page.locator('main dl dt')).toHaveCount(5);
		expect(await bandTerms(page)).toEqual(BAND_TERMS);
		expect(await bandValues(page)).toEqual([
			'0h 0m',
			bandMissing(TA.figures.NO_TIME),
			bandMissing(TA.figures.NO_TIME),
			bandMissing(TA.figures.BILLABLE_NONE),
			'0'
		]);
		expect(await bandTitles(page)).toEqual([
			figureDays(0),
			TA.figures.NO_TIME,
			TA.figures.NO_TIME,
			TA.figures.BILLABLE_NONE,
			figureProjects(0)
		]);

		// the blocks this page draws, in this order
		expect(await page.locator('main h2').evaluateAll((nodes) => nodes.map(textOf))).toEqual([
			TA.sheet.SUMMARY,
			TA.chart.TITLE,
			EN.dashboard.team.projects.TITLE,
			TA.table.TITLE_DATE
		]);
		await expect(sheet(page)).toHaveCount(1);
		await expect(bars(page)).toHaveCount(1);
		await expect(split(page)).toHaveCount(1);
		await expect(split(page)).toContainText(EN.dashboard.team.projects.EMPTY);
		await expect(bars(page)).toContainText(TA.chart.EMPTY);
		await expect(table(page, TA.table.TITLE_DATE)).toHaveCount(1);
		await expect(table(page, TA.table.TITLE_DATE).getByText(emptyTitle(clock.last7Text))).toHaveCount(1);
		await expect(table(page, TA.table.TITLE_DATE).getByText(TA.empty.MESSAGE)).toHaveCount(1);
		// nothing to rank: no column header, no row holding a cell (finding 9)
		await expect(table(page, TA.table.TITLE_DATE).getByRole('columnheader')).toHaveCount(0);
		await expect(gridRows(page, TA.table.TITLE_DATE)).toHaveCount(0);

		// the switch the mock's answers offer: Label yes, Client no (finding 11)
		await expect(groupSwitch(page).getByRole('tab')).toHaveCount(6);
		await expect(groupingTab(page, TA.grouping.DATE)).toHaveAttribute('aria-selected', 'true');
		for (const name of [
			TA.grouping.MEMBER,
			TA.grouping.PROJECT,
			TA.grouping.TASK,
			TA.grouping.WEEK,
			EN.timer.labels.LABEL
		]) {
			await expect(groupingTab(page, name)).toHaveAttribute('aria-selected', 'false');
		}
		await expect(groupSwitch(page).getByRole('tab', { name: EN.common.CLIENT, exact: true })).toHaveCount(0);

		await expect(exportButton(page)).toBeDisabled();
		await expect(filterButton(page)).toHaveCount(1);
		await expect(viewButton(page)).toHaveCount(1);
		// the saved-reports menu's own button; the menu itself is out of scope by the brief
		await expect(sheet(page).getByRole('button', { name: EN.dashboard.savedReports.MENU })).toHaveCount(1);

		// the zone notice names the zone this browser reports, never one this file typed
		const notice = page.locator('main output').first();
		await expect(notice).toContainText(clock.timeZone);
		await expect(notice).toContainText('UTC');

		// the mock's own answers: the daily read (plain and billable) and the counts read, no weekly read
		expect(searches(calls, DAILY_PATH).length).toBeGreaterThanOrEqual(1);
		expect(searches(calls, COUNTS_PATH).length).toBeGreaterThanOrEqual(1);
		expect(ofPath(calls, WEEKLY_PATH)).toEqual([]);

		expect(await devOverlayErrors(page), 'the mock-only page left a Next.js dev error on screen').toEqual([]);
		expect(consoleFindings(shield), 'the empty page printed a console error').toEqual([]);
		expect(shield.externalCalls(), 'the page left the lane').toEqual([]);
		report('1 empty', {
			meta: flat(await metaLine(page).innerText()),
			url: page.url(),
			bandValues: await bandValues(page),
			bandTitles: await bandTitles(page),
			barsText: flat(await bars(page).innerText()),
			dailyReads: searches(calls, DAILY_PATH),
			countsReads: searches(calls, COUNTS_PATH),
			consoleErrors: shield.consoleErrors()
		});
	});

	/* ------------------------------ 2. the sheet's figures from served time over two projects ------------------------------ */

	test('2 · the report sheet: tracked, activity, earnings, billable and members, each with the hint that explains it', async ({
		page,
		fixture,
		shield
	}) => {
		const clock = await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });

		await expect(metaLine(page)).toHaveText(`${clock.last7Text} · ${metaMembers(2)}`);
		await expect(page.locator('main dl dt')).toHaveCount(5);
		await expect.poll(() => bandTerms(page)).toEqual(BAND_TERMS);
		await expect
			.poll(() => bandValues(page))
			.toEqual([
				'5h 15m',
				'55%',
				bandMissing(TA.figures.EARNINGS_NO_RATES),
				`$40.00 ${billableNote('1h 0m')}`,
				'2'
			]);
		await expect
			.poll(() => bandTitles(page))
			.toEqual([
				figureDays(2),
				TA.figures.ACTIVITY_HIGH,
				TA.figures.EARNINGS_NO_RATES,
				TA.figures.BILLABLE_HINT,
				figureProjects(3)
			]);
		await expect(bandValue(page, 0)).toHaveText('5h 15m');
		await expect(bandFigure(page, 3)).toHaveAttribute('title', TA.figures.BILLABLE_HINT);
		// the counts and the rows agree (18 900 s each), so no "by timer" note beside the total
		await expect(bandValue(page, 0)).not.toContainText(timerNote('5h 15m'));
		await expect(exportButton(page)).toBeEnabled();

		// the served date view, ranked by time (`probe-3.log` "after Date rows")
		await expect
			.poll(() => rowTexts(page, TA.table.TITLE_DATE))
			.toEqual([
				[
					'1',
					`${EN.common.YESTERDAY}${clock.yesterdayLabel}${memberPill(2)}`,
					'57%',
					'3h 0m',
					noRate,
					'$40.00',
					'65%'
				],
				['', `${fixture.names.user}${projectPill(2)}`, '83%', '2h 30m', noRate, '$40.00', '68%'],
				['', `${fixture.names.teammate}${projectPill(1)}`, '17%', '0h 30m', noRate, noBillable, '50%'],
				[
					'2',
					`${EN.common.TODAY}${clock.todayLabel}${memberPill(2)}`,
					'43%',
					'2h 15m',
					noRate,
					noBillable,
					'27%'
				],
				['', totalsPill('dashboard.timeActivity.table.DAYS', 2), '', '5h 15m', noRate, '$40.00', '49%']
			]);

		expect(consoleFindings(shield), 'the served page printed a console error').toEqual([]);
		expect(await devOverlayErrors(page), 'the served page left a Next.js dev error on screen').toEqual([]);
		report('2 sheet', { bandValues: await bandValues(page), url: page.url() });
	});

	/* --------------------------------- 3. every grouping, its columns, and what re-reads --------------------------- */

	test('3 · the switch: Date, Member, Project, Task, Week, Label; their columns and rows; only Week re-reads', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordCalls(page, [DAILY_PATH, COUNTS_PATH, WEEKLY_PATH]);
		const clock = await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });

		const dailyAtStart = ofPath(calls, DAILY_PATH).length;

		// Date: the columns a manager is offered (`breakdownColumnsOf`), and the path of dimensions
		await expect
			.poll(() => columnHeaders(page, TA.table.TITLE_DATE))
			.toEqual([
				TA.breakdown.RANK,
				`${TA.grouping.DATE}${TA.grouping.MEMBER}${TA.grouping.PROJECT}`,
				TA.columns.SHARE,
				TA.columns.TRACKED,
				TA.columns.EARNINGS,
				TA.columns.BILLABLE,
				TA.columns.ACTIVITY
			]);

		// Member, Project and Task: their own header path, their own rows, not one new request
		for (const [grouping, title, param] of [
			[TA.grouping.MEMBER, TA.table.TITLE_MEMBER, 'member'],
			[TA.grouping.PROJECT, TA.table.TITLE_PROJECT, 'project'],
			[TA.grouping.TASK, TA.table.TITLE_TASK, 'task']
		] as Array<[string, string, string]>) {
			await groupingTab(page, grouping).click();
			await expect(groupingTab(page, grouping)).toHaveAttribute('aria-selected', 'true');
			await expect(page).toHaveURL(new RegExp(`groupBy=${param}`));
			await expect(table(page, title)).toHaveCount(1);
			report(`3 ${grouping} headers`, await columnHeaders(page, title));
			report(`3 ${grouping} rows`, await rowTexts(page, title));
		}
		await quietWindow(page);
		expect(ofPath(calls, DAILY_PATH).length, 'switching a grouping re-read the report').toBe(dailyAtStart);
		expect(ofPath(calls, WEEKLY_PATH), 'a view that shows no week asked for one').toEqual([]);

		// Member: the member first, then the projects that member's time sits on (`probe-3.log` "after Member rows")
		await groupingTab(page, TA.grouping.MEMBER).click();
		const memberRows = await rowTexts(page, TA.table.TITLE_MEMBER);
		expect(memberRows[0][1]).toContain(fixture.names.user);
		expect(memberRows[0][1]).toContain(projectPill(2));
		expect(
			memberRows.some((cells) => cells.some((cell) => cell.includes(fixture.names.teammate))),
			'the teammate is not a row'
		).toBe(true);
		expect(memberRows.at(-1)?.join(' ')).toContain(totalsPill('dashboard.timeActivity.table.MEMBERS', 2));

		// Project: the private project is named by `common.PRIVATE_PROJECTS`, never by its own name
		await groupingTab(page, TA.grouping.PROJECT).click();
		const projectRows = await rowTexts(page, TA.table.TITLE_PROJECT);
		expect(
			projectRows.some((cells) => cells.some((cell) => cell.includes(EN.common.PRIVATE_PROJECTS))),
			'no row for the private project'
		).toBe(true);
		expect(
			projectRows.some((cells) => cells.some((cell) => cell.includes(HIDDEN.name))),
			'the private project printed its own name'
		).toBe(false);
		expect(
			projectRows.some((cells) => cells.some((cell) => cell.includes(cellMissing(TA.breakdown.TASK_ACTIVITY)))),
			'a task row says nothing about how activity is measured'
		).toBe(true);
		expect(projectRows.at(-1)?.join(' ')).toContain(totalsPill('dashboard.timeActivity.table.PROJECTS', 3));

		// Task: the only view with a Projects column (`offersProjectsColumn`)
		await groupingTab(page, TA.grouping.TASK).click();
		await expect(
			table(page, TA.table.TITLE_TASK).getByRole('columnheader', { name: TA.columns.PROJECTS, exact: true })
		).toHaveCount(1);
		const taskRows = await rowTexts(page, TA.table.TITLE_TASK);
		expect(
			taskRows.some((cells) => cells.includes(ALPHA.name)),
			'no project cell in the Task view'
		).toBe(true);

		// Label, and back to Date: still the same reads
		await groupingTab(page, EN.timer.labels.LABEL).click();
		await expect(page).toHaveURL(/groupBy=label/);
		await expect(table(page, LABEL_TITLE)).toHaveCount(1);
		await groupingTab(page, TA.grouping.DATE).click();
		await quietWindow(page);
		expect(ofPath(calls, DAILY_PATH).length, 'returning to Date re-read the report').toBe(dailyAtStart);

		// Week is the one switch with a read of its own
		await groupingTab(page, TA.grouping.WEEK).click();
		await expect(page).toHaveURL(/groupBy=week/);
		const weekly = ofPath(calls, WEEKLY_PATH);
		expect(weekly.length, 'the week view asked no weekly read').toBeGreaterThan(0);
		expect(weekly[0].params.get('startDate')).toBe(clock.weekReadFrom);
		expect(weekly[0].params.get('endDate')).toBe(clock.weekReadTo);
		expect(weekly[0].params.get('timeZone')).toBe(clock.timeZone);
		expect(ofPath(calls, DAILY_PATH).length, 'the week view re-read the daily report').toBe(dailyAtStart);

		expect(consoleFindings(shield), 'the switch printed a console error').toEqual([]);
		report('3 reads', {
			daily: ofPath(calls, DAILY_PATH).length,
			counts: ofPath(calls, COUNTS_PATH).length,
			weekly: searches(calls, WEEKLY_PATH)
		});
	});

	/* ------------------------------------- 4. a row opens rows, not a sheet ------------------------------------- */

	test('4 · rows expand in place: only the largest opens at first, Collapse all empties them, and no sheet opens', async ({
		page,
		fixture
	}) => {
		await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });
		const title = TA.table.TITLE_DATE;
		const toggles = table(page, title).locator('button[aria-expanded]');

		// `use-time-activity-breakdown.ts:32-39`: the largest node only is open, and it draws its children
		await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true');
		const openRows = await rowTexts(page, title);
		report('4 open at first', openRows);
		expect(openRows.length, 'the open row shows no nested rows').toBe(5);
		expect(
			openRows.filter((cells) => cells[0] === '' && !cells.some((cell) => cell.startsWith(EN.common.TOTAL)))
				.length,
			'no nested rows'
		).toBe(2);

		await expect(table(page, title).getByRole('button', { name: TA.table.COLLAPSE_ALL })).toHaveCount(1);
		await table(page, title).getByRole('button', { name: TA.table.COLLAPSE_ALL }).click();
		await expect(toggles.first()).toHaveAttribute('aria-expanded', 'false');
		const collapsed = await rowTexts(page, title);
		report('4 after collapse all', collapsed);
		expect(collapsed.length, 'Collapse all left nested rows on screen').toBe(3);
		expect(collapsed[0][1]).toContain(EN.common.YESTERDAY);
		expect(collapsed[0][1]).toContain(memberPill(2));
		expect(collapsed[1][1]).toContain(EN.common.TODAY);
		expect(collapsed[2][1]).toContain(totalsPill('dashboard.timeActivity.table.DAYS', 2));

		await expect(table(page, title).getByRole('button', { name: TA.table.EXPAND_ALL })).toHaveCount(1);
		await table(page, title).getByRole('button', { name: TA.table.EXPAND_ALL }).click();
		await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'true');
		const expanded = await rowTexts(page, title);
		report('4 after expand all', expanded);
		expect(expanded.length, 'Expand all did not open every node').toBe(6);

		// the subject toggle of a row, and no sheet anywhere (`time-activity-breakdown.tsx:486`)
		await toggles.first().click();
		await expect(toggles.first()).toHaveAttribute('aria-expanded', 'false');
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(sheet(page)).toHaveCount(1);
	});

	/* ------------------------------ 5. where the time went, and the bars per day ------------------------------ */

	test('5 · the split and the day bars: every row named, the private project as a name of its own, no size asserted', async ({
		page,
		fixture
	}) => {
		const clock = await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });

		await expect(split(page)).toHaveCount(1);
		await expect(split(page)).toContainText(figureProjects(3));
		// one row per project: the share, the name, the hours (`kit/share-rows.tsx:63-103`, `probe-3.log` "split rows")
		await expect(splitRows(page)).toHaveCount(3);
		expect(await splitRows(page).evaluateAll((nodes) => nodes.map(textOf))).toEqual([
			`76%${ALPHA.name}4h 0m`,
			`19%${BETA.name}1h 0m`,
			`5%${EN.common.PRIVATE_PROJECTS}0h 15m`
		]);
		await expect(splitRows(page).nth(0)).toContainText('4h 0m');
		await expect(splitRows(page).nth(2)).not.toContainText(HIDDEN.name);
		// the mark beside a project the reader is not on carries the hint as its accessible name
		await expect(page.getByRole('img', { name: EN.common.PRIVATE_PROJECT_HINT })).toHaveCount(1);
		await expect(split(page)).toContainText(EN.dashboard.team.export.TOTAL);
		await expect(split(page)).toContainText('5h 15m');

		// The bars: the sheet's own labelled block, its legend and one label per day of the period
		await expect(bars(page)).toHaveCount(1);
		await expect(bars(page)).toContainText(TA.chart.TRACKED);
		for (const day of clock.periodDays) {
			await expect(bars(page)).toContainText(day.label);
		}
		report('5 split text', flat(await split(page).innerText()));
		report('5 bars text', flat(await bars(page).innerText()));
		report(
			'5 labelled blocks',
			await page
				.locator('main [aria-label]')
				.evaluateAll((nodes) => nodes.map((node) => `${node.tagName}:${node.getAttribute('aria-label')}`))
		);
	});

	/* ---------------------------------------- 6. the week grid, day by day ---------------------------------------- */

	test('6 · the week grid: one column per day of its week, a day inside the period at 0h, a day outside it titled', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordCalls(page, [WEEKLY_PATH]);
		const clock = await openReport(page, fixture, {
			script: (c) => servedScript(c, fixture),
			path: `${PAGE_PATH}?groupBy=week`
		});

		await expect(table(page, TA.week.TITLE)).toHaveCount(1);
		// header + the two members + the totals row: wait for the grid's own read before reading a single cell
		await expect(gridRows(page, TA.week.TITLE)).toHaveCount(4);
		// this served set puts its time on yesterday and today, so the week the grid draws has to hold both, and one of
		// its period days has to carry none
		const yesterdayIndex = clock.weekColumns.findIndex((column) => column.key === clock.yesterdayKey);
		const emptyIndex = clock.weekColumns.findIndex(
			(column) =>
				column.key !== clock.yesterdayKey &&
				column.key !== clock.todayKey &&
				clock.periodDays.some((day) => day.key === column.key)
		);
		expect(yesterdayIndex, 'yesterday is not in the week the grid draws').toBeGreaterThanOrEqual(0);
		expect(emptyIndex, 'every day of the drawn week carries served time').toBeGreaterThanOrEqual(0);

		const rows = await rowTexts(page, TA.week.TITLE);
		report('6 rows', rows);
		expect(rows[0]).toEqual([
			EN.common.MEMBER,
			...clock.weekColumns.map((column) => column.label),
			EN.dashboard.team.export.TOTAL
		]);
		const manager = rows.find((cells) => cells[0].includes(fixture.names.user)) ?? [];
		const teammate = rows.find((cells) => cells[0].includes(fixture.names.teammate)) ?? [];
		const totals = rows.at(-1) ?? [];
		expect(totals[0]).toContain(totalsPill('dashboard.timeActivity.table.MEMBERS', 2));
		expect(manager.at(-1)).toBe('4h 30m');
		expect(teammate.at(-1)).toBe('0h 30m');
		expect(totals.at(-1)).toBe('5h 0m');
		// the day an entry sits on, and a day of the period with no entry as `0h`
		expect(manager[yesterdayIndex + 1]).toBe('2h 30m');
		expect(manager[emptyIndex + 1]).toBe('0h');

		// a day the period does not cover: an empty column whose header is titled (`time-activity-week-grid.tsx:131`, `:196`)
		const titled = await table(page, TA.week.TITLE)
			.getByRole('columnheader')
			.evaluateAll((nodes) =>
				nodes
					.map((node) => [textOf(node), node.getAttribute('title')])
					.filter((pair): pair is [string, string] => typeof pair[1] === 'string')
			);
		report('6 titled columns', titled);
		expect(titled.length, 'no column outside the period was titled').toBeGreaterThan(0);
		for (const [, title] of titled) expect(title).toBe(TA.week.OUTSIDE_PERIOD);

		// the week the grid names, in its own group beside the period group
		const weekGroup = page.getByRole('group', { name: TA.week.TITLE });
		await expect(weekGroup).toHaveCount(1);
		await expect(weekGroup).toContainText(clock.weekWindowText);
		await expect(weekGroup).toContainText(weekNumber(clock.isoWeek));
		const previousWeek = page.getByRole('button', { name: EN.timeActivity.PREVIOUS_WEEK, exact: true });
		await expect(previousWeek).toBeEnabled();

		await previousWeek.click();
		const walked = await rowTexts(page, TA.week.TITLE);
		report('6 previous week rows', walked);
		expect(walked[0]).toEqual([
			EN.common.MEMBER,
			...clock.previousWeekColumns.map((column) => column.label),
			EN.dashboard.team.export.TOTAL
		]);
		// the entry on the period's first day moved into view, as 0h 10m
		expect((walked.find((cells) => cells[0].includes(fixture.names.user)) ?? []).join(' ')).toContain('0h 10m');
		const weekly = ofPath(calls, WEEKLY_PATH).at(-1);
		expect(weekly?.params.get('startDate')).toBe(clock.previousWeekReadFrom);
		expect(weekly?.params.get('endDate')).toBe(clock.previousWeekReadTo);

		// and the column toggles are inert here, with the note that says why (`time-activity-view-menu.tsx:104`, `:109-113`)
		await viewButton(page).click();
		await expect(viewPopover(page)).toContainText(TA.view.COLUMNS);
		await expect(viewPopover(page)).toContainText(TA.view.WEEK_NOTE_V2);
		const pressed = await viewPopover(page)
			.locator('button[aria-pressed]')
			.evaluateAll((nodes) =>
				nodes.map((node) => [textOf(node), node.getAttribute('aria-pressed'), node.hasAttribute('disabled')])
			);
		report('6 view toggles on week', pressed);
		expect(pressed.map((entry) => entry[0])).toEqual([
			TA.columns.TRACKED,
			TA.columns.EARNINGS,
			TA.columns.BILLABLE,
			TA.columns.ACTIVITY
		]);
		for (const [, , disabled] of pressed) expect(disabled).toBe(true);
		await page.keyboard.press('Escape');

		expect(consoleFindings(shield), 'the week grid printed a console error').toEqual([]);
	});

	/* ---------------------------- 7. the view menu: what a column costs, and where it is kept --------------------------- */

	test('7 · the view menu: hide Activity, the column is gone and nothing re-reads, and a reload keeps it from localStorage', async ({
		page,
		fixture
	}) => {
		const calls = recordCalls(page, [DAILY_PATH]);
		await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });
		const readsAtStart = ofPath(calls, DAILY_PATH).length;

		await viewButton(page).click();
		await expect(viewPopover(page)).toContainText(TA.view.COLUMNS);
		const activityToggle = viewPopover(page).getByRole('button', { name: TA.columns.ACTIVITY, exact: true });
		await expect(activityToggle).toHaveAttribute('aria-pressed', 'true');
		await expect(activityToggle).toBeEnabled();
		await activityToggle.click();
		await expect(activityToggle).toHaveAttribute('aria-pressed', 'false');
		await page.keyboard.press('Escape');

		await expect(
			table(page, TA.table.TITLE_DATE).getByRole('columnheader', { name: TA.columns.ACTIVITY })
		).toHaveCount(0);
		await expect(
			table(page, TA.table.TITLE_DATE).getByRole('columnheader', { name: TA.columns.TRACKED })
		).toHaveCount(1);
		await quietWindow(page);
		expect(ofPath(calls, DAILY_PATH).length, 'hiding a column re-read the report').toBe(readsAtStart);

		// kept in `localStorage` under `TIME_ACTIVITY_COLUMNS_STORAGE_KEY` (`time-activity.ts:191`)
		await expect
			.poll(() => page.evaluate(() => window.localStorage.getItem('ever-teams-activity-view-options')))
			.toBe(JSON.stringify({ hiddenColumns: ['activity'] }));

		await page.reload({ waitUntil: 'domcontentloaded' });
		await settle(page);
		await expect(
			table(page, TA.table.TITLE_DATE).getByRole('columnheader', { name: TA.columns.ACTIVITY })
		).toHaveCount(0);
		await viewButton(page).click();
		await expect(viewPopover(page).getByRole('button', { name: TA.columns.ACTIVITY, exact: true })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		await page.keyboard.press('Escape');
		// the grouping was never written to the link, so the reload is back on Date with the same columns
		await expect(page).toHaveURL(/period=last7Days/);
		report('7 after reload', {
			headers: await columnHeaders(page, TA.table.TITLE_DATE),
			localStorage: await page.evaluate(() => window.localStorage.getItem('ever-teams-activity-view-options')),
			url: page.url()
		});
	});

	/* --------------------------------------- 8. filters: pick, chip, remove, clear --------------------------------------- */

	test('8 · the filter menu: a member and its chip, the chip removed, Clear filters, and the Billable tick with its own read', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordCalls(page, [DAILY_PATH, COUNTS_PATH]);
		const clock = await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });

		await filterButton(page).click();
		const items = await filterMenu(page)
			.getByRole('menuitem')
			.evaluateAll((nodes) => nodes.map((node) => [textOf(node), node.getAttribute('aria-haspopup')]));
		report('8 menu items', items);
		// every field the page offers, in this order; Teams and Projects read `filters.NONE` (finding 3)
		expect(items.map((item) => item[0])).toEqual([
			`${TA.filters.TEAMS}${TA.filters.NONE}`,
			TA.filters.MEMBERS,
			`${TA.filters.PROJECTS}${TA.filters.NONE}`,
			TA.filters.TASKS,
			EN.clients.TITLE,
			EN.dashboard.timesheets.BILLABLE,
			EN.common.LABELS
		]);

		// the member submenu: the three members the mock's team carries (`probe-3.log` "submenu checkboxes")
		await filterMenu(page).getByRole('menuitem', { name: TA.filters.MEMBERS, exact: true }).click();
		const teammateOption = subMenuOptions(page).filter({ hasText: fixture.names.teammate });
		await expect(subMenuOptions(page)).toHaveCount(3);
		await expect(teammateOption).toHaveCount(1);
		await expect(subMenuOptions(page).filter({ hasText: fixture.names.denied })).toHaveCount(1);
		await expect(teammateOption).toHaveAttribute('aria-checked', 'false');
		await teammateOption.click();
		await expect(teammateOption).toHaveAttribute('aria-checked', 'true');
		await page.keyboard.press('Escape');

		// both halves of `use-time-activity-settings.ts:44-48`: the link and `localStorage`
		await expect(page).toHaveURL(new RegExp(`members=${fixture.ids.teammateEmployee}`));
		await expect
			.poll(() => page.evaluate(() => window.localStorage.getItem('ever-teams-activity-filters')))
			.toBe(
				JSON.stringify({
					teamIds: [],
					employeeIds: [fixture.ids.teammateEmployee],
					projectIds: [],
					taskIds: []
				})
			);
		// the filter travels to every read of the report
		const memberReads = ofPath(calls, DAILY_PATH).filter((call) => call.params.has('employeeIds'));
		expect(memberReads.length, 'no daily read carried the member').toBeGreaterThan(0);
		for (const call of memberReads) expect(call.params.get('employeeIds[0]')).toBe(fixture.ids.teammateEmployee);
		expect(
			ofPath(calls, COUNTS_PATH).some(
				(call) => call.params.get('employeeIds[0]') === fixture.ids.teammateEmployee
			),
			'the counts read ignored the member'
		).toBe(true);
		// one chip, named by its field, with its own Remove button (`AppliedTimeActivityFilters` `:307-331`)
		const memberChip = chips(page).filter({ hasText: TA.filters.MEMBERS });
		await expect(memberChip).toHaveCount(1);
		await expect(memberChip).toContainText(fixture.names.teammate);
		await expect(page.getByRole('button', { name: removeChip(fixture.names.teammate), exact: true })).toHaveCount(
			1
		);
		report('8 chip and trigger', {
			chip: await memberChip.evaluateAll((nodes) => nodes.map(textOf)),
			trigger: await filterButton(page).evaluateAll((nodes) => nodes.map(textOf))
		});

		await page.getByRole('button', { name: removeChip(fixture.names.teammate), exact: true }).click();
		await expect(chips(page)).toHaveCount(0);
		await expect
			.poll(() => page.evaluate(() => window.localStorage.getItem('ever-teams-activity-filters')))
			.toBe(JSON.stringify({ teamIds: [], employeeIds: [], projectIds: [], taskIds: [] }));
		await expect(page).not.toHaveURL(new RegExp(`members=${fixture.ids.teammateEmployee}`));

		// pick it again, then clear everything with the menu's own item
		await filterButton(page).click();
		await filterMenu(page).getByRole('menuitem', { name: TA.filters.MEMBERS, exact: true }).click();
		await subMenuOptions(page).filter({ hasText: fixture.names.teammate }).click();
		await expect(page).toHaveURL(new RegExp(`members=${fixture.ids.teammateEmployee}`));
		await page.keyboard.press('Escape');
		await filterButton(page).click();
		const clearItem = filterMenu(page).getByRole('menuitem', { name: EN.common.CLEAR_FILTERS, exact: true });
		await expect(clearItem).toHaveCount(1);
		await clearItem.click();
		await expect(chips(page)).toHaveCount(0);
		await expect
			.poll(() => page.evaluate(() => window.localStorage.getItem('ever-teams-activity-filters')))
			.toBe(JSON.stringify({ teamIds: [], employeeIds: [], projectIds: [], taskIds: [] }));
		await expect(page).not.toHaveURL(/members=/);

		// Billable: a link-only filter, and the plain report asked billable-only without the rate parameters
		await filterButton(page).click();
		await filterMenu(page).getByRole('menuitem', { name: EN.dashboard.timesheets.BILLABLE, exact: true }).click();
		const billableOption = subMenuOptions(page).getByRole('menuitemcheckbox', {
			name: EN.timeReports.filters.BILLABLE_ONLY,
			exact: true
		});
		await expect(billableOption).toHaveCount(1);
		await billableOption.click();
		// the read the tick starts is what changes the link; wait for that, not for a wall clock
		await expect.poll(() => page.url()).toContain('billable=true');
		await page.keyboard.press('Escape');
		await expect(page).toHaveURL(/billable=true/);
		const billableReads = ofPath(calls, DAILY_PATH).filter(
			(call) => call.params.get('billableOnly') === 'true' && !call.params.has('withClientRates')
		);
		expect(billableReads.length, 'no read asked for billable time alone').toBeGreaterThan(0);
		for (const call of billableReads) {
			expect(call.params.get('groupBy')).toBe('date');
			expect(call.params.get('startDate')).toBe(clock.last7From);
			expect(call.params.get('endDate')).toBe(clock.last7To);
		}
		// `sumsFiguresFromRows`: the sheet's figures now come from those rows, not from the counts (`probe-3.log` p2)
		await expect
			.poll(() => bandValues(page))
			.toEqual(['1h 0m', '60%', '$40.00', `$40.00 ${billableNote('1h 0m')}`, '1']);
		await expect(chips(page).filter({ hasText: EN.dashboard.timesheets.BILLABLE })).toContainText(
			EN.timeReports.filters.BILLABLE_ONLY
		);
		expect(
			await page.evaluate(() => window.localStorage.getItem('ever-teams-activity-filters')),
			'the Billable filter was stored in the browser too'
		).toBeNull();
		await expect(exportButton(page)).toBeEnabled();

		expect(consoleFindings(shield), 'the filter menu printed a console error').toEqual([]);
		report('8 filter', {
			url: page.url(),
			chips: await chips(page).evaluateAll((nodes) => nodes.map(textOf)),
			dailyReads: searches(calls, DAILY_PATH),
			countsReads: searches(calls, COUNTS_PATH)
		});
	});

	/* ----------------------------------- 9. the period picker: steps, presets, calendar ---------------------------------- */

	test('9 · the period picker: previous and next write the link, and a custom range comes from the 10th and the 14th of the month shown', async ({
		page,
		fixture
	}) => {
		const calls = recordCalls(page, [DAILY_PATH]);
		const clock = await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });

		await expect(periodGroup(page)).toHaveCount(1);
		const previous = periodGroup(page).getByRole('button', { name: EN.dashboard.period.PREVIOUS, exact: true });
		const next = periodGroup(page).getByRole('button', { name: EN.dashboard.period.NEXT, exact: true });
		await expect(previous).toHaveCount(1);
		await expect(next).toHaveCount(1);

		// previous period: the link holds it as `from`/`to` (`time-activity-link.ts:89-112`, `probe-2.log` p6)
		await previous.click();
		await expect(metaLine(page)).toHaveText(`${clock.previousText} · ${metaMembers(2)}`);
		await expect(page).toHaveURL(new RegExp(`from=${clock.previousFromKey}`));
		await expect(page).toHaveURL(new RegExp(`to=${clock.previousToKey}`));
		await expect.poll(() => ofPath(calls, DAILY_PATH).at(-1)?.params.get('startDate')).toBe(clock.previousFrom);
		expect(ofPath(calls, DAILY_PATH).at(-1)?.params.get('endDate')).toBe(clock.previousTo);

		// next brings the preset back
		await next.click();
		await expect.poll(() => page.url()).toContain('period=last7Days');
		await expect(metaLine(page)).toHaveText(`${clock.last7Text} · ${metaMembers(2)}`);

		// the presets, each naming the range it resolves to (`probe-2.log` "preset buttons")
		await periodGroup(page).locator('button').nth(1).click();
		const presets = await page
			.getByRole('button')
			.evaluateAll((nodes) => nodes.map(textOf))
			.then((all) => all.filter((text) => /(Today|Yesterday|week|month|days)/i.test(text)));
		report('9 presets', presets);
		expect(
			presets.some((text) => text.includes(clock.last7Text)),
			'no preset names the range it resolves to'
		).toBe(true);
		await page.keyboard.press('Escape');

		// the calendar: the 10th, then the 14th, of the month it opens on — never days counted back from today
		const fromCell = page.getByRole('gridcell', { name: clock.customFromDay, exact: true });
		const toCell = page.getByRole('gridcell', { name: clock.customToDay, exact: true });
		report('9 calendar cells', { from: await fromCell.count(), to: await toCell.count() });
		await expect(fromCell.first()).toBeVisible();
		await fromCell.first().click();
		// the first click only stores a draft (`period-picker.tsx:100-104`), so the period has not moved
		await expect(metaLine(page)).toHaveText(`${clock.last7Text} · ${metaMembers(2)}`);
		await toCell.first().click();
		await expect(metaLine(page)).toHaveText(`${clock.customText} · ${metaMembers(2)}`);
		await expect.poll(() => ofPath(calls, DAILY_PATH).at(-1)?.params.get('startDate')).toBe(clock.customFrom);
		const customRead = ofPath(calls, DAILY_PATH).at(-1);
		expect(customRead?.params.get('endDate')).toBe(clock.customTo);
		report('9 custom range', {
			url: page.url(),
			read: customRead?.search,
			meta: flat(await metaLine(page).innerText())
		});
	});

	/* ------------------------------------------------- 10. export ------------------------------------------------- */

	test('10 · export: PDF, Excel and CSV, each named after the period, and the CSV header line', async ({
		page,
		fixture
	}) => {
		const clock = await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });
		await expect(exportButton(page)).toBeEnabled();

		const names: string[] = [];
		for (const option of [TA.export.PDF, TA.export.XLSX, TA.export.CSV]) {
			await exportButton(page).click();
			const item = page.getByRole('menuitem', { name: option, exact: true });
			await expect(item).toHaveCount(1);
			const waiting = page.waitForEvent('download', { timeout: 45_000 });
			await item.click();
			const download = await waiting;
			names.push(download.suggestedFilename());
			if (option === TA.export.CSV) {
				const path = await download.path();
				if (!path) throw new Error('the CSV download left no file to read');
				const lines = readFileSync(path, 'utf8').split('\n');
				// the byte-order mark the writer puts first, then `csvColumnsOf`'s header
				expect(lines[0].replace(/^\uFEFF/, '').trimEnd()).toBe(CSV_HEADER);
				report(
					'10 csv body',
					lines.map((line) => line.trimEnd())
				);
				expect(lines.filter((line) => line.trim().length > 0).length, 'the CSV row count').toBe(7);
			}
			// the menu closes on its own after the item is clicked; the next iteration waits for its own item
			await expect(page.getByRole('menuitem')).toHaveCount(0);
		}
		report('10 downloads', names);
		expect(names).toEqual([
			`time-activity-report-${clock.fileRange}.pdf`,
			`time-activity-report-${clock.fileRange}.xlsx`,
			`time-activity-report-${clock.fileRange}.csv`
		]);
	});

	test('10b · export with nothing to export: the button is disabled while the page has no rows', async ({
		page,
		fixture
	}) => {
		await openReport(page, fixture, { script: () => emptyScript() });
		await expect(exportButton(page)).toBeDisabled();
		await expect(gridRows(page, TA.table.TITLE_DATE)).toHaveCount(0);
	});

	/* ------------------------------------------- 11. a read refused ------------------------------------------- */

	test('11 · a 500 on the daily read: one notice per block that needs it, its Try again, and the figures that could not load', async ({
		page,
		fixture,
		shield
	}) => {
		await openReport(page, fixture, {
			script: (c) => ({ ...servedScript(c, fixture), status: { [DAILY_PATH]: 500 } })
		});

		await expect(notices(page)).toHaveCount(3);
		await expect(tryAgain(page)).toHaveCount(4);
		expect(await bandValues(page)).toEqual([
			bandMissing(TA.figures.UNAVAILABLE),
			'55%',
			bandMissing(TA.figures.NO_TIME),
			bandMissing(TA.figures.UNAVAILABLE),
			'0'
		]);
		expect(await bandTitles(page)).toEqual([
			TA.figures.UNAVAILABLE,
			TA.figures.ACTIVITY_HIGH,
			TA.figures.NO_TIME,
			TA.figures.UNAVAILABLE,
			figureProjects(0)
		]);
		// the counts read answered, so Activity is still a number; the rows did not, so there is nothing to export
		await expect(exportButton(page)).toBeDisabled();
		await expect(gridRows(page, TA.table.TITLE_DATE)).toHaveCount(0);

		expect(
			consoleFindings(shield, [armedRead(DAILY_LOG_PATH, 500), FAILED_RESOURCE]),
			'the refused daily read printed more than the armed 500'
		).toEqual([]);
		expect(
			shield.consoleErrors().some((line) => armedRead(DAILY_LOG_PATH, 500).test(line)),
			'the armed refusal left no console line'
		).toBe(true);
		report('11 refused daily', {
			notices: await notices(page).evaluateAll((nodes) => nodes.map(textOf)),
			bandValues: await bandValues(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120))
		});
	});

	test('11b · a 500 on the counts read: one notice, only Activity missing, the rows still there', async ({
		page,
		fixture,
		shield
	}) => {
		await openReport(page, fixture, {
			script: (c) => ({ ...servedScript(c, fixture), status: { [COUNTS_PATH]: 500 } })
		});

		await expect(notices(page)).toHaveCount(1);
		await expect(tryAgain(page)).toHaveCount(1);
		expect(await bandValues(page)).toEqual([
			'5h 15m',
			bandMissing(TA.figures.UNAVAILABLE),
			bandMissing(TA.figures.EARNINGS_NO_RATES),
			`$40.00 ${billableNote('1h 0m')}`,
			'2'
		]);
		expect(await gridRows(page, TA.table.TITLE_DATE).count(), 'the refused counts read took the rows with it').toBe(
			5
		);
		expect(
			consoleFindings(shield, [armedRead(COUNTS_LOG_PATH, 500), FAILED_RESOURCE]),
			'the refused counts read printed more than the armed 500'
		).toEqual([]);
		report('11b refused counts', {
			bandValues: await bandValues(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120))
		});
	});

	test('11c · a 500 on the weekly read: one notice where the week grid sits, no grid rows, the sheet intact', async ({
		page,
		fixture,
		shield
	}) => {
		await openReport(page, fixture, {
			script: (c) => ({ ...servedScript(c, fixture), status: { [WEEKLY_PATH]: 500 } }),
			path: `${PAGE_PATH}?groupBy=week`
		});

		await expect(notices(page)).toHaveCount(1);
		await expect(tryAgain(page)).toHaveCount(1);
		await expect(table(page, TA.week.TITLE)).toHaveCount(0);
		expect(await bandValues(page)).toEqual([
			'5h 15m',
			'55%',
			bandMissing(TA.figures.EARNINGS_NO_RATES),
			`$40.00 ${billableNote('1h 0m')}`,
			'2'
		]);
		expect(
			consoleFindings(shield, [armedRead(WEEKLY_LOG_PATH, 500), FAILED_RESOURCE]),
			'the refused weekly read printed more than the armed 500'
		).toEqual([]);
		report('11c refused weekly', { consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120)) });
	});

	/* ------------------------------------------ 12. a malformed answer ------------------------------------------ */

	test('12 · a malformed daily answer: no notice, no console error, no rows, and the counts figure beside it', async ({
		page,
		fixture,
		shield
	}) => {
		await openReport(page, fixture, {
			script: (c) => ({ ...servedScript(c, fixture), raw: { [DAILY_PATH]: { nothing: 'here' } } })
		});

		// the read is returned unvalidated (`time-log.service.ts:624-626`), so nothing here can tell it was wrong
		await expect(notices(page)).toHaveCount(0);
		expect(await bandValues(page)).toEqual([
			`0h 0m ${timerNote('5h 15m')}`,
			'55%',
			bandMissing(TA.figures.NO_TIME),
			bandMissing(TA.figures.BILLABLE_NONE),
			'0'
		]);
		await expect(gridRows(page, TA.table.TITLE_DATE)).toHaveCount(0);
		await expect(exportButton(page)).toBeDisabled();
		expect(consoleFindings(shield), 'a malformed daily answer printed a console error').toEqual([]);
		expect(await devOverlayErrors(page), 'a malformed daily answer left a dev error on screen').toEqual([]);
		report('12 malformed daily', { bandValues: await bandValues(page), bandTitles: await bandTitles(page) });
	});

	test('12b · malformed counts: the rows stay, the total is read from them, and Activity falls back to "no tracked time"', async ({
		page,
		fixture,
		shield
	}) => {
		await openReport(page, fixture, {
			script: (c) => ({ ...servedScript(c, fixture), raw: { [COUNTS_PATH]: { nope: true } } })
		});

		await expect(notices(page)).toHaveCount(0);
		expect(await bandValues(page)).toEqual([
			`5h 15m ${timerNote('0h 0m')}`,
			bandMissing(TA.figures.NO_TIME),
			bandMissing(TA.figures.EARNINGS_NO_RATES),
			`$40.00 ${billableNote('1h 0m')}`,
			'2'
		]);
		await expect(gridRows(page, TA.table.TITLE_DATE)).toHaveCount(5);
		expect(consoleFindings(shield), 'malformed counts printed a console error').toEqual([]);
		report('12b malformed counts', { bandValues: await bandValues(page) });
	});

	test('12c · a malformed weekly row: the validated read says so, and prints its own validation line', async ({
		page,
		fixture,
		shield
	}) => {
		await openReport(page, fixture, {
			script: (c) => ({ ...servedScript(c, fixture), raw: { [WEEKLY_PATH]: [{ employee: {} }] } }),
			path: `${PAGE_PATH}?groupBy=week`
		});

		await expect(notices(page)).toHaveCount(1);
		await expect(notices(page)).toContainText(EN.dashboard.states.ERROR_MESSAGE);
		await expect(tryAgain(page)).toHaveCount(1);
		await expect(table(page, TA.week.TITLE)).toHaveCount(0);
		await expect(bandValue(page, 0)).toHaveText('5h 15m');
		expect(
			shield.consoleErrors().some((line) => VALIDATION_LINE.test(line)),
			'the validated read said nothing about the malformed answer'
		).toBe(true);
		expect(
			consoleFindings(shield, [VALIDATION_LINE]),
			'a malformed weekly answer printed something besides its validation line'
		).toEqual([]);
		report('12c malformed weekly', { consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 200)) });
	});

	/* ----------------------------------------- 13. labels: the grouping and its notice -------------------------------- */

	test('13 · the Label grouping: rows per label, and the overlap notice when one entry carries two labels', async ({
		page,
		fixture,
		shield
	}) => {
		await openReport(page, fixture, {
			script: (c) => ({ ...servedScript(c, fixture), daily: servedLabels(c, fixture) }),
			path: `${PAGE_PATH}?groupBy=label`
		});

		await expect(table(page, LABEL_TITLE)).toHaveCount(1);
		await expect(columnHeaders(page, LABEL_TITLE)).resolves.toEqual([
			TA.breakdown.RANK,
			`${EN.timer.labels.LABEL}${TA.grouping.PROJECT}${TA.grouping.MEMBER}`,
			TA.columns.SHARE,
			TA.columns.TRACKED,
			TA.columns.EARNINGS,
			TA.columns.BILLABLE,
			TA.columns.ACTIVITY
		]);
		const rows = await rowTexts(page, LABEL_TITLE);
		report('13 rows', rows);
		expect(
			rows.some((cells) => cells.some((cell) => cell.includes(EN.timer.labels.NO_LABEL))),
			'"No label" is not a row'
		).toBe(true);
		expect(
			rows.some((cells) => cells.some((cell) => cell.includes('Label ta-a'))),
			'Label ta-a is not a row'
		).toBe(true);
		expect(
			rows.some((cells) => cells.some((cell) => cell.includes('Label ta-b'))),
			'Label ta-b is not a row'
		).toBe(true);
		expect(rows.at(-1)?.join(' ')).toContain(totalsPill('timer.labels.COUNT', 3));
		// the notice `labelGroupsOverlap` draws (`time-activity.ts:1580`)
		await expect(overlapNotice(page)).toHaveCount(1);
		await expect(overlapNotice(page)).toContainText(EN.timer.labels.OVERLAP_MESSAGE);
		expect(consoleFindings(shield), 'the label grouping printed a console error').toEqual([]);
	});

	test('13b · the Label grouping with no multi-label entry: one label, and no overlap notice', async ({
		page,
		fixture
	}) => {
		await openReport(page, fixture, {
			script: (c) => servedScript(c, fixture),
			path: `${PAGE_PATH}?groupBy=label`
		});
		await expect(overlapNotice(page)).toHaveCount(0);
		const rows = await rowTexts(page, LABEL_TITLE);
		report('13b rows', rows);
		expect(
			rows.some((cells) => cells.some((cell) => cell.includes('Label ta-a'))),
			'a label row appeared without labels'
		).toBe(false);
		expect(rows.at(-1)?.join(' ')).toContain(totalsPill('timer.labels.COUNT', 1));
	});
});
