/**
 * @jest-environment node
 */
const mockAuthenticatedGuard = jest.fn();
const mockVerify = jest.fn();
const mockConfirm = jest.fn();
const mockReset = jest.fn();
const mockMyPermissions = jest.fn();
const mockRespondWithSession = jest.fn();

jest.mock('./guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('./requests/two-factor', () => ({
	twoFactorStatusRequest: jest.fn(),
	enrollTwoFactorRequest: jest.fn(),
	confirmTwoFactorRequest: (...args: unknown[]) => mockConfirm(...args),
	disableTwoFactorRequest: jest.fn(),
	regenerateRecoveryCodesRequest: jest.fn(),
	resetMemberTwoFactorRequest: (...args: unknown[]) => mockReset(...args),
	verifyTwoFactorRequest: (...args: unknown[]) => mockVerify(...args)
}));
jest.mock('./requests/role-permissions', () => ({
	getMyRolePermissionsRequest: (...args: unknown[]) => mockMyPermissions(...args)
}));
jest.mock('./workspace-session', () => ({
	respondWithWorkspaceSession: (...args: unknown[]) => mockRespondWithSession(...args)
}));

import { NextResponse } from 'next/server';
import { proxyResetMemberTwoFactor, proxyTwoFactorVerify, proxyTwoFactorWrite } from './two-factor-proxy';

const SIGNED_IN = {
	$res: (data: unknown) => NextResponse.json(data),
	user: { id: 'admin-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

function postJson(path: string, body: unknown) {
	return new Request(`https://app.ever.team${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/** A Gauzy refusal, as serverFetch rejects it: a rejected promise holding the API's body. */
function gauzyRefusal(body: Record<string, unknown>) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

describe('two-factor proxy routes', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	});

	it('completes a sign-in with the session cookies once Gauzy accepts the code', async () => {
		const loginResponse = {
			user: { id: 'user-1', tenantId: 'tenant-1' },
			token: 'access',
			refresh_token: 'refresh'
		};
		mockVerify.mockResolvedValue({ data: loginResponse });
		mockRespondWithSession.mockResolvedValue(NextResponse.json({ loginResponse }));

		const res = await proxyTwoFactorVerify(
			postJson('/api/auth/two-factor/verify', { challenge: 'signed.challenge', code: '123456', teamId: 'team-1' })
		);

		expect(res.status).toBe(200);
		expect(mockVerify).toHaveBeenCalledWith({ challenge: 'signed.challenge', code: '123456' });
		expect(mockRespondWithSession).toHaveBeenCalledWith(
			expect.objectContaining({ loginResponse, teamId: 'team-1', body: { loginResponse } })
		);
	});

	it("passes Gauzy's refusal of a wrong code through, with its status", async () => {
		mockVerify.mockImplementation(async () => {
			throw gauzyRefusal({ statusCode: 401, message: 'The code is not right.', error: 'Unauthorized' });
		});

		const res = await proxyTwoFactorVerify(
			postJson('/api/auth/two-factor/verify', { challenge: 'signed.challenge', code: '000000' })
		);

		expect(res.status).toBe(401);
		expect((await res.json()).message).toBe('The code is not right.');
		expect(mockRespondWithSession).not.toHaveBeenCalled();
	});

	it('refuses a body without a challenge, before Gauzy', async () => {
		const res = await proxyTwoFactorVerify(postJson('/api/auth/two-factor/verify', { code: '123456' }));

		expect(res.status).toBe(400);
		expect(mockVerify).not.toHaveBeenCalled();
	});

	it('answers the recovery codes uncached', async () => {
		mockConfirm.mockResolvedValue({
			data: { enabledAt: '2026-11-14T12:00:00.000Z', recoveryCodes: ['AAAAA-BBBBB'] }
		});

		const res = await proxyTwoFactorWrite(postJson('/api/auth/two-factor/confirm', { code: '123456' }), 'confirm');

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(mockConfirm).toHaveBeenCalledWith({
			bearer_token: 'session-token',
			tenantId: 'tenant-1',
			code: '123456'
		});
	});

	it("refuses a member's reset to a caller without ORG_USERS_EDIT, before Gauzy", async () => {
		mockMyPermissions.mockResolvedValue({ data: [{ permission: 'ORG_TEAM_EDIT', enabled: true }] });

		const res = await proxyResetMemberTwoFactor(
			new Request('https://app.ever.team/api/auth/two-factor/users/3db49a7e-69d2-471a-9495-3b69ece6fc54', {
				method: 'DELETE'
			}),
			'3db49a7e-69d2-471a-9495-3b69ece6fc54'
		);

		expect(res.status).toBe(403);
		expect(mockReset).not.toHaveBeenCalled();
	});

	it("resets a member's second factor for a caller with ORG_USERS_EDIT", async () => {
		mockMyPermissions.mockResolvedValue({ data: [{ permission: 'ORG_USERS_EDIT', enabled: true }] });
		mockReset.mockResolvedValue({ data: { reset: true } });

		const res = await proxyResetMemberTwoFactor(
			new Request('https://app.ever.team/api/auth/two-factor/users/3db49a7e-69d2-471a-9495-3b69ece6fc54', {
				method: 'DELETE'
			}),
			'3db49a7e-69d2-471a-9495-3b69ece6fc54'
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ reset: true });
	});
});
