/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUpdateUserPassword = jest.fn();
let mockUser: { id: string } | undefined = { id: 'user-1' };

jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/services/client/api/users/user.service', () => ({
	userService: { updateUserPassword: (...args: unknown[]) => mockUpdateUserPassword(...args) }
}));

import { useAccountPassword } from './use-account-password';

function wrapper({ children }: { children?: React.ReactNode }) {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAccountPassword', () => {
	beforeEach(() => {
		mockUpdateUserPassword.mockReset();
		mockUser = { id: 'user-1' };
	});

	it("saves the password on the signed-in account's own profile", async () => {
		mockUpdateUserPassword.mockResolvedValue(undefined);
		const { result } = renderHook(() => useAccountPassword(), { wrapper });

		await act(async () => {
			await result.current.savePassword('new-password');
		});

		expect(mockUpdateUserPassword).toHaveBeenCalledWith({ userId: 'user-1', password: 'new-password' });
	});

	it('saves nothing before the account is known', async () => {
		mockUser = undefined;
		const { result } = renderHook(() => useAccountPassword(), { wrapper });

		await expect(result.current.savePassword('new-password')).rejects.toThrow();
		expect(mockUpdateUserPassword).not.toHaveBeenCalled();
	});
});
