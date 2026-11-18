// The answers the contract covers, one fixture each in test/contract/<name>.json: the route the client sends, how the
// recording calls the client for it (with the days the recording's entries started on, { from, to }), the type the
// recorded answer must fit (a TypeScript type that may name EverTeamsClient), and what the client method returns from
// that answer.

const declared = (resource, method) => `Awaited<ReturnType<EverTeamsClient['${resource}']['${method}']>>`;

const asIs = (answer) => answer;

export const CONTRACT_ANSWERS = [
	{
		// Read once by every client that is not given its tenant and organization; no method answers it.
		name: 'user.me',
		route: 'GET /user/me',
		idKind: 'user',
		answerType: '{ tenantId: string; employee: { id: string; organizationId: string } }'
	},
	{
		name: 'projects.list',
		route: 'GET /organization-projects/employee/:employeeId',
		idKind: 'project',
		call: (client) => client.projects.list(),
		answerType: declared('projects', 'list'),
		returned: asIs
	},
	{
		name: 'tasks.list',
		route: 'GET /tasks/employee/:employeeId',
		idKind: 'task',
		call: (client) => client.tasks.list(),
		answerType: declared('tasks', 'list'),
		returned: asIs
	},
	{
		name: 'members.list',
		route: 'GET /employee/working',
		idKind: 'employee',
		call: (client) => client.members.list(),
		answerType: `{ items: ${declared('members', 'list')}; total: number }`,
		returned: (answer) => answer.items
	},
	{
		name: 'timer.start',
		route: 'POST /timesheet/timer/start',
		idKind: 'log',
		call: (client) => client.timer.start(),
		answerType: declared('timer', 'start'),
		returned: asIs
	},
	{
		name: 'timer.status',
		route: 'GET /timesheet/timer/status',
		idKind: 'log',
		call: (client) => client.timer.status(),
		answerType: declared('timer', 'status'),
		returned: asIs
	},
	{
		name: 'timer.stop',
		route: 'POST /timesheet/timer/stop',
		idKind: 'log',
		call: (client) => client.timer.stop(),
		answerType: declared('timer', 'stop'),
		returned: asIs
	},
	{
		name: 'timeEntries.list',
		route: 'GET /timesheet/time-log',
		idKind: 'log',
		call: (client, days) => client.timeEntries.list({ from: days.from, to: days.to }),
		answerType: declared('timeEntries', 'list'),
		returned: asIs
	},
	{
		name: 'totals.today',
		route: 'GET /timesheet/statistics/counts',
		idKind: 'statistics',
		call: (client) => client.totals.today(),
		answerType: '{ todayDuration: number; todayActivities: number }',
		returned: (answer) => ({ duration: answer.todayDuration, activity: answer.todayActivities })
	},
	{
		name: 'totals.week',
		route: 'GET /timesheet/statistics/counts',
		idKind: 'statistics',
		call: (client) => client.totals.week(),
		answerType: '{ weekDuration: number; weekActivities: number }',
		returned: (answer) => ({ duration: answer.weekDuration, activity: answer.weekActivities })
	}
];

/** The answer named `name`. */
export function contractAnswer(name) {
	const found = CONTRACT_ANSWERS.find((answer) => answer.name === name);
	if (!found) {
		throw new Error(`No contract answer is named ${name}.`);
	}
	return found;
}

/** Whether `route` ("GET /tasks/employee/<employee-1>") is the one `pattern` names ("GET /tasks/employee/:employeeId"). */
export function routeMatches(pattern, route) {
	const patternSegments = pattern.split('/');
	const routeSegments = route.split('/');
	if (patternSegments.length !== routeSegments.length) {
		return false;
	}
	return patternSegments.every((segment, index) => segment.startsWith(':') || segment === routeSegments[index]);
}
