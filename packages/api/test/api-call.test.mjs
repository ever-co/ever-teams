// What ApiCall returns for an error answer (src/lib/fetch.ts): node --test test/*.test.mjs (from packages/api). esbuild
// bundles the module on its own; each test answers its request with a stand-in for fetch.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const realFetch = globalThis.fetch;

let api;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-call-'));
	const outfile = path.join(bundleDir, 'fetch.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'fetch.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		outfile,
		logLevel: 'error'
	});
	api = await import(pathToFileURL(outfile).href);
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

afterEach(() => {
	globalThis.fetch = realFetch;
});

// The answer of the API for the next request.
const answerWith = (status, statusText, body) => {
	globalThis.fetch = async () => new Response(body, { status, statusText });
};

test("an error answer with the API's JSON keeps it, with its status", async () => {
	answerWith(401, 'Unauthorized', JSON.stringify({ statusCode: 401, message: 'Unauthorized' }));
	assert.deepEqual(await api.ApiCall({ path: '/user/me', method: 'GET' }), {
		statusCode: 401,
		message: 'Unauthorized'
	});

	answerWith(403, 'Forbidden', JSON.stringify({ message: 'Not allowed', code: 'EMBED_ORIGIN_NOT_ALLOWED' }));
	assert.deepEqual(await api.ApiCall({ path: '/user/me', method: 'GET' }), {
		statusCode: 403,
		message: 'Not allowed',
		code: 'EMBED_ORIGIN_NOT_ALLOWED'
	});

	answerWith(400, 'Bad Request', JSON.stringify({ error: 'Invalid token' }));
	assert.deepEqual(await api.ApiCall({ path: '/user/me', method: 'GET' }), {
		statusCode: 400,
		error: 'Invalid token'
	});
});

test('a JSON error body with neither a message nor an error gets the status text, which the request functions look for', async () => {
	answerWith(503, 'Service Unavailable', JSON.stringify({ retryAfter: 30 }));
	assert.deepEqual(await api.ApiCall({ path: '/user/me', method: 'GET' }), {
		statusCode: 503,
		message: 'Service Unavailable',
		error: 'Service Unavailable',
		retryAfter: 30
	});
});

test("a gateway's HTML error page, or an empty error body, is an answer with its status, not a request with none", async () => {
	answerWith(503, 'Service Unavailable', '<html><body>503 Service Temporarily Unavailable</body></html>');
	assert.deepEqual(await api.ApiCall({ path: '/timesheet/timer/status', method: 'GET' }), {
		statusCode: 503,
		message: 'Service Unavailable',
		error: 'Service Unavailable'
	});

	answerWith(401, '', null);
	assert.deepEqual(await api.ApiCall({ path: '/user/me', method: 'GET' }), {
		statusCode: 401,
		message: 'HTTP 401',
		error: 'HTTP 401'
	});
});

test('a request that gets no answer still fails without a status', async () => {
	globalThis.fetch = async () => {
		throw new TypeError('Failed to fetch');
	};
	await assert.rejects(api.ApiCall({ path: '/user/me', method: 'GET' }), TypeError);
});
