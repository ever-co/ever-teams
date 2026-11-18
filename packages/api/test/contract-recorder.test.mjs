// The recording of the contract fixtures, against a stand-in API: node --test test/*.test.mjs (from packages/api,
// after `rollup -c`). The recording must leave the account's timer as it found it and delete only what it created.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordContract, writeNewPrivateFile } from '../scripts/record-contract.mjs';
import { CONTRACT_ANSWERS } from '../scripts/contract/answers.mjs';
import { json, standInApi } from './support/stand-in-api.mjs';

const API_URL = 'http://localhost:3000/api';
const TENANT = '11111111-2222-4333-8444-555555555555';
const ORGANIZATION = '22222222-3333-4444-8555-666666666666';
const USER = '33333333-4444-4555-8666-777777777777';
const EMPLOYEE = '44444444-5555-4666-8777-888888888888';
const PROJECT = '55555555-6666-4777-8888-999999999999';
const TASK = '66666666-7777-4888-8999-aaaaaaaaaaaa';
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsaW5hIn0.c2lnbmF0dXJlLW9mLWxpbmE';

const ME = {
	id: USER,
	tenantId: TENANT,
	firstName: 'Lina',
	email: 'lina@northwind.test',
	employee: { id: EMPLOYEE, organizationId: ORGANIZATION }
};

// A stand-in API with a timer: `failures` makes a route answer 500 the first time it is called, and `lostStart`
// makes start number `lostStartAt` start the timer, then lose its answer ('lost') or send one that is not JSON
// ('unreadable').
function benchApi({ running = false, failures = [], lostStart, lostStartAt = 1 } = {}) {
	const state = { running, logs: [] };
	const failed = new Set();
	const failsOnce = (route) => {
		const fails = failures.includes(route) && !failed.has(route);
		failed.add(route);
		return fails;
	};
	const lastLog = () => state.logs[state.logs.length - 1] ?? null;
	const routes = {
		'POST /auth/login': () => json(201, { token: ACCESS_TOKEN, refresh_token: ACCESS_TOKEN, user: ME }),
		'GET /user/me': ME,
		'GET /timesheet/timer/status': () => json(200, { duration: 0, running: state.running, lastLog: lastLog() }),
		[`GET /organization-projects/employee/${EMPLOYEE}`]: [{ id: PROJECT, name: 'Website' }],
		[`GET /tasks/employee/${EMPLOYEE}`]: [{ id: TASK, title: 'Fix the sign-in page', projectId: PROJECT }],
		'GET /employee/working': { items: [{ id: EMPLOYEE, fullName: 'Lina Okafor', user: ME }], total: 1 },
		'POST /timesheet/timer/start': (request) => {
			if (failsOnce('POST /timesheet/timer/start')) {
				return json(500, { statusCode: 500, message: 'Internal server error' });
			}
			state.running = true;
			const id = `7777777${state.logs.length}-8888-4999-8aaa-bbbbbbbbbbbb`;
			const log = {
				id,
				isRunning: true,
				employeeId: EMPLOYEE,
				projectId: request.body.projectId ?? null,
				taskId: request.body.taskId ?? null,
				organizationTeamId: null
			};
			state.logs.push(log);
			const losesAnswer = state.logs.length === lostStartAt;
			if (losesAnswer && lostStart === 'lost') {
				throw new TypeError('fetch failed');
			}
			if (losesAnswer && lostStart === 'unreadable') {
				return new Response('<html>Bad gateway</html>', { status: 201 });
			}
			return json(201, log);
		},
		'POST /timesheet/timer/stop': () => {
			if (failsOnce('POST /timesheet/timer/stop')) {
				return json(500, { statusCode: 500, message: 'Internal server error' });
			}
			state.running = false;
			return json(201, { ...lastLog(), isRunning: false });
		},
		'GET /timesheet/time-log': () => json(200, state.logs),
		'GET /timesheet/statistics/counts': () => {
			if (failsOnce('GET /timesheet/statistics/counts')) {
				return json(500, { statusCode: 500, message: 'Internal server error' });
			}
			return json(200, { todayDuration: 4, todayActivities: 0, weekDuration: 4, weekActivities: 0 });
		},
		'DELETE /timesheet/time-log': () => json(200, { affected: 2 })
	};
	return { ...standInApi(routes), state };
}

const workDirs = [];

after(() => {
	workDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

function workDir() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-recorder-'));
	workDirs.push(dir);
	return { outDir: path.join(dir, 'contract'), forbiddenDir: dir };
}

const recordWith = (api, files, options = {}) =>
	recordContract({
		apiUrl: API_URL,
		email: 'lina@northwind.test',
		password: 'a-password',
		fetch: api.fetch,
		runMs: 0,
		log: () => undefined,
		...files,
		...options
	});

const filesIn = (dir) => {
	if (!fs.existsSync(dir)) {
		return [];
	}
	return fs.readdirSync(dir);
};

const deletesOf = (api) => api.requests.filter((request) => request.route === 'DELETE /timesheet/time-log');

test('every answer is written with placeholders, and the timer is left stopped with no entry of the recording', async () => {
	const api = benchApi();
	const files = workDir();

	const result = await recordWith(api, files);

	const names = CONTRACT_ANSWERS.map((answer) => answer.name);
	assert.deepEqual(result.fixtures, names);
	assert.deepEqual(result.leftBehind, []);
	assert.deepEqual(filesIn(files.outDir).sort(), names.map((name) => `${name}.json`).sort());
	const start = JSON.parse(fs.readFileSync(path.join(files.outDir, 'timer.start.json'), 'utf8'));
	assert.deepEqual(start, {
		route: 'POST /timesheet/timer/start',
		status: 201,
		answer: {
			id: '<log-1>',
			isRunning: true,
			employeeId: '<employee-1>',
			projectId: null,
			taskId: null,
			organizationTeamId: null
		}
	});
	const tasks = JSON.parse(fs.readFileSync(path.join(files.outDir, 'tasks.list.json'), 'utf8'));
	assert.equal(tasks.route, 'GET /tasks/employee/<employee-1>');
	assert.equal(api.state.running, false);
	const [deletion] = deletesOf(api);
	assert.deepEqual(
		deletion.query.logIds,
		api.state.logs.map((log) => log.id)
	);
	assert.equal(deletion.query.forceDelete, 'true');
	assert.equal(deletion.query.organizationId, ORGANIZATION);
});

test("the second timer runs on one of the member's tasks, so the list holds an entry with its project", async () => {
	const api = benchApi();

	await recordWith(api, workDir());

	const starts = api.requests.filter((request) => request.route === 'POST /timesheet/timer/start');
	assert.equal(starts.length, 2);
	assert.equal(starts[0].body.projectId, undefined);
	assert.equal(starts[1].body.projectId, PROJECT);
	assert.equal(starts[1].body.taskId, TASK);
});

test('no fixture holds the sign-in, a token or a real value, and the real values are listed apart', async () => {
	const api = benchApi();
	const files = workDir();

	const result = await recordWith(api, files);

	const written = filesIn(files.outDir).map((file) => fs.readFileSync(path.join(files.outDir, file), 'utf8'));
	for (const text of written) {
		for (const real of [ACCESS_TOKEN, 'Lina', 'lina@northwind.test', EMPLOYEE, PROJECT, 'Website']) {
			assert.equal(text.includes(real), false, real);
		}
	}
	const forbidden = JSON.parse(fs.readFileSync(result.forbiddenFile, 'utf8'));
	assert.ok(forbidden.includes(EMPLOYEE));
	assert.ok(forbidden.includes('Lina'));
	assert.equal(forbidden.includes(ACCESS_TOKEN), false);
	assert.ok(api.routesSent().includes('POST /auth/login'));
});

test('the real values go to a new private directory at each recording, never to a fixed path', async () => {
	const files = workDir();

	const first = await recordWith(benchApi(), files);
	const second = await recordWith(benchApi(), files);

	const firstDir = path.dirname(first.forbiddenFile);
	const secondDir = path.dirname(second.forbiddenFile);
	assert.notEqual(firstDir, secondDir);
	for (const dir of [firstDir, secondDir]) {
		assert.equal(path.dirname(dir), files.forbiddenDir);
		assert.match(path.basename(dir), /^ever-teams-api-contract-/);
	}
	assert.ok(JSON.parse(fs.readFileSync(first.forbiddenFile, 'utf8')).includes(EMPLOYEE));
});

// Windows keeps no Unix permissions on a file.
const keepsPermissions = process.platform !== 'win32';

test('the list of real values is only for the account that recorded', { skip: !keepsPermissions }, async () => {
	const result = await recordWith(benchApi(), workDir());

	const permissionsOf = (file) => fs.statSync(file).mode & 0o777;
	assert.equal(permissionsOf(path.dirname(result.forbiddenFile)), 0o700);
	assert.equal(permissionsOf(result.forbiddenFile), 0o600);
});

test('the list is never written over a file or through a link already at its path', () => {
	const { forbiddenDir } = workDir();
	const taken = path.join(forbiddenDir, 'taken.json');
	fs.writeFileSync(taken, 'kept');

	assert.throws(() => writeNewPrivateFile(taken, '["Lina"]'), { code: 'EEXIST' });
	assert.equal(fs.readFileSync(taken, 'utf8'), 'kept');

	const link = path.join(forbiddenDir, 'link.json');
	try {
		fs.symlinkSync(taken, link);
	} catch {
		// This account may not create links here (Windows without the privilege): the file case above still ran.
		return;
	}
	assert.throws(() => writeNewPrivateFile(link, '["Lina"]'), { code: 'EEXIST' });
	assert.equal(fs.readFileSync(taken, 'utf8'), 'kept');
});

test('an account whose timer runs is refused before anything changes, and nothing is written', async () => {
	const api = benchApi({ running: true });
	const files = workDir();

	await assert.rejects(recordWith(api, files), /timer runs: stop it/);

	assert.equal(api.routesSent().includes('POST /timesheet/timer/start'), false);
	assert.equal(api.state.running, true);
	assert.deepEqual(deletesOf(api), []);
	assert.deepEqual(filesIn(files.outDir), []);
});

test('a failure while the timer runs stops it and deletes the entries created, and nothing is written', async () => {
	const api = benchApi({ failures: ['POST /timesheet/timer/stop'] });
	const files = workDir();

	await assert.rejects(recordWith(api, files), /timer\.stop failed: Internal server error/);

	assert.equal(api.state.running, false);
	assert.deepEqual(deletesOf(api)[0].query.logIds, [api.state.logs[0].id]);
	assert.deepEqual(filesIn(files.outDir), []);
});

for (const lostStart of ['lost', 'unreadable']) {
	test(`a start whose answer is ${lostStart} still has its run stopped and deleted`, async () => {
		const api = benchApi({ lostStart });
		const files = workDir();

		await assert.rejects(recordWith(api, files), /timer\.start failed/);

		assert.equal(api.state.running, false);
		assert.ok(api.routesSent().includes('POST /timesheet/timer/stop'));
		assert.deepEqual(deletesOf(api)[0].query.logIds, [api.state.logs[0].id]);
		assert.deepEqual(filesIn(files.outDir), []);
	});
}

test('a lost answer of the start on a task still has both runs deleted', async () => {
	const api = benchApi({ lostStart: 'lost', lostStartAt: 2 });

	await assert.rejects(recordWith(api, workDir()), /No answer from .*: fetch failed/);

	assert.equal(api.state.logs.length, 2);
	assert.equal(api.state.running, false);
	assert.deepEqual(
		deletesOf(api)[0].query.logIds,
		api.state.logs.map((log) => log.id)
	);
});

test('a start the API refused, with no run started, leaves the timer and the entries alone', async () => {
	const api = benchApi({ failures: ['POST /timesheet/timer/start'] });

	await assert.rejects(recordWith(api, workDir()), /timer\.start failed/);

	assert.deepEqual(api.state.logs, []);
	assert.equal(api.routesSent().includes('POST /timesheet/timer/stop'), false);
	assert.deepEqual(deletesOf(api), []);
});

test('a failure after the timers stopped still deletes both entries', async () => {
	const api = benchApi({ failures: ['GET /timesheet/statistics/counts'] });
	const files = workDir();

	await assert.rejects(recordWith(api, files), /totals\.today failed/);

	assert.deepEqual(
		deletesOf(api)[0].query.logIds,
		api.state.logs.map((log) => log.id)
	);
	assert.deepEqual(filesIn(files.outDir), []);
});

test('an API that is not local is refused before any request', async () => {
	const api = benchApi();

	await assert.rejects(recordWith(api, workDir(), { apiUrl: 'https://api.example.com/api' }), /not a local API/);

	assert.equal(api.requests.length, 0);
});

test('a token replaces the email and the password: the recording signs in with nothing', async () => {
	const api = benchApi();

	await recordWith(api, workDir(), { email: undefined, password: undefined, token: ACCESS_TOKEN });

	assert.equal(api.routesSent().includes('POST /auth/login'), false);
	assert.equal(api.requests[0].headers.get('Authorization'), `Bearer ${ACCESS_TOKEN}`);
});
