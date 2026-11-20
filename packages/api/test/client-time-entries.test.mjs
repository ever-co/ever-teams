// The client's time entries, against the built package: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, EverTeamsConflictError, EverTeamsForbiddenError } from '../dist/index.es.js';
import { API_URL, ME, json, standInApi } from './support/stand-in-api.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// One entry as GET /timesheet/time-log answers it with the kit's relations, cut to a few fields of each.
const ENTRY = {
	id: 'log-1',
	startedAt: '2026-11-18T08:00:00.000Z',
	stoppedAt: '2026-11-18T09:30:00.000Z',
	duration: 5400,
	logType: 'TRACKED',
	source: 'EMBED',
	isRunning: false,
	description: 'Review the pull request',
	employeeId: 'employee-1',
	projectId: 'project-1',
	taskId: 'task-1',
	project: { id: 'project-1', name: 'Website' },
	task: { id: 'task-1', title: 'Fix the sign-in page', taskNumber: '#12' },
	organizationContact: null,
	employee: { id: 'employee-1', fullName: 'Ada Example', user: { firstName: 'Ada', lastName: 'Example' } }
};

test("a day lists that whole local day's entries, with the kit's relations", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/time-log': [ENTRY] });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const entries = await teams.timeEntries.list({ from: '2026-11-18', to: '2026-11-18' });

	const { query, headers } = api.requests[1];
	assert.deepEqual(entries, [ENTRY]);
	assert.equal(query.startDate, new Date(2026, 10, 18).toISOString());
	assert.equal(query.endDate, new Date(2026, 10, 18, 23, 59, 59, 999).toISOString());
	assert.equal(query.tenantId, 'tenant-1');
	assert.equal(query.organizationId, 'org-1');
	assert.deepEqual(query.activityLevel, { start: '0', end: '100' });
	assert.deepEqual(query.relations, ['project', 'task', 'organizationContact', 'employee.user']);
	assert.equal(query.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone);
	assert.equal(query.employeeIds, undefined);
	assert.equal(headers.get('tenant-id'), 'tenant-1');
});

test('Dates and date-times are sent as the instants they are, with the members asked', async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/time-log': [] });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await teams.timeEntries.list({
		from: new Date('2026-11-16T00:00:00.000Z'),
		to: '2026-11-22T23:59:59.000Z',
		employeeIds: ['employee-1', 'employee-2']
	});

	const { query } = api.requests[1];
	assert.equal(query.startDate, '2026-11-16T00:00:00.000Z');
	assert.equal(query.endDate, '2026-11-22T23:59:59.000Z');
	assert.deepEqual(query.employeeIds, ['employee-1', 'employee-2']);
});

test("mine lists only the entries of the token's own member, whatever employeeIds names", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/time-log': [ENTRY] });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await teams.timeEntries.list({ from: '2026-11-18', to: '2026-11-18', mine: true });
	await teams.timeEntries.list({ from: '2026-11-18', to: '2026-11-18', mine: true, employeeIds: ['employee-2'] });

	assert.deepEqual(api.routesSent(), ['GET /user/me', 'GET /timesheet/time-log', 'GET /timesheet/time-log']);
	assert.deepEqual(api.requests[1].query.employeeIds, ['employee-1']);
	assert.deepEqual(api.requests[2].query.employeeIds, ['employee-1']);
});

test('mine with a token whose user is not a member is refused before the list is read', async () => {
	const api = standInApi({ 'GET /user/me': { ...ME, employee: null }, 'GET /timesheet/time-log': [ENTRY] });
	const teams = createClient({
		apiUrl: API_URL,
		token: 't',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		fetch: api.fetch
	});

	await assert.rejects(teams.timeEntries.list({ from: '2026-11-18', to: '2026-11-18', mine: true }), {
		code: 'NO_EMPLOYEE'
	});
	assert.deepEqual(api.routesSent(), ['GET /user/me']);
});

test('a date that is not one, or a range that ends before it starts, is refused before any request', async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/time-log': [] });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await assert.rejects(teams.timeEntries.list({ from: 'yesterday', to: '2026-11-18' }), (error) => {
		assert.equal(error.code, 'INVALID_DATE');
		assert.match(error.nextStep, /YYYY-MM-DD/);
		return true;
	});
	await assert.rejects(teams.timeEntries.list({ from: '2026-02-31', to: '2026-03-01' }), { code: 'INVALID_DATE' });
	await assert.rejects(teams.timeEntries.list({ from: '2026-11-18', to: '2026-11-17' }), { code: 'INVALID_DATE' });
	// Date rolls these over to March 1 and May 1: a date-time names a day that exists, or is refused.
	const rolledOver = [
		{ from: '2026-02-29T00:00:00.000Z', to: '2026-03-02' },
		{ from: '2026-04-31T08:00:00+02:00', to: '2026-05-02' },
		{ from: '2026-02-29 00:00:00Z', to: '2026-03-02' },
		{ from: '2026-02-29t00:00:00z', to: '2026-03-02' },
		{ from: '+002026-02-29T00:00:00Z', to: '2026-03-02' }
	];
	for (const range of rolledOver) {
		await assert.rejects(teams.timeEntries.list(range), { code: 'INVALID_DATE' });
	}
	assert.equal(api.requests.length, 0);
});

test('a date-time on a leap day, or with an offset, is a date-time like any other', async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/time-log': [] });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await teams.timeEntries.list({ from: '2028-02-29T00:00:00.000Z', to: '2028-03-01T10:00:00+02:00' });

	const { query } = api.requests[1];
	assert.equal(query.startDate, '2028-02-29T00:00:00.000Z');
	assert.equal(query.endDate, '2028-03-01T08:00:00.000Z');
	// The year 0 is a leap year, not 1900.
	await assert.doesNotReject(teams.timeEntries.list({ from: '0000-02-29T00:00:00Z', to: '0000-03-01' }));
});

// POST /timesheet/time-log answers the time log it created, the entity POST /timesheet/timer/start answers: the
// recorded answer of a start, as the API stores an entry added by hand.
const recordedStart = JSON.parse(fs.readFileSync(path.join(here, 'contract', 'timer.start.json'), 'utf8')).answer;
const MANUAL_LOG = {
	...recordedStart,
	logType: 'MANUAL',
	source: 'BROWSER',
	isRunning: false,
	stoppedAt: '2000-01-01T01:53:00.000Z',
	duration: 5400
};

test("a past entry is added for the token's member, with only the fields the API declares", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'POST /timesheet/time-log': () => json(201, MANUAL_LOG) });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const log = await teams.timeEntries.create({
		startedAt: '2026-11-18T09:00:00+01:00',
		stoppedAt: new Date('2026-11-18T09:30:00.000Z'),
		projectId: 'project-1',
		taskId: 'task-1',
		description: 'Review the pull request'
	});

	const { body, headers } = api.requests[1];
	assert.deepEqual(log, MANUAL_LOG);
	assert.deepEqual(api.routesSent(), ['GET /user/me', 'POST /timesheet/time-log']);
	assert.deepEqual(body, {
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		employeeId: 'employee-1',
		startedAt: '2026-11-18T08:00:00.000Z',
		stoppedAt: '2026-11-18T09:30:00.000Z',
		logType: 'MANUAL',
		source: 'BROWSER',
		projectId: 'project-1',
		taskId: 'task-1',
		description: 'Review the pull request',
		billableFromProject: true
	});
	assert.equal(headers.get('tenant-id'), 'tenant-1');
	assert.equal(headers.get('organization-id'), 'org-1');
});

test('a range with no time of day, or that does not end after it starts, is refused before any request', async () => {
	const api = standInApi({ 'GET /user/me': ME, 'POST /timesheet/time-log': () => json(201, MANUAL_LOG) });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const refused = [
		{ startedAt: '2026-11-18', stoppedAt: '2026-11-18T10:00:00Z' },
		{ startedAt: '2026-11-18T10:00:00Z', stoppedAt: '2026-11-18T10:00:00Z' },
		{ startedAt: '2026-11-18T10:00:00Z', stoppedAt: '2026-11-18T09:00:00Z' },
		{ startedAt: 'this morning', stoppedAt: '2026-11-18T09:00:00Z' },
		// Texts Date reads, each as a midnight: none names a time of day.
		{ startedAt: 'November 18, 2026', stoppedAt: '2026-11-18T10:00:00Z' },
		{ startedAt: '2026/11/18', stoppedAt: '2026-11-18T10:00:00Z' },
		{ startedAt: '2026-11-18T09:00:00Z', stoppedAt: '2026-12' }
	];
	for (const range of refused) {
		await assert.rejects(teams.timeEntries.create(range), (error) => {
			assert.equal(error.code, 'INVALID_DATE');
			assert.equal(error.status, 0);
			return true;
		});
	}
	assert.equal(api.requests.length, 0);
});

test('a date-time with a space or a lowercase t before its time is one', async () => {
	const api = standInApi({ 'GET /user/me': ME, 'POST /timesheet/time-log': () => json(201, MANUAL_LOG) });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await teams.timeEntries.create({ startedAt: '2026-11-18 09:00:00+01:00', stoppedAt: '2026-11-18t09:30Z' });

	const { body } = api.requests[1];
	assert.equal(body.startedAt, '2026-11-18T08:00:00.000Z');
	assert.equal(body.stoppedAt, '2026-11-18T09:30:00.000Z');
});

test('an organization that does not allow manual time answers a forbidden error that says so', async () => {
	const refusing = () => json(403, { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' });
	const api = standInApi({ 'GET /user/me': ME, 'POST /timesheet/time-log': refusing });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const range = { startedAt: '2026-11-18T09:00:00Z', stoppedAt: '2026-11-18T10:00:00Z' };
	await assert.rejects(teams.timeEntries.create(range), (error) => {
		assert.ok(error instanceof EverTeamsForbiddenError);
		assert.equal(error.status, 403);
		assert.match(error.nextStep, /allow manual time/);
		return true;
	});
});

test("an embed token's refusal keeps the next step of its code", async () => {
	const embedScope = () =>
		json(403, { statusCode: 403, message: 'Embed tokens reach the timer only', code: 'EMBED_SCOPE' });
	const api = standInApi({ 'GET /user/me': ME, 'POST /timesheet/time-log': embedScope });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const range = { startedAt: '2026-11-18T09:00:00Z', stoppedAt: '2026-11-18T10:00:00Z' };
	await assert.rejects(teams.timeEntries.create(range), (error) => {
		assert.equal(error.code, 'EMBED_SCOPE');
		assert.match(error.nextStep, /personal API token/);
		return true;
	});
});

test('a range over a running timer is a conflict that carries the API code', async () => {
	const overlap = () =>
		json(409, {
			message: 'A timer is running over this time range. Stop it first, or choose a range outside it.',
			code: 'RUNNING_TIMER_OVERLAP',
			runningTimeLog: { id: 'log-9', startedAt: '2026-11-18T08:30:00.000Z', source: 'TEAMS' }
		});
	const api = standInApi({ 'GET /user/me': ME, 'POST /timesheet/time-log': overlap });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const range = { startedAt: '2026-11-18T09:00:00Z', stoppedAt: '2026-11-18T10:00:00Z' };
	await assert.rejects(teams.timeEntries.create(range), (error) => {
		assert.ok(error instanceof EverTeamsConflictError);
		assert.equal(error.code, 'RUNNING_TIMER_OVERLAP');
		assert.match(error.nextStep, /stop the timer/);
		return true;
	});
});
