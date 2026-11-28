import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page, Route } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The All teams page's per-row menu (`common.MORE_OPTIONS`), as a manager of two teams: what one row's menu holds,
 * and what each item really sends and really leaves behind.
 *
 * Driven, in the order the clicks travel:
 * `core/components/pages/teams/all-teams/page-component.tsx` (skeleton `:40-44`, the two-managed-teams gate `:49`,
 * `showTimer={isTrackingEnabled}` `:56`) → `all-teams-members-views/users-teams-card/user-card.tsx` (the row, its
 * menu cell `:83-85`, its own task fetch and `console.log` catch `:104-113`) →
 * `.../all-teams-members-views` CARDS groups →
 * `core/components/pages/teams/team/team-members-views/user-team-card/user-team-card-menu.tsx` (items `:118-184`,
 * only the `active` ones render `:204`, separators `:244` and the plans button `:306-312`, `Remove` wrapped in
 * `ConfirmDropdown` `:280-287`, `Assign task` opening the global modal `:260-277`) →
 * `core/components/common/dropdown.tsx:167-197` (the confirmation),
 * `core/components/features/tasks/global-assign-task-modal.tsx:42-107` (the pick),
 * `core/hooks/organizations/teams/use-team-member-mutations.ts` (`PUT /api/tasks/<id>`),
 * `core/hooks/organizations/teams/use-team-member-role-actions.ts` (`DELETE /api/tasks/employee/<id>` then
 * `PUT /api/organization-team/<id>`).
 *
 * Served layer vs app layer: two managed teams (3 + 2 members) and two tasks are served by this file on the mock
 * origin (`serveTeamsAndTasks` — every read answers from this file's store, a refused write changes nothing, a held
 * call is answered by this file), because the lane mock answers its own single fixture team and task and stores
 * nothing a write changes (`cypress/support/mock-gauzy-server.mjs:655-656`, `:677-685`). Everything the tests read
 * is the app's own work: the menu, the confirmation, the toasts, the header timer, the rows and the skeleton, with
 * copy taken from `locales/en.json` by key.
 *
 * Numbers are measured, not assumed: the probe runs are logged at
 * `D:/Coding/.tmp/s3-lane-a-allteamsmenu-probe1.log` … `-probe5.log`, and every `MEASURE` line the tests below
 * print lands in the run log (`D:/Coding/.tmp/s3-lane-a-allteamsmenu-1.log`, `-2.log`). Row counts come from the
 * served scenario, and the two "cannot be reached" claims are pinned by what the held page actually renders.
 *
 * Measured behaviour worth a reviewer's attention (all of it asserted below):
 * - `Remove` and `Make a manager` act on the ACTIVE team, not on the team whose row was clicked: for a member of the
 *   other team the writes are `DELETE /api/tasks/employee/<their id>?organizationTeamId=<active team>` and
 *   `PUT /api/organization-team/<active team>`, and `Remove` there sends the active team's roster unchanged, so the
 *   member is still in their own team; `Make a manager` puts the id in the active team's `managerIds`, among members
 *   that do not include them. Untagged: the hook says at `use-team-member-role-actions.ts:19` "Reads the active team
 *   when an action runs", so it does what it states — the gap is that `/all-teams` offers these items on rows of
 *   other teams, where acting on the active team is never what the click names (a lead downgraded the worker's two
 *   `[MEASURED, NOT INTENDED]` tags on that ground, 2026-11-28).
 * - Assigning or unassigning a task never moves the row: the task cell follows `member.activeTaskId` of the team
 *   answer (`user-team-active-task.tsx:17-25`), which no task write touches — the member you just assigned a task
 *   to still prints the empty cell, and the row you unassigned from still prints the task.
 * - Refusing `GET /api/tasks/<id>` for the load makes every row that has an active task print the empty cell
 *   `user-team-active-task.tsx:37` prints (`--`), in both teams; the rows without a task are word for word
 *   unchanged.
 *
 * Not covered here: the items that leave this page (`Edit task`, `Estimate`, `Add task to favorites`, `See plans`
 * — the menu shape is asserted, their dialogs are another spec's), the 60 s team poll the survey lists (a whole-file
 * run never waits that long), and the second `AllTeamsPageSkeleton` at `page-component.tsx:52-54`, which needs
 * `filteredTeams.length === 0` while `userManagedTeams.length >= 2` and so was not reachable to measure.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const ALL_TEAMS_PATH = '/all-teams';
const TEAMS_LIST_ROUTE = '/api/organization-team';
const teamsDetailRoute = (id: string) => `/api/organization-team/${id}`;
/** `taskService.updateTask` / `getTaskById` (`core/services/client/api/tasks/task.service.ts:284-326`, `:427-433`). */
const taskRoute = (id: string) => `/api/tasks/${id}`;
const employeeTasksRoute = (employeeId: string) => `/api/tasks/employee/${employeeId}`;
const TASKS_LIST_ROUTES = ['/api/tasks', '/api/tasks/team'];

/** `locales/en.json`, read by key: the copy this page renders through `useTranslations`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: Record<string, string> & { plan: Record<string, string> };
	dailyPlan: Record<string, string>;
	/** The header timer's own start/stop accessible names (`core/components/timer/timer-button.tsx:39-41`, `:71`). */
	hotkeys: Record<string, string>;
	toasts: {
		MUTATION_FAILED: string;
		REASONS: Record<string, string>;
		teams: Record<string, string>;
		tasks: Record<string, string>;
	};
	timer: Record<string, string>;
};

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a all-teams menu] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const answerJson = (route: Route, status: number, body?: unknown) =>
	route.fulfill({
		status,
		headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
		body: body === undefined ? '' : JSON.stringify(body)
	});

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Sonner toasts; the toaster pauses its countdowns while the pointer is over it (`brief-common`). */
const toastOf = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const parkPointer = async (page: Page) => {
	await page.mouse.move(2, 2);
};

/** React's dev-mode store warning, not this page's (`chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The shell's own health read (`core/services/client/api/default.ts:42`) sometimes times out on a lane dev server. */
const HEALTH_CHECK_NOISE = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';
/** `mutation-error-toaster.tsx:43-45`, printed for every failed mutation in dev mode. */
const escapeForRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const armedMutationFailure = (message: string) => new RegExp(`Mutation failed: ApiError: ${escapeForRegex(message)}`);
/**
 * The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`). Measured lines:
 * `[ERROR] [HttpClient] HTTP Error: PUT /organization-team/<id> 400 {…}` and
 * `[ERROR] [HttpClient] HTTP Error: GET /tasks/<id>?… 500 {…}` — the path it prints is the service path, without
 * the `/api` prefix this spec routes on, so the prefix is dropped before matching.
 */
const armedHttpError = (verb: string, servedPath: string, status: number) =>
	new RegExp(
		`\\[ERROR\\] \\[HttpClient\\] HTTP Error: ${verb} \\S*${escapeForRegex(servedPath.replace(/^\/api/, ''))}\\S* ${status}`
	);

const consoleFindings = (shield: Shield, expected: RegExp[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(HEALTH_CHECK_NOISE))
		.filter((line) => !expected.some((pattern) => pattern.test(line)));

/* ------------------------------------------------------------------ served teams and tasks */

const TEAM_ALPHA = 'Served Alpha Team';
const TEAM_BETA = 'Served Beta Team';
const MANAGER_NAME = 'Fixture Manager';
const MANAGER_EMAIL = 'manager@example.test';
const PAUSED_NAME = 'Served Paused Member';
const PAUSED_EMAIL = 'paused@served.test';
const OFF_NAME = 'Served Off Member';
const OFF_EMAIL = 'off@served.test';
const BETA_NAME = 'Served Beta Member';
const BETA_EMAIL = 'beta@served.test';
/** An employee this file invents: Beta's only plain member. */
const BETA_EMPLOYEE_ID = '55555555-5555-4555-8555-400000000011';
const BETA_USER_ID = '44444444-4444-4444-8444-400000000011';
/** A second task this file invents, assigned to nobody: what `Assign task` offers. */
const EXTRA_TASK_ID = '88888888-8888-4888-8888-400000000021';
const EXTRA_TASK_TITLE = 'Served unassigned task';

const memberRowId = (team: 'a' | 'b', index: number) => `66666666-6666-4666-8666-${team}0000000000${index}`;

/** The mock's own task object, read from the mock in Node. */
async function mockTask(): Promise<Record<string, unknown>> {
	const listed = (await (await fetch(`${MOCK_ORIGIN}${TEAMS_LIST_ROUTE}`)).json()) as {
		items: Array<Record<string, unknown>>;
	};
	return (listed.items[0].tasks as Array<Record<string, unknown>>)[0];
}

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

type ServedMember = {
	id: string;
	employee: Record<string, unknown>;
	manager: boolean;
	timerStatus: string | null;
	activeTaskId: string | null;
	todaySeconds: number | null;
	isTrackingEnabled?: boolean;
};

/** One managed team, in the shape the mock's own `buildData` answers (`mock-gauzy-server.mjs:236-256`). */
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
		isTrackingEnabled: member.isTrackingEnabled ?? true,
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
type Refusal = { status: number; message: string };

type ServedCall = { method: string; path: string; search: string; body: Record<string, unknown> | null };

type Harness = {
	/** Every call the browser sent to a served path on the mock origin, in the order it sent it. */
	calls: () => ServedCall[];
	shapes: () => string[];
	resetCalls: () => void;
	waitForCall: (method: string, path: string) => Promise<ServedCall>;
	/** Calls that arrived and are still unanswered, because this file holds their answer (`holdNext`). */
	pending: () => ServedCall[];
	/** What the served store holds now; every read answers from it. */
	store: () => { teams: ServedTeam[]; tasks: Record<string, unknown>[] };
	refuse: (which: 'teamPut' | 'taskPut' | 'taskGet' | 'unassign', refusal: Refusal | undefined) => void;
	/** Arms a hold for the next call of this method + path; `releaseHeld` answers it. */
	holdNext: (method: string, path: string) => void;
	/** Answers a held call this file armed (a held write, a held read). */
	releaseHeld: () => void;
};

type Script = {
	refuseTeamPut?: Refusal;
	refuseTaskPut?: Refusal;
	refuseTaskGet?: Refusal;
	refuseUnassign?: Refusal;
	hold?: { method: string; path: string } | null;
};

type Gate = { promise: Promise<void>; release: () => void };

/**
 * This file's stand-in for the team + task API, on the mock origin. The mock answers its own single fixture team and
 * task there (`mock-gauzy-server.mjs:655-656`, `:677-685`) and stores nothing a write changes, so "the row is back as
 * it was" could not be told apart from "the server still says the same". Every read answers from this store; a
 * refused write changes nothing. `route.fetch()` is never called, so a served path never reaches the mock and the
 * record of what the browser asked is this file's own `calls` list.
 */
async function serveTeamsAndTasks(
	page: Page,
	teams: ServedTeam[],
	tasks: Record<string, unknown>[],
	options: { holdListRead?: boolean } = {}
): Promise<Harness> {
	const store = { teams: teams.map((team) => ({ ...team })), tasks: tasks.map((task) => ({ ...task })) };
	const calls: ServedCall[] = [];
	/** Of those, the ones this file is still holding an answer for. */
	const pending: ServedCall[] = [];
	const script: Script = {};
	/** The gate of the hold this file armed last; `releaseHeld` answers it. */
	let armedGate: Gate | null = null;
	if (options.holdListRead) {
		script.hold = { method: 'GET', path: TEAMS_LIST_ROUTE };
		armedGate = newGate();
	}

	const isServedPath = (pathname: string) =>
		pathname === TEAMS_LIST_ROUTE ||
		/^\/api\/organization-team\/[^/]+$/.test(pathname) ||
		TASKS_LIST_ROUTES.includes(pathname) ||
		/^\/api\/tasks\/[^/]+$/.test(pathname) ||
		/^\/api\/tasks\/employee\/[^/]+$/.test(pathname);

	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && isServedPath(url.pathname),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			const pathname = url.pathname;
			if (method === 'OPTIONS') return answerJson(route, 204);
			const raw = request.postData();
			const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
			calls.push({ method, path: pathname, search: url.search, body });

			if (script.hold && script.hold.method === method && script.hold.path === pathname) {
				const gate = armedGate as Gate;
				const held = calls[calls.length - 1];
				script.hold = null;
				pending.push(held);
				await gate.promise;
				pending.splice(pending.indexOf(held), 1);
			}

			if (pathname === TEAMS_LIST_ROUTE && method === 'GET') {
				return answerJson(route, 200, { items: store.teams, total: store.teams.length });
			}
			const teamMatch = /^\/api\/organization-team\/([^/]+)$/.exec(pathname);
			if (teamMatch) {
				const team = store.teams.find((item) => item.id === teamMatch[1]);
				if (method === 'GET') return answerJson(route, 200, team);
				if (method === 'PUT') {
					if (script.refuseTeamPut) return refusalAnswer(route, script.refuseTeamPut);
					const memberIds = (body?.memberIds ?? []) as string[];
					const managerIds = (body?.managerIds ?? []) as string[];
					if (team) {
						team.members = memberIds
							.map((employeeId) => team.members.find((member) => member.employeeId === employeeId))
							.filter((member): member is NonNullable<typeof member> => Boolean(member))
							.map((member) => ({
								...member,
								isManager: managerIds.includes(String(member.employeeId))
							}));
						team.managers = team.members.filter((member) => member.isManager);
					}
					return answerJson(route, 200, team);
				}
			}
			if (TASKS_LIST_ROUTES.includes(pathname) && method === 'GET') {
				return answerJson(route, 200, { items: store.tasks, total: store.tasks.length });
			}
			const unassignMatch = /^\/api\/tasks\/employee\/([^/]+)$/.exec(pathname);
			if (unassignMatch && method === 'DELETE') {
				if (script.refuseUnassign) return refusalAnswer(route, script.refuseUnassign);
				const employeeId = unassignMatch[1];
				store.tasks = store.tasks.map((task) => ({
					...task,
					members: ((task.members as Record<string, unknown>[]) ?? []).filter(
						(member) => member.id !== employeeId
					)
				}));
				return answerJson(route, 200, { affected: 1 });
			}
			const taskMatch = /^\/api\/tasks\/([^/]+)$/.exec(pathname);
			if (taskMatch) {
				const index = store.tasks.findIndex((task) => task.id === taskMatch[1]);
				if (method === 'GET') {
					if (script.refuseTaskGet) return refusalAnswer(route, script.refuseTaskGet);
					return answerJson(route, 200, store.tasks[index]);
				}
				if (method === 'PUT') {
					if (script.refuseTaskPut) return refusalAnswer(route, script.refuseTaskPut);
					const merged = { ...store.tasks[index], ...body };
					store.tasks = store.tasks.map((task, at) => (at === index ? merged : task));
					return answerJson(route, 200, store.tasks[index]);
				}
			}
			return answerJson(route, 404, {
				statusCode: 404,
				message: `this spec serves no answer for ${method} ${pathname}`
			});
		}
	);

	return {
		calls: () => [...calls],
		shapes: () => calls.map((call) => `${call.method} ${call.path}`),
		resetCalls: () => {
			calls.length = 0;
		},
		waitForCall: async (method, path) => {
			await expect
				.poll(() => calls.some((call) => call.method === method && call.path === path), { timeout: 30_000 })
				.toBe(true);
			return calls.find((call) => call.method === method && call.path === path) as ServedCall;
		},
		pending: () => [...pending],
		store: () => store,
		refuse: (which, refusal) => {
			const key = {
				teamPut: 'refuseTeamPut',
				taskPut: 'refuseTaskPut',
				taskGet: 'refuseTaskGet',
				unassign: 'refuseUnassign'
			}[which] as 'refuseTeamPut' | 'refuseTaskPut' | 'refuseTaskGet' | 'refuseUnassign';
			script[key] = refusal;
		},
		holdNext: (method, path) => {
			script.hold = { method, path };
			armedGate = newGate();
		},
		releaseHeld: () => armedGate?.release()
	};
}

const newGate = () => {
	let release: () => void = () => undefined;
	const promise = new Promise<void>((resolve) => {
		release = () => resolve();
	});
	return { promise, release };
};

const refusalAnswer = (route: Route, refusal: Refusal) =>
	answerJson(route, refusal.status, { statusCode: refusal.status, message: refusal.message });

/* ------------------------------------------------------------------ the served scenario */

async function managedTeams(fixture: BootstrapFixture) {
	const { ids } = fixture;
	const task = await mockTask();
	const manager = employeeOf(ids, ids.employee, ids.user, MANAGER_NAME, MANAGER_EMAIL);
	const paused = employeeOf(ids, ids.teammateEmployee, ids.teammateUser, PAUSED_NAME, PAUSED_EMAIL);
	const off = employeeOf(ids, ids.deniedEmployee, ids.deniedUser, OFF_NAME, OFF_EMAIL);
	const beta = employeeOf(ids, BETA_EMPLOYEE_ID, BETA_USER_ID, BETA_NAME, BETA_EMAIL);
	const extraTask = { ...task, id: EXTRA_TASK_ID, title: EXTRA_TASK_TITLE, number: 2, members: [], teams: [] };
	const teams = [
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
					employee: beta,
					manager: false,
					timerStatus: 'pause',
					activeTaskId: null,
					todaySeconds: null
				}
			],
			task
		)
	];
	return { ids, task, teams, tasks: [task, extraTask], manager, paused, off, beta };
}

/* ------------------------------------------------------------------ page readers */

const teamGroup = (page: Page, teamName: string) =>
	page.locator('[data-slot="accordion-item"]').filter({ hasText: teamName }).first();
const groupRows = (page: Page, teamName: string) => teamGroup(page, teamName).locator('ul li');
const rowOf = (page: Page, teamName: string, name: string) =>
	groupRows(page, teamName).filter({ hasText: name }).first();
/** `UserTeamCardMenu`'s trigger (`user-team-card-menu.tsx:220-230`), named by `common.MORE_OPTIONS`. */
const rowMenuButton = (page: Page, teamName: string, name: string) =>
	rowOf(page, teamName, name).getByRole('button', { name: EN.common.MORE_OPTIONS, exact: true });
const menuPanels = (page: Page) => page.locator('[data-headlessui-state="open"]');

/** Opens one row's menu and waits for its panel; the caller closes it with `closeMenu`. */
async function openRowMenu(page: Page, teamName: string, name: string) {
	await rowMenuButton(page, teamName, name).click({ timeout: 15_000 });
	await expect(menuPanels(page).first()).toBeVisible({ timeout: 10_000 });
}
/** Headless UI closes its popover on Escape; the panel is a document-level portal (`menu-recipes.ts:17-19`). */
async function closeMenu(page: Page) {
	await page.keyboard.press('Escape');
	await expect(menuPanels(page)).toHaveCount(0, { timeout: 10_000 });
}

const menuItem = (page: Page, name: string) => menuPanels(page).getByRole('button', { name, exact: true }).first();

/** `''`: what a separator row of an open menu panel reads as (`user-team-card-menu.tsx:244`, `:306-312`). */
const SEPARATOR = '';

/** A text read that has to settle first: polled until it is not empty, then returned flattened. */
async function readText(locator: Locator) {
	let text = '';
	await expect
		.poll(
			async () => {
				text = flat(await locator.innerText());
				return text.length > 0;
			},
			{ timeout: 15_000 }
		)
		.toBe(true);
	return text;
}

/** One team group's rows as flattened text, polled until the group has rendered rows. */
async function readGroupRows(page: Page, teamName: string) {
	let rows: string[] = [];
	await expect
		.poll(
			async () => {
				rows = (await groupRows(page, teamName).allInnerTexts()).map(flat);
				return rows.length;
			},
			{ timeout: 15_000 }
		)
		.toBeGreaterThan(0);
	return rows;
}

/**
 * The open panel's rows, in order, each named by the locale key behind it. The panel is a document-level portal
 * (`menu-recipes.ts:17-19`), so it is read through `menuPanels` and not through the row that opened it.
 */
async function expectPanelItems(page: Page, items: string[]) {
	await expect
		.poll(async () => (await menuPanels(page).locator('li').allInnerTexts()).map(flat), { timeout: 10_000 })
		.toEqual(items);
}

/**
 * The layout nests two `main` elements: the shell's, which holds the header (the timer, the tracking-off notice and
 * the page's own header slot), and the page's, inside `PageContentScroller` (`page-layout.tsx:130-158`,
 * `page-content-scroller.tsx:21-22`). `getByRole('main')` alone resolves to both (measured in
 * `D:/Coding/.tmp/s3-lane-a-allteamsmenu-1.log`), so the tests name the shell's, which contains both.
 */
const pageShell = (page: Page) => page.getByRole('main').first();

/** What the served store says about one member of one team, after a write this file answered. */
const storedMember = (harness: Harness, teamId: string, employeeId: string) =>
	harness
		.store()
		.teams.find((team) => team.id === teamId)
		?.members.find((member) => member.employeeId === employeeId);

async function openAllTeams(
	page: Page,
	fixture: BootstrapFixture,
	options: {
		holdListRead?: boolean;
		refuseTaskGet?: Refusal;
		teams?: ServedTeam[];
		tasks?: Record<string, unknown>[];
	} = {}
) {
	const built = await managedTeams(fixture);
	const teams = options.teams ?? built.teams;
	const tasks = options.tasks ?? built.tasks;
	const harness = await serveTeamsAndTasks(page, teams, tasks, { holdListRead: options.holdListRead });
	if (options.refuseTaskGet) harness.refuse('taskGet', options.refuseTaskGet);
	await signInAndVisit(page, fixture, ALL_TEAMS_PATH, { requireShell: options.holdListRead ? false : undefined });
	await expect
		.poll(() => harness.calls().some((call) => call.path === TEAMS_LIST_ROUTE), { timeout: 30_000 })
		.toBe(true);
	return { harness, ...built };
}

/* ------------------------------------------------------------------ 1. what the menu holds */

test('the row menu item by item: for a manager, their own row and another member row', async ({ page, fixture }) => {
	await openAllTeams(page, fixture);

	/* Own row: the task group is what can be done with the task this row is on (`user-team-card-menu.tsx:121-149`),
	   then the assignment group (`:151-166`), then the plans button every row gets (`:306-312`). */
	await openRowMenu(page, TEAM_ALPHA, MANAGER_NAME);
	await expectPanelItems(page, [
		EN.common.EDIT_TASK,
		EN.common.ESTIMATE,
		EN.common.ADD_FAVORITE_TASK,
		SEPARATOR,
		EN.common.ASSIGN_TASK,
		EN.common.UNASSIGN_TASK,
		SEPARATOR,
		EN.common.plan.SEE_PLANS
	]);
	await closeMenu(page);

	/* Another member row: the task group is gone (`canActOnOwnWork && edition.task`, `:121-149` — this row has no
	   task of theirs to edit), and the member group appears instead: `MAKE_A_MANAGER` `:168-174`, `REMOVE`
	   `:176-183`. `Remove` is the trigger of a `ConfirmDropdown` (`dropdown.tsx:167-197`), a `span[role=button]`
	   rather than a <button>, which is why it reads as an item but is not a button element. */
	const memberRowItems = [
		EN.common.ASSIGN_TASK,
		SEPARATOR,
		EN.common.MAKE_A_MANAGER,
		EN.common.REMOVE,
		SEPARATOR,
		EN.common.plan.SEE_PLANS
	];
	await openRowMenu(page, TEAM_ALPHA, PAUSED_NAME);
	await expectPanelItems(page, memberRowItems);
	await closeMenu(page);

	/* The same menu on the other team's member row: the trigger is built per row (`user-card.tsx:83-85`). */
	await openRowMenu(page, TEAM_BETA, BETA_NAME);
	await expectPanelItems(page, memberRowItems);
	await closeMenu(page);
});

/* ------------------------------------------------------------------ 2. assign / unassign */

test('assign a task to a member and unassign the active task: the write and the row after', async ({
	page,
	fixture,
	shield
}) => {
	const { harness, ids, manager, paused, task } = await openAllTeams(page, fixture);
	const servedTaskTitle = flat(String(task.title));

	/* `Assign task` writes nothing by itself: it opens the global assign-task modal
	   (`user-team-card-menu.tsx:260-277` → `global-assign-task-modal.tsx:42-107`), whose title is
	   `common.ASSIGN_TASK_TO` plus the member name (`:74-78`). The write happens when a task row is picked. */
	harness.resetCalls();
	const pausedRowBefore = await readText(rowOf(page, TEAM_ALPHA, PAUSED_NAME));
	await openRowMenu(page, TEAM_ALPHA, PAUSED_NAME);
	await menuItem(page, EN.common.ASSIGN_TASK).click({ timeout: 15_000 });

	/* The modal, found by its own copy. The open row menu is not a `role=dialog`, and the modal's own
	   `[role=dialog]` box measures 1280×0 with its panel inside at 1280×720 (measured), so its copy is read as text
	   instead of asserted visible. */
	const assignModal = page.getByRole('dialog').filter({ hasText: EN.common.CREATE_TASK });
	await expect(assignModal).toHaveCount(1, { timeout: 15_000 });
	await expect
		.poll(async () => flat(await assignModal.innerText()), { timeout: 20_000 })
		.toContain(EN.common.ASSIGN_TASK_TO + ' ' + PAUSED_NAME);

	const taskRow = assignModal.locator('li').filter({ hasText: EXTRA_TASK_TITLE }).first();
	await expect(taskRow).toBeVisible({ timeout: 20_000 });
	await taskRow.click({ timeout: 15_000 });

	const assigned = await harness.waitForCall('PUT', taskRoute(EXTRA_TASK_ID));
	const assignedMembers = (assigned.body?.members ?? []) as Record<string, unknown>[];
	expect(assigned.body?.id).toBe(EXTRA_TASK_ID);
	expect(assigned.body?.title).toBe(EXTRA_TASK_TITLE);
	/* `updateTask({ ...task, members: [...task.members, member] })` (`use-team-member-mutations.ts:56-77` →
	   `task.service.ts:284-326`); the member object carries the ACTIVE team id, not the row's team. */
	expect(assignedMembers.map((member) => member.id)).toEqual([paused.id]);
	expect(assignedMembers.map((member) => member.userId)).toEqual([paused.userId]);
	expect(assignedMembers.map((member) => member.organizationTeamId)).toEqual([ids.teamA]);
	const storedAssigned = (harness.store().tasks.find((item) => item.id === EXTRA_TASK_ID)?.members ?? []) as Record<
		string,
		unknown
	>[];
	expect(storedAssigned.map((member) => member.id)).toEqual([paused.id]);

	await parkPointer(page);
	const assignedToast = EN.toasts.teams.TASK_ASSIGNED_TO_MEMBER.replace('{title}', EXTRA_TASK_TITLE).replace(
		'{name}',
		PAUSED_NAME
	);
	await expect(toastOf(page, assignedToast)).toBeVisible({ timeout: 10_000 });
	await expect(assignModal).toHaveCount(0, { timeout: 10_000 });
	await closeMenu(page);

	/* The row after the write is word for word what it was: its task cell follows `member.activeTaskId` of the team
	   answer (`user-team-active-task.tsx:17-25`), and a task write never touches that field. */
	await expect
		.poll(async () => flat(await rowOf(page, TEAM_ALPHA, PAUSED_NAME).innerText()), { timeout: 10_000 })
		.toBe(pausedRowBefore);
	report('assign', { callsAfterPick: harness.shapes(), rowAfter: pausedRowBefore });

	/* `Unassign task` (`user-team-card-menu.tsx:159-166`), on the manager's own row, which has an active task:
	   `PUT /api/tasks/<id>` with this member out of `members` (`use-team-member-mutations.ts:84-107`). */
	harness.resetCalls();
	const membersBefore = (
		(harness.store().tasks.find((item) => item.id === ids.task)?.members ?? []) as Record<string, unknown>[]
	).map((member) => member.id);
	expect(membersBefore).toContain(manager.id);

	await openRowMenu(page, TEAM_ALPHA, MANAGER_NAME);
	await menuItem(page, EN.common.UNASSIGN_TASK).click({ timeout: 15_000 });
	const unassigned = await harness.waitForCall('PUT', taskRoute(ids.task));
	expect(unassigned.body?.id).toBe(ids.task);
	const remainingMembers = ((unassigned.body?.members ?? []) as Record<string, unknown>[]).map((member) => member.id);
	expect(remainingMembers).toEqual(membersBefore.filter((memberId) => memberId !== manager.id));
	/* the row still prints the task title it printed before: the team answer still serves `activeTaskId` for it */
	await expect(rowOf(page, TEAM_ALPHA, MANAGER_NAME)).toContainText(servedTaskTitle, { timeout: 10_000 });
	await closeMenu(page);

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ 3. manager of the team */

test('make a member a manager of the team, and back: the roster sent for the active team', async ({
	page,
	fixture
}) => {
	const { harness, ids, manager, paused, off, beta } = await openAllTeams(page, fixture);
	const rowBefore = await readText(rowOf(page, TEAM_ALPHA, PAUSED_NAME));
	const alphaMemberIds = [manager.id, paused.id, off.id];

	/* Every role action reads the ACTIVE team and sends its whole roster (`use-team-member-role-actions.ts`,
	   `use-get-active-team.ts:11-14`, `rosterWithRole` in `core/lib/utils/settings-team.ts:159-190` →
	   `team.service.ts:309-319`): the body is the active team, all of its members, and the new manager id. */
	harness.resetCalls();
	await openRowMenu(page, TEAM_ALPHA, PAUSED_NAME);
	await menuItem(page, EN.common.MAKE_A_MANAGER).click({ timeout: 15_000 });
	const made = await harness.waitForCall('PUT', teamsDetailRoute(ids.teamA));
	expect(made.body?.id).toBe(ids.teamA);
	expect(made.body?.name).toBe(TEAM_ALPHA);
	expect(made.body?.memberIds).toEqual(alphaMemberIds);
	expect(made.body?.managerIds).toEqual([manager.id, paused.id]);
	expect(storedMember(harness, ids.teamA, paused.id)?.isManager).toBe(true);

	/* The CARDS row prints no manager marker, so the row text does not move. */
	await expect
		.poll(async () => flat(await rowOf(page, TEAM_ALPHA, PAUSED_NAME).innerText()), { timeout: 10_000 })
		.toBe(rowBefore);

	/* The menu now offers the other half of the same item (`managerLabelKey`, `:70-75`). */
	await openRowMenu(page, TEAM_ALPHA, PAUSED_NAME);
	await expectPanelItems(page, [
		EN.common.ASSIGN_TASK,
		SEPARATOR,
		EN.common.UNMAKE_A_MANAGER,
		EN.common.REMOVE,
		SEPARATOR,
		EN.common.plan.SEE_PLANS
	]);
	harness.resetCalls();
	await menuItem(page, EN.common.UNMAKE_A_MANAGER).click({ timeout: 15_000 });
	const unmade = await harness.waitForCall('PUT', teamsDetailRoute(ids.teamA));
	expect(unmade.body?.managerIds).toEqual([manager.id]);
	expect(unmade.body?.memberIds).toEqual(alphaMemberIds);
	expect(storedMember(harness, ids.teamA, paused.id)?.isManager).toBe(false);
	await closeMenu(page);
	await expect
		.poll(async () => flat(await rowOf(page, TEAM_ALPHA, PAUSED_NAME).innerText()), { timeout: 10_000 })
		.toBe(rowBefore);

	/* The same item on the OTHER team's member row still writes the ACTIVE team: `PUT` to the active team id, with
	   the active team's members, and the clicked member added to `managerIds` although they are not one of those
	   members — so that member is not a manager of their own team. */
	harness.resetCalls();
	await openRowMenu(page, TEAM_BETA, BETA_NAME);
	await menuItem(page, EN.common.MAKE_A_MANAGER).click({ timeout: 15_000 });
	const crossTeam = await harness.waitForCall('PUT', teamsDetailRoute(ids.teamA));
	expect(harness.calls().some((call) => call.method === 'PUT' && call.path === teamsDetailRoute(ids.teamB))).toBe(
		false
	);
	expect(crossTeam.body?.id).toBe(ids.teamA);
	expect(crossTeam.body?.memberIds).toEqual(alphaMemberIds);
	expect(crossTeam.body?.managerIds).toEqual([manager.id, beta.id]);
	expect(storedMember(harness, ids.teamB, beta.id)?.isManager).toBe(false);
	await expect(rowOf(page, TEAM_BETA, BETA_NAME)).toHaveCount(1);
	report('role change', {
		made: made.body?.managerIds,
		unmade: unmade.body?.managerIds,
		crossTeam: { path: teamsDetailRoute(ids.teamA), managerIds: crossTeam.body?.managerIds }
	});
});

/* ------------------------------------------------------------------ 4. remove a member */

test('remove a member from one team: the confirmation, the two writes, the rows after', async ({ page, fixture }) => {
	const { harness, ids, manager, paused, off, beta, teams } = await openAllTeams(page, fixture);
	const alphaMembers = teams[0].members.length;
	const betaMembers = teams[1].members.length;

	/* Cancel first. `Remove` is wrapped in `ConfirmDropdown` (`user-team-card-menu.tsx:280-287`,
	   `core/components/common/dropdown.tsx:167-197`): with it open the page holds exactly one `role=dialog`, nested in
	   the menu's own `listitem`, and that dialog holds exactly the two controls the copy names (aria snapshot in
	   `D:/Coding/.tmp/s3-lane-a-allteamsmenu-1.log`). The page also carries a separate empty `role=alert` node,
	   outside the menu — it is not this confirmation, so it is not what is asserted here. */
	harness.resetCalls();
	await openRowMenu(page, TEAM_ALPHA, PAUSED_NAME);
	await menuItem(page, EN.common.REMOVE).click({ timeout: 15_000 });
	const confirmation = page.getByRole('dialog');
	await expect(confirmation).toHaveCount(1, { timeout: 10_000 });
	const cancelButton = confirmation.getByRole('button', { name: EN.common.CANCEL, exact: true });
	await expect(cancelButton).toBeVisible();
	await cancelButton.click({ timeout: 15_000 });
	await expect(confirmation).toHaveCount(0, { timeout: 10_000 });
	await closeMenu(page);
	expect(harness.calls().some((call) => call.method === 'DELETE' || call.method === 'PUT')).toBe(false);

	/* Confirm: the member's tasks in the active team first (`DELETE /api/tasks/employee/<id>?organizationTeamId=`,
	   `task.service.ts:427-433`), then the roster without them (`removeMemberFromTeam`, `settings-team.ts:159-190`). */
	harness.resetCalls();
	await openRowMenu(page, TEAM_ALPHA, PAUSED_NAME);
	await menuItem(page, EN.common.REMOVE).click({ timeout: 15_000 });
	await expect(confirmation).toHaveCount(1, { timeout: 10_000 });
	const confirmButton = confirmation.getByRole('button', { name: EN.common.CONFIRM, exact: true });
	await expect(confirmButton).toBeVisible();
	await expect(confirmation.getByRole('button')).toHaveCount(2);
	await confirmButton.click({ timeout: 15_000 });

	const memberTasks = await harness.waitForCall('DELETE', employeeTasksRoute(paused.id));
	expect(memberTasks.search).toContain(`organizationTeamId=${ids.teamA}`);
	const roster = await harness.waitForCall('PUT', teamsDetailRoute(ids.teamA));
	expect(roster.body?.id).toBe(ids.teamA);
	expect(roster.body?.memberIds).toEqual([manager.id, off.id]);
	expect(roster.body?.managerIds).toEqual([manager.id]);
	expect(storedMember(harness, ids.teamA, paused.id)).toBeUndefined();

	/* The row is gone from that team group only; the other group is as it was served. */
	await expect(rowOf(page, TEAM_ALPHA, PAUSED_NAME)).toHaveCount(0, { timeout: 10_000 });
	await expect(groupRows(page, TEAM_ALPHA)).toHaveCount(alphaMembers - 1);
	await expect(groupRows(page, TEAM_BETA)).toHaveCount(betaMembers);
	await expect(rowOf(page, TEAM_BETA, BETA_NAME)).toHaveCount(1);
	expect(storedMember(harness, ids.teamB, beta.id)?.employeeId).toBe(beta.id);
	report('remove', { calls: harness.shapes(), deleteSearch: memberTasks.search });

	/* The same item on a member of the team that is NOT the active one: both writes name the active team, and the
	   roster it sends is the active team's roster as it already is, so this member keeps their place
	   (`removeMemberFromTeam` reads `getActiveTeam()`, `use-get-active-team.ts:11-14`). */
	harness.resetCalls();
	await openRowMenu(page, TEAM_BETA, BETA_NAME);
	await menuItem(page, EN.common.REMOVE).click({ timeout: 15_000 });
	await expect(confirmation).toHaveCount(1, { timeout: 10_000 });
	await confirmation.getByRole('button', { name: EN.common.CONFIRM, exact: true }).click({ timeout: 15_000 });
	const crossTasks = await harness.waitForCall('DELETE', employeeTasksRoute(beta.id));
	expect(crossTasks.search).toContain(`organizationTeamId=${ids.teamA}`);
	const crossRoster = await harness.waitForCall('PUT', teamsDetailRoute(ids.teamA));
	expect(crossRoster.body?.memberIds).toEqual([manager.id, off.id]);
	await expect(rowOf(page, TEAM_BETA, BETA_NAME)).toHaveCount(1, { timeout: 10_000 });
	await expect(groupRows(page, TEAM_BETA)).toHaveCount(betaMembers);
	expect(storedMember(harness, ids.teamB, beta.id)?.employeeId).toBe(beta.id);
	report('remove a member of the other team', {
		calls: harness.shapes(),
		deleteSearch: crossTasks.search,
		memberIds: crossRoster.body?.memberIds
	});
});

/* ------------------------------------------------------------------ 5. a refused action */

test('a refused member action: 400 then 500, the notice with its reason, the row as it was', async ({
	page,
	fixture,
	shield
}) => {
	const { harness, ids, paused } = await openAllTeams(page, fixture);
	/* Both messages are this file's own words; every console line excused below quotes them exactly. */
	const refused400 = { status: 400, message: 'allteamsmenu stub refused this roster write with 400' };
	const refused500 = { status: 500, message: 'allteamsmenu stub refused this roster write with 500' };
	const rowBefore = await readText(rowOf(page, TEAM_ALPHA, PAUSED_NAME));
	const betaRowsBefore = await readGroupRows(page, TEAM_BETA);
	const notices: string[] = [];

	const refuseOnce = async (refusal: Refusal, reason: string) => {
		harness.resetCalls();
		harness.refuse('teamPut', refusal);
		await openRowMenu(page, TEAM_ALPHA, PAUSED_NAME);
		await menuItem(page, EN.common.MAKE_A_MANAGER).click({ timeout: 15_000 });
		const write = await harness.waitForCall('PUT', teamsDetailRoute(ids.teamA));
		/* the notice and its reason (`use-update-organization-team.ts:42-51` → `toasts.teams.UPDATE_FAILED` with
		   `toasts.REASONS.<the status this file sent>`) */
		await parkPointer(page);
		const notice = toastOf(page, EN.toasts.teams.UPDATE_FAILED).first();
		await expect(notice).toBeVisible({ timeout: 10_000 });
		await expect(notice).toContainText(reason);
		notices.push(flat(await notice.innerText()));
		/* nothing moved: the refused write changed no store, so every row is as it was */
		expect(storedMember(harness, ids.teamA, paused.id)?.isManager).toBe(false);
		await expect
			.poll(async () => flat(await rowOf(page, TEAM_ALPHA, PAUSED_NAME).innerText()), { timeout: 10_000 })
			.toBe(rowBefore);
		await expect
			.poll(async () => (await groupRows(page, TEAM_BETA).allInnerTexts()).map(flat), { timeout: 10_000 })
			.toEqual(betaRowsBefore);
		/* the notice closes on its own; waiting for that keeps the two attempts from reading as one toast */
		await expect(toastOf(page, EN.toasts.teams.UPDATE_FAILED)).toHaveCount(0, { timeout: 20_000 });
		return write;
	};

	await refuseOnce(refused400, EN.toasts.REASONS.INVALID);
	await refuseOnce(refused500, EN.toasts.REASONS.SERVER);

	/* Only the lines these two refusals armed: the client's HTTP error line for each status, and the dev-mode
	   mutation failure carrying the message this stub sent. */
	expect(
		consoleFindings(shield, [
			armedHttpError('PUT', teamsDetailRoute(ids.teamA), refused400.status),
			armedMutationFailure(refused400.message),
			armedHttpError('PUT', teamsDetailRoute(ids.teamA), refused500.status),
			armedMutationFailure(refused500.message)
		])
	).toEqual([]);
	report('refused roster write', { notices, statuses: [refused400.status, refused500.status] });
});

/* ------------------------------------------------------------------ 6. a held write */

test('a held write: the row while the answer is out, and after it lands', async ({ page, fixture }) => {
	const { harness, ids, manager, paused } = await openAllTeams(page, fixture);
	const rowBefore = await readText(rowOf(page, TEAM_ALPHA, PAUSED_NAME));

	harness.holdNext('PUT', teamsDetailRoute(ids.teamA));
	harness.resetCalls();
	try {
		await openRowMenu(page, TEAM_ALPHA, PAUSED_NAME);
		await menuItem(page, EN.common.MAKE_A_MANAGER).click({ timeout: 15_000 });
		const held = await harness.waitForCall('PUT', teamsDetailRoute(ids.teamA));
		/* the write is recorded and still unanswered: this file holds its answer */
		expect(harness.pending().some((call) => call.method === held.method && call.path === held.path)).toBe(true);

		/* While the answer is out, that row's menu trigger is replaced by a spinner
		   (`user-team-card-menu.tsx:92`, `:219`, `:232`); the rest of the row is unchanged. */
		await expect(rowMenuButton(page, TEAM_ALPHA, PAUSED_NAME)).toHaveCount(0, { timeout: 10_000 });
		await expect(
			rowOf(page, TEAM_ALPHA, PAUSED_NAME).locator('[data-slot="spinner"], [class*="animate-spin"]')
		).toHaveCount(1);
		await expect
			.poll(async () => flat(await rowOf(page, TEAM_ALPHA, PAUSED_NAME).innerText()), { timeout: 10_000 })
			.toBe(rowBefore);
		/* another row of the same group keeps its own menu: the pending write belongs to one row */
		await expect(rowMenuButton(page, TEAM_ALPHA, OFF_NAME)).toHaveCount(1);
		/* and nothing has landed yet */
		expect(storedMember(harness, ids.teamA, paused.id)?.isManager).toBe(false);
		report('held roster write', { pending: harness.pending().map((call) => `${call.method} ${call.path}`) });
	} finally {
		harness.releaseHeld();
	}

	/* After the answer: the roster this file held lands, and the row has its menu back. */
	const landed = await harness.waitForCall('PUT', teamsDetailRoute(ids.teamA));
	expect(landed.body?.managerIds).toEqual([manager.id, paused.id]);
	await expect(rowMenuButton(page, TEAM_ALPHA, PAUSED_NAME)).toHaveCount(1, { timeout: 15_000 });
	expect(storedMember(harness, ids.teamA, paused.id)?.isManager).toBe(true);
	await expect
		.poll(async () => flat(await rowOf(page, TEAM_ALPHA, PAUSED_NAME).innerText()), { timeout: 10_000 })
		.toBe(rowBefore);
});

/* ------------------------------------------------------------------ 7. the timer bar */

test('the timer bar follows the served tracking flag: present with it, absent without it', async ({
	page,
	fixture
}) => {
	const { teams } = await openAllTeams(page, fixture);
	const main = pageShell(page);
	const startTimer = page.getByRole('button', { name: EN.hotkeys.START_TIMER, exact: true });
	const stopTimer = page.getByRole('button', { name: EN.hotkeys.STOP_TIMER, exact: true });
	const rowsBefore = await readGroupRows(page, TEAM_ALPHA);

	/* `page-component.tsx:56` passes `showTimer={isTrackingEnabled}` to the layout, and the layout renders the header
	   timer only while that is true (`core/components/layouts/default-layout/page-layout.tsx:106-110`). The served
	   membership row of the signed-in manager allows tracking (`core/stores/timer/active-timer.ts:11-35`,
	   `core/lib/helpers/team-member-tracking.ts:11-15`), so the bar is there. */
	await expect(startTimer).toHaveCount(1, { timeout: 15_000 });
	await expect(stopTimer).toHaveCount(0);
	/* the bar is the positive signal that the header rendered; only then is the tracking-off notice checked */
	await expect(main).not.toContainText(EN.timer.TRACKING_OFF);

	/* The same page with one served value changed: the ACTIVE team's membership row of the signed-in manager says
	   tracking is off. Only the header answers to it. */
	const built = await managedTeams(fixture);
	const offTeams = structuredClone(built.teams);
	offTeams[0].members[0].isTrackingEnabled = false;
	await openAllTeams(page, fixture, { teams: offTeams });

	/* In its place the page prints why (`page-layout.tsx:111-115`, `timer.TRACKING_OFF` and
	   `timer.TRACKING_DISABLED_MESSAGE`). */
	await expect(main).toContainText(EN.timer.TRACKING_OFF, { timeout: 20_000 });
	await expect(main).toContainText(EN.timer.TRACKING_DISABLED_MESSAGE);
	await expect(startTimer).toHaveCount(0);
	await expect(stopTimer).toHaveCount(0);
	/* the rows are the same rows as before */
	await expect(groupRows(page, TEAM_ALPHA)).toHaveCount(teams[0].members.length);
	await expect
		.poll(async () => (await groupRows(page, TEAM_ALPHA).allInnerTexts()).map(flat), { timeout: 10_000 })
		.toEqual(rowsBefore);
});

/* ------------------------------------------------------------------ 8. a refused task read */

test('a refused task read: what the row prints, and that the rows without a task are untouched', async ({
	page,
	fixture,
	shield
}) => {
	const { harness, ids, task } = await openAllTeams(page, fixture);
	const servedTaskTitle = flat(String(task.title));

	/* Both rows of the signed-in manager have an `activeTaskId`, so both fetch their task; the other three rows do
	   not fetch anything and already print the empty cell. */
	const alphaManagerBefore = await readText(rowOf(page, TEAM_ALPHA, MANAGER_NAME));
	const betaManagerBefore = await readText(rowOf(page, TEAM_BETA, MANAGER_NAME));
	expect(alphaManagerBefore).toContain(servedTaskTitle);
	expect(betaManagerBefore).toContain(servedTaskTitle);
	const pausedBefore = await readText(rowOf(page, TEAM_ALPHA, PAUSED_NAME));
	const offBefore = await readText(rowOf(page, TEAM_ALPHA, OFF_NAME));
	const betaMemberBefore = await readText(rowOf(page, TEAM_BETA, BETA_NAME));

	/* Refuse `GET /api/tasks/<id>`, then load the page again. */
	const refused = { status: 500, message: 'allteamsmenu stub refused this task read with 500' };
	harness.resetCalls();
	harness.refuse('taskGet', refused);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect
		.poll(() => harness.calls().some((call) => call.method === 'GET' && call.path === taskRoute(ids.task)), {
			timeout: 30_000
		})
		.toBe(true);
	/* at least one refused read, never an exact count of them */
	expect(
		harness.calls().filter((call) => call.method === 'GET' && call.path === taskRoute(ids.task)).length
	).toBeGreaterThan(0);

	/* The page handled the refusal before its rows are read: its own log of the rejected read is the signal
	   (`user-team-active-task.tsx:17-25`), polled. */
	await expect
		.poll(
			() =>
				shield
					.consoleErrors()
					.some((line) => line.includes(`Error fetching task by ID: ApiError: ${refused.message}`)),
			{ timeout: 30_000 }
		)
		.toBe(true);

	/* A row whose task read was refused prints the empty cell: `getTaskById(member.activeTaskId)` fails, the catch
	   logs it and leaves `activeTask` null, and `user-team-active-task.tsx:37` prints the literal `--`. */
	const alphaManagerAfter = await readText(rowOf(page, TEAM_ALPHA, MANAGER_NAME));
	const betaManagerAfter = await readText(rowOf(page, TEAM_BETA, MANAGER_NAME));
	expect(alphaManagerAfter).not.toContain(servedTaskTitle);
	expect(betaManagerAfter).not.toContain(servedTaskTitle);
	expect(alphaManagerAfter).toContain('--');
	expect(betaManagerAfter).toContain('--');
	/* the rows that never fetched a task are word for word as they were */
	await expect
		.poll(async () => flat(await rowOf(page, TEAM_ALPHA, PAUSED_NAME).innerText()), { timeout: 10_000 })
		.toBe(pausedBefore);
	await expect
		.poll(async () => flat(await rowOf(page, TEAM_ALPHA, OFF_NAME).innerText()), { timeout: 10_000 })
		.toBe(offBefore);
	await expect
		.poll(async () => flat(await rowOf(page, TEAM_BETA, BETA_NAME).innerText()), { timeout: 10_000 })
		.toBe(betaMemberBefore);
	report('refused task read', {
		alphaManagerBefore,
		alphaManagerAfter,
		betaManagerBefore,
		betaManagerAfter
	});

	/* The console holds only what this refusal armed: the client's HTTP error line, and the app's own log of what the
	   read rejected (`user-card.tsx:104-113` and `user-team-active-task.tsx:17-25` both `console.log` the rejection). */
	expect(
		consoleFindings(shield, [
			armedHttpError('GET', taskRoute(ids.task), refused.status),
			new RegExp(`Error fetching task by ID: ApiError: ${escapeForRegex(refused.message)}`)
		])
	).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ 9. the skeleton while the list is held */

test('while the team list read is held: the page is the cards skeleton, with no view switch to use', async ({
	page,
	fixture
}) => {
	const { harness, ids, teams } = await openAllTeams(page, fixture, { holdListRead: true });
	const main = pageShell(page);
	try {
		const held = await harness.waitForCall('GET', TEAMS_LIST_ROUTE);
		expect(harness.pending().some((call) => call.method === held.method && call.path === held.path)).toBe(true);

		/* `page-component.tsx:40-44`: while no team has arrived the page answers with `AllTeamsPageSkeleton`. */
		await expect(main).toContainText(EN.common.ALL_TEAMS, { timeout: 20_000 });
		await expect
			.poll(async () => await main.locator('[class*="animate-pulse"]').count(), { timeout: 20_000 })
			.toBeGreaterThan(0);
		await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(0);
		expect(harness.calls().some((call) => call.path === teamsDetailRoute(ids.teamA))).toBe(false);

		/* The combined variant of the skeleton cannot be reached while the list is held, and this pins why: the
		   skeleton toolbar is `aria-hidden` and its view switch is a bar (`all-teams-page-skeleton.tsx:29-42`,
		   `ViewSwitchSkeleton` `:40`), so while held there is no tab and no combobox to pick; and the variant
		   follows the in-memory `allTeamsHeaderTabs` atom (`core/stores/common/header-tabs.ts:6`, no storage), which
		   a fresh document load starts at CARDS. What is measurable is the CARDS shape: name + count + member rows
		   (`all-teams-page-skeleton.tsx:53-71`). */
		await expect(main.getByRole('tab')).toHaveCount(0);
		await expect(main.getByRole('combobox')).toHaveCount(0);
		report('held list read', {
			pending: harness.pending().map((call) => `${call.method} ${call.path}`),
			tabs: await main.getByRole('tab').count(),
			comboboxes: await main.getByRole('combobox').count()
		});
	} finally {
		harness.releaseHeld();
	}

	/* Once the list is answered the same page is the team groups it serves. */
	await expect(page.locator('[data-slot="accordion-item"]')).toHaveCount(teams.length, { timeout: 30_000 });
});
