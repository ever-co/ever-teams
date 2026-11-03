'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useActivityFilters } from '@/core/hooks/activities/use-activity-filters';
import { useTeamDashboardStatisticsProps } from '@/core/hooks/activities/use-team-dashboard-statistics-props';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { useAreTeamsSettled } from '@/core/hooks/organizations/teams/use-are-teams-settled';
import { useTeamManagerRole } from '@/core/hooks/organizations/teams/use-team-member';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { type Period, periodLengthInDays, periodOfPreset } from '@/core/lib/utils/dashboard-period';
import {
	type ChartGranularity,
	chartBucketsOf,
	columnStacksOf,
	DEFAULT_TEAM_SORTS,
	daySortValueOf,
	daySummariesOf,
	isOrganizationWideRole,
	isTenantAdminRole,
	memberColumnStacksOf,
	memberSeriesOf,
	memberSortValueOf,
	memberSummariesOf,
	membersOfTeams,
	nextSortOf,
	periodAllowsRegrouping,
	periodSpansMonths,
	projectSeriesOf,
	projectSharesOf,
	rosterDaysOf,
	rosterMembersOf,
	scopeMemberCountOf,
	sortedBy,
	TEAM_WEEK_STARTS_ON,
	type TeamFigureKey,
	type TeamFilterField,
	teamReportScopeOf,
	type TeamSortKey,
	type TeamTableView,
	teamTotalsOf,
	hasProjectTime,
	userIdsByEmployeeOf
} from '@/core/lib/utils/dashboards/team';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { TOrganizationTeam } from '@/core/types/schemas';
import { useTeamDailyReportQuery, useTeamStatisticsQuery } from './use-team-report-queries';
import { useTeamLiveBoard } from './use-team-live-board';

const SECONDS_PER_HOUR = 3600;

export type TeamFilters = Record<TeamFilterField, string[]>;

const NO_FILTERS: TeamFilters = { teams: [], members: [] };

const NO_REPORT: ITimeLogGroupedDailyReport[] = [];

function defaultPeriod(): Period {
	return periodOfPreset('last7Days', TEAM_WEEK_STARTS_ON);
}

function pageTeamOf(
	teams: ReadonlyArray<TOrganizationTeam>,
	routeTeamId: string | undefined,
	activeTeam: TOrganizationTeam | null
) {
	const routeTeam = teams.find((team) => team.id === routeTeamId);
	return routeTeam ?? activeTeam ?? null;
}

function granularityOptionsOf(period: Period): ChartGranularity[] {
	const periodDays = periodLengthInDays(period);
	if (!periodAllowsRegrouping(periodDays)) {
		return [];
	}
	const options: ChartGranularity[] = ['day', 'week'];
	if (periodSpansMonths(period)) {
		options.push('month');
	}
	return options;
}

function effectiveGranularityOf(picked: ChartGranularity, options: ReadonlyArray<ChartGranularity>) {
	if (options.includes(picked)) {
		return picked;
	}
	return 'day';
}

/** A plain member's requests always carry their own employee id; only managers pick members. */
function pickedEmployeeIdsOf(canManage: boolean, pickedMemberIds: string[], ownEmployeeIds: string[]) {
	if (canManage) {
		return pickedMemberIds;
	}
	return ownEmployeeIds;
}

function standardDaySecondsOf(hours: number | undefined) {
	const hasStandardDay = typeof hours === 'number' && hours > 0;
	if (!hasStandardDay) {
		return undefined;
	}
	return hours * SECONDS_PER_HOUR;
}

/**
 * Everything the team dashboard shows, from page state only: the period, the team and member picks, the figure the
 * chart draws and the table's view and order. The picks never touch the global filter atoms, so they cannot leak
 * into another report; every id a request carries is in its query key.
 */
export function useTeamDashboard({ routeTeamId }: Readonly<{ routeTeamId?: string }>) {
	const { user, isManage, mergedProps, enabled } = useActivityFilters();
	const organizationTeams = useAtomValue(organizationTeamsState);
	const activeTeam = useAtomValue(activeTeamState);
	const currentOrganization = useAtomValue(currentOrganizationState);
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const areTeamsSettled = useAreTeamsSettled();

	const [period, setPeriod] = useState<Period>(defaultPeriod);
	const [filters, setFilters] = useState<TeamFilters>(NO_FILTERS);
	const [view, setView] = useState<TeamTableView>('member');
	const [figure, setFigure] = useState<TeamFigureKey>('tracked');
	const [pickedGranularity, setGranularity] = useState<ChartGranularity>('day');
	const [sorts, setSorts] = useState(DEFAULT_TEAM_SORTS);

	const canManage = Boolean(isManage);
	const isOrganizationWide = isOrganizationWideRole(user?.role?.name);
	const pageTeam = pageTeamOf(organizationTeams, routeTeamId, activeTeam);

	const teamOptions = useMemo(() => {
		if (isOrganizationWide) {
			return organizationTeams;
		}
		return userManagedTeams;
	}, [isOrganizationWide, organizationTeams, userManagedTeams]);

	const memberOptions = useMemo(() => {
		if (!canManage) {
			return [];
		}
		return membersOfTeams(teamOptions, filters.teams);
	}, [canManage, filters.teams, teamOptions]);

	const startDate = localDayKeyOf(period.from);
	const endDate = localDayKeyOf(period.to);

	const reportProps = useMemo(() => {
		if (!mergedProps) {
			return null;
		}
		const scope = teamReportScopeOf({
			isManage: canManage,
			isOrganizationWide,
			pickedTeamIds: filters.teams,
			pickedMemberIds: filters.members,
			pageTeamId: pageTeam?.id ?? null,
			managedTeams: userManagedTeams,
			ownEmployeeIds: mergedProps.employeeIds
		});
		return {
			...mergedProps,
			startDate,
			endDate,
			teamIds: scope.teamIds,
			employeeIds: scope.employeeIds,
			selectedTeamIds: scope.teamIds,
			selectedEmployeeIds: scope.employeeIds
		};
	}, [
		canManage,
		endDate,
		filters.members,
		filters.teams,
		isOrganizationWide,
		mergedProps,
		pageTeam?.id,
		startDate,
		userManagedTeams
	]);

	const pickedProps = useMemo(() => {
		if (!mergedProps) {
			return null;
		}
		const pickedEmployeeIds = pickedEmployeeIdsOf(canManage, filters.members, mergedProps.employeeIds);
		return {
			...mergedProps,
			startDate,
			endDate,
			teamIds: filters.teams,
			employeeIds: pickedEmployeeIds,
			selectedTeamIds: filters.teams,
			selectedEmployeeIds: filters.members
		};
	}, [canManage, endDate, filters.members, filters.teams, mergedProps, startDate]);

	const { statisticsProps } = useTeamDashboardStatisticsProps({
		mergedProps: pickedProps,
		isManage,
		routeTeamId
	});

	// Both scopes come from the teams (the counts' page team, a manager's members), unknown until the teams arrive:
	// asking before would read each report twice. An organization-wide role reads the report without them.
	const isReportScopeSettled = isOrganizationWide || areTeamsSettled;
	const isReportEnabled = enabled && isReportScopeSettled;
	const isStatisticsEnabled = enabled && areTeamsSettled;
	const reportQuery = useTeamDailyReportQuery(reportProps, isReportEnabled);
	const statisticsQuery = useTeamStatisticsQuery(statisticsProps, isStatisticsEnabled);

	const report = reportQuery.data;
	const rows = useMemo(() => flattenDailyReport(report ?? []), [report]);
	const totals = useMemo(() => teamTotalsOf(rows), [rows]);

	const members = useMemo(() => {
		const summaries = memberSummariesOf(rows, totals.seconds);
		return sortedBy(summaries, sorts.member, memberSortValueOf);
	}, [rows, sorts.member, totals.seconds]);

	const days = useMemo(() => {
		const summaries = daySummariesOf(rows, totals.seconds);
		return sortedBy(summaries, sorts.day, daySortValueOf);
	}, [rows, sorts.day, totals.seconds]);

	const projectShares = useMemo(() => projectSharesOf(rows), [rows]);

	// The chart is cut on the period its rows belong to: while the next period loads, the previous rows stay on
	// screen and must keep their own days instead of landing in empty slots of the new period.
	const isReportSettled = reportQuery.isSuccess && !reportQuery.isPlaceholderData;
	const [chartPeriod, setChartPeriod] = useState<Period>(period);
	const isChartPeriodBehind = isReportSettled && chartPeriod !== period;
	if (isChartPeriodBehind) {
		setChartPeriod(period);
	}

	const granularityOptions = useMemo(() => granularityOptionsOf(chartPeriod), [chartPeriod]);
	const granularity = effectiveGranularityOf(pickedGranularity, granularityOptions);
	const buckets = useMemo(() => chartBucketsOf(rows, chartPeriod, granularity), [chartPeriod, granularity, rows]);

	const series = useMemo(() => projectSeriesOf(rows), [rows]);
	const columnStacks = useMemo(
		() => columnStacksOf(rows, buckets, granularity, series),
		[buckets, granularity, rows, series]
	);
	const userIds = useMemo(
		() => userIdsByEmployeeOf(report ?? NO_REPORT, organizationTeams),
		[organizationTeams, report]
	);
	const rosterMembers = useMemo(
		() => rosterMembersOf(rows, members, buckets, granularity, userIds),
		[buckets, granularity, members, rows, userIds]
	);
	const rosterDays = useMemo(() => rosterDaysOf(rows, days, series), [days, rows, series]);

	const memberSeries = useMemo(() => memberSeriesOf(rows), [rows]);
	const memberColumnStacks = useMemo(
		() => memberColumnStacksOf(rows, buckets, granularity, memberSeries),
		[buckets, granularity, memberSeries, rows]
	);
	const hasProjectSplit = hasProjectTime(series);
	const live = useTeamLiveBoard({ rows, pickedMemberIds: filters.members, authUserId: user?.id ?? null });

	const { isTeamManager } = useTeamManagerRole(user?.id);
	const isTenantAdmin = isTenantAdminRole(user?.role?.name);
	const canOpenTimesheets = isTeamManager || isTenantAdmin;

	const scopeMemberCount = useMemo(
		() =>
			scopeMemberCountOf({
				isManage: canManage,
				isOrganizationWide,
				pickedTeamIds: filters.teams,
				pickedMemberIds: filters.members,
				pageTeamId: pageTeam?.id ?? null,
				teams: teamOptions,
				managedTeams: userManagedTeams
			}),
		[canManage, filters.members, filters.teams, isOrganizationWide, pageTeam?.id, teamOptions, userManagedTeams]
	);

	const standardDaySeconds = standardDaySecondsOf(currentOrganization?.standardWorkHoursPerDay);
	const isOnePerson = totals.memberCount === 1;
	const isDailyTrackedChart = figure === 'tracked' && granularity === 'day';
	const showsStandardDay = isOnePerson && isDailyTrackedChart;
	let limitSeconds: number | undefined;
	if (showsStandardDay) {
		limitSeconds = standardDaySeconds;
	}

	const setFilter = useCallback(
		(field: TeamFilterField, values: string[]) => {
			setFilters((current) => {
				if (field === 'members') {
					return { ...current, members: values };
				}
				const availableMembers = membersOfTeams(teamOptions, values);
				const availableEmployeeIds = availableMembers.map((person) => person.employeeId);
				const availableIds = new Set(availableEmployeeIds);
				const keptMembers = current.members.filter((employeeId) => availableIds.has(employeeId));
				return { teams: values, members: keptMembers };
			});
		},
		[teamOptions]
	);

	const removeFilterValue = useCallback(
		(field: TeamFilterField, value: string) => {
			const remaining = filters[field].filter((current) => current !== value);
			setFilter(field, remaining);
		},
		[filters, setFilter]
	);

	const clearFilters = useCallback(() => setFilters(NO_FILTERS), []);

	const toggleSort = useCallback(
		(key: TeamSortKey) => {
			setSorts((current) => {
				const nextSort = nextSortOf(current[view], key, view);
				return { ...current, [view]: nextSort };
			});
		},
		[view]
	);

	const refetchReport = useCallback(() => void reportQuery.refetch(), [reportQuery]);
	const refetchStatistics = useCallback(() => void statisticsQuery.refetch(), [statisticsQuery]);

	const hasReport = Boolean(report);
	const hasCounts = Boolean(statisticsQuery.data);
	const hasFilters = filters.teams.length > 0 || filters.members.length > 0;
	const isReportUpdating = reportQuery.isFetching && hasReport;
	const isCountsUpdating = statisticsQuery.isFetching && hasCounts;

	return {
		user,
		canManage,
		areTeamsSettled,
		pageTeam,
		period,
		chartPeriod,
		setPeriod,
		view,
		setView,
		figure,
		setFigure,
		granularity,
		granularityOptions,
		setGranularity,
		filters,
		setFilter,
		removeFilterValue,
		clearFilters,
		hasFilters,
		teamOptions,
		memberOptions,
		sort: sorts[view],
		toggleSort,
		rows,
		totals,
		members,
		days,
		projectShares,
		buckets,
		series,
		columnStacks,
		rosterMembers,
		rosterDays,
		memberSeries,
		memberColumnStacks,
		hasProjectSplit,
		live,
		canOpenTimesheets,
		scopeMemberCount,
		limitSeconds,
		counts: statisticsQuery.data ?? null,
		isCountsLoading: statisticsQuery.isPending && enabled,
		isCountsError: statisticsQuery.isError && !hasCounts,
		refetchStatistics,
		hasReport,
		isReportLoading: reportQuery.isPending && enabled,
		isReportError: reportQuery.isError && !hasReport,
		isRefreshing: reportQuery.isPlaceholderData || statisticsQuery.isPlaceholderData,
		isUpdating: isReportUpdating || isCountsUpdating,
		refetchReport
	};
}

export type TeamDashboardState = ReturnType<typeof useTeamDashboard>;
