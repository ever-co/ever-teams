# lane-c — server-side route handlers, proved through the mock's request log

## Status, and what has actually been run

> **Update, added by the coordinator after the lane finished, because the paragraph below is now out of date.** The
> four guard files have been run, and they are green. The lane's servers were warm (`lane-servers.mjs up lane-c`,
> which now prints `checked: the app on 3033 names its own mock 4002 …` before `ready:`), and the run was:
>
> ```
> E2E_LANE=lane-c E2E_BROWSER_CHANNEL=chrome npx playwright test --config apps/web/playwright/playwright.lane.config.ts \
>   permission-guard session-guard session-check foreign-id-scope
> ```
>
> whose real summary lines were `Running 96 tests using 1 worker` and `96 passed (26.2s)` — 0 failed. Per file, from
> the same log: `permission-guard` 26, `session-guard` 47, `session-check` 15, `foreign-id-scope` 8. That matches the
> discovered counts below exactly, so nothing in those four files was skipped.
>
> **Still not executed:** `cache-directive` (10), `malformed-json` (43), `media-type` (41), `public-link-shape` (18)
> — 112 tests discovered, no pass/fail number claimed for them.
>
> **Superseded, same day:** all eight files have now been run, and so has the lane as one suite. Last whole-lane run,
> read from its log: `Running 209 tests using 1 worker` / **`209 passed (1.1m)`**, 0 failed — `Total: 209 tests in 8
> files` in the `--list` that brackets it. Batch-by-batch numbers, the one file that was red and why, and the two
> episodes where the lane's own app stopped answering are in "Batch by batch, then the whole lane in one run" below.

### Executed on 2026-11-21 by lane-c (the four unrun files above, one at a time)

`cache-directive.spec.ts` — **run, 10 discovered / 10 passed / 0 failed**, summary lines `Running 10 tests using 1
worker` and `10 passed (2.4s)`; log kept at `artifacts/lane-c-cache-directive-4.log` (git-ignored, so the numbers are
written here as well). Nothing was skipped and nothing was red: the file's five pinned "no directive" / "not marked"
assertions are now what a run reported, not what the source predicted.

**The answer to open item 2 below, and to `AUDIT.md` 15's UNVERIFIED question:** a Next 16 **dev** `app/api/**`
handler answer carries **no `Cache-Control` of its own** in this lane. Proved by the contrast inside one run against
one dev server: `/api/tasks/<task>`, `/api/organization/<org>`, `/api/auth/workspaces` and `/api/task-statuses` all
answered 200 with `cache-control` **absent from the response headers**, while `/api/auth/sessions`,
`/api/embed-credentials` and `/api/invoice-payments/connection` — the same server, the same `forwardToGauzy` helper —
answered with `cache-control: no-store`. `base-server.js`'s dev branch (`node_modules/next/dist/server/base-server.js:1305-1307`)
therefore never ran for these routes, or ran and was overridden; either way the directive present on three answers and
absent on four can only come from the route's own `options.noStore` (`core/services/server/forward-to-gauzy.ts:26`).
Second half of the same measurement: the mock stamps `cache-control: no-store` on **every** answer it gives
(`cypress/support/mock-gauzy-server.mjs:991`), and none of it reached the browser through the proxy —
`answerHeaders` (`forward-to-gauzy.ts:22-28`) copies the upstream's `Content-Type` and nothing else. So "the mock said
no-store" is not what these green pins rest on.

`public-link-shape.spec.ts` — **run, 18 discovered / 18 passed / 0 failed as written** (`Running 18 tests using 1
worker` / `18 passed (3.4s)`, log `artifacts/lane-c-public-link-shape-1.log`), then **rewritten and re-run: 19 / 19
passed** (`19 passed (9.9s)`, log `artifacts/lane-c-public-link-shape-3.log`). The first run was green and *wrong*:
two of its titles claimed something the app does not do, which a probe of the same routes plus the mock's own request
log made visible. What the app actually does, measured:

- **The invoice half is exactly as the file claimed.** Seven malformed shared-invoice links each answered
  `400 {"message":"Invalid link"}` with `cache-control: no-store` and **the mock asked nothing** — a refusal made
  here. Same for the malformed payment link and for four bad `returnUrl` bodies (`400 "Invalid return address"`, empty
  log), and a well-shaped link is forwarded untouched (`GET /api/public/invoice/<uuid>/<token> 200` in the log, with
  `relations=…` on the query).
- **Finding (a guard a fetched URL cannot reach).** A path segment that *is* a dot segment — `.`, `..`, `%2e`,
  `%2e%2e`, or an empty segment — is removed (or left unmatched) by the URL parser **before Next routes anything**, so
  the answer is Next's own **404 `text/html`** not-found page and the mock is asked nothing. Measured on
  `/api/public/saved-reports/%2e%2e`, `/…/%2e`, `/api/public/saved-reports/`,
  `/api/public/team/fixture-team/%2e`, `/api/public/team/fixture-team/..`, `/api/public/team//<uuid>` and
  `/api/public/invoice//<token>`. Consequence, stated as a limit rather than as a defect: the `400 Invalid link`
  of `saved-report-proxy.ts:139` and the `400 Invalid profile link or team` of
  `app/api/public/team/[profileLink]/[teamId]/route.ts:17` are **not what a caller gets** for those inputs on this dev
  server — the refusal happens one layer above the handler. Whether a production deployment answers the same way is
  not proved here; what is proved is that no request of that shape ever reached the handler in this lane.
- **Finding (the walking id is forwarded, not refused).** A `..` that an encoder left inside one segment passes both
  guards and is handed upstream verbatim, answered **200**: the mock recorded, exactly,
  `GET /api/public/team/fixture-team/..%2F..%2Fuser%2Fme 200`,
  `GET /api/public/team/..%2F..%2F/3333… 200`, `GET /api/public/team/..%2F/3333… 200` and
  `GET /api/public/saved-reports/..%2F 200`, `GET /api/public/saved-reports/a%2Fb%2Fc 200`. The route's guard is
  `segment === '.' || segment === '..'` only (`…/team/.../route.ts:17`), and `../../user/me` is not that. What keeps
  it inside its own prefix is the **re-encoding in the request builders**
  (`core/services/server/requests/public-organization-team.ts` and `…/saved-reports.ts:95`, each
  `encodeURIComponent`-ing the decoded id into one single segment) — the upstream was never asked for `/api/user/me`.
  The test that used to claim "refused before the team is asked for" now pins those five recorded paths and the absence
  of any entry outside its prefix, and says which of the two defences did the work.
- Pinned defect 1 stays pinned and confirmed: `GET /api/public/team/fixture-team/<teamB>` answered 200 with
  **no `Cache-Control`**, and the mock answered its own fixture team A for a team-B id (mock gap, unchanged).

**Harness note, worth repeating before anyone reads a red cache run as an app bug:** the *first* run of this file (log
`artifacts/lane-c-cache-directive-1.log`) was **10 failed**, every one `TimeoutError: apiRequestContext.fetch: Timeout
60000ms exceeded` at `api-fixtures.ts:90`, and every one of them a dead lane, not a defect: `lane-servers.mjs check
lane-c` afterwards answered `MISWIRED — no runtime env on http://localhost:3033 — that lane's app is not answering`,
and `lane-servers.mjs down lane-c` found two half-dead processes still holding 3033 and 4002–4005. After
`down` + `lane-servers.mjs up lane-c` the same 10 tests passed in 2.4 s. Free RAM at the time was 3.0 GB of 34.3 GB with
`lane-a`'s `next dev` also listening on 3031 — the starved-machine signature `playwright/README.md:148-156` documents. A
lane that sees a wall of identical 60 s timeouts must re-check its own servers before it reads a single finding.

**And the same trap a second time, with a cause worth writing down.** `public-link-shape` was run once more in the middle
of the rewrite and came back **`19 failed`** — the first case at `1.0m` (the 60 s fetch ceiling of `api-fixtures.ts:101`)
and the rest failing in ~20 ms each, which is the shape of a refused connection, not of a defect. `lane-servers.mjs check
lane-c` again answered `MISWIRED — no runtime env on http://localhost:3033`. The servers had been started with
`up lane-c` **inside the agent's own shell task**, and when that task was reaped the whole tree went with it: Playwright
reuses an already-listening lane server (`reuseExistingServer: true`) and never restarts it. A lane's warm servers must
therefore be started **detached from the agent's shell** — on this PC
`powershell -NoProfile -Command "Start-Process -FilePath node -ArgumentList 'apps/web/playwright/scripts/lane-servers.mjs','up','lane-c' -WorkingDirectory 'E:\Coding\ever-teams' -WindowStyle Hidden -RedirectStandardOutput … -RedirectStandardError …"`
followed by `check lane-c` waiting for `checked:` / `ready:` — and `check` re-run before every batch. The rewritten file
then ran `19 passed (9.9s)` on the same machine, unchanged except for the servers.

`media-type.spec.ts` — **run on a healthy lane, 41 / 41 passed, no change to the file needed**: `Running 41 tests using
1 worker` / `41 passed (6.5s)` (log `artifacts/lane-c-media-type-1.log`). Independently of the batch run below, this
file is green under two writers: 36 declared-type probes answered 415 `message: "Unsupported Media Type"` with an empty
mock log, the untyped-body pair answered 415, `application/json; charset=utf-8` forwarded once, a GET naming
`text/plain` forwarded, a cross-site form post answered the **403 origin refusal rather than the 415**, and
`POST /api/user-api-tokens` answered 415 with the mock asked nothing — its own `isJsonRequest` gate before any session
read. Only a run-provenance paragraph was added.

`malformed-json.spec.ts` — **re-run here to verify the blocker list another writer filled: `Running 43 tests using 1
worker` / `43 passed (5.1s)`** (log `artifacts/lane-c-malformed-json-1.log`). Every pinned `MALFORMED_BLOCKERS` status
is an exact `.toBe()` and every pinned case also asserts `mock.calls(path) === []`, so a green 43 is the blocker list
holding, not a ceiling passing. Cross-checked the entries against the handlers and against the dev server's own log
(`apps/web/.next-lane-3033/dev/logs/next-development.log`, the only file in that directory): `app/api/email-reset/
request-change-email/route.ts:13` is `const { email } = (await req.json())` with no `catch`, and the log carries
`⨯ TypeError: Cannot destructure property 'email' of '(intermediate value)' as it is null.`; `validate-by-code/route.ts:8,10`
(`await req.json()` first, then `validateForm(['code','email'], body)`) matches `⨯ TypeError: Cannot read properties of
null (reading 'code')` and `⨯ TypeError: Cannot create property 'code' on string 'a string instead of an object'`;
`organization-team/route.ts:24,45-46` catches into `{"error":"Failed to process request"}` 500; `task-statuses/route.ts:32,37-39`
catches a parse failure into `$res('Error creating task status')`, which on the signed-in path is the success answer.
None of these is a mock gap: the mock was asked nothing in every pinned case, so the throw happened in this app.

`session-guard.spec.ts` (the coordinator's `LANE_PORTS` edit, run here rather than by them) — **47 tests discovered,
before and after that edit** (no test was added or removed by it). First run: `Running 47 tests using 1 worker` /
**`2 failed`, 45 passed (2.1m)**, both reds the last two cases and both `TimeoutError … 60000ms` — the lane's app died
mid-run (see the harness note below), not the edit. Isolated: `--grep "is not the operator by right of the cookie|the
app origin is the origin these routes consider their own"` → `Running 2 tests using 1 worker` / `2 passed (2.1s)`.
Whole file on a healthy lane: `Running 47 tests using 1 worker` / **`47 passed (8.5s)`** (log
`artifacts/lane-c-session-guard-2.log`), including the new `the app origin is the origin these routes consider their own`
case at `session-guard.spec.ts:203`. Contended-vs-isolated, as `playwright/README.md:148-156` asks: 60 s timeout each
against 700 ms and 328 ms.

### The lane's app died a third time, and the pipe theory does not explain it

`artifacts/lane-c-servers-detached.log` shows the lane came up healthy at 13:13 (`checked:` then `ready:`), and the run
that died did so **5 seconds in**: 45 tests passed in about 5 s, then two 60 s fetch timeouts, and afterwards
`lane-servers.mjs check lane-c` reported MISWIRED while `down lane-c` found **nothing listening on any of 3033, 4002,
4003, 4004, 4005** — the mock and the control API were gone with the app, not just the app. This start was launched
with PowerShell `Start-Process … -RedirectStandardOutput <file> -RedirectStandardError <file>`, so the server's stdout
and stderr went to **files, not to an unconsumed pipe**, and `…-detached.err` is empty; `next-development.log` ends in
the middle of its normal every-5-second `ever_stats.send outcome=sent status=202` INFO stream, with no crash line. So
the unconsumed-pipe back-pressure recorded above is a real hazard for `spawn(command, { shell: true })` with no
`stdio`, but **it is not what killed this run**, and whatever did kill it is still unnamed. Free RAM at the time was
5.29 GB of 34.3 GB, so memory pressure is not an obvious answer either. What is safe to say: every red in this lane's
runs on 2026-11-21 was traced to a lane that had stopped answering, and no app finding rests on any of them.

Written before `a7662a764` landed, so read it against that fix rather than against it: this start **already** had the
shape the fix produces (the server's output going to files), and the lane still stopped mid-run. If a lane dies again
with `artifacts/lane-lane-c-server.log` present and ending mid-stream, the unread-pipe explanation is spent and the
next thing to look for is whatever ends the `lane-servers.mjs` process itself — `down <lane>` finding *every* one of
its five ports empty is the tell that the tree went together.

### The `POST /api/organization/history/bulk` carry-over hazard: not reproduced, and the route is not in this tree

Timeboxed attempt, 2026-11-21, exactly as asked (two different payloads to the same route in two separate runs, warm
`distDir`, nothing deleted anywhere):

1. **The route does not exist here.** `grep -rln "history/bulk" --exclude-dir=node_modules --exclude-dir=.git
   --exclude-dir=.next-lane-3033 --exclude-dir=.next .` over the whole repo returned **nothing**, and the only
   `app/api` paths containing `history` are `app/api/timesheet/time-log/history/route.ts` and
   `app/api/timesheet/time-log/[id]/history/route.ts`. So the answer reported by an earlier run for
   `POST /api/organization/history/bulk` — 201 carrying `{"ids":["pinned"]}` — cannot be re-run against this working
   tree. Either the route was removed since that run or the path was something else; this lane found no route to pin.
2. **The suspected carrier is not there.** `<distDir>/dev/logs/` for this lane
   (`apps/web/.next-lane-3033/dev/logs/`) holds exactly **one** file, `next-development.log` (106,685 bytes), and a
   grep of it for `pinned` returns 0. There is no boundary-payload file in that directory to serve a previous run's body.
3. **Carry-over tested live, on a route that does exist.** `POST /api/chat/conversations` (a `forwardToGauzy` proxy,
   and the mock echoes a POST body, so the bytes that travelled are visible): marker `ALPHA-111` then marker
   `BRAVO-222` in the same dev-server process answered `{"marker":"ALPHA-111"}` and `{"marker":"BRAVO-222"}`
   respectively; then the lane was restarted (`down lane-c` + `up lane-c`, `.next-lane-3033` left warm — the exact
   "kept between runs" state) and `CHARLIE-333` answered `{"marker":"CHARLIE-333"}`, `carries ALPHA? false`,
   `carries BRAVO? false`, with a mock log holding only the new call.

**It did not reproduce.** No cache-deleting code was added anywhere; nothing was deleted from any build directory.

### Batch by batch, then the whole lane in one run (lane-c, 2026-11-21)

Every summary line below was read out of a run's own log (`/e/Coding/.tmp/lane-c-*.log` on this machine, kept outside
the repo because `artifacts/` is git-ignored). The lane's servers were warm from `lane-servers.mjs up lane-c`, whose
`checked:` line confirmed the app on 3033 names its own mock 4002 / stats 4003.

| batch (`--grep` of the describe) | summary lines as printed |
| --- | --- |
| `permission-guard` | `Running 26 tests using 1 worker` / `26 passed (15.5s)` |
| `foreign-id-scope` (both describes, one `--grep` with `\|`) | `Running 8 tests using 1 worker` / `8 passed (4.7s)` |
| `session-check` | `Running 15 tests using 1 worker` / `15 passed (21.4s)` — includes the 17.1 s stalled-check case |
| `cache-directive` | `Running 10 tests using 1 worker` / `10 passed (3.3s)` |
| `public-link-shape` | `Running 18 tests using 1 worker` / `18 passed (9.8s)` |
| `media-type` | `Running 41 tests using 1 worker` / `41 passed (6.1s)` |
| `session-guard` | `Running 47 tests using 1 worker` / `47 passed (9.6s)` |
| `malformed-json`, first pass | `Running 43 tests using 1 worker` / **`7 failed`, 36 passed (14.1s)** — all seven explained below |
| `malformed-json`, after the fix | `Running 43 tests using 1 worker` / `43 passed (3.5s)` |
| **whole lane, no `--grep`** | `Running 209 tests using 1 worker` / **`209 passed (1.1m)`** |

Two counts moved while the lane ran, because the lane was edited by another writer at the same time (see "lane-c had a
second writer during this run"): `session-guard` went 47 → 48 and `public-link-shape` 18 → 19, so the last `--list` of
the day is `Total: 209 tests in 8 files` and the whole-lane run above is the number to quote. The per-batch lines are
kept as they were printed, including the 47 and 18 that were true when those batches ran.

**A `--grep` lesson, because it silently shrinks a batch:** two `--grep` flags on one command are not an OR — the last
one wins, so the first attempt at `foreign-id-scope` printed `Running 2 tests` (only the second describe matched) and
looked like a green 2/2. One `--grep` with `|` between the describe titles is the shape that selects both.

### lane-c had a second writer during this run

`session-guard.spec.ts` (11:04), `cache-directive.spec.ts` (11:58) and this file (12:16) changed under the lane while
its tests were running — the origin test derived from `LANE_PORTS` instead of the literal `http://localhost:3033`, the
`cache-directive` upstream assertion narrowed from "the whole log is non-empty" to `mock.calls(route.path)` equal to
that route's own triple, and one test appeared in `public-link-shape`. Nothing here conflicts with those edits; the
warning is for the next reader: **the lane's files were being edited by two agents at once**, so a per-file count in an
older paragraph of this file can disagree with a newer run by exactly one test.

### The 25 reds that were the lane's wiring, not the app

The first batch after the first warm-up printed `25 failed / 1 passed (47.7s)`, every failure the same text:
`answered 502 {"statusCode":502,"message":"The Gauzy API is unreachable"}` (`core/services/server/forward-to-gauzy.ts`)
read as "the fixture role was allowed through". Read against the harness it was a dead upstream port:

- `curl http://127.0.0.1:4004/health` → `{"ok":true,"gauzy":"http://127.0.0.1:4002",…}` — the mock was healthy;
- `curl http://127.0.0.1:4002/api/role-permissions/me` → 200 with the fixture permissions;
- `curl http://127.0.0.1:3988/api/role-permissions/me` → nothing listening (canonical mock, off);
- `GET http://127.0.0.1:4004/requests` → `[]` — the app never reached the mock at all.

The app on 3033 had been started by the pre-fix `lane-servers.mjs`, whose `laneServers` derived its origins from
constants resolved before `E2E_LANE` was set, so it dialled 3988. After the harness fix and `down` + `up lane-c` the
same 26 tests printed `26 passed (15.5s)` with no change to the spec file. Two green runs of the same file, one with
`netstat` looking healthy both times: the check to trust is the lane's own `check lane-c`, not the port table.

### The lane's app died twice mid-run (and one latent hazard in `lane-servers.mjs`)

Both times `netstat` showed 3033 listening and the mock answering, while `lane-servers.mjs check lane-c` said
`MISWIRED — no runtime env on http://localhost:3033 — that lane's app is not answering`, and a Playwright batch
started printing 60 s `apiRequestContext.fetch` timeouts (`api-fixtures.ts:90`) instead of answers:

1. after seven green batches plus a re-run of `malformed-json` (so: while a wall of handlers was logging parse
   errors), and
2. inside the first whole-lane attempt, around test 149 of 209 (`session-check` cases), which is why that attempt was
   stopped rather than reported.

Free RAM at the time was 3.34 GB of 33.4 GB with lane-a's `next dev` holding 718 MB and lane-c's 902 MB — the
starved-machine signature `playwright/README.md` documents. `down lane-c` + `up lane-c` restored the lane both times
and the same tests went green in seconds, so **no finding is claimed from either episode**.

Worth checking before anyone spends a night on it: `lane-servers.mjs` starts its servers with
`spawn(server.command, { cwd, env, shell: true })` and **never reads the child's stdout/stderr** (no `stdio: 'inherit'`,
no data handler). Node documents that unconsumed pipes back-pressure the child, and a 30-line synthetic test proved the
mechanism on this machine: a `node` child spawned that way, writing 300 KB to stdout and then a marker file, neither
wrote the marker nor exited within 4 s. A `next dev` that has printed enough route errors to fill the ~64 KB pipe is
the same shape — alive, listening, and frozen on its own log line. `lane-servers.mjs` is on this lane's never-edit
list, so it is reported rather than fixed here.

The paragraph below is kept as it was written, because it records what the lane knew at the time and how it knew it.
Everything below is from reading the handlers and from the one
command this machine allowed (memory gate: lane-a's `next dev` was up and free RAM was ~2.4 GB at the time):

```
export PATH="/e/nvm/.nodejs:$PATH"
cd /e/Coding/ever-teams
E2E_LANE=lane-c npx playwright test --config apps/web/playwright/playwright.lane.config.ts --list
```

whose last real line was, verbatim (re-run after the last edit to `permission-guard.spec.ts`):

```
Total: 208 tests in 8 files
```

and its per-file counts, from the same log: `cache-directive` 10, `foreign-id-scope` 8, `malformed-json` 43,
`media-type` 41, `permission-guard` 26, `public-link-shape` 18, `session-check` 15, `session-guard` 47.

`--list` compiles every spec and discovers its tests without starting a server, which is how the load-time error the
predecessor left was found and fixed. Its counts are **discovered tests, not executed tests** — no pass/fail number is
claimed anywhere in this file.

### The load error that was fixed

`suites/lane-c/permission-guard.spec.ts` threw at load, before a single test ran:

```
ReferenceError: ids is not defined
   at lane-c\permission-guard.spec.ts:45
  43 | 		path: (ids) => `/api/organization/${ids.organizationA}/counts`,
> 45 | 		guardedEndpoint: `/api/organization/${ids.organizationA}/counts`
Total: 0 tests in 0 files
```

`path` was a function of the fixture ids but `guardedEndpoint` was a template literal evaluated when the module was
imported, where no fixture has been read. Fixed by making **both** functions of `ids` (the row type now reads
`path: (ids) => string` and `guardedEndpoint: (ids) => string`), keeping the table, and adding a stable `pattern`
field (the route as it is on disk) that the test titles and the summary test select rows by — so a probe that no
longer matches a row fails as a missing row instead of `undefined`.

## Run command, and the queue this lane wants executed

```
export PATH="/e/nvm/.nodejs:$PATH"
cd /e/Coding/ever-teams
E2E_LANE=lane-c E2E_BROWSER_CHANNEL=chrome npx playwright test --config apps/web/playwright/playwright.lane.config.ts --grep "<describe>"
```

Lane ports (never touched otherwise): app 3033, mock 4002, statistics sink 4003, control API 4004, fake issuer 4005,
build dir `.next-lane-3033`. Kill them when the batch ends:
`netstat -ano | grep LISTENING | grep -E ":3033|:4002|:4003|:4004|:4005"` then `taskkill //F //T //PID <pid>`.

Per-describe counts below are the real ones from that same `--list` run (they add to 203), grouped so each batch is a
whole file.

Ordered queue — cheapest first, and each one answers a question the next one depends on:

1. `--grep "a permission-guarded route refuses the fixture role itself"` — 21 tests. First, because it is the file
   that was broken and the shape claims (401 with an empty log, 403 after exactly one permission read) are the ones
   the other files borrow.
2. `--grep "a route forwards the ids its caller named" --grep "a proxied read that takes an id from the path asks for exactly that id"` — 6 + 2 tests, `foreign-id-scope.spec.ts`. Cheap, and its walking-segment counts are the thing most likely to need a small correction.
3. `--grep "a route guarded by the session check asks the API who the caller is"` — 15 tests,
   `session-check.spec.ts`. **Contains one 16-second test** (the stalled session check) — budget ~20 s for it.
4. `--grep "a route that asks for no-store answers with it" --grep "the refusals of the same proxy are not marked, pinned rather than approved" --grep "a read of this tenant’s data answers with no caching directive"` — 4 + 2 + 4 tests, `cache-directive.spec.ts`. If Next's dev server itself writes a `Cache-Control` on these answers, the four "no directive" pins fail and have to be re-read against what a *production* answer would be — see "pinned defects" and open item 2.
5. `--grep "a shared link that is not shaped like a link is refused here" --grep "the shared invoice checkout takes only a return address it recognises" --grep "the public team read"` — 12 + 4 + 2 tests, `public-link-shape.spec.ts`.
6. `--grep "a write whose body is not JSON is refused before it is read"` — 41 tests, `media-type.spec.ts`.
7. `--grep "a signed-out caller is refused by the route, not by the API"` — 47 tests, `session-guard.spec.ts`.
8. `--grep "a mutating route answers a body that is not the object it expects"` — 43 tests, `malformed-json.spec.ts`.
   **This run is what fills `MALFORMED_BLOCKERS`**: its annotations (`observed-status`) name the status each case
   produced, and the failures name the handlers that 5xx. Expect red here on purpose until the blockers are pinned
   from the real numbers. It also contains one 2 MB-body test.

## What each file pins

All files follow the same three shapes: a refusal that produced **no** upstream call (`mock.requests()` is `[]`); a
permission or session read that happened and **then** a 4xx; or the guarded endpoint being called, which is the leak.

### `permission-guard.spec.ts` — 19 guarded routes, 21 tests

The twenty handlers under `app/api` that call `refuseWithoutPermission` / `refuseUnlessPermitted` (found with
`grep -rl "refuseWithoutPermission\|refuseUnlessPermitted" app/api --include=route.ts`; 20 files, one of them the two
verbs of `/api/invoices/[id]` counted separately) — export, organization counts/soft-delete, the invoice family,
invoice-item bulk, invoice-schedules, organization-contact, timer/started-at. For each: signed-out → 401 and the mock
was asked nothing (the permission read *is* a `forwardToGauzy` call, so it is itself refused before it leaves);
signed-in with the fixture role → 403 `Forbidden resource` after exactly one `GET /api/role-permissions/me 200`, and
no call to the guarded endpoint. Plus the "five routes, five reads, nothing else" summary and the 401-before-403
message check (a signed-out caller is not told which permission the route wanted).

The fixture role holds `TIME_TRACKER, ORG_TASK_ADD, ORG_TASK_EDIT, ORG_INVITE_EDIT, ORG_EMPLOYEES_EDIT`
(`mock-gauzy-server.mjs` `buildData`); every permission these routes ask for is outside that list
(`INVOICES_VIEW`/`INVOICES_EDIT`, `ALL_ORG_EDIT`, `EXPORT_ADD`, `ORG_CONTACT_*`, `ALLOW_MODIFY_TIME`), so **every case
here is a refusal**. This file therefore cannot show the guard *letting* someone through — see mock gaps.

### `session-guard.spec.ts` — 38 proxy routes + 6 named cases, 44 tests

Every one of the 38 is a `forwardToGauzy` handler or an `ever-platform` handler whose `routeSession()` reads the
cookie before anything else (verified per file). Signed-out → 401 `Unauthorized` **and the mock log is empty**, which
is the difference between "this app refused" and "the API refused for it". Plus: a session whose cookies name
everything except the token; a nonsense `auth-token_totalChunks`; and three cases pinned *rather than approved* about
what the write guard does not cover — `refuseForeignWrite` exempts GET and HEAD (`same-origin-request.ts` line 44),
so a cross-site **read** of the session's own data is forwarded, and a client that sends neither `Origin` nor
`Sec-Fetch-Site` is not refused *as cross-site* at all (which is also what this suite's own calls are).

### `media-type.spec.ts` — 9 proxied writes × 4 declared types + 6 named cases, 42 tests

`forwardToGauzy` refuses a declared type that is not `application/json` before reading the body (line 104), and a body
that arrives with no declared type after reading it (line 107): 415 `Unsupported Media Type`, with the mock asked
nothing. The order is pinned too: a cross-site form post gets the 403 origin refusal, not the 415, and nothing of the
body is examined. `POST /api/user-api-tokens` is the one route in the family whose own gate (`isJsonRequest`, before
`authenticatedGuard`) answers 415 without even making the session check — proved by an empty mock log, which
distinguishes it from every guard-backed route.

### `public-link-shape.spec.ts` — 15 tests

The six `/api/public/*` handlers answer without a session, on a link that lives in the URL, and their whole local
defence is shape: `isSharedInvoiceLink` (id must match a UUID pattern, token must be three `A-Za-z0-9_-` parts) and
`isPaymentReturnUrl` (http(s), no credentials, `/shared-invoice` path, origin when the client reports one), with every
answer marked `no-store`. Malformed links are refused with 400 `Invalid link` and **no** upstream call.

Two assertions were rewritten from the predecessor's version, because the mock cannot support them (see mock gaps):

- the public team read no longer claims the answered row is tenant B's — the mock answers its *own* fixture team for
  any id in the path. It now pins the forwarded pair (`/api/public/team/fixture-team/<teamB>` in the mock's log) and
  the mock's own answer, with a message that says a change there means re-reading the case.
- its cache-control assertion is now a **pinned defect** (below), not an expectation.

### `session-check.spec.ts` (new) — 10 guarded routes + 5 named cases, 15 tests

`core/services/server/guards/authenticated-guard-app.ts` is the opposite half of the session story: it takes the
cookie token (`access_token?.toString() || ''`), calls `GET /user/me` anyway, and `serverFetch` **omits the
`authorization` header entirely** when the token is empty (`fetch.ts` line 91). So for these routes the honest claim is
*where the decision lives*: the mock log shows `GET /api/user/me 200` and `state.receivedTokens` shows **no** bearer —
this app asked who the caller is about a caller it held no credential for, and answered with the API's answer rather
than refusing. Pinned per route with a message that a 401 here would mean the refusal came from upstream.

Also pinned, all through the sha256 the mock records (never the token): the token that reaches the API is exactly the
cookie's token; the same token is checked **once** across three routes (`SessionCheckMemo`, 5 s default); a second
workspace's token is checked separately; `GET /api/livekit` (which passes `{ fresh: true }`) pays its own check even
after the memo answered for that token, and even though the route then refuses for a missing `roomName` (400); and a
session check that never answers is a **503**, never a 401, so a stalled API does not cost the person their session.

Every test in this file signs in with its own `jti`: the memo belongs to the dev-server process and `mockReset()` does
not clear it, so a fixed token would let one test be answered by another test's check.

### `foreign-id-scope.spec.ts` (new) — 8 tests

The ids a caller names are sent along. `getTeamProjectScope` hands `organizationTeamId` and `projectId` straight into
the upstream query; `proxyListSavedReports` prefers the query's `organizationId` over the session's own cookie
(`searchParams.get('organizationId') ?? organizationId`) and then authenticates the read with this session's bearer;
`forwardToGauzy` forwards `new URL(req.url).search` untouched, so a caller may name another tenant's ids and they all
travel with this session's token (both halves proved: the query the mock recorded, and the bearer's hash). The other
half is pinned too, because it is real: `/api/task-statuses` builds `tenantId` from the guard's cookie, so a caller
`?tenantId=` never replaces the session's tenant, and a `path` id is `encodeURIComponent`-ed so a walking-looking id
never reaches the collection path (`/api/organization`) or another endpoint — proved on the mock's recorded paths.

### `malformed-json.spec.ts` (new) — 10 routes × 4 shapes + 3 named cases, 43 tests

Bodies that are well-formed HTTP and useless as data — `null`, `[]`, `"a string"`, text that is not JSON, all sent
with a JSON content type. This is the third probe of the same handlers and is deliberately not the sweep: `sweep.spec.ts`
sends `{}`, `empty-body.spec.ts` sends no body at all, and neither sends `null` to a handler that destructures
(`const { email } = await req.json()` → `TypeError` where the same line survives an empty body). Each case annotates
the status it observed, exactly as the empty-body sweep does, so the blocker list is rebuilt from a report.
`MALFORMED_BLOCKERS` is **empty until a run fills it** — that is the file's main open item.

Already read out of the source and pinned as a named test: `POST /api/task-statuses` wraps its `await req.json()` in a
`try` whose `catch` answers `$res('Error creating task status')`, and on the signed-in path `$res` is the *success*
answer — so a body this app cannot parse is answered **200** and the client's `!response.ok` never fires. Pinned with
the exact status and body, so fixing it to a 4xx fails this file.

Also pinned: the proxy family never parses a body declared as JSON (line 106 hands `req.text()` to `fetch` at 112), so
non-JSON bytes reach the upstream as they are; and a 2 MB body is answered without a 5xx on one proxy route and one
guard route (whether it *reached* the API is recorded as an annotation, because both answers are answers).

### `cache-directive.spec.ts` (new) — 9 tests

Three habits sit next to each other and only one is consistent. `forwardToGauzy` writes `Cache-Control: no-store` only
when the route asks (`answerHeaders`, lines 22-28; eleven routes pass `{ noStore: true }`). The Ever Platform helpers
and the shared-link proxies mark every answer. `refuseForeignWrite` marks its 403, while the 401 (line 96) and the 415
(line 104/107) of the same proxy do not. Four reads that answer a tenant's own rows (`/api/tasks/<task>`,
`/api/organization/<org>`, `/api/auth/workspaces`, `/api/task-statuses`) carry no directive at all. Each of those four
asserts the body first (`text` contains the session's tenant id), so the finding names the data at risk rather than
only the missing header.

## Pinned defects (red-by-design, in the harness's blocker style)

Each is asserted as *what the route answers today*, with a message that says why that is a defect and that the pin and
the fix have to be removed together. **Items 2 and 3 are now confirmed by a run** (the 2026-11-21 `cache-directive`
run above: 10/10 green, and the header string each case names is the one the response carried). Item 1 was still
unconfirmed at the time of writing; its own run's numbers are recorded above as each file finishes.

1. `GET /api/public/team/<profileLink>/<teamId>` answers a team's members, tasks and last worked task with **no
   Cache-Control** (`NextResponse.json(response.data)` in its route file). Pinned in `public-link-shape.spec.ts`.
2. The proxy's own 401 and 415 carry no `Cache-Control`, while its 403 does. **Confirmed 2026-11-21**: the 401 of
   `GET /api/chat/conversations` (no cookies) and the 415 of `POST /api/chat/conversations` with
   `content-type: application/x-www-form-urlencoded` both answered with `cache-control` absent; the 403 of a cross-site
   `POST /api/chat/conversations` answered `cache-control: no-store` (`same-origin-request.ts:51`).
3. Four authenticated reads of this tenant's rows answer with no `Cache-Control`. **Confirmed 2026-11-21**, all four
   200 with the tenant's own rows in the body and `cache-control` absent.
4. `POST /api/task-statuses` answers a body it cannot parse as **200 `"Error creating task status"`**. **Confirmed
   2026-11-21** (`43 passed` run), with the mock log beside it: the only thing that handler asked was `GET /api/user/me`,
   never `/api/task-statuses`. It is the *only* handler in the sweep whose parse failure is answered as a success, and
   it needed the byte-delivery fix below to be visible at all.
5. **The malformed-body sweep's predicted shape is real, and it is 14 wide.** `MALFORMED_BLOCKERS` in
   `malformed-json.spec.ts` now names each with the status a run printed — all 14 are **500**, all with an empty body
   except `organization-team`'s `{"error":"Failed to process request"}`, and every one of them proved *here*: the mock
   recorded no call to the endpoint the handler guards (its session read `GET /api/user/me` is expected, and is pinned
   in `session-check.spec.ts`).

   | handler | 500 on | answers a 4xx instead on |
   | --- | --- | --- |
   | `POST /api/email-reset/request-change-email` | `null`, not-JSON | `[]`, a bare string → 200 `{}` |
   | `POST /api/email-reset/verify-change-email` | `null`, not-JSON | `[]`, a bare string → 200 `{}` |
   | `POST /api/invite/validate-by-code` | `null`, a bare string, not-JSON | `[]` → 400 with field errors |
   | `POST /api/organization-team` | `null`, not-JSON | `[]`, a bare string → 400 `{"errors":{"name":"Invalid team name !"}}` |
   | `POST /api/organization-projects`, `POST /api/daily-plan`, `POST /api/favorite`, `POST /api/issue-types`, `PUT /api/employee/[id]` | not-JSON | `null`, `[]`, a bare string → 200, forwarded |

   Two findings sit next to the 500s and are worth whoever fixes them reading together: (a) `validateForm`
   (`core/lib/helpers/validations.ts:62`) writes back what it trims, `data[key] = …`, which is a TypeError on `null`
   *and* on a string primitive — the same helper that returns tidy field errors for an array; (b) the handlers that do
   not crash answer 200 having forwarded a body that was never an object (`POST /api/email-reset/request-change-email`
   with `[]` reaches the API with `email` undefined and answers `{}`), which is why "no 5xx" is not the whole claim
   these routes have to satisfy. The two `email-reset` handlers are the ones that answer 200 `{}` on a body with no
   `email`/`code` in it at all — recorded, because the 200 is what the mock log proved, not what was expected.
6. **The Playwright request layer re-encodes a body that is not valid JSON** when the request declares
   `application/json`. Not an app defect, but a fact every future body-validation test in this repo has to know: sent
   as a string, `{"name": ` arrived at `app/api/task-statuses` as a JSON *string*, the parse succeeded, the body was
   forwarded and the answer was 200 with the status list. Sent as a `Buffer`, the same bytes produced the handler's
   real parse path. `malformed-json.spec.ts` sends bytes for this reason and says so at the top of the file.

## What the mock cannot answer (recorded instead of invented)

- **It answers every path.** `routeResponse` ends with `DELETE → {affected:1}`, `not GET → body ?? {success:true}`,
  `GET → pagination([])` (lines 792-794), so a forwarded call is always visible in the log even where the mock models
  nothing. Nothing here depends on a route being modelled; several assertions *do* depend on the payload, and those
  are the ones below.
- **No tenant boundary in its answers.** `buildData` picks its scope from the `tenant-id` header or a
  `tenantId`/`where[tenantId]` **query parameter**, never from an id in a path (`/api/public/team/x/<teamB>` is
  answered with the fixture's team A; `/api/tasks/<foreign-uuid>` with the fixture task). So "this app served another
  tenant's data" is undecidable: `foreign-id-scope.spec.ts` and `public-link-shape.spec.ts` assert that the *id
  travelled*, and say so.
- **It never checks a session.** `/api/user/me` is answered with the fixture user whatever arrives (line 532). That is
  why `session-check.spec.ts` can prove *that* the app delegated the sign-in decision (and that it sent no bearer for
  a caller with no token) but cannot show the API refusing anyone. It also means a route guarded only by
  `authenticatedGuard` answers a signed-out caller with data — recorded here rather than asserted as an app defect,
  because against a real API the upstream answers 401.
- **It holds no request headers**, and its log is body- and header-free by design. Only `state.receivedTokens`
  (sha256 per path) is available. Consequence: a `tenant-id` header a route derives **from the request body** —
  `POST /api/task-statuses` passes `body?.tenantId` to `createStatusRequest`, `POST /api/issue-types` passes
  `body?.tenantId || tenantId` — cannot be proved from this side. Both are recorded here instead of written as a test
  that would only be proving the mock's own echo.
- **The fixture role's permissions never change**: five permissions whatever the scenario says, so this lane can only
  ever show refusals on the permission-guarded routes. The "let through" half needs a mock switch, not a new test.
- The `ever-stats` / `ever-connect` answers come from the same mock (the routes call `readPairedApiUrl()`, which is
  `GAUZY_API_SERVER_URL` → 4002), so they *are* in `/requests`. The statistics **sink** on 4003 is a different mock
  (`@ever-co/connect-tools/mock-platform`) and is only reachable through `mock.stats()`; nothing in this lane reads it.

## Open items left for the first run

1. ~~`MALFORMED_BLOCKERS` is empty.~~ **Filled from the run**, 14 entries, each with the status a run printed and the
   line of the handler that throws — see "Pinned defects" 5. The first pass printed `7 failed / 36 passed` because
   seven of those 14 crashes were unasserted *and* the malformed-text bodies were not arriving as written (item 6);
   after both were fixed the file printed `43 passed`. Every case still carries its `observed-status` annotation, so
   the list can be rebuilt from a report again if a handler changes.
2. ~~The four `cache-directive` "no directive" pins assume Next dev adds nothing.~~ **Closed by the 2026-11-21 run:
   it adds nothing to an `app/api/**` handler answer in this lane** — see "Executed on 2026-11-21" above for the
   contrast that proves it and for the header strings. The finding stands as written: four authenticated reads of this
   tenant's rows carry no `Cache-Control` at all.
3. ~~`foreign-id-scope`'s two walking-segment tests assert counts … if Next refuses a probe before a handler runs, the
   count assertion is re-read.~~ **Held in the run** (`8 passed (4.7s)`): the organization probes reached their
   endpoints and the two task deletes recorded exactly two calls, each matching its own single-segment regex
   (`expect(request.path).toMatch(/^\/api\/organization\/[^/]+$/)` on the encoded-segment probe). The counts and the
   regexes agree, so nothing had to be re-read; the regexes remain the claim to keep if they ever diverge.
4. `session-guard`'s `/api/ever-stats/*` cases depend on the mock's `statsOperator` switch reaching the app through
   4002 (checked in source: `gauzyPassThrough` → `readPairedApiUrl()`). **Confirmed against the log** in the
   `47 passed` run: `PUT /api/ever-stats/enabled` and the three statistics cases passed with the mock's own recorded
   `GET /api/ever-stats/status 404` — so those routes do go through 4002, and the 4003 statistics sink is still not
   read by anything in this lane.
5. Hazards this lane already designed around, keep an eye on them in a shared run:
   - The session-check memo is **dev-server state**, not mock state: `mockReset()` does not clear it, and its 5 s
     window spans tests. Hence the per-test `jti` in `session-check.spec.ts`. A future case that counts
     `/api/user/me` reads without its own token will read another case's check.
   - The stalled-check test leaves the mock holding a request open past the app's 15 s deadline; the test waits 2 s
     past the mock's own 15.5 s delay and resets, so the late entry lands in a log the next test throws away.
   - The 2 MB body test is the only memory-hungry case in the lane. It ran twice (once in the red pass, once in the
     green one, both inside the `malformed-json` batch) and cost nothing measurable: the proxied write and the guarded
     write both answered under 500 and the whole file finished in 3.5 s. What *did* cost the lane its runs was the dev
     server dying between batches, not this case — see the death notes above.
   - The stalled session-check case is the slow test in the lane (17.1 s of the 21.4 s its batch took). A batch that
     ends in a wall of 60 s timeouts is not that test being slow: it is the server, and `check lane-c` says so.

## What this lane deliberately did not take

- `app/api/auth/**` sign-in routes (login/register/verify) beyond the malformed-body probe: `suites/api/auth-refresh.spec.ts`,
  `ever-id-off.spec.ts` and the sweep cover their answers, and the sign-in bodies are where the existing
  `DOCUMENTED_SERVER_BLOCKERS` already sit.
- `ever-connect` allow-list rules (`suites/api/ever-connect-proxy.spec.ts` pins the forwarded set, the body cap and
  the query narrowing), the `team`-segment page-gate exemption (`suites/api/page-gate.spec.ts`), the token-cookie
  chunking (`suites/api/token-cookie-chunks.spec.ts`), cross-site verbs on all 276 handlers
  (`suites/api/foreign-origin.generated.ts`) and the bodiless/`{}` sweeps. Duplicating those would spend the lane.
- Rate limiting / brute force on the shared-link routes: no route here rate-limits or locks, and "a wrong token cannot
  be told apart from a missing link by brute force" is not assertable through a mock that answers everything. It is
  recorded in the file header instead.
- A "let through" permission case, a cross-tenant **payload** case and a body-derived `tenant-id` case: all three are
  mock gaps (above), not missing tests.

## Unguarded writes: the handler list I re-derived today, and what was NOT run (lane-c, 2026-11-21 wrap-up)

> **Superseded later the same day by "unguarded-writes.spec.ts, run and pinned" at the end of this file.** The
> paragraph below stays as what that writer knew at the time; every "not run" claim in it is now out of date, and
> four of its counts moved once the file actually ran.

The owner stopped the effort mid-session for a fleet inference-engine update. **`unguarded-writes.spec.ts` is
committed as discovered, not run: no lane-c server was started in this session, no case was executed, and no status,
body or mock-log line below was read off a log.** Its file header carries the same warning, and every claim in it
cites a `file:line`. It deliberately pins no status code — I never saw one — and every failure message prints the
cross-site answer, the headerless answer and the mock's request log, so the first run produces the numbers this file
is missing instead of requiring them to be guessed.

### What I did read myself, with the commands

My own scan over the tree today (`node /e/Coding/.tmp/lane-c-unguarded.mjs`, a read-only re-implementation of the
collector's own handler splitting; it writes nothing into the repo, and no output of it is checked in):

```
find apps/web/app/api -name route.ts | wc -l                                415 files
write verb entries across them (POST/PUT/PATCH/DELETE)                     324
credited a guard before any upstream call                                  286
credited none                                                               38, in 35 route files
GET/HEAD/OPTIONS handler bodies that hand the request to a guarded helper  105
```

`audit-evidence.md` §C/§E measured 325 write entries, 286 credited, 37 uncredited and 33 handlers against
`b19990f6e`. The 286 and the 415 agree with mine; 325 / 37 / 33 do not — the tree moved since — so the audit's list
of 33 was **not** copied forward. The 35 files and 38 write verbs above are today's, and each route named in the
spec is a path `find apps/web/app/api -name route.ts` shows, with the line that proves a write verb and no guard
call beside it.

The 105 is not a contradiction of `AUDIT.md` finding 5 ("0 read handler bodies call a foreign-origin guard"): I did
not re-derive that narrow claim. What I measured is the *guard family* — 105 GET bodies call `forwardToGauzy` or
`refuseUnlessPermitted`, which call `refuseForeignWrite`, which returns `null` for GET and HEAD
(`core/services/server/same-origin-request.ts:44`). A read does reach a guarded helper and is let through by design;
consistent with the finding, and only a run settles it.

### Three of the 35 are origin-guarded, just not in the collector's vocabulary

`collect-foreign-origin-routes.mjs:31,37` knows `refuseForeignOrigin`, `refuseForeignWrite`, `forwardToGauzy`,
`refuseUnlessPermitted`, `refuseWithoutPermission` and nothing else. My scan used the same list, so it flagged:

- `POST /api/board/notify` — its own exact-origin allowlist at `app/api/board/notify/route.ts:38-41`
  (`isTrustedBoardOrigin`, `core/lib/board/board-app.ts:81-87`; refusal body `{ message: 'Forbidden' }` at
  `core/services/server/board-cors.ts:26-28`). Stricter than the shared guard: it also refuses a caller that sends
  **no** `Origin`, which `refuseForeignOrigin` lets through — this lane's own `session-guard.spec.ts` pins that
  ("a client that sends neither Origin nor Sec-Fetch-Site passes the write guard"). `audit-evidence.md` §E listing
  it as unguarded is a vocabulary artefact, and `AUDIT.md` §C had put the same route in a different bucket ("2
  guarded writes fell through the manifest").
- `POST /api/timer/toogle` — `app/api/timer/toogle/route.ts:1,7-9` imports the real POST from
  `app/api/timer/toggle/route.ts`, whose first statement is `refuseForeignOrigin` (`:7-8`).
- `POST` and `PUT /api/daily-plan/[id]/task` — `app/api/daily-plan/[id]/task/route.ts:1,8-14` imports both verbs
  from `app/api/daily-plan/plan/[planId]/route.ts`, which guards each of them (`:8` and `:33`).

A per-**file** scan cannot see a guard that lives in another file: `AUDIT.md` finding 2 (coverage decided by a
hand-kept vocabulary) with a concrete cost. Today the audit's "33 handlers with no origin guard" is 32, and 3 of the
files it counts are refused before anything is read. The spec pins those three as *guarded* — a run that answers
anything else there is a finding about the guard, not about the list.

### The cases the file makes, and the source each one came from

- 32 unguarded write handlers, each probed with `Origin: https://some-other-site.example` +
  `sec-fetch-site: cross-site` and with neither header. The answer must not be the guard's
  `403 {"statusCode":403,"message":"Cross-site request refused"}` (`same-origin-request.ts:48-53`), and the two
  answers must carry the same status, because nothing in those handlers reads either header. Grepped each file
  today: the only Origin uses are `invite/accept:52` (forwarded to the API), `register:31`, `send-code:8`,
  `request-password:20` and `signin-email:12-13` (link building, from the request URL or the configured origin) —
  none of them a refusal.
- Control, so the "no 403" readings mean something: `POST /api/chat/conversations` with those same headers gets 403
  with the guard's body and an **empty** mock log (`forward-to-gauzy.ts:89-90`; the refusal is produced before any
  upstream call).
- `POST /api/organization-team-join`, anonymous: not refused, the mock is asked, and
  `receivedTokens('/api/organization-team-join')` is `[]` — no credential travelled
  (`route.ts:19-24` → `request-to-join-team.ts:14-19` → `fetch.ts:91-93`, which writes no `authorization` header
  without a bearer; the upstream path is built at `fetch.ts:110`). Its GET, ten lines above, runs
  `authenticatedGuard` (`route.ts:6-8`).
- `POST /api/public/invoice-payments/invoice/[id]/[token]/checkout`: the only origin check is on a body value,
  `isPaymentReturnUrl(returnUrl, req.headers.get('origin'))` (`public-invoice-proxy.ts:62-78`), and it passes when
  the request carried no Origin at all (`!origin || url.origin === origin`, `core/lib/utils/shared-invoice.ts:118`).
  Three cases: foreign Origin with a matching foreign `returnUrl` → forwarded; no Origin with a foreign host as
  `returnUrl` → forwarded; foreign Origin naming this app as the `returnUrl` → 400 `Invalid return address` with an
  empty log. The 400 and its body are read off `public-invoice-proxy.ts:16,66-68`, not off a run.
- Recorded rather than asserted: `POST /api/invite/accept` hands the caller's `Origin` to the API as the origin its
  welcome-e-mail links are built on (`invite/accept/route.ts:51-53` with `appOriginOf` at `:188-194`, which falls
  back to the request URL when the caller sent none). What the API does with that value is a mock blind spot
  (`mock-gauzy-server.mjs` never reads the Origin of a server-side call), so the file says so instead of claiming a
  result.

### Left unwritten when the session was cut, and why

`forwarded-host.spec.ts` (AUDIT finding 4) and `tab-session.spec.ts` (AUDIT finding 9) were **not written**. Writing
them without a run would have put predicted statuses into files whose whole point is measured ones. What I did read,
to hand over:

- `x-forwarded-host` is read at `same-origin-request.ts:22`, `Host` only as a fallback, and `.split(',')[0].trim()`
  takes the first entry. Whether `next dev` lets a client-supplied `x-forwarded-host` reach `req.headers` at all is
  still UNVERIFIED — the audit marks it so and I read no Next code either, which is why that suite's case (a) has
  to be a probe that answers the question rather than a pin.
- `tabSessionOf` (`core/services/server/tab-session.ts:36-58`) replaces the cookie token only when the *unverified*
  decode names the same user (`id ?? sub`), the same `tenantId`, and an organization other than the cookie token's —
  or, on an `authenticatedGuard` route (`guards/authenticated-guard-app.ts:66-69`), other than the organization
  **cookie** when the request also names a team in `x-tab-team-id`. `forwardToGauzy` calls it **without** the
  organization-cookie argument (`forward-to-gauzy.ts:95`), so `isOtherThanCookie` can never be true on a proxy
  route — worth pinning, and easy to assume wrongly. The fixture's own cookie token carries no `tenantId` claim
  (`helpers.ts:166-170`), so a same-tenant case must mint both tokens. And the compensating control cannot bite in
  this harness: the mock records a bearer's sha256 and never validates it (`mock-gauzy-server.mjs:1052-1058` and
  `:911`), so "the API decides" is not answerable here — a tab-session suite has to state that as its finding.

### To run it

```bash
node apps/web/playwright/scripts/lane-servers.mjs check lane-c     # or: up lane-c, kept alive all session
E2E_LANE=lane-c E2E_BROWSER_CHANNEL=chrome npx playwright test \
  --config apps/web/playwright/playwright.lane.config.ts unguarded-writes \
  > /e/Coding/.tmp/lane-c-unguarded-run-1.log 2>&1
```

Then pin each route's status / body / mock triple from that log and re-commit the file with the run's summary line.

## `unguarded-writes.spec.ts`, run and pinned (lane-c, 2026-11-21, later the same day)

Same command as above, against a lane that was already listening (`lane-servers.mjs check lane-c` → `OK — the app on
3033 names its own mock 4002 and stats sink 4003`, then `E2E_REUSE_SERVERS=1` so Playwright reuses it rather than
spawning a second app onto a bound port).

| run | log | summary lines as printed |
| --- | --- | --- |
| first run, file exactly as discovered (43 tests) | `E:\Coding\.tmp\lane-c-unguarded-run-1.log` | `Running 43 tests using 1 worker` / **`2 failed`**, `41 passed (27.7s)` |
| same file again | `…-run-2.log` | `Running 43 tests using 1 worker` / **`2 failed`**, `41 passed (14.8s)` |
| the 35-case loop alone (measure pass, mock reset between the two probes) | `…-run-4.log` | `Running 35 tests using 1 worker` / **`2 failed`**, `33 passed (7.1s)` |
| pinned file | `…-run-5.log` | `Running 44 tests using 1 worker` / `44 passed (8.6s)` |
| pinned file, repeat | `…-run-6.log` | `44 passed (8.2s)` |
| pinned file, the committed text | `…-run-7.log` | `44 passed (7.5s)` |

The same two reds in all three unpinned runs, and the same status / body / mock triple for every other case in all of
them. `tsc -p playwright/tsconfig.json --noEmit` prints nothing.

**The first run's two reds are the file's findings, and both are findings about the list, not about a fix.**

1. **`POST /api/account-deletion/me` is origin-guarded.** Cross-site → **403 `{"message":"Cross-site request
   refused"}`**, mock log `[]`; headerless (body `{}`) → **400 `{"message":"confirm must be true"}`**, mock log `[]`.
   The guard is `refuseUntrustedPost` (`core/services/server/requests/account-deletion-me.ts:33-53`): it checks
   `Sec-Fetch-Site`, then `Origin` against `host`/`x-forwarded-host`, and it answers `{message}` with
   `Cache-Control: no-store` (`:18-22`) — a body the shared guard does not produce (`same-origin-request.ts:49-52`
   answers `{statusCode, message}`). It is the **fourth** guard the collector's vocabulary does not know, and it sits
   in a helper file, which is exactly the shape a per-file scan cannot see. Moved into the guarded describe, where a
   third probe keeps the half that still matters: a headerless caller that does send `confirm: true` is **forwarded**
   — 200 `{"confirm":true}` with `POST /api/account-deletion/me 200` recorded and a bearer recorded against it.
2. **`POST /api/invite/accept` answers the two callers differently, and this app is not what made them differ.**
   Cross-site → **400 `{"error":"Untrusted synthetic browser origin."}**`; headerless → **502 `{"statusCode":502,
   "message":"The Gauzy API gave no usable answer"}`**. Both readings, because both are true and only one of them is
   about a guard:
   - the app never refused: `route.ts:52` takes the caller's Origin (`appOriginOf`, `:188-194`) and
     `acceptInviteRequest` writes it into the upstream `origin` header (`core/services/server/requests/invite.ts:192-206`).
     The 400 body is the **mock's** words (`cypress/support/mock-gauzy-server.mjs:979-981`, which answers only a
     loopback origin, `:17-22`); the text appears in no file under `app/` or `core/`, so nothing else can have said
     it. `isGuardRefusal` is false for both answers — the handler is unguarded and its cross-site write is forwarded.
   - the headerless 502 is a mock-shape artefact, not a second origin reading: no `Origin` → `appOriginOf` falls back
     to the request URL → the mock accepted `POST /api/invite/accept 200` → the handler went on and threw. The lane's
     own dev log names it: `the organizations read after the accept failed Error: Tenant ID, User ID, and Bearer token
     are required` and `no usable answer from the Gauzy API TypeError: Cannot read properties of undefined (reading
     'length')` — `failureResponse` (`route.ts:214-225`) over a mock that answers a non-GET by echoing the request
     body (`mock-gauzy-server.mjs:792-794`) instead of an auth response.
   - what the real API would do with a caller-chosen welcome-link origin stays unanswerable here: the mock is the
     objector, and it objects on its own rule, not on Gauzy's.
   - **Harness fact this case proved concretely:** the mock's origin refusal returns *before* `state.requests.push`
     (`:979-981` vs `:1041`) and before `receivedTokens.push` (`:1054`). So the cross-site probe's log for
     `/api/invite/accept` is empty even though the call demonstrably arrived. That is the lane's "an empty log is not
     proof" rule with a second cause beside the 15 s / 60 s abandonment.

**Predictions that held** (all now pinned exactly, statuses and bodies and per-probe filtered calls): the four
`account-deletion/{confirm,request,verify}` forwards — 200, one recorded call each, and `confirm` forwarded with the
app manufacturing `confirm: true` (`account-deletion.ts:159`) while `request`'s `callbackUrl` came back as
`http://localhost:3033/delete-account/confirm`, the configured origin and not the probe's; the three
`organization-team-join` writes forwarded with **no bearer** (`receivedTokens` empty for the anonymous *and* the
signed-in probe — `request-to-join-team.ts:14-19` names no `bearer_token`, `fetch.ts:91-93` then writes no
`authorization`); `invite/validate-by-code` and `auth/signin-email-social-login` forwarded; `POST /api/log` 201 with
nothing upstream; the checkout triad exactly as `public-invoice-proxy.ts:62-78` reads (foreign Origin + matching
foreign `returnUrl` → 200 forwarded; **no Origin at all + any foreign host → 200 forwarded**; foreign Origin naming
this app → 400 `{"message":"Invalid return address"}` with an empty log); the control
(`POST /api/chat/conversations` → 403 `{"statusCode":403,"message":"Cross-site request refused"}`, log `[]`);
`board/notify` (403 `{"message":"Forbidden"}` for a foreign **and** for a missing Origin); `timer/toogle` and
`daily-plan/<id>/task` (the shared guard's 403 body, log `[]`).

**Predictions that were wrong, or that the run refused to answer**

- The three auth routes `POST /api/auth/login`, `/api/auth/register` and `/api/auth/signin-email-confirm` answered
  **500 with an empty body and no content-type**, mock asked nothing, and the lane's `next-development.log` carried
  no line for any of them: they crash locally on a body with no code/token. "Not guarded" is still true of them;
  "a cross-site write reaches the API" is not.
- `POST /api/auth/_signin-workspace` **is not a route**. Next does not route a private `_` folder, so Auth.js's
  catch-all answered it — the lane's dev log printed `UnknownAction: Cannot parse action at
  /api/auth/_signin-workspace` for this probe — with 400 `"Bad request."`, identical to `POST /api/auth/[...nextauth]`
  (also Auth.js: `Cannot parse action at /api/auth/[...nextauth]`). The handler in that file is reached at
  `POST /api/auth/signin-workspace` (`app/api/auth/signin-workspace/route.ts:2` re-exports it), where the probe
  answered 400 with the app's own email-format field errors. `find apps/web/app/api -name route.ts` counts the file,
  so the collector counts the handler twice: once as a route, once as another route's import.
- The five `app/api/auth/ever-id/**` handlers answered **404 with an empty body**, nothing called — their own
  `if (!isEverIdConfigured()) return new NextResponse(null, { status: 404 })` (e.g. `confirm/route.ts:69-70`),
  because this lane runs with `E2E_EVER_ID` off (`playwright.lane.config.ts:22-25`). Pinned, and pinned as a limit:
  8 of the 44 cases prove nothing about origin handling. Turning the switch on needs the lane relaunched with
  `E2E_EVER_ID=1`; at 2.5–4.3 GB free with lane-b and lane-d apps already listening that second `next dev` was not
  started, so **the ever-id half of the unguarded list is still unmeasured** — deliberately, and recorded rather
  than guessed.
- Count, after the run: of the 38 write verbs in 35 files the scan flagged, **36 verbs in 33 files** are reachable
  unguarded write handlers of this app — `POST /api/account-deletion/me` is guarded, and `POST /api/auth/_signin-workspace`
  is the same handler as `POST /api/auth/signin-workspace` counted twice.

**A fact worth having measured before anyone writes a case about it:** `POST /api/auth/signin-email-social-login`
forwards a cross-site write, and the caller's own token goes with it — inside the body. Measured:
`{"provider":"GOOGLE","access_token":"lane-c-caller-token"}` → 200 `{"provider":"GOOGLE",
"token":"lane-c-caller-token","includeTeams":true}`, because the mock echoes what it was sent, so the answer is the
record of what left this app (`signWithSocialLoginsRequest`, `core/services/server/requests/auth.ts:71-78`, puts it
in `body.token` and names no `bearer_token`; `receivedTokens` stayed empty). Pinned as a named case.

**Across all 35 loop probes, no forwarded write ever carried a bearer** (`receivedTokens` empty for every probe,
including the ones that carry this lane's session cookies). The mock records a bearer's sha256 and never validates it
(`mock-gauzy-server.mjs:1052-1058`), so "the API would have rejected it" remains unanswerable and no case here claims
it.

### Lane-port hardcodes in this lane, as asked

- `session-guard.spec.ts`'s literal `http://localhost:3033` **is already gone** — the origin case at
  `session-guard.spec.ts:205-224` derives `http://localhost:${LANE_PORTS[E2E_LANE].app}` and asserts it against
  `APP_ORIGIN`, and that file was green at 47 tests before and after the change (numbers above, "Executed on
  2026-11-21"). Nothing to fix there, so nothing was touched.
- What is still literal in this lane, left alone and named: `session-guard.spec.ts:30-31` passes
  `url=http://127.0.0.1:3033/` as the *target* of the two link-preview probes (if the lane's port moves, the probe
  asks the app to preview another lane), and `public-link-shape.spec.ts:178, 184, 198, 210` use `http://localhost:3033`
  as a `returnUrl` and as an `origin` header. Those are other files' assertions with numbers recorded in this plan;
  changing them without re-running those files would make this file lie about them.
- One hardcode **this file introduced**: the `account-deletion/request` pin quotes `"callbackUrl":
  "http://localhost:3033/delete-account/confirm"` because that is what the lane's configured
  `NEXT_PUBLIC_WEB_APP_URL` produced. Moving this lane's port re-pins that row; the row's own `note` says so.

### Still unverified, on the record

- The five `ever-id` handlers with the switch on (see above).
- Whether any API would reject what these routes forward: no credential travelled in any measured case, and the mock
  answers every path and validates no bearer.
- Whether `POST /api/invite/accept`'s forwarded Origin changes a real welcome e-mail: the mock is the only thing that
  reacted to it, and this harness cannot show what Gauzy builds from it.

## Method and preflight answers: `method-and-preflight.spec.ts`, run and pinned (lane-c, 2026-11-22)

One new file (1055 lines), no new dependency, nothing outside `apps/web/playwright/suites/lane-c/` touched. It calls
the routes this app itself implements **with a verb their file does not export, and with a CORS preflight**, and pins
which layer answers: Next's method dispatch, Next's not-found document, the middleware door (`proxy.ts`), or the
route's own refusal — plus whether the test backend was asked anything at all.

### Runs, with the logs

| run | log | summary lines as printed |
| --- | --- | --- |
| `--list` of the file as first written | `E:\Coding\.tmp\lane-c-method-list-1.log` | `Total: 68 tests in 1 file` |
| first run, file exactly as written | `E:\Coding\.tmp\lane-c-method-1.log` | `Running 68 tests using 1 worker` / **`1 failed`**, `67 passed (33.8s)` |
| pinned + Board-split file | `E:\Coding\.tmp\lane-c-method-2.log` | `Running 72 tests using 1 worker` / **`72 passed (12.5s)`** |
| same file, final confirming run | `E:\Coding\.tmp\lane-c-method-3.log` | `Running 72 tests using 1 worker` / **`72 passed (11.9s)`** |
| lane health before that run | `E:\Coding\.tmp\lane-c-method-check-3.log` | `lane lane-c: OK — the app on 3033 names its own mock 4002 and stats sink 4003` |
| typecheck `tsc -p playwright/tsconfig.json --noEmit`, 1st / after each fix / final before the commit | `E:\Coding\.tmp\lane-c-method-tsc-1.log` … `-5.log` | 8 error lines → 4 → 2 → **0 lines, exit 0** (twice) |

No lane was started, stopped or restarted for this file (`check lane-c` before the run, output above); no other
lane's file was touched. My 3 typecheck errors were `APIResponse` imported from `api-fixtures` (that module declares
it locally and does not export it — now `import type { APIResponse } from '@playwright/test';`, the same shape
`suites/api/board-origin.spec.ts` uses) and a local `const headAnswer` that had shadowed the `readAnswer` helper
(TS7022 + TS2448, both at `:411`). The 5 errors in `-tsc-1.log` are a peer's in-flight lane-b download specs, which
were untracked in this tree at the time and are not mine to fix or to delete.

### What the 72 cases pin, by describe (counts read off `lane-c-method-2.log`)

- **`a verb the route does not export: Next answers before the route runs` — 36 cases** (18 routes × 2). `OPTIONS` →
  **204**, 0 bytes, no `content-type`, `allow` exactly the list computed from the manifest's verbs (`OPTIONS` + the
  exports + `HEAD` when `GET` is exported, sorted — `auto-implement-methods.js:49-71`), **no `Access-Control-Allow-*`
  of any kind**, no `Cache-Control`, `vary` containing `rsc`, and `mock.requests()` **empty**. The wrong verb →
  **405**, 0 bytes, no `content-type`, **no `Allow` at all**, no CORS header, no `Cache-Control`, log empty. The 18
  `vary` values are kept as `observed-vary` annotations in `artifacts/playwright-lane-c.json` (18 of the 72 specs in
  that report carry it; the value is `rsc, next-router-state-tree, next-router-prefetch,
  next-router-segment-prefetch`).
- **`the three routes that export an OPTIONS handler of their own` — 6 cases** (`/api/board/members`,
  `/api/board/session`, `/api/board/notify` — 3 of the 415 manifest paths — × 2). Their `OPTIONS` →
  **403 `{"message":"Forbidden"}`** with **no `Allow`**, **no CORS header**, `cache-control: no-store` and a `vary`
  that names `Origin`; beside it the wrong verb is still Next's bodiless 405 with neither `Allow` nor
  `Cache-Control`, so exporting an OPTIONS handler changes only the OPTIONS answer.
- **`HEAD is answered only where a GET handler exists` — 5 cases.** `HEAD` at three POST/PUT/DELETE-only routes →
  **405**; signed-in `HEAD /api/chat/conversations` → **200**, 0 bytes of body,
  `content-type: application/json; charset=utf-8`, backend log exactly `HEAD /api/chat/conversations 200` (the verb
  travels upstream **as HEAD**, not as GET); the same `HEAD` with a foreign `Origin` and `sec-fetch-site: cross-site`
  → **200 forwarded**, same entry, no CORS header.
- **`the method answer does not read the caller Origin` — 6 cases.** 5 routes × 4 caller shapes (no `Origin`, this
  app's `Origin`, a foreign `Origin`, this app's `Origin` with `sec-fetch-site: cross-site`) → **byte-identical**
  `status`, body, `allow` and `vary`, and an empty backend log; plus the contrast at the same path: cross-site `POST`
  → **403 `{"statusCode":403,"message":"Cross-site request refused"}`** while cross-site `PUT` → the same **405** the
  headerless caller gets. The two headerless-vs-`OPTIONS` cases the main session asked me to re-run are inside these
  two describes and are green in `lane-c-method-2.log`.
- **`the door answers a locale-prefixed API path, and never an API path` — 4 cases.** `OPTIONS` at
  `/api/chat/conversations` carries **no** `content-security-policy`; `OPTIONS /en/api/chat/conversations`
  (`maxRedirects: 0`) → **307** with a CSP containing `frame-ancestors 'self'`, `location: /api/chat/conversations`, a
  `NEXT_LOCALE` cookie, **no `Allow`** and an empty log; followed → **204** + `allow: GET, HEAD, OPTIONS, POST`;
  `PUT` on the prefixed path → **307** whose body is `/api/chat/conversations`, followed → **405**; and the CSP on
  `GET /api/auth/session` comes from the route (`app/api/auth/[...nextauth]/route.ts:15-21` calls
  `setFramingPolicy`), not from the door — `GET /board` is the door side of that pair.
- **`what a proxied route forwards, and what it keeps back` — 6 cases**, detailed in the block below.
- **`a wrong verb at a route that exists is not a 404` — 6 cases.** 3 pairs where the known path gets the bodiless
  **405** and a path the manifest matches nowhere gets the **404** document (`text/html`, > 1000 bytes,
  `cache-control: no-store`) with nothing asked, plus the dynamic-route swallow, the static-vs-dynamic pair and the
  unknown-verb case, all under "findings" below.
- **`the verb-class table still matches the manifest` — 3 cases**, one server call only: every verb class in
  `routes.generated.ts` is covered (one named skip, `/api/auth/ever-id/start`); every row is a real manifest route
  that really does not export the verb the case calls it with; and `OPTIONS /api/board/session` from this app's own
  origin answers **`403 {"message":"Forbidden"}`** — the precondition the Board rows stand on.

### The passthrough half, in detail (`forwardToGauzy` routes)

- **Query:** `GET /api/chat/conversations?limit=7&limit=9&q=a%20b&empty=&flag&where%5BtenantId%5D=zz&plus=a+b` → 200,
  one entry `GET /api/chat/conversations 200`, and the backend's recorded `query` string is
  `limit=7&limit=9&q=a+b&empty=&flag=&where%5BtenantId%5D=zz&plus=a+b`. All seven parameters arrive
  (`limit=7`, `limit=9`, `q=a b`, `empty=`, `flag=`, `where[tenantId]=zz`, `plus=a b`). The app forwards
  `new URL(req.url).search` untouched (`forward-to-gauzy.ts:112`); the `%20` → `+`, the valueless `flag` → `flag=` and
  `a+b` → a space are the backend's own re-serialisation (`mock-gauzy-server.mjs:1085`), so the pinned string is the
  pair "bytes forwarded / meaning made at the far end", not a claim about Next.
- The same URL with `PUT` → 405 and **nothing** asked, so the query is never half-forwarded.
- **`tenant-id`:** a caller-supplied `tenant-id` header does **not** reach the API. Decidable trio on
  `/api/auth/switch-organization` (the backend authorises that path on the `tenant-id` header, `mock-gauzy-server.mjs:554-565`):
  switch to organization B on a tenant-A session → **401**; the same switch with a caller `tenant-id` naming tenant B
  → still **401** `{"statusCode":401,"message":"Unauthorized"}`; the control (switch to organization A) → **200**.
  Backend log: `401, 401, 200` in that order. `forward-to-gauzy.ts:9-19` blocks the session headers and builds the
  tenant header from the cookie session.
- **Caller bearer:** an anonymous `POST /api/chat/conversations` with `authorization: Bearer caller-supplied-probe-token`
  → **401** `{"statusCode":401,"message":"Unauthorized"}`, `receivedTokens('/api/chat/conversations')` **`[]`** and the
  whole log **empty** — the header was not used and the request never left. Which side wrote that 401 is told from
  the header rather than the body: `content-type: application/json` with **no charset** is this app's own
  `NextResponse.json` (`forward-to-gauzy.ts:96`), where an upstream refusal arrives as
  `application/json; charset=utf-8` (visible in the switch-organization entries above).
- **`Idempotency-Key`** (the only request header a route hands on, `app/api/chat/messages/[id]/interactions/route.ts:17`
  with `forwardHeaders`): the call happens once (`POST /api/chat/messages/playwright-method-probe/interactions 200`),
  and the case says in an annotation that the header itself is **not observable** here — the request log carries
  `method, path, query, startMs, endMs, status` and no headers or body (`mock-gauzy-server.mjs:1080-1091`).
- A cross-site `POST` is refused with 403 and nothing asked; the refusal itself stays `suites/api/foreign-origin.spec.ts`'s
  claim, and the file annotates that it pins only the forwarded-nothing half.

### Findings kept as findings

1. **A made-up name under a parent that has a dynamic route is answered by that route, not by the 404 page.**
   `GET /api/user/reset-playwright-nope` → **200**, `content-type` containing `application/json`, no `<!DOCTYPE`, and
   the backend log holds `GET /api/user/reset-playwright-nope 200` — the handler ran and asked about the made-up id.
   `/api/user/[id]` (GET/PUT/DELETE) matches every one-segment name under `/api/user`. This is why the first run's
   single red exists: the file's first version used that path as its "unknown" path, expected 404 and was told 200
   (`lane-c-method-1.log`, 1 failed / 67 passed). Nothing was weakened — the pairs were narrowed to paths the
   manifest matches nowhere, and this case was added so the swallow is **pinned** rather than hidden. The same probe
   also puts a `GET /api/user/me` entry in the log (`authenticatedGuard` asks even of a cookie-less caller —
   `session-check.spec.ts`'s finding), which is annotated rather than pinned because the dev-server's 5 s
   `SessionCheckMemo` can serve that read.
2. **`HEAD` is answered as the read it is, and it is forwarded as `HEAD`.** A cross-site `HEAD` of session data is
   forwarded (200, backend log `HEAD /api/chat/conversations 200`, no CORS header) because `refuseForeignWrite`
   returns `null` for GET and `HEAD` (`same-origin-request.ts:43-46`). Not a guard failure — recorded because it is
   the one verb outside `GET` for which a cross-site caller is answered with the session's own data.
3. **A preflight is never a grant.** Next's automatic `OPTIONS` answer names `Allow` and never an
   `Access-Control-*` header (36 cases), and the Board routes' own `OPTIONS` refusal carries **no** CORS header while
   carrying `cache-control: no-store` and a `Vary` that names `Origin` — the same asymmetry `suites/api/board-origin.spec.ts`
   measured for its 403s. `core/services/server/board-cors.ts:20-40` is the only code under `app`/`core` that writes
   any CORS header (grep over both trees), so every absent CORS header pinned here is an app-wide statement.
4. **`Content-Security-Policy` is not proof the door ran.** `app/api/auth/[...nextauth]/route.ts:15-21` calls
   `setFramingPolicy` itself ("where the proxy does not run"), so the CSP on `/api/auth/session` is the route's; the
   door's own header (`proxy.ts:144` → `frame-ancestors.ts:38-41`) appears on the locale-prefixed path and on
   `/board`, and never on an `/api/...` path (`proxy.ts:96-112` excludes `api`). Both sides are pinned in one test so
   the door claim stays falsifiable.
5. **A verb Next does not dispatch is a third shape.** `PROPFIND` and `QUERY` at `/api/chat/conversations` →
   **400** with no body, no `content-type`, no CORS header, nothing asked — neither the 405 nor the 404 document.
6. **A static segment is not answered by the dynamic route beside it.** `PATCH /api/chat/conversations/browse` → 405
   with `mock.calls(...) === []`; the control `PATCH /api/chat/conversations/playwright-method-probe` → 200 with its
   entry. The 405 there is a routing answer, not a handler refusing for its own reason.

### Deliberately not taken, so the lane is not spent twice

`suites/api/sweep.spec.ts` calls every route **only with the verbs its own file exports**; this file is the other
half and therefore skips, on purpose: the exported verbs and their documented 5xx blockers (`sweep.spec.ts`),
bodiless calls (`empty-body.spec.ts`), declared media types (`media-type.spec.ts`), cross-site refusals **on exported
write verbs** (`suites/api/foreign-origin.spec.ts`, this lane's `unguarded-writes.spec.ts`), the Board Origin gate and
its CORS set on 200/201/400/413/415 answers (`suites/api/board-origin.spec.ts`), `x-forwarded-host` as the guard's
right-hand side (`suites/api/forwarded-host.spec.ts`), the ever-connect query narrowing and body cap
(`suites/api/ever-connect-proxy.spec.ts`), and which answers carry `Cache-Control`
(`suites/lane-c/cache-directive.spec.ts`, which already proved a forwarded answer carries only the upstream
`Content-Type`). What is new here is the out-of-list verb, the preflight, the door/handler boundary, and the
"nothing at all was asked" assertion read as the **whole** log rather than filtered to the route.

### Not reachable in this lane, recorded instead of guessed

- The Board routes' **trusted** preflight (`boardPreflight`'s 204 with `Access-Control-Allow-Methods`,
  `Access-Control-Allow-Headers` and `Access-Control-Max-Age: 600`) needs a lane started with
  `E2E_BOARD_APP_DOMAIN`. This lane names no Board domain — `OPTIONS /api/board/session` from this app's own origin is
  `403 {"message":"Forbidden"}` (`-2.log`), which the file pins as the precondition of its Board rows. With no
  trusted origin, `Access-Control-Max-Age` is unobservable anywhere in this app.
- The `app/api/auth/ever-id` verb class is named as the one the coverage test skips: with `E2E_EVER_ID` off those
  handlers answer 404 from their own guard (measured in the 2026-11-21 run above).
- Neither app was restarted for this file, and no fourth `next dev` was started (33 GB host, `strata` holds ~11 GB).
- **Header passthrough is a harness gap, not a test gap.** The mock log is header- and body-free by design
  (`mock-gauzy-server.mjs:1080-1091`), so `Idempotency-Key` can only be proven to have coincided with a call. The
  harness (`helpers.ts`, `test-servers.ts`, `mock-gauzy-server.mjs`) belongs to the coordinating session, so the need
  is written here rather than implemented: a control-API echo of the upstream request headers for one named path —
  the shape `/api/auth/switch-organization` already uses for the tenant header — would turn the two header cases
  above from "nothing was refused" into "this header arrived / did not arrive".

### The 256-character `content-disposition` claim is not this file's, and is not in it

No `MAX_CONTENT_DISPOSITION_LENGTH`, `MAX_HEADER_VALUE_LENGTH` or `forwardHeaderSet` exists in this repository, in any
branch, or in any source file on this machine, and nothing in this section or in `method-and-preflight.spec.ts`
asserts a header-length cap. Evidence, commands and exact output in **`E:\Coding\.tmp\lane-c-cap-evidence.txt`**
(`wc -l` 145 for `forward-to-gauzy.ts` and 77 for `forward-download-to-gauzy.ts`; empty `git log --all -S` for both
constant names; empty `git grep` at HEAD; a whole-tree `rg` returning only `sha256` hits; and a whole-`E:\Coding`
search that finds the string **only in three prose files** — `E:\Coding\.tmp\handover_s11.md`, the 2026-11-21 lane
handover under `workspace/projects/ever-teams/knowledge/handoffs/`, and `workspace/.git/COMMIT_EDITMSG` — i.e. only in
agent-report text, never in code). A filter to source extensions returns no file at all. The claim's line numbers were
also impossible: `:493-501` of a 145-line file. What the forwarders really do carry, re-read today at the printed
lines, is `forward-to-gauzy.ts:8` `UPSTREAM_TIMEOUT_MS = 60_000` armed at `:123` and `forward-download-to-gauzy.ts:7`
`120_000` with `options.timeoutMs ?? UPSTREAM_TIMEOUT_MS` at `:35` armed at `:50`; `content-disposition` appears in
the shipped code only as a name in that file's `PASSED_HEADERS` (`:13`, copied verbatim per
`forward-download-to-gauzy.test.ts:40`) and in the client-side `docs-import.service.ts:93`. Downloads are not this
file's subject: `rg` for `disposition|256|MAX_|forwardHeaderSet|download|logo|cap ` over
`method-and-preflight.spec.ts` returns nothing.

## Dynamic segment shapes: pre-run save before the 2026-11-22 reboot (lane-c — NOTHING run, nothing written)

`apps/web/playwright/suites/lane-c/dynamic-segment-shape.spec.ts` **was not created and nothing was executed** for this
task: no Playwright run, no log, no test count, no measurement of mine, and no typecheck/lint/prettier pass. The
save exists only so a planned PC reboot does not silently eat the shortlist. The draft — a commented shortlist, not a
spec, explicitly marked unrun — is at **`E:\Coding\.tmp\lane-c-segments-draft.ts.txt`** (outside the repo, uncommitted
by design: it has no green run behind it).

Four things I did read myself before the save, each with its command:

- **HEAD is not the sha the brief names.** `git rev-parse --short HEAD` → `8ebe64dbf`, one commit past `5575b1c85`;
  `git fetch origin test/playwright-e2e-suite` then `git rev-parse --short origin/test/playwright-e2e-suite` → the same
  `8ebe64dbf`, so there was nothing to pull. `5575b1c85` is that commit's parent (`git log --oneline`).
- **The brief's run command cannot collect a lane-c file.** `grep -nE 'testMatch|testDir'` over the two configs:
  `apps/web/playwright/playwright.api.config.ts:28` is `projects: [{ name: 'api', testMatch: '**/api/**/*.spec.ts' }]`
  and `apps/web/playwright/playwright.lane.config.ts:57` is ``testMatch: **/${laneName}/**/*.spec.ts``. So
  `--config apps/web/playwright/playwright.api.config.ts suites/lane-c/…` matches nothing under `suites/lane-c` and
  would have reported an empty run. The correct form is the one this PLAN's own run command already uses:
  `E2E_LANE=lane-c E2E_REUSE_SERVERS=1 npx playwright test --config apps/web/playwright/playwright.lane.config.ts suites/lane-c/dynamic-segment-shape.spec.ts`.
  Read off the config files, **not yet proven by a run of mine**.
- **Part of this task is already on the branch, on a different segment kind.** `git show --stat 8ebe64dbf` added
  `apps/web/playwright/suites/lane-a/public-assets.spec.ts` (32 tests, its own log `lane-a-assets-4.log`) over the
  catch-all `apps/web/app/api/public-assets/[...path]/route.ts`, pinning `..`, `..%2F`, an absolute URL, an empty
  segment and a 4 004-char segment there. A `suites/lane-c` file on this subject must stay on **named** single
  segments (`[id]`, `[documentId]`, `[host]`, `[token]`, `[profileLink]`) and on the asked-or-not-at-the-mock
  question, and must re-read `apps/web/playwright/suites/api/sweep.spec.ts` first, or it repeats lane-a's work.
- **Gate hazard for the next session.** `git status --porcelain` at the save shows another agent's in-flight
  untracked `apps/web/playwright/suites/lane-b/board-preflight.spec.ts` and modified lane-d files in this shared
  working tree; `8ebe64dbf`'s own message records two `tsc` errors sitting in that lane-b file. So
  `tsc -p playwright/tsconfig.json --noEmit` is not necessarily exit 0 here for a reason that is not mine — check
  which file each error is in before acting on it.

Route shortlist (14, from `find apps/web/app/api -name route.ts | grep -E '\[[a-zA-Z]+\]'`, 200 such files at
`8ebe64dbf`) and the 16 segment shapes are in the draft file. None of those handlers has been read yet, so no
CONFIRMED / REFUTED / NOT REACHABLE table exists for this task yet.
