/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { queryKeys } from '@/core/query/keys';

const getMyInvitations = jest.fn(async () => ({
	items: [{ id: 'invite-1' }, { id: 'invite-2' }],
	total: 2
}));

jest.mock('@/core/constants/config/constants', () => ({ FAST_APP_BOOTSTRAP: { value: true } }));
jest.mock('@/core/lib/helpers/cookies', () => ({ getAccessTokenCookie: () => 'access-token' }));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', tenantId: 'tenant-1' } })
}));
jest.mock('@/core/services/client/api/organizations/teams/invites', () => ({
	inviteService: { getMyInvitations }
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useMyInvitationsQuery } = require('./use-my-invitations-query') as typeof import('./use-my-invitations-query');

describe('fast my-invitations cache ownership', () => {
	it('optimistically removes only from the user-scoped cache and keeps the legacy cache untouched', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const fastKey = queryKeys.users.invitations.myByUser('tenant-1', 'user-1');
		const legacyKey = queryKeys.users.invitations.my('tenant-1');
		client.setQueryData(legacyKey, { items: [{ id: 'legacy-invite' }], total: 1 });
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useMyInvitationsQuery(), { wrapper });

		await waitFor(() => expect(result.current.myInvitations).toHaveLength(2));
		await act(async () => result.current.removeMyInvitation('invite-1'));

		expect(client.getQueryData(fastKey)).toEqual({ items: [{ id: 'invite-2' }], total: 1 });
		expect(client.getQueryData(legacyKey)).toEqual({ items: [{ id: 'legacy-invite' }], total: 1 });
		expect(getMyInvitations).toHaveBeenCalledWith({
			scope: { tenantId: 'tenant-1', userId: 'user-1', accessToken: 'access-token' },
			signal: expect.any(AbortSignal)
		});
	});
});
