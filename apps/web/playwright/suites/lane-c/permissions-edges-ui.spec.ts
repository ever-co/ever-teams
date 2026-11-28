import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The **edges** of the permissions page (`/permissions`) on lane-c (app `http://localhost:3033`, mock
 * `http://127.0.0.1:4002`, control `4004` — `playwright/test-servers.ts:40`): the roles read refused, an empty roles
 * list, a permissions read held open, a write the API answers with `affected: 0`, a write held open, the two
 * skeletons, and the breadcrumb. `suites/lane-c/permissions-page-ui.spec.ts` (accepted) owns the role list, the ten
 * switches, a write and its re-read, a refused write, a refused permissions read and the access gate; nothing here
 * repeats those.
 *
 * The page driven here is `app/[locale]/(main)/permissions/page.tsx` →
 * `core/components/pages/permissions/page-component.tsx` (`Permissions`, wrapped by
 * `withAuthentication(Permissions, { skeleton: PermissionsPageSkeleton })` at :298-301), with its left column
 * (`ROLE_LIST`, :107-123 + `RoleListSkeleton` at :108), its ten `CommonToggle` rows (:126-288;
 * `core/components/common/toggler.tsx:166-189`), `core/components/pages/permissions/permissions-page-skeleton.tsx`
 * (`PermissionsToolbar` :14-24 → `PageUpdatingBar` at :21, `RoleListSkeleton` :26-36, `SelectRolePrompt` :38-50,
 * `PermissionsContentSkeleton` :52-63, `PermissionsPageSkeleton` :65-71), `core/components/layouts/page-skeleton.tsx`
 * (`PageUpdatingBar` :16-25, `BreadcrumbSkeleton` :28-36, `PageSkeletonFrame` :97-116) and
 * `core/components/duplicated-components/breadcrumb.tsx` :29-73 through `PageLayout`'s `breadcrumb` slot
 * (`core/components/layouts/default-layout/page-layout.tsx:30`, `global-header.tsx:48`).
 *
 * ## Where the numbers came from
 *
 * Everything pinned below was printed by the throwaway probes `D:\Coding\.tmp\probe-permissionsedge\probe1.spec.ts`
 * (log `D:\Coding\.tmp\s3-lane-c-permissionsedge-probe2.log`, 7 passed — the refused roles read, the empty roles list,
 * the held permissions read, `affected: 0`, the held write, the skeletons, the breadcrumb DOM) and
 * `…\probe3.spec.ts` (log `…\s3-lane-c-permissionsedge-probe3.log`, 3 passed — `affected: 0` answered faithfully, the
 * rows while the first read is held, the bar during a re-read), both run on this lane on 2026-11-28 with a config
 * that starts no server. The first probe round (`…-probe1.log`) is in the record only for its failure: seven
 * `locator.evaluateAll` callbacks referenced the Node-side `flat()` helper and threw `flat is not defined`
 * (brief-common's first trap) — no measurement from it is used. This file's own `report('…')` lines print the same
 * measurements again in its runs.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock (`cypress/support/mock-gauzy-server.mjs`) answers the session and the shell reads this page
 * depends on — `GET /api/user/me` with the fixture person and its role (:607, role chosen by `scenario.roleName`,
 * :73-78), `GET /api/organization-team` and `/api/organization-team/<id>` (:655-656) and `GET /api/role-permissions/me`
 * (:674, the **shell's** read, never this page's). The NextAuth session stub, the cookies and the app's own shell are
 * the lane's. Test 6 is the one test that touches a shell read at all, and only to **delay** it (see the stub note).
 *
 * **Served by this file:** the roles list (`GET /api/roles`) and this page's own permissions read and write, through
 * `page.route` on the mock origin behind a store (`servePermissionStore`): the list answer is always the current
 * store, a `PUT` changes one row of it when the answer says a row changed, and an armed refusal or `affected: 0`
 * changes nothing. Every answer restates the mock's CORS answer and answers `OPTIONS` with 204 first (the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:227-299`, same shape as
 * `suites/lane-c/permissions-page-ui.spec.ts:253-367`); `route.fetch()` is never called, so `store.calls` staying the
 * way it is pinned is the witness that the page acted on this file. One handler is **not** a stub: for test 6,
 * `/api/user/me` on the mock origin is held open on a gate and then handed to the mock with `route.continue()` —
 * this file never claims its handler answered it, only that it kept the answer out long enough to see the wait.
 *
 * **The browser talks to the mock, never to the app's own route twins** (the lane publishes
 * `NEXT_PUBLIC_GAUZY_API_SERVER_URL` = the mock origin, `test-servers.ts:122-123` →
 * `core/constants/config/constants.tsx:229` → `rolePermissionsPath`'s direct branch,
 * `core/services/client/api/roles/role-permission.service.ts:14-20`, `core/services/client/api.service.ts:516`), so
 * `app/api/role-permissions/[id]/route.ts` and `app/api/roles/route.ts` are not in this file's path.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/pages/permissions/page-component.tsx`: `useUserQuery()` :42, `useRolePermissionsQuery(selectedRoleId)`
 *   :50 (`isLoading` named `isRolePermissionsLoading`), `useUpdateRolePermission` :51, `useRolesQuery({ adminOnly: true })`
 *   :54 (`isLoading` named `isRolesLoading`), the toggle guard `if (!permission || !selectedRoleId) return;` :68, the
 *   breadcrumb slot :96-104 (`<Breadcrumb paths={[t('sidebar.DASHBOARD'), t('pages.permissions.TITLE')]} />` at :100-102),
 *   `mainHeaderSlot={<PermissionsToolbar isUpdating={isRolePermissionsLoading} />}` :105, the left column :107-123
 *   (`{isRolesLoading && <RoleListSkeleton />}` :108, items are plain `div`s :112-121), the ten rows :126-288,
 *   `{!selectedRole && <SelectRolePrompt />}` :290.
 * - `core/hooks/roles/use-roles-query.ts`: `queryEnabled` :46, `isSuccess` :52, `rolesReady = allowed && isSuccess` :64,
 *   `roles = rolesReady ? (rolesData?.items ?? []) : []` :67 — a refused read hands the page `[]` and stops being
 *   `isLoading`.
 * - `core/hooks/roles/use-role-permissions-query.ts`: `enabled: !!roleId` :27, `isLoading` :19, `rolePermissionsFormated`
 *   keyed by `permission` :37-43. `core/hooks/roles/use-update-role-permission.ts`: `onSettled →
 *   invalidateRolePermissions(roleId)` :19-23, no `onError`; `core/hooks/roles/use-invalidate-role-permissions.ts`:17
 *   (`invalidateQueries`, the cached rows stay).
 * - `core/services/client/api/roles/role-permission.service.ts`: the write :95-100 (`PUT /role-permissions/<id>`),
 *   `affectedRows === 0` → `throw new Error('The permission was not saved: the API changed no row')` :105-108 (its own
 *   comment :106: "The row is gone (removed since the page loaded): nothing was saved"), `affectedRows !== null` → the
 *   row it sent :109-111.
 * - `core/components/common/mutation-error-toaster.tsx`: `leavesErrorToFallback` :23-30 (this mutation has no
 *   `onError` and no `handlesOwnError`, so the fallback speaks), dev `console.error('Mutation failed:', …)` :48, toast
 *   `toasts.MUTATION_FAILED` + the reason sentence from `errorReasonKeyOf` :53-56.
 *   `core/lib/utils/error-feedback.ts`: `reasonOfStatus` :153-176, `errorReasonOf` :180-201 (no status, not a network
 *   failure → `unknown`), `errorReasonKeyOf` :203-205.
 * - `core/components/layouts/page-skeleton.tsx`: `PageUpdatingBar` returns `null` unless `isUpdating` :17-19, else
 *   `<output aria-label={label} …>` :21-23; `PageSkeletonFrame` :97-116 → `<div role="status" aria-live="polite"
 *   aria-busy="true" class="contents">` with `<span class="sr-only">{t('common.LOADING')}</span>` :110-111 and
 *   `breadcrumb={<BreadcrumbSkeleton />}` :106 (that skeleton is `aria-hidden` and holds no `nav`).
 * - `core/components/duplicated-components/breadcrumb.tsx`: `<nav aria-label="breadcrumb">` :31, `isLink = typeof path ===
 *   'object'` :36, a plain crumb is a `<span>` :51-53, a link crumb :55-65, the last crumb `aria-current="page"` :24-26
 *   and :48-50, the separator `li` `aria-hidden="true"` :42-46.
 * - `core/components/common/toggler.tsx`: `CommonToggle` :166-189 → Base UI `<Switch disabled checked={enabled}
 *   onChange>` :183 (controlled by the value the read handed the page) + `<Text>{enabled ? enabledText : disabledText}</Text>` :186.
 * - `core/components/layouts/app/authenticator.tsx`: `isUserPending = !userQuery.data || userQuery.isLoading` :94 →
 *   `const PageSkeleton = params.skeleton ?? GlobalSkeleton; return <PageSkeleton />` :96-97.
 * - `locales/en.json` by key: `pages.permissions.TITLE`, `pages.permissions.LOADING_PERMISSIONS`, `common.LOADING`,
 *   `common.SELECT_ROLE`, `common.ACTIVATED`, `common.DEACTIVATED`, `sidebar.DASHBOARD`,
 *   `pages.settingsTeam.TRACK_TIME … VIEW_DETAILS`, `toasts.MUTATION_FAILED`, `toasts.REASONS.UNKNOWN`,
 *   `toasts.REASONS.PERMISSION`, `toasts.REASONS.SERVER`.
 *
 * ## What the probes measured (this file's assertions are pinned on these)
 *
 * - **Roles read 500** (probe2 P1): the left column's `ROLE_LIST` container is there with **0** children and no
 *   skeleton row; `common.SELECT_ROLE` is still on screen; **0** switches; the heading and the breadcrumb are normal;
 *   2 roles reads were recorded (one retry — never pinned); the console held only
 *   `… [HttpClient] HTTP Error: GET /roles 500 {…}` ×2; no page error; the only on-screen sign of the failure was the
 *   dev-mode `DEV Query failed … Copy details` toast, and the app's own `toasts.MUTATION_FAILED` toast count was 0.
 * - **Empty roles list** (probe2 P2): the same picture from a clean answer — container present, 0 children, 0 skeleton
 *   rows, prompt on screen, 0 switches, console empty; the calls were exactly `GET /api/roles` (1) and **no**
 *   permissions read at all.
 * - **Permissions read held** (probe2 P3 + probe3 Q2): before a role is picked the bar count is 0 and the prompt is 1;
 *   while the read is recorded and unanswered the toolbar prints **1** `<output aria-label="Reading the role's
 *   permissions">` (its whole element measured), the prompt is 0, **10** switches are printed **all Deactivated /
 *   `aria-checked="false"`** (the served rows are not in the query data yet), and a click in that window sent **0**
 *   requests; after the release the bar is 0 and the rows are as served.
 * - **Re-read vs first read** (probe3 Q3): with the invalidation re-read held, the bar count stayed **0** and the
 *   printed rows kept the state before the write until the answer arrived. The bar follows `isRolePermissionsLoading`
 *   (`page-component.tsx:105`), which is TanStack's "no data yet" flag, so it is a first-read indicator here.
 * - **`affected: 0`** (probe3 Q1, answered faithfully: the row was not changed): the PUT was sent as the page reads the
 *   row; the switch **never moved** (`aria-checked="true"` and `Activated` before the click, right after the answer and
 *   after the re-read); the toasts were the dev one (`DEV Mutation failed updateRolePermission The permission was not
 *   saved: the API changed no row Copy details`) and the app's own `That change was not saved` + `Try again in a
 *   moment.`; the console held exactly one line, `Mutation failed: Error: The permission was not saved: the API changed
 *   no row`; no page error; no `[HttpClient] HTTP Error` line (the answer was 200).
 * - **Write held** (probe2 P5): while the PUT was recorded and unanswered the row still read `Activated` /
 *   `aria-checked="true"`, no re-read had been sent after the write, the bar was 0 and there was no toast; after the
 *   release the store row flipped, a re-read followed and the row printed `Deactivated`.
 * - **Skeletons** (probe2 P6, with `/api/user/me` delayed and `/api/roles` held): while the person's read was
 *   outstanding — `[role="status"][aria-busy="true"]` ×1, `common.LOADING` ×1, 4 `aria-hidden` skeleton rows inside the
 *   `ROLE_LIST` container, **0** `nav[aria-label="breadcrumb"]` (the skeleton's breadcrumb is `aria-hidden` bars), 0
 *   switches, 0 role names, heading present; once the person had arrived with the roles read still outstanding — the
 *   skeleton region and its `Loading` were gone, `nav[aria-label="breadcrumb"]` ×1, still 4 skeleton rows, the roles
 *   read recorded and unanswered; after that answer — 0 skeleton rows and the 3 served role names. Console clean, no
 *   page error. (`.animate-pulse` counted 12 in the first phase and 4 in the second — the shell's own skeletons are in
 *   that number while the shell is still booting, so it is reported, never pinned.)
 * - **Breadcrumb** (probe2 P7): one `nav[aria-label="breadcrumb"]` with 3 `li`s — `Dashboard` as
 *   `<span class="text-muted-foreground">`, an `aria-hidden` chevron `li`, then `Roles & permissions` as a `<span>` in
 *   the `li` carrying `aria-current="page"`; **0** `a` inside the nav, and **0** links anywhere on the page whose text
 *   is `Dashboard`.
 *
 * ## Findings (tagged only where the code says otherwise; here no comment, type, unit test or copy states another
 * intent, so all of them are measured and untagged)
 *
 * 1. **A refused roles read leaves nothing on the page.** `use-roles-query.ts:64` (`rolesReady = allowed && isSuccess`)
 *    hands `roles = []` (:67) and `isLoading` goes false, so `page-component.tsx:108` drops `RoleListSkeleton` and the
 *    left column renders as an empty `div` (measured: container present, 0 children). Nothing on the page says the read
 *    failed; only the client's HTTP error line and the dev toast do. A hardening idea: the `Notice` + `Try again` the
 *    api-tokens settings page shows for its own list (`api-tokens-settings-page.tsx:109-120`).
 * 2. **A refused roles read and an empty roles list print the same screen** (both measured above: container, 0
 *    children, prompt, 0 switches, 0 skeleton rows). The page has no empty-state copy of its own (`page-component.tsx:107-123`
 *    renders only the roles it was given, and there is no `roles.length` branch). Untagged: no copy or comment promises
 *    one.
 * 3. **The toolbar bar is a first-read indicator here, not a re-read one.** `page-component.tsx:105` passes
 *    `isRolePermissionsLoading` from `use-role-permissions-query.ts:19`, and with cached rows a refetch is not
 *    `isLoading`, so a held re-read measured bar count **0** while the rows kept the pre-write state (probe3 Q3).
 *    `page-skeleton.tsx:13-15` describes the bar as "Data being read again while the page keeps showing what it has" —
 *    those words describe the component for its callers and do not say this caller must pass a re-read flag, so this is
 *    stated as measured behaviour, not as a deviation.
 * 4. **A flip clicked while the role's only read is still in flight sends nothing.** `rolePermissionsFormated` is empty
 *    until the answer (`use-role-permissions-query.ts:31-43`), so `page-component.tsx:68` returns before any request
 *    (measured: 0 writes in a 2 s window) while the rows on screen already print ten Deactivated switches. Untagged:
 *    that guard is what keeps a flip from inventing an id — the same guard finding 4 of `permissions-page-ui.spec.ts`
 *    pins for a missing row.
 * 5. **`affected: 0` is reachable through this page, and what it says is "Try again in a moment."** The accepted spec
 *    wrote that it was unreachable via a UI spec because its store always answered `affected: 1`; here the store answers
 *    `affected: 0` and changes no row, the service throws (`role-permission.service.ts:105-108`), and because that error
 *    carries no HTTP status `errorReasonOf` falls through to `unknown` (`error-feedback.ts:180-201`), so the toast is
 *    `toasts.MUTATION_FAILED` + `toasts.REASONS.UNKNOWN`. Nothing on screen says *which* switch, and nothing moved, so
 *    the person sees a failed change with no trace of it. A hardening idea: the row-gone case has its own copy
 *    (`toasts.REASONS.NOT_FOUND` "This item no longer exists. Refresh the page.") which is what
 *    `role-permission.service.ts:106` describes.
 * 6. **The breadcrumb has no link at all, so the Dashboard crumb has no `href` to read.** `page-component.tsx:100-102`
 *    passes two translated strings, and `breadcrumb.tsx:36` turns a crumb into a `<Link href>` only for an object crumb
 *    (`{ title, href }`, as other pages pass: `core/components/pages/time-and-activity/page-component.tsx:164`
 *    `{ title: …, href: '/' }`, `core/components/pages/task-trash/team-task-trash-page.tsx:24-25`). Measured: 0 `a`
 *    inside `nav[aria-label="breadcrumb"]`, 0 `Dashboard` links on the whole page. That closes the survey item "the
 *    click on Dashboard (or its href)" (`D:\Coding\.tmp\surveys\map-permissions-gaps-2026-11-28.md` §4.10) as
 *    unmeasurable on this page: there is nothing to click.
 *
 * ## What this file does not cover
 *
 * The accepted spec's ground (role order, the ten rows' keys, a saved write, the shared-key rows, a refused write, a
 * refused permissions read, the MANAGER / EMPLOYEE gate), the proxy-mode twins `app/api/roles/route.ts` and
 * `app/api/role-permissions/[id]/route.ts`, `GET /api/roles/team-assignable` (never asked from this page — pinned by
 * `permissions-page-ui.spec.ts` test 9), role create/rename/delete (no UI here), `UserReadFailedState`
 * (`authenticator.tsx:89-92`, the shell's own screen, not this page's), the `toasts.REASONS.NOT_FOUND` copy (no page
 * here asks for it), and the bar's shimmer animation (a CSS keyframe, not an assertion).
 *
 * ## Console and secrets
 *
 * `consoleFindings` keeps every console error the shield collected except React's dev store warning
 * (`SHELL_STORE_NOISE`, as `suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`), the lane's own shell health-check
 * timeout (`HEALTH_CHECK_NOISE`, `core/services/client/api/default.ts:42`), and the errors this file **armed**, each
 * excused only by a group of needles naming both its path and its status — the client logs the request path **without**
 * the `/api` base the wire call carries (`api.service.ts:516`; measured in `s3-lane-c-permissionsedge-probe2.log`:
 * `HTTP Error: GET /roles 500` for a call made to `…/api/roles`), which `loggedPath` applies. The dev-only
 * `Mutation failed:` line (`mutation-error-toaster.tsx:48`) is excused **only in test 4**, which arms that throw, and
 * only by the exact message it carries. No token, header or session value is printed: the served roles and rows are
 * this file's own made-up ids, and the read query is pinned by its values.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const PERMISSIONS_PATH = '/permissions';
const ROLES_ROUTE = '/api/roles';
const PERMISSIONS_ROUTE = '/api/role-permissions';
const MY_PERMISSIONS_ROUTE = '/api/role-permissions/me';
const PERMISSIONS_READ_PATH = `${PERMISSIONS_ROUTE}/pagination`;
const USER_ME_ROUTE = '/api/user/me';
/** `ROLE_LIST` (`permissions-page-skeleton.tsx:12`), used verbatim as the container's whole `class` attribute. */
const ROLE_LIST_CLASS = 'flex w-full flex-col gap-0.5 md:sticky md:top-4';
/** `PageSkeletonFrame` (`page-skeleton.tsx:110`) — the page skeleton's only region. */
const PAGE_SKELETON_SELECTOR = '[role="status"][aria-busy="true"]';
/** `Breadcrumb` (`breadcrumb.tsx:31`) versus `BreadcrumbSkeleton` (`page-skeleton.tsx:30`, `aria-hidden`, no `nav`). */
const BREADCRUMB_NAV_SELECTOR = 'nav[aria-label="breadcrumb"]';
/** `RoleListSkeleton` (`permissions-page-skeleton.tsx:26-36`): one `aria-hidden` row per entry of `ROLE_ROW_WIDTHS` (:8, 4). */
const ROLE_SKELETON_ROW_COUNT = 4;

/** `locales/en.json`, read by key: never typed. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: { ACTIVATED: string; DEACTIVATED: string; SELECT_ROLE: string; LOADING: string };
	sidebar: { DASHBOARD: string };
	pages: {
		permissions: { TITLE: string; LOADING_PERMISSIONS: string };
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
	};
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
};
const T_TEAM = EN.pages.settingsTeam;

/** The ten rows in the order the page prints them (`page-component.tsx:128-288`). */
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
const ROW = { trackTime: 0 } as const;

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-c permissions edges] MEASURE ${label} ${JSON.stringify(value)}`);

/** React's dev-mode store warning, not this page's (`chat-conversation-ui.spec.ts:1074-1076`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The lane shell's own `GET /api/health` giving up after its 30 s axios timeout (`core/services/client/api/default.ts:42`
 * logs it). Shell noise like the line above, excused only by its full text.
 */
const HEALTH_CHECK_NOISE = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';
/** One armed refusal: a console line is excused only when it names every needle of the group. */
const armed =
	(...needles: string[]) =>
	(line: string) =>
		needles.every((needle) => line.includes(needle));
const consoleFindings = (shield: Shield, armedLines: Array<(line: string) => boolean> = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(HEALTH_CHECK_NOISE))
		.filter((line) => !armedLines.some((matches) => matches(line)));
/**
 * The path as the client logs it, which is not the path on the wire: `getApiConfig` puts `/api` on the base
 * (`api.service.ts:516`) while the error log names the request path it was handed. Measured in
 * `s3-lane-c-permissionsedge-probe2.log`: `HTTP Error: GET /roles 500` for a call made to `…/api/roles`.
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
/** A call this file's handler took; `answered` flips only once its answer was written. */
type ServedCall = { method: string; path: string; query: string; body: string | null; answered: boolean };
/** A hold: the handler waits on `promise` until the test calls `release()`. */
type Gate = { promise: Promise<void>; release: () => void };
const gate = (): Gate => {
	let release: () => void = () => undefined;
	const promise = new Promise<void>((done) => {
		release = done;
	});
	return { promise, release };
};

type StoreScript = {
	roles: ServedRole[];
	rows: ServedRow[];
	/** refuse `GET /api/roles` with this (test 1) */
	rolesRead?: Refusal;
	/** answer `GET /api/roles` only after this gate (test 6) */
	holdRolesRead?: Gate;
	/** answer every permissions read only after this gate (test 3) */
	holdRead?: Gate;
	/** answer every write with this many affected rows; `0` changes nothing in the store (test 4) */
	affected?: number;
	/** answer every write only after this gate (test 5) */
	holdWrite?: Gate;
	/** hold the shell's `GET /api/user/me` on the mock origin, then hand it back to the mock (test 6) */
	holdUserMe?: Gate;
};

type PermissionStore = {
	calls: ServedCall[];
	rows: () => ServedRow[];
	rowOf: (id: string) => ServedRow | undefined;
	writes: () => ServedCall[];
	rolesReads: () => ServedCall[];
	permissionsReads: () => ServedCall[];
	readsOf: (roleId: string) => ServedCall[];
	/** the first permissions read recorded after `call` in this file's own log (never an index taken on faith) */
	readAfter: (call: ServedCall) => ServedCall | undefined;
};

/**
 * The store behind every served answer: the list always reflects the current rows, a `PUT` changes one row **only when
 * its answer says a row changed** (a refusal and `affected: 0` change nothing), and a gate keeps an answer out until the
 * test releases it. `page.route` is installed before the first navigation, so the mock never answers these paths.
 *
 * A `PUT` applies only the `enabled` the page sent (`permissions-page-ui.spec.ts` finding 1: the client pads an
 * `organizationId` into the body that this app's own strict read schema would reject), and pins the body as sent.
 */
async function servePermissionStore(page: Page, script: StoreScript): Promise<PermissionStore> {
	const calls: ServedCall[] = [];
	const rows = [...script.rows];
	const mine = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname === ROLES_ROUTE ||
			url.pathname === PERMISSIONS_READ_PATH ||
			(url.pathname.startsWith(`${PERMISSIONS_ROUTE}/`) &&
				url.pathname !== MY_PERMISSIONS_ROUTE &&
				url.pathname.split('/').length === 4));

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
		const call: ServedCall = {
			method,
			path: url.pathname,
			query: url.search.slice(1),
			body: request.postData(),
			answered: false
		};
		calls.push(call);

		if (url.pathname === ROLES_ROUTE) {
			if (script.holdRolesRead) await script.holdRolesRead.promise;
			call.answered = true;
			if (script.rolesRead)
				return answer(script.rolesRead.status, {
					statusCode: script.rolesRead.status,
					message: script.rolesRead.message
				});
			return answer(200, { items: script.roles, total: script.roles.length });
		}
		if (url.pathname === PERMISSIONS_READ_PATH) {
			if (script.holdRead) await script.holdRead.promise;
			call.answered = true;
			const roleId = url.searchParams.get('where[roleId]');
			const items = rows.filter((row) => row.roleId === roleId);
			return answer(200, { items, total: items.length });
		}
		if (script.holdWrite) await script.holdWrite.promise;
		call.answered = true;
		const affected = script.affected ?? 1;
		if (affected > 0) {
			const index = rows.findIndex((row) => row.id === url.pathname.slice(PERMISSIONS_ROUTE.length + 1));
			if (index >= 0) {
				const sent = JSON.parse(request.postData() ?? '{}') as { enabled?: boolean };
				rows[index] = { ...rows[index], enabled: sent.enabled === true };
			}
		}
		// Gauzy answers a saved switch with its update result, which is what `affectedRowsOf` reads (:104-111)
		return answer(200, { affected, generatedMaps: [], raw: [] });
	});

	// Not a stub: this file never claims its handler answered the shell's person read. It only keeps the mock's own
	// answer out long enough for `withAuthentication`'s wait (`authenticator.tsx:94-97`) to be on screen.
	if (script.holdUserMe) {
		const holdUserMe = script.holdUserMe;
		await page.route(
			(url) => url.origin === MOCK_API_ORIGIN && url.pathname === USER_ME_ROUTE,
			async (route) => {
				if (route.request().method() === 'OPTIONS')
					return route.fulfill({ status: 204, headers: CORS_HEADERS });
				await holdUserMe.promise;
				return route.continue();
			}
		);
	}

	return {
		calls,
		rows: () => rows,
		rowOf: (id) => rows.find((row) => row.id === id),
		writes: () => calls.filter((call) => call.method === 'PUT'),
		rolesReads: () => calls.filter((call) => call.path === ROLES_ROUTE),
		permissionsReads: () => calls.filter((call) => call.path === PERMISSIONS_READ_PATH),
		readsOf: (roleId) =>
			calls.filter(
				(call) => call.method === 'GET' && call.path === PERMISSIONS_READ_PATH && call.query.includes(roleId)
			),
		readAfter: (call) => {
			const index = calls.indexOf(call);
			return calls.slice(index + 1).find((next) => next.method === 'GET' && next.path === PERMISSIONS_READ_PATH);
		}
	};
}

/* ------------------------------------------------------------------ reading what the page prints */

type RowState = { label: string; text: string; checked: boolean };

/**
 * One read of every printed row: its label, the word beside its switch and the switch's own state. The walk is the
 * page's markup (`page-component.tsx:128-139`: row → control → `CommonToggle` → `Switch`), and `evaluateAll` sees only
 * DOM — nothing of this file.
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

const roleTitle = (page: Page) => page.getByRole('heading', { name: EN.pages.permissions.TITLE });
const prompt = (page: Page) => page.getByText(EN.common.SELECT_ROLE, { exact: true });
/** the toolbar bar `PageUpdatingBar` prints while `isUpdating` (`page-skeleton.tsx:21`, label `LOADING_PERMISSIONS`) */
const updatingBar = (page: Page) => page.locator(`output[aria-label="${EN.pages.permissions.LOADING_PERMISSIONS}"]`);
const roleList = (page: Page) => page.locator(`div[class="${ROLE_LIST_CLASS}"]`);
const roleListItems = (page: Page) => roleList(page).locator('> div');
const roleSkeletonRows = (page: Page) => roleList(page).locator('> span[aria-hidden="true"]');
const pageSkeleton = (page: Page) => page.locator(PAGE_SKELETON_SELECTOR);
const loadingWord = (page: Page) => page.getByText(EN.common.LOADING, { exact: true });
const breadcrumbNav = (page: Page) => page.locator(BREADCRUMB_NAV_SELECTOR);
const toasts = (page: Page) => page.locator('[data-sonner-toast]');

const printedRoles = (page: Page) =>
	roleListItems(page).evaluateAll((nodes) =>
		nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
	);

const waitUntilRead = async (store: PermissionStore, roleId: string) => {
	await expect.poll(() => store.readsOf(roleId).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
};
/** a held claim: the call is recorded AND still unanswered before the test lets it go */
const waitUntilHeld = async (calls: () => ServedCall[]) => {
	await expect
		.poll(() => calls().filter((call) => !call.answered).length, { timeout: 30_000 })
		.toBeGreaterThanOrEqual(1);
};

/* ------------------------------------------------------------------ this file's made-up data */

const ALPHA = 'a1a1a1a1-1111-4111-8111-111111111111';
const BETA = 'b2b2b2b2-2222-4222-8222-222222222222';
const GAMMA = 'c3c3c3c3-3333-4333-8333-333333333333';
const rowId = (roleId: string, n: number) => `d1d1d1d1-${roleId.slice(0, 4)}-4111-8111-${String(n).padStart(12, '0')}`;
/** the served order, which `permissions-page-ui.spec.ts` test 1 pins as the printed order */
const ROLE_NAMES = ['Probe Alpha', 'Probe Beta', 'Probe Gamma'];
const rolesOf = (tenantId: string): ServedRole[] => [
	{ id: ALPHA, name: ROLE_NAMES[0], isSystem: false, tenantId },
	{ id: BETA, name: ROLE_NAMES[1], isSystem: false, tenantId },
	{ id: GAMMA, name: ROLE_NAMES[2], isSystem: false, tenantId }
];
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
const allRows = (tenantId: string) => [
	...betaRows(tenantId),
	...betaRows(tenantId).map((r) => ({ ...r, roleId: ALPHA })),
	...betaRows(tenantId).map((r) => ({ ...r, roleId: GAMMA }))
];
/** Beta printed: only `Handle requests` off (`ORG_TEAM_JOIN_REQUEST_EDIT` is the one row served disabled). */
const BETA_PRINTED = [true, true, true, true, true, true, true, false, true, true];

test.describe('lane-c /permissions page edges', () => {
	test('1 · a refused roles read (500): the left column empties, the prompt stays, and nothing says the read failed', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, {
			roles: rolesOf(tenantId),
			rows: allRows(tenantId),
			rolesRead: { status: 500, message: 'permissions edges probe refused the roles read' }
		});
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });

		// positive signals first: the page itself is up and its read came back refused
		await expect(roleTitle(page)).toBeVisible({ timeout: 20_000 });
		await expect(prompt(page)).toHaveCount(1, { timeout: 20_000 });
		await expect.poll(() => store.rolesReads().some((call) => call.answered), { timeout: 30_000 }).toBe(true);

		// `use-roles-query.ts:64` (`rolesReady = allowed && isSuccess`) → `roles = []` (:67), and `isLoading` is false
		// once the attempt failed, so `page-component.tsx:108` drops `RoleListSkeleton`: the container stands empty.
		await expect(roleList(page)).toHaveCount(1, { timeout: 20_000 });
		await expect(roleListItems(page)).toHaveCount(0, { timeout: 20_000 });
		await expect(roleSkeletonRows(page)).toHaveCount(0, { timeout: 20_000 });
		report('refused roles read', {
			rolesReads: store.rolesReads().map((call) => `${call.method} ${call.path} answered=${call.answered}`),
			printedRoles: await printedRoles(page)
		});
		expect(
			store.rolesReads().length,
			'a refused read is retried, so only "at least one" is pinned'
		).toBeGreaterThanOrEqual(1);

		// no role is pickable: nothing in the left column is a row, and the right column still shows its prompt
		await expect(page.getByRole('switch')).toHaveCount(0, { timeout: 20_000 });
		await expect(prompt(page)).toHaveCount(1);
		for (const name of ROLE_NAMES) {
			await expect(page.getByText(name, { exact: true })).toHaveCount(0);
		}
		// the page's own failure copy: none (the only sign is the client's HTTP error line and the dev toast)
		await expect(page.getByText(EN.toasts.MUTATION_FAILED, { exact: true })).toHaveCount(0);
		await expect(toasts(page).filter({ hasText: EN.toasts.MUTATION_FAILED })).toHaveCount(0);

		const armedLines = [armed('HTTP Error: GET ', loggedPath(ROLES_ROUTE), '500')];
		report('refused roles read console', { findings: consoleFindings(shield, armedLines) });
		expect(consoleFindings(shield, armedLines), 'the page logged a console error this test did not arm').toEqual(
			[]
		);
	});

	test('2 · an empty roles list: the same empty left column and the prompt, and no permissions read is ever sent', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await servePermissionStore(page, { roles: [], rows: [] });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });

		await expect(roleTitle(page)).toBeVisible({ timeout: 20_000 });
		await expect(prompt(page)).toHaveCount(1, { timeout: 20_000 });
		// the positive signal the absence check waits for: the roles read came back and was answered
		await expect
			.poll(() => store.rolesReads().filter((call) => call.answered).length, { timeout: 30_000 })
			.toBeGreaterThanOrEqual(1);

		await expect(roleList(page)).toHaveCount(1, { timeout: 20_000 });
		await expect(roleListItems(page)).toHaveCount(0, { timeout: 20_000 });
		await expect(roleSkeletonRows(page)).toHaveCount(0, { timeout: 20_000 });
		await expect(prompt(page)).toHaveCount(1);
		await expect(page.getByRole('switch')).toHaveCount(0, { timeout: 20_000 });

		// quiet window, 2.5 s: proves no permissions read is ever sent when there is no role to pick —
		// `use-role-permissions-query.ts:27` enables that query on `!!roleId` alone, and no role can be picked
		await page.waitForTimeout(2_500);
		report('empty roles list', {
			calls: store.calls.map((call) => `${call.method} ${call.path}`),
			permissionsReads: store.permissionsReads().length,
			writes: store.writes().length
		});
		expect(store.permissionsReads(), 'an empty roles list opened no permissions read').toEqual([]);
		expect(store.writes(), 'an empty roles list sent no write').toEqual([]);
		expect(
			store.rolesReads().every((call) => call.query === ''),
			'the roles read carries no query'
		).toBe(true);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test("3 · the permissions read held: the toolbar's reading bar while the read is outstanding, the rows all off, gone after the release", async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const hold = gate();
		const store = await servePermissionStore(page, {
			roles: rolesOf(tenantId),
			rows: allRows(tenantId),
			holdRead: hold
		});
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, ROLE_NAMES[1]);

		try {
			await waitUntilHeld(() => store.readsOf(BETA));
			// `PermissionsToolbar`'s bar (`permissions-page-skeleton.tsx:21` → `page-skeleton.tsx:17-23`) is on the screen
			// while that read is recorded and unanswered, and the prompt is gone because a role IS picked
			await expect(updatingBar(page)).toHaveCount(1, { timeout: 20_000 });
			await expect(updatingBar(page)).toBeVisible();
			await expect(prompt(page)).toHaveCount(0);
			// the ten rows are printed already, every one of them off: `rolePermissionsFormated` is still empty
			// (`use-role-permissions-query.ts:31-43`), so every row reads `|| false` (`page-component.tsx:134-282`)
			await expectRows(
				page,
				ROW_LABELS.map(() => false)
			);
			report('read held', {
				heldReads: store
					.readsOf(BETA)
					.map((call) => ({ answered: call.answered, query: call.query.slice(0, 40) })),
				bar: await updatingBar(page).evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label')))
			});

			// and a flip in that window sends nothing: `page-component.tsx:68` returns while the row is not in the data
			await switchAt(page, ROW.trackTime).click({ timeout: 15_000 });
			// quiet window, 2 s: proves a click during the outstanding read sent no request at all
			await page.waitForTimeout(2_000);
			report('click during the held read', { writes: store.writes().length });
			expect(store.writes(), 'a flip while the read is outstanding sent a request').toEqual([]);
		} finally {
			hold.release();
		}

		await expect.poll(() => store.readsOf(BETA).some((call) => call.answered), { timeout: 30_000 }).toBe(true);
		await expectRows(page, BETA_PRINTED);
		await expect(updatingBar(page)).toHaveCount(0, { timeout: 20_000 });
		report('read released', { rows: await rowStates(page), reads: store.readsOf(BETA).length });
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('4 · a write answered affected: 0: the app says the change was not saved with its "try again" reason, and no switch ever moved', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, {
			roles: rolesOf(tenantId),
			rows: allRows(tenantId),
			affected: 0
		});
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, ROLE_NAMES[1]);
		await waitUntilRead(store, BETA);
		await expectRows(page, BETA_PRINTED);

		await switchAt(page, ROW.trackTime).click({ timeout: 15_000 });
		await expect.poll(() => store.writes().length, { timeout: 30_000 }).toBe(1);
		const [put] = store.writes();
		report('affected 0 write', { path: put.path, body: put.body });
		expect(put.path).toBe(`${PERMISSIONS_ROUTE}/${rowId(BETA, 1)}`);
		expect(bodyOf(put)).toEqual({
			id: rowId(BETA, 1),
			roleId: BETA,
			permission: 'TIME_TRACKER',
			enabled: false,
			tenantId,
			organizationId: fixture.ids.organizationA
		});

		// `role-permission.service.ts:105-108` threw, so `onSettled` invalidated the read (`use-update-role-permission.ts:19-23`)
		// while the store kept the row exactly as it was served
		expect(store.rowOf(rowId(BETA, 1)), "an answer that changed no row changed this file's store").toEqual({
			...betaRows(tenantId)[0]
		});
		await expect.poll(() => store.readAfter(put), { timeout: 30_000 }).toBeDefined();
		expect(store.readAfter(put)?.query.includes(BETA), 'the re-read asked for the picked role').toBe(true);

		// the toast the fallback toaster prints (`mutation-error-toaster.tsx:53-56`), with the reason for an error that
		// carries no status (`error-feedback.ts:180-201` → `unknown`)
		await expect(page.getByText(EN.toasts.MUTATION_FAILED, { exact: true })).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(EN.toasts.REASONS.UNKNOWN, { exact: true })).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(EN.toasts.REASONS.PERMISSION, { exact: true })).toHaveCount(0);
		await expect(page.getByText(EN.toasts.REASONS.SERVER, { exact: true })).toHaveCount(0);
		report('affected 0 toasts', {
			toasts: await toasts(page).evaluateAll((n) =>
				n.map((x) => (x.textContent ?? '').replace(/\s+/g, ' ').trim())
			)
		});

		// nothing was optimistic before the throw and nothing rolled back after it: the row never left its served state
		await expect(switchAt(page, ROW.trackTime)).toHaveAttribute('aria-checked', 'true');
		await expectRows(page, BETA_PRINTED);

		// the throw is the only console line this run left (`mutation-error-toaster.tsx:48`), excused by its exact text;
		// the answer was 200, so no `[HttpClient] HTTP Error` line appeared (measured)
		const armedLines = [armed('Mutation failed:', 'The permission was not saved: the API changed no row')];
		report('affected 0 console', { findings: consoleFindings(shield, armedLines) });
		expect(consoleFindings(shield, armedLines), 'the page logged a console error this test did not arm').toEqual(
			[]
		);
	});

	test('5 · a write held on a promise: the switch stays where the server left it while no answer exists, and moves only after the re-read', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const hold = gate();
		const store = await servePermissionStore(page, {
			roles: rolesOf(tenantId),
			rows: allRows(tenantId),
			holdWrite: hold
		});
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await pickRole(page, ROLE_NAMES[1]);
		await waitUntilRead(store, BETA);
		await expectRows(page, BETA_PRINTED);

		await switchAt(page, ROW.trackTime).click({ timeout: 15_000 });
		try {
			await waitUntilHeld(store.writes);
			const [put] = store.writes();
			// not optimistic: `CommonToggle` renders `<Switch checked={enabled}>` from the read's value
			// (`toggler.tsx:183`, `page-component.tsx:134`), and no `onMutate` exists in
			// `use-update-role-permission.ts:17-24`, so the row keeps the state the server has
			await expect(switchAt(page, ROW.trackTime)).toHaveAttribute('aria-checked', 'true', { timeout: 20_000 });
			await expect(prompt(page)).toHaveCount(0);
			await expectRows(page, BETA_PRINTED);
			await expect(updatingBar(page)).toHaveCount(0);
			await expect(toasts(page)).toHaveCount(0);
			report('write held', {
				heldWrites: store.writes().map((call) => ({ path: call.path, answered: call.answered })),
				rows: await rowStates(page),
				readsAfterWrite: store.readAfter(put) === undefined ? 'none' : 'one'
			});
			// `onSettled` is what invalidates the read (`use-update-role-permission.ts:19-23`), so while the answer is
			// outstanding there is no re-read after the write
			expect(store.readAfter(put), 'the page re-read the role before the write was answered').toBeUndefined();
			expect(store.rowOf(rowId(BETA, 1)), "the held write already moved this file's store").toEqual({
				...betaRows(tenantId)[0]
			});
		} finally {
			hold.release();
		}

		const [put] = store.writes();
		await expect.poll(() => store.readAfter(put), { timeout: 30_000 }).toBeDefined();
		expect(store.rowOf(rowId(BETA, 1))).toEqual({ ...betaRows(tenantId)[0], enabled: false });
		// the state printed now is the re-read's: only the row the page wrote moved
		await expectRows(page, [false, ...BETA_PRINTED.slice(1)]);
		await expect(switchAt(page, ROW.trackTime)).toHaveAttribute('aria-checked', 'false');
		report('write released', { rows: await rowStates(page), writes: store.writes().length });
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('6 · the skeletons: the page skeleton while the person read is held, the role-list skeleton while the roles read is held, both gone after', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const userHold = gate();
		const rolesHold = gate();
		const store = await servePermissionStore(page, {
			roles: rolesOf(tenantId),
			rows: allRows(tenantId),
			holdRolesRead: rolesHold,
			holdUserMe: userHold
		});
		// the shell never reaches its ready mark while its own person read is held, so this visit does not wait for it
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, {
			scenario: { roleName: 'ADMIN' },
			requireShell: false
		});

		try {
			// `withAuthentication` renders the page's own `PermissionsPageSkeleton` while the person is pending
			// (`authenticator.tsx:94-97`): `PageSkeletonFrame`'s status region + `sr-only` LOADING
			// (`page-skeleton.tsx:110-111`) and `PermissionsContentSkeleton`'s four `RoleListSkeleton` rows (:52-63)
			await expect(pageSkeleton(page)).toHaveCount(1, { timeout: 20_000 });
			await expect(loadingWord(page)).toHaveCount(1, { timeout: 20_000 });
			await expect(roleList(page)).toHaveCount(1, { timeout: 20_000 });
			await expect(roleSkeletonRows(page)).toHaveCount(ROLE_SKELETON_ROW_COUNT, { timeout: 20_000 });
			await expect(roleListItems(page)).toHaveCount(0);
			await expect(page.getByRole('switch')).toHaveCount(0);
			await expect(prompt(page)).toHaveCount(1);
			// the breadcrumb of this phase is `BreadcrumbSkeleton` (`page-skeleton.tsx:106`): aria-hidden bars, no nav
			await expect(breadcrumbNav(page)).toHaveCount(0);
			report('page skeleton', {
				skeletonRows: await roleSkeletonRows(page).count(),
				loading: await loadingWord(page).count(),
				pulseBars: await page.locator('.animate-pulse').count()
			});

			// the person arrived; the roles read is now on its way and this file is holding its answer
			userHold.release();
			await waitUntilHeld(store.rolesReads);
			// the page frame is real now (its breadcrumb is the real one), but the left column is still the skeleton
			await expect(breadcrumbNav(page)).toHaveCount(1, { timeout: 20_000 });
			await expect(pageSkeleton(page)).toHaveCount(0, { timeout: 20_000 });
			await expect(loadingWord(page)).toHaveCount(0);
			await expect(roleSkeletonRows(page)).toHaveCount(ROLE_SKELETON_ROW_COUNT, { timeout: 20_000 });
			await expect(roleTitle(page)).toBeVisible();
			await expect(prompt(page)).toHaveCount(1);
			await expect(page.getByRole('switch')).toHaveCount(0);
			report('role list skeleton', {
				rolesReads: store.rolesReads().map((call) => `${call.method} answered=${call.answered}`)
			});

			rolesHold.release();
			await expect.poll(() => store.rolesReads().some((call) => call.answered), { timeout: 30_000 }).toBe(true);
			await expect(roleSkeletonRows(page)).toHaveCount(0, { timeout: 20_000 });
			await expect(roleListItems(page)).toHaveCount(ROLE_NAMES.length, { timeout: 20_000 });
			await expect.poll(() => printedRoles(page), { timeout: 20_000 }).toEqual(ROLE_NAMES);
			await expect(prompt(page)).toHaveCount(1);
			report('skeletons dismissed', { printedRoles: await printedRoles(page) });
		} finally {
			userHold.release();
			rolesHold.release();
		}

		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('7 · the breadcrumb: Dashboard then Roles & permissions, the last one aria-current, and no crumb is a link', async ({
		page,
		fixture,
		shield
	}) => {
		const tenantId = fixture.ids.tenantA;
		const store = await servePermissionStore(page, { roles: rolesOf(tenantId), rows: allRows(tenantId) });
		await signInAndVisit(page, fixture, PERMISSIONS_PATH, { scenario: { roleName: 'ADMIN' } });
		await expect(roleTitle(page)).toBeVisible({ timeout: 20_000 });

		const nav = breadcrumbNav(page);
		await expect(nav).toHaveCount(1, { timeout: 20_000 });
		const crumbs = nav.locator('> ol > li');
		await expect(crumbs).toHaveCount(3, { timeout: 20_000 });
		// the middle `li` is the chevron, aria-hidden (`breadcrumb.tsx:42-46`)
		await expect(crumbs.nth(1)).toHaveAttribute('aria-hidden', 'true');
		await expect(crumbs.nth(2)).toHaveAttribute('aria-current', 'page');
		await expect
			.poll(
				() =>
					crumbs.evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())),
				{
					timeout: 20_000
				}
			)
			.toEqual([EN.sidebar.DASHBOARD, '', EN.pages.permissions.TITLE]);

		// `page-component.tsx:100-102` hands `Breadcrumb` two translated strings, and `breadcrumb.tsx:36` builds a
		// `Link href` only for an object crumb: the Dashboard crumb is a plain span, with no href to read
		await expect(crumbs.nth(0).locator('span')).toHaveCount(1);
		await expect(crumbs.nth(0).locator('a')).toHaveCount(0);
		await expect(crumbs.nth(2).locator('span')).toHaveCount(1);
		await expect(nav.locator('a')).toHaveCount(0);
		await expect(nav.getByRole('link')).toHaveCount(0);
		await expect(page.getByRole('link', { name: EN.sidebar.DASHBOARD })).toHaveCount(0);
		report('breadcrumb', {
			html: (await nav.innerHTML()).slice(0, 260),
			pageCalls: store.calls.map((call) => `${call.method} ${call.path}`)
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});
});
