// projects, against a stand-in API that answers what the API recorded: node --test test/*.test.mjs (from apps/cli,
// after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './support/cli.mjs';
import { PERSONAL_TOKEN, everythingOf, recorded, signedIn, signedInHome, standInApi } from './support/stand-in-api.mjs';

const projectsApi = (answer) =>
	standInApi({ ...signedIn(), 'GET /organization-projects/employee/<employee-1>': answer });

test("projects lists the member's projects by name, with the id of each", async () => {
	const api = projectsApi(recorded('projects.list'));

	const result = await runCli(['projects'], { home: signedInHome(), fetch: api.fetch });

	assert.equal(result.code, 0);
	assert.equal(result.stdout, '<name-3>  <project-1>\n<name-4>  <project-2>\n<name-5>  <project-3>\n');
	assert.deepEqual(api.routesSent(), [
		'POST /auth/api-token/exchange',
		'GET /user/me',
		'GET /organization-projects/employee/<employee-1>'
	]);
	assert.doesNotMatch(everythingOf(result, api), new RegExp(PERSONAL_TOKEN));
});

test('projects --json answers the id and the name of each project only', async () => {
	const api = projectsApi(recorded('projects.list'));

	const result = await runCli(['projects', '--json'], { home: signedInHome(), fetch: api.fetch });

	assert.deepEqual(JSON.parse(result.stdout), {
		projects: [
			{ id: '<project-1>', name: '<name-3>' },
			{ id: '<project-2>', name: '<name-4>' },
			{ id: '<project-3>', name: '<name-5>' }
		]
	});
});

test('a member of no project is told so', async () => {
	const api = projectsApi([]);

	const result = await runCli(['projects'], { home: signedInHome(), fetch: api.fetch });

	assert.equal(result.code, 0);
	assert.equal(result.stdout, 'You are a member of no project.\n');
});
