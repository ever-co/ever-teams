import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type BootstrapFixture, type Page, type Shield, type StubRequest } from '../../fixtures';
import { APP_ORIGIN, mockRequestsWhen, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What the page GitHub sends a person back to actually does in a browser: **`/integration/github?installation_id=…&setup_action=…`**
 * (`app/[locale]/(main)/integration/github/page.tsx:5-7` → `core/components/pages/integration/github/page-component.tsx`),
 * on lane-b (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, platform `3997`, control `3998`,
 * `playwright/test-servers.ts:39`).
 *
 * ## Safety first — what this file may and may not touch
 *
 * This is the URL GitHub itself redirects a person to after installing the app, so nothing here may leave the machine:
 * every case records **every origin the browser called** (`page.on('request')`, `recordRequests` below) and ends by
 * asserting that set is exactly this lane's app origin and its mock. The lane shield (`playwright/fixtures.ts:110-112`,
 * `:122-125`) aborts anything else and fails the test even when every `expect` passed. The installation id used
 * everywhere is this file's own made-up `12345678`; no real installation id, no GitHub host, no third-party origin.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's app and its mock. The mock answers `GET /api/integration/types` with `[]`
 * (`cypress/support/mock-gauzy-server.mjs:880`) and has **no** handler for `/api/integration-tenant`,
 * `/api/integration/github/**` or the install POST, so those arrive as its catch-all: a GET answers
 * `{items:[],total:0}` (`:895`) and a write echoes its own body (`:894`). Armed refusals go through the mock's own
 * `fails` switch (`playwright/helpers.ts:100-107`), which answers Gauzy's `{statusCode, message: 'Synthetic Gauzy
 * refusal (…)'}` (`mock-gauzy-server.mjs:1158-1168`) and records the call with that status (`:1191-1198`) — so a
 * refusal this file arms is provable from the mock's own request log.
 *
 * **Served by this file** (`page.route` on the mock origin, the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:228-360`): the integration types list with an `All Integrations` row,
 * the tenant's GitHub integration row, and the repositories answer — the three reads the mock cannot answer with data,
 * and therefore the only way to reach the page's tenant → repositories branch at all. Each served answer restates the
 * mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`); the page sits on
 * `localhost:3032` and the API on `127.0.0.1:3996`. `route.fetch()` is never called in a stub this file wants to prove
 * was used, so the mock's own log stays empty for a served path — which is the witness that the page acted on this
 * file's answer.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/pages/integration/github/page-component.tsx`: `installation_id`/`setup_action` from
 *   `useSearchParams()` `:15-16`; `canInstall` `:33-35` (`!installing.current && !installationCompleted &&
 *   installation_id && setup_action`); `handleInstallGitHub` `:40-58` — `installing.current = true`, then `setTimeout(…, 100)`,
 *   then `installGitHub(installation_id, setup_action)`; on success `setInstallationCompleted(true)` +
 *   `router.replace('/settings/team/integrations')` `:46-50`; on failure `console.error('GitHub installation failed:', error)`
 *   and `installing.current = false` `:52-56` — nothing else, no state, no message; the mount effect `:60-65`; the
 *   repositories effect `:67-72` (gated on `!integrationTenantLoading && tenantId`, where `tenantId` is
 *   `integrationTenant?.[0]?.id` `:28-30` — the **integration-tenant row id**, not the tenant); the integration-types
 *   effect `:74-92` (`shouldLoadTypes` `:76`, then only when a row whose `name` is `All Integrations` was found
 *   `:82-85` does it call `getIntegrationTenant('Github')`); and the return, which is always
 *   `<GitHubIntegrationPageSkeleton />` `:94`; `withAuthentication(…, { skeleton: GitHubIntegrationPageSkeleton })`
 *   `:97-100`.
 * - `core/components/pages/integration/github/github-integration-page-skeleton.tsx:7-17` — its own comment at `:7`
 *   (JSDoc, quoted without its delimiters because this header is a block comment):
 *   `GitHub sends the user back here after installing the app: the page only waits for the installation to be recorded.`
 *   then `PageSkeletonFrame` `:11-15` + `LoadingStatusLine label={t('common.GITHUB_LOADING_TEXT')}` `:13`;
 *   `PageSkeletonFrame` (`core/components/layouts/page-skeleton.tsx:104-114`) draws `PageLayout title={t('common.LOADING')}`
 *   `:104-105`, a `<div role="status" aria-live="polite" aria-busy="true" className="contents">` `:110` and an `sr-only`
 *   `LOADING` span `:111` inside it — one status region holding both lines of the skeleton.
 * - `core/components/layouts/app/authenticator.tsx:89-98` — with no user data the wrapper renders `params.skeleton`,
 *   which here is the same GitHub skeleton; `useUserQuery` (`core/hooks/queries/user-user.query.ts:13`, `:27`) is
 *   `enabled: hasToken` (the `auth-token` cookie), so a visitor with none never gets user data.
 * - `proxy.ts:190` (`protected_path`, refusing through `deny_redirect` `:178-181`) +
 *   `core/constants/config/constants.tsx:116-133` — `PROTECTED_APP_URL_PATHS` names `/settings`, `/task`, `/profile`,
 *   `/goals`, … and **not** `/integration`, so the door does not send this URL away.
 * - Services (all of them run in the browser against the mock origin: `api.service.ts:509-520` — `:516`
 *   `baseURL = baseURL ? `${baseURL}/api` : undefined`, applied when the service is direct-API `:518-520` — over the base
 *   `GAUZY_API_BASE_SERVER_URL` (`constants.tsx:229-232`, read from `NEXT_PUBLIC_GAUZY_API_SERVER_URL`, which the lane sets
 *   to the mock at `playwright/test-servers.ts:122-125`). Every path below is therefore `<mock origin>/api/…`; the app's
 *   own `/api/**` route twins are never called from this page):
 *   `installGitHubIntegration` `core/services/client/api/integrations/github.service.ts:18-20` →
 *   `POST /api/integration/github/install`, body from `core/hooks/integrations/use-github-integration.ts:77-84`
 *   (`tenantId`, `organizationId`, `installation_id`, `setup_action`; the first two come from the user query, so with no
 *   user they are absent); `getIntegrationTypes` `integration.service.ts:32` → `GET /api/integration/types`;
 *   `getIntegrationTenant` direct branch `integration-tenant.service.ts:14-22` →
 *   `GET /api/integration-tenant?where[organizationId]=…&where[tenantId]=…&where[name]=Github`;
 *   `getGithubIntegrationRepositories` `github.service.ts:74-86` →
 *   `GET /api/integration/github/<integration-tenant row id>/repositories?tenantId=…&organizationId=…`, its answer
 *   validated at `:93-109` against `githubRepositoriesSchema` (`core/types/schemas/integrations/github.schema.ts:183`)
 *   and, when that fails, `minimalGithubRepositoriesSchema` (`:199-206`); the same pair of branches exists for
 *   `getGithubIntegrationMetadata` (`github.service.ts:26-38`).
 * - Hooks: `core/hooks/integrations/use-integration-types.ts:17-23` sends the types read itself (`enabled: !!tenantId`,
 *   the cookie), and `getIntegrationTypes()` `:35-40` only returns what that query already has;
 *   `core/hooks/integrations/use-integration-tenant.ts:27-38` keeps its read disabled (`enabled: !!queryName` `:35`)
 *   until `getIntegrationTenant(name)` sets the requested name, and its `queryFn` throws `Query name is required` on the
 *   `['integrations','tenant','disabled']` key `:28-34` — which is what the DEV toast of that name seen in every case
 *   with a tenant read reports, exactly as the file's own `:11` documents it (quoted without its JSDoc delimiters):
 *   `@param name - Read from the first render: a `getIntegrationTenant` call's first refetch runs on the disabled key.`
 *   — copied verbatim except for its JSDoc delimiters, which a block comment cannot hold;
 *   `getRepositories(integrationId)`
 *   `use-github-integration.ts:191-198` only sets the id the repositories query is keyed on.
 * - Copy read from `locales/en.json` by key (never typed): `common.LOADING` `:262`,
 *   `common.GITHUB_LOADING_TEXT` `:359`, `settings.entries.integrations.TITLE` `:4712` (the redirect target's heading),
 *   `toasts.MUTATION_FAILED` `:4322`, `toasts.REASONS.INVALID` `:4330`, `toasts.REASONS.SERVER` `:4332` — the toast
 *   `core/components/common/mutation-error-toaster.tsx:50-56` writes for a mutation nobody else reported, whose reason
 *   `core/lib/utils/error-feedback.ts:169-175` picks from the status.
 *
 * ## What is already pinned elsewhere (not repeated here)
 *
 * `suites/lane-b/integration-connect-routes.spec.ts:33-160`, `:950-1113` pins the `POST /api/integration/github/install`
 * **route** (its refusals, cross-site check, bodies, query pass-through, tenant cookie, its bare-500 and its
 * `{data, response}` wrapper), and `suites/lane-c/gauzy-refusals-relayed.spec.ts:428-445` pins the two integration reads
 * at the API level. This file is the page in a browser: what it sends, in which order, what it renders and where it
 * sends the person.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The page under test and the page its success branch replaces it with. */
const PAGE_PATH = '/integration/github';
const REDIRECT_TARGET = '/settings/team/integrations';

/** The paths as the mock records them (`api.service.ts:516` adds `/api` to the browser's base). */
const INSTALL_ROUTE = '/api/integration/github/install';
const TYPES_ROUTE = '/api/integration/types';
const TENANT_ROUTE = '/api/integration-tenant';
const REPOS_PREFIX = '/api/integration/github/';

/**
 * This file's made-up installation id — GitHub's own ids are never used — and the made-up id of the tenant's GitHub
 * integration row it serves. The row id is what the page puts into the repositories path (`page-component.tsx:28-30`
 * feeds `integrationTenant?.[0]?.id` to `getRepositories`), so the two paths below are the paths the page will ask.
 */
const INSTALLATION_ID = '12345678';
const INTEGRATION_ROW_ID = 'gh-return-integration-row-1';
const repositoriesPath = (rowId: string) => `${REPOS_PREFIX}${rowId}/repositories`;
const metadataPath = (rowId: string) => `${REPOS_PREFIX}${rowId}/metadata`;

/**
 * `locales/en.json`: `common.LOADING` `:262`, `common.GITHUB_LOADING_TEXT` `:359`,
 * `settings.entries.integrations.TITLE` `:4712`, `toasts.MUTATION_FAILED` `:4322`, `toasts.REASONS.INVALID` `:4330`,
 * `toasts.REASONS.SERVER` `:4332`. Read by key, never typed out here.
 */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: { LOADING: string; GITHUB_LOADING_TEXT: string };
	settings: { entries: { integrations: { TITLE: string } } };
	toasts: { MUTATION_FAILED: string; REASONS: { INVALID: string; SERVER: string } };
};

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b github-return] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

type Call = { method: string; origin: string; path: string; query: string; body: string | null };

const lineOf = (call: Call) =>
	`${call.method} ${call.origin}${call.path}${call.query ? `?${call.query}` : ''}${
		call.body === null ? '' : ` body(${String(call.body).length})`
	}`;

/**
 * Records everything the browser sent, by origin. Nothing is answered here — this is the witness every test ends on.
 * `hosts()` is what the safety rule pins; `to(prefix)` is what a request claim is read from.
 */
function recordRequests(page: Page) {
	const calls: Call[] = [];
	const hosts = new Set<string>();
	page.on('request', (request) => {
		const url = new URL(request.url());
		hosts.add(url.origin);
		calls.push({
			method: request.method(),
			origin: url.origin,
			path: url.pathname,
			query: url.searchParams.toString(),
			body: request.postData()
		});
	});
	return {
		calls: () => calls,
		/** Sorted, de-duplicated origins of every request this page's browser made. */
		hosts: () => [...hosts].sort(),
		to: (prefix: string) => calls.filter((call) => call.origin === MOCK_API_ORIGIN && call.path.startsWith(prefix)),
		/** Mock-origin calls whose path is **exactly** this one. The install posts share the
		 * `/api/integration/github/` prefix with the repositories and metadata reads, so asking for one of them by
		 * prefix answers with all three (found by the first acceptance run). */
		at: (path: string) => calls.filter((call) => call.origin === MOCK_API_ORIGIN && call.path === path),
		linesTo: (prefix: string) => calls.filter((call) => call.path.startsWith(prefix)).map(lineOf),
		bodiesTo: (prefix: string) =>
			calls.filter((call) => call.path.startsWith(prefix)).map((call) => call.body ?? '<no body>')
	};
}

/**
 * The safety assertion every case ends with. Two assertions, one per rule:
 * - nothing outside this lane: the app origin and the mock origin are the only two a browser may call;
 * - and the set this case was measured with, so a case that stopped reaching the mock (or started reaching a third
 *   host) fails here instead of silently changing shape. The signed-out case is measured on the app origin alone
 *   (`-probe3` Q7: no user, so no API read of any kind).
 */
function expectLaneHostsOnly(hosts: string[], measured: string[], why: string) {
	const outside = hosts.filter((host) => host !== APP_ORIGIN && host !== MOCK_API_ORIGIN);
	expect(
		outside,
		`${why}: the browser called hosts besides this lane's app (${APP_ORIGIN}) and its mock (${MOCK_API_ORIGIN})`
	).toEqual([]);
	expect(hosts, `${why}: the hosts this case measured`).toEqual([...measured].sort());
}

/**
 * What this file serves on the mock origin; a path left out is left to the mock, which is how `fails` can arm that
 * read (a path this file answers is never asked of the mock at all). Each answer is matched on its **exact** path:
 * `/…/repositories` and `/…/metadata` share the `/api/integration/github/` prefix and must not answer each other.
 */
type ServedScript = { types?: unknown; tenant?: unknown; repositories?: unknown; metadata?: unknown };

type ServedHarness = {
	/** What this file's own stand-in was asked, in arrival order. */
	calls: Call[];
	lines: () => string[];
	lineTo: (path: string) => string | null;
	countOf: (method: string, path: string) => number;
};

/**
 * This file's stand-in for the integration reads the mock cannot answer with data (see the header). Never
 * `route.fetch()`: a served path leaves the mock's log empty, which is the proof the page acted on this answer.
 */
async function serveIntegrationReads(page: Page, script: ServedScript): Promise<ServedHarness> {
	const servedPaths = [
		...('types' in script ? [{ path: TYPES_ROUTE, answer: script.types }] : []),
		...('tenant' in script ? [{ path: TENANT_ROUTE, answer: script.tenant }] : []),
		...('repositories' in script
			? [{ path: repositoriesPath(INTEGRATION_ROW_ID), answer: script.repositories }]
			: []),
		...('metadata' in script ? [{ path: metadataPath(INTEGRATION_ROW_ID), answer: script.metadata }] : [])
	];
	const calls: Call[] = [];

	await page.route(
		(url: URL) => url.origin === MOCK_API_ORIGIN && servedPaths.some((served) => url.pathname === served.path),
		(route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (request.method() === 'OPTIONS') {
				void route.fulfill({ status: 204, headers: CORS_HEADERS });
				return;
			}
			calls.push({
				method: request.method(),
				origin: url.origin,
				path: url.pathname,
				query: url.searchParams.toString(),
				body: request.postData()
			});
			const served = servedPaths.find((candidate) => candidate.path === url.pathname);
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(served?.answer ?? { message: `this file scripted no answer for ${url.pathname}` })
			});
		}
	);

	return {
		calls,
		lines: () => calls.map(lineOf),
		lineTo: (path: string) => {
			const call = calls.find((entry) => entry.path === path);
			return call ? lineOf(call) : null;
		},
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length
	};
}

/**
 * `GET /api/integration/types` as this file serves it (`integrationTypeListSchema`, `integration-type.schema.ts:22-43`):
 * with, or without, the one row the page looks for by name (`page-component.tsx:82-84`).
 */
const servedTypes = (withAllIntegrations: boolean) =>
	withAllIntegrations
		? [
				{
					id: 'gh-return-type-all',
					name: 'All Integrations',
					description: null,
					icon: null,
					groupName: 'All',
					order: 1
				},
				{
					id: 'gh-return-type-github',
					name: 'Github',
					description: null,
					icon: null,
					groupName: 'Version control',
					order: 2
				}
			]
		: [{ id: 'gh-return-type-asana', name: 'Asana', description: null, icon: null, groupName: 'Work', order: 1 }];

/** The tenant's GitHub integration row (`integrationTenantListSchema`, `integration-tenant.schema.ts:21-39`). */
const servedTenantRow = (fixture: BootstrapFixture) => ({
	items: [
		{
			id: INTEGRATION_ROW_ID,
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA,
			name: 'Github',
			integrationId: 'gh-return-integration-1'
		}
	],
	total: 1
});

/** A repositories answer the minimal schema accepts (`github.schema.ts:199-206`); the full one needs GitHub's whole repository object. */
const servedRepositories = {
	total_count: 2,
	repositories: [
		{ id: 900000001, name: 'probe-repo-a', full_name: 'probe-org/probe-repo-a' },
		{ id: 900000002, name: 'probe-repo-b', full_name: 'probe-org/probe-repo-b' }
	]
};

/** A metadata answer the minimal schema accepts (`github.schema.ts:190-197`); only the redirect target ever asks for it. */
const servedMetadata = { id: 900000001, account: { login: 'probe-org', id: 900000002 }, app_id: 900000003 };

/** The install body the mutation builds (`use-github-integration.ts:78-84`), as the mock was asked to hold it. */
const installBody = (fixture: BootstrapFixture, setupAction: string) => ({
	tenantId: fixture.ids.tenantA,
	organizationId: fixture.ids.organizationA,
	installation_id: INSTALLATION_ID,
	setup_action: setupAction
});

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1075`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `core/components/common/mutation-error-toaster.tsx:47-49`: dev mode logs every failed mutation, whoever handles it. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/**
 * The client's own line for a refusal this file armed (`core/services/client/api.service.ts` `logError`). The path is
 * spelled **without** the `/api` prefix — the axios base carries it, so the log line reads
 * `POST /integration/github/install 400` while the mock records `/api/integration/github/install`
 * (`suites/lane-b/task-property-settings-ui.spec.ts:750-754`, measured `-probe3` R4).
 */
const armedHttpError = (verb: string, api: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${api} ${status}`;
/**
 * The same line for a **read** the client logs with its query string inside the path, which is how it measured a refused
 * repositories read: `HTTP Error: GET /integration/github/<row>/repositories?tenantId=…&organizationId=… 500` — the
 * status comes after the query, so only the front of the line can be named (`-s3-lane-b-githubreturn-1.log`).
 */
const armedHttpErrorFront = (verb: string, api: string) => `[ERROR] [HttpClient] HTTP Error: ${verb} ${api}`;
/** A path the mock records (`/api/…`) as the client logs it (without that `/api`). */
const loggedPathOf = (mockPath: string) => mockPath.slice('/api'.length);
/** `page-component.tsx:54` — the page's own line for a refused install, and the only thing it does about it. */
const PAGE_INSTALL_FAILURE_LINE = 'GitHub installation failed:';
/** What a silence assertion may be empty about: only these exact, named lines. */
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/**
 * A DEV toast carrying `text`: `core/components/common/dev-error-toaster.tsx:17-18` names the kind (`Mutation failed`
 * / `Query failed`), `:158` writes the `DEV` badge and `:170-171` a `Copy details` action. Polled, never read once:
 * toasts arrive and expire on their own timer (`-probe3`/`-probe4`: the app's own failure toast was on screen at 0-6 s
 * and gone at 6 s, the DEV one the other way round), so a toast is only ever asserted as "appeared".
 */
const devToastOf = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });

/** The query GitHub appends (`page-component.tsx:15-16` reads exactly these two), and the URL built from it. */
const BOTH_PARAMS = `installation_id=${INSTALLATION_ID}&setup_action=install`;
const returnUrl = (query: string) => `${PAGE_PATH}${query ? `?${query}` : ''}`;

/**
 * The page's own copy, flat. `[role="status"]` is the skeleton wrapper (`page-skeleton.tsx` — `role="status"
 * aria-live="polite" aria-busy="true"`, `className="contents"`), and because it wraps the whole frame it is ONE region
 * saying both the frame's `Loading` title and the page's status line: measured as
 * `Loading\nWe are now installing your GitHub Integration, hold on...` (`-probe3` Q1/Q2/Q6/Q7, `-probe4` R1-R5).
 * Compared on the flattened lines, because the region's `textContent` runs the two together with no separator at all
 * (`LoadingWe are now installing…`, which is what `toHaveText` compared against in the first acceptance run).
 */
const SKELETON_FLAT = `${EN.common.LOADING} ${EN.common.GITHUB_LOADING_TEXT}`;
/** The text of every `[role="status"]` region on the page, whitespace flattened to single spaces. */
const statusLines = async (page: Page) =>
	(await page.locator('[role="status"]').allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());
/** The address a case must be left at: a refusal never moves the person off the URL GitHub returned them to. */
const returnUrlPattern = (query: string) => new RegExp(`^${APP_ORIGIN}${PAGE_PATH}${query ? `\\?${query}` : ''}$`);
/** `hosts()` is sorted, and the mock origin sorts before the app origin: the pair every signed-in case measured. */
const HOSTS_APP_AND_MOCK = [APP_ORIGIN, MOCK_API_ORIGIN];
const skeletonTexts = async (page: Page) => ({
	statusCount: await page.locator('[role="status"]').count(),
	statusText: await statusLines(page)
});

/** Polls this file's own stand-in until it was asked for `path`, then returns that recorded line. */
const servedCallWhen = async (served: ServedHarness, path: string) => {
	await expect.poll(() => served.lineTo(path), { timeout: 30_000, intervals: [250] }).not.toBeNull();
	return served.lineTo(path) as string;
};

/** The install posts among the mock's recorded requests, as the mock recorded them. */
const installEntriesOf = (requests: StubRequest[]) => requests.filter((request) => request.path === INSTALL_ROUTE);

/** Polls the mock's log until it holds `atLeast` install posts, and returns just those entries. */
const installLogWhen = async (atLeast: number) => {
	const log = await mockRequestsWhen((requests) => installEntriesOf(requests).length >= atLeast, {
		tries: 80,
		intervalMs: 250
	});
	return installEntriesOf(log);
};

/**
 * A quiet window, used only after the calls expected are already in the log, to show the page sent no further one;
 * the assertion is the caller's, on the log read after it. It waits 3 s, which is wide against what a mount burst
 * looks like: the two install posts are 3-6 ms apart (`-probe3` Q1 `start=3899`/`start=3903`, `-probe4` R4
 * `4149`/`4152`, R5 `3355`/`3361`), and no run ever showed a third post.
 */
const quietWindow = () => new Promise((done) => setTimeout(done, 3_000));

/** Raises the navigation allowance for a cold Turbopack compile of this route (the pattern and its reason are written
 * out at `suites/lane-b/task-property-settings-ui.spec.ts:766-768`); no assertion below waits on a duration. */
test.use({ navigationTimeout: 120_000 });

test.describe('lane-b · the page GitHub returns a person to: /integration/github?installation_id=…&setup_action=…', () => {
	test("an accepted install: the post reaches the lane mock with this file's own ids, and the page replaces itself with the integrations page", async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const served = await serveIntegrationReads(page, {
			types: servedTypes(true),
			tenant: servedTenantRow(fixture),
			repositories: servedRepositories,
			metadata: servedMetadata
		});
		const rec = recordRequests(page);
		await signInAndVisit(page, fixture, returnUrl(BOTH_PARAMS));

		// Success is `router.replace('/settings/team/integrations')` (`page-component.tsx:46-50`): the address, the page's
		// own heading (`settings.entries.integrations.TITLE`), and no status region left — the skeleton went with the page.
		await expect(page).toHaveURL(new RegExp(`^${APP_ORIGIN}${REDIRECT_TARGET}$`), { timeout: 45_000 });
		await expect(page.getByRole('heading', { name: EN.settings.entries.integrations.TITLE })).toBeVisible();
		await expect(page.locator('[role="status"]')).toHaveCount(0);

		const installs = await installLogWhen(1);
		// Measured, untagged (seen on `next dev` only; a production build was not measured) — the install is posted
		// **twice**, not once. The page guards the post with two flags, and their own comments say what they are for:
		//   `page-component.tsx:20` `// Add state to track installation completion`
		//   `page-component.tsx:47` `// Mark installation as completed and reset installing flag`
		// but the guard is a memo whose dependency list is `[installation_id, setup_action, installationCompleted]`
		// (`page-component.tsx:33-35`): `installing.current` is a ref and is not in that list, so setting it cannot
		// re-run the memo — and `next dev` mounts every component twice (React Strict Mode; the double mount every lane
		// run gets is spelled out at `playwright/helpers.ts:37-43`). Both mounts read `canInstall` as still true and both
		// post. Measured as one burst, before any answer arrived: 2 posts 3-6 ms apart, never a third (`-probe3` Q1
		// `start=3899`/`3903` and Q5 `3130`/`3135`, `-probe4` R4 `4149`/`4152` and R5 `3355`/`3361`).
		await expect(installs.map((request) => `${request.method} ${request.path} ${request.status}`)).toEqual([
			`POST ${INSTALL_ROUTE} 200`,
			`POST ${INSTALL_ROUTE} 200`
		]);
		// Nothing rides in the URL; the install carries its four fields in the body (`use-github-integration.ts:78-84`,
		// `tenantId`/`organizationId` from the signed-in user, the other two from the query GitHub appended).
		await expect(rec.to(INSTALL_ROUTE).map((call) => call.query)).toEqual(['', '']);
		await expect(rec.to(INSTALL_ROUTE).map((call) => JSON.parse(call.body ?? 'null'))).toEqual([
			installBody(fixture, 'install'),
			installBody(fixture, 'install')
		]);

		// The page never left without reading: `GET /api/…/metadata` is a read of the page it landed on — the return page
		// itself never asks for it (compare `-probe3` Q1, which was refused and stayed, with Q5, which redirected).
		await servedCallWhen(served, metadataPath(INTEGRATION_ROW_ID));
		const askedOfMock = (await mock.requests())
			.filter(
				(request) =>
					request.path === TENANT_ROUTE || (request.path.startsWith(REPOS_PREFIX) && request.method === 'GET')
			)
			.map((request) => `${request.method} ${request.path}`);
		// Empty because this file answered those reads (`page.route` on the mock origin): the mock's log is the witness
		// that the page used this file's answer rather than the mock's catch-all.
		await expect(askedOfMock).toEqual([]);

		// A clean console: no refusal to excuse, and nothing else the page reported.
		await expect(consoleFindings(shield)).toEqual([]);
		report('accepted install', {
			url: page.url(),
			installPosts: installs.map((request) => `${request.method} ${request.path} ${request.status}`),
			installBodies: rec.to(INSTALL_ROUTE).map((call) => call.body),
			servedReads: served.lines(),
			consoleErrors: shield.consoleErrors()
		});
		expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, 'an accepted install');
	});

	test('a refusal (400): the page stays on its skeleton, posts no third time, and the failure reaches the person only as the global toast', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const served = await serveIntegrationReads(page, {
			types: servedTypes(true),
			tenant: servedTenantRow(fixture),
			repositories: servedRepositories
		});
		const rec = recordRequests(page);
		await signInAndVisit(page, fixture, returnUrl(BOTH_PARAMS), { scenario: { fails: { [INSTALL_ROUTE]: 400 } } });

		const installs = await installLogWhen(1);
		// The mock answered both posts of one mount burst with its armed refusal — the shape it answers an arm with is
		// `{ statusCode, message }` (`mock-gauzy-server.mjs:1158-1168`), and it records the call with that status.
		await expect(installs.map((request) => `${request.method} ${request.path} ${request.status}`)).toEqual([
			`POST ${INSTALL_ROUTE} 400`,
			`POST ${INSTALL_ROUTE} 400`
		]);
		await expect(installs.map((request) => request.query)).toEqual(['', '']);

		// No retry, and no third post: the quiet window is the absence proof, the assertion is the re-read after it
		// (`page-component.tsx:52-56` catches and sets one ref back — it re-sends nothing).
		await quietWindow();
		const afterQuiet = installEntriesOf(await mock.requests());
		await expect(afterQuiet.map((request) => `${request.method} ${request.path} ${request.status}`)).toEqual([
			`POST ${INSTALL_ROUTE} 400`,
			`POST ${INSTALL_ROUTE} 400`
		]);
		await expect(rec.to(INSTALL_ROUTE)).toHaveLength(2);

		// The person is still on the URL GitHub sent them to, and still looking at the same skeleton: the failure branch
		// changes no state and renders nothing new (`page-component.tsx:52-56`, `:94`).
		await expect(page).toHaveURL(returnUrlPattern(BOTH_PARAMS));
		await expect(page.locator('[role="status"]')).toHaveCount(1);
		await expect.poll(() => statusLines(page), { timeout: 20_000, intervals: [250] }).toEqual([SKELETON_FLAT]);

		// Parked pointer, then the toasts — polled, because a toast arrives and expires on its own timer (`-probe4` R4
		// caught the app's toast at 0-6 s and the DEV one at 6 s; the reverse also happened).
		await page.mouse.move(2, 2);
		// The mutation name the DEV toast prints (`use-github-integration.ts:77` `const installGitHubMutation = useMutation(`):
		// `installGitHubMutation`, without the hook prefix the toast carries, so the filter cannot miss on a rendering detail.
		const devToast = devToastOf(page, 'useMutation[installGitHubMutation]').first();
		await expect(devToast).toBeVisible();
		await expect(devToast).toContainText('400');
		// The person-facing half is the global fallback's (`mutation-error-toaster.tsx:53-56`): the title, and the reason
		// for a 4xx which `error-feedback.ts:169-172` maps to `invalid`.
		const failureToast = page.locator('[data-sonner-toast]').filter({ hasText: EN.toasts.MUTATION_FAILED }).first();
		await expect(failureToast).toBeVisible();
		await expect(failureToast).toContainText(EN.toasts.REASONS.INVALID);

		// The whole console of a refused install, named: the client's line for the armed refusal and the page's own
		// `console.error` (`page-component.tsx:54`), once per mount, plus the dev-mode mutation log this file excuses by
		// name. Anything else in here is a finding.
		await expect(shield.logMatching(new RegExp(PAGE_INSTALL_FAILURE_LINE))).toHaveLength(2);
		await expect(
			consoleFindings(shield, [
				armedHttpError('POST', loggedPathOf(INSTALL_ROUTE), 400),
				PAGE_INSTALL_FAILURE_LINE
			])
		).toEqual([]);
		report('refused 400', {
			url: page.url(),
			installPosts: afterQuiet.map(
				(request) => `${request.method} ${request.path} ${request.status} start=${Math.round(request.startMs)}`
			),
			installBodies: rec.to(INSTALL_ROUTE).map((call) => call.body),
			servedReads: served.lines(),
			toasts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			skeleton: await skeletonTexts(page),
			consoleErrors: shield.consoleErrors()
		});
		expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, 'a refusal (400)');
	});

	test("a refusal (500): same shape, the server-reason copy, and the mock's own empty integration types mean no tenant read at all", async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// Nothing served here, on purpose: this case is the lane's mock answering as it does.
		const rec = recordRequests(page);
		await signInAndVisit(page, fixture, returnUrl(BOTH_PARAMS), { scenario: { fails: { [INSTALL_ROUTE]: 500 } } });

		const installs = await installLogWhen(1);
		await expect(installs.map((request) => `${request.method} ${request.path} ${request.status}`)).toEqual([
			`POST ${INSTALL_ROUTE} 500`,
			`POST ${INSTALL_ROUTE} 500`
		]);
		await expect(rec.to(INSTALL_ROUTE).map((call) => JSON.parse(call.body ?? 'null'))).toEqual([
			installBody(fixture, 'install'),
			installBody(fixture, 'install')
		]);

		await quietWindow();
		await expect(installEntriesOf(await mock.requests()).map((request) => request.status)).toEqual([500, 500]);

		await expect(page).toHaveURL(returnUrlPattern(BOTH_PARAMS));
		await expect(page.locator('[role="status"]')).toHaveCount(1);
		await expect.poll(() => statusLines(page), { timeout: 20_000, intervals: [250] }).toEqual([SKELETON_FLAT]);

		await page.mouse.move(2, 2);
		// The mutation name the DEV toast prints (`use-github-integration.ts:77` `const installGitHubMutation = useMutation(`):
		// `installGitHubMutation`, without the hook prefix the toast carries, so the filter cannot miss on a rendering detail.
		const devToast = devToastOf(page, 'useMutation[installGitHubMutation]').first();
		await expect(devToast).toBeVisible();
		await expect(devToast).toContainText('500');
		// A 5xx is the `server` reason (`error-feedback.ts:173-175`), never the server's own text.
		const failureToast = page.locator('[data-sonner-toast]').filter({ hasText: EN.toasts.MUTATION_FAILED }).first();
		await expect(failureToast).toBeVisible();
		await expect(failureToast).toContainText(EN.toasts.REASONS.SERVER);

		// Nothing else was read: the page's own types read is answered by the mock with `[]`
		// (`mock-gauzy-server.mjs:880`), so no row named `All Integrations` is found (`page-component.tsx:82`) and the
		// tenant read — the only door to the repositories read (`:83-85`) — is never asked. A gap in what this lane's mock
		// holds rather than a decision the app documents, which is why every other case in this file serves those reads.
		// Measured at `-probe4` R5 (`tenantInMockLog: 0`) and `-probe3` P1/P7.
		const log = await mockRequestsWhen((requests) => requests.some((request) => request.path === TYPES_ROUTE));
		const typesReads = log.filter((request) => request.path === TYPES_ROUTE);
		// No count pinned: how many times one read is issued varies with what the dev server does with its own fetches
		// (`playwright/helpers.ts:37-43`). What is pinned is that it was asked, and that every asking answered 200 with
		// the mock's own `[]`.
		await expect(typesReads.length).toBeGreaterThan(0);
		await expect(typesReads.filter((request) => request.status !== 200)).toEqual([]);
		await expect(log.filter((request) => request.path === TENANT_ROUTE)).toEqual([]);

		await expect(shield.logMatching(new RegExp(PAGE_INSTALL_FAILURE_LINE))).toHaveLength(2);
		await expect(
			consoleFindings(shield, [
				armedHttpError('POST', '/integration/github/install', 500),
				PAGE_INSTALL_FAILURE_LINE
			])
		).toEqual([]);
		report('refused 500', {
			url: page.url(),
			installPosts: installEntriesOf(log).map((request) => `${request.method} ${request.path} ${request.status}`),
			typesReads: log.filter((request) => request.path === TYPES_ROUTE).length,
			tenantReads: log.filter((request) => request.path === TENANT_ROUTE).length,
			toasts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			skeleton: await skeletonTexts(page),
			consoleErrors: shield.consoleErrors()
		});
		expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, 'a refusal (500)');
	});

	/**
	 * `canInstall` needs both halves of GitHub's query (`page-component.tsx:33-35`), and the mount effect asks the same
	 * question (`:62`) before `handleInstallGitHub` returns on its own guard (`:41`). With either half missing nothing is
	 * posted — while the page's three reads run exactly as they do with both, because nothing in `:67-92` looks at the
	 * query. Measured for all three shapes at `-probe4` R1 / R2 / R3.
	 */
	for (const [label, query] of [
		['without setup_action', `installation_id=${INSTALLATION_ID}`],
		['without installation_id', 'setup_action=install'],
		['with neither GitHub parameter', '']
	] as const) {
		test(`the return ${label}: nothing is posted, and the page's own three reads are unchanged`, async ({
			page,
			fixture,
			mock,
			shield
		}) => {
			const served = await serveIntegrationReads(page, {
				types: servedTypes(true),
				tenant: servedTenantRow(fixture),
				repositories: servedRepositories
			});
			const rec = recordRequests(page);
			await signInAndVisit(page, fixture, returnUrl(query));

			// The witness that the page's effects ran at all: this file's stand-in was asked for all three reads.
			await servedCallWhen(served, TYPES_ROUTE);
			await servedCallWhen(served, TENANT_ROUTE);
			await servedCallWhen(served, repositoriesPath(INTEGRATION_ROW_ID));

			// Absence proof: a quiet window after those reads landed, then both the browser's record and the mock's log
			// are re-read — no install post in either.
			await quietWindow();
			await expect(rec.to(INSTALL_ROUTE)).toEqual([]);
			await expect(installEntriesOf(await mock.requests())).toEqual([]);

			// Still the same page, still its skeleton, still the same copy: `:94` renders it whatever the query said.
			await expect(page).toHaveURL(returnUrlPattern(query));
			await expect(page.locator('[role="status"]')).toHaveCount(1);
			await expect.poll(() => statusLines(page), { timeout: 20_000, intervals: [250] }).toEqual([SKELETON_FLAT]);
			await expect(consoleFindings(shield)).toEqual([]);
			report(`no install ${label}`, {
				url: page.url(),
				servedReads: served.lines(),
				installCalls: rec.to(INSTALL_ROUTE).map(lineOf),
				skeleton: await skeletonTexts(page),
				consoleErrors: shield.consoleErrors()
			});
			expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, `the return ${label}`);
		});
	}

	/**
	 * GitHub returns a person with `setup_action` set to `install`, `update` or `request`. Nothing in this repo looks at
	 * which of them it is: the page reads it (`page-component.tsx:16`) and hands it over verbatim (`:45`), the mutation
	 * puts it in the body (`use-github-integration.ts:78-84`), and even the server twin of this call only destructures
	 * it (`app/api/integration/github/install/route.ts:13`). Measured: every value reached the body unchanged and ended
	 * in the same redirect, an invented value (`probe-unknown`) among them (`-probe-githubreturn` run 2, P7-install,
	 * P7-update, P7-request, P7-upgrade, P7-probe-unknown).
	 */
	for (const setupAction of ['install', 'update', 'request']) {
		test(`setup_action=${setupAction}: the value reaches the install body unchanged, and the page still redirects`, async ({
			page,
			fixture,
			shield
		}) => {
			const rec = recordRequests(page);
			await signInAndVisit(
				page,
				fixture,
				returnUrl(`installation_id=${INSTALLATION_ID}&setup_action=${setupAction}`)
			);

			const installs = await installLogWhen(1);
			await expect(installs.map((request) => `${request.method} ${request.path} ${request.status}`)).toEqual([
				`POST ${INSTALL_ROUTE} 200`,
				`POST ${INSTALL_ROUTE} 200`
			]);
			await expect(rec.to(INSTALL_ROUTE).map((call) => JSON.parse(call.body ?? 'null'))).toEqual([
				installBody(fixture, setupAction),
				installBody(fixture, setupAction)
			]);

			await expect(page).toHaveURL(new RegExp(`^${APP_ORIGIN}${REDIRECT_TARGET}$`), { timeout: 45_000 });
			await expect(page.getByRole('heading', { name: EN.settings.entries.integrations.TITLE })).toBeVisible();
			await expect(consoleFindings(shield)).toEqual([]);
			report(`setup_action ${setupAction}`, {
				url: page.url(),
				installPosts: installs.map((request) => `${request.method} ${request.path} ${request.status}`),
				installBodies: rec.to(INSTALL_ROUTE).map((call) => call.body),
				consoleErrors: shield.consoleErrors()
			});
			expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, `setup_action=${setupAction}`);
		});
	}

	test('the reads the page makes while it waits, in the order its effects chain them, with the ids each one carries', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const served = await serveIntegrationReads(page, {
			types: servedTypes(true),
			tenant: servedTenantRow(fixture),
			repositories: servedRepositories
		});
		const rec = recordRequests(page);
		// The install is refused on purpose: a page that redirects hands its reads over to the page it landed on, and
		// this case is about the reads that belong to the return page itself.
		await signInAndVisit(page, fixture, returnUrl(BOTH_PARAMS), { scenario: { fails: { [INSTALL_ROUTE]: 400 } } });

		await servedCallWhen(served, TYPES_ROUTE);
		await servedCallWhen(served, TENANT_ROUTE);
		await servedCallWhen(served, repositoriesPath(INTEGRATION_ROW_ID));

		// One asking of each, in the order the page's effects chain them: the types read the hook issues by itself
		// (`use-integration-types.ts:17-23`), the tenant read only after a row whose `name` is exactly
		// `All Integrations` was found (`page-component.tsx:82-85`), the repositories read only once a tenant row was
		// there (`:67-72`). Measured in this order every time (`-probe3` Q1/Q2/Q5, `-probe4` R1-R4).
		await expect(served.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`GET ${TYPES_ROUTE}`,
			`GET ${TENANT_ROUTE}`,
			`GET ${repositoriesPath(INTEGRATION_ROW_ID)}`
		]);
		// Each query as the browser sent it (`lineOf` prints method, origin, path and query).
		await expect(served.lineTo(TYPES_ROUTE)).toBe(`GET ${MOCK_API_ORIGIN}${TYPES_ROUTE}`);
		await expect(served.lineTo(TENANT_ROUTE)).toBe(
			`GET ${MOCK_API_ORIGIN}${TENANT_ROUTE}?where%5BorganizationId%5D=${fixture.ids.organizationA}&where%5BtenantId%5D=${fixture.ids.tenantA}&where%5Bname%5D=Github`
		);
		await expect(served.lineTo(repositoriesPath(INTEGRATION_ROW_ID))).toBe(
			`GET ${MOCK_API_ORIGIN}${repositoriesPath(INTEGRATION_ROW_ID)}?tenantId=${fixture.ids.tenantA}&organizationId=${fixture.ids.organizationA}`
		);

		// Parked pointer, then the toast the tenant read is documented to produce. `getIntegrationTenant(name)` refetches
		// the query object the hook was built with, and until a name had been requested that object is keyed
		// `['integrations','tenant','disabled']`, whose `queryFn` throws `Query name is required`
		// (`use-integration-tenant.ts:11` — quoted in the header — `:28-34`, `enabled: !!queryName` `:35`). Measured as a
		// DEV toast in every case that triggered a tenant read (`-probe3` Q1/Q6, `-probe4` R1-R4) and in none that did
		// not (`-probe4` R5), so it belongs to this chain and is not a failure of it.
		await page.mouse.move(2, 2);
		await expect(devToastOf(page, 'Query name is required').first()).toBeVisible();

		// Measured, untagged (the request is what the hook's `integrationId` asks for; only the comment's name is off) —
		// the repositories path names the **integration row**, not a tenant. The comment above
		// that value says a tenant id: `page-component.tsx:27` `// Memoize the tenant ID to prevent unnecessary re-renders`,
		// while what it memoizes is `integrationTenant?.[0]?.id` (`:28-30`) — the id of the tenant's GitHub integration
		// row. That row id is what `getRepositories(tenantId)` (`:70`) hands to a parameter the hook names
		// `integrationId` (`use-github-integration.ts:191-193`), and it is what the measured path was built from; the
		// tenant and the organization travel only as query parameters, never as the id in the path.
		const askedOfMock = (await mock.requests())
			.filter((request) => request.path === TENANT_ROUTE || request.path === repositoriesPath(INTEGRATION_ROW_ID))
			.map((request) => `${request.method} ${request.path}`);
		await expect(askedOfMock).toEqual([]);

		await expect(
			consoleFindings(shield, [
				armedHttpError('POST', loggedPathOf(INSTALL_ROUTE), 400),
				PAGE_INSTALL_FAILURE_LINE
			])
		).toEqual([]);
		report('read chain', {
			url: page.url(),
			servedReads: served.lines(),
			toasts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			browserIntegrationReads: rec
				.calls()
				.filter((call) => call.origin === MOCK_API_ORIGIN && call.path.startsWith('/api/integration'))
				.map(lineOf),
			consoleErrors: shield.consoleErrors()
		});
		expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, 'the read chain');
	});

	test('an integration types list with no row named All Integrations: the tenant read and the repositories read never happen', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const served = await serveIntegrationReads(page, {
			types: servedTypes(false),
			tenant: servedTenantRow(fixture),
			repositories: servedRepositories
		});
		const rec = recordRequests(page);
		await signInAndVisit(page, fixture, returnUrl(BOTH_PARAMS), { scenario: { fails: { [INSTALL_ROUTE]: 400 } } });

		const typesLine = await servedCallWhen(served, TYPES_ROUTE);
		// The inner component did mount — its install post is here, refused like in every other case of this shape
		// (`-probe3` Q3 measured 2 posts), so the reads below are absent for a reason and not because nothing ran.
		const installs = await installLogWhen(1);
		await expect(installs.map((request) => `${request.method} ${request.path} ${request.status}`)).toEqual([
			`POST ${INSTALL_ROUTE} 400`,
			`POST ${INSTALL_ROUTE} 400`
		]);
		// The types answer landed, then silence. `page-component.tsx:82` looks for a row whose `name` is exactly
		// `All Integrations` — by its display name and nothing else — and only its id opens the tenant read (`:83-85`),
		// which is the only way a repositories read can ever be asked (`:67-72`). Measured at `-probe3` Q3: the types
		// line was the only served call, and neither read reached the mock.
		await quietWindow();
		await expect(served.countOf('GET', TENANT_ROUTE)).toBe(0);
		await expect(served.countOf('GET', repositoriesPath(INTEGRATION_ROW_ID))).toBe(0);
		await expect(rec.at(repositoriesPath(INTEGRATION_ROW_ID))).toEqual([]);
		const log = await mock.requests();
		await expect(
			log.filter(
				(request) => request.path === TENANT_ROUTE || request.path === repositoriesPath(INTEGRATION_ROW_ID)
			)
		).toEqual([]);

		await expect(page.locator('[role="status"]')).toHaveCount(1);
		await expect.poll(() => statusLines(page), { timeout: 20_000, intervals: [250] }).toEqual([SKELETON_FLAT]);
		await expect(
			consoleFindings(shield, [
				armedHttpError('POST', loggedPathOf(INSTALL_ROUTE), 400),
				PAGE_INSTALL_FAILURE_LINE
			])
		).toEqual([]);
		report('no All Integrations row', {
			url: page.url(),
			typesLine,
			installPosts: installs.map((request) => `${request.method} ${request.path} ${request.status}`),
			servedReads: served.lines(),
			mockIntegrationReads: log
				.filter((request) => request.path.includes('integration'))
				.map((request) => `${request.method} ${request.path}`),
			consoleErrors: shield.consoleErrors()
		});
		expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, 'no All Integrations row');
	});

	test('the tenant has no GitHub integration row yet: the tenant read is asked, the repositories read is not', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const served = await serveIntegrationReads(page, {
			types: servedTypes(true),
			tenant: { items: [], total: 0 },
			repositories: servedRepositories
		});
		const rec = recordRequests(page);
		await signInAndVisit(page, fixture, returnUrl(BOTH_PARAMS), { scenario: { fails: { [INSTALL_ROUTE]: 400 } } });

		await servedCallWhen(served, TENANT_ROUTE);
		// An empty page is a valid answer (`validatePaginationResponse`, `core/types/schemas/utils/validation.ts:79-90`),
		// so the tenant read completed — and there was no row for `integrationTenant?.[0]?.id` to take an id from
		// (`page-component.tsx:28-30`, `:67-72`), so the repositories read is never sent. Measured at `-probe3` Q4:
		// served calls types + tenant, and no `/repositories` call in the browser's record at all.
		await quietWindow();
		await expect(served.countOf('GET', repositoriesPath(INTEGRATION_ROW_ID))).toBe(0);
		await expect(rec.at(repositoriesPath(INTEGRATION_ROW_ID))).toEqual([]);
		await expect(
			(await mock.requests()).filter((request) => request.path === repositoriesPath(INTEGRATION_ROW_ID))
		).toEqual([]);

		await expect(page.locator('[role="status"]')).toHaveCount(1);
		await expect.poll(() => statusLines(page), { timeout: 20_000, intervals: [250] }).toEqual([SKELETON_FLAT]);
		await expect(
			consoleFindings(shield, [
				armedHttpError('POST', loggedPathOf(INSTALL_ROUTE), 400),
				PAGE_INSTALL_FAILURE_LINE
			])
		).toEqual([]);
		report('no integration row', {
			url: page.url(),
			servedReads: served.lines(),
			consoleErrors: shield.consoleErrors()
		});
		expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, 'no GitHub integration row');
	});

	test('a refused repositories read: nothing new appears, the page does not move, and the refusal reaches the person as a Query failed toast', async ({
		page,
		fixture,
		shield
	}) => {
		// The repositories read is deliberately left to the mock here so the mock's own switch can refuse it
		// (`helpers.ts:100-107`: addressed `tenant:path`, then `tenant`, then `path` — all three armed, as measured).
		const served = await serveIntegrationReads(page, {
			types: servedTypes(true),
			tenant: servedTenantRow(fixture)
		});
		const rec = recordRequests(page);
		await signInAndVisit(page, fixture, returnUrl(BOTH_PARAMS), {
			scenario: {
				fails: {
					[INSTALL_ROUTE]: 400,
					[`${fixture.ids.tenantA}:${repositoriesPath(INTEGRATION_ROW_ID)}`]: 500,
					[repositoriesPath(INTEGRATION_ROW_ID)]: 500
				}
			}
		});

		await servedCallWhen(served, TENANT_ROUTE);
		const log = await mockRequestsWhen((requests) =>
			requests.some((request) => request.path === repositoriesPath(INTEGRATION_ROW_ID))
		);
		const reposReads = log.filter((request) => request.path === repositoriesPath(INTEGRATION_ROW_ID));
		// No count pinned: how often the client re-issues a refused read differs between runs (measured 2 at `-probe3` Q6,
		// 4 at run 2 P11). What is pinned is that the read was asked and refused every time, and that the page did
		// nothing about it.
		await expect(reposReads.length).toBeGreaterThan(0);
		await expect(reposReads.filter((request) => request.status !== 500)).toEqual([]);

		await expect(page).toHaveURL(returnUrlPattern(BOTH_PARAMS));
		await expect(page.locator('[role="status"]')).toHaveCount(1);
		await expect.poll(() => statusLines(page), { timeout: 20_000, intervals: [250] }).toEqual([SKELETON_FLAT]);

		await page.mouse.move(2, 2);
		// The DEV toast for the failed query carries the armed status (`dev-error-toaster.tsx:17-18`, `:158`, `:170-171`);
		// the page has no branch for a failed read (`page-component.tsx:67-72` asks and forgets), so this is all the
		// person sees of it. Measured at `-probe3` Q6.
		const queryToast = devToastOf(page, '500 · Synthetic Gauzy refusal (500)').first();
		await expect(queryToast).toBeVisible();
		await expect(queryToast).toContainText('Query failed');

		await expect(
			consoleFindings(shield, [
				armedHttpError('POST', loggedPathOf(INSTALL_ROUTE), 400),
				// The refused read is excused on the front of its line only: the client logs a GET with its query string
				// inside the path (`HTTP Error: GET /integration/github/<row>/repositories?tenantId=…&organizationId=… 500`),
				// and that status is pinned separately, from the mock's own log.
				armedHttpErrorFront('GET', loggedPathOf(repositoriesPath(INTEGRATION_ROW_ID))),
				PAGE_INSTALL_FAILURE_LINE
			])
		).toEqual([]);
		report('refused repositories read', {
			url: page.url(),
			reposReads: reposReads.map((request) => `${request.method} ${request.path} ${request.status}`),
			servedReads: served.lines(),
			toasts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			skeleton: await skeletonTexts(page),
			consoleErrors: shield.consoleErrors()
		});
		expectLaneHostsOnly(rec.hosts(), HOSTS_APP_AND_MOCK, 'a refused repositories read');
	});

	test('signed out: the door does not turn this URL away, and nothing of the page runs — no user, no post, no call to the mock', async ({
		page,
		anon,
		mock,
		shield
	}) => {
		const rec = recordRequests(page);
		await anon(returnUrl(BOTH_PARAMS));

		// `PROTECTED_APP_URL_PATHS` (`core/constants/config/constants.tsx:116-133`, applied at `proxy.ts:190`) does not
		// name `/integration`, so the URL is served as it is, query and all (measured at `-probe3` Q7 and run 2 P8).
		await expect(page).toHaveURL(returnUrlPattern(BOTH_PARAMS));
		// What is drawn is the same skeleton, from the authentication wrapper rather than from the page: with no
		// `auth-token` cookie `useUserQuery` is disabled (`core/hooks/queries/user-user.query.ts:13-18`), so
		// `withAuthentication` renders its `skeleton` (`core/components/layouts/app/authenticator.tsx:89-98`) and the
		// inner `GitHub` component — the one that owns the install — never mounts. Nothing is posted, and the mock is
		// never called.
		await expect(page.locator('[role="status"]')).toHaveCount(1);
		await expect.poll(() => statusLines(page), { timeout: 20_000, intervals: [250] }).toEqual([SKELETON_FLAT]);

		await quietWindow();
		await expect(rec.to(INSTALL_ROUTE)).toEqual([]);
		await expect(rec.calls().filter((call) => call.origin === MOCK_API_ORIGIN)).toEqual([]);
		await expect(await mock.requests()).toEqual([]);
		await expect(consoleFindings(shield)).toEqual([]);
		report('signed out', {
			url: page.url(),
			browserCalls: rec
				.calls()
				.filter((call) => !call.path.startsWith('/_next'))
				.map(lineOf),
			documents: shield.documents(),
			consoleErrors: shield.consoleErrors()
		});
		// The one case measured on a single host: with no user there is no API read of any kind, so the mock origin is
		// never called.
		expectLaneHostsOnly(rec.hosts(), [APP_ORIGIN], 'signed out');
	});
});
