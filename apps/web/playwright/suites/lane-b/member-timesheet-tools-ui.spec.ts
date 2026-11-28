import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { mockReset, signInAndVisit } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';
/**
 * What a signed-in reader **does to one time entry** on Reports › the timesheet of a member
 * (`/reports/timesheet/<memberId>`, `app/[locale]/(main)/reports/timesheet/[memberId]/page.tsx` →
 * `core/components/dashboards/timesheets/timesheets-page.tsx`), on lane-b (app `http://localhost:3032`, mock
 * `http://127.0.0.1:3996`, statistics `3997`, control `3998`, issuer `3999`, `playwright/test-servers.ts:37-42`).
 * Every case signs in as the fixture manager (the mock's own organization role, `mock-gauzy-server.mjs:50-81`); tests
 * 6, 7 and 8 are the three that add `ALLOW_MANUAL_TIME` to that role, because without it the sheet is read-only and
 * neither its row tools (`ADD_ROW`, `Copy last week`) nor its per-day lock wording is rendered at all (finding 18 of
 * the accepted `member-timesheet-report-ui.spec.ts`, re-measured here as finding 9 below).
 *
 * This file is the tool half of that page; `suites/lane-b/member-timesheet-report-ui.spec.ts` is the read half (the
 * rows, the filters, the status cards, Export, approve / reject / delete of a selected row) and its harness shape —
 * the store-backed `serveTimesheetApi`, the `Intl` date builders, the restated CORS, the copy-key reader and the
 * console helpers — is copied here, not imported, with three additions: `ServedWeeks` (two served weeks, because
 * `Copy last week` reads the week *behind* the shown one), `openedWeekOf` / `futureWeekOf` (the week the page opens
 * on, and the whole week after it), and `stepWeeksTo` — whole `Next / Previous period` steps in either direction,
 * proved per view because a period step is not always followed by a read (finding 22).
 *
 * ## The eight things asked for, and the ten tests they became
 *
 * 1 grouping (`SHEET` list rows, `SIMILAR.*`, `Group similar entries`) → **tests 1 and 2**: test 1 is the switch and
 *    what one group row stands for, test 2 is the group row's own menu acting on every entry of the group. The brief
 *    asked for the menu items *and* what the grouping does; one test each keeps either failure readable.
 * 2 `Duplicate` → test 3. 3 `Continue` → test 4. 4 `Add another period` → test 5.
 * 5 `Copy last week` with `ADD_ROW` / `REMOVE_ROW` → **tests 6 and 7**: test 6 is the copy menu (both choices, the
 *    confirmation, the writes) together with `REMOVE_ROW` on a copy draft row, test 7 is `ADD_ROW` on its own week —
 *    its picker, its seven empty cells, `REMOVE_ROW` on a draft row, and the one write its typed cell sent. They are
 *    split because the copy menu is one flow with a confirmation of its own on the served week, while `ADD_ROW` needs
 *    a week with no logs at all; both need `ALLOW_MANUAL_TIME` (`copyWeekOf` and the Add-row row share the
 *    `editing.sheetLock === 'none'` gate, `timesheets-sheet-tools.tsx:110-122`, `timesheets-week-sheet.tsx:460`).
 * 6 `SHEET.EDIT.LOCK_*` wording and the controls it removes → test 8. 7 a refused save (400 then 500) → test 9.
 * 8 the calendar view → test 10.
 *
 * ## Where every number came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-timesheettools\probe1.spec.ts` … `probe7.spec.ts` (config
 * `D:\Coding\.tmp\probe-timesheettools\probe.config.mjs`, helpers `…\harness.ts`), run on this lane on 2026-11-27 and
 * 2026-11-28 and logged in `D:\Coding\.tmp\s3-lane-b-timesheettools-probe-1.log` (P1-P4: the grouping, the view-menu
 * switch, the row menus, `Continue`), `-probe-2.log` (Q1-Q7: the Duplicate dialog and its POST, the sheet locks, the
 * copy menu `Rows` and its draft rows, `Rows and time` and its writes, the empty sheet week, `Add another period`, a
 * refused 400 save), `-probe-3.log` (R1-R5: the Week view, `Continue` aftermath and its second click, the group menu,
 * `Add row`, two periods), `-probe-4.log` (S1: the group confirmation and its two PUTs; S2/S3 failed on waits),
 * `-probe-5.log` (S3: two periods, their two writes and the rows they left) and `-probe-6.log` (U1: `Add row` on an
 * all-past empty week, its picker, its draft row, its typed cell; U2 failed on a List-row locator and the 500 case is
 * asserted from the code that maps a status to a reason, `error-feedback.ts:151-169`, proven by this file's own run)
 * and `-probe-7b.log` (V1: what the sheet's period stepper does and does not read, and what its day columns are named
 * after a `Next period`; V2: `Add row` → `Remove … from the sheet` → `Add row` again → a typed cell, its one `POST`,
 * and the 0 writes the draft row cost).
 * Every value asserted below is one those runs printed, or one this file's own `MEASURE` line printed on a run that
 * passed: `D:\Coding\.tmp\s3-lane-b-timesheettools-measure-1.log` (the group row's cells, the Billable submenu
 * `["YesSelected","No"]`, the confirmation text, the two periods' fields, the copy menu's two items, the sheet's
 * rowheaders and its locked cell titles), `-measure-2.log` (the same, on the run that fixed the last of the waits) and
 * `-measure-3.log` / `-measure-4.log` (the seven day-column names a sheet step is proved on, the carriers of an
 * approved and of a future day lock, and the clocks a new period prints only once its duration is typed).
 * Nothing here names today's date.
 *
 * **The weekday rule.** The served logs sit on `servedWeeks().shown` — a whole week before the week the page opens
 * on, one step further back whenever a month ends inside the week directly behind it (the Month view grows the shown
 * period to that month and the grown period stays) — and on `servedWeeks().last`, the week behind that. Every served
 * day is a `dayKeysOf(week)` step (`setUTCDate` on the week's own Monday), never a millisecond offset, and every
 * label, cell name, header, group span and period string is rebuilt from those served values with the same `Intl`
 * options the page uses. `openedWeekOf()` is the week the page opens on (`initialPeriodFor`,
 * `use-timesheets-page.ts:158-162`, named in the profile zone, and the mock profile is `timeZone: 'UTC'`,
 * `mock-gauzy-server.mjs:94`) — the one test 5 saves into, because `Add another period` places both intervals in the
 * member's own today. `futureWeekOf()` is the week *after* that, so all seven of its days are a day after today on a
 * Monday as on a Sunday: that is the week test 8 measures `LOCK_FUTURE` on, and its served `future-mon` log is what
 * keeps a row there to lock. The opened week's own future days are counted from the browser's today rather than
 * assumed (`afterToday.length`), because on a Sunday there are none. `Add row` is measured two whole weeks further
 * back than the served week, where every day is in the past and no cell is locked for being future.
 *
 * The browser's zone is read from the page and never assumed (`browserZoneOf`): on this PC it resolves to
 * `Europe/Madrid` while the mock profile says `UTC`, which is why the page's own period reads carry
 * `timeZone=UTC` and the day read `Duplicate` makes carries `timeZone=Europe/Madrid` (finding 5).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, the shell and its reads, NextAuth, and the mock's own fixtures — the ids and names in
 * `fixture.ids` / `fixture.names`, the three team members (`mock-gauzy-server.mjs:120-135`), the reader's role and its
 * permissions (`:50-81`), the organization's `allowManualTime / allowModifyTime / allowDeleteTime` and its **missing**
 * `futureDateAllowed` (`:95-97`), the profile `timeZone: 'UTC'` (`:94`), the team's `tasks: [task]` (`:252`) and the
 * timer endpoints (`/api/timesheet/timer/start` `:750-754`). Test 4's timer start, the group-change re-reads and every
 * shell control are the real app against the real mock.
 *
 * **Served by this file:** every `/api/timesheet/time-log` read and every write to it, through `page.route` on the
 * mock origin (the pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`) from one exact path list —
 * `LOGS_PATH`, `STATUS_PATH`, `CONFLICT_PATH` and `LOGS_PATH/<id>` — because the mock has no idea what a served log, a
 * copied entry or a billable change looks like. Each answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`; `OPTIONS` → 204 at `:1097-1101`); a `route.fetch()` is never called on a served
 * path, so `api.writes()` is the whole write story. The store is a plain object the tests change mid-case
 * (`state.refusals['POST /api/timesheet/time-log'] = 400`, then `= 500`), which is how test 9 arms two refusals
 * without re-registering a route, and a POST **adds to the store**, which is why tests 3, 5, 6 and 7 can re-read the
 * row they just created. `api.reads(path)` filters on the read's own `employeeIds[]` / `startDate` / `endDate`, so a
 * period step visibly changes the page.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `timesheets-page.tsx`: the List view alone gets the grouping switch `:273-278`; `groupChange =
 *   useTimesheetGroupChange({ permissions, changeStatus, openReject, openDelete })` `:215` and its dialog `:568`;
 *   `reuse` = `useTimeEntryContinue(timerStart.startOn)` / `useTimeEntryDuplicate({ stepMinutes:
 *   ADD_TIME_ENTRY_STEP_MINUTES })` `:217-224` and the row handlers `:224-238`; the Week and Month views pass
 *   `onOpenDay={page.openDayInList}` `:443-457`; the sheet view gets `editing={sheetEditing}` `:437`.
 * - Grouping: `use-similar-entry-grouping.ts` (`GROUP_SIMILAR_ENTRIES_STORAGE_KEY` `:6`, default `true`,
 *   `isGrouping = storedChoice !== false` `:18`, opened groups are per-visit state `:16`);
 *   `timesheet-entry-groups.ts` `similarWorkKeyOf` `:30-38` (member | task | project | billable | status | notes);
 *   `timesheets-list.tsx` `:240-242` and the group row `:183-205`; `timesheet-entry-group-row.tsx` (checkbox
 *   `SIMILAR.SELECT_GROUP` `:107`, toggle `SIMILAR.SHOW_ENTRIES` / `HIDE_ENTRIES` + `aria-expanded` `:115-120`, count
 *   chip `SIMILAR.ENTRY_COUNT` `:86`, range `:41-51`); `timesheets-view-menu.tsx` (trigger `aria-label=common.VIEW`
 *   `:30`, `SIMILAR.VIEW_GROUP` + `VIEW_GROUP_HELP` `:37-39`, `Switch` `:42-50`);
 *   `timesheet-entry-group-menu.tsx` (Status submenu only when `offeredStatusesOf` is non-empty `:54-60`, Billable
 *   `:61-63`, Delete when every log `canEditLog` `:64-72`); `timesheet-menu-parts.tsx` (the submenu trigger is
 *   `dashboard.timesheets.BILLABLE`, its two items `pages.timesheet.BILLABLE.YES` / `.NO`, the current state marked by
 *   `SelectedMark`); `use-timesheet-group-change.ts` (`setBillable` `:87-94`, `confirm` `:122-150` running
 *   `useBulkEditRun`, which re-reads and conflict-checks each entry before its own `PUT`);
 *   `timesheets-group-change-dialog.tsx` (`AlertDialog` `:46`, title `SIMILAR.CONFIRM_*` `:21-31`, description
 *   `SIMILAR.CONFIRM_SCOPE` `:57-59`, footer `common.CANCEL` + `common.CONFIRM` `:66-77`).
 * - `Continue` / `Duplicate`: `use-time-entry-continue.ts` `:72-93` → `continuableTaskOf`
 *   (`time-entry-reuse.ts:58-86`: may track, own log, not running, has a task, that task among the team's tasks, task
 *   not closed) → `startOn(task, timerCarryOf(log))`; `time-entry-reuse.ts` `copySecondsOf` `:254-261` (whole 5-minute
 *   steps, at least one), `copiedFieldsOf` `:195-205` (taskId / projectId / employeeId / isBillable / description),
 *   `duplicateIntervalOf` / `unplacedIntervalOf` (both place the copy inside **today**);
 *   `use-time-entry-duplicate.ts` (the day + evening read `:96-112` with `staleTime: 0`, `open` `:114-144`,
 *   `checkBeforeSave` `:148-166` → `timeEntryActions.duplicate.OVERLAPS` / `CHECK_FAILED`, `refusalOfOverlap`
 *   `:172-182`); `timesheets-dialogs.tsx` `:78-98` (`LazyAddTaskModal key={draft.id} prefill={draft} fixedMember`) and
 *   its `ssr:false` import `:11-14`; `time-entry-reuse.tsx` `:22-27`, `:29-57` (the menu items, and no Continue /
 *   Duplicate on a break).
 * - `Add another period`: `add-mask-modal.tsx` (title `+ common.ADD_TIME_ENTRY` `:461`, notes `aria-label` `:581`, one
 *   `common.DATE_AND_TIME` accordion per period `:766-802`, `common.ADD_ANOTHER_PERIOD` `:803-811`, Start / End
 *   `placeholder="00:00:00"` `:859`, `:868`, the save `:375-455`: `periodsOverlapEachOther`, then the overlap guard,
 *   then `Promise.all(entries.map(createTimesheet))`); `use-create-timesheet.ts` `:38-42` (its failure toast
 *   `toasts.MUTATION_FAILED` + `manualTimeRefusalKeyOf(error)`), `manual-time-entry.ts` `manualTimeRefusalKeyOf`
 *   `:413-423`, `error-feedback.ts` `ERROR_REASON_KEYS` `:19-31` and `reasonOfStatus` `:151-169`.
 * - Sheet tools: `timesheets-sheet-tools.tsx` (`SheetAddRow` `:35-58` → `TaskPickerMenu` with `triggerLabel =
 *   SHEET.EDIT.ADD_ROW` and `searchPlaceholder = SHEET.EDIT.ADD_ROW_SEARCH`, `SheetRemoveRowButton` `:60-74`,
 *   `SheetCopyWeekMenu` `:83-111`, `copyWeekOf` `:113-123` (the menu needs `editing.sheetLock === 'none'` **and**
 *   `copyWeek.isAvailable`), the empty-period hint branch `:160-168`, `SheetCopyConfirmDialog` `:171-230`
 *   (`AppDialog` → `role=dialog`), `SheetEditNotice` `NOTICE_KEYS` `:233-247`); `timesheets-week-sheet.tsx` (row
 *   `role=row` + `SHEET.SELECT_ROW` `:299-313` with `SheetRemoveRowButton` only while `line.isDraft` `:311-313`, cell
 *   labels `SHEET.CELL_LABEL` / `SHEET.EDIT.CELL_INPUT` `:322-329`, table `aria-label=SHEET.TABLE_LABEL` `:469`, the
 *   `canAddRows = editing?.sheetLock === 'none'` gate and the Add-row row `:460`, `:531-546`, `SHEET.PERIOD_TOTAL`
 *   `:553`); `timesheets-sheet-cell.tsx` (`DAY_LOCK_KEYS` `:36-40` put on the read-only cell `title` `:89` and the
 *   entries button `:110`, `EditableCell` `input[inputmode=decimal]` `:120-219`); `timesheet-sheet-edit.ts`
 *   (`CellLock` `:443-451`, `SheetEditRules` `:453-466`, `sheetLockOf` `:478-492`, `cellLockOf` `:494-511`,
 *   `approvedDayKeysOf` `:543-555`, `PLACEMENT_START_HOUR = 9`); `use-sheet-editing.ts` (`canWrite` `:131-133`,
 *   `isLoading = !hasPeriodLogs || isLoadingPermissions` `:140`, `allowsFutureDates = organization.futureDateAllowed === true`
 *   `:136`); `use-copy-previous-week.ts` (`previousWeekOf` `:66-70`, the last-week read `:119-130`, `copyRows`
 *   `:147-164`, `prepareRowsAndTime` `:166-192`, `confirmCopy` `:198-223`);
 *   `core/lib/utils/dashboards/timesheets.ts` (`SheetRowIdentity` `:914-930` carrying `isBillable` `:927`,
 *   `rowIdentityOfLog` `:1015-1032`).
 * - Calendar: `timesheets-calendar.tsx` (`VISIBLE_CARDS = 6` `:31`, `WeekLogCard` `:49-99` — a `button` whose click is
 *   `onOpenDay(dayKey)` `:60`, printing `timeRangeTextOf` + task title (or `breaks.BREAK`) + duration + an `sr-only`
 *   status, `WeekDayHeader` `:100-133`, `WeekDayColumn` `:135-189` (`role=group aria-label=DAY_LABEL`, `MORE_LOGS`
 *   when a day holds more than 6 logs), `WeekBlock` `:191-228` (`section aria-label=formatPeriod(week)`),
 *   `TimesheetsWeekView` `:234-253`, `MonthDayCell` `OPEN_DAY` `:275`); `use-timesheets-page.ts` `openDayInList`
 *   `:451-461` (`setStoredView('list')`, expand the day, focus it — no new read), `VIEW_STORAGE_KEY` `:75`.
 *
 * ## What this file found
 *
 * 1. **`Continue` is not a second Add time dialog.** Clicking it sent `POST /api/timesheet/timer/start`, a
 *    `GET /api/timesheet/timer/status`, `PUT /api/organization-team-employee/<id>/active-task` and a
 *    `PUT /api/tasks/<task id>`, opened **no** dialog, made **no** served time-log write, and left the shell with its
 *    `Stop timer` control (`-probe-1.log` P2, `-probe-3.log` R2). So what `Continue` changes against `Duplicate` is
 *    the *shell*, not the entry list: `Duplicate` prefills a dialog and POSTs a new manual log (test 3), `Continue`
 *    starts the timer carrying the entry's task and its notes (`use-time-entry-continue.ts:84-93` → `startOn`).
 *    `[MEASURED]`
 * 2. **A second `Continue` on the same row says so and sends nothing.** The menu still offered it, the click added no
 *    request at all, and the only new text was the copy `timeEntryActions.ALREADY_RUNNING` — "The timer is already
 *    running on this task" (`-probe-3.log` R2: the request list after the first and after the second click are
 *    identical). `[MEASURED]`
 * 3. **A group row's menu is `Billable` and `Delete` only** for the reader's own logs (`offeredStatusesOf` is empty for
 *    them, `timesheet-menu-parts.tsx:19-22`), so the group status branch (`SIMILAR.CONFIRM_STATUS`,
 *    `SHEET.WHOLE_TIMESHEETS`) is not reachable on this lane — the accepted spec records the same asymmetry for one
 *    entry (its finding 2). `[MEASURED]`
 * 4. **The group confirmation is an `AlertDialog`, not the page's `role=dialog`.**
 *    `timesheets-group-change-dialog.tsx:46` renders `AlertDialog`, so the confirmation is found as
 *    `[role=alertdialog]` and reads `SIMILAR.CONFIRM_NOT_BILLABLE` + `SIMILAR.CONFIRM_SCOPE` with `Cancel` / `Confirm`
 *    (`-probe-4.log` S1). Every other dialog this file drives (`Add time`, `Copy last week`'s confirmation) is
 *    `role=dialog` (`common/modal.tsx:68-110`, `AppDialog`). `[MEASURED]`
 * 5. **One group change is one write per entry, each re-read and conflict-checked first.** Confirming sent
 *    `GET /time-log`, `GET /time-log/conflict`, `PUT /time-log/own-wed-a`, then the same pair again for `own-wed-b`,
 *    then a final re-read; each `PUT` body carried exactly `startedAt / stoppedAt / employeeId / isBillable /
 *    organizationId / tenantId`, with the served interval unchanged (`-probe-4.log` S1). The toast is
 *    `SIMILAR.CHANGED` = "2 entries changed", and the group is still one row afterwards because **both** entries moved
 *    together, so the group key still matches. `[MEASURED]`
 * 6. **`Duplicate` carries the project; `Add time` does not.** The copy's POST body carried `projectId` (copied by
 *    `copiedFieldsOf`, `time-entry-reuse.ts:195-205`), while the toolbar `Add time` POST and **both** periods of an
 *    `Add another period` save carried no `projectId` at all (`-probe-2.log` Q1 vs `-probe-5.log` S3), under a field
 *    the dialog labels `Link to project*`. This pairs with the accepted spec's finding 17 and shows the field is only
 *    ever filled by the copy path. It is the behaviour the app itself specifies: its unit test
 *    `core/components/features/timesheet/add-mask-modal.test.tsx:711` "sends no project field when neither the task
 *    nor the form has a project", and the mock fixture task carries no project at all
 *    (`mock-gauzy-server.mjs:183-197`). Untagged — a lead downgraded this from a contradicted intent on 2026-11-28
 *    once that test was found. `[MEASURED]`
 * 7. **A copy is placed in the member's own today, not beside the entry it copies.** The source entry sat on a Monday
 *    of the served week; the copy was saved on the run's own day (`-probe-2.log` Q1 wrote
 *    `startedAt 2026-11-28T09:05:00.000Z`, i.e. 10:05 of the browser's day), because `duplicateIntervalOf` searches
 *    the free time of **today** after reading the member's day and evening (`use-time-entry-duplicate.ts:96-112`).
 *    That read is the one read on this page that sends `timeZone` = the **browser's** zone while every period read of
 *    the page itself sends the **profile's** `UTC` (`-probe-2.log` Q1 calls) — the two zones the accepted spec's
 *    finding 1 keeps apart. `[MEASURED]`
 * 8. **`Add another period` means two writes, not one.** After `Add another period` the dialog holds two
 *    `common.DATE_AND_TIME` accordions with two `common.Remove period` labels, and the new period's Start **is** the
 *    previous period's End (`10:00:00 AM` in both fields before anything was typed, `-probe-3.log` R5). One `Save`
 *    then sent `GET /time-log/conflict` × 2 and `POST /time-log` × 2 with the second `startedAt` exactly equal to the
 *    first `stoppedAt` (`-probe-5.log` S3, `add-mask-modal.tsx:375-455` `Promise.all(entries.map(createTimesheet))`).
 *    Both entries landed on the same day and the same task with the same billable state and no notes, so they print as
 *    **one** group row (`2 entries`, `1h 30m`, project cell `SHEET.NO_PROJECT`) while the entry served earlier in that
 *    same week keeps its own row — its project differs, and project is part of `similarWorkKeyOf`
 *    (`timesheet-entry-groups.ts:30-38`). A collapsed accordion mounts **no** content, so a period's duration input
 *    exists only after its trigger is clicked (`-probe-2.log` Q6 failed for exactly that reason). `[MEASURED]`
 * 9. **The sheet's row tools exist only for a role that may write.** With `ALLOW_MANUAL_TIME` added to the fixture
 *    role, an empty all-past week shows `SHEET.EDIT.EMPTY_HINT`, `SHEET.EDIT.ADD_ROW` and the `Copy last week` button;
 *    without it the same week shows the page's own empty state (`EMPTY_TITLE` / `EMPTY_MESSAGE`) and **no** Add-row
 *    control at all (`-probe-5.log` S2 failure snapshot vs `-probe-6.log` U1): `canAddRows` and the empty hint both
 *    require `editing.sheetLock === 'none'` (`timesheets-week-sheet.tsx:460`, `timesheets-sheet-tools.tsx:160-168`)
 *    and `sheetLockOf` returns `permission` when `canWrite` is false (`timesheet-sheet-edit.ts:478-492`,
 *    `use-sheet-editing.ts:131-133`). `[MEASURED]`
 * 10. **`ADD_ROW` and `REMOVE_ROW` never touch the network; a typed cell always does.** Picking the task in the
 *    `Search tasks` picker produced a draft row named `Remove Fixture active task from the sheet` with seven empty
 *    `Time on …` inputs, and clicking Remove sent **0** requests (`-probe-6.log` U1). As soon as one of that row's
 *    cells held a log the row was no longer a draft and its Remove button was gone (measured 1 → 0), which is
 *    `line.isDraft` (`timesheets-week-sheet.tsx:311-313`). The typed cell sent one `POST` placed at 09:00 of the
 *    browser's day (`PLACEMENT_START_HOUR = 9`, `timesheet-sheet-edit.ts`) for exactly the typed `1:30`. The same is
 *    true of `Copy last week → Rows`: its two draft rows arrived with **no** request (`-probe-2.log` Q3 writes 0).
 *    `[MEASURED]`
 * 11. **The copy's confirmation counts cells, and counts the closed ones separately.** It read
 *    `SHEET.COPY.CONFIRM_BODY` "This adds 2h 15m of manual time in 2 empty cells…" together with `CONFIRM_LOCKED`
 *    "1 cell is left out: its day is closed (after today, approved or with a running timer)" and the action
 *    `CONFIRM_ACTION` "Add 2h 15m"; the confirmation's last-week read asked exactly `weeks.last.from … weeks.last.to`
 *    for `employeeIds[0]` only; the save sent two `POST`s of 2 700 s and 5 400 s with `isBillable:true`, and the
 *    toasts were `SHEET.COPY.LEFT_OUT` then `SHEET.COPY.DONE` (`-probe-2.log` Q3, Q4). The cell that was left out is
 *    Tuesday's, locked by the served APPROVED entry (finding 12). `[MEASURED]`
 * 12. **A whole day column is locked by one APPROVED entry of that member, not only the cell that holds it.**
 *    Tuesday held one APPROVED entry, and the sheet printed four body rows in that week
 *    (`Fixture active task` twice — billable and not — `Suite approved task`, `Suite group task`): three of the four
 *    Tuesday cells were read-only `[role=cell][title=SHEET.EDIT.LOCK_APPROVED]` printing `SHEET.NO_TIME`, and the
 *    fourth — the cell holding the APPROVED log — is a button named `SHEET.CELL_LABEL` ("Suite approved task, Tuesday,
 *    Nov 17: 1h 0m in 1 log") carrying the **same** title on the button rather than on the cell
 *    (`timesheets-sheet-cell.tsx:89` writes it on the read-only cell, `:110` on the entries button;
 *    `-measure-1.log` counted exactly `3 cells + 1 button`), and no `input[inputmode=decimal]` exists anywhere in that
 *    column. The lock itself comes from `approvedDayKeysOf` (`timesheet-sheet-edit.ts:543-555`) feeding `cellLockOf`
 *    (`:494-511`). `[MEASURED]`
 * 13. **`LOCK_FUTURE` is per day, counted from today, not per week.** In the week the page opens on, only the days
 *    strictly after today carry `SHEET.EDIT.LOCK_FUTURE` ("Your organization doesn't allow time on days after today.")
 *    — 1 on the run's Saturday — while the same row's cell for `Today` keeps its input; the whole week after it
 *    carries it on all seven cells and offers no input at all, because the mock organization never sets
 *    `futureDateAllowed` (`mock-gauzy-server.mjs:95-97` → `allowsFutureDates` false). `[MEASURED]`
 * 14. **The same task is two sheet rows.** The row identity carries the billable state (`SheetRowIdentity`
 *    `timesheets.ts:914-930` with `isBillable: log.isBillable === true` at `:1015-1032`), so the served fixture task —
 *    two billable entries and one non-billable — prints as 2 rows (`-probe-2.log` Q2). `[MEASURED]`
 * 15. **A refused save keeps the dialog and everything typed into it, and names its reason by status.** 400 left
 *    `toasts.MUTATION_FAILED` + `toasts.REASONS.INVALID`; 500 left `toasts.REASONS.SERVER`; in both the dialog stayed
 *    open holding the notes typed into it, and nothing was added to the store (`-probe-2.log` Q7,
 *    `use-create-timesheet.ts:38-42` → `manualTimeRefusalKeyOf` → `reasonOfStatus` `error-feedback.ts:151-169`).
 *    `[MEASURED]`
 * 16. **A calendar card click is a view switch, not a read.** Clicking a `WeekLogCard` stored `"list"` in
 *    `timesheets-view`, selected the List tab, kept the same period and made **0** further reads (TanStack cache), and
 *    left the clicked day's group row visible (`-probe-3.log` R1, `use-timesheets-page.ts:451-461`). `[MEASURED]`
 * 17. **Two literals in the Add time dialog are not copy keys**: the notes field `aria-label="Insert notes here"`
 *    (`add-mask-modal.tsx:581`) and the duration input `placeholder="1:30 or 90m"`; the accepted spec records the same
 *    lines (its finding 15) against the repo rule "avoid hard-coded strings" (`CLAUDE.md` §7). This file names them as
 *    literals, not as keys. The third literal the accepted spec lists — `placeholder="00:00:00"` on Start / End
 *    (`add-mask-modal.tsx:859`, `:868`) — **never reaches the input**: `ShiftTimingSelect` renders a `combobox` over an
 *    input whose `placeholder` is empty and whose *value* is the clock (`-measure-2.log`: `input|||12:35:00 PM`), so a
 *    `input[placeholder='00:00:00']` locator finds nothing here and the period times are read out of the dialog's own
 *    fields. `[MEASURED]` — a placeholder prop that never reaches an input is a fact about how the picker renders,
 *    not something the code's own words call unwanted (a lead downgraded the tag on 2026-11-28).
 * 18. **A group row says its entry count inside its task cell, not in a cell of its own.** `countText`
 *    (`timesheet-entry-group-row.tsx:86`) is printed in the row's task cell (`:132`) next to the toggle button, and the
 *    cell repeats the status, the count, the span and the member for the narrow and the wide layout at once, so the
 *    measured cell text is `"Fixture active task2 entriesPending2 entries09:00 AM – 02:05 PMFixture Manager"`
 *    (`-measure-1.log`). The count is asserted as *part of a cell*, while the span (`09:00 AM – 02:05 PM`) and the
 *    total (`3h 5m`) are cells of their own. `[MEASURED]`
 * 19. **The `View` popover stays open after its switch is clicked.** `TimesheetsViewMenu` is a `Popover` whose content
 *    holds the switch (`timesheets-view-menu.tsx:29-55`), so clicking `common.VIEW` a second time closes the popover
 *    out from under the switch — the click then lands on a detached element (`-measure-1.log`). The popover is closed
 *    with `Escape` and waited for (0 switches) before it is reopened. `[MEASURED]`
 * 20. **The Billable submenu is a menu named after the item that opened it.** `BillableSubmenu` is a
 *    `DropdownMenuSub` (`timesheet-menu-parts.tsx:51-77`), so the Yes / No pair lives in a second
 *    `[role=menu]` whose accessible name is `dashboard.timesheets.BILLABLE`; reading the top-level menu after clicking
 *    the trigger prints the two top items again (`-measure-1.log`: `["Billable","Delete"]`). Read from the submenu it
 *    is `["YesSelected","No"]` — the current state carries the `SelectedMark` text. `[MEASURED]`
 * 21. **A sheet copy-menu item's accessible name is its label *and* its hint.** `SheetCopyWeekMenu` prints
 *    `SHEET.COPY.ROWS` with `ROWS_HINT` under it (`timesheets-sheet-tools.tsx:95-105`), and the name the page computes
 *    is not the `textContent` this file can read (`"RowsLast week's tasks, without time"` — `-measure-1.log` shows a
 *    lookup by exactly that string matching nothing). The items are therefore picked by their hint, which is unique to
 *    each, and the match is proven unique before the click. `[MEASURED]`
 * 22. **A period step onto a week the page already visited sends no read at all on the sheet view.** From the served
 *    week (16 .. 22 Nov) a single `Next period` click moved the sheet onto the week holding today: its seven day
 *    columns became `Monday, Nov 23 … Sunday, Nov 29`, the period group read "This week", and the served read count
 *    stayed **2** — the read of 23 Nov from the page's own start and the read of 16 Nov the `Previous period` step had
 *    made (`-probe-7b.log` V1). The same click in the List view *did* read (naming 2026-11-30, a week never visited),
 *    and `Next` is never disabled (`aria-disabled` empty, `offsetParent` set on all three period buttons). So
 *    `stepWeeksTo` cannot wait for "the read of the week it stepped onto" for every view — it takes a proof per view:
 *    the List view's own read (`provedByARead`, counted from before the clicks so an older read of the same week
 *    cannot stand in), and the sheet's seven `{day}, {total}` column names (`provedOnSheet`). `[MEASURED]`
 * 23. **One locked day column is carried by exactly one element, of two possible shapes.** The lock title sits on the
 *    read-only `[role=cell]` (`timesheets-sheet-cell.tsx:89`) and, where the cell holds logs, on that cell's entries
 *    button instead (`:110`) — the cell itself is no longer a `[role=cell]`. Counting only `[role=cell][title]`
 *    therefore reads 3 of 4 approved Tuesday columns (`-measure-1.log`) and 6 of 7 locked days of the week after the
 *    opened one (`-measure-3.log`, where the served `future-mon` log filled that week's Monday). This file counts
 *    `[title=…]` across the whole table (one per locked column) *and* names each shape beside it. `[MEASURED]`
 * 24. **A new period prints no Start or End of its own until its duration is typed.** After `Add another period` the
 *    dialog holds two durations but the clocks of the **first** period only (`-measure-3.log`: `09:00:00 AM`,
 *    `10:00:00 AM`); the second period's pair appears with its duration and its Start **is** the first period's End
 *    (`09:00 / 10:00 / 10:00 / 10:30`, `-probe-3.log` R5, `-probe-5.log` S3), which is also what the two writes carry.
 *    `[MEASURED]`
 * 25. **An armed refusal leaves four named lines in the console, not one.** Refusing the `POST /api/timesheet/time-log`
 *    with 400 and then 500 printed, for each status, the client's own
 *    `[HttpClient] HTTP Error: POST … 400/500` plus `Mutation failed: ApiError: this file refused the call`
 *    (`mutation-error-toaster.tsx:48`), `Error: this file refused the call` (`use-create-timesheet.ts:63`) and
 *    `Failed to create timesheet: ApiError: …` (`add-mask-modal.tsx:437`, `:453`). Test 9 excuses exactly those lines,
 *    each excuse carrying **this file's own refusal message** (`… ApiError: this file refused the call`) so that an
 *    unarmed mutation failure cannot hide in the excuse, and still fails on anything else. The accepted spec's
 *    `Mutation failed: Error: Failed to update time-log` excuse is **not** used here: this file arms no PUT, so that
 *    line never appears (`suites/lane-b/member-timesheet-report-ui.spec.ts:1074`). `[MEASURED]`
 *
 * 26. **A dialog footer is outside the lane viewport, so the viewport is raised before the dialog opens.** The
 *    overlay is `div.fixed.inset-0 flex items-center justify-center p-4` with no scroll container
 *    (`common/modal.tsx:86`) — the accepted spec states it as its finding 8
 *    (`suites/lane-b/member-timesheet-report-ui.spec.ts:162-165`) and this file measured the same on its own run
 *    (`-measure-3.log`: the 8 second click at 1280x720 timed out on the Add time `Save`, the click after
 *    `setViewportSize` landed). `dialogFooterViewport` therefore sets 1280x1100 at the start of every test that
 *    clicks a dialog footer (2, 3, 5, 6, 9), and each footer button is then clicked once — no attempt-and-fallback
 *    path is left in the file. `[MEASURED]`
 * 27. **Row and lock counts are computed from the served store, not counted off the page.**
 *    `servedRowCountOf` / `servedEntryRowCountOf` derive them from `similarWorkKeyOf`
 *    (`timesheet-entry-groups.ts:30-38`, member | task | project | billable) and `SheetRowIdentity`
 *    (`timesheets.ts:914-930`): the shown week's seven served logs print 5 grouped rows and 7 entry rows, the
 *    member's own six print the sheet's 4 body rows, and the opened week's one log prints the 1 row test 5 adds
 *    to. Each derived number is asserted on the page web-first before it is used as a baseline. `[MEASURED]`
 *
 * ## What this file could not measure
 *
 * - **`SHEET.EDIT.LOCK_RUNNING`** ("A timer is running on this task today.") is named but never asserted: the served
 *   store holds no `isRunning:true` log (`servedLogs` sets `isRunning:false` on every entry) and `hasRunningLog`
 *   (`timesheet-sheet-edit.ts:470-476`) reads only the cell's own logs, so no served week here can show it. Test 4's
 *   shell timer runs on the reader's own today, which lies in the opened week, not in the served weeks those sheet
 *   cases walk.
 * - **`T.MORE_LOGS`** (`N more logs`, `VISIBLE_CARDS = 6`) is not reachable: the busiest served day holds 4 entries.
 *   **`T.OPEN_DAY`** (`Show {day} in the list`) belongs to the **Month** view's day cells (`timesheets-calendar.tsx:275`);
 *   this file exercises the Week view only, whose cards call the same handler without naming it.
 * - **`timeEntryActions.duplicate.OVERLAPS` / `CHECK_FAILED`** (the Duplicate dialog's own `checkBeforeSave` refusal and
 *   its `refusalOfOverlap` wording) were not armed: test 9 refuses the **transport** (400, then 500), not the overlap
 *   guard. `state.conflicts` exists in the store for exactly that and stays unused here.
 * - **`SHEET.COPY.NO_OPEN_CELL`, `SHEET.COPY.NOTHING`, `SHEET.COPY.READ_FAILED`** and the group row's `Delete`
 *   confirmation (`SIMILAR.REJECT_COUNT`, the page's delete dialog for a whole group) were not armed or clicked.
 * - The `SheetEditNotice` wording for a sheet locked by a filter or by `manualTimeOff`
 *   (`timesheets-sheet-tools.tsx:233-247`) is unreachable on this lane: the mock never turns `allowManualTime` off
 *   (`mock-gauzy-server.mjs:95`), and the accepted spec records the same (its finding 12).
 */

const MEMBER_PAGE = (memberId: string) => `/reports/timesheet/${memberId}`;
const LOGS_PATH = '/api/timesheet/time-log';
const STATUS_PATH = '/api/timesheet/status';
/** `getTimeLogConflicts` (`time-log.service.ts:228-269`) — the lookup every manual write runs before it saves. */
const CONFLICT_PATH = '/api/timesheet/time-log/conflict';
/** The client's axios base already holds `/api`, so a logged failure names the path without it. */
const LOGGED_LOGS_PATH = '/timesheet/time-log';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
/** The workspace chose no formats on this lane, which is what every rebuilt string below assumes. */
const WORKSPACE_LOCALE = 'en';
/** `use-add-time-access.ts`: the permission that makes a member's own Add time possible. */
const MANUAL_TIME_PERMISSION = 'ALLOW_MANUAL_TIME';
/**
 * The fixture's project name. The bootstrap fixture carries `ids.project` but **no** `names.project` (`/fixture` on the
 * control port answers `workspaceA/B, organizationA/B, teamA/B, user, teammate, denied, task` only), while the mock's
 * own project is named here: `mock-gauzy-server.mjs:228` `name: 'Fixture Project'`. The sibling
 * `manual-time-edits-report-ui.spec.ts:609` serves the same literal.
 */
const PROJECT_NAME = 'Fixture Project';

type Copy = Record<string, string>;
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	dashboard: {
		period: Copy;
		states: Copy;
		workDiary: Copy;
		timesheets: Copy & {
			SIMILAR: Copy;
			BULK_EDIT: Copy;
			CHANGE: Copy;
			COLUMNS: Copy;
			diary: Copy;
			reject: Copy;
			SHEET: Copy & { EDIT: Copy; COPY: Copy };
			STATUS: Copy;
			STATUS_CARDS: Copy;
			VIEWS: Copy;
		};
	};
	common: Copy;
	manualTime: Copy & { DURATION: Copy };
	clients: Copy;
	dailyPlan: Copy;
	modals: { timeLog: Copy };
	pages: { timesheet: Copy & { BILLABLE: Copy }; unauthorized: Copy };
	timeOverlap: Copy;
	timeZoneNotice: Copy;
	toasts: Copy & { REASONS: Copy; time: Copy };
	timer: { labels: Copy };
};
const T = EN.dashboard.timesheets;
const REA = (
	EN as unknown as {
		timeEntryActions: {
			CONTINUE: string;
			DUPLICATE: string;
			ALREADY_RUNNING: string;
			duplicate: { OVERLAPS: string; CHECK_FAILED: string };
		};
	}
).timeEntryActions;
const PERIOD = EN.dashboard.period;
const C = EN.common;
const TIMESHEET_PAGE = EN.pages.timesheet;
const TOASTS = EN.toasts;
/** The shell timer button names itself by the hotkey copy (`timer-button.tsx:39` `hotkeys.STOP_TIMER`). */
const HOTKEYS = (EN as unknown as { hotkeys: { STOP_TIMER: string } }).hotkeys;

/** `{count, plural, one {…} other {…}}` and `{hole}` templates filled the way next-intl fills them. */
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

const report = (label: string, value: unknown) =>
	console.log(`[lane-b member timesheet] MEASURE ${label} ${JSON.stringify(value)}`);

/* ------------------------------------------------------------------ the clock this file serves

`at(offset, hour, minute)` is an instant on the local day `offset` days from the day the run runs on, and `atOn` puts
one on a named calendar day. Nothing here names a date. */

const pad = (value: number) => String(value).padStart(2, '0');
const isoOf = (date: Date) => date.toISOString();
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

const formatWith = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(WORKSPACE_LOCALE, options);
/** The calendar day an instant is on in `zone`, as `YYYY-MM-DD`. */
const zoneDayKeyOf = (instant: Date | string, zone: string) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
		new Date(instant)
	);
const zoneTodayKeyOf = (zone: string) => zoneDayKeyOf(new Date(), zone);
const zoneDayKeyShifted = (zone: string, offset: number) => {
	const today = new Date(`${zoneTodayKeyOf(zone)}T12:00:00Z`);
	today.setUTCDate(today.getUTCDate() + offset);
	return zoneDayKeyOf(today, 'UTC');
};
const WEEKDAY_INDEX: Record<string, number> = {
	Sunday: 0,
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6
};
/** The week `thisWeekOf` builds (`use-manual-time-edits-report.ts:59-61`): Monday 00:00 … Sunday 23:59:59.999 **in the profile zone**. */
const weekOfZone = (zone: string, weeksFromNow = 0) => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: zone,
		weekday: 'long',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date());
	const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? '';
	const today = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`);
	const sinceMonday = (WEEKDAY_INDEX[part('weekday')] + 6) % 7;
	const monday = new Date(today);
	monday.setUTCDate(monday.getUTCDate() - sinceMonday + weeksFromNow * 7);
	return weekOfMonday(monday);
};
/** The same shape `weekOfZone` returns, built from a Monday (a Date at UTC noon on that calendar day). */
function weekOfMonday(monday: Date) {
	const sunday = new Date(monday);
	sunday.setUTCDate(sunday.getUTCDate() + 6);
	const key = (day: Date) => `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
	return {
		fromKey: key(monday),
		toKey: key(sunday),
		from: `${key(monday)}T00:00:00.000Z`,
		to: `${key(sunday)}T23:59:59.999Z`,
		fromDate: new Date(`${key(monday)}T12:00:00Z`),
		toDate: new Date(`${key(sunday)}T12:00:00Z`)
	};
}
type ServedWeek = ReturnType<typeof weekOfZone>;
/** `week` moved by whole weeks, named by the same zone: `setUTCDate` on its own Monday, never a millisecond step. */
const shiftWeek = (week: ServedWeek, weeks: number) => {
	const monday = new Date(`${week.fromKey}T12:00:00Z`);
	monday.setUTCDate(monday.getUTCDate() + weeks * 7);
	return weekOfMonday(monday);
};
/** Whole `Next period` steps from the earlier week `from` to the later week `to` (0 when they are the same week). */
const weeksForwardOf = (from: ServedWeek, to: ServedWeek) => {
	const cursor = new Date(`${from.fromKey}T12:00:00Z`);
	const target = new Date(`${to.fromKey}T12:00:00Z`);
	let steps = 0;
	while (cursor.getTime() < target.getTime()) {
		cursor.setUTCDate(cursor.getUTCDate() + 7);
		steps += 1;
	}
	return steps;
};
/** Whole `Previous period` steps from the week the page opens on to `week` (a positive count: `week` is in the past). */
const weeksBackOf = (week: ServedWeek) => weeksForwardOf(week, weekOfZone('UTC'));
/**
 * The week the served logs live in: **a whole week before** the one the page opens on (`initialPeriodFor`,
 * `use-timesheets-page.ts:158-162`), one step further back whenever that week is the one a month ends inside. Every
 * one of its seven days is in the past whatever weekday the run runs on, so no served log is ever a day after today,
 * and the same three calendar days of it are served on a Monday as on a Sunday. Its seven days lie in **one month**:
 * the Month view grows the shown period to `startOfMonth(period.from) … endOfMonth(period.from)`
 * (`periodForView`, `timesheets.ts:564-588`) and that period then *stays*, so a served week split across two months
 * would leave part of the served logs outside every period walked after the Month view. A month boundary can sit
 * inside one whole week only, so one extra step is always enough.
 */
const servedWeek = () => {
	const oneBack = weekOfZone('UTC', -1);
	return oneBack.fromKey.slice(0, 7) === oneBack.toKey.slice(0, 7) ? oneBack : weekOfZone('UTC', -2);
};
/** The seven calendar days of `week`, oldest first, as the `YYYY-MM-DD` keys its own zone names them by. */
const dayKeysOf = (week: ServedWeek) =>
	Array.from({ length: 7 }, (_, index) => {
		const day = new Date(`${week.fromKey}T12:00:00Z`);
		day.setUTCDate(day.getUTCDate() + index);
		return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
	});
/** An instant on the calendar day `dayKey`, at `hour:minute` of the browser's own zone (the zone `at` builds in). */
const atOn = (dayKey: string, hour: number, minute = 0) => {
	const [year, month, day] = dayKey.split('-').map(Number);
	return new Date(year, month - 1, day, hour, minute, 0, 0);
};

/** `formatPeriod` (`core/lib/utils/dashboard-period.ts:147-158`) read back in the zone the period's bounds are in. */
const periodTextOf = (fromIso: string, toIso: string, zone: string) =>
	flat(
		new Intl.DateTimeFormat(WORKSPACE_LOCALE, { month: 'short', day: 'numeric', timeZone: zone }).formatRange(
			new Date(fromIso),
			new Date(toIso)
		)
	);
const shortDayOf = (instant: Date | string, zone: string) =>
	formatWith({ month: 'short', day: 'numeric', timeZone: zone }).format(new Date(instant));
/** `DayName`'s day part (`timesheet-day-label.ts`): Today / Yesterday, else the short weekday, then the date. */
const dayLabelOf = (instant: Date | string, zone: string) => {
	const key = zoneDayKeyOf(instant, zone);
	const name =
		key === zoneTodayKeyOf(zone)
			? C.TODAY
			: key === zoneDayKeyShifted(zone, -1)
				? C.YESTERDAY
				: formatWith({ weekday: 'long', timeZone: zone }).format(new Date(instant));
	return copy(T.DAY_LABEL, { day: name, date: shortDayOf(instant, zone) });
};
/** `TimesheetFormatters.time` (`dashboards/timesheets.ts:598-611`): the page's clock is the **browser's** zone. */
const clockOf = (date: Date) => formatWith({ hour: '2-digit', minute: '2-digit' }).format(date);
const timeRangeOf = (from: Date, to: Date) => `${clockOf(from)} – ${clockOf(to)}`;
/** `formatDurationShort` (`core/lib/utils/dashboard-figures.ts:19-22`): minutes are **not** padded ("2h 0m"). */
const durationOf = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

/* ------------------------------------------------------------------ the served store */

type Fixture = { ids: Record<string, string>; names: Record<string, string> };
type ServedLog = Record<string, unknown>;
type ServedCall = {
	method: string;
	path: string;
	search: string;
	params: Record<string, string>;
	body: Record<string, unknown> | null;
	frameUrl: string;
};
type ServedState = { logs: ServedLog[]; conflicts: ServedLog[]; refusals: Record<string, number> };
type ServedApi = {
	calls: ServedCall[];
	state: ServedState;
	reads: (path?: string) => ServedCall[];
	writes: () => ServedCall[];
};

const employeeOf = (id: string, fullName: string, userId: string) => ({
	id,
	fullName,
	firstName: fullName.split(' ')[0],
	lastName: fullName.split(' ').slice(1).join(' '),
	user: { id: userId }
});

const paramsOf = (url: URL) => {
	const params: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		params[key] = value;
	});
	return params;
};

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated on every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/**
 * Every `/api/timesheet/time-log`, `/api/timesheet/time-log/conflict`, `/api/timesheet/status` read and write, served
 * from a mutable store: `refusals` maps `"<method> <path>"` to the status to answer with, and can be changed mid-test.
 */
async function serveTimesheetApi(page: Page, state: ServedState): Promise<ServedApi> {
	const calls: ServedCall[] = [];
	const jsonHeaders = { ...CORS_HEADERS, 'content-type': 'application/json' };

	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === LOGS_PATH || url.pathname === STATUS_PATH || url.pathname.startsWith(`${LOGS_PATH}/`)),
		async (route) => {
			const request = route.request();
			const url = new URL(request.url());
			const method = request.method();
			const path = url.pathname;
			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });

			const params = paramsOf(url);
			let body: Record<string, unknown> | null = null;
			try {
				const posted = request.postData();
				body = posted ? (JSON.parse(posted) as Record<string, unknown>) : null;
			} catch {
				body = null;
			}
			calls.push({ method, path, search: url.search, params, body, frameUrl: request.frame().url() });

			const refusal = state.refusals[`${method} ${path}`];
			if (refusal) {
				return route.fulfill({
					status: refusal,
					headers: jsonHeaders,
					body: JSON.stringify({ statusCode: refusal, message: 'this file refused the call' })
				});
			}

			if (method === 'GET' && path === LOGS_PATH) {
				const asked = Object.entries(params)
					.filter(([name]) => name.startsWith('employeeIds['))
					.sort(
						([a], [b]) =>
							Number(a.slice('employeeIds['.length, -1)) - Number(b.slice('employeeIds['.length, -1))
					)
					.map(([, value]) => value);
				const from = params['startDate'];
				const to = params['endDate'];
				const logs = state.logs.filter((log) => {
					if (asked.length && !asked.includes(String(log.employeeId))) return false;
					const startedAt = new Date(String(log.startedAt)).getTime();
					if (from && startedAt < new Date(from).getTime()) return false;
					if (to && startedAt > new Date(to).getTime()) return false;
					return true;
				});
				return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(logs) });
			}

			if (method === 'GET' && path === CONFLICT_PATH) {
				return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(state.conflicts) });
			}

			if (method === 'PUT' && path === STATUS_PATH) {
				const ids = (body?.ids ?? []) as string[];
				const status = String(body?.status ?? '');
				const reason = body?.reason;
				state.logs = state.logs.map((log) =>
					ids.includes(String(log.timesheetId)) || ids.includes(String(log.id))
						? { ...log, timesheet: { ...(log.timesheet as object), status, ...(reason ? { reason } : {}) } }
						: log
				);
				return route.fulfill({
					status: 200,
					headers: jsonHeaders,
					body: JSON.stringify(ids.map((id) => ({ id, status })))
				});
			}

			if (method === 'DELETE' && path === LOGS_PATH) {
				const ids = Object.entries(params)
					.filter(([name]) => name.startsWith('logIds['))
					.map(([, value]) => value);
				state.logs = state.logs.filter((log) => !ids.includes(String(log.id)));
				return route.fulfill({
					status: 200,
					headers: jsonHeaders,
					body: JSON.stringify({ success: true, message: `deleted ${ids.length}` })
				});
			}

			if (method === 'PUT' && path.startsWith(`${LOGS_PATH}/`)) {
				const id = path.slice(LOGS_PATH.length + 1);
				const log = state.logs.find((candidate) => String(candidate.id) === id);
				if (!log) {
					return route.fulfill({
						status: 404,
						headers: jsonHeaders,
						body: JSON.stringify({ statusCode: 404, message: 'no such log' })
					});
				}
				const merged = { ...log, ...(body ?? {}) };
				merged.duration = Math.round(
					(new Date(String(merged.stoppedAt)).getTime() - new Date(String(merged.startedAt)).getTime()) / 1000
				);
				state.logs = state.logs.map((candidate) => (String(candidate.id) === id ? merged : candidate));
				return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(merged) });
			}

			if (method === 'POST' && path === LOGS_PATH) {
				const newId = `suite-new-${state.logs.length + 1}`;
				// The answer names back the task and project the request named, exactly as the served logs carry them:
				// a sheet row takes its title from its **latest** log (`weekSheetOf` → `rowIdentityOfLog(latestLogOf(…))`,
				// `core/lib/utils/dashboards/timesheets.ts:1138-1146`), so a created log carrying no `task` would rename
				// its whole row to `NO_TASK` whenever the written day is the row's newest one — which day that is depends
				// on the served days, so it must never depend on it.
				const namedTask = state.logs.find(
					(log) => String(log.taskId ?? '') === String((body ?? {}).taskId ?? '')
				);
				const namedProject = state.logs.find(
					(log) => String(log.projectId ?? '') === String((body ?? {}).projectId ?? '')
				);
				const created = {
					...(body ?? {}),
					id: newId,
					duration: Math.round(
						(new Date(String((body ?? {}).stoppedAt)).getTime() -
							new Date(String((body ?? {}).startedAt)).getTime()) /
							1000
					),
					isRunning: false,
					logType: (body ?? {}).logType ?? 'MANUAL',
					source: (body ?? {}).source ?? 'TEAMS',
					employee: state.logs[0]?.employee,
					task: namedTask?.task ?? null,
					project: namedProject?.project ?? null,
					timesheetId: newId,
					timesheet: { id: newId, status: 'PENDING' }
				};
				state.logs = [...state.logs, created];
				return route.fulfill({ status: 201, headers: jsonHeaders, body: JSON.stringify(created) });
			}

			return route.fulfill({
				status: 404,
				headers: jsonHeaders,
				body: JSON.stringify({ statusCode: 404, message: `this file has no handler for ${method} ${path}` })
			});
		}
	);

	return {
		calls,
		state,
		reads: (path?: string) => calls.filter((call) => call.method === 'GET' && (!path || call.path === path)),
		writes: () => calls.filter((call) => call.method !== 'GET' && call.method !== 'OPTIONS')
	};
}

/**
 * Steps the page from the week it opens on onto the week the served logs live in, and waits until the read the page
 * made names that week. One `Previous period` step per whole week between them (`servedWeek` is one back, two when a
 * month ends inside the week one back), on every weekday.
 */
const openServedWeek = async (page: Page, api: ServedApi, week: ServedWeek) => {
	const previousButton = page
		.getByRole('group', { name: PERIOD.LABEL, exact: true })
		.getByRole('button', { name: PERIOD.PREVIOUS, exact: true });
	for (let step = weeksBackOf(week); step > 0; step -= 1) {
		await previousButton.click({ timeout: 15_000 });
	}
	await expect.poll(() => api.reads(LOGS_PATH).at(-1)?.params['startDate'], { timeout: 30_000 }).toBe(week.from);
	return week;
};

/** The store holds plain objects, so every nested read of a served log is a typed cast. */
const taskTitleOf = (log: ServedLog, fallback: string) => {
	const task = log.task as Record<string, unknown> | null;
	return task ? String(task.title) : fallback;
};

/* ------------------------------------------------------------------ the page's parts */

const viewTabs = (page: Page) => page.getByRole('tablist', { name: T.VIEW_LABEL, exact: true });
const addTimeButtons = (page: Page) => page.getByRole('button', { name: T.ADD_TIME, exact: true });
const openMenu = (page: Page) => page.locator('[role=menu]:visible');
/** Every dialog of this page, found by a text it shows — finding 7. */
const dialogOf = (page: Page, text: string) => page.locator('[role=dialog]').filter({ hasText: text });
const dialogCount = (page: Page, text: string) => dialogOf(page, text).count();
/**
 * The dialogs of this page are centred in an overlay with no scroll container (`common/modal.tsx:86`), so at the
 * lane's 1280x720 viewport a dialog footer sits outside the viewport and Playwright cannot click it — the accepted
 * spec states it as its finding 8 (`suites/lane-b/member-timesheet-report-ui.spec.ts:162-165`), and this file
 * measured the same (`-measure-3.log`: the 8 second lane-viewport click timed out, the click after
 * `setViewportSize` landed). A test that clicks a dialog footer therefore raises the viewport to the measured
 * height before it opens anything, so the click is one deterministic action with no fallback path.
 */
const dialogFooterViewport = (page: Page) => page.setViewportSize({ width: 1280, height: 1_100 });
const clickDialogButton = async (button: Locator) => {
	await button.click({ timeout: 20_000 });
};

const textOf = async (locator: Locator) => flat(await locator.evaluate((node: Element) => node.textContent ?? ''));
const cellsOf = (row: Locator) =>
	row.evaluate((node: Element) =>
		Array.from(node.querySelectorAll('[role=cell], [role=rowheader]')).map((cell) =>
			(cell.textContent ?? '').replace(/\s+/g, ' ').trim()
		)
	);

/**
 * The Billable submenu marks the value a log already has with the copy `common.SELECTED`, and a menu row's
 * accessible name is `<name> <secondary text>` — so the chosen value is read out of the single row that carries
 * the mark (`-probe-3.log` R6 read `["YesSelected", "No"]`: the mark is appended with no separator).
 */
const selectedMenuItem = (items: string[]) => {
	const mark = C.SELECTED;
	const marked = items.filter((item) => item.includes(mark));
	return marked.length === 1 ? marked[0].slice(0, marked[0].indexOf(mark)) : '';
};

const pickOption = async (page: Page, picker: Locator, wanted: string) => {
	await picker.click();
	await expect
		.poll(() => page.locator('[role=option]:visible, [role=menuitem]:visible').count(), { timeout: 15_000 })
		.toBeGreaterThan(0);
	await page.locator('[role=option]:visible, [role=menuitem]:visible').filter({ hasText: wanted }).first().click();
	await expect.poll(() => textOf(picker), { timeout: 20_000 }).toContain(wanted);
};

/* ------------------------------------------------------------------ the console, excused only by name

React's dev-mode store warning (`suites/lane-a/api-tokens-settings-ui.spec.ts:405-430`) and the dev warning
`edit-task-modal.tsx:360`'s `DatePickerFilter` triggers (finding 13) are excused by name; nothing else is. */

const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const DATE_PICKER_NESTED_BUTTON = 'cannot be a descendant of';
/* React prints one DOM-nesting violation as a *pair* of logs: the descendant one (excused above) and an ancestor one
 * reading `<%s> cannot contain a nested %s. / See this log for the ancestor stack trace. button <button>`. Both come
 * from the date picker's own `<button data-slot="button">` inside the popover trigger
 * `<button data-slot="popover-trigger">`, so the second half is excused by its own exact wording — the pair and its
 * wording are the accepted spec's, copied verbatim from `suites/lane-b/member-timesheet-report-ui.spec.ts:1063-1068`
 * (its finding 20, `:219-224`), which names the component the same way and nothing beyond it. */
const DATE_PICKER_NESTED_ANCESTOR = 'cannot contain a nested';
/* The accepted spec also excuses `Mutation failed: Error: Failed to update time-log` there
 * (`mutation-error-toaster.tsx:48` printing the `time-log.service.ts:442` throw of a refused **PUT**), and this file
 * arms no PUT, so that line is **not** excused here: what an armed refusal of a `POST` prints is named in the spec
 * itself, with this file's own refusal message in it, so an unarmed mutation failure cannot hide in it. */
const consoleFindings = (shield: Shield) =>
	shield
		.consoleErrors()
		.filter(
			(line) =>
				!line.includes(SHELL_STORE_NOISE) &&
				!(line.includes(DATE_PICKER_NESTED_BUTTON) && line.includes('DatePickerFilter')) &&
				!line.includes(DATE_PICKER_NESTED_ANCESTOR)
		);

/* ------------------------------------------------------------------ this file's served store

Two whole weeks: `shown`, the week the tests step the page onto, and `last`, the whole week behind it (the one
`useCopyPreviousWeek` reads as "last week", `use-copy-previous-week.ts:66-70`). Days are named by their index in a week
(Monday 0 … Sunday 6, `dayKeysOf`), never as an offset from today. */

type ServedWeeks = { shown: ServedWeek; last: ServedWeek };
const servedWeeks = (): ServedWeeks => {
	const shown = servedWeek();
	return { shown, last: shiftWeek(shown, -1) };
};
/** The week the page opens on: `initialPeriodFor` names it in the profile zone, and the mock profile is UTC. */
const openedWeekOf = () => weekOfZone('UTC');
/** The whole week after the opened one: every day of it is a day after today, on any weekday. */
const futureWeekOf = () => shiftWeek(weekOfZone('UTC'), 1);

/* Every served task title is named here once and used by `servedLogs` and by the assertions alike. */
const GROUP_TASK_TITLE = 'Suite group task';
const APPROVED_TASK_TITLE = 'Suite approved task';
const COPY_TASK_A_TITLE = 'Suite copy task A';
const COPY_TASK_B_TITLE = 'Suite copy task B';
const TEAMMATE_TASK_TITLE = 'Suite teammate task';
const GROUP_TASK = 'suite-group-task';
const APPROVED_TASK = 'suite-approved-task';
const COPY_TASK_A = 'suite-copy-task-a';
const COPY_TASK_B = 'suite-copy-task-b';

const servedLogs = (fixture: Fixture, weeks: ServedWeeks): ServedLog[] => {
	const own = fixture.ids.employee;
	const teammate = fixture.ids.teammateEmployee;
	const project = { id: fixture.ids.project, name: PROJECT_NAME, color: '#22c55e' };
	const shown = dayKeysOf(weeks.shown);
	const last = dayKeysOf(weeks.last);
	const opened = dayKeysOf(weekOfZone('UTC'));
	const future = dayKeysOf(shiftWeek(weekOfZone('UTC'), 1));
	const logOf = (options: {
		id: string;
		employeeId: string;
		userId: string;
		fullName: string;
		days: string[];
		dayIndex: number;
		startHour: number;
		startMinute: number;
		seconds: number;
		status: string;
		isBillable: boolean;
		taskId?: string;
		taskTitle?: string;
		notes?: string | null;
	}) => {
		const startedAt = atOn(options.days[options.dayIndex], options.startHour, options.startMinute);
		const stoppedAt = new Date(startedAt.getTime() + options.seconds * 1000);
		return {
			id: options.id,
			startedAt: isoOf(startedAt),
			stoppedAt: isoOf(stoppedAt),
			duration: options.seconds,
			logType: 'MANUAL',
			source: 'TEAMS',
			isBillable: options.isBillable,
			isRunning: false,
			version: '1',
			employeeId: options.employeeId,
			employee: employeeOf(options.employeeId, options.fullName, options.userId),
			taskId: options.taskId ?? null,
			task: options.taskId ? { id: options.taskId, title: options.taskTitle, taskNumber: null } : null,
			projectId: options.taskId ? fixture.ids.project : null,
			project: options.taskId ? project : null,
			timesheetId: `sheet-${options.id}`,
			timesheet: { id: `sheet-${options.id}`, status: options.status },
			notes: options.notes ?? null,
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA
		};
	};
	const ownOf = (options: Omit<Parameters<typeof logOf>[0], 'employeeId' | 'userId' | 'fullName'>) =>
		logOf({ ...options, employeeId: own, userId: fixture.ids.user, fullName: fixture.names.user });

	return [
		// shown week, Monday: three entries of the fixture task — two that record the same work and one whose billable
		// state differs, so the day holds one group row and one entry row.
		ownOf({
			id: 'own-mon-a',
			days: shown,
			dayIndex: 0,
			startHour: 9,
			startMinute: 0,
			seconds: 7200,
			status: 'PENDING',
			isBillable: true,
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task
		}),
		ownOf({
			id: 'own-mon-b',
			days: shown,
			dayIndex: 0,
			startHour: 13,
			startMinute: 0,
			seconds: 3930,
			status: 'PENDING',
			isBillable: true,
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task
		}),
		ownOf({
			id: 'own-mon-c',
			days: shown,
			dayIndex: 0,
			startHour: 15,
			startMinute: 0,
			seconds: 1800,
			status: 'PENDING',
			isBillable: false,
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task
		}),
		// shown week, Tuesday: the member's only APPROVED entry, on a task of its own.
		ownOf({
			id: 'own-tue-approved',
			days: shown,
			dayIndex: 1,
			startHour: 10,
			startMinute: 0,
			seconds: 3600,
			status: 'APPROVED',
			isBillable: true,
			taskId: APPROVED_TASK,
			taskTitle: APPROVED_TASK_TITLE
		}),
		// shown week, Wednesday: a second group of two, on the same task, and one entry on a task of its own.
		ownOf({
			id: 'own-wed-a',
			days: shown,
			dayIndex: 2,
			startHour: 9,
			startMinute: 0,
			seconds: 3600,
			status: 'PENDING',
			isBillable: true,
			taskId: GROUP_TASK,
			taskTitle: GROUP_TASK_TITLE
		}),
		ownOf({
			id: 'own-wed-b',
			days: shown,
			dayIndex: 2,
			startHour: 14,
			startMinute: 0,
			seconds: 2730,
			status: 'PENDING',
			isBillable: true,
			taskId: GROUP_TASK,
			taskTitle: GROUP_TASK_TITLE
		}),
		logOf({
			id: 'teammate-mon',
			employeeId: teammate,
			userId: fixture.ids.teammateUser,
			fullName: fixture.names.teammate,
			days: shown,
			dayIndex: 0,
			startHour: 11,
			startMinute: 0,
			seconds: 5400,
			status: 'PENDING',
			isBillable: true,
			taskId: 'suite-teammate-task',
			taskTitle: TEAMMATE_TASK_TITLE
		}),
		// last week: what "Copy last week" finds — two tasks of its own and one entry on the fixture task.
		ownOf({
			id: 'last-copy-a',
			days: last,
			dayIndex: 0,
			startHour: 9,
			startMinute: 0,
			seconds: 5400,
			status: 'PENDING',
			isBillable: true,
			taskId: COPY_TASK_A,
			taskTitle: COPY_TASK_A_TITLE
		}),
		ownOf({
			id: 'last-copy-b',
			days: last,
			dayIndex: 1,
			startHour: 10,
			startMinute: 0,
			seconds: 3600,
			status: 'PENDING',
			isBillable: true,
			taskId: COPY_TASK_B,
			taskTitle: COPY_TASK_B_TITLE
		}),
		ownOf({
			id: 'last-fixture',
			days: last,
			dayIndex: 2,
			startHour: 9,
			startMinute: 0,
			seconds: 2700,
			status: 'PENDING',
			isBillable: true,
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task
		}),
		// the week the page opens on (the one that holds today): its Monday is a past day of that week, so it is the
		// row test 8 finds there, and the days after today in the same week are the ones that carry `LOCK_FUTURE`.
		ownOf({
			id: 'ahead-mon',
			days: opened,
			dayIndex: 0,
			startHour: 9,
			startMinute: 0,
			seconds: 3600,
			status: 'PENDING',
			isBillable: true,
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task
		}),
		// the week after the one the page opens on: all seven of its days are a day after today, on any weekday.
		ownOf({
			id: 'future-mon',
			days: future,
			dayIndex: 0,
			startHour: 9,
			startMinute: 0,
			seconds: 3600,
			status: 'PENDING',
			isBillable: true,
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task
		})
	];
};

const newStore = (
	fixture: Fixture,
	weeks: ServedWeeks,
	refusals: Record<string, number> = {},
	conflicts: ServedLog[] = []
): ServedState => ({ logs: servedLogs(fixture, weeks), refusals, conflicts });

/* ------------------------------------------------------------------ the locators and literals this file drives

`role=row aria-selected` is only a List-view log row or a group row; a sheet row has `role=row` **without**
`aria-selected`, and the sheet table is named `SHEET.TABLE_LABEL`, not `T.TITLE` — so `table(page)` / `logRows(page)`
of the copied harness cannot see the sheet, which is read through `sheetTable` instead.

Two literals are not copy keys and are named as literals (finding 15 of the accepted member-timesheet spec records
the same lines): the Add time notes field `aria-label="Insert notes here"` (`add-mask-modal.tsx:581`) and its
duration input `placeholder="1:30 or 90m"`. The third literal that spec lists, the Start / End
`placeholder="00:00:00"` (`:859`, `:868`), is not a locator this file can use: the picker never puts it on an
input (finding 17), so the clocks are read out of the dialog fields themselves. */

const GROUP_SIMILAR_ENTRIES_STORAGE_KEY = 'timesheets-group-similar-entries'; // use-similar-entry-grouping.ts:6
const VIEW_STORAGE_KEY = 'timesheets-view'; // use-timesheets-page.ts:75
const ADD_TIME_NOTES_ARIA = 'Insert notes here';
const ADD_TIME_DURATION_PLACEHOLDER = '1:30 or 90m';
/**
 * The clock a period's Start / End field holds. `ShiftTimingSelect` is given `placeholder="00:00:00"`
 * (`add-mask-modal.tsx:859`, `:868`) but the picker renders it as a `combobox` over an input whose
 * `placeholder` is empty and whose value is the clock (`-measure-2.log`: `input|||12:35:00 PM`), so the value is
 * read out of the dialog fields, never out of a placeholder.
 */
const timeFieldValuesOf = (fields: string[]) =>
	fields.map((field) => field.split('|')[3] ?? '').filter((value) => /^\d{1,2}:\d{2}:\d{2}\s?(AM|PM)$/.test(value));
const browserZoneOf = (page: Page) => page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
const listRows = (page: Page) => page.locator('[role=row][aria-selected]');
const groupRow = (page: Page, taskTitle: string, count: number) =>
	listRows(page).filter({
		has: page.getByRole('checkbox', { name: copy(T.SIMILAR.SELECT_GROUP, { count, task: taskTitle }) })
	});
const entryRow = (page: Page, taskTitle: string) =>
	listRows(page).filter({ has: page.getByRole('checkbox', { name: copy(T.SELECT_LOG, { task: taskTitle }) }) });
const rowByTotal = (page: Page, seconds: number) =>
	listRows(page).filter({ has: page.getByText(durationOf(seconds), { exact: true }) });
/**
 * The rows this file's own store must produce for `week`, derived from what was served and never counted off the
 * page: the List view groups by `similarWorkKeyOf` (`timesheet-entry-groups.ts:30-38` — member, task, project,
 * billable) and the sheet by `SheetRowIdentity` (`timesheets.ts:914-930`), so one row per member + task +
 * billable state; with grouping off, or with a group opened, every served log is a row of its own. `employeeId`
 * narrows the count to one member, which is what a sheet table holds (`SHEET.TABLE_LABEL`); the List table holds
 * the whole period, teammates included.
 */
const servedLogsIn = (logs: ServedLog[], week: ServedWeek, employeeId?: string) => {
	const dayKeys = new Set(dayKeysOf(week));
	return logs.filter(
		(log) =>
			dayKeys.has(zoneDayKeyOf(String(log['startedAt']), 'UTC')) &&
			(employeeId === undefined || log['employeeId'] === employeeId)
	);
};
const servedRowCountOf = (logs: ServedLog[], week: ServedWeek, employeeId?: string) =>
	new Set(
		servedLogsIn(logs, week, employeeId).map(
			(log) => `${log['employeeId']}|${log['taskId']}|${log['isBillable'] === true}`
		)
	).size;
const servedEntryRowCountOf = (logs: ServedLog[], week: ServedWeek, employeeId?: string) =>
	servedLogsIn(logs, week, employeeId).length;
/** A cell of one row, named by the text that cell holds (`role=cell`, its accessible name). */
const rowCell = (row: Locator, name: string) => row.getByRole('cell', { name, exact: true });
/**
 * The cell a row holds its task in — which is also where `SIMILAR.ENTRY_COUNT` is printed, since `countText`
 * (`timesheet-entry-group-row.tsx:86`) lives inside it (`:132`). Both cell roles are searched because the row
 * prints its task cell as one of them.
 */
const rowTaskCell = (row: Locator, text: string) =>
	row.locator('[role=cell], [role=rowheader]').filter({ hasText: text });
/** One List row`s `More options` menu, opened; its items are then read from the open `menu` itself. */
const openRowMenu = async (page: Page, row: Locator) => {
	await row.getByRole('button', { name: C.MORE_OPTIONS, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => openMenu(page).getByRole('menuitem').count(), { timeout: 15_000 }).toBeGreaterThan(0);
};
/** The items of one open menu, in the order it prints them. */
const menuTexts = (menu: Locator) =>
	menu
		.getByRole('menuitem')
		.evaluateAll((nodes: Element[]) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
const sheetTable = (page: Page, memberName: string) =>
	page.getByRole('table', { name: copy(T.SHEET.TABLE_LABEL, { name: memberName }), exact: true });
const sheetCellInput = (page: Page, memberName: string, taskTitle: string, dayKey: string, zone: string) =>
	sheetTable(page, memberName).locator(
		`input[inputmode=decimal][aria-label="${copy(T.SHEET.EDIT.CELL_INPUT, { task: taskTitle, day: dayLabelOf(`${dayKey}T12:00:00Z`, zone) })}"]`
	);
const lockedCells = (page: Page, memberName: string, lockCopy: string) =>
	sheetTable(page, memberName).locator(`[role=cell][title="${lockCopy}"]`);
/**
 * Every element that says *why* a day column is closed: the read-only cell carries the lock title on itself
 * (`timesheets-sheet-cell.tsx:89`), and the cell that holds logs carries it on its entries button instead
 * (`:110`) — so one locked day column is exactly one such element, of one of those two shapes.
 */
const lockedDayColumns = (page: Page, memberName: string, lockCopy: string) =>
	sheetTable(page, memberName).locator(`[title="${lockCopy}"]`);

/**
 * A `SHEET.COPY` item names itself with its label *and* its hint (`"Rows" + "Last week's tasks, without time"`),
 * so the exact name the page computes is not the concatenation this file can read out of `textContent`
 * (`-measure-1.log`: `name: 'RowsLast week's tasks, without time'` matched nothing). The item is picked by the
 * part that is unique to it, and the match is proven unique before it is clicked.
 */
const pickMenuItem = async (page: Page, name: string) => {
	const item = openMenu(page).getByRole('menuitem', { name });
	await expect(item).toHaveCount(1, { timeout: 15_000 });
	await item.click({ timeout: 15_000 });
};
/** The Add time module is a first-time dynamic import (`timesheets-dialogs.tsx:11-14`, `ssr:false`); a cold lane needs
 *  far longer than the 20 s the copied `openDialog` waits (`-probe-1.log` P3, `-probe-2.log` Q1: 54.7 s). */
const openAddTimeDialog = async (page: Page) => {
	await expect.poll(() => dialogCount(page, C.ADD_TIME_ENTRY), { timeout: 90_000 }).toBeGreaterThanOrEqual(1);
	return dialogOf(page, C.ADD_TIME_ENTRY).first();
};
const toastsOf = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('li[data-sonner-toast], [data-slot=toast]')).map((node) =>
			(node.textContent ?? '').replace(/\s+/g, ' ').trim()
		)
	);
/** A hover pauses a sonner countdown, so a toast is read with the pointer parked away from the stack. The pause moves
 *  the pointer only — it waits for no data, and nothing is read out of it. */
const parkPointer = async (page: Page) => {
	await page.mouse.move(2, 2);
	await page.waitForTimeout(400);
};
const dialogHasToast = async (page: Page, needle: string) =>
	(await toastsOf(page)).some((toast) => toast.includes(needle));
const mockRequests = (page: Page, pathContains: string) => {
	const requests: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN || !url.pathname.includes(pathContains)) return;
		requests.push(`${request.method()} ${url.pathname}`);
	});
	return requests;
};
/** `armedFailurePattern` of the copied harness names a GET; a refused **write** logs the same line with its method. */
const armedWritePattern = (status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: POST ${LOGGED_LOGS_PATH}(\?\S*)? ${status} `);
const armedWriteLines = (shield: Shield, status: number) =>
	shield.consoleErrors().filter((line) => armedWritePattern(status).test(line));
/** The refusal this file arms answers with this message (`serveTimesheetApi`, `harness.ts:333`). */
const ARMED_REFUSAL_MESSAGE = 'this file refused the call';
/**
 * What the refusal this file arms prints in dev, each line named **with this file own refusal message in it**
 * (`-probe-2.log` Q7, `-measure-3.log`: `Mutation failed: ApiError: this file refused the call`,
 * `Failed to create timesheet: ApiError: …`, `Error: this file refused the call` — printed by
 * `mutation-error-toaster.tsx:48`, `add-mask-modal.tsx:437` and `:453`, `use-create-timesheet.ts:63`). A prefix
 * alone would excuse any mutation failure, armed or not, so the message is part of every excuse here.
 */
const ARMED_MUTATION_NOISE = [
	`Mutation failed: ApiError: ${ARMED_REFUSAL_MESSAGE}`,
	`Failed to create timesheet: ApiError: ${ARMED_REFUSAL_MESSAGE}`,
	`Error: ${ARMED_REFUSAL_MESSAGE}`
];
const consoleFindingsWithoutArmedWrites = (shield: Shield, statuses: number[]) =>
	consoleFindings(shield).filter(
		(line) =>
			!statuses.some((status) => armedWritePattern(status).test(line)) &&
			!ARMED_MUTATION_NOISE.some((noise) => line.includes(noise))
	);
/**
 * Whole `Next / Previous period` steps from `from` onto `to`, then `proof`, which says the page really shows
 * `to`. Whether a step is forward is read off the two weeks, never guessed. The proof cannot be "a read naming
 * `to`" for every view: a week the page already loaded is answered from its cache, and on the sheet view a
 * `Next period` click moves the table and sends **no read at all** (`-probe-7b.log`: after `Next` the seven day
 * columns named 23 .. 29 Nov, the group said "This week", and the read count stayed 2), so each caller names
 * the proof its own view gives.
 */
type WeekProof = (step: { api: ServedApi; readsBefore: number; week: ServedWeek }) => Promise<void>;
const stepWeeksTo = async (page: Page, api: ServedApi, from: ServedWeek, to: ServedWeek, proof: WeekProof) => {
	const group = page.getByRole('group', { name: PERIOD.LABEL, exact: true });
	const forward = to.fromKey > from.fromKey;
	const steps = forward ? weeksForwardOf(from, to) : weeksForwardOf(to, from);
	const readsBefore = api.reads(LOGS_PATH).length;
	for (let step = steps; step > 0; step -= 1) {
		await group
			.getByRole('button', { name: forward ? PERIOD.NEXT : PERIOD.PREVIOUS, exact: true })
			.click({ timeout: 15_000 });
	}
	// no step was taken, so there is no step of its own to prove; the caller names the week it is already on
	if (steps === 0) {
		return to;
	}
	await proof({ api, readsBefore, week: to });
	return to;
};
/**
 * Proof the **list** view moved: it sent its own read naming the week, counted from `readsBefore` so a read of
 * that same week sent before the step cannot stand in for it (`-probe-7b.log`: the list `Next` did send one,
 * naming 2026-11-30).
 */
const provedByARead: WeekProof = ({ api, readsBefore, week }) =>
	expect
		.poll(
			() =>
				api
					.reads(LOGS_PATH)
					.slice(readsBefore)
					.some((call) => (call.params['startDate'] ?? '').slice(0, 10) === week.fromKey),
			{
				timeout: 60_000
			}
		)
		.toBe(true);
/** The sheet's day columns, by the name each one is given (`T.SHEET.DAY_HEADER` = `{day}, {total}`). */
const sheetDayNamesOf = (sheet: Locator) =>
	sheet
		.getByRole('columnheader')
		.evaluateAll((nodes: Element[]) =>
			nodes.map((node) => node.getAttribute('aria-label') ?? '').filter((name) => name !== '')
		);
/**
 * Proof the **sheet** moved: its day columns are named after `week`'s seven days, in order. The total the name
 * carries is left out of the match on purpose — it is that week's own time, which this proof must not assume.
 */
const sheetShowsWeek = async (sheet: Locator, week: ServedWeek, browserZone: string) => {
	const expected = dayKeysOf(week).map((dayKey) =>
		copy(T.SHEET.DAY_HEADER, { day: dayLabelOf(`${dayKey}T12:00:00Z`, browserZone), total: '' })
	);
	await expect
		.poll(
			() =>
				sheetDayNamesOf(sheet).then((names) =>
					names.map((name) => expected.find((dayName) => name.startsWith(dayName)) ?? name)
				),
			{ timeout: 60_000 }
		)
		.toEqual(expected);
	report('sheet week columns', await sheetDayNamesOf(sheet));
};
const provedOnSheet =
	(sheet: Locator, browserZone: string): WeekProof =>
	({ week }) =>
		sheetShowsWeek(sheet, week, browserZone);
const openListView = async (page: Page) => {
	await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click({ timeout: 15_000 });
	await expect(listRows(page).first()).toBeVisible({ timeout: 30_000 });
};
const dialogFields = (dialog: Locator) =>
	dialog.evaluate((node: Element) =>
		Array.from(node.querySelectorAll('input, [role=combobox]')).map((input) => {
			const el = input as HTMLInputElement;
			return `${el.getAttribute('role') ?? el.tagName.toLowerCase()}|${el.getAttribute('aria-label') ?? ''}|${el.getAttribute('placeholder') ?? ''}|${el.value ?? ''}`;
		})
	);

test.describe('lane-b · Reports › the timesheet of a member: the tools around one entry', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// --------------------------------- 1. `Group similar entries`: what one row stands for, by its own copy keys

	test('1 · grouping is on by default, a group row says how many entries it holds, and the switch takes them apart', async ({
		page,
		fixture,
		shield
	}) => {
		const weeks = servedWeeks();
		const api = await serveTimesheetApi(page, newStore(fixture, weeks));
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await openServedWeek(page, api, weeks.shown);
		await openListView(page);

		const storedChoice = () =>
			page.evaluate((key) => window.localStorage.getItem(key), GROUP_SIMILAR_ENTRIES_STORAGE_KEY);
		report('grouping storage key', GROUP_SIMILAR_ENTRIES_STORAGE_KEY);
		// polled, not read once: the read happens at the same point (after the whole first visit), and a value that
		// has not settled yet cannot slip past it either way
		await expect.poll(storedChoice, { timeout: 20_000 }).toBe(null);

		const task = fixture.names.task;
		const days = dayKeysOf(weeks.shown);
		const monA = atOn(days[0], 9, 0);
		const monBEnd = new Date(atOn(days[0], 13, 0).getTime() + 3_930_000);

		// the two row counts are derived from what this file served — the shown week holds seven logs that group
		// into five rows — and asserted on the page before either is used as a number
		const groupedRows = servedRowCountOf(api.state.logs, weeks.shown);
		const entryRows = servedEntryRowCountOf(api.state.logs, weeks.shown);
		report('served rows of the shown week', { groupedRows, entryRows });
		await expect(listRows(page)).toHaveCount(groupedRows, { timeout: 20_000 });
		const mondayGroup = groupRow(page, task, 2);
		await expect(mondayGroup).toHaveCount(1);
		await expect(
			mondayGroup.getByRole('button', { name: copy(T.SIMILAR.SHOW_ENTRIES, { task }), exact: true })
		).toHaveAttribute('aria-expanded', 'false');
		report('Monday group cells', await cellsOf(mondayGroup.first()));
		// the count chip is not a cell of its own: `countText` (`timesheet-entry-group-row.tsx:86`) is printed
		// inside the row task cell (`:132`), so it is read as part of that cell; the span and the total are cells
		// of their own, named by their own text.
		await expect(rowTaskCell(mondayGroup.first(), copy(T.SIMILAR.ENTRY_COUNT, { count: 2 }))).toHaveCount(1);
		await expect(rowCell(mondayGroup.first(), timeRangeOf(monA, monBEnd))).toHaveCount(1);
		await expect(rowCell(mondayGroup.first(), durationOf(7_200 + 3_930))).toHaveCount(1);
		// the third Monday entry differs only in its billable state, and billable is part of the group key
		await expect(rowByTotal(page, 1_800)).toHaveCount(1);

		await page.getByRole('button', { name: C.VIEW, exact: true }).click({ timeout: 15_000 });
		await expect(page.getByText(T.SIMILAR.VIEW_GROUP_HELP, { exact: true })).toBeVisible();
		const groupingSwitch = page.getByRole('switch', { name: T.SIMILAR.VIEW_GROUP, exact: true });
		await expect(groupingSwitch).toHaveAttribute('aria-checked', 'true');
		await groupingSwitch.click({ timeout: 15_000 });
		await expect.poll(storedChoice, { timeout: 20_000 }).toBe('false');
		await expect(
			page.getByRole('checkbox', { name: copy(T.SIMILAR.SELECT_GROUP, { count: 2, task }) })
		).toHaveCount(0);
		await expect(listRows(page)).toHaveCount(entryRows, { timeout: 20_000 });
		report('rows with grouping off', await listRows(page).count());

		// the popover is a document-level portal and it stays open when its switch is clicked, so clicking `View`
		// again would close it out from under the switch (`-measure-1.log`: that click detached the switch). It is
		// closed and waited for, then reopened.
		await page.keyboard.press('Escape');
		await expect
			.poll(() => page.getByRole('switch', { name: T.SIMILAR.VIEW_GROUP, exact: true }).count(), {
				timeout: 20_000
			})
			.toBe(0);
		// back on: the same two entries are one row again, and opening it adds them underneath
		await page.getByRole('button', { name: C.VIEW, exact: true }).click({ timeout: 15_000 });
		const backOnSwitch = page.getByRole('switch', { name: T.SIMILAR.VIEW_GROUP, exact: true });
		await expect(backOnSwitch).toHaveAttribute('aria-checked', 'false');
		await backOnSwitch.click({ timeout: 15_000 });
		await expect(listRows(page)).toHaveCount(groupedRows, { timeout: 20_000 });
		report('grouping storage after turning it back on', await storedChoice());
		await groupRow(page, task, 2)
			.getByRole('button', { name: copy(T.SIMILAR.SHOW_ENTRIES, { task }), exact: true })
			.click({ timeout: 15_000 });
		await expect(listRows(page)).toHaveCount(entryRows, { timeout: 20_000 });
		const opened = groupRow(page, task, 2);
		await expect(
			opened.getByRole('button', { name: copy(T.SIMILAR.HIDE_ENTRIES, { task }), exact: true })
		).toHaveAttribute('aria-expanded', 'true');
		report('Monday group opened', await cellsOf(opened.first()));
		await expect(rowTaskCell(opened.first(), copy(T.SIMILAR.ENTRY_COUNT, { count: 2 }))).toHaveCount(1);
		await expect(entryRow(page, task)).toHaveCount(3);

		report('console', shield.consoleErrors());
		expect(consoleFindings(shield), 'the grouping walk logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the grouping walk threw a page error').toEqual([]);
	});

	// --------------------------------- 2. the group row's menu acts on every entry of the group

	test('2 · a group row Billable change confirms once, then writes every entry of the group', async ({
		page,
		fixture,
		shield
	}) => {
		const weeks = servedWeeks();
		const state = newStore(fixture, weeks);
		const api = await serveTimesheetApi(page, state);
		// this test clicks a dialog footer, so the viewport the measured panel needs is set up front rather than
		// reached by a click that fails first (`dialogFooterViewport`)
		await dialogFooterViewport(page);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await openServedWeek(page, api, weeks.shown);
		await openListView(page);

		const task = GROUP_TASK_TITLE;
		const group = groupRow(page, task, 2);
		await expect(group).toHaveCount(1, { timeout: 20_000 });
		await openRowMenu(page, group.first());
		await expect.poll(() => menuTexts(openMenu(page)), { timeout: 15_000 }).toEqual([T.BILLABLE, C.DELETE]);
		report('group menu items', await menuTexts(openMenu(page)));
		await pickMenuItem(page, T.BILLABLE);
		// the submenu is its own `menu`, named after the item that opened it — the accepted spec records the same
		// shape (`member-timesheet-report-ui.spec.ts:2068-2071`), and reading the top level here printed the two
		// top items again (`-measure-1.log`), which is why it is read from the submenu itself.
		const billableMenu = page.getByRole('menu', { name: T.BILLABLE, exact: true });
		await expect(billableMenu.getByRole('menuitem')).toHaveCount(2, { timeout: 15_000 });
		report('Billable submenu', await menuTexts(billableMenu));
		await expect(billableMenu.getByRole('menuitem', { name: TIMESHEET_PAGE.BILLABLE.NO, exact: true })).toHaveCount(
			1
		);
		await expect
			.poll(async () => selectedMenuItem(await menuTexts(billableMenu)), { timeout: 15_000 })
			.toBe(TIMESHEET_PAGE.BILLABLE.YES);
		await billableMenu
			.getByRole('menuitem', { name: TIMESHEET_PAGE.BILLABLE.NO, exact: true })
			.click({ timeout: 15_000 });

		const confirmDialog = page.locator('[role=alertdialog]');
		await expect.poll(() => confirmDialog.count(), { timeout: 30_000 }).toBe(1);
		report('group confirmation text', await textOf(confirmDialog.first()));
		await expect(confirmDialog.first()).toContainText(copy(T.SIMILAR.CONFIRM_NOT_BILLABLE, { count: 2 }));
		await expect(confirmDialog.first()).toContainText(copy(T.SIMILAR.CONFIRM_SCOPE, { task }));
		await expect(confirmDialog.getByRole('button', { name: C.CANCEL, exact: true })).toHaveCount(1);

		const writesBefore = api.writes().length;
		await clickDialogButton(confirmDialog.getByRole('button', { name: C.CONFIRM, exact: true }));
		await expect.poll(() => api.writes().length, { timeout: 60_000 }).toBe(writesBefore + 2);
		await parkPointer(page);
		const writes = api.writes().slice(writesBefore);
		report(
			'group reads after confirm',
			api
				.reads(LOGS_PATH)
				.slice(-6)
				.map((call) => call.path)
		);
		report(
			'group writes',
			writes.map((call) => ({ method: call.method, path: call.path, body: call.body }))
		);
		const wednesday = dayKeysOf(weeks.shown)[2];
		const expected = [
			{ id: 'own-wed-a', start: atOn(wednesday, 9, 0), seconds: 3_600 },
			{ id: 'own-wed-b', start: atOn(wednesday, 14, 0), seconds: 2_730 }
		];
		expect(
			writes.map((call) => ({
				path: call.path,
				startedAt: String(call.body?.['startedAt']),
				stoppedAt: String(call.body?.['stoppedAt']),
				isBillable: call.body?.['isBillable'],
				employeeId: call.body?.['employeeId']
			})),
			'a group change is not one write per entry, each keeping its own interval'
		).toEqual(
			expected.map((entry) => ({
				path: `${LOGS_PATH}/${entry.id}`,
				startedAt: isoOf(entry.start),
				stoppedAt: isoOf(new Date(entry.start.getTime() + entry.seconds * 1_000)),
				isBillable: false,
				employeeId: fixture.ids.employee
			}))
		);
		expect(
			state.logs.filter((log) => taskTitleOf(log, '') === task).map((log) => log.isBillable),
			'a group change left one entry on its old value'
		).toEqual([false, false]);
		await expect
			.poll(() => dialogHasToast(page, copy(T.SIMILAR.CHANGED, { count: 2 })), { timeout: 30_000 })
			.toBe(true);
		report('group change toasts', await toastsOf(page));
		await expect.poll(() => confirmDialog.count(), { timeout: 20_000 }).toBe(0);
		await expect(groupRow(page, task, 2)).toHaveCount(1);

		report('console', shield.consoleErrors());
		expect(consoleFindings(shield), 'the group change logged a console error').toEqual([]);
	});

	// --------------------------------- 3. `Duplicate`: the dialog opens already filled with that entry

	test('3 · Duplicate: the copied fields, the one save, and the row it left in the entry own week', async ({
		page,
		fixture
	}) => {
		const weeks = servedWeeks();
		const api = await serveTimesheetApi(page, newStore(fixture, weeks));
		// this test clicks a dialog footer, so the viewport the measured panel needs is set up front
		// (`dialogFooterViewport`)
		await dialogFooterViewport(page);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await openServedWeek(page, api, weeks.shown);
		await openListView(page);

		const source = rowByTotal(page, 1_800);
		await expect(source).toHaveCount(1, { timeout: 20_000 });
		await openRowMenu(page, source.first());
		await expect
			.poll(() => menuTexts(openMenu(page)), { timeout: 15_000 })
			.toEqual([REA.CONTINUE, REA.DUPLICATE, C.EDIT, T.BILLABLE, C.DELETE]);
		report('own entry menu items', await menuTexts(openMenu(page)));
		await pickMenuItem(page, REA.DUPLICATE);
		const dialog = await openAddTimeDialog(page);

		const pickers = dialog.locator('[data-slot=select-trigger][role=combobox]');
		await expect(pickers).toHaveCount(2);
		report(
			'prefilled pickers',
			await pickers.evaluateAll((nodes: Element[]) =>
				nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
			)
		);
		await expect(pickers.nth(0)).toContainText(fixture.names.task);
		await expect(pickers.nth(1)).toContainText(fixture.names.user);
		await expect(dialog.getByRole('textbox', { name: ADD_TIME_NOTES_ARIA })).toHaveValue('');
		// the copied entry arrives with its one period accordion collapsed, and a collapsed accordion mounts no
		// content at all (finding 8), so the duration and the two time fields exist only after its trigger opens.
		const copyTriggers = dialog.locator('[data-slot=accordion-trigger]');
		await expect(copyTriggers).toHaveCount(1);
		await copyTriggers.first().click({ timeout: 15_000 });
		await expect(dialog.getByText(C.REMOVE_PERIOD, { exact: true })).toHaveCount(1);
		await expect
			.poll(async () => timeFieldValuesOf(await dialogFields(dialog)).length, { timeout: 30_000 })
			.toBe(2); // the copied period carries a Start and an End of its own
		report('prefilled dialog fields', await dialogFields(dialog));
		report('prefilled period clock fields', timeFieldValuesOf(await dialogFields(dialog)));
		await expect(dialog.locator(`input[placeholder='${ADD_TIME_DURATION_PLACEHOLDER}']`)).toHaveValue(
			durationOf(1_800),
			{ timeout: 30_000 }
		);

		const readsBefore = api.reads(LOGS_PATH).length;
		const writesBefore = api.writes().length;
		await clickDialogButton(dialog.getByRole('button', { name: C.SAVE, exact: true }));
		await expect.poll(() => api.writes().length, { timeout: 60_000 }).toBe(writesBefore + 1);
		const write = api.writes()[writesBefore];
		const body = write.body ?? {};
		const startedAt = new Date(String(body['startedAt']));
		const stoppedAt = new Date(String(body['stoppedAt']));
		const browserZone = await browserZoneOf(page);
		const dayReads = api.reads(LOGS_PATH).slice(readsBefore);
		report(
			'reads the save made',
			dayReads.map((call) => ({
				startDate: call.params['startDate'],
				endDate: call.params['endDate'],
				timeZone: call.params['timeZone']
			}))
		);
		const dayRead = dayReads.find(
			(call) =>
				call.params['timeZone'] === browserZone &&
				new Date(call.params['startDate']) <= startedAt &&
				new Date(call.params['endDate']) >= stoppedAt
		);
		expect(dayRead, 'the copy did not read the member own day before saving').toBeDefined();
		report('duplicate write', { method: write.method, path: write.path, body });
		expect(write.method).toBe('POST');
		expect(write.path).toBe(LOGS_PATH);
		expect(body['taskId']).toBe(fixture.ids.task);
		expect(body['projectId'], 'the Duplicate did not carry the copied entry project').toBe(fixture.ids.project);
		expect(body['employeeId']).toBe(fixture.ids.employee);
		expect(body['isBillable'], 'the copied entry was the group non-billable one').toBe(false);
		expect(body['logType']).toBe('MANUAL');
		expect(body['source']).toBe('TEAMS');
		expect(
			Math.round((stoppedAt.getTime() - startedAt.getTime()) / 1_000),
			'the copied interval is not the source length in 5-minute steps'
		).toBe(1_800);
		expect(zoneDayKeyOf(startedAt, browserZone), 'the copy was not placed inside the member own today').toBe(
			zoneDayKeyOf(new Date(), browserZone)
		);
		await expect.poll(() => dialogCount(page, C.ADD_TIME_ENTRY), { timeout: 30_000 }).toBe(0);

		// the row the copy left, in the week that holds today
		await stepWeeksTo(page, api, weeks.shown, openedWeekOf(), provedByARead);
		const copyRow = rowByTotal(page, 1_800);
		await expect(copyRow).toHaveCount(1, { timeout: 20_000 });
		report('the copy row', await cellsOf(copyRow.first()));
		await expect(rowCell(copyRow.first(), timeRangeOf(startedAt, stoppedAt))).toHaveCount(1);
		await expect(rowCell(copyRow.first(), durationOf(1_800))).toHaveCount(1);
		await expect(
			copyRow.getByRole('checkbox', { name: copy(T.SELECT_LOG, { task: fixture.names.task }) })
		).toHaveCount(1);
	});

	// --------------------------------- 4. `Continue` is a timer start, not a second Add time dialog

	test('4 · Continue: the other action of the same menu starts the timer and writes nothing to the entry list', async ({
		page,
		fixture
	}) => {
		const weeks = servedWeeks();
		const api = await serveTimesheetApi(page, newStore(fixture, weeks));
		const timerRequests = mockRequests(page, '/api/timesheet/timer/');
		const activeTaskRequests = mockRequests(page, '/active-task');
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await openServedWeek(page, api, weeks.shown);
		await openListView(page);

		const source = rowByTotal(page, 1_800);
		await expect(source).toHaveCount(1, { timeout: 20_000 });
		await openRowMenu(page, source.first());
		await expect(openMenu(page).getByRole('menuitem', { name: REA.CONTINUE, exact: true })).toHaveCount(1);
		report('own entry menu items', await menuTexts(openMenu(page)));
		await pickMenuItem(page, REA.CONTINUE);
		await expect
			.poll(() => timerRequests.filter((line) => line.startsWith('POST')).length, { timeout: 30_000 })
			.toBe(1);
		await expect
			.poll(() => activeTaskRequests.filter((line) => line.startsWith('PUT')).length, {
				timeout: 30_000
			})
			.toBeGreaterThan(0); // polled, not slept: this is the start's own active-task write
		report('timer requests', timerRequests);
		report('active-task requests', activeTaskRequests);
		await expect(dialogOf(page, C.ADD_TIME_ENTRY), 'Continue opened the Add time dialog').toHaveCount(0);
		expect(api.writes().length, 'Continue wrote to any served time-log path').toBe(0);
		await parkPointer(page);
		report('toasts after Continue', await toastsOf(page));
		// the shell names its own timer control by the hotkey copy (`timer-button.tsx:39` `hotkeys.STOP_TIMER`)
		await expect(page.getByRole('button', { name: HOTKEYS.STOP_TIMER, exact: true })).toBeVisible({
			timeout: 20_000
		});

		// the same row again: the shell already runs that task, and the page says so instead of starting twice
		await openRowMenu(page, rowByTotal(page, 1_800).first());
		report('menu after Continue', await menuTexts(openMenu(page)));
		await pickMenuItem(page, REA.CONTINUE);
		await parkPointer(page);
		// polled, not read once a fixed time after the click: the toast is the page answer, and a window is a
		// coin toss against a countdown that is still running
		await expect.poll(() => dialogHasToast(page, REA.ALREADY_RUNNING), { timeout: 30_000 }).toBe(true);
		report('toasts after the second Continue', await toastsOf(page));
		expect(
			timerRequests.filter((line) => line.startsWith('POST')).length,
			'a second Continue sent a second timer start'
		).toBe(1);
		expect(api.writes().length).toBe(0);
	});

	// --------------------------------- 5. `Add another period`: two intervals, one save, two writes

	test('5 · Add another period: the second period starts where the first ends, and one save sends both', async ({
		page,
		fixture
	}) => {
		const weeks = servedWeeks();
		const api = await serveTimesheetApi(page, newStore(fixture, weeks));
		// this test clicks a dialog footer, so the viewport the measured panel needs is set up front
		// (`dialogFooterViewport`)
		await dialogFooterViewport(page);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await openListView(page);
		// the baseline is derived from what this file served — the opened week holds one log of one task in one
		// billable state, so it prints one row — and it is asserted on the page before it is used as a baseline
		const rowsBefore = servedRowCountOf(api.state.logs, openedWeekOf());
		report('rows on the opened week before the save', rowsBefore);
		await expect(listRows(page)).toHaveCount(rowsBefore, { timeout: 30_000 });

		await addTimeButtons(page).first().click({ timeout: 15_000 });
		const dialog = await openAddTimeDialog(page);
		const pickers = dialog.locator('[data-slot=select-trigger][role=combobox]');
		await pickOption(page, pickers.nth(0), fixture.names.task);
		await pickOption(page, pickers.nth(1), fixture.names.user);
		const triggers = dialog.locator('[data-slot=accordion-trigger]');
		await expect(triggers).toHaveCount(1);
		await triggers.nth(0).click({ timeout: 15_000 }); // a collapsed accordion does not mount its content
		await expect(dialog.getByText(C.REMOVE_PERIOD, { exact: true })).toHaveCount(1);
		const durations = dialog.locator(`input[placeholder='${ADD_TIME_DURATION_PLACEHOLDER}']`);
		await expect(durations).toHaveCount(1);
		await durations.nth(0).fill('1:00');
		await durations.nth(0).press('Enter');
		await expect.poll(() => durations.nth(0).inputValue(), { timeout: 20_000 }).toBe(durationOf(3_600));
		await dialog.getByRole('button', { name: C.ADD_ANOTHER_PERIOD, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => triggers.count(), { timeout: 30_000 }).toBe(2);
		await triggers.nth(1).click({ timeout: 15_000 });
		await expect(durations).toHaveCount(2, { timeout: 20_000 });
		// measured: the new period holds **no** Start or End of its own until its duration is typed
		// (`-measure-3.log`: only the first period's `09:00:00 AM` / `10:00:00 AM` carry a value here)
		await expect
			.poll(async () => timeFieldValuesOf(await dialogFields(dialog)).length, { timeout: 30_000 })
			.toBe(2);
		report('the two periods before the second fill', await dialogFields(dialog));
		await durations.nth(1).fill('0:30');
		await durations.nth(1).press('Enter');
		await expect.poll(() => durations.nth(1).inputValue(), { timeout: 20_000 }).toBe(durationOf(1_800));
		// both pairs appear with the duration, and the second Start is the first End: polled on the two clocks at
		// the seam, so a dialog that has not finished rendering cannot pass it (`-probe-3.log` R5, `-probe-5.log` S3)
		await expect
			.poll(
				async () => {
					const clocks = timeFieldValuesOf(await dialogFields(dialog));
					return clocks.length === 4 && clocks[1] === clocks[2];
				},
				{ timeout: 30_000 }
			)
			.toBe(true);
		report('the two periods after the second fill', timeFieldValuesOf(await dialogFields(dialog)));
		await expect(dialog.getByText(C.REMOVE_PERIOD, { exact: true })).toHaveCount(2);
		await expect
			.poll(async () => timeFieldValuesOf(await dialogFields(dialog)).length, { timeout: 30_000 })
			.toBe(4); // no period lost its Start or its End before the save
		report('fields before the two-period save', await dialogFields(dialog));

		const callsBefore = api.calls.length;
		const writesBefore = api.writes().length;
		await clickDialogButton(dialog.getByRole('button', { name: C.SAVE, exact: true }));
		await expect.poll(() => api.writes().length, { timeout: 60_000 }).toBe(writesBefore + 2);
		report(
			'calls after the two-period save',
			api.calls.slice(callsBefore).map((call) => ({
				method: call.method,
				path: call.path,
				startDate: call.params['startDate'],
				endDate: call.params['endDate']
			}))
		);
		const writes = api.writes().slice(writesBefore);
		report(
			'two-period writes',
			writes.map((call) => ({ method: call.method, body: call.body }))
		);
		expect(writes.map((call) => call.method)).toEqual(['POST', 'POST']);
		const secondsOf = (call: ServedCall) =>
			Math.round(
				(new Date(String(call.body?.['stoppedAt'])).getTime() -
					new Date(String(call.body?.['startedAt'])).getTime()) /
					1_000
			);
		expect(secondsOf(writes[0])).toBe(3_600);
		expect(secondsOf(writes[1])).toBe(1_800);
		expect(String(writes[1].body?.['startedAt']), 'the second period does not start where the first ends').toBe(
			String(writes[0].body?.['stoppedAt'])
		);
		expect(writes[0].body?.['projectId'], 'the first period carried a project').toBeUndefined();
		expect(writes[1].body?.['projectId'], 'the second period carried a project').toBeUndefined();
		expect(
			writes.every((call) => call.body?.['logType'] === 'MANUAL' && call.body?.['source'] === 'TEAMS'),
			'a period write is not a manual Teams entry'
		).toBe(true);
		await expect.poll(() => dialogCount(page, C.ADD_TIME_ENTRY), { timeout: 30_000 }).toBe(0);
		await parkPointer(page);
		report('toasts after the two-period save', await toastsOf(page));

		const startedAt = new Date(String(writes[0].body?.['startedAt']));
		const stoppedAt = new Date(String(writes[1].body?.['stoppedAt']));
		await expect(listRows(page)).toHaveCount(rowsBefore + 1, { timeout: 30_000 });
		const pair = groupRow(page, fixture.names.task, 2);
		await expect(pair).toHaveCount(1);
		report(
			'the rows the two writes left',
			await listRows(page).evaluateAll((nodes: Element[]) =>
				nodes.map((node) =>
					Array.from(node.querySelectorAll('[role=cell],[role=rowheader]'))
						.map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
						.join(' / ')
				)
			)
		);
		await expect(rowTaskCell(pair.first(), copy(T.SIMILAR.ENTRY_COUNT, { count: 2 }))).toHaveCount(1);
		await expect(rowCell(pair.first(), timeRangeOf(startedAt, stoppedAt))).toHaveCount(1);
		await expect(rowCell(pair.first(), durationOf(3_600 + 1_800))).toHaveCount(1);
		await expect(pair).toContainText(T.NO_PROJECT);
		// the entry served earlier in the same week keeps its own row: it has a project, these have none
		await expect(rowByTotal(page, 3_600)).toHaveCount(1);
	});

	// --------------------------------- 6. `Copy last week`, and the sheet row tools it pairs with

	test('6 · Copy last week: rows without time, rows with time, and Remove row on a draft row', async ({
		page,
		fixture
	}) => {
		const weeks = servedWeeks();
		const api = await serveTimesheetApi(page, newStore(fixture, weeks));
		// the copy confirmation is a dialog footer, so the viewport the measured panel needs is set up front
		// (`dialogFooterViewport`)
		await dialogFooterViewport(page);
		// `Copy last week` is a sheet tool, and a sheet tool is rendered only while `editing.sheetLock ===
		// 'none'` (`timesheets-sheet-tools.tsx:113-123`, `timesheets-week-sheet.tsx:460`) — which this reader's role
		// only reaches with ALLOW_MANUAL_TIME (finding 9: `-probe-6.log` U1 against `-probe-5.log` S2).
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee), {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION] }
		});
		await openServedWeek(page, api, weeks.shown);
		const sheet = sheetTable(page, fixture.names.user);
		await expect(sheet).toBeVisible({ timeout: 30_000 });
		const browserZone = await browserZoneOf(page);

		const copyMenu = page.getByRole('button', { name: T.SHEET.COPY.MENU, exact: true });
		await expect(copyMenu).toHaveCount(1);
		await copyMenu.click({ timeout: 15_000 });
		await expect
			.poll(() => menuTexts(openMenu(page)), { timeout: 15_000 })
			.toEqual([
				`${T.SHEET.COPY.ROWS}${T.SHEET.COPY.ROWS_HINT}`,
				`${T.SHEET.COPY.ROWS_AND_TIME}${T.SHEET.COPY.ROWS_AND_TIME_HINT}`
			]);
		report('Copy last week menu', await menuTexts(openMenu(page)));

		// Rows: last week tasks, without time — draft rows, and no request at all
		await pickMenuItem(page, T.SHEET.COPY.ROWS_HINT);
		await parkPointer(page);
		const rowsToast = copy(T.SHEET.COPY.ROWS_ADDED, { count: 2 });
		await expect.poll(() => dialogHasToast(page, rowsToast), { timeout: 30_000 }).toBe(true);
		report('rows toast', await toastsOf(page));
		const lastWeekReads = api.reads(LOGS_PATH).filter((call) => call.params['startDate'] === weeks.last.from);
		report(
			'last week reads',
			lastWeekReads.map((call) => ({
				startDate: call.params['startDate'],
				endDate: call.params['endDate'],
				employeeIds: Object.entries(call.params)
					.filter(([name]) => name.startsWith('employeeIds['))
					.map(([, value]) => value)
			}))
		);
		expect(lastWeekReads.length, 'the copy did not read the week before the shown one').toBeGreaterThan(0);
		expect(lastWeekReads[0].params['endDate'], 'the copy read a window that is not exactly last week').toBe(
			weeks.last.to
		);
		expect(lastWeekReads[0].params['employeeIds[0]'], 'the copy read every member, not this one').toBe(
			fixture.ids.employee
		);
		expect(api.writes().length, 'Rows sent a request').toBe(0);
		const removeA = page.getByRole('button', {
			name: copy(T.SHEET.EDIT.REMOVE_ROW, { task: COPY_TASK_A_TITLE }),
			exact: true
		});
		await expect(removeA).toHaveCount(1);
		await expect(sheet.getByRole('rowheader').filter({ hasText: COPY_TASK_B_TITLE })).toHaveCount(1);
		await removeA.click({ timeout: 15_000 });
		await expect
			.poll(
				() =>
					page
						.getByRole('button', {
							name: copy(T.SHEET.EDIT.REMOVE_ROW, { task: COPY_TASK_A_TITLE }),
							exact: true
						})
						.count(),
				{ timeout: 20_000 }
			)
			.toBe(0);
		expect(api.writes().length, 'Remove row sent a request').toBe(0);

		// Rows and time: planned, confirmed once, then one write per open cell
		await copyMenu.click({ timeout: 15_000 });
		await pickMenuItem(page, T.SHEET.COPY.ROWS_AND_TIME_HINT);
		const confirm = dialogOf(page, T.SHEET.COPY.CONFIRM_TITLE);
		await expect.poll(() => confirm.count(), { timeout: 30_000 }).toBe(1);
		report('copy confirmation', await textOf(confirm.first()));
		await expect(confirm.first()).toContainText(
			copy(T.SHEET.COPY.CONFIRM_BODY, { total: durationOf(5_400 + 2_700), count: 2 })
		);
		await expect(confirm.first()).toContainText(copy(T.SHEET.COPY.CONFIRM_LOCKED, { count: 1 }));
		await expect(
			confirm.getByRole('button', {
				name: copy(T.SHEET.COPY.CONFIRM_ACTION, { total: durationOf(5_400 + 2_700) }),
				exact: true
			})
		).toHaveCount(1);
		const writesBefore = api.writes().length;
		await clickDialogButton(
			confirm.getByRole('button', {
				name: copy(T.SHEET.COPY.CONFIRM_ACTION, { total: durationOf(5_400 + 2_700) }),
				exact: true
			})
		);
		await expect.poll(() => api.writes().length, { timeout: 60_000 }).toBe(writesBefore + 2);
		await parkPointer(page);
		const writes = api.writes().slice(writesBefore);
		report(
			'copy writes',
			writes.map((call) => ({ method: call.method, body: call.body }))
		);
		expect(
			writes
				.map((call) =>
					Math.round(
						(new Date(String(call.body?.['stoppedAt'])).getTime() -
							new Date(String(call.body?.['startedAt'])).getTime()) /
							1_000
					)
				)
				.sort((a, b) => a - b),
			'the copy did not send last week two open cells'
		).toEqual([2_700, 5_400]);
		expect(writes.every((call) => call.body?.['isBillable'] === true)).toBe(true);
		await expect
			.poll(() => dialogHasToast(page, copy(T.SHEET.COPY.LEFT_OUT, { count: 1 })), { timeout: 30_000 })
			.toBe(true);
		await expect
			.poll(() => dialogHasToast(page, copy(T.SHEET.COPY.DONE, { total: durationOf(5_400 + 2_700), count: 2 })), {
				timeout: 30_000
			})
			.toBe(true);
		report('copy toasts', await toastsOf(page));
		await expect.poll(() => confirm.count(), { timeout: 20_000 }).toBe(0);
		await expect(
			sheetCellInput(page, fixture.names.user, COPY_TASK_A_TITLE, dayKeysOf(weeks.shown)[0], browserZone)
		).toHaveValue(durationOf(5_400), { timeout: 30_000 });
	});

	// --------------------------------- 7. Add row: the picker, the draft row, its seven empty cells, one typed cell

	test('7 · Add row: the picker named Search tasks, the draft row named Remove … from the sheet, and the write its cell sent', async ({
		page,
		fixture
	}) => {
		const weeks = servedWeeks();
		const api = await serveTimesheetApi(page, newStore(fixture, weeks));
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee), {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION] }
		});
		const emptyWeek = shiftWeek(weeks.shown, -2);
		const sheet = sheetTable(page, fixture.names.user);
		const browserZone = await browserZoneOf(page);
		await expect(sheet).toBeVisible({ timeout: 30_000 });
		await stepWeeksTo(page, api, openedWeekOf(), emptyWeek, provedOnSheet(sheet, browserZone));
		const addRow = page.getByRole('button', { name: T.SHEET.EDIT.ADD_ROW, exact: true });
		await expect.poll(() => addRow.count(), { timeout: 60_000 }).toBe(1);
		// the hint is the sheet tools own line beside the table (`timesheets-sheet-tools.tsx:160-168`), read at
		// page level exactly as `-probe-6.log` U1 counted it.
		await expect(page.getByText(T.SHEET.EDIT.EMPTY_HINT, { exact: true })).toBeVisible();
		report('empty sheet week', { fromKey: emptyWeek.fromKey, rows: await sheet.locator('[role=row]').count() });

		await addRow.click({ timeout: 15_000 });
		await expect.poll(() => page.locator('[role=option]').count(), { timeout: 15_000 }).toBeGreaterThan(0);
		report(
			'the Add row picker',
			await page.evaluate(() =>
				Array.from(
					document.querySelectorAll('[role=dialog], [role=listbox], [role=option], [role=combobox]')
				).map(
					(node) =>
						`[${node.getAttribute('role')}] aria=${node.getAttribute('aria-label') ?? ''} ph=${node.getAttribute('placeholder') ?? ''} text=${(node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)}`
				)
			)
		);
		await expect(page.getByRole('combobox', { name: T.SHEET.EDIT.ADD_ROW_SEARCH, exact: true })).toHaveCount(1);
		const option = page.locator('[role=option]').filter({ hasText: fixture.names.task });
		await expect(option).toHaveCount(1);
		await option.first().click({ timeout: 15_000 });
		const draftRemove = page.getByRole('button', {
			name: copy(T.SHEET.EDIT.REMOVE_ROW, { task: fixture.names.task }),
			exact: true
		});
		await expect(draftRemove).toHaveCount(1, { timeout: 20_000 });
		const days = dayKeysOf(emptyWeek);
		for (const dayKey of days) {
			await expect(sheetCellInput(page, fixture.names.user, fixture.names.task, dayKey, browserZone)).toHaveValue(
				''
			);
		}
		report(
			'draft row cells',
			await sheet
				.getByRole('rowheader')
				.evaluateAll((nodes: Element[]) =>
					nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
				)
		);
		await draftRemove.click({ timeout: 15_000 });
		await expect.poll(() => draftRemove.count(), { timeout: 20_000 }).toBe(0);
		expect(api.writes().length, 'removing a draft row sent a request').toBe(0);

		// the same row again, this time typed: one POST, and the row stops being a draft
		await addRow.click({ timeout: 15_000 });
		await expect.poll(() => page.locator('[role=option]').count(), { timeout: 15_000 }).toBeGreaterThan(0);
		await page.locator('[role=option]').filter({ hasText: fixture.names.task }).first().click({ timeout: 15_000 });
		const mondayCell = sheetCellInput(page, fixture.names.user, fixture.names.task, days[0], browserZone);
		// the draft cell starts empty, and the write is counted from before the keystrokes: the cell posts the moment
		// Enter lands, so a count taken afterwards already holds it (`-1.log`: expected 2 more writes than a count
		// that was taken after the Enter, and got 1).
		await expect(mondayCell).toHaveValue('', { timeout: 20_000 });
		const writesBefore = api.writes().length;
		await mondayCell.fill('1:30');
		await mondayCell.press('Enter');
		await expect.poll(() => api.writes().length, { timeout: 60_000 }).toBe(writesBefore + 1);
		// polled, not slept: the cell re-reads itself once its write landed
		await expect(mondayCell).toHaveValue(durationOf(5_400), { timeout: 30_000 });
		const write = api.writes()[writesBefore];
		report('typed cell write', { method: write.method, path: write.path, body: write.body });
		const body = write.body ?? {};
		expect(write.method).toBe('POST');
		expect(body['taskId']).toBe(fixture.ids.task);
		expect(body['logType']).toBe('MANUAL');
		expect(body['source']).toBe('TEAMS');
		expect(body['isBillable']).toBe(false);
		expect(
			zoneDayKeyOf(String(body['startedAt']), browserZone),
			'the typed time did not land on the cell day'
		).toBe(days[0]);
		expect(
			Math.round(
				(new Date(String(body['stoppedAt'])).getTime() - new Date(String(body['startedAt'])).getTime()) / 1_000
			),
			'the typed cell did not send the typed length'
		).toBe(5_400);
		await expect(mondayCell).toHaveValue(durationOf(5_400), { timeout: 30_000 });
		await expect(
			page.getByRole('button', { name: copy(T.SHEET.EDIT.REMOVE_ROW, { task: fixture.names.task }), exact: true })
		).toHaveCount(0);
	});

	// --------------------------------- 8. `SHEET.EDIT.LOCK_*`: what a locked day says, and what it gives up

	test('8 · a locked sheet day says why, and gives up its input and its entry buttons', async ({ page, fixture }) => {
		const weeks = servedWeeks();
		const api = await serveTimesheetApi(page, newStore(fixture, weeks));
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee), {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION] }
		});
		await openServedWeek(page, api, weeks.shown);
		const browserZone = await browserZoneOf(page);
		const sheet = sheetTable(page, fixture.names.user);
		await expect(sheet).toBeVisible({ timeout: 30_000 });
		const days = dayKeysOf(weeks.shown);
		const memberSecondsOf = [7_200 + 3_930 + 1_800, 3_600, 3_600 + 2_730, 0, 0, 0, 0];
		for (const [index, dayKey] of days.entries()) {
			await expect(
				sheet.getByRole('columnheader', {
					name: copy(T.SHEET.DAY_HEADER, {
						day: dayLabelOf(`${dayKey}T12:00:00Z`, browserZone),
						total: memberSecondsOf[index] ? durationOf(memberSecondsOf[index]) : T.SHEET.NO_TIME
					})
				})
			).toHaveCount(1);
		}

		// Tuesday holds the member only APPROVED entry: the whole day column is locked, its filled cell is a button
		// How many rows the sheet must print is derived from what this file served — the member's own logs of the
		// shown week, one row per task and billable state (`servedRowCountOf`) — and it is asserted on the page
		// before it is used: the named rowheaders are exactly those rows plus the `SHEET.PERIOD_TOTAL` row.
		const sheetRows = servedRowCountOf(api.state.logs, weeks.shown, fixture.ids.employee);
		report('sheet rows derived from the store', sheetRows);
		await expect(sheet.getByRole('rowheader').filter({ hasText: copy(T.SHEET.PERIOD_TOTAL) })).toHaveCount(1);
		await expect(sheet.getByRole('rowheader').filter({ hasText: /\S/ })).toHaveCount(sheetRows + 1, {
			timeout: 20_000
		});
		await expect(sheet.getByRole('rowheader').filter({ hasText: fixture.names.task })).toHaveCount(2);
		await expect(sheet.getByRole('rowheader').filter({ hasText: APPROVED_TASK_TITLE })).toHaveCount(1);
		await expect(sheet.getByRole('rowheader').filter({ hasText: GROUP_TASK_TITLE })).toHaveCount(1);
		report(
			'sheet rowheaders',
			await sheet
				.getByRole('rowheader')
				.evaluateAll((nodes: Element[]) =>
					nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
				)
		);
		report(
			'locked cell titles',
			await sheet
				.locator('[role=cell][title]')
				.evaluateAll((nodes: Element[]) =>
					nodes.map(
						(node) =>
							`${node.getAttribute('title')}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
					)
				)
		);
		const tuesdayLabel = dayLabelOf(`${days[1]}T12:00:00Z`, browserZone);
		const approvedColumns = lockedDayColumns(page, fixture.names.user, T.SHEET.EDIT.LOCK_APPROVED);
		const approvedCellShapes = lockedCells(page, fixture.names.user, T.SHEET.EDIT.LOCK_APPROVED);
		// one APPROVED entry locks the whole day column: of the four body rows, the three whose Tuesday cell holds
		// nothing print `SHEET.NO_TIME` under the lock title on the cell (`timesheets-sheet-cell.tsx:89`), and the
		// fourth — the cell that holds the APPROVED log — carries the same title on its entries button (`:110`), so
		// it is not a `[role=cell][title]` any more (`-measure-1.log` counted 3 cells + 1 button = 4 columns).
		await expect(approvedColumns).toHaveCount(sheetRows, { timeout: 20_000 });
		await expect(approvedCellShapes).toHaveCount(sheetRows - 1, { timeout: 20_000 });
		await expect(approvedColumns.locator('input')).toHaveCount(0);
		await expect(sheet.locator(`input[inputmode=decimal][aria-label*='${tuesdayLabel}']`)).toHaveCount(0);
		report(
			'approved lock carriers',
			await approvedColumns.evaluateAll((nodes: Element[]) =>
				nodes.map(
					(node) =>
						`role=${node.getAttribute('role') ?? node.tagName.toLowerCase()}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
				)
			)
		);
		const approvedEntriesButton = sheet.getByRole('button', {
			name: copy(T.SHEET.CELL_LABEL, {
				task: APPROVED_TASK_TITLE,
				day: tuesdayLabel,
				duration: durationOf(3_600),
				count: 1
			})
		});
		await expect(approvedEntriesButton).toHaveCount(1);
		await expect(approvedEntriesButton).toHaveAttribute('title', T.SHEET.EDIT.LOCK_APPROVED);
		await expect(sheetCellInput(page, fixture.names.user, APPROVED_TASK_TITLE, days[1], browserZone)).toHaveCount(
			0
		);

		// the opened week: its days up to today keep their input, its days after today carry the future lock
		await stepWeeksTo(page, api, weeks.shown, openedWeekOf(), provedOnSheet(sheet, browserZone));
		const openedDays = dayKeysOf(openedWeekOf());
		const todayKey = zoneDayKeyOf(new Date(), browserZone);
		const afterToday = openedDays.filter((dayKey) => dayKey > todayKey);
		report('the opened week', { fromKey: openedWeekOf().fromKey, todayKey, daysAfterToday: afterToday });
		const openedLocks = lockedDayColumns(page, fixture.names.user, T.SHEET.EDIT.LOCK_FUTURE);
		await expect(openedLocks).toHaveCount(afterToday.length, { timeout: 20_000 });
		await expect(openedLocks.locator('input')).toHaveCount(0);
		if (afterToday.length) {
			await expect(openedLocks.first()).toContainText(T.SHEET.NO_TIME);
			await expect(
				sheet.locator(
					`input[inputmode=decimal][aria-label*='${dayLabelOf(`${afterToday[0]}T12:00:00Z`, browserZone)}']`
				)
			).toHaveCount(0);
		}
		// up to and including today the same row keeps its input, named by SHEET.EDIT.CELL_INPUT
		await expect(sheetCellInput(page, fixture.names.user, fixture.names.task, todayKey, browserZone)).toHaveCount(
			1
		);

		// the whole week after the opened one: all seven of its days are after today, on any weekday
		const future = futureWeekOf();
		await stepWeeksTo(page, api, openedWeekOf(), future, provedOnSheet(sheet, browserZone));
		// one served log sits on that week's Monday, so the shape finding 12 measured repeats: the empty cells of
		// the six other days carry `LOCK_FUTURE` on the cell, and Monday carries it on the entries button of the
		// filled cell (`-measure-3.log`: 6 cells, and the seventh column was the button).
		const futureColumns = lockedDayColumns(page, fixture.names.user, T.SHEET.EDIT.LOCK_FUTURE);
		await expect(futureColumns).toHaveCount(7, { timeout: 20_000 });
		await expect(lockedCells(page, fixture.names.user, T.SHEET.EDIT.LOCK_FUTURE)).toHaveCount(6, {
			timeout: 20_000
		});
		const futureEntriesButton = sheet.getByRole('button', {
			name: copy(T.SHEET.CELL_LABEL, {
				task: fixture.names.task,
				day: dayLabelOf(`${dayKeysOf(future)[0]}T12:00:00Z`, browserZone),
				duration: durationOf(3_600),
				count: 1
			})
		});
		await expect(futureEntriesButton).toHaveCount(1);
		await expect(futureEntriesButton).toHaveAttribute('title', T.SHEET.EDIT.LOCK_FUTURE);
		await expect(futureColumns.locator('input')).toHaveCount(0);
		await expect(sheet.locator('input[inputmode=decimal]')).toHaveCount(0);
		report(
			'future lock carriers',
			await futureColumns.evaluateAll((nodes: Element[]) =>
				nodes.map(
					(node) =>
						`role=${node.getAttribute('role') ?? node.tagName.toLowerCase()}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
				)
			)
		);
		report(
			'future day headers',
			await sheet
				.getByRole('columnheader')
				.evaluateAll((nodes: Element[]) =>
					nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
				)
		);
		await expect(sheet.getByRole('rowheader').filter({ hasText: fixture.names.task })).toHaveCount(1);

		// the same task is two rows, because the sheet row identity carries the billable state
		await stepWeeksTo(page, api, future, weeks.shown, provedOnSheet(sheet, browserZone));
		report(
			'rows of the same task',
			await sheet
				.getByRole('rowheader')
				.evaluateAll((nodes: Element[]) =>
					nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
				)
		);
		await expect(sheet.getByRole('rowheader').filter({ hasText: fixture.names.task })).toHaveCount(2);
	});

	// --------------------------------- 9. a refused save keeps the dialog and everything typed into it

	test('9 · a refused save: 400 says which values were wrong, 500 says the server, and the dialog keeps the notes', async ({
		page,
		fixture,
		shield
	}) => {
		const weeks = servedWeeks();
		const state = newStore(fixture, weeks);
		const api = await serveTimesheetApi(page, state);
		// both refused saves are dialog footers, so the viewport the measured panel needs is set up front
		// (`dialogFooterViewport`)
		await dialogFooterViewport(page);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await openServedWeek(page, api, weeks.shown);
		await openListView(page);
		const logsBefore = state.logs.length;

		await rowByTotal(page, 1_800)
			.first()
			.getByRole('button', { name: C.MORE_OPTIONS, exact: true })
			.click({ timeout: 15_000 });
		await pickMenuItem(page, REA.DUPLICATE);
		const dialog = await openAddTimeDialog(page);
		const typed = 'Typed while the save was refused';
		const notes = dialog.getByRole('textbox', { name: ADD_TIME_NOTES_ARIA });
		await notes.fill(typed);

		state.refusals[`POST ${LOGS_PATH}`] = 400;
		const writesBefore = api.writes().length;
		await clickDialogButton(dialog.getByRole('button', { name: C.SAVE, exact: true }));
		await expect.poll(() => api.writes().length, { timeout: 60_000 }).toBe(writesBefore + 1);
		await parkPointer(page);
		await expect.poll(() => dialogHasToast(page, TOASTS.MUTATION_FAILED), { timeout: 30_000 }).toBe(true);
		await expect.poll(() => dialogHasToast(page, TOASTS.REASONS.INVALID), { timeout: 30_000 }).toBe(true);
		report('400 toasts', await toastsOf(page));
		await expect.poll(() => dialogCount(page, C.ADD_TIME_ENTRY), { timeout: 20_000 }).toBe(1);
		await expect(notes).toHaveValue(typed);

		state.refusals[`POST ${LOGS_PATH}`] = 500;
		await clickDialogButton(dialog.getByRole('button', { name: C.SAVE, exact: true }));
		await expect.poll(() => api.writes().length, { timeout: 60_000 }).toBe(writesBefore + 2);
		await parkPointer(page);
		await expect.poll(() => dialogHasToast(page, TOASTS.REASONS.SERVER), { timeout: 30_000 }).toBe(true);
		report('500 toasts', await toastsOf(page));
		await expect(notes).toHaveValue(typed);
		await expect(dialog).toContainText(C.ADD_TIME_ENTRY);
		expect(state.logs.length, 'a refused save still added an entry to the store').toBe(logsBefore);
		await expect(entryRow(page, fixture.names.task)).toHaveCount(1);
		report(
			'refused writes',
			api
				.writes()
				.slice(writesBefore)
				.map((call) => ({ method: call.method, path: call.path }))
		);
		report('console', shield.consoleErrors());
		expect(armedWriteLines(shield, 400).length, 'the 400 left no HTTP error line').toBeGreaterThan(0);
		expect(armedWriteLines(shield, 500).length, 'the 500 left no HTTP error line').toBeGreaterThan(0);
		expect(
			consoleFindingsWithoutArmedWrites(shield, [400, 500]),
			'the refused saves logged a console error beyond their own HTTP lines'
		).toEqual([]);
		await expect(shield.pageErrors(), 'the refused saves threw a page error').toEqual([]);
	});

	// --------------------------------- 10. the Week (calendar) view of the same served week

	test('10 · the Week view: one section for the week, one group per day, one card per entry, and a card click lands in List', async ({
		page,
		fixture
	}) => {
		const weeks = servedWeeks();
		const api = await serveTimesheetApi(page, newStore(fixture, weeks));
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await openServedWeek(page, api, weeks.shown);
		const browserZone = await browserZoneOf(page);
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.WEEK, exact: true }).click({ timeout: 15_000 });
		await expect(page.getByRole('tab', { name: T.VIEWS.WEEK, exact: true })).toHaveAttribute(
			'aria-selected',
			'true',
			{
				timeout: 20_000
			}
		);
		await expect
			.poll(() => page.evaluate((key) => window.localStorage.getItem(key), VIEW_STORAGE_KEY), { timeout: 20_000 })
			.toBe('"week"');

		const weekSection = page.getByRole('region', {
			// the section is named in the period zone the profile carries (`initialPeriodFor`,
			// `use-timesheets-page.ts:158-162`; the mock profile is `timeZone: 'UTC'`, `mock-gauzy-server.mjs:94`),
			// exactly as `-probe-3.log` R1 read it: 'Nov 16 – 22'.
			name: periodTextOf(weeks.shown.from, weeks.shown.to, 'UTC'),
			exact: true
		});
		await expect(weekSection).toHaveCount(1);
		const days = dayKeysOf(weeks.shown);
		const daySecondsOf = [7_200 + 3_930 + 1_800 + 5_400, 3_600, 3_600 + 2_730, 0, 0, 0, 0];
		for (const [index, dayKey] of days.entries()) {
			const label = dayLabelOf(`${dayKey}T12:00:00Z`, browserZone);
			await expect(weekSection.getByRole('group', { name: label, exact: true })).toHaveCount(1);
			if (daySecondsOf[index]) {
				await expect(weekSection.getByRole('group', { name: label, exact: true }).first()).toContainText(
					durationOf(daySecondsOf[index])
				);
			}
		}
		report(
			'week cards',
			await weekSection
				.getByRole('button')
				.evaluateAll((nodes: Element[]) =>
					nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
				)
		);
		const mondayStart = atOn(days[0], 9, 0);
		await expect(
			weekSection
				.getByRole('button')
				.filter({ hasText: fixture.names.task })
				.filter({ hasText: timeRangeOf(mondayStart, new Date(mondayStart.getTime() + 7_200_000)) })
		).toHaveCount(1);
		await expect(weekSection.getByRole('button').filter({ hasText: TEAMMATE_TASK_TITLE })).toHaveCount(1);
		// `T.MORE_LOGS` is `{count, plural, one {# more log} other {# more logs}}`: with its count hole removed the
		// two branches read the same, so one pattern built from the key covers either plural form.
		const MORE_LOGS_LINE = new RegExp(`\\d+ ${copy(T.MORE_LOGS, { count: 1 }).replace(/^1\s/, '')}`);
		await expect(weekSection.getByRole('button', { name: MORE_LOGS_LINE })).toHaveCount(0);

		const readsBefore = api.reads(LOGS_PATH).length;
		await weekSection.getByRole('button').filter({ hasText: GROUP_TASK_TITLE }).first().click({ timeout: 15_000 });
		await expect(page.getByRole('tab', { name: T.VIEWS.LIST, exact: true })).toHaveAttribute(
			'aria-selected',
			'true',
			{
				timeout: 30_000
			}
		);
		await expect
			.poll(() => page.evaluate((key) => window.localStorage.getItem(key), VIEW_STORAGE_KEY), { timeout: 20_000 })
			.toBe('"list"');
		// the group row is the settled state of the view the card switched to: had the switch re-read the period,
		// its read would be in the log by the time that row is on screen
		await expect(groupRow(page, GROUP_TASK_TITLE, 2)).toHaveCount(1, { timeout: 20_000 });
		expect(api.reads(LOGS_PATH).length - readsBefore, 'the card click re-read the period it already had').toBe(0);
	});
});
