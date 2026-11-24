import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { encode } from 'next-auth/jwt';

import { expect, test, type Page, type Shield } from '../../fixtures';
import type { BrowserContext } from '@playwright/test';

import { APP_ORIGIN, mockReset, receivedTokens, waitForShellReady } from '../../helpers';
import { EVER_ID_ISSUER_URL, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person sees, and what cookies are written, on `/auth/social-welcome` — the page Auth.js sends a social
 * sign-up to (`auth.ts:91` `pages.newUser`), rendered by
 * `core/components/pages/auth/social-welcome/page-component.tsx` (98 lines). Its unit test
 * `…/social-welcome/page-component.test.tsx` runs the same branches against a *mocked* `useSession`; nothing here
 * repeats it: every case below drives the page in a real Chrome against **this app's own session endpoint**
 * (`GET/POST /api/auth/session`, Auth.js v5 with `strategy:'jwt'`, `auth.ts:25`), because the branch a mocked
 * `useSession` can fake is exactly where the real endpoint disagrees with the component (finding 1).
 *
 * Run on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control 4004, issuer 4005 —
 * `playwright/test-servers.ts:40`) on 2026-11-24, in this file's own consecutive green runs
 * `E:\Coding\.tmp\s2-lane-c-welcome-7.log` and `-8.log` (each `11 passed`, no failed, skipped or flaky line). The same
 * eleven also passed consecutively in `-3.log` / `-4.log` and `-5.log` / `-6.log`; `-1.log` (7 passed, 4 failed) and
 * `-2.log` (9 passed, 2 failed) came before them. The measuring probes are
 * `E:\Coding\.tmp\probe-welcome\probe{1..11}.mjs` with their logs
 * `E:\Coding\.tmp\s2-lane-c-welcome-probe-{1..11}.log`; probe `-8.log` is unusable (its `headersArray()` call threw
 * before printing anything) and the Set-Cookie question it was chasing was answered instead by `probe10.mjs`, which
 * reads the wire headers Node-side. All four `-1.log` failures and both `-2.log` failures were this file's own, not
 * the app's, and each was re-measured before the green runs: case G read the session *after* the sign-in page had already blanked it; case H visited the
 * welcome page a second time while the cookies of the first visit were still in the jar, which is exactly the
 * situation its proxy sends straight to the app; cases I and J took their CSRF token from Playwright's request API
 * instead of from the page (see the CSRF note below); I's Origin call used Playwright's `origin` option, which never
 * puts an `Origin` header on the wire (measured: 200 from a mock that answers 403 to that header), and J planted onto
 * a jar that held no session at all, which the update path does not create (case I pins that now). Every value pinned
 * below is one a `MEASURE` line printed in a completed run, and every `file:line` was re-read from the source after
 * that run.
 *
 * ## How a session is minted here, without OAuth
 *
 * The lane app runs with `AUTH_SECRET: 'playwright-deterministic-secret'` (`playwright/test-servers.ts:118`) and the
 * JWT strategy, so a session is a JWE cookie this file encrypts with `next-auth/jwt`'s own `encode` — the same
 * HKDF key derivation Auth.js uses, with the **cookie name as the salt**: `encode({token, secret, salt})`. Measured
 * (`…probe-1.log`): the cookie `authjs.session-token` (no `__Secure-` prefix, because the lane is plain http —
 * `@auth/core/lib/utils/cookie.js:45-56`) is accepted and `GET /api/auth/session` echoes back what was put in
 * `token.authCookie`; `__Secure-authjs.session-token` and `next-auth.session-token` are **not** accepted (the
 * endpoint answers `null` and clears the cookie), and a wrong secret answers `null` too. So "what this page does with
 * a session" is answered for any shape at all, and no provider is contacted: the mock logged no `POST /auth/*` in any
 * case that only presents a session.
 *
 * The session callback hands that payload on as `session.authCookie` (`auth.ts:82-87`), which is what the page reads
 * (`page-component.tsx:22,33-35`). Which payloads count as a social session is `core/lib/auth/social-session.ts:12-17`.
 *
 * Two things about that payload a test has to respect, both measured:
 *
 * - **The CSRF token must be asked for by the page itself.** `POST /api/auth/session` verifies the body's `csrfToken`
 *   against the `authjs.csrf-token` cookie (`@auth/core/lib/index.js:50-62` → `createCSRFToken`). A cookie stored by
 *   Playwright's request API is visible in `context.cookies()` (131 characters) yet the **browser's** own POST is
 *   refused with it — 400 and `null` — while the identical POST is accepted (200) when the cookie came from the
 *   page's own `GET /api/auth/csrf`, and `page.request` accepts the cookie its own `GET` stored
 *   (`…probe-11.log` P1 / P2 / P3). Case I therefore reads its CSRF token from the page for the browser POSTs and
 *   separately from `page.request` for the request-API POST, and reads each session back through the same channel
 *   that wrote it.
 * - **The payload does not stay as it was minted.** A session that opened nothing lands on the sign-in page, whose
 *   effect ends with `update({})` (`sign-in-page.tsx:87-95`), and `auth.ts:76-78` stores that empty object: the
 *   `authCookie` of the tab becomes `{}` (`…probe-4.log` G1, and case G asserts it). Every case that asks what the
 *   *welcome page* was given therefore reads the session before that page is reached.
 *
 * ## Which components this drives
 *
 * - `app/[locale]/auth/social-welcome/page.tsx` → `core/components/pages/auth/social-welcome/page-component.tsx`
 *   (`verifyEmail` gate :22, the waiting effect :27-62 with its `hasNavigatedRef` :25,57, `loadOAuthSession` :32-53,
 *   the notice branch :64-91, the loading branch :93-97).
 * - `core/lib/auth/social-session.ts` (`readSocialSession` :12-17, `socialRefreshToken` :20-23),
 *   `core/lib/auth/navigate-after-sign-in.ts:18-46` and `core/lib/auth/board-return.ts` through it, and
 *   `core/lib/board/board-app.ts:96-106` (`boardReturnUrl`, the trusted Board origin).
 * - `core/lib/helpers/cookies/index.ts` — `setAuthCookies` :231-269 (what it writes, and the expiry it derives from
 *   the refresh token, `sessionExpiryOf` :41-51) and `cookiesKeys()` :271-284.
 * - The auth kit it renders: `core/components/auth/kit/auth-state.tsx` (`AuthState` :22-60, `AuthAddress` :62-73) and
 *   `core/components/auth/scenes/auth-scenes.tsx:199-232` (`InboxScene`, whose subject line is the copy of
 *   `SUBJECT_KEY.activate` :187-191 read at :208).
 * - Next's own pieces the page leans on: `proxy.ts` (matcher :96-113, `deny_redirect` :175-185 reached from the
 *   no-tokens branch :519-522) and `core/components/pages/auth/sign-in/sign-in-page.tsx:87-95` — the page this one
 *   redirects to, which is where several of the measured side effects come from.
 * - `app/api/auth/ever-id/finish-setup/route.ts` (`auth()` :54 → `everIdSetupTarget` :58 → `provisionEverIdWorkspace`
 *   :80) only in case J, which asks what a session this file wrote can make the **server** do.
 *
 * ## Findings — only 2 is a defect (MEASURED, NOT INTENDED); 1 is a dead branch, 3 is cosmetic, 4 explains a number
 *
 * 1. **A session that only has a `user` claim never opens.** `readSocialSession` falls back to `session.user`
 *    (`core/lib/auth/social-session.ts:15-16`), and `page-component.test.tsx:45-65` asserts that fallback opens the
 *    session with `data: { user: { access_token: … } }`. Through the real endpoint it cannot: `@auth/core`'s session
 *    action rebuilds `session.user` from the token's `name`/`email`/`picture` only, so the `access_token` minted into
 *    the JWT never comes back — measured as the echo `{"user":{"name":…,"email":…},"expires":…}` with **no
 *    `authCookie` key at all** (`…probe-3.log` A2, `…probe-4.log` G1), and as a page that opens nothing and lands on
 *    `/auth/passcode` (case F). `social-session.ts:15-16` is unreachable from a browser: its own comment (:8-9) says
 *    `session.user` "holds only the profile", and a session written before the change goes through the same session
 *    action. Harmless — such a session lands on the sign-in page, as it did before the fallback existed — but the
 *    branch is dead, and the unit test pins a session shape the real endpoint cannot produce.
 * 2. **`POST /api/auth/session` replaces `authCookie` wholesale** (`auth.ts:76-78`: `token = {…token, authCookie: session}`).
 *    A page that holds a valid `authjs.csrf-token` (same-origin fetch, `credentials:'same-origin'`) can replace its
 *    own `authCookie` with anything (case I: the echoed keys became exactly `["access_token","tenantId"]`, the minted
 *    refresh/organization/team/user gone). What it can reach, traced in this run: its own session, and through it the
 *    server code that trusts `session.authCookie` — `core/lib/auth/ever-id/session.ts:87-90` (`everIdSessionData`
 *    accepts any payload whose `provider` is `ever-id`) → `everIdSetupTarget` :102-114 (its workspace token, with no
 *    expiry requirement a client cannot satisfy: `isWorkspaceTokenExpired` :136-149 treats an unreadable token as
 *    valid) → `app/api/auth/ever-id/finish-setup/route.ts:54,58` → `provisionEverIdWorkspace`, which sends **that
 *    token to the Gauzy API as a bearer** (`core/services/server/ever-id/provision.ts:110-114`). Case J proves the
 *    token that left was the one this file wrote: the lane mock recorded `POST /api/auth/signin.workspace 401` whose
 *    bearer sha256 equals the sha256 of the planted string. That contradicts the route's own comment
 *    (`route.ts:20-22`, "The workspace token is read from the Ever ID sign-in's next-auth session on this server,
 *    never from the page") — the session is on the server, but a page writes it. What it cannot reach, as measured
 *    here and nowhere extrapolated: another person's session (the update re-encodes a JWT with the server secret and
 *    Set-Cookies it back into **the caller's own** jar; nothing in this app reads another jar), a session the caller
 *    does not already hold (a valid update on a jar with no session cookie answers 200 + `null` and writes no cookie —
 *    case I), any token the caller did not itself supply, and an Ever ID session that already exists (`auth.ts:58-61` deletes the payload on an
 *    update of a session whose previous `authCookie` was `ever-id`, so this path cannot be used again on a real Ever
 *    ID sign-in that carries `access_token`). `@auth/core` checks CSRF for this action (`@auth/core/lib/index.js:57-59`,
 *    a failed check answers 400 — case I b) and checks no Origin at all (case I c).
 * 3. **`no-team-popup-show` is written as the string `"undefined"` — cosmetic, the app reads it as `true`.** The
 *    welcome page's `setAuthCookies` call omits `noTeamPopup` (`page-component.tsx:37-48`; the key is optional at
 *    `cookies/index.ts:186`) and `setCookie` hands the value to `cookies-next`, whose `stringify` passes anything that
 *    is not a string through `JSON.stringify` (`cookies/index.ts:265`, `cookies/helpers.ts:89-92`,
 *    `node_modules/cookies-next/lib/common/utils.js:4-15`) — measured as `no-team-popup-show="undefined"` (9
 *    characters, `…probe-10.log` N6). `getNoTeamPopupShowCookie` is `!!getCookie(...)` (`cookies/index.ts:523-525`),
 *    so the cookie is a presence flag: `"undefined"` reads exactly like the `"true"` the password sign-in writes
 *    (`app/api/auth/login/route.ts:152`) and the social-login hook writes (`use-authentication-social-login.ts:82`),
 *    and `authenticator.tsx:65-72` offers the create-team modal, which renders only while `!isTeamMember` (:103). So
 *    a person who signs in through this page gets the same modal as one who signs in with a password. Not a
 *    behaviour defect — the value is untidy, and the same `undefined` is passed at
 *    `use-authentication-social-login.ts:101`. (A consequence of the presence flag, outside this page: even
 *    `setNoTeamPopupShowCookie(false)`, `authenticator.tsx:76`, writes `"false"`, which reads as `true` too.)
 * 4. Not a defect, but the explanation for a number several cases print: the ten empty-valued session cookies are the
 *    **proxy's**, not this page's. A session that opened nothing lands on the sign-in page, whose effect sends a
 *    signed-in visitor to `/` (`sign-in-page.tsx:89-91`); `/` is protected and holds no tokens, so `proxy.ts:519-522`
 *    answers 307 to `/auth/passcode` with every `cookiesKeys()` name set to `''` plus `auth-token_totalChunks`
 *    (`proxy.ts:175-185`). Measured on the wire (`…probe-10.log` N2, and the identical N5 for a plain signed-out
 *    `GET /` with no welcome page involved) and in the browser jar (`…probe-1.log` case 5). No client code writes
 *    them: tracing `document.cookie` through the whole trip recorded one write, Jitsu's own (`…probe-7.log` J).
 *
 * ## What this lane cannot answer, and what is not claimed
 *
 * - **Board return: a lane limit, pinned as one.** `NEXT_PUBLIC_BOARD_APP_DOMAIN` is published empty by this lane
 *   (read off the served document's `data-ever-teams-runtime-env`, case H), so `trustedBoardOrigin` has nothing to
 *   trust and `boardReturnUrl` (`board-app.ts:96-106`) refuses every candidate. Case H measures both doors: a
 *   `?redirect=` to the lane's own issuer origin, and a hand-written `ever-teams:board-return` in sessionStorage —
 *   both end on `/` (`…probe-2.log` 8a/8b, `…probe-7.log` K1/K2, re-measured in `…probe-9.log` M1/M2). "The Board
 *   sends a person back" is therefore **not** testable on lane-c and nothing here claims it works.
 * - `takePathAfterSignIn` (`navigate-after-sign-in.ts:26-31`, sessionStorage `ever-teams:path-after-sign-in`) *does*
 *   fire from this page — measured as `window.location.replace('/auth/password')` producing
 *   `["200 /auth/passcode","200 /auth/social-welcome","307 /auth/password","200 /"]` twice (`…probe-2.log` 3b,
 *   `…probe-3.log` D): the proxy sends the auth path back to the app, so the person still lands on `/`. It is kept
 *   as a note, not a test: the assertion would be about the proxy, and `suites/lane-c/` already pins that redirect
 *   family elsewhere.
 * - Cookies the **shell** writes after the welcome page is gone (`auth-active-project`, `auth-active-task`,
 *   `auth-user-active-task`) are printed and never asserted: they were present in `…probe-2.log` case 3 and absent in
 *   `…probe-4.log` run 0, i.e. a race between this page's single `setAuthCookies` call and the shell's own init. Only
 *   the eight cookies `setAuthCookies` writes are pinned (case C pins the seven ids and tokens, case K the eighth).
 * - The lane mock answers `GET /api/user/me` forever and knows nothing about an expired token, so "the session these
 *   cookies open is a working one" is answered as far as this lane can answer it: the shell mounts (`waitForShellReady`),
 *   the mock logged the shell's reads, and the proxy verified the token with the API for the document it served.
 * - `@auth/core`'s own internals are cited from `node_modules` as read on 2026-11-24 (next-auth 5.0.0-beta.32,
 *   `@auth/core` 0.41.3); nothing outside this app's requests was measured.
 *
 * ## Console rule
 *
 * `shield.pageErrors()` (uncaught exceptions) was empty in every case here and is asserted in every case. Console
 * errors are asserted empty in the cases that only open a page, with one exclusion copied from
 * `suites/lane-a/security-two-factor-ui.spec.ts:392-397`: React's dev-mode `The result of getSnapshot should be cached
 * to avoid an infinite loop`, shell-store noise no auth code here can attribute. One more line is excluded for its
 * exact text only, for the cases that reach the app shell (C, D, K): `@auth/core`'s `ClientFetchError: Failed to fetch`
 * from the shell's own session read, logged 1 to 3 times in the measuring runs (`…probe-4.log` run 0..2) and absent
 * from this file's own green runs, where all eleven `MEASURE` lines printed `consoleErrors []`. It is therefore
 * precautionary: printed in every `MEASURE` line, never counted, and every other console error the app logs still
 * fails this file.
 *
 * ## How this file waits
 *
 * On URLs, locators and the cookie jar. One `page.waitForTimeout` remains (case B) and it is not an assertion: "the
 * page did not navigate" is a zero a locator cannot show, so the page is given several seconds — longer than its own
 * effect needs (`page-component.tsx:27-62` runs on mount) — and the URL is read. Case A's session read is deliberately
 * slowed (a `page.route` that waits 1.5 s and then `route.fallback()`) because the loading state is only assertable
 * while the session is still pending: measured, at `domcontentloaded` the loading block was not yet in the DOM
 * (`count 0`, `…probe-3.log` C), and with the delay it is (`h1 = auth.social.OPENING`). No expected value in this
 * file is a duration.
 *
 * ## The copy
 *
 * Every English string is read from `locales/en.json` when the file loads, by the key the component asks for — never
 * hard-coded. Keys used, with their `en.json` lines: `auth.social.OPENING` 6633, `auth.social.OPENING_TEXT` 6634,
 * `auth.signUp.SENT_TITLE` 6622, `auth.signUp.SENT_TEXT` 6621, `auth.signUp.SIGN_IN` 6623,
 * `auth.scene.INBOX_ACTIVATE_TITLE` 6580, `auth.scene.INBOX_ACTIVATE_TEXT` 6579, `auth.scene.SUBJECT_ACTIVATE` 6594.
 * Case B pins that the notice sentence appears **twice**, which is not a duplicate render: the page asks for
 * `auth.signUp.SENT_TITLE` (`page-component.tsx:79`) and `InboxScene` separately asks for
 * `auth.scene.SUBJECT_ACTIVATE` (`auth-scenes.tsx:208` via `SUBJECT_KEY.activate` :187-191), and those two keys carry
 * the same English sentence today (en.json 6622 and 6594).
 */

const LOG = '[lane-c social-welcome]';

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function measure(label: string, seen: Record<string, unknown>): void {
	const parts = Object.entries(seen)
		.map(([key, value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value}`)
		.join(' · ');
	console.log(`${LOG} MEASURE ${label} · ${parts}`);
}

const EN = (
	JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
		auth: { social: Record<string, string>; signUp: Record<string, string>; scene: Record<string, string> };
	}
).auth;

const TEXT = {
	opening: EN.social.OPENING,
	openingText: EN.social.OPENING_TEXT,
	sentTitle: EN.signUp.SENT_TITLE,
	sentText: EN.signUp.SENT_TEXT,
	signIn: EN.signUp.SIGN_IN,
	inboxTitle: EN.scene.INBOX_ACTIVATE_TITLE,
	inboxText: EN.scene.INBOX_ACTIVATE_TEXT,
	subjectActivate: EN.scene.SUBJECT_ACTIVATE
};

/** The lane app's own Auth.js secret (`playwright/test-servers.ts:118`) and the cookie name its session lives in. */
const AUTH_SECRET = 'playwright-deterministic-secret';
const SESSION_COOKIE = 'authjs.session-token';

/** Where a session that opened nothing ends: `DEFAULT_APP_PATH` (`constants.tsx:98-101`), measured as this. */
const DEFAULT_APP_PATH = '/auth/passcode';

/** A host this app is not: case I uses it to show that nothing about an Origin is checked, and the mock shows it is. */
const EVIL_ORIGIN = 'https://evil.example';

/** React dev-mode shell-store noise, excluded for this exact text only (`lane-a/security-two-factor-ui.spec.ts:392`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The shell's own session refetch failing, as `@auth/core` logs it (header: "Console rule" — never counted). */
const AUTHJS_FETCH_FAILURE = 'ClientFetchError: Failed to fetch';

const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));
const findingsApartFromAuthFetch = (shield: Shield) =>
	consoleFindings(shield).filter((line) => !line.includes(AUTHJS_FETCH_FAILURE));

/** `helpers.ts:185-190` keeps its token builder module-private, so this file restates the lane's own shape. */
function base64Url(value: object): string {
	return Buffer.from(JSON.stringify(value))
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

/** An unsigned three-part JWT, the shape `authCookie.access_token` holds in this lane. Never printed. */
function syntheticAccessToken(userId: string, organizationId: string, rotation: string): string {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: userId, organizationId, iat: now, exp: now + 86_400, jti: rotation };
	return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(claims)}.${rotation}`;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** The session cookie Auth.js would have written for these claims (`@auth/core/lib/utils/cookies` HKDF salt = name). */
async function sessionCookie(claims: Record<string, unknown>) {
	return {
		name: SESSION_COOKIE,
		value: await encode({ token: claims, secret: AUTH_SECRET, salt: SESSION_COOKIE }),
		domain: new URL(APP_ORIGIN).hostname,
		path: '/',
		httpOnly: true,
		secure: false,
		sameSite: 'Lax' as const
	};
}

async function mintSession(context: BrowserContext, claims: Record<string, unknown>): Promise<void> {
	await context.addCookies([await sessionCookie(claims)]);
}

/** What this app's own session endpoint says about the jar. */
async function sessionEcho(page: Page): Promise<{ status: number; body: Record<string, unknown> | null }> {
	const response = await page.request.get(`${APP_ORIGIN}/api/auth/session`);
	const text = await response.text();
	return {
		status: response.status(),
		body: text && text !== 'null' ? (JSON.parse(text) as Record<string, unknown>) : null
	};
}

/** The same read, made by the page itself, so the answer is the one this tab's browser would act on. */
async function sessionEchoFromPage(page: Page): Promise<{ status: number; body: Record<string, unknown> | null }> {
	return page.evaluate(async () => {
		const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
		const text = await response.text();
		return { status: response.status, body: text && text !== 'null' ? JSON.parse(text) : null };
	});
}

const authCookieKeys = (echo: { body: Record<string, unknown> | null }): string[] =>
	echo.body && typeof echo.body.authCookie === 'object' && echo.body.authCookie !== null
		? Object.keys(echo.body.authCookie as Record<string, unknown>).sort()
		: [];

/**
 * Every cookie of the session family in the jar (`setAuthCookies`, `cookies/index.ts:231-269`). Tokens are reported
 * as a length only: a token value is never printed anywhere in this file, and equality is asserted by comparing
 * booleans so that a failed expect cannot echo one either.
 */
const TOKEN_COOKIES = new Set(['auth-token', 'auth-refresh-token']);
async function writtenCookies(context: BrowserContext): Promise<Record<string, string>> {
	const jar: Record<string, string> = {};
	for (const cookie of await context.cookies()) {
		if (cookie.name.startsWith('auth-') || cookie.name === 'no-team-popup-show') jar[cookie.name] = cookie.value;
	}
	return jar;
}
const cookieReport = (jar: Record<string, string>): string[] =>
	Object.entries(jar)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(
			([name, value]) =>
				`${name}=${TOKEN_COOKIES.has(name) ? `<len ${value.length}>` : value === '' ? '""' : value}`
		);

/**
 * Every cookie of the family that carries a value at all: "a session was opened in this jar" as a fact. A token is
 * reported as a length only, so this list is safe to print (and to fail on).
 */
const openedNames = (jar: Record<string, string>): string[] =>
	Object.entries(jar)
		.filter(([, value]) => value !== '')
		.map(([name, value]) => `${name}=<len ${value.length}>`)
		.sort();

/** The eight cookies this page's `setAuthCookies` call writes (`page-component.tsx:37-48`, `cookies/index.ts:255-266`). */
const cookieNamesOfSetAuthCookies = [
	'auth-token',
	'auth-refresh-token',
	'auth-active-team',
	'auth-tenant-id',
	'auth-organization-id',
	'auth-active-language',
	'no-team-popup-show',
	'auth-user-id'
];

/**
 * The ten names `cookiesKeys()` lists (`cookies/index.ts:271-284`) — what `deny_redirect` blanks
 * (`proxy.ts:175-185`), as the sorted list a jar is compared to.
 */
const cookiesKeysSorted = [...cookieNamesOfSetAuthCookies, 'auth-active-task', 'auth-user-active-task'].sort();

/** The browser's requests, so a case can say where a request did not go (the Board, the issuer). */
function recordRequests(page: Page): Array<{ method: string; origin: string; path: string }> {
	const sent: Array<{ method: string; origin: string; path: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname.startsWith('/_next') || /\.(woff2?|css|js|map|png|svg|ico)$/.test(url.pathname)) return;
		sent.push({ method: request.method(), origin: url.origin, path: url.pathname });
	});
	return sent;
}

/** The public runtime env this app publishes in the document it served (`app/[locale]/layout.tsx`). */
async function publishedRuntimeEnv(page: Page): Promise<Record<string, string>> {
	const match = (await page.content()).match(/data-ever-teams-runtime-env="([^"]*)"/);
	const json = (match?.[1] ?? '')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
	try {
		return json ? (JSON.parse(json) as Record<string, string>) : {};
	} catch {
		return {};
	}
}

const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test.describe('lane-c · /auth/social-welcome: what a person sees and what cookies are written', () => {
	test.afterEach(async () => {
		// `fails`, `drops` and `delays` outlive a test unless the mock is reset (`playwright/helpers.ts:138-141`).
		await mockReset();
	});

	test('A · no session cookie: the loading state, then the sign-in page — nothing is opened', async ({
		page,
		context,
		mock,
		shield
	}) => {
		await context.clearCookies();
		// The loading branch (:93-97) is only observable while the session read is still pending — see the header.
		await page.route('**/api/auth/session', async (route) => {
			await waitMs(1_500);
			await route.fallback();
		});
		const response = await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });

		const loading = page.locator('section[role="status"]');
		await expect(loading.locator('h1'), 'auth.social.OPENING (page-component.tsx:95)').toHaveText(TEXT.opening, {
			timeout: 30_000
		});
		await expect(loading.locator('p'), 'auth.social.OPENING_TEXT').toHaveText(TEXT.openingText);
		// `AuthState` is busy only for tone="loading" (auth-state.tsx:41,49)
		await expect(loading, 'the loading block announces itself as a live status').toHaveAttribute(
			'aria-busy',
			'true'
		);
		await expect(loading).toHaveCount(1);

		await expect.poll(async () => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(DEFAULT_APP_PATH);

		const jar = await writtenCookies(context);
		measure('A · no session', {
			status: response?.status(),
			loadingTitle: TEXT.opening,
			finalUrl: new URL(page.url()).pathname,
			documents: shield.documents().map((d) => `${d.status} ${new URL(d.url).pathname}`),
			cookies: cookieReport(jar),
			mockPaths: (await mock.requests()).map((r) => `${r.method} ${r.path}`),
			consoleErrors: shield.consoleErrors()
		});

		// `router.replace(DEFAULT_APP_PATH)` (page-component.tsx:61) is a client navigation: one document was served.
		await expect(
			shield.documents(),
			'the replace to the sign-in page asked the server for no document'
		).toHaveLength(1);
		await expect(shield.documents()[0].status, 'the welcome page itself').toBe(200);
		await expect(new URL(shield.documents()[0].url).pathname).toBe('/auth/social-welcome');
		await expect(jar, 'a page with no session wrote no session cookie').toEqual({});
		await expect(await mock.requests(), 'and asked the test backend for nothing').toHaveLength(0);
		await expect(consoleFindings(shield), 'a page that only waited printed no error').toEqual([]);
		await expect(shield.pageErrors(), 'and threw nothing').toEqual([]);
	});

	test('B · authCookie {verifyEmail:true}: the activation notice, the address, and no session opened', async ({
		page,
		context,
		mock,
		shield
	}) => {
		const email = 'new.person@example.test';
		await context.clearCookies();
		await mintSession(context, { authCookie: { verifyEmail: true, email } });
		const response = await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });

		const state = page.locator('section[role="status"]');
		await expect(state.locator('h1'), 'auth.signUp.SENT_TITLE (page-component.tsx:79)').toHaveText(TEXT.sentTitle, {
			timeout: 30_000
		});
		await expect(state.locator('p'), 'auth.signUp.SENT_TEXT (:80)').toHaveText(TEXT.sentText);
		await expect(state.locator('h1')).toHaveCount(1);
		// The same sentence a second time, as InboxScene's subject line (auth-scenes.tsx:208, SUBJECT_KEY.activate :187-191)
		await expect(
			page.getByText(TEXT.sentTitle, { exact: true }),
			'SENT_TITLE and SUBJECT_ACTIVATE are the same sentence'
		).toHaveCount(2);
		await expect(page.getByText(TEXT.subjectActivate, { exact: true })).toHaveCount(2);
		await expect(
			page.getByText(TEXT.inboxTitle, { exact: true }),
			'auth.scene.INBOX_ACTIVATE_TITLE (:69)'
		).toHaveCount(1);
		await expect(
			page.getByText(TEXT.inboxText, { exact: true }),
			'auth.scene.INBOX_ACTIVATE_TEXT (:70)'
		).toHaveCount(1);
		// AuthAddress shows the address once, exactly (:87, auth-state.tsx:62-73); InboxScene repeats it inside "to …"
		await expect(page.getByText(email, { exact: true }), 'the address the person must confirm').toHaveCount(1);
		await expect(page.getByText(`to ${email}`, { exact: true })).toHaveCount(1);

		const link = page.getByRole('link', { name: TEXT.signIn });
		await expect(link, 'auth.signUp.SIGN_IN links to DEFAULT_APP_PATH (page-component.tsx:83)').toHaveCount(1);
		await expect(link).toHaveAttribute('href', DEFAULT_APP_PATH);

		const echo = await sessionEcho(page);
		// Not a duration assertion: "it never navigated" is a zero, so the page gets the time its own effect needs.
		await page.waitForTimeout(5_000);
		const jar = await writtenCookies(context);
		measure('B · verifyEmail', {
			status: response?.status(),
			urlAfter5s: new URL(page.url()).pathname,
			documents: shield.documents().map((d) => `${d.status} ${new URL(d.url).pathname}`),
			sessionEchoKeys: authCookieKeys(echo),
			sessionEcho: echo.body,
			cookies: cookieReport(jar),
			mockPaths: (await mock.requests()).map((r) => `${r.method} ${r.path}`),
			consoleErrors: shield.consoleErrors()
		});

		await expect(new URL(page.url()).pathname, 'the notice stays: no router.replace, no navigateAfterSignIn').toBe(
			'/auth/social-welcome'
		);
		await expect(shield.documents(), 'and no second document was asked for').toHaveLength(1);
		await expect(jar, 'the verifyEmail branch wrote no app cookie (only Auth.js wrote its own)').not.toHaveProperty(
			'auth-token'
		);
		await expect(jar, '…none of the family at all').toEqual({});
		await expect(authCookieKeys(echo), 'the endpoint hands the payload to the page as session.authCookie').toEqual([
			'email',
			'verifyEmail'
		]);
		await expect(
			await mock.requests(),
			'a sign-up that waits for its e-mail asks the API for nothing'
		).toHaveLength(0);
		await expect(consoleFindings(shield), 'the notice printed no error').toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test('C · a full social session: every cookie setAuthCookies writes, and where the person lands', async ({
		page,
		context,
		fixture,
		mock,
		shield
	}) => {
		const ids = fixture.ids;
		const accessToken = syntheticAccessToken(ids.user, ids.organizationA, 'welcome-c');
		const refreshToken = 'synthetic-refresh-token';
		await context.clearCookies();
		await mintSession(context, {
			name: 'Social Person',
			email: 'social.person@example.test',
			authCookie: {
				access_token: accessToken,
				refresh_token: { token: refreshToken },
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				teamId: ids.teamA,
				userId: ids.user
			}
		});
		await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect
			.poll(async () => (await writtenCookies(context))['auth-token'], { timeout: 20_000 })
			.not.toBeUndefined();

		const jar = await writtenCookies(context);
		const echo = await sessionEcho(page);
		measure('C · full social session', {
			finalUrl: new URL(page.url()).pathname,
			documents: shield.documents().map((d) => `${d.status} ${new URL(d.url).pathname}`),
			cookies: cookieReport(jar),
			sessionEchoKeys: authCookieKeys(echo),
			refreshCookieIsTheMintedString: jar['auth-refresh-token'] === refreshToken,
			shellCookies: Object.keys(jar)
				.filter((name) => !cookieNamesOfSetAuthCookies.includes(name))
				.sort(),
			mockPaths: (await mock.requests()).map((r) => `${r.method} ${r.path} ${r.status}`).slice(0, 6),
			userMeReads: (await mock.calls('/api/user/me')).length,
			consoleErrors: shield.consoleErrors()
		});

		// navigateAfterSignIn({replace:true}) (page-component.tsx:58) with no Board return and no stored path ends on '/'
		await expect(
			new URL(page.url()).pathname,
			'the sign-in this page opened lands on the app, not on /auth/passcode'
		).toBe('/');
		await expect(
			shield.documents().map((d) => `${d.status} ${new URL(d.url).pathname}`),
			'the welcome page, then a full page load of the app (navigate-after-sign-in.ts:41-45)'
		).toEqual(['200 /auth/social-welcome', '200 /']);

		// Tokens are compared by equality only; the value is never printed (header, "How a session is minted here").
		await expect(jar['auth-token'] === accessToken, 'auth-token is exactly the access token of the session').toBe(
			true
		);
		await expect(
			jar['auth-refresh-token'] === refreshToken,
			'auth-refresh-token is the session refresh token'
		).toBe(true);
		for (const [name, expected] of [
			['auth-tenant-id', ids.tenantA],
			['auth-organization-id', ids.organizationA],
			['auth-active-team', ids.teamA],
			['auth-user-id', ids.user],
			['auth-active-language', 'en']
		] as Array<[string, string]>) {
			await expect(jar[name] === expected, `${name} is the id of the session (cookies/index.ts:261-264)`).toBe(
				true
			);
		}
		await expect(
			cookieNamesOfSetAuthCookies.filter((name) => name !== 'no-team-popup-show').every((name) => name in jar),
			'every cookie this page writes is in the jar (finding 3 pins the eighth one)'
		).toBe(true);
		// Every session cookie lasts as long as the refresh token's expiry (sessionExpiryOf, cookies/index.ts:41-51);
		// this lane's refresh token is not a JWT, so they are session cookies — measured expires -1.
		const expiries = (await context.cookies()).filter((c) => c.name.startsWith('auth-')).map((c) => c.expires);
		await expect(
			expiries.every((expires) => expires === -1),
			'a refresh token with no `exp` gives session-length cookies'
		).toBe(true);

		await expect(
			(await mock.calls('/api/user/me')).length,
			'the shell really mounted on the session this page wrote'
		).toBeGreaterThan(0);
		await expect(shield.externalCalls(), 'nothing left the machine').toEqual([]);
		await expect(
			findingsApartFromAuthFetch(shield),
			'the shell logged nothing but its own session refetch'
		).toEqual([]);
		await expect(shield.pageErrors(), 'and threw nothing').toEqual([]);
	});

	test('D · refresh_token as a plain string: the refresh cookie holds it as it stands', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const accessToken = syntheticAccessToken(ids.user, ids.organizationB, 'welcome-d');
		const plainRefresh = 'plain-string-refresh-token';
		await context.clearCookies();
		await mintSession(context, {
			authCookie: {
				access_token: accessToken,
				refresh_token: plainRefresh,
				tenantId: ids.tenantB,
				organizationId: ids.organizationB,
				teamId: ids.teamB,
				userId: ids.user
			}
		});
		await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect
			.poll(async () => (await writtenCookies(context))['auth-refresh-token'], { timeout: 20_000 })
			.not.toBeUndefined();

		const jar = await writtenCookies(context);
		measure('D · refresh_token as a string', {
			finalUrl: new URL(page.url()).pathname,
			refreshCookieLength: jar['auth-refresh-token'].length,
			refreshCookieIsTheStringItself: jar['auth-refresh-token'] === plainRefresh,
			cookies: cookieReport(jar),
			consoleErrors: shield.consoleErrors()
		});

		// socialRefreshToken accepts a string or a {token} wrapper (social-session.ts:20-23)
		await expect(jar['auth-refresh-token'] === plainRefresh, 'the string is written as it arrived').toBe(true);
		await expect(jar['auth-token'] === accessToken, 'and the session opened exactly as in case C').toBe(true);
		await expect(jar['auth-organization-id'] === ids.organizationB, 'scope B ids travel too').toBe(true);
		await expect(new URL(page.url()).pathname).toBe('/');
		await expect(findingsApartFromAuthFetch(shield), 'nothing but the shell session refetch').toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test('E · authCookie {provider:"ever-id"}: readSocialSession refuses it and nothing opens', async ({
		page,
		context,
		mock,
		shield
	}) => {
		await context.clearCookies();
		await mintSession(context, { authCookie: { provider: 'ever-id', workspaces: [] } });
		await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });

		const echo = await sessionEcho(page);
		await expect.poll(async () => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(DEFAULT_APP_PATH);
		const jar = await writtenCookies(context);
		measure('E · ever-id shaped authCookie', {
			finalUrl: new URL(page.url()).pathname,
			sessionEchoKeys: authCookieKeys(echo),
			cookies: cookieReport(jar),
			documents: shield.documents().map((d) => `${d.status} ${new URL(d.url).pathname}`),
			mockPaths: (await mock.requests()).map((r) => `${r.method} ${r.path}`),
			consoleErrors: shield.consoleErrors()
		});

		await expect(authCookieKeys(echo), 'the endpoint keeps the shape the page will read').toEqual([
			'provider',
			'workspaces'
		]);
		// social-session.ts:14 — an ever-id payload is not a social session, so no Gauzy session is opened
		await expect(openedNames(jar), 'no cookie of the session family carries a value').toEqual([]);
		await expect(await mock.requests(), 'and the test backend was asked for nothing').toHaveLength(0);
		await expect(consoleFindings(shield), 'a refused session is a redirect, not an error').toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test('F · a session with only a user claim: the session.user fallback can never carry a token [MEASURED, DEAD BRANCH]', async ({
		page,
		context,
		fixture,
		mock,
		shield
	}) => {
		const ids = fixture.ids;
		await context.clearCookies();
		// The shape page-component.test.tsx:45-65 mocks: the tokens sit in session.user, not in session.authCookie.
		await mintSession(context, {
			name: 'Legacy Person',
			email: 'legacy.person@example.test',
			user: {
				access_token: 'legacy-access-token',
				refresh_token: 'legacy-refresh-token',
				tenantId: ids.tenantA
			}
		});
		await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });

		const echo = await sessionEcho(page);
		await expect.poll(async () => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(DEFAULT_APP_PATH);
		const jar = await writtenCookies(context);
		measure('F · only a user claim', {
			finalUrl: new URL(page.url()).pathname,
			sessionEchoKeys: Object.keys(echo.body ?? {}).sort(),
			sessionEchoUserKeys: Object.keys((echo.body?.user as Record<string, unknown>) ?? {}).sort(),
			accessTokenReachedSessionUser: 'access_token' in ((echo.body?.user as Record<string, unknown>) ?? {}),
			cookies: cookieReport(jar),
			mockPaths: (await mock.requests()).map((r) => `${r.method} ${r.path}`),
			consoleErrors: shield.consoleErrors()
		});

		// @auth/core's session action rebuilds session.user from name/email/picture: the minted access_token is gone.
		await expect(echo.body, 'the session endpoint adds no authCookie for this token').not.toHaveProperty(
			'authCookie'
		);
		await expect(
			'access_token' in ((echo.body?.user as Record<string, unknown>) ?? {}),
			'…and the access_token minted into the JWT never reaches session.user (finding 1)'
		).toBe(false);
		await expect(openedNames(jar), 'so readSocialSession finds a user with no token and opens nothing').toEqual([]);
		await expect(await mock.requests()).toHaveLength(0);
		await expect(consoleFindings(shield)).toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test("G · authCookie with no access_token: nothing opens, and the empty session cookies are the proxy's", async ({
		page,
		context,
		fixture,
		mock,
		shield
	}) => {
		const ids = fixture.ids;
		await context.clearCookies();
		await mintSession(context, {
			authCookie: {
				refresh_token: { token: 'r' },
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				teamId: ids.teamA,
				userId: ids.user
			}
		});
		await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });
		// Read the session first: this is the payload the welcome page's own effect sees (…probe-3.log A1). After the
		// replace below the sign-in page hands its own empty update back (`update({})`, sign-in-page.tsx:92) and the
		// payload is blanked — asserted further down, as its own measured fact.
		const echo = await sessionEcho(page);
		await expect.poll(async () => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(DEFAULT_APP_PATH);

		// The sign-in page this page redirected to is itself signed-in-looking to Auth.js, so it goes to '/'
		// (sign-in-page.tsx:89-91) and the proxy denies that path (finding 4). Ask for the same document once more
		// so the denial is a fact about this jar rather than about a page that may not have settled.
		await page.request.get(`${APP_ORIGIN}/`);
		await expect.poll(async () => Object.keys(await writtenCookies(context)).length, { timeout: 15_000 }).toBe(10);
		const jar = await writtenCookies(context);
		measure('G · no access_token', {
			finalUrl: new URL(page.url()).pathname,
			sessionEchoKeys: authCookieKeys(echo),
			cookies: cookieReport(jar),
			mockPaths: (await mock.requests()).map((r) => `${r.method} ${r.path}`),
			consoleErrors: shield.consoleErrors()
		});

		await expect(authCookieKeys(echo), 'the endpoint keeps every id of the payload').toEqual([
			'organizationId',
			'refresh_token',
			'teamId',
			'tenantId',
			'userId'
		]);
		// page-component.tsx:36 — without an access_token loadOAuthSession() is false, so :61 replaces to DEFAULT_APP_PATH
		await expect(openedNames(jar), 'nothing was opened, not even from the ids this session did carry').toEqual([]);
		await expect(
			Object.keys(jar).sort(),
			'the ten cookiesKeys() names are in the jar, each of them empty — proxy.ts:175-185 deny_redirect, not this page (finding 4)'
		).toEqual(cookiesKeysSorted);
		// What the payload becomes after the sign-in page runs: `update({})` (sign-in-page.tsx:92) reaches
		// auth.ts:76-78 with an empty object, so the ids the session carried are gone from this tab (`authCookie` is
		// now `{}`). Measured as the echo in …probe-4.log G1; asserted here rather than printed, because it is the
		// reason a later read of this jar cannot show what the welcome page was given.
		await expect
			.poll(async () => JSON.stringify((await sessionEcho(page)).body?.authCookie ?? null), { timeout: 20_000 })
			.toBe('{}');
		await expect(await mock.requests(), 'and the test backend still was asked for nothing').toHaveLength(0);
		await expect(consoleFindings(shield)).toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test('H · the Board return: this lane publishes no Board origin, so neither door can be tested [lane limit]', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const accessToken = syntheticAccessToken(ids.user, ids.organizationA, 'welcome-h');
		const boardCandidate = `${new URL(EVER_ID_ISSUER_URL).origin}/board`;
		await context.clearCookies();
		await mintSession(context, {
			authCookie: {
				access_token: accessToken,
				refresh_token: { token: 'welcome-h-refresh' },
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				teamId: ids.teamA,
				userId: ids.user
			}
		});
		const sent = recordRequests(page);
		await page.goto(`${APP_ORIGIN}/auth/social-welcome?redirect=${encodeURIComponent(boardCandidate)}`, {
			waitUntil: 'domcontentloaded'
		});
		await waitForShellReady(page);
		const env = await publishedRuntimeEnv(page);
		const storage = await page.evaluate(() => ({
			boardReturn: window.sessionStorage.getItem('ever-teams:board-return'),
			pathAfterSignIn: window.sessionStorage.getItem('ever-teams:path-after-sign-in')
		}));
		measure('H · Board return door 1 (?redirect=)', {
			finalUrl: new URL(page.url()).pathname,
			boardDomainPublished: env.NEXT_PUBLIC_BOARD_APP_DOMAIN ?? '<absent>',
			boardReturnStorage: storage.boardReturn,
			pathAfterSignInStorage: storage.pathAfterSignIn,
			requestsToIssuerOrigin: sent.filter((r) => r.origin === new URL(EVER_ID_ISSUER_URL).origin).length,
			origins: [...new Set(sent.map((r) => r.origin))].sort()
		});

		await expect(env.NEXT_PUBLIC_BOARD_APP_DOMAIN ?? '', 'the lane publishes no Board origin').toBe('');
		await expect(new URL(page.url()).pathname, 'so a ?redirect= to another origin changes nothing').toBe('/');
		await expect(storage.boardReturn, 'and nothing was stored for a later sign-in').toBeNull();
		await expect(storage.pathAfterSignIn).toBeNull();
		await expect(
			sent.filter((r) => r.origin === new URL(EVER_ID_ISSUER_URL).origin).length,
			'the browser sent no request to that origin at all'
		).toBe(0);

		// Door 2: write the storage entry by hand, exactly as board-return.ts would have, on the same tab.
		await page.evaluate(
			(url: string) =>
				window.sessionStorage.setItem('ever-teams:board-return', JSON.stringify({ url, savedAt: Date.now() })),
			boardCandidate
		);
		// sessionStorage survives this; the cookies must not: with `auth-token` in the jar the proxy would answer
		// /auth/social-welcome with a redirect to the app (proxy.ts SECTION 1, `sendsSignedInVisitToApp`) and this
		// door would never be tried at all. Measured as `200 /auth/social-welcome` in …probe-2.log 8b.
		await context.clearCookies();
		await mintSession(context, {
			authCookie: {
				access_token: accessToken,
				refresh_token: { token: 'welcome-h-refresh-2' },
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				teamId: ids.teamA,
				userId: ids.user
			}
		});
		await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });
		await expect.poll(async () => new URL(page.url()).pathname, { timeout: 30_000 }).toBe('/');
		const after = await page.evaluate(() => window.sessionStorage.getItem('ever-teams:board-return'));
		measure('H · Board return door 2 (hand-written storage)', {
			finalUrl: new URL(page.url()).pathname,
			boardReturnStorageAfter: after,
			documents: shield.documents().map((d) => `${d.status} ${new URL(d.url).pathname}`)
		});
		// board-app.ts:96-106 — with nothing to trust, boardReturnUrl returns null for every candidate
		await expect(after, 'takeBoardReturn took it away and still sent the person to /').toBeNull();
		await expect(shield.externalCalls(), 'no request ever left for a Board').toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test('I · the update path: what a page can write into its own session (auth.ts:76-78)', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const accessToken = syntheticAccessToken(ids.user, ids.organizationA, 'welcome-i');
		const clientToken = 'client-supplied-access-token';
		const clientTenantId = 'tenant-written-by-the-client';
		await context.clearCookies();
		// An inert same-origin document: /auth/error renders SignInError, which calls useSession for nothing.
		await page.goto(`${APP_ORIGIN}/auth/error`, { waitUntil: 'domcontentloaded' });

		/** A same-origin browser fetch: the browser sets Origin itself, and credentials come from its own cookie jar. */
		const postFromPage = async (body: Record<string, unknown>) =>
			page.evaluate(async (payload: Record<string, unknown>) => {
				const response = await fetch('/api/auth/session', {
					method: 'POST',
					credentials: 'same-origin',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
				return { status: response.status, text: (await response.text()).slice(0, 120) };
			}, body);

		// The CSRF token has to be asked for **by the page itself**: a token whose `authjs.csrf-token` cookie was
		// stored by Playwright's request API is in the jar (`context.cookies()` shows it, 131 characters) yet the
		// browser's own POST is refused 400 with it, while the same call accepted a cookie the page's own GET stored
		// (…probe-11.log P1 vs P2). Playwright's request API verifies its own, so it gets its own token below.
		const csrfToken = await page.evaluate(async () => {
			const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
			const body = (await response.json()) as { csrfToken: string };
			return body.csrfToken;
		});

		// First, on a jar with no session at all: the update is accepted (CSRF is valid) but there is nothing to
		// update — `@auth/core` answers 200 + `null` and writes no session cookie. This is the outer limit of
		// finding 2: the rewrite reaches a session the caller already holds.
		const noSession = await postFromPage({ csrfToken, data: { access_token: 'no-session-here' } });
		const afterNoSession = await sessionEchoFromPage(page);
		const madeSession = (await context.cookies()).some((cookie) => cookie.name === SESSION_COOKIE);

		await mintSession(context, {
			authCookie: {
				access_token: accessToken,
				refresh_token: { token: 'welcome-i-refresh' },
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				teamId: ids.teamA,
				userId: ids.user
			}
		});
		const before = await sessionEchoFromPage(page);

		const withCsrf = await postFromPage({
			csrfToken,
			data: { access_token: clientToken, tenantId: clientTenantId }
		});
		const afterCsrf = await sessionEchoFromPage(page);
		const withoutCsrf = await postFromPage({ data: { access_token: 'second-client-token' } });
		const afterNoCsrf = await sessionEchoFromPage(page);
		// A foreign Origin can only be named through Playwright's own request API (a browser refuses it from `fetch`).
		// It has to be named **as a header**: the `origin` option of Playwright's request API never puts an `Origin`
		// header on the wire — with it, this same call was answered 200 by a mock that refuses the header
		// (…s2-lane-c-welcome-2.log I vs …probe-3.log E4/E5).
		const apiCsrfToken = (await (await page.request.get(`${APP_ORIGIN}/api/auth/csrf`)).json()) as {
			csrfToken: string;
		};
		const foreignOrigin = await page.request.post(`${APP_ORIGIN}/api/auth/session`, {
			data: {
				csrfToken: apiCsrfToken.csrfToken,
				data: { provider: 'ever-id', marker: 'written-from-a-foreign-origin' }
			},
			headers: { origin: EVIL_ORIGIN }
		});
		const afterForeign = await sessionEcho(page);

		// The guard that proves the header really travelled: this lane's mock refuses an Origin it does not trust
		// (`cypress/support/mock-gauzy-server.mjs:1081-1085`).
		const refusedHere = await page.request.post(`${MOCK_ORIGIN}/api/probe-origin`, {
			data: {},
			headers: { origin: EVIL_ORIGIN }
		});
		const acceptedHere = await page.request.post(`${MOCK_ORIGIN}/api/probe-origin`, { data: {} });

		measure('I · update path', {
			noSession: { status: noSession.status, body: noSession.text, sessionCookieWritten: madeSession },
			beforeKeys: authCookieKeys(before),
			withCsrf: { status: withCsrf.status, body: withCsrf.text, afterKeys: authCookieKeys(afterCsrf) },
			withoutCsrf: {
				status: withoutCsrf.status,
				body: withoutCsrf.text,
				unchanged: authCookieKeys(afterNoCsrf).join() === authCookieKeys(afterCsrf).join()
			},
			foreignOrigin: {
				status: foreignOrigin.status(),
				body: (await foreignOrigin.text()).slice(0, 120),
				afterKeys: authCookieKeys(afterForeign)
			},
			mockOriginGuard: { refused: refusedHere.status(), accepted: acceptedHere.status() },
			consoleErrors: shield.consoleErrors()
		});

		await expect(noSession.status, 'a valid update on a jar with no session is accepted').toBe(200);
		await expect(noSession.text, '…and there is nothing for it to update').toBe('null');
		await expect(afterNoSession.body, '…so the session stays absent').toBeNull();
		await expect(
			madeSession,
			'…and no session was created by it (finding 2: the rewrite reaches a session you have)'
		).toBe(false);

		await expect(authCookieKeys(before), 'the minted session arrives whole').toEqual([
			'access_token',
			'organizationId',
			'refresh_token',
			'teamId',
			'tenantId',
			'userId'
		]);
		await expect(withCsrf.status, 'a same-origin POST with the csrf token is accepted').toBe(200);
		await expect(
			authCookieKeys(afterCsrf),
			'…and replaces authCookie wholesale: the ids that were minted are gone (finding 2)'
		).toEqual(['access_token', 'tenantId']);
		await expect(
			(afterCsrf.body?.authCookie as Record<string, unknown>).access_token === clientToken,
			"the value is the page's"
		).toBe(true);
		await expect(
			(afterCsrf.body?.authCookie as Record<string, unknown>).tenantId === clientTenantId,
			'…both of them'
		).toBe(true);

		await expect(withoutCsrf.status, 'the same POST without the csrf token is refused').toBe(400);
		await expect(withoutCsrf.text, "…with Auth.js's own empty answer").toBe('null');
		await expect(authCookieKeys(afterNoCsrf), '…and the session is untouched by it').toEqual([
			'access_token',
			'tenantId'
		]);

		await expect(foreignOrigin.status(), 'and the check is a CSRF check, not an Origin check (finding 2)').toBe(
			200
		);
		await expect(authCookieKeys(afterForeign), '…the session was replaced from a foreign Origin too').toEqual([
			'marker',
			'provider'
		]);
		await expect(refusedHere.status(), "the header did travel: this lane's mock refuses exactly that Origin").toBe(
			403
		);
		await expect(
			acceptedHere.status(),
			"…and answers the same call when the Origin is this lane's own or absent"
		).toBe(200);

		await expect(consoleFindings(shield), 'none of this printed a console error').toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test("J · a session a page wrote reaches the server's workspace sign-in [MEASURED, NOT INTENDED]", async ({
		page,
		context,
		fixture,
		mock,
		shield
	}) => {
		const ids = fixture.ids;
		// A workspace token this file invents, unique per run: everIdSetupAttempts throttles per token (3/minute).
		const plantedToken = `lane-c-welcome-planted-${Date.now()}-${ids.user}`;
		const email = `planted.${Date.now()}@example.test`;
		await context.clearCookies();
		await page.goto(`${APP_ORIGIN}/auth/error`, { waitUntil: 'domcontentloaded' });
		// The CSRF token by the page's own fetch, as in case I (…probe-11.log P1/P2).
		const csrfToken = await page.evaluate(async () => {
			const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
			const body = (await response.json()) as { csrfToken: string };
			return body.csrfToken;
		});

		// An ordinary social session first, because the update path rewrites a session that already exists (case I:
		// with no session cookie the same POST answers 200 + `null` and writes nothing). The plant below then replaces
		// it — which is the point of the case, and why it needs a real Ever ID sign-in not at all.
		await mintSession(context, {
			authCookie: {
				access_token: syntheticAccessToken(ids.user, ids.organizationA, 'welcome-j'),
				refresh_token: { token: 'welcome-j-refresh' },
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				teamId: ids.teamA,
				userId: ids.user
			}
		});
		const before = await sessionEchoFromPage(page);

		const plant = await page.evaluate(
			async (payload: { csrfToken: string; token: string; email: string; userId: string }) => {
				const response = await fetch('/api/auth/session', {
					method: 'POST',
					credentials: 'same-origin',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						csrfToken: payload.csrfToken,
						data: {
							provider: 'ever-id',
							confirmed_mail: payload.email,
							workspaces: [
								{
									token: payload.token,
									user: { id: payload.userId, email: payload.email, tenant: { name: 'Planted' } },
									current_teams: []
								}
							]
						}
					})
				});
				return { status: response.status, text: (await response.text()).slice(0, 80) };
			},
			{ csrfToken, token: plantedToken, email, userId: ids.user }
		);
		const echo = await sessionEchoFromPage(page);
		const finish = await page.evaluate(async () => {
			const response = await fetch('/api/auth/ever-id/finish-setup', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ workspace: 0 })
			});
			return { status: response.status, body: await response.text() };
		});
		const workspaceReads = await mock.calls('/api/auth/signin.workspace');
		const bearerSha256s = await receivedTokens('/api/auth/signin.workspace');

		measure('J · planted ever-id session → finish-setup', {
			plantStatus: plant.status,
			beforeKeys: authCookieKeys(before),
			sessionKeys: authCookieKeys(echo),
			sessionProvider: (echo.body?.authCookie as Record<string, unknown>)?.provider,
			workspacesInSession: ((echo.body?.authCookie as Record<string, unknown>)?.workspaces as unknown[])?.length,
			plantedTokenLength: plantedToken.length,
			finishStatus: finish.status,
			finishBody: finish.body,
			workspaceReads: workspaceReads.map((r) => `${r.method} ${r.path} ${r.status}`),
			bearerMatchesPlantedToken: bearerSha256s.map((sha) => sha === sha256(plantedToken)),
			consoleErrors: shield.consoleErrors()
		});

		await expect(authCookieKeys(before), 'the tab held an ordinary social session first').toEqual([
			'access_token',
			'organizationId',
			'refresh_token',
			'teamId',
			'tenantId',
			'userId'
		]);
		await expect(plant.status, 'the session was written by the page (case I)').toBe(200);
		await expect(authCookieKeys(echo), '…and it replaced that session outright').toEqual([
			'confirmed_mail',
			'provider',
			'workspaces'
		]);
		await expect(echo.body?.authCookie, '…which the endpoint hands back as an Ever ID session').toBeTruthy();
		await expect((echo.body?.authCookie as Record<string, unknown>).provider, 'provider ever-id').toBe('ever-id');
		await expect(finish.status, 'the server route accepted that session and tried the workspace sign-in').toBe(502);
		await expect(
			finish.body,
			'…which failed against the test backend (route.ts:54,58 → provision.ts:110-114)'
		).toBe('{"reason":"unavailable"}');
		await expect(
			workspaceReads.map((r) => `${r.method} ${r.path} ${r.status}`),
			'the lane mock logged exactly one workspace sign-in, refused'
		).toEqual(['POST /api/auth/signin.workspace 401']);
		await expect(
			bearerSha256s.map((sha) => sha === sha256(plantedToken)),
			'its bearer was exactly the token this file wrote into the session (the token itself is never printed)'
		).toEqual([true]);
		await expect(consoleFindings(shield), 'a refused setup is a status code, not a console error').toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test('K · no-team-popup-show is written as the string "undefined", which the app reads as true (finding 3)', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		await context.clearCookies();
		await mintSession(context, {
			authCookie: {
				access_token: syntheticAccessToken(ids.user, ids.organizationA, 'welcome-k'),
				refresh_token: { token: 'welcome-k-refresh' },
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				teamId: ids.teamA,
				userId: ids.user
			}
		});
		await page.goto(`${APP_ORIGIN}/auth/social-welcome`, { waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect
			.poll(async () => (await writtenCookies(context))['auth-token'], { timeout: 20_000 })
			.not.toBeUndefined();

		const jar = await writtenCookies(context);
		measure('K · no-team-popup-show', {
			value: JSON.stringify(jar['no-team-popup-show']),
			length: jar['no-team-popup-show'].length,
			cookies: cookieReport(jar),
			consoleErrors: shield.consoleErrors()
		});

		// page-component.tsx:37-48 omits noTeamPopup; cookies/index.ts:265 writes it unguarded (finding 3)
		await expect(jar['no-team-popup-show'], 'the cookie holds the text "undefined", not an absent cookie').toBe(
			'undefined'
		);
		await expect(jar['no-team-popup-show'].length, '…9 characters, which is what String(undefined) gives').toBe(9);
		await expect(
			cookieNamesOfSetAuthCookies.every((name) => name in jar),
			'every cookie this page writes is present, so this is one write, not a leftover'
		).toBe(true);
		await expect(findingsApartFromAuthFetch(shield)).toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});
});
