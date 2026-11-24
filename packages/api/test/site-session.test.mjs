// renewEmbedSiteSession and revokeEmbedSiteSession (src/lib/client/site-session.ts) against the answers of
// POST /api/embed/renew and POST /api/embed/revoke: node --test test/*.test.mjs (from packages/api). esbuild bundles
// the module with the error classes it throws.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspect } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import {
	API_URL,
	RENEWAL_TOKEN,
	TOKENS,
	answer,
	databaseOut,
	embedsOff,
	fromAnotherSite,
	grantEnded,
	memberNotAllowed,
	renewed,
	revoked,
	signInOff,
	siteApi,
	siteNotAllowed,
	throttled
} from './support/site-session-answers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

let site;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-session-'));
	const outfile = path.join(bundleDir, 'site-session.mjs');
	await esbuild.build({
		stdin: {
			contents: "export * from './site-session'; export * from './errors';",
			resolveDir: path.join(here, '..', 'src', 'lib', 'client'),
			loader: 'ts'
		},
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		outfile,
		logLevel: 'error'
	});
	site = await import(pathToFileURL(outfile).href);
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

const optionsFor = (fetch, more = {}) => ({ apiUrl: API_URL, renewalToken: RENEWAL_TOKEN, fetch, ...more });

const refusalOf = async (call, respond, more) => {
	const api = siteApi(respond);
	const error = await call(optionsFor(api.fetch, more)).then(
		() => assert.fail('the call was not refused'),
		(thrown) => thrown
	);
	assert.ok(error instanceof site.EverTeamsError, inspect(error));
	return { error, api };
};

const renewalRefusal = (respond, more) => refusalOf(site.renewEmbedSiteSession, respond, more);

test('a renewal posts the renewal token without an Authorization header, and answers the new pair', async () => {
	const api = siteApi(() => renewed());

	const answered = await site.renewEmbedSiteSession(optionsFor(api.fetch));

	assert.deepEqual(answered, TOKENS);
	assert.equal(api.requests.length, 1);
	const [request] = api.requests;
	assert.equal(request.url, `${API_URL}/embed/renew`);
	assert.equal(request.method, 'POST');
	assert.equal(request.headers.get('Authorization'), null);
	assert.equal(request.headers.get('Content-Type'), 'application/json');
	assert.equal(request.credentials, undefined);
	assert.deepEqual(request.body, { renewalToken: RENEWAL_TOKEN });
});

test('the address may end with slashes, and the answer keeps only the four fields', async () => {
	const api = siteApi(() => answer(200, 'OK', { ...TOKENS, extra: 'ignored' }));

	const answered = await site.renewEmbedSiteSession(optionsFor(api.fetch, { apiUrl: `${API_URL}//` }));

	assert.deepEqual(answered, TOKENS);
	assert.equal(api.requests[0].url, `${API_URL}/embed/renew`);
});

test('a used, revoked or expired renewal token is an auth error that says to sign in again', async () => {
	const { error } = await renewalRefusal(() => grantEnded());

	assert.ok(error instanceof site.EverTeamsAuthError);
	assert.equal(error.status, 401);
	assert.equal(error.code, 'EMBED_GRANT_ENDED');
	assert.match(error.nextStep, /sign in with Ever Teams again/);
});

test('a renewal from another site is refused with a step that names the site the person allowed', async () => {
	const { error } = await renewalRefusal(() => fromAnotherSite());

	assert.ok(error instanceof site.EverTeamsForbiddenError);
	assert.equal(error.code, 'EMBED_ORIGIN');
	assert.match(error.nextStep, /only from the site the person allowed/);
});

test('a site no longer allowed, with sign-in off, or a member who may not track keeps the renewal token', async () => {
	const cases = [
		[siteNotAllowed, 'EMBED_ORIGIN_NOT_ALLOWED', /add it in Settings > Embeds/],
		[signInOff, 'EMBED_SITE_SIGN_IN_OFF', /People can sign in from this site/],
		[memberNotAllowed, 'EMBED_MEMBER_NOT_ALLOWED', /no longer track time/]
	];
	for (const [respond, code, step] of cases) {
		const { error } = await renewalRefusal(respond);

		assert.ok(error instanceof site.EverTeamsForbiddenError, code);
		assert.equal(error.status, 403);
		assert.equal(error.code, code);
		assert.match(error.nextStep, step);
		assert.match(error.nextStep, /Keep the renewal token/);
	}
});

test('an API without site sign-in, a rate limit and a database outage are their typed errors', async () => {
	const off = await renewalRefusal(() => embedsOff());
	assert.ok(off.error instanceof site.EverTeamsNotFoundError);
	assert.match(off.error.nextStep, /GAUZY_EMBED_TOKENS_ENABLED/);

	const limited = await renewalRefusal(() => throttled());
	assert.ok(limited.error instanceof site.EverTeamsRateLimitError);
	assert.equal(limited.error.retryAfter, 30);

	const down = await renewalRefusal(() => databaseOut());
	assert.ok(down.error instanceof site.EverTeamsServerError);
	assert.equal(down.error.status, 503);
});

test('a success without the tokens, such as the web app answering, is an unexpected answer', async () => {
	const { error } = await renewalRefusal(() => answer(200, 'OK', { token: TOKENS.token }));

	assert.equal(error.code, 'UNEXPECTED_ANSWER');
	assert.equal(error.status, 200);
	assert.match(error.nextStep, /not the web app's/);
});

test('no answer is a network error that names the address', async () => {
	const { error } = await refusalOf(site.renewEmbedSiteSession, () => {
		throw new TypeError('Failed to fetch');
	});

	assert.ok(error instanceof site.EverTeamsNetworkError);
	assert.equal(error.status, 0);
	assert.match(error.message, /api\.example\.com/);
});

test('a missing address or renewal token is refused before any request, without quoting a value', async () => {
	for (const more of [{ apiUrl: '' }, { apiUrl: 'ftp://api.example.com' }, { renewalToken: '  ' }]) {
		const { error, api } = await renewalRefusal(() => renewed(), more);

		assert.equal(error.code, 'CLIENT_OPTIONS');
		assert.equal(api.requests.length, 0);
	}
	const { error } = await renewalRefusal(() => renewed(), { apiUrl: RENEWAL_TOKEN });
	assert.equal(`${error.message} ${error.nextStep}`.includes(RENEWAL_TOKEN), false);
});

test('a revocation posts the renewal token without an Authorization header and answers nothing', async () => {
	const api = siteApi(() => revoked());

	const answered = await site.revokeEmbedSiteSession(optionsFor(api.fetch));

	assert.equal(answered, undefined);
	const [request] = api.requests;
	assert.equal(request.url, `${API_URL}/embed/revoke`);
	assert.equal(request.method, 'POST');
	assert.equal(request.headers.get('Authorization'), null);
	assert.deepEqual(request.body, { renewalToken: RENEWAL_TOKEN });
});

test('a revocation refused by the rate limit or an API without the route throws its typed error', async () => {
	const limited = await refusalOf(site.revokeEmbedSiteSession, () => throttled());
	assert.ok(limited.error instanceof site.EverTeamsRateLimitError);

	const off = await refusalOf(site.revokeEmbedSiteSession, () => embedsOff());
	assert.ok(off.error instanceof site.EverTeamsNotFoundError);
});
