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
the fix have to be removed together. None of them has been confirmed by a run yet — the status/header each names is
what the source says, not what a log said.

1. `GET /api/public/team/<profileLink>/<teamId>` answers a team's members, tasks and last worked task with **no
   Cache-Control** (`NextResponse.json(response.data)` in its route file). Pinned in `public-link-shape.spec.ts`.
2. The proxy's own 401 and 415 carry no `Cache-Control`, while its 403 does. Pinned in `cache-directive.spec.ts`.
3. Four authenticated reads of this tenant's rows answer with no `Cache-Control`. Pinned in `cache-directive.spec.ts`.
4. `POST /api/task-statuses` answers a body it cannot parse as 200. Pinned in `malformed-json.spec.ts`.
5. Expect more from the malformed-body sweep (destructured `await req.json()` on `null` is the predicted shape) —
   those go into `MALFORMED_BLOCKERS` only when a run names the status.

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

1. `MALFORMED_BLOCKERS` is empty. The malformed-json run's failure messages and its `observed-status` annotations are
   the source; paste the statuses in, with the reason each handler gives.
2. The four `cache-directive` "no directive" pins assume Next dev adds nothing. If it adds a `Cache-Control`, the
   assertions have to say what Next adds and the finding re-stated for the routes' own headers.
3. `foreign-id-scope`'s two walking-segment tests assert counts (`asked.length` for the organization probes is
   `> 0`, the two task deletes is exactly 2). If Next refuses a probe before a handler runs, the count assertion is
   re-read — the security claim is the per-path regex, not the count.
4. `session-guard`'s `/api/ever-stats/*` cases depend on the mock's `statsOperator` switch reaching the app through
   4002 (checked in source: `gauzyPassThrough` → `readPairedApiUrl()`); confirm against the log.
5. Hazards this lane already designed around, keep an eye on them in a shared run:
   - The session-check memo is **dev-server state**, not mock state: `mockReset()` does not clear it, and its 5 s
     window spans tests. Hence the per-test `jti` in `session-check.spec.ts`. A future case that counts
     `/api/user/me` reads without its own token will read another case's check.
   - The stalled-check test leaves the mock holding a request open past the app's 15 s deadline; the test waits 2 s
     past the mock's own 15.5 s delay and resets, so the late entry lands in a log the next test throws away.
   - The 2 MB body test is the only memory-hungry case in the lane; on a 32 GB box with three `next dev` servers, run
     it in the malformed-json batch, not alongside another lane's cold compile.

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
