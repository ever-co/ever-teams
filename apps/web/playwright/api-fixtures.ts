import { test as base, expect, type APIResponse } from '@playwright/test';

import {
	authCookieHeader,
	authCookieNames,
	loadFixture,
	mockRequests,
	mockReset,
	mockScenario,
	mockState,
	statsReports,
	type BootstrapFixture,
	type MockScenario,
	type StubRequest
} from './helpers';
import type { MockControl } from './fixtures';

/**
 * Fixtures for the server-route suite: Next.js route handlers called over HTTP, with no browser in
 * the loop. The app is configured to proxy its server-side Gauzy calls to the mock API, so these
 * tests exercise the real handler code (validation, cookie handling, proxying) against a fake
 * upstream that cannot reach a production API.
 */

export type ApiCall = (
	path: string,
	options?: {
		method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
		body?: unknown;
		scope?: 'A' | 'B';
		anonymous?: boolean;
		headers?: Record<string, string>;
		/** 0 keeps a redirect as the answer under test, instead of following it to the page it points at. */
		maxRedirects?: number;
	}
) => Promise<APIResponse>;

/** The session cookies as a `Cookie:` header, with named ones left out: for a case that wants a session
 * that is missing exactly one thing (the tenant cookie, the token...) without building the header by hand. */
export type CookieComposer = (scope?: 'A' | 'B', without?: readonly string[]) => string;

export const test = base.extend<{
	api: ApiCall;
	cookies: CookieComposer;
	mock: MockControl;
	ids: Record<string, string>;
	names: Record<string, string>;
}>({
	mock: async ({}, use) => {
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

	cookies: async ({}, use) => {
		const fixture: BootstrapFixture = await loadFixture();
		await use((scope = 'A', without = []) =>
			authCookieNames(fixture, scope)
				.filter(([name]) => !without.includes(name))
				.map(([name, value]) => `${name}=${value}`)
				.join('; ')
		);
	},

	ids: async ({}, use) => {
		const fixture: BootstrapFixture = await loadFixture();
		await use(fixture.ids);
	},

	names: async ({}, use) => {
		const fixture: BootstrapFixture = await loadFixture();
		await use(fixture.names);
	},

	api: async ({ request }, use) => {
		const fixture = await loadFixture();
		const call: ApiCall = (path, options = {}) =>
			request.fetch(path, {
				method: options.method ?? 'GET',
				data: options.body,
				headers: {
					accept: 'application/json',
					...(options.anonymous
						? {}
						: { cookie: authCookieHeader(fixture, options.scope ?? 'A') }),
					...(options.headers ?? {})
				},
				// Only when a case asks for it: in suites/api/page-gate.spec.ts the redirect itself is the answer
				// under test, and by default Playwright follows it to the page it points at.
				...(options.maxRedirects === undefined ? {} : { maxRedirects: options.maxRedirects }),
				timeout: 60_000
			});
		await use(call);
	}
});

export { expect };
export type { BootstrapFixture, MockScenario, StubRequest };
