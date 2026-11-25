import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { mockReset, signInAndVisit } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in manager sees on **Reports › Payments due** (`/reports/payments-due`,
 * `app/[locale]/(main)/reports/payments-due/page.tsx:10-20` → `core/components/dashboards/payments-due/payments-due-page.tsx`),
 * on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, statistics `4003`, control `4004`, issuer
 * `4005`, `playwright/test-servers.ts:38`). Who may open this page at all is pinned by
 * `suites/lane-a/reports-gate-by-role-ui.spec.ts:233-237`; every case here signs in as the fixture manager, who may.
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `E:\Coding\.tmp\probe-paymentsdue\probe.spec.ts` (P1-P10), `probe2.spec.ts` (Q1-Q6),
 * `probe3.spec.ts` (R1-R4), `probe4.spec.ts` (S1-S3) and `probe5.spec.ts` (T1-T2), run on this lane on 2026-11-25 and
 * logged in `E:\Coding\.tmp\s3-lane-c-paymentsdue-probe-2.log` … `-probe-12.log`. Every value asserted below is one
 * those runs printed. Served days are offsets from the day the run runs on (`localDay`, the pattern of
 * `suites/lane-c/task-views-ui.spec.ts` `dayIso`), every formatted string is rebuilt here from the same offsets and the
 * same `Intl` options the page uses, and no case names today's date. Findings 4, 12 and 13, and the exact boundaries of
 * a range picked from the calendar, came from this spec's own whole-file runs on the same lane,
 * `E:\Coding\.tmp\s3-lane-c-paymentsdue-1.log` … `-6.log` plus the `-fix-1.log` … `-fix-3.log` filtered runs, each read
 * back from its own `MEASURE` line or its own failure diff.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, the shell and its reads, NextAuth, and the mock's own fixtures — the tenant, organization
 * and team ids (`fixture.ids`); the team's three members with their names and their avatar initials
 * (`mock-gauzy-server.mjs:217-224` — a card is named `Fixture Manager` / `Fixture Teammate` / `Fixture Restricted
 * Teammate` even though the day this file served carried its own `user.name`, because `payments-due.ts:186-196` prefers
 * the team's member name); the organization currency `USD` (`mock-gauzy-server.mjs:93`); the fixture role's permissions,
 * which include `ORG_EMPLOYEES_EDIT` (`mock-gauzy-server.mjs:50` → `core/lib/utils/rates.ts:17`
 * `EMPLOYEE_RATES_PERMISSION`, i.e. this viewer *may* read pay rates, which changes what the cards say — test 16).
 * Tests 1 and 2 run with **no stub**: the mock's own handler answers the owed report with a plain `[]`
 * (`cypress/support/mock-gauzy-server.mjs:804-812`), and that is the whole empty page.
 *
 * **Served by this file:** every owed-report answer from test 3 on, through `page.route` on the mock origin (the pattern
 * of `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345` and `suites/lane-c/automations-settings-ui.spec.ts:296-405`),
 * because the mock has no idea what owed time looks like. Each answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`) — the page is on `localhost:3033` and the API on
 * `127.0.0.1:4002`. Where a case filters members, the stub answers **only the `employeeIds` the query asked for**
 * (`honourIds`), which is what a real backend does and is what lets a filter visibly change the cards (test 13).
 * `route.fetch()` is never called, so `mock.calls('/api/timesheet/time-log/report/owed-report')` stays empty in every
 * stubbed test — the witness that the page acted on this file and not on the mock.
 *
 * **The browser talks to the mock, never to the app's route twins** (measured in `probe-3.log` Q1, and test 1 asserts
 * the origin of the read it made): the lane points the client's axios base at `<mock origin>/api`
 * (`test-servers.ts` `laneServers`), so `app/api/**` is not in this file's path.
 *
 * **The pay-rate reads are real.** A day answered with `rateSource: 'pay'` makes the hook ask Gauzy for that member's
 * stored pay rate (`use-payments-due-report.ts:279-280` → `rate.service.ts:80-87`
 * `GET /employee/<id>/pay-rate?organizationId=…&tenantId=…`); the mock has no handler for it, so its catch-all
 * `pagination([])` is what comes back and `employeePayRateSchema` refuses it. Test 16 measures what the card does with
 * that: the amount Gauzy reported stays, and the rate reads `–`.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `payments-due-page.tsx`: `PAGE_PATH` `:28`; the title `:42`; `hasRows = shownGroupCount > 0` `:45`; `isFiltered`
 *   `:46`; `showPreviousPeriod` = `setPeriod(shiftPeriod(period, -1))` `:51-54`; the header meta
 *   `formatPeriod(requestPeriod) · MEMBERS_COUNT(populationCount)` `:56-58`; `isExportDisabled = !hasRows || isLoading`
 *   `:59`; `showsReport = !showsError && !showsNoMembers` `:60`; the breadcrumb `:62-65`; `ExportMenu` `:79`;
 *   `PeriodPicker` `:82-87`; `MemberFilterMenu` `:88-93`; `PaymentsGroupingControl` `:97`; `AppliedMemberFilters`
 *   `:100-105`; `DashboardErrorNotice onRetry={report.refetch}` `:111`; the `showsNoMembers` branch `:112-119`; the
 *   tiles `:122-126`; the unpriced callout `:127`; the statements `:128-143` with `PaymentsDueEmpty` as their `empty`
 *   `:136-141`.
 * - `core/hooks/dashboards/payments-due/use-payments-due-report.ts`: the period starts at
 *   `periodOfPreset('thisMonth', PAYMENTS_WEEK_START)` `:222` (`payments-due.ts:18` `PAYMENTS_WEEK_START = 1`, Monday),
 *   the grouping at `'member'` `:223`; `reportedEmployeeIdsOf` `:142-147` (the applied ids, else every team member), used
 *   at `:236`; the request range `:242-250` (the period's `from`/`to` plus the **sorted** employee ids);
 *   `enabled = hasScope && hasMembers` `:252-254`; `placeholderData: previousOfSameScope` `:270` and
 *   `liveQueryOptionsOf(isLive)` `:271` (`core/lib/utils/dashboard-live.ts`: a period holding today is read with
 *   `staleTime` 30 s and `refetchInterval` 60 s); `payLineEmployeeIdsOf` → `useEmployeePayRates` `:279-280`;
 *   `populationCount` `:369`; `showsError = query.isError && !hasData` `:345`.
 * - `core/services/client/api/timesheets/time-log-report.service.ts`: `rangeParamsOf` `:52-70` (`tenantId`,
 *   `organizationId`, `startDate`/`endDate` as ISO, `timeZone`, `employeeIds`, and `projectIds`/`teamIds` only when set)
 *   and `getOwedAmountReport` `:125-131` → `GET /timesheet/time-log/report/owed-report?<query>`, validated with
 *   `owedReportDaySchema.array()` (`core/types/schemas/timer/time-log-reports.schema.ts:26-41`: `date` a string,
 *   `employees[]` with a **nullable** `employee`, `amount` coerced with a `catch 0`, `duration` coerced and clamped to
 *   ≥ 0 with a `catch 0`, `rateSource`, `currency`; `:16-24` `owedReportEmployeeSchema`: `id`, `userId`,
 *   `billRateValue` a coerced nullable number, `billRateCurrency`, `user`).
 * - `core/lib/utils/dashboards/payments-due.ts`: `rateOf` (`≤ 0` → `null`) `:117-123`; `nameOf` `:186-196`;
 *   `lineCurrencyOf` `:358-367` (the entry's currency, else `null` for a pay line, else the employee's
 *   `billRateCurrency` or the organization's); `linePriceOf` `:379-401` (a **billing** line states the rate that gives
 *   its amount — `lineRateOf` `:251-271` — and no amount without a rate; a **pay** line states the reported amount and
 *   its stored pay rate, pending while unread); `rateNoteOf` `:295-305` (`payRateNotSet` for a billing line when the
 *   viewer reads pay rates); `rateShownOf` `:319-340` (`several` / `rate` / `loading` / `hidden` for a pay line whose
 *   rate could not be read / `noRate`); `payLineEmployeeIdsOf` `:343-356`; `owedLinesOf` `:400-459` (one line per
 *   `date:employee:rateSource:currency`, key at `:452-457`); `memberGroupKeyOf` `:638-640`; `withLineRate` (several
 *   rates) `:664-678`; `compareOwedFigures` `:613-628` (priced first, then currency, then amount; unpriced by seconds);
 *   `dayGroupsOf` `:711-738` (newest day first); `formatOwed` `:806-810`; `decimalHoursOf` `:829-833`;
 *   `roundedAmountOf` `:835-838`; `dayNameOf` `:857-865` (Today / Yesterday, else the short weekday);
 *   `owedExportRowsOf` `:893-902` (the lines, then one total row per member); `owedTilesOf` `:1006-1027`;
 *   `statementSectionsOf` `:1058-1069`.
 * - Statements: `payments-due-statements.tsx` (the title per grouping `:32-34`, `Expand all` / `Collapse all` `:78-80`,
 *   `trackedMetaOf` = `<count> · <duration> tracked` `:83-93`, `SectionHeading` `:135-145`, `showsHeadings =
 *   pricedSections.length > 1` `:165-171`); `payments-due-statement-card.tsx` (`VISIBLE_STATEMENT_LINES = 5` imported at
 *   `:39` from `payments-due-statement-recipes.ts:37`, folded at `:136-150`, `MemberStatementFooter` `:192-211`,
 *   `DayTrackedFigure` `:253-268`, `DaySubtotalAmounts` `:271-283`, the member card's aria `statements.MEMBER_LABEL`
 *   `:228`, the day card's `{weekday:'long', month:'long', day:'numeric'}` day `:320-325`); `payments-due-cells.tsx`
 *   (`MISSING_FIGURE = '–'` `:18`, `useBillingRateNote` `:21-30`, `metaWithNote` `:33-41`, `NoRateChip` `:45`,
 *   `SeveralRates` `:68`, `RateValue` + `HOUR_UNIT` `:81-115`, `OwedFormula` `:140-158`, `DayName` `:164-175`);
 *   `payments-due-balance-tiles.tsx` (the section's aria `tiles.LABEL` `:232`, an article per currency named
 *   `figures.OWED_IN` `:125`, `UnpricedTile` `:162-175` with `figures.NOT_PRICED` `:158`, `OwedNote` `:177`);
 *   `payments-due-unpriced-callout.tsx:13-33` (`NO_RATES_TITLE` when nothing is priced, else
 *   `statements.UNPRICED_TITLE`); `payments-due-table.tsx` supplies only `PaymentsDueEmpty` to this page
 *   (`EMPTY_RANGE` / `EMPTY_FILTERED_TITLE` and their actions).
 * - `kit/period-picker.tsx` (the `role=group` named `dashboard.period.LABEL` `:112`, the step buttons named
 *   `dashboard.period.PREVIOUS` `:121` / `dashboard.period.NEXT` `:168`, the trigger labelled by the active preset or by
 *   the dates `:76-78`, the eight preset rows each with the dates it resolves to `:80-87` and `:131-146`, the
 *   `Calendar mode="range"` whose second click applies `:98-110` and `:152-160`); `core/lib/utils/dashboard-period.ts`
 *   (`DEFAULT_PERIOD_PRESETS` `:59-68`, `periodOfPreset` `:82-108`, `shiftPeriod` `:125-133` — a whole month shifts by
 *   month, anything else by its own day count, `formatPeriod` `:147-158`); `kit/export-menu.tsx` (one `common.EXPORT`
 *   button, disabled by `isExportDisabled`, one item per option); `kit/dashboard-states.tsx:20-24`
 *   (`dashboard.states.ERROR_TITLE` + `ERROR_MESSAGE` + `pages.unauthorized.TRY_AGAIN`);
 *   `weekly-limit/weekly-limit-toolbar.tsx` (`MemberFilterMenu` `:18-49` → `tasks/property-filter-menu.tsx:98`
 *   `common.FILTER`, `AppliedMemberFilters` `:61-107`: the chip `common.MEMBER` `:86` + the name + the remove button
 *   `dashboard.weeklyLimit.REMOVE_MEMBER` `:90`, then `common.CLEAR_FILTERS` `:103`);
 *   `kit/member-cell.tsx` (`initialsOf` `:13-20` — the first initial plus the last word's, upper case);
 *   `core/lib/utils/dashboard-export.ts` (`periodFileNameOf` `:86-88` = `<prefix>-<localDayKey(from)>-<localDayKey(to)>.<ext>`,
 *   `downloadCsv` `:56-60`, which prepends a UTF-8 BOM, `csvOf` joining with `\r\n`); `payments-due-export.tsx`
 *   (`FILE_PREFIX = 'payments-due'` `:35`, the six CSV columns `:46-57` with `common.TOTAL` in the date cell of a total
 *   row `:47-48`, the file names `:170-171`, `owedExportRowsOf(shown.memberGroups)` `:187`).
 *
 * ## What this file found (measured; each has the line that explains it)
 *
 * 1. **The page renders statements, not a table.** `payments-due-table.tsx:282-459` (`PaymentsDueTable`,
 *    `PaymentsDueTableSkeleton`, `TotalsRows`, `CurrencyTotalRow`, `UnpricedTotalRow`) has no importer anywhere in
 *    `core/` or `app/` (`grep -rn "payments-due-table" core app` answers only `payments-due-page.tsx:23 … PaymentsDueEmpty`),
 *    and a page holding 3 members and 8 h 30 m of tracked time rendered `table: 0, row: 0, rowgroup: 0, columnheader: 0`
 *    (`probe-2.log` P10-roles) but 3 `<article>` statements. So "rows and totals" are measured here against the
 *    statement cards, their `li` lines and their footers.
 * 2. The hook's `chart` (`use-payments-due-report.ts:311-323`, returned at `:374`) and the `paymentsDue.chart.*` copy
 *    are never rendered by this page either: no chart element appeared in any probe dump.
 * 3. **A grouping switch costs no read** (`probe-2.log` P3: 1 read before the switch, 1 after `By day`, 1 after `By
 *    member` again) — grouping is client state (`:223`), so the query key never changes.
 * 4. **Filtering members changes the query, and the app's own reads are cached.** Picking a member sends a read for that
 *    id alone; removing the filter returns to the three-member *cached* result **without any new read**
 *    (`probe-4.log` Q2-after-remove: the last read still named one employee while the header read `3 members`), which is
 *    TanStack Query keyed by the employee ids plus `staleTime` 30 s for a live period (`:271`). Test 13 pins both. The
 *    **same caching covers the period steps**: stepping `Next` from the previous month back onto this month moved the
 *    header to `Nov 1 – 30` while the last read stayed `2026-09-30T22:00:00.000Z → 2026-10-31T22:59:59.999Z`
 *    (`s3-lane-c-paymentsdue-1.log` failure 9), because the query key holds the period (`:263`). Test 11 pins that.
 * 5. **The report is asked in the browser's time zone while the profile says UTC.** The query's `timeZone` is the
 *    browser's resolved zone (`Europe/Madrid` on this PC), never the profile's `UTC`, while the shell shows its "Your
 *    profile uses UTC …" notice on every visit (`probe-2.log` P1-notices); the period's `startDate`/`endDate` are the
 *    *local* day boundaries as ISO (`2026-10-31T23:00:00.000Z` for a period starting 1 Nov in UTC+02:00).
 * 6. **A member can owe in two currencies, and can appear as two cards** (`probe-8.log` Q6: two articles both named
 *    "Amount owed to Fixture Manager", one USD one EUR; `probe-6.log` Q4: the same member twice more, because one line
 *    said `rateSource: 'billing'` and the other said nothing — `owedLinesOf` keys a line by
 *    `date:employee:rateSource:currency` `:452-457` and `memberGroupKeyOf` `:638-640` groups on that source). A day card
 *    never merges currencies: its footer names each amount with its code (`probe-6.log` Q5-day:
 *    `Owed$40.00USD€20.00EUR`, `payments-due-statement-card.tsx:271-283`).
 * 7. **Currency section headings appear only when more than one currency is priced** (`payments-due-statements.tsx:165`):
 *    with USD + EUR the `h3`s `Owed in USD`, `Owed in EUR`, `Without a rate` appear (`probe-4.log` Q3-page); with one
 *    currency they do not, even when an unpriced member is present (`probe-10.log` R3, `probe-2.log` P9).
 * 8. **A malformed answer is indistinguishable from a refused one** — the same `dashboard.states.ERROR_TITLE` notice, no
 *    tiles section, no statements section, Export disabled, and **no console line at all** (`probe-10.log` R2-console:
 *    `errors: [], pageErrors: [], http: []`), because `validateApiResponse` throws into the query and `showsError`
 *    `:345` is what the page renders. Tests 17 and 18 pin both halves.
 * 9. A member whose tracked time is priced nowhere still counts as a row: Export stayed enabled
 *    (`probe-11.log` S1-export `false` = not disabled) and the tile read `Owed –` with `1h 30m not priced`
 *    (`payments-due-balance-tiles.tsx:162-175`). Test 4 pins this.
 * 10. `NO_MEMBERS_TITLE` (`payments-due-page.tsx:114-118`) was **not reachable** with this lane's mock: its team always
 *     answers 3 members (`mock-gauzy-server.mjs:217-224`), and the probe that emptied the member list did not get there
 *     either — the app's own `getOrganizationTeam` validation refused the emptied answer (`probe-10.log` R4-console:
 *     "Get organization team validation failed", twice) and the page rendered its ordinary empty state at the same URL.
 * 11. The member filter's rows are labelled by the member's avatar **initials** before their name
 *     (`property-filter-menu.tsx:218-219`, the icon from `weekly-limit-toolbar.tsx:40` →
 *     `weekly-limit/limit-cells.tsx:171` `initialsOf`): a row's text is `FTFixture Teammate` and its accessible name
 *     `FT Fixture Teammate` (`probe-4.log` Q2-submenu-items), so `getByRole` on a bare name cannot be `exact`.
 * 12. The error notice's three parts are separate elements inside one `<output>` (`common/notice.tsx:51-58`).
 *     `textContent` runs them together (`This part of the report could not loadCheck your connection, then try again.Try
 *     again`, `s3-lane-c-paymentsdue-1.log` failure 15); only `innerText` puts the spaces the copy reads with.
 * 13. **A pay line is priced in the currency the answer names, not in the member's bill currency.** With `currency`
 *     beside `rateSource: 'pay'` the line reads `$30.00`; without it `lineCurrencyOf` returns `null` for a pay line
 *     (`payments-due.ts:358-367`) and the card prints the bare number `30.00` (`s3-lane-c-paymentsdue-3.log` failure 3
 *     against `probe-6.log` Q4). Test 16 serves that field, as the probe did.
 *
 * ## What this file does not cover
 *
 * The PDF's bytes (only its file name is checked); `NO_MEMBERS_TITLE` (finding 10); the `UPDATING` bar and the skeletons
 * (`isUpdating` / `isLoading`, which need a slow read this file does not arm); the `MAX_CURRENCY_FIGURES = 3` tile cap
 * and the weekly tile columns past 31 days (`payments-due.ts:26`, `:905`, pinned by
 * `core/lib/utils/dashboards/payments-due-week-start.test.ts`); the `chart` the hook builds (finding 2); and what other
 * specs already pin for this page — `suites/lane-a/reports-gate-by-role-ui.spec.ts` (who may open it) and
 * `suites/api/**` (the Next route twins).
 */

const PAGE_PATH = '/reports/payments-due';
const REPORT_PATH = '/api/timesheet/time-log/report/owed-report';
/** The path the client logs a failure under: its axios base already holds `/api` (`time-log-report.service.ts:127`). */
const REPORT_LOGGED_PATH = '/timesheet/time-log/report/owed-report';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
/** `payments-due-cells.tsx:18`: the figure the page puts where a number cannot be. */
const MISSING_FIGURE = '–';
/** The fixture workspace's locale, which every formatted string below is rebuilt with (test 1 prints it). */
const WORKSPACE_LOCALE = 'en';
const UTF8_BOM = 65279;

type Copy = Record<string, string>;
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	dashboard: {
		paymentsDue: Copy & { figures: Copy; tiles: Copy; statements: Copy; export: Copy };
		period: Copy;
		states: Copy;
		weeklyLimit: Copy;
	};
	common: Copy;
	pages: { unauthorized: Copy };
};
const P = EN.dashboard.paymentsDue;
const FIGURES = P.figures;
const STATEMENTS = P.statements;
const PERIOD = EN.dashboard.period;
const STATES = EN.dashboard.states;
const LIMITS = EN.dashboard.weeklyLimit;
const C = EN.common;
const TRY_AGAIN = EN.pages.unauthorized.TRY_AGAIN;
/** The eight presets `DEFAULT_PERIOD_PRESETS` lists, labelled by these keys (`period-picker.tsx:26-35`). */
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

/** `{count, plural, =0 {No members} one {# member} other {# members}} · {duration}` → the branch for `count`, then the other holes. */
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

const report = (label: string, value: unknown) =>
	console.log(`[lane-c payments-due] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated on every answer this file writes. */
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

/* ------------------------------------------------------------------ the clock this file serves

`localDay(0)` is the day the run runs on, at local noon so a rendered "Today"/"Yesterday" cannot straddle a boundary. */

const localDay = (offset: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offset);
	return day;
};
const localDayKeyOf = (day: Date) =>
	`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
const shiftDays = (day: Date, offset: number) => {
	const shifted = new Date(day);
	shifted.setDate(shifted.getDate() + offset);
	return shifted;
};
/** The period `periodOfPreset('thisMonth', 1)` builds (`dashboard-period.ts:82-108`), in local time. */
const monthPeriod = () => {
	const now = new Date();
	return {
		from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
		to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
	};
};
const previousMonthPeriod = () => {
	const now = new Date();
	return {
		from: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
		to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
	};
};
const nextMonthPeriod = () => {
	const now = new Date();
	return {
		from: new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0),
		to: new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999)
	};
};

const formatWith = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(WORKSPACE_LOCALE, options);
/** `formatPeriod` (`dashboard-period.ts:147-158`) with `yearFormatOptions(false)` — the year only shows off-year. */
const periodTextOf = (from: Date, to: Date) =>
	flat(formatWith({ month: 'short', day: 'numeric' }).formatRange(from, to));
const shortDayOf = (day: Date) => formatWith({ month: 'short', day: 'numeric' }).format(day);
/** The day card's day (`payments-due-statement-card.tsx:320`). */
const longDayOf = (day: Date) => formatWith({ weekday: 'long', month: 'long', day: 'numeric' }).format(day);
/** `DayName` (`payments-due-cells.tsx:164-175`): Today / Yesterday or the short weekday, then the date. */
const lineDayOf = (day: Date) => {
	const key = localDayKeyOf(day);
	const name =
		key === localDayKeyOf(new Date())
			? C.TODAY
			: key === localDayKeyOf(localDay(-1))
				? C.YESTERDAY
				: formatWith({ weekday: 'short' }).format(day);
	return `${name}, ${shortDayOf(day)}`;
};
/** `formatDurationShort` (`dashboard-figures.ts:19-22`). */
const trackedOf = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
/** `formatOwed` for a currency (`payments-due.ts:806-810`). */
const moneyOf = (amount: number, currency: string) =>
	new Intl.NumberFormat(WORKSPACE_LOCALE, { style: 'currency', currency }).format(amount);
/** `RateValue` (`payments-due-cells.tsx:81-115`) and `OwedFormula` (`:140-158`). */
const rateOf = (rate: number, currency: string) => `${moneyOf(rate, currency)}${P.HOUR_UNIT}`;
const formulaOf = (seconds: number, rate: number, currency: string) =>
	copy(P.FORMULA, { duration: trackedOf(seconds), rate: moneyOf(rate, currency) });
/** `initialsOf` (`kit/member-cell.tsx:13-20`): the first initial plus the last word's, upper case. */
const initialsOf = (name: string) => {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? '';
	const last = words.length < 2 ? '' : (words[words.length - 1][0] ?? '');
	return `${first}${last}`.toUpperCase();
};

/* ------------------------------------------------------------------ the served report */

type ServedEntry = {
	employeeId: string;
	seconds: number;
	/** The amount Gauzy reports; a billing line's rate is derived from it (`linePriceOf`). */
	amount: number;
	/** `billRateValue` the answer carries; `null` = the member has no bill rate. */
	rate?: number | null;
	/** `billRateCurrency`; the organization's `USD` is the fallback (`lineCurrencyOf`). */
	currency?: string | null;
	/** `'pay'` prices the line from the member's stored pay rate, `'billing'` from their bill rate. */
	rateSource?: string;
	/** A currency for the line itself, separate from the employee's (`lineCurrencyOf`). */
	lineCurrency?: string | null;
};
type ServedDay = { offset: number; entries: ServedEntry[] };
type ServedCall = { method: string; search: string; params: Record<string, string> };

const servedDaysOf = (days: ServedDay[]) =>
	days.map((day) => ({
		date: localDayKeyOf(localDay(day.offset)),
		employees: day.entries.map((entry) => ({
			employee: {
				id: entry.employeeId,
				userId: `${entry.employeeId}-u`,
				billRateValue: entry.rate ?? null,
				billRateCurrency: entry.currency ?? null,
				user: { name: `served-${entry.employeeId}` }
			},
			duration: entry.seconds,
			amount: entry.amount,
			...(entry.rateSource ? { rateSource: entry.rateSource } : {}),
			...(entry.lineCurrency ? { currency: entry.lineCurrency } : {})
		}))
	}));

/**
 * The owed report, served on the mock origin. `honourIds` makes the answer hold only the members the query asked for —
 * what a real backend does, and what lets a filter visibly change the cards.
 */
async function serveReport(
	page: Page,
	script: { days?: ServedDay[]; refusal?: number; rawBody?: unknown; honourIds?: boolean }
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
		let body: unknown = script.rawBody ?? servedDaysOf(script.days ?? []);
		if (script.refusal) {
			body = { statusCode: script.refusal, message: 'this file refused the read' };
		} else if (script.honourIds && !script.rawBody) {
			const asked = Object.entries(params)
				.filter(([key]) => key.startsWith('employeeIds['))
				.map(([, value]) => value);
			body = servedDaysOf(script.days ?? [])
				.map((day) => ({
					...day,
					employees: day.employees.filter((entry) => asked.includes(entry.employee.id))
				}))
				.filter((day) => day.employees.length > 0);
		}
		return route.fulfill({
			status: script.refusal ?? 200,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	});
	return calls;
}

/** Records what the browser really sent for the owed report, and from which origin. Nothing is answered here. */
function recordReportReads(page: Page) {
	const calls: Array<{ method: string; origin: string; path: string; search: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname === REPORT_PATH) {
			calls.push({ method: request.method(), origin: url.origin, path: url.pathname, search: url.search });
		}
	});
	return calls;
}

/* ------------------------------------------------------------------ the page under the locators */

const pageHeading = (page: Page) => page.locator('h1');
const pageMeta = (page: Page) => page.locator('h1 + span');
const breadcrumbNav = (page: Page) => page.locator('nav[aria-label="breadcrumb"]');
const exportButton = (page: Page) => page.getByRole('button', { name: C.EXPORT, exact: true });
const tilesRegion = (page: Page) => page.getByRole('region', { name: P.tiles.LABEL, exact: true });
const memberStatements = (page: Page) => page.getByRole('region', { name: STATEMENTS.TITLE_MEMBERS, exact: true });
const dayStatements = (page: Page) => page.getByRole('region', { name: STATEMENTS.TITLE_DAYS, exact: true });
const memberCard = (page: Page, name: string) =>
	memberStatements(page).getByRole('article', { name: copy(STATEMENTS.MEMBER_LABEL, { name }), exact: true });
const dayCard = (page: Page, day: Date) =>
	dayStatements(page).getByRole('article', {
		name: copy(STATEMENTS.DAY_LABEL, { day: longDayOf(day) }),
		exact: true
	});
const tilesTile = (page: Page, currency: string) =>
	tilesRegion(page).getByRole('article', { name: copy(FIGURES.OWED_IN, { currency }), exact: true });
const unpricedTile = (page: Page) => tilesRegion(page).getByRole('article', { name: FIGURES.OWED, exact: true });
const groupingTab = (page: Page, label: string) => page.getByRole('tab', { name: label, exact: true });
/** Exact, because `common.FILTER` is a substring of `common.CLEAR_FILTERS`; the trigger's count chip only appears while a filter is active. */
const filterButton = (page: Page) => page.getByRole('button', { name: C.FILTER, exact: true });
/** Not exact: `FilterOptionRow` puts the member's avatar initials before the name (`property-filter-menu.tsx:218-219`, the initials from `weekly-limit-toolbar.tsx:40` → `weekly-limit/limit-cells.tsx:171`), so the row's text is `FTFixture Teammate` and its accessible name `FT Fixture Teammate`. */
const memberOption = (page: Page, name: string) => page.getByRole('menuitemcheckbox', { name });
const periodGroup = (page: Page) => page.getByRole('group', { name: PERIOD.LABEL, exact: true });
const popover = (page: Page) => page.locator('[data-slot=popover-content]');
const errorNotice = (page: Page) => page.locator('output').filter({ hasText: STATES.ERROR_TITLE });
/**
 * Waits for a region to hold its statement cards. A region renders its title and its empty state before the report
 * lands, and `evaluateAll` reads only what is on the page (zero elements → `[]`), so every text read below is preceded
 * by this (`s3-lane-c-paymentsdue-4.log` failure 1: a card read before the data arrived returned `[]`).
 */
const expectCards = async (locator: Locator, count: number, message: string) => {
	await expect(locator.locator('article'), message).toHaveCount(count);
};

/* `textContent`, flattened exactly as the probes measured it. The flattening happens **inside the browser**: a
   callback handed to `evaluate` is serialised and run on the page, so it cannot see `flat` or anything else defined
   in this file (`probe-1.log` of the first whole-file run: `locator.evaluate: ReferenceError: flat is not defined`). */
const textOf = async (locator: Locator) => flat(await locator.evaluate((node) => node.textContent ?? ''));
/** `innerText`, which puts a space where `textContent` puts none — how the probes read the `<output>` notices. */
const innerOf = async (locator: Locator) => flat(await locator.innerText());
const allTextsOf = async (locator: Locator) =>
	locator.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
const rowsOf = async (locator: Locator) => allTextsOf(locator.locator('li'));
/** A card's own `<footer>`, or every card's when a region is passed (the probes read it as `article.querySelector('footer')`). */
const footersOf = async (locator: Locator) =>
	locator
		.locator('footer')
		.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
const cardNamesOf = async (locator: Locator) =>
	locator
		.locator('article')
		.evaluateAll((nodes) =>
			nodes.map((node) => (node.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim())
		);
const tilesSummaryOf = async (page: Page) =>
	tilesRegion(page)
		.locator('article')
		.evaluateAll((nodes) =>
			nodes.map((node) => `${node.getAttribute('aria-label')} → ${node.textContent}`.replace(/\s+/g, ' ').trim())
		);
const sectionTitlesOf = async (locator: Locator) => allTextsOf(locator.locator('h3'));
const headerTextOf = async (locator: Locator) =>
	locator
		.locator('header')
		.first()
		.evaluate((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim());
const noticesOf = async (page: Page) =>
	page
		.locator('output')
		.allInnerTexts()
		// the shell's own time-zone notice sits in an `output` too (see finding 5)
		.then((all) => all.map(flat).filter((line) => !line.includes('profile uses UTC')));

const memberIdsOf = (fixture: { ids: Record<string, string> }) =>
	[fixture.ids.employee, fixture.ids.teammateEmployee, fixture.ids.deniedEmployee].sort((first, second) =>
		first.localeCompare(second)
	);
const employeeIdsOf = (call: ServedCall) =>
	Object.entries(call.params)
		.filter(([key]) => key.startsWith('employeeIds['))
		.map(([, value]) => value);

/* ------------------------------------------------------------------ the console, excused only by name */

/** React's dev-mode store warning, not this page's (`suites/lane-a/api-tokens-settings-ui.spec.ts:405-430`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The client's own line for a refused read this file armed: it names the path *without* `/api` and puts the query
 * between the path and the status (`probe-12.log` T2-http, `probe-2.log` P7-console), hence the optional `?<query>`
 * before the armed status. Only the status armed here is excused; nothing else on that path is.
 */
const armedFailurePattern = (status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${REPORT_LOGGED_PATH}(\?\S*)? ${status} `);
/** A test that arms no refusal excuses nothing but React's own dev-mode warning. */
const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));
/** The same, with exactly the armed refusal excused as well — no other status on that path. */
const consoleFindingsWithArmed = (shield: Shield, status: number) => {
	const pattern = armedFailurePattern(status);
	return consoleFindings(shield).filter((line) => !pattern.test(line));
};
const armedFailureLines = (shield: Shield, status: number) => {
	const pattern = armedFailurePattern(status);
	return shield.consoleErrors().filter((line) => pattern.test(line));
};

test.describe('lane-c · Reports › Payments due: what a manager sees and what the browser asks for', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ---------------------------------------------------------- 1. the lane exactly as it is: the mock answers []

	test('1 · the mock answers the owed report with a plain empty list: the page, the tiles and the empty state', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const reads = recordReportReads(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(pageHeading(page), 'the page rendered no title').toBeVisible({ timeout: 30_000 });
		await expect(pageHeading(page), 'the title is rendered twice').toHaveCount(1);
		expect(await textOf(pageHeading(page)), 'the title is not dashboard.paymentsDue.TITLE').toBe(P.TITLE);

		const period = monthPeriod();
		const meta = `${periodTextOf(period.from, period.to)} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`;
		// polled, because the member count only arrives with the team read (`payments-due-page.tsx:56-58`)
		await expect.poll(() => textOf(pageMeta(page)), { timeout: 20_000 }).toEqual(meta);

		// the breadcrumb (payments-due-page.tsx:62-65)
		await expect(
			breadcrumbNav(page).getByRole('link', { name: C.REPORTS, exact: true }),
			'the Reports crumb is not a link to /'
		).toHaveAttribute('href', '/');
		await expect(breadcrumbNav(page), 'the page crumb is missing').toContainText(P.TITLE);

		await expect(groupingTab(page, P.GROUPING_MEMBER), 'By member is not the selected grouping').toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(groupingTab(page, P.GROUPING_DAY), 'By day is not offered').toHaveAttribute(
			'aria-selected',
			'false'
		);
		await expect(exportButton(page), 'Export is offered although the page has no row').toBeDisabled();

		// the tiles: one unpriced tile, no currency tile, and the note
		await expect(unpricedTile(page), 'the unpriced tile is missing').toHaveCount(1);
		expect(await textOf(unpricedTile(page)), 'the unpriced tile does not read Owed –').toBe(
			`${FIGURES.OWED}${MISSING_FIGURE}`
		);
		await expect(tilesRegion(page).getByText(P.NOTE, { exact: true }), 'the tiles note is missing').toBeVisible();
		await expect(tilesTile(page, 'USD'), 'a currency tile appeared with nothing priced').toHaveCount(0);

		// the statements: the title without a meta line, then PaymentsDueEmpty
		const statements = memberStatements(page);
		await expect(
			statements.getByRole('heading', { level: 2, name: STATEMENTS.TITLE_MEMBERS, exact: true }),
			'the statements section has no title'
		).toBeVisible();
		expect(await headerTextOf(statements), 'the statements header carries a meta line with no row').toBe(
			STATEMENTS.TITLE_MEMBERS
		);
		await expect(
			statements.getByText(copy(P.EMPTY_RANGE, { from: shortDayOf(period.from), to: shortDayOf(period.to) }), {
				exact: true
			}),
			'the empty state does not name the period it looked in'
		).toBeVisible();
		await expect(
			statements.getByText(P.EMPTY_MESSAGE, { exact: true }),
			'the empty state has no message'
		).toBeVisible();
		await expect(
			statements.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }),
			'the empty state offers no other period'
		).toBeVisible();
		await expect(statements.locator('article'), 'a statement card appeared with no data').toHaveCount(0);

		// the mock answered its own handler (mock-gauzy-server.mjs:804-812), on the mock origin
		await expect.poll(() => reads.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		expect(
			reads.map((call) => `${call.method} ${call.origin}${call.path}`),
			'the owed report was not read from the mock origin'
		).toEqual([`GET ${MOCK_API_ORIGIN}${REPORT_PATH}`]);
		expect(
			(await mock.calls(REPORT_PATH)).map((item) => [item.method, item.path, item.status]),
			'the mock did not answer its own owed-report handler'
		).toEqual([['GET', REPORT_PATH, 200]]);

		report('lane-as-it-is', {
			lang: await page.evaluate(() => document.documentElement.lang),
			heading: await textOf(pageHeading(page)),
			meta: await textOf(pageMeta(page)),
			breadcrumb: await textOf(breadcrumbNav(page)),
			breadcrumbHrefs: await breadcrumbNav(page)
				.locator('a')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
			tiles: await tilesSummaryOf(page),
			statementsHeader: await headerTextOf(statements),
			emptyParagraphs: await allTextsOf(statements.locator('p')),
			exportDisabled: await exportButton(page).isDisabled(),
			notices: await noticesOf(page),
			read: reads.map((call) => `${call.method} ${call.origin}${call.path}${call.search}`)
		});
		expect(consoleFindings(shield), 'the empty page logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the empty page threw a page error').toEqual([]);
	});

	// ---------------------------------------------------------- 2. exactly what the browser asks for its period

	test('2 · the read the page makes for its own period: the fixture ids, local day boundaries, the browser zone, the sorted members', async ({
		page,
		fixture
	}) => {
		const calls = await serveReport(page, { days: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);

		const browserZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
		const period = monthPeriod();
		const employees = memberIdsOf(fixture);
		const expected: Record<string, string> = {
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA,
			startDate: period.from.toISOString(),
			endDate: period.to.toISOString(),
			timeZone: browserZone,
			'employeeIds[0]': employees[0],
			'employeeIds[1]': employees[1]
		};
		// the third id belongs to the team's third member; spelled out so a reader sees the whole key set
		expected['employeeIds[2]'] = employees[2];
		report('query-of-this-month', {
			search: calls[0].search,
			params: calls[0].params,
			browserZone,
			localZone: Intl.DateTimeFormat().resolvedOptions().timeZone
		});

		// time-log-report.service.ts:52-70 and :125-131; the period's local day boundaries (:242-250)
		expect(calls[0].params, 'the owed-report query is not the one the hook builds').toEqual(expected);
		expect(
			Object.keys(calls[0].params).filter((key) => key.startsWith('projectIds[') || key.startsWith('teamIds['))
				.length,
			'a project or team filter was sent although this page has none'
		).toBe(0);
		expect(calls[0].params.timeZone, 'the report was not asked in the zone the browser is in').toBe(browserZone);
		expect(
			employeeIdsOf(calls[0]),
			'the read did not name every team member, sorted (`use-payments-due-report.ts:243`)'
		).toEqual(employees);
	});

	// ---------------------------------------------------------- 3. two priced members and each card's own total

	test('3 · two members with rates and one without: the tiles per currency, the cards, each card total', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		await serveReport(page, {
			days: [
				{
					offset: -2,
					entries: [
						{ employeeId: manager, seconds: 3 * 3600, amount: 120, rate: 40, currency: 'USD' },
						{ employeeId: teammate, seconds: 2 * 3600, amount: 50, rate: 25, currency: 'EUR' }
					]
				},
				{
					offset: 0,
					entries: [
						{ employeeId: manager, seconds: 2 * 3600, amount: 80, rate: 40, currency: 'USD' },
						{ employeeId: restricted, seconds: 90 * 60, amount: 0, rate: null }
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectCards(memberStatements(page), 3, 'the page did not show the three member cards');

		// one tile per currency: amount, code, `<members> · <tracked>` (payments-due-balance-tiles.tsx:125-150)
		expect(await textOf(tilesTile(page, 'USD')), 'the USD tile is not the amount, code and hint measured').toBe(
			`${FIGURES.OWED}${moneyOf(200, 'USD')}USD${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(5 * 3600) })}`
		);
		expect(await textOf(tilesTile(page, 'EUR')), 'the EUR tile is not the amount, code and hint measured').toBe(
			`${FIGURES.OWED}${moneyOf(50, 'EUR')}EUR${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(2 * 3600) })}`
		);
		await expect(unpricedTile(page), 'an unpriced tile appeared next to priced ones').toHaveCount(0);

		const statements = memberStatements(page);
		expect(await headerTextOf(statements), 'the statements meta line is not `<members> · <tracked> tracked`').toBe(
			`${STATEMENTS.TITLE_MEMBERS}${copy(P.MEMBERS_COUNT, { count: 3 })} · ${copy(STATEMENTS.TRACKED_TOTAL, { duration: trackedOf(8 * 3600 + 30 * 60) })}`
		);
		// two priced currencies → the section headings (payments-due-statements.tsx:165-171)
		expect(await sectionTitlesOf(statements), 'the currency section headings are not what was measured').toEqual([
			copy(FIGURES.OWED_IN, { currency: 'USD' }),
			copy(FIGURES.OWED_IN, { currency: 'EUR' }),
			P.TOTAL_UNPRICED
		]);

		// the manager: two day lines, each `<duration> × <rate>/h`, then the card's own total
		const managerCard = memberCard(page, fixture.names.user);
		await expect(managerCard, 'the manager card is missing').toHaveCount(1);
		expect(await rowsOf(managerCard), 'the manager card does not list the days it was served').toEqual([
			`${lineDayOf(localDay(-2))}${formulaOf(3 * 3600, 40, 'USD')}${moneyOf(120, 'USD')}`,
			`${lineDayOf(localDay(0))}${formulaOf(2 * 3600, 40, 'USD')}${moneyOf(80, 'USD')}`
		]);
		expect(await footersOf(managerCard), 'the card footer is not `<tracked> tracked <Owed> <amount>`').toEqual([
			`${trackedOf(5 * 3600)} tracked${P.COLUMN_OWED}${moneyOf(200, 'USD')}`
		]);
		await expect(
			managerCard.getByText(rateOf(40, 'USD'), { exact: true }),
			'the card chip does not state the rate'
		).toBeVisible();

		const teammateCard = memberCard(page, fixture.names.teammate);
		expect(await rowsOf(teammateCard), 'the teammate card does not price their time in euros').toEqual([
			`${lineDayOf(localDay(-2))}${formulaOf(2 * 3600, 25, 'EUR')}${moneyOf(50, 'EUR')}`
		]);
		expect(await footersOf(teammateCard), 'the teammate footer is not what was measured').toEqual([
			`${trackedOf(2 * 3600)} tracked${P.COLUMN_OWED}${moneyOf(50, 'EUR')}`
		]);

		// the member with time and no rate: no formula, no amount, hours in place of Owed
		const restrictedCard = memberCard(page, fixture.names.denied);
		expect(await rowsOf(restrictedCard), 'an unpriced member got a formula they cannot have').toEqual([
			`${lineDayOf(localDay(0))}${trackedOf(90 * 60)}`
		]);
		expect(await footersOf(restrictedCard), 'the unpriced card shows an owed figure').toEqual([
			`${P.COLUMN_TRACKED}${trackedOf(90 * 60)}`
		]);
		await expect(
			restrictedCard.getByText(P.NO_RATE, { exact: true }),
			'the unpriced card does not say No rate set'
		).toBeVisible();

		// the callout above the statements (payments-due-unpriced-callout.tsx:13-16)
		await expect(
			page.getByText(copy(STATEMENTS.UNPRICED_TITLE, { count: 1, duration: trackedOf(90 * 60) }), {
				exact: true
			}),
			'the unpriced callout does not count the member and their time'
		).toBeVisible();
		await expect(
			page.getByText(P.NO_RATES_MESSAGE, { exact: true }),
			'the callout has no pointer to the team settings'
		).toBeVisible();

		report('two-priced-one-unpriced', {
			tiles: await tilesSummaryOf(page),
			sections: await sectionTitlesOf(statements),
			cards: await cardNamesOf(statements),
			footers: await footersOf(statements),
			notices: await noticesOf(page),
			exportDisabled: await exportButton(page).isDisabled()
		});
		expect(await exportButton(page).isDisabled(), 'Export was disabled although the page has rows').toBe(false);
		expect(consoleFindings(shield), 'the populated page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------- 4. nothing in the period is priced

	test('4 · tracked time nobody priced: the tile reads the hours, the callout names it, Export is still offered', async ({
		page,
		fixture
	}) => {
		await serveReport(page, {
			days: [
				{ offset: -1, entries: [{ employeeId: fixture.ids.employee, seconds: 90 * 60, amount: 0, rate: null }] }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectCards(memberStatements(page), 1, 'the page did not show the member who tracked time');

		expect(await textOf(unpricedTile(page)), 'the unpriced tile does not carry the hours it could not price').toBe(
			`${FIGURES.OWED}${MISSING_FIGURE}${copy(FIGURES.NOT_PRICED, { duration: trackedOf(90 * 60) })}`
		);
		await expect(
			page.getByText(P.NO_RATES_TITLE, { exact: true }),
			'the callout did not switch to "no member has a rate" because nothing is priced'
		).toBeVisible();
		await expect(
			page.getByText(P.NO_RATES_MESSAGE, { exact: true }),
			'the callout has no pointer to the team settings'
		).toBeVisible();

		const card = memberCard(page, fixture.names.user);
		expect(await rowsOf(card), 'the unpriced day line gained an amount').toEqual([
			`${lineDayOf(localDay(-1))}${trackedOf(90 * 60)}`
		]);
		expect(await footersOf(card), 'the unpriced card footer is not Tracked + hours').toEqual([
			`${P.COLUMN_TRACKED}${trackedOf(90 * 60)}`
		]);
		expect(
			await sectionTitlesOf(memberStatements(page)),
			'a section heading appeared with a single unpriced member'
		).toEqual([]);

		report('nothing-priced', {
			tile: await textOf(unpricedTile(page)),
			card: await textOf(card),
			notices: await noticesOf(page),
			exportDisabled: await exportButton(page).isDisabled()
		});
		// finding 9: an unpriced row is still a row
		expect(await exportButton(page).isDisabled(), 'Export was disabled for a member who tracked time').toBe(false);
	});

	// ---------------------------------------------------------- 5. one member, several rates

	test('5 · a member whose days were priced at different rates: the card says Several rates, each line keeps its own', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		await serveReport(page, {
			days: [
				{
					offset: -3,
					entries: [{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' }]
				},
				{ offset: -2, entries: [{ employeeId: manager, seconds: 3600, amount: 50, rate: 40, currency: 'USD' }] }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		// `lineRateOf` prices each line from its own amount, `withLineRate` (`:664-678`) marks the group several.
		// The card is awaited first: `evaluateAll` reads what is there, and an unread page has no card yet.
		const card = memberCard(page, fixture.names.user);
		await expect(card, 'the manager card is missing').toHaveCount(1);
		expect(await rowsOf(card), 'the several-rate card lost the per-line rates').toEqual([
			`${lineDayOf(localDay(-3))}${formulaOf(3600, 40, 'USD')}${moneyOf(40, 'USD')}`,
			`${lineDayOf(localDay(-2))}${formulaOf(3600, 50, 'USD')}${moneyOf(50, 'USD')}`
		]);
		await expect(
			card.getByText(P.SEVERAL_RATES, { exact: true }),
			'the card did not say Several rates'
		).toBeVisible();
		expect(await footersOf(card), 'the card total is not the sum of the lines').toEqual([
			`${trackedOf(2 * 3600)} tracked${P.COLUMN_OWED}${moneyOf(90, 'USD')}`
		]);
		expect(await textOf(tilesTile(page, 'USD')), 'the tile did not add the two rates up').toBe(
			`${FIGURES.OWED}${moneyOf(90, 'USD')}USD${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(2 * 3600) })}`
		);
		expect(
			await sectionTitlesOf(memberStatements(page)),
			'a single priced currency got a section heading anyway'
		).toEqual([]);
		report('several-rates', {
			card: await textOf(card),
			tile: await textOf(tilesTile(page, 'USD')),
			sections: await sectionTitlesOf(memberStatements(page))
		});
	});

	// ---------------------------------------------------------- 6. one member owed in two currencies

	test('6 · a member owed in two currencies: two cards, two tiles, a heading per currency', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		await serveReport(page, {
			days: [
				{
					offset: -5,
					entries: [
						{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' },
						{
							employeeId: manager,
							seconds: 3600,
							amount: 35,
							rate: 40,
							currency: 'USD',
							lineCurrency: 'EUR'
						}
					]
				},
				{ offset: -4, entries: [{ employeeId: manager, seconds: 3600, amount: 60, rate: 40, currency: 'USD' }] }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		const statements = memberStatements(page);
		const cards = memberCard(page, fixture.names.user);
		await expect(cards, 'a member owed in two currencies was not shown as two cards').toHaveCount(2);
		expect(await cardNamesOf(statements), 'both cards name the same member (finding 6)').toEqual([
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.user }),
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.user })
		]);
		expect(await sectionTitlesOf(statements), 'two priced currencies had no headings').toEqual([
			copy(FIGURES.OWED_IN, { currency: 'USD' }),
			copy(FIGURES.OWED_IN, { currency: 'EUR' })
		]);
		// the USD card carries both days and Several rates; the EUR card stands on its own
		expect(await allTextsOf(cards)).toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}${copy(P.DAYS_COUNT, { count: 2 })}${P.SEVERAL_RATES}${lineDayOf(localDay(-5))}${formulaOf(3600, 40, 'USD')}${moneyOf(40, 'USD')}${lineDayOf(localDay(-4))}${formulaOf(3600, 60, 'USD')}${moneyOf(60, 'USD')}${trackedOf(2 * 3600)} tracked${P.COLUMN_OWED}${moneyOf(100, 'USD')}`,
			`${initialsOf(fixture.names.user)}${fixture.names.user}${copy(P.DAYS_COUNT, { count: 1 })}${rateOf(35, 'EUR')}${lineDayOf(localDay(-5))}${formulaOf(3600, 35, 'EUR')}${moneyOf(35, 'EUR')}${trackedOf(3600)} tracked${P.COLUMN_OWED}${moneyOf(35, 'EUR')}`
		]);
		expect(await textOf(tilesTile(page, 'USD')), 'the USD tile is not what was measured').toBe(
			`${FIGURES.OWED}${moneyOf(100, 'USD')}USD${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(2 * 3600) })}`
		);
		expect(await textOf(tilesTile(page, 'EUR')), 'the EUR tile is not what was measured').toBe(
			`${FIGURES.OWED}${moneyOf(35, 'EUR')}EUR${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(3600) })}`
		);
		report('two-currencies-one-member', {
			cards: await allTextsOf(cards),
			tiles: await tilesSummaryOf(page),
			header: await headerTextOf(statements)
		});
	});

	// ---------------------------------------------------------- 7. the day grouping: a card per day, newest first

	test('7 · By day: one card per day, newest first, each with the member and the day total', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		await serveReport(page, {
			days: Array.from({ length: 7 }, (_unused, index) => ({
				offset: -6 + index,
				entries: [{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' }]
			}))
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await groupingTab(page, P.GROUPING_DAY).click();

		const statements = dayStatements(page);
		await expectCards(statements, 7, 'the day grouping did not render a card per day');
		await expect(
			statements.getByRole('heading', { level: 2, name: STATEMENTS.TITLE_DAYS, exact: true }),
			'the day statements section has no title'
		).toBeVisible();
		expect(await headerTextOf(statements), 'the day statements meta is not `<days> · <tracked> tracked`').toBe(
			`${STATEMENTS.TITLE_DAYS}${copy(P.DAYS_COUNT, { count: 7 })} · ${copy(STATEMENTS.TRACKED_TOTAL, { duration: trackedOf(7 * 3600) })}`
		);
		// `dayGroupsOf` (`payments-due.ts:711-738`) puts the newest day first
		expect(await cardNamesOf(statements), 'the day cards are not newest first').toEqual(
			Array.from({ length: 7 }, (_unused, index) =>
				copy(STATEMENTS.DAY_LABEL, { day: longDayOf(localDay(-index)) })
			)
		);
		const today = dayCard(page, localDay(0));
		expect(await rowsOf(today), 'the day card does not name its member and their figure').toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}${formulaOf(3600, 40, 'USD')}${moneyOf(40, 'USD')}`
		]);
		expect(await footersOf(today), 'the day footer is not `<tracked> tracked <Owed> <amount>`').toEqual([
			`${trackedOf(3600)} tracked${P.COLUMN_OWED}${moneyOf(40, 'USD')}`
		]);
		expect(await textOf(tilesTile(page, 'USD')), 'the tiles did not survive the regrouping').toBe(
			`${FIGURES.OWED}${moneyOf(280, 'USD')}USD${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(7 * 3600) })}`
		);
		report('day-grouping', {
			header: await headerTextOf(statements),
			cards: await cardNamesOf(statements),
			todayCard: await textOf(today),
			tiles: await tilesSummaryOf(page)
		});
	});

	// ---------------------------------------------------------- 8. a day owed in two currencies, partly unpriced

	test('8 · one day, three members, two currencies and some time nobody priced', async ({ page, fixture }) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		await serveReport(page, {
			days: [
				{
					offset: -1,
					entries: [
						{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' },
						{ employeeId: teammate, seconds: 1800, amount: 20, rate: 40, currency: 'EUR' },
						{ employeeId: restricted, seconds: 600, amount: 0, rate: null }
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		// the member view first, exactly as measured
		expect(await textOf(tilesTile(page, 'USD')), 'the USD tile is not what was measured').toBe(
			`${FIGURES.OWED}${moneyOf(40, 'USD')}USD${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(3600) })}`
		);
		expect(await textOf(tilesTile(page, 'EUR')), 'the EUR tile is not what was measured').toBe(
			`${FIGURES.OWED}${moneyOf(20, 'EUR')}EUR${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(1800) })}`
		);
		expect(await sectionTitlesOf(memberStatements(page)), 'the member sections are not what was measured').toEqual([
			copy(FIGURES.OWED_IN, { currency: 'USD' }),
			copy(FIGURES.OWED_IN, { currency: 'EUR' }),
			P.TOTAL_UNPRICED
		]);

		await groupingTab(page, P.GROUPING_DAY).click();
		const card = dayCard(page, localDay(-1));
		await expect(card, 'the day card is missing').toHaveCount(1);
		expect(await rowsOf(card), 'the day card does not list each member the way it was measured').toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}${formulaOf(3600, 40, 'USD')}${moneyOf(40, 'USD')}`,
			`${initialsOf(fixture.names.teammate)}${fixture.names.teammate}${formulaOf(1800, 40, 'EUR')}${moneyOf(20, 'EUR')}`,
			`${initialsOf(fixture.names.denied)}${fixture.names.denied}${P.NO_RATE}${trackedOf(600)}`
		]);
		// one amount per currency, each with its code, and the time nobody priced named (`:253-283`)
		expect(await footersOf(card), 'the day footer is not what was measured').toEqual([
			`${trackedOf(3600 + 1800 + 600)} tracked${copy(STATEMENTS.UNPRICED_PART, { duration: trackedOf(600) })}${P.COLUMN_OWED}${moneyOf(40, 'USD')}USD${moneyOf(20, 'EUR')}EUR`
		]);
		expect(
			await cardNamesOf(dayStatements(page)),
			'more than one day card appeared from one served day'
		).toHaveLength(1);
		report('mixed-day', { aria: await card.getAttribute('aria-label'), card: await textOf(card) });
	});

	// ---------------------------------------------------------- 9. the grouping switch costs no read

	test('9 · switching By member ↔ By day re-groups what was already read and asks for nothing', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		const calls = await serveReport(page, {
			days: [
				{ offset: -1, entries: [{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' }] }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);
		const readsBefore = calls.length;

		await groupingTab(page, P.GROUPING_DAY).click();
		await expect(dayCard(page, localDay(-1)), 'the day grouping rendered no card').toHaveCount(1);
		const readsAfterDay = calls.length;

		await groupingTab(page, P.GROUPING_MEMBER).click();
		await expect(memberCard(page, fixture.names.user), 'going back rendered no card').toHaveCount(1);
		const readsAfterMember = calls.length;

		report('grouping-switch-reads', { readsBefore, readsAfterDay, readsAfterMember });
		expect(readsAfterDay, 'the day grouping asked the report again').toBe(readsBefore);
		expect(readsAfterMember, 'going back to By member asked the report again').toBe(readsBefore);
		await expect(groupingTab(page, P.GROUPING_MEMBER), 'By member is not selected again').toHaveAttribute(
			'aria-selected',
			'true'
		);
	});

	// ---------------------------------------------------------- 10. the fold inside a card, and Expand all

	test('10 · a member with more days than a card shows: the fold, its aria-expanded, and Expand all / Collapse all', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		await serveReport(page, {
			days: Array.from({ length: 7 }, (_unused, index) => ({
				offset: -6 + index,
				entries: [{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' }]
			}))
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		const statements = memberStatements(page);
		const card = memberCard(page, fixture.names.user);
		const moreLabel = copy(STATEMENTS.SHOW_MORE_DAYS, { count: 2 });
		// `VISIBLE_STATEMENT_LINES = 5` (payments-due-statement-recipes.ts:37) folds the last 2 of the 7 days
		await expect(
			card.getByRole('button', { name: moreLabel, exact: true }),
			'the fold is not offered'
		).toBeVisible();
		await expect(card.getByRole('button', { name: moreLabel, exact: true })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
		expect(await rowsOf(card), 'the card did not fold at 5 day lines').toEqual(
			Array.from({ length: 5 }, (_unused, index) => {
				const day = localDay(-6 + index);
				return `${lineDayOf(day)}${formulaOf(3600, 40, 'USD')}${moneyOf(40, 'USD')}`;
			})
		);
		expect(
			await headerTextOf(statements),
			'the section header action is not Expand all while a card is folded'
		).toBe(
			`${STATEMENTS.TITLE_MEMBERS}${copy(P.MEMBERS_COUNT, { count: 1 })} · ${copy(STATEMENTS.TRACKED_TOTAL, { duration: trackedOf(7 * 3600) })}${LIMITS.EXPAND_ALL}`
		);
		// the folded hours are still in the total
		expect(await footersOf(card), 'the folded card total does not cover all 7 days').toEqual([
			`${trackedOf(7 * 3600)} tracked${P.COLUMN_OWED}${moneyOf(280, 'USD')}`
		]);

		await card.getByRole('button', { name: moreLabel, exact: true }).click();
		await expect(card.getByRole('button', { name: STATEMENTS.SHOW_FEWER, exact: true })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		expect(await rowsOf(card), 'opening the fold did not show all 7 days').toHaveLength(7);
		await expect(
			statements.getByRole('button', { name: LIMITS.COLLAPSE_ALL, exact: true }),
			'the header action did not flip to Collapse all'
		).toBeVisible();

		await statements.getByRole('button', { name: LIMITS.COLLAPSE_ALL, exact: true }).click();
		expect(await rowsOf(card), 'Collapse all did not fold the card back').toHaveLength(5);
		await statements.getByRole('button', { name: LIMITS.EXPAND_ALL, exact: true }).click();
		expect(await rowsOf(card), 'Expand all did not open the card').toHaveLength(7);
		report('fold', {
			header: await headerTextOf(statements),
			foldButton: await textOf(card.getByRole('button', { name: STATEMENTS.SHOW_FEWER, exact: true })),
			visibleRows: await rowsOf(card),
			total: await footersOf(card)
		});
	});

	// ---------------------------------------------------------- 11. the period steps

	test('11 · Previous period and Next period move the page and the read together', async ({ page, fixture }) => {
		const calls = await serveReport(page, { days: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);
		const group = periodGroup(page);
		const trigger = group.getByRole('button', { name: C.THIS_MONTH, exact: true });
		await expect(trigger, 'the period trigger does not name the active preset').toBeVisible();

		const previous = previousMonthPeriod();
		await group.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }).click();
		expect(await textOf(pageMeta(page)), 'the header meta did not follow the step back').toBe(
			`${periodTextOf(previous.from, previous.to)} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`
		);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
		const previousRead = lastOf(calls).params;
		expect(previousRead.startDate, 'the stepped period did not start at its first day').toBe(
			previous.from.toISOString()
		);
		expect(previousRead.endDate, 'the stepped period did not end at its last day').toBe(previous.to.toISOString());

		// stepping forward onto the month this page already read costs no read: the query key holds the period
		// (`use-payments-due-report.ts:263`) and a period holding today stays fresh for 30 s (`:271`). Measured by this
		// spec's own first whole-file run: after `Previous` the last read stayed the October one while the header went
		// back to `Nov 1 – 30`.
		const readsAfterStepBack = calls.length;
		await group.getByRole('button', { name: PERIOD.NEXT, exact: true }).click();
		const current = monthPeriod();
		expect(await textOf(pageMeta(page)), 'the header meta did not follow the step forward').toBe(
			`${periodTextOf(current.from, current.to)} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`
		);
		const readsAfterStepForward = calls.length;
		report('period-steps-cached', {
			readsAfterStepBack,
			readsAfterStepForward,
			lastRead: `${lastOf(calls).params.startDate} → ${lastOf(calls).params.endDate}`
		});
		expect(
			readsAfterStepForward,
			'stepping forward onto the month already read read the report again instead of reusing it'
		).toBe(readsAfterStepBack);

		// a month that was never read: `shiftPeriod` `:125-133` shifts a whole month by month, and the read follows
		const next = nextMonthPeriod();
		await group.getByRole('button', { name: PERIOD.NEXT, exact: true }).click();
		await expect.poll(() => lastOf(calls).params.startDate, { timeout: 20_000 }).toBe(next.from.toISOString());
		expect(lastOf(calls).params.endDate, 'the next month did not end at its last day').toBe(next.to.toISOString());
		expect(await textOf(pageMeta(page)), 'the header meta did not follow the steps forward').toBe(
			`${periodTextOf(next.from, next.to)} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`
		);
		report('period-steps', {
			steps: calls.map((call) => `${call.params.startDate} → ${call.params.endDate}`),
			meta: await textOf(pageMeta(page)),
			reads: calls.length
		});
	});

	// ---------------------------------------------------------- 12. the period popover: presets and a custom range

	test('12 · the period popover: the eight preset labels, a range picked from the calendar, the empty state step back, and Last month', async ({
		page,
		fixture
	}) => {
		const calls = await serveReport(page, { days: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);
		const group = periodGroup(page);

		const trigger = group.getByRole('button', { name: C.THIS_MONTH, exact: true });
		await trigger.click();
		// the preset column is the popover's first child div (`period-picker.tsx:129-146`); the calendar beside it adds
		// its own month-nav and Today buttons, which is why the whole popover holds 11 buttons (`probe-12.log` T1-regions)
		const presetColumn = popover(page).locator('div').first();
		const rows = presetColumn.getByRole('button');
		await expect(rows, 'the popover does not offer the eight presets').toHaveCount(PRESET_LABELS.length);
		expect(
			await rows.evaluateAll((nodes) =>
				nodes.map((node) => (node.querySelector('span')?.textContent ?? '').replace(/\s+/g, ' ').trim())
			),
			'the preset rows are not the eight labels the picker builds'
		).toEqual(PRESET_LABELS);
		report('popover', {
			rows: await allTextsOf(rows),
			calendarButtons: await popover(page)
				.locator('button[aria-label]')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))
		});

		/* A custom range, picked in this same popover and from the month it opened on — the current one, because the
		 period is `thisMonth` and `defaultMonth={value.from}` (`period-picker.tsx:156`). Days 10 and 14 exist in it on
		 any date and are never outside days: `showOutsideDays` only adds the tail of the previous month (from the 22nd
		 on) and the first days (1–6) of the next one. Counting days back from today instead, or trusting the month a
		 re-opened calendar shows, is what broke `s3-lane-c-paymentsdue-5.log` failure 1: cells `8` and `15` were read as
		 November while the test expected October. */
		const now = new Date();
		const from = new Date(now.getFullYear(), now.getMonth(), 10, 0, 0, 0, 0);
		const to = new Date(now.getFullYear(), now.getMonth(), 14, 23, 59, 59, 999);
		await popover(page).getByRole('gridcell', { name: '10', exact: true }).click();
		await popover(page).getByRole('gridcell', { name: '14', exact: true }).click();
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
		// `completedPeriodOf` anchors the range on `startOfDay(from)` / `endOfDay(to)` (`probe-10.log` R1: a range
		// clicked as 5 → 12 was read as `2026-10-04T22:00:00.000Z → 2026-10-12T21:59:59.999Z`)
		expect(lastOf(calls).params.startDate, 'the custom range did not start at the clicked day').toBe(
			from.toISOString()
		);
		expect(lastOf(calls).params.endDate, 'the custom range did not end at the clicked day').toBe(to.toISOString());
		const rangeText = periodTextOf(from, to);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${rangeText} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`);
		// the trigger now names the period instead of a preset (`triggerLabelOf` `:177-182`); it is the group's middle
		// button, between the two step buttons (`probe-10.log` R1 clicked it as `getByRole('button').nth(1)`)
		const rangeTrigger = group.getByRole('button').nth(1);
		await expect.poll(() => textOf(rangeTrigger), { timeout: 20_000 }).toEqual(rangeText);

		const statements = memberStatements(page);
		await expect(
			statements.getByText(copy(P.EMPTY_RANGE, { from: shortDayOf(from), to: shortDayOf(to) }), { exact: true }),
			'the empty state does not name the custom range, each end on its own'
		).toBeVisible();

		// the empty state's own action shifts the period by its own length (`shiftPeriod` `:130-132`): 10 → 14 is 5 days
		const shifted = { from: shiftDays(from, -5), to: shiftDays(to, -5) };
		await statements.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }).click();
		await expect.poll(() => lastOf(calls).params.startDate, { timeout: 20_000 }).toBe(shifted.from.toISOString());
		expect(lastOf(calls).params.endDate, 'the shifted range did not end at its last day').toBe(
			shifted.to.toISOString()
		);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${periodTextOf(shifted.from, shifted.to)} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`);

		// a preset row, picked from a re-opened popover: its accessible name is `<label> <dates>` and only this row in
		// this column carries the label; it resolves to the previous month
		await rangeTrigger.click();
		await popover(page).locator('div').first().getByRole('button', { name: C.LAST_MONTH }).click();
		const previous = previousMonthPeriod();
		await expect.poll(() => lastOf(calls).params.startDate, { timeout: 20_000 }).toBe(previous.from.toISOString());
		expect(lastOf(calls).params.endDate, 'the preset did not end at the last day of that month').toBe(
			previous.to.toISOString()
		);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${periodTextOf(previous.from, previous.to)} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`);
		report('custom-range', {
			queries: calls.map((call) => `${call.params.startDate} → ${call.params.endDate}`),
			meta: await textOf(pageMeta(page)),
			rangeText
		});
	});

	// ---------------------------------------------------------- 13. the member filter

	test('13 · the member filter narrows the read, the cards and the tile; removing it reuses the cached read', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		const calls = await serveReport(page, {
			honourIds: true,
			days: [
				{
					offset: -1,
					entries: [
						{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' },
						{ employeeId: teammate, seconds: 1800, amount: 20, rate: 40, currency: 'USD' },
						{ employeeId: restricted, seconds: 600, amount: 0, rate: null }
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);
		const readsBefore = calls.length;
		const statements = memberStatements(page);
		const monthMeta = `${periodTextOf(monthPeriod().from, monthPeriod().to)}`;
		await expectCards(statements, 3, 'the unfiltered page did not show the three member cards');

		expect(await cardNamesOf(statements), 'the unfiltered page did not show all three members').toEqual([
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.user }),
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.teammate }),
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.denied })
		]);

		await filterButton(page).click();
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		// the submenu is portalled, so wait for the rows before reading them
		const memberOptions = page.getByRole('menuitemcheckbox');
		await expect(memberOptions, 'the members submenu did not list the team three').toHaveCount(3);
		const options = await allTextsOf(memberOptions);
		report('filter-options', options);
		// each row's text carries the avatar initials before the name, in the order the menu listed them (`probe-4.log` Q2-submenu-items)
		expect(options, 'the members offered are not the team three in the order measured').toEqual(
			[fixture.names.user, fixture.names.denied, fixture.names.teammate].map(
				(name) => `${initialsOf(name)}${name}`
			)
		);

		await memberOption(page, fixture.names.teammate).click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect.poll(() => lastOf(calls).params['employeeIds[0]'], { timeout: 20_000 }).toBe(teammate);
		expect(employeeIdsOf(lastOf(calls)), 'the filtered read still asked for more than the picked member').toEqual([
			teammate
		]);
		const readsAfterPick = calls.length;
		expect(await textOf(pageMeta(page)), 'the header member count did not follow the filter').toBe(
			`${monthMeta} · ${copy(P.MEMBERS_COUNT, { count: 1 })}`
		);
		// the stub answered only the asked id, so the cards and the tile narrowed (finding 4)
		expect(await cardNamesOf(statements), 'the cards did not narrow to the picked member').toEqual([
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.teammate })
		]);
		expect(await textOf(tilesTile(page, 'USD')), 'the tile did not narrow with the filter').toBe(
			`${FIGURES.OWED}${moneyOf(20, 'USD')}USD${copy(FIGURES.CURRENCY_HINT, { count: 1, duration: trackedOf(1800) })}`
		);
		await expect(
			page.getByRole('button', {
				name: copy(LIMITS.REMOVE_MEMBER, { name: fixture.names.teammate }),
				exact: true
			}),
			'the chip does not carry the named remove button'
		).toBeVisible();
		await expect(page.getByText(`${C.MEMBER}:`, { exact: true }), 'the chip is not labelled Member:').toBeVisible();
		report('filtered', {
			lastQuery: lastOf(calls).params,
			cards: await cardNamesOf(statements),
			meta: await textOf(pageMeta(page))
		});

		// removing it brings the cached three-member read back and asks for nothing
		await page
			.getByRole('button', { name: copy(LIMITS.REMOVE_MEMBER, { name: fixture.names.teammate }), exact: true })
			.click();
		expect(await textOf(pageMeta(page)), 'the header member count did not come back').toBe(
			`${monthMeta} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`
		);
		expect(await cardNamesOf(statements), 'the cached members did not come back').toEqual([
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.user }),
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.teammate }),
			copy(STATEMENTS.MEMBER_LABEL, { name: fixture.names.denied })
		]);
		// and it cost no read: the newest read is still the one the filter asked for, and the total did not move
		// (`probe-4.log` Q2-after-remove)
		const readsAfterRemove = calls.length;
		report('after-remove', { readsBefore, readsAfterPick, readsAfterRemove, lastQuery: lastOf(calls).params });
		expect(readsAfterRemove, 'removing the filter read the report again instead of reusing the cached read').toBe(
			readsAfterPick
		);
		expect(
			employeeIdsOf(lastOf(calls)),
			'the newest read after removing the filter is not the filtered read the page reused'
		).toEqual([teammate]);

		// two members picked → two ids, sorted (`:243`)
		await filterButton(page).click();
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		await memberOption(page, fixture.names.teammate).click();
		await memberOption(page, fixture.names.denied).click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect
			.poll(() => employeeIdsOf(lastOf(calls)), { timeout: 20_000 })
			.toEqual([teammate, restricted].sort((first, second) => first.localeCompare(second)));
		expect(await textOf(pageMeta(page)), 'the header member count is not 2').toBe(
			`${monthMeta} · ${copy(P.MEMBERS_COUNT, { count: 2 })}`
		);

		await page.getByRole('button', { name: C.CLEAR_FILTERS, exact: true }).click();
		expect(await textOf(pageMeta(page)), 'Clear filters did not restore the header count').toBe(
			`${monthMeta} · ${copy(P.MEMBERS_COUNT, { count: 3 })}`
		);
		await expect(statements.locator('article'), 'Clear filters did not restore the cards').toHaveCount(3);
	});

	// ---------------------------------------------------------- 14. the filter that answers nothing

	test('14 · a filter whose answer holds no row: the filtered empty state, and Export disabled again', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		await serveReport(page, {
			honourIds: true,
			days: [
				{ offset: -1, entries: [{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' }] }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(memberCard(page, fixture.names.user), 'the unfiltered page rendered no card').toHaveCount(1);

		await filterButton(page).click();
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		await memberOption(page, fixture.names.teammate).click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');

		const statements = memberStatements(page);
		await expect(
			statements.getByText(P.EMPTY_FILTERED_TITLE, { exact: true }),
			'the empty state did not say the filters matched nothing'
		).toBeVisible();
		await expect(
			statements.getByText(P.EMPTY_FILTERED_MESSAGE, { exact: true }),
			'the filtered empty message is missing'
		).toBeVisible();
		await expect(
			statements.getByRole('button', { name: C.CLEAR_FILTERS, exact: true }),
			'the filtered empty state offers no way out'
		).toBeVisible();
		await expect(
			statements.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }),
			'the unfiltered empty action was offered on a filtered page'
		).toHaveCount(0);
		await expect(statements.locator('article'), 'a card survived a filtered empty answer').toHaveCount(0);
		await expect(exportButton(page), 'Export was offered with no row to export').toBeDisabled();
		expect(await textOf(unpricedTile(page)), 'the tiles kept a priced figure after the filter emptied it').toBe(
			`${FIGURES.OWED}${MISSING_FIGURE}`
		);
		report('filtered-empty', {
			header: await headerTextOf(statements),
			paragraphs: await allTextsOf(statements.locator('p')),
			buttons: await allTextsOf(statements.locator('button')),
			tile: await textOf(unpricedTile(page))
		});
	});

	// ---------------------------------------------------------- 15. the export

	test('15 · the export: the CSV file name and its rows, the PDF file name, and only when there are rows', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		await serveReport(page, {
			days: [
				{
					offset: -2,
					entries: [
						{ employeeId: manager, seconds: 3600, amount: 40, rate: 40, currency: 'USD' },
						{ employeeId: teammate, seconds: 7200, amount: 60, rate: 30, currency: 'EUR' },
						{ employeeId: restricted, seconds: 1800, amount: 0, rate: null }
					]
				},
				{
					offset: -1,
					entries: [{ employeeId: manager, seconds: 7200, amount: 160, rate: 40, currency: 'USD' }]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(exportButton(page), 'Export was disabled although the page has rows').toBeEnabled();

		await exportButton(page).click();
		const menuItems = await allTextsOf(page.getByRole('menuitem'));
		report('export-menu', menuItems);
		expect(menuItems, 'the export menu is not PDF then CSV').toEqual([C.PDF, LIMITS.CSV]);

		const csvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: LIMITS.CSV, exact: true }).click();
		const csv = await csvEvent;
		expect(csv.suggestedFilename(), 'the CSV is not named for the period the page shows').toBe(
			`payments-due-${localDayKeyOf(monthPeriod().from)}-${localDayKeyOf(monthPeriod().to)}.csv`
		);
		const csvPath = await csv.path();
		expect(typeof csvPath, 'the CSV download left no file to read').toBe('string');
		const raw = readFileSync(csvPath as string, 'utf8');
		// `downloadCsv` prepends the BOM (`dashboard-export.ts:56-60`), `csvOf` joins with `\r\n`
		expect(raw.codePointAt(0), 'the CSV does not start with the UTF-8 BOM').toBe(UTF8_BOM);
		const lines = raw.slice(1).split('\r\n');
		report('csv', { name: csv.suggestedFilename(), firstCodePoint: raw.codePointAt(0), lines });
		const keyOf = (offset: number) => localDayKeyOf(localDay(offset));
		expect(lines, 'the CSV is not the header, then each line, then one total row per member').toEqual([
			`${C.MEMBER},${C.DATE},${P.export.DURATION_HOURS},${P.export.RATE_PER_HOUR},${P.export.CURRENCY},${P.COLUMN_OWED}`,
			`${fixture.names.user},${keyOf(-2)},1,40,USD,40`,
			`${fixture.names.user},${keyOf(-1)},2,80,USD,160`,
			`${fixture.names.user},${C.TOTAL},3,,USD,200`,
			`${fixture.names.teammate},${keyOf(-2)},2,30,EUR,60`,
			`${fixture.names.teammate},${C.TOTAL},2,30,EUR,60`,
			`${fixture.names.denied},${keyOf(-2)},0.5,,USD,`,
			`${fixture.names.denied},${C.TOTAL},0.5,,USD,`
		]);

		const pdfEvent = page.waitForEvent('download');
		await exportButton(page).click();
		await page.getByRole('menuitem', { name: C.PDF, exact: true }).click();
		const pdf = await pdfEvent;
		report('pdf', { name: pdf.suggestedFilename(), bytesRead: false });
		expect(pdf.suggestedFilename(), 'the PDF is not named for the period the page shows').toBe(
			`payments-due-${localDayKeyOf(monthPeriod().from)}-${localDayKeyOf(monthPeriod().to)}.pdf`
		);
	});

	// ---------------------------------------------------------- 16. the pay rate the viewer may read, and cannot get

	test('16 · a day priced at a pay rate: the pay-rate read it triggers, and the rate the mock cannot supply', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		const payRateCalls: string[] = [];
		page.on('request', (request) => {
			const url = new URL(request.url());
			if (url.pathname.endsWith('/pay-rate')) {
				payRateCalls.push(`${request.method()} ${url.pathname}${url.search}`);
			}
		});
		// served exactly as `probe2.spec.ts` Q4 served it: the entry's own `currency` (here `lineCurrency`) is what
		// `lineCurrencyOf` (`payments-due.ts:358-367`) prices a **pay** line in — without it a pay line has no currency
		// at all and the card prints the bare number (`30.00`, this spec's `s3-lane-c-paymentsdue-3.log` failure 3)
		await serveReport(page, {
			days: [
				{
					offset: -4,
					entries: [
						{
							employeeId: manager,
							seconds: 3600,
							amount: 40,
							rate: 40,
							currency: 'USD',
							lineCurrency: 'USD',
							rateSource: 'billing'
						}
					]
				},
				{
					offset: -3,
					entries: [
						{
							employeeId: teammate,
							seconds: 3600,
							amount: 60,
							rate: 25,
							currency: 'EUR',
							lineCurrency: 'EUR',
							rateSource: 'pay'
						},
						{
							employeeId: restricted,
							seconds: 3600,
							amount: 30,
							rate: 50,
							currency: 'USD',
							lineCurrency: 'USD',
							rateSource: 'pay'
						}
					]
				},
				{
					offset: -2,
					entries: [
						{ employeeId: manager, seconds: 3600, amount: 50, rate: 40, currency: 'USD' },
						{
							employeeId: restricted,
							seconds: 3600,
							amount: 100,
							rate: 50,
							currency: 'USD',
							lineCurrency: 'USD',
							rateSource: 'pay'
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => payRateCalls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);

		// `payLineEmployeeIdsOf` (`:343-356`): only the members a pay line priced are asked about, in their own ids
		const askedFor = [
			...new Set(payRateCalls.map((call) => call.match(/\/employee\/([^/]+)\/pay-rate/)?.[1] ?? ''))
		].sort();
		report('pay-rate-reads', { payRateCalls, membersAsked: askedFor });
		expect(askedFor, 'the pay rate was read for someone with no pay line').toEqual(
			[teammate, restricted].sort((first, second) => first.localeCompare(second))
		);
		expect(
			payRateCalls.map((call) => call.replace(/\?.*$/, '?organizationId=…&tenantId=…')),
			'the pay-rate call is not the one rate.service.ts:80-87 builds'
		).toEqual([
			`GET /api/employee/${teammate}/pay-rate?organizationId=…&tenantId=…`,
			`GET /api/employee/${restricted}/pay-rate?organizationId=…&tenantId=…`
		]);

		// the mock's `pagination([])` cannot pass `employeePayRateSchema` → `rateShownOf` 'hidden' → `–`, amount intact
		const payCard = memberCard(page, fixture.names.denied);
		await expect(payCard, 'the member with pay lines is missing').toHaveCount(1);
		// a pay line keeps its duration and the amount Gauzy reported, and shows no `× rate` formula (`probe-6.log` Q4:
		// `Sun, Nov 221h 0m$30.00`)
		expect(await rowsOf(payCard), 'a pay line lost the amount Gauzy reported').toEqual([
			`${lineDayOf(localDay(-3))}${trackedOf(3600)}${moneyOf(30, 'USD')}`,
			`${lineDayOf(localDay(-2))}${trackedOf(3600)}${moneyOf(100, 'USD')}`
		]);
		await expect(
			payCard.getByText(MISSING_FIGURE, { exact: true }),
			'the unread pay rate is not hidden behind –'
		).toHaveCount(1);
		await expect(
			payCard.getByText(P.NO_RATE, { exact: true }),
			'a pay line claimed the member has no rate'
		).toHaveCount(0);
		expect(await footersOf(payCard), 'the pay card total is not what was measured').toEqual([
			`${trackedOf(2 * 3600)} tracked${P.COLUMN_OWED}${moneyOf(130, 'USD')}`
		]);

		// the same member appears twice more: a plain billing line and one the picker labelled `billing`
		const managerCards = memberCard(page, fixture.names.user);
		await expect(managerCards, 'the manager did not appear as two cards (finding 6)').toHaveCount(2);
		expect(await allTextsOf(managerCards), 'the manager cards are not the two measured cards').toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}${copy(P.DAYS_COUNT, { count: 1 })}${rateOf(50, 'USD')}${lineDayOf(localDay(-2))}${formulaOf(3600, 50, 'USD')}${moneyOf(50, 'USD')}${trackedOf(3600)} tracked${P.COLUMN_OWED}${moneyOf(50, 'USD')}`,
			`${initialsOf(fixture.names.user)}${fixture.names.user}${copy(P.DAYS_COUNT, { count: 1 })} · ${P.PAY_RATE_NOT_SET}${rateOf(40, 'USD')}${lineDayOf(localDay(-4))}${formulaOf(3600, 40, 'USD')}${moneyOf(40, 'USD')}${trackedOf(3600)} tracked${P.COLUMN_OWED}${moneyOf(40, 'USD')}`
		]);

		report('rate-sources', {
			cards: await allTextsOf(memberStatements(page).locator('article')),
			tiles: await tilesSummaryOf(page),
			payRateReads: payRateCalls.length,
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120))
		});
		expect(consoleFindings(shield), 'the failed pay-rate validation logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------- 17. a read that fails

	test('17 · a refused read: the notice, the retry reads again, and only the armed failure reaches the console', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = await serveReport(page, { refusal: 500 });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		const readsBeforeRetry = calls.length;

		const notice = errorNotice(page);
		await expect(notice, 'the error notice is missing').toHaveCount(1);
		// `innerText`, because the notice's three parts sit in separate elements and `textContent` runs them together
		// (`s3-lane-c-paymentsdue-1.log` failure 15: `…could not loadCheck your connection…Try again`)
		expect(await innerOf(notice), 'the notice is not title + message + action').toBe(
			`${STATES.ERROR_TITLE} ${STATES.ERROR_MESSAGE} ${TRY_AGAIN}`
		);
		// `showsError` gates the whole report (payments-due-page.tsx:60, :111)
		await expect(tilesRegion(page), 'the tiles were drawn over a failed read').toHaveCount(0);
		await expect(memberStatements(page), 'the statements were drawn over a failed read').toHaveCount(0);
		await expect(exportButton(page), 'Export was offered over a failed read').toBeDisabled();

		await page.getByRole('button', { name: TRY_AGAIN, exact: true }).click();
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThan(readsBeforeRetry);
		report('refused-read', {
			readsBeforeRetry,
			readsAfterRetry: calls.length,
			notice: await innerOf(notice),
			httpLines: shield.logMatching(/HttpClient/).length,
			armedLines: armedFailureLines(shield, 500).length
		});
		expect(
			consoleFindingsWithArmed(shield, 500),
			'the console carried something besides the 500 this file armed on this path'
		).toEqual([]);
		expect(
			armedFailureLines(shield, 500).length,
			'the client did not log the refusal it got'
		).toBeGreaterThanOrEqual(1);
		expect(shield.pageErrors(), 'a failed read threw a page error').toEqual([]);
	});

	// ---------------------------------------------------------- 18. an answer that does not parse

	test('18 · an answer that fails owedReportDaySchema: the page treats it exactly like a refused read', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = await serveReport(page, {
			rawBody: [
				{
					date: localDayKeyOf(localDay(-1)),
					employees: [{ employee: { id: fixture.ids.employee }, amount: 'not-a-number', duration: -5 }]
				},
				{ employees: [] }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);

		const notice = errorNotice(page);
		await expect(notice, 'the malformed answer did not produce the notice a refusal produces').toHaveCount(1);
		expect(await innerOf(notice), 'the notice is not the one a refusal shows').toBe(
			`${STATES.ERROR_TITLE} ${STATES.ERROR_MESSAGE} ${TRY_AGAIN}`
		);
		await expect(tilesRegion(page), 'the tiles were drawn over an answer that does not parse').toHaveCount(0);
		await expect(
			memberStatements(page),
			'the statements were drawn over an answer that does not parse'
		).toHaveCount(0);
		await expect(exportButton(page), 'Export was offered over an answer that does not parse').toBeDisabled();
		report('malformed-answer', {
			reads: calls.length,
			notice: await innerOf(notice),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors(),
			httpLines: shield.logMatching(/HttpClient/).length
		});
		// `validateApiResponse` throws inside the query, so nothing reaches the console (finding 8)
		expect(shield.consoleErrors(), 'a rejected answer logged something').toEqual([]);
		expect(shield.pageErrors(), 'a rejected answer threw a page error').toEqual([]);
	});
});
