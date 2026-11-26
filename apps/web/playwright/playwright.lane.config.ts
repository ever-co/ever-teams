import { defineConfig, devices } from '@playwright/test';

import { APP_ORIGIN, laneServers } from './test-servers';

/**
 * One config for every lane, chosen by `E2E_LANE`:
 *
 *   export PATH="/e/nvm/.nodejs:$PATH"
 *   E2E_LANE=lane-a E2E_BROWSER_CHANNEL=chrome npx playwright test --config apps/web/playwright/playwright.lane.config.ts
 *   ... --grep "<the describe block you are working on>"          one spec at a time
 *
 * A lane is a run that works *beside* the canonical suites (3030, 3988–3991) instead of queueing for them: its own
 * app process, its own mock, its own statistics sink, its own control API, its own fake Ever ID issuer, its own
 * Turbopack build directory, its own artifacts folder and report. The ports come from `LANE_PORTS`
 * (test-servers.ts) so two agents cannot pick the same one, and `testMatch` is limited to that lane's own folder
 * under `suites/`, so a lane cannot reach a spec another lane is editing.
 *
 * `E2E_LANE` is also what the specs see: `helpers.ts`, `fixtures.ts` and `api-fixtures.ts` import
 * `APP_ORIGIN` / `MOCK_ORIGIN` / `CONTROL_ORIGIN` from `test-servers.ts`, and those follow the variable in every
 * process — the config's and each forked worker's. A spec never names a port.
 *
 * Whether this lane needs the Ever ID routes mounted: `E2E_LANE=lane-c E2E_EVER_ID=1 …`. Off by default, because
 * `suites/api/ever-id-off.spec.ts` pins them as absent, and a lane that mounts them in the wrong app turns those
 * cases into confusing 404-less failures.
 *
 * `reuseExistingServer: true` here and nowhere else: a lane spends a night iterating spec by spec, and a cold
 * Turbopack compile of this app costs minutes each time. A lane owns its ports exclusively, so the server it
 * reuses is its own — and it must be killed when the lane is done (`taskkill //F //T //PID <pid>` on the listener
 * of its app and control ports), or the next run inherits a server that was started with different settings.
 */
const laneName = process.env.E2E_LANE ?? '';
const everId = process.env.E2E_EVER_ID === '1';
const lane = laneServers(laneName, { everId });

export default defineConfig({
	testDir: './suites',
	outputDir: `artifacts/test-results-${laneName}`,
	timeout: 180_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	// One mock, one worker: the scenario switches and the request log belong to whoever wrote last.
	workers: 1,
	reporter: [['list'], ['json', { outputFile: `artifacts/playwright-${laneName}.json` }]],
	use: {
		// `localhost`, never `127.0.0.1` — see the note on APP_ORIGIN in test-servers.ts.
		baseURL: APP_ORIGIN,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
		...devices['Desktop Chrome'],
		// Bundled Chromium cannot be installed on this PC (see README); the same engine runs through an installed
		// Google Chrome. Irrelevant to a browser-free lane, harmless to keep.
		channel: (process.env.E2E_BROWSER_CHANNEL ?? 'chromium') as 'chromium' | 'chrome'
	},
	webServer: lane.servers,
	projects: [{ name: laneName, testMatch: `**/${laneName}/**/*.spec.ts` }]
});
