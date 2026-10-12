import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { UseReportActivityProps } from '../use-activity-filters';
import { shouldRetryQuery } from '../../../lib/helpers/retry-utils';

const STATISTICS_LOG_TYPE = [ETimeLogType.TRACKED];

// ==================== TYPES ====================

export interface UseActivityStatisticsQueryOptions {
	/** Merged props from useActivityFilters (includes auth, filters, date range) */
	mergedProps: Required<UseReportActivityProps> | null;
	/** Whether the query should be enabled */
	enabled?: boolean;
}

// ==================== HOOK ====================

/**
 * Dedicated query hook for **timesheet statistics counts**.
 * Wraps `statisticsService.getTimesheetStatisticsCounts`.
 *
 * Use this hook when you need employee/project counts, weekly/today activity & duration stats.
 *
 * @param options.mergedProps - Merged filter props from `useActivityFilters`
 * @param options.enabled - Controls whether the query fires. Defaults to `true`.
 *
 * @example
 * ```typescript
 * const { mergedProps, enabled } = useActivityFilters();
 * const { statisticsCounts, isLoading } = useActivityStatisticsQuery({ mergedProps, enabled });
 * ```
 */
export function useActivityStatisticsQuery({ mergedProps, enabled = true }: UseActivityStatisticsQueryOptions) {
	const query = useQuery({
		// Employee and team ids stay out of the key: the team dashboard filter rewrites them on every pick and
		// applies them through an explicit refetch. Keying on them would fetch on each pick and could swap the
		// page for its skeleton while the filter is still open.
		queryKey: queryKeys.activities.statisticsCounts({
			tenantId: mergedProps?.tenantId,
			organizationId: mergedProps?.organizationId,
			startDate: mergedProps?.startDate,
			endDate: mergedProps?.endDate,
			projectIds: mergedProps?.projectIds,
			activityLevel: mergedProps?.activityLevel,
			logType: STATISTICS_LOG_TYPE
		}),
		queryFn: () =>
			statisticsService.getTimesheetStatisticsCounts({
				...mergedProps!,
				logType: STATISTICS_LOG_TYPE
			}),
		enabled: enabled && !!mergedProps,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: shouldRetryQuery,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	// ==================== REFETCH ====================

	const refetchStatisticsCounts = useCallback(async () => {
		return query.refetch();
	}, [query]);

	return {
		/** Statistics counts data (employeesCount, projectsCount, weekActivities, etc.) */
		statisticsCounts: query.data?.data || null,
		/** Whether the statistics query is currently loading */
		isLoading: query.isLoading,
		/** Refetch statistics data */
		refetchStatisticsCounts,
		/** Full React Query object for advanced usage */
		query
	};
}

