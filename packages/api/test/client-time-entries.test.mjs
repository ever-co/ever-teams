// The client's time entries, against the built package: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../dist/index.es.js';
import { API_URL, ME, standInApi } from './support/stand-in-api.mjs';

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
		{ from: '2026-04-31T08:00:00+02:00', to: '2026-05-02' }
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
});
