import { test as base, expect, type Page } from '@playwright/test';

import { CONSOLE_NOISE } from './helpers';
import { APP_ORIGIN, DEMO_API_ORIGIN, isProductionHost } from './test-servers';

/**
 * Fixtures for the live suite: the web app running locally against the DEMO API (apidev.ever.team).
 *
 * This is the only suite that sees a real API answer, and it is the only place some things can be
 * proved at all: the mock answers every Gauzy path with 200 and a synthetic body, so how the app
 * behaves when an API genuinely refuses — 401 on a wrong password, 404 on a resource that is not
 * there — cannot be shown deterministically. What a live run must not do is reach anything real:
 * only the app's own origin and the demo API are allowed, a production host is refused even if
 * E2E_DEMO_API_URL were pointed at one, and a request that left anyway fails the test.
 *
 * No NextAuth session is stubbed here (unlike the mock suite): the real sign-in is the subject.
 */

/** Whole origins (scheme + host + port), not hostnames: `http://localhost:4040` is not this app. */
const ALLOWED_ORIGINS = new Set([new URL(APP_ORIGIN).origin, new URL(DEMO_API_ORIGIN).origin]);

/** Allowed, and never a production host whatever the environment says. */
const isAllowed = (url: string) => ALLOWED_ORIGINS.has(new URL(url).origin) && !isProductionHost(url);

export type ApiCall = { method: string; host: string; path: string; status: number };

export type LiveShield = {
	/** Answers from the app origin or the demo API, oldest first. */
	apiCalls: () => ApiCall[];
	/** Calls to a host this suite is not allowed to touch. */
	outside: () => string[];
	consoleErrors: () => string[];
	pageErrors: () => string[];
	documents: () => Array<{ url: string; status: number }>;
	/** Recorded answers matching a path fragment, e.g. 'signin-email-password'. */
	callsTo: (fragment: string) => ApiCall[];
};

export type DemoFactory = (path: string) => Promise<Page>;

export const test = base.extend<{ shield: LiveShield; demo: DemoFactory }>({
	shield: [
		async ({ context, page }, use) => {
			const calls: ApiCall[] = [];
			const outside: string[] = [];
			const consoleErrors: string[] = [];
			const pageErrors: string[] = [];
			const documents: Array<{ url: string; status: number }> = [];

			context.on('request', (request) => {
				if (!isAllowed(request.url())) {
					const url = new URL(request.url());
					outside.push(`${request.method()} ${url.origin}${url.pathname}`);
				}
			});
			context.on('response', (response) => {
				const url = new URL(response.url());
				// A page load is a document, not an API answer: kept apart so a spec looking for an API call cannot
				// be satisfied by the HTML of the page it opened.
				if (response.request().resourceType() === 'document') {
					documents.push({ url: response.url(), status: response.status() });
				} else if (isAllowed(response.url())) {
					calls.push({
						method: response.request().method(),
						host: url.hostname,
						path: `${url.pathname}${url.search}`,
						status: response.status()
					});
				}
			});
			page.on('console', (message) => {
				const text = `${message.type()}: ${message.text()}`;
				if (message.type() === 'error' && !CONSOLE_NOISE.some((pattern) => pattern.test(text))) {
					consoleErrors.push(text);
				}
			});
			page.on('pageerror', (error) => pageErrors.push(error.message));

			// Playwright routes every request the page makes, but not the hops of a redirect: a redirect to a host
			// outside the list is still recorded by the request observer above and fails the test.
			await context.route('**/*', (route, request) =>
				isAllowed(request.url()) ? route.fallback() : route.abort('blockedbyclient')
			);

			await use({
				apiCalls: () => calls,
				outside: () => outside,
				consoleErrors: () => consoleErrors,
				pageErrors: () => pageErrors,
				documents: () => documents,
				callsTo: (fragment) => calls.filter((call) => call.path.includes(fragment))
			});

			expect(outside, `a live run may only touch ${APP_ORIGIN} and ${DEMO_API_ORIGIN}`).toEqual([]);
		},
		{ auto: true }
	],

	demo: async ({ page }, use) => {
		const demo: DemoFactory = async (path) => {
			await page.goto(`${APP_ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
			return page;
		};
		await use(demo);
	}
});

export { expect };
export type { Page };
