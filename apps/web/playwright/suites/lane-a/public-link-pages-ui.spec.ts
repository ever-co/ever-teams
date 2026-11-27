import { expect, test, type Page } from '../../fixtures';
import { APP_ORIGIN, mockReset, receivedTokens, signInWithFixture, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import type { BrowserContext, ConsoleMessage, Request, Response } from '@playwright/test';

/**
 * What a person sees, and what the browser really sends, on the two pages no other browser spec exercises:
 *
 *   **`/shared-report#token=<token>`** — `app/[locale]/shared-report/page.tsx` +
 *   `core/hooks/dashboards/time-activity/use-shared-report-token.ts` +
 *   `core/components/pages/shared-report/shared-report-page.tsx` (349 lines). Its comment promises the token stays in
 *   the URL fragment, "which the browser never sends to this server" (`app/[locale]/shared-report/page.tsx:6-9`), and
 *   "no account, no navigation". Pinned here: every request the page makes, where the token does and does not appear,
 *   the report for a valid link, and each kind of broken link.
 *   **`/embed/authorize?origin=<site>&organization=<id>&state=<state>`** —
 *   `app/[locale]/(focus)/embed/authorize/page.tsx` + `core/components/pages/embeds/embed-authorize-page.tsx`
 *   (285 lines) + `core/hooks/embeds/use-authorize-embed-site.ts` + `core/lib/utils/embed-authorize.ts`: the popup in
 *   which a person lets a site start and stop their timer, and above all **what the page hands back to that site** —
 *   measured by opening it as a real popup from a stand-in site page and recording the `message` events.
 *
 * Measured in a real Chrome on lane-a (app `http://localhost:3031`, mock `http://127.0.0.1:3992`, control
 * `http://127.0.0.1:3994`, `playwright/test-servers.ts:37-42`) on 2026-11-24. Every string, count, URL and body below was
 * printed by the run: each test logs one `[lane-a public-links] MEASURE …` line, and
 * `E:\Coding\.tmp\s2-probe-shared-4.log` / `s2-probe-embed-1.log` / `s2-probe-embed-2.log` are the throwaway probes
 * behind the numbers; `s2-lane-a-links-1.log` … are this file's own runs.
 *
 * ## The finding (one, pinned on test 7 with `MEASURED, NOT INTENDED`)
 *
 * 1. **A 401 on the shared read throws a signed-out visitor off the link to the sign-in page**, with "Your session has
 *    ended" and none of the page's own refusal copy. `core/lib/utils/shared-report-path.ts:9` calls the page "Where a
 *    shared report is read, without signing in", but `isPageOpenWithoutSession` (`core/services/client/api.service.ts:73-78`)
 *    lists only `/auth/*` and the public team pages, so the 401 goes to `handleUnauthorized` (`:276-281`, `:339-343`)
 *    and on to `handle-unauthorized.ts:82`. The 401 itself is this file's stub: whether the real platform ever answers
 *    this public read with one is not measured here; the reaction to it is the app's.
 *
 * ## The stand-in site, and why it is a loopback origin
 *
 * `SITE_A = http://127.0.0.1:4111` and `SITE_B = http://127.0.0.1:4112` are documents this file serves itself
 * (`sitePage`, `page.route` + `route.fulfill`); nothing listens on those ports. `SITE_A`'s document registers a
 * `message` listener in a `window.__messages` array and a `window.open` button, so the consent popup is a real popup
 * opened by a real foreign origin and every postMessage the app makes is recorded at the site, with its
 * `event.origin`. A `https://…` stand-in is not possible here: `playwright/fixtures.ts:95-100,110-112` (the shield)
 * records every request whose hostname is not `localhost` / `127.0.0.1` / `::1` as the browser leaving the machine and
 * fails the test for it. A loopback origin on another port is a different origin from `http://localhost:3031` in every
 * way that matters to `postMessage` (scheme, host and port all count), so the target-origin measurement is real.
 *
 * ## The stubs, and why this file has to write them at all
 *
 * `cypress/support/mock-gauzy-server.mjs` has **no handler** for `/api/public/saved-reports/:token`, for
 * `/api/user-organization` or for `/api/embed/authorize`; its catch-all answers a GET with `pagination([])` =
 * `{ items: [], total: 0 }` (`:895`), anything that is not a GET with the body it was sent (`:894`) and a DELETE with
 * `{ affected: 1, raw: [] }` (`:893`). Test 1 measures what the shared-report page makes of the first of those, and
 * that is a mock limit, not an app finding. So this file answers those three routes itself, with `page.route` +
 * `route.fulfill`, shaped from the code that reads them:
 *
 * - `GET /public/saved-reports/:token` → `IPublicSavedReport` (`core/types/interfaces/timesheet/saved-report.ts:160-180`,
 *   read by `core/services/client/api/timesheets/saved-report.service.ts:133-138`); the report body is this file's
 *   invention, copied field for field from the page's own unit test (`core/components/pages/shared-report/shared-report-page.test.tsx:66-103`).
 * - `GET /user-organization` → `{ items: [membership], total: 1 }`, the membership shape
 *   `core/lib/utils/team-menu-organizations.ts:30-46` reads (`organizationId`, `isActive`, `organization.name`), asked
 *   by `core/services/client/api/users/user-organization.service.ts:13-34`. Without it the person has no memberships,
 *   `teamMenuOrganizationsOf` returns `{ current: null, others: [] }` (`:52-73`) and **every** organization — the
 *   person's own included — reads as "not a member". That is why test 19 pins the mock-alone variant apart.
 * - `POST /embed/authorize` → `EmbedSiteTokens` (`core/types/schemas/embeds/embed.schema.ts:64-69`: `token`,
 *   `expiresAt`, `renewalToken`, `renewalExpiresAt`), the answer `embedsService.authorizeSite` validates
 *   (`core/services/client/api/embeds/embeds.service.ts:169-172`). Test 21 measures what the mock makes of its own echo of the
 *   request body does to that validation.
 *
 * Every answer restates the mock's CORS headers (`CORS_HEADERS` below, from `mock-gauzy-server.mjs:1087-1096` plus its
 * `OPTIONS` → 204 at `:1097-1101`), because the page is on `localhost:3031` and the API on `127.0.0.1:3992`: without
 * them the browser throws the answer away and the case turns into a connection error. `route.fetch()` is never called,
 * so in a stubbed case `mock.requests()` holds nothing for that path — the proof that the page acted on this file.
 * Where a case measures the mock's own answer instead — 1 (no public saved-report route), 20's second variant (empty
 * memberships) and 21 (the authorize body echoed back) — the mock's own log is what is asserted, and each of those is
 * marked a mock limit.
 *
 * ## Console noise, reported not asserted
 *
 * Console errors are printed in the MEASURE lines of the cases that read them (`consoleErrors`, and `pageErrors` where
 * a case can crash) and asserted where a case turns on them: test 1 asserts the crash of the mock-alone case *is*
 * logged and that nothing escaped the app (`watched.pageErrors` empty, `shared-report-page.tsx:298` is where it throws).
 * Refused reads add the browser's own `Failed to load resource` line, already filtered as noise by the lane fixture
 * (`playwright/helpers.ts:30-44`, applied at `playwright/fixtures.ts:104`). One more line is excluded from
 * `consoleFindings`, for its exact text only: React's dev-mode `The result of getSnapshot should be cached to avoid an
 * infinite loop` — the shell store line `suites/lane-a/security-two-factor-ui.spec.ts` names (`SHELL_STORE_NOISE`,
 * `consoleFindings`, `shellStoreNoiseOf` below). Measured here: `grep -c getSnapshot` is 0 in every log this file
 * produced, while the line is in the logs of the sibling specs on this lane, so the exclusion is a guard and not a way
 * to hide what these pages wrote — and whatever it drops is printed beside what it keeps (`consoleNoiseExcluded`). The
 * dev-only `DEV Query failed …` toast (`core/components/common/dev-error-toaster.tsx:181`, mounted only under
 * `IS_DEV_MODE` at `app/[locale]/layout-component.tsx:149`) is printed too: in these dev runs it quotes the failed
 * query key, which for a shared report is
 * `["saved-reports","shared","<token>"]` — the token in the browser's own toast, never on the wire.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const SHARED_PATH = '/shared-report';
const SHARED_TOKEN = 'srk_0f3a9c1b7d2e4f8a90b1c2d3e4f5a6b7';
const SHARED_TOKEN_SECOND = 'srk_second000000000000000000000ff';
const SHARED_READ_PATH = `/api/public/saved-reports/${SHARED_TOKEN}`;

const EMBED_PATH = '/embed/authorize';
const SITE_A = 'http://127.0.0.1:4111';
const SITE_B = 'http://127.0.0.1:4112';
const SITE_STATE = '0123456789abcdef0123456789abcdef';
/** The two pages are each the other's interstitial: navigating through one gives a fresh, API-quiet document. */
const INTERSTITIAL_FOR_SHARED = EMBED_PATH;
const INTERSTITIAL_FOR_EMBED = SHARED_PATH;

const PATH_AFTER_SIGN_IN_KEY = 'ever-teams:path-after-sign-in';

/**
 * Every string below is a line of `locales/en.json` as it is on disk today: `sharedReport` `:8473-8482`,
 * `pages.embedAuthorize` `:2973-3003`, `pages.joinTeam` `:2960-2964`, `pages.unauthorized` `:2794-2798`,
 * `pages.error` `:2811-2816`, `.auth.sessionEnded` `:6657-6658`, and `dashboard.timeActivity` `:1281`
 * (`figures` `:1315-1337`, `columns` `:1297-1300`, `sheet` `:1387-1394`). Each constant names its own key and line.
 */
const APP_NAME = 'Ever Teams'; // core/constants/config/constants.tsx:326 with apps/web/.env:77
const READ_ONLY_BADGE = 'Read only'; // sharedReport.READ_ONLY_BADGE, en.json:8474
const NOT_WORKING_TITLE = 'This link no longer works'; // sharedReport.NOT_WORKING_TITLE, en.json:8476
const NOT_WORKING_MESSAGE = 'Its author turned it off, replaced it or let it end. Ask them for a new link.'; // sharedReport.NOT_WORKING_MESSAGE, en.json:8477
const ERROR_TITLE = 'The report could not be read'; // sharedReport.ERROR_TITLE, en.json:8478
const ERROR_MESSAGE = 'Check your connection and try again.'; // sharedReport.ERROR_MESSAGE, en.json:8479
const LOADING_REPORT = 'Loading the report…'; // sharedReport.LOADING, en.json:8480
const REPORT_EMPTY = 'No time was tracked in this period.'; // sharedReport.EMPTY, en.json:8481
const TRY_AGAIN = 'Try again'; // pages.unauthorized.TRY_AGAIN, en.json:2798 (the key the card's button uses, shared-report-page.tsx:115)
const APP_ERROR_TITLE = 'Something went wrong'; // pages.error.HEADING_TITLE, en.json:2813
const FIGURE_TRACKED = 'Tracked time'; // dashboard.timeActivity.figures.TRACKED, en.json:1317
const FIGURE_MEMBERS = 'Members'; // dashboard.timeActivity.figures.MEMBERS, en.json:1332
const COLUMN_EARNINGS = 'Earnings'; // dashboard.timeActivity.columns.EARNINGS, en.json:1300
const CHART_LABEL = 'Tracked time and activity per day'; // dashboard.timeActivity.sheet.CHART_LABEL, en.json:1394
const SHEET_LABEL = 'Report of the period'; // dashboard.timeActivity.sheet.LABEL, en.json:1388

const EMBED_TITLE = 'Allow this site to use your timer'; // pages.embedAuthorize.TITLE, en.json:2974
const EMBED_DESCRIPTION = 'A site asks to start and stop your Ever Teams timer for you.'; // pages.embedAuthorize.DESCRIPTION, en.json:2975
const EMBED_SITE_LABEL = 'Site'; // pages.embedAuthorize.SITE_LABEL, en.json:2976
const EMBED_ORGANIZATION_LABEL = 'Organization'; // pages.embedAuthorize.ORGANIZATION_LABEL, en.json:2977
const EMBED_PERMISSION =
	'It can start and stop your timer. It never sees your password, and you can sign out from the site at any time.'; // pages.embedAuthorize.PERMISSION, en.json:2979
const EMBED_ALLOW = 'Allow'; // pages.embedAuthorize.ALLOW, en.json:2980
const EMBED_CANCEL = 'Cancel'; // pages.embedAuthorize.CANCEL, en.json:2981
const EMBED_SIGNED_IN_AS = 'Signed in as'; // pages.joinTeam.SIGNED_IN_AS, en.json:2963
const EMBED_NOT_YOU = 'Not you?'; // pages.joinTeam.NOT_YOU, en.json:2964
const EMBED_SIGN_IN_TITLE = 'Sign in to continue'; // pages.embedAuthorize.SIGN_IN_TITLE, en.json:2988
const EMBED_SIGN_IN_TEXT = 'Sign in to Ever Teams, then allow http://127.0.0.1:4111 to start and stop your timer.'; // pages.embedAuthorize.SIGN_IN_TEXT, en.json:2989, appName + site filled
const EMBED_SIGN_IN = 'Sign in'; // pages.embedAuthorize.SIGN_IN, en.json:2990
const EMBED_INVALID_TITLE = 'This sign-in link is not valid'; // pages.embedAuthorize.INVALID_TITLE, en.json:2991
const EMBED_INVALID_TEXT = 'Go back to the site and click its sign-in button again.'; // pages.embedAuthorize.INVALID_TEXT, en.json:2992
const EMBED_NO_OPENER_TITLE = 'Open this page from the site'; // pages.embedAuthorize.NO_OPENER_TITLE, en.json:2993
const EMBED_NO_OPENER_TEXT =
	'This page works only in the window the site opens. Go back to the site and click its sign-in button again.'; // pages.embedAuthorize.NO_OPENER_TEXT, en.json:2994
const EMBED_NOT_MEMBER_TITLE = 'This account cannot allow the site'; // pages.embedAuthorize.NOT_MEMBER_TITLE, en.json:2995
const EMBED_NOT_MEMBER_TEXT =
	'It is not a member of the organization this site belongs to. Sign in with the account you use there.'; // pages.embedAuthorize.NOT_MEMBER_TEXT, en.json:2996
const EMBED_REFUSED_SITE =
	'This organization does not allow this site. Ask an administrator to add it in Settings > Embeds.'; // pages.embedAuthorize.REFUSED_SITE_NOT_ALLOWED, en.json:2998
const EMBED_REFUSED_SIGN_IN_OFF =
	'Sign-in from this site is off. Ask an administrator to turn it on in Settings > Embeds.'; // pages.embedAuthorize.REFUSED_SIGN_IN_OFF, en.json:2999
const EMBED_REFUSED_MEMBER =
	'Your account cannot track time in this organization. Ask an administrator to turn your time tracking on.'; // pages.embedAuthorize.REFUSED_MEMBER_NOT_ALLOWED, en.json:3000
const EMBED_REFUSED_UNAVAILABLE = 'This server does not offer sign-in from sites. Ask its administrator.'; // pages.embedAuthorize.REFUSED_UNAVAILABLE, en.json:3001
const EMBED_REFUSED_FAILED = 'The site could not be allowed. Try again.'; // pages.embedAuthorize.REFUSED_FAILED, en.json:3002

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1096`), restated for every answer this spec writes. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** React's dev-mode store warning (see the header); excluded from silence assertions for this exact string only. */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const consoleFindings = (lines: string[]) => lines.filter((line) => !line.includes(SHELL_STORE_NOISE));
/** What was taken out, printed beside what was kept, so the exclusion is visible in the log. */
const shellStoreNoiseOf = (lines: string[]) => lines.filter((line) => line.includes(SHELL_STORE_NOISE));

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a public-links] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

type StubAnswer = { status?: number; body?: unknown; abort?: boolean };
/** One browser request as the browser sent it. */
type SentRequest = {
	method: string;
	url: string;
	path: string;
	query: string;
	origin: string;
	body: string | null;
	referer: string | null;
	authorization: string | null;
	resourceType: string;
};

/**
 * `IPublicSavedReport` (`core/types/interfaces/timesheet/saved-report.ts:160-180`), field for field the report the
 * page's own unit test draws (`shared-report-page.test.tsx:66-103`): 1 h 30 m on one day, one project of one client,
 * one member, one task.
 */
function sharedReport(fields: Record<string, unknown> = {}) {
	return {
		name: 'Client A, last month',
		kind: 'TIME_AND_ACTIVITY',
		grouping: 'project',
		includeAmounts: false,
		period: { rule: 'lastMonth', startDate: '2026-10-01', endDate: '2026-10-31', timeZone: 'UTC' },
		generatedAt: '2026-11-14T10:00:00.000Z',
		days: [
			{
				date: '2026-10-02',
				sum: 5400,
				logs: [
					{
						project: {
							id: 'p1',
							name: 'Website',
							organizationContact: { id: 'client-a', name: 'Client A' }
						},
						employeeLogs: [
							{
								employee: {
									id: 'ada',
									fullName: 'Ada Lovelace',
									user: { firstName: 'Ada', lastName: 'Lovelace', name: 'Ada Lovelace' }
								},
								sum: 5400,
								tasks: [{ task: { id: 't1', title: 'Home page' }, duration: 5400, client: null }]
							}
						]
					}
				]
			}
		],
		totals: { duration: 5400 },
		...fields
	};
}

/** `EmbedSiteTokens` (`core/types/schemas/embeds/embed.schema.ts:64-69`); these four strings are this file's own. */
const SITE_TOKENS = {
	token: 'header.claims.signature',
	expiresAt: '2026-11-19T10:15:00.000Z',
	renewalToken: 'gzr_renewal-token',
	renewalExpiresAt: '2026-12-19T10:00:00.000Z'
};

/**
 * Gauzy's refusal body on the wire: `{ statusCode, message, code }`. `code` is what reaches the page —
 * `ApiErrorService.fromAxiosError` reads `response.data.code` and puts it on the error's `errorCode`
 * (core/services/client/api-error.service.ts:286-297), which `embedSiteRefusalOf` maps through
 * `REFUSALS_BY_CODE` (core/lib/utils/embed-authorize.ts:31-35, :95-105). The unit test mocks the *service* and hands
 * it the finished `ApiError` shape instead (embed-authorize-page.test.tsx:144).
 */
const refusal = (status: number, message: string, extra: Record<string, unknown> = {}) => ({
	status,
	body: { statusCode: status, message, ...extra }
});

/**
 * Records everything one page sends, and its console/page errors. `clear()` marks where the navigation under test
 * starts, so a helper page's own requests never end up in a count.
 */
function watchPage(page: Page) {
	const requests: SentRequest[] = [];
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];
	const documents: Array<{ url: string; status: number }> = [];

	const onRequest = (request: Request) => {
		const url = new URL(request.url());
		requests.push({
			method: request.method(),
			url: request.url(),
			path: url.pathname,
			query: url.search,
			origin: url.origin,
			body: request.postData(),
			referer: request.headers().referer ?? null,
			authorization: request.headers().authorization ?? null,
			resourceType: request.resourceType()
		});
	};
	const onResponse = (response: Response) => {
		if (response.request().resourceType() === 'document') {
			documents.push({ url: response.url(), status: response.status() });
		}
	};
	const onConsole = (message: ConsoleMessage) => {
		if (message.type() === 'error') consoleErrors.push(message.text());
	};
	const onPageError = (error: Error) => pageErrors.push(error.message);

	page.on('request', onRequest);
	page.on('response', onResponse);
	page.on('console', onConsole);
	page.on('pageerror', onPageError);

	return {
		requests,
		consoleErrors,
		pageErrors,
		documents,
		/** Detaches this watcher's listeners; a page watched many times must not keep 20 listeners. */
		stop: () => {
			page.off('request', onRequest);
			page.off('response', onResponse);
			page.off('console', onConsole);
			page.off('pageerror', onPageError);
		},
		clear: () => {
			requests.length = 0;
			documents.length = 0;
		},
		/** The requests this page sent to the API mock. */
		api: () => requests.filter((call) => call.origin === MOCK_API_ORIGIN),
		/** The requests this page sent to the app server itself. */
		app: () => requests.filter((call) => call.origin === APP_ORIGIN),
		/** `METHOD path` of every API request, oldest first. */
		shapes: () =>
			requests.filter((call) => call.origin === MOCK_API_ORIGIN).map((call) => `${call.method} ${call.path}`),
		countOf: (path: string) =>
			requests.filter((call) => call.origin === MOCK_API_ORIGIN && call.path === path).length
	};
}

/** Installs this spec's answers for a set of mock paths and records the browser's calls of them. */
async function stubMockRoutes(target: Page | BrowserContext, script: Record<string, StubAnswer[]>) {
	const calls: SentRequest[] = [];
	const used: Record<string, number> = {};
	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		Object.keys(script).some((key) => url.pathname === key.slice(key.indexOf(' ') + 1));

	await target.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
		calls.push({
			method,
			url: request.url(),
			path: url.pathname,
			query: url.search,
			origin: url.origin,
			body: request.postData(),
			referer: request.headers().referer ?? null,
			authorization: request.headers().authorization ?? null,
			resourceType: request.resourceType()
		});
		const key = `${method} ${url.pathname}`;
		const answers = script[key];
		if (!answers || answers.length === 0) {
			return route.fulfill({
				status: 599,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify({ message: `this spec scripted no answer for ${key}` })
			});
		}
		const index = used[key] ?? 0;
		used[key] = index + 1;
		const answer = answers[Math.min(index, answers.length - 1)];
		if (answer.abort) return route.abort('failed');
		return route.fulfill({
			status: answer.status ?? 200,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: answer.body === undefined ? '' : JSON.stringify(answer.body)
		});
	});

	return {
		calls,
		/** The browser's calls of one path, as `METHOD path body`. */
		shapes: (path: string) =>
			calls.filter((call) => call.path === path).map((call) => [call.method, call.path, call.body]),
		countOf: (path: string) => calls.filter((call) => call.path === path).length,
		uninstall: () => target.unroute(matcher)
	};
}

const previousWatcher = new WeakMap<Page, () => void>();

/**
 * Navigates the spec's own page to an address through a quiet document, so each case really re-loads the page
 * (`page.goto` to an address that differs only in its fragment is a same-document navigation and reuses the document
 * that is already open — which is exactly how a second shared-report link is opened in one tab). Returns the watcher
 * whose requests start at that navigation.
 */
async function visitFresh(
	page: Page,
	address: string,
	options: { signedIn?: boolean; fixture?: BootstrapFixture; via?: string | null } = {}
) {
	previousWatcher.get(page)?.();
	const watched = watchPage(page);
	previousWatcher.set(page, watched.stop);
	const context = page.context();
	await context.clearCookies();
	if (options.signedIn && options.fixture) await signInWithFixture(context, options.fixture, 'A');
	// `via: null` when the address differs from the one already open by more than its fragment: that goto is a real
	// navigation on its own, and a second one through a quiet page only spends the lane's time.
	const via = options.via === undefined ? INTERSTITIAL_FOR_SHARED : options.via;
	if (via !== null) {
		await page.goto(`${APP_ORIGIN}${via}`, { waitUntil: 'domcontentloaded' });
		watched.clear();
	}
	await page.goto(`${APP_ORIGIN}${address}`, { waitUntil: 'domcontentloaded' });
	return watched;
}

/** The site's own page: a message recorder with a button that opens the consent window. */
const SITE_DOCUMENT = `<!doctype html><html><head><meta charset="utf-8"><title>Site A</title></head><body>
<script>
window.__messages = [];
window.addEventListener('message', function (event) {
	window.__messages.push({ origin: event.origin, data: event.data });
});
window.__openAuthorize = function (url) {
	window.__popup = window.open(url, 'authorize', 'width=640,height=760');
	return Boolean(window.__popup);
};
</script></body></html>`;

const authorizeAddress = (query: string) => `${APP_ORIGIN}${EMBED_PATH}?${query}`;
const authorizeQuery = (origin: string, organizationId: string, state = SITE_STATE) =>
	`origin=${encodeURIComponent(origin)}&organization=${organizationId}&state=${state}`;

/**
 * Opens the site's page in this test's context and returns it with its message recorder. The document is served by
 * this file (`route.fulfill`), on a loopback origin no other spec owns.
 */
async function openSitePage(context: BrowserContext, origin = SITE_A) {
	await context.route(`${origin}/**`, (route) =>
		route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SITE_DOCUMENT })
	);
	const site = await context.newPage();
	const watched = watchPage(site);
	await site.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
	return {
		site,
		watched,
		/** Every `message` the site was sent: its origin and its data. */
		messages: async () =>
			(await site.evaluate(() => (window as unknown as { __messages: unknown[] }).__messages)) as Array<{
				origin: string;
				data: Record<string, unknown>;
			}>,
		open: (url: string) =>
			site.evaluate(
				(target) => (window as unknown as { __openAuthorize: (u: string) => boolean }).__openAuthorize(target),
				url
			)
	};
}

/** The consent window a site opens. `site.open` must be the call that produces it, or `window.opener` is not the site. */
async function openConsent(context: BrowserContext, site: Awaited<ReturnType<typeof openSitePage>>, query: string) {
	const [popup] = await Promise.all([context.waitForEvent('page'), site.open(authorizeAddress(query))]);
	await popup.waitForLoadState('domcontentloaded');
	return popup;
}

/** What a consent window held at the moment it called `window.close()` itself. */
type ConsentWindowAtClose = {
	href: string;
	/** The secrets its visible text still carried. */
	secretsInText: string[];
	/** Every localStorage / sessionStorage key it held. */
	storageKeys: string[];
	/** The keys among them whose value carries one of the secrets. */
	storageKeysHoldingSecret: string[];
};

/**
 * Records, for every window of `context` opened after this call, what it holds at the moment it closes itself
 * (`window.close()`, embed-authorize-page.tsx:53): its address, which of `secrets` its text still carries, its
 * localStorage / sessionStorage keys, and which of those hold a value carrying a secret. A page cannot be read once it
 * has closed, so this is the only moment "the tokens are not left on the page" can be checked. The close itself still
 * happens, once the record has reached the test.
 */
async function recordConsentWindowAtClose(context: BrowserContext, secrets: string[]): Promise<ConsentWindowAtClose[]> {
	const records: ConsentWindowAtClose[] = [];
	await context.exposeBinding('__e2eConsentAtClose', (_source, record: ConsentWindowAtClose) => {
		records.push(record);
	});
	await context.addInitScript((needles: string[]) => {
		const close = window.close.bind(window);
		window.close = () => {
			const send = (window as unknown as { __e2eConsentAtClose?: (record: unknown) => Promise<void> })
				.__e2eConsentAtClose;
			const storageKeys: string[] = [];
			const storageKeysHoldingSecret: string[] = [];
			for (const storage of [window.localStorage, window.sessionStorage]) {
				try {
					for (let index = 0; index < storage.length; index += 1) {
						const key = storage.key(index);
						if (key === null) continue;
						storageKeys.push(key);
						const value = storage.getItem(key) ?? '';
						if (needles.some((needle) => value.includes(needle))) storageKeysHoldingSecret.push(key);
					}
				} catch {
					// a storage this origin may not read holds nothing this page wrote
				}
			}
			const text = document.body?.innerText ?? '';
			const record = {
				href: window.location.href,
				secretsInText: needles.filter((needle) => text.includes(needle)),
				storageKeys,
				storageKeysHoldingSecret
			};
			if (!send) return close();
			void send(record).finally(close);
		};
	}, secrets);
	return records;
}

/** `GET /user-organization` answer: the person is a member of exactly these organizations. */
const membershipsOf = (organizations: Array<{ id: string; name: string }>) => ({
	items: organizations.map((organization) => ({
		organizationId: organization.id,
		isActive: true,
		isArchived: false,
		organization: { id: organization.id, name: organization.name }
	})),
	total: organizations.length
});

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** id of the iframe this file adds to a page, so a host page carrying an iframe of its own is never read instead. */
const PROBE_FRAME_ID = 'lane-a-probe-frame';

/**
 * Puts `src` in an iframe of the page's current document and reports what came of it: whether the frame's own `load`
 * event fired, and the text its document holds once the page inside it had its chance to render (`null` when it holds
 * nothing), plus how long that read was held open.
 *
 * `load` and text are two different moments and only the second one is the measurement: a page of this app renders
 * from its bundle after `load`, so a frame aimed at a page the app allows is polled until its own text appears (the
 * control frame of `/shared-report` had its text inside the first second here, the dev server being warm). A frame the
 * browser refuses never gets a document of this app at all, so its read stays empty for the whole window — that is the
 * difference being measured, and `waitedMs` says which side of it this frame is on.
 */
async function frameOf(page: Page, src: string, settleMs: number) {
	const startedAt = Date.now();
	const outcome = await page.evaluate(
		({ target, id }) =>
			new Promise<string>((done) => {
				const frame = document.createElement('iframe');
				frame.id = id;
				frame.src = target;
				frame.style.width = '600px';
				frame.style.height = '400px';
				frame.onload = () => done('load fired');
				frame.onerror = () => done('load error fired');
				document.body.appendChild(frame);
				window.setTimeout(() => done('neither load nor error fired within 6 s'), 6000);
			}),
		{ target: src, id: PROBE_FRAME_ID }
	);
	let body: string | null = null;
	let innerUrl: string | null = null;
	for (;;) {
		const shown = await page.evaluate((id) => {
			const frame = document.getElementById(id) as HTMLIFrameElement | null;
			if (!frame) {
				return { body: null, innerUrl: null };
			}
			try {
				const inner = frame.contentDocument;
				if (!inner) {
					return { body: null, innerUrl: null };
				}
				const text = (inner.body?.innerText ?? '').trim();
				return { body: text === '' ? null : text, innerUrl: inner.URL };
			} catch {
				return { body: null, innerUrl: 'contentDocument refused' };
			}
		}, PROBE_FRAME_ID);
		body = shown.body;
		innerUrl = shown.innerUrl;
		if (body !== null || shown.innerUrl === 'contentDocument refused' || Date.now() - startedAt >= settleMs) break;
		await sleep(200);
	}
	return { outcome, body, innerUrl, waitedMs: Date.now() - startedAt };
}

/**
 * Waits for `count()` to reach `min` and then to stop moving for `windowMs`, and returns the settled value.
 *
 * A read count on these pages is not one event: `shouldRetryRead` (`shared-report-page.tsx:62-69`) lets the page ask
 * again after anything at or above 500, with TanStack Query's own backoff (about 1 s, then 2 s), so a snapshot taken
 * while that chain is still running is not the number the page sent. The 3 s window is wider than the backoff between
 * the last attempt the page is allowed and a further one, so the value returned is a finished count. For a refusal
 * below 500 the same window is what makes "it was read exactly once" a measurement rather than an assumption.
 */
async function countSettles(count: () => number, min: number, windowMs = 3_000, intervalMs = 200) {
	const deadline = Date.now() + 30_000;
	let value = count();
	while (value < min && Date.now() < deadline) {
		await sleep(intervalMs);
		value = count();
	}
	let stableSince = Date.now();
	while (Date.now() - stableSince < windowMs && Date.now() < deadline) {
		await sleep(intervalMs);
		const next = count();
		if (next !== value) {
			value = next;
			stableSince = Date.now();
		}
	}
	return value;
}

test.describe('lane-a · /shared-report and /embed/authorize: what a person sees and what the browser sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// --------------------------------- 1. what the mock really answers a shared-report link with

	test('1 · the mock answers no public saved-report route: the link page shows the app error card, and the token reached only the API path', async ({
		page,
		mock
	}) => {
		const watched = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`);

		// The mock's catch-all `{ items: [], total: 0 }` (mock-gauzy-server.mjs:895) has no `period`, so
		// periodOfPublicReport (core/lib/utils/dashboards/saved-report.ts:265-267) throws inside SharedReport
		// (shared-report-page.tsx:298) and the app's error boundary answers instead of the page's own copy.
		await expect(
			page.getByText(APP_ERROR_TITLE, { exact: true }),
			'the mock answer did not break the page'
		).toBeVisible({
			timeout: 25_000
		});
		await expect(page.getByText(NOT_WORKING_TITLE, { exact: true })).toHaveCount(0);
		await expect(page.getByText(ERROR_TITLE, { exact: true })).toHaveCount(0);
		expect(watched.pageErrors, 'the crash escaped the app error boundary').toEqual([]);
		expect(
			consoleFindings(watched.consoleErrors).some((line) => line.includes('periodOfPublicReport')),
			'the crash was not logged'
		).toBe(true);

		// Exactly one read, and the token appears in its path only.
		expect(watched.shapes(), 'the page sent something other than one read').toEqual([`GET ${SHARED_READ_PATH}`]);
		expect(
			watched.app().map((call) => call.url),
			'an app-origin URL carried the token'
		).not.toContainEqual(expect.stringContaining(SHARED_TOKEN));
		expect(watched.documents, 'the shared-report document was not served').toEqual([
			expect.objectContaining({ url: expect.stringContaining(SHARED_PATH), status: 200 })
		]);
		expect(await mock.requests(), 'the mock did not log exactly the read the browser sent').toEqual([
			expect.objectContaining({ method: 'GET', path: SHARED_READ_PATH, status: 200 })
		]);
		await expect(page.getByRole('navigation')).toHaveCount(0);
		await expect(page.getByRole('link')).toHaveCount(0);

		report('1 the mock alone', {
			url: page.url(),
			browserApi: watched.api().map((call) => ({
				method: call.method,
				path: call.path,
				referer: call.referer,
				authorization: call.authorization !== null
			})),
			appUrlsWithoutToken: watched.app().filter((call) => !call.url.includes(SHARED_TOKEN)).length,
			mockLog: await mock.requests(),
			consoleErrors: watched.consoleErrors.map((line) => line.slice(0, 120)),
			pageErrors: watched.pageErrors,
			body: flat(await page.locator('body').innerText()).slice(0, 300)
		});
	});

	// --------------------------------- 2. an address that carries no token

	test('2 · an address with no token, a token-less fragment, a whitespace token or a query instead of the fragment: the link says it no longer works and reads nothing', async ({
		page,
		mock
	}) => {
		const addresses = [
			{ label: 'no fragment', address: SHARED_PATH },
			{ label: 'fragment without a token key', address: `${SHARED_PATH}#nonsense=1` },
			{ label: 'empty token', address: `${SHARED_PATH}#token=` },
			{ label: 'whitespace token', address: `${SHARED_PATH}#token=%20%20` },
			{ label: 'token as a query, not a fragment', address: `${SHARED_PATH}?token=${SHARED_TOKEN}` }
		];

		const visited: Array<{ label: string; finalUrl: string; asks: number }> = [];
		let last = watchPage(page);
		for (const one of addresses) {
			const watched = await visitFresh(page, one.address);
			last = watched;
			visited.push({ label: one.label, finalUrl: page.url(), asks: watched.api().length });
			await expect(page.getByText(NOT_WORKING_TITLE, { exact: true }), `${one.label}: no refusal`).toBeVisible({
				timeout: 25_000
			});
			await expect(page.getByText(NOT_WORKING_MESSAGE, { exact: true })).toBeVisible();
			await expect(page.getByText(LOADING_REPORT, { exact: true })).toHaveCount(0);
			// shared-report-page.tsx:325-328 `token === ''` is `isGone`, and useSharedReport is `enabled: Boolean(token)`
			// (shared-report-page.tsx:71-79) — so nothing is asked, not even a read of an empty token.
			expect(watched.api(), `${one.label}: the page read anyway`).toEqual([]);
			expect(await mock.requests(), `${one.label}: the mock was asked anyway`).toEqual([]);
			await expect(page.getByText(READ_ONLY_BADGE, { exact: true })).toBeVisible();
		}

		report('2 no token', {
			visited,
			shown: flat(await page.locator('body').innerText()),
			mockLog: await mock.requests(),
			consoleErrors: consoleFindings(last.consoleErrors),
			consoleNoiseExcluded: shellStoreNoiseOf(last.consoleErrors)
		});
	});

	// --------------------------------- 3. a valid token, the report it opens

	test('3 · a valid token shows the report: name, period, read-only line, figures, chart and table, and exactly one read with the token in its path', async ({
		page,
		mock
	}) => {
		const stub = await stubMockRoutes(page, {
			[`GET ${SHARED_READ_PATH}`]: [{ status: 200, body: sharedReport() }]
		});
		const watched = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`);

		await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toBeVisible({
			timeout: 25_000
		});
		await expect(page.getByText(READ_ONLY_BADGE, { exact: true })).toBeVisible();
		await expect(page.getByText('Oct 1 – 31', { exact: true })).toBeVisible();
		await expect(
			page.getByText(`A read-only report shared from ${APP_NAME}. Figures as of Nov 14, 2026`, { exact: false })
		).toBeVisible();
		// The sheet (TimeActivitySheet) is the region the figures, the chart and the day table live in
		// (shared-report-page.tsx:193-224 renders them as a `dl` of term/definition pairs).
		const sheet = page.getByRole('region', { name: SHEET_LABEL });
		const figures = sheet.locator('dl');
		await expect(figures.locator('dt').nth(0)).toHaveText(FIGURE_TRACKED);
		await expect(figures.locator('dd').nth(0)).toHaveText('1h 30m');
		await expect(figures.locator('dt').nth(1)).toHaveText(FIGURE_MEMBERS);
		await expect(figures.locator('dd').nth(1)).toHaveText('1');
		await expect(sheet.getByRole('slider', { name: CHART_LABEL })).toBeVisible();
		await expect(sheet.getByRole('table', { name: CHART_LABEL })).toBeVisible();
		// The breakdown under the day table (`grouping: 'project'`): a project row and a task row, both buttons, the
		// task folded. The member of that task is drawn only once the person opens the task row — and nothing but a
		// click is needed to open it, with no account in the browser.
		const memberRow = page.getByText('Ada Lovelace');
		await expect(page.getByRole('button', { name: 'Website', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Home page', exact: true })).toBeVisible();
		await expect(memberRow, 'the breakdown showed the member before the task row was opened').toHaveCount(0);
		await page.getByRole('button', { name: 'Home page', exact: true }).click();
		await expect(memberRow).toBeVisible();
		await expect(page.getByText(COLUMN_EARNINGS, { exact: true })).toHaveCount(0); // includeAmounts false → shared-report-page.tsx:201
		await expect(page.getByText(REPORT_EMPTY, { exact: true })).toHaveCount(0);

		const reads = stub.countOf(SHARED_READ_PATH);
		expect(reads, 'a report that arrived was read again').toBe(1);
		expect(
			stub.calls.map((call) => ({
				method: call.method,
				path: call.path,
				query: call.query,
				referer: call.referer,
				authorization: call.authorization
			})),
			'the read was not exactly the public GET of the token'
		).toEqual([
			{
				method: 'GET',
				path: SHARED_READ_PATH,
				query: '',
				referer: null,
				authorization: null
			}
		]);
		expect(await mock.requests(), 'the stubbed read never reached the mock').toEqual([]);

		report('3 a valid token', {
			url: page.url(),
			reads,
			browserRequest: stub.calls.map(
				(call) => `${call.method} ${call.url} referer=${call.referer} authorization=${call.authorization}`
			),
			shown: flat(await page.locator('body').innerText()).slice(0, 420),
			consoleErrors: watched.consoleErrors
		});
		await stub.uninstall();
	});

	// --------------------------------- 4. no account, no navigation

	test('4 · no account and no navigation: zero landmarks, zero links, zero sign-in offers, and nothing the visitor can change', async ({
		page
	}) => {
		const stub = await stubMockRoutes(page, {
			[`GET ${SHARED_READ_PATH}`]: [{ status: 200, body: sharedReport() }]
		});
		const watched = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toBeVisible({
			timeout: 25_000
		});

		await expect(page.getByRole('navigation')).toHaveCount(0);
		await expect(page.getByRole('link')).toHaveCount(0);
		await expect(page.getByRole('complementary')).toHaveCount(0);
		await expect(page.getByRole('search')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);
		await expect(page.getByRole('textbox')).toHaveCount(0);
		await expect(page.locator('form')).toHaveCount(0);
		// The header the page does draw: the app name and the read-only badge, and nothing else outside main. The
		// breakdown table brings its own `header` inside main, which is no banner landmark (shared-report-page.tsx:84-92
		// renders this one above main).
		const header = page.getByRole('banner');
		expect(flat(await header.innerText()), 'the shared-report header is not the measured one').toBe(
			`${APP_NAME} ${READ_ONLY_BADGE}`
		);
		const mainButtons = (await page.locator('main').getByRole('button').allInnerTexts()).map(flat);
		// Measured: the report table's own controls only — its "Collapse all" (time-activity-breakdown.tsx:1054-1062)
		// and its Share *column header* button (:729-741), which is a column name with a tooltip, not an action.
		expect(mainButtons, 'the page offered something other than the table own controls').toEqual([
			'Collapse all',
			'Share',
			'WE Website',
			'Home page'
		]);

		report('4 no account, no navigation', {
			navLandmarks: await page.getByRole('navigation').count(),
			links: await page.getByRole('link').count(),
			header: flat(await header.innerText()),
			mainButtons,
			browserApi: watched.shapes()
		});
		await stub.uninstall();
	});

	// --------------------------------- 5. refusals: gone, refused, and the copy each one gets

	test('5 · 404 says the link no longer works; 403 and 410 say the report could not be read; none of them is read again', async ({
		page
	}) => {
		const cases: Array<{ label: string; answer: StubAnswer; title: string; message: string; reads: number }> = [
			{
				label: '404 gone',
				answer: refusal(404, 'This report link does not work.'),
				title: NOT_WORKING_TITLE,
				message: NOT_WORKING_MESSAGE,
				reads: 1
			},
			{
				label: '403 refused',
				answer: refusal(403, 'Forbidden'),
				title: ERROR_TITLE,
				message: ERROR_MESSAGE,
				reads: 1
			},
			{ label: '410 expired', answer: refusal(410, 'Gone'), title: ERROR_TITLE, message: ERROR_MESSAGE, reads: 1 }
		];

		for (const one of cases) {
			const stub = await stubMockRoutes(page, { [`GET ${SHARED_READ_PATH}`]: [one.answer] });
			const watched = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`);
			await expect(page.getByText(one.title, { exact: true }), `${one.label}: the wrong sentence`).toBeVisible({
				timeout: 25_000
			});
			await expect(page.getByText(one.message, { exact: true })).toBeVisible();
			await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toHaveCount(0);
			// shouldRetryRead (shared-report-page.tsx:62-69) treats anything below 500 as a refusal: one read only.
			const reads = await countSettles(() => stub.countOf(SHARED_READ_PATH), one.reads);
			expect(reads, `${one.label}: a refusal was read again`).toBe(one.reads);
			expect(
				watched.api().every((call) => call.referer === null),
				`${one.label}: the read carried a Referer`
			).toBe(true);
			await stub.uninstall();
			report(`5 ${one.label}`, {
				reads,
				shown: flat(await page.locator('body').innerText()).slice(0, 240),
				browserRequests: watched.shapes()
			});
		}
	});

	// --------------------------------- 6. an outage, a dropped request, and what "Try again" then does

	test('6 · 500, 502 and a dropped request: "The report could not be read", three reads, and Try again reads again', async ({
		page
	}) => {
		const cases: Array<{ label: string; answer: StubAnswer }> = [
			{ label: '500', answer: refusal(500, 'Server error') },
			{ label: '502', answer: refusal(502, 'Bad gateway') },
			{ label: 'dropped', answer: { abort: true } }
		];

		for (const one of cases) {
			await mockReset();
			const stub = await stubMockRoutes(page, { [`GET ${SHARED_READ_PATH}`]: [one.answer] });
			const watched = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`);
			await expect(page.getByText(ERROR_TITLE, { exact: true }), `${one.label}: no failure notice`).toBeVisible({
				timeout: 30_000
			});
			await expect(page.getByText(ERROR_MESSAGE, { exact: true })).toBeVisible();
			await expect(page.getByRole('button', { name: TRY_AGAIN, exact: true })).toBeVisible();
			await expect(page.getByText(NOT_WORKING_TITLE, { exact: true })).toHaveCount(0);

			// `shouldRetryRead` retries a 5xx while `failureCount < 2` (shared-report-page.tsx:62-69), so three reads.
			const readsBefore = await countSettles(() => stub.countOf(SHARED_READ_PATH), 3);
			expect(readsBefore, `${one.label}: not the measured read count`).toBe(3);

			await page.getByRole('button', { name: TRY_AGAIN, exact: true }).click();
			await expect(page.getByText(ERROR_TITLE, { exact: true })).toBeVisible();
			const readsAfter = await countSettles(() => stub.countOf(SHARED_READ_PATH), readsBefore + 1);
			// The button is `query.refetch()` (shared-report-page.tsx:341) and a refetch runs the same retry rule, so a
			// click adds between one and three attempts: pinned as a bound, because how many of them are spent is
			// TanStack's timing, not the page's, and this file answers every attempt the same way.
			expect(readsAfter, `${one.label}: Try again did not read again}`).toBeGreaterThan(readsBefore);
			expect(readsAfter, `${one.label}: Try again read more than the retry rule allows}`).toBeLessThanOrEqual(
				readsBefore + 3
			);

			if (one.label === 'dropped') {
				// A request that never got an answer reaches the page as HTTP 503 (api-error.service.ts, as the header of
				// suites/lane-a/security-two-factor-ui.spec.ts records); the dev-only toast quotes that diagnosis.
				await expect(page.getByText(/HTTP 503/)).toBeVisible();
			}

			report(`6 ${one.label}`, {
				readsBefore,
				readsAfterTryAgain: readsAfter,
				shown: flat(await page.locator('body').innerText()).slice(0, 240),
				browserRequests: watched.shapes()
			});
			await stub.uninstall();
		}
	});

	// --------------------------------- 7. a 401: the shared link is not shown at all

	test('7 · a 401 off a shared link: signed out the visitor is thrown to the sign-in page; signed in the link stays and shows its own failure card [MEASURED, NOT INTENDED]', async ({
		page,
		fixture,
		mock
	}) => {
		await mockReset();
		const stub = await stubMockRoutes(page, {
			[`GET ${SHARED_READ_PATH}`]: [refusal(401, 'Unauthorized')]
		});
		const signedOut = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`);
		// api.service.ts:276-281 hands a 401 the page did not expect to the session handler;
		// isPageOpenWithoutSession (api.service.ts:73-78) lists only `/auth/*` and public team pages, so
		// /shared-report is not one, and handle-unauthorized.ts:82 assigns DEFAULT_APP_PATH.
		await expect(page).toHaveURL(/\/auth\/passcode/, { timeout: 25_000 });
		await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Ever Teams' })).toBeVisible({
			timeout: 25_000
		});
		// .auth.sessionEnded.TITLE + TEXT (locales/en.json:6657-6658), left by leaveSessionEndedNotice (handle-unauthorized.ts:48)
		await expect(page.getByText('Your session has ended', { exact: true })).toBeVisible();
		await expect(page.getByText(NOT_WORKING_TITLE, { exact: true })).toHaveCount(0);
		await expect(page.getByText(ERROR_TITLE, { exact: true })).toHaveCount(0);
		const readsOut = await countSettles(() => stub.countOf(SHARED_READ_PATH), 1);
		expect(readsOut, 'the refused shared read was retried before the redirect').toBe(1);
		// MEASURED, NOT INTENDED — `shared-report-path.ts:9` calls this page "Where a shared report is read, without
		// signing in", yet `isPageOpenWithoutSession` (api.service.ts:73-78) lists only `/auth/*` and public team pages,
		// so a 401 here is treated as an ended session: with no refresh cookie no renewal is even asked for (0, measured),
		// and `handle-unauthorized.ts:82` assigns DEFAULT_APP_PATH. The visitor leaves the link for the sign-in page and the
		// page's own refusal copy (`sharedReport.NOT_WORKING_*`) is never shown.
		const refreshesSignedOut = signedOut.requests.filter((call) => call.path === '/api/auth/refresh-token').length;
		expect(refreshesSignedOut, 'a signed-out visitor renewed a session there is none of').toBe(0);
		await stub.uninstall();
		report('7 signed out, 401', {
			finalUrl: page.url(),
			readsOfTheLink: readsOut,
			refreshAttempts: refreshesSignedOut,
			shown: flat(await page.locator('body').innerText()).slice(0, 200),
			browserRequests: signedOut.shapes()
		});

		await mockReset();
		const stubIn = await stubMockRoutes(page, { [`GET ${SHARED_READ_PATH}`]: [refusal(401, 'Unauthorized')] });
		const signedIn = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`, { signedIn: true, fixture });
		await expect(
			page.getByText(ERROR_TITLE, { exact: true }),
			'the signed-in person saw no failure card'
		).toBeVisible({
			timeout: 30_000
		});
		await expect(page).toHaveURL(new RegExp(`${SHARED_PATH}`), { timeout: 25_000 });
		// The session here does have a refresh cookie, so a renewal is really asked for, and the mock answers it with its
		// synthetic pair (`mock-gauzy-server.mjs:612-613`). That pair belongs to no scope the refused request was built
		// for, so `handleUnauthorized` refuses to re-send it (api.service.ts:376-379) and ends nothing: the person stays
		// on the link and reads its own failure card.
		const refreshCalls = await countSettles(
			() => signedIn.requests.filter((call) => call.path === '/api/auth/refresh-token').length,
			1
		);
		expect(refreshCalls, 'the session was never renewed').toBeGreaterThanOrEqual(1);
		// One renewal per refused request, and only two requests were refused (the link and the layout's person read).
		expect(refreshCalls, 'more renewals were asked for than the requests that were refused').toBeLessThanOrEqual(2);
		const readsIn = await countSettles(() => stubIn.countOf(SHARED_READ_PATH), 1);
		expect(readsIn, 'the refused read was sent again after the renewal').toBe(1);
		await expect(page.getByText(NOT_WORKING_TITLE, { exact: true })).toHaveCount(0);
		await stubIn.uninstall();
		report('7 signed in, 401', {
			finalUrl: page.url(),
			readsOfTheLink: readsIn,
			refreshCalls,
			mockLog: await mock.requests(),
			shown: flat(await page.locator('body').innerText()).slice(0, 240),
			browserRequests: signedIn.shapes()
		});
	});

	// --------------------------------- 8. signed out vs signed in: the page asks the same thing

	test('8 · signed out and signed in ask for the same read; only the session is added, and the layout reads the person', async ({
		page,
		fixture,
		mock
	}) => {
		await mockReset();
		const stubOut = await stubMockRoutes(page, {
			[`GET ${SHARED_READ_PATH}`]: [{ status: 200, body: sharedReport() }]
		});
		const signedOut = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toBeVisible({
			timeout: 25_000
		});
		const outShapes = signedOut.shapes();
		const outPaths = [...new Set(outShapes)].sort();
		const outRead = stubOut.calls[0];

		await mockReset();
		await stubOut.uninstall();
		const stubIn = await stubMockRoutes(page, {
			[`GET ${SHARED_READ_PATH}`]: [{ status: 200, body: sharedReport() }]
		});
		const signedIn = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`, { signedIn: true, fixture });
		await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toBeVisible({
			timeout: 25_000
		});
		const inShapes = signedIn.shapes();
		const inPaths = [...new Set(inShapes)].sort();
		const inRead = stubIn.calls[0];

		// Which of the two lands first is TanStack's business, so the sets are compared, not the order.
		expect(outPaths, 'signed out, the link asked for something besides itself').toEqual([
			`GET ${SHARED_READ_PATH}`
		]);
		expect(inPaths, 'signed in, the page asked for something other than the person read beside the link').toEqual(
			[`GET ${SHARED_READ_PATH}`, 'GET /api/user/me'].sort()
		);
		expect(outRead.authorization, 'the signed-out read carried an Authorization header').toBe(null);
		expect(inRead.authorization === null, 'the signed-in read carried no Authorization header').toBe(false);
		// The extra read is not the page's: JitsuRoot (core/components/collaborate/jitsu-root.tsx:24) reads the user on
		// every page, and keeps its analytics off here (:47 isSharedReportPath). Compared as a set: in a whole-lane run
		// (2026-11-24, 331 tests) the person was read twice once, the user query refetching under load; the claim is
		// what was asked, not how often.
		expect(
			[...new Set((await mock.requests()).map((call) => `${call.method} ${call.path}`))],
			'the mock logged something other than the person read'
		).toEqual(['GET /api/user/me']);
		const tokensOnThePublicRead = await receivedTokens(SHARED_READ_PATH);
		expect(tokensOnThePublicRead, 'the mock was not told which token the public read carried').toHaveLength(0);

		report('8 signed out vs signed in', {
			signedOut: { shapes: outShapes, readCarriesAuthorization: outRead.authorization !== null },
			signedIn: { shapes: inShapes, readCarriesAuthorization: inRead.authorization !== null },
			mockLogSignedIn: await mock.requests()
		});
		await stubIn.uninstall();
	});

	// --------------------------------- 9. where the token is, and where it is not

	test('9 · the token appears in one request path and nowhere else: no app URL, no Referer, no storage, no document URL', async ({
		page,
		fixture
	}) => {
		const stub = await stubMockRoutes(page, {
			[`GET ${SHARED_READ_PATH}`]: [{ status: 200, body: sharedReport() }]
		});
		const watched = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`, { signedIn: true, fixture });
		await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toBeVisible({
			timeout: 25_000
		});

		const carrying = watched.requests.filter(
			(call) => call.url.includes(SHARED_TOKEN) || (call.body ?? '').includes(SHARED_TOKEN)
		);
		expect(
			carrying.map((call) => `${call.method} ${call.origin}${call.path}`),
			'the token travelled somewhere unexpected'
		).toEqual([`GET ${MOCK_API_ORIGIN}${SHARED_READ_PATH}`]);
		expect(
			watched.requests.filter((call) => call.origin === APP_ORIGIN && call.url.includes(SHARED_TOKEN)),
			'an http://localhost:3031 request carried the token'
		).toEqual([]);
		expect(
			watched.documents.filter((document) => document.url.includes(SHARED_TOKEN)),
			'a navigation to this app carried the token'
		).toEqual([]);
		// app/[locale]/shared-report/layout.tsx:7-13 renders <meta name="referrer" content="no-referrer">; the API
		// request really carried none.
		expect(
			await page.evaluate(() => document.querySelector('meta[name="referrer"]')?.getAttribute('content') ?? null),
			'the page did not render the no-referrer meta'
		).toBe('no-referrer');
		const apiCalls = watched.requests.filter((call) => call.origin === MOCK_API_ORIGIN);
		expect(
			apiCalls
				.filter((call) => call.referer !== null)
				.map((call) => `${call.method} ${call.path} ${call.referer}`),
			'an API request carried a Referer'
		).toEqual([]);
		const stored = await page.evaluate(() => ({
			localStorage: Object.keys(window.localStorage).map(
				(key) => `${key}=${window.localStorage.getItem(key) ?? ''}`
			),
			sessionStorage: Object.keys(window.sessionStorage).map(
				(key) => `${key}=${window.sessionStorage.getItem(key) ?? ''}`
			)
		}));
		expect(
			stored.localStorage.filter((entry) => entry.includes(SHARED_TOKEN)),
			'localStorage held the link token'
		).toEqual([]);
		expect(
			stored.sessionStorage.filter((entry) => entry.includes(SHARED_TOKEN)),
			'sessionStorage held the link token'
		).toEqual([]);
		expect(stub.countOf(SHARED_READ_PATH), 'the public read was not sent with its token in the path').toBe(1);

		// The same link in its locale-prefixed form — `isSharedReportPath` accepts it (`shared-report-path.ts:16,19-21`)
		// and the app server answers it with a `307` to `/shared-report`, which is a hop a token could ride on. It does
		// not: the browser asks the app server for `/en/shared-report` (no fragment in the request), the `Location`
		// header is the bare `/shared-report`, and the person still ends on `#token=…`, which only the browser holds.
		const localized = await visitFresh(page, `/en${SHARED_PATH}#token=${SHARED_TOKEN}`, {
			signedIn: true,
			fixture,
			via: null
		});
		await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toBeVisible({
			timeout: 25_000
		});
		const documentChain = localized.documents.map(
			(document) => `${document.status} ${new URL(document.url).pathname}`
		);
		expect(documentChain, 'the locale-prefixed link reached the app server some other way').toEqual([
			'307 /en/shared-report',
			'200 /shared-report'
		]);
		expect(page.url(), 'the person did not end on the token-carrying fragment').toBe(
			`${APP_ORIGIN}${SHARED_PATH}#token=${SHARED_TOKEN}`
		);
		expect(
			localized.requests.filter((call) => call.origin === APP_ORIGIN && call.url.includes(SHARED_TOKEN)),
			'the redirect hop or the localized page request carried the token to the app server'
		).toEqual([]);
		expect(
			localized.documents.filter((document) => document.url.includes(SHARED_TOKEN)),
			'a navigation of the localized link carried the token'
		).toEqual([]);
		expect(localized.countOf(SHARED_READ_PATH), 'the redirect made the link read more than once').toBe(1);
		await stub.uninstall();

		report('9 where the token travelled', {
			carrying: carrying.map((call) => `${call.method} ${call.url}`),
			appRequestsWithoutToken: watched.requests.filter((call) => call.origin === APP_ORIGIN).length,
			referers: watched.requests.filter((call) => call.origin === MOCK_API_ORIGIN).map((call) => call.referer),
			storageKeysWithToken: [...stored.localStorage, ...stored.sessionStorage].filter((entry) =>
				entry.includes(SHARED_TOKEN)
			),
			shapes: watched.shapes(),
			localizedLink: {
				documentChain,
				finalUrl: page.url(),
				reads: localized.countOf(SHARED_READ_PATH),
				appRequestsCarryingToken: localized.requests.filter(
					(call) => call.origin === APP_ORIGIN && call.url.includes(SHARED_TOKEN)
				).length
			}
		});
	});

	// --------------------------------- 10. a second link pasted into the same tab

	test('10 · a second link in the same tab reads its own token, and a link that stopped working hides the report read before it', async ({
		page
	}) => {
		await mockReset();
		const stub = await stubMockRoutes(page, {
			[`GET ${SHARED_READ_PATH}`]: [{ status: 200, body: sharedReport() }],
			[`GET /api/public/saved-reports/${SHARED_TOKEN_SECOND}`]: [refusal(404, 'This report link does not work.')]
		});
		const watched = await visitFresh(page, `${SHARED_PATH}#token=${SHARED_TOKEN}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toBeVisible({
			timeout: 25_000
		});
		const firstReads = stub.countOf(SHARED_READ_PATH);

		// useSharedReportToken follows `hashchange` (use-shared-report-token.ts:6-9, :25-27): the fragment is rewritten
		// in the same document, so this is not a navigation and no app server sees anything.
		await page.evaluate((token) => {
			window.location.hash = `#token=${token}`;
		}, SHARED_TOKEN_SECOND);
		await expect(page.getByText(NOT_WORKING_TITLE, { exact: true })).toBeVisible({ timeout: 25_000 });
		await expect(page.getByRole('heading', { level: 1, name: 'Client A, last month' })).toHaveCount(0);

		const secondPath = `/api/public/saved-reports/${SHARED_TOKEN_SECOND}`;
		expect(stub.countOf(secondPath), 'the new fragment was not read as its own token').toBe(1);
		expect(
			stub.calls.map((call) => `${call.method} ${call.path}`),
			'the page read something other than the two tokens'
		).toEqual([`GET ${SHARED_READ_PATH}`, `GET ${secondPath}`]);
		expect(
			watched.api().every((call) => call.referer === null),
			'a same-document read carried a Referer'
		).toBe(true);
		await stub.uninstall();

		report('10 a second link in the same tab', {
			firstReads,
			secondReads: stub.countOf(secondPath),
			finalUrl: page.url(),
			shown: flat(await page.locator('body').innerText()).slice(0, 200)
		});
	});

	// --------------------------------- 11. /embed/authorize refuses to be framed

	test('11 · /embed/authorize is served with X-Frame-Options DENY and CSP frame-ancestors none, and the browser refuses to frame it', async ({
		page,
		shield
	}) => {
		const paths = [EMBED_PATH, '/en/embed/authorize', `${EMBED_PATH}/`, SHARED_PATH];
		const headers: Record<string, Record<string, string | null>> = {};
		for (const path of paths) {
			const response = await page.goto(`${APP_ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
			const given = response ? response.headers() : {};
			headers[path] = {
				status: String(response?.status() ?? 0),
				xFrameOptions: given['x-frame-options'] ?? null,
				csp: given['content-security-policy'] ?? null,
				robotsTag: given['x-robots-tag'] ?? null
			};
		}
		// next.config.js:129-138 sends neverFramedHeaders for /embed/authorize and /:locale/embed/authorize.
		expect(headers[EMBED_PATH], 'the consent page was not framed-out').toEqual({
			status: '200',
			xFrameOptions: 'DENY',
			csp: "frame-ancestors 'none'",
			robotsTag: 'noindex, nofollow'
		});
		expect(headers['/en/embed/authorize'], 'the locale-prefixed consent page was not framed-out').toEqual(
			headers[EMBED_PATH]
		);
		expect(headers[`${EMBED_PATH}/`], 'the trailing-slash form is served without the same headers').toEqual(
			headers[EMBED_PATH]
		);
		// The shared-report page is in neither list: `NEVER_FRAMED_PATHS` holds only `/embed/authorize`
		// (`core/lib/helpers/frame-ancestors.ts:8,30-32`) and every other page gets `frame-ancestors 'self'` plus what
		// FRAME_ANCESTORS names, written by the middleware (`proxy.ts:144` → `setFramingPolicy`,
		// `frame-ancestors.ts:33-34`). X-Frame-Options comes only from next.config.js, so it is absent here.
		expect(headers[SHARED_PATH].xFrameOptions, 'the shared-report page was given X-Frame-Options').toBe(null);
		expect(headers[SHARED_PATH].csp, 'the shared-report page CSP is not the measured one').toBe(
			"frame-ancestors 'self'"
		);

		// And the refusal is real: an iframe of the consent page renders no document. The control is the same frame
		// aimed at `/shared-report`, which this app frames freely (`frame-ancestors 'self'`): if the harness works there
		// and shows nothing here, the difference is the header, not the test.
		await page.goto(`${APP_ORIGIN}${INTERSTITIAL_FOR_EMBED}`, { waitUntil: 'domcontentloaded' });
		const consentFrame = await frameOf(page, authorizeAddress(authorizeQuery(SITE_A, 'organizationA')), 5_000);
		await page.goto(`${APP_ORIGIN}${INTERSTITIAL_FOR_EMBED}`, { waitUntil: 'domcontentloaded' });
		const sharedFrame = await frameOf(page, `${APP_ORIGIN}${SHARED_PATH}`, 15_000);

		// Chrome fires the frame's own `load` for the empty document it hands a blocked frame, so the proof is what the
		// frame holds after the page inside it had its chance to render: the consent frame holds nothing of this app for
		// the whole window (`body` null, `waitedMs` the full 5 s), the control frame — the same harness aimed at
		// `/shared-report`, which this app does allow to be framed — renders its own text. Which empty document Chrome
		// gives a refused frame is Chrome's own business and was not the same in every run of this file (`about:blank`,
		// or a document the parent may not look into at all), so the pin is "no document of this app got in there", not
		// one internal shape; the shape measured here is in the MEASURE line below.
		expect(consentFrame.body, `the consent page rendered inside a frame (${consentFrame.innerUrl})`).toBe(null);
		expect(consentFrame.innerUrl, 'the blocked frame was given this app as its document').not.toBe(
			`${APP_ORIGIN}${EMBED_PATH}`
		);
		expect(sharedFrame.body, `the control frame rendered nothing (${sharedFrame.innerUrl})`).toContain(
			READ_ONLY_BADGE
		);

		report('11 framing refused', {
			headers,
			consentFrame,
			sharedReportFrame: sharedFrame,
			browserRefusals: shield.logMatching(/frame/i).map((line) => line.slice(0, 200)),
			consoleErrors: shield.consoleErrors().slice(0, 4)
		});
	});

	// --------------------------------- 12. a query that is not a valid request

	test('12 · a missing or malformed origin, organization or state says the link is not valid, asks nothing and offers nothing to click', async ({
		page,
		mock
	}) => {
		const cases: Array<{ label: string; query: string }> = [
			{ label: 'no origin', query: `organization=organizationA&state=${SITE_STATE}` },
			{ label: 'empty origin', query: authorizeQuery('', 'organizationA') },
			{ label: 'origin with a path', query: authorizeQuery(`${SITE_A}/portal`, 'organizationA') },
			{ label: 'origin with a trailing slash', query: authorizeQuery(`${SITE_A}/`, 'organizationA') },
			{ label: 'origin with a query', query: authorizeQuery(`${SITE_A}?x=1`, 'organizationA') },
			{ label: 'origin with a fragment', query: authorizeQuery(`${SITE_A}#h`, 'organizationA') },
			{ label: 'origin javascript:', query: authorizeQuery('javascript:alert(1)', 'organizationA') },
			{ label: 'origin https:host', query: authorizeQuery('https:site.example', 'organizationA') },
			{ label: 'origin with a wildcard', query: authorizeQuery('https://*.site.example', 'organizationA') },
			{
				label: 'origin with an upper-case scheme',
				query: authorizeQuery('HTTP://127.0.0.1:4111', 'organizationA')
			},
			{ label: 'no organization', query: `origin=${encodeURIComponent(SITE_A)}&state=${SITE_STATE}` },
			{ label: 'empty organization', query: authorizeQuery(SITE_A, '') },
			{ label: 'organization of spaces only', query: authorizeQuery(SITE_A, '%20%20') },
			{ label: 'no state', query: `origin=${encodeURIComponent(SITE_A)}&organization=organizationA` },
			{
				label: 'state shorter than 16',
				query: `origin=${encodeURIComponent(SITE_A)}&organization=organizationA&state=abc123`
			},
			{
				label: 'state longer than 128',
				query: `origin=${encodeURIComponent(SITE_A)}&organization=organizationA&state=${'a'.repeat(129)}`
			},
			{
				label: 'state with a dot',
				query: `origin=${encodeURIComponent(SITE_A)}&organization=organizationA&state=0123456789abcde.`
			},
			{ label: 'valid link, in its own tab', query: authorizeQuery(SITE_A, 'organizationA') }
		];

		const shown: Array<{ label: string; title: string }> = [];
		let last = watchPage(page);
		for (const one of cases) {
			await mockReset();
			// Every variant is its own address, so the goto below is its own navigation: no interstitial needed.
			const watched = await visitFresh(page, `${EMBED_PATH}?${one.query}`, { via: null });
			last = watched;
			const invalid = one.label !== 'valid link, in its own tab';
			const title = invalid ? EMBED_INVALID_TITLE : EMBED_NO_OPENER_TITLE;
			await expect(
				page.getByRole('heading', { level: 1, name: title }),
				`${one.label}: ${invalid ? 'no refusal' : 'the page acted as if framed'}`
			).toBeVisible({
				timeout: 25_000
			});
			await expect(page.getByRole('button', { name: EMBED_ALLOW })).toHaveCount(0);
			await expect(page.getByRole('button', { name: EMBED_SIGN_IN })).toHaveCount(0);
			if (invalid) {
				await expect(
					page.getByText(EMBED_INVALID_TEXT, { exact: true }),
					`${one.label}: no explanation`
				).toBeVisible();
			}
			// embed-authorize.ts:52-63 rejects these before any read; :69-79 finds no opener.
			expect(watched.api(), `${one.label}: the page asked the API anyway`).toEqual([]);
			expect(await mock.requests(), `${one.label}: the mock was asked anyway`).toEqual([]);
			shown.push({ label: one.label, title: flat(await page.getByRole('heading', { level: 1 }).innerText()) });
		}

		report('12 invalid links', {
			shown,
			lastUrl: page.url(),
			consoleErrors: consoleFindings(last.consoleErrors),
			consoleNoiseExcluded: shellStoreNoiseOf(last.consoleErrors)
		});
	});

	// --------------------------------- 13. opened in its own tab

	test('13 · opened in its own tab (no opener) the page says where it works, and shows no Allow and no Sign in', async ({
		page
	}) => {
		const watched = await visitFresh(page, `${EMBED_PATH}?${authorizeQuery(SITE_A, 'organizationA')}`, {
			via: null
		});
		await expect(page.getByRole('heading', { level: 1, name: EMBED_NO_OPENER_TITLE })).toBeVisible({
			timeout: 25_000
		});
		await expect(page.getByText(EMBED_NO_OPENER_TEXT, { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: EMBED_ALLOW })).toHaveCount(0);
		await expect(page.getByRole('button', { name: EMBED_CANCEL })).toHaveCount(0);
		await expect(page.getByRole('button', { name: EMBED_SIGN_IN })).toHaveCount(0);
		expect(watched.api(), 'a page with nobody to answer asked the API').toEqual([]);

		report('13 no opener', {
			url: page.url(),
			shown: flat(await page.locator('body').innerText()),
			browserRequests: watched.shapes()
		});
	});

	// --------------------------------- 14. signed out, opened by the site

	test('14 · signed out in the popup: Sign in first, and the page leaves its own address for that sign-in', async ({
		page,
		fixture
	}) => {
		await mockReset();
		const context = page.context();
		await context.clearCookies();
		const site = await openSitePage(context);
		const popup = await openConsent(context, site, authorizeQuery(SITE_A, fixture.ids.organizationA));
		const watched = watchPage(popup);

		await expect(popup.getByRole('heading', { level: 1, name: EMBED_SIGN_IN_TITLE })).toBeVisible({
			timeout: 25_000
		});
		await expect(popup.getByText(EMBED_SIGN_IN_TEXT, { exact: true })).toBeVisible();
		await expect(popup.getByRole('button', { name: EMBED_ALLOW })).toHaveCount(0);
		expect(await site.messages(), 'a signed-out page told the site something').toEqual([]);
		expect(watched.api(), 'the signed-out page read the person or the organizations').toEqual([]);

		await popup.getByRole('button', { name: EMBED_SIGN_IN, exact: true }).click();
		await expect(popup).toHaveURL(/\/auth\/passcode/, { timeout: 25_000 });
		// embed-authorize-page.tsx:108-111: setPathAfterSlowSignIn(currentPageOf(window)) — this page, query included
		// (embed-authorize.ts:108-110) — then location.assign(DEFAULT_APP_PATH) (constants.tsx:98-101).
		const entry = await popup.evaluate((key) => window.sessionStorage.getItem(key), PATH_AFTER_SIGN_IN_KEY);
		expect(JSON.parse(entry ?? '{}'), 'the hand-off left for the sign-in is not the measured one').toEqual({
			path: `/embed/authorize?${authorizeQuery(SITE_A, fixture.ids.organizationA)}`,
			setAt: expect.any(Number),
			waitMs: 30 * 60 * 1000
		});
		expect(await site.messages(), 'signing off still answered the site').toEqual([]);
		expect(watched.api(), 'the sign-in hand-off asked the API').toEqual([]);

		report('14 signed out in the popup', {
			shownBefore: flat(await popup.locator('body').innerText()).slice(0, 200),
			afterClickUrl: popup.url(),
			handOff: entry,
			messagesToSite: await site.messages()
		});
		await popup.close();
	});

	// --------------------------------- 15. signed in: the consent card

	test('15 · signed in and a member: the site, the organization, the account, what the site may do, Allow and Cancel', async ({
		page,
		fixture
	}) => {
		await mockReset();
		const context = page.context();
		const stub = await stubMockRoutes(context, {
			'GET /api/user-organization': [
				{
					status: 200,
					body: membershipsOf([{ id: fixture.ids.organizationA, name: fixture.names.organizationA }])
				}
			]
		});
		await signInWithFixture(context, fixture, 'A');
		const site = await openSitePage(context);
		const popup = await openConsent(context, site, authorizeQuery(SITE_A, fixture.ids.organizationA));
		const watched = watchPage(popup);

		await expect(popup.getByRole('heading', { level: 1, name: EMBED_TITLE })).toBeVisible({ timeout: 25_000 });
		await expect(popup.getByText(EMBED_DESCRIPTION, { exact: true })).toBeVisible();
		await expect(popup.getByText(EMBED_PERMISSION, { exact: true })).toBeVisible();
		// SiteFacts (embed-authorize-page.tsx:91-103) is a definition list of the site and the organization.
		const facts = popup.locator('dl');
		await expect(facts.locator('dt').nth(0)).toHaveText(EMBED_SITE_LABEL);
		await expect(facts.locator('dd').nth(0)).toContainText(SITE_A);
		await expect(facts.locator('dt').nth(1)).toHaveText(EMBED_ORGANIZATION_LABEL);
		await expect(facts.locator('dd').nth(1)).toContainText(fixture.names.organizationA);
		await expect(popup.getByText(EMBED_SIGNED_IN_AS, { exact: true })).toBeVisible();
		await expect(popup.getByText(fixture.names.user, { exact: true })).toBeVisible();
		await expect(popup.getByRole('button', { name: EMBED_ALLOW, exact: true })).toBeVisible();
		await expect(popup.getByRole('button', { name: EMBED_CANCEL, exact: true })).toBeVisible();
		await expect(popup.getByRole('button', { name: EMBED_NOT_YOU, exact: true })).toBeVisible();
		expect(await site.messages(), 'the site was answered before the person chose').toEqual([]);
		// Which of the two reads lands first is TanStack's business; the set is what is pinned. The person read is the
		// layout's (jitsu-root.tsx:24 useUserQuery), the memberships read is the card's
		// (core/hooks/organizations/teams/use-team-menu-organizations.ts:29-30).
		const asked = [...new Set(watched.api().map((call) => `${call.method} ${call.path}`))].sort();
		expect(asked, 'the consent card asked for something other than the memberships and the person').toEqual([
			'GET /api/user-organization',
			'GET /api/user/me'
		]);
		expect(stub.countOf('/api/embed/authorize'), 'the card asked to allow the site before the person clicked').toBe(
			0
		);
		await stub.uninstall();

		report('15 the consent card', {
			shown: flat(await popup.locator('body').innerText()),
			browserRequests: watched.api().map((call) => `${call.method} ${call.path}${call.query}`),
			authorizationOnReads: watched.api().map((call) => call.authorization !== null),
			consoleErrors: consoleFindings(watched.consoleErrors),
			consoleNoiseExcluded: shellStoreNoiseOf(watched.consoleErrors)
		});
		await popup.close();
	});

	// --------------------------------- 16. Allow: what is sent and what the site is handed

	test('16 · Allow: one POST of origin and organization, and the tokens to the site origin alone', async ({
		page,
		fixture
	}) => {
		await mockReset();
		const context = page.context();
		const stub = await stubMockRoutes(context, {
			'GET /api/user-organization': [
				{
					status: 200,
					body: membershipsOf([{ id: fixture.ids.organizationA, name: fixture.names.organizationA }])
				}
			],
			'POST /api/embed/authorize': [{ status: 200, body: SITE_TOKENS }]
		});
		await signInWithFixture(context, fixture, 'A');
		const site = await openSitePage(context);
		// Both secrets the site is handed: the access token and the longer-lived renewal token.
		const secrets = [SITE_TOKENS.token, SITE_TOKENS.renewalToken];
		const atClose = await recordConsentWindowAtClose(context, secrets);
		// Every request any page of this context sends from here on, whatever its origin: `stub.calls` holds only the
		// stubbed mock paths, so a token appended to some other address would not be in it.
		const requestUrls: string[] = [];
		context.on('request', (request) => requestUrls.push(request.url()));
		const popup = await openConsent(context, site, authorizeQuery(SITE_A, fixture.ids.organizationA));
		await expect(popup.getByRole('button', { name: EMBED_ALLOW, exact: true })).toBeVisible({ timeout: 25_000 });

		await popup.getByRole('button', { name: EMBED_ALLOW, exact: true }).click();

		// embed-authorize-page.tsx:184-201 → useAuthorizeEmbedSite (core/hooks/embeds/use-authorize-embed-site.ts:13-18)
		// → embedsService.authorizeSite (embeds.service.ts:169-172), whose 4th argument false keeps `tenantId` out of
		// the body (api.service.ts:630-661).
		await expect.poll(() => stub.countOf('/api/embed/authorize'), { timeout: 15_000 }).toBe(1);
		expect(stub.shapes('/api/embed/authorize'), 'the request Allow sent is not the measured one').toEqual([
			[
				'POST',
				'/api/embed/authorize',
				JSON.stringify({ organizationId: fixture.ids.organizationA, origin: SITE_A })
			]
		]);
		const authorizeCall = stub.calls.find((call) => call.path === '/api/embed/authorize');
		expect(authorizeCall?.query, 'the authorize request carried a query').toBe('');
		// Unlike the shared-report page, the consent page sets no `referrer` policy, so its cross-origin request carries
		// the browser's default (`strict-origin-when-cross-origin`): the app origin alone. The consent address — with
		// the site's origin and the one-time state in its query — is not sent.
		expect(authorizeCall?.referer, 'the authorize request Referer is not the measured one').toBe(`${APP_ORIGIN}/`);
		expect(authorizeCall?.referer?.includes(SITE_STATE), 'the state leaked into the Referer').toBe(false);
		expect(authorizeCall?.authorization === null, 'the authorize request was sent without the person session').toBe(
			false
		);

		// handTokensToSite (core/lib/utils/embed-authorize.ts:85-87): one message, aimed at SITE_A, repeating the state.
		await expect.poll(site.messages, { timeout: 15_000 }).toHaveLength(1);
		const [message] = await site.messages();
		// `MessageEvent.origin` at the site is the origin of the window that *sent* it — the consent window, this app —
		// and `event.source` is that window; test 18 is where the target origin itself is proved.
		expect(message.origin, 'the message did not arrive from the consent window').toBe(APP_ORIGIN);
		expect(message.data, 'the message the site was handed is not the measured one').toEqual({
			type: 'ever-teams:embed-authorized',
			state: SITE_STATE,
			...SITE_TOKENS
		});

		// The window closes (embed-authorize-page.tsx:197 closeWindow), and the tokens are not left on the page. What
		// the window held is read at the moment it closes itself: read after the close, as this test first did, every
		// page read could only return its `.catch` fallback, so none of these checks could fail.
		await expect.poll(() => popup.isClosed(), { timeout: 15_000 }).toBe(true);
		expect(atClose, 'the consent window closed without calling window.close()').toHaveLength(1);
		const [closing] = atClose;
		expect(closing.secretsInText, 'the popup kept a token it had just handed over').toEqual([]);
		expect(
			secrets.filter((secret) => closing.href.includes(secret)),
			'a token reached the address'
		).toEqual([]);
		expect(
			requestUrls.filter((url) => secrets.some((secret) => url.includes(secret))),
			'a request URL carried a site token'
		).toEqual([]);
		expect(requestUrls.length, 'no request was recorded, so the URL check above saw nothing').toBeGreaterThan(0);
		expect(closing.storageKeysHoldingSecret, 'the page stored a site token in web storage').toEqual([]);
		expect(
			closing.storageKeys.filter((key) => key.includes('embed')),
			'the page stored something under an embed key'
		).toEqual([]);

		report('16 Allow', {
			authorizeRequest: stub.calls
				.filter((call) => call.path === '/api/embed/authorize')
				.map((call) => ({
					method: call.method,
					path: call.path,
					body: call.body,
					referer: call.referer,
					authorization: call.authorization !== null
				})),
			messageToSite: message,
			popupClosed: popup.isClosed(),
			messagesTotal: (await site.messages()).length
		});
	});

	// --------------------------------- 17. Cancel

	test('17 · Cancel: the site is told "denied" with the state and nothing else, and no request is made', async ({
		page,
		fixture
	}) => {
		await mockReset();
		const context = page.context();
		const stub = await stubMockRoutes(context, {
			'GET /api/user-organization': [
				{
					status: 200,
					body: membershipsOf([{ id: fixture.ids.organizationA, name: fixture.names.organizationA }])
				}
			]
		});
		await signInWithFixture(context, fixture, 'A');
		const site = await openSitePage(context);
		const popup = await openConsent(context, site, authorizeQuery(SITE_A, fixture.ids.organizationA));
		await expect(popup.getByRole('button', { name: EMBED_CANCEL, exact: true })).toBeVisible({ timeout: 25_000 });

		await popup.getByRole('button', { name: EMBED_CANCEL, exact: true }).click();

		await expect.poll(site.messages, { timeout: 15_000 }).toHaveLength(1);
		const [message] = await site.messages();
		// tellSiteDenied (embed-authorize.ts:90-92), called before the outcome and the close (embed-authorize-page.tsx:160-164)
		expect(message.data, 'the denial handed to the site is not the measured one').toEqual({
			type: 'ever-teams:embed-denied',
			state: SITE_STATE
		});
		expect(stub.countOf('/api/embed/authorize'), 'Cancel asked the API to allow the site').toBe(0);
		await expect.poll(() => popup.isClosed(), { timeout: 15_000 }).toBe(true);

		report('17 Cancel', {
			messageToSite: message,
			authorizeRequests: stub.countOf('/api/embed/authorize'),
			popupClosed: popup.isClosed()
		});
	});

	// --------------------------------- 18. the message goes only to the origin the address names

	test('18 · the message goes to the origin the address names and to no other window: opened by SITE_A with the address asking SITE_B, nothing arrives', async ({
		page,
		fixture
	}) => {
		await mockReset();
		const context = page.context();
		const stub = await stubMockRoutes(context, {
			'GET /api/user-organization': [
				{
					status: 200,
					body: membershipsOf([{ id: fixture.ids.organizationA, name: fixture.names.organizationA }])
				}
			],
			'POST /api/embed/authorize': [{ status: 200, body: SITE_TOKENS }]
		});
		await signInWithFixture(context, fixture, 'A');
		const site = await openSitePage(context);
		// The window is opened by SITE_A while the address names SITE_B: handTokensToSite aims the message at SITE_B,
		// so the browser must drop it (embed-authorize.ts:82-87 says so; a '*' target would have delivered it here).
		const popup = await openConsent(context, site, authorizeQuery(SITE_B, fixture.ids.organizationA));
		await expect(popup.getByRole('button', { name: EMBED_ALLOW, exact: true })).toBeVisible({ timeout: 25_000 });
		await expect(popup.getByText(SITE_B, { exact: true })).toBeVisible();

		await popup.getByRole('button', { name: EMBED_ALLOW, exact: true }).click();
		await expect.poll(() => stub.countOf('/api/embed/authorize'), { timeout: 15_000 }).toBe(1);
		await expect.poll(() => popup.isClosed(), { timeout: 15_000 }).toBe(true);
		// Given the site a chance to hear: it never does.
		await expect.poll(site.messages, { timeout: 6_000 }).toHaveLength(0);

		report('18 mismatched origins', {
			openerOrigin: SITE_A,
			addressAsked: SITE_B,
			authorizeRequest: stub.shapes('/api/embed/authorize'),
			messagesAtTheOpener: await site.messages()
		});
	});

	// --------------------------------- 19. refusals of the authorize request

	test('19 · a refused Allow: the sentence the page has for each refusal, nothing posted, and the window stays open', async ({
		page,
		fixture
	}) => {
		const cases: Array<{ label: string; answer: StubAnswer; sentence: string }> = [
			{
				label: '403 EMBED_ORIGIN_NOT_ALLOWED',
				answer: refusal(403, 'This site is not allowed.', { code: 'EMBED_ORIGIN_NOT_ALLOWED' }),
				sentence: EMBED_REFUSED_SITE
			},
			{
				label: '403 EMBED_SITE_SIGN_IN_OFF',
				answer: refusal(403, 'Sign-in from this site is off.', { code: 'EMBED_SITE_SIGN_IN_OFF' }),
				sentence: EMBED_REFUSED_SIGN_IN_OFF
			},
			{
				label: '403 EMBED_MEMBER_NOT_ALLOWED',
				answer: refusal(403, 'No tracking here.', { code: 'EMBED_MEMBER_NOT_ALLOWED' }),
				sentence: EMBED_REFUSED_MEMBER
			},
			{ label: '404 without the route', answer: refusal(404, 'Not Found'), sentence: EMBED_REFUSED_UNAVAILABLE },
			{ label: '400', answer: refusal(400, 'Bad request'), sentence: EMBED_REFUSED_FAILED },
			{ label: '500', answer: refusal(500, 'Server error'), sentence: EMBED_REFUSED_FAILED },
			{ label: 'dropped', answer: { abort: true }, sentence: EMBED_REFUSED_FAILED }
		];

		for (const one of cases) {
			await mockReset();
			const context = page.context();
			const stub = await stubMockRoutes(context, {
				'GET /api/user-organization': [
					{
						status: 200,
						body: membershipsOf([{ id: fixture.ids.organizationA, name: fixture.names.organizationA }])
					}
				],
				'POST /api/embed/authorize': [one.answer]
			});
			await signInWithFixture(context, fixture, 'A');
			const site = await openSitePage(context);
			const popup = await openConsent(context, site, authorizeQuery(SITE_A, fixture.ids.organizationA));
			await expect(popup.getByRole('button', { name: EMBED_ALLOW, exact: true })).toBeVisible({
				timeout: 25_000
			});

			await popup.getByRole('button', { name: EMBED_ALLOW, exact: true }).click();
			// The refusal is a Notice (embed-authorize-page.tsx:228), which renders an <output>, not a role="alert"
			// (core/components/common/notice.tsx:40-51) — the unit test's getByRole('alert') is its own mock
			// (embed-authorize-page.test.tsx:56-58), so this file pins the text instead.
			await expect(
				popup.getByText(one.sentence, { exact: true }),
				`${one.label}: the wrong sentence`
			).toBeVisible({
				timeout: 20_000
			});
			await expect(popup.getByRole('button', { name: EMBED_ALLOW, exact: true })).toBeEnabled();
			await expect(popup.getByRole('button', { name: EMBED_CANCEL, exact: true })).toBeEnabled();
			expect(await site.messages(), `${one.label}: the site was answered anyway`).toEqual([]);
			expect(popup.isClosed(), `${one.label}: the window closed on a refusal`).toBe(false);
			expect(
				stub.countOf('/api/embed/authorize'),
				`${one.label}: the allow request was sent more than once`
			).toBe(1);
			await stub.uninstall();
			report(`19 ${one.label}`, {
				sentence: one.sentence,
				posted: await site.messages(),
				authorizeRequest: stub.shapes('/api/embed/authorize'),
				popupClosed: popup.isClosed()
			});
			await popup.close();
		}
	});

	// --------------------------------- 20. an organization the person is not a member of

	test('20 · an organization the person is not a member of: no Allow, only Cancel and Not you — and what the mock alone answers', async ({
		page,
		fixture,
		mock
	}) => {
		await mockReset();
		const context = page.context();
		const stub = await stubMockRoutes(context, {
			'GET /api/user-organization': [
				{
					status: 200,
					body: membershipsOf([{ id: fixture.ids.organizationA, name: fixture.names.organizationA }])
				}
			]
		});
		await signInWithFixture(context, fixture, 'A');
		const site = await openSitePage(context);
		const popup = await openConsent(context, site, authorizeQuery(SITE_A, fixture.ids.organizationB));
		await expect(popup.getByRole('heading', { level: 1, name: EMBED_NOT_MEMBER_TITLE })).toBeVisible({
			timeout: 25_000
		});
		await expect(popup.getByText(EMBED_NOT_MEMBER_TEXT, { exact: true })).toBeVisible();
		await expect(popup.getByRole('button', { name: EMBED_ALLOW })).toHaveCount(0);
		await expect(popup.getByRole('button', { name: EMBED_CANCEL, exact: true })).toBeVisible();
		await expect(popup.getByRole('button', { name: EMBED_NOT_YOU, exact: true })).toBeVisible();
		expect(stub.countOf('/api/embed/authorize'), 'a card with no Allow asked the API').toBe(0);
		expect(await site.messages(), 'the site was answered before the person chose').toEqual([]);
		await popup.close();

		// The mock alone answers /api/user-organization with `pagination([])` (mock-gauzy-server.mjs:895), so the
		// person has no memberships at all and even their own organization reads as one they do not belong to.
		await mockReset();
		await stub.uninstall();
		const bare = await openConsent(context, site, authorizeQuery(SITE_A, fixture.ids.organizationA));
		await expect(bare.getByRole('heading', { level: 1, name: EMBED_NOT_MEMBER_TITLE })).toBeVisible({
			timeout: 25_000
		});
		const mockAlone = (await mock.requests()).map((call) => `${call.method} ${call.path}`);
		expect(
			mockAlone.filter((shape) => shape === 'GET /api/user-organization'),
			'the mock was not asked for the memberships'
		).toEqual(['GET /api/user-organization']);
		report('20 not a member', {
			stubbedCard: EMBED_NOT_MEMBER_TITLE,
			mockAloneCard: flat(await bare.getByRole('heading', { level: 1 }).innerText()),
			mockLog: await mock.requests(),
			organizationAsked: fixture.ids.organizationB
		});
		await bare.close();
	});

	// --------------------------------- 21. what the mock itself answers an Allow with

	test('21 · the mock echoes the authorize body back: the token validation fails and the page says the site could not be allowed', async ({
		page,
		fixture,
		mock
	}) => {
		await mockReset();
		const context = page.context();
		const membershipsStub = await stubMockRoutes(context, {
			'GET /api/user-organization': [
				{
					status: 200,
					body: membershipsOf([{ id: fixture.ids.organizationA, name: fixture.names.organizationA }])
				}
			]
		});
		await signInWithFixture(context, fixture, 'A');
		const site = await openSitePage(context);
		const popup = await openConsent(context, site, authorizeQuery(SITE_A, fixture.ids.organizationA));
		await expect(popup.getByRole('button', { name: EMBED_ALLOW, exact: true })).toBeVisible({ timeout: 25_000 });
		await membershipsStub.uninstall();
		// Nothing answers POST /api/embed/authorize: the mock answers with the body it was sent (:894).
		await popup.getByRole('button', { name: EMBED_ALLOW, exact: true }).click();
		await expect(popup.getByText(EMBED_REFUSED_FAILED, { exact: true })).toBeVisible({ timeout: 20_000 });
		expect(await site.messages(), 'the site got tokens the mock never gave').toEqual([]);
		const mockLog = (await mock.requests()).map((call) => `${call.method} ${call.path}`);
		expect(
			mockLog.filter((shape) => shape === 'POST /api/embed/authorize'),
			'the mock did not log the authorize call'
		).toEqual(['POST /api/embed/authorize']);
		// The memberships were answered by this file before the click, so the mock never saw that read at all.
		expect(
			membershipsStub.countOf('/api/user-organization'),
			'the consent card did not read the memberships this file answered'
		).toBeGreaterThanOrEqual(1);
		expect(mockLog.includes('GET /api/user-organization'), 'the mock answered the memberships').toBe(false);
		report('21 the mock answers Allow', {
			sentence: EMBED_REFUSED_FAILED,
			mockLog: (await mock.requests()).map((call) => `${call.method} ${call.path} ${call.status}`),
			posted: await site.messages()
		});
		await popup.close();
	});
});
