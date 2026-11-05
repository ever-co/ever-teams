'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import { shouldRetryQuery } from '@/core/lib/helpers/retry-utils';
import { getActivityQueryKeyParams, type UseReportActivityProps } from '@/core/hooks/activities/use-activity-filters';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';

type ReportProps = Required<UseReportActivityProps>;

const STATISTICS_LOG_TYPE = [ETimeLogType.TRACKED];
const STALE_TIME = 1000 * 60 * 10;
const GC_TIME = 1000 * 60 * 30;
const MAX_RETRY_DELAY = 30000;

function retryDelayOf(attemptIndex: number) {
	const delay = 1000 * 2 ** attemptIndex;
	return Math.min(delay, MAX_RETRY_DELAY);
}

function missingPropsError() {
	return new Error('The report scope is not ready');
}

async function fetchDailyReport(props: ReportProps | null) {
	if (!props) {
		throw missingPropsError();
	}
	return timeLogService.getTimeLogReportDaily(props);
}

async function fetchStatisticsCounts(props: ReportProps | null) {
	if (!props) {
		throw missingPropsError();
	}
	return statisticsService.getTimesheetStatisticsCounts({ ...props, logType: STATISTICS_LOG_TYPE });
}

/** The cache keeps the raw response, the shape the other activity hooks read under the same key. */
function dailyRowsOf(response: { data?: unknown } | undefined): ITimeLogGroupedDailyReport[] {
	const data = response?.data;
	if (Array.isArray(data)) {
		return data;
	}
	return [];
}

function countsOf(response: { data?: ITimesheetCountsStatistics } | undefined): ITimesheetCountsStatistics | null {
	return response?.data ?? null;
}

/**
 * The daily report behind the team dashboard's chart, breakdown and table. Same key and cache entry as
 * `useActivityDailyReportQuery`; the previous period stays on screen while the next one loads.
 */
export function useTeamDailyReportQuery(props: ReportProps | null, enabled: boolean) {
	const isEnabled = enabled && Boolean(props);
	const isLive = isLiveDayRange(props?.startDate, props?.endDate);
	return useQuery({
		queryKey: queryKeys.activities.daily(getActivityQueryKeyParams(props)),
		queryFn: () => fetchDailyReport(props),
		select: dailyRowsOf,
		enabled: isEnabled,
		placeholderData: keepPreviousData,
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		retry: shouldRetryQuery,
		retryDelay: retryDelayOf,
		...liveQueryOptionsOf(isLive)
	});
}

/** The period's counts, under the key of `useActivityStatisticsQuery`, keeping the previous figures while loading. */
export function useTeamStatisticsQuery(props: ReportProps | null, enabled: boolean) {
	const isEnabled = enabled && Boolean(props);
	const isLive = isLiveDayRange(props?.startDate, props?.endDate);
	return useQuery({
		queryKey: queryKeys.activities.statisticsCounts({
			tenantId: props?.tenantId,
			organizationId: props?.organizationId,
			teamId: props?.teamId,
			startDate: props?.startDate,
			endDate: props?.endDate,
			projectIds: props?.projectIds,
			activityLevel: props?.activityLevel,
			logType: STATISTICS_LOG_TYPE,
			selectedEmployeeIds: props?.selectedEmployeeIds,
			selectedTeamIds: props?.selectedTeamIds
		}),
		queryFn: () => fetchStatisticsCounts(props),
		select: countsOf,
		enabled: isEnabled,
		placeholderData: keepPreviousData,
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		retry: shouldRetryQuery,
		retryDelay: retryDelayOf,
		...liveQueryOptionsOf(isLive)
	});
}
