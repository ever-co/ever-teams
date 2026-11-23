// createClient and its timer, against the built package: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`). Each client gets a stand-in API through its `fetch` option.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	apiConfigManager,
	createClient,
	currentTimerSource,
	EverTeamsError,
	EverTeamsValidationError
} from '../dist/index.es.js';
import { API_URL, ME, json, standInApi } from './support/stand-in-api.mjs';

const STATUS = {
	duration: 3600,
	running: true,
	lastLog: {
		id: 'log-1',
		startedAt: '2026-11-18T08:00:00.000Z',
		stoppedAt: '2026-11-18T09:00:00.000Z',
		isRunning: true,
		source: 'EMBED',
		logType: 'TRACKED',
		projectId: 'project-1',
		taskId: null,
		organizationTeamId: null,
		organizationId: 'org-1',
		tenantId: 'tenant-1'
	}
};

const timeLogOf = (body) => ({
	id: 'log-2',
	startedAt: '2026-11-18T10:00:00.000Z',
	stoppedAt: '2026-11-18T10:00:00.000Z',
	isRunning: true,
	logType: body.logType,
	source: body.source,
	projectId: body.projectId ?? null,
	taskId: body.taskId ?? null,
	organizationId: body.organizationId,
	tenantId: body.tenantId
});

// An API that predates the EMBED source refuses it the way Gauzy's validation does.
const refusingEmbed = (request) => {
	if (request.body.source === 'EMBED') {
		return json(400, {
			statusCode: 400,
			message: ['source must be one of the following values: BROWSER, TEAMS'],
			error: 'Bad Request'
		});
	}
	return json(201, timeLogOf(request.body));
};

test("the status is read with the tenant and organization of the token's member, read once", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/timer/status': STATUS });
	const teams = createClient({ apiUrl: API_URL, token: 'access-1', fetch: api.fetch });

	const status = await teams.timer.status();
	await teams.timer.status();

	const [me, read] = api.requests;
	assert.deepEqual(status, STATUS);
	assert.deepEqual(api.routesSent(), ['GET /user/me', 'GET /timesheet/timer/status', 'GET /timesheet/timer/status']);
	assert.deepEqual(me.query, { includeEmployee: 'true', includeOrganization: 'true' });
	assert.deepEqual(read.query, { tenantId: 'tenant-1', organizationId: 'org-1' });
	assert.equal(read.headers.get('tenant-id'), 'tenant-1');
	assert.equal(read.headers.get('organization-id'), 'org-1');
	assert.equal(read.headers.get('Authorization'), 'Bearer access-1');
});

test('a client given its tenant and organization does not read the user', async () => {
	const api = standInApi({ 'GET /timesheet/timer/status': STATUS });
	const teams = createClient({
		apiUrl: API_URL,
		token: 't',
		tenantId: 'tenant-9',
		organizationId: 'org-9',
		fetch: api.fetch
	});

	await teams.timer.status();

	assert.deepEqual(api.routesSent(), ['GET /timesheet/timer/status']);
	assert.deepEqual(api.requests[0].query, { tenantId: 'tenant-9', organizationId: 'org-9' });
});

test("a start sends the kit's fields and only the ids given, and answers the time log", async () => {
	const api = standInApi({
		'GET /user/me': ME,
		'POST /timesheet/timer/start': (request) => json(201, timeLogOf(request.body))
	});
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const log = await teams.timer.start({ projectId: 'project-1', description: 'Review the pull request' });

	const start = api.requests[1];
	assert.deepEqual(start.body, {
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		logType: 'TRACKED',
		source: 'EMBED',
		isBillable: true,
		billableFromProject: true,
		projectId: 'project-1',
		description: 'Review the pull request'
	});
	assert.equal(start.headers.get('tenant-id'), 'tenant-1');
	assert.equal(log.id, 'log-2');
	assert.equal(log.projectId, 'project-1');
});

test('a stop sends the tenant, the organization, the log type and the source', async () => {
	const api = standInApi({
		'GET /user/me': ME,
		'POST /timesheet/timer/stop': (request) => json(201, { ...timeLogOf(request.body), isRunning: false })
	});
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const log = await teams.timer.stop();

	assert.deepEqual(api.requests[1].body, {
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		logType: 'TRACKED',
		source: 'EMBED'
	});
	assert.equal(log.isRunning, false);
});

test("on an API that refuses EMBED the start goes again as TEAMS, and this client's stop goes as TEAMS", async () => {
	const api = standInApi({
		'GET /user/me': ME,
		'POST /timesheet/timer/start': refusingEmbed,
		'POST /timesheet/timer/stop': refusingEmbed
	});
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const log = await teams.timer.start();
	await teams.timer.stop();

	const sources = api.requests.filter((request) => request.body).map((request) => request.body.source);
	assert.equal(log.source, 'TEAMS');
	assert.deepEqual(sources, ['EMBED', 'TEAMS', 'TEAMS']);
});

test('the fallback stays in its client: another client, and the request functions, still send EMBED', async () => {
	const api = standInApi({ 'GET /user/me': ME, 'POST /timesheet/timer/start': refusingEmbed });
	const first = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });
	const second = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await first.timer.start();
	await second.timer.start();

	const sources = api.requests.filter((request) => request.body).map((request) => request.body.source);
	assert.deepEqual(sources, ['EMBED', 'TEAMS', 'EMBED', 'TEAMS']);
	assert.equal(currentTimerSource(), 'EMBED');
});

test('another 400 is thrown as a validation error, without a retry', async () => {
	const api = standInApi({
		'GET /user/me': ME,
		'POST /timesheet/timer/start': () =>
			json(400, {
				statusCode: 400,
				message: ['projectId must be a UUID'],
				error: 'Bad Request'
			})
	});
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await assert.rejects(teams.timer.start({ projectId: 'not-a-uuid' }), (error) => {
		assert.ok(error instanceof EverTeamsValidationError);
		assert.deepEqual(error.messages, ['projectId must be a UUID']);
		return true;
	});
	assert.equal(api.requests.filter((request) => request.route === 'POST /timesheet/timer/start').length, 1);
});

test('a token whose user is in no organization says to pass organizationId', async () => {
	const api = standInApi({ 'GET /user/me': { id: 'user-2', tenantId: 'tenant-1' } });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await assert.rejects(teams.timer.status(), (error) => {
		assert.ok(error instanceof EverTeamsError);
		assert.equal(error.code, 'NO_ORGANIZATION');
		assert.match(error.nextStep, /organizationId/);
		return true;
	});
});

test('a failed read of the user is not kept: the next call reads it again', async () => {
	let reads = 0;
	const api = standInApi({
		'GET /user/me': () => {
			reads += 1;
			if (reads === 1) {
				return json(503, { statusCode: 503, message: 'Service Unavailable' });
			}
			return json(200, ME);
		},
		'GET /timesheet/timer/status': STATUS
	});
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await assert.rejects(teams.timer.status(), (error) => error.name === 'EverTeamsServerError');
	const status = await teams.timer.status();

	assert.equal(reads, 2);
	assert.equal(status.running, true);
});

test('two clients send to their own API, and the configuration of the request functions stays as it was', async () => {
	const before = apiConfigManager.getConfig().apiUrl;
	const first = standInApi({ 'GET /timesheet/timer/status': { ...STATUS, duration: 1 } });
	const second = standInApi({ 'GET /timesheet/timer/status': { ...STATUS, duration: 2 } });
	const scope = { tenantId: 'tenant-1', organizationId: 'org-1' };
	const one = createClient({ apiUrl: 'https://one.example.com/api', token: 'one', fetch: first.fetch, ...scope });
	const two = createClient({ apiUrl: 'https://two.example.com/api', token: 'two', fetch: second.fetch, ...scope });

	const [a, b] = await Promise.all([one.timer.status(), two.timer.status()]);

	assert.equal(a.duration, 1);
	assert.equal(b.duration, 2);
	assert.match(first.requests[0].url, /^https:\/\/one\.example\.com\/api\//);
	assert.match(second.requests[0].url, /^https:\/\/two\.example\.com\/api\//);
	assert.equal(apiConfigManager.getConfig().apiUrl, before);
});
