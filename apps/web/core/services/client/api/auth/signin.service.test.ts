/**
 * The code step of a sign-in that asked for a second factor, in direct mode: Gauzy trades the challenge and its code
 * for the session, which starts as a workspace sign-in does (the organization the token names, its cookies).
 */
const mockSetAuthCookies = jest.fn();
const mockGetUserOrganizations = jest.fn();

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
	setNoTeamPopupShowCookie: jest.fn()
}));
jest.mock('../users/user-organization.service', () => ({
	userOrganizationService: { getUserOrganizations: (...args: unknown[]) => mockGetUserOrganizations(...args) }
}));
jest.mock('@/core/lib/auth/jwt-utils', () => ({
	pickTokenOrganization: (items: Array<{ organizationId: string }> | undefined) => items?.[0]
}));

import { signinService } from './signin.service';

const LOGIN_RESPONSE = {
	user: { id: 'user-1', tenantId: 'tenant-1' },
	token: 'access-token',
	refresh_token: 'refresh-token'
};

describe('signinService.verifyTwoFactorGauzy', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('sends the challenge and its code, expecting a 401 for a wrong code, then starts the session', async () => {
		const post = jest.spyOn(signinService, 'post').mockResolvedValue({ data: LOGIN_RESPONSE } as never);
		mockGetUserOrganizations.mockResolvedValue({ data: { items: [{ organizationId: 'organization-1' }] } });

		const response = await signinService.verifyTwoFactorGauzy({
			challenge: 'signed.challenge',
			code: '123456',
			teamId: 'team-1'
		});

		expect(post).toHaveBeenCalledWith(
			'/auth/two-factor/verify',
			{ challenge: 'signed.challenge', code: '123456' },
			{ expectedUnauthorized: true, secretResponse: true },
			false
		);
		expect(mockSetAuthCookies).toHaveBeenCalledWith(
			expect.objectContaining({
				access_token: 'access-token',
				refresh_token: { token: 'refresh-token' },
				teamId: 'team-1',
				tenantId: 'tenant-1',
				organizationId: 'organization-1',
				userId: 'user-1'
			})
		);
		expect(response.data).toEqual({ loginResponse: LOGIN_RESPONSE });
	});

	it('starts no session when Gauzy refuses the code', async () => {
		jest.spyOn(signinService, 'post').mockRejectedValue(new Error('This code is not right.'));

		await expect(
			signinService.verifyTwoFactorGauzy({ challenge: 'signed.challenge', code: '000000', teamId: 'team-1' })
		).rejects.toThrow('This code is not right.');

		expect(mockSetAuthCookies).not.toHaveBeenCalled();
	});

	it('refuses an account with no organization yet, as the workspace sign-in does', async () => {
		jest.spyOn(signinService, 'post').mockResolvedValue({ data: LOGIN_RESPONSE } as never);
		mockGetUserOrganizations.mockResolvedValue({ data: { items: [] } });

		await expect(
			signinService.verifyTwoFactorGauzy({ challenge: 'signed.challenge', code: '123456', teamId: '' })
		).rejects.toEqual({ errors: { email: expect.stringContaining('not yet ready') } });

		expect(mockSetAuthCookies).not.toHaveBeenCalled();
	});
});
