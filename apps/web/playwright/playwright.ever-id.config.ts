import { defineConfig } from '@playwright/test';

import { APP_ORIGIN, everIdServers } from './test-servers';

/**
 * The Ever ID sign-in suite: the routes under `app/api/auth/ever-id`, against the fake OpenID Connect issuer
 * backend.mjs serves on 127.0.0.1:3991 and the mock Gauzy API.
 *
 *   yarn workspace @ever-teams/web pw:ever-id
 *
 * It is a config of its own because the routes it tests only exist with the Ever ID sign-in configured: with
 * any of NEXT_PUBLIC_EVER_ID_APP_NAME, EVER_ID_ISSUER_URL, EVER_ID_CLIENT_ID or EVER_ID_CLIENT_SECRET missing,
 * every one of them answers 404 and nothing contacts the issuer (core/lib/auth/ever-id/config.ts). Turning the
 * sign-in on in the other configs would change the sign-in pages and the NextAuth route table those suites pin,
 * so the switch lives here.
 *
 * Takes port 3030 for itself (see `reuseExistingServer` in everIdServers): run it while no other suite is
 * running, or it will replace that suite's dev server.
 */
export default defineConfig({
	testDir: './suites',
	outputDir: 'artifacts/test-results-ever-id',
	timeout: 120_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	// One worker: these tests read the mock's request log and the fake issuer's contact log, and both are
	// shared by every worker in the run.
	workers: 1,
	reporter: [['list'], ['json', { outputFile: 'artifacts/playwright-ever-id.json' }]],
	use: { baseURL: APP_ORIGIN, extraHTTPHeaders: { accept: 'application/json' } },
	webServer: everIdServers(),
	projects: [{ name: 'ever-id', testMatch: '**/ever-id/**/*.spec.ts' }]
});
