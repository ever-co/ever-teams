// stop, against a stand-in API that answers what the API recorded: node --test test/*.test.mjs (from apps/cli, after
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

const RUNNING = recorded('timer.status');
const STOPPED = recorded('timer.stop');

const stopApi = (status, stopAnswer) =>
	standInApi({
		...signedIn(),
		'GET /timesheet/timer/status': status,
		'POST /timesheet/timer/stop': () => json(201, stopAnswer),
		'GET /organization-projects/employee/<employee-1>': recorded('projects.list')
	});

test('stop stops the running timer and says after how long, on what', async () => {
	const onProject = { ...STOPPED, stoppedAt: '2000-01-01T01:28:00.000Z', duration: 3900, projectId: '<project-2>' };
	const api = stopApi(RUNNING, onProject);

	const result = await runCli(['stop'], { home: signedInHome(), fetch: api.fetch });

	assert.equal(result.code, 0);
	assert.equal(result.stdout, 'Timer stopped at 01:28 after 1h 05m on <name-4>.\n');
	assert.deepEqual(api.routesSent(), [
		'POST /auth/api-token/exchange',
		'GET /user/me',
		'GET /timesheet/timer/status',
		'POST /timesheet/timer/stop',
		'GET /organization-projects/employee/<employee-1>'
	]);
	assert.doesNotMatch(everythingOf(result, api), new RegExp(PERSONAL_TOKEN));
});

test('stop --json answers the stopped entry, lasting what the API counted', async () => {
	const api = stopApi(RUNNING, STOPPED);

	const result = await runCli(['stop', '--json'], { home: signedInHome(), fetch: api.fetch });

	const { stopped, entry } = JSON.parse(result.stdout);
	assert.equal(result.code, 0);
	assert.equal(stopped, true);
	assert.equal(entry.id, '<log-1>');
	assert.equal(entry.running, false);
	assert.equal(entry.startedAt, '2000-01-01T00:23:00.000Z');
	assert.equal(entry.stoppedAt, '2000-01-01T00:25:00.000Z');
	assert.equal(entry.durationSeconds, 2);
});

test('with no timer running, stop sends no stop and succeeds', async () => {
	const api = stopApi({ ...RUNNING, running: false }, STOPPED);

	const plain = await runCli(['stop'], { home: signedInHome(), fetch: api.fetch });
	const asJson = await runCli(['stop', '--json'], { home: signedInHome(), fetch: api.fetch });

	assert.equal(plain.code, 0);
	assert.equal(plain.stdout, 'The timer was not running: there was nothing to stop.\n');
	assert.deepEqual(JSON.parse(asJson.stdout), { stopped: false, entry: null });
	assert.equal(api.routesSent().includes('POST /timesheet/timer/stop'), false);
});

test('a stop that answers no entry is still a stop', async () => {
	const api = stopApi(RUNNING, null);

	const result = await runCli(['stop'], { home: signedInHome(), fetch: api.fetch });

	assert.equal(result.code, 0);
	assert.equal(result.stdout, 'Timer stopped.\n');
});

test('a stop the API refuses in the meantime fails with what to do', async () => {
	const api = standInApi({
		...signedIn(),
		'GET /timesheet/timer/status': RUNNING,
		'POST /timesheet/timer/stop': () => json(406, { statusCode: 406, message: 'No running timer' })
	});

	const result = await runCli(['stop'], { home: signedInHome(), fetch: api.fetch });

	assert.equal(result.code, 1);
	assert.equal(result.stderr, 'The server refused this (No running timer): run ever-teams status, then try again.\n');
});
