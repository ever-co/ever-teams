'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { queryKeys } from '@/core/query/keys';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { TeamInvitationsQueryParams } from '@/core/types/interfaces/user/invite';
import { useIsMemberManager } from '../organizations/teams/use-team-member';
import { useUserQuery } from '../queries/user-user.query';
import { useScopeGuard } from '../bootstrap/use-scope-guard';
import { useReactiveAccessTokenCookie } from '../auth/use-reactive-access-token-cookie';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';

export interface UseTeamInvitationsQueryOptions {
	enabled?: boolean;
}

/**
 * Hook for reading team invitations (Admin/Manager).
 * READ only — no mutations. Following Single Responsibility Principle.
 *
 * Use `useSendTeamInvitation` for send operations (invite, resend).
 * Use `useRemoveTeamInvitation` for removing invitations.
 *
 * @returns Object containing team invitations data, loading states, and firstLoad callback
 */
export function useTeamInvitationsQuery({ enabled = true }: UseTeamInvitationsQueryOptions = {}) {
	const activeTeamId = getActiveTeamIdCookie();
	const { firstLoadData: firstLoadTeamInvitationsData } = useFirstLoad();

	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);
	const accessToken = useReactiveAccessTokenCookie();
	const scope = {
		tenantId: user?.tenantId,
		organizationId: user?.employee?.organizationId,
		teamId: activeTeamId,
		userId: user?.id,
		accessToken
	};
	const queryKey = queryKeys.users.invitations.teamByScope(scope.tenantId, scope.organizationId, scope.teamId);
	const ownerActive = enabled;
	const queryEnabled =
		ownerActive &&
		isTeamManager &&
		!!(scope.tenantId && scope.organizationId && scope.teamId && scope.userId && scope.accessToken);
	useScopeGuard(queryKey, ownerActive);

	// Request params
	const teamInvitationsParams: TeamInvitationsQueryParams | null =
		activeTeamId && user?.tenantId && user?.employee?.organizationId
			? {
					tenantId: user.tenantId,
					organizationId: user.employee.organizationId,
					teamId: activeTeamId
				}
			: null;

	// ===== QUERY =====

	const {
		data: teamInvitationsData,
		isLoading: teamInvitationsLoading,
		isFetching: teamInvitationsFetching,
		isSuccess: teamInvitationsSuccess
	} = useQuery({
		queryKey,
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: async ({ signal }) => {
			if (!teamInvitationsParams) return { items: [] };
			return inviteService.getTeamInvitations({ teamId: teamInvitationsParams.teamId }, { scope, signal });
		},
		enabled: queryEnabled
	});

	// ===== HYDRATED DATA =====

	const teamInvitations = useMemo(
		() => (teamInvitationsSuccess ? (teamInvitationsData?.items ?? []) : []),
		[teamInvitationsData?.items, teamInvitationsSuccess]
	);

	// ===== RETURN =====

	return {
		teamInvitations,
		firstLoadTeamInvitationsData,
		// A cached empty list is not authoritative while a background refetch is pending.
		fetchingInvitations: teamInvitationsFetching,
		isLoading: teamInvitationsLoading,
		isSuccess: teamInvitationsSuccess
	};
}
