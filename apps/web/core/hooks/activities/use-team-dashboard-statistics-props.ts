import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { UseReportActivityProps, getActiveMemberEmployeeIds } from './use-activity-filters';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { ERoleName } from '@/core/types/generics/enums/role';

// Roles that see the organization-wide figures, as the chart and table below the counters do
const ORGANIZATION_WIDE_ROLES: string[] = [ERoleName.SUPER_ADMIN, ERoleName.ADMIN, ERoleName.MANAGER];

export interface UseTeamDashboardStatisticsPropsOptions {
	/** Merged props from useActivityFilters */
	mergedProps: Required<UseReportActivityProps> | null;
	/** Role-based access from useActivityFilters (admin, super admin, organization manager) */
	isManage?: boolean | null;
	/** The [teamId] segment of the Team Dashboard URL */
	routeTeamId?: string;
}

/**
 * Scopes the Team Dashboard requests (counts, chart and daily report) to a team, for a manager of that team.
 *
 * Admins (and the organization MANAGER role) keep the organization-wide figures, and members who manage none of
 * the requested teams keep the figures they had; both only get the page team in the cache key.
 *
 * The URL segment is kept when it is one of the user's teams. Links saved before the segment carried a
 * team id hold a user id, so they fall back to the active team. Without any team the props are returned
 * unchanged.
 */
export function useTeamDashboardStatisticsProps({
	mergedProps,
	isManage,
	routeTeamId
}: UseTeamDashboardStatisticsPropsOptions): Required<UseReportActivityProps> | null {
	const organizationTeams = useAtomValue(organizationTeamsState);
	const activeTeam = useAtomValue(activeTeamState);
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { data: user } = useUserQuery();
	const isOrganizationWideViewer = ORGANIZATION_WIDE_ROLES.includes(user?.role?.name?.toUpperCase() ?? '');

	const statisticsTeamId = organizationTeams.some(({ id }) => id === routeTeamId) ? routeTeamId : activeTeam?.id;

	return useMemo(() => {
		if (!mergedProps || !statisticsTeamId) return mergedProps;

		// Teams picked in the filter replace the page team.
		const teamIds = mergedProps.teamIds.length ? mergedProps.teamIds : [statisticsTeamId];
		// A manager of every requested team gets the team scope; admins keep their picks.
		const managesRequestedTeams = teamIds.every((teamId) => userManagedTeams.some(({ id }) => id === teamId));

		if (isOrganizationWideViewer || !managesRequestedTeams) return { ...mergedProps, teamId: statisticsTeamId };

		// Members picked in the filter win. Without a pick, the active members of the requested teams: with no
		// employee id the API reads only the caller's own time logs, and the counts keep the members they resolve.
		const hasPickedMembers = !!isManage && mergedProps.employeeIds.length > 0;

		if (hasPickedMembers) return { ...mergedProps, teamId: statisticsTeamId, teamIds };

		return {
			...mergedProps,
			teamId: statisticsTeamId,
			teamIds,
			employeeIds: getActiveMemberEmployeeIds(userManagedTeams, teamIds)
		};
	}, [mergedProps, statisticsTeamId, userManagedTeams, isManage, isOrganizationWideViewer]);
}
