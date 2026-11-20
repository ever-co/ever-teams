// Runs against the built package: `yarn test` in packages/api builds it, then runs node --test test/*.test.mjs
// The apps and URLs read follows the employee a manager picks, as the kit's other report reads (ever-co/ever-teams#5631).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import qs from 'qs';
import { getActivitiesStats, apiConfigManager } from '../dist/index.es.js';

const user = { id: 'user-ines', tenantId: 'tenant-1', employee: { id: 'employee-ines' } };
const originalFetch = globalThis.fetch;
let asked;

// The employees the read asks for, as the API parses its query
async function employeesAskedFor(params) {
	await getActivitiesStats({ token: 't', selectedTeam: 'all', organizationId: 'org-1', ...params });
	return qs.parse(new URL(asked).search.slice(1)).employeeIds;
}

beforeEach(() => {
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });
	asked = undefined;
	globalThis.fetch = async (url) => {
		asked = url;
		return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

test('the read asks for the employee picked, even for a person who is an employee', async () => {
	assert.deepEqual(await employeesAskedFor({ user, selectedEmployee: 'employee-maximiliana' }), [
		'employee-maximiliana'
	]);
});

test('with "all", it asks for the signed-in person own, as before', async () => {
	assert.deepEqual(await employeesAskedFor({ user, selectedEmployee: 'all' }), ['employee-ines']);
});

test('with "all" and a person who is not an employee, it asks for no employee', async () => {
	const admin = { id: 'user-admin', tenantId: 'tenant-1' };

	assert.equal(await employeesAskedFor({ user: admin, selectedEmployee: 'all' }), undefined);
});
