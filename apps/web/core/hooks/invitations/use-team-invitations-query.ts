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

/**
 * Hook for reading team invitations (Admin/Manager).
 * READ only — no mutations. Following Single Responsibility Principle.
 *
 * Use `useSendTeamInvitation` for send operations (invite, resend).
 * Use `useRemoveTeamInvitation` for removing invitations.
 *
 * @returns Object containing team invitations data, loading states, and firstLoad callback
 */
export function useTeamInvitationsQuery() {
	const activeTeamId = getActiveTeamIdCookie();
	const { firstLoadData: firstLoadTeamInvitationsData } = useFirstLoad();

	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);

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
		isSuccess: teamInvitationsSuccess
	} = useQuery({
		queryKey: queryKeys.users.invitations.team(
			user?.tenantId || '',
			user?.employee?.organizationId || '',
			activeTeamId || ''
		),
		queryFn: async () => {
			if (!teamInvitationsParams) return { items: [] };
			return await inviteService.getTeamInvitations({
				teamId: teamInvitationsParams.teamId
			});
		},
		enabled: !!(activeTeamId && isTeamManager && user?.tenantId)
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
		fetchingInvitations: teamInvitationsLoading,
		isLoading: teamInvitationsLoading,
		isSuccess: teamInvitationsSuccess
	};
}

