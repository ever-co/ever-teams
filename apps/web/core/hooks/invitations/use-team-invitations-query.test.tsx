/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

jest.mock('@tanstack/react-query', () => ({
	useQuery: () => ({
		data: { items: [] },
		isLoading: false,
		isFetching: true,
		isSuccess: true
	})
}));
jest.mock('../common/use-first-load', () => ({ useFirstLoad: () => ({ firstLoadData: jest.fn() }) }));
jest.mock('../../services/client/api/organizations/teams/invites', () => ({ inviteService: {} }));
jest.mock('@/core/lib/helpers/cookies', () => ({ getActiveTeamIdCookie: () => 'team-a' }));
jest.mock('../organizations/teams/use-team-member', () => ({ useIsMemberManager: () => ({ isTeamManager: true }) }));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: { id: 'user-a', tenantId: 'tenant-a', employee: { organizationId: 'organization-a' } }
	})
}));
jest.mock('../bootstrap/use-scope-guard', () => ({ useScopeGuard: jest.fn() }));
jest.mock('../auth/use-reactive-access-token-cookie', () => ({
	useReactiveAccessTokenCookie: () => 'token-a'
}));

import { useTeamInvitationsQuery } from './use-team-invitations-query';

describe('useTeamInvitationsQuery readiness', () => {
	it('keeps cached invitations non-authoritative during a background refetch', () => {
		const { result } = renderHook(() => useTeamInvitationsQuery());

		expect(result.current.teamInvitations).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.fetchingInvitations).toBe(true);
	});
});
