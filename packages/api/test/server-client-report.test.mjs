// getClientReport (src/lib/server/client-report.ts) against the answers of POST /api/embed/client-report:
// node --test test/*.test.mjs (from packages/api). esbuild bundles the module with the error classes it throws.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import {
	API_URL,
	CREDENTIAL,
	REPORT,
	addressLimited,
	answer,
	clientGone,
	clientRequired,
	credentialRefused,
	databaseOut,
	embedApi,
	embedsOff,
	reportRead,
	reportUnread,
	throttled
} from './support/embed-answers.mjs';
import { bundleServerHelper } from './support/bundle-server.mjs';

let server;
let removeBundle;

before(async () => {
	({ server, remove: removeBundle } = await bundleServerHelper('client-report'));
});

after(() => {
	removeBundle?.();
});

const optionsFor = (fetch, more = {}) => ({ apiUrl: API_URL, credential: CREDENTIAL, fetch, ...more });

const shownBy = (error) => `${inspect(error, { depth: 10 })} ${JSON.stringify(error.body)} ${error.nextStep}`;

const refusalOf = async (respond, more) => {
	const api = embedApi(respond);
	const error = await server.getClientReport(optionsFor(api.fetch, more)).then(
		() => assert.fail('the report was not refused'),
		(thrown) => thrown
	);
	assert.ok(error instanceof server.EverTeamsError, inspect(error));
	assert.equal(shownBy(error).includes(CREDENTIAL), false, shownBy(error));
	return error;
};

test('the report posts the credential alone and answers the report as the API wrote it', async () => {
	const api = embedApi(() => reportRead());

	const report = await server.getClientReport(optionsFor(api.fetch));

	assert.deepEqual(report, REPORT);
	assert.equal(api.requests.length, 1);
	assert.equal(api.requests[0].url, `${API_URL}/embed/client-report`);
	assert.equal(api.requests[0].method, 'POST');
	assert.equal(api.requests[0].headers.get('Content-Type'), 'application/json');
	assert.deepEqual(api.requests[0].body, { credential: CREDENTIAL });
});

test('a week with no time is a report too', async () => {
	const empty = {
		...REPORT,
		today: { ...REPORT.today, seconds: 0 },
		week: { ...REPORT.week, seconds: 0 },
		projects: []
	};
	const api = embedApi(() => answer(200, 'OK', empty));

	assert.deepEqual(await server.getClientReport(optionsFor(api.fetch)), empty);
});

test('a refused credential is an auth error', async () => {
	const error = await refusalOf(credentialRefused);

	assert.equal(error.name, 'EverTeamsAuthError');
	assert.match(error.nextStep, /check the credential/);
});

test('a credential without a client is forbidden with EMBED_CLIENT_REQUIRED', async () => {
	const error = await refusalOf(clientRequired);

	assert.equal(error.name, 'EverTeamsForbiddenError');
	assert.equal(error.code, 'EMBED_CLIENT_REQUIRED');
	assert.match(error.message, /not limited to a client/);
	assert.match(error.nextStep, /credential of the client/);
});

test('a credential whose client was deleted is forbidden with EMBED_CLIENT_GONE', async () => {
	const error = await refusalOf(clientGone);

	assert.equal(error.code, 'EMBED_CLIENT_GONE');
	assert.match(error.nextStep, /restore the client/);
});

test('the limits answer rate-limit errors, with the wait when the API gives one', async () => {
	const limited = await refusalOf(addressLimited);
	const throttledError = await refusalOf(throttled);

	assert.equal(limited.name, 'EverTeamsRateLimitError');
	assert.equal(limited.code, 'EMBED_EXCHANGE_LIMITED');
	assert.match(limited.nextStep, /refused credentials/);
	assert.equal(throttledError.retryAfter, 42);
});

test('an API with embeds off answers 404', async () => {
	const error = await refusalOf(embedsOff);

	assert.equal(error.name, 'EverTeamsNotFoundError');
	assert.match(error.nextStep, /GAUZY_EMBED_TOKENS_ENABLED=true/);
});

test('a report that could not be read, or a database out of reach, is a server error', async () => {
	const unread = await refusalOf(reportUnread);
	const database = await refusalOf(databaseOut);

	assert.equal(unread.name, 'EverTeamsServerError');
	assert.equal(unread.status, 500);
	assert.match(unread.nextStep, /try again/);
	assert.equal(database.name, 'EverTeamsServerError');
	assert.equal(database.status, 503);
});

test('a success that is not a report is an unexpected answer', async () => {
	const error = await refusalOf(() => answer(200, 'OK', { token: 'not-a-report' }));

	assert.equal(error.code, 'UNEXPECTED_ANSWER');
	assert.equal(error.message, `The answer of ${API_URL}/embed/client-report is not a client report.`);
});

test('a report that lacks a field the widget reads, or has one of another type, is an unexpected answer', async () => {
	const incomplete = [
		{ client: {}, today: {}, week: {}, projects: [] },
		{ ...REPORT, timeZone: undefined },
		{ ...REPORT, client: { id: REPORT.client.id } },
		{ ...REPORT, today: { ...REPORT.today, seconds: '5400' } },
		{ ...REPORT, week: { ...REPORT.week, end: null } },
		{ ...REPORT, projects: [{ ...REPORT.projects[0], seconds: Number.NaN }] },
		{ ...REPORT, projects: [null] }
	];
	// A report under a "__proto__" key stays a key once read, never the prototype that would lend its fields.
	const wrapped = await refusalOf(() => new Response(`{"__proto__":${JSON.stringify(REPORT)}}`, { status: 200 }));
	assert.equal(wrapped.code, 'UNEXPECTED_ANSWER');
	for (const report of incomplete) {
		const error = await refusalOf(() => answer(200, 'OK', report));

		assert.equal(error.code, 'UNEXPECTED_ANSWER', JSON.stringify(report));
	}
});

test('missing options are refused before any request, without the credential', async () => {
	const cases = [
		[{ apiUrl: '' }, /needs apiUrl\./],
		[{ apiUrl: CREDENTIAL }, /http or https address/],
		[{ credential: undefined }, /needs credential/]
	];
	for (const [options, message] of cases) {
		const api = embedApi(() => reportRead());
		const error = await server.getClientReport(optionsFor(api.fetch, options)).then(
			() => assert.fail(`not refused: ${inspect(options)}`),
			(thrown) => thrown
		);

		assert.equal(error.code, 'CLIENT_OPTIONS');
		assert.match(error.message, /^getClientReport /);
		assert.match(error.message, message);
		assert.equal(shownBy(error).includes(CREDENTIAL), false);
		assert.equal(api.requests.length, 0);
	}
});
