// The client's tasks, against the built package: node --test test/*.test.mjs (from packages/api, after `rollup -c`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../dist/index.es.js';
import { API_URL, ME, standInApi } from './support/stand-in-api.mjs';

const TASKS = [
	{
		id: 'task-1',
		title: 'Fix the sign-in page',
		number: 12,
		prefix: 'WEB',
		status: 'in-progress',
		projectId: 'project-1'
	},
	{
		id: 'task-2',
		title: 'Write the release notes',
		number: 13,
		prefix: 'WEB',
		status: 'todo',
		projectId: 'project-2'
	}
];

test("the tasks are the member's, in the tenant and organization", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /tasks/employee/employee-1': TASKS });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const tasks = await teams.tasks.list();

	const read = api.requests[1];
	assert.deepEqual(tasks, TASKS);
	assert.deepEqual(read.query, { where: { organizationId: 'org-1', tenantId: 'tenant-1' } });
	assert.equal(read.headers.get('tenant-id'), 'tenant-1');
});

test('a project narrows the tasks to that project', async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /tasks/employee/employee-1': [TASKS[0]] });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const tasks = await teams.tasks.list({ projectId: 'project-1' });

	assert.deepEqual(api.requests[1].query, {
		where: { organizationId: 'org-1', tenantId: 'tenant-1', projectId: 'project-1' }
	});
	assert.equal(tasks.length, 1);
});
