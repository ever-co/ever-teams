import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import {
	UseReportActivityProps,
	getReportMemberIds,
	managesEveryTeam,
	withResolvedMemberIds
} from './use-activity-filters';
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

export interface TeamDashboardRequestProps {
	/** Props of the counts request */
	statisticsProps: Required<UseReportActivityProps> | null;
	/** Props of the chart and the daily report, which also feeds the member table and its export */
	reportProps: Required<UseReportActivityProps> | null;
}

/**
 * Scopes the Team Dashboard counts request to a team, for a manager of that team.
 *
 * Admins (and the organization MANAGER role) keep the organization-wide counters, and members who manage none of
 * the requested teams keep the counters they had; both only get the page team in the cache key.
 *
 * The chart and the daily report read time logs, which the API limits to the caller's own logs when no employee
 * id is sent. For a manager with no member picked they name the active members of the requested teams, so they
 * cover the same members as the counters. Member picks, and teams too large to name their members, keep the
 * request they had. Their cache key follows the members of the page team, which no pick changes, so a change in
 * that membership fetches them again.
 *
 * The URL segment is kept when it is one of the user's teams. Links saved before the segment carried a
 * team id hold a user id, so they fall back to the active team. Without any team the props are returned
 * unchanged.
 */
export function useTeamDashboardStatisticsProps({
	mergedProps,
	isManage,
	routeTeamId
}: UseTeamDashboardStatisticsPropsOptions): TeamDashboardRequestProps {
	const organizationTeams = useAtomValue(organizationTeamsState);
	const activeTeam = useAtomValue(activeTeamState);
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { data: user } = useUserQuery();
	const isOrganizationWideViewer = ORGANIZATION_WIDE_ROLES.includes(user?.role?.name?.toUpperCase() ?? '');

	const statisticsTeamId = organizationTeams.some(({ id }) => id === routeTeamId) ? routeTeamId : activeTeam?.id;

	return useMemo(() => {
		if (!mergedProps || !statisticsTeamId) return { statisticsProps: mergedProps, reportProps: mergedProps };

		// Teams picked in the filter replace the page team.
		const teamIds = mergedProps.teamIds.length ? mergedProps.teamIds : [statisticsTeamId];
		// A manager of every requested team sends no employee ids so the server resolves the members; admins keep their picks.
		const managesRequestedTeams = managesEveryTeam(userManagedTeams, teamIds);
		// Today's request keyed on the page team, as the member list below is: a pick in the filter then changes no
		// cache key and still waits for Apply.
		const pageProps = { ...mergedProps, teamId: statisticsTeamId };

		if (isOrganizationWideViewer || !managesRequestedTeams) {
			return { statisticsProps: pageProps, reportProps: pageProps };
		}

		const statisticsProps = {
			...mergedProps,
			teamId: statisticsTeamId,
			teamIds,
			employeeIds: isManage ? mergedProps.employeeIds : []
		};
		// The page team's members key the chart and the daily report: a change in its membership fetches them again,
		// while a pick in the filter still changes no key.
		const pageMemberIds = getReportMemberIds(userManagedTeams, [statisticsTeamId]);
		const reportPageProps = withResolvedMemberIds(pageProps, pageMemberIds);
		const hasPickedMembers = !!isManage && mergedProps.employeeIds.length > 0;

		if (hasPickedMembers) return { statisticsProps, reportProps: reportPageProps };

		const memberIds = getReportMemberIds(userManagedTeams, teamIds);

		if (!memberIds.length) return { statisticsProps, reportProps: reportPageProps };

		const memberProps = { ...statisticsProps, employeeIds: memberIds };
		const reportMemberProps = withResolvedMemberIds(memberProps, pageMemberIds);

		return { statisticsProps, reportProps: reportMemberProps };
	}, [mergedProps, statisticsTeamId, userManagedTeams, isManage, isOrganizationWideViewer]);
}
