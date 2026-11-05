/**
 * @jest-environment jsdom
 *
 * Settings → Danger Zone → "Delete all data" (useDeleteMyAccount):
 * - only a preview with its planHash can be confirmed: without it nothing is sent, so the deletion is always the
 *   outcome the person saw (Gauzy's stale-outcome check needs the hash);
 * - the mutation stays pending until the logout (session and cache cleared) has finished.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
// jest.mock calls below are hoisted above this import
import { ACCOUNT_DELETION_PREVIEW_REQUIRED, useDeleteMyAccount } from './use-delete-my-account';

const mockLogOut = jest.fn();
jest.mock('./use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ user: { id: 'user-1' }, logOut: () => mockLogOut() })
}));

const mockPreviewMe = jest.fn();
const mockDeleteMe = jest.fn();
jest.mock('@/core/services/client/api/auth/account-deletion.service', () => ({
	accountDeletionService: {
		previewMe: (...args: unknown[]) => mockPreviewMe(...args),
		deleteMe: (...args: unknown[]) => mockDeleteMe(...args)
	},
	isAccountDeletionPlanChanged: () => false
}));

const preview = (planHash?: string) => ({
	email: 'j***@example.test',
	expiresAt: new Date(Date.now() + 600_000).toISOString(),
	...(planHash ? { planHash } : {}),
	accounts: [{ workspace: 'Acme', outcome: 'account-removed' as const }]
});

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
	mockLogOut.mockReset();
	mockPreviewMe.mockReset();
	mockDeleteMe.mockReset();
});

describe('useDeleteMyAccount', () => {
	it('refuses to delete without the preview planHash, and says it cannot be confirmed', async () => {
		mockPreviewMe.mockResolvedValue(preview());

		const { result } = renderHook(() => useDeleteMyAccount(true), { wrapper });
		await waitFor(() => expect(result.current.preview).toBeDefined());

		expect(result.current.canDeleteMyAccount).toBe(false);
		await expect(result.current.deleteMyAccount()).rejects.toThrow(ACCOUNT_DELETION_PREVIEW_REQUIRED);
		expect(mockDeleteMe).not.toHaveBeenCalled();
		expect(mockLogOut).not.toHaveBeenCalled();
	});

	it('deletes with the planHash of the preview shown, and stays pending until the logout has finished', async () => {
		mockPreviewMe.mockResolvedValue(preview('plan-1'));
		mockDeleteMe.mockResolvedValue({ deleted: true, accounts: 1, workspacesDeleted: 0 });
		let finishLogOut: () => void = () => undefined;
		mockLogOut.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finishLogOut = resolve;
				})
		);

		const { result } = renderHook(() => useDeleteMyAccount(true), { wrapper });
		await waitFor(() => expect(result.current.canDeleteMyAccount).toBe(true));

		let deleting: Promise<unknown> = Promise.resolve();
		act(() => {
			deleting = result.current.deleteMyAccount();
		});
		await waitFor(() => expect(mockLogOut).toHaveBeenCalledTimes(1));
		expect(mockDeleteMe).toHaveBeenCalledWith('plan-1');
		expect(result.current.deleteMyAccountLoading).toBe(true);

		await act(async () => {
			finishLogOut();
			await deleting;
		});
		expect(result.current.deleteMyAccountLoading).toBe(false);
	});
});
