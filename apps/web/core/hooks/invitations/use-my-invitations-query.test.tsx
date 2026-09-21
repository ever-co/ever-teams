/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { queryKeys } from '@/core/query/keys';

const getMyInvitations = jest.fn(async () => ({
	items: [{ id: 'invite-1' }, { id: 'invite-2' }],
	total: 2
}));
let currentUser: { id: string; tenantId: string } | undefined = { id: 'user-1', tenantId: 'tenant-1' };
let accessToken: string | null = 'access-token';

jest.mock('@/core/lib/helpers/cookies', () => ({
	ACCESS_TOKEN_REFRESHED_EVENT: 'ever-teams:access-token-refreshed',
	getAccessTokenCookie: () => accessToken
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: currentUser })
}));
jest.mock('@/core/services/client/api/organizations/teams/invites', () => ({
	inviteService: { getMyInvitations }
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useMyInvitationsQuery } = require('./use-my-invitations-query') as typeof import('./use-my-invitations-query');

describe('scoped my-invitations cache ownership', () => {
	beforeEach(() => {
		getMyInvitations.mockClear();
		currentUser = { id: 'user-1', tenantId: 'tenant-1' };
		accessToken = 'access-token';
	});

	it('does not manually refetch before the credential scope is complete', async () => {
		currentUser = undefined;
		accessToken = null;
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useMyInvitationsQuery(), { wrapper });

		await act(async () => {
			result.current.refetchMyInvitations();
			await Promise.resolve();
		});

		expect(getMyInvitations).not.toHaveBeenCalled();
	});

	it('optimistically removes only from the user-scoped cache and keeps the unscoped cache untouched', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const scopedKey = queryKeys.users.invitations.myByUser('tenant-1', 'user-1');
		const unscopedKey = queryKeys.users.invitations.my('tenant-1');
		client.setQueryData(unscopedKey, { items: [{ id: 'unscoped-invite' }], total: 1 });
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useMyInvitationsQuery(), { wrapper });

		await waitFor(() => expect(result.current.myInvitations).toHaveLength(2));
		await act(async () => result.current.removeMyInvitation('invite-1'));

		expect(client.getQueryData(scopedKey)).toEqual({ items: [{ id: 'invite-2' }], total: 1 });
		expect(client.getQueryData(unscopedKey)).toEqual({ items: [{ id: 'unscoped-invite' }], total: 1 });
		expect(getMyInvitations).toHaveBeenCalledWith({
			scope: { tenantId: 'tenant-1', userId: 'user-1', accessToken: 'access-token' },
			signal: expect.any(AbortSignal)
		});
	});

	it('keeps personal invitations fresh every minute while the owner is mounted', async () => {
		jest.useFakeTimers();
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const view = renderHook(() => useMyInvitationsQuery(), { wrapper });

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		expect(getMyInvitations).toHaveBeenCalledTimes(1);

		await act(async () => {
			jest.advanceTimersByTime(60_000);
			await Promise.resolve();
			await Promise.resolve();
		});
		expect(getMyInvitations).toHaveBeenCalledTimes(2);

		view.unmount();
		jest.useRealTimers();
	});
});
