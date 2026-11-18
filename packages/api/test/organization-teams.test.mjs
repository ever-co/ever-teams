// Runs against the built package: `yarn test` in packages/api builds it, then runs node --test test/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import qs from 'qs';
import { getOrganisationTeams, apiConfigManager } from '../dist/index.es.js';

const user = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1' } };
const originalFetch = globalThis.fetch;
let asked;

// The query the teams read sends, as the API parses it
function sentQuery() {
	const url = new URL(asked);
	return qs.parse(url.search.slice(1));
}

beforeEach(() => {
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });
	globalThis.fetch = async (url) => {
		asked = url;
		return new Response(JSON.stringify({ items: [], total: 0 }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	};
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

test("a read with a host token asks only for the member's teams in its organization, as the embed guard allows", async () => {
	await getOrganisationTeams({ user, token: 't', organizationId: 'org-1', projectId: 'project-1', embedded: true });

	assert.deepEqual(sentQuery(), {
		where: { organizationId: 'org-1', tenantId: 'tenant-1', members: { employeeId: 'employee-1' } }
	});
});

test('any other read asks for the teams with their members, projects and last worked task, as before', async () => {
	await getOrganisationTeams({ user, token: 't', organizationId: 'org-1', projectId: 'project-1' });
	const query = sentQuery();

	assert.deepEqual(query.where, {
		organizationId: 'org-1',
		tenantId: 'tenant-1',
		members: { employeeId: 'employee-1' },
		projects: { id: 'project-1' }
	});
	assert.equal(query.withLastWorkedTask, 'true');
	assert.deepEqual(query.relations, [
		'members',
		'members.role',
		'members.employee',
		'members.employee.user',
		'createdByUser',
		'projects',
		'projects.customFields.repository'
	]);
});
