import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit, type MockScenario, type StubRequest } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person sees on **Settings › Personal › Security** (`/settings/personal/security`,
 * `app/[locale]/(main)/settings/personal/security/page.tsx` → `core/components/settings/pages/security/security-settings-page.tsx`
 * + `two-factor-parts.tsx`), and what the browser really sends while doing it: the off row, the setup, the code step
 * and every refusal it can answer, the on rows, the proofs a change asks for, the recovery codes and the in-flight
 * state. Pinned in a real Chrome on lane-a (app `http://localhost:3031`, mock `http://127.0.0.1:3992`, control
 * `http://127.0.0.1:3994`, `playwright/test-servers.ts:38`) on 2026-11-23 and 2026-11-24. Every string, count, URL and
 * body below was measured — first in `E:\Coding\.tmp\s2-lane-a-2faui-probe-1.log` (a throwaway probe that printed the
 * page's own text and every `/api/auth/two-factor*` request), then re-printed by this file: each test logs one
 * `[lane-a 2fa-ui] MEASURE …` line with what its page showed and what its browser sent, so any assertion here can be
 * re-checked against a run log in `E:\Coding\.tmp\`: `s2-lane-a-2faui-1.log` … `-4.log` are the iterations, `-5.log`
 * and `-6.log` two consecutive fully green runs (12 passed, nothing skipped or flaky), and
 * `s2-lane-a-2faui-probe-reads-1.log`, `-2.log`, `-3.log` the throwaway probes behind the status-read numbers below.
 *
 * ## The stubs, and why this file has to write them at all
 *
 * **The mock cannot answer these routes.** `cypress/support/mock-gauzy-server.mjs` has no `/api/auth/two-factor*`
 * handler, so its catch-all answers a GET with `pagination([])` = `{ items: [], total: 0 }` (`:827`), a DELETE with
 * `{ affected: 1, raw: [] }` (`:825`) and any other verb with the body it was sent (`:826`). Test 1 measures what the
 * page makes of the first of those, and it is a mock limit, not an app finding: a two-factor status of
 * `{ items: [], total: 0 }` has no `available`, so `security-settings-page.tsx:177` reads it as "this server does not
 * offer it" and the setup is never offered. Nothing else in this file can reach an enabled or an enrolling state
 * through the mock.
 *
 * So every other test answers the app's own `/api/auth/two-factor*` calls with `page.route` + `route.fulfill`, shaped
 * after the request builders of the server half (`core/services/server/requests/two-factor.ts`: `twoFactorStatusRequest`
 * `:22-30` answers `ITwoFactorStatus`, `enrollTwoFactorRequest` `:32-40` answers `ITwoFactorEnrollment`
 * `{ secret, otpauthUrl }`, `confirmTwoFactorRequest` `:42-50` answers `ITwoFactorConfirmation`
 * `{ enabledAt, recoveryCodes }`, `disableTwoFactorRequest` `:52-60` answers `ITwoFactorStatus`,
 * `regenerateRecoveryCodesRequest` `:62-70` answers `ITwoFactorRecoveryCodes`, `resetMemberTwoFactorRequest`
 * `:73-80` answers `{ reset: boolean }` — all six types in `core/types/interfaces/auth/two-factor.ts:10-45`).
 * **Every one of those answers is this file's invention**; only the shape comes from the code. A script is a queue per
 * `METHOD path`, and a call past the end of its queue repeats the last answer (so "off, then on" is two entries and a
 * read that retries reuses the refusal it was already given).
 *
 * The answers restate the mock's CORS headers (`CORS_HEADERS` below, copied from `mock-gauzy-server.mjs:1018-1027`,
 * including its `OPTIONS` → 204 answer at `:1028-1032`), because the page is on `localhost:3031` and the API on
 * `127.0.0.1:3992` — without them the browser throws the answer away and the case turns into a connection error
 * (`suites/lane-a/workspace-data-export.spec.ts:107-109` says the same about its own stubs). `route.fetch()` is
 * deliberately **not** called: in these runs the mock would log a call it cannot answer as a 200, and this file would
 * then be asserting a number the mock never really gave. The browser's own requests are recorded from
 * `page.on('request')`-equivalent data (`route.request()`: method, path, `postData()`), and `mock.calls('/two-factor')`
 * is asserted **empty** in every stubbed case, which is the proof that what the page acted on came from this file.
 *
 * ## The code this file measures (each line read out of its file before it is named)
 *
 * - `core/components/settings/pages/security/security-settings-page.tsx`: the off row `OffRow` (`:33-53`) shows the
 *   `OFF` badge (`:45`) and a `TURN_ON` button **only when `status.available`** (`:46-50`); the on rows `OnRows`
 *   (`:55-90`) show the `ON` badge (`:74`), `ON_SINCE` when the status carries `enabledAt` (`:63-68`), `TURN_OFF`
 *   (`:75-77`) and the recovery-codes row with `CODES_LEFT` and `NEW_CODES` (`:79-87`); every row's buttons are
 *   disabled while a panel is open (`:69`, `:75`, `:84`). The three states around them: skeletons while loading
 *   (`:145-152`), `UNSUPPORTED_TITLE` when the read says the API has no such routes (`:153-161`), `READ_FAILED` with a
 *   `RETRY` button when the read failed any other way (`:162-174`), and the `REQUIRED_TITLE` / `UNAVAILABLE_TITLE`
 *   notices driven by `requiredByOrganization` and `available` (`:176-194`). A failed write is shown under its own
 *   field (`:113-122`, `:124-133`, `:135-143`), a failed *setup start* is a toast (`:103-111`).
 * - `core/components/settings/pages/security/two-factor-parts.tsx`: `writeFailureMessageOf` (`:26-44`) is the map from
 *   a refusal to its sentence; the setup (`:119-217`) shows the secret in groups of four (`:161-166`), its QR
 *   (`:82-113`), a `otpauth://` link (`:176-181`), a six-digit field (`:189-204`, `placeholder="000000"`) and a submit
 *   plus a Cancel, both `disabled={confirming}` (`:205-210`); the recovery codes (`:220-257`) are a list with Copy
 *   (`:243-246`), Download (`:247-250`) and `CODES_DONE` (`:251-253`); the proof form (`:260-332`) is one field whose
 *   submit is `disabled={busy}` (`:322-327`). A refusal is a `<p role="alert">` (`:67-76`).
 * - `core/lib/auth/two-factor.ts`: `TWO_FACTOR_CODE_LENGTH` 6 (`:4`); the typed code is digits only, six at most
 *   (`authenticatorCodeOf` `:79-81`, `isAuthenticatorCode` `:83-85`); a proof is six digits **or** a recovery code of 8+
 *   characters, upper-cased with dashes kept (`twoFactorProofOf` `:212-223` over `recoveryCodeOf` `:88-90` and
 *   `isRecoveryCode` `:92-95`); `retryAfterSecondsOf` (`:98-116`) reads a 429's body `retryAfter` and
 *   `retryMinutesOf` (`:119-121`) rounds it up to whole minutes, at least 1; `twoFactorStatusFailureOf` (`:137-142`)
 *   calls a 404 `unsupported` and everything else `error`; `twoFactorWriteFailureOf` (`:190-209`) maps whatever status
 *   its error carries: 401 and 400 `wrong-code`, 429 `too-many`, 503 `unavailable` (`:202-204`), 409 `changed`,
 *   anything else `failed`. **In this browser a request that never got an answer carries 503**, because
 *   `ApiErrorService.fromAxiosError` stamps `ERR_NETWORK` with `httpCode: 503` (`api-error.service.ts:19`, `:45-49`,
 *   applied at `:272-279`) — which is why the outage cases read as they do, below.
 * - `core/hooks/auth/use-two-factor-settings.ts`: the status is read once per sign-in and organization (`:23-40`) and a
 *   failed read is retried while `failureCount < 2` (`:18-20`); every write invalidates the status when it succeeds
 *   (`:67`, `:72`, `:77`, `:82`) and not when it fails; the mutation caches forget the secrets they carried (`:47`,
 *   `:49-61`), which is why a reload cannot bring the recovery codes back.
 * - `core/services/client/api/auth/two-factor.service.ts`: `getStatus` adds `?organizationId=` from the cookie
 *   (`:21-26`), `enroll` posts `{ issuer: APP_NAME }` (`:29-37`), `confirm` posts `{ code }` (`:40-48`), `disable` and
 *   `regenerateRecoveryCodes` post the proof (`:51-59`, `:62-70`), `resetMember` is a `DELETE` of
 *   `/auth/two-factor/users/<userId>` (`:73-76`). `confirm`, `disable` and `regenerate` pass
 *   `expectedUnauthorized` (`:44`, `:55`, `:66`), which is what keeps a wrong code from renewing or ending the session
 *   (`core/services/client/axios.ts:19-20`, `core/services/client/api.service.ts:276-281`).
 * - In these runs the browser talks to the mock directly, not to the app's own `/api/auth/two-factor*` route handlers:
 *   `playwright/test-servers.ts:104-110` + `:295-303` and `core/constants/config/constants.tsx:229-231` make
 *   `GAUZY_API_BASE_SERVER_URL` the mock origin and `core/services/client/axios.ts:108-112` makes the axios base
 *   `<mock origin>/api` (the lane's own README says the same, `suites/lane-a/README.md:69-72`). So
 *   `core/services/server/two-factor-proxy.ts` — which is where a wrong code would be passed through (`:77-81`, `:91-93`)
 *   and where a member reset is refused without `ORG_USERS_EDIT` with `{"message":"You may not reset this member."}`
 *   403 (`:31`, `:100-117`) — is **not** in this file's path; its answers are the shape this file's stubs imitate.
 *
 * ## What the run measured, per case (the numbers the assertions are pinned on)
 *
 * - **The status read is one GET with the organization** (`probe-1.log` P1, P2, P7): every load of the page sent
 *   exactly `GET http://127.0.0.1:3992/api/auth/two-factor?organizationId=<fixture organization A>`, and the mock
 *   logged it `GET /api/auth/two-factor` 200 (`{ items: [], total: 0 }`). No other `/api/auth/two-factor*` call
 *   happened anywhere in the probe, and none happened in this file's stubbed cases either.
 * - **Off** (P2): the row read `Authenticator app · Sign-ins ask only for your email code or your password. · Off`,
 *   exactly one `Turn on` button, and no notice.
 * - **Enroll** (P2): one `POST /enroll` with the body `{"issuer":"Ever Teams"}` (`APP_NAME`,
 *   `core/constants/config/constants.tsx:326` + `apps/web/.env:77`), then the panel `1. Add this account …`, the key as
 *   `JBSW Y3DP EHPK 3PXP` (the stub's `secret` through `secretGroupsOf` `:124-126`), `Copy key`, `Open in authenticator
 *   app` whose `href` is exactly the stub's `otpauthUrl`, `2. Enter the 6-digit code the app shows`, and one
 *   `img[alt=QR code of this account for your authenticator app]` whose `src` is a `data:image/svg+xml;charset=utf-8,…`
 *   URL 3962 characters long. What those bytes encode is pinned by the unit test that re-draws the same address
 *   (`security-settings-page.test.tsx:64-68`); this file does not re-draw it.
 * - **Confirm** (P2): one `POST /confirm` with `{"code":"123456"}`, then the codes panel with the stub's two codes,
 *   `Your recovery codes`, `Copy codes`, `Download`, `I saved my codes`, one toast `Two-factor authentication is on`,
 *   and **3** status reads in test 4: the load, the re-read the confirm invalidated (`use-two-factor-settings.ts:72`),
 *   and the reload's own read. After `I saved my codes` the rows
 *   read `On since Nov 14, 2026` — the date of the **status re-read**, not the confirm answer's `enabledAt`
 *   (`2026-11-23T09:00…`, `security-settings-page.tsx:63-68`). `Download` saved exactly one file,
 *   `ever-teams-recovery-codes.txt` (`two-factor-parts.tsx:226`). A reload showed 0 occurrences of either code and sent
 *   a `GET` of the status only — no `GET` or `POST` of `/recovery-codes`.
 * - **Refusals of the code step** (P3): `401` → `This code is not right. Enter the code your app shows now, or a
 *   recovery code.`; `429` with `retryAfter: 120` → `Too many wrong codes. Try again in 2 minutes.`; `429` without it →
 *   `Too many wrong codes. Wait a few minutes, then try again.`; `503` → the `UNAVAILABLE_DESCRIPTION` sentence;
 *   `409` → `Two-factor authentication changed meanwhile. Check it and try again.`; `502` → `It could not be changed.
 *   Try again in a moment.`; **a dropped request → the same `UNAVAILABLE_DESCRIPTION` sentence a 503 gets**, not the
 *   `FAILED` one (MEASURED, NOT INTENDED below). In all of them the setup panel stayed open with its key still on
 *   screen and the typed code stayed in the field, no `On` badge appeared and no status was read again. While the setup
 *   panel is open there is **no `Off` row at all** (`security-settings-page.tsx:203-208` renders the panel *instead
 *   of* the row), so "it is still off" is measured where the row exists: after `Cancel` the `Off` row and its `Turn
 *   on` come back unchanged. Every refusal also raised the app's global mutation-fallback toast — 2 toasts in these
 *   dev-mode runs, held over 5 samples in 2 s (`s2-lane-a-2faui-toasts.log`); see the second MEASURED, NOT INTENDED
 *   row for what the 401 one claims.
 * - **On** (P4): `On since Nov 14, 2026` + `9 unused codes left`, buttons `Turn off` and `New recovery codes`; **two**
 *   buttons read `Turn off` once the proof panel opens (the row's and the panel's confirm, `two-factor-parts.tsx:322-324`
 *   takes `confirmLabel` from `security-settings-page.tsx:221`), so every click in this file aims at the panel's own
 *   `form`. A code sent `{"code":"654321"}`, a recovery code sent `{"recoveryCode":"ABCD-EFGH-IJKL-MNOP"}` (typed lower
 *   case, upper-cased by `recoveryCodeOf` `:88-90`), a refused one kept the panel and put the wrong-code sentence under
 *   the field. `New recovery codes` asked the same proof and posted it to `/recovery-codes`.
 * - **A failed status read** (P5, re-measured with the answer held: `s2-lane-a-2faui-probe-reads-3.log` D/E/F): `502` →
 *   `Two-factor authentication could not be read` + one `Try again`, **3** status reads (the read itself plus the
 *   hook's 2 retries while `failureCount < 2`, `use-two-factor-settings.ts:18-20`); a dropped request → the same
 *   notice, also 3 reads; `404` → `Two-factor authentication is not available` / `This server does not offer
 *   two-factor authentication.` with **1** read and no follow-up read at all, because a 404 is the `unsupported` kind,
 *   which `shouldRetryStatus` never retries (`two-factor.ts:137-142` → `use-two-factor-settings.ts:19`). In all three the
 *   `Off` badge appeared **0** times and no `Turn on` was offered: the page never guesses "off". The entry that comes
 *   and goes is the **settings sidebar's** (`getByRole('navigation', { name: 'Settings' })`, named by
 *   `settings-nav.tsx:123`): the page header also draws a `navigation "breadcrumb"` whose last crumb is a link named
 *   `Security` for the page it shows, and the hidden-entry rule never reaches that crumb — measured when an
 *   unscoped `Security` link count stayed 1 on a 404 (`s2-lane-a-2faui-2.log`, test 10).
 * - **In flight** (P6): while the enroll was held the `Turn on` button was `disabled` and a forced click plus a
 *   dispatched `click` produced no second `POST /enroll` (sampled 5 times over 2 s); while the confirm was held both
 *   the submit and `Cancel` were `disabled` and nothing was sent twice.
 * - **Members** (P7): `/settings/team/members` renders on this lane (3 row menus) and reads the person's own
 *   two-factor state exactly once (`use-member-two-factor-reset.ts:16-17`), but the reset item appeared **0** times with
 *   `ORG_USERS_EDIT` armed and 0 times without it, and a failed two-factor read (404) changed nothing about the
 *   members list. The reason is the mock's own fixture: `memberRoleNameOf` reads `employee.user.role.name`
 *   (`core/lib/utils/settings-team.ts:79-81`) and `memberWorkspaceRoleIdOf` reads `employee.user.roleId` (`:70-76`), and
 *   the mock gives its teammate/restricted users neither (`mock-gauzy-server.mjs:117-138`; only `baseUser`, `:100-116`,
 *   carries `roleId` and `role`, and that member is `isYou`, excluded at `core/lib/utils/member-access.ts:395`). A null
 *   role name makes `canResetMemberTwoFactor` answer false at its role gate (`:398-401`, "Until the roles are read a
 *   super admin is not told apart: nothing is offered yet"), which is the gate the teammate row reaches after the
 *   permission check at `:392` and the `isYou` / no-account check at `:395`. **Mock limit.**
 *
 * ## MEASURED, NOT INTENDED (two rows; every line re-read in its file)
 *
 * - **A two-factor change whose request never got an answer is explained as "this server does not offer two-factor
 *   authentication".** With `route.abort('failed')` (test 7) the browser hands the app an axios `ERR_NETWORK`;
 *   `ApiErrorService.fromAxiosError` stamps that code with `httpCode: 503`
 *   (`core/services/client/api-error.service.ts:19`, `:45-49`, applied at `:272-279`), `twoFactorWriteFailureOf` reads
 *   503 as the `unavailable` kind (`core/lib/auth/two-factor.ts:202-204`, whose own comment at `:187` names 503 "a
 *   server that cannot keep secrets"), and that kind's sentence is `settings.security.UNAVAILABLE_DESCRIPTION` =
 *   "Two-factor authentication is not turned on for this server. Ask your administrator to turn it on."
 *   (`core/components/settings/pages/security/two-factor-parts.tsx:37-39`) — the same sentence the page prints when the
 *   API really has no two-factor routes (`security-settings-page.tsx:188-194`). It contradicts the library's own unit
 *   test for a request with no answer (`core/lib/auth/two-factor.test.ts:162` wants `{ kind: 'failed' }` for
 *   `new Error('offline')`) and the sibling sign-in code step, which has no 503 branch at all and answers the same 503
 *   with `failed` (`two-factor.ts:155-176`, reached from `core/hooks/auth/use-two-factor-sign-in.ts:55`). No part of
 *   this is the mock's or this file's doing: the stub only drops the request, everything after it is the app's own
 *   code. What the page does get right is that nothing else changed — no `On`, no recovery codes, no status re-read —
 *   and a failed **read** of the same kind is unaffected (503 is not 404, so `twoFactorStatusFailureOf` still says
 *   `error`, `two-factor.ts:137-142`, measured in test 10).
 * - **A refused code is also announced as an ended session.** The sentence under the field is the right one
 *   (`settings.security.WRONG_CODE`, `two-factor-parts.tsx:28-30`), but the app's global mutation fallback speaks as
 *   well, and for a 401 its reason is `toasts.REASONS.SESSION` = "Your session has ended. Sign in again to continue."
 *   (`core/components/common/mutation-error-toaster.tsx:53-56` over `core/lib/utils/error-feedback.ts:153-156` and
 *   `:22`), because none of the four settings mutations has an `onError` or `meta.handlesOwnError`
 *   (`mutation-error-toaster.tsx:23-30`, `core/hooks/auth/use-two-factor-settings.ts:69-84`, and
 *   `core/query/config/index.ts:33-34` deliberately leaves the default `onError` unset so this fallback can speak).
 *   The session did not end and the service's own comment says a refused code is meant to stay a wrong code, not a
 *   sign-out (`core/services/client/api/auth/two-factor.service.ts:16-17`); the call is made with
 *   `expectedUnauthorized` for exactly that (`:40-48`, `:44`, `axios.ts:19-20`, `api.service.ts:276-281`), and test 5
 *   measured the person still on `/settings/personal/security` with the setup open, the typed code still in the field,
 *   **0** calls to `/api/auth/refresh-token`, and the `Off` row coming back when the panel closed. Beside it, in these
 *   dev-mode runs only, sits the `DEV Mutation failed …` diagnostic (`core/components/common/dev-error-toaster.tsx:17`
 *   with its `Copy details` action at `:171`), which is why every measured toast sample here reads 2 rather than 1.
 *
 * ## What this file cannot measure (mock and stub limits, not app defects)
 *
 * - The mock has no `/api/auth/two-factor*` handler at all, so **every** two-factor answer in tests 2-11 is this
 *   file's `page.route` invention; only its shape comes from the code (`core/services/server/requests/two-factor.ts`).
 *   `route.fetch()` is never called, so `mock.calls('/api/auth/two-factor')` is empty in those tests — the page acted
 *   on this file, not on the mock.
 * - A real `otpauth://` QR is drawn by the app but its bytes are only compared with the unit test that re-draws the
 *   same address (`security-settings-page.test.tsx:64-68`); this file proves the tile exists, its `alt`, its `src`
 *   prefix and its 3 962 characters, not what they encode.
 * - `requiredByOrganization` is stubbed (`{ …STATUS_OFF, requiredByOrganization: true }`, test 2), because the mock's
 *   organization never sets it; the
 *   `REQUIRED_TITLE` notice is therefore measured as *the page's rendering of a stubbed flag*, nothing more.
 * - The member reset (`DELETE /api/auth/two-factor/users/<id>`, its confirm dialog and its 403
 *   `{"message":"You may not reset this member."}` from `two-factor-proxy.ts:100-117`) is **not reachable on this
 *   lane**: no member row in the mock's fixtures carries a workspace role, so `canResetTwoFactor` is false for every
 *   row with or without `ORG_USERS_EDIT` (`use-team-members-settings.ts:317-328` + `member-access.ts:398-401`). Test 12
 *   measures exactly that, and nothing in this file sends a `DELETE` at all.
 * - **Two readers of one query key: a failed read's total count is only stable once the read is held.** The Security
 *   page reads the state through `useTwoFactorSettings` (`use-two-factor-settings.ts:66`) and the settings sidebar reads
 *   the **same** query key through `useHiddenSettingsEntries` (`use-hidden-settings-entries.ts:75`); TanStack Query
 *   shares a read only while it is still in flight, and an errored query that carries no data is stale, so the next
 *   component that mounts it asks again. Measured on `/settings/personal/security` with the answer given at once: 1 or 2
 *   reads for a 404 over 8 rounds (`counts [2,2,1,1,2,2,1,2]`, `s2-lane-a-2faui-probe-reads-2.log`) and over 6 rounds
 *   (`[1,2,2,2,2,1]`, `s2-lane-a-2faui-probe-reads-1.log`) — never 3. Held 1.5 s so both readers sit on the one
 *   in-flight read: exactly **1** in all 8 rounds (`[1,1,1,1,1,1,1,1]`), and a 502 or a dropped read exactly **3** held
 *   or not (`[3,3,3,3]` each, `s2-lane-a-2faui-probe-reads-3.log`, on the Security page and on the members page).
 *   Tests 10 and 12 therefore hold their failed status answers and pin the held numbers; the extra read is a
 *   mount-time read, never a third attempt (`use-two-factor-settings.ts:18-20` caps the hook's retries at 2).
 *
 * ## Console noise, reported not asserted
 *
 * `shield.consoleErrors()` is printed in every MEASURE line and asserted only where the app *must* stay silent (the
 * success paths). Refused reads are logged by the app itself (`[ERROR] [HttpClient] HTTP Error: GET /auth/two-factor…`,
 * asserted on the read-failure case, which is the opposite direction), and a dropped request adds the browser's own
 * `Failed to load resource` line, which `playwright/helpers.ts:30-44` already filters as noise (`fixtures.ts:104`
 * applies that list). One more line is excluded from the silence assertions, for its exact text only: React's dev-mode
 * `The result of getSnapshot should be cached to avoid an infinite loop` — shell store noise that this file cannot
 * attribute to any two-factor code (see `SHELL_STORE_NOISE` above; 1 hit in 8 runs here, and the committed
 * `suites/lane-a/reports-gate-by-role-ui.spec.ts:116-120` measured it in 40 of 215 MEASURE lines). It is still printed
 * in every MEASURE line, and every other console error the app logs still fails this file.
 * `shield.pageErrors()` (uncaught exceptions) was empty in every measurement in this file and is asserted on the
 * success paths.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const SECURITY_PATH = '/settings/personal/security';
const MEMBERS_PATH = '/settings/team/members';
const TWO_FACTOR_PREFIX = '/api/auth/two-factor';
const STATUS_PATH = TWO_FACTOR_PREFIX;
const ENROLL_PATH = `${TWO_FACTOR_PREFIX}/enroll`;
const CONFIRM_PATH = `${TWO_FACTOR_PREFIX}/confirm`;
const DISABLE_PATH = `${TWO_FACTOR_PREFIX}/disable`;
const RECOVERY_CODES_PATH = `${TWO_FACTOR_PREFIX}/recovery-codes`;

/**
 * `locales/en.json` again: `settings.entries` `:4682-4762`, `settings.members` from `:5455` and `settings.security`
 * `:6203-6261` — the key each string below is copied from is named on its own line.
 */
const PAGE_TITLE = 'Security'; // settings.entries.security.TITLE, locales/en.json:4760
const SETTINGS_NAV = 'Settings'; // common.SETTINGS, the settings sidebar's own accessible name
const SECTION_TITLE = 'Two-factor authentication'; // settings.security.SECTION_TITLE
const APP_LABEL = 'Authenticator app'; // settings.security.APP_LABEL
const ON = 'On'; // settings.security.ON
const OFF = 'Off'; // settings.security.OFF
const OFF_DESCRIPTION = 'Sign-ins ask only for your email code or your password.'; // settings.security.OFF_DESCRIPTION
const ON_SINCE = 'Sign-ins ask for a code from your authenticator app. On since Nov 14, 2026.'; // settings.security.ON_SINCE, with the stub's enabledAt
const TURN_ON = 'Turn on'; // settings.security.TURN_ON
const TURN_OFF = 'Turn off'; // settings.security.TURN_OFF
const CANCEL = 'Cancel'; // settings.security.CANCEL
const RETRY = 'Try again'; // settings.security.RETRY
const CODES_LABEL = 'Recovery codes'; // settings.security.CODES_LABEL
const CODES_LEFT_9 = '9 unused codes left'; // settings.security.CODES_LEFT, count 9
const CODES_LEFT_0 = 'No unused code left'; // settings.security.CODES_LEFT, count 0
const NEW_CODES = 'New recovery codes'; // settings.security.NEW_CODES
const SETUP_STEP_KEY = '1. Add this account to your authenticator app'; // settings.security.SETUP_STEP_KEY
const SETUP_STEP_CODE = '2. Enter the 6-digit code the app shows'; // settings.security.SETUP_STEP_CODE
const SETUP_KEY_LABEL = 'Setup key'; // settings.security.SETUP_KEY_LABEL
const COPY_KEY = 'Copy key'; // settings.security.COPY_KEY
const OPEN_IN_APP = 'Open in authenticator app'; // settings.security.OPEN_IN_APP
const QR_ALT = 'QR code of this account for your authenticator app'; // settings.security.QR_ALT
const CODE_INCOMPLETE = 'Enter all 6 digits of the code.'; // settings.security.CODE_INCOMPLETE
const TURNED_ON = 'Two-factor authentication is on'; // settings.security.TURNED_ON
const TURNED_OFF = 'Two-factor authentication is off'; // settings.security.TURNED_OFF
const CODES_TITLE = 'Your recovery codes'; // settings.security.CODES_TITLE
const CODES_TEXT =
	'Each code signs you in once if you lose your phone. Save them somewhere safe now: they are not shown again.'; // settings.security.CODES_TEXT
const COPY_CODES = 'Copy codes'; // settings.security.COPY_CODES
const DOWNLOAD_CODES = 'Download'; // settings.security.DOWNLOAD_CODES
const CODES_DONE = 'I saved my codes'; // settings.security.CODES_DONE
const TURN_OFF_PROOF = 'To turn it off, enter a code from your app or a recovery code'; // settings.security.TURN_OFF_PROOF
const NEW_CODES_PROOF =
	'To get new recovery codes, enter a code from your app or a recovery code. The current codes stop working.'; // settings.security.NEW_CODES_PROOF
const PROOF_HINT = 'A 6-digit code from your authenticator app, or one of your recovery codes.'; // settings.security.PROOF_HINT
const PROOF_PLACEHOLDER = '123456 or XXXX-XXXX-XXXX-XXXX'; // settings.security.PROOF_PLACEHOLDER
const PROOF_INCOMPLETE = 'Enter a 6-digit code or a whole recovery code.'; // settings.security.PROOF_INCOMPLETE
const WRONG_CODE = 'This code is not right. Enter the code your app shows now, or a recovery code.'; // settings.security.WRONG_CODE
const TOO_MANY_2 = 'Too many wrong codes. Try again in 2 minutes.'; // settings.security.TOO_MANY, minutes 2
const TOO_MANY_LATER = 'Too many wrong codes. Wait a few minutes, then try again.'; // settings.security.TOO_MANY_LATER
const CHANGED = 'Two-factor authentication changed meanwhile. Check it and try again.'; // settings.security.CHANGED
const FAILED = 'It could not be changed. Try again in a moment.'; // settings.security.FAILED
const UNAVAILABLE_TITLE = 'Not available on this server yet'; // settings.security.UNAVAILABLE_TITLE
const UNAVAILABLE_DESCRIPTION =
	'Two-factor authentication is not turned on for this server. Ask your administrator to turn it on.'; // settings.security.UNAVAILABLE_DESCRIPTION
const UNSUPPORTED_TITLE = 'Two-factor authentication is not available'; // settings.security.UNSUPPORTED_TITLE
const UNSUPPORTED_DESCRIPTION = 'This server does not offer two-factor authentication.'; // settings.security.UNSUPPORTED_DESCRIPTION
const READ_FAILED = 'Two-factor authentication could not be read'; // settings.security.READ_FAILED
const REQUIRED_TITLE = 'Your organization asks you to turn this on'; // settings.security.REQUIRED_TITLE
const REQUIRED_DESCRIPTION = 'Its members sign in with a code from an authenticator app as well.'; // settings.security.REQUIRED_DESCRIPTION
const SETUP_FAILED = 'Two-factor authentication could not be set up'; // settings.security.SETUP_FAILED
const RESET_TWO_FACTOR = 'Reset two-factor authentication'; // settings.members.RESET_TWO_FACTOR
const ROW_MENU = 'More actions for Fixture Teammate'; // settings.members.ROW_MENU, the teammate's row
const MUTATION_FALLBACK_TITLE = 'That change was not saved'; // toasts.MUTATION_FAILED, locales/en.json:4322
const MUTATION_FALLBACK_SESSION = 'Your session has ended. Sign in again to continue.'; // toasts.REASONS.SESSION, :4325
const MUTATION_FALLBACK_INVALID = 'Some values were not accepted. Check them and try again.'; // toasts.REASONS.INVALID, :4330
const MUTATION_FALLBACK_SERVER = 'The server could not complete it. Try again in a moment.'; // toasts.REASONS.SERVER, locales/en.json:4332

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1018-1027`), restated for every answer this spec writes. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** `ITwoFactorStatus` shapes (`core/types/interfaces/auth/two-factor.ts:10-23`), this file's own numbers. */
const STATUS_OFF = {
	available: true,
	enabled: false,
	enabledAt: null,
	pendingEnrollment: false,
	recoveryCodesLeft: 0,
	requiredByOrganization: false
};
const STATUS_ON = {
	available: true,
	enabled: true,
	enabledAt: '2026-11-14T12:00:00.000Z',
	pendingEnrollment: false,
	recoveryCodesLeft: 9,
	requiredByOrganization: false
};
/** `ITwoFactorEnrollment` (`:25-29`) and `ITwoFactorConfirmation` (`:43-45`), same. */
const ENROLLMENT = {
	secret: 'JBSWY3DPEHPK3PXP',
	otpauthUrl: 'otpauth://totp/Ever%20Teams:manager@example.test?secret=JBSWY3DPEHPK3PXP&issuer=Ever%20Teams'
};
const ENROLLMENT_GROUPS = 'JBSW Y3DP EHPK 3PXP'; // `secretGroupsOf`, two-factor.ts:124-126
const CONFIRMATION = {
	enabledAt: '2026-11-23T09:00:00.000Z',
	recoveryCodes: ['AAAA-BBBB-CCCC-DDDD', 'EEEE-FFFF-GGGG-HHHH']
};
const NEW_RECOVERY_CODES = { recoveryCodes: ['NNNN-PPPP-QQQQ-RRRR', 'SSSS-TTTT-UUUU-VVVV'] };
/** Gauzy's error shape, `{ statusCode, message }`; the 502 sentence is the proxy's own fallback text. */
const refusal = (status: number, message: string, extra: Record<string, unknown> = {}) => ({
	status,
	body: { statusCode: status, message, ...extra }
});

/**
 * `holdUntil` keeps a request in flight until the spec releases it (test 11); `holdMs` keeps it in flight for a fixed
 * span, which is how test 10 and test 12 make two readers of the same query key share one read (see the header's
 * "two readers, one query key" limit).
 */
type StubAnswer = {
	status?: number;
	body?: unknown;
	abort?: boolean;
	holdUntil?: Promise<void>;
	holdMs?: number;
};
type TwoFactorRequest = { method: string; path: string; body: string | null; url: string };

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a 2fa-ui] MEASURE ${label} ${JSON.stringify(value)}`);

/**
 * React's own dev-mode store warning, in the app's shell rather than on any two-factor path: it appears in other
 * specs' lane logs too (`s2-lane-a-reports-3.log` … `-8.log`, `s2-lane-a-export-probe-8.log`) and in 40 of the 215
 * `MEASURE` lines of the committed `suites/lane-a/reports-gate-by-role-ui.spec.ts` (its :116-120), which calls it
 * store noise of a `useSyncExternalStore` subscriber in the shell. This file could not name the subscriber: the
 * snapshot functions it read are all cached (`use-hotkeys.ts:47-49`, `use-tab-organization.ts:79`,
 * `use-ai-config.ts:36-41`, `use-docs-live.ts:197-200`), and a probe that captured a stack at `console.error` over 32
 * loads of `/settings/personal/security` caught nothing (`s2-lane-a-2faui-probe-snapshot-1.log`). Measured here: 1 hit
 * in the eight runs of this file up to `s2-lane-a-2faui-8.log` (its test 2). It is printed in every `MEASURE` line (they report
 * `shield.consoleErrors()` whole) and excluded from the silence assertions for **this exact string only** — every other
 * console error the app logs still fails this file.
 */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** What the silence assertions are allowed to be empty about: everything the app logged except that one warning. */
const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));

/**
 * This spec's own answers for every `/api/auth/two-factor*` call, as a queue per `METHOD path`, plus the browser's
 * requests as it sent them (method, path, JSON body) — see the header for why the answers are stubs.
 */
async function stubTwoFactor(page: Page, script: Record<string, StubAnswer[]>) {
	const requests: TwoFactorRequest[] = [];
	const answered: Record<string, number> = {};
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(TWO_FACTOR_PREFIX);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const pathname = new URL(request.url()).pathname;
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		requests.push({ method, path: pathname, body: request.postData(), url: request.url() });
		const key = `${method} ${pathname}`;
		const answers = script[key];
		if (!answers || answers.length === 0) {
			return route.fulfill({
				status: 599,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify({ message: `this spec scripted no answer for ${key}` })
			});
		}
		const index = answered[key] ?? 0;
		answered[key] = index + 1;
		const answer = answers[Math.min(index, answers.length - 1)];
		// The fixed hold comes first, so a `holdMs` + `abort` answer is a request that hung and then dropped — dropped
		// before any reader could still be waiting on it, which is a different outage from a held one.
		if (answer.holdMs) await new Promise((done) => setTimeout(done, answer.holdMs));
		if (answer.abort) return route.abort('failed');
		if (answer.holdUntil) await answer.holdUntil;
		return route.fulfill({
			status: answer.status ?? 200,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: answer.body === undefined ? '' : JSON.stringify(answer.body)
		});
	});

	return {
		requests,
		/** The browser's calls of one two-factor path, as `METHOD path body`. */
		shapes: (path: string) =>
			requests.filter((call) => call.path === path).map((call) => [call.method, call.path, call.body]),
		countOf: (path: string) => requests.filter((call) => call.path === path).length,
		uninstall: () => page.unroute(matcher)
	};
}

/** Only the request listener: what the browser sent when nothing of this spec answers it. */
function recordTwoFactorRequests(page: Page): TwoFactorRequest[] {
	const requests: TwoFactorRequest[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(TWO_FACTOR_PREFIX)) {
			requests.push({
				method: request.method(),
				path: url.pathname,
				body: request.postData(),
				url: request.url()
			});
		}
	});
	return requests;
}

const section = (page: Page) => page.locator('#two-factor');
const text = (page: Page, value: string) => page.getByText(value, { exact: true });
/**
 * The Security entry of the settings sidebar (`settings-nav.tsx:123` gives that nav its name from
 * `common.SETTINGS`), which is what `useHiddenSettingsEntries` adds or leaves out. Measured: the settings page *also*
 * draws a `navigation "breadcrumb"` whose last crumb is a link named "Security" for the page it is showing, and the
 * hidden-entry rule never touches that crumb — an unscoped link count on `/settings/personal/security` therefore
 * reports the crumb, not the entry (measured in `s2-lane-a-2faui-2.log`, test 10's 404 case).
 */
const settingsNavEntry = (page: Page) =>
	page
		.getByRole('navigation', { name: SETTINGS_NAV, exact: true })
		.getByRole('link', { name: PAGE_TITLE, exact: true });
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const sectionText = async (page: Page) => flat(await section(page).innerText());
const sectionButtons = async (page: Page) => (await section(page).getByRole('button').allInnerTexts()).map(flat);
const toastTexts = async (page: Page) => (await page.locator('[data-sonner-toast]').allInnerTexts()).map(flat);
const alertTexts = async (page: Page) => (await page.getByRole('alert').allInnerTexts()).map(flat);
const codeField = (page: Page) => page.getByPlaceholder('000000');
const proofField = (page: Page) => page.getByPlaceholder(PROOF_PLACEHOLDER);
/**
 * The panel's own form. `panel.kind` renders one panel at a time (`security-settings-page.tsx:209-239`), and each of
 * them holds exactly one field (`two-factor-parts.tsx:188-211`, `:300-330`), so a form is found by the field it is the
 * only one to carry. Its buttons are then taken from inside that form, because a proof panel's confirm shares the row
 * button's name: with the turn-off panel open, two buttons read "Turn off" (the row's `:75-77` and the panel's
 * `two-factor-parts.tsx:322-324` fed by `security-settings-page.tsx:221`) — measured in the probe run.
 */
const setupForm = (page: Page) => page.locator('form').filter({ has: codeField(page) });
const proofForm = (page: Page) => page.locator('form').filter({ has: proofField(page) });
const downloads = (page: Page) => {
	const saved: Array<{ fileName: string; url: string }> = [];
	page.on('download', (download) => saved.push({ fileName: download.suggestedFilename(), url: download.url() }));
	return saved;
};

/**
 * The two-factor calls the browser sent, sampled `tries` times `intervalMs` apart. This is how "nothing was sent
 * twice" is measured: one read only proves the count at one instant (`workspace-data-export.spec.ts:295-310`).
 */
async function sampleWhileWatching(countOf: (path: string) => number, path: string, tries = 5, intervalMs = 400) {
	const samples: number[] = [];
	for (let attempt = 0; attempt < tries; attempt += 1) {
		samples.push(countOf(path));
		await new Promise((done) => setTimeout(done, intervalMs));
	}
	return samples;
}

/** The toast count, sampled the same way: a fallback toast that arrives late is still counted (`tests 5 and 7`). */
async function watchToastCounts(page: Page, tries = 5, intervalMs = 400) {
	const samples: number[] = [];
	for (let attempt = 0; attempt < tries; attempt += 1) {
		samples.push(await page.locator('[data-sonner-toast]').count());
		await new Promise((done) => setTimeout(done, intervalMs));
	}
	return samples;
}

const NO_EXTRA: MockScenario = {};
const USERS_EDIT: MockScenario = { extraPermissions: ['ORG_USERS_EDIT'] };

test.describe('lane-a · Settings › Personal › Security: what two-factor authentication shows and sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// -------------------------------------- 1. what the mock really answers, and what the page makes of it

	test('1 · the mock answers no two-factor route: the page says this server does not offer it, and offers no setup', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = recordTwoFactorRequests(page);

		await signInAndVisit(page, fixture, SECURITY_PATH);
		await expect(
			page.getByRole('heading', { level: 1, name: PAGE_TITLE }),
			'Settings › Security rendered no page title'
		).toBeVisible({ timeout: 25_000 });

		// `{ items: [], total: 0 }` (mock-gauzy-server.mjs:827) has no `available` → security-settings-page.tsx:177, :188-194
		await expect(
			text(page, UNAVAILABLE_TITLE),
			'the mock gave no `available`, and the page did not say so'
		).toBeVisible();
		await expect(text(page, UNAVAILABLE_DESCRIPTION)).toBeVisible();
		await expect(text(page, OFF), 'a status this mock wrote still read as enabled').toHaveCount(1);
		await expect(text(page, ON), 'the mock answer was read as "on"').toHaveCount(0);
		await expect(
			section(page).getByRole('button', { name: TURN_ON, exact: true }),
			'a server the page cannot read offered a setup'
		).toHaveCount(0);
		await expect(await sectionButtons(page), 'the page offered something to click').toEqual([]);

		expect(
			requests.map((call) => [call.method, call.path, new URL(call.url).searchParams.toString()]),
			'the status read the browser sent was not exactly one GET of the mock with this organization'
		).toEqual([['GET', STATUS_PATH, `organizationId=${fixture.ids.organizationA}`]]);
		expect(await mock.calls(TWO_FACTOR_PREFIX), 'the mock did not log exactly the read the page sent').toHaveLength(
			1
		);
		expect(
			await mock.calls(TWO_FACTOR_PREFIX),
			'the unstubbed read did not come back 200 from the mock fallback'
		).toEqual([expect.objectContaining({ method: 'GET', path: STATUS_PATH, status: 200 })]);

		expect(consoleFindings(shield), 'the page logged a console error on a state it could read').toEqual([]);
		report('1 the mock alone', {
			url: new URL(page.url()).pathname,
			sectionText: await sectionText(page),
			browserRequests: requests,
			mockCalls: await mock.calls(TWO_FACTOR_PREFIX),
			consoleErrors: shield.consoleErrors()
		});
	});

	// -------------------------------------- 2. off, and the two notices around it

	test('2 · off: the row, the Off badge and exactly one Turn on button — plus what requiredByOrganization and available:false add', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const cases: Array<{ label: string; status: Record<string, unknown>; turnOn: number; notices: string[] }> = [
			{ label: 'off', status: STATUS_OFF, turnOn: 1, notices: [] },
			{
				label: 'off, the organization requires it',
				status: { ...STATUS_OFF, requiredByOrganization: true },
				turnOn: 1,
				notices: [REQUIRED_TITLE, REQUIRED_DESCRIPTION]
			},
			{
				label: 'off, the server cannot keep secrets',
				status: { ...STATUS_OFF, available: false },
				turnOn: 0,
				notices: [UNAVAILABLE_TITLE, UNAVAILABLE_DESCRIPTION]
			},
			{
				label: 'off, required and unavailable',
				status: { ...STATUS_OFF, available: false, requiredByOrganization: true },
				turnOn: 0,
				notices: [REQUIRED_TITLE, UNAVAILABLE_TITLE]
			}
		];

		for (const one of cases) {
			await mockReset();
			const stub = await stubTwoFactor(page, { [`GET ${STATUS_PATH}`]: [{ status: 200, body: one.status }] });
			await signInAndVisit(page, fixture, SECURITY_PATH);
			await expect(
				page.getByRole('heading', { level: 2, name: SECTION_TITLE }),
				`${one.label}: the two-factor section never rendered`
			).toBeVisible({ timeout: 25_000 });

			await expect(text(page, APP_LABEL), `${one.label}: no authenticator row`).toBeVisible();
			await expect(text(page, OFF_DESCRIPTION), `${one.label}: the off row said something else`).toHaveCount(1);
			await expect(text(page, OFF), `${one.label}: no Off badge`).toHaveCount(1);
			await expect(text(page, ON), `${one.label}: read as enabled`).toHaveCount(0);
			await expect(
				section(page).getByRole('button', { name: TURN_ON, exact: true }),
				`${one.label}: the Turn on button does not match the measured offer`
			).toHaveCount(one.turnOn);
			for (const notice of one.notices) {
				await expect(text(page, notice), `${one.label}: the page showed no ${notice}`).toBeVisible();
			}
			for (const other of [REQUIRED_TITLE, UNAVAILABLE_TITLE].filter((n) => !one.notices.includes(n))) {
				await expect(text(page, other), `${one.label}: a notice appeared that nothing armed`).toHaveCount(0);
			}
			expect(await mock.calls(TWO_FACTOR_PREFIX), `${one.label}: a stubbed read reached the mock`).toEqual([]);
			expect(await stub.shapes(ENROLL_PATH), `${one.label}: a setup ran although nobody clicked`).toEqual([]);

			expect(
				consoleFindings(shield),
				`${one.label}: the page logged a console error for a state it read`
			).toEqual([]);
			report(`2 ${one.label}`, {
				status: one.status,
				sectionText: await sectionText(page),
				buttons: await sectionButtons(page),
				browserStatusReads: stub.countOf(STATUS_PATH),
				mockCalls: await mock.calls(TWO_FACTOR_PREFIX),
				consoleErrors: shield.consoleErrors()
			});
			await stub.uninstall();
		}
	});

	// -------------------------------------- 3. enroll: the key, the QR, the link, and the field that is asked for

	test('3 · enroll: one POST with the app name, then the key, its QR, the link and the 6-digit field', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const stub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [{ status: 200, body: STATUS_OFF }],
			[`POST ${ENROLL_PATH}`]: [{ status: 200, body: ENROLLMENT }]
		});
		const qr = page.getByRole('img', { name: QR_ALT });

		await signInAndVisit(page, fixture, SECURITY_PATH);
		await expect(section(page).getByRole('button', { name: TURN_ON, exact: true })).toBeVisible({
			timeout: 25_000
		});
		await section(page).getByRole('button', { name: TURN_ON, exact: true }).click();

		await expect(text(page, SETUP_STEP_KEY), 'the setup never showed its first step').toBeVisible();
		await expect(text(page, ENROLLMENT_GROUPS), 'the setup key is not the secret in groups of four').toHaveCount(1);
		const keyBox = section(page).locator(`code[aria-label="${SETUP_KEY_LABEL}"]`);
		await expect(keyBox, 'the setup key has no name of its own to be read out').toHaveCount(1);
		await expect(keyBox, 'the named setup key is not the grouped secret').toHaveText(ENROLLMENT_GROUPS);
		await expect(qr, 'no QR for the setup address').toBeVisible();
		const src = await qr.getAttribute('src');
		expect(src ?? '', 'the QR is not the SVG data URL the app draws').toMatch(
			/^data:image\/svg\+xml;charset=utf-8,/
		);
		expect(await qr.getAttribute('width'), 'the QR is not the 160 px tile').toBe('160');
		const setupLink = page.getByRole('link', { name: OPEN_IN_APP });
		await expect(setupLink, 'the setup link is not the answered address').toHaveAttribute(
			'href',
			ENROLLMENT.otpauthUrl
		);
		await expect(text(page, SETUP_STEP_CODE), 'no 6-digit step was asked for').toBeVisible();
		await expect(codeField(page)).toBeVisible();
		await expect(section(page).getByRole('button', { name: COPY_KEY, exact: true })).toHaveCount(1);

		// The client-side guard runs before any request: five digits are refused on the page (`two-factor-parts.tsx:138-146`).
		await codeField(page).fill('12345');
		await setupForm(page).getByRole('button', { name: TURN_ON, exact: true }).click();
		await expect(text(page, CODE_INCOMPLETE), 'an incomplete code was not refused on the page').toBeVisible();
		expect(
			await sampleWhileWatching(stub.countOf, ENROLL_PATH),
			'an incomplete code still asked for a setup'
		).toEqual([1, 1, 1, 1, 1]);

		expect(consoleFindings(shield), 'the setup page logged a console error').toEqual([]);
		report('3 enroll', {
			enrollBody: stub.shapes(ENROLL_PATH),
			statusReads: stub.countOf(STATUS_PATH),
			qrSrcPrefix: (src ?? '').slice(0, 60),
			qrSrcLength: (src ?? '').length,
			panelText: await sectionText(page),
			alert: await alertTexts(page),
			mockCalls: await mock.calls(TWO_FACTOR_PREFIX),
			consoleErrors: shield.consoleErrors()
		});
	});

	// -------------------------------------- 4. confirm: the codes shown once, and gone on reload

	test('4 · confirm: one POST with the typed code, the recovery codes once, then gone for good on reload', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const saved = downloads(page);
		const stub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [
				{ status: 200, body: STATUS_OFF },
				{ status: 200, body: { ...STATUS_ON, recoveryCodesLeft: CONFIRMATION.recoveryCodes.length } }
			],
			[`POST ${ENROLL_PATH}`]: [{ status: 200, body: ENROLLMENT }],
			[`POST ${CONFIRM_PATH}`]: [{ status: 200, body: CONFIRMATION }]
		});

		await signInAndVisit(page, fixture, SECURITY_PATH);
		await section(page).getByRole('button', { name: TURN_ON, exact: true }).click();
		await expect(text(page, SETUP_STEP_CODE)).toBeVisible({ timeout: 15_000 });
		await codeField(page).fill('123456');
		await setupForm(page).getByRole('button', { name: TURN_ON, exact: true }).click();

		await expect(text(page, CODES_TITLE), 'the recovery codes were never shown').toBeVisible({ timeout: 15_000 });
		await expect(text(page, CODES_TEXT)).toBeVisible();
		await expect(text(page, CONFIRMATION.recoveryCodes[0])).toHaveCount(1);
		await expect(text(page, CONFIRMATION.recoveryCodes[1])).toHaveCount(1);
		await expect(section(page).getByRole('button', { name: COPY_CODES, exact: true })).toHaveCount(1);
		await section(page).getByRole('button', { name: DOWNLOAD_CODES, exact: true }).click();
		expect(
			saved.map((download) => download.fileName),
			'the codes were not saved under one file name'
		).toEqual(['ever-teams-recovery-codes.txt']);
		await expect(page.locator('[data-sonner-toast]'), 'the confirmation said more than once').toHaveCount(1);
		await expect(text(page, TURNED_ON)).toBeVisible();
		expect(shield.pageErrors(), 'turning it on threw in the page').toEqual([]);

		// The row can only say "On since …" once the re-read the successful write triggered has landed
		// (use-two-factor-settings.ts:72, security-settings-page.tsx:63-68), so the visible row proves the count below.
		await expect(text(page, ON_SINCE), 'the row did not switch to the re-read "on" state').toBeVisible();
		expect(stub.countOf(STATUS_PATH), 'the state was read more than once after one accepted code').toBe(2);

		await section(page).getByRole('button', { name: CODES_DONE, exact: true }).click();
		await expect(text(page, CODES_TITLE), 'the codes stayed after being acknowledged').toHaveCount(0);

		const beforeReload = stub.requests.length;
		await signInAndVisit(page, fixture, SECURITY_PATH);
		await expect(text(page, ON), 'the page forgot that it is on').toBeVisible();
		expect(stub.countOf(STATUS_PATH), 'the reload read the state more than once').toBe(3);
		await expect(
			text(page, CONFIRMATION.recoveryCodes[0]),
			'the recovery codes came back after a reload'
		).toHaveCount(0);
		await expect(text(page, CONFIRMATION.recoveryCodes[1])).toHaveCount(0);
		await expect(text(page, CODES_TITLE), 'the codes panel came back').toHaveCount(0);
		expect(
			stub.requests.slice(beforeReload).map((call) => `${call.method} ${call.path}`),
			'the reload fetched recovery codes instead of only the state'
		).toEqual([`GET ${STATUS_PATH}`]);
		expect(await mock.calls(TWO_FACTOR_PREFIX), 'a stubbed call reached the mock').toEqual([]);
		const codesAfterReload = [
			await text(page, CONFIRMATION.recoveryCodes[0]).count(),
			await text(page, CONFIRMATION.recoveryCodes[1]).count()
		];

		expect(consoleFindings(shield), 'turning two-factor authentication on logged a console error').toEqual([]);
		report('4 confirm and codes', {
			enrollBody: stub.shapes(ENROLL_PATH),
			confirmBody: stub.shapes(CONFIRM_PATH),
			statusReads: stub.countOf(STATUS_PATH),
			downloads: saved,
			toasts: await toastTexts(page),
			codesOnScreenAfterReload: codesAfterReload,
			sectionAfterReload: await sectionText(page),
			pageErrors: shield.pageErrors(),
			consoleErrors: shield.consoleErrors()
		});
	});

	// -------------------------------------- 5. a refused code

	test('5 · a refused code: the sentence under the field, the setup still open, nothing switched on, the session kept', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const stub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [{ status: 200, body: STATUS_OFF }],
			[`POST ${ENROLL_PATH}`]: [{ status: 200, body: ENROLLMENT }],
			[`POST ${CONFIRM_PATH}`]: [refusal(401, 'Invalid two-factor code'), refusal(400, 'Validation failed')]
		});
		// What each refusal left as toasts, sampled rather than read once (see the loop).
		const refusalToasts: Record<string, { toastSamples: number[]; toastLines: string[]; fallbackLines: string[] }> =
			{};

		await signInAndVisit(page, fixture, SECURITY_PATH);
		await section(page).getByRole('button', { name: TURN_ON, exact: true }).click();
		await expect(text(page, SETUP_STEP_CODE)).toBeVisible({ timeout: 15_000 });

		for (const [label, code, expectedReason] of [
			['401', '123456', MUTATION_FALLBACK_SESSION],
			['400', '654321', MUTATION_FALLBACK_INVALID]
		]) {
			await codeField(page).fill(code);
			await setupForm(page).getByRole('button', { name: TURN_ON, exact: true }).click();
			await expect(text(page, WRONG_CODE), `${label}: no wrong-code sentence`).toBeVisible();
			await expect(text(page, TOO_MANY_LATER), `${label}: the wrong-code refusal read as too many`).toHaveCount(
				0
			);
			await expect(text(page, FAILED), `${label}: the wrong-code refusal read as an outage`).toHaveCount(0);
			// The panel keeps everything it showed (security-settings-page.tsx:113-122 only clears `error`)
			await expect(text(page, ENROLLMENT_GROUPS), `${label}: the setup key disappeared`).toBeVisible();
			await expect(codeField(page), `${label}: the typed code left the field`).toHaveValue(code);
			// Nothing switched to enabled. While a panel is open the section shows the panel *instead of* any row
			// (`security-settings-page.tsx:203-208`), so "still off" is measured as: no `On` badge, no recovery codes,
			// no status re-read (below), and the `Off` row coming back when the panel closes (below).
			await expect(text(page, ON), `${label}: the page switched to enabled anyway`).toHaveCount(0);
			await expect(text(page, CODES_TITLE), `${label}: a refused code answered recovery codes`).toHaveCount(0);
			// Toasts are sampled 5 times over 2 s: read once, the count answered 0 on the instant before the app's
			// global fallback toast had been painted (`s2-lane-a-2faui-2.log`); sampled, it is 2 the whole way
			// (`s2-lane-a-2faui-toasts.log`): the dev-mode diagnostic (`common/dev-error-toaster.tsx:17`) and the
			// fallback (`common/mutation-error-toaster.tsx:53-56`, one toast, replaced by its fixed id at `:12`).
			// MEASURED, NOT INTENDED (header): the fallback calls a refused code a lost session —
			// `toasts.REASONS.SESSION` for a 401 (`error-feedback.ts:153-156`) — while this call was made with
			// `expectedUnauthorized` exactly so it could not (`two-factor.service.ts:16-17`, `axios.ts:19-20`,
			// `api.service.ts:276-281`), and the measurements below show the session was not lost.
			const toastSamples = await watchToastCounts(page);
			const toastLines = await toastTexts(page);
			const fallbackLines = toastLines.filter((line) => line.startsWith(MUTATION_FALLBACK_TITLE));
			refusalToasts[label] = { toastSamples, toastLines, fallbackLines };
			console.log(`[lane-a 2fa-ui] MEASURE 5 ${label}`, JSON.stringify(refusalToasts[label]));
			expect(fallbackLines, `${label}: the fallback toast was not exactly one, with the measured reason`).toEqual(
				[`${MUTATION_FALLBACK_TITLE} ${expectedReason}`]
			);
			expect(
				toastSamples.filter((count) => count > 0).length,
				`${label}: the refusal toasts were not up at every sample: ${JSON.stringify(toastSamples)}`
			).toBe(toastSamples.length);
		}

		// Closing the setup brings the off row back, unchanged: the refusals changed nothing about the state.
		const fieldAfterRefusals = await codeField(page).inputValue();
		await setupForm(page).getByRole('button', { name: CANCEL, exact: true }).click();
		await expect(text(page, OFF), 'closing the setup did not bring the Off row back').toHaveCount(1);
		await expect(
			section(page).getByRole('button', { name: TURN_ON, exact: true }),
			'a page that refused both codes no longer offers the setup'
		).toHaveCount(1);
		await expect(text(page, WRONG_CODE), 'the refused code sentence stayed after Cancel').toHaveCount(0);

		expect(stub.shapes(CONFIRM_PATH), 'the confirm calls are not the two codes this spec typed').toEqual([
			['POST', CONFIRM_PATH, '{"code":"123456"}'],
			['POST', CONFIRM_PATH, '{"code":"654321"}']
		]);
		expect(stub.countOf(STATUS_PATH), 'a refused code read the state again').toBe(1);
		expect(await mock.calls('/api/auth/refresh-token'), 'a refused code renewed the session').toEqual([]);
		expect(await mock.calls('/api/auth/switch-organization'), 'a refused code switched organization').toEqual([]);
		expect(new URL(page.url()).pathname, 'a refused code threw the person off the page').toBe(SECURITY_PATH);

		report('5 refused code', {
			confirmBody: stub.shapes(CONFIRM_PATH),
			statusReads: stub.countOf(STATUS_PATH),
			alert: await alertTexts(page),
			fieldKeptAfterRefusals: fieldAfterRefusals,
			sectionAfterCancel: await sectionText(page),
			refusalToasts,
			refreshCalls: (await mock.calls('/api/auth/refresh-token')).length,
			consoleErrors: shield.consoleErrors()
		});
	});

	// -------------------------------------- 6. too many codes

	test('6 · too many codes: its own sentence, with the wait when the answer names one', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const stub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [{ status: 200, body: STATUS_OFF }],
			[`POST ${ENROLL_PATH}`]: [{ status: 200, body: ENROLLMENT }],
			[`POST ${CONFIRM_PATH}`]: [
				refusal(429, 'Too many attempts', { retryAfter: 120 }),
				refusal(429, 'Too many attempts'),
				refusal(429, 'Too many attempts', { retryAfter: 1 })
			]
		});

		await signInAndVisit(page, fixture, SECURITY_PATH);
		await section(page).getByRole('button', { name: TURN_ON, exact: true }).click();
		await expect(text(page, SETUP_STEP_CODE)).toBeVisible({ timeout: 15_000 });

		// 120 s → 2 minutes, 1 s → 1 minute: `retryAfterSecondsOf` + `retryMinutesOf` (two-factor.ts:98-121)
		for (const [label, expected] of [
			['retryAfter 120', TOO_MANY_2],
			['no retryAfter', TOO_MANY_LATER],
			['retryAfter 1', 'Too many wrong codes. Try again in 1 minute.']
		] as const) {
			await codeField(page).fill('123456');
			await setupForm(page).getByRole('button', { name: TURN_ON, exact: true }).click();
			await expect(text(page, expected), `${label}: the wait was not shown as measured`).toBeVisible();
			await expect(text(page, WRONG_CODE), `${label}: read as one bad code`).toHaveCount(0);
		}

		expect(stub.countOf(CONFIRM_PATH), 'too many codes was asked more times than answered').toBe(3);
		expect(stub.countOf(STATUS_PATH), 'a 429 read the state again').toBe(1);
		expect(await mock.calls(TWO_FACTOR_PREFIX), 'a stubbed 429 reached the mock').toEqual([]);

		report('6 too many codes', {
			alerts: await alertTexts(page),
			confirmCalls: stub.countOf(CONFIRM_PATH),
			statusReads: stub.countOf(STATUS_PATH),
			consoleErrors: shield.consoleErrors()
		});
	});

	// -------------------------------------- 7. an outage: 502, 503, and a request that got no answer

	test('7 · an outage: 502 says "it could not be changed", a 503 and a request that got no answer both say the server does not offer it, and the server\'s own sentence stays off screen', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const proxySentence = 'Two-factor authentication could not be changed.'; // two-factor-proxy.ts:92
		// What each outage left on screen: the sentence under the field, and the toasts that were up at that moment
		// (the app's global mutation fallback toasts too — `mutation-error-toaster.tsx:36-57`).
		const outageToasts: Record<string, { alert: string; toasts: string[]; toastSamples: number[] }> = {};
		const stub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [{ status: 200, body: STATUS_OFF }],
			[`POST ${ENROLL_PATH}`]: [{ status: 200, body: ENROLLMENT }],
			[`POST ${CONFIRM_PATH}`]: [
				refusal(502, proxySentence),
				{ abort: true },
				refusal(503, 'Two-factor authentication is not configured on this server')
			]
		});

		await signInAndVisit(page, fixture, SECURITY_PATH);
		await section(page).getByRole('button', { name: TURN_ON, exact: true }).click();
		await expect(text(page, SETUP_STEP_CODE)).toBeVisible({ timeout: 15_000 });

		for (const [label, expected] of [
			['502', FAILED],
			// MEASURED, NOT INTENDED: a request that never got an answer is shown as the server not offering
			// two-factor authentication at all. The browser fails the request (`ERR_NETWORK`), `ApiErrorService` stamps
			// that with 503 (`api-error.service.ts:19`, `:45-49`, used at `:272-279`), and 503 is the `unavailable`
			// kind (`two-factor.ts:202-204`), whose sentence is the same one the page shows when the API really has no
			// two-factor routes (`two-factor-parts.tsx:37-39` → `security-settings-page.tsx:188-194`). The library's own
			// unit test wants the opposite for a request with no answer (`two-factor.test.ts:162`, `failed`), and the
			// sign-in code step reads the same 503 as `failed` (`two-factor.ts:155-176`, no 503 branch).
			['no answer', UNAVAILABLE_DESCRIPTION],
			['503', UNAVAILABLE_DESCRIPTION]
		] as const) {
			await codeField(page).fill('123456');
			await setupForm(page).getByRole('button', { name: TURN_ON, exact: true }).click();
			const alertLine = section(page).getByRole('alert');
			await expect(alertLine, `${label}: the outage said nothing under the code field`).toBeVisible();
			const alertShown = flat(await alertLine.innerText());
			const toastsShown = await toastTexts(page);
			outageToasts[label] = {
				alert: alertShown,
				toasts: toastsShown,
				toastSamples: await watchToastCounts(page)
			};
			console.log(`[lane-a 2fa-ui] MEASURE 7 ${label}`, JSON.stringify(outageToasts[label]));
			expect(alertShown, `${label}: the outage was not explained as measured`).toBe(expected);
			// The global fallback spoke too, with the reason its own map gives a 502/503 (`error-feedback.ts:173-175`
			// → `toasts.REASONS.SERVER`), one toast replaced by its fixed id (`mutation-error-toaster.tsx:12`).
			expect(
				toastsShown.filter((line) => line.startsWith(MUTATION_FALLBACK_TITLE)),
				`${label}: the fallback toast was not the measured title and reason`
			).toEqual([`${MUTATION_FALLBACK_TITLE} ${MUTATION_FALLBACK_SERVER}`]);
			await expect(text(page, proxySentence), `${label}: the server's own sentence was shown`).toHaveCount(0);
			await expect(text(page, ON), `${label}: an outage switched it on`).toHaveCount(0);
			await expect(text(page, ENROLLMENT_GROUPS), `${label}: the setup closed on an outage`).toBeVisible();
		}

		expect(stub.countOf(CONFIRM_PATH), 'an outage was retried by the page').toBe(3);
		expect(stub.countOf(STATUS_PATH), 'an outage made the page read the state again').toBe(1);

		// A failed *start* of the setup is a toast, not a field error (security-settings-page.tsx:103-111)
		await stub.uninstall();
		const enrollStub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [{ status: 200, body: STATUS_OFF }],
			[`POST ${ENROLL_PATH}`]: [refusal(502, proxySentence)]
		});
		await signInAndVisit(page, fixture, SECURITY_PATH);
		await section(page).getByRole('button', { name: TURN_ON, exact: true }).click();
		await expect(text(page, SETUP_FAILED), 'a refused enroll said nothing').toBeVisible({ timeout: 15_000 });
		await expect(text(page, FAILED), 'the refused enroll toast had no reason').toBeVisible();
		await expect(text(page, SETUP_STEP_KEY), 'a refused enroll left the setup open').toHaveCount(0);
		await expect(text(page, OFF), 'a refused enroll lost the Off row').toHaveCount(1);
		expect(enrollStub.countOf(ENROLL_PATH), 'a refused enroll was retried by the page').toBe(1);

		// On top of the page's own toast, the app's global mutation fallback spoke too: none of the four settings
		// mutations has an `onError` or `meta.handlesOwnError`, so `MutationErrorToaster` adds its own translated
		// title and reason (`mutation-error-toaster.tsx:23-30`, `:53-56`; `core/query/config/index.ts:33-34` explains
		// why there is no default `onError`). Measured beside it, in the same burst, a dev-only
		// `DEV Mutation failed useTwoFactorSettings.useMutation[enroll] 502 …` toast (`common/dev-error-toaster.tsx`).
		await expect(
			text(page, MUTATION_FALLBACK_TITLE),
			'the global mutation fallback did not speak for a write nobody handled'
		).toBeVisible();
		await expect(text(page, MUTATION_FALLBACK_SERVER), 'the fallback toast gave no reason').toBeVisible();

		report('7 outage', {
			confirmBodies: stub.shapes(CONFIRM_PATH),
			statusReadsAfterConfirmFailures: stub.countOf(STATUS_PATH),
			enrollBodies: enrollStub.shapes(ENROLL_PATH),
			outageToasts,
			toasts: await toastTexts(page),
			sectionText: await sectionText(page),
			mockCalls: await mock.calls(TWO_FACTOR_PREFIX),
			consoleErrors: shield.consoleErrors().filter((line) => /two-factor/.test(line))
		});
	});

	// -------------------------------------- 8. on: the rows, and the proof every change asks for

	test('8 · on: the rows and their counts, and turning it off with a code, with a recovery code, and when a code is refused', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// ---------------------------------------------- 8a. the on rows, both plurals of the codes count
		for (const [count, description] of [
			[9, CODES_LEFT_9],
			[0, CODES_LEFT_0]
		] as const) {
			await mockReset();
			const stub = await stubTwoFactor(page, {
				[`GET ${STATUS_PATH}`]: [{ status: 200, body: { ...STATUS_ON, recoveryCodesLeft: count } }]
			});
			await signInAndVisit(page, fixture, SECURITY_PATH);
			await expect(
				text(page, ON_SINCE),
				`codes left ${count}: the row never said when it was turned on`
			).toBeVisible({
				timeout: 25_000
			});
			await expect(text(page, ON), `codes left ${count}: no On badge`).toHaveCount(1);
			await expect(text(page, OFF), `codes left ${count}: an enabled account read as off`).toHaveCount(0);
			await expect(text(page, CODES_LABEL), `codes left ${count}: no recovery-codes row`).toBeVisible();
			await expect(text(page, description), `codes left ${count}: the count read wrong`).toHaveCount(1);
			await expect(section(page).getByRole('button', { name: TURN_OFF, exact: true })).toHaveCount(1);
			await expect(section(page).getByRole('button', { name: NEW_CODES, exact: true })).toHaveCount(1);
			expect(consoleFindings(shield), `codes left ${count}: the on rows logged a console error`).toEqual([]);
			report(`8a on rows, codes left ${count}`, {
				sectionText: await sectionText(page),
				statusReads: stub.countOf(STATUS_PATH),
				consoleErrors: shield.consoleErrors()
			});
			await stub.uninstall();
		}

		const stub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [
				{ status: 200, body: STATUS_ON },
				{ status: 200, body: STATUS_OFF },
				{ status: 200, body: STATUS_ON },
				{ status: 200, body: STATUS_OFF },
				{ status: 200, body: STATUS_ON }
			],
			[`POST ${DISABLE_PATH}`]: [
				{ status: 200, body: STATUS_OFF },
				{ status: 200, body: STATUS_OFF },
				refusal(401, 'Invalid two-factor code')
			]
		});

		// ---------------------------------------------- 8b. off again, proven with a six-digit code
		await signInAndVisit(page, fixture, SECURITY_PATH);
		await expect(section(page).getByRole('button', { name: TURN_OFF, exact: true })).toBeVisible({
			timeout: 25_000
		});
		await section(page).getByRole('button', { name: TURN_OFF, exact: true }).click();
		await expect(text(page, TURN_OFF_PROOF), 'turning it off asked for no proof').toBeVisible();
		await expect(text(page, PROOF_HINT), 'the proof form does not say what it accepts').toBeVisible();
		await expect(proofField(page)).toHaveAttribute('placeholder', PROOF_PLACEHOLDER);
		// Both buttons of the open panel are disabled while it is closed-pending… they are enabled until a request runs
		await expect(proofForm(page).getByRole('button', { name: CANCEL, exact: true })).toBeEnabled();

		// `Turn off` is now the name of two buttons (the row's and the panel's confirm): aim at the panel's form.
		await proofField(page).fill('654321');
		await proofForm(page).getByRole('button', { name: TURN_OFF, exact: true }).click();
		await expect(text(page, TURNED_OFF), 'turning it off said nothing').toBeVisible({ timeout: 15_000 });
		expect(stub.shapes(DISABLE_PATH), 'the disable body is not the typed code').toEqual([
			['POST', DISABLE_PATH, '{"code":"654321"}']
		]);
		await expect(text(page, OFF), 'the page did not switch back to Off').toHaveCount(1);
		await expect(text(page, ON), 'the On badge survived its own reset').toHaveCount(0);
		await expect(text(page, TURN_OFF_PROOF), 'the proof form stayed open after it worked').toHaveCount(0);
		expect(shield.pageErrors(), 'turning it off threw in the page').toEqual([]);

		// ---------------------------------------------- 8c. off again, proven with a recovery code
		await signInAndVisit(page, fixture, SECURITY_PATH);
		await section(page).getByRole('button', { name: TURN_OFF, exact: true }).click();
		await proofField(page).fill('abcd-efgh-ijkl-mnop');
		await proofForm(page).getByRole('button', { name: TURN_OFF, exact: true }).click();
		await expect(text(page, TURNED_OFF), 'a recovery code did not turn it off').toBeVisible({ timeout: 15_000 });
		await expect(text(page, OFF), 'the page did not switch back to Off after the recovery code').toHaveCount(1);
		expect(stub.shapes(DISABLE_PATH)[1], 'a typed recovery code was not upper-cased and kept its dashes').toEqual([
			'POST',
			DISABLE_PATH,
			'{"recoveryCode":"ABCD-EFGH-IJKL-MNOP"}'
		]);

		// ---------------------------------------------- 8d. a refused proof keeps the panel and the on state
		await signInAndVisit(page, fixture, SECURITY_PATH);
		await section(page).getByRole('button', { name: TURN_OFF, exact: true }).click();
		await proofField(page).fill('111111');
		await proofForm(page).getByRole('button', { name: TURN_OFF, exact: true }).click();
		await expect(text(page, WRONG_CODE), 'a refused proof said nothing under the field').toBeVisible();
		await expect(text(page, ON), 'a refused proof switched it off after all').toHaveCount(1);
		await expect(text(page, OFF), 'a refused proof showed an Off badge').toHaveCount(0);
		await expect(proofField(page), 'the refused proof left the field').toHaveValue('111111');
		await expect(page.locator('[data-sonner-toast]'), 'a refused proof toasted').toHaveCount(0);
		expect(stub.countOf(STATUS_PATH), 'a refused proof read the state again').toBe(5);

		// An empty proof is refused on the page, before any request (two-factor-parts.tsx:283-292)
		await proofField(page).fill('12ab');
		await proofForm(page).getByRole('button', { name: TURN_OFF, exact: true }).click();
		await expect(text(page, PROOF_INCOMPLETE), 'a half proof was not refused on the page').toBeVisible();
		expect(await sampleWhileWatching(stub.countOf, DISABLE_PATH), 'a half proof still sent a disable').toEqual([
			3, 3, 3, 3, 3
		]);

		await proofForm(page).getByRole('button', { name: CANCEL, exact: true }).click();
		await expect(text(page, TURN_OFF_PROOF), 'Cancel left the proof form open').toHaveCount(0);
		expect(await mock.calls(TWO_FACTOR_PREFIX), 'a stubbed two-factor call reached the mock').toEqual([]);

		report('8 on rows and proofs', {
			disableBodies: stub.shapes(DISABLE_PATH),
			statusReads: stub.countOf(STATUS_PATH),
			alerts: await alertTexts(page),
			sectionText: await sectionText(page),
			pageErrors: shield.pageErrors(),
			consoleErrors: shield.consoleErrors()
		});
	});

	// -------------------------------------- 9. new recovery codes

	test('9 · new recovery codes: the same proof, the new codes once, and a 409 that keeps the panel', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// The re-read after a replaced set answers a different count, so the row itself proves the re-read landed.
		const codesLeftAfterReplace = '2 unused codes left'; // settings.security.CODES_LEFT, count 2
		const stub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [
				{ status: 200, body: STATUS_ON },
				{ status: 200, body: { ...STATUS_ON, recoveryCodesLeft: NEW_RECOVERY_CODES.recoveryCodes.length } }
			],
			[`POST ${RECOVERY_CODES_PATH}`]: [
				{ status: 200, body: NEW_RECOVERY_CODES },
				refusal(409, 'Two-factor authentication changed')
			]
		});

		await signInAndVisit(page, fixture, SECURITY_PATH);
		await expect(section(page).getByRole('button', { name: NEW_CODES, exact: true })).toBeVisible({
			timeout: 25_000
		});
		await section(page).getByRole('button', { name: NEW_CODES, exact: true }).click();
		await expect(text(page, NEW_CODES_PROOF), 'the new-codes form did not warn about the old codes').toBeVisible();

		await proofField(page).fill('222222');
		await proofForm(page).getByRole('button', { name: NEW_CODES, exact: true }).click();
		await expect(text(page, NEW_RECOVERY_CODES.recoveryCodes[0]), 'the new codes were never shown').toBeVisible({
			timeout: 15_000
		});
		await expect(text(page, CODES_TITLE)).toHaveCount(1);
		expect(stub.shapes(RECOVERY_CODES_PATH), 'the proof was not posted to the recovery-codes route').toEqual([
			['POST', RECOVERY_CODES_PATH, '{"code":"222222"}']
		]);
		// The row's count is the re-read's number, not the answered one (use-two-factor-settings.ts:82).
		await expect(text(page, codesLeftAfterReplace), 'the codes count never followed the re-read').toHaveCount(1);
		expect(stub.countOf(STATUS_PATH), 'the state was read more than once after one replaced set').toBe(2);

		// The codes panel replaced the regenerate form; a second round of new codes hits the scripted 409.
		await section(page).getByRole('button', { name: CODES_DONE, exact: true }).click();
		await section(page).getByRole('button', { name: NEW_CODES, exact: true }).click();
		await proofField(page).fill('333333');
		await proofForm(page).getByRole('button', { name: NEW_CODES, exact: true }).click();
		await expect(text(page, CHANGED), 'a 409 was not named as a change that happened meanwhile').toBeVisible();
		await expect(text(page, NEW_CODES_PROOF), 'a 409 closed the form it refused').toBeVisible();
		await expect(text(page, ON), 'a refused regeneration changed the state').toHaveCount(1);
		expect(stub.countOf(STATUS_PATH), 'a refused regeneration read the state yet again').toBe(2);

		report('9 new recovery codes', {
			recoveryCodeBodies: stub.shapes(RECOVERY_CODES_PATH),
			statusReads: stub.countOf(STATUS_PATH),
			alerts: await alertTexts(page),
			mockCalls: await mock.calls(TWO_FACTOR_PREFIX),
			consoleErrors: shield.consoleErrors()
		});
	});

	// -------------------------------------- 10. the state cannot be read

	test('10 · a state that cannot be read says so, never guesses "off", and only an API without these routes drops the Security entry', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// Every scripted answer of this test is held `READ_HOLD_MS` before it is answered, so the page's own reader and
		// the settings sidebar's reader of the *same* query key sit on one in-flight read instead of each asking for its
		// own — see the header's "two readers of one query key" limit and `E:\Coding\.tmp\s2-lane-a-2faui-probe-reads-2.log`
		// (held 404: 1 read in all 8 rounds; answered at once: 1 or 2). The numbers below are then the hook's own reads.
		const READ_HOLD_MS = 1_500;
		const cases: Array<{
			label: string;
			answer: StubAnswer;
			copy: string;
			reads: number;
			navEntry: 'shown' | 'hidden';
		}> = [
			{
				label: '502',
				// `two-factor-proxy.ts:57` is where the server half says this in its own words.
				answer: { ...refusal(502, 'Two-factor authentication could not be read.'), holdMs: READ_HOLD_MS },
				copy: READ_FAILED,
				// 1 read + the 2 retries while `failureCount < 2` (`use-two-factor-settings.ts:18-20`)
				reads: 3,
				// `showsSecurityEntry` keeps the entry on `error` (use-hidden-settings-entries.ts:32-34)
				navEntry: 'shown'
			},
			{
				label: 'no answer',
				answer: { abort: true, holdMs: READ_HOLD_MS },
				copy: READ_FAILED,
				reads: 3,
				navEntry: 'shown'
			},
			{
				label: '404',
				answer: { ...refusal(404, 'Not Found'), holdMs: READ_HOLD_MS },
				copy: UNSUPPORTED_TITLE,
				// no retry at all: a 404 is the `unsupported` kind, which `shouldRetryStatus` never retries
				// (`two-factor.ts:137-142` feeding `use-two-factor-settings.ts:19`)
				reads: 1,
				navEntry: 'hidden'
			}
		];

		for (const one of cases) {
			await mockReset();
			const stub = await stubTwoFactor(page, { [`GET ${STATUS_PATH}`]: [one.answer] });
			// `shield.logMatching` accumulates over the whole test, so this case measures a delta of its own.
			const loggedBefore = shield.logMatching(/HTTP Error: GET \/auth\/two-factor/).length;
			await signInAndVisit(page, fixture, SECURITY_PATH);
			await expect(
				text(page, one.copy),
				`${one.label}: the page did not say the state could not be read`
			).toBeVisible({ timeout: 25_000 });

			await expect(text(page, OFF), `${one.label}: the page guessed "off"`).toHaveCount(0);
			await expect(text(page, ON), `${one.label}: the page guessed "on"`).toHaveCount(0);
			await expect(
				section(page).getByRole('button', { name: TURN_ON, exact: true }),
				`${one.label}: a setup was offered on an unread state`
			).toHaveCount(0);
			if (one.copy === READ_FAILED) {
				await expect(section(page).getByRole('button', { name: RETRY, exact: true })).toHaveCount(1);
			} else {
				await expect(
					section(page).getByRole('button', { name: RETRY, exact: true }),
					`${one.label}: a server without these routes offered a retry`
				).toHaveCount(0);
				await expect(text(page, UNSUPPORTED_DESCRIPTION)).toHaveCount(1);
			}
			// The settings sidebar asks the same read (`use-hidden-settings-entries.ts:75`) and adds the entry only when
			// it is not `ready` or `error` (`:32-34`, `:54-55`): a failed read keeps it, an API without these routes
			// drops it. Polled, because the entry appears only once that read lands: a bare `count()` reads one instant
			// and measured 0 on the members page while the read was still in flight (`s2-lane-a-2faui-3.log`, test 12).
			await expect(
				settingsNavEntry(page),
				`${one.label}: the Security entry of the settings sidebar is not the ${one.navEntry} this lane measures`
			).toHaveCount(one.navEntry === 'hidden' ? 0 : 1);
			// First wait until the read count sits at the measured number, then prove nothing further follows it by
			// sampling 5 times over 2 s (`workspace-data-export.spec.ts:295-310`). The number is the hook's own doing:
			// a failed read that is an `error` is retried while `failureCount < 2` (`use-two-factor-settings.ts:18-20`) =
			// 3 reads, and a 404 — the `unsupported` kind, `two-factor.ts:137-142` — is never retried = 1 read.
			await expect.poll(() => stub.countOf(STATUS_PATH), { timeout: 25_000 }).toBe(one.reads);
			const readSamples = await sampleWhileWatching(stub.countOf, STATUS_PATH);
			expect(readSamples.join(','), `${one.label}: the reads did not stay at the measured ${one.reads}`).toBe(
				Array.from({ length: readSamples.length }, () => one.reads).join(',')
			);
			// The app logs every failed read itself (`api.service.ts:272-274`), so its own log lines count the reads too.
			const logged = shield.logMatching(/HTTP Error: GET \/auth\/two-factor/).slice(loggedBefore);
			expect(
				logged,
				`${one.label}: the app did not log exactly the ${one.reads} failed reads it made`
			).toHaveLength(one.reads);
			expect(await mock.calls(TWO_FACTOR_PREFIX), `${one.label}: a stubbed read reached the mock`).toEqual([]);

			report(`10 read fails ${one.label}`, {
				sectionText: await sectionText(page),
				buttons: await sectionButtons(page),
				navSecurityLinks: await settingsNavEntry(page).count(),
				statusReads: stub.countOf(STATUS_PATH),
				readSamples,
				appLoggedIt: logged.map((line) => line.slice(0, 120)),
				consoleErrors: shield.consoleErrors().filter((line) => /two-factor/.test(line)),
				pageErrors: shield.pageErrors()
			});
			await stub.uninstall();
		}
	});

	// -------------------------------------- 11. in flight

	test('11 · in flight: the button is disabled while its request is pending, and a second attempt sends nothing', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		let releaseEnroll: () => void = () => undefined;
		let releaseConfirm: () => void = () => undefined;
		const heldEnroll = new Promise<void>((resolve) => {
			releaseEnroll = resolve;
		});
		const heldConfirm = new Promise<void>((resolve) => {
			releaseConfirm = resolve;
		});
		const stub = await stubTwoFactor(page, {
			[`GET ${STATUS_PATH}`]: [
				{ status: 200, body: STATUS_OFF },
				{ status: 200, body: STATUS_ON }
			],
			[`POST ${ENROLL_PATH}`]: [{ status: 200, body: ENROLLMENT, holdUntil: heldEnroll }],
			[`POST ${CONFIRM_PATH}`]: [{ status: 200, body: CONFIRMATION, holdUntil: heldConfirm }]
		});

		await signInAndVisit(page, fixture, SECURITY_PATH);
		const turnOn = section(page).getByRole('button', { name: TURN_ON, exact: true });
		await expect(turnOn).toBeVisible({ timeout: 25_000 });
		await turnOn.click();

		// `disabled={starting}`, the Off row's own button (security-settings-page.tsx:47)
		await expect(turnOn).toBeDisabled();
		expect(
			await sampleWhileWatching(stub.countOf, ENROLL_PATH),
			'a forced second click reached the platform while the setup was still starting'
		).toEqual([1, 1, 1, 1, 1]);
		expect(stub.countOf(CONFIRM_PATH), 'a held enroll let a confirm through').toBe(0);
		const whileEnroll = {
			turnOnCount: await turnOn.count(),
			turnOnDisabled: await turnOn.isDisabled(),
			enrollReads: stub.countOf(ENROLL_PATH)
		};
		report('11 while enroll is held', whileEnroll);
		releaseEnroll();

		await expect(text(page, SETUP_STEP_CODE), 'the setup never opened once its request was answered').toBeVisible();
		await codeField(page).fill('123456');
		const submit = setupForm(page).getByRole('button', { name: TURN_ON, exact: true });
		await submit.click();

		// Both buttons of the setup form are disabled while the confirm runs (two-factor-parts.tsx:205-210)
		await expect(submit).toBeDisabled();
		await expect(setupForm(page).getByRole('button', { name: CANCEL, exact: true })).toBeDisabled();
		expect(
			await sampleWhileWatching(stub.countOf, CONFIRM_PATH),
			'a forced second submit reached the platform while a confirmation ran'
		).toEqual([1, 1, 1, 1, 1]);
		report('11 while confirm is held', {
			submitDisabled: await submit.isDisabled(),
			cancelDisabled: await setupForm(page).getByRole('button', { name: CANCEL, exact: true }).isDisabled(),
			confirmReads: stub.countOf(CONFIRM_PATH),
			enrollReads: stub.countOf(ENROLL_PATH)
		});
		releaseConfirm();

		await expect(text(page, CODES_TITLE), 'the released confirmation never showed its codes').toBeVisible();
		expect(stub.countOf(ENROLL_PATH), 'the held enroll was sent more than once').toBe(1);
		expect(stub.countOf(CONFIRM_PATH), 'the held confirm was sent more than once').toBe(1);
		expect(stub.shapes(CONFIRM_PATH), 'the one confirm that ran is not the typed code').toEqual([
			['POST', CONFIRM_PATH, '{"code":"123456"}']
		]);
		expect(await mock.calls(TWO_FACTOR_PREFIX), 'a stubbed write reached the mock').toEqual([]);

		expect(consoleFindings(shield), 'the in-flight run logged a console error').toEqual([]);
		report('11 after release', {
			bodies: stub.requests.map((call) => `${call.method} ${call.path} ${call.body ?? ''}`),
			sectionText: await sectionText(page),
			toasts: await toastTexts(page),
			pageErrors: shield.pageErrors(),
			consoleErrors: shield.consoleErrors()
		});
	});

	// -------------------------------------- 12. the member reset: not reachable on this lane (mock limit)
	//
	// Left out, because this lane cannot reach it: with the item never rendered there is no confirm dialog to open, no
	// `DELETE /api/auth/two-factor/users/<id>` for the browser to send, and no 403
	// `{"message":"You may not reset this member."}` (`two-factor-proxy.ts:100-117`) for the page to show — and that 403
	// is anyway the Next route handler's answer, which direct mode bypasses (see the header). What *is* measured is the
	// gate itself, in both permission directions, plus the reads the members page causes of the person's own state.

	test('12 · the members page reads the two-factor state but is never offered the reset, because its fixture members carry no role', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// `reads` is the measured number of status reads the members page causes of the person's own state: one when the
		// read answers, and — with the failed read's answer held `READ_HOLD_MS`, so the page's reader and the settings
		// sidebar's reader of the same query key share it (see the header's "two readers of one query key") — also one
		// when it is refused: 1 read, no retry, because a 404 is the `unsupported` kind
		// (`two-factor.ts:137-142` → `use-two-factor-settings.ts:19`). Held: `[1,1,1,1]` (`s2-lane-a-2faui-probe-reads-3.log`
		// G); answered at once the same page measured 2 in `s2-lane-a-2faui-3.log` and the Security page 1 or 2 in the
		// probes (`s2-lane-a-2faui-probe-reads-1.log`, `-2.log`) — a mount-time extra read, never a third attempt.
		const READ_HOLD_MS = 1_500;
		const combos: Array<{
			label: string;
			scenario: MockScenario;
			status: StubAnswer;
			reads: number;
			navEntry: number;
		}> = [
			{
				label: 'ORG_USERS_EDIT armed',
				scenario: USERS_EDIT,
				status: { status: 200, body: STATUS_ON },
				reads: 1,
				navEntry: 1
			},
			{
				label: 'no ORG_USERS_EDIT',
				scenario: NO_EXTRA,
				status: { status: 200, body: STATUS_ON },
				reads: 1,
				navEntry: 1
			},
			{
				label: 'ORG_USERS_EDIT armed, the state unreadable',
				scenario: USERS_EDIT,
				status: { ...refusal(404, 'Not Found'), holdMs: READ_HOLD_MS },
				reads: 1,
				navEntry: 0
			}
		];

		for (const one of combos) {
			await mockReset();
			const stub = await stubTwoFactor(page, {
				[`GET ${STATUS_PATH}`]: [one.status],
				[`DELETE ${TWO_FACTOR_PREFIX}/users/${fixture.ids.teammateUser}`]: [
					{ status: 200, body: { reset: true } }
				]
			});
			await signInAndVisit(page, fixture, MEMBERS_PATH, { scenario: one.scenario });
			await expect(
				page.getByRole('heading', { level: 2, name: 'Members' }),
				`${one.label}: the members section never rendered on this lane`
			).toBeVisible({ timeout: 25_000 });

			const menus = page.getByRole('button', { name: /^More actions for / });
			await expect(menus, `${one.label}: no row menu, so the list itself did not render`).toHaveCount(3);
			const teammateMenu = page.getByRole('button', { name: ROW_MENU, exact: true });
			await expect(teammateMenu, `${one.label}: the teammate's row is gone`).toHaveCount(1);
			await teammateMenu.click();
			await expect(page.getByRole('menu'), `${one.label}: the row menu never opened`).toBeVisible();

			const items = (await page.getByRole('menuitem').allInnerTexts()).map(flat);
			expect(items, `${one.label}: the row menu items are not what this lane measures`).toEqual([
				'Edit name',
				'Edit rate',
				'Remove from the team'
			]);
			// member-access.ts:398-401 + settings-team.ts:70-81 against mock-gauzy-server.mjs:117-138: no role to read
			await expect(
				page.getByRole('menuitem', { name: RESET_TWO_FACTOR, exact: true }),
				`${one.label}: the reset of a member's second factor was offered on this lane`
			).toHaveCount(0);

			await page.keyboard.press('Escape');
			// Polled to the measured number (a held read answers a moment after the page's first render), then checked
			// once more so nothing read again after it.
			await expect.poll(() => stub.countOf(STATUS_PATH), { timeout: 25_000 }).toBe(one.reads);
			await expect(
				settingsNavEntry(page),
				`${one.label}: the Security entry of the settings sidebar is not the ${one.navEntry} this lane measures`
			).toHaveCount(one.navEntry);
			expect(
				stub.countOf(STATUS_PATH),
				`${one.label}: the members page read the state more than the measured ${one.reads}`
			).toBe(one.reads);
			expect(
				(await mock.requests()).filter((call: StubRequest) => call.method === 'DELETE'),
				`${one.label}: something was deleted while only the menu was opened`
			).toEqual([]);

			report(`12 members ${one.label}`, {
				scenario: one.scenario,
				menuItems: items,
				resetItems: await page.getByRole('menuitem', { name: RESET_TWO_FACTOR }).count(),
				statusReads: stub.countOf(STATUS_PATH),
				deletes: stub.requests.filter((call) => call.method === 'DELETE').length,
				consoleErrors: shield.consoleErrors().filter((line) => /two-factor/.test(line))
			});
			await stub.uninstall();
		}
	});
});
