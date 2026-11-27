import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { mockReset, signInAndVisit } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in manager sees on **Reports › Actual & expected hours** (`/reports/actual-and-expected-hours`,
 * `app/[locale]/(main)/reports/actual-and-expected-hours/page.tsx:1-14` → `core/components/dashboards/actual-expected/actual-expected-page.tsx`),
 * on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, statistics `4003`, control `4004`, issuer
 * `4005`, `playwright/test-servers.ts:37-42`). Who may open this page at all is pinned by
 * `suites/lane-a/reports-gate-by-role-ui.spec.ts` (the default arm admits it, heading measured `Actual & expected
 * hours`), so every case here signs in as the fixture manager, who may.
 *
 * Components this file drives: `actual-expected-page.tsx` (title `:38`, meta `:59-61`, Export `:79`, the error notice
 * `:114`, the empty branch `:115-122`), `use-actual-expected-report.ts` (the weekly request `:283-298`, the query key
 * and its 10-minute `staleTime` `:57`, `:306-311`, grouping `useState` `:251`, the member filter `useState` `:252`),
 * `use-plan-groups-open.ts` (open groups in `useState` `:21`), `bullet-rows.tsx` (section titles `:59-63`, the percent
 * cell `:84-104`, the group meta line `:117-146`, the source note `:182-215`, the header row `:315-336`, the totals
 * row `:338-360`, the idle folds `:384-441`, Expand/Collapse all `:444-455`, the table `:555`), `plan-overview.tsx`
 * (headline `:36-78`, the reach sentence `:80-134` with `SEPARATOR = ' · '` at `:16`, the chart part `:212-223`, the
 * empty pill `:280-291`), `variance-chart.tsx` (the slider and its `sr-only` table), `actual-expected-toolbar.tsx`
 * (the member filter menu and the applied chips), `period-picker.tsx`, `export-menu.tsx`, `actual-expected-export.tsx`
 * (the CSV columns `:78-98`, the file names `:320-321`).
 *
 * ## Where the numbers came from
 *
 * All logs and probes are under `D:\Coding\.tmp\` (this file moved from the PC FRAKTAL to EVERDUO on 2026-11-26; the
 * runs numbered `-1` … `-4` and the probes `probe1..9` were made there and are not on this PC, so anything re-pinned
 * after the move cites the logs made here).
 *
 * The throwaway probes `probe-actualexpected\probe1.spec.ts` (P1), `probe2.spec.ts` (P2-P3), `probe3.spec.ts` (Q1),
 * `probe4.spec.ts` (R1), `probe5.spec.ts` (S1), `probe6.spec.ts` (T1), `probe7.spec.ts` (U1-U3), `probe8.spec.ts`
 * (V1-V4) and `probe9.spec.ts` (W1-W2), run on this lane on 2026-11-25 and logged in `-probe-1.log` (P1), `-probe-2.log`
 * (P2, P3, Q1, R1, S1, U1-U3), `-probe-4.log` (R1, S1 — the re-run of the two probes that first failed on their own
 * locators), `-probe-5.log` (T1, V1-V4), `-probe-6.log` (W1-W2). `-probe-3.log` carries no measurement: it ran without
 * `E2E_LANE` set, so every fixture lookup hit the non-lane control port (`connect ECONNREFUSED 127.0.0.1:3990`).
 * `-probe-4.log` also holds the first attempt at T1 and V3, which failed because this file's served daily plans
 * carried `tasks` that `taskSchema` rejects (no `public`, `id` not a UUID) — see finding 6. On this PC:
 * `probe-10.spec.ts` (`-probe-1.log`, P10 which document sends which read, P11 the refused read's retry timeline).
 * Every value asserted below is one those runs printed, and every whole-file run re-prints the same figures from
 * inside the spec (`[lane-c actual-expected] MEASURE …`): `s3-lane-c-actualexpected-1.log`, `-check-1.log` (only the
 * cases whose locators were being fixed), `-2.log` and, on this PC, `-5.log` and the acceptance pair.
 * Served days are offsets from the day the run runs on (`localDay`, the pattern of
 * `suites/lane-c/weekly-limit-report-ui.spec.ts:330-340`) **only where the shown period holds them**: the page opens on
 * `This week` and builds every row from that week's own days (`planDaysOf` maps `daysOfPeriod(period)`,
 * `actual-expected.ts:465-473`), so a case that stays on the default period serves `begunDayOffset()` — a day of the
 * shown week — while a case that steps to `Last 7 days` may keep `-2` / `-1`, and one that steps to the next week
 * serves next week's days. Every figure and label is rebuilt here from the same offsets with the same rules the page
 * uses, and no case names today's date. The browser zone is read from the page
 * (`Intl.DateTimeFormat().resolvedOptions().timeZone`), never hard-coded.
 *
 * ## Checked to hold on any weekday (2026-11-27)
 *
 * Walked through a Monday, a Tuesday, a Wednesday and a Sunday, and through the 1st of a month (a Monday-first week
 * may straddle two months, and the `Last 7 days` period always does on some dates). What broke was test 5 (`:1146`)
 * and test 10 (`:1611`): both stay on the default `This week` period yet served `dayKey(-1)`, and on a **Monday**
 * yesterday belongs to the week before — `planDaysOf` only draws the shown week's days, so their rows, figures and
 * the chart row they look for (`chartRowsOf … find((row) => row[0] === chartDay)`) were absent. They now serve
 * `begunDayOffset()` (`:347-357`): yesterday on Tuesday..Sunday, and the week's only begun day (today) on a Monday.
 * Everything else holds as written: tests 1, 2, 4 pin the week through `weekOffsetsOf()` / `begunOffsetsOf()` /
 * `aheadOffsetsOf()` and rebuild each figure from those counts, so a Monday (1 begun, 6 ahead) and a Sunday (7 begun)
 * both compute; tests 6, 7, 8, 11 switch to `Last 7 days`, whose period always holds `-6 … 0`; test 3 pins the
 * `Yesterday` preset, whose one-day period is yesterday itself; test 9 steps periods and picks its calendar range from
 * the month the calendar names, and test 15 serves the next week, entirely ahead. Tests 12, 13, 14 assert only the
 * refused/unparseable answer's notice, so their served dates are inert.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, the shell and its reads, NextAuth, and the mock's own fixtures — the tenant, organization
 * and team ids (`fixture.ids`); the team's three members and their names (`mock-gauzy-server.mjs:118-137`, rendered
 * `Fixture Manager` / `Fixture Teammate` / `Fixture Restricted Teammate`); the team's `GET /api/daily-plan` read the
 * shell already issues (`core/services/client/api/daily-plans/daily-plan.service.ts:38-88`), which is the only source
 * of expected hours here; the weekly request the hook builds (`use-actual-expected-report.ts:283-298`). Test 1 runs
 * with **no stub**: the mock answers the weekly report with a plain `[]` and one 8-hour plan for the manager
 * (`mock-gauzy-server.mjs:760`, `:804-812`), and that is the page test 1 pins.
 *
 * **Served by this file:** the weekly answer from test 2 on, and the team's daily plans whenever the mock's single
 * plan is not what a case needs — both through `page.route` on the mock origin (the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`), because the mock has one fixed plan and no way to answer
 * for the other two members. Each answer restates the mock's CORS answer (`mock-gauzy-server.mjs:1085-1101`,
 * `OPTIONS` → 204): the page is on `localhost:3033` and the API on `127.0.0.1:4002`. Where a case filters members the
 * stub answers **only the `employeeIds` the query asked for** (`honourIds`), which is what a real backend does and is
 * what lets a filter visibly empty the page (test 10). `route.fetch()` is never called in a stub, so `mock.calls(...)`
 * stays empty **on every path this file answers** — the witness that the page acted on this file and not on the mock.
 * The plans window needs one care: another document reads plans paths too, see finding 16.
 *
 * ## Findings
 *
 * 1. **The lane as it is not empty.** The mock answers the weekly report with `[]` *and* the daily plans with one
 *    plan of 8 h for the manager on today (`mock-gauzy-server.mjs:760`, `:261-270`), so the un-stubbed page shows one
 *    member row `8h under` and a totals row `0h 0m / 8h` (`probe-1.log` P1-dump). The empty week of test 2 needs both
 *    reads served: plans `{items: [], total: 0}` as well as `[]` for the report.
 * 2. **`projectIds` and `teamIds` are in the request object and never reach the wire.** The hook sends
 *    `projectIds: []` and `teamIds: []` (`use-actual-expected-report.ts:292-293`); `qs.stringify`
 *    (`core/services/client/api/timesheets/time-log.service.ts:636-660`) drops empty arrays, and every read recorded
 *    here has no such key (`probe-1.log` P1-weekly-reads). Not `[MEASURED, NOT INTENDED]`: no comment or type says
 *    the keys must be on the URL.
 * 3. **Nothing survives a reload.** Grouping (`use-actual-expected-report.ts:251`), the member filter (`:252`) and the
 *    open groups (`use-plan-groups-open.ts:21`) are all React `useState`, and the run found no key for any of them in
 *    `localStorage` (`probe-2.log` Q1-localStorage: only the shell's timer, team and workspace keys). After a reload
 *    the toggles read `false`, the `By day` tab reads `aria-selected="false"` and the meta line is back on the current
 *    week (`probe-2.log` Q1-afterReload-*).
 * 4. **The meters say nothing to a screen reader.** `BulletMeter` (`plan-meters.tsx:37`) and `DayDotMeter`
 *    (`plan-meters.tsx:84`) are `aria-hidden="true"`, and the meter cell of every bullet row reads as an empty string
 *    (`probe-2.log` P2-dump-week `cells`, `probe-5.log` V3-dump-closed). The dot legend (`dashboard.actualExpected.DOT_LEGEND`)
 *    is the only text about them, and it appears only while the table has rows (`bullet-rows.tsx:551`).
 * 5. **The page has no table of its own.** `ActualExpectedTable` and `ActualExpectedTableSkeleton`
 *    (`actual-expected-table.tsx:381`, `:404`) have no importer anywhere in `apps/web` — only `ActualExpectedEmpty`
 *    from that file is used (`actual-expected-page.tsx:20`) — so the brief's "the table, if the page renders one" is
 *    answered as: it does not, and the `role=table` grid every case here reads is `PlanBulletRows`
 *    (`bullet-rows.tsx:555`). `ActualExpectedFigures` (`actual-expected-figures.tsx:271`) is equally unreferenced.
 * 6. **A daily plan whose tasks do not parse takes the whole page down.** Answering `GET /api/daily-plan` with plans
 *    whose `tasks` are `{id, title, estimate}` only — no `public`, an `id` that is not a UUID — fails
 *    `zodStrictPaginationResponseValidate(dailyPlanSchema, …)` (`daily-plan.service.ts:74`, `task.schema.ts:53-56`),
 *    the plans stay undefined, `showsPlansError` is true (`use-actual-expected-report.ts:343`) and the page renders
 *    the same error notice a refused read produces, with Export disabled (`probe-4.log` T1/V3 failure,
 *    `probe-5.log` after the served tasks were given `public` and UUID ids). Served tasks here mirror the mock's own
 *    task shape (`mock-gauzy-server.mjs:183-198`).
 * 7. **A member name never comes from the report answer.** The stubs here name each row `Served Manager` in
 *    `employee.fullName`, and the page still printed the roster names `Fixture Manager` & co (`probe-2.log`
 *    P2-dump-week, `probe-5.log` T1-csv): `memberNameOf` (`use-actual-expected-report.ts:87-101`) takes the name the
 *    shell's team read carries.
 * 8. **A malformed answer is indistinguishable from a refused one on screen.** The same notice, the same disabled
 *    Export, no rows (`probe-2.log` U2-dump); what tells them apart is the console: the service's own
 *    `Weekly report validation failed` line (`time-log.service.ts:664-676`) and no `[HttpClient]` line at all, because
 *    the read answered 200.
 * 9. **A failed read is retried, so its count is never pinned.** Arming 500 on the weekly path took the recorded
 *    reads from 1 to 4 across TanStack's retries and the notice's own `Try again` (`probe-2.log` U1-afterRetry), while
 *    a *successful* read of a period the cache already holds is not repeated at all: stepping back to the previous
 *    week and forward again printed 2 reads, not 3 (`probe-4.log` R1-afterNext), and clearing the member filter added
 *    none (`S1-afterRemove` / `S1-afterClear`) — `REPORT_STALE_TIME` is 10 minutes (`use-actual-expected-report.ts:57`).
 * 10. **`Reached (%)` in the CSV and the row percent are the same rule, minutes are truncated.** `wholePercentOf` is
 *    `Math.round` (`actual-expected.ts:577-579`) over `percentOf` (`dashboard-figures.ts:43-48`), so 3 h against 8 h
 *    prints `38` while 2 h against 1 h 30 m prints `134` (`probe-5.log` T1-csv), and a tracked `2h 0m 10s` prints
 *    `2:00` (`clockHoursOf` floors the minutes, `actual-expected.ts:562-567`).
 * 11. **A difference cell is formula-guarded in the CSV.** `neutralizedCell` prefixes `'` to a cell that starts with
 *    `= + - @ \t \r` (`dashboard-export.ts:10-17`), which is why an under-plan day prints `'-5:00` while the row on
 *    screen prints `5h under` (`probe-5.log` T1-csv).
 * 12. **The variance chart prints `0h` under plan for a planned day nobody overran**, and `–` only for a day with no
 *    plan or a day that has not begun (`variance-chart.tsx` `gapCellOf`; `probe-2.log` P2-dump-week srTable row
 *    `["Wed, Nov 25","12h","12h 30m","1h","2h"]` against `probe-5.log` V1-dump `["Mon, Nov 23","No plan","0h 0m","–","–"]`).
 * 13. **A day has two labels, and they are not the same string.** The chart's own table and its slider value text use
 *    the short weekday even for today (`dayLabelPartsOf`, `actual-expected.ts:555-562`; measured `probe-6.log`
 *    W2-focused `"Wed, Nov 25"` and `probe-5.log` V4-srTable `"Tue, Nov 24"`), while a day *group* row replaces the
 *    weekday with `Today` / `Yesterday` for the two latest days and nothing older (`plan-cells.tsx:229-256` over
 *    `relativeDayOf`, `actual-expected.ts:514-523`; measured `probe-5.log` V3-dump-open `Yesterday, Nov 24` on the same
 *    day the sr-only table printed `Tue, Nov 24`). `chartDayLabelOf` / `groupDayLabelOf` mirror the two.
 * 14. **The reach line switches form when a period has both an over and an under member day.** Then the under part is
 *    `REACH_UNDER_SHORT` — `6h under on 3`, no "member days" — and its duration is the summed under hours, not a
 *    per-member figure (`plan-overview.tsx:86-87,106-125`; `probe-2.log` P2-dump-week figures
 *    `104% of plan · 3h over on 3 member days · 6h under on 3`). With no over day the same part keeps its full form
 *    `… under on # member days` (`:87,116-125`,
 *    test 1 and test 10).
 * 15. **The "not started yet" empty state offers no action, and the section's only button is its column header.**
 *    `ActualExpectedEmpty` returns the title and message with no `action` when the period holds plans ahead
 *    (`actual-expected-table.tsx:501-508`), and `showsToggleAll = canToggleAll && hasRows` means no Expand/Collapse all
 *    either (`bullet-rows.tsx:545`); what remains is the `Tracked against plan` header button
 *    (`s3-lane-c-actualexpected-1.log` MEASURE ahead `emptyButtons:1`, and that state's page snapshot).
 * 16. **Another document reads the plans paths, and its calls land in the mock's window.** `hardVisit`
 *    (`playwright/helpers.ts:424`) hard-loads `http://localhost:3033/` before this page; on a warm dev server that
 *    dashboard mounts and reads its own team-wide `/api/daily-plan` **and** `/api/daily-plan/employee/<manager>`
 *    (`app/[locale]/page-component.tsx:62` → `use-employee-daily-plans.ts:71-77` → `daily-plan.service.ts:145-165`),
 *    and `mock.calls(fragment)` matches by substring (`playwright/fixtures.ts:141`), so those calls are counted as
 *    `PLANS_PATH` hits. Measured on this PC: in `-5.log` they were there (test 1's plans window held
 *    `/api/daily-plan/employee/…` twice, test 2's held it once), in `-probe-1.log` P10 the browser sent 23 reads with
 *    one team-wide plans read and **no** employee read — whether they land is timing. Not a page defect and not
 *    `[MEASURED, NOT INTENDED]`: the report page itself never issues the per-employee read (P10), so tests 1 and 2
 *    count this page's own document (`recordDocumentReads`) and, on the mock's log, only the exact `PLANS_PATH`.
 * 17. **`Try again` takes the notice away while its refetch is in flight, and the page oscillates until the last
 *    attempt fails.** Each attempt puts the query back to pending, so `showsActualError` is false for that moment
 *    (`use-actual-expected-report.ts:338-344`): the notice and its `Try again` button unmount and the grid shell
 *    (header row only) renders; the notice returns when the armed 500 lands, until the next attempt. Measured in
 *    `-probe-1.log` P11 (no notice + 1 table at reads 3; notice, its button and 0 tables from reads 4 to the end of
 *    the 7 s window) and in the two acceptance logs (`-8.log` MEASURE retry: notice back at reads 4, 0 tables;
 *    `-9.log`: a second attempt was in flight at the read — no notice, 1 table). The number of attempts is never
 *    pinned (finding 9); what test 12 asserts is that the read fires again, that the notice **returns**, and that
 *    Export is disabled in both phases.
 * 18. **A period that is a preset is named by the preset, not by its dates.** `period-picker.tsx:50-52` says the
 *    button "names the period (This week when it is a preset, the dates otherwise)", and `:76-78` `presetOfPeriod` →
 *    `:177-186` `triggerLabelOf` does exactly that; the dates are on the trigger's `title` (`:128`, measured
 *    `title="Nov 23 – 29"` in `-5.log`). Test 15 used to assert the dates here, against that comment and against tests
 *    3, 6, 7, 8, 9 and 11, which read `common.THIS_WEEK`.
 *
 * ## What this file does not cover
 *
 * `NO_MEMBERS_TITLE` / `NO_MEMBERS_MESSAGE` (`actual-expected-page.tsx:115-122`) — the fixture team always has three
 * members, so `showsNoMembers` is not reachable through this mock; the `UPDATING` bar and both page skeletons
 * (`isLoading` / `isUpdating`, which need a read slow enough to watch, `delays` not armed here); the PDF's bytes (only
 * its file name is checked); `ActualExpectedTable` and `ActualExpectedFigures` (finding 5 — nothing imports them, so
 * there is nothing for a browser to reach); `useChartSlider`'s hover path (only the keyboard path is measured, test 8);
 * the workspace date-format variants `report-workspace-locale.test.ts` pins (the fixture organization carries no
 * workspace format, `mock-gauzy-server.mjs:86-96`, so the browser's own `Intl` is what prints here); and what other
 * specs already pin for this page.
 */

const PAGE_PATH = '/reports/actual-and-expected-hours';
/** What the browser sends, on the mock origin. */
const REPORT_PATH = '/api/timesheet/time-log/report/weekly';
/** The path the client logs a failure under: its axios base already holds `/api` (`time-log.service.ts:636-660`). */
const REPORT_LOGGED_PATH = '/timesheet/time-log/report/weekly';
const PLANS_PATH = '/api/daily-plan';
const PLANS_LOGGED_PATH = '/daily-plan';
/** The other plans path the lane's browser can hit: one person's plans (`daily-plan.service.ts:163`). */
const EMPLOYEE_PLANS_PATH_PREFIX = '/api/daily-plan/employee/';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
/** `actual-expected.ts` / `plan-cells.tsx`: the figure the page puts where expected hours cannot be. */
const MISSING_FIGURE = '–';
const UTF8_BOM = 65279;
const HOUR = 3600;

type Copy = Record<string, string>;
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	dashboard: {
		actualExpected: Copy;
		weeklyLimit: Copy;
		period: Copy;
		states: Copy;
		timeActivity: { export: Copy };
	};
	common: Copy;
	pages: { unauthorized: Copy };
};
const A = EN.dashboard.actualExpected;
const W = EN.dashboard.weeklyLimit;
const PERIOD = EN.dashboard.period;
const STATES = EN.dashboard.states;
const C = EN.common;
const TRY_AGAIN = EN.pages.unauthorized.TRY_AGAIN;
/** The export menu's two items: `common.PDF` and the time-and-activity report's CSV label — this report borrows it
 * (`actual-expected-export.tsx:327`, `:333`), and `common` has no `CSV` key of its own. */
const EXPORT = EN.dashboard.timeActivity.export;
/** The eight presets `DEFAULT_PERIOD_PRESETS` lists (`period-picker.tsx:26-35`). */
const PRESET_LABELS = [
	C.TODAY,
	C.YESTERDAY,
	C.THIS_WEEK,
	C.LAST_WEEK,
	C.FILTER_LAST_7_DAYS,
	C.LAST_TWO_WEEKS,
	C.THIS_MONTH,
	C.LAST_MONTH
];
/** `t.rich` chunk tags flatten away in the rendered text (`plan-overview.tsx:91-129`, `plan-cells.tsx` `DayLabel`). */
const plain = (template: string) => template.replace(/<\/?(b|chip|lead)>/g, '');

/** `{count, plural, =0 {No members} one {# member} other {# members}}` → the branch for `count`, then the other holes. */
const copy = (template: string, values: Record<string, string | number> = {}) => {
	const closingBraceOf = (source: string, openAt: number) => {
		let depth = 0;
		for (let index = openAt; index < source.length; index += 1) {
			if (source[index] === '{') depth += 1;
			else if (source[index] === '}') {
				depth -= 1;
				if (depth === 0) return index;
			}
		}
		return source.length;
	};
	const prefix = '{count, plural,';
	const start = template.indexOf(prefix);
	let filled = template;
	if (start >= 0) {
		const end = closingBraceOf(template, start);
		const body = template.slice(start + prefix.length, end);
		const branches: Array<[string, string]> = [];
		let cursor = 0;
		while (cursor < body.length) {
			const key = /^\s*([=#\w]+)\s*\{/.exec(body.slice(cursor));
			if (!key) break;
			const open = cursor + key[0].length - 1;
			const close = closingBraceOf(body, open);
			branches.push([key[1], body.slice(open + 1, close)]);
			cursor = close + 1;
		}
		const count = Number(values.count ?? 0);
		const branch =
			branches.find(([key]) => key === `=${count}`) ??
			branches.find(([key]) => key === (count === 1 ? 'one' : 'other')) ??
			branches.find(([key]) => key === 'other');
		filled = `${template.slice(0, start)}${(branch?.[1] ?? '').replaceAll('#', String(count))}${template.slice(end + 1)}`;
	}
	return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), filled);
};

const idleMembers = (count: number) => copy(A.IDLE_MEMBERS, { count });
const idleDays = (count: number) => copy(A.IDLE_DAYS, { count });
const daysWithoutPlan = (count: number) => copy(A.ROW_DAYS_WITHOUT_PLAN, { count });
const memberCount = (count: number) => copy(W.MEMBERS_COUNT, { count });
const dayCount = (count: number) => copy(W.DAYS_COUNT, { count });
const fromPlans = (count: number) => copy(A.EXPECTED_FROM_PLANS, { count });
const reachPercent = (percent: number) => copy(plain(A.REACH_PERCENT), { percent });
const reachOver = (duration: string, count: number) => copy(plain(A.REACH_OVER), { duration, count });
const reachUnder = (duration: string, count: number) => copy(plain(A.REACH_UNDER), { duration, count });
const reachUnderShort = (duration: string, count: number) => copy(plain(A.REACH_UNDER_SHORT), { duration, count });
const trackedWithoutPlan = (count: number) => copy(A.TRACKED_WITHOUT_PLAN, { count });
const rowOver = (duration: string) => copy(A.ROW_OVER, { duration });
const differenceOver = (duration: string) => copy(A.DIFFERENCE_OVER, { duration });
const differenceUnder = (duration: string) => copy(A.DIFFERENCE_UNDER, { duration });
const removeMemberLabel = (name: string) => copy(W.REMOVE_MEMBER, { name });

const report = (label: string, value: unknown) =>
	console.log(`[lane-c actual-expected] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1085-1101`), restated on every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const lastOf = <T>(list: T[]) => list[list.length - 1];
const allTextsOf = (locator: Locator) =>
	locator.evaluateAll((nodes: Element[]) =>
		nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
	);

/* ------------------------------------------------------------------ the clock this file serves

`localDay(0)` is the day the run runs on, at local noon so a rendered "Today" cannot straddle a boundary. */

const localDay = (offset: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offset);
	return day;
};
const dayKeyOf = (day: Date) =>
	`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
const dayKey = (offset: number) => dayKeyOf(localDay(offset));
const todayKey = () => dayKeyOf(new Date());
/** Offsets of the current Monday-first week: the fixture organization carries no `startWeekOn` (`mock-gauzy-server.mjs:86-96`). */
const weekOffsetsOf = () => {
	const mondayOffset = -((new Date().getDay() + 6) % 7);
	return [0, 1, 2, 3, 4, 5, 6].map((n) => mondayOffset + n);
};
/** `begunDaysOf` / `futureDaysOf` (`actual-expected.ts:253-259`): a day is in the future when its key is after today's. */
const begunOffsetsOf = () => weekOffsetsOf().filter((offset) => dayKey(offset) <= todayKey());
const aheadOffsetsOf = () => weekOffsetsOf().filter((offset) => dayKey(offset) > todayKey());
/**
 * The offset a one-day case can serve **inside the week this page opens on**: the begun day before today
 * (yesterday, on Tuesday..Sunday), and when the shown week has none — a Monday, whose week has only today begun —
 * that day. Every page row is built from the shown period's own days (`planDaysOf` maps `daysOfPeriod(period)`,
 * `actual-expected.ts:465-473`), so a served day outside it prints nowhere: `dayKey(-1)` is the previous week's day
 * on a Monday, which is why these cases cannot simply count back from today.
 */
const begunDayOffset = () => {
	const begun = begunOffsetsOf();
	return begun[begun.length - 2] ?? begun[0];
};
const shiftKey = (key: string, days: number) => {
	const [year, month, day] = key.split('-').map(Number);
	return dayKeyOf(new Date(year, month - 1, day + days, 12));
};
/** `formatPeriod` (`dashboard-period.ts:147-157`): month+day, the year only when the period leaves this year. */
const periodTextOf = (from: Date, to: Date) => {
	const sameDay = dayKeyOf(from) === dayKeyOf(to);
	const showsYear = from.getFullYear() !== to.getFullYear() || from.getFullYear() !== new Date().getFullYear();
	const format = new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		...(showsYear ? { year: 'numeric' } : {})
	});
	// `flat` because Node's `formatRange` pads the en dash with U+2009 thin spaces while the browser prints plain
	// spaces; the siblings normalize the same way (`weekly-limit-report-ui.spec.ts:385`, `payments-due-report-ui.spec.ts:333`).
	return flat(sameDay ? format.format(from) : format.formatRange(from, to));
};
/**
 * The variance chart's own row label: short weekday + date, for today as much as for any other day
 * (`actual-expected.ts:555-562` `dayLabelPartsOf`; measured `probe-6.log` W2-focused "Wed, Nov 25" on a run whose
 * today was Nov 25).
 */
const chartDayLabelOf = (offset: number) => {
	const day = localDay(offset);
	return `${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day)}, ${new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric'
	}).format(day)}`;
};
/**
 * A day group's row label, which is *not* the chart's: "Today" and "Yesterday" take the weekday's place for the two
 * latest days, everything older keeps its short weekday (`plan-cells.tsx:229-256`, `actual-expected.ts:514-523`,
 * `locales/en.json` `common.TODAY` / `common.YESTERDAY`; measured `probe-5.log` V3-dump-open "Yesterday, Nov 24" and
 * `probe-2.log` Q1-toggles-before "Mon, Nov 23").
 */
const groupDayLabelOf = (offset: number) => {
	const day = localDay(offset);
	const date = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(day);
	if (offset === 0) {
		return `${C.TODAY}, ${date}`;
	}
	if (offset === -1) {
		return `${C.YESTERDAY}, ${date}`;
	}
	return `${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day)}, ${date}`;
};
/** `formatDurationShort` / `formatHoursLabel` (`dashboard-figures.ts:11-31`). */
const partsOf = (seconds: number) => {
	const safe = Math.max(0, Math.round(seconds || 0));
	return { hours: Math.floor(safe / HOUR), minutes: Math.floor((safe % HOUR) / 60) };
};
const durationShort = (seconds: number) => {
	const { hours, minutes } = partsOf(seconds);
	return `${hours}h ${minutes}m`;
};
const hoursLabel = (seconds: number) => {
	const { hours, minutes } = partsOf(seconds);
	return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};
/** `clockHoursOf` / `signedClockHoursOf` (`actual-expected.ts:562-573`), the CSV's `h:mm`. */
const clockHours = (seconds: number) => {
	const { hours, minutes } = partsOf(Math.abs(seconds));
	return `${hours}:${String(minutes).padStart(2, '0')}`;
};
const signedClockHours = (seconds: number) => (seconds < 0 ? `-${clockHours(seconds)}` : clockHours(seconds));
/** `wholePercentOf(percentOf(…))` (`actual-expected.ts:577`, `dashboard-figures.ts:43`). */
const percent = (actual: number, expected: number) => (expected === 0 ? 0 : Math.round((actual / expected) * 100));
/** `percentTextOf` (`bullet-rows.tsx:84-104`): `–` where there is no plan to reach. */
const percentText = (actual: number, expected: number | null) =>
	expected === null || expected <= 0 ? MISSING_FIGURE : `${percent(actual, expected)}%`;

/* ------------------------------------------------------------------ what this file answers

`GET /api/timesheet/time-log/report/weekly`, on the mock origin. The answer shape is what
`timeLogReportWeeklySchema.array()` accepts (`core/types/schemas/timer/time-log.schema.ts:153-166`): one row per
employee with a `dates` record of `{ sum }`. */

type ServedCall = { method: string; search: string; params: Record<string, string> };
type ServedRow = { employeeId: string; fullName?: string; dates: Record<string, number> };

async function serveWeeklyReport(
	page: Page,
	script: { rows?: ServedRow[]; refusal?: number; rawBody?: unknown; honourIds?: boolean }
): Promise<ServedCall[]> {
	const calls: ServedCall[] = [];
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname === REPORT_PATH;
	await page.route(matcher, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		if (request.method() === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		const params: Record<string, string> = {};
		url.searchParams.forEach((value, key) => (params[key] = value));
		calls.push({ method: request.method(), search: url.search, params });
		const rowBody = (rows: ServedRow[]) =>
			rows.map((row) => ({
				employee: { id: row.employeeId, fullName: row.fullName ?? null },
				dates: Object.fromEntries(Object.entries(row.dates).map(([key, seconds]) => [key, { sum: seconds }]))
			}));
		let body: unknown = script.rawBody ?? rowBody(script.rows ?? []);
		if (script.refusal) {
			body = { statusCode: script.refusal, message: 'this file refused the read' };
		} else if (script.honourIds && !script.rawBody) {
			const asked = Object.entries(params)
				.filter(([key]) => key.startsWith('employeeIds['))
				.map(([, value]) => value);
			body = rowBody(script.rows ?? []).filter((row) => asked.includes(row.employee.id));
		}
		return route.fulfill({
			status: script.refusal ?? 200,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	});
	return calls;
}

/**
 * A plan task that passes `taskSchema` (`task.schema.ts:53-56`): `id` must be a UUID and `public` must be present —
 * finding 6. Distinct ids per task, because the plan merge dedupes tasks by id.
 */
const servedTask = (n: number, title: string, estimate: number | null) => ({
	id: `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`,
	title,
	public: false,
	estimate,
	status: 'open'
});

type ServedPlan = {
	date: string;
	employeeId: string;
	workTimePlanned: number;
	status?: string;
	tasks?: Array<{ id: string; title: string; estimate?: number | null; public?: boolean | null }>;
};

/** `GET /api/daily-plan` — the shell's team-wide plans read, the only source of expected hours (`daily-plan.service.ts:38-88`). */
async function serveDailyPlans(page: Page, plans: ServedPlan[] | { refusal: number }): Promise<string[]> {
	const seen: string[] = [];
	await page.route(
		(url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname === PLANS_PATH,
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') {
				return route.fulfill({ status: 204, headers: CORS_HEADERS });
			}
			seen.push(`${request.method()} ${request.url()}`);
			const refused = !Array.isArray(plans);
			const items = refused
				? []
				: plans.map((plan) =>
						plan.tasks ? { ...plan, tasks: plan.tasks.map((task) => ({ public: false, ...task })) } : plan
					);
			return route.fulfill({
				status: refused ? 500 : 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(
					refused
						? { statusCode: 500, message: 'this file refused the plans read' }
						: { items, total: items.length }
				)
			});
		}
	);
	return seen;
}

/** Records what the browser really sent for the weekly report, and from which origin. Nothing is answered here. */
function recordReportReads(page: Page): Array<ServedCall & { origin: string; path: string }> {
	const calls: Array<ServedCall & { origin: string; path: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname !== REPORT_PATH) {
			return;
		}
		const params: Record<string, string> = {};
		url.searchParams.forEach((value, key) => (params[key] = value));
		calls.push({
			method: request.method(),
			origin: url.origin,
			path: url.pathname,
			search: url.search,
			params
		});
	});
	return calls;
}

/**
 * What the browser sent on one mock path **from this page's own document**, and nothing else.
 *
 * `hardVisit` (`playwright/helpers.ts:424`) hard-loads `http://localhost:3033/` before it loads this page, and on a
 * warm dev server that dashboard mounts and reads: its own team-wide `/api/daily-plan` and
 * `/api/daily-plan/employee/<manager>` (`app/[locale]/page-component.tsx:62` →
 * `core/hooks/daily-plans/use-employee-daily-plans.ts:71-77` → `daily-plan.service.ts:145-165`). Whether those calls
 * land at all is timing: they are in `s3-lane-c-actualexpected-5.log` (test 1 `plans-reads`, test 2's plans window)
 * and absent in `s3-lane-c-actualexpected-probe-1.log` (P10, 23 reads, one `/api/daily-plan`, no employee read).
 * `mock.calls(fragment)` matches by substring (`playwright/fixtures.ts:141`), so counting that window would hand this
 * page reads made by another document. A request is credited to this page only when the frame that sent it shows
 * this page's own URL (`request.frame().url()`): `check-1.log` MEASURE plans-reads shows the one plans read arriving
 * `from /reports/actual-and-expected-hours` while the mock's window holds `GET /api/daily-plan`. Gating on
 * `framenavigated` instead was measured and rejected: that event reports this page's URL twice (`check-1.log`
 * MEASURE navigations `["/", "/", "/reports/actual-and-expected-hours", "/reports/actual-and-expected-hours"]`), and
 * in `s3-lane-c-actualexpected-7.log` the page had already read before the first such report reached the test, so a
 * cleared or gated counter read 0 there. The `navigations` list is reported by test 1 as that evidence.
 */
type DocumentCall = ServedCall & { framePathname: string };

function recordDocumentReads(page: Page, pathname: string): { calls: DocumentCall[]; navigations: string[] } {
	const calls: DocumentCall[] = [];
	const navigations: string[] = [];
	page.on('framenavigated', (frame) => {
		navigations.push(
			`${new URL(frame.url()).pathname}${frame === page.mainFrame() ? '' : ' (not the main frame)'}`
		);
	});
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN || url.pathname !== pathname) {
			return;
		}
		const params: Record<string, string> = {};
		url.searchParams.forEach((value, key) => (params[key] = value));
		calls.push({
			method: request.method(),
			search: url.search,
			params,
			framePathname: new URL(request.frame().url()).pathname
		});
	});
	return { calls, navigations };
}

const paramsOf = (call: ServedCall) => call.params;
const employeeIdsOf = (call: ServedCall) =>
	Object.entries(call.params)
		.filter(([key]) => key.startsWith('employeeIds['))
		.map(([, value]) => value);
const keysOf = (call: ServedCall) => Object.keys(call.params);
/** The local day a bound lands on, and its local clock time: what `startDate` / `endDate` mean for the page. */
const localBoundsOf = (call: ServedCall) => {
	const from = new Date(call.params.startDate);
	const to = new Date(call.params.endDate);
	const clockOf = (date: Date) =>
		new Intl.DateTimeFormat('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		}).format(date);
	return { fromKey: dayKeyOf(from), toKey: dayKeyOf(to), fromClock: clockOf(from), toClock: clockOf(to) };
};

/* ------------------------------------------------------------------ the page under the locators */

const pageHeading = (page: Page) => page.locator('h1');
const pageMeta = (page: Page) => page.locator('h1 + span');
const breadcrumbNav = (page: Page) => page.locator('nav[aria-label="breadcrumb"]');
/** `DashboardSection` renders `<section aria-label=…>` (`kit/dashboard-layout.tsx`), measured through that attribute. */
const section = (page: Page, name: string) => page.locator(`section[aria-label="${name}"]`);
const figuresSection = (page: Page) => section(page, A.FIGURES_LABEL);
const bulletSection = (page: Page, title: string) => section(page, title);
const bulletTable = (page: Page) => page.locator('[role=table]');
const bulletRows = (page: Page) => bulletTable(page).locator('[role=row]');
const bulletCells = (page: Page) => bulletTable(page).locator('[role=cell]');
const groupToggles = (page: Page) => bulletTable(page).locator('button[aria-expanded]');
const chartTable = (page: Page) => page.locator('table.sr-only');
const chartHead = (page: Page) => chartTable(page).locator('thead th');
const chartRows = (page: Page) => chartTable(page).locator('tbody tr');
const chartSlider = (page: Page) => page.getByRole('slider');
const exportButton = (page: Page) => page.getByRole('button', { name: C.EXPORT, exact: true });
const periodGroup = (page: Page) => page.getByRole('group', { name: PERIOD.LABEL, exact: true });
const periodTrigger = (page: Page) => periodGroup(page).getByRole('button').nth(1);
const popover = (page: Page) => page.locator('[data-slot=popover-content]');
/** The popover's first block is the preset list; the calendar (with its own "Last month"/"Today"/"Next month"
 * buttons) is a block below it, so a preset is looked up inside this one (`probe-4.log` R1-popover-buttons). */
const presetList = (page: Page) => popover(page).locator('div').first();
const presetRows = (page: Page) => presetList(page).getByRole('button');
/** `PropertyFilterMenu` labels the button with the count it filters to (`Filter`, then `Filter1` — `probe-4.log` S1-afterPick). */
const filterButton = (page: Page) => page.getByRole('button', { name: /^Filter/ });
const groupingTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const clearFiltersButtons = (page: Page) => page.getByRole('button', { name: C.CLEAR_FILTERS, exact: true });

const rowsOf = async (page: Page) => allTextsOf(bulletRows(page));
const cellsOf = async (page: Page) => allTextsOf(bulletCells(page));
const headersOf = async (page: Page) => allTextsOf(bulletTable(page).locator('[role=columnheader]'));
const togglesOf = async (page: Page) =>
	groupToggles(page).evaluateAll((nodes: Element[]) =>
		nodes.map(
			(node) => `${node.getAttribute('aria-expanded')} :: ${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
		)
	);
const chartRowsOf = async (page: Page) =>
	chartRows(page).evaluateAll((nodes: Element[]) =>
		nodes.map((row) => Array.from(row.querySelectorAll('th,td')).map((cell) => (cell.textContent ?? '').trim()))
	);
const sliderStateOf = async (page: Page) =>
	chartSlider(page).evaluate((node: Element) => ({
		label: node.getAttribute('aria-label'),
		orientation: node.getAttribute('aria-orientation'),
		min: node.getAttribute('aria-valuemin'),
		max: node.getAttribute('aria-valuemax'),
		now: node.getAttribute('aria-valuenow'),
		text: node.getAttribute('aria-valuetext')
	}));
/** Figure paragraphs, empty-state paragraphs: each scoped to its own section, so the shell's copy cannot leak in. */
const figureParagraphsOf = async (page: Page) => allTextsOf(figuresSection(page).locator('p'));
const bulletParagraphsOf = async (page: Page, title: string) => allTextsOf(bulletSection(page, title).locator('p'));
/** The error notice is an `output`; so is the shell's time-zone notice, which is not this page's. */
const noticesOf = async (page: Page) =>
	page
		.locator('output')
		.allInnerTexts()
		.then((all) => all.map(flat).filter((line) => !line.includes('profile uses UTC')));
const pageZone = (page: Page) => page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
const pageLang = (page: Page) => page.evaluate(() => document.documentElement.lang);

/* ------------------------------------------------------------------ the console, excused only by name */

/** React's dev-mode store warning, not this page's (`suites/lane-a/api-tokens-settings-ui.spec.ts:405-430`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The client's own line for a refused read this file armed: it names the path *without* `/api` and puts the query
 * between the path and the status (`probe-2.log` U1-console), so only that armed status on that path is excused.
 */
const armedFailurePattern = (loggedPath: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${loggedPath}(\?\S*)? ${status} `);
/** The service's own line for an answer that does not parse (`time-log.service.ts:664-676`, `probe-2.log` U2-console). */
const VALIDATION_FAILURE = 'Weekly report validation failed';
/** A test that arms nothing excuses only React's own dev-mode warning. */
const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));
/** The same, with exactly the armed refusal excused as well — no other status on that path. */
const consoleFindingsWithArmed = (shield: Shield, loggedPath: string, status: number) => {
	const pattern = armedFailurePattern(loggedPath, status);
	return consoleFindings(shield).filter((line) => !pattern.test(line));
};
const armedFailureLines = (shield: Shield, loggedPath: string, status: number) => {
	const pattern = armedFailurePattern(loggedPath, status);
	return shield.consoleErrors().filter((line) => pattern.test(line));
};
const validationLines = (shield: Shield) => shield.consoleErrors().filter((line) => line.includes(VALIDATION_FAILURE));

/**
 * The first assertion after any action waits for the state itself, not for a fixed time: `settled` polls a page read
 * until it equals what the state must be, `settledLike` the same for one field of an object. The assertions after a
 * `settled` read the state that poll already proved.
 */
const settled = async <T>(read: () => T | Promise<T>, expected: T) => {
	await expect.poll(read, { timeout: 20_000 }).toEqual(expected);
};
const settledLike = async <T extends object>(read: () => T | Promise<T>, expected: Partial<T>) => {
	await expect.poll(read, { timeout: 20_000 }).toMatchObject(expected);
};

test.describe('lane-c · Reports › Actual & expected hours: figures, grouping, period, filter, export', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// --------------------------------- 1. the lane exactly as it is: the mock answers [] for the report, one plan for the manager

	test('1 · the reads this page makes, with every parameter they carry', async ({ page, fixture, mock }) => {
		const reads = recordReportReads(page);
		const plansTraffic = recordDocumentReads(page, PLANS_PATH);
		const plansReads = () => plansTraffic.calls.filter((call) => call.framePathname === PAGE_PATH);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => reads.length).toBeGreaterThanOrEqual(1);

		const zone = await pageZone(page);
		const ids = [fixture.ids.employee, fixture.ids.teammateEmployee, fixture.ids.deniedEmployee].sort(
			(first, second) => first.localeCompare(second)
		);
		const week = weekOffsetsOf();
		const read = reads[0];
		report('read', {
			origin: read.origin,
			path: read.path,
			method: read.method,
			keys: keysOf(read),
			params: paramsOf(read),
			bounds: localBoundsOf(read),
			zone,
			lang: await pageLang(page),
			weekFrom: dayKey(week[0]),
			weekTo: dayKey(week[6])
		});
		// the first page-state assertion retries, and everything under it reads the state that assertion proved
		await expect(pageHeading(page)).toHaveText(A.TITLE);
		expect(await pageLang(page)).toBe('en');
		// the two crumbs, each by its own name (`actual-expected-page.tsx`, as in `weekly-limit-report-ui.spec.ts:686-696`)
		await expect(
			breadcrumbNav(page).getByRole('link', { name: C.REPORTS, exact: true }),
			'the Reports crumb'
		).toHaveCount(1);
		await expect(
			breadcrumbNav(page).getByRole('link', { name: A.TITLE, exact: true }),
			'the page crumb'
		).toHaveCount(1);
		expect(
			await breadcrumbNav(page)
				.locator('a')
				.evaluateAll((nodes: Element[]) => nodes.map((node) => node.getAttribute('href')))
		).toEqual(['/', PAGE_PATH]);

		expect(read.origin, 'the browser calls the mock origin directly').toBe(MOCK_API_ORIGIN);
		expect(read.path).toBe(REPORT_PATH);
		expect(read.method).toBe('GET');
		expect(paramsOf(read)).toMatchObject({
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			timeZone: zone
		});
		expect(employeeIdsOf(read), 'the request names every team member, sorted').toEqual(ids);
		// finding 2: the hook sends both keys (`use-actual-expected-report.ts:292-293`), `qs.stringify` drops the empty arrays
		expect(
			keysOf(read).filter((key) => key === 'projectIds' || key.startsWith('projectIds[')),
			'no projectIds on the wire'
		).toEqual([]);
		expect(
			keysOf(read).filter((key) => key === 'teamIds' || key.startsWith('teamIds[')),
			'no teamIds on the wire'
		).toEqual([]);
		// the default period is this Monday-first week, from its first day at 00:00 to its last at 23:59:59.999
		expect(localBoundsOf(read)).toEqual({
			fromKey: dayKey(week[0]),
			toKey: dayKey(week[6]),
			fromClock: '00:00:00',
			toClock: '23:59:59'
		});
		await settled(
			() => pageMeta(page).textContent(),
			`${periodTextOf(localDay(week[0]), localDay(week[6]))} · ${memberCount(3)}`
		);
		report('meta', await pageMeta(page).textContent());

		await expect.poll(() => plansReads().length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		const ownPlansRead = lastOf(plansReads());
		const plansWindow = await mock.calls(PLANS_PATH);
		report('plans-reads', {
			thisPage: plansReads().map((call) => `${call.method} ${call.search}`),
			// every plans request the browser sent, with the document URL of the frame that sent it, plus every
			// navigation Playwright reported — the evidence for which document a plans read belongs to
			allTraffic: plansTraffic.calls.map((call) => `${call.method} from ${call.framePathname}`),
			navigations: plansTraffic.navigations,
			mockWindow: plansWindow.map((call) => `${call.method} ${call.path}`)
		});
		// this page's expected hours come from the team-wide read (`use-actual-expected-report.ts:254` →
		// `useTeamDailyPlansOwner` → `daily-plan.service.ts:38-88`): the session's three `where` keys and its one relation
		expect(ownPlansRead.method).toBe('GET');
		expect(ownPlansRead.params).toMatchObject({
			'where[organizationId]': fixture.ids.organizationA,
			'where[tenantId]': fixture.ids.tenantA,
			'where[organizationTeamId]': fixture.ids.teamA,
			'relations[0]': 'tasks'
		});
		expect(
			plansWindow.filter((call) => call.path !== PLANS_PATH && !call.path.startsWith(EMPLOYEE_PLANS_PATH_PREFIX))
				.length,
			'no other document read a plans path here'
		).toBe(0);

		// finding 1: with the mock as it is, the manager has one 8 h plan on today and nobody has tracked time
		const weekRows = [
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`,
			`FM${fixture.names.user}${differenceUnder(hoursLabel(8 * HOUR))}0h 0m / ${hoursLabel(8 * HOUR)}${percentText(0, 8 * HOUR)}`,
			idleMembers(2),
			`Total${memberCount(3)}0h 0m / ${hoursLabel(8 * HOUR)}${percentText(0, 8 * HOUR)}`
		];
		await settled(() => rowsOf(page), weekRows);
		report('rows', await rowsOf(page));
		report('cells', await cellsOf(page));
		report('figures', await figureParagraphsOf(page));
		expect(await figureParagraphsOf(page)).toEqual([
			`${hoursLabel(8 * HOUR)}${A.HEADLINE_PLANNED}`,
			fromPlans(1),
			`0h 0m${A.HEADLINE_TRACKED}`,
			`${reachPercent(0)} · ${reachUnder(hoursLabel(8 * HOUR), 1)}`
		]);
		await expect(exportButton(page)).toBeEnabled();
	});

	// --------------------------------- 2. nothing planned and nothing tracked: the empty week

	test('2 · nothing served: the empty state, its action, and a disabled Export', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const calls = await serveWeeklyReport(page, { rows: [] });
		const servedPlans = await serveDailyPlans(page, []);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);

		const week = weekOffsetsOf();
		const emptyTitle = copy(A.EMPTY_RANGE, {
			from: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(localDay(week[0])),
			to: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(localDay(week[6]))
		});
		const emptyFigures = [
			`${MISSING_FIGURE}${A.HEADLINE_PLANNED}`,
			A.EXPECTED_NONE,
			`0h 0m${A.HEADLINE_TRACKED}`,
			A.CHART_EMPTY
		];
		await settled(() => figureParagraphsOf(page), emptyFigures);
		report('empty', {
			figures: await figureParagraphsOf(page),
			bullet: await bulletParagraphsOf(page, W.SECTION_MEMBERS),
			rows: await rowsOf(page),
			cells: await cellsOf(page),
			chart: await chartRowsOf(page),
			slider: await sliderStateOf(page),
			exportDisabled: await exportButton(page).isDisabled()
		});

		expect(await figuresSection(page).count()).toBe(1);
		expect(await section(page, W.SECTION_MEMBERS).count()).toBe(1);
		expect(await figureParagraphsOf(page)).toEqual(emptyFigures);
		expect(await bulletParagraphsOf(page, W.SECTION_MEMBERS)).toEqual([emptyTitle, A.EMPTY_MESSAGE]);
		expect(await rowsOf(page), 'the grid holds only its header row').toEqual([
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`
		]);
		expect(await cellsOf(page)).toEqual([]);
		expect(await headersOf(page)).toEqual([
			C.MEMBER,
			A.BULLET_COLUMN,
			A.COLUMN_TRACKED_OF_PLANNED,
			A.COLUMN_REACHED
		]);
		await expect(exportButton(page)).toBeDisabled();
		// every day of the week is a row of the chart's own table: begun days read 0h 0m, days ahead "Not started yet"
		expect((await chartHead(page).allTextContents()).map(flat)).toEqual([
			W.COLUMN_DAY,
			A.PLANNED,
			A.TRACKED,
			A.OVER_PLAN,
			A.UNDER_PLAN
		]);
		expect(await chartRowsOf(page)).toEqual(
			week.map((offset) => [
				`${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(localDay(offset))}, ${new Intl.DateTimeFormat(
					'en',
					{ month: 'short', day: 'numeric' }
				).format(localDay(offset))}`,
				A.NO_PLAN,
				begunOffsetsOf().includes(offset) ? '0h 0m' : A.NOT_STARTED,
				MISSING_FIGURE,
				MISSING_FIGURE
			])
		);
		const slider = await sliderStateOf(page);
		expect(slider.label).toBe(A.VARIANCE_TITLE);
		expect(slider.max).toBe(String(week.length - 1));
		// the empty state's own action is a step back to the previous period
		await bulletSection(page, W.SECTION_MEMBERS)
			.getByRole('button', { name: PERIOD.PREVIOUS, exact: true })
			.click();
		await settledLike(() => localBoundsOf(lastOf(calls)), {
			fromKey: shiftKey(dayKey(week[0]), -7),
			toKey: shiftKey(dayKey(week[6]), -7)
		});
		report('emptyStepBack', {
			bounds: localBoundsOf(lastOf(calls)),
			reads: calls.length
		});
		await settled(
			() => pageMeta(page).textContent(),
			`${periodTextOf(localDay(week[0] - 7), localDay(week[6] - 7))} · ${memberCount(3)}`
		);
		// the plans read went to this file's stub, so it never reached the mock on this page's own plans path
		await expect.poll(() => servedPlans.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		const plansWindow = await mock.calls(PLANS_PATH);
		report(
			'plans-window',
			plansWindow.map((call) => `${call.method} ${call.path}`)
		);
		expect(await mock.calls(REPORT_PATH), 'nothing was fetched from the mock').toEqual([]);
		expect(
			plansWindow.filter((call) => call.path === PLANS_PATH),
			'this page read its plans through this file, never from the mock'
		).toEqual([]);
		expect(
			plansWindow.filter((call) => call.path !== PLANS_PATH && !call.path.startsWith(EMPLOYEE_PLANS_PATH_PREFIX))
				.length,
			'no other document read a plans path here'
		).toBe(0);
		expect(consoleFindings(shield), 'the empty page logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the empty page threw a page error').toEqual([]);
	});

	// --------------------------------- 3. one day, two members: one over, one under, the third idle

	test('3 · the Yesterday preset: the figures exactly as the page prints them', async ({ page, fixture, shield }) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const calls = await serveWeeklyReport(page, {
			rows: [
				{ employeeId: manager, fullName: 'Served Manager', dates: { [dayKey(-1)]: 9 * HOUR } },
				{ employeeId: teammate, fullName: 'Served Teammate', dates: { [dayKey(-1)]: 2 * HOUR } }
			]
		});
		await serveDailyPlans(page, [
			{ date: dayKey(-1), employeeId: manager, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(-1), employeeId: teammate, workTimePlanned: 4, status: 'ready' }
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
		// the toolbar is on screen only once the shell settled, so the trigger label is the first retried assertion
		await expect(periodTrigger(page)).toHaveText(C.THIS_WEEK);

		await periodTrigger(page).click();
		await presetList(page).getByRole('button', { name: C.YESTERDAY }).click();
		const oneDayRows = [
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`,
			`FM${fixture.names.user}${rowOver(hoursLabel(HOUR))}9h 0m / 8h${percentText(9 * HOUR, 8 * HOUR)}`,
			`FT${fixture.names.teammate}${differenceUnder(hoursLabel(2 * HOUR))}2h 0m / 4h${percentText(2 * HOUR, 4 * HOUR)}`,
			idleMembers(1),
			`Total${memberCount(3)}11h 0m / 12h${percentText(11 * HOUR, 12 * HOUR)}`
		];
		await settled(() => rowsOf(page), oneDayRows);
		report('yesterday', {
			meta: await pageMeta(page).textContent(),
			rows: await rowsOf(page),
			cells: await cellsOf(page),
			figures: await figureParagraphsOf(page),
			chart: await chartRowsOf(page),
			slider: await sliderStateOf(page),
			ids: employeeIdsOf(lastOf(calls))
		});

		expect(await pageMeta(page).textContent()).toBe(
			`${periodTextOf(localDay(-1), localDay(-1))} · ${memberCount(3)}`
		);
		expect(await rowsOf(page)).toEqual(oneDayRows);
		expect(await figureParagraphsOf(page)).toEqual([
			'12h' + A.HEADLINE_PLANNED,
			fromPlans(2),
			'11h 0m' + A.HEADLINE_TRACKED,
			// both an over and an under member day exist, so the short under part is used (`plan-overview.tsx:109`)
			`${reachPercent(92)} · ${reachOver(hoursLabel(HOUR), 1)} · ${reachUnderShort(hoursLabel(2 * HOUR), 1)}`
		]);
		expect(await chartRowsOf(page)).toEqual([
			[
				`${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(localDay(-1))}, ${new Intl.DateTimeFormat(
					'en',
					{
						month: 'short',
						day: 'numeric'
					}
				).format(localDay(-1))}`,
				'12h',
				'11h 0m',
				hoursLabel(HOUR),
				hoursLabel(2 * HOUR)
			]
		]);
		const slider = await sliderStateOf(page);
		expect(slider.min).toBe('0');
		expect(slider.max).toBe('0');
		expect(slider.now).toBe('0');
		// the group rows are closed on arrival, and their accessible names are the member names
		expect(await togglesOf(page)).toEqual([
			`false :: FM${fixture.names.user}`,
			`false :: FT${fixture.names.teammate}`,
			`false :: ${idleMembers(1)}`
		]);
		await groupToggles(page).first().click();
		const openedToggles = [
			`true :: FM${fixture.names.user}`,
			`false :: FT${fixture.names.teammate}`,
			`false :: ${idleMembers(1)}`
		];
		await settled(() => togglesOf(page), openedToggles);
		report('opened', { toggles: await togglesOf(page), rows: await rowsOf(page) });
		expect(await togglesOf(page)).toEqual(openedToggles);
		expect(consoleFindings(shield), 'the one-day period logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// --------------------------------- 4. the whole week for three members: figures, group meta, the idle fold

	test('4 · every day of the week served for all three members: what each line prints', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		const week = weekOffsetsOf();
		const begun = begunOffsetsOf();
		const ahead = aheadOffsetsOf();
		const rows: ServedRow[] = [
			{
				employeeId: manager,
				fullName: 'Served Manager',
				dates: Object.fromEntries(week.map((o) => [dayKey(o), 9 * HOUR]))
			},
			{
				employeeId: teammate,
				fullName: 'Served Teammate',
				dates: Object.fromEntries(week.map((o) => [dayKey(o), 2 * HOUR]))
			},
			{
				employeeId: restricted,
				fullName: 'Served Restricted',
				dates: Object.fromEntries(week.map((o) => [dayKey(o), 1.5 * HOUR]))
			}
		];
		const plans: ServedPlan[] = week.flatMap((offset) => [
			{ date: dayKey(offset), employeeId: manager, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(offset), employeeId: teammate, workTimePlanned: 4, status: 'ready' }
		]);
		const calls = await serveWeeklyReport(page, { rows });
		await serveDailyPlans(page, plans);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);

		const begunCount = begun.length;
		const planned = begunCount * 12 * HOUR;
		const actualManager = begunCount * 9 * HOUR;
		const actualTeammate = begunCount * 2 * HOUR;
		const actualRestricted = begunCount * 1.5 * HOUR;
		const actual = actualManager + actualTeammate + actualRestricted;
		const weekRows = [
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`,
			`FM${fixture.names.user}${rowOver(hoursLabel(begunCount * HOUR))}${durationShort(actualManager)} / ${hoursLabel(begunCount * 8 * HOUR)}${percentText(actualManager, begunCount * 8 * HOUR)}`,
			`FT${fixture.names.teammate}${differenceUnder(hoursLabel(begunCount * 2 * HOUR))}${durationShort(actualTeammate)} / ${hoursLabel(begunCount * 4 * HOUR)}${percentText(actualTeammate, begunCount * 4 * HOUR)}`,
			`FT${fixture.names.denied}${daysWithoutPlan(begunCount)}${durationShort(actualRestricted)} / ${MISSING_FIGURE}${MISSING_FIGURE}`,
			`Total${memberCount(3)}${durationShort(actual)} / ${hoursLabel(planned)}${percentText(actual, planned)}`
		];
		await settled(() => rowsOf(page), weekRows);
		report('week', {
			begun: begun.map((o) => dayKey(o)),
			ahead: ahead.map((o) => dayKey(o)),
			rows: await rowsOf(page),
			cells: await cellsOf(page),
			figures: await figureParagraphsOf(page),
			meta: await pageMeta(page).textContent()
		});

		expect(await rowsOf(page)).toEqual(weekRows);
		expect(await figureParagraphsOf(page)).toEqual([
			`${hoursLabel(planned)}${A.HEADLINE_PLANNED}`,
			// 6 begun plans plus the days ahead that carry plans of their own (`plan-overview.tsx:66`)
			copy(A.EXPECTED_FROM_PLANS_AHEAD, { count: begunCount * 2, ahead: hoursLabel(ahead.length * 12 * HOUR) }),
			`${durationShort(actual)}${A.HEADLINE_TRACKED}`,
			trackedWithoutPlan(begunCount),
			// both an over and an under member day exist, so the under part takes the short form and its duration is the
			// summed under hours (2 h on each of the 3 begun days), not the per-member sum (`plan-overview.tsx:86,109-114`)
			`${reachPercent(percent(actual, planned))} · ${reachOver(hoursLabel(begunCount * HOUR), begunCount)} · ${reachUnderShort(hoursLabel(begunCount * 2 * HOUR), begunCount)}`
		]);
		// the meters themselves are aria-hidden, so the only text the group cells carry is these four cells per row
		expect(await cellsOf(page)).toEqual([
			`FM${fixture.names.user}${rowOver(hoursLabel(begunCount * HOUR))}`,
			'',
			`${durationShort(actualManager)} / ${hoursLabel(begunCount * 8 * HOUR)}`,
			percentText(actualManager, begunCount * 8 * HOUR),
			`FT${fixture.names.teammate}${differenceUnder(hoursLabel(begunCount * 2 * HOUR))}`,
			'',
			`${durationShort(actualTeammate)} / ${hoursLabel(begunCount * 4 * HOUR)}`,
			percentText(actualTeammate, begunCount * 4 * HOUR),
			`FT${fixture.names.denied}${daysWithoutPlan(begunCount)}`,
			'',
			`${durationShort(actualRestricted)} / ${MISSING_FIGURE}`,
			MISSING_FIGURE,
			`Total${memberCount(3)}`,
			'',
			`${durationShort(actual)} / ${hoursLabel(planned)}`,
			percentText(actual, planned)
		]);
		// the section header is its title, then the dot legend as `meta`, then its own control (`dashboard-layout.tsx:83-89`,
		// `bullet-rows.tsx:545,551`); the fold below counts the members that neither planned nor tracked
		const membersHeader = bulletSection(page, W.SECTION_MEMBERS).locator('header');
		expect(await membersHeader.locator('h2').textContent()).toBe(W.SECTION_MEMBERS);
		expect(await membersHeader.locator('h2 + span').textContent()).toBe(A.DOT_LEGEND);
		await expect(membersHeader.getByRole('button', { name: W.EXPAND_ALL, exact: true })).toHaveCount(1);
		const chart = await chartRowsOf(page);
		expect(chart.filter((row) => row[1] === hoursLabel(12 * HOUR)).length).toBe(week.length);
		expect(consoleFindings(shield), 'the week served for three members logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// --------------------------------- 5. a member with no expected hours, a plan with no hours, estimates only

	test('5 · no plan, a plan without hours, and estimates instead of a plan', async ({ page, fixture, shield }) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		/* The page opens on `This week`, and every row here is built from that week's own days, so the served day is
		   picked from it (`begunDayOffset`: yesterday on Tuesday..Sunday, today on a Monday — `dayKey(-1)` would be
		   the Sunday of the week before, which this period does not draw). */
		const servedDay = begunDayOffset();
		const calls = await serveWeeklyReport(page, {
			rows: [
				{ employeeId: manager, fullName: 'Served Manager', dates: { [dayKey(servedDay)]: 1.5 * HOUR } },
				{ employeeId: teammate, fullName: 'Served Teammate', dates: { [dayKey(servedDay)]: 2 * HOUR } },
				{ employeeId: restricted, fullName: 'Served Restricted', dates: { [dayKey(servedDay)]: 0.5 * HOUR } }
			]
		});
		await serveDailyPlans(page, [
			{ date: dayKey(servedDay), employeeId: manager, workTimePlanned: 0, status: 'ready' },
			{
				date: dayKey(servedDay),
				employeeId: teammate,
				workTimePlanned: 0,
				status: 'ready',
				tasks: [servedTask(1, 'Estimate task A', 3600), servedTask(2, 'Estimate task B', 1800)]
			}
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);

		const chartDay = chartDayLabelOf(servedDay);
		const groupDay = groupDayLabelOf(servedDay);
		const closedRows = [
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`,
			`FM${fixture.names.user}${A.PLAN_WITHOUT_TIME}1h 30m / ${MISSING_FIGURE}${MISSING_FIGURE}`,
			`FT${fixture.names.teammate}${rowOver('0h 30m')}2h 0m / 1h 30m${percentText(2 * HOUR, 1.5 * HOUR)}`,
			`FT${fixture.names.denied}${daysWithoutPlan(1)}0h 30m / ${MISSING_FIGURE}${MISSING_FIGURE}`,
			`Total${memberCount(3)}4h 0m / 1h 30m${percentText(4 * HOUR, 1.5 * HOUR)}`
		];
		await settled(() => rowsOf(page), closedRows);
		report('noExpected', {
			rows: await rowsOf(page),
			figures: await figureParagraphsOf(page),
			chart: await chartRowsOf(page)
		});

		expect(await rowsOf(page)).toEqual(closedRows);
		expect(await figureParagraphsOf(page)).toEqual([
			'1h 30m' + A.HEADLINE_PLANNED,
			fromPlans(1),
			'4h 0m' + A.HEADLINE_TRACKED,
			trackedWithoutPlan(1),
			`${reachPercent(percent(4 * HOUR, 1.5 * HOUR))} · ${reachOver('0h 30m', 1)}`
		]);
		// the planned day of the chart holds only the estimates: 1 h 30 m planned, 0h under because nobody overran the plan
		const begunRow = (await chartRowsOf(page)).find((row) => row[0] === chartDay);
		expect(begunRow).toEqual([chartDay, '1h 30m', '4h 0m', '0h 30m', '0h']);
		await expect(exportButton(page)).toBeEnabled();

		// open every member group: three separate toggles, so each is clicked by index (`bullet-rows.tsx:117-146`)
		await expect(groupToggles(page)).toHaveCount(3);
		const memberToggles = groupToggles(page);
		for (let index = 0; index < 3; index += 1) {
			await memberToggles.nth(index).click();
		}
		const openedRows = [
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`,
			`FM${fixture.names.user}${A.PLAN_WITHOUT_TIME}1h 30m / ${MISSING_FIGURE}${MISSING_FIGURE}`,
			`${groupDay}${A.PLAN_WITHOUT_TIME}1h 30m / ${MISSING_FIGURE}${MISSING_FIGURE}`,
			// the member's own chip is `ROW_OVER` ("+… over", `bullet-rows.tsx:130`); the day row's last cell is
			// `DIFFERENCE_OVER` ("+…" alone, `plan-cells.tsx:126`)
			`FT${fixture.names.teammate}${rowOver('0h 30m')}2h 0m / 1h 30m${percentText(2 * HOUR, 1.5 * HOUR)}`,
			`${groupDay}${A.FROM_ESTIMATES}2h 0m / 1h 30m${differenceOver('0h 30m')}`,
			`FT${fixture.names.denied}${daysWithoutPlan(1)}0h 30m / ${MISSING_FIGURE}${MISSING_FIGURE}`,
			`${groupDay}${A.NO_PLAN}0h 30m / ${MISSING_FIGURE}${MISSING_FIGURE}`,
			`Total${memberCount(3)}4h 0m / 1h 30m${percentText(4 * HOUR, 1.5 * HOUR)}`
		];
		await settled(() => rowsOf(page), openedRows);
		report('opened-groups', { toggles: await togglesOf(page), rows: await rowsOf(page) });
		expect(await togglesOf(page)).toEqual([
			`true :: FM${fixture.names.user}`,
			`true :: FT${fixture.names.teammate}`,
			`true :: FT${fixture.names.denied}`
		]);
		expect(await rowsOf(page)).toEqual(openedRows);
		expect(consoleFindings(shield), 'the no-expected-hours page logged a console error').toEqual([]);
	});

	// --------------------------------- 6. grouping by day: which groups start open, what a day group prints

	test('6 · By day: the day groups, their order, and Expand all', async ({ page, fixture, shield }) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		// the two days this case serves are inside a Last-7-days period on any date the run happens on
		const servedOffsets = [-2, -1];
		const calls = await serveWeeklyReport(page, {
			rows: [
				{
					employeeId: manager,
					fullName: 'Served Manager',
					dates: Object.fromEntries(servedOffsets.map((o) => [dayKey(o), o === -1 ? 9 * HOUR : 3 * HOUR]))
				},
				{
					employeeId: teammate,
					fullName: 'Served Teammate',
					dates: Object.fromEntries(servedOffsets.map((o) => [dayKey(o), o === -1 ? 2 * HOUR : 4 * HOUR]))
				}
			]
		});
		await serveDailyPlans(
			page,
			servedOffsets.flatMap((offset) => [
				{ date: dayKey(offset), employeeId: manager, workTimePlanned: 8, status: 'ready' },
				{ date: dayKey(offset), employeeId: teammate, workTimePlanned: 4, status: 'ready' }
			])
		);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
		await expect(periodTrigger(page)).toHaveText(C.THIS_WEEK);

		await periodTrigger(page).click();
		await presetList(page).getByRole('button', { name: C.FILTER_LAST_7_DAYS }).click();
		const byMemberToggles = [
			`false :: FM${fixture.names.user}`,
			`false :: FT${fixture.names.teammate}`,
			`false :: ${idleMembers(1)}`
		];
		await settled(() => togglesOf(page), byMemberToggles);
		report('byMember', {
			meta: await pageMeta(page).textContent(),
			rows: await rowsOf(page),
			toggles: await togglesOf(page)
		});
		expect(await pageMeta(page).textContent()).toBe(
			`${periodTextOf(localDay(-6), localDay(0))} · ${memberCount(3)}`
		);
		expect(await togglesOf(page)).toEqual(byMemberToggles);

		await groupingTab(page, A.GROUPING_DAY).click();
		const olderLabel = groupDayLabelOf(-2);
		const newerLabel = groupDayLabelOf(-1);
		const byDayRows = [
			`${W.COLUMN_DAY}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`,
			`${olderLabel}${differenceUnder(hoursLabel(5 * HOUR))}7h 0m / 12h${percentText(7 * HOUR, 12 * HOUR)}`,
			`FM${fixture.names.user}3h 0m / 8h${differenceUnder(hoursLabel(5 * HOUR))}`,
			`FT${fixture.names.teammate}4h 0m / 4h${A.ON_PLAN}`,
			`${newerLabel}${rowOver(hoursLabel(HOUR))}${differenceUnder(hoursLabel(2 * HOUR))}11h 0m / 12h${percentText(11 * HOUR, 12 * HOUR)}`,
			`FM${fixture.names.user}9h 0m / 8h${differenceOver(hoursLabel(HOUR))}`,
			`FT${fixture.names.teammate}2h 0m / 4h${differenceUnder(hoursLabel(2 * HOUR))}`,
			idleDays(5),
			`Total${dayCount(2)}18h 0m / 24h${percentText(18 * HOUR, 24 * HOUR)}`
		];
		await settled(() => rowsOf(page), byDayRows);
		report('byDay', { rows: await rowsOf(page), toggles: await togglesOf(page) });
		const daysHeader = bulletSection(page, W.SECTION_DAYS).locator('header');
		expect(await daysHeader.locator('h2').textContent()).toBe(W.SECTION_DAYS);
		expect(await daysHeader.locator('h2 + span').textContent()).toBe(A.DOT_LEGEND);
		// both day groups are open on arrival, so the section's own control already reads "Collapse all"
		await expect(daysHeader.getByRole('button', { name: W.COLLAPSE_ALL, exact: true })).toHaveCount(1);
		expect(await headersOf(page)).toEqual([
			W.COLUMN_DAY,
			A.BULLET_COLUMN,
			A.COLUMN_TRACKED_OF_PLANNED,
			A.COLUMN_REACHED
		]);
		// day groups open by default (`use-plan-groups-open.ts` `OPEN_DAY_GROUPS_BY_DEFAULT = 7`) and run oldest first
		expect(await togglesOf(page)).toEqual([
			`true :: ${olderLabel}`,
			`true :: ${newerLabel}`,
			`false :: ${idleDays(5)}`
		]);
		expect(await rowsOf(page)).toEqual(byDayRows);
		await groupToggles(page).first().click();
		const closedDayToggles = [`false :: ${olderLabel}`, `true :: ${newerLabel}`, `false :: ${idleDays(5)}`];
		await settled(() => togglesOf(page), closedDayToggles);
		report('dayGroupClosed', await togglesOf(page));
		expect(await togglesOf(page)).toEqual(closedDayToggles);
		await page.getByRole('button', { name: W.EXPAND_ALL, exact: true }).click();
		// Expand all opens the day groups; the idle fold stays closed (`bullet-rows.tsx:444-449`)
		const allOpenToggles = [`true :: ${olderLabel}`, `true :: ${newerLabel}`, `false :: ${idleDays(5)}`];
		await settled(() => togglesOf(page), allOpenToggles);
		expect(await togglesOf(page)).toEqual(allOpenToggles);
		expect(await page.getByRole('button', { name: W.COLLAPSE_ALL, exact: true }).count()).toBe(1);
		expect(consoleFindings(shield), 'the by-day grouping logged a console error').toEqual([]);
	});

	// --------------------------------- 7. what a reload keeps: nothing

	test('7 · opening a group, changing the grouping, then reloading', async ({ page, fixture, shield }) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const calls = await serveWeeklyReport(page, {
			rows: [
				{
					employeeId: manager,
					fullName: 'Served Manager',
					dates: { [dayKey(-2)]: 3 * HOUR, [dayKey(-1)]: 9 * HOUR }
				},
				{
					employeeId: teammate,
					fullName: 'Served Teammate',
					dates: { [dayKey(-2)]: 4 * HOUR, [dayKey(-1)]: 2 * HOUR }
				}
			]
		});
		await serveDailyPlans(page, [
			{ date: dayKey(-2), employeeId: manager, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(-1), employeeId: manager, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(-2), employeeId: teammate, workTimePlanned: 4, status: 'ready' },
			{ date: dayKey(-1), employeeId: teammate, workTimePlanned: 4, status: 'ready' }
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
		await expect(periodTrigger(page)).toHaveText(C.THIS_WEEK);
		await periodTrigger(page).click();
		await presetList(page).getByRole('button', { name: C.FILTER_LAST_7_DAYS }).click();
		await groupingTab(page, A.GROUPING_DAY).click();
		await expect(groupingTab(page, A.GROUPING_DAY)).toHaveAttribute('aria-selected', 'true');
		await expect
			.poll(() => togglesOf(page).then((lines) => lines.filter((line) => line.startsWith('true')).length), {
				timeout: 20_000
			})
			.toBe(2);

		const storedBefore = await page.evaluate(() =>
			Object.keys(window.localStorage).sort((first, second) => first.localeCompare(second))
		);
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(2);
		const reloadedToggles = [
			`false :: FM${fixture.names.user}`,
			`false :: FT${fixture.names.teammate}`,
			`false :: ${idleMembers(1)}`
		];
		await settled(() => togglesOf(page), reloadedToggles);
		const storedAfter = await page.evaluate(() =>
			Object.keys(window.localStorage).sort((first, second) => first.localeCompare(second))
		);
		report('reload', {
			storedBefore,
			storedAfter,
			toggles: await togglesOf(page),
			byDaySelected: await groupingTab(page, A.GROUPING_DAY).getAttribute('aria-selected'),
			meta: await pageMeta(page).textContent()
		});

		expect(await togglesOf(page)).toEqual(reloadedToggles);
		expect(await groupingTab(page, A.GROUPING_DAY).getAttribute('aria-selected')).toBe('false');
		report('byMemberSelected', await groupingTab(page, W.GROUPING_MEMBER).getAttribute('aria-selected'));
		const week = weekOffsetsOf();
		expect(await pageMeta(page).textContent()).toBe(
			`${periodTextOf(localDay(week[0]), localDay(week[6]))} · ${memberCount(3)}`
		);
		// nothing about this page is stored, so nothing can survive: the keys that changed are the shell's own
		expect(
			storedAfter.some((key) => /group|period|filter|actual-expected/i.test(key)),
			'no key holds this page state'
		).toBe(false);
		expect(consoleFindings(shield), 'the reload logged a console error').toEqual([]);
	});

	// --------------------------------- 8. the variance chart: its name, its rows, its keyboard

	test('8 · the chart is a slider with a table behind it', async ({ page, fixture, shield }) => {
		const calls = await serveWeeklyReport(page, {
			rows: [
				{
					employeeId: fixture.ids.employee,
					fullName: 'Served Manager',
					dates: { [dayKey(-1)]: 9 * HOUR, [dayKey(-2)]: 3 * HOUR }
				},
				{
					employeeId: fixture.ids.teammateEmployee,
					fullName: 'Served Teammate',
					dates: { [dayKey(-1)]: 2 * HOUR, [dayKey(-2)]: 4 * HOUR }
				}
			]
		});
		await serveDailyPlans(page, [
			{ date: dayKey(-1), employeeId: fixture.ids.employee, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(-2), employeeId: fixture.ids.employee, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(-1), employeeId: fixture.ids.teammateEmployee, workTimePlanned: 4, status: 'ready' },
			{ date: dayKey(-2), employeeId: fixture.ids.teammateEmployee, workTimePlanned: 4, status: 'ready' }
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
		await expect(periodTrigger(page)).toHaveText(C.THIS_WEEK);
		await periodTrigger(page).click();
		await presetList(page).getByRole('button', { name: C.FILTER_LAST_7_DAYS }).click();

		const slider = chartSlider(page);
		await settledLike(() => sliderStateOf(page), {
			label: A.VARIANCE_TITLE,
			orientation: 'horizontal',
			min: '0',
			max: '6',
			now: '0',
			text: null
		});
		const before = await sliderStateOf(page);
		report('chart-before', before);
		expect(before.text, 'no value text until the slider has focus').toBeNull();

		await slider.focus();
		const todayLabel = chartDayLabelOf(0);
		await settledLike(() => sliderStateOf(page), { now: '6', text: todayLabel });
		const focused = await sliderStateOf(page);
		report('chart-focused', focused);
		expect(focused.text, 'focus lands on the last begun day').toBe(todayLabel);

		await page.keyboard.press('ArrowLeft');
		const yesterLabel = chartDayLabelOf(-1);
		await settledLike(() => sliderStateOf(page), { now: '5', text: yesterLabel });
		await page.keyboard.press('ArrowLeft');
		await settledLike(() => sliderStateOf(page), { now: '4' });
		const beforeYesterday = await sliderStateOf(page);
		report('chart-arrows', beforeYesterday);

		await page.keyboard.press('Escape');
		await settledLike(() => sliderStateOf(page), { now: '0', text: null });
		report('chart-escape', await sliderStateOf(page));

		expect(await page.getByRole('heading', { level: 2 }).allTextContents()).toEqual([
			A.VARIANCE_TITLE,
			W.SECTION_MEMBERS
		]);
		const rows = await chartRowsOf(page);
		expect(rows.length).toBe(7);
		const plannedRows = rows.filter((row) => row[1] === hoursLabel(12 * HOUR));
		expect(plannedRows.map((row) => row[1])).toEqual(['12h', '12h']);
		expect(plannedRows.map((row) => row[2])).toEqual(['7h 0m', '11h 0m']);
		expect(plannedRows.map((row) => row[4])).toEqual([hoursLabel(5 * HOUR), hoursLabel(2 * HOUR)]);
		// the visible legend and axis labels are decorative; the table above is the accessible copy
		const hidden = await page
			.locator('[aria-hidden="true"]')
			.evaluateAll((nodes: Element[]) =>
				nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()).filter((text) => text !== '')
			);
		report('chart-hidden', hidden);
		expect(
			hidden.some((text) => text.startsWith(A.OVER_PLAN) && text.includes(A.UNDER_PLAN)),
			'the legend is aria-hidden'
		).toBe(true);
		expect(consoleFindings(shield), 'the chart test logged a console error').toEqual([]);
	});

	// --------------------------------- 9. the period picker: presets, steps, a custom range

	test('9 · the presets, the step buttons, and a range picked from the calendar', async ({ page, fixture }) => {
		const calls = await serveWeeklyReport(page, { rows: [] });
		await serveDailyPlans(page, []);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);

		const week = weekOffsetsOf();
		await expect(periodTrigger(page)).toHaveText(C.THIS_WEEK);
		await periodTrigger(page).click();
		const presets = presetRows(page);
		await expect(presets).toHaveCount(PRESET_LABELS.length);
		report('presets', await allTextsOf(presets));
		for (const label of PRESET_LABELS) {
			// each preset's name is its label plus the range it points at (`period-picker.tsx:80-87`, measured R1-preset-rows)
			expect(await presetList(page).getByRole('button', { name: label }).count(), `the preset ${label}`).toBe(1);
		}
		expect(
			await popover(page).getByRole('gridcell').count(),
			'the calendar shows its own month plus the outside days'
		).toBeGreaterThan(30);
		const monthText = flat((await popover(page).locator('[aria-label="Month"]').textContent()) ?? '');
		const yearText = flat((await popover(page).locator('[aria-label="Year"]').textContent()) ?? '');
		const monthIndex = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].find(
			(index) =>
				new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(Number(yearText), index, 12)) ===
				monthText
		);
		if (monthIndex === undefined) {
			throw new Error(`the calendar's month label ${monthText} is not a month name`);
		}
		report('calendar-month', { monthText, yearText, weekFrom: dayKey(week[0]) });

		const before = calls.length;
		await periodGroup(page).getByRole('button', { name: PERIOD.PREVIOUS, exact: true }).click();
		const previousBounds = {
			fromKey: shiftKey(dayKey(week[0]), -7),
			toKey: shiftKey(dayKey(week[6]), -7),
			fromClock: '00:00:00',
			toClock: '23:59:59'
		};
		await settled(() => localBoundsOf(lastOf(calls)), previousBounds);
		const previous = lastOf(calls);
		report('previous', {
			bounds: localBoundsOf(previous),
			meta: await pageMeta(page).textContent(),
			reads: calls.length
		});
		expect(calls.length, 'a period the cache does not hold is read').toBe(before + 1);
		expect(localBoundsOf(previous)).toEqual(previousBounds);
		await settled(
			() => pageMeta(page).textContent(),
			`${periodTextOf(localDay(week[0] - 7), localDay(week[6] - 7))} · ${memberCount(3)}`
		);

		// the calendar opens on the month the period starts in: pick its 10th and its 14th
		await periodTrigger(page).click();
		const firstDay = new Date(Number(yearText), monthIndex, 10, 12);
		const lastDay = new Date(Number(yearText), monthIndex, 14, 12);
		const readsBeforeRange = calls.length;
		await popover(page).getByRole('gridcell', { name: '10', exact: true }).click();
		// a quiet window, not a settle: this is the one place the test must prove that nothing happened, so no
		// retrying assertion can stand in for it — the first calendar click only opens a range
		// (`period-picker.tsx:97-103` `handleRangeSelect`)
		await page.waitForTimeout(1_000);
		report('afterFirstClick', { reads: calls.length, beforeRange: readsBeforeRange });
		expect(calls.length, 'the first click only opens a range').toBe(readsBeforeRange);
		await popover(page).getByRole('gridcell', { name: '14', exact: true }).click();
		const rangeBounds = {
			fromKey: dayKeyOf(firstDay),
			toKey: dayKeyOf(lastDay),
			fromClock: '00:00:00',
			toClock: '23:59:59'
		};
		await settled(() => localBoundsOf(lastOf(calls)), rangeBounds);
		const range = lastOf(calls);
		report('customRange', {
			bounds: localBoundsOf(range),
			meta: await pageMeta(page).textContent(),
			trigger: await periodTrigger(page).textContent()
		});
		expect(localBoundsOf(range)).toEqual(rangeBounds);
		await settled(() => pageMeta(page).textContent(), `${periodTextOf(firstDay, lastDay)} · ${memberCount(3)}`);
		await expect(periodTrigger(page)).toHaveText(periodTextOf(firstDay, lastDay));

		// a custom period steps by its own length (`dashboard-period.ts:124-133`), not by a week
		const length = 5;
		await bulletSection(page, W.SECTION_MEMBERS)
			.getByRole('button', { name: PERIOD.PREVIOUS, exact: true })
			.click();
		const shiftedBounds = {
			fromKey: dayKeyOf(new Date(Number(yearText), monthIndex, 10 - length, 12)),
			toKey: dayKeyOf(new Date(Number(yearText), monthIndex, 14 - length, 12)),
			fromClock: '00:00:00',
			toClock: '23:59:59'
		};
		await settled(() => localBoundsOf(lastOf(calls)), shiftedBounds);
		const shifted = lastOf(calls);
		report('customStep', localBoundsOf(shifted));
		expect(localBoundsOf(shifted)).toEqual(shiftedBounds);

		await periodTrigger(page).click();
		await presetList(page).getByRole('button', { name: C.LAST_MONTH }).click();
		const monthFrom = new Date(Number(yearText), monthIndex - 1, 1, 12);
		const monthTo = new Date(Number(yearText), monthIndex, 0, 12);
		const monthBounds = {
			fromKey: dayKeyOf(monthFrom),
			toKey: dayKeyOf(monthTo),
			fromClock: '00:00:00',
			toClock: '23:59:59'
		};
		await settled(() => localBoundsOf(lastOf(calls)), monthBounds);
		const month = lastOf(calls);
		report('lastMonth', { bounds: localBoundsOf(month), meta: await pageMeta(page).textContent() });
		expect(localBoundsOf(month)).toEqual(monthBounds);
		await settled(() => pageMeta(page).textContent(), `${periodTextOf(monthFrom, monthTo)} · ${memberCount(3)}`);
	});

	// --------------------------------- 10. the member filter

	test('10 · the member filter: the query it changes, the chip, removing, Clear', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		// only the manager carries tracked time, so a filtered answer proves the ids travelled (the manager's row
		// disappears) and the restricted member, who has neither plan nor time, can reach the filtered empty state
		// (`probe-4.log` S1-afterPick, S1-twoPicked, S1-filteredEmpty)
		// served on a day of the week the page opens on (`begunDayOffset`), never on `dayKey(-1)`, which on a Monday is
		// a day of the week before and prints nowhere on this page
		const servedDay = begunDayOffset();
		const calls = await serveWeeklyReport(page, {
			honourIds: true,
			rows: [{ employeeId: manager, fullName: 'Served Manager', dates: { [dayKey(servedDay)]: 9 * HOUR } }]
		});
		await serveDailyPlans(page, [
			{ date: dayKey(servedDay), employeeId: manager, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(servedDay), employeeId: teammate, workTimePlanned: 4, status: 'ready' }
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);

		const week = weekOffsetsOf();
		const weekMeta = `${periodTextOf(localDay(week[0]), localDay(week[6]))} · ${memberCount(3)}`;
		await expect(pageMeta(page)).toHaveText(weekMeta);

		await filterButton(page).click();
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		const options = page.getByRole('menuitemcheckbox');
		await expect(options).toHaveCount(3);
		report('filter-options', await allTextsOf(options));
		expect(await allTextsOf(options)).toEqual([
			`FM${fixture.names.user}`,
			`FT${fixture.names.denied}`,
			`FT${fixture.names.teammate}`
		]);

		const readsBeforePick = calls.length;
		await options.filter({ hasText: fixture.names.teammate }).click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await settled(() => employeeIdsOf(lastOf(calls)), [teammate]);
		report('picked', {
			ids: employeeIdsOf(lastOf(calls)),
			meta: await pageMeta(page).textContent(),
			rows: await rowsOf(page),
			figures: await figureParagraphsOf(page),
			readsBefore: readsBeforePick,
			reads: calls.length
		});
		expect(calls.length, 'a new member set is a new query').toBeGreaterThanOrEqual(readsBeforePick + 1);
		await settled(
			() => pageMeta(page).textContent(),
			`${periodTextOf(localDay(week[0]), localDay(week[6]))} · ${memberCount(1)}`
		);
		expect(await rowsOf(page)).toEqual([
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`,
			// with nothing tracked against a 4 h plan the whole plan is under (`probe-4.log` S1-afterPick)
			`FT${fixture.names.teammate}${differenceUnder(hoursLabel(4 * HOUR))}0h 0m / 4h${percentText(0, 4 * HOUR)}`,
			`Total${memberCount(1)}0h 0m / 4h${percentText(0, 4 * HOUR)}`
		]);
		// no over day exists, so the under part keeps its full form (`plan-overview.tsx:87,119`)
		expect(await figureParagraphsOf(page)).toEqual([
			'4h' + A.HEADLINE_PLANNED,
			fromPlans(1),
			'0h 0m' + A.HEADLINE_TRACKED,
			`${reachPercent(0)} · ${reachUnder(hoursLabel(4 * HOUR), 1)}`
		]);

		const chip = page.getByRole('button', { name: removeMemberLabel(fixture.names.teammate), exact: true });
		await expect(chip).toHaveCount(1);
		await expect(clearFiltersButtons(page)).toHaveCount(1);
		const readsBeforeRemove = calls.length;
		await chip.click();
		await settled(() => pageMeta(page).textContent(), weekMeta);
		// a quiet window, not a settle: the point here is that **no** read follows, because the unfiltered period is
		// still inside `REPORT_STALE_TIME` (`use-actual-expected-report.ts:57`) — no retrying assertion can prove an
		// absence, so this one case waits a fixed time and then counts
		await page.waitForTimeout(1_500);
		report('removed', { meta: await pageMeta(page).textContent(), reads: calls.length, readsBeforeRemove });
		expect(calls.length, 'the unfiltered period is still fresh, so nothing is re-read').toBe(readsBeforeRemove);

		await filterButton(page).click();
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		await page.getByRole('menuitemcheckbox').filter({ hasText: fixture.names.teammate }).click();
		await page.getByRole('menuitemcheckbox').filter({ hasText: fixture.names.denied }).click();
		await page.keyboard.press('Escape');
		await settled(() => employeeIdsOf(lastOf(calls)), [teammate, restricted].sort());
		report('twoPicked', {
			ids: employeeIdsOf(lastOf(calls)),
			meta: await pageMeta(page).textContent(),
			rows: await rowsOf(page)
		});
		await settled(
			() => pageMeta(page).textContent(),
			`${periodTextOf(localDay(week[0]), localDay(week[6]))} · ${memberCount(2)}`
		);
		await clearFiltersButtons(page).first().click();
		await settled(() => pageMeta(page).textContent(), weekMeta);

		// a filter the answer cannot fill: the filtered empty state, whose action clears the filter
		await filterButton(page).click();
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		await page.getByRole('menuitemcheckbox').filter({ hasText: fixture.names.denied }).click();
		await page.keyboard.press('Escape');
		const emptyTitle = copy(A.EMPTY_RANGE, {
			from: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(localDay(week[0])),
			to: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(localDay(week[6]))
		});
		await settled(() => bulletParagraphsOf(page, W.SECTION_MEMBERS), [emptyTitle, A.EMPTY_FILTERED_MESSAGE]);
		report('filteredEmpty', {
			bullet: await bulletParagraphsOf(page, W.SECTION_MEMBERS),
			rows: await rowsOf(page),
			exportDisabled: await exportButton(page).isDisabled(),
			clearButtons: await clearFiltersButtons(page).count()
		});
		expect(await bulletParagraphsOf(page, W.SECTION_MEMBERS)).toEqual([emptyTitle, A.EMPTY_FILTERED_MESSAGE]);
		expect(await rowsOf(page)).toEqual([
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`
		]);
		await expect(exportButton(page)).toBeDisabled();
		expect(await clearFiltersButtons(page).count(), 'one chip Clear, one in the empty state').toBe(2);
		expect(consoleFindings(shield), 'the filter test logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// --------------------------------- 11. the export

	test('11 · the export menu, the CSV file, and the PDF name', async ({ page, fixture, shield }) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		const calls = await serveWeeklyReport(page, {
			rows: [
				{
					employeeId: manager,
					fullName: 'Served Manager',
					dates: { [dayKey(-2)]: 3 * HOUR, [dayKey(-1)]: 9 * HOUR }
				},
				{
					employeeId: teammate,
					fullName: 'Served Teammate',
					dates: { [dayKey(-2)]: 7210, [dayKey(-1)]: 2 * HOUR }
				},
				{ employeeId: restricted, fullName: 'Served Restricted', dates: { [dayKey(-2)]: 0.5 * HOUR } }
			]
		});
		await serveDailyPlans(page, [
			{ date: dayKey(-1), employeeId: manager, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(-2), employeeId: manager, workTimePlanned: 8, status: 'ready' },
			{ date: dayKey(-1), employeeId: teammate, workTimePlanned: 4, status: 'ready' },
			{
				date: dayKey(-2),
				employeeId: teammate,
				workTimePlanned: 0,
				status: 'ready',
				tasks: [servedTask(3, 'Estimate task C', 5400)]
			}
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
		await expect(periodTrigger(page)).toHaveText(C.THIS_WEEK);
		await periodTrigger(page).click();
		await presetList(page).getByRole('button', { name: C.FILTER_LAST_7_DAYS }).click();

		await expect(exportButton(page)).toBeEnabled();
		await exportButton(page).click();
		await expect(page.getByRole('menu')).toHaveCount(1);
		const items = page.getByRole('menuitem');
		await expect(items).toHaveCount(2);
		report('menu', await allTextsOf(items));
		expect(await allTextsOf(items)).toEqual([C.PDF, EXPORT.CSV]);
		const readsBeforeExport = calls.length;

		const csvEvent = page.waitForEvent('download');
		await items.filter({ hasText: EXPORT.CSV }).click();
		const csv = await csvEvent;
		const csvName = csv.suggestedFilename();
		const raw = readFileSync((await csv.path()) as string, 'utf8');
		report('csv', { name: csvName, bom: raw.codePointAt(0), lines: raw.slice(1).split('\r\n') });
		expect(csvName).toBe(`actual-and-expected-hours-${dayKey(-6)}-${dayKey(0)}.csv`);
		expect(raw.codePointAt(0), 'the CSV starts with a UTF-8 BOM (`dashboard-export.ts:54-58`)').toBe(UTF8_BOM);
		expect(raw.includes('\r\n'), 'lines are joined with CRLF (`dashboard-export.ts:39`)').toBe(true);
		expect(raw.slice(1).split('\r\n')).toEqual([
			[
				C.MEMBER,
				A.CSV_DATE,
				A.CSV_PLAN,
				A.CSV_EXPECTED,
				A.FROM_ESTIMATES,
				A.CSV_TASK_ESTIMATES,
				A.CSV_ACTUAL,
				A.CSV_DIFFERENCE,
				A.CSV_REACHED
			].join(','),
			[
				fixture.names.user,
				dayKey(-2),
				A.SOURCE_PLANNED,
				clockHours(8 * HOUR),
				C.NO,
				'',
				clockHours(3 * HOUR),
				`'${signedClockHours(-5 * HOUR)}`,
				percent(3 * HOUR, 8 * HOUR)
			].join(','),
			[
				fixture.names.user,
				dayKey(-1),
				A.SOURCE_PLANNED,
				clockHours(8 * HOUR),
				C.NO,
				'',
				clockHours(9 * HOUR),
				signedClockHours(HOUR),
				percent(9 * HOUR, 8 * HOUR)
			].join(','),
			[
				fixture.names.teammate,
				dayKey(-2),
				A.FROM_ESTIMATES,
				clockHours(1.5 * HOUR),
				C.YES,
				clockHours(1.5 * HOUR),
				clockHours(7210),
				signedClockHours(1800 + 10),
				percent(7210, 5400)
			].join(','),
			[
				fixture.names.teammate,
				dayKey(-1),
				A.SOURCE_PLANNED,
				clockHours(4 * HOUR),
				C.NO,
				'',
				clockHours(2 * HOUR),
				`'${signedClockHours(-2 * HOUR)}`,
				percent(2 * HOUR, 4 * HOUR)
			].join(','),
			[fixture.names.denied, dayKey(-2), A.NO_PLAN, '', '', '', clockHours(0.5 * HOUR), '', ''].join(',')
		]);

		await exportButton(page).click();
		const pdfEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: C.PDF, exact: true }).click();
		const pdf = await pdfEvent;
		report('pdf', { name: pdf.suggestedFilename() });
		expect(pdf.suggestedFilename()).toBe(`actual-and-expected-hours-${dayKey(-6)}-${dayKey(0)}.pdf`);
		expect(calls.length, 'exporting reads nothing new').toBe(readsBeforeExport);

		// Export is offered only when the report has rows
		await serveWeeklyReport(page, { rows: [] });
		await serveDailyPlans(page, []);
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(exportButton(page)).toBeDisabled();
		report('exportWithoutRows', await exportButton(page).isDisabled());
		expect(consoleFindings(shield), 'the export test logged a console error').toEqual([]);
	});

	// --------------------------------- 12. a refused read: the notice and its retry

	test('12 · the weekly read answers 500: the notice, what disappears, and the retry', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = await serveWeeklyReport(page, { refusal: 500 });
		await serveDailyPlans(page, [
			{ date: dayKey(-1), employeeId: fixture.ids.employee, workTimePlanned: 8, status: 'ready' }
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
		// the notice's own action is what proves the refused read reached the page
		await expect(page.getByRole('button', { name: TRY_AGAIN, exact: true })).toHaveCount(1);

		report('refused', {
			notices: await noticesOf(page),
			figures: await figuresSection(page).count(),
			bullet: await bulletSection(page, W.SECTION_MEMBERS).count(),
			tables: await bulletTable(page).count(),
			exportDisabled: await exportButton(page).isDisabled()
		});
		const notice = `${STATES.ERROR_TITLE} ${STATES.ERROR_MESSAGE} ${TRY_AGAIN}`;
		expect(await noticesOf(page)).toEqual([notice]);
		expect(await figuresSection(page).count(), 'no figures while the read failed').toBe(0);
		expect(await bulletSection(page, W.SECTION_MEMBERS).count(), 'no grid while the read failed').toBe(0);
		expect(await bulletTable(page).count()).toBe(0);
		expect(await chartSlider(page).count()).toBe(0);
		await expect(exportButton(page)).toBeDisabled();

		const before = calls.length;
		await page.getByRole('button', { name: TRY_AGAIN, exact: true }).click();
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThan(before);
		// What the page does after `Try again`, measured in `probe-1.log` P11 and in both acceptance logs: every attempt
		// puts the query back to pending, so `showsActualError` is false while it is in flight (`use-actual-expected-report.ts:338-344`)
		// — no notice, no `Try again` button, the grid shell with its header button only — and the notice is back once
		// the armed 500 lands. The poll proves the notice returns; the assertions under it re-read that settled state.
		// Export never leaves its disabled state, in either phase. The read varies with which attempt it lands between
		// (`-8.log` MEASURE retry: the notice back at reads 4; `-9.log`: a second attempt was already in flight, so its
		// `notices` printed empty and its `tables` printed 1) and is never asserted.
		await expect.poll(() => noticesOf(page), { timeout: 20_000 }).toEqual([notice]);
		report('retry', {
			readsBefore: before,
			readsAfter: calls.length,
			notices: await noticesOf(page),
			tables: await bulletTable(page).count(),
			tryAgainButtons: await page.getByRole('button', { name: TRY_AGAIN, exact: true }).count()
		});
		await expect(bulletTable(page)).toHaveCount(0);
		await expect(page.getByRole('button', { name: TRY_AGAIN, exact: true })).toHaveCount(1);
		await expect(exportButton(page)).toBeDisabled();

		report('console', {
			armed: armedFailureLines(shield, REPORT_LOGGED_PATH, 500).length,
			findings: consoleFindingsWithArmed(shield, REPORT_LOGGED_PATH, 500)
		});
		expect(
			armedFailureLines(shield, REPORT_LOGGED_PATH, 500).length,
			'the armed refusal logged itself'
		).toBeGreaterThan(0);
		expect(consoleFindingsWithArmed(shield, REPORT_LOGGED_PATH, 500), 'nothing else logged an error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// --------------------------------- 13. an answer that does not parse

	test('13 · the weekly read answers rows that fail their schema', async ({ page, fixture, shield }) => {
		const calls = await serveWeeklyReport(page, {
			rawBody: [
				{ employee: { id: fixture.ids.employee }, dates: { [dayKey(-1)]: 'not-a-number-shape' } },
				{ employee: { id: fixture.ids.teammateEmployee }, dates: { [dayKey(-1)]: { sum: 'abc' } } }
			]
		});
		await serveDailyPlans(page, [
			{ date: dayKey(-1), employeeId: fixture.ids.employee, workTimePlanned: 8, status: 'ready' }
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
		const malformedNotice = `${STATES.ERROR_TITLE} ${STATES.ERROR_MESSAGE} ${TRY_AGAIN}`;
		await expect.poll(() => noticesOf(page), { timeout: 20_000 }).toEqual([malformedNotice]);

		report('malformed', {
			notices: await noticesOf(page),
			tables: await bulletTable(page).count(),
			exportDisabled: await exportButton(page).isDisabled(),
			validation: validationLines(shield).length,
			armed: armedFailureLines(shield, REPORT_LOGGED_PATH, 500).length
		});
		// finding 8: on screen this is the same page a refusal produces, although the read answered 200
		expect(await noticesOf(page)).toEqual([malformedNotice]);
		expect(await bulletTable(page).count()).toBe(0);
		await expect(exportButton(page)).toBeDisabled();
		expect(validationLines(shield).length, 'the service named the answer that did not parse').toBeGreaterThan(0);
		expect(
			armedFailureLines(shield, REPORT_LOGGED_PATH, 500).length,
			'no HTTP failure line: the read answered 200'
		).toBe(0);
		expect(
			consoleFindings(shield).filter((line) => !line.includes(VALIDATION_FAILURE)),
			'nothing else logged an error'
		).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// --------------------------------- 14. the plans read refused: expected hours have no other source

	test('14 · the daily-plans read answers 500', async ({ page, fixture, shield }) => {
		const calls = await serveWeeklyReport(page, {
			rows: [{ employeeId: fixture.ids.employee, fullName: 'Served Manager', dates: { [dayKey(-1)]: 9 * HOUR } }]
		});
		await serveDailyPlans(page, { refusal: 500 });
		await signInAndVisit(page, fixture, PAGE_PATH);
		const plansNotice = `${STATES.ERROR_TITLE} ${STATES.ERROR_MESSAGE} ${TRY_AGAIN}`;
		await expect.poll(() => noticesOf(page), { timeout: 20_000 }).toEqual([plansNotice]);
		await expect
			.poll(() => armedFailureLines(shield, PLANS_LOGGED_PATH, 500).length, { timeout: 20_000 })
			.toBeGreaterThan(0);

		report('plansRefused', {
			notices: await noticesOf(page),
			weeklyReads: calls.length,
			tables: await bulletTable(page).count(),
			exportDisabled: await exportButton(page).isDisabled(),
			armedPlans: armedFailureLines(shield, PLANS_LOGGED_PATH, 500).length,
			armedWeekly: armedFailureLines(shield, REPORT_LOGGED_PATH, 500).length
		});
		expect(await noticesOf(page)).toEqual([plansNotice]);
		expect(await bulletTable(page).count()).toBe(0);
		await expect(exportButton(page)).toBeDisabled();
		expect(calls.length, 'the actual read still fired; it is the plans that failed').toBeGreaterThan(0);
		expect(armedFailureLines(shield, REPORT_LOGGED_PATH, 500).length, 'the weekly path was not armed').toBe(0);
		expect(consoleFindingsWithArmed(shield, PLANS_LOGGED_PATH, 500), 'nothing else logged an error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// --------------------------------- 15. plans only on days that have not begun

	test('15 · plans on a week that has not started: nothing to compare yet', async ({ page, fixture, shield }) => {
		const week = weekOffsetsOf();
		// the next week is entirely in the future on whatever date the run happens on
		const aheadKeys = [shiftKey(dayKey(week[0]), 7), shiftKey(dayKey(week[0]), 8)];
		const calls = await serveWeeklyReport(page, { rows: [] });
		await serveDailyPlans(page, [
			{ date: aheadKeys[0], employeeId: fixture.ids.employee, workTimePlanned: 8, status: 'ready' },
			{ date: aheadKeys[1], employeeId: fixture.ids.employee, workTimePlanned: 8, status: 'ready' }
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
		// the trigger names the period with the preset's own label whenever the period **is** a preset, and the dates
		// only for a custom range (`period-picker.tsx:50-52`, `:76-78` `presetOfPeriod` → `:177-186 triggerLabelOf`);
		// the dates are on the button's `title` (`:128`), which is what the run printed: `title="Nov 23 – 29"`
		await expect(periodTrigger(page)).toHaveText(C.THIS_WEEK);
		await expect(periodTrigger(page)).toHaveAttribute('title', periodTextOf(localDay(week[0]), localDay(week[6])));

		const readsBeforeStep = calls.length;
		await periodGroup(page).getByRole('button', { name: PERIOD.NEXT, exact: true }).click();
		await expect.poll(() => calls.length).toBeGreaterThanOrEqual(readsBeforeStep + 1);
		const aheadFigures = [
			`${MISSING_FIGURE}${A.HEADLINE_PLANNED}`,
			copy(A.EXPECTED_ONLY_AHEAD, { ahead: hoursLabel(2 * 8 * HOUR) }),
			'0h 0m' + A.HEADLINE_TRACKED,
			copy(plain(A.CHART_SENTENCE_AHEAD), { ahead: hoursLabel(2 * 8 * HOUR) })
		];
		await settled(() => figureParagraphsOf(page), aheadFigures);

		report('ahead', {
			meta: await pageMeta(page).textContent(),
			figures: await figureParagraphsOf(page),
			bullet: await bulletParagraphsOf(page, W.SECTION_MEMBERS),
			emptyButtons: await bulletSection(page, W.SECTION_MEMBERS).getByRole('button').count(),
			exportDisabled: await exportButton(page).isDisabled(),
			aheadRows: (await chartRowsOf(page)).filter((row) => row[1] === hoursLabel(8 * HOUR))
		});

		expect(await figureParagraphsOf(page)).toEqual(aheadFigures);
		expect(await bulletParagraphsOf(page, W.SECTION_MEMBERS)).toEqual([A.EMPTY_AHEAD_TITLE, A.EMPTY_AHEAD_MESSAGE]);
		expect(await rowsOf(page)).toEqual([
			`${C.MEMBER}${A.BULLET_COLUMN}${A.COLUMN_TRACKED_OF_PLANNED}${A.COLUMN_REACHED}`
		]);
		await expect(exportButton(page)).toBeDisabled();
		// the days-ahead empty state renders no action of its own — no "Clear filters", no "Previous period"
		// (`actual-expected-table.tsx:501-508`), and with no rows the section offers no Expand all either
		// (`bullet-rows.tsx:545`). The one button the section does hold is the column-header button, measured as the
		// single button of this state (`s3-lane-c-actualexpected-1.log` MEASURE ahead, `emptyButtons:1`).
		const sectionButtons = (await bulletSection(page, W.SECTION_MEMBERS).getByRole('button').allTextContents()).map(
			flat
		);
		expect(sectionButtons).toEqual([A.BULLET_COLUMN]);
		expect(
			await bulletSection(page, W.SECTION_MEMBERS)
				.getByRole('button', { name: W.EXPAND_ALL, exact: true })
				.count()
		).toBe(0);
		const aheadRows = (await chartRowsOf(page)).filter((row) => row[1] === hoursLabel(8 * HOUR));
		expect(aheadRows.map((row) => row[2])).toEqual([A.NOT_STARTED, A.NOT_STARTED]);
		expect(aheadRows.map((row) => row[3])).toEqual([MISSING_FIGURE, MISSING_FIGURE]);
		expect(aheadRows.map((row) => row[4])).toEqual([MISSING_FIGURE, MISSING_FIGURE]);
		expect(consoleFindings(shield), 'the days-ahead page logged a console error').toEqual([]);
	});
});
