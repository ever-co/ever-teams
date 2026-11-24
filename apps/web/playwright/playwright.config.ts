import { defineConfig, devices } from '@playwright/test';

import { APP_ORIGIN, mockServers } from './test-servers';

/**
 * The deterministic browser suite: the web app runs locally against the mock Gauzy API, so a test
 * never depends on a shared server, a shared tenant, or the network. Scenario switches (plan,
 * manager, timer state, failing routes, delays) arrive through the control API in backend.mjs.
 *
 *   yarn workspace @ever-teams/web pw
 *
 * Other configs: playwright.api.config.ts (Next.js route handlers, no browser) and
 * playwright.live.config.ts (the web app against the demo API).
 */
export default defineConfig({
	testDir: './suites',
	// traces, screenshots and the json report land under the repo's ignored artifacts/ folder
	outputDir: 'artifacts/test-results',
	timeout: 90_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	// One worker while the mock backend is a single shared instance: a scenario switch, or the request
	// log a spec inspects, belongs to whoever writes last. Raise this only once backend.mjs hands each
	// worker its own mock instance.
	workers: 1,
	reporter: [['list'], ['json', { outputFile: 'artifacts/playwright-mock.json' }]],
	use: {
		baseURL: APP_ORIGIN,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
		...devices['Desktop Chrome'],
		// Full Chromium (the `chromium` Playwright build, `yarn playwright install chromium`) rather than the
		// separate chrome-headless-shell download: one browser build to install, the same engine headless.
		// E2E_BROWSER_CHANNEL=chrome runs the same engine against an installed Google Chrome instead.
		channel: process.env.E2E_BROWSER_CHANNEL ?? 'chromium'
	},
	webServer: mockServers(),
	projects: [{ name: 'mock', testMatch: '**/mock/**/*.spec.ts' }]
});
