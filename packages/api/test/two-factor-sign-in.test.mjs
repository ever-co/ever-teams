// Completing a sign-in that asked for a two-factor code (ever-co/ever-teams#5701). Runs against the built package:
// `yarn test` in packages/api builds it, then runs node --test test/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authVerifyTwoFactor } from '../dist/index.es.js';

const originalFetch = globalThis.fetch;
const API = { apiUrl: 'https://api.example.com/api' };
const SESSION = { token: 'token-1', refresh_token: 'refresh-1', user: { id: 'user-1', tenantId: 'tenant-1' } };
let sent;
let answer;

beforeEach(() => {
	sent = [];
	answer = { status: 200, body: SESSION };
	globalThis.fetch = async (url, init) => {
		sent.push({ url: String(url), method: init.method, body: JSON.parse(init.body) });
		return new Response(JSON.stringify(answer.body), {
			status: answer.status,
			headers: { 'Content-Type': 'application/json' }
		});
	};
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

test('the challenge and the code go to the verify route of the given API, which answers the session', async () => {
	const session = await authVerifyTwoFactor({ challenge: 'challenge-1', code: '123456' }, API);

	assert.deepEqual(session, SESSION);
	assert.deepEqual(sent, [
		{
			url: 'https://api.example.com/api/auth/two-factor/verify',
			method: 'POST',
			body: { challenge: 'challenge-1', code: '123456' }
		}
	]);
});

test('a recovery code goes as recoveryCode, without a code', async () => {
	await authVerifyTwoFactor({ challenge: 'challenge-1', recoveryCode: 'ABCD-EFGH-IJKL-MNOP' }, API);

	assert.deepEqual(sent[0].body, { challenge: 'challenge-1', recoveryCode: 'ABCD-EFGH-IJKL-MNOP' });
});

test('a refused code comes back with its status and the API message', async () => {
	answer = { status: 401, body: { statusCode: 401, message: 'This code is not right.' } };

	const refused = await authVerifyTwoFactor({ challenge: 'challenge-1', code: '000000' }, API);

	assert.equal(refused.statusCode, 401);
	assert.equal(refused.message, 'This code is not right.');
});

test('a request that gets no answer comes back without a status', async () => {
	globalThis.fetch = async () => {
		throw new TypeError('Failed to fetch');
	};

	const failed = await authVerifyTwoFactor({ challenge: 'challenge-1', code: '123456' }, API);

	assert.equal('statusCode' in failed, false);
	assert.equal(failed.message, 'Failed to fetch');
});
