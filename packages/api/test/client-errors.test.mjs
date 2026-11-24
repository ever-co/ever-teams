// The typed error of each kind of answer (src/lib/client/error-mapping.ts): node --test test/*.test.mjs (from
// packages/api). esbuild bundles the module on its own. The answers are Gauzy's: the 401 and the 404 as a local
// Gauzy answered them, the others as its code writes them (embed.guards.ts, timer.service.ts, @nestjs/throttler and
// the validation pipe).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

let mapping;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'client-errors-'));
	const outfile = path.join(bundleDir, 'error-mapping.mjs');
	await esbuild.build({
		stdin: {
			contents: "export * from './error-mapping'; export * from './errors';",
			resolveDir: path.join(here, '..', 'src', 'lib', 'client'),
			loader: 'ts'
		},
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		outfile,
		logLevel: 'error'
	});
	mapping = await import(pathToFileURL(outfile).href);
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

const json = { 'Content-Type': 'application/json; charset=utf-8' };

// The typed error of an answer, with its body read as the client reads it.
const errorOf = async (response, nextSteps) => {
	const text = await response.text();
	let body = null;
	try {
		body = JSON.parse(text);
	} catch {
		body = null;
	}
	return mapping.errorFromResponse(response, body, nextSteps);
};

const textOf = (body) => {
	if (typeof body === 'string') {
		return body;
	}
	return JSON.stringify(body);
};

const answer = (status, statusText, body, headers = json) =>
	new Response(textOf(body), { status, statusText, headers });

test('a 401 is an auth error that says to get a new token', async () => {
	const error = await errorOf(answer(401, 'Unauthorized', { message: 'Unauthorized', statusCode: 401 }));

	assert.equal(error.name, 'EverTeamsAuthError');
	assert.equal(error.status, 401);
	assert.equal(error.message, 'Unauthorized');
	assert.equal(error.code, undefined);
	assert.match(error.nextStep, /get a new one/);
	assert.match(error.nextStep, /getToken/);
});

test("a 403 keeps the API's code, and an embed code gets its own next step", async () => {
	const scope = await errorOf(
		answer(403, 'Forbidden', {
			statusCode: 403,
			code: 'EMBED_SCOPE',
			message: 'An embed token reaches only the timer.'
		})
	);
	const project = await errorOf(
		answer(403, 'Forbidden', {
			statusCode: 403,
			code: 'EMBED_CLIENT_PROJECT',
			message: "This embed token tracks time only on its client's projects."
		})
	);
	const origin = await errorOf(
		answer(403, 'Forbidden', {
			statusCode: 403,
			code: 'EMBED_ORIGIN',
			message: 'This embed token works only from the site it was issued for.'
		})
	);
	const permission = await errorOf(
		answer(403, 'Forbidden', { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 })
	);

	assert.equal(scope.name, 'EverTeamsForbiddenError');
	assert.equal(scope.code, 'EMBED_SCOPE');
	assert.equal(scope.message, 'An embed token reaches only the timer.');
	assert.match(scope.nextStep, /personal API token/);
	assert.equal(project.code, 'EMBED_CLIENT_PROJECT');
	assert.match(project.nextStep, /projectId/);
	assert.equal(origin.code, 'EMBED_ORIGIN');
	assert.match(origin.nextStep, /exchange a new one/);
	assert.equal(permission.code, undefined);
	assert.equal(permission.message, 'Forbidden resource');
	assert.match(permission.nextStep, /administrator/);
});

test('a 404 says to check the address', async () => {
	const error = await errorOf(
		answer(404, 'Not Found', {
			message: 'Cannot GET /api/no-such-route',
			error: 'Not Found',
			statusCode: 404
		})
	);

	assert.equal(error.name, 'EverTeamsNotFoundError');
	assert.equal(error.message, 'Cannot GET /api/no-such-route');
	assert.match(error.nextStep, /apiUrl/);
});

test("a 400 is a validation error with the API's messages, which name the fields", async () => {
	const error = await errorOf(
		answer(400, 'Bad Request', {
			message: ['projectId must be a UUID', 'taskId must be a UUID'],
			error: 'Bad Request',
			statusCode: 400
		})
	);

	assert.equal(error.name, 'EverTeamsValidationError');
	assert.deepEqual(error.messages, ['projectId must be a UUID', 'taskId must be a UUID']);
	assert.equal(error.message, 'projectId must be a UUID; taskId must be a UUID');
	assert.match(error.nextStep, /error\.messages/);
});

test('a 409 is a conflict, which is also a validation error', async () => {
	const error = await errorOf(
		answer(409, 'Conflict', {
			message:
				'This stop names a time log that is not the running one. Nothing was stopped: the running timer goes on.',
			error: 'Conflict',
			statusCode: 409
		})
	);

	assert.equal(error.name, 'EverTeamsConflictError');
	assert.equal(error.status, 409);
	assert.equal(error.messages.length, 1);
	assert.match(error.nextStep, /read it again/);
});

test('a 429 reads the wait from Retry-After, in seconds or as a date', async () => {
	const body = { statusCode: 429, message: 'ThrottlerException: Too Many Requests' };
	const seconds = await errorOf(answer(429, 'Too Many Requests', body, { ...json, 'Retry-After': '42' }));
	const named = await errorOf(answer(429, 'Too Many Requests', body, { ...json, 'Retry-After-login': '7' }));
	const inTwoMinutes = new Date(Date.now() + 120_000).toUTCString();
	const date = await errorOf(answer(429, 'Too Many Requests', body, { ...json, 'Retry-After': inTwoMinutes }));
	const none = await errorOf(answer(429, 'Too Many Requests', body));

	assert.equal(seconds.name, 'EverTeamsRateLimitError');
	assert.equal(seconds.retryAfter, 42);
	assert.match(seconds.nextStep, /wait 42 seconds/);
	assert.equal(named.retryAfter, 7);
	assert.ok(date.retryAfter >= 118 && date.retryAfter <= 120, String(date.retryAfter));
	assert.equal(none.retryAfter, undefined);
	assert.match(none.nextStep, /wait a minute/);
});

test("a 5xx is a server error, also a gateway's HTML page", async () => {
	const api = await errorOf(
		answer(500, 'Internal Server Error', { statusCode: 500, message: 'Internal server error' })
	);
	const gateway = await errorOf(
		answer(503, 'Service Unavailable', '<html><body>503 Service Temporarily Unavailable</body></html>', {
			'Content-Type': 'text/html'
		})
	);

	assert.equal(api.name, 'EverTeamsServerError');
	assert.equal(api.message, 'Internal server error');
	assert.equal(gateway.name, 'EverTeamsServerError');
	assert.equal(gateway.status, 503);
	assert.equal(gateway.message, 'Service Unavailable');
	assert.equal(gateway.body, null);
	assert.match(gateway.nextStep, /try again/);
});

test('another refusal is an EverTeamsError with its status', async () => {
	const error = await errorOf(
		answer(406, 'Not Acceptable', {
			message: "No running log found. Can't stop timer because it was already stopped.",
			error: 'Not Acceptable',
			statusCode: 406
		})
	);

	assert.equal(error.name, 'EverTeamsError');
	assert.equal(error.status, 406);
	assert.match(error.message, /No running log found/);
});

test('a next step a call gives replaces the general one for its status', async () => {
	const error = await errorOf(answer(401, 'Unauthorized', { message: 'Unauthorized', statusCode: 401 }), {
		401: 'Create a new personal API token.'
	});

	assert.equal(error.nextStep, 'Create a new personal API token.');
});

test('every typed error is an EverTeamsError and an Error, and a conflict is a validation error', async () => {
	const forbidden = await errorOf(answer(403, 'Forbidden', { message: 'Forbidden resource', statusCode: 403 }));
	const conflict = await errorOf(answer(409, 'Conflict', { message: 'Conflict', statusCode: 409 }));

	assert.ok(forbidden instanceof Error);
	assert.ok(forbidden instanceof mapping.EverTeamsError);
	assert.ok(forbidden instanceof mapping.EverTeamsForbiddenError);
	assert.ok(conflict instanceof mapping.EverTeamsValidationError);
	assert.ok(conflict instanceof mapping.EverTeamsConflictError);
});

test('a request with no answer is a network error that names the address and CORS', () => {
	const error = mapping.networkError('http://localhost:3000/api', new TypeError('fetch failed'));

	assert.equal(error.name, 'EverTeamsNetworkError');
	assert.equal(error.status, 0);
	assert.equal(error.message, 'No answer from http://localhost:3000/api: fetch failed');
	assert.match(error.nextStep, /http:\/\/localhost:3000\/api/);
	assert.match(error.nextStep, /CORS/);
	assert.ok(error.cause instanceof TypeError);
});
