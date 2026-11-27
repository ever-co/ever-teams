import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { mockReset, signInAndVisit } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in manager sees on **Reports › Manual time edits** (`/reports/manual-time-edits`,
 * `app/[locale]/(main)/reports/manual-time-edits/page.tsx` → `core/components/dashboards/manual-time-edits/manual-time-edits-page.tsx`),
 * on lane-b (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, statistics `3997`, control `3998`, issuer
 * `3999`, `playwright/test-servers.ts:37-42`). Who may open this page at all is pinned by
 * `suites/lane-a/reports-gate-by-role-ui.spec.ts` (arm 1 admits the fixture manager, who also reads this page's
 * history read at `:205-209`); every case here signs in as that manager.
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `E:\Coding\.tmp\probe-manualedits\probe.spec.ts` (P1-P8), `probe2.spec.ts` (Q1-Q9),
 * `probe3.spec.ts` (R1-R8), run on this lane on 2026-11-25 and logged in
 * `E:\Coding\.tmp\s3-lane-b-manualedits-probe-1.log` (7 failed on a probe-harness bug — `flat` used inside a browser
 * callback — the surviving lines are not used here), `-probe-2.log` (12 passed), `-probe-3e.log` (R1-R2),
 * `-probe-4a.log`, `-probe-4b.log`, `-probe-4c.log`, `-probe-4d.log` (R3-R8 run in slices). Every value asserted below
 * is one those runs printed, or one this file's own `MEASURE` line printed on a run that passed: the whole-file runs
 * `-0.log` (6 failed, which is how findings 14-17 were found) and the slices `-probe-5.log` (tests 10-15),
 * `-probe-6.log` (11-15), `-probe-7.log` (1, 3, 4, 6, 8, 9), `-probe-8.log` (1, 4, 6, 8, 9) and `-probe-9.log` (4). Served logs and history rows are offsets from the day the run runs on (`localDay`,
 * `at`, the pattern of `suites/lane-c/payments-due-report-ui.spec.ts` `localDay`), every formatted string is rebuilt
 * here from the same offsets with the same `Intl` options the page uses, and no case names today's date. The browser's
 * own zone is read from the page in test 2, never assumed: on this PC it resolved to `Europe/Madrid` while the mock
 * profile says `UTC` (`mock-gauzy-server.mjs:107`), which is why the shell shows its "Your profile uses UTC …" notice
 * on every visit. Findings 1, 6 and 10 were also re-printed by this spec's own whole-file runs
 * (`E:\Coding\.tmp\s3-lane-b-manualedits-1.log` …), each from its own `MEASURE` line.
 *
 * Checked to hold on any weekday (2026-11-27): the served days stay offsets from the run's day, because this report
 * groups the entries it was served rather than the days of the shown period (`groupsOf`,
 * `core/lib/utils/dashboards/manual-time-edits.ts`), so no case here needs a served day to sit in the current week —
 * except a **deletion**, which the page lists only when the deleted log's own day lies inside the shown period
 * (`deletedOfPeriod` → `isWithin(entry.startedAt, from, to)`, `use-time-log-period-history.ts:62-82`). Tests 4 and 10
 * therefore step the feed onto `common.FILTER_LAST_7_DAYS` (today-6 … today: every day of it past, every day this file
 * serves inside it on a Monday as on a Sunday), and the history-read bounds and the export file names follow that
 * window. Test 8's week step is `setDate` arithmetic (`shiftDay`), not 7 × 24 h, which in a zone with a DST night lands
 * an hour off the midnight the read asks for; and the two served change instants that fell on the run's own day are
 * taken from the run's clock (`EDITED_INSTANT`, `DELETED_INSTANT`), so a run that starts before them is never shown a
 * change dated after it (whose relative tail would read `in 2 hours`, a form no entry prints).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, the shell and its reads, NextAuth, and the mock's own fixtures — the tenant, organization
 * and team ids (`fixture.ids`); the team's three members with their names and their avatar initials
 * (`mock-gauzy-server.mjs:150-154`); the fixture task name (`fixture.names.task`); the role permissions behind the
 * entry menu (the fixture role may edit, so every live entry carries a `More options` button and a deleted one does
 * not — `canEditEntry`, `manual-time-edits-table.tsx:96-102`, used at `manual-time-edit-entry.tsx:512`). Test 1 runs
 * with **no stub**: the mock's own `/api/timesheet/time-log` handler, its `report/daily` handler and its history
 * catch-all answer, and that is the whole empty page.
 *
 * **Served by this file:** every changed-logs, daily-report and history answer from test 2 on, through `page.route`
 * on the mock origin (the pattern of `suites/lane-c/payments-due-report-ui.spec.ts:402-442`), because the mock has no
 * idea what a manual or edited log looks like. Each answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`) — the page is on `localhost:3032` and the API on
 * `127.0.0.1:3996`. Where a case filters members, the stub answers **only the `employeeIds` the query asked for**
 * (`honourIds`, test 9), which is what a real backend does and is what lets the member filter visibly narrow the feed.
 * `route.fetch()` is never called, so `mock.calls('/api/timesheet/time-log')` stays empty for the served paths in every
 * stubbed test — the witness that the page acted on this file and not on the mock.
 *
 * **The browser talks to the mock, never to the app's route twins** (test 1 and test 2 print the origin of every read):
 * the lane points the client's axios base at `<mock origin>/api` (`test-servers.ts:37-42`), so `app/api/**` is not in
 * this file's path.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `manual-time-edits-page.tsx`: `PAGE_PATH` `:42`; `META_SEPARATOR = ' · '` `:44`; the report hook `:59`; the filter
 *   categories `:62`; the `editedAt` formatter `{month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}`
 *   `:70-78`; the export input `period: report.shownPeriod` `:106`; title `:111`; `periodText` `:112`; `membersText`
 *   `dashboard.weeklyLimit.MEMBERS_COUNT(populationCount)` `:113`; meta `:114`; `hasShownEntries` `:115`;
 *   `isExportDisabled = !hasShownEntries || isLoading || isHistoryLoading` `:116`; `showsReport` `:117`; `actionFigures`
 *   nulled only while loading `:118-121`; the breadcrumb `:123-126`; `ExportMenu` + `ADD_MANUAL_TIME` `:128-136`;
 *   `DashboardToolbar` `:144-178` (`PeriodPicker` `:153-158`, `EditsFilterMenu` `:159-164`, `EditsGroupingControl`
 *   `:167-169`, `AppliedEditsFilters` `:170-177`); `report.showsError && <DashboardErrorNotice onRetry={report.refetch}>`
 *   `:182`; the `showsNoMembers` branch `:183-190`; the feed + rail `:191-226` (`ManualTimeEditsEmpty` as the feed's
 *   `empty` `:209-217`).
 * - `core/hooks/dashboards/manual-time-edits/use-manual-time-edits-report.ts`: the period starts at
 *   `useWorkspaceWeekPeriod(thisWeekOf)` `:251` (`thisWeekOf` `:59-61`, Monday … Sunday in local time — the mock
 *   organization sets no `startWeekOn`); `grouping = 'day'` `:254`, `action = 'all'` `:253`; `reportedEmployeeIdsOf`
 *   (the applied ids, else every team member, **sorted**) `:128-133`; the changed-logs request `trackedRequestOf`
 *   `:111-126`; `historyRequestOf` `:163-172`; `appliedFiltersOf` drops `kinds` while the history is not ready
 *   `:183-188`; `trackedShareOf` `:202-225`; the two queries `:283-289` with history enabled only once a pair of logs
 *   exists (`hasShownRows = pair !== null`); `hasChangeKinds = historyStatus === 'ready'` `:292`; entries
 *   `[...withHistoryOf(…), ...deletedEntriesOf(…)]` `:295-308`; `shownPeriod = pair?.request.period ?? period` `:325`;
 *   `populationCount = reportedEmployeeIds.length` `:423`; `isUpdating` / `showsError` `:441-442`; `refetch` `:449`.
 * - `use-changed-time-logs.ts`: one query per kind `:66-79` with `placeholderData: previousOfSameScope`; the aligned
 *   pair rules `:81-139`; `showsError = isAnyError && !hasPair` `:155`; `refetch` re-runs **both** kinds `:159-162`.
 * - `use-time-log-period-history.ts`: `readUntilOf` = `endOfDay(new Date())` unless the period ends later `:41-47`
 *   (that instant is part of the query key `:92-99`); `staleTime 30_000` and **`retry: false`** `:104-105`; the status
 *   mapping error / loading / unsupported / ready `:120-129`; `deletedOfPeriod` `:71-82`.
 * - `core/services/client/api/timesheets/time-log-report.service.ts`: `changeFilterOf` — added asks
 *   `logType[0]=MANUAL`, edited asks `isEdited=true` `:79-84`; `getChangedTimeLogs` `:90-99` is
 *   `GET /timesheet/time-log?<query>` with `relations=[…TIMESHEET_RELATIONS]` and **no validation**
 *   (`response.data ?? []`), which is why finding 13 is possible.
 * - `core/services/client/api/timesheets/time-log-history.service.ts`: `PAGE_SIZE = 500` `:23`;
 *   `isHistoryUnsupportedStatus` (400/404/405/406) → `{kind:'unsupported'}` `:33-39`; `getPeriodHistory` reads
 *   `take: 500, skip: <page from 1>` until a short page, with `total = response.data?.total ?? rows.length`
 *   `:55-86`; `getEntryHistory` `GET /timesheet/time-log/<id>/history` `:43-52`.
 * - `core/lib/utils/dashboards/manual-time-edits.ts`: `entryOf` drops a log whose work day cannot be read `:206-247`;
 *   `changedEntriesOf` merges the two kinds by log id and, on a collision, only marks the **added** answer's entry as
 *   listed-edited `:250-281`; `entryMatchesFilters` (projects, billable, kinds — **no members clause**) `:308-313`;
 *   `entryMatchesAction` `:315-323`; `editsFiguresOf` (a deleted entry counts as an entry and no time) `:341-372`;
 *   `trackedSecondsOf` `:394-404`; `groupsByDayOf` (newest day first, entries by start ascending) `:433-450`;
 *   `groupsByMemberOf` (groups named by member, entries day-desc then start) `:473-491`; `relativeTimeTextOf`
 *   `:585-592`; `clockDateTimeOf` `YYYY-MM-DD HH:mm` `:595-603`; `FEED_VISIBLE_ENTRIES = 8` `:654`;
 *   `RANKED_ROW_COUNT = 5` `:700`; `manualRankingsOf` `:776-788`; `sharePercentTextOf` (`<1%`) `:793-800`.
 * - `core/lib/utils/dashboards/manual-time-edits-history.ts`: `lastChangeOf` (the first non-created row) `:20-22`;
 *   `withHistoryOf` `:25-36`; `deletedEntriesOf` (the delete row becomes an entry, its `editedAt` is the deletion, and
 *   a hidden project becomes `PRIVATE_PROJECTS_KEY`) `:71-110`.
 * - Feed: `manual-time-edits-feed.tsx` — `GroupTotals` `ENTRIES_COUNT(count) · formatDurationShort(seconds)` `:61-74`;
 *   `shownEntriesOf` slices at `FEED_VISIBLE_ENTRIES` `:120-125`; `ShowMoreToggle` `FEED_SHOW_MORE{count}` /
 *   `FEED_SHOW_FEWER` with `aria-expanded` and no `aria-label` `:127-154`; a group is
 *   `<section aria-labelledby><h3 id>` `:210-216` with an `<ol>` of entries `:218-233`; the feed is
 *   `<section aria-label=FEED_LABEL>` `:301` and its empty branch `:309`; `manual-time-edits-feed-head.tsx` — the lead
 *   sentence is **absent when `figures.entryCount === 0`**, `LEAD_SHARE` while the share is ready, `LEAD_TOTAL`
 *   otherwise.
 * - Entry: `manual-time-edit-entry.tsx` — `changeLabelKeyOf` (DELETED / ADDED_AND_EDITED / ADDED / EDITED) `:60-72`;
 *   the glyph `<span role="img" aria-label>` `:94-108`; the sentence keys `:156-173` filled at `:209-216`;
 *   `FeedProjectChip` (hidden → `common.PRIVATE_PROJECT`, none → `dashboard.timesheets.NO_PROJECT`) `:228-255`;
 *   `EntryMeta` (the day name only under member grouping, `timeRangeTextOf` (`dashboards/timesheets.ts:598-611`),
 *   `BILLABLE`, status) `:261-305`; `EntryReason` in a `<blockquote>` `:307-316`; `opensHistoryOf` needs a ready
 *   history **and** a last change `:355-359`; `HistoryToggle` `SHOW_HISTORY` / `HIDE_HISTORY` `:326-352`;
 *   `ChangeLine` → `NOT_KEPT` when the history is ready and no change was kept `:397`, `DELETED_AT` / `EDITED_AT`
 *   `:410-418`; `EntryHistoryPanel` reads `useTimeLogHistory(entryKey, true)` `:420-437`; the `<li>` `:481`; the entry
 *   menu only when the viewer may edit `:512`. The initials before an actor's name are `imgTitle`
 *   (`core/lib/helpers/img-title.ts:1-6`, used at `manual-time-edit-entry.tsx:147`) — the **first two words'** initials,
 *   so "Fixture Restricted Teammate" is `FR`; and the toggle's own label is `SHOW_HISTORY` closed, `HIDE_HISTORY` open
 *   (`:333-336`), rendered inside `ChangeLine`, i.e. inside the entry's own text (`:471-477`).
 *   `manual-time-edit-row.tsx` supplies `DayName` (rich `DAY_LABEL`,
 *   `common.TODAY` / `common.YESTERDAY` else the short weekday, `:52-86`) and `EntryMenu` (`common.MORE_OPTIONS` →
 *   `common.EDIT` / `common.DELETE`, `:213-244`).
 * - Toolbar: `manual-time-edits-toolbar.tsx` — `useEditsFilterCategories` `:115-153` (Members / Projects / Billable,
 *   and `KIND_LABEL` **only while the history is ready** `:142-150`); "No project" is the first project option
 *   `:73-82`; `AppliedEditsFilters` renders nothing when no filter is applied `:206-208`, a chip is
 *   `fieldLabel:` + the name + a button labelled `dashboard.timesheets.REMOVE_FILTER` `:225`, then
 *   `common.CLEAR_FILTERS` `:238`; `EditsActionControl` `allCount = figures.entryCount + figures.deletedCount` `:256`
 *   and hands those counts to the `SegmentedControl` as plain numbers `:244-271`, so a tab reads `All4` while a feed
 *   group header spells the same figure out with `ENTRIES_COUNT` (`manual-time-edits-feed.tsx:61-74`);
 *   `EditsGroupingControl` `:273-293`. `kit/period-picker.tsx`, `kit/export-menu.tsx`, `kit/dashboard-states.tsx:20-24`
 *   and `tasks/property-filter-menu.tsx` are the same kit `suites/lane-c/payments-due-report-ui.spec.ts:111-126` reads.
 * - Rail: `manual-time-edits-summary-rail.tsx` — `MISSING_VALUE = '–'` `:27`; `shareNoteOf` (a billable filter →
 *   `SHARE_NO_BILLABLE_SPLIT`, no tracked time → `SHARE_NO_TRACKED_TIME`, unreadable → `SHARE_UNAVAILABLE`, ready →
 *   none) `:64-74`; the change rows `ENTRIES_COUNT` + `formatDurationShort` `:99-113`; the share block `:115-154`; a
 *   rank `<li>` `:192-205`; `projectNameOf` (an "N other projects" row, `common.PRIVATE_PROJECTS` for a hidden one,
 *   else `NO_PROJECT`) `:215-225`; `<aside aria-label={RAIL_LABEL}>` `:255`; the ranked blocks only when
 *   `figures.entryCount > 0` `:258-280`. Each rail block is a `<section>` whose title is an **`h2`** —
 *   `ManualShareBlock` `:115-154` and `RankedBlock` `:233-239` — while the feed's day / member groups title theirs
 *   with an `h3` (`manual-time-edits-feed.tsx:212`), so the two lists of headings are not interchangeable.
 * - Export: `manual-time-edits-export.tsx` — `FILE_PREFIX = 'manual-time-edits'` `:35`; the CSV columns `:139-157`
 *   (project cell: hidden → `common.PRIVATE_PROJECT`, else name else `NO_PROJECT` `:50-56`; deleted rows write the
 *   `DELETED` copy in the After cell `:97-100`); the file cells `localDayKeyOf` / `clockTimeOf` / `clockDateTimeOf`
 *   `:122-127`; the option order CSV then PDF `:277-290`; `periodFileNameOf(FILE_PREFIX, period.from, period.to, ext)`
 *   (`core/lib/utils/dashboard-export.ts:86-88`), the CSV written with a UTF-8 BOM and `\r\n` (`:56-60`).
 *
 * ## What this file found (measured; each has the line that explains it)
 *
 * 1. **The page renders a feed and a rail, never a table.** `manual-time-edits-table.tsx` exports
 *    `ManualTimeEditsTable`, `TableHeader` (`role=columnheader`) and `ManualTimeEditRow` (`role=row`), but the page and
 *    the feed import only `ManualTimeEditsEmpty`, `canEditEntry`, `groupSelectionOf` and the types
 *    (`manual-time-edits-feed.tsx:33`, `manual-time-edits-page.tsx:33`), and a page holding 5 entries measured
 *    `table: 0, row: 0, columnheader: 0, article: 0` (`probe-2.log` Q1 page / Q2 page). So "rows" here are the feed's
 *    `<li>` entries and its group `<section>`s.
 * 2. **One merged entry, not two.** A log id that appears in *both* answers becomes one entry whose fields are the
 *    **added** answer's (`changedEntriesOf` `:262-272` only sets `isListedEdited = true` on collision), so the edited
 *    answer's own `editedAt` and values are ignored: probe served `probe-added-1` twice, once with `editedAt`
 *    `07:05` today and once without, and the entry printed no `EDITED_AT` line of its own while its glyph read "Added
 *    and edited" (`probe-2.log` Q2 page). Test 3 pins the glyph; the missing line is what the added answer's
 *    `editedAt: null` means. The merged log's own time is counted **once** in the rail's Manual figure (serving
 *    7200 + 3600 + 1800 + 9000 printed `6h 0m`) while the same log appears in both change rows (`Added 3 entries
 *    3h 30m` and `Edited 2 entries 4h 30m`), `editsFiguresOf` `:341-372`, `probe-2.log` Q2 rail.
 * 3. **A deleted entry counts as an entry and no time.** The day group that held the deleted entry plus an edited one
 *    read `Mon, Nov 232 entries·2h 30m` — the deleted entry's own 1h 30m is not in the total (`editsFiguresOf`
 *    `:341-372`, `groupsByDayOf` seconds), and a day holding only a deleted entry totals `1 entry·0h 0m`
 *    (`probe-2.log` Q9 page).
 * 4. **The history is paged at 500 rows and the page keeps asking.** With `total: 503` the browser sent
 *    `take=500&skip=1` then `take=500&skip=2` (`probe-2.log` Q3 historyParams), i.e. the loop of
 *    `time-log-history.service.ts:55-86`; the 500 filler rows named log ids the changed reads never returned, so they
 *    changed nothing on screen.
 * 5. **A history failure costs the "Kind of change" category, the deleted entries and the "not kept" line — and no
 *    notice.** At a 406 the feed, the rail and Export stayed exactly as they were, every edited entry lost
 *    `NOT_KEPT`, no entry offered a History toggle, the Filter menu dropped to `Members, Projects, Billable`
 *    (`probe-3e.log` R1, `probe-2.log` Q4), and the read was **not retried** (`retry: false`,
 *    `use-time-log-period-history.ts:105`; 1 call at a 406 and at a 500, `probe-2.log` Q4 / Q8b). A 500 on the same
 *    path produced the same page (`probe-2.log` Q8b) — only the console line differs.
 * 6. **The member filter changes only the read; the client never narrows by member.** `entryMatchesFilters` has no
 *    members clause (`manual-time-edits.ts:308-313`). Served an answer that ignores the requested ids, filtering to one
 *    member still showed all four entries (`probe-2.log` Q6); served an answer that honours them, the feed, the rail,
 *    the header count and the action-tab figures all followed (`probe-3e.log` R2). So what the page really does is ask
 *    for fewer employees — and a backend that ignores `employeeIds` silently breaks the filter.
 * 7. **Removing a member filter re-uses the cached read and sends nothing.** After the chip was removed the feed was
 *    back to three entries with `readsTotal` unmoved at 4 and the newest read still naming only the removed member
 *    (`probe-3e.log` R2 readsTotal / idsLast) — the query key holds the employee ids
 *    (`use-manual-time-edits-report.ts:283-289`) and a live period keeps it fresh for 30 s
 *    (`liveQueryOptionsOf`, `core/lib/utils/dashboard-live.ts`). The same caching covers the period steps: `Next
 *    period` from the previous week back onto this week moved the header while the newest read stayed the
 *    previous-period one (`probe-2.log` Q5 allReads).
 * 8. **A refused changed-logs read is the only case that shows a notice**, and it takes the whole feed and rail with
 *    it, including the `Change shown` tablist (they live inside `ManualTimeEditsFeed`, `manual-time-edits-page.tsx:191-226`):
 *    only the period group, Filter, `By day` / `By member` and a disabled Export stayed, and `Try again` re-read both
 *    kinds (`probe-2.log` Q8a).
 * 9. **A malformed changed-logs answer is silently partial** — the log without `startedAt` and the one whose
 *    `startedAt` was `'not-a-date'` disappeared, no notice appeared, no console line was logged, the lead sentence fell
 *    back to `LEAD_TOTAL` and Export stayed enabled (`probe-2.log` Q8c). `getChangedTimeLogs` validates nothing
 *    (`time-log-report.service.ts:90-99`); `entryOf` returns null when the work day cannot be read
 *    (`manual-time-edits.ts:206-247`). A history answer that was a bare array rather than `{ items, total }` produced
 *    no rows and no console line either (`probe-2.log` Q8d) — the service's `response.data?.items ?? []` `:70`.
 * 10. **The action tabs narrow only the feed.** With 3 entries, `Added` kept the 2 added ones and `Edited` kept the 2
 *    edited ones (the merged entry appearing in both, still reading "added …", because the sentence is chosen by the
 *    entry's change kinds, `manual-time-edit-entry.tsx:60-72`, not by the tab), while the rail, the lead sentence and
 *    the tab figures themselves never changed (`probe-3e.log` R4). Tab figures count **all** entries of the period: a
 *    day with 10 entries showed 8 entries and tabs `All10 / Added10 / Edited0` (`probe-4b.log` R3 feedButtons).
 * 11. A hidden project is named `common.PRIVATE_PROJECT` in an entry and its CSV cell, and `common.PRIVATE_PROJECTS`
 *    (plural) in the rail's rank row (`manual-time-edits.ts` `projectNameOf` `:215-225`, `manual-time-edits-export.tsx:50-56`),
 *    and it is **not** offered as a filter option: the Projects submenu listed only `No project` and `Fixture Project`
 *    (`probe-4d.log` R6 projectOptions).
 * 12. The billable filter costs the share: the rail's Tracked figure became `–` with the note
 *    `SHARE_NO_BILLABLE_SPLIT`, the percent `–`, and the lead sentence fell back to `LEAD_TOTAL`
 *    (`trackedShareOf` `:202-225` returns `'billable-filter'`; `probe-4d.log` R7).
 * 13. A filter that matches nothing is the feed's own filtered empty state — `NO_MATCH_TITLE` + `NO_MATCH_MESSAGE` +
 *    a `Clear filters` button *inside* the feed, next to the applied chip (`manual-time-edits-table.tsx:459-504`,
 *    `probe-4d.log` R8).
 * 14. **The rail and the feed title their blocks with different levels.** `railRegion h3` found nothing while
 *    `railRegion h2` found exactly `Share of tracked`, `Who adds time by hand`, `Projects` — and only the first of them
 *    on a period with no entry (`manual-time-edits-summary-rail.tsx:121`, `:236`, `:258-280`).
 * 15. **Two ways of printing the same count.** The action tabs render `All10 / Added10 / Edited0` as plain numbers
 *    (`manual-time-edits-toolbar.tsx:244-271`) while the group header of the very same period read
 *    `Yesterday, Nov 2410 entries·5h 0m` (`manual-time-edits-feed.tsx:61-74`); pinning one form for the other fails.
 * 16. **The initials before a name are the first two words'.** `imgTitle` (`core/lib/helpers/img-title.ts:1-6`, used at
 *    `manual-time-edit-entry.tsx:147`) made "Fixture Restricted Teammate" `FR` in the Filter menu — the
 *    first-plus-last-word rule of `kit/member-cell.tsx:13-18` would have printed `FT`.
 * 17. **A name is not stable once the page reacts to it.** Applying one filter renames the trigger to `Filter1`
 *    (`probe-3e.log` R2) and opening an entry's history renames its toggle to `Hide history`
 *    (`manual-time-edit-entry.tsx:333-336`), so an exact-name locator stops matching mid-test; both are read by
 *    position here instead.
 *
 * ## What this file does not cover
 *
 * The PDF's bytes (only its file name is checked); the `NO_MEMBERS_*` branch (`manual-time-edits-page.tsx:183-190`,
 * unreachable: this lane's mock always answers 3 team members, `mock-gauzy-server.mjs:150-154`); the chart the hook
 * builds (`chartDaysOf`, `manual-time-edits.ts:523-544` — no chart element appeared in any probe dump, and the page
 * never renders one); the `UPDATING` bar and the skeletons (`isUpdating` / `isLoading`, which need a slow read this
 * file does not arm); the selection toolbar (`Select all`, `SELECT_GROUP`, `common.DELETE` — a write path, out of
 * scope here); the ranked-row cut at `RANKED_ROW_COUNT = 5` (`manual-time-edits.ts:700`, `:752` — this file serves
 * three members and two projects, so it never reaches it, while the feed's own `FEED_VISIBLE_ENTRIES = 8` is covered
 * by test 6); the interval maths of the add / edit form (`manual-time-entry.test.ts`, `manual-time-entry-dst.test.ts`
 * — a write path this page only offers through `Add manual time`); the workspace-chosen date and time formats that
 * only exist once a workspace picks them (`core/lib/utils/dashboards/report-workspace-locale.test.ts`); and what
 * other specs already pin for this page — `suites/lane-a/reports-gate-by-role-ui.spec.ts` (who may open it) and
 * `suites/api/**` (the Next route twins). What the report's own unit tests pin — a hidden project sharing one rank
 * key (`core/lib/utils/dashboards/manual-time-edits-hidden-projects.test.ts`) and the history's last change, kinds
 * and deleted-entry counting (`manual-time-edits-history.test.ts`) — *is* re-pinned here in the browser, in tests 3, 4
 * and 7.
 */

const PAGE_PATH = '/reports/manual-time-edits';
const LOGS_PATH = '/api/timesheet/time-log';
const HISTORY_PATH = '/api/timesheet/time-log/history';
const DAILY_PATH = '/api/timesheet/time-log/report/daily';
/** The client's axios base already holds `/api`, so a logged failure names the path without it. */
const LOGS_LOGGED_PATH = '/timesheet/time-log';
const HISTORY_LOGGED_PATH = '/timesheet/time-log/history';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
/** The workspace chose no formats on this lane, which is what every rebuilt string below assumes (test 1 prints the locale). */
const WORKSPACE_LOCALE = 'en';
const UTF8_BOM = 65279;
/** `manual-time-edits-summary-rail.tsx:27`: the figure the rail puts where a number cannot be. */
const MISSING_VALUE = '–';
/** `FEED_VISIBLE_ENTRIES` (`manual-time-edits.ts:654`) — the entries one group shows before its toggle. */
const VISIBLE_ENTRIES = 8;

type Copy = Record<string, string>;
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	dashboard: {
		manualTimeEdits: Copy;
		period: Copy;
		states: Copy;
		timesheets: Copy & { COLUMNS: Copy; HISTORY: Copy; CHANGE: Copy };
		weeklyLimit: Copy;
	};
	common: Copy;
	pages: { unauthorized: Copy };
};
const M = EN.dashboard.manualTimeEdits;
const PERIOD = EN.dashboard.period;
const STATES = EN.dashboard.states;
const SHEET = EN.dashboard.timesheets;
const LIMITS = EN.dashboard.weeklyLimit;
const C = EN.common;
const TRY_AGAIN = EN.pages.unauthorized.TRY_AGAIN;
/** The eight presets `DEFAULT_PERIOD_PRESETS` lists (`kit/period-picker.tsx`, read in `payments-due-report-ui.spec.ts:223-233`). */
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

/** `{entries, plural, one {# entry} other {# entries}}` → the branch for the value, then the other holes. */
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
	let filled = template;
	for (;;) {
		const start = filled.search(/\{\w+, plural,/);
		if (start < 0) break;
		const header = /^\{(\w+), plural,/.exec(filled.slice(start));
		if (!header) break;
		const end = closingBraceOf(filled, start);
		const body = filled.slice(start + header[0].length, end);
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
		const count = Number(values[header[1]] ?? 0);
		const branch =
			branches.find(([key]) => key === `=${count}`) ??
			branches.find(([key]) => key === (count === 1 ? 'one' : 'other')) ??
			branches.find(([key]) => key === 'other');
		filled = `${filled.slice(0, start)}${(branch?.[1] ?? '').replaceAll('#', String(count))}${filled.slice(end + 1)}`;
	}
	return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), filled);
};

/** `t.rich` keys carry `<actor>`, `<figure>` and `<link>` tags; the page renders them as spans, so the text has none. */
const richOf = (template: string) => template.replace(/<\/?[a-z]+>/g, '');

const report = (label: string, value: unknown) =>
	console.log(`[lane-b manual-time-edits] MEASURE ${label} ${JSON.stringify(value)}`);

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

`localDay(0)` is the day the run runs on, at local noon, so a rendered "Today"/"Yesterday" cannot straddle a boundary.
`at(offset, hour, minute)` is an instant on the local day `offset` days from the run's day. Nothing here names a date. */

const localDay = (offset: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offset);
	return day;
};
const localDayKeyOf = (day: Date) =>
	`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
const at = (offset: number, hour: number, minute = 0) => {
	const day = new Date();
	day.setHours(hour, minute, 0, 0);
	day.setDate(day.getDate() + offset);
	return day;
};
/** `thisWeekOf` (`use-manual-time-edits-report.ts:59-61`): Monday 00:00 … Sunday 23:59:59.999, local. */
const weekPeriod = () => {
	const now = new Date();
	const from = new Date(now);
	from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
	from.setHours(0, 0, 0, 0);
	const to = new Date(from);
	to.setDate(to.getDate() + 6);
	to.setHours(23, 59, 59, 999);
	return { from, to };
};
const isoOf = (date: Date) => date.toISOString();
/** A calendar step of `days` on `day` (`setDate`, the way `addDays`/`subDays` step): the wall clock is kept, so a zone
    with a DST night never shifts by the hour the clock jumped, which `7 * 86_400_000` would. */
const shiftDay = (day: Date, days: number) => {
	const shifted = new Date(day);
	shifted.setDate(shifted.getDate() + days);
	return shifted;
};
/**
 * `periodOfPreset('last7Days')` (`core/lib/utils/dashboard-period.ts:92-93`): startOfDay(today − 6) … endOfDay(today),
 * local. The two tests that serve a *deletion* step the page onto this window, because the page lists a deletion only
 * when the deleted log's own day lies inside the shown period (`deletedOfPeriod` → `isWithin(entry.startedAt, from, to)`,
 * `use-time-log-period-history.ts:62-82`) and the served deletion is of a log **two days back** — a day the week the
 * page opens on does not reach on a Monday or a Tuesday. Every day of this window is past, and every day this file
 * serves (today, yesterday, two and three days back) is inside it, on every weekday. On a Sunday it is the same period
 * as `weekPeriod()`.
 */
const lastSevenDaysPeriod = () => {
	const from = localDay(-6);
	from.setHours(0, 0, 0, 0);
	const to = localDay(0);
	to.setHours(23, 59, 59, 999);
	return { from, to };
};
/** A served change instant, `minutes` before the run started: no served change is ever dated after the moment the page
    reads it (a run that starts before the served hour would otherwise be shown a change it has not seen yet, whose
    relative tail reads `in 2 hours` — a form no entry ever prints, so `RELATIVE_TAIL` would not match it). */
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
/** The two served history instants that fell on the run's own day: the edit, and the deletion that follows it. */
const EDITED_INSTANT = minutesAgo(95);
const DELETED_INSTANT = minutesAgo(45);

/* ------------------------------------------------------------------ the page's own formatting, rebuilt in Node */

const formatWith = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(WORKSPACE_LOCALE, options);
/** `formatPeriod` (`core/lib/utils/dashboard-period.ts:147-158`), year only when the range leaves this year. */
const periodTextOf = (from: Date, to: Date) =>
	flat(formatWith({ month: 'short', day: 'numeric' }).formatRange(from, to));
const shortDayOf = (day: Date) => formatWith({ month: 'short', day: 'numeric' }).format(day);
/** `EntryMeta`'s clock (`timeRangeTextOf` → `TimesheetFormatters.time`, `dashboards/timesheets.ts:598-611`). */
const clockOf = (date: Date) => formatWith({ hour: '2-digit', minute: '2-digit' }).format(date);
const timeRangeOf = (from: Date, to: Date) => `${clockOf(from)} – ${clockOf(to)}`;
/** The page's `editedAt` formatter (`manual-time-edits-page.tsx:70-78`). */
const editedAtOf = (date: Date) =>
	formatWith({ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
/** `DayName` (`manual-time-edit-row.tsx:52-86`): Today / Yesterday, else the short weekday, then the date. */
const dayNameOf = (day: Date) => {
	const key = localDayKeyOf(day);
	const name =
		key === localDayKeyOf(new Date())
			? C.TODAY
			: key === localDayKeyOf(localDay(-1))
				? C.YESTERDAY
				: formatWith({ weekday: 'short' }).format(day);
	return `${name}, ${shortDayOf(day)}`;
};
/** `formatDurationShort` (`core/lib/utils/dashboard-figures.ts:19-22`). */
const durationOf = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
/** `hoursMinutesOf` (`manual-time-edits-export.tsx`): the CSV's `1:30`. */
const csvDurationOf = (seconds: number) =>
	`${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}`;
/** `clockTimeOf` and `clockDateTimeOf` (`dashboards/timesheets.ts:613-620`, `manual-time-edits.ts:595-603`). */
const csvClockOf = (date: Date) =>
	`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const csvDateTimeOf = (date: Date) => `${localDayKeyOf(date)} ${csvClockOf(date)}`;
/**
 * `imgTitle` (`core/lib/helpers/img-title.ts:1-6`), which is what the entry's avatar fallback prints
 * (`manual-time-edit-entry.tsx:147`): the initials of the **first two words**, upper case — so "Fixture Restricted
 * Teammate" is `FR`, not the first-plus-last-word `FT` that `kit/member-cell.tsx:13-18` would have made.
 */
const initialsOf = (name: string) => {
	const words = name.replace(/[^a-zA-Z ]/g, '').split(' ');
	const first = words[0]?.charAt(0) ?? '';
	const second = words[1]?.charAt(0);
	return (second ? `${first}${second}` : name.substring(0, 2)).toUpperCase();
};
/** A feed sentence, with the avatar initials the entry puts before the actor's name. */
const sentenceOf = (template: string, values: Record<string, string | number>, actorName: string) => {
	const text = copy(richOf(template), values);
	return text.replace(actorName, `${initialsOf(actorName)}${actorName}`);
};
/** The relative tail of a change line (`relativeTimeTextOf`, `manual-time-edits.ts:585-592`): the *unit* is pinned by
    how far back the served moment is, the word is not, because it depends on the hour the run runs at. */
const RELATIVE_TAIL = '(?:just now|an hour ago|yesterday|\\d+ (?:minute|hour|day|month)s? ago)';
/** A measured string, made safe to put inside a `RegExp`. */
const reEscape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** One line of an entry's history panel (`time-log-history.tsx:113-171`): the field label, the `sr-only` "changed
    from … to …", then the old value, an arrow and the new one — in `textContent` order. */
const fieldLineOf = (label: string, before: string, after: string) =>
	`${label}${copy(SHEET.HISTORY.FIELD_CHANGED, { before, after })}${before}→${after}`;

/* ------------------------------------------------------------------ the served reads */

type ServedCall = { method: string; path: string; search: string; params: Record<string, string> };
type Fixture = { ids: Record<string, string>; names: Record<string, string> };

const paramsOf = (url: URL) => {
	const params: Record<string, string> = {};
	url.searchParams.forEach((value, key) => (params[key] = value));
	return params;
};
const employeeIdsOf = (call: ServedCall) =>
	Object.entries(call.params)
		.filter(([key]) => key.startsWith('employeeIds['))
		.sort(([key]) => Number(key.slice('employeeIds['.length, -1)))
		.map(([, value]) => value);
const memberIdsOf = (fixture: Fixture) =>
	[fixture.ids.employee, fixture.ids.teammateEmployee, fixture.ids.deniedEmployee].sort((first, second) =>
		first.localeCompare(second)
	);

const servedLog = (log: Record<string, unknown>) => log;

/**
 * `GET /api/timesheet/time-log`, the read of both kinds: `logType[0]=MANUAL` is the added one, `isEdited=true` the
 * edited one (`changeFilterOf`, `time-log-report.service.ts:79-84`). `honourIds` answers only the `employeeIds` the
 * query asked for — what a real backend does, and what lets the member filter visibly narrow the feed (finding 6).
 */
async function serveChangedLogs(
	page: Page,
	script: { added?: unknown[]; edited?: unknown[]; refusal?: number; raw?: unknown; honourIds?: boolean }
): Promise<ServedCall[]> {
	const calls: ServedCall[] = [];
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === LOGS_PATH,
		(route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			const params = paramsOf(url);
			calls.push({ method: request.method(), path: url.pathname, search: url.search, params });
			const headers = { ...CORS_HEADERS, 'content-type': 'application/json' };
			if (script.refusal) {
				return route.fulfill({
					status: script.refusal,
					headers,
					body: JSON.stringify({ statusCode: script.refusal, message: 'this file refused the read' })
				});
			}
			const isAdded = url.searchParams.get('logType[0]') === 'MANUAL';
			let body: unknown = script.raw ?? (isAdded ? (script.added ?? []) : (script.edited ?? []));
			if (script.honourIds && script.raw === undefined) {
				const asked = employeeIdsOf({ method: 'GET', path: url.pathname, search: url.search, params });
				body = (body as unknown[]).filter((row) => asked.includes((row as { employeeId: string }).employeeId));
			}
			return route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
		}
	);
	return calls;
}

/** `GET /api/timesheet/time-log/history`, answered page by page in the order the page asks. */
async function serveHistory(
	page: Page,
	script: { pages?: Array<{ items: unknown[]; total: number }>; refusal?: number; raw?: unknown }
): Promise<ServedCall[]> {
	const calls: ServedCall[] = [];
	let index = 0;
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === HISTORY_PATH,
		(route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			const params = paramsOf(url);
			calls.push({ method: request.method(), path: url.pathname, search: url.search, params });
			const headers = { ...CORS_HEADERS, 'content-type': 'application/json' };
			if (script.refusal) {
				return route.fulfill({
					status: script.refusal,
					headers,
					body: JSON.stringify({ statusCode: script.refusal, message: 'this file refused the read' })
				});
			}
			const answer = script.raw ?? script.pages?.[index] ?? { items: [], total: 0 };
			index += 1;
			return route.fulfill({ status: 200, headers, body: JSON.stringify(answer) });
		}
	);
	return calls;
}

/** `GET /api/timesheet/time-log/report/daily` — the read behind the rail's tracked figure. */
async function serveDailyReport(page: Page, body: unknown): Promise<ServedCall[]> {
	const calls: ServedCall[] = [];
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === DAILY_PATH,
		(route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({ method: request.method(), path: url.pathname, search: url.search, params: paramsOf(url) });
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
		}
	);
	return calls;
}

/** `GET /api/timesheet/time-log/<id>/history`, the read one entry's History panel makes. */
async function serveEntryHistory(page: Page, entryId: string, items: unknown[]): Promise<ServedCall[]> {
	const path = `${LOGS_PATH}/${entryId}/history`;
	const calls: ServedCall[] = [];
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === path,
		(route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({ method: request.method(), path: url.pathname, search: url.search, params: paramsOf(url) });
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(items)
			});
		}
	);
	return calls;
}

/** Records what the browser really sent for the timesheet reads, and from which origin. Nothing is answered here. */
function recordTimesheetReads(page: Page) {
	const calls: Array<{ method: string; origin: string; path: string; search: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN && url.pathname.startsWith('/api/timesheet')) {
			calls.push({ method: request.method(), origin: url.origin, path: url.pathname, search: url.search });
		}
	});
	return calls;
}

/* ------------------------------------------------------------------ the served story

Three manual logs and one edited log for two members, the daily report that makes their share readable, and three
history rows: a create, an update that kept its before/after, and a delete of a log on a project the reader may not
see. Offsets are from the run's day; the week period always holds all four days. */

const addedLogs = (fixture: Fixture) => [
	servedLog({
		id: 'suite-added-1',
		employeeId: fixture.ids.employee,
		startedAt: isoOf(at(-1, 9, 0)),
		stoppedAt: isoOf(at(-1, 11, 0)),
		duration: 7200,
		logType: 'MANUAL',
		isBillable: true,
		reason: 'Forgot the timer',
		taskId: fixture.ids.task,
		task: { id: fixture.ids.task, title: fixture.names.task },
		projectId: fixture.ids.project,
		project: { id: fixture.ids.project, name: 'Fixture Project', color: '#22c55e' },
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	}),
	servedLog({
		id: 'suite-added-2',
		employeeId: fixture.ids.teammateEmployee,
		startedAt: isoOf(at(0, 8, 30)),
		stoppedAt: isoOf(at(0, 9, 30)),
		duration: 3600,
		logType: 'MANUAL',
		isBillable: false,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	}),
	servedLog({
		id: 'suite-added-3',
		employeeId: fixture.ids.employee,
		startedAt: isoOf(at(-3, 9, 0)),
		stoppedAt: isoOf(at(-3, 9, 30)),
		duration: 1800,
		logType: 'MANUAL',
		isBillable: true,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	})
];

/** The added answer's `suite-added-1` appears again here: one entry, marked added *and* edited (finding 2). */
const editedLogs = (fixture: Fixture) => [
	servedLog({
		id: 'suite-edited-1',
		employeeId: fixture.ids.teammateEmployee,
		startedAt: isoOf(at(-2, 14, 0)),
		stoppedAt: isoOf(at(-2, 16, 30)),
		duration: 9000,
		logType: 'TRACKED',
		isBillable: true,
		editedAt: isoOf(at(-1, 10, 12)),
		taskId: 'suite-task-2',
		task: { id: 'suite-task-2', title: 'Suite edited task' },
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	}),
	servedLog({
		id: 'suite-added-1',
		employeeId: fixture.ids.employee,
		startedAt: isoOf(at(-1, 9, 0)),
		stoppedAt: isoOf(at(-1, 11, 0)),
		duration: 7200,
		logType: 'MANUAL',
		isBillable: true,
		reason: 'Forgot the timer',
		editedAt: null,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	})
];

const dailyAnswer = (fixture: Fixture) => [
	{
		date: localDayKeyOf(localDay(-1)),
		logs: [
			{
				project: { id: fixture.ids.project, name: 'Fixture Project', color: '#22c55e' },
				employeeLogs: [
					{
						employee: { id: fixture.ids.employee, user: { name: fixture.names.user } },
						sum: 18000,
						trackedSum: 18000,
						activity: 100,
						tasks: []
					}
				]
			}
		]
	}
];

/** 500 rows whose `entityId` names no log the changed reads returned — the filler of the paged history read. */
const fillerRows = (count: number) =>
	Array.from({ length: count }, (_unused, index) => ({
		id: `suite-filler-${index}`,
		entityId: `suite-unknown-${index}`,
		action: 'Created',
		createdAt: isoOf(at(-1, 6, 0)),
		updatedFields: [],
		previousValues: [],
		updatedValues: [],
		previousEntities: [],
		updatedEntities: [],
		data: {},
		employeeId: null,
		createdByUserId: null
	}));

const historyRows = (fixture: Fixture) => [
	{
		id: 'suite-row-created',
		entityId: 'suite-added-1',
		action: 'Created',
		createdAt: isoOf(at(-1, 12, 0)),
		updatedFields: [],
		previousValues: [],
		updatedValues: [],
		previousEntities: [],
		updatedEntities: [],
		data: { employeeId: fixture.ids.employee },
		employeeId: fixture.ids.employee,
		createdByUserId: fixture.ids.user
	},
	{
		id: 'suite-row-updated',
		entityId: 'suite-added-1',
		action: 'Updated',
		createdAt: isoOf(EDITED_INSTANT),
		updatedFields: ['stoppedAt', 'duration'],
		previousValues: [{ stoppedAt: isoOf(at(-1, 10, 0)) }, { duration: 3600 }],
		updatedValues: [{ stoppedAt: isoOf(at(-1, 11, 0)) }, { duration: 7200 }],
		previousEntities: [],
		updatedEntities: [],
		data: { employeeId: fixture.ids.employee, reason: 'Corrected the end' },
		employeeId: fixture.ids.employee,
		createdByUserId: fixture.ids.user
	},
	{
		id: 'suite-row-deleted',
		entityId: 'suite-gone',
		action: 'Deleted',
		createdAt: isoOf(DELETED_INSTANT),
		updatedFields: ['startedAt', 'stoppedAt', 'employeeId', 'projectId', 'taskId', 'isBillable'],
		previousValues: [
			{ startedAt: isoOf(at(-2, 9, 0)) },
			{ stoppedAt: isoOf(at(-2, 10, 30)) },
			{ employeeId: fixture.ids.employee },
			{ projectId: 'suite-hidden-project' },
			{ taskId: 'suite-task-3' },
			{ isBillable: true }
		],
		updatedValues: [],
		previousEntities: [
			{ projectId: { id: 'suite-hidden-project', projectHidden: true } },
			{ taskId: { id: 'suite-task-3', name: 'Suite deleted task' } }
		],
		updatedEntities: [],
		data: { employeeId: fixture.ids.employee, reason: 'Logged twice' },
		employeeId: fixture.ids.employee,
		createdByUserId: fixture.ids.user
	}
];

const hiddenProjectLogs = (fixture: Fixture) => [
	servedLog({
		id: 'suite-hidden-1',
		employeeId: fixture.ids.employee,
		startedAt: isoOf(at(-1, 9, 0)),
		stoppedAt: isoOf(at(-1, 10, 30)),
		duration: 5400,
		logType: 'MANUAL',
		isBillable: true,
		projectId: 'suite-hidden-project',
		project: { id: 'suite-hidden-project', projectHidden: true },
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	}),
	servedLog({
		id: 'suite-hidden-2',
		employeeId: fixture.ids.employee,
		startedAt: isoOf(at(-1, 11, 0)),
		stoppedAt: isoOf(at(-1, 11, 30)),
		duration: 1800,
		logType: 'MANUAL',
		isBillable: true,
		projectId: 'suite-hidden-project-2',
		project: { id: 'suite-hidden-project-2', projectHidden: true },
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	}),
	servedLog({
		id: 'suite-open-1',
		employeeId: fixture.ids.teammateEmployee,
		startedAt: isoOf(at(-1, 13, 0)),
		stoppedAt: isoOf(at(-1, 14, 0)),
		duration: 3600,
		logType: 'MANUAL',
		isBillable: true,
		projectId: fixture.ids.project,
		project: { id: fixture.ids.project, name: 'Fixture Project', color: '#22c55e' },
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	})
];

/**
 * The four entries `addedLogs` + `editedLogs` become, flattened to the text the page prints for each. The edited
 * entry's tail is a relative time the run hour decides (`manual-time-edit-entry.tsx:410-418`), so only its fixed
 * prefix is returned here and the tail is matched with `RELATIVE_TAIL`.
 */
const storyTextsOf = (fixture: Fixture) => {
	const billableMark = `·${M.BILLABLE}`;
	return {
		first: `${sentenceOf(M.FEED_ADDED_NO_TASK, { name: fixture.names.teammate, duration: durationOf(3600) }, fixture.names.teammate)}${SHEET.NO_PROJECT}${timeRangeOf(at(0, 8, 30), at(0, 9, 30))}`,
		second: `${sentenceOf(M.FEED_ADDED, { name: fixture.names.user, duration: durationOf(7200), task: fixture.names.task }, fixture.names.user)}Fixture Project${timeRangeOf(at(-1, 9), at(-1, 11))}${billableMark}Forgot the timer`,
		editedBase: `${sentenceOf(M.FEED_EDITED, { name: fixture.names.teammate, duration: durationOf(9000), task: 'Suite edited task' }, fixture.names.teammate)}${SHEET.NO_PROJECT}${timeRangeOf(at(-2, 14), at(-2, 16, 30))}${billableMark}Edited ${editedAtOf(at(-1, 10, 12))} · `,
		fourth: `${sentenceOf(M.FEED_ADDED_NO_TASK, { name: fixture.names.user, duration: durationOf(1800) }, fixture.names.user)}${SHEET.NO_PROJECT}${timeRangeOf(at(-3, 9), at(-3, 9, 30))}${billableMark}`
	};
};

/* ------------------------------------------------------------------ the page under the locators */

const pageHeading = (page: Page) => page.locator('h1');
const pageMeta = (page: Page) => page.locator('h1 + span');
const breadcrumbNav = (page: Page) => page.locator('nav[aria-label="breadcrumb"]');
const exportButton = (page: Page) => page.getByRole('button', { name: C.EXPORT, exact: true });
const feedRegion = (page: Page) => page.getByRole('region', { name: M.FEED_LABEL, exact: true });
const railRegion = (page: Page) => page.getByRole('complementary', { name: M.RAIL_LABEL, exact: true });
const feedGroups = (page: Page) => feedRegion(page).locator('section');
const feedEntries = (page: Page) => feedRegion(page).locator('li');
/** Exact: `common.FILTER` is a substring of `common.CLEAR_FILTERS`; the count chip only appears while a filter is applied. */
/** Not exact: the Filter trigger's name grows with the number of applied values (`Filter1`, `probe-3e.log` R2), so an exact name stops matching after the first pick. */
const filterButton = (page: Page) => page.getByRole('button', { name: new RegExp(`^${C.FILTER}`) });
const periodGroup = (page: Page) => page.getByRole('group', { name: PERIOD.LABEL, exact: true });
const popover = (page: Page) => page.locator('[data-slot=popover-content]');
/** The Period group's middle button is the picker trigger (`probe-2.log`: Previous, the active preset, Next). */
const periodTrigger = (page: Page) => periodGroup(page).getByRole('button').nth(1);
/** The preset rows of the open popover: the buttons of its first column, each carrying a `span` with its label. */
const presetRows = (page: Page) => popover(page).locator('div').first().getByRole('button');
/** Steps the page onto a named preset (`PRESET_LABELS`); the read it sends then names that preset's own range. */
const openPreset = async (page: Page, label: string) => {
	await periodTrigger(page).click();
	await presetRows(page).filter({ hasText: label }).first().click();
};
const errorNotice = (page: Page) => page.locator('output').filter({ hasText: STATES.ERROR_TITLE });
const groupingTab = (page: Page, label: string) => page.getByRole('tab', { name: label, exact: true });
/**
 * Every action tab's accessible name carries its figure (`All4`, `Added3`), so a bare label is never an exact name;
 * and `Added` is a substring of nothing else in the `Change shown` tablist.
 */
const actionTab = (page: Page, label: string) => page.getByRole('tab').filter({ hasText: new RegExp(`^${label}`) });
/** Not exact: `FilterOptionRow` puts the member's avatar initials before the name (`tasks/property-filter-menu.tsx:218-219`). */
const memberOption = (page: Page, name: string) => page.getByRole('menuitemcheckbox', { name });
const filterChip = (page: Page, value: string) =>
	page.getByRole('button', { name: copy(SHEET.REMOVE_FILTER, { value }), exact: true });

/* `textContent`, flattened exactly as the probes measured it. The flattening happens **inside the browser**: a
   callback handed to `evaluate` is serialised and run on the page, so it cannot see `flat` or anything else defined
   in this file (`s3-lane-b-manualedits-probe-1.log`: `locator.evaluate: ReferenceError: flat is not defined`). */
const textOf = async (locator: Locator) => flat(await locator.evaluate((node) => node.textContent ?? ''));
const allTextsOf = async (locator: Locator) =>
	locator.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
/** Takes the *entry* locators themselves (`feedEntries(page)`): an entry `<li>` holds no `<li>`, so searching one down for `li` finds nothing. */
const entriesOf = async (entries: Locator) => allTextsOf(entries);
/** A group's header line: its title and `GroupTotals` (`manual-time-edits-feed.tsx:61-74`), nothing of its entries. */
const groupHeadersOf = async (locator: Locator) =>
	locator
		.locator('h3')
		.evaluateAll((nodes) =>
			nodes.map((node) => (node.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim())
		);
const groupTitlesOf = async (locator: Locator) => allTextsOf(locator.locator('h3'));
const ariaLabelsOf = async (locator: Locator, selector: string) =>
	locator.locator(selector).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
const buttonsOf = async (locator: Locator) =>
	locator
		.locator('button')
		.evaluateAll((nodes) =>
			nodes.map((node) =>
				`${node.textContent ?? ''}|${node.getAttribute('aria-label') ?? ''}|${node.getAttribute('aria-expanded') ?? ''}`
					.replace(/\s+/g, ' ')
					.trim()
			)
		);
/**
 * A button's name, whichever way the app gives it one: the period group's two step buttons are icon buttons named by
 * `aria-label`, while the preset trigger is named by its text (`probe-2.log` Q5 groupButtons — the flattened
 * `textContent` of the two step buttons is empty, `probe-2.log` Q5 trigger).
 */
const namedButtonsOf = (locator: Locator) =>
	locator
		.locator('button')
		.evaluateAll((nodes) =>
			nodes.map((node) => (node.getAttribute('aria-label') ?? node.textContent ?? '').replace(/\s+/g, ' ').trim())
		);
const railFiguresOf = async (page: Page) =>
	railRegion(page).evaluate((node) => ({
		dt: Array.from(node.querySelectorAll('dt')).map((item) => (item.textContent ?? '').trim()),
		dd: Array.from(node.querySelectorAll('dd')).map((item) => (item.textContent ?? '').trim())
	}));
/** The rail's block titles are `h2` inside each block's `section`: the share block (`manual-time-edits-summary-rail.tsx:121`) and the two ranked blocks (`:236`), which only render while `figures.entryCount > 0` (`:258-280`). */
const railTitlesOf = async (page: Page) => allTextsOf(railRegion(page).locator('h2'));
const tabsOf = async (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[role=tablist][aria-label]')).map((list) => ({
			aria: list.getAttribute('aria-label'),
			tabs: Array.from(list.querySelectorAll('[role=tab]')).map(
				(tab) => `${(tab.textContent ?? '').replace(/\s+/g, ' ').trim()}|${tab.getAttribute('aria-selected')}`
			)
		}))
	);
const tableRolesOf = async (page: Page) =>
	page.evaluate(() => ({
		table: document.querySelectorAll('[role=table]').length,
		row: document.querySelectorAll('[role=row]').length,
		columnheader: document.querySelectorAll('[role=columnheader]').length,
		article: document.querySelectorAll('article').length,
		chart: document.querySelectorAll('canvas').length
	}));
const chipsOf = async (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('button[aria-label^="Remove "]')).map((button) =>
			button.getAttribute('aria-label')
		)
	);
/** The shell's own time-zone notice sits in an `output` too (`manual-time-edits-page.tsx` renders no notice of its own). */
const noticesOf = async (page: Page) =>
	page
		.locator('output')
		.evaluateAll((nodes) =>
			nodes
				.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
				.filter((line) => !line.includes('profile uses UTC'))
		);

/** Waits for the feed to hold this many entries; every feed read below is preceded by it. */
const expectEntries = async (page: Page, count: number, message: string) => {
	await expect(feedEntries(page), message).toHaveCount(count, { timeout: 20_000 });
};
/** Opens the Filter menu, waits for its categories, then opens one category and waits for its options. */
const openFilterCategory = async (page: Page, category: string) => {
	await filterButton(page).click();
	await expect
		.poll(() => page.locator('[role=menuitem]:visible').count(), { timeout: 15_000 })
		.toBeGreaterThanOrEqual(3);
	await page.getByRole('menuitem', { name: category, exact: true }).click();
	await expect
		.poll(() => page.locator('[role=menuitemcheckbox]:visible').count(), { timeout: 15_000 })
		.toBeGreaterThanOrEqual(1);
};
/**
 * Two Escapes close this menu — the submenu first, then the menu itself. A menu left open covers the page, so every
 * later `click()` would wait for actionability until the test times out (`probe-3c` / `probe-3d` of the measurement
 * runs, which is also why the closed state is *awaited* on the visible `role=menu` node rather than on the item count:
 * a closed menu leaves its items in the DOM).
 */
const closeFilterMenu = async (page: Page) => {
	await page.keyboard.press('Escape');
	await page.keyboard.press('Escape');
	await expect.poll(() => page.locator('[role=menu]:visible').count(), { timeout: 15_000 }).toBe(0);
};

/* ------------------------------------------------------------------ the console, excused only by name */

/** React's dev-mode store warning, not this page's (`suites/lane-a/api-tokens-settings-ui.spec.ts:405-430`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The client's own line for a refused read this file armed: it names the path *without* `/api` and puts the query
 * between the path and the status (`probe-2.log` Q4 console / Q8a console), hence the optional `?<query>` before the
 * armed status. Only the status armed here is excused; nothing else on that path is.
 */
const armedFailurePattern = (loggedPath: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${loggedPath}(\?\S*)? ${status} `);
/** A test that arms no refusal excuses nothing but React's own dev-mode warning. */
const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));
/** The same, with exactly the armed refusal on exactly this path excused. */
const consoleFindingsWithArmed = (shield: Shield, loggedPath: string, status: number) => {
	const pattern = armedFailurePattern(loggedPath, status);
	return consoleFindings(shield).filter((line) => !pattern.test(line));
};
const armedFailureLines = (shield: Shield, loggedPath: string, status: number) => {
	const pattern = armedFailurePattern(loggedPath, status);
	return shield.consoleErrors().filter((line) => pattern.test(line));
};

test.describe('lane-b · Reports › Manual time edits: what a manager sees, and what the browser asks for', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------------------------------------------- 1. the lane exactly as it is: the mock answers its own reads

	test('1 · the mock answers its own time-log, daily-report and history handlers: the empty page, both regions, no table', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const reads = recordTimesheetReads(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(pageHeading(page), 'the page rendered no title').toBeVisible({ timeout: 30_000 });
		await expect(pageHeading(page), 'the title is rendered twice').toHaveCount(1);
		expect(await textOf(pageHeading(page)), 'the title is not dashboard.manualTimeEdits.TITLE').toBe(M.TITLE);

		const period = weekPeriod();
		const meta = `${periodTextOf(period.from, period.to)} · ${copy(LIMITS.MEMBERS_COUNT, { count: 3 })}`;
		await expect.poll(() => textOf(pageMeta(page)), { timeout: 20_000 }).toEqual(meta);

		await expect(
			breadcrumbNav(page).getByRole('link', { name: C.REPORTS, exact: true }),
			'the Reports crumb is not a link to /'
		).toHaveAttribute('href', '/');
		await expect(
			breadcrumbNav(page).getByRole('link', { name: M.TITLE, exact: true }),
			'the page crumb is not a link to the page'
		).toHaveAttribute('href', PAGE_PATH);

		await expect(feedRegion(page), 'the feed region is missing').toBeVisible();
		await expect(railRegion(page), 'the summary rail is missing').toBeVisible();
		await expect(feedGroups(page), 'an empty feed rendered a group').toHaveCount(0);
		await expectEntries(page, 0, 'an empty feed rendered an entry');

		// the feed's empty state (`ManualTimeEditsEmpty`, manual-time-edits-table.tsx:459-504)
		const emptyRange = copy(M.EMPTY_RANGE, { from: shortDayOf(period.from), to: shortDayOf(period.to) });
		await expect(
			feedRegion(page).getByText(emptyRange, { exact: true }),
			'the empty state does not name the period it looked in'
		).toBeVisible();
		await expect(
			feedRegion(page).getByText(M.EMPTY_MESSAGE, { exact: true }),
			'the empty state has no message'
		).toBeVisible();
		await expect(
			feedRegion(page).getByRole('button', { name: M.ADD_MANUAL_TIME, exact: true }),
			'the empty state offers no way to add the time it is missing'
		).toBeVisible();
		await expect(
			feedRegion(page).getByRole('button', { name: PERIOD.PREVIOUS, exact: true }),
			'the empty state offers no other period'
		).toBeVisible();

		await expect(exportButton(page), 'Export is offered although the page has no entry').toBeDisabled();
		// the action tabs print their figure as a plain number (`EditsActionControl` hands `count` to the `SegmentedControl`, manual-time-edits-toolbar.tsx:244-271), unlike the group headers, which use the ENTRIES_COUNT copy
		expect(
			await tabsOf(page),
			'the two tablists and their zero figures are not what the empty page renders'
		).toEqual([
			{ aria: M.GROUPING_LABEL, tabs: [`${M.GROUPING_DAY}|true`, `${M.GROUPING_MEMBER}|false`] },
			{
				aria: M.ACTION_LABEL,
				tabs: [`${M.ACTION_ALL}0|true`, `${M.ADDED}0|false`, `${M.EDITED}0|false`]
			}
		]);

		// the rail: the four figures, with '–' where a number cannot be
		expect(await railFiguresOf(page), 'the rail figures are not what an empty period prints').toEqual({
			dt: [M.LEGEND_MANUAL, M.LEGEND_TRACKED, M.FIGURE_ADDED, M.FIGURE_EDITED],
			dd: [
				durationOf(0),
				MISSING_VALUE,
				copy(M.ENTRIES_COUNT, { count: 0 }),
				durationOf(0),
				copy(M.ENTRIES_COUNT, { count: 0 }),
				durationOf(0)
			]
		});
		await expect(
			railRegion(page).getByText(M.SHARE_NO_TRACKED_TIME, { exact: true }),
			'the rail does not say why the tracked figure is a dash'
		).toBeVisible();
		await expect(railRegion(page).locator('li'), 'the rail ranked rows although nothing was added').toHaveCount(0);
		// the ranked blocks are rendered only while the period has an entry (`manual-time-edits-summary-rail.tsx:258-280`)
		expect(await railTitlesOf(page), 'the empty rail shows a ranked block it has no entry to rank').toEqual([
			M.FIGURE_SHARE
		]);

		// finding 1: this page renders no table at all
		expect(await tableRolesOf(page), 'a role=table/row/columnheader appeared on this page').toEqual({
			table: 0,
			row: 0,
			columnheader: 0,
			article: 0,
			chart: 0
		});

		// the mock answered its own handlers, on the mock origin
		await expect.poll(() => reads.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(4);
		const reportReads = reads
			.filter((call) => [LOGS_PATH, HISTORY_PATH, DAILY_PATH].includes(call.path))
			.map((call) => `${call.method} ${call.origin}${call.path}`);
		// both kinds first, then the history, then the daily report — the order `sort()` gives these three paths
		expect(reportReads.sort(), 'the page did not read the two kinds, the daily report and the history').toEqual([
			`GET ${MOCK_API_ORIGIN}${LOGS_PATH}`,
			`GET ${MOCK_API_ORIGIN}${LOGS_PATH}`,
			`GET ${MOCK_API_ORIGIN}${HISTORY_PATH}`,
			`GET ${MOCK_API_ORIGIN}${DAILY_PATH}`
		]);
		const answered = (await mock.calls('/api/timesheet/time-log')).filter((call) =>
			[LOGS_PATH, HISTORY_PATH, DAILY_PATH].includes(call.path)
		);
		expect(
			answered
				.map((call) => [call.method, call.path, call.status])
				.sort((first, second) => `${first[1]}`.localeCompare(`${second[1]}`)),
			'the mock did not answer its own handlers for all four reads'
		).toEqual([
			['GET', LOGS_PATH, 200],
			['GET', LOGS_PATH, 200],
			['GET', HISTORY_PATH, 200],
			['GET', DAILY_PATH, 200]
		]);

		report('lane-as-it-is', {
			lang: await page.evaluate(() => document.documentElement.lang),
			heading: await textOf(pageHeading(page)),
			meta: await textOf(pageMeta(page)),
			breadcrumb: await textOf(breadcrumbNav(page)),
			breadcrumbHrefs: await breadcrumbNav(page)
				.locator('a')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
			sections: await ariaLabelsOf(page.locator('body'), 'section[aria-label], aside[aria-label]'),
			emptyParagraphs: await allTextsOf(feedRegion(page).locator('p')),
			rail: await textOf(railRegion(page)),
			railTitles: await railTitlesOf(page),
			tabs: await tabsOf(page),
			tableRoles: await tableRolesOf(page),
			exportDisabled: await exportButton(page).isDisabled(),
			notices: await noticesOf(page),
			reads: reads.map((call) => `${call.method} ${call.origin}${call.path}`)
		});
		expect(consoleFindings(shield), 'the empty page logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the empty page threw a page error').toEqual([]);
	});

	// ------------------------------------------------- 2. exactly what the browser asks for, and from where

	test('2 · the four reads: the fixture ids, the local week as ISO, the browser zone, the sorted members, the kinds, the paging', async ({
		page,
		fixture,
		mock
	}) => {
		const logs = await serveChangedLogs(page, { added: [], edited: [] });
		const daily = await serveDailyReport(page, []);
		const history = await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		const reads = recordTimesheetReads(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect.poll(() => logs.length, { timeout: 20_000 }).toBe(2);
		await expect.poll(() => daily.length, { timeout: 20_000 }).toBe(1);
		await expect.poll(() => history.length, { timeout: 20_000 }).toBe(1);

		const browserZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
		const period = weekPeriod();
		const ids = memberIdsOf(fixture);
		expect(ids, 'the members the page asked for are not the fixture team, sorted').toEqual(
			[fixture.ids.employee, fixture.ids.teammateEmployee, fixture.ids.deniedEmployee].sort()
		);

		/** `trackedRequestOf` (`use-manual-time-edits-report.ts:111-126`) + `changeFilterOf` (`time-log-report.service.ts:79-84`). */
		const expectedLogsParams = (kind: Record<string, string>) => ({
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA,
			startDate: isoOf(period.from),
			endDate: isoOf(period.to),
			timeZone: browserZone,
			'employeeIds[0]': ids[0],
			'employeeIds[1]': ids[1],
			'employeeIds[2]': ids[2],
			...kind,
			'relations[0]': 'project',
			'relations[1]': 'task',
			'relations[2]': 'organizationContact',
			'relations[3]': 'employee.user',
			'relations[4]': 'task.taskStatus',
			'relations[5]': 'timesheet'
		});
		const addedCall = logs.find((call) => call.params['logType[0]'] === 'MANUAL');
		const editedCall = logs.find((call) => call.params['isEdited'] === 'true');
		expect(addedCall?.params, 'the added read is not the read the service builds').toEqual(
			expectedLogsParams({ 'logType[0]': 'MANUAL' })
		);
		expect(editedCall?.params, 'the edited read is not the read the service builds').toEqual(
			expectedLogsParams({ isEdited: 'true' })
		);

		expect(daily[0].params, 'the daily report read is not the read `trackedRequestOf` builds').toEqual({
			'activityLevel[start]': '0',
			'activityLevel[end]': '100',
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			startDate: isoOf(period.from),
			endDate: isoOf(period.to),
			timeZone: browserZone,
			groupBy: 'date',
			'employeeIds[0]': ids[0],
			'employeeIds[1]': ids[1],
			'employeeIds[2]': ids[2]
		});

		/** `historyRequestOf` `:163-172`: the range and the members, no zone, and the paging of `getPeriodHistory` `:55-86`. */
		expect(history[0].params, 'the history read is not the read the service builds').toEqual({
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA,
			startDate: isoOf(period.from),
			endDate: isoOf(period.to),
			'employeeIds[0]': ids[0],
			'employeeIds[1]': ids[1],
			'employeeIds[2]': ids[2],
			take: '500',
			skip: '1'
		});
		expect(
			history[0].params.timeZone,
			'the history read carries a time zone the service never sends'
		).toBeUndefined();

		// every read went to the mock origin, and none of these three paths ever reached the mock itself
		expect(
			reads
				.filter((call) => [LOGS_PATH, HISTORY_PATH, DAILY_PATH].includes(call.path))
				.map((call) => `${call.origin} ${call.path}`)
				.every((line) => line.startsWith(`${MOCK_API_ORIGIN} `)),
			'a report read did not go to the mock origin'
		).toBe(true);
		expect(await mock.calls('/api/timesheet/time-log'), 'a stubbed read fell through to the mock').toEqual([]);

		report('read-params', {
			browserZone,
			profileZone: 'UTC',
			period: { from: isoOf(period.from), to: isoOf(period.to) },
			logs: logs.map((call) => call.params),
			daily: daily[0].params,
			history: history.map((call) => call.params),
			mockTimesheetPaths: (await mock.paths()).filter((path: string) => path.startsWith('/api/timesheet'))
		});
	});

	// --------------------------------------- 3. served manual and edited logs for two members: the feed and the rail

	test('3 · one entry per edit: the day groups newest first, what every entry prints, the lead sentence and the rail exactly as measured', async ({
		page,
		fixture
	}) => {
		await serveChangedLogs(page, { added: addedLogs(fixture), edited: editedLogs(fixture) });
		await serveDailyReport(page, dailyAnswer(fixture));
		await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectEntries(page, 4, 'the four served logs did not become four entries');

		const days = [localDay(0), localDay(-1), localDay(-2), localDay(-3)];
		const titles = days.map(dayNameOf);
		expect(await groupTitlesOf(feedGroups(page)), 'the day groups are not newest first').toEqual(titles);
		const seconds = [3600, 7200, 9000, 1800];
		expect(
			await groupHeadersOf(feedGroups(page)),
			'a group header does not read its title then its entry count and its seconds'
		).toEqual(
			days.map(
				(day, index) => `${titles[index]}${copy(M.ENTRIES_COUNT, { count: 1 })}·${durationOf(seconds[index])}`
			)
		);

		const story = storyTextsOf(fixture);
		const manager = fixture.names.user;
		const teammate = fixture.names.teammate;
		const entries = await entriesOf(feedEntries(page));
		expect(entries[0], 'the entry of today is not what the page printed').toBe(story.first);
		expect(entries[1], 'the entry of yesterday is not what the page printed').toBe(story.second);
		expect(entries[3], 'the entry three days back is not what the page printed').toBe(story.fourth);
		expect(
			entries[2],
			'the edited entry names the edit but its relative tail is the run hour, not a fixed word'
		).toMatch(new RegExp(`^${reEscape(story.editedBase)}${RELATIVE_TAIL}${reEscape(M.NOT_KEPT)}$`));
		report('edited-entry', entries[2]);

		// the glyph per entry, and the merged one (finding 2: one entry, marked both ways, its fields the added answer's)
		expect(
			await ariaLabelsOf(feedRegion(page), 'li [role=img]'),
			'the change glyph of an entry is not its change-kind label'
		).toEqual([M.ADDED, M.ADDED_AND_EDITED, M.EDITED, M.ADDED]);
		expect(
			await allTextsOf(feedRegion(page).locator('blockquote')),
			'the reason of the merged entry is not printed in a blockquote'
		).toEqual(['Forgot the timer']);
		expect(
			await buttonsOf(feedRegion(page).locator('li')),
			'an entry of a live log offers no menu, or a history it cannot have'
		).toEqual([
			`|${C.MORE_OPTIONS}|false`,
			`|${C.MORE_OPTIONS}|false`,
			`|${C.MORE_OPTIONS}|false`,
			`|${C.MORE_OPTIONS}|false`
		]);

		// the lead sentence: the share is ready because the daily report answered 5 h tracked
		expect(
			await textOf(feedRegion(page).locator('p').first()),
			'the lead sentence does not name the share, the entries and the members'
		).toBe(copy(richOf(M.LEAD_SHARE), { percent: '120%', entries: 4, members: 2 }));

		// finding 2: the merged log counts **once** in Manual (7200 + 3600 + 1800 + 9000 = 6h), although the same 2h 0m
		// appears in both the Added row (7200 + 3600 + 1800) and the Edited row (9000 + 7200) — `editsFiguresOf` `:341-372`
		expect(await railFiguresOf(page), 'the rail figures are not what this period prints').toEqual({
			dt: [M.LEGEND_MANUAL, M.LEGEND_TRACKED, M.FIGURE_ADDED, M.FIGURE_EDITED],
			dd: [
				durationOf(21600),
				durationOf(18000),
				copy(M.ENTRIES_COUNT, { count: 3 }),
				durationOf(12600),
				copy(M.ENTRIES_COUNT, { count: 2 }),
				durationOf(16200)
			]
		});
		const rankRowOf = (name: string, seconds: number, count: number) =>
			`${initialsOf(name)}${name}${durationOf(seconds)}${copy(M.ENTRIES_COUNT, { count })}`;
		expect(
			await allTextsOf(railRegion(page).locator('li')),
			'the ranked members and projects are not ranked by seconds'
		).toEqual([
			rankRowOf(teammate, 12600, 2),
			rankRowOf(manager, 9000, 2),
			`${SHEET.NO_PROJECT}${durationOf(14400)}${copy(M.ENTRIES_COUNT, { count: 3 })}`,
			`Fixture Project${durationOf(7200)}${copy(M.ENTRIES_COUNT, { count: 1 })}`
		]);
		expect(await railTitlesOf(page), 'the rail blocks are not the share block plus the two ranked blocks').toEqual([
			M.FIGURE_SHARE,
			M.RANK_MEMBERS_TITLE,
			SHEET.PROJECTS
		]);

		expect(await tabsOf(page), 'the action-tab figures do not count the whole period').toEqual([
			{ aria: M.GROUPING_LABEL, tabs: [`${M.GROUPING_DAY}|true`, `${M.GROUPING_MEMBER}|false`] },
			{
				aria: M.ACTION_LABEL,
				tabs: [`${M.ACTION_ALL}4|true`, `${M.ADDED}3|false`, `${M.EDITED}2|false`]
			}
		]);
		await expect(exportButton(page), 'Export is disabled although the page has entries').toBeEnabled();

		report('served-feed', {
			groups: await groupHeadersOf(feedGroups(page)),
			entries: await entriesOf(feedEntries(page)),
			glyphs: await ariaLabelsOf(feedRegion(page), 'li [role=img]'),
			rail: await textOf(railRegion(page)),
			railTitles: await railTitlesOf(page),
			tabs: await tabsOf(page)
		});
	});

	// ---------------------------------------------- 4. the paged history read, and what a deletion becomes

	test('4 · a history of 503 rows is read in two calls; the delete inside it becomes an entry, and that entry can be opened', async ({
		page,
		fixture
	}) => {
		const logs = await serveChangedLogs(page, { added: addedLogs(fixture), edited: editedLogs(fixture) });
		await serveDailyReport(page, dailyAnswer(fixture));
		const rows = historyRows(fixture);
		/* The opened week and `common.FILTER_LAST_7_DAYS` (today-6 … today) are the same period on a Sunday only: then
		   there is nothing to walk, no read for another period, and the 503-row pages answer the opened week itself.
		   On every other day the first answer is for the week the page opens on, which this test walks away from
		   before it pins anything (`openPreset` below), and the 503-row pages answer the period the test ends on. */
		const opened = weekPeriod();
		const period = lastSevenDaysPeriod();
		const walks = isoOf(opened.from) !== isoOf(period.from);
		const history = await serveHistory(page, {
			pages: [
				...(walks ? [{ items: [], total: 0 }] : []),
				{ items: [...fillerRows(500), rows[0], rows[1]], total: 503 },
				{ items: [rows[2]], total: 503 }
			]
		});
		const panel = await serveEntryHistory(page, 'suite-gone', [
			{
				id: 'suite-panel-row',
				entityId: 'suite-gone',
				action: 'Updated',
				createdAt: isoOf(EDITED_INSTANT),
				updatedFields: ['stoppedAt', 'duration', 'taskId'],
				previousValues: [{ stoppedAt: isoOf(at(-1, 10, 0)) }, { duration: 3600 }, { taskId: 'suite-old-task' }],
				updatedValues: [{ stoppedAt: isoOf(at(-1, 11, 0)) }, { duration: 7200 }, { taskId: fixture.ids.task }],
				previousEntities: [{ taskId: { id: 'suite-old-task', name: 'Suite old task' } }],
				updatedEntities: [{ taskId: { id: fixture.ids.task, name: fixture.names.task } }],
				data: { employeeId: fixture.ids.employee, reason: 'Corrected the end' },
				employeeId: fixture.ids.employee,
				createdByUserId: fixture.ids.user
			}
		]);
		await signInAndVisit(page, fixture, PAGE_PATH);
		/* The page opens on `common.THIS_WEEK`, and the served deletion is of a log whose own day is two days back
		   (`historyRows`). A deletion only becomes an entry when that day lies inside the shown period
		   (`deletedOfPeriod` → `isWithin(entry.startedAt, from, to)`, `use-time-log-period-history.ts:62-82`), and on a
		   Monday or a Tuesday the week the page opened on does not reach two days back — the entry would be missing.
		   The feed is therefore walked onto `common.FILTER_LAST_7_DAYS`, the window today-6 … today: every day this
		   test serves is inside it on every weekday, and every one of its days is past (on a Sunday it is the opened
		   week, `walks` above). */
		await expect
			.poll(() => history.some((call) => call.params.startDate === isoOf(opened.from)), { timeout: 20_000 })
			.toBe(true);
		if (walks) await openPreset(page, C.FILTER_LAST_7_DAYS);
		await expect.poll(() => lastOf(logs).params.startDate, { timeout: 20_000 }).toBe(isoOf(period.from));
		const periodHistory = () => history.filter((call) => call.params.startDate === isoOf(period.from));
		await expect.poll(() => periodHistory().length, { timeout: 20_000 }).toBe(2);
		await expectEntries(page, 5, 'the served logs and the served deletion did not become five entries');

		// finding 4: `PAGE_SIZE = 500` and `page` counting from 1 (`time-log-history.service.ts:23`, `:55-86`)
		expect(
			periodHistory().map((call) => [call.params.take, call.params.skip]),
			'two calls did not ask for page 1 and page 2 of 500 rows'
		).toEqual([
			['500', '1'],
			['500', '2']
		]);
		expect(
			periodHistory().map((call) => [call.params.startDate, call.params.endDate, employeeIdsOf(call).length]),
			'the second call changed the range or the members it asked for'
		).toEqual([
			[isoOf(period.from), isoOf(period.to), 3],
			[isoOf(period.from), isoOf(period.to), 3]
		]);

		const manager = fixture.names.user;
		const titles = [localDay(0), localDay(-1), localDay(-2), localDay(-3)].map(dayNameOf);
		expect(
			await groupTitlesOf(feedGroups(page)),
			'the day groups changed order once a deletion joined them'
		).toEqual(titles);
		// finding 3: the deleted entry counts as an entry and no time, so Monday's total is the edited entry's 2h 30m
		expect(await groupHeadersOf(feedGroups(page)), 'a group total counted the deleted entry seconds').toEqual([
			`${titles[0]}${copy(M.ENTRIES_COUNT, { count: 1 })}·${durationOf(3600)}`,
			`${titles[1]}${copy(M.ENTRIES_COUNT, { count: 1 })}·${durationOf(7200)}`,
			`${titles[2]}${copy(M.ENTRIES_COUNT, { count: 2 })}·${durationOf(9000)}`,
			`${titles[3]}${copy(M.ENTRIES_COUNT, { count: 1 })}·${durationOf(1800)}`
		]);

		const entries = await entriesOf(feedRegion(page).locator('li'));
		const deletedBase = `${sentenceOf(M.FEED_DELETED, { name: manager, duration: durationOf(5400), task: 'Suite deleted task' }, manager)}${C.PRIVATE_PROJECT}${timeRangeOf(at(-2, 9), at(-2, 10, 30))}·${M.BILLABLE}Logged twice${copy(M.DELETED_AT, { when: editedAtOf(DELETED_INSTANT) })} · `;
		const deletedIndex = entries.findIndex((line) => line.includes(M.DELETED));
		// the entry's own text ends at its `History` toggle: `ChangeLine` renders the toggle inside itself
		// (`manual-time-edit-entry.tsx:471-477` + `:326-352`), so the label is part of the `<li>`'s text
		expect(entries[deletedIndex], 'the deletion did not become an entry naming what was deleted and when').toMatch(
			new RegExp(`^${reEscape(deletedBase)}${RELATIVE_TAIL}${reEscape(M.SHOW_HISTORY)}$`)
		);
		report('deleted-entry', { index: deletedIndex, line: entries[deletedIndex] });
		expect(
			await ariaLabelsOf(feedRegion(page), 'li [role=img]'),
			'the deleted entry glyph is not dashboard.manualTimeEdits.DELETED'
		).toContain(M.DELETED);

		// the deleted entry alone gets a History toggle: `showsChangeLine = entry.isDeleted || Boolean(editedWhen)`
		// and the toggle is rendered only inside `ChangeLine` (`manual-time-edit-entry.tsx:471-477`)
		const historyToggles = feedRegion(page).getByRole('button', { name: M.SHOW_HISTORY, exact: true });
		await expect(
			historyToggles,
			'a History toggle appeared on an entry whose own log has no edit to read'
		).toHaveCount(1);
		expect(
			await buttonsOf(feedRegion(page).locator('li').nth(deletedIndex)),
			'the deleted entry offers an edit menu it cannot use'
		).toEqual([`${M.SHOW_HISTORY}||false`]);
		// finding 2: the log that both answers named is one entry, and its own change line is missing entirely —
		// `showsChangeLine = entry.isDeleted || Boolean(editedWhen)` and `editedWhen` reads the *added* answer's log
		const mergedLine = entries[1];
		expect(mergedLine.endsWith('Forgot the timer'), 'the merged entry does not end at its reason').toBe(true);
		expect(mergedLine.includes(M.NOT_KEPT), 'the merged entry was told its earlier values were not kept').toBe(
			false
		);
		expect(mergedLine.includes('→'), 'the merged entry printed a before/after change line').toBe(false);

		// opening it reads that entry's own history and prints every field the row says changed
		const panelId = await historyToggles.getAttribute('aria-controls');
		await historyToggles.click();
		await expect.poll(() => panel.length, { timeout: 20_000 }).toBe(1);
		expect(
			panel.map((call) => `${call.method} ${call.path}${call.search}`),
			'the entry panel did not read GET /timesheet/time-log/<id>/history'
		).toEqual([
			`GET ${LOGS_PATH}/suite-gone/history?tenantId=${fixture.ids.tenantA}&organizationId=${fixture.ids.organizationA}`
		]);
		const panelRegion = page.locator(`[id="${panelId}"]`);
		await expect(panelRegion, 'the history panel did not open').toBeVisible();
		// an open toggle is no longer named `History` (`manual-time-edit-entry.tsx:333-336`), so it is read where it stands
		const openToggle = feedRegion(page).locator('li').nth(deletedIndex).locator('button[aria-expanded]').last();
		const openToggleState = await openToggle.evaluate(
			(node) => `${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}|${node.getAttribute('aria-expanded')}`
		);
		expect(openToggleState, 'the open toggle is not Hide history with aria-expanded true').toBe(
			`${M.HIDE_HISTORY}|true`
		);
		expect(await textOf(panelRegion), 'the panel does not name who edited, when, the reason and each field').toBe(
			[
				copy(SHEET.HISTORY.EDITED_BY, { name: manager }),
				`·${copy(SHEET.HISTORY.WHEN, { date: shortDayOf(EDITED_INSTANT), time: clockOf(EDITED_INSTANT) })}`,
				`${copy(SHEET.CHANGE.REASON_PREFIX)} Corrected the end`,
				fieldLineOf(SHEET.COLUMNS.END, clockOf(at(-1, 10)), clockOf(at(-1, 11))),
				fieldLineOf(SHEET.COLUMNS.DURATION, durationOf(3600), durationOf(7200)),
				fieldLineOf(SHEET.COLUMNS.TASK, 'Suite old task', fixture.names.task)
			].join('')
		);
		// the panel is one `ChangeItem` `<li>` (`time-log-history.tsx:244-296`) holding a `<ul>` of `FieldLine` `<li>`s
		// (`:113-171`), so the outer item's own text is the first line and the three field lines follow it
		const panelLines = await allTextsOf(panelRegion.locator('li'));
		expect(panelLines[0], 'the panel is not one change item naming who, when, why and the fields').toBe(
			[
				copy(SHEET.HISTORY.EDITED_BY, { name: manager }),
				`·${copy(SHEET.HISTORY.WHEN, { date: shortDayOf(EDITED_INSTANT), time: clockOf(EDITED_INSTANT) })}`,
				`${copy(SHEET.CHANGE.REASON_PREFIX)} Corrected the end`,
				fieldLineOf(SHEET.COLUMNS.END, clockOf(at(-1, 10)), clockOf(at(-1, 11))),
				fieldLineOf(SHEET.COLUMNS.DURATION, durationOf(3600), durationOf(7200)),
				fieldLineOf(SHEET.COLUMNS.TASK, 'Suite old task', fixture.names.task)
			].join('')
		);
		expect(panelLines.slice(1), 'the panel field lines are not one per changed field, before then after').toEqual([
			`${SHEET.COLUMNS.END}${copy(SHEET.HISTORY.FIELD_CHANGED, { before: clockOf(at(-1, 10)), after: clockOf(at(-1, 11)) })}${clockOf(at(-1, 10))}→${clockOf(at(-1, 11))}`,
			`${SHEET.COLUMNS.DURATION}${copy(SHEET.HISTORY.FIELD_CHANGED, { before: durationOf(3600), after: durationOf(7200) })}${durationOf(3600)}→${durationOf(7200)}`,
			`${SHEET.COLUMNS.TASK}${copy(SHEET.HISTORY.FIELD_CHANGED, { before: 'Suite old task', after: fixture.names.task })}Suite old task→${fixture.names.task}`
		]);

		report('entry-panel', { openToggle: `${M.HIDE_HISTORY}|true`, panelLines });

		// the kinds the history makes filterable (`useEditsFilterCategories`, manual-time-edits-toolbar.tsx:142-150)
		await openFilterCategory(page, M.KIND_LABEL);
		expect(
			await allTextsOf(page.locator('[role=menuitemcheckbox]:visible')),
			'the kind options are not the four the filter menu lists'
		).toEqual([M.KIND_TIME, M.KIND_TASK_PROJECT, SHEET.BILLABLE, M.DELETED]);
		await closeFilterMenu(page);

		expect(await chipsOf(page), 'no filter was applied, yet a chip is on the page').toEqual([]);
	});

	// --------------------------------------------- 5. the two switches the page offers, and what each one prints

	test('5 · By day ↔ By member re-groups the same five lines, and All / Added / Edited narrow only the feed', async ({
		page,
		fixture
	}) => {
		await serveChangedLogs(page, { added: addedLogs(fixture), edited: editedLogs(fixture) });
		await serveDailyReport(page, dailyAnswer(fixture));
		await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectEntries(page, 4, 'the served logs did not become four entries');

		const manager = fixture.names.user;
		const teammate = fixture.names.teammate;
		await groupingTab(page, M.GROUPING_MEMBER).click();
		await expect(
			groupingTab(page, M.GROUPING_MEMBER),
			'By member did not become the selected grouping'
		).toHaveAttribute('aria-selected', 'true');
		await expect(groupingTab(page, M.GROUPING_DAY), 'By day is no longer offered').toHaveAttribute(
			'aria-selected',
			'false'
		);

		// `groupsByMemberOf` sorts its groups by member name and each group's entries newest day first (`:473-491`)
		expect(
			await allTextsOf(feedGroups(page).locator('h3')),
			'the member groups are not named by member, sorted by name'
		).toEqual([`${initialsOf(manager)}${manager}`, `${initialsOf(teammate)}${teammate}`]);
		expect(
			await groupHeadersOf(feedGroups(page)),
			'the member group totals are not its entry count and its seconds'
		).toEqual([
			`${initialsOf(manager)}${manager}${copy(M.ENTRIES_COUNT, { count: 2 })}·${durationOf(9000)}`,
			`${initialsOf(teammate)}${teammate}${copy(M.ENTRIES_COUNT, { count: 2 })}·${durationOf(12600)}`
		]);

		// under member grouping every entry names its own day (`EntryMeta`, manual-time-edit-entry.tsx:261-305)
		const withDay = (day: Date, rest: string) => `${dayNameOf(day)}·${rest}`;
		const memberFirst = `${sentenceOf(M.FEED_ADDED, { name: manager, duration: durationOf(7200), task: fixture.names.task }, manager)}Fixture Project${withDay(localDay(-1), `${timeRangeOf(at(-1, 9), at(-1, 11))}·${M.BILLABLE}Forgot the timer`)}`;
		const memberSecond = `${sentenceOf(M.FEED_ADDED_NO_TASK, { name: manager, duration: durationOf(1800) }, manager)}${SHEET.NO_PROJECT}${withDay(localDay(-3), `${timeRangeOf(at(-3, 9), at(-3, 9, 30))}·${M.BILLABLE}`)}`;
		const memberThird = `${sentenceOf(M.FEED_ADDED_NO_TASK, { name: teammate, duration: durationOf(3600) }, teammate)}${SHEET.NO_PROJECT}${withDay(localDay(0), timeRangeOf(at(0, 8, 30), at(0, 9, 30)))}`;
		const memberEditedBase = `${sentenceOf(M.FEED_EDITED, { name: teammate, duration: durationOf(9000), task: 'Suite edited task' }, teammate)}${SHEET.NO_PROJECT}${withDay(localDay(-2), `${timeRangeOf(at(-2, 14), at(-2, 16, 30))}·${M.BILLABLE}Edited ${editedAtOf(at(-1, 10, 12))} · `)}`;
		const memberEntries = await entriesOf(feedEntries(page));
		expect(memberEntries.slice(0, 2), 'the manager group did not hold its two entries newest day first').toEqual([
			memberFirst,
			memberSecond
		]);
		expect(memberEntries[2], 'the teammate group did not start with today').toBe(memberThird);
		expect(memberEntries[3], 'the edited entry lost its day name when the grouping changed').toMatch(
			new RegExp(`^${reEscape(memberEditedBase)}${RELATIVE_TAIL}${reEscape(M.NOT_KEPT)}$`)
		);

		// the same five lines in either grouping, and still no table anywhere
		await groupingTab(page, M.GROUPING_DAY).click();
		await expectEntries(page, 4, 'switching grouping lost or gained an entry');
		expect(await groupTitlesOf(feedGroups(page)), 'the day groups did not come back').toEqual(
			[localDay(0), localDay(-1), localDay(-2), localDay(-3)].map(dayNameOf)
		);
		expect(await tableRolesOf(page), 'a grouping switch rendered a table').toEqual({
			table: 0,
			row: 0,
			columnheader: 0,
			article: 0,
			chart: 0
		});

		// finding 10: the action tabs narrow the feed only
		const railBefore = await textOf(railRegion(page));
		const tabsBefore = await tabsOf(page);
		await actionTab(page, M.ADDED).click();
		await expectEntries(page, 3, 'Added did not narrow the feed to the three added entries');
		await actionTab(page, M.EDITED).click();
		await expectEntries(page, 2, 'Edited did not narrow the feed to the two edited entries');
		const editedShown = await entriesOf(feedEntries(page));
		expect(
			editedShown.some((line) => line.includes(`${initialsOf(manager)}${manager} added`)),
			'the entry that was added *and* edited does not appear under Edited'
		).toBe(true);
		expect(
			editedShown[0],
			'the entry that was added *and* edited still reads its added sentence under Edited (changeLabelKeyOf, manual-time-edit-entry.tsx:60-72)'
		).toContain(' added ');
		await actionTab(page, M.ACTION_ALL).click();
		await expectEntries(page, 4, 'All did not bring every entry back');
		expect(await textOf(railRegion(page)), 'the rail changed when only the feed was narrowed').toBe(railBefore);
		expect(await tabsOf(page), 'the tab figures are not the period figures, in the same order').toEqual(tabsBefore);
		report('action-tabs', { tabs: tabsBefore, railUnchanged: (await textOf(railRegion(page))) === railBefore });
	});

	// ------------------------------------------------ 6. a day with more entries than the feed shows at once

	test('6 · ten entries on one day: the feed shows eight, and the toggle hides the two it left out', async ({
		page,
		fixture
	}) => {
		const foldLogs = Array.from({ length: 10 }, (_unused, index) =>
			servedLog({
				id: `suite-fold-${index}`,
				employeeId: fixture.ids.employee,
				startedAt: isoOf(at(-1, 7 + index)),
				stoppedAt: isoOf(at(-1, 7 + index, 30)),
				duration: 1800,
				logType: 'MANUAL',
				isBillable: true,
				organizationId: fixture.ids.organizationA,
				tenantId: fixture.ids.tenantA
			})
		);
		await serveChangedLogs(page, { added: foldLogs, edited: [] });
		await serveDailyReport(page, []);
		await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectEntries(page, VISIBLE_ENTRIES, 'the feed did not stop at FEED_VISIBLE_ENTRIES entries');

		const moreName = copy(M.FEED_SHOW_MORE, { count: 10 - VISIBLE_ENTRIES });
		const more = feedRegion(page).getByRole('button', { name: moreName, exact: true });
		await expect(more, 'the fold offers no toggle naming how many entries it hid').toHaveCount(1);
		await expect(more, 'the fold toggle is not collapsed').toHaveAttribute('aria-expanded', 'false');
		expect(
			await groupHeadersOf(feedGroups(page)),
			'a folded group totals every entry it holds, not the ones it shows'
		).toEqual([`${dayNameOf(localDay(-1))}${copy(M.ENTRIES_COUNT, { count: 10 })}·${durationOf(18000)}`]);
		expect(await tabsOf(page), 'the tab figures count every entry of the period, not the eight on screen').toEqual([
			{ aria: M.GROUPING_LABEL, tabs: [`${M.GROUPING_DAY}|true`, `${M.GROUPING_MEMBER}|false`] },
			{
				aria: M.ACTION_LABEL,
				tabs: [`${M.ACTION_ALL}10|true`, `${M.ADDED}10|false`, `${M.EDITED}0|false`]
			}
		]);

		await more.click();
		await expectEntries(page, 10, 'Show 2 more did not show the two hidden entries');
		// the toggle's own name changes when it is expanded, so it is read where it stands, not by name: the last
		// `aria-expanded` button of the last group `<section>` (`manual-time-edits-feed.tsx:127-154`, inside `:210-233`)
		const toggleText = () =>
			feedGroups(page)
				.last()
				.locator('button[aria-expanded]')
				.last()
				.evaluate(
					(node) =>
						`${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}|${node.getAttribute('aria-expanded')}`
				);
		expect(await toggleText(), 'the expanded toggle is not Show fewer with aria-expanded true').toBe(
			`${M.FEED_SHOW_FEWER}|true`
		);
		await feedRegion(page).getByRole('button', { name: M.FEED_SHOW_FEWER, exact: true }).click();
		await expectEntries(page, VISIBLE_ENTRIES, 'Show fewer did not fold the group back');
		expect(await toggleText(), 'the folded toggle is not Show 2 more with aria-expanded false').toBe(
			`${moreName}|false`
		);
		report('feed-fold', { shown: 10, collapsedTo: VISIBLE_ENTRIES, toggle: await toggleText() });
	});

	// ------------------------------------------------------- 7. a project the API keeps from the reader

	test('7 · a hidden project: Private project in the entry, Private projects in the rail, and no filter option for it', async ({
		page,
		fixture
	}) => {
		const logs = await serveChangedLogs(page, { added: hiddenProjectLogs(fixture), edited: [] });
		await serveDailyReport(page, []);
		await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectEntries(page, 3, 'the three served logs did not become three entries');

		const manager = fixture.names.user;
		const teammate = fixture.names.teammate;
		const hiddenRow = (name: string, seconds: number, start: Date, end: Date) =>
			`${sentenceOf(M.FEED_ADDED_NO_TASK, { name, duration: durationOf(seconds) }, name)}${C.PRIVATE_PROJECT}${timeRangeOf(start, end)}·${M.BILLABLE}`;
		expect(
			await entriesOf(feedEntries(page)),
			'a log whose project the API keeps names Private project, not No project'
		).toEqual([
			hiddenRow(manager, 5400, at(-1, 9), at(-1, 10, 30)),
			hiddenRow(manager, 1800, at(-1, 11), at(-1, 11, 30)),
			`${sentenceOf(M.FEED_ADDED_NO_TASK, { name: teammate, duration: durationOf(3600) }, teammate)}Fixture Project${timeRangeOf(at(-1, 13), at(-1, 14))}·${M.BILLABLE}`
		]);
		expect(
			await allTextsOf(railRegion(page).locator('li')),
			'the rail ranks hidden projects together, under the plural Private projects'
		).toEqual([
			`${initialsOf(manager)}${manager}${durationOf(7200)}${copy(M.ENTRIES_COUNT, { count: 2 })}`,
			`${initialsOf(teammate)}${teammate}${durationOf(3600)}${copy(M.ENTRIES_COUNT, { count: 1 })}`,
			`${C.PRIVATE_PROJECTS}${durationOf(7200)}${copy(M.ENTRIES_COUNT, { count: 2 })}`,
			`Fixture Project${durationOf(3600)}${copy(M.ENTRIES_COUNT, { count: 1 })}`
		]);

		await openFilterCategory(page, SHEET.PROJECTS);
		expect(
			await allTextsOf(page.locator('[role=menuitemcheckbox]:visible')),
			'a project the reader may not see is offered as a filter option'
		).toEqual([SHEET.NO_PROJECT, 'Fixture Project']);
		await closeFilterMenu(page);

		await exportButton(page).click();
		const csvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: LIMITS.CSV, exact: true }).click();
		const csv = await csvEvent;
		const raw = readFileSync(await csv.path(), 'utf8');
		const lines = raw.slice(1).split('\r\n');
		expect(lines[0], 'the CSV header is not the column order the export builds').toBe(
			[
				SHEET.COLUMNS.DATE,
				C.MEMBER,
				SHEET.COLUMNS.PROJECT,
				SHEET.COLUMNS.TASK,
				SHEET.COLUMNS.START,
				SHEET.COLUMNS.END,
				SHEET.COLUMNS.DURATION,
				M.ADDED,
				M.COLUMN_EDITED_AT,
				M.COLUMN_BEFORE,
				M.COLUMN_AFTER,
				SHEET.COLUMNS.BILLABLE,
				SHEET.COLUMNS.STATUS,
				M.COLUMN_REASON
			].join(',')
		);
		expect(lines.slice(1), 'the CSV names a hidden project Private project, in the same order as the feed').toEqual(
			[
				`${localDayKeyOf(localDay(-1))},${manager},${C.PRIVATE_PROJECT},${SHEET.NO_TASK},09:00,10:30,${csvDurationOf(5400)},Yes,,,,Yes,,`,
				`${localDayKeyOf(localDay(-1))},${manager},${C.PRIVATE_PROJECT},${SHEET.NO_TASK},11:00,11:30,${csvDurationOf(1800)},Yes,,,,Yes,,`,
				`${localDayKeyOf(localDay(-1))},${teammate},Fixture Project,${SHEET.NO_TASK},13:00,14:00,${csvDurationOf(3600)},Yes,,,,Yes,,`
			]
		);
		report('hidden-project', { name: csv.suggestedFilename(), lines, entries: logs.length });
	});

	// ------------------------------------------------------------- 8. the period: steps, presets, a picked range

	test('8 · the period group: Previous and Next, the eight presets, a range picked from the calendar, and the one-day empty state', async ({
		page,
		fixture
	}) => {
		const logs = await serveChangedLogs(page, { added: [], edited: [] });
		await serveDailyReport(page, []);
		await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => logs.length, { timeout: 20_000 }).toBe(2);

		const week = weekPeriod();
		const group = periodGroup(page);
		const trigger = group.getByRole('button').nth(1);
		expect(await namedButtonsOf(group), 'the period group is Previous, the active preset, Next').toEqual([
			PERIOD.PREVIOUS,
			C.THIS_WEEK,
			PERIOD.NEXT
		]);

		/* A step back: a whole week, read again. `shiftPeriod` moves a week period with `addDays`
		   (`dashboard-period.ts:124-132`), which keeps the wall clock, so the week before this one is its Monday and
		   Sunday seven calendar days earlier — not their instants minus 7 × 24 h, which in a zone with a DST night
		   (Europe/Madrid changes on the last Sunday of March and of October) lands an hour off the midnight this read
		   asks for. */
		const previousWeek = { from: shiftDay(week.from, -7), to: shiftDay(week.to, -7) };
		await group.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }).click();
		await expect.poll(() => lastOf(logs).params.startDate, { timeout: 20_000 }).toBe(isoOf(previousWeek.from));
		expect(lastOf(logs).params.endDate, 'the stepped read did not shift its whole range').toBe(
			isoOf(previousWeek.to)
		);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(
				`${periodTextOf(previousWeek.from, previousWeek.to)} · ${copy(LIMITS.MEMBERS_COUNT, { count: 3 })}`
			);
		const readsAfterStepBack = logs.length;

		// finding 7: stepping back onto this week lands on the cached pair and asks for nothing
		await group.getByRole('button', { name: PERIOD.NEXT, exact: true }).click();
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${periodTextOf(week.from, week.to)} · ${copy(LIMITS.MEMBERS_COUNT, { count: 3 })}`);
		expect(
			[logs.length, lastOf(logs).params.startDate],
			'the step back onto this week re-read it instead of re-using the cached pair'
		).toEqual([readsAfterStepBack, isoOf(previousWeek.from)]);
		expect(await textOf(trigger), 'the trigger names a period instead of the active preset').toBe(C.THIS_WEEK);

		// the popover: the eight preset labels (their dates are not pinned here), and the calendar beside them
		await trigger.click();
		const presetColumn = popover(page).locator('div').first();
		const rows = presetColumn.getByRole('button');
		await expect(rows, 'the popover does not offer the eight presets').toHaveCount(PRESET_LABELS.length);
		expect(
			await rows.evaluateAll((nodes) =>
				nodes.map((node) => (node.querySelector('span')?.textContent ?? '').replace(/\s+/g, ' ').trim())
			),
			'the preset rows are not the eight labels the picker builds'
		).toEqual(PRESET_LABELS);
		expect(await textOf(rows.nth(2)), 'the active preset row is not marked as the selected one').toContain(
			C.SELECTED
		);
		report('popover', {
			rows: await allTextsOf(rows),
			calendarButtons: await popover(page)
				.locator('button[aria-label]')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))
		});

		/* A custom range, picked from the month the calendar opened on. `defaultMonth={value.from}`
		   (`kit/period-picker.tsx:156`) means that month is the one holding the period's *first* day — the Monday of the
		   week — which is why the anchor below is `week.from` and not today: on the 1st–6th of a month the week reaches
		   back into the previous month, and the calendar opens there. Days 10 and 14 exist in any month, so they are
		   never the outside-day cells (`showOutsideDays` only adds a previous month's tail and a next month's 1–6). */
		const rangeFrom = new Date(week.from.getFullYear(), week.from.getMonth(), 10, 0, 0, 0, 0);
		const rangeTo = new Date(week.from.getFullYear(), week.from.getMonth(), 14, 23, 59, 59, 999);
		const readsBeforeRange = logs.length;
		await popover(page).getByRole('gridcell', { name: '10', exact: true }).click();
		await popover(page).getByRole('gridcell', { name: '14', exact: true }).click();
		await expect.poll(() => logs.length, { timeout: 20_000 }).toBeGreaterThan(readsBeforeRange);
		// every read the picked range caused named the same boundaries (`probe-2.log` Q5 allReads printed 2 per range)
		const customReads = logs.slice(readsBeforeRange);
		expect(
			[...new Set(customReads.map((call) => `${call.params.startDate} → ${call.params.endDate}`))],
			'a read of the custom range named other boundaries than the cells that were clicked'
		).toEqual([`${isoOf(rangeFrom)} → ${isoOf(rangeTo)}`]);
		const rangeText = periodTextOf(rangeFrom, rangeTo);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(`${rangeText} · ${copy(LIMITS.MEMBERS_COUNT, { count: 3 })}`);
		await expect.poll(() => textOf(trigger), { timeout: 20_000 }).toEqual(rangeText);
		await expect(
			feedRegion(page).getByText(copy(M.EMPTY_RANGE, { from: shortDayOf(rangeFrom), to: shortDayOf(rangeTo) }), {
				exact: true
			}),
			'the empty state does not name the picked range'
		).toBeVisible();

		// a range of one day: the empty state names the day, not a span (`emptyTitleOf`, manual-time-edits-table.tsx:448-457)
		await trigger.click();
		const oneDay = new Date(week.from.getFullYear(), week.from.getMonth(), 10, 0, 0, 0, 0);
		await popover(page).getByRole('gridcell', { name: '10', exact: true }).click();
		await popover(page).getByRole('gridcell', { name: '10', exact: true }).click();
		await expect(
			feedRegion(page).getByText(copy(M.EMPTY_DAY, { day: shortDayOf(oneDay) }), { exact: true }),
			'a one-day period is titled as a range'
		).toBeVisible();
		await expect(feedRegion(page).getByText(M.EMPTY_MESSAGE, { exact: true })).toBeVisible();
		report('picked-range', {
			queries: logs.map((call) => `${call.params.startDate} → ${call.params.endDate}`),
			rangeText,
			oneDayText: copy(M.EMPTY_DAY, { day: shortDayOf(oneDay) })
		});
	});

	// ---------------------------------------------------------------- 9. the member filter, start to finish

	test('9 · the member filter: what the read changes, what narrows when a backend honours it, the chip, Clear, and a filter that matches nothing', async ({
		page,
		fixture
	}) => {
		const manager = fixture.ids.employee;
		const teammate = fixture.ids.teammateEmployee;
		const restricted = fixture.ids.deniedEmployee;
		const logs = await serveChangedLogs(page, {
			honourIds: true,
			added: [
				{
					id: 'suite-member-manager',
					employeeId: manager,
					startedAt: isoOf(at(-1, 9)),
					stoppedAt: isoOf(at(-1, 11)),
					duration: 7200,
					logType: 'MANUAL',
					isBillable: true,
					organizationId: fixture.ids.organizationA,
					tenantId: fixture.ids.tenantA
				},
				{
					id: 'suite-member-teammate',
					employeeId: teammate,
					startedAt: isoOf(at(-1, 14)),
					stoppedAt: isoOf(at(-1, 15)),
					duration: 3600,
					logType: 'MANUAL',
					isBillable: true,
					organizationId: fixture.ids.organizationA,
					tenantId: fixture.ids.tenantA
				},
				{
					id: 'suite-member-restricted',
					employeeId: restricted,
					startedAt: isoOf(at(-1, 16)),
					stoppedAt: isoOf(at(-1, 16, 30)),
					duration: 1800,
					logType: 'MANUAL',
					isBillable: true,
					organizationId: fixture.ids.organizationA,
					tenantId: fixture.ids.tenantA
				}
			],
			edited: []
		});
		await serveDailyReport(page, []);
		await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => logs.length, { timeout: 20_000 }).toBe(2);
		await expectEntries(page, 3, 'the three members served did not become three entries');

		await openFilterCategory(page, C.MEMBERS);
		expect(
			await allTextsOf(page.locator('[role=menuitem]:visible')),
			'the filter menu is not Members, Projects, Billable and Kind of change while the history is ready'
		).toEqual([C.MEMBERS, SHEET.PROJECTS, SHEET.BILLABLE, M.KIND_LABEL]);
		// each option's text carries the avatar initials before the name (`tasks/property-filter-menu.tsx:218-219`)
		expect(
			await allTextsOf(page.locator('[role=menuitemcheckbox]:visible')),
			'the members offered are not the team three, labelled with their initials'
		).toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}`,
			`${initialsOf(fixture.names.denied)}${fixture.names.denied}`,
			`${initialsOf(fixture.names.teammate)}${fixture.names.teammate}`
		]);
		await memberOption(page, fixture.names.teammate).click();
		await closeFilterMenu(page);
		await expect.poll(() => logs.length, { timeout: 20_000 }).toBe(4);
		expect(employeeIdsOf(lastOf(logs)), 'the filtered read still asked for more than the picked member').toEqual([
			teammate
		]);
		await expectEntries(page, 1, 'the feed did not narrow to the member the read asked for');
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(
				`${periodTextOf(weekPeriod().from, weekPeriod().to)} · ${copy(LIMITS.MEMBERS_COUNT, { count: 1 })}`
			);
		expect(await textOf(filterButton(page)), 'the Filter button does not carry how many values are applied').toBe(
			`${C.FILTER}1`
		);
		expect(await chipsOf(page), 'the applied member is not named by a removable chip').toEqual([
			copy(SHEET.REMOVE_FILTER, { value: fixture.names.teammate })
		]);
		await expect(
			page.getByRole('button', { name: C.CLEAR_FILTERS, exact: true }),
			'no Clear filters appeared once a filter was applied'
		).toBeVisible();
		const readsAfterPick = logs.length;

		// finding 7: removing the chip re-uses the cached three-member pair and asks for nothing
		await filterChip(page, fixture.names.teammate).click();
		await expectEntries(page, 3, 'removing the chip did not bring the other members back');
		expect(
			[logs.length, employeeIdsOf(lastOf(logs))],
			'removing the filter re-read the period or still named only the removed member in the feed'
		).toEqual([readsAfterPick, [teammate]]);

		await openFilterCategory(page, C.MEMBERS);
		await memberOption(page, fixture.names.teammate).click();
		await memberOption(page, fixture.names.denied).click();
		await closeFilterMenu(page);
		await expectEntries(page, 2, 'two members applied did not mean two entries');
		expect(await chipsOf(page), 'two applied members are not two chips').toEqual([
			copy(SHEET.REMOVE_FILTER, { value: fixture.names.teammate }),
			copy(SHEET.REMOVE_FILTER, { value: fixture.names.denied })
		]);
		await page.getByRole('button', { name: C.CLEAR_FILTERS, exact: true }).click();
		await expectEntries(page, 3, 'Clear filters did not clear them');
		expect(await chipsOf(page), 'the chips survived Clear filters').toEqual([]);
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(
				`${periodTextOf(weekPeriod().from, weekPeriod().to)} · ${copy(LIMITS.MEMBERS_COUNT, { count: 3 })}`
			);

		/* Finding 13: a filter that matches nothing is the feed's own filtered empty state. The emptied answer is
		   registered *before* the pick, because Playwright answers a request with the most recently registered route
		   that matches it, and the pick itself is what causes the read. */
		await serveChangedLogs(page, { honourIds: true, added: [], edited: [] });
		await openFilterCategory(page, C.MEMBERS);
		await memberOption(page, fixture.names.denied).click();
		await closeFilterMenu(page);
		await expectEntries(page, 0, 'a member with no served log still showed entries');
		await expect(
			feedRegion(page).getByText(M.NO_MATCH_TITLE, { exact: true }),
			'the filtered empty state does not say the filters matched nothing'
		).toBeVisible();
		await expect(
			feedRegion(page).getByText(M.NO_MATCH_MESSAGE, { exact: true }),
			'the filtered empty state does not say what to do about it'
		).toBeVisible();
		await expect(
			feedRegion(page).getByRole('button', { name: C.CLEAR_FILTERS, exact: true }),
			'the filtered empty state offers no Clear inside the feed'
		).toBeVisible();
		report('member-filter', {
			reads: logs.map((call) => employeeIdsOf(call)),
			meta: await textOf(pageMeta(page)),
			chips: await chipsOf(page),
			feedButtons: await buttonsOf(feedRegion(page))
		});
	});

	// -------------------------------------------------------------------------- 10. the export

	test('10 · Export: CSV then PDF, the file names carry the shown period, and the rows are the feed in feed order', async ({
		page,
		fixture
	}) => {
		const logs = await serveChangedLogs(page, { added: addedLogs(fixture), edited: editedLogs(fixture) });
		await serveDailyReport(page, dailyAnswer(fixture));
		const rows = historyRows(fixture);
		// `raw`: every history call answers the same three rows, whichever period asks for them, so the period this test
		// walks onto is served the served deletion too.
		await serveHistory(page, { raw: { items: rows, total: 3 } });
		await signInAndVisit(page, fixture, PAGE_PATH);
		// The same walk test 4 makes: the served deletion is an entry only inside a period that reaches the day its log
		// was on, and `common.FILTER_LAST_7_DAYS` reaches it on every weekday where the opened week does not.
		const period = lastSevenDaysPeriod();
		await openPreset(page, C.FILTER_LAST_7_DAYS);
		await expect.poll(() => lastOf(logs).params.startDate, { timeout: 20_000 }).toBe(isoOf(period.from));
		await expectEntries(page, 5, 'the export had nothing to export');

		const fileBase = `manual-time-edits-${localDayKeyOf(period.from)}-${localDayKeyOf(period.to)}`;
		await exportButton(page).click();
		expect(await allTextsOf(page.getByRole('menuitem')), 'the export menu is not CSV then PDF').toEqual([
			LIMITS.CSV,
			C.PDF
		]);

		const csvEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: LIMITS.CSV, exact: true }).click();
		const csv = await csvEvent;
		expect(csv.suggestedFilename(), 'the CSV is not named after the prefix and the shown period').toBe(
			`${fileBase}.csv`
		);
		const raw = readFileSync(await csv.path(), 'utf8');
		expect(raw.charCodeAt(0), 'the CSV does not start with a UTF-8 BOM').toBe(UTF8_BOM);
		const lines = raw.slice(1).split('\r\n');
		const beforeCell = `"${SHEET.COLUMNS.END} ${csvDateTimeOf(at(-1, 10))}; ${SHEET.COLUMNS.DURATION} ${csvDurationOf(3600)}"`;
		const afterCell = `"${SHEET.COLUMNS.END} ${csvDateTimeOf(at(-1, 11))}; ${SHEET.COLUMNS.DURATION} ${csvDurationOf(7200)}"`;
		expect(
			lines.slice(1),
			'the CSV rows are not the feed entries in feed order, with the deleted one named Deleted'
		).toEqual([
			`${localDayKeyOf(localDay(0))},${fixture.names.teammate},${SHEET.NO_PROJECT},${SHEET.NO_TASK},08:30,09:30,${csvDurationOf(3600)},Yes,,,,No,,`,
			`${localDayKeyOf(localDay(-1))},${fixture.names.user},Fixture Project,${fixture.names.task},09:00,11:00,${csvDurationOf(7200)},Yes,,${beforeCell},${afterCell},Yes,,Forgot the timer`,
			`${localDayKeyOf(localDay(-2))},${fixture.names.user},${C.PRIVATE_PROJECT},Suite deleted task,09:00,10:30,${csvDurationOf(5400)},No,${csvDateTimeOf(DELETED_INSTANT)},,${M.DELETED},Yes,,Logged twice`,
			`${localDayKeyOf(localDay(-2))},${fixture.names.teammate},${SHEET.NO_PROJECT},Suite edited task,14:00,16:30,${csvDurationOf(9000)},No,${csvDateTimeOf(at(-1, 10, 12))},,,Yes,,`,
			`${localDayKeyOf(localDay(-3))},${fixture.names.user},${SHEET.NO_PROJECT},${SHEET.NO_TASK},09:00,09:30,${csvDurationOf(1800)},Yes,,,,Yes,,`
		]);

		await exportButton(page).click();
		const pdfEvent = page.waitForEvent('download');
		await page.getByRole('menuitem', { name: C.PDF, exact: true }).click();
		const pdf = await pdfEvent;
		expect(pdf.suggestedFilename(), 'the PDF is not named after the prefix and the shown period').toBe(
			`${fileBase}.pdf`
		);
		report('export', {
			csvName: csv.suggestedFilename(),
			pdfName: pdf.suggestedFilename(),
			csvLines: lines,
			bom: raw.charCodeAt(0)
		});
	});

	// --------------------------------------------------- 11. the changed-logs read refused: a notice, and less page

	test('11 · both kinds refused with a 500: the notice, what the page keeps, what it loses, and Try again reading again', async ({
		page,
		fixture,
		shield
	}) => {
		const logs = await serveChangedLogs(page, { refusal: 500 });
		await serveDailyReport(page, []);
		await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect.poll(() => logs.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);

		const notice = errorNotice(page);
		await expect(notice, 'a refused pair rendered no notice').toBeVisible();
		// title, message and the button are three children of one <output>, printed one after the other (`probe-2.log` Q8a outputs)
		expect(await textOf(notice), 'the notice is not title, message and Try again').toBe(
			`${STATES.ERROR_TITLE}${STATES.ERROR_MESSAGE}${TRY_AGAIN}`
		);
		expect(await noticesOf(page), 'the page wrote a second notice nobody reads').toEqual([
			`${STATES.ERROR_TITLE}${STATES.ERROR_MESSAGE}${TRY_AGAIN}`
		]);
		await expect(
			page.getByRole('button', { name: TRY_AGAIN, exact: true }),
			'the notice offers no way to retry'
		).toBeVisible();

		// finding 8: the feed and the rail are one branch, so both go, and the Change shown tablist goes with them
		await expect(feedRegion(page), 'the feed region survived a refused pair').toHaveCount(0);
		await expect(railRegion(page), 'the summary rail survived a refused pair').toHaveCount(0);
		expect(await tabsOf(page), 'an action tablist survived with no feed to narrow').toEqual([
			{ aria: M.GROUPING_LABEL, tabs: [`${M.GROUPING_DAY}|true`, `${M.GROUPING_MEMBER}|false`] }
		]);

		// what the page keeps: its header, its period, its filter, its grouping
		await expect(pageHeading(page)).toBeVisible();
		await expect
			.poll(() => textOf(pageMeta(page)), { timeout: 20_000 })
			.toEqual(
				`${periodTextOf(weekPeriod().from, weekPeriod().to)} · ${copy(LIMITS.MEMBERS_COUNT, { count: 3 })}`
			);
		await expect(periodGroup(page)).toBeVisible();
		await expect(filterButton(page)).toBeVisible();
		await expect(groupingTab(page, M.GROUPING_DAY)).toBeVisible();
		await expect(exportButton(page), 'Export is offered with no entry to export').toBeDisabled();

		// Try again re-reads both kinds (`use-changed-time-logs.ts:159-162`); the count is not pinned, a refused read retries
		const beforeRetry = logs.length;
		await page.getByRole('button', { name: TRY_AGAIN, exact: true }).click();
		await expect.poll(() => logs.length, { timeout: 20_000 }).toBeGreaterThan(beforeRetry);
		report('changed-logs-500', {
			notice: await textOf(notice),
			readsBeforeRetry: beforeRetry,
			readsAfterRetry: logs.length,
			kept: {
				meta: await textOf(pageMeta(page)),
				tabs: await tabsOf(page),
				exportDisabled: await exportButton(page).isDisabled()
			},
			armedLines: armedFailureLines(shield, LOGS_LOGGED_PATH, 500).length
		});
		expect(
			consoleFindingsWithArmed(shield, LOGS_LOGGED_PATH, 500),
			'a console error was logged that is not the armed 500 on the changed-logs path'
		).toEqual([]);
		expect(armedFailureLines(shield, LOGS_LOGGED_PATH, 500).length).toBeGreaterThanOrEqual(1);
	});

	// ------------------------------------------ 12/13. the history read refused: less page, and no notice at all

	test('12 · the history answers 406 (unsupported): no notice, no retry, no Kind of change, no deleted entries, no not-kept line', async ({
		page,
		fixture,
		shield
	}) => {
		await serveChangedLogs(page, { added: addedLogs(fixture), edited: editedLogs(fixture) });
		await serveDailyReport(page, dailyAnswer(fixture));
		const history = await serveHistory(page, { refusal: 406 });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectEntries(page, 4, 'a refused history changed which logs became entries');

		// `retry: false` (`use-time-log-period-history.ts:105`): one call, measured at 1 in two probe runs
		await expect.poll(() => history.length, { timeout: 20_000 }).toBe(1);
		await expect(errorNotice(page), 'an unsupported history wrote a notice').toHaveCount(0);
		expect(await noticesOf(page), 'the page wrote a notice').toEqual([]);
		expect(await textOf(feedRegion(page).locator('p').first()), 'the lead sentence changed with the history').toBe(
			copy(richOf(M.LEAD_SHARE), { percent: '120%', entries: 4, members: 2 })
		);
		// finding 5: the feed is test 3's feed, only the edited entry's change line lost its "not kept" tail
		const story = storyTextsOf(fixture);
		const entries = await entriesOf(feedEntries(page));
		expect(entries[0], 'an entry changed because the history read was refused').toBe(story.first);
		expect(entries[1], 'an entry changed because the history read was refused').toBe(story.second);
		expect(entries[3], 'an entry changed because the history read was refused').toBe(story.fourth);
		expect(entries[2], 'the edited entry kept the not-kept line although the history read was refused').toMatch(
			new RegExp(`^${reEscape(story.editedBase)}${RELATIVE_TAIL}$`)
		);
		expect(entries[2].includes(M.NOT_KEPT), 'the not-kept line survived a refused history read').toBe(false);
		await expect(
			feedRegion(page).getByRole('button', { name: M.SHOW_HISTORY, exact: true }),
			'an entry offered a history the server does not keep'
		).toHaveCount(0);
		await expect(exportButton(page), 'Export lost its entries to a history failure').toBeEnabled();

		await openFilterCategory(page, C.MEMBERS);
		expect(
			await allTextsOf(page.locator('[role=menuitem]:visible')),
			'finding 5: the Kind of change category survived a history that answered nothing'
		).toEqual([C.MEMBERS, SHEET.PROJECTS, SHEET.BILLABLE]);
		await closeFilterMenu(page);

		report('history-406', {
			calls: history.length,
			entries: await entriesOf(feedEntries(page)),
			exportDisabled: await exportButton(page).isDisabled(),
			armedLines: armedFailureLines(shield, HISTORY_LOGGED_PATH, 406).length
		});
		expect(
			consoleFindingsWithArmed(shield, HISTORY_LOGGED_PATH, 406),
			'a console error was logged that is not the armed 406 on the history path'
		).toEqual([]);
		expect(armedFailureLines(shield, HISTORY_LOGGED_PATH, 406).length).toBeGreaterThanOrEqual(1);
	});

	test('13 · the history answers 500 (an error, not an unsupported server): the same page, and only the console line differs', async ({
		page,
		fixture,
		shield
	}) => {
		await serveChangedLogs(page, { added: addedLogs(fixture), edited: editedLogs(fixture) });
		await serveDailyReport(page, dailyAnswer(fixture));
		const history = await serveHistory(page, { refusal: 500 });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectEntries(page, 4, 'a refused history changed which logs became entries');
		await expect.poll(() => history.length, { timeout: 20_000 }).toBe(1);

		await expect(
			errorNotice(page),
			'a history failure wrote a notice, which is not what this page does'
		).toHaveCount(0);
		const story = storyTextsOf(fixture);
		const entries = await entriesOf(feedEntries(page));
		expect(entries[0], 'an entry changed because the history read errored').toBe(story.first);
		expect(entries[1], 'an entry changed because the history read errored').toBe(story.second);
		expect(entries[3], 'an entry changed because the history read errored').toBe(story.fourth);
		expect(entries[2], 'an entry printed a change line built from a history that never answered').toMatch(
			new RegExp(`^${reEscape(story.editedBase)}${RELATIVE_TAIL}$`)
		);
		expect(entries[2].includes(M.NOT_KEPT), 'the not-kept line survived an errored history read').toBe(false);
		await expect(
			feedRegion(page).getByRole('button', { name: M.SHOW_HISTORY, exact: true }),
			'an entry offered a history that failed'
		).toHaveCount(0);
		await expect(railRegion(page), 'the rail disappeared on a history failure').toBeVisible();
		await expect(exportButton(page), 'Export was disabled on a history failure').toBeEnabled();

		await openFilterCategory(page, C.MEMBERS);
		expect(
			await allTextsOf(page.locator('[role=menuitem]:visible')),
			'the Kind of change category survived a history that errored'
		).toEqual([C.MEMBERS, SHEET.PROJECTS, SHEET.BILLABLE]);
		await closeFilterMenu(page);

		report('history-500', {
			calls: history.length,
			entries: await entriesOf(feedEntries(page)),
			notKeptOnEditedEntry: entries[2].includes(M.NOT_KEPT),
			exportDisabled: await exportButton(page).isDisabled(),
			armedLines: armedFailureLines(shield, HISTORY_LOGGED_PATH, 500).length
		});
		expect(
			consoleFindingsWithArmed(shield, HISTORY_LOGGED_PATH, 500),
			'a console error was logged that is not the armed 500 on the history path'
		).toEqual([]);
		expect(armedFailureLines(shield, HISTORY_LOGGED_PATH, 500).length).toBe(1);
	});

	// ------------------------------------------------------------- 14/15. answers that are not answers

	test('14 · a changed-logs answer with two unusable logs: both are dropped silently, and the page keeps going', async ({
		page,
		fixture,
		shield
	}) => {
		// exactly the three rows `probe-2.log` Q8c served: one with no dates at all, one with two unparseable ones, one usable
		await serveChangedLogs(page, {
			added: [
				{ id: 'suite-broken-1', employeeId: fixture.ids.employee, duration: 3600, logType: 'MANUAL' },
				{
					id: 'suite-broken-2',
					employeeId: fixture.ids.employee,
					startedAt: 'not-a-date',
					stoppedAt: 'not-a-date',
					duration: 1200,
					logType: 'MANUAL'
				},
				addedLogs(fixture)[1]
			],
			edited: []
		});
		await serveDailyReport(page, []);
		await serveHistory(page, { pages: [{ items: [], total: 0 }] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectEntries(page, 1, 'an entry was rendered from a log with no readable day');
		expect(
			(await entriesOf(feedEntries(page)))[0],
			'the one usable log did not print like the same log of test 3'
		).toBe(storyTextsOf(fixture).first);

		expect(
			await textOf(feedRegion(page).locator('p').first()),
			'finding 9: the lead sentence fell back to the total wording when nothing was tracked'
		).toBe(copy(richOf(M.LEAD_TOTAL), { duration: durationOf(3600), entries: 1, members: 1 }));
		expect(await railFiguresOf(page), 'the rail figures are not what one usable log prints').toEqual({
			dt: [M.LEGEND_MANUAL, M.LEGEND_TRACKED, M.FIGURE_ADDED, M.FIGURE_EDITED],
			dd: [
				durationOf(3600),
				MISSING_VALUE,
				copy(M.ENTRIES_COUNT, { count: 1 }),
				durationOf(3600),
				copy(M.ENTRIES_COUNT, { count: 0 }),
				durationOf(0)
			]
		});
		expect(await railTitlesOf(page), 'one usable entry did not earn the two ranked blocks').toEqual([
			M.FIGURE_SHARE,
			M.RANK_MEMBERS_TITLE,
			SHEET.PROJECTS
		]);
		expect(await noticesOf(page), 'a malformed answer wrote a notice').toEqual([]);
		await expect(exportButton(page), 'Export was disabled over two unusable logs').toBeEnabled();
		report('malformed-logs', {
			entries: await entriesOf(feedEntries(page)),
			lead: await textOf(feedRegion(page).locator('p').first()),
			rail: await textOf(railRegion(page)),
			railTitles: await railTitlesOf(page),
			exportDisabled: await exportButton(page).isDisabled(),
			console: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'a dropped log logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'a dropped log threw a page error').toEqual([]);
	});

	test('15 · a history answer that is a bare array instead of { items, total }: no rows, no console line, the same page as an empty history', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await serveChangedLogs(page, { added: addedLogs(fixture), edited: editedLogs(fixture) });
		await serveDailyReport(page, dailyAnswer(fixture));
		// exactly what `probe-2.log` Q8d served: an array of rows instead of `{ items, total }`, one row not even an object
		const history = await serveHistory(page, {
			raw: [{ id: 'suite-junk-1', entityId: null, action: 'Nope', createdAt: 'nope', data: {} }, 'not-an-object']
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expectEntries(page, 4, 'a history answer of the wrong shape changed the entry list');
		await expect.poll(() => history.length, { timeout: 20_000 }).toBe(1);

		const story = storyTextsOf(fixture);
		const entries = await entriesOf(feedEntries(page));
		expect(entries[0], 'an entry of the feed changed because the history answer had the wrong shape').toBe(
			story.first
		);
		expect(entries[1], 'an entry of the feed changed because the history answer had the wrong shape').toBe(
			story.second
		);
		expect(entries[3], 'an entry of the feed changed because the history answer had the wrong shape').toBe(
			story.fourth
		);
		expect(
			entries[2],
			'a history answer of the wrong shape did not read as a period whose changes were not kept'
		).toMatch(new RegExp(`^${reEscape(story.editedBase)}${RELATIVE_TAIL}${reEscape(M.NOT_KEPT)}$`));
		expect(
			await ariaLabelsOf(feedRegion(page), 'li [role=img]'),
			'the change glyphs are the same as the ones of a well-formed answer'
		).toEqual([M.ADDED, M.ADDED_AND_EDITED, M.EDITED, M.ADDED]);
		expect(consoleFindings(shield), 'a malformed history answer logged a console error').toEqual([]);
		expect(
			(await mock.calls('/api/timesheet/time-log')).filter((call) =>
				[LOGS_PATH, HISTORY_PATH, DAILY_PATH].includes(call.path)
			),
			'a stubbed read fell through to the mock'
		).toEqual([]);
		report('junk-history', { calls: history.length, entries: await entriesOf(feedEntries(page)) });
	});
});
