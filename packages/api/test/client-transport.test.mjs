// How a client sends its requests (src/lib/client/transport.ts): node --test test/*.test.mjs (from packages/api).
// esbuild bundles the module with qs; each test answers through a stand-in for fetch given to the transport.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

let transport;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'client-transport-'));
	const outfile = path.join(bundleDir, 'transport.cjs');
	await esbuild.build({
		stdin: {
			contents: "export * from './transport'; export * from './errors';",
			resolveDir: path.join(here, '..', 'src', 'lib', 'client'),
			loader: 'ts'
		},
		bundle: true,
		format: 'cjs',
		platform: 'node',
		outfile,
		logLevel: 'error'
	});
	transport = require(outfile);
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

const json = (status, body) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const unauthorized = () => json(401, { message: 'Unauthorized', statusCode: 401 });

const bodyOf = (init) => {
	if (!init.body) {
		return undefined;
	}
	return JSON.parse(init.body);
};

// A stand-in API: `answer(request)` gives each answer; `requests` keeps what was sent.
const api = (answer) => {
	const requests = [];
	const fetch = async (url, init) => {
		const request = {
			url,
			method: init.method,
			headers: init.headers,
			bearer: init.headers.get('Authorization'),
			body: bodyOf(init)
		};
		requests.push(request);
		return answer(request);
	};
	return { fetch, requests };
};

test('a request goes to apiUrl with its query, the bearer, the tenant and the organization', async () => {
	const server = api(() => json(200, { ok: true }));
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api/',
		token: 'access-1',
		fetch: server.fetch,
		headers: { 'X-Client-App': 'script', Authorization: 'Bearer not-this-one' }
	});

	const answer = await client.request({
		method: 'GET',
		path: '/tasks/employee/employee-1',
		query: { where: { organizationId: 'org-1', projectId: null }, ids: ['a', 'b'] },
		tenantId: 'tenant-1',
		organizationId: 'org-1'
	});

	const [sent] = server.requests;
	assert.deepEqual(answer, { ok: true });
	assert.equal(
		decodeURIComponent(sent.url),
		'https://api.example.com/api/tasks/employee/employee-1?where[organizationId]=org-1&ids[0]=a&ids[1]=b'
	);
	assert.equal(sent.bearer, 'Bearer access-1');
	assert.equal(sent.headers.get('tenant-id'), 'tenant-1');
	assert.equal(sent.headers.get('organization-id'), 'org-1');
	assert.equal(sent.headers.get('X-Client-App'), 'script');
	assert.equal(sent.headers.get('Accept'), 'application/json');
	assert.equal(sent.headers.get('Content-Type'), null);
});

test('a body is sent as JSON', async () => {
	const server = api(() => json(201, { id: 'log-1' }));
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 't',
		fetch: server.fetch
	});

	await client.request({ method: 'POST', path: '/timesheet/timer/start', body: { projectId: 'p-1' } });

	assert.equal(server.requests[0].method, 'POST');
	assert.equal(server.requests[0].headers.get('Content-Type'), 'application/json');
	assert.deepEqual(server.requests[0].body, { projectId: 'p-1' });
});

test('two clients keep their own address and token', async () => {
	const first = api(() => json(200, 'first'));
	const second = api(() => json(200, 'second'));
	const one = transport.createTransport({ apiUrl: 'https://one.example.com/api', token: 'one', fetch: first.fetch });
	const two = transport.createTransport({ apiUrl: 'https://two.example.com/api', token: 'two', fetch: second.fetch });

	const answers = await Promise.all([
		one.request({ method: 'GET', path: '/user/me' }),
		two.request({ method: 'GET', path: '/user/me' })
	]);

	assert.deepEqual(answers, ['first', 'second']);
	assert.equal(first.requests[0].url, 'https://one.example.com/api/user/me');
	assert.equal(first.requests[0].bearer, 'Bearer one');
	assert.equal(second.requests[0].url, 'https://two.example.com/api/user/me');
	assert.equal(second.requests[0].bearer, 'Bearer two');
});

test('getToken is asked once for the first token, also for requests sent together', async () => {
	let asked = 0;
	const server = api(() => json(200, {}));
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		getToken: async () => {
			asked += 1;
			return { token: 'from-get-token' };
		},
		fetch: server.fetch
	});

	await Promise.all([client.request({ method: 'GET', path: '/a' }), client.request({ method: 'GET', path: '/b' })]);
	await client.request({ method: 'GET', path: '/c' });

	assert.equal(asked, 1);
	assert.deepEqual(
		server.requests.map((request) => request.bearer),
		['Bearer from-get-token', 'Bearer from-get-token', 'Bearer from-get-token']
	);
});

test('a 401 asks getToken for a new token once and sends the request once more', async () => {
	const tokens = ['expired', 'fresh'];
	const server = api((request) => {
		if (request.bearer === 'Bearer expired') {
			return unauthorized();
		}
		return json(200, { running: false });
	});
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		getToken: async () => tokens.shift(),
		fetch: server.fetch
	});

	const answer = await client.request({ method: 'GET', path: '/timesheet/timer/status' });
	await client.request({ method: 'GET', path: '/timesheet/timer/status' });

	assert.deepEqual(answer, { running: false });
	assert.deepEqual(
		server.requests.map((request) => request.bearer),
		['Bearer expired', 'Bearer fresh', 'Bearer fresh']
	);
});

test('a token refused twice is an auth error after one retry', async () => {
	let asked = 0;
	const server = api(() => unauthorized());
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		getToken: async () => {
			asked += 1;
			return `token-${asked}`;
		},
		fetch: server.fetch
	});

	await assert.rejects(client.request({ method: 'GET', path: '/user/me' }), (error) => {
		assert.ok(error instanceof transport.EverTeamsAuthError);
		assert.equal(error.status, 401);
		return true;
	});
	assert.equal(asked, 2);
	assert.equal(server.requests.length, 2);
});

test('a fixed token is used first; after a 401 getToken gives the next ones', async () => {
	const server = api((request) => {
		if (request.bearer === 'Bearer fixed') {
			return unauthorized();
		}
		return json(200, {});
	});
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 'fixed',
		getToken: async () => 'renewed',
		fetch: server.fetch
	});

	await client.request({ method: 'GET', path: '/a' });
	await client.request({ method: 'GET', path: '/b' });

	assert.deepEqual(
		server.requests.map((request) => request.bearer),
		['Bearer fixed', 'Bearer renewed', 'Bearer renewed']
	);
});

test('a fixed token without getToken is not retried after a 401', async () => {
	const server = api(() => unauthorized());
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 'old',
		fetch: server.fetch
	});

	await assert.rejects(client.request({ method: 'GET', path: '/user/me' }), transport.EverTeamsAuthError);
	assert.equal(server.requests.length, 1);
});

test('a personal API token is exchanged once, then its access token is sent', async () => {
	const server = api((request) => {
		if (request.url.endsWith('/auth/api-token/exchange')) {
			return json(200, { token: 'access-from-exchange' });
		}
		return json(200, {});
	});
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 'gzp_personal',
		organizationId: 'org-1',
		fetch: server.fetch
	});

	await client.request({ method: 'GET', path: '/a' });
	await client.request({ method: 'GET', path: '/b' });

	const [exchange, first, second] = server.requests;
	assert.equal(server.requests.length, 3);
	assert.equal(exchange.method, 'POST');
	assert.deepEqual(exchange.body, { token: 'gzp_personal', organizationId: 'org-1' });
	assert.equal(exchange.bearer, null);
	assert.equal(first.bearer, 'Bearer access-from-exchange');
	assert.equal(second.bearer, 'Bearer access-from-exchange');
});

test('an access token of a personal token that expired is exchanged again once', async () => {
	let exchanges = 0;
	const server = api((request) => {
		if (request.url.endsWith('/auth/api-token/exchange')) {
			exchanges += 1;
			return json(200, { token: `access-${exchanges}` });
		}
		if (request.bearer === 'Bearer access-1') {
			return unauthorized();
		}
		return json(200, {});
	});
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 'gzp_personal',
		fetch: server.fetch
	});

	await client.request({ method: 'GET', path: '/a' });

	assert.equal(exchanges, 2);
	assert.deepEqual(
		server.requests.map((request) => request.bearer),
		[null, 'Bearer access-1', null, 'Bearer access-2']
	);
});

test('a refused personal token says to create a new one; an API without them says so', async () => {
	const refused = api(() => unauthorized());
	const missing = api(() =>
		json(404, { message: 'Cannot POST /api/auth/api-token/exchange', error: 'Not Found', statusCode: 404 })
	);
	const revokedClient = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 'gzp_revoked',
		fetch: refused.fetch
	});
	const olderApiClient = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 'gzp_personal',
		fetch: missing.fetch
	});

	await assert.rejects(revokedClient.request({ method: 'GET', path: '/user/me' }), (error) => {
		assert.ok(error instanceof transport.EverTeamsAuthError);
		assert.match(error.nextStep, /create a new one/);
		return true;
	});
	await assert.rejects(olderApiClient.request({ method: 'GET', path: '/user/me' }), (error) => {
		assert.ok(error instanceof transport.EverTeamsNotFoundError);
		assert.match(error.nextStep, /GAUZY_USER_API_TOKENS_ENABLED/);
		return true;
	});
});

test("an error answer is thrown as its typed error, with the API's code", async () => {
	const server = api(() =>
		json(403, { statusCode: 403, code: 'EMBED_SCOPE', message: 'An embed token reaches only the timer.' })
	);
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 't',
		fetch: server.fetch
	});

	await assert.rejects(client.request({ method: 'GET', path: '/employee/working' }), (error) => {
		assert.ok(error instanceof transport.EverTeamsForbiddenError);
		assert.equal(error.code, 'EMBED_SCOPE');
		return true;
	});
});

test('a request with no answer is a network error', async () => {
	const client = transport.createTransport({
		apiUrl: 'http://localhost:1/api',
		token: 't',
		fetch: async () => {
			throw new TypeError('fetch failed');
		}
	});

	await assert.rejects(client.request({ method: 'GET', path: '/user/me' }), (error) => {
		assert.ok(error instanceof transport.EverTeamsNetworkError);
		assert.equal(error.status, 0);
		assert.match(error.message, /No answer from http:\/\/localhost:1\/api/);
		return true;
	});
});

test("an answer that is not JSON says apiUrl may be the web app's address", async () => {
	const client = transport.createTransport({
		apiUrl: 'https://app.example.com',
		token: 't',
		fetch: async () => new Response('<!DOCTYPE html><html></html>', { status: 200 })
	});

	await assert.rejects(client.request({ method: 'GET', path: '/user/me' }), (error) => {
		assert.equal(error.code, 'NOT_JSON');
		assert.equal(error.status, 200);
		assert.match(error.nextStep, /ends with \/api/);
		return true;
	});
});

test('an empty answer is null', async () => {
	const client = transport.createTransport({
		apiUrl: 'https://api.example.com/api',
		token: 't',
		fetch: async () => new Response(null, { status: 201 })
	});

	assert.equal(await client.request({ method: 'POST', path: '/timesheet/timer/stop', body: {} }), null);
});

test('a client without apiUrl, or without any token, is refused when it is made', () => {
	assert.throws(
		() => transport.createTransport({ token: 't' }),
		(error) => {
			assert.equal(error.code, 'CLIENT_OPTIONS');
			assert.match(error.nextStep, /apiUrl/);
			return true;
		}
	);
	assert.throws(
		() => transport.createTransport({ apiUrl: 'https://api.example.com/api' }),
		(error) => {
			assert.equal(error.code, 'CLIENT_OPTIONS');
			assert.match(error.nextStep, /getToken/);
			return true;
		}
	);
});
