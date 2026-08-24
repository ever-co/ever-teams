import { createServer } from 'node:http';

const jsonClone = (value) => JSON.parse(JSON.stringify(value));
const pagination = (items = []) => ({ items, total: items.length });

function buildData(fixture, scenario, requestUrl) {
	const { ids, names } = fixture;
	const scopeB =
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
	const role = { id: ids.role, name: 'ADMIN', isSystem: true, rolePermissions, tenantId };
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
		teams: []
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

function routeResponse(method, pathname, requestUrl, data, fixture, state, body) {
	const { ids } = fixture;
	if (pathname === '/api/user/me') return data.baseUser;
	if (pathname === '/api/auth/workspaces') return data.workspaces;
	if (pathname === '/api/auth/refresh-token')
		return { token: 'synthetic-refreshed-token', refresh_token: 'synthetic-refresh-token' };

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
	if (pathname === '/api/timesheet/statistics/counts') return { today: 0, week: 0, month: 0 };
	if (pathname.startsWith('/api/timesheet/statistics/tasks')) return { global: {}, today: {} };
	if (/^\/api\/organization-team-employee\//.test(pathname))
		return body ?? { affected: 1, generatedMaps: [], raw: [] };
	if (pathname === '/api/favorite') return pagination([]);
	if (pathname === '/api/organization-team-join') return pagination([]);

	if (method === 'DELETE') return { affected: 1, raw: [] };
	if (method !== 'GET') return body ?? { success: true };
	return pagination([]);
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
			timerRunning: false
		},
		mutationProof: {
			startedTimer: false,
			updatedTask: false,
			inProgressTaskStatusPreserved: false
		}
	};

	const server = createServer(async (request, response) => {
		const startMs = performance.now() - state.startedAt;
		const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
		const method = String(request.method ?? 'GET').toUpperCase();
		const origin = request.headers.origin ?? 'http://127.0.0.1:3030';
		const cors = {
			'access-control-allow-credentials': 'true',
			'access-control-allow-headers':
				'authorization, content-type, tenant-id, organization-id, organization-team-id',
			'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
			'access-control-allow-origin': origin,
			'access-control-expose-headers': '*',
			'cache-control': 'no-store'
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
		const data = buildData(fixture, state.scenario, requestUrl);
		const payload = routeResponse(method, requestUrl.pathname, requestUrl, data, fixture, state, body);
		const status = 200;
		const endMs = performance.now() - state.startedAt;
		state.requests.push({
			method,
			path: requestUrl.pathname,
			query: requestUrl.searchParams.toString(),
			startMs,
			endMs,
			status
		});
		response.writeHead(status, { ...cors, 'content-type': 'application/json; charset=utf-8' });
		response.end(JSON.stringify(payload));
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
		state: () => ({ scenario: jsonClone(state.scenario), mutationProof: jsonClone(state.mutationProof) }),
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
				timerRunning: false
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
