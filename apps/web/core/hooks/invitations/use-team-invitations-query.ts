'use client';

import { fetchingTeamInvitationsState, getTeamInvitationsState, teamInvitationsState } from '@/core/stores';
import { useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
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
	const setTeamInvitations = useSetAtom(teamInvitationsState);
	const teamInvitations = useAtomValue(getTeamInvitationsState);
	const [fetchingInvitations, setFetchingInvitations] = useAtom(fetchingTeamInvitationsState);

	const activeTeamId = getActiveTeamIdCookie();
	const { firstLoad, firstLoadData: firstLoadTeamInvitationsData } = useFirstLoad();

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

	// ===== JOTAI SYNCHRONIZATION =====

	useEffect(() => {
		if (teamInvitationsSuccess && teamInvitationsData?.items) {
			setTeamInvitations(teamInvitationsData.items);
		}
	}, [teamInvitationsSuccess, teamInvitationsData?.items, setTeamInvitations]);

	useEffect(() => {
		if (firstLoad) {
			setFetchingInvitations(teamInvitationsLoading);
		}
	}, [teamInvitationsLoading, firstLoad, setFetchingInvitations]);

	// ===== HYDRATED DATA =====

	const hydratedInvitations = useMemo(() => {
		return teamInvitationsSuccess && teamInvitationsData?.items
			? (teamInvitationsData?.items ?? teamInvitations)
			: [];
	}, [teamInvitationsData?.items, teamInvitationsSuccess, teamInvitations]);

	// ===== RETURN =====

	return {
		teamInvitations: hydratedInvitations,
		firstLoadTeamInvitationsData,
		fetchingInvitations,
		isLoading: teamInvitationsLoading,
		isSuccess: teamInvitationsSuccess
	};
}

