import type { BrowserContext, Page } from '@playwright/test';

import { APP_ORIGIN, CONTROL_ORIGIN } from './test-servers';

/** What `context.addCookies` takes (Playwright's `Cookie` is what `context.cookies()` returns, with `expires`). */
type CookieToAdd = Parameters<BrowserContext['addCookies']>[0][number];

/**
 * Shared plumbing for the Playwright suites.
 *
 * Everything a test needs from the backend arrives over the control API (apps/web/playwright/
 * backend.mjs): Cypress could reach the mock in-process with `cy.task`, Playwright workers cannot,
 * and reading the fixture from disk here would let a test assert on ids the mock no longer answers
 * with. No file paths, no module-URL tricks: this file is transpiled as CommonJS by Playwright
 * because apps/web is a CommonJS package.
 */

/**
 * Both origins come from test-servers.ts, the file that starts the servers, so the address a config waits on and
 * the address this file talks to cannot disagree. The app origin must be `localhost`, not `127.0.0.1` — see the
 * note on APP_ORIGIN there.
 */
export { APP_ORIGIN };

/**
 * Console noise a hermetic run causes on purpose, or that the app cannot control: a refused or
 * intercepted request logs itself, Next says its own piece, and a missing favicon is not a bug.
 * Anything else the console reports as an error is a finding, which is the point of the shield.
 */
export const CONSOLE_NOISE = [
	/Failed to load resource/i,
	/net::ERR_/,
	/Download the React DevTools/,
	/favicon/i,
	/\[Vercel\]/,
	/DevTools setting/i,
	// A read the app aborted itself, not a failure: `next dev` runs React Strict Mode (Next's App Router default), which
	// mounts each component twice, so TanStack Query aborts the first fetch of a query whose AbortSignal was handed
	// to axios and a second fetch answers (the trace shows GET /invite twice 4 ms apart, the first canceled, the
	// second 200). InviteService.getTeamInvitations logs every rejection, this one too
	// (core/services/client/api/organizations/teams/invites/invite.service.ts); ApiErrorService maps ERR_CANCELED
	// to 499 (core/services/client/api-error.service.ts). Matches only that cancellation.
	/\(Request Canceled\) – The request has been canceled by the client\. \(HTTP 499\)/
];

export type StubRequest = {
	method: string;
	path: string;
	query: string;
	startMs: number;
	endMs: number;
	status: number;
	/** sha256 of the `Bearer` token the request carried (the mock never keeps the token), or null without one. */
	bearerSha256: string | null;
};

export type BootstrapFixture = {
	ids: Record<string, string>;
	names: Record<string, string>;
	profileLink: string;
};

export type MockScenario = {
	scope?: 'A' | 'B';
	manager?: boolean;
	hasPlan?: boolean;
	requirePlanToTrack?: boolean;
	shareProfileView?: boolean;
	timerRunning?: boolean;
	timerLogId?: string;
	timerSource?: 'TEAMS' | 'DESKTOP';
	timerStartedAt?: string;
	notificationPreferences?: Record<string, unknown>;
	notificationSettingFails?: boolean;
	notifications?: Array<Record<string, unknown>>;
	tenantRegistrationClosed?: boolean;
	workspacePaywall?: boolean;
	newWorkspaceRefreshFails?: boolean;
	statsPaired?: boolean;
	statsEnabledUi?: boolean;
	statsOperator?: boolean;
	connectHealth?: boolean;
	connectConnected?: boolean;
	delays?: Record<string, number>;
	[key: string]: unknown;
};

async function control<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${CONTROL_ORIGIN}${path}`, {
		...init,
		headers: { accept: 'application/json', 'content-type': 'application/json', ...(init?.headers ?? {}) }
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		throw new Error(`test backend ${path} failed: HTTP ${response.status} ${detail.slice(0, 300)}`);
	}
	return (await response.json()) as T;
}

/** The switches mock-gauzy-server.mjs accepts. `setScenario` shallow-merges, and `delays` accumulate
 * across calls: only `mockReset()` clears them, so a test that sets a delay must reset after itself. */
export const mockScenario = (scenario: MockScenario) =>
	control<void>('/scenario', { method: 'POST', body: JSON.stringify(scenario) });

export const mockReset = () => control<unknown>('/reset', { method: 'POST' });
export const mockRequests = () => control<StubRequest[]>('/requests');
export const mockState = () => control<Record<string, unknown>>('/state');
export const statsReports = () => control<Array<{ instanceId: string; period: string; product: string }>>('/stats');

/** What the mock received of a back-channel logout: the answer it gave, the sha256 of the token, the content type. */
export type EverIdLogoutRecord = { answer: string; tokenSha256: string | null; contentType: string };

export const everIdLogouts = async (): Promise<EverIdLogoutRecord[]> => {
	const state = (await mockState()) as { everIdLogouts?: EverIdLogoutRecord[] };
	return state.everIdLogouts ?? [];
};

let fixtureCache: BootstrapFixture | undefined;

/** The bootstrap fixture the mock itself is answering from. */
export async function loadFixture(): Promise<BootstrapFixture> {
	if (!fixtureCache) fixtureCache = await control<BootstrapFixture>('/fixture');
	return fixtureCache;
}

function base64Url(value: object): string {
	return Buffer.from(JSON.stringify(value))
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

/** The cookie names the app's InitState reads; exported so server-route tests can present them too. */
export function authCookieNames(fixture: BootstrapFixture, scope: 'A' | 'B' = 'A'): Array<[string, string]> {
	const suffix = scope === 'B' ? 'B' : 'A';
	const { ids } = fixture;
	return [
		['auth-token', syntheticAccessToken(ids.user, ids[`organization${suffix}`])],
		['auth-refresh-token', 'synthetic-refresh-token'],
		['auth-active-team', ids[`team${suffix}`]],
		['auth-tenant-id', ids[`tenant${suffix}`]],
		['auth-organization-id', ids[`organization${suffix}`]],
		['auth-active-language', 'en'],
		['auth-user-id', ids.user],
		['auth-active-task', ids.task],
		['auth-active-project', ids.project],
		['no-team-popup-show', 'true']
	];
}

/** The same cookies as a `Cookie:` header, for tests that call Next.js route handlers directly. */
export function authCookieHeader(fixture: BootstrapFixture, scope: 'A' | 'B' = 'A'): string {
	return authCookieNames(fixture, scope)
		.map(([name, value]) => `${name}=${value}`)
		.join('; ');
}

/** An unsigned three-part JWT, the shape commands.ts builds and the mock's own syntheticToken uses. */
function syntheticAccessToken(userId: string, organizationId: string | undefined, rotation = 'initial'): string {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: userId, organizationId, iat: now, exp: now + 86_400, jti: rotation };
	return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(claims)}.fixture`;
}

/**
 * Signs a fixture person in the way commands.ts does: cookies only, no sign-in flow. The mock never
 * reads cookies — they are for the app's InitState. Scope B is the second tenant of the same person,
 * and needs both cookies and a matching `organizationId` claim, because the app derives the
 * `tenant-id` request header from `auth-tenant-id` and /api/auth/switch-organization gates on it.
 */
export async function signInWithFixture(
	context: BrowserContext,
	fixture: BootstrapFixture,
	scope: 'A' | 'B' = 'A'
): Promise<void> {
	// `domain` + `path`, not `url` + `path`: Playwright refuses a cookie that names both (`Cookie should
	// have either url or path`), and the path matters here — the app's session cookies are root-path ones.
	const host = new URL(APP_ORIGIN).hostname;
	const cookie = (name: string, value: string): CookieToAdd => ({
		name,
		value,
		domain: host,
		path: '/',
		httpOnly: false,
		secure: false,
		sameSite: 'Lax'
	});

	await context.clearCookies();
	await context.addCookies(authCookieNames(fixture, scope).map(([name, value]) => cookie(name, value)));
}

/**
 * The mock's request log, re-read until it satisfies a predicate. A page mounts its data after the
 * shell is ready, so a fixed wait is not enough: the Cypress profile-activity spec lost a read that
 * way on a busy runner. Pass a window wider than the slowest expected call, not a guess.
 */
export async function mockRequestsWhen(
	isReady: (requests: StubRequest[]) => boolean,
	{ tries = 40, intervalMs = 250 }: { tries?: number; intervalMs?: number } = {}
): Promise<StubRequest[]> {
	let last: StubRequest[] = [];
	for (let attempt = 0; attempt < tries; attempt += 1) {
		last = await mockRequests();
		if (isReady(last)) return last;
		await new Promise((done) => setTimeout(done, intervalMs));
	}
	throw new Error(
		`the test backend was never asked for what the test expected (after ${tries} reads): ${last
			.map((request) => `${request.method} ${request.path}`)
			.join(', ')}`
	);
}

/**
 * Waits for the mock's state to satisfy a predicate, re-reading it on an interval. The mock mutates
 * its own state as the app calls it (timer start/stop, the statistics toggle, a notification write), so
 * "the app did it" is only visible a moment after the browser action — the same reason Cypress specs
 * poll `cy.mockState()`.
 */
export async function mockStateWhen<T extends Record<string, unknown>>(
	isReady: (state: T) => boolean,
	{ tries = 40, intervalMs = 500 }: { tries?: number; intervalMs?: number } = {}
): Promise<T> {
	let last: T | undefined;
	for (let attempt = 0; attempt < tries; attempt += 1) {
		last = (await mockState()) as T;
		if (isReady(last)) return last;
		await new Promise((done) => setTimeout(done, intervalMs));
	}
	throw new Error(`the test backend never reached the expected state after ${tries} reads: ${JSON.stringify(last)}`);
}

/**
 * A logout token from the fake Ever ID issuer (apps/web/playwright/ever-id-idp.mjs): the compact JWS, its
 * claims, and the sha256 of the token — the handle a test uses to prove *which* token travelled through the
 * app, because the mock records that hash and never the token itself.
 */
export type LogoutToken = { token: string; claims: Record<string, unknown>; alg: string; kid: string; sha256: string };

/**
 * Asks the fake issuer to sign a logout token. `claims` adds or replaces claims and a claim set to `null` is
 * left out, which is how a case drops the `jti`, the `events` claim or both `sid` and `sub`; `alg` is `RS256`
 * (genuine), `HS256` (the algorithm-confusion forgery, signed with the issuer's published *public* key) or
 * `none`; `kid` picks the published key or the one the issuer never publishes.
 */
export const idpLogoutToken = (
	options: {
		claims?: Record<string, unknown>;
		alg?: 'RS256' | 'HS256' | 'none';
		/** The key that signs; `headerKid` is the key the token names. Different ones make a bad signature. */
		kid?: string;
		headerKid?: string;
		aud?: string;
		iss?: string;
	} = {}
) => control<LogoutToken>('/idp/logout-token', { method: 'POST', body: JSON.stringify(options) });

/** What the fake issuer was asked for since the reset: discovery and key-set reads, in order. */
export const idpState = () =>
	control<{
		issuer: string;
		contacts: Array<{ method: string; path: string }>;
		minted: Array<Record<string, unknown>>;
	}>('/idp/state');

/**
 * The NextAuth session support/e2e.ts stubs globally; the app origin serves this route, the mock does not. Matched on
 * the app origin and the exact path: a glob ending in `/api/auth/session**` also caught Gauzy's own `/api/auth/sessions`
 * (the person's sessions, core/services/client/api/auth/user-session.service.ts) and answered it with this object, so
 * Settings › Profile crashed on "sessions is not iterable".
 */
const SESSION_ROUTE = (url: URL) => url.origin === APP_ORIGIN && url.pathname === '/api/auth/session';

/** Takes the session stub away again: a later signed-out visit on the same page must not keep it. */
export async function unstubNextAuthSession(page: Page): Promise<void> {
	await page.unroute(SESSION_ROUTE);
}

export async function stubNextAuthSession(page: Page): Promise<void> {
	await page.route(SESSION_ROUTE, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: { 'cache-control': 'no-store' },
			body: JSON.stringify({
				expires: '2099-01-01T00:00:00.000Z',
				user: { email: 'manager@example.test', name: 'Fixture Manager' }
			})
		})
	);
}

/**
 * Next's dev overlay mounts a `nextjs-portal` element on every page it serves, error or not, so the
 * portal proves nothing — asserting it is absent fails every page in a dev run. The error UI (the
 * runtime-error dialog with its call stack, the build-error container, the build-error toast) only
 * appears inside that portal, in its own shadow tree, when something actually broke.
 *
 * This returns the text of that markup — walking every shadow tree, because the overlay nests them —
 * so a failing assertion quotes what the developer would have seen on screen.
 */
const DEV_ERROR_MARKUP = [
	'[data-nextjs-dialog]',
	'[data-nextjs-dialog-body]',
	'[data-nextjs-codeframe]',
	'.nextjs-container-errors-body',
	// The issues pill and the error toast exist only while the overlay has something to report
	// (next/dist/compiled/next-devtools: `data-issues`, `.nextjs-toast-errors-parent`).
	'[data-issues]',
	'.nextjs-toast-errors-parent'
].join(',');

export async function devOverlayErrors(page: Page): Promise<string[]> {
	return page.evaluate((selector) => {
		const found: string[] = [];
		const walk = (root: Document | ShadowRoot) => {
			for (const element of Array.from(root.querySelectorAll('*'))) {
				if (element.matches(selector)) {
					const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
					if (text) found.push(text.slice(0, 400));
				}
				if (element.shadowRoot) walk(element.shadowRoot);
			}
		};
		walk(document);
		return found;
	}, DEV_ERROR_MARKUP);
}

/** Resolves once the app has marked its shell ready (the mark startup-performance waits on). */
export async function waitForShellReady(page: Page, timeout = 45_000): Promise<void> {
	await page.waitForFunction(() => performance.getEntriesByName('ever-teams:shell-ready').length > 0, undefined, {
		timeout
	});
}

/**
 * Clears browser storage in place, navigates, and waits for the shell — the Playwright `hardVisit`.
 *
 * `requireShell: false` is for a route that has no authenticated shell to wait for (a sign-in page, a
 * page the app answers 404 for): there is no mark there, and waiting 45 s for one only hides what the
 * route actually did.
 */
export async function hardVisit(page: Page, path: string, options: { requireShell?: boolean } = {}): Promise<void> {
	await page.goto(APP_ORIGIN, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
	await page.evaluate(() => {
		window.localStorage.clear();
		window.sessionStorage.clear();
		window.performance.clearMarks();
	});
	await page.goto(`${APP_ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
	if (options.requireShell !== false) await waitForShellReady(page);
}

/**
 * Signs in and hard-loads a route, on a page the caller already put routes on. The fixtures' `app()`
 * navigates for you; a spec that must intercept an API call before the page loads needs this order
 * instead: routes first, cookies second, navigation last.
 */
export async function signInAndVisit(
	page: Page,
	fixture: BootstrapFixture,
	path: string,
	options: { scope?: 'A' | 'B'; stubSession?: boolean; scenario?: MockScenario; requireShell?: boolean } = {}
): Promise<Page> {
	// The scenario has to be set before the page loads, or the answer it changes has already been given.
	if (options.scenario) await mockScenario(options.scenario);
	await signInWithFixture(page.context(), fixture, options.scope ?? 'A');
	if (options.stubSession !== false) await stubNextAuthSession(page);
	await hardVisit(page, path, { requireShell: options.requireShell });
	return page;
}

/** Mirrors `rotateSyntheticAccessToken`: a new token cookie plus the window event the app listens for. */
export async function rotateAccessToken(context: BrowserContext, fixture: BootstrapFixture, scope: 'A' | 'B' = 'A') {
	const suffix = scope === 'B' ? 'B' : 'A';
	// `domain` + `path`, the same shape `signInWithFixture` uses: Playwright refuses a cookie that names both
	// `url` and `path` (`assert(!(c.url && c.path))` in playwright-core's network.js).
	await context.addCookies([
		{
			name: 'auth-token',
			value: syntheticAccessToken(fixture.ids.user, fixture.ids[`organization${suffix}`], 'rotated'),
			domain: new URL(APP_ORIGIN).hostname,
			path: '/',
			httpOnly: false,
			secure: false,
			sameSite: 'Lax'
		}
	]);
}
