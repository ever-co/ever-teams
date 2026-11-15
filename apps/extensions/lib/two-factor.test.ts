import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { installFakeFetch } from '../test/fake-chrome.ts';
import { ApiError } from './api-client.ts';
import { enterWorkspace, verifySignInCode } from './gauzy.ts';
import { twoFactorChallengeIn, twoFactorProofOf, twoFactorRefusalOf } from './two-factor.ts';
import type { WorkspaceChoice } from './workspaces.ts';

const API_URL = 'https://api.example.test';

const WORKSPACE: WorkspaceChoice = {
	token: 'workspace-token-1',
	name: 'Labs',
	teams: [{ id: 'team-1', name: 'Research' }]
};

// The 403 Gauzy answers a workspace sign-in instead of a session when the account asks for its two-factor code
const CHALLENGE_ANSWER = {
	statusCode: 403,
	code: 'TWO_FACTOR_REQUIRED',
	message: 'Two-factor authentication is required',
	challenge: 'signed.challenge.value',
	expiresAt: '2026-11-15T12:05:00.000Z'
};

const SESSION_ANSWER = {
	token: 'access-1',
	refresh_token: 'refresh-1',
	user: {
		id: 'user-1',
		email: 'marie@example.test',
		tenantId: 'tenant-1',
		employee: { id: 'employee-1', organizationId: 'organization-1' }
	}
};

describe('a workspace sign-in that asks for the two-factor code', () => {
	it('keeps the challenge it answered, for the code step', async () => {
		installFakeFetch(() => ({ status: 403, body: CHALLENGE_ANSWER }));

		const failure = await enterWorkspace(API_URL, 'marie@example.test', WORKSPACE).catch((error: unknown) => error);

		assert.ok(failure instanceof ApiError);
		assert.deepEqual(failure.twoFactor, {
			challenge: 'signed.challenge.value',
			expiresAt: '2026-11-15T12:05:00.000Z'
		});
	});

	it('sends the challenge with the code, and opens the session the API answers', async () => {
		const calls = installFakeFetch(() => ({ status: 200, body: SESSION_ANSWER }));

		const session = await verifySignInCode(API_URL, 'signed.challenge.value', { code: '123456' }, WORKSPACE);

		assert.equal(calls[0].url, `${API_URL}/api/auth/two-factor/verify`);
		assert.deepEqual(calls[0].body, { challenge: 'signed.challenge.value', code: '123456' });
		assert.equal(session?.token, 'access-1');
		assert.equal(session?.employeeId, 'employee-1');
	});

	it('reads no challenge in any other refusal', () => {
		assert.equal(twoFactorChallengeIn({ code: 'TWO_FACTOR_REQUIRED' }), null);
		assert.equal(twoFactorChallengeIn({ statusCode: 403, message: 'Forbidden' }), null);
		assert.equal(twoFactorChallengeIn(null), null);
	});
});

describe('twoFactorProofOf', () => {
	it('reads six digits as a code of the app, and anything longer as a recovery code', () => {
		assert.deepEqual(twoFactorProofOf(' 123 456 '), { code: '123456' });
		assert.deepEqual(twoFactorProofOf('k7m2-p9q4-x3z8-w5n6'), { recoveryCode: 'K7M2-P9Q4-X3Z8-W5N6' });
		assert.equal(twoFactorProofOf('12345'), null);
	});
});

describe('twoFactorRefusalOf', () => {
	const expiresAt = '2026-11-15T12:05:00.000Z';
	const before = Date.parse('2026-11-15T12:00:00.000Z');
	const after = Date.parse('2026-11-15T12:06:00.000Z');

	it('says a 401 while the challenge lasts is a wrong code, and one after it ended asks to sign in again', () => {
		assert.equal(twoFactorRefusalOf({ status: 401 }, expiresAt, before).key, 'signInTwoFactorWrongCode');
		assert.equal(twoFactorRefusalOf({ status: 401 }, expiresAt, after).key, 'signInTwoFactorExpired');
	});

	it('says too many codes were tried, and an unreachable API as everywhere in the popup', () => {
		assert.equal(twoFactorRefusalOf({ status: 429 }, expiresAt, before).key, 'signInTwoFactorTooMany');
		assert.equal(twoFactorRefusalOf({ status: 0 }, expiresAt, before).key, 'errorOffline');
	});
});
