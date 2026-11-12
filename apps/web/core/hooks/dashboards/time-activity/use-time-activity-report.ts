'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { getReportMemberIds, managesEveryTeam } from '@/core/hooks/activities/use-activity-filters';
import { useClientsQuery } from '@/core/hooks/clients/use-clients-query';
import { useReportProjectClients } from '@/core/hooks/dashboards/use-report-clients';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { clientNamesOf } from '@/core/lib/utils/clients';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { daysOfPeriod, type Period, periodOfPreset } from '@/core/lib/utils/dashboard-period';
import {
	activityPercentOf,
	type DailyReportRow,
	dayFiguresOf,
	flattenDailyReport
} from '@/core/lib/utils/daily-report-figures';
import { filterDailyReportByClients, isBillableOnly } from '@/core/lib/utils/dashboards/report-filters';
import {
	type ChartDayLabels,
	type ClientOfProjectLog,
	type ReportTotals,
	TIME_ACTIVITY_WEEK_START,
	type TimeActivityFilters,
	type TimeActivityRow,
	breakdownGroupingOf,
	chartDaysOf,
	clientOfProjectLogOf,
	clientRowsOf,
	reportGroupsOf,
	reportTotalsOf,
	tableGroupingOf,
	todayKeyOf
} from '@/core/lib/utils/dashboards/time-activity';
import { ERoleName } from '@/core/types/generics/enums/role';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import type { TOrganizationTeam, TUser } from '@/core/types/schemas';
import {
	type TimeActivityRequest,
	useTimeActivityCountsQuery,
	useTimeActivityDailyQuery
} from './use-time-activity-queries';
import { useTimeActivitySettings } from './use-time-activity-settings';
import type { WeekDailySource } from './use-time-activity-week';

const MANAGING_ROLES: ReadonlySet<string> = new Set([ERoleName.SUPER_ADMIN, ERoleName.MANAGER, ERoleName.ADMIN]);

const EMPTY_REPORT: ITimeLogGroupedDailyReport[] = [];

interface ReportAccess {
	isManager: boolean;
	isOrganizationWide: boolean;
	managedTeams: TOrganizationTeam[];
}

function hasOrganizationWideRole(user: TUser | null | undefined) {
	const roleName = user?.role?.name ?? '';
	return MANAGING_ROLES.has(roleName);
}

/** The rule of the previous page: organisation roles, or a manager of a team, see everyone's figures and earnings. */
function canManageReport(user: TUser | null | undefined, isTeamManager: boolean) {
	const hasManagingRole = hasOrganizationWideRole(user);
	return hasManagingRole || isTeamManager;
}

/**
 * Gauzy reads only the caller's own logs when a team manager names no employee, while the counts resolve the
 * members from the teams: the active members of the applied teams are named when the manager manages all of them.
 */
function appliedTeamMemberIdsOf(teamIds: string[], managedTeams: TOrganizationTeam[]) {
	const hasAppliedTeams = teamIds.length > 0;
	if (!hasAppliedTeams) {
		return [];
	}
	const managesAppliedTeams = managesEveryTeam(managedTeams, teamIds);
	if (!managesAppliedTeams) {
		return [];
	}
	return getReportMemberIds(managedTeams, teamIds);
}

function defaultPeriodOf() {
	return periodOfPreset('last7Days', TIME_ACTIVITY_WEEK_START);
}

/** A manager sends the members they picked (none means everyone they may see); anyone else only themself. */
function employeeIdsOf(filters: TimeActivityFilters, access: ReportAccess, ownEmployeeId: string | undefined) {
	if (!access.isManager) {
		if (!ownEmployeeId) {
			return [];
		}
		return [ownEmployeeId];
	}
	const hasPickedMembers = filters.employeeIds.length > 0;
	if (hasPickedMembers) {
		return filters.employeeIds;
	}
	if (access.isOrganizationWide) {
		return filters.employeeIds;
	}
	return appliedTeamMemberIdsOf(filters.teamIds, access.managedTeams);
}

function requestOf(
	user: TUser | null | undefined,
	period: Period,
	filters: TimeActivityFilters,
	access: ReportAccess
): TimeActivityRequest | null {
	const organizationId = user?.employee?.organizationId;
	const tenantId = user?.tenantId;
	const hasScope = Boolean(organizationId) && Boolean(tenantId);
	if (!hasScope) {
		return null;
	}
	return {
		tenantId: tenantId ?? '',
		organizationId: organizationId ?? '',
		startDate: localDayKeyOf(period.from),
		endDate: localDayKeyOf(period.to),
		timeZone: getDefaultTimezone(),
		employeeIds: employeeIdsOf(filters, access, user?.employee?.id),
		teamIds: filters.teamIds,
		projectIds: filters.projectIds,
		taskIds: filters.taskIds,
		includeTimeWithoutTeam: true,
		billableOnly: isBillableOnly(filters.billable)
	};
}

function visibleRowsOf<T extends DailyReportRow>(rows: T[], isManager: boolean, ownEmployeeId: string | undefined) {
	if (isManager) {
		return rows;
	}
	return rows.filter((row) => row.employeeId === ownEmployeeId);
}

function rowsOfReport(
	report: ReadonlyArray<ITimeLogGroupedDailyReport>,
	withoutTeamLabel: string,
	clientOf: ClientOfProjectLog | null
): TimeActivityRow[] {
	if (!clientOf) {
		return flattenDailyReport(report, withoutTeamLabel);
	}
	return clientRowsOf(report, clientOf, withoutTeamLabel);
}

function axisFormatOptionsOf(dayCount: number): Intl.DateTimeFormatOptions {
	if (dayCount <= 7) {
		return { weekday: 'short' };
	}
	return { day: 'numeric' };
}

function chartLabelsOf(locale: string, dayCount: number): ChartDayLabels {
	const labelFormat = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' });
	const axisFormat = new Intl.DateTimeFormat(locale, axisFormatOptionsOf(dayCount));
	return {
		label: (day) => labelFormat.format(day),
		axisLabel: (day) => axisFormat.format(day)
	};
}

export interface TimeActivityFigures {
	/** `null` when the figure could not be read: the strip writes "–". */
	trackedSeconds: number | null;
	/** Every log type, from the daily report the chart and the breakdown read; `null` until it is loaded. */
	reportSeconds: number | null;
	activityPercent: number | null;
	totals: ReportTotals;
}

type CountedFigures = Omit<TimeActivityFigures, 'reportSeconds'>;

function reportSecondsOf(totals: ReportTotals, hasDailyReport: boolean) {
	if (!hasDailyReport) {
		return null;
	}
	return totals.seconds;
}

/**
 * Tracked time and activity come from Gauzy's counts (timer logs only), as before. The counts endpoint filters
 * neither by task nor by billable time and knows nothing of a client, so with one of these filters on both figures
 * are summed from the rows of the daily report, which hold exactly the filtered time.
 */
function countedFiguresOf(
	totals: ReportTotals,
	counts: ITimesheetCountsStatistics | null | undefined,
	sumsFromRows: boolean,
	hasDailyReport: boolean
): CountedFigures {
	if (sumsFromRows) {
		return figuresFromRows(totals, hasDailyReport);
	}
	if (!counts) {
		return { trackedSeconds: null, activityPercent: null, totals };
	}
	return { trackedSeconds: counts.weekDuration ?? 0, activityPercent: counts.weekActivities ?? 0, totals };
}

function figuresOf(
	totals: ReportTotals,
	counts: ITimesheetCountsStatistics | null | undefined,
	sumsFromRows: boolean,
	hasDailyReport: boolean
): TimeActivityFigures {
	const counted = countedFiguresOf(totals, counts, sumsFromRows, hasDailyReport);
	const reportSeconds = reportSecondsOf(totals, hasDailyReport);
	return { ...counted, reportSeconds };
}

function figuresFromRows(totals: ReportTotals, hasDailyReport: boolean): CountedFigures {
	if (!hasDailyReport) {
		return { trackedSeconds: null, activityPercent: null, totals };
	}
	return { trackedSeconds: totals.seconds, activityPercent: activityPercentOf(totals), totals };
}

export function useTimeActivityReport() {
	const t = useTranslations();
	const locale = useLocale();
	const { user, isTeamManager } = useAuthenticateUser();
	const isManager = canManageReport(user, Boolean(isTeamManager));
	const isOrganizationWide = hasOrganizationWideRole(user);
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const ownEmployeeId = user?.employee?.id;
	const settings = useTimeActivitySettings();
	const [period, setPeriod] = useState<Period>(defaultPeriodOf);

	const request = useMemo(() => {
		const access: ReportAccess = { isManager, isOrganizationWide, managedTeams: userManagedTeams };
		return requestOf(user, period, settings.filters, access);
	}, [isManager, isOrganizationWide, period, settings.filters, user, userManagedTeams]);

	const dailyQuery = useTimeActivityDailyQuery(request);
	const countsQuery = useTimeActivityCountsQuery(request);
	const pickedClients = settings.filters.clientIds;
	const hasTaskFilter = settings.filters.taskIds.length > 0;
	const hasClientFilter = pickedClients.length > 0;
	const billableOnly = isBillableOnly(settings.filters.billable);
	const sumsFiguresFromRows = hasTaskFilter || hasClientFilter || billableOnly;
	const isClientGrouping = settings.grouping === 'client';
	const needsProjectClients = hasClientFilter || isClientGrouping;
	const projectClients = useReportProjectClients({ includesArchived: false, isEnabled: needsProjectClients });
	const projectClientIds = projectClients.clientIds;
	const isClientGroupingGranted = settings.clientGroupingAccess === 'granted';
	const readsClientNames = isClientGrouping && isClientGroupingGranted;
	const clientsQuery = useClientsQuery({ includeArchived: true, enabled: readsClientNames });
	const clientNames = useMemo(() => clientNamesOf(clientsQuery.clients), [clientsQuery.clients]);
	// The daily report names no client beside a project whose client is archived: only the listed projects tell that
	// time from the time without a client, and only the clients list names that client, so a report filtered or
	// grouped by client is not shown before they are read
	const isProjectLookupPending = needsProjectClients && projectClients.isPending;
	const isProjectLookupError = needsProjectClients && projectClients.isError;
	const isClientAccessUnknown = settings.clientGroupingAccess === 'unknown';
	const isClientAccessPending = isClientGrouping && isClientAccessUnknown;
	const isClientNamesFailure = clientsQuery.isError && !clientsQuery.isLoaded;
	const isClientNamesError = readsClientNames && isClientNamesFailure;
	const isClientNamesMissing = !clientsQuery.isLoaded && !clientsQuery.isError;
	const isClientNamesPending = readsClientNames && isClientNamesMissing;
	const isClientLookupPending = isProjectLookupPending || isClientAccessPending || isClientNamesPending;
	const isClientLookupError = isProjectLookupError || isClientNamesError;
	const canTellClients = !isClientLookupPending && !isClientLookupError;
	const loadedReport = dailyQuery.data ?? EMPTY_REPORT;
	const report = useMemo(() => {
		if (!canTellClients) {
			return EMPTY_REPORT;
		}
		return filterDailyReportByClients(loadedReport, pickedClients, projectClientIds);
	}, [canTellClients, loadedReport, pickedClients, projectClientIds]);
	const hasDailyData = dailyQuery.data !== undefined;
	const hasDailyReport = hasDailyData && canTellClients;

	const clientOfProjectLog = useMemo<ClientOfProjectLog | null>(() => {
		const tellsClients = isClientGrouping && canTellClients;
		if (!tellsClients) {
			return null;
		}
		return clientOfProjectLogOf(projectClientIds, clientNames);
	}, [canTellClients, clientNames, isClientGrouping, projectClientIds]);

	const withoutTeamLabel = t('dashboard.NO_TEAM_GROUP');
	const rows = useMemo(() => {
		const allRows = rowsOfReport(report, withoutTeamLabel, clientOfProjectLog);
		return visibleRowsOf(allRows, isManager, ownEmployeeId);
	}, [clientOfProjectLog, isManager, ownEmployeeId, report, withoutTeamLabel]);

	const totals = useMemo(() => reportTotalsOf(rows), [rows]);

	const chartDays = useMemo(() => {
		const days = daysOfPeriod(period);
		const labels = chartLabelsOf(locale, days.length);
		return chartDaysOf(days, dayFiguresOf(rows), todayKeyOf(), labels);
	}, [locale, period, rows]);

	const tableGrouping = tableGroupingOf(settings.grouping);
	const breakdownGrouping = breakdownGroupingOf(settings.grouping);
	const groups = useMemo(() => reportGroupsOf(rows, tableGrouping), [rows, tableGrouping]);

	const figures = useMemo(
		() => figuresOf(totals, countsQuery.data, sumsFiguresFromRows, hasDailyReport),
		[countsQuery.data, hasDailyReport, sumsFiguresFromRows, totals]
	);

	const isDailyFailure = dailyQuery.isError && !hasDailyData;
	const isDailyError = isDailyFailure || isClientLookupError;
	const isWaitingForDaily = dailyQuery.isPending || isClientLookupPending;
	const isDailyPending = isWaitingForDaily && !isDailyError;
	const needsCounts = !sumsFiguresFromRows;
	const isCountsPending = needsCounts && countsQuery.isPending;
	const isFiguresLoading = isDailyPending || isCountsPending;
	const hasCounts = countsQuery.data !== undefined;
	const isCountsFailure = countsQuery.isError && !hasCounts;
	const isCountsError = needsCounts && isCountsFailure;
	const isDailyUpdating = dailyQuery.isFetching && hasDailyReport;
	const isCountsUpdating = countsQuery.isFetching && hasCounts;
	const isUpdating = isDailyUpdating || isCountsUpdating;

	const { refetch: refetchDailyReport } = dailyQuery;
	const { refetch: refetchProjectClients } = projectClients;
	const { refetch: refetchClientNames } = clientsQuery;
	const refetchDaily = useCallback(() => {
		void refetchDailyReport();
		if (isProjectLookupError) {
			refetchProjectClients();
		}
		if (isClientNamesError) {
			void refetchClientNames();
		}
	}, [isClientNamesError, isProjectLookupError, refetchClientNames, refetchDailyReport, refetchProjectClients]);
	// The weekly report has no project in its rows: with a client picked, the week grid is built from these rows
	const weekDailySource = useMemo<WeekDailySource | null>(() => {
		if (!hasClientFilter) {
			return null;
		}
		return { rows, isLoading: isDailyPending, isError: isDailyError, refetch: () => void refetchDaily() };
	}, [hasClientFilter, isDailyError, isDailyPending, refetchDaily, rows]);

	return {
		user,
		isManager,
		ownEmployeeId,
		settings,
		period,
		setPeriod,
		request,
		report,
		clientOfProjectLog,
		rows,
		totals,
		chartDays,
		tableGrouping,
		breakdownGrouping,
		groups,
		figures,
		hasTaskFilter,
		weekDailySource,
		isDailyPending,
		isFiguresLoading,
		isDailyError,
		isCountsError,
		isUpdating,
		refetchDaily,
		refetchCounts: countsQuery.refetch
	};
}

export type TimeActivityReport = ReturnType<typeof useTimeActivityReport>;
