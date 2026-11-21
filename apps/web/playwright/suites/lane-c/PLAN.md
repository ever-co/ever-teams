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
