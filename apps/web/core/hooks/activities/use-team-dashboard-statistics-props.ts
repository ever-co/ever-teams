import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { UseReportActivityProps } from './use-activity-filters';

export interface UseTeamDashboardStatisticsPropsOptions {
	/** Merged props from useActivityFilters */
	mergedProps: Required<UseReportActivityProps> | null;
	/** Role-based access from useActivityFilters (admin, super admin, organization manager) */
	isManage?: boolean | null;
	/** The [teamId] segment of the Team Dashboard URL */
	routeTeamId?: string;
}

/**
 * Scopes the Team Dashboard counts request to a team.
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

	const statisticsTeamId = organizationTeams.some(({ id }) => id === routeTeamId) ? routeTeamId : activeTeam?.id;

	return useMemo(() => {
		if (!mergedProps || !statisticsTeamId) return mergedProps;

		// Teams picked in the filter replace the page team.
		const teamIds = mergedProps.teamIds.length ? mergedProps.teamIds : [statisticsTeamId];
		// A manager of every requested team sends no employee ids so the server resolves the members; admins keep their picks.
		const managesRequestedTeams = teamIds.every((teamId) => userManagedTeams.some(({ id }) => id === teamId));

		return {
			...mergedProps,
			teamId: statisticsTeamId,
			teamIds,
			employeeIds: managesRequestedTeams && !isManage ? [] : mergedProps.employeeIds
		};
	}, [mergedProps, statisticsTeamId, userManagedTeams, isManage]);
}
