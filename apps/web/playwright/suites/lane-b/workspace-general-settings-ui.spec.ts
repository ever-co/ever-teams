import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page, Route } from '@playwright/test';

import { expect, test, type MockControl, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Settings › Workspace › General in a browser: `app/[locale]/(main)/settings/workspace/page.tsx:1-5` →
 * `WorkspaceSettingsPage` (`core/components/settings/pages/workspace/workspace-settings-page.tsx:22-113`), on lane-b
 * (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, `playwright/test-servers.ts:39`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's app and its mock. The mock answers `/api/user/me` (`cypress/support/mock-gauzy-server.mjs:607`),
 * `/api/auth/workspaces` (`:608`), `/api/role-permissions/me` (`:674`), `/api/auth/refresh-token` (`:612`),
 * `/api/auth/switch-organization` (`:617-628`), `/api/timesheet/timer/status` (`:749`) and, for
 * `GET`/`PUT /api/organization/:id`, the *unchanged* fixture organization (`:777`, method-agnostic — a PUT's body is
 * never stored).
 * **Served by this file** (`page.route` on the mock origin, the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`, restating the mock's CORS answer of `mock-gauzy-server.mjs:1087-1101`
 * and answering `OPTIONS` with 204, never `route.fetch()`): a **store** behind `GET`/`PUT /api/organization/:id` (a `PUT`
 * changes what the next `GET` answers; a refused `PUT` changes nothing), `GET /api/organization/count`,
 * `GET /api/organization/:id/counts`, `DELETE /api/organization/:id/soft`, `PUT /api/tenant`,
 * `GET /api/user-organization` (the landing list) and `POST /api/auth/switch-organization`. The store starts from the
 * mock's own organization, read once through the mock, so every id stays the fixture's; the extra fields the mock's
 * fixture organization lacks (`allowBreaks`, `enforcePrivateProjects`, `timeLogsKeepTheirRates`,
 * `durationRoundingInterval/Direction`, `defaultBillRateValue`, `dateFormat`, `numberFormat`, `timeFormat`,
 * `currencyPosition`, `startWeekOn`) are what the sections that render nothing on the bare mock need to render at all.
 * `route.fetch()` is never called: every served path leaves the mock's own log empty, which is the witness that the page
 * acted on this file's answer.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - Sections, in DOM order: `workspace-settings-page.tsx:56-110` — Identity `workspace-identity-section.tsx:26-39`,
 *   Formats `workspace-formats-section.tsx:663-721`, Rates `workspace-rates-section.tsx:75-87`, Breaks
 *   `workspace-breaks-section.tsx`, Private projects `workspace-private-projects-section.tsx`, Data (only with
 *   `dataExport.canExport`, `:95-101`, covered by `suites/lane-a/workspace-data-export.spec.ts`), Danger zone
 *   `workspace-danger-section.tsx:246-266` (not rendered at all without `ALL_ORG_EDIT`, `:242-244`).
 * - Reads of every section: `use-workspace-settings.ts:114-121` → `GET /api/organization/:id`, `/api/auth/workspaces`,
 *   `/api/user/me`, `/api/role-permissions/me`; the name printed is the tenant's (`:103-108`, `:125`). Breaks and Private
 *   projects read the organization again through `use-organization-tracking-requirements.ts:48-49`.
 * - Writes: all of them `PUT /api/organization/:id` with `{ name, currency, …changes }`, `name`/`currency` read again
 *   right before (`organization.service.ts:33-45`), serialized through one promise chain (`use-workspace-settings.ts:159-166`),
 *   each control optimistic (`use-optimistic-setting.ts:11-47`, draft dropped when the save throws); rename adds
 *   `PUT /api/tenant` with `{ name, tenantId }` last (`use-workspace-settings.ts:189-191`, `tenant.service.ts:23-26`).
 * - Gates: `canEdit` = permission `ALL_ORG_EDIT` (`use-workspace-settings.ts:412`, `settings-workspace.ts:24-28`),
 *   `canRename` = role `SUPER_ADMIN` **and** that permission (`:415`, `settings-workspace.ts:34-37`), `canReadRates` =
 *   `holdsRateAdminPermission` (`:414`, `rates.ts:258-260` — `ORG_EMPLOYEES_EDIT` or `CHANGE_SELECTED_EMPLOYEE`),
 *   `canDelete` = `ALL_ORG_EDIT` (`organization-deletion.ts:25-27`).
 * - Copy read from `locales/en.json` by key (never typed): `settings.entries.workspaceGeneral.*`, `settings.workspace.*`
 *   (`IDENTITY_SECTION`, `NAME_*`, `FORMATS_*`, `CURRENCY_*`, `DEFAULT_RATE_*`, `DATE_FORMAT_*`, `NUMBER_FORMAT_*`,
 *   `FORMAT_AUTOMATIC`, `WEEK_START_*`, `TIME_ZONE_*`, `CLOCK_*`, `CURRENCY_POSITION_*`, `ROUNDING_*`, `KEEP_RATES_*`,
 *   `RATES_*`, `READ_ONLY_NOTE`), `settings.workspace.deletion.*`, `breaks.SETTINGS_*`,
 *   `pages.projects.visibility.SETTING_*`, `settings.common.{EDIT_FIELD,TYPE_TO_CONFIRM}`, `rates.*`,
 *   `common.{EDIT,SAVE,CANCEL,CLEAR,CLOSE}`, `notifications.RETRY`, `toasts.REASONS.*`.
 *
 * ## Where every pinned value came from (measure first, then pin)
 *
 * `-probe-ws-3.log` (P1: the bare mock page — sections `workspace`, `formats` only, no control at all, the read-only
 * note; P2: the served page — sections `workspace`, `formats`, `rates`, `workspace-breaks`, `workspace-private-projects`,
 * `danger-zone`, the seven selects/comboboxes with their printed values, the three switch ids
 * `workspace-timeLogsKeepTheirRates`, `workspace-allowBreaks`, `workspace-enforcePrivateProjects`; P3: the date-format
 * options `Automatic, 12/31/2026, 31/12/2026, 31-12-2026, 31.12.2026, 2026-12-31` and that re-picking the value shown
 * sent no write). Then each spec test prints its own `[lane-b workspace-general] MEASURE …` line, which is where the
 * write bodies, the toast sentences, the delete order and the landing are pinned from (`-s3-lane-b-workspacegeneral-*.log`).
 *
 * ## What this file does NOT cover (and why)
 *
 * - The Data section and the export itself, the export failures, and the export offer inside the delete dialog:
 *   `suites/lane-a/workspace-data-export.spec.ts`.
 * - **A role that may not read rates cannot be made on this lane.** `holdsRateAdminPermission` accepts
 *   `ORG_EMPLOYEES_EDIT` (`rates.ts:11`, `:258-260`), which is one of the mock fixture role's five base permissions
 *   (`mock-gauzy-server.mjs:50`), and `scenario.extraPermissions` can only add (`:54-62`) — so `canReadRates` is true
 *   for every scenario this lane can serve, and the default-bill-rate row's rate gate cannot be measured from the
 *   outside. The row itself is measured here (it renders only when the API stores `defaultBillRateValue`,
 *   `workspace-formats-section.tsx:616` + `rates.ts:130-132`).
 * - A rename of a *tenant* the app is not in, the app's own `app/api/**` twins of these routes, and the server-side
 *   guards of the delete (`suites/lane-b/permission-gates-granted.spec.ts`, `suites/lane-b/route-refusals.spec.ts`).
 * - Strict Mode's double mount (`playwright/helpers.ts:37-43`): no test here pins a request count for a read that
 *   failed or for a read that can arrive twice.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const PAGE_PATH = '/settings/workspace';

/**
 * This file's own ids: nothing here is a real organization of the workspace. The landing one is UUID-shaped because the
 * app validates every organization it reads against a UUID schema — measured in -s3-lane-b-workspacegeneral-11.log as
 * `[OrganizationService] Organization validation failed: Validation failed in getOrganizationById API response: id:
 * Invalid UUID` once the landing page read this file's organization.
 */
const LANDING_ORGANIZATION_ID = '33333333-3333-4333-8333-111111111111';
const LANDING_ORGANIZATION_NAME = 'Probe Landing Organization';

const MESSAGES = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as Record<
	string,
	unknown
>;

const rawMessage = (key: string): string => {
	const value = key.split('.').reduce((node: unknown, part) => (node as Record<string, unknown>)?.[part], MESSAGES);
	if (typeof value !== 'string') {
		throw new Error(`locales/en.json has no string at ${key}`);
	}
	return value;
};

/** The `{name}`-style placeholders of `locales/en.json`, filled in. */
const msg = (key: string, values: Record<string, string | number> = {}): string =>
	rawMessage(key).replace(/\{(\w+)\}/g, (whole, name: string) =>
		values[name] === undefined ? whole : String(values[name])
	);

/** A `{count, plural, one {…} other {…}}` sentence of `locales/en.json`, for the count this file served. */
const pluralMsg = (
	key: string,
	count: number,
	variable = 'count',
	values: Record<string, string | number> = {}
): string => {
	const raw = rawMessage(key);
	const pattern = new RegExp(`\\{${variable}, plural, one \\{([^{}]*)\\} other \\{([^{}]*)\\}\\}`);
	const match = raw.match(pattern);
	if (!match) {
		throw new Error(`${key} is not a "${variable}" plural sentence`);
	}
	// The words around the plural block are part of the sentence the page prints (`{count, plural, …} access to this
	// organization`), so the chosen branch is put back between them.
	const branch = count === 1 ? match[1] : match[2];
	return `${raw.slice(0, match.index)}${branch}${raw.slice((match.index ?? 0) + match[0].length)}`
		.replace(/#/g, String(count))
		.replace(/\{(\w+), number\}/g, (whole, name: string) =>
			values[name] === undefined ? whole : new Intl.NumberFormat('en').format(Number(values[name]))
		)
		.replace(/\{(\w+)\}/g, (whole, name: string) => (values[name] === undefined ? whole : String(values[name])));
};

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b workspace-general] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1096`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';

/** Console errors of this page, with only the exact lines a test armed excused (named at the call). */
const consoleFindings = (shield: Shield, armed: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !armed.some((text) => line.includes(text)));

/**
 * The console line the app's HTTP client logs for a request it was refused (`[HttpClient] HTTP Error: …`). Never
 * filtered wholesale: only the tests below arm a refusal, and each one names which.
 */
const HTTP_REFUSAL_LINE = '[HttpClient] HTTP Error';
/** That line for one refusal a test armed: the service path is the API path without `/api`. */
const armedRefusalLine = (method: string, apiPath: string, status: number) =>
	`${HTTP_REFUSAL_LINE}: ${method} ${apiPath.replace(/^\/api/, '')} ${status}`;

/**
 * The same client's line for a 403, which it words differently (`core/services/logs/logger-adapter.service.ts:196,199`):
 * `🚨 CRITICAL: HTTP 403 Forbidden - <method> <url> - Permission Denied`. Armed only by the test whose own refusal
 * produced it, with the measured words of that line quoted here.
 */
const HTTP_FORBIDDEN_TENANT_RENAME_LINE = '🚨 CRITICAL: HTTP 403 Forbidden - PUT /tenant - Permission Denied';

/** The console lines an arming excused, kept visible so an arming is never a cover for an unknown line. */
const excusedConsoleLines = (shield: Shield, armed: string[]) =>
	shield.consoleErrors().filter((line) => armed.some((text) => line.includes(text)));

/** The dev-only `DEV … failed … Copy details` toast (`core/components/common/dev-error-toaster.tsx:17-18`). */
const devToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: 'Copy details' });
/** The app's own toasts (`toast.success` / `toast.error` of the save hooks). */
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' });

type Refusal = { status: number; message: string };

type ServedCall = { method: string; path: string; query: string; body: Record<string, unknown> | null };

type ServedScript = {
	/** Fields this file adds to the mock's own organization in the store. */
	organization?: Record<string, unknown>;
	/** Refuses `PUT /api/organization/:id` with this answer; the store then never moves. A list answers each save in
	 * its turn, the last entry for every save after it. */
	organizationPutRefusal?: Refusal | Refusal[];
	/** Holds every `PUT /api/organization/:id` answer until `releaseOrganizationPuts()`. */
	holdOrganizationPuts?: boolean;
	/** What `PUT /api/tenant` answers: accepted, a refusal, a server error, or nothing at all. */
	tenantRename?: 'accepted' | 'server error' | 'aborted' | Refusal;
	/** `GET /api/organization/:id/counts`: these counts, or this refusal. */
	counts?: Record<string, number> | Refusal;
	/** `GET /api/organization/count`: how many live organizations the workspace has. */
	workspaceOrganizationCount?: number | Refusal;
	/** `DELETE /api/organization/:id/soft`. */
	softDelete?: 'accepted' | Refusal;
	/** The memberships `GET /api/user-organization` answers, i.e. the organizations to land in. */
	memberships?: Array<{ id: string; name: string }>;
	/** `POST /api/auth/switch-organization`: served with a synthetic token, or left to the mock (which refuses). */
	switchOrganization?: 'served' | 'left to the mock';
};

type Served = {
	/** Every call this file served or recorded on the mock origin, oldest first. */
	calls: () => ServedCall[];
	/** The writes only (`PUT`/`DELETE`), oldest first. */
	writes: () => ServedCall[];
	/** What the store answers `GET /api/organization/:id` right now. */
	storedOrganization: () => Record<string, unknown>;
	/** The tenant name this file serves `GET /api/auth/workspaces` with. */
	storedTenantName: () => string;
	/** Answers the `PUT /api/organization/:id` calls held by `holdOrganizationPuts`. */
	releaseOrganizationPuts: () => void;
};

const syntheticToken = (userId: string, organizationId: string) => {
	const segment = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	return `${segment({ alg: 'none', typ: 'JWT' })}.${segment({ sub: userId, organizationId, iat: now, exp: now + 86_400, jti: 'probe-ws' })}.probe-signature`;
};

/**
 * The store behind the organization, plus everything the lane's mock has no handler for. Registered before any
 * navigation, on the mock origin; `route.fetch()` is never called.
 */
async function serveWorkspaceApi(page: Page, organizationId: string, script: ServedScript = {}): Promise<Served> {
	const mockAnswer = (await (await fetch(`${MOCK_API_ORIGIN}/api/organization/${organizationId}`)).json()) as Record<
		string,
		unknown
	>;
	const store: Record<string, unknown> = { ...mockAnswer, ...(script.organization ?? {}) };
	const calls: ServedCall[] = [];

	let releasePuts: () => void = () => undefined;
	let putTurn = 0;
	const putGate = script.holdOrganizationPuts
		? new Promise<void>((resolve) => {
				releasePuts = resolve;
			})
		: Promise.resolve();

	const organizationPath = `/api/organization/${organizationId}`;

	/**
	 * The organization an `/api/organization/:id` read is asked for, as the store answers it. After the delete the app
	 * opens the organization to land in and reads that one by its own id, so it is answered as its own row (the lane's
	 * mock knows only the fixture organization, `mock-gauzy-server.mjs:777`).
	 */
	const answerFor = (pathname: string) => {
		const requestedId = pathname.split('/').pop() ?? organizationId;
		if (requestedId === organizationId) {
			return store;
		}
		const landingName = script.memberships?.find((membership) => membership.id === requestedId)?.name;
		return { ...store, id: requestedId, ...(landingName ? { name: landingName } : {}) };
	};

	await page.route(`${MOCK_API_ORIGIN}/api/organization/**`, async (route, request) => {
		const url = new URL(request.url());
		const method = request.method();
		if (method === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: CORS_HEADERS });
			return;
		}
		const body = postData(request);
		calls.push({ method, path: url.pathname, query: url.search, body });

		if (url.pathname === '/api/organization/count') {
			const answer = script.workspaceOrganizationCount ?? 2;
			if (typeof answer === 'number') {
				await fulfill(route, 200, answer);
				return;
			}
			await fulfill(route, answer.status, { statusCode: answer.status, message: answer.message });
			return;
		}
		if (url.pathname === `${organizationPath}/counts`) {
			const answer = script.counts ?? {
				teams: 2,
				projects: 3,
				members: 5,
				trackedSeconds: 9_000,
				invoices: 4,
				estimates: 1
			};
			if ('status' in answer) {
				await fulfill(route, answer.status, { statusCode: answer.status, message: answer.message });
				return;
			}
			await fulfill(route, 200, answer);
			return;
		}
		if (url.pathname === `${organizationPath}/soft`) {
			const answer = script.softDelete ?? 'accepted';
			if (answer === 'accepted') {
				await fulfill(route, 200, { affected: 1, raw: [] });
				return;
			}
			await fulfill(route, answer.status, { statusCode: answer.status, message: answer.message });
			return;
		}
		if (method === 'PUT') {
			await putGate;
			const refusals = Array.isArray(script.organizationPutRefusal)
				? script.organizationPutRefusal
				: script.organizationPutRefusal
					? [script.organizationPutRefusal]
					: [];
			const refusal = refusals.length === 0 ? undefined : refusals[Math.min(putTurn, refusals.length - 1)];
			putTurn += 1;
			if (refusal) {
				await fulfill(route, refusal.status, { statusCode: refusal.status, message: refusal.message });
				return;
			}
			Object.assign(store, body ?? {});
			await fulfill(route, 200, answerFor(url.pathname));
			return;
		}
		await fulfill(route, 200, answerFor(url.pathname));
	});

	// The lane's mock has no tenant store either: `GET /api/auth/workspaces` always answers the fixture's tenant name
	// (`mock-gauzy-server.mjs:608`), so a rename would print the old name again on the next read. This file keeps the
	// tenant name the way the mock keeps nothing: seeded from the mock's own answer, moved by `PUT /api/tenant`.
	// The mock answers this as `{ workspaces: […], total_workspaces: n }` (`mock-gauzy-server.mjs:289-330`, `:608`).
	const answer = (await (await fetch(`${MOCK_API_ORIGIN}/api/auth/workspaces`)).json()) as {
		workspaces?: Array<Record<string, unknown>>;
	};
	const workspacesAnswer = answer.workspaces ?? [];
	let tenantName = String((workspacesAnswer[0]?.user as { tenant?: { name?: string } })?.tenant?.name ?? '');
	// The read carries a query (`workspace.service.ts:39-43` sends `?includeTeams=true`), so the pattern needs the
	// trailing `**`: without it the mock answered the read itself and always named its own fixture tenant, which is
	// what a rename in the page then printed back as the old name.
	await page.route(`${MOCK_API_ORIGIN}/api/auth/workspaces**`, async (route, request) => {
		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: CORS_HEADERS });
			return;
		}
		const url = new URL(request.url());
		calls.push({ method: request.method(), path: url.pathname, query: url.search, body: null });
		const renamed = workspacesAnswer.map((workspace) => {
			const user = (workspace.user ?? {}) as Record<string, unknown>;
			const tenant = { ...((user.tenant ?? {}) as Record<string, unknown>), name: tenantName };
			return { ...workspace, user: { ...user, tenant } };
		});
		// `workspace.service.ts:39-52` validates the envelope `{ workspaces: […] }`, so it is served as one.
		await fulfill(route, 200, { ...answer, workspaces: renamed, total_workspaces: renamed.length });
	});

	await page.route(`${MOCK_API_ORIGIN}/api/tenant`, async (route, request) => {
		const url = new URL(request.url());
		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: CORS_HEADERS });
			return;
		}
		calls.push({ method: request.method(), path: url.pathname, query: url.search, body: postData(request) });
		const answer = script.tenantRename ?? 'accepted';
		if (answer === 'accepted') {
			const typed = postData(request)?.name;
			if (typeof typed === 'string') {
				tenantName = typed;
			}
			await fulfill(route, 200, { id: 'probe-ws-tenant', name: tenantName });
			return;
		}
		if (answer === 'aborted') {
			await route.abort('connectionrefused');
			return;
		}
		if (answer === 'server error') {
			await fulfill(route, 500, { statusCode: 500, message: 'probe tenant rename refused' });
			return;
		}
		await fulfill(route, answer.status, { statusCode: answer.status, message: answer.message });
	});

	// The delete reads the person's run twice before it lets anything go (`organization-deletion.ts:142-149`,
	// `use-organization-deletion.ts:44-52`): the day's status, which the mock answers from `scenario.timerRunning`
	// (`mock-gauzy-server.mjs:749`), and the last log of any day, which the mock has no route for (its fallback is the
	// 404 at `mock-gauzy-server.mjs:862`). Served as "no log of any day is running", so the run read is a read and not
	// a failure of the counts query.
	await page.route(`${MOCK_API_ORIGIN}/api/timesheet/timer/status/worked**`, async (route, request) => {
		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: CORS_HEADERS });
			return;
		}
		const url = new URL(request.url());
		calls.push({ method: request.method(), path: url.pathname, query: url.search, body: null });
		await fulfill(route, 200, []);
	});

	// The delete renews the session before it switches (`organization-deletion.ts:196-200`), and the lane's mock answers
	// every refresh with a placeholder that is not a token — `mock-gauzy-server.mjs:612-613` answers
	// `{ token: 'synthetic-refreshed-token', … }`, its own comment at `:541` says the other refreshes answer a
	// placeholder. The app then cannot read the session it just renewed: measured in
	// -s3-lane-b-workspacegeneral-9.log as `[JWT] Failed to decode token: InvalidTokenError: … missing part #2` from
	// `decodeJWT` under `setAccessTokenCookie (… requestNewPair)`. So this file answers the renewal with a decodable
	// synthetic token naming the organization the session acts in; the landing switch below is what moves it. Served by
	// every test of this file, because every session renewal the mock answers is unreadable to the app.
	await page.route(`${MOCK_API_ORIGIN}/api/auth/refresh-token**`, async (route, request) => {
		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: CORS_HEADERS });
			return;
		}
		const url = new URL(request.url());
		calls.push({ method: request.method(), path: url.pathname, query: url.search, body: postData(request) });
		await fulfill(route, 200, {
			token: syntheticToken('probe-ws-user', organizationId),
			refresh_token: 'probe-ws-refresh'
		});
	});

	if (script.memberships) {
		await page.route(`${MOCK_API_ORIGIN}/api/user-organization**`, async (route, request) => {
			if (request.method() === 'OPTIONS') {
				await route.fulfill({ status: 204, headers: CORS_HEADERS });
				return;
			}
			const url = new URL(request.url());
			calls.push({ method: request.method(), path: url.pathname, query: url.search, body: null });
			await fulfill(route, 200, {
				items: script.memberships?.map((organization, index) => ({
					id: `probe-ws-membership-${index + 1}`,
					organization: { id: organization.id, name: organization.name }
				})),
				count: script.memberships?.length ?? 0
			});
		});
	}

	if ((script.switchOrganization ?? 'served') === 'served') {
		// Gauzy mints the token for the organization the body names (`auth.service.ts:71-77`), so this file answers the
		// same way: the token names the organization that was asked for, never a fixed one. The app asks more than once
		// in a delete (`token-organization.ts:52-73` aligns the token to the organization cookie), and a fixed landing
		// token would move the session under an assertion's eyes.
		await page.route(`${MOCK_API_ORIGIN}/api/auth/switch-organization**`, async (route, request) => {
			if (request.method() === 'OPTIONS') {
				await route.fulfill({ status: 204, headers: CORS_HEADERS });
				return;
			}
			const url = new URL(request.url());
			const body = postData(request);
			calls.push({ method: request.method(), path: url.pathname, query: url.search, body });
			const asked = typeof body?.organizationId === 'string' ? body.organizationId : organizationId;
			await fulfill(route, 200, {
				token: syntheticToken('probe-ws-user', asked),
				refresh_token: 'probe-ws-refresh'
			});
		});
	}

	return {
		calls: () => [...calls],
		writes: () => calls.filter((call) => call.method === 'PUT' || call.method === 'DELETE'),
		storedOrganization: () => ({ ...store }),
		storedTenantName: () => tenantName,
		releaseOrganizationPuts: () => releasePuts()
	};
}

const bodyOf = (request: { postData: () => string | null }) => {
	const text = request.postData();
	return text === null ? null : (JSON.parse(text) as Record<string, unknown>);
};
const postData = (request: { postData: () => string | null }) => {
	try {
		return bodyOf(request);
	} catch {
		return null;
	}
};
const fulfill = async (route: Route, status: number, body: unknown) =>
	route.fulfill({
		status,
		headers: CORS_HEADERS,
		contentType: 'application/json; charset=utf-8',
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});

/**
 * The write of a save, polled out of the served log: a page that polls never lets a fixed index be trusted. Each call
 * takes the next write to that path that no earlier call of the same test has taken, oldest first — the saves of this
 * page run one after another through one promise chain (`use-workspace-settings.ts:159-166`), so the nth save of a
 * path is the nth write to it, and every test below still reads the body it asserts on.
 */
const takenWrites = new WeakMap<Served, Map<string, number>>();
const waitForWrite = async (served: Served, method: string, path: string) => {
	const cursors = takenWrites.get(served) ?? new Map<string, number>();
	takenWrites.set(served, cursors);
	const key = `${method} ${path}`;
	const taken = cursors.get(key) ?? 0;
	const matching = () => served.writes().filter((call) => call.method === method && call.path === path);
	await expect.poll(() => matching().length, { timeout: 30_000 }).toBeGreaterThan(taken);
	cursors.set(key, taken + 1);
	return matching()[taken] as ServedCall;
};

const toastTexts = async (page: Page) => (await appToasts(page).allInnerTexts()).map(flat);

const sectionIds = async (page: Page) =>
	page.locator('section').evaluateAll((nodes) => nodes.map((node) => node.id || '(no id)'));

/** The organization every test's store starts from, plus the fields the mock's fixture lacks. */
const ADMIN_FIELDS = {
	currency: 'USD',
	dateFormat: 'MM/DD/YYYY',
	numberFormat: '1.234,56',
	startWeekOn: 'SUNDAY',
	timeZone: 'UTC',
	timeFormat: 24,
	currencyPosition: 'RIGHT',
	durationRoundingInterval: 15,
	durationRoundingDirection: 'UP',
	defaultBillRateValue: 45,
	timeLogsKeepTheirRates: true,
	allowBreaks: true,
	enforcePrivateProjects: false
};

/** The role every editing test signs in as: the super admin who may edit the organization. */
const OWNER_SCENARIO = { roleName: 'SUPER_ADMIN', extraPermissions: ['ALL_ORG_EDIT'] };

/** The number format the store does not hold, so picking it is a change (`workspace-formats.ts:10`). */
const NUMBER_FORMAT_OTHER = '1,234.56';

/**
 * The sample the date row prints for a stored format: December 31 of this year in that format
 * (`settings-workspace.ts:147-152`, `SAMPLE_AMOUNT`-style fixed sample, `SAMPLE_LANGUAGE = 'en'`).
 */
const dateLabelOf = (format: string) => {
	const year = new Date().getFullYear();
	return format.replace('YYYY', String(year)).replace('MM', '12').replace('DD', '31');
};

/** The row's control, by the row's label (`SettingsRow` renders `<label htmlFor={control id}>`). */
const combo = (page: Page, label: string) => page.getByRole('combobox', { name: label, exact: true });
const select = (page: Page, label: string) => page.getByLabel(label, { exact: true });
const switchOf = (page: Page, id: string) => page.locator(`#${id}`);

/**
 * The list a Base UI Select opens (`data-slot="select-content"`, `core/components/common/select.tsx:286`). Every option
 * is read inside it: the page's two native selects (currency, time zone) hold their `<option>`s at all times — 752 of
 * them on this page — so an unscoped `getByRole('option')` is never empty and never only the menu's.
 */
/**
 * The list a Base UI Select opens (`data-slot="select-content"`, `core/components/common/select.tsx:286`). Every option
 * is read inside it: the page's two native selects (currency, time zone) hold their `<option>`s at all times — 752 of
 * them on this page — so an unscoped `getByRole('option')` is never empty and never only the menu's. Only the popup
 * carrying `data-open=""` is the menu a pick reads: a list that just closed stays in the DOM with `data-closed=""`,
 * measured in -s3-lane-b-workspacegeneral-9.log where the page held the closed week-start list and the open clock list
 * at the same time.
 */
const selectPopup = (page: Page) => page.locator('[data-slot="select-content"][data-open]');

/** A Base UI Select row: open it, pick the option with this printed text, and wait for the menu to close. */
const pickOption = async (page: Page, control: ReturnType<typeof combo>, optionText: string) => {
	await expect(control).toBeVisible({ timeout: 15_000 });
	await control.click({ timeout: 15_000 });
	const popup = selectPopup(page);
	await expect(popup).toBeVisible({ timeout: 15_000 });
	const option = popup.getByRole('option', { name: optionText, exact: true });
	await expect(option).toBeVisible({ timeout: 15_000 });
	await option.click({ timeout: 15_000 });
	await expect(popup).toBeHidden({ timeout: 15_000 });
};

/** The value a row's control shows, read the same way for a native select and a Base UI combobox. */
const shownValue = async (page: Page, label: string) => {
	const combobox = combo(page, label);
	if ((await combobox.count()) > 0) {
		return flat(await combobox.innerText());
	}
	const control = select(page, label);
	const value = await control.inputValue();
	const options = await control.locator('option').allInnerTexts();
	const index = await control.evaluate((node) => (node as HTMLSelectElement).selectedIndex);
	return `${value}|${options[index]}`;
};

/** Where the writes are read from: this file's served log, never a one-shot after a click. */
const organizationPathOf = (ids: Record<string, string>) => `/api/organization/${ids.organizationA}`;

/** The copy of a sentence whose values the page computes, as a pattern: every `{placeholder}` becomes `(.*)`. */
const msgPattern = (key: string) => {
	const escaped = rawMessage(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`^${escaped.replace(/\\\{(\w+)\\\}/g, '(.*)')}$`);
};

/** The weekday names and clock samples the rows print come from `settings-workspace.ts:176-207`: fixed sample days,
 * read with `Intl` in the sample language `en`, never typed. */
const weekdayName = (dayIndexFromSampleSunday: number) =>
	new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date(2026, 10, 1 + dayIndexFromSampleSunday));
const clockSample = (clock: 12 | 24) =>
	new Intl.DateTimeFormat('en', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: clock === 12
	}).format(new Date(2026, 10, 2, 14, 30));

/**
 * A call polled out of both logs: this file's served one, or the mock's own request log (some reads go to the app
 * origin, which forwards them to the mock, so they are only ever visible there).
 */
const waitForCall = async (served: Served, mock: MockControl, method: string, path: string) => {
	await expect
		.poll(
			async () =>
				served.calls().some((call) => call.method === method && call.path === path) ||
				(await mock.requests()).some((request) => request.method === method && request.path === path),
			{ timeout: 30_000 }
		)
		.toBe(true);
};

/** Opens a Base UI Select row and picks the option whose printed text matches, returning that text. */
const pickOptionMatching = async (page: Page, control: ReturnType<typeof combo>, pattern: RegExp) => {
	await expect(control).toBeVisible({ timeout: 15_000 });
	await control.click({ timeout: 15_000 });
	const popup = selectPopup(page);
	await expect(popup).toBeVisible({ timeout: 15_000 });
	const option = popup.getByRole('option').filter({ hasText: pattern });
	await expect(option).toHaveCount(1, { timeout: 15_000 });
	const text = flat(await option.innerText());
	await option.click({ timeout: 15_000 });
	await expect(popup).toBeHidden({ timeout: 15_000 });
	return text;
};

/** The row's select, opened, with every option's printed text and value read out of it. */
const selectChoices = async (control: ReturnType<typeof select>) =>
	control.locator('option').evaluateAll((nodes) =>
		nodes.map((node) => ({
			value: (node as HTMLOptionElement).value,
			text: (node.textContent ?? '').replace(/\s+/g, ' ').trim()
		}))
	);

/** The save's own toast: its title, and the sentence under it when the save has one. */
const expectSaveToast = async (page: Page, title: string, description?: string) => {
	const toast = appToasts(page).filter({ hasText: title });
	await expect(toast).toBeVisible({ timeout: 15_000 });
	if (description !== undefined) {
		await expect(toast).toContainText(description);
	}
	report('toast', { title, description });
};

/**
 * The default-bill-rate row's field: its trigger button, then the input and the buttons of the popover it opens.
 * The button's accessible name is `<row label>: <amount>` while a rate is stored and the bare label once there is
 * none (`rate-value-field.tsx:139-143`); the `{amount}/h` sentence is only what the button prints
 * (`rates.PER_HOUR`, `:152`), measured as `45,00 $/h` on a `1.234,56` / `RIGHT` workspace.
 */
const rateTrigger = (page: Page, hasRate = true) =>
	page.getByRole('button', {
		name: hasRate
			? new RegExp(
					`^${rawMessage('settings.workspace.DEFAULT_RATE_LABEL').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `
				)
			: msg('settings.workspace.DEFAULT_RATE_LABEL'),
		exact: !hasRate
	});
const rateInput = (page: Page) => page.locator('input[inputmode="decimal"]');
/**
 * The rate field's own alert, inside the popover it opens (`rate-value-field.tsx:186-190`, the popover's content is
 * `[data-slot="popover-content"]`, `core/components/common/popover.tsx:124`). The page always carries one more
 * `role=alert` — the empty Next.js route announcer — so an unscoped `getByRole('alert')` is never this field's.
 */
const rateAlert = (page: Page) => page.locator('[data-slot="popover-content"]').getByRole('alert');
const ratePopover = (page: Page) => page.locator('[data-slot="popover-content"]');

/**
 * The fields a save of this section sent on its own. The HTTP layer adds `tenantId` and `organizationId` to every
 * write body (`core/services/client/axios.ts:142-190`), so those two are read apart from the change under test.
 */
const ownFieldsOf = (body: Record<string, unknown> | null) => {
	const rest = { ...(body ?? {}) };
	delete rest.tenantId;
	delete rest.organizationId;
	return rest;
};

/** The delete confirmation, opened from the Danger zone row. */
const openDeleteDialog = async (page: Page) => {
	await page.getByTestId('workspace-delete-organization').click({ timeout: 15_000 });
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible({ timeout: 15_000 });
	return dialog;
};
const confirmDeleteButton = (dialog: Locator) =>
	dialog.getByRole('button', { name: msg('settings.workspace.deletion.DELETE_ACTION'), exact: true });

/** A sentence read as an exact option label: its marks are not regex marks. */
const asAnchor = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

/** The nth write to a path, polled out of the served log: several saves write the same path. */
const waitForNthWrite = async (served: Served, method: string, path: string, nth: number) => {
	const read = () => served.writes().filter((call) => call.method === method && call.path === path);
	await expect.poll(() => read().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(nth);
	return read()[nth - 1] as ServedCall;
};

/** Lets a save's toasts leave before the next save: the pointer parked, since sonner pauses its countdown on hover. */
const settleToasts = async (page: Page) => {
	await page.mouse.move(2, 2);
	await expect(appToasts(page)).toHaveCount(0, { timeout: 30_000 });
};

test.describe('Settings Workspace General', () => {
	test('1 every section and row as printed, with every field served', async ({ page, mock, fixture, shield }) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(
			page.getByRole('heading', { level: 1, name: msg('settings.entries.workspaceGeneral.TITLE'), exact: true })
		).toBeVisible();

		// polled: the sections are drawn once the organization read answered (`workspace-settings-page.tsx:50-51`)
		await expect
			.poll(async () => (await sectionIds(page)).filter((id) => id !== '(no id)'), { timeout: 30_000 })
			.toEqual([
				'workspace',
				'formats',
				'rates',
				'workspace-breaks',
				'workspace-private-projects',
				'danger-zone'
			]);
		const ids = await sectionIds(page);
		report('1 sections', { ids });
		for (const id of [
			'workspace',
			'formats',
			'rates',
			'workspace-breaks',
			'workspace-private-projects',
			'danger-zone'
		]) {
			expect(ids, `section ${id} is rendered`).toContain(id);
		}
		expect(ids, 'the Data section needs the export permission, which this test did not give').not.toContain('data');
		expect(ids.indexOf('rates')).toBeGreaterThan(ids.indexOf('formats'));
		expect(ids.indexOf('workspace-breaks')).toBeGreaterThan(ids.indexOf('rates'));
		expect(ids.indexOf('workspace-private-projects')).toBeGreaterThan(ids.indexOf('workspace-breaks'));
		expect(ids.indexOf('danger-zone')).toBeGreaterThan(ids.indexOf('workspace-private-projects'));

		// The four reads of the page, each waited for in the log before anything is read out of it.
		for (const read of [path, '/api/auth/workspaces', '/api/user/me', '/api/role-permissions/me']) {
			await expect
				.poll(
					async () =>
						served.calls().some((call) => call.path === read) ||
						(await mock.requests()).some((r) => r.path === read),
					{ timeout: 30_000 }
				)
				.toBe(true);
		}
		report('1 reads', {
			served: served.calls().map((call) => `${call.method} ${call.path}`),
			mock: (await mock.requests()).map((r) => `${r.method} ${r.path}`)
		});

		// Identity: the tenant name, editable for a super admin who may edit the organization.
		await expect(
			page.getByRole('heading', { level: 2, name: msg('settings.workspace.IDENTITY_SECTION'), exact: true })
		).toBeVisible();
		// The name is printed twice — here and in the workspace switcher of the shell — so it is read inside the section.
		const identity = page.locator('#workspace');
		await expect(identity.getByText(msg('settings.workspace.NAME_DESCRIPTION'), { exact: true })).toBeVisible();
		await expect(identity.getByText(served.storedTenantName(), { exact: true })).toBeVisible();
		await expect(
			identity.getByRole('button', {
				name: msg('settings.common.EDIT_FIELD', { field: msg('settings.workspace.NAME_LABEL') })
			})
		).toBeVisible();

		for (const key of [
			'CURRENCY_LABEL',
			'DEFAULT_RATE_LABEL',
			'DATE_FORMAT_LABEL',
			'NUMBER_FORMAT_LABEL',
			'WEEK_START_LABEL',
			'TIME_ZONE_LABEL',
			'CLOCK_LABEL',
			'CURRENCY_POSITION_LABEL',
			'ROUNDING_LABEL'
		]) {
			await expect(page.getByText(msg(`settings.workspace.${key}`), { exact: true })).toBeVisible();
		}
		report('1 values', {
			currency: await shownValue(page, msg('settings.workspace.CURRENCY_LABEL')),
			dateFormat: await combo(page, msg('settings.workspace.DATE_FORMAT_LABEL')).innerText(),
			numberFormat: await combo(page, msg('settings.workspace.NUMBER_FORMAT_LABEL')).innerText(),
			weekStart: await combo(page, msg('settings.workspace.WEEK_START_LABEL')).innerText(),
			timeZone: await shownValue(page, msg('settings.workspace.TIME_ZONE_LABEL')),
			clock: await combo(page, msg('settings.workspace.CLOCK_LABEL')).innerText(),
			currencyPosition: await combo(page, msg('settings.workspace.CURRENCY_POSITION_LABEL')).innerText(),
			roundingInterval: await combo(page, msg('settings.workspace.ROUNDING_LABEL')).innerText(),
			roundingDirection: await combo(page, msg('settings.workspace.ROUNDING_DIRECTION_LABEL')).innerText(),
			defaultRate: await rateTrigger(page).innerText()
		});

		await expect(select(page, msg('settings.workspace.CURRENCY_LABEL'))).toHaveValue(ADMIN_FIELDS.currency);
		await expect(combo(page, msg('settings.workspace.DATE_FORMAT_LABEL'))).toHaveText(
			dateLabelOf(ADMIN_FIELDS.dateFormat)
		);
		await expect(combo(page, msg('settings.workspace.NUMBER_FORMAT_LABEL'))).toHaveText(ADMIN_FIELDS.numberFormat);
		await expect(combo(page, msg('settings.workspace.WEEK_START_LABEL'))).toHaveText(weekdayName(0));
		await expect(select(page, msg('settings.workspace.TIME_ZONE_LABEL'))).toHaveValue(ADMIN_FIELDS.timeZone);
		await expect(combo(page, msg('settings.workspace.CLOCK_LABEL'))).toHaveText(
			msg('settings.workspace.CLOCK_24', { sample: clockSample(24) })
		);
		await expect(combo(page, msg('settings.workspace.CURRENCY_POSITION_LABEL'))).toHaveText(
			msgPattern('settings.workspace.CURRENCY_POSITION_AFTER')
		);
		await expect(combo(page, msg('settings.workspace.ROUNDING_LABEL'))).toHaveText(
			msg('settings.workspace.ROUNDING_INTERVAL', { minutes: ADMIN_FIELDS.durationRoundingInterval })
		);
		await expect(combo(page, msg('settings.workspace.ROUNDING_DIRECTION_LABEL'))).toHaveText(
			msg('settings.workspace.ROUNDING_UP')
		);
		await expect(page.getByText(msgPattern('settings.workspace.ROUNDING_EXAMPLE'))).toBeVisible();
		await expect(page.getByText(msg('settings.workspace.DEFAULT_RATE_DESCRIPTION'), { exact: true })).toBeVisible();
		// The rate row's own button: its accessible name is the row label with the amount the workspace's formats write,
		// and what it prints is that amount with `/h` after it.
		await expect(rateTrigger(page)).toHaveText(msgPattern('rates.PER_HOUR'));

		// Rates / Breaks / Private projects: the three switches, as the store holds them.
		await expect(
			page.getByRole('heading', { level: 2, name: msg('settings.workspace.RATES_SECTION'), exact: true })
		).toBeVisible();
		await expect(switchOf(page, 'workspace-timeLogsKeepTheirRates')).toHaveAttribute('aria-checked', 'true');
		await expect(switchOf(page, 'workspace-allowBreaks')).toHaveAttribute('aria-checked', 'true');
		await expect(switchOf(page, 'workspace-enforcePrivateProjects')).toHaveAttribute('aria-checked', 'false');
		await expect(page.getByText(msg('breaks.SETTINGS_DESCRIPTION'), { exact: true })).toBeVisible();
		await expect(
			page.getByText(msg('pages.projects.visibility.SETTING_DESCRIPTION'), { exact: true })
		).toBeVisible();

		// Danger zone: the row that opens the confirmation.
		await expect(
			page.getByRole('heading', {
				level: 2,
				name: msg('settings.workspace.deletion.DANGER_SECTION'),
				exact: true
			})
		).toBeVisible();
		await expect(page.getByTestId('workspace-delete-organization')).toBeVisible();

		expect(consoleFindings(shield), 'a plain load of the page reported nothing to the console').toEqual([]);
	});

	test('2 the bare mock organization: the sections and rows that are not shown', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA);
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });

		await expect
			.poll(async () => (await sectionIds(page)).filter((id) => id !== '(no id)'), { timeout: 30_000 })
			.toEqual(['workspace', 'formats', 'danger-zone']);
		const ids = await sectionIds(page);
		report('2 sections', { ids, stored: served.storedOrganization() });
		expect(ids, 'a section whose field the API does not store renders nothing').not.toContain('rates');
		expect(ids).not.toContain('workspace-breaks');
		expect(ids).not.toContain('workspace-private-projects');
		expect(ids).not.toContain('data');
		expect(ids).toContain('danger-zone');

		for (const key of ['RATES_SECTION', 'DEFAULT_RATE_LABEL', 'ROUNDING_LABEL']) {
			await expect(page.getByText(msg(`settings.workspace.${key}`), { exact: true })).toHaveCount(0);
		}
		await expect(page.getByRole('switch')).toHaveCount(0);

		// The format rows that do render show the defaults Gauzy gives a new organization.
		await expect(combo(page, msg('settings.workspace.DATE_FORMAT_LABEL'))).toHaveText(
			msg('settings.workspace.FORMAT_AUTOMATIC')
		);
		await expect(combo(page, msg('settings.workspace.NUMBER_FORMAT_LABEL'))).toHaveText(
			msg('settings.workspace.FORMAT_AUTOMATIC')
		);
		await expect(combo(page, msg('settings.workspace.WEEK_START_LABEL'))).toHaveText(weekdayName(1));
		await expect(combo(page, msg('settings.workspace.CLOCK_LABEL'))).toHaveText(
			msg('settings.workspace.CLOCK_12', { sample: clockSample(12) })
		);
		await expect(combo(page, msg('settings.workspace.CURRENCY_POSITION_LABEL'))).toHaveText(
			msgPattern('settings.workspace.CURRENCY_POSITION_BEFORE')
		);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('3 a member who cannot edit the workspace: values as text, nothing to change, no Danger zone', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });

		await expect(page.getByRole('combobox')).toHaveCount(0);
		await expect(page.locator('select')).toHaveCount(0);
		await expect(page.getByRole('button', { name: msg('common.EDIT'), exact: true })).toHaveCount(0);
		// Formats and Rates replace their control with a text value; Breaks and Private projects keep their switch and
		// disable it (`workspace-breaks-section.tsx:42`, `workspace-private-projects-section.tsx:42`), so the only
		// controls left on the page are those two, and neither can be used.
		await expect(page.getByRole('switch')).toHaveCount(2);
		await expect(switchOf(page, 'workspace-allowBreaks')).toBeDisabled();
		await expect(switchOf(page, 'workspace-enforcePrivateProjects')).toBeDisabled();

		// Each section that prints text says it is read only; the name says who alone may rename it.
		await expect(page.getByText(msg('settings.workspace.READ_ONLY_NOTE'), { exact: true })).toHaveCount(2);
		const identity = page.locator('#workspace');
		await expect(
			identity.getByText(msg('settings.workspace.NAME_SUPER_ADMIN_ONLY'), { exact: true })
		).toBeVisible();
		await expect(identity.getByText(served.storedTenantName(), { exact: true })).toBeVisible();
		await expect(identity.getByRole('button')).toHaveCount(0);
		await expect(page.getByText(msg('settings.workspace.KEEP_RATES_ON'), { exact: true })).toBeVisible();
		await expect(page.getByText(msgPattern('rates.PER_HOUR'))).toBeVisible();

		report('3 sections', { ids: await sectionIds(page) });
		// the danger zone needs ALL_ORG_EDIT, which this role does not hold
		await expect(page.locator('#danger-zone')).toHaveCount(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('4 renaming as the super admin writes the organization first and the tenant last', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#workspace')).toBeVisible({ timeout: 40_000 });

		const previousName = served.storedTenantName();
		const newName = `${previousName} renamed`;
		const identity = page.locator('#workspace');
		await identity
			.getByRole('button', {
				name: msg('settings.common.EDIT_FIELD', { field: msg('settings.workspace.NAME_LABEL') })
			})
			.click({ timeout: 15_000 });
		const field = identity.getByLabel(msg('settings.workspace.NAME_LABEL'), { exact: true });
		await expect(field).toBeVisible();
		await field.fill(newName);
		await page.getByRole('button', { name: msg('common.SAVE'), exact: true }).click({ timeout: 15_000 });

		const organizationWrite = await waitForWrite(served, 'PUT', path);
		const tenantWrite = await waitForWrite(served, 'PUT', '/api/tenant');
		report('4 rename writes', {
			writes: served.writes().map((call) => ({ method: call.method, path: call.path, body: call.body }))
		});

		expect(
			ownFieldsOf(organizationWrite.body),
			'the organization takes the new name, with its name and currency read again along with it, and nothing else ' +
				'(`organization.service.ts:31-45`); measured in -s3-lane-b-workspacegeneral-7.log'
		).toEqual({ name: newName, currency: ADMIN_FIELDS.currency });
		expect(served.writes().filter((call) => call.path === path).length, 'one write to the organization').toBe(1);
		expect(
			ownFieldsOf(tenantWrite.body),
			'the tenant is renamed last, by the workspace the page was showing'
		).toEqual({
			name: newName
		});
		expect(tenantWrite.body?.tenantId, 'the tenant named is the workspace this page belongs to').toBe(
			fixture.ids.tenantA
		);
		expect(
			served
				.writes()
				.filter((call) => call.path === path || call.path === '/api/tenant')
				.map((call) => call.path),
			'the organization first, the tenant last'
		).toEqual([path, '/api/tenant']);

		const expectedToast = msg('settings.workspace.NAME_SAVED', { name: newName });
		await expect(appToasts(page).filter({ hasText: expectedToast })).toBeVisible({ timeout: 15_000 });
		report('4 toasts', { titles: await toastTexts(page) });
		await expect(identity.getByText(newName, { exact: true })).toBeVisible();
		expect(served.storedTenantName(), 'the served tenant moved with the rename').toBe(newName);

		// The toast leaves once the pointer is parked away from the toaster (sonner pauses its countdown on hover).
		await page.mouse.move(2, 2);
		await expect(appToasts(page)).toHaveCount(0, { timeout: 30_000 });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('5 an empty or blank name is refused before any request is sent', async ({ page, fixture, shield }) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#workspace')).toBeVisible({ timeout: 40_000 });
		const identity = page.locator('#workspace');
		const editButton = identity.getByRole('button', {
			name: msg('settings.common.EDIT_FIELD', { field: msg('settings.workspace.NAME_LABEL') })
		});
		await expect(editButton).toBeVisible();
		const writesBefore = served.writes().length;

		for (const typed of ['', '   ']) {
			await editButton.click({ timeout: 15_000 });
			const field = identity.getByLabel(msg('settings.workspace.NAME_LABEL'), { exact: true });
			await field.fill(typed);
			await page.getByRole('button', { name: msg('common.SAVE'), exact: true }).click({ timeout: 15_000 });
			// The alert is the sign the save was handled; only then is "no write" a fact. The limit in its sentence is
			// the one the field itself carries (`workspace-identity-section.tsx:32`, `MAX_WORKSPACE_NAME_LENGTH`).
			const maxLength = await field.getAttribute('maxlength');
			await expect(
				identity.getByText(msg('settings.workspace.NAME_INVALID', { max: maxLength ?? '' }), { exact: true })
			).toBeVisible({ timeout: 15_000 });
			await expect(field).toHaveAttribute('aria-invalid', 'true');
			expect(
				served.writes().filter((call) => call.path === path).length,
				`a name of "${typed}" was refused without a write`
			).toBe(0);
			await page.getByRole('button', { name: msg('common.CANCEL'), exact: true }).click({ timeout: 15_000 });
			await expect(identity.getByRole('alert')).toHaveCount(0);
		}
		// A name longer than the limit cannot be typed at all: the field carries `maxLength`, so the too-long case is
		// unreachable from the keyboard and only the blank one is (measured here, not assumed).
		await editButton.click({ timeout: 15_000 });
		const longField = identity.getByLabel(msg('settings.workspace.NAME_LABEL'), { exact: true });
		const tooLong = `${served.storedTenantName()} ${'x'.repeat(80)}`;
		await longField.fill(tooLong);
		const typedBack = await longField.inputValue();
		const limit = Number(await longField.getAttribute('maxlength'));
		report('5 too long name', { typed: tooLong.length, kept: typedBack.length, limit });
		expect(typedBack, 'the field kept exactly its own maxLength of what was typed').toBe(tooLong.slice(0, limit));
		await page.getByRole('button', { name: msg('common.CANCEL'), exact: true }).click({ timeout: 15_000 });

		expect(served.writes().length, 'nothing was written by either refusal').toBe(writesBefore);
		report('5 refused name', {
			writes: served.writes().map((call) => call.path),
			invalidCopy: msg('settings.workspace.NAME_INVALID', { max: limit })
		});
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('6 an admin who is not the super admin edits the formats with the name read only', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: { extraPermissions: ['ALL_ORG_EDIT'] } });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });

		const identity = page.locator('#workspace');
		await expect(identity.getByText(served.storedTenantName(), { exact: true })).toBeVisible();
		await expect(
			identity.getByText(msg('settings.workspace.NAME_SUPER_ADMIN_ONLY'), { exact: true })
		).toBeVisible();
		await expect(identity.getByRole('button')).toHaveCount(0);

		// The formats, though: the permission alone is enough there, and one save goes through.
		const numberCombo = combo(page, msg('settings.workspace.NUMBER_FORMAT_LABEL'));
		await expect(numberCombo).toBeVisible();
		await numberCombo.click({ timeout: 15_000 });
		await expect(selectPopup(page).getByRole('option').first()).toBeVisible({ timeout: 15_000 });
		const numberOptions = await selectPopup(page).getByRole('option').allInnerTexts();
		report('6 number options', { options: numberOptions.map(flat) });
		await page.keyboard.press('Escape');
		await expect(selectPopup(page)).toBeHidden({ timeout: 15_000 });
		const picked = numberOptions.map(flat)[1];
		await pickOption(page, numberCombo, picked);
		const write = await waitForWrite(served, 'PUT', organizationPathOf(fixture.ids));
		report('6 number format body', { body: write.body, picked });
		expect(write.body?.numberFormat, `the format whose sample "${picked}" was picked is what the save sent`).toBe(
			NUMBER_FORMAT_OTHER
		);
		await expect(numberCombo).toHaveText(picked);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('7 a format pick writes its own field, Automatic writes no format, and a re-pick writes nothing', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });
		const storedName = String(served.storedOrganization().name);
		const storedLabel = dateLabelOf(ADMIN_FIELDS.dateFormat);

		const dateCombo = combo(page, msg('settings.workspace.DATE_FORMAT_LABEL'));
		await expect(dateCombo).toHaveText(storedLabel);

		// The other date format the row offers, taken by the label the row itself prints: the year's last day in it
		// (`workspace-formats-section.tsx:303-311`, `settings-workspace.ts:146-152`).
		const otherLabel = dateLabelOf('YYYY-MM-DD');
		await pickOptionMatching(page, dateCombo, asAnchor(otherLabel));
		const dateWrite = await waitForWrite(served, 'PUT', path);
		report('7 date format write', { body: dateWrite.body });
		expect(
			ownFieldsOf(dateWrite.body),
			'every save of this section carries the name and currency read again right before it ' +
				'(organization.service.ts:31-45), plus this one change, with the tenant and organization the HTTP layer ' +
				'adds read apart (`core/services/client/axios.ts:142-190`)'
		).toEqual({ name: storedName, currency: ADMIN_FIELDS.currency, dateFormat: 'YYYY-MM-DD' });
		expect(served.storedOrganization().dateFormat, 'the served store took the picked format').toBe('YYYY-MM-DD');
		await expectSaveToast(
			page,
			msg('settings.workspace.DATE_FORMAT_SAVED'),
			msg('settings.workspace.FORMAT_OUTCOME')
		);
		await expect(dateCombo).toHaveText(otherLabel);
		await settleToasts(page);

		// Automatic is the row's own "no format" choice, and it is stored as nothing at all
		// (`settings-workspace.ts:123-131`, `workspace-formats-section.tsx:620-626`).
		const automatic = msg('settings.workspace.FORMAT_AUTOMATIC');
		await pickOptionMatching(page, dateCombo, asAnchor(automatic));
		const automaticWrite = await waitForWrite(served, 'PUT', path);
		report('7 date format Automatic write', { body: automaticWrite.body });
		expect(ownFieldsOf(automaticWrite.body), 'Automatic is saved as no date format').toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			dateFormat: null
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.DATE_FORMAT_SAVED'),
			msg('settings.workspace.FORMAT_OUTCOME')
		);
		await expect(dateCombo).toHaveText(automatic);
		await settleToasts(page);

		// The number format's Automatic, on a store that holds one: the same null, its own sentence.
		const numberCombo = combo(page, msg('settings.workspace.NUMBER_FORMAT_LABEL'));
		await expect(numberCombo).toHaveText(ADMIN_FIELDS.numberFormat);
		await pickOptionMatching(page, numberCombo, asAnchor(automatic));
		const numberWrite = await waitForWrite(served, 'PUT', path);
		report('7 number format Automatic write', { body: numberWrite.body });
		expect(ownFieldsOf(numberWrite.body)).toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			numberFormat: null
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.NUMBER_FORMAT_SAVED'),
			msg('settings.workspace.FORMAT_OUTCOME')
		);
		await expect(numberCombo).toHaveText(automatic);
		await settleToasts(page);

		// Picking what the row already shows sends nothing: the row returns before the save when the value is the one
		// shown (`workspace-formats-section.tsx:96-104`). The menu closing is the sign the pick was handled; the 1.5 s
		// after it is the window this file reads as "no write followed", which is what the sentence proves.
		const writesBefore = served.writes().length;
		await pickOptionMatching(page, numberCombo, asAnchor(automatic));
		await page.waitForTimeout(1_500);
		report('7 re-pick', { writes: served.writes().map((call) => `${call.method} ${call.path}`) });
		expect(served.writes().length, 'the value the row already shows was picked again, and no write followed').toBe(
			writesBefore
		);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('8 the currency, the week start, the clock and the currency side each save their own field', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });
		const storedName = String(served.storedOrganization().name);

		// The currency row is a native select holding the codes the app offers (`currency-select.tsx:14-36`); the next
		// one is read out of it rather than typed.
		const currencyControl = select(page, msg('settings.workspace.CURRENCY_LABEL'));
		await expect(currencyControl).toHaveValue(ADMIN_FIELDS.currency, { timeout: 15_000 });
		const currencies = await selectChoices(currencyControl);
		report('8 currency options', { count: currencies.length, first: currencies.slice(0, 3) });
		const pickedCurrency = currencies.find((option) => option.value !== ADMIN_FIELDS.currency);
		if (!pickedCurrency) {
			throw new Error('the currency row offers no code other than the one stored');
		}
		await currencyControl.selectOption(pickedCurrency.value);
		const currencyWrite = await waitForWrite(served, 'PUT', path);
		report('8 currency write', { body: currencyWrite.body });
		expect(ownFieldsOf(currencyWrite.body), 'a currency save carries the name with it, and no other field').toEqual(
			{
				name: storedName,
				currency: pickedCurrency.value
			}
		);
		await expectSaveToast(
			page,
			msg('settings.workspace.CURRENCY_SAVED', { currency: pickedCurrency.value }),
			msg('settings.workspace.CURRENCY_OUTCOME')
		);
		await expect(currencyControl).toHaveValue(pickedCurrency.value);
		await settleToasts(page);

		// The week start: `ADMIN_FIELDS` stores SUNDAY, so the row prints the sample Sunday's name and the next option
		// is the sample Monday's (`settings-workspace.ts:176-190`).
		const weekCombo = combo(page, msg('settings.workspace.WEEK_START_LABEL'));
		await expect(weekCombo).toHaveText(weekdayName(0));
		await pickOptionMatching(page, weekCombo, asAnchor(weekdayName(1)));
		const weekWrite = await waitForWrite(served, 'PUT', path);
		report('8 week start write', { body: weekWrite.body });
		expect(ownFieldsOf(weekWrite.body)).toEqual({
			name: storedName,
			currency: pickedCurrency.value,
			startWeekOn: 'MONDAY'
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.WEEK_START_SAVED'),
			msg('settings.workspace.EVERY_PAGE_OUTCOME')
		);
		await expect(weekCombo).toHaveText(weekdayName(1));
		await settleToasts(page);

		// The clock saves the 12-hour choice as the number Gauzy stores (`workspace-formats.ts:29-32`).
		const clockCombo = combo(page, msg('settings.workspace.CLOCK_LABEL'));
		await expect(clockCombo).toHaveText(msg('settings.workspace.CLOCK_24', { sample: clockSample(24) }));
		await pickOptionMatching(
			page,
			clockCombo,
			asAnchor(msg('settings.workspace.CLOCK_12', { sample: clockSample(12) }))
		);
		const clockWrite = await waitForWrite(served, 'PUT', path);
		report('8 clock write', { body: clockWrite.body });
		expect(ownFieldsOf(clockWrite.body)).toEqual({
			name: storedName,
			currency: pickedCurrency.value,
			timeFormat: 12
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.CLOCK_SAVED'),
			msg('settings.workspace.EVERY_PAGE_OUTCOME')
		);
		await expect(clockCombo).toHaveText(msg('settings.workspace.CLOCK_12', { sample: clockSample(12) }));
		await settleToasts(page);

		// The currency side: the row prints its own sample, so the option is found by the sentence around it
		// (`workspace-formats-section.tsx:349-355`) and the value sent is the side that sentence names.
		const positionCombo = combo(page, msg('settings.workspace.CURRENCY_POSITION_LABEL'));
		await expect(positionCombo).toHaveText(msgPattern('settings.workspace.CURRENCY_POSITION_AFTER'));
		const pickedSideLabel = await pickOptionMatching(
			page,
			positionCombo,
			msgPattern('settings.workspace.CURRENCY_POSITION_BEFORE')
		);
		const positionWrite = await waitForWrite(served, 'PUT', path);
		report('8 currency side write', { body: positionWrite.body, label: pickedSideLabel });
		expect(ownFieldsOf(positionWrite.body)).toEqual({
			name: storedName,
			currency: pickedCurrency.value,
			currencyPosition: 'LEFT'
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.CURRENCY_POSITION_SAVED'),
			msg('settings.workspace.EVERY_PAGE_OUTCOME')
		);
		await expect(positionCombo).toHaveText(pickedSideLabel);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('9 the time zone saves the zone picked, and its Not set choice clears it', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });
		const storedName = String(served.storedOrganization().name);

		const zoneControl = select(page, msg('settings.workspace.TIME_ZONE_LABEL'));
		await expect(zoneControl).toHaveValue(ADMIN_FIELDS.timeZone);
		const zones = await selectChoices(zoneControl);
		report('9 time zone options', { count: zones.length, first: zones.slice(0, 3) });
		// "Not set" is a choice here, unlike the formats: the row lists it first (`workspace-formats-section.tsx:172-184`).
		const notSet = zones[0];
		expect(notSet.text, 'the first option is the row’s own “no zone” sentence').toBe(
			msg('settings.workspace.TIME_ZONE_NOT_SET')
		);
		const otherZone = zones.find((zone) => zone.value !== ADMIN_FIELDS.timeZone && zone.value !== notSet.value);
		if (!otherZone) {
			throw new Error('the time zone row offers no zone other than the one stored');
		}

		await zoneControl.selectOption(otherZone.value);
		const zoneWrite = await waitForWrite(served, 'PUT', path);
		report('9 time zone write', { body: zoneWrite.body, value: otherZone.value });
		expect(ownFieldsOf(zoneWrite.body)).toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			timeZone: otherZone.value
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.TIME_ZONE_SAVED', { timeZone: otherZone.value }),
			msg('settings.workspace.TIME_ZONE_OUTCOME')
		);
		await expect(zoneControl).toHaveValue(otherZone.value);
		await settleToasts(page);

		await zoneControl.selectOption(notSet.value);
		const clearedWrite = await waitForWrite(served, 'PUT', path);
		report('9 time zone cleared write', { body: clearedWrite.body });
		expect(ownFieldsOf(clearedWrite.body), 'the “Not set” choice is sent as no zone').toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			timeZone: null
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.TIME_ZONE_CLEARED'),
			msg('settings.workspace.TIME_ZONE_CLEARED_OUTCOME')
		);
		await expect(zoneControl).toHaveValue(notSet.value);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('10 duration rounding: the pair saved together, a direction change keeping the interval, cleared as a pair', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });
		const storedName = String(served.storedOrganization().name);
		const intervalCombo = combo(page, msg('settings.workspace.ROUNDING_LABEL'));
		const directionCombo = combo(page, msg('settings.workspace.ROUNDING_DIRECTION_LABEL'));

		// The row is here because the API stored the interval (`storesDurationRounding`, :344-346); test 2 measured a
		// store that does not, where the row is absent. The direction row shows only while a rule is on (:452-466).
		await expect(intervalCombo).toHaveText(
			msg('settings.workspace.ROUNDING_INTERVAL', { minutes: ADMIN_FIELDS.durationRoundingInterval })
		);
		await expect(directionCombo).toHaveText(msg('settings.workspace.ROUNDING_UP'));

		await pickOptionMatching(page, directionCombo, asAnchor(msg('settings.workspace.ROUNDING_DOWN')));
		const directionWrite = await waitForWrite(served, 'PUT', path);
		report('10 rounding direction write', { body: directionWrite.body });
		expect(
			ownFieldsOf(directionWrite.body),
			'Gauzy stores the interval and the direction together, so a direction change re-sends the pair ' +
				'(use-workspace-settings.ts:300-323)'
		).toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			durationRoundingInterval: ADMIN_FIELDS.durationRoundingInterval,
			durationRoundingDirection: 'DOWN'
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.ROUNDING_SAVED'),
			msg('settings.workspace.ROUNDING_OUTCOME')
		);
		await expect(directionCombo).toHaveText(msg('settings.workspace.ROUNDING_DOWN'));
		await settleToasts(page);

		await pickOptionMatching(page, intervalCombo, asAnchor(msg('settings.workspace.ROUNDING_OFF')));
		const offWrite = await waitForWrite(served, 'PUT', path);
		report('10 rounding off write', { body: offWrite.body });
		expect(ownFieldsOf(offWrite.body), 'turning it off clears both fields, never one').toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			durationRoundingInterval: null,
			durationRoundingDirection: null
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.ROUNDING_OFF_SAVED'),
			msg('settings.workspace.ROUNDING_OFF_OUTCOME')
		);
		await expect(intervalCombo).toHaveText(msg('settings.workspace.ROUNDING_OFF'));
		// The example sentence goes with the rule, and the direction row with it (:446-451, :452-466).
		await expect(page.getByText(msgPattern('settings.workspace.ROUNDING_EXAMPLE'))).toHaveCount(0);
		await expect(combo(page, msg('settings.workspace.ROUNDING_DIRECTION_LABEL'))).toHaveCount(0);
		await settleToasts(page);

		// Turned back on from Off, the pair takes the direction the row defaults to (`DEFAULT_ROUNDING_DIRECTION`, :326).
		await pickOptionMatching(
			page,
			intervalCombo,
			asAnchor(msg('settings.workspace.ROUNDING_INTERVAL', { minutes: 5 }))
		);
		const onWrite = await waitForWrite(served, 'PUT', path);
		report('10 rounding on write', { body: onWrite.body });
		expect(ownFieldsOf(onWrite.body)).toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			durationRoundingInterval: 5,
			durationRoundingDirection: 'UP'
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.ROUNDING_SAVED'),
			msg('settings.workspace.ROUNDING_OUTCOME')
		);
		await expect(directionCombo).toHaveCount(1);
		await expect(directionCombo).toHaveText(msg('settings.workspace.ROUNDING_UP'));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('11 the default billing rate: the typed value saved, a thousands separator refused with no write, a zero cleared', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });
		const storedName = String(served.storedOrganization().name);
		const trigger = rateTrigger(page);
		await expect(trigger).toBeVisible();
		report('11 rate trigger', {
			name: await trigger.getAttribute('aria-label'),
			text: flat(await trigger.innerText())
		});
		const saveButton = page.getByRole('button', { name: msg('common.SAVE'), exact: true });

		await trigger.click({ timeout: 15_000 });
		const input = rateInput(page);
		await expect(input).toBeVisible();
		// The field opens holding the stored rate (`rate-value-field.tsx:86`).
		await expect(input).toHaveValue(String(ADMIN_FIELDS.defaultBillRateValue));
		await input.fill('60.50');
		await saveButton.click({ timeout: 15_000 });
		const rateWrite = await waitForWrite(served, 'PUT', path);
		report('11 rate write', { body: rateWrite.body });
		expect(ownFieldsOf(rateWrite.body), 'only the value is sent: the currency the rate prices in stays').toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			defaultBillRateValue: 60.5
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.DEFAULT_RATE_SAVED'),
			msg('settings.workspace.DEFAULT_RATE_OUTCOME')
		);
		await settleToasts(page);

		// A thousands separator is not a number this field takes: the alert is the sign the save was handled, and only
		// then is "no write" a fact (`rate-value-field.tsx:118-127`, `rates.ts:135-155`).
		const writesBefore = served.writes().length;
		await trigger.click({ timeout: 15_000 });
		const longInput = rateInput(page);
		await expect(longInput).toBeVisible();
		await longInput.fill('1,000');
		await saveButton.click({ timeout: 15_000 });
		await expect(rateAlert(page)).toHaveText(msg('rates.NUMBER_INVALID'));
		await expect(longInput).toHaveAttribute('aria-invalid', 'true');
		await expect(longInput).toHaveValue('1,000');
		report('11 refused rate', { writes: served.writes().length, before: writesBefore });
		expect(served.writes().length, 'a value the field refuses is never sent').toBe(writesBefore);
		await page.getByRole('button', { name: msg('common.CANCEL'), exact: true }).click({ timeout: 15_000 });
		// The popover closing is the sign the cancel was handled (`core/components/common/popover.tsx:112-131`), and a
		// closed popover holds no field: only then is "this field's alert is gone" a fact.
		await expect(ratePopover(page)).toBeHidden({ timeout: 15_000 });
		await expect(rateAlert(page)).toHaveCount(0);
		await settleToasts(page);

		// A zero prices nothing, so it is stored as no default at all and said so (`use-workspace-settings.ts:326-350`).
		await trigger.click({ timeout: 15_000 });
		const zeroInput = rateInput(page);
		await expect(zeroInput).toBeVisible();
		await zeroInput.fill('0');
		await saveButton.click({ timeout: 15_000 });
		const clearedWrite = await waitForWrite(served, 'PUT', path);
		report('11 zero rate write', { body: clearedWrite.body });
		expect(ownFieldsOf(clearedWrite.body)).toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			defaultBillRateValue: null
		});
		await expectSaveToast(
			page,
			msg('settings.workspace.DEFAULT_RATE_CLEARED'),
			msg('settings.workspace.DEFAULT_RATE_CLEARED_OUTCOME')
		);
		// The row then offers a rate instead of printing one (`rate-value-field.tsx:139-143,148-152`).
		await expect(
			page.getByRole('button', { name: msg('settings.workspace.DEFAULT_RATE_LABEL'), exact: true })
		).toBeVisible();
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('12 the three switches: what each one writes, what the page says after it, and what a reload reads back', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, { organization: ADMIN_FIELDS });
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(switchOf(page, 'workspace-timeLogsKeepTheirRates')).toBeVisible({ timeout: 40_000 });
		const storedName = String(served.storedOrganization().name);

		await switchOf(page, 'workspace-timeLogsKeepTheirRates').click({ timeout: 15_000 });
		const keepWrite = await waitForNthWrite(served, 'PUT', path, 1);
		report('12 keep rates write', { body: keepWrite.body });
		expect(ownFieldsOf(keepWrite.body)).toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			timeLogsKeepTheirRates: false
		});
		await expectSaveToast(page, msg('settings.workspace.KEEP_RATES_SAVED_OFF'));
		await expect(switchOf(page, 'workspace-timeLogsKeepTheirRates')).toHaveAttribute('aria-checked', 'false');
		await settleToasts(page);

		// Breaks and Private projects: the write and the cache patch, with no sentence of their own on success — only
		// their failure path raises a toast (`use-organization-tracking-requirements.ts:51-74`).
		await switchOf(page, 'workspace-allowBreaks').click({ timeout: 15_000 });
		const breaksWrite = await waitForNthWrite(served, 'PUT', path, 2);
		report('12 breaks write', { body: breaksWrite.body });
		expect(ownFieldsOf(breaksWrite.body)).toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			allowBreaks: false
		});
		await switchOf(page, 'workspace-enforcePrivateProjects').click({ timeout: 15_000 });
		const privateWrite = await waitForNthWrite(served, 'PUT', path, 3);
		report('12 private projects write', { body: privateWrite.body });
		expect(ownFieldsOf(privateWrite.body)).toEqual({
			name: storedName,
			currency: ADMIN_FIELDS.currency,
			enforcePrivateProjects: true
		});
		// Each write landing is the sign that save was handled; the 1.5 s after the last one is what this file reads as
		// "no toast followed", since a save raises its toast only after its write answers.
		await page.waitForTimeout(1_500);
		report('12 toasts after the switches', {
			app: await appToasts(page).count(),
			dev: await devToasts(page).count()
		});
		await expect(appToasts(page)).toHaveCount(0);

		// A reload reads all three from the organization, not from the clicks.
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(switchOf(page, 'workspace-allowBreaks')).toBeVisible({ timeout: 40_000 });
		await expect(switchOf(page, 'workspace-timeLogsKeepTheirRates')).toHaveAttribute('aria-checked', 'false');
		await expect(switchOf(page, 'workspace-allowBreaks')).toHaveAttribute('aria-checked', 'false');
		await expect(switchOf(page, 'workspace-enforcePrivateProjects')).toHaveAttribute('aria-checked', 'true');
		expect(served.storedOrganization(), 'the served store took all three').toMatchObject({
			timeLogsKeepTheirRates: false,
			allowBreaks: false,
			enforcePrivateProjects: true
		});
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('13 a refused save puts the stored value back and says why it was refused', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			organizationPutRefusal: [
				{ status: 400, message: 'probe format refused' },
				{ status: 500, message: 'probe switch refused' }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });

		// The value the row showed is held optimisticly and dropped when the save fails
		// (`use-optimistic-setting.ts:27-40`), so the row shows the stored one again.
		const dateCombo = combo(page, msg('settings.workspace.DATE_FORMAT_LABEL'));
		const storedLabel = dateLabelOf(ADMIN_FIELDS.dateFormat);
		await expect(dateCombo).toHaveText(storedLabel);
		await pickOptionMatching(page, dateCombo, asAnchor(dateLabelOf('YYYY-MM-DD')));
		const refusedWrite = await waitForWrite(served, 'PUT', path);
		report('13 refused format write', { body: refusedWrite.body });
		await expectSaveToast(page, msg('settings.workspace.DATE_FORMAT_NOT_SAVED'), msg('toasts.REASONS.INVALID'));
		await expect(dateCombo).toHaveText(storedLabel);
		expect(served.storedOrganization().dateFormat, 'a refused write leaves the store as it was').toBe(
			ADMIN_FIELDS.dateFormat
		);
		await settleToasts(page);

		// A server error on a switch: the switch goes back to the stored side, with its own title and the server reason.
		await switchOf(page, 'workspace-timeLogsKeepTheirRates').click({ timeout: 15_000 });
		await waitForNthWrite(served, 'PUT', path, 2);
		await expectSaveToast(page, msg('settings.workspace.KEEP_RATES_NOT_SAVED'), msg('toasts.REASONS.SERVER'));
		await expect(switchOf(page, 'workspace-timeLogsKeepTheirRates')).toHaveAttribute('aria-checked', 'true');
		await settleToasts(page);

		// Breaks says the same sentence Private projects does (`breaks.SETTINGS_NOT_SAVED` and
		// `pages.projects.visibility.SETTING_NOT_SAVED` are the same copy in locales/en.json), and it also holds its
		// stored side.
		await switchOf(page, 'workspace-allowBreaks').click({ timeout: 15_000 });
		await waitForNthWrite(served, 'PUT', path, 3);
		await expectSaveToast(page, msg('breaks.SETTINGS_NOT_SAVED'), msg('toasts.REASONS.SERVER'));
		await expect(switchOf(page, 'workspace-allowBreaks')).toHaveAttribute('aria-checked', 'true');
		report('13 refusals', {
			writes: served.writes().map((call) => call.body),
			stored: served.storedOrganization()
		});
		expect(served.storedOrganization().allowBreaks, 'the store never moved').toBe(ADMIN_FIELDS.allowBreaks);
		report('13 console', { lines: shield.consoleErrors() });
		expect(
			consoleFindings(shield, [armedRefusalLine('PUT', path, 400), armedRefusalLine('PUT', path, 500)]),
			'the console errors here are the answers this test armed: a 400 on the format save and a 500 on each switch save'
		).toEqual([]);
	});

	test('14 two saves go in their turn: the second one starts only once the first has answered', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			holdOrganizationPuts: true
		});
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#formats')).toBeVisible({ timeout: 40_000 });
		const storedName = String(served.storedOrganization().name);

		await pickOptionMatching(
			page,
			combo(page, msg('settings.workspace.NUMBER_FORMAT_LABEL')),
			asAnchor(NUMBER_FORMAT_OTHER)
		);
		const firstWrite = await waitForWrite(served, 'PUT', path);
		report('14 first save held', { body: firstWrite.body });

		// The second save is started while the first one is still unanswered: the rate field is not held by the
		// formats' pending mark, and its own Save button going dead is the sign the save was started
		// (`rate-value-field.tsx:96-113`).
		await rateTrigger(page).click({ timeout: 15_000 });
		const input = rateInput(page);
		await expect(input).toBeVisible();
		await input.fill('60');
		await page.getByRole('button', { name: msg('common.SAVE'), exact: true }).click({ timeout: 15_000 });
		await expect(page.getByRole('button', { name: msg('common.SAVE'), exact: true })).toBeDisabled();
		// Every organization save reads the organization again before it writes (`organization.service.ts:31-37`). The
		// 1.5 s below shows that second read had not started yet: the save chain has not let it go
		// (`use-workspace-settings.ts:159-166`).
		const readsBeforeRelease = served.calls().filter((call) => call.method === 'GET' && call.path === path).length;
		const writesBeforeRelease = served.writes().length;
		await page.waitForTimeout(1_500);
		report('14 held', { reads: readsBeforeRelease, writes: writesBeforeRelease });
		expect(served.writes().length, 'the second save had not been sent while the first was unanswered').toBe(
			writesBeforeRelease
		);
		expect(
			served.calls().filter((call) => call.method === 'GET' && call.path === path).length,
			'not even the read ahead of the second save had started'
		).toBe(readsBeforeRelease);

		served.releaseOrganizationPuts();
		const secondWrite = await waitForNthWrite(served, 'PUT', path, 2);
		const writes = served.writes().filter((call) => call.path === path);
		report('14 both saves', { bodies: writes.map((call) => call.body) });
		expect(
			writes.map((call) => ownFieldsOf(call.body)),
			'the save that was asked first is the one that was sent first, each carrying only its own change'
		).toEqual([
			{ name: storedName, currency: ADMIN_FIELDS.currency, numberFormat: NUMBER_FORMAT_OTHER },
			{ name: storedName, currency: ADMIN_FIELDS.currency, defaultBillRateValue: 60 }
		]);
		expect(secondWrite.body?.defaultBillRateValue).toBe(60);
		await expectSaveToast(
			page,
			msg('settings.workspace.NUMBER_FORMAT_SAVED'),
			msg('settings.workspace.FORMAT_OUTCOME')
		);
		await expectSaveToast(
			page,
			msg('settings.workspace.DEFAULT_RATE_SAVED'),
			msg('settings.workspace.DEFAULT_RATE_OUTCOME')
		);
		await settleToasts(page);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('15 a tenant rename the server refuses gives the organization’s name back', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			tenantRename: { status: 403, message: 'probe tenant rename refused' }
		});
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#workspace')).toBeVisible({ timeout: 40_000 });
		const identity = page.locator('#workspace');
		const previousName = served.storedTenantName();
		const organizationName = String(served.storedOrganization().name);
		const newName = `${previousName} refused rename`;

		await identity
			.getByRole('button', {
				name: msg('settings.common.EDIT_FIELD', { field: msg('settings.workspace.NAME_LABEL') })
			})
			.click({ timeout: 15_000 });
		await identity.getByLabel(msg('settings.workspace.NAME_LABEL'), { exact: true }).fill(newName);
		await page.getByRole('button', { name: msg('common.SAVE'), exact: true }).click({ timeout: 15_000 });

		// Three writes: the name given, the tenant refusing it, the name taken back
		// (`use-workspace-settings.ts:189-208`). The name given back is the organization's own — the row prints the
		// tenant's name, which is what the save was asked for, while invitations show the organization's
		// (`use-workspace-settings.ts:103-108`, `settings-workspace.ts:24-31`).
		const givenWrite = await waitForNthWrite(served, 'PUT', path, 1);
		const givenBackWrite = await waitForNthWrite(served, 'PUT', path, 2);
		const writes = served.writes();
		report('15 refused rename writes', { writes: writes.map((call) => ({ path: call.path, body: call.body })) });
		expect(
			writes.map((call) => `${call.method} ${call.path}`),
			'the organization first, the tenant, then the organization again'
		).toEqual([`PUT ${path}`, 'PUT /api/tenant', `PUT ${path}`]);
		expect(ownFieldsOf(givenWrite.body), 'the name the save was asked for').toEqual({
			name: newName,
			currency: ADMIN_FIELDS.currency
		});
		expect(
			ownFieldsOf(givenBackWrite.body),
			'the organization is given the name it had: invitations already show it (use-workspace-settings.ts:196-200)'
		).toEqual({ name: organizationName, currency: ADMIN_FIELDS.currency });
		expect(served.storedOrganization().name, 'the store holds its own name again').toBe(organizationName);

		await expectSaveToast(page, msg('settings.workspace.NAME_NOT_SAVED'), msg('toasts.REASONS.PERMISSION'));
		// The row stays open with what was typed and its own inline sentence, so nothing is silently dropped
		// (`inline-text-row.tsx:84-93`): the person can save the same name again or cancel.
		const field = identity.getByLabel(msg('settings.workspace.NAME_LABEL'), { exact: true });
		await expect(field).toHaveValue(newName);
		await expect(field).toHaveAttribute('aria-invalid', 'true');
		await expect(identity.getByRole('alert')).toHaveText(msg('settings.common.SAVE_FAILED'));
		await identity.getByRole('button', { name: msg('common.CANCEL'), exact: true }).click({ timeout: 15_000 });
		// The workspace is still under its old name: the tenant rename never went through.
		await expect(identity.getByText(previousName, { exact: true })).toBeVisible();
		await settleToasts(page);
		report('15 console', { lines: shield.consoleErrors() });
		// Only the 403 this test armed is excused, and only in the exact wording the logger gives a 403
		// (`logger-adapter.service.ts:196`), measured in -s3-lane-b-workspacegeneral-8.log.
		const armed = [HTTP_FORBIDDEN_TENANT_RENAME_LINE];
		expect(
			consoleFindings(shield, armed),
			'the only console error here is the 403 this test armed on PUT /api/tenant'
		).toEqual([]);
		const excused = excusedConsoleLines(shield, armed);
		report('15 console excused', { lines: excused });
		expect(excused.length, 'exactly one console line is excused here').toBe(1);
		expect(
			excused[0],
			'the line excused is this test’s own 403 on the tenant write, not some other error'
		).toContain('403 Forbidden - PUT /tenant');
	});

	test('15b a tenant rename that may have stopped halfway asks for the same name again', async ({
		page,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			tenantRename: 'server error'
		});
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.locator('#workspace')).toBeVisible({ timeout: 40_000 });
		const identity = page.locator('#workspace');
		const previousName = served.storedTenantName();
		const newName = `${previousName} half rename`;

		await identity
			.getByRole('button', {
				name: msg('settings.common.EDIT_FIELD', { field: msg('settings.workspace.NAME_LABEL') })
			})
			.click({ timeout: 15_000 });
		await identity.getByLabel(msg('settings.workspace.NAME_LABEL'), { exact: true }).fill(newName);
		await page.getByRole('button', { name: msg('common.SAVE'), exact: true }).click({ timeout: 15_000 });

		const tenantWrite = await waitForWrite(served, 'PUT', '/api/tenant');
		const writes = served.writes();
		report('15b half rename writes', {
			writes: writes.map((call) => ({ path: call.path, body: call.body })),
			tenantBody: tenantWrite.body
		});
		expect(
			writes.map((call) => `${call.method} ${call.path}`),
			'a server error is not a refusal, so nothing is given back (settings-workspace.ts:59-64)'
		).toEqual([`PUT ${path}`, 'PUT /api/tenant']);
		expect(served.storedOrganization().name, 'the organization may keep the new name, and the page says so').toBe(
			newName
		);

		await expectSaveToast(
			page,
			msg('settings.workspace.NAME_MAYBE_UNFINISHED'),
			msg('settings.workspace.NAME_SAVE_AGAIN')
		);
		// Both names may hold: the page re-reads both, and the row stays open on the name that was typed, with its own
		// sentence under it (`inline-text-row.tsx:84-93`, `use-workspace-settings.ts:201-207`).
		report('15b names', { organization: served.storedOrganization().name, tenant: served.storedTenantName() });
		const field = identity.getByLabel(msg('settings.workspace.NAME_LABEL'), { exact: true });
		await expect(field).toHaveValue(newName);
		await expect(identity.getByRole('alert')).toHaveText(msg('settings.common.SAVE_FAILED'));
		// Saving the same name again is what the toast asks for; the served tenant never took it, so this time the row
		// prints the workspace's old name again.
		await page.getByRole('button', { name: msg('common.SAVE'), exact: true }).click({ timeout: 15_000 });
		await waitForNthWrite(served, 'PUT', '/api/tenant', 2);
		await identity.getByRole('button', { name: msg('common.CANCEL'), exact: true }).click({ timeout: 15_000 });
		await expect(identity.getByText(previousName, { exact: true })).toBeVisible();
		await settleToasts(page);
		report('15b console', { lines: shield.consoleErrors() });
		expect(
			consoleFindings(shield, [armedRefusalLine('PUT', '/api/tenant', 500)]),
			'the only console errors here are the 500s this test armed on PUT /api/tenant'
		).toEqual([]);
	});

	test('16 the danger zone: the counts it lists, the name it asks for, the delete and where it lands', async ({
		page,
		mock,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const countsPath = `${path}/counts`;
		const COUNTS = { teams: 2, projects: 3, members: 5, trackedSeconds: 9_000, invoices: 4, estimates: 1 };
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			counts: COUNTS,
			workspaceOrganizationCount: 2,
			// This file's own two organizations: the one being deleted, and the one to land in. The first is named by
			// its id (`team-menu-organizations.ts:39-47`), so only the landing one's name reaches the confirmation.
			memberships: [
				{ id: fixture.ids.organizationA, name: 'This organization' },
				{ id: LANDING_ORGANIZATION_ID, name: LANDING_ORGANIZATION_NAME }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.getByTestId('workspace-delete-organization')).toBeVisible({ timeout: 40_000 });
		const organizationName = String(served.storedOrganization().name);

		const dialog = await openDeleteDialog(page);
		await expect(
			dialog.getByText(msg('settings.workspace.deletion.DELETE_TITLE', { organization: organizationName }), {
				exact: true
			})
		).toBeVisible();
		await expect(
			dialog.getByText(msg('settings.workspace.deletion.DELETE_DESCRIPTION'), { exact: true })
		).toBeVisible();

		// The counts and the memberships are read once the confirmation opens (`use-organization-deletion.ts:70-101`),
		// and every one of them is waited for in the log before anything is read out of the dialog.
		await waitForCall(served, mock, 'GET', countsPath);
		await waitForCall(served, mock, 'GET', '/api/organization/count');
		await waitForCall(served, mock, 'GET', '/api/user-organization');
		const consequenceTexts = (await dialog.getByRole('listitem').allInnerTexts()).map(flat);
		report('16 consequences', { consequenceTexts });
		const expectedConsequences = [
			pluralMsg('settings.workspace.deletion.CONSEQUENCE_TEAMS', COUNTS.teams),
			pluralMsg('settings.workspace.deletion.CONSEQUENCE_MEMBERS', COUNTS.members),
			pluralMsg('settings.workspace.deletion.CONSEQUENCE_WORK', COUNTS.projects, 'projects', {
				hours: Math.round(COUNTS.trackedSeconds / 360) / 10
			}),
			pluralMsg('settings.workspace.deletion.CONSEQUENCE_INVOICES', COUNTS.invoices),
			msg('settings.workspace.deletion.CONSEQUENCE_LANDING', { organization: LANDING_ORGANIZATION_NAME })
		];
		expect(consequenceTexts, 'the confirmation lists what the served counts say goes with it').toEqual(
			expectedConsequences
		);

		// The typed gate: the confirm button stays off until the organization's own name is typed, exact
		// (`danger.tsx:61-66,92-95,147-161,180-183`).
		const confirm = confirmDeleteButton(dialog);
		const gate = dialog.getByLabel(msg('settings.common.TYPE_TO_CONFIRM', { text: organizationName }), {
			exact: true
		});
		await expect(gate).toBeVisible();
		await expect(confirm).toBeDisabled();
		await gate.fill(`${organizationName} `);
		await expect(confirm).toBeEnabled();
		await gate.fill(`${organizationName}x`);
		await expect(confirm).toBeDisabled();
		await gate.fill(organizationName);
		await expect(confirm).toBeEnabled();

		await confirm.click({ timeout: 15_000 });
		const deleted = await waitForWrite(served, 'DELETE', `${path}/soft`);
		report('16 delete', { method: deleted.method, path: deleted.path });
		// The session is renewed for the organization to land in, then the switch opens it
		// (`organization-deletion.ts:186-204`, `use-switch-organization.ts:39-73`).
		await waitForCall(served, mock, 'POST', '/api/auth/refresh-token');
		await waitForCall(served, mock, 'POST', '/api/auth/switch-organization');
		// The switch replaces the page (`use-switch-organization.ts:71-73`), so the settings page going is the sign the
		// landing switch went through; only then is the log read for it.
		await expect(page.getByTestId('workspace-delete-organization')).toHaveCount(0, { timeout: 30_000 });
		await expect(dialog).toHaveCount(0);
		// More than one switch may have been asked for along the way: `syncTokenOrganization`
		// (`core/lib/auth/token-organization.ts:52-73`) switches the token to the organization cookie whenever the two
		// differ, and after the delete that cookie still names the deleted organization. Every one of them is reported;
		// the landing one is the last.
		const switchCalls = served.calls().filter((call) => call.path === '/api/auth/switch-organization');
		report('16 switch calls', { count: switchCalls.length, bodies: switchCalls.map((call) => call.body) });
		expect(switchCalls.length, 'the delete asked for at least one organization switch').toBeGreaterThanOrEqual(1);
		expect(
			switchCalls[switchCalls.length - 1]?.body,
			'the organization the delete asked to be switched to is the one the confirmation promised to land in ' +
				'(organization-deletion.ts:54-60,186-204)'
		).toEqual({ organizationId: LANDING_ORGANIZATION_ID, tenantId: fixture.ids.tenantA });
		report('16 landing', { url: page.url() });
		report('16 console', { lines: shield.consoleErrors() });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('17 the delete holds on the workspace’s last organization', async ({ page, mock, fixture, shield }) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			workspaceOrganizationCount: 1,
			memberships: [{ id: fixture.ids.organizationA, name: 'This organization' }]
		});
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.getByTestId('workspace-delete-organization')).toBeVisible({ timeout: 40_000 });

		const dialog = await openDeleteDialog(page);
		// Both facts are read even when one of them already holds the delete off
		// (`use-organization-deletion.ts:84-101`); it is the count that names the block.
		await waitForCall(served, mock, 'GET', `${path}/counts`);
		await waitForCall(served, mock, 'GET', '/api/organization/count');
		await expect(
			dialog.getByText(msg('settings.workspace.deletion.LAST_ORGANIZATION'), { exact: true })
		).toBeVisible();
		await expect(
			dialog.getByText(msg('settings.workspace.deletion.LAST_ORGANIZATION_DESCRIPTION'), { exact: true })
		).toBeVisible();
		report('17 last organization', { blocks: '/api/organization/count answered 1' });
		// No counts list, no typed gate, no way to confirm (`workspace-danger-section.tsx:122-137,187,212-216`).
		await expect(dialog.getByRole('listitem')).toHaveCount(0);
		await expect(dialog.getByRole('textbox')).toHaveCount(0);
		await expect(confirmDeleteButton(dialog)).toBeDisabled();
		await expect(
			dialog.getByRole('link', { name: msg('settings.workspace.deletion.LAST_ORGANIZATION_ACTION'), exact: true })
		).toHaveAttribute('href', /\/delete-account$/);

		// The row's own sentence still says the workspace keeps one organization.
		await expect(
			page
				.locator('#danger-zone')
				.getByText(msg('settings.workspace.deletion.DELETE_CONSEQUENCE'), { exact: true })
		).toBeVisible();
		expect(served.writes(), 'nothing was written').toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('18 the delete holds while a run of the person goes on', async ({ page, mock, fixture, shield }) => {
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			workspaceOrganizationCount: 2,
			memberships: [
				{ id: fixture.ids.organizationA, name: 'This organization' },
				{ id: LANDING_ORGANIZATION_ID, name: LANDING_ORGANIZATION_NAME }
			]
		});
		// The run is the mock's own: `scenario.timerRunning` is what its timer status answers with
		// (`mock-gauzy-server.mjs:274`, `:749`), read by `readRunGoingOn` (`use-organization-deletion.ts:44-52`).
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { ...OWNER_SCENARIO, timerRunning: true }
		});
		await expect(page.getByTestId('workspace-delete-organization')).toBeVisible({ timeout: 40_000 });

		const dialog = await openDeleteDialog(page);
		await waitForCall(served, mock, 'GET', '/api/timesheet/timer/status');
		await expect(dialog.getByText(msg('settings.workspace.deletion.TIMER_RUNNING'), { exact: true })).toBeVisible();
		await expect(
			dialog.getByText(msg('settings.workspace.deletion.TIMER_RUNNING_DESCRIPTION'), { exact: true })
		).toBeVisible();
		await expect(dialog.getByRole('listitem')).toHaveCount(0);
		await expect(confirmDeleteButton(dialog)).toBeDisabled();
		report('18 timer block', {
			timerReads: (await mock.requests())
				.filter((r) => r.path.includes('timer'))
				.map((r) => `${r.method} ${r.path}`)
		});

		// The retry is the only way out, and it reads the run again rather than trusting this tab
		// (`workspace-danger-section.tsx:107-120`).
		await dialog.getByRole('button', { name: msg('notifications.RETRY'), exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(async () => (await mock.requests()).filter((r) => r.path === '/api/timesheet/timer/status').length, {
				timeout: 30_000
			})
			.toBeGreaterThanOrEqual(2);
		await expect(dialog.getByText(msg('settings.workspace.deletion.TIMER_RUNNING'), { exact: true })).toBeVisible();
		expect(served.writes(), 'a running timer means no delete was sent').toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('19 counts that do not load keep the delete off, and its retry reads them again', async ({
		page,
		mock,
		fixture,
		shield
	}) => {
		const countsPath = `${organizationPathOf(fixture.ids)}/counts`;
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			workspaceOrganizationCount: 2,
			counts: { status: 500, message: 'probe counts failed' },
			memberships: [
				{ id: fixture.ids.organizationA, name: 'This organization' },
				{ id: LANDING_ORGANIZATION_ID, name: LANDING_ORGANIZATION_NAME }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.getByTestId('workspace-delete-organization')).toBeVisible({ timeout: 40_000 });

		const dialog = await openDeleteDialog(page);
		await waitForCall(served, mock, 'GET', countsPath);
		await expect(dialog.getByText(msg('settings.workspace.deletion.COUNTS_FAILED'), { exact: true })).toBeVisible();
		await expect(
			dialog.getByText(msg('settings.workspace.deletion.COUNTS_FAILED_DESCRIPTION'), { exact: true })
		).toBeVisible();
		// A refusal that is not the missing route of an older API is a failure a new try may fix, so the older-API
		// sentence is not what shows here (`organization-deletion.ts:77-83`).
		await expect(dialog.getByText(msg('settings.workspace.deletion.UNSUPPORTED'), { exact: true })).toHaveCount(0);
		await expect(dialog.getByRole('listitem')).toHaveCount(0);
		await expect(confirmDeleteButton(dialog)).toBeDisabled();

		await dialog.getByRole('button', { name: msg('notifications.RETRY'), exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => served.calls().filter((call) => call.path === countsPath).length, { timeout: 30_000 })
			.toBeGreaterThanOrEqual(2);
		report('19 counts reads', { reads: served.calls().filter((call) => call.path === countsPath).length });
		await expect(dialog.getByText(msg('settings.workspace.deletion.COUNTS_FAILED'), { exact: true })).toBeVisible();
		// The failed read is the app's own notice, not a toast; whatever the development-only toaster raises for it is
		// counted here and never mistaken for one.
		report('19 toasts', { app: await appToasts(page).count(), dev: await devToasts(page).count() });
		await expect(appToasts(page)).toHaveCount(0);
		expect(served.writes(), 'no delete was sent').toEqual([]);
		report('19 console', { lines: shield.consoleErrors() });
		expect(
			consoleFindings(shield, [armedRefusalLine('GET', countsPath, 500)]),
			'the console errors here are the 500 answers this test armed on GET /api/organization/:id/counts'
		).toEqual([]);
	});

	test('20 a delete the server refuses stays in the dialog, and nothing else moves', async ({
		page,
		mock,
		fixture,
		shield
	}) => {
		const path = organizationPathOf(fixture.ids);
		const served = await serveWorkspaceApi(page, fixture.ids.organizationA, {
			organization: ADMIN_FIELDS,
			workspaceOrganizationCount: 2,
			softDelete: { status: 409, message: 'probe soft delete refused' },
			memberships: [
				{ id: fixture.ids.organizationA, name: 'This organization' },
				{ id: LANDING_ORGANIZATION_ID, name: LANDING_ORGANIZATION_NAME }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: OWNER_SCENARIO });
		await expect(page.getByTestId('workspace-delete-organization')).toBeVisible({ timeout: 40_000 });
		const organizationName = String(served.storedOrganization().name);

		const dialog = await openDeleteDialog(page);
		await waitForCall(served, mock, 'GET', `${path}/counts`);
		const gate = dialog.getByLabel(msg('settings.common.TYPE_TO_CONFIRM', { text: organizationName }), {
			exact: true
		});
		await expect(gate).toBeVisible();
		await gate.fill(organizationName);
		const confirm = confirmDeleteButton(dialog);
		await expect(confirm).toBeEnabled();
		const callsBeforeConfirm = served.calls().length;
		await confirm.click({ timeout: 15_000 });

		const deleted = await waitForWrite(served, 'DELETE', `${path}/soft`);
		// The alert in the dialog's footer is the sign the refusal was handled; only then is "nothing else happened" a
		// fact (`workspace-danger-section.tsx:194-204`, `danger.tsx:165-169`).
		await expect(dialog.getByRole('alert')).toHaveText(msg('toasts.REASONS.CONFLICT'));
		await expect(dialog).toBeVisible();
		await expect(confirm).toBeEnabled();
		report('20 refused delete', {
			writes: served.writes().map((call) => `${call.method} ${call.path}`),
			deleteBody: deleted.body
		});
		expect(
			served.calls().some((call) => call.path === '/api/auth/switch-organization'),
			'a refused delete does not open another organization'
		).toBe(false);
		// `POST /api/auth/refresh-token` is served by this file (`serveWorkspaceApi`), so its log is where a renewal shows
		const renewals = served
			.calls()
			.slice(callsBeforeConfirm)
			.filter((call) => call.path === '/api/auth/refresh-token');
		expect(renewals.length, 'the session is not renewed when the delete was refused').toBe(0);
		await expect(page.getByTestId('workspace-delete-organization')).toBeVisible();
		await settleToasts(page);
		report('20 console', { lines: shield.consoleErrors() });
		expect(
			consoleFindings(shield, [armedRefusalLine('DELETE', `${path}/soft`, 409)]),
			'the console error here is the 409 this test armed on DELETE /api/organization/:id/soft'
		).toEqual([]);
	});
});
