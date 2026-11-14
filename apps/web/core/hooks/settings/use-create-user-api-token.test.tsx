/** @jest-environment jsdom */

/**
 * The answer to a token's creation holds its secret: React Query must not keep it once nothing shows it.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCreate = jest.fn();

const mockRevoke = jest.fn();

jest.mock('@/core/services/client/api/users/user-api-tokens.service', () => ({
	userApiTokensService: {
		create: (...args: unknown[]) => mockCreate(...args),
		revoke: (...args: unknown[]) => mockRevoke(...args)
	}
}));

import { useCreateUserApiToken, useRevokeUserApiToken } from './use-user-api-tokens';

const CREATED = {
	id: 'token-1',
	name: 'Friday report',
	createdAt: '2026-11-14T12:00:00.000Z',
	expiresAt: null,
	lastUsedAt: null,
	token: 'gzp_secret'
};

function heldSecrets(queryClient: QueryClient): string {
	return JSON.stringify(
		queryClient
			.getMutationCache()
			.getAll()
			.map((mutation) => mutation.state.data)
	);
}

it('drops the answer with the secret as soon as nothing shows it', async () => {
	const queryClient = new QueryClient();
	mockCreate.mockResolvedValue(CREATED);
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result, unmount } = renderHook(() => useCreateUserApiToken(), { wrapper });

	await act(async () => {
		await result.current.mutateAsync({ name: 'Friday report', expiry: 'never' });
	});
	expect(heldSecrets(queryClient)).toContain('gzp_secret');

	unmount();

	await waitFor(() => expect(heldSecrets(queryClient)).not.toContain('gzp_secret'));
	queryClient.clear();
});

it('leaves a failed creation or revocation to the dialog, which says why: no second, global toast', async () => {
	const queryClient = new QueryClient();
	mockCreate.mockRejectedValue(Object.assign(new Error('Bad Request'), { statusCode: 400 }));
	mockRevoke.mockRejectedValue(Object.assign(new Error('Server Error'), { statusCode: 500 }));
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => ({ create: useCreateUserApiToken(), revoke: useRevokeUserApiToken() }), {
		wrapper
	});

	await act(async () => {
		await result.current.create.mutateAsync({ name: 'Friday report', expiry: 'never' }).catch(() => undefined);
		await result.current.revoke.mutateAsync('token-1').catch(() => undefined);
	});

	const failed = queryClient.getMutationCache().getAll();
	expect(failed).toHaveLength(2);
	for (const mutation of failed) {
		expect(mutation.state.status).toBe('error');
		expect(mutation.meta?.handlesOwnError).toBe(true);
	}
	queryClient.clear();
});
