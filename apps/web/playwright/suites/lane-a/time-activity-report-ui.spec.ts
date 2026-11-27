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
 * **Checked to hold on any weekday (2026-11-27).** Every served day is named from the run's own browser clock: the
 * period blocks serve `yesterday` and `today` and read their labels back from the same clock; test 6's week grid is
 * opened on an explicit past period (`?from=` = Monday two weeks back, `?to=` = Wednesday of the week before this one,
 * `weekGrid` in `browserClock`) and serves its days **from the columns of the week the grid opens on**, never as days
 * counted back from today, so the drawn week, the period days inside it and the week behind it exist on a Monday, a
 * Tuesday, a Sunday or the 1st of a month alike.
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
 * Every value asserted here is one **this file** printed, on this PC, on this lane. Its whole-file runs are
 * `D:\Coding\.tmp\s3-lane-a-timeactivity-1.log` and every whole-file run after it; each prints a
 * `[lane-a time-activity] MEASURE …` line per
 * test, and every failed assertion also prints Playwright's own `error-context.md` a11y snapshot under
 * `playwright/artifacts/test-results-lane-a/<test>/`. Exactly two values are pinned from a *failure* rather than from a
 * MEASURE line — test 4's expanded table (run 2 failure 1: `Received: 6` toggles and its snapshot's rows) and test 5's
 * bars text (run 2 failure 2: `Received string: "0h1h2h3h0%50%100%FriSatSunMonTueWedThu"`) — and both are re-printed by
 * those tests' own MEASURE lines in the runs after.
 *
 * The lane probes this file was first drafted against (`probe1.spec.ts` → `probe-1.log`, `probe2.spec.ts` →
 * `probe-2.log`, `probe3.spec.ts` → `probe-3.log`, on the PC this work moved from) are **not on this PC**: only
 * `D:\Coding\.tmp\probe-timeactivity\` came across, and it holds scratch serialization checks (`semantics.mjs`,
 * `semantics.spec.ts`), no measurements and no logs. Nothing is asserted from a probe log: each value one of them
 * supplied has been re-measured from the runs above, which is why tests 3, 4, 5, 6, 8 and 9 changed after run 1 and run
 * 2 (finding 10). The served rows are this file's own (`servedScript`: `Row ta-alpha`, `Task ta-one`, …), so every
 * pinned string belongs to *that* data and moves only if the served set moves.
 *
 * Dates come from the browser's clock (`browserClock`): never a pinned day, never a hard-coded zone. The lane ran in
 * `Europe/Madrid` while the mock's profile says `UTC`, which is what the notice under `main output` prints; this file
 * asserts only zones that string carries, read back from the browser itself.
 *
 * ## Findings (measured, with the line that explains them)
 *
 * 1. **Switching a grouping re-reads nothing.** Date → Member → Project → Label → Week → Date issued no new daily read
 *    at all (the query stays `groupBy=date` whatever the switch shows) and only Week asked `report/weekly`
 *    (`s3-lane-a-timeactivity-2.log` "MEASURE 3 reads": `daily 2` before and after the whole switch, one weekly read,
 *    test 3). The rows are computed from rows already loaded: the grouping is a view, not a query.
 * 2. **`groupBy=date` in the query, but the date view ranks by time, not by date.** With 3h 0m yesterday and 2h 15m
 *    today, rank 1 was **Yesterday** and rank 2 **Today** (`-2.log` "MEASURE 4 open at first", tests 2 and 3):
 *    `compareNodes` (`time-activity.ts:1621`) sorts by seconds first, then by the key.
 * 3. **The mock's own project never reaches the Projects filter.** `isProject` (`core/lib/helpers/type-guards.ts:29-42`)
 *    needs `status`, `billing`, `billingFlat`, `budget`, `budgetType`, `projectUrl`, `teams` and `currency`, and
 *    `mock-gauzy-server.mjs:226-238` carries only `name`, `public`, `owner`, `code`, `currency`, `members`, `teams`,
 *    `tags`, so the Projects submenu reads "None" exactly as the Teams submenu does for a manager with no managed team
 *    (`time-activity-filter-menu.tsx:165`, `:179`; `-2.log` "MEASURE 8 menu items" printed
 *    `["TeamsNone","Members","ProjectsNone",…]`, test 8). The daily rows still name the projects, because those come
 *    from the served report, not from that list. Member and Billable filters, which the mock does serve, are used
 *    instead, and this file never stubs `/api/organization-projects`.
 * 4. **A member filter is saved twice, a Billable filter only once.** Picking a member wrote `?members=<employeeId>`
 *    *and* `ever-teams-activity-filters` `{"teamIds":[],"employeeIds":["…"],"projectIds":[],"taskIds":[]}`, and every
 *    daily read then carried `employeeIds[0]` and the counts read did too (`-2.log` "MEASURE 8 reads after the member",
 *    test 8); ticking Billable wrote `?billable=true` and touched no stored filter at all — `ever-teams-activity-filters`
 *    went on holding the empty set `clearFilters` had written, `{"teamIds":[],"employeeIds":[],"projectIds":[],
 *    "taskIds":[]}` (`-3.log` failure 2 and "MEASURE 8 localStorage after Billable"), because clearing *writes* the
 *    empty set instead of removing the key (`use-time-activity-settings.ts:144-150`). That is the two halves of
 *    `use-time-activity-settings.ts:44-48`. The grouping lives only in
 *    the link and the hidden columns only in `localStorage` (`{"hiddenColumns":["activity"]}`, `-2.log` "MEASURE 7
 *    after reload", test 7), so a reload keeps the columns and the member filter and keeps neither the grouping nor the
 *    Billable tick unless the link carried them.
 * 5. **A malformed answer is absorbed by two of the three reads and reported by the third.** An object where the daily
 *    report should be an array answered HTTP 200 and the page showed no rows, a disabled export and "0h 0m 5h 15m by
 *    timer" beside it, with **no console error and no notice** (`-2.log` "MEASURE 12 malformed daily", `consoleErrors []`,
 *    test 12) — that read is returned unvalidated (`time-log.service.ts:624-626`). Malformed counts behaved the same way
 *    ("5h 15m 0h 0m by timer", `–No tracked time`) and left the rows on screen ("MEASURE 12b"). A malformed weekly row
 *    failed the schema and said so: one "This part of the report could not load" notice plus `[ERROR] [App] Weekly
 *    report validation failed: … getTimeLogReportWeekly API response …` ("MEASURE 12c", test 12c).
 * 6. **A refused read shows one notice per block that needs it, not one per request.** Refusing the daily read put a
 *    notice in the sheet, in the split and in the table (three notices, four `Try again` buttons) and left the counts
 *    figures alive (`-2.log` "MEASURE 11 refused daily": 3 notices, band `–Could not load / 55% / –No tracked time /
 *    –Could not load / 0`); refusing the counts read set only Activity to `– Could not load` and left all five rows and
 *    the other four figures ("MEASURE 11b"); refusing the weekly read left one notice and no week rows ("MEASURE 11c",
 *    tests 11, 11b, 11c). The client retries, so the number of failed requests is never pinned — only which lines the
 *    refusal may print (see *Console*).
 * 7. **Nothing opens a report sheet, and Expand all opens every depth.** A row's subject is a `button[aria-expanded]`
 *    (`time-activity-breakdown.tsx:486`); expanding one draws nested rows inside the same `role="table"` and no dialog
 *    appears (test 4: `getByRole('dialog')` count 0 while nested rows are on screen). Expand all reached 6 toggles and
 *    12 rows in the date view — 2 days, the 4 members under them and the 5 projects under those members, plus the
 *    totals row — so it opens nodes at *every* depth, not one level (`-2.log` failure 1 and its `error-context.md`).
 *    "The report sheet" on this page is the section `sheet.LABEL` = "Report of the period", i.e. the figures band, which
 *    is always open.
 * 8. **The week grid's empty day cells are two different things.** A day inside the period with no entry reads `0h`; a day
 *    the period does not cover is an empty cell whose column header carries `title` = `week.OUTSIDE_PERIOD`
 *    (`time-activity-week-grid.tsx:131`, `:196`, test 6): on the run of 2026-11-27 the grid opened on the week of
 *    Monday `Nov 16` and printed `2h 30m / 0h / 2h 0m` on the three days its period covers, then four empty cells whose
 *    headers were titled — `19 Thu`, `20 Fri`, `21 Sat`, `22 Sun` (`s3-lane-a-weekday-timeactivity-1.log`
 *    "MEASURE 6 rows" / "MEASURE 6 titled columns") — and the entry sitting on the period's first day appeared as
 *    `0h 10m`, as that week's whole total, only after the grid was walked back a week ("MEASURE 6 previous week rows").
 * 9. **`role="row"` is not the same as "a row is on screen".** While a block loads, the grid keeps mounted rows that hold
 *    no cell at all, so they would be counted as rows. Every row count in this file therefore counts only `role="row"`
 *    elements that hold a `rowheader`/`cell` (`gridRows` above): 0 for the mock-only page (`-2.log` test 1) and 3 for
 *    the served week grid's data rows (`-2.log` "MEASURE 6 rows"), the header row holding `columnheader`s only.
 * 10. **A log this PC cannot re-read is not evidence.** The draft of this file was pinned from lane probes whose logs
 *    (`probe-1.log`, `probe-2.log`, `probe-3.log`) stayed on the PC the work moved from — `D:\Coding\.tmp\probe-timeactivity\`
 *    holds only scratch `evaluateAll`-serialization checks now. Every value those logs supplied has been re-measured
 *    from this file's own runs, and that is what run 1 and run 2 corrected: the glyph initials in front of a member or
 *    project subject (test 3), the figure `dashboard.team.projects.COUNT` under the split (test 5), the week grid's row
 *    count and its totals, the fact that the labelled chart block prints no legend word (test 5), that Collapse/Expand
 *    all are buttons of the block `region` and not of the `table` (test 4), that the applied-filter chips and the zone
 *    notice live outside `main` (tests 7, 8), that a menu needs more than one Escape to close (test 8), and that a
 *    submenu's checkbox is reached by its own name, never through another `menuitemcheckbox` (test 8).
 * 11. **The labelled chart block prints the axis and the day labels, nothing else.** Its whole text on the served page
 *    was `0h1h2h3h0%50%100%FriSatSunMonTueWedThu` (`-2.log` failure 2), and on the mock-only page it is the axis plus
 *    `chart.EMPTY` = "No time tracked in this period" ("MEASURE 1 … barsText"). The legend words `chart.TRACKED` /
 *    `columns.ACTIVITY` are drawn in `ChartHeader` (`time-activity-report-sheet.tsx:50-56`, the legend at `:55`), beside
 *    the `chart.TITLE` heading test 1 pins, and are *not* inside the `aria-label` plot (`useChartLabels` `:60-68` hands
 *    them to it as labels, `:64`).
 * 12. **The CSV names that same hidden project in the singular.** The on-screen row calls it `common.PRIVATE_PROJECTS`
 *    = "Private projects" (the group all of them share), while every CSV row of the same project reads "Private
 *    project" — `exportRowsOfContext` passes `context.t('common.PRIVATE_PROJECT')` (`time-activity-export-menu.tsx:165`)
 *    and `-2.log` "MEASURE 10 csv body" printed `2026-11-26,Fixture Teammate,Private project,Task ta-four,…`. That is
 *    the naming the hook documents: "Private project" for one record's project, "Private projects" for the row or the
 *    filter choice all of them share (`use-hidden-project-labels.ts:7-10`).
 * 13. **Not covered here, and why.** The saved-reports menu and the share panel (`saved-reports-menu.tsx`,
 *    `saved-report-*.tsx`, `use-saved-reports.ts`, `use-shared-report-token.ts`) are out of scope by the brief — only the
 *    `savedReports.MENU` button is checked (test 1). The PDF's *bytes* are never read, only its file name, per the brief.
 *    The breaks figure is unreachable: the mock answers no break seconds, so `breakSeconds` stays 0 and `breaksFigureOf`
 *    returns no figure (`time-activity-summary-band.tsx:241-243`) — test 1 pins that as the band holding exactly five
 *    figures. The client grouping needs a client filter, which needs a listed client, so it is unreachable with this mock
 *    (finding 3); test 1 pins that its tab is *not* on the switch. The 60-second live re-read of a range that covers
 *    today is not pinned either: no test here counts requests of one path, only what each request carried. And test 9
 *    deliberately does **not** assert what the link does after a calendar pick: the read and the meta line moved to
 *    `Nov 10 – 14` while `page.url()` still read `?period=last7Days` at the moment the run printed it
 *    (`s3-lane-a-timeactivity-2.log` "MEASURE 9 custom range"), and the write goes through the router
 *    (`use-time-activity-settings.ts:156-163` → `writePeriodToLink` `time-activity-link.ts:102-110`), so one reading of
 *    `page.url()` proves nothing in either direction — the pick is pinned by its read and by the meta line only.
 *
 * ## Console
 *
 * `shield.consoleErrors()` was empty in every healthy case, including the mock-only page and both malformed answers
 * (`s3-lane-a-timeactivity-2.log`: "MEASURE 1 console" `[]`, "MEASURE 12 malformed daily" and "MEASURE 12b malformed
 * counts" both `consoleErrors []`, tests 1, 12, 12b). The armed refusals print exactly `Failed to load resource: the
 * server responded with a status of 500 (Internal Server Error)` and `[ERROR] [HttpClient] HTTP Error: GET <path>?<query>
 * 500 {…}` (`core/services/logs/logger-adapter.service.ts`), and only those named lines are excused, with the path and
 * the armed status in the pattern (`armedRead`). The malformed weekly answer prints `[ERROR] [App] Weekly report
 * validation failed: …`. Counts of such lines are never pinned: the client retries (`core/query/config/index.ts`) and
 * `next dev` mounts twice, so the same armed refusal printed 4 of them in one run ("MEASURE 11 refused daily") and 2 in
 * another ("MEASURE 11b refused counts").
 */

const PAGE_PATH = '/reports/time-and-activity';
const DAILY_PATH = '/api/timesheet/time-log/report/daily';
/** The same read as the client logs it (`error.config.url`, no `/api` prefix): `s3-lane-a-timeactivity-2.log`
 * "MEASURE 11 refused daily" printed `GET /timesheet/time-log/report/daily?…`. */
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
	timeZoneNotice: Leaf;
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
/**
 * A value the page does not have starts with `MISSING_VALUE` and the reason sits in an `sr-only` span right after it
 * (`MissingValue` `time-activity-summary-band.tsx:57-64`, `FigureItem` `:299-302`), so the two run together with no space
 * between them: the band read `–No tracked time`, `–No member has an hourly rate`, `–Could not load` and the amount beside
 * its note read `$40.001h 0m billable` (`s3-lane-a-timeactivity-1.log` test 1/2). A table cell does the same
 * (`time-activity-cells.tsx`, `–No hourly rate`), which is why one helper covers both.
 */
const missingValue = (reason: string) => `${MISSING_VALUE}${reason}`;
const bandMissing = missingValue;
const cellMissing = missingValue;
/** A subject cell's glyph: the name's first and last word initials (`initialsOf` `time-activity-cells.tsx:149-154`). */
const initials = (name: string) => {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? '';
	const lastWord = words.at(-1);
	const last = words.length < 2 ? '' : (lastWord?.[0] ?? '');
	return `${first}${last}`.toUpperCase();
};
/** The split's own count line, `timeSplitMetaOf` (`kit/time-split.tsx:46-55`) — not the band's `On 3 projects`. */
const splitCount = (count: number) => msg('dashboard.team.projects.COUNT', { count });
const noRate = cellMissing(TA.table.NO_RATE);
const noBillable = cellMissing(TA.figures.BILLABLE_NONE);
/** The count beside a row's name: `CountPill` prints the number, then the `sr-only` label (`time-activity-breakdown.tsx:451-458`). */
const countPill = (key: string, count: number) => `${count}${msg(key, { count })}`;
const memberPill = (count: number) => countPill('dashboard.timeActivity.table.MEMBERS', count);
const projectPill = (count: number) => countPill('dashboard.timeActivity.table.PROJECTS', count);
const taskPill = (count: number) => countPill('dashboard.timeActivity.breakdown.TASKS', count);
const dayPill = (count: number) => countPill('dashboard.timeActivity.table.DAYS', count);
/** A totals row's count, printed on its own with no number before it (`TotalsCells` `time-activity-breakdown.tsx:823-827`). */
const plainCount = (key: string, count: number) => msg(key, { count });
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

/**
 * Page-side reads, each a **self-contained** function handed to `evaluateAll` by reference. `evaluateAll` stringifies the
 * function it is given and runs it in the page, where a captured Node variable is simply gone (one shared `textOf` here
 * threw `ReferenceError: textOf is not defined` in every read; a captured name like `name` would silently read
 * `window.name` instead), so the flattening travels inside each function, exactly as `apps-urls-dashboard-ui.spec.ts:326`
 * inlines it.
 */
const pageTexts = (nodes: Element[]) => nodes.map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim());
/** One grid row's cells in DOM order: its `rowheader`, then every `cell`. */
const pageRowCells = (rows: Element[]) =>
	rows.map((row) =>
		Array.from(row.querySelectorAll('[role="rowheader"],[role="cell"]')).map((cell) =>
			(cell.textContent || '').replace(/\s+/g, ' ').trim()
		)
	);
/** A column header beside its `title`, keeping only the headers that carry one. */
const pageTitledHeaders = (nodes: Element[]) =>
	nodes
		.map((node): [string, string | null] => [
			(node.textContent || '').replace(/\s+/g, ' ').trim(),
			node.getAttribute('title')
		])
		.filter((pair): pair is [string, string] => typeof pair[1] === 'string');
/** A view-menu button: its label, its `aria-pressed`, and whether it is disabled. */
const pagePressedButtons = (nodes: Element[]) =>
	nodes.map((node) => [
		(node.textContent || '').replace(/\s+/g, ' ').trim(),
		node.getAttribute('aria-pressed'),
		node.hasAttribute('disabled')
	]);
/** A filter-menu item: its label and its `aria-haspopup`. */
const pageMenuItems = (nodes: Element[]) =>
	nodes.map((node) => [(node.textContent || '').replace(/\s+/g, ' ').trim(), node.getAttribute('aria-haspopup')]);

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
			// whole weeks between the Thursday of week 1 and the Thursday of the week holding `date`
			return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604_800_000);
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
		/**
		 * The period test 6 opens the week grid on, written into the link as `from`/`to` (`periodOfDays`
		 * `time-activity-link.ts:69-80`, honoured by `period = linkedPeriod ?? defaultPeriod`
		 * `use-time-activity-report.ts:380`): Monday two weeks back 00:00 to Wednesday of the week before this one
		 * 23:59:59.999 — two whole Monday-start weeks, every day of them in the past on **any** weekday. The grid
		 * always opens on the period's LAST week (`initialWeekIndexOf` `time-activity.ts:926-933`), so the drawn week is
		 * never the current one and is never cut by today: its window is its first three days (`weekWindowOf` `:949-953`
		 * → `use-time-activity-week.ts:121`), its four remaining days sit outside the period (`isInPeriod`
		 * `use-time-activity-week.ts:83-98`), and its index in the period is 1, so the Previous week button is enabled
		 * (`use-time-activity-week.ts:160`) and walks to the week that holds the period's first day. With the page's own
		 * last-7-days period none of that holds on a Monday (only today is a period day of the drawn week) or on a
		 * Sunday (all seven are, so no column is outside the period and the period is one week long, so the button is
		 * disabled). Every step here is a `setDate` step from this week's Monday, so a month or a DST boundary in
		 * between cannot move a day.
		 */
		const shiftDay = (date: Date, days: number) => {
			const moved = new Date(date.getFullYear(), date.getMonth(), date.getDate());
			moved.setDate(moved.getDate() + days);
			return moved;
		};
		const endOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
		const gridWeekStart = shiftDay(weekStartDay, -7);
		const gridBackStart = shiftDay(weekStartDay, -14);
		const gridPeriodTo = endOf(shiftDay(weekStartDay, -5));
		const gridPeriodDayKeys: string[] = [];
		for (let offset = 0; offset < 10; offset += 1) {
			gridPeriodDayKeys.push(key(shiftDay(gridBackStart, offset)));
		}
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
			/**
			 * The period clipped to the current week is what the week grid reads on the page's own last-7-days period:
			 * the read the switch to Week started carried `startDate` = Monday 00:00 and `endDate` = today
			 * 23:59:59.999, both in the browser's zone (`s3-lane-a-timeactivity-2.log` "MEASURE 3 weekly reads").
			 */
			weekReadFrom: weekStart.toISOString(),
			weekReadTo: last7To.toISOString(),
			/** Everything test 6 needs about its own period and the two weeks the grid can walk between. */
			weekGrid: {
				fromKey: key(gridBackStart),
				toKey: key(gridPeriodTo),
				/** The week the grid opens on: the period's last week, never the current one. */
				columns: columnsOf(gridWeekStart),
				/** The week its Previous week button walks to. */
				backColumns: columnsOf(gridBackStart),
				/** Every day of the period: the columns inside it are the window, the rest are outside it. */
				periodDayKeys: gridPeriodDayKeys,
				/** The served days, picked from the drawn week itself: time on its first and third day, none on its second. */
				servedFromKey: key(gridWeekStart),
				emptyKey: key(shiftDay(gridWeekStart, 1)),
				servedToKey: key(shiftDay(gridWeekStart, 2)),
				/** The period's first day: a day of the week back, where only the walk reaches it. */
				backDayKey: key(gridBackStart),
				windowText: periodText(gridWeekStart, gridPeriodTo),
				windowFrom: shiftDay(gridWeekStart, 0).toISOString(),
				windowTo: gridPeriodTo.toISOString(),
				backWindowFrom: shiftDay(gridBackStart, 0).toISOString(),
				backWindowTo: endOf(shiftDay(gridBackStart, 6)).toISOString(),
				isoWeek: isoWeekOf(gridWeekStart)
			},
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
 * Served set: yesterday 5 400 s + 1 800 s on `Row ta-alpha` and 3 600 s on `Row ta-beta`, today 7 200 s on
 * `Row ta-alpha` and 900 s on a project the reader is not on. Totals 18 900 s = 5h 15m over 2 days, 2 members,
 * 3 projects — the totals every run printed for it (`s3-lane-a-timeactivity-2.log` "MEASURE 2 sheet" `5h 15m` / `2`,
 * "MEASURE 3 Project rows" `Total3 projects`).
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

/**
 * One billable hour priced at the member's own 40 USD rate: the sheet then reads $40.00
 * (`s3-lane-a-timeactivity-2.log` "MEASURE 2 sheet": `$40.001h 0m billable`).
 */
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

/**
 * Test 6's week grid, served on the days of the week the grid opens on (`clock.weekGrid`, picked from its own columns
 * rather than counted back from today, so they are columns of the drawn week on any weekday): 9 000 s and 1 800 s on
 * that week's first day, nothing on its second, 7 200 s and 0 s on its third, and 600 s on the period's first day,
 * which sits in the week the Previous week button walks to. The seconds are the ones the earlier runs printed
 * (`s3-lane-a-timeactivity-1.log` test 6, `-2.log` "MEASURE 6 rows"); only the days they sit on moved, so every cell
 * and every total of this grid is the same printed string.
 */
function servedWeekGrid(clock: Clock, fixture: BootstrapFixture): ServedWeekly {
	const { backDayKey, servedFromKey, servedToKey } = clock.weekGrid;
	return [
		{
			employee: { id: fixture.ids.employee, fullName: fixture.names.user },
			dates: { [backDayKey]: { sum: 600 }, [servedFromKey]: { sum: 9000 }, [servedToKey]: { sum: 7200 } }
		},
		{
			employee: { id: fixture.ids.teammateEmployee, fullName: fixture.names.teammate },
			dates: { [servedFromKey]: { sum: 1800 }, [servedToKey]: { sum: 0 } }
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

/**
 * Served labels, on yesterday's first two tasks, so one entry carries two of them
 * (`s3-lane-a-timeactivity-2.log`: "MEASURE 13 rows" is the overlap case, "MEASURE 13b rows" the single-label one).
 */
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

/**
 * Routes first, cookies second, navigation last (`helpers.ts:439-470`); the clock is read before any of them, so a path
 * may be built from the same clock the served set is keyed to (test 6 names its own period in the link).
 */
async function openReport(
	page: Page,
	fixture: BootstrapFixture,
	options: { script?: (clock: Clock) => ReportScript; path?: string | ((clock: Clock) => string) } = {}
): Promise<Clock> {
	const clock = await browserClock(page);
	if (options.script) serveReport(page, options.script(clock));
	await signInAndVisit(
		page,
		fixture,
		typeof options.path === 'function' ? options.path(clock) : (options.path ?? PAGE_PATH)
	);
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
const bandValues = (page: Page) => page.locator('main dl dd').evaluateAll(pageTexts);
const bandTerms = (page: Page) => page.locator('main dl dt').evaluateAll(pageTexts);
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
/**
 * The chips sit in the toolbar strip *above* `main` (`AppliedTimeActivityFilters` `time-activity-filter-menu.tsx:312-347`,
 * rendered by the page header slot), so this one is deliberately not scoped to `main` — scoped to `main` it found nothing
 * while the chip was on screen (`s3-lane-a-timeactivity-1.log` test 8 snapshot).
 */
const chips = (page: Page) =>
	page.locator('span.rounded-full').filter({ has: page.locator('[aria-label^="Remove "]') });
const filterMenu = (page: Page) => page.getByRole('menu').first();
const subMenuOptions = (page: Page) => page.getByRole('menuitemcheckbox');
/**
 * The shell's own time-zone notice: an `output` of the header (`page-layout.tsx:115-142` renders it into `GlobalHeader`,
 * which sits before `<main>`), so it is outside `main`, exactly as `suites/lane-c/actual-expected-report-ui.spec.ts:561-566`
 * treats it. The match is the key's own text up to its first placeholder, never a typed sentence.
 */
const zonePrefix: string = EN.timeZoneNotice.TITLE.slice(0, EN.timeZoneNotice.TITLE.indexOf('{'));
const zoneNotice = (page: Page) => page.locator('output').filter({ hasText: zonePrefix });
/** One report block: its `region` carries the block's own controls (Expand all / Collapse all, the week stepper). */
const block = (page: Page, title: string) => page.getByRole('region', { name: title });

async function rowTexts(page: Page, title: string): Promise<string[][]> {
	return gridRows(page, title).evaluateAll(pageRowCells);
}

async function columnHeaders(page: Page, title: string): Promise<string[]> {
	return table(page, title).getByRole('columnheader').evaluateAll(pageTexts);
}

/**
 * Closing the filter menu. Its fields open a submenu of their own (`time-activity-filter-menu.tsx:168-213`) and the
 * options close nothing on click (`closeOnClick={false}`, `:135`), and one Escape only took the submenu — the run still
 * had `menu "Filter 1"` open afterwards (`s3-lane-a-timeactivity-1.log` test 8 snapshot), which is what ate the page-level
 * clicks. So: press Escape until the trigger stops saying `aria-expanded=true` (the run's snapshot has exactly that
 * attribute on `button "Filter 1"`), and fail loudly if it keeps saying it.
 */
async function closeFilterMenu(page: Page): Promise<void> {
	for (let attempt = 0; attempt < 4; attempt += 1) {
		if ((await filterButton(page).getAttribute('aria-expanded')) === 'false') {
			break;
		}
		await page.keyboard.press('Escape');
	}
	await expect(filterButton(page), 'the filter menu stayed open').toHaveAttribute('aria-expanded', 'false');
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

		// five figures, in `bandFiguresOf`'s order, and no breaks figure at all (finding 13)
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
		expect(await page.locator('main h2').evaluateAll(pageTexts)).toEqual([
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

		// the switch the mock's answers offer: Label yes, Client no (finding 13)
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
		const notice = zoneNotice(page);
		await expect(notice).toHaveCount(1);
		await expect(notice).toContainText(clock.timeZone);
		await expect(notice).toContainText('UTC');

		// the mock's own answers: the daily read (plain and billable) and the counts read, no weekly read
		expect(searches(calls, DAILY_PATH).length).toBeGreaterThanOrEqual(1);
		expect(searches(calls, COUNTS_PATH).length).toBeGreaterThanOrEqual(1);
		expect(ofPath(calls, WEEKLY_PATH)).toEqual([]);

		report(
			'1 console',
			shield.consoleErrors().map((line) => line.slice(0, 160))
		);
		report('1 dev overlay', await devOverlayErrors(page));
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
				`$40.00${billableNote('1h 0m')}`,
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
		// the saved-reports menu's own button, drawn once its own read answered
		// (`time-activity-saved-reports.tsx:430-433` returns null until `isAnswered`); the menu itself is out of scope
		await expect(sheet(page).getByRole('button', { name: EN.dashboard.savedReports.MENU })).toHaveCount(1);

		// the served date view, ranked by time (`s3-lane-a-timeactivity-1.log` "MEASURE 4 open at first"). A member or a
		// project row starts with the glyph's initials (`SubjectLabel` `time-activity-breakdown.tsx:380-398` →
		// `PersonGlyph`/`ProjectGlyph`), a day, a task, a label or the private-project row does not.
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
				[
					'',
					`${initials(fixture.names.user)}${fixture.names.user}${projectPill(2)}`,
					'83%',
					'2h 30m',
					noRate,
					'$40.00',
					'68%'
				],
				[
					'',
					`${initials(fixture.names.teammate)}${fixture.names.teammate}${projectPill(1)}`,
					'17%',
					'0h 30m',
					noRate,
					noBillable,
					'50%'
				],
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

		// Member, Project and Task: each its own header path, its own rows in `compareNodes`' order
		// (`time-activity.ts:1621`: seconds first, then the key), every cell exactly as this file printed it
		// (`s3-lane-a-timeactivity-1.log` "MEASURE 3 … headers" / "… rows"). A member or a named project subject starts
		// with the glyph's initials; a task subject and the private project do not
		// (`SubjectLabel` `time-activity-breakdown.tsx:380-399` → `PersonGlyph` `time-activity-cells.tsx:155-162`,
		// `ProjectGlyph` `:109-129`, whose private project draws the lock instead of a tile).
		const memberName = `${initials(fixture.names.user)}${fixture.names.user}`;
		const mateName = `${initials(fixture.names.teammate)}${fixture.names.teammate}`;
		const alphaName = `${initials(ALPHA.name)}${ALPHA.name}`;
		const betaName = `${initials(BETA.name)}${BETA.name}`;
		const privateName = EN.common.PRIVATE_PROJECTS;
		const taskActivity = cellMissing(TA.breakdown.TASK_ACTIVITY);

		for (const [grouping, title, param, headers, rows] of [
			[
				TA.grouping.MEMBER,
				TA.table.TITLE_MEMBER,
				'member',
				[
					TA.breakdown.RANK,
					`${TA.grouping.MEMBER}${TA.grouping.PROJECT}${TA.grouping.TASK}`,
					TA.columns.SHARE,
					TA.columns.TRACKED,
					TA.columns.EARNINGS,
					TA.columns.BILLABLE,
					TA.columns.ACTIVITY
				],
				[
					['1', `${memberName}${projectPill(2)}`, '86%', '4h 30m', noRate, '$40.00', '49%'],
					['', `${alphaName}${taskPill(2)}`, '78%', '3h 30m', noRate, '$40.00', '40%'],
					['', `${betaName}${taskPill(1)}`, '22%', '1h 0m', noRate, noBillable, '80%'],
					['2', `${mateName}${projectPill(2)}`, '14%', '0h 45m', noRate, noBillable, '47%'],
					['', totalsPill('dashboard.timeActivity.table.MEMBERS', 2), '', '5h 15m', noRate, '$40.00', '49%']
				]
			],
			[
				TA.grouping.PROJECT,
				TA.table.TITLE_PROJECT,
				'project',
				[
					TA.breakdown.RANK,
					`${TA.grouping.PROJECT}${TA.grouping.TASK}${TA.grouping.MEMBER}`,
					TA.columns.SHARE,
					TA.columns.TRACKED,
					TA.columns.EARNINGS,
					TA.columns.BILLABLE,
					TA.columns.ACTIVITY
				],
				[
					['1', `${alphaName}${taskPill(2)}`, '76%', '4h 0m', noRate, '$40.00', '41%'],
					['', `Task ta-one${memberPill(2)}`, '88%', '3h 30m', noRate, '$40.00', taskActivity],
					['', `Task ta-two${memberPill(1)}`, '13%', '0h 30m', noRate, noBillable, taskActivity],
					['2', `${betaName}${taskPill(1)}`, '19%', '1h 0m', noRate, noBillable, '80%'],
					['3', `${privateName}${taskPill(1)}`, '5%', '0h 15m', noRate, noBillable, '40%'],
					['', totalsPill('dashboard.timeActivity.table.PROJECTS', 3), '', '5h 15m', noRate, '$40.00', '49%']
				]
			],
			[
				// the only view that offers a Projects column (`offersProjectsColumn`)
				TA.grouping.TASK,
				TA.table.TITLE_TASK,
				'task',
				[
					TA.breakdown.RANK,
					`${TA.grouping.TASK}${TA.grouping.MEMBER}${TA.grouping.DATE}`,
					TA.columns.PROJECTS,
					TA.columns.SHARE,
					TA.columns.TRACKED,
					TA.columns.EARNINGS,
					TA.columns.BILLABLE,
					TA.columns.ACTIVITY
				],
				[
					['1', `Task ta-one${memberPill(2)}`, alphaName, '67%', '3h 30m', noRate, '$40.00', taskActivity],
					['', `${memberName}${dayPill(2)}`, alphaName, '86%', '3h 0m', noRate, '$40.00', taskActivity],
					['', `${mateName}${dayPill(1)}`, alphaName, '14%', '0h 30m', noRate, noBillable, taskActivity],
					['2', `Task ta-three${memberPill(1)}`, betaName, '19%', '1h 0m', noRate, noBillable, taskActivity],
					['3', `Task ta-two${memberPill(1)}`, alphaName, '10%', '0h 30m', noRate, noBillable, taskActivity],
					[
						'4',
						`Task ta-four${memberPill(1)}`,
						privateName,
						'5%',
						'0h 15m',
						noRate,
						noBillable,
						taskActivity
					],
					[
						'',
						totalsPill('dashboard.timeActivity.breakdown.TASKS', 4),
						plainCount('dashboard.timeActivity.table.PROJECTS', 3),
						'',
						'5h 15m',
						noRate,
						'$40.00',
						'49%'
					]
				]
			]
		] as Array<[string, string, string, string[], string[][]]>) {
			await groupingTab(page, grouping).click();
			await expect(groupingTab(page, grouping)).toHaveAttribute('aria-selected', 'true');
			await expect(page).toHaveURL(new RegExp(`groupBy=${param}`));
			await expect(table(page, title)).toHaveCount(1);
			await expect.poll(() => columnHeaders(page, title)).toEqual(headers);
			await expect.poll(() => rowTexts(page, title)).toEqual(rows);
			// the private project is named by `common.PRIVATE_PROJECTS` and never by its own name
			expect(
				(await rowTexts(page, title)).flat().some((cell) => cell.includes(HIDDEN.name)),
				'a row printed the private project own name'
			).toBe(false);
			report(`3 ${grouping} rows`, rows);
		}
		await quietWindow(page);
		expect(ofPath(calls, DAILY_PATH).length, 'switching a grouping re-read the report').toBe(dailyAtStart);
		expect(ofPath(calls, WEEKLY_PATH), 'a view that shows no week asked for one').toEqual([]);

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
		await expect.poll(() => ofPath(calls, WEEKLY_PATH).length).toBeGreaterThan(0);
		const weekly = ofPath(calls, WEEKLY_PATH);
		report('3 weekly reads', searches(calls, WEEKLY_PATH));
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
		const clock = await openReport(page, fixture, { script: (c) => servedScript(c, fixture) });
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

		// Expand all / Collapse all belong to the block, beside its `h2`, not to the grid inside it
		// (`time-activity-breakdown.tsx` renders them in the section header; the run's snapshot has them as
		// `region "Time by date" > button`, siblings of `table "Time by date"`).
		const collapseAll = block(page, title).getByRole('button', { name: TA.table.COLLAPSE_ALL, exact: true });
		const expandAll = block(page, title).getByRole('button', { name: TA.table.EXPAND_ALL, exact: true });
		await expect(collapseAll).toHaveCount(1);
		await collapseAll.click();
		await expect(toggles.first()).toHaveAttribute('aria-expanded', 'false');
		const collapsed = await rowTexts(page, title);
		report('4 after collapse all', collapsed);
		expect(collapsed.length, 'Collapse all left nested rows on screen').toBe(3);
		expect(collapsed[0][1]).toContain(EN.common.YESTERDAY);
		expect(collapsed[0][1]).toContain(memberPill(2));
		expect(collapsed[1][1]).toContain(EN.common.TODAY);
		expect(collapsed[2][1]).toContain(totalsPill('dashboard.timeActivity.table.DAYS', 2));

		// Expand all opens every node that has children, at every depth: the 2 day rows and the 4 member rows under them
		// (`use-time-activity-breakdown.ts:56-70`). A project row is a leaf, so it draws no toggle — the run counted 6
		// `button[aria-expanded]` in the grid and its snapshot had all six `[expanded]`
		// (`s3-lane-a-timeactivity-2.log` failure 1).
		await expect(expandAll).toHaveCount(1);
		await expandAll.click();
		await expect(toggles).toHaveCount(6);
		await expect(table(page, title).locator('button[aria-expanded="true"]')).toHaveCount(6);
		// the whole expanded table, row by row as that snapshot printed it: 2 days, each member under its day, each
		// project under its member, and the totals row last
		const expanded = await rowTexts(page, title);
		report('4 after expand all', expanded);
		expect(expanded).toEqual([
			[
				'1',
				`${EN.common.YESTERDAY}${clock.yesterdayLabel}${memberPill(2)}`,
				'57%',
				'3h 0m',
				noRate,
				'$40.00',
				'65%'
			],
			[
				'',
				`${initials(fixture.names.user)}${fixture.names.user}${projectPill(2)}`,
				'83%',
				'2h 30m',
				noRate,
				'$40.00',
				'68%'
			],
			['', `${initials(ALPHA.name)}${ALPHA.name}`, '60%', '1h 30m', noRate, '$40.00', '60%'],
			['', `${initials(BETA.name)}${BETA.name}`, '40%', '1h 0m', noRate, noBillable, '80%'],
			[
				'',
				`${initials(fixture.names.teammate)}${fixture.names.teammate}${projectPill(1)}`,
				'17%',
				'0h 30m',
				noRate,
				noBillable,
				'50%'
			],
			['', `${initials(ALPHA.name)}${ALPHA.name}`, '100%', '0h 30m', noRate, noBillable, '50%'],
			['2', `${EN.common.TODAY}${clock.todayLabel}${memberPill(2)}`, '43%', '2h 15m', noRate, noBillable, '27%'],
			[
				'',
				`${initials(fixture.names.user)}${fixture.names.user}${projectPill(1)}`,
				'89%',
				'2h 0m',
				noRate,
				noBillable,
				'25%'
			],
			['', `${initials(ALPHA.name)}${ALPHA.name}`, '100%', '2h 0m', noRate, noBillable, '25%'],
			[
				'',
				`${initials(fixture.names.teammate)}${fixture.names.teammate}${projectPill(1)}`,
				'11%',
				'0h 15m',
				noRate,
				noBillable,
				'40%'
			],
			['', EN.common.PRIVATE_PROJECTS, '100%', '0h 15m', noRate, noBillable, '40%'],
			['', totalsPill('dashboard.timeActivity.table.DAYS', 2), '', '5h 15m', noRate, '$40.00', '49%']
		]);
		// the private project reaches the expanded tree as a name of its own, never as its own name
		expect(
			expanded.flat().some((cell) => cell.includes(HIDDEN.name)),
			'an expanded row printed the private project own name'
		).toBe(false);

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
		// the block's own count line (`timeSplitMetaOf` `kit/time-split.tsx:46-55` → `dashboard.team.projects.COUNT`),
		// which is `3 projects`, not the band's `On 3 projects` (`s3-lane-a-timeactivity-1.log` test 5)
		await expect(split(page)).toContainText(splitCount(3));
		// one row per project: the share, the name, the hours (`kit/share-rows.tsx:63-103`)
		await expect(splitRows(page)).toHaveCount(3);
		expect(await splitRows(page).evaluateAll(pageTexts)).toEqual([
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

		// The bars: the labelled plot holds the axis ticks and one label per day of the period, and nothing else. The
		// legend words `chart.TRACKED` / `columns.ACTIVITY` belong to `ChartHeader` (`time-activity-report-sheet.tsx:50-56`,
		// the legend is drawn at `:55`), a sibling of the plot the labels are handed to (`useChartLabels` `:60-68` writes them into the `aria-label` of
		// the `role="slider"` block), so they are never inside it — the run printed that block's whole text as
		// `0h1h2h3h0%50%100%FriSatSunMonTueWedThu` (`s3-lane-a-timeactivity-2.log` failure 2). Whitespace is squeezed
		// because the ticks are inline elements, and the day labels come from the browser clock, never typed here.
		await expect(bars(page)).toHaveCount(1);
		const barsText = async () => (await bars(page).innerText()).replace(/\s+/g, '');
		const expectedBarsText = `0h1h2h3h0%50%100%${clock.periodDays.map((day) => day.label).join('')}`;
		report('5 bars text', await barsText());
		await expect.poll(barsText).toBe(expectedBarsText);
		report('5 split text', flat(await split(page).innerText()));
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
		// Opened on `clock.weekGrid`'s own past period (see `browserClock`): two whole Monday-start weeks that are in
		// the past on every weekday, so the drawn week, the days of it the period covers and the week behind it exist
		// whatever day the run runs on.
		const clock = await openReport(page, fixture, {
			script: (c) => ({ ...servedScript(c, fixture), weekly: servedWeekGrid(c, fixture) }),
			path: (c) => `${PAGE_PATH}?groupBy=week&from=${c.weekGrid.fromKey}&to=${c.weekGrid.toKey}`
		});
		const { weekGrid } = clock;

		await expect(table(page, TA.week.TITLE)).toHaveCount(1);
		// the grid's own header row holds `columnheader`s only, so `gridRows` never counts it: what it counts is the two
		// member rows and the totals row (`s3-lane-a-timeactivity-1.log` test 6: 3, not 4)
		await expect(gridRows(page, TA.week.TITLE)).toHaveCount(3);
		// The served days are columns of the drawn week itself, never days counted back from today. That week's window
		// is its first three days (`weekWindowOf` `time-activity.ts:949-953`), served time sits on its first and its
		// third, and its second carries nothing; its four remaining days are outside the period.
		const periodKeys = new Set(weekGrid.periodDayKeys);
		const servedIndex = weekGrid.columns.findIndex((column) => column.key === weekGrid.servedFromKey);
		const emptyIndex = weekGrid.columns.findIndex((column) => column.key === weekGrid.emptyKey);
		const lastServedIndex = weekGrid.columns.findIndex((column) => column.key === weekGrid.servedToKey);
		const outsideColumns = weekGrid.columns.filter((column) => !periodKeys.has(column.key));
		expect(
			weekGrid.columns.filter((column) => periodKeys.has(column.key)).map((column) => column.key),
			'the drawn week does not hold exactly the three period days this served set is keyed to'
		).toEqual([weekGrid.servedFromKey, weekGrid.emptyKey, weekGrid.servedToKey]);
		expect(servedIndex, 'the first served day is not the first column of the drawn week').toBe(0);
		expect(emptyIndex, 'the day served with nothing is not the second column of the drawn week').toBe(1);
		expect(lastServedIndex, 'the last served day is not the third column of the drawn week').toBe(2);
		expect(outsideColumns.length, 'the drawn week holds no day outside the period to title').toBe(4);
		// the entry on the period's first day is only reachable one week back, which is what the walk tests
		expect(
			weekGrid.backColumns.some((column) => column.key === weekGrid.backDayKey),
			'the period first day is not in the week before the drawn one'
		).toBe(true);

		await expect
			.poll(() => columnHeaders(page, TA.week.TITLE))
			.toEqual([
				EN.common.MEMBER,
				...weekGrid.columns.map((column) => column.label),
				EN.dashboard.team.export.TOTAL
			]);
		// Every cell of the served grid, cell by cell as the run printed it (`s3-lane-a-timeactivity-1.log` test 6):
		// a day of the period with no entry reads `0h`, a day the period does not reach is an empty cell
		// (`time-activity-week-grid.tsx:131`, `:196`), and a row's Total sums the days the grid read, not the period
		// (`servedWeekGrid` puts 600 s on the period's first day, which is outside the week this grid draws).
		// every duration this served set can print, each one printed by a run (`s3-lane-a-timeactivity-1.log` /
		// `-2.log` "MEASURE 6 rows"); 16 200 s is the row total the grid sums for the manager's week
		const gridCell = (seconds: number) =>
			({
				0: '0h',
				600: '0h 10m',
				1800: '0h 30m',
				7200: '2h 0m',
				9000: '2h 30m',
				10800: '3h 0m',
				16200: '4h 30m',
				18000: '5h 0m'
			})[seconds] ?? `unprinted:${seconds}`;
		const managerDates: Record<string, number> = {
			[weekGrid.backDayKey]: 600,
			[weekGrid.servedFromKey]: 9000,
			[weekGrid.servedToKey]: 7200
		};
		const mateDates: Record<string, number> = {
			[weekGrid.servedFromKey]: 1800,
			[weekGrid.servedToKey]: 0
		};
		const datesOf = (...sets: Array<Record<string, number>>) => {
			const merged: Record<string, number> = {};
			for (const set of sets)
				for (const [key, value] of Object.entries(set)) merged[key] = (merged[key] ?? 0) + value;
			return merged;
		};
		const gridRow = (subject: string, dates: Record<string, number>) => [
			subject,
			...weekGrid.columns.map((column) => (periodKeys.has(column.key) ? gridCell(dates[column.key] ?? 0) : '')),
			gridCell(
				weekGrid.columns.reduce(
					(sum, column) => sum + (periodKeys.has(column.key) ? (dates[column.key] ?? 0) : 0),
					0
				)
			)
		];
		const rows = await rowTexts(page, TA.week.TITLE);
		report('6 rows', rows);
		expect(rows).toEqual([
			gridRow(`${initials(fixture.names.user)}${fixture.names.user}`, managerDates),
			gridRow(`${initials(fixture.names.teammate)}${fixture.names.teammate}`, mateDates),
			gridRow(totalsPill('dashboard.timeActivity.table.MEMBERS', 2), datesOf(managerDates, mateDates))
		]);
		const manager = rows.find((cells) => cells[0].includes(fixture.names.user)) ?? [];
		const teammate = rows.find((cells) => cells[0].includes(fixture.names.teammate)) ?? [];
		const totals = rows.at(-1) ?? [];
		expect(manager.at(-1)).toBe('4h 30m');
		expect(teammate.at(-1)).toBe('0h 30m');
		expect(totals.at(-1)).toBe('5h 0m');
		// the days served time sits on, and the day of the period served with nothing, as `0h`
		expect(manager[servedIndex + 1]).toBe('2h 30m');
		expect(manager[emptyIndex + 1]).toBe('0h');
		expect(manager[lastServedIndex + 1]).toBe('2h 0m');

		// a day the period does not cover: an empty column whose header is titled (`time-activity-week-grid.tsx:131`, `:196`)
		const titled = await table(page, TA.week.TITLE).getByRole('columnheader').evaluateAll(pageTitledHeaders);
		report('6 titled columns', titled);
		expect(titled.length, 'the titled columns are not the days of the drawn week outside the period').toBe(
			outsideColumns.length
		);
		for (const [, title] of titled) expect(title).toBe(TA.week.OUTSIDE_PERIOD);

		// the week the grid names, in its own group beside the period group
		const weekGroup = page.getByRole('group', { name: TA.week.TITLE });
		await expect(weekGroup).toHaveCount(1);
		await expect(weekGroup).toContainText(weekGrid.windowText);
		await expect(weekGroup).toContainText(weekNumber(weekGrid.isoWeek));
		const previousWeek = page.getByRole('button', { name: EN.timeActivity.PREVIOUS_WEEK, exact: true });
		await expect(previousWeek).toBeEnabled();

		await previousWeek.click();
		await expect
			.poll(() => columnHeaders(page, TA.week.TITLE))
			.toEqual([
				EN.common.MEMBER,
				...weekGrid.backColumns.map((column) => column.label),
				EN.dashboard.team.export.TOTAL
			]);
		const walked = await rowTexts(page, TA.week.TITLE);
		report('6 previous week rows', walked);
		report('6 previous week reads', searches(calls, WEEKLY_PATH));
		// the entry on the period's first day moved into view, as 0h 10m, and it is the only time that week holds
		const walkedManager = walked.find((cells) => cells[0].includes(fixture.names.user)) ?? [];
		expect(walkedManager.join(' ')).toContain('0h 10m');
		expect(walkedManager.at(-1), 'the week back holds more time than the entry it shows').toBe('0h 10m');
		await expect
			.poll(() => ofPath(calls, WEEKLY_PATH).at(-1)?.params.get('startDate'))
			.toBe(weekGrid.backWindowFrom);
		const weekly = ofPath(calls, WEEKLY_PATH).at(-1);
		expect(weekly?.params.get('endDate')).toBe(weekGrid.backWindowTo);

		// and the column toggles are inert here, with the note that says why (`time-activity-view-menu.tsx:104`, `:109-113`)
		await viewButton(page).click();
		await expect(viewPopover(page)).toContainText(TA.view.COLUMNS);
		await expect(viewPopover(page)).toContainText(TA.view.WEEK_NOTE_V2);
		const pressed = await viewPopover(page).locator('button[aria-pressed]').evaluateAll(pagePressedButtons);
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
		const items = await filterMenu(page).getByRole('menuitem').evaluateAll(pageMenuItems);
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

		// the member submenu: the three members the mock's team carries, each one a `menuitemcheckbox` the run counted
		await filterMenu(page).getByRole('menuitem', { name: TA.filters.MEMBERS, exact: true }).click();
		const teammateOption = subMenuOptions(page).filter({ hasText: fixture.names.teammate });
		await expect(subMenuOptions(page)).toHaveCount(3);
		await expect(teammateOption).toHaveCount(1);
		await expect(subMenuOptions(page).filter({ hasText: fixture.names.denied })).toHaveCount(1);
		await expect(teammateOption).toHaveAttribute('aria-checked', 'false');
		await teammateOption.click();
		await expect(teammateOption).toHaveAttribute('aria-checked', 'true');
		await closeFilterMenu(page);

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
		// the filter travels to every read of the report, as `employeeIds[0]`: the daily read indexes its arrays itself
		// (`addArrayParams` `time-log.service.ts:589-593`), the counts read does it through `qs` with
		// `arrayFormat: 'indices'` (`statistic.service.ts:322-339`), so the key is `employeeIds[0]`, never `employeeIds`
		report('8 reads after the member', {
			daily: searches(calls, DAILY_PATH),
			counts: searches(calls, COUNTS_PATH)
		});
		await expect
			.poll(() => ofPath(calls, DAILY_PATH).filter((call) => call.params.has('employeeIds[0]')).length)
			.toBeGreaterThan(0);
		const memberReads = ofPath(calls, DAILY_PATH).filter((call) => call.params.has('employeeIds[0]'));
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
			chip: await memberChip.evaluateAll(pageTexts),
			trigger: await filterButton(page).evaluateAll(pageTexts)
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
		await closeFilterMenu(page);
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
		// the option lives in the submenu popup Base UI opens under the `Billable` menuitem — the snapshot of
		// `s3-lane-a-timeactivity-2.log` failure 4 is `menuitem "Billable" [expanded] > menu "Billable" > menuitemcheckbox
		// "Billable only"`, so it is a descendant of the *menuitem*, never of another `menuitemcheckbox`, and is reached
		// by its own exact name
		const billableOption = page.getByRole('menuitemcheckbox', {
			name: EN.timeReports.filters.BILLABLE_ONLY,
			exact: true
		});
		await expect(billableOption).toHaveCount(1);
		await billableOption.click();
		// the read the tick starts is what changes the link; wait for that, not for a wall clock
		await expect.poll(() => page.url()).toContain('billable=true');
		await closeFilterMenu(page);
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
		// `sumsFiguresFromRows` (`use-time-activity-report.ts`): the sheet's figures now come from those rows, not from
		// the counts. Wait for the band to leave the unfiltered values, print what it settled on, then pin it.
		await expect.poll(() => bandValues(page).then((values) => values[0])).not.toBe('5h 15m');
		report('8 billable band', await bandValues(page));
		await expect
			.poll(() => bandValues(page))
			.toEqual(['1h 0m', '60%', '$40.00', `$40.00${billableNote('1h 0m')}`, '1']);
		await expect(chips(page).filter({ hasText: EN.dashboard.timesheets.BILLABLE })).toContainText(
			EN.timeReports.filters.BILLABLE_ONLY
		);
		// the Billable tick is link-only (`use-time-activity-settings.ts:44-48`): `ever-teams-activity-filters` still holds
		// exactly what `clearFilters` put there (`EMPTY_STORED_TIME_ACTIVITY_FILTERS`, `time-activity.ts:189`,
		// `use-time-activity-settings.ts:144-150`) — the run printed `{"teamIds":[],"employeeIds":[],"projectIds":[],
		// "taskIds":[]}`, not `null`, because clearing *writes* the empty set rather than removing the key
		// (`s3-lane-a-timeactivity-3.log` failure 2). It gained nothing from the tick.
		const storedAfterBillable = await page.evaluate(() =>
			window.localStorage.getItem('ever-teams-activity-filters')
		);
		report('8 localStorage after Billable', storedAfterBillable);
		expect(storedAfterBillable).toBe(JSON.stringify({ teamIds: [], employeeIds: [], projectIds: [], taskIds: [] }));
		await expect(exportButton(page)).toBeEnabled();

		expect(consoleFindings(shield), 'the filter menu printed a console error').toEqual([]);
		report('8 filter', {
			url: page.url(),
			chips: await chips(page).evaluateAll(pageTexts),
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

		// previous period: the link holds it as `from`/`to` (`time-activity-link.ts:89-112`; test 9 passed on `s3-lane-a-timeactivity-2.log`)
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

		// the presets, each naming the range it resolves to (`s3-lane-a-timeactivity-2.log` "MEASURE 9 presets")
		await periodGroup(page).locator('button').nth(1).click();
		const presets = await page
			.getByRole('button')
			.evaluateAll(pageTexts)
			.then((all) => all.filter((text) => /(Today|Yesterday|week|month|days)/i.test(text)));
		report('9 presets', presets);
		expect(
			presets.some((text) => text.includes(clock.last7Text)),
			'no preset names the range it resolves to'
		).toBe(true);

		// the calendar of the same popover: the 10th, then the 14th, of the month it opens on
		// (`defaultMonth={value.from}` `period-picker.tsx:156`) — never days counted back from today. The popover stays
		// open: closing it between the preset list and the calendar detached the day buttons mid-click, which is what a
		// single `Escape` here did in the first run.
		const fromCell = page.getByRole('gridcell', { name: clock.customFromDay, exact: true });
		const toCell = page.getByRole('gridcell', { name: clock.customToDay, exact: true });
		report('9 calendar cells', { from: await fromCell.count(), to: await toCell.count() });
		await expect(fromCell.first()).toBeVisible();
		await fromCell.first().click();
		// the first click only stores a draft (`handleRangeSelect` `period-picker.tsx:100-104`), so the period has not moved
		await expect(metaLine(page)).toHaveText(`${clock.last7Text} · ${metaMembers(2)}`);
		await toCell.first().click();
		await expect(metaLine(page)).toHaveText(`${clock.customText} · ${metaMembers(2)}`);
		await expect.poll(() => ofPath(calls, DAILY_PATH).at(-1)?.params.get('startDate')).toBe(clock.customFrom);
		const customRead = ofPath(calls, DAILY_PATH).at(-1);
		report('9 custom range', {
			url: page.url(),
			read: customRead?.search,
			params: customRead ? Object.fromEntries(customRead.params.entries()) : null,
			meta: flat(await metaLine(page).innerText())
		});
		expect(customRead?.params.get('endDate')).toBe(clock.customTo);
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

		report('11 refused daily', {
			notices: await notices(page).evaluateAll(pageTexts),
			bandValues: await bandValues(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120))
		});
		expect(
			consoleFindings(shield, [armedRead(DAILY_LOG_PATH, 500), FAILED_RESOURCE]),
			'the refused daily read printed more than the armed 500'
		).toEqual([]);
		expect(
			shield.consoleErrors().some((line) => armedRead(DAILY_LOG_PATH, 500).test(line)),
			'the armed refusal left no console line'
		).toBe(true);
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
			`$40.00${billableNote('1h 0m')}`,
			'2'
		]);
		expect(await gridRows(page, TA.table.TITLE_DATE).count(), 'the refused counts read took the rows with it').toBe(
			5
		);
		report('11b refused counts', {
			bandValues: await bandValues(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120))
		});
		expect(
			consoleFindings(shield, [armedRead(COUNTS_LOG_PATH, 500), FAILED_RESOURCE]),
			'the refused counts read printed more than the armed 500'
		).toEqual([]);
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
			`$40.00${billableNote('1h 0m')}`,
			'2'
		]);
		report('11c refused weekly', { consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120)) });
		expect(
			consoleFindings(shield, [armedRead(WEEKLY_LOG_PATH, 500), FAILED_RESOURCE]),
			'the refused weekly read printed more than the armed 500'
		).toEqual([]);
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
			`0h 0m${timerNote('5h 15m')}`,
			'55%',
			bandMissing(TA.figures.NO_TIME),
			bandMissing(TA.figures.BILLABLE_NONE),
			'0'
		]);
		await expect(gridRows(page, TA.table.TITLE_DATE)).toHaveCount(0);
		await expect(exportButton(page)).toBeDisabled();
		report('12 malformed daily', {
			bandValues: await bandValues(page),
			bandTitles: await bandTitles(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 160))
		});
		expect(consoleFindings(shield), 'a malformed daily answer printed a console error').toEqual([]);
		expect(await devOverlayErrors(page), 'a malformed daily answer left a dev error on screen').toEqual([]);
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
			`5h 15m${timerNote('0h 0m')}`,
			bandMissing(TA.figures.NO_TIME),
			bandMissing(TA.figures.EARNINGS_NO_RATES),
			`$40.00${billableNote('1h 0m')}`,
			'2'
		]);
		await expect(gridRows(page, TA.table.TITLE_DATE)).toHaveCount(5);
		report('12b malformed counts', {
			bandValues: await bandValues(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 160))
		});
		expect(consoleFindings(shield), 'malformed counts printed a console error').toEqual([]);
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
