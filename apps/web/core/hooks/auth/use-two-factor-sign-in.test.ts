/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';

const mockVerifyTwoFactor = jest.fn();
const mockNavigateAfterSignIn = jest.fn();

jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { verifyTwoFactor: (...args: unknown[]) => mockVerifyTwoFactor(...args) }
}));
jest.mock('@/core/lib/auth/navigate-after-sign-in', () => ({
	navigateAfterSignIn: () => mockNavigateAfterSignIn()
}));

import { useTwoFactorSignIn } from './use-two-factor-sign-in';

const CHALLENGE = { challenge: 'signed.challenge', expiresAt: new Date(Date.now() + 60_000).toISOString() };

describe('useTwoFactorSignIn', () => {
	it('opens the app once the code is accepted, with the team the sign-in chose', async () => {
		mockVerifyTwoFactor.mockResolvedValue({ data: {} });
		const { result } = renderHook(() => useTwoFactorSignIn());

		act(() => result.current.ask(CHALLENGE, 'team-1'));
		let accepted = false;
		await act(async () => {
			accepted = await result.current.verify({ code: '123456' });
		});

		expect(accepted).toBe(true);
		expect(mockVerifyTwoFactor).toHaveBeenCalledWith({
			challenge: 'signed.challenge',
			code: '123456',
			selectedTeam: 'team-1'
		});
		expect(mockNavigateAfterSignIn).toHaveBeenCalled();
		expect(result.current.signedIn).toBe(true);
	});

	it('keeps the step open with the reason when the code is refused', async () => {
		mockVerifyTwoFactor.mockRejectedValue({ isApiError: true, statusCode: 401 });
		const { result } = renderHook(() => useTwoFactorSignIn());

		act(() => result.current.ask(CHALLENGE, ''));
		await act(async () => {
			await result.current.verify({ code: '000000' });
		});

		expect(result.current.pending).not.toBeNull();
		expect(result.current.failure).toEqual({ kind: 'wrong-code' });
		expect(mockNavigateAfterSignIn).not.toHaveBeenCalled();
	});

	it('goes back to no step on cancel', () => {
		const { result } = renderHook(() => useTwoFactorSignIn());

		act(() => result.current.ask(CHALLENGE, ''));
		act(() => result.current.cancel());

		expect(result.current.pending).toBeNull();
	});
});
