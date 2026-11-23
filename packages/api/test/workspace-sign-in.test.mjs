// Signing in to one of the workspaces an email and password open (ever-co/ever-teams#5700). Runs against the built
// package: `yarn test` in packages/api builds it, then runs node --test test/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authSignInWorkspace } from '../dist/index.es.js';

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

test("the email and the workspace's token go to the workspace sign-in of the given API, which answers the session", async () => {
	const session = await authSignInWorkspace({ email: 'mira@example.com', token: 'workspace-token' }, API);

	assert.deepEqual(session, SESSION);
	assert.deepEqual(sent, [
		{
			url: 'https://api.example.com/api/auth/signin.workspace',
			method: 'POST',
			body: { email: 'mira@example.com', token: 'workspace-token' }
		}
	]);
});

test('a workspace that asks for a two-factor code comes back with its code and challenge', async () => {
	answer = {
		status: 403,
		body: { statusCode: 403, code: 'TWO_FACTOR_REQUIRED', message: 'Enter the code', challenge: 'challenge-1' }
	};

	const refused = await authSignInWorkspace({ email: 'ayla@example.com', token: 'workspace-token' }, API);

	assert.equal(refused.statusCode, 403);
	assert.equal(refused.code, 'TWO_FACTOR_REQUIRED');
	assert.equal(refused.challenge, 'challenge-1');
});
