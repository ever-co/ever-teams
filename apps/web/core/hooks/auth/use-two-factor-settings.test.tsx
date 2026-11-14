/** @jest-environment jsdom */
// cspell:ignore DPEHPK JBSWY otpauth totp
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockTwoFactorService = {
	getStatus: jest.fn(),
	enroll: jest.fn(),
	confirm: jest.fn(),
	disable: jest.fn(),
	regenerateRecoveryCodes: jest.fn()
};

// Getter: the mocked module loads before this file's constants are set, and reads the service only when called
jest.mock('@/core/services/client/api/auth/two-factor.service', () => ({
	get twoFactorService() {
		return mockTwoFactorService;
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({ getOrganizationIdCookie: () => 'organization-1' }));
jest.mock('jotai', () => ({
	...jest.requireActual('jotai'),
	useAtomValue: () => ({ id: 'user-1', tenantId: 'tenant-1' })
}));

import { useTwoFactorSettings } from './use-two-factor-settings';

const SECRET = 'JBSWY3DPEHPK3PXP';
const RECOVERY_CODES = ['AAAA-BBBB-CCCC-DDDD', 'EEEE-FFFF-GGGG-HHHH'];
const NEW_RECOVERY_CODES = ['JJJJ-KKKK-LLLL-MMMM'];

function setup() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const hook = renderHook(() => useTwoFactorSettings(), { wrapper });
	return { queryClient, ...hook };
}

/** Everything the mutation cache still holds: answers, typed proofs and refusals. */
function mutationCacheText(queryClient: QueryClient): string {
	return JSON.stringify(
		queryClient
			.getMutationCache()
			.getAll()
			.map((mutation) => mutation.state)
	);
}

describe('useTwoFactorSettings', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockTwoFactorService.getStatus.mockResolvedValue({
			available: true,
			enabled: false,
			enabledAt: null,
			pendingEnrollment: false,
			recoveryCodesLeft: 0,
			requiredByOrganization: false
		});
		mockTwoFactorService.enroll.mockResolvedValue({
			secret: SECRET,
			otpauthUrl: `otpauth://totp/x?secret=${SECRET}`
		});
		mockTwoFactorService.confirm.mockResolvedValue({
			enabledAt: '2026-11-14T12:00:00.000Z',
			recoveryCodes: RECOVERY_CODES
		});
		mockTwoFactorService.regenerateRecoveryCodes.mockResolvedValue({ recoveryCodes: NEW_RECOVERY_CODES });
	});

	it('hands the key and the recovery codes to the page, and keeps none of them in the mutation cache', async () => {
		const { result, queryClient } = setup();

		let enrollment: unknown;
		await act(async () => {
			enrollment = await result.current.enroll.mutateAsync(undefined);
		});
		let confirmation: unknown;
		await act(async () => {
			confirmation = await result.current.confirm.mutateAsync('123456');
		});
		let regenerated: unknown;
		await act(async () => {
			regenerated = await result.current.regenerate.mutateAsync({ recoveryCode: 'AAAA-BBBB-CCCC-DDDD' });
		});

		expect(enrollment).toEqual(expect.objectContaining({ secret: SECRET }));
		expect(confirmation).toEqual(expect.objectContaining({ recoveryCodes: RECOVERY_CODES }));
		expect(regenerated).toEqual({ recoveryCodes: NEW_RECOVERY_CODES });
		expect(result.current.enroll.data).toBeUndefined();
		expect(result.current.confirm.data).toBeUndefined();
		expect(result.current.regenerate.data).toBeUndefined();
		await waitFor(() => {
			const cached = mutationCacheText(queryClient);
			expect(cached).not.toContain(SECRET);
			expect(cached).not.toContain('CCCC-DDDD');
			expect(cached).not.toContain('LLLL-MMMM');
			expect(cached).not.toContain('123456');
		});
	});

	it('keeps no typed proof of a refused change either', async () => {
		mockTwoFactorService.disable.mockRejectedValue({ statusCode: 401, proof: { code: '654321' } });
		const { result, queryClient } = setup();

		await act(async () => {
			await expect(result.current.disable.mutateAsync({ code: '654321' })).rejects.toEqual(
				expect.objectContaining({ statusCode: 401 })
			);
		});

		expect(result.current.disable.isPending).toBe(false);
		await waitFor(() => expect(mutationCacheText(queryClient)).not.toContain('654321'));
	});
});
