import { defineConfig } from '@playwright/test';

import { APP_ORIGIN, mockServers } from './test-servers';

/**
 * The server-route suite: Next.js route handlers in apps/web/app/api, called over HTTP with no
 * browser. The app under test is started with its Gauzy URLs pointed at the mock API, so each
 * handler runs for real against a fake upstream.
 *
 *   yarn playwright test --config apps/web/playwright/playwright.api.config.ts
 *
 * These tests do not touch the browser, so they can run several workers without competing for the
 * single mock's scenario state — they only read the mock's request log.
 */
export default defineConfig({
	testDir: './suites',
	outputDir: 'artifacts/test-results-api',
	timeout: 120_000,
	expect: { timeout: 15_000 },
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	workers: Number(process.env.E2E_WORKERS ?? 4),
	reporter: [['list'], ['json', { outputFile: 'artifacts/playwright-api.json' }]],
	use: { baseURL: APP_ORIGIN, extraHTTPHeaders: { accept: 'application/json' } },
	webServer: mockServers(),
	projects: [{ name: 'api', testMatch: '**/api/**/*.spec.ts' }]
});
