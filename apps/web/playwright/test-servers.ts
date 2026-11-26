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
/**
 * The lanes: runs that work *beside* the four canonical configs instead of queueing for port 3030 and 3988–3991.
 *
 * A lane needs its own everything — app process, mock, statistics sink, control API, fake issuer — because the mock
 * request log is what proves "this refusal never reached the API", and two runs sharing one mock invalidate each
 * other's proofs. The ports are a table so two agents cannot pick the same one and kill each other's servers.
 *
 * `E2E_LANE=<lane-name>` is the whole switch, read once here. It has to be an environment variable rather than an
 * argument to a helper: `helpers.ts`, `fixtures.ts` and a config all import the constants below, each in its own
 * process (Playwright forks a worker per test file), and the only thing that reaches all of them is the environment
 * the run was started with. A lane is therefore started as
 * `E2E_LANE=lane-a npx playwright test --config apps/web/playwright/playwright.lane.config.ts`, and nothing in the
 * spec or the config has to know a port.
 */
export type LanePorts = { app: number; mock: number; platform: number; control: number; idp: number };

export const LANE_PORTS: Record<string, LanePorts> = {
	'lane-a': { app: 3031, mock: 3992, platform: 3993, control: 3994, idp: 3995 },
	'lane-b': { app: 3032, mock: 3996, platform: 3997, control: 3998, idp: 3999 },
	'lane-c': { app: 3033, mock: 4002, platform: 4003, control: 4004, idp: 4005 },
	'lane-d': { app: 3034, mock: 4006, platform: 4007, control: 4008, idp: 4009 }
};

/** A lane reuses a server already on its ports (see `laneServers`), except in CI. */
const LANE_REUSE_SERVERS = !process.env.CI;

/**
 * The time zone a lane's browser and servers run in. The lane specs were measured in Europe/Madrid, and several pin
 * what a browser outside UTC shows; `E2E_TIMEZONE` overrides it for a run that measures another zone on purpose.
 */
export const LANE_TIME_ZONE = process.env.E2E_TIMEZONE || 'Europe/Madrid';

const selectedLane = process.env.E2E_LANE;
const lane = selectedLane ? LANE_PORTS[selectedLane] : undefined;
if (selectedLane && !lane) {
	throw new Error(`E2E_LANE=${selectedLane} is not a lane. Known lanes: ${Object.keys(LANE_PORTS).join(', ')}.`);
}

export const APP_ORIGIN = (process.env.E2E_APP_ORIGIN || `http://localhost:${lane?.app ?? 3030}`).replace(/\/$/, '');
export const MOCK_ORIGIN = `http://127.0.0.1:${lane?.mock ?? 3988}`;
export const PLATFORM_ORIGIN = `http://127.0.0.1:${lane?.platform ?? 3989}`;
export const CONTROL_ORIGIN = `http://127.0.0.1:${lane?.control ?? 3990}`;

/**
 * The fake Ever ID issuer backend.mjs serves (apps/web/playwright/ever-id-idp.mjs). A plain-http issuer on the
 * loopback is the one issuer the app's own checker accepts without a certificate (`LOOPBACK_HOSTS` in
 * core/lib/auth/ever-id/config.ts), which is what makes the Ever ID routes testable at all. The client id and
 * secret below are placeholders for that fake issuer: the back-channel logout verifies a token the issuer
 * *signed*, so this secret authenticates to nothing real.
 */
export const EVER_ID_ISSUER_URL = `http://127.0.0.1:${lane?.idp ?? 3991}/oidc`;
export const EVER_ID_CLIENT_ID = process.env.E2E_EVER_ID_CLIENT_ID || 'playwright-teams-client';
export const EVER_ID_CLIENT_SECRET = 'playwright-fake-issuer-client-secret';

/**
 * Hosts no run may ever talk to, compared by parsed hostname so that a port (`:443`), a trailing dot, a path or
 * upper case cannot slip one past. live-fixtures.ts and scripts/provision-demo-tenant.mjs keep the same list.
 */
export const PRODUCTION_HOSTS: readonly string[] = ['api.ever.team', 'app.ever.team', 'api.gauzy.co', 'app.gauzy.co'];
export const isProductionHost = (url: string): boolean =>
	PRODUCTION_HOSTS.includes(new URL(url).hostname.toLowerCase().replace(/\.$/, ''));

/** The Jitsi settings a lane started with `E2E_MEET=1` runs on (see `MEET_JWT_APP_SECRET` in `sharedEnv` below). */
export const MEET_TEST = {
	secret: 'playwright-deterministic-meet-secret',
	appId: 'playwright-meet-app',
	domain: '127.0.0.1:4119'
} as const;

/** The LiveKit settings a lane started with `E2E_LIVEKIT=1` runs on (see `LIVEKIT_API_SECRET` in `sharedEnv` below). */
export const LIVEKIT_TEST = {
	apiKey: 'playwright-livekit-key',
	apiSecret: 'playwright-deterministic-livekit-secret',
	url: 'ws://127.0.0.1:4120'
} as const;

/** A run against the demo API instead of the mock. Never a production API. */
export const DEMO_API_ORIGIN = new URL(process.env.E2E_DEMO_API_URL || 'https://apidev.ever.team').origin;
if (isProductionHost(DEMO_API_ORIGIN)) {
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

/**
 * Off unless asked for (E2E_REUSE_SERVERS=1). A server already listening on these ports may be one a developer
 * started by hand, with `apps/web/.env` pointing it at the real API — reusing it would send the whole route sweep
 * there. Opt in only when you started the servers yourself with this file's environment.
 */
const REUSE_SERVERS = process.env.E2E_REUSE_SERVERS === '1' && !process.env.CI;

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
	// Meeting tokens are off unless a run asks for them (E2E_MEET=1), like Docs below: `/api/auth/meet/jwt` then signs with
	// this deterministic test secret, for an app id of this harness only, so a spec can read the token's claims. The
	// Jitsi host is a loopback port nothing listens on: the lane shield (fixtures.ts) lets a local address through, so a
	// spec can answer the host's `external_api.js` itself with `page.route`, and an unanswered load fails on this machine.
	// Blank, the route answers "Server misconfigured" — and blank also keeps a developer's own .env app id out of a run.
	MEET_JWT_APP_SECRET: process.env.E2E_MEET === '1' ? MEET_TEST.secret : '',
	MEET_JWT_APP_ID: process.env.E2E_MEET === '1' ? MEET_TEST.appId : '',
	// LiveKit room tokens, the same way (E2E_LIVEKIT=1): `/api/livekit` signs with this test key and secret, and the
	// server URL is a loopback port nothing listens on, so a spec can read the token's grant and answer or refuse the
	// room connection itself (`page.routeWebSocket`). Blank, the route answers 500 "Server misconfigured".
	LIVEKIT_API_KEY: process.env.E2E_LIVEKIT === '1' ? LIVEKIT_TEST.apiKey : '',
	LIVEKIT_API_SECRET: process.env.E2E_LIVEKIT === '1' ? LIVEKIT_TEST.apiSecret : '',
	NEXT_PUBLIC_LIVEKIT_URL: process.env.E2E_LIVEKIT === '1' ? LIVEKIT_TEST.url : '',
	// Blank unless a run asks for a Board (E2E_BOARD_APP_DOMAIN), exactly like the Ever ID issuer below is blank unless a
	// config turns it on: mounting the Board in every lane would mount a feature the other lanes are not testing, and
	// blank is what a deployment without the Board looks like — which is the state suites/api/board-origin.spec.ts pins.
	// That file reads this key back off the page it is served and skips its trusted-Board half when it is blank, so a
	// plain run cannot silently misprove the mounted case.
	NEXT_PUBLIC_BOARD_APP_DOMAIN: process.env.E2E_BOARD_APP_DOMAIN ?? '',
	// Docs is off by default (core/lib/utils/docs-enabled.ts) and off here unless a run asks for it (E2E_DOCS=1), like
	// the Board above: with it off `/docs/<id>` sends the person home before any docs read (docs-page.tsx), so a docs
	// spec needs an app started with it on. Blank also keeps a developer's own .env from turning it on in every run.
	NEXT_PUBLIC_DOCS_ENABLED: process.env.E2E_DOCS === '1' ? 'true' : '',
	NEXT_PUBLIC_BOARD_BACKEND_POST_URL: '',
	NEXT_PUBLIC_BOARD_FIREBASE_CONFIG: '',
	NEXT_PUBLIC_MEET_DOMAIN: process.env.E2E_MEET === '1' ? MEET_TEST.domain : '',
	NEXT_PUBLIC_SENTRY_DSN: '',
	SENTRY_DSN: '',
	SENTRY_AUTH_TOKEN: '',
	NEXT_PUBLIC_GA_MEASUREMENT_ID: '',
	NEXT_PUBLIC_CHATWOOT_API_KEY: '',
	NEXT_TELEMETRY_DISABLED: '1',
	NEXT_PUBLIC_DISABLE_AUTO_REFRESH: 'false',
	// Off unless a config turns it on (everIdServers): a developer's own Ever ID settings would otherwise mount the
	// Ever ID routes in every run, and suites/api/ever-id-off.spec.ts pins them as absent.
	EVER_ID_ISSUER_URL: '',
	EVER_ID_CLIENT_ID: '',
	EVER_ID_CLIENT_SECRET: '',
	NEXT_PUBLIC_EVER_ID_APP_NAME: ''
});

/**
 * The test backend's ports, from the same constants the configs wait on and helpers.ts calls, so the address the
 * backend listens on cannot drift from either (backend.mjs only falls back to its defaults when run by hand).
 */
const backendEnv = (): Record<string, string> => ({
	E2E_MOCK_API_PORT: new URL(MOCK_ORIGIN).port,
	E2E_MOCK_PLATFORM_PORT: new URL(PLATFORM_ORIGIN).port,
	E2E_CONTROL_PORT: new URL(CONTROL_ORIGIN).port,
	E2E_EVER_ID_ISSUER_PORT: new URL(EVER_ID_ISSUER_URL).port,
	E2E_EVER_ID_CLIENT_ID: EVER_ID_CLIENT_ID
});

/** The mock Gauzy API + the Ever Platform statistics sink + the control API, then the app. */
export function mockServers(): WebServer[] {
	return [
		{
			command: 'node apps/web/playwright/backend.mjs',
			port: Number(new URL(CONTROL_ORIGIN).port),
			timeout: 120_000,
			reuseExistingServer: REUSE_SERVERS,
			env: backendEnv(),
			cwd: REPO_ROOT
		},
		{
			command: 'yarn turbo dev --filter=@ever-teams/web',
			port: Number(new URL(APP_ORIGIN).port),
			timeout: 900_000,
			reuseExistingServer: REUSE_SERVERS,
			env: sharedEnv(MOCK_ORIGIN),
			cwd: REPO_ROOT
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
			env: backendEnv(),
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

/**
 * The servers of a lane: its own backend (with its own fake issuer) and its own app, on the ports `E2E_LANE`
 * selected. Every constant above — `MOCK_ORIGIN`, `CONTROL_ORIGIN`, `APP_ORIGIN`, `EVER_ID_ISSUER_URL` — already
 * followed that variable, so the lane's specs and its `webServer` cannot disagree about where the mock is.
 *
 * Two facts about this repository and this machine, both measured rather than assumed, are why this looks the way
 * it does:
 *
 * - `yarn turbo dev --filter=@ever-teams/web` is `yarn node env.js && yarn next dev -p 3030`
 *   (apps/web/package.json): the port is hardcoded in the script, so a lane asking for 3031 got
 *   `EADDRINUSE :::3030` — it would have taken the canonical suite's port. A lane therefore calls the app's own
 *   `next dev -p <port>` from `apps/web`. `env.js` is dotenv plus console lines, and Next loads
 *   `.env.local`/`.env` itself without overriding a variable the process already has.
 * - Next 16 allows one dev server per project directory: its lock is
 *   `<distDir>/dev/logs/next-development.log`, and a second `next dev` in `apps/web` prints "Another next dev
 *   server is already running" and exits (proved: 3031 and 3032 coexisted only once each had its own distDir). So
 *   a lane gets `.next-lane-<port>` through `PLAYWRIGHT_LANE_DIST_DIR`, which `next.config.js` turns into
 *   `distDir`. Unset, nothing changes for `yarn dev`. The lane pays a cold compile cache for that freedom.
 *
 * `options.everId` mounts the Ever ID routes in that lane's app (see `everIdServers` for why they need four
 * settings at all). `reuseExistingServer` is deliberately *on* here, unlike the canonical configs: a lane iterates
 * spec by spec through a night, and a cold Turbopack compile per iteration is minutes lost. It reuses *whatever*
 * answers on its ports, though, and nothing checks whose server that is: on 2026-11-26 two sessions on one PC came
 * within minutes of testing each other's worktrees through it. So it is off in CI (`LANE_REUSE_SERVERS`), where a
 * leftover server is never the one a run wants.
 */
export function laneServers(
	laneName = selectedLane ?? '',
	options: { everId?: boolean } = {}
): { servers: WebServer[]; ports: LanePorts } {
	const ports = LANE_PORTS[laneName];
	if (!ports) {
		throw new Error(
			`laneServers needs a lane name. Pass one, or start the run with E2E_LANE set. Known lanes: ${Object.keys(LANE_PORTS).join(', ')}.`
		);
	}
	const appOrigins = [`http://localhost:${ports.app}`, `http://127.0.0.1:${ports.app}`];
	/**
	 * The lane's origins are named from `ports` here rather than taken from `MOCK_ORIGIN` / `PLATFORM_ORIGIN` /
	 * `APP_ORIGIN`, and that is a bug fix, not tidiness: those constants followed `E2E_LANE` only if it was set
	 * *before this module was imported*. `scripts/lane-servers.mjs` had to set the variable itself (a lane is
	 * started by hand, so it is not in the caller's environment), and a static import runs first — so its lane app
	 * got `http://127.0.0.1:3988`, a port nothing on that lane listens on. Measured: every server-side call from
	 * that app answered 502 `{"statusCode":502,"message":"The Gauzy API is unreachable"}`
	 * (`core/services/server/forward-to-gauzy.ts`), and 25 route-guard tests went red reading it as "the fixture
	 * role was allowed through". A lane's app now cannot be pointed anywhere but its own mock.
	 */
	const origins = {
		app: `http://localhost:${ports.app}`,
		mock: `http://127.0.0.1:${ports.mock}`,
		platform: `http://127.0.0.1:${ports.platform}`,
		issuer: `http://127.0.0.1:${ports.idp}/oidc`
	};
	const env = {
		...sharedEnv(origins.mock),
		// ...and the rest of `sharedEnv`'s origins, which come from the module constants and would otherwise be the
		// canonical 3030/3989 for a hand-started lane. Same values a config run reaches by having `E2E_LANE` set.
		PORT: `${ports.app}`,
		NEXT_PUBLIC_WEB_APP_URL: origins.app,
		EVER_STATS_API_URL: origins.platform,
		NEXT_PUBLIC_EVER_STATS_API_URL: origins.platform,
		PLAYWRIGHT_LANE_DIST_DIR: `.next-lane-${ports.app}`,
		TZ: LANE_TIME_ZONE,
		...(options.everId
			? {
					EVER_ID_ISSUER_URL: origins.issuer,
					EVER_ID_CLIENT_ID,
					EVER_ID_CLIENT_SECRET,
					NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID'
				}
			: {})
	};
	return {
		servers: [
			{
				command: 'node apps/web/playwright/backend.mjs',
				port: ports.control,
				timeout: 120_000,
				reuseExistingServer: LANE_REUSE_SERVERS,
				env: {
					E2E_MOCK_API_PORT: `${ports.mock}`,
					E2E_MOCK_PLATFORM_PORT: `${ports.platform}`,
					E2E_CONTROL_PORT: `${ports.control}`,
					E2E_EVER_ID_ISSUER_PORT: `${ports.idp}`,
					E2E_EVER_ID_CLIENT_ID: EVER_ID_CLIENT_ID,
					TZ: LANE_TIME_ZONE,
					// The mock refuses a browser Origin it does not trust; a lane's browser comes from the lane's port.
					E2E_TRUSTED_APP_ORIGINS: appOrigins.join(',')
				},
				cwd: REPO_ROOT
			},
			{
				/**
				 * `node <path>/next/dist/bin/next`, not `node_modules/.bin/next`: Playwright starts a `webServer` command
				 * through the platform shell, and on Windows `node_modules/.bin/next` — a POSIX shell script — answers
				 * "'node_modules' is not recognized as an internal or external command". The `.cmd` twin would work here
				 * and nowhere else. `next` is hoisted to the repository root (apps/web has no copy of it), and the cwd
				 * below is `apps/web`, so the path walks up two.
				 */
				command: `node ../../node_modules/next/dist/bin/next dev -p ${ports.app}`,
				port: ports.app,
				timeout: 900_000,
				reuseExistingServer: LANE_REUSE_SERVERS,
				env,
				/**
				 * `next dev` reads next.config.js from its working directory, so this is `apps/web` — one level up from
				 * the folder holding the config (`apps/web/playwright`), which is how Playwright resolves a `cwd`
				 * (`REPO_ROOT` above is `../../..` for the same reason). Getting this wrong is not loud: the command then
				 * runs from `apps` and node answers `Cannot find module 'E:\Coding\node_modules\next\dist\bin\next'`.
				 */
				cwd: '..'
			}
		],
		ports
	};
}

/** The app against the demo API: no mock, real data, real tenant. */
export function liveServers(): WebServer[] {
	return [
		{
			command: 'yarn turbo dev --filter=@ever-teams/web',
			port: Number(new URL(APP_ORIGIN).port),
			timeout: 900_000,
			reuseExistingServer: REUSE_SERVERS,
			env: {
				...sharedEnv(DEMO_API_ORIGIN),
				NEXT_PUBLIC_COOKIE_DOMAINS: '',
				EVER_STATS_API_URL: '',
				NEXT_PUBLIC_EVER_STATS_API_URL: '',
				NEXT_PUBLIC_EVER_STATS_ENABLED: 'false'
			},
			cwd: REPO_ROOT
		}
	];
}
