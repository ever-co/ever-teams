/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { queryKeys } from '@/core/query/keys';

let teamId = 'team-1';
const user = {
	id: 'user-1',
	tenantId: 'tenant-1',
	employee: { organizationId: 'org-1' }
};

jest.mock('@/core/lib/helpers/cookies', () => ({
	getActiveTeamIdCookie: () => teamId
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: user })
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useInvitationInvalidation } =
	require('./use-invitation-invalidation') as typeof import('./use-invitation-invalidation');

function seed(client: QueryClient, key: readonly unknown[]) {
	client.setQueryData(key, { items: [{ id: 'invite-1' }], total: 1 });
}

describe('invitation invalidation follows the scoped transport', () => {
	it('invalidates the exact team and user caches without touching unrelated caches', async () => {
		const client = new QueryClient();
		const teamKey = queryKeys.users.invitations.teamByScope('tenant-1', 'org-1', 'team-1');
		const mineKey = queryKeys.users.invitations.myByUser('tenant-1', 'user-1');
		const unrelatedTeam = queryKeys.users.invitations.teamByScope('tenant-1', 'org-1', 'team-2');
		const unrelatedMine = queryKeys.users.invitations.myByUser('tenant-1', 'user-2');
		for (const key of [teamKey, mineKey, unrelatedTeam, unrelatedMine]) seed(client, key);
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useInvitationInvalidation(), { wrapper });

		await act(async () => {
			await result.current.invalidateTeamInvitations();
			await result.current.invalidateMyInvitations();
		});

		expect(client.getQueryState(teamKey)?.isInvalidated).toBe(true);
		expect(client.getQueryState(mineKey)?.isInvalidated).toBe(true);
		expect(client.getQueryState(unrelatedTeam)?.isInvalidated).toBe(false);
		expect(client.getQueryState(unrelatedMine)?.isInvalidated).toBe(false);
	});
});
