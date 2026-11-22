/** @jest-environment jsdom */

/**
 * A verification code sent from the profile reads the verification status again, so the home page's banner says a
 * code was sent instead of offering to send one (ever-co/ever-teams#5677).
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockResend = jest.fn();
const OWNER = { id: 'user-1', email: 'ruth@example.com', isEmailVerified: false, lastOrganizationId: 'organization-1' };

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: OWNER, refetch: jest.fn() })
}));
jest.mock('@/core/hooks/users/use-email-reset', () => ({
	useEmailReset: () => ({
		emailResetRequestQueryCall: jest.fn(),
		emailResetRequestLoading: false,
		verifyChangeEmailRequestQueryCall: jest.fn(),
		verifyChangeEmailRequestLoading: false
	})
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { resendVerifyUserLink: (...args: unknown[]) => mockResend(...args) }
}));
jest.mock('@/core/services/client/api/users/emails/email-verification.service', () => ({
	emailVerificationService: { verifyUserEmailByCode: jest.fn() }
}));

import { useAccountEmail } from './use-account-email';

function renderAccountEmail() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	const invalidate = jest.spyOn(client, 'invalidateQueries');
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const view = renderHook(() => useAccountEmail(), { wrapper });
	return { ...view, invalidate };
}

describe('useAccountEmail sendVerificationCode', () => {
	beforeEach(() => mockResend.mockReset());

	it('reads the verification status again once the code went out', async () => {
		mockResend.mockResolvedValue({ data: { status: 202 } });
		const { result, invalidate } = renderAccountEmail();

		await act(async () => {
			await result.current.sendVerificationCode();
		});

		expect(mockResend).toHaveBeenCalledWith(OWNER);
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: ['users', 'email-verification-status', 'user-1', 'organization-1']
		});
	});

	it('leaves the status alone when no code went out', async () => {
		mockResend.mockRejectedValue({ statusCode: 429 });
		const { result, invalidate } = renderAccountEmail();

		await act(async () => {
			await expect(result.current.sendVerificationCode()).rejects.toEqual({ statusCode: 429 });
		});

		expect(invalidate).not.toHaveBeenCalled();
	});
});
