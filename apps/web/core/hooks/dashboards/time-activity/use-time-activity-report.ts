'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { getReportMemberIds, managesEveryTeam } from '@/core/hooks/activities/use-activity-filters';
import { useClientsQuery } from '@/core/hooks/clients/use-clients-query';
import { useReportProjectClients } from '@/core/hooks/dashboards/use-report-clients';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { useProjectClientRates } from '@/core/hooks/organizations/rates/use-project-client-rates';
import { useBillingOrganization } from '@/core/hooks/organizations/rates/use-billing-organization';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { clientNamesOf } from '@/core/lib/utils/clients';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { daysOfPeriod, isSamePeriod, type Period, periodOfPreset } from '@/core/lib/utils/dashboard-period';
import {
	activityPercentOf,
	type DailyReportRow,
	dayFiguresOf,
	flattenDailyReport
} from '@/core/lib/utils/daily-report-figures';
import { filterDailyReportByClients, isBillableOnly } from '@/core/lib/utils/dashboards/report-filters';
import { NO_LABEL_VALUE } from '@/core/lib/utils/time-log-labels';
import {
	type ChartDayLabels,
	type BillableFigures,
	type BreakdownFact,
	type ClientOfProjectLog,
	type ReportTotals,
	TIME_ACTIVITY_WEEK_START,
	type TimeActivityFilters,
	type TimeActivityRow,
	billableFiguresOfFacts,
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
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import { durationRoundingRuleOf } from '@/core/lib/utils/duration-rounding';
import { roundedDailyReportOf } from '@/core/lib/utils/dashboards/time-activity-rounding';
import {
	billableFactsOf,
	billableProjectIdsOf,
	keptPriceOfRow,
	pricedProjectIdOf
} from '@/core/lib/utils/dashboards/time-activity-billable';
import { linePriceOf } from '@/core/lib/utils/invoices';
import { defaultBillRateOf, holdsRateAdminPermission, storesDefaultBillRate } from '@/core/lib/utils/rates';
import { canEditWorkspace } from '@/core/lib/utils/settings-workspace';
import {
	type TimeActivityRequest,
	useTimeActivityBreaksQuery,
	useTimeActivityCountsQuery,
	useTimeActivityDailyQuery
} from './use-time-activity-queries';
import { useBreaksAllowed } from '@/core/hooks/timer/use-breaks-allowed';
import { useHiddenProjectLabels } from '@/core/hooks/organizations/projects/use-hidden-project-labels';
import type { HiddenProjectLabels } from '@/core/lib/utils/project-visibility';
import { useTimeActivitySettings } from './use-time-activity-settings';
import type { WeekDailySource } from './use-time-activity-week';

const MANAGING_ROLES: ReadonlySet<string> = new Set([ERoleName.SUPER_ADMIN, ERoleName.MANAGER, ERoleName.ADMIN]);

const EMPTY_REPORT: ITimeLogGroupedDailyReport[] = [];

const NO_BILLABLE_FACTS: BreakdownFact[] = [];

interface ReportAccess {
	isManager: boolean;
	isOrganizationWide: boolean;
	managedTeams: TOrganizationTeam[];
}

function hasOrganizationWideRole(user: TUser | null | undefined) {
	const roleName = user?.role?.name ?? '';
	return MANAGING_ROLES.has(roleName);
}

/**
 * The breaks figure from its read: none where breaks are not read or while the read loads, `null` once it failed, so a
 * failed read never looks like a period without breaks.
 */
function breakSecondsShownOf(
	readsBreaks: boolean,
	query: { data?: number; isError: boolean }
): number | null | undefined {
	if (!readsBreaks) {
		return undefined;
	}
	if (query.data !== undefined) {
		return query.data;
	}
	if (query.isError) {
		return null;
	}
	return undefined;
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

/** The entry Labels filter as the daily report takes it: the labels picked, and "No label" as `untagged`. */
function entryLabelFiltersOf(picked: ReadonlyArray<string>): { tagIds?: string[]; untagged?: boolean } {
	if (picked.length === 0) {
		return {};
	}
	const tagIds = picked.filter((value) => value !== NO_LABEL_VALUE);
	const untagged = picked.includes(NO_LABEL_VALUE);
	return { tagIds, untagged };
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
		billableOnly: isBillableOnly(filters.billable),
		...entryLabelFiltersOf(filters.entryLabels)
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
	workspaceCurrency: string | null,
	clientOf: ClientOfProjectLog | null,
	hiddenProjectLabels: HiddenProjectLabels
): TimeActivityRow[] {
	if (!clientOf) {
		return flattenDailyReport(report, withoutTeamLabel, workspaceCurrency, hiddenProjectLabels);
	}
	return clientRowsOf(report, clientOf, withoutTeamLabel, workspaceCurrency, hiddenProjectLabels);
}

/**
 * The same read, of billable time only, with the client rates each entry keeps: none for a role that may not read
 * client rates, which price it.
 */
function billableRequestOf(request: TimeActivityRequest | null, readsBillable: boolean): TimeActivityRequest | null {
	if (!request) {
		return null;
	}
	if (!readsBillable) {
		return null;
	}
	return { ...request, billableOnly: true, withClientRates: true };
}

/** What the billable time of the period bills, the facts each breakdown row adds up, and how far they are read. */
export interface TimeActivityBillable {
	/** Only a role that may read client rates sees amounts priced at them. */
	isOffered: boolean;
	facts: BreakdownFact[];
	figures: BillableFigures;
	isPending: boolean;
	isError: boolean;
	/** Time no rate prices can be priced at the workspace's default, which this reader may set. */
	canSetDefaultRate: boolean;
	refetch: () => void;
}

function axisFormatOptionsOf(dayCount: number): Intl.DateTimeFormatOptions {
	if (dayCount <= 7) {
		return { weekday: 'short' };
	}
	return { day: 'numeric' };
}

function chartLabelsOf(locale: FormatLocale, dayCount: number): ChartDayLabels {
	const labelFormat = dateFormatOf(locale, { weekday: 'long', month: 'short', day: 'numeric' });
	const axisFormat = dateFormatOf(locale, axisFormatOptionsOf(dayCount));
	return {
		label: (day) => labelFormat.format(day),
		axisLabel: (day) => axisFormat.format(day)
	};
}

export interface TimeActivityFigures {
	/** `null` when the figure could not be read: the strip writes "–". */
	trackedSeconds: number | null;
	/**
	 * The time on breaks (#5216), beside the worked time: absent where breaks are off, not read or still loading, `null`
	 * when the read failed (the band writes "–" then, never a period without breaks).
	 */
	breakSeconds?: number | null;
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

interface ClientLookupInput {
	hasClientFilter: boolean;
	isClientGrouping: boolean;
	needsProjectClients: boolean;
	readsClientNames: boolean;
	isClientAccessUnknown: boolean;
	projects: { isPending: boolean; isError: boolean };
	names: { isLoaded: boolean; isError: boolean };
}

/**
 * The daily report names no client beside a project whose client is archived: only the listed projects tell that
 * time from the time without a client, so a report filtered by client is not shown before they are read. Grouped by
 * client, only the table needs them: it waits for the projects and the clients' names, the band and the chart do
 * not, and a client the clients list could not name keeps the name the report gives it.
 */
function clientLookupStateOf(input: ClientLookupInput) {
	const { hasClientFilter, isClientGrouping, needsProjectClients, readsClientNames, projects, names } = input;
	const isProjectLookupPending = needsProjectClients && projects.isPending;
	const isProjectLookupError = needsProjectClients && projects.isError;
	const isClientAccessPending = isClientGrouping && input.isClientAccessUnknown;
	const isClientNamesFailure = names.isError && !names.isLoaded;
	const isClientNamesMissing = !names.isLoaded && !names.isError;
	const isClientNamesPending = readsClientNames && isClientNamesMissing;
	const isFilterLookupPending = hasClientFilter && isProjectLookupPending;
	const isFilterLookupError = hasClientFilter && isProjectLookupError;
	const isClientLookupPending = isProjectLookupPending || isClientAccessPending || isClientNamesPending;
	const isClientRowsPending = isClientGrouping && isClientLookupPending;
	const isClientRowsError = isClientGrouping && isProjectLookupError;
	return {
		isProjectLookupError,
		isClientNamesError: readsClientNames && isClientNamesFailure,
		isFilterLookupPending,
		isFilterLookupError,
		canFilterByClients: !isFilterLookupPending && !isFilterLookupError,
		isClientRowsPending,
		isClientRowsError,
		canTellRowClients: !isClientRowsPending && !isClientRowsError
	};
}

/**
 * The period the daily rows on screen were read for. While another period is read, the previous rows stay on screen
 * (placeholder data): drawn on the next period's days, none of them would fall on a day and the chart would say no
 * time was tracked (#5342). The requested period once its own rows are there.
 *
 * Only a period's own answer settles it: a read that failed without rows does not, since its retry shows the last
 * answered rows again as placeholder data.
 */
function useShownPeriod(period: Period, isShowingPreviousRows: boolean, hasRows: boolean): Period {
	const [settledPeriod, setSettledPeriod] = useState(period);
	const isOwnAnswer = hasRows && !isShowingPreviousRows;
	if (isOwnAnswer && !isSamePeriod(settledPeriod, period)) {
		setSettledPeriod(period);
	}
	if (isShowingPreviousRows) {
		return settledPeriod;
	}
	return period;
}

export function useTimeActivityReport() {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const { user, isTeamManager } = useAuthenticateUser();
	const isManager = canManageReport(user, Boolean(isTeamManager));
	const isOrganizationWide = hasOrganizationWideRole(user);
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const ownEmployeeId = user?.employee?.id;
	const settings = useTimeActivitySettings();
	const [defaultPeriod] = useState<Period>(defaultPeriodOf);
	const { linkedPeriod, holdsView, setPeriod: writePeriod } = settings;
	const period = linkedPeriod ?? defaultPeriod;

	// A visit whose link names no period writes its view into the link at once, so its address can be copied
	useEffect(() => {
		if (holdsView) {
			return;
		}
		writePeriod(defaultPeriod);
	}, [defaultPeriod, holdsView, writePeriod]);

	const setPeriod = useCallback((nextPeriod: Period) => writePeriod(nextPeriod), [writePeriod]);

	const request = useMemo(() => {
		const access: ReportAccess = { isManager, isOrganizationWide, managedTeams: userManagedTeams };
		return requestOf(user, period, settings.filters, access);
	}, [isManager, isOrganizationWide, period, settings.filters, user, userManagedTeams]);

	const dailyQuery = useTimeActivityDailyQuery(request);
	const countsQuery = useTimeActivityCountsQuery(request);
	const organization = useAtomValue(currentOrganizationState);
	// The workspace rounds each entry: its rows, figures, chart, table and exports all show rounded time
	const roundingRule = useMemo(() => durationRoundingRuleOf(organization), [organization]);
	const isRounding = roundingRule !== null;
	const pickedClients = settings.filters.clientIds;
	const hasTaskFilter = settings.filters.taskIds.length > 0;
	const hasClientFilter = pickedClients.length > 0;
	const billableOnly = isBillableOnly(settings.filters.billable);
	// A break has no client and is never billable: with either filter on, there are no breaks to show
	const allowsBreaks = useBreaksAllowed();
	const readsBreaks = allowsBreaks && !billableOnly && !hasClientFilter;
	const breaksQuery = useTimeActivityBreaksQuery(request, readsBreaks);
	const breakSeconds = breakSecondsShownOf(readsBreaks, breaksQuery);
	// The counts endpoint knows nothing of the entry's labels either: with them picked, the rows give the figures
	const hasEntryLabelFilter = settings.filters.entryLabels.length > 0;
	const sumsFiguresFromRows = hasTaskFilter || hasClientFilter || billableOnly || isRounding || hasEntryLabelFilter;
	const isClientGrouping = settings.grouping === 'client';
	const needsProjectClients = hasClientFilter || isClientGrouping;
	const projectClients = useReportProjectClients({ includesArchived: false, isEnabled: needsProjectClients });
	const projectClientIds = projectClients.clientIds;
	const isClientGroupingGranted = settings.clientGroupingAccess === 'granted';
	const readsClientNames = isClientGrouping && isClientGroupingGranted;
	const clientsQuery = useClientsQuery({ includeArchived: true, enabled: readsClientNames });
	const clientNames = useMemo(() => clientNamesOf(clientsQuery.clients), [clientsQuery.clients]);
	const {
		isProjectLookupError,
		isClientNamesError,
		isFilterLookupPending,
		isFilterLookupError,
		canFilterByClients,
		isClientRowsPending,
		isClientRowsError,
		canTellRowClients
	} = clientLookupStateOf({
		hasClientFilter,
		isClientGrouping,
		needsProjectClients,
		readsClientNames,
		isClientAccessUnknown: settings.clientGroupingAccess === 'unknown',
		projects: projectClients,
		names: clientsQuery
	});
	const loadedReport = dailyQuery.data ?? EMPTY_REPORT;
	const report = useMemo(() => {
		if (!canFilterByClients) {
			return EMPTY_REPORT;
		}
		return filterDailyReportByClients(loadedReport, pickedClients, projectClientIds);
	}, [canFilterByClients, loadedReport, pickedClients, projectClientIds]);
	const hasDailyData = dailyQuery.data !== undefined;
	const hasDailyReport = hasDailyData && canFilterByClients;

	const clientOfProjectLog = useMemo<ClientOfProjectLog | null>(() => {
		const tellsClients = isClientGrouping && canTellRowClients;
		if (!tellsClients) {
			return null;
		}
		return clientOfProjectLogOf(projectClientIds, clientNames);
	}, [canTellRowClients, clientNames, isClientGrouping, projectClientIds]);

	const withoutTeamLabel = t('dashboard.NO_TEAM_GROUP');
	const hiddenProjectLabels = useHiddenProjectLabels();
	const workspaceCurrency = organization?.currency ?? null;
	// The rows, the totals and the exports all come from this report: with a rule, each entry in it is rounded
	const roundedReport = useMemo(() => roundedDailyReportOf(report, roundingRule), [report, roundingRule]);
	const rows = useMemo(() => {
		const allRows = rowsOfReport(
			roundedReport,
			withoutTeamLabel,
			workspaceCurrency,
			clientOfProjectLog,
			hiddenProjectLabels
		);
		return visibleRowsOf(allRows, isManager, ownEmployeeId);
	}, [
		clientOfProjectLog,
		hiddenProjectLabels,
		isManager,
		ownEmployeeId,
		roundedReport,
		withoutTeamLabel,
		workspaceCurrency
	]);

	const totals = useMemo(() => reportTotalsOf(rows), [rows]);

	const { myPermissions, isLoaded: arePermissionsLoaded } = useMyRolePermissionsQuery();
	// Billable amounts are priced at client rates: only a role that may read them gets them, and its own read
	const readsBillable = arePermissionsLoaded && holdsRateAdminPermission(myPermissions);
	const billableRequest = useMemo(() => billableRequestOf(request, readsBillable), [readsBillable, request]);
	const billableQuery = useTimeActivityDailyQuery(billableRequest);
	const loadedBillableReport = billableQuery.data ?? EMPTY_REPORT;
	// The billable time goes through the client filter, the rounding and the visibility the shown rows go through
	const billableRows = useMemo(() => {
		const canPriceRows = readsBillable && canFilterByClients;
		if (!canPriceRows) {
			return [];
		}
		const filtered = filterDailyReportByClients(loadedBillableReport, pickedClients, projectClientIds);
		const rounded = roundedDailyReportOf(filtered, roundingRule);
		const allRows = rowsOfReport(
			rounded,
			withoutTeamLabel,
			workspaceCurrency,
			clientOfProjectLog,
			hiddenProjectLabels
		);
		return visibleRowsOf(allRows, isManager, ownEmployeeId);
	}, [
		canFilterByClients,
		clientOfProjectLog,
		hiddenProjectLabels,
		isManager,
		loadedBillableReport,
		ownEmployeeId,
		pickedClients,
		projectClientIds,
		readsBillable,
		roundingRule,
		withoutTeamLabel,
		workspaceCurrency
	]);
	const billableProjectIds = useMemo(() => billableProjectIdsOf(billableRows), [billableRows]);
	const projectRates = useProjectClientRates(billableProjectIds, readsBillable);
	const { ratesByProject } = projectRates;
	const defaultRate = useMemo(() => defaultBillRateOf(organization), [organization]);
	// Each row is priced as an invoice line: client rate of the member on the project, of the project, own rate, default
	const billableFacts = useMemo(() => {
		const priceOf = (row: DailyReportRow) => {
			const todays = linePriceOf({
				employeeId: row.employeeId,
				projectRates: ratesByProject.get(pricedProjectIdOf(row) ?? ''),
				projectCurrency: null,
				employeeRate: row,
				organizationCurrency: workspaceCurrency,
				defaultRate
			});
			// At the client rates its entries kept, as a draft invoice of the same time bills it
			return keptPriceOfRow(row, todays, workspaceCurrency, defaultRate);
		};
		return billableFactsOf(billableRows, priceOf);
	}, [billableRows, defaultRate, ratesByProject, workspaceCurrency]);
	const billableFigures = useMemo(() => billableFiguresOfFacts(billableFacts), [billableFacts]);
	const hasBillableData = billableQuery.data !== undefined;
	const isBillableReadFailure = billableQuery.isError && !hasBillableData;
	// The default rate, the currency and the rounding rule price the amounts too: they wait for the organization
	const billingOrganization = useBillingOrganization(readsBillable);
	const isBillableFailure =
		isBillableReadFailure || projectRates.hasFailed || isFilterLookupError || billingOrganization.isError;
	const isBillableError = readsBillable && isBillableFailure;
	// A read still showing the previous period or filters would price old time beside the new: it waits instead
	const isShowingPreviousRead = billableQuery.isPlaceholderData || dailyQuery.isPlaceholderData;
	const isReadingBillable = billableQuery.isPending || isShowingPreviousRead;
	const isWaitingForBillable =
		isReadingBillable || projectRates.isLoading || isFilterLookupPending || billingOrganization.isPending;
	const isBillablePending = readsBillable && isWaitingForBillable && !isBillableError;
	// Facts priced while a read is missing or failed would carry fallback prices: none are given then
	const shownBillableFacts = useMemo(() => {
		if (isBillablePending || isBillableError) {
			return NO_BILLABLE_FACTS;
		}
		return billableFacts;
	}, [billableFacts, isBillableError, isBillablePending]);
	const storesDefault = organization !== null && storesDefaultBillRate(organization);
	const canSetDefaultRate = storesDefault && canEditWorkspace(myPermissions);
	const { refetch: refetchBillableReport } = billableQuery;
	const { refetch: refetchProjectRates } = projectRates;
	const refetchClientLookup = projectClients.refetch;
	const { retry: retryBillingOrganization } = billingOrganization;
	const refetchBillable = useCallback(() => {
		void refetchBillableReport();
		refetchProjectRates();
		retryBillingOrganization();
		if (isFilterLookupError) {
			refetchClientLookup();
		}
	}, [
		isFilterLookupError,
		refetchBillableReport,
		refetchClientLookup,
		refetchProjectRates,
		retryBillingOrganization
	]);
	const billable = useMemo<TimeActivityBillable>(
		() => ({
			isOffered: readsBillable,
			facts: shownBillableFacts,
			figures: billableFigures,
			isPending: isBillablePending,
			isError: isBillableError,
			canSetDefaultRate,
			refetch: refetchBillable
		}),
		[
			billableFigures,
			canSetDefaultRate,
			isBillableError,
			isBillablePending,
			readsBillable,
			refetchBillable,
			shownBillableFacts
		]
	);

	const chartPeriod = useShownPeriod(period, dailyQuery.isPlaceholderData, hasDailyData);
	const chartDays = useMemo(() => {
		const days = daysOfPeriod(chartPeriod);
		const labels = chartLabelsOf(locale, days.length);
		return chartDaysOf(days, dayFiguresOf(rows), todayKeyOf(), labels);
	}, [locale, chartPeriod, rows]);

	const tableGrouping = tableGroupingOf(settings.grouping);
	const breakdownGrouping = breakdownGroupingOf(settings.grouping);
	const groups = useMemo(() => reportGroupsOf(rows, tableGrouping), [rows, tableGrouping]);

	const figures = useMemo(
		() => ({ ...figuresOf(totals, countsQuery.data, sumsFiguresFromRows, hasDailyReport), breakSeconds }),
		[breakSeconds, countsQuery.data, hasDailyReport, sumsFiguresFromRows, totals]
	);

	const isDailyFailure = dailyQuery.isError && !hasDailyData;
	const isDailyError = isDailyFailure || isFilterLookupError;
	const isWaitingForDaily = dailyQuery.isPending || isFilterLookupPending;
	const isDailyPending = isWaitingForDaily && !isDailyError;
	const isBreakdownError = isDailyError || isClientRowsError;
	const isWaitingForBreakdown = isDailyPending || isClientRowsPending;
	const isBreakdownPending = isWaitingForBreakdown && !isBreakdownError;
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
	const retryClientNames = useCallback(() => void refetchClientNames(), [refetchClientNames]);
	// The weekly report has no project in its rows and rounds nothing: with a client picked or a rounding rule, the
	// week grid is built from these rows
	const weekDailySource = useMemo<WeekDailySource | null>(() => {
		// The weekly report knows no labels of entries either (#5368): picked, the grid is built from these rows too
		const readsRows = hasClientFilter || isRounding || hasEntryLabelFilter;
		if (!readsRows) {
			return null;
		}
		return { rows, isLoading: isDailyPending, isError: isDailyError, refetch: () => void refetchDaily() };
	}, [hasClientFilter, hasEntryLabelFilter, isDailyError, isDailyPending, isRounding, refetchDaily, rows]);

	return {
		user,
		isManager,
		ownEmployeeId,
		settings,
		period,
		setPeriod,
		request,
		report: roundedReport,
		clientOfProjectLog,
		rows,
		totals,
		billable,
		chartDays,
		tableGrouping,
		breakdownGrouping,
		groups,
		figures,
		hasTaskFilter,
		roundingRule,
		weekDailySource,
		isDailyPending,
		isFiguresLoading,
		isDailyError,
		isBreakdownPending,
		isBreakdownError,
		isClientNamesError,
		isCountsError,
		isUpdating,
		refetchDaily,
		retryClientNames,
		refetchCounts: countsQuery.refetch
	};
}

export type TimeActivityReport = ReturnType<typeof useTimeActivityReport>;
