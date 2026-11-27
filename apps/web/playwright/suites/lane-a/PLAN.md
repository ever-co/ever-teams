# lane-a — signed-in browser journeys: a timer run, and a task edited in its own page

Lane ports used: app 3031, mock 3992, stats 3993, control 3994, issuer 3995, build dir `.next-lane-3031`.
Files written by lane-a: `suites/lane-a/timer-journey.spec.ts`, `suites/lane-a/task-work.spec.ts`, this file. Nothing
else in the repo was touched (`smoke.spec.ts` was already there).

## 1. What is covered, and what each test proves

### `timer-journey.spec.ts` — `test.describe('a timer run from start to stop')`, 4 tests

Every claim below is made against the **mock** (`/state`, `/requests`, `/tokens`) and, where the fact is about the
browser, against a recorder of the browser's own requests (`page.on('request')`, writes only).

1. **`the start the page clicks reaches the mock, which then holds the run`** — clicks
   `button[aria-label="Start timer"]`, then proves, in that order: `mutationProof.startedTimer === true` and
   `scenario.timerRunning === true`; `POST /api/timesheet/timer/start` 200 in the mock's log; the mock received a
   Bearer token with it (`receivedTokens(...)`, sha256 only); the browser's own request is the same request the mock
   logged (method `POST`, path `/api/timesheet/timer/start`, origin = the API origin the app was configured with);
   and the page then offers `button[aria-label="Stop timer"]`.
2. **`the start names the task the timer bar holds and today’s plan day`** — the timer bar's
   `What are you working on?` textbox holds the fixture task title, and the start body carries `taskId` = the
   fixture task id, `isBillable` a boolean, and `planDay` = today (`en-CA`), i.e. the run is filed on a plan day.
3. **`the stop ends the run the mock holds, and the status is read again after it`** — clicks Stop; the stop body is
   `{source: 'TEAMS'}` with **no** `stoppedAt` (the API ends the run at its own clock); the mock flips
   `scenario.timerRunning` back to `false`; `POST /api/timesheet/timer/stop` 200; and a
   `GET /api/timesheet/timer/status` whose `startMs >= the stop's endMs` — the re-read happened **after** the stop
   landed, not merely somewhere in the same run.
4. **`a page that never saw the click shows the run, because the mock holds it`** — starts a run, clears
   `localStorage` + `sessionStorage` in place, then opens a **new page** (`context.newPage()` +
   `stubNextAuthSession` + `hardVisit('/')`): the mock still holds the run, the new page shows Stop and no Start, the
   new page sent **no** start of its own, and the new page asked for `/api/timesheet/timer/status` **itself**
   (counted on that page, so it cannot be a poll from the page that started the run).

### `task-work.spec.ts` — `test.describe('a task edited in its own page')`, 5 tests, all on `/task/<fixture task id>`

The write half is the app's own `useUpdateTask` → `taskService.updateTask` → `PUT /api/tasks/<id>`; the witness is
the mock's `mutationProof` and its request log.

1. **`picking another status writes the team’s own status record`** — the Status row shows the status the mock
   answers with (`open`); the picker lists the team's 2 statuses; picking in-progress writes a `PUT` whose body
   carries `status: 'in-progress'` **and** `taskStatusId === ids.inProgressStatus` (the team's own status record, not
   the word); the mock's `mutationProof.updatedTask` and `inProgressTaskStatusPreserved` are both true; the mock
   recorded exactly `[["PUT", "/api/tasks/<id>", 200]]`.
2. **`picking the status the task already has asks the API for nothing`** — re-picking `open` sends **0** writes from
   the browser, leaves `mutationProof.updatedTask === false`, and leaves 0 `PUT`s in the mock's log
   (`handleStatusUpdate` returns without a write when the value is unchanged).
3. **`picking an estimate preset writes it as seconds`** — the estimate field reads `Estimate: 1h` (the fixture's
   3600 s); the "2h" preset writes `estimate: 7200`, `estimateHours: 2`, `estimateMinutes: 0`; the mock recorded the
   `PUT` 200 and the task was **read again after the write landed** (`GET` with `startMs >= the write's endMs`).
4. **`assigning a teammate writes the task’s members with that teammate’s employee id`** — the picker lists the
   team's 3 members; assigning "Fixture Teammate" writes a `members` array that contains both the signed-in
   employee's id and the teammate's, each member naming its `userId`.
5. **`unassigning a teammate writes the members without them`** — toggling "Fixture Manager" off writes a `members`
   array that no longer contains that employee id, as a `PUT` on the task the page is editing.

## 2. What the run measured that this file had assumed wrong

**The timer click does not go through the app's own `/api/timer/**` route handlers in this harness — it goes
straight to the API origin.** A first draft asserted `POST http://localhost:3031/api/timer/start` and failed with
the URL the browser really sent (run 3, verbatim):

```
Error: the start went to the app's own route handler, not straight to the API (http://127.0.0.1:3992/api/timesheet/timer/start)
Expected: "http://localhost:3031"
Received:  "http://127.0.0.1:3992"
```

That is the app's direct mode, and this harness configures it: `playwright/test-servers.ts:107-110` names the mock as
the app's public API URL (`NEXT_PUBLIC_GAUZY_API_SERVER_URL`) and leaves `NEXT_PUBLIC_GAUZY_API_BASE_SERVER_URL`
empty; `core/constants/config/constants.tsx:229` builds `GAUZY_API_BASE_SERVER_URL` **from
`NEXT_PUBLIC_GAUZY_API_SERVER_URL`**, so it is the mock origin and not empty; `core/services/client/axios.ts:108-112`
then sets the browser's axios base to `<mock origin>/api`; `core/services/client/api/timers/timer.service.ts` takes
its `GAUZY_API_BASE_SERVER_URL.value` branch for start/stop/status. So the request the browser sends **is** the
request the mock logs — one hop, proven twice. In a deployment that sets `NEXT_PUBLIC_GAUZY_API_BASE_SERVER_URL` the
same click does go through `app/api/timer/**`; these tests say nothing about that path.

Smaller measured corrections, each of which cost a red test before it was measured:

- **A `TaskPropertyMenu` option's accessible name is the label plus what the row also renders** — a selected mark and
  the `<kbd>` shortcut digit (`core/components/tasks/task-property-menu.tsx:200-217`). In the status picker the names
  are `open Selected 1` and `in progress 2`, so `/in-progress/i` and `/^open$/i` match nothing (run 7). Assignee
  options are likewise suffixed.
- **The task page's property rows have no landmark.** `TaskDetailProperties` is rendered straight into the task
  column (`core/components/tasks/detail/task-detail-column.tsx:33`); the `Details` section there
  (`task-detail-section.tsx:21`, `section aria-labelledby`, over `TaskDetailFacts`) holds the created/updated facts,
  not these rows. An `aside[aria-label="Details"]` locator resolved to **0 elements** (run 6). The rows are now found
  from their own label span, walking up to the `div.grid` that `TaskPropertyRow` renders.
- **The mock's `startMs` / `endMs` are elapsed-time numbers, not epoch times.** Measured values in a failure message:
  `5842.378999999957`, `8514.886100000003`, `8862.44889999996`, `15646.800800000085` (run 7). Comparing them with
  `Date.now()` proves nothing; within-mock ordering (`stop.endMs` → a later `status.startMs`) is fine, and
  attributing a read to a specific page is done by counting it at that page.

## 3. What this mock cannot answer, and the journeys that were skipped because of it

- **Task writes are not persisted.** `routeResponse` answers `PUT /api/tasks/:id` with the fixture task merged with
  the body, and every later `GET /api/tasks/:id` with the fixture task as it was. So "the page now shows 2 h" is not
  provable here, and these tests never claim it: they prove the write the mock recorded and the re-read that followed
  it.
- **A day view has nothing to show.** `GET /api/timesheet/time-log` → `[]`, `GET
  /api/timesheet/statistics/time-slots` → `[]`, `GET /api/timesheet/activity` → `[]` (`mock-gauzy-server.mjs:721-725`).
  A "time-log entry appears in the day view" journey would assert an empty state, so it was not written.
- **The manual-time save is blocked by the mock's own answer, before any write.**
  `GET /api/timesheet/time-log/conflict` is not routed, so it gets the default `pagination([])` =
  `{items: [], total: 0}` (`mock-gauzy-server.mjs:9,794`), while `timeLogService.getTimeLogConflicts` validates
  `timeLogConflictSchema.array()` (`core/services/client/api/timesheets/time-log.service.ts:251-259`). The lookup
  therefore throws, `useTimeOverlapGuard` sets `hasCheckFailed` and saves nothing — "A lookup that fails saves
  nothing" (`core/hooks/timesheet/use-time-overlap-guard.ts:92-98,152-159`). So `Add manual time` on
  `/reports/manual-time-edits` (`core/components/dashboards/manual-time-edits/manual-time-edits-page.tsx:131-134`,
  dialog `AddManualTimeModal` with `params="AddManuelTime"`) cannot reach its `POST /api/timesheet/time-log`
  (`time-log.service.ts:198-212`).
- **And that POST would be answered wrongly even if the guard let it through:** unmatched non-GET is answered
  `body ?? { success: true }` (`mock-gauzy-server.mjs:793`), i.e. the request body echoed, which has no
  `employeeId` while `timeLogSchema` requires one (`core/types/schemas/timer/time-log.schema.ts:15-27`) →
  `addManualTime`'s `validateApiResponse` would reject it. **Not measured** (the overlap guard refuses first), stated
  as a consequence of the two quoted answers.
  To make a manual-time write testable, `mock-gauzy-server.mjs` needs a real answer for
  `/api/timesheet/time-log/conflict` (an array) and for `POST /api/timesheet/time-log` (a full time log). A lane could
  `page.route`-stub both, but that proves the stub, not the app-mock pair, so it belongs to whoever owns the mock, not
  in a lane spec. That is why lane-a has no time-log spec tonight rather than a green-looking one.
- **`PUT /api/organization-team-employee/<id>/active-task` is answered by echoing the body**
  (`mock-gauzy-server.mjs:743-744`), which does not satisfy `updateActiveTaskSchema`
  (`core/types/schemas/task/task.schema.ts:148-152`, which requires `affected`, `generatedMaps`, `raw`). A timer start
  therefore produces caught errors and DEV toasts — measured from a failure snapshot:
  `"[Timer] Failed to update active task:"` / `"Validation failed in updateOrganizationTeamEmployeeActiveTask API
  response: affected: Invalid input: expected number, received undefined, generatedMaps: …, raw: …"`. The **start
  itself is unaffected**: `core/hooks/timer/use-timer-api.ts:780-832` posts the start first and wraps the active-task
  write in its own try/catch. This is a mock gap, not an app defect (the real API answers the kysely shape); no test
  asserts on it, and no assertion was weakened because of it.
- Other deliberate skips: timer `discard` / `break` / `started-at` (move the start) — the mock witnesses only
  start/stop/status, so a write there could not be proved; `/reports/weekly-limit`, `/reports/actual-and-expected-hours`
  and the other time-log reports — read-only lists the mock answers `[]`; labels, projects and versions on the task
  page — same write path as status, so they would repeat test 1 rather than add coverage.

## 4. Failures left open

**Nothing in `suites/lane-a/` is red** — see §5 for the run that established that, and for the runs that were red and
why. What is open is a harness problem, reported rather than fixed:

- **The lane's Next dev server stops answering partway through a long run.** Evidence, twice the same shape:
  - `lane-servers.mjs check lane-a` → `lane lane-a: MISWIRED — no runtime env on http://localhost:3031 — that lane's
    app is not answering (start it with \`up lane-a\`)`;
  - `curl http://localhost:3031/` → `000 in 150.009648s`, and later `000 in 60.012479s`, **while the same probe of the
    backend answered healthy**: `http://127.0.0.1:3994/state` → `200 in 0.003574s` and
    `http://127.0.0.1:3992/api/timesheet/timer/status` → `200 in 0.002223s`. So the mock and the control API were
    fine and only the app on 3031 was stuck;
  - the failure trace of that run holds exactly one request, unfinished: `GET http://localhost:3031/` with no status
    and size `-1`;
  - memory at that moment: `Free KB: 2843708  Total KB: 33473768`, with lane-c's dev server (port 3033) at 884 MB and
    lane-a's at 581 MB, plus a `[turbopack-node] transforms pool` at 236-244 MB.
  - `lane-servers.mjs down lane-a` + `up lane-a` (which re-verifies the wiring) made the next run green again: 3
    tests in 46.1 s, and the run after that 12 tests in 2.0 m — so it is **intermittent**, not a fixed limit, and it
    lined up with the machine being tightest (lane-c's dev server up at the same time, 2.8 GB free). What is certain
    from the probes above is where it sits when it happens: the app process on the lane's app port, not the mock and
    not the test. Practical rule for the next lane: when a run hangs at the first `app(...)` page load, run
    `check lane-a` and `curl -w '%{http_code} %{time_total}' http://localhost:<lane app port>/` before touching a
    spec — if the control API answers in 3 ms and the app in 000/60 s, no assertion in the file is the problem.
- Two ways of reopening a page while a run is active hit that wedge and were replaced, with the real messages kept
  for the record:
  - `hardVisit(page, '/')` a second time → `Test timeout of 180000ms exceeded.` then `Error: page.evaluate: Target
    page, context or browser has been closed  at ..\helpers.ts:397` (runs 3, 4, 5 — in run 4 all four tests of the
    file failed there, which is how the wedge was identified);
  - `page.evaluate` to clear storage then `page.reload({waitUntil:'domcontentloaded'})` → `Error: page.reload:
    net::ERR_ABORTED; maybe frame was detached?` (run 6).
  The passing design (§1 test 4) is: clear storage in place, then open a **new page**; never re-navigate the page that
  owns the running timer.

## 5. Commands, and the counts exactly as the logs printed them

Log files are in `/e/Coding/.tmp/` (`lane-a-timer-run1/3/4/5.log`, `lane-a-run6…9.log`, `lane-a-run10-full.log`,
`lane-a-servers*.log`).

```bash
export PATH="/e/nvm/.nodejs:$PATH"
cd /e/Coding/ever-teams

# servers, once, then verify what the app thinks its origins are
node apps/web/playwright/scripts/lane-servers.mjs up lane-a
#   port 3994 answers / port 3031 answers
#   checked: the app on 3031 names its own mock 3992 and statistics sink 3993
#   ready: lane lane-a — app http://localhost:3031, mock 3992, stats 3993, control 3994, issuer 3995
node apps/web/playwright/scripts/lane-servers.mjs check lane-a
#   lane lane-a: OK — the app on 3031 names its own mock 3992 and stats sink 3993

# the cheap syntax check, and the discovered count
E2E_LANE=lane-a E2E_BROWSER_CHANNEL=chrome npx playwright test \
  --config apps/web/playwright/playwright.lane.config.ts --list
#   Total: 12 tests in 3 files        (3 in smoke.spec.ts + 4 in timer-journey + 5 in task-work)

# type check (the branch is shared; the lane must not hand over a tree that does not compile)
cd apps/web && node ../../node_modules/typescript/lib/tsc.js -p playwright/tsconfig.json --noEmit

# the suites
E2E_LANE=lane-a E2E_BROWSER_CHANNEL=chrome npx playwright test \
  --config apps/web/playwright/playwright.lane.config.ts --grep "a timer run from start to stop"
E2E_LANE=lane-a E2E_BROWSER_CHANNEL=chrome npx playwright test \
  --config apps/web/playwright/playwright.lane.config.ts --grep "a task edited in its own page"

# when done
node apps/web/playwright/scripts/lane-servers.mjs down lane-a
```

Every run lane-a ran, with the header/footer read out of the log:

| run | what ran | log line, as printed |
| --- | --- | --- |
| 1 | timer ×4 (`page.route` recorder with a wrong URL pattern) | `Running 4 tests using 1 worker` → `4 failed`; 1) and 2) `Error: the browser never sent the start the page was clicked ([])` (`Expected: 1 Received: 0`, `Timeout 15000ms exceeded while waiting on the predicate`) |
| 2 | timer test 1 only | `Running 1 test using 1 worker` → `1 failed`, `Test timeout of 180000ms exceeded.` + `Error: page.evaluate: Target page, context or browser has been closed at ..\helpers.ts:355` (the app was already wedged) |
| 3 | timer ×4 | `Running 4 tests using 1 worker` → `2 failed` / `2 passed (9.9m)`; the failure that found direct mode, quoted in §2 |
| 4 | timer ×4, against the wedged server | `Running 4 tests using 1 worker` → `4 failed`, all at `helpers.ts:397` inside `app('/')` |
| 5 | timer ×4, fresh servers | `Running 4 tests using 1 worker` → `1 failed` / `3 passed (3.8m)` (13.8 s, 8.4 s, 14.7 s; test 4 hit the wedge) |
| 6 | estimate + status + timer 4 | `Running 3 tests using 1 worker` → `2 failed` / `1 passed (10.1m)`; status failed with `Received: 0` on the `aside[aria-label="Details"]` rail locator |
| 7 | status ×2 + timer 4 | `Running 3 tests using 1 worker` → `3 failed` (two `Test timeout of 180000ms exceeded.` waiting for a status option that the anchored name could not match; timer 4 on the `startMs` vs `Date.now()` comparison) |
| 8 | status ×2 + timer 4, after the selector fixes | `Running 3 tests using 1 worker` → `3 passed (46.1s)` (11.0 s, 10.6 s, 21.8 s) |
| 9 | assign + unassign | `Running 2 tests using 1 worker` → `2 passed (25.6s)` (11.8 s, 10.5 s) |
| 10 | the whole lane-a suite, one run | `Running 12 tests using 1 worker` → `12 passed (2.0m)` |

**Run 10 is the one that matters for a commit: all 12 lane-a tests green in a single run** — `smoke` 10.7 s / 276 ms /
452 ms, `task-work` 10.1 s, 10.7 s, 9.8 s, 9.0 s, 9.9 s, `timer-journey` 11.9 s, 10.4 s, 13.3 s, 21.2 s. Nothing in
`suites/lane-a/` is red.

## 6. Type check

`node ../../node_modules/typescript/lib/tsc.js -p playwright/tsconfig.json --noEmit` reports **no error in any file
under `playwright/suites/lane-a/`**. Note for whoever owns the branch: the same command currently reports
**syntax errors in another lane's work-in-progress** — `playwright/suites/lane-b/route-refusals.spec.ts(363,49)…
(390,2)`, `error TS1005: ',' expected`, `TS1127: Invalid character`, `TS1002: Unterminated string literal`,
`TS1128: Declaration or statement expected`. Lane-a did not touch that file.

## 7. Notes for the next lane, learned the expensive way

- Prove a mutation through the mock's `/state` **first**: `mockStateWhen` dumps the mock's whole state (its request
  log included) when it fails, which is what tells a reader where the chain stopped. The browser half afterwards
  records `page.on('request')` unfiltered — a `page.route` pattern that does not match the real URL records nothing
  and looks like "the app never sent it" (run 1).
- Which hop a click takes is configuration, not identity: measure the URL once and write the assertion around the
  measured origin (§2).
- Within the mock, order is provable (`endMs` → later `startMs`); across the mock and the test's clock it is not.
- `TaskPropertyMenu`'s option names carry the shortcut digit; anchor on the label's first word, never on the end of
  the name.
- Keep a run short or restart the lane's servers between runs, and `check lane-a` before believing a timeout.

## 8. Groundwork for the three cases the next lane-a pass was asked to write — read from source, NOT run

**Nothing in this section comes from a run.** On 2026-11-21, before writing anything, the machine check said
`Free KB: 1301036 / Total KB: 33473768` (with `strata` at 11 170 MB and two other lanes' servers up: the lane-b mock
127.0.0.1:3996 and lane-c mock 127.0.0.1:4002 were LISTEN, 3032/3033 not), and lane-a's own ports were both
**CLOSED** — `127.0.0.1:3031 CLOSED`, `127.0.0.1:3992 CLOSED` — so a browser run there would have needed a cold
`up lane-a` (minutes of Turbopack) on 1.2 GB free, under the 3.5 GB this effort asks for. So no server was started,
no spec was written, and no `--list` was run (which would have overwritten `artifacts/playwright-lane-a.json` with an
all-skipped report). What follows is a code reading, and every claim is a file path plus a line, not a number from a
log. Treat the two "so a future test must…" sentences as hypotheses to be measured, not as results.

### 8.1 `/team/tasks` — what the page is, and which reads a future case would pin

- Route: `app/[locale]/(main)/(teams)/team/tasks/page.tsx` — the whole file is
  `withAuthentication(TeamTasksPage, { displayName: 'TeamTask', skeleton: TeamTasksPageSkeleton })`.
- Page: `core/components/pages/teams/team/tasks/list/team-tasks-page.tsx`. Its body picks one state per render —
  `'loading' | 'error' | 'viewEmpty' | 'emptyTeam' | 'noMatch' | 'scopeEmpty' | 'list'` — so a row-count test has to
  say which state it expects; `list` needs `view.rows.length > 0`, and a mock that answers the list with `[]` lands on
  `emptyTeam` instead, which is a different element (`team-tasks-states.tsx`).
- Reads the components ask for, from the code that asks:
  - the task list: `core/services/client/api/tasks/task.service.ts:148` GETs `/tasks/team?<query>` **and** `:396`
    POSTs `/tasks/team`, so a "the list read is one GET" assertion is not safe before measuring;
  - the statuses: `core/hooks/tasks/use-team-tasks-view.ts:8` (`useTaskStatusesQuery`), which is fed by
    `useTaskMetadataBootstrapQuery` (`core/hooks/tasks/use-task-statuses-query.ts:10`) →
    `/task-metadata/bootstrap?<query>` (`core/services/client/api/tasks/task-metadata-bootstrap.service.ts:41`);
  - the projects: `core/hooks/tasks/use-team-tasks-view.ts:7` (`useOrganizationProjectsQuery`).
  Which of these the *route* actually triggers, in which order, is still only knowable from the mock's request log —
  `cypress/e2e/route-ownership.cy.ts:26` pins `{ path: '/team/tasks', expected: ['/api/tasks/team'] }`, and this
  lane's `smoke.spec.ts` already waits for `/api/tasks/team` on that route.
- The app's own handler for that path exists (`app/api/tasks/team/route.ts`, from
  `find app/api -name route.ts`) but is **not** in a mock run's path — see §2 (direct mode). A new case must phrase
  its proof as "the page asked the mock this" exactly as `timer-journey` and `task-work` do.
- Rows must be asserted against the ids the control API serves (`fixture.ids.task`, `names.task`), never against a
  title typed into the spec — the mock's team holds exactly one task (`mock-gauzy-server.mjs:224 tasks: [task]`).

### 8.2 The `aside[aria-label="Details"]` open item — the code half is now settled, the measured half is not

- The file the brief named, `core/components/features/tasks/pages/task-detail-page-body.tsx`, **is not in the tree**:
  `find core/components -name task-detail-page-body.tsx` prints exactly one path,
  `core/components/pages/task/task-detail-page-body.tsx` — the one this README's open item §1 already cites. Naming
  the other path is the same failure mode `playwright/README.md` "Corrections" warns about.
- What that file does (read, not run): `TaskDetailPageBody` takes `isWide = useMediaQuery('(min-width: 1024px)')`
  (line 63, query constant line 20) and renders `<TaskDetailRail …/>` only when `isWide` (line 85). `TaskDetailRail`
  is `<aside aria-label={t('common.DETAILS')}>` (lines 42-43) and **inside it** is
  `TaskDetailRailSection title={t('taskDetail.sections.PROPERTIES')}` over `TaskDetailProperties` (lines 46-48), then
  TIME, DAILY PLANS and DETAILS rail sections. `locales/en.json` gives `common.DETAILS = "Details"` and
  `taskDetail.sections.PROPERTIES = "Properties"` (checked with `node -e` on that file). The route that renders it is
  `app/[locale]/(main)/task/[id]/page.tsx:132` (`{task && <TaskDetailPageBody key={task.id} task={task} />}`).
- So at the 1280×720 viewport the property rows *are* inside a labelled `aside`, and the run-6 measurement of
  "0 elements" cannot be read as "the rail has no such label". The likeliest innocent cause, and it is a hypothesis
  until re-measured: `core/hooks/common/use-media-query.ts` is `useSyncExternalStore` with
  `getServerSnapshot = matchesOnServer() → false`, so the rail is absent from the server render and appears only when
  the client snapshot applies — a locator fired straight after `waitForShellReady` can legitimately catch 0.
  **The claim stays open**; `task-work.spec.ts`'s label-walking `propertyRow()` stays until someone measures on a
  healthy lane, and this file's §1 correction ("the properties grid has no landmark") should be re-tested rather than
  trusted.
- A future case for "open a task's detail from the list" should record, in the same run: the click's target row (by
  `fixture.ids.task`), the URL it lands on, and the mock's log entry for `GET /api/tasks/<id>`
  (`task.service.ts:85-87` — the path carries a query string only when `GAUZY_API_BASE_SERVER_URL.value` is set, which
  in a lane it is *not*, so expect the bare `/api/tasks/<id>`).

### 8.3 A permission refusal the mock cannot produce, recorded instead of written

- `/permissions` is the one page under `core/components/pages/**` that renders `NotFound` from a permission decision
  (`core/components/pages/permissions/page-component.tsx`: `canAccessPermissions` at line 57, the refusal at line 78),
  and its rule is `isOrganizationAdmin || !(activeTeamManagers.length && !isTeamManager)` — i.e. it refuses **only a
  non-admin viewer when the team has managers and that viewer is not one of them**. Cypress pins the read
  (`cypress/e2e/route-ownership.cy.ts:24 { path: '/permissions', expected: ['/api/roles'] }`) and the mock answers it
  (`mock-gauzy-server.mjs:597-600`: `/api/roles/options` → the role, `/api/roles` → `pagination([role])`,
  `/api/role-permissions/me` → the permission rows).
- **Mock gap:** the refusal state is unreachable through the switches the control API accepts. `scenario.manager`
  drives both halves at once — `mock-gauzy-server.mjs:53` (`name: scenario.manager === false ? 'EMPLOYEE' : 'ADMIN'`)
  and `:190` (`isManager: scenario.manager !== false`) — so `manager: false` yields an EMPLOYEE **and an empty
  managers list** (`:222`), which the guard reads as allowed. Making this testable needs the mock to take role name
  and member-manager separately; that is the mock owner's change, not a lane's, and `page.route`-stubbing `/api/roles`
  here would prove the stub. No test was written for it.
- The refusal that *is* reachable and worth measuring on the next pass is the unauthenticated one: the `anon` fixture
  (`fixtures.ts`) visits `/team/tasks` with no session cookies and `hardVisit` is not used, so what the shell does —
  a redirect, a skeleton that never resolves, or the sign-in page — and whether the mock logged anything before it, is
  answerable from `/requests`. Unmeasured so far.

## 9. `public-assets.spec.ts` — the `/api/public-assets/[...path]` route, pinned from its own header

32 tests, `suites/lane-a/public-assets.spec.ts` (743 lines). Every number below is asserted in the committed file and
comes from `/e/Coding/.tmp/lane-a-assets-4.log`, whose summary line is **`32 passed (7.7s)`** (run 1 of the same file,
`/e/Coding/.tmp/lane-a-assets-1.log`, was `1 failed` / `31 passed (8.1s)` — the failure was this file's own filter bug,
§9.6).

**Read from source before writing anything:** `app/api/public-assets/[...path]/route.ts` (45 lines),
`core/lib/helpers/proxy-gauzy-image.ts` (41), `core/lib/helpers/public-asset-url.ts` (63),
`core/constants/config/constants.tsx:194-213` (`resolveGauzyApiServerBase`), `:214` (`basePath`), `:225`
(`GAUZY_API_SERVER_ORIGIN`), `:227` (`GAUZY_API_SERVER_URL`), `:229-232` (`GAUZY_API_BASE_SERVER_URL`),
`core/components/settings/pages/task-properties/property-icon-image.tsx:28-31`,
`core/components/settings/icon-items.tsx:101-112`, `cypress/support/mock-gauzy-server.mjs:806`, `:1080`,
`:1094-1100`, `:1109`. Nothing in this section is quoted from another lane or from a plan.

### 9.1 What the route's two header sentences measure as

| the claim (`route.ts:9-16`) | the measurement |
| --- | --- |
| "serves them from the origin the /api routes already proxy to" | `GET /api/public-assets/ever-icons/task-statuses/open.svg` writes **exactly one** entry into the lane mock's log: `GET /public/ever-icons/task-statuses/open.svg 200`. That log belongs to the mock on this lane's own port (`test-servers.ts:38` `LANE_PORTS['lane-a']`, `:285-290`), so a route still falling back to `https://api.ever.team` (`constants.tsx:212`) would leave it **empty** — and every refusal below does leave it empty. The app's own error line names the full upstream: `artifacts/lane-lane-a-server.log:218` `[WEB][API] public-assets: http://127.0.0.1:3992/public/ever-icons/task-statuses/open.svg is unreachable` (read by hand, not asserted in a spec — a spec must not depend on the launcher's log file name). |
| "every path segment must be a plain file name … no request can point this at another host or escape `<origin>/public/`" | 16 shapes, one test each, §9.2. Every shape the guards refuse writes **no** upstream call. |

### 9.2 The refusal matrix (status / bytes / content-type / was the mock asked)

Three layers answer, and the byte count says which one did: the route's own
`new NextResponse(null, { status: 404 })` (`route.ts:25`) is **404, 0 bytes, no `content-type`, no
`cache-control`**; Next's not-found page is **404, ~20 KB `text/html`, `cache-control: no-store`**; Next's rewrite
layer is **308 + a `location`**.

| path after `/api/public-assets` | answer | mock asked? |
| --- | --- | --- |
| `ever-icons/task-statuses/open.svg` | 404, 0 bytes | **yes** — `GET /public/ever-icons/task-statuses/open.svg 200` |
| `task-sizes/large.svg` | 404, 0 bytes | yes — `GET /public/task-sizes/large.svg 200` |
| `open.svg?x=1&y=%2e%2e` | 404, 0 bytes | yes, **with `query: ""`** — the route forwards no query string |
| `..` written raw to the socket | 308 → `location: /api` | no |
| `.` raw, and `%2e` encoded | 308 → `location: /api/public-assets` | no |
| *(no segments at all: `/api/public-assets`)* | 404, **20 296 bytes**, `text/html`, `no-store` | no |
| `%2e%2e/ever-icons/task-statuses/open.svg` | 404, **20 324 bytes**, `text/html`, `no-store` | no |
| `open.svg/` (trailing slash) and `ever-icons//task-statuses//open.svg` | 308 → `location: /api/public-assets/ever-icons/task-statuses/open.svg` | not for the 308 itself; a client that follows it lands on the normal forwarded case |
| `..%2Fever-icons%2Ftask-statuses%2Fopen.svg` | 404, 0 bytes | **no** |
| `ever-icons%2Ftask-statuses%2Fopen.svg` (one segment holding `%2F`) | 404, 0 bytes | no |
| `ever-icons/..%2Fopen.svg`, `%2E%2E%2Fetc/passwd.png` | 404, 0 bytes | no |
| `https%3A%2F%2Fexample.invalid%2Fx.png`, and the same with a raw colon | 404, 0 bytes | no |
| `.hidden.png` (dotfile), `a%5Cb.png` (backslash) | 404, 0 bytes | no |
| `open` (no extension), `open.txt`, `open.svgz`, `open.tar.gz` | 404, 0 bytes | no |
| `s1/s2/s3/s4/s5/s6/s7/open.svg` — 8 segments | 404, 0 bytes | **yes** |
| `s1/…/s8/open.svg` — 9 segments | 404, 0 bytes | **no** — `MAX_SEGMENTS = 8` (`route.ts:23`, `:32`) is the boundary |
| `a..b.png` | 404, 0 bytes | **yes** — `GET /public/a..b.png 200` |
| a 4 004-character segment (`'a' × 4000 + '.png'`) | 404, 0 bytes | **yes** — the mock recorded a **4 012-character** path |
| `open.SVG` | 404, 0 bytes | yes, case preserved |

Three findings out of that table:

- **Nothing in this route bounds a name's length.** The only bound is `MAX_SEGMENTS = 8`; a single 4 004-character
  segment is forwarded to `<origin>/public/` untouched (the 4 012-character path is in the mock's log). The header's
  "plain file name" is a shape rule, not a size rule, and there is no `content-disposition` anywhere on this route. For
  the record: `core/services/server/forward-to-gauzy.ts` is 145 lines and contains no such constant, and
  `MAX_CONTENT_DISPOSITION_LENGTH` appears nowhere in `apps/web` (`grep -rn` over `apps/web`, 2026-11-22).
- **`SAFE_SEGMENT` (`route.ts:20`) refuses a *leading* dot only.** `a..b.png` is forwarded verbatim. That is not a
  traversal (`..` is not a segment), but it is the exact edge of the promise, so it is pinned rather than assumed.
- **`route.ts:31`'s `segments.length === 0` guard is never reached over HTTP.** `/api/public-assets` with no segments
  is answered by Next's not-found page (20 296 bytes of HTML), and `/api/public-assets/` is 308-redirected to it. What
  the measurement shows is that the handler never ran for a zero-segment request; on that reading the guard is
  defensive code the router does not exercise.

### 9.3 Verbs on one icon path

| verb | status | body | headers | mock asked |
| --- | --- | --- | --- | --- |
| GET | 404 | 0 bytes | no `content-type`, no `cache-control` | yes, `GET … 200` |
| HEAD | 404 | 0 bytes | same | **yes, and the recorded call is a `GET`** — the route exports no HEAD, and `proxy-gauzy-image.ts:21` always fetches the whole file |
| OPTIONS | **204** | 0 bytes | `allow: GET, HEAD, OPTIONS` | **no** |
| POST / PUT / DELETE | 405 | 0 bytes | **no `allow` header at all** | no |

The 405 naming no `allow` while the OPTIONS answer names one matches what
`suites/lane-c/method-and-preflight.spec.ts` recorded for other routes. No answer in this family is a 3xx with a
`location`, and a refusal never carries one.

### 9.4 Anonymous and a lane session are the same request

Anonymous and `scope: 'A'` (the `auth-token` + `auth-refresh-token` cookie pair `helpers.ts:150-167` builds) answer
identically — same status, same 0-byte body, same absent `content-type` — and each writes exactly one
`GET /public/ever-icons/task-statuses/open.svg 200`. `receivedTokens('/public/ever-icons/task-statuses/open.svg')` is
`[]` for both: the mock records only a `Bearer` (`mock-gauzy-server.mjs:1094-1100`, as a sha256) and none arrived, and
the route could not have sent one — `proxy-gauzy-image.ts:21` fetches with `{ headers: { Accept: accept } }` and
nothing else. A refused path is refused identically with a session attached (`..%2F…` → 404, 0 bytes, nothing asked),
so a session is never the reason a refusal reaches upstream.

### 9.5 The differential, and where the mock makes it partial

- The served document hands the browser `NEXT_PUBLIC_GAUZY_API_SERVER_URL` = `http://127.0.0.1:3992` in its
  `data-ever-teams-runtime-env` attribute (measured on the 428 KB `/auth/passcode` document, compared to `MOCK_ORIGIN`).
- `GET http://127.0.0.1:3992/public/ever-icons/task-statuses/open.svg` — the URL `publicAssetUrl(path)` builds **with**
  an origin (`public-asset-url.ts:62`; what `icon-items.tsx:107` and `edit-status-modal.tsx:53` hand the browser) —
  answers **200, 22 bytes `{"items":[],"total":0}`, `content-type: application/json`, `cache-control: no-store`**: the
  mock's unmatched-path payload (`mock-gauzy-server.mjs:806`), not an icon.
- `GET /api/public-assets/ever-icons/task-statuses/open.svg` on the app — the URL built **without** an origin, which is
  exactly what `property-icon-image.tsx:30` passes (`publicAssetUrl(text, '')`) — answers **404, 0 bytes, no
  `cache-control`**: the upstream's `no-store` is not inherited by a refusal, and nothing here is cached (no `etag`, no
  `set-cookie` on any answer in this family).
- **The 200 pass-through of `proxy-gauzy-image.ts:29-40` is not exercisable on a lane.** The mock answers
  `application/json` for every answer it gives (`:1109`) and 200s an unknown path with its pagination payload
  (`:806`), and `proxy-gauzy-image.ts:27` maps a non-`image/*` answer to 404. So `Cache-Control: public, max-age=3600,
  stale-while-revalidate=86400` and `X-Content-Type-Options: nosniff` (`proxy-gauzy-image.ts:34-37`) and the
  `Content-Security-Policy: script-src 'none'; frame-src 'none'; sandbox;` this route adds (`route.ts:43`) are
  **untested** — they need a mock that can answer `image/*`, which is the mock owner's change, not a lane's. The
  `Accept: image/*` the route sends upstream (`proxy-gauzy-image.ts:21`) is unobservable too: the request log is body-
  and header-free by design (`mock-gauzy-server.mjs:1080`).
- One outage half *is* measurable: arming `scenario.drops` on `/public/ever-icons/task-statuses/open.svg` gives the
  route a call with **no answer**, recorded as `GET … 0`, and the route still answers **404, 0 bytes** — the same body
  as a refusal, distinguishable only by that `0` in the log.

### 9.6 Corrections

- **Correction to the run command this lane was handed.** `playwright.api.config.ts` cannot run a `suites/lane-a`
  file: its only project is `testMatch: '**/api/**/*.spec.ts'` (`playwright.api.config.ts:28`), so
  `npx playwright test --config apps/web/playwright/playwright.api.config.ts suites/lane-a/public-assets.spec.ts`
  prints `Error: No tests found. … Total: 0 tests in 0 files` (measured with `--list`). This file runs under
  `playwright.lane.config.ts` like every other lane spec (`testMatch: '**/lane-a/**/*.spec.ts'`, `:57`), with
  `E2E_LANE=lane-a E2E_REUSE_SERVERS=1`. It needs no browser, so `E2E_BROWSER_CHANNEL` is irrelevant here.
- **Correction to `suites/api/sweep.spec.ts:176`.** It lists `GET /api/public-assets/[...path]` under `NON_JSON_ROUTES`
  with the reason "serves a static public asset". On a lane it serves **nothing**: every path this route accepts is
  stopped by its content-type gate (404, 0 bytes) and every path it refuses is a 404 too. Before this spec the only
  mentions of the route in `suites/` were the generated manifest entry (`routes.generated.ts:1223`), that one-line
  reason, and a comment in `lane-c/method-and-preflight.spec.ts:878` — no behaviour was pinned anywhere.
- **Correction to §8.2 of this file.** It states that `GAUZY_API_BASE_SERVER_URL.value` is unset in a lane ("expect the
  bare `/api/tasks/<id>`"). That cannot hold for a browser in this harness: `GAUZY_API_BASE_SERVER_URL` *is*
  `getNextPublicEnv('NEXT_PUBLIC_GAUZY_API_SERVER_URL', …)` (`constants.tsx:229-232`), `getNextPublicEnv` reads that
  key lazily at access time (`apps/web/env-config.ts:144-157`), and `test-servers.ts:109` sets exactly that key to the
  lane mock — measured by the runtime-env test in this file. It also contradicts §2 of this file, which measured the
  browser calling the API origin directly. **Not measured by me:** the `/tasks/<id>` request itself — whoever writes
  that test must measure its URL rather than take either sentence.
- Run 1 failed one test for a reason inside this spec, not in the app: the anonymous/session test filtered the **whole**
  mock log (both halves) instead of the entries the session request added — `GET /public/… 200, GET /public/… 200`
  against an expectation of one. Fixed by slicing the log at the anonymous half's length.

### 9.7 Secondary target: `core/lib/auth/rotated-refresh-token.ts` — no test written, and why

`rotated-refresh-token.ts` is 18 lines: one `Set` of three messages (`Token is rotated`, `Token is not active`,
`Failed to rotate token - concurrent modification`) and one `typeof message === 'string' && set.has(message)`. Its two
readers are `proxy.ts` and `core/lib/auth/session-renewal.ts`.

- `suites/api/auth-refresh.spec.ts` (124 lines, 5 tests) already pins the route-side half: nothing to renew is answered
  with the API never asked; the pair is answered even when the profile read fails; an API that cannot answer is not
  reported to the browser as a refusal; the renewal is authenticated by the body token, not the cookies.
- **The rotated branch is already owned by unit tests that can produce it**:
  `apps/web/test/auth/refresh-token-rotation-race.test.tsx` runs against `apps/web/test/auth/fake-gauzy-session.ts`,
  whose `RefreshTokenRecord` state `'rotated'` answers 401 `Token is rotated` (`:4`, `:50`, `:162`, `:280`).
- **The lane mock cannot produce it.** `/api/auth/refresh-token` answers
  `{ token: 'synthetic-refreshed-token', refresh_token: 'synthetic-refresh-token' }` unconditionally
  (`mock-gauzy-server.mjs:549-550`); the mock's only 401 is `UNAUTHORIZED` (`:810`), used at `:879` and `:890` in the
  Ever Platform routes, and there is no scenario key for a refused refresh. Testing the three strings here would have
  meant editing the shared mock (owned by the Cypress suite and by the other lanes' servers), so nothing was written —
  rather than a test that proves a stub.

### 9.8 Commands and the counts as printed

```bash
export PATH="/e/nvm/.nodejs:$PATH" NODE_OPTIONS=--no-warnings
cd /e/Coding/ever-teams
node apps/web/playwright/scripts/lane-servers.mjs up lane-a     # → /e/Coding/.tmp/lane-a-up-1.log
node apps/web/playwright/scripts/lane-servers.mjs check lane-a
#   lane lane-a: OK — the app on 3031 names its own mock 3992 and statistics sink 3993

E2E_LANE=lane-a E2E_REUSE_SERVERS=1 npx playwright test \
  --config apps/web/playwright/playwright.lane.config.ts suites/lane-a/public-assets.spec.ts \
  > /e/Coding/.tmp/lane-a-assets-N.log 2>&1
#   run 1 (lane-a-assets-1.log): Running 32 tests using 1 worker → 1 failed / 31 passed (8.1s)   (this spec's own
#          filter bug, §9.6)
#   run 2 (lane-a-assets-2.log): Running 32 tests using 1 worker → 32 passed (5.6s)
#   run 3 (lane-a-assets-3.log): Running 32 tests using 1 worker → 32 passed (6.6s)
#   run 4 (lane-a-assets-4.log): Running 32 tests using 1 worker → 32 passed (7.7s)   ← the committed state

cd apps/web && node ../../node_modules/typescript/lib/tsc.js -p playwright/tsconfig.json --noEmit
npx eslint playwright/suites/lane-a/public-assets.spec.ts --max-warnings=0    # from apps/web, exit 0
```

Type check at the run-4 pass: **no error in any `suites/lane-a` file**. The same command does report two errors in
another lane's in-flight file — `playwright/suites/lane-b/board-preflight.spec.ts(260,3) TS2322` and
`playwright/suites/lane-b/board-preflight.spec.ts(671,4) TS2769`. Lane-a did not touch that file.
