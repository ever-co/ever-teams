import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { mockReset, signInAndVisit } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in manager sees on **Reports › the timesheet of a member** (`/reports/timesheet/<memberId>`,
 * `app/[locale]/(main)/reports/timesheet/[memberId]/page.tsx` → `core/components/dashboards/timesheets/timesheets-page.tsx`),
 * on lane-b (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, statistics `3997`, control `3998`, issuer
 * `3999`, `playwright/test-servers.ts:37-42`). Every case signs in as the fixture manager (an organization role: the
 * mock's own role, `mock-gauzy-server.mjs:50-81`), except test 10b, which opens the page as `EMPLOYEE` with and without
 * `ALLOW_MANUAL_TIME`, and test 11, which asks the mock to add `ALLOW_MANUAL_TIME` to the fixture role (finding 18).
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-membertimesheet\probe1.spec.disabled` (P1-P9) … `probe10.spec.ts` (I1),
 * run on this lane on 2026-11-26 and logged in `D:\Coding\.tmp\s3-lane-b-membertimesheet-probe-1.log` … `-probe-10.log`
 * (the useful ones are `-probe-2.log` (Q1-Q14), `-probe-3.log` (R1-R14: the whole page, the LIST rows, the row menus,
 * approve, billable, Export, a refused read, search/cards/filters), `-probe-4.log` (D1-D6: the dialogs' shapes, delete,
 * reject, Add time, the five views, the sheet cell), `-probe-5.log` (E7: every view's accessible tree),
 * `-probe-7.log` (G1-G7: the edit dialog and its PUT, a refused PUT, the delete confirm, the reject dialog, the Add
 * time dialog's fields, the bulk edit dialog), `-probe-8.log` (H2-H4: the overlap confirmation, a refused conflict
 * lookup, the bulk edit write) and `-probe-9.log` (H5-H6: the Add time dialog filled, and the dialog a member-only
 * role gets)). Every value asserted below is one those runs printed, or one this file's own `MEASURE` line printed on
 * a run that passed. Nothing here names today's date: served logs sit at day offsets from the day the run runs on
 * (`localDay`, `at`), every formatted string is rebuilt from the same offsets with the same `Intl` options the page
 * uses, and no case counts days back from today (test 4 picks the 10th and the 14th of the month the calendar opens on).
 * The browser's own zone is read from the page (test 1 prints it) and never assumed: on this PC it resolved to
 * `Europe/Madrid` while the mock profile says `UTC` (`mock-gauzy-server.mjs:107`), which is why the shell shows its
 * "Your profile uses …" notice (`timeZoneNotice.TITLE`) on every visit — and why the page's read sends the **profile
 * zone** while its clocks print the **browser's** (finding 1).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, the shell and its reads, NextAuth, and the mock's own fixtures — the tenant, organization,
 * team, project and task ids and names (`fixture.ids`, `fixture.names`), the three team members (`mock-gauzy-server.mjs:120-135`),
 * the reader's role and its permissions (`:50-81`), the organization's `allowManualTime / allowModifyTime / allowDeleteTime`
 * (`:95-97`), the profile's `timeZone: 'UTC'` (`:94`, `:106`), and the team membership `isManager` (`:218-223`). Test 1 runs
 * with **no stub**: the mock's own `/api/timesheet/time-log` handler answers, and that is the whole no-log page.
 *
 * **Served by this file:** every time-log read and every write from test 2 on, through `page.route` on the mock origin
 * (the pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`), because the mock has no idea what a served
 * log, a changed status or a deleted entry looks like. Each answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`; `OPTIONS` → 204 at `:1097-1101`) — the page is on `localhost:3032`, the API on
 * `127.0.0.1:3996`. The store is a plain object the tests can change mid-case (`state.refusals`, `state.conflicts`),
 * which is how the refused read, the refused PUT and the refused conflict lookup are armed without re-registering a
 * route. The stub answers a read **only with the logs its `employeeIds[]` and `startDate` / `endDate` ask for**, which
 * is what a real backend does and what lets the member filter and the period picker visibly change the page.
 * `route.fetch()` is never called on a served path, so `mock.calls('/api/timesheet/time-log')` stays empty in every
 * stubbed test — the witness that the page acted on this file and not on the mock.
 *
 * **The browser talks to the mock, never to the app's route twins**: the lane points the client's axios base at
 * `<mock origin>/api` (`test-servers.ts:37-42`), so `app/api/**` is not in this file's path. Request counting filters
 * on `request.frame()` because the sign-in helper hard-loads the dashboard first (`playwright/helpers.ts:424`).
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `timesheets-page.tsx`: the member breadcrumb `:523-529` (`[{team.name '/'}, {title '/reports/timesheet/<memberId>'}]`);
 *   `pageMetaOf` joined by `' · '` `:135-151`; the empty / no-match states `:161-184` with the `common.CLEAR_FILTERS`
 *   action; the `ExportMenu` + `dashboard.timesheets.ADD_TIME` row `:347-357`; the error branch
 *   `showsError && <DashboardErrorNotice onRetry={page.retry}>` `:392`; the selection bar `:544-556`.
 * - `core/hooks/dashboards/timesheets/use-timesheets-page.ts`: `VIEW_STORAGE_KEY = 'timesheets-view'` `:75` and
 *   `viewOf` defaulting to `sheet` `:105-111`; `scopeEmployeeIdsOf` (the member ids a read asks for) `:146-156`;
 *   `initialPeriodFor` / `periodForView` `:158-162`; the client-side narrowing comment `:174`; `clearNarrowing` `:397-403`.
 * - `core/hooks/dashboards/timesheets/use-timesheet-page-logs.ts`: `employeeIds[]` sent only for a member filter `:19-20`, `:112`.
 * - `core/services/client/api/timesheets/time-log.service.ts`: `getTimeLogs` query `:271-343`; `deleteTimeLogs`
 *   `DELETE /timesheet/time-log?<organizationId&tenantId&logIds[i]>` `:382-412`; `createTimesheetFrom` `POST` `:414-427`;
 *   `updateTimeLog` `PUT /timesheet/time-log/<id>` `:429-444`; `getTimeLogConflicts` `GET /timesheet/time-log/conflict?<query>` `:228-269`.
 * - `core/hooks/timesheet/use-time-overlap-guard.ts`: every manual write asks the conflict lookup first; "A lookup
 *   that fails saves nothing"; an overlap holds the save until `TimeOverlapConfirmDialog` confirms (`confirmLabel`
 *   `timeOverlap.CONFIRM_SAVE`, `edit-task-modal.tsx:480`).
 * - `core/hooks/dashboards/timesheets/use-sheet-editing.ts` `:120-140` (`canWrite = myPermissions.includes('ALLOW_MANUAL_TIME') && (isOwnSheet || hasOrganizationRole)`),
 *   `:184` `readSavedMemberLogs`; `core/hooks/dashboards/timesheets/timesheet-sheet-edit.ts` `:478-511` (the cell and
 *   day locks, `PLACEMENT_START_HOUR = 9`); `core/hooks/dashboards/timesheets/use-sheet-cell-writes.ts` `:200-215` (the
 *   create body), `:250-262` (shortening a cell deletes logs).
 * - `core/hooks/dashboards/timesheets/use-timesheet-log-actions.ts`: `changeStatus` (its `ids` are the logs'
 *   *timesheet* ids, `timesheetIdsOf`), `writeBillable` (startedAt / stoppedAt / employeeId / isBillable only),
 *   `deleteLogs` (chunks of `DELETE_BATCH_SIZE = 100`).
 * - `core/lib/utils/dashboards/timesheets.ts`: `isOrganizationRole` `:64-69`; `core/lib/utils/dashboards/manual-time-entry.ts`:
 *   `addTimeScopeOf` `:362-375`; `core/hooks/dashboards/timesheets/use-add-time-access.ts` (`MANUAL_TIME_PERMISSION =
 *   'ALLOW_MANUAL_TIME'`, `fixedMember` for scope `own`); `timesheet-review.ts` (`getAllowedTimesheetStatuses`,
 *   `offersApproveAndReject`).
 * - Rows: `timesheet-log-row.tsx` (`role="row"` + `aria-selected` `:273-274`, the row checkbox `aria-label=SELECT_LOG`
 *   `:287`, `common.MORE_OPTIONS` `:143`, the quick Approve / Reject `:193`, `:208`, shown only for a PENDING log of a
 *   member the reader manages `:255-257`); `timesheets-list.tsx` (the day checkbox `SELECT_DAY` `:267`, the day
 *   `role=rowheader` `:270`, `role=table aria-label=TITLE` `:365`); `timesheet-log-changes.tsx` (the notes line
 *   `common.NOTES + ': ' + notes`, in an `sr-only` span `:160-170`); `timesheet-menu-parts.tsx` (`offeredStatusesOf`
 *   `:19-22`, the `common.CHANGE_STATUS` submenu, the Billable submenu Yes / No).
 * - Toolbar and cards: `timesheets-toolbar.tsx` (the `searchbox` named `SEARCH_PLACEHOLDER`, `CLEAR_SEARCH`, the
 *   `PeriodPicker` and the view `SegmentedControl` named `VIEW_LABEL`); `timesheets-status-cards.tsx` `:96-112`
 *   (`<button aria-pressed>` holding label + count + `STATUS_CARDS.LOG_UNIT` + duration); `timesheets-filters.tsx`
 *   (the seven categories `:198-258` — `common.MEMBERS`, `dashboard.timesheets.PROJECTS`, `common.TASKS`,
 *   `clients.TITLE`, `dashboard.timesheets.BILLABLE`, `timer.labels.TASK_LABELS`, `common.LABELS` — and
 *   `common.CLEAR_FILTERS` `:370`); `kit/dashboard-layout.tsx:147-148` (`ReportGroup`
 *   renders a `role=rowgroup` with a `role=row` header **without** `aria-selected`).
 * - Dialogs: `common/modal.tsx:67-100` (Headless UI `Dialog as="div"` → `role=dialog aria-modal=true`, its overlay is
 *   `div.fixed.inset-0 flex items-center justify-center p-4` `:86` — **no scroll container**, finding 8);
 *   `features/tasks/edit-task-modal.tsx` (`title=common.TIME_LOG` `:303`, the form `:307`, the submit
 *   `common.SAVE` `:468-471`, the notes `textarea` `required`, `aria-label=modals.timeLog.notesPlaceholder` `:418-437`,
 *   the Start / End `TimeField`s `:346`, `:360`); `features/timesheet/add-mask-modal.tsx` (title `+ common.ADD_TIME_ENTRY`
 *   `:461`, the task picker `:476`, the employee picker `:495-509`, the billable toggles `:552-563`, the notes
 *   `:569-581`, Cancel / Save `:602`, `:611`, the period accordion `:773-810` and its Date / `common.SHIFT_TIMING` /
 *   Start / End / Duration fields `:846-868`); `features/timesheet/reject-selected-modal.tsx` (title
 *   `pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED` `:86`, the reason field `aria-label=pages.timesheet.REJECTION_REASON`
 *   `:106`, its body `pages.timesheet.YOU_ARE_ABOUT_TO_REJECT_ENTRY`); `common/alert-dialog-confirmation.tsx:69-110`
 *   (`AlertConfirmationModal`, which renders the delete confirm inside `Modal` with its title in an `h3` — it has **no**
 *   accessible name, finding 7); `dashboards/timesheets/timesheets-bulk-edit-dialog.tsx:97`
 *   (`title=dashboard.timesheets.BULK_EDIT.TITLE`) with `timesheets-bulk-edit-fields.tsx`.
 * - Export: `timesheets-export.tsx` (`FILE_PREFIX = 'timesheets'` `:38`, the CSV columns `:78-96`, `:130-142`,
 *   `periodFileNameOf` `dashboard-export.ts:86-95` — read in `manual-time-edits-report-ui.spec.ts:250-260`).
 *
 * ## Findings the measurements forced
 *
 * 1. **Two zones on one page.** The page's own read sends `timeZone=<profile zone>` and its `startDate` / `endDate`
 *    are that zone's day bounds (`2026-11-23T00:00:00.000Z` … `2026-11-29T23:59:59.999Z`, `-probe-3.log` R2), while
 *    every clock it prints is the browser's zone ("09:00 AM – 11:00 AM" for a log served at `…T08:00:00.000Z`, same
 *    line) — and the sheet's write-time lookup sends the **browser** zone instead (`startDate 2026-11-22T23:00:00.000Z`,
 *    `timeZone Europe/Madrid`, `-probe-4.log` D6 readsAfterWrite).
 * 2. **Approve and reject are offered for other members' logs only.** With the fixture manager's role the quick
 *    Approve / Reject appeared on the teammate's PENDING row and not on the reader's own (`-probe-3.log` R2 rowButtons,
 *    R3: the own row's menu has `Continue, Duplicate, Edit, Billable, Delete` and **no** Change status, the teammate's
 *    has `Edit, Change status, Billable, Delete`; `offersApproveAndReject` / `getAllowedTimesheetStatuses`,
 *    `timesheet-review.ts`).
 * 3. **A status is a whole timesheet.** `PUT /api/timesheet/status` sends the logs' *timesheet* ids, not the log ids
 *    (`ids:["sheet-teammate-pending"]`, `-probe-3.log` R4; `["sheet-teammate-denied","sheet-teammate-pending"]` with
 *    the reject reason, `-probe-7.log` G5), and the rejected rows then read `Reason: <reason>` (`dashboard.timesheets.REJECTION_REASON`).
 * 4. **Which narrowing costs a read.** Search and the status cards are client-side (rows 3 and 2 with the read count
 *    unchanged, `-probe-3.log` R14 afterSearch / afterStatusCard); the member filter sends `employeeIds[0]` and re-reads
 *    (`memberRead`, `rowsAfterMember 3`); applying one makes the trigger read `Filter1` and the chip `Remove <name>`.
 * 5. **A `role=row` count is not a log count.** Six served logs rendered 10 `[role=row]` nodes and 6
 *    `[role=row][aria-selected]` ones (`-probe-3.log` R2 rowTotal / logRowTotal): the column-header row and one day
 *    header row per day also carry `role=row` (`timesheets-list.tsx:270`, `kit/dashboard-layout.tsx:147-148`), and only
 *    `TimesheetLogRow` sets `aria-selected` (`timesheet-log-row.tsx:273-274`).
 * 6. **The view is kept in `localStorage`, never in the URL.** `timesheets-view` went `null → "list" → "week" →
 *    "month" → "screenshots"` while `page.url()` stayed the member's path (`-probe-5.log` E7), and the value is stored
 *    JSON-encoded (`useLocalStorageState` → `JSON.stringify`, `use-local-storage-state.ts:45`, `-0c.log` `view List`), so
 *    the raw read carries the quotes. Switching to Month also
 *    moved the **period** (meta `Nov 1 – 30 · 7h 15m · 2 members`, `use-timesheets-page.ts:158-162`), and Screenshots
 *    kept its own week strip (`Previous week` / `Next week`) with no status strip at all (groups `["Period"]`). The moved
 *    period stays when Week is opened again — that Week read 41 day groups starting `Monday, Oct 26` (`-0d.log`
 *    `week view after month`) — so test 3 reads the Week view's own day groups before Month is ever opened.
 * 7. **The delete confirm cannot be found by accessible name.** `AlertConfirmationModal` puts its title in an `h3`
 *    inside `Modal` (`alert-dialog-confirmation.tsx:69-110`), so `getByRole('dialog', { name: … })` — the pattern
 *    `task-property-settings-ui.spec.ts:1289` uses — matched 0 of them (`-probe-6.log` F3); every dialog here is found
 *    by text it shows instead.
 * 8. **These dialogs have no scroll container.** The overlay is `div.fixed.inset-0 flex items-center justify-center p-4`
 *    (`common/modal.tsx:86`) with the panel centred in it, so at the lane's 1280x720 viewport the edit dialog's footer
 *    sits outside the viewport (its `Save` measured at `744,754 66x31` against `win 1280x720`, `-probe-7.log` G1
 *    geometry) and Playwright cannot click it; the dialog tests raise the viewport (`setViewportSize`) and say so.
 * 9. **Every manual write asks the conflict lookup first.** The edit dialog sent `GET /api/timesheet/time-log/conflict`
 *    before its PUT (`-probe-7.log` G1 calls: `…&startDate=…T08:00:00.000Z&…&ignoreId[0]=own-pending`), and a refused
 *    lookup saves nothing — the dialog then reads `timeOverlap.CHECK_FAILED` with 0 writes (`-probe-8.log` H3). An
 *    overlap holds the save behind "This removes … of recorded time" until `Save anyway` (`-probe-8.log` H2).
 * 10. **The row's notes line is screen-reader text.** After a save the task cell read `Fixture active taskNotes: Suite
 *     notePending…` — the `Notes: ` prefix is inside an `sr-only` span (`timesheet-log-changes.tsx:169`).
 * 11. **The bulk edit dialog refuses until one field is chosen.** `Update entries` is `disabled` while every field is
 *     on `Keep as is` (its summary is `BULK_EDIT.NOTHING_CHOSEN`, `-probe-7.log` G7); picking Billable → No made the
 *     summary `2 entries will be updated` and the button `Update 2 entries`, which sent `PUT …/time-log/own-pending`
 *     with `isBillable:false` (`-probe-8.log` H4).
 * 12. **Who sees Add time.** `addTimeScopeOf` (`manual-time-entry.ts:362-375`): the fixture manager's organization
 *     role → the button (2 on the no-log page, `-probe-3.log` R1); role `EMPLOYEE` with no `ALLOW_MANUAL_TIME` → **0**
 *     (`-probe-6.log` F7); role `EMPLOYEE` **with** `ALLOW_MANUAL_TIME` → the button, and its dialog names the member
 *     and says `manualTime.OWN_TIME_ONLY` (`fixedMember`, `-probe-9.log` H6). The mock never turns
 *     `organization.allowManualTime` off, so the `NONE` branch of that rule
 *     (`dashboard.timesheets.SHEET.EDIT.NOTICE_MANUAL_TIME_OFF`) is not reachable here (`mock-gauzy-server.mjs:95`
 *     `allowManualTime: true`, its only occurrence in the mock).
 * 13. **Opening the edit dialog logs a React dev warning** — `In HTML, <button> cannot be a descendant of <button>`
 *     naming `<DatePickerFilter … label="Oct 01 2024">` (`edit-task-modal.tsx:360`), on every case that opens it
 *     (`-probe-7.log` G1 console, `-probe-8.log` H3 console). It is excused by name, like the shell's `getSnapshot`
 *     warning, and nothing else on those tests is.
 * 14. **`In review` is a card only when such a log exists**: 5 status cards on the no-log page, 6 once an
 *     `IN REVIEW` log is served (`-probe-3.log` R1 vs R2).
 * 15. **The two log dialogs label their notes field differently.** The edit dialog reads the copy key
 *     `modals.timeLog.notesPlaceholder` = "Add notes here" (`edit-task-modal.tsx:429`, `:437`); the Add time dialog
 *     hard-codes `placeholder="Insert notes here..."` (`add-mask-modal.tsx:573`) and `aria-label="Insert notes here"`
 *     (`:581`), and its Start / End inputs hard-code `placeholder="00:00:00"` (`:859`, `:868`).
 *     `[MEASURED, NOT INTENDED]` — the repo's own rule is "Keep i18n-friendly: use `next-intl` messages, avoid
 *     hard-coded strings" (`CLAUDE.md` §7), and `edit-task-modal.tsx:429` follows it for the same field:
 *     `placeholder={t('modals.timeLog.notesPlaceholder')}`. Test 10 therefore names those strings as measured literals.
 * 16. **A bulk edit updates one entry per request.** `BULK_EDIT.PROGRESS = "Updating entries: {done} of {total}"`,
 *     `UPDATED_PARTLY` and `STILL_SELECTED` promise a per-entry walk, and `use-timesheet-log-actions.ts` chunks its
 *     deletes the same way. `-probe-8.log` H4 selected two entries served `isBillable:true`, the summary read
 *     "2 entries will be updated", and its `writes` line — taken the moment the first PUT landed — printed one PUT
 *     (`…/time-log/own-pending`, `isBillable:false`), so the second was still in flight. Test 14 waits for both PUTs and
 *     prints them, so the run itself carries the count.
 * 17. **`Link to project*` is not required by the request it labels.** The Add time `POST` body carried no `projectId`
 *     at all and the entry was created (`-probe-10.log` I1 writes), while the picker's own label says the field is
 *     required (`common.LINK_TO_PROJECT` `*`). The notes field is also marked destructive while empty
 *     (`add-mask-modal.tsx:577`) and the save still went through with `description:""`.
 * 18. **The member's sheet is read-only for the fixture's own role.** A cell opens to its viewer only under `canWrite` =
 *     `ALLOW_MANUAL_TIME` on the role **and** a write right on the member (`use-sheet-editing.ts:131-133`), and the mock's
 *     role permissions do not carry `ALLOW_MANUAL_TIME` (`mock-gauzy-server.mjs:50` `basePermissions`, the same finding
 *     `time-import-settings-ui.spec.ts:128-131` records). Without it every cell is `ReadOnlyCell` — a
 *     `cell "No time"` or a duration button naming its entries (`timesheets-sheet-cell.tsx:70-119`, what test 3 measures;
 *     `-0b.log` test 11 found 0 `input[inputmode=decimal]`) — so test 11 is the one case that signs in with
 *     `scenario.extraPermissions:['ALLOW_MANUAL_TIME']`.
 * 19. **Which sheet cells are open follows the served entries, not the calendar.** `cellLockOf`
 *     (`timesheet-sheet-edit.ts:478-511`) drops a day after today (the mock's organization names
 *     `allowManualTime` / `allowModifyTime` / `allowDeleteTime` but no `futureDateAllowed`, `mock-gauzy-server.mjs:95-97`,
 *     so `allowsFutureDates` is false) and a day holding one of the member's APPROVED entries (`approvedDayKeysOf`
 *     `:543-555`), so the sheet offered 9 inputs = 3 rows × {Monday, Yesterday, Today} with Tuesday locked as approved
 *     and Friday to Sunday as future (`-probe-4.log` D6 inputs). Test 11 computes that set from the store it serves.
 * 20. **A refused call leaves three named lines in the console, not one.** Besides the client's HTTP error line, React
 *     prints the ancestor half of its nesting warning (`<%s> cannot contain a nested %s.` / "See this log for the
 *     ancestor stack trace.", `-0b.log` test 9), `mutation-error-toaster.tsx:48` logs
 *     `Mutation failed: Error: Failed to update time-log` for the throw of `time-log.service.ts:442`, and
 *     `use-time-overlap-guard.ts:160` logs `[Time overlap check failed]` for the refused lookup. Each is excused by that
 *     exact wording and counted, so an unarmed failure cannot hide in it.
 * 21. **`common.SHIFT_TIMING` is a label, not a control.** The Add time dialog's accessibility tree reads
 *     `text: Shift timing` then `button "Start"` / `combobox: 00:00:00` / `button "End"` / `combobox: 00:00:00` /
 *     `textbox "Duration"` (`-0b.log` test 10 snapshot), so test 10 pins it as text.
 * 22. **A period the page already read is not read again.** Stepping `Previous period` back to this week moved the meta
 *     line and the trigger's own name without any new request (`-0b.log` `back to this week`: read count unchanged, last
 *     read still the next week's `startDate 2026-11-30T00:00:00.000Z`) — TanStack's cache answers it, so test 4 pins the
 *     period the page *shows* and prints the read count instead of asserting a request.
 * 23. **The period trigger is named by a preset when a preset covers the period, and by the period text otherwise.** On
 *     this week its accessible name was `common.THIS_WEEK` (`-0c.log` snapshot `button "This week"`); one week ahead,
 *     where no preset reaches, it was the period itself (`-0.log` / `-0c.log` `period group buttons`
 *     `["Previous period|", "|Nov 30 – Dec 6", "Next period|"]` — the middle button has no `aria-label`, so its name is
 *     its text). The calendar is therefore opened from the trigger's preset name and pinned to the month the *shown*
 *     period starts in, never to the last read a cached step left behind.
 * 24. **Screenshots shows the member rail, not a `SHEET.PICK_MEMBER` button.** Its accessibility tree at the lane's
 *     1280x720 viewport lists `navigation "Members with time in this period"` with one button per member —
 *     `button "FM Fixture Manager 3h 45m Pending" [pressed]` and `button "FT Fixture Teammate 3h 30m Pending"`
 *     (`-1.log`) — and no button named by `SHEET.PICK_MEMBER`. That label was only ever met by an `[aria-label]` sweep of
 *     the whole DOM (`-probe-5.log` E7 `Screenshots namedButtons`), which counts controls the viewport does not show;
 *     test 3 prints both counts (`pick member control`) and pins the rail instead.
 *
 * ## What this file does not cover
 *
 * The Screenshots view's images (only its labels are read); the Excel and PDF exports (only the CSV's name and header
 * are read); the day-group menu, `Group similar entries` (`SHEET.*`/`SIMILAR.*`) and the entry *history* panel
 * (`dashboard.timesheets.HISTORY.*`, `time-log-history.tsx` — a read this lane's mock does not answer); `Duplicate`
 * and `Continue` in the row menu (they open the Add time dialog with the entry copied, `timesheets-dialogs.tsx:78-120`);
 * `Add another period` (several intervals in one save, `add-mask-modal.tsx:810`); the sheet's `Copy last week` menu,
 * its `ADD_ROW` / `REMOVE_ROW` tools and the `SHEET.EDIT.LOCK_*` tooltips (test 11 pins **which** cells the future and
 * approved locks close, never the wording they show), the sheet's running-timer lock (no served entry runs,
 * `isRunning:false`) and its `manualTimeOff` lock (the mock never turns `organization.allowManualTime` off);
 * `timesheets-calendar.tsx`; the `UPDATING` bar and the skeletons (they need a slow read
 * this file does not arm); what other specs already pin for this page family (`suites/lane-b/manual-time-edits-report-ui.spec.ts`,
 * `suites/lane-a/reports-gate-by-role-ui.spec.ts`).
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
/** `timesheets-status-cards.tsx` / `kit` figure the page puts where a number cannot be. */
const MISSING_VALUE = '–';
/** `timesheets-export.tsx:38`. */
const FILE_PREFIX = 'timesheets';
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
			BULK_EDIT: Copy;
			CHANGE: Copy;
			COLUMNS: Copy;
			diary: Copy;
			reject: Copy;
			SHEET: Copy & { EDIT: Copy };
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
const PERIOD = EN.dashboard.period;
const STATES = EN.dashboard.states;
const C = EN.common;
const MANUAL = EN.manualTime;
const OVERLAP = EN.timeOverlap;
const TIMESHEET_PAGE = EN.pages.timesheet;
const TOASTS = EN.toasts;

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

`localDay(0)` is the day the run runs on, at local noon; `at(offset, hour, minute)` is an instant on the local day
`offset` days from it. Nothing here names a date. */

const pad = (value: number) => String(value).padStart(2, '0');
const localDay = (offset: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offset);
	return day;
};
const at = (offset: number, hour: number, minute = 0) => {
	const day = new Date();
	day.setHours(hour, minute, 0, 0);
	day.setDate(day.getDate() + offset);
	return day;
};
const isoOf = (date: Date) => date.toISOString();
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

const formatWith = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(WORKSPACE_LOCALE, options);
/** How many days a `YYYY-MM` month has — the calendar pin below is built from this, never from today's date. */
const daysInMonthOf = (monthKey: string) => {
	const [year, monthNumber] = monthKey.split('-').map(Number);
	return new Date(year, monthNumber, 0).getDate();
};
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
	const monday = new Date(today.getTime() - sinceMonday * 86_400_000);
	monday.setUTCDate(monday.getUTCDate() + weeksFromNow * 7);
	const sunday = new Date(monday.getTime() + 6 * 86_400_000);
	const key = (day: Date) => `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
	return {
		fromKey: key(monday),
		toKey: key(sunday),
		from: `${key(monday)}T00:00:00.000Z`,
		to: `${key(sunday)}T23:59:59.999Z`,
		fromDate: new Date(`${key(monday)}T12:00:00Z`),
		toDate: new Date(`${key(sunday)}T12:00:00Z`)
	};
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
const longDayLabelOf = (instant: Date | string, zone: string) =>
	formatWith({ weekday: 'long', day: 'numeric', month: 'long', timeZone: zone }).format(new Date(instant));
/** `TimesheetFormatters.time` (`dashboards/timesheets.ts:598-611`): the page's clock is the **browser's** zone. */
const clockOf = (date: Date) => formatWith({ hour: '2-digit', minute: '2-digit' }).format(date);
const timeRangeOf = (from: Date, to: Date) => `${clockOf(from)} – ${clockOf(to)}`;
/** The same clock as the edit dialog's time fields write it ("9:00 AM", `common.PICK_A_TIME` picker). */
const timeInputOf = (date: Date) => formatWith({ hour: 'numeric', minute: '2-digit' }).format(date);
/** `formatDurationShort` (`core/lib/utils/dashboard-figures.ts:19-22`). */
/** `formatDurationShort` (`core/lib/utils/dashboard-figures.ts:19-22`): minutes are **not** padded ("2h 0m"). */
const durationOf = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
/** The CSV's duration (`timesheets-export.tsx`): `1:30`. */
const csvDurationOf = (seconds: number) => `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}`;
const csvDayOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const csvClockOf = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
/** `imgTitle` (`core/lib/helpers/img-title.ts:1-6`): the initials of the **first two words** — "Fixture Restricted
    Teammate" is `FR`, which is what the filter menu and every member cell print. */
const initialsOf = (name: string) => {
	const words = name.replace(/[^a-zA-Z ]/g, '').split(' ');
	const first = words[0]?.charAt(0) ?? '';
	const second = words[1]?.charAt(0);
	return (second ? `${first}${second}` : name.substring(0, 2)).toUpperCase();
};

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

/**
 * Six logs of the fixture team, all inside the week the sheet opens on: two members, five statuses, one without a
 * task, one added by hand, one rejected with a reason, and a timesheet id per log (`sheet-<id>`).
 */
const servedLogs = (fixture: Fixture): ServedLog[] => {
	const own = fixture.ids.employee;
	const teammate = fixture.ids.teammateEmployee;
	const project = { id: fixture.ids.project, name: PROJECT_NAME, color: '#22c55e' };
	const logOf = (options: {
		id: string;
		employeeId: string;
		userId: string;
		fullName: string;
		offset: number;
		startHour: number;
		startMinute: number;
		seconds: number;
		status: string;
		isBillable: boolean;
		taskId?: string;
		taskTitle?: string;
		projectId?: string | null;
		project?: Record<string, unknown> | null;
		logType?: string;
		reason?: string;
	}) => {
		const startedAt = at(options.offset, options.startHour, options.startMinute);
		const stoppedAt = new Date(startedAt.getTime() + options.seconds * 1000);
		return {
			id: options.id,
			startedAt: isoOf(startedAt),
			stoppedAt: isoOf(stoppedAt),
			duration: options.seconds,
			logType: options.logType ?? 'TRACKED',
			source: 'TEAMS',
			isBillable: options.isBillable,
			isRunning: false,
			version: '1',
			employeeId: options.employeeId,
			employee: employeeOf(options.employeeId, options.fullName, options.userId),
			taskId: options.taskId ?? null,
			task: options.taskId ? { id: options.taskId, title: options.taskTitle, taskNumber: null } : null,
			projectId: options.projectId ?? null,
			project: options.project ?? null,
			timesheetId: `sheet-${options.id}`,
			timesheet: { id: `sheet-${options.id}`, status: options.status, reason: options.reason ?? null },
			notes: null,
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA
		};
	};
	return [
		logOf({
			id: 'own-pending',
			employeeId: own,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: -1,
			startHour: 9,
			startMinute: 0,
			seconds: 7200,
			status: 'PENDING',
			isBillable: true,
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task,
			projectId: fixture.ids.project,
			project
		}),
		logOf({
			id: 'own-approved',
			employeeId: own,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: -2,
			startHour: 12,
			startMinute: 15,
			seconds: 3600,
			status: 'APPROVED',
			isBillable: false,
			taskId: 'suite-task-2',
			taskTitle: 'Suite afternoon task',
			projectId: fixture.ids.project,
			project,
			logType: 'MANUAL'
		}),
		logOf({
			id: 'teammate-denied',
			employeeId: teammate,
			userId: fixture.ids.teammateUser,
			fullName: fixture.names.teammate,
			offset: -1,
			startHour: 14,
			startMinute: 0,
			seconds: 5400,
			status: 'DENIED',
			isBillable: true,
			taskId: 'suite-task-3',
			taskTitle: 'Suite teammate task',
			projectId: fixture.ids.project,
			project,
			reason: 'Wrong day'
		}),
		logOf({
			id: 'teammate-inreview',
			employeeId: teammate,
			userId: fixture.ids.teammateUser,
			fullName: fixture.names.teammate,
			offset: -3,
			startHour: 8,
			startMinute: 30,
			seconds: 1800,
			status: 'IN REVIEW',
			isBillable: false
		}),
		logOf({
			id: 'own-draft',
			employeeId: own,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: -3,
			startHour: 16,
			startMinute: 0,
			seconds: 2700,
			status: 'DRAFT',
			isBillable: true,
			taskId: 'suite-task-4',
			taskTitle: 'Suite draft task'
		}),
		logOf({
			id: 'teammate-pending',
			employeeId: teammate,
			userId: fixture.ids.teammateUser,
			fullName: fixture.names.teammate,
			offset: -2,
			startHour: 10,
			startMinute: 30,
			seconds: 5400,
			status: 'PENDING',
			isBillable: true,
			taskId: 'suite-task-5',
			taskTitle: 'Suite teammate pending task',
			projectId: fixture.ids.project,
			project
		})
	];
};

const paramsOf = (url: URL) => {
	const params: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		params[key] = value;
	});
	return params;
};

/**
 * Every list this page sends is indexed in the query string (`logIds[0]`, `ignoreId[0]`, `relations[0]`,
 * `employeeIds[0]`), so a list is read out of its bracketed keys in order — `searchParams.getAll('logIds')` finds
 * nothing, because no key is named `logIds` (`time-log.service.ts:382-412`, `:228-269`).
 */
const queryValuesOf = (search: string, name: string) =>
	Array.from(new URL(`http://x${search}`).searchParams.entries())
		.filter(([key]) => key === name || key.startsWith(`${name}[`))
		.sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
		.map(([, value]) => value);

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
				const created = {
					...(body ?? {}),
					id: `suite-new-${state.logs.length + 1}`,
					duration: Math.round(
						(new Date(String((body ?? {}).stoppedAt)).getTime() -
							new Date(String((body ?? {}).startedAt)).getTime()) /
							1000
					),
					isRunning: false,
					logType: (body ?? {}).logType ?? 'MANUAL',
					source: (body ?? {}).source ?? 'TEAMS',
					employee: state.logs[0]?.employee,
					timesheetId: `suite-new-${state.logs.length + 1}`,
					timesheet: { id: `suite-new-${state.logs.length + 1}`, status: 'PENDING' }
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

const newStore = (
	fixture: Fixture,
	refusals: Record<string, number> = {},
	conflicts: ServedLog[] = []
): ServedState => ({
	logs: servedLogs(fixture),
	refusals,
	conflicts
});

/** The store holds plain objects, so every nested read of a served log is a typed cast. */
const taskTitleOf = (log: ServedLog, fallback: string) => {
	const task = log.task as Record<string, unknown> | null;
	return task ? String(task.title) : fallback;
};
const projectNameOf = (log: ServedLog, fallback: string) => {
	const project = log.project as Record<string, unknown> | null;
	return project ? String(project.name) : fallback;
};
const fullNameOf = (log: ServedLog) => String((log.employee as Record<string, unknown>).fullName);
const statusLabelOf = (log: ServedLog) =>
	(T.STATUS as Copy)[String((log.timesheet as Record<string, unknown>).status).replace(' ', '_')] ?? '';

/** Every request the page's own frame made to the served log path: the sign-in helper hard-loads the dashboard first. */
function recordMockReads(page: Page) {
	const reads: { method: string; path: string; params: Record<string, string>; frameUrl: string }[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN || !url.pathname.startsWith(LOGS_PATH)) return;
		const params: Record<string, string> = {};
		url.searchParams.forEach((value, key) => (params[key] = value));
		reads.push({ method: request.method(), path: url.pathname, params, frameUrl: request.frame().url() });
	});
	return reads;
}

/* ------------------------------------------------------------------ the page's parts */

const titleOf = (page: Page) => page.getByRole('heading', { level: 1 });
const metaLine = (page: Page) => page.locator('h1 + span');
const breadcrumb = (page: Page) => page.locator('nav[aria-label="breadcrumb"]');
const bodyRegion = (page: Page) => page.getByRole('region', { name: T.TITLE, exact: true });
const statusStrip = (page: Page) => page.getByRole('group', { name: T.STATUS_STRIP_LABEL, exact: true });
const viewTabs = (page: Page) => page.getByRole('tablist', { name: T.VIEW_LABEL, exact: true });
const searchBox = (page: Page) => page.getByRole('searchbox', { name: T.SEARCH_PLACEHOLDER, exact: true });
const filterButton = (page: Page) => page.getByRole('button', { name: new RegExp(`^${C.FILTER}`) });
const exportButton = (page: Page) => page.getByRole('button', { name: C.EXPORT, exact: true });
const addTimeButtons = (page: Page) => page.getByRole('button', { name: T.ADD_TIME, exact: true });
const table = (page: Page) => page.getByRole('table', { name: T.TITLE, exact: true });
/** Only `TimesheetLogRow` sets `aria-selected` (`timesheet-log-row.tsx:273-274`) — finding 5. */
const logRows = (page: Page) => table(page).locator('[role=row][aria-selected]');
const rowOf = (page: Page, taskTitle: string) =>
	logRows(page).filter({ has: page.getByRole('checkbox', { name: copy(T.SELECT_LOG, { task: taskTitle }) }) });
const rowCheckbox = (page: Page, taskTitle: string) =>
	rowOf(page, taskTitle).getByRole('checkbox', { name: copy(T.SELECT_LOG, { task: taskTitle }) });
const rowMenuButton = (page: Page, taskTitle: string) =>
	rowOf(page, taskTitle).getByRole('button', { name: C.MORE_OPTIONS, exact: true });
const openMenu = (page: Page) => page.locator('[role=menu]:visible');
const selectionBar = (page: Page) => page.getByRole('toolbar').first();
/** Every dialog of this page, found by a text it shows — finding 7. */
const dialogOf = (page: Page, text: string) => page.locator('[role=dialog]').filter({ hasText: text });
const dialogCount = (page: Page, text: string) => dialogOf(page, text).count();
const openDialog = async (page: Page, text: string) => {
	await expect.poll(() => dialogCount(page, text), { timeout: 20_000 }).toBe(1);
	return dialogOf(page, text).first();
};
/**
 * The dialogs of this page are centred in an overlay with no scroll container (`common/modal.tsx:86`), so at the lane's
 * 720px viewport their footer is outside the viewport and Playwright cannot click it (finding 8): these tests raise
 * the viewport to the height the measured panel needs.
 */
const clickDialogButton = async (page: Page, button: Locator, label: string) => {
	try {
		await button.click({ timeout: 8_000 });
		report(`${label} click`, 'lane viewport');
	} catch (error) {
		report(
			`${label} click`,
			`after raising the viewport; the lane viewport refused it: ${flat(String(error)).slice(0, 120)}`
		);
		await page.setViewportSize({ width: 1280, height: 1_100 });
		await button.click({ timeout: 20_000 });
	}
};

const textOf = async (locator: Locator) => flat(await locator.evaluate((node: Element) => node.textContent ?? ''));
const textsOf = (locator: Locator) =>
	locator.evaluateAll((nodes: Element[]) =>
		nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
	);
const cellsOf = (row: Locator) =>
	row.evaluate((node: Element) =>
		Array.from(node.querySelectorAll('[role=cell], [role=rowheader]')).map((cell) =>
			(cell.textContent ?? '').replace(/\s+/g, ' ').trim()
		)
	);
const cardText = (label: string, count: number, seconds: number) =>
	`${label}${count}${copy(T.STATUS_CARDS.LOG_UNIT, { count })}${durationOf(seconds)}`;
const statusCardTexts = (page: Page) =>
	statusStrip(page)
		.locator('button')
		.evaluateAll((nodes: Element[]) =>
			nodes.map(
				(node) =>
					`${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}|${node.getAttribute('aria-pressed') ?? ''}`
			)
		);
const logRowTotal = (page: Page) => table(page).locator('[role=row]').count();

const openRowMenu = async (page: Page, taskTitle: string, item: string) => {
	await rowMenuButton(page, taskTitle).click();
	await openMenu(page).getByRole('menuitem', { name: item, exact: true }).click();
};

/**
 * The Billable submenu marks the value a log already has with the copy `Selected`, and a menu row's accessible name is
 * `<name> <secondary text>` — so the chosen value is read out of the single row that carries the mark (`-probe-3.log` R6).
 */
const selectedMenuItem = (items: string[]) => {
	// The mark is appended to the value with no separator — the submenu read `["YesSelected", "No"]`.
	const marked = items.filter((item) => item.includes('Selected'));
	return marked.length === 1 ? marked[0].replace(/Selected.*$/, '') : '';
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
 * reading `<%s> cannot contain a nested %s. / See this log for the ancestor stack trace. button <button>` (`-0b.log`
 * `console`, test 9). Both come from the date picker's own `<button data-slot="button">` inside the popover trigger
 * `<button data-slot="popover-trigger">`, so the second half is excused by its own exact wording. */
const DATE_PICKER_NESTED_ANCESTOR = 'cannot contain a nested';
/* What a refused call leaves in the console besides the client's HTTP error line, each named by the code that prints it:
 * `mutation-error-toaster.tsx:48` `console.error('Mutation failed:', mutation.state.error)` printing the
 * `time-log.service.ts:442` `new Error('Failed to update time-log', { cause: error })` the armed 400 produced, and
 * `use-time-overlap-guard.ts:160` `logErrorInDev('Time overlap check failed', error)` printing this file's own refusal
 * message for the armed lookup (`member-profile-ui.spec.ts:1326` treats the same phrase as the guard's own log). */
const MUTATION_TOASTER = 'Mutation failed: Error: Failed to update time-log';
const OVERLAP_GUARD_LOG = '[Time overlap check failed]';
const armedFailurePattern = (loggedPath: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: GET ${loggedPath}(\?\S*)? ${status} `);
const consoleFindings = (shield: Shield) =>
	shield
		.consoleErrors()
		.filter(
			(line) =>
				!line.includes(SHELL_STORE_NOISE) &&
				!(line.includes(DATE_PICKER_NESTED_BUTTON) && line.includes('DatePickerFilter')) &&
				!line.includes(DATE_PICKER_NESTED_ANCESTOR)
		);
const consoleFindingsWithArmed = (shield: Shield, loggedPath: string, status: number) =>
	consoleFindings(shield).filter((line) => !armedFailurePattern(loggedPath, status).test(line));
const armedFailureLines = (shield: Shield, loggedPath: string, status: number) =>
	shield.consoleErrors().filter((line) => armedFailurePattern(loggedPath, status).test(line));

test.describe('lane-b · Reports › the timesheet of a member: what a manager sees, and what the browser asks for', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------------------------------------------- 1. the lane exactly as it is: no log at all

	test('1 · no log: title, breadcrumb, toolbar, five status cards, the empty state, and the read the mock itself answered', async ({
		page,
		fixture,
		shield
	}) => {
		const reads = recordMockReads(page);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));

		await expect(titleOf(page)).toHaveText(T.TITLE);
		await expect(statusStrip(page)).toBeVisible({ timeout: 30_000 });

		const memberPage = MEMBER_PAGE(fixture.ids.employee);
		report('url', page.url());
		report('storage view', await page.evaluate(() => window.localStorage.getItem('timesheets-view')));
		await expect(page).toHaveURL(memberPage);

		const links = breadcrumb(page).locator('a');
		report(
			'breadcrumb',
			await links.evaluateAll((nodes: Element[]) =>
				nodes.map(
					(node) =>
						`${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}=>${node.getAttribute('href') ?? ''}`
				)
			)
		);
		await expect(links).toHaveCount(2);
		await expect(links.nth(1)).toHaveAttribute('href', memberPage);

		const pageRead = reads.find((read) => read.frameUrl.includes('/reports/timesheet/') && read.path === LOGS_PATH);
		if (!pageRead) throw new Error('the page made no time-log read of its own');
		const profileZone = pageRead.params['timeZone'] ?? '';
		const browserZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
		report('read params', pageRead.params);
		report('profile zone from the read', profileZone);
		report('browser zone', browserZone);
		const week = weekOfZone(profileZone);
		expect(pageRead.params['startDate'], "the read does not start at the profile zone's Monday midnight").toBe(
			week.from
		);
		expect(pageRead.params['endDate'], "the read does not end at the profile zone's Sunday midnight").toBe(week.to);
		expect(pageRead.params['organizationId']).toBe(fixture.ids.organizationA);
		expect(pageRead.params['tenantId']).toBe(fixture.ids.tenantA);
		expect(pageRead.params['activityLevel[start]']).toBe('0');
		expect(pageRead.params['activityLevel[end]']).toBe('100');
		expect([0, 1, 2, 3, 4, 5, 6].map((index) => pageRead.params[`relations[${index}]`])).toEqual([
			'project',
			'task',
			'organizationContact',
			'employee.user',
			'task.taskStatus',
			'timesheet',
			'task.tags'
		]);
		expect(
			Object.keys(pageRead.params).some((name) => name.startsWith('employeeIds[')),
			'a page opened on one member asked for employeeIds'
		).toBe(false);

		const periodText = periodTextOf(week.from, week.to, profileZone);
		await expect(metaLine(page)).toHaveText(
			`${periodText} · ${durationOf(0)} · ${copy(T.MEMBER_COUNT, { count: 0 })}`
		);

		report(
			'groups',
			await page.evaluate(() =>
				Array.from(document.querySelectorAll('[role=group][aria-label]')).map((node) =>
					node.getAttribute('aria-label')
				)
			)
		);
		await expect(page.getByRole('group', { name: PERIOD.LABEL, exact: true })).toBeVisible();
		await expect(statusStrip(page)).toBeVisible();

		const cards = await statusCardTexts(page);
		report('status cards', cards);
		expect(cards, 'the status strip is not the five statuses of a page with no log').toEqual([
			`${cardText(T.STATUS.ALL, 0, 0)}|true`,
			`${cardText(T.STATUS_CARDS.PENDING, 0, 0)}|false`,
			`${cardText(T.STATUS.APPROVED, 0, 0)}|false`,
			`${cardText(T.STATUS.DENIED, 0, 0)}|false`,
			`${cardText(T.STATUS.DRAFT, 0, 0)}|false`
		]);

		// The shell's zone notice names both zones it compares: measured `output` text
		// "Your profile uses UTC (UTC +00:00). This browser is in Europe/Madrid (UTC +01:00). …" — the offsets inside the
		// brackets are formatted by the app, so the head comes from the copy key up to its first hole and the two zones
		// come from the read and from the browser. `timeZoneNotice.TITLE`, `use-profile-zone-notice`.
		const notices = await textsOf(page.locator('output'));
		report('output notices', notices);
		const zoneNotice = page
			.locator('output')
			.filter({ hasText: EN.timeZoneNotice.TITLE.split('{')[0] })
			.filter({ hasText: profileZone })
			.filter({ hasText: browserZone });
		await expect(zoneNotice).toHaveCount(1);
		await expect(zoneNotice.first()).toContainText(EN.timeZoneNotice.DESCRIPTION.split('{')[0]);
		const emptyTexts = await textsOf(bodyRegion(page).locator('h2, p, span'));
		report('empty texts', emptyTexts);
		await expect(bodyRegion(page)).toContainText(copy(T.EMPTY_TITLE, { period: periodText }));
		await expect(bodyRegion(page)).toContainText(T.EMPTY_MESSAGE);

		report('add time buttons', await addTimeButtons(page).count());
		await expect(exportButton(page)).toBeDisabled();
		await expect(viewTabs(page).getByRole('tab', { name: T.VIEWS.SHEET, exact: true })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(
			await page.evaluate(() => window.localStorage.getItem('timesheets-view')),
			'a first visit wrote a view into localStorage'
		).toBe(null);

		report('console', shield.consoleErrors());
		expect(consoleFindings(shield), 'the no-log page logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the no-log page threw a page error').toEqual([]);
	});

	// ------------------------------------------------- 2. served logs, in the list view

	test('2 · six served logs in List: each row as printed, the day groups, the status cards, the meta line', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));

		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		const week = weekOfZone('UTC');
		const profileZone = api.reads(LOGS_PATH).at(-1)?.params['timeZone'] ?? 'UTC';
		const periodText = periodTextOf(week.from, week.to, profileZone);
		const logs = servedLogs(fixture);
		const totalSeconds = logs.reduce((sum, log) => sum + Number(log.duration), 0);
		report('meta', await textOf(metaLine(page)));
		await expect(metaLine(page)).toHaveText(
			`${periodText} · ${durationOf(totalSeconds)} · ${copy(T.MEMBER_COUNT, { count: 2 })}`
		);

		report(
			'reads',
			api.reads(LOGS_PATH).map((call) => ({ search: call.search, frame: call.frameUrl }))
		);
		const read = api.reads(LOGS_PATH).at(-1);
		if (!read) throw new Error('the list view made no read');
		expect(read.params['timeZone'], 'the read did not send the profile zone').toBe('UTC');
		expect(read.params['startDate']).toBe(week.from);
		expect(read.params['endDate']).toBe(week.to);

		const columnHeaders = await textsOf(table(page).locator('[role=columnheader]'));
		report('columnheaders', columnHeaders);
		expect(columnHeaders).toEqual([
			T.COLUMNS.STATUS,
			T.COLUMNS.TASK,
			T.COLUMNS.PROJECT,
			T.COLUMNS.MEMBER,
			T.COLUMNS.TIME,
			T.COLUMNS.DURATION
		]);

		const rowTotal = await logRowTotal(page);
		const logRowTotalCount = await logRows(page).count();
		report('row counts', { all: rowTotal, logs: logRowTotalCount });
		expect(rowTotal, 'a role=row count counts the day headers too (finding 5)').toBe(logRowTotalCount + 4);

		const dayRows = table(page)
			.locator('[role=row]')
			.filter({ has: page.locator('[role=rowheader]') });
		const dayTexts = await dayRows.evaluateAll((nodes: Element[]) =>
			nodes.map((node) =>
				Array.from(node.querySelectorAll('[role=cell], [role=rowheader]')).map((cell) =>
					(cell.textContent ?? '').replace(/\s+/g, ' ').trim()
				)
			)
		);
		report('day rows', dayTexts);
		const dayKeyOf = (log: ServedLog) => zoneDayKeyOf(String(log.startedAt), 'UTC');
		const logsOfDay = (key: string) => logs.filter((log) => dayKeyOf(log) === key);
		const orderedDays = [localDay(-1), localDay(-2), localDay(-3)].map((day) => csvDayOf(day));
		expect(dayTexts, 'the day groups are not newest first with their log count and total').toEqual(
			orderedDays.map((key) => [
				'',
				dayLabelOf(`${key}T12:00:00`, 'UTC'),
				`${copy(T.LOG_COUNT, { count: logsOfDay(key).length })}·${durationOf(
					logsOfDay(key).reduce((sum, log) => sum + Number(log.duration), 0)
				)}`
			])
		);

		for (const log of logs) {
			const taskTitle = taskTitleOf(log, T.NO_TASK);
			const row = rowOf(page, taskTitle);
			const cells = await cellsOf(row);
			report(`row ${String(log.id)}`, cells);
			const startedAt = new Date(String(log.startedAt));
			const stoppedAt = new Date(String(log.stoppedAt));
			const statusLabel = statusLabelOf(log);
			await expect(row.getByRole('cell').nth(1)).toHaveText(statusLabel);
			await expect(row.getByRole('cell').nth(2)).toContainText(taskTitle);
			await expect(row.getByRole('cell').nth(2)).toContainText(timeRangeOf(startedAt, stoppedAt));
			await expect(row.getByRole('cell').nth(3)).toContainText(projectNameOf(log, T.NO_PROJECT));
			await expect(row.getByRole('cell').nth(4)).toContainText(fullNameOf(log));
			await expect(row.getByRole('cell').nth(5)).toHaveText(timeRangeOf(startedAt, stoppedAt));
			await expect(row.getByRole('cell').nth(6)).toHaveText(durationOf(Number(log.duration)));
			if (String(log.id) === 'teammate-denied') {
				await expect(row.getByRole('cell').nth(2)).toContainText(
					copy(T.REJECTION_REASON, { reason: 'Wrong day' })
				);
			}
			if (log.logType === 'MANUAL') {
				await expect(row.getByRole('cell').nth(2)).toContainText(T.CHANGE.ADDED);
			}
		}

		const cards = await statusCardTexts(page);
		report('status cards', cards);
		expect(cards, 'the status cards are not the served logs counted by status').toEqual([
			`${cardText(T.STATUS.ALL, 6, totalSeconds)}|true`,
			`${cardText(T.STATUS_CARDS.PENDING, 2, 7200 + 5400)}|false`,
			`${cardText(T.STATUS.APPROVED, 1, 3600)}|false`,
			`${cardText(T.STATUS.DENIED, 1, 5400)}|false`,
			`${cardText(T.STATUS.DRAFT, 1, 2700)}|false`,
			`${cardText(T.STATUS.IN_REVIEW, 1, 1800)}|false`
		]);

		const buttons = await rowOf(page, 'Suite teammate pending task').evaluate((node: Element) =>
			Array.from(node.querySelectorAll('button')).map((button) =>
				(button.getAttribute('aria-label') ?? '').trim()
			)
		);
		report('managed pending row buttons', buttons);
		expect(buttons).toContain(T.APPROVE);
		expect(buttons).toContain(T.REJECT);
		const ownButtons = await rowOf(page, fixture.names.task).evaluate((node: Element) =>
			Array.from(node.querySelectorAll('button')).map((button) =>
				(button.getAttribute('aria-label') ?? '').trim()
			)
		);
		report('own pending row buttons', ownButtons);
		expect(ownButtons, 'the reader was offered to approve their own log (finding 2)').not.toContain(T.APPROVE);
		expect(ownButtons).not.toContain(T.REJECT);

		const checkboxes = await table(page)
			.locator('[role=checkbox]')
			.evaluateAll((nodes: Element[]) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
		report('checkboxes', checkboxes);
		expect(checkboxes).toContain(copy(T.SELECT_DAY, { day: dayLabelOf(`${orderedDays[0]}T12:00:00`, 'UTC') }));
	});

	// ------------------------------------------------- 3. the same logs in the other four views

	test('3 · the same six logs in Sheet, Week, Month and Screenshots, and how the chosen view is kept', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await expect(statusStrip(page)).toBeVisible({ timeout: 30_000 });

		const sheetView = (view: string) => viewTabs(page).getByRole('tab', { name: view, exact: true });
		const treeOf = (page: Page) =>
			page.evaluate(() => ({
				sections: Array.from(document.querySelectorAll('section[aria-label]')).map((n) =>
					n.getAttribute('aria-label')
				),
				groups: Array.from(document.querySelectorAll('[role=group][aria-label]')).map((n) =>
					n.getAttribute('aria-label')
				),
				tables: Array.from(document.querySelectorAll('[role=table][aria-label]')).map((n) =>
					n.getAttribute('aria-label')
				),
				columnheaders: Array.from(document.querySelectorAll('[role=columnheader]')).map((n) =>
					(n.textContent ?? '').replace(/\s+/g, ' ').trim()
				),
				rowheaders: Array.from(document.querySelectorAll('[role=rowheader]')).map((n) =>
					(n.textContent ?? '').replace(/\s+/g, ' ').trim()
				),
				checkboxes: Array.from(document.querySelectorAll('[role=checkbox]')).map(
					(n) => n.getAttribute('aria-label') ?? ''
				)
			}));

		// Sheet is the view the page opens on (`viewOf`, `use-timesheets-page.ts:105-111`).
		await expect(sheetView(T.VIEWS.SHEET)).toHaveAttribute('aria-selected', 'true');
		const sheetTree = await treeOf(page);
		report('sheet tree', sheetTree);
		const memberName = fixture.names.user;
		expect(sheetTree.tables, 'the sheet does not name its table after the member').toEqual([
			copy(T.SHEET.TABLE_LABEL, { name: memberName })
		]);
		// The member rail is a `navigation` landmark, not a group (`-0.log` snapshot: `navigation "Members with time in
		// this period"`), which is why the tree's `groups` list holds only `Period` and `Logs by status`.
		await expect(page.getByRole('navigation', { name: T.SHEET.MEMBERS_LABEL, exact: true })).toBeVisible();
		// The rail's own button is named plate + name + the member's total + the sheet status (`-0b.log` snapshot:
		// `button "FM Fixture Manager 3h 45m Pending" [pressed]`, and the same two buttons in Screenshots on `-1.log`).
		// `SHEET.PICK_MEMBER` is not one of them — what it is takes the `pick member control` measurement in the
		// Screenshots part of this test.
		const ownSeconds = servedLogs(fixture)
			.filter((log) => String(log.employeeId) === fixture.ids.employee)
			.reduce((sum, log) => sum + Number(log.duration), 0);
		const railButton = page.getByRole('button', {
			name: `${initialsOf(memberName)} ${memberName} ${durationOf(ownSeconds)} ${T.STATUS.PENDING}`,
			exact: true
		});
		report('member rail button', await textOf(railButton.first()));
		await expect(railButton).toHaveCount(1);
		await expect(railButton).toHaveAttribute('aria-pressed', 'true');
		expect(sheetTree.checkboxes).toContain(copy(T.SHEET.SELECT_ROW, { task: fixture.names.task }));
		expect(sheetTree.rowheaders).toContain(`${fixture.names.task}${initialsOf(PROJECT_NAME)}${PROJECT_NAME}`);
		expect(sheetTree.rowheaders).toContain(T.SHEET.PERIOD_TOTAL);
		await expect(sheetView(T.VIEWS.LIST)).toHaveAttribute('aria-selected', 'false');

		/* The four views are walked in the order the page can be walked in. Opening Month moves the period to its whole
		   month (`periodForView`, finding 6) and the moved period **stays** when Week is opened again — `-0d.log` measured
		   41 day groups (`Monday, Oct 26` onward) that way — so each view's own shape is read the moment it is opened,
		   Week before Month is ever touched. */
		for (const view of [T.VIEWS.LIST, T.VIEWS.WEEK, T.VIEWS.MONTH, T.VIEWS.SCREENSHOTS]) {
			await sheetView(view).click();
			await expect(sheetView(view)).toHaveAttribute('aria-selected', 'true');
			const stored = await page.evaluate(() => window.localStorage.getItem('timesheets-view'));
			const tree = await treeOf(page);
			report(`view ${view}`, {
				storage: stored,
				url: page.url(),
				tree,
				meta: await textOf(metaLine(page))
			});
			// `useLocalStorageState` writes `JSON.stringify(value)` (`use-local-storage-state.ts:45`), so the key holds the
			// view name inside JSON quotes — `-probe-5.log` E7 read `"list"`, `"week"`, `"month"`, `"screenshots"` and
			// `-0c.log` read `"list"` the same way.
			expect(stored, `the ${view} view was not stored under timesheets-view`).toBe(
				JSON.stringify(view.toLowerCase())
			);
			await expect(page).toHaveURL(MEMBER_PAGE(fixture.ids.employee));

			if (view === T.VIEWS.WEEK) {
				/* Week: one group per day of the period, in the period's own order — oldest day first (`-0f.log` received
				   `Monday, Nov 23`, `Tuesday, Nov 24`, `Yesterday, Nov 25`, `Today, Nov 26`, `Friday, Nov 27`,
				   `Saturday, Nov 28`, `Sunday, Nov 29`, i.e. every day of the shown week including the empty ones), with the
				   newest log first inside each group. The seven days are built from the period the page reads, never counted
				   back from today. */
				const weekStart = weekOfZone('UTC').fromDate;
				const weekDays = Array.from({ length: 7 }, (_, index) =>
					dayLabelOf(new Date(weekStart.getTime() + index * 86_400_000), 'UTC')
				);
				expect(tree.groups, 'the week view does not group the period by day').toEqual([
					PERIOD.LABEL,
					T.STATUS_STRIP_LABEL,
					...weekDays.filter((label, index, all) => all.indexOf(label) === index)
				]);
				const weekLogButtons = await page.evaluate(() =>
					Array.from(document.querySelectorAll('[role=group] button'))
						.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
						.filter((text) => text.includes(' – '))
				);
				report('week log buttons', weekLogButtons);
				expect(
					weekLogButtons.some((text) => text.includes(fixture.names.task) && text.includes(durationOf(7200)))
				).toBe(true);
			}

			if (view === T.VIEWS.MONTH) {
				// Month: its section is named after the month the period moved to.
				const monthLabel = formatWith({ month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date());
				expect(tree.sections, 'the month view has no section named after the month').toContain(monthLabel);
				await expect(
					page.getByRole('button', { name: copy(T.OPEN_DAY, { day: dayLabelOf(localDay(-1), 'UTC') }) })
				).toBeVisible();
			}
		}

		// The moved period stays where the Month view left it: opening Week again groups that month, printed rather than
		// pinned because the group count is the month's own length (`-0d.log`: 41 groups, `Monday, Oct 26` first).
		await sheetView(T.VIEWS.WEEK).click();
		const weekAfterMonth = await treeOf(page);
		report('week view after month', {
			groupCount: weekAfterMonth.groups.length,
			firstDayGroups: weekAfterMonth.groups.slice(2, 5),
			meta: await textOf(metaLine(page))
		});

		/* Screenshots: no status strip, its own week strip, and the member rail — the same
		   `navigation "Members with time in this period"` the Sheet view renders, one button per member named initials +
		   name + that member's total + the sheet status (`-1.log` snapshot: `button "FM Fixture Manager 3h 45m Pending"
		   [pressed]`, `button "FT Fixture Teammate 3h 30m Pending"`; the totals are the served entries of each member).
		   `SHEET.PICK_MEMBER` is **not** one of those buttons: it names a control the probes only ever met in an
		   `[aria-label]` sweep (`-probe-5.log` E7 `Screenshots namedButtons`), never in the accessibility tree at the
		   lane's 1280x720 viewport; the two counts below say which it is here. */
		await sheetView(T.VIEWS.SCREENSHOTS).click();
		const shotTree = await treeOf(page);
		report('screenshots tree', { ...shotTree, meta: await textOf(metaLine(page)) });
		expect(shotTree.groups, 'Screenshots kept the status strip').toEqual([PERIOD.LABEL]);
		await expect(page.getByRole('navigation', { name: T.SHEET.MEMBERS_LABEL, exact: true })).toBeVisible();
		const secondsOf = (memberId: string) =>
			servedLogs(fixture)
				.filter((log) => String(log.employeeId) === memberId)
				.reduce((sum, log) => sum + Number(log.duration), 0);
		for (const [memberId, name] of [
			[fixture.ids.employee, memberName],
			[fixture.ids.teammateEmployee, fixture.names.teammate]
		]) {
			const railButton = page.getByRole('button', {
				name: `${initialsOf(name)} ${name} ${durationOf(secondsOf(memberId))} ${T.STATUS.PENDING}`,
				exact: true
			});
			report(`screenshots rail ${name}`, await textOf(railButton.first()));
			await expect(railButton).toHaveCount(1);
		}
		report('pick member control', {
			withThatAriaLabel: await page
				.locator(`[aria-label="${copy(T.SHEET.PICK_MEMBER, { name: memberName })}"]`)
				.count(),
			visibleButtonsNamedThat: await page
				.getByRole('button', { name: copy(T.SHEET.PICK_MEMBER, { name: memberName }), exact: true })
				.count()
		});
		await expect(
			page.getByRole('button', {
				name: copy(T.diary.DAY_TRACKED, { day: longDayLabelOf(localDay(-1), 'UTC') }),
				exact: true
			})
		).toBeVisible();
		await expect(
			page.getByRole('button', {
				name: copy(T.diary.DAY_NO_TIME, { day: longDayLabelOf(localDay(0), 'UTC') }),
				exact: true
			})
		).toBeVisible();
		await expect(page.getByRole('button', { name: T.diary.PREVIOUS_WEEK, exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: T.diary.NEXT_WEEK, exact: true })).toBeVisible();
	});

	// ------------------------------------------------- 4. the period picker

	test('4 · previous and next period, the presets, and a custom range picked from the calendar on the 10th and the 14th', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		const periodGroup = page.getByRole('group', { name: PERIOD.LABEL, exact: true });
		const readsBefore = api.reads(LOGS_PATH).length;

		await periodGroup.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }).click();
		await expect.poll(() => api.reads(LOGS_PATH).length, { timeout: 20_000 }).toBeGreaterThan(readsBefore);
		const previous = weekOfZone('UTC', -1);
		const previousRead = api.reads(LOGS_PATH).at(-1);
		report('previous period read', previousRead?.params);
		expect(previousRead?.params['startDate']).toBe(previous.from);
		expect(previousRead?.params['endDate']).toBe(previous.to);
		const previousPeriodText = periodTextOf(previous.from, previous.to, 'UTC');
		await expect(metaLine(page)).toContainText(previousPeriodText);
		await expect(bodyRegion(page)).toContainText(copy(T.EMPTY_TITLE, { period: previousPeriodText }));

		await periodGroup.getByRole('button', { name: PERIOD.NEXT, exact: true }).click();
		await periodGroup.getByRole('button', { name: PERIOD.NEXT, exact: true }).click();
		const next = weekOfZone('UTC', 1);
		await expect.poll(() => api.reads(LOGS_PATH).at(-1)?.params['startDate'], { timeout: 20_000 }).toBe(next.from);
		report('next period read', api.reads(LOGS_PATH).at(-1)?.params);
		// A period no preset names is shown as its own text: the trigger's accessible name was the period
		// (`-0.log` / `-0c.log` `period group buttons`: `["Previous period|", "|Nov 30 – Dec 6", "Next period|"]` — the
		// middle button carries no aria-label, so its name is its text).
		const nextText = periodTextOf(next.from, next.to, 'UTC');
		await expect(periodGroup.getByRole('button', { name: nextText, exact: true }), 'next week trigger').toHaveCount(
			1
		);

		// The picker's own trigger is the middle button of the Period group, and its accessible name is the period it is
		// showing (`-0.log` snapshot: `group "Period"` → `button "Previous period"`, `button "Nov 30 – Dec 6"`,
		// `button "Next period"`). It is therefore named from the read the page just made, never from today's date.
		report(
			'period group buttons',
			await periodGroup
				.locator('button')
				.evaluateAll((nodes: Element[]) =>
					nodes.map(
						(node) =>
							`${node.getAttribute('aria-label') ?? ''}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
					)
				)
		);
		// The trigger is named by the period the group is showing, so the name is built from the period this case is on.
		const openPeriodPicker = async (name: string) => {
			report('period trigger name', name);
			await periodGroup.getByRole('button', { name, exact: true }).click();
		};

		// One step back from the next week. Returning to a period the page already read sends no new request — the log
		// query's cache answers it — so what is pinned here is the period the page *shows* (its meta line and the
		// trigger's own name) while the read count is printed, not asserted (`-0b.log` `back to this week`). The trigger
		// names a period a preset covers by that preset: back on this week its name was `common.THIS_WEEK`
		// (`-0c.log` snapshot `button "This week"`) where the next week showed the period text.
		const readsBeforeBack = api.reads(LOGS_PATH).length;
		await periodGroup.getByRole('button', { name: PERIOD.PREVIOUS, exact: true }).click();
		const shownWeek = weekOfZone('UTC');
		const backText = periodTextOf(shownWeek.from, shownWeek.to, 'UTC');
		await expect(metaLine(page)).toContainText(backText);
		await expect(
			periodGroup.getByRole('button', { name: C.THIS_WEEK, exact: true }),
			'this week trigger'
		).toHaveCount(1);
		report('back to this week', {
			reads: api.reads(LOGS_PATH).length,
			before: readsBeforeBack,
			lastReadStartDate: api.reads(LOGS_PATH).at(-1)?.params['startDate'] ?? ''
		});
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		await openPeriodPicker(C.THIS_WEEK);
		report('period panel items', await textsOf(page.locator('[role=menuitem]:visible, [role=option]:visible')));

		// A custom range: the 10th and the 14th of the month the period's own read names, never days counted back from
		// today. The grid is pinned to what that month contains, not to a day count that would move with the date: every
		// day of `month` appears, and the grid is whole weeks (`-probe-2.log` Q13 printed 42 cells for 42 = 6 weeks, and
		// one cell per day number, so the padding cells carry no number).
		const month = shownWeek.fromKey.slice(0, 7);
		const picker = page.locator('[data-slot=popover-content]');
		await expect(picker).toBeVisible({ timeout: 20_000 });
		report('calendar month pickers', await textsOf(picker.locator('[role=combobox]')));
		expect(
			await picker
				.locator('[role=combobox]')
				.evaluateAll((nodes: Element[]) =>
					nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
				),
			'the calendar did not open on the month the shown period starts in'
		).toEqual([
			formatWith({ month: 'long', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`)),
			month.slice(0, 4)
		]);
		const cells = picker.locator('[role=gridcell]:visible');
		await expect.poll(() => cells.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(28);
		const cellTexts = await textsOf(cells);
		const shown = cellTexts.filter((text) => /^\d{1,2}$/.test(text)).map(Number);
		const missing = Array.from({ length: daysInMonthOf(month) }, (_, index) => index + 1).filter(
			(day) => !shown.includes(day)
		);
		report('calendar month', {
			month,
			cells: cellTexts.length,
			weeks: cellTexts.length / 7,
			daysInMonth: daysInMonthOf(month),
			shown,
			missing
		});
		expect(missing, `the calendar grid does not show every day of ${month}`).toEqual([]);
		expect(cellTexts.length % 7, 'the calendar grid is not whole weeks').toBe(0);
		for (const day of [10, 14]) {
			await expect(cells.filter({ hasText: new RegExp(`^${day}$`) }), `day ${day} of the grid`).toHaveCount(1);
		}
		const readsBeforeRange = api.reads(LOGS_PATH).length;
		await cells.filter({ hasText: /^10$/ }).first().click();
		await page.waitForTimeout(1_000); // a quiet window: it proves the half-open range sent no new read
		report('after picking the 10th', { reads: api.reads(LOGS_PATH).length, before: readsBeforeRange });
		expect(api.reads(LOGS_PATH).length, 'a start day alone re-read the period').toBe(readsBeforeRange);
		await cells.filter({ hasText: /^14$/ }).first().click();
		await expect
			.poll(() => api.reads(LOGS_PATH).at(-1)?.params['startDate'], { timeout: 20_000 })
			.toBe(`${month}-10T00:00:00.000Z`);
		const rangeRead = api.reads(LOGS_PATH).at(-1);
		report('custom range read', rangeRead?.params);
		expect(rangeRead?.params['endDate']).toBe(`${month}-14T23:59:59.999Z`);
		const rangeText = periodTextOf(`${month}-10T00:00:00.000Z`, `${month}-14T23:59:59.999Z`, 'UTC');
		await expect(metaLine(page)).toContainText(rangeText);
		await expect(logRows(page)).toHaveCount(0, { timeout: 20_000 });
		await expect(bodyRegion(page)).toContainText(copy(T.EMPTY_TITLE, { period: rangeText }));
	});

	// ------------------------------------------------- 5. search, the status cards, the filter chips

	test('5 · search, status cards and the Members filter: which narrowing costs a read, the no-match state, Clear', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });
		const readsAtOpen = api.reads(LOGS_PATH).length;

		await searchBox(page).fill('teammate');
		await expect(logRows(page)).toHaveCount(3, { timeout: 15_000 });
		report('search', { rows: 3, reads: api.reads(LOGS_PATH).length, atOpen: readsAtOpen });
		expect(api.reads(LOGS_PATH).length, 'the search re-read the period').toBe(readsAtOpen);
		await expect(page.getByRole('button', { name: T.CLEAR_SEARCH, exact: true })).toBeVisible();

		await searchBox(page).fill('nothing matches here');
		await expect(logRows(page)).toHaveCount(0, { timeout: 15_000 });
		const noMatchText = await textOf(bodyRegion(page));
		report('no match text', noMatchText);
		const periodText = periodTextOf(weekOfZone('UTC').from, weekOfZone('UTC').to, 'UTC');
		await expect(bodyRegion(page)).toContainText(T.NO_MATCH_TITLE);
		await expect(bodyRegion(page)).toContainText(copy(T.NO_MATCH_MESSAGE, { period: periodText }));
		await bodyRegion(page).getByRole('button', { name: C.CLEAR_FILTERS, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 15_000 });
		expect(api.reads(LOGS_PATH).length, 'Clear filters re-read the period').toBe(readsAtOpen);

		await statusStrip(page)
			.getByRole('button', { name: new RegExp(`^${T.STATUS_CARDS.PENDING}`) })
			.click();
		await expect(logRows(page)).toHaveCount(2, { timeout: 15_000 });
		const cardsAfter = await statusCardTexts(page);
		report('status card click', { rows: 2, reads: api.reads(LOGS_PATH).length, cards: cardsAfter });
		expect(api.reads(LOGS_PATH).length, 'a status card re-read the period').toBe(readsAtOpen);
		expect(cardsAfter[1].endsWith('|true'), 'the picked status card is not marked pressed').toBe(true);
		await statusStrip(page)
			.getByRole('button', { name: new RegExp(`^${T.STATUS.ALL}`) })
			.click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 15_000 });

		await filterButton(page).click();
		await expect
			.poll(() => page.locator('[role=menuitem]:visible').count(), { timeout: 15_000 })
			.toBeGreaterThanOrEqual(3);
		const categories = await textsOf(page.locator('[role=menuitem]:visible'));
		report('filter categories', categories);
		expect(categories).toEqual([
			C.MEMBERS,
			T.PROJECTS,
			C.TASKS,
			EN.clients.TITLE,
			T.BILLABLE,
			EN.timer.labels.TASK_LABELS,
			C.LABELS
		]);
		await page.getByRole('menuitem', { name: C.MEMBERS, exact: true }).click();
		await expect
			.poll(() => page.locator('[role=menuitemcheckbox]:visible').count(), { timeout: 15_000 })
			.toBeGreaterThan(0);
		const memberOptions = await page
			.locator('[role=menuitemcheckbox]:visible')
			.evaluateAll((nodes: Element[]) =>
				nodes.map(
					(node) =>
						`${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}|${node.getAttribute('aria-checked') ?? ''}`
				)
			);
		report('member options', memberOptions);
		expect(memberOptions.map((line) => line.split('|')[0])).toEqual([
			`${initialsOf(fixture.names.user)}${fixture.names.user}`,
			`${initialsOf(fixture.names.denied)}${fixture.names.denied}`,
			`${initialsOf(fixture.names.teammate)}${fixture.names.teammate}`
		]);
		await page.getByRole('menuitemcheckbox', { name: fixture.names.teammate }).click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect.poll(() => page.locator('[role=menu]:visible').count(), { timeout: 15_000 }).toBe(0);
		const memberRead = api.reads(LOGS_PATH).at(-1);
		report('member filter read', memberRead?.params);
		expect(memberRead?.params['employeeIds[0]'], 'the member filter did not send employeeIds').toBe(
			fixture.ids.teammateEmployee
		);
		expect(api.reads(LOGS_PATH).length, 'the member filter did not re-read').toBeGreaterThan(readsAtOpen);
		await expect(logRows(page)).toHaveCount(3, { timeout: 20_000 });
		const chips = await page
			.locator('button[aria-label^="Remove "]')
			.evaluateAll((nodes: Element[]) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
		report('applied chips', chips);
		expect(chips).toEqual([copy(T.REMOVE_FILTER, { value: fixture.names.teammate })]);
		const triggerText = await textOf(filterButton(page).first());
		report('filter trigger', triggerText);
		await page.getByRole('button', { name: C.CLEAR_FILTERS, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });
	});

	// ------------------------------------------------- 6. approve, then reject

	test('6 · approve one managed log, then reject a selection: the selection bar, each status body, the rows after', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		// The quick Approve of the teammate's pending row (`timesheet-log-row.tsx:193`, `:255-257`).
		const managedRow = rowOf(page, 'Suite teammate pending task');
		await managedRow.getByRole('button', { name: T.APPROVE, exact: true }).click();
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const approveCall = api.writes()[0];
		report('approve body', approveCall);
		expect(approveCall?.method).toBe('PUT');
		expect(approveCall?.path).toBe(STATUS_PATH);
		expect(approveCall?.body, 'the approve body is not the timesheet id and the status').toEqual({
			ids: ['sheet-teammate-pending'],
			status: 'APPROVED',
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA
		});
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });
		const approvedCards = await statusCardTexts(page);
		report('cards after approve', approvedCards);
		expect(approvedCards, 'the cards did not move the approved log').toEqual([
			`${cardText(T.STATUS.ALL, 6, 26100)}|true`,
			`${cardText(T.STATUS_CARDS.PENDING, 1, 7200)}|false`,
			`${cardText(T.STATUS.APPROVED, 2, 3600 + 5400)}|false`,
			`${cardText(T.STATUS.DENIED, 1, 5400)}|false`,
			`${cardText(T.STATUS.DRAFT, 1, 2700)}|false`,
			`${cardText(T.STATUS.IN_REVIEW, 1, 1800)}|false`
		]);

		// Reject two logs from the selection bar (`timesheets-states.tsx` TimesheetsSelectionBar).
		await rowCheckbox(page, 'Suite teammate pending task').click();
		await rowCheckbox(page, 'Suite teammate task').click();
		await expect(selectionBar(page)).toBeVisible({ timeout: 15_000 });
		await expect(selectionBar(page)).toHaveAccessibleName(copy(T.SELECTED, { count: 2 }));
		const barButtons = await selectionBar(page)
			.locator('button')
			.evaluateAll((nodes: Element[]) =>
				nodes.map((node) => node.getAttribute('aria-label') ?? (node.textContent ?? '').trim())
			);
		report('selection bar buttons', barButtons);
		expect(barButtons).toEqual(expect.arrayContaining([T.APPROVE, T.REJECT, C.EDIT, C.DELETE, T.CLEAR_SELECTION]));

		await selectionBar(page).getByRole('button', { name: T.REJECT, exact: true }).click();
		const rejectDialog = await openDialog(page, TIMESHEET_PAGE.TIMESHEET_ACTION_REJECT_SELECTED);
		const rejectText = await textOf(rejectDialog);
		report('reject dialog', rejectText);
		await expect(rejectDialog).toContainText(TIMESHEET_PAGE.YOU_ARE_ABOUT_TO_REJECT_ENTRY);
		const reason = rejectDialog.getByLabel(TIMESHEET_PAGE.REJECTION_REASON);
		await expect(reason).toHaveCount(1);
		await expect(reason.first()).toHaveAttribute('placeholder', T.reject.REASON_PLACEHOLDER);
		await reason.first().fill('Suite reason');
		await clickDialogButton(
			page,
			rejectDialog.getByRole('button', { name: T.REJECT, exact: true }),
			'reject submit'
		);
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBeGreaterThan(1);
		const rejectCall = api.writes().at(-1);
		report('reject body', rejectCall?.body);
		const rejected = rejectCall?.body ?? {};
		expect(Object.keys(rejected).sort()).toEqual(['ids', 'organizationId', 'reason', 'status', 'tenantId']);
		// `-probe-7.log` G5 printed `ids:["sheet-teammate-denied","sheet-teammate-pending"]` while the rows were clicked
		// pending-then-denied, so the order is not the selection order: the set is what is pinned.
		expect([...(rejected['ids'] as string[])].sort()).toEqual(['sheet-teammate-denied', 'sheet-teammate-pending']);
		expect(rejected['status']).toBe('DENIED');
		expect(rejected['reason']).toBe('Suite reason');
		expect(rejected['organizationId']).toBe(fixture.ids.organizationA);
		expect(rejected['tenantId']).toBe(fixture.ids.tenantA);
		await expect
			.poll(() => dialogCount(page, TIMESHEET_PAGE.TIMESHEET_ACTION_REJECT_SELECTED), { timeout: 20_000 })
			.toBe(0);
		const rowsAfter = await logRows(page).evaluateAll((rows: Element[]) =>
			rows.map((row) =>
				Array.from(row.querySelectorAll('[role=cell]')).map((cell) =>
					(cell.textContent ?? '').replace(/\s+/g, ' ').trim()
				)
			)
		);
		report('rows after reject', rowsAfter);
		for (const taskTitle of ['Suite teammate pending task', 'Suite teammate task']) {
			await expect(rowOf(page, taskTitle).getByRole('cell').nth(1)).toHaveText(T.STATUS.DENIED);
			await expect(rowOf(page, taskTitle).getByRole('cell').nth(2)).toContainText(
				copy(T.REJECTION_REASON, { reason: 'Suite reason' })
			);
		}
		await expect(selectionBar(page)).toHaveCount(0);
	});

	// ------------------------------------------------- 7. delete

	test('7 · delete one log and a selection: the confirm step, the DELETE query, the rows after', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		await openRowMenu(page, 'Suite draft task', C.DELETE);
		const confirm = await openDialog(page, C.DELETE_CONFIRMATION);
		const confirmText = await textOf(confirm);
		report('delete confirm', confirmText);
		await expect(confirm).toContainText(C.IRREVERSIBLE_ACTION_WARNING);
		const beforeCancel = api.writes().length;
		await confirm.getByRole('button', { name: C.CANCEL, exact: true }).click();
		await expect.poll(() => dialogCount(page, C.DELETE_CONFIRMATION), { timeout: 20_000 }).toBe(0);
		expect(api.writes().length, 'the cancel sent a write').toBe(beforeCancel);
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		await openRowMenu(page, 'Suite draft task', C.DELETE);
		const second = await openDialog(page, C.DELETE_CONFIRMATION);
		await second.getByRole('button', { name: C.DELETE, exact: true }).click();
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const deleteCall = api.writes().at(-1);
		report('delete query', { path: deleteCall?.path, search: deleteCall?.search });
		expect(deleteCall?.method).toBe('DELETE');
		expect(deleteCall?.path).toBe(LOGS_PATH);
		expect(queryValuesOf(deleteCall?.search ?? '', 'logIds')).toEqual(['own-draft']);
		expect(new URL(`http://x${deleteCall?.search}`).searchParams.get('organizationId')).toBe(
			fixture.ids.organizationA
		);
		expect(new URL(`http://x${deleteCall?.search}`).searchParams.get('tenantId')).toBe(fixture.ids.tenantA);
		await expect(logRows(page)).toHaveCount(5, { timeout: 20_000 });
		const cardsAfter = await statusCardTexts(page);
		report('cards after delete', cardsAfter);
		expect(cardsAfter).toEqual([
			`${cardText(T.STATUS.ALL, 5, 23400)}|true`,
			`${cardText(T.STATUS_CARDS.PENDING, 2, 12600)}|false`,
			`${cardText(T.STATUS.APPROVED, 1, 3600)}|false`,
			`${cardText(T.STATUS.DENIED, 1, 5400)}|false`,
			`${cardText(T.STATUS.DRAFT, 0, 0)}|false`,
			`${cardText(T.STATUS.IN_REVIEW, 1, 1800)}|false`
		]);

		await rowCheckbox(page, fixture.names.task).click();
		await rowCheckbox(page, 'Suite teammate task').click();
		await selectionBar(page).getByRole('button', { name: C.DELETE, exact: true }).click();
		const bulk = await openDialog(page, C.DELETE_CONFIRMATION);
		report('bulk delete confirm', await textOf(bulk));
		await bulk.getByRole('button', { name: C.DELETE, exact: true }).click();
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBeGreaterThan(1);
		const bulkCall = api.writes().at(-1);
		report('bulk delete query', bulkCall?.search);
		expect(queryValuesOf(bulkCall?.search ?? '', 'logIds')).toEqual(['own-pending', 'teammate-denied']);
		await expect(logRows(page)).toHaveCount(3, { timeout: 20_000 });
		const week = weekOfZone('UTC');
		await expect(metaLine(page)).toHaveText(
			`${periodTextOf(week.from, week.to, 'UTC')} · ${durationOf(3600 + 1800 + 5400)} · ${copy(T.MEMBER_COUNT, { count: 2 })}`
		);
		await expect(selectionBar(page)).toHaveCount(0);
	});

	// ------------------------------------------------- 8. the billable toggle

	test('8 · the Billable submenu of one log: the fields the PUT sends, the row after, the menu after', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		await rowMenuButton(page, fixture.names.task).click();
		await openMenu(page).getByRole('menuitem', { name: T.BILLABLE, exact: true }).click();
		// The submenu is its own `menu` named after the item that opened it (`-0.log` snapshot:
		// `menuitem "Billable" [expanded]` → `menu "Billable"` → `menuitem "Yes Selected"` / `menuitem "No"`), so the
		// Yes / No row of the top-level menu is not the submenu — reading the top level printed the five top items.
		const billableMenu = page.getByRole('menu', { name: T.BILLABLE, exact: true });
		await expect(billableMenu.getByRole('menuitem')).toHaveCount(2, { timeout: 15_000 });
		const menuItems = await textsOf(billableMenu.getByRole('menuitem'));
		report('billable submenu', menuItems);
		expect(selectedMenuItem(menuItems), 'the submenu does not mark the value the log was served with').toBe(
			TIMESHEET_PAGE.BILLABLE.YES
		);
		await billableMenu.getByRole('menuitem', { name: TIMESHEET_PAGE.BILLABLE.NO, exact: true }).click();
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const write = api.writes()[0];
		report('billable body', write);
		expect(write?.method).toBe('PUT');
		expect(write?.path).toBe(`${LOGS_PATH}/own-pending`);
		const startedAt = at(-1, 9, 0);
		const stoppedAt = new Date(startedAt.getTime() + 7200_000);
		expect(write?.body).toEqual({
			startedAt: isoOf(startedAt),
			stoppedAt: isoOf(stoppedAt),
			employeeId: fixture.ids.employee,
			isBillable: false,
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA
		});
		expect(Object.keys(write?.body ?? {}).sort(), 'the billable write sent more than it needed').toEqual([
			'employeeId',
			'isBillable',
			'organizationId',
			'startedAt',
			'stoppedAt',
			'tenantId'
		]);
		const cells = await cellsOf(rowOf(page, fixture.names.task));
		report('row after billable', cells);
		await expect(rowOf(page, fixture.names.task).getByRole('cell').nth(6)).toHaveText(durationOf(7200));

		await rowMenuButton(page, fixture.names.task).click();
		await openMenu(page).getByRole('menuitem', { name: T.BILLABLE, exact: true }).click();
		await expect(page.getByRole('menu', { name: T.BILLABLE, exact: true }).getByRole('menuitem')).toHaveCount(2, {
			timeout: 15_000
		});
		const afterItems = await textsOf(
			page.getByRole('menu', { name: T.BILLABLE, exact: true }).getByRole('menuitem')
		);
		report('billable submenu after', afterItems);
		expect(selectedMenuItem(afterItems), 'the menu still marks Yes as the chosen value').toBe(
			TIMESHEET_PAGE.BILLABLE.NO
		);
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
	});

	// ------------------------------------------------- 9. editing one log in its dialog

	test("9 · edit a log: the dialog's fields, the conflict lookup, the PUT body, the row after, a refused save, a refused lookup", async ({
		page,
		fixture,
		shield
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		await openRowMenu(page, fixture.names.task, C.EDIT);
		const dialog = await openDialog(page, C.TIME_LOG);
		const labels = await dialog.evaluate((node: Element) =>
			Array.from(node.querySelectorAll('label, span, h2, h3'))
				.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())
				.filter((line) => line.length > 1)
		);
		report('edit dialog labels', labels);
		await expect(dialog).toContainText(copy(MANUAL.START_TIME));
		await expect(dialog).toContainText(copy(MANUAL.END_TIME));
		await expect(dialog).toContainText(MANUAL.DATE);
		await expect(dialog).toContainText(EN.dailyPlan.TASK_TIME);
		await expect(dialog).toContainText(EN.timer.labels.PICK_LABELS);
		await expect(dialog).toContainText(C.NOTES);
		const startedAt = at(-1, 9, 0);
		const stoppedAt = new Date(startedAt.getTime() + 7200_000);
		report(
			'edit dialog inputs',
			await dialog.evaluate((node: Element) =>
				Array.from(node.querySelectorAll('input, textarea')).map(
					(input) =>
						`aria=${input.getAttribute('aria-label') ?? ''}|val=${(input as HTMLInputElement).value ?? ''}|ph=${(input as HTMLInputElement).placeholder ?? ''}`
				)
			)
		);
		await expect(dialog.locator(`input[aria-label="${MANUAL.START_TIME}"]`)).toHaveValue(timeInputOf(startedAt));
		await expect(dialog.locator(`input[aria-label="${MANUAL.END_TIME}"]`)).toHaveValue(timeInputOf(stoppedAt));
		const notes = dialog.locator('textarea').first();
		await expect(notes).toHaveAttribute('placeholder', EN.modals.timeLog.notesPlaceholder);
		await notes.fill('Suite note');

		await clickDialogButton(page, dialog.getByRole('button', { name: C.SAVE, exact: true }), 'edit save');
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const conflict = api.reads(CONFLICT_PATH).at(-1);
		report('conflict lookup', conflict?.search);
		expect(conflict?.path).toBe(CONFLICT_PATH);
		const conflictParams = new URL(`http://x${conflict?.search}`).searchParams;
		expect(conflictParams.get('employeeId')).toBe(fixture.ids.employee);
		expect(queryValuesOf(conflict?.search ?? '', 'ignoreId')).toEqual(['own-pending']);
		expect(queryValuesOf(conflict?.search ?? '', 'relations')).toEqual(['task', 'project']);
		const write = api.writes()[0];
		report('edit PUT', write);
		expect(write?.path).toBe(`${LOGS_PATH}/own-pending`);
		expect(write?.body).toEqual({
			isBillable: true,
			employeeId: fixture.ids.employee,
			description: 'Suite note',
			projectId: fixture.ids.project,
			startedAt: isoOf(startedAt),
			stoppedAt: isoOf(stoppedAt),
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA
		});
		await expect.poll(() => dialogCount(page, C.TIME_LOG), { timeout: 20_000 }).toBe(0);
		const taskCell = await rowOf(page, fixture.names.task).getByRole('cell').nth(2).innerText();
		report('row after edit', taskCell);
		await expect(rowOf(page, fixture.names.task).getByRole('cell').nth(2)).toContainText(`${C.NOTES}: Suite note`);
		const toastTexts = await page.evaluate(() =>
			Array.from(document.querySelectorAll('li[data-sonner-toast], [data-slot=toast]')).map((node) =>
				(node.textContent ?? '').replace(/\s+/g, ' ').trim()
			)
		);
		report('edit toasts', toastTexts);
		expect(toastTexts.join('\n')).toContain(TOASTS.time.LOG_UPDATED);

		// A refused save: the write is sent, nothing is kept, the dialog stays open with the failure toast.
		state.refusals[`PUT ${LOGS_PATH}/own-approved`] = 400;
		await openRowMenu(page, 'Suite afternoon task', C.EDIT);
		const second = await openDialog(page, C.TIME_LOG);
		await second.locator('textarea').first().fill('Suite refused note');
		await clickDialogButton(page, second.getByRole('button', { name: C.SAVE, exact: true }), 'refused save');
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBeGreaterThan(1);
		report('refused save writes', api.writes().at(-1));
		await page.waitForTimeout(1_500); // a quiet window: it proves the dialog is still open after a refused save
		expect(await dialogCount(page, C.TIME_LOG), 'the dialog closed on a refused save').toBe(1);
		await expect
			.poll(
				() =>
					page.evaluate(() =>
						Array.from(document.querySelectorAll('li[data-sonner-toast]'))
							.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())
							.join('\n')
					),
				{ timeout: 20_000 }
			)
			.toContain(TOASTS.MUTATION_FAILED);
		const keptNotes = state.logs.map((log) => `${String(log.id)}|${String(log.notes)}`);
		report('notes kept', keptNotes);
		expect(keptNotes, 'the refused save changed the store this file answers from').toContain('own-approved|null');
		await second.getByRole('button', { name: C.CANCEL, exact: true }).click();
		await expect.poll(() => dialogCount(page, C.TIME_LOG), { timeout: 20_000 }).toBe(0);

		// A refused conflict lookup: nothing is saved, and the dialog says why.
		state.refusals['GET /api/timesheet/time-log/conflict'] = 500;
		await openRowMenu(page, 'Suite draft task', C.EDIT);
		const third = await openDialog(page, C.TIME_LOG);
		await third.locator('textarea').first().fill('Suite refused lookup');
		const writesBeforeLookup = api.writes().length;
		await clickDialogButton(page, third.getByRole('button', { name: C.SAVE, exact: true }), 'lookup refused save');
		await expect.poll(() => api.reads(CONFLICT_PATH).length, { timeout: 20_000 }).toBeGreaterThan(0);
		await page.waitForTimeout(1_500); // a quiet window: it proves the refused lookup sent no write after it
		report('writes after refused lookup', api.writes().length - writesBeforeLookup);
		expect(api.writes().length - writesBeforeLookup, 'a refused conflict lookup saved something').toBe(0);
		await expect(third).toContainText(OVERLAP.CHECK_FAILED);
		await third.getByRole('button', { name: C.CANCEL, exact: true }).click();
		await expect.poll(() => dialogCount(page, C.TIME_LOG), { timeout: 20_000 }).toBe(0);

		// An overlap holds the save behind a confirmation (`use-time-overlap-guard.ts`, `edit-task-modal.tsx:480`). The
		// overlapping entry must sit on the edited log's own day: `-probe-7.log` G3 served it on today, nothing
		// overlapped, and the save went straight through.
		state.refusals = {};
		state.conflicts = [
			{
				id: 'suite-conflict-draft',
				startedAt: isoOf(at(-3, 16, 15)),
				stoppedAt: isoOf(at(-3, 17, 0)),
				isRunning: false,
				taskId: 'suite-conflict-task',
				task: { title: 'Suite conflict task' }
			}
		];
		await openRowMenu(page, 'Suite draft task', C.EDIT);
		const fourth = await openDialog(page, C.TIME_LOG);
		await fourth.locator('textarea').first().fill('Suite overlap note');
		const writesBeforeOverlap = api.writes().length;
		await clickDialogButton(page, fourth.getByRole('button', { name: C.SAVE, exact: true }), 'overlap save');
		const confirm = await openDialog(page, OVERLAP.CONFIRM_SAVE);
		report('overlap confirm', await textOf(confirm));
		await expect(confirm).toContainText('Suite conflict task');
		expect(api.writes().length - writesBeforeOverlap, 'an overlap saved before it was confirmed').toBe(0);
		await clickDialogButton(
			page,
			confirm.getByRole('button', { name: OVERLAP.CONFIRM_SAVE, exact: true }),
			'save anyway'
		);
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBe(writesBeforeOverlap + 1);
		report('overlap writes', api.writes().slice(writesBeforeOverlap));
		await expect.poll(() => dialogCount(page, C.TIME_LOG), { timeout: 20_000 }).toBe(0);

		// Every line the console holds is one this file armed, by name, and each armed refusal left exactly one of them.
		const named = (needle: string) => shield.consoleErrors().filter((line) => line.includes(needle));
		report('armed 400 lines', named(`PUT ${LOGGED_LOGS_PATH}/own-approved 400`));
		report('armed lookup lines', named(`${LOGGED_LOGS_PATH}/conflict`));
		report('mutation toaster lines', named(MUTATION_TOASTER));
		report('overlap guard lines', named(OVERLAP_GUARD_LOG));
		expect(
			named(`PUT ${LOGGED_LOGS_PATH}/own-approved 400`).length,
			'the armed 400 logged no HTTP error line'
		).toBe(1);
		expect(named(`${LOGGED_LOGS_PATH}/conflict`).length, 'the armed lookup logged no HTTP error line').toBe(1);
		expect(named(MUTATION_TOASTER).length, 'the refused save logged the mutation toaster more than once').toBe(1);
		expect(named(OVERLAP_GUARD_LOG).length, 'the refused lookup logged the overlap guard more than once').toBe(1);
		report('console', shield.consoleErrors());
		expect(
			consoleFindings(shield).filter(
				(line) =>
					!line.includes(`PUT ${LOGGED_LOGS_PATH}/own-approved 400`) &&
					!line.includes(`${LOGGED_LOGS_PATH}/conflict`) &&
					!line.includes(MUTATION_TOASTER) &&
					!line.includes(OVERLAP_GUARD_LOG)
			),
			'a refused call logged a line this file did not arm'
		).toEqual([]);
	});

	// ------------------------------------------------- 10. Add time

	test("10 · Add time as a manager: the dialog's fields, a typed duration, the POST body, the list after", async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		report('add time buttons, organization role', await addTimeButtons(page).count());
		await expect(addTimeButtons(page)).toHaveCount(1);
		await addTimeButtons(page).first().click();
		const dialog = await openDialog(page, C.ADD_TIME_ENTRY);

		const save = dialog.getByRole('button', { name: C.SAVE, exact: true });
		await expect(save.first()).toBeDisabled();
		await expect(dialog).toContainText(C.DATE_AND_TIME);
		await expect(dialog).toContainText(C.REMOVE_PERIOD);
		await expect(dialog).toContainText(C.ADD_ANOTHER_PERIOD);
		await expect(dialog).toContainText(C.LINK_TO_PROJECT);
		const pickers = dialog.locator('[data-slot=select-trigger][role=combobox]');
		report('add time pickers', {
			selectTrigger: await pickers.count(),
			projectPopoverTrigger: await dialog.locator('[role=combobox][data-slot=popover-trigger]').count(),
			projectAsButton: await dialog.getByRole('button', { name: C.SELECT_A_PROJECT, exact: true }).count()
		});
		await expect(pickers).toHaveCount(2);
		// `add-mask-modal.tsx:573` and `:581` hard-code this dialog's notes strings (finding 15), so this one string is
		// the measured literal rather than a copy key.
		const notes = dialog.locator('textarea').first();
		await expect(notes).toHaveAttribute('aria-label', 'Insert notes here');
		await expect(notes).toHaveAttribute('placeholder', 'Insert notes here...');

		// `pickOption` opens the picker itself: clicking the trigger before it closes the list again (the failed run
		// retried a `role=option` that was never visible again).
		await pickOption(page, pickers.nth(0), fixture.names.task);
		await pickOption(page, pickers.nth(1), fixture.names.user);
		await dialog.locator('[data-slot=accordion-trigger]').first().click();
		const durationInput = dialog.locator(`input[placeholder="${MANUAL.DURATION.PLACEHOLDER}"]`).first();
		await expect(durationInput).toHaveCount(1);
		// `common.SHIFT_TIMING` is a text label here, not a control: the run's accessibility tree reads
		// `text: Shift timing` then `button "Start"` / `combobox: 00:00:00` / `button "End"` / `combobox: 00:00:00` /
		// `textbox "Duration"` (`-0b.log` test 10 snapshot), so the label is pinned as text, and the duration field by the
		// placeholder pin above.
		await expect(dialog).toContainText(C.SHIFT_TIMING);
		await expect(dialog).toContainText(MANUAL.DURATION.HINT);
		report('add time dialog', await textOf(dialog));

		// Without a typed duration Save is enabled but sends nothing at all (`-probe-9.log` H5): the Start / End fields
		// are still `00:00:00` and no request is made.
		await durationInput.fill('1:30');
		await durationInput.press('Enter');
		await expect.poll(() => durationInput.inputValue(), { timeout: 20_000 }).toBe(durationOf(5400));
		report('add time after duration', await textOf(dialog));
		await expect.poll(() => save.first().isDisabled(), { timeout: 20_000 }).toBe(false);

		const writesBefore = api.writes().length;
		await clickDialogButton(page, save.first(), 'add time save');
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBe(writesBefore + 1);
		const write = api.writes().at(-1);
		report('add time POST', write);
		expect(write?.method).toBe('POST');
		expect(write?.path).toBe(LOGS_PATH);
		// `-probe-10.log` I1, verbatim key set. The notes field is left empty (its border is marked destructive at
		// `add-mask-modal.tsx:577` and the save still went through with `description:""`), there is no `projectId` even
		// though the picker is labelled `Link to project*` (finding 17), and `isBillable:false` is the toggle's default.
		expect(write?.body).toEqual({
			isBillable: false,
			description: '',
			logType: 'MANUAL',
			source: 'TEAMS',
			taskId: fixture.ids.task,
			employeeId: fixture.ids.employee,
			organizationTeamId: fixture.ids.teamA,
			startedAt: isoOf(at(0, 9, 0)),
			stoppedAt: isoOf(at(0, 10, 30)),
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA
		});
		await expect.poll(() => dialogCount(page, C.ADD_TIME_ENTRY), { timeout: 20_000 }).toBe(0);

		await expect(logRows(page)).toHaveCount(7, { timeout: 20_000 });
		const week = weekOfZone('UTC');
		await expect(metaLine(page)).toHaveText(
			`${periodTextOf(week.from, week.to, 'UTC')} · ${durationOf(31500)} · ${copy(T.MEMBER_COUNT, { count: 2 })}`
		);
		// The new entry lands on **today** at the placement hour (`PLACEMENT_START_HOUR`), so it opens a new day group.
		const todayRow = table(page)
			.locator('[role=row]')
			.filter({
				has: page.getByRole('checkbox', { name: copy(T.SELECT_DAY, { day: dayLabelOf(new Date(), 'UTC') }) })
			});
		await expect(todayRow).toHaveCount(1);
		await expect(todayRow).toContainText(durationOf(5400));
		report('today day row', await cellsOf(todayRow.first()));
	});

	// ------------------------------------------------- 10b who is offered Add time at all

	test('10b · who is offered Add time: an organization role, a member with ALLOW_MANUAL_TIME, a member without it', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		await serveTimesheetApi(page, state);

		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee), { scenario: { roleName: 'EMPLOYEE' } });
		await expect(statusStrip(page)).toBeVisible({ timeout: 30_000 });
		report('EMPLOYEE without ALLOW_MANUAL_TIME', {
			addTime: await addTimeButtons(page).count(),
			rows: await logRows(page).count()
		});
		await expect(addTimeButtons(page)).toHaveCount(0);

		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee), {
			scenario: { roleName: 'EMPLOYEE', extraPermissions: [MANUAL_TIME_PERMISSION] }
		});
		await expect(statusStrip(page)).toBeVisible({ timeout: 30_000 });
		report('EMPLOYEE with ALLOW_MANUAL_TIME', {
			addTime: await addTimeButtons(page).count(),
			rows: await logRows(page).count()
		});
		await expect(addTimeButtons(page)).toHaveCount(1);
		await addTimeButtons(page).first().click();
		const ownDialog = await openDialog(page, C.ADD_TIME_ENTRY);
		report('own scope dialog', await textOf(ownDialog));
		// `useAddTimeAccess` gives scope `own` a fixed member (`fixedMember`), so the dialog names this employee.
		await expect(ownDialog).toContainText(fixture.names.user);
		await expect(ownDialog).toContainText(MANUAL.OWN_TIME_ONLY);
		await ownDialog.getByRole('button', { name: C.CANCEL, exact: true }).click();
		await expect.poll(() => dialogCount(page, C.ADD_TIME_ENTRY), { timeout: 20_000 }).toBe(0);
	});

	// ------------------------------------------------- 14. bulk edit of a selection

	test('14 · bulk edit: Keep as is refuses to send anything, and one chosen field sends one PUT per entry', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });

		await rowCheckbox(page, fixture.names.task).click();
		await rowCheckbox(page, 'Suite draft task').click();
		await expect(selectionBar(page)).toBeVisible({ timeout: 15_000 });
		await selectionBar(page).getByRole('button', { name: C.EDIT, exact: true }).click();
		const title = copy(T.BULK_EDIT.TITLE, { count: 2 });
		const dialog = await openDialog(page, title);
		report('bulk edit open', await textOf(dialog));
		await expect(dialog).toContainText(T.BULK_EDIT.DESCRIPTION);
		await expect(dialog).toContainText(T.BULK_EDIT.NOTHING_CHOSEN);
		await expect(dialog).toContainText(T.BULK_EDIT.KEEP);
		const tabs = await textsOf(dialog.getByRole('tab'));
		report('bulk edit tabs', tabs);
		expect(tabs).toEqual([T.BULK_EDIT.KEEP, TIMESHEET_PAGE.BILLABLE.YES, TIMESHEET_PAGE.BILLABLE.NO]);
		await expect(dialog.locator('input[value="keep-as-is"]')).toHaveCount(2);
		const idleUpdate = dialog.getByRole('button', { name: copy(T.BULK_EDIT.UPDATE, { count: 0 }), exact: true });
		await expect(idleUpdate.first()).toBeDisabled();

		// Choosing a field is not a save: nothing leaves the page until Update is pressed.
		const writesBefore = api.writes().length;
		await dialog.getByRole('tab', { name: TIMESHEET_PAGE.BILLABLE.NO, exact: true }).click();
		await page.waitForTimeout(1_000); // a quiet window: it proves choosing a field sent nothing
		expect(api.writes().length - writesBefore, 'choosing a field sent a write before Update').toBe(0);
		await expect(dialog).toContainText(copy(T.BULK_EDIT.WILL_UPDATE, { count: 2 }));
		const update = dialog.getByRole('button', { name: copy(T.BULK_EDIT.UPDATE, { count: 2 }), exact: true });
		await expect(update.first()).toBeEnabled();
		await clickDialogButton(page, update.first(), 'bulk update');
		// Both selected entries were served `isBillable:true`, and `BULK_EDIT.PROGRESS` / `UPDATED_PARTLY` /
		// `STILL_SELECTED` say the entries are updated one by one — so the 2 promised updates are 2 PUTs.
		// `-probe-8.log` H4 selected these same two entries but read its `writes` line the moment the first PUT landed.
		await expect.poll(() => api.writes().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(writesBefore + 2);
		await page.waitForTimeout(1_500); // a quiet window: it proves the walk sent no write beyond the two entries
		const bulkWrites = api.writes().slice(writesBefore);
		report('bulk writes', bulkWrites);
		expect(bulkWrites.length, 'a bulk edit over 2 chosen entries sent a different number of writes').toBe(2);
		for (const id of ['own-pending', 'own-draft']) {
			const log = servedLogs(fixture).find((entry) => String(entry.id) === id);
			const write = api.writes().find((call) => call.path === `${LOGS_PATH}/${id}`);
			report(`bulk body ${id}`, write?.body);
			expect(write?.method).toBe('PUT');
			expect(write?.body).toEqual({
				startedAt: isoOf(new Date(String(log?.startedAt))),
				stoppedAt: isoOf(new Date(String(log?.stoppedAt))),
				employeeId: String(log?.employeeId),
				isBillable: false,
				organizationId: fixture.ids.organizationA,
				tenantId: fixture.ids.tenantA
			});
		}
		await expect.poll(() => dialogCount(page, title), { timeout: 20_000 }).toBe(0);
		const cards = await statusCardTexts(page);
		report('cards after bulk edit', cards);
		await expect(logRows(page)).toHaveCount(6, { timeout: 20_000 });
	});

	// ------------------------------------------------- 11. the sheet cell write

	test('11 · a sheet cell as use-sheet-cell-writes pins it: the input, the typed duration, the POST body, the cell after', async ({
		page,
		fixture
	}) => {
		const state = newStore(fixture);
		const api = await serveTimesheetApi(page, state);
		// The sheet only hands a cell to a viewer `canWrite` covers: `ALLOW_MANUAL_TIME` on the viewer's own role and a
		// write right on this member (`use-sheet-editing.ts:131-133`). The mock's role permissions do not carry
		// `ALLOW_MANUAL_TIME` (`mock-gauzy-server.mjs:50` `basePermissions`, the same finding
		// `time-import-settings-ui.spec.ts:128-131` records), which is why every cell of test 3 is a read-only
		// `cell "No time"` or an entries button (`timesheets-sheet-cell.tsx:70-119`) and why this test is the one that
		// asks for the permission.
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee), {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION] }
		});
		await expect(statusStrip(page)).toBeVisible({ timeout: 30_000 });

		/* Which cells are open is `sheetLockOf` / `cellLockOf` (`core/lib/utils/dashboards/timesheet-sheet-edit.ts:478-511`)
		   applied to the entries this file serves, never to a calendar, so the count below follows the served data and
		   today's real day rather than a typed number:
		   - one row per task the member's own entries name (the sheet keeps only this member's logs, `logsOfMember`, and
		     `use-sheet-editing.ts:142`);
		   - minus every day after today (`:499-503`): `allowsFutureDates = organization?.futureDateAllowed === true`
		     (`use-sheet-editing.ts:136`) and the mock's organization names `allowManualTime` / `allowModifyTime` /
		     `allowDeleteTime` but no `futureDateAllowed` (`mock-gauzy-server.mjs:95-97`);
		   - minus every day carrying one of the member's APPROVED entries (`:504-506`, `approvedDayKeysOf` `:543-555`,
		     which keys the day locally — `own-approved` is the only one and starts mid-day, so its local and UTC day
		     agree);
		   - no day is locked as running: every served entry has `isRunning:false` (`:507-509`).
		   `-probe-4.log` D6 printed exactly this set on a Thursday: 3 rows × {Monday, Yesterday, Today}. */
		const localDayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		const ownLogs = state.logs.filter((log) => String(log.employeeId) === fixture.ids.employee);
		const rowTasks = Array.from(new Set(ownLogs.map((log) => String(log.taskId))));
		const approvedKeys = new Set(
			ownLogs
				.filter((log) => statusLabelOf(log) === T.STATUS.APPROVED)
				.map((log) => localDayKey(new Date(String(log.startedAt))))
		);
		const week = weekOfZone('UTC');
		const weekKeys = Array.from({ length: 7 }, (_, index) =>
			zoneDayKeyOf(new Date(week.fromDate.getTime() + index * 86_400_000), 'UTC')
		);
		const todayKey = localDayKey(new Date());
		const openKeys = weekKeys.filter((key) => key <= todayKey && !approvedKeys.has(key));
		const taskKeys = new Set(
			ownLogs
				.filter((log) => String(log.taskId) === fixture.ids.task)
				.map((log) => localDayKey(new Date(String(log.startedAt))))
		);
		const targetKey = openKeys.find((key) => !taskKeys.has(key)) ?? '';
		report('sheet editable expectation', {
			rowTasks,
			weekKeys,
			todayKey,
			approvedKeys: [...approvedKeys],
			taskKeys: [...taskKeys],
			openKeys,
			targetKey,
			expectedInputs: rowTasks.length * openKeys.length
		});
		expect(targetKey, 'the served entries leave no open day of the week free on the task row').not.toBe('');

		const targetDay = new Date(`${targetKey}T12:00:00Z`);
		const cellName = copy(T.SHEET.EDIT.CELL_INPUT, { task: fixture.names.task, day: dayLabelOf(targetDay, 'UTC') });
		// The input **is** the cell: `EditableCell` renders it inside `span[role=cell]` named by `SHEET.EDIT.CELL_INPUT`
		// (`timesheets-sheet-cell.tsx:203-219`; `-probe-4.log` D6 target `Time on Fixture active task, Monday, Nov 23`). It
		// is a textbox, not a spinbutton (`-0.log`: the locator by role found 0 of them).
		const cell = page.locator(`input[inputmode=decimal][aria-label="${cellName}"]`);
		await expect.poll(() => cell.count(), { timeout: 20_000 }).toBe(1);
		const editable = await page.evaluate(() =>
			Array.from(document.querySelectorAll('input[inputmode=decimal]')).map(
				(input) =>
					`${(input as HTMLInputElement).getAttribute('aria-label') ?? ''}|${(input as HTMLInputElement).value ?? ''}`
			)
		);
		report('sheet cells', editable);
		expect(
			editable.length,
			'the sheet opened a different set of cells than its lock rules give the entries this file serves'
		).toBe(rowTasks.length * openKeys.length);
		await expect(cell, 'the cell chosen for the write already held time').toHaveValue('');

		const writesBefore = api.writes().length;
		const callsBeforeWrite = api.calls.length;
		await cell.click();
		await cell.fill('1:30');
		await cell.press('Enter');
		await expect.poll(() => api.writes().length, { timeout: 20_000 }).toBe(writesBefore + 1);
		const write = api.writes()[writesBefore];
		report('sheet POST', write);
		expect(write?.method).toBe('POST');
		expect(write?.path).toBe(LOGS_PATH);
		// The entry lands on the day's placement hour in the browser's own day (`PLACEMENT_START_HOUR`, the same rule the
		// Add time entry follows in test 10): `-probe-4.log` D6 wrote `2026-11-23T08:00:00.000Z` on a Europe/Madrid
		// browser, which is 09:00 of that day locally.
		const placed = new Date(`${targetKey}T09:00:00`);
		expect(write?.body).toEqual({
			startedAt: isoOf(placed),
			stoppedAt: isoOf(new Date(placed.getTime() + 5400_000)),
			employeeId: fixture.ids.employee,
			projectId: fixture.ids.project,
			taskId: fixture.ids.task,
			organizationTeamId: fixture.ids.teamA,
			isBillable: true,
			logType: 'MANUAL',
			source: 'TEAMS',
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA
		});
		// What the cell shows after the save is the saved duration in the page's own short form (`savedTextOf` →
		// `formatDurationShort`, `timesheets-sheet-cell.tsx:49-55`): the typed `1:30` became `1h 30m` (`-0d.log` received
		// `1h 30m`; `-probe-4.log` D6 read `1:30` in the moment before the sheet re-read what it had saved).
		await expect.poll(() => cell.inputValue(), { timeout: 20_000 }).toBe(durationOf(5400));
		const storeAfter = state.logs.map(
			(log) => `${String(log.id)}|${String(log.startedAt)}|${String(log.duration)}`
		);
		report('sheet store', storeAfter);
		expect(storeAfter.length, 'the sheet write did not land in the store this file answers from').toBe(7);
		const servedSeconds = state.logs.reduce((sum, log) => sum + Number(log.duration), 0);
		const memberCount = new Set(state.logs.map((log) => String(log.employeeId))).size;
		report('sheet meta figures', { servedSeconds, memberCount });
		await expect(metaLine(page)).toHaveText(
			`${periodTextOf(week.from, week.to, 'UTC')} · ${durationOf(servedSeconds)} · ${copy(T.MEMBER_COUNT, { count: memberCount })}`
		);
		const writesToast = await page.evaluate(() =>
			Array.from(document.querySelectorAll('li[data-sonner-toast], [data-slot=toast]')).map((node) =>
				(node.textContent ?? '').replace(/\s+/g, ' ').trim()
			)
		);
		report('sheet toasts', writesToast);
		expect(writesToast, 'the sheet said something about its write').toEqual([]);
		// The write reads the saved logs under the **browser's** zone while the page's own reads name the profile's
		// (`readSavedMemberLogs`, `use-sheet-editing.ts:184-200`), so the browser-zone read is picked by its zone, not by
		// position (finding 1).
		const browserZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
		report(
			'sheet calls after the write',
			api.calls.slice(callsBeforeWrite).map((call) => ({
				method: call.method,
				path: call.path,
				timeZone: call.params['timeZone'] ?? '',
				employeeIds: queryValuesOf(call.search, 'employeeIds')
			}))
		);
		const savedRead = api.reads(LOGS_PATH).find((call) => call.params['timeZone'] === browserZone);
		report('sheet write-time read', savedRead?.params);
		expect(savedRead, `no read named the browser zone ${browserZone}`).toBeTruthy();
		expect(
			queryValuesOf(savedRead?.search ?? '', 'employeeIds'),
			'the write-time read did not name this member'
		).toEqual([fixture.ids.employee]);
	});

	// ------------------------------------------------- 12. Export CSV

	test('12 · Export CSV: enabled when the period has rows, its file name, its header line and its rows', async ({
		page,
		fixture
	}) => {
		// The other half — Export is disabled when the period has no log at all — is asserted in test 1 on the mock's own
		// empty period (`-probe-3.log` R1), and refusing the read instead shows the error state, not the empty one.
		const state = newStore(fixture);
		await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 30_000 });
		await expect(exportButton(page)).toBeEnabled();

		await exportButton(page).click();
		const menuItems = await textsOf(openMenu(page).getByRole('menuitem'));
		report('export menu', menuItems);
		const csvEvent = page.waitForEvent('download');
		await openMenu(page).getByRole('menuitem', { name: T.EXPORT_CSV, exact: true }).click();
		const csv = await csvEvent;
		const week = weekOfZone('UTC');
		expect(csv.suggestedFilename(), 'the CSV is not named after the prefix and the shown period').toBe(
			`${FILE_PREFIX}-${week.fromKey}-${week.toKey}.csv`
		);
		const raw = readFileSync(await csv.path(), 'utf8');
		report('csv first char code', raw.charCodeAt(0));
		const body = raw.charCodeAt(0) === 65279 ? raw.slice(1) : raw;
		const lines = body.split('\r\n');
		report('csv lines', lines);
		expect(lines[0], 'the CSV header is not the column order the export builds').toEqual(
			[
				T.COLUMNS.DATE,
				T.COLUMNS.START,
				T.COLUMNS.END,
				T.COLUMNS.MEMBER,
				T.COLUMNS.PROJECT,
				T.COLUMNS.TASK,
				T.COLUMNS.STATUS,
				T.COLUMNS.BILLABLE,
				C.LABELS,
				T.COLUMNS.DURATION,
				C.NOTES
			].join(',')
		);
		const rows = servedLogs(fixture)
			.slice()
			.sort((a, b) => `${String(a.startedAt)}`.localeCompare(String(b.startedAt)))
			.map((log) => {
				const startedAt = new Date(String(log.startedAt));
				const stoppedAt = new Date(String(log.stoppedAt));
				const status = statusLabelOf(log);
				return [
					csvDayOf(startedAt),
					csvClockOf(startedAt),
					csvClockOf(stoppedAt),
					fullNameOf(log),
					projectNameOf(log, ''),
					taskTitleOf(log, ''),
					status,
					log.isBillable ? TIMESHEET_PAGE.BILLABLE.YES : TIMESHEET_PAGE.BILLABLE.NO,
					'',
					csvDurationOf(Number(log.duration)),
					''
				].join(',');
			});
		expect(lines.slice(1, rows.length + 1), 'the CSV rows are not the served logs, oldest first').toEqual(rows);
	});

	// ------------------------------------------------- 13. a read that fails

	test('13 · a refused read: the notice, the cards without figures, a disabled Export, Try again, and the armed console line', async ({
		page,
		fixture,
		shield
	}) => {
		const state = newStore(fixture, { 'GET /api/timesheet/time-log': 500 });
		const api = await serveTimesheetApi(page, state);
		await signInAndVisit(page, fixture, MEMBER_PAGE(fixture.ids.employee));

		const notice = page.locator('output').filter({ hasText: STATES.ERROR_TITLE });
		await expect(notice.first()).toBeVisible({ timeout: 30_000 });
		const bodyText = await textOf(bodyRegion(page));
		report('error body', bodyText);
		await expect(bodyRegion(page)).toContainText(STATES.ERROR_MESSAGE);
		const cards = await statusCardTexts(page);
		report('cards on a failed read', cards);
		expect(cards.map((line) => line.split('|')[0])).toEqual(
			[T.STATUS.ALL, T.STATUS_CARDS.PENDING, T.STATUS.APPROVED, T.STATUS.DENIED, T.STATUS.DRAFT].map(
				(label) => `${label}${MISSING_VALUE}${MISSING_VALUE}`
			)
		);
		const week = weekOfZone('UTC');
		await expect(metaLine(page)).toHaveText(periodTextOf(week.from, week.to, 'UTC'));
		await expect(exportButton(page)).toBeDisabled();
		const readsBeforeRetry = api.reads(LOGS_PATH).length;
		report('reads before retry', readsBeforeRetry);

		const armed = armedFailureLines(shield, LOGGED_LOGS_PATH, 500);
		report('armed console lines', armed.length);
		expect(armed.length, 'the refused read logged no line naming the path and the armed status').toBeGreaterThan(0);
		expect(
			consoleFindingsWithArmed(shield, LOGGED_LOGS_PATH, 500),
			'the failed read logged more than the armed status'
		).toEqual([]);

		state.refusals = {};
		await bodyRegion(page).getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true }).click();
		await expect.poll(() => api.reads(LOGS_PATH).length, { timeout: 30_000 }).toBeGreaterThan(readsBeforeRetry);
		// The page opens on the Sheet view (`viewOf`, `use-timesheets-page.ts:105-111`) and only the List's log rows carry
		// `aria-selected`, so the recovered rows are read from the List view.
		await viewTabs(page).getByRole('tab', { name: T.VIEWS.LIST, exact: true }).click();
		await expect(logRows(page)).toHaveCount(6, { timeout: 30_000 });
		report('reads after retry', api.reads(LOGS_PATH).length);
		await expect(exportButton(page).first()).toBeEnabled();
	});
});
