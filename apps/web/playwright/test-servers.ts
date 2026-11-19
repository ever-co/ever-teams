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

/**
 * The fake Ever ID issuer backend.mjs serves (apps/web/playwright/ever-id-idp.mjs). A plain-http issuer on the
 * loopback is the one issuer the app's own checker accepts without a certificate (`LOOPBACK_HOSTS` in
 * core/lib/auth/ever-id/config.ts), which is what makes the Ever ID routes testable at all. The client id and
 * secret below are placeholders for that fake issuer: the back-channel logout verifies a token the issuer
 * *signed*, so this secret authenticates to nothing real.
 */
export const EVER_ID_ISSUER_URL = 'http://127.0.0.1:3991/oidc';
export const EVER_ID_CLIENT_ID = process.env.E2E_EVER_ID_CLIENT_ID || 'playwright-teams-client';
export const EVER_ID_CLIENT_SECRET = 'playwright-fake-issuer-client-secret';

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
	// Blank, like `apps/web/.env` and the Cypress run: demo mode is a hosted-demo switch, and turning it on
	// here silently hides things the suite is testing — `useEverPlatformSection` refuses the whole Ever Platform
	// settings section on a demo deployment (`isTeamManager && !IS_DEMO_MODE`), and `DEFAULT_APP_PATH` becomes
	// `/auth/password` instead of the passwordless page the app opens by default.
	NEXT_PUBLIC_DEMO: '',
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

/**
 * The ports of a lane that runs *beside* the canonical suites instead of waiting for them: its own app process,
 * its own mock backend, its own fake issuer. Two runs can then work in the same checkout at the same time
 * without sharing port 3030 or — the part that actually breaks tests — one mock request log.
 *
 * The canonical suites own 3030 and 3988–3991. A lane must stay off those, and must not reuse another lane's.
 */
export type LanePorts = { app: number; mock: number; platform: number; control: number; idp: number };

/**
 * The lanes handed out so far, so two agents do not pick the same ports and kill each other's servers.
 * `npm run pw:*` and the three configs at the top of this file own 3030 and 3988–3991.
 */
export const LANE_PORTS: Record<string, LanePorts> = {
	'lane-a': { app: 3031, mock: 3992, platform: 3993, control: 3994, idp: 3995 },
	'lane-b': { app: 3032, mock: 3996, platform: 3997, control: 3998, idp: 3999 },
	'lane-c': { app: 3033, mock: 4002, platform: 4003, control: 4004, idp: 4005 }
};

/**
 * The build directory of a lane, in apps/web (where `next dev` runs).
 *
 * Next 16 permits only one dev server per project directory — the lock is `<distDir>/dev/logs/next-development.log`,
 * and a second `next dev` in the same folder exits with "Another next dev server is already running" — so lanes work
 * only because each gets its own distDir (apps/web/next.config.js honours `PLAYWRIGHT_LANE_DIST_DIR`). A lane pays
 * for that with a cold compile cache; that is the price of running beside the canonical suite instead of queueing
 * behind it.
 */
const laneDistDir = (ports: LanePorts): string => `.next-lane-${ports.app}`;

/** The issuer's URL on a given port: the path is part of the issuer identifier the app compares. */
function everIdIssuerUrl(port: number): string {
	return `http://127.0.0.1:${port}/oidc`;
}

/**
 * Points this process at a lane's servers. Call it at the very top of a lane's config file, before importing
 * anything else from this folder: `helpers.ts` and this file read these variables when they are imported, and
 * the worker processes Playwright forks inherit them from the process that read them first.
 */
export function useLanePorts(ports: LanePorts): { appOrigin: string; controlOrigin: string } {
	const appOrigin = `http://localhost:${ports.app}`;
	const controlOrigin = `http://127.0.0.1:${ports.control}`;
	process.env.E2E_APP_ORIGIN = appOrigin;
	process.env.E2E_CONTROL_URL = controlOrigin;
	return { appOrigin, controlOrigin };
}

/** The app environment of a lane: the shared one, with that lane's mock and statistics sink. */
function laneEnv(ports: LanePorts, options: { everId?: boolean } = {}): Record<string, string> {
	return {
		...sharedEnv(`http://127.0.0.1:${ports.mock}`),
		PORT: `${ports.app}`,
		PLAYWRIGHT_LANE_DIST_DIR: laneDistDir(ports),
		EVER_STATS_API_URL: `http://127.0.0.1:${ports.platform}`,
		NEXT_PUBLIC_EVER_STATS_API_URL: `http://127.0.0.1:${ports.platform}`,
		...(options.everId
			? {
				EVER_ID_ISSUER_URL: everIdIssuerUrl(ports.idp),
				EVER_ID_CLIENT_ID,
				EVER_ID_CLIENT_SECRET,
				NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID'
			}
			: {})
	};
}

/** The backend (with its fake issuer) and the app, on a lane's own ports. */
export function laneServers(ports: LanePorts, options: { everId?: boolean } = {}): WebServer[] {
	return [
		{
			command: 'node apps/web/playwright/backend.mjs',
			port: ports.control,
			timeout: 120_000,
			// Never reused: a leftover backend answers from another run's state, and "the API was asked nothing"
			// then means nothing at all.
			reuseExistingServer: false,
			env: {
				E2E_MOCK_API_PORT: `${ports.mock}`,
				E2E_MOCK_PLATFORM_PORT: `${ports.platform}`,
				E2E_CONTROL_PORT: `${ports.control}`,
				E2E_EVER_ID_ISSUER_PORT: `${ports.idp}`,
				E2E_EVER_ID_CLIENT_ID: EVER_ID_CLIENT_ID
			},
			cwd: REPO_ROOT
		},
		{
			/**
			 * Not `yarn turbo dev --filter=@ever-teams/web`: that script is `yarn node env.js && yarn next dev -p 3030`
			 * (apps/web/package.json), so the port is hardcoded in it and a lane asking for 3031 would start a *third*
			 * server on 3030 and take the canonical suite's port. `env.js` is dotenv plus console lines only — Next
			 * reads `.env.local`/`.env` itself and never overrides a variable the process already has — so the lane
			 * calls the project's own `next dev` with the port it was given. The preamble lines are what is lost.
			 */
			command: `node_modules/.bin/next dev -p ${ports.app}`,
			port: ports.app,
			timeout: 900_000,
			reuseExistingServer: false,
			env: laneEnv(ports, options),
			// `next dev` reads next.config.js from its working directory, so this is the app's folder — `../..`
			// counted from the folder holding the config, which is how Playwright reads a cwd.
			cwd: '../..'
		}
	];
}

/**
 * The Ever ID suite's servers: the same mock backend (which also serves the fake issuer on 127.0.0.1:3991) and
 * the app started with the Ever ID sign-in configured — the only way its
 * `app/api/auth/ever-id/*` routes mount at all (without these four settings every one of them answers 404,
 * which is what the ordinary api suite asserts).
 *
 * `reuseExistingServer: false` on purpose. A dev server left over from another suite was started *without*
 * EVER_ID_* in its environment, and Playwright reusing it would silently run this suite against an app whose
 * Ever ID routes are all 404 — failures that read as an app bug. This suite takes its ports for itself.
 */
export function everIdServers(): WebServer[] {
	return [
		{
			command: 'node apps/web/playwright/backend.mjs',
			port: Number(new URL(CONTROL_ORIGIN).port),
			timeout: 120_000,
			reuseExistingServer: false,
			env: { E2E_EVER_ID_CLIENT_ID: EVER_ID_CLIENT_ID },
			cwd: REPO_ROOT
		},
		{
			command: 'yarn turbo dev --filter=@ever-teams/web',
			port: Number(new URL(APP_ORIGIN).port),
			timeout: 900_000,
			reuseExistingServer: false,
			env: {
				...sharedEnv(MOCK_ORIGIN),
				EVER_ID_ISSUER_URL,
				EVER_ID_CLIENT_ID,
				EVER_ID_CLIENT_SECRET,
				NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID'
			},
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
