/**
 * @jest-environment jsdom
 *
 * The social workspace sign-in leaves the page with a full page load, which cancels any request still running: the
 * NextAuth session update (for Ever ID, the one that drops the workspace tokens from the session) must finish first.
 */
import { act, renderHook } from '@testing-library/react';
import { useAuthenticationSocialLogin } from './use-authentication-social-login';
import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';

const mockNavigateAfterSignIn = jest.fn();
const mockUpdateSession = jest.fn();
const mockSetAuthCookies = jest.fn();
const mockSignInWorkspace = jest.fn();

jest.mock('@/core/lib/auth/navigate-after-sign-in', () => ({
	navigateAfterSignIn: () => mockNavigateAfterSignIn()
}));
jest.mock('next-auth/react', () => ({
	useSession: () => ({ update: (...a: unknown[]) => mockUpdateSession(...a) })
}));
jest.mock('@/core/lib/helpers/index', () => ({
	setAuthCookies: (...a: unknown[]) => mockSetAuthCookies(...a)
}));
jest.mock('@/core/services/client/api/auth/signin.service', () => ({
	signinService: { signInWorkspace: (...a: unknown[]) => mockSignInWorkspace(...a) }
}));
jest.mock('@/core/services/client/api/users/user-organization.service', () => ({
	userOrganizationService: {
		getUserOrganizations: () => Promise.resolve({ data: { items: [{ organizationId: 'organization-1' }] } })
	}
}));
jest.mock('@/core/lib/auth/jwt-utils', () => ({
	pickTokenOrganization: () => ({ organizationId: 'organization-1' })
}));

const SIGNIN_RESULT = {
	access_token: 'provider-token',
	confirmed_mail: 'person@example.test',
	organizationId: '',
	refresh_token: { token: '', decoded: null },
	tenantId: '',
	userId: ''
};
const WORKSPACES = [{ token: 'workspace-token' }] as unknown as ISigninEmailConfirmWorkspaces[];

const flush = () =>
	act(async () => {
		await new Promise((r) => setTimeout(r, 0));
	});

describe('useAuthenticationSocialLogin → updateOAuthSession', () => {
	beforeEach(() => {
		mockSignInWorkspace.mockResolvedValue({
			token: 'access-token',
			refresh_token: 'refresh-token',
			user: { id: 'user-1', tenantId: 'tenant-1' }
		});
	});

	it('opens the app only once the NextAuth session update has finished', async () => {
		let finishUpdate: (value: unknown) => void = () => undefined;
		mockUpdateSession.mockReturnValue(new Promise((resolve) => (finishUpdate = resolve)));
		const { result } = renderHook(() => useAuthenticationSocialLogin());

		act(() => result.current.updateOAuthSession(SIGNIN_RESULT, WORKSPACES, 0, 'team-1'));
		await flush();

		expect(mockUpdateSession).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'access-token' }));
		expect(mockNavigateAfterSignIn).not.toHaveBeenCalled();

		finishUpdate(null);
		await flush();

		expect(mockSetAuthCookies).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'access-token' }));
		expect(mockNavigateAfterSignIn).toHaveBeenCalledTimes(1);
	});

	it('still opens the app when the session update fails, since the Gauzy cookies are the session', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		mockUpdateSession.mockRejectedValue(new Error('session endpoint down'));
		const onError = jest.fn();
		const { result } = renderHook(() => useAuthenticationSocialLogin());

		act(() => result.current.updateOAuthSession(SIGNIN_RESULT, WORKSPACES, 0, 'team-1', undefined, onError));
		await flush();

		expect(mockSetAuthCookies).toHaveBeenCalledTimes(1);
		expect(mockNavigateAfterSignIn).toHaveBeenCalledTimes(1);
		expect(onError).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});
