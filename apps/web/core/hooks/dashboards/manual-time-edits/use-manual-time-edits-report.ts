'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale } from 'next-intl';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	type TimeActivityRequest,
	useTimeActivityDailyQuery
} from '@/core/hooks/dashboards/time-activity/use-time-activity-queries';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { activeTeamState } from '@/core/stores';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { percentOf } from '@/core/lib/utils/dashboard-figures';
import { periodLengthInDays, periodOfPreset, type Period, shiftPeriod } from '@/core/lib/utils/dashboard-period';
import { isOrganizationRole, timesheetFormattersOf } from '@/core/lib/utils/dashboards/timesheets';
import {
	type ChangeAction,
	type ChartDayLabels,
	changedEntriesOf,
	chartDaysOf,
	editsFiguresOf,
	type EditsFilterField,
	type EditsFilters,
	type EditsGrouping,
	EMPTY_EDITS_FILTERS,
	entryMatchesAction,
	entryMatchesFilters,
	groupsOf,
	MANUAL_EDITS_WEEK_START,
	manualRankingsOf,
	type ManualTimeEntry,
	membersByIdOf,
	teamMembersOf,
	totalSecondsOfEntries,
	trackedSecondsOf
} from '@/core/lib/utils/dashboards/manual-time-edits';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { type ChangedLogsRequest, useChangedTimeLogs } from './use-changed-time-logs';

const NO_ENTRIES: ManualTimeEntry[] = [];

const NO_DAILY_REPORT: ITimeLogGroupedDailyReport[] = [];

const SHORT_AXIS_DAYS = 7;

/** What the "share of tracked" figure can say: the daily report has no billable split and may still be loading. */
export type TrackedShare =
	| { status: 'loading' }
	| { status: 'unavailable' }
	| { status: 'billable-filter' }
	| { status: 'no-time' }
	| { status: 'ready'; percent: number; trackedSeconds: number };

interface RequestInput {
	period: Period;
	timeZone: string;
	employeeIds: string[];
	tenantId: string;
	organizationId: string;
	teamId: string;
}

function changedLogsRequestOf(input: RequestInput): ChangedLogsRequest {
	const { period, timeZone, employeeIds, tenantId, organizationId, teamId } = input;
	const keyParams = {
		tenantId,
		organizationId,
		teamId,
		employeeIds,
		from: period.from.toISOString(),
		to: period.to.toISOString(),
		timeZone
	};
	return {
		range: { from: period.from, to: period.to, timeZone, employeeIds },
		period,
		keyParams,
		scopeKey: `${tenantId}:${organizationId}:${teamId}`,
		requestKey: JSON.stringify(keyParams)
	};
}

/** The same members and period as the changed logs, the request Time and activity sends (so its cache is shared). */
function trackedRequestOf(input: RequestInput, isEnabled: boolean): TimeActivityRequest | null {
	if (!isEnabled) {
		return null;
	}
	return {
		tenantId: input.tenantId,
		organizationId: input.organizationId,
		startDate: localDayKeyOf(input.period.from),
		endDate: localDayKeyOf(input.period.to),
		timeZone: input.timeZone,
		employeeIds: input.employeeIds,
		teamIds: [],
		projectIds: [],
		taskIds: []
	};
}

function reportedEmployeeIdsOf(appliedIds: string[], allIds: string[]) {
	if (appliedIds.length > 0) {
		return [...appliedIds].sort();
	}
	return [...allIds].sort();
}

function axisFormatOptionsOf(dayCount: number): Intl.DateTimeFormatOptions {
	if (dayCount <= SHORT_AXIS_DAYS) {
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

function hasAnyFilter(filters: EditsFilters) {
	const hasMembers = filters.members.length > 0;
	const hasProjects = filters.projects.length > 0;
	const hasBillable = filters.billable.length > 0;
	return hasMembers || hasProjects || hasBillable;
}

interface TrackedShareInput {
	manualSeconds: number;
	dailyRows: ReturnType<typeof flattenDailyReport>;
	filters: EditsFilters;
	isDailyReady: boolean;
	isDailyError: boolean;
}

function trackedShareOf({
	manualSeconds,
	dailyRows,
	filters,
	isDailyReady,
	isDailyError
}: TrackedShareInput): TrackedShare {
	const hasBillableFilter = filters.billable.length > 0;
	if (hasBillableFilter) {
		return { status: 'billable-filter' };
	}
	if (isDailyError) {
		return { status: 'unavailable' };
	}
	if (!isDailyReady) {
		return { status: 'loading' };
	}
	const trackedSeconds = trackedSecondsOf(dailyRows, filters.projects);
	if (trackedSeconds <= 0) {
		return { status: 'no-time' };
	}
	const percent = percentOf(manualSeconds, trackedSeconds);
	return { status: 'ready', percent, trackedSeconds };
}

function withToggled(current: string[], value: string) {
	const isSelected = current.includes(value);
	if (isSelected) {
		return current.filter((id) => id !== value);
	}
	return [...current, value];
}

function withValuesToggled(current: string[], values: ReadonlyArray<string>, shouldSelect: boolean) {
	const others = current.filter((id) => !values.includes(id));
	if (shouldSelect) {
		return [...others, ...values];
	}
	return others;
}

export function useManualTimeEditsReport({ unnamedLabel }: Readonly<{ unnamedLabel: string }>) {
	const locale = useLocale();
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const organizationId = getOrganizationIdCookie() ?? '';
	const tenantId = getTenantIdCookie() ?? '';
	const timeZone = useMemo(() => getDefaultTimezone(), []);

	const [period, setPeriod] = useState<Period>(() => periodOfPreset('thisWeek', MANUAL_EDITS_WEEK_START));
	const [filters, setFilters] = useState<EditsFilters>(EMPTY_EDITS_FILTERS);
	const [action, setAction] = useState<ChangeAction>('all');
	const [grouping, setGrouping] = useState<EditsGrouping>('day');
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const teamMembers = activeTeam?.members;
	const members = useMemo(() => teamMembersOf(teamMembers), [teamMembers]);
	const membersById = useMemo(() => membersByIdOf(members), [members]);
	const teamId = activeTeam?.id ?? '';

	const pickedMembers = filters.members;
	const appliedMemberIds = useMemo(
		() => pickedMembers.filter((employeeId) => membersById.has(employeeId)),
		[membersById, pickedMembers]
	);
	const reportedEmployeeIds = useMemo(() => {
		const allIds = members.map((member) => member.employeeId);
		return reportedEmployeeIdsOf(appliedMemberIds, allIds);
	}, [appliedMemberIds, members]);

	const hasScope = Boolean(organizationId) && Boolean(tenantId);
	const hasMembers = reportedEmployeeIds.length > 0;
	const isEnabled = hasScope && hasMembers;

	const requestInput = useMemo<RequestInput>(
		() => ({ period, timeZone, employeeIds: reportedEmployeeIds, tenantId, organizationId, teamId }),
		[organizationId, period, reportedEmployeeIds, teamId, tenantId, timeZone]
	);
	const request = useMemo(() => changedLogsRequestOf(requestInput), [requestInput]);
	const trackedRequest = useMemo(() => trackedRequestOf(requestInput, isEnabled), [isEnabled, requestInput]);

	const changed = useChangedTimeLogs(request, isEnabled);
	const dailyQuery = useTimeActivityDailyQuery(trackedRequest);
	const pair = changed.pair;

	const entries = useMemo(() => {
		if (!pair) {
			return NO_ENTRIES;
		}
		return changedEntriesOf({
			addedLogs: pair.addedLogs,
			editedLogs: pair.editedLogs,
			members: membersById,
			unnamedLabel
		});
	}, [membersById, pair, unnamedLabel]);

	const narrowedEntries = useMemo(
		() => entries.filter((entry) => entryMatchesFilters(entry, filters)),
		[entries, filters]
	);
	const shownEntries = useMemo(
		() => narrowedEntries.filter((entry) => entryMatchesAction(entry, action)),
		[action, narrowedEntries]
	);
	const figures = useMemo(() => editsFiguresOf(narrowedEntries), [narrowedEntries]);
	const shownSeconds = useMemo(() => totalSecondsOfEntries(shownEntries), [shownEntries]);
	const groups = useMemo(() => groupsOf(shownEntries, grouping), [grouping, shownEntries]);
	const rankings = useMemo(() => manualRankingsOf(narrowedEntries), [narrowedEntries]);

	const shownPeriod = pair?.request.period ?? period;
	const chartDays = useMemo(() => {
		const dayCount = periodLengthInDays(shownPeriod);
		const labels = chartLabelsOf(locale, dayCount);
		return chartDaysOf(shownPeriod, narrowedEntries, labels);
	}, [locale, narrowedEntries, shownPeriod]);

	const dailyReport = dailyQuery.data ?? NO_DAILY_REPORT;
	const dailyRows = useMemo(() => flattenDailyReport(dailyReport), [dailyReport]);
	const hasDailyData = dailyQuery.data !== undefined;
	const isDailyCurrent = hasDailyData && !dailyQuery.isPlaceholderData;
	const isShowingCurrentRequest = pair?.request.requestKey === request.requestKey;
	const isDailyReady = isDailyCurrent && isShowingCurrentRequest;
	const isDailyError = dailyQuery.isError && !hasDailyData;
	const manualSeconds = figures.manualSeconds;
	const trackedShare = useMemo<TrackedShare>(
		() => trackedShareOf({ manualSeconds, dailyRows, filters, isDailyReady, isDailyError }),
		[dailyRows, filters, isDailyError, isDailyReady, manualSeconds]
	);

	const shownIdSet = useMemo(() => {
		const ids = shownEntries.map((entry) => entry.key);
		return new Set(ids);
	}, [shownEntries]);
	const selectedIdSet = useMemo(() => {
		const visible = selectedIds.filter((id) => shownIdSet.has(id));
		return new Set(visible);
	}, [selectedIds, shownIdSet]);

	const roleName = user?.role?.name;
	const hasOrganizationRole = isOrganizationRole(roleName);
	const userId = user?.id ?? null;
	const ownEmployeeId = user?.employee?.id ?? null;
	const permissions = useMemo<TimesheetPermissions>(
		() => ({ hasOrganizationRole, isManage: true, canApprove: false, userId, employeeId: ownEmployeeId }),
		[hasOrganizationRole, ownEmployeeId, userId]
	);
	const formatters = useMemo(() => timesheetFormattersOf(locale), [locale]);

	const isTeamReady = activeTeam !== null;
	const hasData = pair !== null;
	const isWaitingForData = isEnabled && !hasData && !changed.showsError;
	const isLoading = !isTeamReady || isWaitingForData;
	const showsNoMembers = isTeamReady && !hasMembers;
	const hasActionChoice = action !== 'all';
	const isFiltered = hasAnyFilter(filters) || hasActionChoice;

	const setFilter = useCallback((field: EditsFilterField, values: string[]) => {
		setFilters((current) => ({ ...current, [field]: values }));
	}, []);

	const removeFilterValue = useCallback((field: EditsFilterField, value: string) => {
		setFilters((current) => {
			const remaining = current[field].filter((item) => item !== value);
			return { ...current, [field]: remaining };
		});
	}, []);

	const clearFilters = useCallback(() => {
		setFilters(EMPTY_EDITS_FILTERS);
	}, []);

	const clearNarrowing = useCallback(() => {
		setFilters(EMPTY_EDITS_FILTERS);
		setAction('all');
	}, []);

	const showPreviousPeriod = useCallback(() => {
		setPeriod((current) => shiftPeriod(current, -1));
	}, []);

	const toggleEntry = useCallback((entryId: string) => {
		setSelectedIds((current) => withToggled(current, entryId));
	}, []);

	const setEntriesSelected = useCallback((entryIds: ReadonlyArray<string>, shouldSelect: boolean) => {
		setSelectedIds((current) => withValuesToggled(current, entryIds, shouldSelect));
	}, []);

	const unselectEntries = useCallback((entryIds: ReadonlyArray<string>) => {
		setSelectedIds((current) => withValuesToggled(current, entryIds, false));
	}, []);

	return {
		teamName: activeTeam?.name ?? '',
		period,
		setPeriod,
		shownPeriod,
		filters,
		setFilter,
		removeFilterValue,
		clearFilters,
		clearNarrowing,
		action,
		setAction,
		grouping,
		setGrouping,
		members,
		populationCount: reportedEmployeeIds.length,
		entries,
		shownEntries,
		shownSeconds,
		groups,
		figures,
		rankings,
		chartDays,
		trackedShare,
		permissions,
		formatters,
		selectedIdSet,
		toggleEntry,
		setEntriesSelected,
		unselectEntries,
		showPreviousPeriod,
		isTeamReady,
		isLoading,
		isUpdating: changed.isUpdating,
		showsError: changed.showsError,
		showsNoMembers,
		isFiltered,
		refetch: changed.refetch
	};
}

export type ManualTimeEditsReportState = ReturnType<typeof useManualTimeEditsReport>;
