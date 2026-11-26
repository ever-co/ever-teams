import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type BootstrapFixture, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on the **saved reports of Reports › Time and
 * activity** (`/reports/time-and-activity`, `app/[locale]/(main)/reports/time-and-activity/page.tsx` →
 * `core/components/dashboards/time-activity/time-activity-page.tsx:117`, which hands the saved-reports block to the
 * report sheet's `exportSlot`), on lane-b (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, platform `3997`,
 * control `3998`, issuer `3999`, `playwright/test-servers.ts:39`).
 *
 * ## Where the numbers came from
 *
 * Four throwaway probes on this lane, each under the lane lock, topic `savedreports`:
 * `D:\Coding\.tmp\probe-savedreports\probe.spec.ts` (log `probe-1.log`, 21 cases, 16 passed), `probe2.spec.ts`
 * (`probe-2.log`, 16 cases, 11 passed), `probe3.spec.ts` (`probe-3.log`, 6 cases, 6 passed) and `probe4.spec.ts`
 * (`probe-4.log`, 2 cases, 2 passed, run 2026-11-26). Every failed probe case was a probe-side bug, each fixed and
 * re-measured: a measure taken the instant a request was *recorded* (a toast or a panel had not re-rendered yet — the
 * first hand-off's §4.1), a menu item matched by `hasText` hitting the report row named "Rename me", a `getAttribute`
 * on a node the click had already removed, and reading a `[role="dialog"]` that the Next dev overlay's own "Console
 * Error" dialog had claimed (every panel here is read through `[data-slot="popover-content"]`).
 * `probe-3.log` and `probe-4.log` settled the three things the first hand-off could not reach: a refused delete closes
 * its question (`probe-3.log` R2 `alertDialogCount 0`), the labels probe's `failed` state really appears — after the
 * query's `retry: 3` runs out, with its Try again in the popover and as a menu item (`probe-4.log` S1/S2), and while a
 * saved-report write is in flight both the Update item and the amounts switch are disabled (`probe-3.log` R6).
 *
 * The values below are pinned on those prints, and this file's own acceptance runs (`s3-lane-b-savedreports-1.log`,
 * `-2.log`) confirm them; a run that disagreed with a probe was re-measured, never softened.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's own mock, which answers this page's **only** read that it has a handler for — the timer status
 * behind the entry-labels question (`cypress/support/mock-gauzy-server.mjs:283-285` `timerStatus.lastLog.tags: []`,
 * read by `core/hooks/timer/use-entry-labels-support.ts:30-36`) — plus the NextAuth stub, the shell and every other
 * route the mock serves. Test 1 runs with **no stub at all**: the list read then lands on the mock's catch-all,
 * `pagination([])` (`mock-gauzy-server.mjs:9`, reached from the tail of `routeResponse` `:893-895`), and the mock's own
 * request log (`mock.calls('saved-reports')`) is what proves it.
 *
 * **Served by this file:** every saved-reports route the mock lacks. `grep saved-report cypress/support/mock-gauzy-server.mjs`
 * finds no handler, so an unwritten one answers a GET with `pagination([])` and any write with **the body it was sent**
 * (`:893-895`): a `POST /saved-reports` would 200 with no `id`, a `POST …/share` with no `token`, and the labels probe
 * (`PUT` of the nil uuid) would answer 200, i.e. "labels are kept". So `serveSavedReports` below answers them from a
 * store on the **mock origin** (the pattern of `suites/lane-b/embeds-settings-ui.spec.ts:268-536` and
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360`): each list answer is the current store, so the re-read every
 * mutation's `onSuccess: readAgain` asks for (`core/hooks/dashboards/time-activity/use-saved-reports.ts:73-76`,
 * `:96-132`) reflects the write — which is the only way "the item is gone" can be told from "the server still lists
 * it". Answers restate the mock's CORS headers (`mock-gauzy-server.mjs:1088-1096`, `OPTIONS` → 204 at `:1097`), because
 * the page sits on `localhost:3032` and the API on `127.0.0.1:3996`. `route.fetch()` is never called, so in every
 * stubbed test `mock.calls('saved-reports')` is empty — the witness that the page acted on this file, not on the mock.
 *
 * **The browser calls the mock origin, never the app's own `app/api/saved-reports/**` twins.** Measured in
 * `probe-3.log` R1: the mock logged `GET /api/saved-reports?organizationId=…&skip=0&take=200` and the browser made
 * **zero** app-origin `/api/saved-reports` calls. That is the lane's wiring (`playwright/test-servers.ts:119-123` sets
 * `NEXT_PUBLIC_GAUZY_API_SERVER_URL` to the lane mock; `core/services/client/api/timesheets/saved-report.service.ts:141`
 * builds the service on `GAUZY_API_BASE_SERVER_URL.value`; `core/services/client/api.service.ts:509-521` appends
 * `/api`), so `app/api/saved-reports/**` and `core/services/server/saved-report-proxy.ts` are **not** in this file's
 * path.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/dashboards/time-activity/saved-reports-menu.tsx`: `PeriodOfReport` `:23-34` (a `periodRule` prints
 *   the preset label from `PRESET_LABEL_KEYS` `core/components/dashboards/kit/period-picker.tsx:27-36`; fixed days
 *   print `formatPeriod` `core/lib/utils/dashboard-period.ts:147-164`, which drops the year when both days are in the
 *   current one), `ReportRow` `:36-56` (the name as a `title` `:47`), `MenuState` `:58-87` (`LOADING` `:68`,
 *   `LOAD_ERROR` + `TRY_AGAIN` `:75-78`, `EMPTY` `:84`), `ActiveReportActions` `:89-130` (Update `disabled` when the
 *   view already equals the report, or a write is in flight, or a label view may not be written over it:
 *   `showsSavedView || isUpdating || !canUpdate` `:115`, its note `:119`; Rename `:122`, Delete `:126`), the menu
 *   itself `:170-213` (trigger `aria-label={MENU}` `:176`, rows only once `isReady` `:187`, the action block only for
 *   the report the link names `:199`).
 * - `core/components/dashboards/time-activity/saved-report-name-form.tsx`: the name problem judged on submit `:13-22`
 *   (`NAME_REQUIRED` `:29`, `NAME_TOO_LONG` `:36`), `aria-describedby` only under a problem `:74-92`, `maxLength =
 *   SAVED_REPORT_NAME_MAX_LENGTH + 20` `:89` (100 `core/lib/utils/dashboards/saved-report.ts:43` + 20), Cancel
 *   `common.CANCEL` `:99`, `onSubmit(name.trim())` `:70`.
 * - `core/components/dashboards/time-activity/saved-report-share-panel.tsx`: `LinkState` `:60-91` (`LINK_ENDED` `:73`,
 *   `LINK_OFF` `:78`, `LINK_HIDDEN` when no token is held `:83`, `EXPIRES` `:86`), `EndDayField` `:93-116`
 *   (`min={today}` `:105`), `LinkButtons` `:118-158` (`TURN_ON` `:132` vs `TURN_OFF` `:142` + `REPLACE` `:152` +
 *   `REPLACE_HINT` `:155`), the panel `:165-200`, its end day prefilled from the report
 *   (`shareExpiryDayOf(report.shareExpiresAt) ?? ''` `:172`).
 * - `core/components/dashboards/time-activity/time-activity-saved-reports.tsx`: `LabelsNote` `:84-117` (`checking` `:97`,
 *   `failed` + its Try again `:99-113`, `not-kept` `:115`), `SaveButton` `:119-166` (the popover stays open when the
 *   save failed `:133-138`, the note replaces the name form when the view may not be saved `:152-154`), `ShareButton`
 *   `:168-235` (`SHARE_NEEDS_SAVE` when the link has no report to hang on `:219`), `isAnswered` gate `:263` + `:431-433`
 *   (an API without saved reports renders nothing), `activeId`/`activeReport` `:259-260`, the labels question
 *   `:268-269`, `awaitsLinkedLabels` `:276`, `canSave` `:279`, `saveView` `:284-308` (`savedReportInputOf` `:289`, the
 *   link set to the created id `:293-299`, `SAVED` `:300`, `SAVE_FAILED` `:303`), `updateReport` `:312-330`,
 *   `renameReport` `:332-346` (`{ id, input: { name } }` `:338` — a rename sends the name alone), `deleteReport`
 *   `:348-366` (the link key is dropped only when it still names the deleted report `:356-360`), `urlOf` `:368-377`
 *   (`sharedReportUrlOf(window.location.origin, token, …)` `:377`), `shareActionsOf` `:382-428` (403 → `SHARE_REFUSED`,
 *   anything else → `SHARE_FAILED` `:391-397`; `TURNED_OFF` / `SHARE_FAILED` `:399-403`; the amounts switch returns in
 *   silence while a write is pending `:409-411`; copy `:418-423`), the rename Dialog `:462-477`, the delete
 *   `AlertDialogConfirmation` `:478-487`.
 * - `core/hooks/dashboards/time-activity/use-saved-reports.ts`: `availabilityOf` `:25-36` (a 404 list is
 *   `unsupported`, any other refusal `error`), `shouldRetryList` `:38-45` (a refusal under 500 is never retried; a 5xx
 *   while `failureCount < 2`), `enabled: hasScope && shellSettled` `:62-68`, `staleTime: 60_000` `:66`, the tokens kept
 *   in a jotai atom only `:78-94` (`core/stores/timer/saved-report-links.ts`), the five mutations `:96-132`, each with
 *   `onSuccess: readAgain`.
 * - `core/hooks/dashboards/time-activity/use-saved-report-labels-support.ts`: `supportOf` `:27-46`, the query `:66-73`
 *   (`enabled: isNeeded && entryLabels.isSupported && hasWorkspace && shellSettled` `:69`, `staleTime/gcTime: Infinity`,
 *   `retry: 3` `:72`).
 * - `core/services/client/api/timesheets/saved-report.service.ts`: page size 200 `:19`, the nil uuid `:22`,
 *   `GROUPING_PROPERTY = /\bgrouping\b/i` `:27` + `isRefusalOfLabelGrouping` `:40-47`, `list` `:66-75` (`skip`/`take`,
 *   page after page until the total, a page that brings nothing ends the read `:69`), `create` `:77-80` (`post(…,
 *   undefined, false)`), `update` `:82-85` (`put` with no fourth argument), `remove` `:87-89`, `share` `:92-100
 *   (`{ secretResponse: true }, false)`), `keepsEntryLabels` `:109-122` (the probing `PUT` at `:111`), `unshare`
 *   `:125-127`. **No answer is validated here** — compare `core/services/client/api/embeds/embeds.service.ts`, which
 *   validates each one; that is why a malformed list answers as the spread at `:70`.
 * - `core/services/client/api.service.ts`: `put` `:684-712`, its widening `:701-709`, documented at `:681-682`.
 * - `core/lib/utils/dashboards/saved-report.ts`: `SAVED_REPORT_PARAM` `:40`, name limit `:43`, `savedPeriodOf` `:55-61`,
 *   `savedFiltersOf` `:67-77`, `canSaveView` `:112-114`, `canUpdateReport` `:121-124`, `savedReportInputOf` `:127-138`,
 *   `linkParamsOfSavedReport` `:161-182` (param order period → teams/members/projects/tasks → clients → billable →
 *   entryLabels → groupBy → report), `showsSavedView` `:220-225`, `sharedReportUrlOf` `:231-236` (the token in the
 *   `#token=` fragment), `shareExpiryOf` `:239-245` (local end of day), `shareExpiryDayOf` `:248-257`.
 * - `core/components/common/mutation-error-toaster.tsx:26-58`: the global fallback toast, printed because no
 *   saved-reports mutation sets `meta.handlesOwnError` nor an `onError` (`use-saved-reports.ts:96-132`); in dev it also
 *   prints `console.error('Mutation failed:', …)` (`:43-48`) — the `DEV_MUTATION_NOISE` excuse below.
 * - The grouping control `core/components/dashboards/time-activity/time-activity-toolbar.tsx:93-99` (`SegmentedControl`
 *   → `role=tablist` named `dashboard.timeActivity.grouping.LABEL` with `role=tab` + `aria-selected`), the PeriodPicker
 *   `:74-79` (`role="group"`, `core/components/dashboards/kit/period-picker.tsx:117`, named `dashboard.period.LABEL`),
 *   `core/components/common/billable-switch.tsx` (Headless UI `role="switch"`).
 *
 * ## What the probes measured, per case (the assertions below are pinned on these)
 *
 * - **The lane as it is** (`probe-3.log` R1): one mock read
 *   `GET /api/saved-reports?organizationId=22222222-2222-4222-8222-111111111111&skip=0&take=200`, no app-origin
 *   saved-reports call, an empty menu (`Saved reports No saved report yet. Save this view to reopen it in one click.`,
 *   **0** menuitems), a Save popover `Save this report Keeps the period, the filters and the grouping. Reopen it from
 *   Saved reports. Name Cancel Save`, a Share popover with no saved report behind it `Share a read-only link A link
 *   shares a saved report. Name this view to save it, then turn its link on. Name Save`, and a clean console.
 * - **Two pages** (`probe-1.log` P2): served 2 items of `total 3` → reads `…&skip=0&take=200` then `…&skip=2&take=200`;
 *   three rows in served order `Alpha month Last month`, `Beta fixed Nov 16 – 23`, `Gamma week This week`, each a
 *   `menuitem` whose name is also a `title` (`probe-2.log` Q2 nameTitles; the row itself carries no `title` —
 *   Q2 rowTitles `[null,null,null]`).
 * - **The name form** (`probe-1.log` P3): at rest the field has no `type` attribute, `maxlength="120"`,
 *   `autocomplete="off"`, `placeholder="Client A, last month"`, no `aria-describedby`, `aria-invalid="false"`, empty
 *   value. Empty submit → `Give the report a name.` + `aria-invalid="true"` + **0** POSTs, popover still open. 101
 *   characters → `100 characters at most.` + `aria-invalid="true"` + **0** POSTs, the 101 characters still typed.
 * - **A save of the untouched view** (`probe-1.log` P4): `POST /api/saved-reports` with an empty query, body
 *   `{"periodRule":"last7Days","startDate":null,"endDate":null,"timeZone":"Europe/Madrid","filters":{"teamIds":[],"employeeIds":[],"projectIds":[],"taskIds":[],"clientIds":[],"billableOnly":false},"grouping":"date","name":"Probe saved view","tenantId":…,"organizationId":…}`
 *   — **no `kind`**, the name trimmed, `timeZone` = the browser's own zone (`getDefaultTimeZone()`,
 *   `time-activity-saved-reports.tsx:289`); calls `GET → POST → GET` again; toasts `SAVED` 1, `SAVE_FAILED` 0; the URL
 *   `…?period=last7Days&report=served-1`; the menu `Saved reports Probe saved view Last 7 days Probe saved view Update
 *   with this view Rename Delete`.
 * - **Opening a saved report** (`probe-1.log` P5, `probe-2.log` Q3): the URL becomes
 *   `…?period=lastMonth&billable=true&groupBy=member&report=open-member` (order fixed by `linkParamsOfSavedReport`),
 *   the Period group reads `Last month`, the tabs read `Date|false Member|true Project|false Task|false Week|false
 *   Label|false` (**no Client tab for this lane's fixture role**, `core/lib/utils/dashboards/time-activity.ts:76-85`),
 *   the page says `Billable only` once, and no extra saved-reports read is sent. A fixed-days report reads
 *   `…?from=2026-11-14&to=2026-11-21&groupBy=project&report=open-fixed` with the group `Nov 14 – 21`.
 *   (Those two dates are this file's own served offsets, not a pinned today.)
 * - **The action block** (`probe-1.log` P6): without a report named by the link the menu offers 0 Update / 0 Rename /
 *   0 Delete items; with one it offers all three; the Update item is disabled (`data-disabled=""`,
 *   `aria-disabled="true"`) while the view equals the report and enabled (`data-disabled` absent) after `groupBy=member`
 *   is chosen, and none of that sends a request (P6 shapes = the single list read).
 * - **Rename** (`probe-2.log` Q16, `probe-1.log` P7): the dialog reads `Rename the report Name Cancel Rename` with the
 *   current name in the field; the `PUT /saved-reports/<id>` body is `{name, tenantId, organizationId}` — the name
 *   alone, widened (finding 2); the toast `Report renamed`; the item reads `After rename`.
 * - **Delete** (`probe-2.log` Q4, `probe-3.log` R2): the question is `Delete “Drop me”? … Cancel Delete`; Cancel sends
 *   nothing and changes nothing (0 DELETEs, store as served, the link key still naming it); confirming sends
 *   `DELETE /api/saved-reports/drop-me` **then one list re-read**, the row leaves the menu, `“Drop me” deleted` is
 *   toasted and the link key is dropped (`…?period=last7Days`). A refused delete (403) closes the question once it is
 *   answered (`probe-3.log` R2 `alertDialogCount 0`), toasts `The report could not be deleted.` once, the global
 *   fallback once and `Your role does not allow this change.` once, sends **no** re-read (R2 shapes
 *   `GET, DELETE`), leaves the store and the link key as they were, and the menu still offers the action block.
 * - **The share panel** (`probe-1.log` P10/P11/P12, `probe-2.log` Q6/Q7/Q8): with the link off it reads `Share a
 *   read-only link <name> <SHARE_HINT> No link is on. Ends on Optional. Used when the link is turned on or replaced.
 *   Include amounts Rates and what the time is worth. Off: durations only. Turn link on`, the end-day control is a text
 *   input with an empty value and the workspace's own `MM/DD/YYYY` placeholder (`core/lib/utils/typed-date-time.ts:304`;
 *   `min={today}` `saved-report-share-panel.tsx:105` goes to the calendar, not to the input). Turning the link on with
 *   the day empty sends `POST /saved-reports/<id>/share` with body exactly `{"expiresAt":null}` — **not widened**,
 *   because `saved-report.service.ts:96-99` passes `false` — and the link field then holds
 *   `<app origin>/shared-report#token=<served token>` (length 65, `holdsServedToken true`, `prefixMatches true`,
 *   `endsWithToken true`; the token itself is never printed). Copying toasts `Link copied` with no console error.
 *   A report already shared shows `The link is on. Its address is shown only when it is made: …` plus
 *   `Stops working after <medium date>`, the end day prefilled, the amounts switch `aria-checked="true"`, and
 *   `Turn off` / `Replace link` / `Replacing or turning off stops the current address at once.`. Typing a day and
 *   replacing sends `{"expiresAt":"<local end of that day>"}` (`shareExpiryOf` `saved-report.ts:239-245`; the browser's
 *   zone is read from the page, never assumed), and after the re-read the panel says `Stops working after <that day>`.
 *   An ended link reads `The link ended on <medium date>.` with `Turn link on` only (1 turn-on button, 0 turn-off).
 *   Turning the link off sends `DELETE /saved-reports/<id>/share`, toasts `Link turned off: its address no longer
 *   works.` and the panel returns to `No link is on.`. After a reload the address is gone (`LINK_HIDDEN` once, 0 link
 *   fields) while the served store still says `isShared true` — the token lives in the jotai atom for the visit only.
 *   The amounts switch sends `PUT /saved-reports/<id>` body `{includeAmounts:false, tenantId, organizationId}`.
 * - **The labels probe** (`probe-2.log` Q9/Q10, `probe-3.log` R3/R5, `probe-4.log` S1/S2): picking the **Label**
 *   grouping asks `PUT /api/saved-reports/00000000-0000-0000-0000-000000000000` with body
 *   `{grouping:"label", tenantId, organizationId}` (finding 2). Answer 200 or 404 → kept: the Save popover shows the
 *   name form (`Q9` nameField 1; `probe-3.log` R5 shows `Checking whether saved reports keep labels…` while a delayed
 *   404 is pending, the name form after it, exactly 1 probe call for a 404 since `shouldRetryList` does not retry it).
 *   Answer 400 whose message names `grouping` → not kept: the Save popover reads `Save this report Saved reports don't
 *   keep labels yet. …` with **no** name field, and the menu shows the same sentence under a disabled Update item
 *   (`Q10`). Any other 400, a 403 or a 500 → first `Checking whether saved reports keep labels…` (the query is still
 *   retrying, `retry: 3` `use-saved-report-labels-support.ts:72`), then `Could not check whether saved reports keep
 *   labels.` with a **Try again** button in the popover and a **Try again** menu item under a disabled Update item
 *   (`probe-4.log` S1 `failedCopy 1`, `tryAgainButton 1`, `tryAgainItem 1`, 4 probe calls: the first plus 3 retries —
 *   printed, never pinned).
 * - **Refused writes** (`probe-2.log` Q13/Q14, `probe-1.log` P18): 400 / 403 / 500 each show the page's own sentence
 *   (`SAVE_FAILED`, `DELETE_FAILED`, `SHARE_FAILED`) **and** the global fallback `That change was not saved` with the
 *   status's reason (`Some values were not accepted…`, `Your role does not allow this change.`, `The server could not
 *   complete it. Try again in a moment.`); the Save popover stays open with the typed name, the rename dialog stays
 *   open with the typed name, the served store is unchanged. A share refused **403** says `A link can only be turned on
 *   from your own sign-in, not from a session started with an API token.`; 400 and 500 say `The link could not be
 *   changed.`; an unshare refused leaves `isShared true` and the panel still showing the link as on.
 * - **A list that could not be read** (`probe-1.log` P16/P17): 404 → the whole block renders nothing (0 menu / 0 Save
 *   / 0 Share, the report's own **Export** still 1), read exactly once, and the labels probe is **not** asked. 403 →
 *   `Saved reports Saved reports could not be read. Try again` with 1 Try again menu item, read once (a refusal under
 *   500 is not retried), and the labels probe **is** asked. 500 → the same copy, retried (3 reads printed, not pinned),
 *   labels probe asked. A 200 that is not a list (`{}`, `[{…}]`, `{items:null,total:2}`) reads as the same error state
 *   with no page error.
 *
 * ## What this file's own runs measured on top of the probes
 *
 * `s3-lane-b-savedreports-1.log` and `-2.log` (runs this file disagreed with: each was re-measured, never softened),
 * the bounded re-run `s3-lane-b-savedreports-probe-1.log` and the probe `probe-5.log` (cases R1/R2/R3, `6 passed`)
 * added seven facts:
 *
 * - **A row is one `menuitem` whose accessible name is `<name> <period>`** — the name in one span
 *   (`saved-reports-menu.tsx:47-49`) and the period in another (`:50-52`), inside the item at `:42-54`. So
 *   `getByRole('menuitem', { name, exact: true })` matches **no row at all**; every row lookup and click here goes
 *   through `reportRow`, an anchored prefix regex (`^<escaped name>( |$)`). Measured: in `-1.log` the five tests that
 *   addressed a row by its exact name ran to the 180 s test timeout, and in the re-run the four tests that use the
 *   regex (5, 8, 9, 15) passed in 10–15 s each.
 * - **A served report's `startDate` / `endDate` have to be `YYYY-MM-DD` day keys, not ISO instants.** `savedPeriodOf`
 *   writes them as `localDayKeyOf` keys (`core/lib/utils/dashboards/saved-report.ts:55-61`); reading them back goes
 *   `periodOfSavedReport` → `periodOfDays` (`core/lib/utils/dashboards/time-activity-link.ts:75-85`) → `dayOfKey` =
 *   `new Date(\`${dayKey}T00:00:00\`)` (`core/lib/utils/dashboards/apps-urls-day.ts:73-75`), and an ISO string with a
 *   time part makes that `null`, so `PeriodOfReport` renders no period at all (`saved-reports-menu.tsx:30-32`).
 *   Measured in `-1.log`: a report served with full ISO dates printed the row `Beta fixed` with no period
 *   (`MEASURE twoPages`). Served fixed days are day keys here, which is what the app itself writes.
 * - **The share panel's save-first name form has no Cancel button**: `SavedReportNameForm` is rendered there without
 *   `onCancel` (`time-activity-saved-reports.tsx:224-228`), and the form only renders Cancel when `onCancel` was
 *   passed (`saved-report-name-form.tsx:97-102`). Measured in the re-run: `Expected "… Name Cancel Save"`,
 *   `Received "… Name Save"`, while the Save popover's own form does have Cancel (`:160`).
 * - **`formatRange`'s separator is not the same in Node and in the browser**: Node emits U+2009 THIN SPACE on each
 *   side of the U+2013 EN DASH, the browser U+0020 SPACE, so `periodRangeText` collapses whitespace runs (its comment
 *   carries both code points). Measured as the `- Expected / + Received` diff of the same re-run.
 * - **The URL loses a deleted report, but later than the mutation's re-read.** At the instant the re-read answered the
 *   URL was still `…?period=last7Days&report=drop-me`; 5 s later it was `…?period=last7Days` (`probe-5.log`
 *   R1 `urlAfterReread` / `urlAfterQuiet5s` / `clearedWithin15s true`). Test 7 therefore waits for the URL
 *   (`expect(page).toHaveURL`) instead of reading `page.url()` once — measured in `-2.log`, where reading it once
 *   failed on the URL that had not been rewritten yet.
 * - **A report served with the link already on never offers `Turn link on`.** It shows the hidden-address sentence and
 *   `Turn off` + `Replace link` with **no** link field (`LinkState` `saved-report-share-panel.tsx:60-91`, `LinkButtons`
 *   `:118-158`); `probe-5.log` R2 `controls {turnOn 0, turnOff 1, replace 1, linkFieldCount 0, hiddenCopy 1}`, against
 *   R3 `beforeTurnOn {turnOn 1, turnOff 0, replace 0}` for the same report served unshared. An after-reload test has
 *   to make the link in the run, not serve it shared.
 * - **After a reload the link is still on, only its address is gone**: `Turn off` 1, `Replace link` 1, link field 0,
 *   the hidden-address sentence 1, `isShared` still true (`probe-5.log` R3 `afterReload`).
 * - **`shield.consoleErrors()` is one log for the whole test** (`playwright/fixtures.ts:85`, `:101-105`), so an arm of a
 *   loop that arms several refusals on one page is judged on `consoleFindingsSince(shield, <count before the arm>)`.
 *   Measured in `-2.log`: tests 17 and 21 failed there because the previous arm's armed `HttpClient` line was still
 *   in the log (`GET /saved-reports?organizationId=…&skip=0&take=200 404`, `POST /saved-reports 400`) and the next
 *   arm's excuse did not name it.
 *
 * ## Findings
 *
 * 1. **A refused saved-reports write raises two toasts.** The page's own (`SAVE_FAILED` / `DELETE_FAILED` /
 *   `SHARE_FAILED`) and the global `toasts.MUTATION_FAILED` + a status reason, because no saved-reports mutation sets
 *   `meta.handlesOwnError` or an `onError` (`use-saved-reports.ts:96-132`) — unlike the embeds mutations, whose fallback
 *   stays silent (`suites/lane-b/embeds-settings-ui.spec.ts` finding 3). Measured, untagged: nothing (no comment, type
 *   or test) claims the fallback stays quiet here. A hardening idea.
 * 2. **Every saved-report `PUT` body carries `tenantId` and `organizationId` (measured, untagged; a hardening idea).**
 *   The wire body of the labels probe is `{"grouping":"label","tenantId":…,"organizationId":…}` (`probe-2.log` Q9
 *   probeBody, `probe-1.log` P15-404 probeBodyKeys `["grouping","organizationId","tenantId"]`); the rename body is
 *   `{name, tenantId, organizationId}` (`probe-2.log` Q16) and the amounts body `{includeAmounts, tenantId,
 *   organizationId}` (`probe-1.log` P11); the Update body carries the whole view with no `name` (`probe-1.log` P19).
 *   Cause: `api.service.ts:684-712` — `put(…, includeTenantAndOrganizationIds = true)` adds both ids when absent
 *   (`:701-709`, documented `:681-682`) — and `saved-report.service.ts:83` and `:111` pass no `false`, as `create` does
 *   (`:78`). **Not** tagged: the unit test `saved-report.service.test.ts:120` (`expect(put).toHaveBeenCalledWith(
 *   NIL_REPORT, { grouping: 'label' })`) spies on `put` itself, so it pins the call *before* `put` widens it and says
 *   nothing about the wire body; no comment or type states one either (lead review, 2026-11-26). Gauzy takes the bodies
 *   in this shape; passing `false` on the probe would make its body the single field its test names.
 * 3. **`[MEASURED, NOT INTENDED]` — a 200 answer to the labels probe also reads as "labels are kept".** The intent
 *   sentence (`saved-report.service.ts:102-108`: a Gauzy that keeps labels "answers 404 (no such report), and an older
 *   one refuses the grouping with a 400 that names it … Any other answer is a failure, read again") and its tests
 *   describe only 404 (`saved-report.service.test.ts:114-127`) and a grouping-naming 400; `:110-112` returns true for
 *   *any* answer that is not a refusal, so a Gauzy that answers
 *   the sentinel `PUT` with 200 is read as keeping labels (`probe-2.log` Q9, labelsAnswer 200 → the name form is
 *   offered). Untested in the unit suite.
 * 4. **A dead branch: the amounts switch cannot be flipped twice.** `shareActionsOf` returns in silence while a write
 *   is in flight (`time-activity-saved-reports.tsx:409-411`), but the switch is disabled for exactly that window
 *   (`saved-report-share-panel.tsx` `isSavingAmounts`, measured `probe-3.log` R6 `switchWhilePending {disabled:true}`
 *   and `probe-2.log` Q15 `whileInFlight {disabled:true}`), so the silent return is not reachable by clicking. Two
 *   settled flips do send two `PUT`s (`probe-2.log` Q15 `afterSecondFlip {putCount:2}`). Measured, untagged.
 * 5. **A refused delete closes its question** (`probe-3.log` R2 `alertDialogCount 0`, `probe-1.log` P9 measured it
 *   before the answer arrived and read `1`). The question's Action closes the dialog, and the failure is reported by
 *   the toasts only; nothing reopens it. No test pins either way, so this is written as measured.
 * 6. **The Update item is disabled for a view that already equals the report** (`saved-reports-menu.tsx:115` with
 *   `showsSavedView` `saved-report.ts:220-225`) — `data-disabled=""` / `aria-disabled="true"` (Base UI), enabled again
 *   after the grouping changes (`probe-1.log` P6), and also disabled while a write is in flight
 *   (`probe-3.log` R6 `updateWhilePending`) and while a label view's answer is `checking` or `failed`
 *   (`probe-2.log` Q10, `probe-4.log` S1).
 * 7. **The labels probe is not asked by an API without saved reports, but is asked by one that refused the list**
 *   (`probe-1.log` P16-404 shapes vs P16-403/500 shapes) — the same split the unit tests pin
 *   (`time-activity-saved-reports.test.tsx:176-190`, `:508-523`).
 *
 * ## Secrets
 *
 * The share tokens this file serves are its own random values; they are never printed, never written to a log or a
 * MEASURE line. Every place one is checked compares the shown link for containment or prefix and reports a boolean or a
 * length only; `grep -c` of each served token value in this file's run logs is 0. The `#token=` fragment shape is
 * pinned by `core/lib/utils/dashboards/saved-report.test.ts:190-210`, and the public page a token opens is pinned by
 * `suites/lane-a/public-link-pages-ui.spec.ts` — this file never opens one.
 *
 * ## What this file does not cover
 *
 * - The report itself (figures, filters, export) — `suites/lane-a/time-activity-report-ui.spec.ts`; the public page a
 *   share link opens (`/shared-report#token=…`) — `suites/lane-a/public-link-pages-ui.spec.ts`; who may open the report
 *   page at all — `suites/lane-b/reports-gate-by-role-ui.spec.ts`.
 * - The proxy half (`app/api/saved-reports/**`, `core/services/server/saved-report-proxy.ts`): this lane's browser
 *   never calls it (above), so its 401/403/pass-through rules stay with the api suites.
 * - `awaitsLinkedLabels` (`time-activity-saved-reports.tsx:276`) is **not reachable on this lane**: it needs a link
 *   that uses entry labels while the view does not, and the entry-labels answer here is "supported" (the mock's
 *   `timerStatus.lastLog.tags: []`, `mock-gauzy-server.mjs:283-285`, through
 *   `core/hooks/timer/use-entry-labels-support.ts:30-36`), so choosing the Label grouping makes `viewUsesEntryLabels`
 *   true at the same time (`:268`). Only `LABELS_CHECKING` / `LABELS_CHECK_FAILED` / `LABELS_NOT_KEPT` were reachable.
 * - The Labels **filter** (the report's own filter menu) and a link carrying `entryLabels=…&no-label`: the param rules
 *   are pinned by `core/lib/utils/dashboards/saved-report.test.ts:359-369`, and driving that filter is the report
 *   suite's half, not this file's.
 * - A label view whose probe answer is `kept` while the **Labels filter** (not the grouping) is what narrows the view.
 * - `LOADING` (`saved-reports-menu.tsx:68`): it lasts only while the first read is unanswered, and every wait in this
 *   file is a web-first one, so it is never observable — measured as "not reachable through a browser wait".
 * - `SAVED_REPORTS_PAGE_SIZE = 200` is exercised as `take=200` with a *smaller served page* (`pageSize` 2), which is
 *   what the service test's paging maths pins; a real 200-item page would need 200 served reports for no added proof.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const APP_REPORTS_PATH = '/reports/time-and-activity';
const REPORTS_ROUTE = '/api/saved-reports';
const NIL_REPORT_PATH = '/api/saved-reports/00000000-0000-0000-0000-000000000000';

/** `locales/en.json`, read by key: `dashboard.savedReports`, `common.*`, `dashboard.period.*`, `toasts.*`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	dashboard: {
		savedReports: Record<string, string>;
		period: { LABEL: string };
		timeActivity: { grouping: Record<string, string> };
	};
	common: Record<string, string>;
	timer: { labels: Record<string, string> };
	timeReports: { filters: Record<string, string> };
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
};
const T = EN.dashboard.savedReports;
const C = EN.common;
const REASONS = EN.toasts.REASONS;

/** `T.SAVED = "“{name}” saved"`, `T.LINK_ENDED = "The link ended on {date}."`, `T.EXPIRES = "Stops working after {date}."`. */
const filled = (key: string, values: Record<string, string>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), T[key]);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b saved reports] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** A served date at local noon, so a rendered `dateStyle: 'medium'` value cannot straddle midnight. */
const dayIso = (offsetDays: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day.toISOString();
};
const dayOf = (offsetDays: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day;
};
/** `YYYY-MM-DD`, the day this file serves or types for a given offset from today. */
const dayKey = (offsetDays: number) => {
	const day = dayOf(offsetDays);
	return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};
/**
 * The same day key the app writes, shown the way its date field shows it: `dayWritingOf(locale)` builds
 * `dayFormatOf` with `year numeric, month and day 2-digit` and `timeZone: 'UTC'` (`core/lib/utils/typed-date-time.ts:237-246`,
 * `:291-306`), so `MM/DD/YYYY` for the `en` workspace (its own test `core/lib/utils/typed-date-time.test.ts:105`,
 * `:118`). Zone-safe: the day is taken at UTC noon.
 */
const dayTextOfKey = (key: string) =>
	new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'UTC',
		numberingSystem: 'latn',
		calendar: 'gregory'
	}).format(new Date(`${key}T12:00:00Z`));
const dayText = (offsetDays: number) => dayTextOfKey(dayKey(offsetDays));
/**
 * The end-day field's own placeholder: `write(exampleDayOf(currentYear))` (`typed-date-time.ts:304`) = 31 December of
 * the current year in the workspace format. Measured `12/31/2026`; computed, never pinned.
 */
const december31Text = () => dayTextOfKey(`${new Date().getFullYear()}-12-31`);
/**
 * `formatPeriod` for two days of the current year (`dashboard-period.ts:147-164`, no year because both days are in
 * the current year, `:149-151`): it calls `dayFormat.formatRange` (`:156`) with exactly the options
 * `yearFormatOptions` returns (`:159-164`). The separator is collapsed to single spaces on purpose: Node's ICU puts
 * U+2009 THIN SPACE on each side of the U+2013 EN DASH, the browser puts U+0020 SPACE there, and the text this file
 * reads is the browser's — measured in `s3-lane-b-savedreports-probe-1.log` line 5 (`Beta fixed Nov 14 – 21`,
 * U+0020 U+2013 U+0020) against that run's line 67/68 diff (U+2009 U+2013 U+2009 on the Node side). The month and day
 * content stays what `formatRange` produces, so it is still locale- and zone-correct.
 */
const periodRangeText = (fromOffset: number, toOffset: number) =>
	new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
		.formatRange(dayOf(fromOffset), dayOf(toOffset))
		.replace(/\s+/g, ' ');
/** `localDayKeyOf` (`core/lib/utils/dashboard-export.ts:90-95`): the day key of an instant, in the machine's own zone. */
const localDayKeyOf = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
/**
 * `shareExpiryOf` (`core/lib/utils/dashboards/saved-report.ts:239-245`): the **local** end of a served day — the value
 * this file expects in a share body, computed in the machine's own zone rather than assumed.
 */
const endOfDayIso = (offsetDays: number) => {
	const day = dayOf(offsetDays);
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).toISOString();
};
/**
 * How the panel prints an expiry: `shareExpiryDayOf` turns the served instant into its local day key
 * (`saved-report.ts:248-257`), `dayOfKey` turns that key back into local midnight
 * (`core/lib/utils/dashboards/apps-urls-day.ts:73-75`), and `dayText` prints it with `dateStyle: 'medium'`
 * (`saved-report-share-panel.tsx:27-33`). Replicated, so the expected string is the app's own in any time zone.
 */
const mediumDay = (iso: string) =>
	new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${localDayKeyOf(new Date(iso))}T00:00:00`));

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1088-1096`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

type Refusal = { status: number; message?: string };

/** `ISavedReport` as this file serves it (`core/types/interfaces/…/saved-report`, mirrors what the list answer carries). */
type ServedReport = {
	id: string;
	name: string;
	kind: 'TIME_AND_ACTIVITY';
	periodRule?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	timeZone?: string | null;
	filters?: Record<string, unknown> | null;
	grouping?: string | null;
	includeAmounts?: boolean;
	isShared?: boolean;
	sharedAt?: string | null;
	shareExpiresAt?: string | null;
};

type ServedCall = { method: string; path: string; query: string; body: string | null };

type ServedScript = {
	reports?: ServedReport[];
	/** Items each list page answers, to force the second read (`saved-report.service.ts:66-75` asks `take=200`). */
	pageSize?: number;
	listRefusal?: Refusal;
	/** Served instead of the store, for a malformed list answer. */
	listAnswer?: unknown;
	createRefusal?: Refusal;
	updateRefusal?: Refusal;
	removeRefusal?: Refusal;
	shareRefusal?: Refusal;
	unshareRefusal?: Refusal;
	/** The answer to the labels probe `PUT` of the nil uuid; `delayMs` holds it open (a slow Gauzy). */
	labelsAnswer?: { status: number; message?: string; delayMs?: number };
	/** Holds every `PUT` of a real report open for this long, so the page's own waiting state can be seen. */
	updateDelayMs?: number;
};

type SavedReportsHarness = {
	shapes: () => string[];
	reports: () => ServedReport[];
	countOf: (method: string, path: string) => number;
	bodiesOf: (method: string, path: string) => Record<string, unknown>[];
	reportPathOf: (id: string) => string;
	sharePathOf: (id: string) => string;
	/** The random token this file served for `id`, for a containment check only; never printed. */
	tokenOf: (id: string) => string | undefined;
	/** Takes this stand-in away again, so a later arm on the same page is not answered by an older store. */
	unroute: () => Promise<void>;
};

/**
 * This file's stand-in for the saved-reports API, on the mock origin, because the mock has no handler for any of it
 * (see the header). Store-backed: every list answer is the current store, so a write can be followed by the re-read
 * `onSuccess: readAgain` asks for.
 */
async function serveSavedReports(page: Page, initial: ServedScript): Promise<SavedReportsHarness> {
	const store: ServedReport[] = [...(initial.reports ?? [])];
	const calls: ServedCall[] = [];
	const tokens = new Map<string, string>();
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(REPORTS_ROUTE);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const pathname = url.pathname;
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		calls.push({ method, path: pathname, query: url.searchParams.toString(), body: request.postData() });
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});
		const refuse = (refusal: Refusal) =>
			answer(refusal.status, { statusCode: refusal.status, message: refusal.message ?? 'refused by this file' });
		const bodyOf = () => JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;

		if (pathname === REPORTS_ROUTE && method === 'GET') {
			if (initial.listRefusal) return refuse(initial.listRefusal);
			if (initial.listAnswer !== undefined) return answer(200, initial.listAnswer);
			const skip = Number(url.searchParams.get('skip') ?? '0');
			const take = Number(url.searchParams.get('take') ?? '200');
			const size = Math.min(initial.pageSize ?? take, take);
			return answer(200, { items: store.slice(skip, skip + size), total: store.length });
		}
		if (pathname === REPORTS_ROUTE && method === 'POST') {
			if (initial.createRefusal) return refuse(initial.createRefusal);
			const sent = bodyOf();
			const created: ServedReport = {
				id: `served-${store.length + 1}`,
				name: String(sent.name ?? ''),
				kind: 'TIME_AND_ACTIVITY',
				periodRule: (sent.periodRule as string | null | undefined) ?? null,
				startDate: (sent.startDate as string | null | undefined) ?? null,
				endDate: (sent.endDate as string | null | undefined) ?? null,
				timeZone: (sent.timeZone as string | null | undefined) ?? null,
				filters: (sent.filters as Record<string, unknown> | undefined) ?? {},
				grouping: (sent.grouping as string | undefined) ?? 'date',
				includeAmounts: Boolean(sent.includeAmounts),
				isShared: false,
				sharedAt: null,
				shareExpiresAt: null
			};
			store.push(created);
			return answer(201, created);
		}
		// the labels probe on the nil uuid
		if (pathname === NIL_REPORT_PATH && method === 'PUT') {
			const status = initial.labelsAnswer?.status ?? 404;
			const delayMs = initial.labelsAnswer?.delayMs ?? 0;
			if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
			if (status < 400) return answer(status, { id: 'unexpectedly-found' });
			return answer(status, { statusCode: status, message: initial.labelsAnswer?.message ?? 'Not Found' });
		}
		const shareMatch = /^\/api\/saved-reports\/([^/]+)\/share$/.exec(pathname);
		if (shareMatch) {
			const id = decodeURIComponent(shareMatch[1]);
			if (method === 'POST') {
				if (initial.shareRefusal) return refuse(initial.shareRefusal);
				const sent = bodyOf();
				// this file's own random token: never printed, only compared (`Secrets` above)
				const token = `served-share-${Math.random().toString(36).slice(2, 22)}`;
				tokens.set(id, token);
				const index = store.findIndex((report2) => report2.id === id);
				if (index >= 0) {
					store[index] = {
						...store[index],
						isShared: true,
						sharedAt: new Date().toISOString(),
						shareExpiresAt: (sent.expiresAt as string | null | undefined) ?? null
					};
				}
				// a share answer is the only one that carries a secret; it is written out, never printed
				return answer(200, {
					token,
					sharedAt: store[index]?.sharedAt ?? null,
					shareExpiresAt: store[index]?.shareExpiresAt ?? null
				});
			}
			if (method === 'DELETE') {
				if (initial.unshareRefusal) return refuse(initial.unshareRefusal);
				tokens.delete(id);
				const index = store.findIndex((report2) => report2.id === id);
				// turning a link off clears all three served fields: `saved-report-share-panel.tsx:60-91` reads the state
				// off them, and `LINK_OFF` is what the panel then shows (measured `probe-2.log` Q8 panelAfter).
				if (index >= 0) {
					store[index] = { ...store[index], isShared: false, sharedAt: null, shareExpiresAt: null };
				}
				return answer(204);
			}
		}
		const reportMatch = /^\/api\/saved-reports\/([^/]+)$/.exec(pathname);
		if (reportMatch) {
			const id = decodeURIComponent(reportMatch[1]);
			const index = store.findIndex((report2) => report2.id === id);
			if (method === 'PUT') {
				if (initial.updateDelayMs) await new Promise((resolve) => setTimeout(resolve, initial.updateDelayMs));
				if (initial.updateRefusal) return refuse(initial.updateRefusal);
				if (index < 0) return answer(404, { statusCode: 404, message: 'Not Found' });
				const sent = bodyOf();
				const kept = { ...store[index] };
				for (const [key, value] of Object.entries(sent)) {
					// the widened ids (`api.service.ts:701-709`) are not part of a saved report, so they are not merged
					if (key === 'tenantId' || key === 'organizationId') continue;
					(kept as Record<string, unknown>)[key] = value;
				}
				store[index] = kept;
				return answer(200, kept);
			}
			if (method === 'DELETE') {
				if (initial.removeRefusal) return refuse(initial.removeRefusal);
				store.splice(index, 1);
				return answer(204);
			}
		}
		return answer(599, { message: `this file scripted no answer for ${method} ${pathname}` });
	});

	return {
		shapes: () => calls.map((call) => `${call.method} ${call.path}${call.query ? `?${call.query}` : ''}`),
		reports: () => store,
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		bodiesOf: (method, path) =>
			calls
				.filter((call) => call.method === method && call.path === path && call.body !== null)
				.map((call) => JSON.parse(String(call.body)) as Record<string, unknown>),
		reportPathOf: (id) => `${REPORTS_ROUTE}/${id}`,
		sharePathOf: (id) => `${REPORTS_ROUTE}/${id}/share`,
		tokenOf: (id) => tokens.get(id),
		unroute: () => page.unroute(matcher)
	};
}

const reportOf = (id: string, name: string, overrides: Partial<ServedReport> = {}): ServedReport => ({
	id,
	name,
	kind: 'TIME_AND_ACTIVITY',
	periodRule: 'last7Days',
	startDate: null,
	endDate: null,
	timeZone: 'UTC',
	filters: { teamIds: [], employeeIds: [], projectIds: [], taskIds: [], clientIds: [], billableOnly: false },
	grouping: 'date',
	includeAmounts: false,
	isShared: false,
	sharedAt: null,
	shareExpiresAt: null,
	...overrides
});

/**
 * Every report name this file serves avoids the words the menu's own items are named by (`Rename`, `Delete`,
 * `Update`, `Save`, `Share`), so `getByRole(…, { name, exact: true })` can never hit a row. That was the one probe
 * case `probe-1.log` failed on.
 */

const menuButton = (page: Page) => page.getByRole('button', { name: T.MENU, exact: true });
const saveButton = (page: Page) => page.getByRole('button', { name: T.SAVE, exact: true });
const shareButton = (page: Page) => page.getByRole('button', { name: T.SHARE, exact: true });
const exportButton = (page: Page) => page.getByRole('button', { name: C.EXPORT, exact: true });
const menuItem = (page: Page, name: string) => page.getByRole('menuitem', { name, exact: true });
/**
 * A saved-report row is a `menuitem` named `<name> <period>` (`saved-reports-menu.tsx:36-56`), so its name is matched
 * by an anchored prefix — never `exact`, which would only ever match the menu's own action items, and never a loose
 * substring, which a report named after an action word would collide with.
 */
const reportRow = (page: Page, name: string) =>
	page.getByRole('menuitem', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`) });
const nameField = (page: Page) => page.getByLabel(T.NAME, { exact: true });
const amountsSwitch = (page: Page) => page.getByRole('switch', { name: T.INCLUDE_AMOUNTS, exact: true });
const endDayField = (page: Page) => page.getByLabel(T.ENDS_ON, { exact: true });
const linkField = (page: Page) => page.getByLabel(T.LINK_ADDRESS, { exact: true });
const periodGroup = (page: Page) => page.getByRole('group', { name: EN.dashboard.period.LABEL });
const groupingTab = (page: Page, name: string) =>
	page
		.getByRole('tablist', { name: EN.dashboard.timeActivity.grouping.LABEL })
		.getByRole('tab', { name, exact: true });
/** Scoped to the popover slot: the Next dev overlay adds its own `role="dialog"`, which `[role=dialog]` would match. */
const savePanel = (page: Page) => page.locator('[data-slot="popover-content"]').filter({ hasText: T.SAVE_TITLE });
const sharePanel = (page: Page) => page.locator('[data-slot="popover-content"]').filter({ hasText: T.SHARE_TITLE });

/** An open Base UI menu makes every other trigger unclickable (`data-base-ui-inert` intercepts the pointer). */
const closeMenu = async (page: Page) => {
	if ((await page.getByRole('menu').count()) === 0) return;
	await page.keyboard.press('Escape');
	await expect(page.getByRole('menu')).toHaveCount(0);
};
const openMenu = async (page: Page) => {
	await closeMenu(page);
	await menuButton(page).click();
	await expect(page.getByRole('menu')).toBeVisible();
};
const openSavePopover = async (page: Page) => {
	await closeMenu(page);
	await saveButton(page).click();
	await expect(savePanel(page).first()).toBeVisible();
};
const openSharePopover = async (page: Page) => {
	await closeMenu(page);
	await shareButton(page).click();
	await expect(sharePanel(page).first()).toBeVisible();
};
const closePopover = async (page: Page) => {
	await page.keyboard.press('Escape');
	await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
};
const menuText = async (page: Page) => flat(await page.getByRole('menu').innerText());
const panelText = async (panel: ReturnType<typeof savePanel>) => flat(await panel.first().innerText());
const itemState = async (page: Page, name: string) => {
	const item = menuItem(page, name);
	const count = await item.count();
	if (count === 0) return { count };
	return {
		count,
		dataDisabled: await item.getAttribute('data-disabled'),
		ariaDisabled: await item.getAttribute('aria-disabled')
	};
};
const pickGrouping = async (page: Page, name: string) => {
	const tab = groupingTab(page, name);
	await expect(tab).toBeVisible();
	await tab.click();
	await expect(tab).toHaveAttribute('aria-selected', 'true');
};
/** A web-first wait, so a toast is read once it is on screen rather than the instant a request was recorded. */
const toastCount = async (page: Page, text: string) => {
	await expect(page.getByText(text, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
	return page.getByText(text, { exact: true }).count();
};
/** Opens the report the menu lists, so its action block appears (`saved-reports-menu.tsx:199`). */
const openReport = async (page: Page, name: string) => {
	await openMenu(page);
	await reportRow(page, name).click();
	await expect(page).toHaveURL(new RegExp(`report=[^&]+`));
	await closeMenu(page);
};

/** `saved-report.service.ts` logs a refusal the client's own way; 403 gets its own louder line. */
const armedHttpError = (verb: string, path: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${path} ${status}`;
const armedForbidden = (verb: string, path: string) =>
	`[ERROR] [HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - ${verb} ${path} - Permission Denied`;
/** React's dev-mode store warning, not this page's (`api-tokens-settings-ui.spec.ts:421`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-48`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** How many console lines the shield has collected so far (`playwright/fixtures.ts:85`, `:101-105` append one log). */
const consoleLineCount = (shield: Shield) => shield.consoleErrors().length;
/**
 * Nothing but the armed refusal's own line and the dev-mode noise may reach the console — **of the lines added since
 * `since`**. The shield's log grows for the whole test, so a test that arms several refusals on one page must judge
 * each arm on its own slice, taken before that arm's first request. Measured in `s3-lane-b-savedreports-2.log`: an
 * earlier arm's armed line was still in the log and was read as a finding of the next arm (tests 17 and 21 there).
 */
const consoleFindingsSince = (shield: Shield, since: number, expected: string[] = []) =>
	shield
		.consoleErrors()
		.slice(since)
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));
/** The whole test's console, same excuses. */
const consoleFindings = (shield: Shield, expected: string[] = []) => consoleFindingsSince(shield, 0, expected);

/** The list read the page sends on its own, in full (`saved-report.service.ts:55-63`). */
const listRead = (organizationId: string) => `GET ${REPORTS_ROUTE}?organizationId=${organizationId}&skip=0&take=200`;

/** The path the client's own log line names: no `/api` prefix (`logger-adapter.service.ts:189-200`). */
const consolePath = (path: string) => path.replace(/^\/api/, '');
const NIL_CONSOLE_PATH = consolePath(NIL_REPORT_PATH);

const bootServed = async (page: Page, fixture: BootstrapFixture, script: ServedScript) => {
	const served = await serveSavedReports(page, script);
	await signInAndVisit(page, fixture, APP_REPORTS_PATH);
	await expect(menuButton(page)).toBeVisible();
	await expect(saveButton(page)).toBeVisible();
	await expect(shareButton(page)).toBeVisible();
	return served;
};

test('1 the lane on its own: one read on the mock, an empty menu, nothing on the app origin', async ({
	page,
	fixture,
	mock,
	shield
}) => {
	const appCalls: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === APP_ORIGIN && url.pathname.startsWith('/api/saved-reports')) {
			appCalls.push(`${request.method()} ${url.pathname}`);
		}
	});
	await signInAndVisit(page, fixture, APP_REPORTS_PATH);
	// the block mounts only once the list answered (`time-activity-saved-reports.tsx:263`, `:431-433`)
	await expect(menuButton(page)).toBeVisible();
	await expect(saveButton(page)).toBeVisible();
	await expect(shareButton(page)).toBeVisible();

	await openMenu(page);
	expect(await menuText(page)).toBe(`${T.MENU} ${T.EMPTY}`);
	await expect(page.getByRole('menuitem')).toHaveCount(0);
	await closeMenu(page);

	await openSavePopover(page);
	expect(await panelText(savePanel(page))).toBe(`${T.SAVE_TITLE} ${T.SAVE_HINT} ${T.NAME} ${C.CANCEL} ${T.SAVE}`);
	await closePopover(page);
	await openSharePopover(page);
	// no Cancel here: the save-first share form is `SavedReportNameForm` rendered without `onCancel`
	// (`time-activity-saved-reports.tsx:224-228`), and that form only renders Cancel when `onCancel` is passed
	// (`saved-report-name-form.tsx:97-102`). Measured in `s3-lane-b-savedreports-probe-1.log`: the panel ends
	// `… Name Save` while the Save popover above ends `… Name Cancel Save`.
	expect(await panelText(sharePanel(page))).toBe(`${T.SHARE_TITLE} ${T.SHARE_NEEDS_SAVE} ${T.NAME} ${T.SAVE}`);
	await closePopover(page);

	await expect.poll(async () => (await mock.calls('saved-reports')).length).toBeGreaterThanOrEqual(1);
	const mockReads = (await mock.calls('saved-reports')).map(
		(call) => `${call.method} ${call.path}${call.query ? `?${call.query}` : ''}`
	);
	report('mockOnly', {
		mockReads,
		appOriginSavedReportsCalls: appCalls,
		menuItemCount: await page.getByRole('menuitem').count(),
		consoleFindings: consoleFindings(shield)
	});
	// the mock's own log, not this file's stub: `pagination([])` answered that exact read
	expect(mockReads).toEqual([listRead(fixture.ids.organizationA)]);
	expect(appCalls).toEqual([]);
	expect(consoleFindings(shield)).toEqual([]);
});

test('2 a served list over two pages: both reads, the rows in served order, what each row prints', async ({
	page,
	fixture
}) => {
	const served = await bootServed(page, fixture, {
		pageSize: 2,
		reports: [
			reportOf('alpha', 'Alpha month', { periodRule: 'lastMonth' }),
			reportOf('beta', 'Beta fixed', { periodRule: null, startDate: dayKey(-12), endDate: dayKey(-5) }),
			reportOf('gamma', 'Gamma week', { periodRule: 'thisWeek' })
		]
	});
	await expect.poll(() => served.countOf('GET', REPORTS_ROUTE)).toBe(2);
	await openMenu(page);
	const rows = (await page.getByRole('menuitem').allInnerTexts()).map(flat);
	report('twoPages', { shapes: served.shapes(), rows, menuText: await menuText(page) });
	expect(served.shapes()).toEqual([
		listRead(fixture.ids.organizationA),
		`GET ${REPORTS_ROUTE}?organizationId=${fixture.ids.organizationA}&skip=2&take=200`
	]);
	expect(rows).toEqual([
		`Alpha month ${C.LAST_MONTH}`,
		`Beta fixed ${periodRangeText(-12, -5)}`,
		`Gamma week ${C.THIS_WEEK}`
	]);
	for (const name of ['Alpha month', 'Beta fixed', 'Gamma week']) {
		await expect(page.getByTitle(name)).toHaveCount(1);
	}
	await closeMenu(page);
});

test('3 saving the current view: the name form, its two checks, then the POST body and the new item', async ({
	page,
	fixture
}) => {
	const served = await bootServed(page, fixture, { reports: [] });
	await openSavePopover(page);

	const field = nameField(page);
	const atRest = {
		typeAttribute: await field.getAttribute('type'),
		maxlength: await field.getAttribute('maxlength'),
		autocomplete: await field.getAttribute('autocomplete'),
		placeholder: await field.getAttribute('placeholder'),
		ariaDescribedby: await field.getAttribute('aria-describedby'),
		ariaInvalid: await field.getAttribute('aria-invalid'),
		value: await field.inputValue()
	};
	report('nameFieldAtRest', atRest);
	// `saved-report-name-form.tsx:89` allows 100 + 20; `aria-describedby` appears only under a problem (`:74-92`)
	expect(atRest).toEqual({
		typeAttribute: null,
		maxlength: `${100 + 20}`,
		autocomplete: 'off',
		placeholder: T.NAME_PLACEHOLDER,
		ariaDescribedby: null,
		ariaInvalid: 'false',
		value: ''
	});

	await field.click();
	await field.press('Enter');
	expect(await toastCount(page, T.NAME_REQUIRED)).toBe(1);
	expect(await field.getAttribute('aria-invalid')).toBe('true');
	expect(served.countOf('POST', REPORTS_ROUTE)).toBe(0);
	await expect(savePanel(page).first()).toBeVisible();

	await field.fill('');
	await field.type('x'.repeat(101));
	await field.press('Enter');
	expect(await field.getAttribute('aria-invalid')).toBe('true');
	expect(await page.getByText(T.NAME_TOO_LONG, { exact: true }).count()).toBe(1);
	expect((await field.inputValue()).length).toBe(101);
	expect(served.countOf('POST', REPORTS_ROUTE)).toBe(0);

	const timeZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
	await field.fill('  Probe saved view  ');
	await field.press('Enter');
	await expect.poll(() => served.countOf('POST', REPORTS_ROUTE)).toBe(1);

	const postBody = served.bodiesOf('POST', REPORTS_ROUTE)[0];
	report('savePost', {
		body: postBody,
		shapes: served.shapes(),
		savedToast: await toastCount(page, filled('SAVED', { name: 'Probe saved view' }))
	});
	// `savedReportInputOf` (`saved-report.ts:127-138`) plus the ids the hook adds (`use-saved-reports.ts:77-81`): no `kind`
	expect(postBody).toEqual({
		periodRule: 'last7Days',
		startDate: null,
		endDate: null,
		timeZone,
		filters: { teamIds: [], employeeIds: [], projectIds: [], taskIds: [], clientIds: [], billableOnly: false },
		grouping: 'date',
		name: 'Probe saved view',
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	// `onSuccess: readAgain` (`use-saved-reports.ts:77-81`, `:96-132`): the list is read again after the POST
	await expect.poll(() => served.countOf('GET', REPORTS_ROUTE)).toBe(2);
	await expect(page).toHaveURL(`${APP_ORIGIN}${APP_REPORTS_PATH}?period=last7Days&report=served-1`);
	await openMenu(page);
	report('menuAfterSave', { menu: await menuText(page) });
	expect(await menuText(page)).toBe(
		`${T.MENU} Probe saved view ${C.FILTER_LAST_7_DAYS} Probe saved view ${T.UPDATE} ${T.RENAME} ${T.DELETE}`
	);
	await closeMenu(page);
});

test('4 opening a saved report: the URL it writes, the period and grouping it changes, no extra read', async ({
	page,
	fixture
}) => {
	const served = await bootServed(page, fixture, {
		reports: [
			reportOf('open-member', 'Open member view', {
				periodRule: 'lastMonth',
				grouping: 'member',
				filters: {
					teamIds: [],
					employeeIds: [],
					projectIds: [],
					taskIds: [],
					clientIds: [],
					billableOnly: true
				}
			}),
			reportOf('open-fixed', 'Open fixed view', {
				periodRule: null,
				startDate: dayKey(-12),
				endDate: dayKey(-5),
				grouping: 'project'
			})
		]
	});
	await expect(page).toHaveURL(`${APP_ORIGIN}${APP_REPORTS_PATH}?period=last7Days`);

	await openMenu(page);
	const rowTexts = (await page.getByRole('menuitem').allInnerTexts()).map(flat);
	await reportRow(page, 'Open member view').click();
	await expect(page).toHaveURL(
		`${APP_ORIGIN}${APP_REPORTS_PATH}?period=lastMonth&billable=true&groupBy=member&report=open-member`
	);
	await closeMenu(page);

	const periodText = flat(await periodGroup(page).innerText());
	const tabs = await (async () => {
		const items = await page
			.getByRole('tablist', { name: EN.dashboard.timeActivity.grouping.LABEL })
			.getByRole('tab')
			.all();
		return Promise.all(
			items.map(async (tab) => `${(await tab.innerText()).trim()}|${await tab.getAttribute('aria-selected')}`)
		);
	})();
	report('openedReport', {
		rowTexts,
		periodText,
		tabs,
		billableLine: await page.getByText(EN.timeReports.filters.BILLABLE_ONLY, { exact: true }).count(),
		shapes: served.shapes()
	});
	expect(rowTexts).toEqual([`Open member view ${C.LAST_MONTH}`, `Open fixed view ${periodRangeText(-12, -5)}`]);
	expect(periodText).toContain(C.LAST_MONTH);
	// no `Client` tab for this lane's fixture role (`core/lib/utils/dashboards/time-activity.ts:76-85`)
	expect(tabs).toEqual([
		`${EN.dashboard.timeActivity.grouping.DATE}|false`,
		`${EN.dashboard.timeActivity.grouping.MEMBER}|true`,
		`${EN.dashboard.timeActivity.grouping.PROJECT}|false`,
		`${EN.dashboard.timeActivity.grouping.TASK}|false`,
		`${EN.dashboard.timeActivity.grouping.WEEK}|false`,
		`${EN.timer.labels.LABEL}|false`
	]);
	expect(await page.getByText(EN.timeReports.filters.BILLABLE_ONLY, { exact: true }).count()).toBe(1);
	expect(served.shapes()).toEqual([listRead(fixture.ids.organizationA)]);

	await openMenu(page);
	await reportRow(page, 'Open fixed view').click();
	await expect(page).toHaveURL(
		`${APP_ORIGIN}${APP_REPORTS_PATH}?from=${dayKey(-12)}&to=${dayKey(-5)}&groupBy=project&report=open-fixed`
	);
	await closeMenu(page);
	report('openedFixed', { periodText: flat(await periodGroup(page).innerText()), shapes: served.shapes() });
	expect(flat(await periodGroup(page).innerText())).toContain(periodRangeText(-12, -5));
});

test('5 the action block belongs to the report the link names, and Update is off until the view differs', async ({
	page,
	fixture
}) => {
	const served = await bootServed(page, fixture, {
		reports: [
			reportOf('alpha', 'Alpha month', { periodRule: 'lastMonth' }),
			reportOf('beta', 'Beta plain', { periodRule: 'last7Days', grouping: 'date' })
		]
	});
	await openMenu(page);
	report('menuWithoutActive', { text: await menuText(page), items: await itemState(page, T.RENAME) });
	expect(await menuText(page)).toBe(`${T.MENU} Alpha month ${C.LAST_MONTH} Beta plain ${C.FILTER_LAST_7_DAYS}`);
	expect(await menuItem(page, T.UPDATE).count()).toBe(0);
	expect(await menuItem(page, T.RENAME).count()).toBe(0);
	expect(await menuItem(page, T.DELETE).count()).toBe(0);

	await reportRow(page, 'Beta plain').click();
	await expect(page).toHaveURL(new RegExp('report=beta'));
	await closeMenu(page);
	await openMenu(page);
	const equalView = await itemState(page, T.UPDATE);
	report('updateEqualView', { state: equalView, text: await menuText(page) });
	// `showsSavedView || isUpdating || !canUpdate` (`saved-reports-menu.tsx:115`): Base UI marks it both ways
	expect(equalView).toEqual({ count: 1, dataDisabled: '', ariaDisabled: 'true' });
	expect(await menuItem(page, T.RENAME).count()).toBe(1);
	expect(await menuItem(page, T.DELETE).count()).toBe(1);
	await closeMenu(page);

	await pickGrouping(page, EN.dashboard.timeActivity.grouping.MEMBER);
	await openMenu(page);
	const changedView = await itemState(page, T.UPDATE);
	report('updateChangedView', { state: changedView, shapes: served.shapes() });
	expect(changedView).toEqual({ count: 1, dataDisabled: null, ariaDisabled: null });
	await closeMenu(page);
	// none of the above sent anything (`saved-reports-menu.tsx:115` is a local decision)
	expect(served.shapes()).toEqual([listRead(fixture.ids.organizationA)]);
});

test('6 renaming: the dialog, the PUT body (the name alone), the item after it', async ({ page, fixture, shield }) => {
	const served = await bootServed(page, fixture, { reports: [reportOf('renamed', 'Before rename')] });
	await openReport(page, 'Before rename');
	await openMenu(page);
	await menuItem(page, T.RENAME).click();

	const dialog = page.getByRole('dialog', { name: T.RENAME_TITLE });
	await expect(dialog).toBeVisible();
	const dialogText = flat(await dialog.innerText());
	const initialName = await nameField(page).inputValue();
	report('renameDialog', { dialogText, initialName });
	expect(dialogText).toBe(`${T.RENAME_TITLE} ${T.NAME} ${C.CANCEL} ${T.RENAME}`);
	expect(initialName).toBe('Before rename');

	await nameField(page).fill('After rename');
	await dialog.getByRole('button', { name: T.RENAME, exact: true }).click();
	await expect.poll(() => served.countOf('PUT', served.reportPathOf('renamed'))).toBe(1);
	const putBody = served.bodiesOf('PUT', served.reportPathOf('renamed'))[0];
	report('renamePut', {
		body: putBody,
		renamedToast: await toastCount(page, T.RENAMED),
		storeNames: served.reports().map((r) => r.name)
	});
	// `renameReport` sends `{ id, input: { name } }` (`time-activity-saved-reports.tsx:338`); the ids come from the
	// widening at `api.service.ts:701-709` — finding 2
	expect(putBody).toEqual({
		name: 'After rename',
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	expect(served.reports().map((r) => r.name)).toEqual(['After rename']);
	await expect(dialog).toHaveCount(0);
	await openMenu(page);
	report('menuAfterRename', { menu: await menuText(page) });
	expect(await menuText(page)).toBe(
		`${T.MENU} After rename ${C.FILTER_LAST_7_DAYS} After rename ${T.UPDATE} ${T.RENAME} ${T.DELETE}`
	);
	await closeMenu(page);
	expect(consoleFindings(shield)).toEqual([]);
});

test('7 deleting: the question, a cancel that sends nothing, a confirm that sends the DELETE and drops the item', async ({
	page,
	fixture,
	shield
}) => {
	const served = await bootServed(page, fixture, {
		reports: [reportOf('drop-me', 'Drop me'), reportOf('keep-me', 'Keep me')]
	});
	await openReport(page, 'Drop me');
	await openMenu(page);
	await menuItem(page, T.DELETE).click();

	const question = page.getByRole('alertdialog');
	await expect(question).toBeVisible();
	const questionText = flat(await question.innerText());
	report('deleteQuestion', { questionText });
	expect(questionText).toBe(
		`${filled('DELETE_TITLE', { name: 'Drop me' })} ${T.DELETE_DESCRIPTION} ${C.CANCEL} ${T.DELETE}`
	);

	await question.getByRole('button', { name: C.CANCEL, exact: true }).click();
	await expect(question).toHaveCount(0);
	report('afterCancel', {
		deleteCount: served.countOf('DELETE', served.reportPathOf('drop-me')),
		storeNames: served.reports().map((r) => r.name),
		urlStillNamesIt: /report=drop-me/.test(page.url())
	});
	expect(served.countOf('DELETE', served.reportPathOf('drop-me'))).toBe(0);
	expect(served.reports().map((r) => r.name)).toEqual(['Drop me', 'Keep me']);
	expect(/report=drop-me/.test(page.url())).toBe(true);

	await openMenu(page);
	await menuItem(page, T.DELETE).click();
	await expect(page.getByRole('alertdialog')).toBeVisible();
	await page.getByRole('button', { name: T.DELETE, exact: true }).click();
	await expect.poll(() => served.countOf('DELETE', served.reportPathOf('drop-me'))).toBe(1);
	const deletedToast = await toastCount(page, filled('DELETED', { name: 'Drop me' }));
	// the menu can only show the deleted report gone once the re-read the mutation asked for has landed
	await expect.poll(() => served.countOf('GET', REPORTS_ROUTE)).toBe(2);
	report('afterConfirm', {
		deletedToast,
		shapes: served.shapes(),
		storeNames: served.reports().map((r) => r.name),
		urlAtReread: page.url()
	});
	expect(deletedToast).toBe(1);
	expect(served.shapes()).toEqual([
		listRead(fixture.ids.organizationA),
		`DELETE ${served.reportPathOf('drop-me')}`,
		listRead(fixture.ids.organizationA)
	]);
	expect(served.reports().map((r) => r.name)).toEqual(['Keep me']);
	// The link key is dropped only for the report it names (`time-activity-saved-reports.tsx:356-360`), and the URL
	// rewrite is a React state update that lands *after* the mutation's re-read: measured `probe-5.log` R1 — at the
	// instant the re-read answered the URL was still `…?period=last7Days&report=drop-me`, and 5 s later it was
	// `…?period=last7Days`. So this is the web-first form, which waits for the URL, instead of reading it once.
	await expect(page).toHaveURL(`${APP_ORIGIN}${APP_REPORTS_PATH}?period=last7Days`);
	report('urlAfterDelete', { url: page.url() });
	await openMenu(page);
	report('menuAfterDelete', {
		text: await menuText(page),
		items: (await page.getByRole('menuitem').allInnerTexts()).map(flat)
	});
	expect(await menuText(page)).toBe(`${T.MENU} Keep me ${C.FILTER_LAST_7_DAYS}`);
	await expect(reportRow(page, 'Drop me')).toHaveCount(0);
	await closeMenu(page);
	expect(consoleFindings(shield)).toEqual([]);
});

test('8 turning a link on: the panel at rest, the POST body, the link shown, the copy control', async ({
	page,
	fixture,
	shield
}) => {
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP_ORIGIN });
	const served = await bootServed(page, fixture, { reports: [reportOf('copy-report', 'Copy target')] });
	await openReport(page, 'Copy target');
	await openSharePopover(page);

	const panel = await panelText(sharePanel(page));
	const endDayAtRest = await endDayField(page).inputValue();
	const placeholder = await endDayField(page).getAttribute('placeholder');
	report('sharePanelOff', { panel, endDayAtRest, placeholder });
	expect(panel).toBe(
		[
			T.SHARE_TITLE,
			'Copy target',
			T.SHARE_HINT,
			T.LINK_OFF,
			T.ENDS_ON,
			T.ENDS_ON_HINT,
			T.INCLUDE_AMOUNTS,
			T.INCLUDE_AMOUNTS_HINT,
			T.TURN_ON
		].join(' ')
	);
	// the field is a text input; `min={today}` (`saved-report-share-panel.tsx:105`) goes to the calendar, not to it
	expect(endDayAtRest).toBe('');
	expect(placeholder).toBe(december31Text());

	await sharePanel(page).getByRole('button', { name: T.TURN_ON, exact: true }).click();
	await expect.poll(() => served.countOf('POST', served.sharePathOf('copy-report'))).toBe(1);
	const shareBody = served.bodiesOf('POST', served.sharePathOf('copy-report'))[0];
	report('shareBody', { body: shareBody, bodyKeys: Object.keys(shareBody).sort(), shapes: served.shapes() });
	// `share` posts with `false` (`saved-report.service.ts:96-99`), so this body is not widened
	expect(shareBody).toEqual({ expiresAt: null });
	expect(Object.keys(shareBody)).toEqual(['expiresAt']);

	await expect(linkField(page)).toBeVisible();
	const shown = await linkField(page).inputValue();
	const token = served.tokenOf('copy-report');
	const holdsServedToken = token !== undefined && shown === `${APP_ORIGIN}/shared-report#token=${token}`;
	report('linkShown', {
		holdsServedToken,
		shownLength: shown.length,
		tokenLength: token?.length ?? 0,
		prefixMatches: shown.startsWith(`${APP_ORIGIN}/shared-report#token=`),
		// the token value itself is never printed (`Secrets`)
		tokenPrinted: false
	});
	expect(holdsServedToken).toBe(true);
	expect(shown.startsWith(`${APP_ORIGIN}/shared-report#token=`)).toBe(true);
	expect(shown.length).toBe(`${APP_ORIGIN}/shared-report#token=`.length + (token?.length ?? 0));

	await sharePanel(page).getByRole('button', { name: T.COPY, exact: true }).click();
	report('afterCopy', {
		copied: await toastCount(page, T.COPIED),
		copyFailed: await page.getByText(T.COPY_FAILED, { exact: true }).count(),
		consoleFindings: consoleFindings(shield)
	});
	expect(await page.getByText(T.COPY_FAILED, { exact: true }).count()).toBe(0);
	expect(consoleFindings(shield)).toEqual([]);
	await expect.poll(() => served.countOf('GET', REPORTS_ROUTE)).toBe(2);
	expect(served.shapes()).toEqual([
		listRead(fixture.ids.organizationA),
		`POST ${served.sharePathOf('copy-report')}`,
		listRead(fixture.ids.organizationA)
	]);
});

test('9 a link already on: what the panel says, a typed end day, the amounts switch', async ({
	page,
	fixture,
	shield
}) => {
	const served = await bootServed(page, fixture, {
		reports: [
			reportOf('on-report', 'Link on target', {
				isShared: true,
				sharedAt: dayIso(-1),
				shareExpiresAt: dayIso(6),
				includeAmounts: true
			})
		]
	});
	await openReport(page, 'Link on target');
	await openSharePopover(page);

	const panel = await panelText(sharePanel(page));
	const prefilled = await endDayField(page).inputValue();
	const amountsAtRest = await amountsSwitch(page).getAttribute('aria-checked');
	report('sharePanelOn', { panel, prefilled, amountsAtRest, linkFieldCount: await linkField(page).count() });
	expect(panel).toBe(
		[
			T.SHARE_TITLE,
			'Link on target',
			T.SHARE_HINT,
			T.LINK_HIDDEN,
			filled('EXPIRES', { date: mediumDay(dayIso(6)) }),
			T.ENDS_ON,
			T.ENDS_ON_HINT,
			T.INCLUDE_AMOUNTS,
			T.INCLUDE_AMOUNTS_HINT,
			T.TURN_OFF,
			T.REPLACE,
			T.REPLACE_HINT
		].join(' ')
	);
	// `shareExpiryDayOf(report.shareExpiresAt)` prefills the field (`saved-report-share-panel.tsx:172`)
	expect(prefilled).toBe(dayText(6));
	expect(amountsAtRest).toBe('true');
	// no token is held for a link this file did not make (`use-saved-reports.ts:78-85`)
	expect(await linkField(page).count()).toBe(0);

	await endDayField(page).fill(dayText(9));
	await sharePanel(page).getByRole('button', { name: T.REPLACE, exact: true }).click();
	await expect.poll(() => served.countOf('POST', served.sharePathOf('on-report'))).toBe(1);
	const replaceBody = served.bodiesOf('POST', served.sharePathOf('on-report'))[0];
	report('replaceBody', { body: replaceBody, typedKey: dayKey(9), typedText: dayText(9) });
	// `shareExpiryOf` is the *local* end of the typed day (`saved-report.ts:239-245`); the zone is never assumed
	expect(replaceBody).toEqual({ expiresAt: endOfDayIso(9) });

	await expect(page.getByText(filled('EXPIRES', { date: mediumDay(endOfDayIso(9)) }), { exact: true })).toBeVisible();
	const replacedShown = await linkField(page).inputValue();
	const token = served.tokenOf('on-report');
	report('afterReplace', {
		holdsServedToken: token !== undefined && replacedShown.endsWith(token),
		shownLength: replacedShown.length
	});
	expect(token !== undefined && replacedShown.endsWith(token)).toBe(true);

	await amountsSwitch(page).click();
	await expect.poll(() => served.countOf('PUT', served.reportPathOf('on-report'))).toBe(1);
	const amountsBody = served.bodiesOf('PUT', served.reportPathOf('on-report'))[0];
	report('amountsBody', {
		body: amountsBody,
		ariaCheckedAfter: await amountsSwitch(page).getAttribute('aria-checked')
	});
	// one field asked for, three sent (`api.service.ts:701-709`) — finding 2
	expect(amountsBody).toEqual({
		includeAmounts: false,
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	expect(await amountsSwitch(page).getAttribute('aria-checked')).toBe('false');
	expect(consoleFindings(shield)).toEqual([]);
});

test('10 a link that ended: its own sentence and only Turn link on', async ({ page, fixture }) => {
	const served = await bootServed(page, fixture, {
		reports: [
			reportOf('ended-report', 'Ended target', {
				isShared: false,
				sharedAt: dayIso(-9),
				shareExpiresAt: dayIso(-3)
			})
		]
	});
	await openReport(page, 'Ended target');
	await openSharePopover(page);
	const panel = await panelText(sharePanel(page));
	report('endedPanel', {
		panel,
		turnOn: await sharePanel(page).getByRole('button', { name: T.TURN_ON, exact: true }).count(),
		turnOff: await sharePanel(page).getByRole('button', { name: T.TURN_OFF, exact: true }).count(),
		replace: await sharePanel(page).getByRole('button', { name: T.REPLACE, exact: true }).count(),
		shapes: served.shapes()
	});
	expect(panel).toContain(filled('LINK_ENDED', { date: mediumDay(dayIso(-3)) }));
	expect(await sharePanel(page).getByRole('button', { name: T.TURN_ON, exact: true }).count()).toBe(1);
	expect(await sharePanel(page).getByRole('button', { name: T.TURN_OFF, exact: true }).count()).toBe(0);
	expect(await sharePanel(page).getByRole('button', { name: T.REPLACE, exact: true }).count()).toBe(0);
	await closePopover(page);
});

test('11 turning a link off: the DELETE, its toast, the panel after', async ({ page, fixture, shield }) => {
	const served = await bootServed(page, fixture, {
		reports: [
			reportOf('turn-off', 'Turn off target', { isShared: true, sharedAt: dayIso(-1), shareExpiresAt: dayIso(6) })
		]
	});
	await openReport(page, 'Turn off target');
	await openSharePopover(page);
	await sharePanel(page).getByRole('button', { name: T.TURN_OFF, exact: true }).click();
	await expect.poll(() => served.countOf('DELETE', served.sharePathOf('turn-off'))).toBe(1);
	const turnedOff = await toastCount(page, T.TURNED_OFF);
	// the panel showing `No link is on.` is the re-read's answer, not the DELETE's
	await expect(page.getByText(T.LINK_OFF, { exact: true })).toBeVisible();
	const panel = await panelText(sharePanel(page));
	report('afterTurnOff', {
		turnedOff,
		panel,
		store: served.reports()[0],
		shapes: served.shapes(),
		consoleFindings: consoleFindings(shield)
	});
	expect(turnedOff).toBe(1);
	expect(panel).toBe(
		[
			T.SHARE_TITLE,
			'Turn off target',
			T.SHARE_HINT,
			T.LINK_OFF,
			T.ENDS_ON,
			T.ENDS_ON_HINT,
			T.INCLUDE_AMOUNTS,
			T.INCLUDE_AMOUNTS_HINT,
			T.TURN_ON
		].join(' ')
	);
	expect(served.reports()[0].isShared).toBe(false);
	await expect.poll(() => served.countOf('GET', REPORTS_ROUTE)).toBe(2);
	expect(served.shapes()).toEqual([
		listRead(fixture.ids.organizationA),
		`DELETE ${served.sharePathOf('turn-off')}`,
		listRead(fixture.ids.organizationA)
	]);
	expect(consoleFindings(shield)).toEqual([]);
});

test('12 the link address is only for the visit: after a reload the panel says it is hidden', async ({
	page,
	fixture
}) => {
	// Served with **no** link on: such a panel offers `Turn link on` alone, and a report served already shared offers
	// `Turn off` + `Replace link` and never `Turn link on` (`LinkButtons` `saved-report-share-panel.tsx:118-158`);
	// measured `probe-5.log` R3 `beforeTurnOn {turnOn 1, turnOff 0, replace 0, linkFieldCount 0, hiddenCopy 0}` and R2
	// `controls {turnOn 0, turnOff 1, replace 1, linkFieldCount 0, hiddenCopy 1}`.
	const served = await serveSavedReports(page, { reports: [reportOf('reload-report', 'Reload target')] });
	await signInAndVisit(page, fixture, APP_REPORTS_PATH);
	await expect(menuButton(page)).toBeVisible();
	await openReport(page, 'Reload target');
	await openSharePopover(page);
	const turnOn = sharePanel(page).getByRole('button', { name: T.TURN_ON, exact: true });
	await expect(turnOn).toBeVisible();
	await expect(sharePanel(page).getByRole('button', { name: T.TURN_OFF, exact: true })).toHaveCount(0);
	await turnOn.click();
	await expect(linkField(page)).toBeVisible();
	const token = served.tokenOf('reload-report');
	const shownBefore = await linkField(page).inputValue();
	report('linkMade', {
		tokenLength: token?.length ?? 0,
		shownEndsWithToken: Boolean(token) && shownBefore.endsWith(token ?? ''),
		shareBody: served.bodiesOf('POST', served.sharePathOf('reload-report'))
	});
	expect(token !== undefined && shownBefore.endsWith(token)).toBe(true);
	await closePopover(page);

	await page.reload();
	await expect(menuButton(page)).toBeVisible();
	await openReport(page, 'Reload target');
	await openSharePopover(page);
	// the token lives in a jotai atom only (`saved-report-links.ts`, `use-saved-reports.ts:78-94`): a reload loses it
	await expect(page.getByText(T.LINK_HIDDEN, { exact: true })).toBeVisible();
	const panel = await panelText(sharePanel(page));
	report('afterReload', {
		panel,
		hiddenCopy: await page.getByText(T.LINK_HIDDEN, { exact: true }).count(),
		linkFieldCount: await linkField(page).count(),
		turnOff: await sharePanel(page).getByRole('button', { name: T.TURN_OFF, exact: true }).count(),
		replace: await sharePanel(page).getByRole('button', { name: T.REPLACE, exact: true }).count(),
		isSharedStillTrue: served.reports()[0].isShared === true,
		shapes: served.shapes()
	});
	expect(panel).toContain(T.LINK_HIDDEN);
	expect(await page.getByText(T.LINK_HIDDEN, { exact: true }).count()).toBe(1);
	expect(await linkField(page).count()).toBe(0);
	// the link is still on: only the address this browser was shown is gone (`LinkState` `:83`, `LinkButtons` `:142`,
	// `:152`). Measured `probe-5.log` R3 `afterReload {turnOff 1, replace 1, linkFieldCount 0, hiddenCopy 1}`.
	await expect(sharePanel(page).getByRole('button', { name: T.TURN_OFF, exact: true })).toHaveCount(1);
	await expect(sharePanel(page).getByRole('button', { name: T.REPLACE, exact: true })).toHaveCount(1);
	expect(served.reports()[0].isShared).toBe(true);
});

test('13 the labels probe: what it sends, and that an answer of 200 or 404 keeps the name form', async ({
	page,
	fixture,
	shield
}) => {
	for (const answer of [
		{ status: 200, message: 'unexpectedly found' },
		{ status: 404, message: 'Not Found' }
	]) {
		const served = await bootServed(page, fixture, { reports: [], labelsAnswer: answer });
		await pickGrouping(page, EN.timer.labels.LABEL);
		await expect.poll(() => served.countOf('PUT', NIL_REPORT_PATH), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
		await openSavePopover(page);
		const probeBody = served.bodiesOf('PUT', NIL_REPORT_PATH)[0];
		report(`labelsKept-${answer.status}`, {
			probeBody,
			probeCallCount: served.countOf('PUT', NIL_REPORT_PATH),
			savePanel: await panelText(savePanel(page)),
			nameField: await nameField(page).count()
		});
		// `saved-report.service.ts:111` sends `{ grouping: 'label' }`; the ids come from `api.service.ts:701-709`
		expect(probeBody).toEqual({
			grouping: 'label',
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA
		});
		expect(await nameField(page).count()).toBe(1);
		expect(await page.getByText(T.LABELS_NOT_KEPT, { exact: true }).count()).toBe(0);
		await closePopover(page);
		// a 404 is an answer, not a failure, so it is asked once (`shouldRetryList`, `use-saved-reports.ts:38-45`)
		if (answer.status === 404) expect(served.countOf('PUT', NIL_REPORT_PATH)).toBe(1);
		expect(consoleFindings(shield, [armedHttpError('PUT', NIL_CONSOLE_PATH, 404)])).toEqual([]);
		await served.unroute();
	}
});

test('14 the labels probe still answering: the panel says checking, then keeps the name form', async ({
	page,
	fixture
}) => {
	const served = await bootServed(page, fixture, { reports: [], labelsAnswer: { status: 404, delayMs: 5_000 } });
	await pickGrouping(page, EN.timer.labels.LABEL);
	await openSavePopover(page);
	await expect(page.getByText(T.LABELS_CHECKING, { exact: true })).toBeVisible();
	report('whileChecking', {
		savePanel: await panelText(savePanel(page)),
		nameField: await nameField(page).count(),
		probeCallCount: served.countOf('PUT', NIL_REPORT_PATH)
	});
	expect(await nameField(page).count()).toBe(0);
	await expect.poll(() => served.countOf('PUT', NIL_REPORT_PATH), { timeout: 30_000 }).toBe(1);
	await expect(page.getByText(T.LABELS_CHECKING, { exact: true })).toHaveCount(0);
	await expect(nameField(page)).toBeVisible();
	report('afterAnswer', { savePanel: await panelText(savePanel(page)), nameField: await nameField(page).count() });
});

test('15 the labels probe refused by an older Gauzy: not kept, no name form, Update off with the note', async ({
	page,
	fixture
}) => {
	const served = await bootServed(page, fixture, {
		reports: [reportOf('label-target', 'Label target')],
		labelsAnswer: {
			status: 400,
			message: 'grouping must be one of the following values: date, member, project, client, task, week'
		}
	});
	await openReport(page, 'Label target');
	await pickGrouping(page, EN.timer.labels.LABEL);
	await expect.poll(() => served.countOf('PUT', NIL_REPORT_PATH), { timeout: 30_000 }).toBe(1);
	await openSavePopover(page);
	const panel = await panelText(savePanel(page));
	report('labelsNotKept', { panel, nameField: await nameField(page).count() });
	// `isRefusalOfLabelGrouping` matches `/\bgrouping\b/i` on the message (`saved-report.service.ts:27`, `:40-47`)
	expect(panel).toBe(`${T.SAVE_TITLE} ${T.LABELS_NOT_KEPT}`);
	expect(await nameField(page).count()).toBe(0);
	await closePopover(page);
	await openMenu(page);
	const update = await itemState(page, T.UPDATE);
	report('labelsNotKeptMenu', { menu: await menuText(page), update });
	expect(await menuText(page)).toBe(
		`${T.MENU} Label target ${C.FILTER_LAST_7_DAYS} Label target ${T.UPDATE} ${T.LABELS_NOT_KEPT} ${T.RENAME} ${T.DELETE}`
	);
	expect(update).toEqual({ count: 1, dataDisabled: '', ariaDisabled: 'true' });
	await closeMenu(page);
});

test('16 the labels probe refused for another reason: failed, with its Try again in panel and menu', async ({
	page,
	fixture,
	shield
}) => {
	const served = await bootServed(page, fixture, {
		reports: [reportOf('failed-target', 'Failed target')],
		labelsAnswer: { status: 400, message: 'organizationId must be a UUID' }
	});
	await openReport(page, 'Failed target');
	await pickGrouping(page, EN.timer.labels.LABEL);
	await openSavePopover(page);
	// the query is still retrying (`retry: 3`, `use-saved-report-labels-support.ts:72`): `checking` comes first
	await expect.poll(() => served.countOf('PUT', NIL_REPORT_PATH), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
	await expect(page.getByText(T.LABELS_CHECKING, { exact: true })).toBeVisible();
	report('whileRetrying', {
		savePanel: await panelText(savePanel(page)),
		checkingCopy: await page.getByText(T.LABELS_CHECKING, { exact: true }).count(),
		probeCallCount: served.countOf('PUT', NIL_REPORT_PATH)
	});
	// the failure lands once the retries are spent; that is a wait, not a fixed sleep
	await expect(page.getByText(T.LABELS_CHECK_FAILED, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
	const panel = await panelText(savePanel(page));
	report('labelsFailed', {
		panel,
		nameField: await nameField(page).count(),
		failedCopy: await page.getByText(T.LABELS_CHECK_FAILED, { exact: true }).count(),
		notKeptCopy: await page.getByText(T.LABELS_NOT_KEPT, { exact: true }).count(),
		tryAgainButton: await savePanel(page).getByRole('button', { name: T.TRY_AGAIN, exact: true }).count(),
		// 1 + 3 retries (`retry: 3`): printed, never pinned
		probeCallCount: served.countOf('PUT', NIL_REPORT_PATH)
	});
	expect(panel).toBe(`${T.SAVE_TITLE} ${T.LABELS_CHECK_FAILED} ${T.TRY_AGAIN}`);
	expect(await nameField(page).count()).toBe(0);
	expect(await page.getByText(T.LABELS_NOT_KEPT, { exact: true }).count()).toBe(0);
	await closePopover(page);
	await openMenu(page);
	const update = await itemState(page, T.UPDATE);
	report('labelsFailedMenu', {
		menu: await menuText(page),
		update,
		tryAgainItem: await menuItem(page, T.TRY_AGAIN).count()
	});
	// the note and its Try again sit under the Update item (`saved-reports-menu.tsx:119`, `LabelsNote isInMenu` `:101-104`)
	expect(await menuText(page)).toBe(
		`${T.MENU} Failed target ${C.FILTER_LAST_7_DAYS} Failed target ${T.UPDATE} ${T.LABELS_CHECK_FAILED} ${T.TRY_AGAIN} ${T.RENAME} ${T.DELETE}`
	);
	expect(await menuItem(page, T.TRY_AGAIN).count()).toBe(1);
	expect(update).toEqual({ count: 1, dataDisabled: '', ariaDisabled: 'true' });
	await closeMenu(page);
	expect(consoleFindings(shield, [armedHttpError('PUT', NIL_CONSOLE_PATH, 400)])).toEqual([]);
});

test('17 a save refused (400, 403, 500): the page sentence, the global fallback, nothing stored', async ({
	page,
	fixture,
	shield
}) => {
	const arms: Array<{ status: number; reason: string }> = [
		{ status: 400, reason: REASONS.INVALID },
		{ status: 403, reason: REASONS.PERMISSION },
		{ status: 500, reason: REASONS.SERVER }
	];
	for (const arm of arms) {
		const served = await serveSavedReports(page, {
			reports: [],
			createRefusal: { status: arm.status, message: 'armed' }
		});
		const seenLines = consoleLineCount(shield);
		await signInAndVisit(page, fixture, APP_REPORTS_PATH);
		await expect(saveButton(page)).toBeVisible();
		await openSavePopover(page);
		await nameField(page).fill('Refused create');
		await nameField(page).press('Enter');
		const saveFailed = await toastCount(page, T.SAVE_FAILED);
		report(`create-${arm.status}`, {
			saveFailed,
			fallback: await toastCount(page, EN.toasts.MUTATION_FAILED),
			reason: await page.getByText(arm.reason, { exact: true }).count(),
			popoverOpen: await savePanel(page).count(),
			fieldValue: await nameField(page).inputValue(),
			storeNames: served.reports().map((r) => r.name),
			shapes: served.shapes()
		});
		expect(saveFailed).toBe(1);
		expect(await page.getByText(EN.toasts.MUTATION_FAILED, { exact: true }).count()).toBe(1);
		expect(await page.getByText(arm.reason, { exact: true }).count()).toBe(1);
		// the popover keeps the typed name (`SaveButton` `time-activity-saved-reports.tsx:133-138`)
		expect(await savePanel(page).count()).toBe(1);
		expect(await nameField(page).inputValue()).toBe('Refused create');
		expect(served.reports()).toEqual([]);
		await closePopover(page);
		// only this arm's own console lines are judged (`consoleErrors` is one log for the whole test)
		expect(
			consoleFindingsSince(
				shield,
				seenLines,
				arm.status === 403
					? [armedForbidden('POST', consolePath(REPORTS_ROUTE))]
					: [armedHttpError('POST', consolePath(REPORTS_ROUTE), arm.status)]
			)
		).toEqual([]);
		await served.unroute();
	}
});

test('18 a rename refused (400, 403, 500): the dialog stays open with the typed name, the name unchanged', async ({
	page,
	fixture
}) => {
	const arms: Array<{ status: number; reason: string }> = [
		{ status: 400, reason: REASONS.INVALID },
		{ status: 403, reason: REASONS.PERMISSION },
		{ status: 500, reason: REASONS.SERVER }
	];
	for (const arm of arms) {
		const served = await bootServed(page, fixture, {
			reports: [reportOf('rename-refused', 'Rename refused')],
			updateRefusal: { status: arm.status, message: 'armed' }
		});
		await openReport(page, 'Rename refused');
		await openMenu(page);
		await menuItem(page, T.RENAME).click();
		const dialog = page.getByRole('dialog', { name: T.RENAME_TITLE });
		await expect(dialog).toBeVisible();
		await nameField(page).fill('Renamed anyway');
		await dialog.getByRole('button', { name: T.RENAME, exact: true }).click();
		await expect
			.poll(() => served.countOf('PUT', served.reportPathOf('rename-refused')), { timeout: 30_000 })
			.toBe(1);
		const saveFailed = await toastCount(page, T.SAVE_FAILED);
		report(`rename-${arm.status}`, {
			saveFailed,
			fallback: await toastCount(page, EN.toasts.MUTATION_FAILED),
			reason: await page.getByText(arm.reason, { exact: true }).count(),
			dialogOpen: await dialog.count(),
			fieldValue: await nameField(page).inputValue(),
			storeNames: served.reports().map((r) => r.name)
		});
		expect(saveFailed).toBe(1);
		expect(await page.getByText(arm.reason, { exact: true }).count()).toBe(1);
		expect(await dialog.count()).toBe(1);
		expect(await nameField(page).inputValue()).toBe('Renamed anyway');
		expect(served.reports().map((r) => r.name)).toEqual(['Rename refused']);
		await dialog.getByRole('button', { name: C.CANCEL, exact: true }).click();
		await expect(dialog).toHaveCount(0);
		await served.unroute();
	}
});

test('19 a delete refused (403): its sentence and the fallback, the question closed, nothing changed', async ({
	page,
	fixture,
	shield
}) => {
	const served = await bootServed(page, fixture, {
		reports: [reportOf('keep-403', 'Keep refused')],
		removeRefusal: { status: 403, message: 'armed' }
	});
	await openReport(page, 'Keep refused');
	await openMenu(page);
	await menuItem(page, T.DELETE).click();
	await expect(page.getByRole('alertdialog')).toBeVisible();
	await page.getByRole('button', { name: T.DELETE, exact: true }).click();

	const deleteFailed = await toastCount(page, T.DELETE_FAILED);
	report('deleteRefused', {
		deleteFailed,
		fallback: await toastCount(page, EN.toasts.MUTATION_FAILED),
		reason: await page.getByText(REASONS.PERMISSION, { exact: true }).count(),
		// the question's Action closes it once the answer arrives (`AlertDialogConfirmation`, `:478-487`)
		alertDialogCount: await page.getByRole('alertdialog').count(),
		deleteCount: served.countOf('DELETE', served.reportPathOf('keep-403')),
		storeNames: served.reports().map((r) => r.name),
		urlStillNamesIt: /report=keep-403/.test(page.url()),
		shapes: served.shapes()
	});
	expect(deleteFailed).toBe(1);
	expect(await page.getByText(EN.toasts.MUTATION_FAILED, { exact: true }).count()).toBe(1);
	expect(await page.getByText(REASONS.PERMISSION, { exact: true }).count()).toBe(1);
	expect(await page.getByRole('alertdialog').count()).toBe(0);
	expect(served.reports().map((r) => r.name)).toEqual(['Keep refused']);
	expect(/report=keep-403/.test(page.url())).toBe(true);
	// a failed write gets no re-read: `onSuccess: readAgain` only runs on success (`use-saved-reports.ts:96-132`)
	expect(served.shapes()).toEqual([listRead(fixture.ids.organizationA), `DELETE ${served.reportPathOf('keep-403')}`]);
	await openMenu(page);
	report('menuAfterRefusedDelete', { menu: await menuText(page) });
	expect(await menuText(page)).toBe(
		`${T.MENU} Keep refused ${C.FILTER_LAST_7_DAYS} Keep refused ${T.UPDATE} ${T.RENAME} ${T.DELETE}`
	);
	await closeMenu(page);
	expect(consoleFindings(shield, [armedForbidden('DELETE', consolePath(served.reportPathOf('keep-403')))])).toEqual(
		[]
	);
});

test('20 a share refused (403 names the sign-in, 400 and 500 do not) and an unshare refused', async ({
	page,
	fixture
}) => {
	const arms: Array<{ status: number; refused: number; failed: number }> = [
		{ status: 403, refused: 1, failed: 0 },
		{ status: 400, refused: 0, failed: 1 },
		{ status: 500, refused: 0, failed: 1 }
	];
	for (const arm of arms) {
		const served = await bootServed(page, fixture, {
			reports: [reportOf('share-refused', 'Share refused')],
			shareRefusal: { status: arm.status, message: 'armed' }
		});
		await openReport(page, 'Share refused');
		await openSharePopover(page);
		await sharePanel(page).getByRole('button', { name: T.TURN_ON, exact: true }).click();
		await expect
			.poll(() => served.countOf('POST', served.sharePathOf('share-refused')), { timeout: 30_000 })
			.toBe(1);
		const shareToast = await toastCount(page, arm.refused === 1 ? T.SHARE_REFUSED : T.SHARE_FAILED);
		report(`share-${arm.status}`, {
			shareToast,
			refusedCopy: await page.getByText(T.SHARE_REFUSED, { exact: true }).count(),
			failedCopy: await page.getByText(T.SHARE_FAILED, { exact: true }).count(),
			fallback: await page.getByText(EN.toasts.MUTATION_FAILED, { exact: true }).count(),
			panel: await panelText(sharePanel(page)),
			isSharedStill: served.reports()[0].isShared
		});
		expect(shareToast).toBe(1);
		expect(await page.getByText(T.SHARE_REFUSED, { exact: true }).count()).toBe(arm.refused);
		expect(await page.getByText(T.SHARE_FAILED, { exact: true }).count()).toBe(arm.failed);
		expect(await page.getByText(EN.toasts.MUTATION_FAILED, { exact: true }).count()).toBe(1);
		// the panel is unchanged: still the link-off state (`saved-report-share-panel.tsx:60-91`)
		expect(await panelText(sharePanel(page))).toContain(T.LINK_OFF);
		expect(served.reports()[0].isShared).toBe(false);
		await closePopover(page);
		await served.unroute();
	}

	const unshared = await bootServed(page, fixture, {
		reports: [
			reportOf('unshare-refused', 'Unshare refused', {
				isShared: true,
				sharedAt: dayIso(-1),
				shareExpiresAt: dayIso(6)
			})
		],
		unshareRefusal: { status: 403, message: 'armed' }
	});
	await openReport(page, 'Unshare refused');
	await openSharePopover(page);
	await sharePanel(page).getByRole('button', { name: T.TURN_OFF, exact: true }).click();
	await expect
		.poll(() => unshared.countOf('DELETE', unshared.sharePathOf('unshare-refused')), { timeout: 30_000 })
		.toBe(1);
	report('unshare-403', {
		shareFailed: await toastCount(page, T.SHARE_FAILED),
		turnedOff: await page.getByText(T.TURNED_OFF, { exact: true }).count(),
		isSharedStill: unshared.reports()[0].isShared,
		panel: await panelText(sharePanel(page))
	});
	expect(await page.getByText(T.TURNED_OFF, { exact: true }).count()).toBe(0);
	expect(unshared.reports()[0].isShared).toBe(true);
	expect(await panelText(sharePanel(page))).toContain(T.LINK_HIDDEN);
});

test('21 the list read refused: 404 renders nothing, 403 and 500 say it could not be read', async ({
	page,
	fixture,
	shield
}) => {
	/** The list read as the client's own console line names it: no `/api` prefix, the query it sent. */
	const listConsolePath = `${consolePath(REPORTS_ROUTE)}?organizationId=${fixture.ids.organizationA}&skip=0&take=200`;
	// 404: an API without saved reports (`availabilityOf` `use-saved-reports.ts:25-36`, `:431-433`)
	const unsupported = await serveSavedReports(page, {
		reports: [],
		listRefusal: { status: 404, message: 'no such route' }
	});
	const unsupportedLines = consoleLineCount(shield);
	await signInAndVisit(page, fixture, APP_REPORTS_PATH);
	await expect.poll(() => unsupported.countOf('GET', REPORTS_ROUTE), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
	await expect(menuButton(page)).toHaveCount(0);
	await expect(saveButton(page)).toHaveCount(0);
	await expect(shareButton(page)).toHaveCount(0);
	report('list404', {
		menu: await menuButton(page).count(),
		save: await saveButton(page).count(),
		share: await shareButton(page).count(),
		exportButton: await exportButton(page).count(),
		shapes: unsupported.shapes()
	});
	expect(await exportButton(page).count()).toBe(1);
	// a 404 is asked exactly once and the labels probe is never asked (`shouldRetryList` `:38-45`)
	expect(unsupported.shapes()).toEqual([listRead(fixture.ids.organizationA)]);
	// the client logs the refusal it got, in its own way and without the `/api` prefix
	expect(consoleFindingsSince(shield, unsupportedLines, [armedHttpError('GET', listConsolePath, 404)])).toEqual([]);
	await unsupported.unroute();

	for (const status of [403, 500]) {
		const seenLines = consoleLineCount(shield);
		const served = await bootServed(page, fixture, { reports: [], listRefusal: { status, message: 'armed' } });
		await pickGrouping(page, EN.timer.labels.LABEL);
		await expect.poll(() => served.countOf('PUT', NIL_REPORT_PATH), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
		await openMenu(page);
		const text = await menuText(page);
		report(`list${status}`, {
			menu: await menuButton(page).count(),
			save: await saveButton(page).count(),
			share: await shareButton(page).count(),
			exportButton: await exportButton(page).count(),
			text,
			tryAgainItem: await menuItem(page, T.TRY_AGAIN).count(),
			// the count of a *failed* read is never pinned (`use-saved-reports.ts:38-45` retries a 5xx)
			listReadCount: served.countOf('GET', REPORTS_ROUTE),
			labelsProbeAsked: served.countOf('PUT', NIL_REPORT_PATH),
			shapes: served.shapes()
		});
		expect(await menuButton(page).count()).toBe(1);
		expect(await saveButton(page).count()).toBe(1);
		expect(await shareButton(page).count()).toBe(1);
		expect(await exportButton(page).count()).toBe(1);
		expect(text).toBe(`${T.MENU} ${T.LOAD_ERROR} ${T.TRY_AGAIN}`);
		expect(await menuItem(page, T.TRY_AGAIN).count()).toBe(1);
		// even with no list, a label view still asks Gauzy about labels (unit intent `time-activity-saved-reports.test.tsx:508-523`)
		expect(served.countOf('PUT', NIL_REPORT_PATH)).toBeGreaterThanOrEqual(1);
		await closeMenu(page);
		// only the lines this arm added are judged, each excused by the refusal this arm armed
		expect(
			consoleFindingsSince(
				shield,
				seenLines,
				status === 403
					? [armedForbidden('GET', listConsolePath), armedHttpError('PUT', NIL_CONSOLE_PATH, 404)]
					: [armedHttpError('GET', listConsolePath, 500), armedHttpError('PUT', NIL_CONSOLE_PATH, 404)]
			)
		).toEqual([]);
		await served.unroute();
	}
});

test('22 a list answer that is not a list: the same error state, no page error', async ({ page, fixture, shield }) => {
	const answers: Array<{ label: string; answer: unknown }> = [
		{ label: 'empty object', answer: {} },
		{ label: 'bare array', answer: [reportOf('one', 'One report')] },
		{ label: 'items null', answer: { items: null, total: 2 } }
	];
	for (const arm of answers) {
		const served = await bootServed(page, fixture, { reports: [], listAnswer: arm.answer });
		await expect.poll(() => served.countOf('GET', REPORTS_ROUTE), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
		await openMenu(page);
		const text = await menuText(page);
		report(`malformed-${arm.label}`, {
			text,
			tryAgainItem: await menuItem(page, T.TRY_AGAIN).count(),
			// a 200 whose body is not a list throws in the service (`saved-report.service.ts:70`) and is retried; the
			// count of a failed read is printed, never pinned
			listReadCount: served.countOf('GET', REPORTS_ROUTE),
			pageErrors: shield.pageErrors()
		});
		expect(text).toBe(`${T.MENU} ${T.LOAD_ERROR} ${T.TRY_AGAIN}`);
		expect(await menuItem(page, T.TRY_AGAIN).count()).toBe(1);
		expect(shield.pageErrors()).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
		await closeMenu(page);
		await served.unroute();
	}
});
