// Runs against the built package: `yarn test` in packages/api builds it, then runs node --test test/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getEmbedProjects, apiConfigManager } from '../dist/index.es.js';

const originalFetch = globalThis.fetch;
let requests;

// The API answers every request with this status and body.
function apiAnswers(status, body) {
	globalThis.fetch = async (url, init) => {
		requests.push({
			url: String(url),
			method: init.method,
			authorization: init.headers.authorization,
			tenant: init.headers['tenant-id']
		});
		return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
	};
}

beforeEach(() => {
	requests = [];
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

test('the embed projects are read from the embed route with the token and its tenant, and come back as the API lists them', async () => {
	const listed = [
		{ id: 'project-2', name: 'Fabrikam site' },
		{ id: 'project-1', name: 'Fabrikam trail app' }
	];
	apiAnswers(200, listed);

	const projects = await getEmbedProjects('host-token', 'tenant-1');

	assert.deepEqual(requests, [
		{
			url: 'https://api.example.com/api/embed/projects',
			method: 'GET',
			authorization: 'Bearer host-token',
			tenant: 'tenant-1'
		}
	]);
	assert.deepEqual(projects, listed);
});

test('an API without the route answers an error that keeps its status: 404, or 403 from its embed guard', async () => {
	apiAnswers(404, { statusCode: 404, message: 'Cannot GET /api/embed/projects' });
	assert.equal((await getEmbedProjects('host-token', 'tenant-1')).statusCode, 404);

	apiAnswers(403, { statusCode: 403, code: 'EMBED_SCOPE', message: 'An embed token reaches only the timer.' });
	const refused = await getEmbedProjects('host-token', 'tenant-1');
	assert.equal(refused.statusCode, 403);
	assert.equal(refused.code, 'EMBED_SCOPE');
});

test('a read that gets no answer comes back as an error with its message and no status', async () => {
	globalThis.fetch = async () => {
		throw new TypeError('Failed to fetch');
	};

	assert.deepEqual(await getEmbedProjects('host-token', 'tenant-1'), { message: 'Failed to fetch' });
});

test('an answer that is not a list comes back as an error with no status, and an empty list as an empty list', async () => {
	for (const body of [null, { items: [] }]) {
		apiAnswers(200, body);
		const answer = await getEmbedProjects('host-token', 'tenant-1');
		assert.equal(Array.isArray(answer), false, JSON.stringify(body));
		assert.equal(answer.statusCode, undefined);
		assert.match(answer.message, /no list/);
	}

	apiAnswers(200, []);
	assert.deepEqual(await getEmbedProjects('host-token', 'tenant-1'), []);
});
