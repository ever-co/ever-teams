# lane-a — browser journeys through the app's own route handlers

Lane ports: app `http://localhost:3031`, mock `3992`, statistics sink `3993`, control API `3994`, fake issuer `3995`
(`LANE_PORTS` in `playwright/test-servers.ts`). Nothing here names a port; `E2E_LANE=lane-a` is the whole switch.

```bash
export PATH="/e/nvm/.nodejs:$PATH"
export E2E_BROWSER_CHANNEL=chrome
node apps/web/playwright/scripts/lane-servers.mjs up lane-a      # leave running; it prints `ready:` when both answer
node apps/web/playwright/scripts/lane-servers.mjs check lane-a   # the app names its own mock/stats, or MISWIRED
E2E_LANE=lane-a npx playwright test --config apps/web/playwright/playwright.lane.config.ts --grep "<describe title>"
node apps/web/playwright/scripts/lane-servers.mjs down lane-a    # when the lane is done
```

**Before any run, `check` it.** A lane whose `next dev` is wedged keeps its ports LISTENING while it answers nobody,
and every test then dies inside `hardVisit` in a way that looks exactly like an app defect (measured below).

## Status: what has been run, with the numbers copied from the run log

| File                       | Tests | Status as of 2026-11-21 12:30                                                                                                     |
| -------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| `smoke.spec.ts`            | 3     | Discovered, not run by this lane's current owner. `playwright/README.md` treats it as the lane's plumbing proof.                   |
| `timer-journey.spec.ts`    | 4     | **Run 3 times, 0 passed / 4 failed every time.** All four reds are harness-side (a broken helper, then a wedged lane) — see below. |
| `task-work.spec.ts`        | 5     | **Never run.** Its selectors are read off the components (list in the file header); no number is claimed for it yet.              |

`--list` today: `Total: 12 tests in 3 files`. `tsc -p playwright/tsconfig.json --noEmit`: no error in any lane-a file
(the three it had — a `Locator` imported from `fixtures`, an undefined `taskPage`, a helper called with one argument
too many — are gone; the helper half of that was still half-done in the commit this lane inherited, see run 1).

Keep run logs in a file you name (`artifacts/lane-a-<file>-<n>.log`, git-ignored) and write the numbers here:
`--list` **overwrites** `artifacts/playwright-lane-a.json` with an all-skipped report, so list before a run, never after.

## What each file proves, one line per test

`timer-journey.spec.ts` — describe `a timer run from start to stop`:

- *the start the page clicks reaches the mock, which then holds the run* — the click posts the app's own
  `POST /api/timer/start`, the app forwards it to the mock, and the mock's own state says a run exists
  (`mutationProof.startedTimer` and `scenario.timerRunning === true`), with a Bearer token hash attached to that call.
- *the start names the task the timer bar holds and today's plan day* — the body the browser sent carries
  `taskId` = the fixture task, a boolean `isBillable`, and `planDay` = today.
- *the stop ends the run the mock holds, and the status is read again after it* — the stop posts
  `{source:'TEAMS'}` with no `stoppedAt`, the mock flips `scenario.timerRunning` back to false, and the mock's log
  holds a `/api/timesheet/timer/status` read that **started after** the stop landed.
- *a reopened page takes the run from the mock, not from this device* — after `hardVisit` (which clears
  localStorage/sessionStorage), the page still shows the run, so the run came from the mock's answer, and the mock
  logged the status read that page made.

`task-work.spec.ts` — describe `a task edited in its own page` (all five prove the write the app sent, never "the
page now shows it"; see the next section for why the mock cannot show it):

- *picking another status writes the team's own status record* — `PUT /api/tasks/<id>` with
  `status:'in-progress'` **and** `taskStatusId = ids.inProgressStatus`, witnessed by the mock's
  `mutationProof.inProgressTaskStatusPreserved`.
- *picking the status the task already has asks the API for nothing* — picking `open` on a task already `open`
  sends no write at all (`use-update-task.ts:339` early-returns), and the mock's proof stays false.
- *picking an estimate preset writes it as seconds* — the `2h` chip writes
  `{estimate:7200, estimateHours:2, estimateMinutes:0}`, and the task is read again after the write landed.
- *assigning a teammate writes the task's members with that teammate's employee id* — `members` carries
  `id` = employee id and `userId`, beside the member already assigned.
- *unassigning a teammate writes the members without them* — toggling the only member off writes `members`
  without that employee id.

## What the mock can witness, and the gap these files therefore name out loud

The mock's request log is deliberately **body- and header-free** (`cypress/support/mock-gauzy-server.mjs:1041-1048`,
pinned by `tools/performance/mock-gauzy-server.test.mjs`), so from the mock alone "a `POST` to a path happened once"
is all a count can prove — which a request for anything else would also satisfy. Two things close the gap, and every
lane-a assertion uses one of them:

1. **The mock's state, not its count.** `/state` (`helpers.ts` `mockStateWhen`) is where a mutation actually shows
   up: `mutationProof.startedTimer`, `scenario.timerRunning`, `mutationProof.updatedTask`,
   `mutationProof.inProgressTaskStatusPreserved`, `receivedTokens` (sha256 of the Bearer token, per path).
2. **The body, recorded at the page.** `recordWrites` / `recordTaskWrites` log `method`, full `url`, `path` and the
   parsed `postData()` of every non-GET the browser sent, then the test asserts the *shape* (`planDay`,
   `taskStatusId`, `members[].id`, `estimateHours`) and separately that the same path landed on the mock.

**The gap, stated rather than papered over:** for a *task* write the mock holds no state at all —
`mock-gauzy-server.mjs:605-610` answers `PUT /api/tasks/<id>` with the fixture task merged over the body and never
stores it, and `GET /api/tasks/<id>` (`:604`) keeps answering the fixture as it was. So the mock can only confirm
*that* a task write arrived (two booleans), never *what* it changed; a test that asserted "the rail now reads 2 h"
would be asserting the mock's own amnesia. That limit is written into the tests' own messages, and adding a body-
carrying witness (a `state.taskWrites` list beside `mutationProof`, reset with it) is the open follow-up — not done
here because that file is shared with the Cypress suite and the Cypress specs assert `mutationProof` whole-object
equality (`suites/mock/timer-mutation.spec.ts:98-102`).

## Harness conditions measured in this lane today — read these before calling a red a finding

1. **A wedged `next dev` keeps the port and answers nobody.** At 09:54 `curl -m 170 http://localhost:3031/` returned
   `status=000` after 170 s while 3031 was LISTENING (PID 32668, started 08:19), and `lane-servers.mjs check lane-a`
   answered `MISWIRED — no runtime env on http://localhost:3031 — that lane's app is not answering`. The same server
   answered `200` in `0.21 s` at 11:39, and the check answered `MISWIRED` again at 12:3x. `down lane-a` + `up lane-a`
   is the fix; `check` is how you know before you spend 13 minutes on a run.
2. **Both timer runs 2 and 3 (11:12–11:17 and 11:52–12:05) were 4 failed / 4 discovered, every one
   `Test timeout of 180000ms exceeded` at the first `hardVisit`** (`helpers.ts:396-397`, the first `page.goto`), and
   the single test run alone at 12:20–12:23 was the same, 3.2 m — so it was not contention and not the app: the trace
   of that run shows the `goto http://localhost:3031` starting at 2 845 ms and **no network entry ever recorded**.
   That is the wedged-lane signature of item 1, not the timer behaviour.
3. **This machine is genuinely tight**: `FreePhysicalMemory` 3 900 280 KB of 33 473 768 KB at 12:13, with `strata`
   (the local model server) at 12.8 GB working set, this lane's dev server at 698 MB and lane-c's at 585 MB.
   `playwright/README.md:148-156` documents what that does to a red run; before any lane-a red is called a finding,
   re-run the single test with `--grep` and quote both numbers.
4. **This lane's files were edited by more than one agent today.** `timer-journey.spec.ts` changed on disk at 10:03
   (`recordWrites` losing its pattern argument, the helper renamed `browserWritesTo`) and again at 10:49
   (`mockStateWhen { tries: 60 }`, `expect.poll { timeout: 60_000 }`) with no call sites following; the committed
   version therefore threw `ReferenceError: browserWriteTo is not defined` in three of the four tests. `playwright/helpers.ts`
   (shared, not this lane's to edit) was being rewritten at 11:48 and at 11:40 a lane run died with
   `SyntaxError: helpers.ts: Unterminated string constant. (379:34)` → `Error: No tests found`. A red run in that
   window is a broken shared file, not a lane result.
5. **Run 1 (10:04–10:21, log `/tmp/lane-a-timer-1.log`): 4 discovered, 4 failed** — three at
   `ReferenceError: browserWriteTo is not defined` (14.9 s, 10.5 s, 11.8 s, fixed in commit `26d6b12ec`) and the
   fourth at the 180 s timeout in `hardVisit` (3.2 m). The three ReferenceError tests had already got past the shell,
   the enabled start button, the click and the mock's run state, so the app half of those three was working then.

## Open items

- Re-run `timer-journey` (4) against a lane whose `check` says OK, and `task-work` (5) for the first time.
- Run `smoke.spec.ts` (3) here so the lane's own plumbing proof is this lane's, not inherited.
- Decide the `state.taskWrites` question above (shared with Cypress) if task writes need a server-side shape witness.
