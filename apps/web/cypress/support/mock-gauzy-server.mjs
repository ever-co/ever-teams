import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers';
import { URL } from 'node:url';

const jsonClone = (value) => JSON.parse(JSON.stringify(value));
const pagination = (items = []) => ({ items, total: items.length });
const TRUSTED_BROWSER_ORIGINS = new Set(['http://127.0.0.1:3030', 'http://localhost:3030']);

function buildData(fixture, scenario, requestUrl, requestTenantId) {
	const { ids, names } = fixture;
	const scopeB =
		requestTenantId === ids.tenantB ||
		requestUrl.searchParams.get('tenantId') === ids.tenantB ||
		requestUrl.searchParams.get('where[tenantId]') === ids.tenantB ||
		scenario.scope === 'B';
	const tenantId = scopeB ? ids.tenantB : ids.tenantA;
	const organizationId = scopeB ? ids.organizationB : ids.organizationA;
	const teamId = scopeB ? ids.teamB : ids.teamA;
	const organizationName = scopeB ? names.organizationB : names.organizationA;
	const teamName = scopeB ? names.teamB : names.teamA;

	const rolePermissions = [
		'TIME_TRACKER',
		'ORG_TASK_ADD',
		'ORG_TASK_EDIT',
		'ORG_INVITE_EDIT',
		'ORG_EMPLOYEES_EDIT'
	].map((permission, index) => ({
		id: `dddddddd-dddd-4ddd-8ddd-${String(index + 1).padStart(12, '0')}`,
		roleId: ids.role,
		permission,
		enabled: true,
		tenantId
	}));
	const role = {
		id: ids.role,
		name: scenario.manager === false ? 'EMPLOYEE' : 'ADMIN',
		isSystem: true,
		rolePermissions,
		tenantId
	};
	const organization = {
		id: organizationId,
		name: organizationName,
		isDefault: true,
		profile_link: scopeB ? 'fixture-organization-b' : 'fixture-organization-a',
		totalEmployees: 3,
		banner: null,
		currency: 'USD',
		timeZone: 'UTC',
		allowManualTime: true,
		allowModifyTime: true,
		allowDeleteTime: true,
		tenantId
	};
	const baseUser = {
		id: ids.user,
		name: names.user,
		firstName: 'Fixture',
		lastName: 'Manager',
		email: 'manager@example.test',
		timeZone: 'UTC',
		isEmailVerified: true,
		tenantId,
		roleId: ids.role,
		role,
		defaultOrganizationId: organizationId,
		lastOrganizationId: organizationId,
		defaultTeamId: teamId,
		lastTeamId: teamId,
		employeeId: ids.employee
	};
	const teammateUser = {
		id: ids.teammateUser,
		name: names.teammate,
		firstName: 'Fixture',
		lastName: 'Teammate',
		email: 'teammate@example.test',
		timeZone: 'UTC',
		isEmailVerified: true,
		tenantId,
		employeeId: ids.teammateEmployee
	};
	const deniedUser = {
		id: ids.deniedUser,
		name: names.denied,
		firstName: 'Fixture',
		lastName: 'Restricted',
		email: 'restricted@example.test',
		timeZone: 'UTC',
		isEmailVerified: true,
		tenantId,
		employeeId: ids.deniedEmployee
	};
	const makeEmployee = (id, user) => ({
		id,
		userId: user.id,
		user: { ...user },
		fullName: user.name,
		isTrackingEnabled: true,
		isTrackingTime: false,
		isActive: true,
		organizationId,
		tenantId
	});
	const employees = {
		self: makeEmployee(ids.employee, baseUser),
		teammate: makeEmployee(ids.teammateEmployee, teammateUser),
		denied: makeEmployee(ids.deniedEmployee, deniedUser)
	};
	baseUser.employee = employees.self;
	const statuses = [
		{
			id: ids.todoStatus,
			name: 'open',
			value: 'open',
			color: '#94a3b8',
			order: 1,
			isSystem: true,
			isDefault: true,
			isTodo: true,
			tenantId,
			organizationId,
			organizationTeamId: teamId
		},
		{
			id: ids.inProgressStatus,
			name: 'in-progress',
			value: 'in-progress',
			color: '#6366f1',
			order: 2,
			isSystem: true,
			isInProgress: true,
			tenantId,
			organizationId,
			organizationTeamId: teamId
		}
	];
	const task = {
		id: ids.task,
		title: names.task,
		number: 1,
		public: false,
		status: 'open',
		taskStatusId: ids.todoStatus,
		taskStatus: statuses[0],
		estimate: 3600,
		description: 'Synthetic browser fixture task',
		organizationId,
		tenantId,
		members: [employees.self],
		tags: [],
		teams: [{ id: teamId, name: teamName, organizationId, tenantId }]
	};
	const makeMember = ({ id, employee, isManager }) => ({
		id,
		employeeId: employee.id,
		employee,
		user: employee.user,
		isManager,
		isActive: true,
		isTrackingEnabled: true,
		activeTaskId: employee.id === ids.employee ? ids.task : null,
		activeTask: employee.id === ids.employee ? task : null,
		organizationTeamId: teamId,
		organizationId,
		tenantId,
		roleId: ids.role,
		role,
		totalWorkedTasks: [],
		totalTodayTasks: []
	});
	const members = [
		makeMember({ id: ids.member, employee: employees.self, isManager: scenario.manager !== false }),
		makeMember({ id: ids.teammateMember, employee: employees.teammate, isManager: false }),
		makeMember({
			id: '66666666-6666-4666-8666-333333333333',
			employee: employees.denied,
			isManager: false
		})
	];
	const project = {
		id: ids.project,
		name: 'Fixture Project',
		public: true,
		owner: null,
		code: 'FIX',
		currency: 'USD',
		organizationId,
		tenantId,
		members: [employees.self],
		teams: [],
		tags: []
	};
	const team = {
		id: teamId,
		name: teamName,
		organizationId,
		tenantId,
		public: true,
		profile_link: fixture.profileLink,
		prefix: scopeB ? 'FIB' : 'FIA',
		shareProfileView: scenario.shareProfileView === true,
		requirePlanToTrack: scenario.requirePlanToTrack === true,
		members,
		managers: members.filter((member) => member.isManager),
		projects: [project],
		tasks: [task],
		statuses
	};
	const today = new Date().toISOString().slice(0, 10);
	const plan = {
		id: ids.plan,
		date: today,
		workTimePlanned: 8,
		status: 'ready',
		employeeId: ids.employee,
		organizationTeamId: teamId,
		organizationId,
		tenantId,
		tasks: scenario.hasPlan === false ? [] : [task]
	};
	const timerStatus = {
		duration: 0,
		running: scenario.timerRunning === true,
		lastLog: {
			source: 'TEAMS',
			taskId: ids.task,
			startedAt: new Date().toISOString()
		},
		lastWorkedTask: task
	};
	const workspaces = {
		workspaces: [
			{
				user: {
					id: ids.user,
					email: baseUser.email,
					name: names.user,
					lastTeamId: ids.teamA,
					lastLoginAt: null,
					tenant: { id: ids.tenantA, name: names.workspaceA }
				},
				token: 'synthetic-workspace-token-a',
				current_teams: [
					{
						team_id: ids.teamA,
						team_name: names.teamA,
						team_member_count: 3,
						profile_link: fixture.profileLink,
						prefix: 'FIA'
					}
				]
			},
			{
				user: {
					id: ids.user,
					email: baseUser.email,
					name: names.user,
					lastTeamId: ids.teamB,
					lastLoginAt: null,
					tenant: { id: ids.tenantB, name: names.workspaceB }
				},
				token: 'synthetic-workspace-token-b',
				current_teams: [
					{
						team_id: ids.teamB,
						team_name: names.teamB,
						team_member_count: 3,
						profile_link: fixture.profileLink,
						prefix: 'FIB'
					}
				]
			}
		],
		confirmed_email: baseUser.email,
		show_popup: false,
		total_workspaces: 2
	};
	const metadata = {
		taskStatuses: pagination(statuses),
		taskPriorities: pagination([]),
		taskSizes: pagination([]),
		taskLabels: pagination([]),
		taskVersions: pagination([]),
		issueTypes: pagination([]),
		relatedIssueTypes: pagination([])
	};

	return {
		baseUser,
		employees,
		members,
		metadata,
		organization,
		plan,
		project,
		role,
		rolePermissions,
		statuses,
		task,
		team,
		timerStatus,
		workspaces
	};
}

/** Marks a `routeResponse` answer that goes out with this HTTP status instead of 200 (symbol keys are not serialized). */
const HTTP_STATUS = Symbol('http-status');

/** An unsigned token shaped like Gauzy's: the web app only decodes its claims (`organizationId` since Gauzy #11316). */
function syntheticToken(userId, organizationId, rotation) {
	const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: userId, organizationId, iat: now, exp: now + 86_400, jti: rotation };
	return `${part({ alg: 'none', typ: 'JWT' })}.${part(claims)}.fixture`;
}

/** Where the paywall of the opening sends an address without the product (#5025). */
const WORKSPACE_CHECKOUT_URL = 'https://checkout.example.test/?product=ever-teams&email=manager%40example.test';

/** The ids of the workspace the creation flow sets up (#5025). */
const NEW_WORKSPACE = Object.freeze({
	signinToken: 'synthetic-new-workspace-signin',
	userId: '50250000-0000-4000-8000-000000000001',
	tenantId: '50250000-0000-4000-8000-000000000002',
	organizationId: '50250000-0000-4000-8000-000000000003',
	employeeId: '50250000-0000-4000-8000-000000000004',
	teamId: '50250000-0000-4000-8000-000000000005',
	memberId: '50250000-0000-4000-8000-000000000006'
});

/**
 * Another workspace for the signed-in person (#5025): Gauzy opens the account it is created with, then the sign-up's
 * steps set it up (workspace sign-in, tenant, organization, employee, team, invitations). What each step was asked is
 * recorded in `state.workspaceCreation`; `scenario.tenantRegistrationClosed` makes Gauzy refuse the opening, and
 * `scenario.newWorkspaceRefreshFails` the new workspace's session once it is set up. Once created, the requests of the
 * new workspace (its `tenant-id`) read its name and its team, as Gauzy answers them.
 */
function workspaceCreationResponse(method, pathname, data, state, body, requestTenantId) {
	const created = state.workspaceCreation;
	const isNewWorkspace = requestTenantId === NEW_WORKSPACE.tenantId && created.tenant !== null;
	if (isNewWorkspace && method === 'GET') {
		// The account the workspace was created with, its employee there (the app reads its scope from it), and the
		// first team, whose only member is its creator, as its manager
		const self = data.team.members.find((member) => member.employeeId === data.baseUser.employee.id);
		const user = { ...self.employee.user, id: NEW_WORKSPACE.userId, tenantId: NEW_WORKSPACE.tenantId };
		const employee = {
			...self.employee,
			id: NEW_WORKSPACE.employeeId,
			userId: NEW_WORKSPACE.userId,
			user,
			tenantId: NEW_WORKSPACE.tenantId,
			organizationId: NEW_WORKSPACE.organizationId
		};
		const member = {
			...self,
			id: NEW_WORKSPACE.memberId,
			employeeId: employee.id,
			employee,
			user,
			isManager: true,
			activeTaskId: null,
			activeTask: null,
			organizationTeamId: NEW_WORKSPACE.teamId,
			organizationId: NEW_WORKSPACE.organizationId,
			tenantId: NEW_WORKSPACE.tenantId
		};
		const team = {
			...data.team,
			id: NEW_WORKSPACE.teamId,
			name: created.team?.name ?? data.team.name,
			tenantId: NEW_WORKSPACE.tenantId,
			organizationId: NEW_WORKSPACE.organizationId,
			members: [member],
			managers: [member],
			projects: [],
			tasks: []
		};
		if (pathname === '/api/user/me') {
			const tenant = { ...data.baseUser.tenant, id: NEW_WORKSPACE.tenantId, name: created.tenant };
			return {
				...data.baseUser,
				id: NEW_WORKSPACE.userId,
				tenantId: NEW_WORKSPACE.tenantId,
				tenant,
				employeeId: employee.id,
				employee,
				defaultOrganizationId: NEW_WORKSPACE.organizationId,
				lastOrganizationId: NEW_WORKSPACE.organizationId,
				defaultTeamId: NEW_WORKSPACE.teamId,
				lastTeamId: NEW_WORKSPACE.teamId
			};
		}
		if (pathname === '/api/organization-team') return pagination([team]);
		if (pathname === `/api/organization-team/${NEW_WORKSPACE.teamId}`) return team;
	}
	// Gauzy lists the workspaces of the address: the new one joins them
	if (created.tenant !== null && pathname === '/api/auth/workspaces' && method === 'GET') {
		const [first] = data.workspaces.workspaces;
		const teamName = created.team?.name ?? created.tenant;
		const entry = {
			user: {
				...first.user,
				id: NEW_WORKSPACE.userId,
				lastTeamId: NEW_WORKSPACE.teamId,
				tenant: { id: NEW_WORKSPACE.tenantId, name: created.tenant }
			},
			token: 'synthetic-workspace-token-new',
			current_teams: [
				{
					...first.current_teams[0],
					team_id: NEW_WORKSPACE.teamId,
					team_name: teamName,
					team_member_count: 1,
					prefix: teamName.slice(0, 3).toUpperCase()
				}
			]
		};
		const workspaces = [...data.workspaces.workspaces, entry];
		return { ...data.workspaces, workspaces, total_workspaces: workspaces.length };
	}
	if (pathname === '/api/auth/workspaces' && method === 'POST') {
		created.openings += 1;
		if (state.scenario.tenantRegistrationClosed) {
			return {
				[HTTP_STATUS]: 403,
				statusCode: 403,
				message: 'Creating new workspaces is disabled on this server.'
			};
		}
		// `scenario.workspacePaywall`: the sign-up's paywall, and an address without the product
		if (state.scenario.workspacePaywall) {
			return {
				[HTTP_STATUS]: 403,
				statusCode: 403,
				message: 'A subscription is required before you can open another workspace.',
				checkoutUrl: WORKSPACE_CHECKOUT_URL
			};
		}
		return { email: data.baseUser.email, token: NEW_WORKSPACE.signinToken };
	}
	// The new workspace's session, a token the app can read (the other refreshes answer a placeholder).
	// `scenario.newWorkspaceRefreshFails`: Gauzy cannot answer it, once the workspace and its team exist.
	if (pathname === '/api/auth/refresh-token' && body?.refresh_token === 'synthetic-new-workspace-refresh') {
		if (state.scenario.newWorkspaceRefreshFails) {
			return { [HTTP_STATUS]: 500, statusCode: 500, message: 'Internal server error' };
		}
		return {
			token: syntheticToken(NEW_WORKSPACE.userId, NEW_WORKSPACE.organizationId, 'new-workspace-refreshed'),
			refresh_token: 'synthetic-new-workspace-refresh'
		};
	}
	if (pathname === '/api/auth/signin.workspace' && method === 'POST') {
		if (body?.token !== NEW_WORKSPACE.signinToken) {
			return { [HTTP_STATUS]: 401, statusCode: 401, message: 'Unauthorized' };
		}
		return {
			user: {
				id: NEW_WORKSPACE.userId,
				email: body.email,
				tenantId: null,
				firstName: 'Fixture',
				lastName: 'Manager'
			},
			token: syntheticToken(NEW_WORKSPACE.userId, null, 'new-workspace'),
			refresh_token: 'synthetic-new-workspace-refresh'
		};
	}
	if (pathname === '/api/tenant' && method === 'POST') {
		created.tenant = body?.name ?? null;
		return { id: NEW_WORKSPACE.tenantId, name: body?.name };
	}
	if (pathname === '/api/organization' && method === 'POST') {
		created.organization = body?.name ?? null;
		return { id: NEW_WORKSPACE.organizationId, name: body?.name, tenantId: body?.tenantId };
	}
	if (pathname === '/api/employee' && method === 'POST') {
		created.employeeUserId = body?.userId ?? null;
		return { id: NEW_WORKSPACE.employeeId, userId: body?.userId, organizationId: body?.organizationId };
	}
	if (pathname === '/api/organization-team' && method === 'POST') {
		created.team = { name: body?.name ?? null, managerIds: body?.managerIds ?? [] };
		return { id: NEW_WORKSPACE.teamId, name: body?.name };
	}
	if (pathname === '/api/invite/emails' && method === 'POST') {
		created.invites = { emails: body?.emailIds ?? [], teamIds: body?.teamIds ?? [] };
		return pagination([]);
	}
	return undefined;
}

function routeResponse(method, pathname, requestUrl, data, fixture, state, body, requestTenantId) {
	const { ids } = fixture;
	const creation = workspaceCreationResponse(method, pathname, data, state, body, requestTenantId);
	if (creation !== undefined) return creation;
	if (pathname === '/api/user/me') return data.baseUser;
	if (pathname === '/api/auth/workspaces') return data.workspaces;
	if (pathname === '/api/auth/refresh-token')
		return { token: 'synthetic-refreshed-token', refresh_token: 'synthetic-refresh-token' };
	// Tokens for another organization of the caller's tenant (the web app switches when the token's differs). Like
	// Gauzy, only an organization of the request's own tenant (its `tenant-id`) is granted: an unknown tenant, or an
	// organization of the other one, is refused without tokens, so a tenant-boundary regression cannot pass unnoticed.
	if (pathname === '/api/auth/switch-organization' && method === 'POST') {
		const organizationId = typeof body?.organizationId === 'string' ? body.organizationId : '';
		const tenantOrganization = { [ids.tenantA]: ids.organizationA, [ids.tenantB]: ids.organizationB };
		const allowed = typeof requestTenantId === 'string' ? tenantOrganization[requestTenantId] : undefined;
		if (!allowed || organizationId !== allowed) {
			return { [HTTP_STATUS]: 401, statusCode: 401, message: 'Unauthorized' };
		}
		return {
			token: syntheticToken(ids.user, organizationId, `switched-${organizationId}`),
			refresh_token: 'synthetic-refresh-token'
		};
	}

	if (pathname === '/api/organization-team' && method === 'GET') return pagination([data.team]);
	if (/^\/api\/organization-team\/[^/]+$/.test(pathname) && method === 'GET') return data.team;
	if (/^\/api\/public\/team\/[^/]+\/[^/]+$/.test(pathname)) {
		return { ...data.team, statuses: data.statuses, priorities: [], sizes: [], labels: [], issueTypes: [] };
	}
	if (pathname === '/api/employee') return pagination(data.members);
	if (pathname === '/api/invite' || pathname === '/api/invite/me') {
		return pagination([
			{
				id: ids.invite,
				email: 'invited@example.test',
				status: 'INVITED',
				tenantId: data.team.tenantId,
				organizationId: data.team.organizationId
			}
		]);
	}
	if (pathname === '/api/roles/options') return data.role;
	if (pathname === '/api/roles') return pagination([data.role]);
	if (pathname === '/api/role-permissions/me') return data.rolePermissions;
	if (/^\/api\/role-permissions\/[^/]+$/.test(pathname)) return pagination(data.rolePermissions);

	if ((pathname === '/api/tasks' || pathname === '/api/tasks/team') && method === 'GET')
		return pagination([data.task]);
	if (/^\/api\/tasks\/[^/]+$/.test(pathname) && method === 'GET') return data.task;
	if (/^\/api\/tasks\/[^/]+$/.test(pathname) && ['PATCH', 'PUT'].includes(method)) {
		state.mutationProof.updatedTask = true;
		state.mutationProof.inProgressTaskStatusPreserved =
			body?.status === 'in-progress' && body?.taskStatusId === ids.inProgressStatus;
		return { ...data.task, ...body };
	}
	if (pathname === '/api/task-metadata/bootstrap') return data.metadata;
	if (pathname === '/api/task-statuses') return data.metadata.taskStatuses;
	if (pathname === '/api/task-priorities') return data.metadata.taskPriorities;
	if (pathname === '/api/task-sizes') return data.metadata.taskSizes;
	if (pathname === '/api/task-versions') return data.metadata.taskVersions;
	if (pathname === '/api/issue-types') return data.metadata.issueTypes;
	if (pathname === '/api/task-related-issue-types') return data.metadata.relatedIssueTypes;
	if (pathname === '/api/tags' || pathname === '/api/tags/level') return data.metadata.taskLabels;

	if (pathname === '/api/timesheet/timer/status') return data.timerStatus;
	if (pathname === '/api/timesheet/timer/start') {
		state.mutationProof.startedTimer = true;
		state.scenario.timerRunning = true;
		return { success: true };
	}
	if (pathname === '/api/timesheet/timer/stop') {
		state.scenario.timerRunning = false;
		return { success: true };
	}
	if (pathname === '/api/timesheet/time-slot') return { success: true };
	if (pathname === '/api/daily-plan' || pathname === '/api/daily-plan/me') return pagination([data.plan]);
	if (/^\/api\/daily-plan\/(?:employee|task)\//.test(pathname)) return pagination([data.plan]);

	if (pathname === '/api/organization-projects') return pagination([data.project]);
	if (/^\/api\/organization-projects\/[^/]+$/.test(pathname)) return data.project;
	if (pathname === '/api/currency') {
		return pagination([
			{
				id: 'eeeeeeee-eeee-4eee-8eee-111111111111',
				updatedAt: new Date().toISOString(),
				isoCode: 'USD',
				currency: 'US Dollar',
				tenantId: data.team.tenantId,
				organizationId: data.team.organizationId
			}
		]);
	}
	if (/^\/api\/organization\/[^/]+$/.test(pathname)) return data.organization;
	if (pathname === '/api/languages') return pagination([]);

	if (pathname === '/api/timesheet/statistics/profile-activity') {
		const employeeId = requestUrl.searchParams.get('employeeId') ?? ids.employee;
		const startDate = requestUrl.searchParams.get('startDate') ?? new Date().toISOString().slice(0, 10);
		const endDate = requestUrl.searchParams.get('endDate') ?? new Date().toISOString().slice(0, 10);
		const timeZone = requestUrl.searchParams.get('timeZone') ?? 'UTC';
		const includeDaily = requestUrl.searchParams.get('includeDaily') === 'true';
		return {
			employeeId,
			activeDays: 3,
			totalDuration: 10_800,
			firstActiveOn: startDate,
			lastActiveOn: startDate,
			period: { startDate, endDate, timeZone },
			...(includeDaily ? { daily: [{ date: startDate, duration: 3600 }] } : {})
		};
	}
	if (pathname === '/api/timesheet/time-log/time-limit') return [];
	// A member's day (Work diary, Calendar, Timesheets) comes as plain lists: logs, ten-minute slots, apps and sites
	if (method === 'GET' && pathname === '/api/timesheet/time-log') return [];
	if (method === 'GET' && pathname === '/api/timesheet/statistics/time-slots') return [];
	if (method === 'GET' && pathname === '/api/timesheet/activity') return [];
	if (pathname === '/api/timesheet/statistics/counts') return { today: 0, week: 0, month: 0 };
	if (pathname.startsWith('/api/timesheet/statistics/tasks')) return { global: {}, today: {} };
	if (/^\/api\/organization-team-employee\//.test(pathname))
		return body ?? { affected: 1, generatedMaps: [], raw: [] };
	// Scheduled meetings (employee appointments): kept for the session, so a meeting scheduled shows in the agenda
	if (pathname === '/api/employee-appointment' && method === 'GET') return pagination(state.appointments);
	if (pathname === '/api/employee-appointment' && method === 'POST') {
		const appointment = { id: `appointment-${state.appointments.length + 1}`, status: null, ...body };
		state.appointments.push(appointment);
		return appointment;
	}
	const appointmentPath = /^\/api\/employee-appointment\/([^/]+)$/.exec(pathname);
	if (appointmentPath && method === 'DELETE') {
		state.appointments = state.appointments.filter((appointment) => appointment.id !== appointmentPath[1]);
		return { affected: 1, raw: [] };
	}
	if (pathname === '/api/favorite') return pagination([]);
	if (pathname === '/api/organization-team-join') return pagination([]);

	if (method === 'DELETE') return { affected: 1, raw: [] };
	if (method !== 'GET') return body ?? { success: true };
	return pagination([]);
}

const NOT_FOUND = { status: 404, payload: { statusCode: 404, message: 'Not Found' } };
const UNAUTHORIZED = { status: 401, payload: { statusCode: 401, message: 'Unauthorized' } };

/** What the statistics plugin's `status` answers its operator. */
function operatorStatus(scenario) {
	const enabled = scenario.statsEnabledUi !== false;
	return {
		enabled,
		reason: enabled ? null : 'ui',
		install_source: 'self-hosted',
		instance_id: null,
		key_id: 'fixture-key-id',
		serves: ['gauzy', 'teams'],
		country: 'ZZ',
		api_url: 'http://127.0.0.1:3989',
		next_send_at: null,
		last_attempt: null,
		key_warning: null,
		schema_url: 'http://127.0.0.1:3989/v1/stats/schema/ever.stats.v1'
	};
}

/** The one integration the connection's organization routes list. */
const STATS_LINK_INTEGRATION = {
	key: 'stats_link',
	name: 'Statistics link',
	description: 'Links the anonymous usage statistics of this installation to the organization.',
	direction: 'out',
	instance_wide: true,
	app_ever_co_only: false,
	scope_version: 1,
	scope: [
		{
			field_path: 'stats.instance_id',
			direction: 'out',
			form: 'opaque id',
			frequency: 'once',
			purpose: 'link the statistics',
			retention: 'while linked'
		}
	],
	revoke_effect: 'unlinked',
	state: 'not_linked',
	enabled: false,
	pending_remote_revoke: false,
	revoke_source: null,
	revoked_at: null,
	consent: null,
	policy: 'allowed'
};

/** The operator's switch: a boolean only, stored in the scenario. */
function statsToggle(state, body, signedIn) {
	if (typeof body?.enabled !== 'boolean') {
		return { status: 400, payload: { statusCode: 400, message: 'enabled must be true or false' } };
	}
	state.scenario.statsEnabledUi = body.enabled;
	const keys = Object.keys(body).sort((a, b) => a.localeCompare(b));
	state.everPlatform.toggles.push({ enabled: body.enabled, withBearer: signedIn, keys });
	return { status: 200, payload: operatorStatus(state.scenario) };
}

/** `/api/ever-stats/*`: `state` (paired only, no credential) and the operator's routes. */
function statsResponse(method, pathname, signedIn, state, body) {
	const scenario = state.scenario;
	if (pathname === '/api/ever-stats/state' && method === 'GET') {
		state.everPlatform.stateReads += 1;
		if (scenario.statsPaired === false) return NOT_FOUND;
		return { status: 200, payload: { enabled: scenario.statsEnabledUi !== false } };
	}
	if (!signedIn) return UNAUTHORIZED;
	if (scenario.statsOperator === false) return NOT_FOUND;
	if (pathname === '/api/ever-stats/status' && method === 'GET')
		return { status: 200, payload: operatorStatus(scenario) };
	if (pathname === '/api/ever-stats/enabled' && method === 'PUT') return statsToggle(state, body, signedIn);
	// `last` answers 404 until the API has sent a report.
	return NOT_FOUND;
}

/** `/api/ever-connect/*`: the connection's organization routes, for a signed-in person. */
function connectResponse(method, pathname, signedIn, scenario) {
	if (!signedIn) return UNAUTHORIZED;
	if (scenario.connectHealth === false) return NOT_FOUND;
	const connected = scenario.connectConnected !== false;
	const routes = {
		'GET /api/ever-connect/health': () => ({ connected }),
		'GET /api/ever-connect/status': () => ({
			enabled: true,
			install_source: 'self-hosted',
			managed_by: 'operator',
			operator: true,
			connected,
			connection: null,
			link: null,
			pending_approvals: [],
			in_product_consent: false
		}),
		'GET /api/ever-connect/integrations': () => [STATS_LINK_INTEGRATION],
		'GET /api/ever-connect/entitlement': () => ({ instance: null, link: null })
	};
	const answer = routes[`${method} ${pathname}`];
	return answer ? { status: 200, payload: answer() } : NOT_FOUND;
}

/**
 * The paired API's Ever Platform routes (anonymous usage statistics and the connection's
 * organization routes), as the Gauzy plugins answer them. Scenario switches: `statsPaired` (the API
 * serves `teams` in EVER_STATS_SERVES: `state` exists), `statsEnabledUi` (the operator's switch),
 * `statsOperator` (the signed-in person is the operator: the operator routes answer instead of 404),
 * `connectHealth` (the connection module answers `health`) and `connectConnected`.
 * Answers `{ status, payload }`, or null for every other route.
 */
function everPlatformResponse(method, pathname, request, state, body) {
	const authorization = request.headers.authorization;
	const signedIn = typeof authorization === 'string' && authorization.startsWith('Bearer ');
	if (pathname.startsWith('/api/ever-stats/')) return statsResponse(method, pathname, signedIn, state, body);
	if (pathname.startsWith('/api/ever-connect/')) return connectResponse(method, pathname, signedIn, state.scenario);
	return null;
}

async function readJsonBody(request) {
	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	if (!chunks.length) return undefined;
	try {
		return JSON.parse(Buffer.concat(chunks).toString('utf8'));
	} catch {
		return undefined;
	}
}

export async function createMockGauzyServer({ fixture, port = 3988 } = {}) {
	if (!fixture) throw new Error('A synthetic Gauzy fixture is required.');
	const state = {
		startedAt: performance.now(),
		requests: [],
		scenario: {
			delays: {},
			hasPlan: true,
			manager: true,
			requirePlanToTrack: false,
			scope: 'A',
			shareProfileView: false,
			timerRunning: false,
			statsPaired: true,
			statsEnabledUi: true,
			statsOperator: true,
			connectHealth: true,
			connectConnected: true
		},
		everPlatform: { stateReads: 0, toggles: [] },
		appointments: [],
		workspaceCreation: {
			openings: 0,
			tenant: null,
			organization: null,
			employeeUserId: null,
			team: null,
			invites: null
		},
		mutationProof: {
			startedTimer: false,
			updatedTask: false,
			inProgressTaskStatusPreserved: false
		}
	};

	const handleRequest = async (request, response) => {
		const startMs = performance.now() - state.startedAt;
		const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
		const method = String(request.method ?? 'GET').toUpperCase();
		const requestOrigin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
		if (requestOrigin && !TRUSTED_BROWSER_ORIGINS.has(requestOrigin)) {
			response.writeHead(403, { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' });
			response.end(JSON.stringify({ error: 'Untrusted synthetic browser origin.' }));
			return;
		}
		const cors = {
			'access-control-allow-credentials': 'true',
			'access-control-allow-headers':
				'authorization, content-type, tenant-id, organization-id, organization-team-id',
			'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
			'access-control-expose-headers': '*',
			'cache-control': 'no-store',
			...(requestOrigin ? { 'access-control-allow-origin': requestOrigin } : {})
		};
		if (method === 'OPTIONS') {
			response.writeHead(204, cors);
			response.end();
			return;
		}

		const tenantId =
			requestUrl.searchParams.get('tenantId') ??
			requestUrl.searchParams.get('where[tenantId]') ??
			request.headers['tenant-id'];
		const delayMs = Number(
			state.scenario.delays?.[`${tenantId}:${requestUrl.pathname}`] ??
				state.scenario.delays?.[tenantId] ??
				state.scenario.delays?.[requestUrl.pathname] ??
				0
		);
		if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
		const body = await readJsonBody(request);
		const data = buildData(
			fixture,
			state.scenario,
			requestUrl,
			typeof tenantId === 'string' ? tenantId : undefined
		);
		const everPlatform = everPlatformResponse(method, requestUrl.pathname, request, state, body);
		const payload = everPlatform
			? everPlatform.payload
			: // The organization switch is authorized on the tenant-id HEADER only (a query value must not override it)
				routeResponse(
					method,
					requestUrl.pathname,
					requestUrl,
					data,
					fixture,
					state,
					body,
					request.headers['tenant-id']
				);
		const status = everPlatform ? everPlatform.status : (payload?.[HTTP_STATUS] ?? 200);
		const endMs = performance.now() - state.startedAt;
		// The web app's statistics reporter reads `state` every few seconds in the browser runs: counted, not
		// recorded with the requests the pages make.
		if (requestUrl.pathname !== '/api/ever-stats/state') {
			state.requests.push({
				method,
				path: requestUrl.pathname,
				query: requestUrl.searchParams.toString(),
				startMs,
				endMs,
				status
			});
		}
		response.writeHead(status, { ...cors, 'content-type': 'application/json; charset=utf-8' });
		response.end(JSON.stringify(payload));
	};
	const server = createServer((request, response) => {
		void handleRequest(request, response).catch((error) => {
			if (request.aborted && error?.code === 'ECONNRESET') return;
			if (response.destroyed || response.writableEnded) return;
			if (response.headersSent) {
				response.destroy(error instanceof Error ? error : undefined);
				return;
			}
			response.writeHead(500, {
				'cache-control': 'no-store',
				'content-type': 'application/json; charset=utf-8'
			});
			response.end(JSON.stringify({ error: 'Synthetic Gauzy request failed.' }));
		});
	});

	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Unable to resolve mock Gauzy server address.');

	return {
		origin: `http://127.0.0.1:${address.port}`,
		requests: () => jsonClone(state.requests),
		state: () => ({
			scenario: jsonClone(state.scenario),
			mutationProof: jsonClone(state.mutationProof),
			everPlatform: jsonClone(state.everPlatform),
			workspaceCreation: jsonClone(state.workspaceCreation)
		}),
		reset: () => {
			state.requests = [];
			state.startedAt = performance.now();
			state.scenario = {
				delays: {},
				hasPlan: true,
				manager: true,
				requirePlanToTrack: false,
				scope: 'A',
				shareProfileView: false,
				timerRunning: false,
				statsPaired: true,
				statsEnabledUi: true,
				statsOperator: true,
				connectHealth: true,
				connectConnected: true
			};
			state.everPlatform = { stateReads: 0, toggles: [] };
			state.appointments = [];
			state.workspaceCreation = {
				openings: 0,
				tenant: null,
				organization: null,
				employeeUserId: null,
				team: null,
				invites: null
			};
			state.mutationProof = {
				startedTimer: false,
				updatedTask: false,
				inProgressTaskStatusPreserved: false
			};
		},
		setScenario: (next) => {
			state.scenario = {
				...state.scenario,
				...jsonClone(next),
				delays: { ...state.scenario.delays, ...next.delays }
			};
		},
		close: () =>
			new Promise((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
				server.closeAllConnections?.();
			})
	};
}
