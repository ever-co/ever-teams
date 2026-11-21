# lane-b — sign-in, session, locale

Lane: `E2E_LANE=lane-b` → app **3032**, mock **3996**, statistics sink **3997**, control API **3998**, fake issuer
**3999**, build dir `.next-lane-3032`. Never 3030 / 3988-3991 (canonical) and never 3031 / 3992-3995 or 3033 /
4002-4005 (lanes a, c). Mock only — nothing here can point at `api.ever.team` / `api.gauzy.co`.

The long form — every case, the mock's limits, the findings and the predictions a run has to settle — is
**[PLAN.md](PLAN.md)**. This file is the index and the honest run status.

## Run status, stated exactly

**Nothing in this lane has been executed.** Every number below is a `--list` count I read off a real command; no test
of mine has ever produced a `N passed (Xm Ys)` line. `--list` compiles the specs and resolves the fixtures, and starts
no server and no browser.

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
never been started. So: **75 discovered, 0 run**, for all eight files below. No file here is green.

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
