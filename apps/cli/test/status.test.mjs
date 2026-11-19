// status, and how every signed-in command finds its token: against a stand-in API that answers what the API recorded,
// node --test test/*.test.mjs (from apps/cli, after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { configFileOf } from '../dist/config.js';
import { newHome, placeOf, runCli } from './support/cli.mjs';
import {
	ACCESS_TOKEN,
	API_URL,
	PERSONAL_TOKEN,
	everythingOf,
	json,
	recorded,
	signedIn,
	signedInHome,
	standInApi
} from './support/stand-in-api.mjs';

// The clock lines below are read in UTC.
process.env.TZ = 'UTC';

// The recorded status: a timer started at 2000-01-01T00:23:00Z, on no project.
const RUNNING = recorded('timer.status');
const NOW = new Date('2000-01-01T01:28:30Z');

const onTask = () => ({
	...RUNNING,
	duration: 3900,
	lastLog: { ...RUNNING.lastLog, projectId: '<project-2>', taskId: '<task-1>' }
});

const statusApi = (answer, routes = {}) =>
	standInApi({
		...signedIn(),
		'GET /timesheet/timer/status': answer,
		'GET /organization-projects/employee/<employee-1>': recorded('projects.list'),
		'GET /tasks/employee/<employee-1>': recorded('tasks.list'),
		...routes
	});

function assertNoToken(result, api) {
	const everything = everythingOf(result, api);
	assert.doesNotMatch(everything, new RegExp(PERSONAL_TOKEN));
	assert.doesNotMatch(everything, new RegExp(ACCESS_TOKEN));
}

test('a running timer is shown since when, for how long and on what', async () => {
	const api = statusApi(onTask());

	const result = await runCli(['status'], { home: signedInHome(), fetch: api.fetch, now: NOW });

	assert.equal(result.code, 0);
	assert.equal(
		result.stdout,
		'The timer is running since 00:23 (1h 05m) on <name-4>, <taskNumber-1> <title-1>.\nToday: 1h 05m tracked.\n'
	);
	assert.deepEqual(api.routesSent(), [
		'POST /auth/api-token/exchange',
		'GET /user/me',
		'GET /timesheet/timer/status',
		'GET /organization-projects/employee/<employee-1>',
		'GET /tasks/employee/<employee-1>'
	]);
	assert.equal(api.requests[2].headers.get('authorization'), `Bearer ${ACCESS_TOKEN}`);
	assertNoToken(result, api);
});

test('a timer on no project reads nothing else, and --json answers the entry', async () => {
	const api = statusApi(RUNNING);

	const plain = await runCli(['status'], { home: signedInHome(), fetch: api.fetch, now: NOW });
	const json = await runCli(['status', '--json'], { home: signedInHome(), fetch: api.fetch, now: NOW });

	assert.equal(plain.stdout, 'The timer is running since 00:23 (1h 05m).\nToday: 0m tracked.\n');
	assert.equal(api.routesSent().includes('GET /organization-projects/employee/<employee-1>'), false);
	assert.deepEqual(JSON.parse(json.stdout), {
		running: true,
		todaySeconds: 0,
		entry: {
			id: '<log-1>',
			startedAt: '2000-01-01T00:23:00.000Z',
			stoppedAt: null,
			durationSeconds: 3930,
			running: true,
			projectId: null,
			projectName: null,
			taskId: null,
			taskNumber: null,
			taskTitle: null,
			note: null,
			logType: 'TRACKED',
			billable: true,
			memberId: '<employee-1>',
			memberName: null
		}
	});
});

test('a stopped timer says so, with the time tracked today', async () => {
	const api = statusApi({ ...RUNNING, running: false, duration: 5400 });

	const plain = await runCli(['status'], { home: signedInHome(), fetch: api.fetch, now: NOW });
	const json = await runCli(['status', '--json'], { home: signedInHome(), fetch: api.fetch, now: NOW });

	assert.equal(plain.code, 0);
	assert.equal(plain.stdout, 'The timer is stopped. Today: 1h 30m tracked.\n');
	assert.deepEqual(JSON.parse(json.stdout), { running: false, todaySeconds: 5400, entry: null });
});

test('names that cannot be read leave the ids, and the command still succeeds', async () => {
	const refused = () => json(403, { statusCode: 403, message: 'Forbidden resource' });
	const api = statusApi(onTask(), {
		'GET /organization-projects/employee/<employee-1>': refused,
		'GET /tasks/employee/<employee-1>': refused
	});

	const result = await runCli(['status'], { home: signedInHome(), fetch: api.fetch, now: NOW });

	assert.equal(result.code, 0);
	assert.match(
		result.stdout,
		/^The timer is running since 00:23 \(1h 05m\) on project <project-2>, task <task-1>\.\n/
	);
});

test('without a login or EVER_TEAMS_TOKEN, nothing is sent and the next step is said', async () => {
	const result = await runCli(['status']);

	assert.equal(result.code, 1);
	assert.equal(result.stdout, '');
	assert.equal(result.stderr, 'You are not signed in: run ever-teams login, or set EVER_TEAMS_TOKEN.\n');
});

test('EVER_TEAMS_TOKEN and EVER_TEAMS_API_URL win over the stored login', async () => {
	const api = statusApi(RUNNING);
	const otherApi = 'http://127.0.0.1:4000/api';

	const result = await runCli(['status'], {
		home: signedInHome('https://teams.example.com/api'),
		env: { EVER_TEAMS_TOKEN: PERSONAL_TOKEN, EVER_TEAMS_API_URL: otherApi },
		fetch: api.fetch,
		now: NOW
	});

	assert.equal(result.code, 0);
	assert.ok(api.requests.every((request) => request.url.startsWith(otherApi)));
	assertNoToken(result, api);
});

test('a refused EVER_TEAMS_TOKEN says to replace it there', async () => {
	const api = statusApi(RUNNING);

	const result = await runCli(['status'], {
		home: signedInHome(),
		env: { EVER_TEAMS_TOKEN: 'gzp_from_the_environment_0123456789' },
		fetch: api.fetch
	});

	assert.equal(result.code, 1);
	assert.match(
		result.stderr,
		/^The token in EVER_TEAMS_TOKEN was refused: create a new one in Settings > API tokens/
	);
	assert.doesNotMatch(result.stderr, /gzp_from_the_environment/);
});

test('a stored token is never sent to another API than the one it was stored for', async () => {
	const api = statusApi(RUNNING);

	const result = await runCli(['status', '--api-url', 'https://other.example.com/api'], {
		home: signedInHome(),
		fetch: api.fetch
	});

	assert.equal(result.code, 1);
	assert.equal(api.requests.length, 0);
	assert.equal(
		result.stderr,
		`You signed in to ${API_URL}, not https://other.example.com/api: run ever-teams login --api-url ` +
			'https://other.example.com/api, or set EVER_TEAMS_TOKEN.\n'
	);
});

test('a token refused after the exchange says to create a new one', async () => {
	const api = statusApi(() => json(401, { statusCode: 401, message: 'Unauthorized' }));

	const result = await runCli(['status', '--json'], { home: signedInHome(), fetch: api.fetch });

	const { error } = JSON.parse(result.stderr);
	assert.equal(result.code, 1);
	assert.deepEqual(error, {
		code: 'TOKEN_REFUSED',
		message: 'Your token was refused: create a new one in Settings > API tokens, then run ever-teams login.',
		status: 401
	});
	assertNoToken(result, api);
});

test('no answer from the API names the address to check', async () => {
	const unreachable = async () => {
		throw new TypeError('fetch failed');
	};

	const result = await runCli(['status'], { home: signedInHome(), fetch: unreachable });

	assert.equal(result.code, 1);
	assert.equal(result.stderr, `No answer from ${API_URL}: check your network and the address.\n`);
});

// A settings file that is not a login, as a damaged or half-written one is.
function homeWithDamagedSettings() {
	const home = newHome();
	const file = configFileOf(placeOf(home));
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, 'not a login');
	return home;
}

test('a damaged settings file stops no command whose token and address both come from elsewhere', async () => {
	const api = statusApi(RUNNING);
	const fromEnvironment = { EVER_TEAMS_TOKEN: PERSONAL_TOKEN, EVER_TEAMS_API_URL: API_URL };

	const byEnvironment = await runCli(['status'], {
		home: homeWithDamagedSettings(),
		env: fromEnvironment,
		fetch: api.fetch
	});
	const byFlag = await runCli(['status', '--api-url', API_URL], {
		home: homeWithDamagedSettings(),
		env: { EVER_TEAMS_TOKEN: PERSONAL_TOKEN },
		fetch: api.fetch
	});

	assert.equal(byEnvironment.code, 0);
	assert.equal(byFlag.code, 0);
});

test('a damaged settings file still stops a command that takes a value from it', async () => {
	const api = statusApi(RUNNING);

	const addressFromSettings = await runCli(['status', '--json'], {
		home: homeWithDamagedSettings(),
		env: { EVER_TEAMS_TOKEN: PERSONAL_TOKEN },
		fetch: api.fetch
	});
	const tokenFromSettings = await runCli(['status', '--api-url', API_URL], {
		home: homeWithDamagedSettings(),
		fetch: api.fetch
	});

	assert.equal(addressFromSettings.code, 1);
	assert.equal(JSON.parse(addressFromSettings.stderr).error.code, 'SETTINGS_DAMAGED');
	assert.equal(tokenFromSettings.code, 1);
	assert.match(tokenFromSettings.stderr, /cannot be read: run ever-teams login again\.\n$/);
	assert.equal(api.requests.length, 0);
});

test('an empty --api-url is a usage error, never another address', async () => {
	const api = statusApi(RUNNING);
	const said =
		'--api-url is not an address: give the address of the API, such as https://api.example.com/api. Run ' +
		'ever-teams status --help to see how to use it.\n';

	const separate = await runCli(['status', '--api-url', ''], { home: signedInHome(), fetch: api.fetch });
	const inline = await runCli(['status', '--api-url='], {
		home: signedInHome(),
		env: { EVER_TEAMS_TOKEN: PERSONAL_TOKEN },
		fetch: api.fetch
	});
	const atLogin = await runCli(['login', '--token-stdin', '--api-url', ''], {
		stdin: PERSONAL_TOKEN,
		fetch: api.fetch
	});

	assert.equal(separate.code, 2);
	assert.equal(separate.stderr, said);
	assert.equal(inline.code, 2);
	assert.equal(inline.stderr, said);
	assert.equal(atLogin.code, 2);
	assert.match(atLogin.stderr, /^--api-url is not an address/);
	assert.equal(api.requests.length, 0);
});

test('an empty EVER_TEAMS_API_URL counts as unset: the stored address is used', async () => {
	const api = statusApi(RUNNING);

	const result = await runCli(['status'], {
		home: signedInHome(),
		env: { EVER_TEAMS_API_URL: '' },
		fetch: api.fetch,
		now: NOW
	});

	assert.equal(result.code, 0);
	assert.ok(api.requests.every((request) => request.url.startsWith(API_URL)));
});

test('a running timer lasts until its status was read, not until its names were', async () => {
	let clock = new Date('2000-01-01T01:28:30Z');
	// The names take ten minutes to read.
	const slowProjects = () => {
		clock = new Date('2000-01-01T01:38:30Z');
		return json(200, recorded('projects.list'));
	};
	const api = statusApi(onTask(), { 'GET /organization-projects/employee/<employee-1>': slowProjects });

	const result = await runCli(['status', '--json'], { home: signedInHome(), fetch: api.fetch, now: () => clock });

	assert.equal(result.code, 0);
	assert.equal(JSON.parse(result.stdout).entry.durationSeconds, 3930);
});
