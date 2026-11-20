// log, against a stand-in API that answers what the API recorded: node --test test/*.test.mjs (from apps/cli, after
// tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './support/cli.mjs';
import { json, recorded, signedIn, signedInHome, standInApi } from './support/stand-in-api.mjs';

process.env.TZ = 'UTC';

const NOW = new Date('2026-11-18T17:00:00Z');

// POST /timesheet/time-log answers the time log it created, as POST /timesheet/timer/start does: the recorded start,
// as the API stores the entry it was sent.
const createdFrom = (request) => {
	const { body } = request;
	const duration = (Date.parse(body.stoppedAt) - Date.parse(body.startedAt)) / 1000;
	return json(201, {
		...recorded('timer.start'),
		startedAt: body.startedAt,
		stoppedAt: body.stoppedAt,
		isRunning: false,
		logType: 'MANUAL',
		source: 'BROWSER',
		duration,
		projectId: body.projectId ?? null,
		taskId: body.taskId ?? null,
		description: body.description ?? null
	});
};

const tasksOf = (request) => {
	const projectId = request.query.get('where[projectId]');
	const tasks = recorded('tasks.list');
	return json(
		200,
		tasks.filter((task) => !projectId || task.projectId === projectId)
	);
};

const logApi = (created = createdFrom) =>
	standInApi({
		...signedIn(),
		'POST /timesheet/time-log': created,
		'GET /organization-projects/employee/<employee-1>': recorded('projects.list'),
		'GET /tasks/employee/<employee-1>': tasksOf
	});

const createBody = (api) => api.requests.find((request) => request.route === 'POST /timesheet/time-log')?.body;

const runLog = (args, api) => runCli(['log', ...args], { home: signedInHome(), fetch: api?.fetch, now: NOW });

test('log adds an entry from a time to another on a day, on a project and task, with a note', async () => {
	const api = logApi();

	const result = await runLog(
		[
			'--date',
			'2026-11-17',
			'--from',
			'09:00',
			'--to',
			'10:30',
			'--project',
			'<name-4>',
			'--task',
			'1',
			'--note',
			'Call'
		],
		api
	);

	assert.equal(result.code, 0);
	assert.equal(
		result.stdout,
		'Added 1h 30m on 2026-11-17, from 09:00 to 10:30 on <name-4>, <taskNumber-1> <title-1>.\n'
	);
	assert.deepEqual(createBody(api), {
		tenantId: '<tenant-1>',
		organizationId: '<organization-1>',
		employeeId: '<employee-1>',
		startedAt: '2026-11-17T09:00:00.000Z',
		stoppedAt: '2026-11-17T10:30:00.000Z',
		logType: 'MANUAL',
		source: 'BROWSER',
		projectId: '<project-2>',
		taskId: '<task-1>',
		description: 'Call',
		billableFromProject: true
	});
});

test('a duration starts at --from, ends at --to, or ends now', async () => {
	const cases = [
		{
			args: ['--from', '09:00', '--duration', '45m'],
			range: ['2026-11-18T09:00:00.000Z', '2026-11-18T09:45:00.000Z']
		},
		{
			args: ['--to', '12:00', '--duration', '2h'],
			range: ['2026-11-18T10:00:00.000Z', '2026-11-18T12:00:00.000Z']
		},
		{ args: ['--duration', '1h30m'], range: ['2026-11-18T15:30:00.000Z', '2026-11-18T17:00:00.000Z'] },
		{
			args: ['--date', '2026-11-16', '--from', '23:30', '--duration', '1h'],
			range: ['2026-11-16T23:30:00.000Z', '2026-11-17T00:30:00.000Z']
		}
	];
	for (const { args, range } of cases) {
		const api = logApi();

		const result = await runLog(args, api);

		assert.equal(result.code, 0, args.join(' '));
		assert.deepEqual([createBody(api).startedAt, createBody(api).stoppedAt], range);
	}
});

test('log --json answers the added entry', async () => {
	const api = logApi();

	const result = await runLog(['--from', '08:00', '--to', '08:20', '--json'], api);

	const { added, entry } = JSON.parse(result.stdout);
	assert.equal(added, true);
	assert.equal(entry.logType, 'MANUAL');
	assert.equal(entry.durationSeconds, 1200);
	assert.equal(entry.running, false);
	assert.equal(entry.stoppedAt, '2026-11-18T08:20:00.000Z');
});

test('times that do not make an entry are usage errors, and nothing is sent', async () => {
	const refused = [
		{ args: [], says: 'Give --from and --to, or --duration.' },
		{ args: ['--from', '09:00'], says: 'Give --from and --to, or --duration.' },
		{ args: ['--from', '10:00', '--to', '09:00'], says: '--to must be after --from, on the same day.' },
		{ args: ['--from', '25:00', '--to', '26:00'], says: '--from takes a time as HH:MM, such as 09:30.' },
		{
			args: ['--date', '2026-02-30', '--from', '09:00', '--to', '10:00'],
			says: '--date 2026-02-30 is not a day of the calendar.'
		},
		{
			args: ['--date', '18/11/2026', '--from', '09:00', '--to', '10:00'],
			says: '--date takes a day as YYYY-MM-DD, such as 2026-11-18.'
		},
		{ args: ['--duration', '90'], says: '--duration takes hours and minutes, such as 1h30m, 2h or 45m.' },
		{ args: ['--duration', '0h0m'], says: '--duration must be longer than 0m.' },
		{
			args: ['--from', '09:00', '--to', '10:00', '--duration', '1h'],
			says: 'Give --duration with --from or with --to, not with both.'
		},
		{ args: ['--date', '2026-11-17', '--duration', '1h'], says: 'With --date, give --from or --to as well.' }
	];
	for (const { args, says } of refused) {
		const api = logApi();

		const result = await runLog(args, api);

		assert.equal(result.code, 2, args.join(' '));
		assert.equal(result.stderr, `${says} Run ever-teams log --help to see how to use it.\n`);
		assert.equal(api.requests.length, 0);
	}
});

test('an organization that does not allow manual time is named, with what to do instead', async () => {
	const api = logApi(() => json(403, { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' }));

	const result = await runLog(['--from', '09:00', '--to', '10:00', '--json'], api);

	assert.equal(result.code, 1);
	assert.deepEqual(JSON.parse(result.stderr), {
		error: {
			code: 'MANUAL_TIME_REFUSED',
			message:
				'Your organization does not allow adding time by hand, or your role may not: ask an administrator of ' +
				'your organization to allow manual time, or use ever-teams start and stop.',
			status: 403
		}
	});
});

test('an entry over the running timer says to stop it first', async () => {
	const overlap = () =>
		json(409, {
			message: 'A timer is running over this time range. Stop it first, or choose a range outside it.',
			code: 'RUNNING_TIMER_OVERLAP',
			runningTimeLog: { id: '<log-9>', startedAt: '2026-11-18T09:30:00.000Z', source: 'TEAMS' }
		});
	const api = logApi(overlap);

	const result = await runLog(['--from', '09:00', '--to', '10:00'], api);

	assert.equal(result.code, 1);
	assert.equal(
		result.stderr,
		'Your timer is running over this time: stop it with ever-teams stop, or pick another time.\n'
	);
});

test('an entry is billable as its project is set, unless --billable or --not-billable chooses', async () => {
	const cases = [
		{ flags: [], billable: { billableFromProject: true } },
		{ flags: ['--billable'], billable: { isBillable: true } },
		{ flags: ['--not-billable'], billable: { isBillable: false } }
	];
	for (const { flags, billable } of cases) {
		const api = logApi();

		const result = await runLog(['--from', '09:00', '--to', '10:00', '--project', '<name-4>', ...flags], api);

		assert.equal(result.code, 0, flags.join(' '));
		const { isBillable, billableFromProject } = createBody(api);
		const sent = Object.fromEntries(
			Object.entries({ isBillable, billableFromProject }).filter(([, value]) => value !== undefined)
		);
		assert.deepEqual(sent, billable, flags.join(' '));
	}
});

test('--billable with --not-billable is a usage error, and nothing is sent', async () => {
	const api = logApi();

	const result = await runLog(
		['--from', '09:00', '--to', '10:00', '--project', '<name-4>', '--billable', '--not-billable'],
		api
	);

	assert.equal(result.code, 2);
	assert.equal(
		result.stderr,
		'Give --billable or --not-billable, not both. Run ever-teams log --help to see how to use it.\n'
	);
	assert.equal(api.requests.length, 0);
});
