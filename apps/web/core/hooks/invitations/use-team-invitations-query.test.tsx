/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

const mockUseQuery = jest.fn((_options: { enabled?: boolean }) => ({
	data: { items: [] },
	isLoading: false,
	isFetching: true,
	isSuccess: true
}));
let mockIsTeamManager = true;
let mockRoleName = 'EMPLOYEE';

jest.mock('@tanstack/react-query', () => ({
	useQuery: (options: { enabled?: boolean }) => mockUseQuery(options)
}));
jest.mock('../common/use-first-load', () => ({ useFirstLoad: () => ({ firstLoadData: jest.fn() }) }));
jest.mock('../../services/client/api/organizations/teams/invites', () => ({ inviteService: {} }));
jest.mock('@/core/lib/helpers/cookies', () => ({ getActiveTeamIdCookie: () => 'team-a' }));
jest.mock('../organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: mockIsTeamManager })
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: {
			id: 'user-a',
			tenantId: 'tenant-a',
			role: { name: mockRoleName },
			employee: { organizationId: 'organization-a' }
		}
	})
}));
jest.mock('../bootstrap/use-scope-guard', () => ({ useScopeGuard: jest.fn() }));
jest.mock('../auth/use-reactive-access-token-cookie', () => ({
	useReactiveAccessTokenCookie: () => 'token-a'
}));

import { useTeamInvitationsQuery } from './use-team-invitations-query';

function loadsInvitationsAs(isTeamManager: boolean, roleName: string): boolean | undefined {
	mockIsTeamManager = isTeamManager;
	mockRoleName = roleName;
	mockUseQuery.mockClear();
	renderHook(() => useTeamInvitationsQuery());
	return mockUseQuery.mock.calls[0][0].enabled;
}

describe('useTeamInvitationsQuery readiness', () => {
	it('keeps cached invitations non-authoritative during a background refetch', () => {
		mockIsTeamManager = true;
		mockRoleName = 'EMPLOYEE';
		const { result } = renderHook(() => useTeamInvitationsQuery());

		expect(result.current.teamInvitations).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.fetchingInvitations).toBe(true);
	});
});

describe('useTeamInvitationsQuery access', () => {
	it('loads the pending invitations for a manager of the team', () => {
		expect(loadsInvitationsAs(true, 'EMPLOYEE')).toBe(true);
	});

	it('loads them for an organization admin who does not manage the team', () => {
		expect(loadsInvitationsAs(false, 'ADMIN')).toBe(true);
	});

	it('does not load them for a plain employee', () => {
		expect(loadsInvitationsAs(false, 'EMPLOYEE')).toBe(false);
	});
});
