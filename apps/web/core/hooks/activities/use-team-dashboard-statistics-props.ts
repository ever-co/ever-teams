import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { UseReportActivityProps } from './use-activity-filters';
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
 * Scopes the Team Dashboard counts request to a team, for a manager of that team.
 *
 * Admins (and the organization MANAGER role) keep the organization-wide counters, and members who manage none of
 * the requested teams keep the counters they had; both only get the page team in the cache key.
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
		// A manager of every requested team sends no employee ids so the server resolves the members; admins keep their picks.
		const managesRequestedTeams = teamIds.every((teamId) => userManagedTeams.some(({ id }) => id === teamId));

		if (isOrganizationWideViewer || !managesRequestedTeams) return { ...mergedProps, teamId: statisticsTeamId };

		return {
			...mergedProps,
			teamId: statisticsTeamId,
			teamIds,
			employeeIds: isManage ? mergedProps.employeeIds : []
		};
	}, [mergedProps, statisticsTeamId, userManagedTeams, isManage, isOrganizationWideViewer]);
}
