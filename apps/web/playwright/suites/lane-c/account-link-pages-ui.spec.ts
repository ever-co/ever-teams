import { expect, test, type Page } from '../../fixtures';

import {
	APP_ORIGIN,
	authCookieNames,
	hardVisit,
	mockReset,
	mockScenario,
	receivedTokens,
	signInWithFixture
} from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person sees, and what the browser sends, on the three public "open the link from the e-mail" pages this lane
 * had never opened in a browser: `/delete-account`, `/delete-account/confirm` and `/verify-email`. Only
 * `suites/lane-d/page-gate-lane.spec.ts` had reached them at all (as a list of reachable routes), and
 * `unguarded-writes.spec.ts:196-260` pinned the *server* half of the same feature — its probes call
 * `app/api/account-deletion/{request,verify,confirm}` from Node and never open a page. Nothing here repeats that, and
 * it could not: **in this lane the browser never touches those app route files at all** (measured in every case below;
 * see "direct mode").
 *
 * Run on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control 4004 —
 * `playwright/test-servers.ts:37-42`) on 2026-11-23/24, in this file's own consecutive green runs
 * `E:\Coding\.tmp\s2-lane-c-acct-1.log` and `-2.log`, after the measuring probes
 * `E:\Coding\.tmp\s2-lane-c-acct-probe-{1,2,4}.log` (round 1 = the three pages cold, 20 cases; round 2 = the
 * request-form facts, the signed-in halves and the token sweep, 10 cases, one of which — the confirm-phase timeline —
 * died on the 180 s test timeout while calling `allInnerTexts()` across the header, so nothing below uses that
 * selector; round 4 = the locale route, the double Enter, the verify-email loading state and the 410-on-confirm step).
 * Round 3 is unusable and nothing is taken from it: its file was rewritten while it was still running and 5 of its
 * cases died with "Test not found in the worker process". Every number pinned below is one a `MEASURE` line printed
 * in a completed run; every `file:line` was re-read from the source after the last run.
 *
 * ## Which components this drives
 *
 * - `app/[locale]/delete-account/page.tsx` → `core/components/pages/auth/delete-account/delete-account-request-form.tsx`
 *   (135 lines: `#delete-account-email` :102, `handleSubmit` :40-53, the `sent` state :69-83).
 * - `app/[locale]/delete-account/confirm/page.tsx` → `core/components/pages/auth/delete-account/delete-account-confirm.tsx`
 *   (292 lines: `InvalidLink` :39-56, `ConfirmForm` :62-204, the phase switch :215-280) through
 *   `core/hooks/auth/use-account-deletion.ts` (`useAccountDeletionConfirm` :116-252, `clearSessionIfAccountGone` :69-94).
 * - `app/[locale]/(focus)/verify-email/page.tsx` → `core/components/pages/auth/verify-email-page.tsx` through
 *   `core/hooks/auth/use-email-verify-token.ts:9-51` and
 *   `core/services/client/api/users/emails/email-verification.service.ts:55-94`.
 * - `core/lib/auth/account-deletion.ts` (the token rules: `takeAccountDeletionToken` :56-72,
 *   `accountDeletionConfirmUrl` :39-44) and `core/services/client/api/auth/account-deletion.service.ts`
 *   (`publicPost` :29-40, `requestLink`/`verify`/`confirm` :51-70). A bare `account-deletion.ts:NN` anywhere below is
 *   `core/lib/auth/account-deletion.ts`, the one the browser runs; the Next.js route helper of the same name
 *   (`core/services/server/requests/account-deletion.ts`, what `unguarded-writes.spec.ts` probed from Node) is cited
 *   nowhere in this file, because no request here reaches it.
 *
 * ## Direct mode: these pages call the test backend, not this app's `/api`
 *
 * `NEXT_PUBLIC_GAUZY_API_SERVER_URL` is the lane mock (`playwright/test-servers.ts:109`) and
 * `GAUZY_API_BASE_SERVER_URL` is that same value (`core/constants/config/constants.tsx:229-232`), so `publicBaseUrl()`
 * returns `http://127.0.0.1:4002/api` (`account-deletion.service.ts:16-19`) and `EmailVerificationService` gets the
 * mock as its `baseURL`. Measured in every case: the deletion and verification calls went to `127.0.0.1:4002`, and no
 * request was ever made to `localhost:3033/api/account-deletion/*` — the route files `unguarded-writes.spec.ts`
 * probed from Node are not what a person's browser talks to in this lane.
 *
 * ## Which answers are stubs, and what the mock cannot produce
 *
 * The lane mock has **no handler for any path this file needs**: `cypress/support/mock-gauzy-server.mjs` names none of
 * `account-deletion/request`, `account-deletion/verify`, `account-deletion/confirm` or `auth/email/verify`, and its
 * fallback for a non-GET is "echo the body back with 200" (`mock-gauzy-server.mjs:893-894`). That fallback is not a
 * usable answer: the echoed `POST /api/account-deletion/verify` (`{token:"…"}`) is a preview with no `accounts`, and
 * the hook reads that as a dead link (`use-account-deletion.ts:146` → `{gone:true}` → `phase:'invalid'`); case O pins
 * that reading as it happened, labelled `[mock limit]`. Everything else needs `page.route` + `route.fulfill`:
 *
 * - stubbed here: a **preview** for `verify` (cases H–L, N–R), a **confirm success** answer (J, K, L), a **valid**
 *   e-mail verification answer (T). Those answers restate the mock's own CORS headers
 *   (`docs-home-ui.spec.ts:259-267`, `clients-access-ui.spec.ts:138-145`) — the page is on `localhost:3033` and the
 *   API on `127.0.0.1:4002`, and without them the browser discards the answer and the case silently becomes an
 *   outage. Every case that stubs says `stubbed=…` in its `MEASURE` line.
 * - not stubbed, from the mock itself: 429 (`scenario.fails`, `mock-gauzy-server.mjs:1150-1164`), 410, 403, 503, 409,
 *   500, 404, and the cut connections (`drops`, :1114-1142). All of them land in the mock's own request log with
 *   their status, `0` for a drop (:1127-1132, :1197-1198) — a number no refusal writes.
 * - The mock answers `GET /api/user/me` for the fixture user **forever** (`mock-gauzy-server.mjs:607`), so the
 *   post-deletion "is my account really gone?" branch only appears when `scenario.fails` arms that path (case L).
 *   Case K pins the 200 branch, which is exactly the branch the hook refuses to act on
 *   (`use-account-deletion.ts:81-83`). `[mock limit]` of that arm: it is addressed by path only
 *   (`mock-gauzy-server.mjs:1158-1163`), so it refuses the app's **own** session read as well, and the app logs a
 *   refused read at ERROR level (`api.service.ts:274,310` → `logError` :439-474 → `logger-adapter.service.ts:205-214`,
 *   404 → `LogLevel.ERROR` at :223-239). Case L pins that no *other* console error appears.
 * - The mock records `method, path, query, startMs, endMs, status` and **no body**, and a bearer only as its sha256
 *   (`mock-gauzy-server.mjs:1191-1209`, `helpers.receivedTokens`), so "the token never entered a log" is answered
 *   from the browser's own request list (`recordRequests`) plus `shield.logMatching`, and "the session did travel"
 *   from `receivedTokens(path)`. Case O pins the recorded entry's key set — the one case here where a body carrying
 *   a token really reached the mock; case H measures that the mock recorded nothing at all for its stubbed visit.
 * - `next dev` runs React Strict Mode, so a mounted effect runs twice: one page load's `verify` read was measured
 *   **twice**, 3 ms apart (`…probe-1.log` P9/P11/P12, `…probe-2.log` Q4), and the `verify-email` read is React Query
 *   with `retry: 1` (`use-email-verify-token.ts:34`), measured as 2 attempts ~1.2 s apart (`…probe-1.log` P18). Those
 *   counts are pinned as bounds (1..2) because they are a race; "no call at all" is pinned at 0, and single-shot
 *   calls (a POST caused by a click, `clearSessionIfAccountGone`'s check) at exactly 1 (`…probe-2.log` Q5,
 *   `…probe-1.log` P7/P8).
 * - **How this file waits**: on URLs, locators and button state only. Three `page.waitForTimeout` calls remain and
 *   none of them is an assertion: two are settle windows before a **zero** count (case I, after a submit the gates
 *   refuse and after a forced click on a disabled submit — "no request left this page" is not something a locator can
 *   show, so the page is given the time it would have needed to send one and the recorded request list is then read);
 *   the third (case D) holds the in-flight window open — the button is measured `disabled` + `aria-busy` and only then
 *   is `form.requestSubmit()` called twice, which is the whole point of that case. No expected value in this file is
 *   a duration.
 *
 * ## What the runs measured, case by case
 *
 * The green runs print one `MEASURE` line per case with the numbers its assertions are pinned on. Each English string
 * this file asserts on is quoted in the `TEXT` table below with its `en.json` key and line.
 *
 * - **A — the form a stranger sees**: `#delete-account-email`, the label `E-mail`, the submit `Email me a deletion
 *   link`, the `novalidate` form (`delete-account-request-form.tsx:97`), the document's own `Referrer-Policy:
 *   no-referrer` + `X-Robots-Tag: noindex, nofollow` (`next.config.js:115-136`, measured as response headers) and the
 *   matching `<meta name="referrer">` / `<meta name="robots">` (`app/[locale]/delete-account/layout.tsx`), while the
 *   tab title stays the layout default (`Home`). Nothing is asked of the backend before a submit.
 * - **B — an address the form will not send**: empty → `#delete-account-email-error` = `Email address is required`,
 *   `aria-invalid="true"` and `aria-describedby="delete-account-email-error"` on the field (`auth-field.tsx:81-82`);
 *   `foo` → `Enter a valid e-mail address.`; typing clears the message (`delete-account-request-form.tsx:109-112`).
 *   0 calls in both, and 0 entries in the mock's log.
 * - **C — one valid address, one call** (signed out, then the same signed in): `POST /api/account-deletion/request`
 *   with `{appName, appSignature, companyName, appLogo, appLink, companyLink, email, callbackUrl, locale}` — the
 *   branding from `appEmailBranding()`, the **trimmed** field value (`delete-account-request-form.tsx:43`, measured
 *   with spaces around it), `callbackUrl` = this app's confirm page (`use-account-deletion.ts:42-44` +
 *   `account-deletion.ts:39-44`), `locale` the visitor's. No `authorization`, no `tenant-id` header, **signed in
 *   exactly as signed out** (`publicPost` is a bare axios call with `withCredentials:false`,
 *   `account-deletion.service.ts:29-40`), and the mock recorded no bearer for that path. Then the sent state: `Check
 *   your email`, "…The link expires in 30 minutes." (`ACCOUNT_DELETION_LINK_TTL_MINUTES = 30`,
 *   `account-deletion.ts:25`), the address written out in full (`AuthAddress`, `auth-state.tsx:62-74`), the field
 *   gone, and `Back to sign in` → `/auth/passcode`.
 * - **D — in flight, refused, and a second submit**: while the call runs the button is `disabled` with
 *   `aria-busy="true"` and its label unchanged (`delete-account-request-form.tsx:120-126`); a person's second Enter
 *   adds nothing (measured 1 call: implicit submission stands down for a disabled default button), and a click on the
 *   disabled button adds nothing (`…probe-1.log` P3). A scripted `form.requestSubmit()` **does** get past it — the
 *   form has no re-entry guard, only the button does (`delete-account-request-form.tsx:40-53`,
 *   `use-account-deletion.ts:35-53`) — measured 3 POSTs for one click plus two scripted submits (`…probe-2.log` Q1).
 *   A 429 leaves the person on the form with `We could not send the request. Please wait a minute and try again.`
 *   (rendered at `delete-account-request-form.tsx:118`), the button enabled again and the address still typed in it.
 * - **E — the locale travels**: `/fr/delete-account` answers in French and its body carries `locale:"fr"` and
 *   `callbackUrl:"<app origin>/fr/delete-account/confirm"` (`account-deletion.ts:39-44`: the prefix appears only for a
 *   locale that is not the default one).
 * - **F — a confirm page with nothing to open**: `This link no longer works` + `This link is invalid or has expired.
 *   Request a new one.`, `Request a new link` → `/delete-account`, and **0 calls** for all three shapes of it: no
 *   fragment, `#token=`, `#other=1` (`use-account-deletion.ts:143` asks nothing without a token).
 * - **G — a token in the query is treated as already leaked**: `?token=…&keep=1` ends on
 *   `/delete-account/confirm?keep=1` — the token is removed from the address, every other parameter is kept, and the
 *   token is never used: 0 calls (`account-deletion.ts:48-54,64-71`).
 * - **H — a real fragment token**: `#token=…` is taken before the first paint (`use-account-deletion.ts:130-134`) and
 *   the address ends with **no fragment**; the document request the *server* was given carried no query and no
 *   fragment; the token appears in the `POST /api/account-deletion/verify` body only, in no `POST /api/log` body, in
 *   no console line, in no page text, and the mock held neither a body nor a bearer for it. The preview is shown as
 *   it was answered: masked address, 2 rows, the sole-admin warning, `The link expires at …`, and the header's
 *   language pill hidden while the page holds a token (`delete-account-confirm.tsx:285`).
 * - **I — the confirm gate**: the delete button is disabled until the checkbox **and** the word **and** a `planHash`
 *   are all there (`delete-account-confirm.tsx:80-84,190`); `delete`, `" DELETE "` and `DELETE` all count
 *   (`:80-81`), `deleteMe` does not; a submit without the box is refused by the form handler itself (`:92-95`,
 *   measured 0 confirm POSTs); a preview with accounts but no `planHash` can never be deleted, not even by a forced
 *   click (`:83-84` and `use-account-deletion.ts:205-209`, measured 0).
 * - **J/K/L — the success and what it does to the session**: `Account deleted` + "2 accounts were deleted, with 1
 *   workspace." (the numbers come from the confirm answer, `delete-account-confirm.tsx:266-269`), and the person
 *   **stays on `/delete-account/confirm`** — nothing redirects them; the only way out is `Back to sign in` →
 *   `/auth/passcode` (`DEFAULT_APP_PATH`, :271-274). Then `clearSessionIfAccountGone` (`use-account-deletion.ts:69-94`):
 *   signed out it never starts (no token cookie → **0 `/api/user/me` calls**, J); signed in with the session still
 *   answering 200, its single no-query `GET /api/user/me` proves nothing and all 10 session cookies stay (K,
 *   `:81-83`); signed in with that call refused 404, the cookies go and `You were signed out in this browser.`
 *   appears (:276, L). The clear-check is the only `/api/user/me` call **with no query**; the app's own session read
 *   carries `?relations[0]=role&relations[1]=tenant&includeEmployee=true` (`user.service.ts:61-75`) and appears only
 *   when a token cookie exists — this file pins that they are different calls, not which mount causes the second one
 *   (`core/hooks/queries/user-user.query.ts:8-27`, `enabled: hasToken`).
 * - **M — only a 410 means the link is dead**: on the preview read (`use-account-deletion.ts:148` +
 *   `isAccountDeletionLinkGone`, `account-deletion.service.ts:101-105`) and, after the confirmation, in place of the
 *   success — nothing deleted, the confirm form gone (`use-account-deletion.ts:226-230`). **N/O — everything else is
 *   an outage**: 503, a cut connection and a 403 all give `Something went wrong while checking your link. Please try
 *   again.` with `Try again` and `Request a new link`; `Try again` re-reads the same token and, once the arm is off,
 *   shows the preview (`delete-account-confirm.tsx:238-257`, `use-account-deletion.ts:163-167,250`).
 * - **P — a 409 means the plan changed**: the plan-changed notice, nothing deleted, nothing shown as a failure, the
 *   preview re-read (2 rows again) and the checkbox **and** the typed word cleared, so the person must confirm the new
 *   summary again (`use-account-deletion.ts:231-236` re-verifies; `delete-account-confirm.tsx:59-61` keys
 *   `ConfirmForm` by `details?.planHash`, :217).
 * - **Q — a 500 on confirm** leaves the same preview on screen with its own card: `The deletion did not go through.
 *   Please try again.` and a `Try again` beside it (`delete-account-confirm.tsx:165-184`), with the box still checked
 *   and the word still typed (no `planHash` change, so no remount).
 * - **R — a second link pasted into the same tab**: `hashchange` picks the new token up and re-reads with it, without
 *   a reload, and the dead-link answer is replaced by the preview (`use-account-deletion.ts:179-194`).
 * - **S–V — `/verify-email`**: a link missing either half is a failed verification with **no call at all**
 *   (`use-email-verify-token.ts:16-19,33,48`), and the sentence for that is the same one the page shows for a refused
 *   link and for a cut connection (`en.json:2546-2547`) — the person cannot tell the three apart. A valid token shows
 *   `We are verifying your email, hold on...` with `aria-busy="true"` on a block, then **leaves the page**
 *   (`router.replace('/')`, `use-email-verify-token.ts:40-44`), which for a signed-out visitor lands on
 *   `/auth/passcode`. A refusal shows the failure copy after 1..2 attempts (`retry: 1`).
 * - **W — where the verify token goes**: unlike the deletion calls this is a normal `APIService` call, so signed in
 *   it carries `Authorization: Bearer …`, a `tenant-id` header and `tenantId`/`organizationId` in the body
 *   (`api.service.ts:87-101` `authorizeRequest`, :299-301 the tenant header, :654-661 the body merge), and the mock
 *   records that bearer. **Signed out the same call sends exactly `{ email, token }`** (measured in T and U): that
 *   merge only writes a key when the id is defined, and with no session cookies it is not (`api.service.ts:654-661`).
 *   The token stays in the page's own URL for the whole visit — this page never strips it,
 *   unlike the deletion confirm page — and it is in the API body and **in the app's own development log** (see the
 *   table below). It left the machine in no case: the `shield` fixture fails a run that lets it
 *   (`playwright/fixtures.ts:112-118`), and the only origins any of these cases ever asked are the app and the mock.
 *
 * ## MEASURED, NOT INTENDED
 *
 * | # | what was measured | where the opposite intent is written |
 * | --- | --- | --- |
 * | 1 | The `/verify-email` token is copied into the app's own log system, in clear text: in case U two `POST /api/log` bodies carry `details.data.token` with the token verbatim (`…probe-1.log` P20 prints both bodies). | The sibling flow states this exact rule and follows it: `account-deletion.service.ts:22-28` refuses to send a deletion token through `APIService` because that "in development, log[s] the request body, which here holds the deletion token (and the local log system can forward those logs to `/api/log`)". `/verify-email` sends its token through `APIService` (`email-verification.service.ts:55-94`); logging is on in development (`api.service.ts:157`); the request log writes the body as `details.data` (`api.service.ts:387-395`); `requestBodyForLog` hides `hash`, `password`, `confirmPassword`, `code`, `recoveryCode`, `challenge` and `refresh_token` but **not `token`** (`core/services/client/request-log-body.ts:6-14`); and with `ACTIVE_LOCAL_LOG_SYSTEM` on (`apps/web/.env:14-15`, `core/constants/config/constants.tsx:275-278`) every entry is posted to `/api/log` (`core/services/logs/logger.service.ts:170-178`, `core/services/logs/logger-client.ts:41`). The deletion half hid the token from that same log, measured in case H. |
 * | 2 | After a confirmed deletion that did clear the session, 9 of the 10 session cookies `signInWithFixture` wrote are gone and `auth-active-project` is still there (case L; `…probe-1.log` P8 prints the surviving cookie list). | `use-account-deletion.ts:60-61` says the point is to "drop it — cookies and cached queries — so the app does not keep acting as a deleted user", but `removeAuthCookies` deletes exactly what `cookiesKeys()` names (`core/lib/helpers/cookies/index.ts:271-284,306-314`), which does not include `ACTIVE_PROJECT_COOKIE_NAME` (`core/constants/config/constants.tsx:147`) although the server guard still reads it (`core/services/server/guards/authenticated-guard.ts:28`). |
 *
 * Two measured facts are deliberately **not** labelled that way, because no comment, test or sibling page claims the
 * opposite: the `form.requestSubmit()` reaching the API while a call is in flight (case D — nothing claims a re-entry
 * guard exists), and the browser tab title of `/delete-account`, printed as `Home` by the runs (the layout sets
 * `referrer` and `robots` only).
 *
 * ## Console errors
 *
 * Printed in every `MEASURE` line. **Asserted empty** in the cases that only open a page or send a call that answers
 * well: A, B, C, F, J, K and R. Case L asserts the narrower thing it has to: that no console error appears **other
 * than** the app's own refused session read (`HTTP Error: GET /user/me… 404`), which the arm that produced the 404
 * cannot avoid arming, and it separately pins that that line really is there.
 * `consoleErrors` is **measured and reported, not asserted**, in D, E, G, H, I and M–Q, S, T, U, V and W, because a
 * refused or cut request reports itself there (`Failed to load resource` — `CONSOLE_NOISE`,
 * `playwright/helpers.ts:30-44`), and React Query surfaces a failure in the `next dev` overlay as
 * `DEV Query failed ["email-verification","verify-token",<email>,<token>]` (measured text, `…probe-1.log`
 * P16/P18/P19, `…probe-2.log` Q9) — which is also the only place on `/verify-email` where the token is drawn on
 * screen, and a development-only artifact.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const REQUEST_PATH = '/api/account-deletion/request';
const VERIFY_PATH = '/api/account-deletion/verify';
const CONFIRM_PATH = '/api/account-deletion/confirm';
const EMAIL_VERIFY_PATH = '/api/auth/email/verify';
const USER_ME_PATH = '/api/user/me';
const LOG_PATH = '/api/log';

/** What the person is asked to type (`ACCOUNT_DELETION_CONFIRM_WORD`, core/lib/auth/account-deletion.ts:22). */
const CONFIRM_WORD = 'DELETE';
const EMAIL_ADDRESS = 'delete-me@example.test';
const VERIFY_EMAIL_ADDRESS = 'verify-me@example.test';

/** The English this file asserts on, each copied from `locales/en.json` with its key and line. */
const TEXT = {
	emailLabel: 'E-mail', // auth.field.EMAIL_LABEL, en.json:6520
	emailRequired: 'Email address is required', // form.EMAIL_REQUIRED, en.json:3445
	emailInvalid: 'Enter a valid e-mail address.', // auth.field.EMAIL_INVALID, en.json:6519
	requestTitle: 'Delete your account', // pages.accountDeletion.REQUEST_TITLE, en.json:1932
	sendLink: 'Email me a deletion link', // pages.accountDeletion.SEND_LINK, en.json:1935
	sentTitle: 'Check your email', // en.json:1936
	sentMessage: 'If an account exists for that email, we sent a link to delete it. The link expires in 30 minutes.', // en.json:1937 + account-deletion.ts:25
	requestError: 'We could not send the request. Please wait a minute and try again.', // en.json:1938
	backToSignIn: 'Back to sign in', // en.json:1939
	confirmTitle: 'Confirm account deletion', // en.json:1940
	doneTitle: 'Account deleted', // en.json:1941
	deletedAccounts: '2 accounts were deleted, with 1 workspace.', // pages.accountDeletion.DELETED_MESSAGE, en.json:1955
	deletedConfirmation: 'We sent a confirmation to your email.', // en.json:1955, the rest of the same sentence
	introMasked: 'This link was sent to j***@example.com.', // pages.accountDeletion.CONFIRM_INTRO, en.json:1943
	confirmCheckbox: 'I understand that this permanently deletes my data and cannot be undone.', // en.json:1950
	typeToConfirm: 'Type DELETE to confirm', // en.json:1951, {word} = 'DELETE'
	confirmButton: 'Delete my account permanently', // en.json:1952
	confirmError: 'The deletion did not go through. Please try again.', // en.json:1953
	keepAccount: 'Keep my account', // en.json:1954
	soleAdminWarning: 'You are the only admin of this workspace', // en.json:1948, the sentence the run quoted in full
	workspaceDeleted: 'the whole workspace and all its data will be deleted', // en.json:1946
	membersKept: '2 other members keep access.', // en.json:1947
	invalidTitle: 'This link no longer works', // auth.deleteAccount.INVALID_TITLE, en.json:6509
	invalidLink: 'This link is invalid or has expired. Request a new one.', // pages.accountDeletion.INVALID_LINK, en.json:1957
	requestNewLink: 'Request a new link', // en.json:1958
	genericError: 'Something went wrong while checking your link. Please try again.', // en.json:1959
	tryAgain: 'Try again', // en.json:1960
	planChanged:
		'What will be deleted changed since this page was loaded (someone joined or left). Nothing was deleted: review the new summary and confirm again.', // en.json:1967
	signedOut: 'You were signed out in this browser.', // en.json:1956
	verifyLoading: 'We are verifying your email, hold on...', // pages.authTeam.VERIFY_EMAIL_LOADING_TEXT, en.json:2545
	verifyFailedTitle: "We couldn't verify your email", // en.json:2546
	verifyFailedMessage:
		'The link may be invalid, expired or already used, or the server could not be reached. Try the link again in a moment, or open the app to request a new one.', // en.json:2547
	goToHome: 'Go to home' // pages.profile.GO_TO_HOME, en.json:2360
};

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function measure(label: string, seen: Record<string, unknown>): void {
	const parts = Object.entries(seen)
		.map(([key, value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value}`)
		.join(' · ');
	console.log(`[lane-c account-links] MEASURE ${label} · ${parts}`);
}

/** The mock's own CORS answer, restated on every answer this spec writes (`docs-home-ui.spec.ts:259-267`). */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

type SentRequest = {
	method: string;
	origin: string;
	path: string;
	search: string;
	body: string | null;
	authorization: string | null;
	tenantId: string | null;
};

/**
 * Every request the page sent, with the body the browser put on it. The mock's own log keeps no body
 * (`mock-gauzy-server.mjs:1189-1199`), so this is the only way to say where a token did and did not travel. Bundles,
 * fonts and Next's own paths are skipped; `/api/log` is kept on purpose, because that is where a body can leak.
 */
function recordRequests(page: Page): SentRequest[] {
	const sent: SentRequest[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/__nextjs_font')) return;
		if (/\.(woff2?|css|js|map|png|svg|ico)$/.test(url.pathname)) return;
		const headers = request.headers();
		sent.push({
			method: request.method(),
			origin: url.origin,
			path: url.pathname,
			search: url.searchParams.toString(),
			body: request.postData(),
			authorization: headers['authorization'] ?? null,
			tenantId: headers['tenant-id'] ?? null
		});
	});
	return sent;
}

const callsTo = (sent: SentRequest[], path: string): SentRequest[] => sent.filter((request) => request.path === path);
const jsonOf = (request: SentRequest): Record<string, unknown> => (request.body ? JSON.parse(request.body) : {});

/** An array of `value` as long as the page actually made the call — the shape a bounded count is asserted against. */
const asManyAs = <T>(count: number, value: T): T[] => Array.from({ length: count }, () => value);

/**
 * Answers one mock path so the lane can produce a state its fallback echo cannot. `remove()` takes the route away
 * again, because two answers for one path would otherwise be settled by Playwright's own route ordering.
 */
async function stubMockCall(
	page: Page,
	path: string,
	answer: { status: number; body: unknown },
	delayMs = 0
): Promise<{ remove: () => Promise<void> }> {
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname === path;
	await page.route(matcher, async (route) => {
		if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
		await route.fulfill({ status: answer.status, headers: CORS_HEADERS, json: answer.body });
	});
	return { remove: () => page.unroute(matcher) };
}

/** One `IAccountDeletionVerifyResponse` (`core/lib/auth/account-deletion.ts:89-100`): two accounts, one sole admin. */
function previewBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		email: 'j***@example.com',
		expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
		planHash: 'probe-plan-hash',
		accounts: [
			{
				workspace: 'Fixture Workspace A',
				role: 'ADMIN',
				organizations: ['Fixture Organization A'],
				otherMembers: 2,
				outcome: 'account-removed',
				soleAdmin: true
			},
			{
				workspace: 'Fixture Workspace B',
				role: 'EMPLOYEE',
				organizations: ['Fixture Organization B'],
				otherMembers: 0,
				outcome: 'workspace-deleted'
			}
		],
		...overrides
	};
}

const emailField = (page: Page) => page.locator('#delete-account-email');
const fieldError = (page: Page) => page.locator('#delete-account-email-error');
const requestForm = (page: Page) => page.locator('[data-testid="delete-account-request"]');
const sendButton = (page: Page) => page.getByRole('button', { name: TEXT.sendLink });
const sentPanel = (page: Page) => page.locator('[data-testid="delete-account-request-sent"]');
const confirmForm = (page: Page) => page.locator('[data-testid="delete-account-confirm"]');
const submitDelete = (page: Page) => page.locator('[data-testid="delete-account-submit"]');
const understoodBox = (page: Page) => page.locator('[data-testid="delete-account-understood"]');
const wordField = (page: Page) => page.locator('#delete-account-word');
const invalidPanel = (page: Page) => page.locator('[data-testid="delete-account-invalid"]');
const errorPanel = (page: Page) => page.locator('[data-testid="delete-account-error"]');
const deletedPanel = (page: Page) => page.locator('[data-testid="delete-account-deleted"]');
const planChangedPanel = (page: Page) => page.locator('[data-testid="delete-account-plan-changed"]');
const confirmFailedPanel = (page: Page) => page.locator('[data-testid="delete-account-confirm-failed"]');
const deletionRows = (page: Page) => page.locator('[data-testid="delete-account-row"]');
/** The header's language pill; `first()` because a "shown" check must not care how many nodes carry the word. */
const languagePill = (page: Page) => page.locator('header').getByText('English', { exact: true });

/** Checks the box and types the word — the two halves of `confirmed` a person can supply (`delete-account-confirm.tsx:84`). */
async function armConfirm(page: Page): Promise<void> {
	await understoodBox(page).click();
	await wordField(page).fill(CONFIRM_WORD);
	await expect(submitDelete(page)).toBeEnabled({ timeout: 15_000 });
}

test.describe('lane-c · the three "open the link from the e-mail" pages', () => {
	test.afterEach(async () => {
		// `fails`, `drops` and `delays` outlive a test unless the mock is reset: `setScenario` shallow-merges them and
		// `delays` accumulates across calls (`playwright/helpers.ts:136-141`, mock-gauzy-server.mjs:1296-1301).
		await mockReset();
	});

	test('A · /delete-account: what the form shows, and that it asks the API for nothing until a submit', async ({
		page,
		mock,
		shield
	}) => {
		const sent = recordRequests(page);
		const response = await page.goto(`${APP_ORIGIN}/delete-account`, { waitUntil: 'domcontentloaded' });
		await emailField(page).waitFor({ timeout: 30_000 });
		await expect(requestForm(page)).toHaveCount(1);

		const meta = await page.evaluate(() => {
			const pick = (name: string) =>
				document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;
			return { referrer: pick('referrer'), robots: pick('robots'), title: document.title };
		});
		measure('A · form shown, headers, and no call yet', {
			status: response?.status(),
			url: page.url(),
			responseHeaders: {
				'referrer-policy': response?.headers()['referrer-policy'] ?? null,
				'x-robots-tag': response?.headers()['x-robots-tag'] ?? null
			},
			meta,
			heading: await page.locator('h1').innerText(),
			label: await page.locator('label[for="delete-account-email"]').innerText(),
			inputType: await emailField(page).getAttribute('type'),
			novalidate: await page.locator('form').evaluate((form) => form.getAttribute('novalidate')),
			languagePillText: await languagePill(page).first().innerText(),
			bodyText: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 220),
			consoleErrors: shield.consoleErrors()
		});

		await expect(page.locator('h1'), 'pages.accountDeletion.REQUEST_TITLE').toHaveText(TEXT.requestTitle);
		await expect(emailField(page)).toBeVisible();
		await expect(page.locator('label[for="delete-account-email"]')).toHaveText(TEXT.emailLabel);
		await expect(sendButton(page)).toHaveText(TEXT.sendLink);
		await expect(emailField(page)).toHaveAttribute('type', 'email');
		// `noValidate` on the form (:97), so the browser's own validation never replaces the app's message.
		await expect(page.locator('form')).toHaveAttribute('novalidate', '');
		await expect
			.soft(
				response?.headers()['referrer-policy'],
				'the deletion routes send no Referer, so the token in the address never rides along (next.config.js:115-136)'
			)
			.toBe('no-referrer');
		await expect
			.soft(response?.headers()['x-robots-tag'], 'and they are never indexed (same block)')
			.toBe('noindex, nofollow');
		await expect
			.soft(meta.referrer, 'the page repeats it in <meta name="referrer"> (delete-account/layout.tsx)')
			.toBe('no-referrer');
		await expect.soft(meta.robots, '…and in <meta name="robots">').toBe('noindex, nofollow');
		await expect
			.soft(meta.title, 'the layout adds no title of its own, so the tab keeps the default one')
			.toBe('Home');
		await expect(languagePill(page).first(), 'a public page keeps the language pill').toBeVisible();
		await expect(shield.consoleErrors(), 'a page that was only opened printed no error').toEqual([]);
		await expect(
			await mock.calls(REQUEST_PATH),
			'nothing is asked of the API before the person submits'
		).toHaveLength(0);
		await expect(callsTo(sent, VERIFY_PATH), 'and the confirm endpoints are not probed either').toHaveLength(0);
	});

	test('B · /delete-account: an address the form will not send (empty, malformed), and no call for it', async ({
		page,
		mock,
		shield
	}) => {
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account', { requireShell: false });
		await emailField(page).waitFor({ timeout: 30_000 });

		// Typing into the field only: these pages sit under app-level keyboard shortcuts, so no single-key press here.
		await emailField(page).press('Enter');
		const emptySeen = {
			error: await fieldError(page).innerText(),
			role: await fieldError(page).getAttribute('role'),
			ariaInvalid: await emailField(page).getAttribute('aria-invalid'),
			describedBy: await emailField(page).getAttribute('aria-describedby')
		};
		await expect(fieldError(page), 'an empty submit says form.EMAIL_REQUIRED in the field error slot').toHaveText(
			TEXT.emailRequired
		);
		await expect(fieldError(page)).toHaveAttribute('role', 'alert');
		await expect(emailField(page), 'and marks the field itself invalid (auth-field.tsx:81-82)').toHaveAttribute(
			'aria-invalid',
			'true'
		);
		await expect(emailField(page)).toHaveAttribute('aria-describedby', 'delete-account-email-error');

		await emailField(page).fill('foo');
		await expect(fieldError(page), 'the message cleared as soon as something was typed (:109-112)').toHaveCount(0);
		await sendButton(page).click();
		await expect(fieldError(page), 'a malformed address says auth.field.EMAIL_INVALID').toHaveText(
			TEXT.emailInvalid
		);
		await expect(sentPanel(page), 'and the page is still the form, not the sent state').toHaveCount(0);

		measure('B · refused addresses', {
			...emptySeen,
			malformedError: await fieldError(page).innerText(),
			requestCalls: callsTo(sent, REQUEST_PATH).length,
			mockLog: await mock.requests(),
			consoleErrors: shield.consoleErrors()
		});
		await expect(
			callsTo(sent, REQUEST_PATH),
			'neither address left the browser: emailErrorOf returns before the request (:44-48)'
		).toHaveLength(0);
		await expect(await mock.requests(), 'the test backend was asked nothing at all').toHaveLength(0);
		await expect(shield.consoleErrors(), 'a refused submit is a validation message, not an error').toEqual([]);
	});

	test('C · /delete-account: one valid address, one public request, branding + trimmed address + callbackUrl, signed out and signed in', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account', { requireShell: false });
		await emailField(page).waitFor({ timeout: 30_000 });
		// Spaces on purpose: the body must carry the trimmed value (delete-account-request-form.tsx:43).
		await emailField(page).fill(`  ${EMAIL_ADDRESS}  `);
		await sendButton(page).click();
		await sentPanel(page).waitFor({ timeout: 15_000 });
		const signedOut = callsTo(sent, REQUEST_PATH);

		// The same page signed in: the call is public, so the session must not join it.
		await signInWithFixture(page.context(), fixture, 'A');
		await hardVisit(page, '/delete-account', { requireShell: false });
		await emailField(page).waitFor({ timeout: 30_000 });
		await emailField(page).fill(EMAIL_ADDRESS);
		await sendButton(page).click();
		await sentPanel(page).waitFor({ timeout: 15_000 });
		const allPosts = callsTo(sent, REQUEST_PATH);
		const expectedBody = {
			appName: 'Ever Teams',
			appSignature: 'Ever Teams',
			companyName: 'Ever Co. LTD',
			appLogo: 'https://app.ever.team/assets/ever-teams.png',
			appLink: 'https://ever.team/',
			companyLink: 'https://ever.co/',
			email: EMAIL_ADDRESS,
			callbackUrl: `${APP_ORIGIN}/delete-account/confirm`,
			locale: 'en'
		};

		measure('C · one request, signed out then signed in', {
			posts: allPosts.length,
			origins: allPosts.map((post) => post.origin),
			bodies: allPosts.map((post) => post.body),
			authorizations: allPosts.map((post) => post.authorization),
			tenantIdHeaders: allPosts.map((post) => post.tenantId),
			bearersTheMockSaw: await receivedTokens(REQUEST_PATH),
			sentText: (await sentPanel(page).innerText()).replace(/\s+/g, ' ').slice(0, 220),
			emailFieldAfter: await emailField(page).count(),
			mockLog: await mock.calls(REQUEST_PATH),
			consoleErrors: shield.consoleErrors()
		});

		await expect(signedOut.length, 'exactly one POST for one click').toBe(1);
		expect(signedOut[0].method).toBe('POST');
		expect(
			signedOut[0].origin,
			'direct mode: the test backend gets it, never this app /api/account-deletion/request'
		).toBe(MOCK_API_ORIGIN);
		expect(
			allPosts.map((post) => jsonOf(post)),
			'the body is the e-mail branding + the trimmed address + this app confirm page + the locale, twice over'
		).toEqual(asManyAs(allPosts.length, expectedBody));
		expect(
			allPosts.map((post) => post.authorization),
			'no bearer on either, signed in exactly as signed out (publicPost, account-deletion.service.ts:29-40)'
		).toEqual(asManyAs(allPosts.length, null));
		expect(
			allPosts.map((post) => post.tenantId),
			'…and no tenant-id header either'
		).toEqual(asManyAs(allPosts.length, null));
		await expect(await receivedTokens(REQUEST_PATH), 'the mock recorded no bearer for that path').toEqual([]);
		await expect(sentPanel(page), 'the page then writes out the address it sent to').toContainText(EMAIL_ADDRESS);
		await expect(sentPanel(page)).toContainText(TEXT.sentTitle);
		await expect(sentPanel(page)).toContainText(TEXT.sentMessage);
		await expect(emailField(page), 'the form step is gone (:69-83)').toHaveCount(0);
		await expect(page.getByRole('link', { name: TEXT.backToSignIn })).toHaveAttribute('href', '/auth/passcode');
		await expect(await mock.calls(REQUEST_PATH), 'the mock saw exactly those two POSTs').toHaveLength(
			allPosts.length
		);
		await expect(shield.consoleErrors(), 'a successful request printed no error').toEqual([]);
	});

	test('D · /delete-account: in flight, refused, and what a second submit does and does not send', async ({
		page,
		mock,
		shield
	}) => {
		await mockScenario({ delays: { [REQUEST_PATH]: 2_500 } });
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account', { requireShell: false });
		await emailField(page).waitFor({ timeout: 30_000 });

		await emailField(page).fill(EMAIL_ADDRESS);
		await emailField(page).press('Enter');
		await expect(sendButton(page), 'while the call runs the button is disabled (:122)').toBeDisabled();
		const inFlight = {
			disabled: await sendButton(page).isDisabled(),
			ariaBusy: await sendButton(page).getAttribute('aria-busy'),
			ariaDisabled: await sendButton(page).getAttribute('aria-disabled'),
			label: await sendButton(page).innerText()
		};
		await expect(sendButton(page)).toHaveAttribute('aria-busy', 'true');
		await expect(sendButton(page)).toHaveText(TEXT.sendLink);

		// A person's second Enter while the first call is still running.
		await emailField(page).press('Enter');
		await sentPanel(page).waitFor({ timeout: 20_000 });
		const enterPosts = callsTo(sent, REQUEST_PATH).length;
		await expect(
			enterPosts,
			'the second Enter added nothing: implicit submission stands down for the disabled default button (measured 1, not a guard in the code)'
		).toBe(1);

		// The scripted version, which is what the disabled button is and is not: only the button has the guard.
		await hardVisit(page, '/delete-account', { requireShell: false });
		await emailField(page).waitFor({ timeout: 30_000 });
		await emailField(page).fill(EMAIL_ADDRESS);
		const beforeScripted = callsTo(sent, REQUEST_PATH).length;
		await sendButton(page).click();
		await page.waitForTimeout(400);
		await page.evaluate(() => {
			const form = document.querySelector('form');
			if (!form) throw new Error('no form to submit');
			form.requestSubmit();
			form.requestSubmit();
		});
		await sentPanel(page).waitFor({ timeout: 20_000 });
		const scriptedPosts = callsTo(sent, REQUEST_PATH).length - beforeScripted;

		// And the refusal, on a fresh visit: what the person is left with.
		await hardVisit(page, '/delete-account', { requireShell: false });
		await emailField(page).waitFor({ timeout: 30_000 });
		await mockScenario({ fails: { [REQUEST_PATH]: 429 } });
		await emailField(page).fill(EMAIL_ADDRESS);
		await sendButton(page).click();
		const refusal = page.getByRole('alert').filter({ hasText: TEXT.requestError });
		await expect(refusal, 'a refused request shows pages.accountDeletion.REQUEST_ERROR (:118)').toBeVisible({
			timeout: 15_000
		});
		await expect(sentPanel(page), 'and the page is still the form').toHaveCount(0);
		await expect(sendButton(page), 'the button is usable again').toBeEnabled();
		await expect(emailField(page), 'with the address still typed in it').toHaveValue(EMAIL_ADDRESS);

		const refusals = (await mock.calls(REQUEST_PATH)).filter((call) => call.status === 429);
		measure('D · in flight, second submit, refusal', {
			...inFlight,
			enterPosts,
			scriptedPosts,
			scriptedBodies: callsTo(sent, REQUEST_PATH)
				.slice(beforeScripted)
				.map((post) => post.body),
			refusalStatuses: refusals.map((call) => call.status),
			sentPanelsAtTheEnd: await sentPanel(page).count(),
			consoleErrors: shield.consoleErrors()
		});
		await expect(
			scriptedPosts,
			'form.requestSubmit() while a call runs gets past the disabled button. A bound: the count follows how many times the harness submits, because nothing guards re-entry (delete-account-request-form.tsx:40-53, use-account-deletion.ts:35-53)'
		).toBeGreaterThanOrEqual(2);
		await expect(
			refusals.map((call) => call.status),
			'the 429 came from the mock and is in its log'
		).toEqual([429]);
	});

	test('E · /delete-account on a locale route: the request carries that locale and the confirm URL gains its prefix', async ({
		page,
		mock,
		shield
	}) => {
		const sent = recordRequests(page);
		const response = await page.goto(`${APP_ORIGIN}/fr/delete-account`, { waitUntil: 'domcontentloaded' });
		await emailField(page).waitFor({ timeout: 30_000 });
		// Read the submit label before the submit: the sent state replaces the form it is written on.
		const submitLabel = await page.locator('button[type="submit"]').first().innerText();
		await emailField(page).fill(EMAIL_ADDRESS);
		await page.locator('button[type="submit"]').click();
		await sentPanel(page).waitFor({ timeout: 15_000 });

		const posts = callsTo(sent, REQUEST_PATH);
		measure('E · fr locale', {
			status: response?.status(),
			url: page.url(),
			heading: await page.locator('h1').innerText(),
			submitLabel,
			bodies: posts.map((post) => post.body),
			sentText: (await sentPanel(page).innerText()).replace(/\s+/g, ' ').slice(0, 220),
			mockLog: await mock.calls(REQUEST_PATH),
			consoleErrors: shield.consoleErrors()
		});

		await expect(page.locator('h1'), 'the page itself answers in French').not.toHaveText(TEXT.requestTitle);
		await expect(sentPanel(page), '…including its sent state').not.toContainText(TEXT.sentTitle);
		expect(posts.length, 'one POST').toBe(1);
		const body = jsonOf(posts[0]);
		expect(body.locale, 'the visitor locale travels (use-account-deletion.ts:42-45)').toBe('fr');
		expect(body.callbackUrl, 'and the confirm URL gains the locale prefix (account-deletion.ts:39-44)').toBe(
			`${APP_ORIGIN}/fr/delete-account/confirm`
		);
		expect(body.email, 'the address is unchanged').toBe(EMAIL_ADDRESS);
		expect(body.appName, 'and so is the branding').toBe('Ever Teams');
		await expect(page, 'the person is not moved off the locale route').toHaveURL(`${APP_ORIGIN}/fr/delete-account`);
		await expect(await mock.calls(REQUEST_PATH)).toHaveLength(1);
	});

	test('F · /delete-account/confirm with nothing to open: the dead-link answer, and not one call', async ({
		page,
		mock,
		shield
	}) => {
		const targets = [
			'/delete-account/confirm',
			'/delete-account/confirm#token=',
			'/delete-account/confirm#other=1'
		];
		const readings: Array<{ target: string; invalid: number; calls: number; mockLog: number }> = [];
		for (const target of targets) {
			const sent = recordRequests(page);
			await hardVisit(page, target, { requireShell: false });
			await expect(
				invalidPanel(page),
				`${target}: no usable token, so the link answer (delete-account-confirm.tsx:234-236 → InvalidLink)`
			).toBeVisible({ timeout: 15_000 });
			await expect(
				callsTo(sent, VERIFY_PATH),
				`${target}: the hook asks nothing without a token (use-account-deletion.ts:143)`
			).toHaveLength(0);
			readings.push({
				target,
				invalid: await invalidPanel(page).count(),
				calls: callsTo(sent, VERIFY_PATH).length + callsTo(sent, CONFIRM_PATH).length,
				mockLog: (await mock.requests()).length
			});
		}

		const last = readings[readings.length - 1];
		measure('F · no token', {
			readings,
			lastTarget: last.target,
			url: page.url(),
			invalidTitle: await invalidPanel(page).getByRole('heading').innerText(),
			invalidBody: (await invalidPanel(page).innerText()).replace(/\s+/g, ' ').slice(0, 200),
			languagePillCount: await languagePill(page).count(),
			deletionCalls: last.calls,
			mockLog: await mock.requests(),
			consoleErrors: shield.consoleErrors()
		});

		await expect(invalidPanel(page).getByRole('heading')).toHaveText(TEXT.invalidTitle);
		await expect(invalidPanel(page)).toContainText(TEXT.invalidLink);
		await expect(
			page.getByRole('link', { name: TEXT.requestNewLink }),
			'its repair is a link back to the request form (ACCOUNT_DELETION_PATH, account-deletion.ts:16)'
		).toHaveAttribute('href', '/delete-account');
		await expect(
			languagePill(page).first(),
			'a dead link shows the language pill again (hideLanguageSwitcher, :285)'
		).toBeVisible();
		await expect(
			(await deletedPanel(page).count()) + (await confirmForm(page).count()),
			'no preview and no success'
		).toBe(0);
		expect(
			readings.map((reading) => reading.calls),
			'every shape of it — no fragment, an empty #token=, a fragment that is not a token — asked the API nothing'
		).toEqual([0, 0, 0]);
		expect(
			readings.map((reading) => reading.mockLog),
			'…and the test backend recorded nothing either'
		).toEqual([0, 0, 0]);
		await expect(shield.consoleErrors(), 'an absent token is not an error').toEqual([]);
	});

	test('G · a token in the query is dropped and never used, and every other parameter is kept', async ({
		page,
		mock,
		shield
	}) => {
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account/confirm?token=probe-query-token&keep=1', { requireShell: false });
		await expect(
			invalidPanel(page),
			'a query token counts as already exposed (account-deletion.ts:48-54)'
		).toBeVisible({
			timeout: 15_000
		});

		measure('G · token in the query', {
			url: page.url(),
			search: new URL(page.url()).search,
			documentQuery: sent.find((request) => request.path === '/delete-account/confirm')?.search ?? null,
			deletionCalls: callsTo(sent, VERIFY_PATH).length + callsTo(sent, CONFIRM_PATH).length,
			mockLog: await mock.requests(),
			consoleErrors: shield.consoleErrors()
		});

		await expect(page).toHaveURL(`${APP_ORIGIN}/delete-account/confirm?keep=1`);
		expect(new URL(page.url()).searchParams.has('token'), 'the token left the address (:64-69)').toBe(false);
		expect(
			sent.find((request) => request.path === '/delete-account/confirm')?.search,
			'the document the SERVER was asked for did get the token, and the page removed it rather than use it'
		).toBe('token=probe-query-token&keep=1');
		await expect(callsTo(sent, VERIFY_PATH), 'and it was never sent on: no verify call').toHaveLength(0);
		await expect(await mock.requests(), 'so the test backend recorded nothing').toHaveLength(0);
	});

	test('H · a real fragment token: what is shown, what is sent, and everywhere the token does not appear', async ({
		page,
		mock,
		shield
	}) => {
		const token = 'SWEPT-DELETE-TOKEN-99';
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		const sent = recordRequests(page);
		await hardVisit(page, `/delete-account/confirm#token=${token}`, { requireShell: false });
		await expect(confirmForm(page), 'the preview of what would be deleted').toBeVisible({ timeout: 20_000 });

		const verifyPosts = callsTo(sent, VERIFY_PATH);
		const documentRequest = sent.find((request) => request.path === '/delete-account/confirm');
		const logCalls = callsTo(sent, LOG_PATH);
		const logsWithToken = logCalls.filter((request) => String(request.body).includes(token));
		const mockLog = await mock.requests();
		const pageText = await page.locator('body').innerText();

		measure('H · fragment token, where it did and did not go', {
			url: page.url(),
			hash: await page.evaluate(() => window.location.hash),
			documentSearch: documentRequest?.search ?? null,
			documentSearchHasToken: String(documentRequest?.search ?? '').includes(token),
			verifyPosts: verifyPosts.length,
			verifyBodies: verifyPosts.map((post) => post.body),
			verifyOrigins: verifyPosts.map((post) => post.origin),
			rows: await deletionRows(page).count(),
			soleAdminRows: await page.locator('[data-testid="delete-account-sole-admin"]').count(),
			expiryLineShown: await page.getByText('The link expires at', { exact: false }).count(),
			logCallsTotal: logCalls.length,
			logBodiesWithToken: logsWithToken.length,
			pageTextHasToken: pageText.includes(token),
			consoleLinesWithToken: shield.logMatching(new RegExp(token)).length,
			mockLogEntries: mockLog.length,
			bearersAtVerify: await receivedTokens(VERIFY_PATH),
			languagePillCount: await languagePill(page).count(),
			stubbed: 'verify',
			consoleErrors: shield.consoleErrors()
		});

		await expect(page).toHaveURL(`${APP_ORIGIN}/delete-account/confirm`);
		expect(await page.evaluate(() => window.location.hash), 'the fragment is gone before the page settles').toBe(
			''
		);
		expect(documentRequest?.search ?? '', 'the address the SERVER was given carried no query at all').toBe('');
		expect(
			verifyPosts.length,
			'the read happened. 1..2: Strict Mode re-runs the mount effect (use-account-deletion.ts:169-177)'
		).toBeGreaterThanOrEqual(1);
		expect(verifyPosts.length, '…and at most twice').toBeLessThanOrEqual(2);
		expect(
			verifyPosts.map((post) => post.body),
			'the token travels only in the verify body, with nothing else in it (account-deletion.service.ts:56-58)'
		).toEqual(asManyAs(verifyPosts.length, JSON.stringify({ token })));
		expect(
			verifyPosts.map((post) => post.origin),
			'to the test backend'
		).toEqual(asManyAs(verifyPosts.length, MOCK_API_ORIGIN));
		expect(
			verifyPosts.map((post) => post.authorization),
			'with no session on it'
		).toEqual(asManyAs(verifyPosts.length, null));
		expect(
			logsWithToken.length,
			'no /api/log body carries it — the deletion calls bypass APIService (account-deletion.service.ts:22-28)'
		).toBe(0);
		expect(pageText.includes(token), 'it is not drawn on screen either').toBe(false);
		expect(shield.logMatching(new RegExp(token)).length, 'nor printed to the console').toBe(0);
		expect(
			mockLog.length,
			'and the test backend recorded nothing for this visit at all — every answer here was a stub. Case O pins what an entry it really records looks like: no body field.'
		).toBe(0);
		expect(await receivedTokens(VERIFY_PATH), 'and it never held a bearer for that path').toEqual([]);

		await expect(page.locator('h1'), 'the preview names the deletion').toHaveText(TEXT.confirmTitle);
		await expect(page.getByText(TEXT.introMasked), 'the masked address, exactly as verify answered it').toHaveCount(
			1
		);
		await expect(deletionRows(page)).toHaveCount(2);
		await expect(page.getByText(TEXT.membersKept, { exact: false }).first()).toBeVisible();
		await expect(page.getByText(TEXT.soleAdminWarning, { exact: false }).first()).toBeVisible();
		await expect(page.getByText(TEXT.workspaceDeleted, { exact: false }).first()).toBeVisible();
		await expect(
			page.getByText('The link expires at', { exact: false }).first(),
			'and the expiry, formatted from the preview expiresAt (:125-131)'
		).toBeVisible();
		await expect(
			languagePill(page),
			'while the page holds a token the language pill is hidden, because switching locale would remount it (:285)'
		).toHaveCount(0);
		expect(
			await receivedTokens(CONFIRM_PATH),
			'nothing was deleted in this case, so no path ever saw a session'
		).toEqual([]);
	});

	test('I · the confirm gate: no deletion call until the box, the word and the planHash are all there', async ({
		page,
		mock,
		shield
	}) => {
		const preview = await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account/confirm#token=probe-gate-token', { requireShell: false });
		await expect(confirmForm(page)).toBeVisible({ timeout: 20_000 });

		const gateAtOpen = {
			submitDisabled: await submitDelete(page).isDisabled(),
			wordLabel: await page.locator('label[for="delete-account-word"]').innerText(),
			placeholder: await wordField(page).getAttribute('placeholder'),
			boxRole: await understoodBox(page).getAttribute('role'),
			boxChecked: await understoodBox(page).getAttribute('aria-checked'),
			submitLabel: await submitDelete(page).innerText(),
			keepHref: await page.getByRole('link', { name: TEXT.keepAccount }).getAttribute('href')
		};
		await expect(submitDelete(page), 'nothing is confirmed yet (:84,190)').toBeDisabled();
		await expect(submitDelete(page)).toHaveText(TEXT.confirmButton);
		await expect(page.getByRole('link', { name: TEXT.keepAccount })).toHaveAttribute('href', '/auth/passcode');
		await expect(
			page.getByText(TEXT.confirmCheckbox).first(),
			'the box spells out what it deletes (:136-143)'
		).toBeVisible();
		await expect(
			page.locator('label[for="delete-account-word"]'),
			'and names the word to type (:146-163)'
		).toHaveText(TEXT.typeToConfirm);

		await understoodBox(page).click();
		await expect(submitDelete(page), 'the box alone is not enough').toBeDisabled();
		await wordField(page).fill('deleteMe');
		await expect(submitDelete(page), 'nor a word that is not the word').toBeDisabled();
		await wordField(page).fill('delete');
		await expect(submitDelete(page), 'the word is matched case-insensitively (:80-81)').toBeEnabled();
		await wordField(page).fill(' DELETE ');
		await expect(submitDelete(page), '…and trimmed').toBeEnabled();

		// Uncheck the box and submit the form directly: the handler itself refuses it (:92-95).
		await wordField(page).fill(CONFIRM_WORD);
		await understoodBox(page).click();
		await confirmForm(page).evaluate((form) => (form as HTMLFormElement).requestSubmit());
		await page.waitForTimeout(700);
		const withoutBox = callsTo(sent, CONFIRM_PATH).length;
		await expect(withoutBox, 'the form refuses a submit its own gates have not passed').toBe(0);

		// A preview without a planHash cannot be deleted at all, not even from the button.
		await preview.remove();
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: { ...previewBody(), planHash: undefined } });
		await hardVisit(page, '/delete-account/confirm#token=probe-nohash-token', { requireShell: false });
		await expect(confirmForm(page), 'the preview still shows (the accounts are there)').toBeVisible({
			timeout: 20_000
		});
		await expect(deletionRows(page), 'the accounts are listed, only the planHash is missing').toHaveCount(2);
		await understoodBox(page).click();
		await wordField(page).fill(CONFIRM_WORD);
		await expect(
			submitDelete(page),
			'no planHash, no confirmation (:83-84): the person cannot even click it'
		).toBeDisabled();
		await submitDelete(page).click({ force: true });
		await page.waitForTimeout(700);
		const noHash = callsTo(sent, CONFIRM_PATH).length;
		await expect(noHash, 'and the hook would refuse it too (use-account-deletion.ts:205-209)').toBe(0);
		await expect(deletedPanel(page), 'nothing was deleted').toHaveCount(0);

		measure('I · confirm gate', {
			...gateAtOpen,
			withoutBoxConfirmCalls: withoutBox,
			noHashConfirmCalls: noHash,
			confirmCallsTotal: callsTo(sent, CONFIRM_PATH).length,
			mockConfirmLog: await mock.calls(CONFIRM_PATH),
			consoleErrors: shield.consoleErrors()
		});
		await expect(await mock.calls(CONFIRM_PATH), 'the mock was never asked to delete anything').toHaveLength(0);
	});

	test('J · success, signed out: the copy, the person stays put, and no session call is even made', async ({
		page,
		mock,
		shield
	}) => {
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		await stubMockCall(page, CONFIRM_PATH, {
			status: 200,
			body: { deleted: true, accounts: 2, workspacesDeleted: 1 }
		});
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account/confirm#token=probe-signedout-token', { requireShell: false });
		await expect(confirmForm(page)).toBeVisible({ timeout: 20_000 });
		await armConfirm(page);
		await submitDelete(page).click();
		await expect(deletedPanel(page)).toBeVisible({ timeout: 20_000 });

		measure('J · success signed out', {
			url: page.url(),
			deletedText: (await deletedPanel(page).innerText()).replace(/\s+/g, ' ').slice(0, 220),
			signedOutLine: await page.getByText(TEXT.signedOut).count(),
			userMeCalls: callsTo(sent, USER_ME_PATH).length,
			confirmPosts: callsTo(sent, CONFIRM_PATH).length,
			confirmBodies: callsTo(sent, CONFIRM_PATH).map((post) => post.body),
			confirmAuthorizations: callsTo(sent, CONFIRM_PATH).map((post) => post.authorization),
			backHref: await page.getByRole('link', { name: TEXT.backToSignIn }).getAttribute('href'),
			languagePillCount: await languagePill(page).count(),
			stubbed: 'verify,confirm',
			consoleErrors: shield.consoleErrors()
		});

		await expect(deletedPanel(page).getByRole('heading')).toHaveText(TEXT.doneTitle);
		await expect(deletedPanel(page)).toContainText(TEXT.deletedAccounts);
		await expect(deletedPanel(page)).toContainText(TEXT.deletedConfirmation);
		await expect(
			page.getByText(TEXT.signedOut),
			'no sign-out line: with no token cookie there was nothing to clear (delete-account-confirm.tsx:276)'
		).toHaveCount(0);
		await expect(page, 'the person is not redirected: the success panel is where they stay').toHaveURL(
			`${APP_ORIGIN}/delete-account/confirm`
		);
		await expect(
			callsTo(sent, USER_ME_PATH),
			'signed out, clearSessionIfAccountGone returns before any fetch (use-account-deletion.ts:70-71)'
		).toHaveLength(0);
		expect(
			callsTo(sent, CONFIRM_PATH).map((post) => post.body),
			'the confirm body is the token + the confirmation only the app can add + the preview planHash (account-deletion.service.ts:64-70)'
		).toEqual([JSON.stringify({ token: 'probe-signedout-token', confirm: true, planHash: 'probe-plan-hash' })]);
		expect(
			callsTo(sent, CONFIRM_PATH).map((post) => post.authorization),
			'and it carried no session'
		).toEqual([null]);
		expect(await receivedTokens(CONFIRM_PATH), 'the mock recorded no bearer for it').toEqual([]);
		await expect(
			page.getByRole('link', { name: TEXT.backToSignIn }),
			'its way out is the sign-in page (DEFAULT_APP_PATH, :271-274)'
		).toHaveAttribute('href', '/auth/passcode');
		await expect(languagePill(page).first(), 'the pill returns once the phase is deleted (:285)').toBeVisible();
		await expect(
			await mock.requests(),
			'every answer in this case was a stub, so the mock recorded nothing at all'
		).toHaveLength(0);
		await expect(shield.consoleErrors(), 'a clean deletion printed no error').toEqual([]);
	});

	test('K · success, signed in, the session still answers 200: one no-query check, nothing cleared', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		await stubMockCall(page, CONFIRM_PATH, {
			status: 200,
			body: { deleted: true, accounts: 2, workspacesDeleted: 1 }
		});
		await signInWithFixture(page.context(), fixture, 'A');
		const written = authCookieNames(fixture, 'A').map(([name]) => name);
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account/confirm#token=probe-signed-token', { requireShell: false });
		await expect(confirmForm(page)).toBeVisible({ timeout: 20_000 });
		await armConfirm(page);
		await submitDelete(page).click();
		await expect(deletedPanel(page)).toBeVisible({ timeout: 20_000 });

		const clearChecks = callsTo(sent, USER_ME_PATH).filter((call) => call.search === '');
		const sessionReads = callsTo(sent, USER_ME_PATH).filter((call) => call.search !== '');
		const cookieNames = new Set((await page.context().cookies()).map((cookie) => cookie.name));
		const stillThere = written.filter((name) => cookieNames.has(name));

		measure('K · success signed in, session answers 200', {
			url: page.url(),
			signedOutLine: await page.getByText(TEXT.signedOut).count(),
			clearCheckCalls: clearChecks.length,
			clearCheckOrigins: clearChecks.map((call) => call.origin),
			clearCheckBearer: clearChecks.map((call) => String(call.authorization ?? 'none').slice(0, 12)),
			sessionReadCalls: sessionReads.length,
			sessionReadQueries: sessionReads.map((call) => call.search),
			deletionAuthorizations: [...callsTo(sent, VERIFY_PATH), ...callsTo(sent, CONFIRM_PATH)].map(
				(call) => call.authorization
			),
			writtenCookies: written,
			cookiesStillThere: stillThere,
			bearersAtUserMe: await receivedTokens(USER_ME_PATH),
			userMeLog: await mock.calls(USER_ME_PATH),
			stubbed: 'verify,confirm',
			consoleErrors: shield.consoleErrors()
		});

		await expect(
			clearChecks,
			'the check ran exactly once: one GET /api/user/me with no query (use-account-deletion.ts:74-80)'
		).toHaveLength(1);
		expect(clearChecks[0].origin, 'in direct mode that is the test backend, not this app /api/user/me').toBe(
			MOCK_API_ORIGIN
		);
		expect(String(clearChecks[0].authorization ?? ''), 'and it carries the bearer this browser holds').toMatch(
			/^Bearer /
		);
		await expect(
			sessionReads.length,
			'the app own session read is a different call, with its relations query (user.service.ts:61-75)'
		).not.toBe(0);
		expect(
			sessionReads.map((call) => call.search),
			'every session read carries the relations query'
		).toEqual(asManyAs(sessionReads.length, 'relations%5B0%5D=role&relations%5B1%5D=tenant&includeEmployee=true'));
		await expect(
			[...callsTo(sent, VERIFY_PATH), ...callsTo(sent, CONFIRM_PATH)].map((call) => call.authorization),
			'while the deletion calls themselves still carry nothing, signed in'
		).toEqual(asManyAs(callsTo(sent, VERIFY_PATH).length + callsTo(sent, CONFIRM_PATH).length, null));
		await expect(
			page.getByText(TEXT.signedOut),
			'a 200 answer proves nothing, so nothing was dropped and no line appears (use-account-deletion.ts:81-83)'
		).toHaveCount(0);
		expect(stillThere, 'every session cookie the sign-in wrote is still there, the access token included').toEqual(
			written
		);
		expect(cookieNames.has('auth-token'), 'including auth-token').toBe(true);
		expect(
			await receivedTokens(USER_ME_PATH),
			'the mock recorded the bearer it was given (as a sha256, never the token)'
		).not.toHaveLength(0);
		await expect(page, 'and still no redirect').toHaveURL(`${APP_ORIGIN}/delete-account/confirm`);
		await expect(shield.consoleErrors(), 'nothing errored').toEqual([]);
	});

	test('L · success, signed in, that check refused 404: the cookies go and the page says so', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		await stubMockCall(page, CONFIRM_PATH, {
			status: 200,
			body: { deleted: true, accounts: 1, workspacesDeleted: 1 }
		});
		await mockScenario({ fails: { [USER_ME_PATH]: 404 } });
		await signInWithFixture(page.context(), fixture, 'A');
		const written = authCookieNames(fixture, 'A').map(([name]) => name);
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account/confirm#token=probe-clearme-token', { requireShell: false });
		await expect(confirmForm(page)).toBeVisible({ timeout: 20_000 });
		await armConfirm(page);
		await submitDelete(page).click();
		await expect(deletedPanel(page)).toBeVisible({ timeout: 20_000 });

		const cookieNames = (await page.context().cookies()).map((cookie) => cookie.name);
		const survivingFixtureCookies = cookieNames.filter((name) => written.includes(name));
		const clearChecks = callsTo(sent, USER_ME_PATH).filter((call) => call.search === '');

		measure('L · success signed in, session refused 404', {
			url: page.url(),
			signedOutLine: await page.getByText(TEXT.signedOut).count(),
			clearCheckCalls: clearChecks.length,
			writtenCookies: written,
			survivingFixtureCookies,
			otherCookiesLeft: cookieNames.filter((name) => !written.includes(name)),
			deletionAuthorizations: [...callsTo(sent, VERIFY_PATH), ...callsTo(sent, CONFIRM_PATH)].map(
				(call) => call.authorization
			),
			userMeLog: await mock.calls(USER_ME_PATH),
			stubbed: 'verify,confirm',
			consoleErrors: shield.consoleErrors()
		});

		await expect(
			page.getByText(TEXT.signedOut),
			'a refused token is conclusive, so the session is dropped and the page says pages.accountDeletion.SIGNED_OUT'
		).toHaveCount(1);
		await expect(clearChecks, 'the check that decided it ran once').toHaveLength(1);
		expect(
			survivingFixtureCookies,
			'removeAuthCookies cleared 9 of the 10 cookies and left auth-active-project, which cookiesKeys() does not name (cookies/index.ts:271-284,306-314) — MEASURED, NOT INTENDED'
		).toEqual(['auth-active-project']);
		expect(survivingFixtureCookies.includes('auth-token'), 'the access token is gone').toBe(false);
		expect(survivingFixtureCookies.includes('auth-refresh-token'), 'and so is the refresh token').toBe(false);
		await expect(page, 'still no redirect: the person reads the result on the same address').toHaveURL(
			`${APP_ORIGIN}/delete-account/confirm`
		);
		await expect(
			(await mock.calls(USER_ME_PATH)).filter((call) => call.status === 404).length,
			'the 404 came from the mock and is in its log'
		).not.toBe(0);
		// [mock limit] `scenario.fails` is addressed by path (mock-gauzy-server.mjs:1158-1163), so arming the
		// deletion check's `/api/user/me` also refuses the app's own session read — and the app logs every refused
		// call at ERROR level (api.service.ts:274,310 → logError :439-474 → logger-adapter.service.ts:205-214,223-239).
		// What this case can pin is that nothing else went wrong in the console.
		await expect(
			shield.consoleErrors().filter((line) => !/HTTP Error: GET \/user\/me/.test(line)),
			'the only console errors are the app logging the refused session read the arm caused'
		).toEqual([]);
		await expect(
			shield.logMatching(/HTTP Error: GET \/user\/me/).length,
			'and it does log that refusal, 404 → LogLevel.ERROR (logger-adapter.service.ts:223-239)'
		).toBeGreaterThanOrEqual(1);
	});

	test('M · a dead link is a 410: on the preview read, and in place of the success on the confirm step', async ({
		page,
		mock
	}) => {
		await mockScenario({ fails: { [VERIFY_PATH]: 410 } });
		await hardVisit(page, '/delete-account/confirm#token=probe-410-token', { requireShell: false });
		await expect(
			invalidPanel(page),
			'410 is the only status that means the link is dead (use-account-deletion.ts:148, account-deletion.service.ts:101-105)'
		).toBeVisible({ timeout: 15_000 });
		const verifyRefusals = (await mock.calls(VERIFY_PATH)).filter((call) => call.status === 410);

		// The same answer at the other end: after the confirmation, 410 replaces the success panel.
		await mockReset();
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		await mockScenario({ fails: { [CONFIRM_PATH]: 410 } });
		await hardVisit(page, '/delete-account/confirm#token=probe-410-confirm', { requireShell: false });
		await expect(confirmForm(page)).toBeVisible({ timeout: 20_000 });
		await armConfirm(page);
		await submitDelete(page).click();
		await expect(
			invalidPanel(page),
			'the dead-link answer instead of the success (use-account-deletion.ts:226-230)'
		).toBeVisible({
			timeout: 15_000
		});

		measure('M · 410 at both ends', {
			firstReadRefusals: verifyRefusals.map((call) => call.status),
			confirmRefusals: (await mock.calls(CONFIRM_PATH)).map((call) => call.status),
			deletedPanels: await deletedPanel(page).count(),
			confirmPanels: await confirmForm(page).count(),
			invalidTitles: await page.getByRole('heading', { name: TEXT.invalidTitle }).count(),
			errorPanels: await errorPanel(page).count(),
			newLinkHref: await page.getByRole('link', { name: TEXT.requestNewLink }).getAttribute('href')
		});

		expect(
			verifyRefusals.length,
			'the 410 read reached the mock. 1..2, Strict Mode again (use-account-deletion.ts:169-177)'
		).toBeGreaterThanOrEqual(1);
		expect(verifyRefusals.map((call) => call.status)).toEqual(asManyAs(verifyRefusals.length, 410));
		expect(await deletedPanel(page).count(), 'the second visit deleted nothing and shows no success panel').toBe(0);
		await expect(await confirmForm(page).count(), '…and the confirm form went with the token it was holding').toBe(
			0
		);
		await expect(errorPanel(page), 'a 410 is not shown as an outage').toHaveCount(0);
		await expect(page.getByRole('link', { name: TEXT.requestNewLink })).toHaveAttribute('href', '/delete-account');
	});

	test('N · an outage while checking the link: the retry answer, and a Try again that re-reads the same token', async ({
		page,
		mock
	}) => {
		await mockScenario({ fails: { [VERIFY_PATH]: 503 } });
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account/confirm#token=probe-503-token', { requireShell: false });
		await expect(
			errorPanel(page),
			'a 5xx is transient, not a dead link (use-account-deletion.ts:113-114,148)'
		).toBeVisible({
			timeout: 15_000
		});
		await expect(errorPanel(page)).toContainText(TEXT.genericError);
		await expect(invalidPanel(page), 'and it is not the dead-link answer').toHaveCount(0);
		const refused = (await mock.calls(VERIFY_PATH)).filter((call) => call.status === 503);
		// The card's two repairs, read while the card is up: `Try again` replaces it with the preview.
		await expect(
			page.getByRole('link', { name: TEXT.requestNewLink }),
			'the outage card offers both repairs (delete-account-confirm.tsx:244-252)'
		).toHaveAttribute('href', '/delete-account');
		await expect(page.getByRole('button', { name: TEXT.tryAgain })).toHaveCount(1);

		await mockReset();
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		await page.getByRole('button', { name: TEXT.tryAgain }).click();
		await expect(confirmForm(page), 'Try again re-reads with the same token (:250 → verify)').toBeVisible({
			timeout: 20_000
		});

		measure('N · outage, then retry', {
			refusedReads: refused.map((call) => call.status),
			browserVerifyCalls: callsTo(sent, VERIFY_PATH).length,
			browserVerifyBodies: callsTo(sent, VERIFY_PATH).map((call) => call.body),
			previewRowsAfterRetry: await deletionRows(page).count(),
			errorPanelAfterRetry: await errorPanel(page).count(),
			mockLog: await mock.requests(),
			stubbed: 'verify (after the retry)'
		});

		expect(refused.length, 'the 503s the mock gave are in its log. 1..2, Strict Mode').toBeGreaterThanOrEqual(1);
		expect(refused.map((call) => call.status)).toEqual(asManyAs(refused.length, 503));
		await expect(
			callsTo(sent, VERIFY_PATH).map((call) => call.body),
			'every read the browser made used the token it was given, and none of it carried a session'
		).toEqual(asManyAs(callsTo(sent, VERIFY_PATH).length, JSON.stringify({ token: 'probe-503-token' })));
		await expect(
			deletionRows(page),
			'after the retry the same preview is shown, token still in memory'
		).toHaveCount(2);
		await expect(errorPanel(page), 'and the outage card is gone').toHaveCount(0);
	});

	test('O · a cut connection, a 403, and the mock echo: none of them is a dead link, except the echo', async ({
		page,
		mock
	}) => {
		await mockScenario({ drops: { [VERIFY_PATH]: 1 } });
		await hardVisit(page, '/delete-account/confirm#token=probe-dropped-token', { requireShell: false });
		await expect(
			errorPanel(page),
			'a dropped socket is the retry answer (use-account-deletion.ts:147-149)'
		).toBeVisible({
			timeout: 20_000
		});
		const cut = (await mock.calls(VERIFY_PATH)).filter((call) => call.status === 0);
		await expect(
			cut.length,
			'the mock recorded the cut call with status 0 (mock-gauzy-server.mjs:1127-1132,1197-1198), which no refusal writes'
		).toBeGreaterThanOrEqual(1);

		await mockReset();
		await mockScenario({ fails: { [VERIFY_PATH]: 403 } });
		await hardVisit(page, '/delete-account/confirm#token=probe-403-token', { requireShell: false });
		await expect(
			errorPanel(page),
			'a 403 is not the API dead-link answer either, so the person is told to retry (account-deletion.service.ts:101-105)'
		).toBeVisible({ timeout: 15_000 });
		await expect(invalidPanel(page)).toHaveCount(0);
		const refusals = (await mock.calls(VERIFY_PATH)).filter((call) => call.status === 403);

		await mockReset();
		// [mock limit] the lane mock answers an unmatched POST by echoing its body (mock-gauzy-server.mjs:893-894). A 200
		// `{token}` is a preview with no accounts, which the hook reads as a dead link (use-account-deletion.ts:146).
		await hardVisit(page, '/delete-account/confirm#token=probe-echo-token', { requireShell: false });
		await expect(
			invalidPanel(page),
			'[mock limit] the echoed answer is not a preview, so the link reads as dead'
		).toBeVisible({
			timeout: 15_000
		});
		const echoes = await mock.calls(VERIFY_PATH);

		measure('O · outage readings', {
			cutStatuses: cut.map((call) => call.status),
			fourtyThreeStatuses: refusals.map((call) => call.status),
			echoStatuses: echoes.map((call) => call.status),
			echoRecordKeys: echoes.map((entry) => Object.keys(entry).sort()),
			echoRecordHoldsToken: echoes.some((entry) => JSON.stringify(entry).includes('probe-echo-token')),
			bearersAtVerify: await receivedTokens(VERIFY_PATH),
			errorPanelsAfterEcho: await errorPanel(page).count(),
			invalidPanelsAfterEcho: await invalidPanel(page).count(),
			deletedPanels: await deletedPanel(page).count()
		});

		expect(refusals.length, 'and the 403s are in the log with their status').toBeGreaterThanOrEqual(1);
		expect(echoes.length, 'the echo calls reached the mock too').toBeGreaterThanOrEqual(1);
		expect(
			echoes.map((call) => call.status),
			'each answered 200 by the fallback echo'
		).toEqual(asManyAs(echoes.length, 200));
		// The one place in this file where a body carrying a token really arrived at the test backend: what it kept
		// is method/path/query/timing/status, with no body field and no trace of the token (`token` is not a key there).
		expect(
			echoes.map((entry) => Object.keys(entry).sort()),
			'the mock records no body for a call it answered'
		).toEqual(asManyAs(echoes.length, ['endMs', 'method', 'path', 'query', 'startMs', 'status']));
		expect(
			echoes.some((entry) => JSON.stringify(entry).includes('probe-echo-token')),
			'and the token it was sent with is nowhere in that record'
		).toBe(false);
		expect(await receivedTokens(VERIFY_PATH), '…and no bearer was recorded for that path either').toEqual([]);
		expect(await deletedPanel(page).count(), 'none of these three deleted anything').toBe(0);
	});

	test('P · a 409 on confirm: nothing deleted, the plan re-read, and the box and the word cleared', async ({
		page,
		mock
	}) => {
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		await mockScenario({ fails: { [CONFIRM_PATH]: 409 } });
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account/confirm#token=probe-409-token', { requireShell: false });
		await expect(confirmForm(page)).toBeVisible({ timeout: 20_000 });
		await armConfirm(page);
		await submitDelete(page).click();
		await expect(planChangedPanel(page), 'the plan-changed notice (:111-115)').toBeVisible({ timeout: 20_000 });

		measure('P · 409 plan changed', {
			notice: await planChangedPanel(page).innerText(),
			confirmFailedPanels: await confirmFailedPanel(page).count(),
			deletedPanels: await deletedPanel(page).count(),
			boxCheckedAfter: await understoodBox(page).getAttribute('aria-checked'),
			wordAfter: await wordField(page).inputValue(),
			submitDisabledAfter: await submitDelete(page).isDisabled(),
			rowsAfter: await deletionRows(page).count(),
			confirmBodies: callsTo(sent, CONFIRM_PATH).map((call) => call.body),
			mockConfirmStatuses: (await mock.calls(CONFIRM_PATH)).map((call) => call.status),
			bearersAtConfirm: await receivedTokens(CONFIRM_PATH),
			stubbed: 'verify'
		});

		await expect(planChangedPanel(page)).toContainText(TEXT.planChanged);
		await expect(
			await confirmFailedPanel(page).count(),
			'a 409 is not shown as a failed deletion: it is a new preview'
		).toBe(0);
		await expect(
			await deletedPanel(page).count(),
			'and nothing was deleted (use-account-deletion.ts:231-236)'
		).toBe(0);
		expect(
			await understoodBox(page).getAttribute('aria-checked'),
			'the checkbox was cleared, so the new summary has to be confirmed again (delete-account-confirm.tsx:59-61,217)'
		).toBe('false');
		expect(await wordField(page).inputValue(), 'and so was the typed word').toBe('');
		await expect(submitDelete(page), 'so the delete button is disabled again').toBeDisabled();
		await expect(deletionRows(page), 'the preview was re-read and shown again').toHaveCount(2);
		expect(
			callsTo(sent, CONFIRM_PATH).map((call) => call.body),
			'the confirm body carried the preview planHash'
		).toEqual([JSON.stringify({ token: 'probe-409-token', confirm: true, planHash: 'probe-plan-hash' })]);
		expect(await receivedTokens(CONFIRM_PATH), 'and no session').toEqual([]);
		expect(
			(await mock.calls(CONFIRM_PATH)).map((call) => call.status),
			'the 409 came from the mock'
		).toEqual([409]);
	});

	test('Q · a 500 on confirm: its own card on the preview that stays, with the box and the word kept', async ({
		page,
		mock
	}) => {
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		await mockScenario({ fails: { [CONFIRM_PATH]: 500 } });
		await hardVisit(page, '/delete-account/confirm#token=probe-500-token', { requireShell: false });
		await expect(confirmForm(page)).toBeVisible({ timeout: 20_000 });
		await armConfirm(page);
		await submitDelete(page).click();
		const failure = confirmFailedPanel(page);
		await expect(failure, 'confirmFailed is its own card (:165-184)').toBeVisible({ timeout: 20_000 });
		await expect(failure).toContainText(TEXT.confirmError);
		await expect(failure.getByRole('alert')).toContainText(TEXT.confirmError);

		measure('Q · 500 on confirm', {
			confirmFailedCards: await failure.count(),
			deletedPanels: await deletedPanel(page).count(),
			confirmStillThere: await confirmForm(page).count(),
			rowsStillThere: await deletionRows(page).count(),
			wordStillTyped: await wordField(page).inputValue(),
			boxStillChecked: await understoodBox(page).getAttribute('aria-checked'),
			tryAgainButtons: await page.getByRole('button', { name: TEXT.tryAgain }).count(),
			mockConfirmStatuses: (await mock.calls(CONFIRM_PATH)).map((call) => call.status),
			stubbed: 'verify'
		});

		await expect(await deletedPanel(page).count(), 'nothing was deleted').toBe(0);
		await expect(confirmForm(page), 'the preview is still on screen').toHaveCount(1);
		expect(
			await wordField(page).inputValue(),
			'the typed word stayed: same preview, only refused — no planHash change, so no remount (:217)'
		).toBe(CONFIRM_WORD);
		expect(await understoodBox(page).getAttribute('aria-checked'), 'and so did the checkbox').toBe('true');
		await expect(
			page.getByRole('button', { name: TEXT.tryAgain }),
			'with one Try again button beside the failure line (:176-183)'
		).toHaveCount(1);
		expect(
			(await mock.calls(CONFIRM_PATH)).map((call) => call.status),
			'the 500 came from the mock'
		).toEqual([500]);
	});

	test('R · a second link pasted into the same tab: the hash change re-reads with the new token, no reload', async ({
		page,
		shield
	}) => {
		await stubMockCall(page, VERIFY_PATH, { status: 200, body: previewBody() });
		const sent = recordRequests(page);
		await hardVisit(page, '/delete-account/confirm', { requireShell: false });
		await expect(invalidPanel(page), 'the tab was opened without a token').toBeVisible({ timeout: 15_000 });
		const callsBeforePaste = callsTo(sent, VERIFY_PATH).length;

		await page.evaluate(() => {
			window.location.hash = 'token=probe-pasted-token';
		});
		await expect(
			confirmForm(page),
			'hashchange takes the new token and starts over (use-account-deletion.ts:179-194)'
		).toBeVisible({ timeout: 20_000 });

		measure('R · pasted link', {
			url: page.url(),
			hashAfter: await page.evaluate(() => window.location.hash),
			callsBeforePaste,
			verifyBodies: callsTo(sent, VERIFY_PATH).map((call) => call.body),
			invalidAfter: await invalidPanel(page).count(),
			rowsAfter: await deletionRows(page).count(),
			stubbed: 'verify',
			consoleErrors: shield.consoleErrors()
		});

		expect(callsBeforePaste, 'the first visit asked nothing, because it had no token').toBe(0);
		expect(
			callsTo(sent, VERIFY_PATH).map((call) => call.body),
			'the only read after the paste asked with the pasted token (1..2: the read is a mount effect again)'
		).toEqual(asManyAs(callsTo(sent, VERIFY_PATH).length, JSON.stringify({ token: 'probe-pasted-token' })));
		await expect(page, 'and the fragment is stripped again').toHaveURL(`${APP_ORIGIN}/delete-account/confirm`);
		await expect(await invalidPanel(page).count(), 'the dead-link answer is gone').toBe(0);
		await expect(deletionRows(page), 'the preview replaced it').toHaveCount(2);
		await expect(shield.consoleErrors(), 'a token swap inside one tab printed no error').toEqual([]);
	});

	test('S · /verify-email with no link to open: the failure copy, and no call at all', async ({
		page,
		mock,
		shield
	}) => {
		const targets = [
			'/verify-email',
			'/verify-email?email=verify-me@example.test',
			'/verify-email?token=probe-only-token',
			'/verify-email?email=&token=probe-empty-email'
		];
		const readings: Array<{ target: string; posts: number; mockLog: number }> = [];
		for (const target of targets) {
			const sent = recordRequests(page);
			await page.goto(`${APP_ORIGIN}${target}`, { waitUntil: 'domcontentloaded' });
			await expect(
				page.getByRole('heading', { name: TEXT.verifyFailedTitle }),
				`${target}: a link missing either half is a failed verification (use-email-verify-token.ts:16-19,48)`
			).toBeVisible({ timeout: 15_000 });
			await expect(page.getByText(TEXT.verifyFailedMessage)).toHaveCount(1);
			await expect(
				callsTo(sent, EMAIL_VERIFY_PATH),
				`${target}: the query never started, so nothing was sent`
			).toHaveLength(0);
			readings.push({
				target,
				posts: callsTo(sent, EMAIL_VERIFY_PATH).length,
				mockLog: (await mock.requests()).length
			});
			await page.context().clearCookies();
		}

		measure('S · no link', {
			readings,
			url: page.url(),
			homeLinkHref: await page.getByRole('link', { name: TEXT.goToHome }).getAttribute('href'),
			loadingTextShown: await page.getByText(TEXT.verifyLoading).count(),
			consoleErrors: shield.consoleErrors()
		});

		await expect(
			page.getByText(TEXT.verifyLoading),
			'the in-progress line is never shown: there is nothing to verify (verify-email-page.tsx:35-38)'
		).toHaveCount(0);
		await expect(page.getByRole('link', { name: TEXT.goToHome })).toHaveAttribute('href', '/');
		expect(
			readings.map((reading) => reading.posts),
			'four addresses, four silent refusals (use-email-verify-token.ts:33, enabled: !!verificationParams)'
		).toEqual([0, 0, 0, 0]);
		expect(
			readings.map((reading) => reading.mockLog),
			'…and the test backend was never asked'
		).toEqual([0, 0, 0, 0]);
	});

	test('T · /verify-email with a valid token (stubbed): the in-progress copy, then the person is sent away', async ({
		page,
		mock
	}) => {
		await stubMockCall(
			page,
			EMAIL_VERIFY_PATH,
			{ status: 200, body: { status: 200, message: 'Email verified' } },
			1_800
		);
		const sent = recordRequests(page);
		await page.goto(`${APP_ORIGIN}/verify-email?email=${VERIFY_EMAIL_ADDRESS}&token=probe-loading-token`, {
			waitUntil: 'domcontentloaded'
		});
		await expect(
			page.getByText(TEXT.verifyLoading),
			'the check in progress (verify-email-page.tsx:35-38)'
		).toBeVisible({ timeout: 15_000 });
		const ariaBusyBlocks = await page.locator('[aria-busy="true"]').count();
		await expect(
			page.getByRole('heading', { name: TEXT.verifyFailedTitle }),
			'while it runs there is no failure yet'
		).toHaveCount(0);
		await expect(
			page,
			'a success leaves the page: router.replace / (use-email-verify-token.ts:40-44), and a signed-out visitor lands on the sign-in page'
		).toHaveURL(/\/auth\/passcode/, { timeout: 20_000 });

		const posts = callsTo(sent, EMAIL_VERIFY_PATH);
		measure('T · valid token', {
			ariaBusyBlocks,
			urlAfter: page.url(),
			posts: posts.length,
			bodies: posts.map((post) => post.body),
			bodyKeys: posts.map((post) => Object.keys(jsonOf(post))),
			authorizations: posts.map((post) => post.authorization),
			failedTitleAtEnd: await page.getByRole('heading', { name: TEXT.verifyFailedTitle }).count(),
			mockLog: await mock.requests(),
			stubbed: 'auth/email/verify'
		});

		expect(posts.length, 'one POST for one successful read').toBe(1);
		const body = jsonOf(posts[0]);
		expect(body.email, 'the address from the link').toBe(VERIFY_EMAIL_ADDRESS);
		expect(body.token, 'and the token from the link (email-verification.service.ts:55-94)').toBe(
			'probe-loading-token'
		);
		expect(posts[0].origin, 'to the test backend').toBe(MOCK_API_ORIGIN);
		expect(posts[0].authorization, 'signed out, so no bearer').toBeNull();
		expect(
			Object.keys(body).sort(),
			'and the body is exactly the two halves of the link: APIService merges `tenantId`/`organizationId` only when those cookies exist (api.service.ts:654-661), and signed out they do not — case W shows the signed-in shape'
		).toEqual(['email', 'token']);
		await expect(
			page.getByRole('heading', { name: TEXT.verifyFailedTitle }),
			'they never saw the failure copy'
		).toHaveCount(0);
		await expect(await mock.requests(), 'the stub answered it, so the mock recorded nothing for it').toHaveLength(
			0
		);
	});

	test('U · /verify-email refused (400): the same copy a missing link gets, and the token in the app log', async ({
		page,
		mock,
		shield
	}) => {
		const token = 'SWEPT-VERIFY-TOKEN-42';
		await mockScenario({ fails: { [EMAIL_VERIFY_PATH]: 400 } });
		const sent = recordRequests(page);
		await page.goto(`${APP_ORIGIN}/verify-email?email=${VERIFY_EMAIL_ADDRESS}&token=${token}`, {
			waitUntil: 'domcontentloaded'
		});
		await expect(
			page.getByRole('heading', { name: TEXT.verifyFailedTitle }),
			'a refused link gets the same sentence as a missing one'
		).toBeVisible({ timeout: 20_000 });

		const attempts = callsTo(sent, EMAIL_VERIFY_PATH);
		const logCalls = callsTo(sent, LOG_PATH);
		const logsWithToken = logCalls.filter((request) => String(request.body).includes(token));

		measure('U · refused token', {
			attempts: attempts.length,
			bodies: attempts.map((attempt) => attempt.body),
			bodyKeys: attempts.map((attempt) => Object.keys(jsonOf(attempt))),
			origins: attempts.map((attempt) => attempt.origin),
			authorizations: attempts.map((attempt) => attempt.authorization),
			mockStatuses: (await mock.calls(EMAIL_VERIFY_PATH)).map((call) => call.status),
			logCallsTotal: logCalls.length,
			logBodiesWithToken: logsWithToken.length,
			logTokenExcerpt: logsWithToken[0]?.body?.match(/.{0,30}token.{0,20}/)?.[0] ?? 'none',
			url: page.url(),
			bearersAtMock: await receivedTokens(EMAIL_VERIFY_PATH),
			consoleErrors: shield.consoleErrors()
		});

		await expect(
			page.getByText(TEXT.verifyFailedMessage),
			'one sentence for invalid, expired, already used and unreachable alike (en.json:2547)'
		).toHaveCount(1);
		expect(
			attempts.length,
			'1..2, because a retry is a race (retry: 1, use-email-verify-token.ts:34)'
		).toBeGreaterThanOrEqual(1);
		expect(attempts.length).toBeLessThanOrEqual(2);
		expect(
			attempts.map((attempt) => attempt.origin),
			'both to the test backend'
		).toEqual(asManyAs(attempts.length, MOCK_API_ORIGIN));
		expect(
			attempts.map((attempt) => attempt.authorization),
			'signed out, so neither carried a bearer'
		).toEqual(asManyAs(attempts.length, null));
		expect(
			attempts.map((attempt) => Object.keys(jsonOf(attempt)).sort()),
			'the body is exactly the two halves of the link, the same signed-out shape case T sent (api.service.ts:654-661 adds tenantId/organizationId only when those cookies exist)'
		).toEqual(asManyAs(attempts.length, ['email', 'token']));
		expect(await receivedTokens(EMAIL_VERIFY_PATH), 'and the mock held no bearer for it').toEqual([]);
		expect(
			logsWithToken.length,
			'MEASURED, NOT INTENDED: the token is copied into the app own development log — requestBodyForLog hides passwords and codes but not token (request-log-body.ts:6-14), and with ACTIVE_LOCAL_LOG_SYSTEM on every entry is posted to /api/log (logger.service.ts:170-178, logger-client.ts:41); the sibling flow refuses exactly this (account-deletion.service.ts:22-28), and case H measured the deletion token staying out of this same log'
		).toBeGreaterThanOrEqual(1);
		expect(
			logsWithToken.map((entry) => String(entry.body).includes(`"token":"${token}"`)),
			'in clear text, as the request body the log wrote'
		).toEqual(asManyAs(logsWithToken.length, true));
		expect(
			new URL(page.url()).searchParams.get('token'),
			'the token also stays in the page address for the whole visit — this page never strips it, unlike the deletion confirm page'
		).toBe(token);
	});

	test('V · /verify-email through a cut connection: the same copy, and a call the mock recorded without answering', async ({
		page,
		mock,
		shield
	}) => {
		await mockScenario({ drops: { [EMAIL_VERIFY_PATH]: 1 } });
		const sent = recordRequests(page);
		await page.goto(`${APP_ORIGIN}/verify-email?email=${VERIFY_EMAIL_ADDRESS}&token=probe-dropped-verify`, {
			waitUntil: 'domcontentloaded'
		});
		await expect(
			page.getByRole('heading', { name: TEXT.verifyFailedTitle }),
			'the same copy, because the page cannot tell an outage from a bad link (use-email-verify-token.ts:34,48)'
		).toBeVisible({ timeout: 20_000 });

		const cut = (await mock.calls(EMAIL_VERIFY_PATH)).filter((call) => call.status === 0);
		measure('V · outage', {
			cutStatuses: cut.map((call) => call.status),
			allStatuses: (await mock.calls(EMAIL_VERIFY_PATH)).map((call) => call.status),
			browserBodies: callsTo(sent, EMAIL_VERIFY_PATH).map((call) => call.body),
			url: page.url(),
			homeLinkHref: await page.getByRole('link', { name: TEXT.goToHome }).getAttribute('href'),
			consoleErrors: shield.consoleErrors()
		});

		await expect(
			cut.length,
			'the mock recorded the cut call with status 0, which no refusal writes'
		).toBeGreaterThanOrEqual(1);
		await expect(
			page.getByRole('link', { name: TEXT.goToHome }),
			'and the person is offered the way back to the app'
		).toHaveCount(1);
	});

	test('W · /verify-email signed in: the session travels with the token, and nothing leaves the machine', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const token = 'SWEPT-VERIFY-SIGNED-7';
		await mockScenario({ fails: { [EMAIL_VERIFY_PATH]: 400 } });
		await signInWithFixture(page.context(), fixture, 'A');
		const sent = recordRequests(page);
		await page.goto(`${APP_ORIGIN}/verify-email?email=${VERIFY_EMAIL_ADDRESS}&token=${token}`, {
			waitUntil: 'domcontentloaded'
		});
		await expect(page.getByRole('heading', { name: TEXT.verifyFailedTitle })).toBeVisible({ timeout: 20_000 });

		const attempts = callsTo(sent, EMAIL_VERIFY_PATH);
		const bodies = attempts.map((attempt) => jsonOf(attempt));
		const logsWithToken = callsTo(sent, LOG_PATH).filter((request) => String(request.body).includes(token));

		measure('W · signed in', {
			attempts: attempts.length,
			bodies,
			bearerSeen: attempts.map((attempt) => String(attempt.authorization ?? 'none').slice(0, 12)),
			tenantIdHeaders: attempts.map((attempt) => attempt.tenantId),
			bearersAtMock: await receivedTokens(EMAIL_VERIFY_PATH),
			mockStatuses: (await mock.calls(EMAIL_VERIFY_PATH)).map((call) => call.status),
			refreshCalls: callsTo(sent, '/api/auth/refresh-token').length,
			logBodiesWithToken: logsWithToken.length,
			logOrigins: callsTo(sent, LOG_PATH).map((call) => call.origin),
			originsAsked: [...new Set(sent.map((request) => request.origin))],
			externalCalls: shield.externalCalls(),
			consoleErrors: shield.consoleErrors()
		});

		expect(attempts.length, '1..2 again: retry:1 (use-email-verify-token.ts:34)').toBeGreaterThanOrEqual(1);
		expect(attempts.length).toBeLessThanOrEqual(2);
		expect(
			bodies.map((body) => body.email),
			'the address is what it was asked for'
		).toEqual(asManyAs(attempts.length, VERIFY_EMAIL_ADDRESS));
		expect(
			bodies.map((body) => body.token),
			'the token is in the body of a signed-in call exactly as of a signed-out one'
		).toEqual(asManyAs(attempts.length, token));
		expect(
			bodies.map((body) => body.tenantId),
			'and a signed-in call gains the ids APIService merges into every POST body (api.service.ts:654-661)'
		).toEqual(asManyAs(attempts.length, fixture.ids.tenantA));
		expect(
			attempts.map((attempt) => attempt.tenantId),
			'plus the tenant-id header (api.service.ts:299-301)'
		).toEqual(asManyAs(attempts.length, fixture.ids.tenantA));
		expect(
			attempts.map((attempt) => String(attempt.authorization ?? '').startsWith('Bearer ')),
			'and the bearer (authorizeRequest, api.service.ts:87-101) — the deletion calls never do this (case C)'
		).toEqual(asManyAs(attempts.length, true));
		expect(await receivedTokens(EMAIL_VERIFY_PATH), 'the mock recorded that bearer').toHaveLength(attempts.length);
		expect(
			(await mock.calls(EMAIL_VERIFY_PATH)).map((call) => call.status),
			'and the mock refused both attempts with the 400 the scenario armed'
		).toEqual(asManyAs(attempts.length, 400));
		expect(
			logsWithToken.length,
			'and the token is in the app own log bodies again (case U)'
		).toBeGreaterThanOrEqual(1);
		expect(
			shield.externalCalls(),
			'nothing left the machine: the shield fixture fails a run that lets a request out (playwright/fixtures.ts:112-118)'
		).toEqual([]);
		expect(
			[...new Set(sent.map((request) => request.origin))].sort(),
			'exactly two origins were ever asked: this app and the test backend'
		).toEqual([APP_ORIGIN, MOCK_API_ORIGIN].sort());
	});
});
