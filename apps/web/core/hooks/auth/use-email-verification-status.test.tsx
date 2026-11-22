/** @jest-environment jsdom */

/**
 * The verification status is asked of the API only for an unverified address, and an unverified owner on a deployment
 * that verifies no address (the status route answers 404) is let through and asked for nothing (ever-co/ever-teams#5677).
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetVerificationStatus = jest.fn();

jest.mock('@/core/services/client/api/users/emails/email-verification.service', () => ({
	emailVerificationService: { getVerificationStatus: () => mockGetVerificationStatus() }
}));

import { useAsksForEmailVerification, useIsEmailVerificationSatisfied } from './use-email-verification-status';

const OWNER = { id: 'user-1', isEmailVerified: false, lastOrganizationId: 'organization-1' };

function renderGate(user: typeof OWNER) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);

	return renderHook(
		() => ({
			satisfied: useIsEmailVerificationSatisfied(user),
			asks: useAsksForEmailVerification(user)
		}),
		{ wrapper }
	);
}

describe('useIsEmailVerificationSatisfied and useAsksForEmailVerification', () => {
	beforeEach(() => mockGetVerificationStatus.mockReset());

	it('asks the API nothing for a verified address', () => {
		const { result } = renderGate({ ...OWNER, isEmailVerified: true });

		expect(result.current).toEqual({ satisfied: true, asks: false });
		expect(mockGetVerificationStatus).not.toHaveBeenCalled();
	});

	it('lets an unverified owner through, and asks nothing, where the deployment verifies no address', async () => {
		mockGetVerificationStatus.mockResolvedValue(null);

		const { result } = renderGate(OWNER);

		await waitFor(() => expect(result.current.satisfied).toBe(true));
		expect(result.current.asks).toBe(false);
		expect(mockGetVerificationStatus).toHaveBeenCalledTimes(1);
	});

	it('holds an unverified owner back, and asks for the code, where the deployment verifies addresses', async () => {
		mockGetVerificationStatus.mockResolvedValue({ isEmailVerified: false, verificationEmailSent: true });

		const { result } = renderGate(OWNER);

		await waitFor(() => expect(result.current.asks).toBe(true));
		expect(result.current.satisfied).toBe(false);
	});

	it('holds an unverified owner back while the status cannot be read', async () => {
		mockGetVerificationStatus.mockRejectedValue({ statusCode: 502 });

		const { result } = renderGate(OWNER);

		await waitFor(() => expect(mockGetVerificationStatus).toHaveBeenCalled());
		expect(result.current).toEqual({ satisfied: false, asks: false });
	});
});
