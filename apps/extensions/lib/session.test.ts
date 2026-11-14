import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { installFakeChrome, installFakeFetch } from '../test/fake-chrome.ts';
import { revokeSession, sessionRequest } from './api-client.ts';
import { clearSession, loadSession, selectStoredTeam, takeSessionOut } from './session-store.ts';
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

/** A stand-in API whose access token `access-1` expired: a refresh token renews once, then is rotated away. */
function installRotatingApi(options: { renewalAnswered?: Promise<void> } = {}) {
	let validRefresh = 'refresh-1';
	let validAccess = 'access-0';
	let renewals = 0;
	const calls = installFakeFetch(async (url, init) => {
		const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
		if (url.endsWith('/api/auth/refresh-token')) {
			renewals += 1;
			await options.renewalAnswered;
			if (body.refresh_token !== validRefresh) {
				return { status: 401, body: { statusCode: 401, message: 'Token is rotated' } };
			}
			validRefresh = `refresh-${renewals + 1}`;
			validAccess = `access-${renewals + 1}`;
			return { status: 201, body: { token: validAccess, refresh_token: validRefresh } };
		}
		const headers = init.headers as Record<string, string>;
		if (headers.authorization !== `Bearer ${validAccess}`) {
			return { status: 401, body: { statusCode: 401, message: 'Unauthorized' } };
		}
		return { status: 200, body: { running: false } };
	});
	return { calls, renewals: () => renewals };
}

describe('renewing the session, one view at a time', () => {
	beforeEach(() => {
		installFakeChrome({ session: SESSION });
	});

	it('renews once for requests refused together, and sends each again with the new token', async () => {
		const api = installRotatingApi();

		const answers = await Promise.all([
			sessionRequest(SESSION, '/timesheet/timer/status'),
			sessionRequest(SESSION, '/timesheet/timer/status')
		]);

		assert.deepEqual(answers, [{ running: false }, { running: false }]);
		assert.equal(api.renewals(), 1);
		assert.equal((await loadSession())?.token, 'access-2');
		assert.equal((await loadSession())?.refreshToken, 'refresh-2');
	});

	it('lets a sign-out wait for a renewal under way, and the renewal never undoes it', async () => {
		let answerRenewal = () => undefined as void;
		const renewalAnswered = new Promise<void>((resolve) => {
			answerRenewal = resolve;
		});
		installRotatingApi({ renewalAnswered });

		const request = sessionRequest(SESSION, '/timesheet/timer/status').catch((error: unknown) => error);
		await new Promise((resolve) => setTimeout(resolve, 20));
		const signOut = takeSessionOut();
		answerRenewal();
		await Promise.all([request, signOut]);

		assert.equal(await loadSession(), null);
	});
});

describe('picking another team', () => {
	it('patches the stored session, which holds the newest tokens, not the copy the popup shows', async () => {
		const browser = installFakeChrome({
			session: { ...SESSION, token: 'access-2', refreshToken: 'refresh-2' },
			selectedTaskId: 'task-1'
		});

		const next = await selectStoredTeam(SESSION, 'team-2');

		assert.equal(next?.teamId, 'team-2');
		assert.equal(next?.token, 'access-2');
		assert.deepEqual(browser.stored.get('session'), next);
		assert.equal(browser.stored.get('selectedTaskId'), null);
	});

	it('changes nothing once the person signed out', async () => {
		const browser = installFakeChrome({});

		assert.equal(await selectStoredTeam(SESSION, 'team-2'), null);
		assert.equal(browser.stored.size, 0);
	});
});
