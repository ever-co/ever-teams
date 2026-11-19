import { test as base, expect, type APIResponse } from '@playwright/test';

import {
	authCookieHeader,
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
	}
) => Promise<APIResponse>;

export const test = base.extend<{ api: ApiCall; mock: MockControl; ids: Record<string, string>; names: Record<string, string> }>({
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
				timeout: 60_000
			});
		await use(call);
	}
});

export { expect };
export type { BootstrapFixture, MockScenario, StubRequest };
