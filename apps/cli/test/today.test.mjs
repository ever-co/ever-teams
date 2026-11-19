// today, against a stand-in API that answers what the API recorded: node --test test/*.test.mjs (from apps/cli, after
// tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './support/cli.mjs';
import { recorded, signedIn, signedInHome, standInApi } from './support/stand-in-api.mjs';

process.env.TZ = 'UTC';

const NOW = new Date('2000-01-01T12:00:00Z');

// The two recorded entries (one on nothing, one on a project's task), given longer durations, and one still running.
function entriesOfTheDay() {
	const [bare, onTask] = recorded('timeEntries.list');
	const running = {
		...onTask,
		id: '<log-3>',
		startedAt: '2000-01-01T11:00:00.000Z',
		stoppedAt: '2000-01-01T11:05:00.000Z',
		isRunning: true,
		duration: 300,
		description: 'Review the pull request'
	};
	return [running, { ...bare, duration: 5400 }, { ...onTask, duration: 1800 }];
}

const todayApi = (entries) => standInApi({ ...signedIn(), 'GET /timesheet/time-log': entries });

test("today lists the member's own entries of the day in start order, with their total", async () => {
	const api = todayApi(entriesOfTheDay());

	const result = await runCli(['today'], { home: signedInHome(), fetch: api.fetch, now: NOW });

	const { query } = api.requests[2];
	assert.equal(result.code, 0);
	assert.equal(
		result.stdout,
		[
			'Today (2000-01-01): 3h 00m tracked.',
			'  00:23-00:25   1h 30m  (no project)',
			'  00:27-00:29      30m  <name-4>, <taskNumber-1> <title-1>',
			'  11:00-now     1h 00m  <name-4>, <taskNumber-1> <title-1>: Review the pull request',
			''
		].join('\n')
	);
	assert.equal(query.get('startDate'), '2000-01-01T00:00:00.000Z');
	assert.equal(query.get('endDate'), '2000-01-01T23:59:59.999Z');
	assert.equal(query.get('employeeIds[0]'), '<employee-1>');
});

test('today --json answers the day, the total and each entry', async () => {
	const api = todayApi(entriesOfTheDay());

	const result = await runCli(['today', '--json'], { home: signedInHome(), fetch: api.fetch, now: NOW });

	const answer = JSON.parse(result.stdout);
	assert.equal(answer.date, '2000-01-01');
	assert.equal(answer.totalSeconds, 10800);
	assert.deepEqual(
		answer.entries.map((entry) => entry.id),
		['<log-1>', '<log-2>', '<log-3>']
	);
	assert.deepEqual(answer.entries[1], {
		id: '<log-2>',
		startedAt: '2000-01-01T00:27:00.000Z',
		stoppedAt: '2000-01-01T00:29:00.000Z',
		durationSeconds: 1800,
		running: false,
		projectId: '<project-2>',
		projectName: '<name-4>',
		taskId: '<task-1>',
		taskNumber: '<taskNumber-1>',
		taskTitle: '<title-1>',
		note: null,
		logType: 'TRACKED',
		billable: true,
		memberId: '<employee-1>',
		memberName: '<fullName-1>'
	});
	assert.equal(answer.entries[2].stoppedAt, null);
	assert.equal(answer.entries[2].durationSeconds, 3600);
});

test('a day with nothing tracked says so', async () => {
	const api = todayApi([]);

	const plain = await runCli(['today'], { home: signedInHome(), fetch: api.fetch, now: NOW });
	const json = await runCli(['today', '--json'], { home: signedInHome(), fetch: api.fetch, now: NOW });

	assert.equal(plain.stdout, 'Nothing tracked today (2000-01-01).\n');
	assert.deepEqual(JSON.parse(json.stdout), { date: '2000-01-01', totalSeconds: 0, entries: [] });
});
