import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type BootstrapFixture, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, hardVisit, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What **Reports › Project budget** (`/reports/project-budget`) shows and sends, on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control `3994`, issuer `3995`:
 * `playwright/test-servers.ts:38`). It signs in as the person `suites/lane-a/reports-gate-by-role-ui.spec.ts` pins as
 * the role that may open this page (`isManager: true`, role `ADMIN`); that file answers "who may open it", this one
 * answers "what the page then shows and sends".
 *
 * ## The code this file drives (every `file:line` read out of its file before it is named)
 *
 * - `app/[locale]/(main)/reports/project-budget/page.tsx:12-20` gates on `useCurrentOrganizationOwner()` and renders
 *   `ProjectBudgetPage`; `core/components/dashboards/project-budget/project-budget-page.tsx:36-143` is the page.
 * - The one report read: `core/hooks/dashboards/project-budget/use-project-budget-rows.ts:120-133` →
 *   `core/services/client/api/timesheets/time-log-report.service.ts:133-144` →
 *   `GET /api/timesheet/time-log/project-budget-limit?tenantId&organizationId&startDate&endDate&timeZone`
 *   (`rangeParamsOf` `:49-60`: `projectIds` / `employeeIds` / `teamIds` are sent only when given), validated with
 *   `projectBudgetReportSchema.array()` (`core/types/schemas/timer/time-log-reports.schema.ts:43-63`).
 * - Every figure on screen is derived, never read from the answer: `budgetRowOf`
 *   (`core/lib/utils/dashboards/project-budget.ts:308-328`) computes `remaining = budget - spent` and
 *   `share = spent / budget * 100`, and `limitVerdictOf` (`core/lib/utils/dashboard-figures.ts:113-121`,
 *   `NEAR_LIMIT_SHARE = 90`) decides `within | near | over`; the lane is picked by `riskOf` (`:289-297`). Four lanes
 *   are drawn on the board (`BOARD_RISKS` `:510`) and `noBudget` is its own section (`unbudgetedRowsOf` `:526-528` →
 *   `budget-unbudgeted.tsx:76-112`).
 * - Order: `budgetGroupsOf` (`:487-507`) sorts a lane by the share used, highest first, then by name; the portfolio
 *   puts hours first and then one key per currency (`byHoursThenBudget` `:554-564`, `budgetTotalsOf` `:567-590`) and
 *   caps each legend at `PORTFOLIO_LEGEND_SIZE = 3` (`:662`), counting the rest as "N other projects"
 *   (`budget-portfolio.tsx:77-104`, `:110-150`).
 * - The pill beside each card is 20 segments (`PILL_SEGMENT_COUNT = 20`, `:592`, `pillTonesOf` `:635-659` →
 *   `budget-pill-meter.tsx:17-37`), inside an `aria-hidden` wrapper because the words beside it carry the figure.
 * - What a person changes, and where it is kept: scope, period and filters are component state
 *   (`use-project-budget-report.ts:39-41`), a lane's "Show more" is `useState` (`budget-board.tsx:206`) capped at
 *   `LANE_PREVIEW_SIZE = 8` (`budget-board.tsx:32`), the unbudgeted section's open state is `useState`
 *   (`budget-unbudgeted.tsx:81`) and it opens by default only when the board has no rows
 *   (`project-budget-page.tsx:137` with `hasBoardRows`, `use-project-budget-report.ts:59`). Filters narrow the rows
 *   already loaded (`filteredBudgetRowsOf` `:476-478`); the chips and "Clear filters" are
 *   `project-budget-toolbar.tsx:198-238`.
 * - A project the API keeps from the reader (CORE-27): `hiddenRowOf` (`:337-350`) keeps nothing of it but the spend,
 *   names it `common.PRIVATE_PROJECT`, and `budget-board.tsx:160-173`, `budget-unbudgeted.tsx:52-64`,
 *   `budget-cells.tsx:116-120` give it the lock (`core/components/projects/hidden-project-mark.tsx:21-45`) and no
 *   link, while a normal project links to `/projects/<id>` (`projectPathOf`, `budget-board.tsx:30`, `:62-64`). Intent
 *   pinned by `core/components/dashboards/project-budget/budget-hidden-projects.test.tsx:55-78`.
 * - Export: `project-budget-export.tsx:233-278` (file names `:49-57`, CSV columns `:85-100`, rows in board order
 *   `:102-104`) over `core/lib/utils/dashboard-export.ts` (`csvOf` `:31-36`, `downloadCsv` `:41-45`,
 *   `periodFileNameOf` `:63-66`); disabled while there are no rows or while loading (`project-budget-page.tsx:50-51`
 *   → `kit/export-menu.tsx:31-46`).
 * - A failed read: `use-project-budget-rows.ts:163-183` (`isUpdating`, `showsError = query.isError && !hasData`,
 *   `showsProjectsError`), drawn by `kit/dashboard-states.tsx:9-30` (a `Notice`, an `<output>`) with
 *   `dashboard.states.ERROR_TITLE` + `ERROR_MESSAGE` + `pages.unauthorized.TRY_AGAIN`; the "Updating budgets" bar is
 *   `core/components/layouts/page-skeleton.tsx:16-25`, an `<output aria-label>` with no text.
 * - The period label is `formatPeriod` → `Intl.DateTimeFormat(…, { month: 'short', day: 'numeric' }).formatRange`
 *   (`core/lib/utils/dashboard-period.ts:148-163`), which is why this file computes those strings in the browser
 *   instead of pinning a date.
 *
 * ## What is real and what this file serves
 *
 * The lane's mock answers the report with a plain `[]` (`cypress/support/mock-gauzy-server.mjs:804-812`), so every
 * project here is served by this file with `page.route` on the mock origin (CORS restated from
 * `mock-gauzy-server.mjs:1087-1101`, `OPTIONS` answered 204 — the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:275-349`), and every query is read from the recorded route, never from
 * `route.fetch()`. The organisation projects list (`GET /api/organization-projects`, `mock-gauzy-server.mjs:763-764`)
 * is served too, for one reason: a "No time yet" row can only come from a **listed** project that has a budget and no
 * time in the range (`budgetRowsOf` `:449-458`, `untrackedRowOf` `:376-390`) and the mock's fixture project carries no
 * budget (`mock-gauzy-server.mjs:226-238`); without this stub that lane and its "No members" line are unreachable.
 * The shell, the organisation (currency `USD`, `mock-gauzy-server.mjs:93`), the user and the teams stay the mock's
 * own. No token or header value is printed or asserted.
 *
 * ## Where the numbers came from
 *
 * Throwaway probes on this lane, all on 2026-11-25, each with a config that has no `webServer`
 * (`E:\Coding\.tmp\probe-projectbudget\probe.config.mjs`, copied from `probe-apitokens/probe.config.mjs`):
 * `probe.spec.ts` → `E:\Coding\.tmp\probe-projectbudget\probe-1.log` (the empty state, the board cards, the portfolio
 * meters, the unbudgeted-only case, the private project, the 8-card lane toggle and its reload, the scope tabs, the
 * status filter, the `?project=` link, the coerced numbers, the CSV body);
 * `probe2.spec.ts` → `probe-2.log` and `probe-3.log` (the empty export and the whole-scope query, the filter menu, the
 * project filter and its chip, the period scope and its previous/next queries, the refused 500 and its retry, the
 * malformed row, the export names, the CSV lines);
 * `probe3.spec.ts` → `probe-5.log` and `probe-6.log` (the unbudgeted toggle and its rows and links, the pill segments,
 * the Budget-type filter, what a reload keeps, the 500 and malformed-row notices, the "Updating budgets" bar, the
 * custom calendar range, the refused projects list's notice and the shrunken hours total).
 * The served set below uses the probe's own project names, so every pinned string here is a string a probe log
 * printed for the same served data. Each test also prints its own `[lane-a project-budget] MEASURE …` line.
 *
 * Text is matched with `toContainText` on the card / meter / row that holds it, never on the whole lane or the whole
 * portfolio: a card carries `[content-visibility:auto]` (`budget-board.tsx:50-51`), so a rendered-text comparison
 * over a whole lane depends on which cards the browser had painted at that moment.
 *
 * Dates and the time zone come from the browser's clock (`page.evaluate`): never a pinned day, never a hard-coded
 * zone (this lane ran in `Europe/Madrid`).
 *
 * ## Findings (measured, with the line that explains them)
 *
 * 1. **There is no layout switch on this page.** Only `ProjectBudgetBoard` and `ProjectBudgetUnbudgeted` are rendered
 *    (`project-budget-page.tsx:127-137`); `ProjectBudgetTable` (`project-budget-table.tsx:280-341`, the only user of
 *    `EXPAND_ALL`/`COLLAPSE_ALL`) and `ProjectBudgetFigures` (the only reader of `MAX_COST_FIGURES`,
 *    `project-budget.ts:21`) are exported and imported by nothing in `app/` or `core/`. Measured: `getByRole('table')`
 *    count 0 with rows on screen (test 2). So the brief's "board, table" area has one side.
 * 2. **A project the report answers with is always `hasTime: true`** (`reportedRowOf` `:373`): the eight budgeted
 *    report rows above measure tracked time, and the two "No time yet" cards came only from the served projects list
 *    (test 2).
 * 3. **`remainingBudget` and `spentPercentage` of the answer are decoration.** Every served row carried
 *    `remainingBudget: 999, spentPercentage: 1`; the screen still showed `-3.75`, `162.5`, "3h 45m over" and "163%
 *    used" (tests 2, 3, 11) because the page computes them from `budget` and `spent` (`budgetRowOf` `:308-328`).
 *    That is the intent, not a slip: the unit tests serve both fields as `0` (`project-budget.test.ts:20`) and pin
 *    the share and the remainder worked out from `budget` and `spent` (`:80-81`, `:90`). The answer type still
 *    carries both fields (`TProjectBudgetReport`, schema `time-log-reports.schema.ts:60-61`); this page reads neither.
 * 4. **The unbudgeted section closes whenever the board shows a project** and opens when it does not
 *    (`budget-unbudgeted.tsx:75-82`, `project-budget-page.tsx:137`): measured `aria-expanded` false with 0 rows in the
 *    full set, true with its rows in the unbudgeted-only set — where the board *above it* still reads "No project has
 *    a budget yet" (test 4). The two coexist.
 * 5. **Nothing here survives a reload.** Scope, filters, the lane expansion and the unbudgeted section all came back
 *    at their defaults after `page.reload()` (test 6; `probe-5.log` r8 for the scope tabs and the unbudgeted toggle);
 *    the only `localStorage` keys the page leaves are the shell's (`local-timer-ever-team-…`, `remembered-teams`,
 *    `ever-teams:active-team-snapshot`, `last-workspace-and-team`, `employee-presence-last-interaction`,
 *    `active-workspace-id`). So the brief's "hiding one … does the choice survive a reload" has no store to survive
 *    in: what this page can hide is a lane's extra cards and the unbudgeted rows, and neither is remembered — every
 *    state named above is component state and no budget key is ever written.
 * 6. **A malformed row fails the whole read and looks exactly like a refused one**, but silently. A row without
 *    `project.id` (required, schema `:47`) answered HTTP 200 and produced the same "This part of the report could not
 *    load" notice with no board, no portfolio and a disabled export, while the client logged no HTTP error at all and
 *    only a dev `Query failed` toast carried `Validation failed in getProjectBudgetReport response: 0.project.id:
 *    Invalid input` (test 13, `probe-6.log` r2). A bad *number* is absorbed instead: `budget: 'not-a-number'` /
 *    `spent: 'oops'` hit `.catch(0)` (schema `:58-59`) and that project simply lands in "Without a budget" (test 13).
 *    A `budgetType` that is not `hours` reads as a cost in the organisation's currency (`budgetTypeOf` `:137-142`).
 * 7. **The projects list has its own notice.** Refusing `GET /api/organization-projects` leaves the board showing the
 *    reported projects and adds "Budgeted projects without time could not load" (`project-budget-page.tsx:121-126`,
 *    `use-project-budget-rows.ts:183`), and the hours total shrinks from 51h / 6 projects to 31h / 5 projects because
 *    the two listed budgeted projects are gone (test 12).
 * 8. **The whole-scope read repeats while the page is open, and a repeat can carry a different range.** The
 *    whole-project range covers today, so the live report options apply (`use-project-budget-rows.ts:132` →
 *    `core/query/dashboard-live.ts:4-6`, `refetchInterval` 60 000) and `endDate` is `endOfDay(today)` recomputed at
 *    each read (`wholeProjectPeriodOf` `:119-124`): a run recorded two ranges of the *whole* scope in one test, so no
 *    test here pins "one read" or "one range". Filters are pinned instead by "no read ever carried a filter
 *    parameter" plus "the whole-scope range named below was the range read" (tests 9, 10).
 * 9. **Not reachable here, and why.** `TYPE_COST` alone ("Cost", the no-currency wording) cannot appear: `currencyOf`
 *    (`:279-287`) falls back to the listed project's currency and then the organisation's, and the mock's organisation
 *    always carries `USD` (`mock-gauzy-server.mjs:93`), so every cost row measured as "Cost · USD" / "Cost · EUR". The
 *    PDF's *contents* are out of scope by the brief: only its file name is checked, no byte was read. The
 *    `MAX_COST_FIGURES` three-currency strip is unreachable (finding 1). A refused *shell* read and the 60-second live
 *    refresh are not pinned: the first belongs to the shell specs, the second needs a minute of clock. The accessible
 *    name of a board card's link is not asserted either — only that `a[href="/projects/pb-over-hours"]` exists: the
 *    card's link element also carries the tile and the figures, so its computed name is not something the run proved.
 *
 * ## Console
 *
 * `shield.consoleErrors()` was empty in every healthy case measured (`probe-2.log` q1, q7). The armed refusals print
 * exactly `[ERROR] [HttpClient] HTTP Error: GET /timesheet/time-log/project-budget-limit?<query> 500 {statusCode:
 * 500, …}` and `… GET /api/organization-projects … 500` (`core/services/logs/logger-adapter.service.ts:189-215`);
 * only those exact named lines are excused, after `api-tokens-settings-ui.spec.ts:420-433`. The dev `Query failed`
 * toast (`core/components/common/dev-error-toaster.tsx:16-20`, it carries "Copy details") is DOM, not console, and is
 * measured rather than asserted. Counts of a failed read are never pinned: the client retries once
 * (`core/query/config/index.ts:31`) and Strict Mode mounts twice, so the same armed refusal printed 2 lines in one
 * probe and 3 in another.
 */

const PAGE_PATH = '/reports/project-budget';
const REPORT_PATH = '/api/timesheet/time-log/project-budget-limit';
/** The same read as the client logs it (`error.config.url`, no `/api` prefix): `probe-2.log` q6. */
const REPORT_LOG_PATH = '/timesheet/time-log/project-budget-limit';
const PROJECTS_PATH = '/api/organization-projects';
/** The projects list as the client logs it, no `/api` prefix (`probe-6.log` r6). */
const PROJECTS_LOG_PATH = '/organization-projects';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

type Messages = {
	common: Record<string, string>;
	dashboard: {
		projectBudget: Record<string, string>;
		period: Record<string, string>;
		states: Record<string, string>;
	};
	pages: { unauthorized: { TRY_AGAIN: string } };
};

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as Messages;
const B = EN.dashboard.projectBudget;

/** The ICU parts these keys use: `{name}` and `{count, plural, =0 {…} one {…} other {…}}` with `#`. */
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

const shareUsed = (share: string) => msg('dashboard.projectBudget.USED_SHARE', { share });
const left = (amount: string) => msg('dashboard.projectBudget.LEFT', { amount });
const over = (amount: string) => msg('dashboard.projectBudget.OVER', { amount });
const costIn = (currency: string) => msg('dashboard.projectBudget.TYPE_COST_IN', { currency });
const projectsCount = (count: number) => msg('dashboard.projectBudget.PROJECTS_COUNT', { count });
const projectsMeta = (count: number) => msg('dashboard.projectBudget.META_PROJECTS', { count });
const removeChip = (value: string) => msg('dashboard.projectBudget.REMOVE_FILTER', { value });

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a project-budget] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * Excuse only the exact refusal a test armed, status included, e.g. `armedRead(REPORT_LOG_PATH, 500)`: the client's
 * line is `[HttpClient] HTTP Error: GET <path>?<query> <status> {…}`. The two paths it is given are this file's
 * constants, which hold no regular-expression character.
 */
const armedRead = (path: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${path}(\?\S*)? ${status} `);
const consoleFindings = (shield: Shield, excused: RegExp[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !excused.some((pattern) => pattern.test(line)));

/* --------------------------------------------- served data ---------------------------------------------- */

/** One `TProjectBudgetReport` row as the schema answers it (`time-log-reports.schema.ts:43-63`). */
type ServedReportRow = {
	project: { id?: string; name?: string | null; currency?: string; projectHidden?: boolean };
	budgetType?: string;
	budget: number | string;
	spent: number | string;
	remainingBudget: number;
	spentPercentage: number;
};

/**
 * One row per project the reader is on, chosen (and named) exactly as the probes named it, so each risk lane, both
 * budget types, hours + USD + EUR totals, a cost with no currency of its own, an unnamed project, a project without a
 * budget and a private project all appear at once. `remainingBudget` / `spentPercentage` are deliberately wrong on
 * every row: finding 3 pins that the page ignores them.
 */
const REPORT_ROWS: ServedReportRow[] = [
	{
		project: { id: 'pb-over-hours', name: 'Row pb-over-hours' },
		budgetType: 'hours',
		budget: 6,
		spent: 9.75,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-over-cost', name: 'Row pb-over-cost', currency: 'EUR' },
		budgetType: 'cost',
		budget: 500,
		spent: 640,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-near-hours', name: 'Row pb-near-hours' },
		budgetType: 'hours',
		budget: 8,
		spent: 7.5,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-within-hours', name: 'Row pb-within-hours' },
		budgetType: 'hours',
		budget: 10,
		spent: 4.5,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-within-hours-2', name: 'Row pb-within-hours-2' },
		budgetType: 'hours',
		budget: 4,
		spent: 3,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-within-cost', name: 'Row pb-within-cost', currency: 'USD' },
		budgetType: 'cost',
		budget: 1200,
		spent: 300.5,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-nocurrency-cost', name: 'Row pb-nocurrency-cost' },
		budgetType: 'cost',
		budget: 100,
		spent: 40,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-noname', name: null },
		budgetType: 'hours',
		budget: 3,
		spent: 1.5,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-unbudgeted', name: 'Row pb-unbudgeted' },
		budgetType: 'hours',
		budget: 0,
		spent: 2.25,
		remainingBudget: 999,
		spentPercentage: 1
	},
	{
		project: { id: 'pb-hidden-keep', projectHidden: true },
		budgetType: 'hours',
		budget: 0,
		spent: 1.5,
		remainingBudget: 0,
		spentPercentage: 0
	}
];

/** `TOrganizationProject` as `organizationProjectBaseSchema` needs it (`id`, `name`, `public`, `owner`, `code`). */
type ServedListedProject = {
	id: string;
	name: string;
	public: boolean | null;
	owner: null;
	code: string | null;
	budget?: number;
	budgetType?: string;
	currency?: string;
	members?: unknown[];
};

/**
 * The organisation list served here: the mock's own fixture project (id `fixture.ids.project`, name from
 * `mock-gauzy-server.mjs:228`, no budget → no row) plus the two budgeted projects nobody tracked, which are the only
 * way a "No time yet" card exists (finding 2). The served names are the probe's names (`probe-1.log`, `probe-5.log`).
 */
function listedProjects(fixture: BootstrapFixture): ServedListedProject[] {
	return [
		{ id: fixture.ids.project, name: 'Fixture Project', public: true, owner: null, code: 'FIX', currency: 'USD' },
		{
			id: 'pb-listed-hours',
			name: 'Listed pb-listed-hours',
			public: true,
			owner: null,
			code: 'IH',
			budget: 20,
			budgetType: 'hours',
			currency: 'USD',
			members: []
		},
		{
			id: 'pb-listed-cost',
			name: 'Listed pb-listed-cost',
			public: true,
			owner: null,
			code: 'IC',
			budget: 900,
			budgetType: 'cost',
			currency: 'USD'
		}
	];
}

/* --------------------------------------------- the stubs ---------------------------------------------- */

type ReportScript = { rows?: ServedReportRow[]; status?: number; delayMs?: number };
type ProjectsScript = { items?: ServedListedProject[]; status?: number };
type ServedCall = { method: string; path: string; search: string; params: URLSearchParams };

/** The report read, answered from a script the test rewrites between its own steps. */
function serveReport(page: Page, script: ReportScript): ServedCall[] {
	const calls: ServedCall[] = [];
	page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === REPORT_PATH,
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			const url = new URL(request.url());
			calls.push({
				method: request.method(),
				path: url.pathname,
				search: url.search,
				params: new URLSearchParams(url.search)
			});
			if (script.delayMs) await new Promise((done) => setTimeout(done, script.delayMs));
			if (script.status) {
				return route.fulfill({
					status: script.status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: JSON.stringify({ statusCode: script.status, message: 'this file refused the report read' })
				});
			}
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(script.rows ?? [])
			});
		}
	);
	return calls;
}

function serveProjects(page: Page, script: ProjectsScript): void {
	page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === PROJECTS_PATH,
		(route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			if (script.status) {
				return route.fulfill({
					status: script.status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: JSON.stringify({ statusCode: script.status, message: 'this file refused the projects list' })
				});
			}
			const items = script.items ?? [];
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify({ items, total: items.length })
			});
		}
	);
}

/** Routes first, cookies second, navigation last — the order `helpers.ts:433-451` explains. */
async function openReport(
	page: Page,
	fixture: BootstrapFixture,
	script: ReportScript,
	options: { listed?: ServedListedProject[]; path?: string } = {}
): Promise<ServedCall[]> {
	const calls = serveReport(page, script);
	if (options.listed) serveProjects(page, { items: options.listed });
	await signInAndVisit(page, fixture, options.path ?? PAGE_PATH);
	return calls;
}

/* --------------------------------------------- locators ----------------------------------------------- */

const board = (page: Page) => page.getByRole('region', { name: B.BOARD_LABEL });
const portfolio = (page: Page) => page.getByRole('region', { name: B.FIGURES_LABEL });
const unbudgeted = (page: Page) => page.getByRole('region', { name: B.RISK_NO_BUDGET });
const unbudgetedToggle = (page: Page) => unbudgeted(page).getByRole('button');
const unbudgetedRows = (page: Page) => unbudgeted(page).locator('li');
const exportButton = (page: Page) => page.getByRole('button', { name: EN.common.EXPORT, exact: true });
const filterButton = (page: Page) => page.getByRole('button', { name: EN.common.FILTER, exact: true });
const scopeTabs = (page: Page) => page.getByRole('tablist', { name: B.SCOPE_LABEL });
const periodGroup = (page: Page) => page.getByRole('group', { name: EN.dashboard.period.LABEL });
/** `DashboardToolbar` puts the meta span right after the `h1` (`kit/dashboard-layout.tsx:42-46`). */
const metaLine = (page: Page) => page.locator('h1').locator('xpath=following-sibling::span');
const updatingBar = (page: Page) => page.locator(`output[aria-label="${B.UPDATING}"]`);
const lane = (page: Page, risk: string) => board(page).getByRole('region', { name: risk });
const laneCards = (page: Page, risk: string) => lane(page, risk).locator('li');
/** The lane head is `<header>`: the risk dot, the `<h2>`, then the count chip (`budget-board.tsx:217-221`). */
const laneHead = (page: Page, risk: string) => lane(page, risk).locator('header');
/** The unbudgeted head is a `GroupToggle` button whose last span is the count chip (`budget-unbudgeted.tsx:85-92`). */
const unbudgetedCount = (page: Page) => unbudgetedToggle(page).locator('span').last();
/** `ProjectBudgetPortfolio` draws one `<li>` per unit, directly under its own `<ul>` (`budget-portfolio.tsx:205-224`). */
const meters = (page: Page) => portfolio(page).locator(':scope > ul > li');
const menuOption = (page: Page, name: string) => page.getByRole('menuitemcheckbox', { name, exact: true });

const rangeOf = (call: ServedCall) => `${call.params.get('startDate')}..${call.params.get('endDate')}`;
const rangesOf = (calls: ServedCall[]) => [...new Set(calls.map(rangeOf))];
/** A filter is applied to the loaded rows; it must never appear in a read's query (`filteredBudgetRowsOf` :476-478). */
const FILTER_KEYS = ['projectIds', 'employeeIds', 'teamIds', 'budgetTypes', 'risks'];
const filterParamsOf = (calls: ServedCall[]) => FILTER_KEYS.filter((key) => calls.some((call) => call.params.has(key)));
const hrefsOf = (page: Page, scope: ReturnType<typeof board>) =>
	scope.locator('a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));

/** The browser's own clock and zone: today, the whole-project bounds, this month, last month, a custom range. */
function browserClock(page: Page) {
	return page.evaluate(() => {
		const now = new Date();
		const key = (date: Date) =>
			`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
		const from = (year: number, month: number, day: number) => new Date(year, month, day, 0, 0, 0, 0);
		const to = (year: number, month: number, day: number) => new Date(year, month, day, 23, 59, 59, 999);
		const periodText = (start: Date, end: Date) =>
			new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).formatRange(start, end);
		const year = now.getFullYear();
		const month = now.getMonth();
		const monthStart = from(year, month, 1);
		const monthEnd = to(year, month, new Date(year, month + 1, 0).getDate());
		const previousStart = from(year, month - 1, 1);
		const previousEnd = to(year, month, 0);
		// The 10th and the 14th are in the month the calendar opens on (`defaultMonth={value.from}`,
		// `period-picker.tsx:156`) on every day of the year, and never among its outside days (`showOutsideDays`
		// fills at most six days on each side), so one button carries each number. Days counted back from today
		// would fall in the previous month during the first week of a month.
		const customStart = from(year, month, 10);
		const customEnd = to(year, month, 14);
		return {
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			todayKey: key(now),
			wholeFrom: new Date(2000, 0, 1, 0, 0, 0, 0).toISOString(),
			wholeTo: to(year, month, now.getDate()).toISOString(),
			monthFrom: monthStart.toISOString(),
			monthTo: monthEnd.toISOString(),
			monthFromKey: key(monthStart),
			monthToKey: key(monthEnd),
			monthText: periodText(monthStart, monthEnd),
			previousFrom: previousStart.toISOString(),
			previousTo: previousEnd.toISOString(),
			previousText: periodText(previousStart, previousEnd),
			customFromDay: String(customStart.getDate()),
			customToDay: String(customEnd.getDate()),
			customFrom: customStart.toISOString(),
			customTo: customEnd.toISOString(),
			customText: periodText(customStart, customEnd)
		};
	});
}

/** Every lane the board draws, with the cards in the order drawn and the figures each card prints (`probe-1.log`). */
const LANES = [
	{
		risk: B.RISK_OVER,
		count: 2,
		cards: [
			{
				name: 'Row pb-over-hours',
				type: B.TYPE_HOURS,
				spent: '9h 45m',
				budget: '/ 6h',
				used: '163%',
				rest: over('3h 45m')
			},
			{
				name: 'Row pb-over-cost',
				type: costIn('EUR'),
				spent: '€640.00',
				budget: '/ €500.00',
				used: '128%',
				rest: over('€140.00')
			}
		]
	},
	{
		risk: B.RISK_NEAR,
		count: 1,
		cards: [
			{
				name: 'Row pb-near-hours',
				type: B.TYPE_HOURS,
				spent: '7h 30m',
				budget: '/ 8h',
				used: '94%',
				rest: left('0h 30m')
			}
		]
	},
	{
		risk: B.RISK_WITHIN,
		count: 5,
		cards: [
			{
				name: 'Row pb-within-hours-2',
				type: B.TYPE_HOURS,
				spent: '3h 0m',
				budget: '/ 4h',
				used: '75%',
				rest: left('1h 0m')
			},
			{
				name: B.UNNAMED_PROJECT,
				type: B.TYPE_HOURS,
				spent: '1h 30m',
				budget: '/ 3h',
				used: '50%',
				rest: left('1h 30m')
			},
			{
				name: 'Row pb-within-hours',
				type: B.TYPE_HOURS,
				spent: '4h 30m',
				budget: '/ 10h',
				used: '45%',
				rest: left('5h 30m')
			},
			{
				name: 'Row pb-nocurrency-cost',
				type: costIn('USD'),
				spent: '$40.00',
				budget: '/ $100.00',
				used: '40%',
				rest: left('$60.00')
			},
			{
				name: 'Row pb-within-cost',
				type: costIn('USD'),
				spent: '$300.50',
				budget: '/ $1,200.00',
				used: '25%',
				rest: left('$899.50')
			}
		]
	},
	{
		risk: B.RISK_NO_TIME,
		count: 2,
		cards: [
			{
				name: 'Listed pb-listed-cost',
				type: costIn('USD'),
				spent: '$0.00',
				budget: '/ $900.00',
				used: '0%',
				rest: left('$900.00')
			},
			{
				name: 'Listed pb-listed-hours',
				type: B.TYPE_HOURS,
				spent: '0h 0m',
				budget: '/ 20h',
				used: '0%',
				rest: left('20h 0m')
			}
		]
	}
];

test.describe('lane-a · Reports › Project budget: what the page shows and sends', () => {
	/* --------------------------------------- 1. nothing to show --------------------------------------- */

	test('1 · no project: title, trail, meta, both empty blocks, a disabled export, and the one read it sent', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = await openReport(page, fixture, { rows: [] });
		const clock = await browserClock(page);

		await expect(page.getByRole('heading', { level: 1, name: B.TITLE })).toHaveCount(1);
		const crumbs = page.locator('nav[aria-label="breadcrumb"] a');
		await expect(crumbs).toHaveCount(2);
		await expect(crumbs.nth(0)).toHaveAttribute('href', '/');
		await expect(crumbs.nth(0)).toHaveText(EN.common.REPORTS);
		await expect(crumbs.nth(1)).toHaveAttribute('href', PAGE_PATH);
		await expect(crumbs.nth(1)).toHaveText(B.TITLE);

		await expect(metaLine(page)).toHaveText(projectsMeta(0));

		// Both portfolio rows are placeholders: a dash and why (`budget-portfolio.tsx:152-164`, `:213-227`)
		await expect(meters(page)).toHaveCount(2);
		for (const text of [B.HOURS_BUDGETS, B.NO_HOURS_BUDGET, B.COST_BUDGETS, B.NO_COST_BUDGET]) {
			await expect(portfolio(page).getByText(text, { exact: true })).toHaveCount(1);
		}
		await expect(portfolio(page).getByText('–', { exact: true })).toHaveCount(2);

		// The board is the empty block with its action (`budget-board.tsx:318-324` → `project-budget-table.tsx:192-207`)
		for (const text of [B.EMPTY_TITLE, B.EMPTY_MESSAGE]) {
			await expect(board(page).getByText(text, { exact: true })).toHaveCount(1);
		}
		await expect(board(page).getByRole('link', { name: B.GO_TO_PROJECTS })).toHaveAttribute('href', '/projects');

		await expect(unbudgeted(page)).toHaveCount(0);
		await expect(exportButton(page)).toBeDisabled();
		await expect(filterButton(page)).toHaveCount(1);
		expect(consoleFindings(shield), 'the empty page printed a console error').toEqual([]);

		const params = calls.at(-1)?.params;
		expect(params?.get('tenantId')).toBe(fixture.ids.tenantA);
		expect(params?.get('organizationId')).toBe(fixture.ids.organizationA);
		// `wholeProjectPeriodOf` (`project-budget.ts:119-124`): 2000-01-01 local → today 23:59:59.999 local
		expect(params?.get('startDate'), 'the whole-project range does not start on 2000-01-01 local').toBe(
			clock.wholeFrom
		);
		expect(params?.get('endDate'), 'the whole-project range does not end at today 23:59:59.999 local').toBe(
			clock.wholeTo
		);
		expect(params?.get('timeZone')).toBe(clock.timeZone);
		expect(params?.get('projectIds'), 'the report asks for every project, not a list').toBeNull();
		expect(params?.get('employeeIds')).toBeNull();
		expect(params?.get('teamIds')).toBeNull();

		report('1 empty', {
			meta: flat(await metaLine(page).innerText()),
			portfolio: flat(await portfolio(page).innerText()),
			board: flat(await board(page).innerText()),
			unbudgetedCount: await unbudgeted(page).count(),
			exportDisabled: await exportButton(page).isDisabled(),
			reads: calls.length,
			ranges: rangesOf(calls),
			consoleErrors: shield.consoleErrors().length
		});
	});

	/* --------------------------------------- 2. the risk board --------------------------------------- */

	test('2 · the board: four lanes, every card as printed, sorted by the share used, the pill beside it', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = await openReport(page, fixture, { rows: REPORT_ROWS }, { listed: listedProjects(fixture) });

		for (const entry of LANES) {
			await expect(lane(page, entry.risk)).toHaveCount(1);
			await expect(lane(page, entry.risk).getByRole('heading', { level: 2, name: entry.risk })).toHaveCount(1);
			await expect(laneHead(page, entry.risk).locator('span').last()).toHaveText(String(entry.count));
			await expect(laneCards(page, entry.risk)).toHaveCount(entry.count);
			for (let index = 0; index < entry.cards.length; index += 1) {
				const card = entry.cards[index];
				const cardLocator = laneCards(page, entry.risk).nth(index);
				await expect(cardLocator).toContainText(card.name);
				await expect(cardLocator).toContainText(card.type);
				await expect(cardLocator).toContainText(card.spent);
				await expect(cardLocator).toContainText(card.budget);
				await expect(cardLocator).toContainText(shareUsed(card.used));
				await expect(cardLocator).toContainText(card.rest);
			}
		}

		// Only the project the reader is on leads anywhere; the private one is not on the board at all
		await expect(board(page).locator('a[href="/projects/pb-over-hours"]')).toHaveCount(1);
		await expect(board(page).locator('a[href="/projects/pb-hidden-keep"]')).toHaveCount(0);
		await expect(metaLine(page)).toHaveText(projectsMeta(10));

		// The members line exists only for a listed project that carried members: `CardPeople` returns null without a
		// numeric `membersCount` (`budget-board.tsx:120-124`), so the cost card renders no members block (`div.min-h-6`)
		await expect(laneCards(page, B.RISK_NO_TIME).nth(1).locator('div.min-h-6')).toHaveCount(1);
		await expect(laneCards(page, B.RISK_NO_TIME).nth(1)).toContainText(
			msg('dashboard.projectBudget.MEMBERS_COUNT', { count: 0 })
		);
		await expect(laneCards(page, B.RISK_NO_TIME).nth(0).locator('div.min-h-6')).toHaveCount(0);

		// 20 pill segments inside one `aria-hidden` wrapper: the words beside it carry the figure (`PILL_SEGMENT_COUNT` :592)
		await expect(laneCards(page, B.RISK_OVER).nth(0).locator('span[aria-hidden="true"].h-3 > span')).toHaveCount(
			20
		);
		// the board is cards, not a table: `ProjectBudgetTable` is rendered nowhere (finding 1)
		await expect(page.getByRole('table')).toHaveCount(0);
		expect(consoleFindings(shield), 'the board printed a console error').toEqual([]);

		report('2 board', {
			heads: await Promise.all(
				LANES.map((entry) =>
					laneHead(page, entry.risk)
						.innerText()
						.then((value) => flat(value))
				)
			),
			cards: await Promise.all(
				LANES.map((entry) =>
					laneCards(page, entry.risk).evaluateAll((nodes) =>
						nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
					)
				)
			),
			meta: flat(await metaLine(page).innerText()),
			boardLinks: await hrefsOf(page, board(page)),
			pillSegments: await laneCards(page, B.RISK_OVER)
				.nth(0)
				.locator('span[aria-hidden="true"].h-3 > span')
				.count(),
			reads: calls.length,
			ranges: rangesOf(calls)
		});
	});

	/* --------------------------------------- 3. the portfolio ---------------------------------------- */

	test('3 · the portfolio: one meter per unit, hours first, never added across units, a capped legend', async ({
		page,
		fixture
	}) => {
		await openReport(page, fixture, { rows: REPORT_ROWS }, { listed: listedProjects(fixture) });

		// hours first, then USD, then EUR (`byHoursThenBudget` :554-564)
		await expect(meters(page)).toHaveCount(3);

		// 6 hours projects = 5 budgeted reported rows + 1 listed budgeted row; nothing is added across units
		const hours = meters(page).nth(0);
		for (const text of [B.HOURS_BUDGETS, projectsCount(6), '26h 15m', '/ 51h', shareUsed('51%'), left('24h 45m')]) {
			await expect(hours).toContainText(text);
		}
		// the legend names the three biggest spends and counts the rest (`PORTFOLIO_LEGEND_SIZE` :662)
		for (const name of ['Row pb-over-hours', 'Row pb-near-hours', 'Row pb-within-hours']) {
			await expect(hours).toContainText(name);
		}
		await expect(hours).toContainText(msg('dashboard.projectBudget.PORTFOLIO_OTHERS', { count: 2 }));
		await expect(hours).toContainText('4h 30m');
		await expect(hours).not.toContainText('Row pb-within-hours-2');

		// 3 USD projects: the two that carry USD, plus the one whose currency came from the organisation
		const usd = meters(page).nth(1);
		for (const text of [
			msg('dashboard.projectBudget.COST_BUDGETS_IN', { currency: 'USD' }),
			projectsCount(3),
			'$340.50',
			'/ $2,200.00',
			shareUsed('15%'),
			left('$1,859.50')
		]) {
			await expect(usd).toContainText(text);
		}

		// EUR stays its own total: a cost is never added to the USD one or to the hours one (`budgetTotalsOf` :567-590)
		const eur = meters(page).nth(2);
		for (const text of [
			msg('dashboard.projectBudget.COST_BUDGETS_IN', { currency: 'EUR' }),
			projectsCount(1),
			'€640.00',
			'/ €500.00',
			shareUsed('128%'),
			over('€140.00')
		]) {
			await expect(eur).toContainText(text);
		}
		await expect(eur).not.toContainText('$');

		// the cost note: the mock's organisation states no rate rule, so `costNoteKeyOf(null)` picks the plain one
		await expect(portfolio(page).getByText(B.COST_NOTE)).toHaveCount(1);
		await expect(portfolio(page).getByText(B.PERIOD_NOTE)).toHaveCount(0);

		report('3 portfolio', {
			meters: await meters(page).evaluateAll((nodes) =>
				nodes.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())
			),
			legendCounts: await Promise.all(
				[0, 1, 2].map(async (index) => meters(page).nth(index).locator('ul > li').count())
			)
		});
	});

	/* --------------------------------------- 4. the unbudgeted section ------------------------------- */

	test('4 · projects tracked without a budget: closed under a full board, open when the board is empty', async ({
		page,
		fixture
	}) => {
		const script: ReportScript = { rows: REPORT_ROWS };
		const projectsScript: ProjectsScript = { items: listedProjects(fixture) };
		serveReport(page, script);
		serveProjects(page, projectsScript);
		await signInAndVisit(page, fixture, PAGE_PATH);

		// the board has rows, so the section is there, closed, with its note and its count (`isOpenByDefault={!hasBoardRows}`)
		await expect(unbudgeted(page)).toHaveCount(1);
		await expect(unbudgetedCount(page)).toHaveText('2');
		await expect(unbudgeted(page).getByText(B.UNBUDGETED_NOTE)).toHaveCount(1);
		await expect(unbudgetedToggle(page)).toHaveAttribute('aria-expanded', 'false');
		await expect(unbudgetedRows(page)).toHaveCount(0);

		await unbudgetedToggle(page).click();
		await expect(unbudgetedToggle(page)).toHaveAttribute('aria-expanded', 'true');
		await expect(unbudgetedRows(page)).toHaveCount(2);
		// the same sort as every lane: no share to sort by, so by name (`budgetGroupsOf` :487-507)
		await expect(unbudgetedRows(page).nth(0)).toContainText(EN.common.PRIVATE_PROJECT);
		await expect(unbudgetedRows(page).nth(0)).toContainText('1h 30m');
		await expect(unbudgetedRows(page).nth(1)).toContainText('Row pb-unbudgeted');
		await expect(unbudgetedRows(page).nth(1)).toContainText('2h 15m');
		await expect(unbudgeted(page).getByText(B.COLUMN_SPENT, { exact: true })).toHaveCount(2);
		// only the project the reader is on leads anywhere (`budget-unbudgeted.tsx:52-64`)
		expect(await hrefsOf(page, unbudgeted(page))).toEqual(['/projects/pb-unbudgeted']);
		await expect(unbudgeted(page).getByRole('img', { name: EN.common.PRIVATE_PROJECT_HINT })).toHaveCount(1);

		// an empty board opens it instead, and the board above it still says no project has a budget
		script.rows = [
			{
				project: { id: 'pb-u1', name: 'Row pb-u1' },
				budgetType: 'hours',
				budget: 0,
				spent: 3,
				remainingBudget: 0,
				spentPercentage: 0
			},
			{
				project: { id: 'pb-u2', name: 'Row pb-u2' },
				budgetType: 'hours',
				budget: 0,
				spent: 1,
				remainingBudget: 0,
				spentPercentage: 0
			}
		];
		// the same stub, but with no budgeted project left in the list, so nothing lands in "No time yet" and the
		// board is empty: only the mock's own fixture project remains and it carries no budget
		// (`mock-gauzy-server.mjs:226-238`, `budgetRowsOf` :449-458)
		projectsScript.items = listedProjects(fixture).slice(0, 1);
		await hardVisit(page, PAGE_PATH);
		await expect(board(page).getByText(B.EMPTY_TITLE)).toHaveCount(1);
		await expect(metaLine(page)).toHaveText(projectsMeta(0));
		await expect(unbudgetedToggle(page)).toHaveAttribute('aria-expanded', 'true', { timeout: 20_000 });
		await expect(unbudgetedRows(page)).toHaveCount(2);
		await expect(unbudgetedRows(page).nth(0)).toContainText('Row pb-u1');
		await expect(unbudgetedRows(page).nth(0)).toContainText('3h 0m');
		await expect(unbudgetedRows(page).nth(1)).toContainText('Row pb-u2');
		await expect(unbudgetedRows(page).nth(1)).toContainText('1h 0m');
		// rows without a budget are still exportable (`hasRows`, `project-budget-page.tsx:50-51`)
		await expect(exportButton(page)).toBeEnabled();

		report('4 unbudgeted', {
			toggleOnFullBoard: 'false then true',
			toggleOnEmptyBoard: await unbudgetedToggle(page).getAttribute('aria-expanded'),
			rows: await unbudgetedRows(page).evaluateAll((nodes) =>
				nodes.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())
			),
			exportDisabled: await exportButton(page).isDisabled()
		});
	});

	/* --------------------------------------- 5. the private project (CORE-27) ------------------------ */

	test('5 · a project the API keeps from the reader: "Private project", the lock, no link, nothing else of it', async ({
		page,
		fixture
	}) => {
		await openReport(page, fixture, { rows: REPORT_ROWS }, { listed: listedProjects(fixture) });
		await unbudgetedToggle(page).click();

		await expect(unbudgeted(page).getByText(EN.common.PRIVATE_PROJECT, { exact: true })).toHaveCount(1);
		await expect(unbudgeted(page).getByRole('img', { name: EN.common.PRIVATE_PROJECT_HINT })).toHaveCount(1);
		// the name leads nowhere; the project the reader is on leads to its page
		await expect(unbudgeted(page).getByRole('link', { name: EN.common.PRIVATE_PROJECT })).toHaveCount(0);
		expect(await hrefsOf(page, unbudgeted(page))).toEqual(['/projects/pb-unbudgeted']);
		// its name, its colour, its id: none of it reached the page (`hiddenRowOf` :337-350)
		const html = await page.content();
		expect(html.includes('pb-hidden-keep'), 'the id of a project kept from the reader reached the page').toBe(
			false
		);
		expect(html.includes('Hidden Probe Project'), 'a private project name reached the page').toBe(false);
		// and it is not drawn on the board, because the API gave it no budget to measure against
		await expect(board(page).getByText(EN.common.PRIVATE_PROJECT)).toHaveCount(0);

		report('5 private project', {
			rows: await unbudgetedRows(page).evaluateAll((nodes) =>
				nodes.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())
			),
			links: await hrefsOf(page, unbudgeted(page)),
			locks: await unbudgeted(page).getByRole('img', { name: EN.common.PRIVATE_PROJECT_HINT }).count(),
			privateLinks: await unbudgeted(page).getByRole('link', { name: EN.common.PRIVATE_PROJECT }).count(),
			idInHtml: html.includes('pb-hidden-keep')
		});
	});

	/* --------------------------------------- 6. a long lane, and a reload ---------------------------- */

	test('6 · a lane longer than eight cards: "Show 1 more project", "Show fewer", a reload that forgets it', async ({
		page,
		fixture
	}) => {
		const rows: ServedReportRow[] = Array.from({ length: 9 }, (_, index) => ({
			project: { id: `pb-many-${index}`, name: `Row pb-many-${index}` },
			budgetType: 'hours',
			budget: 10,
			spent: 1 + index * 0.1,
			remainingBudget: 0,
			spentPercentage: 0
		}));
		await openReport(page, fixture, { rows });

		const showMore = msg('dashboard.projectBudget.LANE_SHOW_MORE', { count: 1 });
		const toggle = lane(page, B.RISK_WITHIN).getByRole('button', { name: showMore, exact: true });
		await expect(laneCards(page, B.RISK_WITHIN)).toHaveCount(8); // LANE_PREVIEW_SIZE (`budget-board.tsx:32`)
		await expect(toggle).toHaveCount(1);
		await toggle.click();
		await expect(laneCards(page, B.RISK_WITHIN)).toHaveCount(9);
		await expect(
			lane(page, B.RISK_WITHIN).getByRole('button', { name: B.LANE_SHOW_FEWER, exact: true })
		).toHaveCount(1);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(laneCards(page, B.RISK_WITHIN)).toHaveCount(8, { timeout: 20_000 });
		await expect(lane(page, B.RISK_WITHIN).getByRole('button', { name: showMore, exact: true })).toHaveCount(1);
		const stored = await page.evaluate(() => Object.keys(window.localStorage));
		expect(
			stored.some((key) => key.includes('budget') || key.includes('lane')),
			'a budget or lane key was stored'
		).toBe(false);

		report('6 lane toggle', {
			showMore,
			afterReload: await laneCards(page, B.RISK_WITHIN).count(),
			storageKeys: stored
		});
	});

	/* --------------------------------------- 7. whole project vs period ------------------------------ */

	test('7 · whole project vs period: what the meta gains, what the picker sends, the updating bar', async ({
		page,
		fixture
	}) => {
		const script: ReportScript = { rows: REPORT_ROWS };
		const calls = await openReport(page, fixture, script, { listed: listedProjects(fixture) });
		const clock = await browserClock(page);
		const wholeRange = `${clock.wholeFrom}..${clock.wholeTo}`;

		await expect(scopeTabs(page).getByRole('tab', { name: B.SCOPE_WHOLE })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(scopeTabs(page).getByRole('tab', { name: B.SCOPE_PERIOD })).toHaveAttribute(
			'aria-selected',
			'false'
		);
		// whole scope names the projects only; the period scope adds the period before them (`metaOf`, page.tsx:28-34)
		await expect(metaLine(page)).toHaveText(projectsMeta(10));
		await expect(periodGroup(page)).toHaveCount(0);

		script.delayMs = 4_000; // long enough to catch the bar the second read raises
		await scopeTabs(page).getByRole('tab', { name: B.SCOPE_PERIOD }).click();
		await expect(updatingBar(page)).toHaveCount(1); // `isUpdating` while the new period reads; the bar has no text
		await expect(periodGroup(page)).toHaveCount(1);
		await expect(updatingBar(page)).toHaveCount(0, { timeout: 20_000 });

		await expect(metaLine(page)).toHaveText(`${clock.monthText} · ${projectsMeta(10)}`, { timeout: 20_000 });
		expect(rangesOf(calls)).toContain(wholeRange);
		await expect.poll(() => rangesOf(calls), { timeout: 20_000 }).toContain(`${clock.monthFrom}..${clock.monthTo}`);

		await periodGroup(page).getByRole('button', { name: EN.dashboard.period.PREVIOUS }).click();
		await expect(metaLine(page)).toHaveText(`${clock.previousText} · ${projectsMeta(10)}`, { timeout: 20_000 });
		await expect
			.poll(() => rangesOf(calls), { timeout: 20_000 })
			.toContain(`${clock.previousFrom}..${clock.previousTo}`);

		await periodGroup(page).getByRole('button', { name: EN.dashboard.period.NEXT }).click();
		await expect(metaLine(page)).toHaveText(`${clock.monthText} · ${projectsMeta(10)}`, { timeout: 20_000 });

		report('7 scope and period', {
			wholeMeta: projectsMeta(10),
			periodMeta: flat(await metaLine(page).innerText()),
			ranges: rangesOf(calls),
			notes: await portfolio(page)
				.locator('p')
				.evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim()))
		});
	});

	/* --------------------------------------- 8. a custom range from the calendar --------------------- */

	test('8 · a custom range picked in the calendar: the new dates in the meta and in the query', async ({
		page,
		fixture
	}) => {
		const calls = await openReport(page, fixture, { rows: REPORT_ROWS }, { listed: listedProjects(fixture) });
		const clock = await browserClock(page);

		await scopeTabs(page).getByRole('tab', { name: B.SCOPE_PERIOD }).click();
		await expect(metaLine(page)).toHaveText(`${clock.monthText} · ${projectsMeta(10)}`, { timeout: 20_000 });
		// the picker is [previous arrow, the period button, next arrow]: `kit/period-picker.tsx`
		await periodGroup(page).getByRole('button', { name: EN.common.THIS_MONTH, exact: true }).click();
		const grid = page.getByRole('grid').first(); // react-day-picker v8 draws the month as `<table role="grid">`
		await expect(grid).toHaveCount(1);
		await grid
			.locator('button')
			.filter({ hasText: new RegExp(`^${clock.customFromDay}$`) })
			.first()
			.click();
		await grid
			.locator('button')
			.filter({ hasText: new RegExp(`^${clock.customToDay}$`) })
			.first()
			.click();

		await expect(metaLine(page)).toHaveText(`${clock.customText} · ${projectsMeta(10)}`, { timeout: 20_000 });
		await expect
			.poll(() => rangesOf(calls), { timeout: 20_000 })
			.toContain(`${clock.customFrom}..${clock.customTo}`);
		await expect(laneCards(page, B.RISK_OVER)).toHaveCount(2, { timeout: 20_000 });

		report('8 custom range', {
			meta: flat(await metaLine(page).innerText()),
			from: clock.customFrom,
			to: clock.customTo,
			ranges: rangesOf(calls)
		});
	});

	/* --------------------------------------- 9. the filters ------------------------------------------ */

	test('9 · the filter menu narrows the rows already loaded, chips name what it applied, Clear undoes it', async ({
		page,
		fixture
	}) => {
		const calls = await openReport(page, fixture, { rows: REPORT_ROWS }, { listed: listedProjects(fixture) });
		const clock = await browserClock(page);
		await expect.poll(() => calls.length).toBeGreaterThan(0);

		await filterButton(page).click();
		for (const label of [B.FILTER_PROJECTS, B.FILTER_BUDGET_TYPE, B.FILTER_STATUS]) {
			await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveCount(1);
		}

		// Status: the four board lanes plus the unbudgeted one
		await page.getByRole('menuitem', { name: B.FILTER_STATUS, exact: true }).click();
		for (const option of [B.RISK_OVER, B.RISK_NEAR, B.RISK_WITHIN, B.RISK_NO_TIME, B.RISK_NO_BUDGET]) {
			await expect(menuOption(page, option)).toHaveCount(1);
		}
		await menuOption(page, B.RISK_OVER).click();
		// two Escapes: the submenu, then the root menu — an open menu portal intercepts the next click
		// (`suites/lane-c/payments-due-report-ui.spec.ts:1331-1332`)
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');

		await expect(metaLine(page)).toHaveText(projectsMeta(2));
		await expect(laneCards(page, B.RISK_OVER)).toHaveCount(2);
		for (const risk of [B.RISK_NEAR, B.RISK_WITHIN, B.RISK_NO_TIME]) {
			await expect(laneCards(page, risk)).toHaveCount(0);
			await expect(lane(page, risk).getByText(B.LANE_EMPTY, { exact: true })).toHaveCount(1);
		}
		await expect(page.getByRole('button', { name: removeChip(B.RISK_OVER), exact: true })).toHaveCount(1);
		await expect(exportButton(page)).toBeEnabled();

		// narrowing sent nothing: no read carries a filter parameter, and the read this page opened with is the
		// whole-scope one (finding 8: the live report can repeat it, so no count is pinned)
		expect(filterParamsOf(calls), 'a filter was sent to the report read').toEqual([]);
		expect(rangesOf(calls)).toContain(`${clock.wholeFrom}..${clock.wholeTo}`);

		await page.getByRole('button', { name: EN.common.CLEAR_FILTERS, exact: true }).click();
		await expect(metaLine(page)).toHaveText(projectsMeta(10));
		await expect(page.getByRole('button', { name: removeChip(B.RISK_OVER), exact: true })).toHaveCount(0);

		// Budget type: the hours projects only
		await filterButton(page).click();
		await page.getByRole('menuitem', { name: B.FILTER_BUDGET_TYPE, exact: true }).click();
		await expect(menuOption(page, B.TYPE_HOURS)).toHaveCount(1);
		await expect(menuOption(page, B.TYPE_COST)).toHaveCount(1);
		await menuOption(page, B.TYPE_HOURS).click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect(metaLine(page)).toHaveText(projectsMeta(6));
		await expect(page.getByRole('button', { name: removeChip(B.TYPE_HOURS), exact: true })).toHaveCount(1);
		await page.getByRole('button', { name: EN.common.CLEAR_FILTERS, exact: true }).click();
		await expect(metaLine(page)).toHaveText(projectsMeta(10));

		// Projects: one project, and the unbudgeted section drops out with it
		await filterButton(page).click();
		await page.getByRole('menuitem', { name: B.FILTER_PROJECTS, exact: true }).click();
		await expect(menuOption(page, 'Row pb-near-hours')).toHaveCount(1);
		await menuOption(page, 'Row pb-near-hours').click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect(metaLine(page)).toHaveText(projectsMeta(1));
		await expect(laneCards(page, B.RISK_NEAR)).toHaveCount(1);
		await expect(laneCards(page, B.RISK_NEAR).nth(0)).toContainText('Row pb-near-hours');
		await expect(laneCards(page, B.RISK_NEAR).nth(0)).toContainText(left('0h 30m'));
		await expect(unbudgeted(page)).toHaveCount(0);
		await expect(page.getByRole('button', { name: removeChip('Row pb-near-hours'), exact: true })).toHaveCount(1);

		report('9 filters', {
			ranges: rangesOf(calls),
			filterParams: filterParamsOf(calls),
			chips: await page
				.locator('button[aria-label^="Remove"]')
				.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
			reads: calls.length
		});
	});

	/* --------------------------------------- 10. a link that names one project ----------------------- */

	test('10 · a link that names a project (`?project=`) opens filtered on it and names it from the list', async ({
		page,
		fixture
	}) => {
		const calls = await openReport(
			page,
			fixture,
			{ rows: REPORT_ROWS },
			{ listed: listedProjects(fixture), path: `${PAGE_PATH}?project=${fixture.ids.project}` }
		);
		const clock = await browserClock(page);

		await expect(metaLine(page)).toHaveText(projectsMeta(0));
		// no row matches, so the board is its filtered-empty block with a Clear action (`budget-board.tsx:325-331`)
		for (const text of [B.FILTERED_EMPTY_TITLE, B.FILTERED_EMPTY_MESSAGE]) {
			await expect(board(page).getByText(text, { exact: true })).toHaveCount(1);
		}
		await expect(board(page).getByRole('button', { name: EN.common.CLEAR_FILTERS, exact: true })).toHaveCount(1);
		await expect(unbudgeted(page)).toHaveCount(0);
		await expect(portfolio(page).getByText(B.NO_HOURS_BUDGET, { exact: true })).toHaveCount(1);
		await expect(exportButton(page)).toBeDisabled();
		// the chip names the project from the organisation list even though the scope holds no row for it
		await expect(page.getByRole('button', { name: 'Remove Fixture Project', exact: true })).toHaveCount(1);
		expect(page.url()).toContain(`project=${fixture.ids.project}`);
		expect(calls.length, 'the filtered view read the report at least once').toBeGreaterThanOrEqual(1);
		expect(rangesOf(calls)).toContain(`${clock.wholeFrom}..${clock.wholeTo}`);
		expect(filterParamsOf(calls), 'the link filter was sent to the read instead of applied to the rows').toEqual(
			[]
		);

		report('10 project link', {
			url: page.url(),
			meta: flat(await metaLine(page).innerText()),
			chips: await page
				.locator('button[aria-label^="Remove"]')
				.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
			exportDisabled: await exportButton(page).isDisabled(),
			reads: calls.length,
			ranges: rangesOf(calls)
		});
	});

	/* --------------------------------------- 11. export ---------------------------------------------- */

	test('11 · export: the CSV name and its lines, the PDF name only, in both scopes', async ({ page, fixture }) => {
		await openReport(page, fixture, { rows: REPORT_ROWS }, { listed: listedProjects(fixture) });
		const clock = await browserClock(page);

		await exportButton(page).click();
		await expect(page.getByRole('menuitem', { name: EN.common.PDF, exact: true })).toHaveCount(1);
		await expect(page.getByRole('menuitem', { name: B.CSV, exact: true })).toHaveCount(1);

		const csvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: B.CSV, exact: true }).click();
		const csv = await csvEvent;
		// `fileNameOf` (`project-budget-export.tsx:49-57`): the whole scope names the end day
		expect(csv.suggestedFilename()).toBe(`project-budget-to-${clock.todayKey}.csv`);

		const lines = readFileSync(await csv.path(), 'utf8').split(/\r?\n/);
		// BOM, then `csvColumnsOf` (`:85-100`); values are decimal hours and amounts, and the computed
		// `Remaining` / `Used %` — not the answer's `remainingBudget` / `spentPercentage` (finding 3)
		expect(lines[0]).toBe(
			`\ufeff${[B.COLUMN_PROJECT, B.COLUMN_TYPE, B.CSV_CURRENCY, B.COLUMN_BUDGET, B.COLUMN_SPENT, B.COLUMN_REMAINING, B.CSV_USED, EN.common.STATUS].join(',')}`
		);
		expect(lines.length).toBe(13); // header + the 12 rows, board order then the unbudgeted ones (`rowsInViewOrder` :102-104)
		expect(lines[1]).toBe('Row pb-over-hours,Hours,,6,9.75,-3.75,162.5,Over budget');
		expect(lines[2]).toBe('Row pb-over-cost,Cost,EUR,500,640,-140,128,Over budget');
		expect(lines[3]).toBe('Row pb-near-hours,Hours,,8,7.5,0.5,93.8,Near budget');
		expect(lines[11]).toBe('Private project,Hours,,,1.5,,,Without a budget');
		expect(lines[12]).toBe('Row pb-unbudgeted,Hours,,,2.25,,,Without a budget');

		// the PDF is only named here: no byte of it was read (`:259-265` renders it in the browser)
		await page.keyboard.press('Escape');
		await exportButton(page).click();
		const pdfEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: EN.common.PDF, exact: true }).click();
		const pdf = await pdfEvent;
		expect(pdf.suggestedFilename()).toBe(`project-budget-to-${clock.todayKey}.pdf`);

		// in the period scope the name carries the period instead (`periodFileNameOf`, dashboard-export.ts:63-66)
		await scopeTabs(page).getByRole('tab', { name: B.SCOPE_PERIOD }).click();
		await expect(metaLine(page)).toContainText(clock.monthText, { timeout: 20_000 });
		await page.keyboard.press('Escape');
		await exportButton(page).click();
		const periodCsvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: B.CSV, exact: true }).click();
		const periodCsv = await periodCsvEvent;
		expect(periodCsv.suggestedFilename()).toBe(`project-budget-${clock.monthFromKey}-${clock.monthToKey}.csv`);

		report('11 export', {
			wholeName: csv.suggestedFilename(),
			pdfName: pdf.suggestedFilename(),
			periodName: periodCsv.suggestedFilename(),
			header: lines[0],
			lines: lines.length
		});
	});

	/* --------------------------------------- 12. a refused read -------------------------------------- */

	test('12 · a refused read: the notice in place of the report, its retry, and its own notice for the projects list', async ({
		page,
		fixture,
		shield
	}) => {
		const reportScript: ReportScript = { status: 500 };
		const projectsScript: ProjectsScript = { items: listedProjects(fixture), status: 500 };
		const calls = serveReport(page, reportScript);
		serveProjects(page, projectsScript);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(page.getByText(EN.dashboard.states.ERROR_TITLE)).toHaveCount(1);
		await expect(page.getByText(EN.dashboard.states.ERROR_MESSAGE)).toHaveCount(1);
		await expect(page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN })).toHaveCount(1);
		await expect(board(page)).toHaveCount(0);
		await expect(portfolio(page)).toHaveCount(0);
		await expect(unbudgeted(page)).toHaveCount(0);
		await expect(exportButton(page)).toBeDisabled();
		expect(
			shield.logMatching(new RegExp(`HTTP Error: GET ${REPORT_LOG_PATH}.*500`)).length,
			'the refusal this file armed was not logged by the client'
		).toBeGreaterThan(0);
		expect(
			consoleFindings(shield, [armedRead(REPORT_LOG_PATH, 500), armedRead(PROJECTS_LOG_PATH, 500)]),
			'a console error that was not one of the two refusals this file armed'
		).toEqual([]);

		reportScript.status = undefined;
		reportScript.rows = REPORT_ROWS;
		await page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN }).click();
		await expect(laneCards(page, B.RISK_OVER)).toHaveCount(2, { timeout: 20_000 });
		await expect(exportButton(page)).toBeEnabled();

		// the other read the page makes, refused: the board keeps what was reported and says what is missing
		await expect(page.getByText(B.PROJECTS_ERROR)).toHaveCount(1, { timeout: 20_000 });
		await expect(board(page)).toHaveCount(1);
		await expect(laneCards(page, B.RISK_OVER)).toHaveCount(2);
		// the two listed budgeted projects are gone, so the hours total is 5 projects / 31h instead of 6 / 51h
		await expect(meters(page)).toHaveCount(3);
		await expect(meters(page).nth(0)).toContainText(projectsCount(5));
		await expect(meters(page).nth(0)).toContainText('/ 31h');
		await expect(meters(page).nth(0)).toContainText(shareUsed('85%'));
		await expect(meters(page).nth(0)).toContainText(left('4h 45m'));
		expect(
			shield.logMatching(new RegExp(`HTTP Error: GET ${PROJECTS_LOG_PATH}`)).length,
			'the refused projects list was not logged by the client'
		).toBeGreaterThan(0);

		report('12 refused reads', {
			reportReads: calls.length,
			ranges: rangesOf(calls),
			projectsErrorNotice: await page.getByText(B.PROJECTS_ERROR).count(),
			hoursMeter: flat(await meters(page).nth(0).innerText()),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120))
		});
	});

	/* --------------------------------------- 13. a malformed answer ---------------------------------- */

	test('13 · a malformed answer: a row with no id fails the read like a refusal; a bad number reads as 0', async ({
		page,
		fixture,
		shield
	}) => {
		const script: ReportScript = {
			rows: [
				{
					project: { name: 'Row with no id' },
					budgetType: 'hours',
					budget: 5,
					spent: 2,
					remainingBudget: 0,
					spentPercentage: 0
				}
			]
		};
		const calls = await openReport(page, fixture, script);

		// answered 200, and `projectBudgetReportSchema` (:43-63) rejected it: the same notice as a refused read
		await expect(page.getByText(EN.dashboard.states.ERROR_TITLE)).toHaveCount(1);
		await expect(page.getByText(EN.dashboard.states.ERROR_MESSAGE)).toHaveCount(1);
		await expect(page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN })).toHaveCount(1);
		await expect(board(page)).toHaveCount(0);
		await expect(portfolio(page)).toHaveCount(0);
		await expect(unbudgeted(page)).toHaveCount(0);
		await expect(exportButton(page)).toBeDisabled();
		// nothing was refused here: an answer that fails its schema logs no HTTP error, so nothing is excused
		expect(consoleFindings(shield), 'a validation failure printed a console error this file did not arm').toEqual(
			[]
		);
		expect(
			calls.every((call) => call.params.get('startDate')),
			'the read that failed never reached the mock'
		).toBe(true);

		// a bad *number* is absorbed by the schema's `.catch(0)`: the project simply has no budget, and a type that is
		// not `hours` reads as a cost in the organisation's currency (`budgetTypeOf` :137-142)
		script.rows = [
			{
				project: { id: 'pb-coerce-1', name: 'Row pb-coerce-1' },
				budgetType: 'hours',
				budget: 'not-a-number',
				spent: 'oops',
				remainingBudget: 0,
				spentPercentage: 0
			},
			{
				project: { id: 'pb-coerce-2', name: 'No budget type' },
				budgetType: undefined,
				budget: 12,
				spent: 3,
				remainingBudget: 0,
				spentPercentage: 0
			}
		];
		await hardVisit(page, PAGE_PATH);
		await expect(page.getByText(EN.dashboard.states.ERROR_TITLE)).toHaveCount(0);
		await expect(laneCards(page, B.RISK_WITHIN)).toHaveCount(1, { timeout: 20_000 });
		await expect(laneCards(page, B.RISK_WITHIN).nth(0)).toContainText('No budget type');
		await expect(laneCards(page, B.RISK_WITHIN).nth(0)).toContainText(costIn('USD'));
		await expect(laneCards(page, B.RISK_WITHIN).nth(0)).toContainText('$3.00');
		await expect(laneCards(page, B.RISK_WITHIN).nth(0)).toContainText('/ $12.00');
		await expect(laneCards(page, B.RISK_WITHIN).nth(0)).toContainText(shareUsed('25%'));
		await expect(laneCards(page, B.RISK_WITHIN).nth(0)).toContainText(left('$9.00'));
		for (const risk of [B.RISK_OVER, B.RISK_NEAR, B.RISK_NO_TIME]) {
			await expect(laneCards(page, risk)).toHaveCount(0);
		}
		// the coerced row sits in the unbudgeted section, closed because the board has a row (finding 4)
		await expect(unbudgetedCount(page)).toHaveText('1');
		await expect(unbudgetedToggle(page)).toHaveAttribute('aria-expanded', 'false');
		await expect(meters(page)).toHaveCount(2);
		await expect(meters(page).nth(1)).toContainText(
			msg('dashboard.projectBudget.COST_BUDGETS_IN', { currency: 'USD' })
		);
		await expect(meters(page).nth(1)).toContainText('/ $12.00');

		report('13 malformed', {
			noticeForMissingId: await page.getByText(EN.dashboard.states.ERROR_TITLE).count(),
			reads: calls.length,
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120)),
			boardAfterCoercion: flat(await board(page).innerText()),
			unbudgetedAfterCoercion: flat(await unbudgeted(page).innerText())
		});
	});
});
