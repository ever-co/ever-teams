// The client's projects, against the built package: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, EverTeamsForbiddenError } from '../dist/index.es.js';
import { API_URL, ME, json, standInApi } from './support/stand-in-api.mjs';

const PROJECTS = [
	{ id: 'project-1', name: 'Website', billing: 'RATE', currency: 'USD', public: true, imageUrl: null },
	{ id: 'project-2', name: 'Mobile app', billing: 'FLAT_FEE', currency: 'EUR', public: false, imageUrl: null }
];

test("the projects are the member's, read with the tenant and organization", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /organization-projects/employee/employee-1': PROJECTS });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const projects = await teams.projects.list();

	const read = api.requests[1];
	assert.deepEqual(projects, PROJECTS);
	assert.deepEqual(read.query, { organizationId: 'org-1', tenantId: 'tenant-1' });
	assert.equal(read.headers.get('tenant-id'), 'tenant-1');
	assert.equal(read.headers.get('organization-id'), 'org-1');
});

test('the member is read from the user even when the tenant and organization are given', async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /organization-projects/employee/employee-1': [] });
	const teams = createClient({
		apiUrl: API_URL,
		token: 't',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		fetch: api.fetch
	});

	await teams.projects.list();
	await teams.projects.list();

	assert.deepEqual(api.routesSent(), [
		'GET /user/me',
		'GET /organization-projects/employee/employee-1',
		'GET /organization-projects/employee/employee-1'
	]);
});

test("an embed token, which reaches only the timer, gets the API's refusal and the token to use", async () => {
	const api = standInApi({
		'GET /user/me': ME,
		'GET /organization-projects/employee/employee-1': () =>
			json(403, { statusCode: 403, code: 'EMBED_SCOPE', message: 'An embed token reaches only the timer.' })
	});
	const teams = createClient({ apiUrl: API_URL, token: 'embed-token', fetch: api.fetch });

	await assert.rejects(teams.projects.list(), (error) => {
		assert.ok(error instanceof EverTeamsForbiddenError);
		assert.equal(error.code, 'EMBED_SCOPE');
		assert.match(error.nextStep, /personal API token/);
		return true;
	});
});

test('a user who is no member gets an error before any project request', async () => {
	const api = standInApi({ 'GET /user/me': { id: 'user-2', tenantId: 'tenant-1' } });
	const teams = createClient({ apiUrl: API_URL, token: 't', organizationId: 'org-1', fetch: api.fetch });

	await assert.rejects(teams.projects.list(), { code: 'NO_EMPLOYEE' });
	assert.deepEqual(api.routesSent(), ['GET /user/me']);
});

test("an organizationId other than the member's gets an error before any member read: its employee is another's", async () => {
	const api = standInApi({ 'GET /user/me': ME });
	const teams = createClient({ apiUrl: API_URL, token: 't', organizationId: 'org-2', fetch: api.fetch });

	for (const read of [() => teams.projects.list(), () => teams.totals.today()]) {
		await assert.rejects(read(), (error) => {
			assert.equal(error.code, 'NO_EMPLOYEE');
			assert.match(error.message, /org-1, not of org-2/);
			assert.match(error.nextStep, /organizationId/);
			return true;
		});
	}
	assert.deepEqual(api.routesSent(), ['GET /user/me']);
});

test('a /user/me answer with no user is an error, and is read again on the next call', async () => {
	const meAnswers = [null, ME];
	const api = standInApi({
		'GET /user/me': () => json(200, meAnswers.shift()),
		'GET /organization-projects/employee/employee-1': []
	});
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	await assert.rejects(teams.projects.list(), { name: 'EverTeamsError', code: 'UNEXPECTED_ANSWER' });
	assert.deepEqual(await teams.projects.list(), []);
	assert.deepEqual(api.routesSent(), [
		'GET /user/me',
		'GET /user/me',
		'GET /organization-projects/employee/employee-1'
	]);
});
