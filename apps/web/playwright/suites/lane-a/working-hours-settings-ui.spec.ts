import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on **Settings › Personal › Working hours**
 * (`app/[locale]/(main)/settings/personal/working-hours/page.tsx:1-5` →
 * `core/components/settings/pages/working-hours/working-hours-settings-page.tsx`), on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control `3994`, issuer `3995`, `playwright/test-servers.ts:38`).
 *
 * ## The one thing this page is, and why half of the usual list does not apply
 *
 * **This page never writes to the API.** `settings-working-hours.ts:1-4` says it outright: "Gauzy has no weekly schedule
 * contract (only dated availability records), so the week is kept in this browser, per user." The hook agrees:
 * `use-working-hours.ts:30-39` writes the week with `window.localStorage.setItem` under
 * `ever-teams:working-hours:<userId>` (`settings-working-hours.ts:32,66-68`) and never calls a service. So there is no
 * schedule endpoint to stub, no request body to pin, no server-side refusal to arm for a save, and no list read after a
 * write — and every one of those is asserted here as *absent*, measured, rather than invented. The only API read this page
 * is part of is the shell's read of the signed-in user (`useUserQuery` → `GET /api/user/me`), which the page needs twice:
 * once for `userId` (`working-hours-settings-page.tsx:103-104`) and once for the time-zone note (`:29-47`).
 *
 * ## Where the numbers came from
 *
 * Throwaway probes on this lane, 2026-11-25, every one with no `webServer` in its config:
 * `E:\Coding\.tmp\probe-workinghours\probe.spec.ts` (log `probe-1.log`, then `probe-2.log` 10 cases 9 passed, then
 * `probe-3.log` 7 cases 6 passed) — the row inventory (`A1`), a stored week (`A2`), the problems (`B0`–`B7`), add and
 * remove (`C0`–`C7`), Copy Monday (`D0`, `D1`), the refused save (`E0`–`E3`), the refused user read at 500 and 400
 * (`F500`, `F400`) and which skeleton is on screen while the user read is on its way (`G`);
 * `E:\Coding\.tmp\probe-wh4\probe.spec.ts` (`probe-1.log` 1 passed) — the picker list, a cleared field, a nonsense field,
 * a half-typed field; `E:\Coding\.tmp\probe-wh4\probe2.spec.ts` (`probe-2.log` 1 passed) — the six stored weeks the page
 * cannot use; `E:\Coding\.tmp\probe-wh6\probe.spec.ts` (`probe-1.log` 3 passed) — a save a reload agrees with (`F1`),
 * switching a day that has no range (`F2`) and the armed write refusals of test 10 (`F3`).
 * `E:\Coding\.tmp\probe-wh7\` (logs `probe-1.log` `G1`, `probe-2.log` `H1`, `probe-3.log` `I1`, `probe-4.log` `J1` two
 * passes, `probe-5.log` `K1` two passes) measured the three things the first acceptance run
 * (3 reds 8 green; that log and the re-run after it were overwritten, the third attempt is kept as
 * `E:\Coding\.tmp\s3-lane-a-workinghours-attempt-3.log`) got wrong: the time-zone note is one paragraph holding
 * the sentence *and* the link, so nothing in the page has the sentence alone as its whole text (`G1 byExactText`
 * `sentenceOnly: 0`, `withLink: 1`); switching a day off and back on keeps the stored range **ids** while `isWorking`
 * flips, so the two stored envelopes are not equal (`probe-6.log F2`), and a time field left while its picker list still
 * holds focus is settled back to its old text (`I1 rightAfterFill` cleared the field and read `5:00 PM`, focus on the other
 * field), which is why test 5 leaves the picked field first and then reads the same empty field as empty in both passes
 * (`J1`, `K1`). The re-runs after those three went red twice more, on my own over-pinning and not on the page: an
 * exact-text locator for the time-zone sentence (`s3-lane-a-workinghours-attempt-3.log`: `getByText('Times follow your time zone,
 * UTC.', { exact: true })` → 0, i.e. the `sentenceOnly: 0` the probe had already measured) — test 1 now pins both
 * numbers, **1** element by partial text and **0** by whole text — and a pinned count of the browser's reads of
 * `/api/user/me` (see "Two user reads per page load …" below). Nothing was loosened to pass: each was re-measured and
 * pinned on the number that is stable. Two probe cases were red because of the probe's own helpers, not the page: a Node function referenced
 * inside a `page.evaluate` (`probe-1.log`) and a `JSON.parse` of a value that was never JSON (`probe-3.log` "Unexpected
 * token 'o', \"not json at all\" is not valid JSON"); each of those values was re-measured with a working helper
 * (`probe-wh4/probe2.spec.ts`) before being pinned here.
 *
 * Lead review (2026-11-25): test 11's two fixed sleeps were replaced by web-first waits (the not-loaded title it already
 * waited for, and a poll on the browser's `/api/user/me` count after `Try again`); this file then ran
 * `11 passed (2.2m)` and `11 passed (2.4m)` on lane-a (`E:\Coding\.tmp\s3-lead-workinghours-1.log`, `-2.log`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's own mock, which answers exactly one request this page is part of — `GET /api/user/me` →
 * `data.baseUser` (`cypress/support/mock-gauzy-server.mjs:607`; the fixture user carries `timeZone: 'UTC'` at `:94`) —
 * plus the whole app shell the lane runs. Tests 1-9 run against it with **no stub at all**.
 *
 * **Served by this file:** the refused user read (test 11, `page.route` on the mock origin, 500 then 400) and four write
 * arms (test 10). Both restate the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at
 * `:1097-1101`) because the page sits on `localhost:3031` and the API on `127.0.0.1:3992`. `route.fetch()` is never
 * called, so a request this file answered never reaches the mock — test 11 proves it by measuring that the mock's own log
 * held no 4xx on that path while the stub counted the browser's reads: `probe-3.log F500 mockLoggedUserMe` 2 ×
 * `["GET",200]` against `stubServed: 2` for 2 browser reads, and `s3-lane-a-workinghours-attempt-3.log` `stubServed: 4`
 * against `browserReads: 4` for the 500 phase and `stubServed: 4` against the 4 the 400 phase added (`browserReads: 8` is
 * both phases together — the request listener is not reset between them, `stubServed` is). In every phase so far the stub
 * served exactly the reads that phase added, i.e. no browser read of that path reached the mock and the mock's own reads of
 * it stayed 200 (`core/services/server/requests/auth.ts:141-158`).
 *
 * **A schedule is served through the browser, not through HTTP,** because that is where this page keeps it:
 * `page.evaluate` with `window.localStorage.setItem` and the envelope `serializeWeek` writes
 * (`settings-working-hours.ts:304-307`, `{version: 1, days: […]}`), then `page.reload()`. `hardVisit`
 * (`playwright/helpers.ts:423-432`) clears `localStorage` on every visit, so a seeded week must be seeded *after* the
 * sign-in and read back through a reload — and that same reload is test 4's proof that a saved week is what the next mount
 * shows.
 *
 * **The browser talks to the mock, never to the app's route twins** (the lane's wiring, `playwright/test-servers.ts:104-110`
 * + `core/constants/config/constants.tsx` `GAUZY_API_BASE_SERVER_URL` + `core/services/client/axios.ts` base
 * `<mock origin>/api`, spelled out in `suites/lane-a/README.md:63-72`). `app/api/user/[id]/route.ts` is not in this page's
 * path; test 10 arms `/api/user/<userId>` on the **mock** origin (the path `savePersonalSettings` posts to,
 * `user.service.ts:116-118`) and measures that this page never touches it.
 *
 * **Two user reads per page load do not come from the browser.** `hardVisit` loads two documents (`/` then the route) and
 * the mock logged 3 × `GET /api/user/me 200` for one visit while the browser sent 1 (`probe-2.log P1 mockCalls`,
 * `P1 mockLoggedUserMe`); in test 11 the mock still logged 200s for that path while every browser read of it was answered
 * 500 by this file. A server-side reader of the same path exists (`core/services/server/requests/auth.ts:141-158`), so
 * this file never asserts a mock-log count as "what the page asked": the mock log is used only as "what the mock heard"
 * (and as proof that nothing this file answered reached it). The browser's own reads, from its own `page.on('request')`
 * listener, are not a fixed number either: 1 for one visit in `probe-2.log P1 mockCalls`, 1 in
 * `s3-lane-a-workinghours-1.log` and 2 in `s3-lane-a-workinghours-2.log` for the same visit, because `hardVisit` loads two
 * documents and which of them asks is timing. So
 * tests 1 and 2 pin "at least one read, every one of them exactly `GET /api/user/me?relations[]=role&relations[]=tenant&includeEmployee=true`"
 * and **report** the count their own `MEASURE … browserReads` / `userMeCount` line printed, rather than a count.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/settings/pages/working-hours/working-hours-settings-page.tsx`: day labels through `DAY_LABEL_KEYS`
 *   (`:17-25`) over `common.DAYOFWEEK`; `PREFERENCES_HREF` `:27`; `TimeZoneNote` `:29-47` (nothing until
 *   `timeZoneDisplayOf(user?.timeZone)` answers, `:32-35`); the section `id="working-hours"` with `SECTION_WEEK` +
 *   `SECTION_WEEK_DESCRIPTION` and the `Copy Monday to weekdays` action `:62-72`; the `saveFailed` `Notice` `:73-79`; one
 *   `WorkingDayRow` per day in the hook's order `:80-92`; `TimeZoneNote` `:93`; the `aria-live="polite"` `sr-only` status
 *   paragraph `:94-96`; and the gate `!userId → <WorkingWeekSkeleton />`, `userId → <WorkingWeekEditor key={userId} />`
 *   `:111-112`.
 * - `working-day-row.tsx`: `PROBLEM_KEYS` `:24-27`; `durationOf` `:45-51` (null at 0 seconds); the `SettingsSwitch` + the
 *   `<label htmlFor={switchId}>` `:82-89`; `NOT_WORKING` for a day switched off `:95-99`; the lone `Add hours for <day>`
 *   text button when a working day holds no range `:100-111`; per range the two `TimeField`s `:121-140` (`START_OF` /
 *   `END_OF` names, `aria-invalid` `:136` and `aria-describedby` `:137` only on the end field), the `Remove hours for
 *   <day>` button only while the day holds more than one range `:65,141-152`, the `Add hours for <day>` icon on the last
 *   range `:153-164`, the `role="alert"` problem line `:166-170` and the duration span `:175-177`. `changeTime` `:71-77`
 *   drops a value that does not read as `HH:mm` before the hook ever sees it.
 * - `core/hooks/settings/use-working-hours.ts`: `readWeek` `:19-28` (no stored week → `defaultWorkingWeek()`),
 *   `writeWeek` `:30-39`, `apply` `:46-54` (state first, then the store, `saveFailed = !isSaved`), `setDayWorking`
 *   `:56-59`, `addSlot` `:61`, `removeSlot` `:63-66`, `changeSlot` `:68-72`, `copyMondayToWeekdays` `:74`.
 * - `core/lib/utils/settings-working-hours.ts`: `WEEKDAYS` `:6`, `WORKDAYS` (Mon-Fri) `:10`, `COPIED_WEEKDAYS` (Tue-Fri)
 *   `:12`, `STORAGE_PREFIX` `:32`, `STORAGE_VERSION = 1` `:34`, `DEFAULT_START`/`DEFAULT_END` `:36-38`, `TIME_PATTERN`
 *   `:46`, `createSlotId` (a `crypto.randomUUID()` whenever it exists) `:55-64`, `defaultWorkingWeek` `:74-83`,
 *   `minutesOfTime` `:85-93`, `slotProblemOf` `:125-149` (`order` when the bounds do not read or the end is not after the
 *   start, `overlap` against the ranges above it), `daySeconds` `:151-165` (a problem range counts 0), `nextSlotOf`
 *   `:167-182` (the last end + 1 h, or `09:00-17:00` when that would reach 24 h), `withDayWorking` `:193-202` (ranges are
 *   kept; a day switched on with none gets `09:00-17:00`), `withSlotAdded` `:204-210`, `withSlotRemoved` `:211-216`,
 *   `withSlotChanged` `:218-234` (no validation of its own), `withMondayCopiedToWeekdays` `:237-250` (`isWorking` too, each
 *   copy with a new id), `parseStoredWeek` `:281-302` (only `version: 1`, unknown days dropped, a slot kept when
 *   `id`/`start`/`end` are strings `:257-266`, `isWorking === true` or false `:278`, missing days filled from the defaults
 *   `:298-301`) and `serializeWeek` `:304-307`.
 * - `core/components/common/time-field.tsx`: `DEFAULT_STEP = 15` `:24`, `TimeList` `:43-99` (96 options, none disabled
 *   without `min`/`max`), `TimeField` `:105-127`; `core/components/common/picker-field.tsx`: `send` `:120-124`, `settle`
 *   `:127-140`, `handleChange` `:142-153`, the text input `:209-224` and the picker button `:226-241`;
 *   `core/lib/utils/typed-date-time.ts` `timeWritingOf` / `readTypedTime` (what a field shows is the workspace's clock; what
 *   may be typed is `9:30`, `9.30`, `9h30`, `930`, `9:30 pm`).
 * - `core/components/settings/kit/settings-switch.tsx:33-59` (a `button[role=switch]` with `aria-checked` and no
 *   `aria-label`: its accessible name is the row's `<label for>`), `kit/settings-page.tsx` `SettingsPage` `:24-37` (the
 *   `h1` at `:29`), `SettingsSection` `:55-89` (the `section[id]` with `aria-labelledby` and its `h2`), and
 *   `core/components/common/notice.tsx:29-79` (the refusal notice is an `<output>` card).
 * - `core/lib/utils/dashboard-figures.ts:25-31` `formatHoursLabel` (`8h`, `23h 59m`) as the duration of a row.
 * - The read half: `core/hooks/queries/user-user.query.ts:8-29` (`queryKeys.users.me`, `enabled` only with an access-token
 *   cookie `:9-13,27`, `refetchInterval: (query) => userReadRetryDelay(query.state)` `:23`, `retryOnMount: false` `:26`),
 *   `core/services/client/api/users/user.service.ts:62-101` (the `GET /user/me?relations[]=role&relations[]=tenant&includeEmployee=true`
 *   at `:68-75`), `core/components/layouts/app/authenticator.tsx:88-96` (a failed read replaces the page with
 *   `UserReadFailedState`, a pending read with the layout's own skeleton — `app/[locale]/(main)/settings/layout.tsx:28`
 *   passes `SettingsRouteSkeleton`), `user-read-failed-state.tsx:25-45` (`pages.error.PAGE_NOT_LOADED` at `:31`,
 *   `pages.unauthorized.TRY_AGAIN` at `:39`), `core/lib/utils/user-read-retry.ts:6-8,18-25,50-63` (only 5xx, 408 and 429
 *   are asked again, 5 s doubled up to 60 s, `false` while the user is known) and
 *   `core/lib/utils/error-feedback.ts:22-34,186-197` (the reason sentence under that title).
 * - The clock the fields write: `core/hooks/common/use-workspace-locale.ts` over
 *   `core/stores/user/user-organizations.ts:27-30` (`workspaceClockOf(organization?.timeFormat)`); the lane's mock
 *   organization (`mock-gauzy-server.mjs:86-96`) stores no `timeFormat`, so on this lane the fields write and read 12-hour
 *   text (`9:00 AM`) while the stored value stays `HH:mm`.
 *
 * ## What the probes measured (the assertions are pinned on these)
 *
 * - **The lane as it is** (`probe-3.log A1 default`, `A1 byRole`, `probe-2.log P1`): `h1` "Working hours" with its
 *   description, the section `#working-hours` with `h2` "Week" and `SECTION_WEEK_DESCRIPTION`; **7 rows**, Monday…Sunday in
 *   that order; `aria-checked` `true` × 5 (Mon-Fri) then `false` × 2; every working row `9:00 AM` / `5:00 PM` (placeholder
 *   `9:00 AM`) with duration `8h`, every off row the `Not working` span with no field, no button and an empty duration;
 *   **10** `Pick a time` buttons, **5** `Add hours for <day>`, **0** `Remove hours for <day>`; 7 switches, **0** carrying an
 *   `aria-label`, each named by its row's label (`labelFor === switchId`, e.g. `_r_6_`); the time-zone note once naming
 *   `UTC` together with its link to `/settings/personal/preferences` in the same paragraph (`probe-wh7/probe-1.log G1
 *   paragraphs` — `Times follow your time zone, UTC. Change it in Preferences`, so the sentence matches **1** element by
 *   partial text and **0** by whole text, `G1 byExactText` `sentenceLoose: 1` / `sentenceOnly: 0`); `Copy Monday to
 *   weekdays` once; the `aria-live` `sr-only` paragraph empty; **no** `<output>` card, **no**
 *   aria-hidden skeleton row and **no** storage key yet. The browser's own mock-origin reads for that visit are only ever
 *   `GET /api/user/me?…` (**1** in `probe-2.log P1 mockCalls`, **1** in `s3-lane-a-workinghours-1.log`, **2** in
 *   `s3-lane-a-workinghours-2.log` — see "Two user reads per page load"), and its only writes are the shell's, whose number
 *   varies (`A1 writes` 1 ×
 *   `PUT /api/employee/me/presence`, `A2 writes` presence + 2 × `POST /api/timesheet/statistics/tasks` + presence); console
 *   and page errors empty.
 * - **A week already kept in this browser** (`probe-3.log A2 stored`): Monday's two ranges `07:30-12:00` and `13:00-15:30`
 *   read `7:30 AM 12:00 PM 1:00 PM 3:30 PM`, duration `7h`, **two** `Remove hours for Monday` and one Add; Tuesday off;
 *   Wednesday `00:00-23:59` → `12:00 AM` / `11:59 PM`, `23h 59m`; Thursday working with **no** range → a text button `Add
 *   hours for Thursday` and nothing else in the row; Friday `09:00`/`09:00` → `Ends before it starts.` in a `role="alert"`
 *   with id `<switchId>-f1-error`, `aria-invalid="true"` and `aria-describedby` pointing at it on the end field only, and
 *   no duration; Saturday `10:00-11:00` → `1h`; Sunday off. Nothing was asked of the mock for it, and the stored envelope
 *   came back byte-identical.
 * - **Weeks the page cannot use** (`probe-wh4/probe-2.log`): no key, `not json at all`, `''`, `{"version":2,"days":[…]}`, a
 *   valid object without `version`, a bare array — all six draw the default week and leave the stored text exactly as it
 *   was (the page never repairs what it could not read), with a clean console.
 * - **Switching days** (`probe-6.log F1`, `F2`): a day switched off keeps its ranges in the store (`isWorking: false`, both
 *   `m1` and `m2` intact) and shows `Not working` with no field and no duration; back on, the same ranges with the same ids
 *   (`8:00 AM 10:00 AM 11:00 AM 12:00 PM`, `3h`); a day that had no range gets a fresh `09:00-17:00` with a new uuid
 *   (`9:00 AM` / `5:00 PM`, `8h`); a day that had a range waiting shows that range (`6:00 AM` / `7:00 AM`, `1h`); the
 *   `sr-only` status stayed empty through all of it (`F2 live` `[""]`); and a reload after a save shows the save with the
 *   same envelope (`F1 after toggle` vs `F1 after reload`).
 * - **Times** (`probe-wh4/probe-1.log`, `probe-wh7/probe-4.log`, `probe-5.log`): the list holds **96** options starting at
 *   `12:00 AM` in quarter hours (`optionNamesFirst10`), none disabled, and picking `8:30 AM` stored `08:30` and moved the
 *   duration to `8h 30m`; clearing the end left the field empty while it was focused, stored nothing and drew **no**
 *   problem line (`J1 pass1 cleared` `alerts: 0`), and `5:00 PM` came back when the field was left; `nonsense` sat in the
 *   field, stored nothing, and gave way to `5:00 PM` on leaving; a lone `9` sat in the field as `9`, **was** stored as
 *   `end: "09:00"` with duration `0h 30m`, and read back as `9:00 AM` on leaving — all of that repeated identically in two
 *   passes of the same sequence (`J1 pass1`, `J1 pass2`, then with `expect()` reads `K1 pass1`, `K1 pass2`). Typing a short
 *   form stores it as the time it reads: `8:00 AM` typed into a `09:00` start stored `end: "08:00"` (`probe-3.log B1
 *   order`), `6:15 PM` stored `18:15` (`probe-6.log F3 after edits`), `7:30` stored `07:30` and read back `7:30 AM`.
 * - **Problems** (`probe-3.log B1 order`, `B2 equal`, `B3 repaired`, `B4 added`, `B5 overlap`, `B6 overlap gone`,
 *   `B7 unreadable`): `09:00` with end `08:00` gives `Ends before it starts.` with `aria-invalid="true"` and
 *   `aria-describedby="<switchId>-m1-error"` on the end field (the start field carries neither), no duration, and the pair
 *   **still stored** (`start "09:00"`, `end "08:00"`); `09:00`/`09:00` (equal) is the same line and also stored; adding a
 *   range to a sound `09:00-17:00` yields `5:00 PM` / `6:00 PM` with **2** Remove buttons and no complaint; moving that
 *   second range's start to `10:00 AM` (so it runs `10:00-18:00` inside `09:00-17:00`) puts `Overlaps the hours above.` on
 *   the **second** range's end field (`aria-invalid="true"`, `aria-describedby="<switchId>-<fresh uuid>-error"`) while the
 *   duration stays `8h`, i.e. only the sound range counts (`daySeconds`); narrowing it to `10:00-11:00` keeps both the
 *   overlap and the `8h`; and a stored range whose times do not read (`start "9am"`, `end "oops"`) shows two **empty**
 *   fields, `aria-invalid` on the end, `aria-describedby="<switchId>-bad-error"` and `Ends before it starts.`
 *   (`slotProblemOf` `:127-131`).
 * - **Add and remove** (`probe-3.log C1`, `C2`, `C3`, `C4`, `C5`, `C6`, `C7`): after `22:00-23:00` the new range is
 *   `09:00-17:00`, not `23:00-00:00` (`nextSlotOf` `:174-178`), with duration `9h`; after `23:00-23:59` the same default,
 *   duration `8h 59m`; two ranges offer **2** `Remove hours for Monday` (`C3 removeCount2`) and one offers **0**
 *   (`C5 removeCount1`); removing the first of the two leaves `09:00-17:00` both on screen and in the store; and the lone
 *   `Add hours for Friday` text button on a working day with no range makes `09:00-17:00` (`8h`).
 * - **Copy Monday to weekdays** (`probe-3.log D0 rows`, `D1 rows`, `D1 live`, `D1 stored`): with Monday off and holding
 *   nothing, Tuesday/Wednesday `1h`, Thursday off with a range stored, Friday two ranges `2h`, Saturday and Sunday `1h` →
 *   after the copy, Monday unchanged, **Tuesday to Friday all switched off with no range** (Monday's `isWorking` is copied too,
 *   and only Tue-Fri, `COPIED_WEEKDAYS` `:12`), Saturday and Sunday untouched with their own `10:00-11:00` and their own
 *   ids, and the `sr-only` paragraph reading `Monday's hours now apply from Tuesday to Friday.`
 * - **A save the browser refuses** (`probe-3.log E1 refused`, `E2 second edit`, `E3 after reload`, and `probe-2.log P8`):
 *   with `setItem` made to throw for this key only, the edit still lands on screen (`aria-checked="false"`, `Not working`,
 *   no fields), one `<output>` card appears whose text is `Your hours are not kept` followed directly by `This browser
 *   refused to store them, so the last changes are lost on reload.` (title and body are separate elements, so the card's
 *   `textContent` has no space between them), a second edit keeps that one card, nothing is written to the store, and a
 *   reload shows the default week with no card and no stored key. No console error and no page error: `writeWeek` `:35-38`
 *   swallows the throw.
 * - **Armed refusals** (`probe-6.log F3`): 500 and 400 armed on `/api/working-hours`, `/api/working-hours/week`,
 *   `/api/user/<userId>` and `/api/feature-settings`, then a switch, a typed time and an added range → **nothing reached
 *   any arm** (`refusedArms` `[]`), the only writes the browser made were the shell's presence and statistics posts, the
 *   mock heard no such path (`mockPathsWorking` 0), every edit was stored (`09:00-18:15` Tuesday, `09:00-17:00` +
 *   `17:00-18:00` Wednesday, durations `9h 15m` and `9h`) and console and page errors stayed empty.
 * - **The user read refused** (`probe-3.log F500 body`, `F400 body`, `F500 tryAgain`, `F500 afterTry`, `F400 afterTry`,
 *   `F500 writes`): no `#working-hours`, no switch, no aria-hidden skeleton row, and instead `This page could not be
 *   loaded` with `The server could not complete it. Try again in a moment.` for a 500 and `Some values were not accepted.
 *   Check them and try again.` for a 400, plus exactly one `Try again` button and the dev-only `DEV Query failed
 *   ["users","me"] …` toast; **how many times the browser re-asked is not pinned** — React Query's retry ladder and
 *   `userReadRetryDelay` re-ask on their own and the count moves between runs (`probe-3.log F500 reads` `browserReads: 2` / `stubServed: 2`,
 *   `F500 afterTry` `readsBefore: 2` → `readsAfter: 4`, versus `s3-lane-a-workinghours-attempt-3.log` `browserReads: 4` /
 *   `stubServed: 4` in the 500 phase and 4 more in the 400 phase against `stubServed: 4`), so the test claims only that the stub
 *   served at least one read and that `Try again` — which does not clear the notice — asked again; **no**
 *   write of any kind; only the client's own `[ERROR] [HttpClient] HTTP Error: GET /user/me?… <status>` lines on the
 *   console.
 * - **Which skeleton is on screen** (`probe-3.log G early`, `G later`): with the user read delayed 4 s, `#working-hours`
 *   was 0, switches 0 and aria-hidden `min-h-14` rows 0 while it waited, and the whole week appeared afterwards — the
 *   settings layout draws its own `SettingsRouteSkeleton` there, not this page's.
 *
 * ## Findings
 *
 * - **Nothing about this week ever reaches the API** (measured, untagged): across all eleven tests the browser sent zero
 *   requests to any mock-origin path containing `working` or `hours`, and the mock's own log heard none; the page's save is
 *   `window.localStorage.setItem` (`use-working-hours.ts:33-34`), so `SECTION_WEEK_DESCRIPTION` — "Kept in this browser
 *   only: your team and your other devices do not see these hours yet." (`locales/en.json:5765`) — is the page telling the
 *   person exactly what the code does (`settings-working-hours.ts:1-4`). A refused *server* save is not reachable here:
 *   test 10 arms 500 and 400 on the four paths such a save would use and measures that none is ever hit.
 * - **A pair the page itself calls wrong is still kept** (measured, untagged): `RANGE_ORDER` and `RANGE_OVERLAP` are
 *   rendered from `slotProblemOf` (`working-day-row.tsx:114,166-170`) while `withSlotChanged`
 *   (`settings-working-hours.ts:218-234`) stores whatever `HH:mm` value the field produced — so `09:00`→`08:00` sits in
 *   `localStorage` with the complaint above it, and reload brings it back. What is *not* stored is anything that does not
 *   read as a time at all (`working-day-row.tsx:71-77`): a cleared or nonsense field is dropped before the hook sees it,
 *   which is the same rule the component's own unit test pins (`working-day-row.test.tsx:63-72`, "keeps the slot as it was
 *   when its start is cleared"). `daySeconds` `:156-161` then counts a problematic range as 0, so a day with a bad pair
 *   loses its duration rather than showing a wrong one.
 * - `WorkingHoursSettingsSkeleton` (`working-hours-settings-skeleton.tsx:52-62`) is exported and imported by nothing, and
 *   `WorkingWeekSkeleton` (`:35-50`) never appeared in a single measured load: while the user read is on its way the
 *   settings layout draws its own `SettingsRouteSkeleton` (`authenticator.tsx:93-96`,
 *   `app/[locale]/(main)/settings/layout.tsx:28`), and once a read failed it draws `UserReadFailedState`
 *   (`authenticator.tsx:88-91`), where `#working-hours` was measured 0 (`probe-3.log F500 tryAgain`). The
 *   `!userId → <WorkingWeekSkeleton />` branch at `working-hours-settings-page.tsx:111` is therefore not reachable from a
 *   browser on this lane; hardening it, or deleting it together with the unused export, is an open idea rather than a
 *   defect.
 * - A day switched **off** keeps its ranges (`withDayWorking` `:193-202`, measured with two ranges and with one waiting
 *   range) while a day switched **on** with none gets `09:00-17:00` (`:195-199`). That asymmetry is what the probes printed
 *   and is pinned in test 4; no comment or test states another intent.
 * - `Copy Monday to weekdays` copies `isWorking` as well as the ranges and only to Tuesday-Friday (`COPIED_WEEKDAYS` `:12`,
 *   `:237-250`): measured, a workspace whose Monday is off switches Tue-Fri off too and keeps the weekend; and the sentence
 *   `COPIED_MONDAY` is announced only in the `sr-only` `aria-live` paragraph (`working-hours-settings-page.tsx:94-96`),
 *   never on the button and never as a toast.
 * - The dev-only `[ERROR] [HttpClient] HTTP Error: …` line is printed for every refusal the client was not told to expect
 *   (`core/services/client/api.service.ts` `logError`); only the exact lines of the statuses this file armed are excused
 *   (`armedHttpError`), and every other console error still fails this file, as in
 *   `suites/lane-a/api-tokens-settings-ui.spec.ts:168-174`.
 *
 * ## What this file does not cover
 *
 * - The app's own `app/api/user/**`, `app/api/feature-settings/**` and every other route twin: proxy mode is not in this
 *   lane's browser path (see "Which layer is real"); those twins are pinned by `suites/api`.
 * - A real Gauzy server: nothing here proves what a Gauzy backend would do with these hours, because there is no contract
 *   to send them to (`settings-working-hours.ts:1-4`).
 * - Storage limits beyond the armed refusal: quota exhaustion and a private-mode failure reach the same
 *   `saveFailed → Notice` branch (`use-working-hours.ts:36-38`) and are imitated here by making `setItem` throw.
 * - The `TimeField` list's keyboard walking (ArrowUp/Home/End, `time-field.tsx:37-41`) and its `min`/`max` disabling, which
 *   this page never sets (`working-day-row.tsx:121-140` passes neither): test 5 opens the list, clicks one option and
 *   reports 96 options with none disabled.
 * - 12-hour versus 24-hour writing as such: on this lane the organization stores no `timeFormat`, so the fields write
 *   `9:00 AM`; a workspace storing `timeFormat: 24` would write `09:00` in the same field. Only the stored `HH:mm` values
 *   are pinned as clock-independent here.
 * - Whether a second tab, another device, or a reload after a day has passed changes anything: the week is per `userId` in
 *   one browser (`workingHoursStorageKeyOf` `:66-68`) and is not dated at all.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const PAGE = '/settings/personal/working-hours';
const USER_ME_ROUTE = '/api/user/me';
/** `user.service.ts:68-75` builds this query with `qs`; it is what every refusal line in the probe logs prints. */
const USER_ME_WITH_QUERY = '/user/me?relations%5B0%5D=role&relations%5B1%5D=tenant&includeEmployee=true';
/** What the browser really puts on the wire for it (`probe-2.log P1 mockCalls`, `s3-lane-a-workinghours-attempt-3.log`). */
const USER_ME_SHAPE = 'GET /api/user/me?relations%5B0%5D=role&relations%5B1%5D=tenant&includeEmployee=true';
const PREFERENCES_HREF = '/settings/personal/preferences';
/** `settings-working-hours.ts:32` and `:34`. */
const STORAGE_PREFIX = 'ever-teams:working-hours:';
const STORAGE_VERSION = 1;
/** The only writes a signed-in load of this page causes, both the shell's, and their number varies (`probe-3.log A1 writes`, `A2 writes`). */
const SHELL_WRITE_PATHS = ['/api/employee/me/presence', '/api/timesheet/statistics/tasks'];

/** `locales/en.json`: `settings.workingHours` `:5763-5777`, `settings.entries.workingHours` `:4691-4694`, `common.DAYOFWEEK` `:399-407`, `common.PICK_A_TIME` `:465`, `pages.settingsPersonal.ADD_HOURS_FOR` / `REMOVE_HOURS_FOR` `:2571-2572`, `pages.error.PAGE_NOT_LOADED` `:2815`, `pages.unauthorized.TRY_AGAIN` `:2798`, `toasts.REASONS` `:4324-4336`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: { DAYOFWEEK: Record<string, string>; PICK_A_TIME: string };
	pages: {
		settingsPersonal: { ADD_HOURS_FOR: string; REMOVE_HOURS_FOR: string };
		error: { PAGE_NOT_LOADED: string };
		unauthorized: { TRY_AGAIN: string };
	};
	settings: {
		workingHours: Record<string, string>;
		entries: { workingHours: { TITLE: string; DESCRIPTION: string } };
	};
	toasts: { REASONS: Record<string, string> };
};
const T = EN.settings.workingHours;
const PERSONAL = EN.pages.settingsPersonal;
const PAGE_TITLE = EN.settings.entries.workingHours.TITLE;
const PAGE_DESCRIPTION = EN.settings.entries.workingHours.DESCRIPTION;
const PICK_A_TIME = EN.common.PICK_A_TIME;
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
	(day) => EN.common.DAYOFWEEK[day]
);
const STORAGE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** `START_OF`, `END_OF`, `ADD_HOURS_FOR`, `REMOVE_HOURS_FOR` and `TIME_ZONE_NOTE` are `{day}` / `{position}` / `{zone}` sentences. */
const filled = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), T[key] ?? '');
const addHoursName = (day: string) => PERSONAL.ADD_HOURS_FOR.replace('{day}', day);
const removeHoursName = (day: string) => PERSONAL.REMOVE_HOURS_FOR.replace('{day}', day);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a working-hours] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** `timeWritingOf` on this lane (`en`, no `timeFormat` on the mock's organization): a stored `HH:mm` shown as `9:00 AM`. */
const clockText = (value: string) => {
	const [hours, minutes] = value.split(':').map(Number);
	return new Intl.DateTimeFormat('en', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'UTC',
		numberingSystem: 'latn'
	}).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
};
/** `formatHoursLabel` (`dashboard-figures.ts:25-31`): `8h`, `23h 59m`, and `''` for a day with nothing to count. */
const hoursLabel = (seconds: number) => {
	if (seconds === 0) {
		return '';
	}
	const safeSeconds = Math.max(0, Math.round(seconds));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};
const rangeLabel = (start: string, end: string) => [clockText(start), clockText(end)];
const rangeFields = (values: string[]) => values.map(clockText);
const labelsForRanges = (day: string, count: number) =>
	Array.from({ length: count }, (_, index) => [
		filled('START_OF', { day, position: index + 1 }),
		filled('END_OF', { day, position: index + 1 })
	]).flat();

const storageKeyOf = (userId: string) => `${STORAGE_PREFIX}${userId}`;

type ServedSlot = { id: string; start: string; end: string };
type ServedDay = { day: string; isWorking: boolean; slots: ServedSlot[] };

type RowField = {
	value: string;
	ariaLabel: string | null;
	ariaInvalid: string | null;
	ariaDescribedBy: string | null;
	placeholder: string | null;
};
type RowButton = { ariaLabel: string | null; text: string };
type RowAlert = { text: string; id: string | null };
type WeekRow = {
	label: string | null;
	switchId: string | null;
	labelFor: string | null;
	ariaChecked: string | null;
	notWorking: boolean;
	duration: string;
	fields: RowField[];
	buttons: RowButton[];
	alerts: RowAlert[];
};
type WeekReading = {
	rowCount: number;
	rows: WeekRow[];
	outputs: string[];
	liveTexts: string[];
	skeletonRows: number;
};
type StoredWeek = { raw: string | null; parsed: { version?: number; days?: ServedDay[] } | null };
type DayShape = { day: string; isWorking: boolean; slots: Array<{ start: string; end: string }> };

type BrowserCall = { method: string; path: string; search: string; body: string | null; url: string };

/** Records only: what the browser really sent, split by origin. Nothing here answers a request. */
function recordBrowserCalls(page: Page) {
	const mockCalls: BrowserCall[] = [];
	const appApiCalls: BrowserCall[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		const entry = {
			method: request.method(),
			path: url.pathname,
			search: url.search,
			body: request.postData(),
			url: request.url()
		};
		if (url.origin === MOCK_API_ORIGIN) mockCalls.push(entry);
		else if (url.origin === APP_ORIGIN && url.pathname.startsWith('/api/')) appApiCalls.push(entry);
	});
	const writes = () => mockCalls.filter((call) => call.method !== 'GET' && call.method !== 'OPTIONS');
	const userMeReads = () => mockCalls.filter((call) => call.path === USER_ME_ROUTE);
	return {
		mockCalls,
		appApiCalls,
		shapes: () => mockCalls.map((call) => `${call.method} ${call.path}`),
		writes,
		writeShapes: () => writes().map((call) => `${call.method} ${call.path}`),
		/** Every write that is not one the shell makes on its own. */
		ownWrites: () => writes().filter((call) => !SHELL_WRITE_PATHS.includes(call.path)),
		userMeReads,
		userMeCount: () => userMeReads().length,
		userMeShapes: () => userMeReads().map((call) => `${call.method} ${call.path}${call.search}`),
		/** Any call whose path names this page's subject at all. */
		scheduleCalls: () => mockCalls.filter((call) => /working|hours/i.test(call.path))
	};
}

/** The whole week editor, read out of the DOM. No Node value is referenced inside. */
const readWeek = (page: Page) =>
	page.evaluate((): WeekReading => {
		const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
		const section = document.querySelector('#working-hours');
		const rows = Array.from(section?.querySelectorAll('div') ?? []).filter((node) =>
			(node as HTMLElement).className.includes('min-h-14')
		);
		return {
			rowCount: rows.length,
			rows: rows.map((row) => ({
				label: row.querySelector('label')?.textContent ?? null,
				switchId: row.querySelector('button[role=switch]')?.id ?? null,
				labelFor: row.querySelector('label')?.htmlFor ?? null,
				ariaChecked: row.querySelector('button[role=switch]')?.getAttribute('aria-checked') ?? null,
				notWorking: Array.from(row.querySelectorAll('span')).some((span) => span.textContent === 'Not working'),
				duration: Array.from(row.querySelectorAll(':scope > span'))
					.map((span) => flat(span.textContent ?? ''))
					.join(''),
				fields: Array.from(row.querySelectorAll('input')).map((input) => ({
					value: input.value,
					ariaLabel: input.getAttribute('aria-label'),
					ariaInvalid: input.getAttribute('aria-invalid'),
					ariaDescribedBy: input.getAttribute('aria-describedby'),
					placeholder: input.getAttribute('placeholder')
				})),
				buttons: Array.from(row.querySelectorAll('button'))
					.filter((button) => button.getAttribute('role') !== 'switch')
					.map((button) => ({
						ariaLabel: button.getAttribute('aria-label'),
						text: flat(button.textContent ?? '')
					})),
				alerts: Array.from(row.querySelectorAll('[role=alert]')).map((alert) => ({
					text: alert.textContent ?? '',
					id: alert.id
				}))
			})),
			outputs: Array.from(section?.querySelectorAll('output') ?? []).map((output) =>
				flat(output.textContent ?? '')
			),
			liveTexts: Array.from(document.querySelectorAll('p[aria-live]')).map(
				(paragraph) => paragraph.textContent ?? ''
			),
			skeletonRows: Array.from(document.querySelectorAll('div[aria-hidden="true"]')).filter((node) =>
				(node as HTMLElement).className.includes('min-h-14')
			).length
		};
	});

const rowFields = (page: Page, index: number) => readWeek(page).then((reading) => reading.rows[index]?.fields ?? []);
const rowFieldValues = (page: Page, index: number) =>
	rowFields(page, index).then((fields) => fields.map((f) => f.value));
const rowAlertTexts = (page: Page, index: number) =>
	readWeek(page).then((reading) => reading.rows[index]?.alerts.map((alert) => alert.text) ?? []);
const storedSlot = (page: Page, key: string, dayIndex: number, slotIndex: number) =>
	storedWeek(page, key).then((stored) => stored.parsed?.days?.[dayIndex]?.slots?.[slotIndex]);

const seedRaw = async (page: Page, key: string, raw: string | null) => {
	await page.evaluate(
		({ name, text }: { name: string; text: string | null }) => {
			if (text === null) {
				window.localStorage.removeItem(name);
			} else {
				window.localStorage.setItem(name, text);
			}
		},
		{ name: key, text: raw }
	);
};

const seedWeek = (page: Page, key: string, days: ServedDay[], version = STORAGE_VERSION) =>
	seedRaw(page, key, JSON.stringify({ version, days }));

const storedWeek = (page: Page, key: string) =>
	page.evaluate((name): StoredWeek => {
		const raw = window.localStorage.getItem(name);
		if (raw === null) {
			return { raw, parsed: null };
		}
		try {
			return { raw, parsed: JSON.parse(raw) as { version?: number; days?: ServedDay[] } };
		} catch {
			return { raw, parsed: null };
		}
	}, key);

/** The stored week as a comparable shape: ids of freshly made ranges are random uuids. */
const dayShapes = (parsed: { days?: ServedDay[] } | null): DayShape[] =>
	(parsed?.days ?? []).map((day) => ({
		day: day.day,
		isWorking: day.isWorking,
		slots: (day.slots ?? []).map((slot) => ({ start: slot.start, end: slot.end }))
	}));
const storedShapes = (page: Page, key: string) => storedWeek(page, key).then((stored) => dayShapes(stored.parsed));

const waitWeek = (page: Page) =>
	page.waitForFunction(() => document.querySelector('#working-hours') !== null, undefined, { timeout: 25_000 });

const reloadWeek = async (page: Page) => {
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitWeek(page);
};

/** React's dev-mode store warning, not this page's (see `security-two-factor-ui.spec.ts:226-233`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-45`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`). */
const armedHttpError = (verb: string, url: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${url} ${status}`;

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** The dev-only `DEV Query failed …` / `DEV Mutation failed …` toast of `dev-error-toaster.tsx:17-18`. */
const devToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: 'Copy details' });
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' });

const section = (page: Page) => page.locator('#working-hours');
const text = (scope: Page | ReturnType<typeof section>, value: string) => scope.getByText(value, { exact: true });
const switchOf = (page: Page, day: string) => page.getByRole('switch', { name: day, exact: true });
const startField = (page: Page, day: string, position: number) =>
	page.getByRole('textbox', { name: filled('START_OF', { day, position }), exact: true });
const endField = (page: Page, day: string, position: number) =>
	page.getByRole('textbox', { name: filled('END_OF', { day, position }), exact: true });
const addButton = (page: Page, day: string) => page.getByRole('button', { name: addHoursName(day), exact: true });
const removeButton = (page: Page, day: string) => page.getByRole('button', { name: removeHoursName(day), exact: true });
const pickerButtons = (page: Page) => page.getByRole('button', { name: PICK_A_TIME, exact: true });
const copyMondayButton = (page: Page) => page.getByRole('button', { name: T.COPY_MONDAY, exact: true });

/** `defaultWorkingWeek` (`settings-working-hours.ts:74-83`): the week drawn when nothing usable is stored. */
const DEFAULT_WORKING = [true, true, true, true, true, false, false];
const defaultAriaChecked = () => ['true', 'true', 'true', 'true', 'true', 'false', 'false'];
const defaultDurations = () => STORAGE_DAYS.map((_, index) => (DEFAULT_WORKING[index] ? hoursLabel(8 * 3600) : ''));

/** All seven days every time, so a seeded week is always the whole envelope `serializeWeek` writes. */
const week = (given: Array<Partial<ServedDay> & { day: string }>): ServedDay[] =>
	STORAGE_DAYS.map((day) => {
		const item = given.find((entry) => entry.day === day);
		return { day, isWorking: item?.isWorking ?? false, slots: item?.slots ?? [] };
	});

test.describe('lane-a · Settings › Personal › Working hours: what the page shows, and what the browser really sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ---------------------------------- 1. the lane as its own mock answers it

	test('1 · no stub at all: the week the page builds itself, the one read it is part of, and no write of its own', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);

		// the only read this page is part of is the shell's read of the signed-in user, and it always the same request.
		// How many times the browser sends it per visit varies (1 in `probe-2.log P1 mockCalls`, 1 in
		// `s3-lane-a-workinghours-1.log`, 2 in `s3-lane-a-workinghours-2.log`) because `hardVisit` loads two documents, so
		// only "at least one, all identical" is pinned and the count is reported.
		await expect.poll(calls.userMeCount, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
		expect(
			[...new Set(calls.userMeShapes())],
			'the signed-in user was read through more than one request shape'
		).toEqual([USER_ME_SHAPE]);

		await expect(
			page.getByRole('heading', { level: 1, name: PAGE_TITLE, exact: true }),
			'Working hours rendered no page title'
		).toBeVisible({ timeout: 25_000 });
		await expect(text(page, PAGE_DESCRIPTION)).toBeVisible();
		await expect(section(page)).toBeVisible();
		await expect(section(page).getByRole('heading', { level: 2, name: T.SECTION_WEEK, exact: true })).toBeVisible();
		await expect(text(section(page), T.SECTION_WEEK_DESCRIPTION)).toBeVisible();
		await expect(copyMondayButton(page)).toHaveCount(1);

		const reading = await readWeek(page);
		expect(reading.rowCount, 'the week drew a different number of rows').toBe(7);
		expect(
			reading.rows.map((row) => row.label),
			'the rows are not Monday to Sunday'
		).toEqual(DAY_ORDER);
		expect(
			reading.rows.map((row) => row.ariaChecked),
			'the default week is not Monday to Friday working'
		).toEqual(defaultAriaChecked());
		expect(
			reading.rows.map((row) => row.duration),
			'the default durations are not 8h and then empty'
		).toEqual(defaultDurations());
		for (const [index, row] of reading.rows.entries()) {
			const working = DEFAULT_WORKING[index];
			const day = DAY_ORDER[index];
			expect(
				row.fields.map((field) => field.value),
				`${day}: the default range is not 09:00-17:00`
			).toEqual(working ? rangeLabel('09:00', '17:00') : []);
			expect(
				row.fields.map((field) => field.ariaLabel),
				`${day}: the time fields are not named by START_OF / END_OF`
			).toEqual(working ? labelsForRanges(day, 1) : []);
			expect(
				row.fields.map((field) => field.placeholder),
				`${day}: the placeholder is not 9:00 AM`
			).toEqual(working ? [clockText('09:00'), clockText('09:00')] : []);
			expect(row.notWorking, `${day}: the Not working copy is on the wrong row`).toBe(!working);
			expect(row.alerts, `${day}: the default week drew a problem line`).toEqual([]);
			expect(
				row.buttons.map((button) => button.ariaLabel),
				`${day}: a working row of one range is two pickers and one Add`
			).toEqual(working ? [PICK_A_TIME, PICK_A_TIME, addHoursName(day)] : []);
			// the switch's accessible name is the row's label, not an aria-label (`settings-switch.tsx:33-59`)
			expect(row.labelFor, `${day}: the label does not point at the switch`).toBe(row.switchId);
		}
		await expect(switchOf(page, DAY_ORDER[0])).toHaveCount(1);
		await expect(switchOf(page, DAY_ORDER[5])).toHaveCount(1);
		await expect(section(page).locator('button[role=switch][aria-label]')).toHaveCount(0);
		await expect(pickerButtons(page), 'five working rows hold two time fields each').toHaveCount(10);
		await expect(removeButton(page, DAY_ORDER[0]), 'a lone range offers a Remove').toHaveCount(0);

		// TimeZoneNote (`working-hours-settings-page.tsx:29-47`) over the mock user's `timeZone: 'UTC'`: the sentence and
		// the link are one paragraph (`probe-wh7/probe-1.log G1 paragraphs`), so the only exact match is the whole line
		const timeZoneNote = `${filled('TIME_ZONE_NOTE', { zone: 'UTC' })} ${T.TIME_ZONE_CHANGE}`;
		await expect(
			text(section(page), timeZoneNote),
			'the time-zone note is not one paragraph naming UTC'
		).toHaveCount(1);
		// …which also means the sentence is reachable only by **partial** text: 1 paragraph holds it, 0 elements have it as
		// their whole text (`probe-wh7/probe-1.log G1 byExactText` `sentenceLoose: 1`, `sentenceOnly: 0`, and the same 0 the
		// first acceptance run printed for this very locator)
		await expect(
			page.getByText(filled('TIME_ZONE_NOTE', { zone: 'UTC' })),
			'the time-zone sentence is nowhere in the page'
		).toHaveCount(1);
		await expect(
			text(page, filled('TIME_ZONE_NOTE', { zone: 'UTC' })),
			'an element whose whole text is the sentence alone appeared, so the link is no longer inside that paragraph'
		).toHaveCount(0);
		const timeZoneLink = page.getByRole('link', { name: T.TIME_ZONE_CHANGE, exact: true });
		await expect(timeZoneLink).toHaveCount(1);
		expect(await timeZoneLink.getAttribute('href'), 'the time-zone link does not go to Preferences').toBe(
			PREFERENCES_HREF
		);

		// the page's own status region is there and silent until something is announced
		expect(reading.liveTexts.length, 'no aria-live paragraph was drawn').toBeGreaterThanOrEqual(1);
		expect(reading.liveTexts, 'the status region was not empty on a page that has done nothing').toEqual(['']);
		expect(reading.outputs.length, 'a page that has not saved anything drew a notice').toBe(0);
		expect(reading.skeletonRows, 'the week was ready and still drew a skeleton row').toBe(0);

		// nothing was written to this browser yet: the default week is only React state
		const stored = await storedWeek(page, key);
		expect(stored.raw, 'merely opening the page wrote a week into localStorage').toBeNull();

		// the browser never asked the API about this page's subject, and wrote nothing of its own
		expect(calls.scheduleCalls(), 'the browser asked the API about working hours, which has no API').toEqual([]);
		expect(calls.ownWrites(), 'the page wrote something to the API of its own').toEqual([]);
		expect(
			calls.appApiCalls.filter((call) => /working|hours/i.test(call.path)),
			'the browser went to a Next route for these hours'
		).toEqual([]);
		const logged = await mock.calls(USER_ME_ROUTE);
		expect(logged.length, 'the mock heard no signed-in user read').toBeGreaterThanOrEqual(1);
		expect(
			logged.map((request) => `${request.method} ${request.path} ${request.status}`),
			'the mock did not answer the signed-in user read with 200'
		).toEqual(logged.map(() => `GET ${USER_ME_ROUTE} 200`));
		expect(
			(await mock.requests()).filter((request) => /working|hours/i.test(request.path)),
			'the mock logged a working-hours path'
		).toEqual([]);

		report('lane-as-it-is', {
			browserUserMeReads: calls.userMeCount(),
			browserUserMeShapes: calls.userMeShapes(),
			browserMockCallCount: calls.mockCalls.length,
			browserOwnWrites: calls.ownWrites().map((call) => `${call.method} ${call.path}`),
			browserShellWrites: calls
				.writeShapes()
				.filter((shape) => SHELL_WRITE_PATHS.includes(shape.split(' ')[1] ?? '')),
			appApiCalls: calls.appApiCalls.map((call) => `${call.method} ${call.path}`),
			scheduleCalls: calls.scheduleCalls().length,
			mockLoggedUserMe: logged.map((request) => `${request.method} ${request.path} ${request.status}`),
			mockLoggedWorkingPaths: (await mock.requests()).filter((request) => /working|hours/i.test(request.path))
				.length,
			storedKey: key,
			storedWasWritten: stored.raw !== null,
			rowDurations: reading.rows.map((row) => row.duration),
			pickerButtons: await pickerButtons(page).count(),
			addButtons: await addButton(page, DAY_ORDER[0]).count(),
			removeButtons: await removeButton(page, DAY_ORDER[0]).count(),
			switchesWithAriaLabel: await section(page).locator('button[role=switch][aria-label]').count(),
			timeZoneNoteParagraph: timeZoneNote,
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------- 2. a week this browser already holds

	test('2 · a week already in this browser: the rows read it back exactly, and nothing was asked for it', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);
		const seeded = week([
			{
				day: 'monday',
				isWorking: true,
				slots: [
					{ id: 'm1', start: '07:30', end: '12:00' },
					{ id: 'm2', start: '13:00', end: '15:30' }
				]
			},
			{ day: 'tuesday', isWorking: false },
			{ day: 'wednesday', isWorking: true, slots: [{ id: 'w1', start: '00:00', end: '23:59' }] },
			{ day: 'thursday', isWorking: true },
			{ day: 'friday', isWorking: true, slots: [{ id: 'f1', start: '09:00', end: '09:00' }] },
			{ day: 'saturday', isWorking: true, slots: [{ id: 's1', start: '10:00', end: '11:00' }] },
			{ day: 'sunday', isWorking: false }
		]);
		await seedWeek(page, key, seeded);
		await reloadWeek(page);

		const reading = await readWeek(page);
		expect(reading.rowCount, 'a stored week drew a different number of rows').toBe(7);
		expect(
			reading.rows.map((row) => row.label),
			'a stored week changed the row order'
		).toEqual(DAY_ORDER);
		const rowFor = (day: string) => reading.rows.find((row) => row.label === day);

		const monday = rowFor(DAY_ORDER[0]);
		await expect(switchOf(page, DAY_ORDER[0]), 'Monday is not switched on').toHaveAttribute('aria-checked', 'true');
		expect(
			monday?.fields.map((field) => field.value),
			'Monday did not show its two stored ranges'
		).toEqual(rangeFields(['07:30', '12:00', '13:00', '15:30']));
		expect(
			monday?.fields.map((field) => field.ariaLabel),
			'two ranges are not range 1 and range 2'
		).toEqual(labelsForRanges(DAY_ORDER[0], 2));
		expect(monday?.duration, 'Monday 4h 30m + 2h 30m is not 7h').toBe(hoursLabel(7 * 3600));
		expect(
			monday?.buttons.map((button) => button.ariaLabel),
			'two ranges are each removable and the last one also offers an Add'
		).toEqual([
			PICK_A_TIME,
			PICK_A_TIME,
			removeHoursName(DAY_ORDER[0]),
			PICK_A_TIME,
			PICK_A_TIME,
			removeHoursName(DAY_ORDER[0]),
			addHoursName(DAY_ORDER[0])
		]);

		const tuesday = rowFor(DAY_ORDER[1]);
		await expect(switchOf(page, DAY_ORDER[1]), 'Tuesday is not switched off').toHaveAttribute(
			'aria-checked',
			'false'
		);
		expect(tuesday?.notWorking, 'an off day says nothing').toBe(true);
		expect(tuesday?.fields ?? [], 'an off day still shows a time field').toEqual([]);
		expect(tuesday?.buttons ?? [], 'an off day still offers a button').toEqual([]);
		expect(tuesday?.duration, 'an off day still shows a duration').toBe('');

		const wednesday = rowFor(DAY_ORDER[2]);
		expect(
			wednesday?.fields.map((field) => field.value),
			'a full day was not read back'
		).toEqual(rangeLabel('00:00', '23:59'));
		expect(wednesday?.duration, '00:00-23:59 is not 23h 59m').toBe(hoursLabel(23 * 3600 + 59 * 60));

		const thursday = rowFor(DAY_ORDER[3]);
		await expect(switchOf(page, DAY_ORDER[3]), 'a working day with no range is switched off').toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(thursday?.fields ?? [], 'a working day with no range shows a time field').toEqual([]);
		expect(thursday?.duration, 'a day with no range shows a duration').toBe('');
		expect(thursday?.buttons, 'a working day with no range offers no lone Add').toEqual([
			{ ariaLabel: null, text: addHoursName(DAY_ORDER[3]) }
		]);

		const friday = rowFor(DAY_ORDER[4]);
		const fridayAlertId = `${friday?.switchId ?? ''}-f1-error`;
		expect(friday?.alerts, 'a range that ends where it starts says nothing').toEqual([
			{ text: T.RANGE_ORDER, id: fridayAlertId }
		]);
		expect(friday?.fields[1].ariaInvalid, 'the refused end field is not aria-invalid').toBe('true');
		expect(friday?.fields[1].ariaDescribedBy, 'the refused end field does not name its alert').toBe(fridayAlertId);
		expect(friday?.fields[0].ariaInvalid ?? null, 'the start field was marked instead').toBeNull();
		expect(friday?.fields[0].ariaDescribedBy ?? null, 'the start field names an alert').toBeNull();
		expect(friday?.duration, 'a day whose only range is refused shows a duration').toBe('');

		const saturday = rowFor(DAY_ORDER[5]);
		await expect(switchOf(page, DAY_ORDER[5]), 'a stored working Saturday is switched off').toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(
			saturday?.fields.map((field) => field.value),
			'10:00-11:00 was not read back'
		).toEqual(rangeLabel('10:00', '11:00'));
		expect(saturday?.duration, '10:00-11:00 is not 1h').toBe(hoursLabel(3600));

		// the envelope the page was handed is what it writes back, byte for byte
		const stored = await storedWeek(page, key);
		expect(dayShapes(stored.parsed), 'the page rewrote the week it read').toEqual(dayShapes({ days: seeded }));
		expect(stored.parsed?.version, 'the envelope written back is not version 1').toBe(STORAGE_VERSION);

		// and it came out of this browser, not out of the API: the only reads are for the signed-in user, all identical,
		// and none of them is about hours
		await expect.poll(calls.userMeCount, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
		expect(
			[...new Set(calls.userMeShapes())],
			'the signed-in user was read through more than one request shape'
		).toEqual([USER_ME_SHAPE]);
		expect(calls.scheduleCalls(), 'a stored week was asked for over HTTP').toEqual([]);
		expect(calls.ownWrites(), 'a stored week came with a write').toEqual([]);
		expect(await mock.calls('/working-hours'), 'the mock heard a working-hours path').toEqual([]);
		expect(reading.outputs.length, 'a page that only read its own week drew a notice').toBe(0);

		report('stored-week', {
			storedKey: key,
			storedWasWritten: stored.raw !== null,
			rowFields: reading.rows.map((row) => row.fields.map((field) => field.value)),
			rowDurations: reading.rows.map((row) => row.duration),
			rowAlerts: reading.rows.map((row) => row.alerts.map((alert) => alert.text)),
			rowButtons: reading.rows.map((row) => row.buttons.map((button) => button.ariaLabel ?? button.text)),
			userMeReads: calls.userMeCount(),
			scheduleCalls: calls.scheduleCalls().length,
			ownWrites: calls.ownWrites().length,
			mockWorkingPaths: (await mock.requests()).filter((request) => /working|hours/i.test(request.path)).length,
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 3. stored weeks the page cannot use

	test('3 · a stored week the page cannot use: every one of them falls back to the default, and none is repaired', async ({
		page,
		fixture,
		shield
	}) => {
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);
		const daysOfMonday = week([
			{ day: 'monday', isWorking: true, slots: [{ id: 'z1', start: '06:00', end: '07:00' }] }
		]);
		const cases: Array<{ label: string; raw: string | null }> = [
			{ label: 'no key at all', raw: null },
			{ label: 'not JSON', raw: 'not json at all' },
			{ label: 'an empty string', raw: '' },
			{ label: 'version 2', raw: JSON.stringify({ version: 2, days: daysOfMonday }) },
			{ label: 'a week with no version', raw: JSON.stringify({ days: daysOfMonday }) },
			{ label: 'a bare array', raw: JSON.stringify(daysOfMonday) }
		];

		for (const item of cases) {
			await seedRaw(page, key, item.raw);
			await reloadWeek(page);
			const reading = await readWeek(page);
			expect(reading.rowCount, `${item.label}: the fallback drew a different number of rows`).toBe(7);
			expect(
				reading.rows.map((row) => row.label),
				`${item.label}: the fallback rows are not Monday to Sunday`
			).toEqual(DAY_ORDER);
			expect(
				reading.rows.map((row) => row.ariaChecked),
				`${item.label}: the fallback is not the default week`
			).toEqual(defaultAriaChecked());
			expect(
				reading.rows.map((row) => row.fields.map((field) => field.value)),
				`${item.label}: the fallback ranges are not 09:00-17:00 on Mon-Fri and nothing on the weekend`
			).toEqual(DAY_ORDER.map((_, index) => (DEFAULT_WORKING[index] ? rangeLabel('09:00', '17:00') : [])));
			expect(
				reading.rows.map((row) => row.duration),
				`${item.label}: the fallback durations are wrong`
			).toEqual(defaultDurations());
			// the page never repairs what it could not read: the stored text is left exactly as it was
			expect((await storedWeek(page, key)).raw, `${item.label}: the stored text was replaced`).toBe(item.raw);
			report('unreadable-week', {
				case: item.label,
				storedRaw: item.raw,
				ariaChecked: reading.rows.map((row) => row.ariaChecked),
				fields: reading.rows.map((row) => row.fields.map((field) => field.value)),
				consoleErrors: shield.consoleErrors()
			});
		}

		expect(consoleFindings(shield), 'the fallback cases logged a console error').toEqual([]);
	});

	// ---------------------------------- 4. switching a day off and back on

	test('4 · switching a day off and back on: the copy, the ranges that wait, the fresh range, and a reload that agrees', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);
		const seeded = week([
			{
				day: 'monday',
				isWorking: true,
				slots: [
					{ id: 'm1', start: '08:00', end: '10:00' },
					{ id: 'm2', start: '11:00', end: '12:00' }
				]
			},
			{ day: 'tuesday', isWorking: true },
			{ day: 'wednesday', isWorking: false, slots: [{ id: 'w1', start: '06:00', end: '07:00' }] }
		]);
		await seedWeek(page, key, seeded);
		await reloadWeek(page);

		// off: the row says Not working and holds nothing, the store keeps both ranges
		const mondaySwitch = switchOf(page, DAY_ORDER[0]);
		await mondaySwitch.click();
		await expect(mondaySwitch, 'Monday did not switch off').toHaveAttribute('aria-checked', 'false', {
			timeout: 10_000
		});
		await expect.poll(() => rowFieldValues(page, 0), { timeout: 10_000 }).toEqual([]);
		const offReading = await readWeek(page);
		const offRow = offReading.rows[0];
		expect(offRow.notWorking, 'a day switched off says nothing').toBe(true);
		expect(offRow.fields, 'a day switched off still shows its times').toEqual([]);
		expect(offRow.duration, 'a day switched off still shows a duration').toBe('');
		const storedOff = await storedWeek(page, key);
		expect(dayShapes(storedOff.parsed)[0], 'a day switched off lost its two ranges').toEqual({
			day: 'monday',
			isWorking: false,
			slots: [
				{ start: '08:00', end: '10:00' },
				{ start: '11:00', end: '12:00' }
			]
		});

		// back on: the same two ranges with the same ids (`probe-6.log F2 monday back on`), and the same 3h
		await mondaySwitch.click();
		await expect(mondaySwitch, 'Monday did not switch back on').toHaveAttribute('aria-checked', 'true');
		await expect
			.poll(() => rowFieldValues(page, 0), { timeout: 10_000 })
			.toEqual(rangeFields(['08:00', '10:00', '11:00', '12:00']));
		const backReading = await readWeek(page);
		expect(backReading.rows[0].duration, 'the day that came back does not read 3h').toBe(hoursLabel(3 * 3600));
		const storedBack = await storedWeek(page, key);
		expect(dayShapes(storedBack.parsed)[0], 'Monday back on lost or replaced its ranges').toEqual({
			day: 'monday',
			isWorking: true,
			slots: [
				{ start: '08:00', end: '10:00' },
				{ start: '11:00', end: '12:00' }
			]
		});
		expect(
			(storedBack.parsed?.days?.[0]?.slots ?? []).map((slot) => slot.id),
			'Monday back on got fresh range ids instead of the ones that waited'
		).toEqual(['m1', 'm2']);

		// a day that had no range at all comes back with 09:00-17:00 and a new id
		const tuesdaySwitch = switchOf(page, DAY_ORDER[1]);
		await tuesdaySwitch.click();
		await expect(tuesdaySwitch, 'Tuesday did not switch off').toHaveAttribute('aria-checked', 'false');
		expect((await storedShapes(page, key))[1], 'a day switched off gained a range it never had').toEqual({
			day: 'tuesday',
			isWorking: false,
			slots: []
		});
		await tuesdaySwitch.click();
		await expect(tuesdaySwitch, 'Tuesday did not switch back on').toHaveAttribute('aria-checked', 'true');
		await expect.poll(() => rowFieldValues(page, 1), { timeout: 10_000 }).toEqual(rangeLabel('09:00', '17:00'));
		const tuesdayReading = await readWeek(page);
		expect(tuesdayReading.rows[1].duration, 'the fresh range is not 8h').toBe(hoursLabel(8 * 3600));
		const storedTuesday = (await storedShapes(page, key))[1];
		expect(storedTuesday.slots.length, 'the fresh range is not stored').toBe(1);
		expect(storedTuesday.slots[0], 'the fresh range is not 09:00-17:00').toEqual({ start: '09:00', end: '17:00' });

		// and a day that was switched off with a range waiting shows that range, not a fresh one
		const wednesdaySwitch = switchOf(page, DAY_ORDER[2]);
		await wednesdaySwitch.click();
		await expect(wednesdaySwitch, 'Wednesday did not switch on').toHaveAttribute('aria-checked', 'true');
		await expect.poll(() => rowFieldValues(page, 2), { timeout: 10_000 }).toEqual(rangeLabel('06:00', '07:00'));
		const wednesdayReading = await readWeek(page);
		expect(wednesdayReading.rows[2].duration, 'the waiting range is not 1h').toBe(hoursLabel(3600));

		// switching says nothing out loud: only Copy Monday ever fills the status region
		const afterSwitches = await readWeek(page);
		expect(afterSwitches.liveTexts, 'a switch announced something').toEqual(['']);
		expect(afterSwitches.outputs, 'a switch drew a notice').toEqual([]);
		expect(calls.ownWrites(), 'a switch wrote something to the API').toEqual([]);
		expect(calls.scheduleCalls(), 'a switch touched a working-hours path').toEqual([]);

		// a save is what the next mount reads: reload, and the week is the switched one
		await reloadWeek(page);
		const afterReload = await readWeek(page);
		expect(
			afterReload.rows.map((row) => row.ariaChecked),
			'a reload did not show the switched week'
		).toEqual(['true', 'true', 'true', 'false', 'false', 'false', 'false']);
		expect(afterReload.outputs, 'a reload of a saved week drew a notice').toEqual([]);

		report('switch-days', {
			mondayOffFields: offRow.fields.length,
			mondayOffKeptRanges: dayShapes(storedOff.parsed)[0].slots,
			mondayBackFields: await rowFieldValues(page, 0),
			tuesdayBackFields: await rowFieldValues(page, 1),
			wednesdayBackFields: await rowFieldValues(page, 2),
			liveTexts: afterSwitches.liveTexts,
			ariaCheckedAfterReload: afterReload.rows.map((row) => row.ariaChecked),
			userMeReads: calls.userMeCount(),
			ownWrites: calls.ownWrites().length,
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 5. times: picked, typed, cleared, nonsense, half-written

	test('5 · changing a time: picked in the list, typed, cleared, nonsense and half-written — and what is never stored', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);
		await seedWeek(
			page,
			key,
			week([{ day: 'monday', isWorking: true, slots: [{ id: 'm1', start: '09:00', end: '17:00' }] }])
		);
		await reloadWeek(page);

		const start = startField(page, DAY_ORDER[0], 1);
		const end = endField(page, DAY_ORDER[0], 1);
		await expect(start).toHaveValue(clockText('09:00'));
		await expect(end).toHaveValue(clockText('17:00'));
		expect((await readWeek(page)).rows[0].duration, 'the seeded 09:00-17:00 is not 8h').toBe(hoursLabel(8 * 3600));

		// picked from the app's own list: 96 quarter hours, named in this workspace's clock
		await start.click();
		await start.press('ArrowDown');
		const listbox = page.getByRole('listbox');
		await expect(listbox, 'the picker opened no list').toBeVisible();
		const options = await listbox
			.getByRole('option')
			.evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
		expect(options.length, 'the time list is not the 96 quarter hours TimeList builds').toBe(96);
		expect(options[0], 'the list does not start at midnight').toBe(clockText('00:00'));
		const pickedOption = listbox.getByRole('option', { name: clockText('08:30'), exact: true });
		await expect(pickedOption, 'the list does not offer 8:30 AM').toHaveCount(1);
		await pickedOption.click();
		// leave the field the picker belongs to before touching the next one: with the list still holding focus, the field
		// being left is settled back to its old text (`probe-wh7/probe-3.log I1 rightAfterFill` vs `probe-5.log K1 beforeFill`)
		await page.keyboard.press('Tab');
		await expect(start, 'the picked time did not land in the field').toHaveValue(clockText('08:30'));
		await expect
			.poll(() => storedSlot(page, key, 0, 0).then((slot) => slot?.start), { timeout: 10_000 })
			.toBe('08:30');
		expect((await readWeek(page)).rows[0].duration, '08:30-17:00 is not 8h 30m').toBe(
			hoursLabel(8 * 3600 + 30 * 60)
		);

		// cleared: empty while focused, nothing stored, and the held value returns when the field is left
		await end.click();
		await end.fill('');
		await expect(end, 'a cleared field is not empty while it is focused').toHaveValue('');
		expect(await storedSlot(page, key, 0, 0), 'a cleared time was stored').toMatchObject({
			start: '08:30',
			end: '17:00'
		});
		await page.keyboard.press('Tab');
		await expect(end, 'a cleared field did not give the held value back').toHaveValue(clockText('17:00'));

		// nonsense: it sits in the field, is never stored, and gives way to the held value on leaving
		await end.click();
		await end.fill('nonsense');
		await expect(end, 'a nonsense text did not stay in the field while it was focused').toHaveValue('nonsense');
		expect(await storedSlot(page, key, 0, 0), 'nonsense reached the week').toMatchObject({ end: '17:00' });
		await page.keyboard.press('Tab');
		await expect(end, 'nonsense did not give way to the held value').toHaveValue(clockText('17:00'));

		// a half-written text does read as a time: `9` is stored as 09:00 while the field still shows `9`
		await end.click();
		await end.fill('9');
		await expect(end, 'the half-written text was rewritten before it was left').toHaveValue('9');
		await expect
			.poll(() => storedSlot(page, key, 0, 0).then((slot) => slot?.end), { timeout: 10_000 })
			.toBe('09:00');
		expect((await readWeek(page)).rows[0].duration, '08:30-09:00 is not 0h 30m').toBe(hoursLabel(30 * 60));
		await page.keyboard.press('Tab');
		await expect(end, 'the stored time did not read back as a clock value').toHaveValue(clockText('09:00'));

		// typed short: `7:30` is accepted and stored as the time it reads
		await start.click();
		await start.fill('7:30');
		await expect
			.poll(() => storedSlot(page, key, 0, 0).then((slot) => slot?.start), { timeout: 10_000 })
			.toBe('07:30');
		await page.keyboard.press('Tab');
		await expect(start, '7:30 did not read back as the workspace clock').toHaveValue(clockText('07:30'));

		expect(calls.ownWrites(), 'a typed or picked time wrote something to the API').toEqual([]);
		expect(calls.scheduleCalls(), 'a typed time touched a working-hours path').toEqual([]);
		expect((await readWeek(page)).outputs, 'a time change drew a notice').toEqual([]);

		report('times', {
			initialValues: [clockText('09:00'), clockText('17:00')],
			optionCount: options.length,
			firstOptions: options.slice(0, 4),
			disabledOptions: await listbox.getByRole('option', { disabled: true }).count(),
			storedAfterAllEdits: await storedSlot(page, key, 0, 0),
			ownWrites: calls.ownWrites().length,
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 6. adding and removing a range

	test('6 · adding and removing a range: the new range follows the last, 23:00 starts over, and a lone range cannot be removed', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);
		await seedWeek(
			page,
			key,
			week([
				{ day: 'monday', isWorking: true, slots: [{ id: 'm1', start: '22:00', end: '23:00' }] },
				{ day: 'tuesday', isWorking: true, slots: [{ id: 't1', start: '23:00', end: '23:59' }] }
			])
		);
		await reloadWeek(page);

		// after 22:00-23:00 the new range is the default 09:00-17:00, not 23:00-00:00 (nextSlotOf :174-178)
		await addButton(page, DAY_ORDER[0]).click();
		await expect
			.poll(() => rowFieldValues(page, 0), { timeout: 10_000 })
			.toEqual(rangeFields(['22:00', '23:00', '09:00', '17:00']));
		const mondayAfterAdd = await readWeek(page);
		expect(mondayAfterAdd.rows[0].duration, '1h + 8h is not 9h').toBe(hoursLabel(9 * 3600));
		const storedMonday = (await storedWeek(page, key)).parsed?.days?.[0]?.slots ?? [];
		expect(storedMonday.length, 'the added range is not stored').toBe(2);
		expect(storedMonday[1], 'the range added after a 23:00 end is not 09:00-17:00').toMatchObject({
			start: '09:00',
			end: '17:00'
		});
		expect(storedMonday[1]?.id === 'm1', 'the added range reused the first range id').toBe(false);

		// after 23:00-23:59 the same: a range that would run past midnight starts again at 09:00
		await addButton(page, DAY_ORDER[1]).click();
		await expect
			.poll(() => rowFieldValues(page, 1), { timeout: 10_000 })
			.toEqual(rangeFields(['23:00', '23:59', '09:00', '17:00']));
		const tuesdayAfterAdd = await readWeek(page);
		expect(tuesdayAfterAdd.rows[1].duration, '59m + 8h is not 8h 59m').toBe(hoursLabel(59 * 60 + 8 * 3600));

		// two ranges: each is removable; one range: none is
		await expect(removeButton(page, DAY_ORDER[0]), 'two ranges do not each offer a Remove').toHaveCount(2);
		await removeButton(page, DAY_ORDER[0]).first().click();
		await expect.poll(() => rowFieldValues(page, 0), { timeout: 10_000 }).toEqual(rangeLabel('09:00', '17:00'));
		const mondayAfterRemove = await readWeek(page);
		expect(mondayAfterRemove.rows[0].duration, 'the day left with one range lost its duration').toBe(
			hoursLabel(8 * 3600)
		);
		expect((await storedShapes(page, key))[0].slots, 'the removed range is still stored').toEqual([
			{ start: '09:00', end: '17:00' }
		]);
		await expect(removeButton(page, DAY_ORDER[0]), 'a lone range offers a Remove').toHaveCount(0);

		// a working day with no range offers one Add, as a text button, and it makes 09:00-17:00
		await seedWeek(page, key, week([{ day: 'friday', isWorking: true }]));
		await reloadWeek(page);
		const loneFriday = await readWeek(page);
		expect(loneFriday.rows[4].buttons, 'a working day with no range offers no Add hours button').toEqual([
			{ ariaLabel: null, text: addHoursName(DAY_ORDER[4]) }
		]);
		await addButton(page, DAY_ORDER[4]).click();
		await expect.poll(() => rowFieldValues(page, 4), { timeout: 10_000 }).toEqual(rangeLabel('09:00', '17:00'));
		const fridayAfterAdd = await readWeek(page);
		expect(fridayAfterAdd.rows[4].duration, 'the range the lone Add made is not 8h').toBe(hoursLabel(8 * 3600));

		expect(calls.ownWrites(), 'adding or removing a range wrote something to the API').toEqual([]);
		expect(calls.scheduleCalls(), 'adding or removing a range touched a working-hours path').toEqual([]);

		report('add-remove', {
			mondayAfterAdd: await rowFieldValues(page, 0),
			tuesdayAfterAdd: await rowFieldValues(page, 1),
			removeCountWithTwoRanges: 2,
			removeCountWithOneRange: await removeButton(page, DAY_ORDER[0]).count(),
			loneAddMade: await rowFieldValues(page, 4),
			ownWrites: calls.ownWrites().length,
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 7. the two problems the page finds

	test('7 · Ends before it starts and Overlaps the hours above: the copy, the aria links, the duration it drops, the pair it keeps', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);
		await seedWeek(
			page,
			key,
			week([{ day: 'monday', isWorking: true, slots: [{ id: 'm1', start: '09:00', end: '17:00' }] }])
		);
		await reloadWeek(page);
		const clean = await readWeek(page);
		expect(clean.rows[0].alerts, 'a sound range drew a problem line').toEqual([]);
		expect(clean.rows[0].duration, 'a sound 09:00-17:00 does not read 8h').toBe(hoursLabel(8 * 3600));
		const switchId = clean.rows[0].switchId ?? '';
		const firstAlertId = `${switchId}-m1-error`;

		const end = endField(page, DAY_ORDER[0], 1);
		// an end before the start: the line, the aria links, no duration — and the pair kept
		await end.click();
		await end.fill('8:00 AM');
		await expect.poll(() => rowAlertTexts(page, 0), { timeout: 10_000 }).toEqual([T.RANGE_ORDER]);
		const orderRow = await readWeek(page);
		expect(orderRow.rows[0].alerts, 'the order problem says nothing or names another alert').toEqual([
			{ text: T.RANGE_ORDER, id: firstAlertId }
		]);
		await expect(end, 'the refused end field is not aria-invalid').toHaveAttribute('aria-invalid', 'true');
		await expect(end, 'the refused end field does not name its alert').toHaveAttribute(
			'aria-describedby',
			firstAlertId
		);
		expect(orderRow.rows[0].fields[0].ariaInvalid ?? null, 'the start field was marked instead').toBeNull();
		expect(orderRow.rows[0].fields[0].ariaDescribedBy ?? null, 'the start field names an alert').toBeNull();
		expect(orderRow.rows[0].duration, 'a day whose only range is refused shows a duration').toBe('');
		expect(await storedSlot(page, key, 0, 0), 'the refused pair was not kept').toMatchObject({
			start: '09:00',
			end: '08:00'
		});

		// equal times are the same problem: the end has to be after the start
		await end.click();
		await end.fill('9:00 AM');
		await expect
			.poll(() => storedSlot(page, key, 0, 0).then((slot) => slot?.end), { timeout: 10_000 })
			.toBe('09:00');
		const equalRow = await readWeek(page);
		expect(
			equalRow.rows[0].alerts.map((alert) => alert.text),
			'equal start and end are not the order problem'
		).toEqual([T.RANGE_ORDER]);
		expect(equalRow.rows[0].duration, 'a day of equal times shows a duration').toBe('');

		// repair it, then let a second range overlap the one above it
		await end.click();
		await end.fill('5:00 PM');
		await addButton(page, DAY_ORDER[0]).click();
		await expect
			.poll(() => rowFieldValues(page, 0), { timeout: 10_000 })
			.toEqual(rangeFields(['09:00', '17:00', '17:00', '18:00']));
		const added = await readWeek(page);
		expect(added.rows[0].alerts, 'a sound pair of ranges drew a problem line').toEqual([]);
		const secondStart = startField(page, DAY_ORDER[0], 2);
		await secondStart.click();
		await secondStart.fill('10:00 AM');
		await expect.poll(() => rowAlertTexts(page, 0), { timeout: 10_000 }).toEqual([T.RANGE_OVERLAP]);
		const overlapRow = await readWeek(page);
		expect(
			overlapRow.rows[0].fields[3].ariaInvalid,
			'the overlapping range is not marked on its own end field'
		).toBe('true');
		expect(
			overlapRow.rows[0].fields[2].ariaInvalid ?? null,
			'the overlapping range was marked on its start field'
		).toBeNull();
		expect(overlapRow.rows[0].duration, 'an overlapping pair does not count only the sound range').toBe(
			hoursLabel(8 * 3600)
		);
		expect(await storedSlot(page, key, 0, 1), 'the overlapping pair was not kept').toMatchObject({
			start: '10:00',
			end: '18:00'
		});

		// narrowing the second range does not end the overlap: it still sits inside the range above
		const secondEnd = endField(page, DAY_ORDER[0], 2);
		await secondEnd.click();
		await secondEnd.fill('11:00 AM');
		await expect
			.poll(() => rowFieldValues(page, 0), { timeout: 10_000 })
			.toEqual(rangeFields(['09:00', '17:00', '10:00', '11:00']));
		const narrowed = await readWeek(page);
		expect(
			narrowed.rows[0].alerts.map((alert) => alert.text),
			'a range inside another one stopped complaining'
		).toEqual([T.RANGE_OVERLAP]);
		expect(narrowed.rows[0].duration, 'the day still counts the overlapping range').toBe(hoursLabel(8 * 3600));

		// and a stored range whose times do not read at all is the order problem with two empty fields
		await seedRaw(
			page,
			key,
			JSON.stringify({
				version: STORAGE_VERSION,
				days: [{ day: 'monday', isWorking: true, slots: [{ id: 'bad', start: '9am', end: 'oops' }] }]
			})
		);
		await reloadWeek(page);
		const unreadable = await readWeek(page);
		expect(
			unreadable.rows[0].fields.map((field) => field.value),
			'unreadable times were shown as text'
		).toEqual(['', '']);
		expect(unreadable.rows[0].fields[1].ariaInvalid, 'unreadable times are not aria-invalid').toBe('true');
		expect(unreadable.rows[0].fields[1].ariaDescribedBy, 'unreadable times do not name their alert').toBe(
			`${unreadable.rows[0].switchId ?? ''}-bad-error`
		);
		expect(
			unreadable.rows[0].alerts.map((alert) => alert.text),
			'unreadable times say something else'
		).toEqual([T.RANGE_ORDER]);
		expect(unreadable.rows[0].duration, 'a day of unreadable times shows a duration').toBe('');

		expect(calls.ownWrites(), 'a problem the page found was sent to the API').toEqual([]);
		expect(calls.scheduleCalls(), 'a problem the page found touched a working-hours path').toEqual([]);

		report('problems', {
			orderCopy: T.RANGE_ORDER,
			overlapCopy: T.RANGE_OVERLAP,
			durationWithOverlap: hoursLabel(8 * 3600),
			orderFieldValues: orderRow.rows[0].fields.map((field) => field.value),
			unreadableFieldValues: unreadable.rows[0].fields.map((field) => field.value),
			ownWrites: calls.ownWrites().length,
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error while it complained').toEqual([]);
	});

	// ---------------------------------- 8. Copy Monday to weekdays

	test('8 · Copy Monday to weekdays: Tue to Fri take Monday, including whether it is a working day, and the weekend does not', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);
		await seedWeek(
			page,
			key,
			week([
				{ day: 'monday', isWorking: false },
				{ day: 'tuesday', isWorking: true, slots: [{ id: 't1', start: '10:00', end: '11:00' }] },
				{ day: 'wednesday', isWorking: true, slots: [{ id: 'w1', start: '10:00', end: '11:00' }] },
				{ day: 'thursday', isWorking: false, slots: [{ id: 'th1', start: '10:00', end: '11:00' }] },
				{
					day: 'friday',
					isWorking: true,
					slots: [
						{ id: 'f1', start: '10:00', end: '11:00' },
						{ id: 'f2', start: '12:00', end: '13:00' }
					]
				},
				{ day: 'saturday', isWorking: true, slots: [{ id: 's1', start: '10:00', end: '11:00' }] },
				{ day: 'sunday', isWorking: true, slots: [{ id: 'u1', start: '10:00', end: '11:00' }] }
			])
		);
		await reloadWeek(page);
		const before = await readWeek(page);
		expect(
			before.rows.map((row) => row.duration),
			'the stored week did not draw the durations it holds'
		).toEqual([
			'',
			hoursLabel(3600),
			hoursLabel(3600),
			'',
			hoursLabel(2 * 3600),
			hoursLabel(3600),
			hoursLabel(3600)
		]);

		await copyMondayButton(page).click();
		await expect
			.poll(() => readWeek(page).then((reading) => reading.rows.map((row) => row.ariaChecked)), {
				timeout: 10_000
			})
			.toEqual(['false', 'false', 'false', 'false', 'false', 'true', 'true']);
		const after = await readWeek(page);
		expect(
			after.rows.map((row) => row.fields.map((field) => field.value)),
			'the copied week still shows the old ranges'
		).toEqual(DAY_ORDER.map((_, index) => (index === 5 || index === 6 ? rangeLabel('10:00', '11:00') : [])));
		expect(
			after.rows.map((row) => row.duration),
			'the copied week still shows the old durations'
		).toEqual(['', '', '', '', '', hoursLabel(3600), hoursLabel(3600)]);

		// Monday himself is untouched and the weekend keeps its own ranges with its own ids
		const stored = await storedWeek(page, key);
		const shapes = dayShapes(stored.parsed);
		expect(shapes[0], 'Monday was changed by copying himself').toEqual({
			day: 'monday',
			isWorking: false,
			slots: []
		});
		expect(shapes.slice(1, 5), 'Tue-Fri did not take Monday, who holds nothing').toEqual(
			['tuesday', 'wednesday', 'thursday', 'friday'].map((day) => ({ day, isWorking: false, slots: [] }))
		);
		expect(shapes[5], 'Saturday was copied').toEqual({
			day: 'saturday',
			isWorking: true,
			slots: [{ start: '10:00', end: '11:00' }]
		});
		expect(shapes[6], 'Sunday was copied').toEqual({
			day: 'sunday',
			isWorking: true,
			slots: [{ start: '10:00', end: '11:00' }]
		});

		// the only announcement is the sr-only status paragraph
		expect(after.liveTexts, 'the copy was announced somewhere else than the status region').toEqual([
			T.COPIED_MONDAY
		]);
		expect(after.outputs, 'the copy drew a notice').toEqual([]);
		expect(calls.ownWrites(), 'Copy Monday to weekdays wrote something to the API').toEqual([]);
		expect(calls.scheduleCalls(), 'Copy Monday to weekdays touched a working-hours path').toEqual([]);

		// a working Monday copies its ranges to Tue-Fri, each copy with a fresh id
		await seedWeek(
			page,
			key,
			week([
				{ day: 'monday', isWorking: true, slots: [{ id: 'm1', start: '08:00', end: '16:00' }] },
				{ day: 'tuesday', isWorking: true, slots: [{ id: 't1', start: '10:00', end: '11:00' }] },
				{ day: 'wednesday', isWorking: true, slots: [{ id: 'w1', start: '10:00', end: '11:00' }] },
				{ day: 'thursday', isWorking: true, slots: [{ id: 'th1', start: '10:00', end: '11:00' }] },
				{ day: 'friday', isWorking: true, slots: [{ id: 'f1', start: '10:00', end: '11:00' }] },
				{ day: 'saturday', isWorking: true, slots: [{ id: 's1', start: '10:00', end: '11:00' }] }
			])
		);
		await reloadWeek(page);
		await copyMondayButton(page).click();
		await expect
			.poll(
				() =>
					readWeek(page).then((reading) =>
						reading.rows.slice(1, 5).map((row) => row.fields.map((field) => field.value))
					),
				{ timeout: 10_000 }
			)
			.toEqual(DAY_ORDER.slice(1, 5).map(() => rangeLabel('08:00', '16:00')));
		const copied = await readWeek(page);
		expect(
			copied.rows.map((row) => row.duration),
			'each copied day is not 8h'
		).toEqual([
			hoursLabel(8 * 3600),
			hoursLabel(8 * 3600),
			hoursLabel(8 * 3600),
			hoursLabel(8 * 3600),
			hoursLabel(8 * 3600),
			hoursLabel(3600),
			''
		]);
		const copiedDays = (await storedWeek(page, key)).parsed?.days ?? [];
		expect(
			copiedDays.slice(1, 5).every((day) => day.slots.every((slot) => slot.id !== 'm1')),
			'a copied range kept Monday id m1'
		).toBe(true);
		expect(
			copiedDays.slice(1, 5).every((day) => day.slots.length === 1),
			'a copied day did not get exactly one range'
		).toBe(true);

		report('copy-monday', {
			ariaCheckedBefore: before.rows.map((row) => row.ariaChecked),
			ariaCheckedAfter: after.rows.map((row) => row.ariaChecked),
			durationsAfter: after.rows.map((row) => row.duration),
			liveTexts: after.liveTexts,
			copiedFields: copied.rows.map((row) => row.fields.map((field) => field.value)),
			copiedRangesPerDay: copiedDays.map((day) => day.slots.length),
			ownWrites: calls.ownWrites().length,
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 9. a save the browser refuses

	test('9 · a save the browser refuses: the notice, the edit still on screen, nothing kept, and gone on reload', async ({
		page,
		fixture,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		// Only this key refuses, so the shell's own storage keeps working; `writeWeek` :35-38 swallows the throw.
		await page.addInitScript(() => {
			const original = window.localStorage.setItem.bind(window.localStorage);
			window.localStorage.setItem = function (name: string, value: string) {
				if (String(name).startsWith('ever-teams:working-hours:')) {
					throw new Error('this file made the browser refuse this key');
				}
				return original(name, value);
			};
		});
		await signInAndVisit(page, fixture, PAGE);
		const key = storageKeyOf(fixture.ids.user);
		expect((await readWeek(page)).rows[0].ariaChecked, 'the page did not start from the default week').toBe('true');
		expect((await storedWeek(page, key)).raw, 'the page wrote a week before anything was changed').toBeNull();

		await switchOf(page, DAY_ORDER[0]).click();
		await expect(switchOf(page, DAY_ORDER[0]), 'the refused save undid the switch on screen').toHaveAttribute(
			'aria-checked',
			'false',
			{ timeout: 10_000 }
		);
		const refused = await readWeek(page);
		// the card's text is its title and its body run together, because they are two elements
		expect(refused.outputs, 'the refused save drew no notice card, or more than one').toEqual([
			`${T.SAVE_FAILED_TITLE}${T.SAVE_FAILED_TEXT}`
		]);
		await expect(text(section(page), T.SAVE_FAILED_TITLE)).toHaveCount(1);
		await expect(text(section(page), T.SAVE_FAILED_TEXT)).toHaveCount(1);
		await expect(section(page).locator('output')).toHaveCount(1);
		expect(refused.rows[0].notWorking, 'the switched-off day does not read Not working').toBe(true);
		expect(refused.rows[0].fields, 'the switched-off day still shows its times').toEqual([]);
		expect((await storedWeek(page, key)).raw, 'a refused save still wrote the week').toBeNull();

		// a second edit keeps that one card, and still stores nothing
		await switchOf(page, DAY_ORDER[1]).click();
		await expect(switchOf(page, DAY_ORDER[1]), 'the second refused save undid the switch').toHaveAttribute(
			'aria-checked',
			'false'
		);
		await expect(section(page).locator('output'), 'a second refused save drew a second card').toHaveCount(1);
		expect((await readWeek(page)).rows[1].notWorking, 'the second edit was undone on screen').toBe(true);
		expect((await storedWeek(page, key)).raw, 'the second edit still wrote the week').toBeNull();

		// on reload the notice is gone and so are the edits: the week was never kept
		await reloadWeek(page);
		const afterReload = await readWeek(page);
		expect(afterReload.outputs, 'the notice survived a reload').toEqual([]);
		expect(
			afterReload.rows.map((row) => row.ariaChecked),
			'the default week did not come back'
		).toEqual(defaultAriaChecked());
		expect((await storedWeek(page, key)).raw, 'a reload wrote the week it redrew').toBeNull();

		expect(calls.ownWrites(), 'a refused save was tried over the API').toEqual([]);
		expect(calls.scheduleCalls(), 'a refused save touched a working-hours path').toEqual([]);

		report('refused-save', {
			noticeTitle: T.SAVE_FAILED_TITLE,
			noticeText: T.SAVE_FAILED_TEXT,
			noticeCards: await section(page).locator('output').count(),
			ariaCheckedWhileRefused: refused.rows[0].ariaChecked,
			storedAfterRefusal: (await storedWeek(page, key)).raw,
			ariaCheckedAfterReload: afterReload.rows.map((row) => row.ariaChecked),
			ownWrites: calls.ownWrites().length,
			devToasts: await devToasts(page).count(),
			appToasts: await appToasts(page).count(),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		// the throw is caught by writeWeek: nothing is printed, and nothing else may be
		expect(consoleFindings(shield), 'the refused save logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------- 10. a save no server can refuse

	test('10 · 500 and 400 armed on every write this page could possibly use, and it uses none of them', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		const userId = fixture.ids.user;
		const key = storageKeyOf(userId);
		// `/api/user/<userId>` is where `savePersonalSettings` posts (`user.service.ts:116-118`); the other three are the
		// paths a weekly-schedule contract would use. Every arm answers and counts what it answered.
		const arms = [
			{ path: '/api/working-hours', status: 500 },
			{ path: '/api/working-hours/week', status: 400 },
			{ path: `/api/user/${userId}`, status: 500 },
			{ path: '/api/feature-settings', status: 400 }
		];
		const answered: string[] = [];
		await page.route(
			(url) => url.origin === MOCK_API_ORIGIN && arms.some((item) => item.path === url.pathname),
			async (route) => {
				const request = route.request();
				const method = request.method();
				const pathname = new URL(request.url()).pathname;
				if (method === 'OPTIONS') {
					return route.fulfill({ status: 204, headers: CORS_HEADERS });
				}
				const status = arms.find((item) => item.path === pathname)?.status ?? 599;
				answered.push(`${method} ${pathname} answered ${status}`);
				return route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: JSON.stringify({ statusCode: status, message: 'this file refused the write' })
				});
			}
		);

		await signInAndVisit(page, fixture, PAGE);
		const writesAtLoad = calls.writeShapes().length;

		await switchOf(page, DAY_ORDER[0]).click();
		await expect(switchOf(page, DAY_ORDER[0]), 'the switch did not hold with the arms in place').toHaveAttribute(
			'aria-checked',
			'false'
		);
		const tuesdayEnd = endField(page, DAY_ORDER[1], 1);
		await tuesdayEnd.click();
		await tuesdayEnd.fill('6:15 PM');
		await expect(tuesdayEnd, 'the typed time did not hold').toHaveValue('6:15 PM');
		await addButton(page, DAY_ORDER[2]).click();
		await expect
			.poll(() => rowFieldValues(page, 2), { timeout: 10_000 })
			.toEqual(rangeFields(['09:00', '17:00', '17:00', '18:00']));

		const reading = await readWeek(page);
		expect(
			reading.rows[1].fields.map((field) => field.value),
			'Tuesday does not show the typed time'
		).toEqual(rangeLabel('09:00', '18:15'));
		expect(reading.rows[1].duration, '09:00-18:15 is not 9h 15m').toBe(hoursLabel(9 * 3600 + 15 * 60));
		expect(
			reading.rows[2].fields.map((field) => field.value),
			'the added range did not hold'
		).toEqual(rangeFields(['09:00', '17:00', '17:00', '18:00']));
		expect(reading.rows[2].duration, '09:00-17:00 + 17:00-18:00 is not 9h').toBe(hoursLabel(9 * 3600));
		expect(reading.outputs, 'an armed refusal appeared on the page').toEqual([]);

		const stored = await storedWeek(page, key);
		expect(stored.raw, 'the edits were not stored in this browser').not.toBeNull();
		expect(dayShapes(stored.parsed)[1], 'the typed time is not what the store holds').toEqual({
			day: 'tuesday',
			isWorking: true,
			slots: [{ start: '09:00', end: '18:15' }]
		});
		expect(dayShapes(stored.parsed)[2], 'the added range is not what the store holds').toEqual({
			day: 'wednesday',
			isWorking: true,
			slots: [
				{ start: '09:00', end: '17:00' },
				{ start: '17:00', end: '18:00' }
			]
		});

		// not one arm was reached, before or after the edits, by the browser or by the mock's own log
		expect(answered, 'a write reached an arm this file armed').toEqual([]);
		expect(
			calls.mockCalls.filter((call) => arms.some((item) => item.path === call.path)),
			'the browser sent a request to an armed path'
		).toEqual([]);
		expect(calls.ownWrites(), 'an edit caused a write of the page itself').toEqual([]);
		expect(
			(await mock.requests()).filter((request) => arms.some((item) => item.path === request.path)),
			'the mock heard an armed path'
		).toEqual([]);

		report('armed-refusals', {
			arms: arms.map((item) => `${item.path} → ${item.status}`),
			armsReached: answered,
			writesAtLoad: calls.writeShapes().slice(0, writesAtLoad),
			writesAfterEdits: calls.writeShapes().slice(writesAtLoad),
			storedWasWritten: stored.raw !== null,
			mockWorkingOrFeaturePaths: (await mock.requests()).filter((request) =>
				/working|hours|feature-settings/i.test(request.path)
			).length,
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'the armed refusals left a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------- 11. the read of the signed-in user refused

	test('11 · the user read refused, 500 then 400: the page that stands in for this one, its reason, its Try again, and no write', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		let armedStatus = 500;
		let stubServed = 0;
		await page.route(
			(url) => url.origin === MOCK_API_ORIGIN && url.pathname === USER_ME_ROUTE,
			async (route) => {
				const request = route.request();
				if (request.method() === 'OPTIONS') {
					return route.fulfill({ status: 204, headers: CORS_HEADERS });
				}
				const status = armedStatus;
				stubServed += 1;
				return route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: JSON.stringify({ statusCode: status, message: 'this file refused the user read' })
				});
			}
		);
		const calls = recordBrowserCalls(page);
		const excused: string[] = [];

		for (const status of [500, 400]) {
			armedStatus = status;
			stubServed = 0;
			excused.push(armedHttpError('GET', USER_ME_WITH_QUERY, status));
			// the read that gates the shell is the one being refused, so the shell's ready mark is not what this loads waits for
			await signInAndVisit(page, fixture, PAGE, { requireShell: false });

			const reason = status === 500 ? EN.toasts.REASONS.SERVER : EN.toasts.REASONS.INVALID;
			await expect(
				text(page, EN.pages.error.PAGE_NOT_LOADED),
				`a ${status} user read drew no page-not-loaded title`
			).toBeVisible({ timeout: 15_000 });
			await expect(text(page, reason), `a ${status} user read did not say why`).toBeVisible();
			const tryAgain = page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true });
			await expect(tryAgain, `a ${status} user read offered no Try again`).toHaveCount(1);
			// neither this page's week nor its skeleton: the authenticator replaced the page (`authenticator.tsx:88-91`)
			await expect(section(page), 'the week editor was drawn against a refused user read').toHaveCount(0);
			await expect(page.getByRole('switch'), 'a switch survived the refused read').toHaveCount(0);
			expect((await readWeek(page)).skeletonRows, 'a skeleton week was drawn against a refused user read').toBe(
				0
			);

			const readsBefore = calls.userMeCount();
			expect(stubServed, 'the stub answered no read').toBeGreaterThanOrEqual(1);
			// never pinned for a failed read: React Query retries and `userReadRetryDelay` re-asks on its own
			await tryAgain.click();
			await expect
				.poll(() => calls.userMeCount(), {
					message: `a ${status}: Try again asked for nothing`,
					timeout: 15_000
				})
				.toBeGreaterThan(readsBefore);
			await expect(
				text(page, EN.pages.error.PAGE_NOT_LOADED),
				`a ${status}: Try again cleared the notice while the read still failed`
			).toBeVisible();

			// the mock answered every read of that path with 200, so every refusal on screen came from this file
			const logged = await mock.calls(USER_ME_ROUTE);
			expect(
				logged.filter((request) => request.status >= 400).length,
				`a ${status}: the mock itself refused the user read`
			).toBe(0);
			expect(calls.writes(), `a ${status}: the page wrote something while the read failed`).toEqual([]);

			report('refused-user-read', {
				status,
				reason,
				browserReads: calls.userMeCount(),
				browserReadShapes: calls.userMeShapes(),
				stubServed,
				mockLoggedUserMe: logged.map((request) => `${request.method} ${request.path} ${request.status}`),
				ownWrites: calls.ownWrites().length,
				devToasts: await devToasts(page).count(),
				appToasts: await appToasts(page).count(),
				consoleErrors: shield.consoleErrors(),
				pageErrors: shield.pageErrors()
			});
			expect(
				consoleFindings(shield, excused),
				`a ${status}: besides its own HTTP error line the page logged a console error`
			).toEqual([]);
			expect(shield.pageErrors()).toEqual([]);
		}
	});
});
