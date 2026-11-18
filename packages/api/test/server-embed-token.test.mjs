// exchangeEmbedToken (src/lib/server/embed-token.ts) against the answers of POST /api/embed/token:
// node --test test/*.test.mjs (from packages/api). esbuild bundles the module with the error classes it throws.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import {
	API_URL,
	CREDENTIAL,
	ORIGIN,
	TOKEN,
	addressLimited,
	answer,
	credentialRefused,
	databaseOut,
	embedApi,
	embedsOff,
	memberNotAllowed,
	originNotAllowed,
	throttled,
	tokenIssued
} from './support/embed-answers.mjs';
import { bundleServerHelper } from './support/bundle-server.mjs';

let server;
let removeBundle;

before(async () => {
	({ server, remove: removeBundle } = await bundleServerHelper('embed-token'));
});

after(() => {
	removeBundle?.();
});

const optionsFor = (fetch, more = {}) => ({
	apiUrl: API_URL,
	credential: CREDENTIAL,
	email: 'lina@example.com',
	origin: ORIGIN,
	fetch,
	...more
});

// Everything an error shows: its message, next step, stack, body and cause.
const shownBy = (error) => `${inspect(error, { depth: 10 })} ${JSON.stringify(error.body)} ${error.nextStep}`;

const assertWithoutCredential = (error) => {
	assert.ok(error instanceof server.EverTeamsError, inspect(error));
	assert.equal(shownBy(error).includes(CREDENTIAL), false, shownBy(error));
};

const refusalOf = async (respond, more) => {
	const api = embedApi(respond);
	const error = await server.exchangeEmbedToken(optionsFor(api.fetch, more)).then(
		() => assert.fail('the exchange was not refused'),
		(thrown) => thrown
	);
	assertWithoutCredential(error);
	return error;
};

test('the exchange posts the credential, the email and the origin, and answers the token', async () => {
	const api = embedApi(() => tokenIssued());

	const answered = await server.exchangeEmbedToken(optionsFor(api.fetch));

	assert.deepEqual(answered, TOKEN);
	assert.equal(api.requests.length, 1);
	const [request] = api.requests;
	assert.equal(request.url, `${API_URL}/embed/token`);
	assert.equal(request.method, 'POST');
	assert.equal(request.headers.get('Content-Type'), 'application/json');
	assert.equal(request.headers.get('Authorization'), null);
	assert.deepEqual(request.body, { credential: CREDENTIAL, email: 'lina@example.com', origin: ORIGIN });
});

test('the person can be named by employeeId, and the address may end with a slash', async () => {
	const api = embedApi(() => tokenIssued());

	await server.exchangeEmbedToken(
		optionsFor(api.fetch, { apiUrl: `${API_URL}/`, email: undefined, employeeId: 'employee-1' })
	);

	assert.equal(api.requests[0].url, `${API_URL}/embed/token`);
	assert.deepEqual(api.requests[0].body, { credential: CREDENTIAL, employeeId: 'employee-1', origin: ORIGIN });
});

test('the first and last names are sent only when they are given', async () => {
	const api = embedApi(() => tokenIssued());

	await server.exchangeEmbedToken(optionsFor(api.fetch, { firstName: 'Lina', lastName: 'Okafor' }));
	await server.exchangeEmbedToken(optionsFor(api.fetch, { firstName: 'Lina', lastName: '' }));
	await server.exchangeEmbedToken(optionsFor(api.fetch));

	assert.equal(api.requests[0].body.firstName, 'Lina');
	assert.equal(api.requests[0].body.lastName, 'Okafor');
	assert.equal(api.requests[1].body.firstName, 'Lina');
	assert.equal('lastName' in api.requests[1].body, false);
	assert.equal('firstName' in api.requests[2].body, false);
	assert.equal('lastName' in api.requests[2].body, false);
});

test('the answer is the token and its expiry only', async () => {
	const api = embedApi(() => answer(200, 'OK', { ...TOKEN, refreshToken: 'not-for-the-page' }));

	const answered = await server.exchangeEmbedToken(optionsFor(api.fetch));

	assert.deepEqual(answered, TOKEN);
});

test('a refused credential is an auth error that says to check it or ask for a new one', async () => {
	const error = await refusalOf(credentialRefused);

	assert.equal(error.name, 'EverTeamsAuthError');
	assert.equal(error.status, 401);
	assert.equal(error.code, undefined);
	assert.match(error.nextStep, /check the credential/);
	assert.match(error.nextStep, /Settings > Embeds/);
});

test('a person the credential cannot act for is forbidden with EMBED_MEMBER_NOT_ALLOWED', async () => {
	const error = await refusalOf(memberNotAllowed);

	assert.equal(error.name, 'EverTeamsForbiddenError');
	assert.equal(error.status, 403);
	assert.equal(error.code, 'EMBED_MEMBER_NOT_ALLOWED');
	assert.equal(error.message, 'This member cannot track time through an embed.');
	assert.match(error.nextStep, /active member/);
	assert.match(error.nextStep, /email or employeeId/);
});

test('a site the organization does not allow is forbidden with EMBED_ORIGIN_NOT_ALLOWED', async () => {
	const error = await refusalOf(originNotAllowed);

	assert.equal(error.name, 'EverTeamsForbiddenError');
	assert.equal(error.code, 'EMBED_ORIGIN_NOT_ALLOWED');
	assert.match(error.nextStep, /origin of the page/);
	assert.match(error.nextStep, /Settings > Embeds/);
});

test('an address with too many refused credentials is limited with EMBED_EXCHANGE_LIMITED', async () => {
	const error = await refusalOf(addressLimited);

	assert.equal(error.name, 'EverTeamsRateLimitError');
	assert.equal(error.status, 429);
	assert.equal(error.code, 'EMBED_EXCHANGE_LIMITED');
	assert.equal(error.retryAfter, undefined);
	assert.match(error.nextStep, /refused credentials/);
});

test("the route's rate limit gives the wait of Retry-After", async () => {
	const error = await refusalOf(throttled);

	assert.equal(error.name, 'EverTeamsRateLimitError');
	assert.equal(error.code, undefined);
	assert.equal(error.retryAfter, 42);
	assert.match(error.nextStep, /wait 42 seconds/);
});

test('an API with embeds off answers 404, which says how to turn them on', async () => {
	const error = await refusalOf(embedsOff);

	assert.equal(error.name, 'EverTeamsNotFoundError');
	assert.match(error.nextStep, /GAUZY_EMBED_TOKENS_ENABLED=true/);
	assert.match(error.nextStep, /apiUrl/);
});

test('an API that cannot reach its database is a server error to try again', async () => {
	const error = await refusalOf(databaseOut);

	assert.equal(error.name, 'EverTeamsServerError');
	assert.equal(error.status, 503);
	assert.equal(error.message, 'The service is temporarily unavailable. Please try again shortly.');
	assert.match(error.nextStep, /try again/);
});

test('a success that is not a token, such as a page of the web app, is an unexpected answer', async () => {
	const page = await refusalOf(
		() =>
			new Response('<!doctype html><title>Ever Teams</title>', {
				status: 200,
				headers: { 'Content-Type': 'text/html' }
			})
	);
	const other = await refusalOf(() => answer(200, 'OK', { expiresAt: TOKEN.expiresAt }));

	assert.equal(page.code, 'UNEXPECTED_ANSWER');
	assert.equal(page.status, 200);
	assert.equal(page.message, `The answer of ${API_URL}/embed/token is not a token.`);
	assert.match(page.nextStep, /apiUrl/);
	assert.equal(other.code, 'UNEXPECTED_ANSWER');
});

test('no answer is a network error', async () => {
	const error = await refusalOf(() => {
		throw new TypeError('fetch failed');
	});

	assert.equal(error.name, 'EverTeamsNetworkError');
	assert.equal(error.status, 0);
	assert.equal(error.message, `No answer from ${API_URL}: fetch failed`);
});

test('an answer or a failure that repeats the credential loses it', async () => {
	const echoed = await refusalOf(() =>
		answer(502, 'Bad Gateway', { message: `Upstream refused ${CREDENTIAL}`, request: { credential: CREDENTIAL } })
	);
	const thrown = await refusalOf(() => {
		throw new Error(`could not send {"credential":"${CREDENTIAL}"}`);
	});

	assert.equal(echoed.name, 'EverTeamsServerError');
	assert.equal(echoed.message, 'Upstream refused [credential]');
	assert.deepEqual(echoed.body.request, { credential: '[credential]' });
	assert.equal(thrown.name, 'EverTeamsNetworkError');
	assert.match(thrown.message, /\[credential\]/);
});

test('a fetch failure keeps its name, message, code and causes, never the request it holds', async () => {
	const error = await refusalOf((request) => {
		const body = JSON.stringify(request.body);
		const refused = Object.assign(new Error(`connect ECONNREFUSED for ${body}`), { code: 'ECONNREFUSED' });
		throw Object.assign(new TypeError('fetch failed', { cause: refused }), { request });
	});

	assert.equal(error.name, 'EverTeamsNetworkError');
	assert.equal(error.message, `No answer from ${API_URL}: fetch failed`);
	assert.equal(error.cause.name, 'TypeError');
	assert.equal(error.cause.request, undefined, 'the request a custom fetch kept is not copied');
	assert.equal(error.cause.cause.code, 'ECONNREFUSED');
	assert.match(error.cause.cause.message, /^connect ECONNREFUSED for .*\[credential\]/);
});

test('a refusal that repeats the credential through JSON escapes loses it once parsed, in values and keys', async () => {
	// Every character as \uXXXX: the raw text never holds the credential, its parsed values do.
	const escaped = [...CREDENTIAL].map((character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
	const credentialInJson = escaped.join('');
	const body = `{"message":"Upstream refused ${credentialInJson}","echo":{"${credentialInJson}":["${credentialInJson}"]}}`;
	const error = await refusalOf(() => new Response(body, { status: 502, statusText: 'Bad Gateway' }));

	assert.equal(error.name, 'EverTeamsServerError');
	assert.equal(error.message, 'Upstream refused [credential]');
	assert.deepEqual(error.body.echo, { '[credential]': ['[credential]'] });
});

test('a refusal with no text in its body loses the credential its status text repeats', async () => {
	const error = await refusalOf(
		() => new Response('{}', { status: 502, statusText: `Upstream refused ${CREDENTIAL}` })
	);

	assert.equal(error.name, 'EverTeamsServerError');
	assert.equal(error.status, 502);
	assert.equal(error.message, 'Upstream refused [credential]');
});

test('missing or malformed options are refused before any request, without the credential', async () => {
	const cases = [
		[{ apiUrl: undefined }, /needs apiUrl\./],
		[{ apiUrl: 'api.example.com/api' }, /http or https address/],
		[{ apiUrl: CREDENTIAL }, /http or https address/],
		[{ credential: undefined }, /needs credential/],
		[{ credential: '  ' }, /needs credential/],
		[{ email: undefined }, /email or employeeId\./],
		[{ email: null, employeeId: '' }, /email or employeeId\./],
		[{ employeeId: 'employee-1' }, /not both/],
		[{ origin: undefined }, /needs origin/],
		[{ origin: 'app.example.com' }, /as a site/],
		[{ origin: 'https://app.example.com/timer' }, /as a site/],
		[{ origin: 'https://*.example.com' }, /as a site/],
		[{ origin: 'https://app.example.com?embed=1' }, /as a site/],
		[{ origin: 'https://user@app.example.com' }, /as a site/],
		[{ origin: 'ftp://app.example.com' }, /as a site/],
		[{ origin: CREDENTIAL }, /as a site/]
	];
	for (const [options, message] of cases) {
		const api = embedApi(() => tokenIssued());
		const error = await server.exchangeEmbedToken(optionsFor(api.fetch, options)).then(
			() => assert.fail(`not refused: ${inspect(options)}`),
			(thrown) => thrown
		);

		assertWithoutCredential(error);
		assert.equal(error.code, 'CLIENT_OPTIONS', inspect(options));
		assert.equal(error.status, 0);
		assert.match(error.message, message, inspect(options));
		assert.ok(error.nextStep.length > 0);
		assert.equal(api.requests.length, 0, inspect(options));
	}
});

test('an origin with a port or a trailing slash, and a credential with a line break around it, are sent', async () => {
	const api = embedApi(() => tokenIssued());

	await server.exchangeEmbedToken(
		optionsFor(api.fetch, { origin: 'http://localhost:4108/', credential: `${CREDENTIAL}\n` })
	);

	assert.equal(api.requests[0].body.origin, 'http://localhost:4108/');
	assert.equal(api.requests[0].body.credential, CREDENTIAL);
});
