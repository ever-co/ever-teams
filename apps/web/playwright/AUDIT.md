# AUDIT.md — what the Playwright suites do not prove

Static audit only. I ran no test, started no server, opened no browser. Every claim cites the file and line I
read; anything that needs a run to confirm is marked **UNVERIFIED**. The raw subtraction, every count and the
commands to re-derive them are in `audit-evidence.md`, whose provenance block names the commit I measured against
(`b19990f6e`, 2026-11-21 07:40) and the three HEAD moves that followed. HEAD moved while I read: re-run section M
there before quoting a residual number.

Lanes as you defined them: **lane-a** browser journeys, **lane-b** auth/session/locale browser, **lane-c**
server routes, **api** the canonical `suites/api` (I treat it as lane-c's neighbour — it is the same "server
routes" work, on the canonical ports), **user** anything that touches shared plumbing (`mock-gauzy-server.mjs`,
`scripts/`, `test-servers.ts`, the configs).

Order is by harm, not by effort.

---

## 1. 33 mutating handlers have no origin guard at all, and no cross-site test

**Read.** `audit-evidence.md` §C/§E, from a walk of all 415 `route.ts`: 47 handlers call no guard helper; 33 of
them export a write verb. `core/services/server/same-origin-request.ts:43-46` (`refuseForeignWrite`) is reached
only through `forward-to-gauzy.ts:89` and `refuse-without-permission.ts:38`, and **0 route files call it
directly** (`grep -rl "refuseForeignWrite(" apps/web/app/api --include=route.ts` → nothing).

The sharpest of them:

- `app/api/organization-team-join/route.ts:19-22` — POST with **no guard and no session**: `await req.json()` →
  `requestToJoinRequest(body)`, and `core/services/server/requests/request-to-join-team.ts:14-19` forwards it
  with no `bearer_token`, so `core/services/server/fetch.ts:91-92` sends **no `authorization` header at all**.
  The GET in the same file *does* run `authenticatedGuard` (`:8`) — the asymmetry is in one file, ten lines apart.
- `core/services/server/requests/account-deletion.ts:147-169` — `proxyAccountDeletion` keeps the caller's strings
  and forwards them; for `confirm` it takes `token` + `planHash` straight out of the body (`:31`, `:159`) and
  POSTs them (`:125-141`, a plain `fetch` with no bearer, no origin check, no session check). The same file's own
  comment at `:66-71` says the links must "Never from the request: its `Host`, `X-Forwarded-Host` and `Origin`
  headers … are whatever the caller sends, and the link carries a token that deletes every account of the
  address" — the links were hardened, the POST that consumes the token was not.
- The whole sign-in family (`POST /api/auth/login|register|send-code|verify/token|two-factor/verify|reset-password|
  request-password|signin-email*|_signin-workspace|[...nextauth]`) is unguarded, and some of it **writes session
  cookies** (`/api/auth/login`, `/api/auth/signin-email-confirm`, `/api/auth/_signin-workspace`). It is reachable
  from the browser: `core/hooks/auth/use-authentication-passcode.ts:182`.

**Wrong.** These are the handlers a cross-site request would target, and the suite has no case for any of them:
the manifest is built from a guard call (`collect-foreign-origin-routes.mjs:114-125`), so a handler with no
guard produces no entry and no test. The suite therefore proves "the guarded handlers refuse" and is silent on
"which handlers were never guarded".

**Close it.** **lane-c** — a new `suites/lane-c/unguarded-write.spec.ts` that walks the 33 paths and pins, per
path, today's cross-site behaviour with `Origin: https://some-other-site.example` and with
`Sec-Fetch-Site: cross-site`, in the harness's existing "documented, not approved" style (the pattern is already
in `suites/api/page-gate.spec.ts:99-107` and `suites/lane-c/session-guard.spec.ts:128-144`). Expect today: no
403. The pins then make adding `refuseForeignWrite` a visible change instead of an invisible one. For the two
families with a real decision behind them (account deletion, join-request), write the decision into the spec
header the way `apps/web/README.md` does for tenant checks — **user** to decide whether the guard should exist;
a lane should not add a guard to `app/**` or `core/**` on its own.

**Proof from the mock.** The mock's request log distinguishes the two outcomes exactly: a refusal made **here**
leaves `await mock.requests()` empty (`refused()` at `same-origin-request.ts:48-53` answers before any
upstream call), while an unguarded handler produces an entry — `POST /api/organization-team-join 200` from the
catch-all at `mock-gauzy-server.mjs:792-794`. For the join POST add
`await receivedTokens('/api/organization-team-join')` (`helpers.ts:58-61`, fed by `mock-gauzy-server.mjs:1052-1058`)
and expect `[]`: that is the mock recording that no credential travelled, which is what makes the "no bearer"
reading a fact rather than an opinion.

---

## 2. Guard coverage is defined by a hand-kept vocabulary, and the harness's own recovery from a missing guard is to delete its test

**Read.** `scripts/collect-foreign-origin-routes.mjs:31` (`GUARD = /\brefuseForeign(Write|Origin)\s*\(/`),
`:37` (`GUARDED_HELPERS = ['forwardToGauzy','refuseUnlessPermitted','refuseWithoutPermission']`), `:114`
(`GUARDED_ENTRY` decides which files are looked at at all), `:30` (`VERBS` = writes only).
`scripts/api-routes-lib.mjs:23-31`: with `--check` the generator compares the checked-in manifest with what it
would write from **today's source** and, on a mismatch, exits 1 printing `… is out of date. Regenerate it: <command>`.
`suites/api/manifests.spec.ts:14-29` runs exactly those two checks and asserts nothing else.

**Wrong.** Two consequences, both structural:

1. A guard the vocabulary does not know is invisible. `app/api/board/notify/route.ts:39` guards with
   `isTrustedBoardOrigin` (`core/lib/board/board-app.ts`); the manifest has no `POST /api/board/notify` entry
   (`audit-evidence.md` §C). `app/api/ever-connect/[...path]/route.ts` has its own `sameOrigin` launcher gate —
   also credited only because `forwardToGauzy` happens to be in the list.
2. If a guard is **removed** from a guarded handler, `--check` fails, and the message tells the next agent to
   **regenerate the manifest** — which deletes the test for the guard that vanished. The green suite you get
   back is the suite that never asked the question. (The intermediate red state also exists: `foreign-origin.spec.ts`
   iterates the stale manifest and would fail on the now-unrefusing route. Which failure you hit first is
   UNVERIFIED — I did not delete a guard to find out.)

**Close it.** **lane-c** — `suites/lane-c/guard-inventory.spec.ts`: a checked-in literal list (one entry per
route file: path, verbs, which guard family its body calls) asserted against the same walk the generators do,
with the assertion written the other way round from the collector — "every handler that exports a write verb is
either in this list with a guard family named, or in this list marked `none`, and `none` may only shrink by
deleting a handler from the app". That makes a removed guard fail a test instead of changing a generated file.
**user** — if a residual mode is wanted in the collectors (`--residual` printing the handlers it skipped), that
is the generator's file, so it is yours, not a lane's.

**Proof.** The inventory spec needs no server and no mock: it is the `--check` comparison plus a set difference,
and it fails with the handler path in the message.

---

## 3. 88 of the 138 `authenticatedGuard` routes are named in no spec — and the mock cannot yet show why the delegation matters

**Read.** `audit-evidence.md` §G is the full list. `core/services/server/guards/authenticated-guard-app.ts:75`
(`const bearer_token = access_token?.toString() || ''`), `:22-23` (an answer counts as signed-in when it is not
a 401), `:96-97` (the refusal status is the upstream's, or 503 when nothing answered); the check itself is
`GET /user/me` through `core/services/server/fetch.ts:91-92`, which omits `authorization` entirely when the
token is empty. `mock-gauzy-server.mjs:532` answers `/api/user/me` with the fixture user whatever arrives.
`lane-c/session-check.spec.ts:85-112` already proves the delegation on 10 routes and pins `not.toBe(401)`
("pinned, not approved") at `:107-110`; `lane-c/PLAN.md:202-227` records the mock limit honestly.

**Wrong.** The suite can prove *where* the decision is made but never that the decision has teeth, because the
mock is authentication-blind. That is fine as far as it goes — but 88 routes are not even at that stage:
`/api/timer/*` (14 verbs), `/api/roles/*`, `/api/organization-team/[id]` GET/PUT/DELETE,
`PUT /api/user/[id]/role`, `DELETE /api/user/reset`, `DELETE /api/user-api-tokens/[id]`,
`POST /api/invite/emails`, `/api/integration/github/*`. The write side of that list is where a stale-session
route would matter most.

**Close it.** **lane-c** — extend `session-check.spec.ts`'s `CHECKED_ROUTES` (its own list at `:35-46`) from 10
to the whole family, in batches, one batch per turn: it needs no new plumbing, only paths and a fresh `jti` per
test (its own `tokenOfNonce` at `:59-63` exists for exactly that, because the 5 s memo at
`authenticated-guard-app.ts:29-31` is process state the mock cannot reset). **user** — the decision that would
make these tests worth twice as much: let the mock answer `/api/user/me` with 401 when no Bearer arrived
(`mock-gauzy-server.mjs:532`), behind a scenario switch so Cypress is unaffected. Until then every case here can
only say "the app asked", and the spec must keep saying so.

**Proof.** Two mock readings distinguish pass from fail today: `GET /api/user/me 200` in the log with
`receivedTokens('/api/user/me') === []` means "the app asked about a caller it held no credential for"; a route
that refused on its own cookies would leave the log empty (`lane-c/session-guard.spec.ts:99-113` uses exactly
that reading for the `forwardToGauzy` family).

---

## 4. The origin guard's answer depends on `x-forwarded-host`, which no route-level test ever sends

**Read.** `core/services/server/same-origin-request.ts:22-31`:

```ts
const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host)
	.split(',')[0].trim();
…
if (originHost !== host) return refused();
```

`x-forwarded-host` **replaces** `Host` as what the `Origin` is compared against. The only test that names the
header is the unit test `core/services/server/same-origin-request.test.ts:37`, and only in its multi-value form
(`'teams.example.com, internal:3030'`). No Playwright or Cypress spec names it
(`grep -rn "x-forwarded-host" playwright cypress` → nothing).

**Wrong.** Both directions of the consequence are unpinned. A deployment behind a proxy whose forwarded host
differs from the browser's `Origin` host would have **every** guarded write refused (403 "Cross-site request
refused") — and the reverse: a caller that sets both `X-Forwarded-Host` and `Origin` to the app's own host
satisfies the check outright, which is what the header makes possible for a non-browser caller. lane-c already
pins the neighbouring case (no `Origin`, no `Sec-Fetch-Site` passes — `session-guard.spec.ts:145-159`) but not
this one.

**Close it.** **lane-c** — three cases in `session-guard.spec.ts`'s "what the write guard does not cover"
describe, on a route that runs `refuseForeignOrigin` (e.g. `POST /api/comment`, guard at
`app/api/comment/route.ts:40`): (a) `Origin: <own>` + `X-Forwarded-Host: teams.example.com`; (b) `Origin:
<own>` + `X-Forwarded-Host: <own>, internal:3030`; (c) `Origin: <foreign>` + `X-Forwarded-Host: <own>`. Pin what
comes back and say in the header whether it is the intended deployment behaviour. Whether Next passes
`x-forwarded-host` through to `req.headers` in dev is UNVERIFIED (I read no Next code for it) — case (a) is the
probe that answers it.

**Proof.** A refusal is identifiable without ambiguity: 403 with body `Cross-site request refused` and
`await mock.requests() === []` (the answer is produced before any upstream call, `same-origin-request.ts:48-53`).

---

## 5. No read is origin-guarded anywhere, and that is pinned on one route

**Read.** Reusing the collector's own handler splitting over all 415 files: **0** GET/HEAD/OPTIONS handler bodies
call a foreign-origin guard (`audit-evidence.md` §D; spot-checked in `app/api/comment/route.ts` (`GET` at `:21`,
guard only in `POST` at `:40`), `app/api/tasks/team/route.ts`, `app/api/organization-team/route.ts`).
`same-origin-request.ts:44` exempts GET and HEAD by design. lane-c pins the consequence once:
`session-guard.spec.ts:128-144`, "a cross-site GET of the session's own data is answered, not refused", on
`/api/auth/sessions`.

**Wrong.** `same-origin-request.ts:8` names the case the guard exists for — "always for a sibling subdomain, and
from any site when the deployment sets `NEXT_PUBLIC_COOKIE_SAME_SITE=none`" — and the exempt half of that rule
(202 GET verbs) is pinned in exactly one place. The `/api/public/*` reads and `/api/timer/status`-style reads
are the ones a sibling-subdomain page could drive with the session's cookies.

**Close it.** **lane-c** — add two or three named cases beside `session-guard.spec.ts:128-144` for a data read
and a `public/` read with `Sec-Fetch-Site: same-site` and a foreign `Origin`, pinned as today's behaviour;
**user** — decide whether the exemption is intended for credentialed reads, since only you can say what the
deployment sets for `NEXT_PUBLIC_COOKIE_SAME_SITE`.

**Proof.** Mock evidence is again the log: forwarded → an entry with `receivedTokens(path) = [sha256(cookie token)]`;
refused here → empty log. The distinction is already the shape of the lane's existing assertions.

---

## 6. `Sec-Fetch-Site: same-site` — the case the guard's own comment leads with — is tested on 3 of 286 entries

**Read.** `suites/api/foreign-origin.spec.ts:81-96`, with `FORM_ROUTES = ['/api/daily-plan', '/api/comment',
'/api/employee-appointment']` at `:83`, covering `cross-site` and `same-site`. The manifest carries 286 entries
(134 route-guard, 152 proxy-helper — `audit-evidence.md` §C).

**Wrong.** `same-site` is the sibling-subdomain case, i.e. the one no CORS rule protects and the one
`refuseForeignOrigin` exists to catch (`same-origin-request.ts:11`). Everything else in the manifest is tested
with `Origin` only, so a regression that checks `Origin` but not `Sec-Fetch-Site` — or vice versa — survives on
283 of 286 entries.

**Close it.** **api/lane-c** — the spec already has the loop; widen `FORM_ROUTES` from the three hand-picked
paths to a sampled set drawn from the manifest (e.g. every 20th entry, ~14 paths) and assert both fetch-site
values plus the empty log. No plumbing change; the manifest is already the source of the list.

**Proof.** `expect(reached).toEqual([])` (the existing assertion at `foreign-origin.spec.ts:64-68`) plus the
status; a guard that only reads `Origin` answers 200 here and leaves a mock entry.

---

## 7. An assertion in the sweep cannot fail, and its blocker list is hand-kept

**Read.** `suites/api/sweep.spec.ts:176-180`:
`expect(upstream.every((request) => request.status < 500), … )`, and `:194` `toBeLessThan(500)`.
`DOCUMENTED_SERVER_BLOCKERS` at `:74-120` — 9 hand-written entries, 6 of them "an empty-but-valid JSON body …
500s instead of a validation 400" (`POST /api/auth/login`, `/api/auth/register`, `/api/auth/signin-email-confirm`,
`/api/auth/verify/code`, `/api/image-assets/upload/[folder]`, `DELETE /api/timer/timesheet/bulk-delete`) and 1
labelled honestly as a mock gap (`POST /api/invite/accept` → 502).

**Wrong.** The mock only produces a 5xx behind a fixture switch — its 500s are `[HTTP_STATUS]: 500` in three
places and its catch-all (`mock-gauzy-server.mjs:792-794`) answers 200/201/204 — and the sweep sets no scenario
(`grep -n "scenario(" suites/api/sweep.spec.ts` → no match). So `upstream.every(status < 500)` is satisfied by
construction: it cannot tell a route that behaved from a route that misbehaved upstream. The status assertion at
`:194` is the one carrying weight, and `toBeLessThan(500)` is the ceiling that lets a 403-shaped "the mock
cannot answer this" pass as correct behaviour — which is the category-3 weakness in its purest form: a 502 from
`forward-to-gauzy.ts:135-145` (upstream gave no answer) and a 502 from a real refusal look identical.

**Close it.** **api/lane-c** — two changes in `sweep.spec.ts` itself: (a) drop the vacuous `every(...)` or give
it a case where it *can* fail (set `scenario({ fail: … })` for one probe and expect the app's 502 answer shape);
(b) for each blocker, assert the **body** the app produced, not only the status, so a mock-gap 502 and an
app-side 500 are distinguishable in the failure message. **user** — the sweep's blocker list being hand-kept
while `empty-body-blockers.generated.ts` is generated is your call to align.

**Proof.** Mock evidence for the distinction: a mock gap leaves an *empty* log (no upstream route exists to
answer) or a 404-shaped entry, while an app outage answer arrives with the log holding the request that timed
out (`forward-to-gauzy.ts:135-145` produces 499/502/504 depending on which side failed).

---

## 8. 66 pinned 5xx blockers are the suite's debt ledger, and its regeneration absorbs new debt

**Read.** `suites/api/empty-body-blockers.generated.ts` — 66 entries, **64 at 500 and 2 at 503**
(`audit-evidence.md` §L). `suites/api/empty-body.spec.ts:5-21` states the rule and the rebuild command
(`scripts/collect-empty-body-blockers.mjs`, built from a run's observed statuses), and `:77` asserts each pinned
status exactly (`.toBe(blocker.status)`). Today the file is 261 tests
in a green run.

**Wrong.** The mechanism is right for a handler that *gets fixed* (its entry then fails until removed) but weak
for a handler that *breaks*: a newly 500-ing handler is one regeneration command away from being pinned as
expected. `AUDIT.md` finding 2 is the same class of problem — a red state whose documented remedy is
"regenerate". And 64 of these are "a reachable-from-the-browser route throws on a bodiless call", which the
suite has now formally accepted rather than scheduled.

**Close it.** **api/lane-c** — keep the file, add one named case in `empty-body.spec.ts` for a handler that
already answers 4xx to a bodiless call (the header claims several do: `await req.json().catch(() => null)`), so
the suite pins the *good* shape too and a regression from 400→500 is not "just another entry". **user** —
whether the 64 get fixed or stay pinned is an app decision, not a lane's.

**Proof.** A pinned blocker proves itself by its own status assertion (`expect(status).toBe(blocker.status)`);
a new blocker is only visible in the diff of the generated file, which is why the good-shape case matters.

---

## 9. `tabSessionOf`: a request's own `Authorization` header can replace the cookie token, decoded without verifying the signature — and nothing tests it

**Read.** `core/services/server/tab-session.ts:1-2,20,36-45` — the header name is `x-tab-team-id`
(`core/lib/auth/tab-team-header.ts:6`), the claims come from `decodeJWT` (`core/lib/auth/jwt-utils.ts`,
documented as "Decode a JWT token payload without verifying the signature"), and the tab token replaces the
cookie token when the decoded claims name the same user and tenant and a different organization. Consumed by
`forward-to-gauzy.ts` and `authenticated-guard-app.ts` (both name `tabSessionOf`), and by
`forward-download-to-gauzy.ts`.

**Wrong.** No Playwright or Cypress spec names `x-tab-team-id`, `TAB_TEAM_HEADER` or `tabSessionOf`
(`grep -rln "x-tab-team-id|TAB_TEAM_HEADER|tabSessionOf" playwright cypress core` → core files only). The
behaviour decides **which token a proxied request is forwarded with** — the single most load-bearing thing in
the proxy layer — and its proof today is unit-level only (`core/services/server/guards/authenticated-guard-app.test.ts`).

**Close it.** **lane-c** — four cases in `foreign-id-scope.spec.ts` (whose whole subject is "which credentials
travel"): same user + same tenant + different organization + `x-tab-team-id` → `receivedTokens(path)` must be
the sha256 of the header token; a header token whose claims name another **user** or another **tenant** → the
cookie token still travels; a header with a team id but no bearer → unchanged. **user** — whether an unsigned
`alg:none` decode may be allowed to change the credential of a proxied write is your decision to state in the
PR; the tests only pin it.

**Proof.** `receivedTokens(path)` (`helpers.ts:58-61`) is the one piece of mock evidence that reads a bearer
exactly, and `foreign-id-scope.spec.ts:190-193` already uses it in that shape.

---

## 10. "Refused here" versus "refused upstream" is proved well in one file and nowhere else

**Read.** The good example: `suites/api/tenant-boundary.spec.ts` — it asserts the exact mock triple
(`['POST /api/auth/switch-organization 200']`), parses the claims out of the token it was granted, answers 405
for a GET, and distinguishes "refused here" (empty log) from "refused upstream" (`[401]`). The weak examples:
`suites/lane-c/permission-guard.spec.ts` proves the 403 after exactly one `GET /api/role-permissions/me 200`
(good), but `lane-c/permission-guard.spec.ts`'s own header concedes "the mock answers the same five permissions
whatever the scenario says" (`mock-gauzy-server.mjs:38-50`), so it can only ever prove refusal; and
`suites/lane-c/foreign-id-scope.spec.ts:135` uses `toBeLessThan(500)`, which a 403 and a 200 both satisfy.

**Wrong.** Everywhere `toBeLessThan(500)` is the whole assertion (`sweep.spec.ts:194`,
`foreign-id-scope.spec.ts:209,234,255`, `session-check.spec.ts:111,144-146`), a 403 and a 200 are the same
result, and the "would the mock answer this at all?" question is left to the reader. `mock-gauzy-server.mjs:792-794`
answers every path, so no probe in these suites can ever see a 404 — "the platform refused" is not expressible.

**Close it.** **lane-c** — in each file, replace the bare ceiling with the triple + status pair the
`tenant-boundary` file already uses; where a status genuinely must stay open, say which statuses are acceptable
and why in the message string. **user** — the only change that closes this at the root is teaching the mock to
say "no" (a 404 for an id outside the request's scope, behind a scenario switch so Cypress is unaffected, at
`mock-gauzy-server.mjs:792-794`); until then these specs should keep writing the honest half into their headers
the way `foreign-id-scope.spec.ts:26-34` does.

**Proof.** The pair that separates the two: status **and** the mock triple. Refused here → `[]`. Refused
upstream → `['GET /api/… 401']`. Answered → `['GET /api/… 200']` with rows whose `tenantId` is the session's.

---

## 11. The page gate covers 9 of 16 protected families and 4 of 13 locales

**Read.** `suites/api/page-gate.spec.ts:56-66` (9 paths: `/settings/personal`, `/settings/team/members`,
`/profile`, `/work-diary`, `/my-week`, `/views`, `/meet`, `/board`, `/task/<id>`), `:74-78` (4 locales,
`/settings/personal` only each), `:81-91` (5 auth pages answered 200), `:99-107` (`/team/*` exemption pinned as
"documented, not approved"). Against `core/constants/config/constants.tsx:116-133` — **16** protected patterns:
the 9 probed families **plus `goals`, `inbox`, `favorites`, `chat`, `docs`, `about`, `workspace`**.
`proxy.ts:96-112` is the matcher, `:160-165` the `team` early return, `:519-522` the case that answers 307.

**Wrong.** 7 families in the gate's own list are unpinned, so a matcher edit that drops `favorites` or `chat`
would be green. This is the same failure mode the suite already caught once (the file's comment at `:68`: "The
2026-08-17 sweep finding: only the default locale looked protected") and only partly repaired.

**Close it.** **api/lane-c** — the file's loop is already data-driven: extend `PROTECTED` with one path per
remaining family and pick one non-English locale beyond `fr/de/ar/zh` from the matcher's list. **lane-b** owns
the browser half: one signed-in visit per family, asserting the door did **not** bounce a session that is
present (the mirror case, which the api suite cannot see because it has no cookies).

**Proof.** No mock needed for the api half: status + `Location` (the `expectRedirectTo` helper). For lane-b the
mock log proves the app then behaved as a signed-in app — an entry with `receivedTokens` — where the bounced
page produces no data call at all.

---

## 12. Nobody owns the sign-in POSTs at route level

**Read.** `lane-c/PLAN.md:249-251` — "`app/api/auth/**` sign-in routes (login/register/verify) beyond the
malformed-body probe" are deliberately not taken, deferring to `suites/api/auth-refresh.spec.ts` (which covers
`/api/auth/refresh` semantics only: 400/200/502/500, no cookie written on refresh). lane-b is the lane that
would cover them **from the browser** (`lane-b/PLAN.md` items 1 and 8-10: 400s, 401s, expired codes, "the mock
refuses a code it already handed out") — and nothing in lane-b has run
(`lane-b/README.md:30-32`, `lane-b/PLAN.md:43-44`; the only lane-b artifact run, 05:41, skipped its 1 test).

**Wrong.** The unguarded, cookie-writing family from finding 1 is the one every lane has pointed at another
lane for. `POST /api/auth/[...nextauth]` is on the same list.

**Close it.** **lane-b** — its passcode/password specs already exist in the working tree; the queue in
`lane-b/PLAN.md:14-27` is the right order (probe first, then 400/401 pins). **lane-c** should take the *route-level*
half that lane-b cannot reach with a browser: a bodiless and a malformed-body probe per auth POST, asserting the
**absence** of `set-cookie` on every non-2xx answer (the assertion `auth-refresh.spec.ts` already makes for
refresh, applied to login/verify/reset).

**Proof.** The mock distinguishes a refused sign-in from a signed-in one without understanding tokens:
`state.receivedTokens` stays empty for a rejected flow and gains an entry once a token is stored, and the mock
records the code/email it handed out (`/api/invite/*`, `/api/auth/*` fixture rows), which is what makes
"the same code twice" testable at all.

---

## 13. The mock is authentication-blind, and two suites' conclusions quietly depend on it

**Read.** `mock-gauzy-server.mjs:532` (`/api/user/me` answered with the fixture user, no check), `:911`
(ever-platform `signedIn` = "any Bearer arrived"), `:27-33` (answered rows follow the `tenant-id` header or a
`tenantId`/`where[tenantId]` query or `scenario.scope`, never an id in a path), `:792-794` (catch-all),
`:38-50` (five fixed permissions), `:1038-1048` (the log holds no header and no body).

**Wrong, per suite.** `ever-connect` / `ever-stats` refusal proofs mean "no token at all", not "invalid token";
`foreign-id-scope.spec.ts:94-100` can only show "the rows came back from *our* tenant" (it says so);
`permission-guard.spec.ts` can only prove refusals; `session-check.spec.ts` can only prove delegation. All four
files record this in their headers — that part is handled well — but the **limits are the reason four
categories of behaviour have no test at all**, so they belong in the plan, not only in the comments.

**Close it.** **user** (these are decisions about a file shared with Cypress, not a lane's edit): behind scenario
switches, (a) `/api/user/me` answers 401 with no Bearer, (b) an id outside the request's scope answers 404,
(c) the permission list follows the scenario. **lane-c** meanwhile can close one hole without any mock change:
`PUT /api/invoices/email/[email]` is "covered" only because the spec hardcodes `manager@example.test`
(`audit-evidence.md` §H) — name the route shape instead.

**Proof.** Each switch makes a currently-unexpressible assertion expressible; the lane that gets them replaces
its "pinned, not approved" case with a real one and says which one it replaced.

---

## 14. The mock's request log is a shared resource with only a per-test reset

**Read.** `api-fixtures.ts:51-65` — the `mock` fixture is `auto: true` and calls `mockReset()` before every
test; the log is method/path/query/status with no owner (`mock-gauzy-server.mjs:1038-1048`); the api suite runs
`workers: 1`. Contamination was observed in the 2026-11-19 run (a `foreign-origin` case failed because the log
held `PUT /api/employee/me/presence`, and another held three calls from other tests — read from the artifact
then, which the 2026-11-21 05:32 run has since overwritten). Today the api run is 1152 expected / 0 unexpected,
so the contamination is **not reproducing**; whether it was fixed or is timing-dependent is UNVERIFIED.

**Wrong.** A test's evidence is "the whole log", and nothing in the log says which test produced a call. A
route that keeps a request alive past its own test (retry, memo, a delayed scenario like
`session-check.spec.ts:210-223`) writes into the next test's evidence. `session-check.spec.ts:219-223` already
works around it by hand ("give it past its own delay and reset, so its late entry lands in a log the next test
throws away") — a per-file workaround is not a rule.

**Close it.** **api/lane-c** — every exact-log assertion should compare against a *filtered* view (path
fragment + method), as `foreign-id-scope.spec.ts:61-63` does with `triple()`, rather than the whole log, which
is what `session-guard.spec.ts:105-107` and `foreign-origin.spec.ts:64-68` do today; and a late-entry test
should end with the same reset `session-check.spec.ts` does. **user** — if the mock should stamp each entry with
a test id, that is a `mock-gauzy-server.mjs` decision.

**Proof.** A contaminated assertion shows up as a superset in the "Received" line; a filtered assertion fails on
the entry it actually cares about, and the message names it.

---

## 15. lane-c's own green depends on a Next-dev behaviour nobody measured, and on one lane's port literal

**Read.** `lane-c/PLAN.md:68` (the open question: "If Next's dev server itself writes a `Cache-Control` on these
answers, the four 'no directive' pins fail") and `cache-directive.spec.ts`'s pinned "no directive" cases. On the
Next side I read `node_modules/next/dist/server/base-server.js:1305-1307` — inside `sendPayload`,
`if (this.dev) { res.setHeader('Cache-Control','no-store'); cacheControl = undefined; }` — and
`send-payload.js:62-64` (the configured directive is applied only if no `Cache-Control` is already set), while
`spec-extension/response.js:90-93` shows `NextResponse.json` adds nothing. Whether an `app/api/**` route handler
in dev goes through `sendPayload` at all is **UNVERIFIED** — that is exactly the question the four pins ask, and
only a run answers it. Second: `lane-c/session-guard.spec.ts:206` hardcodes
`expect(APP_ORIGIN).toBe('http://localhost:3033')`, so the lane breaks the moment lane ports move — and they
moved today (`git status` shows `test-servers.ts` and `scripts/lane-servers.mjs` modified twice, with commits
`b19990f6e` and `19bad3b9e` fixing lane wiring).

**Close it.** **lane-c** — replace `:206` with an assertion that the origin the suite used equals the origin the
helpers derived from `E2E_LANE` (`test-servers.ts`'s `APP_ORIGIN` is the single source; comparing the suite's
constant to `LANE_PORTS` rather than to a literal keeps the check and drops the number). For the cache pins, run
the four cases once and record which side answered — the mock's `no-store` (`mock-gauzy-server.mjs:991`) versus
the dev server's — in `lane-c/PLAN.md`.

**Proof.** The header string itself is the evidence; `public-link-shape.spec.ts` already pins a missing
directive on `/api/public/team/...` whose handler returns `NextResponse.json(response.data)` with no
`Cache-Control` (`app/api/public/team/[profileLink]/[teamId]/route.ts:29,37`).

---

## 16. Two lane-hygiene items that will be misread as findings

**Read.** (a) `lane-b/zz-probe.spec.ts` is a deliberate always-fail assertion (`expect(dump, 'PROBE LANE-B').toBe('<<<dump printed in the Received line above>>>')` —
read from `git show HEAD:apps/web/playwright/suites/lane-b/zz-probe.spec.ts`); it is deleted in the working tree
(` D` in `git status`) but still tracked in HEAD, and the only run it ever had was **skipped**
(`playwright-lane-b.json`, 05:41: 1 test, skipped, 0 executed). (b) `lane-a` has no README
(`git ls-tree … playwright/suites/lane-a` lists only specs) while lane-b and lane-c both carry one, and lane-a's
4 current failures are all `waitForShellReady` timeouts at `helpers.ts:341` (`playwright-lane-a.json`, 05:39,
941 s for 4 tests), which is the starved-machine signature `playwright/README.md:148-156` documents with numbers
(140 passed / 5 failed in 40.4 min under three competing `next dev` processes; the same 5 alone: 2.6 min, 5 passed).

**Wrong.** A committed always-fail probe is indistinguishable from a defect to anyone reading CI, and a lane
with no README has no place to record "not yet run", so its red reads as an app bug. `lane-a`'s timeouts are the
case in point: they are harness conditions, not findings.

**Close it.** **lane-b** — land the deletion, or move the probe behind a `test.skip(…, 'probe')` with the
reason in its title. **lane-a** — add the README the other two lanes have, and re-run the four timer cases alone
(`--grep`) with no other lane running, quoting both numbers as `README.md:154-156` asks.

**Proof.** None needed beyond the artifact and the README numbers.

---

## 17. Two mock-suite conclusions are shaped by the harness that produced them

**Read.**

- `suites/mock/favorites.spec.ts:56-71`: the spec installs its own stub for `POST /api/favorite` and builds the
  row it then asserts on **out of the request body it was given** — `entity: body.entity, entityId: body.entityId,
  employeeId: body.employeeId, organizationId: body.organizationId, tenantId: body.tenantId` (`:61-65`) — and
  fulfills 201 with it (`:70`). Whatever the app puts in `tenantId` comes back as the stored row's `tenantId`.
- `suites/mock/timer-mutation.spec.ts:178-183`: the tenant-scope claim is read off the **order** of the mock log
  ("the read that matters is the last one *asked* (highest `startMs`), which the reopened page sent", `:178-179`),
  then `expect(lastScope).toBe(fixture.ids.tenantB)` at `:183` on the `where[tenantId]` of that entry.
  `startMs` is in the log precisely so this can be done (`mock-gauzy-server.mjs:1038-1048`).

**Wrong.** The first is category 4 in its purest form: a test that fabricates the answer from the request cannot
show that the request carried the right tenant — the assertion is satisfied by the stub's own construction, and
what it actually pins is "the app sent a `tenantId` field at all". The second is a real claim resting on the one
piece of evidence the log offers weakestly: relative timing of overlapping delayed answers, on a machine
`README.md:148-156` documents as starved (UNVERIFIED whether it fails under load — today's mock run covered
neither file).

**Close it.** **lane-c/api** — the same claim, proved at the route instead of in the browser: a stub-free
`POST /api/favorite` through the app's own route handler, asserting `receivedTokens('/api/favorite')` and the
`tenant-id` header… which the log does **not** hold (finding 13) — so the honest replacement is the mock's own
scope rules (`mock-gauzy-server.mjs:27-33`): ask with tenant A's session for a body that names tenant B and
assert what the mock *answered*, not what the stub stored. For `timer-mutation`, pin the read by its query
fragment rather than by its position in the log (`foreign-id-scope.spec.ts:61-63`'s `triple()` pattern).

**Proof.** Both replacements change which side of the exchange is asserted: stub-built rows prove nothing about
the caller, mock-scope-built rows do.

_Note for the record:_ an earlier draft of this finding cited a `suites/mock/auth.spec.ts` comment about a 401
being unanswerable against the mock, and an `either tenantId or null` assertion in that file. **That is no longer
in the tree** — the current `suites/mock/auth.spec.ts` (172 lines, `wc -l`) contains neither string
(`grep -n "tenantId\|401\|503" playwright/suites/mock/auth.spec.ts` → no match). The file changed while this
audit was being written; treat that draft version as withdrawn.

---

## 18. Cosmetic, and last: a timing pin on a machine documented as starved

**Read.** `suites/api/token-cookie-chunks.spec.ts:139` — `expect(tookMs).toBeLessThan(5_000)`. And
`lane-b/PLAN.md:56` lists "`/api/version` answers 501: pin it" as its own cosmetic item — **no such pin exists
today** (`grep -rn "api/version" playwright/suites` → no match), so the item is a proposal, not a finding.

**Wrong.** A 5-second bound on a chunked-cookie read is the assertion most likely to go red for a reason that
isn't the app: `README.md:148-156` measured 40.4 min for a run that took 2.6 min alone, on the same PC that ran
the four `waitForShellReady` timeouts at 05:39 today.

**Close it.** **api/lane-c** — widen the bound (e.g. 30 s) and put the machine-load condition in the failure
message, or gate the timing case behind an env flag so it is skipped when other lanes are running. Nothing else
in this finding needs doing.

---

## What the harness itself is missing

1. **No history of runs.** `artifacts/` is git-ignored (`.gitignore:132-133`), so each run overwrites the last:
   the lane-c artifact I read at 07:45 (`expected 1, unexpected 25`) was gone by 08:08, and
   `artifacts/test-results-lane-c/` that held ~20 `permission-guard` failure directories is now empty. A finding
   that a run produced cannot survive the next run. (One line appended per run — time, config, counts, the
   `--grep` used — would fix this without new plumbing.)
2. **"Which tests ran" is not recoverable.** Today's mock artifact holds 5 tests across 4 files while
   `README.md:148-156` describes a 145-test mock run; the artifact records `config` but not the filter. Green
   over 5 tests reads as green over the suite.
3. **No residual report.** The generators know exactly what they cover and never print what they skip
   (`collect-foreign-origin-routes.mjs:30,37,114`). Findings 1, 2, 5 and 11 are all "the suite cannot see its own
   blind spots", and one printed residual would close all four as a class.
4. **No coverage owner for the sign-in POSTs or for the 33 unguarded writes** (findings 1 and 12): lane-c's PLAN
   declines them, lane-b has never run, the api suite builds its lists from guards that do not exist there.
5. **Machine load is not measured where it is blamed.** `README.md:148-156` asks for both numbers and
   `suites/lane-b/README.md:34-37` asks for a load column on every `mock.stats()` line; `lane-b/PLAN.md:77-81`
   already proposes a floor. Nothing in the harness records memory, queue depth or "other lanes running" at the
   moment a timing assertion fails — and lane-a's 4 timeouts today are exactly that gap.
6. **The evidence channel is the mock log, and its two known weaknesses are body/header-blindness**
   (`mock-gauzy-server.mjs:1038-1048`) **and the catch-all** (`:792-794`). Everything the server suites prove is
   "a request left, or didn't" plus a status. That is enough for origin/session/tenant boundaries and is not
   enough for anything about *what the platform answered* — which is why `foreign-id-scope.spec.ts:26-34` and
   `lane-c/PLAN.md:202-227` keep writing honest half-claims. If the harness should ever prove a payload
   boundary, the mock has to answer with tenant-scoped rows (a `user` decision).
