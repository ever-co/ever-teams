// start, against a stand-in API that answers what the API recorded: node --test test/*.test.mjs (from apps/cli, after
// tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './support/cli.mjs';
import {
	PERSONAL_TOKEN,
	everythingOf,
	json,
	recorded,
	signedIn,
	signedInHome,
	standInApi
} from './support/stand-in-api.mjs';

process.env.TZ = 'UTC';

// The recorded start, as the API answers the body it was sent.
const startedFrom = (request) =>
	json(201, {
		...recorded('timer.start'),
		projectId: request.body.projectId ?? null,
		taskId: request.body.taskId ?? null,
		description: request.body.description ?? null
	});

// The member's tasks, in one project when the request names it, as the API filters them.
const tasksOf = (request) => {
	const projectId = request.query.get('where[projectId]');
	const tasks = recorded('tasks.list');
	if (!projectId) {
		return json(200, tasks);
	}
	return json(
		200,
		tasks.filter((task) => task.projectId === projectId)
	);
};

const startApi = () =>
	standInApi({
		...signedIn(),
		'POST /timesheet/timer/start': startedFrom,
		'GET /organization-projects/employee/<employee-1>': recorded('projects.list'),
		'GET /tasks/employee/<employee-1>': tasksOf
	});

const startBody = (api) => api.requests.find((request) => request.route === 'POST /timesheet/timer/start')?.body;

test('start with nothing named starts the timer on nothing', async () => {
	const api = startApi();

	const result = await runCli(['start'], { home: signedInHome(), fetch: api.fetch });

	assert.equal(result.code, 0);
	assert.equal(result.stdout, 'Timer started at 00:23.\n');
	assert.deepEqual(api.routesSent(), [
		'POST /auth/api-token/exchange',
		'GET /user/me',
		'POST /timesheet/timer/start'
	]);
	assert.equal(startBody(api).projectId, undefined);
	assert.equal(startBody(api).taskId, undefined);
	assert.doesNotMatch(everythingOf(result, api), new RegExp(PERSONAL_TOKEN));
});

test('start on a project by name and a task by number, with a note', async () => {
	const api = startApi();

	const result = await runCli(
		['start', '--project', '<NAME-4>', '--task', '#1', '--note', 'Review the pull request'],
		{
			home: signedInHome(),
			fetch: api.fetch
		}
	);

	const body = startBody(api);
	assert.equal(result.code, 0);
	assert.equal(result.stdout, 'Timer started at 00:23 on <name-4>, <taskNumber-1> <title-1>.\n');
	assert.equal(body.projectId, '<project-2>');
	assert.equal(body.taskId, '<task-1>');
	assert.equal(body.description, 'Review the pull request');
	assert.equal(
		api.requests.find((request) => request.route.startsWith('GET /tasks')).query.get('where[projectId]'),
		'<project-2>'
	);
});

test('a task given alone by the number the app shows brings its project', async () => {
	const api = startApi();

	const result = await runCli(['start', '--task', '<taskNumber-5>', '--json'], {
		home: signedInHome(),
		fetch: api.fetch
	});

	const { started, entry } = JSON.parse(result.stdout);
	assert.equal(result.code, 0);
	assert.equal(started, true);
	assert.equal(startBody(api).projectId, '<project-3>');
	assert.equal(startBody(api).taskId, '<task-5>');
	assert.equal(entry.projectName, '<name-5>');
	assert.equal(entry.taskTitle, '<title-5>');
	assert.equal(entry.running, true);
});

test('a project or a task given by id is found as it is', async () => {
	const api = startApi();

	const result = await runCli(['start', '--project', '<project-1>', '--task', '<task-6>'], {
		home: signedInHome(),
		fetch: api.fetch
	});

	assert.equal(result.code, 0);
	assert.equal(startBody(api).projectId, '<project-1>');
	assert.equal(startBody(api).taskId, '<task-6>');
});

test('a number several tasks share, or a name no project has, is refused before the timer starts', async () => {
	const refusals = [
		{
			argv: ['start', '--task', '1'],
			code: 'AMBIGUOUS_TASK',
			says: "3 of your tasks have the number 1: add --project, or give the task's id."
		},
		{
			argv: ['start', '--project', 'Website'],
			code: 'NO_SUCH_PROJECT',
			says: 'None of your projects is named Website: run ever-teams projects to see their names and ids.'
		},
		{
			argv: ['start', '--project', '<name-4>', '--task', '9'],
			code: 'NO_SUCH_TASK',
			says: 'None of your tasks in <name-4> has the number or id 9: check its number in the web app.'
		}
	];
	for (const { argv, code, says } of refusals) {
		const api = startApi();

		const result = await runCli([...argv, '--json'], { home: signedInHome(), fetch: api.fetch });

		assert.equal(result.code, 1, argv.join(' '));
		assert.deepEqual(JSON.parse(result.stderr), { error: { code, message: says } });
		assert.equal(startBody(api), undefined);
	}
});

test('an option without its value is a usage error, and nothing is sent', async () => {
	const result = await runCli(['start', '--task'], { home: signedInHome() });

	assert.equal(result.code, 2);
	assert.equal(result.stderr, '--task needs a value. Run ever-teams start --help to see how to use it.\n');
});

test('a name two projects share is refused, with where to find their ids', async () => {
	const projects = recorded('projects.list');
	const api = standInApi({
		...signedIn(),
		'GET /organization-projects/employee/<employee-1>': [...projects, { ...projects[0], id: '<project-9>' }]
	});

	const result = await runCli(['start', '--project', '<name-3>'], { home: signedInHome(), fetch: api.fetch });

	assert.equal(result.code, 1);
	assert.equal(
		result.stderr,
		'2 of your projects are named <name-3>: give the id of one, from ever-teams projects.\n'
	);
	assert.equal(startBody(api), undefined);
});
