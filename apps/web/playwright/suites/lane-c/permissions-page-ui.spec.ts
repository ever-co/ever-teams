import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees on the **permissions page** (`/permissions`) and what the browser really sends from
 * it, on lane-c
 * (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control `4004` — `playwright/test-servers.ts:40`).
 *
 * The page driven here is `app/[locale]/(main)/permissions/page.tsx` →
 * `core/components/pages/permissions/page-component.tsx` (`Permissions`, :37-296, wrapped by
 * `withAuthentication(Permissions, {skeleton: PermissionsPageSkeleton})` at :298-301), with its left column
 * (`ROLE_LIST`, :107-123), its ten `CommonToggle` rows (:128-288; `core/components/common/toggler.tsx:166-189`) and
 * `core/components/pages/permissions/permissions-page-skeleton.tsx` (`PermissionsToolbar` :14-24, `SelectRolePrompt`
 * :38-50). Role CRUD, role search and a "no roles" message do not exist on this page.
 *
 * ## Where the numbers came from
 *
 * Every pinned value was printed by the throwaway probe `D:\Coding\.tmp\probe-permissions\probe3.spec.ts` (its own
 * config, no `webServer`) run on this lane on 2026-11-27; the log is `D:\Coding\.tmp\s3-lane-c-permissions-probe4.log`
 * (5 cases, 5 passed), with the earlier rounds `…probe1.log` (module-resolution failure), `…probe2.log`
 * (`s3-lane-c-permissions-probe3.log`, 8 passed) and the first probe spec (`…probe2.spec.ts`, since deleted) covering
 * the roles-read gate, the 403/500 refusals and the half-on shared-key case. This file's own `report('…')` lines print
 * the same measurements again in its runs, and its first two whole-file runs re-pinned nothing new.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock (`cypress/support/mock-gauzy-server.mjs`) answers the session and shell reads this page
 * depends on: `GET /api/user/me` with the fixture person and its role (:607, role name chosen by `scenario.roleName`,
 * :73-78), `GET /api/organization-team` and `/api/organization-team/<id>` with the fixture team (:655-656) and
 * `GET /api/role-permissions/me` (:674) — the last one is **the shell's** read (`use-my-role-permissions-query`, used
 * by `core/components/timer/timer-start-popover.tsx:83`, `core/components/features/entry-labels/entry-labels-picker.tsx:133`
 * and others), not this page's; this file never matches it, so the mock keeps answering it. The NextAuth session stub,
 * the cookies and the app's own shell are the lane's, as in every lane file.
 *
 * **Served by this file:** the roles list (`GET /api/roles`) and everything the page itself reads and writes about a
 * role's permissions, with `page.route` on the mock origin and a store behind it (`servePermissionStore`): the list
 * answer is always the current store, a `PUT` changes one row of it, and an armed refusal changes nothing. Every answer
 * restates the mock's CORS answer and answers `OPTIONS` with 204, the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:227-299`; `route.fetch()` is never called, so `mock.calls(...)` staying
 * empty is the witness that the page acted on this file. Test 10 of this file (`/permissions` as a MANAGER / an
 * EMPLOYEE) additionally serves the **team** reads, because the lane's fixture team has no manager the signed-in
 * person is not (`mock-gauzy-server.mjs:217-225`, `:250`) — without serving it, the access branch of
 * `page-component.tsx:57-62` cannot be reached on this lane at all.
 *
 * **The browser talks to the mock, never to the app's own route twins.** Measured (probe4 R4/R1): the page's reads are
 * `GET http://127.0.0.1:4002/api/roles` and `GET …/api/role-permissions/pagination?<query>`, and its write is
 * `PUT …/api/role-permissions/<row id>`. That is the lane's wiring: `test-servers.ts:122-123` publishes
 * `NEXT_PUBLIC_GAUZY_API_SERVER_URL` = the mock origin, which `core/constants/config/constants.tsx:229` hands to
 * `GAUZY_API_BASE_SERVER_URL`, and `rolePermissionsPath` (`core/services/client/api/roles/role-permission.service.ts:14-20`)
 * takes the direct-mode branch whenever it is truthy; `APIService.getApiConfig` then puts `/api` on the base
 * (`core/services/client/api.service.ts:516`). So `app/api/role-permissions/[id]/route.ts` and `app/api/roles/route.ts`
 * — proxy mode — are **not** in this file's path; `suites/api` and `suites/lane-*` route sweeps pin those.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/pages/permissions/page-component.tsx`: reads — `useUserQuery()` :42, `useRolePermissionsQuery(selectedRoleId)`
 *   :50, `useUpdateRolePermission(selectedRoleId)` :51, `useIsMemberManager(user)` :52, `isTenantAdminRole(user?.role?.name)` :53
 *   (`core/lib/utils/roles.ts:6`), `useRolesQuery({ adminOnly: true })` :54. Gate `canAccessPermissions` :57-62 → `NotFound`
 *   :78-90. Role list :107-123 (`role?.name` as plain text in a `div`, `onClick → setSelectedRole`, no button semantics,
 *   the selected row only restyled by `ROLE_ITEM_ACTIVE` :32). Toggle handler `handleToggleRolePermission` :65-76
 *   (`if (!permission || !selectedRoleId) return;` at :68, then `{ ...permission, enabled: !permission.enabled }`).
 *   Rows and their keys — Track time `TIME_TRACKER` :134/:136; Estimate issue, Epics create/close, Issue create/close,
 *   Issue assign/unassign all read `ORG_TASK_ADD && ORG_TASK_EDIT` and write **both** (:148-155, :166-173, :184-191,
 *   :204-211); Invite members `ORG_INVITE_EDIT` :221/:223; Remove members `ORG_EMPLOYEES_EDIT && CHANGE_SELECTED_EMPLOYEE`,
 *   writes both :235-236/:240-241; Handle requests `ORG_TEAM_JOIN_REQUEST_EDIT` :253/:256; Roles/Positions change
 *   `ORG_EMPLOYEES_EDIT` :269/:271 (the same key Remove members writes); View details `ORG_TASK_VIEW` :282/:284.
 * - `core/hooks/roles/use-roles-query.ts`: `isAdmin` :30-32, `allowed = isAdmin || !adminOnly` :45,
 *   `queryEnabled` :46, `rolesReady = allowed && isSuccess` :64-67 → a non-admin asking `adminOnly` never fires the read
 *   and gets `roles = []`.
 * - `core/hooks/roles/use-role-permissions-query.ts`: `enabled: !!roleId` :27, `rolePermissionsFormated` keyed by
 *   `permission` :37-43. `core/hooks/roles/use-update-role-permission.ts`: `onSettled → invalidateRolePermissions(roleId)`
 *   :17-24 (so the state printed after a write is the **re-read** one; `updateRolePermissionLoading` :28 is not used by
 *   the page — the toolbar spinner follows the read, `page-component.tsx:104`).
 * - `core/services/client/api/roles/role-permission.service.ts`: the read query :54-66 (`data` = JSON
 *   `{findInput:{roleId,tenantId}}` **and** `where`), the write :95-100 (validated row → `PUT /role-permissions/<id>`),
 *   `affected: 0` → `throw new Error('The permission was not saved: the API changed no row')` :105-108, `affected: N` →
 *   the row it sent :109-111. Row shape: `core/types/schemas/role/role-permission-schema.ts:6-15`, `.strict()` at :15.
 * - The failure copy: `core/components/common/mutation-error-toaster.tsx` (mounted at `app/[locale]/layout-component.tsx:148`)
 *   toasts `toasts.MUTATION_FAILED` with the reason sentence from `errorReasonKeyOf` (`core/lib/utils/error-feedback.ts:203`,
 *   `reasonOfStatus` :153-176 → 403 = `toasts.REASONS.PERMISSION`, ≥ 500 = `toasts.REASONS.SERVER`) and, in dev only,
 *   prints `console.error('Mutation failed:', …)` at :48.
 * - `locales/en.json` by key: `pages.permissions.TITLE` `:2791`, `common.SELECT_ROLE` `:448`, `common.ACTIVATED` `:256`,
 *   `common.DEACTIVATED` `:257`, `pages.settingsTeam.*` `:2686-2695`, `pages.page404.HEADING_TITLE` `:2801`,
 *   `pages.page404.HEADING_DESCRIPTION` `:2802`, `pages.taskDetails.GO_BACK_HOME` `:2415`, `sidebar.DASHBOARD` `:4`,
 *   `toasts.MUTATION_FAILED` `:4322`, `toasts.REASONS.PERMISSION` `:4325`, `toasts.REASONS.SERVER` `:4332`.
 *
 * ## What the probes measured (this file's assertions are pinned on these)
 *
 * - **As an ADMIN** (probe4 R4): 3 served roles printed in the served order (`Probe Alpha | Probe Beta | Probe Gamma`),
 *   each named exactly once; `common.SELECT_ROLE` on the right **before** a role is picked (1) and gone after (0);
 *   **0** switches before a pick; 1 heading `Roles & permissions`; the breadcrumb's `Dashboard`; the load's only
 *   page read was `GET /api/roles` with an **empty query**, and no permissions read at all while no role was picked.
 * - **Picking a role** (probe4 R4, probe3 Q6): `GET /api/role-permissions/pagination?data={"findInput":{"roleId":"<role>",
 *   "tenantId":"<tenant>"}}&where[roleId]=<role>&where[tenantId]=<tenant>`, then **ten** switches in the row order of
 *   `pages.settingsTeam.*`, each printing `common.ACTIVATED` / `common.DEACTIVATED` (measured: 9 Activated, 1 Deactivated
 *   for the served mix).
 * - **One flip** (probe4 R1): exactly **1** `PUT /api/role-permissions/<that row's id>` whose body is the row it read with
 *   `enabled` flipped **plus an `organizationId`** the client added (see finding 1); then a re-read `GET …/pagination`
 *   (the invalidation), and only that row changed to `Deactivated`.
 * - **The four shared-key rows** (probe4 R2, probe3 P3): one click on `Estimate issue` sent **2** PUTs —
 *   `…000000000002` (`ORG_TASK_ADD`) and `…000000000003` (`ORG_TASK_EDIT`) — and all four task rows went `Deactivated`,
 *   while the other six stayed as they were. With the two keys half-on (`ORG_TASK_ADD` true, `ORG_TASK_EDIT` false) the
 *   same click still sent 2 PUTs (`ADD → false`, `EDIT → true`) and all four rows stayed `Deactivated` (probe2 P3):
 *   the row prints `A && B`, so a flip of a half-on pair moves nothing on screen (finding 3).
 * - **Switching roles** (probe3 Q6): the second role is read with `where[roleId]=<its id>`, and its ten rows show
 *   **its** rows only — `Track time` Activated, everything else Deactivated, including `Estimate issue` although that
 *   role has an enabled `ORG_TASK_ADD` row (no `ORG_TASK_EDIT` row to pair it with).
 * - **A refused save** (probe3 Q5 403, probe1 P7 500): the PUT is sent as described, the store row is **unchanged**, a
 *   re-read follows, and the switches stay exactly where the server left them (no optimistic move, so nothing rolls
 *   back); the user-facing toast is `That change was not saved` + `Your role does not allow this change.` (403) or
 *   `… The server could not complete it. Try again in a moment.` (500).
 * - **A refused read** (probe2 Q4, 500): the right column still prints **ten** switches, all `Deactivated`, with no
 *   failure copy of its own (finding 2); only the dev `Query failed` toast and the client's own HTTP error line appear.
 * - **A MANAGER who manages the team** (probe3 Q1): the page opens (heading, breadcrumb, `common.SELECT_ROLE`) but the
 *   left column is empty, there are **0** switches and **no** roles request at all — not `/api/roles`, not
 *   `/api/roles/team-assignable` — for 2.5 s after the page settled.
 * - **An EMPLOYEE who is not a manager of a team that has managers** (probe4 R3, with the team reads served): the
 *   not-found page instead — `Page not found` ×1, `This page does not exist or has moved.` ×1, `Go back home` as a
 *   **link** (not a button), no `Roles & permissions` heading, no prompt, no switches, no role names, and no roles read.
 * - **A role whose served list has only some rows** (probe4 R5): the ten rows are printed anyway, every key with no row
 *   showing `Deactivated`; flipping `View details` (`ORG_TASK_VIEW`, no row) and `Remove members` (both keys missing)
 *   sent **0** requests in a 2 s window; flipping `Track time`, whose row exists, sent 1 PUT with that row's id.
 *
 * ## Findings (tagged only where the code says otherwise; here none does)
 *
 * 1. **The write body carries a field the read forbids.** `APIService.put` adds `organizationId` (from the
 *    `auth-organization-id` cookie) to every body that lacks one (`core/services/client/api.service.ts:701-708`, whose
 *    own comment at :681-685 says it is deliberate), and `role-permission.service.ts:95-100` passes the validated row to
 *    it. `rolePermissionSchema` is `.strict()` (`core/types/schemas/role/role-permission-schema.ts:15`), so a row that
 *    came back with `organizationId` would fail the read's own validation. Measured body: the served row's five keys +
 *    `organizationId` (probe4 R1). This file's store therefore applies only the `enabled` the page sent, and pins the
 *    body as sent. Untagged: the base service adds it on purpose; the note is that the pair `strict read schema` /
 *    `body the client pads` is one field apart.
 * 2. **A permissions read that fails is indistinguishable from a role with nothing switched on**
 *    (`use-role-permissions-query.ts:31-34` hands `[]` and `page-component.tsx:134-282` prints `|| false`): ten switches,
 *   all `Deactivated`, no retry offer, no notice. Untagged: no comment, type, unit test or copy says the page should say
 *    otherwise; a hardening idea (`Notice` + `Try again`, as `api-tokens-settings-page.tsx:109-120` does for its list).
 * 3. **A row that prints two keys can be flipped into the same state it started in** — measured above (finding 3 in the
 *    probe list). Untagged: `page-component.tsx:148-151` computes `A && B` and :153-154 writes both on purpose.
 * 4. **A missing permission row silently swallows the click** (`page-component.tsx:68`), which is what the 0 requests of
 *    the last case measure. Untagged; that guard is what keeps a flip of an unserved key from inventing an id.
 * 5. Not a finding, a correction of the survey this file started from (`D:\Coding\.tmp\surveys\map-permissions-2026-11-27.md`
 *    §8.6 "No error toast for a failed save"): there is one — `MutationErrorToaster` (`mutation-error-toaster.tsx:53-56`,
 *    mounted `app/[locale]/layout-component.tsx:148`), pinned by test 7 here. §2b of that survey is right that this page
 *    never reads `/api/role-permissions/me`, but the shell does on every signed-in page, so a stub on
 *    `/api/role-permissions/` must leave `/me` to the mock.
 *
 * ## What this file does not cover
 *
 * The `PUT` reaching the app's own `/api/role-permissions/[id]` twin (proxy mode — see above), the gate for an
 * anonymous visitor (`suites/lane-d/page-gate-lane.spec.ts:126`), opening the page and seeing its permissions on the
 * mock's own fixture (`suites/mock/team-settings.spec.ts:17-28`), `GET /api/role-permissions/me`
 * (`suites/api/tab-session.spec.ts:58` and the report/invoice gates), role create/rename/delete (no UI here), and the
 * toolbar's `Reading the role's permissions` bar (driven by the read's `isLoading`, `page-component.tsx:104`: too short
 * a window to pin without a fixed sleep). `affected: 0` (`role-permission.service.ts:105-108`) is unreachable through
 * this page — this file answers `affected: 1`, and its unit test
 * (`core/services/client/api/roles/role-permission.service.test.ts:131`) already pins that throw.
 *
 * ## Console and secrets
 *
 * `consoleFindings` reports every console error the shield kept, except React's dev store warning
 * (`SHELL_STORE_NOISE`, as `suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`) and the errors this file **armed**,
 * each excused only by a group of needles that names both its path and its status — the client logs the path **without**
 * the `/api` base the wire call carries (`api.service.ts:516`; measured: `…/api/role-permissions/<id>` logged as
 * `PUT /role-permissions/<id> 500`), which `loggedPath` applies. The `Mutation failed:` line
 * (`mutation-error-toaster.tsx:48`) is excused **only in test 7**, which arms a write refusal, and only by the armed
 * message it names. No token, header or session value is printed anywhere: the served rows and roles are this file's own
 * made-up ids, and the read query is pinned by its values.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const PERMISSIONS_PATH = '/permissions';
const ROLES_ROUTE = '/api/roles';
const TEAM_ASSIGNABLE_ROLES_ROUTE = '/api/roles/team-assignable';
const PERMISSIONS_ROUTE = '/api/role-permissions';
const MY_PERMISSIONS_ROUTE = '/api/role-permissions/me';
const PERMISSIONS_READ_PATH = `${PERMISSIONS_ROUTE}/pagination`;
const TEAM_LIST_ROUTE = '/api/organization-team';

/** `locales/en.json`, read by key: never typed. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: { ACTIVATED: string; DEACTIVATED: string; SELECT_ROLE: string };
	sidebar: { DASHBOARD: string };
	pages: {
		permissions: { TITLE: string };
		settingsTeam: {
			TRACK_TIME: string;
			ESTIMATE_ISSUE: string;
			EPICS_CREATE_CLOSE: string;
			ISSUE_CREATE_CLOSE: string;
			ISSUE_ASSIGN_UNASSIGN: string;
			INVITE_MEMBERS: string;
			REMOVE_MEMBERS: string;
			HANDLE_REQUESTS: string;
			ROLES_POSITIONS_CHANGE: string;
			VIEW_DETAILS: string;
		};
		page404: { HEADING_TITLE: string; HEADING_DESCRIPTION: string };
		taskDetails: { GO_BACK_HOME: string };
	};
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
};
const T_TEAM = EN.pages.settingsTeam;

/** The ten rows in the order the page prints them (`page-component.tsx:128-288`), and their index among the switches. */
const ROW_LABELS = [
	T_TEAM.TRACK_TIME,
	T_TEAM.ESTIMATE_ISSUE,
	T_TEAM.EPICS_CREATE_CLOSE,
	T_TEAM.ISSUE_CREATE_CLOSE,
	T_TEAM.ISSUE_ASSIGN_UNASSIGN,
	T_TEAM.INVITE_MEMBERS,
	T_TEAM.REMOVE_MEMBERS,
	T_TEAM.HANDLE_REQUESTS,
	T_TEAM.ROLES_POSITIONS_CHANGE,
	T_TEAM.VIEW_DETAILS
];
const ROW = {
	trackTime: 0,
	estimateIssue: 1,
	inviteMembers: 5,
	removeMembers: 6,
	viewDetails: 9
} as const;

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-c permissions] MEASURE ${label} ${JSON.stringify(value)}`);

/** React's dev-mode store warning, not this page's (`chat-conversation-ui.spec.ts:1074-1076`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** One armed refusal: a console line is excused only when it names every needle of the group. */
const armed =
	(...needles: string[]) =>
	(line: string) =>
		needles.every((needle) => line.includes(needle));
const consoleFindings = (shield: Shield, armedLines: Array<(line: string) => boolean> = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !armedLines.some((matches) => matches(line)));
/**
 * The path as the client logs it, which is not the path on the wire: `getApiConfig` puts `/api` on the base
 * (`api.service.ts:516`), while the error log names the request path it was handed. Measured in
 * `s3-lane-c-permissions-2.log` — a write the browser sent to `…/api/role-permissions/<id>` is logged as
 * `HTTP Error: PUT /role-permissions/<id> 500`.
 */
const loggedPath = (path: string) => path.replace(/^\/api/, '');

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/* ------------------------------------------------------------------ this file's stand-in for the roles API */

/** A `TRole` as `roleSchema` accepts it (`core/types/schemas/role/role.schema.ts:9-18`). */
type ServedRole = { id: string; name: string; isSystem: boolean; tenantId: string };
/** A `TRolePermission` row: only the keys `rolePermissionSchema` requires (`role-permission-schema.ts:6-15`). */
type ServedRow = { id: string; roleId: string; permission: string; enabled: boolean; tenantId: string };
type Refusal = { status: number; message: string };
type ServedCall = { method: string; path: string; query: string; body: string | null };

type StoreScript = {
	roles: ServedRole[];
	rows: ServedRow[];
	/** armed refusal for the permissions read (test 8) */
	read?: Refusal;
	/** armed refusal for every write; `armWrite` replaces it mid-test (test 7) */
	write?: Refusal;
	/** when given, the team reads are answered with this team instead of the mock's fixture */
	team?: Record<string, unknown>;
};

type PermissionStore = {
	calls: ServedCall[];
	/** the rows this file's fake server currently holds */
	rows: () => ServedRow[];
	rowOf: (id: string) => ServedRow | undefined;
	writes: () => ServedCall[];
	readsOf: (roleId: string) => ServedCall[];
	armWrite: (refusal: Refusal | undefined) => void;
};

/**
 * The store behind every served answer: the list always reflects the current rows, a `PUT` changes one row, a refusal
 * changes nothing. `page.route` is installed before the first navigation, so the mock never answers these paths.
 *
 * A `PUT` applies only the `enabled` the page sent (see finding 1): storing the whole body would put `organizationId`
 * into a row this app's own strict read schema rejects, which is a defect of this file's stub, not of the page.
 */
async function servePermissionStore(page: Page, script: StoreScript): Promise<PermissionStore> {
	const calls: ServedCall[] = [];
	const rows = [...script.rows];
	let writeRefusal = script.write;
	const isTeamPath = (pathname: string) =>
		pathname === TEAM_LIST_ROUTE || /^\/api\/organization-team\/[^/]+$/.test(pathname);
	const mine = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname === ROLES_ROUTE ||
			url.pathname === TEAM_ASSIGNABLE_ROLES_ROUTE ||
			url.pathname === PERMISSIONS_READ_PATH ||
			(url.pathname.startsWith(`${PERMISSIONS_ROUTE}/`) &&
				url.pathname !== MY_PERMISSIONS_ROUTE &&
				url.pathname.split('/').length === 4) ||
			(Boolean(script.team) && isTeamPath(url.pathname)));

	await page.route(mine, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});
		calls.push({ method, path: url.pathname, query: url.search.slice(1), body: request.postData() });

		if (script.team && isTeamPath(url.pathname))
			return url.pathname === TEAM_LIST_ROUTE
				? answer(200, { items: [script.team], total: 1 })
				: answer(200, script.team);
		if (url.pathname === ROLES_ROUTE || url.pathname === TEAM_ASSIGNABLE_ROLES_ROUTE)
			return answer(200, { items: script.roles, total: script.roles.length });
		if (url.pathname === PERMISSIONS_READ_PATH) {
			if (script.read)
				return answer(script.read.status, { statusCode: script.read.status, message: script.read.message });
			const roleId = url.searchParams.get('where[roleId]');
			const items = rows.filter((row) => row.roleId === roleId);
			return answer(200, { items, total: items.length });
		}
		const rowId = url.pathname.slice(PERMISSIONS_ROUTE.length + 1);
		if (writeRefusal)
			return answer(writeRefusal.status, { statusCode: writeRefusal.status, message: writeRefusal.message });
		const index = rows.findIndex((row) => row.id === rowId);
		if (index >= 0) {
			const sent = JSON.parse(request.postData() ?? '{}') as { enabled?: boolean };
			rows[index] = { ...rows[index], enabled: sent.enabled === true };
		}
		// Gauzy answers a saved switch with its update result, which is what `affectedRowsOf` reads (:104-111)
		return answer(200, { affected: 1, generatedMaps: [], raw: [] });
	});

	return {
		calls,
		rows: () => rows,
		rowOf: (id) => rows.find((row) => row.id === id),
		writes: () => calls.filter((call) => call.method === 'PUT'),
		readsOf: (roleId) =>
			calls.filter(
				(call) => call.method === 'GET' && call.path === PERMISSIONS_READ_PATH && call.query.includes(roleId)
			),
		armWrite: (refusal) => {
			writeRefusal = refusal;
		}
	};
}

/* ------------------------------------------------------------------ reading the printed rows */

type RowState = { label: string; text: string; checked: boolean };

/**
 * One read of every printed row: its label, the word beside its switch and the switch's own state. The walk is the
 * page's markup (`page-component.tsx:128-139`: row → control → toggle → switch), and `evaluateAll` sees only DOM —
 * nothing of this file.
 */
const rowStates = (page: Page): Promise<RowState[]> =>
	page.getByRole('switch').evaluateAll((nodes) =>
		nodes.map((node) => {
			const toggle = node.parentElement;
			const row = toggle?.parentElement?.parentElement;
			const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
			return {
				label: clean(row?.firstElementChild?.textContent),
				text: clean(toggle?.lastElementChild?.textContent),
				checked: node.getAttribute('aria-checked') === 'true'
			};
		})
	);

const expectedRows = (states: boolean[]): RowState[] =>
	ROW_LABELS.map((label, index) => ({
		label,
		text: states[index] ? EN.common.ACTIVATED : EN.common.DEACTIVATED,
		checked: Boolean(states[index])
	}));

const expectRows = async (page: Page, states: boolean[]) => {
	await expect(page.getByRole('switch')).toHaveCount(10, { timeout: 20_000 });
	await expect.poll(() => rowStates(page), { timeout: 20_000 }).toEqual(expectedRows(states));
};

const switchAt = (page: Page, index: number) => page.getByRole('switch').nth(index);
const pickRole = async (page: Page, name: string) => {
	await expect(page.getByText(name, { exact: true })).toHaveCount(1, { timeout: 20_000 });
	await page.getByText(name, { exact: true }).click({ timeout: 15_000 });
};

/** Concurrent reads arrive in race order: compare these sorted, never as recorded. */
const sortedPageCalls = (store: PermissionStore) =>
	[...new Set(store.calls.map((call) => `${call.method} ${call.path}`))].sort();

const waitUntilRead = async (store: PermissionStore, roleId: string, atLeast = 1) => {
	await expect.poll(() => store.readsOf(roleId).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(atLeast);
};

/* ------------------------------------------------------------------ this file's made-up data */

const ALPHA = 'a1a1a1a1-1111-4111-8111-111111111111';
const BETA = 'b2b2b2b2-2222-4222-8222-222222222222';
const GAMMA = 'c3c3c3c3-3333-4333-8333-333333333333';
const rowId = (roleId: string, n: number) => `d1d1d1d1-${roleId.slice(0, 4)}-4111-8111-${String(n).padStart(12, '0')}`;

const rolesOf = (tenantId: string): ServedRole[] => [
	{ id: ALPHA, name: 'Probe Alpha', isSystem: false, tenantId },
	{ id: BETA, name: 'Probe Beta', isSystem: false, tenantId },
	{ id: GAMMA, name: 'Probe Gamma', isSystem: false, tenantId }
];
/** the served order, which test 1 pins as the printed order */
const ROLE_NAMES = ['Probe Alpha', 'Probe Beta', 'Probe Gamma'];
/** what this file served as a body, read back: the row keys plus the `organizationId` the client pads in. */
const bodyOf = (call: ServedCall) => JSON.parse(call.body ?? '{}') as Partial<ServedRow> & { organizationId?: string };
const row = (roleId: string, n: number, permission: string, enabled: boolean, tenantId: string): ServedRow => ({
	id: rowId(roleId, n),
	roleId,
	permission,
	enabled,
	tenantId
});
/** Beta carries every key the ten rows read, one of them switched off. */
const betaRows = (tenantId: string) => [
	row(BETA, 1, 'TIME_TRACKER', true, tenantId),
	row(BETA, 2, 'ORG_TASK_ADD', true, tenantId),
	row(BETA, 3, 'ORG_TASK_EDIT', true, tenantId),
	row(BETA, 4, 'ORG_INVITE_EDIT', true, tenantId),
	row(BETA, 5, 'ORG_EMPLOYEES_EDIT', true, tenantId),
	row(BETA, 6, 'CHANGE_SELECTED_EMPLOYEE', true, tenantId),
	row(BETA, 7, 'ORG_TEAM_JOIN_REQUEST_EDIT', false, tenantId),
	row(BETA, 8, 'ORG_TASK_VIEW', true, tenantId)
];
/** Alpha has no `ORG_TASK_EDIT`, no `ORG_INVITE_EDIT`, no employee, no join-request and no task-view row at all. */
const alphaRows = (tenantId: string) => [
	row(ALPHA, 1, 'TIME_TRACKER', true, tenantId),
	row(ALPHA, 2, 'ORG_TASK_ADD', true, tenantId)
];
/** Gamma's shared pair is half on: `ORG_TASK_ADD` enabled, `ORG_TASK_EDIT` disabled. */
const gammaRows = (tenantId: string) => [
	row(GAMMA, 1, 'ORG_TASK_ADD', true, tenantId),
	row(GAMMA, 2, 'ORG_TASK_EDIT', false, tenantId)
];
const allRows = (tenantId: string) => [...betaRows(tenantId), ...alphaRows(tenantId), ...gammaRows(tenantId)];

/** Beta printed: only `Handle requests` off (`ORG_TEAM_JOIN_REQUEST_EDIT` is the one row served disabled). */
const BETA_PRINTED = [true, true, true, true, true, true, true, false, true, true];

test.describe('lane-c /permissions page', () => {
	test('1 · as an ADMIN the served roles are printed in the served order, with the prompt before a role is picked', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, { roles: rolesOf(tenantId), rows: allRows(tenantId) });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });

		await expect(page.getByRole('heading', { name: EN.pages.permissions.TITLE })).toBeVisible();
		await expect(page.getByText(EN.sidebar.DASHBOARD, { exact: true })).toHaveCount(1);
		await expect(page.getByText(EN.common.SELECT_ROLE, { exact: true })).toBeVisible();
		for (const name of ROLE_NAMES) {
			await expect(page.getByText(name, { exact: true })).toHaveCount(1, { timeout: 20_000 });
		}
		// the left column prints the roles in the order they were served: no sorting, no grouping. The items are plain
		// `div` children of `ROLE_LIST` (`page-component.tsx:107-122`), so their order is read as a list of texts.
		const roleList = page.getByText(ROLE_NAMES[0], { exact: true }).locator('xpath=..');
		const printedRoles = () =>
			roleList
				.locator('> div')
				.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		await expect.poll(printedRoles, { timeout: 20_000 }).toEqual(ROLE_NAMES);
		await expect(page.getByRole('switch')).toHaveCount(0);

		await expect
			.poll(() => store.calls.some((call) => call.method === 'GET' && call.path === ROLES_ROUTE), {
				timeout: 30_000
			})
			.toBe(true);
		// quiet window, 2 s: proves no permissions read is sent while no role is picked
		// (`use-role-permissions-query.ts:27` enables that query on `!!roleId` alone)
		await page.waitForTimeout(2_000);
		report('load reads', { calls: sortedPageCalls(store), queries: store.calls.map((call) => call.query) });
		// the roles read is the page's only read at load, and it carries no query of its own
		// (`role.service.ts:26` asks `/roles`; the scope travels as headers, `api-request-scope.ts:17-27`)
		expect(sortedPageCalls(store)).toEqual(['GET /api/roles']);
		expect([...new Set(store.calls.map((call) => call.query))]).toEqual(['']);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('2 · picking a role reads it with the role in the query and prints ten rows with their word', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, { roles: rolesOf(tenantId), rows: allRows(tenantId) });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, 'Probe Beta');
		await waitUntilRead(store, BETA);

		const read = store.readsOf(BETA)[0];
		const params = new URLSearchParams(read.query);
		report('permissions read query', { path: read.path, query: read.query });
		expect(read.path).toBe(PERMISSIONS_READ_PATH);
		// the role reaches the API twice: once inside `data.findInput`, once as `where` (`role-permission.service.ts:54-66`)
		expect(JSON.parse(params.get('data') ?? 'null')).toEqual({ findInput: { roleId: BETA, tenantId } });
		expect(params.get('where[roleId]')).toBe(BETA);
		expect(params.get('where[tenantId]')).toBe(tenantId);
		expect(sortedPageCalls(store)).toEqual(['GET /api/role-permissions/pagination', 'GET /api/roles']);

		await expectRows(page, BETA_PRINTED);
		await expect(page.getByText(EN.common.SELECT_ROLE, { exact: true })).toHaveCount(0);
		await expect(page.getByText(EN.common.ACTIVATED, { exact: true })).toHaveCount(9);
		await expect(page.getByText(EN.common.DEACTIVATED, { exact: true })).toHaveCount(1);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('3 · flipping a switch PUTs the row with enabled flipped, then shows the re-read', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, { roles: rolesOf(tenantId), rows: allRows(tenantId) });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, 'Probe Beta');
		await waitUntilRead(store, BETA);
		await expectRows(page, BETA_PRINTED);

		const timeTrackerRow = betaRows(tenantId)[0];
		expect(await rowStates(page)).toEqual(expectedRows(BETA_PRINTED));
		await switchAt(page, ROW.trackTime).click({ timeout: 15_000 });
		await expect.poll(() => store.writes().length, { timeout: 30_000 }).toBe(1);

		const [put] = store.writes();
		report('flip write', { path: put.path, body: put.body });
		expect(put.path).toBe(`${PERMISSIONS_ROUTE}/${rowId(BETA, 1)}`);
		// the whole row as the page read it, `enabled` flipped, plus the `organizationId` the client adds (finding 1)
		expect(bodyOf(put)).toEqual({
			id: rowId(BETA, 1),
			roleId: BETA,
			permission: 'TIME_TRACKER',
			enabled: false,
			tenantId,
			organizationId: fixture.ids.organizationA
		});
		expect(store.rowOf(rowId(BETA, 1))).toEqual({ ...timeTrackerRow, enabled: false });

		// the page re-reads the role once the mutation settles (`use-update-role-permission.ts:17-24`), and that re-read
		// is what the printed rows then show
		await waitUntilRead(store, BETA, 2);
		await expectRows(page, [false, ...BETA_PRINTED.slice(1)]);
		await expect(switchAt(page, ROW.trackTime)).toHaveAttribute('aria-checked', 'false');
		report('after flip', { rows: await rowStates(page), storeRows: store.rows().filter((r) => r.roleId === BETA) });
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('4 · four rows share ORG_TASK_ADD + ORG_TASK_EDIT: one click sends two PUTs and moves all four', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, { roles: rolesOf(tenantId), rows: allRows(tenantId) });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, 'Probe Beta');
		await waitUntilRead(store, BETA);
		await expectRows(page, BETA_PRINTED);

		await switchAt(page, ROW.estimateIssue).click({ timeout: 15_000 });
		await expect.poll(() => store.writes().length, { timeout: 30_000 }).toBe(2);
		const puts = store.writes().sort((a, b) => a.path.localeCompare(b.path));
		report('shared keys writes', { paths: puts.map((call) => call.path), bodies: puts.map((call) => call.body) });
		// both keys, two separate PUTs, no batching (`page-component.tsx:153-154`)
		expect(puts.map((call) => call.path)).toEqual([
			`${PERMISSIONS_ROUTE}/${rowId(BETA, 2)}`,
			`${PERMISSIONS_ROUTE}/${rowId(BETA, 3)}`
		]);
		expect(puts.map((call) => bodyOf(call).permission).sort()).toEqual(['ORG_TASK_ADD', 'ORG_TASK_EDIT']);
		expect(puts.map((call) => bodyOf(call).enabled)).toEqual([false, false]);

		await waitUntilRead(store, BETA, 2);
		// the clicked row and the three other task rows all read the same pair, so all four go off; the other six are
		// exactly as served
		await expectRows(page, [true, false, false, false, false, true, true, false, true, true]);
		expect(store.rowOf(rowId(BETA, 2))?.enabled).toBe(false);
		expect(store.rowOf(rowId(BETA, 3))?.enabled).toBe(false);

		// the same click where the pair is only half on (Gamma): 2 PUTs still, and nothing on screen moves (finding 3)
		await pickRole(page, 'Probe Gamma');
		await waitUntilRead(store, GAMMA);
		await expectRows(
			page,
			ROW_LABELS.map(() => false)
		);
		await switchAt(page, ROW.estimateIssue).click({ timeout: 15_000 });
		await expect.poll(() => store.writes().length, { timeout: 30_000 }).toBe(4);
		await waitUntilRead(store, GAMMA, 2);
		await expectRows(
			page,
			ROW_LABELS.map(() => false)
		);
		report('half-on pair', {
			gammaAdd: store.rowOf(rowId(GAMMA, 1))?.enabled,
			gammaEdit: store.rowOf(rowId(GAMMA, 2))?.enabled
		});
		expect(store.rowOf(rowId(GAMMA, 1))?.enabled).toBe(false);
		expect(store.rowOf(rowId(GAMMA, 2))?.enabled).toBe(true);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('5 · switching roles reads the new role and shows none of the first role state', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, { roles: rolesOf(tenantId), rows: allRows(tenantId) });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, 'Probe Beta');
		await waitUntilRead(store, BETA);
		await expectRows(page, BETA_PRINTED);

		await pickRole(page, 'Probe Alpha');
		await waitUntilRead(store, ALPHA);
		const reads = [store.readsOf(BETA), store.readsOf(ALPHA)];
		report('role switch reads', { beta: reads[0].length, alpha: reads[1].length });
		// two different roles asked for, each with its own `where[roleId]`
		expect(reads.map((calls) => calls.length >= 1)).toEqual([true, true]);
		expect(new URLSearchParams(store.readsOf(ALPHA)[0].query).get('where[roleId]')).toBe(ALPHA);

		// Alpha: its own `TIME_TRACKER` row is on, and `Estimate issue` is off because this role has no `ORG_TASK_EDIT`
		// row to pair its enabled `ORG_TASK_ADD` with (`page-component.tsx:148-151`)
		await expectRows(page, [true, false, false, false, false, false, false, false, false, false]);
		expect(store.readsOf(ALPHA).every((call) => call.query.includes(ALPHA))).toBe(true);
		expect(store.readsOf(BETA).some((call) => call.query.includes(ALPHA))).toBe(false);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('6 · a role whose served rows are only part of the ten: the missing ones print Deactivated and their click sends nothing', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, { roles: rolesOf(tenantId), rows: allRows(tenantId) });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, 'Probe Alpha');
		await waitUntilRead(store, ALPHA);

		await expectRows(page, [true, false, false, false, false, false, false, false, false, false]);
		await switchAt(page, ROW.viewDetails).click({ timeout: 15_000 });
		await switchAt(page, ROW.removeMembers).click({ timeout: 15_000 });
		// quiet window, 2 s: proves a flip of a permission this role has no row for sends nothing at all
		// (`page-component.tsx:68` returns before any request, so no id can be invented)
		await page.waitForTimeout(2_000);
		report('flips of missing rows', { writes: store.writes().length });
		expect(store.writes()).toEqual([]);
		await expectRows(page, [true, false, false, false, false, false, false, false, false, false]);

		// and the row that does exist still writes normally
		await switchAt(page, ROW.trackTime).click({ timeout: 15_000 });
		await expect.poll(() => store.writes().length, { timeout: 30_000 }).toBe(1);
		const [put] = store.writes();
		report('existing row write', { path: put.path, body: put.body });
		expect(put.path).toBe(`${PERMISSIONS_ROUTE}/${rowId(ALPHA, 1)}`);
		expect(bodyOf(put)).toEqual({
			id: rowId(ALPHA, 1),
			roleId: ALPHA,
			permission: 'TIME_TRACKER',
			enabled: false,
			tenantId,
			organizationId: fixture.ids.organizationA
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('7 · a refused save (403, then 500): a toast names the reason and the switch stays where the server left it', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const refusalOf = (status: number): Refusal => ({
			status,
			message: `permissions probe refused the save ${status}`
		});
		const store = await servePermissionStore(page, {
			roles: rolesOf(tenantId),
			rows: allRows(tenantId),
			write: refusalOf(403)
		});
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, 'Probe Beta');
		await waitUntilRead(store, BETA);
		await expectRows(page, BETA_PRINTED);

		// 403
		await switchAt(page, ROW.trackTime).click({ timeout: 15_000 });
		await expect.poll(() => store.writes().length, { timeout: 30_000 }).toBe(1);
		expect(store.writes()[0].path).toBe(`${PERMISSIONS_ROUTE}/${rowId(BETA, 1)}`);
		await expect(page.getByText(EN.toasts.MUTATION_FAILED, { exact: true })).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(EN.toasts.REASONS.PERMISSION, { exact: true })).toBeVisible({ timeout: 15_000 });
		// the store never moved, so neither can the re-read: the switch keeps the state the server has
		expect(store.rowOf(rowId(BETA, 1))).toEqual({ ...betaRows(tenantId)[0] });
		await waitUntilRead(store, BETA, 2);
		await expectRows(page, BETA_PRINTED);

		// 500 on another row
		store.armWrite(refusalOf(500));
		await switchAt(page, ROW.inviteMembers).click({ timeout: 15_000 });
		await expect.poll(() => store.writes().length, { timeout: 30_000 }).toBe(2);
		await expect(page.getByText(EN.toasts.MUTATION_FAILED, { exact: true })).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(EN.toasts.REASONS.SERVER, { exact: true })).toBeVisible({ timeout: 15_000 });
		expect(store.rowOf(rowId(BETA, 4))).toEqual({ ...betaRows(tenantId)[3] });
		await expectRows(page, BETA_PRINTED);
		report('refused writes', {
			paths: store.writes().map((call) => call.path),
			storeRowAfter403: store.rowOf(rowId(BETA, 1))?.enabled,
			storeRowAfter500: store.rowOf(rowId(BETA, 4))?.enabled
		});

		// only the refusals this test armed, each excused by a group naming its own path AND its status, plus the dev
		// mutation line, excused only by the armed message it carries (`mutation-error-toaster.tsx:48`). The client logs
		// the request path without the `/api` base it puts on the wire (`api.service.ts:516`), measured in this run:
		// `HTTP Error: PUT /role-permissions/<id> 500` for a call made to `…/api/role-permissions/<id>`.
		const [refused403, refused500] = store.writes().map((call) => loggedPath(call.path));
		expect([refused403, refused500]).toEqual([
			loggedPath(`${PERMISSIONS_ROUTE}/${rowId(BETA, 1)}`),
			loggedPath(`${PERMISSIONS_ROUTE}/${rowId(BETA, 4)}`)
		]);
		const armedLines = [
			armed('HTTP 403 Forbidden - PUT ', refused403),
			armed('HTTP Error: PUT ', refused500, '500'),
			armed('Mutation failed:', 'permissions probe refused the save 403'),
			armed('Mutation failed:', 'permissions probe refused the save 500')
		];
		report('refused write console', { findings: consoleFindings(shield, armedLines) });
		expect(consoleFindings(shield, armedLines), 'the page logged a console error this test did not arm').toEqual(
			[]
		);
	});

	test('8 · a refused permissions read (500): the ten rows still print, all Deactivated, with no failure copy of its own', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, {
			roles: rolesOf(tenantId),
			rows: allRows(tenantId),
			read: { status: 500, message: 'permissions probe broke the read' }
		});
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, 'Probe Beta');
		await expect.poll(() => store.readsOf(BETA).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);

		await expect(page.getByRole('switch')).toHaveCount(10, { timeout: 20_000 });
		await expectRows(
			page,
			ROW_LABELS.map(() => false)
		);
		// nothing on screen says the read failed: no save-failure toast, and the prompt is gone because a role IS picked
		await expect(page.getByText(EN.toasts.MUTATION_FAILED, { exact: true })).toHaveCount(0);
		await expect(page.getByText(EN.common.SELECT_ROLE, { exact: true })).toHaveCount(0);
		await expect(page.getByText(EN.common.DEACTIVATED, { exact: true })).toHaveCount(10);
		await expect(page.getByText(EN.common.ACTIVATED, { exact: true })).toHaveCount(0);
		report('refused read', { attempts: store.readsOf(BETA).length, rows: await rowStates(page) });

		// the count of a failed read varies with the mounts, so it is never pinned; only its error line is excused
		expect(
			consoleFindings(shield, [armed('HTTP Error: GET ', loggedPath(PERMISSIONS_READ_PATH), '500')]),
			'the page logged a console error this test did not arm'
		).toEqual([]);
	});

	test('9 · a MANAGER who manages the team may open the page, and no roles read is sent for them', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, { roles: rolesOf(tenantId), rows: allRows(tenantId) });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'MANAGER', manager: true } });

		await expect(page.getByRole('heading', { name: EN.pages.permissions.TITLE })).toBeVisible();
		await expect(page.getByText(EN.common.SELECT_ROLE, { exact: true })).toBeVisible();
		await expect(page.getByRole('switch')).toHaveCount(0);
		await expect(page.getByText('Probe Alpha', { exact: true })).toHaveCount(0);
		// quiet window, 2.5 s: proves no roles request is sent at all for a non-admin asking `adminOnly` —
		// `use-roles-query.ts:45` (`allowed = isAdmin || !adminOnly`) and :64-67 (the data stays `[]`)
		await page.waitForTimeout(2_500);
		report('manager page', { calls: store.calls.map((call) => `${call.method} ${call.path}`) });
		expect(store.calls).toEqual([]);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('10 · a member who is not a manager of a team that has managers gets the not-found page instead', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, {
			roles: rolesOf(tenantId),
			rows: allRows(tenantId),
			team: teamWhoseManagersExcludeTheSignedInPerson(fixture)
		});
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'EMPLOYEE', manager: false } });

		await expect(page.getByText(EN.pages.page404.HEADING_TITLE, { exact: true })).toHaveCount(1, {
			timeout: 20_000
		});
		await expect(page.getByText(EN.pages.page404.HEADING_DESCRIPTION, { exact: true })).toHaveCount(1);
		await expect(page.getByRole('link', { name: EN.pages.taskDetails.GO_BACK_HOME })).toBeVisible();
		await expect(page.getByRole('switch')).toHaveCount(0);
		await expect(page.getByText(EN.common.SELECT_ROLE, { exact: true })).toHaveCount(0);
		await expect(page.getByText(EN.pages.permissions.TITLE, { exact: true })).toHaveCount(0);
		await expect(page.getByText('Probe Alpha', { exact: true })).toHaveCount(0);
		await expect
			.poll(() => sortedPageCalls(store), { timeout: 20_000 })
			.toEqual([`GET ${TEAM_LIST_ROUTE}`, `GET ${TEAM_LIST_ROUTE}/${fixture.ids.teamA}`]);
		report('refused member', { calls: sortedPageCalls(store) });
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});
});

/**
 * A team the page's own gate refuses this person: their member row says `isManager: false` with role `EMPLOYEE`, and
 * the team's manager list holds someone else (`page-component.tsx:57-62` → `NotFound` :78-90;
 * `use-team-member.ts:19-42`, `core/stores/teams/organization-team.ts:96`). It is served only for the team reads, on
 * the lane fixture's own team ids, because the mock's fixture team has no manager this person is not
 * (`mock-gauzy-server.mjs:217-225`, `:250`).
 */
function teamWhoseManagersExcludeTheSignedInPerson(fixture: {
	ids: Record<string, string>;
	names: Record<string, string>;
	profileLink: string;
}) {
	const { ids, names } = fixture;
	const memberOf = (options: {
		id: string;
		employeeId: string;
		userId: string;
		name: string;
		isManager: boolean;
		roleName: string;
	}) => ({
		id: options.id,
		employeeId: options.employeeId,
		employee: {
			id: options.employeeId,
			userId: options.userId,
			user: {
				id: options.userId,
				name: options.name,
				firstName: options.name.split(' ')[0] ?? options.name,
				lastName: options.name.split(' ').slice(1).join(' '),
				email: `${options.userId}@example.test`,
				timeZone: 'UTC',
				isEmailVerified: true,
				tenantId: ids.tenantA,
				employeeId: options.employeeId
			},
			fullName: options.name,
			isTrackingEnabled: true,
			isActive: true,
			organizationId: ids.organizationA,
			tenantId: ids.tenantA
		},
		user: { id: options.userId, name: options.name },
		isManager: options.isManager,
		isActive: true,
		isTrackingEnabled: true,
		activeTaskId: null,
		activeTask: null,
		organizationTeamId: ids.teamA,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		roleId: ids.role,
		role: { id: ids.role, name: options.roleName, isSystem: true, rolePermissions: [], tenantId: ids.tenantA },
		totalWorkedTasks: [],
		totalTodayTasks: []
	});
	const self = memberOf({
		id: ids.member,
		employeeId: ids.employee,
		userId: ids.user,
		name: names.user,
		isManager: false,
		roleName: 'EMPLOYEE'
	});
	// made-up ids for the manager this person is not
	const manager = memberOf({
		id: '66666666-6666-4666-8666-999999999999',
		employeeId: '55555555-5555-4555-8555-999999999999',
		userId: '44444444-4444-4444-8444-999999999999',
		name: 'Probe Boss',
		isManager: true,
		roleName: 'MANAGER'
	});
	return {
		id: ids.teamA,
		name: names.teamA,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		public: true,
		profile_link: fixture.profileLink,
		prefix: 'FIA',
		shareProfileView: false,
		requirePlanToTrack: false,
		members: [self, manager],
		managers: [manager],
		projects: [],
		tasks: [],
		statuses: [
			{
				id: ids.todoStatus,
				name: 'open',
				value: 'open',
				color: '#94a3b8',
				order: 1,
				isSystem: true,
				isDefault: true,
				isTodo: true,
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				organizationTeamId: ids.teamA
			}
		]
	};
}
