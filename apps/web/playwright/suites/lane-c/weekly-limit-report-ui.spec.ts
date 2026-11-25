import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { mockReset, signInAndVisit } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in manager sees on **Reports › Weekly limit** (`/reports/weekly-limit`,
 * `app/[locale]/(main)/reports/weekly-limit/page.tsx:13-20` →
 * `core/components/dashboards/weekly-limit/weekly-limit-page.tsx`), on lane-c (app `http://localhost:3033`, mock
 * `http://127.0.0.1:4002`, statistics `4003`, control `4004`, issuer `4005`, `playwright/test-servers.ts:37-42`). Who may
 * open this page at all — and that it opens as **Daily** — is pinned by `suites/lane-a/reports-gate-by-role-ui.spec.ts`
 * (this page is admitted by the default arm, heading measured `Daily limit`); every case here signs in as the fixture
 * manager, who may.
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `E:\Coding\.tmp\probe-weeklylimit\probe1.spec.ts` (P1), `probe2.spec.ts` (Q1-Q2),
 * `probe3.spec.ts` (R1-R7), `probe4.spec.ts` (S1, S2 and S4 — S3 failed and its case was re-probed as U1),
 * `probe6.spec.ts` (U1-U2), `probe9.spec.ts` (V1-V2), `probe10.spec.ts` (W1) and `probe12.spec.ts` (X1-X2), run on this
 * lane on 2026-11-25 and logged in `E:\Coding\.tmp\s3-lane-c-weeklylimit-probe-1.log`, `-probe-2.log`, `-probe-3.log`,
 * `-probe-4.log`, `-probe-8.log`, `-probe-9.log`, `-probe-11.log` and `-probe-12.log`. `-probe-6.log` and
 * `-probe-7.log` are the same `probe6` run twice cut off by a lane restart (`connect ECONNREFUSED 127.0.0.1:3990`) and
 * carry no measurement; `probe4.spec.ts` S3 failed on a locator, so the one-day period is pinned from `-probe-8.log`
 * instead, and `-probe-10.log` is the same `probe10` run failing on the probe's own wrong group name
 * (`getByRole('group', { name: 'Limit period' })` — that name belongs to the duration `tablist`, the picker's group is
 * `dashboard.period.LABEL` = `Period`) and carries only its month-view half. Whole-file runs that disagreed with an
 * assertion printed the rest: `-1.log` (16 failed) the page snapshots behind findings 12 and 13, `-fix-1.log` (4 failed)
 * the CSV lines behind test 17 and 18 and the `filter({ has })` trap behind `memberRows`, `-fix-2.log` (2 failed) the
 * calendar `columnheader`s of finding 14 and the footer behaviour of finding 15. Every value asserted below is one those
 * runs printed. Served days are offsets from
 * the day the run runs on (`localDay`, the pattern of `suites/lane-c/payments-due-report-ui.spec.ts:290-328`), every
 * formatted string is rebuilt here from the same offsets and the same `Intl` options the page uses, and no case names
 * today's date. The browser zone (`Europe/Madrid` on this PC) is read from the page, never hard-coded.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, the shell and its reads, NextAuth, and the mock's own fixtures — the tenant, organization
 * and team ids (`fixture.ids`); the team's three members and their names (`mock-gauzy-server.mjs:100-137`, rendered
 * `Fixture Manager` / `Fixture Teammate` / `Fixture Restricted Teammate` — `nameOf` (`weekly-limit.ts:246-260`) takes the
 * team member name first); the organization the shell reads (`mock-gauzy-server.mjs:86-96`, which carries **no**
 * `startWeekOn` and **no** `standardWorkHoursPerDay`, and that is why the week starts on Monday here and every limit
 * falls back to 8 h × 5); the fixture role's permissions. Test 1 runs with **no stub**: the mock's own handler answers
 * the report with a plain `[]` (`cypress/support/mock-gauzy-server.mjs:796`), and that is the whole empty page.
 *
 * **Served by this file:** every report answer from test 2 on, through `page.route` on the mock origin (the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`), because the mock has no idea what a limit row looks like.
 * Each answer restates the mock's CORS answer (`mock-gauzy-server.mjs:1085-1101`, `OPTIONS` → 204) — the page is on
 * `localhost:3033` and the API on `127.0.0.1:4002`. Where a case filters members, the stub answers **only the
 * `employeeIds` the query asked for** (`honourIds`), which is what a real backend does and what lets a filter visibly
 * empty the page (test 13). `route.fetch()` is never called, so `mock.calls(REPORT_PATH)` stays empty in every stubbed
 * test — the witness that the page acted on this file and not on the mock.
 *
 * Two cases also serve **`GET /api/organization/<id>`** with fields the mock's fixture does not carry
 * (`startWeekOn: 'SUNDAY'`, `standardWorkHoursPerDay: 0`), because that read is what the workspace-week-start atom and
 * the standard-work-day fallback are built from (`core/stores/user/user-organizations.ts:39-42`,
 * `core/hooks/auth/use-current-organization.ts:16-46`, `use-weekly-limit-report.ts:217`).
 *
 * **The browser talks to the mock, never to the app's route twins** (measured in `probe-1.log` P1-reads): the lane
 * points the client's axios base at `<mock origin>/api`, so `app/api/**` is not in this file's path.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `weekly-limit-page.tsx`: `PAGE_PATH` `:26`; `titleOf` `:30-35` (`common.WEEKLY_LIMIT` / `common.DAILY_LIMIT`, the
 *   duration coming from `use-weekly-limit-report.ts:163` `useState<LimitDuration>('day')`); the meta
 *   `formatPeriod(period) · MEMBERS_COUNT(report.populationCount)` `:79-81`; the header `meta`
 *   `isMetaLoading={!report.isTeamReady}` `:101-102`; `ExportMenu` `:105`; `PeriodPicker weekStartsOn={weekStart}
 *   locale={locale}` `:108-113`; `MemberFilterMenu` `:114-119`; `LimitDurationSwitch` `:122-124`; `AppliedMemberFilters`
 *   `:125-132`; `isExportDisabled = !hasEntries || isLoading` `:82`; `DashboardErrorNotice onRetry={report.refetch}`
 *   `:137`; the `showsNoMembers` branch `:138-145`; the skeletons `:146-151`; `LimitAttentionList` `:154-161`;
 *   `LimitHeatmap` `:162-177` with `WeeklyLimitEmpty` as its `empty` `:169-176`; the breadcrumb `:88-91`.
 * - `core/hooks/dashboards/weekly-limit/use-weekly-limit-report.ts`: `fetchWeeklyLimit` `:70-77` (when the API was asked
 *   for `day` while the page shows weeks, the days are added into weeks by `weeklyReportsOfDays`); `teamMembersOf`
 *   `:99-116` (sorted); the request `:184-199` (`employeeIds` **sorted**, `startDate: serviceDayOf(period.from)`,
 *   `endDate: serviceDayOf(period.to)`, `duration: apiLimitDurationOf(duration, weekStart)`, `timeZone`); `isEnabled`
 *   `:201-203`; the query `:206-214` (`limitCacheParamsOf` `weekly-limit.ts:106-112`, `placeholderData` limited to the
 *   same `scopeKey`, `liveQueryOptionsOf` — `core/lib/utils/dashboard-live.ts`: a period holding today is read with
 *   `staleTime` 30 s and `refetchInterval` 60 s); `standardHoursPerDay = organization?.standardWorkHoursPerDay ??
 *   DEFAULT_WORK_HOURS_PER_DAY` `:217` (`constants.tsx:823` = 8); `shown` `:219-245` (`standardLimitOf`,
 *   `limitEntriesOf`, `limitFiguresOf`, the members-without-time lists built from `result.request.params.employeeIds`);
 *   `groups` / `memberGroups` / `matrixRows` / `attention` `:248-252`; `populationCount` `:295`.
 * - `core/services/client/api/timesheets/time-log.service.ts:104-135`: `getTimeLimitsReport` adds `tenantId` and
 *   `organizationId` `:105`, moves `startDate` to the **start of the day in the browser's zone** `:113-114` and
 *   `endDate` to its end `:109-110` (`core/lib/helpers/format-date-range.ts:97`, `:105`), `qs.stringify` `:117`,
 *   `GET /timesheet/time-log/time-limit?<query>` `:121-127`, and on a `ZodValidationError` logs
 *   `Time limits report validation failed:` `:128-131` before rethrowing.
 * - `core/types/schemas/timer/time-limit-report.schema.ts:9-32`: the answer is `timeLimitReportListSchema.array()` —
 *   `date` a required string, `employees[]` of `{ employee: employeeSchema (its `id` must be a UUID), duration,
 *   durationPercentage, limit }`, each figure `z.coerce.number().min(0)`.
 * - `core/lib/utils/dashboards/weekly-limit.ts`: `LIMIT_WEEK_START = 1` `:27` (Monday), `WORK_DAYS_PER_WEEK = 5` `:31`,
 *   `LIMIT_DAYS_PER_WEEK = 5` `:127`; `requestPeriodOf` `:89-100` (the period snapped to the workspace week start);
 *   `apiLimitDurationOf` `:118-124` (a week asked with a non-Monday week start is asked as `day`); `addedItemOf`
 *   `:146-152` (a week's limit is `limit × 5`); `weeklyReportsOfDays` `:158-183`; `serviceDayOf` `:189-191`;
 *   `standardLimitOf` `:211-217`; `isLimitPeriodStart` `:225-230` (an answer row that does not start a period is
 *   dropped by `limitEntriesOf` `:337-356`); `measuredLimitOf` `:270-275` and `entryOf` `:303-334` (an answer limit of
 *   `0` falls back to the organization standard, and `isStandardLimit` marks the row); `limitTotalsOf` `:358-383`;
 *   `groupsByMemberOf` `:449-471` (rows by member name); `limitShareLabelOf` `:562-575` (a whole percent unless rounding
 *   would cross a threshold); `clockHoursOf` `:596-601`; `overrunOf` / `leftOf` `:603-615`; `periodLabelOf` `:634-641`;
 *   `isCurrentPeriod` `:643-648`; `limitHeatStepOf` `:655-679`; `limitColumnsOf` `:749-771`; `limitMatrixRowsOf`
 *   `:813-829`; `attentionOf` `:864-890` (`used`/`limit` summed over the **flagged** periods only — the over ones, or the
 *   near ones when none is over) and `byAttention` `:899-913` (over first, then the largest overrun, then the share,
 *   then the name); `membersWithoutTimeOf` `:933-956`.
 * - `limit-heatmap.tsx`: `dayHeadingOf` `:121-128` and `weekHeadingOf` `:130-137` (a column is its short weekday and day
 *   number, or its two ends, plus an `sr-only` full label, plus an `sr-only` `common.TODAY` / `common.THIS_WEEK` on the
 *   current one — `ColumnHeader` `:419-442`); `figuresOf` `:161-174` (`CELL_UPCOMING` for a future column, else
 *   `CELL_NO_TIME`, `CELL_TRACKED_NO_LIMIT`, `CELL_USED_OF`); `cellReadingOf` `:212-226` (the cell's `aria-label`, parts
 *   joined with `' · '`); `HeaderRow` `:496-530` (`common.MEMBER`, `dashboard.weeklyLimit.COLUMN_USED`);
 *   `CompactTotal` `:539-550` and `MemberRowHeader` `:559-595` (the row header, `STANDARD_LIMIT` at `:587-591`);
 *   `RowTotal` `:597-607`; `HeatRow` `:609-671` (`data-member-row`, `role=gridcell`, `aria-label={reading.sentence}`);
 *   `HeatLegend` `:695-728`; `MembersWithoutTimeLine` `:730-748` (`Intl.ListFormat`, conjunction, the reader's locale);
 *   `LimitHeatmap` `:851-1025` (`role=grid` `:988`, `aria-label={title}` `:990`, `aria-busy={isUpdating}` `:991`, the
 *   meta `MEMBERS_COUNT(rowCount)` `:876`, `{!hasRows && empty}` `:1017`, `HeatFooter` only with rows `:1023`).
 * - `limit-attention.tsx`: `VISIBLE_COUNT = 5` `:15`; `AttentionLine` `:57-112` (the initials, the name, `t.rich
 *   ('…ATTENTION_USED_OF')`, `OVER_KEYS`/`NEAR_KEYS` parts); `CalmLine` `:128-136` (`ATTENTION_NONE`);
 *   `LimitAttentionList` `:142-202` (the title, the meta `MEMBERS_COUNT(total)`, the `sr-only` `ATTENTION_ROW_HINT`).
 * - `weekly-limit-toolbar.tsx`: `MemberFilterMenu` `:18-59` (category `common.MEMBERS`, avatar-initial icons →
 *   `tasks/property-filter-menu.tsx:98` `common.FILTER` and `FilterOptionRow`); `AppliedMemberFilters` `:61-107` (the
 *   chip `common.MEMBER` `:85`, its remove button `dashboard.weeklyLimit.REMOVE_MEMBER` `:90`, `common.CLEAR_FILTERS`
 *   `:103`); `LimitDurationSwitch` `:110-127` (`SegmentedControl`, `role=tablist` / `role=tab`).
 * - `weekly-limit-export.tsx`: `FILE_PREFIXES` `:34-37` (`daily-limit` / `weekly-limit`); `csvColumnsOf` `:93-107`;
 *   `sharePercentOf` `:44-47`; `useWeeklyLimitMatrixExportOptions` `:306-360` (the options and their order);
 *   `exportFileOf` `:254-277` → `core/lib/utils/dashboard-export.ts` `periodFileNameOf` `:86-88`, `downloadCsv` `:56-60`
 *   (a UTF-8 BOM), `csvOf` (lines joined with `\r\n`).
 * - `kit/period-picker.tsx`: the `role=group` named `dashboard.period.LABEL` `:117`, the step buttons named
 *   `dashboard.period.PREVIOUS` `:121` / `dashboard.period.NEXT` `:168`, the trigger labelled by the active preset or by
 *   the dates `:76-78` and `:177-186`, the eight preset rows each with the dates it resolves to `:80-87` and
 *   `:135-149`, the `Calendar mode="range"` whose **second** click applies `:100-112` and `:152-161`
 *   (`completedPeriodOf` anchors on `startOfDay(from)` / `endOfDay(to)` `:40-47`);
 *   `core/lib/utils/dashboard-period.ts` (`DEFAULT_PERIOD_PRESETS` `:59-68`, `periodOfPreset` `:82-108`, `shiftPeriod`
 *   `:125-133`, `formatPeriod` `:147-158`); `kit/dashboard-states.tsx:20-24` (`dashboard.states.ERROR_TITLE` +
 *   `ERROR_MESSAGE` + `pages.unauthorized.TRY_AGAIN`); `kit/export-menu.tsx` (one `common.EXPORT` button, one item per
 *   option); `weekly-limit-table.tsx` supplies only `WeeklyLimitEmpty` to this page (`:467-500`) and its title is chosen
 *   by `emptyTitleOf` `:512-521` (`EMPTY_DAY` when both ends print alike, else `EMPTY_RANGE`).
 *
 * ## What this file found (measured; each has the line that explains it)
 *
 * 1. **A day exactly at the limit reads `100%` and `Near limit`.** `limitVerdictOf` (`dashboard-figures.ts:151-160`)
 *    flags `over` only above 100 %, so 8 h 0 m against an 8 h limit is flagged `near` — measured
 *    `Mon, Nov 23 · 8h 0m of 8h · 100% · Near limit` (`probe-9.log` V1-dom.cellLabels).
 * 2. **A share that would round onto a threshold prints one decimal, and a 10-second overrun prints `0h 0m over`**:
 *    8 h 0 m 10 s against 8 h read `Tue, Nov 24 · 8h 0m of 8h · 100.1% · 0h 0m over` (`probe-3.log` R4-shareCell),
 *    because `limitShareLabelOf` `:562-575` keeps a tenth when the rounded percent would change the verdict while
 *    `overrunOf` `:603-608` feeds `formatDurationShort`, which floors to minutes.
 * 3. **The row total can read `Within limit` while a day cell in the same row reads `113% · 1h 0m over`.** With the month
 *    as the period, 9 h over one day and 2 h over another summed to `11h 0m / 16h` = 68.75 % (`limitTotalsOf`
 *    `:358-383`), so the row verdict is `within` (`probe-11.log` W1-month.rowheaders, against W1-afterSecond: the same
 *    answer looked at its **one-day** period read `9h 0m / 8h · Over limit`) — the period's own length decides it. The
 *    total's limit is the standard per **day that carries time**, not one per period day: the same answer also read
 *    `26h 30m / 24h` over three served days (`s3-lane-c-weeklylimit-1.log` failure 7 page snapshot).
 * 4. **An answer row whose date is not a period start is silently dropped.** Asked `duration=week` (Monday weeks) with
 *    rows dated 2026-11-16, **2026-11-19** and 2026-11-23, only the two Mondays appeared; the Thursday's 5 h is gone
 *    (`probe-3.log` R2-served against R2-dom.cellLabels), because `limitEntriesOf` `:337-356` keeps only entries passing
 *    `isLimitPeriodStart` `:225-230`.
 * 5. **A workspace whose week starts on Sunday is asked `duration=day` and the days are added into weeks here.** Serving
 *    `startWeekOn: 'SUNDAY'` on the organization read, the weekly view asked `duration=day` with Sunday-to-Saturday
 *    bounds and summed served days 11-16, 11-22 and 11-23 into `Nov 15 – 21 · 2h 0m of 40h` and
 *    `Nov 22 – 28 · 7h 0m of 40h` (`probe-3.log` R1-queries, R1-dom.cellLabels) — `apiLimitDurationOf`
 *    `weekly-limit.ts:118-124` plus `fetchWeeklyLimit` `use-weekly-limit-report.ts:70-77`, exactly the rule
 *    `core/lib/utils/dashboards/weekly-limit-week-start.test.ts` pins for the pure functions.
 * 6. **A limit of `0` in the answer is not "no limit": it falls back to the organization standard** (
 *    `entryOf` `:303-334`, `measuredLimitOf` `:270-275`), so a member served `limit: 0` read `4h 0m / 8h` with
 *    `Organization standard` (`probe-2.log` Q1-dom.rowheaders). No limit at all needs the *organization* standard to be
 *    0 as well: serving `standardWorkHoursPerDay: 0` gave `2h 0m / – · No limit` and the cell
 *    `Tue, Nov 24 · 2h 0m tracked, no limit` (`probe-3.log` R3-dom).
 * 7. **Stepping back onto a period that was already read costs no read** (`probe-3.log` R4-queries: two reads after
 *    `Previous`, still two after `Next`, while the header moved back to `Nov 1 – 30`) — the query key holds the params
 *    (`limitCacheParamsOf` `weekly-limit.ts:106-112`) and a live period has `staleTime` 30 s
 *    (`liveQueryOptionsOf`, `use-weekly-limit-report.ts:214`).
 * 8. **A refused read and an answer that does not parse are indistinguishable on screen.** Both rendered the same
 *    `This part of the report could not load … Try again` notice, no grid, Export disabled
 *    (`probe-3.log` R6-refusedDom, R7-dom). They differ only in the console: the refusal logs the client's
 *    `[HttpClient] HTTP Error: GET /timesheet/time-log/time-limit?<query> 500`, the bad answer logs
 *    `[App] Time limits report validation failed:` (R6-console, R7-console — `time-log.service.ts:128-131`), and neither
 *    produced a page error.
 * 9. `NO_MEMBERS_*` (`weekly-limit-page.tsx:28`, `:138-145`) was **not reachable** on this lane: the mock's team always
 *    answers three members (`mock-gauzy-server.mjs:217-224`) and `showsNoMembers` needs an empty member list
 *    (`use-weekly-limit-report.ts:267`). Not forced here.
 * 10. Dead branches this page never renders (no importer anywhere in `core/` or `app/`): `WeeklyLimitTable`,
 *    `WeeklyLimitTableSkeleton` and `TotalsRow` (`weekly-limit-table.tsx:297-459` — the page imports only
 *    `WeeklyLimitEmpty`, `weekly-limit-page.tsx:23`), so `COLUMN_DAY` / `COLUMN_WEEK`, `SECTION_DAYS` / `SECTION_MEMBERS`
 *    (`:447`, `DAYS_WITHOUT_TIME` `:447`), `LimitShare`, `RemainingValue` and `VerdictCounts` (`limit-cells.tsx:70-132`)
 *    never appear; `WeeklyLimitFigures` / `WeeklyLimitFiguresSkeleton` (`weekly-limit-figures.tsx:107-134`) so
 *    `FIGURES_LABEL`, `DAYS_OVER`, `DAYS_NEAR`, `AFFECTED_MEMBERS` never appear; `LimitViewControls`
 *    (`weekly-limit-toolbar.tsx:129-157`) so the hook's `grouping` (`use-weekly-limit-report.ts:164`, `:248`) and
 *    `GROUPING_PERIOD` / `GROUPING_MEMBER` are unreachable; and `emptyPeriodCount` (`:254-260`, returned at `:303`) is
 *    computed but never consumed by the page. Probed dumps confirm it: every grid on this page is a `role=grid` heatmap
 *    and no `table` element appeared in any dump.
 * 11. The attention line's `used` / `limit` cover **only the flagged periods**: one member served 8 h 0 m (exactly at the
 *    limit) and 12 h (over) read `12h 0m of 8h` in the attention line — the over day only — while its row total read
 *    `20h 0m / 16h` (`probe-9.log` V1-dom.attentionLines against V1-dom.rowTotalCells); with 10 h and 9 h over two days
 *    plus 7 h 30 m near a third, the line read `19h 0m of 16h` and `3h 0m over on 2 days`
 *    (`probe-4.log` S1-dom.attentionLines). `attentionOf` `:864-890` sums `flaggedEntriesOf` `:850-855`.
 * 12. **The heatmap grid's own header row is a `row` too**, so counting `getByRole('row')` on this page counts one row
 *    more than there are members: the empty page reported `Received: 1` for an assertion of none
 *    (`s3-lane-c-weeklylimit-1.log` failure 1 and its page snapshot, `row > columnheader "Member"`). `ColumnHeader`
 *    builds it as `role="row"` (`limit-heatmap.tsx:509`); only `HeatRow`'s rows carry a `rowheader` (`HeatRow` `:632`
 *    opening with `MemberRowHeader` `:568`), which is what `memberRows` above filters on — with one member served the
 *    grid holds 2 rows and 1 rowheader (`probe-11.log` W1-month.dom).
 * 13. **While the report loads, the `Needs attention` region already holds three empty `li`** —
 *    `LimitAttentionSkeleton` over `SKELETON_LINES = [64, 52, 58]` (`limit-attention.tsx:203`, `:205-224`) — and they
 *    read as empty strings, so a `li` count in that region counts the skeleton, not the members: an early version of
 *    test 8 got `["", "", ""]` where it expected three filled lines (`s3-lane-c-weeklylimit-1.log` failure 7). A filled
 *    line is the one that carries a button (`AttentionLine`, used at `:166-171`), which is what `attentionLines`
 *    filters on. With nothing flagged the same region renders `CalmLine`, a single `<p>` and no `li` at all (`:127-135`).
 * 14. **The period popover closes on its own, but not the instant the report reacts to the picked range**: the
 *    `[data-slot=popover-content]` node is still there right after the second calendar day is clicked and gone a moment
 *    later (`probe-12.log` X1-afterSecondRightAway `popovers: 1` against X1-afterSecondSettled `popovers: 0`), and while
 *    it is open its calendar contributes seven `columnheader`s of its own (`Mon`…`Sun`) to any page-wide count of that
 *    role (`s3-lane-c-weeklylimit-fix-2.log` failure 2). Test 7 waits for the popover to be gone and reads the grid's
 *    own header row inside the heatmap section.
 * 15. **A member the answer never names gets no row and one footer line instead.** Asked for all three members and
 *    answered for two, the heatmap printed 2 rowheaders and the paragraph
 *    `1 member tracked no time: Fixture Restricted Teammate` (`probe-12.log` X2-dom, `probe-9.log` V1-dom), and answered
 *    for all three it printed no footer paragraph at all (`s3-lane-c-weeklylimit-fix-2.log` MEASURE rows.footerParagraphs
 *    `[]`): `membersWithoutTimeOf` (`weekly-limit.ts:933-956`) lists the requested-but-unreported members sorted by name
 *    (`byMemberName` `:928-930`) and `MembersWithoutTimeLine` (`limit-heatmap.tsx:730-748`) joins them with
 *    `new Intl.ListFormat(locale, { type: 'conjunction' })`.
 *
 * ## What this file does not cover
 *
 * The PDF's bytes (only its file name is checked); `NO_MEMBERS_*` (finding 9); the `UPDATING` bar and the page skeletons
 * (`isUpdating` / `isLoading`, which need a slow read this file does not arm); `LimitAttentionList`'s `Show all` folding
 * (`VISIBLE_COUNT = 5`, `limit-attention.tsx:15` — the fixture team has three members, so six flagged members are not
 * reachable); `pdfShareOf` and the workspace date-format variants `core/lib/utils/dashboards/report-workspace-locale.test.ts`
 * pins (the fixture organization carries no workspace format, `mock-gauzy-server.mjs:86-96`, so the browser's own
 * `Intl` is what prints here); the keyboard grid navigation the `sr-only` `HEATMAP_KEYS_HINT` advertises
 * (`limit-heatmap.tsx:1019-1021`); the dead components of finding 10; and what other specs already pin for this page —
 * `suites/lane-a/reports-gate-by-role-ui.spec.ts` (who may open it) and `suites/api/**` (the Next route twins).
 */

const PAGE_PATH = '/reports/weekly-limit';
const REPORT_PATH = '/api/timesheet/time-log/time-limit';
/** The path the client logs a failure under: its axios base already holds `/api` (`time-log.service.ts:121-127`). */
const REPORT_LOGGED_PATH = '/timesheet/time-log/time-limit';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
/** `limit-heatmap.tsx:100` and `limit-cells.tsx:29-34`: the figure the page puts where a limit cannot be. */
const MISSING_FIGURE = '–';
/** The fixture workspace's locale, which every formatted string below is rebuilt with (test 1 prints `lang`). */
const WORKSPACE_LOCALE = 'en';
const UTF8_BOM = 65279;
const HOUR = 3600;
/** `weekly-limit.ts:27` `LIMIT_WEEK_START = 1` (Monday) and `:31` `WORK_DAYS_PER_WEEK = 5`. */
const MONDAY = 1;
const SUNDAY = 0;
const WORK_DAYS_PER_WEEK = 5;
/** `constants.tsx:823` `DEFAULT_WORK_HOURS_PER_DAY = 8`, the fallback `use-weekly-limit-report.ts:217` uses. */
const STANDARD_DAY_LIMIT = 8 * HOUR;
const STANDARD_WEEK_LIMIT = STANDARD_DAY_LIMIT * WORK_DAYS_PER_WEEK;

type Copy = Record<string, string>;
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	dashboard: { weeklyLimit: Copy; period: Copy; states: Copy };
	common: Copy;
	pages: { unauthorized: Copy };
};
const L = EN.dashboard.weeklyLimit;
const PERIOD = EN.dashboard.period;
const STATES = EN.dashboard.states;
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
/** `ATTENTION_USED_OF` is rich text (`limit-attention.tsx:97` renders it with `t.rich`); its text is the template without the chunk tags. */
const USED_OF_TEMPLATE = L.ATTENTION_USED_OF.replace(/<\/?strong>/g, '');

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

const report = (label: string, value: unknown) =>
	console.log(`[lane-c weekly-limit] MEASURE ${label} ${JSON.stringify(value)}`);

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

/* ------------------------------------------------------------------ the clock this file serves

`localDay(0)` is the day the run runs on, at local noon so a rendered "Today" cannot straddle a boundary. */

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
const startOfLocalDay = (day: Date) => {
	const start = new Date(day);
	start.setHours(0, 0, 0, 0);
	return start;
};
const endOfLocalDay = (day: Date) => {
	const end = new Date(day);
	end.setHours(23, 59, 59, 999);
	return end;
};
/** The period `periodOfPreset('thisMonth', …)` builds (`dashboard-period.ts:82-108`), in local time. */
const monthPeriod = () => {
	const now = new Date();
	return {
		from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
		to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
	};
};
const dayPeriod = (offset: number) => ({
	from: startOfLocalDay(localDay(offset)),
	to: endOfLocalDay(localDay(offset))
});
/** `requestPeriodOf` (`weekly-limit.ts:89-100`) with date-fns `startOfWeek`/`endOfWeek`: the period snapped to the week start. */
const snappedWeekPeriod = (period: { from: Date; to: Date }, weekStart: number) => {
	const backToWeekStart = (from: Date) => (from.getDay() - weekStart + 7) % 7;
	const from = shiftDays(startOfLocalDay(period.from), -backToWeekStart(period.from));
	const to = shiftDays(endOfLocalDay(period.to), 6 - backToWeekStart(period.to));
	return { from, to };
};
/** The offset of the current week's first day, for a workspace with this week start. */
const weekStartOffset = (weekStart: number) => -((new Date().getDay() - weekStart + 7) % 7);

const formatWith = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(WORKSPACE_LOCALE, options);
/** `formatPeriod` (`dashboard-period.ts:147-158`) with `yearFormatOptions(false)` — the year only shows off-year. */
const periodTextOf = (from: Date, to: Date) =>
	flat(formatWith({ month: 'short', day: 'numeric' }).formatRange(from, to));
const shortDayOf = (day: Date) => formatWith({ month: 'short', day: 'numeric' }).format(day);
/** `periodLabelOf` day branch (`weekly-limit.ts:634-641`, `dayFormatterOf` `:619-632`). */
const dayLabelOf = (day: Date) => formatWith({ weekday: 'short', month: 'short', day: 'numeric' }).format(day);
/** `periodLabelOf` week branch: `<start> – <end>`, the month named again when the week crosses one. */
const weekLabelOf = (start: Date) => periodTextOf(start, shiftDays(start, 6));
/** A day column's text, exactly as `ColumnHeader` concatenates its spans (`limit-heatmap.tsx:419-442`, `dayHeadingOf` `:121-128`). */
const dayColumnTextOf = (day: Date) => {
	const isCurrent = localDayKeyOf(day) === localDayKeyOf(new Date());
	return `${formatWith({ weekday: 'short' }).format(day)}${formatWith({ day: 'numeric' }).format(day)}${dayLabelOf(day)}${isCurrent ? C.TODAY : ''}`;
};
/** The same for a week column (`weekHeadingOf` `:130-137`, `common.THIS_WEEK` as the current mark). */
const weekColumnTextOf = (start: Date) => {
	const end = shiftDays(start, 6);
	const isCurrent =
		localDayKeyOf(start) <= localDayKeyOf(new Date()) && localDayKeyOf(new Date()) <= localDayKeyOf(end);
	const monthDay = (day: Date) => formatWith({ month: 'short', day: 'numeric' }).format(day);
	return `${monthDay(start)}${monthDay(end)}${weekLabelOf(start)}${isCurrent ? C.THIS_WEEK : ''}`;
};
/** `formatDurationShort` (`dashboard-figures.ts:18-21`). */
const trackedOf = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
/** `formatHoursLabel` (`dashboard-figures.ts:25-31`): whole hours read `8h`. */
const hoursOf = (seconds: number) => (seconds % 3600 === 0 ? `${seconds / 3600}h` : trackedOf(seconds));
/** `clockHoursOf` (`weekly-limit.ts:596-601`): the figure printed inside a heat cell. */
const clockOf = (seconds: number) =>
	`${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}`;
/** `initialsOf` (`limit-cells.tsx:134-147`): the first initial plus the last word's, upper case. */
const initialsOf = (name: string) => {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? '';
	const last = words.length < 2 ? '' : (words[words.length - 1][0] ?? '');
	return `${first}${last}`.toUpperCase();
};
/** `MembersWithoutTimeLine` joins the names with the reader's locale (`limit-heatmap.tsx:730-748`). */
const namesJoined = (names: ReadonlyArray<string>) =>
	new Intl.ListFormat(WORKSPACE_LOCALE, { type: 'conjunction' }).format(names);

/* ------------------------------------------------------------------ the served report */

type ServedEntry = {
	employeeId: string;
	name: string;
	/** `duration`, in seconds. */
	seconds: number;
	/** `limit`, in seconds; `0` is what the API answers when the member has none of their own. */
	limit: number;
};
type ServedDay = { offset: number; entries: ServedEntry[] };
type ServedCall = { method: string; search: string; params: Record<string, string> };

const servedDaysOf = (days: ServedDay[]) =>
	days.map((day) => ({
		date: localDayKeyOf(localDay(day.offset)),
		employees: day.entries.map((entry) => ({
			employee: { id: entry.employeeId, fullName: entry.name },
			duration: entry.seconds,
			durationPercentage: entry.limit > 0 ? (entry.seconds * 100) / entry.limit : 0,
			limit: entry.limit
		}))
	}));

/**
 * The time-limit report, served on the mock origin. `honourIds` makes the answer hold only the members the query asked
 * for — what a real backend does, and what lets a filter visibly change the page.
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
					employees: day.employees.filter((item) => asked.includes(item.employee.id))
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

/** Records what the browser really sent for the report, and from which origin. Nothing is answered here. */
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

/**
 * `GET /api/organization/<id>`, answered with the mock's own fixture organization (`mock-gauzy-server.mjs:86-96`) plus
 * the fields that fixture does not carry — `startWeekOn` (`user-organizations.ts:39-42`) and `standardWorkHoursPerDay`
 * (`use-weekly-limit-report.ts:217`).
 */
async function serveOrganization(page: Page, organizationId: string, extra: Record<string, unknown>) {
	const path = `/api/organization/${organizationId}`;
	const seen: string[] = [];
	await page.route(
		(url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname === path,
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') {
				return route.fulfill({ status: 204, headers: CORS_HEADERS });
			}
			seen.push(`${request.method()} ${request.url()}`);
			const body = {
				id: organizationId,
				name: 'Fixture Organization A',
				isDefault: true,
				profile_link: 'fixture-organization-a',
				totalEmployees: 3,
				banner: null,
				currency: 'USD',
				timeZone: 'UTC',
				allowManualTime: true,
				allowModifyTime: true,
				allowDeleteTime: true,
				tenantId: new URL(request.url()).searchParams.get('tenantId') ?? undefined,
				...extra
			};
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
		}
	);
	return seen;
}

/* ------------------------------------------------------------------ the page under the locators */

const pageHeading = (page: Page) => page.locator('h1');
const pageMeta = (page: Page) => page.locator('h1 + span');
const breadcrumbNav = (page: Page) => page.locator('nav[aria-label="breadcrumb"]');
const exportButton = (page: Page) => page.getByRole('button', { name: C.EXPORT, exact: true });
const heatmapSection = (page: Page, title: string) => page.getByRole('region', { name: title, exact: true });
const attentionSection = (page: Page) => page.getByRole('region', { name: L.ATTENTION_TITLE, exact: true });
const durationTab = (page: Page, label: string) => page.getByRole('tab', { name: label, exact: true });
/** Exact, because `common.FILTER` is a substring of `common.CLEAR_FILTERS`; the trigger's count chip only appears while a filter is active. */
const filterButton = (page: Page) => page.getByRole('button', { name: C.FILTER, exact: true });
/** Not exact: `FilterOptionRow` puts the member's avatar initials before the name (`property-filter-menu.tsx:218-219`, the initials from `weekly-limit-toolbar.tsx:40` → `limit-cells.tsx:163-174`). */
const memberOption = (page: Page, name: string) => page.getByRole('menuitemcheckbox', { name });
const periodGroup = (page: Page) => page.getByRole('group', { name: PERIOD.LABEL, exact: true });
const popover = (page: Page) => page.locator('[data-slot=popover-content]');
/** The preset column is the popover's first child div (`period-picker.tsx:134-150`); the calendar beside it has its own `Today`. */
const presetColumn = (page: Page) => popover(page).locator('div').first();
const errorNotice = (page: Page) => page.locator('output').filter({ hasText: STATES.ERROR_TITLE });
/**
 * Only the member rows of a heatmap. The grid's own header row is a `row` too (`limit-heatmap.tsx:509`, the
 * `row > columnheader "Member"` line in the page snapshot of `s3-lane-c-weeklylimit-1.log` failure 1) so counting
 * `getByRole('row')` counts one row more than there are members; a header row holds `columnheader`s and never the
 * `rowheader` `HeatRow` opens with (`MemberRowHeader` `:568`, `HeatRow` `:632`). Both locators hang off the page:
 * `filter({ has })` re-roots the inner chain through the outer one, so a section-scoped `has` looks for a section
 * inside every row and matches nothing (`s3-lane-c-weeklylimit-fix-1.log` failure 1, `Received: 0`).
 */
const memberRows = (page: Page) => page.getByRole('row').filter({ has: page.getByRole('rowheader') });
/** A heat row, by the initials-and-name the row header prints (no other row carries that text). */
const memberRow = (page: Page, name: string) =>
	memberRows(page)
		.filter({ hasText: `${initialsOf(name)}${name}` })
		.first();

const textOf = async (locator: Locator) => flat(await locator.evaluate((node) => node.textContent ?? ''));
/** `innerText`, which puts a space where `textContent` puts none — how the probes read the `<output>` notices. */
const innerOf = async (locator: Locator) => flat(await locator.innerText());
const allTextsOf = async (locator: Locator) =>
	locator.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
/** Every heat cell's accessible name in a row — `HeatRow` sets it from `cellReadingOf` (`limit-heatmap.tsx:646`, `:653`). */
const cellLabelsOf = async (row: Locator) =>
	row
		.locator('[data-heat-cell]')
		.evaluateAll((nodes) =>
			nodes.map((node) => (node.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim())
		);
/** Only the cells that hold time, across the whole grid, in row order. The two endings are passed in: a browser callback cannot see `L`. */
const cellsWithTimeOf = async (page: Page) =>
	page
		.locator('[data-heat-cell]')
		.evaluateAll(
			(nodes, endings) =>
				nodes
					.map((node) => (node.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim())
					.filter((label) => label !== '' && !endings.some((ending) => label.endsWith(ending))),
			[L.CELL_NO_TIME, L.CELL_UPCOMING] as string[]
		);
/**
 * A filled attention line, not one of the three skeleton lines the same region shows while it loads
 * (`LimitAttentionSkeleton` `limit-attention.tsx:205-224` over `SKELETON_LINES` `:203`): a skeleton line holds only
 * pulsing spans and reads as an empty string, a filled line a button (`AttentionLine`, used at `:166-171`).
 */
const attentionLines = (page: Page) =>
	attentionSection(page)
		.locator('li')
		.filter({ has: page.getByRole('button') });
const attentionLinesOf = async (page: Page) => allTextsOf(attentionLines(page));
const sectionParagraphsOf = async (page: Page) => allTextsOf(heatmapSection(page, L.HEATMAP_TITLE_DAYS).locator('p'));
const noticesOf = async (page: Page) =>
	page
		.locator('output')
		.allInnerTexts()
		// the shell's own time-zone notice sits in an `output` too (see finding 3 of the header, `probe-1.log` P1-notices)
		.then((all) => all.map(flat).filter((line) => !line.includes('profile uses UTC')));

const memberIdsOf = (fixture: { ids: Record<string, string> }) =>
	[fixture.ids.employee, fixture.ids.teammateEmployee, fixture.ids.deniedEmployee].sort((first, second) =>
		first.localeCompare(second)
	);
const employeeIdsOf = (call: ServedCall) =>
	Object.entries(call.params)
		.filter(([key]) => key.startsWith('employeeIds['))
		.map(([, value]) => value);
/** The day columns of a period, in the order `limitColumnsOf` builds them (`weekly-limit.ts:749-771`). */
const dayColumnsOf = (period: { from: Date; to: Date }) => {
	const columns: string[] = [];
	for (let day = startOfLocalDay(period.from); day <= period.to; day = shiftDays(day, 1)) {
		columns.push(dayColumnTextOf(day));
	}
	return columns;
};
/** The header row of a heatmap: `common.MEMBER`, one column per period, `COLUMN_USED` (`limit-heatmap.tsx:496-530`). */
const headerTextsOf = (columns: string[]) => [C.MEMBER, ...columns, L.COLUMN_USED];

/* ------------------------------------------------------------------ the console, excused only by name */

/** React's dev-mode store warning, not this page's (`suites/lane-a/api-tokens-settings-ui.spec.ts:405-430`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The client's own line for a refused read this file armed: it names the path *without* `/api` and puts the query
 * between the path and the status (`probe-3.log` R6-console), hence the optional `?<query>` before the armed status.
 * Only the status armed here is excused; nothing else on that path is.
 */
const armedFailurePattern = (status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${REPORT_LOGGED_PATH}(\?\S*)? ${status} `);
/** The service's own line for an answer that does not parse (`time-log.service.ts:128-131`, `probe-3.log` R7-console). */
const VALIDATION_FAILURE = 'Time limits report validation failed';
/** A test that arms nothing excuses only React's own dev-mode warning. */
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
const validationLines = (shield: Shield) => shield.consoleErrors().filter((line) => line.includes(VALIDATION_FAILURE));

test.describe('lane-c · Reports › Weekly limit: what a manager sees and what the browser asks for', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------------------------------------- 1. the lane exactly as it is: the mock answers []

	test('1 · the mock answers the report with a plain empty list: the page, its grid columns and its empty state', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const reads = recordReportReads(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(pageHeading(page), 'the page rendered no title').toBeVisible({ timeout: 30_000 });
		await expect(pageHeading(page), 'the title is rendered twice').toHaveCount(1);
		// `titleOf` (`weekly-limit-page.tsx:30-35`) with the duration the hook starts on (`use-weekly-limit-report.ts:163`)
		expect(await textOf(pageHeading(page)), 'the title is not common.DAILY_LIMIT').toBe(C.DAILY_LIMIT);

		const period = monthPeriod();
		const meta = `${periodTextOf(period.from, period.to)} · ${copy(L.MEMBERS_COUNT, { count: 3 })}`;
		// polled: the member count only arrives with the team read (`weekly-limit-page.tsx:79-81`, `isMetaLoading` `:101-102`)
		await expect.poll(() => textOf(pageMeta(page)), { timeout: 20_000 }).toEqual(meta);

		await expect(
			breadcrumbNav(page).getByRole('link', { name: C.REPORTS, exact: true }),
			'the Reports crumb is not a link to /'
		).toHaveAttribute('href', '/');
		await expect(breadcrumbNav(page), 'the page crumb is missing').toContainText(C.DAILY_LIMIT);
		expect(
			await breadcrumbNav(page)
				.locator('a')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
			'the breadcrumb is not the two links the page builds (`weekly-limit-page.tsx:88-91`)'
		).toEqual(['/', PAGE_PATH]);

		await expect(durationTab(page, L.DURATION_DAY), 'Daily is not the selected duration').toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(durationTab(page, L.DURATION_WEEK), 'Weekly is not offered').toHaveAttribute(
			'aria-selected',
			'false'
		);
		await expect(exportButton(page), 'Export is offered although the page has no entry').toBeDisabled();

		// the heatmap section and its grid (`limit-heatmap.tsx:988-991`)
		const section = heatmapSection(page, L.HEATMAP_TITLE_DAYS);
		await expect(section, 'the heatmap section is missing').toBeVisible();
		await expect(section.getByRole('grid'), 'the heatmap renders no grid').toHaveCount(1);
		await expect(section.getByRole('grid'), 'the grid is not marked idle').toHaveAttribute('aria-busy', 'false');
		await expect(attentionSection(page), 'a Needs attention section appeared with no data').toHaveCount(0);

		// one column per day of the period, the current one marked `common.TODAY` (`probe-1.log` P1-dump.columnHeaders)
		const columns = headerTextsOf(dayColumnsOf(period));
		await expect(page.getByRole('columnheader'), 'the header row is not one column per day').toHaveCount(
			columns.length
		);
		expect(
			await allTextsOf(page.getByRole('columnheader')),
			'the header row is not Member · the days · Tracked / limit'
		).toEqual(columns);

		// no rows at all, and `WeeklyLimitEmpty` in their place (`limit-heatmap.tsx:1017`, `weekly-limit-table.tsx:467-500`)
		await expect(memberRows(page), 'a member row appeared with no data').toHaveCount(0);
		await expect(page.locator('[data-heat-cell]'), 'a heat cell appeared with no data').toHaveCount(0);
		await expect(
			section.getByText(copy(L.EMPTY_RANGE, { from: shortDayOf(period.from), to: shortDayOf(period.to) }), {
				exact: true
			}),
			'the empty state does not name the period it looked in'
		).toBeVisible();
		await expect(
			section.getByText(L.EMPTY_MESSAGE, { exact: true }),
			'the empty state has no message'
		).toBeVisible();
		await expect(
			section.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }),
			'the empty state offers no other period'
		).toBeVisible();

		// the mock answered its own handler (`mock-gauzy-server.mjs:796`), on the mock origin
		await expect.poll(() => reads.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		expect(
			reads.map((call) => `${call.method} ${call.origin}${call.path}`),
			'the report was not read from the mock origin'
		).toEqual([`GET ${MOCK_API_ORIGIN}${REPORT_PATH}`]);
		expect(
			(await mock.calls(REPORT_PATH)).map((item) => [item.method, item.path, item.status]),
			'the mock did not answer its own time-limit handler'
		).toEqual([['GET', REPORT_PATH, 200]]);

		report('lane-as-it-is', {
			lang: await page.evaluate(() => document.documentElement.lang),
			browserZone: await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
			heading: await textOf(pageHeading(page)),
			meta: await textOf(pageMeta(page)),
			breadcrumb: await textOf(breadcrumbNav(page)),
			columns,
			emptyParagraphs: await allTextsOf(section.locator('p')),
			exportDisabled: await exportButton(page).isDisabled(),
			notices: await noticesOf(page),
			read: reads.map((call) => `${call.method} ${call.origin}${call.path}${call.search}`)
		});
		expect(consoleFindings(shield), 'the empty page logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the empty page threw a page error').toEqual([]);
	});

	// ------------------------------------------- 2. exactly what the browser asks for its period

	test('2 · the read the page makes for its own period: the fixture ids sorted, the local day boundaries, the browser zone', async ({
		page,
		fixture
	}) => {
		const calls = await serveReport(page, { days: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);

		const browserZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
		const period = monthPeriod();
		const employees = memberIdsOf(fixture);
		// `use-weekly-limit-report.ts:185-198` plus `time-log.service.ts:105-117`
		const expected: Record<string, string> = {
			'employeeIds[0]': employees[0],
			'employeeIds[1]': employees[1],
			'employeeIds[2]': employees[2],
			startDate: period.from.toISOString(),
			endDate: period.to.toISOString(),
			duration: 'day',
			timeZone: browserZone,
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA
		};
		report('query-of-this-month', {
			search: calls[0].search,
			params: calls[0].params,
			browserZone,
			profileZone: 'UTC (`mock-gauzy-server.mjs:106`)',
			periodFrom: period.from.toISOString(),
			periodTo: period.to.toISOString()
		});

		expect(calls[0].params, 'the time-limit query is not the one the service builds').toEqual(expected);
		expect(employeeIdsOf(calls[0]), 'the read did not name every team member, sorted (`:188`)').toEqual(employees);
		expect(
			calls[0].params.timeZone,
			'the report was not asked in the zone the browser is in, whatever the profile says'
		).toBe(browserZone);
		// the bounds are the *browser zone's* day boundaries (`format-date-range.ts:97`, `:105`), not a UTC day
		expect(calls[0].params.startDate, 'the period did not start at the local start of its first day').toBe(
			period.from.toISOString()
		);
		expect(calls[0].params.endDate, 'the period did not end at the local end of its last day').toBe(
			period.to.toISOString()
		);
	});

	// ------------------------------------------- 3. the rows, each exactly as printed

	test('3 · three members who all tracked time: the rows in name order, each row total, the fallback limit, and no footer line', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		const managerName = fixture.names.user;
		const teammateName = fixture.names.teammate;
		const restrictedName = fixture.names.denied;
		await serveReport(page, {
			days: [
				{
					offset: -2,
					entries: [
						{ employeeId: manager, name: managerName, seconds: 9 * HOUR, limit: STANDARD_DAY_LIMIT },
						{ employeeId: teammate, name: teammateName, seconds: 7.5 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				},
				{
					offset: -1,
					entries: [
						{ employeeId: manager, name: managerName, seconds: 2 * HOUR, limit: STANDARD_DAY_LIMIT },
						{ employeeId: restricted, name: restrictedName, seconds: 4 * HOUR, limit: 0 }
					]
				},
				{
					offset: 0,
					entries: [
						{ employeeId: teammate, name: teammateName, seconds: 1 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		const section = heatmapSection(page, L.HEATMAP_TITLE_DAYS);
		await expect(memberRows(page), 'the rows did not arrive').toHaveCount(3);
		// and they are this section's own: `rowheader` is printed only by `MemberRowHeader` (`limit-heatmap.tsx:568`)
		await expect(section.getByRole('rowheader'), 'the member rows are not inside the heatmap section').toHaveCount(
			3
		);

		// rows in member-name order (`groupsByMemberOf` `:449-471`), each header the initials, the name and the compact total
		expect(
			await allTextsOf(page.getByRole('rowheader')),
			'the rows are not the three members, by name, each with its own total (`probe-2.log` Q1-dom)'
		).toEqual([
			`${initialsOf(managerName)}${managerName}${trackedOf(11 * HOUR)} / ${hoursOf(2 * STANDARD_DAY_LIMIT)} · ${L.VERDICT_WITHIN}`,
			`${initialsOf(restrictedName)}${restrictedName}${trackedOf(4 * HOUR)} / ${hoursOf(STANDARD_DAY_LIMIT)} · ${L.VERDICT_WITHIN}${L.STANDARD_LIMIT}`,
			`${initialsOf(teammateName)}${teammateName}${trackedOf(8.5 * HOUR)} / ${hoursOf(2 * STANDARD_DAY_LIMIT)} · ${L.VERDICT_WITHIN}`
		]);

		// the row total cell: `UsedValue` then `VerdictText` (`limit-heatmap.tsx:597-607`, `limit-cells.tsx:43-67`)
		const rowTotalTexts = await allTextsOf(page.getByRole('gridcell').filter({ hasText: /\/ / }));
		expect(rowTotalTexts, 'the row totals are not what the rows add up to').toEqual([
			`${trackedOf(11 * HOUR)} / ${hoursOf(2 * STANDARD_DAY_LIMIT)}${L.VERDICT_WITHIN}`,
			`${trackedOf(4 * HOUR)} / ${hoursOf(STANDARD_DAY_LIMIT)}${L.VERDICT_WITHIN}`,
			`${trackedOf(8.5 * HOUR)} / ${hoursOf(2 * STANDARD_DAY_LIMIT)}${L.VERDICT_WITHIN}`
		]);
		report('rows', {
			rowheaders: await allTextsOf(page.getByRole('rowheader')),
			rowTotals: rowTotalTexts,
			footerParagraphs: await allTextsOf(section.locator('p'))
		});

		/* Every one of the three is in the answer, so `membersWithoutTimeOf` (`:933-956`) has nobody to name and the
		   section prints no footer line at all — measured `s3-lane-c-weeklylimit-fix-2.log` MEASURE rows.footerParagraphs.
		   A member the answer never names is test 5's case, where the line really appears. */
		expect(
			await allTextsOf(section.locator('p')),
			'a member who reported time is called out as tracking none'
		).toEqual([]);
		expect(consoleFindings(shield), 'the page with rows logged a console error').toEqual([]);
	});

	// ------------------------------------------- 4. the heat cells, by their accessible names

	test('4 · the heat cells name themselves: the day, the time against the limit, the share, the verdict, and the empty and upcoming columns', async ({
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
						{ employeeId: manager, name: fixture.names.user, seconds: 9 * HOUR, limit: STANDARD_DAY_LIMIT },
						{
							employeeId: teammate,
							name: fixture.names.teammate,
							seconds: 7.5 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				},
				{
					offset: -1,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 2 * HOUR, limit: STANDARD_DAY_LIMIT },
						{ employeeId: restricted, name: fixture.names.denied, seconds: 4 * HOUR, limit: 0 }
					]
				},
				{
					offset: 0,
					entries: [
						{
							employeeId: teammate,
							name: fixture.names.teammate,
							seconds: 1 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(memberRows(page), 'the rows did not arrive').toHaveCount(3);

		const period = monthPeriod();
		const periodDays: Date[] = [];
		for (let day = startOfLocalDay(period.from); day <= period.to; day = shiftDays(day, 1)) {
			periodDays.push(day);
		}
		const upcomingColumns = periodDays.filter((day) => localDayKeyOf(day) > localDayKeyOf(localDay(0))).length;
		const overDay = dayLabelOf(localDay(-2));
		const halfDay = dayLabelOf(localDay(-1));
		const today = dayLabelOf(localDay(0));

		// every cell of the teammate's row, in column order (`probe-2.log` Q1-dom.gridcells)
		expect(
			await cellLabelsOf(memberRow(page, fixture.names.teammate)),
			'the cells of a row are not the sentences `cellReadingOf` builds (`limit-heatmap.tsx:212-226`)'
		).toEqual(
			periodDays.map((day) => {
				const key = localDayKeyOf(day);
				if (key === localDayKeyOf(localDay(-2))) {
					return `${overDay} · ${trackedOf(7.5 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 94% · ${L.VERDICT_NEAR}`;
				}
				if (key === localDayKeyOf(localDay(0))) {
					return `${today} · ${trackedOf(1 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 13%`;
				}
				if (localDayKeyOf(day) > localDayKeyOf(localDay(0))) {
					return `${dayLabelOf(day)} · ${L.CELL_UPCOMING}`;
				}
				return `${dayLabelOf(day)} · ${L.CELL_NO_TIME}`;
			})
		);

		// the whole grid's time-holding cells (`probe-2.log` Q1-dom.gridcells)
		expect(await cellsWithTimeOf(page), 'the cells that hold time do not read as measured').toEqual([
			`${overDay} · ${trackedOf(9 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 113% · ${copy(L.REMAINING_OVER, { duration: trackedOf(HOUR) })}`,
			`${halfDay} · ${trackedOf(2 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 25%`,
			`${halfDay} · ${trackedOf(4 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 50%`,
			`${overDay} · ${trackedOf(7.5 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 94% · ${L.VERDICT_NEAR}`,
			`${today} · ${trackedOf(1 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 13%`
		]);

		// the figure inside a cell is the clock form, and the cell is a `gridcell` (`cellFigureOf` `:228-233`)
		expect(
			await memberRow(page, fixture.names.user)
				.locator('[data-heat-cell]')
				.evaluateAll((nodes) =>
					nodes
						.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
						.filter((text) => text !== '')
				),
			'the figure printed in a cell is not the clock form'
		).toEqual([clockOf(9 * HOUR), clockOf(2 * HOUR)]);

		// the current day is the only column marked `common.TODAY`
		expect(
			await allTextsOf(page.getByRole('columnheader')),
			'the current day is not marked, or a past day is marked as upcoming'
		).toEqual(headerTextsOf(dayColumnsOf(period)));
		expect(
			await page
				.locator('[data-heat-cell]')
				.evaluateAll(
					(nodes, upcoming) =>
						nodes
							.map((node) => (node.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim())
							.filter((label) => label.endsWith(upcoming)).length,
					L.CELL_UPCOMING
				),
			'the columns after today are not marked Upcoming'
		).toBe(upcomingColumns * 3);
		report('cells', {
			overDay,
			halfDay,
			today,
			upcomingCells: await page
				.locator('[data-heat-cell]')
				.evaluateAll(
					(nodes, upcoming) =>
						nodes.filter((node) => (node.getAttribute('aria-label') ?? '').includes(upcoming)).length,
					L.CELL_UPCOMING
				),
			legendItems: await allTextsOf(heatmapSection(page, L.HEATMAP_TITLE_DAYS).locator('li'))
		});
		expect(
			await allTextsOf(heatmapSection(page, L.HEATMAP_TITLE_DAYS).locator('li')),
			'the legend does not name the four bands (`limitHeatStepOf` `:655-679`)'
		).toEqual([L.LEGEND_STEP_LOW, L.LEGEND_STEP_MEDIUM, L.LEGEND_STEP_HIGH, L.LEGEND_STEP_FULL]);
		expect(consoleFindings(shield), 'the cell test logged a console error').toEqual([]);
	});

	// ------------------------------------------- 5. at, over and half: the share label and the verdict

	test('5 · a day exactly at the limit reads 100% and Near limit, one 4 h over reads Over, a half reads no verdict, and the member missing from the answer is named as tracking no time', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		await serveReport(page, {
			days: [
				{
					offset: -2,
					entries: [
						{
							employeeId: manager,
							name: fixture.names.user,
							seconds: STANDARD_DAY_LIMIT,
							limit: STANDARD_DAY_LIMIT
						},
						{
							employeeId: teammate,
							name: fixture.names.teammate,
							seconds: 4 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				},
				{
					offset: -1,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 12 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(memberRows(page), 'the rows did not arrive').toHaveCount(2);

		const atLimitDay = dayLabelOf(localDay(-2));
		const overDay = dayLabelOf(localDay(-1));
		// `probe-9.log` V1-dom.cellLabels, rebuilt on this run's days
		expect(await cellsWithTimeOf(page), 'the verdict words and the percent do not print as measured').toEqual([
			`${atLimitDay} · ${trackedOf(STANDARD_DAY_LIMIT)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 100% · ${L.VERDICT_NEAR}`,
			`${overDay} · ${trackedOf(12 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 150% · ${copy(L.REMAINING_OVER, { duration: trackedOf(4 * HOUR) })}`,
			`${atLimitDay} · ${trackedOf(4 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 50%`
		]);

		// the row verdict is the summed verdict, and it is printed in the row total (`limitTotalsOf` `:358-383`)
		expect(
			await allTextsOf(page.getByRole('gridcell').filter({ hasText: /\/ / })),
			'the row totals do not carry their own verdict'
		).toEqual([
			`${trackedOf(20 * HOUR)} / ${hoursOf(2 * STANDARD_DAY_LIMIT)}${L.VERDICT_OVER}`,
			`${trackedOf(4 * HOUR)} / ${hoursOf(STANDARD_DAY_LIMIT)}${L.VERDICT_WITHIN}`
		]);
		/* The third team member is in no answer row: no row of dashes, one footer line instead
		   (`membersWithoutTimeOf` `:933-956`, `MembersWithoutTimeLine` `limit-heatmap.tsx:730-748`, measured
		   `probe-12.log` X2-dom.paragraphsInSection and `probe-9.log` V1-dom.paragraphs). */
		await expect(
			heatmapSection(page, L.HEATMAP_TITLE_DAYS).getByText(
				copy(L.MEMBERS_WITHOUT_TIME_NAMES, { count: 1, names: namesJoined([fixture.names.denied]) }),
				{ exact: true }
			),
			'the member the answer never named is not called out as tracking no time'
		).toBeVisible();
		report('verdicts', {
			cells: await cellsWithTimeOf(page),
			rowTotals: await allTextsOf(page.getByRole('gridcell').filter({ hasText: /\/ / })),
			attention: await attentionLinesOf(page),
			paragraphs: await allTextsOf(heatmapSection(page, L.HEATMAP_TITLE_DAYS).locator('p'))
		});
		expect(consoleFindings(shield), 'the verdict test logged a console error').toEqual([]);
	});

	// ------------------------------------------- 6. a share that would round onto 100 % prints one decimal

	test('6 · a day over by ten seconds prints 100.1% and 0h 0m over, and 90% is already Near limit', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		await serveReport(page, {
			days: [
				{
					offset: -1,
					entries: [
						{
							employeeId: manager,
							name: fixture.names.user,
							seconds: STANDARD_DAY_LIMIT + 10,
							limit: STANDARD_DAY_LIMIT
						},
						{
							employeeId: teammate,
							name: fixture.names.teammate,
							seconds: 7.2 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(memberRows(page), 'the rows did not arrive').toHaveCount(2);

		const day = dayLabelOf(localDay(-1));
		// `probe-3.log` R4-shareCell, verbatim apart from the day
		expect(
			await cellsWithTimeOf(page),
			'the share label does not keep the tenth that keeps the verdict honest (`limitShareLabelOf` `:562-575`)'
		).toEqual([
			`${day} · ${trackedOf(STANDARD_DAY_LIMIT + 10)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 100.1% · ${copy(L.REMAINING_OVER, { duration: trackedOf(10) })}`,
			`${day} · ${trackedOf(7.2 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 90% · ${L.VERDICT_NEAR}`
		]);
		report('share-labels', { day, cells: await cellsWithTimeOf(page) });
		expect(consoleFindings(shield), 'the share-label test logged a console error').toEqual([]);
	});

	// ------------------------------------------- 7. the period's own length decides the row verdict

	test('7 · the same over-limit day: the row total stays Within limit across a month and reads Over limit on a one-day period', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		/* Two days of the month the page opens on — its 10th and its 14th — so both are inside `monthPeriod()` and inside
		   the month the calendar opens on (`period-picker.tsx:156`, `defaultMonth={value.from}`) whatever today is.
		   Measured `probe-11.log` W1-month (month view) and W1-afterSecond (the one-day view). */
		const now = new Date();
		const overOffset = 10 - now.getDate();
		const smallOffset = 14 - now.getDate();
		const overDay = localDay(overOffset);
		const smallDay = localDay(smallOffset);
		await serveReport(page, {
			days: [
				{
					offset: overOffset,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 9 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				},
				{
					offset: smallOffset,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 2 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(memberRows(page), 'the rows did not arrive').toHaveCount(1);

		const monthRow = memberRow(page, fixture.names.user);
		// the month: 11 h against the two days that carry time, 2 × 8 h = 68.75 %, although one of its cells is 113 % over (finding 3)
		expect(await allTextsOf(page.getByRole('rowheader')), 'the month row is not the summed verdict').toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}${trackedOf(11 * HOUR)} / ${hoursOf(2 * STANDARD_DAY_LIMIT)} · ${L.VERDICT_WITHIN}`
		]);
		expect(
			(await cellLabelsOf(monthRow)).filter((label) => label.includes('113%')),
			'the day cell inside the within-limit row does not name its own overrun'
		).toEqual([
			`${dayLabelOf(overDay)} · ${trackedOf(9 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 113% · ${copy(L.REMAINING_OVER, { duration: trackedOf(HOUR) })}`
		]);
		expect(
			(await cellLabelsOf(monthRow)).filter((label) => label.includes('25%')),
			'the other day of the same row is not the plain share it reads (`limitShareLabelOf` `weekly-limit.ts:562-575`)'
		).toEqual([`${dayLabelOf(smallDay)} · ${trackedOf(2 * HOUR)} of ${hoursOf(STANDARD_DAY_LIMIT)} · 25%`]);

		/* The same answer, looked at exactly one day: the calendar day clicked twice, which the picker resolves to that
		   day's own `startOfDay` → `endOfDay` (`completedPeriodOf` `period-picker.tsx:40-47`), measured as
		   `2026-11-09T23:00:00.000Z → 2026-11-10T22:59:59.999Z` (`probe-11.log` W1-afterSecond.queries). */
		await periodGroup(page).getByRole('button', { name: C.THIS_MONTH, exact: true }).click();
		const calendarDay = popover(page).getByRole('gridcell', { name: '10', exact: true });
		await expect(calendarDay, 'the calendar that opened does not offer its 10th once').toHaveCount(1);
		await calendarDay.click();
		await popover(page).getByRole('gridcell', { name: '10', exact: true }).click();
		await expect
			.poll(() => allTextsOf(page.getByRole('rowheader')), { timeout: 20_000 })
			.toEqual([
				`${initialsOf(fixture.names.user)}${fixture.names.user}${trackedOf(9 * HOUR)} / ${hoursOf(STANDARD_DAY_LIMIT)} · ${L.VERDICT_OVER}`
			]);
		/* The picker closes by itself once the second end is picked, but not the instant the row changes: the popover node
		   is still there right after (`probe-12.log` X1-afterSecondRightAway `popovers: 1`) and gone a moment later
		   (`X1-afterSecondSettled` `popovers: 0`), and while it is open its calendar adds seven own `columnheader`s to a
		   page-wide count (`s3-lane-c-weeklylimit-fix-2.log` failure 2). So: close first, then read the grid's own header. */
		await expect(popover(page), 'the period popover stayed open after the second day was picked').toHaveCount(0);
		const oneDaySection = heatmapSection(page, L.HEATMAP_TITLE_DAYS);
		expect(
			await allTextsOf(oneDaySection.getByRole('columnheader')),
			'the one-day period does not render exactly its own column'
		).toEqual(headerTextsOf([dayColumnTextOf(overDay)]));
		// the two members the one-day answer does not name are named as tracking nothing on it (`:933-956`, `probe-12.log` X1-afterSecondSettled.paragraphsInSection)
		expect(
			await allTextsOf(oneDaySection.locator('p')),
			'the one-day period does not name the members that tracked no time on it'
		).toEqual([
			copy(L.MEMBERS_WITHOUT_TIME_NAMES, {
				count: 2,
				names: namesJoined([fixture.names.denied, fixture.names.teammate])
			})
		]);
		report('row-verdict-by-period', {
			monthRow: `${trackedOf(11 * HOUR)} / ${hoursOf(2 * STANDARD_DAY_LIMIT)}`,
			dayRow: await textOf(page.getByRole('rowheader')),
			dayCell: (await cellLabelsOf(memberRow(page, fixture.names.user))).filter((label) => label.includes('of')),
			columns: await allTextsOf(oneDaySection.getByRole('columnheader')),
			paragraphs: await allTextsOf(oneDaySection.locator('p')),
			meta: await textOf(pageMeta(page))
		});
		expect(consoleFindings(shield), 'the row-verdict test logged a console error').toEqual([]);
	});

	// ------------------------------------------- 8. the attention list: who, in what order, saying what

	test('8 · the attention list puts the member who is over first, says both halves, and goes quiet when nobody is', async ({
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
					offset: -3,
					entries: [
						{
							employeeId: manager,
							name: fixture.names.user,
							seconds: 10 * HOUR,
							limit: STANDARD_DAY_LIMIT
						},
						{
							employeeId: teammate,
							name: fixture.names.teammate,
							seconds: 7.5 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				},
				{
					offset: -2,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 9 * HOUR, limit: STANDARD_DAY_LIMIT },
						{
							employeeId: restricted,
							name: fixture.names.denied,
							seconds: 7.9 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				},
				{
					offset: -1,
					entries: [
						{
							employeeId: manager,
							name: fixture.names.user,
							seconds: 7.5 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(attentionLines(page), 'the attention list did not fill').toHaveCount(3);

		// over first, then the larger overrun, then the share (`byAttention` `:899-913`); the used/limit cover the flagged days only (finding 11)
		const usedOf = (used: string, limit: string) => copy(USED_OF_TEMPLATE, { used, limit });
		expect(await attentionLinesOf(page), 'the attention lines are not the measured order and copy').toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}·${usedOf(trackedOf(19 * HOUR), hoursOf(2 * STANDARD_DAY_LIMIT))}·${copy(L.ATTENTION_OVER_DAYS, { duration: trackedOf(3 * HOUR), count: 2 })}·${copy(L.ATTENTION_NEAR_DAYS, { count: 1 })}`,
			`${initialsOf(fixture.names.denied)}${fixture.names.denied}·${usedOf(trackedOf(7.9 * HOUR), hoursOf(STANDARD_DAY_LIMIT))}·${copy(L.ATTENTION_NEAR_DAYS, { count: 1 })}`,
			`${initialsOf(fixture.names.teammate)}${fixture.names.teammate}·${usedOf(trackedOf(7.5 * HOUR), hoursOf(STANDARD_DAY_LIMIT))}·${copy(L.ATTENTION_NEAR_DAYS, { count: 1 })}`
		]);
		// the section's own `meta` is the flagged count; the title is a heading, not a span (`limit-attention.tsx:160-165`)
		expect(
			await allTextsOf(attentionSection(page).locator('header span')),
			'the attention meta does not count the flagged members'
		).toEqual([copy(L.MEMBERS_COUNT, { count: 3 })]);
		report('attention', {
			lines: await attentionLinesOf(page),
			meta: await allTextsOf(attentionSection(page).locator('header span')),
			paragraphs: await sectionParagraphsOf(page)
		});
		expect(consoleFindings(shield), 'the attention test logged a console error').toEqual([]);
	});

	test('9 · nobody over or near the limit: the attention list says so in one line', async ({
		page,
		fixture,
		shield
	}) => {
		await serveReport(page, {
			days: [
				{
					offset: -1,
					entries: [
						{
							employeeId: fixture.ids.employee,
							name: fixture.names.user,
							seconds: 3 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(memberRows(page), 'the row did not arrive').toHaveCount(1);
		// nothing flagged, so the region renders `CalmLine` (`limit-attention.tsx:127-135`) instead of a list: no `li` at all
		await expect(attentionSection(page).locator('li'), 'the calm attention list rendered a line list').toHaveCount(
			0
		);
		await expect(
			attentionSection(page).getByText(L.ATTENTION_NONE, { exact: true }),
			'the calm line is not dashboard.weeklyLimit.ATTENTION_NONE'
		).toBeVisible();
		// `meta = hasItems && meta` (`limit-attention.tsx:157-165`): with nothing flagged the section has no meta line
		expect(
			attentionSection(page).locator('header span'),
			'the calm list carries a member count it should not have'
		).toHaveCount(0);
		expect(consoleFindings(shield), 'the calm attention test logged a console error').toEqual([]);
	});

	// ------------------------------------------- 10. a member with no limit at all

	test('10 · no limit anywhere: the row reads – and No limit, the cell reads tracked, no limit', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		// the mock's organization carries no `standardWorkHoursPerDay`; without it the page would fall back to 8 h (`:217`)
		const orgSeen = await serveOrganization(page, fixture.ids.organizationA, { standardWorkHoursPerDay: 0 });
		await serveReport(page, {
			days: [
				{
					offset: -1,
					entries: [{ employeeId: manager, name: fixture.names.user, seconds: 2 * HOUR, limit: 0 }]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(memberRows(page), 'the row did not arrive').toHaveCount(1);

		expect(
			await allTextsOf(page.getByRole('rowheader')),
			'the row without a limit is not – · No limit · Organization standard'
		).toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}${trackedOf(2 * HOUR)} / ${MISSING_FIGURE} · ${L.NO_LIMIT}${L.STANDARD_LIMIT}`
		]);
		expect(
			await cellsWithTimeOf(page),
			'the cell without a limit is not CELL_TRACKED_NO_LIMIT (`figuresOf` `:161-174`)'
		).toEqual([`${dayLabelOf(localDay(-1))} · ${copy(L.CELL_TRACKED_NO_LIMIT, { used: trackedOf(2 * HOUR) })}`]);
		expect(
			await allTextsOf(page.getByRole('gridcell').filter({ hasText: /\/ / })),
			'the row total without a limit does not read No limit'
		).toEqual([`${trackedOf(2 * HOUR)} / ${MISSING_FIGURE}${L.NO_LIMIT}`]);
		// the calm line: without a limit nothing can be flagged (`attentionOf` `:864-890`, `hasLimit` in `entryOf` `:303-334`)
		await expect(
			attentionSection(page).getByText(L.ATTENTION_NONE, { exact: true }),
			'an unmeasured member was put in the attention list'
		).toBeVisible();
		report('no-limit', {
			orgSeen,
			rowheaders: await allTextsOf(page.getByRole('rowheader')),
			cells: await cellsWithTimeOf(page)
		});
		expect(consoleFindings(shield), 'the no-limit test logged a console error').toEqual([]);
	});

	// ------------------------------------------- 11. the weekly view with the workspace's own week start

	test('11 · Weekly with the mock workspace (no startWeekOn): asked as weeks, snapped to Monday, limit five days, and an answer row on a Thursday dropped', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const thisMonday = weekStartOffset(MONDAY);
		const calls = await serveReport(page, {
			days: [
				{
					offset: thisMonday - 7,
					entries: [
						{
							employeeId: manager,
							name: fixture.names.user,
							seconds: 20 * HOUR,
							limit: STANDARD_WEEK_LIMIT
						}
					]
				},
				// a row dated mid-week: `limitEntriesOf` `:337-356` keeps only a period's first day
				{
					offset: thisMonday - 4,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 5 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				},
				{
					offset: thisMonday,
					entries: [
						{
							employeeId: manager,
							name: fixture.names.user,
							seconds: 44 * HOUR,
							limit: STANDARD_WEEK_LIMIT
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		await durationTab(page, L.DURATION_WEEK).click();
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);

		const weekPeriod = snappedWeekPeriod(monthPeriod(), MONDAY);
		const weekCall = lastOf(calls);
		expect(
			weekCall.params.duration,
			'a Monday workspace was not asked for weeks (`apiLimitDurationOf` `:118-124`)'
		).toBe('week');
		expect(weekCall.params.startDate, 'the week period was not snapped back to a Monday').toBe(
			weekPeriod.from.toISOString()
		);
		expect(weekCall.params.endDate, 'the week period was not snapped to the Sunday that ends it').toBe(
			weekPeriod.to.toISOString()
		);
		expect(await textOf(pageHeading(page)), 'the title did not follow the duration switch').toBe(C.WEEKLY_LIMIT);
		expect(await textOf(pageMeta(page)), 'the header meta did not follow the snapped week period').toEqual(
			`${periodTextOf(weekPeriod.from, weekPeriod.to)} · ${copy(L.MEMBERS_COUNT, { count: 3 })}`
		);

		const section = heatmapSection(page, L.HEATMAP_TITLE_WEEKS);
		await expect(section, 'the weekly heatmap section is named after days').toHaveCount(1);
		const columns: string[] = [];
		for (let week = startOfLocalDay(weekPeriod.from); week <= weekPeriod.to; week = shiftDays(week, 7)) {
			columns.push(weekColumnTextOf(week));
		}
		expect(
			await allTextsOf(page.getByRole('columnheader')),
			'the weekly header row is not one column per week of the snapped period'
		).toEqual(headerTextsOf(columns));

		// the served Thursday is nowhere, and the two Mondays are (`probe-3.log` R2)
		const servedKeys = [thisMonday - 7, thisMonday - 4, thisMonday].map((offset) =>
			localDayKeyOf(localDay(offset))
		);
		expect(
			await cellsWithTimeOf(page),
			'an answer row that is not a period start was shown, or a week limit is not five days (`addedItemOf` `:146-152`)'
		).toEqual([
			`${weekLabelOf(localDay(thisMonday - 7))} · ${trackedOf(20 * HOUR)} of ${hoursOf(STANDARD_WEEK_LIMIT)} · 50%`,
			`${weekLabelOf(localDay(thisMonday))} · ${trackedOf(44 * HOUR)} of ${hoursOf(STANDARD_WEEK_LIMIT)} · 110% · ${copy(L.REMAINING_OVER, { duration: trackedOf(4 * HOUR) })}`
		]);
		report('weekly-monday', {
			served: servedKeys,
			queries: calls.map(
				(call) => `${call.params.startDate} → ${call.params.endDate} duration=${call.params.duration}`
			),
			columns,
			cells: await cellsWithTimeOf(page),
			rowTotals: await allTextsOf(page.getByRole('gridcell').filter({ hasText: /\/ / })),
			attention: await attentionLinesOf(page)
		});
		expect(
			await attentionLinesOf(page),
			'the weekly attention line does not count weeks (`ATTENTION_OVER_WEEKS`)'
		).toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}·${copy(USED_OF_TEMPLATE, { used: trackedOf(44 * HOUR), limit: hoursOf(STANDARD_WEEK_LIMIT) })}·${copy(L.ATTENTION_OVER_WEEKS, { duration: trackedOf(4 * HOUR), count: 1 })}`
		]);
		expect(consoleFindings(shield), 'the weekly test logged a console error').toEqual([]);
	});

	// ------------------------------------------- 12. a workspace whose week starts on Sunday

	test('12 · a workspace whose week starts on Sunday is asked for days and the days are added into Sunday weeks here', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		// the same rule `core/lib/utils/dashboards/weekly-limit-week-start.test.ts` pins for the pure functions
		const orgSeen = await serveOrganization(page, fixture.ids.organizationA, { startWeekOn: 'SUNDAY' });
		const thisSunday = weekStartOffset(SUNDAY);
		// the same shape `probe-3.log` R1 served: one day in the previous Sunday week, then the current week's Sunday and Monday
		const calls = await serveReport(page, {
			days: [
				{
					offset: thisSunday - 6,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 2 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				},
				{
					offset: thisSunday,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 3 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				},
				{
					offset: thisSunday + 1,
					entries: [
						{ employeeId: manager, name: fixture.names.user, seconds: 4 * HOUR, limit: STANDARD_DAY_LIMIT }
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		const dayCall = lastOf(calls);
		await durationTab(page, L.DURATION_WEEK).click();
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);

		const weekPeriod = snappedWeekPeriod(monthPeriod(), SUNDAY);
		const weekCall = lastOf(calls);
		expect(
			weekCall.params.duration,
			'a Sunday workspace was asked for weeks, which Gauzy would answer in Monday weeks (`apiLimitDurationOf` `:118-124`)'
		).toBe('day');
		expect(weekCall.params.startDate, 'the Sunday week period was not snapped back to a Sunday').toBe(
			weekPeriod.from.toISOString()
		);
		expect(weekCall.params.endDate, 'the Sunday week period was not snapped to its Saturday').toBe(
			weekPeriod.to.toISOString()
		);
		expect(dayCall.params.duration, 'the day view was not asked as days').toBe('day');

		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${periodTextOf(weekPeriod.from, weekPeriod.to)} · ${copy(L.MEMBERS_COUNT, { count: 3 })}`);
		const columns: string[] = [];
		for (let week = startOfLocalDay(weekPeriod.from); week <= weekPeriod.to; week = shiftDays(week, 7)) {
			columns.push(weekColumnTextOf(week));
		}
		expect(
			await allTextsOf(page.getByRole('columnheader')),
			'the week columns do not start on the workspace week start'
		).toEqual(headerTextsOf(columns));

		// 2 h into the week that starts the Sunday before it, and 3 h + 4 h into the current one, against a 5 × 8 h week limit
		// (`weeklyReportsOfDays` `:158-183`, `addedItemOf` `:146-152`; `probe-3.log` R1-dom.cellLabels)
		expect(await cellsWithTimeOf(page), 'the served days were not added into the workspace weeks').toEqual([
			`${weekLabelOf(localDay(thisSunday - 7))} · ${trackedOf(2 * HOUR)} of ${hoursOf(STANDARD_WEEK_LIMIT)} · 5%`,
			`${weekLabelOf(localDay(thisSunday))} · ${trackedOf(7 * HOUR)} of ${hoursOf(STANDARD_WEEK_LIMIT)} · 18%`
		]);
		expect(
			await allTextsOf(page.getByRole('rowheader')),
			'the row total is not the summed days over the summed week limits'
		).toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}${trackedOf(9 * HOUR)} / ${hoursOf(2 * STANDARD_WEEK_LIMIT)} · ${L.VERDICT_WITHIN}`
		]);
		report('sunday-weeks', {
			orgSeen,
			queries: calls.map(
				(call) => `${call.params.startDate} → ${call.params.endDate} duration=${call.params.duration}`
			),
			columns,
			cells: await cellsWithTimeOf(page),
			meta: await textOf(pageMeta(page))
		});
		expect(consoleFindings(shield), 'the Sunday week test logged a console error').toEqual([]);
	});

	// ------------------------------------------- 13. the period steps

	test('13 · Previous period steps by a whole month, Next steps back onto the month already read and costs no read', async ({
		page,
		fixture
	}) => {
		const calls = await serveReport(page, { days: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);
		const group = periodGroup(page);

		const previous = {
			from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1, 0, 0, 0, 0),
			to: new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999)
		};
		await group.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }).click();
		await expect.poll(() => lastOf(calls).params.startDate, { timeout: 20_000 }).toBe(previous.from.toISOString());
		expect(lastOf(calls).params.endDate, 'the previous month did not end at its last day').toBe(
			previous.to.toISOString()
		);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${periodTextOf(previous.from, previous.to)} · ${copy(L.MEMBERS_COUNT, { count: 3 })}`);
		const readsAfterStepBack = calls.length;

		// `shiftPeriod` by 1 on a month period returns to this month, which is still in the cache (`probe-3.log` R4-queries)
		await group.getByRole('button', { name: PERIOD.NEXT, exact: true }).click();
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${periodTextOf(monthPeriod().from, monthPeriod().to)} · ${copy(L.MEMBERS_COUNT, { count: 3 })}`);
		const readsAfterStepForward = calls.length;
		expect(
			readsAfterStepForward,
			'stepping forward onto the month already read read the report again instead of reusing it'
		).toBe(readsAfterStepBack);
		expect(
			lastOf(calls).params.startDate,
			'the last read still belongs to the month that was stepped back to'
		).toBe(previous.from.toISOString());
		report('period-steps', {
			steps: calls.map((call) => `${call.params.startDate} → ${call.params.endDate}`),
			meta: await textOf(pageMeta(page)),
			reads: calls.length
		});
	});

	// ------------------------------------------- 14. the period popover

	test('14 · the period popover: the eight preset labels, a range picked from the calendar, and Today with its one-day title', async ({
		page,
		fixture
	}) => {
		const calls = await serveReport(page, { days: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);
		const group = periodGroup(page);

		const trigger = group.getByRole('button', { name: C.THIS_MONTH, exact: true });
		await trigger.click();
		const rows = presetColumn(page).getByRole('button');
		await expect(rows, 'the popover does not offer the eight presets').toHaveCount(PRESET_LABELS.length);
		expect(
			await rows.evaluateAll((nodes) =>
				nodes.map((node) => (node.querySelector('span')?.textContent ?? '').replace(/\s+/g, ' ').trim())
			),
			'the preset rows are not the eight labels the picker builds'
		).toEqual(PRESET_LABELS);
		report('popover', { rows: await allTextsOf(rows) });

		/* A custom range, picked in this same popover and from the month it opened on — the current one, because the period
		   is `thisMonth` and `defaultMonth={value.from}` (`period-picker.tsx:156`). Days 10 and 14 exist in it on any date
		   and are never outside days. Counting days back from today instead is what the brief forbids. */
		const now = new Date();
		const from = new Date(now.getFullYear(), now.getMonth(), 10, 0, 0, 0, 0);
		const to = new Date(now.getFullYear(), now.getMonth(), 14, 23, 59, 59, 999);
		await popover(page).getByRole('gridcell', { name: '10', exact: true }).click();
		await popover(page).getByRole('gridcell', { name: '14', exact: true }).click();
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
		// `completedPeriodOf` anchors the range on `startOfDay(from)` / `endOfDay(to)` (`period-picker.tsx:40-47`)
		expect(lastOf(calls).params.startDate, 'the custom range did not start at the clicked day').toBe(
			from.toISOString()
		);
		expect(lastOf(calls).params.endDate, 'the custom range did not end at the clicked day').toBe(to.toISOString());
		const rangeText = periodTextOf(from, to);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${rangeText} · ${copy(L.MEMBERS_COUNT, { count: 3 })}`);
		const section = heatmapSection(page, L.HEATMAP_TITLE_DAYS);
		await expect(
			section.getByText(copy(L.EMPTY_RANGE, { from: shortDayOf(from), to: shortDayOf(to) }), { exact: true }),
			'the empty state does not name the custom range, each end on its own'
		).toBeVisible();

		// a preset row, picked from a re-opened popover: its accessible name is `<label> <dates>`, and `Today` is one day
		await group.getByRole('button', { name: rangeText, exact: false }).click();
		await presetColumn(page).getByRole('button', { name: C.TODAY }).click();
		const todayPeriod = dayPeriod(0);
		await expect
			.poll(() => lastOf(calls).params.startDate, { timeout: 20_000 })
			.toBe(todayPeriod.from.toISOString());
		expect(lastOf(calls).params.endDate, 'the one-day period did not end at the end of that day').toBe(
			todayPeriod.to.toISOString()
		);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${shortDayOf(localDay(0))} · ${copy(L.MEMBERS_COUNT, { count: 3 })}`);
		// `emptyTitleOf` `weekly-limit-table.tsx:512-521`: both ends print alike, so the day form is used
		await expect(
			heatmapSection(page, L.HEATMAP_TITLE_DAYS).getByText(copy(L.EMPTY_DAY, { day: shortDayOf(localDay(0)) }), {
				exact: true
			}),
			'a one-day period does not get dashboard.weeklyLimit.EMPTY_DAY'
		).toBeVisible();
		expect(
			await allTextsOf(page.getByRole('columnheader')),
			'a one-day period does not render exactly its own column'
		).toEqual(headerTextsOf([dayColumnTextOf(localDay(0))]));
		report('one-day-period', {
			queries: calls.map((call) => `${call.params.startDate} → ${call.params.endDate}`),
			meta: await textOf(pageMeta(page)),
			columns: await allTextsOf(page.getByRole('columnheader')),
			paragraphs: await allTextsOf(heatmapSection(page, L.HEATMAP_TITLE_DAYS).locator('p'))
		});
	});

	// ------------------------------------------- 15. the member filter

	test('15 · the member filter narrows the read, the rows and the header count, and leaves a chip with its own remove button', async ({
		page,
		fixture,
		shield
	}) => {
		const teammate = fixture.ids.teammateEmployee;
		const calls = await serveReport(page, {
			honourIds: true,
			days: [
				{
					offset: -2,
					entries: [
						{
							employeeId: fixture.ids.employee,
							name: fixture.names.user,
							seconds: 9 * HOUR,
							limit: STANDARD_DAY_LIMIT
						},
						{
							employeeId: teammate,
							name: fixture.names.teammate,
							seconds: 7.5 * HOUR,
							limit: STANDARD_DAY_LIMIT
						},
						{
							employeeId: fixture.ids.deniedEmployee,
							name: fixture.names.denied,
							seconds: 4 * HOUR,
							limit: 0
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);
		await expect(memberRows(page), 'the unfiltered page did not show the three members').toHaveCount(3);

		await filterButton(page).click();
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		const memberOptions = page.getByRole('menuitemcheckbox');
		await expect(memberOptions, 'the members submenu did not list the team three').toHaveCount(3);
		expect(
			await allTextsOf(memberOptions),
			'the members offered are not the team three, by name, with their avatar initials'
		).toEqual(
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
		await expect(memberRows(page), 'the filtered page did not narrow to the picked member').toHaveCount(1);
		expect(
			await textOf(pageMeta(page)),
			'the header member count did not follow the filter (`populationCount` `:295`)'
		).toEqual(`${periodTextOf(monthPeriod().from, monthPeriod().to)} · ${copy(L.MEMBERS_COUNT, { count: 1 })}`);

		// the chip and its remove action (`AppliedMemberFilters` `:85-90`)
		const removeLabel = copy(L.REMOVE_MEMBER, { name: fixture.names.teammate });
		await expect(
			page.getByRole('button', { name: removeLabel, exact: true }),
			'the applied filter has no chip with its own remove button'
		).toBeVisible();
		report('filtered', {
			query: lastOf(calls).params,
			meta: await textOf(pageMeta(page)),
			rowheaders: await allTextsOf(page.getByRole('rowheader')),
			chip: await textOf(
				page
					.locator('span')
					.filter({ hasText: `${C.MEMBER}:` })
					.first()
			),
			removeLabel,
			exportDisabled: await exportButton(page).isDisabled()
		});
		expect(consoleFindings(shield), 'the member filter logged a console error').toEqual([]);
	});

	test('16 · the filtered members tracked nothing: the filtered empty state, its Clear filters action, and Export disabled', async ({
		page,
		fixture,
		shield
	}) => {
		const teammate = fixture.ids.teammateEmployee;
		const calls = await serveReport(page, { honourIds: true, days: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);

		await filterButton(page).click();
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		await memberOption(page, fixture.names.teammate).click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect.poll(() => lastOf(calls).params['employeeIds[0]'], { timeout: 20_000 }).toBe(teammate);

		await expect(memberRows(page), 'a row appeared for a member with no time').toHaveCount(0);
		await expect(exportButton(page), 'Export is offered although nothing was tracked').toBeDisabled();
		await expect(attentionSection(page), 'a Needs attention section appeared with no data').toHaveCount(0);
		const section = heatmapSection(page, L.HEATMAP_TITLE_DAYS);
		await expect(
			section.getByText(
				copy(L.EMPTY_RANGE, { from: shortDayOf(monthPeriod().from), to: shortDayOf(monthPeriod().to) }),
				{
					exact: true
				}
			),
			'the filtered empty state does not name the period'
		).toBeVisible();
		await expect(
			section.getByText(L.EMPTY_FILTERED_MESSAGE, { exact: true }),
			'the filtered empty state does not say the selected members tracked no time'
		).toBeVisible();
		await expect(
			section.getByRole('button', { name: C.CLEAR_FILTERS, exact: true }),
			'the filtered empty state offers no way back to the whole team'
		).toBeVisible();
		report('filtered-empty', {
			queries: calls.map((call) => call.params['employeeIds[0]']),
			paragraphs: await allTextsOf(section.locator('p')),
			exportDisabled: await exportButton(page).isDisabled(),
			sections: await allTextsOf(page.locator('section[aria-label]'))
		});
		expect(consoleFindings(shield), 'the filtered empty state logged a console error').toEqual([]);
	});

	// ------------------------------------------- 17. the export

	test('17 · the export: the three options of the day view, the CSV with its BOM, its header and its row, the PDF file name', async ({
		page,
		fixture,
		shield
	}) => {
		const teammate = fixture.ids.teammateEmployee;
		// the one row `probe-3.log` R5 exported, and the CSV it produced (`R5-csv`)
		const calls = await serveReport(page, {
			days: [
				{
					offset: -2,
					entries: [
						{
							employeeId: teammate,
							name: fixture.names.teammate,
							seconds: 7.5 * HOUR,
							limit: STANDARD_DAY_LIMIT
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBe(1);
		await expect(memberRows(page), 'the exported view has no row').toHaveCount(1);

		await exportButton(page).click();
		expect(
			await allTextsOf(page.getByRole('menuitem')),
			'the day view does not offer exactly PDF by day, PDF by member and CSV (`weekly-limit-export.tsx:306-360`)'
		).toEqual([L.EXPORT_PDF_BY_DAY, L.EXPORT_PDF_BY_MEMBER, L.CSV]);

		const csvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: L.CSV, exact: true }).click();
		const csv = await csvEvent;
		const raw = readFileSync((await csv.path()) as string, 'utf8');
		const period = monthPeriod();
		const expectedName = `daily-limit-${localDayKeyOf(period.from)}-${localDayKeyOf(period.to)}.csv`;
		const header = [
			L.CSV_DAY,
			C.MEMBER,
			L.CSV_TRACKED,
			L.CSV_LIMIT,
			L.CSV_LIMIT_USED,
			L.CSV_REMAINING,
			L.CSV_OVER_BY,
			C.STATUS,
			L.CSV_LIMIT_SOURCE
		].join(',');
		// the BOM is the only thing in front of the header, so line 0 is the header and the rest are the rows
		const csvLines = raw
			.slice(1)
			.split('\r\n')
			.filter((line) => line !== '');
		report('csv-day', {
			name: csv.suggestedFilename(),
			firstCodePoint: raw.codePointAt(0),
			lines: csvLines
		});
		expect(csv.suggestedFilename(), 'the CSV is not named after the shown period').toBe(expectedName);
		expect(raw.codePointAt(0), 'the CSV has no UTF-8 BOM (`downloadCsv` `:56-60`)').toBe(UTF8_BOM);
		expect(csvLines[0], 'the CSV header is not the nine columns csvColumnsOf builds').toBe(header);
		expect(
			csvLines.slice(1),
			'the CSV row is not the row the view shows, in the form `csvColumnsOf` writes it (`probe-3.log` R5-csv, `s3-lane-c-weeklylimit-fix-1.log` failure 3)'
		).toEqual([
			`${localDayKeyOf(localDay(-2))},${fixture.names.teammate},${clockOf(7.5 * HOUR)},${clockOf(STANDARD_DAY_LIMIT)},93.8,0:30,0:00,${L.VERDICT_NEAR},${L.LIMIT_SOURCE_MEMBER}`
		]);

		await exportButton(page).click();
		const pdfEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: L.EXPORT_PDF_BY_DAY, exact: true }).click();
		const pdf = await pdfEvent;
		expect(pdf.suggestedFilename(), 'the PDF is not named after the shown period').toBe(
			`daily-limit-${localDayKeyOf(period.from)}-${localDayKeyOf(period.to)}.pdf`
		);
		report('pdf-day', { name: pdf.suggestedFilename(), bytesRead: false });
		expect(consoleFindings(shield), 'the export logged a console error').toEqual([]);
	});

	test('18 · the weekly CSV: Week start and Week end instead of a day, and the file named for the snapped week period', async ({
		page,
		fixture,
		shield
	}) => {
		const manager = fixture.ids.employee;
		const thisMonday = weekStartOffset(MONDAY);
		const calls = await serveReport(page, {
			days: [
				{
					offset: thisMonday - 7,
					entries: [
						{
							employeeId: manager,
							name: fixture.names.user,
							seconds: 20 * HOUR,
							limit: STANDARD_WEEK_LIMIT
						}
					]
				},
				{
					offset: thisMonday,
					entries: [
						{
							employeeId: manager,
							name: fixture.names.user,
							seconds: 44 * HOUR,
							limit: STANDARD_WEEK_LIMIT
						}
					]
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		await durationTab(page, L.DURATION_WEEK).click();
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
		await expect(memberRows(page), 'the weekly row did not arrive').toHaveCount(1);

		await exportButton(page).click();
		expect(
			await allTextsOf(page.getByRole('menuitem')),
			'the weekly view does not offer exactly PDF by week, PDF by member and CSV'
		).toEqual([L.EXPORT_PDF_BY_WEEK, L.EXPORT_PDF_BY_MEMBER, L.CSV]);

		const csvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: L.CSV, exact: true }).click();
		const csv = await csvEvent;
		const raw = readFileSync((await csv.path()) as string, 'utf8');
		const weekPeriod = snappedWeekPeriod(monthPeriod(), MONDAY);
		const header = [
			L.CSV_WEEK_START,
			L.CSV_WEEK_END,
			C.MEMBER,
			L.CSV_TRACKED,
			L.CSV_LIMIT,
			L.CSV_LIMIT_USED,
			L.CSV_REMAINING,
			L.CSV_OVER_BY,
			C.STATUS,
			L.CSV_LIMIT_SOURCE
		].join(',');
		const csvLines = raw
			.slice(1)
			.split('\r\n')
			.filter((line) => line !== '');
		report('csv-week', { name: csv.suggestedFilename(), lines: csvLines });
		expect(csv.suggestedFilename(), 'the weekly CSV is not named after the snapped week period').toBe(
			`weekly-limit-${localDayKeyOf(weekPeriod.from)}-${localDayKeyOf(weekPeriod.to)}.csv`
		);
		expect(csvLines[0], 'the weekly CSV header is not Week start · Week end · the rest').toBe(header);
		expect(
			csvLines.slice(1),
			'the weekly CSV rows are not the weeks of the view (`probe-4.log` S4-csv, `s3-lane-c-weeklylimit-fix-1.log` failure 4)'
		).toEqual([
			`${localDayKeyOf(localDay(thisMonday - 7))},${localDayKeyOf(shiftDays(localDay(thisMonday - 7), 6))},${fixture.names.user},${clockOf(20 * HOUR)},${clockOf(STANDARD_WEEK_LIMIT)},50,20:00,0:00,${L.VERDICT_WITHIN},${L.LIMIT_SOURCE_MEMBER}`,
			`${localDayKeyOf(localDay(thisMonday))},${localDayKeyOf(shiftDays(localDay(thisMonday), 6))},${fixture.names.user},${clockOf(44 * HOUR)},${clockOf(STANDARD_WEEK_LIMIT)},110,0:00,4:00,${L.VERDICT_OVER},${L.LIMIT_SOURCE_MEMBER}`
		]);
		expect(consoleFindings(shield), 'the weekly export logged a console error').toEqual([]);
	});

	// ------------------------------------------- 19. a read that is refused

	test('19 · a refused read: the notice, the retry, Export disabled, no grid, and only the armed status excused in the console', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = await serveReport(page, { refusal: 500 });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);

		const notice = errorNotice(page);
		await expect(notice, 'the refused read rendered no notice').toHaveCount(1);
		expect(await innerOf(notice), 'the notice is not states.ERROR_TITLE · ERROR_MESSAGE · Try again').toBe(
			`${STATES.ERROR_TITLE} ${STATES.ERROR_MESSAGE} ${TRY_AGAIN}`
		);
		await expect(page.getByRole('grid'), 'a grid was rendered over a refused read').toHaveCount(0);
		await expect(attentionSection(page), 'the attention list was rendered over a refused read').toHaveCount(0);
		await expect(exportButton(page), 'Export is offered over a refused read').toBeDisabled();
		expect(
			await page
				.getByRole('button')
				.evaluateAll(
					(nodes, retryLabel) =>
						nodes.map((node) => (node.textContent ?? '').trim()).filter((text) => text === retryLabel)
							.length,
					TRY_AGAIN
				),
			'the notice does not offer the retry the page wires to `report.refetch`'
		).toBe(1);

		const refusedLines = armedFailureLines(shield, 500);
		report('refused-read', {
			reads: calls.length,
			notice: await innerOf(notice),
			consoleLines: refusedLines.length,
			console: refusedLines.map((line) => line.slice(0, 120))
		});
		expect(
			refusedLines.length,
			'the refused read logged no [HttpClient] line naming this path and the armed status'
		).toBeGreaterThan(0);
		expect(
			consoleFindingsWithArmed(shield, 500),
			'the refused read logged something this file did not arm'
		).toEqual([]);
		expect(shield.pageErrors(), 'the refused read threw a page error').toEqual([]);

		const readsBefore = calls.length;
		await page.getByRole('button', { name: TRY_AGAIN, exact: true }).click();
		// never an exact count for a read that failed: retries vary (`liveQueryOptionsOf`)
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThan(readsBefore);
		report('refused-retry', { readsBefore, readsAfterRetry: calls.length });
	});

	// ------------------------------------------- 20. an answer that does not parse

	test('20 · an answer that does not parse: the same notice and no grid, and the console names the schema that refused it', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = await serveReport(page, {
			rawBody: [
				{
					date: localDayKeyOf(localDay(-1)),
					employees: [{ employee: { id: 'not-a-uuid' }, duration: -5, limit: STANDARD_DAY_LIMIT }]
				},
				{ employees: [] }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);

		const notice = errorNotice(page);
		await expect(notice, 'an answer that does not parse rendered no notice').toHaveCount(1);
		expect(await innerOf(notice), 'the notice for a bad answer is the same one a refused read gets').toBe(
			`${STATES.ERROR_TITLE} ${STATES.ERROR_MESSAGE} ${TRY_AGAIN}`
		);
		await expect(page.getByRole('grid'), 'a grid was rendered over an answer that does not parse').toHaveCount(0);
		await expect(exportButton(page), 'Export is offered over an answer that does not parse').toBeDisabled();

		const lines = validationLines(shield);
		report('bad-answer', {
			reads: calls.length,
			notice: await innerOf(notice),
			validationLines: lines.length,
			console: shield.consoleErrors().map((line) => line.slice(0, 160))
		});
		expect(
			lines.length,
			'the service logged no `Time limits report validation failed:` line (`time-log.service.ts:128-131`)'
		).toBeGreaterThan(0);
		expect(
			consoleFindings(shield).filter((line) => !line.includes(VALIDATION_FAILURE)),
			'the bad answer logged something other than the validation failure'
		).toEqual([]);
		expect(shield.pageErrors(), 'the bad answer threw a page error').toEqual([]);
	});
});
