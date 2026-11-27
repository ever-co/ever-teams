# lane-a — browser journeys, proved against the mock the lane owns

Lane ports: app `http://localhost:3031`, mock `3992`, statistics sink `3993`, control API `3994`, fake issuer `3995`
(`LANE_PORTS` in `playwright/test-servers.ts`). No spec names a port; `E2E_LANE=lane-a` is the whole switch.

```bash
export PATH="/e/nvm/.nodejs:$PATH"
export E2E_BROWSER_CHANNEL=chrome
node apps/web/playwright/scripts/lane-servers.mjs up lane-a      # leave running; prints `ready:` when both answer
node apps/web/playwright/scripts/lane-servers.mjs check lane-a   # the app names its own mock/stats, or MISWIRED
E2E_LANE=lane-a npx playwright test --config apps/web/playwright/playwright.lane.config.ts --grep "A|B"
node apps/web/playwright/scripts/lane-servers.mjs down lane-a    # when the lane is done
```

## Green: the whole lane has now run, 12 / 12

From `artifacts/lane-a-all-1.log` (2026-11-21 15:52–15:54, `--grep` omitted, warm lane whose `check` had just
printed OK): `Running 12 tests using 1 worker` → **`12 passed (2.2m)`**, 0 failed.

| File | Discovered | Passed | Failed | Per-test durations from that log |
| ---- | ---------- | ------ | ------ | -------------------------------- |
| `smoke.spec.ts`         | 3 | 3 | 0 | 9.2 s, 270 ms, 4.0 s |
| `task-work.spec.ts`     | 5 | 5 | 0 | 10.6 s, 11.6 s, 12.0 s, 13.8 s, 13.3 s |
| `timer-journey.spec.ts` | 4 | 4 | 0 | 12.8 s, 13.1 s, 9.9 s, 19.0 s |

`tsc -p playwright/tsconfig.json --noEmit` is silent for every lane-a file. Earlier runs of this same lane — and the
reason none of the reds were app bugs — are in the last section, because "it went green eventually" is not the
useful part; the trap that made 9 test-failures out of a frozen dev server is.

## What each test proves (all of these are now measured, not predicted)

`timer-journey.spec.ts` — describe `a timer run from start to stop`:

- *the start the page clicks reaches the mock, which then holds the run* — the click sends
  `POST http://127.0.0.1:<lane mock>/api/timesheet/timer/start` (method, origin and path proven at the page), and the
  mock's **state** afterwards says a run exists (`mutationProof.startedTimer`, `scenario.timerRunning === true`), with
  a sha256 of a Bearer token recorded against that path.
- *the start names the task the timer bar holds and today's plan day* — the body the browser sent carries
  `taskId` = the fixture task, a boolean `isBillable`, and `planDay` = today's local day.
- *the stop ends the run the mock holds, and the status is read again after it* — the stop posts `{source:'TEAMS'}`
  with no `stoppedAt`, the mock flips `scenario.timerRunning` back to **false** (its own state, not a request count),
  and the mock's log holds a `/api/timesheet/timer/status` read whose `startMs` is after the stop's `endMs`.
- *a page that never saw the click shows the run, because the mock holds it* — with localStorage and sessionStorage
  cleared on the page that started the run, a **second page** in the same context boots, still offers the stop and no
  start, sends no start of its own, and is recorded (by its own request listener) asking the mock for the timer
  status — so what it shows came from the mock, not from the device.

`task-work.spec.ts` — describe `a task edited in its own page` (each test asserts the body the browser sent **and**
what the mock's state holds afterwards):

- *picking another status writes the team's own status record* — `PUT /api/tasks/<id>` carrying `status:'in-progress'`
  **and** `taskStatusId = ids.inProgressStatus` (the same record `/api/task-statuses` answers), witnessed by the mock's
  `mutationProof.updatedTask` + `mutationProof.inProgressTaskStatusPreserved`, and by the mock's own log entry
  `['PUT', '/api/tasks/<id>', 200]`.
- *picking the status the task already has asks the API for nothing* — picking `open` on a task already `open` sends
  **no** write, and the mock's proof stays false (`use-update-task.ts:339` early-returns).
- *picking an estimate preset writes it as seconds* — the `2h` chip writes `{estimate:7200, estimateHours:2,
  estimateMinutes:0}`, the mock witnesses the write, and the task is read again after the write landed.
- *assigning a teammate writes the task's members with that teammate's employee id* — the written `members[]` carry
  `id` = employee id and `userId` (fixture employee + teammate employee, fixture user + teammate user).
- *unassigning a teammate writes the members without them* — toggling the task's only member off writes `members`
  that no longer contains that employee id, as a `PUT` on the task being edited.

## One correction the runs forced, and it matters to every lane that clicks a button

**The browser does not go through the app's own Next route handlers in these runs.** Measured, not assumed: the
assertion `new URL(write.url).origin === APP_ORIGIN` was replaced with `=== MOCK_ORIGIN` plus
`write.path === '/api/timesheet/timer/start'`, and that test then passed. The wiring:
`playwright/test-servers.ts:104-110` sets `NEXT_PUBLIC_GAUZY_API_SERVER_URL` to the lane's mock and
`NEXT_PUBLIC_GAUZY_API_BASE_SERVER_URL` to `''`; `core/constants/config/constants.tsx:229` builds
`GAUZY_API_BASE_SERVER_URL` **from the server URL**, not from that empty one; `core/services/client/axios.ts:108-112`
then makes the browser's axios base `<mock origin>/api`. So a lane-a click proves one hop twice (at the page, at the
mock), and `app/api/timer/**` is not in that path — `app/api/**` is what the `suites/api` run drives. A green test
must not claim "the page called the app's own route handler".

## What the mock can witness, and the gap the files name instead of papering over

The mock's request log is deliberately **body- and header-free** (`cypress/support/mock-gauzy-server.mjs:1041-1048`,
pinned by `tools/performance/mock-gauzy-server.test.mjs`), so a count proves only "a request to this path happened" —
which any other request to the same path would also satisfy. Every lane-a assertion therefore uses one of the two real
witnesses: the mock's **state** (`/state` via `mockStateWhen`: `mutationProof.startedTimer`, `scenario.timerRunning`,
`mutationProof.updatedTask`, `mutationProof.inProgressTaskStatusPreserved`, `receivedTokens`) or the **body recorded
at the page** (`recordWrites` / `recordTaskWrites`: method, full URL, path, parsed `postData()`), asserted as a shape
(`planDay`, `taskStatusId`, `members[].id`, `estimateHours`) and matched against the mock's log entry for that path.

**The remaining gap, written down:** for a *task* write the mock holds no state beyond those two booleans —
`mock-gauzy-server.mjs:605-610` answers `PUT /api/tasks/<id>` with the fixture task merged over the body and stores
nothing, and `:604` keeps answering `GET /api/tasks/<id>` with the fixture unchanged. So lane-a can prove *what the
browser sent* and *that the mock received it*, never *what it changed on the server*, and no test here claims the
latter (a test asserting "the rail now reads 2 h" would be asserting the mock's amnesia). A body-carrying witness
(`state.taskWrites` beside `mutationProof`, reset with it) is the open follow-up; it is deliberately not added,
because that file is shared with Cypress and `suites/mock/timer-mutation.spec.ts:98-102` asserts `mutationProof` by
whole-object equality, which an added key would break.

## Why the earlier reds were red — measured today, before believing any future red here

1. **A frozen lane keeps its port and answers nobody.** `lane-servers.mjs check lane-a` said
   `MISWIRED — no runtime env on http://localhost:3031 — that lane's app is not answering` at 09:54, 12:3x and 14:3x
   while 3031 stayed LISTENING; `curl -m 300 http://localhost:3031/` returned `status=000` (a hang, not slowness)
   while the mock/control answered 200 in 1–2 ms. Every test in such a run dies at `Test timeout of 180000ms
   exceeded` inside `hardVisit`. That is how runs 1–5 of `timer-journey` and the first `task-work` run produced
   9 timeouts with zero app evidence: the traces hold one network snapshot, `GET http://localhost:3031/` with
   response status `-1`. **`check` the lane before every run**, and read `artifacts/lane-lane-a-server.log`.
2. **The frozen pipe, and what I could and could not prove about it.** `lane-servers.mjs` spawned its children with
   the default `stdio: 'pipe'` and never drained them; that is now fixed (output to `artifacts/lane-lane-a-server.log`).
   I tested the same idea independently at 14:01 by launching `laneServers`' own servers with both children's
   stdout/stderr redirected to files: the next run (14:04) still failed 4/4 in 3.2 m, and the child logs stayed at
   217 bytes — so on *my* lane that change alone did not make the difference, and I cannot claim it as the cause.
   What I can claim: restarting the lane and confirming it answers (15:08: `GET /` in 11 ms, `307`) turned the same
   tests green in 8–20 s each, three times in a row (15:08 run, 15:43 run, 15:52 run).
3. **Contention was real but was not the story here.** `FreePhysicalMemory` 3 900 280 KB of 33 473 768 KB at 12:13,
   `strata` 12.8 GB working set, lane-c's `next dev` 978 MB and running, this lane's 640–978 MB. The isolation
   pairing `playwright/README.md:148-156` demands was done (12:20, one test alone: still 3.2 m) and it pointed at the
   dead lane, not the load — which is why item 1 is the thing to check first.
4. **`waitForShellReady`'s new diagnosis never fired in my runs.** Its text (marks + first 500 body characters +
   "InitState mounted … a critical read never settled" vs "never mounted") would have been the evidence for a
   half-mounted shell; every red I hit stopped earlier, in the first `hardVisit`, so the shell never got far enough
   to be diagnosed. If it fires later, quote it verbatim.
5. **`timer-journey` test 4's own assertion was wrong once, and the log proved it**: it compared
   `request.startMs` (the mock's clock, milliseconds *since its own reset*: 4658, 6682, 7046, 12849) with
   `Date.now()` (1 795 270 604 005), so it could only ever report 0 status reads. It failed as
   `Expected: >= 1 / Received: 0` at 15:19. It is now attributed per page instead (`recordStatusReads(second)`
   counting the reads *that page* made), and that version passes in 19–20 s. The rewrite appeared on disk at 15:33,
   written by the other agent working this lane, not by me — see the next item.
6. **Two agents work this lane's folder, on one mock.** `timer-journey.spec.ts` changed on disk at 10:03 (helper
   renamed `browserWritesTo` with the call sites left behind → the `ReferenceError` that made three of run 1's four
   reds), again at 10:49 and 12:58 and 15:33; `task-work.spec.ts` at 13:01 and 15:35; the shared
   `playwright/helpers.ts` was mid-rewrite at 11:48 and a run at 11:40 died with
   `SyntaxError: helpers.ts: Unterminated string constant. (379:34)` → `Error: No tests found`. Lane-a's app was also
   restarted at 14:31 by a `lane-servers.mjs up lane-a` process that was not mine. Consequences: a number measured
   here can fail to reproduce for someone else, and neither agent's mock request log is a private proof while both
   run. Nothing here reverts the other agent's edits; the committed state is the lane's combined work.

## Open items

This lane also keeps `PLAN.md` (its own record of the mock gaps that decided what was not written, and of the
selectors fixed after measuring). Read it beside this file; the numbers in the tables above are only the runs I
logged.

1. `aside[aria-label="Details"]` is recorded as measuring 0 around the property rows of `/task/<id>` — by
   `task-work.spec.ts`'s header comment and in `PLAN.md` (commits `aae47171b`, `f624061f0`), which is why the rows are
   found from their labels instead. The component still appears to render one
   (`core/components/pages/task/task-detail-page-body.tsx:43,85`, under `(min-width: 1024px)`, viewport 1280×720).
   The lane measured it; **I did not re-measure it myself**, and the five passing tests do not depend on the answer.
2. Decide the `state.taskWrites` question above if task writes ever need a server-side shape witness.
