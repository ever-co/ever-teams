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

### `passcode-journey.spec.ts` — 5 reds → 5 diagnosed (fixes written, re-run owed)

All five died with a hard assertion **and** a `Test timeout of 180000ms exceeded` line
(`lane-b-verify.log` 522-653). The assertions are legible and match the source exactly, so none of the five is a
contention story (verdict **T**, with one **A** and one **M** inside them); what a solo re-run still owes is the
timeout line itself, which this lane could not collect because lane-b's servers were torn down before it could run.

| red | what it died with | verdict |
| --- | --- | --- |
| `:44` "asking for a code asks this app, which asks the mock…" | `the sign-in page never asked this app to send a code: GET /api/auth/session → 200, GET /api/health → 200, GET /api/auth/session → 200, POST /api/log → 201, …` (`Expected length: 1 / Received length: 0`) | **T** — the leg does not exist in a mock run: `authService.signInEmail`'s direct branch (`auth.service.ts:179-185`) posts the browser straight to the mock. Rewritten as the mock leg with a body witness (`watchMockApi`): `POST /api/auth/signin.email`, `{email, …appEmailBranding(), appMagicSignUrl: 'http://localhost:3032/auth/passcode'}` (`auth.service.ts:34-37`, `SIGN_IN_CALLBACK_PATH` `constants.tsx:288`). Renamed: "asking for a code sends it straight to the API with this app's branding, and opens the code step with the address in it". |
| `:133` "the code typed is the code the app asks the API to confirm…" | `the app was never asked to confirm the code: …` (same NextAuth-only capture) | **T** — same leg. Now pinned as both attempts of `verifySignInEmailConfirmRequest` (`use-authentication-passcode.ts:176-206`): `POST /api/auth/signin.email/confirm` `{email, code, includeTeams:true}` then `POST /api/auth/login` `{email, code}` (`auth.service.ts:136-142`), with the invite-code check asserted **absent** from this leg (it lives in the app's own handler, which `route-refusals.spec.ts` reaches directly). |
| `:191` "a code shorter than the 8 … the page says nothing about it" | `Expected: "AAAAA" / Received: Promise {}` | **T** (test-code bug: `codeSlotValues(view)` was not awaited) **+ A** for the silence itself: `handleCodeSubmit` sets status 'loading' (`use-authentication-passcode.ts:326`) and on an invalid form only `setErrors(errors); return;` (339-343), while `codeErrorOf` (`sign-in/code-step.tsx:29-35`) shows a message only when status is 'error'. The `toHaveCount(0)` assertion at line 215 *ran and held* in the 1.4 h run before this case died on the slots. Its "never leaves the browser" half is now proved on the mock leg plus `mockAskedNoNewAuthPath`, which the old `/auth/…` fragments could not prove at all. |
| `:225` "the link in the e-mail (?email=&code=)…" | `the sign-in link never asked this app to confirm its code: … POST /api/auth/session → 200 …` | **T** — same leg; now the mock leg, ≥1 confirmation, each carrying the code and address from the link, plus `/api/auth/signin.email/confirm` in the mock's log. |
| `:268` "a code that is already on its way cannot be asked for again…" | `asking for a code asked the mock 0 times` (`Expected: 1 / Received: 0`) from `mockCallsExactly('/auth/signin.email')` | **T** — the recorded path is `/api/auth/signin.email`. The cooldown UI half (resend `aria-disabled=true`, one ask) is untouched and unmeasured since. |

### The other 18 reds — classified from the recorded assertion text and the source (no re-run yet: lane-b's servers were taken back)

#### `password-journey.spec.ts` — 4 reds, all **T**

| red | died with | verdict |
| --- | --- | --- |
| `:36` | `an empty form still reached this app's routes: GET /api/auth/session → 200, …` / `Expected [] / Received 4 × {GET /api/auth/session, 200}` | **T** — the witness is `appCallsMatching(calls(), '/api/auth/')`, which matches **NextAuth's own** `/api/auth/session` reads: exactly the chatter the `APP_SIGN_IN_ROUTES` note in `lane-auth-helpers.ts` says must be excluded. The UI half (both field refusals) ran before it and held. |
| `:62`, `:81` | the same two lines (75-77, 96-98) | **T** — same filter. |
| `:102` | `the password form never asked this app to sign in: …` (`Expected 1 / Received 0`) | **T** — `signInEmailPassword` direct branch posts `<mock>/api/auth/signin.email.password` with `{email, password, includeTeams:true}` (`auth.service.ts:188-193`); the log filter also needs the `/api` prefix. **Fix queued** (needs `watchMockApi` in this file): assert the mock-leg body keys `['email','includeTeams','password']` and the mock log. |

#### `password-recovery.spec.ts` — 4 reds: 3 **T** (1 unresolved)

| red | died with | verdict |
| --- | --- | --- |
| `:82` | `the forgot-password form never reached this app: …` | **T** — `requestPassword` has a **direct branch** (`auth.service.ts:288-297`): a mock run posts `<mock>/api/auth/request-password` with `{email, appResetPasswordUrl}`, so neither the app's own handler nor the body-keys-`['email']` claim belongs to this leg; both belong to a proxy deployment. **Fix queued**: mock leg, body keys `['appResetPasswordUrl','email']`, and `appResetPasswordUrl` naming `/auth/reset-password`. |
| `:201` | `the reset form lists 0 rules: Gauzy's five plus "Both passwords match" make six` (`Expected 6 / Received 0`) | **open** — the locator is `ul` filtered by `hasText 'Both passwords match'` then `li`; the renderer is `core/components/auth/kit/password-checks.tsx`. Suspected **T** (the list is not six `li` in one `ul`, or the copy differs from the six strings), but calling it without a DOM dump would be a guess. Probe owed: `--grep "the reset form lists"` with the rules' markup and the six translated labels in the failure message. |
| `:255` | `locator.textContent: Test timeout of 180000ms exceeded. Call log: - waiting for locator('#reset-password-error')` | **T, fixed** — `expect(value, message)` builds its message **eagerly**, and this message called `.textContent()` on the very element the assertion says is absent, with `use.actionTimeout` unset (0 means wait until the test timeout). This is one of the two 3-minute outliers README flagged. The count is now read first and the text only when the element exists. |
| `:279` | `the reset form never reached this app: …` | **T** — `resetPassword` direct branch (`auth.service.ts:303-310`) posts `<mock>/api/auth/reset-password`. **Fix queued**: mock leg with body keys `['confirmPassword','password','token']` plus `/api/auth/reset-password` in the log. |

#### `signup-forms.spec.ts` — 4 reds: 2 **T** fixed, 2 open

| red | died with | verdict |
| --- | --- | --- |
| `:75` | `locator.textContent: Test timeout of 180000ms exceeded. waiting for locator('#signup-name-error')` | **T, fixed** — the same eager-message bug as `password-recovery:255`; the other 3-minute outlier. |
| `:126` | `strict mode violation: getByText('How do you want to start?') resolved to 2 elements: 1) <h1 class="text-xl font-semibold …"> 2) <legend class="sr-only">` | **T, fixed** — the copy is on the page twice: the heading and the radiogroup's screen-reader legend. Now `getByRole('heading', …)` plus a `legend.sr-only` count of 1, so the duplicate is pinned instead of tripping the selector. |
| `:211`, `:253` | `the finished sign-up never reached this app's register route: …` / `the register route was never asked: …` | **open** — here the witness's leg **is** right: `registerUserTeam` uses `getFallbackAPI()` (`auth.service.ts:275-278`), whose axios instance is `axios.create({baseURL: this.config.baseURL})` (`api.service.ts:208-215`) with `API_BASE_URL = '/api'` (`constants.tsx:96`), so a finished form would `POST /api/auth/register` on the app origin. An empty capture therefore means the form never submitted — the likely cause is the step `:126` shows is fragile (mode choice, team reveal) or a client-side refusal. Probe owed: `--grep "a finished sign-up form"` with `revealBoxOf(page,'signup-team')` and the step-1 state in the message. |

#### `session-routing.spec.ts` — 3 reds: 1 **M**, 1 **A+T**, 1 **A**

| red | died with | verdict |
| --- | --- | --- |
| `:88` | `an expired session was not sent to the sign-in page (the door answered it some other way)` / `Expected /\/auth\/passcode$/ / Received "http://localhost:3032/settings/personal"` | **M** — `proxy.ts:561-575`: a token expired *locally* is not refused, it goes to `tryRefreshAndVerifyWithRetry()`, which posts `/auth/refresh-token` against `GAUZY_API_SERVER_URL` — the mock — and the mock answers with a pair (§3.1), so `refreshResult.success` and the visit proceeds. `deny_redirect(true)`, which is the cleared jar plus `/auth/passcode` this case pins, needs an API that **refuses** a refresh. Reachable half to pin instead: the door asked `/api/auth/refresh-token` for an expired token and let the page through on that answer. |
| `:154` | `/fr/auth/passcode kept its locale prefix for a signed-in visitor (the URL is http://localhost:3032/fr)` / `Expected /\/$/` | **A + T** — the door really does send a signed-in visitor off the auth page (`NextResponse.redirect(new URL(DEFAULT_MAIN_PATH, request.url))`, `proxy.ts:461-467`, `DEFAULT_MAIN_PATH = '/'` at `constants.tsx:102`), and the visit lands on `/fr`: the locale comes back through the jar, because the visit wrote next-intl's `NEXT_LOCALE` cookie (`locale-rendering:102` proves it is written). Pin: off the auth page **onto `/fr`** — the auth-page prefix is dropped and the app root takes the jar's locale. |
| `:189` | `signing out left session cookies in the jar: …` plus `Received ["auth-active-project=aaaaaaaa-aaaa-4aaa-8aaa-…"]` | **A** — the app's own clear list omits that one: `cookiesKeys()` (`core/lib/helpers/cookies/index.ts:271-282`) names refresh-token, token, active-team, tenant-id, organization-id, active-task, active-language, no-team-popup-show, user-active-task and user-id — **no `auth-active-project`**. Sign-out empties those ten and leaves a real value in `auth-active-project`. Pin to rewrite: the ten names emptied, this one still carrying its value, and the next visit still refused. |

#### `cookie-jar.spec.ts` — 1 red, **M**

`:138` "a session the door cleared is still named in the jar, and holds nothing" died with `the expired session was not refused` / `Received "http://localhost:3032/settings/personal"` — the same refresh chain as `session-routing:88`. The "cleared but still named" jar is what `deny_redirect` writes when a refresh is **refused**, and this mock never refuses one. Reachable half: an expired `auth-token` still reads as claims whose `exp` has passed, and the door's renewal ask lands on `/api/auth/refresh-token`.

#### `locale-rendering.spec.ts` — 2 reds: 1 **A**, 1 **T** (both fixed)

| red | died with | verdict |
| --- | --- | --- |
| `:102` | `an Arabic visit left a locale marker in the jar: NEXT_LOCALE` | **A, pinned as it is** — `next-intl` has its locale cookie on by default (`node_modules/next-intl/dist/esm/production/routing/config.js`: `localeCookie: … {name:"NEXT_LOCALE", sameSite:"lax", …}`). The app writes nothing of its own for the locale: the jar held exactly `NEXT_LOCALE` and no `auth-active-language`. Pinned both ways now. |
| `:134` | `Expected: > 0 / Received: 0` on `appCallsMatching(calls(), '/api/languages')` after 20 000 ms | **T, fixed** — the language read is an API-client call, so it goes to `<mock>/api/languages` (`axios.ts:110`), and the mock answers that path with `pagination([])`. The watcher was on the app origin; it is `watchMockApi` now, and the empty answer still produces "No language is available." |

### Tally, stated exactly

- Per file, of the 30: `route-refusals` 7 diagnosed (4 T, 3 carrying A, 2 carrying M) and re-run **17 passed**; `passcode-journey` 5 T (one of them carrying the A for the too-short-code silence); `password-journey` 4 T; `password-recovery` 3 T (1 fixed, 2 queued) + 1 open; `signup-forms` 2 T fixed + 2 open; `session-routing` 1 M + 1 A+T + 1 A; `cookie-jar` 1 M; `locale-rendering` 1 A + 1 T fixed. **27 carry a verdict, 3 stay open** (`password-recovery:201`, `signup-forms:211`, `signup-forms:253`), each with the probe it needs named above.
- Cases whose code changed today: 16 — `route-refusals` 7, `passcode-journey` 5, `signup-forms` 2, `password-recovery` 1 (`:255`), `locale-rendering` 1 (`:134`). Six more are queued in the tables above (`password-journey` 4, `password-recovery` `:82` and `:279`) because each needs the mock-leg witness wired into a file this lane could not re-run; queueing them is a note, not a skip — the cases stay red until a lane proves them.
- Runs this lane produced itself: **`17 passed (22.3s)`** for the two `route-refusals` describes (`E:\Coding\.tmp\lane-b-diag-refusals-1.log`) and `tsc -p playwright/tsconfig.json --noEmit` printing nothing. No browser re-run of the other seven files was possible: lane-b's servers were taken back before one could start, and this lane did not bring up a third app on a 33 GB PC.

---

## 10. Queue for the next session that gets lane-b (written 2026-11-21, no lane was mine)

Machine gate, measured, because it is the reason nothing further ran: `Free KB: 2795928 / Total KB: 33473768` (2.66 GB free) with `strata` at 11 615 MB and **two other lanes listening** (3033 idle, 3034 busy with browsers). My own bar is >= 4.5 GB free to start a lane, and never a lane when two others are up under 6 GB, so `lane-servers.mjs up lane-b` was not pressed. The `.next-lane-3032` distDir is warm from earlier, which cuts the cold compile, but not to nothing.

Commands, in the order that costs least first:

```bash
export PATH=\"/e/nvm/.nodejs:$PATH\"; export NODE_OPTIONS=\"--no-warnings\"; export E2E_BROWSER_CHANNEL=chrome
node apps/web/playwright/scripts/lane-servers.mjs up lane-b     # keep this task alive for the whole session
node apps/web/playwright/scripts/lane-servers.mjs check lane-b  # MISWIRED / no runtime env means down then up

# 1. no browser at all, ~25 s: proves the 7 fixed route-refusals pins are still green
E2E_LANE=lane-b npx playwright test --config apps/web/playwright/playwright.lane.config.ts \
  --grep \"the sign-in routes refuse|a POST with no guard\"          # -> E:/Coding/.tmp/lane-b-diag-refusals-2.log

# 2. the whole lane for the honest total, with every duration visible in the list output
E2E_LANE=lane-b npx playwright test --config apps/web/playwright/playwright.lane.config.ts \
  > E:/Coding/.tmp/lane-b-full-1.log 2>&1

# 3. the two 3-minute outliers alone, which is how their fix is proved (both must land in seconds):
#    --grep \"two different passwords are refused on the confirmation\"     (password-recovery:255)
#    --grep \"a real name with an address that is not an address\"          (signup-forms:75)
```

Then the six **queued** fixes (each already written out in §9 with the exact body keys and path), and only 
after them the three **open** cases, each with its probe: `password-recovery:201` dump the rules markup; 
`signup-forms:211`/`:253` dump `revealBoxOf(page, \"signup-team\")` and the step-1 state into the failure 
message before touching the assertion. A live probe of the real `api.ever.team` team-join relay is **not** 
queued: it is unevidenced on this PC (the report that described one was withdrawn by its own author), and 
it would need the owner's go-ahead and a pushed MAINTENANCE.md row before anyone runs it.

---

## 11. The lane was run 2026-11-22 — every number below is copied from a log's own summary line

Files this section is about: `route-refusals.spec.ts`, `session-routing.spec.ts`, `signup-forms.spec.ts` and
`PLAN.md` (mine, committed by me), plus measurements of the other five files, whose edits are another session's.

### 11.1 Contention, stated before any number is quoted

* A second session ran lane-b specs and edited lane-b specs while I did. Its logs carry `start=` / `exit=` / `end=`
  markers I did not write: `E:\Coding\.tmp\lane-b-locale-rendering-1.log`, `lane-b-cookie-jar-1.log`,
  `lane-b-passcode-journey-1.log`, `lane-b-password-recovery-2.log`, `-3`, `-4`, `lane-b-tsc-1.log`,
  `lane-b-servers-up-2.log`. `git status` listed `cookie-jar`, `lane-auth-helpers`, `passcode-journey`,
  `password-journey`, `password-recovery` and later `session-routing` as modified while I was editing `signup-forms`
  myself. I committed only my own four files and left the rest of the lane's uncommitted edits to their author, so
  the tree that produced my numbers is `93d1c50ad` **plus** that session's uncommitted lane-b edits.
* That session restarted lane-b's servers mid-run (`lane-b-servers-up-2.log`, 01:55:34: "starting node …
  backend.mjs (port 3998) … next dev -p 3032"); my first `password-journey` run therefore died with
  `TypeError: fetch failed` / `connect ECONNREFUSED 127.0.0.1:3998`. Verdict **C** (contention), proved by the solo
  re-run, with both numbers quoted below — no assertion was changed for it.
* The mock's request log is one process-wide ring, so "the mock was asked exactly once" is a coin toss while two
  lane-b runs are in flight. §11.5.
* HEAD moved under the lane twice while I worked (`c6b77afea` → `e762c7309` → `93d1c50ad`). None of them touched
  `suites/lane-b/`, so the `team-tasks-view` label-grouping merge in `c6b77afea` moved **no** lane-b expectation.
  Everything that moved in this lane today moved through the uncommitted edits, not through the merge.

### 11.2 Per file, from the logs

| file | number, copied from the log's summary line | log |
| --- | --- | --- |
| `route-refusals.spec.ts` | **17 passed (5.2s)** | `E:\Coding\.tmp\lane-b-refusals-1.log` |
| `route-refusals.spec.ts`, after the fixture hoist (§11.6) | **17 passed (6.2s)** | `E:\Coding\.tmp\lane-b-refusals-2.log` |
| `password-journey.spec.ts` | 1 failed, 5 passed (3.5m) — the red is **C**, §11.1 | `E:\Coding\.tmp\lane-b-password-journey-1.log` |
| `password-journey.spec.ts`, solo re-run | **6 passed (20.3s)** | `E:\Coding\.tmp\lane-b-password-journey-2.log` |
| `password-recovery.spec.ts` | **11 passed (27.2s)**, all 11 including §9's open `:201` | `E:\Coding\.tmp\lane-b-password-recovery-1.log` |
| `session-routing.spec.ts` | 3 failed, 12 passed (10.7m) — the state before §11.3's three pins | `E:\Coding\.tmp\lane-b-session-routing-1.log` |
| `session-routing.spec.ts`, solo re-run | **15 passed (40.5s)** | `E:\Coding\.tmp\lane-b-session-routing-2.log` |
| `signup-forms.spec.ts` | 2 failed, 6 passed (6.6m) | `E:\Coding\.tmp\lane-b-signup-forms-me1.log` |
| `signup-forms.spec.ts`, after the mock-path prefix fix | 2 failed, 6 passed (6.5m) | `E:\Coding\.tmp\lane-b-signup-forms-me2.log` |
| `signup-forms.spec.ts`, after the §11.3 rework | **8 passed (33.2s)** | `E:\Coding\.tmp\lane-b-signup-forms-me3.log` |
| `signup-forms.spec.ts`, a run mid-rework | 1 failed, 7 passed (4.0m) — the red is `ReferenceError: mockWasAskedExactly is not defined`, i.e. the file was mid-edit between two sessions (§11.1), not a verdict | `E:\Coding\.tmp\lane-b-signup-forms-me4.log` |
| `signup-forms.spec.ts`, after leg 2 was moved to the chain's last ask (§11.5's ring cap) | **8 passed (34.7s)** | `E:\Coding\.tmp\lane-b-signup-forms-me5.log` |
| `locale-rendering.spec.ts` | **6 passed (38.5s)** | `E:\Coding\.tmp\lane-b-locale-rendering-me1.log` |
| `cookie-jar.spec.ts` | **6 passed (40.3s)** (the file now holds 6 cases: the two refresh answers pinned apart) | `E:\Coding\.tmp\lane-b-cookie-jar-me1.log` |
| `passcode-journey.spec.ts` | 2 failed, 5 passed (7.6m) — **still red, §11.4** | `E:\Coding\.tmp\lane-b-passcode-journey-me1.log` |

The whole lane in one command, my own run of it: **2 failed, 74 passed (9.5m)**,
`E:\Coding\.tmp\lane-b-full-me2.log` (76 tests, 1 worker, 04:44:33 → 04:54:07). Its two reds were
`passcode-journey.spec.ts:157` (the §11.4 race) and `signup-forms.spec.ts:270` — that case was green solo in
`-me3` 28 minutes earlier and green again solo in `-me5` after it, so it reads as the shared-mock-log contention of
§11.1/§11.5 rather than a third verdict. `lane-b-full-me1.log` is a run I started, started again by mistake and
stopped by hand; it never printed a total, so it is not a number and is not quoted.

Counting the last number of each row: the lane as I measured it is **76 cases in 8 spec files, 74 green, 2 red** (the
two `passcode-journey` cases). With the `signup-forms` solo re-runs folded in, every file in this lane except
`passcode-journey` ended green on its own. The lane has **8** spec files, not the 7 §1 lists: `route-refusals`,
`passcode-journey`, `password-journey`, `password-recovery`, `signup-forms`, `session-routing`, `locale-rendering`,
`cookie-jar`. The lane's owner who worked beside me reports the whole lane **76 passed (3.5m)**
(`E:\Coding\.tmp\lane-b-full-1.log`) and **76 passed (4.0m)** (`lane-b-full-2.log`), which is §12's claim, not mine;
`lane-b-full-2.log` ran the tree that already carried my `signup-forms` chain witness at `:342`.

### 11.3 The three §9 open cases, settled

1. **`password-recovery` "the reset form lists the five rules Gauzy enforces, plus the confirmation" — open → green.**
   11/11 in `lane-b-password-recovery-1.log`, that case in 2.3s. Verdict **T**: the 2026-11-21 `Expected 6 / Received
   0` was read with `locator.count()`, which does not wait, against a page that had not rendered the list yet, and the
   case then sat on the six label assertions until the 180s test timeout. It now awaits `#reset-password`, polls
   `toHaveCount(6)`, and its message prints every `ul` text the page holds. Six `li` under the `ul` carrying "Both
   passwords match" is the measured shape (`core/components/auth/kit/password-checks.tsx`).
2. **`signup-forms` "a finished sign-up form is handed to this app…" (`:211` then) — open → green.** The leg the case
   assumed is right (`registerUserTeam` → `getFallbackAPI()`, `auth.service.ts:275-278`, axios `baseURL` `/api`,
   `constants.tsx:96`), and **the mock records that ask as `/api/auth/register`**, so the case's
   `mockCallsExactly('/auth/register')` matched nothing while the mock's own log line in the same failure named it —
   the same missing prefix as §9's four `route-refusals` reds. The second half: `click()` returns when the click has
   landed, not when the client has posted, so both request witnesses are `expect.poll`ed now. `lane-b-signup-forms-me1.log`
   is the proof of the race: the same eight steps gave `[]` in one case and exactly one ask in the case right after it.
3. **`signup-forms` "a sign-up the mock cannot finish leaves the browser with no session at all" (`:253` then) — the §5
   prediction was wrong; the case now pins what was measured.** `POST /api/auth/register` answers **200, not 500**, and
   it **writes a session**. Measured twice: `lane-b-signup-forms-me2.log` (`Expected: 500 / Received: 200`) and a
   direct probe of this lane's own app, `curl -X POST http://127.0.0.1:3032/api/auth/register`, headers saved at
   `E:\Coding\.tmp\lane-b-register-probe-headers.txt`: `200` with `auth-token=synthetic-refreshed-token`,
   `auth-tenant-id`, `auth-organization-id`, `auth-active-team`, `auth-active-language=en`, and `auth-user-id=` /
   `auth-refresh-token=` written **empty**. Why: the route takes the token from the **refresh** step
   (`app/api/auth/register/route.ts:156-157`) and this mock answers `/api/auth/refresh-token` with a pair
   (`cypress/support/mock-gauzy-server.mjs:537-538`, §3.1), so the token-less login never reaches `setAuthCookies`;
   the route then hands back the bare `NextResponse` it created at route.ts:29 and returns at route.ts:175. The case is
   renamed "a sign-up the mock answers leaves a half session: 200, the mock's own access token, and no user id" and
   asserts those cookie lines off the response's own `Set-Cookie` headers (`waitForResponse` started before the click,
   so nothing races it). **Owed to the mock's owner, not fixable by a lane:** a mock run cannot show "a sign-up the
   backend refused left no session", because the mock's refresh handler rescues the chain.

### 11.4 Two `passcode-journey` cases are still red (that file is the other session's)

`lane-b-passcode-journey-me1.log`: 2 failed, 5 passed (7.6m).

* `:157` "the code typed is the code the app asks the API to confirm…" — `Expected 1 / Received 0` on the second
  attempt (`POST /api/auth/login`) inside a message whose own mock-log line read `POST /api/auth/login → 200` and
  whose browser side read `POST /api/auth/login → (no answer yet)`. That is the §11.3(2) race again: `watchAppApi`
  fills a status only when the response event arrives. Not fixed here — the file was being edited next door.
* `:320` "a code that is already on its way cannot be asked for again…" — `Expected 1 / Received 2`
  (`POST /api/auth/signin.email` twice: "1 code request left the page before the click and 2 after it"). Two readings
  one run cannot separate: either a click on a resend the page marks `aria-disabled` really asked again — worth
  keeping as an app finding, since `aria-disabled` is not `disabled` and the button's own guard is
  `resend()` → `if (isLocked) return` (`core/components/auth/kit/resend-code.tsx:75-78`) — or the second ask is
  another run landing on the shared mock log (§11.5). Owed: a solo re-run that counts the asks on the page, not on
  the mock.

### 11.5 Two harness facts to know before trusting any number above (neither file is lane-b's to change)

* `apps/web/playwright/backend.mjs:40` is `const MAX_REQUESTS = 10;` and `GET /requests` returns
  `requests.slice(-10)`. `mockAuthAskCount()` / `mockAskedNoNewAuthPath(asksBefore)` compare counts **inside the last
  ten asks**, and `mockCallsExactly(…).toHaveLength(1)` counts inside them too — so a case that causes more than ten
  backend asks (the sign-up chain is eight on its own: register, login, tenant, organization, employee,
  organization-projects, organization-team, refresh-token) can make those witnesses quietly wrong. It is also why two
  concurrent lane-b runs can move each other's counts.
* Every red in this lane prints its failed assertion **and then** `Test timeout of 180000ms exceeded`: a red costs
  three minutes. That is why the same file reads 27s green and 7.6m with two reds, and why §10's 1.4h full run was
  never a slow machine. The two §9 "3-minute outliers" are gone for the reason §9 gives (messages that reached for a
  page state eagerly): today those cases ran **2.3s** (`password-recovery` "two different passwords are refused on the
  confirmation", `lane-b-password-recovery-1.log` case 10) and **2.1s** (`signup-forms` "a real name with an address
  that is not an address", `lane-b-signup-forms-me3.log` case 2).

### 11.6 GitGuardian on PR #5675, finding 40824812 (`route-refusals.spec.ts`, 4 hits)

The flagged literal was `'Str0ng!Pass'` (twice per case, in two cases) beside `'lane-b-route-level-token'`. In
substance a false positive: a synthetic fixture posted to this lane's own handlers on `127.0.0.1:3032` and forwarded
only to this lane's mock on `127.0.0.1:3996`, never to any service. It is still the credential-shaped literal a
scanner is right to notice, and it was duplicated, so it is now two named module constants at the top of
`route-refusals.spec.ts` — `FIXTURE_PASSWORD = 'lane-b-fixture-password-not-a-credential'` and
`FIXTURE_RESET_TOKEN = 'lane-b-fixture-reset-token-not-a-credential'` — each commented with where it is sent and why
the body must carry all three (`app/api/auth/reset-password/route.ts:12` checks presence only). Every copy in that
file replaced; the file's one value witness (`echoed.token`, the mock's echo of what was posted) compares against
`FIXTURE_RESET_TOKEN` itself, so the pin means the same thing. Re-run after the change: **17 passed (6.2s)**,
`E:\Coding\.tmp\lane-b-refusals-2.log`. The `'Str0ng!Pass'` literal survives only in `password-recovery.spec.ts`,
where the typed value has to pass Gauzy's five reset rules (`RULE_MIN_LENGTH`, uppercase, lowercase, digit, symbol),
so the lane's next single owner should hoist it to `lane-auth-helpers.ts` with a rule-satisfying value; I did not,
because that file was being written next door. **That hoist happened** (§12.5 item 6: `RESET_PASSWORD_VALUE` /
`RESET_PASSWORD_OTHER` in `lane-auth-helpers.ts:43-44`), so as this section was last written
`grep -rn "Str0ng!Pass" apps/web/playwright/suites/lane-b/` hits **only this PLAN's prose** — no spec in the lane
carries a credential-shaped literal any more. Finding 40824812 needs no second reply.

### 11.7 Corrections to §11.2 and §11.4, written after §12 existed

* §11.2's whole-lane row is now a real number: **2 failed, 74 passed (9.5m)**, `lane-b-full-me2.log`. Of its two reds,
  `signup-forms:270` was green solo before it (`-me3`) and after it (`-me5`, **8 passed (34.7s)**), and
  `passcode-journey:157` was closed green by §12.4, so nothing in that combined run is a third verdict.
* §11.4's floated app finding ("`aria-disabled` resend asked twice") is **not a finding as measured** — §12.4 pressed
  the locked resend with `dispatchEvent('click')` after a 4 s untouched wait and counted the page's own asks:
  `after.length === 1`. I did not re-run that case myself, so I report §12's measurement as theirs and keep my
  `-me1` number as the observation that started it.
* Everything in §11 is in the branch: `afb413364a` ("test(playwright): lane-b runs green end to end, 76 passed")
  carries my `route-refusals` fixture hoist, my `signup-forms` polled witnesses + 200/half-session repin, my
  `session-routing` three re-pins and §11 of this file, next to the other session's five spec files. No lane-b push
  was made by this session; the coordinating session pushed.
* Lane-b's servers (3032 / 3996-3999) were taken **down** by this session at the end of the run, with
  `node apps/web/playwright/scripts/lane-servers.mjs down lane-b` — a state change that also ended the other
  session's lane, which is why §11.1's contention warning is written before any number, not after.

---

## 12. The other lane-b agent of 2026-11-22: the whole lane green — **76 passed (3.5m)**

§11 is the other agent's run log (their logs are `E:\Coding\.tmp\lane-b-*-me1..4.log`); this section is mine, from
`E:\Coding\.tmp\lane-b-<file>-<n>.log` plus `lane-b-full-1.log`. Both of us edited the same eight files, so every row
says whose version of the file it ran. Each number is a summary line copied out of the named log; where a file did not
run, this says so.

### 12.1 Lane, gate, typecheck

* `lane-servers.mjs up lane-b` (`lane-b-servers-up-1.log`), brought up again in `lane-b-servers-up-2.log`: the app on
  3032 stopped answering mid-session while free memory had fallen to **3 201 192 KB** with `strata` at ~11.6 GB.
  `down lane-b` (PIDs 28792 / 26892), re-measure **4 097 912 KB**, `up`, `check` → OK. Reported as a blocker, not
  retried blind. Gate readings for the runs below: **5 276 920 KB**, **4 682 092 KB**, **5 015 000 KB** free of
  33 473 768 KB; `check lane-b` printed `OK — the app on 3032 names its own mock 3996 and stats sink 3997` before
  each one.
* `tsc -p playwright/tsconfig.json --noEmit` → **exit 0** (`lane-b-tsc-6.log`, `lane-b-tsc-7.log`). Earlier in the same
  session it exited 2 twice (`lane-b-tsc-4.log`, `lane-b-tsc-5.log`) on `suites/lane-c/unguarded-writes.spec.ts`
  (`TS2304` / `TS2552: Cannot find name 'triple'`) — the lane-c agent's file, untouched here.

### 12.2 Per file, one solo run each, and how it got there

| file | green run | the reds before it, from the same lane | log |
| --- | --- | --- | --- |
| `route-refusals.spec.ts` | **17 passed (5.2s)** | none since §9's fixes | `lane-b-refusals-1.log` |
| `password-journey.spec.ts` | **6 passed (17.3s)** | `4 failed / 2 passed (12.8m)` in `…-1.log`; all four were the `/api/auth/` filter matching NextAuth's own `GET /api/auth/session` / `POST /api/log` | `lane-b-password-journey-2.log` |
| `password-recovery.spec.ts` | **11 passed (31.8s)** | `3 failed / 8 passed (9.7m)` `-1`; `6 failed / 5 passed (34.1s)` `-2` (a helper used without importing it); `1 failed / 10 passed (31.6s)` `-3` (the `Expected: 200 / Received: 0` status race) | `lane-b-password-recovery-5.log` (also `-4.log`: `11 passed (28.0s)`) |
| `locale-rendering.spec.ts` | **6 passed (30.9s)** | §9's `:134`, fixed by moving the watcher to the mock leg | `lane-b-locale-rendering-2.log` |
| `cookie-jar.spec.ts` | **6 passed (32.0s)** | `1 failed / 4 passed (37.5s)` `-1`, `1 failed / 5 passed (25.8s)` `-2` — both the unreachable expired-session refusal | `lane-b-cookie-jar-3.log` |
| `session-routing.spec.ts` | **15 passed (1.0m)** | `3 failed / 12 passed (1.6m)` in my `-1` run; that log file was then **overwritten** by the other agent's 02:53 run, which now reads `3 failed / 12 passed (10.7m)` | `lane-b-session-routing-3.log` |
| `signup-forms.spec.ts` | **8 passed (33.9s)** | `2 failed / 6 passed (24.5s)` `-1`: both register witnesses were read once and saw only NextAuth chatter | `lane-b-signup-forms-3.log` — ⚠ at run time the file carried the other agent's 04:15:47 edits (500 → 200, `waitForResponse`, the `Set-Cookie` reading); my run verified their pins |
| `passcode-journey.spec.ts` | 7 cases green inside `lane-b-full-1.log`; the two I re-wrote also **2 passed (8.9s)** solo | `2 failed / 5 passed (6.6m)` `-3`; `1 failed / 6 passed (3.5m)` `-4`; `-probe-1.log` ran **no tests** (`SyntaxError … (355:35)`, exit 1); `-probe-2.log` `1 failed / 1 passed (1.2m)` | `lane-b-passcode-probe-3.log`, `lane-b-full-1.log` |

### 12.3 The whole lane, one command

```
E2E_LANE=lane-b npx playwright test --config apps/web/playwright/playwright.lane.config.ts
→ 76 passed (3.5m)                                    E:\Coding\.tmp\lane-b-full-1.log
```

Counts out of that log's own `ok` lines: `route-refusals` 17, `session-routing` 15, `password-recovery` 11,
`signup-forms` 8, `passcode-journey` 7, `cookie-jar` 6, `password-journey` 6, `locale-rendering` 6 = **76 cases in 8
files, 0 red**. §1's "75 discovered" is one short of what this tree lists. The 1.4 h of §9's full run is not in this
lane's code any more: with no red there is no 180 s test-timeout bill (§11.5) to pay — the eight solo runs above sum
to 3.1 min against the combined run's 3.5 min.

### 12.4 The three cases §9 left open, all three closed

* **`password-recovery:201`** ("the reset form lists the five rules Gauzy enforces, plus the confirmation") — **2.1s
  green** in `lane-b-password-recovery-4.log` and again in `-5.log`. The pin was right: six `li` in the one `ul` that
  also carries "Both passwords match" (`core/components/auth/kit/password-checks.tsx`, `RESET_PASSWORD_RULES` plus the
  confirmation row; wording from `locales/en.json` `auth.password.RULE_*`). The measuring tool was wrong:
  `locator.count()` does not wait, so it read 0 on a list that had not rendered, and the case then sat to the test
  timeout. Now `toHaveCount(6)` after waiting for `#reset-password`, with every `ul`'s text in the failure message.
* **`signup-forms:211` / `:253`** — the leg was right (`registerUserTeam` → `getFallbackAPI()` →
  `API_BASE_URL = '/api'`); the witness was read too early. Polled, and the register route answered **200, not the §5
  prediction of 500**, writing a half session (`auth-token=synthetic-refreshed-token`, `auth-user-id=`,
  `auth-refresh-token=`): `app/api/auth/register/route.ts:156-157` takes the token from the refresh step, which this
  mock answers with a pair (`cypress/support/mock-gauzy-server.mjs:537`). Verified green by my run in
  `lane-b-signup-forms-3.log` and `lane-b-full-1.log`; the repin itself is the other agent's (§11).
* **`passcode-journey:157/160`** attempt 2 — §11.4 left it as "the file was being edited next door"; closed here. Two
  of my runs disagree only about *when they read*: `-3.log` held `POST /api/auth/login → (no answer yet)` with nothing
  in the mock's log, `-4.log`, waiting up to 10 s for the same entry, recorded `POST /api/auth/login → 200`. The mock
  is not the one that hung — asked directly on this lane it answered in 2 ms and logged it. Pin now: the ask lands
  **once, answered 200, body `{email, code}` with no `password`**, plus an empty cut-off witness. New in
  `lane-auth-helpers.ts`: `watchMockCutOff` / `describeMockCutOff` (`requestfailed`, which `watchMockApi` does not
  listen to) and `mockAskAfterWaiting` (a bounded wait that returns an empty answer instead of throwing), so "was not
  asked" can be asserted with a number instead of a 180 s timeout.
* Closed on the way: **the cooldown case** (§11.4's "either the click asked again or the page re-asked"). It now waits
  4 s with nobody touching the page and asserts the ask count did not move, then presses the locked resend with
  `dispatchEvent('click')`. Measured: the page does **not** re-ask by itself and the `aria-disabled` resend does **not**
  add an ask — `after.length === 1` green, the case at 7.2s / 7.3s instead of the 1.1m an ordinary `click()` ate on the
  ticking `CooldownRing` (`core/components/auth/kit/resend-code.tsx`). The app finding §11.4 floated is **not** a
  finding as measured: the button's `if (isLocked) return` guard holds.

### 12.5 Pins moved from prediction to measurement (mine)

1. `password-journey` refusals → `appAuthAsks(...)` (exact `APP_SIGN_IN_ROUTES`), the valid attempt onto the mock leg
   with body keys exactly `['email','includeTeams','password']` (`core/services/client/api/auth/auth.service.ts:188-193`).
2. `password-recovery` both halves onto the mock leg (`auth.service.ts:288-297`, `303-310`) with `appResetPasswordUrl`
   naming `/auth/reset-password` (`core/constants/config/constants.tsx:290`). The old "this app's handler was asked
   nothing" witnesses were **vacuous on this deployment** — a browser never asks those handlers, whatever a form does —
   so they are now labelled as leg witnesses instead of left to pass silently.
3. `session-routing` expired session → the renewal the door really performs (`proxy.ts:558-575` +
   `mock-gauzy-server.mjs:537`): `/settings/personal` served, one `POST /api/auth/refresh-token` ask, `auth-token` still
   in the jar. `deny_redirect(true)` stays unreachable in a mock run.
4. `session-routing` `/fr/auth/passcode` → off the auth page **onto `/fr`**, with next-intl's `NEXT_LOCALE=fr` as the
   reason. Sign-out jar → the ten `cookiesKeys()` names emptied and **`auth-active-project` left valued**
   (`core/lib/helpers/cookies/index.ts:271-282` against the harness's `authCookieNames`, `playwright/helpers.ts:148-163`).
5. `cookie-jar` clearing pinned on the refusal a mock run *can* cause (`deny_redirect(false)` → `/unauthorized`): all
   ten names present, none valued, `auth-active-project` the one leftover; the renewal case pinned as
   `auth-token === 'synthetic-refreshed-token'` and named in the test as a **mock-shaped pin**, not a claim about a real
   Gauzy answer.
6. `password-recovery`'s typed values hoisted to `RESET_PASSWORD_VALUE` / `RESET_PASSWORD_OTHER` in
   `lane-auth-helpers.ts` — §11.6's owed item, done here: the credential-shaped literal is out of the lane's specs, and
   both values satisfy Gauzy's five rules, so the "passwords don't match" case measures the mismatch and not the rules.
   Re-run after the change: **11 passed (31.8s)**, `lane-b-password-recovery-5.log`.

### 12.6 Kept as findings, not softened

* `cookiesKeys()` is short of `auth-active-project`; two independent cases measure the leftover (sign-out, and the
  door's refusal). A refused jar still reads as a session on that one cookie.
* A code shorter than 8 is refused **silently** (`core/hooks/auth/use-authentication-passcode.ts:326` sets `'loading'`,
  `339-343` only `setErrors(errors); return;`, and `core/components/pages/auth/sign-in/code-step.tsx:29-35` shows a
  message only on status `'error'`). The case pins the silence on purpose: a fix that tells the person why fails it.
* `app/api/auth/register/route.ts:108-109` never checks that the login answer carries a token; the chain runs on and
  `setAuthCookies` writes a cookie session out of the *refresh* answer with `auth-user-id` / `auth-refresh-token`
  empty. Reachable here only because this mock answers 200 with an echo — on the real API the login would not answer
  200 — so it is reported as a hardening gap, pinned as measured, and not written as an assertion that can only pass.
* One flake, named rather than papered over: `lane-b-passcode-journey-3.log` read the five code slots as
  `Expected: "AAAAA" / Received: "AAAA"` **after** the submit click; `-4.log` and `probe-3.log` read `AAAAA`. The case
  now pins both sides — the slots holding what was typed *before* the click and still holding it after — so the next
  red says whether it was the case's own typing or the app clearing a slot.

### 12.7 Collisions, and what this section cannot claim

* HEAD moved twice during this session: the brief's `bb54f1251`, then `c6b77afea` (merge of `origin/develop`, 13
  commits, none in `apps/web/playwright/**`), then `93d1c50ad` while I ran. No lane-b expectation moved because of the
  merge — every file above re-ran green against `93d1c50ad` plus the working-tree edits.
* `lane-b-session-routing-1.log` is no longer my log: another agent's 02:53 run overwrote it. My number for that run
  exists only in this text. My green reading is `lane-b-session-routing-3.log`.
* `signup-forms.spec.ts` in the tree is both agents' work interleaved (my `signupState` page dump and the `/api`
  prefix fix, their polled witnesses, `waitForResponse` and the 200 repin). The commit that carries it carries both.
* Not claimed here: anything in `suites/api/**`, `suites/lane-c/**`, `suites/lane-d/**`, `playwright/helpers.ts`,
  `playwright/fixtures.ts`, `playwright/test-servers.ts` or `cypress/support/mock-gauzy-server.mjs`. §11.5's
  `MAX_REQUESTS = 10` ring in `playwright/backend.mjs:40` is the harness fact that makes several "asked exactly once"
  witnesses in this lane weaker than they look (the sign-up chain is eight asks on its own) — owed to whoever owns that
  file, not fixed here.

### 12.8 Re-verified on the tree as it stands when this was written

The other agent kept editing `signup-forms.spec.ts` after my `-3.log` run, so the numbers above were re-taken against
the current files:

* `lane-b-signup-forms-4.log` → **8 passed (37.7s)** (their 05:27 version; the register case is now at `:342` and its
  leg-2 witness reads the chain's last ask, `/api/organization-team`, for the §11.5 ring reason).
* `lane-b-full-2.log` → **76 passed (4.0m)**, same command as §12.3, on this tree — the number the commit quotes.
* `lane-b-tsc-9.log` → `tsc -p playwright/tsconfig.json --noEmit` exit 0 on the same tree.

One collision stated plainly, because it is a live-infra fact and not a test problem: **both agents drove the same
lane-b servers** (3032 / 3996-3999 — the lane is not per-agent). When this session brought lane-b back up after the
app on 3032 died, `lane-servers.mjs` restarts the mock, and a fresh mock starts with an empty `/requests` log; §11.1
records one of the other agent's `password-journey` runs dying exactly there. `down lane-b` is a state change for both
drivers, and neither of us claimed it in `workspace/MAINTENANCE.md` §3 ACTIVE — these are WIP lane servers on a dev
PC, not `ever-gauzy-prod`, but the next single owner of this lane should say out loud who holds 3032 before pressing
`up` or `down`.

---

## 13. The download-forwarding family, pinned 2026-11-22 (third lane-b session: `download-forwarding.spec.ts`, `download-outage.spec.ts`)

One new family, two files: `core/services/server/forward-download-to-gauzy.ts` and both route handlers that call it
(`app/api/export/route.ts`, `app/api/plugins/docs/documents/[id]/export.pdf/route.ts` — found by grepping the exported
name; those are the only two callers in `apps/web/app/**`).

### 13.1 Runs, gate, lane

```
E2E_LANE=lane-b npx playwright test --config apps/web/playwright/playwright.lane.config.ts download-
→ 1 failed, 2 skipped, 25 passed (40.1s)                E:\Coding\.tmp\lane-b-dl-1.log   (the red is §13.3, mine)
→ 2 skipped, 26 passed (44.8s)                          E:\Coding\.tmp\lane-b-dl-2.log   (green after that repin)
→ 2 skipped, 28 passed (37.3s)                          E:\Coding\.tmp\lane-b-dl-3.log   (with §13.10's two cases)
→ 2 skipped, 28 passed (45.2s)                          E:\Coding\.tmp\lane-b-dl-4.log   (the run the commit is on)
```

`lane-b-dl-4.log` is the state everything below describes: 30 tests, 28 green, 2 gated skips. The line numbers cited
per case are that log's own `…spec.ts:NNN` positions.

30 tests discovered in the last run: 22 in `download-forwarding.spec.ts`, 8 in `download-outage.spec.ts` (6 run + 2
gated). Per-case durations quoted in §13.2 are `lane-b-dl-2.log`'s `ok` lines, except the two invoice cases, which
only exist in `lane-b-dl-3.log`.

* `tsc -p playwright/tsconfig.json --noEmit` from `apps/web`: **exit 2** in `lane-b-dl-tsc-3.log` (two errors of mine:
  a headers array that inferred `origin?: undefined`, and a `const text` read but never used), **exit 0** in
  `lane-b-dl-tsc-4.log`, **exit 0** in `lane-b-dl-tsc-5.log` after the §13.3 repin, **exit 0** in
  `lane-b-dl-tsc-6.log` with §13.10's two cases added, and **exit 0** in `lane-b-dl-tsc-7.log` — the state the commit
  was made on, which is also `npx prettier --check` clean on both files with no line over 120 characters. Prettier ran
  on both files from the repo root; `lane-b/README.md` is the only lane-b spec file I did not touch.
* Lane: taken **up** and restarted by the coordinating session; `check lane-b` printed `OK — the app on 3032 names its
  own mock 3996 and stats sink 3997` before both runs and I pressed neither `up` nor `down`. In this checkout that
  check line does **not** name the OIDC issuer port 3999, which is worth knowing when a run dies on a missing issuer.
* Read-only probes, each in its own `E:\Coding\.tmp\lane-b-dl-probe-<n>.mjs` + `.txt`: 1 (the two routes' answers),
  2 (query passthrough), 3 (drop/delay arms on the download path, timings), 4 (verb shapes, id shapes), 5 (expired and
  chunked tokens), 6 (`scenario.fails` spellings), 7 (`/api/invoices/download/{id}`, before §13.10 was written). Every
  number in §13.4, §13.5 and §13.10 is copied out of those files.

### 13.2 What is pinned, in one line each

`download-forwarding.spec.ts`, first three describes (green in `lane-b-dl-4.log`, durations from that log):

1. Body passthrough **byte-for-byte, hashed on both sides** (`sha256(app body) === sha256(mock body)`, the mock asked
   directly at `MOCK_ORIGIN` first, so the log the assertions read is only the app's own call), with the mock's own
   `content-type` **including its `charset`** copied verbatim, `cache-control: no-store` copied, and
   `x-content-type-options`, `access-control-allow-origin`, `content-disposition`, `content-length` and any
   `Set-Cookie` all measured absent — the whitelist's *silence* is asserted, not assumed (`:113`, 1.3 s).
2. The route fixes the upstream path to its own and hands the whole query on in the caller's order: a `%20` arrives at
   the mock as `+` and the emoji stays percent-encoded (`subtree=true&format=zip&file=a+b.pdf&emoji=%F0%9F%98%80`,
   `:172`, 63 ms — the mock logs `searchParams.toString()` of what the app fetched, measured in
   `lane-b-dl-probe-2.txt`); no query reaches the API as `''`, not as an appended `?` (`:199`).
3. Guard order: no token → **401** `application/json` with **nothing asked** (`:209`); the `z.guid()` check answers
   **ahead of** the bearer check — a bad id with no session at all is 400, not 401 (`:233`); the id gate is a **hex
   shape check, not a UUID version check** — `11111111-…`, all-zeros and an UPPERCASE id are accepted and forwarded
   verbatim into the upstream path, a no-dash 32-hex and a 35-char id are refused with
   `{"error":"A document id is required"}` with nothing reaching the API (`:257`, 515 ms). **App finding, kept as a
   finding:** a caller controls the id segment of the path the server fetches.
4. No origin guard on a download: a cross-site GET (with `origin: https://some-other-site.example` and
   `sec-fetch-site: cross-site`, `same-site`, and origin alone) is **forwarded with the session bearer**, proven by
   `receivedTokens(UP_FILE)` equalling `sha256` of the cookie token minted in the same test (`:304`, 197 ms).
   **App finding.**
5. The two routes differ for the same signed-in caller: the document route answers 200, the export route answers 403
   `{"statusCode":403,"message":"Forbidden resource"}`, and the reason is measurable — the mock's own
   `GET /api/role-permissions/me` lists exactly `['TIME_TRACKER','ORG_TASK_ADD','ORG_TASK_EDIT','ORG_INVITE_EDIT',`
   `'ORG_EMPLOYEES_EDIT']` as enabled, with `EXPORT_ADD` absent (`:339`, 760 ms). If those rows ever gain `EXPORT_ADD`
   this case goes red with a message that says the forwarded half has to be written.
6. Verbs on a GET-only route, both routes: **HEAD** is answered by the GET handler, empty-bodied, and it costs a
   **full upstream GET** (`:407`); **OPTIONS** is answered by Next itself with 204 and `allow: GET, HEAD, OPTIONS`
   with nothing asked (`:431`); POST/PUT/DELETE are 405 with an **empty body, no content-type and no allow**
   (`:449`); POST on the export route is a verb refusal too, so no body ever reaches the permission gate (`:480`);
   HEAD on the export route **runs the permission gate** and answers its 403 empty-bodied (`:494`).
7. The token a download route accepts: a token whose `exp` claim passed an hour ago — and one with `exp: 1_000` — is
   forwarded **as it is**, 200 with the bearer hash matching (`:516`); a chunked `auth-token0..2` with
   `_totalChunks=3` is reassembled and forwarded as **one** bearer (`:553`); a declared chunk count with a chunk
   **missing** is a 401 with nothing asked (`:576`). **App finding, kept as a finding:** `forwardDownloadToGauzy`
   reads the cookie and never validates its claims, so expiry is enforced only by whoever sits in front of it.
8. What leaves: the bearer is the session cookie token (as the mock hashed it); the upstream `tenant-id` is the
   `auth-tenant-id` **cookie**, proven differentially on the mock's `scenario.drops` key `<tenantA>:<path>` — cookie A
   ⇒ entry `status 0` + app 502, cookie B ⇒ 200, no tenant cookie ⇒ 200, and cookie A plus a hostile
   `tenant-id: tenantB` **request header** ⇒ still 502, i.e. the caller's own header is ignored (`:614`, 199 ms); no
   organisation header is written upstream and dropping the organisation cookie changes nothing (`:665`).

`download-forwarding.spec.ts`, last describe — §13.10's route, green in `lane-b-dl-4.log`:

9. `GET /api/invoices/download/{id}` for the fixture role → **403** `{"statusCode":403,"message":"Forbidden resource"}`
   having asked **only** `GET /api/role-permissions/me 200`, with its own path never asked (`:713`, 174 ms); anonymously
   → **401** `{"statusCode":401,"message":"Unauthorized"}` having asked **nothing at all** (`:730`, 64 ms).

`download-outage.spec.ts` (green in `lane-b-dl-4.log`, durations from that log):

10. A dropped upstream call on the file route → **502** `{"statusCode":502,"message":"The Gauzy API is unreachable"}`,
   `content-type: application/json`, no `content-disposition`, no `content-length`, entry `GET … 0`, and
   `mock.failures()` empty (a `status: 0` entry is not a failure the harness counts) (`:74`, 80 ms).
11. The export route answers the same outage with the **JSON proxy** shape, because its permission read is where it
    died — and the download path is never asked (`:114`, 49 ms); the download helper's outage answer and the JSON
    proxy's are **byte-identical** (the same arm, both routes, compared as text, `:140`, 120 ms).
12. Arms that are not a number or below zero (`-5`, `'not-a-number'`, `0`) **answer the file** instead of dropping it
    (`:219`, 189 ms); a 3 000 ms `scenario.delays` arm is **waited out**, inside the app answer and inside the mock
    entry (`:236`, 3.1 s).
13. The clamp pin — §13.4.

### 13.3 The one red was my own wrong prediction, and what it was repinned to

`download-forwarding.spec.ts`, then at `:371` and today at `:372` (cross-site GET of `/api/export` → 403 with the
permission body) also asserted
`mock.requests()` **`toEqual([])`**, on the prediction that a cross-site request is turned away before anything is
asked. The run measured one ask — `GET /api/role-permissions/me 200` (`lane-b-dl-1.log`, test 9: "the refusal asked
something other than the permission read"). `refuseForeignWrite` answers writes only, so the origin guard never reaches
this route and the permission read is what refused it. Re-pinned to what was measured, and to the stronger form: the
log is exactly `[GET /api/role-permissions/me 200]` **and** the export upstream path was never asked.
`lane-b-dl-2.log` case 9 green (26 ms). Nothing was weakened: an exact log contents replaced an emptiness claim.

### 13.4 The clamp, stated exactly as it asserts today

The case (`download-outage.spec.ts:165`, `30.1s` in every one of `lane-b-dl-1.log`, `-2.log`, `-3.log`, `-4.log`) arms
`scenario.drops` on the download **path** with `DROP_CEILING_MS * 2 = 60 000` and asserts four things: the app answers
**502** with the unreachable body verbatim; the mock entry carries **`status === 0`**; the client's own wall is
**`<= 35 000`** (`MAX_DROP_MS + HOLD_WINDOW_MS`) **and `>= 25 000`**; and the entry's own
`(endMs ?? 0) - (startMs ?? 0)` is **`< 1 000`**. It is a **clamp pin, not an outage pin**: it pins that an arm aimed
above the ceiling costs the lane the ceiling, and that the mock's `/requests` entry cannot be used as the witness for
either number.

Measured in `E:\Coding\.tmp\lane-b-dl-probe-3.txt`, same lane, same mock:

| arm on `<path>` | client wall | entry `endMs - startMs` | app answer |
| --- | --- | --- | --- |
| `1` | 21 ms | 0 | 502 unreachable |
| `60 000` | **30 033 ms** | **0** | 502 unreachable |
| `-5` | 35 ms | 0 | 200 `{"items":[],"total":0}` |
| `'not-a-number'` | 15 ms | 0 | 200 `{"items":[],"total":0}` |
| `delays` 3 000 | 3 017 ms | **3 001 ms** | 200 |

So: **the mock writes the `/requests` entry before it holds the socket** — `endMs - startMs` reports 0 for a 1 ms arm
and for a 30 s hold alike, while the client waited 21 ms and 30 033 ms. The `< 1 000` assertion pins that ordering on
purpose; a red there means the harness moved the write after the hold, and both that assertion and the wall bounds
have to be re-pinned from a new measurement, not relaxed. A delay, by contrast, **is** inside the entry (3 001 ms),
which is why the delay case measures the hold two ways and the drop case cannot.

Harness facts as read at `c4e6fadc5` in this checkout (`apps/web/cypress/support/mock-gauzy-server.mjs`):
`MAX_DROP_MS = 30_000` at `:35`, `const dropMs = Number.isFinite(dropArm) ? Math.min(Math.max(dropArm, 0), MAX_DROP_MS)`
at `:1052`, `status: dropMs > 0 ? 0 : status` at `:1089`, the `setTimeout(resolve, dropMs - 1)` hold at `:1105`. The
coordinating session reports a newer clamp (arm 45 000 → ~45 s) and a `scenario.fails` switch (`60fe12221`, then
`8d9229c52`); **neither object is in this checkout** — `git cat-file -e 8d9229c52` → "Not a valid object name",
`git ls-remote --heads origin test/playwright-e2e-suite` → `2f98d3df304dce5cb82d49fdf8889b693da9dd5a`, and
`grep -c "scenario.fails" apps/web/cypress/support/mock-gauzy-server.mjs` → **0**. If that clamp lands, this case goes
red at ≈60 000 ms wall **by design**; that is a change to re-measure and re-pin with the new number written here, and
it is not a rollback candidate.

Also from `lane-b-dl-probe-3.txt`: a client that aborts at 1 500 ms while the upstream is delayed 8 000 ms ends in a
node `fetch` `TimeoutError` at **1 513 ms with an empty mock log** — the app's 499 branch has no reader in this
harness, so it is **not asserted anywhere in these two files** (see §13.6).

### 13.5 Gated, not quietly green: an upstream that *refuses* with a status

Nothing in this checkout's mock makes it answer a 4xx/5xx for a path it does not know: its fall-through for an unknown
GET is `pagination([])` on 200, and its 4xx/5xx answers are all keyed to paths it knows (`/api/auth/workspaces`,
`/api/auth/signin.workspace`, `/api/auth/switch-organization`, the Ever ID back-channel, the notification read,
`/api/ever-*`). `lane-b-dl-probe-6.txt` armed `{ fails: { <path>: 503 } }`, `{ fails: { <path>: '503' } }`,
`{ failureScenarios: … }` and `{ scenario: { fails: … } }` in turn: each control call returned 200, each app call
answered **200 `{"items":[],"total":0}`** with the mock logging **200**, and the arm showed up only as an unused key in
`state.scenario`. So `download-outage.spec.ts`'s last describe runs a `beforeAll` probe (three spellings; both the app
status and the mock entry status must be ≥ 400) and its `beforeEach` skips with a printed reason naming the restart
that would make them live. Those 2 skips are the `2 skipped` in both logs. When they do run they assert **app-vs-mock
equality only** — the app's status and body equal what the same armed mock answers the same path when asked directly,
and the refusal recorded with its own status and present in `mock.failures()` — so no number in them is invented.

### 13.6 Limits: what this harness cannot do to a download (needs, written down — not built)

* The mock has **no handler for either download path**. It answers both as JSON: `content-type: application/json;`
  `charset=utf-8`, `cache-control: no-store`, chunked (`writeHead` + `end`), so **no `content-length`**, **no
  `content-disposition`**, and no binary body. Therefore unreachable here, and deliberately not faked: the
  `attachment; filename=…` half of `downloadHeadersOf` (verbatim / quoted / non-ASCII filename), a binary or **empty**
  body, the `application/octet-stream` fallback (`forward-download-to-gauzy.ts:75`), and the branch that drops
  `content-length` when the upstream declares `content-encoding` (`:66-77`). Today only
  `core/services/server/forward-download-to-gauzy.test.ts:32-45` and `:58-63` cover those, as unit tests. Case 1
  asserts the *absence* of `content-disposition`/`content-length` and says in its failure message that a mock which
  grows a download handler turns that assertion red on purpose, so the gap cannot rot silently.
* Not a `fetch` limitation, proven in scratch: `lane-b-dl-fetch-header-probe.txt` (node `fetch` **does** surface a
  `content-length` a server writes) and `lane-b-dl-fetch-header-probe2.txt` (`writeHead(…) + end(string)` → chunked,
  no `content-length`) — i.e. the missing length is the mock's own shape.
* **Owed to the harness owner** (`cypress/support/mock-gauzy-server.mjs` was not edited here): a download handler on
  these two paths that sends a binary body, a `content-disposition` with a quoted non-ASCII filename and an explicit
  `content-length`; a per-path status arm (`scenario.fails` keyed `<tenant>:<path>`), which §13.5 is waiting for; and
  a shared token mint — `b64url`/`tokenWithClaims` are repeated in `download-forwarding.spec.ts:99-101` because the
  same five lines live in `playwright/helpers.ts:175-179` and in `suites/api/tab-session.spec.ts`, neither of which a
  lane may edit.
* `/api/export`' **forwarding** leg is unreachable in every mock run today (§13.2 item 5: `EXPORT_ADD` is not in the
  fixture role), so what is pinned about that route is its gate and its verbs, never its download.
* **504** (the helper's own `AbortSignal.timeout`) is unreachable from a test: the routes ask 15 min and 2 min and
  `api-fixtures.ts:101` cuts the client at 60 000 ms. **499** is unassertable (§13.4's abort probe). Both are stated
  as limits, not skipped cases.

### 13.7 Not duplicated (who already owns what)

`suites/api/tab-session.spec.ts` owns the FILE route's credential half and `suites/lane-c/permission-guard.spec.ts`
owns `/api/export`'s 401/403 for a signed-in caller. What lives here is the rest of the family: body/header
passthrough, query passthrough, the id gate and its order against the bearer check, the verbs, the token shapes, the
outage answers, the clamp, and the cross-site/HEAD halves of the export gate.

### 13.8 The two cases that carry a wall-clock margin (flake rule)

Only the clamp pin (`>= 25 000` / `<= 35 000` around a 30 000 ms hold; measured 30 033 ms in `lane-b-dl-probe-3.txt`,
30.1 s in each of the four suite logs) and the delay case (`>= 2 500` and `< 15 000`; measured 3 017 ms in the probe,
3.1 s in `lane-b-dl-4.log`).
If either goes red on a loaded machine, read the number out of the log first and re-pin from that number; the delay
case's lower bound is the mock's own entry (`endMs - startMs = 3 001`), which does not depend on machine load, so a
red there is a harness change, not a slow PC.

### 13.9 Statements this section does **not** make

* No `externalProxy` / `/api/external` claim: this checkout has no `apps/web/app/api/external/` directory, and
  `grep -rn "api/external" apps/web/playwright/suites/` and
  `grep -n "external" apps/web/cypress/support/mock-gauzy-server.mjs` both return nothing, so the pin the coordinating
  session asked me to keep is not something I can see or run from this tree.
* No "256-char cap" claim anywhere: `grep -n "256" apps/web/playwright/suites/lane-b/*` hits only `sha256`.
* Nothing in `playwright/helpers.ts`, `fixtures.ts`, `test-servers.ts`, `api-fixtures.ts`,
  `cypress/support/mock-gauzy-server.mjs`, or another lane's specs was touched; no lane server was started or stopped;
  no dependency was added. My only writes: the two spec files, this section, and my own `E:\Coding\.tmp\lane-b-dl-*`
  logs.

### 13.10 The third route with `download` in its name, and the one thing about it that is a finding

`grep -rn "forwardDownloadToGauzy" apps packages` finds **exactly two** callers (`app/api/export/route.ts:18`,
`app/api/plugins/docs/documents/[id]/export.pdf/route.ts:14`), so §13.2's family is complete. But
`app/api/invoices/download/[id]/route.ts` is a **download route that is not in that family**: `:8`
`refuseUnlessPermitted(req, canViewInvoices)` and then `:14`
`forwardToGauzy(req, \`/invoices/download/${encodeURIComponent(id)}\`)` — the **JSON** proxy. `apps/web/app/api/reports/`
does not exist on this branch (`ls` → "No such file or directory"), and no spec in `apps/web/playwright/suites/`
referenced `/api/invoices/download` before this section.

Measured (`E:\Coding\.tmp\lane-b-dl-probe-7.txt`, then pinned as the two cases of §13.2 item 9 in
`lane-b-dl-3.log`): signed in it answers **403** `{"statusCode":403,"message":"Forbidden resource"}` after exactly one
ask (`GET /api/role-permissions/me 200`) and never asks its own path; anonymously it answers **401**
`{"statusCode":401,"message":"Unauthorized"}` with **nothing asked** (the permission read itself goes
*through* `forwardToGauzy`, which refuses a caller with no token before it fetches
— `refuse-without-permission.ts:41-45`); an id aimed at path traversal (`/api/invoices/download/..%2Femployee`) gets
the same 403, so `encodeURIComponent` at `:13` never runs for this role and **that guard is not measurable
end-to-end in this harness** — stated as a limit, not tested.

**Finding, read from the code and deliberately not measured:** a caller who *does* pass `canViewInvoices` gets a PDF
answer built by `forwardToGauzy`, whose own header set is `Content-Type` plus an optional `Cache-Control`
(`forward-to-gauzy.ts:21-27`) — so `Content-Disposition` never travels, the invoice PDF arrives **without the name
Gauzy gave it**, and its ceiling is the JSON proxy's `UPSTREAM_TIMEOUT_MS = 60_000` (`forward-to-gauzy.ts:8`, armed at
`:123`) rather than the download helper's 120 000 (`forward-download-to-gauzy.ts:7`, `:35`, `:50`). The route's own
comment says it is the "proxy mode twin of Gauzy's `GET /invoices/download/:id`, which answers the invoice as a PDF".
What would make the forwarded half measurable: a mock role that grants `INVOICES_VIEW` **and** a rate-admin permission
(`core/lib/utils/invoice-access.ts:3-22`, `core/lib/utils/rates.ts:258-260`) — the fixture role's enabled list
(§13.2 item 5) has neither. Until then the only honest statement about that route is its gate, which is what is
pinned.
