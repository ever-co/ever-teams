/**
 * Apps and URLs (`/dashboard/app-url/<teamId>`) driven through a browser, against the lane's mock with the
 * activity report and the day's entries served by this file.
 *
 * ## What is real and what is served
 *
 * Real: the page behind `app/[locale]/(main)/dashboard/app-url/[teamId]` with its components
 * `core/components/dashboards/apps-urls/` (`apps-urls-page.tsx`, `apps-urls-toolbar.tsx`, `apps-urls-overview.tsx`,
 * `apps-urls-mosaic.tsx`, `apps-urls-ranked-list.tsx`, `apps-urls-list-controls.tsx`, `apps-urls-day.tsx`,
 * `apps-urls-export.ts`, `usage-cells.tsx`) and the kit around it (`kit/period-picker.tsx`, `kit/export-menu.tsx`,
 * `kit/dashboard-states.tsx`, `kit/dashboard-layout.tsx`, `kit/member-cell.tsx`, `kit/member-picker.tsx`,
 * `kit/hour-axis.tsx`, `kit/share-rows.tsx`); the hooks (`core/hooks/dashboards/apps-urls/use-apps-urls-report.ts`,
 * `use-apps-urls-people.ts`, `use-apps-urls-mosaic.ts`, `use-apps-urls-day.ts`,
 * `core/hooks/dashboards/activity/use-member-day-activities.ts`); the pure rules in
 * `core/lib/utils/dashboards/apps-urls.ts`, `apps-urls-day.ts`, `app-activity.ts`, `dashboard-period.ts`,
 * `dashboard-figures.ts`; `core/services/client/api/activities/activity.service.ts`; the shell, the cookies,
 * next-intl and TanStack Query.
 * Served by `page.route` on the mock origin, because the mock answers nothing for either read:
 * `cypress/support/mock-gauzy-server.mjs:803` answers `[]` for `/api/timesheet/activity` and the unmatched-GET
 * branch answers `pagination([])` for `/api/timesheet/activity/report`. Every other read the shell makes (user,
 * teams, projects, timer, presence, invitations, …) is answered by the mock itself; `p1.log` lists them. The CORS
 * headers are the mock's own (`mock-gauzy-server.mjs:1087-1096`, its `OPTIONS` answer 204 at `:1097-1100`), restated the way `api-tokens-settings-ui.spec.ts`
 * does, and `OPTIONS` is answered 204. No stub in this file calls `route.fetch()`, so every answer below is this
 * file's own.
 *
 * ## Where every number came from
 *
 * `E:/Coding/.tmp/probe-appsurls/`: `p1.log` (the page as the mock serves it), `pA.log` (a served report and a
 * served day: the views, sorting, the day panel), `pB.log` (tile picking and its chip, the mosaic's limits, the day
 * panel's legend/segments/member menu/stepper, the rows an answer cannot name, the 199 vs 200 row cap), `pC.log`
 * (the calendar's day buttons, the member menu, a refused report read, a refused day read, an answer that is an
 * object), `pD.log` (the data set this file serves: the four views, the sort cycle, expand and collapse, a picked
 * tile, the period picker, the member filter, the CSV and the PDF, both refusals), `pE.log` (the figures, the split
 * legend, the tiles, the day panel, the period arrows, a custom window, the CSV's every line, a refused report read
 * and its retry, a day read that fails), `pF.log` (the day panel's member menu, an hour row, the stepper),
 * `pG.log`/`pG2.log` (what the two member menus hold as the element's own text, what an opened hour leaves behind,
 * when the day panel notices an answer its schema refuses) and `pH.log` (a drawn tile, column header and hour
 * button, each attribute read three ways). Each test prints what it asserts as a `MEASURE` line, so the run logs
 * carry the same numbers a second time.
 *
 * ## The data this file serves
 *
 * Days are relative to today (`dayKey(offset)`, a local `YYYY-MM-DD`). The period the page opens on is
 * `today-6 … today` (`periodOfPreset('last7Days', 1)`, `dashboard-period.ts:92-95`), the report rows sit on
 * `today-2` and `today-1`, and two more rows sit inside a window of the month the calendar opens on (see
 * `customWindowOf`) so that a custom range can show rows the first view never showed, on any date. People: the
 * fixture's own employee, the fixture's teammate, and one person the report answers with who is not on the team.
 * Projects: two served ones, plus rows with no project and, in the edge set, one project the reader is not on.
 * Durations are seconds; every figure below is what a run printed.
 *
 * ## Findings (measured, with the line that explains each)
 *
 * 1. **Switching the grouping costs no request.** `groupBy=date` is the only shape the page ever asks for
 *    (`use-apps-urls-report.ts:104-119`, with the comment at `:79-84` saying Gauzy groups the same rows whatever
 *    `groupBy` says), so every view is built in the browser. Measured in `pD.log` d2 and re-measured by test 5: four
 *    views, one report read, `groupBy=date` in it, and only `localStorage['group-by-type']` changed
 *    (`VIEW_STORAGE_KEY`, `use-apps-urls-report.ts:27`, read back at `:89`).
 * 2. **A time sort cannot separate the two served days.** Both hold 1h 40m, so the click that puts Time in its
 *    natural descending order, the click that flips it to ascending, and the click that drops the sort all left the
 *    two group rows in the same places (`pD.log` d2 sort Time: `Monday` first, `Monday` first, then the natural
 *    `Tuesday` first) while `aria-sort` moved through `descending`, `ascending`, `none`. The name column, whose
 *    values do differ, moved the rows on its first click (`ascending`, the older day first) and back to the natural
 *    order on its third (`pD.log` d2 sort Day / App or site). Test 6 pins both.
 * 3. **A row with no employee anywhere is dropped, silently.** In the edge set one activity carried no
 *    `employeeId` and its employee group carried none either: the Application view listed 9 titles, not 10, the
 *    totals read "9 apps and sites4 members4 projects3h 20m", and nothing on screen says a row was dropped
 *    (`usageRowOf` returns null when no employee is left, `apps-urls.ts:211-215`, which is what `flattenActivityReport`
 *    `:248-267` calls for every activity). Test 15, `pB.log` b4.
 * 4. **A name on the row wins over a name on its group, and no name prints "Unknown member".** In the same set a
 *    group whose employee carried only an id printed `UNKNOWN_MEMBER` (`apps-urls.ts` `personNameOrFallback` chain,
 *    drawn by `PersonCell`), and a row inside a group that carried a different employee printed that row's own
 *    employee "Row Copy" (`usageRowOf` takes `activity.employee` before the group's, `apps-urls.ts:211-212`,
 *    and `personOf` `:157-175` builds the name from it). The same nameless person
 *    appears in the day panel's member menu with an empty label — that menu builds its own faces from the report
 *    (`dayMembersOf`, `apps-urls-day.ts:4-16`); `pB.log` b3 member menu `["FM Fixture Manager Selected","","AO Ada
 *    Outsider","RC Row Copy"]`.
 * 5. **The toolbar's member filter and the day panel's member picker list different people.** The filter lists the
 *    team's members *plus* anyone the report answered with (`use-apps-urls-people.ts:51-53` → `filterPeopleOf`,
 *    `apps-urls.ts:929-953`): measured `["AAda Outsider","FFixture Manager","FFixture Restricted Teammate","F
 *    Fixture Teammate"]` as the element's own text — the initial and the name are separate spans with no text node
 *    between them (`initialOf`, `usage-cells.tsx:16-19`; `pG2.log` g1 filter menu, `pD.log` d4) — and the third is a
 *    mock team member with no time at all. The day panel's picker lists only members the report answered with
 *    (`dayMembersOf`, `apps-urls-day.ts:4-16`): measured `["FMFixture ManagerSelected","FTFixture Teammate","AOAda
 *    Outsider"]` and no "Fixture Restricted Teammate" (`pG2.log` g1 day menu); the "Selected" mark is
 *    screen-reader-only (`core/components/common/selected-mark.tsx:19`), so it is in the text and not on screen.
 *    Tests 9 and 11.
 * 6. **A member filter travels as a query parameter and reads again; a picked tile does not, and removing a filter
 *    reads neither.** Applying a member added `employeeIds[0]` to a second report read and the answer this file
 *    gave narrowed with it (`pD.log` d4: 0h 30m for the teammate, 0h 5m for the outsider; test 9) — which is how
 *    Gauzy scopes a report (`requestedEmployeeIdsOf`, `use-apps-urls-report.ts:51-59`). Removing the chip put the
 *    full list back **without a third read** (`pD.log` d4 "after removing the chip": still 2 reads), because the
 *    unfiltered answer is still in the query cache and a period that holds today keeps it fresh for 30s
 *    (`dashboard-live.ts:5,26-36`). Picking a mosaic tile narrowed only the rows already loaded
 *    (`use-apps-urls-mosaic.ts` → `rowsWithTitles`, `apps-urls.ts:590-593`) with no read at all (`pD.log` d2,
 *    `pB.log` b1; test 3).
 * 7. **A person who may not pick other members always sends their own id.** With `scenario.manager: false` (the
 *    mock answers the role `EMPLOYEE`, `mock-gauzy-server.mjs:72-77`) there is no Filter button at all and the one
 *    report read carried `employeeIds[0]=<own employee id>` (`pD.log` d5, `pE.log` e4; `requestedEmployeeIdsOf`
 *    `:51-59` and its comment at `:33-36`). The day panel's member picker is gone too (`canPickMember`, measured
 *    `pickerCount 0` and `apps-urls-page.tsx:190`). Test 10.
 * 8. **The two reads are validated differently.** `GET /api/timesheet/activity` is the one read this page makes
 *    that its service validates: `validateApiResponse(activityEntrySchema.array(), …)`,
 *    `core/services/client/api/activities/activity.service.ts:39-40`, the schema at
 *    `core/types/schemas/activities/activity.schema.ts:124-138`; the report answer is only run through
 *    `flattenActivityReport`, which drops what it cannot read. So a day entry without `id` reads exactly like a
 *    refused day read — the panel asks once more and then draws its own "This part of the report could not load"
 *    with a Try again button (`pG2.log` g2: 1 read and an empty panel at 1.0 s, 2 reads and the notice at 1.5 s),
 *    the figures, the mosaic and the list stay, and nothing reaches the console (`pE.log` e7 malformed,
 *    `consoleErrors: []`). A report
 *    answer that is an object instead of a list reads as "nothing recorded": `listOf` (`use-apps-urls-report.ts:61-66`)
 *    turns anything that is not an array into `[]`, so the page draws its empty period with Export disabled and
 *    prints no console or page error (`pC.log` c7). Refusing the report read instead keeps the figures band drawn
 *    with "–" as its total (`isUnavailable`, `apps-urls-page.tsx:132-135`, its notice at `:152`) plus the same notice inside it, and draws
 *    no table, no mosaic and no day panel (`pE.log` e6; test 13).
 * 9. **The client retries a failed read before this file touches "Try again".** The armed 500 produced two
 *    `[HttpClient]` lines and two reads before any click, and a third read after it (`pE.log` e6: `reads 2` then
 *    `reads 3`); the armed 503 on the day read did the same (`pE.log` e7: two `[FATAL]` lines). So no test here
 *    pins a count of a failed read (`brief-common.md`), and the retry is proven by the rows coming back, not by a
 *    count.
 * 10. **One day key comes from the report, its entries from a second read, and the two can disagree.** The day
 *     panel steps only between days the *report* says that member was in (`activeDayKeysOf`,
 *     `core/lib/utils/dashboards/apps-urls-day.ts`), but its rows come from `GET /api/timesheet/activity` for that
 *     member and day (`use-member-day-activities.ts:36-46`). Stepping back to a day the entries answer nothing for
 *     prints "No app or site recorded for Fixture Manager on Mon, Nov 23" with no duration in the panel head, while
 *     the list above still shows that day with 1h 40m (`pF.log`, `pB.log` b3; test 11). The panel sums only the
 *     picked member's entries (`activitiesOfEmployee` compares `employeeId` strictly, `app-activity.ts:189-191`),
 *     which is also why another member's entry on the same day is missing from its 1h 47m.
 * 11. **Shares are shares of different wholes, and a pick re-works only the list's.** A group row is a share of
 *     the period, a line a share of its group (`SHARE_COLUMN_HINT` says so; measured: the Nov 24 group 50% holding a
 *     Chrome line at 50%). After a tile is picked the group shares are re-worked on the narrowed rows (31% and 69%
 *     of the picked title's 1h 5m, `pD.log` d2) and the list's own totals row follows the pick ("2 days1 member2
 *     projects1h 5m"), while the figures band above keeps the whole period's 3h 20m and the same four-item legend:
 *     the overview is not narrowed by a pick (`pD.log` d2, `pB.log` b1). Test 3.
 * 12. **The mosaic has three limits and a reading order that is not the ranking.** 18 named tiles at most
 *     (`MOSAIC_MAX_NAMED`, `apps-urls.ts:729`), a 1.5% floor (`MOSAIC_MIN_SHARE`, `:732`) except the 6 leaders
 *     (`MOSAIC_ALWAYS_NAMED`, `:735`), and leftovers merged into one "N other apps and sites" tile — except a single
 *     leftover, which keeps its own tile (measured in `pB.log` b2: 9 titles → 8 tiles ending "2 other apps and sites
 *     · 0h 0m · 3%", 8 titles → 8 tiles ending "t-12a · 0h 0m · 1%", 30 equal titles → 19 tiles with "12 other apps
 *     and sites · 0h 20m · 40%"). Tiles are laid out row by row, so DOM order is the reading order: for the served
 *     period the run listed github.com (8%) before Figma (13%) (`pE.log` e1; test 2). The split legend above the
 *     mosaic holds only the 3 leaders plus "Everything else" (`LEADING_TITLE_COUNT = 3`, `apps-urls.ts:312`).
 * 13. **The cap note appears at exactly 200 rows.** 199 served rows: no note, 7 tiles. 200: "Only the 200 longest
 *     entries of this period are shown…" and the same 7 tiles (`isCappedReport(rowCount) = rowCount >= 200`,
 *     `ACTIVITY_REPORT_ROW_CAP = 200` and `:49-50`; `pB.log` b5; test 16).
 * 14. **A hidden project is "Private projects" on screen and "Private project" in the CSV.** `ProjectCell` draws
 *     `common.PRIVATE_PROJECTS` with a `role="img"` lock named by `common.PRIVATE_PROJECT_HINT` (`usage-cells.tsx:99-100` →
 *     `core/components/projects/hidden-project-mark.tsx:23`); measured 1 such lock in the Application view (`pB.log` b4) and the group
 *     "Private projects1 app or site1 member4%0h 8m". The export names it `common.PRIVATE_PROJECT`, singular
 *     (`projectNameOf`, `apps-urls-export.ts`). This file's exported set holds no hidden project, so only the screen
 *     half is asserted (tests 12, 15).
 * 15. **The period presets are listed with their own dates, and the active one says Selected.** Measured in
 *     `pC.log` c1's popover: "TodayNov 25", "YesterdayNov 24", "This weekNov 23 – 29", "Last weekNov 16 – 22",
 *     "Last 7 daysNov 19 – 25Selected", "Last two weeksNov 12 – 25", "This monthNov 1 – 30", "Last monthOct 1 – 31".
 *     Test 7 pins the preset row for the period the page opened on.
 * 16. **While the report is still loading, the page draws a table whose sort buttons do nothing.**
 *     `AppsUrlsRankedListSkeleton` takes `onSort = keepSort`, a function that returns `undefined`
 *     (`apps-urls-ranked-list.tsx:336-338, 341-356`), and the page skeleton draws it (`apps-urls-page-skeleton.tsx:30`)
 *     with the same `role="table"`, the same six column headers and the same header buttons
 *     (`kit/dashboard-layout.tsx:97-115`). Measured: on a drawn page the two sortable headers carry
 *     `aria-sort="none"` before anything is clicked (`pH.log` h1 headers) and the three clicks run the whole cycle
 *     (`pD.log` d2), while a run taken while the lane was still warming found six columnheaders with no `aria-sort`
 *     at all and the same for the mosaic's tiles and the day panel's hours (`s3-lane-a-appsurls-4.log` tests 2, 4, 6,
 *     8, 11). So each test below first asserts the rows its own answer served — the loading skeleton draws a table
 *     with a header row and no group in it (`ListSkeletonRows`, `apps-urls-ranked-list.tsx:314-334`) — before it
 *     clicks anything or reads an attribute.
 * 17. **`FIGURES_LABEL`, `TIME_HINT`, `TITLES_HINT`, `TOP_HINT` and `SHARE_TITLE` are nowhere on the page.** Only
 *     `apps-urls-summary.tsx` reads them and nothing imports that component; measured `getByRole('heading',
 *     {level: 2})` on a served page holds exactly "Time in apps and sites", "Day by hour" and "By day", and a
 *     `getByText` search for those five keys found nothing (`pE.log` e1 h2; test 2).
 *
 * ## What this file does not cover
 *
 * Who may open the page at all (`suites/lane-d/page-gate-browser.spec.ts`, `page-gate-lane.spec.ts`) — every test
 * here signs in as the fixture's normal person on the fixture's own team. The PDF's *contents*: only its file name
 * is checked and no byte of it was read. The 60-second live refresh of a period that holds today
 * (`dashboard-live.ts:4-5,26-36`): no test waits that long, which is also why the healthy reads pinned below are
 * countable. A refused *shell* read. The mosaic's and the day strip's pixel sizes and colours: accessible names and
 * labels only. `SHARE_COLUMN_HINT`, `COLUMN_RANK` and the `timeZone` the report sends are asserted as parameters
 * only. Whether the answer's `type` (APP vs URL) changes anything a browser test can see: the served rows carry it,
 * the page draws an icon with no accessible name for it, and `apps-urls.icons.test.ts` pins the kinds in the unit
 * layer — nothing here claims it.
 *
 * ## Console
 *
 * `shield.consoleErrors()` was empty in every healthy case measured (`p1.log`, `pA.log`, `pB.log` b1/b2/b4/b5,
 * `pD.log` d2/d5, `pE.log` e1-e5, `pF.log`). The armed 500 on the report read prints exactly `[ERROR] [HttpClient]
 * HTTP Error: GET /timesheet/activity/report?<query> 500 {…}` and the armed 503 on the day read the same line with
 * `[FATAL]` (`pE.log` e6, e7); only those exact named lines are excused, after `api-tokens-settings-ui.spec.ts` and
 * `project-budget-report-ui.spec.ts`. A read that fails its schema prints no HTTP line at all (test 14). The dev
 * `Query failed` toast (`core/components/common/dev-error-toaster.tsx`) is DOM, not console, and is only measured,
 * never asserted.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type BootstrapFixture, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, hardVisit, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

const PAGE_PATH = '/dashboard/app-url';
const REPORT_PATH = '/api/timesheet/activity/report';
/** The same read as the client logs it (`error.config.url`, without the `/api` prefix): `pE.log` e6. */
const REPORT_LOG_PATH = '/timesheet/activity/report';
const DAY_PATH = '/api/timesheet/activity';
const DAY_LOG_PATH = '/timesheet/activity';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const OUTSIDER_ID = 'au-outsider-1';
const OUTSIDER_NAME = 'Ada Outsider';

/** The message map, typed so `A.day` stays a map of its own. */
type AppsUrlsMessages = Record<string, string> & { day: Record<string, string> };

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	sidebar: { APPS_AND_URLS: string };
	common: Record<string, string>;
	dashboard: {
		appsUrls: AppsUrlsMessages;
		period: Record<string, string>;
		states: Record<string, string>;
	};
	pages: { unauthorized: { TRY_AGAIN: string } };
};
const A: AppsUrlsMessages = EN.dashboard.appsUrls;
const DAY = A.day;

/* --------------------------------------------- the copy, read from the locale ---------------------------------- */

/** The ICU parts these keys use: `{name}`, `{period}` and `{count, plural, one {…} other {…}}` with `#`. */
function readBraced(text: string, from: number): [string, number] {
	let depth = 0;
	for (let index = from; index < text.length; index += 1) {
		if (text[index] === '{') {
			depth += 1;
		} else if (text[index] === '}') {
			depth -= 1;
			if (depth === 0) {
				return [text.slice(from + 1, index), index + 1];
			}
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
		while (index < body.length && body[index] !== '{') {
			index += 1;
		}
		const [inner, next] = readBraced(body, index);
		branches[branch[0]] = inner;
		index = next;
	}
	const chosen = branches[`=${count}`] ?? (count === 1 ? branches.one : branches.other) ?? '';
	return chosen.replace(/#/g, String(count));
}

/** A `dashboard.appsUrls.*` string with its placeholders filled in — never a copy typed into this file. */
function msg(key: string, values: Record<string, string | number> = {}): string {
	const raw = key.split('.').reduce((node: unknown, part) => (node as Record<string, unknown>)?.[part], A) as string;
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

const titleCount = (count: number) => msg('TITLE_COUNT', { count });
const dayCount = (count: number) => msg('DAY_COUNT', { count });
const memberCount = (count: number) => msg('MEMBER_COUNT', { count });
const projectCount = (count: number) => msg('PROJECT_COUNT', { count });
const removeOf = (name: string) => msg('REMOVE_FILTER', { name });
const hourToggle = (hour: string, duration: string, count: number) => msg('day.HOUR_TOGGLE', { hour, duration, count });
const segmentLabel = (start: string, end: string, title: string, duration: string) =>
	msg('day.SEGMENT_LABEL', { start, end, title, duration });
/** `initialOf`, the single letter `PersonFace` draws in the filter menu and the chips (usage-cells.tsx:16-19). */
const faceOf = (name: string) => (Array.from(name.trim())[0] ?? '').toUpperCase();
/** `initialsOf`, the two letters `MemberCell` draws in a report row (kit/member-cell.tsx:13-17). */
const plateOf = (name: string) => {
	const words = name.trim().split(/\s+/).filter(Boolean);
	return `${words[0]?.[0] ?? ''}${words[words.length - 1]?.[0] ?? ''}`.toUpperCase();
};

/** A text list read from the page, waited for: a click or a read re-renders asynchronously. */
const expectTexts = async (read: () => Promise<string[]>, expected: string[]) => {
	await expect.poll(read, { timeout: 40_000 }).toEqual(expected);
};
/** An attribute or label list, waited for the same way. */
const expectValues = async <T>(read: () => Promise<T[]>, expected: T[]) => {
	await expect.poll(read, { timeout: 40_000 }).toEqual(expected);
};
/** How many elements a text reader found, waited for. */
const expectCount = async (read: () => Promise<unknown[]>, expected: number, options: { timeout?: number } = {}) => {
	await expect.poll(async () => (await read()).length, { timeout: options.timeout ?? 20_000 }).toBe(expected);
};

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a apps-urls] MEASURE ${label} ${JSON.stringify(value)}`);

/** Text of everything a locator matches, read with `textContent`: the line rows carry
 * `[content-visibility:auto]` (`apps-urls-ranked-list.tsx:82`), so `innerText()` answers `""` for them. */
const texts = (locator: Locator) =>
	locator.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));

/**
 * One attribute of every element a locator found, read through the locator itself: `evaluateAll` runs its function
 * in the page, where a captured variable is gone (`name` there is `window.name`, so every read came back null),
 * while `nth(i).getAttribute(...)` asks the page for the real attribute.
 */
const attrs = async (locator: Locator, attribute: string) => {
	const values: (string | null)[] = [];
	const count = await locator.count();
	for (let index = 0; index < count; index += 1) values.push(await locator.nth(index).getAttribute(attribute));
	return values;
};

const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** Excuse only the exact refusal this file armed, path *and* status: `[HttpClient] HTTP Error: GET <path>?<query> <status> {…}`. */
const armedRead = (path: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${path}(\?\S*)? ${status} `);
const consoleFindings = (shield: Shield, excused: RegExp[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !excused.some((pattern) => pattern.test(line)));

/* ------------------------------------------------------ the stubs ------------------------------------------------- */

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1096`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

type ServedActivity = {
	employeeId?: string;
	projectId?: string | null;
	date: string;
	title: string;
	duration: number;
	type?: string;
	url?: string;
	employee?: { id: string; fullName: string };
};
type ServedProject = { id?: string; name?: string | null; color?: string | null; projectHidden?: boolean } | null;
type ServedEmployee = { id?: string; fullName?: string; user?: { name?: string } } | undefined;
/** A lean activity report: `date > employees > projects > activity`, the rows carrying ids and seconds. */
type ServedDay = {
	date: string;
	employees: Array<{
		employee: ServedEmployee;
		projects: Array<{ project: ServedProject; activity: ServedActivity[] }>;
	}>;
};
type ReportScript = { days?: ServedDay[]; status?: number; raw?: unknown };
type DayScript = { entries?: unknown[]; status?: number };
type ServedCall = { method: string; path: string; search: string; params: URLSearchParams };

const person = (id: string, name: string): ServedEmployee => ({ id, fullName: name, user: { name: name } });
const project = (id: string, name: string, color = '#1d4ed8'): ServedProject => ({ id, name, color });

const answerHeaders = () => ({ ...CORS_HEADERS, 'content-type': 'application/json' });

/**
 * `GET /api/timesheet/activity/report` (`activity.service.ts`, `getActivitiesReport`), answered from a script the
 * test rewrites between its own steps. `byRange` answers only the days the asked range holds, and `scoped` only the
 * members the query names *when it names any* — a period manager with no filter applied names nobody and is answered
 * the whole team, which is how Gauzy scopes a report. So what a filter sends can be seen in what comes back.
 */
function serveReport(
	page: Page,
	script: ReportScript,
	options: { scoped?: boolean; byRange?: boolean; delayMs?: number } = {}
): ServedCall[] {
	const calls: ServedCall[] = [];
	page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === REPORT_PATH,
		async (route) => {
			const request = route.request();
			const url = new URL(request.url());
			const params = new URLSearchParams(url.search);
			calls.push({ method: request.method(), path: url.pathname, search: url.search, params });
			if (request.method() === 'OPTIONS') {
				route.fulfill({ status: 204, headers: CORS_HEADERS });
				return;
			}
			if (options.delayMs) {
				await new Promise((done) => setTimeout(done, options.delayMs));
			}
			if (script.status) {
				route.fulfill({
					status: script.status,
					headers: answerHeaders(),
					body: JSON.stringify({ statusCode: script.status, message: 'this file refused the report read' })
				});
				return;
			}
			if (script.raw !== undefined) {
				route.fulfill({ status: 200, headers: answerHeaders(), body: JSON.stringify(script.raw) });
				return;
			}
			const asked = [...params.keys()]
				.filter((key) => key.startsWith('employeeIds['))
				.map((key) => params.get(key));
			const from = (params.get('startDate') ?? '').slice(0, 10);
			const to = (params.get('endDate') ?? '').slice(0, 10);
			let days = script.days ?? [];
			if (options.byRange) {
				days = days.filter((day) => day.date.slice(0, 10) >= from && day.date.slice(0, 10) <= to);
			}
			if (options.scoped && asked.length > 0) {
				days = days.map((day) => ({
					...day,
					employees: day.employees.filter(
						(group) => group.employee?.id !== undefined && asked.includes(group.employee.id)
					)
				}));
			}
			route.fulfill({ status: 200, headers: answerHeaders(), body: JSON.stringify(days) });
		}
	);
	return calls;
}

/** `GET /api/timesheet/activity`, the day's own entries (`getActivitiesInRange`, validated by `activityEntrySchema`). */
function serveDay(page: Page, script: DayScript): ServedCall[] {
	const calls: ServedCall[] = [];
	page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === DAY_PATH,
		(route) => {
			const request = route.request();
			const url = new URL(request.url());
			calls.push({
				method: request.method(),
				path: url.pathname,
				search: url.search,
				params: new URLSearchParams(url.search)
			});
			if (request.method() === 'OPTIONS') {
				route.fulfill({ status: 204, headers: CORS_HEADERS });
				return;
			}
			if (script.status) {
				route.fulfill({
					status: script.status,
					headers: answerHeaders(),
					body: JSON.stringify({ statusCode: script.status, message: 'this file refused the day read' })
				});
				return;
			}
			route.fulfill({ status: 200, headers: answerHeaders(), body: JSON.stringify(script.entries ?? []) });
		}
	);
	return calls;
}

/* ---------------------------------------------------- the served days --------------------------------------------- */

/** A local calendar day, `offset` days from today, as `YYYY-MM-DD`. */
function dayKey(offset: number): string {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offset);
	return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

/** A moment on a calendar day, as the ISO instant `recordedAt` carries (`app-activity.ts:75-86` reads it first). */
function instantAt(dateKey: string, hour: number, minute = 0): string {
	const [year, month, date] = dateKey.split('-').map(Number);
	return new Date(year, month - 1, date, hour, minute, 0, 0).toISOString();
}

/**
 * A window of days to pick in the calendar, and the two days its rows sit on.
 *
 * The picker opens on the month of its own `from` (`period-picker.tsx`, `defaultMonth={value.from}`,
 * `numberOfMonths={1}`), so a day button is only safe where it cannot also be an outside day: `showOutsideDays`
 * adds at most six of the previous month's last days (numbers >= 23) and at most six of the next month's first days
 * (1…6), so **7…22 are never duplicated** — measured grid `["26","27",…,"6","7",…,"31","1",…,"6"]` (`pC.log` c1).
 * The window must also hold none of the days the page opened on, or its rows would already be in the first view;
 * the three windows below cover every date, because a seven-day period ending today can overlap at most two of
 * them (`pE.log` e3, `pD.log` d3 both chose 7…11 on 2026-11-25).
 */
function customWindowOf(fromKey: string) {
	const [year, month] = fromKey.split('-').map(Number);
	const key = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	const todayKey = dayKey(0);
	for (const [first, last] of [
		[7, 11],
		[12, 16],
		[18, 22]
	]) {
		const from = key(first);
		const to = key(last);
		if (from <= todayKey && to >= fromKey) {
			continue;
		}
		return { from, to, fromDay: first, toDay: last, innerFrom: key(first + 1), innerTo: key(last - 1) };
	}
	throw new Error(`no calendar window fits ${fromKey}..${todayKey}`);
}

/** The period the page opens on: `last7Days` = `today-6 … today` (`dashboard-period.ts:92-95`). */
const periodKeys = () => ({ from: dayKey(-6), to: dayKey(0) });

/**
 * The report the tests read: two people of the team plus one the team does not hold, two projects, rows with no
 * project, an app kind and a site kind, two days inside the period the page opened on, and two days inside the
 * window `customWindowOf` picked — so a custom range shows rows the first view never showed.
 */
function servedReport(fixture: BootstrapFixture, window: ReturnType<typeof customWindowOf>): ServedDay[] {
	const own = fixture.ids.employee;
	const mate = fixture.ids.teammateEmployee;
	const older = dayKey(-2);
	const newer = dayKey(-1);
	const first = project('au-project-1', 'Project au-project-1');
	const second = project('au-project-2', 'Project au-project-2', '#0f766e');
	return [
		{
			date: older,
			employees: [
				{
					employee: person(own, fixture.names.user),
					projects: [
						{
							project: first,
							activity: [
								{
									employeeId: own,
									projectId: 'au-project-1',
									date: older,
									title: 'VS Code',
									duration: 2700,
									type: 'APP'
								},
								{
									employeeId: own,
									projectId: 'au-project-1',
									date: older,
									title: 'Chrome',
									duration: 600,
									type: 'URL',
									url: 'https://www.google.com/search?q=lean'
								}
							]
						},
						{
							project: null,
							activity: [
								{
									employeeId: own,
									projectId: null,
									date: older,
									title: 'github.com',
									duration: 900,
									type: 'URL',
									url: 'https://github.com/ever-co'
								}
							]
						}
					]
				},
				{
					employee: person(mate, fixture.names.teammate),
					projects: [
						{
							project: first,
							activity: [
								{
									employeeId: mate,
									projectId: 'au-project-1',
									date: older,
									title: 'Slack',
									duration: 1800
								}
							]
						}
					]
				}
			]
		},
		{
			date: newer,
			employees: [
				{
					employee: person(own, fixture.names.user),
					projects: [
						{
							project: first,
							activity: [
								{
									employeeId: own,
									projectId: 'au-project-1',
									date: newer,
									title: 'Chrome',
									duration: 3000,
									type: 'URL',
									url: 'https://www.google.com/search?q=urls'
								}
							]
						},
						{
							project: second,
							activity: [
								{
									employeeId: own,
									projectId: 'au-project-2',
									date: newer,
									title: 'VS Code',
									duration: 1200,
									type: 'APP'
								},
								{
									employeeId: own,
									projectId: 'au-project-2',
									date: newer,
									title: 'Figma',
									duration: 1500,
									type: 'APP'
								}
							]
						}
					]
				},
				{
					employee: person(OUTSIDER_ID, OUTSIDER_NAME),
					projects: [
						{
							project: null,
							activity: [
								{ employeeId: OUTSIDER_ID, projectId: null, date: newer, title: 'Slack', duration: 300 }
							]
						}
					]
				}
			]
		},
		{
			date: window.innerFrom,
			employees: [
				{
					employee: person(own, fixture.names.user),
					projects: [
						{
							project: null,
							activity: [
								{
									employeeId: own,
									projectId: null,
									date: window.innerFrom,
									title: 'Slack',
									duration: 1500
								}
							]
						}
					]
				}
			]
		},
		{
			date: window.innerTo,
			employees: [
				{
					employee: person(mate, fixture.names.teammate),
					projects: [
						{
							project: second,
							activity: [
								{
									employeeId: mate,
									projectId: 'au-project-2',
									date: window.innerTo,
									title: 'VS Code',
									duration: 1000,
									type: 'APP'
								},
								{
									employeeId: mate,
									projectId: 'au-project-2',
									date: window.innerTo,
									title: 'github.com',
									duration: 600,
									type: 'URL',
									url: 'https://github.com/ever-co'
								}
							]
						}
					]
				}
			]
		}
	];
}

/** The day's entries the panel reads: `TActivityEntry` as `activityEntrySchema` wants it, `id` included. */
function servedEntries(fixture: BootstrapFixture, window: ReturnType<typeof customWindowOf>): unknown[] {
	const own = fixture.ids.employee;
	const mate = fixture.ids.teammateEmployee;
	const newer = dayKey(-1);
	return [
		{
			id: 'au-day-1',
			title: 'Chrome',
			description: 'Search - Google Chrome',
			date: newer,
			time: '09:00:00',
			duration: 1800,
			type: 'URL',
			employeeId: own,
			recordedAt: instantAt(newer, 9),
			metaData: { url: 'https://www.google.com/search?q=urls' }
		},
		{
			id: 'au-day-2',
			title: 'VS Code',
			description: 'activity.ts - Visual Studio Code',
			date: newer,
			time: '10:30:00',
			duration: 2700,
			type: 'APP',
			employeeId: own,
			recordedAt: instantAt(newer, 10, 30)
		},
		{
			id: 'au-day-3',
			title: 'Slack',
			description: null,
			date: newer,
			time: '14:05:00',
			duration: 900,
			type: 'APP',
			employeeId: own,
			recordedAt: instantAt(newer, 14, 5)
		},
		{
			id: 'au-day-4',
			title: 'Chrome',
			description: 'URLs - Google Chrome',
			date: newer,
			time: '15:30:00',
			duration: 600,
			type: 'URL',
			employeeId: own,
			recordedAt: instantAt(newer, 15, 30)
		},
		{
			id: 'au-day-5',
			title: 'Figma',
			description: null,
			date: newer,
			time: '16:10:00',
			duration: 300,
			type: 'APP',
			employeeId: own,
			recordedAt: instantAt(newer, 16, 10)
		},
		{
			id: 'au-day-6',
			title: 'Zoom',
			description: null,
			date: newer,
			time: '16:40:00',
			duration: 120,
			type: 'APP',
			employeeId: own,
			recordedAt: instantAt(newer, 16, 40)
		},
		{
			id: 'au-day-7',
			title: 'Chrome',
			description: 'another member',
			date: newer,
			time: '11:00:00',
			duration: 900,
			type: 'URL',
			employeeId: mate,
			recordedAt: instantAt(newer, 11)
		},
		{
			id: 'au-day-8',
			title: 'Slack',
			description: null,
			date: window.innerFrom,
			time: '12:00:00',
			duration: 1500,
			type: 'APP',
			employeeId: own,
			recordedAt: instantAt(window.innerFrom, 12)
		},
		{
			id: 'au-day-9',
			title: 'VS Code',
			description: null,
			date: window.innerTo,
			time: '13:00:00',
			duration: 1000,
			type: 'APP',
			employeeId: mate,
			recordedAt: instantAt(window.innerTo, 13)
		},
		{
			id: 'au-day-10',
			title: 'github.com',
			description: null,
			date: window.innerTo,
			time: '13:30:00',
			duration: 600,
			type: 'URL',
			employeeId: mate,
			recordedAt: instantAt(window.innerTo, 13, 30)
		},
		{
			id: 'au-day-11',
			title: 'Slack',
			description: 'the outsider',
			date: newer,
			time: '17:00:00',
			duration: 300,
			type: 'APP',
			employeeId: OUTSIDER_ID,
			recordedAt: instantAt(newer, 17)
		}
	];
}

/** One member, one project, `titles` of `seconds` each — the sets that show the mosaic's limits and the row cap. */
function titlesDay(date: string, titles: Array<[string, number]>, employeeId: string, name: string): ServedDay {
	const own = project('au-project-1', 'Project au-project-1');
	return {
		date,
		employees: [
			{
				employee: person(employeeId, name),
				projects: [
					{
						project: own,
						activity: titles.map(([title, duration]) => ({
							employeeId,
							projectId: own?.id ?? null,
							date,
							title,
							duration,
							type: 'APP'
						}))
					}
				]
			}
		]
	};
}

/* ------------------------------------------------------ locators -------------------------------------------------- */

const periodGroup = (page: Page) => page.getByRole('group', { name: EN.dashboard.period.LABEL });
const periodTrigger = (page: Page) => periodGroup(page).locator('button').nth(1);
const metaLine = (page: Page) => page.locator('h1').locator('xpath=following-sibling::span');
const exportButton = (page: Page) => page.getByRole('button', { name: EN.common.EXPORT, exact: true });
const filterButton = (page: Page) => page.getByRole('button', { name: EN.common.FILTER, exact: true });
const clearButton = (page: Page) => page.getByRole('button', { name: EN.common.CLEAR_FILTERS, exact: true });
const updatingBar = (page: Page) => page.locator(`output[aria-label="${A.UPDATING}"]`);
const mosaicGroup = (page: Page) => page.locator(`[role="group"][aria-label="${A.MOSAIC_LABEL}"]`);
const mosaicTiles = (page: Page) => mosaicGroup(page).locator('button');
const sectionOf = (page: Page, heading: string) =>
	page.getByRole('heading', { name: heading }).locator('xpath=ancestor::section[1]');
const sectionHead = (page: Page, heading: string) =>
	page.getByRole('heading', { name: heading }).locator('xpath=following-sibling::*');
const groupRows = (page: Page) => texts(page.getByRole('rowgroup').locator('> div[role="row"]'));
const groupToggles = (page: Page) => texts(page.getByRole('rowheader'));
const groupAria = (page: Page) => attrs(page.getByRole('rowheader').locator('button'), 'aria-expanded');
const totalsRow = (page: Page) => texts(page.getByRole('table').locator('> [role="row"]').last());
const chipTexts = (page: Page) =>
	texts(page.getByRole('button', { name: /^Remove/ }).locator('xpath=ancestor::span[1]'));
const splitLegend = (page: Page) => texts(sectionOf(page, A.TIME_LABEL).locator('ul').first().locator('li'));
const daySection = (page: Page) => sectionOf(page, DAY.TITLE);
const dayHourButtons = (page: Page) => daySection(page).locator('li > button');
const dayLegend = (page: Page) => texts(daySection(page).locator('ul').first().locator('li'));
const daySegments = (page: Page) => attrs(daySection(page).locator('[role="img"]'), 'aria-label');
/**
/** Only the lines inside a group: a row inside a rowgroup that is not that group's own header row. */
const lineTexts = (page: Page) =>
	page.getByRole('row').evaluateAll((rows) =>
		rows
			.filter((row) => !row.querySelector('[role="rowheader"]') && !row.querySelector('[role="columnheader"]'))
			.filter(
				(row) =>
					row.closest('[role="rowgroup"]') !== null && row.parentElement?.getAttribute('role') !== 'rowgroup'
			)
			.map((row) => (row.textContent ?? '').replace(/\s+/g, ' ').trim())
	);
const rangesOf = (calls: ServedCall[]) => [
	...new Set(calls.map((call) => `${call.params.get('startDate')}..${call.params.get('endDate')}`))
];
const membersOf = (calls: ServedCall[]) =>
	calls.map((call) =>
		[...call.params.keys()]
			.filter((key) => key.startsWith('employeeIds['))
			.map((key) => call.params.get(key))
			.join('+')
	);

/** A section's text, or `<not drawn>`: reading a locator that matches nothing would wait for the test timeout. */
async function sectionText(page: Page, heading: string): Promise<string> {
	if ((await page.getByRole('heading', { name: heading }).count()) === 0) {
		return '<not drawn>';
	}
	return sectionOf(page, heading).evaluate((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim());
}

/** `formatPeriod` (`dashboard-period.ts:147-157`) worked out in the browser, whose clock and zone the page uses. */
function metaOf(page: Page, fromKey: string, toKey: string) {
	return page.evaluate(
		([startKey, endKey]) => {
			const [y1, m1, d1] = startKey.split('-').map(Number);
			const [y2, m2, d2] = endKey.split('-').map(Number);
			const from = new Date(y1, m1 - 1, d1, 0, 0, 0, 0);
			const to = new Date(y2, m2 - 1, d2, 23, 59, 59, 999);
			const showsYear =
				from.getFullYear() !== to.getFullYear() || from.getFullYear() !== new Date().getFullYear();
			const options: Intl.DateTimeFormatOptions = showsYear
				? { month: 'short', day: 'numeric', year: 'numeric' }
				: { month: 'short', day: 'numeric' };
			return new Intl.DateTimeFormat('en', options).formatRange(from, to);
		},
		[fromKey, toKey]
	);
}

/** `formatDayLabel` (`apps-urls.ts:572-574`): weekday long, month short, day numeric, the year only outside this one. */
function dayLabelOf(page: Page, dateKey: string) {
	return page.evaluate((key) => {
		const [year, month, day] = key.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
		if (date.getFullYear() !== new Date().getFullYear()) {
			options.year = 'numeric';
		}
		return new Intl.DateTimeFormat('en', options).format(date);
	}, dateKey);
}

/** The day panel's own `dayFormat` (`apps-urls-day.ts:366-369`): weekday short, month short, day numeric. */
function dayShortOf(page: Page, dateKey: string) {
	return page.evaluate((key) => {
		const [year, month, day] = key.split('-').map(Number);
		return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(
			new Date(year, month - 1, day)
		);
	}, dateKey);
}

/** The day read's own window: `startOfDay` to `endOfDay` of that day in the reader's zone. */
function dayWindowOf(page: Page, dateKey: string) {
	return page.evaluate((key) => {
		const [year, month, day] = key.split('-').map(Number);
		const start = new Date(year, month - 1, day, 0, 0, 0, 0);
		const end = new Date(year, month - 1, day, 23, 59, 59, 999);
		return `${start.toISOString()}..${end.toISOString()}`;
	}, dateKey);
}

/** Routes first, cookies second, navigation last — the order `helpers.ts:439-451` explains. */
async function openPage(
	page: Page,
	fixture: BootstrapFixture,
	options: {
		window?: ReturnType<typeof customWindowOf>;
		scenario?: { manager?: boolean };
		delayMs?: number;
	} = {}
) {
	const window = options.window ?? customWindowOf(periodKeys().from);
	const reportCalls = serveReport(
		page,
		{ days: servedReport(fixture, window) },
		{ byRange: true, scoped: true, delayMs: options.delayMs }
	);
	const dayCalls = serveDay(page, { entries: servedEntries(fixture, window) });
	await signInAndVisit(page, fixture, `${PAGE_PATH}/${fixture.ids.teamA}`, { scenario: options.scenario });
	return { reportCalls, dayCalls, window };
}

test.describe('Apps and URLs dashboard', () => {
	/* --------------------------------------------- 1. the mock as it is -------------------------------------------- */

	test('1 · the page as the mock serves it: its empty period, its disabled Export, the one read it sent', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await signInAndVisit(page, fixture, `${PAGE_PATH}/${fixture.ids.teamA}`);
		const keys = periodKeys();
		const periodText = await metaOf(page, keys.from, keys.to);

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(EN.sidebar.APPS_AND_URLS);
		expect(page.url()).toBe(`${APP_ORIGIN}${PAGE_PATH}/${fixture.ids.teamA}`);
		const crumbs = page.locator('nav[aria-label="breadcrumb"] a');
		await expect(crumbs).toHaveText([fixture.names.teamA, EN.sidebar.APPS_AND_URLS]);
		await expect(crumbs.nth(0)).toHaveAttribute('href', '/');
		await expect(crumbs.nth(1)).toHaveAttribute('href', `${PAGE_PATH}/${fixture.ids.teamA}`);
		await expect(metaLine(page)).toHaveText(periodText);

		// nothing was answered, so no figures band, no mosaic, no list, no day panel — only the page's own empty period
		await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
		await expect(page.getByRole('table')).toHaveCount(0);
		await expect(mosaicGroup(page)).toHaveCount(0);
		await expect(page.getByRole('heading', { name: DAY.TITLE })).toHaveCount(0);
		await expect(page.getByRole('row')).toHaveCount(0);
		await expect(page.getByText(msg('EMPTY_TITLE', { period: periodText }), { exact: true })).toHaveCount(1);
		await expect(page.getByText(msg('EMPTY_MESSAGE'), { exact: true })).toHaveCount(1);
		// the empty state's own "Previous period" button plus the picker's arrow: two, measured in `p1.log`
		await expect(page.getByRole('button', { name: EN.dashboard.period.PREVIOUS, exact: true })).toHaveCount(2);
		await expect(exportButton(page)).toBeDisabled();
		await expect(filterButton(page)).toHaveCount(1);

		// the grouping switch is in the toolbar whatever the data (`apps-urls-toolbar.tsx`, `trailingControls`)
		const tabs = page.getByRole('tablist', { name: A.VIEW_LABEL }).getByRole('tab');
		await expect(tabs).toHaveText([A.VIEW_DATE, A.VIEW_EMPLOYEE, A.VIEW_PROJECT, A.VIEW_APPLICATION]);
		await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

		// the one read the page made, and every parameter it carries (`mock-gauzy-server.mjs` answered it)
		const reads = await mock.calls('/api/timesheet/activity/report');
		expect(reads.length, 'the page read the report at least once').toBeGreaterThanOrEqual(1);
		expect(reads[0].status).toBe(200);
		const paths = await mock.paths();
		expect(
			paths.filter((path) => path === '/api/timesheet/activity'),
			'the day list is never read while there is no day panel'
		).toEqual([]);
		const params = new URLSearchParams(reads[0].query);
		expect(params.get('organizationId')).toBe(fixture.ids.organizationA);
		expect(params.get('tenantId')).toBe(fixture.ids.tenantA);
		expect(params.get('startDate')).toBe(keys.from);
		expect(params.get('endDate')).toBe(keys.to);
		expect(params.get('groupBy')).toBe('date');
		expect(params.get('shape'), 'the page asks only for the lean shape').toBe('lean');
		expect(params.get('logType[0]')).toBe('TRACKED');
		expect(params.get('activityLevel[start]')).toBe('0');
		expect(params.get('activityLevel[end]')).toBe('100');
		expect([...params.keys()].filter((key) => key.startsWith('employeeIds'))).toEqual([]);

		expect(await page.evaluate(() => window.localStorage.getItem('group-by-type'))).toBeNull();
		expect(consoleFindings(shield), 'the empty page printed a console error').toEqual([]);
		expect(shield.pageErrors(), 'the empty page threw').toEqual([]);

		report('1 empty page', {
			periodText,
			reads: reads.length,
			query: reads[0].query,
			emptyTitle: msg('EMPTY_TITLE', { period: periodText }),
			previousButtons: await page.getByRole('button', { name: EN.dashboard.period.PREVIOUS, exact: true }).count()
		});
	});

	/* -------------------------------------- 2. the figures band and the mosaic ------------------------------------- */

	test('2 · a served period: its figures, the split of the time, the mosaic of every app and site', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls, dayCalls } = await openPage(page, fixture);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		await expect.poll(() => dayCalls.length, { timeout: 40_000 }).toBeGreaterThan(0);
		const notes = await texts(sectionOf(page, A.TIME_LABEL).locator('p'));

		// three section titles only (`pE.log` e1 h2)
		await expect(page.getByRole('heading', { level: 2 })).toHaveText([A.TIME_LABEL, DAY.TITLE, A.DETAIL_DATE]);
		await expect(page.getByRole('heading', { name: A.TIME_LABEL })).toHaveCount(1);
		await expect(page.getByRole('heading', { name: DAY.TITLE })).toHaveCount(1);

		// the band's own paragraph: the total, then `{titles} · {members} ({average}) · {days}` (`pE.log` e1 notes)
		expect(notes[0]).toBe(
			`3h 20m${msg('TOTAL_META_WITH_AVERAGE', {
				titles: titleCount(5),
				members: memberCount(3),
				average: msg('MEMBERS_HINT', { duration: '1h 6m' }),
				days: dayCount(2)
			})}`
		);
		expect(notes[1]).toBe(A.SPLIT_NOTE);
		expect(notes[2]).toBe(A.MOSAIC_HINT);

		// three leaders and one "Everything else" (`LEADING_TITLE_COUNT = 3`, `apps-urls.ts:312`)
		await expectTexts(
			() => splitLegend(page),
			['VS Code1h 5m33%', 'Chrome1h 0m30%', 'Slack0h 35m18%', `${A.SPLIT_REST}0h 40m20%`]
		);

		// every title keeps a named tile, none pressed; the order is the mosaic's reading order, not the ranking
		await expect(mosaicTiles(page)).toHaveCount(5);
		await expectValues(
			() => attrs(mosaicTiles(page), 'aria-label'),
			[
				msg('MOSAIC_TILE_LABEL', { name: 'VS Code', duration: '1h 5m', share: '33%' }),
				msg('MOSAIC_TILE_LABEL', { name: 'Chrome', duration: '1h 0m', share: '30%' }),
				msg('MOSAIC_TILE_LABEL', { name: 'Slack', duration: '0h 35m', share: '18%' }),
				msg('MOSAIC_TILE_LABEL', { name: 'github.com', duration: '0h 15m', share: '8%' }),
				msg('MOSAIC_TILE_LABEL', { name: 'Figma', duration: '0h 25m', share: '13%' })
			]
		);
		await expectValues(
			() => attrs(mosaicTiles(page), 'aria-pressed'),
			['false', 'false', 'false', 'false', 'false']
		);

		await expect(exportButton(page)).toBeEnabled();
		expect(rangesOf(reportCalls)).toEqual([`${periodKeys().from}..${periodKeys().to}`]);
		expect(dayCalls.length, 'one day panel, one day read').toBe(1);

		// the keys only `apps-urls-summary.tsx` reads are nowhere on the page (finding 16)
		const absent = {
			figuresLabel: await page.getByText(A.FIGURES_LABEL, { exact: true }).count(),
			shareTitle: await page.getByText(A.SHARE_TITLE, { exact: true }).count(),
			timeHint: await page.getByText(msg('TIME_HINT', { count: 2 }), { exact: true }).count()
		};
		expect(absent.figuresLabel).toBe(0);
		expect(absent.shareTitle).toBe(0);
		expect(absent.timeHint).toBe(0);

		expect(consoleFindings(shield), 'the served page printed a console error').toEqual([]);

		report('2 figures', {
			notes,
			legend: await splitLegend(page),
			tiles: await attrs(mosaicTiles(page), 'aria-label'),
			absent,
			dayRanges: rangesOf(dayCalls)
		});
	});

	/* ------------------------------------------- 3. picking a mosaic tile ------------------------------------------- */

	test('3 · picking a tile narrows the list and names itself as a filter, and reads nothing', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls } = await openPage(page, fixture);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		const newerLabel = await dayLabelOf(page, dayKey(-1));
		const olderLabel = await dayLabelOf(page, dayKey(-2));
		const bandNotes = await texts(sectionOf(page, A.TIME_LABEL).locator('p'));
		const tile = mosaicTiles(page).first();
		await expect(tile).toHaveAttribute(
			'aria-label',
			msg('MOSAIC_TILE_LABEL', { name: 'VS Code', duration: '1h 5m', share: '33%' })
		);

		await tile.click();
		await expect(mosaicTiles(page).nth(0)).toHaveAttribute('aria-pressed', 'true');
		await expect(mosaicTiles(page).nth(1)).toHaveAttribute('aria-pressed', 'false');
		await expectTexts(() => chipTexts(page), [`${A.COLUMN_TITLE}:VS Code`]);
		await expect(page.getByRole('button', { name: removeOf('VS Code'), exact: true })).toHaveCount(1);

		// the group shares are re-worked on the narrowed rows and the list's totals follow them; the band above
		// keeps the whole period's 3h 20m and the same legend (finding 11, `pD.log` d2, `pB.log` b1)
		await expectTexts(
			() => groupRows(page),
			[
				`${newerLabel}${titleCount(1)}${memberCount(1)}${projectCount(1)}31%0h 20m`,
				`${olderLabel}${titleCount(1)}${memberCount(1)}${projectCount(1)}69%0h 45m`
			]
		);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(1)}${projectCount(2)}1h 5m`]);
		await expectTexts(() => texts(sectionOf(page, A.TIME_LABEL).locator('p')), bandNotes);
		await expectTexts(
			() => splitLegend(page),
			['VS Code1h 5m33%', 'Chrome1h 0m30%', 'Slack0h 35m18%', `${A.SPLIT_REST}0h 40m20%`]
		);
		await expect(exportButton(page)).toBeEnabled();

		expect(reportCalls.length, 'a picked tile is applied to the rows already loaded').toBe(1);
		expect(membersOf(reportCalls), 'a picked tile is never sent as a member filter').toEqual(['']);

		await tile.click();
		await expectValues(
			() => attrs(mosaicTiles(page), 'aria-pressed'),
			['false', 'false', 'false', 'false', 'false']
		);
		await expectTexts(() => chipTexts(page), []);
		await expectTexts(
			() => groupRows(page),
			[
				`${newerLabel}${titleCount(4)}${memberCount(2)}${projectCount(3)}50%1h 40m`,
				`${olderLabel}${titleCount(4)}${memberCount(2)}${projectCount(2)}50%1h 40m`
			]
		);
		expect(consoleFindings(shield), 'picking a tile printed a console error').toEqual([]);

		report('3 picked tile', {
			chip: await chipTexts(page),
			groups: await groupRows(page),
			lines: await lineTexts(page),
			reads: reportCalls.length
		});
	});

	/* ---------------------------------------------- 4. the ranked list ---------------------------------------------- */

	test('4 · the ranked list as a table: its label, its columns, its groups, its lines, its totals', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls } = await openPage(page, fixture);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		const newerLabel = await dayLabelOf(page, dayKey(-1));
		const olderLabel = await dayLabelOf(page, dayKey(-2));
		const mgr = `${plateOf(fixture.names.user)}${fixture.names.user}`;
		const mate = `${plateOf(fixture.names.teammate)}${fixture.names.teammate}`;
		const outsider = `${plateOf(OUTSIDER_NAME)}${OUTSIDER_NAME}`;

		await expect(page.getByRole('table')).toHaveCount(1);
		await expect(page.getByRole('table')).toHaveAccessibleName(A.DETAIL_DATE);
		await expect(page.getByRole('columnheader')).toHaveCount(6);
		await expect(page.getByRole('columnheader')).toHaveText([
			'#',
			A.COLUMN_DATE,
			A.COLUMN_MEMBER,
			A.COLUMN_PROJECT_NAME,
			A.COLUMN_SHARE,
			A.COLUMN_TIME
		]);
		// only the name column and the time column hold a sort button (`SortHeader`, `ListHeader`)
		await expectValues(
			() => attrs(page.getByRole('columnheader'), 'aria-sort'),
			[null, 'none', null, null, null, 'none']
		);

		// no rank on a day group (`showsGroupRankIn('date')` is false) and the group's own counts
		await expectTexts(() => groupToggles(page), [`${newerLabel}${titleCount(4)}`, `${olderLabel}${titleCount(4)}`]);
		await expectTexts(
			() => groupRows(page),
			[
				`${newerLabel}${titleCount(4)}${memberCount(2)}${projectCount(3)}50%1h 40m`,
				`${olderLabel}${titleCount(4)}${memberCount(2)}${projectCount(2)}50%1h 40m`
			]
		);
		// each group opens onto its lines, ranked within the group (`lineRankOf`), newest day first
		await expectTexts(
			() => lineTexts(page),
			[
				`1Chrome${mgr}Project au-project-150%0h 50m`,
				`2Figma${mgr}Project au-project-225%0h 25m`,
				`3VS Code${mgr}Project au-project-220%0h 20m`,
				`4Slack${outsider}${A.NO_PROJECT}5%0h 5m`,
				`1VS Code${mgr}Project au-project-145%0h 45m`,
				`2Slack${mate}Project au-project-130%0h 30m`,
				`3github.com${mgr}${A.NO_PROJECT}15%0h 15m`,
				`4Chrome${mgr}Project au-project-110%0h 10m`
			]
		);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);

		expect(reportCalls.length).toBe(1);
		expect(consoleFindings(shield), 'the list printed a console error').toEqual([]);

		report('4 list', {
			groups: await groupRows(page),
			lines: await lineTexts(page),
			totals: await totalsRow(page)
		});
	});

	/* ------------------------------------------------ 5. the grouping ----------------------------------------------- */

	test('5 · the grouping switch: what each view prints, and that switching it reads nothing', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls } = await openPage(page, fixture);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		const newerLabel = await dayLabelOf(page, dayKey(-1));
		const olderLabel = await dayLabelOf(page, dayKey(-2));
		const mgr = `${plateOf(fixture.names.user)}${fixture.names.user}`;
		const mate = `${plateOf(fixture.names.teammate)}${fixture.names.teammate}`;
		const outsider = `${plateOf(OUTSIDER_NAME)}${OUTSIDER_NAME}`;
		const tabs = page.getByRole('tablist', { name: A.VIEW_LABEL }).getByRole('tab');
		const viewLineTexts: Record<string, string[]> = {};

		await page.getByRole('tab', { name: A.VIEW_APPLICATION, exact: true }).click();
		await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
		await expect(page.getByRole('table')).toHaveAccessibleName(A.DETAIL_APPLICATION);
		await expect(page.getByRole('columnheader')).toHaveText([
			'#',
			A.COLUMN_APPLICATION,
			A.COLUMN_MEMBER,
			A.COLUMN_PROJECT_NAME,
			A.COLUMN_SHARE,
			A.COLUMN_TIME
		]);
		// an app group counts its days, not its titles (`groupMetaOf`, `apps-urls-ranked-list.tsx:99-104`)
		await expectTexts(
			() => groupToggles(page),
			['VS Code2 days', 'Chrome2 days', 'Slack2 days', 'Figma1 day', 'github.com1 day']
		);
		await expectTexts(
			() => groupRows(page),
			[
				`1VS Code${msg('DAY_COUNT', { count: 2 })}${memberCount(1)}${projectCount(2)}33%1h 5m`,
				`2Chrome${msg('DAY_COUNT', { count: 2 })}${memberCount(1)}${projectCount(1)}30%1h 0m`,
				`3Slack${msg('DAY_COUNT', { count: 2 })}${memberCount(2)}${projectCount(2)}18%0h 35m`,
				`4Figma${msg('DAY_COUNT', { count: 1 })}${memberCount(1)}${projectCount(1)}13%0h 25m`,
				`5github.com${msg('DAY_COUNT', { count: 1 })}${memberCount(1)}${projectCount(1)}8%0h 15m`
			]
		);
		// a line of an app group is a day, and carries no rank (`showsLineRankIn('application')` is false)
		viewLineTexts[A.VIEW_APPLICATION] = await lineTexts(page);
		expect(viewLineTexts[A.VIEW_APPLICATION]).toEqual([
			`${newerLabel}${mgr}Project au-project-231%0h 20m`,
			`${olderLabel}${mgr}Project au-project-169%0h 45m`,
			`${newerLabel}${mgr}Project au-project-183%0h 50m`,
			`${olderLabel}${mgr}Project au-project-117%0h 10m`,
			`${newerLabel}${outsider}${A.NO_PROJECT}14%0h 5m`,
			`${olderLabel}${mate}Project au-project-186%0h 30m`,
			`${newerLabel}${mgr}Project au-project-2100%0h 25m`,
			`${olderLabel}${mgr}${A.NO_PROJECT}100%0h 15m`
		]);
		await expectTexts(() => totalsRow(page), [`${titleCount(5)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		expect(await page.evaluate(() => window.localStorage.getItem('group-by-type'))).toBe('"application"');

		await page.getByRole('tab', { name: A.VIEW_EMPLOYEE, exact: true }).click();
		// no Member column once the groups themselves are members (`VIEW_COLUMNS`, `apps-urls.ts:29-45`)
		await expect(page.getByRole('columnheader')).toHaveText([
			'#',
			A.COLUMN_EMPLOYEE,
			A.COLUMN_PROJECT_NAME,
			A.COLUMN_SHARE,
			A.COLUMN_TIME
		]);
		await expectTexts(
			() => groupToggles(page),
			[`${mgr}${titleCount(4)}`, `${mate}${titleCount(1)}`, `${outsider}${titleCount(1)}`]
		);
		await expectTexts(
			() => groupRows(page),
			[
				`1${mgr}${titleCount(4)}${projectCount(3)}83%2h 45m`,
				`2${mate}${titleCount(1)}${projectCount(1)}15%0h 30m`,
				`3${outsider}${titleCount(1)}${projectCount(1)}3%0h 5m`
			]
		);
		viewLineTexts[A.VIEW_EMPLOYEE] = await lineTexts(page);
		expect(viewLineTexts[A.VIEW_EMPLOYEE]).toEqual([
			`1ChromeProject au-project-136%1h 0m`,
			`2VS CodeProject au-project-127%0h 45m`,
			`3FigmaProject au-project-215%0h 25m`,
			`4VS CodeProject au-project-212%0h 20m`,
			`5github.com${A.NO_PROJECT}9%0h 15m`,
			`1SlackProject au-project-1100%0h 30m`,
			`1Slack${A.NO_PROJECT}100%0h 5m`
		]);
		expect(await page.evaluate(() => window.localStorage.getItem('group-by-type'))).toBe('"employee"');

		await page.getByRole('tab', { name: A.VIEW_PROJECT, exact: true }).click();
		await expect(page.getByRole('table')).toHaveAccessibleName(A.DETAIL_PROJECT);
		await expectTexts(
			() => groupToggles(page),
			[
				'Project au-project-13 apps and sites',
				'Project au-project-22 apps and sites',
				`${A.NO_PROJECT}2 apps and sites`
			]
		);
		viewLineTexts[A.VIEW_PROJECT] = await lineTexts(page);
		expect(viewLineTexts[A.VIEW_PROJECT]).toEqual([
			`1Chrome${mgr}44%1h 0m`,
			`2VS Code${mgr}33%0h 45m`,
			`3Slack${mate}22%0h 30m`,
			`1Figma${mgr}56%0h 25m`,
			`2VS Code${mgr}44%0h 20m`,
			`1github.com${mgr}75%0h 15m`,
			`2Slack${outsider}25%0h 5m`
		]);
		await expectTexts(() => totalsRow(page), [`${projectCount(3)}${memberCount(3)}3h 20m`]);
		expect(await page.evaluate(() => window.localStorage.getItem('group-by-type'))).toBe('"project"');

		await page.getByRole('tab', { name: A.VIEW_DATE, exact: true }).click();
		await expect(page.getByRole('table')).toHaveAccessibleName(A.DETAIL_DATE);
		await expectTexts(() => groupToggles(page), [`${newerLabel}${titleCount(4)}`, `${olderLabel}${titleCount(4)}`]);
		expect(await page.evaluate(() => window.localStorage.getItem('group-by-type'))).toBe('"date"');

		// finding 1: four views, no new read, and `groupBy` never left `date`
		expect(reportCalls.length, 'switching the grouping read the report again').toBe(1);
		expect([...new Set(reportCalls.map((call) => call.params.get('groupBy')))]).toEqual(['date']);
		expect(consoleFindings(shield), 'switching the grouping printed a console error').toEqual([]);

		report('5 grouping', {
			reads: reportCalls.length,
			groupBys: [...new Set(reportCalls.map((call) => call.params.get('groupBy')))],
			lines: viewLineTexts
		});
	});

	/* -------------------------------------------- 6. sorting and expanding ------------------------------------------ */

	test('6 · the sort cycle on both sortable columns, then collapse all and expand all', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls } = await openPage(page, fixture);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		const newerLabel = await dayLabelOf(page, dayKey(-1));
		const olderLabel = await dayLabelOf(page, dayKey(-2));
		const olderGroup = `${olderLabel}${titleCount(4)}`;
		const newerGroup = `${newerLabel}${titleCount(4)}`;
		const sortAttribute = async () => attrs(page.getByRole('columnheader'), 'aria-sort');

		const nameHeader = page.getByRole('columnheader').filter({ hasText: A.COLUMN_DATE });
		await nameHeader.locator('button').click();
		await expectValues(sortAttribute, [null, 'ascending', null, null, null, 'none']);
		await expectTexts(() => groupToggles(page), [olderGroup, newerGroup]);
		await nameHeader.locator('button').click();
		await expectValues(sortAttribute, [null, 'descending', null, null, null, 'none']);
		await expectTexts(() => groupToggles(page), [newerGroup, olderGroup]);
		await nameHeader.locator('button').click();
		await expectValues(sortAttribute, [null, 'none', null, null, null, 'none']);
		await expectTexts(() => groupToggles(page), [newerGroup, olderGroup]);

		// both served days hold 1h 40m, so only `aria-sort` moves on the time column, and dropping the sort returns
		// the natural newest-first order (`pD.log` d2 sort Time: Monday, Monday, then Tuesday first)
		const timeHeader = page.getByRole('columnheader').filter({ hasText: A.COLUMN_TIME });
		const timeCycle: Array<[string, string[]]> = [
			['descending', [olderGroup, newerGroup]],
			['ascending', [olderGroup, newerGroup]],
			['none', [newerGroup, olderGroup]]
		];
		for (const [expected, expectedGroups] of timeCycle) {
			await timeHeader.locator('button').click();
			await expectValues(() => sortAttribute().then((list) => [list[5]]), [expected]);
			await expectTexts(() => groupToggles(page), expectedGroups);
		}

		// two groups, both open: under `LEADING_OPEN_COUNT` 5 every group opens (`apps-urls-list-controls.tsx:12`)
		await expect(page.getByRole('button', { name: A.COLLAPSE_ALL, exact: true })).toHaveCount(1);
		await expect(page.getByRole('button', { name: A.EXPAND_ALL, exact: true })).toHaveCount(0);
		await expectValues(() => groupAria(page), ['true', 'true']);
		await expectCount(() => lineTexts(page), 8);

		await page.getByRole('button', { name: A.COLLAPSE_ALL, exact: true }).click();
		await expect(page.getByRole('button', { name: A.EXPAND_ALL, exact: true })).toHaveCount(1);
		await expectValues(() => groupAria(page), ['false', 'false']);
		await expectCount(() => lineTexts(page), 0);

		await page.getByRole('button', { name: A.EXPAND_ALL, exact: true }).click();
		await expectValues(() => groupAria(page), ['true', 'true']);
		await expectCount(() => lineTexts(page), 8);

		expect(reportCalls.length, 'sorting and expanding read nothing').toBe(1);
		expect(consoleFindings(shield), 'sorting printed a console error').toEqual([]);

		report('6 sort', { groups: await groupToggles(page), lines: await lineTexts(page) });
	});

	/* ------------------------------------------------- 7. the period ------------------------------------------------ */

	test('7 · the period stepper: the range it sends, the empty period it can reach, the bar while it reads', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls } = await openPage(page, fixture, { delayMs: 1200 });
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		const keys = periodKeys();
		await expect(metaLine(page)).toHaveText(await metaOf(page, keys.from, keys.to));
		await expect(updatingBar(page)).toHaveCount(0);

		await periodGroup(page).getByRole('button', { name: EN.dashboard.period.PREVIOUS, exact: true }).click();
		await expect(updatingBar(page)).toHaveCount(1); // `isUpdating`: a period that already has figures re-reads
		const shifted = { from: dayKey(-13), to: dayKey(-7) }; // `shiftPeriod` by the period's own length (7 days)
		await expect(metaLine(page)).toHaveText(await metaOf(page, shifted.from, shifted.to), { timeout: 20_000 });
		await expect.poll(() => rangesOf(reportCalls), { timeout: 20_000 }).toContain(`${shifted.from}..${shifted.to}`);
		await expect(updatingBar(page)).toHaveCount(0);

		// nothing was answered for that week, so no figures band at all, only the page's own empty period
		await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
		await expect(page.getByRole('table')).toHaveCount(0);
		await expect(mosaicGroup(page)).toHaveCount(0);
		await expect(page.getByRole('heading', { name: DAY.TITLE })).toHaveCount(0);
		await expect(
			page.getByText(msg('EMPTY_TITLE', { period: await metaOf(page, shifted.from, shifted.to) }), {
				exact: true
			})
		).toHaveCount(1);
		await expect(exportButton(page)).toBeDisabled();

		await periodGroup(page).getByRole('button', { name: EN.dashboard.period.NEXT, exact: true }).click();
		await expect(metaLine(page)).toHaveText(await metaOf(page, keys.from, keys.to), { timeout: 20_000 });
		await expectCount(() => groupRows(page), 2, { timeout: 20_000 });
		await expect(exportButton(page)).toBeEnabled();

		// the preset rows carry their own dates and the active one says Selected (`pC.log` c1)
		await periodTrigger(page).click();
		const presetRow = page
			.locator('[role="dialog"] button, [data-slot="popover-content"] button')
			.filter({ hasText: EN.common.FILTER_LAST_7_DAYS });
		await expect(presetRow).toHaveCount(1);
		expect((await texts(presetRow))[0]).toContain(await metaOf(page, keys.from, keys.to));
		await page.keyboard.press('Escape');
		await expect(periodTrigger(page)).toBeVisible();

		expect(consoleFindings(shield), 'the stepper printed a console error').toEqual([]);
		report('7 period', {
			ranges: rangesOf(reportCalls),
			preset: await texts(presetRow),
			shiftedMeta: await metaOf(page, shifted.from, shifted.to)
		});
	});

	/* --------------------------------------------- 8. a custom range of days ------------------------------------------ */

	test('8 · a custom range picked in the calendar: its dates in the meta line, in the read and in the rows', async ({
		page,
		fixture,
		shield
	}) => {
		const window = customWindowOf(periodKeys().from);
		const { reportCalls, dayCalls } = await openPage(page, fixture, { window, delayMs: 1200 });
		// the page opens on its own seven days; the window this file also served is only asked for later
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		const keys = periodKeys();
		const windowMeta = await metaOf(page, window.from, window.to);
		const innerToLabel = await dayLabelOf(page, window.innerTo);
		const innerFromLabel = await dayLabelOf(page, window.innerFrom);
		const mate = `${plateOf(fixture.names.teammate)}${fixture.names.teammate}`;
		const mgr = `${plateOf(fixture.names.user)}${fixture.names.user}`;

		await periodTrigger(page).click();
		const grid = page.getByRole('grid').first();
		await expect(grid).toHaveCount(1);
		// a day inside 7…22 of the month the calendar opened on: never an outside day, so exactly one button each
		await grid
			.locator('button')
			.filter({ hasText: new RegExp(`^${window.fromDay}$`) })
			.first()
			.click();
		// one click is only a draft: nothing is sent until the range has both ends (`period-picker.tsx`)
		await expect(updatingBar(page)).toHaveCount(0);
		await expect(metaLine(page)).toHaveText(await metaOf(page, keys.from, keys.to));
		expect(rangesOf(reportCalls)).toEqual([`${keys.from}..${keys.to}`]);

		await grid
			.locator('button')
			.filter({ hasText: new RegExp(`^${window.toDay}$`) })
			.first()
			.click();
		await expect(updatingBar(page)).toHaveCount(1);
		await expect(metaLine(page)).toHaveText(windowMeta, { timeout: 20_000 });
		await expect.poll(() => rangesOf(reportCalls), { timeout: 20_000 }).toContain(`${window.from}..${window.to}`);
		await expect(updatingBar(page)).toHaveCount(0);

		// the asked range is what the next read carried, and the window holds only the two days that sit in it
		expect(reportCalls.at(-1)?.params.get('startDate')).toBe(window.from);
		expect(reportCalls.at(-1)?.params.get('endDate')).toBe(window.to);
		await expectTexts(
			() => groupToggles(page),
			[`${innerToLabel}${titleCount(2)}`, `${innerFromLabel}${titleCount(1)}`]
		);
		await expectTexts(
			() => groupRows(page),
			[
				`${innerToLabel}${titleCount(2)}${memberCount(1)}${projectCount(1)}52%0h 26m`,
				`${innerFromLabel}${titleCount(1)}${memberCount(1)}${projectCount(1)}48%0h 25m`
			]
		);
		await expectTexts(
			() => lineTexts(page),
			[
				`1VS Code${mate}Project au-project-263%0h 16m`,
				`2github.com${mate}Project au-project-238%0h 10m`,
				`1Slack${mgr}${A.NO_PROJECT}100%0h 25m`
			]
		);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(2)}${projectCount(2)}0h 51m`]);
		await expectTexts(() => splitLegend(page), ['Slack0h 25m48%', 'VS Code0h 16m32%', 'github.com0h 10m19%']);
		await expect(mosaicTiles(page)).toHaveCount(3);
		await expect(exportButton(page)).toBeEnabled();

		// the day panel followed the new range: its day is inside it, and it re-read exactly that day
		await expect(page.getByRole('heading', { name: DAY.TITLE })).toHaveCount(1);
		await expect(sectionHead(page, DAY.TITLE)).toHaveText([
			`${fixture.names.user} · ${await dayShortOf(page, window.innerFrom)} · 0h 25m`
		]);
		await expectValues(() => attrs(dayHourButtons(page), 'aria-label'), [hourToggle('12 PM', '0h 25m', 1)]);
		await expect
			.poll(() => rangesOf(dayCalls), { timeout: 20_000 })
			.toContain(await dayWindowOf(page, window.innerFrom));

		expect(consoleFindings(shield), 'the calendar printed a console error').toEqual([]);
		report('8 custom range', {
			window: `${window.from}..${window.to}`,
			meta: windowMeta,
			ranges: rangesOf(reportCalls),
			dayRanges: rangesOf(dayCalls),
			groups: await groupRows(page)
		});
	});

	/* ----------------------------------------------- 9. member filter ------------------------------------------------ */

	test('9 · the member filter: the menu it opens, the query it changes, its chip, removing it and Clear', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls } = await openPage(page, fixture);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		const keys = periodKeys();
		const olderLabel = await dayLabelOf(page, dayKey(-2));
		const newerLabel = await dayLabelOf(page, dayKey(-1));

		const openFilter = async () => {
			await filterButton(page).click();
			await page.getByRole('menuitem', { name: EN.common.MEMBERS, exact: true }).click();
		};
		const closeFilter = async () => {
			await page.keyboard.press('Escape');
			await page.keyboard.press('Escape');
		};

		await filterButton(page).click();
		await expect(page.getByRole('menuitem', { name: EN.common.MEMBERS, exact: true })).toHaveCount(1);
		await page.getByRole('menuitem', { name: EN.common.MEMBERS, exact: true }).click();
		// the team's members *and* anyone the report answered with, each named by the single letter of its own
		// initials (`initialOf`, `usage-cells.tsx:16-19`); the letter and the name are separate spans with no text
		// node between them, so the element's own text carries no space (`pG2.log` g1 filter menu)
		await expectTexts(
			() => texts(page.getByRole('menuitemcheckbox')),
			[
				`${faceOf(OUTSIDER_NAME)}${OUTSIDER_NAME}`,
				`${faceOf(fixture.names.user)}${fixture.names.user}`,
				`${faceOf(fixture.names.denied)}${fixture.names.denied}`,
				`${faceOf(fixture.names.teammate)}${fixture.names.teammate}`
			]
		);
		const filterMenu = await texts(page.getByRole('menuitemcheckbox'));

		await page.getByRole('menuitemcheckbox', { name: fixture.names.teammate }).click();
		await closeFilter();
		const removeMate = removeOf(fixture.names.teammate);
		await expect(page.getByRole('button', { name: removeMate, exact: true })).toHaveCount(1);
		await expectTexts(
			() => chipTexts(page),
			[`${A.APPLIED_MEMBER}:${faceOf(fixture.names.teammate)}${fixture.names.teammate}`]
		);
		await expect(clearButton(page)).toHaveCount(1);

		// the filter went into the query as `employeeIds[0]`, and the answer this file gave narrowed with it
		await expect.poll(() => membersOf(reportCalls).at(-1), { timeout: 20_000 }).toBe(fixture.ids.teammateEmployee);
		expect(reportCalls.length, 'applying a member reads again').toBe(2);
		const filteredNote = `0h 30m${msg('TOTAL_META', { titles: titleCount(1), members: memberCount(1), days: dayCount(1) })}`;
		await expect
			.poll(() => texts(sectionOf(page, A.TIME_LABEL).locator('p')).then((list) => list[0] ?? ''), {
				timeout: 20_000
			})
			.toBe(filteredNote);
		await expectTexts(
			() => groupRows(page),
			[`${olderLabel}${titleCount(1)}${memberCount(1)}${projectCount(1)}100%0h 30m`]
		);
		await expect(mosaicTiles(page)).toHaveCount(1);
		await expect(mosaicTiles(page)).toHaveAttribute(
			'aria-label',
			msg('MOSAIC_TILE_LABEL', { name: 'Slack', duration: '0h 30m', share: '100%' })
		);
		// the panel follows the filter, and its entries answer nothing for that member on that day
		await expect(sectionHead(page, DAY.TITLE)).toHaveText([
			`${fixture.names.teammate} · ${await dayShortOf(page, dayKey(-2))}`
		]);
		await expect(exportButton(page)).toBeEnabled();

		await page.getByRole('button', { name: removeMate, exact: true }).click();
		await expectTexts(() => chipTexts(page), []);
		await expectCount(() => groupRows(page), 2, { timeout: 20_000 });
		await expect.poll(async () => (await groupRows(page))[0] ?? '', { timeout: 20_000 }).toContain(newerLabel);
		expect(reportCalls.length, 'removing the filter reused the cached unfiltered answer').toBe(2);

		// two members at once: two chips, two ids in the query, the whole period back
		await openFilter();
		await page.getByRole('menuitemcheckbox', { name: fixture.names.teammate }).click();
		await page.getByRole('menuitemcheckbox', { name: fixture.names.user }).click();
		await closeFilter();
		await expect
			.poll(() => (membersOf(reportCalls).at(-1) ?? '').split('+').sort(), { timeout: 20_000 })
			.toEqual([fixture.ids.employee, fixture.ids.teammateEmployee].sort());
		await expectTexts(
			() => chipTexts(page),
			[
				`${A.APPLIED_MEMBER}:${faceOf(fixture.names.teammate)}${fixture.names.teammate}`,
				`${A.APPLIED_MEMBER}:${faceOf(fixture.names.user)}${fixture.names.user}`
			]
		);
		await expectCount(() => groupRows(page), 2, { timeout: 20_000 });

		await page.getByRole('button', { name: EN.common.CLEAR_FILTERS, exact: true }).first().click();
		await expectTexts(() => chipTexts(page), []);
		await expectCount(() => groupRows(page), 2, { timeout: 20_000 });

		// a person who is only in the report is filterable too
		await openFilter();
		await page.getByRole('menuitemcheckbox', { name: OUTSIDER_NAME }).click();
		await closeFilter();
		await expect.poll(() => membersOf(reportCalls).at(-1), { timeout: 20_000 }).toBe(OUTSIDER_ID);
		await expect
			.poll(() => texts(sectionOf(page, A.TIME_LABEL).locator('p')).then((list) => list[0] ?? ''), {
				timeout: 20_000
			})
			.toContain('0h 5m');
		await expectTexts(
			() => groupRows(page),
			[`${newerLabel}${titleCount(1)}${memberCount(1)}${projectCount(1)}100%0h 5m`]
		);

		// and a member with no time at all empties the list while the chip stays
		await page.getByRole('button', { name: EN.common.CLEAR_FILTERS, exact: true }).first().click();
		await expectTexts(() => chipTexts(page), []);
		await openFilter();
		await page.getByRole('menuitemcheckbox', { name: fixture.names.denied }).click();
		await closeFilter();
		await expect
			.poll(() => membersOf(reportCalls).at(-1), { timeout: 20_000 })
			.toContain(fixture.ids.deniedEmployee);
		await expect(
			page.getByText(msg('EMPTY_FILTERED_TITLE', { period: await metaOf(page, keys.from, keys.to) }), {
				exact: true
			})
		).toHaveCount(1);
		await expect(page.getByText(msg('EMPTY_FILTERED_MESSAGE'), { exact: true })).toHaveCount(1);
		await expect(page.getByRole('table')).toHaveCount(0);
		await expect(exportButton(page)).toBeDisabled();
		await expect(page.getByRole('button', { name: removeOf(fixture.names.denied), exact: true })).toHaveCount(1);

		expect(consoleFindings(shield), 'the filter printed a console error').toEqual([]);
		report('9 filter', {
			reads: reportCalls.length,
			membersAsked: membersOf(reportCalls),
			chips: await chipTexts(page),
			filterMenu: filterMenu,
			filteredNotes: filteredNote
		});
	});

	/* --------------------------------------- 10. a person the report answers only for --------------------------------- */

	test('10 · as a person the report answers only for itself: no filter, their own id in the read', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls, dayCalls } = await openPage(page, fixture, { scenario: { manager: false } });
		await expectCount(() => groupRows(page), 2, { timeout: 40_000 });
		const keys = periodKeys();
		const newerLabel = await dayLabelOf(page, dayKey(-1));
		const olderLabel = await dayLabelOf(page, dayKey(-2));

		await expect(filterButton(page)).toHaveCount(0);
		await expectTexts(() => chipTexts(page), []);
		// `requestedEmployeeIdsOf` sends the caller's own employee id for anyone outside the three roles (finding 7)
		expect(membersOf(reportCalls)).toEqual([fixture.ids.employee]);
		expect(reportCalls[0].params.get('startDate')).toBe(keys.from);
		expect(reportCalls[0].params.get('endDate')).toBe(keys.to);

		// the scoped answer held only their rows: 2h 45m, 4 titles, one member, no average line
		const notes = await texts(sectionOf(page, A.TIME_LABEL).locator('p'));
		expect(notes[0]).toBe(
			`2h 45m${msg('TOTAL_META', { titles: titleCount(4), members: memberCount(1), days: dayCount(2) })}`
		);
		await expectTexts(
			() => groupRows(page),
			[
				`${newerLabel}${titleCount(3)}${memberCount(1)}${projectCount(2)}58%1h 35m`,
				`${olderLabel}${titleCount(3)}${memberCount(1)}${projectCount(2)}42%1h 10m`
			]
		);
		await expectTexts(
			() => splitLegend(page),
			['VS Code1h 5m39%', 'Chrome1h 0m36%', 'Figma0h 25m15%', `${A.SPLIT_REST}0h 15m9%`]
		);

		// no member picker: there is no other member to pick (`canPickMember`, measured `pickerCount 0`)
		await expect(
			page.getByRole('button', { name: msg('day.MEMBER_PICKER', { name: fixture.names.user }), exact: true })
		).toHaveCount(0);
		await expect(sectionHead(page, DAY.TITLE)).toHaveText([
			`${fixture.names.user} · ${await dayShortOf(page, dayKey(-1))} · 1h 47m`
		]);
		await expect.poll(() => dayCalls.length, { timeout: 20_000 }).toBeGreaterThan(0);
		expect(dayCalls[0].params.get('employeeIds[0]')).toBe(fixture.ids.employee);
		await expect(exportButton(page)).toBeEnabled();

		expect(consoleFindings(shield), 'the page printed a console error').toEqual([]);
		report('10 employee role', {
			membersAsked: membersOf(reportCalls),
			notes: notes[0],
			groups: await groupRows(page),
			dayRanges: rangesOf(dayCalls)
		});
	});

	/* ------------------------------------------------- 11. the day panel ------------------------------------------------ */

	test('11 · the day panel: its hours, its legend, its segments, its member menu, its stepper', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls, dayCalls } = await openPage(page, fixture);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		await expect.poll(() => dayCalls.length, { timeout: 40_000 }).toBeGreaterThan(0);
		const newer = dayKey(-1);
		const older = dayKey(-2);
		const newerShort = await dayShortOf(page, newer);
		const olderShort = await dayShortOf(page, older);
		const day = daySection(page);

		await expect(page.getByRole('heading', { name: DAY.TITLE })).toHaveCount(1);
		// the panel opens on the viewer's own newest day the report says they were in, with their own time only
		await expect(sectionHead(page, DAY.TITLE)).toHaveText([`${fixture.names.user} · ${newerShort} · 1h 47m`]);
		const pickerName = msg('day.MEMBER_PICKER', { name: fixture.names.user });
		await expect(page.getByRole('button', { name: pickerName, exact: true })).toHaveCount(1);

		await expectValues(
			() => attrs(dayHourButtons(page), 'aria-label'),
			[
				hourToggle('9 AM', '0h 30m', 1),
				hourToggle('10 AM', '0h 45m', 1),
				hourToggle('2 PM', '0h 15m', 1),
				hourToggle('3 PM', '0h 10m', 1),
				hourToggle('4 PM', '0h 7m', 2)
			]
		);
		// the five longest have their own legend row, so an "other" row appears only from the sixth on
		// (`SHOWN_APPS = 5`, `app-activity.ts:8`); measured with six entries in `pB.log` b3, which does add one
		await expectTexts(() => dayLegend(page), ['42%VS Code', '37%Chrome', '14%Slack', '5%Figma', '2%Zoom']);
		await expectValues(
			() => daySegments(page),
			[
				segmentLabel('9:00 AM', '9:30 AM', 'Chrome', '0h 30m'),
				segmentLabel('10:30 AM', '11:15 AM', 'VS Code', '0h 45m'),
				segmentLabel('2:05 PM', '2:20 PM', 'Slack', '0h 15m'),
				segmentLabel('3:30 PM', '3:40 PM', 'Chrome', '0h 10m'),
				segmentLabel('4:10 PM', '4:15 PM', 'Figma', '0h 5m'),
				segmentLabel('4:40 PM', '4:42 PM', 'Zoom', '0h 2m')
			]
		);

		// an hour opens its own rows inside the same list item: opening it adds a second `ul` to the panel, so
		// the list item itself is the thing to hold onto (`pG2.log` g1 hour opened, g1 uls in the day section)
		const fourth = page.getByRole('listitem').filter({ hasText: 'Figma, Zoom' });
		await dayHourButtons(page).filter({ hasText: /4 PM/ }).click();
		await expect(fourth).toHaveText(['4 PMFigma, Zoom0h 7m71%Figma0h 5m29%Zoom0h 2m']);
		await page.keyboard.press('Escape');

		// the picker lists the members the report answered with, not the team's (finding 5, `pF.log`)
		await page.getByRole('button', { name: pickerName, exact: true }).click();
		// the panel offers the members the report answered with, not the team's, each with the two initials of
		// its plate, and the member already picked carries a screen-reader-only "Selected" mark
		// (`selected-mark.tsx:19`), which is in the element's text but not on screen (`pG2.log` g1 day menu)
		await expectTexts(
			() => texts(page.getByRole('menuitem')),
			[
				`${plateOf(fixture.names.user)}${fixture.names.user}${EN.common.SELECTED}`,
				`${plateOf(fixture.names.teammate)}${fixture.names.teammate}`,
				`${plateOf(OUTSIDER_NAME)}${OUTSIDER_NAME}`
			]
		);
		const dayMenu = await texts(page.getByRole('menuitem'));
		await expect(page.getByRole('menuitem', { name: fixture.names.denied })).toHaveCount(0);
		await page.getByRole('menuitem', { name: OUTSIDER_NAME }).click();
		await expect(sectionHead(page, DAY.TITLE)).toHaveText([`${OUTSIDER_NAME} · ${newerShort} · 0h 5m`], {
			timeout: 20_000
		});
		await expectValues(() => attrs(dayHourButtons(page), 'aria-label'), [hourToggle('5 PM', '0h 5m', 1)]);
		expect(reportCalls.length, 'picking a member in the day panel reads no report').toBe(1);
		expect(dayCalls.at(-1)?.params.get('employeeIds[0]')).toBe(OUTSIDER_ID);

		// back to the viewer, then one day back: the report says they were there, the entries answer nothing
		await page
			.getByRole('button', { name: msg('day.MEMBER_PICKER', { name: OUTSIDER_NAME }), exact: true })
			.click();
		await page.getByRole('menuitem', { name: fixture.names.user }).click();
		await expect(sectionHead(page, DAY.TITLE)).toHaveText([`${fixture.names.user} · ${newerShort} · 1h 47m`], {
			timeout: 20_000
		});
		await page.getByRole('button', { name: DAY.PREVIOUS_DAY }).click();
		await expect(sectionHead(page, DAY.TITLE)).toHaveText([`${fixture.names.user} · ${olderShort}`], {
			timeout: 20_000
		});
		await expect(
			day.getByText(msg('day.EMPTY_TITLE', { name: fixture.names.user, day: olderShort }), { exact: true })
		).toHaveCount(1);
		await expect(page.getByRole('button', { name: DAY.PREVIOUS_DAY })).toBeDisabled();
		await expect(page.getByRole('button', { name: DAY.NEXT_DAY })).toBeEnabled();
		// the day read is that day's own window in the reader's zone (`use-member-day-activities.ts:36-46`), so the
		// second day is a different window, not the same range asked again
		const olderWindow = await dayWindowOf(page, older);
		expect(olderWindow).not.toBe(await dayWindowOf(page, newer));
		await expect.poll(() => rangesOf(dayCalls), { timeout: 20_000 }).toContain(olderWindow);
		await page.getByRole('button', { name: DAY.NEXT_DAY }).click();
		await expect(sectionHead(page, DAY.TITLE)).toHaveText([`${fixture.names.user} · ${newerShort} · 1h 47m`], {
			timeout: 20_000
		});

		expect(consoleFindings(shield), 'the day panel printed a console error').toEqual([]);
		report('11 day panel', {
			dayRanges: rangesOf(dayCalls),
			dayMembers: dayCalls.map((call) => call.params.get('employeeIds[0]')),
			segments: await daySegments(page),
			reads: reportCalls.length,
			dayMenu: dayMenu
		});
	});

	/* --------------------------------------------------- 12. export ------------------------------------------------- */

	test('12 · export: the CSV file with every line of it, and the PDF file name', async ({
		page,
		fixture,
		shield
	}) => {
		const { reportCalls } = await openPage(page, fixture);
		await expectTexts(() => totalsRow(page), [`${dayCount(2)}${memberCount(3)}${projectCount(3)}3h 20m`]);
		const keys = periodKeys();
		const older = dayKey(-2);
		const newer = dayKey(-1);

		await expect(exportButton(page)).toBeEnabled();
		await exportButton(page).click();
		await expect(page.getByRole('menuitem', { name: EN.common.PDF, exact: true })).toHaveCount(1);
		await expect(page.getByRole('menuitem', { name: A.EXPORT_CSV, exact: true })).toHaveCount(1);

		const csvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: A.EXPORT_CSV, exact: true }).click();
		const csv = await csvEvent;
		// `periodFileNameOf(FILE_PREFIX, period.from, period.to, 'csv')` (`apps-urls-export.ts:20`, `dashboard-export.ts`)
		expect(csv.suggestedFilename()).toBe(`apps-and-urls-${keys.from}-${keys.to}.csv`);
		const lines = readFileSync(await csv.path(), 'utf8').split(/\r?\n/);
		// a byte-order mark, then the six columns (`apps-urls-export.ts:85-95`)
		expect(lines[0].codePointAt(0)).toBe(0xfeff);
		expect(lines[0].replace('\uFEFF', '')).toBe(
			[A.CSV_DATE, A.COLUMN_MEMBER, A.COLUMN_PROJECT_NAME, A.COLUMN_TITLE, A.CSV_TIME, A.CSV_SHARE].join(',')
		);
		// one line per app or site · member · project · day: oldest day first, longest line first, `h:mm`, and the
		// share of the whole period to a tenth (`csvLinesOf` `:75-90`, `byDayThenLongest` `:43-49`)
		expect(lines.length).toBe(9);
		expect(lines.slice(1)).toEqual([
			`${older},${fixture.names.user},Project au-project-1,VS Code,0:45,22.5`,
			`${older},${fixture.names.teammate},Project au-project-1,Slack,0:30,15`,
			`${older},${fixture.names.user},${A.NO_PROJECT},github.com,0:15,7.5`,
			`${older},${fixture.names.user},Project au-project-1,Chrome,0:10,5`,
			`${newer},${fixture.names.user},Project au-project-1,Chrome,0:50,25`,
			`${newer},${fixture.names.user},Project au-project-2,Figma,0:25,12.5`,
			`${newer},${fixture.names.user},Project au-project-2,VS Code,0:20,10`,
			`${newer},${OUTSIDER_NAME},${A.NO_PROJECT},Slack,0:05,2.5`
		]);

		await page.keyboard.press('Escape');
		await exportButton(page).click();
		const pdfEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: EN.common.PDF, exact: true }).click();
		const pdf = await pdfEvent;
		// only its name: no byte of the PDF was read
		expect(pdf.suggestedFilename()).toBe(`apps-and-urls-${keys.from}-${keys.to}.pdf`);

		expect(rangesOf(reportCalls)).toContain(`${keys.from}..${keys.to}`);
		expect(consoleFindings(shield), 'the export printed a console error').toEqual([]);

		report('12 export', {
			csv: csv.suggestedFilename(),
			pdf: pdf.suggestedFilename(),
			header: lines[0],
			lines: lines.length,
			rows: lines.slice(1)
		});
	});

	/* ------------------------------------------------ 13. a refused read ------------------------------------------------ */

	test('13 · a refused report read: the notice in the figures band, its retry, only its own console line', async ({
		page,
		fixture,
		shield
	}) => {
		const script: ReportScript = { status: 500 };
		const reportCalls = serveReport(page, script, { byRange: true, scoped: true });
		serveDay(page, { entries: [] });
		await signInAndVisit(page, fixture, `${PAGE_PATH}/${fixture.ids.teamA}`);
		await expect.poll(() => reportCalls.length, { timeout: 20_000 }).toBeGreaterThan(0);

		// the band stays drawn with nothing as its total, and carries its own notice (`apps-urls-page.tsx:131-137`)
		await expect(page.getByRole('heading', { name: A.TIME_LABEL })).toHaveCount(1);
		const refusedText = await sectionText(page, A.TIME_LABEL);
		expect(refusedText).toContain(`${A.TIME_LABEL}–${EN.dashboard.states.ERROR_TITLE}`);
		await expect(page.getByText(EN.dashboard.states.ERROR_MESSAGE, { exact: true })).toHaveCount(1);
		await expect(page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true })).toHaveCount(1);
		await expect(page.getByRole('table')).toHaveCount(0);
		await expect(mosaicGroup(page)).toHaveCount(0);
		await expect(page.getByRole('heading', { name: DAY.TITLE })).toHaveCount(0);
		await expect(exportButton(page)).toBeDisabled();

		// only the refusal this file armed is excused, path and status both named (finding 9: it retried on its own)
		const armed = armedRead(REPORT_LOG_PATH, 500);
		expect(shield.logMatching(armed).length, 'the refusal this file armed was never logged').toBeGreaterThan(0);
		expect(consoleFindings(shield, [armed]), 'a console error that was not the refusal this file armed').toEqual(
			[]
		);
		const armedBefore = shield.logMatching(armed).length;

		script.status = undefined;
		script.days = servedReport(fixture, customWindowOf(periodKeys().from));
		await page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN }).click();
		await expect(page.getByRole('table')).toHaveCount(1, { timeout: 20_000 });
		await expectCount(() => groupRows(page), 2, { timeout: 20_000 });
		await expect(mosaicTiles(page)).toHaveCount(5, { timeout: 20_000 });
		await expect(exportButton(page)).toBeEnabled();
		expect(shield.logMatching(armed).length, 'the retry printed a further refusal').toBe(armedBefore);
		expect(consoleFindings(shield, [armed]), 'a console error the retry added').toEqual([]);

		report('13 refused read', {
			reads: reportCalls.length,
			armedLines: armedBefore,
			consoleErrors: shield.consoleErrors().length,
			groups: await groupRows(page)
		});
	});

	/* ---------------------------------------------- 14. a day read that fails ------------------------------------------ */

	test('14 · the day read failing: first an entry its schema refuses, then a refused answer', async ({
		page,
		fixture,
		shield
	}) => {
		const window = customWindowOf(periodKeys().from);
		const dayScript: DayScript = {
			// no `id`, which the day list's schema requires (`activityEntrySchema`)
			entries: [
				{
					title: 'Entry with no id',
					date: dayKey(-1),
					time: '10:00:00',
					duration: 600,
					employeeId: fixture.ids.employee
				}
			]
		};
		serveReport(page, { days: servedReport(fixture, window) }, { byRange: true, scoped: true });
		const dayCalls = serveDay(page, dayScript);
		await signInAndVisit(page, fixture, `${PAGE_PATH}/${fixture.ids.teamA}`);
		await expect.poll(() => dayCalls.length, { timeout: 20_000 }).toBeGreaterThan(0);

		// the panel asks again once and only then shows the notice: at 1.0 s the read had failed once and the
		// panel held nothing at all, at 1.5 s it had asked twice and the notice was there (`pG2.log` g2)
		await expect
			.poll(() => sectionText(page, DAY.TITLE), { timeout: 20_000 })
			.toContain(EN.dashboard.states.ERROR_TITLE);
		// only the day panel carries the notice, the rest of the page is intact, and nothing reached the console
		const day = daySection(page);
		await expect(day.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true })).toHaveCount(1);
		await expect(page.getByRole('heading', { name: A.TIME_LABEL })).toHaveCount(1);
		await expect(mosaicTiles(page)).toHaveCount(5);
		await expectCount(() => groupRows(page), 2);
		await expect(exportButton(page)).toBeEnabled();
		expect(consoleFindings(shield), 'an answer that failed its schema printed a console error').toEqual([]);

		// refused instead: the same notice, and now the armed line is the only error the console holds
		dayScript.status = 503;
		await page.getByRole('button', { name: DAY.PREVIOUS_DAY }).click();
		await expect
			.poll(() => sectionText(page, DAY.TITLE), { timeout: 20_000 })
			.toContain(EN.dashboard.states.ERROR_TITLE);
		await expectCount(() => groupRows(page), 2);
		const armed = armedRead(DAY_LOG_PATH, 503);
		expect(shield.logMatching(armed).length, 'the refused day read was never logged').toBeGreaterThan(0);
		expect(consoleFindings(shield, [armed]), 'a console error that was not the refusal this file armed').toEqual(
			[]
		);
		// the figures band above is untouched: it does not carry the notice
		expect(await sectionText(page, A.TIME_LABEL)).not.toContain(EN.dashboard.states.ERROR_TITLE);

		report('14 failing day read', {
			dayReads: dayCalls.length,
			armedLines: shield.logMatching(armed).length,
			consoleErrors: shield.consoleErrors().length,
			dayText: await sectionText(page, DAY.TITLE)
		});
	});

	/* --------------------------------------------- 15. rows without names --------------------------------------------- */

	test('15 · rows the answer cannot name, a project the reader is not on, and a row it drops', async ({
		page,
		fixture,
		shield
	}) => {
		const older = dayKey(-2);
		const newer = dayKey(-1);
		const own = fixture.ids.employee;
		const mate = fixture.ids.teammateEmployee;
		const first = project('au-project-1', 'Project au-project-1');
		const days: ServedDay[] = [
			{
				date: older,
				employees: [
					{
						employee: person(own, fixture.names.user),
						projects: [
							{
								project: first,
								activity: [
									{
										employeeId: own,
										projectId: 'au-project-1',
										date: older,
										title: 'VS Code',
										duration: 2700,
										type: 'APP'
									},
									{
										employeeId: own,
										projectId: 'au-project-1',
										date: older,
										title: 'Chrome',
										duration: 600,
										type: 'URL',
										url: 'https://www.google.com/search?q=lean'
									},
									{
										employeeId: own,
										projectId: 'au-project-1',
										date: older,
										title: 'Private thing',
										duration: 400,
										type: 'APP'
									}
								]
							},
							{
								project: null,
								activity: [
									{
										employeeId: own,
										projectId: null,
										date: older,
										title: 'github.com',
										duration: 900,
										type: 'URL',
										url: 'https://github.com/ever-co'
									}
								]
							},
							{
								project: { id: 'au-hidden', name: 'Hidden Probe Project', projectHidden: true },
								activity: [
									{
										employeeId: own,
										projectId: 'au-hidden',
										date: older,
										title: 'Secret app',
										duration: 500,
										type: 'APP'
									}
								]
							},
							{
								project: first,
								activity: [
									{
										employeeId: own,
										projectId: 'au-project-1',
										date: older,
										title: '',
										duration: 300
									}
								]
							},
							{
								project: first,
								activity: [
									{
										employeeId: own,
										projectId: 'au-project-1',
										date: older,
										title: 'No name app',
										duration: 200
									}
								]
							}
						]
					},
					// a group whose employee carries an id and nothing else
					{
						employee: { id: mate },
						projects: [
							{
								project: first,
								activity: [
									{
										employeeId: mate,
										projectId: 'au-project-1',
										date: older,
										title: 'Slack',
										duration: 1800
									}
								]
							}
						]
					},
					// a group with no employee at all: one row names its own, one names nobody
					{
						employee: undefined,
						projects: [
							{
								project: first,
								activity: [
									{ projectId: 'au-project-1', date: older, title: 'Orphan row', duration: 700 },
									{
										employeeId: mate,
										projectId: 'au-project-1',
										date: older,
										title: 'Row with own employee',
										duration: 100,
										employee: { id: 'au-row-employee', fullName: 'Row Copy' }
									}
								]
							}
						]
					}
				]
			},
			{
				date: newer,
				employees: [
					{
						employee: person(own, fixture.names.user),
						projects: [
							{
								project: first,
								activity: [
									{
										employeeId: own,
										projectId: 'au-project-1',
										date: newer,
										title: 'Chrome',
										duration: 3000,
										type: 'URL',
										url: 'https://www.google.com/search?q=urls'
									}
								]
							},
							{
								project: project('au-project-2', 'Project au-project-2', '#0f766e'),
								activity: [
									{
										employeeId: own,
										projectId: 'au-project-2',
										date: newer,
										title: 'VS Code',
										duration: 1200,
										type: 'APP'
									}
								]
							}
						]
					},
					{
						employee: person(OUTSIDER_ID, OUTSIDER_NAME),
						projects: [
							{
								project: null,
								activity: [
									{
										employeeId: OUTSIDER_ID,
										projectId: null,
										date: newer,
										title: 'Slack',
										duration: 300
									}
								]
							}
						]
					}
				]
			}
		];
		serveReport(page, { days }, { byRange: true });
		// seven entries for the viewer on the newest day: a sixth and seventh app, so the legend shows its "other"
		const entries = servedEntries(fixture, customWindowOf(periodKeys().from)).slice(0, 5);
		entries.push(
			{
				id: 'au-day-6',
				title: 'Zoom',
				description: null,
				date: newer,
				time: '16:40:00',
				duration: 120,
				type: 'APP',
				employeeId: own,
				recordedAt: instantAt(newer, 16, 40)
			},
			{
				id: 'au-day-12',
				title: 'Obsidian',
				description: null,
				date: newer,
				time: '17:05:00',
				duration: 90,
				type: 'APP',
				employeeId: own,
				recordedAt: instantAt(newer, 17, 5)
			}
		);
		serveDay(page, { entries });
		await signInAndVisit(page, fixture, `${PAGE_PATH}/${fixture.ids.teamA}`);

		// the served rows are on screen before any control is touched: the loading skeleton draws a table with no
		// group in it, so two group rows mean the answer arrived
		await expectCount(() => groupRows(page), 2, { timeout: 40_000 });
		await page.getByRole('tab', { name: A.VIEW_APPLICATION, exact: true }).click();
		await expectTexts(
			() => groupToggles(page),
			[
				'VS Code2 days',
				'Chrome2 days',
				'Slack2 days',
				'github.com1 day',
				'Secret app1 day',
				'Private thing1 day',
				`${A.UNTITLED}1 day`,
				'No name app1 day',
				'Row with own employee1 day'
			]
		);
		await expectTexts(
			() => groupRows(page),
			[
				`1VS Code${msg('DAY_COUNT', { count: 2 })}${memberCount(1)}${projectCount(2)}33%1h 5m`,
				`2Chrome${msg('DAY_COUNT', { count: 2 })}${memberCount(1)}${projectCount(1)}30%1h 0m`,
				`3Slack${msg('DAY_COUNT', { count: 2 })}${memberCount(2)}${projectCount(2)}18%0h 35m`,
				`4github.com${msg('DAY_COUNT', { count: 1 })}${memberCount(1)}${projectCount(1)}8%0h 15m`,
				`5Secret app${msg('DAY_COUNT', { count: 1 })}${memberCount(1)}${projectCount(1)}4%0h 8m`,
				`6Private thing${msg('DAY_COUNT', { count: 1 })}${memberCount(1)}${projectCount(1)}3%0h 6m`,
				`7${A.UNTITLED}${msg('DAY_COUNT', { count: 1 })}${memberCount(1)}${projectCount(1)}3%0h 5m`,
				`8No name app${msg('DAY_COUNT', { count: 1 })}${memberCount(1)}${projectCount(1)}2%0h 3m`,
				`9Row with own employee${msg('DAY_COUNT', { count: 1 })}${memberCount(1)}${projectCount(1)}1%0h 1m`
			]
		);
		const table = page.getByRole('table');
		// an empty title keeps a row named `UNTITLED`; a hidden project is "Private projects" with a lock named by
		// `PRIVATE_PROJECT_HINT`; a group with no name prints `UNKNOWN_MEMBER`; a row carrying its own employee
		// prints that name (findings 3 and 4)
		await expect(table).toContainText(A.UNTITLED);
		await expect(table).toContainText(EN.common.PRIVATE_PROJECTS);
		await expect(table).toContainText(A.UNKNOWN_MEMBER);
		// only the leading `LEADING_OPEN_COUNT` 5 groups open on their own, so the ninth group's own rows are
		// not drawn until the reader expands them (`apps-urls-list-controls.tsx:12, 125`)
		await page.getByRole('button', { name: A.EXPAND_ALL, exact: true }).click();
		await expect(table).toContainText('Row Copy');
		const appLines = await lineTexts(page);
		await expect(page.getByRole('img', { name: EN.common.PRIVATE_PROJECT_HINT })).toHaveCount(1);
		// the row that names nobody is gone, and nothing on screen says a row was dropped
		await expect(table).not.toContainText('Orphan row');
		await expectTexts(() => totalsRow(page), [`${titleCount(9)}${memberCount(4)}${projectCount(4)}3h 20m`]);

		await page.getByRole('tab', { name: A.VIEW_PROJECT, exact: true }).click();
		// "No project" closes the project view whatever its rank (`sortUsageGroups`, `apps-urls.ts:530-536`)
		await expectTexts(
			() => groupToggles(page),
			[
				`Project au-project-1${titleCount(7)}`,
				'Project au-project-21 app or site',
				`${EN.common.PRIVATE_PROJECTS}1 app or site`,
				`${A.NO_PROJECT}2 apps and sites`
			]
		);
		await expectTexts(
			() => groupRows(page),
			[
				`1Project au-project-1${titleCount(7)}${memberCount(3)}76%2h 31m`,
				`3Project au-project-2${titleCount(1)}${memberCount(1)}10%0h 20m`,
				`4${EN.common.PRIVATE_PROJECTS}${titleCount(1)}${memberCount(1)}4%0h 8m`,
				`2${A.NO_PROJECT}${titleCount(2)}${memberCount(2)}10%0h 20m`
			]
		);
		await expectTexts(() => totalsRow(page), [`${projectCount(4)}${memberCount(4)}3h 20m`]);

		// the sixth app on the day earns the legend's own "other" row (`SHOWN_APPS = 5`, `app-activity.ts:8`)
		await expectCount(() => dayLegend(page), 6);
		await expect(daySection(page).locator('ul').first()).toContainText(msg('day.OTHER', { count: 1 }));

		expect(consoleFindings(shield), 'the edge rows printed a console error').toEqual([]);
		report('15 edge rows', {
			appLines: appLines,
			projectGroups: await groupToggles(page),
			lines: await lineTexts(page),
			legend: await dayLegend(page)
		});
	});

	/* --------------------------------------------- 16. the mosaic's limits --------------------------------------------- */

	test('16 · the mosaic limits, and the 200-row cap of the report', async ({ page, fixture, shield }) => {
		const older = dayKey(-2);
		const newer = dayKey(-1);
		const own = fixture.ids.employee;
		const nine: Array<[string, number]> = [
			['t-400', 400],
			['t-200', 200],
			['t-100', 100],
			['t-50', 50],
			['t-40', 40],
			['t-20', 20],
			['t-16', 16],
			['t-12a', 12],
			['t-12b', 12]
		];
		const eight: Array<[string, number]> = nine.slice(0, 8);
		const equal: Array<[string, number]> = Array.from({ length: 30 }, (_, index) => [`eq-${index + 1}`, 100]);
		const script: ReportScript = { days: [titlesDay(older, nine, own, fixture.names.user)] };
		serveReport(page, script);
		serveDay(page, { entries: [] });
		await signInAndVisit(page, fixture, `${PAGE_PATH}/${fixture.ids.teamA}`);
		await expect(mosaicTiles(page)).toHaveCount(8);
		// two leftovers under the 1.5% floor merged into one tile, named by its count (`MOSAIC_MIN_SHARE`, `:732`)
		await expect(mosaicTiles(page).last()).toHaveAttribute(
			'aria-label',
			msg('MOSAIC_TILE_LABEL', { name: msg('OTHER_TITLES', { count: 2 }), duration: '0h 0m', share: '3%' })
		);

		script.days = [titlesDay(older, eight, own, fixture.names.user)];
		await hardVisit(page, `${PAGE_PATH}/${fixture.ids.teamA}`);
		await expect(mosaicTiles(page)).toHaveCount(8);
		// one leftover keeps its own tile instead of an "others" tile (`mosaicItemsOf`, `apps-urls.ts:796-816`)
		await expect(mosaicTiles(page).last()).toHaveAttribute(
			'aria-label',
			msg('MOSAIC_TILE_LABEL', { name: 't-12a', duration: '0h 0m', share: '1%' })
		);

		script.days = [titlesDay(older, equal, own, fixture.names.user)];
		await hardVisit(page, `${PAGE_PATH}/${fixture.ids.teamA}`);
		// 18 named tiles at most (`MOSAIC_MAX_NAMED`, `apps-urls.ts:729`), the rest merged into one
		await expect(mosaicTiles(page)).toHaveCount(19);
		await expect(mosaicTiles(page).filter({ hasText: /other apps and sites/ })).toHaveCount(1);
		await expect(mosaicTiles(page).filter({ hasText: /other apps and sites/ })).toHaveAttribute(
			'aria-label',
			msg('MOSAIC_TILE_LABEL', { name: msg('OTHER_TITLES', { count: 12 }), duration: '0h 20m', share: '40%' })
		);

		const hundred: Array<[string, number]> = Array.from({ length: 100 }, (_, index) => [
			`cap-${index + 1}`,
			600 - index
		]);
		const ninetyNine: Array<[string, number]> = Array.from({ length: 99 }, (_, index) => [
			`cap-${index + 1}`,
			500 - index
		]);
		script.days = [
			titlesDay(older, hundred, own, fixture.names.user),
			titlesDay(newer, ninetyNine, own, fixture.names.user)
		];
		await hardVisit(page, `${PAGE_PATH}/${fixture.ids.teamA}`);
		// 199 served rows say nothing about a cap (`ACTIVITY_REPORT_ROW_CAP = 200`, `apps-urls.ts:47`)
		await expect(page.getByText(msg('CAPPED_NOTE', { count: 200 }), { exact: true })).toHaveCount(0);
		await expect(mosaicTiles(page)).toHaveCount(7);

		script.days = [
			titlesDay(older, hundred, own, fixture.names.user),
			titlesDay(newer, hundred, own, fixture.names.user)
		];
		await hardVisit(page, `${PAGE_PATH}/${fixture.ids.teamA}`);
		await expect(page.getByText(msg('CAPPED_NOTE', { count: 200 }), { exact: true })).toHaveCount(1);
		await expect(mosaicTiles(page)).toHaveCount(7);

		expect(consoleFindings(shield), 'the mosaic printed a console error').toEqual([]);
		report('16 mosaic limits', {
			cappedNote: await page.getByText(msg('CAPPED_NOTE', { count: 200 }), { exact: true }).count(),
			tiles: await attrs(mosaicTiles(page), 'aria-label'),
			legend: await splitLegend(page)
		});
	});
});
