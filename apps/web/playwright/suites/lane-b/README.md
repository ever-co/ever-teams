# lane-b — sign-in, session, locale

Lane: `E2E_LANE=lane-b` → app **3032**, mock **3996**, statistics sink **3997**, control API **3998**, fake issuer
**3999**, build dir `.next-lane-3032`. Never 3030 / 3988-3991 (canonical) and never 3031 / 3992-3995 or 3033 /
4002-4005 (lanes a, c). Mock only — nothing here can point at `api.ever.team` / `api.gauzy.co`.

The long form — every case, the mock's limits, the findings and the predictions a run has to settle — is
**[PLAN.md](PLAN.md)**. This file is the index and the honest run status.

## Run status, stated exactly

**Run 2026-11-22 by the two lane-b agents of that day: the whole lane green — 76 passed (3.5m)**
(`E2E_LANE=lane-b npx playwright test --config apps/web/playwright/playwright.lane.config.ts`, log
`E:\Coding\.tmp\lane-b-full-1.log`; per file and per run: **PLAN.md §11 and §12**, which name the log beside every
number). The status below it is kept as it was written, because it is the state this lane was in before that run.

```
$ E2E_LANE=lane-b npx playwright test --config apps/web/playwright/playwright.lane.config.ts
  Running 76 tests using 1 worker
  76 passed (3.5m)                                      → full log: E:\Coding\.tmp\lane-b-full-1.log
  per file, from that log's own ok lines: route-refusals 17 · session-routing 15 · password-recovery 11
  · signup-forms 8 · passcode-journey 7 · cookie-jar 6 · password-journey 6 · locale-rendering 6
```

---

**Written 2026-11-20, before any of the above: "nothing in this lane has been executed."** Every number below *that*
line is a `--list` count read off a real command; `--list` compiles the specs and resolves the fixtures, and starts no
server and no browser.

```
$ cd apps/web && node ../../node_modules/typescript/lib/tsc.js -p playwright/tsconfig.json --noEmit
  tsc exit code: 0

$ E2E_LANE=lane-b npx playwright test --config apps/web/playwright/playwright.lane.config.ts --list
  Total: 75 tests in 8 files
  cookie-jar 5 · locale-rendering 6 · passcode-journey 7 · password-journey 6 · password-recovery 11
  · route-refusals 17 · session-routing 15 · signup-forms 8

$ cat apps/web/playwright/artifacts/playwright-lane-b.json | (stats)
  {"startTime":"2026-11-21T14:42:34.863Z","duration":670.111,"expected":0,"skipped":75,"unexpected":0,"flaky":0}
  → every test skipped, none executed: the fingerprint of a listing.
```

`artifacts/test-results-lane-b/` holds only `.last-run.json` = `{"status":"failed","failedTests":[]}` from **Nov 19
11:37**, the killed predecessor lane. `netstat` on 3032 / 3996-3999: nothing listening — this lane's servers have
never been started. So at commit `b79817c54` the honest state was **75 discovered, 0 run**. It is not that any more — see
the next section.

## Ran 2026-11-21, by the orchestrator rather than this lane — 45 passed / 30 failed in 4963 s

```
$ E2E_LANE=lane-b E2E_BROWSER_CHANNEL=chrome npx playwright test --config apps/web/playwright/playwright.lane.config.ts
  Running 75 tests using 1 worker
  30 failed
  45 passed (1.4h)
  playwright exit=1                                     → full log: E:\Coding\.tmp\lane-b-verify.log

$ (stats of apps/web/playwright/artifacts/playwright-lane-b.json, written by the same run)
  {"duration":4963,"expected":45,"skipped":0,"unexpected":30,"flaky":0}   → the log and the report agree
```

Per file (pass / fail, of the discovered counts above): `session-routing 12/3` · `route-refusals 10/7` ·
`password-recovery 7/4` · `cookie-jar 4/1` · `locale-rendering 4/2` · `signup-forms 4/4` · `passcode-journey 2/5` ·
`password-journey 2/4`.

What that number does and does not say, stated plainly because 30 reds is a big number and a big number invites the wrong
story:

- **No red here has been diagnosed yet.** Nobody (me or an agent) read a failure's expected-vs-actual one by one before
  the owner paused the fleet. Each is still a question, not a verdict.
- **Two cases took 3.0 min each** (`password-recovery` "two different passwords are refused on the confirmation" and
  `signup-forms` "a real name with an address that is not an address"), against 1.4–27.6 s for the other 73 — an order of
  magnitude out of family. The run shared the machine with three other lanes and a 10–11 GB local model server on a
  33 GB PC, so *some* of these 30 are expected to be contention or timeout artefacts rather than findings. Re-run any
  red alone with `--grep` and quote both numbers before believing either reading.
- Four reds are the lane's own claims about the app, and they are the interesting ones if they survive a clean re-run:
  `POST /api/auth/refresh` answering **502 rather than 401** for an answer with no token pair; `POST /api/auth/login`
  crashing on the mock's echo of an invitation code (predicted from the source, written in `PLAN.md` §5 before it was
  seen); `POST /api/organization-team-join` relaying an anonymous, foreign-shaped body with no session and no origin
  check (audit finding 1 pinned as today's behaviour); and a 5-of-8 magic code producing no message at all.
- Three reds are about the mock's limits rather than the app (`password-journey`'s valid attempt, the reset/sign-up
  cases the mock cannot finish), which is exactly the distinction `PLAN.md` asks for: fix the mock's owner's file only
  with its owner's agreement, never with a `page.route` stub in a lane.

## Diagnosis of those 30 (this lane, from 2026-11-21) — verdicts in PLAN.md §9

The one structural fact that explains most of them: **the mock's request log spells every path with this app's `/api`
prefix** — `serverFetch` fetches `GAUZY_API_SERVER_URL + path` and that constant is `basePath + '/api'`
(`core/services/server/fetch.ts`, `core/constants/config/constants.tsx`); the browser's axios `baseURL` is built the
same way (`core/services/client/axios.ts:110`), so `authService`'s direct branch posts `POST <mock>/api/auth/…`. A
filter written as `/auth/…` matches nothing: it red-flagged four forwards the app really did, made every
`mockAskedNothing` witness pass for the wrong reason, and it is why `watchAppApi` (app origin) saw only NextAuth's
chatter in three browser cases whose sign-in request went straight to the mock. `lane-auth-helpers.ts` now carries a
`watchMockApi` witness for that leg and `AUTH_API_PATHS` in the recorded spelling.

| file | reds | verdicts (A app / M mock gap / C contention / T wrong assumption) | re-run by this lane |
| --- | --- | --- | --- |
| `route-refusals.spec.ts` | 7 | 4 T, 3 carrying A (`/api/auth/login` 500 crash; unguarded join relay; the bearer-less `/user/me` check), 2 carrying M | **`17 passed (22.3s)`** — `E:\Coding\.tmp\lane-b-diag-refusals-1.log`, on a lane this lane started itself; every case 46-420 ms, so no C among them |
| `passcode-journey.spec.ts` | 5 | 5 T, one carrying A (the too-short-code silence) | none yet — the lane was taken back before a run |
| `password-journey.spec.ts` | 4 | 4 T (three: `'/api/auth/'` matching NextAuth's own `/api/auth/session`; one: the password POST goes to the mock, not to this app) | none |
| `password-recovery.spec.ts` | 4 | 3 T (forgot and reset both take the direct branch; one eager-message `textContent()` hang) + **1 open** (the six rules, `:201`) | one fixed in code (`:255`), two queued with their exact fix written in PLAN.md §9 |
| `signup-forms.spec.ts` | 4 | 2 T fixed (the same eager-`textContent()` hang; a `getByText` that hit both the `<h1>` and the `sr-only` `<legend>`), **2 open** (`:211`, `:253`: the register route really is on the app leg, so the form never submitted) | none |
| `session-routing.spec.ts` | 3 | 1 M (an expired token is *refreshed* by the door, and this mock always grants a pair → `deny_redirect` is unreachable), 1 A+T (the door does drop the auth page, and lands on `/fr`), 1 A (sign-out leaves `auth-active-project`: `cookiesKeys()` does not list it) | none |
| `cookie-jar.spec.ts` | 1 | 1 M (the same refresh chain) | none |
| `locale-rendering.spec.ts` | 2 | 1 A (`NEXT_LOCALE` is next-intl's own cookie, `sameSite lax`; the app writes no locale cookie) + 1 T fixed (`/api/languages` is asked on the mock leg) | none |

**No red here was ever contention (C).** Every one of the 30 died on a legible assertion — the two 3-minute cases died on
`locator.textContent … waiting for locator('#…-error')`, i.e. a message built eagerly around an element the case asserts
is absent, not on a slow machine. No case was deleted, skipped or loosened.

Cases renamed while fixing a wrong assumption (same case, honest title): `passcode-journey.spec.ts` "asking for a code
asks this app, which asks the mock, and opens the code step with the address in it" → "asking for a code sends it
straight to the API with this app's branding, and opens the code step with the address in it"; `route-refusals.spec.ts`
"…/verify/resend-link without a session is refused by the guard, not by the API" → "…with no cookies is relayed,
because this mock hands /api/user/me to anybody"; "POST /api/auth/refresh answers 502, not 401 …" → "POST
/api/auth/refresh rotates on this mock, because the mock does answer the refresh path with a pair". Nothing was
deleted, skipped or loosened: two pins got *stricter* (a bearer-less session check, an ask-count witness that the old
path filter could not prove at all).

## What each file proves

| file | discovered | run | what it is for |
| --- | --- | --- | --- |
| `passcode-journey.spec.ts` | 7 | 0 | the magic-code flow end to end, with three witnesses per test: what the browser sent (`watchAppApi` reads `request.postData()`), what the mock was asked (its own path log), and what the page painted. Pins the real defect that a 5-of-8 code produces no message at all. |
| `password-journey.spec.ts` | 6 | 0 | `/auth/password`: the client's refusals, the method switch keeping the address, one valid attempt whose body is `{email,includeTeams,password}` and whose only mock ask is `/auth/signin.email.password` — then the app's silence (still on the credentials step, no "Incorrect email address or password", empty jar), which is the mock's limit, not the app's answer. |
| `signup-forms.spec.ts` | 8 | 0 | name / address / team refusals with `authFormValidate`'s wording, the existing-account hint and its link, `?email=` prefill, the team reveal proved closed (`revealHeight 0` + `inert`) then open (`revealBoxOf`), the finished form reaching `/api/auth/register` with `{name,email,team,timezone}` and no password. |
| `password-recovery.spec.ts` | 11 | 0 | forgot: empty / malformed / valid (body keys exactly `['email']`, mock asked `/auth/request-password`); reset: no token → "This link no longer works", an expired JWT → the same refusal, an undecodable token → the form offered, the 6 rule rows, too-short and mismatched passwords, a complete reset reaching `/api/auth/reset-password` with `{confirmPassword,password,token}` and setting no cookie. |
| `session-routing.spec.ts` | 15 | 0 | the browser half of the door for the seven protected families no other suite walks (`/goals /inbox /favorites /chat /docs /about /workspace`) → `/unauthorized`, the refusal pinned as a 307 the browser followed, and the door's two different answers: no cookies → `/unauthorized`; an expired token plus a refresh cookie → `/auth/passcode` with the family cleared, proved by the jar before and after the same navigation. Also the locale drop, signed-in visits to auth pages, the two recovery pages staying open, and sign-out emptying the jar. |
| `route-refusals.spec.ts` | 17 | 0 | audit finding 12, handlers with no browser, each saying **refused here** (empty mock log) or **forwarded** (the mock was asked): `signin-email`, `signin-email-password`, `signin-email-confirm`, `register`, `request-password`, `reset-password`, `verify/resend-link` (finding 6: `Sec-Fetch-Site: same-site` refused as firmly as `cross-site`), `refresh` (400 for a missing token, 502 — never 401 — for an answer with no pair) and `send-code` / `login`, which answer their own field errors on a **200**. Plus audit finding 1 pinned as it is today: `POST /api/organization-team-join` is guarded by nothing at all, so an anonymous cross-site POST is relayed to the API unchanged. |
| `locale-rendering.spec.ts` | 6 | 0 | `lang="ar"` with Arabic copy and `dir` **null** / `direction: ltr` (the app writes `lang` and nothing else — pinned as a defect); French copy; `/en/` losing its prefix; no locale cookie from an Arabic visit; `lang="ar"` while `auth-active-language` is still `'en'`; and the preferences page asking `/api/languages` and answering "No language is available." |
| `cookie-jar.spec.ts` | 5 | 0 | everything through `context.cookies()` (`document.cookie` cannot see an `httpOnly` cookie): the ten fixture cookie names, root path, `httpOnly=false secure=false sameSite='Lax'`, nothing off this origin and nothing scoped to `ever.team`; `auth-token` read as claims only; no chunk marker; a refused code leaving no `auth-*`; and the door's cleared names sitting in the jar with **empty values**. |

Supporting file: `lane-auth-helpers.ts` (366 lines) — the lane's own witnesses (`watchAppApi`, `mockCallsExactly`,
`sessionCookies`, `revealBoxOf`, the code slots, the expired-session cookie writer). It exists because `helpers.ts`,
`fixtures.ts` and `api-fixtures.ts` are shared with lanes a and c and are not this lane's to change.

## What blocks a green run of this lane (read from the code, none of it measured yet)

1. **The mock answers every auth POST by echoing the request body.**
   `cypress/support/mock-gauzy-server.mjs`'s `routeResponse` has no handler for any `/auth/…` path, so no form submit
   can sign anyone in, no wrong password can be refused, no code can be refused, no token is issued and no session can
   be renewed (`/auth/refresh-token` echoes `{refresh_token}` and carries no `token` — which `app/api/auth/refresh`
   answers 502, and which is why a signed-in shell after a form submit is unreachable in a mock run). The half this
   lane can prove is the request a real refusal would follow, plus the cookies a real refusal would not write.
2. **No captcha exists in a lane run**, so the audit's "a reCAPTCHA failure is 400 `{errors:{recaptcha}}`" is not
   writable here: `NEXT_PUBLIC_CAPTCHA_SITE_KEY=''` (harness) and `apps/web/.env`'s `NEXT_PUBLIC_CAPTCHA_TYPE=` and
   `CAPTCHA_SECRET_KEY=` are both empty, so `ReCAPTCHA` renders nothing and `register` skips `recaptchaVerification`.
   It needs a harness change, not a test.
3. **`/api/languages` answers `pagination([])`**, so both language switchers have nothing to select — the locale proof
   here is a locale URL, not a click.

Two things the earlier audit wording got wrong about my lane, corrected against the tree: there is **no
`/api/auth/passcode` handler** at all (`find apps/web/app/api -iname '*passcode*'` prints nothing); the passcode page
posts `/api/auth/signin-email` (`authService.signInEmail`, proxy mode) and the sibling `/api/auth/send-code` is not
called by anything in `apps/web`. And "an unverified mock user never gets a shell" is not a finding of mine — I never
started a server or a browser; what I found by reading is §4 of PLAN.md, which is labelled as reading, not measurement.

## Running it, when the lane gets the machine

`node apps/web/playwright/scripts/lane-servers.mjs up lane-b` (server output goes to
`artifacts/lane-lane-b-server.log` — read that file before believing a wall of timeouts), then batches with **one**
`--grep` (two `--grep` flags are not an OR, the last one wins): `--grep "lane-b · the sign-in routes refuse"` first
(no browser), then the browser families. Before trusting any red auth test: `lane-servers.mjs check lane-b`. Full
queue and the kill list are in PLAN.md §7.
