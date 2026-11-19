import type { BrowserContext, Cookie, Page } from '@playwright/test';

/**
 * Shared plumbing for the Playwright suites.
 *
 * Everything a test needs from the backend arrives over the control API (apps/web/playwright/
 * backend.mjs): Cypress could reach the mock in-process with `cy.task`, Playwright workers cannot,
 * and reading the fixture from disk here would let a test assert on ids the mock no longer answers
 * with. No file paths, no module-URL tricks: this file is transpiled as CommonJS by Playwright
 * because apps/web is a CommonJS package.
 */

/** The app origin the mock Gauzy accepts (mock-gauzy-server.mjs allowlist); anything else is 403. */
export const APP_ORIGIN = (process.env.E2E_APP_ORIGIN || 'http://127.0.0.1:3030').replace(/\/$/, '');
const CONTROL_ORIGIN = (process.env.E2E_CONTROL_URL || 'http://127.0.0.1:3990').replace(/\/$/, '');

export type StubRequest = {
	method: string;
	path: string;
	query: string;
	startMs: number;
	endMs: number;
	status: number;
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
	if (!response.ok) throw new Error(`test backend ${path} failed: HTTP ${response.status}`);
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
	const cookie = (name: string, value: string): Cookie => ({
		name,
		value,
		url: APP_ORIGIN,
		path: '/',
		httpOnly: false,
		secure: false,
		sameSite: 'Lax'
	});

	await context.clearCookies();
	await context.addCookies(authCookieNames(fixture, scope).map(([name, value]) => cookie(name, value)));
}

/** The NextAuth session support/e2e.ts stubs globally; the app origin serves this route, the mock does not. */
export async function stubNextAuthSession(page: Page): Promise<void> {
	await page.route('**/api/auth/session**', (route) =>
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

/** Resolves once the app has marked its shell ready (the mark startup-performance waits on). */
export async function waitForShellReady(page: Page, timeout = 45_000): Promise<void> {
	await page.waitForFunction(() => performance.getEntriesByName('ever-teams:shell-ready').length > 0, undefined, {
		timeout
	});
}

/** Clears browser storage in place, navigates, and waits for the shell — the Playwright `hardVisit`. */
export async function hardVisit(page: Page, path: string): Promise<void> {
	await page.goto(APP_ORIGIN, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
	await page.evaluate(() => {
		window.localStorage.clear();
		window.sessionStorage.clear();
		window.performance.clearMarks();
	});
	await page.goto(`${APP_ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
	await waitForShellReady(page);
}

/** Mirrors `rotateSyntheticAccessToken`: a new token cookie plus the window event the app listens for. */
export async function rotateAccessToken(context: BrowserContext, fixture: BootstrapFixture, scope: 'A' | 'B' = 'A') {
	const suffix = scope === 'B' ? 'B' : 'A';
	await context.addCookies([
		{
			name: 'auth-token',
			value: syntheticAccessToken(fixture.ids.user, fixture.ids[`organization${suffix}`], 'rotated'),
			url: APP_ORIGIN,
			path: '/',
			httpOnly: false,
			secure: false,
			sameSite: 'Lax'
		}
	]);
}
