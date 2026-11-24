import { defineConfig, devices } from '@playwright/test';

import { APP_ORIGIN, liveServers } from './test-servers';

/**
 * The live suite: the web app built locally, talking to the DEMO API (apidev.ever.team) instead of
 * the mock. Run it on its own — it needs port 3030 for itself, so it cannot share the machine with
 * the mock suite's dev server:
 *
 *   E2E_LIVE=1 yarn workspace @ever-teams/web pw:live
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
 *   Until a confirmed test account exists (its credentials live outside the repository, see
 *   E2E_DEMO_CREDENTIALS_FILE in that script), the signed-in half of the app is not covered live — only the mock
 *   suite covers it, with synthetic sessions.
 *
 * Hermetic in the other direction: live-fixtures.ts allows only this app's origin and the demo API,
 * refuses a production host even if E2E_DEMO_API_URL were set to one, and fails a test whose browser
 * reached anything else.
 */
/**
 * An explicit opt-in: a live run is not read-only — it asks the shared demo API to send a sign-in code and a
 * password reset (suites/live/refusals.spec.ts) — so a stray `playwright test` over every config never makes one.
 *
 * The refusal is made as a run starts (refuse-live-run.ts), before any server or browser, and not as this file
 * loads: a tool that only reads the config, like the unused-code check of a release, could not load it and failed.
 */
const isLiveRun = process.env.E2E_LIVE === '1';

function serversOfThisRun() {
	if (!isLiveRun) {
		return undefined;
	}
	return liveServers();
}

function setupOfThisRun() {
	if (isLiveRun) {
		return undefined;
	}
	return './refuse-live-run.ts';
}

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
		...devices['Desktop Chrome'],
		channel: process.env.E2E_BROWSER_CHANNEL ?? 'chromium'
	},
	globalSetup: setupOfThisRun(),
	webServer: serversOfThisRun(),
	projects: [{ name: 'live', testMatch: '**/live/**/*.spec.ts' }]
});
