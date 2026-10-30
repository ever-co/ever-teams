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
import { TOrganizationTeam } from '@/core/types/schemas';

// Roles that see the organization-wide figures, as the chart and table below the counters do
const ORGANIZATION_WIDE_ROLES: string[] = [ERoleName.SUPER_ADMIN, ERoleName.ADMIN, ERoleName.MANAGER];

/**
 * The active members of each managed team, team after team, for the cache key of the chart and the daily report.
 * The filter only picks among these teams, so a pick leaves the list as it is, while a change in the membership of
 * any of them, a picked team's included, changes it. A team too large to name its members adds none, as in the
 * request.
 */
function getManagedTeamsMemberIds(managedTeams: TOrganizationTeam[]): string[] {
	return managedTeams.flatMap((team) => getReportMemberIds([team], [team.id]));
}

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
 * request they had. Their cache key follows the members of the managed teams, which no pick changes, so a change in
 * any of these memberships, a picked team's included, fetches them again.
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
		// Today's request keyed on the page team: a pick in the filter changes no cache key and still waits for Apply.
		const pageProps = { ...mergedProps, teamId: statisticsTeamId };

		if (isOrganizationWideViewer) return { statisticsProps: pageProps, reportProps: pageProps };

		// The managed teams' members key the chart and the daily report in every branch below, so neither a pick nor
		// the branch it leads to changes the key, while a change in the membership of a picked team fetches them again.
		const managedMemberIds = getManagedTeamsMemberIds(userManagedTeams);
		const reportPageProps = withResolvedMemberIds(pageProps, managedMemberIds);

		if (!managesRequestedTeams) return { statisticsProps: pageProps, reportProps: reportPageProps };

		const statisticsProps = {
			...mergedProps,
			teamId: statisticsTeamId,
			teamIds,
			employeeIds: isManage ? mergedProps.employeeIds : []
		};
		const hasPickedMembers = !!isManage && mergedProps.employeeIds.length > 0;

		if (hasPickedMembers) return { statisticsProps, reportProps: reportPageProps };

		const memberIds = getReportMemberIds(userManagedTeams, teamIds);

		if (!memberIds.length) return { statisticsProps, reportProps: reportPageProps };

		const memberProps = { ...statisticsProps, employeeIds: memberIds };
		const reportMemberProps = withResolvedMemberIds(memberProps, managedMemberIds);

		return { statisticsProps, reportProps: reportMemberProps };
	}, [mergedProps, statisticsTeamId, userManagedTeams, isManage, isOrganizationWideViewer]);
}
