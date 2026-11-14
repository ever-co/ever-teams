import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { installFakeChrome, installFakeFetch } from '../test/fake-chrome.ts';
import { revokeSession } from './api-client.ts';
import { clearSession } from './session-store.ts';
import type { Session } from './workspaces.ts';

const SESSION: Session = {
	apiUrl: 'https://api.example.test',
	token: 'access-1',
	refreshToken: 'refresh-1',
	userId: 'user-1',
	email: 'marie@example.test',
	name: 'Marie Curie',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	employeeId: 'employee-1',
	teams: [{ id: 'team-1', name: 'Designers' }],
	teamId: 'team-1'
};

describe('signing out', () => {
	let browser: ReturnType<typeof installFakeChrome>;

	beforeEach(() => {
		browser = installFakeChrome({
			session: SESSION,
			selectedTaskId: 'task-1',
			recentTaskIds: ['task-1', 'task-2'],
			settings: { apiUrl: SESSION.apiUrl, appUrl: 'https://app.example.test' }
		});
	});

	it('forgets the session and what was picked or started with it, and keeps the settings', async () => {
		await clearSession();

		assert.deepEqual([...browser.stored.keys()], ['settings']);
	});

	it("has the API revoke the session's refresh token, as the session itself", async () => {
		const calls = installFakeFetch(() => ({ status: 200 }));

		await revokeSession(SESSION);

		assert.equal(calls.length, 1);
		assert.equal(calls[0].url, 'https://api.example.test/api/auth/logout');
		assert.equal(calls[0].init.method, 'POST');
		assert.deepEqual(calls[0].body, { refresh_token: 'refresh-1' });
		const headers = calls[0].init.headers as Record<string, string>;
		assert.equal(headers.authorization, 'Bearer access-1');
		assert.equal(headers['tenant-id'], 'tenant-1');
	});

	it('signs out all the same when the API cannot be reached or refuses', async () => {
		installFakeFetch(() => {
			throw new TypeError('Failed to fetch');
		});
		await assert.doesNotReject(revokeSession(SESSION));

		installFakeFetch(() => ({ status: 401, body: { statusCode: 401, message: 'Unauthorized' } }));
		await assert.doesNotReject(revokeSession(SESSION));
	});
});
