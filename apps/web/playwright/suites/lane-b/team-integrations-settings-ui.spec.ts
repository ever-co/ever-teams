import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { BrowserContext, Page } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, overrideRuntimeEnv, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The team's integrations page in a browser: **`/settings/team/integrations`**
 * (`app/[locale]/(main)/settings/team/integrations/page.tsx` →
 * `core/components/settings/pages/integrations/integrations-settings-page.tsx:67-73`), on lane-b (app
 * `http://localhost:3032`, mock `http://127.0.0.1:3996`, platform 3997, control 3998, `playwright/test-servers.ts:39`).
 *
 * ## Safety first — this page links out to third-party sites
 *
 * Every test installs `guardHosts()` **before its first navigation** (the guard of
 * `suites/lane-b/board-page-ui.spec.ts:177-208`): a catch-all `context.route` that records every request the context or
 * a popup makes and aborts any host outside this lane's app origin and its mock, and every test ends with
 * `expectAllowedHosts()` — the two allowed hosts only, and nothing aborted. All ids are this file's own
 * (`probe6-…`, `900000001`…); no real installation id, tenant id or provider host. Two facts the guard is there for:
 * - `core/lib/utils/settings-integrations.ts:329-335` builds `https://github.com/apps/<name>/installations/new?state=…`,
 *   the only hard-coded third-party host on this page;
 * - the Ever Platform section (covered by `suites/mock/ever-settings.spec.ts`, not here) renders a
 *   `https://github.com/ever-co/ever-teams/blob/develop/docs/ever-platform/anonymous-usage-statistics.md` link
 *   (`target="_blank"`), measured in `-probe-integrations-run1.log` as the only `a[target="_blank"]` of a plain load.
 *   It is never clicked here, and the guard aborts nothing.
 *
 * Every `authorizeUrl` this file serves (`POST …/install/state`) points at a path of **this lane's mock origin** it
 * makes up (`/probe-oauth/asana`), and the test asserts the browser landed there. Every `html_url` it serves is a
 * mock-origin URL too — which, see below, is why no "Manage on GitHub" anchor is ever rendered.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's app and its mock. The mock answers `/api/user/me`, `/api/organization-team*` (its one fixture
 * team, `cypress/support/mock-gauzy-server.mjs:655-656`), `/api/invoice-payments/connection` (`:885-889`) and the
 * Ever Platform reads; for anything else a GET answers `{items:[],total:0}` and a write echoes its body (`:893-895`).
 * **Served by this file** (`page.route` on the mock origin, the pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`
 * and `suites/lane-a/all-teams-ui.spec.ts:358-397`, restating the mock's CORS answer and answering `OPTIONS` with 204):
 * a **store** holding the team (whose single project carries the GitHub fields), the integration types, the tenant's
 * GitHub integration row, the GitHub metadata and repositories, and the writes. The store is what makes a write change
 * what the next read answers: `PUT …/organization-projects/…` edits the stored project, so a reload shows the saved
 * value. `route.fetch()` is never called — every served path leaves the mock's log empty, which is the witness that
 * the page acted on this file's answer (`S1 mock log team paths []` in `-probe-integrations-run5.log`).
 * The store's answer for the team read mirrors the mock's own shape (`mock-gauzy-server.mjs:236-256`, the shape
 * `all-teams-ui.spec.ts:267-345` serves), with `projects[0]` carrying `customFields.repository`,
 * `isTasksAutoSync`, `isTasksAutoSyncOnLabel`, `syncTag`. Its rule for a `customFields.repositoryId` write — store it
 * as `customFields.repository = { repositoryId, fullName }` — is this file's stand-in for the Gauzy plugin: the
 * reader on this page reads `customFields.repository` with `repositoryId` + `fullName`
 * (`core/lib/utils/settings-integrations.ts:136-166`) while the write sends `customFields.repositoryId`
 * (`core/hooks/integrations/use-github-integration.ts:136-145`).
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - Gate: `core/components/settings/kit/team-settings-gate.tsx:39-56` — `!isTeamMember` → `NoTeam`, `!activeTeam?.id`
 *   → the skeleton, `requiresManager && !canManageTeam` → `ManagersOnly` (copy `:27` `settings.common.MANAGERS_ONLY_TITLE`,
 *   `:29` `…_DESCRIPTION`, back `Link href="/settings/team"` `:32`); `requiresManager` is passed at
 *   `integrations-settings-page.tsx:69`. `canManageActiveTeamState = isTeamManager || isOrganizationAdmin`
 *   (`core/stores/teams/organization-team.ts:199-203`).
 * - Order of the sections: `integrations-settings-page.tsx:55-62` — Github, Linear, Asana, Trello, Jira, Import,
 *   InvoicePayments, `EverPlatformSettings` (framed at `:24-39`; covered elsewhere, not repeated here).
 * - GitHub chain (`core/hooks/settings/use-github-integration-settings.ts`): types `:101`, catalog check `:102`
 *   (`hasIntegrationCatalog` needs a type named `All Integrations`, `core/lib/utils/settings-integrations.ts:16`, `:105-110`),
 *   tenant read only with a catalog `:103-107`, row id `:108`, then metadata + repositories in one effect `:115-121`.
 *   Status machine `settings-integrations.ts:279-310`; suspended = metadata `suspended_at` (`:254-266`);
 *   facts `:238-252`; project = the team's default project (`:124-129` → `core/lib/helpers/team-default-project.ts:10-19`);
 *   project settings `:176-188`.
 * - Writes: auto-sync `:175-179` and label-sync `:205-209` → `PUT /api/organization-projects/<projectId>`
 *   (`core/services/client/api/organizations/organization-project.service.ts:129-142`), each rolled back when the hook
 *   resolves without a project (`:180-183`, `:210-212`, `core/hooks/organizations/projects/use-edit-organization-project.ts:75-84`);
 *   sync tag `:231` → `PUT /api/organization-projects/setting/<projectId>`
 *   (`organization-project.service.ts:37-51`); link → `POST /api/integration/github/repository/sync`
 *   (`core/services/client/api/integrations/github.service.ts:121-123` — the path carries **no** integration-row id)
 *   and then, only when that answer has `data.id`, `PUT …/setting/<id>` with `customFields.repositoryId`
 *   (`use-github-integration.ts:129-145`); unlink → `PUT …/setting/<id>` with `repositoryId: null` and both switches
 *   false (`use-github-integration-settings.ts:296-316`); remove → `DELETE /api/integration-tenant/<id>` then a tenant
 *   refetch (`:318-329`, `integration-tenant.service.ts:44-49`); retry → `refetchQueries(queryKeys.integrations.all)`
 *   (`:331-336`).
 * - GitHub UI (`core/components/settings/pages/integrations/github-provider.tsx`): body switch `:403-425`; install row
 *   `:63-95` (note `INSTALL_NOTE` when an install URL exists, else `INSTALL_UNAVAILABLE` `:66-70`; enabled `<a href>`
 *   `:81-87`, disabled `<Button type="button">` `:88-92`); connected header button `:317-337` + `GithubStateChip`
 *   `:97-111`; facts `:122-148`; suspended note `:150-165`; project rows `:285-302` (`NO_PROJECT` / `NO_REPOSITORIES` /
 *   repository row + sync rows only when a repository is linked); repository select `:175-233`; sync rows `:235-283`
 *   (label switch only under auto-sync, the tag row only under label sync); danger row `:345-352` →
 *   `github-remove-dialog.tsx:22-79` over `core/components/settings/kit/danger.tsx:64-186`; the two error notices
 *   `:371-401` over `core/components/common/notice.tsx:36-64`.
 * - Providers (`…/linear-provider.tsx`, `…/asana-provider.tsx`, `…/trello-provider.tsx`, `…/jira-provider.tsx`):
 *   the six-state mapping `core/hooks/integrations/integration-provider-status.ts:30-36`; the status read
 *   `GET /api/integration/<provider>/status?organizationId=…` (`linear.service.ts:15,25`, `asana.service.ts:16,26`,
 *   `trello.service.ts:15,25`, `jira.service.ts:21,31`) is sent only with the deployment flag on
 *   (`core/lib/utils/integration-{linear,asana,trello,jira}-enabled.ts:9` require `=== 'true'`) **and** a known
 *   organization (`use-linear-integration.ts:165,195` etc.). Connect = `POST /api/integration/<provider>/install/state`
 *   then `window.location.assign(authorizeUrl)` in the **same tab** (`use-linear-integration.ts:92-94,276,281`,
 *   `use-asana-integration.ts:99-101,259,264`, `use-trello-integration.ts:89-91`, `use-jira-integration.ts:104-106`).
 * - Copy read from `locales/en.json` by key (never typed): `settings.entries.integrations.TITLE` `:4712`,
 *   `settings.integrations.APPS_TITLE` `:4775`, `settings.integrations.github.*` `:4777-4818`,
 *   `settings.integrations.{linear,asana,trello,jira}.*` `:4820-5079`, `settings.common.MANAGERS_ONLY_*` `:4771-4772`,
 *   `settings.common.EDIT_FIELD` `:4769`, `notifications.RETRY` `:4158`, `common.{REMOVE,CANCEL,SAVE,EDIT}` `:202,308,298,297`,
 *   `pages.settingsTeam.INSTALL` `:2639`, `pages.settingsTeam.everPlatform.TITLE` `:2701`,
 *   `timeImport.entry.TITLE` `:8279`, `invoices.payments.TITLE` `:8116`,
 *   `toasts.MUTATION_FAILED` `:4322` and `toasts.REASONS.INVALID` `:4330` (the reason `core/lib/utils/error-feedback.ts`
 *   picks for a 4xx).
 *
 * ## Where every pinned number came from (measure first, then pin)
 *
 * `-probe-integrations-run1.log` (P1/P2: the page as the mock answers it, the served connected panel, the facts, the
 * select, `manage link count 0`); `-run4.log` (R2 the remove dialog's text, R3 the three write bodies, the refused
 * PUT's toasts and console); `-run5.log` (S1 the sync POST + the setting PUT and the reload after, S2 the flags kept
 * across a reload, the panel after a confirmed Remove, S3 the unlink body and the reload after); `-run7.log` (U1 the
 * not-connected page and the two load reads with their exact queries, U2 the provider rows, the connected Linear row,
 * the Connect POST and the mock-origin landing). `-run2.log`/`-run3.log` are the same measurements through the locators
 * that were wrong (`role="button"` for a `role="switch"`, `Remove GitHub` for the row's `Remove` button, and a sync
 * path with an integration-row id in it, which the service never sends). `-s3-lane-b-integrations-dry1.log` and
 * `-dry2.log` are this file's own first two runs, and they are where three more things were measured and then named:
 * a refused project `PUT` also prints the mutation hook's own `Failed to edit the organization project` line
 * (`core/hooks/organizations/projects/use-edit-organization-project.ts:80`, the catch that returns `undefined` and so
 * makes the rollback happen); the tenant read's four `where[…]` keys reach the browser percent-encoded
 * (`where%5Bname%5D=Github`); and a provider detail read left to the mock's catch-all `{ items: [], total: 0 }` makes
 * the connected Linear row throw `runs.some is not a function`, which drops the whole page into its error boundary —
 * every read of a provider row is therefore answered here.
 *
 * ## What this file does NOT cover (and why)
 *
 * - **The enabled GitHub install link is not reachable on this lane.** The lane writes `NEXT_PUBLIC_GITHUB_APP_NAME: ''`
 *   (`playwright/test-servers.ts:150`) and `githubInstallUrlOf` returns `''` for an empty app name
 *   (`core/lib/utils/settings-integrations.ts:329-332`), so `GithubInstallRow` renders the disabled button with the
 *   unavailable note (`github-provider.tsx:88-92`) and no href. That disabled state is pinned here (test 1); the URL
 *   builder itself is not reachable from a browser on this lane, and it has no unit test either:
 *   `core/lib/utils/settings-integrations.ts` has no test beside it and no test file in `apps/web` imports it (the
 *   helper tests in that folder are `integration-{asana-section,jira-status,linear-state,trello-list}-map.test.ts` and
 *   `integration-sync-conflicts.test.ts`), and `githubInstallUrlOf` is referenced only by `settings-integrations.ts`
 *   and `use-github-integration-settings.ts`.
 * - **"Manage on GitHub" can never be made to point at this lane.** `githubInstallationFactsOf` keeps `html_url` only
 *   through `githubPageOf` (`settings-integrations.ts:88-103`): `const isHttps = url.protocol === 'https:';` /
 *   `const isGithub = url.hostname === 'github.com';` — anything else becomes `null`, and the link is rendered only
 *   `{facts.manageUrl && …}` (`github-provider.tsx:145`). So the only href the component would render is a
 *   `github.com` one, which this file's guard forbids the browser to reach; test 2 pins the measured consequence
 *   (no anchor at all for a mock-origin `html_url`) instead of forcing a click.
 * - Not covered: the Ever Platform section and the usage-statistics switch (`suites/mock/ever-settings.spec.ts`,
 *   `suites/mock/ever-platform.spec.ts`); the return page `/integration/github` (`suites/lane-b/github-integrations-return-ui.spec.ts`);
 *   the server-side `/api/integration/*` route twins (`suites/lane-b/integration-connect-routes.spec.ts`); the connected
 *   Asana / Trello / Jira panels and every mapping, run and conflict write (their components have unit tests beside
 *   them); Trello's token return (`POST /api/integration/trello/connect`, `use-trello-integration.ts:172-187`) — it
 *   needs a `?provider=trello` return with a token in the hash, which is the provider's own flow, not this page's;
 *   the Import and invoice-payments sections' writes (the Import section is static, `import-section.tsx:20-44`).
 * - Strict Mode's double mount (`playwright/helpers.ts:37-43`) is why the GitHub reads arrive twice on a cold load in
 *   some runs (`S2 served team read count 4` for two loads); no test here pins a request count for a read that failed.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The two hosts a page on this lane may call. Nothing else is allowed, and nothing else was seen. */
const ALLOWED_ORIGINS = new Set([APP_ORIGIN, MOCK_API_ORIGIN]);

const PAGE_PATH = '/settings/team/integrations';

/** This file's own ids: nothing here is a real installation id, tenant row id or repository id. */
const INTEGRATION_ROW_ID = 'probe6-gh-row-1';
const LINEAR_INTEGRATION_ID = 'probe6-linear-1';
const REPO_A = { id: 900000001, name: 'probe-repo-a', full_name: 'probe-org/probe-repo-a' };
const REPO_B = { id: 900000002, name: 'probe-repo-b', full_name: 'probe-org/probe-repo-b' };
/** The landing page this file's `authorizeUrl` sends the browser to, on the mock origin. */
const AUTHORIZE_PATH = '/probe-oauth/asana';

const metadataPath = `/api/integration/github/${INTEGRATION_ROW_ID}/metadata`;
const repositoriesPath = `/api/integration/github/${INTEGRATION_ROW_ID}/repositories`;
const SYNC_PATH = '/api/integration/github/repository/sync';
const TENANT_ROUTE = '/api/integration-tenant';
const TYPES_ROUTE = '/api/integration/types';
const TEAMS_LIST_ROUTE = '/api/organization-team';
/** The four provider sections this file drives (`integrations-settings-page.tsx:56-59`). */
const PROVIDERS = ['linear', 'asana', 'trello', 'jira'] as const;

/** The installed date this file serves, and how `formatInstallDay` prints it (`settings-integrations.ts:337-339`). */
const INSTALLED_AT = '2026-01-15T10:00:00.000Z';
const SUSPENDED_AT = '2026-09-01T08:00:00.000Z';
/**
 * `formatInstallDay` (`settings-integrations.ts:337-339`): `Intl.DateTimeFormat(locale, { dateStyle: 'medium' })` in the
 * browser's zone, which on a lane is the machine's (`playwright.lane.config.ts` sets no `timezoneId`). Computed from the
 * served instants rather than typed, so a machine far east or west of UTC still expects the day its browser prints.
 */
const installDayOf = (iso: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));
const INSTALLED_DAY = installDayOf(INSTALLED_AT);
const SUSPENDED_DAY = installDayOf(SUSPENDED_AT);

/** `locales/en.json`, read by key (line numbers in the header). */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: { REMOVE: string; CANCEL: string; SAVE: string; EDIT: string };
	notifications: { RETRY: string };
	pages: { settingsTeam: { GITHUB: string; INSTALL: string; everPlatform: { TITLE: string } } };
	settings: {
		entries: { integrations: { TITLE: string }; teamGeneral: { TITLE: string } };
		common: { MANAGERS_ONLY_TITLE: string; MANAGERS_ONLY_DESCRIPTION: string; EDIT_FIELD: string };
		integrations: {
			APPS_TITLE: string;
			APPS_DESCRIPTION: string;
			github: Record<string, string>;
			linear: Record<string, string>;
			asana: Record<string, string>;
			trello: Record<string, string>;
			jira: Record<string, string>;
		};
	};
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
	timeImport: { entry: Record<string, string> };
	invoices: { payments: Record<string, string> };
};
const G = EN.settings.integrations.github;

const report = (label: string, value: unknown) =>
	console.log(`[lane-b team-integrations] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

type Traffic = {
	/** Every request the context or a popup made, in the order the browser made them. */
	calls: () => Array<{ method: string; origin: string; path: string; query: string; body: string | null }>;
	/** The calls made after `mark()` was taken — the honest way to read "what the click did". */
	since: (
		mark: number
	) => Array<{ method: string; origin: string; path: string; query: string; body: string | null }>;
	origins: () => string[];
	/** Requests this guard refused, with the host that made them. */
	aborted: () => string[];
	mark: () => number;
};

/**
 * The safety guard, installed before the first navigation of every test (`suites/lane-b/board-page-ui.spec.ts:177-208`).
 * It records every request (a popup's too, through `context.on('page')`) and aborts any host outside the two allowed
 * ones, answering `route.fallback()` for the allowed hosts so the lane shield (`playwright/fixtures.ts:110-112`) still runs.
 */
async function guardHosts(context: BrowserContext): Promise<Traffic> {
	const calls: Array<{ method: string; origin: string; path: string; query: string; body: string | null }> = [];
	const aborted: string[] = [];

	const record = (request: { method: () => string; url: () => string; postData: () => string | null }) => {
		const url = new URL(request.url());
		calls.push({
			method: request.method(),
			origin: url.origin,
			path: url.pathname,
			query: url.searchParams.toString(),
			body: request.postData()
		});
	};
	context.on('request', record);
	context.on('page', (popup) => popup.on('request', record));

	await context.route('**/*', (route, request) => {
		const url = new URL(request.url());
		if (ALLOWED_ORIGINS.has(url.origin)) return route.fallback();
		aborted.push(`${request.method()} ${url.origin}${url.pathname}`);
		return route.abort('blockedbyclient');
	});

	return {
		calls: () => [...calls],
		since: (mark) => calls.slice(mark),
		origins: () => [...new Set(calls.map((call) => call.origin))].sort(),
		aborted: () => [...aborted],
		mark: () => calls.length
	};
}

/**
 * The safety assertion every test ends with: the browser called this lane's app and its mock and nothing else, and
 * this file's guard had to abort nothing.
 */
function expectAllowedHosts(traffic: Traffic, why: string) {
	const seen = traffic.origins();
	const outside = seen.filter((origin) => !ALLOWED_ORIGINS.has(origin));
	expect(
		seen,
		`${why}: the browser called ${JSON.stringify(seen)} — only ${[...ALLOWED_ORIGINS].sort().join(' and ')} may be called`
	).toEqual([...ALLOWED_ORIGINS].sort().filter((origin) => seen.includes(origin)));
	expect(
		outside,
		`${why}: the page reached ${JSON.stringify(outside)}; this file may never let the browser ask a provider`
	).toEqual([]);
	expect(
		traffic.aborted(),
		`${why}: this file's guard had to abort ${JSON.stringify(traffic.aborted())} — nothing outside the two allowed hosts should have been asked for`
	).toEqual([]);
}

/* ------------------------------------------------------------------ the store ------------------------------------------------------------------ */

type Call = { method: string; path: string; query: string; body: string | null };

type Store = {
	tenantRows: Array<Record<string, unknown>>;
	metadata: Record<string, unknown> | null;
	repositories: { total_count: number; repositories: Array<{ id: number; name: string; full_name: string }> };
	project: Record<string, unknown> & { id: string; name: string };
	/** A status answer per provider; `undefined` leaves the read to the mock's catch-all. */
	providerStatus: Record<string, Record<string, unknown>>;
	/** Armed refusal for the two project PUTs; `null` answers them normally. */
	failProjectPut: number | null;
	/** Armed refusal for the GitHub metadata read; `null` answers it normally. */
	failMetadata: number | null;
};

const typesWithCatalog = [
	{ id: 'probe6-type-all', name: 'All Integrations', description: null, icon: null, groupName: 'All', order: 1 },
	{ id: 'probe6-type-github', name: 'Github', description: null, icon: null, groupName: 'Version control', order: 2 }
];

const metadataOf = (overrides: Record<string, unknown> = {}) => ({
	id: 900000001,
	account: { login: 'probe-org', id: 900000002 },
	app_id: 900000003,
	created_at: INSTALLED_AT,
	suspended_at: null,
	// A mock-origin `html_url`: `githubPageOf` (`settings-integrations.ts:88-103`) keeps only a github.com one,
	// which is exactly why this file can serve a manage URL without ever risking a real provider host.
	html_url: `${MOCK_API_ORIGIN}/probe-manage/installations/900000002`,
	...overrides
});

const newStore = (
	ids: Record<string, string>,
	projectGitHub: Record<string, unknown> = {},
	overrides: Partial<Store> = {}
): Store => ({
	tenantRows: [
		{
			id: INTEGRATION_ROW_ID,
			tenantId: ids.tenantA,
			organizationId: ids.organizationA,
			name: 'Github',
			integrationId: 'probe6-integration-1'
		}
	],
	metadata: metadataOf(),
	repositories: { total_count: 2, repositories: [REPO_A, REPO_B] },
	project: {
		id: ids.project,
		name: 'Probe Project',
		public: true,
		owner: null,
		code: 'PRB',
		currency: 'USD',
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		members: [],
		teams: [],
		tags: [],
		...projectGitHub
	},
	providerStatus: {},
	failProjectPut: null,
	failMetadata: null,
	...overrides
});

const employeeOf = (ids: Record<string, string>, employeeId: string, userId: string, name: string, email: string) => ({
	id: employeeId,
	userId,
	user: {
		id: userId,
		name,
		firstName: name.split(' ')[0],
		lastName: name.split(' ').slice(1).join(' '),
		email,
		timeZone: 'UTC',
		isEmailVerified: true,
		tenantId: ids.tenantA,
		employeeId
	},
	fullName: name,
	isTrackingEnabled: true,
	isTrackingTime: false,
	isActive: true,
	organizationId: ids.organizationA,
	tenantId: ids.tenantA
});

/** The team, in the shape the mock's own `buildData` answers (`mock-gauzy-server.mjs:236-256`), its one project read
 *  out of the store on every call — which is what makes a write visible to the next read. */
const teamOf = (ids: Record<string, string>, store: Store) => {
	const rows = [
		{
			id: ids.member,
			employee: employeeOf(ids, ids.employee, ids.user, 'Fixture Manager', 'manager@example.test'),
			isManager: true
		},
		{
			id: ids.teammateMember,
			employee: employeeOf(
				ids,
				ids.teammateEmployee,
				ids.teammateUser,
				'Fixture Teammate',
				'teammate@example.test'
			),
			isManager: false
		}
	].map((row) => ({
		id: row.id,
		employeeId: row.employee.id,
		employee: row.employee,
		user: row.employee.user,
		isManager: row.isManager,
		isActive: true,
		isTrackingEnabled: true,
		activeTaskId: null,
		activeTask: null,
		organizationTeamId: ids.teamA,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		roleId: ids.role,
		role: {
			id: ids.role,
			name: row.isManager ? 'ADMIN' : 'EMPLOYEE',
			isSystem: true,
			rolePermissions: [],
			tenantId: ids.tenantA
		},
		totalWorkedTasks: [],
		totalTodayTasks: []
	}));
	return {
		id: ids.teamA,
		name: 'Fixture Team One',
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		public: true,
		profile_link: 'fixture-team',
		prefix: 'FIX',
		shareProfileView: false,
		requirePlanToTrack: false,
		members: rows,
		managers: rows.filter((row) => row.isManager),
		projects: [store.project],
		tasks: [],
		statuses: []
	};
};

type StoreHarness = {
	/** Everything this file's stand-in was asked, in arrival order. */
	calls: Call[];
	/** Non-GET calls as `METHOD path body`. */
	writes: () => string[];
	/** The calls after `mark()`, non-GET. */
	writesSince: (mark: number) => string[];
	/** Mock-origin calls the guard recorded for a path (the witness that a read was or was not asked). */
	countOf: (method: string, path: string) => number;
	/** Polls this stand-in until a call matching the predicate was asked, then returns it. */
	waitFor: (predicate: (call: Call) => boolean) => Promise<Call>;
};

/**
 * The served store, on the mock origin. Never `route.fetch()`: a served path leaves the mock's log empty, which is the
 * proof the page acted on this answer. A path left out is left to the mock — that is how the reads of a section this
 * file does not model (the task list, the Ever Platform reads, `/api/organization-projects`) keep answering normally.
 */
async function serveStore(page: Page, ids: Record<string, string>, store: Store): Promise<StoreHarness> {
	const calls: Call[] = [];
	const projectPath = `/api/organization-projects/${store.project.id}`;
	const settingPath = `/api/organization-projects/setting/${store.project.id}`;
	const teamDetailPath = `/api/organization-team/${ids.teamA}`;
	const servedPaths = [
		TYPES_ROUTE,
		TENANT_ROUTE,
		metadataPath,
		repositoriesPath,
		SYNC_PATH,
		TEAMS_LIST_ROUTE,
		teamDetailPath,
		projectPath,
		settingPath,
		...PROVIDERS.map((provider) => `/api/integration/${provider}/status`),
		...PROVIDERS.map((provider) => `/api/integration/${provider}/install/state`)
	];
	// Every read a provider row can send is answered here, not left to the mock's catch-all: the connected row's
	// detail readers call array methods on what they get, and the catch-all's `{ items: [], total: 0 }` is not an
	// array — measured in `-s3-lane-b-integrations-dry2.log`, where that left `runs.some is not a function` and the
	// whole page fell into its error boundary (no provider section rendered at all).
	const providerPrefixes = PROVIDERS.map((provider) => `/api/integration/${provider}/`);

	const answerFor = (path: string): unknown => {
		if (path === TYPES_ROUTE) return typesWithCatalog;
		if (path === TENANT_ROUTE) return { items: store.tenantRows, total: store.tenantRows.length };
		if (path === metadataPath) return store.metadata;
		if (path === repositoriesPath) return store.repositories;
		if (path === TEAMS_LIST_ROUTE) return { items: [teamOf(ids, store)], total: 1 };
		if (path === teamDetailPath) return teamOf(ids, store);
		if (path === projectPath) return store.project;
		if (path === settingPath) {
			return {
				organizationProjectId: store.project.id,
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				customFields: store.project.customFields ?? {},
				isTasksAutoSync: store.project.isTasksAutoSync ?? false,
				isTasksAutoSyncOnLabel: store.project.isTasksAutoSyncOnLabel ?? false,
				syncTag: store.project.syncTag ?? ''
			};
		}
		for (const provider of PROVIDERS) {
			const prefix = `/api/integration/${provider}/`;
			if (!path.startsWith(prefix)) continue;
			const tail = path.slice(prefix.length);
			if (tail === 'status') return store.providerStatus[provider];
			if (tail === 'install/state')
				return { state: 'probe6-state', authorizeUrl: `${MOCK_API_ORIGIN}${AUTHORIZE_PATH}` };
			// What a connected row reads (`linear.service.ts` and its twins): the mappings, its teams, the runs and the
			// conflicts. The shapes are the ones the readers index directly — `-probe-integrations-run7.log` for Linear.
			if (
				tail.endsWith('/mappings') ||
				tail.endsWith('/runs') ||
				tail.endsWith('/workspaces') ||
				tail.endsWith('/projects') ||
				tail.endsWith('/sections')
			)
				return [];
			if (tail.endsWith('/teams')) return [{ id: 'probe6-team-1', key: 'PLT', name: 'Probe Team' }];
			if (tail.endsWith('/conflicts')) return { items: [], total: 0 };
			// A connected Asana / Trello / Jira panel is not driven here (see the header); this only keeps a stray
			// detail read from handing a reader something it cannot index.
			if (tail.endsWith('/metadata')) return { workspaces: [], projects: [], sections: [], members: [] };
			return store.providerStatus[provider]?.connection ?? null;
		}
		return { items: [], total: 0 };
	};

	await page.route(
		(url: URL) =>
			url.origin === MOCK_API_ORIGIN &&
			(servedPaths.some((path) => url.pathname === path) ||
				url.pathname.startsWith('/api/integration-tenant/') ||
				providerPrefixes.some((prefix) => url.pathname.startsWith(prefix))),
		(route) => {
			const request = route.request();
			const path = new URL(request.url()).pathname;
			if (request.method() === 'OPTIONS') {
				void route.fulfill({ status: 204, headers: CORS_HEADERS });
				return;
			}
			calls.push({
				method: request.method(),
				path,
				query: new URL(request.url()).searchParams.toString(),
				body: request.postData()
			});
			const json = (status: number, payload: unknown) =>
				void route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});

			if (path === metadataPath && store.failMetadata !== null) {
				json(store.failMetadata, {
					statusCode: store.failMetadata,
					message: 'Synthetic team-integrations refusal (metadata)'
				});
				return;
			}
			if (path === SYNC_PATH) {
				// The answer this file gives carries a `data.id`, which is what the mutation's side-effect PUT needs
				// (`use-github-integration.ts:136-145`); a mock echo of the request body would not.
				const sent = JSON.parse(request.postData() ?? '{}') as { repository?: { id?: number } };
				json(200, { id: sent.repository?.id ?? REPO_A.id, name: REPO_A.name, full_name: REPO_A.full_name });
				return;
			}
			if (request.method() === 'PUT' && (path === projectPath || path === settingPath)) {
				if (store.failProjectPut !== null) {
					json(store.failProjectPut, {
						statusCode: store.failProjectPut,
						message: 'Synthetic team-integrations refusal (PUT)'
					});
					return;
				}
				const data = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
				const customFields = (data.customFields ?? {}) as Record<string, unknown>;
				if ('repositoryId' in customFields) {
					const value = customFields.repositoryId;
					const stored = { ...((store.project.customFields ?? {}) as Record<string, unknown>) };
					if (value === null) {
						delete stored.repository;
					} else {
						const found = store.repositories.repositories.find((repo) => String(repo.id) === String(value));
						stored.repository = { repositoryId: value, fullName: found?.full_name ?? String(value) };
					}
					store.project.customFields = stored;
				}
				for (const key of ['isTasksAutoSync', 'isTasksAutoSyncOnLabel', 'syncTag'] as const) {
					if (key in data) store.project[key] = data[key];
				}
				json(200, answerFor(path));
				return;
			}
			if (request.method() === 'DELETE') {
				// Gauzy drops the integration-tenant row: the next tenant read answers with none, which is what turns
				// the section back into the not-connected install row.
				store.tenantRows = [];
				store.metadata = null;
				json(200, { deleted: true });
				return;
			}
			json(200, answerFor(path));
		}
	);

	return {
		calls,
		writes: () =>
			calls
				.filter((call) => call.method !== 'GET')
				.map((call) => `${call.method} ${call.path} ${call.body ?? '<no body>'}`),
		writesSince: (mark) =>
			calls
				.slice(mark)
				.filter((call) => call.method !== 'GET')
				.map((call) => `${call.method} ${call.path} ${call.body ?? '<no body>'}`),
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		waitFor: async (predicate) => {
			await expect
				.poll(() => calls.find(predicate) ?? null, { timeout: 30_000, intervals: [250] })
				.not.toBeNull();
			return calls.find(predicate) as Call;
		}
	};
}

/* ------------------------------------------------------------------ the page helpers ------------------------------------------------------------------ */

/** Raises the navigation allowance for a cold Turbopack compile of this route (the reason is spelled out at
 *  `suites/lane-b/task-property-settings-ui.spec.ts:766-768`); no assertion below waits on a duration. */
test.use({ navigationTimeout: 120_000 });

const panel = (page: Page) => page.locator('section#github');
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** The GitHub section's rows as printed, in DOM order. */
const panelText = async (page: Page) => flat(await panel(page).innerText());
/** The `dd` values of the facts grid, in the order the component prints them (`github-provider.tsx:122-146`). */
const factValues = async (page: Page) => (await panel(page).locator('dd').allInnerTexts()).map(flat);
/** Every `role="switch"` of the GitHub section as `<its label> = <aria-checked>`, read in the browser. */
const switchStates = (page: Page) =>
	panel(page)
		.locator('[role="switch"]')
		.evaluateAll((nodes) =>
			nodes.map(
				(node) =>
					`${document.querySelector(`label[for="${(node as HTMLElement).id}"]`)?.textContent ?? '<no label>'} = ${node.getAttribute('aria-checked')}`
			)
		);

/** The `Edit <field>` button of a `settings.common.EDIT_FIELD` inline row (`inline-text-row.tsx:120-127`). */
const editFieldButton = (page: Page, field: string) =>
	panel(page).getByRole('button', { name: EN.settings.common.EDIT_FIELD.replace('{field}', field) });

const connectButton = (page: Page, provider: 'linear' | 'asana' | 'trello' | 'jira') =>
	page.getByRole('button', { name: EN.settings.integrations[provider].CONNECT });

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1075`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `core/components/common/mutation-error-toaster.tsx:47-49`: dev mode logs every failed mutation, whoever handles it. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** The dev-only toast's title for a failed mutation (`core/components/common/dev-error-toaster.tsx:17`, not in `locales/en.json`). */
const DEV_TOAST_MUTATION = 'Mutation failed';
/**
 * `core/hooks/organizations/projects/use-edit-organization-project.ts:80`: the mutation hook catches the refusal and
 * logs it itself — that catch is what returns `undefined` and lets the switch roll back
 * (`use-github-integration-settings.ts:180-183`), so it is part of the behaviour this test pins, not a finding.
 */
const ROLLBACK_LOG = 'Failed to edit the organization project';
/**
 * The client's own line for a refusal this file armed (`core/services/client/api.service.ts:245` `_handleAxiosError`),
 * spelled **without** the `/api` prefix the axios base carries. A read whose query the client logs inside the path is
 * named by its front only (`suites/lane-b/github-integration-return-ui.spec.ts:349-354`).
 */
const armedHttpError = (verb: string, api: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${api} ${status}`;
const armedHttpErrorFront = (verb: string, api: string) => `[ERROR] [HttpClient] HTTP Error: ${verb} ${api}`;
/** A path the mock records (`/api/…`) as the client logs it (without that `/api`). */
const loggedPathOf = (mockPath: string) => mockPath.slice('/api'.length);

/** What a silence assertion may be empty about: only these exact, named lines. */
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** A DEV toast carrying `text` (`core/components/common/dev-error-toaster.tsx:17-18,158`). Only ever asserted as
 *  "appeared": toasts arrive and expire on their own timer. */
const toastOf = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });

const githubIds = (fixture: { ids: Record<string, string> }) => fixture.ids;

test.describe('lane-b · /settings/team/integrations: the team’s GitHub row and the provider rows', () => {
	test('a manager whose team has no GitHub integration: the page as printed, the install note, the disabled button, and the two reads at load', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const ids = githubIds(fixture);
		// The catalog is there, so the tenant read really goes out — and it answers with no row, which is the
		// `notConnected` branch of `githubConnectionStatusOf` (`settings-integrations.ts:295-297`).
		const store = newStore(ids);
		const served = await serveStore(page, ids, { ...store, tenantRows: [], metadata: null });
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(panel(page).getByText(G.INSTALL_UNAVAILABLE)).toBeVisible({ timeout: 45_000 });
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(EN.settings.entries.integrations.TITLE);
		await expect(page.getByRole('heading', { level: 2 })).toHaveText([
			EN.settings.integrations.APPS_TITLE,
			EN.timeImport.entry.TITLE,
			EN.invoices.payments.TITLE,
			EN.pages.settingsTeam.everPlatform.TITLE
		]);
		// The four provider sections render nothing: the lane server writes none of the four
		// `NEXT_PUBLIC_INTEGRATION_*_ENABLED` flags, so `integrationProviderStatus` returns `hidden`
		// (`integration-provider-status.ts:31`, `integration-linear-enabled.ts:9`).
		await expect(page.locator('section#linear, section#asana, section#trello, section#jira')).toHaveCount(0);
		report('not connected panel', await panelText(page));
		report(
			'section ids in order',
			await page.locator('section[id]').evaluateAll((nodes) => nodes.map((node) => node.id))
		);

		// The blank `NEXT_PUBLIC_GITHUB_APP_NAME` (`test-servers.ts:150`) means no install URL
		// (`settings-integrations.ts:329-332`), so the row holds a disabled button and no href (`github-provider.tsx:88-92`).
		const installButton = page.getByRole('button', { name: EN.pages.settingsTeam.INSTALL });
		await expect(installButton).toBeVisible();
		await expect(installButton).toBeDisabled();
		await expect(page.getByRole('link', { name: EN.pages.settingsTeam.INSTALL })).toHaveCount(0);

		// The two reads the page sends at load, path + query as sent.
		const typesCall = await served.waitFor((call) => call.path === TYPES_ROUTE);
		await served.waitFor((call) => call.path === TENANT_ROUTE);
		await expect.poll(() => served.countOf('GET', TENANT_ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
		report(
			'load reads',
			served.calls.map((call) => `${call.method} ${call.path}?${call.query}`)
		);
		expect(typesCall.query).toBe('');
		// Sorted, because concurrent reads arrive in race order; the query keys are exactly what
		// `integration-tenant.service.ts:13-19` builds for the direct-API branch. Each pair is decoded first: the
		// client sends the `[` `]` of `where[…]` percent-encoded (`…%5Bname%5D=Github`), which is how the browser sends
		// them, and the pinned key names are the ones the service writes.
		await expect(
			served.calls
				.filter((call) => call.path === TENANT_ROUTE)[0]
				.query.split('&')
				.map((pair) => decodeURIComponent(pair))
				.sort()
		).toEqual([
			`where[name]=Github`,
			`where[organizationId]=${ids.organizationA}`,
			`where[tenantId]=${ids.tenantA}`
		]);
		// A quiet window, 2 s: it proves the metadata / repositories reads were **not** asked at all — with no
		// integration row there is nothing to address them with (`use-github-integration-settings.ts:115-121`).
		await new Promise((done) => setTimeout(done, 2_000));
		expect(traffic.calls().filter((call) => call.path.startsWith('/api/integration/github/'))).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
		report(
			'mock log integration paths',
			(await mock.requests())
				.filter((request) => request.path.startsWith('/api/integration/'))
				.map((request) => `${request.method} ${request.path}`)
		);
		expectAllowedHosts(traffic, 'the integrations page with no GitHub integration');
	});

	test('a connected GitHub tenant: the Connected chip, the facts as printed, the repository select — and no manage link off github.com', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = githubIds(fixture);
		const store = newStore(ids);
		await serveStore(page, ids, store);
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(panel(page).getByText(G.STATE_CONNECTED, { exact: true })).toBeVisible({ timeout: 45_000 });
		await expect(panel(page).getByText(G.SUMMARY_CONNECTED.replace('{account}', 'probe-org'))).toBeVisible();
		await expect(panel(page).getByText(G.FACT_REPOSITORIES)).toBeVisible();
		report('connected panel', await panelText(page));
		report('facts', await factValues(page));
		// The four `dd` values in the order the component prints them (`github-provider.tsx:122-146`); the installed
		// day is `Intl.DateTimeFormat(locale, { dateStyle: 'medium' })` of the served `created_at`
		// (`settings-integrations.ts:337-339`).
		await expect
			.poll(() => factValues(page), { timeout: 20_000, intervals: [250] })
			.toEqual(['probe-org', INSTALLED_DAY, '2 shared with Ever Teams', 'Probe Project']);

		// The repository select holds the served repositories, labelled by `full_name`
		// (`settings-integrations.ts:194-220`), and shows the placeholder while nothing is linked.
		const trigger = panel(page).getByRole('combobox');
		await expect(trigger).toHaveText(G.REPOSITORY_PLACEHOLDER);
		await trigger.click({ timeout: 15_000 });
		await expect(page.getByRole('option')).toHaveCount(2);
		await expect(page.getByRole('option')).toHaveText([REPO_A.full_name, REPO_B.full_name]);
		// Base UI's list is a document portal that holds pointer events while open: close it before touching anything else.
		await page.keyboard.press('Escape');
		await expect(page.getByRole('option')).toHaveCount(0);
		await expect(panel(page).getByRole('switch')).toHaveCount(0);

		// The served `html_url` is on the mock origin, so `githubPageOf` (`settings-integrations.ts:88-103`) returns
		// null and the manage anchor is never rendered (`github-provider.tsx:145`).
		await expect(page.getByText(G.MANAGE_ON_GITHUB)).toHaveCount(0);
		expect(consoleFindings(shield)).toEqual([]);
		expectAllowedHosts(traffic, 'a connected GitHub tenant');
	});

	test('linking a repository sends the sync POST and then the setting PUT, and a reload shows the link', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = githubIds(fixture);
		const store = newStore(ids);
		const served = await serveStore(page, ids, store);
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		const trigger = panel(page).getByRole('combobox');
		await expect(trigger).toHaveText(G.REPOSITORY_PLACEHOLDER, { timeout: 45_000 });
		const mark = served.calls.length;
		await trigger.click({ timeout: 15_000 });
		await page.getByRole('option', { name: REPO_B.full_name }).click({ timeout: 15_000 });

		// Both writes are read out of this file's own stand-in, polled until they are there (`brief-common`: a request is
		// never read from a log once, right after some text appears).
		await served.waitFor((call) => call.method === 'POST' && call.path === SYNC_PATH);
		await served.waitFor(
			(call) => call.method === 'PUT' && call.path === `/api/organization-projects/setting/${ids.project}`
		);
		const writes = served.writesSince(mark);
		report('link writes', writes);
		expect(writes).toEqual([
			`POST ${SYNC_PATH} ${JSON.stringify({
				installationId: '900000001',
				repository: REPO_B,
				tenantId: ids.tenantA,
				organizationId: ids.organizationA
			})}`,
			`PUT /api/organization-projects/setting/${ids.project} ${JSON.stringify({
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				customFields: { repositoryId: REPO_B.id }
			})}`
		]);

		// The panel shows the link without a reload (`applyEdits`, `use-github-integration-settings.ts:256`), and the
		// sync rows appear beside it only now (`github-provider.tsx:299`).
		await expect(trigger).toHaveText(REPO_B.full_name);
		await expect(panel(page).getByRole('button', { name: G.UNLINK })).toBeVisible();
		await expect(panel(page).getByRole('switch', { name: G.AUTO_SYNC_LABEL })).toBeVisible();

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(panel(page).getByText(G.STATE_CONNECTED, { exact: true })).toBeVisible({ timeout: 45_000 });
		await expect(panel(page).getByRole('combobox')).toHaveText(REPO_B.full_name);
		await expect(
			panel(page).getByText(G.REPOSITORY_DESCRIPTION_LINKED.replace('{project}', 'Probe Project'))
		).toBeVisible();
		// What the reload keeps, as printed by the run: the link, and the sync options back at their stored values
		// (the store held no `isTasksAutoSync`, so auto-sync is off).
		await expect.poll(() => switchStates(page)).toEqual([`${G.AUTO_SYNC_LABEL} = false`]);
		report('after link reload', { facts: await factValues(page), switches: await switchStates(page) });
		expect(consoleFindings(shield)).toEqual([]);
		expectAllowedHosts(traffic, 'linking a repository');
	});

	test('unlinking sends repositoryId null with both switches off, and the reload shows an empty select and no sync rows', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = githubIds(fixture);
		const store = newStore(ids, {
			customFields: { repository: { repositoryId: REPO_A.id, fullName: REPO_A.full_name } },
			isTasksAutoSync: true,
			isTasksAutoSyncOnLabel: true,
			syncTag: 'github-sync'
		});
		const served = await serveStore(page, ids, store);
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		const unlink = panel(page).getByRole('button', { name: G.UNLINK });
		await expect(unlink).toBeVisible({ timeout: 45_000 });
		// Its accessible name names the linked repository (`github-provider.tsx:225`, `UNLINK_REPOSITORY {repository}`).
		await expect(unlink).toHaveAccessibleName(`${G.UNLINK_REPOSITORY.replace('{repository}', REPO_A.full_name)}`);
		await expect
			.poll(() => switchStates(page))
			.toEqual([`${G.AUTO_SYNC_LABEL} = true`, `${G.LABEL_SYNC_LABEL} = true`]);

		const mark = served.calls.length;
		await unlink.click({ timeout: 15_000 });
		await served.waitFor(
			(call) => call.method === 'PUT' && call.path === `/api/organization-projects/setting/${ids.project}`
		);
		report('unlink writes', served.writesSince(mark));
		expect(served.writesSince(mark)).toEqual([
			`PUT /api/organization-projects/setting/${ids.project} ${JSON.stringify({
				customFields: { repositoryId: null },
				isTasksAutoSync: false,
				isTasksAutoSyncOnLabel: false,
				tenantId: ids.tenantA,
				organizationId: ids.organizationA
			})}`
		]);
		// Measured, untagged: one PUT carries the unlink **and** both switches off
		// (`use-github-integration-settings.ts:296-310`), so the sync rows leave with the link.
		await expect(panel(page).getByRole('switch')).toHaveCount(0);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(panel(page).getByRole('combobox')).toHaveText(G.REPOSITORY_PLACEHOLDER, { timeout: 45_000 });
		await expect(
			panel(page).getByText(G.REPOSITORY_DESCRIPTION_EMPTY.replace('{project}', 'Probe Project'))
		).toBeVisible();
		await expect(panel(page).getByRole('switch')).toHaveCount(0);
		await expect(panel(page).getByText('github-sync')).toHaveCount(0);
		report('after unlink reload', await panelText(page));
		expect(consoleFindings(shield)).toEqual([]);
		expectAllowedHosts(traffic, 'unlinking a repository');
	});

	test('the auto-sync switch, the label switch and the sync tag: one PUT each, and the reload keeps all three', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = githubIds(fixture);
		const store = newStore(ids, {
			customFields: { repository: { repositoryId: REPO_A.id, fullName: REPO_A.full_name } }
		});
		const served = await serveStore(page, ids, store);
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		const projectPath = `/api/organization-projects/${ids.project}`;
		const settingPath = `/api/organization-projects/setting/${ids.project}`;
		await expect(page.getByRole('switch', { name: G.AUTO_SYNC_LABEL })).toBeVisible({ timeout: 45_000 });

		const mark = served.calls.length;
		await page.getByRole('switch', { name: G.AUTO_SYNC_LABEL }).click({ timeout: 15_000 });
		await served.waitFor((call) => call.method === 'PUT' && call.path === projectPath);
		// The label switch is rendered only under auto-sync (`github-provider.tsx:253-262`), so its appearance is the
		// web-first witness that the first PUT landed.
		await expect(panel(page).getByRole('switch', { name: G.LABEL_SYNC_LABEL })).toBeVisible({ timeout: 20_000 });

		await page.getByRole('switch', { name: G.LABEL_SYNC_LABEL }).click({ timeout: 15_000 });
		await served.waitFor(
			(call) =>
				call.method === 'PUT' &&
				call.path === projectPath &&
				(call.body ?? '').includes('isTasksAutoSyncOnLabel')
		);
		// Both switches are one field each, sent as its own PUT to the project (`:175-179`, `:205-209`), with the
		// organization and tenant the service adds.
		report('switch PUTs', served.writesSince(mark));
		expect(served.writesSince(mark)).toEqual([
			`PUT ${projectPath} ${JSON.stringify({ organizationId: ids.organizationA, tenantId: ids.tenantA, isTasksAutoSync: true })}`,
			`PUT ${projectPath} ${JSON.stringify({ organizationId: ids.organizationA, tenantId: ids.tenantA, isTasksAutoSyncOnLabel: true })}`
		]);

		// The tag row shows up only under label sync (`github-provider.tsx:264-276`), empty until saved.
		await expect(panel(page).getByText(G.SYNC_TAG_EMPTY)).toBeVisible();
		await editFieldButton(page, G.SYNC_TAG_LABEL).click({ timeout: 15_000 });
		await panel(page).getByRole('textbox').fill('github-sync');
		await panel(page).getByRole('button', { name: EN.common.SAVE, exact: true }).click({ timeout: 15_000 });
		await served.waitFor(
			(call) => call.method === 'PUT' && call.path === settingPath && (call.body ?? '').includes('syncTag')
		);
		report(
			'sync tag PUT',
			served.calls
				.filter((call) => call.path === settingPath)
				.map((call) => `${call.method} ${call.path} ${call.body}`)
		);
		await expect(
			served.calls
				.filter((call) => call.path === settingPath && call.method === 'PUT')
				.map((call) => `${call.path} ${call.body}`)
		).toEqual([
			`${settingPath} ${JSON.stringify({ syncTag: 'github-sync', tenantId: ids.tenantA, organizationId: ids.organizationA })}`
		]);
		await expect(panel(page).getByText('github-sync')).toBeVisible();

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(panel(page).getByRole('switch', { name: G.LABEL_SYNC_LABEL })).toBeVisible({ timeout: 45_000 });
		// What the reload keeps, read out of the served store through the team read.
		await expect
			.poll(() => switchStates(page))
			.toEqual([`${G.AUTO_SYNC_LABEL} = true`, `${G.LABEL_SYNC_LABEL} = true`]);
		await expect(panel(page).getByText('github-sync')).toBeVisible();
		expect(consoleFindings(shield)).toEqual([]);
		expectAllowedHosts(traffic, 'the sync switches and the sync tag');
	});

	test('a refused switch write: the switch goes back to what it was, the store keeps it, and the person is told', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = githubIds(fixture);
		const store = newStore(ids, {
			customFields: { repository: { repositoryId: REPO_A.id, fullName: REPO_A.full_name } },
			isTasksAutoSync: true,
			isTasksAutoSyncOnLabel: true,
			syncTag: 'github-sync'
		});
		const served = await serveStore(page, ids, store);
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(page.getByRole('switch', { name: G.AUTO_SYNC_LABEL })).toBeVisible({ timeout: 45_000 });
		// Arm the refusal for the writes only from here on; the load reads already answered normally.
		store.failProjectPut = 400;
		await page.getByRole('switch', { name: G.AUTO_SYNC_LABEL }).click({ timeout: 15_000 });
		await served.waitFor((call) => call.method === 'PUT' && (call.body ?? '').includes('isTasksAutoSync'));
		// The optimistic edit is undone when the mutation resolves without a project
		// (`use-github-integration-settings.ts:173-183`), so the switch lands back on its stored value.
		await expect
			.poll(() => switchStates(page), { timeout: 20_000, intervals: [250] })
			.toEqual([`${G.AUTO_SYNC_LABEL} = true`, `${G.LABEL_SYNC_LABEL} = true`]);
		report('switch states after the refused PUT', await switchStates(page));
		report('stored project after the refused PUT', JSON.stringify(store.project));
		expect(String(store.project.isTasksAutoSync)).toBe('true');

		// What the person is told (`core/components/common/mutation-error-toaster.tsx:50-56` + `error-feedback.ts`):
		// the app's own toast with the 4xx reason, and a DEV toast naming the failed mutation.
		await expect(toastOf(page, EN.toasts.MUTATION_FAILED)).toBeVisible({ timeout: 20_000 });
		await expect(toastOf(page, EN.toasts.REASONS.INVALID)).toBeVisible({ timeout: 20_000 });
		// The DEV-mode toast naming the mutation that failed (`core/components/common/dev-error-toaster.tsx`), which
		// dev mode raises for every failed mutation beside the app's own toast.
		await expect(toastOf(page, DEV_TOAST_MUTATION)).toBeVisible({ timeout: 20_000 });
		const armed = armedHttpError('PUT', `/organization-projects/${ids.project}`, 400);
		report('armed refusal line', armed);
		expect(shield.consoleErrors().some((line) => line.includes(armed))).toBe(true);
		expect(consoleFindings(shield, [armed, DEV_MUTATION_NOISE, ROLLBACK_LOG])).toEqual([]);
		await expect(page).toHaveURL(new RegExp(`^${APP_ORIGIN}${PAGE_PATH}$`));
		expectAllowedHosts(traffic, 'a refused switch write');
	});

	test('removing GitHub: the dialog says what it does, Cancel asks for nothing, the confirm DELETEs and the page is back to the install row', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = githubIds(fixture);
		const store = newStore(ids, {
			customFields: { repository: { repositoryId: REPO_A.id, fullName: REPO_A.full_name } }
		});
		const served = await serveStore(page, ids, store);
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		const removeAction = panel(page).getByRole('button', { name: EN.common.REMOVE, exact: true });
		await expect(removeAction).toBeVisible({ timeout: 45_000 });
		await removeAction.click({ timeout: 15_000 });
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		report('dialog text', flat(await dialog.innerText()));
		await expect(dialog.getByText(G.REMOVE_TITLE)).toBeVisible();
		await expect(dialog.getByText(G.REMOVE_DESCRIPTION)).toBeVisible();
		await expect(dialog.getByText(G.REMOVE_UNINSTALLS.replace('{account}', 'probe-org'))).toBeVisible();
		await expect(dialog.getByText(G.REMOVE_STOPS_SYNC)).toBeVisible();
		await expect(dialog.getByText(G.REMOVE_KEEPS_TASKS)).toBeVisible();

		const mark = served.calls.length;
		await dialog.getByRole('button', { name: EN.common.CANCEL, exact: true }).click({ timeout: 15_000 });
		await expect(dialog).toHaveCount(0);
		// Cancel is the quiet window's subject: 2 s in which no DELETE may appear.
		await new Promise((done) => setTimeout(done, 2_000));
		expect(served.writesSince(mark)).toEqual([]);
		await expect(panel(page).getByText(G.STATE_CONNECTED, { exact: true })).toBeVisible();

		await removeAction.click({ timeout: 15_000 });
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		const confirmMark = served.calls.length;
		await dialog.getByRole('button', { name: G.REMOVE_CONFIRM }).click({ timeout: 15_000 });
		await served.waitFor(
			(call) => call.method === 'DELETE' && call.path === `${TENANT_ROUTE}/${INTEGRATION_ROW_ID}`
		);
		report(
			'after confirm',
			served.calls.slice(confirmMark).map((call) => `${call.method} ${call.path}?${call.query}`)
		);
		await expect.poll(() => served.countOf('GET', TENANT_ROUTE), { timeout: 20_000 }).toBeGreaterThan(0);
		// `removeIntegration` refetches the tenant (`use-github-integration-settings.ts:324-325`) and the store now
		// answers it with no row, so the section is the not-connected install row again.
		await expect(panel(page).getByText(G.INSTALL_UNAVAILABLE)).toBeVisible({ timeout: 30_000 });
		await expect(panel(page).getByRole('button', { name: G.REMOVE_LABEL })).toHaveCount(0);
		const installButton = page.getByRole('button', { name: EN.pages.settingsTeam.INSTALL });
		await expect(installButton).toBeVisible();
		await expect(installButton).toBeDisabled();

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(panel(page).getByText(G.INSTALL_UNAVAILABLE)).toBeVisible({ timeout: 45_000 });
		report('panel after the reload', await panelText(page));
		expect(consoleFindings(shield)).toEqual([]);
		expectAllowedHosts(traffic, 'removing GitHub');
	});

	test('a suspended installation: the Suspended chip, the dated note, and the same rows it offered before', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = githubIds(fixture);
		const store = newStore(ids, {
			customFields: { repository: { repositoryId: REPO_A.id, fullName: REPO_A.full_name } }
		});
		store.metadata = metadataOf({ suspended_at: SUSPENDED_AT });
		await serveStore(page, ids, store);
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		// `suspended_at` is the whole decision (`settings-integrations.ts:254-266`, `:306-308`).
		await expect(panel(page).getByText(G.STATE_SUSPENDED, { exact: true })).toBeVisible({ timeout: 45_000 });
		await expect(panel(page).getByText(G.SUMMARY_CONNECTED.replace('{account}', 'probe-org'))).toBeVisible();
		report('suspended panel', await panelText(page));
		// One sentence, printed as one paragraph (`github-provider.tsx:150-165`).
		await expect(panel(page).getByText(G.SUSPENDED_NOTE.replace('{date}', SUSPENDED_DAY))).toBeVisible();
		// What the section still offers: the facts, the linked repository with Unlink, the sync rows and the Remove row.
		await expect
			.poll(() => factValues(page), { timeout: 20_000, intervals: [250] })
			.toEqual(['probe-org', INSTALLED_DAY, '2 shared with Ever Teams', 'Probe Project']);
		await expect(panel(page).getByRole('combobox')).toHaveText(REPO_A.full_name);
		await expect(panel(page).getByRole('button', { name: G.UNLINK })).toBeVisible();
		await expect.poll(() => switchStates(page)).toEqual([`${G.AUTO_SYNC_LABEL} = false`]);
		await expect(panel(page).getByRole('button', { name: EN.common.REMOVE, exact: true })).toBeVisible();
		expect(consoleFindings(shield)).toEqual([]);
		expectAllowedHosts(traffic, 'a suspended installation');
	});

	test('a refused GitHub read: the page says GitHub does not answer, and Try again re-sends the integration reads', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = githubIds(fixture);
		const store = newStore(ids, {
			customFields: { repository: { repositoryId: REPO_A.id, fullName: REPO_A.full_name } }
		});
		store.failMetadata = 500;
		const served = await serveStore(page, ids, store);
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		// A metadata error is `githubError`, not `loadError` (`settings-integrations.ts:298-301`), so the notice is the
		// unreachable one: its title, its hint, and its two actions (`github-provider.tsx:384-401`).
		await expect(panel(page).getByText(G.GITHUB_ERROR_TITLE)).toBeVisible({ timeout: 45_000 });
		await expect(panel(page).getByText(G.GITHUB_ERROR_HINT)).toBeVisible();
		await expect(panel(page).getByRole('button', { name: EN.notifications.RETRY })).toBeVisible();
		await expect(panel(page).getByRole('button', { name: G.REMOVE_LABEL })).toBeVisible();
		report('unreachable panel', await panelText(page));

		const mark = served.calls.length;
		await panel(page).getByRole('button', { name: EN.notifications.RETRY }).click({ timeout: 15_000 });
		await served.waitFor((call) => call.path === metadataPath && served.calls.indexOf(call) >= mark);
		await expect(panel(page).getByText(G.GITHUB_ERROR_TITLE)).toBeVisible();
		const retried = [...new Set(served.calls.slice(mark).map((call) => call.path))].sort();
		report('retry re-sent', {
			retried,
			counts: served.calls.slice(mark).map((call) => `${call.method} ${call.path}`)
		});
		// Which reads `retry` re-sends (`use-github-integration-settings.ts:331-336`, one key for all of them), as sets:
		// how many times each one came back is a retry count and varies, so it is measured, never pinned.
		expect(retried).toEqual([TENANT_ROUTE, TYPES_ROUTE, metadataPath, repositoriesPath].sort());

		const armed = armedHttpErrorFront('GET', loggedPathOf(metadataPath));
		expect(shield.consoleErrors().some((line) => line.includes(armed))).toBe(true);
		expect(consoleFindings(shield, [armed, DEV_MUTATION_NOISE])).toEqual([]);
		expectAllowedHosts(traffic, 'a refused GitHub read');
	});

	test('the provider rows with their flags on: one status read each, a connected row, a Connect that leaves for the mock’s authorizeUrl, and a row that cannot connect', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const ids = githubIds(fixture);
		// `providerStatus` is the third argument (`newStore(ids, projectGitHub, overrides)`): the answers the four
		// provider rows read, which is also what puts their two paths into this file's route matcher.
		const store = newStore(
			ids,
			{},
			{
				providerStatus: {
					linear: {
						configured: true,
						defaultStateMap: {
							triage: 'TODO',
							backlog: 'TODO',
							unstarted: 'IN_PROGRESS',
							started: 'IN_PROGRESS',
							completed: 'DONE',
							canceled: 'DONE'
						},
						connection: {
							id: LINEAR_INTEGRATION_ID,
							organizationId: ids.organizationA,
							linearOrganizationId: 'probe-linear-org',
							linearOrganizationName: 'Probe Linear',
							linearOrganizationUrlKey: 'probe-linear',
							connectedByUserId: null,
							attentionReason: null,
							tokenExpiresAt: null,
							lastSyncedAt: '2026-11-20T10:00:00.000Z',
							createdAt: '2026-10-01T10:00:00.000Z'
						}
					},
					// Configured but not connected: the row offers a live Connect (`integration-provider-status.ts:35`).
					asana: { configured: true, connection: null, webhooks: false, defaultSectionMap: {} },
					// Not set up: the row names why and disables Connect (`linear-provider.tsx:106,116`, `asana-provider.tsx:98,108`,
					// the same shape in the other two components).
					trello: { configured: false, connection: null, webhooks: false, defaultListMap: {} },
					jira: { configured: false, connection: null, webhooks: false, defaultStatusMap: {} }
				}
			}
		);
		const served = await serveStore(page, ids, store);
		// The four deployment flags are what the lane's server never writes; only the browser's readers see this
		// (`playwright/helpers.ts:485`, read at `integration-linear-enabled.ts:9`).
		await overrideRuntimeEnv(page, {
			NEXT_PUBLIC_INTEGRATION_LINEAR_ENABLED: 'true',
			NEXT_PUBLIC_INTEGRATION_ASANA_ENABLED: 'true',
			NEXT_PUBLIC_INTEGRATION_TRELLO_ENABLED: 'true',
			NEXT_PUBLIC_INTEGRATION_JIRA_ENABLED: 'true'
		});
		const traffic = await guardHosts(page.context());
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(page.locator('section#linear')).toBeVisible({ timeout: 45_000 });
		await expect(page.locator('section#asana')).toBeVisible();
		await expect(page.locator('section#trello')).toBeVisible();
		await expect(page.locator('section#jira')).toBeVisible();
		await expect(page.getByRole('heading', { level: 2 })).toHaveText([
			EN.settings.integrations.APPS_TITLE,
			EN.settings.integrations.linear.SECTION_TITLE,
			EN.settings.integrations.asana.SECTION_TITLE,
			EN.settings.integrations.trello.SECTION_TITLE,
			EN.settings.integrations.jira.SECTION_TITLE,
			EN.timeImport.entry.TITLE,
			EN.invoices.payments.TITLE,
			EN.pages.settingsTeam.everPlatform.TITLE
		]);

		// The status read each provider sends, path + query as sent (`linear.service.ts:25` and its three twins), as a
		// set: Strict Mode's double mount can ask each one twice (`playwright/helpers.ts:37-43`).
		const statusReads = () =>
			[
				...new Set(
					served.calls
						.filter((call) => /\/api\/integration\/(linear|asana|trello|jira)\/status$/.test(call.path))
						.map((call) => `${call.method} ${call.path}?${call.query}`)
				)
			].sort();
		await expect
			.poll(statusReads, { timeout: 30_000, intervals: [250] })
			.toEqual(
				['linear', 'asana', 'trello', 'jira']
					.map((provider) => `GET /api/integration/${provider}/status?organizationId=${ids.organizationA}`)
					.sort()
			);
		report('status reads', statusReads());
		// The witness that these four reads were answered by this file and not by the backend: the mock's own log holds
		// no provider path at all.
		await expect(
			(await mock.requests())
				.filter((request) => /^\/api\/integration\/(linear|asana|trello|jira)/.test(request.path))
				.map((request) => `${request.method} ${request.path}`)
		).toEqual([]);

		// The connected Linear row: its summary, its chip and its facts, all out of the served status
		// (`linear-provider.tsx:481` and the facts grid).
		await expect(
			page
				.locator('section#linear')
				.getByText(EN.settings.integrations.linear.SUMMARY_CONNECTED.replace('{workspace}', 'Probe Linear'))
		).toBeVisible();
		await expect(
			page
				.locator('section#linear')
				.getByText(EN.settings.integrations.linear.STATE_CONNECTED, { exact: true })
				.first()
		).toBeVisible();
		report('linear section', flat(await page.locator('section#linear').innerText()));

		// Not set up: the copy names the missing application, and the button is disabled.
		await expect(
			page.locator('section#jira').getByText(EN.settings.integrations.jira.CONNECT_UNAVAILABLE)
		).toBeVisible();
		await expect(
			page.locator('section#trello').getByText(EN.settings.integrations.trello.CONNECT_UNAVAILABLE)
		).toBeVisible();
		await expect(connectButton(page, 'jira')).toBeDisabled();
		await expect(connectButton(page, 'trello')).toBeDisabled();
		await expect(connectButton(page, 'asana')).toBeEnabled();

		const mark = served.calls.length;
		await connectButton(page, 'asana').click({ timeout: 15_000 });
		await served.waitFor((call) => call.method === 'POST' && call.path === '/api/integration/asana/install/state');
		report(
			'connect POST',
			served.calls
				.slice(mark)
				.filter((call) => call.method !== 'GET')
				.map((call) => `${call.method} ${call.path} ${call.body}`)
		);
		await expect(
			served.calls
				.slice(mark)
				.filter((call) => call.method === 'POST')
				.map((call) => `${call.method} ${call.path} ${call.body}`)
		).toEqual([
			`POST /api/integration/asana/install/state ${JSON.stringify({ organizationId: ids.organizationA, tenantId: ids.tenantA })}`
		]);
		// `window.location.assign(authorizeUrl)` in the same tab (`use-asana-integration.ts:99-101`), and the address it
		// landed on is this file's own path on this lane's mock origin.
		await expect(page).toHaveURL(`${MOCK_API_ORIGIN}${AUTHORIZE_PATH}`, { timeout: 30_000 });
		report('url after Connect', page.url());
		expect(shield.externalCalls()).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
		expectAllowedHosts(traffic, 'the provider rows and a Connect');
	});

	test('a team member who is not a manager: the managers-only notice, and not one integration read', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const traffic = await guardHosts(page.context());
		// Nothing is served here: the mock answers its own fixture team, whose member row it flags
		// `isManager: false` and whose role it names `EMPLOYEE` for this scenario
		// (`mock-gauzy-server.mjs:218`, `:250`, `:73-78`) — so `canManageActiveTeamState` is false
		// (`core/stores/teams/organization-team.ts:199-203`) and the gate refuses (`team-settings-gate.tsx:44,52-54`).
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: { manager: false } });

		await expect(page.getByText(EN.settings.common.MANAGERS_ONLY_TITLE)).toBeVisible({ timeout: 45_000 });
		await expect(page.getByText(EN.settings.common.MANAGERS_ONLY_DESCRIPTION)).toBeVisible();
		await expect(page.getByRole('link', { name: EN.settings.entries.teamGeneral.TITLE }).first()).toBeVisible();
		// No page heading, no sections: `IntegrationsSettingsContent` was never rendered
		// (`integrations-settings-page.tsx:41-65`), so `useGithubIntegrationSettings()` never mounted.
		await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
		await expect(page.locator('section#github')).toHaveCount(0);

		// A quiet window, 2.5 s: it proves no integration read was sent **at all** by anyone on the page, and the mock's
		// own log (not this file's stub — nothing here is stubbed) is the witness.
		await new Promise((done) => setTimeout(done, 2_500));
		const integrationReads = (await mock.requests())
			.filter((request) => request.path.startsWith('/api/integration/'))
			.map((request) => `${request.method} ${request.path}`)
			.sort();
		report('mock integration reads for a non-manager', integrationReads);
		expect(integrationReads).toEqual([]);
		const whatStillWasAsked = [...new Set((await mock.requests()).map((request) => request.path))].sort();
		report('what a refused visit still asks', whatStillWasAsked);
		expect(whatStillWasAsked.some((path) => path.startsWith('/api/organization-projects/setting/'))).toBe(false);
		expect(consoleFindings(shield)).toEqual([]);
		expectAllowedHosts(traffic, 'a non-manager on the integrations page');
	});
});
