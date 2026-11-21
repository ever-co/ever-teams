# lane-b — sign-in / session / locale, and the data path behind them

Lane: `E2E_LANE=lane-b` → app **3032**, mock **3996**, statistics sink **3997**, control API **3998**, fake issuer
**3999**, build dir `.next-lane-3032`. Files: only `suites/lane-b/*.spec.ts`, `suites/lane-b/lane-auth-helpers.ts`
and this file. Nothing under `apps/web/app/**`, `core/**`, no config, no `package.json`, no shared harness file.
`lane-auth-helpers.ts` exists because `helpers.ts`, `fixtures.ts` and `api-fixtures.ts` are shared with lanes a and c
and are not mine to change.

---

## 1. Run status, stated exactly

**No test in this lane has been executed by me. Not one.** Every number below came from a command I ran and read;
none is remembered.

Commands I ran, and what they printed (abridged to the lines that matter):

```
$ E2E_LANE=lane-b npx playwright test --config apps/web/playwright/playwright.lane.config.ts --list
  [lane-b] › lane-b\passcode-journey.spec.ts:43:6 › lane-b · the passwordless sign-in journey › asking for a code …
  …
  Total: 13 tests in 2 files          (first listing, two specs on disk)
  Total: 32 tests in 4 files          (after password-recovery, signup-forms)
  Total: 47 tests in 5 files          (after session-routing)
  Total: 58 tests in 6 files          (after route-refusals)
  Total: 69 tests in 8 files          (after locale-rendering, cookie-jar)
  Total: 75 tests in 8 files          (after the refresh / send-code / login route cases)   ← current state

  per file, counted from that --list output (grep -o 'lane-b\\\\<file>.spec.ts' | sort | uniq -c):
  passcode-journey 7 · password-journey 6 · password-recovery 11 · session-routing 15 · signup-forms 8
  · route-refusals 17 · locale-rendering 6 · cookie-jar 5            (line counts, `wc -l`: 315 / 186 / 320 / 255
  / 287 / 458 / 154 / 179; lane-auth-helpers.ts 366)

$ cd apps/web && node ../../node_modules/typescript/lib/tsc.js -p playwright/tsconfig.json --noEmit
  tsc exit code: 0                    (current state)
  (earlier, all caught by tsc and fixed: `password-journey.spec.ts(189,16): error TS6133: 'describeCookieJar' is
   declared but its value is never read`; `signup-forms.spec.ts(184,5): error TS2339: Property 'describe' does not
   exist on type 'PollMatchers<…>'` — this Playwright has no `expect.poll(…).describe(…)`;
   `route-refusals.spec.ts(66,89|180,64|253,104): error TS2304: Cannot find name 'mock'` — the lane helper
   `mockRequests()` is used instead of a fixture that those tests did not ask for;
   `locale-rendering.spec.ts(4,28): error TS6133: 'describeAppCalls' …`; and two string-syntax errors of my own, a
   `'Passwords don't match'` and a `test('… the mock's echo …')`, both written inside single quotes
   (`error TS1005: ',' expected` ×13 + `TS1002: Unterminated string literal` on `route-refusals.spec.ts`).)
```

`--list` is not a run: it compiles the specs, resolves the fixtures and prints test titles, and it starts **no**
server and **no** browser. There is no `N passed (Xm Ys)` line for this lane because I never produced one.

Two things about the artifacts, both of which the coordinator should know before quoting any lane-b number:

- `apps/web/playwright/artifacts/playwright-lane-b.json` is the lane's fixed JSON report path, so my `--list`
  invocations **overwrote** whatever it held. What I read out of it after my last `--list`:
  `{"startTime":"2026-11-21T14:42:34.863Z","duration":670.111,"expected":0,"skipped":75,"unexpected":0,"flaky":0}`
  — every test `skipped`, none `expected`. That is the fingerprint of a listing, not a browser run. (Reads earlier in
  the session, before they were overwritten in turn: `skipped: 47` and `skipped: 69`, both `expected: 0`.) If a real
  lane-b run happened earlier today, its report is gone from disk and only a re-run can reproduce it.
- `artifacts/test-results-lane-b/` holds one file, `.last-run.json`, dated **Nov 19 11:37**, and its contents are
  `{"status":"failed","failedTests":[]}` — the killed predecessor lane. Nothing in this lane has written a trace,
  screenshot or video since. (A fully green run writes nothing there either, so this proves nothing on its own; it
  only rules out a failure.)
- `find /e/Coding/.tmp /e/Coding/ever-teams -maxdepth 2 -iname '*lane-b*' -newermt 2026-11-20` printed exactly one
  path: my own `--list` capture. No saved run log of this lane exists anywhere I can read.
- `netstat -ano | grep LISTENING | grep -E ':3032|:3996|:3997|:3998|:3999'` printed nothing: this lane's servers have
  never been started by me, while lane-a's `3031 / 3992-3995` are listening — i.e. another lane was mid-run and this
  lane was not.

So the honest count is: **75 discovered, 0 run.**

**Reconciling the numbers that were reported earlier.** My specs have always been 7 / 6 / 11 / 8 in
passcode / password / recovery / signup (32 tests, four files) plus `session-routing` 15 and `route-refusals` 11 at
the time of commit `a205ef4a9` — 47 discovered. Nothing I wrote was ever 12 / 10 / 11 / 9, and there was never a
`suite-probe.spec.ts` in this lane or anywhere in this repo's history:
`find apps/web/playwright -name '*probe*'` prints nothing and `git log --all --oneline -- '*suite-probe*'` is empty.
The only probe this lane ever held was the dead predecessor's `zz-probe.spec.ts` (1 test, ending in a deliberately
false `expect(dump, 'PROBE LANE-B')…`), which I removed with `rm` and did not rename into anything. So a "42" cannot
be rebuilt from my files at any point: 32 without `session-routing`, 47 with it, 75 now. Any figure between those came
from somewhere other than a command I ran, and I am not going to invent a story for it.

---

## 2. Per file: what it proves

### `passcode-journey.spec.ts` — 7 discovered, 0 run
The magic-code flow leg by leg. Each test names the witness of each leg: `watchAppApi` (what the browser asked
*this app*, with the body it sent — the mock never sees this leg) → `mockWasAskedExactly` (what the mock was asked,
on Gauzy's own path, exact match because `/auth/signin.email/confirm` *contains* `/auth/signin.email`) → the jar.
Proves: asking for a code is one `POST /api/auth/signin-email` carrying the typed address, answered 200, and the mock
is asked `/auth/signin.email` once; a malformed address is refused on `#passcode-email` with
`authFormValidate`'s wording and the mock is asked nothing; the code typed is the code in the confirm body (no
`password` key) and the mock was asked `/auth/invite/validate-by-code` too; the e-mail link form
(`?email=&code=`) fills the 8 slots and confirms by itself and keeps `ever-teams-start-email`; the resend is locked
(`aria-disabled="true"`, `startLocked`) and clicking it does not add a second ask; "Use another e-mail" keeps the
address. It also pins, as written, the **silent refusal** of a too-short code (see §4).

### `password-journey.spec.ts` — 6 discovered, 0 run
`/auth/password`'s refusals: empty fields → `validateForm`'s "Please make sure to fill out this field" on both
fields plus `aria-invalid`; malformed address → its own wording; a one-character password → refused as an empty
field, not as a weak one (the sign-in form has no length rule; only reset/signup carry Gauzy's 8). The one
well-formed attempt asserts the body shape (`{email, password, includeTeams}`, password checked by presence and
length only, never printed) and that the mock was asked `/auth/signin.email.password` exactly once, then pins the
app's **silence** on an answer it cannot read: still on the credentials step, no "Incorrect email address or
password", empty jar. Plus the method switch keeping the typed address and focusing `#pw-password`, and the
"Forgot password?" link reaching `/auth/forgot-password`.

### `password-recovery.spec.ts` — 11 discovered, 0 run
Forgot: empty → `form.EMAIL_REQUIRED` wording; malformed → `auth.field.EMAIL_INVALID` wording; valid → exactly one
`POST /api/auth/request-password` whose body keys are exactly `['email']`, mock asked `/auth/request-password`,
the form replaced by the sent state naming the address, and **no** session cookie (a link request is not a session);
"Use another e-mail" returns the form. Reset: the server-side token read of
`app/[locale]/auth/reset-password/page.tsx` is pinned from the browser three ways — no `?token=` →
"This link no longer works" and zero `#reset-password`; an unsigned JWT with `exp` an hour past → the same refusal,
proving the decode-and-check ran on the server; an undecodable token → the form **is** offered ("Gauzy remains the
authority on submit"). Then the six rule rows (Gauzy's five plus the confirmation) with their met / not-met state,
the short password refused on `#reset-password`, the mismatch refused on `#reset-confirm` and not on the password,
and a complete reset reaching the mock on `/auth/reset-password` with the body keys
`['confirmPassword','password','token']` and leaving no session.

### `signup-forms.spec.ts` — 8 discovered, 0 run
Step 1 refusals on `#signup-name` / `#signup-email` with `authFormValidate`'s wording and no request at all; a real
name with a bad address refused on the address only; the form never claiming an address already has an account (the
existing-account hint and its link); `?email=` reaching the field; step 2 opening with the team choice **closed** —
proved by `revealBoxOf` (`revealHeight` 0 and `inert`, the only honest way to test a `grid-rows-[0fr]` + `inert`
reveal, copied from `suites/mock/auth.spec.ts`) — then opened by the choice (`revealHeight > 0` via `expect.poll`,
`inert` gone), a one-character team name refused on `#signup-team` with nothing sent, the finished form reaching
`/api/auth/register` with `{name,email,team,timezone}` and **no** password, the mock asked `/auth/register` once,
and (predicted, §5) this app answering its own register route 500 with an empty jar.

### `session-routing.spec.ts` — 15 discovered, 0 run
The browser half of the gate for the seven protected families no other suite walks in a browser (`/goals`, `/inbox`,
`/favorites`, `/chat`, `/docs`, `/about`, `/workspace` — all in `PROTECTED_APP_URL_PATHS`,
`core/constants/config/constants.tsx`; `suites/api/page-gate.spec.ts` pins only the others, and only as statuses):
each lands on `/unauthorized` with "Sign in to see this page" and an empty jar. The refusal is pinned as a
**redirect the browser was told to follow** (307) through `shield.documents()`, not as a page that rendered and
moved. The two different answers the door gives are pinned apart: no cookies at all → `/unauthorized`; a whole
expired session (`auth-token` with `exp` an hour past, plus a refresh cookie) → the door tried
`/auth/refresh-token`, the mock could not answer it, and `deny_redirect(true)` sent the browser to
`/auth/passcode` with the session family cleared — verified by the jar *before* and *after* the same navigation.
Also: the gate drops the locale (`/ar/settings/personal` → the English `/unauthorized`); a signed-in visit to
`/auth/passcode` or `/fr/auth/passcode` lands on `/` (locale dropped by the door, not by next-intl); the two
recovery pages stay open for a signed-in person (`core/lib/auth/signed-in-auth-paths.ts`); and the sign-out journey
— one visible "Account menu" trigger, one "Log out", lands on `/auth/passcode`, jar emptied, and the `/` that worked
a moment ago is refused.

### `route-refusals.spec.ts` — 17 discovered, 0 run (audit finding 12)
The handlers with no browser: every case distinguishes **refused here** (the mock's log is empty) from
**forwarded** (the mock was asked). `signin-email` malformed → 400 with `errors.email` and an empty log;
`signin-email` valid → forwarded once on `/auth/signin.email`; `signin-email-password` with a one-character
password → 400 before the API sees a credential; `signin-email-confirm` with a 4-character code → 400 naming the 8,
with **no** `/invite/validate-by-code` in the log (which is what proves the refusal came before the handler's own
invite check); `register` → 400 naming all three fields (its comment calls that 400 load-bearing) with nothing
forwarded; `request-password` / `reset-password` refusing an incomplete body, and a complete one reaching
`/auth/reset-password`; `verify/resend-link` refusing `Sec-Fetch-Site: cross-site` **and** `same-site` with 403
before the session guard and before any Gauzy call (finding 6: the `same-site` case is the one a sibling subdomain
actually sends), and an anonymous one refused 401 by the guard, again with an empty log.
`refresh` is covered at both ends: no `refresh_token` on the body → 400 naming `refresh_token` with nothing asked,
and a token the mock answers without a pair → **502 "No token received"**, asked once on `/auth/refresh-token`, never
a 401 (§4.13 — the route is explicit that a 401 would end a session whose refresh token may still be good).
`send-code` and `login` are pinned with the defect they carry: a refused body on a **200** (§4.10), nothing forwarded;
`send-code` with a valid address → 200 and asked once on `/auth/send-code`, which is also why its own "We couldn't
find any account associated to this email" branch is unreachable through this mock; `login` with a well-formed 8
character code → predicted 500 on the mock's echo being taken for an accepted invitation (§4.12, §5 item 15); and a
test that names the routes the passcode page really uses (`/api/auth/signin-email` → `/auth/signin.email`) against the
one it does not (`/api/auth/send-code`), because there is no `/api/auth/passcode` handler at all (§4.11).
The last describe pins **audit finding 1** as it is today: `POST /api/organization-team-join` has no session guard
and no origin guard, so an anonymous cross-site POST is relayed to the platform API with the body unchanged — the
mock's echo answers it 200 with the sentinel `organizationTeamId` (the echo is the only body witness a mock run
has, finding 13), the log holds `POST /organization-team-join`, and `receivedTokens('/organization-team-join')` is
empty, so nothing authenticated it. **These two tests are meant to fail the day someone adds a guard**, and the
messages say so.

### `locale-rendering.spec.ts` — 6 discovered, 0 run
The locale surfaces, read off the document rather than off a screenshot: `lang="ar"` for `/ar/auth/passcode` with
the Arabic submit (`أرسل لي رمزًا`) and the Arabic method tab (`كلمة المرور`) and the same `#passcode-email` id the
other locales carry; French copy for `/fr/`; `/en/auth/passcode` losing its prefix (`localePrefix: 'as-needed'`)
while still reporting `lang="en"`. The direction is asserted **as the app really is**: `dir` null and computed
`direction: ltr` on an Arabic page, because `app/[locale]/layout-component.tsx` writes `lang` and nothing else
(§4.5) — a pin that fails the day someone adds `dir="rtl"`, and the messages say to update it deliberately. A
signed-out Arabic visit leaves no cookie matching `/lang|locale/i` (the locale is the address), while a signed-in
visit to `/ar/settings/personal/preferences` renders `lang="ar"` with the app's own `auth-active-language` cookie
still `'en'` — the two are different things and nothing reconciles them. The last test is the honest version of the
"locale switch": the preferences page *does* ask `GET /api/languages` (proved by the browser-side watcher, polled
because the row fetches after the shell) and the mock answers it `pagination([])`, so the row renders "No language is
available." — no click-through is asserted, because there is nothing in this deployment to select.

### `cookie-jar.spec.ts` — 5 discovered, 0 run
Everything through `context.cookies()`, because `document.cookie` cannot see an `httpOnly` cookie. A signed-in jar
holds all ten `authCookieNames(fixture, 'A')`, all at the root path, all `httpOnly=false secure=false
sameSite='Lax'`, none scoped to `ever.team`, none off this origin (`NEXT_PUBLIC_COOKIE_DOMAINS` is blank on purpose).
`auth-token` is a three-part token whose payload names the fixture user and organization with `exp` in the future —
claims only are ever put in a failure message, never the token. No `auth-token_totalChunks` marker sits next to a
token that fits in one cookie. A magic-code attempt the API cannot finish leaves no `auth-*` name in the jar. And the
door's own leftovers: after an expired session is refused, the *names* are still there with **empty values**
(`auth-token === ''`, the refresh cookie length 0) while `sessionCookies()` — which ignores empty values — reads no
session at all. Stated plainly in the file header: these sessions are the harness's (`signInWithFixture`), because
this mock never issues a token, so what is proved is the shape the app's cookie reading expects, not what
`setAuthCookies` would write after a real sign-in.

---

## 3. What the mock cannot answer (limits, not skips)
`cypress/support/mock-gauzy-server.mjs`'s `routeResponse` has **no handler for any path of the sign-in family** —
grep it for `'/auth/…'` and nothing matches. **Corrected 2026-11-21: that grep was searching the wrong spelling.**
Every key in that file carries this app's `/api` prefix (`if (pathname === '/api/user/me')`,
`if (pathname === '/api/auth/switch-organization')`), because both legs of a run send it: `serverFetch` fetches
`GAUZY_API_SERVER_URL + path` and that constant is `basePath + '/api'` (`core/services/server/fetch.ts`,
`core/constants/config/constants.tsx`), and the browser's axios `baseURL` is `GAUZY_API_BASE_SERVER_URL + '/api'`
(`core/services/client/axios.ts:110`). Measured on this lane (`POST /api/auth/signin-email` on 3032 →
`GET http://127.0.0.1:3998/requests` → `{"method":"POST","path":"/api/auth/signin.email","status":200}`). Grep it for
`'/api/auth/…'` and three handlers **do** match, listed under this section's gaps below. Its fall-through is
`if (method === 'DELETE') return { affected: 1, raw: [] }; if (method !== 'GET') return body ?? { success: true };
return pagination([]);`. So:

- **Every auth POST it does not know is answered 200 with the request body echoed.** The mock cannot sign anyone in
  through a form, cannot 401 a wrong password, cannot refuse a code, and cannot complete a sign-up. **It can refresh**
  (see the gap list: `/api/auth/refresh-token` hands out a pair) **and it cannot refuse an unauthenticated caller**
  (`/api/user/me` answers the fixture user whoever asks, bearer or not).
- Consequently these app branches are **unreachable in a mock run** and no test of mine pretends otherwise:
  `errors.loginFailed` ("Incorrect email address or password"), the `data.status` starting with `4` in
  `use-authentication-password.ts`, a real refused magic code, a real 401 on a wrong password, a real expired reset
  link, a real signed-in shell after a form submit. What the lane pins instead is the half that *is* real: the
  request that a real refusal would follow, and the cookies that a real refusal would not write.
- `/api/languages` answers `pagination([])`, so both language switchers have nothing to offer — which is why the
  locale work here proves rendering and the door's locale handling rather than a successful language change.
- The mock records method / path / query / status only — **no bodies, no headers** — and Bearer tokens only as
  sha256 (`receivedTokens`). So every "what was sent" assertion in this lane is taken from the browser half
  (`watchAppApi` on the app origin, `watchMockApi` on the mock origin — both read `request.postData()`) or from the
  mock's echo. No test prints a credential: passwords and tokens are asserted by presence, length and key names.

**The three sign-in-family handlers this mock really has, and what each one costs this lane.** For the mock's owner:
each of these is a switch request, not a request to delete the handler.

1. `if (pathname === '/api/auth/refresh-token') return { token: 'synthetic-refreshed-token', refresh_token:
   'synthetic-refresh-token' };` — a renewal always succeeds, so `app/api/auth/refresh/route.ts`'s deliberate
   **502** branch (`if (!refreshResult?.data?.token)` → "Token refresh failed: No token received") is unreachable in
   every mock run, lane or Cypress. **Wanted:** a `scenario` switch that answers 200 with a body that carries
   `refresh_token` but no `token`, and one that answers 401. Until then the lane pins the reachable half only
   (`route-refusals.spec.ts`, "POST /api/auth/refresh rotates on this mock…").
2. `if (pathname === '/api/user/me') return data.baseUser;` — the mock never looks at the bearer, so a request with
   **no** session cookie passes `authenticatedGuard` (`core/services/server/guards/authenticated-guard-app.ts` counts
   any 2xx body without `statusCode 401` as authenticated). Every "the guard refuses an anonymous caller" claim in
   this lane is therefore out of reach, and the lane pins instead what the mock does show: the check was made with no
   bearer at all (`receivedTokens('/api/user/me')` empty) and the relay that followed it. **Wanted:** `/api/user/me`
   answering 401 `{statusCode:401}` when the request carries no `Authorization: Bearer`, behind a scenario switch so
   the existing signed-in suites keep working.
3. `if (pathname === '/api/organization-team-join') return pagination([]);` — a handler in front of the echo
   fall-through, so the unguarded-POST pin cannot use an echo body as its witness (it can only prove the ask: `POST`
   recorded, `receivedTokens` empty). **Wanted:** either the echo for this path under a scenario switch, or a recorded
   copy of the body it received, so audit finding 1 can be pinned by body and not only by the log line.

---

## 4. Findings from reading the code (labelled, because none is measured yet)

1. **A too-short code is refused silently.** `handleCodeSubmit`
   (`core/hooks/auth/use-authentication-passcode.ts`) runs `authFormValidate(['email','code'])`, stores the errors
   and returns — but the hook is already in status `'loading'`, and `codeErrorOf` in `code-step.tsx` renders an
   error line only while status is `'error'`. So the person who typed 5 of 8 is told nothing: no
   `#passcode-code-error`, the slots keep what they typed, the button stays enabled. Pinned as the silence in
   `passcode-journey.spec.ts`; a fix that shows the reason will fail that test, on purpose.
2. **The register route dies on the mock's token-less login answer** (predicted, §5 item 1). The chain is
   `registerUserRequest` → the mock echoes → `user.isActive` is not `false`, so the route continues →
   `loginUserRequest` → the mock echoes → `loginRes.token` is `undefined` → … → `setAuthCookies`, which reads
   `access_token.length` (`core/lib/helpers/cookies/index.ts`) on `undefined`. That is the mock's limit showing up
   as a 500 from this app's own route, not a session the app granted.
3. **The door answers two different refusals.** No token and no refresh token → `/unauthorized`; an expired access
   token with a refresh cookie → the refresh is tried and, in a mock run cannot succeed →
   `deny_redirect(true)` → `/auth/passcode`. Both clear `cookiesKeys()` by writing them empty, which is why
   `sessionCookies()` in the lane helper ignores empty values: `Set-Cookie: auth-token=` with no value is a cleared
   cookie, not a session.
4. **The gate drops the locale.** `deny_redirect` names `/unauthorized` with no prefix, and the signed-in visit to
   an auth page redirects to `new URL('/', request.url)` — so an Arabic-browsing visitor refused by the gate reads
   an English page, and a signed-in visitor on `/fr/auth/passcode` lands on `/`.
5. **Arabic gets `lang="ar"` and no `dir`.** `<html lang={locale}>` in `app/[locale]/layout-component.tsx` with no
   `dir` anywhere in `app/`, `core/components/layouts/` or `core/components/auth/` (grep for `dir=` finds none),
   while the only RTL handling in the app is `core/components/pages/chat/message-item.tsx`
   (`RTL_LANGUAGES = new Set(['ar','he'])`, a `dir` on the message body). So `/ar/auth/passcode` renders Arabic copy
   in a left-to-right document. Pinned as it is.
   **Correction to a suspicion I carried earlier and dropped after checking:** `locales/ar.json` is *not* full of
   untranslated auth strings. Comparing every leaf of `ar.auth` with `en.auth` gives exactly **one** identical
   value — `auth.field.EMAIL_PLACEHOLDER` (`you@company.com`, a placeholder, correct as it is). `ar.auth.signIn`,
   `ar.auth.code`, `ar.auth.method` and `ar.auth.field` are translated. Nothing in this lane claims an Arabic
   translation gap.
6. **`#passcode-code` is not in the DOM.** `AuthCodeField`'s `id` produces `#passcode-code-label` and
   `#passcode-code-error` only; the 8 inputs are found through the fieldset's
   `aria-labelledby="passcode-code-label"`. Every code-step selector in this lane follows that, and that is also why
   the code-step wait marker in `askForCode` is the label and not a piece of copy.
7. **Sign-in pages make NextAuth calls by themselves.** `sign-in-page.tsx` uses `useSession()`, so the browser asks
   `/api/auth/session` whether or not anything was submitted. A "nothing left the browser" assertion that matched the
   whole `/api/auth/` prefix would blame a refused form for a page mount, so the lane helper matches
   `APP_SIGN_IN_ROUTES` exactly (`appAuthAsks`), and NextAuth's own routes are named in the comment as deliberately
   excluded.
8. **Captcha is fully off in a mock run**, and this is the reason no signup test reaches a captcha provider:
   `NEXT_PUBLIC_CAPTCHA_SITE_KEY=''` (the harness), and `apps/web/.env` has `NEXT_PUBLIC_CAPTCHA_TYPE=` and
   `CAPTCHA_SECRET_KEY=` both empty (measured as lengths: 0 and 0). So `ReCAPTCHA` renders nothing, `recaptcha` is
   not in the client's validation fields, and the register route skips `recaptchaVerification` — which is also why
   the 400 `{errors:{recaptcha}}` case the audit asks for is **not writable in this lane today**: with a blank
   `CAPTCHA_SECRET_KEY` the route never verifies a token. It needs a scenario switch or a lane started with a
   secret; naming that here instead of writing a test that would silently prove nothing.
9. **`aria-invalid` is written only when there is an error** (`auth-field.tsx`: `aria-invalid={hasError ||
   undefined}`), so every `toHaveAttribute('aria-invalid','true')` in this lane follows a refusal in the same test
   and never asserts a resting state.
10. **Two sign-in routes answer their own validation errors on a 200.** `app/api/auth/send-code/route.ts` and
    `app/api/auth/login/route.ts` both end their refusal with `return NextResponse.json({ errors });` — no status —
    while `signin-email`, `signin-email-password`, `signin-email-confirm`, `register`, `request-password` and
    `reset-password` all answer `{ errors }, { status: 400 }`. The register route's own comment calls its 400
    "load-bearing: `useAuthenticationTeam` only reads `errors` on status 400", which is exactly the client that reads
    a 200-with-errors as success. `login` matters most because it is attempt 2 of the passcode form's code submit.
    Pinned as it is today, in `route-refusals.spec.ts`; the messages say to update the pin when someone adds the
    status.
11. **There is no `/api/auth/passcode` handler at all**, and the two code-sending routes are not the one the page
    uses. `ls apps/web/app/api/auth/` and `find apps/web/app/api -iname '*passcode*'` — no `passcode` directory.
    `use-authentication-passcode.ts`'s `sendAuthCodeHandler` calls `signInEmailQueryCall` =
    `authService.signInEmail`, which in proxy mode posts `/api/auth/signin-email`
    (`core/services/client/api/auth/auth.service.ts:179-186`); the sibling `authService.sendAuthCode`
    (`:144-155`) posts `/api/auth/send-code`, and nothing in `apps/web` calls it (grep `api/auth/send-code` finds the
    route only in `routes.generated.ts`, `empty-body-blockers.generated.ts`, `eslint-suppressions.json` and the audit).
12. **The mock makes every invitation look accepted, and `POST /api/auth/login` then dies on it.** That route asks
    `verifyInviteCodeRequest` → `POST /invite/validate-by-code`, treats a `response.ok` without a
    `response.statusCode` as an accepted invitation, and reads `inviteReq.data.fullName.split(' ')`
    (`app/api/auth/login/route.ts:66-67`). The mock echoes the request body, which has `email` and `code` and no
    `fullName`, so that `.split` is a `TypeError` outside any `try`. Predicted 500 (§5 item 15); the mock's log is
    what proves the branch was entered at all.
13. **`POST /api/auth/refresh` refuses a missing token at 400 and a token-less answer at 502, never 401**
    (`app/api/auth/refresh/route.ts`): `{ errors: { refresh_token: 'The refresh token must be provided on the request
    body' } }` with nothing asked, and `{ message: 'Token refresh failed: No token received', statusCode: 502 }` when
    the API answered without a pair — its comment is explicit that "a 401 here would end a session whose refresh token
    may still be good". Through this mock every refresh ends in that 502, which is the route-level witness of the §3
    limit "no mock run can renew a session".

---

## 5. Predictions a real run must settle (each is a named assertion, so a wrong one fails visibly)

1. `POST /api/auth/register` → **500** (`signup-forms.spec.ts`, message names the chain of §4.2). If the real answer
   is 200/201/400, the test fails and the pin gets rewritten from the log.
2. The `/goals` refusal is seen as a **307 document** in `shield.documents()` (`session-routing.spec.ts`). If
   Playwright records the hop differently, the message prints what it did record.
3. `signup-team`'s reveal: closed = `revealHeight 0` + `inert`; opened = `revealHeight > 0` + not inert
   (`expect.poll`, because `AuthReveal` animates its grid row over 250 ms).
4. Exactly one visible `[aria-label="Account menu"]` and exactly one visible `Log out` button at the Desktop Chrome
   viewport (the top-bar variant is `md:hidden`); the count assertions print the count they found.
5. The reset form lists **6** rule rows (`RESET_PASSWORD_RULES` + "Both passwords match"), scoped to the `ul` that
   contains the confirmation so a list elsewhere cannot move the number.
6. The resend line is reachable as `getByRole('button', { name: /New code in|Send a new code/ })` and is
   `aria-disabled="true"` for its 60 s cooldown. **The 60 s expiry itself is deliberately not waited for** — a test
   that sleeps a minute for a cooldown is a slower suite for no extra proof.
7. `getByText('With my team', { exact: true })` clicks through the wrapping `<label>` to the `sr-only` radio
   (`isChecked()` asserted after it).
8. A one-character password on the sign-in form is refused with `validateForm`'s general message, not a length
   message (the sign-in form has no length rule of its own).
9. Sign-out lands on `/auth/passcode` within 40 s (`logOut()` races a 3 s timer stop and a 3 s push-forgotten call
   before it replaces the page, then NextAuth's `signOut({ redirectTo: DEFAULT_APP_PATH })` runs).
10. `/ar/auth/passcode` has `dir` **null** and computed `direction: ltr`, and a `lang="ar"` for the Arabic copy to
    hang off (`locale-rendering.spec.ts`). If either differs, the Arabic copy assertion is what to trust and the pin
    is what to rewrite, with a note in this file.
11. `/en/auth/passcode` ends on a prefix-less address (`as-needed`), and an `/ar/…` visit for a signed-in person
    renders `lang="ar"` while `auth-active-language` is still `'en'`.
12. The preferences page asks `GET /api/languages` and renders "No language is available." because the mock answers
    that path `pagination([])` (`locale-rendering.spec.ts`).
13. Every session cookie of the fixture jar is `httpOnly=false`, `secure=false`, `sameSite='Lax'`, path `/`, on this
    host; `auth-token` splits into three parts and its claims name `fixture.ids.user` / `fixture.ids.organizationA`
    (`cookie-jar.spec.ts`).
14. The door leaves the cleared cookie *names* behind with empty values, and `sessionCookies()` still reads no
    session (`cookie-jar.spec.ts`). If NextAuth/`logOut` starts deleting the names outright, this fails and that is
    worth knowing.
15. `POST /api/auth/login` with a well-formed 8 character code → **500**, with exactly one
    `POST /invite/validate-by-code` in the mock's log and no `/auth/verify-code` (§4.12). This is the most speculative
    pin in the lane: it is a `TypeError` predicted from reading the route, and the run decides it. If the route
    survives with a 200, the finding is that the mock's echo is *not* taken for an accepted invitation, and the pin
    becomes whatever it answers.
16. `POST /api/auth/send-code` and `POST /api/auth/login` both answer an invalid body with **200** + `{ errors }`
    (§4.10) — pins of today's behaviour, with messages that tell the reader to update them when the status is fixed.
    `POST /api/auth/refresh`: 400 naming `refresh_token` with an empty log; 502 + `statusCode: 502` with one
    `/auth/refresh-token` ask.

---

## 6. Not duplicated (who already owns what)

`suites/api/page-gate.spec.ts` owns the door's statuses for `/settings/…`, `/profile`, `/work-diary`, `/my-week`,
`/views`, `/meet`, `/board`, `/task/<id>`, the locale-prefixed variants, `/maintenance`, the `team` exemption and
"the sign-in page sets no session cookies". `suites/mock/auth.spec.ts` owns the auth pages rendering, `revealBoxOf`,
the `?method=` switch, anon `/` → sign-in, a signed-in visitor not kept on `/auth/passcode`, and the 404 page.
Lane-a `smoke.spec.ts` owns the lane plumbing; lane-c owns the session/permission guards server-side. This lane adds
the browser half of the seven ungated families, every form's validation journeys, the cookie consequences, sign-out,
the door's two different refusals, the token read of the reset page, and the route-level sign-in refusals.

---

## 7. Queued commands, for when this lane gets the machine

```bash
export PATH="/e/nvm/.nodejs:$PATH"; cd /e/Coding/ever-teams
node apps/web/playwright/scripts/lane-servers.mjs up lane-b     # server output goes to a FILE now:
#   …/playwright/artifacts/lane-lane-b-server.log — read that file before believing a wall of timeouts
#   (`a7662a764`: a lane's `next dev` was dying mid-suite because nobody read its stdout pipe, ~64 KB, and netstat
#   still looked healthy). `… up lane-b` prints the path it writes to.
# one family per batch, cheapest first; each batch reuses the lane's own servers
# ONE --grep only: two --grep flags are not an OR, the last one wins, and the mistried filter prints a small
# "Running 2 tests" that looks green. Combine with a pipe: --grep "A|B".
E2E_LANE=lane-b E2E_BROWSER_CHANNEL=chrome npx playwright test \
  --config apps/web/playwright/playwright.lane.config.ts --grep "lane-b · the passwordless sign-in journey"
# … --grep "lane-b · the password sign-in journey"
# … --grep "lane-b · password recovery"
# … --grep "lane-b · the sign-up form"
# … --grep "lane-b · the sign-in routes refuse"        (no browser: fastest, do it first if a run is tight)
# … --grep "a POST with no guard at all"
# … --grep "lane-b · what the jar holds"                 (the cheap cookie pins, mostly no browsing)
# … --grep "lane-b · a signed-out visitor is sent away"   (the seven gate families)
# … --grep "signing out empties the jar"
# … --grep "lane-b · the locale surfaces render"          (6 pages, heaviest: do it last)
# then, only for what failed:
E2E_LANE=lane-b E2E_BROWSER_CHANNEL=chrome npx playwright test \
  --config apps/web/playwright/playwright.lane.config.ts --last-failed
```

Before trusting any red auth test of mine: `node apps/web/playwright/scripts/lane-servers.mjs check lane-b` (a
lane app pointed at the canonical mock answers every server call 502 "The Gauzy API is unreachable", and that is a
harness fault, not a test result).

If a test of mine dies in `waitForShellReady`, quote the message verbatim before touching a test (`a7a851866` made it
name the page's marks, the body text and the URL, and split "InitState mounted, a critical read never settled" — look
in `await mock.requests()` for the organization-teams / task-list / timer-status / plan reads and a 4xx — from "the
shell was never built"). Most of my browser tests need the shell, so which half it is decides whether the fault is in
the mock's data or in my expectations. The recovery-page tests pass `{ requireShell: false }` for exactly this reason.

When the lane is done:

```bash
netstat -ano | grep LISTENING | grep -E ':3032|:3996|:3997|:3998|:3999'
taskkill //F //T //PID <pid>          # for each listener of 3032 / 3996-3999, never another lane's port
```

---

## 8. What this lane did **not** do, and what is owed elsewhere

- The locale spec is written (`locale-rendering.spec.ts`), but no locale **switch** is asserted anywhere in this
  repo's mock suites, and this lane is not going to fake one: the language list comes from `/api/languages`, which
  the mock answers `pagination([])`, so `LanguageDropDownWithFlags` (deferred, empty list) and Settings › Personal ›
  Preferences ("No language is available.") both have nothing to select. What is proved instead is the ask, the
  empty answer, `lang` per locale URL, the Arabic copy, the **missing `dir`** (§4.5), the door's locale drop and the
  address-vs-cookie disagreement. A real switch needs a mock that answers `/languages` with a list — a harness
  change, not a test change.
- The captcha 400 case (finding 12's "a reCAPTCHA failure is 400 `{errors:{recaptcha}}`") is unwritable with both
  captcha keys blank; it needs a lane started with `CAPTCHA_SECRET_KEY` and a `NEXT_PUBLIC_CAPTCHA_TYPE`, or a
  scenario switch in the harness. See §4.8.
- The predecessor's scratch probe `suites/lane-b/zz-probe.spec.ts` (1 test, ending in a deliberately-false
  `expect(dump, 'PROBE LANE-B').toBe('<<<dump printed in the Received line above>>>')`) was deleted: its honest
  content — what the passcode form puts on the wire and what the mock answers — is now asserted properly in
  `passcode-journey.spec.ts`. It was removed with `rm`, not renamed into anything.
- No git command other than read-only `log` / `show --stat` / `status` was run in this checkout.

---

## 9. Verdict per red, from the run of 2026-11-21 (`E:\Coding\.tmp\lane-b-verify.log`: `30 failed`, `45 passed (1.4h)`)

Verdicts: **A** = the app genuinely does this (keep the case, it is the finding). **M** = the mock cannot answer it
(§3 gap, written for the mock's owner). **C** = contention / timeout artefact (only when a solo `--grep` re-run on a
healthy lane is green while the big run was red, with both numbers quoted). **T** = the test's assumption was wrong
(fixed, with the source the fix was copied from).

### `route-refusals.spec.ts` — 7 reds → 7 diagnosed, all fixed, re-run green

Live probe numbers are from my own run against a lane I started myself:
`E2E_LANE=lane-b npx playwright test … --grep "the sign-in routes refuse|a POST with no guard"` →
**`17 passed (22.3s)`** (`E:\Coding\.tmp\lane-b-diag-refusals-1.log`), against these 7 reds in the 1.4 h run. All 17
cases there ran in 46–420 ms, so none of them was ever a contention story.

| red (line of `route-refusals.spec.ts` in the 17:59 tree) | what it died with | verdict |
| --- | --- | --- |
| `:68` "…is forwarded, once, on Gauzy's own path" | `Expected length: 1 / Received length: 0 / Received array: []`, in the same message the mock log line `POST /api/auth/signin.email → 200` | **T** — the filter omitted the `/api` prefix the mock records; the app *did* forward. Fixed from `core/services/server/fetch.ts` (`fetch(GAUZY_API_SERVER_URL + path)`) and `constants.tsx` (`GAUZY_API_SERVER_URL = basePath + '/api'`). |
| `:179` "reset-password … is forwarded on Gauzy's own path" | same shape: `[]` against `POST /api/auth/reset-password → 200` | **T** — same prefix. The pin now also reads the echo body (`{"token":"lane-b-route-level-token",…}` measured with curl) because `/api/auth/reset-password` has no mock handler. |
| `:221` "verify/resend-link without a session is refused by the guard" | `Expected: 401 / Received: 200` with the mock's echo `{email, appName, appSignature, appLogo, appEmailConfirmationUrl}` | **M + A** — the mock's `/api/user/me` handler hands the fixture user to a bearer-less request (§3.2), so `authenticatedGuard` authenticates an anonymous caller in a mock run; the relay itself is real app behaviour and is now pinned with the bearer-less check. |
| `:250` "refresh answers 502, not 401 … which is every answer this mock gives" | `Expected: 502 / Received: 200` | **T + M** — the premise "no handler, echoes the body" is false: the mock answers that path with a pair (§3.1). Pinned as the renewal that does happen (200 + `synthetic-refreshed-token`, not 401); the 502 branch is recorded as unreachable-by-mock. |
| `:304` "the passcode page's own route is /api/auth/signin-email…" | `Expected length: 1 / Received length: 0` for the send-code ask | **T** — same prefix, both halves. |
| `:363` "login crashes on the mock's echo of an invitation code — predicted, §5" | `Expected length: 1 / Received length: 0` (its 500 assertion had already passed) | **A + T** — the crash is real: `HTTP 500`, empty body, one ask `POST /api/invite/validate-by-code → 200`, and the app's own log printed `TypeError: Cannot read properties of undefined (reading 'split')` at `app/api/auth/login/route.ts:70` (`inviteReq.data.fullName.split(' ')`) — that stack is in my run log too. Only the path filter was wrong. |
| `:393` "organization-team-join relays an anonymous, foreign body" | `Expected: "lane-b-pinned-team" / Received: undefined`, body `{"items":[],"total":0}` | **A + M** — the relay is real (`POST /api/organization-team-join → 200` recorded, `receivedTokens` empty, and the sibling case shows no `Sec-Fetch-Site` guard reads it); the body witness is impossible because the mock answers that path with `pagination([])` (§3.3). |
