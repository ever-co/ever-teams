// Each client method, given the answer recorded from the API (test/contract), returns it as its type declares: node
// --test test/*.test.mjs (from packages/api, after `rollup -c`). The stand-in serves only the recorded routes, so a
// method that moves to another route fails here too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '../dist/index.es.js';
import { CONTRACT_ANSWERS, contractAnswer } from '../scripts/contract/answers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://api.example.com/api';

const fixtureOf = (name) => JSON.parse(fs.readFileSync(path.join(here, 'contract', `${name}.json`), 'utf8'));

const me = fixtureOf('user.me');

// Answers each recorded route with its recorded answer, and keeps the routes the client sent.
function recordedApi(fixture) {
	const served = new Map([
		[me.route, me],
		[fixture.route, fixture]
	]);
	const sent = [];
	const fetch = async (url, init) => {
		const pathname = decodeURIComponent(new URL(url).pathname);
		const route = `${init.method} ${pathname.slice('/api'.length)}`;
		sent.push(route);
		const answer = served.get(route);
		if (!answer) {
			return Response.json({ statusCode: 404, message: `Cannot ${route}` }, { status: 404 });
		}
		return Response.json(answer.answer, { status: answer.status });
	};
	return { fetch, sent };
}

for (const contract of CONTRACT_ANSWERS.filter((answer) => answer.call)) {
	test(`${contract.name} returns the answer recorded from the API`, async () => {
		const fixture = fixtureOf(contract.name);
		const api = recordedApi(fixture);
		const teams = createClient({ apiUrl: API_URL, token: 'access', fetch: api.fetch });

		const returned = await contract.call(teams, { from: '2026-11-18', to: '2026-11-18' });

		assert.deepEqual(returned, contract.returned(fixture.answer));
		assert.deepEqual(api.sent, [me.route, fixture.route]);
	});
}

// The recording holds no entry on a client's project yet: one recorded with it (#5593) names the project's client as the
// entry's, with its id, name and image, and keeps the project without the client's record, as the contract expects.
test('timeEntries.list returns a recorded project client as the entry client', async () => {
	const contract = contractAnswer('timeEntries.list');
	const fixture = fixtureOf(contract.name);
	const [first, ...rest] = fixture.answer;
	const client = { id: '<client-1>', name: '<name-9>', imageUrl: null, primaryEmail: '<email-9>', budget: 0 };
	const project = { id: '<project-1>', name: '<name-8>', imageUrl: null, color: null, organizationContact: client };
	const answer = [{ ...first, projectId: project.id, project }, ...rest];
	const api = recordedApi({ ...fixture, answer });
	const teams = createClient({ apiUrl: API_URL, token: 'access', fetch: api.fetch });

	const returned = await contract.call(teams, { from: '2026-11-18', to: '2026-11-18' });

	assert.deepEqual(returned, contract.returned(answer));
	assert.deepEqual(returned[0].organizationContact, { id: '<client-1>', name: '<name-9>', imageUrl: null });
	assert.deepEqual(returned[0].project, { id: '<project-1>', name: '<name-8>', imageUrl: null, color: null });
});
