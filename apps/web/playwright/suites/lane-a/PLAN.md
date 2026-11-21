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
