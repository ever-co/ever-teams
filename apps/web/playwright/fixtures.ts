import { test as base, expect, type Page } from '@playwright/test';

import {
	APP_ORIGIN,
	CONSOLE_NOISE,
	hardVisit,
	loadFixture,
	mockRequests,
	mockReset,
	mockScenario,
	mockState,
	signInWithFixture,
	statsReports,
	stubNextAuthSession,
	unstubNextAuthSession,
	waitForShellReady,
	type BootstrapFixture,
	type MockScenario,
	type StubRequest
} from './helpers';

/**
 * Fixtures every Playwright spec gets:
 *
 *   shield  - automatic. Blocks and records anything the browser tries to reach outside this
 *             machine, and collects console/page errors so a spec can assert the app stayed clean.
 *   mock    - the test backend control client, reset before each test. Scenario switches and request
 *             inspection go through it because Playwright workers are separate processes.
 *   fixture - the bootstrap ids and names the mock is answering with.
 *   app     - signs the fixture person in and returns a page whose authenticated shell is ready.
 *   anon    - signed out, no shell wait: the route families that have no authenticated shell.
 *
 * The shield is what keeps a deterministic run from ever touching a real API: only the app origin
 * and the test backend are reachable, and a request that left the machine fails the test even if
 * every expect() in the body passed.
 */

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const isLocal = (url: string) => LOCAL_HOSTS.has(new URL(url).hostname);

export type Shield = {
	/** Requests the browser attempted against a non-local host. */
	externalCalls: () => string[];
	/** The HTML documents the browser loaded, oldest first: what the server actually answered. */
	documents: () => Array<{ url: string; status: number }>;
	/** Console errors the app reported, minus known noise. A red run here is a real app error. */
	consoleErrors: () => string[];
	/** Uncaught exceptions in the page. */
	pageErrors: () => string[];
	/** Console messages matching a fragment, for specs that want to assert a warning was logged. */
	logMatching: (fragment: RegExp) => string[];
};

export type MockControl = {
	scenario: (scenario: MockScenario) => Promise<void>;
	requests: () => Promise<StubRequest[]>;
	state: () => Promise<Record<string, unknown>>;
	stats: () => Promise<Array<{ instanceId: string; period: string; product: string }>>;
	/** Path order the browser caused, oldest first. The mock answers 200 + `{items:[],total:0}` for any
	 * unmatched Gauzy path, so "did the app call X" is only answerable from this log. */
	paths: () => Promise<string[]>;
	/** Recorded requests whose path contains `fragment`. */
	calls: (fragment: string) => Promise<StubRequest[]>;
	/** Recorded requests that came back 4xx or 5xx. */
	failures: () => Promise<StubRequest[]>;
};

export type AppFactory = (
	path: string,
	options?: { scope?: 'A' | 'B'; stubSession?: boolean; scenario?: MockScenario; requireShell?: boolean }
) => Promise<Page>;

export type AnonFactory = (path: string, options?: { stubSession?: boolean; scenario?: MockScenario }) => Promise<Page>;

export const test = base.extend<{
	shield: Shield;
	mock: MockControl;
	fixture: BootstrapFixture;
	app: AppFactory;
	anon: AnonFactory;
}>({
	shield: [
		async ({ context, page }, use) => {
			const external: string[] = [];
			const consoleErrors: string[] = [];
			const allConsole: string[] = [];
			const pageErrors: string[] = [];
			const documents: Array<{ url: string; status: number }> = [];

			context.on('response', (response) => {
				if (response.request().resourceType() === 'document') {
					documents.push({ url: response.url(), status: response.status() });
				}
			});
			context.on('request', (request) => {
				if (!isLocal(request.url())) {
					const url = new URL(request.url());
					external.push(`${request.method()} ${url.origin}${url.pathname}`);
				}
			});
			page.on('console', (message) => {
				const text = `${message.type()}: ${message.text()}`;
				allConsole.push(text);
				if (message.type() === 'error' && !CONSOLE_NOISE.some((pattern) => pattern.test(text))) {
					consoleErrors.push(text);
				}
			});
			page.on('pageerror', (error) => pageErrors.push(error.message));

			await context.route('**/*', (route, request) =>
				isLocal(request.url()) ? route.fallback() : route.abort('blockedbyclient')
			);

			await use({
				externalCalls: () => external,
				documents: () => documents,
				consoleErrors: () => consoleErrors,
				pageErrors: () => pageErrors,
				logMatching: (fragment) => allConsole.filter((text) => fragment.test(text))
			});

			expect(
				external,
				`the browser left the machine (only ${APP_ORIGIN} and the test backend are allowed)`
			).toEqual([]);
		},
		{ auto: true }
	],

	// Automatic: every test starts from a reset mock (scenario, delays, request log), whether or not it names
	// `mock` — otherwise a scenario one test set leaks into whichever test runs next.
	mock: [
		async ({}, use) => {
			await mockReset();
			await use({
				scenario: mockScenario,
				requests: mockRequests,
				state: mockState,
				stats: statsReports,
				paths: async () => (await mockRequests()).map((request) => request.path),
				calls: async (fragment) => (await mockRequests()).filter((request) => request.path.includes(fragment)),
				failures: async () => (await mockRequests()).filter((request) => request.status >= 400)
			});
		},
		{ auto: true }
	],

	// Served by the backend, so a spec can never assert on ids the mock no longer answers with.
	fixture: async ({}, use) => {
		await use(await loadFixture());
	},

	app: async ({ context, page, fixture }, use) => {
		const app: AppFactory = async (path, options = {}) => {
			if (options.scenario) await mockScenario(options.scenario);
			await signInWithFixture(context, fixture, options.scope ?? 'A');
			if (options.stubSession !== false) await stubNextAuthSession(page);
			await hardVisit(page, path, { requireShell: options.requireShell });
			return page;
		};
		await use(app);
	},

	anon: async ({ context, page }, use) => {
		const anon: AnonFactory = async (path, options = {}) => {
			if (options.scenario) await mockScenario(options.scenario);
			await context.clearCookies();
			// Signed out means signed out: with a fabricated session the app treats a sign-in page as a
			// page a signed-in person has already passed, and sends them to the app shell — which renders
			// nothing, because no session cookies were given. A spec that wants the stub says so.
			// An earlier `app()` in the same test installed the stub on this page: take it away first.
			await unstubNextAuthSession(page);
			if (options.stubSession === true) await stubNextAuthSession(page);
			await page.goto(`${APP_ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
			return page;
		};
		await use(anon);
	}
});

export { expect, waitForShellReady, loadFixture };
// Re-exported so a spec imports the browser types it needs from the same module it gets `test` from.
export type { BootstrapFixture, MockScenario, StubRequest, Page };
