/**
 * The servers every Playwright config needs, in one place so the mock suite, the live suite and the
 * server-route suite cannot drift apart on the single thing that matters most: which API origin the
 * app under test is allowed to talk to.
 *
 * The app is started with its Gauzy URLs pointed at the mock, deliberately overriding the values in
 * apps/web/.env — that file carries the production API URL and third-party keys, and a test run must
 * never reach them. The mock also hard-answers 403 to any browser Origin outside 127.0.0.1:3030 /
 * localhost:3030 (mock-gauzy-server.mjs), so APP_ORIGIN is not free to change.
 */

/**
 * `http://localhost:3030`, not `http://127.0.0.1:3030`, and this is the one setting a run cannot change
 * to anything else it likes: in `next dev` the page served to the `127.0.0.1` origin answers 200 with the
 * full document, but its client-only boundaries never resolve (their HMR socket is refused
 * `ERR_INVALID_HTTP_RESPONSE`), so the browser ends on a page with no content and no error anywhere.
 * Every browser case then fails on an empty body, which looks like an app bug and is not one. Over
 * `localhost` the same document renders. The mock accepts both Origins
 * (`cypress/support/mock-gauzy-server.mjs`, TRUSTED_BROWSER_ORIGINS), so nothing else has to move.
 */
export const APP_ORIGIN = (process.env.E2E_APP_ORIGIN || 'http://localhost:3030').replace(/\/$/, '');
export const MOCK_ORIGIN = 'http://127.0.0.1:3988';
export const PLATFORM_ORIGIN = 'http://127.0.0.1:3989';
export const CONTROL_ORIGIN = 'http://127.0.0.1:3990';

/** A run against the demo API instead of the mock. Never a production API. */
export const DEMO_API_ORIGIN = (process.env.E2E_DEMO_API_URL || 'https://apidev.ever.team').replace(/\/$/, '');
const PRODUCTION_APIS = ['https://api.ever.team', 'https://api.gauzy.co'];
if (PRODUCTION_APIS.includes(DEMO_API_ORIGIN)) {
	throw new Error(`Refusing to configure the live suite against ${DEMO_API_ORIGIN}: that is a production API.`);
}

type WebServer = {
	command: string;
	port: number;
	timeout: number;
	reuseExistingServer: boolean;
	env?: Record<string, string>;
	cwd: string;
};

/**
 * Playwright starts every `webServer` command in the folder holding the config file (its plugin does
 * `resolve(configDir, cwd)`), not in the repository root, so a repo-root-relative command resolves to
 * `apps/web/playwright/apps/web/playwright/backend.mjs` there and the backend dies at startup. Every
 * command below is written from the repository root, so every entry names this cwd — relative to the
 * config folder, which is how Playwright reads it.
 */
const REPO_ROOT = '../../..';

const sharedEnv = (apiOrigin: string): Record<string, string> => ({
	PORT: new URL(APP_ORIGIN).port,
	NEXT_PUBLIC_WEB_APP_URL: APP_ORIGIN,
	GAUZY_API_SERVER_URL: apiOrigin,
	NEXT_PUBLIC_GAUZY_API_SERVER_URL: apiOrigin,
	GAUZY_API_BASE_SERVER_URL: '',
	NEXT_PUBLIC_GAUZY_API_BASE_SERVER_URL: '',
	EVER_STATS_API_URL: PLATFORM_ORIGIN,
	NEXT_PUBLIC_EVER_STATS_API_URL: PLATFORM_ORIGIN,
	NEXT_PUBLIC_EVER_STATS_ENABLED: 'true',
	// The reporter's own cadence, honoured only for a local statistics address (which this is): a
	// statistics test otherwise waits a production interval for one report. Cypress sets the same 5.
	EVER_STATS_SEND_INTERVAL_S: '5',
	AUTH_SECRET: 'playwright-deterministic-secret',
	NEXT_PUBLIC_DEMO: 'true',
	// Settings › Team › Integrations shows its Ever Platform connection parts only with this on (off by
	// default, core/lib/ever-platform/env.ts). The Cypress suite runs with it on for the same reason, and
	// the calls it unlocks go through the mock: /api/ever-connect/* is proxied to GAUZY_API_SERVER_URL.
	NEXT_PUBLIC_EVER_CONNECT_ENABLED: 'true',
	// apps/web/.env scopes cookies to ever.team; such a cookie is never sent to 127.0.0.1.
	NEXT_PUBLIC_COOKIE_DOMAINS: '',
	// No third-party telemetry from a test run, and none of the keys .env carries.
	NEXT_PUBLIC_POSTHOG_KEY: '',
	NEXT_PUBLIC_POSTHOG_HOST: '',
	NEXT_PUBLIC_JITSU_BROWSER_URL: '',
	NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY: '',
	NEXT_PUBLIC_GOOGLE_APP_NAME: '',
	NEXT_PUBLIC_GITHUB_APP_NAME: '',
	NEXT_PUBLIC_FACEBOOK_APP_NAME: '',
	NEXT_PUBLIC_TWITTER_APP_NAME: '',
	NEXT_PUBLIC_CAPTCHA_SITE_KEY: '',
	NEXT_PUBLIC_MEET_TYPE: 'None',
	MEET_JWT_APP_SECRET: '',
	LIVEKIT_API_KEY: '',
	LIVEKIT_API_SECRET: '',
	NEXT_PUBLIC_LIVEKIT_URL: '',
	NEXT_PUBLIC_BOARD_APP_DOMAIN: '',
	NEXT_PUBLIC_BOARD_BACKEND_POST_URL: '',
	NEXT_PUBLIC_BOARD_FIREBASE_CONFIG: '',
	NEXT_PUBLIC_MEET_DOMAIN: '',
	NEXT_PUBLIC_SENTRY_DSN: '',
	SENTRY_DSN: '',
	SENTRY_AUTH_TOKEN: '',
	NEXT_PUBLIC_GA_MEASUREMENT_ID: '',
	NEXT_PUBLIC_CHATWOOT_API_KEY: '',
	NEXT_TELEMETRY_DISABLED: '1',
	NEXT_PUBLIC_DISABLE_AUTO_REFRESH: 'false'
});

/** The mock Gauzy API + the Ever Platform statistics sink + the control API, then the app. */
export function mockServers(): WebServer[] {
	return [
		{
			command: 'node apps/web/playwright/backend.mjs',
			port: Number(new URL(CONTROL_ORIGIN).port),
			timeout: 120_000,
			reuseExistingServer: !process.env.CI,
			cwd: REPO_ROOT
		},
		{
			command: 'yarn turbo dev --filter=@ever-teams/web',
			port: Number(new URL(APP_ORIGIN).port),
			timeout: 900_000,
			reuseExistingServer: !process.env.CI,
			env: sharedEnv(MOCK_ORIGIN),
			cwd: REPO_ROOT
		}
	];
}

/** The app against the demo API: no mock, real data, real tenant. */
export function liveServers(): WebServer[] {
	return [
		{
			command: 'yarn turbo dev --filter=@ever-teams/web',
			port: Number(new URL(APP_ORIGIN).port),
			timeout: 900_000,
			reuseExistingServer: !process.env.CI,
			env: {
				...sharedEnv(DEMO_API_ORIGIN),
				NEXT_PUBLIC_COOKIE_DOMAINS: '',
				EVER_STATS_API_URL: '',
				NEXT_PUBLIC_EVER_STATS_API_URL: '',
				NEXT_PUBLIC_EVER_STATS_ENABLED: 'false'
			}
		}
	];
}
