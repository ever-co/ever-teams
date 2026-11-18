// The placeholders of the recorded answers: node --test test/*.test.mjs (from packages/api).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEPT_KEYS, redactRecordings } from '../scripts/contract/redact.mjs';

const EMPLOYEE = '3f2b6c1e-8a4d-4f7e-9b1c-2d3e4f5a6b7c';
const USER = '7c6b5a4f-3e2d-4c1b-9a8f-7e6d5c4b3a29';
const OTHER_USER = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const TENANT = '11111111-2222-4333-8444-555555555555';
const TEAM = '99999999-8888-4777-8666-555555555555';
const LOG = 'abcdefab-cdef-4abc-8def-abcdefabcdef';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.c2lnbmF0dXJlLW9mLXRoZS10b2tlbg';

const recording = (name, answer, idKind, route = 'GET /user/me') => ({ name, route, status: 200, answer, idKind });

const fixtureOf = (result, name) => result.fixtures.find((fixture) => fixture.name === name);

test('an id becomes a placeholder named after its record, the same in every answer', () => {
	const result = redactRecordings([
		recording(
			'user.me',
			{ id: USER, tenantId: TENANT, employee: { id: EMPLOYEE, createdByUserId: OTHER_USER } },
			'user'
		),
		recording(
			'timer.start',
			{ id: LOG, employeeId: EMPLOYEE.toUpperCase(), organizationTeamId: TEAM, updatedByUserId: USER },
			'log',
			'POST /timesheet/timer/start'
		)
	]);

	assert.deepEqual(fixtureOf(result, 'user.me').answer, {
		id: '<user-1>',
		tenantId: '<tenant-1>',
		employee: { id: '<employee-1>', createdByUserId: '<user-2>' }
	});
	assert.deepEqual(fixtureOf(result, 'timer.start').answer, {
		id: '<log-1>',
		employeeId: '<employee-1>',
		organizationTeamId: '<team-1>',
		updatedByUserId: '<user-1>'
	});
});

test('the records of a list take its kind, and an id in the route the kind of the segment before it', () => {
	const result = redactRecordings([
		recording(
			'members.list',
			{ items: [{ id: EMPLOYEE, user: { id: USER } }], total: 1 },
			'employee',
			'GET /employee/working'
		),
		recording('tasks.list', [{ id: LOG }], 'task', `GET /tasks/employee/${EMPLOYEE}`)
	]);

	assert.deepEqual(fixtureOf(result, 'members.list').answer, {
		items: [{ id: '<employee-1>', user: { id: '<user-1>' } }],
		total: 1
	});
	assert.equal(fixtureOf(result, 'tasks.list').route, 'GET /tasks/employee/<employee-1>');
	assert.deepEqual(fixtureOf(result, 'tasks.list').answer, [{ id: '<task-1>' }]);
});

test('names, emails and addresses become placeholders of their form; a value keeps its placeholder', () => {
	const person = { firstName: 'Lina', lastName: 'Okafor', email: 'Lina.Okafor@northwind.test' };
	const result = redactRecordings([
		recording(
			'members.list',
			{
				items: [
					{ fullName: 'Lina Okafor', user: { ...person, imageUrl: 'https://cdn.northwind.test/lina.png' } },
					{ fullName: 'Sam Lee', user: { firstName: 'Sam', email: 'sam@northwind.test' } },
					{ fullName: 'Lina Okafor', user: { email: 'lina.okafor@northwind.test' } }
				]
			},
			'employee'
		)
	]);

	const [first, second, third] = fixtureOf(result, 'members.list').answer.items;
	assert.deepEqual(first, {
		fullName: '<fullName-1>',
		user: {
			firstName: '<firstName-1>',
			lastName: '<lastName-1>',
			email: 'person-1@example.com',
			imageUrl: 'https://example.com/imageUrl-1'
		}
	});
	assert.deepEqual(second, {
		fullName: '<fullName-2>',
		user: { firstName: '<firstName-2>', email: 'person-2@example.com' }
	});
	assert.deepEqual(third, { fullName: '<fullName-1>', user: { email: 'person-1@example.com' } });
});

test('dates keep their order and their form, from 2000-01-01', () => {
	const result = redactRecordings([
		recording(
			'timer.stop',
			{
				startedAt: '2026-11-18T09:15:42.123Z',
				stoppedAt: '2026-11-18T10:00:00.000Z',
				createdAt: '2026-11-18T09:15:42.123Z',
				startedWorkOn: '2024-03-01',
				dueDate: '2023-12-31'
			},
			'log'
		)
	]);

	assert.deepEqual(fixtureOf(result, 'timer.stop').answer, {
		startedAt: '2000-01-01T00:00:00.000Z',
		stoppedAt: '2000-01-01T00:01:00.000Z',
		createdAt: '2000-01-01T00:00:00.000Z',
		startedWorkOn: '2000-01-02',
		dueDate: '2000-01-01'
	});
});

test('values picked from a list, numbers, booleans, null and empty text are kept; amounts of money are not', () => {
	const answer = {
		logType: 'TRACKED',
		source: 'EMBED',
		duration: 5400,
		isRunning: false,
		description: null,
		reason: '',
		billRateValue: 85,
		minimumBillingRate: 40
	};
	const result = redactRecordings([recording('timer.stop', answer, 'log')]);

	assert.deepEqual(fixtureOf(result, 'timer.stop').answer, { ...answer, billRateValue: 0, minimumBillingRate: 0 });
	assert.ok(KEPT_KEYS.has('logType'));
});

test("the labels an organization names itself become placeholders, even one holding a person's name", () => {
	const label = 'Waiting for Lina Okafor';
	const result = redactRecordings([
		recording(
			'tasks.list',
			[
				{ status: label, priority: 'Northwind urgent', size: 'Large', issueType: 'Bug' },
				{ status: label, priority: null, size: 'Small', issueType: 'Bug' }
			],
			'task'
		)
	]);

	assert.deepEqual(fixtureOf(result, 'tasks.list').answer, [
		{ status: '<status-1>', priority: '<priority-1>', size: '<size-1>', issueType: '<issueType-1>' },
		{ status: '<status-1>', priority: null, size: '<size-2>', issueType: '<issueType-1>' }
	]);
	assert.ok(result.forbidden.includes(label));
	for (const key of ['status', 'priority', 'size', 'issueType']) {
		assert.equal(KEPT_KEYS.has(key), false, key);
	}
});

test('a token is never kept, and a version that only looks dotted is not taken for one', () => {
	const result = redactRecordings([
		recording('user.me', { token: JWT, refresh_token: JWT, version: '1.2.3' }, 'user')
	]);

	assert.deepEqual(fixtureOf(result, 'user.me').answer, {
		token: '<jwt>',
		refresh_token: '<jwt>',
		version: '<version-1>'
	});
	assert.equal(result.forbidden.includes(JWT), false);
});

test('the real values replaced are listed, and no placeholder among them', () => {
	const result = redactRecordings([
		recording(
			'user.me',
			{ id: USER, firstName: 'Lina', email: 'lina@northwind.test', logType: 'TRACKED', at: '2026-11-18' },
			'user'
		)
	]);

	assert.deepEqual(result.forbidden.sort(), [USER, 'Lina', 'lina@northwind.test'].sort());
});
