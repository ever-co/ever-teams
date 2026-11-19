import { defineConfig, devices } from '@playwright/test';

import { APP_ORIGIN, liveServers } from './test-servers';

/**
 * The live suite: the web app built locally, talking to the DEMO API (apidev.ever.team) instead of
 * the mock. Run it on its own — it needs port 3030 for itself, so it cannot share the machine with
 * the mock suite's dev server:
 *
 *   E2E_BROWSER_CHANNEL=chrome yarn playwright test --config apps/web/playwright/playwright.live.config.ts
 *
 * What only a live run can prove: the mock answers every Gauzy path with 200 and a synthetic body, so
 * a genuine refusal — 401 on a wrong password, 201 `true` on a password reset for an address that
 * does not exist, which is how the API avoids confirming who has an account — has to be seen against
 * the real API.
 *
 * What is blocked, and why (measured 2026-11-19, not assumed):
 *   `scripts/provision-demo-tenant.mjs` registers a throwaway account on the demo API successfully,
 *   but both password routes then answer 401: the demo API will not sign in an address whose e-mail
 *   is not confirmed, and the confirmation link goes to a mailbox this suite has no access to.
 *   Until a confirmed test account exists (its credentials would live in <root>/workspace/.config/,
 *   never in the repository), the signed-in half of the app is not covered live — only the mock
 *   suite covers it, with synthetic sessions.
 *
 * Hermetic in the other direction: live-fixtures.ts allows only this app's origin and the demo API,
 * refuses a production host even if E2E_DEMO_API_URL were set to one, and fails a test whose browser
 * reached anything else.
 */
export default defineConfig({
	testDir: './suites',
	outputDir: 'artifacts/test-results-live',
	timeout: 120_000,
	// A real API round trip, sometimes through Cloudflare, is not a mock answer.
	expect: { timeout: 30_000 },
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	// Kept small on purpose: a live run is polite to a shared demo API, not a load test.
	workers: Number(process.env.E2E_WORKERS ?? 2),
	reporter: [['list'], ['json', { outputFile: 'artifacts/playwright-live.json' }]],
	use: {
		baseURL: APP_ORIGIN,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
		channel: (process.env.E2E_BROWSER_CHANNEL ?? 'chromium') as 'chromium' | 'chrome'
	},
	webServer: liveServers(),
	projects: [{ name: 'live', class: devices['Desktop Chrome'], testMatch: '**/live/**/*.spec.ts' }]
});
