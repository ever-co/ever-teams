/**
 * @jest-environment jsdom
 *
 * The workspace step of the password sign-in opens the app with a full page load: a client-side `router.push('/')`
 * replayed the redirect Next.js had prefetched for `/` while the visitor was signed out, so "Continue" kept spinning
 * on /auth/password although the session cookies were set (only a manual reload showed the app).
 */
import { act, renderHook } from '@testing-library/react';
import { useAuthenticationPassword } from './use-authentication-password';

const mockNavigateAfterSignIn = jest.fn();
const mockSignInWorkspace = jest.fn();

jest.mock('@/core/lib/auth/navigate-after-sign-in', () => ({
	navigateAfterSignIn: () => mockNavigateAfterSignIn()
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: {
		signInEmailPassword: jest.fn(),
		signInWorkspace: (...a: unknown[]) => mockSignInWorkspace(...a)
	}
}));

async function continueWithWorkspace(
	result: { current: ReturnType<typeof useAuthenticationPassword> },
	onError?: (error: unknown) => void
) {
	await act(async () => {
		result.current.handleWorkspaceSubmit({ preventDefault() {} }, 'workspace-token', 'team-1', onError);
		await new Promise((r) => setTimeout(r, 0));
	});
}

describe('useAuthenticationPassword → handleWorkspaceSubmit', () => {
	it('opens the app with a full page load once the workspace sign-in has set the session', async () => {
		mockSignInWorkspace.mockResolvedValue({ data: {} });
		const onError = jest.fn();
		const { result } = renderHook(() => useAuthenticationPassword());
		act(() => result.current.setFormValues({ email: 'person@example.test', password: 'secret-password' }));

		await continueWithWorkspace(result, onError);

		expect(mockSignInWorkspace).toHaveBeenCalledWith(
			expect.objectContaining({ email: 'person@example.test', token: 'workspace-token', selectedTeam: 'team-1' })
		);
		expect(onError).not.toHaveBeenCalled();
		expect(result.current.authenticated).toBe(true);
		expect(mockNavigateAfterSignIn).toHaveBeenCalledTimes(1);
	});

	it('stays on the chooser and reports a refused workspace sign-in', async () => {
		const refusal = { isAxiosError: true, response: { status: 401, data: {} } };
		mockSignInWorkspace.mockRejectedValue(refusal);
		const onError = jest.fn();
		const { result } = renderHook(() => useAuthenticationPassword());
		act(() => result.current.setFormValues({ email: 'person@example.test', password: 'secret-password' }));

		await continueWithWorkspace(result, onError);

		expect(onError).toHaveBeenCalledWith(refusal);
		expect(mockNavigateAfterSignIn).not.toHaveBeenCalled();
	});
});
