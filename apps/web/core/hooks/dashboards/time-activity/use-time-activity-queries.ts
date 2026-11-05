'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import { shouldRetryQuery } from '@/core/lib/helpers/retry-utils';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';

/**
 * Everything a Time & Activity read sends, ids included, so the cache key of a block always names the organization,
 * the period and every filter its request carries.
 */
export interface TimeActivityRequest {
	tenantId: string;
	organizationId: string;
	/** Local calendar days, `YYYY-MM-DD`. */
	startDate: string;
	endDate: string;
	timeZone: string;
	employeeIds: string[];
	teamIds: string[];
	projectIds: string[];
	taskIds: string[];
}

const ACTIVITY_LEVEL = { start: 0, end: 100 };

const TRACKED_LOG_TYPES = [ETimeLogType.TRACKED];

const REPORT_STALE_TIME = 1000 * 60 * 10;

const REPORT_GC_TIME = 1000 * 60 * 30;

function retryDelayOf(attemptIndex: number) {
	const delay = 1000 * 2 ** attemptIndex;
	return Math.min(delay, 30000);
}

function requiredRequest(request: TimeActivityRequest | null): TimeActivityRequest {
	if (!request) {
		throw new Error('The Time & Activity request is not ready');
	}
	return request;
}

async function fetchDailyReport(request: TimeActivityRequest): Promise<ITimeLogGroupedDailyReport[]> {
	const response = await timeLogService.getTimeLogReportDaily({
		organizationId: request.organizationId,
		tenantId: request.tenantId,
		startDate: request.startDate,
		endDate: request.endDate,
		timeZone: request.timeZone,
		groupBy: 'date',
		employeeIds: request.employeeIds,
		teamIds: request.teamIds,
		projectIds: request.projectIds,
		taskIds: request.taskIds,
		activityLevel: ACTIVITY_LEVEL
	});
	const days = response.data;
	if (!Array.isArray(days)) {
		return [];
	}
	return days;
}

async function fetchCounts(request: TimeActivityRequest) {
	const response = await statisticsService.getTimesheetStatisticsCounts({
		organizationId: request.organizationId,
		tenantId: request.tenantId,
		startDate: request.startDate,
		endDate: request.endDate,
		timeZone: request.timeZone,
		employeeIds: request.employeeIds,
		teamIds: request.teamIds,
		projectIds: request.projectIds,
		activityLevel: ACTIVITY_LEVEL,
		logType: TRACKED_LOG_TYPES
	});
	return response.data ?? null;
}

export function useTimeActivityDailyQuery(request: TimeActivityRequest | null) {
	const isLive = isLiveDayRange(request?.startDate, request?.endDate);
	return useQuery({
		queryKey: queryKeys.activities.daily({ ...request, groupBy: 'date', activityLevel: ACTIVITY_LEVEL }),
		queryFn: () => fetchDailyReport(requiredRequest(request)),
		enabled: request !== null,
		placeholderData: keepPreviousData,
		staleTime: REPORT_STALE_TIME,
		gcTime: REPORT_GC_TIME,
		retry: shouldRetryQuery,
		retryDelay: retryDelayOf,
		...liveQueryOptionsOf(isLive)
	});
}

/**
 * Tracked time and average activity of the period as Gauzy computes them (timer logs only). The counts endpoint has
 * no task filter, so `taskIds` stays out of its request and of its key.
 */
export function useTimeActivityCountsQuery(request: TimeActivityRequest | null) {
	const countsRequest = countsKeyOf(request);
	const isLive = isLiveDayRange(request?.startDate, request?.endDate);
	return useQuery({
		queryKey: queryKeys.activities.statisticsCounts(countsRequest),
		queryFn: () => fetchCounts(requiredRequest(request)),
		enabled: request !== null,
		placeholderData: keepPreviousData,
		staleTime: REPORT_STALE_TIME,
		gcTime: REPORT_GC_TIME,
		retry: shouldRetryQuery,
		retryDelay: retryDelayOf,
		...liveQueryOptionsOf(isLive)
	});
}

function countsKeyOf(request: TimeActivityRequest | null) {
	return {
		tenantId: request?.tenantId,
		organizationId: request?.organizationId,
		startDate: request?.startDate,
		endDate: request?.endDate,
		timeZone: request?.timeZone,
		employeeIds: request?.employeeIds,
		teamIds: request?.teamIds,
		projectIds: request?.projectIds,
		activityLevel: ACTIVITY_LEVEL,
		logType: TRACKED_LOG_TYPES
	};
}
