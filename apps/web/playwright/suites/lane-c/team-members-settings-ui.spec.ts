import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page, Route } from '@playwright/test';

import { expect, test, type BootstrapFixture, type Shield } from '../../fixtures';
import { APP_ORIGIN } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Settings › Team › Members (`/settings/team/members`) on lane-c — **the members list only**: the invitations, the
 * join requests and the invite dialog belong to another file. Lane-c is the app on `http://localhost:3033` with its
 * mock on `http://127.0.0.1:4002`, started by the lane runner (`E2E_EVER_ID=1 E2E_DOCS=1 E2E_LIVEKIT=1`). Nothing
 * real is changed: every write goes to the lane mock or to the store this file serves.
 *
 * **Components driven** (every one opened)
 * - page `app/[locale]/(main)/settings/team/members/page.tsx` → `MembersSettingsPage`
 *   `core/components/settings/pages/members/members-settings-page.tsx:102-108`;
 * - gate `core/components/settings/kit/team-settings-gate.tsx:39-56` (`ManagersOnly` card at `:22-35`, its title and
 *   description as `<p>`, its button a `Link` to `/settings/team`);
 * - section `core/components/settings/pages/members/members-section.tsx` — `SettingsSection id="members"` `:373-377`,
 *   search threshold `MIN_ROWS_FOR_SEARCH = 8` `:34` used at `:295`, the Active/Inactive `SegmentedControl` `:378-388`
 *   (`core/components/common/segmented-control.tsx:121-123`), the active `<ul>` `:237`, `NoMatch` + Clear `:230-235`,
 *   and the two views, only one of which is rendered `:389-420`;
 * - row `core/components/settings/pages/members/member-row.tsx` — `RoleControl` `:138-199` (two groups `:159-160`),
 *   `RowMenu` `:213-322` (EDIT_NAME `:272`, EDIT_RATE `:278`, `DropdownMenuCheckboxItem` Track time `:282-295` with
 *   `TRACKING_OFF_BY_ADMIN` `:291`, DEACTIVATE `:310`, REMOVE `:316`), `MemberNameEditor` `:324-434`
 *   (FIRST_NAME_REQUIRED `:344`, SAVE_FAILED `:352`), the row replaced by the editor while it is open, the `YOU` chip
 *   `:533`, `WorkspaceAdminChip` `:442`/`:534`, joined date `:549`, rate text `:552` →
 *   `member-rate-editor.tsx:40-52`;
 * - inactive list `core/components/settings/pages/members/inactive-members-list.tsx` — `INACTIVE_EMPTY` `:109`, the
 *   `<ul>` `:115`, the Restore button `:59`;
 * - what each action writes `core/hooks/settings/use-team-members-settings.ts` — `changeRole` `:376-398`,
 *   `removeMember` `:400-423`, `renameMember` `:425-436`, `setMemberTracking` `:438-456` →
 *   `core/hooks/settings/use-member-tracking-switch.ts:109-146`, `saveMemberRates` →
 *   `core/hooks/organizations/rates/use-rates.ts:142-160` → `core/services/client/api/organizations/rate.service.ts:107-114`,
 *   `changeWorkspaceRole` → `core/services/client/api/users/user.service.ts:136-143`, `deactivateMember` →
 *   `core/services/client/api/organizations/teams/employee.service.ts:151-168`; the unassign
 *   `core/hooks/organizations/teams/use-delete-task.ts:46-53,76`; the inactive read
 *   `employee.service.ts:122-131` → `core/hooks/settings/use-inactive-members.ts`;
 * - the gates `core/lib/utils/member-access.ts:35-41,69-92,148-166,173-192`, `core/lib/utils/settings-team.ts:141-147,159-184`,
 *   `core/stores/teams/organization-team.ts:76-80`, `core/lib/helpers/tracking-switch.ts`,
 *   `core/lib/helpers/team-member-tracking.ts:11-15`, `core/lib/utils/rate-apply.ts:21-36,130-134`,
 *   `core/lib/utils/error-feedback.ts` (the reason copy), `core/components/common/mutation-error-toaster.tsx:23-30,47-56`,
 *   `core/lib/helpers/error-message.ts:58-62`.
 *
 * **Real here, served here.** The app, its copy (`locales/en.json`, read by key) and its state are real. The team,
 * its members, the roles, and the viewer's permissions come from `serveTeam` in this file, because the mock answers
 * the team reads from its fixture only (`cypress/support/mock-gauzy-server.mjs:655-656` — members carry the fixture
 * role and no `createdAt`), answers every write by echoing the request body and stores nothing (`:893-894`), and
 * answers the inactive read empty (`:895`) — so "the row is back as it was" could not be told from "the server still
 * says the same". The stubs live on the **mock origin only** (`url.origin === MOCK_API_ORIGIN`), answer `OPTIONS`
 * with 204 restating the mock's CORS headers (`:1087-1095`, `:1097-1100`), and never call `route.fetch()`. Left to
 * the mock: `GET /api/organization-team-join` (`:891`), `user/me`, `organization/:id` (currency `USD`, no
 * `timeLogsKeepTheirRates`, no `restrictTrackingSwitchToHigherRoles`), `GET /api/employee/:id/pay-rate` (`:883-884`),
 * the presence heartbeat and every other read.
 *
 * **Where every number came from.** Each is printed by this file's own `report(…)` MEASURE lines on a real run: the
 * lane probe `/d/Coding/.tmp/s3-lane-c-teammembers-p1.log` and the clean whole-file runs
 * `/d/Coding/.tmp/s3-lane-c-teammembers-5.log` and `-6.log`; the roster sizes (9 served members, 8 = the search
 * threshold `members-section.tsx:34`, 8 → 7 as members are removed, 9 memberIds in every roster), 1 searchbox / 0
 * tablists for a viewer without ORG_EMPLOYEES_VIEW, 7 role-menu items (2 team roles + the 5 workspace roles below
 * SUPER_ADMIN), 2 consequences in the remove dialog and 4 in the deactivate dialog, 1 inactive list with 1 row, the
 * rate write `{organizationId, tenantId, billRateValue}`, 2 comboboxes with `USD` in the rate editor. Dates and
 * money are not typed: `Intl.DateTimeFormat('en', { dateStyle: 'medium' })` and
 * `Intl.NumberFormat('en', { style: 'currency', currency })` compute the expected text from the served value, the
 * same call the page makes (`members-section.tsx:215-218`, `member-rate-editor.tsx:40-52`), and the served instants
 * are 12:00 UTC so the calendar date cannot drift.
 *
 * **Findings (measured; none tagged)**
 * 1. The team role a row prints is `isTeamManagerMember` = `isManager === true` **or** the member row's role *name* in
 *    {MANAGER, SUPER_ADMIN, ADMIN} (`core/stores/teams/organization-team.ts:76-80`): Bert (role MANAGER,
 *    `isManager:false`) and Fatima (role ADMIN, `isManager:false`) both read "Manager" while the plain teammates read
 *    "Member". The lane's own fixture role is ADMIN, which is why the mock's three members all read "Manager"
 *    (`mock-gauzy-server.mjs:50,655-656`).
 * 2. Who may do what, measured from the menus: my own row offers `["Edit name","Selected Track time"]` — no rate
 *    editor, no Deactivate, no Remove; a workspace admin's row offers `[…,"Reset two-factor authentication","Remove
 *    from the team"]` — no Deactivate (`member-access.ts:69-92`); a viewer with no ORG_EMPLOYEES_EDIT gets
 *    `["Edit name","Track time Turned off by an organization admin","Remove from the team"]`.
 * 3. A locked Track time item is disabled inside the menu (`role=menuitemcheckbox`, `aria-disabled="true"`,
 *    `data-disabled=""`, `member-row.tsx:282-295`); a click on it is refused by the browser ("element is not
 *    enabled") and nothing is written. The lock here comes from the missing permission, not from the team ranks:
 *    `restrictTrackingSwitchToHigherRoles` is absent from the lane's organization, so `restrictsSwitch` is false
 *    (`use-member-tracking-switch.ts:54`).
 * 4. Toasts by layer: a refused team roster write shows only the members' own toast (`use-team-members-settings.ts:204`
 *    passes `toastOnError: false`); a refused employee write is named by the employees hook with
 *    `toasts.teams.MEMBER_NOT_SAVED`; a failed unassign gets the global fallback toast `toasts.MUTATION_FAILED` and
 *    **the member is removed anyway**, exactly as `use-team-members-settings.ts:404-408` states in its comment.
 * 5. A second role change made while the first write's answer is held sends the roster as it was *before* the first
 *    one, plus its own change (`changeRole` recomputes it from the team as last answered, `:381-383` +
 *    `settings-team.ts:159-184`): measured first write `managerIds = [me, Bert, Fatima, Nadia]`, second
 *    `[me, Bert, Fatima, Dana]`, and after the release the served store says Nadia is not a manager while her row
 *    still prints "Manager" — the row label is the optimistic `roleOverrides` (`:277`), which is taken back on an
 *    error only (`:386-388`), not the roster the server kept. Test 15 pins both halves.
 * 6. Both lists live inside `#members` and only one is rendered (`members-section.tsx:389-420`), and the active
 *    list's accessible name "Members" is a substring of the inactive list's "Inactive members", so the active list
 *    is matched with `exact: true`.
 * 7. The rate editor's pay-rate field exists here only because the mock answers `GET /api/employee/:id/pay-rate`
 *    with 200 (`mock-gauzy-server.mjs:883-884`); with no `timeLogsKeepTheirRates` on the lane's organization there is
 *    no "Apply to time already tracked?" question and no `rates.RATE_SAVED` toast (`rate-apply.ts:21-36`), and a
 *    refused save answers inline with the reason (`:130-134`).
 * 8. A refused write logs `[ERROR] [HttpClient] HTTP Error: <verb> <service path without `/api`> <status>` — the
 *    unassign DELETE carries its query inside the path (`… /tasks/employee/<id>?organizationTeamId=<team> 400`), and
 *    every failed mutation also prints `Mutation failed: ApiError: <message>` (`mutation-error-toaster.tsx:47-49`).
 *    Those lines are excused only by the exact armed line of the test that armed the refusal.
 *
 * **Not covered here**: the invitations, the join requests, the invite dialog and the placeholders (another file);
 * the row's `Reset two-factor authentication` action; the `<NoTeam>` branch of the gate (a viewer who is not a member
 * of any team); a failed inactive read (the harness can arm `refuseInactiveRead`, no test does); a real API and a
 * real organization; the other locales; anything on a lane other than lane-c.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const PAGE_PATH = '/settings/team/members';

/** `locales/en.json`: `settings.members` `:5455-5592`, `settings.common` `:4768-4772`, `rates` `:6442-6495`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	settings: {
		members: Record<string, string>;
		common: { SAVE_FAILED: string; MANAGERS_ONLY_TITLE: string; MANAGERS_ONLY_DESCRIPTION: string };
		entries: { members: { TITLE: string; DESCRIPTION: string }; teamGeneral: { TITLE: string } };
	};
	rates: Record<string, string>;
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string>; teams: { MEMBER_NOT_SAVED: string } };
	common: { SAVE: string; CANCEL: string };
};
const M = EN.settings.members;
const R = EN.rates;

/** `settings.members.NO_MATCH` = "No member matches “{query}”.", `JOINED` = "Joined {date}". */
const fill = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), M[key]);

/**
 * `MEMBERS_COUNT` = "{count, plural, one {# person in this team.} other {# people in this team.}}" — the branch the
 * count picks, with `#` replaced, read out of the locale file rather than typed.
 */
const countText = (key: string, count: number) => {
	const branches = Array.from(M[key].matchAll(/(one|other)\s*\{([^{}]*)\}/g));
	const wanted = count === 1 ? 'one' : 'other';
	const branch = branches.find((entry) => entry[1] === wanted) ?? branches[branches.length - 1];
	if (!branch) {
		throw new Error(`${key} is not a plural message: ${M[key]}`);
	}
	return branch[2].replaceAll('#', String(count));
};

/** `members-section.tsx:216` + `:321` — `format.dateTime(date, { dateStyle: 'medium' })` of the served value. */
const dayOf = (iso: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-c team-members] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`cypress/support/mock-gauzy-server.mjs:1087-1095`, `OPTIONS` → 204 at `:1097-1100`). */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const toastOf = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
/** Sonner pauses every countdown while the pointer is over the toaster (`brief-common`). */
const parkPointer = async (page: Page) => {
	await page.mouse.move(2, 2);
};

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const escapeForRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The client's own HTTP error line for a refusal this file armed (`core/services/client/api.service.ts` `logError`):
 * the verb, the path the client's service layer names (no origin, no `/api` prefix) and the status armed. Matched as
 * `verb …path… status` because the line carries a timestamp before it and the request's query string inside the path
 * (`all-teams-ui.spec.ts:207-208`) — never the bare `[HttpClient] HTTP Error` prefix.
 */
const armedHttpError = (verb: string, pathFragment: string, status: number) =>
	new RegExp(`\\[ERROR\\] \\[HttpClient\\] HTTP Error: ${verb} \\S*${escapeForRegex(pathFragment)}\\S* ${status}`);

/**
 * The dev-mode line `mutation-error-toaster.tsx:43-45` prints for a failed mutation, armed by the exact message this
 * file's own stub answered with — never the bare `Mutation failed:` prefix.
 */
const armedMutationFailure = (message: string) => new RegExp(`Mutation failed: ApiError: ${escapeForRegex(message)}`);

/** A `logErrorInDev` line (`core/lib/helpers/error-message.ts:58-62`), armed by its exact label and the error printed. */
const armedDevLog = (label: string, message: string) =>
	new RegExp(`\\[${escapeForRegex(label)}\\] ApiError: ${escapeForRegex(message)}`);

const consoleFindings = (shield: Shield, expected: RegExp[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((excuse) => excuse.test(line)));

/* ------------------------------------------------------------------ *
 * The team this file serves
 * ------------------------------------------------------------------ */

type Refusal = { status: number; message: string };
type ServedRole = { id: string; name: string };
type ServedCall = { method: string; path: string; body: Record<string, unknown> | null };

type ServedUser = {
	id: string;
	firstName: string;
	lastName: string;
	name: string;
	email: string;
	timeZone: string;
	isEmailVerified: boolean;
	tenantId: string;
	roleId: string;
	role: ServedRole;
	employeeId: string;
};

type ServedEmployee = {
	id: string;
	userId: string;
	user: ServedUser;
	fullName: string;
	isTrackingEnabled: boolean;
	isTrackingTime: boolean;
	isActive: boolean;
	organizationId: string;
	tenantId: string;
	createdAt: string;
	billRateValue?: number | null;
	billRateCurrency?: string | null;
	reWeeklyLimit?: number | null;
	endWork?: string | null;
	teams?: Array<{ organizationTeamId: string }>;
};

type ServedMember = {
	id: string;
	employeeId: string;
	employee: ServedEmployee;
	user: ServedUser;
	isManager: boolean;
	isActive: boolean;
	isTrackingEnabled: boolean;
	organizationTeamId: string;
	organizationId: string;
	tenantId: string;
	roleId: string;
	role: ServedRole;
	createdAt: string;
	totalWorkedTasks: unknown[];
	totalTodayTasks: unknown[];
};

type ServedTeam = {
	id: string;
	name: string;
	organizationId: string;
	tenantId: string;
	public: boolean;
	profile_link: string;
	prefix: string;
	shareProfileView: boolean;
	requirePlanToTrack: boolean;
	members: ServedMember[];
	managers: ServedMember[];
	projects: unknown[];
	tasks: unknown[];
	statuses: unknown[];
};

/** The people this file serves, the fixture's three first (their ids and names come from the lane's own fixture). */
type PersonSeed = {
	first: string;
	last: string;
	email: string;
	role: string;
	joinedAt: string;
	isManager: boolean;
	isTrackingEnabled?: boolean;
	billRateValue?: number | null;
	billRateCurrency?: string | null;
	reWeeklyLimit?: number | null;
};

const EXTRA_IDS = (index: number) => ({
	user: `44444444-4444-4444-8444-0000000000${String(index + 1).padStart(2, '0')}`,
	employee: `55555555-5555-4555-8555-0000000000${String(index + 1).padStart(2, '0')}`,
	member: `66666666-6666-4666-8666-0000000000${String(index + 1).padStart(2, '0')}`
});

const ROLE_EXTRA_IDS: Record<string, string> = {
	SUPER_ADMIN: '99999999-9999-4999-8999-222222222222',
	MANAGER: '99999999-9999-4999-8999-333333333333',
	EMPLOYEE: '99999999-9999-4999-8999-444444444444',
	DATA_ENTRY: '99999999-9999-4999-8999-555555555555',
	VIEWER: '99999999-9999-4999-8999-666666666666'
};

/** Nine members: `MIN_ROWS_FOR_SEARCH = 8` (`members-section.tsx:34`) is reached, and every row has its own story. */
const PEOPLE: PersonSeed[] = [
	{
		first: 'Fixture',
		last: 'Manager',
		email: 'manager@example.test',
		role: 'ADMIN',
		joinedAt: '2024-02-05T12:00:00.000Z',
		isManager: true
	},
	{
		first: 'Fixture',
		last: 'Teammate',
		email: 'teammate@example.test',
		role: 'EMPLOYEE',
		joinedAt: '2024-06-11T12:00:00.000Z',
		isManager: false
	},
	{
		first: 'Fixture',
		last: 'Restricted',
		email: 'restricted@example.test',
		role: 'EMPLOYEE',
		joinedAt: '2024-09-03T12:00:00.000Z',
		isManager: false
	},
	{
		first: 'Nadia',
		last: 'Optometrist',
		email: 'nadia@example.test',
		role: 'EMPLOYEE',
		joinedAt: '2025-01-14T12:00:00.000Z',
		isManager: false
	},
	{
		first: 'Bert',
		last: 'Cartwright',
		email: 'bert@example.test',
		role: 'MANAGER',
		joinedAt: '2025-03-20T12:00:00.000Z',
		isManager: false
	},
	{
		first: 'Cleo',
		last: 'Marchand',
		email: 'cleo@example.test',
		role: 'EMPLOYEE',
		joinedAt: '2025-05-08T12:00:00.000Z',
		isManager: false,
		billRateValue: 45,
		billRateCurrency: 'USD',
		reWeeklyLimit: 40
	},
	{
		first: 'Dana',
		last: 'Okonkwo',
		email: 'dana@example.test',
		role: 'EMPLOYEE',
		joinedAt: '2025-07-22T12:00:00.000Z',
		isManager: false,
		isTrackingEnabled: false
	},
	{
		first: 'Enzo',
		last: 'Paredes',
		email: 'enzo@example.test',
		role: 'VIEWER',
		joinedAt: '2025-09-09T12:00:00.000Z',
		isManager: false
	},
	{
		first: 'Fatima',
		last: 'Sørensen',
		email: 'fatima@example.test',
		role: 'ADMIN',
		joinedAt: '2025-11-01T12:00:00.000Z',
		isManager: false
	}
];

type Script = {
	/** How many of `PEOPLE` the team holds. */
	rosterSize: number;
	/** The signed-in person's own row: a manager of the team (`isManager` + a manager role name) or a plain member. */
	viewerManager?: boolean;
	viewerRole?: string;
	/** Served as `GET /api/role-permissions/me`; when unset the mock's own fixture role answers. */
	permissions?: string[];
	/** Members this file puts in the inactive list up front (`GET /api/employee/pagination`). */
	inactiveEmails?: string[];
	refuseTeamPut?: Refusal;
	refuseUserPut?: Refusal;
	refuseTeamEmployeePut?: Refusal;
	refuseEmployeePut?: Refusal;
	refuseUnassign?: Refusal;
	refuseInactiveRead?: Refusal;
};

/** The mock's fixture role holds its five base permissions and offers no way to drop one (`mock-gauzy-server.mjs:50`);
 *  a test that needs a viewer without `ORG_EMPLOYEES_EDIT` serves this read itself. */
const MANAGER_WITHOUT_EMPLOYEES_EDIT = ['TIME_TRACKER', 'ORG_TASK_ADD', 'ORG_TASK_EDIT', 'ORG_INVITE_EDIT'];

type TeamHarness = {
	calls: ServedCall[];
	/** Live: a test arms a refusal on it between the page's writes. */
	script: Script;
	team: () => ServedTeam;
	members: () => ServedMember[];
	/** The members this file moved out of the team (their work ended or they were removed). */
	inactive: () => ServedMember[];
	people: () => Array<{ name: string; email: string; employeeId: string; userId: string; rowId: string }>;
	resetCalls: () => void;
	shapes: () => string[];
	waitForCall: (method: string, path: string) => Promise<ServedCall>;
	/** Waits until `count` calls of this method and path arrived, and answers the `count`-th one. */
	waitForCallCount: (method: string, path: string, count: number) => Promise<ServedCall>;
	/** Holds the answer of the next team write until the returned function releases it. */
	holdNextTeamWrite: () => () => void;
};

const servedPath = (pathname: string) =>
	pathname === '/api/organization-team' ||
	/^\/api\/organization-team\/[^/]+$/.test(pathname) ||
	/^\/api\/organization-team-employee\/[^/]+$/.test(pathname) ||
	(pathname.startsWith('/api/user/') && pathname !== '/api/user/me') ||
	pathname === '/api/employee/pagination' ||
	/^\/api\/employee\/[^/]+$/.test(pathname) ||
	/^\/api\/tasks\/employee\/[^/]+$/.test(pathname) ||
	pathname === '/api/roles' ||
	pathname === '/api/role-permissions/me';

/**
 * The stand-in for the team API, on the mock origin, because the mock answers the team reads from its fixture and
 * stores no write (`mock-gauzy-server.mjs:655-656` for the reads, `:893-895` for the writes that have no handler, and
 * the inactive read always empty at `:895`). The store is what every later read answers from, so "the row is back as
 * it was" and "the row is gone" are told apart from "the server still says the same". `route.fetch()` is never called,
 * so a stubbed path never reaches the mock.
 */
async function serveTeam(page: Page, fixture: BootstrapFixture, script: Script): Promise<TeamHarness> {
	const tenantId = fixture.ids.tenantA;
	const organizationId = fixture.ids.organizationA;
	const teamId = fixture.ids.teamA;
	const roles: ServedRole[] = [
		{ id: ROLE_EXTRA_IDS.SUPER_ADMIN, name: 'SUPER_ADMIN' },
		{ id: fixture.ids.role, name: 'ADMIN' },
		{ id: ROLE_EXTRA_IDS.MANAGER, name: 'MANAGER' },
		{ id: ROLE_EXTRA_IDS.EMPLOYEE, name: 'EMPLOYEE' },
		{ id: ROLE_EXTRA_IDS.DATA_ENTRY, name: 'DATA_ENTRY' },
		{ id: ROLE_EXTRA_IDS.VIEWER, name: 'VIEWER' }
	];
	const roleByName = (name: string): ServedRole => roles.find((role) => role.name === name) ?? roles[3];

	const fixtureIdsOf = (index: number) => {
		if (index === 0) {
			return { user: fixture.ids.user, employee: fixture.ids.employee, member: fixture.ids.member };
		}
		if (index === 1) {
			return {
				user: fixture.ids.teammateUser,
				employee: fixture.ids.teammateEmployee,
				member: fixture.ids.teammateMember
			};
		}
		if (index === 2) {
			return { user: fixture.ids.deniedUser, employee: fixture.ids.deniedEmployee, member: EXTRA_IDS(2).member };
		}
		return EXTRA_IDS(index);
	};

	const buildMember = (index: number): ServedMember => {
		const seed =
			index === 0
				? {
						...PEOPLE[index],
						isManager: script.viewerManager ?? true,
						role: script.viewerRole ?? PEOPLE[0].role
					}
				: PEOPLE[index];
		const ids = fixtureIdsOf(index);
		const role = roleByName(seed.role);
		const user: ServedUser = {
			id: ids.user,
			firstName: seed.first,
			lastName: seed.last,
			name: `${seed.first} ${seed.last}`,
			email: seed.email,
			timeZone: 'UTC',
			isEmailVerified: true,
			tenantId,
			roleId: role.id,
			role,
			employeeId: ids.employee
		};
		const employee: ServedEmployee = {
			id: ids.employee,
			userId: user.id,
			user,
			fullName: user.name,
			isTrackingEnabled: seed.isTrackingEnabled ?? true,
			isTrackingTime: false,
			isActive: true,
			organizationId,
			tenantId,
			createdAt: seed.joinedAt,
			billRateValue: seed.billRateValue ?? null,
			billRateCurrency: seed.billRateCurrency ?? null,
			reWeeklyLimit: seed.reWeeklyLimit ?? null
		};
		return {
			id: ids.member,
			employeeId: employee.id,
			employee,
			user,
			isManager: seed.isManager,
			isActive: true,
			isTrackingEnabled: true,
			organizationTeamId: teamId,
			organizationId,
			tenantId,
			roleId: role.id,
			role,
			createdAt: seed.joinedAt,
			totalWorkedTasks: [],
			totalTodayTasks: []
		};
	};

	const store = {
		members: Array.from({ length: script.rosterSize }, (_, index) => buildMember(index)),
		inactive: [] as ServedMember[],
		former: new Map<string, ServedMember>()
	};
	for (const email of script.inactiveEmails ?? []) {
		const member = store.members.find((candidate) => candidate.user.email === email);
		if (!member) {
			continue;
		}
		store.members = store.members.filter((candidate) => candidate.user.email !== email);
		store.former.set(member.employeeId, member);
		store.inactive.push(member);
	}

	const calls: ServedCall[] = [];
	type Gate = { promise: Promise<void>; release: () => void };
	const newGate = (): Gate => {
		let release: () => void = () => undefined;
		const promise = new Promise<void>((resolve) => {
			release = () => resolve();
		});
		return { promise, release };
	};
	/** Armed by a test: the next team write waits with its answer until the test releases it. */
	let writeGate: Gate | null = null;

	const awaitWriteGate = async () => {
		const gate = writeGate;
		if (!gate) {
			return;
		}
		writeGate = null;
		await gate.promise;
	};

	const team = (): ServedTeam => ({
		id: teamId,
		name: fixture.names.teamA,
		organizationId,
		tenantId,
		public: true,
		profile_link: fixture.profileLink,
		prefix: 'FIA',
		shareProfileView: false,
		requirePlanToTrack: false,
		members: store.members,
		managers: store.members.filter((member) => member.isManager),
		projects: [],
		tasks: [],
		statuses: []
	});

	const endWorkOf = (member: ServedMember) => member.employee.endWork ?? member.createdAt;

	/** Gauzy's own shape for an employee whose work ended: the team membership stays, `endWork` is the date. */
	const inactiveAnswerOf = (member: ServedMember) => ({
		id: member.employeeId,
		fullName: member.employee.fullName,
		endWork: endWorkOf(member),
		user: {
			name: member.user.name,
			firstName: member.user.firstName,
			lastName: member.user.lastName,
			email: member.user.email,
			imageUrl: null
		},
		teams: [{ organizationTeamId: teamId }]
	});

	const inactiveEmployees = () => store.inactive.map(inactiveAnswerOf);

	const answer = (route: Route, status: number, body?: unknown) =>
		route.fulfill({
			status,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: body === undefined ? '' : JSON.stringify(body)
		});

	const refuse = (route: Route, refusal: Refusal) =>
		answer(route, refusal.status, { statusCode: refusal.status, message: refusal.message });

	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && servedPath(url.pathname),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const pathname = new URL(request.url()).pathname;
			if (method === 'OPTIONS') {
				return answer(route, 204);
			}
			const raw = request.postData();
			const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
			calls.push({ method, path: pathname, body });

			/* ---- the team reads and the team write ---- */
			if (pathname === '/api/organization-team' && method === 'GET') {
				return answer(route, 200, { items: [team()], total: 1 });
			}
			if (/^\/api\/organization-team\/[^/]+$/.test(pathname)) {
				if (method === 'GET') {
					return answer(route, 200, team());
				}
				if (method === 'PUT') {
					const refusal = script.refuseTeamPut;
					if (refusal) {
						return refuse(route, refusal);
					}
					const memberIds = (body?.memberIds ?? []) as string[];
					const managerIds = (body?.managerIds ?? []) as string[];
					const kept = store.members.filter((member) => memberIds.includes(member.employeeId));
					const dropped = store.members.filter((member) => !memberIds.includes(member.employeeId));
					for (const member of dropped) {
						store.former.set(member.employeeId, member);
					}
					store.members = memberIds
						.map((employeeId) => kept.find((member) => member.employeeId === employeeId))
						.filter((member): member is ServedMember => Boolean(member))
						.map((member) => ({ ...member, isManager: managerIds.includes(member.employeeId) }));
					await awaitWriteGate();
					return answer(route, 200, team());
				}
			}

			/* ---- the tracking switch of the member inside the team ---- */
			if (/^\/api\/organization-team-employee\/[^/]+$/.test(pathname) && method === 'PUT') {
				const refusal = script.refuseTeamEmployeePut;
				if (refusal) {
					return refuse(route, refusal);
				}
				const rowId = pathname.split('/').pop() as string;
				const isTrackingEnabled = body?.isTrackingEnabled === true;
				store.members = store.members.map((member) =>
					member.id === rowId ? { ...member, isTrackingEnabled } : member
				);
				return answer(route, 200, {
					affected: 1,
					...(team().members.find((member) => member.id === rowId) ?? {})
				});
			}

			/* ---- the account: workspace role, name ---- */
			if (pathname.startsWith('/api/user/') && method === 'PUT') {
				const refusal = script.refuseUserPut;
				if (refusal) {
					return refuse(route, refusal);
				}
				const userId = pathname.split('/').pop() as string;
				const roleId = typeof body?.roleId === 'string' ? body.roleId : null;
				const firstName = typeof body?.firstName === 'string' ? body.firstName : null;
				const lastName = typeof body?.lastName === 'string' ? body.lastName : null;
				for (const member of [...store.members, ...store.inactive]) {
					if (member.user.id !== userId) {
						continue;
					}
					if (roleId) {
						const role = roles.find((candidate) => candidate.id === roleId) ?? member.role;
						member.user = { ...member.user, roleId, role };
						member.role = role;
						member.employee = { ...member.employee, user: member.user };
					}
					if (firstName !== null) {
						const name = [firstName, lastName ?? ''].filter(Boolean).join(' ');
						member.user = { ...member.user, firstName, lastName: lastName ?? member.user.lastName, name };
						member.employee = {
							...member.employee,
							user: member.user,
							fullName: name
						};
					}
				}
				const touched = [...store.members, ...store.inactive].find((member) => member.user.id === userId);
				return answer(route, 200, touched?.user ?? { id: userId });
			}

			/* ---- the employee: end of work, its own tracking switch, its rates ---- */
			if (/^\/api\/employee\/[^/]+$/.test(pathname) && method === 'PUT') {
				const refusal = script.refuseEmployeePut;
				if (refusal) {
					return refuse(route, refusal);
				}
				const employeeId = pathname.split('/').pop() as string;
				const bodyKeys = Object.keys(body ?? {});
				const isWorkEnd = bodyKeys.includes('endWork');
				const member = store.members.find((candidate) => candidate.employeeId === employeeId);
				if (isWorkEnd) {
					const endWork = body?.endWork;
					const isActive = endWork === null;
					if (!isActive && member) {
						store.members = store.members.filter((candidate) => candidate.employeeId !== employeeId);
						store.former.set(employeeId, member);
						store.inactive = [
							...store.inactive.filter((candidate) => candidate.employeeId !== employeeId),
							{ ...member, employee: { ...member.employee, isActive: false, endWork: String(endWork) } }
						];
					} else if (isActive) {
						const former = store.former.get(employeeId);
						store.inactive = store.inactive.filter((candidate) => candidate.employeeId !== employeeId);
						store.former.delete(employeeId);
						if (former && !store.members.some((candidate) => candidate.employeeId === employeeId)) {
							store.members = [
								...store.members,
								{ ...former, employee: { ...former.employee, isActive: true, endWork: null } }
							];
						}
					}
					return answer(route, 200, { isActive });
				}
				if (member) {
					const next = { ...member.employee };
					if (bodyKeys.includes('isTrackingEnabled')) {
						next.isTrackingEnabled = body?.isTrackingEnabled === true;
					}
					if (bodyKeys.includes('billRateValue')) {
						next.billRateValue = (body?.billRateValue as number | null) ?? null;
					}
					if (bodyKeys.includes('billRateCurrency')) {
						next.billRateCurrency = (body?.billRateCurrency as string | null) ?? null;
					}
					if (bodyKeys.includes('reWeeklyLimit')) {
						next.reWeeklyLimit = (body?.reWeeklyLimit as number | null) ?? null;
					}
					store.members = store.members.map((candidate) =>
						candidate.employeeId === employeeId ? { ...candidate, employee: next } : candidate
					);
					return answer(route, 200, { ...member, employee: next });
				}
				return answer(route, 200, { repricedTimeLogs: 0 });
			}

			/* ---- unassigning a removed member from the team's tasks ---- */
			if (/^\/api\/tasks\/employee\/[^/]+$/.test(pathname) && method === 'DELETE') {
				const refusal = script.refuseUnassign;
				if (refusal) {
					return refuse(route, refusal);
				}
				return answer(route, 200, { affected: 1, raw: [] });
			}

			/* ---- the inactive list ---- */
			if (pathname === '/api/employee/pagination' && method === 'GET') {
				const refusal = script.refuseInactiveRead;
				if (refusal) {
					return refuse(route, refusal);
				}
				const items = inactiveEmployees();
				return answer(route, 200, { items, total: items.length });
			}

			/* ---- the roles of the workspace, and the viewer's permissions ---- */
			if (pathname === '/api/roles' && method === 'GET') {
				const items = roles.map((role) => ({
					id: role.id,
					name: role.name,
					isSystem: true,
					rolePermissions: [],
					tenantId
				}));
				return answer(route, 200, { items, total: items.length });
			}
			if (pathname === '/api/role-permissions/me' && method === 'GET') {
				const permissions = script.permissions;
				if (!permissions) {
					return route.fallback();
				}
				const items = permissions.map((permission, index) => ({
					id: `dddddddd-dddd-4ddd-8ddd-${String(index + 1).padStart(12, '0')}`,
					roleId: fixture.ids.role,
					permission,
					enabled: true,
					tenantId
				}));
				return answer(route, 200, items);
			}

			return answer(route, 599, {
				statusCode: 599,
				message: `this file scripted no answer for ${method} ${pathname}`
			});
		}
	);

	return {
		calls,
		script,
		team,
		members: () => store.members,
		inactive: () => store.inactive,
		people: () =>
			[...store.members, ...store.inactive].map((member) => ({
				name: member.employee.fullName,
				email: member.user.email,
				employeeId: member.employeeId,
				userId: member.user.id,
				rowId: member.id
			})),
		resetCalls: () => {
			calls.length = 0;
		},
		shapes: () => calls.map((call) => `${call.method} ${call.path}`).sort(),
		waitForCall: async (method, path) => {
			await expect
				.poll(async () => calls.some((call) => call.method === method && call.path === path), {
					timeout: 30_000
				})
				.toBe(true);
			return calls.find((call) => call.method === method && call.path === path) as ServedCall;
		},
		waitForCallCount: async (method, path, count) => {
			const arrived = () => calls.filter((call) => call.method === method && call.path === path);
			await expect.poll(() => arrived().length, { timeout: 30_000 }).toBeGreaterThan(count - 1);
			return arrived()[count - 1] as ServedCall;
		},
		holdNextTeamWrite: () => {
			const gate = newGate();
			writeGate = gate;
			return () => {
				writeGate = null;
				gate.release();
			};
		}
	};
}

/* ------------------------------------------------------------------ *
 * Reading the page
 * ------------------------------------------------------------------ */

const membersSection = (page: Page) => page.locator('#members');
const memberRow = (page: Page, name: string) => membersSection(page).locator('li').filter({ hasText: name });
const rowMenuButton = (page: Page, name: string) =>
	page.getByRole('button', { name: M.ROW_MENU.replace('{name}', name), exact: true });
const roleButton = (page: Page, name: string, role: string) =>
	page.getByRole('button', { name: fill('ROLE_OF', { name, role }), exact: true });

const sectionText = async (page: Page) => (await membersSection(page).innerText()).replace(/\s+/g, ' ').trim();

/** The items of an open menu: the plain ones and the checkbox items, which carry `menuitemcheckbox`
 *  (`member-row.tsx:281-296` renders the tracking switch as a `DropdownMenuCheckboxItem`). */
const menuItems = (page: Page) => page.getByRole('menuitem').or(page.getByRole('menuitemcheckbox'));

/** Opens one row menu and waits for it; the caller closes it with Escape and waits for 0 items. */
const openRowMenu = async (page: Page, name: string) => {
	await rowMenuButton(page, name).click({ timeout: 15_000 });
	await expect(page.getByRole('menu')).toBeVisible({ timeout: 10_000 });
};
const closeMenu = async (page: Page) => {
	await page.keyboard.press('Escape');
	await expect(menuItems(page)).toHaveCount(0, { timeout: 10_000 });
};

/** One tab of the members' Active / Inactive switch, scoped to its own tablist (other settings tabs share the names). */
const memberFilterTab = (page: Page, name: string) =>
	page.getByRole('tablist', { name: M.FILTER_LABEL }).getByRole('tab', { name, exact: true });

/* ------------------------------------------------------------------ *
 * The tests
 * ------------------------------------------------------------------ */

test('1. the members list as a team manager sees it', async ({ page, app, fixture, shield }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: { manager: true } });

	const people = t.people();
	report('rows', { names: people.map((p) => `${p.name} <${p.email}>`) });

	await expect(membersSection(page).locator('li')).toHaveCount(9);
	await expect(membersSection(page).locator('h2')).toHaveText(M.MEMBERS_SECTION);
	await expect(membersSection(page).locator(`p:has-text("${countText('MEMBERS_COUNT', 9)}")`)).toHaveCount(1);

	report('section as printed', { text: await sectionText(page) });

	// every served member is on the page, with the email the store serves and the joined date computed from it
	for (const person of people) {
		const row = memberRow(page, person.name);
		await expect(row, `the row of ${person.name}`).toBeVisible();
		await expect(row).toContainText(person.email);
	}
	for (const member of t.members()) {
		const joined = fill('JOINED', { date: dayOf(member.createdAt) });
		await expect(memberRow(page, member.employee.fullName), member.createdAt).toContainText(joined);
	}

	// my own row is marked and its team role is not a control (`member-row.tsx:153-155`, `canChangeRole` at
	// `use-team-members-settings.ts:298`); a workspace admin is marked with their role name (`:442-451`)
	await expect(memberRow(page, people[0].name)).toContainText(M.YOU);
	await expect(memberRow(page, people[0].name)).toContainText(EN.settings.members.WORKSPACE_ROLE_ADMIN);
	await expect(roleButton(page, people[0].name, M.ROLE_MANAGER)).toHaveCount(0);
	await expect(
		membersSection(page)
			.locator('li')
			.filter({ hasText: people[0].name })
			.getByText(M.ROLE_MANAGER, { exact: true })
	).toHaveCount(1);

	// a plain member of this file's roster reads as a member of the team, on a control (`isTeamManagerMember` at
	// `core/stores/teams/organization-team.ts:76-78` reads `isManager` and the member row's role name)
	await expect(roleButton(page, people[1].name, M.ROLE_MEMBER)).toHaveCount(1);

	// a member whose role name is ADMIN or MANAGER reads as a manager of the team even with `isManager: false`, and
	// the admin is marked with their workspace role (`member-row.tsx:442-451`)
	await expect(roleButton(page, people[8].name, M.ROLE_MANAGER)).toHaveCount(1);
	await expect(memberRow(page, people[8].name)).toContainText(EN.settings.members.WORKSPACE_ROLE_ADMIN);

	// the rate of the member who has one, as `MemberRateText` prints it (`member-row.tsx:552` →
	// `member-rate-editor.tsx:40-52` → `rateAmountTextOf` with the served currency)
	const cleo = t.members()[5];
	const cleoAmount = new Intl.NumberFormat('en', {
		style: 'currency',
		currency: String(cleo.employee.billRateCurrency)
	}).format(Number(cleo.employee.billRateValue));
	// `rates.PER_HOUR` = "{amount}/h"
	await expect(memberRow(page, people[5].name)).toContainText(`${cleoAmount}/h`);
	// the member without a rate shows none (`rateAmountTextOf` returns null)
	await expect(memberRow(page, people[6].name)).not.toContainText('/h');

	// 9 rows reach `MIN_ROWS_FOR_SEARCH` (`members-section.tsx:34`), while the Active/Inactive switch needs
	// ORG_EMPLOYEES_VIEW (`member-access.ts:39-41`), which the lane's fixture role does not hold
	await expect(page.getByRole('searchbox')).toHaveCount(1);
	await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', M.SEARCH_PLACEHOLDER);
	await expect(page.getByRole('tablist', { name: M.FILTER_LABEL })).toHaveCount(0);
	report('controls', {
		searchboxes: await page.getByRole('searchbox').count(),
		tablists: await page.getByRole('tablist').count()
	});

	// the reads the page sent for the roster this file serves
	await expect
		.poll(() => t.calls.filter((call) => call.method === 'GET' && call.path === '/api/organization-team').length, {
			timeout: 20_000
		})
		.toBeGreaterThan(0);
	const teamReads = t.calls
		.filter(
			(call) =>
				call.path === '/api/organization-team' || call.path === `/api/organization-team/${fixture.ids.teamA}`
		)
		.map((call) => `${call.method} ${call.path}`)
		.sort();
	report('team reads', { teamReads });
	expect(t.calls.filter((call) => call.method !== 'GET').length, 'a visit writes nothing').toBe(0);

	expect(consoleFindings(shield), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/** Every other test runs as a team manager who may also read the employee records and the workspace roles. */
const MANAGER_SCENARIO = { manager: true, extraPermissions: ['ORG_EMPLOYEES_VIEW', 'ORG_USERS_EDIT'] };

const teamPathOf = (fixture: BootstrapFixture) => `/api/organization-team/${fixture.ids.teamA}`;

/** Whether the page read the team again after this write: the service reads it back right after the PUT
 *  (`core/services/client/api/organizations/teams/team.service.ts:276-279`), and the mutation invalidates every
 *  team query (`core/hooks/organizations/teams/use-edit-organization-team.ts:38-45`). */
const teamReadAfter = (t: TeamHarness, write: ServedCall, teamPath: string) =>
	t.calls
		.slice(t.calls.indexOf(write) + 1)
		.some((call) => call.method === 'GET' && (call.path === teamPath || call.path === '/api/organization-team'));

/** A served path as the client's service layer names it in its own console line: no origin, no `/api` prefix. */
const loggedPathOf = (path: string) => path.replace(/^\/api/, '');

const menuTexts = async (page: Page) =>
	(await menuItems(page).allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());

const confirmDialog = (page: Page, title: string) => page.getByRole('dialog').filter({ hasText: title });

/** Attributes of one element; the names are passed in, so the browser callback sees no Node variable. */
const attributesOf = async (locator: Locator, names: string[]) =>
	locator.evaluate(
		(node, wanted) => Object.fromEntries(wanted.map((name) => [name, node.getAttribute(name)])),
		names
	);

/** The `Track time` checkbox item of the row menu that is open (`member-row.tsx:281-296`). */
const trackingItem = (page: Page) => page.getByRole('menuitemcheckbox').filter({ hasText: M.TRACK_TIME });

/** Opens one row menu and answers its `Track time` item. */
const openTrackingItem = async (page: Page, name: string) => {
	await openRowMenu(page, name);
	const item = trackingItem(page);
	await expect(item).toHaveCount(1);
	return item;
};

/** The checkbox state Base UI puts on the open `Track time` item. */
const TRACKING_STATE_ATTRS = ['role', 'aria-checked', 'data-checked', 'aria-disabled', 'data-disabled'];

/** The active roster's own list (`members-section.tsx:237`). Its accessible name is a substring of the inactive
 *  list's name (`en.json`: "Members" inside "Inactive members"), so the match has to be exact. Both lists live
 *  inside the same `SettingsSection id="members"`, and only one of them is rendered at a time (`:389-420`). */
const activeList = (page: Page) => page.getByRole('list', { name: M.MEMBERS_SECTION, exact: true });
const inactiveList = (page: Page) => page.getByRole('list', { name: M.INACTIVE_LIST });
const inactiveRow = (page: Page, name: string) => inactiveList(page).locator('li').filter({ hasText: name });

test('2. a member of the team who does not manage it is turned away', async ({ page, app, fixture, shield }) => {
	await serveTeam(page, fixture, { rosterSize: 9, viewerManager: false, viewerRole: 'EMPLOYEE' });
	await app(PAGE_PATH, { scenario: { manager: false } });

	// `TeamSettingsGate` still sees a member of the team, so it is the manager's card, not `<NoTeam>`. The card prints
	// its title and its description as paragraphs, not headings, and its button is a link to the team's general
	// settings (`core/components/settings/kit/team-settings-gate.tsx:26-34`). The page carries two `main` elements
	// (the shell's and the settings scroll owner's), so the card is read from the settings one (`lane-a/
	// assistant-chat-ui.spec.ts:180`).
	const gateCard = page.getByTestId('page-scroll-owner').getByRole('main');
	await expect(
		page.getByText(EN.settings.common.MANAGERS_ONLY_TITLE, { exact: true }),
		'managers-only title'
	).toBeVisible();
	await expect(page.getByText(EN.settings.common.MANAGERS_ONLY_DESCRIPTION, { exact: true })).toBeVisible();
	await expect(gateCard.getByRole('link', { name: EN.settings.entries.teamGeneral.TITLE, exact: true })).toHaveCount(
		1
	);
	report('gate card', {
		text: (await gateCard.innerText()).replace(/\s+/g, ' ').trim(),
		'links named General on the whole page': await page
			.getByRole('link', { name: EN.settings.entries.teamGeneral.TITLE })
			.count()
	});
	await expect(membersSection(page)).toHaveCount(0);
	await expect(activeList(page)).toHaveCount(0);

	expect(shield.pageErrors()).toEqual([]);
});

test('3. the search field narrows the list and says when nothing matches', async ({ page, app, fixture, shield }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const people = t.people();

	const search = page.getByRole('searchbox');
	await expect(search).toHaveCount(1);
	await search.fill(PEOPLE[3].first, { timeout: 15_000 });
	await expect(membersSection(page).locator('li')).toHaveCount(1);
	await expect(memberRow(page, people[3].name)).toBeVisible();
	// the section's count stays the roster's, not the filtered one (`members-section.tsx:376` reads `rows.length`)
	await expect(membersSection(page).locator('p')).toContainText(countText('MEMBERS_COUNT', 9));

	// an email matches too (`matchesQuery`, `members-section.tsx:38-46`)
	await search.fill(people[4].email, { timeout: 15_000 });
	await expect(membersSection(page).locator('li')).toHaveCount(1);
	await expect(memberRow(page, people[4].name)).toBeVisible();

	const query = 'nobody-here';
	await search.fill(query, { timeout: 15_000 });
	await expect(page.getByText(fill('NO_MATCH', { query }))).toBeVisible();
	await expect(page.getByRole('button', { name: M.CLEAR_SEARCH })).toHaveCount(1);
	await expect(membersSection(page).locator('li')).toHaveCount(0);

	await page.getByRole('button', { name: M.CLEAR_SEARCH }).click({ timeout: 15_000 });
	await expect(membersSection(page).locator('li')).toHaveCount(9);

	expect(shield.pageErrors()).toEqual([]);
});

test('4. with seven members the page offers no search field', async ({ page, app, fixture }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 7 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });

	await expect(membersSection(page).locator('li')).toHaveCount(t.members().length);
	await expect(membersSection(page).locator('p')).toContainText(countText('MEMBERS_COUNT', 7));
	await expect(page.getByRole('searchbox')).toHaveCount(0);
	// and every one of them is listed
	for (const person of t.people()) {
		await expect(memberRow(page, person.name), person.name).toBeVisible();
	}
});

test('5. making a member a manager of the team, and back', async ({ page, app, fixture, shield }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const person = t.people()[3];
	const teamPath = teamPathOf(fixture);

	// the role menu of a plain member: only the team group (no ORG_USERS_EDIT-free workspace group here)
	await roleButton(page, person.name, M.ROLE_MEMBER).click({ timeout: 15_000 });
	await expect(page.getByRole('menu')).toBeVisible();
	const items = await menuTexts(page);
	report('role menu items', { items });
	await page.getByRole('menuitem').filter({ hasText: M.ROLE_MANAGER_HINT }).click({ timeout: 15_000 });

	const made = await t.waitForCall('PUT', teamPath);
	const madeBody = made.body as { memberIds: string[]; managerIds: string[] };
	report('made manager', { memberIds: madeBody.memberIds, managerIds: madeBody.managerIds });
	expect(madeBody.managerIds, 'the member id the team write sent').toContain(person.employeeId);
	expect(madeBody.memberIds).toHaveLength(9);
	await expect(roleButton(page, person.name, M.ROLE_MANAGER)).toHaveCount(1);
	// the write and the team read after it landed; no failure toast followed them
	await expect.poll(() => teamReadAfter(t, made, teamPath), { timeout: 30_000 }).toBe(true);
	await parkPointer(page);
	await expect(toastOf(page, fill('ROLE_NOT_SAVED', { name: person.name }))).toHaveCount(0);
	await closeMenu(page);

	t.resetCalls();
	await roleButton(page, person.name, M.ROLE_MANAGER).click({ timeout: 15_000 });
	await page.getByRole('menuitem').filter({ hasText: M.ROLE_MEMBER_HINT }).click({ timeout: 15_000 });
	const back = await t.waitForCall('PUT', teamPath);
	const backBody = back.body as { memberIds: string[]; managerIds: string[] };
	report('back to member', { memberIds: backBody.memberIds, managerIds: backBody.managerIds });
	expect(backBody.managerIds, 'the member left the managers').not.toContain(person.employeeId);
	expect(backBody.managerIds).toContain(t.people()[0].employeeId);
	await expect(roleButton(page, person.name, M.ROLE_MEMBER)).toHaveCount(1);
	await closeMenu(page);

	expect(consoleFindings(shield), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

test('6. a team role the API refuses goes back as it was', async ({ page, app, fixture, shield }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const person = t.people()[3];
	const teamPath = teamPathOf(fixture);
	const armed: RegExp[] = [];

	const refuseRound = async (refusal: Refusal) => {
		t.resetCalls();
		t.script.refuseTeamPut = refusal;
		await roleButton(page, person.name, M.ROLE_MEMBER).click({ timeout: 15_000 });
		await page.getByRole('menuitem').filter({ hasText: M.ROLE_MANAGER_HINT }).click({ timeout: 15_000 });
		await t.waitForCall('PUT', teamPath);
		armed.push(
			armedHttpError('PUT', loggedPathOf(teamPath), refusal.status),
			armedMutationFailure(refusal.message)
		);
		const title = fill('ROLE_NOT_SAVED', { name: person.name });
		await expect(toastOf(page, title)).toBeVisible({ timeout: 20_000 });
		await expect(toastOf(page, EN.toasts.REASONS[refusal.status >= 500 ? 'SERVER' : 'INVALID'])).toBeVisible({
			timeout: 20_000
		});
		// the optimistic manager label is taken back once the refusal is answered
		await expect(roleButton(page, person.name, M.ROLE_MEMBER)).toHaveCount(1, { timeout: 20_000 });
		await parkPointer(page);
		await expect(toastOf(page, title)).toHaveCount(0, { timeout: 30_000 });
	};

	await refuseRound({ status: 400, message: 'the roster is not acceptable' });
	await refuseRound({ status: 500, message: 'the team service is down' });
	report('refusal console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield, armed), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

test('7. the workspace role of a member, as an organization admin', async ({ page, app, fixture, shield }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const people = t.people();
	const person = people[3];
	const adminRole = { id: fixture.ids.role, name: 'ADMIN' };

	await roleButton(page, person.name, M.ROLE_MEMBER).click({ timeout: 15_000 });
	await expect(page.getByRole('menu')).toBeVisible();
	// two groups (`member-row.tsx:157,179-195`): the team's two roles and the workspace roles the admin may give
	const items = await menuTexts(page);
	report('role menu items', { items });
	await expect(page.getByRole('menuitem')).toHaveCount(7);
	await expect(page.getByRole('menuitem', { name: M.ROLE_MANAGER_HINT })).toHaveCount(1);
	await expect(page.getByRole('menuitem', { name: M.WORKSPACE_ROLE_DATA_ENTRY })).toHaveCount(1);
	await expect(page.getByRole('menuitem', { name: M.WORKSPACE_ROLE_VIEWER })).toHaveCount(1);
	// the super admin role is out of an admin's reach (`member-access.ts:130-137`)
	await expect(page.getByRole('menuitem', { name: M.WORKSPACE_ROLE_SUPER_ADMIN, exact: true })).toHaveCount(0);

	await page.getByRole('menuitem', { name: M.WORKSPACE_ROLE_ADMIN, exact: true }).click({ timeout: 15_000 });
	const call = await t.waitForCall('PUT', `/api/user/${person.userId}`);
	report('workspace role write', { body: call.body });
	expect(call.body).toMatchObject({ roleId: adminRole.id });
	await expect(memberRow(page, person.name)).toContainText(EN.settings.members.WORKSPACE_ROLE_ADMIN);
	await closeMenu(page);

	// a refusal: the row keeps the role it had, and the failure is named
	const other = people[7];
	const refused = { status: 400, message: 'that role is not assignable here' };
	t.script.refuseUserPut = refused;
	await roleButton(page, other.name, M.ROLE_MEMBER).click({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: M.WORKSPACE_ROLE_ADMIN, exact: true }).click({ timeout: 15_000 });
	await t.waitForCall('PUT', `/api/user/${other.userId}`);
	const title = fill('WORKSPACE_ROLE_NOT_SAVED', { name: other.name });
	await expect(toastOf(page, title)).toBeVisible({ timeout: 20_000 });
	await expect(toastOf(page, EN.toasts.REASONS.INVALID)).toBeVisible({ timeout: 20_000 });
	await closeMenu(page);
	await expect(memberRow(page, other.name).getByText(M.WORKSPACE_ROLE_ADMIN, { exact: true })).toHaveCount(0);

	const armed = [
		armedHttpError('PUT', `/user/${other.userId}`, refused.status),
		armedMutationFailure(refused.message)
	];
	report('workspace role console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield, armed), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

test('8. renaming a member', async ({ page, app, fixture, shield }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const people = t.people();
	const person = people[3];

	await openRowMenu(page, person.name);
	await page.getByRole('menuitem', { name: M.EDIT_NAME, exact: true }).click({ timeout: 15_000 });
	const form = page.getByRole('form', { name: fill('EDIT_NAME_OF', { name: person.name }) });
	await expect(form).toBeVisible();
	const firstName = form.getByRole('textbox', { name: M.FIRST_NAME });
	const lastName = form.getByRole('textbox', { name: M.LAST_NAME });
	const servedUser = t.members()[3].user;
	await expect(firstName).toHaveValue(servedUser.firstName);
	await expect(lastName).toHaveValue(servedUser.lastName);

	// an empty first name is refused by the editor itself, before anything is sent (`member-row.tsx:343-346`)
	await firstName.fill('', { timeout: 15_000 });
	await form.getByRole('button', { name: EN.common.SAVE, exact: true }).click({ timeout: 15_000 });
	await expect(form.getByRole('alert')).toHaveText(M.FIRST_NAME_REQUIRED);
	await expect(firstName).toHaveAttribute('aria-invalid', 'true');
	expect(t.calls.filter((call) => call.method === 'PUT').length, 'no write was sent').toBe(0);

	const renamed = { firstName: 'Nada', lastName: 'Optometrist-Reyes' };
	await firstName.fill(renamed.firstName, { timeout: 15_000 });
	await lastName.fill(renamed.lastName, { timeout: 15_000 });
	t.resetCalls();
	await form.getByRole('button', { name: EN.common.SAVE, exact: true }).click({ timeout: 15_000 });
	const call = await t.waitForCall('PUT', `/api/user/${person.userId}`);
	report('rename write', { body: call.body });
	expect(call.body).toMatchObject({ firstName: renamed.firstName, lastName: renamed.lastName, id: person.userId });
	const renamedName = `${renamed.firstName} ${renamed.lastName}`;
	await expect(memberRow(page, renamedName)).toBeVisible();
	await expect(memberRow(page, person.name)).toHaveCount(0);

	// a refused rename keeps the name and says so in the form (`member-row.tsx:351-352`)
	const other = people[4];
	const refused = { status: 500, message: 'the user service is down' };
	t.script.refuseUserPut = refused;
	await openRowMenu(page, other.name);
	await page.getByRole('menuitem', { name: M.EDIT_NAME, exact: true }).click({ timeout: 15_000 });
	const otherForm = page.getByRole('form', { name: fill('EDIT_NAME_OF', { name: other.name }) });
	await otherForm.getByRole('textbox', { name: M.FIRST_NAME }).fill('Bernard', { timeout: 15_000 });
	await otherForm.getByRole('button', { name: EN.common.SAVE, exact: true }).click({ timeout: 15_000 });
	await t.waitForCall('PUT', `/api/user/${other.userId}`);
	// the row is replaced by the editor while it is open (`member-row.tsx:513-518`), so the kept name is read after it closes
	await expect(otherForm.getByRole('alert')).toHaveText(EN.settings.common.SAVE_FAILED);
	await otherForm.getByRole('button', { name: EN.common.CANCEL, exact: true }).click({ timeout: 15_000 });
	await expect(memberRow(page, other.name)).toBeVisible();

	const armed = [
		armedHttpError('PUT', `/user/${other.userId}`, refused.status),
		armedMutationFailure(refused.message)
	];
	report('rename console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield, armed), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

/** `rates.EDIT_RATE_OF` = "Edit the rate of {name}", `rates.PER_HOUR` = "{amount}/h". */
const fillRate = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), R[key]);

const money = (value: number, currency: string) =>
	new Intl.NumberFormat('en', { style: 'currency', currency }).format(value);

test('9. the tracking switch: the team write, then the employee write, and its rollback', async ({
	page,
	app,
	fixture,
	shield
}) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const person = t.people()[3];
	const teamEmployeePath = `/api/organization-team-employee/${person.rowId}`;
	const employeePath = `/api/employee/${person.employeeId}`;
	const armed: RegExp[] = [];
	const writeOrder = () =>
		t.calls
			.filter((call) => call.path === teamEmployeePath || call.path === employeePath)
			.map((call) => `${call.method} ${call.path === teamEmployeePath ? 'team' : 'employee'}`);

	// both switches of this member are on, so the row's checkbox is on (`canMemberTrackTime`,
	// `core/lib/helpers/team-member-tracking.ts:11-15`)
	const item = await openTrackingItem(page, person.name);
	report('tracking item, both switches on', { attributes: await attributesOf(item, TRACKING_STATE_ATTRS) });
	await expect(item).toHaveAttribute('aria-checked', 'true');
	await item.click({ timeout: 15_000 });
	await closeMenu(page);

	const teamWrite = await t.waitForCall('PUT', teamEmployeePath);
	report('team switch write', { body: teamWrite.body });
	expect(teamWrite.body).toMatchObject({
		organizationId: fixture.ids.organizationA,
		organizationTeamId: fixture.ids.teamA,
		isTrackingEnabled: false
	});
	const employeeWrite = await t.waitForCall('PUT', employeePath);
	report('employee switch write', { body: employeeWrite.body });
	expect(employeeWrite.body).toMatchObject({ id: person.employeeId, isTrackingEnabled: false });
	report('write order', { order: writeOrder() });
	expect(writeOrder(), 'the team switch first, then the employee switch').toEqual(['PUT team', 'PUT employee']);

	// the employee write refused: the team switch goes back to what it was (`use-member-tracking-switch.ts:137-142`)
	t.resetCalls();
	const refused = { status: 500, message: 'the employee service is down' };
	t.script.refuseEmployeePut = refused;
	const itemOff = await openTrackingItem(page, person.name);
	await itemOff.click({ timeout: 15_000 });
	await closeMenu(page);
	const teamOn = await t.waitForCall('PUT', teamEmployeePath);
	expect(teamOn.body).toMatchObject({ isTrackingEnabled: true });
	await t.waitForCall('PUT', employeePath);
	armed.push(
		armedHttpError('PUT', loggedPathOf(employeePath), refused.status),
		armedMutationFailure(refused.message)
	);
	const rolledBack = await t.waitForCallCount('PUT', teamEmployeePath, 2);
	report('rollback write', { body: rolledBack.body });
	expect(rolledBack.body, 'the team switch goes back off').toMatchObject({ isTrackingEnabled: false });
	report('write order after the refusal', { order: writeOrder() });
	expect(writeOrder()).toEqual(['PUT team', 'PUT employee', 'PUT team']);

	// the failed employee write is named by the employees hook, with its own reason (`hooks/organizations/employees/use-employee.ts:140-143`)
	await expect(toastOf(page, EN.toasts.teams.MEMBER_NOT_SAVED)).toBeVisible({ timeout: 20_000 });
	await expect(toastOf(page, EN.toasts.REASONS.SERVER)).toBeVisible({ timeout: 20_000 });
	t.script.refuseEmployeePut = undefined;

	const after = await openTrackingItem(page, person.name);
	report('tracking item after the rollback', { attributes: await attributesOf(after, TRACKING_STATE_ATTRS) });
	// off again: the team switch was taken back and the employee write never landed
	await expect(after).toHaveAttribute('aria-checked', 'false');
	await closeMenu(page);
	await parkPointer(page);
	await expect(toastOf(page, EN.toasts.teams.MEMBER_NOT_SAVED)).toHaveCount(0, { timeout: 30_000 });

	report('tracking console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield, armed), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

test('10. a tracking switch the viewer may not write is locked, with its reason', async ({
	page,
	app,
	fixture,
	shield
}) => {
	// no ORG_EMPLOYEES_EDIT among the served permissions: `writesEmployeeTracking` is false for every member
	// (`use-member-tracking-switch.ts:78,95-103`), and a member whose own switch is off is locked
	// (`use-team-members-settings.ts:129-132`)
	const t = await serveTeam(page, fixture, { rosterSize: 9, permissions: MANAGER_WITHOUT_EMPLOYEES_EDIT });
	await app(PAGE_PATH, { scenario: { manager: true } });
	const locked = t.people()[6];
	const unlocked = t.people()[3];

	const lockedItem = await openTrackingItem(page, locked.name);
	const items = await menuTexts(page);
	report('locked member menu', { items });
	await expect(lockedItem).toContainText(M.TRACKING_OFF_BY_ADMIN);
	report('locked item attributes', { attributes: await attributesOf(lockedItem, TRACKING_STATE_ATTRS) });
	expect(
		items.some((text) => text.includes(R.EDIT_RATE)),
		'no rate editor without ORG_EMPLOYEES_EDIT'
	).toBe(false);
	expect(
		items.some((text) => text.includes(M.DEACTIVATE)),
		'no deactivation without ORG_EMPLOYEES_EDIT'
	).toBe(false);

	// the locked switch is disabled inside the menu — Base UI carries it as `role=menuitemcheckbox` with
	// `aria-disabled="true"`, `data-disabled` (empty), `data-unchecked` (measured; a click on it is refused with
	// "element is not enabled"), so nothing is written: proved by the count below, after the rounds that follow
	await expect(lockedItem).toHaveAttribute('role', 'menuitemcheckbox');
	await expect(lockedItem).toHaveAttribute('aria-disabled', 'true');
	await expect(lockedItem).toHaveAttribute('data-disabled', '');
	await closeMenu(page);

	const unlockedItem = await openTrackingItem(page, unlocked.name);
	report('unlocked item attributes', { attributes: await attributesOf(unlockedItem, TRACKING_STATE_ATTRS) });
	await expect(unlockedItem).not.toContainText(M.TRACKING_OFF_BY_ADMIN);
	await closeMenu(page);

	expect(t.calls.filter((call) => call.method !== 'GET').length, 'a locked switch sent nothing').toBe(0);
	expect(shield.pageErrors()).toEqual([]);
});

test('11. the rate editor of a member: what it sends and what it refuses first', async ({
	page,
	app,
	fixture,
	shield,
	mock
}) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const person = t.people()[5];
	const servedEmployee = t.members()[5].employee;
	const employeePath = `/api/employee/${person.employeeId}`;
	const rateText = (value: number) => `${money(value, String(servedEmployee.billRateCurrency))}/h`;

	await openRowMenu(page, person.name);
	await page.getByRole('menuitem', { name: R.EDIT_RATE, exact: true }).click({ timeout: 15_000 });
	const form = page.getByRole('form', { name: fillRate('EDIT_RATE_OF', { name: person.name }) });
	await expect(form).toBeVisible();
	const billing = form.getByRole('textbox', { name: R.BILLING_RATE });
	const weekly = form.getByRole('textbox', { name: R.WEEKLY_LIMIT });
	await expect(billing, 'the editor opens on the stored rate').toHaveValue(String(servedEmployee.billRateValue));
	await expect(weekly).toHaveValue(String(servedEmployee.reWeeklyLimit));
	// the pay rate field is part of the edit because the lane's mock answers the pay-rate read (`mock-gauzy-server.mjs:883-884`)
	await expect(form.getByRole('textbox', { name: R.PAY_RATE })).toHaveValue('');
	// the currency control and the pay-rate read the mock itself answers (`mock-gauzy-server.mjs:883-884`)
	const currencyChoice = form.getByRole('combobox').first();
	report('rate editor', {
		comboboxes: await form.getByRole('combobox').count(),
		currency: await currencyChoice.inputValue().catch(() => '<not a native select>'),
		payRateReads: (await mock.requests())
			.filter((request) => request.path.includes('/pay-rate'))
			.map((request) => `${request.method} ${request.path.split('?')[0]} ${request.status}`)
	});

	const save = form.getByRole('button', { name: EN.common.SAVE, exact: true });

	// a value that is not a number never reaches the API (`member-rate-editor.tsx:120-127`)
	await billing.fill('forty', { timeout: 15_000 });
	await save.click({ timeout: 15_000 });
	await expect(form.getByRole('alert')).toHaveText(R.NUMBER_INVALID);
	await expect(billing).toHaveAttribute('aria-invalid', 'true');

	// a negative rate is refused the same way
	await billing.fill('-5', { timeout: 15_000 });
	await save.click({ timeout: 15_000 });
	await expect(form.getByRole('alert')).toHaveText(R.NUMBER_NEGATIVE);

	// the weekly limit stays in whole hours (`member-rate-editor.tsx:128-133`)
	await billing.fill('60', { timeout: 15_000 });
	await weekly.fill('37.5', { timeout: 15_000 });
	await save.click({ timeout: 15_000 });
	await expect(form.getByRole('alert')).toHaveText(R.WEEKLY_LIMIT_WHOLE_HOURS);
	expect(t.calls.filter((call) => call.method !== 'GET').length, 'a refused input sent nothing').toBe(0);

	// a valid save sends only the field that changed (`rates.ts:179-197` → `rate.service.ts:107-114`)
	// the weekly limit back to the stored one, so only the billing rate has changed
	await weekly.fill(String(servedEmployee.reWeeklyLimit), { timeout: 15_000 });
	t.resetCalls();
	await save.click({ timeout: 15_000 });
	const call = await t.waitForCall('PUT', employeePath);
	report('rate write', { body: call.body });
	expect(call.body).toMatchObject({
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		billRateValue: 60
	});
	expect(Object.keys(call.body ?? {}).sort(), 'only the billing rate was written').toEqual([
		'billRateValue',
		'organizationId',
		'tenantId'
	]);

	// the row prints the new rate as `rates.PER_HOUR`; this lane's organization names no past-time rule, so the
	// editor asked nothing and a save of a rate says nothing (`use-rate-apply-question.ts:28` + `rate-apply.ts:21-36`)
	await expect(form).toHaveCount(0);
	await expect(memberRow(page, person.name)).toContainText(rateText(60));
	await expect(page.getByText(R.APPLY_QUESTION)).toHaveCount(0);
	await expect(toastOf(page, R.RATE_SAVED)).toHaveCount(0);

	// a refused save answers inside the editor, inline (`member-rate-editor.tsx:168-174` + `rate-apply.ts:130-134`)
	const refused = { status: 400, message: 'the rate is not acceptable' };
	t.script.refuseEmployeePut = refused;
	await openRowMenu(page, person.name);
	await page.getByRole('menuitem', { name: R.EDIT_RATE, exact: true }).click({ timeout: 15_000 });
	const again = page.getByRole('form', { name: fillRate('EDIT_RATE_OF', { name: person.name }) });
	const againBilling = again.getByRole('textbox', { name: R.BILLING_RATE });
	await expect(againBilling, 'the saved rate is what the editor opens on').toHaveValue('60');
	await againBilling.fill('70', { timeout: 15_000 });
	await again.getByRole('button', { name: EN.common.SAVE, exact: true }).click({ timeout: 15_000 });
	await t.waitForCall('PUT', employeePath);
	await expect(again.getByRole('alert')).toHaveText(EN.toasts.REASONS.INVALID);
	await again.getByRole('button', { name: EN.common.CANCEL, exact: true }).click({ timeout: 15_000 });
	await expect(memberRow(page, person.name)).toContainText(rateText(60));

	const armed = [
		armedHttpError('PUT', loggedPathOf(employeePath), refused.status),
		armedMutationFailure(refused.message)
	];
	report('rate console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield, armed), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

test('12. removing a member from the team', async ({ page, app, fixture, shield }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const people = t.people();
	const first = people[4];
	const second = people[7];
	const teamPath = teamPathOf(fixture);
	const unassignRefusal = { status: 400, message: 'the tasks could not be read' };
	const rosterRefusal = { status: 400, message: 'the roster is not acceptable' };
	const armed: RegExp[] = [];

	await openRowMenu(page, first.name);
	await page.getByRole('menuitem', { name: M.REMOVE, exact: true }).click({ timeout: 15_000 });
	const dialog = confirmDialog(page, fill('REMOVE_TITLE', { name: first.name, team: fixture.names.teamA }));
	await expect(dialog).toBeVisible();
	await expect(dialog.locator('li')).toHaveCount(2);
	await expect(dialog).toContainText(fill('REMOVE_CONSEQUENCE_LIST', { name: first.name }));
	await expect(dialog).toContainText(M.REMOVE_CONSEQUENCE_TASKS);

	// the tasks go first, the team roster after (`use-team-members-settings.ts:400-423`)
	t.resetCalls();
	await dialog.getByRole('button', { name: M.REMOVE_CONFIRM, exact: true }).click({ timeout: 15_000 });
	const unassign = await t.waitForCall('DELETE', `/api/tasks/employee/${first.employeeId}`);
	report('unassign call', { path: unassign.path });
	const roster = await t.waitForCall('PUT', teamPath);
	const rosterBody = roster.body as { memberIds: string[]; managerIds: string[] };
	report('remove write', { memberIds: rosterBody.memberIds, managerIds: rosterBody.managerIds });
	expect(rosterBody.memberIds, 'the removed member is out of the roster').not.toContain(first.employeeId);
	expect(rosterBody.memberIds).toHaveLength(8);
	const order = t.calls.map((call) => `${call.method} ${call.path}`);
	report('remove order', { order });
	expect(order.indexOf(`DELETE /api/tasks/employee/${first.employeeId}`)).toBeLessThan(
		order.indexOf(`PUT ${teamPath}`)
	);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(memberRow(page, first.name)).toHaveCount(0);
	await expect(membersSection(page).locator('li')).toHaveCount(8);
	await expect(membersSection(page).locator('p')).toContainText(countText('MEMBERS_COUNT', 8));
	await expect(toastOf(page, fill('REMOVE_FAILED', { name: first.name }))).toHaveCount(0);

	// a failed unassign is only logged: the team update still removes the member (`use-team-members-settings.ts:404-408`)
	t.script.refuseUnassign = unassignRefusal;
	t.resetCalls();
	await openRowMenu(page, second.name);
	await page.getByRole('menuitem', { name: M.REMOVE, exact: true }).click({ timeout: 15_000 });
	const secondDialog = confirmDialog(page, fill('REMOVE_TITLE', { name: second.name, team: fixture.names.teamA }));
	await secondDialog.getByRole('button', { name: M.REMOVE_CONFIRM, exact: true }).click({ timeout: 15_000 });
	await t.waitForCall('DELETE', `/api/tasks/employee/${second.employeeId}`);
	const secondRoster = await t.waitForCall('PUT', teamPath);
	const secondBody = secondRoster.body as { memberIds: string[] };
	expect(secondBody.memberIds, 'the member is removed even though the unassign failed').not.toContain(
		second.employeeId
	);
	// the fallback toaster names the failed mutation even though the removal went through
	// (`core/components/common/mutation-error-toaster.tsx:50-56`)
	await expect(toastOf(page, EN.toasts.MUTATION_FAILED)).toBeVisible({ timeout: 20_000 });
	await expect(memberRow(page, second.name)).toHaveCount(0);
	await expect(membersSection(page).locator('li')).toHaveCount(7);
	await parkPointer(page);
	await expect(toastOf(page, EN.toasts.MUTATION_FAILED)).toHaveCount(0, { timeout: 30_000 });

	// a refused team write keeps the member and the dialog says why
	t.script.refuseUnassign = undefined;
	t.script.refuseTeamPut = rosterRefusal;
	const kept = people[6];
	t.resetCalls();
	await openRowMenu(page, kept.name);
	await page.getByRole('menuitem', { name: M.REMOVE, exact: true }).click({ timeout: 15_000 });
	const keptDialog = confirmDialog(page, fill('REMOVE_TITLE', { name: kept.name, team: fixture.names.teamA }));
	await keptDialog.getByRole('button', { name: M.REMOVE_CONFIRM, exact: true }).click({ timeout: 15_000 });
	await t.waitForCall('PUT', teamPath);
	await expect(keptDialog.getByRole('alert')).toHaveText(EN.toasts.REASONS.INVALID);
	await expect(toastOf(page, fill('REMOVE_FAILED', { name: kept.name }))).toBeVisible({ timeout: 20_000 });
	await expect(memberRow(page, kept.name)).toBeVisible();
	await keptDialog.getByRole('button', { name: EN.common.CANCEL, exact: true }).click({ timeout: 15_000 });
	await expect(page.getByRole('dialog')).toHaveCount(0);

	armed.push(
		armedHttpError('DELETE', `/tasks/employee/${second.employeeId}`, unassignRefusal.status),
		armedMutationFailure(unassignRefusal.message),
		// the failed unassign is logged twice on the way: by the delete hook and by the removal that carried on
		// without it (`use-delete-task.ts:76`, `use-team-members-settings.ts:408`, both `logErrorInDev`)
		armedDevLog('Error deleting employee from tasks:', unassignRefusal.message),
		armedDevLog('Unassigning the removed member from the team tasks failed:', unassignRefusal.message)
	);
	armed.push(
		armedHttpError('PUT', loggedPathOf(teamPath), rosterRefusal.status),
		armedMutationFailure(rosterRefusal.message)
	);
	report('remove console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield, armed), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

test('13. deactivating a member', async ({ page, app, fixture, shield }) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const people = t.people();
	const mine = people[0];
	const admin = people[8];
	const member = people[3];
	const employeePath = `/api/employee/${member.employeeId}`;

	// never on one's own row, never on a workspace admin's (`member-access.ts:69-92`)
	await openRowMenu(page, mine.name);
	const mineItems = await menuTexts(page);
	report('my own menu', { items: mineItems });
	expect(
		mineItems.some((text) => text.includes(M.DEACTIVATE)),
		'never on oneself'
	).toBe(false);
	await closeMenu(page);

	await openRowMenu(page, admin.name);
	const adminItems = await menuTexts(page);
	report('admin menu', { items: adminItems });
	expect(
		adminItems.some((text) => text.includes(M.DEACTIVATE)),
		'never on a workspace admin'
	).toBe(false);
	await closeMenu(page);

	await openRowMenu(page, member.name);
	await page.getByRole('menuitem', { name: M.DEACTIVATE, exact: true }).click({ timeout: 15_000 });
	const dialog = confirmDialog(page, fill('DEACTIVATE_TITLE', { name: member.name }));
	await expect(dialog).toBeVisible();
	await expect(dialog.locator('li')).toHaveCount(4);
	await expect(dialog).toContainText(fill('DEACTIVATE_CONSEQUENCE_ACCESS', { name: member.name }));
	await expect(dialog).toContainText(M.DEACTIVATE_CONSEQUENCE_TEAMS);
	await expect(dialog).toContainText(M.DEACTIVATE_CONSEQUENCE_HISTORY);
	await expect(dialog).toContainText(M.DEACTIVATE_CONSEQUENCE_RESTORE);

	// Gauzy's "End Work": `PUT /employee/:id` with the moment the work ends (`employee.service.ts:151-168`)
	t.resetCalls();
	await dialog.getByRole('button', { name: M.DEACTIVATE, exact: true }).click({ timeout: 15_000 });
	const call = await t.waitForCall('PUT', employeePath);
	report('deactivate write', { body: call.body });
	const endWork = call.body?.endWork;
	expect(typeof endWork, 'the body names the moment the work ends').toBe('string');
	expect(Number.isFinite(Date.parse(String(endWork))), 'an instant the server can read').toBe(true);
	expect(call.body).toMatchObject({
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	});
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(memberRow(page, member.name)).toHaveCount(0);
	await expect(membersSection(page).locator('li')).toHaveCount(8);
	await expect(toastOf(page, fill('DEACTIVATED', { name: member.name }))).toBeVisible({ timeout: 20_000 });

	// the member is in the Inactive list, with the date the write carried
	await memberFilterTab(page, M.FILTER_INACTIVE).click({ timeout: 15_000 });
	await expect(inactiveRow(page, member.name)).toBeVisible();
	await expect(inactiveRow(page, member.name)).toContainText(
		fill('DEACTIVATED_ON', { date: dayOf(String(endWork)) })
	);

	// a refused one keeps the member active, with the reason in the dialog
	const refused = { status: 400, message: 'the employee could not be changed' };
	t.script.refuseEmployeePut = refused;
	const other = people[6];
	t.resetCalls();
	await memberFilterTab(page, M.FILTER_ACTIVE).click({ timeout: 15_000 });
	await openRowMenu(page, other.name);
	await page.getByRole('menuitem', { name: M.DEACTIVATE, exact: true }).click({ timeout: 15_000 });
	const otherDialog = confirmDialog(page, fill('DEACTIVATE_TITLE', { name: other.name }));
	await otherDialog.getByRole('button', { name: M.DEACTIVATE, exact: true }).click({ timeout: 15_000 });
	await t.waitForCall('PUT', `/api/employee/${other.employeeId}`);
	await expect(otherDialog.getByRole('alert')).toHaveText(EN.toasts.REASONS.INVALID);
	await expect(toastOf(page, fill('DEACTIVATE_FAILED', { name: other.name }))).toBeVisible({ timeout: 20_000 });
	await expect(memberRow(page, other.name)).toBeVisible();
	await otherDialog.getByRole('button', { name: EN.common.CANCEL, exact: true }).click({ timeout: 15_000 });
	await parkPointer(page);
	await expect(toastOf(page, fill('DEACTIVATED', { name: member.name }))).toHaveCount(0, { timeout: 30_000 });

	const armed = [
		armedHttpError('PUT', `/employee/${other.employeeId}`, refused.status),
		armedMutationFailure(refused.message)
	];
	report('deactivate console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield, armed), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

test('14. the Inactive filter and the restore of a member', async ({ page, app, fixture, shield }) => {
	const inactiveEmail = 'enzo@example.test';
	const t = await serveTeam(page, fixture, { rosterSize: 9, inactiveEmails: [inactiveEmail] });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const people = t.people();
	const restored = people.find((person) => person.email === inactiveEmail);
	if (!restored) {
		throw new Error(`the member this file moved to the inactive list (${inactiveEmail}) was not served`);
	}
	const served = t.inactive()[0];
	const employeePath = `/api/employee/${restored.employeeId}`;

	// the Active/Inactive switch needs ORG_EMPLOYEES_VIEW (`member-access.ts:39-41`), which the lane's fixture role
	// does not hold on its own — it is served through `scenario.extraPermissions` here
	await expect(page.getByRole('tablist', { name: M.FILTER_LABEL })).toHaveCount(1);
	await expect(memberFilterTab(page, M.FILTER_ACTIVE)).toHaveCount(1);
	await expect(memberFilterTab(page, M.FILTER_INACTIVE)).toHaveCount(1);
	await expect(membersSection(page).locator('li')).toHaveCount(8);

	await memberFilterTab(page, M.FILTER_INACTIVE).click({ timeout: 15_000 });
	const read = await t.waitForCall('GET', '/api/employee/pagination');
	report('inactive read', { path: read.path });
	await expect(inactiveList(page)).toHaveCount(1);
	await expect(inactiveList(page).locator('li')).toHaveCount(1);
	await expect(inactiveRow(page, restored.name)).toContainText(restored.email);
	// the date the store carries for the member whose work ended
	await expect(inactiveRow(page, restored.name)).toContainText(
		fill('DEACTIVATED_ON', { date: dayOf(String(served.employee.endWork ?? served.createdAt)) })
	);
	// the section's own count is still the active roster's (`members-section.tsx:376`), and one inactive member is
	// under `MIN_ROWS_FOR_SEARCH`, so the search field is gone in this view
	await expect(membersSection(page).locator('p')).toContainText(countText('MEMBERS_COUNT', 8));
	await expect(page.getByRole('searchbox')).toHaveCount(0);
	// the active roster is not rendered in this view at all (`members-section.tsx:389-399`), and the member is on the
	// page exactly once — inside the inactive list
	await expect(activeList(page)).toHaveCount(0);
	await expect(page.getByRole('listitem').filter({ hasText: restored.name })).toHaveCount(1);

	// a refused restore keeps the member in the list and names the reason
	const refused = { status: 400, message: 'the employee could not be changed' };
	t.script.refuseEmployeePut = refused;
	t.resetCalls();
	await inactiveList(page)
		.getByRole('button', { name: fill('RESTORE_MEMBER', { name: restored.name }) })
		.click({ timeout: 15_000 });
	await t.waitForCall('PUT', employeePath);
	await expect(toastOf(page, fill('RESTORE_FAILED', { name: restored.name }))).toBeVisible({ timeout: 20_000 });
	await expect(toastOf(page, EN.toasts.REASONS.INVALID)).toBeVisible({ timeout: 20_000 });
	await expect(inactiveRow(page, restored.name)).toBeVisible();

	// the restore is Gauzy's "Back to Work": `PUT /employee/:id` with `endWork: null`
	t.script.refuseEmployeePut = undefined;
	t.resetCalls();
	await inactiveList(page)
		.getByRole('button', { name: fill('RESTORE_MEMBER', { name: restored.name }) })
		.click({ timeout: 15_000 });
	const call = await t.waitForCall('PUT', employeePath);
	report('restore write', { body: call.body });
	expect(call.body).toMatchObject({
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		endWork: null
	});
	await expect(toastOf(page, fill('RESTORED', { name: restored.name }))).toBeVisible({ timeout: 20_000 });
	await expect(inactiveList(page)).toHaveCount(0);
	await expect(page.getByText(M.INACTIVE_EMPTY)).toBeVisible();

	await memberFilterTab(page, M.FILTER_ACTIVE).click({ timeout: 15_000 });
	await expect(membersSection(page).locator('li')).toHaveCount(9);
	await expect(memberRow(page, restored.name)).toBeVisible();

	const armed = [
		armedHttpError('PUT', loggedPathOf(employeePath), refused.status),
		armedMutationFailure(refused.message)
	];
	report('inactive console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield, armed), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});

test('15. two members made managers one after the other, the first answer held', async ({
	page,
	app,
	fixture,
	shield
}) => {
	const t = await serveTeam(page, fixture, { rosterSize: 9 });
	await app(PAGE_PATH, { scenario: MANAGER_SCENARIO });
	const first = t.people()[3];
	const second = t.people()[6];
	const teamPath = teamPathOf(fixture);

	// the answer of the first team write is held by a promise the test releases: the second change is made while the
	// page has heard nothing of the first one
	const releaseFirstWrite = t.holdNextTeamWrite();
	let firstBody: { memberIds: string[]; managerIds: string[] } | null = null;
	let secondBody: { memberIds: string[]; managerIds: string[] } | null = null;
	try {
		await roleButton(page, first.name, M.ROLE_MEMBER).click({ timeout: 15_000 });
		await page.getByRole('menuitem', { name: M.ROLE_MANAGER_HINT }).click({ timeout: 15_000 });
		firstBody = (await t.waitForCall('PUT', teamPath)).body as { memberIds: string[]; managerIds: string[] };
		// the first change is on the row at once, as an optimistic override (`use-team-members-settings.ts:377-378`)
		await expect(roleButton(page, first.name, M.ROLE_MANAGER)).toHaveCount(1);

		await roleButton(page, second.name, M.ROLE_MEMBER).click({ timeout: 15_000 });
		await page.getByRole('menuitem', { name: M.ROLE_MANAGER_HINT }).click({ timeout: 15_000 });
		secondBody = (await t.waitForCallCount('PUT', teamPath, 2)).body as {
			memberIds: string[];
			managerIds: string[];
		};
	} finally {
		releaseFirstWrite();
	}

	report('first write', { managerIds: firstBody?.managerIds, memberIds: firstBody?.memberIds });
	report('second write', { managerIds: secondBody?.managerIds, memberIds: secondBody?.memberIds });
	expect(firstBody?.managerIds).toContain(first.employeeId);
	expect(firstBody?.managerIds).not.toContain(second.employeeId);
	expect(secondBody?.managerIds, 'the second member joins the managers').toContain(second.employeeId);
	expect(secondBody?.managerIds).toContain(t.people()[0].employeeId);
	expect(secondBody?.memberIds).toHaveLength(9);
	// the second roster is built from the team data as the page last read it, so it carries its own change only:
	// `rosterWithRole(teamRosterOf(team.members ?? [], isTeamManagerMember), …)` at
	// `use-team-members-settings.ts:381-383` + `core/lib/utils/settings-team.ts:159-184`, where `team` is
	// `getActiveTeam()` (`core/hooks/organizations/teams/use-get-active-team.ts:13`)
	expect(secondBody?.managerIds, 'the first change is not in the second roster').not.toContain(first.employeeId);

	// what the team holds after both writes and the released answer, once the page read the team again
	const secondWrite = t.calls.filter((call) => call.method === 'PUT' && call.path === teamPath)[1];
	await expect.poll(() => teamReadAfter(t, secondWrite, teamPath), { timeout: 30_000 }).toBe(true);
	const stored = t.members().find((member) => member.employeeId === first.employeeId);
	report('after the release', {
		storedFirstIsManager: stored?.isManager ?? null,
		storedSecondIsManager: t.members().find((member) => member.employeeId === second.employeeId)?.isManager ?? null,
		firstRowRole: await roleButton(page, first.name, M.ROLE_MANAGER)
			.count()
			.then((count) => (count === 1 ? 'Manager' : 'other')),
		secondRowRole: await roleButton(page, second.name, M.ROLE_MANAGER)
			.count()
			.then((count) => (count === 1 ? 'Manager' : 'other'))
	});
	expect(stored?.isManager, 'the second write took the first member out of the managers').toBe(false);
	// while the row still prints the first member as a manager: the label is the optimistic `roleOverrides` entry,
	// taken back on an error only (`use-team-members-settings.ts:386-388`), not the roster the server kept
	await expect(roleButton(page, first.name, M.ROLE_MANAGER)).toHaveCount(1);
	await expect(roleButton(page, second.name, M.ROLE_MANAGER)).toHaveCount(1);
	await expect(membersSection(page).locator('li')).toHaveCount(9);
	await parkPointer(page);
	await expect(toastOf(page, EN.toasts.teams.MEMBER_NOT_SAVED)).toHaveCount(0, { timeout: 30_000 });

	report('two writes console', { errors: shield.consoleErrors() });
	expect(consoleFindings(shield), `console: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
});
