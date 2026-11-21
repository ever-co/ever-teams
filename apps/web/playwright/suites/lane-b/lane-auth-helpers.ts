import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

import { APP_ORIGIN, authCookieNames, mockRequests, type BootstrapFixture, type StubRequest } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Lane-local plumbing for the lane-b sign-in / session / locale specs. It lives in the lane folder on purpose:
 * `helpers.ts`, `fixtures.ts` and `api-fixtures.ts` are shared with the other lanes and are not mine to change.
 *
 * Everything here states *the data path*, not only what the page painted: which of this app's own route handlers the
 * browser asked and with what body (`watchAppApi`), and which Gauzy path the mock was asked and with what status
 * (`mockWasAsked`, `mockAskedNothing`, `describeMockLog`). The mock answers 200 with `{items:[],total:0}` for any path
 * it does not know, so "did the app ask at all" is only answerable from its log.
 */

/** The address of the mock's own fixture user (`baseUser` in `cypress/support/mock-gauzy-server.mjs`). */
export const MOCK_EMAIL = 'manager@example.test';

/** `AUTH_CODE_LENGTH` in `core/constants/config/constants.tsx`. */
export const CODE_LENGTH = 8;

/** A code the code field accepts: its slots take `[a-zA-Z0-9]` only, one character each. */
export const SIGN_IN_CODE = 'AB12CD34';

/**
 * A reset-link token the reset page does *not* treat as expired: `app/[locale]/auth/reset-password/page.tsx` decodes
 * the token and only refuses it when it decodes to a payload whose `exp` has passed. A plain string never decodes, so
 * the form is offered — "Gauzy remains the authority on submit".
 */
export const UNDECODABLE_RESET_TOKEN = 'playwright-lane-b-reset-token';

const base64Url = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');

/** An unsigned JWT whose `exp` is one hour in the past, in the shape `decodeJWT` accepts (`iat` and `exp` required). */
export const expiredResetToken = (): string => {
	const now = Math.floor(Date.now() / 1000);
	return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: 'lane-b', iat: now - 7_200, exp: now - 3_600 })}.fixture`;
};

/**
 * A session cookie set whose access token expired an hour ago, in the exact shape `helpers.ts` writes for the
 * fixture person (`signInWithFixture`: `domain` + `path` `/`, not httpOnly, not secure, `Lax`).
 *
 * The door judges a token by decoding it (`decodeJWT` needs numeric `exp` and `iat`, then `isTokenExpired(token, 60)`
 * in `proxy.ts`), so this cookie reads to the door as "signed in, but expired" — which is a different answer from
 * "no cookies at all", and that difference is what the session-routing specs pin.
 */
export const expiredAccessToken = (userId: string, organizationId?: string): string => {
	const now = Math.floor(Date.now() / 1000);
	return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({
		sub: userId,
		organizationId,
		iat: now - 7_200,
		exp: now - 3_600,
		jti: 'lane-b-expired'
	})}.fixture`;
};

/**
 * Puts a whole expired session in the jar: every cookie name the app's InitState reads, with an `auth-token` whose
 * `exp` has passed. The refresh cookie is left as the fixture gives it, because that is what a browser left open
 * overnight actually holds.
 */
export async function signInWithExpiredAccessToken(
	context: BrowserContext,
	fixture: BootstrapFixture
): Promise<void> {
	const host = new URL(APP_ORIGIN).hostname;
	const cookies = authCookieNames(fixture, 'A').map(([name, value]) => ({
		name,
		value: name === 'auth-token' ? expiredAccessToken(fixture.ids.user, fixture.ids.organizationA) : value,
		domain: host,
		path: '/',
		httpOnly: false,
		secure: false,
		sameSite: 'Lax' as const
	}));
	await context.clearCookies();
	await context.addCookies(cookies);
}

/** The mock's request log as one readable line, for every failure message that has to say what it did see. */
export const describeMockLog = (log: StubRequest[]): string =>
	log.length === 0
		? 'nothing at all'
		: log.map((request) => `${request.method} ${request.path} → ${request.status}`).join(', ');

/** The log entries whose path contains `fragment`, oldest first. */
export const mockCalls = async (fragment: string): Promise<StubRequest[]> =>
	(await mockRequests()).filter((request) => request.path.includes(fragment));

/**
 * The log entries whose path is exactly `path`.
 *
 * Exactness matters in this family: `/auth/signin.email/confirm` *contains* `/auth/signin.email`, so a substring
 * match cannot tell "a code was asked for" from "a code was confirmed".
 */
export const mockCallsExactly = async (path: string): Promise<StubRequest[]> =>
	(await mockRequests()).filter((request) => request.path === path);

/**
 * Waits for the mock to have been asked something whose path contains `fragment`, and fails with the whole log in the
 * message. The mock records a request when it answers it, so proof arrives a moment after the browser action.
 */
export async function mockWasAsked(fragment: string, { tries = 40, intervalMs = 250 } = {}): Promise<StubRequest[]> {
	let last: StubRequest[] = [];
	for (let attempt = 0; attempt < tries; attempt += 1) {
		last = await mockRequests();
		const hits = last.filter((request) => request.path.includes(fragment));
		if (hits.length > 0) return hits;
		await new Promise((done) => setTimeout(done, intervalMs));
	}
	throw new Error(
		`the mock was never asked for anything containing "${fragment}" (after ${tries} reads over ${
			(tries * intervalMs) / 1000
		}s). It was asked: ${describeMockLog(last)}`
	);
}

/** The same, matched on the whole path (`/auth/signin.email` and `/auth/signin.email/confirm` are different asks). */
export async function mockWasAskedExactly(path: string, { tries = 40, intervalMs = 250 } = {}): Promise<StubRequest[]> {
	let last: StubRequest[] = [];
	for (let attempt = 0; attempt < tries; attempt += 1) {
		last = await mockRequests();
		const hits = last.filter((request) => request.path === path);
		if (hits.length > 0) return hits;
		await new Promise((done) => setTimeout(done, intervalMs));
	}
	throw new Error(
		`the mock was never asked ${path} (after ${tries} reads over ${(tries * intervalMs) / 1000}s). It was asked: ${describeMockLog(last)}`
	);
}

/** Asserts the mock was asked nothing whose path contains `fragment` — the proof a refusal stopped in the browser. */
export async function mockAskedNothing(fragment: string): Promise<void> {
	const hits = await mockCalls(fragment);
	expect(
		hits.map((request) => `${request.method} ${request.path} → ${request.status}`),
		`the mock was asked "${fragment}" although the request should never have left the form: ${describeMockLog(
			await mockRequests()
		)}`
	).toEqual([]);
}

/**
 * The mock leg as the browser actually made it: method, path, body and status of every request the page sent to
 * **this lane's mock origin**.
 *
 * This witness exists because the leg `watchAppApi` was written for does not happen in a mock run. Each sign-in
 * method of `core/services/client/api/auth/auth.service.ts` branches on `GAUZY_API_BASE_SERVER_URL.value` — set to
 * the mock by `playwright/test-servers.ts:109` — and takes the direct branch: `signInEmail` posts `/auth/signin.email`
 * (lines 179-185), `signInEmailConfirm` `/auth/signin.email/confirm` (201-212), `signInEmailPassword`
 * `/auth/signin.email.password` (188-193), `signInWithEmailAndCode` `/auth/login` (136-142) and `resetPassword`
 * `/auth/reset-password` (303-310). Only `requestPassword` (and the other non-Gauzy fallbacks) reaches this app's own
 * handler. So the body a sign-in form sent is observable **here**, on the mock leg, and never on `APP_ORIGIN` —
 * filtering `/api/auth/signin-email` off the app origin sees nothing but NextAuth's own chatter, which is exactly what
 * the 2026-11-21 run recorded (`GET /api/auth/session … POST /api/log`, and no sign-in route).
 *
 * `OPTIONS` is skipped: a JSON cross-origin POST is preceded by a CORS preflight, and the mock answers it before
 * recording anything (`cypress/support/mock-gauzy-server.mjs`, the `method === 'OPTIONS'` early return), so counting it
 * would disagree with the mock's own log.
 */
export function watchMockApi(page: Page): () => AppApiCall[] {
	const calls: AppApiCall[] = [];
	const isMockCall = (url: URL) => url.origin === new URL(MOCK_ORIGIN).origin && url.pathname.startsWith('/api/');

	page.on('request', (request) => {
		const url = new URL(request.url());
		if (!isMockCall(url) || request.method() === 'OPTIONS') return;
		const raw = request.postData();
		let body: unknown = null;
		if (raw !== null && raw !== undefined) {
			try {
				body = JSON.parse(raw);
			} catch {
				body = raw;
			}
		}
		calls.push({ method: request.method(), path: url.pathname, body, status: 0 });
	});
	page.on('response', (response) => {
		const url = new URL(response.url());
		if (!isMockCall(url) || response.request().method() === 'OPTIONS') return;
		for (let index = calls.length - 1; index >= 0; index -= 1) {
			if (calls[index].path === url.pathname && calls[index].status === 0) {
				calls[index].status = response.status();
				break;
			}
		}
	});

	return () => calls;
}

/**
 * The paths the mock's own request log holds for the sign-in family.
 *
 * ⚠ They carry this app's `/api` prefix, on **both** legs, and a filter written without it matches nothing (measured
 * 2026-11-21 with `lane-servers.mjs up lane-b`, `POST /api/auth/signin-email` then `GET 127.0.0.1:3998/requests`:
 * `[{"method":"POST","path":"/api/auth/signin.email",…}]`):
 *
 * - the server leg: `serverFetch` fetches `GAUZY_API_SERVER_URL + path` (`core/services/server/fetch.ts`) and that
 *   constant is `basePath + '/api'` (`core/constants/config/constants.tsx`, `GAUZY_API_SERVER_URL`);
 * - the browser leg: `apiConfig` sets axios `baseURL = baseURL ? \`${baseURL}/api\` : undefined`
 *   (`core/services/client/axios.ts:110`) over `GAUZY_API_BASE_SERVER_URL` (`NEXT_PUBLIC_GAUZY_API_SERVER_URL`,
 *   which `playwright/test-servers.ts:109` sets to this lane's mock).
 *
 * The mock's own handlers agree — every one of them is keyed on the prefixed path (`cypress/support/mock-gauzy-server.mjs`,
 * e.g. `if (pathname === '/api/user/me')`, `if (pathname === '/api/auth/refresh-token')`).
 */
export const AUTH_API_PATHS = [
	'/api/auth/signin.email',
	'/api/auth/signin.email.password',
	'/api/auth/signin.email/confirm',
	'/api/auth/request-password',
	'/api/auth/reset-password',
	'/api/auth/register',
	'/api/auth/login',
	'/api/auth/refresh-token',
	'/api/auth/verify-code',
	'/api/invite/validate-by-code'
];

/** How many sign-in asks the mock has recorded so far. Take this *before* the action under test. */
export const mockAuthAskCount = async (): Promise<number> =>
	(await mockRequests()).filter((request) => AUTH_API_PATHS.some((path) => request.path.startsWith(path))).length;

/**
 * Proves a refusal stopped in the browser: the mock's sign-in asks did not grow because of it.
 *
 * A count taken *before* the action, rather than an empty log, because loading an auth page can itself ask the
 * backend for something (the languages, the available tenants), and that is not the refused attempt.
 */
export async function mockAskedNoNewAuthPath(asksBefore: number): Promise<void> {
	const log = await mockRequests();
	const asked = log.filter((request) => AUTH_API_PATHS.some((path) => request.path.startsWith(path)));
	expect(
		asked.slice(asksBefore).map((request) => `${request.method} ${request.path} → ${request.status}`),
		`a refused form reached the mock (${asked.length - asksBefore} new asks). Whole log: ${describeMockLog(log)}`
	).toEqual([]);
	expect(
		asked.length,
		`the mock's sign-in asks grew from ${asksBefore} to ${asked.length} although the form refused: ${describeMockLog(log)}`
	).toBe(asksBefore);
}

/** Asserts none of the sign-in paths was asked at all (for a page that asked nothing before the action). */
export async function mockAskedNoAuthPath(): Promise<void> {
	await mockAskedNoNewAuthPath(0);
}

export type AppApiCall = { method: string; path: string; body: unknown; status: number };

/**
 * Watches this app's *own* route handlers (`/api/...` on the app origin), which is the half the mock's log cannot
 * show: the body the browser sent, and the status this app answered with. The mock only ever sees the next leg, and
 * without its bodies the only witness of "what was asked" is the browser.
 *
 * `POST /api/health` and the other same-origin calls are included on purpose; a spec filters by path.
 */
export function watchAppApi(page: Page): () => AppApiCall[] {
	const calls: AppApiCall[] = [];
	const isAppApi = (url: URL) => url.origin === APP_ORIGIN && url.pathname.startsWith('/api/');

	page.on('request', (request) => {
		const url = new URL(request.url());
		if (!isAppApi(url)) return;
		const raw = request.postData();
		let body: unknown = null;
		if (raw !== null && raw !== undefined) {
			try {
				body = JSON.parse(raw);
			} catch {
				body = raw;
			}
		}
		calls.push({ method: request.method(), path: url.pathname, body, status: 0 });
	});
	page.on('response', (response) => {
		const url = new URL(response.url());
		if (!isAppApi(url)) return;
		for (let index = calls.length - 1; index >= 0; index -= 1) {
			if (calls[index].path === url.pathname && calls[index].status === 0) {
				calls[index].status = response.status();
				break;
			}
		}
	});

	return () => calls;
}

/**
 * This app's own sign-in route handlers, by exact path (`app/api/auth/...`).
 *
 * NextAuth's own routes (`/api/auth/session`, `/api/auth/csrf`, …) are deliberately NOT in this list:
 * `core/components/pages/auth/sign-in/sign-in-page.tsx` calls `useSession()`, so a sign-in page asks NextAuth by
 * itself whether or not the person submitted anything, and that chatter is not the flow under test. Matching the
 * sign-in family on the `/api/auth/` prefix would therefore blame a refused form for a page-mount call.
 *
 * ⚠ In a mock run a browser does not ask any of these routes at all — the auth client posts straight to the mock
 * (`watchMockApi`'s note above, `auth.service.ts:136-142, 179-212, 303-310`). A sign-in spec must not read an empty
 * `appAuthAsks()` as proof that a form refused: it is also what a form that submitted gives. It is a real witness only
 * for the routes the client really uses here (`requestPassword`, `resetPassword`'s non-Gauzy fallback), and the
 * `route-refusals` suite calls those handlers directly with the `api` fixture instead.
 */
export const APP_SIGN_IN_ROUTES = [
	'/api/auth/signin-email',
	'/api/auth/signin-email-confirm',
	'/api/auth/signin-email-password',
	'/api/auth/request-password',
	'/api/auth/reset-password',
	'/api/auth/register'
];

/** The watched calls that are one of this app's sign-in routes. */
export const appAuthAsks = (calls: AppApiCall[]): AppApiCall[] =>
	calls.filter((call) => APP_SIGN_IN_ROUTES.includes(call.path));

/** The watched calls whose path contains `fragment`, as readable lines. */
export const appCallsMatching = (calls: AppApiCall[], fragment: string): AppApiCall[] =>
	calls.filter((call) => call.path.includes(fragment));

export const describeAppCalls = (calls: AppApiCall[]): string =>
	calls.length === 0
		? 'nothing on /api'
		: calls.map((call) => `${call.method} ${call.path} → ${call.status || '(no answer yet)'}`).join(', ');

/**
 * The size of the reveal row that holds a field, in CSS pixels, or `null` when the reveal is not in the document.
 *
 * Copied from `suites/mock/auth.spec.ts`, where it is explained: `AuthReveal` closes by collapsing its grid row
 * (`grid-rows-[0fr]` over a `min-h-0 overflow-hidden` box) and marking the subtree `inert`, so Playwright's
 * `toBeHidden()` on the input inside it is the wrong tool — the field keeps its own box inside the clipped row.
 */
export const revealBoxOf = (
	page: Page,
	fieldId: string
): Promise<{ revealHeight: number; fieldHeight: number; inert: boolean } | null> =>
	page.evaluate((id) => {
		const field = document.getElementById(id);
		const reveal = field?.closest('[class*="grid-rows-"]');
		if (!reveal) return null;
		return {
			revealHeight: Math.round(reveal.getBoundingClientRect().height),
			fieldHeight: Math.round(field?.getBoundingClientRect().height ?? -1),
			inert: (reveal as HTMLElement).hasAttribute('inert')
		};
	}, fieldId);

/**
 * The error line an auth form writes under its field: every `AuthField`/`AuthCodeField` renders
 * `<p id="<field id>-error" role="alert">` (`core/components/auth/kit/auth-field.tsx`, `auth-code-field.tsx`).
 */
export const fieldError = (page: Page, fieldId: string): Locator => page.locator(`#${fieldId}-error`);

/** The 8 code slots of the sign-in code field, scoped to the fieldset its label names. */
export const codeSlots = (page: Page): Locator => page.locator('[aria-labelledby="passcode-code-label"] input');

/** Types a code one slot at a time, the way the field takes it (each slot holds one character). */
export async function fillCodeSlots(page: Page, code: string): Promise<void> {
	const slots = codeSlots(page);
	expect(await slots.count(), `the code field rendered ${await slots.count()} slots, not ${code.length}`).toBe(
		code.length
	);
	for (let index = 0; index < code.length; index += 1) {
		await slots.nth(index).fill(code[index]);
	}
}

/** What the slots actually hold, as one string. */
export const codeSlotValues = (page: Page): Promise<string> =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[aria-labelledby="passcode-code-label"] input'))
			.map((input) => (input as HTMLInputElement).value)
			.join('')
	);

/**
 * Fills the address and asks for a code, and waits for the code step. Returns nothing: the caller asserts the
 * requests this caused.
 */
export async function askForCode(page: Page, email: string): Promise<void> {
	await page.locator('#passcode-email').fill(email);
	await page.getByRole('button', { name: 'Send me a code' }).click();
	// The code field's own label, not a piece of copy: `#passcode-code-label` is rendered only by
	// `AuthCodeField` (`core/components/auth/kit/auth-code-field.tsx`), so it is on the page exactly when the code
	// step is, and it cannot be echoed by the address typed or by the description naming the address.
	await expect(
		page.locator('#passcode-code-label'),
		'asking for a code did not open the code step (its "Sign-in code" label is not on the page)'
	).toBeVisible({ timeout: 20_000 });
}

/** The names these specs call a session: the app's own `auth-*` family plus the popup flag. */
const SESSION_COOKIE_NAMES = (name: string): boolean => name.startsWith('auth-') || name === 'no-team-popup-show';

/**
 * The session cookies in the jar, as `name=value` lines sorted by name.
 *
 * A cookie whose value is **empty** is not a session and is left out on purpose: the door clears the session family
 * by writing `Set-Cookie: auth-token=` with no value (`deny_redirect` in `proxy.ts`), so a cleared jar still shows
 * those names. Asserting on the value is what says whether a session is really in the browser.
 */
export const sessionCookies = async (context: BrowserContext): Promise<string[]> => {
	const cookies = await context.cookies();
	return cookies
		.filter((cookie) => SESSION_COOKIE_NAMES(cookie.name) && cookie.value.length > 0)
		.map((cookie) => `${cookie.name}=${cookie.value.slice(0, 24)}…`)
		.sort();
};

/** Every cookie name in the jar, sorted — for a test that asserts which names are present, value aside. */
export const jarCookieNames = async (context: BrowserContext): Promise<string[]> =>
	(await context.cookies()).map((cookie) => cookie.name).sort();

/** The jar as readable lines, with each cookie's host, so a domain mistake is visible in a failure. */
export const describeCookies = async (context: BrowserContext): Promise<string> => {
	const cookies = await context.cookies();
	return cookies.length === 0
		? 'an empty jar'
		: cookies.map((cookie) => `${cookie.name} on ${cookie.domain}${cookie.path}`).sort().join(', ');
};

/** Every cookie in the jar must belong to the origin the run is on: `NEXT_PUBLIC_COOKIE_DOMAINS` is blank. */
export async function assertCookiesStayOnThisOrigin(context: BrowserContext): Promise<void> {
	const cookies = await context.cookies();
	const host = new URL(APP_ORIGIN).hostname;
	const foreign = cookies
		.filter((cookie) => cookie.domain.replace(/^\./, '') !== host)
		.map((cookie) => `${cookie.name} on ${cookie.domain}`);
	expect(
		foreign,
		`a cookie was scoped somewhere other than ${host} (NEXT_PUBLIC_COOKIE_DOMAINS is blank in this run, so one scoped to ever.team would never be sent back): ${await describeCookies(
			context
		)}`
	).toEqual([]);
}
