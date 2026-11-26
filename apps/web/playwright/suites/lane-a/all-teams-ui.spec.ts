import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page, Route } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Every team a manager manages, on one page: what `/all-teams` prints and what the browser really reads, on lane-a
 * (app `http://localhost:3031`, mock `http://127.0.0.1:3992`, control `3994`; `playwright/test-servers.ts:38`).
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `app/[locale]/(main)/(teams)/all-teams/page.tsx` → `core/components/pages/teams/all-teams/page-component.tsx`:
 *   `withAuthentication(AllTeamsPage, …)` `:95-98`; the skeleton while teams are unknown `:42-44`;
 *   **fewer than two managed teams sends the person to `/`** `:49` (`RedirectUser` `:87-93` is `router.push('/')` in a
 *   `useEffect` and renders nothing); the heading `t('common.ALL_TEAMS')` `:31`, `:70`; `<HeaderTabs />` `:72`;
 *   `<MemberFilter />` `:73`; the CARDS-only column header `:78`; the members `:82`.
 * - `core/hooks/organizations/teams/use-organization-teams-managers.ts`: `userManagedTeams` = the teams whose members
 *   include a row `member.employee.user.id === user.id && member.role.name === 'MANAGER'` `:22-30`; `filteredTeams`
 *   keeps, per team, the members whose `timerStatus` is `pause` / `running` / `suspended`, or whose
 *   `employee.acceptDate` is set for `invited` `:42-66`. Teams themselves are never dropped by a filter and never
 *   sorted (`:43`, `:46-65`).
 * - `core/components/pages/teams/all-teams/header-tabs.tsx:9-12` — the two options `TEAMS` → `IssuesView.CARDS` and
 *   `COMBINE` → `IssuesView.BLOCKS`, each an icon-only `role="tab"` named by `t('common.TEAMS')` / `t('common.COMBINE')`
 *   inside a `role="tablist"` named by `t('common.VIEW')` (`core/components/common/segmented-control.tsx:118-163`).
 *   The view is the in-memory `allTeamsHeaderTabs` atom (`core/stores/common/header-tabs.ts`), not storage or a query.
 * - CARDS: `all-teams-members-views/all-teams-members-card-view.tsx:11-52` — one `AccordionItem` per managed team,
 *   all open by default (`defaultValue={teams.map((t) => t.name)}` `:14`), the trigger printing `team.name` plus the
 *   member-count chip `:19-20`, the body a `<ul>` of `UserTeamCard` rows `:24-39`, and the empty panel copy at
 *   `:41-45`. Row: `users-teams-card/user-card.tsx:31-90` (name/email link, active task, task times, estimate,
 *   today-worked, row menu).
 * - BLOCKS: `all-teams-members-views/all-teams-members-block-view.tsx:10-49` — all members of all teams flattened,
 *   grouped by `employeeId` (`:18-31`), one `UserTeamBlockCard` per employee `:37-39`, its own empty copy `:43-46`.
 *   Block: `users-teams-block/member-block.tsx:26-62` — name link, status chip, total-worked-today, then one section
 *   per team with the team name, its active task and its times/estimate.
 * - Filter: `all-teams-members-views/all-team-members-filter.tsx:58-128` — a `Select` whose five option labels
 *   `"All" / "Working now" / "Paused" / "Off" / "Invited"` are hard-coded English `:59-64` (the value of `invited` is
 *   not a timer status at all, `:63`); picking one writes the in-memory `filterValue` atom
 *   (`core/stores/teams/all-teams.ts:4-8`).
 * - The teams are the shell's own reads, not this page's: `core/components/layouts/app/init-state.tsx:110-116` mounts
 *   `useOrganizationTeamsQuery` with a scope, and `core/hooks/organizations/teams/use-organization-teams-query.ts:218-246`
 *   sends `GET /api/organization-team` (list) and `GET /api/organization-team/<activeTeam>` (detail), which
 *   `:256-280` writes into `organizationTeamsState` — the atom this page reads (`page-component.tsx:26`).
 * - Where the printed figures come from: `core/components/tasks/task-times.tsx:34` (`TaskTimes`) and `:221-228`
 *   (`TodayWorkedTime`) take the member by **id from the active team** (`useActiveTeamMember`), so a member row of a
 *   team that is not the tab's active team prints `0h 0m` for the same employee. Measured; see Findings.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's NextAuth stub and the app's shell (`init-state.tsx`), the mock's `/api/user/me` for the fixture
 * person, its task answer `GET /api/tasks/<id>` (`cypress/support/mock-gauzy-server.mjs:668-669`, which every row with
 * an `activeTaskId` asks for, `users-teams-card/user-card.tsx:102-113`), its timer status `:749` and its
 * role/permission answers. Test 9 arms a 500 for the list read through the stub; test 10 runs with **no stub at all**
 * and pins what the mock's own fixture renders.
 *
 * **Served by this file:** the two managed teams and their members, with `page.route` on the mock origin for
 * `GET /api/organization-team` and `GET /api/organization-team/<id>` (the mock answers exactly one fixture team there,
 * `mock-gauzy-server.mjs:655-656`, and its member role name is `ADMIN` — or `EMPLOYEE` for `scenario.manager: false`,
 * or an upper-case `scenario.roleName` override — never `MANAGER`, `:70-77`, while its own manager flag is a separate
 * field `isManager` `:204`, `:218`; so the page cannot be reached through the mock as it is, see test 10). Each served
 * answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`) and answers `OPTIONS` with 204, the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:227-345`; `route.fetch()` is never called, so the mock's own log stays
 * empty for those paths and the record of what the browser asked is this file's own `reads` list.
 *
 * ## Where each pinned number came from
 *
 * The throwaway probes in `D:\Coding\.tmp\probe-allteams\` (`probe1` … `probe7`, all run on this lane on 2026-11-26,
 * logs `D:\Coding\.tmp\s3-lane-a-allteams-probe1.log` … `…-probe7.log`): `probe1` P1 the CARDS render, `probe2` T2
 * expand/collapse, T3 the COMBINE view, T6 one managed team, T7 a non-manager, T8 a refused list, T9 the mock's own
 * fixture, `probe3` U1 the filter in both views, U3 the member link, U4 both empty copies, U5 the 500 (page, console,
 * page errors), `probe4` V1 the header/triggers/links, V3 a block card as a container, `probe6` X1 the closed panel's
 * lifecycle and the reopened rows, X2 each column label as printed, `probe7` Z1 every block card under every filter
 * value and Z2 the trigger of a team the filter emptied. Every value pinned below is one those runs printed, and this
 * file's own lane runs then confirmed them (logs `D:\Coding\.tmp\s3-lane-a-allteams-<n>.log`). Times are served
 * relative to now and only as durations, so nothing here depends on today's date or on the browser's zone; the
 * labels are read at the lane's 1280×720 viewport (`playwright/playwright.lane.config.ts`).
 *
 * ## Hard-coded English this page prints (measured as printed, not i18n keys)
 *
 * - the five filter option labels `All` / `Working now` / `Paused` / `Off` / `Invited` (`all-team-members-filter.tsx:59-64`)
 *   and the filter's tooltip label `Filter` (`:76`); the trigger and each option wrap the label in a `capitalize` div
 *   (`:85`, `:117`), so `Working now` is the DOM text Playwright matches and `Working Now` the rendered one — test 4
 *   pins both forms per option;
 * - the CARDS empty panel `There is no member for filtered value in the team <name>` (`all-teams-members-card-view.tsx:42-43`);
 * - the BLOCKS empty copy `There is no member for filtered value` (`all-teams-members-block-view.tsx:44`);
 * - a block section with no served task prints `No active task` (`users-teams-block/user-team-active-task.tsx:30`),
 *   while a card row with none prints `--` (`users-teams-card/user-team-active-task.tsx:37`).
 * No comment, type or unit test says these should be translated, so they are written as measured (untagged). The
 * column header's `task time` IS a key (`dailyPlan.TASK_TIME`, `locales/en.json:3284`) and is the one label whose **printed**
 * form differs from its key: the span carries Tailwind's `capitalize` (`team-members-header.tsx:40`), so the DOM text is
 * the key's value (which is what `getByText` matches) while `innerText` reads `Task Time` — the case change is CSS
 * `text-transform`, not a string change (`…-probe6.log` X2 matched `task time` and printed `Task Time`).
 *
 * ## Findings (each one measured, each one quoted where it comes from)
 *
 * 1. **A CARDS row's time columns are not a reading of its own member row.** Both of the manager's rows were served
 *    the same `totalTodayTasks: [{ id: task, duration: 3600 }]`, yet the row of the tab's **active** team prints
 *    `Today 1h 0m … Estimated 1h 1h 0m` and the row of the other team `Today 0h 0m … Estimated 1h 0h 0m`: the columns
 *    re-fetch the member **by id from the active team** (`core/components/tasks/task-times.tsx:34`
 *    `useActiveTeamMember(memberInfo?.member?.id, memberInfo?.id)`, `:221-228` `TodayWorkedTime`). The estimate does
 *    follow the served task. Test 1 pins both spellings.
 * 2. **BLOCKS dedupes by employee, CARDS does not.** 5 served member rows → 5 `<li>` in two teams, but 4 block cards,
 *    the manager once with two team sections (`all-teams-members-block-view.tsx:18-31`, `:37-39`). A filter drops
 *    members and never a team (`use-organization-teams-managers.ts:46-65`), so the manager's single block keeps both
 *    sections under `Working now` (test 4).
 * 3. **A block chip's label is computed, not served.** A member served `timerStatus: 'suspended'` gets the chip
 *    `Not working`: `users-teams-block/member-block.tsx:29` always calls `getTimerStatusValue(timerStatus, member, true)`,
 *    and the SUSPENDED branch needs `!employee?.isActive && !publicTeam` (`core/components/timer/timer-status.tsx:96`),
 *    so it can never fire for a public team; the row falls through `isTracking` (`:117`) and `isOnline` (`:148`) to
 *    `isIdle` = no `totalTodayTasks` (`:133`, `:153-155`) → `common.NOT_WORKING` (`member-status-chip.tsx:29-34`).
 *    The chip's comment ("The suspended state has no translated label yet, so it renders nothing here", `:22-23`) is
 *    never reached on this page, so nothing here contradicts it — but the CARDS `Off` filter value (`:56-58` of the
 *    hook, which compares the **served** `timerStatus`) and the printed chip are two different readings of one row.
 * 4. **Closing a team takes its panel and its member list out of the DOM.** `aria-expanded` flips true → false → true
 *    and the panel is `data-closed` for a moment (~700 ms, `…-probe6.log` X1 `closed t1` still counted 3 rows) before
 *    Base UI unmounts it (`closed t2` onward: 1 panel, 0 `<ul>`, 0 `<li>`); reopening re-mounts it with the same rows
 *    (`core/components/common/accordion.tsx:67-73`). Test 2 pins `toBeHidden()` plus `toHaveCount(0)` for exactly that
 *    settled state — a `height: 0` pin would be wrong, the collapsed box is 8 px of wrapper padding while it is alive
 *    (`accordion.tsx:65`, `all-teams-members-card-view.tsx:25`).
 * 5. **The page offers no way into a team.** The whole `main a` list is the breadcrumb (`/`, `/all-teams`) and one
 *    `/profile/<userId>?name=<First Last>` per member row (`user-team-card/user-info.tsx:39-40`,
 *    `users-teams-block/user-info.tsx:33-34`); the team name is a `<span>` inside the accordion `<button>`
 *    (`all-teams-members-card-view.tsx:19`) and a plain `<div>` in a block (`member-block.tsx:48`). Test 6.
 * 6. **A refused team list never leaves the page for `/`.** With the list armed 500 the teams stay "unknown", so
 *    `page-component.tsx:40-44` keeps the skeleton and `:49` never runs; the shell's own `criticalReady` waits for the
 *    same read (`core/components/layouts/app/init-state.tsx:263-272`), so test 9 visits with `requireShell: false`.
 *    The query **retried** the refused read, which logged the armed refusal twice and still sent only the list read
 *    (measured in `…-s3-lane-a-allteams-2.log`), so test 9 pins the kind of console line rather than its count.
 *
 * ## What this page cannot be made to show (measured, so it is written here instead of forced)
 *
 * - **A managed team with no members.** `userManagedTeams` only counts a team whose members include this person's row
 *   with role `MANAGER` (`use-organization-teams-managers.ts:22-30`), so a managed team is never memberless; the CARDS
 *   and BLOCKS empty copies are reachable only through a filter, which is how test 5 is written.
 * - **Clicking a team** (the brief's item 6, second half): there is no team link to click — finding 5.
 * - **`/all-teams` served by the mock's own fixture**: the mock answers one team (`mock-gauzy-server.mjs:655`) and its
 *   member role name is `ADMIN`/`EMPLOYEE`, never `MANAGER` (`:70-77`), so the person manages 0 teams and the page
 *   redirects. Test 10 pins that as measured (untagged: the gate does what its own doc comment says; the gap is in the
 *   mock's data, whose member row says `isManager: true` but whose role name is not `MANAGER`).
 * - **The `invited` filter's own employee id**: the fixture has no invited employee, so this file invents
 *   `INVITED_EMPLOYEE_ID` / `INVITED_USER_ID` and serves an `acceptDate` relative to now (`:60-64` of the hook).
 *
 * ## What this file does not cover
 *
 * The row/block menus and any action they open, starting or stopping a timer from this page, the row menu's task
 * assignment, the team detail refresh poll (60 s, `core/lib/utils/team-detail-refresh.ts:2` — the quiet window of
 * test 4 is 1.5 s and proves only that the pick itself sent nothing), the `allTeamsHeaderTabs`/`filterValue` atoms
 * surviving a reload (they are in memory, `core/stores/common/header-tabs.ts`, `core/stores/teams/all-teams.ts:4-8`),
 * other viewports (the column labels are read at 1280×720), the shell's profile-time-zone banner (it names this
 * machine's zone, `Europe/Madrid`, and is asserted nowhere), and anything below a member link (the profile page is
 * `suites/lane-a/member-profile-ui.spec.ts`).
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const ALL_TEAMS_PATH = '/all-teams';
const TEAMS_LIST_ROUTE = '/api/organization-team';
const teamsDetailRoute = (id: string) => `/api/organization-team/${id}`;

/** `locales/en.json`, read by key: the copy this page renders through `useTranslations`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: Record<string, string>;
	dailyPlan: Record<string, string>;
	pages: { home: { BREADCRUMB: string } };
};

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a all-teams] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const answerJson = (route: Route, status: number, body: unknown) =>
	route.fulfill({
		status,
		headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
		body: body === undefined ? '' : JSON.stringify(body)
	});

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Text of every match, read in Node one element at a time (a browser callback cannot see `flat`). */
const textsOf = async (locator: Locator) => {
	const count = await locator.count();
	const out: string[] = [];
	for (let i = 0; i < count; i += 1) out.push(flat(await locator.nth(i).innerText()));
	return out;
};

const hrefsOf = async (locator: Locator) =>
	locator.evaluateAll((nodes) => nodes.map((node) => String(node.getAttribute('href'))));

/** React's dev-mode store warning, not this page's (`chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The client's own HTTP error line for a refusal this file armed (`core/services/client/api.service.ts` `logError`). */
const armedHttpError = (verb: string, pathFragment: string, status: number) =>
	new RegExp(`\\[ERROR\\] \\[HttpClient\\] HTTP Error: ${verb} \\S*${pathFragment}\\S* ${status}`);

const consoleFindings = (shield: Shield, expected: RegExp[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((pattern) => pattern.test(line)));

/* ------------------------------------------------------------------ served teams */

/** An employee id this file invents for the invited member; the fixture has no invited employee. */
const INVITED_EMPLOYEE_ID = '55555555-5555-4555-8555-400000000004';
const INVITED_USER_ID = '44444444-4444-4444-8444-400000000004';

/** `teamStatusValues` served on a member row: the only thing the filter reads (`use-organization-teams-managers.ts:46-64`). */
type ServedMember = {
	id: string;
	employee: Record<string, unknown>;
	manager: boolean;
	timerStatus: string | null;
	activeTaskId: string | null;
	todaySeconds: number | null;
};

const employeeOf = (
	ids: Record<string, string>,
	employeeId: string,
	userId: string,
	name: string,
	email: string,
	extra: Record<string, unknown> = {}
) => ({
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
	tenantId: ids.tenantA,
	...extra
});

/**
 * One managed team, in the shape the mock's own `buildData` answers (`mock-gauzy-server.mjs:236-256`), so
 * `organizationTeamSchema` (`core/types/schemas/team/organization-team.schema.ts:92-93`) accepts it. `managers` follows
 * the rows flagged `manager`, the way the mock builds it (`:245`).
 */
const teamOf = (
	ids: Record<string, string>,
	teamId: string,
	teamName: string,
	members: ServedMember[],
	task: Record<string, unknown>
) => {
	const memberRows = members.map((member) => ({
		id: member.id,
		employeeId: member.employee.id,
		employee: member.employee,
		user: (member.employee as { user: unknown }).user,
		isManager: member.manager,
		isActive: true,
		isTrackingEnabled: true,
		activeTaskId: member.activeTaskId,
		activeTask: null,
		organizationTeamId: teamId,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		roleId: ids.role,
		role: {
			id: ids.role,
			name: member.manager ? 'MANAGER' : 'EMPLOYEE',
			isSystem: true,
			rolePermissions: [],
			tenantId: ids.tenantA
		},
		totalWorkedTasks: [],
		totalTodayTasks: member.todaySeconds === null ? [] : [{ id: ids.task, duration: member.todaySeconds }],
		...(member.timerStatus === null ? {} : { timerStatus: member.timerStatus })
	}));
	return {
		id: teamId,
		name: teamName,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		public: true,
		profile_link: 'fixture-team',
		prefix: teamName.slice(0, 3).toUpperCase(),
		shareProfileView: false,
		requirePlanToTrack: false,
		members: memberRows,
		managers: memberRows.filter((row) => row.isManager),
		projects: [
			{
				id: ids.project,
				name: 'Fixture Project',
				public: true,
				owner: null,
				code: 'FIX',
				currency: 'USD',
				organizationId: ids.organizationA,
				tenantId: ids.tenantA,
				members: [],
				teams: [],
				tags: []
			}
		],
		tasks: [task],
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
				organizationTeamId: teamId
			}
		]
	};
};

type ServedTeam = ReturnType<typeof teamOf>;

type TeamsHarness = {
	/** Every call the browser made to the mock origin for a team, in the order it sent it. */
	teamReads: () => string[];
	/** Every call the browser made to the mock origin, `METHOD path`. */
	allReads: () => string[];
};

/**
 * This file's stand-in for the team API, on the mock origin, because the mock answers its own single fixture team
 * there (see the header). The list answer is always the current store; `failList` arms a refusal for the list read.
 */
async function serveTeams(page: Page, teams: ServedTeam[], options: { failList?: number } = {}): Promise<TeamsHarness> {
	const browserCalls: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN) browserCalls.push(`${request.method()} ${url.pathname}`);
	});

	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === TEAMS_LIST_ROUTE || Boolean(url.pathname.match(/^\/api\/organization-team\/[^/]+$/))),
		async (route) => {
			const request = route.request();
			const pathname = new URL(request.url()).pathname;
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			if (pathname === TEAMS_LIST_ROUTE) {
				if (options.failList) {
					return answerJson(route, options.failList, {
						statusCode: options.failList,
						message: 'this file armed the team list refusal'
					});
				}
				return answerJson(route, 200, { items: teams, total: teams.length });
			}
			const id = pathname.slice(TEAMS_LIST_ROUTE.length + 1);
			const team = teams.find((item) => item.id === id);
			if (!team) return answerJson(route, 404, { statusCode: 404, message: `no served team ${id}` });
			return answerJson(route, 200, team);
		}
	);

	const isTeamRead = (line: string) => {
		const [, path] = line.split(' ');
		return path === TEAMS_LIST_ROUTE || Boolean(path.match(/^\/api\/organization-team\/[^/]+$/));
	};
	return {
		teamReads: () => browserCalls.filter(isTeamRead),
		allReads: () => [...browserCalls]
	};
}

/** The mock's own task object, read from the mock in Node: the rows' `activeTaskId` is answered by the mock itself. */
async function mockTask(): Promise<Record<string, unknown>> {
	const listed = (await (await fetch(`${MOCK_ORIGIN}${TEAMS_LIST_ROUTE}`)).json()) as {
		items: Array<Record<string, unknown>>;
	};
	return (listed.items[0].tasks as Array<Record<string, unknown>>)[0];
}

/* ------------------------------------------------------------------ the served scenario */

const TEAM_ALPHA = 'Served Alpha Team';
const TEAM_BETA = 'Served Beta Team';
/** The signed-in fixture person, seen as a member row. */
const MANAGER_NAME = 'Fixture Manager';
const MANAGER_EMAIL = 'manager@example.test';
const PAUSED_NAME = 'Served Paused Member';
const PAUSED_EMAIL = 'paused@served.test';
const OFF_NAME = 'Served Off Member';
const OFF_EMAIL = 'off@served.test';
const INVITED_NAME = 'Fixture Invited Member';
const INVITED_EMAIL = 'invited@example.test';
/** The mock's own task title (`names.task`), which the mock answers for any `GET /api/tasks/<id>`. */
const TASK_TITLE = 'Fixture active task';

const memberRowId = (team: 'a' | 'b', index: number) => `66666666-6666-4666-8666-${team}0000000000${index}`;

/**
 * The two managed teams: Alpha = the manager (timer served running, 1 h worked today) + a paused member + an off
 * member; Beta = the same manager again (same employee, another member row) + a member with an `acceptDate` and no
 * task. Every name, email and duration below is one a probe printed (`…-probe3.log`, `…-probe6.log`).
 */
async function managedTeams(fixture: BootstrapFixture) {
	const { ids } = fixture;
	const task = await mockTask();
	const manager = employeeOf(ids, ids.employee, ids.user, MANAGER_NAME, MANAGER_EMAIL);
	const paused = employeeOf(ids, ids.teammateEmployee, ids.teammateUser, PAUSED_NAME, PAUSED_EMAIL);
	const off = employeeOf(ids, ids.deniedEmployee, ids.deniedUser, OFF_NAME, OFF_EMAIL);
	const invited = employeeOf(
		ids,
		INVITED_EMPLOYEE_ID,
		INVITED_USER_ID,
		INVITED_NAME,
		INVITED_EMAIL,
		// `invited` filters on `employee.acceptDate` (`use-organization-teams-managers.ts:60-64`); served relative to now
		{ acceptDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
	);
	return {
		ids,
		task,
		manager,
		teams: [
			teamOf(
				ids,
				ids.teamA,
				TEAM_ALPHA,
				[
					{
						id: memberRowId('a', 1),
						employee: manager,
						manager: true,
						timerStatus: 'running',
						activeTaskId: ids.task,
						todaySeconds: 3_600
					},
					{
						id: memberRowId('a', 2),
						employee: paused,
						manager: false,
						timerStatus: 'pause',
						activeTaskId: null,
						todaySeconds: null
					},
					{
						id: memberRowId('a', 3),
						employee: off,
						manager: false,
						timerStatus: 'suspended',
						activeTaskId: null,
						todaySeconds: null
					}
				],
				task
			),
			teamOf(
				ids,
				ids.teamB,
				TEAM_BETA,
				[
					{
						id: memberRowId('b', 1),
						employee: manager,
						manager: true,
						timerStatus: 'running',
						activeTaskId: ids.task,
						todaySeconds: 3_600
					},
					{
						id: memberRowId('b', 2),
						employee: invited,
						manager: false,
						timerStatus: null,
						activeTaskId: null,
						todaySeconds: null
					}
				],
				task
			)
		] as ServedTeam[]
	};
}

/* ------------------------------------------------------------------ page readers */

/** The accordion group of one served team: its trigger, its panel, its member rows. */
const teamGroup = (page: Page, teamName: string) =>
	page.locator('[data-slot="accordion-item"]').filter({ hasText: teamName }).first();
const groupTrigger = (page: Page, teamName: string) =>
	teamGroup(page, teamName).locator('[data-slot="accordion-trigger"]');
const groupPanel = (page: Page, teamName: string) =>
	teamGroup(page, teamName).locator('[data-slot="accordion-content"]');
const groupRows = (page: Page, teamName: string) => teamGroup(page, teamName).locator('ul li');

/**
 * One block card of the COMBINE view: the container `users-teams-block/member-block.tsx:33` builds around each
 * member link (its class carries `flex-col`; no inner element of a block does).
 */
const blockCards = (page: Page) =>
	page.locator('main a[href*="/profile/"]').locator('xpath=ancestor::div[contains(@class,"flex-col")][1]');

const filterTrigger = (page: Page) => page.locator('[data-slot="select-trigger"]');
const filterPopup = (page: Page) => page.locator('[data-slot="select-content"]');

/** Opens the filter and picks one option by its raw (un-capitalized) label. */
async function pickFilter(page: Page, rawLabel: string) {
	await filterTrigger(page).click({ timeout: 15_000 });
	const popup = filterPopup(page);
	await expect(popup).toBeVisible();
	await popup.getByText(rawLabel, { exact: true }).first().click({ timeout: 15_000 });
	await expect(filterPopup(page)).toBeHidden();
}

const viewTab = (page: Page, name: string) => page.getByRole('tab', { name });

/** Signs the fixture person in on a page whose team reads this file answers, and waits for the first one. */
async function openAllTeams(
	page: Page,
	fixture: BootstrapFixture,
	teams: ServedTeam[],
	options: { requireShell?: boolean; failList?: number } = {}
) {
	const harness = await serveTeams(page, teams, { failList: options.failList });
	await signInAndVisit(page, fixture, ALL_TEAMS_PATH, { requireShell: options.requireShell });
	await expect.poll(() => harness.teamReads().length, { timeout: 30_000 }).toBeGreaterThan(0);
	return harness;
}

/* ------------------------------------------------------------------ the tests */

test('1. a manager of two served teams, CARDS view: header, tabs, groups, rows, links, reads', async ({
	page,
	fixture,
	shield
}) => {
	const { teams } = await managedTeams(fixture);
	const harness = await openAllTeams(page, fixture, teams);

	report('1 loaded', { url: new URL(page.url()).pathname, served: [TEAM_ALPHA, TEAM_BETA] });
	await expect(page).toHaveURL(new URL(`${APP_ORIGIN}${ALL_TEAMS_PATH}`).href);

	// the page's own heading and breadcrumb (`page-component.tsx:31-35`, `:70`)
	await expect(page.getByRole('heading', { level: 1, name: EN.common.ALL_TEAMS })).toBeVisible();
	const breadcrumb = await textsOf(page.locator('main a[href="/"], main a[href="/all-teams"]'));
	expect(breadcrumb).toEqual([JSON.parse(EN.pages.home.BREADCRUMB)[0], EN.common.ALL_TEAMS]);

	// the view switch: `Teams` selected, `Combine` not (`header-tabs.tsx:9-12`, `segmented-control.tsx:137-149`)
	const teamsTab = viewTab(page, EN.common.TEAMS);
	await expect(page.locator('[role="tablist"]')).toHaveAttribute('aria-label', EN.common.VIEW);
	await expect(teamsTab).toHaveAttribute('aria-selected', 'true');
	await expect(teamsTab).toHaveAttribute('tabindex', '0');
	await expect(viewTab(page, EN.common.COMBINE)).toHaveAttribute('aria-selected', 'false');
	await expect(viewTab(page, EN.common.COMBINE)).toHaveAttribute('tabindex', '-1');

	// the filter, unopened, on its default option (`all-team-members-filter.tsx:59`, `:84-96`)
	await expect(filterTrigger(page)).toHaveRole('combobox');
	await expect(filterTrigger(page)).toContainText('All');

	// the CARDS column labels, visible at the lane's 1280×720 viewport (`member-row-grid.ts:29` `hidden xl:block`);
	// read here by their raw key text, because `capitalize` prints `task time` as `Task Time`
	const columnLabels = [
		`${EN.common.TEAM} ${EN.common.MEMBER}`,
		EN.common.TASK,
		EN.dailyPlan.TASK_TIME,
		EN.common.ESTIMATE,
		EN.dailyPlan.TOTAL_TODAY
	];
	for (const label of columnLabels) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
	report('1 column labels printed', { printed: await textsOf(page.getByText(columnLabels[2], { exact: true })) });

	// both teams are open by default (`all-teams-members-card-view.tsx:14`), each trigger printing name + member count
	await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(2);
	// each trigger prints the team name and its member count (`all-teams-members-card-view.tsx:19-20`)
	expect(await textsOf(groupTrigger(page, TEAM_ALPHA))).toEqual([`${TEAM_ALPHA} 3`]);
	expect(await textsOf(groupTrigger(page, TEAM_BETA))).toEqual([`${TEAM_BETA} 2`]);
	await expect(groupTrigger(page, TEAM_ALPHA)).toHaveAttribute('aria-expanded', 'true');
	await expect(groupPanel(page, TEAM_ALPHA)).toBeVisible();
	await expect(groupPanel(page, TEAM_BETA)).toBeVisible();

	// every member row exactly as printed
	const alphaRows = await textsOf(groupRows(page, TEAM_ALPHA));
	const betaRows = await textsOf(groupRows(page, TEAM_BETA));
	report('1 rows', { alphaRows, betaRows });
	expect(alphaRows).toEqual([
		`F ${MANAGER_NAME} ${MANAGER_EMAIL} # ${TASK_TITLE} Open Today 1h 0m Total 0h 0m Estimated 1h 1h 0m`,
		`S ${PAUSED_NAME} ${PAUSED_EMAIL} -- Today 0h 0m Total 0h 0m Estimated - 0h 0m`,
		`S ${OFF_NAME} ${OFF_EMAIL} -- Today 0h 0m Total 0h 0m Estimated - 0h 0m`
	]);
	// the same employee in the team that is not this tab's active one: the time columns read the active team's row
	// (`task-times.tsx:34`, `:221-228`), so its 1 h shows up only under `Served Alpha Team`
	expect(betaRows).toEqual([
		`F ${MANAGER_NAME} ${MANAGER_EMAIL} # ${TASK_TITLE} Open Today 0h 0m Total 0h 0m Estimated 1h 0h 0m`,
		`F ${INVITED_NAME} ${INVITED_EMAIL} -- Today 0h 0m Total 0h 0m Estimated - 0h 0m`
	]);

	// every link the page offers: the breadcrumb and each member's profile (`user-team-card/user-info.tsx:39-40`)
	const links = (await hrefsOf(page.locator('main a'))).sort();
	report('1 links', { links });
	expect(links).toEqual(
		[
			'/',
			'/all-teams',
			`/profile/${fixture.ids.user}?name=${MANAGER_NAME}`,
			`/profile/${fixture.ids.user}?name=${MANAGER_NAME}`,
			`/profile/${fixture.ids.teammateUser}?name=${PAUSED_NAME}`,
			`/profile/${fixture.ids.deniedUser}?name=${OFF_NAME}`,
			`/profile/${INVITED_USER_ID}?name=${INVITED_NAME}`
		].sort()
	);

	// the reads one load sends, compared sorted (`use-organization-teams-query.ts:218-246`)
	const reads = teamReadsOf(harness);
	report('1 reads', { reads, totalTeamReads: harness.teamReads().length, allMockCalls: harness.allReads().length });
	expect(reads).toEqual(expectedLoadReads(fixture.ids.teamA));

	expect(shield.pageErrors()).toEqual([]);
	expect(consoleFindings(shield)).toEqual([]);
});

test('2. closing and reopening one team: what hides and what stays', async ({ page, fixture }) => {
	const { teams } = await managedTeams(fixture);
	await openAllTeams(page, fixture, teams);
	const alphaTrigger = groupTrigger(page, TEAM_ALPHA);
	const alphaPanel = groupPanel(page, TEAM_ALPHA);
	const alphaRows = groupRows(page, TEAM_ALPHA);

	// open by default: both panels, 3 + 2 rows
	await expect(alphaRows).toHaveCount(3);
	await expect(groupRows(page, TEAM_BETA)).toHaveCount(2);

	await alphaTrigger.click({ timeout: 15_000 });
	await expect(alphaTrigger).toHaveAttribute('aria-expanded', 'false');
	// the panel (and with it its whole member list) leaves the DOM once the closing animation ends; the rows are not
	// merely clipped (`accordion.tsx:67-73` renders the panel, Base UI unmounts it when closed)
	await expect(alphaPanel).toBeHidden();
	await expect(alphaRows).toHaveCount(0);
	report('2 closed', {
		alphaRows: await alphaRows.count(),
		alphaPanelCount: await groupPanel(page, TEAM_ALPHA).count(),
		betaRows: await groupRows(page, TEAM_BETA).count(),
		betaExpanded: await groupTrigger(page, TEAM_BETA).getAttribute('aria-expanded')
	});
	// the other team is untouched
	await expect(groupTrigger(page, TEAM_BETA)).toHaveAttribute('aria-expanded', 'true');
	await expect(groupRows(page, TEAM_BETA)).toHaveCount(2);

	await alphaTrigger.click({ timeout: 15_000 });
	await expect(alphaTrigger).toHaveAttribute('aria-expanded', 'true');
	await expect(alphaPanel).toBeVisible();
	await expect(alphaRows).toHaveCount(3);
	const reopened = await textsOf(alphaRows);
	report('2 reopened rows', { reopened });
	expect(reopened).toEqual([
		`F ${MANAGER_NAME} ${MANAGER_EMAIL} # ${TASK_TITLE} Open Today 1h 0m Total 0h 0m Estimated 1h 1h 0m`,
		`S ${PAUSED_NAME} ${PAUSED_EMAIL} -- Today 0h 0m Total 0h 0m Estimated - 0h 0m`,
		`S ${OFF_NAME} ${OFF_EMAIL} -- Today 0h 0m Total 0h 0m Estimated - 0h 0m`
	]);
});

/** The CARDS member rows as printed (`…-probe1.log`, `…-probe6.log`); the manager's two rows differ only in the times. */
const MANAGER_ROW_ALPHA = `F ${MANAGER_NAME} ${MANAGER_EMAIL} # ${TASK_TITLE} Open Today 1h 0m Total 0h 0m Estimated 1h 1h 0m`;
const MANAGER_ROW_BETA = `F ${MANAGER_NAME} ${MANAGER_EMAIL} # ${TASK_TITLE} Open Today 0h 0m Total 0h 0m Estimated 1h 0h 0m`;
const PAUSED_ROW = `S ${PAUSED_NAME} ${PAUSED_EMAIL} -- Today 0h 0m Total 0h 0m Estimated - 0h 0m`;
const OFF_ROW = `S ${OFF_NAME} ${OFF_EMAIL} -- Today 0h 0m Total 0h 0m Estimated - 0h 0m`;
const INVITED_ROW = `F ${INVITED_NAME} ${INVITED_EMAIL} -- Today 0h 0m Total 0h 0m Estimated - 0h 0m`;

/** The CARDS panel of a team the filter emptied (`all-teams-members-card-view.tsx:42-43`). */
const emptyTeamCopy = (teamName: string) => `There is no member for filtered value in the team ${teamName}`;
/** The BLOCKS copy when no member survives the filter (`all-teams-members-block-view.tsx:44`). */
const EMPTY_BLOCKS_COPY = 'There is no member for filtered value';

/** The BLOCKS cards as printed (`…-probe4.log`, `…-probe7.log`): one per employee, each team a section. */
const BLOCK_MANAGER = `F ${MANAGER_NAME} Working Total Worked Today 1h : 0m ${TEAM_ALPHA} # ${TASK_TITLE} M Open Worked On Task Today 1h 0m Worked On Task Total 0h 0m 0% ${TEAM_BETA} # ${TASK_TITLE} M Open Worked On Task Today 1h 0m Worked On Task Total 0h 0m 0%`;
const BLOCK_PAUSED = `S ${PAUSED_NAME} Paused Total Worked Today – ${TEAM_ALPHA} No active task Worked On Task Today 0h 0m Worked On Task Total 0h 0m 0%`;
const BLOCK_OFF = `S ${OFF_NAME} Not working Total Worked Today – ${TEAM_ALPHA} No active task Worked On Task Today 0h 0m Worked On Task Total 0h 0m 0%`;
const BLOCK_INVITED = `F ${INVITED_NAME} Not working Total Worked Today – ${TEAM_BETA} No active task Worked On Task Today 0h 0m Worked On Task Total 0h 0m 0%`;

/** The `MemberStatusChip` of every block (`member-status-chip.tsx:40-48`). */
const statusChips = (page: Page) => page.locator('main span[class*="rounded-md"][class*="px-2"]');

/** A browser read as `serveTeams` records it: `METHOD path`. */
const readLine = (path: string) => `GET ${path}`;
/** The team reads of one load, deduped and sorted so the order the two arrived in cannot matter. */
const teamReadsOf = (harness: { teamReads: () => string[] }) => [...new Set(harness.teamReads())].sort();
const expectedLoadReads = (teamA: string) => [readLine(TEAMS_LIST_ROUTE), readLine(teamsDetailRoute(teamA))].sort();

test('3. the COMBINE view: one block per employee across teams, then back to CARDS', async ({ page, fixture }) => {
	const { teams } = await managedTeams(fixture);
	await openAllTeams(page, fixture, teams);
	// five member rows for four employees
	await expect(page.locator('main ul li')).toHaveCount(5);

	await viewTab(page, EN.common.COMBINE).click({ timeout: 15_000 });
	await expect(viewTab(page, EN.common.COMBINE)).toHaveAttribute('aria-selected', 'true');
	await expect(viewTab(page, EN.common.TEAMS)).toHaveAttribute('aria-selected', 'false');

	const blocks = await textsOf(blockCards(page));
	report('3 blocks', { blocks, chips: await textsOf(statusChips(page)) });
	// 5 rows become 4 blocks: the manager of both teams is one block with two team sections (`block-view.tsx:18-31`)
	expect(blocks).toEqual([BLOCK_MANAGER, BLOCK_PAUSED, BLOCK_OFF, BLOCK_INVITED]);
	// the chip of a row served `timerStatus: 'suspended'` reads `Not working`: `member-block.tsx:29` asks for the
	// status with `publicTeam = true`, which skips `isSuspended` (`timer-status.tsx:96`), and the row falls to IDLE
	// (`timer-status.tsx:151-153`), the label of `ETimerStatus.IDLE`
	expect(await textsOf(statusChips(page))).toEqual(['Working', 'Paused', 'Not working', 'Not working']);
	// the CARDS column header and the accordion are gone with the view (`page-component.tsx:78`)
	await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(0);
	await expect(page.getByText(`${EN.common.TEAM} ${EN.common.MEMBER}`, { exact: true })).toHaveCount(0);
	await expect(blockCards(page)).toHaveCount(4);

	await viewTab(page, EN.common.TEAMS).click({ timeout: 15_000 });
	await expect(viewTab(page, EN.common.TEAMS)).toHaveAttribute('aria-selected', 'true');
	await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(2);
	const rows = await textsOf(page.locator('main ul li'));
	report('3 back to cards', { rows });
	expect(rows).toEqual([MANAGER_ROW_ALPHA, PAUSED_ROW, OFF_ROW, MANAGER_ROW_BETA, INVITED_ROW]);
});

test('4. the filter: which served members each value keeps in each view, and that picking one reads nothing', async ({
	page,
	fixture
}) => {
	const { teams } = await managedTeams(fixture);
	const harness = await openAllTeams(page, fixture, teams);
	await expect.poll(() => teamReadsOf(harness)).toEqual(expectedLoadReads(fixture.ids.teamA));

	const CARDS_STEPS: Array<{ label: string; printed: string; alpha: string[]; beta: string[] }> = [
		{ label: 'Working now', printed: 'Working Now', alpha: [MANAGER_ROW_ALPHA], beta: [MANAGER_ROW_BETA] },
		{ label: 'Paused', printed: 'Paused', alpha: [PAUSED_ROW], beta: [] },
		{ label: 'Off', printed: 'Off', alpha: [OFF_ROW], beta: [] },
		{ label: 'Invited', printed: 'Invited', alpha: [], beta: [INVITED_ROW] },
		{
			label: 'All',
			printed: 'All',
			alpha: [MANAGER_ROW_ALPHA, PAUSED_ROW, OFF_ROW],
			beta: [MANAGER_ROW_BETA, INVITED_ROW]
		}
	];

	for (const step of CARDS_STEPS) {
		const readsBefore = teamReadsOf(harness);
		await pickFilter(page, step.label);
		// the trigger keeps the raw label in the DOM (`all-team-members-filter.tsx:85`) and the `capitalize` class
		// renders it, so Playwright's text matching sees `Working now` while the person reads `Working Now`; both are
		// pinned here because they are two different facts about the same element
		await expect(filterTrigger(page)).toContainText(step.label);
		expect(flat(await filterTrigger(page).innerText())).toBe(step.printed);
		// a team the filter empties keeps its group and its count chip (`all-teams-members-card-view.tsx:16`, `:20`)
		expect(await textsOf(groupTrigger(page, TEAM_ALPHA))).toEqual([`${TEAM_ALPHA} ${step.alpha.length}`]);
		expect(await textsOf(groupTrigger(page, TEAM_BETA))).toEqual([`${TEAM_BETA} ${step.beta.length}`]);
		expect(await textsOf(groupRows(page, TEAM_ALPHA))).toEqual(step.alpha);
		expect(await textsOf(groupRows(page, TEAM_BETA))).toEqual(step.beta);
		const groups: Array<[string, string[]]> = [
			[TEAM_ALPHA, step.alpha],
			[TEAM_BETA, step.beta]
		];
		for (const [teamName, kept] of groups) {
			if (kept.length === 0) await expect(groupPanel(page, teamName)).toContainText(emptyTeamCopy(teamName));
		}
		// A short quiet window, and it is one on purpose: it proves the pick sent no read (picking only writes the
		// `filterValue` atom, `all-team-members-filter.tsx:66-71`; the shell's own team poll is 60 s away,
		// `core/lib/utils/team-detail-refresh.ts:2`).
		await page.waitForTimeout(1_500);
		const readsAfter = teamReadsOf(harness);
		report('4 reads', { filter: step.label, readsBefore, readsAfter, totalTeamReads: harness.teamReads().length });
		expect(readsAfter).toEqual(readsBefore);
	}

	const BLOCK_STEPS: Array<{ label: string; printed: string; blocks: string[]; chips: string[] }> = [
		{ label: 'Working now', printed: 'Working Now', blocks: [BLOCK_MANAGER], chips: ['Working'] },
		{ label: 'Paused', printed: 'Paused', blocks: [BLOCK_PAUSED], chips: ['Paused'] },
		{ label: 'Off', printed: 'Off', blocks: [BLOCK_OFF], chips: ['Not working'] },
		{ label: 'Invited', printed: 'Invited', blocks: [BLOCK_INVITED], chips: ['Not working'] },
		{
			label: 'All',
			printed: 'All',
			blocks: [BLOCK_MANAGER, BLOCK_PAUSED, BLOCK_OFF, BLOCK_INVITED],
			chips: ['Working', 'Paused', 'Not working', 'Not working']
		}
	];
	await viewTab(page, EN.common.COMBINE).click({ timeout: 15_000 });
	for (const step of BLOCK_STEPS) {
		await pickFilter(page, step.label);
		await expect(filterTrigger(page)).toContainText(step.label);
		expect(flat(await filterTrigger(page).innerText())).toBe(step.printed);
		const blocks = await textsOf(blockCards(page));
		report('4 blocks filter', { filter: step.label, blocks });
		expect(blocks).toEqual(step.blocks);
		expect(await textsOf(statusChips(page))).toEqual(step.chips);
	}
	// the manager under `Working now` is one block carrying both teams' sections: a filter drops members, never a team
	// (`use-organization-teams-managers.ts:46-65`)
	await expect(blockCards(page).first()).toContainText(TEAM_ALPHA);
	await expect(blockCards(page).first()).toContainText(TEAM_BETA);
});

test('5. a filter value no served member matches: the empty copy of both views', async ({ page, fixture }) => {
	const { ids } = fixture;
	const task = await mockTask();
	const manager = employeeOf(ids, ids.employee, ids.user, MANAGER_NAME, MANAGER_EMAIL);
	// both managed teams hold only the running manager, so `Paused` matches nobody
	const runningOnly = [
		teamOf(
			ids,
			ids.teamA,
			TEAM_ALPHA,
			[
				{
					id: memberRowId('a', 1),
					employee: manager,
					manager: true,
					timerStatus: 'running',
					activeTaskId: ids.task,
					todaySeconds: 3_600
				}
			],
			task
		),
		teamOf(
			ids,
			ids.teamB,
			TEAM_BETA,
			[
				{
					id: memberRowId('b', 1),
					employee: manager,
					manager: true,
					timerStatus: 'running',
					activeTaskId: ids.task,
					todaySeconds: 3_600
				}
			],
			task
		)
	];
	await openAllTeams(page, fixture, runningOnly);

	await pickFilter(page, 'Paused');
	expect(await textsOf(groupTrigger(page, TEAM_ALPHA))).toEqual([`${TEAM_ALPHA} 0`]);
	expect(await textsOf(groupTrigger(page, TEAM_BETA))).toEqual([`${TEAM_BETA} 0`]);
	await expect(page.locator('main ul li')).toHaveCount(0);
	const panels = await textsOf(page.locator('[data-slot="accordion-content"]'));
	report('5 cards empty', { panels });
	expect(panels).toEqual([emptyTeamCopy(TEAM_ALPHA), emptyTeamCopy(TEAM_BETA)]);

	await viewTab(page, EN.common.COMBINE).click({ timeout: 15_000 });
	await expect(blockCards(page)).toHaveCount(0);
	await expect(page.locator('main a[href*="/profile/"]')).toHaveCount(0);
	const mainText = flat(await page.locator('main').first().innerText());
	report('5 blocks empty', { mainTextHasCopy: mainText.includes(EMPTY_BLOCKS_COPY) });
	expect(mainText).toContain(EMPTY_BLOCKS_COPY);
});

test('6. the links the page offers: a member opens their profile, and there is no link to a team at all', async ({
	page,
	fixture
}) => {
	const { ids, teams } = await managedTeams(fixture);
	await openAllTeams(page, fixture, teams);

	const hrefs = await hrefsOf(page.locator('main a'));
	const paths = hrefs.map((href) => new URL(href, APP_ORIGIN).pathname).sort();
	report('6 links', { hrefs, paths });
	// the breadcrumb and one link per member row, nothing else: the CARDS team name is a `<span>` inside the
	// accordion `<button>` (`all-teams-members-card-view.tsx:19`) and in a block it is a plain `<div>`
	// (`users-teams-block/member-block.tsx:48`), so no team page is reachable from this page
	expect(paths).toEqual(
		[
			'/',
			ALL_TEAMS_PATH,
			`/profile/${ids.user}`,
			`/profile/${ids.user}`,
			`/profile/${ids.teammateUser}`,
			`/profile/${ids.deniedUser}`,
			`/profile/${INVITED_USER_ID}`
		].sort()
	);
	expect(
		hrefs.filter((href) => href.includes(ids.teamA) || href.includes(ids.teamB) || href.includes('/teams'))
	).toEqual([]);

	await page.locator(`main a[href*="/profile/${ids.user}"]`).first().click({ timeout: 15_000 });
	// `user-team-card/user-info.tsx:39-40` builds the href from the member's user id and full name
	await expect(page).toHaveURL(
		new URL(`/profile/${ids.user}?name=${encodeURIComponent(MANAGER_NAME)}`, APP_ORIGIN).href,
		{
			timeout: 30_000
		}
	);
	await expect(page.getByRole('heading', { name: MANAGER_NAME }).first()).toBeVisible();
	report('6 opened profile', { url: page.url() });
});

test('7. managing only one of the served teams goes to `/` instead of the page', async ({ page, fixture }) => {
	const { ids, teams } = await managedTeams(fixture);
	// the same scenario with Beta dropped: `userManagedTeams.length === 1`
	const harness = await openAllTeams(page, fixture, [teams[0]]);

	// `page-component.tsx:49` (`userManagedTeams.length < 2` → `RedirectUser` `:87-93` = `router.push('/')`)
	await expect(page).toHaveURL(new URL(`${APP_ORIGIN}/`).href, { timeout: 30_000 });
	await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(0);
	report('7 one managed team', { url: page.url(), reads: teamReadsOf(harness) });
	// the list read and the active team's detail were still sent before leaving
	expect(teamReadsOf(harness)).toEqual(expectedLoadReads(ids.teamA));
});

test('8. a member of two served teams who manages neither goes to `/` too', async ({ page, fixture }) => {
	const { ids, task } = await managedTeams(fixture);
	const manager = employeeOf(ids, ids.employee, ids.user, MANAGER_NAME, MANAGER_EMAIL);
	/** An employee this file invents, so each served team really has a manager — just not this person. */
	const otherManager = employeeOf(
		ids,
		'55555555-5555-4555-8555-400000000009',
		'44444444-4444-4444-8444-400000000009',
		'Served Other Manager',
		'other@served.test'
	);
	// both teams hold this person's member row, and both hold a `MANAGER` row belonging to somebody else
	const teams = [
		teamOf(
			ids,
			ids.teamA,
			TEAM_ALPHA,
			[
				{
					id: memberRowId('a', 1),
					employee: manager,
					manager: false,
					timerStatus: 'running',
					activeTaskId: ids.task,
					todaySeconds: 3_600
				},
				{
					id: memberRowId('a', 2),
					employee: otherManager,
					manager: true,
					timerStatus: null,
					activeTaskId: null,
					todaySeconds: null
				}
			],
			task
		),
		teamOf(
			ids,
			ids.teamB,
			TEAM_BETA,
			[
				{
					id: memberRowId('b', 1),
					employee: manager,
					manager: false,
					timerStatus: 'running',
					activeTaskId: ids.task,
					todaySeconds: 3_600
				}
			],
			task
		)
	];
	const harness = await openAllTeams(page, fixture, teams);

	// the gate needs both halves of `member.employee.user.id === user.id && member.role.name === 'MANAGER'`
	// (`use-organization-teams-managers.ts:22-30`), so two memberships are not two managed teams
	await expect(page).toHaveURL(new URL(`${APP_ORIGIN}/`).href, { timeout: 30_000 });
	await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(0);
	report('8 managed by nobody', { url: page.url(), reads: teamReadsOf(harness) });
	// the same two reads as any other visit: the gate only runs after the list arrived
	expect(teamReadsOf(harness)).toEqual(expectedLoadReads(ids.teamA));
});

test('9. a 500 on the team list: the page stays on its skeleton, and only the armed refusal shows in the console', async ({
	page,
	fixture,
	shield
}) => {
	const { teams } = await managedTeams(fixture);
	// `waitForShellReady` cannot run here: the shell's `criticalReady` waits for the same team read
	// (`init-state.tsx:263-272`), so this visit skips it (`page-component.tsx:40-44` keeps the page on the skeleton)
	const harness = await openAllTeams(page, fixture, teams, { failList: 500, requireShell: false });
	const armed = armedHttpError('GET', 'organization-team', 500);

	await expect(page).toHaveURL(new URL(`${APP_ORIGIN}${ALL_TEAMS_PATH}`).href);
	// the skeleton's own frame: its title `Loading` (`page-skeleton.tsx:105`, `:115` = `common.LOADING`) and its
	// aria-hidden toolbar h1 (`all-teams-page-skeleton.tsx:38`). `main` is read as the shell's outer one, first in the
	// document — the page's own `main` is nested inside it, so a strict `locator('main')` matches both.
	const mainText = flat(await page.locator('main').first().innerText());
	report('9 refused main text', { mainText });
	expect(mainText).toContain(EN.common.LOADING);
	expect(await textsOf(page.locator('h1'))).toEqual([EN.common.ALL_TEAMS]);
	await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(0);
	report('9 refused', {
		url: new URL(page.url()).pathname,
		reads: teamReadsOf(harness),
		totalTeamReads: harness.teamReads().length,
		pageErrors: shield.pageErrors()
	});
	// only the list read was sent; the detail read never happened because no team arrived
	expect(teamReadsOf(harness)).toEqual([readLine(TEAMS_LIST_ROUTE)]);
	// every console line of this visit is the client's own log of the refusal this file armed
	// (`core/services/client/api.service.ts` `logError`), so nothing else is excused: the filter here matches only a
	// line naming `organization-team` and the 500. The read was logged **twice** because the query retried the refused
	// list read (`core/hooks/organizations/teams/use-organization-teams-query.ts:218-246`), so this file pins the kind
	// of line and not its count.
	expect(shield.consoleErrors().every((line) => armed.test(line))).toBe(true);
	expect(consoleFindings(shield, [armed])).toEqual([]);
	expect(shield.consoleErrors().length).toBeGreaterThan(0);
	expect(shield.pageErrors()).toEqual([]);
});

test("10. the mock's own fixture never reaches the page (measured)", async ({ page, fixture }) => {
	await signInAndVisit(page, fixture, ALL_TEAMS_PATH, { requireShell: false });
	await expect(page).toHaveURL(new URL(`${APP_ORIGIN}/`).href, { timeout: 30_000 });
	await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(0);

	const listed = (await (await fetch(`${MOCK_ORIGIN}${TEAMS_LIST_ROUTE}`)).json()) as {
		items: Array<{ members: Array<{ role?: { name?: string } }> }>;
	};
	const roleNames = listed.items.flatMap((team) => team.members.map((member) => member.role?.name ?? ''));
	report('10 mock fixture', { teams: listed.items.length, roleNames });
	// Measured, untagged: the mock's fixture means the signed-in person to be the team's manager
	// (`cypress/support/mock-gauzy-server.mjs:218` sets `isManager: true` on their member row) and the page's own
	// doc comment states the rule in role terms ("the authenticated user has the 'MANAGER' role for at least one
	// member of the team", `core/hooks/organizations/teams/use-organization-teams-managers.ts:20`), yet the gate
	// reads `member.role.name` (`:22-30`) and the mock's role name is `ADMIN` (`mock-gauzy-server.mjs:73-77`), so the
	// fixture person is measured as managing nothing. On top of that the mock answers exactly one team
	// (`mock-gauzy-server.mjs:655`), so even a `MANAGER` name would leave `1 < 2` (`page-component.tsx:49`):
	// `/all-teams` is not reachable through the mock as it is, which is why every scenario above serves its teams.
	// The gate itself does what its doc comment says, so this is a gap in the test data, not a page defect.
	expect(roleNames).not.toContain('MANAGER');
	expect(listed.items).toHaveLength(1);
});
