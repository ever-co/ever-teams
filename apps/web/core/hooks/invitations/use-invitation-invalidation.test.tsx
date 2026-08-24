/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { queryKeys } from '@/core/query/keys';

let fastBootstrap = true;
let teamId = 'team-1';
const user = {
	id: 'user-1',
	tenantId: 'tenant-1',
	employee: { organizationId: 'org-1' }
};

jest.mock('@/core/constants/config/constants', () => ({
	FAST_APP_BOOTSTRAP: {
		get value() {
			return fastBootstrap;
		}
	}
}));
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

describe('invitation invalidation follows the active transport', () => {
	it('invalidates the exact fast team and user caches without touching legacy caches', async () => {
		fastBootstrap = true;
		const client = new QueryClient();
		const fastTeam = queryKeys.users.invitations.teamByScope('tenant-1', 'org-1', 'team-1');
		const fastMine = queryKeys.users.invitations.myByUser('tenant-1', 'user-1');
		const legacyTeam = queryKeys.users.invitations.team('tenant-1', 'org-1', 'team-1');
		const legacyMine = queryKeys.users.invitations.my('tenant-1');
		for (const key of [fastTeam, fastMine, legacyTeam, legacyMine]) seed(client, key);
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useInvitationInvalidation(), { wrapper });

		await act(async () => {
			await result.current.invalidateTeamInvitations();
			await result.current.invalidateMyInvitations();
		});

		expect(client.getQueryState(fastTeam)?.isInvalidated).toBe(true);
		expect(client.getQueryState(fastMine)?.isInvalidated).toBe(true);
		expect(client.getQueryState(legacyTeam)?.isInvalidated).toBe(false);
		expect(client.getQueryState(legacyMine)?.isInvalidated).toBe(false);
	});

	it('preserves the legacy invalidation keys when the flag is off', async () => {
		fastBootstrap = false;
		teamId = 'team-1';
		const client = new QueryClient();
		const legacyTeam = queryKeys.users.invitations.team('tenant-1', 'org-1', 'team-1');
		const legacyMine = queryKeys.users.invitations.my('tenant-1');
		seed(client, legacyTeam);
		seed(client, legacyMine);
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useInvitationInvalidation(), { wrapper });

		await act(async () => {
			await result.current.invalidateTeamInvitations();
			await result.current.invalidateMyInvitations();
		});

		expect(client.getQueryState(legacyTeam)?.isInvalidated).toBe(true);
		expect(client.getQueryState(legacyMine)?.isInvalidated).toBe(true);
	});
});
