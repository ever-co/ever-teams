// The client's members, against the built package: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, EverTeamsForbiddenError } from '../dist/index.es.js';
import { API_URL, ME, json, standInApi } from './support/stand-in-api.mjs';

const MEMBERS = {
	items: [
		{
			id: 'employee-1',
			fullName: 'Ada Example',
			isActive: true,
			isTrackingEnabled: true,
			userId: 'user-1',
			user: { id: 'user-1', firstName: 'Ada', lastName: 'Example', email: 'ada@example.com' }
		},
		{
			id: 'employee-2',
			fullName: 'Grace Example',
			isActive: true,
			isTrackingEnabled: false,
			userId: 'user-3',
			user: { id: 'user-3', firstName: 'Grace', lastName: 'Example', email: 'grace@example.com' }
		}
	],
	total: 2
};

test("the members are the organization's working this week, with their user", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /employee/working': MEMBERS });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const members = await teams.members.list();

	const read = api.requests[1];
	const { findInput } = JSON.parse(read.query.data);
	const start = new Date(findInput.forRange.startDate);
	const end = new Date(findInput.forRange.endDate);
	const now = Date.now();
	assert.deepEqual(members, MEMBERS.items);
	assert.equal(findInput.organizationId, 'org-1');
	assert.equal(findInput.tenantId, 'tenant-1');
	assert.equal(findInput.withUser, true);
	assert.equal(findInput.forRange.isCustomDate, false);
	assert.equal(start.getDay(), 1);
	assert.equal(start.getHours() + start.getMinutes() + start.getSeconds() + start.getMilliseconds(), 0);
	assert.equal(end.getDay(), 0);
	assert.equal(end.getHours(), 23);
	assert.equal(end.getMilliseconds(), 999);
	assert.ok(start.getTime() <= now && now <= end.getTime());
	assert.equal(read.headers.get('tenant-id'), 'tenant-1');
	assert.equal(read.headers.get('organization-id'), 'org-1');
});

test('a member whose role may not select employees gets a forbidden error', async () => {
	const api = standInApi({
		'GET /user/me': ME,
		'GET /employee/working': () => json(403, { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 })
	});
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await assert.rejects(teams.members.list(), (error) => {
		assert.ok(error instanceof EverTeamsForbiddenError);
		assert.match(error.nextStep, /administrator/);
		return true;
	});
});
