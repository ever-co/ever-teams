import { defineConfig } from '@playwright/test';

import { APP_ORIGIN, mockServers } from './test-servers';

/**
 * The server-route suite: Next.js route handlers in apps/web/app/api, called over HTTP with no
 * browser. The app under test is started with its Gauzy URLs pointed at the mock API, so each
 * handler runs for real against a fake upstream.
 *
 *   yarn workspace @ever-teams/web pw:api
 *
 * These tests do not touch a browser, so they are cheap — but they still share one mock instance, and
 * several specs read its request log ("nothing reached the API" is only proved if the log is empty).
 * A second worker writing to the same log would break that proof, so this suite is serial too until
 * backend.mjs hands each worker its own mock.
 */
export default defineConfig({
	testDir: './suites',
	outputDir: 'artifacts/test-results-api',
	timeout: 120_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	workers: 1,
	reporter: [['list'], ['json', { outputFile: 'artifacts/playwright-api.json' }]],
	use: { baseURL: APP_ORIGIN, extraHTTPHeaders: { accept: 'application/json' } },
	webServer: mockServers(),
	projects: [{ name: 'api', testMatch: '**/api/**/*.spec.ts' }]
});
